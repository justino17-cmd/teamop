// LA PORTE DE L'ATELIER (scripts/atelier/porte.js) — le VRAI fichier, lancé sur 127.0.0.1, parlé en HTTP.
// Ce que ce banc garde : sans clé ou avec une mauvaise clé, rien ne s'exécute ; avec la bonne, la commande tourne et rend sa
// sortie, son code, son délai ; les refus se comptent PAR adresse ; la porte ne démarre pas sans empreinte ; elle n'écoute que
// la boucle locale. ⛔ Les marqueurs cherchés dans les sorties portent des lettres hors de [0-9a-f] (une empreinte en contient).
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http'), crypto = require('crypto'), { spawn, spawnSync } = require('child_process');
const FICHIER = path.join(__dirname, '..', 'scripts', 'atelier', 'porte.js');
let ok = 0, ko = 0;
const vrai = (quoi, v, detail) => { if (v) { ok++; console.log('  ✓ ' + quoi); } else { ko++; console.log('  ✗ ' + quoi + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 300) : '')); } };
const attendre = ms => new Promise(r => setTimeout(r, ms));
const PORT = 20000 + (process.pid % 20000);
const CLE = crypto.randomBytes(32).toString('hex'), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'porte-'));
const empreinte = path.join(tmp, 'empreinte'); fs.writeFileSync(empreinte, crypto.createHash('sha256').update(CLE).digest('hex') + '\n');

function appel(methode, chemin, { cle, corps, ip, brut } = {}) {
  return new Promise(resolve => {
    const donnees = brut !== undefined ? brut : corps !== undefined ? JSON.stringify(corps) : '';
    const entetes = { 'Content-Type': 'application/json' };
    if (cle) entetes.Authorization = 'Bearer ' + cle;
    if (ip) entetes['X-Forwarded-For'] = ip;
    const debut = Date.now();
    const r = http.request({ host: '127.0.0.1', port: PORT, method: methode, path: chemin, headers: entetes }, res => {
      let t = ''; res.on('data', d => t += d); res.on('end', () => { let j = null; try { j = JSON.parse(t); } catch (e) {} resolve({ code: res.statusCode, j, ms: Date.now() - debut }); });
    });
    r.on('error', e => resolve({ code: 0, erreur: e.message, ms: Date.now() - debut }));
    r.end(donnees);
  });
}

(async () => {
  // 1. Sans empreinte lisible, la porte ne démarre pas.
  const sans = spawnSync(process.execPath, [FICHIER], { env: { ...process.env, PORTE_PORT: String(PORT), PORTE_EMPREINTE: path.join(tmp, 'absente') }, encoding: 'utf8', timeout: 8000 });
  vrai('sans empreinte de clé, la porte refuse de démarrer (code 2)', sans.status === 2, { status: sans.status, err: (sans.stderr || '').slice(0, 120) });
  fs.writeFileSync(path.join(tmp, 'fausse'), 'pas une empreinte\n');
  const fausse = spawnSync(process.execPath, [FICHIER], { env: { ...process.env, PORTE_PORT: String(PORT), PORTE_EMPREINTE: path.join(tmp, 'fausse') }, encoding: 'utf8', timeout: 8000 });
  vrai('avec une empreinte mal formée aussi', fausse.status === 2, fausse.status);

  const p = spawn(process.execPath, [FICHIER], { env: { ...process.env, PORTE_PORT: String(PORT), PORTE_EMPREINTE: empreinte, PORTE_DOSSIER: tmp }, stdio: ['ignore', 'pipe', 'pipe'] });
  let journal = ''; p.stdout.on('data', d => journal += d); p.stderr.on('data', d => journal += d);
  let pret = false; for (let i = 0; i < 50 && !pret; i++) { await attendre(100); pret = (await appel('GET', '/porte/sante')).code === 200; }
  vrai('la porte démarre et dit qu\'elle est là (/porte/sante)', pret, journal.slice(0, 200));
  if (!pret) { p.kill(); console.log(`${ok} ✓  ${ko} ✗`); process.exit(1); }

  // 2. Elle n'écoute que la boucle locale — par la FORME du code (commentaires retirés), et par un essai sur une autre adresse.
  const code = fs.readFileSync(FICHIER, 'utf8').replace(/^[ \t]*\/\/.*$/gm, ' ');
  vrai('le code écoute 127.0.0.1 et rien d\'autre', /\.listen\(PORT,\s*'127\.0\.0\.1'/.test(code) && !/\.listen\(PORT\s*[,)]\s*(?!\s*'127\.0\.0\.1')/.test(code.replace(/\.listen\(PORT,\s*'127\.0\.0\.1'/, '')));
  const autres = Object.values(os.networkInterfaces()).flat().filter(a => a && a.family === 'IPv4' && !a.internal).map(a => a.address);
  if (autres.length) {
    const dehors = await new Promise(r => { const q = http.request({ host: autres[0], port: PORT, path: '/porte/sante', timeout: 1500 }, res => r(res.statusCode)); q.on('error', () => r(0)); q.on('timeout', () => { q.destroy(); r(0); }); q.end(); });
    vrai('par une autre adresse de la machine, personne ne répond', dehors === 0, { adresse: autres[0], dehors });
  } else vrai('population : pas d\'autre adresse sur cette machine (contrôle par la forme seulement)', true);

  // 3. Sans clé, mauvaise clé, clé presque juste : rien ne s'exécute.
  const temoin = path.join(tmp, 'ne-doit-pas-exister');
  const sansCle = await appel('POST', '/porte/exec', { corps: { cmd: 'touch ' + temoin } });
  vrai('sans clé : 401', sansCle.code === 401, sansCle);
  const mauvaise = await appel('POST', '/porte/exec', { cle: crypto.randomBytes(32).toString('hex'), corps: { cmd: 'touch ' + temoin } });
  vrai('mauvaise clé : 401', mauvaise.code === 401, mauvaise);
  const presque = await appel('POST', '/porte/exec', { cle: CLE.slice(0, -1) + (CLE.endsWith('0') ? '1' : '0'), corps: { cmd: 'touch ' + temoin } });
  vrai('clé fausse d\'un seul caractère : 401', presque.code === 401, presque);
  const empreinteCommeCle = await appel('POST', '/porte/exec', { cle: fs.readFileSync(empreinte, 'utf8').trim(), corps: { cmd: 'touch ' + temoin } });
  vrai('l\'EMPREINTE présentée comme clé : 401 (le fichier du serveur n\'ouvre rien)', empreinteCommeCle.code === 401, empreinteCommeCle);
  vrai('aucune de ces demandes n\'a rien exécuté', !fs.existsSync(temoin));
  vrai('une autre route ou une autre méthode : 404', (await appel('GET', '/porte/exec', { cle: CLE })).code === 404 && (await appel('POST', '/autre', { cle: CLE, corps: { cmd: 'id' } })).code === 404);

  // 4. Avec la bonne clé : la commande tourne, sa sortie, son code et ses erreurs reviennent.
  const bon = await appel('POST', '/porte/exec', { cle: CLE, corps: { cmd: 'echo porte-zut-$((40+2)); echo vers-lerreur >&2; pwd' } });
  vrai('bonne clé : 200, code 0, la sortie revient', bon.code === 200 && bon.j && bon.j.code === 0 && /porte-zut-42/.test(bon.j.sortie), bon);
  vrai('la sortie d\'erreur revient aussi', bon.j && /vers-lerreur/.test(bon.j.sortie));
  vrai('la commande tourne dans le dossier prévu', bon.j && bon.j.sortie.includes(fs.realpathSync(tmp)), bon.j && bon.j.sortie);
  const sept = await appel('POST', '/porte/exec', { cle: CLE, corps: { cmd: 'exit 7' } });
  vrai('le code de sortie est rendu tel quel (7)', sept.j && sept.j.code === 7, sept);
  const ailleurs = await appel('POST', '/porte/exec', { cle: CLE, corps: { cmd: 'pwd', dossier: '/' } });
  vrai('un autre dossier, quand on le demande', ailleurs.j && ailleurs.j.sortie.trim() === '/', ailleurs);
  vrai('dossier absent : 400', (await appel('POST', '/porte/exec', { cle: CLE, corps: { cmd: 'pwd', dossier: '/nulle/part-zz' } })).code === 400);
  vrai('commande vide : 400', (await appel('POST', '/porte/exec', { cle: CLE, corps: { cmd: '   ' } })).code === 400);
  vrai('corps illisible : 400', (await appel('POST', '/porte/exec', { cle: CLE, brut: '{pas du json' })).code === 400);
  vrai('corps trop gros : 413', (await appel('POST', '/porte/exec', { cle: CLE, brut: JSON.stringify({ cmd: 'echo ' + 'x'.repeat(300 * 1024) }) })).code === 413);
  const env = await appel('POST', '/porte/exec', { cle: CLE, corps: { cmd: 'env' } });
  vrai('l\'environnement de la commande ne porte ni la clé ni le chemin de l\'empreinte', env.j && !env.j.sortie.includes(CLE) && !/PORTE_EMPREINTE/.test(env.j.sortie), env.j && env.j.sortie.slice(0, 200));

  // 5. Le délai : la commande est tuée, avec ce qu'elle a lancé au premier plan ; un travail de fond ne retient pas la réponse.
  const lent = await appel('POST', '/porte/exec', { cle: CLE, corps: { cmd: 'echo debut-zut; sleep 30; echo jamais-zut', delai: 1 } });
  vrai('au délai, la commande est arrêtée et la réponse le dit', lent.j && lent.j.expire === true && /debut-zut/.test(lent.j.sortie) && !/jamais-zut/.test(lent.j.sortie) && lent.ms < 6000, { ms: lent.ms, j: lent.j });
  const fond = await appel('POST', '/porte/exec', { cle: CLE, corps: { cmd: 'nohup sleep 20 >/dev/null 2>&1 & echo lance-zut' } });
  vrai('un travail lancé en fond ne retient pas la réponse', fond.j && /lance-zut/.test(fond.j.sortie) && fond.ms < 4000, { ms: fond.ms });
  const grosse = await appel('POST', '/porte/exec', { cle: CLE, corps: { cmd: 'head -c 900000 /dev/zero | tr "\\0" "z"; echo fin-zut' } });
  vrai('une sortie énorme est bornée, sa FIN est gardée, et la réponse dit qu\'elle est coupée', grosse.j && grosse.j.coupe === true && grosse.j.sortie.length <= 400 * 1024 && /fin-zut\s*$/.test(grosse.j.sortie), grosse.j && { coupe: grosse.j.coupe, n: grosse.j.sortie.length });

  // 6. Les refus se comptent PAR adresse : vingt refus d'une adresse la ferment dix minutes, sans fermer la porte aux autres.
  let codes = []; for (let i = 0; i < 20; i++) codes.push((await appel('POST', '/porte/exec', { ip: '203.0.113.9', corps: { cmd: 'id' } })).code);
  vrai('population : vingt refus ont bien été comptés (401)', codes.every(c => c === 401), codes);
  const ferme = await appel('POST', '/porte/exec', { ip: '203.0.113.9', cle: CLE, corps: { cmd: 'echo passe-zut' } });
  vrai('la vingt et unième demande de cette adresse est refusée (429), même avec la bonne clé', ferme.code === 429, ferme);
  const autre = await appel('POST', '/porte/exec', { ip: '198.51.100.7', cle: CLE, corps: { cmd: 'echo passe-zut' } });
  vrai('une AUTRE adresse, avec la bonne clé, passe toujours', autre.code === 200 && autre.j && /passe-zut/.test(autre.j.sortie), autre);
  const usurpe = await appel('POST', '/porte/exec', { ip: '198.51.100.7, 203.0.113.9', cle: CLE, corps: { cmd: 'echo passe-zut' } });
  vrai('c\'est la DERNIÈRE adresse de l\'en-tête qui compte (celle que pose le proxy), pas celle qu\'un client écrit devant', usurpe.code === 429, usurpe);

  // 7. Le journal dit ce qui a été fait, et ne porte jamais la clé.
  await attendre(200);
  vrai('le journal note les commandes et les refus', /exec code=0/.test(journal) && /REFUS clé/.test(journal), journal.slice(-300));
  vrai('le journal ne porte pas la clé', !journal.includes(CLE));

  p.kill(); try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
  console.log(`${ok} ✓  ${ko} ✗`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a jeté : ' + e.message); console.log(`${ok} ✓  ${ko + 1} ✗`); process.exit(1); });

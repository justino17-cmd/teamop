/* ⛔ CE QUE CE FICHIER GARDE — « MOT DE PASSE OUBLIÉ » D'UN ACCÈS BÊTA : L'ANCIEN TOMBE PARTOUT (Justin, 5 octobre 2026).

   La Tour pose un nouveau mot de passe (`POST /api/monitor/beta/mdp`, le VRAI serveur d'OP GESTION). Deux moitiés, justes chacune, et leur
   COUTURE est ce qu'on garde, contre le VRAI service d'OP MESSAGES :
     · OP GESTION publie l'instant du changement dans sa relecture (`/api/beta/etat` + `ids` → `mdp[id]`) ;
     · la porte d'OP MESSAGES (`server-msg/porte-beta.js`) supprime les sessions NÉES AVANT et ferme leurs flux — sans couper l'accès, sans
       toucher à la personne (même identifiant de compte : ses données sont là), sans recouper la session ouverte avec le NOUVEAU mot de passe.
   Un OP MESSAGES qui ne ferait que changer le hachage laisserait la session de qui a « oublié » son mot de passe ouverte sur l'appareil
   d'un tiers : c'est précisément ce que ce banc voit.
   Ce banc est À PART de `test-904` : OP GESTION plafonne `/api/beta` à 20 requêtes par minute et par adresse, la relecture de ce
   service y passe à chaque tour, et `test-904` tient déjà dans la fenêtre — l'allonger de quelques secondes le faisait tomber (mesuré :
   `relecturesEchec` à 73). Ici : une relecture par seconde, un OP GESTION neuf. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();

if (!fs.existsSync(path.join(T.RACINE, 'server', 'node_modules'))) {
  console.log('  — server/node_modules absent : banc non exécuté (npm i dans server/)');
  console.log('\n0 ✓  0 ✗');
  process.exit(0);
}

const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
let ipN = 10; const ip = () => '198.51.100.' + (ipN++);
const MDP_TOUR = 'mot-de-passe-de-la-tour-banc';

/* Le VRAI serveur d'OP GESTION, isolé : un dossier à lui, un port libre, la clé Firebase absente. */
async function lancerOpGestion(dossier, port) {
  fs.mkdirSync(path.join(dossier, 'data'), { recursive: true });
  const webpush = require(path.join(T.RACINE, 'server', 'node_modules', 'web-push'));
  const vap = webpush.generateVAPIDKeys();
  const cfg = path.join(dossier, 'config.json');
  if (!fs.existsSync(cfg)) fs.writeFileSync(cfg, JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: sha(MDP_TOUR) }));
  let sortie = '';
  const enfant = spawn(process.execPath, [path.join(T.RACINE, 'server', 'index.js')], {
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: cfg, TEAMOP_DATA: path.join(dossier, 'data'), PORT: String(port) }), stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => { sortie += d; }); enfant.stderr.on('data', d => { sortie += d; });
  const base = 'http://127.0.0.1:' + port;
  const vivant = await T.attendre(async () => { try { return (await fetch(base + '/health')).ok; } catch (e) { return false; } }, 15000, 100);
  if (!vivant) { try { enfant.kill('SIGKILL'); } catch (e) {} throw new Error('OP GESTION n\'a pas démarré\n' + sortie.slice(0, 800)); }
  return { base, enfant, dossier, tuer: () => { try { enfant.kill('SIGKILL'); } catch (e) {} }, sortie: () => sortie };
}
const json = async (base, methode, chemin, corps, entetes) => {
  const r = await fetch(base + chemin, { method: methode, headers: Object.assign({ 'Content-Type': 'application/json' }, entetes || {}), body: corps === undefined ? undefined : JSON.stringify(corps) });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { code: r.status, j };
};


(async () => {
  const dossierOg = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-945-og-'));
  const portOg = await T.portLibre();
  let og = await lancerOpGestion(dossierOg, portOg), svc = null;
  try {
    const tour = await json(og.base, 'POST', '/api/monitor/login', { nom: 'Patron', pass: MDP_TOUR });
    vrai('population : la Tour se connecte', tour.code === 200 && /^[0-9a-f]{48}$/.test(tour.j.token));
    const H = { Authorization: 'Bearer ' + tour.j.token };
    const creer = async (login, pass, nom) => (await json(og.base, 'POST', '/api/monitor/beta', { login, pass, nom, chantier: 'banc 945', apps: ['messages'] }, H));
    svc = await T.lancerService({ urlGestion: og.base, config: { beta: { relectureMs: 1000, timeoutMs: 1500 } } });

    console.log('Mot de passe oublié : la Tour pose un NOUVEAU mot de passe, les sessions ouvertes avec l\'ANCIEN tombent, la personne reste la même');
    {
      const ea = await creer('erwan', 'pw-erwan-ancien', 'Erwan'), eb = await creer('fanny', 'pw-fanny-reel1', 'Fanny');
      vrai('population : deux accès (Erwan, dont le mot de passe va changer ; Fanny, témoin) ouverts', ea.code === 200 && eb.code === 200);
      const cOld = await T.connecter(svc, {}, 'erwan', 'pw-erwan-ancien', ip()), cF = await T.connecter(svc, {}, 'fanny', 'pw-fanny-reel1', ip());
      const fOld = await T.flux(cOld);
      await cOld.post('/api/moi/maj', { statut: 'statut d\'Erwan' });
      const moiAvant = (await cOld.get('/api/moi')).j.moi;
      vrai('population : la session d\'Erwan (ancien mot de passe) et celle de Fanny servent', moiAvant && moiAvant.statut === 'statut d\'Erwan' && (await cF.get('/api/moi')).code === 200);
      await new Promise(r => setTimeout(r, 30));   // la nouvelle session naîtra STRICTEMENT après l'instant du changement (même milliseconde = « née avant » : pas de risque, mais pas de pari non plus)
      const mdp = await json(og.base, 'POST', '/api/monitor/beta/mdp', { id: ea.j.compte.id, pass: 'pw-erwan-nouveau' }, H);
      v('la Tour pose le nouveau mot de passe (la VRAIE route)', [mdp.code, mdp.j.ok], [200, true]);
      const cNew = await T.connecter(svc, {}, 'erwan', 'pw-erwan-nouveau', ip());
      vrai('⛔ le nouveau mot de passe ouvre la porte d\'OP MESSAGES', cNew && (await cNew.get('/api/moi')).code === 200);
      const finOld = await fOld.attendre(e => e.event === 'fin', 8000);
      vrai('⛔ la session ouverte avec l\'ANCIEN mot de passe tombe (flux « fin / session », puis 401) — sans que la personne fasse quoi que ce soit', !!finOld && finOld.data.motif === 'session' && await T.attendre(async () => (await cOld.get('/api/moi')).code === 401, 8000));
      const moiApres = (await cNew.get('/api/moi')).j.moi;
      vrai('⛔ la session ouverte avec le NOUVEAU reste, et c\'est la MÊME personne (même identifiant, ses données y sont : le statut posé avant)', moiApres.id === moiAvant.id && moiApres.statut === 'statut d\'Erwan');
      v('   le témoin (Fanny, mot de passe jamais changé) garde sa session : la relecture est passée, elle ne l\'a pas touchée', (await cF.get('/api/moi')).code, 200);
      await new Promise(r => setTimeout(r, 2500));   // plusieurs relectures encore (1 s) : la session neuve ne doit pas être recoupée à la suivante
      v('   et les relectures suivantes ne recoupent PAS la session neuve (seule une session née AVANT le changement tombe)', (await cNew.get('/api/moi')).code, 200);
      v('   l\'ancien mot de passe ne rouvre pas la porte (refus de la vraie OP GESTION traduit en 401)', (await T.client(svc.base, { xff: ip() }).post('/api/beta/entrer', { login: 'erwan', pass: 'pw-erwan-ancien' })).code, 401);
      fOld.fermer();
    }

    console.log('\nL\'écran de connexion des accès d\'essai DIT quoi faire quand on a oublié son mot de passe');
    {
      const LIGNE = 'Mot de passe oublié ? Demande-en un nouveau à la Tour de contrôle.';
      const page = await fetch(svc.base + '/').then(r => r.text()).catch(() => '');
      vrai('population : la page SERVIE par le service est reçue (et porte son formulaire de connexion)', /id="f-connexion"/.test(page));
      const formulaire = (/<form[^>]*id="f-connexion"[\s\S]*?<\/form>/.exec(page) || [''])[0];
      const apresAide = formulaire.split("ont ceux que la Tour de contrôle a donnés pour l'essai.</p>")[1] || '';
      vrai('⛔ la ligne est DANS le formulaire, juste sous « L\'identifiant et le mot de passe sont ceux que la Tour de contrôle a donnés pour l\'essai »', apresAide.trim().startsWith('<p class="connexion-aide" id="connexion-oubli">' + LIGNE + '</p>'));
      vrai('   elle n\'est pas masquée (pas d\'attribut hidden) et ne promet pas de lien par e-mail (ces accès n\'ont pas d\'adresse)', !/id="connexion-oubli"[^>]*hidden/.test(formulaire) && !/e-?mail|courriel/i.test(LIGNE));
      const apercu = fs.readFileSync(path.join(T.RACINE, 'apercu', 'opmessages', 'index.html'), 'utf8');
      vrai('   et l\'interface de Justin (la SOURCE de la page servie) porte la même ligne : la page servie n\'a pas été retouchée à la main', apercu.includes('<p class="connexion-aide" id="connexion-oubli">' + LIGNE + '</p>'));
    }
  } catch (e) {
    console.log('  ✗ le banc est mort : ' + (e && e.stack || e));
    if (svc) console.log(svc.sortie.texte().slice(-1200));
    process.exitCode = 1;
  }
  if (svc) await svc.arreter();
  og.tuer();
  try { fs.rmSync(dossierOg, { recursive: true, force: true }); } catch (e) {}
  fin();
})();

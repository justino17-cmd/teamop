/* ══ LE CODE D'ACCÈS N'EXISTE PLUS — ET IL NE REVIENT PAR AUCUNE PORTE ════════════════════════
   Justin, 28 septembre 2026 : « je veux plus de code, que des liens pour les connexions ». Ce fichier gardait le code
   d'accès à dix caractères (écrit pour de vrai, un par espace, révocable) ; il garde désormais son ABSENCE, sur le
   vrai serveur, avec les cas de la production : un espace avec « t », deux noms pour un seul espace, une entreprise
   fermée et un espace qui repart à neuf — ces deux derniers avec un VRAI code d'avant resté dans `acces.json`.
     · la Tour ne peut plus en fabriquer ni en renouveler (410), et rien ne s'écrit dans le registre ;
     · aucun code n'ouvre plus rien, même un vrai, et la réponse le DIT (410 « sans_code ») ;
     · la route reste réservée au patron, et les routes publiques voisines bornent toujours leur entrée ;
     · « repartir à neuf » efface encore l'entrée d'un code d'avant.
   La porte qui reste (l'adresse, l'identifiant, le mot de passe) est jouée par `tests/test-669.js` et `test-841.js`.

   Usage :  node server/test-acces.js
   Il démarre un serveur isolé sur un port libre, dans un dossier temporaire. Il ne touche ni la
   production, ni la configuration du VPS. Sortie non nulle si un cas échoue.        */
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');

const PORT = 8199;
const PORT_SMTP = PORT + 100;   // le facteur de banc (voir plus bas)
const BASE = 'http://127.0.0.1:' + PORT;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'teamop-acces-'));
const data = path.join(dir, 'data');
fs.mkdirSync(data);

const sha = (p) => crypto.createHash('sha256').update(String(p)).digest('hex');
const MDP = 'essai-' + crypto.randomBytes(6).toString('hex');
fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify({
  vapidPublicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkTF6oDZoV8HGDzT9K1YfJTNqjcMhLU_pP6HqJdBnbfGwqNfhKW1CTk',
  vapidPrivateKey: 'UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls',
  smtp: { host: '127.0.0.1', port: PORT_SMTP, secure: false, user: 'x', pass: 'y', from: 'banc@teamop.fr' }
}));
fs.writeFileSync(path.join(dir, 'monitor.json'), JSON.stringify({
  issues: [], journal: [], archive: [],
  /* « id » est obligatoire : une session sans identifiant s'accroche au premier compte qui n'en
     a pas et lui emprunte son rôle. Le serveur refuse désormais ce cas — et c'est en ajoutant
     ce durcissement que ce test est tombé, ce qui prouve qu'il le couvre. Les routes de
     création de comptes en attribuent toujours un. */
  users: [{ id: 'u-essai', nom: 'essai', email: 'essai@teamop.fr', hash: sha(MDP), role: 'patron', actif: true }]
}));
// DEUX noms, UN seul espace : « t » identique, c'est le cas de production
/* Le blob porte « e » ET « m », comme les espaces d'avant le hachage du mot de passe. Sans « e », l'essai
   « le blob ne rend pas l'adresse e-mail » était vide de sens : le champ n'y était jamais. */
const blob = (t, n) => Buffer.from(JSON.stringify({ t, k: 'cle-' + t, n, a: 'justin', m: 'Biret!!', e: 'demo@exemple.fr' })).toString('base64').replace(/=+$/, '');
fs.writeFileSync(path.join(data, 'espaces.json'), JSON.stringify({
  entreprisedemo:       { nom: 'Entreprise Démo',       code: blob('demo-t1', 'Entreprise Démo'),       t: 'demo-t1', ts: Date.now() - 100000, par: 'essai', email: 'demo@exemple.fr' },
  entreprisedemoparis:  { nom: 'Entreprise Démo Paris', code: blob('demo-t1', 'Entreprise Démo Paris'), t: 'demo-t1', ts: Date.now(),          par: 'essai', email: '' },
  // une entreprise DÉJÀ fermée, avec un code encore en place : elle ne doit plus s'ouvrir
  entreprisefermee:     { nom: 'Entreprise Fermée',     code: blob('ferme-t9', 'Entreprise Fermée'),    t: 'ferme-t9', ts: Date.now(),         par: 'essai', email: 'ferme@exemple.fr' },
  // et une qu'on fera repartir à neuf
  entrepriseneuve:      { nom: 'Entreprise Neuve',      code: blob('neuve-t5', 'Entreprise Neuve'),     t: 'neuve-t5', ts: Date.now(),         par: 'essai', email: 'neuve@exemple.fr' }
}));
fs.writeFileSync(path.join(data, 'entreprises-fermees.json'), JSON.stringify({ emails: ['ferme@exemple.fr'], espaces: ['ferme-t9'] }));
fs.writeFileSync(path.join(data, 'acces.json'), JSON.stringify({
  'ferme-t9': { code: 'FERMEE1234', ts: Date.now(), par: 'essai', vu: 0 },
  'neuve-t5': { code: 'NEUVE12345', ts: Date.now(), par: 'essai', vu: 0 }
}));

let ko = 0, ok = 0;
const dit = (nom, vrai, detail) => { if (vrai) { ok++; console.log('  ✔ ' + nom); } else { ko++; console.log('  ✘ ' + nom + (detail ? '   → ' + detail : '')); } };
const post = async (chemin, corps, jeton) => {
  const h = { 'Content-Type': 'application/json' };
  if (jeton) h.Authorization = 'Bearer ' + jeton;
  const r = await fetch(BASE + chemin, { method: 'POST', headers: h, body: JSON.stringify(corps) });
  let j = {}; try { j = await r.json(); } catch (e) {}
  return { statut: r.status, ...j };
};
const surDisque = () => { try { return JSON.parse(fs.readFileSync(path.join(data, 'acces.json'), 'utf8')); } catch (e) { return null; } };

/* Un serveur d'essai oublié d'un lancement précédent répondrait à notre place, avec SON
   annuaire et SON mot de passe : on mesurerait alors autre chose que ce qu'on croit — c'est
   arrivé, et ça se manifeste par un « nom ou mot de passe incorrect » incompréhensible.
   On refuse de démarrer plutôt que de rendre un résultat faux. */
(async () => {
  try {
    const r = await fetch(BASE + '/health', { signal: AbortSignal.timeout(1500) });
    if (r.ok) {
      console.log('✘ le port ' + PORT + ' est déjà pris par un autre serveur.');
      console.log('  Ferme-le avant de relancer :  ps -eo pid,args | grep "[s]erver/index.js"');
      fs.rmSync(dir, { recursive: true, force: true });
      process.exit(1);
    }
  } catch (e) { /* rien n'écoute : c'est ce qu'on veut */ }
})();

/* ⛔ UN FACTEUR SMTP DE BANC (celui de tests/test-834.js). Depuis le 27 septembre 2026, le serveur n'efface plus
   rien — « repartir à neuf » compris — tant qu'il ne peut pas envoyer l'avis de suppression (`supprMailPret`) :
   sans serveur d'e-mail, ce contrôle lisait « rien n'a été effacé » et tombait sur un serveur juste (vu sur une
   copie de main avant le déploiement). Il reçoit, retire le point doublé (RFC 5321 §4.5.2), et c'est tout. */
const facteur = { recus: [] };
facteur.s = require('net').createServer(c => {
  c.on('error', () => {});
  let tampon = '', corps = false, msg = '';
  c.write('220 banc\r\n');
  c.on('data', d => {
    tampon += d.toString('utf8');
    let i;
    while ((i = tampon.indexOf('\r\n')) >= 0) {
      const l = tampon.slice(0, i); tampon = tampon.slice(i + 2);
      if (corps) { if (l === '.') { corps = false; facteur.recus.push(msg); msg = ''; c.write('250 ok\r\n'); } else msg += (l.startsWith('.') ? l.slice(1) : l) + '\n'; continue; }
      const h = l.toUpperCase();
      if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-banc\r\n250 AUTH PLAIN LOGIN\r\n');
      else if (h.startsWith('AUTH')) c.write('235 ok\r\n');
      else if (h.startsWith('DATA')) { corps = true; c.write('354 go\r\n'); }
      else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); }
      else c.write('250 ok\r\n');
    }
  });
});
facteur.s.listen(PORT_SMTP, '127.0.0.1');
const lisible = (m) => Buffer.from(String(m || '').replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))), 'latin1').toString('utf8');
const avisParti = async () => { for (let i = 0; i < 40; i++) { if (facteur.recus.some(m => /Une suppression vient d'être faite/.test(lisible(m)))) return true; await new Promise(r => setTimeout(r, 50)); } return false; };
const srv = spawn(process.execPath, [path.join(__dirname, 'index.js')], {
  env: { ...process.env, TEAMOP_CONFIG: path.join(dir, 'config.json'), TEAMOP_DATA: data, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe']
});
if (process.env.BAVARD) { srv.stdout.on('data', d => process.stdout.write('[srv] ' + d)); srv.stderr.on('data', d => process.stdout.write('[srv!] ' + d)); }
const fin = (code) => { try { srv.kill(); } catch (e) {} try { facteur.s.close(); } catch (e) {} try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {} process.exit(code); };

(async () => {
  for (let i = 0; i < 40; i++) {
    try { await fetch(BASE + '/health'); break; } catch (e) { await new Promise(r => setTimeout(r, 250)); }
  }
  const cx = await post('/api/monitor/login', { nom: 'essai', pass: MDP });
  if (!cx.token) { console.log('✘ connexion à la Tour impossible :', JSON.stringify(cx).slice(0, 120)); fin(1); }
  const T = cx.token;

  const avant = JSON.stringify(surDisque());
  console.log('\n── la Tour ne fabrique plus de code ──');
  const a = await post('/api/monitor/espaces/acces', { slug: 'entreprisedemo' }, T);
  dit('410, et aucun code rendu', a.statut === 410 && !a.acces && a.motif === 'sans_code', JSON.stringify(a).slice(0, 120));
  const c = await post('/api/monitor/espaces/acces', { slug: 'entreprisedemoparis', regenerer: true }, T);
  dit('ni par l\'autre nom, ni en « renouvelant »', c.statut === 410 && !c.acces);
  dit('rien ne s\'est écrit dans le registre', JSON.stringify(surDisque()) === avant, JSON.stringify(surDisque()).slice(0, 120));

  console.log('\n── aucun code n\'ouvre plus rien ──');
  const o1 = await post('/api/espaces/ouvrir', { nom: 'Entreprise Neuve', acces: 'NEUVE12345' });
  dit('un VRAI code d\'avant, encore dans le registre : refusé (410)', o1.statut === 410 && !o1.code, JSON.stringify(o1).slice(0, 120));
  dit('…et la réponse dit quoi faire à la place', /identifiant et son mot de passe/.test(o1.error || '') && o1.motif === 'sans_code');
  dit('mauvais code, entreprise inconnue, nom sans code : la même réponse',
    [await post('/api/espaces/ouvrir', { nom: 'Entreprise Démo', acces: 'ZZZZZZZZZZ' }), await post('/api/espaces/ouvrir', { nom: 'Nexiste Pas', acces: 'NEUVE12345' }),
      await post('/api/espaces/ouvrir', { nom: 'Entreprise Démo' })].every(x => x.statut === 410 && x.error === o1.error));
  dit('l\'entreprise fermée, son code pourtant « valide » : pareil', (await post('/api/espaces/ouvrir', { nom: 'Entreprise Fermée', acces: 'FERMEE1234' })).statut === 410);
  /* Des « é » : c'est normalize('NFD') qui coûte, et seulement sur les accents (434 ms contre 17 ms). La route du
     code ne lit plus rien ; les trois routes publiques voisines, elles, doivent toujours borner leur entrée. */
  const gros = 'é'.repeat(2600000);   // ~5,1 Mo en UTF-8
  const tGros = Date.now();
  dit('un nom de 5 Mo ne fait pas travailler le serveur', (await post('/api/espaces/ouvrir', { nom: gros, acces: 'ZZZZZZZZZZ' })).statut === 410);
  const msGros = Date.now() - tGros;
  dit('...et vite : moins de 250 ms (sinon toute l\'API gèle)', msGros < 250, msGros + ' ms');
  for (const route of ['/api/espaces/relance', '/api/espaces/libre', '/api/espaces/verifie-nom']) {
    const t0 = Date.now(); await post(route, { nom: gros }); const ms = Date.now() - t0;
    dit('  ' + route + ' borne aussi son entrée', ms < 250, ms + ' ms');
  }

  console.log('\n── la route reste réservée au patron ──');
  dit('sans jeton, refus', (await post('/api/monitor/espaces/acces', { slug: 'entreprisedemo' })).statut === 403);
  dit('avec un jeton inventé, refus', (await post('/api/monitor/espaces/acces', { slug: 'entreprisedemo' }, 'ffffffffffffffffffffffffffffffffffffffffffffffff')).statut === 403);

  console.log('\n── un espace qui repart à neuf efface son code d\'avant ──');
  dit('il est dans le registre avant', !!(surDisque() || {})['neuve-t5']);
  /* la Tour v2.69 : une question, une case, « Oui » → confirme:true (sous la limite, pas de code) */
  await post('/api/monitor/espaces/renaitre', { nom: 'Entreprise Neuve', confirme: true }, T);
  dit('l\'avis de suppression est parti (sinon rien n\'aurait été effacé)', await avisParti());
  dit('il est effacé du registre', !(surDisque() || {})['neuve-t5']);

  console.log('\n' + (ko ? '✘ ' + ko + ' cas en échec sur ' + (ok + ko) : '✔ ' + ok + ' cas, tous passés'));
  fin(ko ? 1 : 0);
})().catch(e => { console.log('✘ ' + e.message); fin(1); });

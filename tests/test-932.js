/* ⛔ CE QUE CE FICHIER GARDE — LE DÉPLOYEUR D'OP MESSAGES : IL NE LAISSE JAMAIS LE SERVICE SUR UN CODE QUI NE TIENT PAS.

   `/opt/opmsg/deployer.sh` est ce que la clé SSH de la CI a le droit de lancer (commande FORCÉE). Trois choses
   doivent être vraies, et aucune ne se voit à la lecture :
     · après un déploiement, ce qui TOURNE est ce qu'on a demandé — `/health` rend le bon sha. Un contrôle d'`ok:true`
       seul laisserait passer un lien qui n'a pas pris et un service resté sur l'ancien code ;
     · quand ça ne tient pas, on REVIENT : au lien précédent, le service répond de nouveau avec l'ancien sha ;
     · ce que la CI envoie, c'est une DEMANDE, jamais un shell : `beta <sha>` validé au motif, et rien d'autre.
   Ce banc l'EXÉCUTE contre un dépôt réel et un faux service qui répond VRAIMENT sur /health (voir
   `tests/bac-messages.js`). Le faux service peut mentir (`MENT`) ou mourir (`PLANTE`) selon le commit déployé.

   ⚠️ LA RÈGLE DE `test-729` : un banc qui passe ne prouve rien tant qu'on ne l'a pas vu ÉCHOUER — les mutations
   (`scratchpad/mutations-deploiement-messages.py`) remettent chaque défaut gardé ici, sur une COPIE. */
'use strict';
const fs = require('fs'), path = require('path');
const { spawnSync, spawn } = require('child_process');
const { bac, banc } = require('./bac-messages.js');
const t = banc();
const { v, vrai } = t;

const CLE = 'c0ffee' + 'ab12'.repeat(14) + '0f';
const PUB = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGq6Fake0Fake0Fake0Fake0Fake0Fake0Fake0Fake0 deploy@mac';
const aSauver = [];
/* Une bêta INSTALLÉE : c'est l'état où la CI arrive (le déployeur installé est celui qu'on exerce). */
function installee() {
  const b = bac(); aSauver.push(b); b.proxy('nginx');
  const r = b.installer('beta', CLE + '\n' + CLE + '\n' + PUB + '\n');
  if (r.rc !== 0) { console.log(r.sortie); throw new Error('l\'installation du bac a échoué'); }
  return b;
}
console.log('\n── 932 · le déployeur d\'OP MESSAGES, exécuté ──');
const A = 'a'.repeat(40);

/* ══ 1. UN DÉPLOIEMENT QUI RÉUSSIT ═════════════════════════════════════════════════════════════════ */
const b = installee();
const sha0 = b.sha();
const sha1 = b.commit({ 'server-msg/index.js': require('./bac-messages.js').INDEX_FACTICE + '// version 2\n' }, 'version 2');
const r1 = b.deployer('beta', sha1);
v('⛔ un déploiement neuf réussit', r1.rc, 0);
v('   le lien `current` désigne la release du sha demandé', b.lien('beta'), sha1);
v('⛔ /health rend LE BON sha (le service a redémarré sur le nouveau code)', (b.sante() || {}).sha, sha1);
v('   le lien `precedent` garde la release d\'avant (pour un retour à la main)', path.basename(fs.realpathSync(path.join(b.R, 'opt/opmsg/beta/precedent'))), sha0);
vrai('   la release est marquée prête et son cache npm est parti', b.existe('opt/opmsg/beta/releases/' + sha1 + '/.pret') && !b.existe('opt/opmsg/beta/releases/' + sha1 + '/.npm-cache'));
vrai('   la release est rendue à root (le service ne peut pas réécrire son propre code)', /chown -R root:root \S*releases\/[0-9a-f]{40}/.test(b.journal()));
const npm = b.journal().split('\n').filter(l => /runuser /.test(l) && /npm ci/.test(l));
v('⛔ `npm ci` a tourné UNE fois pour ce déploiement, sous l\'utilisateur opmsg (pas root)', npm.filter(l => /runuser -u opmsg -- /.test(l) && l.includes(sha1)).length, 1);
vrai('⛔ avec --ignore-scripts (aucun script d\'une dépendance compromise ne s\'exécute) et --omit=dev', npm.every(l => /--ignore-scripts/.test(l) && /--omit=dev/.test(l)));
vrai('   le service a été redémarré après la bascule du lien, pas avant',
  b.journal().lastIndexOf('systemctl restart teamop-msg@beta') > 0);
const lignes = r1.sortie.split('\n').filter(Boolean);
vrai('⛔ la sortie ne dit QUE ce qu\'on peut recoller : bascule, /health, déployé (jamais de journal, de configuration, de chemin de secret)',
  lignes.every(l => /^(bascule : |\/health : ok=true instance=beta sha=[0-9a-f]{8}$|déployé : beta [0-9a-f]{8}$)/.test(l)));
vrai('   et le dernier mot est « déployé »', /^déployé : beta [0-9a-f]{8}$/.test(lignes[lignes.length - 1]));
v('⛔ rien d\'OP GESTION touché : aucun appel à teamop-api, aucun chemin sous teamop', [/teamop-api/.test(b.journal()), Object.keys(b.etat()).some(k => /^(opt|etc)\/teamop\//.test(k))], [false, false]);

/* ══ 2. LE SERVICE RÉPOND LE MAUVAIS SHA — LE CAS QUE `ok:true` NE VOIT PAS ═══════════════════════════ */
{
  const shaMenteur = b.commit({ 'server-msg/MENT': A }, 'un service qui répond un autre sha');
  const r = b.deployer('beta', shaMenteur);
  v('⛔ un service qui répond le MAUVAIS sha : le déploiement ÉCHOUE', r.rc, 1);
  vrai('   et le dit : retour arrière', /retour arrière/.test(r.sortie));
  v('⛔ le lien est REVENU à la release précédente', b.lien('beta'), sha1);
  v('⛔ et le service répond de nouveau avec l\'ANCIEN sha (le retour arrière a redémarré le service)', (b.sante() || {}).sha, sha1);
  vrai('   « retour arrière réussi » est dit seulement parce que /health l\'a confirmé', /retour arrière réussi : le service est revenu sur/.test(r.sortie));
}
{
  const shaMort = b.commit({ 'server-msg/PLANTE': 'x' }, 'une release qui meurt au démarrage');
  const r = b.deployer('beta', shaMort);
  v('⛔ une release qui meurt au démarrage : échec, et retour', [r.rc, b.lien('beta'), (b.sante() || {}).sha], [1, sha1, sha1]);
}
{
  const sha = b.commit({ 'server-msg/PLANTE': null, 'server-msg/MENT': null, 'server-msg/touche.txt': '1' }, 'redevient saine');
  b.drapeau('refuse-demarrage', '1');
  const r = b.deployer('beta', sha);
  b.drapeau('refuse-demarrage', false);
  vrai('⛔ systemctl restart qui échoue : échec ET retour arrière (le lien n\'est pas laissé sur la release neuve)', r.rc === 1 && b.lien('beta') === sha1);
  v('   le service de l\'ancienne release a été relancé', (b.sante() || {}).sha, sha1);
}
{
  // Les dépendances ne s'installent pas : rien ne bouge, la release ratée n'est pas gardée.
  const sha = b.commit({ 'server-msg/package.json': JSON.stringify({ name: 'x', version: '1.0.0', dependencies: { 'absent-du-verrou': '1.0.0' } }) }, 'package.json désynchronisé du verrou');
  const r = b.deployer('beta', sha);
  vrai('⛔ npm ci échoue (package.json et verrou désaccordés) : échec net', r.rc === 1 && /npm ci a échoué/.test(r.sortie));
  v('   le service n\'a PAS été touché : même lien, même sha servi', [b.lien('beta'), (b.sante() || {}).sha], [sha1, sha1]);
  v('   et la release ratée n\'est pas laissée sur le disque', b.existe('opt/opmsg/beta/releases/' + sha), false);
  // On remet main sur un état sain pour la suite.
  b.commit({ 'server-msg/package.json': JSON.stringify({ name: 'opmsg-factice', version: '1.0.0', private: true }, null, 1) }, 'package.json remis');
}

/* ══ 3. LES SHA QU'ON NE DÉPLOIE PAS ═══════════════════════════════════════════════════════════════ */
{
  const r = b.deployer('beta', 'd'.repeat(40));
  vrai('⛔ un sha inconnu du miroir : refus net', r.rc === 1 && /inconnu du miroir/.test(r.sortie));
  const lateral = b.hors_main();
  const r2 = b.deployer('beta', lateral);
  vrai('⛔ un commit qui n\'est PAS sur main (une branche non relue) : refus, rien n\'est déployé', r2.rc === 1 && /n'est pas sur main/.test(r2.sortie));
  v('   le service n\'a pas bougé', [b.lien('beta'), (b.sante() || {}).sha], [sha1, sha1]);
}
{
  // Le désordre des poussées : un sha PLUS ANCIEN que celui en service est ignoré.
  const r = b.deployer('beta', sha0);
  vrai('⛔ un sha plus ancien que celui en service : IGNORÉ, sortie 0, le service ne recule pas', r.rc === 0 && /ignoré : [0-9a-f]{8} est plus ancien/.test(r.sortie) && b.lien('beta') === sha1);
  const r2 = b.deployer('beta', sha0, ['retour']);
  v('   sur demande explicite (« retour »), le recul se fait', [r2.rc, b.lien('beta'), (b.sante() || {}).sha], [0, sha0, sha0]);
  const r3 = b.deployer('beta', sha1);
  v('   et on peut REPARTIR en avant', [r3.rc, b.lien('beta')], [0, sha1]);
  const r4 = b.deployer('beta', sha1);
  vrai('   redéployer le sha déjà en service : rien de cassé (déjà en service, le service répond)', r4.rc === 0 && /déjà en service/.test(r4.sortie) && (b.sante() || {}).sha === sha1);
}

/* ══ 4. LA COMMANDE QUE LA CI ENVOIE EST UNE DEMANDE, JAMAIS UN SHELL ══════════════════════════════════ */
{
  const lienAvant = b.lien('beta'), nRestart = (b.journal().match(/restart teamop-msg/g) || []).length;
  const refus = (txt, cmd) => {
    const r = b.deployerSsh(cmd);
    v('⛔ refusée (' + txt + ')', r.rc, 2);
  };
  refus('injection : point-virgule après le sha', 'beta ' + sha1 + '; touch ' + path.join(b.d, 'pwned'));
  refus('substitution de commande', 'beta $(touch ' + path.join(b.d, 'pwned') + ')');
  refus('un mot de trop', 'beta ' + sha1 + ' retour extra');
  refus('une option inconnue', 'beta ' + sha1 + ' force');
  refus('une autre instance', 'staging ' + sha1);
  refus('un sha abrégé', 'beta ' + sha1.slice(0, 39));
  refus('un sha en majuscules', 'beta ' + sha1.toUpperCase());
  refus('un chemin à la place du sha', 'beta ../../etc/passwd');
  refus('plusieurs lignes', 'beta ' + sha1 + '\ntouch ' + path.join(b.d, 'pwned'));
  refus('une demande vide', ' ');
  v('   aucun effet de bord : pas de fichier créé par une injection', fs.existsSync(path.join(b.d, 'pwned')), false);
  v('   et le service n\'a pas été relancé une seule fois', [b.lien('beta'), (b.journal().match(/restart teamop-msg/g) || []).length], [lienAvant, nRestart]);
  // Sans demande (ouverture d'un shell interactif avec cette clé) : usage, pas un shell.
  const rs = spawnSync('bash', [path.join(b.R, 'opt/opmsg/deployer.sh')], { encoding: 'utf8', env: b.env() });
  v('⛔ lancé sans demande (la clé ouvrant une session) : refus, pas de shell', rs.status, 2);
  /* Une demande VALIDE passe la validation : elle atteint le contrôle « installé ? ». Sous ssh le préfixe de bac est
     ignoré (voir plus bas), donc sur une machine de développement elle répond « non installé » — et c'est la preuve
     qu'elle a franchi la porte, là où les refus ci-dessus sortent en 2. Ce contrôle-là n'a de sens que sans vrai
     /opt/opmsg (sinon on lancerait un déployeur près d'un vrai service). */
  if (!fs.existsSync('/opt/opmsg')) {
    const rd = b.deployerSsh('beta ' + sha1 + ' retour');
    vrai('une demande valide (avec « retour ») franchit la validation : elle atteint le contrôle « installé ? »', rd.rc === 0 && /non installé/.test(rd.sortie));
    const rx = b.deployerSsh('beta ' + sha1, {});
    vrai('   la demande sans option aussi', rx.rc === 0 && /non installé/.test(rx.sortie));
  }
  // Argument ET demande : on refuse la double source (un client ne choisit pas ses arguments).
  const ra = spawnSync('bash', [path.join(b.R, 'opt/opmsg/deployer.sh'), 'beta', sha1], { encoding: 'utf8', env: b.env({ SSH_ORIGINAL_COMMAND: 'beta ' + sha1 }) });
  v('⛔ des arguments EN PLUS d\'une demande ssh : refusés', ra.status, 2);
}
if (!fs.existsSync('/opt/opmsg')) {
  // Sous ssh, le préfixe de bac est IGNORÉ : un chemin ne se décide pas depuis l'extérieur. Le déployeur cherche alors le
  // VRAI /opt/opmsg — absent d'une machine de développement — et dit « non installé » sans toucher au bac.
  const avant = b.lien('beta');
  const r = b.deployerSsh('beta ' + b.sha(), { OPMSG_RACINE: b.R });
  vrai('⛔ sous ssh, OPMSG_RACINE est ignoré (le déployeur n\'écrit pas où le client le dit)', r.rc === 0 && /non installé/.test(r.sortie) && b.lien('beta') === avant);
} else {
  console.log('  (contrôle « OPMSG_RACINE ignoré sous ssh » non joué : /opt/opmsg existe sur cette machine — on ne lance pas un déployeur près d\'un vrai service)');
}

/* ══ 5. « NON INSTALLÉ » SORT EN 0, ET LE DIT ══════════════════════════════════════════════════════════ */
{
  const vide = bac(); aSauver.push(vide);
  const r = vide.deployer('beta', vide.sha()) ;
  void r;
  // Le déployeur du dépôt, lancé dans une racine VIDE (rien d'installé).
  const rr = spawnSync('bash', [path.join(__dirname, '..', 'server-msg', 'deployer.sh'), 'beta', vide.sha()], { encoding: 'utf8', env: vide.env() });
  v('⛔ rien d\'installé : le déployeur sort en 0 (on peut fusionner le code avant l\'installation)', rr.status, 0);
  vrai('   et il dit « non installé » pour qu\'un vert ne se lise pas « déployé »', /non installé/.test(String(rr.stdout)) && !/déployé :/.test(String(rr.stdout)));
  v('   rien n\'a été créé', fs.existsSync(path.join(vide.R, 'opt')), false);
  // La bêta est installée, pas la production : demander prod dit « non installé » aussi.
  const rp = spawnSync('bash', [path.join(b.R, 'opt/opmsg/deployer.sh'), 'prod', b.sha()], { encoding: 'utf8', env: b.env() });
  vrai('   la bêta installée ne fait pas passer la production pour installée', rp.status === 0 && /non installé : OP MESSAGES \(prod\)/.test(String(rp.stdout)));
  v('   et ne touche pas la bêta', [b.lien('beta'), (b.sante() || {}).sha], [sha1, sha1]);
}

/* ══ 6. UN SEUL DÉPLOIEMENT À LA FOIS ══════════════════════════════════════════════════════════════════
   On tient le verrou depuis l'extérieur, on lance le déployeur, et on exige que RIEN ne soit redémarré tant que
   le verrou est tenu. Le repère est l'horloge de la machine, écrite par le faux `systemctl` et par le tenant. */
{
  const sha = b.commit({ 'server-msg/verrou.txt': 'x' }, 'pour le verrou');
  const lock = path.join(b.R, 'opt/opmsg/deployer.lock');
  const marque = path.join(b.d, 'verrou-libere');
  const r = spawnSync('bash', ['-c',
    '( flock -x 9; sleep 2; date +%s%N > "' + marque + '" ) 9>"' + lock + '" & sleep 0.5; "$1" beta ' + sha + '; wait',
    '_', path.join(b.R, 'opt/opmsg/deployer.sh')], { encoding: 'utf8', env: b.env(), timeout: 60000 });
  v('⛔ un déployeur lancé pendant qu\'un autre tient le verrou ATTEND, puis réussit', [r.status, b.lien('beta')], [0, sha]);
  const t0 = Number(fs.readFileSync(marque, 'utf8').trim());
  const rest = b.journal().split('\n').filter(l => /systemctl restart teamop-msg@beta/.test(l)).map(l => Number(l.split(' ')[0])).pop();
  vrai('⛔ et le redémarrage n\'a eu lieu QU\'APRÈS la libération du verrou (jamais deux déploiements ensemble)', rest > t0);
  // Le faux service du déploiement précédent ne doit pas avoir hérité du verrou (sinon le banc se serait figé).
  vrai('   le faux service n\'a pas gardé le verrou ouvert (sinon tout déploiement suivant se figerait)', spawnSync('flock', ['-n', lock, 'true']).status === 0);
}

/* ══ 7. LE MÉNAGE : ON GARDE LES QUATRE DERNIÈRES, JAMAIS LA COURANTE NI LA PRÉCÉDENTE ═══════════════════ */
{
  let dernier = null;
  for (let i = 0; i < 6; i++) { dernier = b.commit({ 'server-msg/menage.txt': String(i) }, 'menage ' + i); const r = b.deployer('beta', dernier); if (r.rc !== 0) { console.log(r.sortie); break; } }
  const rel = fs.readdirSync(path.join(b.R, 'opt/opmsg/beta/releases'));
  vrai('⛔ les anciennes releases sont élaguées (au plus quatre restent)', rel.length <= 4 && rel.length >= 2);
  vrai('   la courante et la précédente sont TOUJOURS là', rel.includes(dernier) && rel.includes(path.basename(fs.realpathSync(path.join(b.R, 'opt/opmsg/beta/precedent')))));
  v('   et le service tourne sur la courante', [b.lien('beta'), (b.sante() || {}).sha], [dernier, dernier]);
}

/* ══ 8. LA PREMIÈRE INSTALLATION : PAS DE « PRÉCÉDENT » OÙ REVENIR ═════════════════════════════════════════
   Déjà gardée par `test-931` (le premier déploiement qui ment). Ici : le déployeur seul, sans lien. */
{
  const n = bac(); aSauver.push(n); n.proxy('nginx');
  n.commit({ 'server-msg/MENT': A }, 'dès le premier commit, un service qui ment');
  const ri = n.installer('beta', CLE + '\n' + CLE + '\n\n');
  v('un tout premier déploiement refusé : l\'installation échoue', ri.rc, 1);
  vrai('⛔ le service est ARRÊTÉ (on ne laisse pas tourner ce que le contrôle a refusé) et il n\'y a plus de lien', n.lien('beta') === null && /systemctl stop teamop-msg@beta/.test(n.journal()));
  vrai('   le message le dit', /première installation en échec/.test(ri.sortie));
}

for (const x of aSauver) x.fin();
void spawn;
t.fin();

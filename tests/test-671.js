/* ⛔ CE QUE CE FICHIER GARDE — les dossiers de chaque boîte : le CONTRAT entre `server/mail.js` et la Tour (réécrit le 18 octobre 2026).

   Justin, 13 septembre 2026, capture d'Apple Mail à l'appui : « je veux ça par boîte mail comme Mail d'Apple ». La barre de dossiers de l'ancien écran de la Tour a disparu le 18 octobre
   (OP Courrier la remplace : les dossiers sont ceux du module). Ce qui reste vrai, et que ce banc garde, tient aux DEUX côtés du même mot :
     · le serveur envoie bien `boite`, `dossiers[{chemin, nom, role}]` et `nonLus` (par dossier : STATUS UNSEEN de CE dossier), triés dans l'ordre de Mail ;
     · la Tour (`courrierSource`) lit exactement ces mots, et son tableau « dossier du module → rôle » ne vise que des rôles que le serveur sait nommer. Si un jour le serveur renommait `chemin`
       ou `role`, la Tour dessinerait des dossiers vides sans qu'aucune erreur ne sorte : `x.dossiers||[]` se dessine très bien.
   Le comportement joué (chaque dossier arrive de SON dossier IMAP, contre le vrai serveur) est dans `test-2704`. */
const fs = require('fs');
const TOUR = fs.readFileSync(__dirname + '/../tour.html', 'utf8');
const SRV  = fs.readFileSync(__dirname + '/../server/mail.js', 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
function corps(src, entete) {
  const i = src.indexOf(entete);
  if (i < 0) return '';
  let j = src.indexOf('{', i), p = 0;
  for (let k = j; k < src.length; k++) {
    const c = src[k];
    if (c === '{') p++;
    else if (c === '}') { p--; if (!p) return src.slice(i, k + 1); }
  }
  return '';
}

console.log('Les dossiers de chaque boîte : le contrat serveur ↔ Tour');
{
  v('le serveur envoie bien les dossiers avec chaque boîte',
    /out\.push\(\{ boite: publique\(b\), dossiers: liste, nonLus \}\)/.test(SRV), true);
  v('…et chaque dossier porte chemin, nom et rôle',
    /out\.push\(\{ chemin: item\.path, nom: NOMS\[role\] \|\| item\.name \|\| item\.path, role: role \}\)/.test(SRV), true);
  v('⛔ le compteur de non-lus de CHAQUE dossier est lu dans CE dossier (STATUS UNSEEN) — jamais celui d’un autre',
    /client\.status\(d\.chemin, \{ unseen: true \}\)/.test(SRV) && /out\[d\.chemin\] = /.test(SRV), true);
  v('…et celui de la boîte reste celui de la Réception, repéré par son RÔLE',
    /const ib = liste\.find\(x => x\.role === 'inbox'\)/.test(SRV), true);
  v('le serveur trie déjà dans l’ordre de Mail',
    /const ordre = \['inbox', 'envoyes', 'brouillons', 'archives', 'indesirables', 'corbeille'\]/.test(SRV), true);
  /* La Tour lit `boite.id`, `dossiers`, `role` et `chemin` : les mêmes mots, ou rien ne s'affiche. */
  const src = corps(TOUR, 'function courrierSource(');
  const ch = corps(src, 'function chemin(');
  v('(population) l’adaptateur et sa lecture des chemins sont trouvés', [src.length > 3000, ch.length > 200], [true, true]);
  v('⛔ la Tour lit les dossiers de la bonne boîte (boite.id), par RÔLE, et en tire le CHEMIN',
    [/x\.boite&&x\.boite\.id===boite/.test(ch), /x\.role===ROLE\[dossier\]/.test(ch), /return d\?d\.chemin:/.test(ch)], [true, true, true]);
  v('…la Réception retombe sur INBOX seulement si le serveur n’a rien nommé (rôle « inbox »)', /dossier==='inbox'\?'INBOX':null/.test(ch), true);
  /* Les rôles que la Tour demande sont ceux que le serveur sait nommer : un autre mot ne trouverait jamais son dossier. */
  const rolesServeur = [...SRV.slice(SRV.indexOf('const ROLES = {'), SRV.indexOf('const NOMS')).matchAll(/: '([a-z]+)'/g)].map(m => m[1]).concat(['inbox']);
  const roleTour = [...(/var ROLE=\{([^}]*)\}/.exec(src) || [0, ''])[1].matchAll(/:'([a-z]+)'/g)].map(m => m[1]);
  v('(population) le tableau des rôles de la Tour est lu', roleTour.length, 6);
  v('⛔ chaque rôle demandé par la Tour existe côté serveur', roleTour.filter(r => !rolesServeur.includes(r)), []);
  /* Un serveur dit « Trash », l'autre « Corbeille » : viser le nom marcherait chez l'un et pas chez l'autre, et personne ne saurait pourquoi. */
  v('⛔ aucun chemin de dossier écrit en dur dans la Tour', /['"]INBOX\.(Sent|Trash|Junk|Drafts|Archive)/.test(TOUR), false);
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);

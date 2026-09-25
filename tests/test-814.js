/* ⛔ CE QUE CE FICHIER GARDE — LES GESTES DU JOUR J, DANS LA TOUR.

   Deux gestes de la sortie de Firebase n'existaient que par l'API : reprendre les dossiers du
   portail qui vivent chez Google, et l'inventaire des documents d'équipe qui autorise à couper la
   copie. Justin travaille depuis son téléphone — un geste qui demande `curl` et un jeton ne se fait
   pas le jour J. `blocSortieFirebase()` (tour.html) les rend : l'état lu dans `/health`, la porte de
   version CONFIRMÉE chez Google, et deux boutons qui ne s'allument que quand le geste a un sens.

   On EXÉCUTE la vraie fonction, extraite de la page, avec ce qu'elle touche (l'API, la session). */
const fs = require('fs'), path = require('path');
const TOUR = fs.readFileSync(path.join(__dirname, '..', 'tour.html'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, c) => v(t, !!c, true);
const attendre = () => new Promise(r => setTimeout(r, 10));

console.log('\n── 814 · la Tour : les gestes du jour J (sortie de Firebase) ──');
const i = TOUR.indexOf('var SFB={'), j = TOUR.indexOf('function vueSurveillance(){');
const src = (i > 0 && j > i) ? TOUR.slice(i, j) : '';
vrai('le bloc s\'extrait de la page, entier', src.length > 2000 && /function blocSortieFirebase\(\)/.test(src));
vrai('⛔ il est affiché sous les versions, dans la surveillance d\'OP GESTION', /\(APP==='gestion'\?blocVersions\(\)\+blocSortieFirebase\(\):''\)/.test(TOUR));

function monter(env) {
  const appels = [];
  const f = new Function('MYROLE', 'API', 'VER', 'fetch', 'apiPost', 'confirm', 'msgErreur', 'squelListe', 'esc', 'journal',
    'var TAB="surveillance"; function render(){ journal.rendus++; }\n' + src +
    '\nreturn { bloc: blocSortieFirebase, importer: sfbImporter, inventaire: sfbInventaire, charger: chargerSortieFirebase, etat: function(){ return SFB; } };');
  const journal = { rendus: 0 };
  const api = f(env.role || 'patron', 'https://api.banc', env.ver || { d: { minFirestore: 0 } },
    async (u) => { appels.push(u); if (env.santePanne) throw new Error('réseau'); return { json: async () => env.sante }; },
    async (u, b) => { appels.push('POST ' + u); return env.reponses[u] || { ok: false, status: 500, d: {} }; },
    () => true, () => 'Serveur injoignable', () => '<squelette>', (x) => String(x), journal);
  return { api, appels, journal };
}
const santeBase = { documents: { actif: true, copieFirebase: true, copiesEchec1h: 0, illisibles1h: 0, ecrituresEchec1h: 0, copiesEnAttente1h: 2 },
  portail: { comptes: { actif: true }, dossiers: { actif: true } } };
const reponses = {
  '/api/monitor/portail/importer': { ok: true, status: 200, d: { ok: true, repris: 3, ignores: 1, comptesPrepares: 2, comptesRemis: 1, sansAdresse: 0, champsRefuses: 0 } },
  '/api/monitor/documents/inventaire': { ok: false, status: 409, d: { ok: false, error: 'inventaire_incomplet_conserve', echecs: 2 } },
};

(async () => {
  {
    const m = monter({ role: 'collaborateur', sante: santeBase, reponses });
    v('⛔ un collaborateur ne voit pas ces gestes (patron seul)', m.api.bloc(), '');
    v('   et rien n\'est demandé au serveur pour lui', m.appels, []);
  }
  {
    const m = monter({ sante: santeBase, reponses, ver: { d: { minFirestore: 0 } } });
    v('au premier affichage : un squelette, et l\'état se demande à /health', [/squelette/.test(m.api.bloc()), m.appels], [true, ['https://api.banc/health']]);
    await attendre();
    vrai('   l\'état reçu redessine l\'écran', m.journal.rendus >= 1);
    const h = m.api.bloc();
    vrai('⛔ la porte de version NON confirmée chez Google se dit', /non confirmée/.test(h));
    vrai('   les documents chez nous, la copie active, les comptes du portail en service', /en service/.test(h) && /active/.test(h));
    vrai('   les copies en attente se comptent', />2</.test(h));
    const btn = (lib) => { const k = h.indexOf(lib); const d = h.lastIndexOf('<button', k); return h.slice(d, k); };
    v('⛔ reprendre le portail : possible (les comptes sont allumés)', / disabled/.test(btn('Reprendre les dossiers du portail')), false);
    v('⛔ l\'inventaire : IMPOSSIBLE tant que la porte n\'est pas confirmée en v748', / disabled/.test(btn('Faire l’inventaire')), true);

    await m.api.importer(null); await attendre();
    const h2 = m.api.bloc();
    vrai('⛔ la reprise du portail passe par la vraie route, et son résultat s\'affiche', m.appels.indexOf('POST /api/monitor/portail/importer') >= 0 && /3 dossier\(s\) repris/.test(h2) && /1 compte\(s\) jamais vérifié\(s\) remis à poser/.test(h2));
  }
  {
    const m = monter({ sante: santeBase, reponses, ver: { d: { minFirestore: 748 } } });
    m.api.bloc(); await attendre();
    const h = m.api.bloc();
    vrai('la porte confirmée en v748 se lit', /v748/.test(h));
    const k = h.indexOf('Faire l’inventaire'); const b = h.slice(h.lastIndexOf('<button', k), k);
    v('⛔ l\'inventaire devient possible', / disabled/.test(b), false);
    await m.api.inventaire(null); await attendre();
    vrai('⛔ un inventaire refusé (incomplet, le complet conservé) le DIT, en rouge', /inventaire_incomplet_conserve/.test(m.api.bloc()) && /redText/.test(m.api.bloc()));
  }
  {
    const panne = { documents: { actif: false, erreur: 'montage' }, portail: { comptes: { actif: false, erreur: 'montage' }, dossiers: { actif: false, erreur: 'comptes' } } };
    const m = monter({ sante: panne, reponses, ver: { d: { minFirestore: 748 } } });
    m.api.bloc(); await attendre();
    const h = m.api.bloc();
    vrai('⛔ un module réglé et cassé au démarrage se dit EN PANNE — pas « éteint »', /EN PANNE/.test(h));
    const b1 = h.slice(h.lastIndexOf('<button', h.indexOf('Reprendre les dossiers du portail')), h.indexOf('Reprendre les dossiers du portail'));
    const b2 = h.slice(h.lastIndexOf('<button', h.indexOf('Faire l’inventaire')), h.indexOf('Faire l’inventaire'));
    v('   et les deux gestes sont fermés', [/ disabled/.test(b1), / disabled/.test(b2)], [true, true]);
  }
  {
    const m = monter({ santePanne: true, sante: null, reponses });
    m.api.bloc(); await attendre();
    vrai('⛔ /health injoignable : l\'écran le dit et propose de réessayer', /Serveur injoignable/.test(m.api.bloc()) && /réessayer/.test(m.api.bloc()));
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();

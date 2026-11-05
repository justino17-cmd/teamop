/* test-3265 — LA TOUR NE PROPOSE PLUS DE « ROUVRIR » UN ESPACE SUPPRIMÉ (v2.131, 5 novembre 2026).
 *
 * Justin, capture à l'appui : « Un espace existe déjà pour controle@teamop.fr » — « impossible car je l'ai supprimé ». `pbCreer`
 * (Accès → version publique) décidait « déjà là » sur la seule mémoire du navigateur (`tour_liens`), que la suppression totale
 * d'une entreprise ne vidait pas. Ce banc EXÉCUTE les vraies fonctions de tour.html (`pbCreer`, `pbEspaceVivant`,
 * `tourLiensOublier`) avec un faux serveur, un faux rangement et un faux `confirm`, et joue les trois réponses possibles :
 * l'espace vit (on demande, comme avant), il n'existe plus (on oublie et on crée un espace neuf), le serveur ne répond pas (on ne
 * décide rien : la question d'avant). */
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'tour.html'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
function extraire(sig) { const i = SRC.indexOf(sig); if (i < 0) return ''; let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } } return ''; }

(async () => {
  const fns = ['async function pbEspaceVivant(', 'function tourLiensOublier(', 'async function pbCreer('].map(extraire);
  vrai('les trois fonctions sont trouvées dans tour.html', fns.every(f => f.length > 100));
  const EMAIL = 'controle@exemple-qzw.fr', T = 'controle-qzwx';
  const monter = (serveur) => {
    const store = { tour_liens: JSON.stringify({ [EMAIL]: { t: T, k: 'cle-qzw', n: 'Ancien', a: 'admin', e: EMAIL }, 'autre@exemple-qzw.fr': { t: 'autre-qzwy', e: 'autre@exemple-qzw.fr' } }) };
    const notes = { confirm: [], espace: [], toast: [] };
    const bac = {
      PB: { nom: 'team op testeur', email: EMAIL, ident: 'testeur', pass: 'mdp-qzw-12' },
      localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, x) => { store[k] = String(x); } },
      apiGet: async (u) => { notes.api = u; if (serveur === 'muet') throw new Error('réseau'); return { entreprises: serveur === 'vivant' ? [{ t: T, email: EMAIL, dansAnnuaire: true }] : [{ t: 'autre-qzwy', email: 'autre@exemple-qzw.fr', dansAnnuaire: true }] }; },
      confirm: (m) => { notes.confirm.push(m.slice(0, 60)); return false; },
      tourEspaceDe: async (email, nom, ident, mdp, neuf) => { notes.espace.push({ email, neuf }); return null; },
      toast: (m) => notes.toast.push(m), JSON, Object, String, Array,
    };
    vm.createContext(bac); vm.runInContext(fns.join('\n'), bac);
    return { bac, store, notes };
  };

  console.log('\n── 3265 · 1. l’espace mémorisé a été supprimé : on oublie la trace et on crée un espace neuf ──');
  { const { bac, store, notes } = monter('supprime'); await bac.pbCreer(null);
    v('le serveur est interrogé (liste des entreprises)', notes.api, '/api/monitor/entreprises');
    v('aucune question « Un espace existe déjà »', notes.confirm.length, 0);
    v('tourEspaceDe est appelée pour un espace NEUF', notes.espace, [{ email: EMAIL, neuf: true }]);
    const reg = JSON.parse(store.tour_liens);
    v('la trace de l’espace supprimé est oubliée, celle d’une autre entreprise reste', Object.keys(reg), ['autre@exemple-qzw.fr']); }

  console.log('\n── 3265 · 2. l’espace vit encore : la question d’avant, et rien n’est touché si on annule ──');
  { const { bac, store, notes } = monter('vivant'); await bac.pbCreer(null);
    v('la Tour demande avant de rouvrir', notes.confirm.length, 1);
    vrai('… avec le message « Un espace existe déjà pour »', /Un espace existe déjà pour/.test(notes.confirm[0] || ''));
    v('« Annuler » : rien n’est créé', notes.espace.length, 0);
    v('… et la mémoire des liens est intacte', Object.keys(JSON.parse(store.tour_liens)).length, 2); }

  console.log('\n── 3265 · 3. serveur muet : on ne décide rien sur une réponse qu’on n’a pas eue ──');
  { const { bac, store, notes } = monter('muet'); await bac.pbCreer(null);
    v('la question d’avant est posée (pas d’espace neuf à l’aveugle)', [notes.confirm.length, notes.espace.length], [1, 0]);
    v('la mémoire des liens est intacte', Object.keys(JSON.parse(store.tour_liens)).length, 2); }

  console.log('\n── 3265 · 4. la suppression totale oublie aussi la trace de cet appareil ──');
  { const { bac, store } = monter('vivant');
    v('tourLiensOublier(t) retire les liens de cet espace, et eux seuls', [bac.tourLiensOublier(T, ''), Object.keys(JSON.parse(store.tour_liens))], [1, ['autre@exemple-qzw.fr']]); }
  const code = SRC.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
  vrai('le « fin » de la suppression totale appelle tourLiensOublier(t,\'\') juste après son message',
    /supprToast\(x, x\.d\.avertissement\?[^\n]*\n\s*tourLiensOublier\(t,''\);/.test(code));

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ' + e.stack); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });

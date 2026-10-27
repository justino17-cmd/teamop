/* 3084 — OÙ EN EST PAULINE, DANS LA TOUR (Tour v2.116). Justin, 27 octobre 2026, devant la bande « Today » du tableau de bord de Harvey (entreprises trouvées, sites lus,
   mails trouvés, adresses vérifiées, écrits, envoyés, réponses) : « oui mais dans la Tour ». Et le site de chaque entreprise dans la liste.
   Trois maillons, chacun joué pour de vrai :
     1. le script du Mac (`lire_avancement`, `site_de`) — joué par `tests/pauline-releve-test.py` (TestAvancement, lancé par test-3020) ;
     2. le serveur (`validerReleve`) — ici : `avancement` optionnel, chiffre par chiffre ; `site` = un nom de domaine, rien d'autre ;
     3. la Tour (`paAvancementHtml`, `paSite`, `paLigne`) — les VRAIES fonctions extraites : l'inconnu dit, les barres, le lien https:// sans rien de plus. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (!c && d ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
console.log('\n── 3084 · où en est Pauline, dans la Tour ──');

console.log('\n1. Le serveur');
const P = require(path.join(RACINE, 'server', 'pauline.js'));
const T = Date.parse('2026-10-27T12:00:00Z');
const base = () => ({ version: 1, genereLe: '2026-10-27T11:59:00Z', chauffe: { debut: '2026-10-27', jour: 0, plafondDuJour: 5 }, jour: { envoyes: 0, reponses: 0, refus: 0, enAttente: 0 }, recherches: [], entreprises: [], courriels: [], reponses: [] });
const AV = { entreprises: 315, avecSite: 153, sansSite: 162, sitesLus: 153, mailsCherches: 53, adresses: 4, verifiees: 1, risquees: 0, invalides: 0, aConfirmer: 3, ecrits: 0, aEcrire: 1, envoyes: 0, reponses: 0 };
const val = x => P.validerReleve(Object.assign(base(), x), T);
v('un avancement complet passe tel quel', val({ avancement: AV }).releve.avancement, AV);
v('⛔ sans avancement (script du Mac plus ancien) : il reste ABSENT, jamais inventé', 'avancement' in val({}).releve, false);
v('un chiffre illisible est écarté SEUL, une clé inconnue n’entre jamais', val({ avancement: { entreprises: 3, sitesLus: -1, adresses: 1.5, verifiees: '2', pirate: 9, reponses: 1 } }).releve.avancement, { entreprises: 3, reponses: 1 });
v('sans nombre d’entreprises, rien n’est gardé', 'avancement' in val({ avancement: { sitesLus: 3 } }).releve, false);
const ent = (site) => ({ id: 'c1', nom: 'Clim 17', ville: 'Saintes', metier: 'clim', etat: 'trouvee', majLe: '2026-10-27T10:00:00Z', site });
const s = x => val({ entreprises: [ent(x)] }).releve.entreprises[0].site;
v('un site au bon format passe', s('www.clim-17.fr'), 'www.clim-17.fr');
for (const m of ['https://clim17.fr', 'clim17.fr/contact', 'javascript:alert(1)', 'clim17.fr"><script>', 'CLIM17.FR', 'a..b.fr', 'localhost', 42, ''])
  v('⛔ refusé : ' + JSON.stringify(m), s(m), undefined);

console.log('\n2. La Tour : les VRAIES fonctions');
const SRC = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');
const fn = nom => { const i = SRC.indexOf('function ' + nom + '('); if (i < 0) return ''; let k = SRC.indexOf('{', i), n = 0; for (let j = k; j < SRC.length; j++) { if (SRC[j] === '{') n++; else if (SRC[j] === '}' && --n === 0) return SRC.slice(i, j + 1); } return ''; };
const reSite = (SRC.match(/var PA_RE_SITE=\/.*\/;/) || [''])[0];
const code = ['esc', 'paObj', 'paNb', 'paT', 'paMs', 'paUnite', 'paDepuis', 'paQuand', 'paMot', 'paNom', 'paPluriel', 'paAvancementHtml', 'paSite', 'paLigne'].map(fn);
vrai('(population) les fonctions et l’expression du site sont trouvées dans tour.html', code.every(c => c.length > 20) && reSite.length > 30, code.map(c => c.length).join(','));
const ctx = { PA_E_ENT: { trouvee: ['Trouvée', 'n'] }, PA: {} }; vm.createContext(ctx); vm.runInContext(reSite + '\n' + code.join('\n'), ctx);
const H = r => ctx.paAvancementHtml(r);
const etapes = h => [...h.matchAll(/<div class="pa-av-e" data-e="(\w+)"><div class="pa-av-h">([^<]*)<em>([^<]*)<\/em><\/div><div class="pa-av-b" aria-hidden="true"><i style="width:(\d+)%"><\/i><\/div>(?:<div class="pa-av-d">([^<]*)<\/div>)?/g)].map(m => [m[2], m[3], m[1], +m[4], m[5] || '']);
const plein = etapes(H(Object.assign(base(), { avancement: AV })));
v('les sept étapes de Harvey, dans son ordre, avec les chiffres de la capture de 21 h 28', plein.map(e => e[0] + ' ' + e[1]),
  ['Entreprises trouvées 315', 'Sites lus 153 / 153', 'Mails cherchés 53 / 153', 'Adresses vérifiées 1 / 4', 'Courriels écrits 0 / 1', 'Envoyés 0 / 0', 'Réponses 0']);
v('l’état de chaque étape (fait, partiel, en attente) et sa barre', plein.map(e => e[2] + ' ' + e[3]), ['fait 100', 'fait 100', 'partiel 35', 'partiel 25', 'attente 0', 'attente 0', 'attente 0']);
v('la phrase en français : les entreprises sans site sont dites ignorées', plein[1][4], '153 sur 153 lus · 162 entreprises sans site (ignorées)');
v('…les adresses trouvées', plein[2][4], '53 sur 153 cherchés · 4 adresses trouvées');
v('…le détail des vérifications (sans « 0 mauvaise » inutile)', plein[3][4], '1 vérifiée · 0 risquée · 3 pas encore confirmées');
v('…aucune réponse dite en clair', plein[6][4], 'Pas encore de réponse');
v('…aucun courriel écrit : dit pourquoi, sans renvoyer à une Messagerie vide', plein[4][4], 'Aucun encore : Pauline n’écrit qu’aux adresses vérifiées');
v('…le titre « Entreprises trouvées » n’est pas répété dessous', plein[0][4], '');
vrai('⛔ un relevé sans avancement le DIT (« pas encore lu »), jamais des zéros', /Pas encore lu/.test(H(base())) && !/pa-av-e/.test(H(base())));
const ancien = etapes(H(Object.assign(base(), { avancement: { entreprises: 5, adresses: 2, reponses: 0 } })));
v('⛔ un chiffre inconnu : l’étape qui en dépend n’est pas affichée (Harvey plus ancien)', ancien.map(e => e[0]), ['Entreprises trouvées', 'Réponses']);
const tout = etapes(H(Object.assign(base(), { avancement: Object.assign({}, AV, { mailsCherches: 153, aConfirmer: 0, verifiees: 4, ecrits: 4, aEcrire: 4, envoyes: 4, reponses: 2, invalides: 1 }) })));
v('tout fini : toutes les étapes à 100 %, et les mauvaises adresses dites', [tout.every(e => e[2] === 'fait' && e[3] === 100), tout[3][4]], [true, '4 vérifiées · 0 risquée · 0 pas encore confirmée · 1 mauvaise']);
v('…des courriels écrits : la Messagerie est nommée', tout[4][4], '4 courriels écrits · ceux à accepter t’attendent dans la Messagerie → Pauline');

console.log('\n3. Le site dans la liste des entreprises');
const L = x => ctx.paLigne('entreprises', Object.assign({ nom: 'Clim 17', ville: 'Saintes', metier: 'clim', etat: 'trouvee', majLe: '2026-10-27T10:00:00Z' }, x), 0, {});
vrai('le site paraît en lien https://, ouvert à part, sans référent', L({ site: 'www.clim-17.fr' }).includes('<a class="pa-site" href="https://www.clim-17.fr/" target="_blank" rel="noopener noreferrer nofollow">www.clim-17.fr</a>'), L({ site: 'www.clim-17.fr' }));
for (const m of ['javascript:alert(1)', 'x.fr"><img src=x onerror=alert(1)>', 'https://x.fr', 'X.FR'])
  vrai('⛔ la Tour revérifie : ' + JSON.stringify(m).slice(0, 40) + ' ne fait aucun lien', !/pa-site|onerror|javascript:/.test(L({ site: m })), L({ site: m }));
vrai('sans site : aucune trace de lien', !/<a /.test(L({})));

console.log('\n4. Câblage');
vrai('la fiche de Pauline montre l’avancement juste après « Ce qui t’attend »', /h\+=paAttentesHtml\(r\)\+paAvancementHtml\(r\);/.test(fn('agPaulineHtml')));
vrai('la Tour est en v2.116', /var TOUR_VERSION='v2\.116';/.test(SRC));

console.log('\ntest-3084 : ' + ok + ' ✓ ' + ko + ' ✗');
process.exit(ko ? 1 : 0);

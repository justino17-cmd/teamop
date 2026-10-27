/* 3078 — CE QUI T'ATTEND CHEZ PAULINE, EN FRANÇAIS DANS LA TOUR (Tour v2.114). Justin, 27 octobre 2026, devant le tableau de bord de Harvey : « c'est possible d'avoir
   le tableau de bord en français, parce que là c'est un peu compliqué ». Et ce jour-là, le vrai blocage était invisible : sans clé de vérification des adresses, Harvey
   n'écrit JAMAIS (dashboard.py : « found emails stay 'guess' and are never sent »).
   Trois maillons, chacun joué pour de vrai :
     1. le script du Mac (`outils/pauline-releve.py`, `lire_attentes`) — joué par `tests/pauline-releve-test.py` (lancé par test-3020) : la clé dite OUI/NON, jamais sa valeur ;
     2. le serveur (`validerReleve`, server/pauline.js) — ici : `attentes` optionnel, validé champ par champ, une partie mal formée écartée seule ;
     3. la Tour (`paAttentesHtml`, tour.html) — ici, la VRAIE fonction extraite : l'ordre (ce qui bloque d'abord), « inconnu » n'est pas « rien », tout est échappé.
   Rendu au navigateur (Mac 1440, iPhone 390, sans débordement) : scratchpad/sonde-pauline-attentes.js. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (!c && d ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
console.log('\n── 3078 · ce qui t’attend chez Pauline, en français ──');

console.log('\n1. Le serveur : `attentes` validé, optionnel');
const P = require(path.join(RACINE, 'server', 'pauline.js'));
const T = Date.parse('2026-10-27T12:00:00Z');
const base = () => ({ version: 1, genereLe: '2026-10-27T11:59:00Z', chauffe: { debut: '2026-10-27', jour: 0, plafondDuJour: 5 }, jour: { envoyes: 0, reponses: 0, refus: 0, enAttente: 1 }, recherches: [], entreprises: [], courriels: [], reponses: [] });
const avec = at => P.validerReleve(Object.assign(base(), { attentes: at }), T);
const bon = { verificateur: false, signaux: { proposes: 16, confirmes: 0, rejetes: 0, liste: [{ code: 'HAS_WEBSITE', libelle: 'Has a website', description: 'Own website' }] }, adresses: { verifiees: 0, risquees: 0, invalides: 0, aConfirmer: 2 } };
const r1 = avec(bon);
v('un relevé complet passe, attentes comprises', [r1.ok, r1.releve && r1.releve.attentes], [true, bon]);
const r0 = P.validerReleve(base(), T);
v('⛔ sans attentes (script du Mac plus ancien) : le relevé passe, et `attentes` reste ABSENT (inconnu), jamais inventé', [r0.ok, 'attentes' in r0.releve], [true, false]);
v('une clé inconnue n’entre jamais, une partie mal formée est écartée SEULE', avec({ verificateur: 'oui', pirate: 1, signaux: { proposes: -1, confirmes: 0, rejetes: 0, liste: [] }, adresses: { verifiees: 1, risquees: 0, invalides: 0, aConfirmer: 3 } }).releve.attentes, { adresses: { verifiees: 1, risquees: 0, invalides: 0, aConfirmer: 3 } });
const long = avec({ signaux: { proposes: 50, confirmes: 0, rejetes: 0, liste: Array.from({ length: 60 }, (_, i) => ({ code: 'C' + i, libelle: 'x'.repeat(500), description: '' })) } }).releve.attentes.signaux.liste;
v('la liste des critères est bornée (40) et chaque libellé coupé (120)', [long.length, long[0].libelle.length], [40, 120]);
v('un critère sans code est jeté ; sans libellé, il prend son code', avec({ signaux: { proposes: 2, confirmes: 0, rejetes: 0, liste: [{ libelle: 'sans code' }, { code: 'K1', libelle: '', description: '' }] } }).releve.attentes.signaux.liste, [{ code: 'K1', libelle: 'K1', description: '' }]);

console.log('\n2. La Tour : la VRAIE `paAttentesHtml`');
const SRC = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');
const fn = nom => { const i = SRC.indexOf('function ' + nom + '('); if (i < 0) return ''; let k = SRC.indexOf('{', i), n = 0; for (let j = k; j < SRC.length; j++) { if (SRC[j] === '{') n++; else if (SRC[j] === '}' && --n === 0) return SRC.slice(i, j + 1); } return ''; };
const code = ['esc', 'paObj', 'paNb', 'paT', 'paAttentesHtml'].map(fn);
vrai('(population) les cinq fonctions sont trouvées dans tour.html', code.every(c => c.length > 20), code.map(c => c.length).join(','));
const ctx = {}; vm.createContext(ctx); vm.runInContext(code.join('\n'), ctx);
const H = r => ctx.paAttentesHtml(r);
const titres = h => [...h.matchAll(/<div class="pa-att-l" data-g="(\w+)"><i aria-hidden="true"><\/i><div><b>([^<]*)<\/b>/g)].map(m => m[1] + ' · ' + m[2]);
const plein = Object.assign(base(), { attentes: bon });
v('⛔ dans l’ORDRE où ça bloque : la clé (rouge), les critères, les adresses (rouges tant que la clé manque), les courriels', titres(H(plein)),
  ['bloque · Clé de vérification des adresses : manquante', 'faire · 16 critères à valider', 'bloque · 2 adresses à vérifier', 'faire · 1 courriel à accepter']);
vrai('…et dit OÙ cliquer dans Harvey, en français (Settings, Signals, Outbox), avec le service gratuit à prendre', /Harvey → <b>Settings<\/b>/.test(H(plein)) && /Harvey → <b>Signals<\/b>/.test(H(plein)) && /Harvey → <b>Outbox<\/b>/.test(H(plein)) && /reoon\.com/.test(H(plein)));
vrai('…et rappelle de ne jamais coller la clé ailleurs', /Ne la colle jamais ailleurs/.test(H(plein)));
v('la clé posée : plus de rouge, les adresses « au fil de la journée »', titres(H(Object.assign(base(), { attentes: Object.assign({}, bon, { verificateur: true }) }))),
  ['faire · 16 critères à valider', 'faire · 2 adresses à vérifier', 'faire · 1 courriel à accepter']);
const rien = Object.assign(base(), { jour: { envoyes: 0, reponses: 0, refus: 0, enAttente: 0 }, attentes: { verificateur: true, signaux: { proposes: 0, confirmes: 8, rejetes: 2, liste: [] }, adresses: { verifiees: 3, risquees: 0, invalides: 0, aConfirmer: 0 } } });
v('tout est fait : « Rien ne t’attend »', titres(H(rien)), ['ok · Rien ne t’attend']);
v('⛔ « inconnu » n’est PAS « rien » : un relevé sans attentes dit « Pas encore lu », jamais « Rien ne t’attend »', [/Pas encore lu/.test(H(base())), /Rien ne t’attend/.test(H(base()))], [true, false]);
v('⛔ verificateur ABSENT (pas de .env lu) : on ne crie pas une clé manquante qu’on n’a pas regardée', titres(H(Object.assign(base(), { attentes: { signaux: bon.signaux } }))), ['faire · 16 critères à valider', 'faire · 1 courriel à accepter']);
const piege = Object.assign(base(), { attentes: { verificateur: true, signaux: { proposes: 1, confirmes: 0, rejetes: 0, liste: [{ code: 'X', libelle: '<img src=x onerror=alert(1)>', description: '"><script>z()</script>' }] } } });
vrai('⛔ un libellé de Harvey est une DONNÉE : échappé (aucune balise ne passe)', !/<img|<script/.test(H(piege)) && /&lt;img/.test(H(piege)), H(piege).slice(0, 300));
vrai('le lien mène au tableau de bord LOCAL du Mac (jamais un jeton dans la Tour)', /href="http:\/\/127\.0\.0\.1:5555\/"/.test(H(plein)) && !/token/.test(H(plein)));
const ag = fn('agPaulineHtml');
vrai('la carte de Pauline l’affiche, avant les chiffres du jour', ag.indexOf('paAttentesHtml(r)') > 0 && ag.indexOf('paAttentesHtml(r)') < ag.indexOf("'<p class=\"pa-ligne\">'+ch"), ag.slice(0, 200));
vrai('la version de la Tour est montée (v2.114) aux quatre endroits', (SRC.match(/v2\.114/g) || []).length >= 4);

console.log(`\ntest-3078 : ${ok} ✓ ${ko} ✗`);
process.exit(ko ? 1 : 0);

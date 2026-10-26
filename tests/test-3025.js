/* 3025 — FACTURATION DANS LA TOUR : DES VALEURS LONGUES NE CASSENT PLUS L'ÉCRAN (v2.112, 26 octobre 2026).
   Justin : « dans la Tour, dans Facturation, problème d'affichage ». Relevé au navigateur (360 et 390 px, jour et nuit, API simulée aux formes de `stripePaiement`, noms de 60 à 90 signes,
   montants à 5 chiffres, 50 factures) — trois défauts RÉELS, aucun au bureau :
     1. une tuile « Encaissé ce mois » dont le montant (« 665 081,35 € ») dépassait de sa tuile (22 px à 360 px) : la taille était figée à 23 px ;
     2. des rangées où la pastille « en attente » et le montant laissaient 3 lettres au nom (« Éta… ») : sur un téléphone, un nom coupé n'est plus un nom ;
     3. un titre de groupe (« Encaissé en octobre 2026 · 665 081,35 € ») dont le compte tombait sur une 3ᵉ ligne.
   Ce banc EXÉCUTE la vraie `vueFacturation` (rangées : date, nom, pastille, montant — l'ordre que la grille nomme ; valeurs hostiles échappées ; listes vides) et lit le CSS livré (commentaires retirés) pour les
   règles qui répondent aux trois défauts. La mesure au navigateur (`scratchpad/sonde-factu.js`) est la preuve de bout en bout : 0 tuile qui dépasse, 0 nom coupé à trois lettres. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? ' — ' + String(typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 300) : '')); } };
console.log('── test-3025 : Facturation, valeurs longues ──');
const BRUT = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');
const CODE = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const CSS = BRUT.replace(/\/\*[\s\S]*?\*\//g, ' ');
function corps(entete) {
  const i = CODE.indexOf(entete); if (i < 0) return '';
  let k = CODE.indexOf('{', i), prof = 0, prev = '';
  for (; k < CODE.length; k++) {
    const c = CODE[k], n = CODE[k + 1];
    if (c === '/' && n === '/') { k = CODE.indexOf('\n', k) - 1; continue; }
    if (c === '/' && n === '*') { k = CODE.indexOf('*/', k + 2) + 1; continue; }
    if (c === "'" || c === '"' || c === '`') { const q = c; for (k++; k < CODE.length; k++) { if (CODE[k] === '\\') { k++; continue; } if (CODE[k] === q) break; } prev = 'x'; continue; }
    if (c === '/' && /[(,=:\[!&|?{};]/.test(prev)) { let cl = false; for (k++; k < CODE.length; k++) { const d = CODE[k]; if (d === '\\') { k++; continue; } if (d === '[') cl = true; else if (d === ']') cl = false; else if (d === '/' && !cl) break; } prev = 'x'; continue; }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) return CODE.slice(i, k + 1); }
    if (!/\s/.test(c)) prev = c;
  }
  return '';
}
const fonction = nom => corps('\nfunction ' + nom + '(').trim();
const ESC = (/\nfunction esc\(s\)\{.*\n/.exec(CODE) || [''])[0];
const JSQ = fonction('jsq');
const FNS = ['factMois', 'factLigne', 'abnGroupe', 'vueFacturation', 'fmtEur', 'fmtJour', 'fmtDate', 'paieOk', 'paieEchec'];
const FN = FNS.map(fonction);
vrai('(population) les fonctions de la page sont trouvées', FN.every(f => f.length > 30) && ESC.length > 20 && JSQ.length > 10, FNS.filter((n, i) => FN[i].length <= 30).join(','));
const bac = { JSON, Date, Intl, String, Array, Math, Object, Number, Promise, Error,
  ABO: { loaded: true, err: '', configured: true, paiements: [], echecs: 0, stripeErr: '', videFaute: false }, enTete: t => '<h1>' + t + '</h1>', acSquel: () => '<sq>', acErr: t => '<err>' + t, videTour: t => '<vide>' + t + '</vide>', svg: () => '' };
vm.createContext(bac);
vm.runInContext(ESC + '\n' + JSQ + '\n' + FN.join('\n') + '\n' + FNS.concat(['esc']).map(n => 'this.' + n + '=' + n + ';').join(''), bac);
const now = Date.now(), J = 86400000, mois0 = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 5).getTime();
const LONG = 'Société de Dératisation et de Désinsectorisation du Littoral Atlantique et Associés';
const paie = (o) => Object.assign({ id: 'in_x', clientNom: 'Lacoste', clientEmail: '', montant: 129, date: mois0, statut: 'paye', url: 'https://invoice.stripe.com/i/x' }, o);
bac.ABO.paiements = [paie({ clientNom: LONG, montant: 99999 }), paie({ clientNom: '', clientEmail: 'direction.generale.et.administration@societe-de-nettoyage-industriel.example', montant: 12345.67, url: '' }),
  paie({ statut: 'ouvert', clientNom: LONG, montant: 15900.4, date: now - J }), paie({ statut: 'echec', clientNom: '<img src=x onerror=alert(1)>', montant: 129, date: now - 2 * J })];
const H = bac.vueFacturation();
const rangees = [...H.matchAll(/<button type="button" class="abn-j[^"]*"[\s\S]*?<\/button>/g)].map(m => m[0]);
vrai('(population) quatre rangées de facture sont dessinées', rangees.length === 4, rangees.length);
vrai('chaque rangée garde l’ordre date · nom · (pastille) · montant — les zones de la grille (d, q, past, m) sont ses classes', rangees.every(r => /<span class="d">[^<]*<\/span><span class="q">[\s\S]*?<\/span>(<span class="past [a-z-]+">[^<]*<\/span>)?<span class="m">[^<]*<\/span><\/button>$/.test(r)), rangees[0]);
const rl = (re) => rangees.filter(r => re.test(r))[0] || '';
vrai('un nom de 85 signes est écrit EN ENTIER dans la rangée (le CSS le tronquera ou le repliera, jamais le HTML)', rl(/99\s?999/).indexOf(LONG) > 0);
vrai('un client sans nom : son adresse, en texte', /<span class="q">direction\.generale\.et\.administration@/.test(rl(/12\s?345/)) && !/mailto:|<a[ >]/.test(rl(/12\s?345/)));
vrai('un montant à 5 chiffres s’écrit avec ses espaces et son signe', /<span class="m">99\s?999 €<\/span>/.test(rl(/99\s?999/)) && /12\s?345,67 €/.test(rl(/12\s?345/)));
vrai('⛔ une facture sans lien Stripe n’est pas un bouton qui promet quelque chose (classe « mort », aucun onclick)', /class="abn-j mort"/.test(rl(/12\s?345/)) && !/onclick/.test(rl(/12\s?345/)));
vrai('⛔ un nom hostile est échappé', !/<img src=x/.test(H) && /&lt;img src=x onerror=alert\(1\)&gt;/.test(H));
vrai('les groupes de la page de Facturation portent « abn-f » (le titre long se règle sur eux seuls)', /<div class="reg abn-f"/.test(H) && (H.match(/<div class="reg-g">/g) || []).length >= 2);
bac.ABO.paiements = []; vrai('aucune facture : l’état vide, jamais une liste vide', /<vide>Aucune facture pour l’instant/.test(bac.vueFacturation()));
bac.ABO.configured = false; vrai('Stripe non relié : le dit', /<vide>Stripe n’est pas relié/.test(bac.vueFacturation())); bac.ABO.configured = true;

/* le CSS livré : les règles qui répondent aux trois défauts */
const i640 = CSS.indexOf('.abn-kpi{grid-template-columns:1fr 1fr;gap:10px}'), bloc640 = i640 < 0 ? '' : CSS.slice(i640, CSS.indexOf('\n}', i640));
vrai('(population) le bloc « téléphone » des tuiles et rangées de Facturation est trouvé', bloc640.length > 200 && /\.abn-j/.test(bloc640), bloc640.length);
vrai('défaut 1 : le chiffre d’une tuile suit la largeur de SA tuile (conteneur + cqw) — au téléphone comme au bureau', /\.abn-kpi \.kpi\{container-type:inline-size\}/.test(CSS) && /\.abn-kpi \.kpi \.n\{font-size:clamp\(17px,12\.5cqw,30px\)\}/.test(CSS) && /\.abn-kpi \.kpi \.n\{font-size:clamp\(16px,13\.5cqw,23px\)\}/.test(bloc640));
vrai('défaut 2 : au téléphone, une rangée = deux lignes (nom + montant, date + pastille), le nom jusqu’à deux lignes, un nom sans espace se coupe', /\.abn-j\{display:grid;grid-template-columns:minmax\(0,1fr\) auto;grid-template-areas:"q m" "d p"/.test(bloc640) && /\.abn-j \.q\{grid-area:q;white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;[^}]*overflow-wrap:anywhere\}/.test(bloc640) && /\.abn-j \.m\{grid-area:m;/.test(bloc640) && /\.abn-j \.d\{grid-area:d;/.test(bloc640) && /\.abn-j \.past\{grid-area:p;/.test(bloc640));
vrai('défaut 3 : le titre d’un groupe de Facturation prend la place restante (le compte reste sur sa ligne)', /\.abn-f \.reg-tete \.reg-nom\{flex:1 1 0;min-width:0\}/.test(CSS));
vrai('le bureau garde ses rangées sur une ligne (la règle de grille n’existe QUE dans le bloc téléphone)', (CSS.match(/grid-template-areas:"q m" "d p"/g) || []).length === 1 && /\.abn-j\{display:flex;align-items:center;gap:12px;width:100%;min-height:44px/.test(CSS));
console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);

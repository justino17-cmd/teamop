/* test-3251 — LE TEXTE D'UN DEVIS NE SE COUPE PLUS (v798 bêta, 4 novembre 2026).
 *
 * Un client, capture du PDF de son devis à l'appui : le bloc « DÉTAIL » finissait chaque ligne longue par « … »
 * (« Technologie Inverter : adapte automatiquement la puissance en fonction des besoins afin de mainte… »). Justin :
 * « c'est pas normal que même nous on ne puisse pas le voir en entier ». Cause : `cut(line,100)` et `.slice(0,6)` dans
 * `docPdfStr`. Le DÉTAIL passe désormais à la ligne (par `_pdfEnLignes`, qui mesure avec `_pdfLarg`), garde le retrait
 * de sa puce, grandit, et continue sur la page suivante. Même traitement pour les coordonnées du client, les conditions
 * (l'IBAN d'une facture) et la désignation (plus de plafond à six lignes).
 *
 * Ce banc EXÉCUTE la vraie `docPdfStr` et relit le PDF produit (les flux ne sont pas compressés : le texte s'y lit).
 * APP=<chemin> le fait tourner contre un autre app.html (le patch de production) ; MUTER=1 remet `cut(line,100)`. */
const fs = require('fs'), path = require('path'), vm = require('vm');
let APP = fs.readFileSync(process.env.APP || path.join(__dirname, '..', 'app.html'), 'utf8');
if (process.env.MUTER === '1') {
  const a = "_pdfEnLignes(corps,8.8,0,maxW-ind).forEach((t,k)=>rows.push({x:k?ind:0,t:(k?'':pre)+t}));";
  if (!APP.includes(a)) { console.log('  ✗ mutation introuvable'); process.exit(1); }
  APP = APP.replace(a, "rows.push({x:0,t:pre+(corps.length>100?corps.slice(0,99)+'…':corps)});");
}
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };
function decoupe(h) { const d = APP.indexOf(h); if (d < 0) return '';
  const suite = /\n(?=(?:function |const |let |var |class |async function |\/\* |views\.|document\.|window\.|try\{))/g;
  suite.lastIndex = d + h.length;
  const m = suite.exec(APP); let bout = APP.slice(d, m ? m.index : Math.min(APP.length, d + 80000));
  for (;;) { const k = Math.max(bout.lastIndexOf('}'), bout.lastIndexOf(';')); if (k < 0) break;
    const t = bout.slice(0, k + 1); try { new Function(t); return t; } catch (e) { bout = bout.slice(0, k); } }
  return ''; }
const FN = ['const isoDe =', 'const DOC_COULEUR_DEFAUT=', 'function docCouleurEnt(', 'function docCachetPour(', 'function socNom(', 'function rapportSociete(',
  'function docEntete(', 'function docCoordLignes(', 'function socStyle(', 'function entSocUnique(', 'function entSocietes(', 'function entNom(', 'function entNomDoc(',
  'function _pdfTranslit(', 'function _pdfTxt(', 'const _PDF_L=', 'function _pdfLarg(', 'function _pdfCoupe(', 'function _pdfEnLignes(', 'function docPdfStr(', 'function devisPdfStr('];
const code = FN.map(decoupe);
vrai('la fabrique et ses aides sont trouvées dans le fichier', code[FN.indexOf('function docPdfStr(')].length > 2000 && code[FN.indexOf('function _pdfEnLignes(')].length > 100);

const DETAIL = [
  '• Chaud et froid : rafraîchissement en été et chauffage en hiver grâce à la technologie réversible.',
  '• Technologie Inverter : adapte automatiquement la puissance en fonction des besoins afin de maintenir une température stable tout en réduisant la consommation d’électricité.',
  '• Pilotage à distance',
  '• Fluide frigorigène R32 : contribue à réduire l’impact environnemental par rapport aux anciens fluides, avec un meilleur rendement énergétique.',
  '• Fonctionnement silencieux : idéal pour une chambre, un bureau ou une pièce de vie.',
  '• Confort au quotidien : ' + 'plusieurs modes de fonctionnement permettent d’adapter facilement l’appareil à chaque saison et à chaque usage, '.repeat(4) + 'FINZORQ.'];
const W = { console, Object, JSON, String, Math, Date, Array, Number, Uint8Array, Set, atob: s => Buffer.from(s, 'base64').toString('latin1') };
W.db = { entreprise: { nom: 'Clim Banc', adresse: '1 rue du Banc', cp: '17000', ville: 'La Rochelle', siret: '11111111100011', iban: 'FR76 3000 6000 0112 3456 7890 189', bic: 'AGRIFRPP' },
  societes: [], societesStyle: {}, interventions: [],
  clients: [{ id: 'c1', nom: 'Mme Banc', adresse: '12 allée des Tilleuls, résidence Les Hauts du Parc, bâtiment C, escalier 4, appartement 312', cp: '17220', ville: 'Salles-sur-Mer', email: 'mme.banc.tres.longue.adresse@exemple-de-domaine-long.fr', tel: '0600000000' }] };
vm.createContext(W);
vm.runInContext(code.join('\n') + `
  function todayISO(){ return '2026-11-04'; } function encreSur(){ return '#fff'; }
  const ligTotLigne=l=>Math.round((Number(l.qte)||0)*(Number(l.pu)||0)*100)/100;`, W);
const dv = (notes, lignes) => ({ id: 'd1', num: 'DV-1', clientId: 'c1', date: '2026-11-04', tva: 0, notes, lignes: lignes || [{ designation: 'Climatiseur mural 3,5 kW', qte: 1, pu: 1255 }] });
/* le texte écrit dans le PDF : les opérandes de Tj, déséchappés */
const textes = pdf => [...pdf.matchAll(/([\d.\-]+) ([\d.\-]+) Td\s*\(((?:\\.|[^\\)])*)\) Tj/g)].map(m => ({ x: +m[1], y: +m[2], t: m[3].replace(/\\([()\\])/g, '$1').replace(/\\([0-7]{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8))) }));
const mots = s => W._pdfTranslit(s).replace(/[•…]/g, ' ').split(/\s+/).filter(m => m.length > 1);

console.log('\n── 3251 · 1. le DÉTAIL du devis, entier ──');
const pdf = W.docPdfStr('devis', dv(DETAIL.join('\n')), null), T = textes(pdf), tout = T.map(x => x.t).join(' ');
vrai('aucun « … » dans le PDF (ni le caractère, ni sa traduction WinAnsi)', !/…|\\205|\x85/.test(pdf));
const dec = t => t.replace(/\\([()\\])/g, '$1').replace(/\\([0-7]{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));
const manquants = mots(DETAIL.join(' ')).filter(m => !tout.includes(dec(W._pdfTxt(m))));
vrai('chaque mot du DÉTAIL est dans le PDF, la fin de la ligne de 400 signes comprise (FINZORQ)', manquants.length === 0 && tout.includes('FINZORQ'), manquants.slice(0, 8));
vrai('la ligne de 400 signes fait bien plus de 400 signes', DETAIL[5].length > 400);
const LARG = 595 - 42, deb = T.findIndex(x => /^D.TAIL$/.test(x.t));
const corpsDet = T.slice(deb + 1).filter(x => x.x > 42 && x.x < 100 && !/^(Devis valable|TVA non|Bon pour|Date et)/.test(x.t));
const debord = corpsDet.filter(x => x.x + W._pdfLarg(x.t, 8.8, 0) > LARG + 0.5);
vrai('aucune ligne du DÉTAIL ne dépasse la marge droite (mesurée par _pdfLarg)', corpsDet.length >= 8 && debord.length === 0, debord.map(x => x.t).slice(0, 3));
const puce = x => /^[\x95•·\-]/.test(x.t), p0 = corpsDet.find(puce), suite = corpsDet.filter(x => !puce(x));
vrai('les lignes de suite sont en retrait sous la puce', !!p0 && suite.length > 0 && suite.every(x => x.x > p0.x + 2), { p0: p0 && p0.x, suite: suite.map(x => x.x).slice(0, 4) });

console.log('\n── 3251 · 2. un DÉTAIL énorme : une page de plus, rien de perdu ──');
const gros = Array.from({ length: 90 }, (_, i) => '• Point ' + (i + 1) + ' : explication détaillée du poste numéro ' + (i + 1) + ' MOTFIN' + (i + 1));
const pdf2 = W.docPdfStr('devis', dv(gros.join('\n'))), T2 = textes(pdf2).map(x => x.t).join(' ');
const pages = (pdf2.match(/\/Type \/Page\b/g) || []).length;
vrai('le devis passe sur plusieurs pages', pages >= 2, pages);
vrai('les 90 lignes sont toutes là, la dernière comprise', gros.every((g, i) => T2.includes('MOTFIN' + (i + 1) + ' ') || T2.endsWith('MOTFIN' + (i + 1)) || T2.includes('MOTFIN' + (i + 1))) && T2.includes('MOTFIN90'));
vrai('la suite dit qu’elle est la suite', T2.includes('(SUITE)'));

console.log('\n── 3251 · 3. le client, les conditions, la désignation ──');
vrai('l’adresse longue du client est entière (plus de cut à 70)', tout.includes('appartement 312'));
vrai('l’e-mail long du client est entier', tout.includes('exemple-de-domaine-long.fr'));
const fact = W.docPdfStr('factures', Object.assign(dv(''), { num: 'FA-1', statut: 'envoyee' })), TF = textes(fact).map(x => x.t).join(' ');
vrai('facture : l’IBAN et le BIC sont entiers (plus de cut à 118)', TF.includes('FR76 3000 6000 0112 3456 7890 189') && TF.includes('AGRIFRPP'));
const longue = 'Fourniture et pose ' + 'd’un ensemble complet de climatisation réversible avec liaisons frigorifiques, '.repeat(6) + 'DERNIERMOT';
const pdf3 = W.docPdfStr('devis', dv('', [{ designation: longue, qte: 1, pu: 10 }])), T3 = textes(pdf3).map(x => x.t).join(' ');
vrai('une désignation de plus de six lignes est entière (DERNIERMOT)', T3.includes('DERNIERMOT') && !/…|\\205/.test(pdf3));

console.log('\n── 3251 · 4. les devis et factures DÉJÀ faits : l’aperçu les refait entiers ──');
/* Justin : « que ce soit corrigé aussi sur les devis et factures déjà faits ». Aucun PDF n'est figé dans la base : l'aperçu
   (pdfDoc → docPdfChaine), le téléchargement et l'envoi refont le PDF depuis les DONNÉES à chaque fois. Un document créé
   avant le correctif — forme d'avant, sans aucun champ neuf — sort donc entier dès la mise à jour, sans le refaire. */
const SRCA = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
vrai('aucun PDF n’est rangé dans un document (pas de pdfB64, pdf figé…)', !/\b(?:d|f|doc|fac|dv)\.(?:pdf|pdfB64|pdf64|pdfFige)\s*=/.test(SRCA));
vrai('l’aperçu refait le PDF depuis les données (pdfDoc → docPdfChaine)', /function pdfDoc\([\s\S]{0,400}fabrique:async\(\)=>\(\{pdf:await docPdfChaine\(kind,d\)\}\)/.test(SRCA));
const ancien = { id: 'old', num: 'DV-2025-007', clientId: 'c1', date: '2025-06-01', notes: DETAIL.join('\n'), lignes: [{ designation: 'Pose', qte: 1, pu: 100 }] };   // ni tva, ni statut, ni rapportModele
const TA = textes(W.docPdfStr('devis', ancien, null)).map(x => x.t).join(' ');
vrai('un devis d’AVANT (forme ancienne) rouvert en aperçu : son DÉTAIL est entier', TA.includes('FINZORQ') && TA.includes('maintenir une temp'));
const emise = Object.assign({}, ancien, { id: 'fe', num: 'FA-2025-003', statut: 'envoyee', tva: 0 });
const TE = textes(W.docPdfStr('factures', emise, null)).map(x => x.t).join(' ');
vrai('une facture déjà émise : même numéro, même date, DÉTAIL entier', TE.includes('FA-2025-003') && TE.includes('FINZORQ'));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);

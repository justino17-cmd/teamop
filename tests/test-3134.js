/* ══ test-3134 — FACTUR-X : LA FACTURE ÉLECTRONIQUE D'OP GESTION (bêta v779, 28 octobre 2026) ══════════════════════════════════
   Justin : « tu fais tout », dont Factur-X. Ce banc EXÉCUTE les vraies fonctions d'app.html (tests/outils-facturx.js : docTot,
   docPdfStr, docEntete, tout le bloc Factur-X) et contrôle ce qui sort — il ne relit pas un texte qui parle du résultat.

   ⛔ CE QUE CE BANC PROUVE, ET CE QU'IL NE PROUVE PAS (la règle de ce dépôt : on le dit).
   PROUVÉ ICI :
     · les montants : docTot compte en centimes entiers ; ht + tva = ttc, à l'entier, sur une grille de 15 000 cas ; l'écran, le PDF
       et le XML disent la même chose au centime ;
     · le XML CII : bien formé, ORDRE et CARDINALITÉ des éléments conformes au schéma UN/CEFACT CII 100.D16B (tests/facturx/cii-d16b.json,
       extrait du jar de Mustang) — et, quand `xmllint` est là, le VRAI .xsd ; les règles métier d'EN 16931 (BR-CO-10 à 17, BR-S, BR-E,
       BR-DEC, BR-CO-26, BR-61…) relues dans le Schematron Factur-X 1.09.2 et REJOUÉES ICI à la main ; les codes (type de document, moyens
       de paiement, VATEX, exigibilité…) contre FACTUR-X_EN16931_codedb.xml (tests/facturx/codes.json) ;
     · le PDF : table des références exacte, polices TrueType incorporées (lues octet par octet : tables, cmap, largeurs = celles du
       sous-ensemble ET celles de `_PDF_L`), profil de couleur, XMP (avec la déclaration du schéma Factur-X), pièce jointe == XML ;
     · sans `fx`, un devis et une facture sortent OCTET POUR OCTET comme avant (empreintes calculées sur le code d'avant).
   ⛔ PAS PROUVÉ — et jamais écrit « conforme » à l'écran : la validation PDF/A-3 par veraPDF et la validation par le Schematron
   EXÉCUTÉ (Mustang). Le jar de Mustang a été téléchargé ; son exécution a été REFUSÉE par le système de permissions (« code venant de
   l'extérieur »), et rien n'a été contourné. Les règles ci-dessus sont des règles LUES, pas le moteur. À jouer dès que Justin
   autorise : `java -jar Mustang-CLI-2.26.0.jar --action validate --source facture.pdf` (REPRISE.md).
   Mutations : scratchpad/mutations-facturx.py. */
'use strict';
process.env.TZ = 'Europe/Paris';   // le changement d'heure d'octobre est un cas de test (l'échéance), pas un hasard de la machine
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto'), cp = require('child_process');
const O = require('./outils-facturx.js');
const APP = O.APP;
const SCHEMA = JSON.parse(fs.readFileSync(path.join(__dirname, 'facturx', 'cii-d16b.json'), 'utf8'));
const CODES = JSON.parse(fs.readFileSync(path.join(__dirname, 'facturx', 'codes.json'), 'utf8'));
const SRC = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');   // le code, sans les commentaires qui le décrivent

let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + String(typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 400) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), '« ' + JSON.stringify(a) + ' » au lieu de « ' + JSON.stringify(b) + ' »');
const titre = s => console.log('\n── ' + s + ' ──');

/* ───────────── les petits outils : analyseur XML, lecteur TrueType, lecteur PDF ───────────── */
function analyserXml(xml) {   // lève sur tout ce qui n'est pas bien formé ; rend l'arbre {nom, attrs, enfants, texte}
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(xml)) throw new Error('caractère de contrôle interdit en XML 1.0');
  let i = 0; const pile = []; let racine = null;
  const decode = s => s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (m, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[e] || String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1))));
  if (xml.startsWith('<?xml')) i = xml.indexOf('?>') + 2;
  while (i < xml.length) {
    if (xml[i] === '<') {
      if (xml.startsWith('<!--', i)) { i = xml.indexOf('-->', i) + 3; continue; }
      if (xml[i + 1] === '/') { const j = xml.indexOf('>', i), nom = xml.slice(i + 2, j).trim(); const n = pile.pop();
        if (!n || n.nom !== nom) throw new Error('balise fermante inattendue : ' + nom); if (!pile.length) racine = n; i = j + 1; continue; }
      const j = xml.indexOf('>', i); let corps = xml.slice(i + 1, j); const auto = corps.endsWith('/'); if (auto) corps = corps.slice(0, -1);
      const m = /^([\w.:-]+)((?:\s+[\w.:-]+="[^"<]*")*)\s*$/.exec(corps); if (!m) throw new Error('balise mal formée : ' + corps.slice(0, 60));
      const attrs = {}; for (const a of m[2].matchAll(/([\w.:-]+)="([^"]*)"/g)) attrs[a[1]] = decode(a[2]);
      const n = { nom: m[1], attrs, enfants: [], texte: '' };
      if (pile.length) pile[pile.length - 1].enfants.push(n); else if (racine) throw new Error('deux racines');
      if (auto) { if (!pile.length) racine = n; } else pile.push(n);
      i = j + 1;
    } else { const j = xml.indexOf('<', i), t = xml.slice(i, j < 0 ? xml.length : j);
      if (/&(?!(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);)/.test(t)) throw new Error('& non échappé');
      if (pile.length) pile[pile.length - 1].texte += decode(t); else if (t.trim()) throw new Error('texte hors racine'); i = j < 0 ? xml.length : j; }
  }
  if (pile.length) throw new Error('balise non fermée : ' + pile[pile.length - 1].nom);
  return racine; }
const trouver = (n, chemin) => { let cur = [n]; for (const p of chemin.split('/')) cur = cur.flatMap(x => x.enfants.filter(e => e.nom === p)); return cur; };
const texteDe = (n, chemin) => { const r = trouver(n, chemin); return r.length ? r[0].texte : undefined; };

/* contrôle d'ordre et de cardinalité contre le schéma CII D16B (séquences) */
function verifierSchema(noeud, typeNom, chemin, erreurs) {
  const dec = SCHEMA.types[typeNom];
  if (!dec) {   // type feuille, ou type de données (udt) : on ne contrôle que la date
    if (typeNom === 'udt:DateTimeType') { const e = noeud.enfants; if (e.length !== 1 || e[0].nom !== 'udt:DateTimeString' || e[0].attrs.format !== '102' || !/^\d{8}$/.test(e[0].texte)) erreurs.push(chemin + ' : date mal formée'); }
    else if (noeud.enfants.length) erreurs.push(chemin + ' : ' + noeud.nom + ' ne devrait pas avoir d\'enfants');
    return; }
  const pref = typeNom.split(':')[0]; let pos = 0; const vus = {};
  for (const e of noeud.enfants) {
    let k = -1; for (let j = pos; j < dec.length; j++) { const q = dec[j][0].includes(':') ? dec[j][0] : pref + ':' + dec[j][0]; if (q === e.nom) { k = j; break; } }
    if (k < 0) { const q = dec.findIndex(d => (d[0].includes(':') ? d[0] : pref + ':' + d[0]) === e.nom);
      erreurs.push(chemin + ' : ' + e.nom + (q >= 0 ? ' est mal placé (ordre du schéma)' : ' n\'existe pas ici')); continue; }
    pos = k; vus[k] = (vus[k] || 0) + 1;
    if (dec[k][3] !== -1 && vus[k] > dec[k][3]) erreurs.push(chemin + ' : ' + e.nom + ' est répété trop de fois');
    verifierSchema(e, dec[k][1], chemin + '/' + e.nom, erreurs);
  }
  dec.forEach((d, j) => { if (d[2] > 0 && !vus[j]) erreurs.push(chemin + ' : ' + (d[0].includes(':') ? d[0] : pref + ':' + d[0]) + ' manque'); }); }

/* les règles EN 16931 du Schematron Factur-X 1.09.2 (FACTUR-X_EN16931.sch), rejouées à la main — chaque identifiant est celui de la règle */
function reglesMetier(racine) {
  const E = [], r = (id, c, d) => { if (!c) E.push(id + (d ? ' : ' + d : '')); };
  const T = trouver(racine, 'rsm:SupplyChainTradeTransaction')[0], L = trouver(T, 'ram:IncludedSupplyChainTradeLineItem');
  const AG = trouver(T, 'ram:ApplicableHeaderTradeAgreement')[0], ST = trouver(T, 'ram:ApplicableHeaderTradeSettlement')[0];
  const S = trouver(ST, 'ram:SpecifiedTradeSettlementHeaderMonetarySummation')[0];
  const c = s => Math.round(parseFloat(s) * 100), dec2 = s => !/\.\d{3,}/.test(s || '');
  const m = ch => { const x = texteDe(S, ch); return x === undefined ? null : x; };
  const HT = m('ram:LineTotalAmount'), BASE = m('ram:TaxBasisTotalAmount'), TVA = m('ram:TaxTotalAmount'), TTC = m('ram:GrandTotalAmount'), PRE = m('ram:TotalPrepaidAmount'), DU = m('ram:DuePayableAmount');
  r('BR-12', HT !== null); r('BR-13', BASE !== null); r('BR-14', TTC !== null); r('BR-15', DU !== null); r('BR-16', L.length >= 1);
  const lignes = L.map(l => c(texteDe(l, 'ram:SpecifiedLineTradeSettlement/ram:SpecifiedTradeSettlementLineMonetarySummation/ram:LineTotalAmount')));
  r('BR-CO-10', lignes.reduce((a, b) => a + b, 0) === c(HT), lignes.join('+') + ' ≠ ' + HT);
  r('BR-CO-13', c(BASE) === c(HT), 'pas de remise ni de frais : base = somme des lignes');
  const taxes = trouver(ST, 'ram:ApplicableTradeTax'); r('BR-CO-18', taxes.length >= 1);
  r('BR-CO-14', taxes.reduce((a, t) => a + c(texteDe(t, 'ram:CalculatedAmount')), 0) === c(TVA), 'TVA totale ≠ somme des ventilations');
  r('BR-CO-15', c(TTC) === c(BASE) + c(TVA), TTC + ' ≠ ' + BASE + ' + ' + TVA);
  r('BR-CO-16', c(DU) === c(TTC) - (PRE === null ? 0 : c(PRE)), 'à payer ≠ TTC − déjà payé');
  [HT, BASE, TVA, TTC, PRE, DU].forEach((x, i) => { if (x !== null) r('BR-DEC-' + (i + 9), dec2(x), x); });
  const cat = t => texteDe(t, 'ram:CategoryCode'), taux = t => parseFloat(texteDe(t, 'ram:RateApplicablePercent'));
  taxes.forEach(t => {
    r('BR-45', texteDe(t, 'ram:BasisAmount') !== undefined); r('BR-46', texteDe(t, 'ram:CalculatedAmount') !== undefined); r('BR-47', !!cat(t));
    r('BR-48', texteDe(t, 'ram:RateApplicablePercent') !== undefined || cat(t) === 'O');
    r('BR-CO-03', !(trouver(t, 'ram:TaxPointDate').length && trouver(t, 'ram:DueDateTypeCode').length));
    const base = c(texteDe(t, 'ram:BasisAmount')), mont = c(texteDe(t, 'ram:CalculatedAmount'));
    const deLaCat = lignes.filter((_, i) => cat(trouver(L[i], 'ram:SpecifiedLineTradeSettlement/ram:ApplicableTradeTax')[0]) === cat(t) && taux(trouver(L[i], 'ram:SpecifiedLineTradeSettlement/ram:ApplicableTradeTax')[0]) === taux(t)).reduce((a, b) => a + b, 0);
    r('BR-CO-17', Math.abs(mont - Math.round(base * taux(t) / 100)) <= 100 && (taux(t) !== 0 || mont === 0), 'TVA de la ventilation');
    r((cat(t) === 'S' ? 'BR-S-08' : 'BR-E-08'), base === deLaCat, 'base ' + base + ' ≠ lignes ' + deLaCat);
    if (cat(t) === 'S') { r('BR-S-09', Math.abs(mont - Math.round(base * taux(t) / 100)) < 100); r('BR-S-05', taux(t) > 0, 'catégorie S : taux > 0'); }
    if (cat(t) === 'E') { r('BR-E-09', mont === 0); r('BR-E-10', !!(texteDe(t, 'ram:ExemptionReasonCode') || texteDe(t, 'ram:ExemptionReason'))); r('BR-E-05', taux(t) === 0);
      const ven = trouver(AG, 'ram:SellerTradeParty/ram:SpecifiedTaxRegistration');
      r('BR-E-02', ven.length >= 1, 'une exonération exige un identifiant fiscal du vendeur (BT-31 ou BT-32)'); }
    if (cat(t) === 'S') r('BR-S-02', trouver(AG, 'ram:SellerTradeParty/ram:SpecifiedTaxRegistration').some(x => trouver(x, 'ram:ID')[0].attrs.schemeID === 'VA'), 'catégorie S : le vendeur doit porter son n° de TVA');
  });
  L.forEach((l, k) => { const q = trouver(l, 'ram:SpecifiedLineTradeDelivery/ram:BilledQuantity')[0], tl = trouver(l, 'ram:SpecifiedLineTradeSettlement/ram:ApplicableTradeTax')[0];
    r('BR-21', !!texteDe(l, 'ram:AssociatedDocumentLine' + 'Document/ram:LineID')); r('BR-22', q !== undefined); r('BR-23', !!(q && q.attrs.unitCode)); r('BR-24', texteDe(l, 'ram:SpecifiedLineTradeSettlement/ram:SpecifiedTradeSettlementLineMonetarySummation/ram:LineTotalAmount') !== undefined);
    r('BR-25', !!texteDe(l, 'ram:SpecifiedTradeProduct/ram:Name')); r('BR-26', texteDe(l, 'ram:SpecifiedLineTradeAgreement/ram:NetPriceProductTradePrice/ram:ChargeAmount') !== undefined);
    r('BR-27', parseFloat(texteDe(l, 'ram:SpecifiedLineTradeAgreement/ram:NetPriceProductTradePrice/ram:ChargeAmount')) >= 0); r('BR-CO-04', !!(tl && cat(tl)));
    if (tl && cat(tl) === 'E') r('BR-E-05', taux(tl) === 0, 'ligne ' + (k + 1)); });
  const vend = trouver(AG, 'ram:SellerTradeParty')[0], ach = trouver(AG, 'ram:BuyerTradeParty')[0];
  r('BR-06', !!texteDe(vend, 'ram:Name')); r('BR-07', !!texteDe(ach, 'ram:Name')); r('BR-08', trouver(vend, 'ram:PostalTradeAddress').length === 1); r('BR-09', texteDe(vend, 'ram:PostalTradeAddress/ram:CountryID') === 'FR');
  r('BR-10', trouver(ach, 'ram:PostalTradeAddress').length === 1); r('BR-11', texteDe(ach, 'ram:PostalTradeAddress/ram:CountryID') === 'FR');
  r('BR-CO-26', trouver(vend, 'ram:GlobalID').length + trouver(vend, 'ram:SpecifiedLegalOrganization/ram:ID').length + trouver(vend, 'ram:SpecifiedTaxRegistration').length >= 1);
  [vend, ach].forEach(p => trouver(p, 'ram:SpecifiedTaxRegistration').forEach(x => { const id = trouver(x, 'ram:ID')[0]; r('FX-SCH schemeID', !!id.attrs.schemeID); if (id.attrs.schemeID === 'VA') r('BR-CO-09', /^[A-Z]{2}/.test(id.texte), id.texte); }));
  const ship = trouver(T, 'ram:ApplicableHeaderTradeDelivery/ram:ShipToTradeParty/ram:PostalTradeAddress'); ship.forEach(a => r('BR-57', texteDe(a, 'ram:CountryID') === 'FR'));
  trouver(ST, 'ram:SpecifiedTradeSettlementPaymentMeans').forEach(pm => { const t = texteDe(pm, 'ram:TypeCode'); r('BR-49', !!t);
    if (['30', '58', '31', '42'].includes(t)) { r('BR-50', trouver(pm, 'ram:PayeePartyCreditorFinancialAccount/ram:IBANID').length === 1); r('BR-61', true); } });
  r('BR-05', texteDe(ST, 'ram:InvoiceCurrencyCode') === 'EUR'); r('BR-01', !!texteDe(racine, 'rsm:ExchangedDocumentContext/ram:GuidelineSpecifiedDocumentContextParameter/ram:ID'));
  r('BR-02', !!texteDe(racine, 'rsm:ExchangedDocument/ram:ID')); r('BR-03', !!texteDe(racine, 'rsm:ExchangedDocument/ram:IssueDateTime/udt:DateTimeString')); r('BR-04', !!texteDe(racine, 'rsm:ExchangedDocument/ram:TypeCode'));
  const toutes = []; (function pas(n) { toutes.push(n); n.enfants.forEach(pas); })(racine);
  toutes.forEach(n => { if (!n.enfants.length && !n.texte.trim()) E.push('PEPPOL-EN16931-R008 : élément vide ' + n.nom); });
  return E; }

/* les listes de codes officielles */
function verifierCodes(racine) {
  const E = [], dans = (liste, val, quoi) => { if (!CODES[liste].includes(val)) E.push(quoi + ' « ' + val + ' » absent de la liste ' + liste); };
  dans('guideline', texteDe(racine, 'rsm:ExchangedDocumentContext/ram:GuidelineSpecifiedDocumentContextParameter/ram:ID'), 'GuidelineID');
  dans('typeDocument', texteDe(racine, 'rsm:ExchangedDocument/ram:TypeCode'), 'TypeCode');
  trouver(racine, 'rsm:ExchangedDocument/ram:IncludedNote/ram:SubjectCode').forEach(n => dans('sujetNote', n.texte, 'SubjectCode'));
  const toutes = []; (function pas(n) { toutes.push(n); n.enfants.forEach(pas); })(racine);
  toutes.forEach(n => {
    if (n.nom === 'ram:BilledQuantity') dans('unite', n.attrs.unitCode, 'unitCode');
    if (n.nom === 'ram:CategoryCode') dans('categorieTva', n.texte, 'CategoryCode');
    if (n.nom === 'ram:ExemptionReasonCode') dans('exemptionTva', n.texte, 'ExemptionReasonCode');
    if (n.nom === 'ram:DueDateTypeCode') dans('exigibilite', n.texte, 'DueDateTypeCode');
    if (n.nom === 'ram:GlobalID') dans('schemeGlobalId', n.attrs.schemeID, 'GlobalID/@schemeID');
    if (n.nom === 'ram:SpecifiedLegalOrganization') trouver(n, 'ram:ID').forEach(x => dans('schemeOrganisation', x.attrs.schemeID, 'LegalOrganization/@schemeID'));
    if (n.nom === 'ram:SpecifiedTradeSettlementPaymentMeans') dans('moyenPaiement', texteDe(n, 'ram:TypeCode'), 'PaymentMeans/TypeCode');
    if (n.nom === 'ram:SpecifiedTaxRegistration') { const s = trouver(n, 'ram:ID')[0].attrs.schemeID; if (!['VA', 'FC'].includes(s)) E.push('SpecifiedTaxRegistration/@schemeID « ' + s + ' »'); } });
  return E; }

const octets = s => Buffer.from(s, 'latin1');
function ttf(buf) {   // lecteur TrueType minimal : tables, cmap (3,1), largeurs, noms
  const nt = buf.readUInt16BE(4), T = {};
  for (let i = 0; i < nt; i++) { const o = 12 + 16 * i; T[buf.toString('latin1', o, o + 4)] = { off: buf.readUInt32BE(o + 8), len: buf.readUInt32BE(o + 12) }; }
  const upm = buf.readUInt16BE(T.head.off + 18), nh = buf.readUInt16BE(T.hhea.off + 34), ng = buf.readUInt16BE(T.maxp.off + 4);
  const adv = g => buf.readUInt16BE(T.hmtx.off + 4 * Math.min(g, nh - 1));
  const cm = T.cmap.off, nsub = buf.readUInt16BE(cm + 2); let sub = null; const encs = [];
  for (let i = 0; i < nsub; i++) { const p = buf.readUInt16BE(cm + 4 + 8 * i), e = buf.readUInt16BE(cm + 6 + 8 * i), o = cm + buf.readUInt32BE(cm + 8 + 8 * i); encs.push(p + ',' + e); if (p === 3 && e === 1) sub = o; }
  const glyphe = u => { if (sub === null) return 0; const sc = buf.readUInt16BE(sub + 6) / 2; let k = 0;   // format 4
    const fin = o => buf.readUInt16BE(sub + 14 + 2 * o), deb = o => buf.readUInt16BE(sub + 16 + 2 * sc + 2 * o), dl = o => buf.readInt16BE(sub + 16 + 4 * sc + 2 * o), ro = o => buf.readUInt16BE(sub + 16 + 6 * sc + 2 * o);
    for (; k < sc; k++) if (fin(k) >= u) break; if (k >= sc || deb(k) > u) return 0;
    if (ro(k) === 0) return (u + dl(k)) & 0xFFFF; const a = sub + 16 + 6 * sc + 2 * k + ro(k) + 2 * (u - deb(k)); const g = buf.readUInt16BE(a); return g ? (g + dl(k)) & 0xFFFF : 0; };
  const noms = []; { const no = T.name.off, n = buf.readUInt16BE(no + 2), so = no + buf.readUInt16BE(no + 4);
    for (let i = 0; i < n; i++) { const r = no + 6 + 12 * i, pl = buf.readUInt16BE(r), id = buf.readUInt16BE(r + 6), ln = buf.readUInt16BE(r + 8), of = buf.readUInt16BE(r + 10);
      noms.push([id, pl === 3 || pl === 0 ? Buffer.from(buf.slice(so + of, so + of + ln)).swap16().toString('utf16le') : buf.toString('latin1', so + of, so + of + ln)]); } }
  return { T, upm, ng, glyphe, largeur: g => Math.round(adv(g) * 1000 / upm), encs, noms, tables: Object.keys(T) }; }

function lirePdf(chaine) {   // chaîne binaire → {objets, xref, trailer, flux(i)}
  const b = octets(chaine), s = chaine, sx = s.lastIndexOf('startxref'), xr = parseInt(s.slice(sx + 10), 10);
  const lignes = s.slice(xr).split('\n'); const n = parseInt(lignes[1].split(' ')[1], 10);
  const offs = [], objets = {};
  for (let i = 1; i < n; i++) offs[i] = parseInt(lignes[3 + i - 1].slice(0, 10), 10);
  for (let i = 1; i < n; i++) { const d = s.slice(offs[i]); const m = new RegExp('^' + i + ' 0 obj\\n').exec(d); if (!m) { objets[i] = null; continue; }
    const fin = d.indexOf('endobj'); const corps = d.slice(m[0].length, fin);
    const si = corps.indexOf('\nstream\n'); let dict = corps, flux = null;
    if (si >= 0) { dict = corps.slice(0, si); const len = parseInt(/\/Length (\d+)/.exec(dict)[1], 10), dbt = offs[i] + m[0].length + si + 8; flux = b.slice(dbt, dbt + len); }
    objets[i] = { dict, flux }; }
  return { n, offs, objets, xr, trailer: s.slice(s.indexOf('trailer'), sx), debut: s.slice(0, 20), fin: s.slice(-6), s }; }

const winansi = c => { const t = [0x20AC, 0, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021, 0x02C6, 0x2030, 0x0160, 0x2039, 0x0152, 0, 0x017D, 0, 0, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013, 0x2014, 0x02DC, 0x2122, 0x0161, 0x203A, 0x0153, 0, 0x017E, 0x0178];
  if (c >= 128 && c <= 159) return t[c - 128] || null; return c >= 32 && c !== 127 ? c : null; };

/* ───────────── les factures du banc ───────────── */
const CLI = { id: 'c1', nom: 'Boulangerie Élise SAS', typeClient: 'pro', siren: '552081317', adresse: '12 rue du Port, 17100 Saintes', codePostal: '17100', ville: 'Saintes', email: 'elise@exemple.fr', tel: '0546000000' };
const L1 = [{ designation: 'Dératisation – 6 postes', qte: 1, pu: 120 }, { designation: 'Désinsectisation', qte: 2, pu: 33.5 }];
const F = (id, plus) => Object.assign({ id, num: 'FAC-2026-' + id.slice(1).padStart(3, '0'), clientId: 'c1', date: '2026-10-20', tva: 20, statut: 'envoyee', nature: 'services', lignes: L1 }, plus || {});
const BASE = Object.assign({}, O.BASE_SANS_CLIENT, {
  clients: [CLI, { id: 'c2', nom: 'Mme Martin', typeClient: 'particulier', email: 'martin@exemple.fr', adresse: '3 impasse X, 17000 La Rochelle' }],
  devis: [{ id: 'd1', num: 'DEV-2026-001', clientId: 'c1', date: '2026-10-20', tva: 20, statut: 'brouillon', lignes: L1 }],
  factures: [F('f1'), F('f2', { tva: 10 }), F('f3', { tva: 5.5, lignes: [{ designation: 'Produit', qte: 3, pu: 0.1 }, { designation: 'Autre', qte: 7, pu: 1.15 }] }),
    F('f4', { tva: 0, nature: 'services' }), F('f5', { statut: 'payee', datePaiement: '2026-10-25', moyenPaiement: 'A) Carte bancaire' }), F('f6', { adresseLivraison: '8 quai Marchand, 17300 Rochefort', nature: 'biens' }),
    F('f7', { nature: 'mixte', echeance: '2026-11-05' }), F('f8', { lignes: [{ designation: 'Tapis & <moquette> "A"\u0003\u000B suite', qte: 1, pu: 10 }] }),
    F('f9', { statut: 'payee', datePaiement: '2026-10-26', moyenPaiement: 'H) Virement' }), F('f10', { clientId: 'c2' }),
    /* deux montants où l'ancienne arithmétique contredisait ses propres parties : 1,00 € à 5,5 % (TVA 0,06 mais TTC 1,05) et 0,15 € à 10 % (TVA 0,01 au lieu de 0,02) */
    F('f11', { tva: 5.5, lignes: [{ designation: 'Pièce', qte: 1, pu: 1 }] }), F('f12', { tva: 10, lignes: [{ designation: 'Joint', qte: 1, pu: 0.15 }] })] });
const W = O.monter(BASE);
const facture = id => W.db.factures.find(f => f.id === id);
const pdfDe = (id, date) => W.docPdfStr('factures', facture(id), null, { xml: W.facturxXml(facture(id)), date: date || new Date('2026-10-28T10:00:00Z'), id: 'a'.repeat(32) });

/* ═════════════ 1. LES MONTANTS : UNE SEULE ARITHMÉTIQUE, EN CENTIMES ═════════════ */
titre('1. docTot : la TVA s\'arrondit UNE fois, ttc = ht + tva, au centime');
{ const cas = (lig, tva) => W.docTot({ lignes: lig, tva });
  v('0,10 € à 5,5 % : TVA 0,01 (0,0055 arrondi demi vers le haut), TTC 0,11', [cas([{ qte: 1, pu: 0.1 }], 5.5).tva, cas([{ qte: 1, pu: 0.1 }], 5.5).ttc], [0.01, 0.11]);
  v('1,00 € à 20 % : 0,20 / 1,20 (pas de bruit de virgule flottante)', [cas([{ qte: 1, pu: 1 }], 20).tva, cas([{ qte: 1, pu: 1 }], 20).ttc], [0.2, 1.2]);
  v('0,05 € à 10 % : 0,005 → 0,01 (le demi monte)', cas([{ qte: 1, pu: 0.05 }], 10).tvaC, 1);
  v('TVA à 0 % : rien, TTC = HT', [cas(L1, 0).tva, cas(L1, 0).ttc, cas(L1, 0).ht], [0, 187, 187]);
  v('TVA absente : comme 0 %', cas(L1, undefined).ttc, 187);
  v('les centimes sont rendus pour le XML : htC + tvaC = ttcC', (t => t.htC + t.tvaC === t.ttcC)(cas(L1, 20)), true);
  let graine = 7; const rnd = () => (graine = (graine * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const taux = [0, 2.1, 5.5, 8.5, 10, 20]; let faux = [], n = 0, tvaFausse = 0;
  for (let i = 0; i < 15000; i++) { const nl = 1 + Math.floor(rnd() * 4), lig = []; for (let k = 0; k < nl; k++) lig.push({ qte: Math.round(rnd() * 1000) / 100, pu: Math.round(rnd() * 100000) / 100 });
    const tx = taux[i % taux.length], t = W.docTot({ lignes: lig, tva: tx }); n++;
    const ref = (BigInt(Math.round(t.ht * 100)) * BigInt(Math.round(tx * 100)) + 5000n) / 10000n;   // le même calcul, en entiers de précision infinie
    if (BigInt(t.tvaC) !== ref) tvaFausse++;
    if (t.htC + t.tvaC !== t.ttcC || Math.round(t.ttc * 100) !== t.ttcC || Math.round(t.tva * 100) !== t.tvaC) faux.push([lig, tx]); }
  v('15 000 documents tirés au hasard (6 taux) : la TVA égale le calcul en entiers exacts, ht + tva = ttc à l\'entier', [n, tvaFausse, faux.length], [15000, 0, 0]);
  const ancien = (ht, tx) => ht * tx / 100;   // ce que docTot faisait : la TVA non arrondie, affichée par toFixed
  let ecarts = 0; for (let i = 0; i < 4000; i++) { const ht = Math.round(rnd() * 100000) / 100, tx = taux[i % taux.length]; const tva = ancien(ht, tx); if (Number((ht + tva).toFixed(2)) !== Number((ht + Number(tva.toFixed(2))).toFixed(2))) ecarts++; }
  vrai('(population) l\'ancienne arithmétique s\'écartait d\'un centime sur certains montants — la raison d\'être de ce changement : ' + ecarts + ' cas sur 4000', ecarts >= 0); }

/* ═════════════ 2. L'ÉCHÉANCE ═════════════ */
titre('2. docEcheance : celle qu\'on pose, sinon date + 30 jours CALENDAIRES');
{ v('une échéance posée est gardée', W.docEcheance({ date: '2026-10-20', echeance: '2026-11-05' }), '2026-11-05');
  v('sans échéance : date + 30 jours', W.docEcheance({ date: '2026-09-02' }), '2026-10-02');
  v('⛔ en traversant le changement d\'heure d\'octobre (25/10/2026, fuseau Europe/Paris) : le 1er octobre + 30 jours est le 31, pas le 30 — l\'ancien calcul en millisecondes rendait le 30', W.docEcheance({ date: '2026-10-01' }), '2026-10-31');
  v('… et à travers celui de mars', W.docEcheance({ date: '2026-03-01' }), '2026-03-31');
  v('une valeur qui n\'est pas une date est ignorée (le défaut sert)', W.docEcheance({ date: '2026-09-02', echeance: 'demain' }), '2026-10-02');
  const late = f => W.factIsLate(f), il = Date.now(), iso = ms => { const d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  vrai('factIsLate : une facture envoyée dont l\'échéance posée est passée est en retard, même avant 30 jours', late({ statut: 'envoyee', date: iso(il - 5 * 86400000), echeance: iso(il - 86400000) }) === true);
  vrai('… et une échéance posée dans l\'avenir la garde à l\'heure, même au-delà de 30 jours', late({ statut: 'envoyee', date: iso(il - 60 * 86400000), echeance: iso(il + 5 * 86400000) }) === false);
  vrai('… sans échéance posée : l\'ancienne règle (30 jours)', late({ statut: 'envoyee', date: iso(il - 40 * 86400000) }) === true && late({ statut: 'envoyee', date: iso(il - 10 * 86400000) }) === false); }

/* ═════════════ 3. LES MENTIONS, LES IDENTIFIANTS, L'ADRESSE ═════════════ */
titre('3. SIREN, TVA, adresse du client, mentions de la réforme');
{ vrai('un SIREN valide : 552 081 317 (clé de Luhn)', W.sirenValide('552081317') && W.sirenValide('552 081 317'));
  vrai('un SIREN faux : 552 081 318, 123 456 789, 8 chiffres, des lettres', !W.sirenValide('552081318') && !W.sirenValide('123456789') && !W.sirenValide('55208131') && !W.sirenValide('55208131A'));
  v('un SIRET collé donne son SIREN', W.docSiren('552 081 317 00039'), '552081317');
  v('… un SIREN reste un SIREN', W.docSiren('552081317'), '552081317');
  vrai('TVA française : la clé se recalcule (FR44 732829320 vraie, FR45 fausse)', W.fxTvaValide('FR44732829320') && W.fxTvaValide('fr 44 732829320') && !W.fxTvaValide('FR45732829320'));
  vrai('TVA d\'un autre pays : le format suffit (BE0123456789 passe, « 1234 » non)', W.fxTvaValide('BE0123456789') && !W.fxTvaValide('1234'));
  v('adresse « rue, CP ville » : le lieu est lu DANS l\'adresse, la rue ne le répète pas', W.docAdresseClient({ adresse: '12 rue du Port, 17100 Saintes', codePostal: '17100', ville: 'Saintes' }), { rue: '12 rue du Port', cp: '17100', ville: 'Saintes' });
  v('adresse sans lieu : les champs codePostal et ville de la fiche servent', W.docAdresseClient({ adresse: '12 rue du Port', codePostal: '17100', ville: 'Saintes' }), { rue: '12 rue du Port', cp: '17100', ville: 'Saintes' });
  v('« … 17100 Saintes France » : le pays est ôté', W.docAdresseClient({ adresse: '12 rue du Port 17100 Saintes, France' }), { rue: '12 rue du Port', cp: '17100', ville: 'Saintes' });
  const E = W.docEntete('');
  v('mentions d\'une facture sans rien de neuf : aucune (une facture d\'avant ne prétend rien)', W.docMentions('factures', { statut: 'envoyee' }, {}, E), { client: [], fin: [] });
  v('SIREN du client : « SIREN 552 081 317 »', W.docMentions('factures', {}, { siren: '552081317' }, E).client, ['SIREN 552 081 317']);
  v('nature, livraison et option débits : trois lignes, dans cet ordre', W.docMentions('factures', { nature: 'biens', adresseLivraison: 'Chantier X' }, {}, { tvaDebits: true }).fin,
    ['Nature de l\'opération : Livraison de biens.', 'Adresse de livraison : Chantier X', 'Option pour le paiement de la taxe d\'après les débits.']);
  v('un devis ne porte pas les mentions de facture', W.docMentions('devis', { nature: 'biens', adresseLivraison: 'X' }, {}, { tvaDebits: true }).fin, []);
  const pdf = pdfDe('f6'), sans = W.docPdfStr('factures', facture('f6'), null);
  vrai('le PDF imprime le SIREN du client, la nature et l\'adresse de livraison', /SIREN 552 081 317/.test(sans) && /Nature de l'op\xe9ration : Livraison de biens\./.test(sans) && /Adresse de livraison : 8 quai Marchand/.test(sans));
  vrai('le PDF imprime le code postal du client UNE fois (« 17100 Saintes ») — il lisait `cli.cp`, un champ qui n\'existe pas', (sans.match(/17100 Saintes/g) || []).length === 1, (sans.match(/17100 Saintes/g) || []).length);
  vrai('l\'option pour la taxe d\'après les débits s\'imprime quand l\'entreprise l\'a cochée', /Option pour le paiement de la taxe d'apr\xe8s les d\xe9bits/.test(O.monter(Object.assign({}, BASE, { entreprise: Object.assign({}, BASE.entreprise, { tvaDebits: true }) })).docPdfStr('factures', facture('f1'), null)));
  vrai('… et pas sans elle', !/taxe d'apr\xe8s les d\xe9bits/.test(W.docPdfStr('factures', facture('f1'), null)));
  vrai('(population) le PDF compté ci-dessus est un vrai PDF de facture', /^%PDF-1\.4/.test(sans) && sans.includes('(FACTURE)')); }

/* ═════════════ 4. SANS `fx`, RIEN NE CHANGE : LES EMPREINTES D'AVANT ═════════════ */
titre('4. non-régression : un devis et une facture ordinaires sortent octet pour octet comme avant le 28 octobre 2026');
{ const base = Object.assign({}, O.BASE_SANS_CLIENT, { clients: [{ id: 'c1', nom: 'Boulangerie Élise', email: 'elise@exemple.fr', tel: '0546000000', adresse: '12 rue du Port' }],
    devis: [{ id: 'd1', num: 'DEV-2026-001', clientId: 'c1', date: '2026-10-20', tva: 20, statut: 'brouillon', notes: 'Accès par la cour.', lignes: [{ designation: 'Dératisation – 6 postes', qte: 1, pu: 120 }, { designation: 'Désinsectisation', qte: 2, pu: 33.5 }] }],
    factures: [{ id: 'f1', num: 'FAC-2026-001', clientId: 'c1', date: '2026-06-10', tva: 20, statut: 'envoyee', lignes: [{ designation: 'Dératisation – 6 postes', qte: 1, pu: 120 }, { designation: 'Désinsectisation', qte: 2, pu: 33.5 }] },
      { id: 'f2', num: 'FAC-2026-002', clientId: 'c1', date: '2026-09-02', tva: 0, statut: 'payee', datePaiement: '2026-09-10', lignes: [{ designation: 'Nettoyage', qte: 3, pu: 45 }] }] });
  const X = O.monter(base), h = s => crypto.createHash('sha256').update(s, 'latin1').digest('hex');
  /* calculées le 28 octobre 2026 avec le app.html D'AVANT (commit 6b30d323), sur ces mêmes données */
  v('devis : empreinte inchangée', h(X.docPdfStr('devis', X.db.devis[0], null)), 'd4ac9c30b95980081a910d43f7742d0f0d77001f89b1758380b281929cd0f6d1');
  v('facture à 20 % (10 juin, hors changement d’heure) : empreinte inchangée', h(X.docPdfStr('factures', X.db.factures[0], null)), '405685f6eb6028ba367c25d1920d4bd58f90713c62d1e05690998c3516d8e5ab');
  /* ⛔ CHANGÉE VOLONTAIREMENT le 28 octobre 2026 (constat 3 du vérificateur) : ce vendeur a un n° de TVA, donc une facture à 0 % n'est pas
     une franchise en base — « article 293 B » n'y est plus imprimé. L'ancienne empreinte était 50f32fd5… (avec la mention). */
  const f0 = h(X.docPdfStr('factures', X.db.factures[1], null));
  v('facture à 0 % d\'un vendeur ASSUJETTI : plus de mention 293 B (empreinte recalculée, voir le commentaire)', [f0, X.docPdfStr('factures', X.db.factures[1], null).includes('293 B')], ['4434ff13aa34c307370562ea7738307b1267646bc88ede0e94ffcf152f0a4f89', false]);
  { const XF = O.monter(Object.assign({}, base, { entreprise: Object.assign({}, base.entreprise, { tvaIntra: '' }) }));
    vrai('… et le MÊME document d\'un vendeur SANS n° de TVA (franchise en base) porte bien la mention 293 B', XF.docPdfStr('factures', XF.db.factures[1], null).includes('293 B'));
    vrai('… le devis à 0 % aussi : 293 B pour la franchise seulement, « TVA au taux indiqué » pour un assujetti', XF.docPdfStr('devis', Object.assign({}, XF.db.devis[0], { tva: 0 }), null).includes('293 B') && !X.docPdfStr('devis', Object.assign({}, X.db.devis[0], { tva: 0 }), null).includes('293 B') && X.docPdfStr('devis', Object.assign({}, X.db.devis[0], { tva: 0 }), null).includes('TVA au taux indiqu')); }
  const avec = X.docPdfStr('factures', X.db.factures[0], null, { xml: '<x/>', date: new Date('2026-10-28T10:00:00Z') });
  const pages = s => lirePdf(s), A = pages(X.docPdfStr('factures', X.db.factures[0], null)), B = pages(avec);
  const contenus = P => Object.values(P.objets).filter(o => o && o.flux && !/\/Type/.test(o.dict)).map(o => o.flux.toString('latin1'));
  v('avec fx : le contenu des pages (les flux de texte) est IDENTIQUE, octet pour octet', contenus(B).filter(c => /Tj/.test(c)), contenus(A).filter(c => /Tj/.test(c)));
  vrai('(population) il y a bien une page de texte à comparer', contenus(A).filter(c => /Tj/.test(c)).length === 1); }

/* ═════════════ 5. LES PRÉREQUIS : CE QUI MANQUE SE DIT ═════════════ */
titre('5. facturxPrerequis : une liste de ce qui manque, vide quand tout y est');
{ const manque = (id, mod) => { const X = O.monter(Object.assign({}, BASE, mod || {})); return X.facturxPrerequis(X.db.factures.find(f => f.id === id)); };
  v('une facture complète : rien ne manque', manque('f1'), []);
  const dup = o => JSON.parse(JSON.stringify(o));
  const sans = (champ, valeur) => { const e = dup(BASE.entreprise); if (valeur === undefined) delete e[champ]; else e[champ] = valeur; return { entreprise: e }; };
  vrai('sans SIRET de l\'entreprise : « le SIRET » manque', manque('f1', sans('siret')).some(x => /SIRET de l'entreprise/.test(x)));
  vrai('un SIRET à la clé fausse est refusé (73282932000074 → 73282932100074)', manque('f1', sans('siret', '73282932100074')).some(x => /SIRET de l'entreprise/.test(x)));
  vrai('sans n° de TVA : refusé dès qu\'il y a de la TVA…', manque('f1', sans('tvaIntra', '')).some(x => /TVA intracommunautaire/.test(x)));
  vrai('… mais accepté sur une facture sans TVA (franchise)', !manque('f4', sans('tvaIntra', '')).some(x => /TVA intracommunautaire/.test(x)));
  vrai('sans adresse complète (code postal) de l\'entreprise : refusé', manque('f1', sans('cp', '')).some(x => /adresse complète de l'entreprise/.test(x)));
  vrai('un IBAN mal formé est refusé (il ne part pas dans un fichier)', manque('f1', sans('iban', 'FR76')).some(x => /IBAN/.test(x)));
  const cli = ch => ({ clients: dup(BASE.clients).map(c => c.id === 'c1' ? Object.assign(c, ch) : c) });
  vrai('sans SIREN du client : refusé', manque('f1', cli({ siren: '' })).some(x => /SIREN du client/.test(x)));
  vrai('un SIREN de client à la clé fausse : refusé', manque('f1', cli({ siren: '552081318' })).some(x => /SIREN du client/.test(x)));
  vrai('un SIRET de client collé dans le champ SIREN : accepté (on en garde les neuf premiers chiffres)', !manque('f1', cli({ siren: '55208131700039' })).some(x => /SIREN du client/.test(x)));
  vrai('sans adresse complète du client : refusé', manque('f1', cli({ adresse: '12 rue du Port', codePostal: '', ville: '' })).some(x => /adresse complète du client/.test(x)));
  vrai('un n° de TVA de client faux : refusé (le champ vide, lui, est permis)', manque('f1', cli({ tvaIntra: 'FR00123' })).some(x => /TVA valide pour le client/.test(x)) && !manque('f1', cli({ tvaIntra: '' })).some(x => /TVA valide/.test(x)));
  vrai('un client PARTICULIER : la facture électronique ne le concerne pas, on le dit', manque('f10').some(x => /client professionnel/.test(x)));
  vrai('sans nature de l\'opération : refusé (« ouvre la facture et enregistre-la »)', (() => { const X = O.monter(BASE), f = Object.assign({}, X.db.factures[0]); delete f.nature; return X.facturxPrerequis(f).some(x => /nature de l'op/.test(x)); })());
  const avecLig = lig => { const X = O.monter(BASE), f = Object.assign({}, X.db.factures[0], { lignes: lig }); return X.facturxPrerequis(f); };
  vrai('un prix négatif est refusé : un avoir n\'existe pas encore', avecLig([{ designation: 'Remise', qte: 1, pu: -10 }]).some(x => /avoir/.test(x)));
  vrai('une facture sans ligne est refusée', avecLig([]).some(x => /au moins une ligne/.test(x)));
  vrai('un taux de TVA à trois décimales est refusé', (() => { const X = O.monter(BASE), f = Object.assign({}, X.db.factures[0], { tva: 5.555 }); return X.facturxPrerequis(f).some(x => /taux de TVA/.test(x)); })());
  vrai('(population) chaque refus ci-dessus nomme son défaut — aucun message vide', manque('f10').every(x => x.length > 10)); }

/* ═════════════ 6. LE XML : BIEN FORMÉ, AU SCHÉMA, AUX RÈGLES, AUX LISTES ═════════════ */
titre('6. facturxXml : dix factures, chacune contrôlée de quatre façons');
const XMLS = {};
const WF = O.monter(Object.assign({}, BASE, { entreprise: Object.assign({}, BASE.entreprise, { tvaIntra: '' }) }));   // le vendeur en franchise en base : pas de n° de TVA
{ const ids = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9'];
  let xsdJouees = 0, xmllint = true;
  try { cp.execFileSync('xmllint', ['--version'], { stdio: 'ignore' }); } catch (e) { xmllint = false; }
  const XSD = path.join(__dirname, 'facturx', 'CrossIndustryInvoice_100pD16B.xsd');
  for (const id of ids) {
    const MW = id === 'f4' ? WF : W, f = MW.db.factures.find(x => x.id === id), xml = MW.facturxXml(f); XMLS[id] = xml;
    let arbre = null, erreurBienForme = '';
    try { arbre = analyserXml(xml); } catch (e) { erreurBienForme = e.message; }
    vrai(id + ' (' + f.num + ', TVA ' + f.tva + ' %, ' + f.statut + ') : bien formé', !!arbre, erreurBienForme);
    if (!arbre) continue;
    const e1 = []; verifierSchema(arbre, SCHEMA.racine, 'CrossIndustryInvoice', e1);
    v('   ordre et cardinalité des éléments : ceux du schéma CII D16B', e1, []);
    v('   règles EN 16931 (BR-CO-10 à 17, BR-S, BR-E, BR-DEC, BR-CO-26, BR-61…)', reglesMetier(arbre), []);
    v('   codes : tous dans les listes officielles', verifierCodes(arbre), []);
    if (fs.existsSync(XSD) && xmllint) { let sortie = ''; try { cp.execFileSync('xmllint', ['--noout', '--schema', XSD, '-'], { input: xml, stdio: ['pipe', 'pipe', 'pipe'] }); sortie = 'ok'; } catch (e) { sortie = String(e.stderr || e.message).slice(0, 300); } xsdJouees++; v('   xmllint contre le .xsd officiel', sortie, 'ok'); } }
  console.log('  ' + (xsdJouees ? '· xmllint a rejoué le .xsd UN/CEFACT sur ' + xsdJouees + ' fichiers' : '· xmllint ou le .xsd est absent ici : le contrôle d\'ordre ci-dessus (tests/facturx/cii-d16b.json) tient seul'));
  /* le contenu : ce que chaque facture DOIT dire */
  const A = id => analyserXml(XMLS[id]);
  v('f1 : profil EN 16931, facture commerciale 380, du 20/10/2026, n° FAC-2026-001', [texteDe(A('f1'), 'rsm:ExchangedDocumentContext/ram:GuidelineSpecifiedDocumentContextParameter/ram:ID'), texteDe(A('f1'), 'rsm:ExchangedDocument/ram:TypeCode'),
    texteDe(A('f1'), 'rsm:ExchangedDocument/ram:IssueDateTime/udt:DateTimeString'), texteDe(A('f1'), 'rsm:ExchangedDocument/ram:ID')], ['urn:cen.eu:en16931:2017', '380', '20261020', 'FAC-2026-001']);
  const ven = n => trouver(n, 'rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeAgreement/ram:SellerTradeParty')[0], ach = n => trouver(n, 'rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeAgreement/ram:BuyerTradeParty')[0];
  v('f1 : le vendeur — SIRET (0009), SIREN (0002), TVA, adresse', [texteDe(ven(A('f1')), 'ram:GlobalID'), texteDe(ven(A('f1')), 'ram:SpecifiedLegalOrganization/ram:ID'), texteDe(ven(A('f1')), 'ram:SpecifiedTaxRegistration/ram:ID'), texteDe(ven(A('f1')), 'ram:PostalTradeAddress/ram:PostcodeCode')],
    ['73282932000074', '732829320', 'FR44732829320', '17000']);
  v('f1 : l\'acheteur porte son SIREN (BT-47, schéma 0002) et son adresse', [texteDe(ach(A('f1')), 'ram:SpecifiedLegalOrganization/ram:ID'), (trouver(ach(A('f1')), 'ram:SpecifiedLegalOrganization/ram:ID')[0] || { attrs: {} }).attrs.schemeID, texteDe(ach(A('f1')), 'ram:PostalTradeAddress/ram:LineOne'), texteDe(ach(A('f1')), 'ram:PostalTradeAddress/ram:CityName')],
    ['552081317', '0002', '12 rue du Port', 'Saintes']);
  const tot = id => { const s = trouver(A(id), 'rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeSettlement/ram:SpecifiedTradeSettlementHeaderMonetarySummation')[0]; return ['ram:LineTotalAmount', 'ram:TaxTotalAmount', 'ram:GrandTotalAmount', 'ram:DuePayableAmount'].map(k => texteDe(s, k)); };
  v('f1 : 187,00 HT, 37,40 de TVA, 224,40 TTC, 224,40 à payer', tot('f1'), ['187.00', '37.40', '224.40', '224.40']);
  v('f3 (5,5 %) : ligne 0,30 + ligne 8,05 = 8,35 HT ; TVA 0,459 → 0,46 ; TTC 8,81 — ht + tva = ttc', tot('f3'), ['8.35', '0.46', '8.81', '8.81']);
  const tax = id => trouver(A(id), 'rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeSettlement/ram:ApplicableTradeTax')[0];
  v('f4 (TVA 0 %) : catégorie E — JAMAIS S —, motif 293 B, code VATEX-FR-FRANCHISE, taux 0', [texteDe(tax('f4'), 'ram:CategoryCode'), texteDe(tax('f4'), 'ram:ExemptionReasonCode'), /293 B/.test(texteDe(tax('f4'), 'ram:ExemptionReason')), texteDe(tax('f4'), 'ram:RateApplicablePercent')],
    ['E', 'VATEX-FR-FRANCHISE', true, '0.00']);
  v('f4 : un vendeur en franchise sans exigibilité ni confusion — pas de DueDateTypeCode', trouver(tax('f4'), 'ram:DueDateTypeCode').length, 0);
  v('f1 (services) : TVA exigible à l\'encaissement (72) ; f6 (biens) : à la livraison (29) ; f7 (mixte) : pas de réponse unique', [texteDe(tax('f1'), 'ram:DueDateTypeCode'), texteDe(tax('f6'), 'ram:DueDateTypeCode'), trouver(tax('f7'), 'ram:DueDateTypeCode').length], ['72', '29', 0]);
  const Wd = O.monter(Object.assign({}, BASE, { entreprise: Object.assign({}, BASE.entreprise, { tvaDebits: true }) }));
  const xd = analyserXml(Wd.facturxXml(Wd.db.factures[0]));
  v('option pour la taxe d\'après les débits : exigibilité à la date de la facture (5) et la note « d\'après les débits »', [texteDe(trouver(xd, 'rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeSettlement/ram:ApplicableTradeTax')[0], 'ram:DueDateTypeCode'),
    trouver(xd, 'rsm:ExchangedDocument/ram:IncludedNote').some(n => /d'après les débits/.test(texteDe(n, 'ram:Content')))], ['5', true]);
  v('cadre de facturation (BT-23) : S1 services, B1 biens, M1 mixte', ['f1', 'f6', 'f7'].map(i => texteDe(A(i), 'rsm:ExchangedDocumentContext/ram:BusinessProcessSpecifiedDocumentContextParameter/ram:ID')), ['S1', 'B1', 'M1']);
  const reg = id => trouver(A(id), 'rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeSettlement')[0];
  v('f1 (à payer, IBAN connu) : virement (30) avec l\'IBAN sans espaces et le BIC, échéance 19/11/2026', [texteDe(reg('f1'), 'ram:SpecifiedTradeSettlementPaymentMeans/ram:TypeCode'), texteDe(reg('f1'), 'ram:SpecifiedTradeSettlementPaymentMeans/ram:PayeePartyCreditorFinancialAccount/ram:IBANID'),
    texteDe(reg('f1'), 'ram:SpecifiedTradePaymentTerms/ram:DueDateDateTime/udt:DateTimeString')], ['30', 'FR7630006000011234567890189', '20261119']);
  v('f7 : l\'échéance posée (05/11/2026) est celle du XML', texteDe(reg('f7'), 'ram:SpecifiedTradePaymentTerms/ram:DueDateDateTime/udt:DateTimeString'), '20261105');
  v('f5 (réglée par carte) : moyen 48, déjà payé = TTC, à payer 0,00, pas d\'échéance', [texteDe(reg('f5'), 'ram:SpecifiedTradeSettlementPaymentMeans/ram:TypeCode'), texteDe(reg('f5'), 'ram:SpecifiedTradeSettlementHeaderMonetarySummation/ram:TotalPrepaidAmount'),
    texteDe(reg('f5'), 'ram:SpecifiedTradeSettlementHeaderMonetarySummation/ram:DuePayableAmount'), trouver(reg('f5'), 'ram:SpecifiedTradePaymentTerms').length], ['48', '224.40', '0.00', 0]);
  v('f9 (réglée par virement) : virement (30) avec l\'IBAN du vendeur', [texteDe(reg('f9'), 'ram:SpecifiedTradeSettlementPaymentMeans/ram:TypeCode'), texteDe(reg('f9'), 'ram:SpecifiedTradeSettlementPaymentMeans/ram:PayeePartyCreditorFinancialAccount/ram:IBANID')], ['30', 'FR7630006000011234567890189']);
  const sansIban = O.monter(Object.assign({}, BASE, { entreprise: Object.assign({}, BASE.entreprise, { iban: '', bic: '' }) })), xi = analyserXml(sansIban.facturxXml(sansIban.db.factures[0]));
  v('sans IBAN : aucun moyen de paiement inventé (BR-61 : un virement exige son IBAN)', trouver(xi, 'rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeSettlement/ram:SpecifiedTradeSettlementPaymentMeans').length, 0);
  const xiv = analyserXml(sansIban.facturxXml(Object.assign({}, sansIban.db.factures[0], { statut: 'payee', moyenPaiement: 'H) Virement' })));
  v('… et une facture réglée « par virement » sans IBAN : moyen non défini (1), jamais un virement sans compte', texteDe(xiv, 'rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeSettlement/ram:SpecifiedTradeSettlementPaymentMeans/ram:TypeCode'), '1');
  v('f6 : l\'adresse de livraison structurée (17300 Rochefort) dans ShipToTradeParty', [texteDe(A('f6'), 'rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeDelivery/ram:ShipToTradeParty/ram:PostalTradeAddress/ram:PostcodeCode'), texteDe(A('f6'), 'rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeDelivery/ram:ShipToTradeParty/ram:PostalTradeAddress/ram:LineOne')], ['17300', '8 quai Marchand']);
  v('f8 : une désignation à guillemets, « & », « < » et caractères de contrôle donne un fichier VALIDE, sans les caractères de contrôle', [texteDe(A('f8'), 'rsm:SupplyChainTradeTransaction/ram:IncludedSupplyChainTradeLineItem/ram:SpecifiedTradeProduct/ram:Name')], ['Tapis & <moquette> "A" suite']);
  /* société distincte : le vendeur est la société DE LA FACTURE (docEntete), avec sa raison sociale et son nom commercial */
  const Ws = O.monter(Object.assign({}, BASE, { societes: ['Alpha Nuisibles'], societesStyle: { 'Alpha Nuisibles': { couleur: '#C0392B', raison: 'Alpha Nuisibles SAS', siret: '55208131700039', tvaIntra: 'FR03552081317', adresse: '2 quai Alpha', cp: '33000', ville: 'Bordeaux', iban: 'FR7630004000031234567890143' } } }));
  const fa = Object.assign({}, Ws.db.factures[0], { rapportModele: 'Alpha Nuisibles' }), xa = analyserXml(Ws.facturxXml(fa));
  v('société distincte : sa raison sociale, son nom commercial, SON SIRET, SA TVA, SON adresse — pas ceux de l\'entreprise', [texteDe(ven(xa), 'ram:Name'), texteDe(ven(xa), 'ram:SpecifiedLegalOrganization/ram:TradingBusinessName'), texteDe(ven(xa), 'ram:GlobalID'), texteDe(ven(xa), 'ram:SpecifiedTaxRegistration/ram:ID'), texteDe(ven(xa), 'ram:PostalTradeAddress/ram:CityName')],
    ['Alpha Nuisibles SAS', 'Alpha Nuisibles', '55208131700039', 'FR03552081317', 'Bordeaux']);
  v('… et ce XML-là passe aussi les règles', reglesMetier(xa).concat(verifierCodes(xa)), []);
  vrai('le fichier annonce 40 EUR d\'indemnité et « pas d\'escompte » dans des notes de sujet PMT et AAB, comme le PDF', /PMT/.test(XMLS.f1) && /AAB/.test(XMLS.f1) && /40 EUR/.test(XMLS.f1));
  vrai('(population) neuf factures contrôlées, TVA 20 / 10 / 5,5 / 0, payées et non payées, avec livraison, mixte, société distincte', Object.keys(XMLS).length === 9); }

/* ═════════════ 7. LE PDF/A-3 : LA STRUCTURE, OCTET PAR OCTET ═════════════ */
titre('7. le PDF Factur-X : références, polices incorporées, couleur, métadonnées, pièce jointe');
{ const s = pdfDe('f1'), P = lirePdf(s);
  vrai('l\'en-tête : %PDF-1.7 puis une ligne de commentaire d\'octets hauts (PDF/A le veut pour qu\'on le traite en binaire)', /^%PDF-1\.7\n%[\x80-\xff]{4}\n/.test(s));
  vrai('la fin : %%EOF', s.endsWith('%%EOF'));
  vrai('(population) la table des références compte ' + (P.n - 1) + ' objets', P.n - 1 >= 15);
  const mauvais = []; for (let i = 1; i < P.n; i++) if (!P.objets[i]) mauvais.push(i);
  v('⛔ chaque entrée de la table `xref` pointe EXACTEMENT sur « N 0 obj » — la panne silencieuse d\'un PDF écrit à la main', mauvais, []);
  vrai('le /Size du trailer est le nombre d\'objets, /Root désigne le catalogue, /ID a deux chaînes de 32 hexadécimaux', new RegExp('/Size ' + P.n + ' /Root 1 0 R /ID \\[<[0-9a-f]{32}><[0-9a-f]{32}>\\]').test(P.trailer), P.trailer);
  v('startxref désigne la table', s.slice(P.xr, P.xr + 4), 'xref');
  vrai('⛔ plus AUCUNE police Helvetica non incorporée (ISO 19005-3, 6.2.11.4)', !/\/BaseFont \/Helvetica/.test(s));
  const cat = P.objets[1].dict;
  vrai('catalogue : /Metadata, /OutputIntents, /Names/EmbeddedFiles, /AF et /Lang', /\/Metadata \d+ 0 R/.test(cat) && /\/OutputIntents \[\d+ 0 R\]/.test(cat) && /\/EmbeddedFiles/.test(cat) && /\/AF \[\d+ 0 R\]/.test(cat) && /\/Lang \(fr-FR\)/.test(cat), cat);
  vrai('pas de dictionnaire /Info (une cohérence Info/XMP de moins à tenir, facultatif en PDF/A-3)', !/\/Info /.test(P.trailer));
  /* les polices */
  const PL = [3, 4].map(num => { const fd = P.objets[num].dict, d = /\/FontDescriptor (\d+) 0 R/.exec(fd)[1], desc = P.objets[d].dict, ff = /\/FontFile2 (\d+) 0 R/.exec(desc)[1], F = P.objets[ff];
    const brut = zlib.inflateSync(F.flux); return { num, fd, desc, F, brut, t: ttf(brut), l1: +/\/Length1 (\d+)/.exec(F.dict)[1], w: /\/Widths \[([^\]]*)\]/.exec(fd)[1].split(' ').map(Number) }; });
  [['Regular', 0], ['Bold', 1]].forEach(([nom, k]) => { const p = PL[k];
    vrai('police ' + nom + ' : TrueType, WinAnsi, non symbolique (Flags 32), nom préfixé de six lettres, FontFile2 en FlateDecode', /\/Subtype \/TrueType/.test(p.fd) && /\/Encoding \/WinAnsiEncoding/.test(p.fd) && /\/BaseFont \/TEAMOP\+TeamOPSans-/.test(p.fd) && /\/Flags 32/.test(p.desc) && /\/Filter \/FlateDecode/.test(p.F.dict), p.fd.slice(0, 200));
    v('   /Length1 est la taille du programme décompressé', p.l1, p.brut.length);
    vrai('   les tables TrueType indispensables sont là : head hhea maxp hmtx loca glyf cmap name', ['head', 'hhea', 'maxp', 'hmtx', 'loca', 'glyf', 'cmap', 'name'].every(t => p.t.tables.includes(t)), p.t.tables);
    vrai('   un cmap (3,1) : un non-symbolique en WinAnsi en a besoin', p.t.encs.includes('3,1'), p.t.encs);
    vrai('   ⛔ le nom « Liberation » (réservé par la licence OFL) n\'apparaît plus dans le programme de police', !p.t.noms.some(([, n]) => /Liberation/i.test(n)) && !/Liberation/.test(p.brut.toString('latin1')), p.t.noms.map(n => n[1]).join(' | '));
    const incoh = []; for (let c = 32; c <= 255; c++) { const u = winansi(c); const g = u === null ? 0 : p.t.glyphe(u); const att = p.t.largeur(g); if (p.w[c - 32] !== att) incoh.push([c, p.w[c - 32], att]); if (u !== null && g === 0) incoh.push([c, 'glyphe absent']); }
    v('   ⛔ les 224 /Widths sont celles du programme incorporé, code par code (PDF/A les compare), et chaque code WinAnsi a son glyphe', incoh, []);
    const tab = new Function(O.decoupe('const _PDF_L=') + '\nreturn _PDF_L;')();
    const ecart = []; for (let c = 32; c <= 126; c++) if (p.w[c - 32] !== tab[k][c - 32]) ecart.push([c, p.w[c - 32], tab[k][c - 32]]);
    v('   ⛔ les largeurs ASCII sont celles de la table `_PDF_L` d\'Helvetica : la mise en page n\'a pas bougé d\'un point (95 caractères)', ecart, []);
    vrai('   descripteur : FontBBox, Ascent, Descent négatif, CapHeight, StemV, ItalicAngle', /\/FontBBox \[-?\d+ -?\d+ -?\d+ -?\d+\]/.test(p.desc) && /\/Descent -\d+/.test(p.desc) && /\/CapHeight \d+/.test(p.desc) && /\/StemV \d+/.test(p.desc) && /\/ItalicAngle 0/.test(p.desc), p.desc); });
  v('la page référence les mêmes polices /F1 et /F2 (3 et 4) que l\'ancien PDF', [/\/F1 3 0 R/.test(s), /\/F2 4 0 R/.test(s)], [true, true]);
  /* tout code écrit dans une page a son glyphe (un « ? » de remplacement compris) */
  const textes = Object.values(P.objets).filter(o => o && o.flux && /Tj/.test(o.flux.toString('latin1'))).map(o => o.flux.toString('latin1')).join('\n');
  const codes = new Set(); for (const m of textes.matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g)) for (const ch of m[1].replace(/\\(.)/g, '$1')) codes.add(ch.charCodeAt(0));
  vrai('(population) la page écrit ' + codes.size + ' codes de caractères distincts', codes.size > 20);
  v('chaque code écrit dans la page existe dans les DEUX polices', [...codes].filter(c => { const u = winansi(c); return u === null || PL.some(p => p.t.glyphe(u) === 0); }), []);
  /* le profil de couleur et l'intention de sortie */
  const oi = P.objets[/\/OutputIntents \[(\d+) 0 R\]/.exec(cat)[1]].dict, ic = P.objets[/\/DestOutputProfile (\d+) 0 R/.exec(oi)[1]], prof = zlib.inflateSync(ic.flux);
  vrai('intention de sortie : /S /GTS_PDFA1, identifiant sRGB, profil désigné', /\/S \/GTS_PDFA1/.test(oi) && /\/OutputConditionIdentifier \(sRGB IEC61966-2\.1\)/.test(oi), oi);
  vrai('le profil ICC : v2, classe « mntr », espace RVB, signature « acsp », taille déclarée = taille réelle, /N 3', prof.toString('latin1', 36, 40) === 'acsp' && prof.toString('latin1', 12, 16) === 'mntr' && prof.toString('latin1', 16, 20) === 'RGB ' && prof[8] === 2 && prof.readUInt32BE(0) === prof.length && /\/N 3/.test(ic.dict), [prof.length, prof.readUInt32BE(0)]);
  /* les métadonnées XMP */
  const xm = P.objets[/\/Metadata (\d+) 0 R/.exec(cat)[1]]; const xmp = xm.flux.toString('utf8');
  vrai('XMP : flux /Type /Metadata /Subtype /XML, NON compressé, paquet xpacket avec BOM', /\/Type \/Metadata \/Subtype \/XML/.test(xm.dict) && !/Filter/.test(xm.dict) && xm.flux[0] === 0x3C && xm.flux.toString('latin1', 0, 60).includes('\xEF\xBB\xBF'), xm.dict);
  let xa = null; try { xa = analyserXml(xmp.replace(/^<\?xpacket[^?]*\?>\s*/, '').replace(/\s*<\?xpacket end="w"\?>$/, '')); } catch (e) { vrai('XMP bien formé', false, e.message); }
  if (xa) { const desc = trouver(xa, 'rdf:RDF/rdf:Description'), tousTextes = []; (function pas(n) { tousTextes.push(n); n.enfants.forEach(pas); })(xa);
    const t = nom => tousTextes.filter(n => n.nom === nom).map(n => n.texte);
    v('XMP : PDF/A partie 3, niveau B', [t('pdfaid:part'), t('pdfaid:conformance')], [['3'], ['B']]);
    v('XMP : les propriétés Factur-X — type INVOICE, fichier factur-x.xml, version 1.0, niveau « EN 16931 »', [t('fx:DocumentType'), t('fx:DocumentFileName'), t('fx:Version'), t('fx:ConformanceLevel')], [['INVOICE'], ['factur-x.xml'], ['1.0'], ['EN 16931']]);
    v('⛔ XMP : le schéma fx est DÉCLARÉ (pdfaExtension) — sans lui un validateur PDF/A rejette les propriétés fx: — avec ses quatre propriétés, son espace de noms et son préfixe',
      [t('pdfaSchema:namespaceURI'), t('pdfaSchema:prefix'), t('pdfaProperty:name')], [['urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#'], ['fx'], ['DocumentFileName', 'DocumentType', 'Version', 'ConformanceLevel']]);
    vrai('XMP : l\'espace de noms de la déclaration est celui de la propriété (fx:)', desc.some(d => d.attrs['xmlns:fx'] === 'urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#'));
    v('XMP : titre et créateur', [t('rdf:li').includes('Facture FAC-2026-001'), t('rdf:li').includes('Nettoyage Excellence SARL')], [true, true]);
    vrai('XMP : dates ISO 8601 (2026-10-28T10:00:00+00:00)', t('xmp:CreateDate')[0] === '2026-10-28T10:00:00+00:00' && t('xmp:ModifyDate')[0] === t('xmp:CreateDate')[0]); }
  /* la pièce jointe */
  const fs_ = /\/AF \[(\d+) 0 R\]/.exec(cat)[1], spec = P.objets[fs_].dict, ef = P.objets[/\/EF << \/F (\d+) 0 R/.exec(spec)[1]];
  vrai('Filespec : /F et /UF « factur-x.xml », /AFRelationship /Alternative, /EF avec F et UF', /\/Type \/Filespec/.test(spec) && /\/F \(factur-x\.xml\)/.test(spec) && /\/UF \(factur-x\.xml\)/.test(spec) && /\/AFRelationship \/Alternative/.test(spec) && /\/EF << \/F \d+ 0 R \/UF \d+ 0 R >>/.test(spec), spec);
  vrai('le même Filespec est dans /Names /EmbeddedFiles et dans /AF', new RegExp('\\(factur-x\\.xml\\) ' + fs_ + ' 0 R').test(cat));
  vrai('EmbeddedFile : /Subtype /text#2Fxml, /Params /Size et /ModDate (D:20261028100000+00\'00\')', /\/Subtype \/text#2Fxml/.test(ef.dict) && new RegExp('/Params << /Size ' + ef.flux.length + ' /ModDate \\(D:20261028100000\\+00\'00\'\\)').test(ef.dict), ef.dict);
  vrai('⛔ le fichier joint EST le XML de la facture, octet pour octet (UTF-8)', ef.flux.equals(Buffer.from(XMLS.f1, 'utf8')), 'différent');
  vrai('(population) le XML joint contient des caractères non ASCII — l\'encodage UTF-8 est donc réellement éprouvé', ef.flux.length > Buffer.from(XMLS.f1, 'latin1').length - 1 && /[^\x00-\x7f]/.test(XMLS.f1));
  const sTemoin = pdfDe('f1', new Date('2026-10-28T10:00:00Z'));
  v('le PDF est reproductible à données et horloge égales (aucun hasard hors du /ID)', sTemoin, s);
  /* poppler, quand il est là : un lecteur indépendant */
  let poppler = true; try { cp.execFileSync('pdfinfo', ['-v'], { stdio: 'ignore' }); } catch (e) { poppler = false; }
  if (poppler) { const tmp = path.join(require('os').tmpdir(), 'test-3134-' + process.pid + '.pdf'); fs.writeFileSync(tmp, Buffer.from(s, 'latin1'));
    try { const info = cp.execFileSync('pdfinfo', [tmp], { encoding: 'utf8' }), pf = cp.execFileSync('pdffonts', [tmp], { encoding: 'utf8' });
      vrai('poppler (lecteur indépendant) : PDF 1.7, 1 page, métadonnées XMP, deux polices TrueType incorporées', /PDF version:\s+1\.7/.test(info) && /Pages:\s+1/.test(info) && /Metadata Stream:\s+yes/.test(info) && (pf.match(/TrueType\s+WinAnsi\s+yes yes/g) || []).length === 2, info + pf);
      const x = cp.execFileSync('pdfdetach', ['-list', tmp], { encoding: 'utf8' }); vrai('poppler : une pièce jointe, factur-x.xml', /1 embedded files/.test(x) && /factur-x\.xml/.test(x), x); }
    finally { try { fs.unlinkSync(tmp); } catch (e) { /* rien */ } } }
  else console.log('  · poppler absent ici : les lecteurs indépendants ne sont pas rejoués'); }

/* ═════════════ 8. LE PDF ET LE XML DISENT LA MÊME CHOSE ═════════════ */
titre('8. cohérence : le texte imprimé et le XML donnent les mêmes montants, au centime');
{ let diffs = [], n = 0;
  for (const f of W.db.factures.filter(x => x.id !== 'f10')) { const T = W.docTot(f), eur = x => Number(x).toFixed(2).replace('.', ',') + ' EUR';
    const pdf = W.docPdfStr('factures', f, null), xml = analyserXml(W.facturxXml(f)), s = trouver(xml, 'rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeSettlement/ram:SpecifiedTradeSettlementHeaderMonetarySummation')[0];
    n++; const lu = [texteDe(s, 'ram:LineTotalAmount'), texteDe(s, 'ram:TaxTotalAmount'), texteDe(s, 'ram:GrandTotalAmount')];
    if (lu.join('|') !== [T.ht.toFixed(2), T.tva.toFixed(2), T.ttc.toFixed(2)].join('|')) diffs.push([f.id, 'xml', lu]);
    for (const m of [eur(T.ht), eur(T.tva), eur(T.ttc)]) if (!pdf.includes('(' + m + ')')) diffs.push([f.id, 'pdf', m]); }
  v('onze factures : le PDF imprime exactement le HT, la TVA et le TTC que le XML porte', [n, diffs], [11, []]);
  v('⛔ f11 (1,00 € à 5,5 %) : TVA 0,06 et TTC 1,06 — l\'ancienne arithmétique affichait 1,05 — au PDF comme au XML', [W.docTot(facture('f11')).tva, W.docTot(facture('f11')).ttc, /\(1,06 EUR\)/.test(W.docPdfStr('factures', facture('f11'), null)), texteDe(analyserXml(W.facturxXml(facture('f11'))), 'rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeSettlement/ram:SpecifiedTradeSettlementHeaderMonetarySummation/ram:GrandTotalAmount')], [0.06, 1.06, true, '1.06']);
  v('⛔ f12 (0,15 € à 10 %) : TVA 0,02, TTC 0,17 — au PDF comme au XML', [W.docTot(facture('f12')).tva, /\(0,02 EUR\)/.test(W.docPdfStr('factures', facture('f12'), null)), /\(0,17 EUR\)/.test(W.docPdfStr('factures', facture('f12'), null))], [0.02, true, true]);
  /* l'impression (printDoc) lit les mêmes montants */
  const P = O.monter(BASE); let html = ''; P.window = { open() { return { document: { write(h) { html = h; }, close() {} }, focus() {}, print() {} }; } };
  try { require('vm').runInContext(O.decoupe('function printDoc(') + '\nglobalThis.__printDoc = printDoc;', P); } catch (e) { html = 'ERREUR ' + e.message; }
  vrai('printDoc s\'extrait et s\'exécute (population)', typeof P.__printDoc === 'function', html);
  if (typeof P.__printDoc === 'function') { P.__printDoc('factures', 'f6'); const T = W.docTot(facture('f6'));
    vrai('l\'aperçu imprimable porte le SIREN du client, la nature, l\'adresse de livraison et le TTC du XML', /SIREN 552 081 317/.test(html) && /Nature de l'opération : Livraison de biens\./.test(html) && /Adresse de livraison : 8 quai Marchand/.test(html) && html.includes(P.eur(T.ttc)), html.slice(0, 200));
    P.__printDoc('factures', 'f7'); vrai('… et l\'échéance posée (05/11/2026) plutôt que date + 30 jours', /05\/11\/2026/.test(html)); } }

/* ═════════════ 8 bis. LES TROIS CONSTATS DU VÉRIFICATEUR (28 octobre 2026) ═════════════ */
titre('8 bis. moyens de paiement réels, franchise en base réservée aux vendeurs sans n° de TVA, arrondi exact, notes L441-10, adresses électroniques');
{ const MP = require('vm').runInContext('(' + O.decoupe('const MOYENS_PAIEMENT =').replace(/^const MOYENS_PAIEMENT =\s*/, '').replace(/;\s*$/, '') + ')', W);
  v('(population) MOYENS_PAIEMENT est lu dans app.html : huit libellés', MP.length, 8);
  const code = l => W.fxMoyenCode(l);
  v('⛔ constat 2 : les HUIT libellés réels de l\'application donnent leur code (A carte 48, B lien 68, C espèces 10, D chèque 20, E/F/G 1, H virement 30)', MP.map(code), ['48', '68', '10', '20', '1', '1', '1', '30']);
  v('… un libellé sans lettre se lit au mot (accents et casse ignorés)', ['Carte bancaire', 'ESPÈCES', 'chèque', 'Virement SEPA', 'Lien de paiement'].map(code), ['48', '10', '20', '30', '68']);
  v('… vide : aucun moyen inventé ; un libellé inconnu : « instrument non défini » (1)', [code(''), code(undefined), code('   '), code('Bitcoin'), code('Z) Troc')], ['', '', '', '1', '1']);
  /* par le XML, avec l'IBAN du vendeur : chaque libellé réel sur une facture réglée */
  const XM = lib => { const f = Object.assign({}, facture('f5'), { moyenPaiement: lib }); return analyserXml(W.facturxXml(f)); };
  const moy = x => trouver(x, 'rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeSettlement/ram:SpecifiedTradeSettlementPaymentMeans').map(n => texteDe(n, 'ram:TypeCode'));
  v('… facture RÉGLÉE : le XML porte le code de chacun des huit libellés (un SpecifiedTradeSettlementPaymentMeans à chaque fois)', MP.map(l => moy(XM(l)).join()), ['48', '68', '10', '20', '1', '1', '1', '30']);
  v('… tous ces codes sont dans la liste officielle (verifierCodes) et le XML reste valide au schéma', MP.map(l => { const x = XM(l), e = []; verifierSchema(x, SCHEMA.racine, 'CrossIndustryInvoice', e); return verifierCodes(x).concat(e, reglesMetier(x)).length; }), MP.map(() => 0));
  v('… réglée sans moyen noté : pas de moyen (rien d\'inventé)', moy(XM('')), []);

  /* ── constat 3 : la franchise en base ne se dit que d'un vendeur sans n° de TVA ── */
  const manqueF = (X, id) => X.facturxPrerequis(X.db.factures.find(f => f.id === id));
  vrai('⛔ constat 3 : vendeur avec n° de TVA, facture à 0 % : REFUSÉE, avec « le motif d\'exonération »', manqueF(W, 'f4').some(x => /motif d'exonération/.test(x)));
  vrai('… le même vendeur à 20 % : rien de tel', !manqueF(W, 'f1').some(x => /motif d'exonération/.test(x)));
  vrai('… un vendeur SANS n° de TVA (franchise) à 0 % : acceptée', manqueF(WF, 'f4').length === 0, manqueF(WF, 'f4'));
  const x4 = analyserXml(W.facturxXml(facture('f4'))), t4 = trouver(x4, 'rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeSettlement/ram:ApplicableTradeTax')[0];
  vrai('… et même si le fichier était fabriqué quand même : ni catégorie E, ni « 293 B », ni VATEX-FR-FRANCHISE (jamais une fausse franchise)',
    texteDe(t4, 'ram:CategoryCode') === 'Z' && !trouver(t4, 'ram:ExemptionReason').length && !trouver(t4, 'ram:ExemptionReasonCode').length && !/293 B/.test(W.facturxXml(facture('f4'))), W.facturxXml(facture('f4')).slice(0, 80));
  v('… le vendeur avec n° de TVA garde le sien (VA) et ne reçoit pas le « FC » de la franchise', trouver(trouver(x4, 'rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeAgreement/ram:SellerTradeParty')[0], 'ram:SpecifiedTaxRegistration/ram:ID').map(n => n.attrs.schemeID), ['VA']);
  v('… la franchise (WF) : E, « 293 B », VATEX-FR-FRANCHISE et l\'identifiant « FC » du SIREN', [XMLS['f4'] && texteDe(trouver(analyserXml(XMLS['f4']), 'rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeSettlement/ram:ApplicableTradeTax')[0], 'ram:CategoryCode'), /293 B/.test(XMLS['f4']), /VATEX-FR-FRANCHISE/.test(XMLS['f4']), /schemeID="FC">732829320</.test(XMLS['f4'])], ['E', true, true, true]);
  { const h = (X, id) => X.docPdfStr('factures', X.db.factures.find(f => f.id === id), null);
    v('… PDF : 293 B pour la franchise (WF), pas pour l\'assujetti (W) — même facture à 0 %', [h(WF, 'f4').includes('293 B'), h(W, 'f4').includes('293 B')], [true, false]);
    const P2 = O.monter(BASE); let html2 = ''; P2.window = { open() { return { document: { write(x) { html2 = x; }, close() {} }, focus() {}, print() {} }; } };
    require('vm').runInContext(O.decoupe('function printDoc(') + '\nglobalThis.__printDoc = printDoc;', P2);
    const P3 = O.monter(Object.assign({}, BASE, { entreprise: Object.assign({}, BASE.entreprise, { tvaIntra: '' }) })); let html3 = ''; P3.window = { open() { return { document: { write(x) { html3 = x; }, close() {} }, focus() {}, print() {} }; } };
    require('vm').runInContext(O.decoupe('function printDoc(') + '\nglobalThis.__printDoc = printDoc;', P3);
    P2.__printDoc('factures', 'f4'); P3.__printDoc('factures', 'f4');
    v('… aperçu imprimable (printDoc) : 293 B pour la franchise seulement', [/293 B/.test(html3), /293 B/.test(html2)], [true, false]);
    vrai('(population) l\'aperçu imprimable est bien celui de la facture f4, avec son TTC', html2.includes(P2.eur(P2.docTot(P2.db.factures.find(f => f.id === 'f4')).ttc)) && html3.length > 500); }

  const LIG = require('vm').runInContext('ligTotLigne', W);
  /* ── l'arrondi de ligne : 2,5 × 77,77 = 194,425 → 194,43 (Mustang recalcule 194,43 ; toFixed rendait 194,42) ── */
  v('⛔ ligTotLigne : 2,5 × 77,77 = 194,43 (demi vers le haut sur la valeur décimale)', [LIG({ qte: 2.5, pu: 77.77 }), LIG({ qte: 1, pu: 0.15 }), LIG({ qte: 3, pu: 33.5 })], [194.43, 0.15, 100.5]);
  { let graine = 11; const rnd = () => (graine = (graine * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; let faux = 0, n = 0, demis = 0;
    for (let i = 0; i < 40000; i++) { const q = Math.round(rnd() * 100000) / 1000, p = Math.round(rnd() * 100000) / 100;   // quantité à 3 décimales, prix à 2
      const exact = BigInt(Math.round(q * 1000)) * BigInt(Math.round(p * 100));   // en millièmes de centime... (q×1000)(p×100) = produit × 10^5
      const cent = (exact + 500n) / 1000n;   // produit × 100, demi vers le haut : exact/10^5 → centimes = exact/10^3
      if (exact % 1000n === 500n) demis++;
      n++; if (BigInt(Math.round(LIG({ qte: q, pu: p }) * 100)) !== cent) faux++; }
    v('40 000 lignes tirées au hasard (quantité à 3 décimales) : la ligne égale le calcul en entiers exacts, demi vers le haut', [n, faux], [40000, 0]);
    vrai('(population) il y avait de vrais demis dans le tirage — l\'égalité est éprouvée là où le défaut vivait : ' + demis, demis > 50); }

  /* ── BR-FR-05 : trois notes distinctes ── */
  const notes = x => trouver(x, 'rsm:ExchangedDocument/ram:IncludedNote').map(n => texteDe(n, 'ram:SubjectCode'));
  v('constat Mustang BR-FR-05 : PMD (pénalités), PMT (indemnité de 40 €) et AAB (escompte) sont trois notes', notes(analyserXml(XMLS.f1)), ['PMD', 'PMT', 'AAB']);
  vrai('… la note PMD parle des pénalités et pas de l\'indemnité ; la PMT de l\'indemnité de 40 EUR', (n => /pénalités/.test(texteDe(n[0], 'ram:Content')) && !/40 EUR/.test(texteDe(n[0], 'ram:Content')) && /40 EUR/.test(texteDe(n[1], 'ram:Content')))(trouver(analyserXml(XMLS.f1), 'rsm:ExchangedDocument/ram:IncludedNote')));
  /* ── BR-FR-12 / BR-FR-13 : adresses électroniques ── */
  const uri = (x, partie) => trouver(trouver(x, 'rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeAgreement/ram:' + partie)[0], 'ram:URIUniversalCommunication/ram:URIID').map(n => [n.texte, n.attrs.schemeID]);
  v('constat Mustang BR-FR-12/13 : vendeur et acheteur portent leur courriel (BT-34, BT-49), schéma EM', [uri(analyserXml(XMLS.f1), 'SellerTradeParty'), uri(analyserXml(XMLS.f1), 'BuyerTradeParty')], [[['compta@excellence.example', 'EM']], [['elise@exemple.fr', 'EM']]]);
  { const sans = O.monter(Object.assign({}, BASE, { clients: BASE.clients.map(c => c.id === 'c1' ? Object.assign({}, c, { email: 'pas un courriel' }) : c) }));
    v('… un courriel illisible n\'est pas écrit (rien d\'inventé)', uri(analyserXml(sans.facturxXml(sans.db.factures[0])), 'BuyerTradeParty'), []); } }

/* ═════════════ 9. LES GESTES : BOUTON, ENVOI, SAISIE ═════════════ */
titre('9. les gestes : le bouton, l\'envoi, la saisie — et jamais « conforme »');
{ const vm = require('vm');
  const G = O.monter(BASE); let modal = '', toasts = [], blobs = [], clicks = 0;
  Object.assign(G, { openModal(h) { modal = h; }, closeModal() {}, document: { createElement() { return { click() { clicks++; }, remove() {}, set href(x) { this._h = x; }, get href() { return this._h; }, set download(x) { this._d = x; }, get download() { return this._d; } }; }, body: { appendChild() {} } },
    URL: { createObjectURL(b) { blobs.push(b); return 'blob:x'; }, revokeObjectURL() {} }, Blob: class { constructor(p, o) { this.parts = p; this.type = o.type; } }, setTimeout() {}, devisLogoJpeg: async () => null });
  vm.runInContext('toast=function(m){ __toasts.push(String(m)); }; globalThis.__t=__toasts;', G);
  vm.runInContext(['async function docPdfChaine(', 'async function facturxPdfChaine(', 'function facturxManque(', 'async function exportFacturX('].map(h => O.decoupe(h)).join('\n'), G);
  const lancer = async id => { modal = ''; blobs = []; clicks = 0; G.__t.length = 0; await G.exportFacturX(id); };
  (async () => {
    await lancer('f1');
    vrai('le bouton sur une facture complète : un fichier PDF téléchargé (un clic), nommé FAC-2026-001-facturx.pdf', blobs.length === 1 && clicks === 1 && blobs[0].type === 'application/pdf', [blobs.length, clicks]);
    const bytes = blobs[0] && blobs[0].parts[0], pdf = bytes ? Buffer.from(bytes).toString('latin1') : '';
    vrai('… ce fichier est un PDF Factur-X : %PDF-1.7, polices incorporées, factur-x.xml en pièce jointe', /^%PDF-1\.7/.test(pdf) && !/\/BaseFont \/Helvetica/.test(pdf) && /\(factur-x\.xml\)/.test(pdf));
    vrai('⛔ le message dit ce que c\'est — profil EN 16931 — et que ce n\'est PAS le dépôt sur une plateforme agréée ; il ne dit pas « conforme »', /EN 16931/.test(G.__t[0]) && /plateforme agréée/.test(G.__t[0]) && !/conform/i.test(G.__t.join(' ')), G.__t);
    await lancer('f10');
    vrai('sur une facture à un particulier : pas de fichier, la liste de ce qui manque s\'ouvre', blobs.length === 0 && /client professionnel/.test(modal) && /il manque/i.test(modal), modal.slice(0, 200));
    const X = O.monter(Object.assign({}, BASE, { clients: BASE.clients.map(c => c.id === 'c1' ? Object.assign({}, c, { siren: '' }) : c) }));
    vrai('(population) la facture sans SIREN client a bien un prérequis manquant', X.facturxPrerequis(X.db.factures[0]).length >= 1);
    vrai('⛔ ni la fenêtre ni le code des gestes ne prétendent à la conformité', !/conform/i.test(SRC.slice(SRC.indexOf('async function facturxPdfChaine('), SRC.indexOf('async function exportFacturX(') + 1800)));
    /* envoiDoc : le PDF joint */
    const E = O.monter(BASE); let envoi = null;
    Object.assign(E, { permGarde: () => true, savedCount: 0, save() {}, rapportSociete: () => 'Nettoyage Excellence SARL', docMailOpts: () => undefined, genDocTexte: () => 'texte', btoa: s => Buffer.from(s, 'latin1').toString('base64'), current: '', views: {}, devisLogoJpeg: async () => null,
      envoiGarde: (k, fn) => fn(), srvMail: async (to, sujet, texte, ok, type, x, opts) => { envoi = { to, opts }; return true; }, confirm: () => false });
    vm.runInContext(['async function docPdfChaine(', 'function envoiDoc('].map(h => O.decoupe(h)).join('\n') + '\nglobalThis.__envoi = envoiDoc;', E);
    const envoyer = async (id, mod) => { envoi = null; if (mod) mod(E); await E.__envoi('factures', id, 'mail'); return envoi && Buffer.from(envoi.opts.atts[0].content, 'base64').toString('latin1'); };
    const p1 = await envoyer('f1'); vrai('envoi d\'une facture complète à un client professionnel : le PDF joint est le Factur-X', /^%PDF-1\.7/.test(p1 || '') && /\(factur-x\.xml\)/.test(p1 || ''));
    vrai('… son nom de fichier est celui du PDF ordinaire (le destinataire reçoit « Facture-FAC-2026-001.pdf »)', envoi && /^Facture-FAC-2026-001\.pdf$/.test(envoi.opts.atts[0].filename), envoi && envoi.opts.atts[0].filename);
    const p2 = await envoyer('f10'); vrai('à un particulier : le PDF ordinaire, comme avant (pas de PDF/A, pas de pièce jointe)', /^%PDF-1\.4/.test(p2 || '') && !/factur-x/.test(p2 || ''));
    E.db.clients.find(c => c.id === 'c1').email = 'elise@exemple.fr'; E.db.clients.find(c => c.id === 'c1').siren = '';
    const p3 = await envoyer('f1'); vrai('⛔ une information manquante ne BLOQUE pas l\'envoi : le PDF ordinaire part, comme avant', /^%PDF-1\.4/.test(p3 || '') && envoi && envoi.to === 'elise@exemple.fr');
    /* la saisie : le client et le document */
    const C = O.monter(BASE); let ecrit = 0; const toasts2 = [];
    Object.assign(C, { permGarde: () => true, closeModal() {}, go() {}, current: '', save() { ecrit++; }, cliDoublon: () => null, cliLocaliserFond() {}, logEvent() {}, uid: () => 'nouveau', currentUser: { id: 'u' }, confirm: () => true, nomNorm: s => s,
      toast: m => toasts2.push(m), FormData: class { constructor(f) { this.d = f.__d; } *[Symbol.iterator]() { for (const e of Object.entries(this.d)) yield e; } entries() { return Object.entries(this.d)[Symbol.iterator](); } } });
    vm.runInContext(['function saveClientForm(', 'function cliLieuApres(', 'function cliRetouche('].map(h => O.decoupe(h)).join('\n') + '\nglobalThis.__sc = saveClientForm;', C);
    const form = d => ({ preventDefault() {}, target: { __d: Object.assign({ nom: 'Boulangerie Élise SAS', adresse: '12 rue du Port, 17100 Saintes' }, d) } });
    C.__sc(form({ siren: '552081318' }), 'c1'); vrai('saveClientForm refuse un SIREN dont la clé est fausse — AVANT toute écriture', ecrit === 0 && /SIREN invalide/.test(toasts2[0] || ''), toasts2);
    C.__sc(form({ tvaIntra: 'FR00123' }), 'c1'); vrai('… et un n° de TVA invalide', ecrit === 0 && /TVA invalide/.test(toasts2[1] || ''));
    C.__sc(form({ siren: '552 081 317 00039', tvaIntra: 'fr 03 552081317' }), 'c1');
    vrai('un SIRET collé est enregistré en SIREN (9 chiffres) et la fiche s\'écrit', ecrit === 1 && C.db.clients[0].siren === '552081317' && C.db.clients[0].tvaIntra === 'fr 03 552081317', C.db.clients[0]);
    C.__sc(form({ siren: '' }), 'c1'); vrai('un SIREN vidé se vide (jamais un ancien qui survit)', C.db.clients[0].siren === '');
    /* le formulaire de facture et son enregistrement : lus dans le code */
    vrai('formDoc propose la nature de l\'opération, l\'échéance et l\'adresse de livraison — aux factures seulement', /kind==='factures'\?`<div class="field-row"><div class="field"><label>Nature de l'opération<\/label><select name="nature">/.test(SRC) && /name="echeance"/.test(SRC) && /name="adresseLivraison"/.test(SRC));
    vrai('saveDoc enregistre ces trois champs pour une facture et refuse une échéance antérieure à la date', /doc\.nature=DOC_NATURES\[f\.nature\]\?f\.nature:'services'/.test(SRC) && /f\.echeance<f\.date/.test(SRC));
    vrai('la fiche client propose le SIREN et le n° de TVA ; « Mon entreprise » propose l\'option pour la taxe d\'après les débits et la lit à l\'enregistrement', /name="siren"/.test(SRC) && /name="tvaIntra"/.test(SRC) && /id="ent-tvadebits"/.test(SRC) && /tvaDebits:!!\(document\.getElementById\('ent-tvadebits'\)/.test(SRC));
    vrai('la liste des factures : le bouton « Factur-X » appelle exportFacturX', /onclick="exportFacturX\('\$\{f\.id\}'\)"[^>]*>Factur-X<\/button>/.test(SRC));
    vrai('docEntete porte l\'option débits avec la même règle de bloc que le SIRET (société distincte : la sienne)', /tvaDebits:!!L\.tvaDebits/.test(SRC));
    console.log('\n════ test-3134 : ' + ok + ' ✓  ' + ko + ' ✗ ════'); process.exit(ko ? 1 : 0);
  })().catch(e => { console.log('  ✗ le banc des gestes est mort : ' + (e && e.stack || e)); console.log('\n════ test-3134 : ' + ok + ' ✓  ' + (ko + 1) + ' ✗ ════'); process.exit(1); });
}

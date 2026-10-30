/* ⛔ CE QUE CE FICHIER GARDE — LES DOCUMENTS AUX COULEURS DE L'ENTREPRISE, ET LE CACHET (30 octobre 2026, v783).

   Justin : « pour les devis, que ce soit aux couleurs de TEAM OP, plus le vert ; proposer aux clients de choisir les couleurs de leur PDF dans les
   paramètres » ; « ajouter le logo de l'entreprise et aussi leur cachet, s'ils veulent, sur les devis ou les factures ».
     1. la couleur : une société déclarée garde la sienne ; sinon `db.entreprise.couleurDoc` ; sinon le marine de TEAM OP — jamais le vert d'avant ;
     2. le dessin (les VRAIES fonctions, PDF fabriqué) : la couleur choisie est dans le PDF ; une couleur claire (jaune) ne porte pas de blanc ;
     3. le cachet : coupé par défaut, réglé à part pour les devis et les factures, jamais sur le document d'une société à SIRET propre (une autre
        entreprise), et quand il est demandé, l'image est bien DANS le PDF (/I2) — sinon elle n'y est pas ;
     4. aucune fabrique de document ne retombe plus sur le vert écrit en dur. */
const fs = require('fs'), vm = require('vm'), path = require('path');
const R = path.join(__dirname, '..'), APP = fs.readFileSync(path.join(R, 'app.html'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, c) => v(t, !!c, true);
function decoupe(h) { const d = APP.indexOf(h); if (d < 0) throw new Error('introuvable : ' + h);
  const suiv = ['\nfunction ', '\nasync function ', '\nconst ', '\nlet ', '\n/*'].map(x => APP.indexOf(x, d + h.length)).filter(x => x > 0);
  let bout = APP.slice(d, Math.min(...suiv));
  for (;;) { const k = Math.max(bout.lastIndexOf('}'), bout.lastIndexOf(';')); if (k < 0) break; const t = bout.slice(0, k + 1); try { new Function(t); return t; } catch (e) { bout = bout.slice(0, k); } }
  throw new Error('fin introuvable : ' + h); }
const FN = ['const DOC_COULEUR_DEFAUT=', 'const DOC_COULEURS=', 'function docCouleurEnt(', 'function socNom(', 'function rapportSociete(', 'function docEntete(', 'function docCoordLignes(', 'function socStyle(',
  'function entSocUnique(', 'function entSocietes(', 'function entNom(', 'function entNomDoc(', 'function docCachetPour(', 'function _pdfTranslit(', 'function _pdfTxt(', 'const _PDF_L=', 'function _pdfLarg(',
  'function _pdfCoupe(', 'function _pdfEnLignes(', 'function docPdfStr(', 'function encreSur('];
function monter(db) {
  const W = { console, Object, JSON, String, Math, Date, Array, Number, parseInt, parseFloat, isNaN, Uint8Array, localStorage: { getItem: () => null }, atob: s => Buffer.from(s, 'base64').toString('latin1') };
  W.db = JSON.parse(JSON.stringify(db)); vm.createContext(W);
  vm.runInContext([decoupe('const REPORT_TEMPLATES ='), decoupe('const isoDe ='), ...FN.map(decoupe),
    `function todayISO(){ return '2026-10-30'; } const ligTotLigne=l=>Math.round((Number(l.qte)||0)*(Number(l.pu)||0)*100)/100;`].join('\n'), W);
  return W; }
const BASE = { entreprise: { nom: 'Plomberie Zéphyr', cp: '17000', ville: 'La Rochelle' }, societes: ['Zéphyr Sud', 'Zéphyr Nom'],
  societesStyle: { 'Zéphyr Sud': { couleur: '#C0392B', siret: '22222222200022' }, 'Zéphyr Nom': {} },
  clients: [{ id: 'c', nom: 'Client Quidam' }],
  devis: [{ id: 'd', num: 'DQ-1', clientId: 'c', date: '2026-10-30', tva: 20, lignes: [{ designation: 'Pose', qte: 1, pu: 100 }] }] };
const CACHET = { b64: Buffer.from('JPEGZQX-CACHET').toString('base64'), w: 300, h: 150 };
const rg = (pdf) => (pdf.match(/[\d.]+ [\d.]+ [\d.]+ rg/g) || []);
const hexRg = hx => [1, 3, 5].map(i => (parseInt(hx.slice(i, i + 2), 16) / 255).toFixed(3)).join(' ') + ' rg';

console.log('\n── 3234 · 1. la couleur des documents ──');
{ const W = monter(BASE);
  v('par défaut : le marine de TEAM OP (#152340) — plus le vert', [W.docCouleurEnt(), W.docEntete('').couleur], ['#152340', '#152340']);
  vrai('(population) la palette proposée commence par le marine et compte huit couleurs', W.DOC_COULEURS === undefined ? vm.runInContext('DOC_COULEURS.length===8&&DOC_COULEURS[0][0]==="#152340"', W) : true);
  const W2 = monter({ ...BASE, entreprise: { ...BASE.entreprise, couleurDoc: '#8B1E3F' } });
  v('la couleur choisie par l’entreprise sert ses documents', W2.docEntete('').couleur, '#8B1E3F');
  v('⛔ une société déclarée garde SA couleur', W2.docEntete('Zéphyr Sud').couleur, '#C0392B');
  v('une société sans couleur prend celle de l’entreprise', W2.docEntete('Zéphyr Nom').couleur, '#8B1E3F');
  v('une valeur abîmée ne passe pas : le marine', monter({ ...BASE, entreprise: { couleurDoc: 'rouge' } }).docCouleurEnt(), '#152340'); }

console.log('\n── 3234 · 2. le dessin ──');
{ const W = monter({ ...BASE, entreprise: { ...BASE.entreprise, couleurDoc: '#8B1E3F' } });
  const pdf = W.docPdfStr('devis', W.db.devis[0], null, null);
  vrai('(population) un vrai PDF', /^%PDF-1\.4/.test(pdf) && /%%EOF$/.test(pdf));
  vrai('la couleur choisie est dans le PDF', rg(pdf).includes(hexRg('#8B1E3F')));
  vrai('⛔ et le vert d’avant n’y est plus', !rg(pdf).includes(hexRg('#1E7A4E')));
  const Wj = monter({ ...BASE, entreprise: { ...BASE.entreprise, couleurDoc: '#F2C94C' } }), pj = Wj.docPdfStr('devis', Wj.db.devis[0], null, null);
  const iT = pj.indexOf('(TOTAL TTC)'), avant = pj.slice(Math.max(0, iT - 200), iT);
  vrai('⛔ sur un jaune, « TOTAL TTC » s’écrit en encre sombre, pas en blanc', iT > 0 && /0\.07 0\.09 0\.13 rg[^]*$/.test(avant) && !/1 1 1 rg\nBT\n[^\n]*\n[^\n]*\n\(TOTAL TTC\)/.test(pj.slice(iT - 80, iT + 12)));
  const Wm = monter(BASE), pm = Wm.docPdfStr('devis', Wm.db.devis[0], null, null), im = pm.indexOf('(TOTAL TTC)');
  vrai('… et sur le marine, en blanc', /1 1 1 rg\nBT/.test(pm.slice(im - 60, im))); }

console.log('\n── 3234 · 3. le cachet ──');
{ const E0 = { ...BASE.entreprise, cachet: 'data:image/jpeg;base64,AAAA' };
  const W = monter({ ...BASE, entreprise: E0 }), d = W.db.devis[0];
  v('⛔ coupé par défaut : ni devis ni facture', [W.docCachetPour('devis', d), W.docCachetPour('factures', d)], ['', '']);
  const Wf = monter({ ...BASE, entreprise: { ...E0, cachetFacture: true } });
  v('« sur les factures » : la facture oui, le devis non', [!!Wf.docCachetPour('factures', d), !!Wf.docCachetPour('devis', d)], [true, false]);
  const Wd = monter({ ...BASE, entreprise: { ...E0, cachetDevis: true } });
  v('« sur les devis » : le devis oui, la facture non', [!!Wd.docCachetPour('devis', d), !!Wd.docCachetPour('factures', d)], [true, false]);
  v('⛔ jamais sur le document d’une société à SIRET propre (le tampon d’une autre entreprise)', Wd.docCachetPour('devis', { ...d, rapportModele: 'Zéphyr Sud' }), '');
  v('… mais sur un nom commercial de l’entreprise, oui', !!Wd.docCachetPour('devis', { ...d, rapportModele: 'Zéphyr Nom' }), true);
  v('sans cachet enregistré, rien', monter({ ...BASE, entreprise: { ...BASE.entreprise, cachetDevis: true } }).docCachetPour('devis', d), '');
  const avec = W.docPdfStr('devis', d, null, CACHET), sans = W.docPdfStr('devis', d, null, null), fac = W.docPdfStr('factures', { ...d, statut: 'envoyee' }, null, CACHET);
  vrai('⛔ demandé, le cachet est DANS le devis (image /I2, dessinée, « Pour l’entreprise »)', /\/I2 \d+ 0 R/.test(avec) && /\/I2 Do/.test(avec) && avec.includes('JPEGZQX-CACHET') && /Pour l.entreprise/.test(avec));
  vrai('… et dans la facture', /\/I2 Do/.test(fac) && fac.includes('JPEGZQX-CACHET'));
  vrai('⛔ non demandé, aucune trace', !/\/I2/.test(sans) && !sans.includes('JPEGZQX') && !/Pour l.entreprise/.test(sans)); }

console.log('\n── 3234 · 4. plus de vert écrit en dur dans les fabriques ──');
{ const CODE = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
  v('aucune fabrique ne retombe sur « :\'#1E7A4E\' » pour une couleur de document', (CODE.match(/E\.couleur:'#1E7A4E'|\|\|'#1E7A4E',\n/g) || []).length, 0);
  vrai('les quatre fabriques et la liste des sociétés passent par docCouleurEnt', (CODE.match(/E\.couleur:docCouleurEnt\(\)/g) || []).length === 4 && /st\.couleur:docCouleurEnt\(\)/.test(CODE));
  vrai('Paramètres : la palette, le logo et le cachet sont dans « Mes documents »', /🎨 Mes documents/.test(APP) && /id="doc-coul-zone"/.test(APP) && /id="doc-logo-file"/.test(APP) && /id="doc-cachet-zone"/.test(APP)); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);

/* ══ v740 — CHAQUE DOCUMENT PORTE LA SOCIÉTÉ DE SON INTERVENTION ═══════════════════════════════
   Justin, 23 septembre 2026 : « pour les PDF selon les interventions ou autres, chaque en-tête doit
   reconnaître l'entreprise qui est sur l'intervention, pour que le client reçoive bien le bon PDF ;
   aussi à tester ».

   Recensé ce jour-là : quinze fabriques de documents et CINQ façons de choisir la société ; le
   générique s'imprimait « OP GESTION » (le nom du LOGICIEL) chez les clients ; une facture de la
   société B portait le SIRET, la TVA et l'IBAN de A ; une société sans logo empruntait celui de
   l'entreprise principale ; le plan d'implantation prenait la société de la DERNIÈRE intervention du
   client (annulées et futures comprises) ; « Prévenir les clients » signait tous les messages du nom
   global ; le Factur-X lisait un champ qui n'existe sur aucune facture.

   Ce banc EXÉCUTE la règle (docEntete et ses voisines) et les fabriques qui s'exécutent sans DOM
   (le PDF du devis, de la facture et du bon ; l'impression d'un devis ou d'une facture), puis
   RECENSE par le texte toutes les fabriques du fichier : chacune passe par docEntete (ou bcEntete),
   ou elle est NOMMÉE comme interne, avec sa raison. La mesure dans une vraie page, captures à
   l'appui, est `scratchpad/sonde-entetes.js`. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function decoupe(h) { const d = APP.indexOf(h); if (d < 0) throw new Error('introuvable : ' + h);
  const suite = /\n(?=(?:function |const |let |var |class |async function |\/\* |views\.|document\.|window\.|try\{))/g;
  suite.lastIndex = d + h.length;
  const m = suite.exec(APP); const fin = m ? m.index : Math.min(APP.length, d + 80000);
  let bout = APP.slice(d, fin);
  for (;;) { const k = Math.max(bout.lastIndexOf('}'), bout.lastIndexOf(';')); if (k < 0) break;
    const t = bout.slice(0, k + 1);
    try { new Function(t); return t; } catch (e) { bout = bout.slice(0, k); } }
  throw new Error('fin introuvable : ' + h); }
function corps(nom) { const m = new RegExp('(?:async\\s+)?function ' + nom + '\\(').exec(SRC); if (!m) return '';
  let i = SRC.indexOf('{', m.index), p = 0;
  for (let k = i; k < SRC.length; k++) { if (SRC[k] === '{') p++; else if (SRC[k] === '}') { p--; if (!p) return SRC.slice(m.index, k + 1); } }
  return ''; }

const BASE = {
  entreprise: { nom: 'Nettoyage Excellence SARL', adresse: '1 rue de la Mairie', cp: '17000', ville: 'La Rochelle', siret: '11111111100011',
    tvaIntra: 'FR11111111111', iban: 'FR76 1111', bic: 'EXCLFRPP', tel: '0500000000', logo: 'data:E', enteteBC: '' },
  societes: ['Alpha Nuisibles', 'Bêta Hygiène'],
  societesStyle: { 'Alpha Nuisibles': { couleur: '#C0392B', logo: 'data:A', raison: 'Alpha Nuisibles SAS', siret: '22222222200022', adresse: '2 quai Alpha', cp: '33000', ville: 'Bordeaux', iban: 'FR76 2222' },
    'Bêta Hygiène': { couleur: '#2E86C1' } },
  clients: [{ id: 'cX', nom: 'Boulangerie Élise', email: 'elise@exemple.fr' }],
  interventions: [
    { id: 'i1', clientId: 'cX', date: '2026-09-10', statut: 'terminee', rapportModele: 'Alpha Nuisibles' },
    { id: 'i2', clientId: 'cX', date: '2026-09-15', statut: 'terminee', rapportModele: 'Bêta Hygiène' },
    { id: 'i3', clientId: 'cX', date: '2026-09-20', statut: 'annulee', rapportModele: 'Alpha Nuisibles' },
    { id: 'i4', clientId: 'cX', date: '2099-01-01', statut: 'planifiee', rapportModele: 'Alpha Nuisibles' }],
  devis: [{ id: 'dA', num: 'DV-1', clientId: 'cX', date: '2026-09-10', tva: 20, rapportModele: 'Alpha Nuisibles', lignes: [{ designation: 'Dératisation', qte: 1, pu: 100 }], statut: 'brouillon' },
          { id: 'dG', num: 'DV-2', clientId: 'cX', date: '2026-09-10', tva: 20, rapportModele: 'Modèle générique', lignes: [{ designation: 'X', qte: 1, pu: 10 }] }],
  factures: [{ id: 'fB', num: 'FA-1', clientId: 'cX', date: '2026-09-15', tva: 20, rapportModele: 'Bêta Hygiène', statut: 'envoyee', lignes: [{ designation: 'Désinsectisation', qte: 2, pu: 50 }] },
             { id: 'fA', num: 'FA-2', clientId: 'cX', date: '2026-09-10', tva: 0, rapportModele: 'Alpha Nuisibles', statut: 'payee', datePaiement: '2026-09-12', lignes: [{ designation: 'Y', qte: 1, pu: 80 }] }],
  bons: [{ id: 'bA', societe: 'Alpha Nuisibles', lignes: [] }, { id: 'b0', societe: '', lignes: [] }], fournisseurs: [] };
const FN = ['function socNom(', 'function rapportSociete(', 'function docEntete(', 'function docCoordLignes(', 'function docMailOpts(', 'function intSocMailOpts(',
  'function docSocMailOpts(', 'function socDuClient(', 'function papSocOf(', 'function socStyle(', 'function entSocUnique(', 'function entSocietes(', 'function entNom(',
  'function bcEntete(', 'function bcCouleur(', 'function _pdfTxt(', 'const _PDF_L=', 'function _pdfLarg(', 'function docPdfStr(', 'function devisPdfStr(', 'function bonPdfStr(', 'function printDoc('];
function monter(base) {
  const W = { console, Object, JSON, String, Math, Date, Array, Number, Uint8Array, __html: '',
    localStorage: { getItem: () => null }, atob: s => Buffer.from(s, 'base64').toString('latin1') };
  W.db = JSON.parse(JSON.stringify(base)); vm.createContext(W);
  vm.runInContext([decoupe('const REPORT_TEMPLATES ='), decoupe('const isoDe ='), ...FN.map(decoupe),
    `function todayISO(){ return '2026-09-23'; } function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]); }
     function eur(n){ return Number(n||0).toFixed(2)+' €'; } function encreSur(){ return '#fff'; } function toast(){}
     const ligTotLigne=l=>Math.round((Number(l.qte)||0)*(Number(l.pu)||0)*100)/100;
     function docTot(d){ const ht=(d.lignes||[]).reduce((s,l)=>s+ligTotLigne(l),0), tva=ht*(+d.tva||0)/100; return {ht,tva,ttc:ht+tva}; }
     function bonNum(b){ return 'BC-'+b.id; } function bonQteTxt(){ return '1 u'; } function bonQteTotTxt(){ return '0 u'; }
     const DOC={devis:{coll:'devis',titre:'Devis',un:'devis',st:{}},factures:{coll:'factures',titre:'Facture',un:'facture',st:{}}};
     const window={ open(){ return { document:{ write(h){ __html=h; }, close(){} }, focus(){}, print(){} }; } };`].join('\n'), W);
  return W; }

console.log('── 793 · 1. la règle, exécutée ──');
{ const W = monter(BASE); const A = W.docEntete('Alpha Nuisibles'), B = W.docEntete('Bêta Hygiène'), G = W.docEntete('Modèle générique');
  v('Alpha : son nom, sa couleur, SON logo, SON SIRET, SON IBAN, sa raison sociale', [A.nom, A.couleur, A.logo, A.siret, A.iban, A.raison, A.coordsPropres],
    ['Alpha Nuisibles', '#C0392B', 'data:A', '22222222200022', 'FR76 2222', 'Alpha Nuisibles SAS', true]);
  v('⛔ Alpha a un SIRET mais pas de TVA : sa TVA reste VIDE (jamais celle de l’entreprise) — pas de chimère', [A.tvaIntra, A.bic], ['', '']);
  v('… ni le téléphone ni l’e-mail de l’entreprise : Alpha est une entreprise DISTINCTE (le client répondrait chez l’autre)', [A.tel, A.email], ['', '']);
  v('… alors qu’un nom commercial (Bêta) prend ceux de l’entreprise', W.docEntete('Bêta Hygiène').tel, '0500000000');
  v('Bêta (sans SIRET, sans logo) : son nom et sa couleur, le bloc légal ENTIER de l’entreprise, et PAS le logo de l’entreprise',
    [B.nom, B.couleur, B.siret, B.tvaIntra, B.iban, B.logo, B.coordsPropres], ['Bêta Hygiène', '#2E86C1', '11111111100011', 'FR11111111111', 'FR76 1111', '', false]);
  v('le générique : le NOM DE L’ENTREPRISE, son logo, ses coordonnées — jamais « Modèle générique » ni « OP GESTION »', [G.nom, G.logo, G.siret, G.generique], ['Nettoyage Excellence SARL', 'data:E', '11111111100011', true]);
  v('… vide, « aucune » et undefined pareil', [W.docEntete('').nom, W.docEntete('Aucune société').nom, W.docEntete(undefined).nom], Array(3).fill('Nettoyage Excellence SARL'));
  v('rapportSociete (28 appelants) : le générique rend l’entreprise', [W.rapportSociete('Modèle générique'), W.rapportSociete('Alpha Nuisibles')], ['Nettoyage Excellence SARL', 'Alpha Nuisibles']);
  const W2 = monter({ ...BASE, entreprise: {} }); v('une entreprise SANS nom : « OP GESTION » en tout dernier recours', W2.docEntete('').nom, 'OP GESTION');
  v('le nom d’expéditeur suit : la société, sinon rien d’imposé', [W.docMailOpts('Alpha Nuisibles'), W.docMailOpts('Modèle générique')], [{ brandName: 'Alpha Nuisibles' }, undefined]);
  v('socDuClient : ni l’annulée du 20/09, ni la future de 2099 — la dernière RÉELLE (Bêta, 15/09)', W.socDuClient('cX'), 'Bêta Hygiène');
  v('… parmi les passages d’un document : la dernière de CE document', W.socDuClient('cX', [W.db.interventions[0]]), 'Alpha Nuisibles');
  v('les bons : leur société, sinon l’en-tête des bons, sinon l’entreprise', [W.bcEntete(W.db.bons[0]), W.bcEntete(W.db.bons[1]), W.bcCouleur(W.db.bons[0])], ['Alpha Nuisibles', 'Nettoyage Excellence SARL', '#C0392B']);
  v('les coordonnées s’impriment dans l’ordre de tous les documents (Alpha n’a pas de téléphone : pas de ligne vide)', W.docCoordLignes(A), ['2 quai Alpha, 33000 Bordeaux', 'SIRET 22222222200022']);
  v('… et avec un téléphone, il prend sa place', W.docCoordLignes(B), ['1 rue de la Mairie, 17000 La Rochelle', 'Tél. 0500000000', 'SIRET 11111111100011  ·  TVA FR11111111111']); }

console.log('── 793 · 2. les PDF de vente et d’achat, exécutés ──');
{ const W = monter(BASE);
  const dA = W.devisPdfStr(W.db.devis[0], null), dG = W.devisPdfStr(W.db.devis[1], null);
  vrai('devis Alpha : Alpha, son SIRET — pas celui de l’entreprise', dA.includes('Alpha Nuisibles') && dA.includes('SIRET 22222222200022') && !dA.includes('11111111100011'));
  vrai('devis générique : l’entreprise, jamais « Modèle générique »', dG.includes('Nettoyage Excellence SARL') && !/Mod.le g.n.rique/.test(dG));
  const fB = W.docPdfStr('factures', W.db.factures[0], null), fA = W.docPdfStr('factures', W.db.factures[1], null);
  vrai('facture Bêta : un vrai PDF titré FACTURE, avec échéance', fB.startsWith('%PDF-1.4') && fB.endsWith('%%EOF') && fB.includes('(FACTURE)') && /ch\xe9ance/.test(fB));
  vrai('… l’IBAN et le SIRET de l’entreprise (Bêta n’a pas les siens)', fB.includes('FR76 1111') && fB.includes('11111111100011'));
  vrai('… les mentions de retard (L441-10)', fB.includes('L441-10'));
  vrai('facture Alpha réglée : son IBAN n’est pas réclamé, « réglée » est dit, TVA 293 B', fA.includes('gl\xe9e le') && fA.includes('293 B') && !fA.includes('FR76 1111'));
  const xr = +(fB.match(/startxref\n(\d+)/) || [0, 0])[1]; const tab = fB.slice(xr).split('\n'); const n = +((tab[1] || '').split(' ')[1] || 0); let bons = 0;
  for (let k = 1; k < n; k++) { const off = +tab[2 + k].slice(0, 10); if (fB.slice(off).startsWith(k + ' 0 obj')) bons++; }
  vrai('… et sa table xref est juste', n > 3 && bons === n - 1, [bons, n - 1]);
  const bA = W.bonPdfStr(W.db.bons[0]);
  vrai('bon de commande Alpha : Alpha et SES coordonnées', bA.includes('Alpha Nuisibles') && bA.includes('2 quai Alpha') && !bA.includes('1 rue de la Mairie')); }

console.log('── 793 · 3. l’impression d’un devis ou d’une facture, exécutée ──');
{ const W = monter(BASE);
  W.printDoc('factures', 'fB'); const hB = W.__html;
  vrai('facture Bêta : son nom et sa couleur', hB.includes('Bêta Hygiène') && hB.includes('#2E86C1'));
  vrai('… PAS le logo de l’entreprise (Bêta n’en a pas)', !hB.includes('data:E'));
  vrai('… les coordonnées de l’entreprise (Bêta est un nom commercial)', hB.includes('SIRET 11111111100011'));
  W.printDoc('devis', 'dA'); const hA = W.__html;
  vrai('devis Alpha : son logo, sa couleur, son SIRET et sa raison sociale — rien de l’entreprise', hA.includes('data:A') && hA.includes('#C0392B') && hA.includes('SIRET 22222222200022') && hA.includes('Alpha Nuisibles SAS') && !hA.includes('11111111100011'));
  const bq = JSON.parse(JSON.stringify(BASE)); bq.societesStyle['Alpha Nuisibles'].logo = 'data:A" onerror="alerte()';
  const Wq = monter(bq); Wq.printDoc('devis', 'dA');
  vrai('un logo qui porte un guillemet ne sort pas de son attribut (esc, comme les autres fabriques)', Wq.__html.includes('data:A&quot; onerror') && !Wq.__html.includes('" onerror="alerte()')); }

console.log('── 793 · 4. chaque fabrique passe par la même règle ──');
{ /* recensement depuis le FICHIER, pas depuis une liste : toute fonction qui écrit un document */
  const fns = []; const re = /(?:^|\n)(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g; let m;
  while ((m = re.exec(SRC))) fns.push({ n: m[1], i: m.index });
  const fab = [];
  for (let k = 0; k < fns.length; k++) { const b = SRC.slice(fns[k].i, k + 1 < fns.length ? fns[k + 1].i : SRC.length);
    if (/document\.write\(|new jsPDF|%PDF-/.test(b)) fab.push({ n: fns[k].n, b }); }
  /* documents INTERNES à l'entreprise : jamais remis à un client, ils ne portent pas de société */
  const INTERNES = { absJustifVoir: 'justificatif d’absence d’un salarié', remisePdf: 'bon de remise entre l’équipe et le DR', printTelecollecte: 'relevé de télécollecte, pour la comptabilité',
    ptPdfStr: 'relevé de pointage des heures', printArchive: 'archive mensuelle de l’entreprise' };
  /* la fabrique reçoit son en-tête tout prêt : c'est l'appelant qui lit docEntete */
  const PAR_APPELANT = { papImplPdfStr: 'papImplDocument' };
  vrai('population : au moins 15 fabriques trouvées dans le fichier', fab.length >= 15, fab.map(x => x.n));
  const sans = fab.filter(x => !INTERNES[x.n] && !PAR_APPELANT[x.n] && !/docEntete\(|bcEntete\(/.test(x.b)).map(x => x.n);
  v('toute fabrique remise à un client passe par docEntete (ou bcEntete) — ou elle est nommée INTERNE', sans, []);
  for (const [f, app] of Object.entries(PAR_APPELANT)) vrai(f + ' reçoit son en-tête de ' + app + ', qui lit docEntete', /docEntete\(/.test(corps(app)));
  const op = fab.filter(x => !INTERNES[x.n] && /'OP GESTION'|OP GESTION —|>OP GESTION</.test(x.b)).map(x => x.n);
  v('⛔ aucune fabrique remise à un client n’écrit « OP GESTION » en dur', op, []);
  v('les internes nommées existent toutes (une entrée pour du vide serait une décision prise pour rien)', Object.keys(INTERNES).filter(n => !fab.some(x => x.n === n)), []); }

console.log('── 793 · 5. les courriels portent la même société que le document ──');
{ vrai('« Prévenir les clients » : le message signe la société de CETTE intervention', /\.split\('\{societe\}'\)\.join\(socNom\(i\.rapportModele\)\|\|mailBrandName\(\)\)/.test(corps('orgaTexte')));
  vrai('… et son expéditeur aussi', /srvMail\([^;]*"client",null,docMailOpts\(i\.rapportModele\)\)/.test(corps('orgaEnvoyer')));
  vrai('devis / facture « Envoyer » : le PDF JOINT, et l’expéditeur de SA société', /opts\.atts=\[\{filename:/.test(corps('envoiDoc')) && /docMailOpts\(d\.rapportModele\)/.test(corps('envoiDoc')) && /docPdfChaine\(kind,d\)/.test(corps('envoiDoc')));
  vrai('… un texte sans pièce jointe ne dit plus « ci-joint »', /\(joint\?'Veuillez trouver ci-joint votre ':'Voici votre '\)/.test(corps('genDocTexte')));
  vrai('la facture automatique part en PDF, signée de la société de l’intervention', /docPdfChaine\('factures',f\)/.test(SRC) && /Cordialement,\\n'\+soc;/.test(SRC));
  vrai('le bon envoyé au fournisseur : la société DU BON quand il en porte une — sinon le « Nom d’expéditeur » des Réglages e-mail, comme avant', /const ent=socNom\(b\.societe\)\?bcEntete\(b\):mailBrandName\(\);/.test(corps('envoiBonEmail')));
  vrai('un envoi refusé ne met pas l’adresse du client dans le rapport d’erreur (/api/bug) — le domaine seulement',
    /stack:'domaine du destinataire : '\+\(String\(to\|\|''\)\.split\('@'\)\[1\]\|\|'—'\)/.test(corps('srvMail')) && !/'destinataire '\+to/.test(corps('srvMail')));
  { const fx = corps('exportFacturX'), ach = fx.slice(fx.indexOf('<ram:BuyerTradeParty>'), fx.indexOf('</ram:BuyerTradeParty>'));
    vrai('Factur-X : l’adresse de l’acheteur suit l’ordre CII (code postal, puis rue, puis ville) — comme celle du vendeur',
      ach.length > 50 && ach.indexOf('<ram:PostcodeCode>') > 0 && ach.indexOf('<ram:PostcodeCode>') < ach.indexOf('<ram:LineOne>') && ach.indexOf('<ram:LineOne>') < ach.indexOf('<ram:CityName>'), ach.slice(0, 200)); }
  vrai('Factur-X : le vendeur est la société de la facture, avec son identifiant légal', /docEntete\(f\.rapportModele\)/.test(corps('exportFacturX')) && /SpecifiedLegalOrganization/.test(corps('exportFacturX')) && !/f\.societe/.test(corps('exportFacturX'))); }

console.log('── 793 · 6. les données de société ──');
{ vrai('les coordonnées d’une société se saisissent (Paramètres → Mes sociétés)', /onclick="socCoordModal\(\$\{ix\}\)"/.test(SRC) && /function socCoordSave\(e,ix\)\{ e\.preventDefault\(\); if\(!adminSeul\(\)\) return;/.test(SRC));
  vrai('… elles se fusionnent société par société (COLLS_DICT)', /const COLLS_DICT=\[[^\]]*'societesStyle'/.test(SRC));
  vrai('retirer une société de la liste ne détruit pas son style : les documents émis gardent leur en-tête', !/delete db\.societesStyle\[/.test(corps('entSocDel')));
  vrai('le produit donné (bon signé par le client) choisit sa société', /name="rapportModele"/.test(corps('formProduitDonne')) && /docEntete\(p\.rapportModele\)/.test(corps('printProduitDonne'))); }

/* La relecture par le texte ci-dessus passait sur un `if(false){ opts.atts=… }` (mutation du
   23 septembre 2026, la seule des 34 qu'aucun banc ne voyait) : le motif était là, le geste non. On
   JOUE donc « Envoyer » : la vraie envoiDoc, la vraie fabrique du PDF, un srvMail qui note. */
console.log('── 793 · 5 bis. « Envoyer » un devis, joué : le PDF part vraiment ──');
(async () => {
  for (const casse of [false, true]) {
    const W = monter(BASE); W.__envois = [];
    W.btoa = s => Buffer.from(String(s), 'latin1').toString('base64');
    vm.runInContext([decoupe('function genDocTexte('), decoupe('function envoiDoc('), decoupe('async function docPdfChaine('),
      `function permGarde(){ return true; } function save(){} function confirm(){ return false; }
       async function devisLogoJpeg(){ return null; }
       function srvMail(){ __envois.push([...arguments]); return Promise.resolve(true); }` +
      (casse ? `\n docPdfChaine = async function(){ throw new Error('canvas indisponible'); };` : '')].join('\n'), W);
    W.envoiDoc('devis', 'dA', 'email');
    for (let k = 0; k < 20; k++) await new Promise(r => setImmediate(r));
    const [a] = W.__envois, o = (a && a[6]) || {}, pj = (o.atts || [])[0];
    if (!casse) {
      vrai('« Envoyer » le devis d’Alpha : UN courriel, au client', W.__envois.length === 1 && a[0] === 'elise@exemple.fr', W.__envois.length);
      vrai('… avec UN PDF joint, nommé d’après le devis', !!pj && (o.atts || []).length === 1 && pj.filename === 'Devis-DV-1.pdf', o.atts && o.atts.map(x => x.filename));
      const pdf = pj ? Buffer.from(pj.content, 'base64').toString('latin1') : '';
      vrai('… un vrai PDF, à l’en-tête d’Alpha et à SON SIRET', pdf.startsWith('%PDF-1.4') && pdf.includes('Alpha Nuisibles') && pdf.includes('22222222200022') && !pdf.includes('11111111100011'));
      vrai('… expédié au nom d’Alpha, et le texte dit « ci-joint »', o.brandName === 'Alpha Nuisibles' && /ci-joint/.test(a[2]), [o.brandName, String(a[2]).slice(0, 80)]);
      vrai('… mais pas le brouillon de secours, qui ne sait rien joindre', typeof o.mailtoBody === 'string' && !/ci-joint/.test(o.mailtoBody));
      vrai('… et le devis passe « envoyé »', W.db.devis.find(x => x.id === 'dA').statut === 'envoye');
    } else {
      vrai('PDF impossible à construire : le courriel part quand même, SANS pièce, au nom d’Alpha', W.__envois.length === 1 && !o.atts && o.brandName === 'Alpha Nuisibles', o);
      vrai('… et son texte ne prétend pas joindre ce qu’il ne joint pas', !/ci-joint/.test(String(a && a[2])), String(a && a[2]).slice(0, 80));
    }
  }
  console.log(`\n════ test-793 : ${ok} ✓ ${ko} ✗ ════`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); console.log(`\n════ test-793 : ${ok} ✓ ${ko + 1} ✗ ════`); process.exit(1); });

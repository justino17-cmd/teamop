/* ══ test-1416 — « FACTURE CRÉÉE » / « FACTURE MISE À JOUR » (robustesse#10) ═══════════════════
   `saveDoc` bâtissait ses messages sur `cfg.titre + ' créé'` : pour une facture (féminin) le toast
   et l'entrée du journal disaient « Facture créé » et « Facture mis à jour ». « Devis » reste au
   masculin. L'accord est une donnée de DOC (`fem`), pas un test sur le nom du document.

   Ce banc EXÉCUTE la vraie `saveDoc` et le vrai `DOC` extraits d'app.html, avec un formulaire de
   démonstration : il lit le toast et l'entrée du journal produits à la création puis à la
   modification d'un devis et d'une facture. Les entrées de journal DÉJÀ écrites ne se réécrivent
   pas (rien ne s'écrit dans db sans geste) : le banc ne les touche pas. */
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
/* la garde d'envoi (audit apple-design, 21 octobre 2026) : envoiDoc passe par envoiGarde — le bac à sable fournit la VRAIE */
const GARDE = require('./outils-envoi.js').gardeEnvoi(APP);
const CODE = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
const ligne = debut => { const i = APP.indexOf(debut); return i < 0 ? '' : APP.slice(i, APP.indexOf('\n', i)); };
function bloc(debut) {
  const i = APP.indexOf(debut); if (i < 0) return '';
  let p = 0; for (let k = APP.indexOf('{', i); k < APP.length; k++) {
    if (APP[k] === '{') p++; else if (APP[k] === '}') { p--; if (!p) return APP.slice(i, k + 1); } }
  return ''; }

console.log('\n── 1416 · 0. la population ──');
const DOC = ligne('const DOC={'), SAVE = bloc('function saveDoc(e,kind,id){');
vrai('DOC et saveDoc sont trouvés dans app.html', DOC.length > 40 && SAVE.length > 400, [DOC.length, SAVE.length]);
vrai('une seule définition de saveDoc', (CODE.match(/function saveDoc\(/g) || []).length === 1);
if (!DOC || !SAVE) { console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(1); }

function jouer(kind, id) {
  const toasts = [], journal = [];
  const db = { devis: [], factures: [], clients: [{ id: 'c1', nom: 'Dupont' }] };
  if (id) db[kind === 'devis' ? 'devis' : 'factures'].push({ id, num: 'N-0', clientId: 'c1', lignes: [] });
  const box = new Function('db', 'toasts', 'journal', `
    const DEVIS_ST={brouillon:{l:'Brouillon'}}, FACT_ST={brouillon:{l:'Brouillon'}};
    var formLignes=[{designation:'Dératisation',qte:1,pu:100}];
    class FormData{ constructor(f){ this.o=f.valeurs; } [Symbol.iterator](){ return Object.entries(this.o)[Symbol.iterator](); } }
    const permGarde=()=>true, clientPropose=()=>true, canCat=()=>false, currentUser={id:'u1'};
    const toast=m=>toasts.push(m), logEvent=(t,d,c)=>journal.push(t), save=()=>{}, closeModal=()=>{}, docListView=()=>{};
    const uid=()=>'nouveau', eur=x=>x+' €', docTot=d=>({ttc:120}), document={getElementById:()=>null};
    var current='devis', views={factures(){}}; const go=()=>{};
    ${bloc('function factQuitterPayee(f,nouveau){')}   /* saveDoc demande avant de quitter « payée » (vague 1) : la vraie ; ici aucun document n'est payé, elle laisse passer */   /* saveDoc redessine la rubrique où l'on est (vague 1) : ici, aucune */
    ${DOC}
    ${SAVE}
    return saveDoc;`)(db, toasts, journal);
  const e = { preventDefault() {}, target: { valeurs: { num: 'N-1', clientId: 'c1', date: '2026-10-01', tva: '20', statut: 'brouillon', notes: '', rapportModele: '' } } };
  box(e, kind, id);
  return { toasts, journal };
}

console.log('\n── 1416 · 1. la facture est féminine ──');
{ const r = jouer('factures'); v('créer une facture : toast « Facture créée »', r.toasts, ['Facture créée']); v('… et journal « Facture créée »', r.journal, ['Facture créée']); }
{ const r = jouer('factures', 'f1'); v('modifier une facture : toast « Facture mise à jour »', r.toasts, ['Facture mise à jour']); v('… rien dans le journal (comme avant)', r.journal, []); }

console.log('\n── 1416 · 2. le devis reste au masculin, inchangé ──');
{ const r = jouer('devis'); v('créer un devis : toast « Devis créé »', r.toasts, ['Devis créé']); v('… et journal « Devis créé »', r.journal, ['Devis créé']); }
{ const r = jouer('devis', 'd1'); v('modifier un devis : toast « Devis mis à jour »', r.toasts, ['Devis mis à jour']); }

console.log('\n── 1416 · 3. l’accord est une donnée de DOC, et rien d’autre ne dépend de la chaîne fautive ──');
vrai('DOC.factures porte l’accord féminin', /factures:\{[^}]*fem:true/.test(DOC), DOC);
vrai('DOC.devis ne le porte pas', !/devis:\{[^}]*fem:true/.test(DOC));
vrai('plus de « Facture créé » ni de « mis à jour » collé au titre dans le code', !/cfg\.titre\+' mis à jour'/.test(CODE) && !/cfg\.titre\+' créé'/.test(CODE));
vrai('aucune entrée du dictionnaire de traduction ne dépend de « Facture créé »', !/'Facture créé'|"Facture créé"|Facture mis à jour/.test(CODE));

console.log('\n── 1416 · 4. l’ENVOI par courriel dit aussi « Facture envoyée » (relecture : le toast de srvMail) ──');
/* La relecture a trouvé un troisième endroit qui collait un participe au titre : le message de
   succès passé à srvMail par envoiDoc. On JOUE la vraie envoiDoc avec un srvMail qui note ce qu'il
   reçoit — un motif sur le texte garderait une phrase, pas ce que l'utilisateur lit. */
const ENVOI = bloc('function envoiDoc(kind,id,canal){');
vrai('envoiDoc est trouvée dans app.html, une seule définition', ENVOI.length > 600 && (CODE.match(/function envoiDoc\(/g) || []).length === 1, ENVOI.length);
function envoyer(kind) {
  const msgs = [];
  const db = { devis: [{ id: 'x1', num: 'D-1', clientId: 'c1', statut: 'brouillon', lignes: [] }], factures: [{ id: 'x1', num: 'F-1', clientId: 'c1', statut: 'brouillon', lignes: [] }],
    clients: [{ id: 'c1', nom: 'Dupont', email: 'dupont@example.fr' }] };
  const f = new Function('db', 'msgs', `
    const DEVIS_ST={brouillon:{l:'Brouillon'}}, FACT_ST={brouillon:{l:'Brouillon'}};
    const permGarde=()=>true, save=()=>{}, toast=()=>{}, current='', views={};
    const docMentionsManquantes=()=>[], docMentionsGarde=()=>true;   // la porte v780 : entreprise complète (jouée par test-3171)
    const rapportSociete=()=>'Société', docMailOpts=()=>undefined, docPdfChaine=async()=>'', genDocTexte=()=>'texte';
    const srvMail=async(to,sujet,corps,okMsg)=>{ msgs.push(okMsg); return true; };
    ${DOC}
    ${GARDE}
    ${ENVOI}
    return envoiDoc;`)(db, msgs);
  return Promise.resolve(f(kind, 'x1')).then(() => msgs);
}
(async () => {
  v('envoyer une facture : « ✉️ Facture envoyée à Dupont »', await envoyer('factures'), ['✉️ Facture envoyée à Dupont']);
  v('envoyer un devis : « ✉️ Devis envoyé à Dupont » (inchangé)', await envoyer('devis'), ['✉️ Devis envoyé à Dupont']);
  /* tout participe collé au titre, n'importe où dans le fichier : il s'accorde par `fem` ou n'existe pas */
  const colles = CODE.match(/cfg\.titre\s*\+\s*'\s(?:envoy|cr[ée]|mis|supprim|dupliqu|marqu|pay|valid|accept|refus|sign|g[ée]n[ée]r)[^']*'/g) || [];
  v('aucun participe n’est collé en dur au titre du document (tout passe par cfg.fem)', colles, []);
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();

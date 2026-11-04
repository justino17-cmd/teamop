/* ══ test-3257 — « ENVOYÉ » DIT CE QUI EST PARTI ═══════════════════════════════════════════════════════════════════════════
   Justin, 4 novembre 2026, liste des devis de la bêta : « quand on fait un devis et qu'on coche "envoyé", ça s'envoie pas — soit
   faut le corriger. Corrige tout ça. » Le statut était un libellé du formulaire : on cochait « Envoyé », rien ne partait, et
   l'équipe croyait le client servi.

   La règle (v801), jouée ici sur les VRAIES fonctions d'app.html dans un bac à sable :
   1. `envoiDoc` pose « Envoyé » (devis) / « Envoyée » (facture) SEULEMENT sur un envoi réussi, avec la trace `envoi` (date, canal) ;
      un courriel refusé laisse le brouillon ;
   2. un SMS (lien sms: vers l'application Messages, sans le PDF) ne pose « Envoyé » que si la personne confirme qu'il est parti ;
   3. le formulaire ne propose plus « Envoyé » comme un libellé à cocher pour un document pas encore parti : « l'envoyer
      maintenant… » ; un document déjà parti (base d'avant comprise) le garde ;
   4. `saveDoc` : choisir l'envoi (option, bouton « … et envoyer », ou un « envoye » d'un formulaire d'avant) enregistre le document
      EN BROUILLON et ouvre l'envoi ; Accepté / Refusé restent des décisions.
   Contre-épreuve : MUTER=1 remet le statut posé à l'enregistrement (`f.statut` gardé tel quel) — le banc doit tomber. */
const fs = require('fs'), path = require('path'), vm = require('vm');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? ' → ' + JSON.stringify(d) : '')); } };
let SRC = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
if (process.env.MUTER) { const avant = SRC; SRC = SRC.replace("if(f.statut==='__envoyer'||(f.statut===stE&&(!_av.statut||_av.statut==='brouillon'))){ envoyerApres=true; f.statut=_av.statut||'brouillon'; }", "");
  if (SRC === avant) { console.log('✗ la mutation n’a rien touché — motif à mettre à jour'); process.exit(1); } }
/* découpe une déclaration de premier niveau jusqu'à la suivante (ligne qui commence par function / const / let / views. / commentaire) */
const decoupe = (debut) => { const i = SRC.indexOf('\n' + debut); if (i < 0) throw new Error('introuvable : ' + debut);
  const re = /\n(?:async function |function |const |let |views\.|\/\*)/g; re.lastIndex = i + debut.length + 1; const m = re.exec(SRC); return SRC.slice(i + 1, m ? m.index : undefined); };
const constLigne = (nom) => { const i = SRC.indexOf('\nconst ' + nom + '='); if (i < 0) throw new Error('const introuvable : ' + nom); return SRC.slice(i + 1, SRC.indexOf('\n', i + 1)); };

const BASE = () => ({
  devis: [{ id: 'dA', num: 'DEV-1', clientId: 'cA', date: '2026-11-04', statut: 'brouillon', tva: 20, lignes: [{ designation: 'Pose', qte: 1, pu: 100 }] },
          { id: 'dB', num: 'DEV-0', clientId: 'cA', date: '2026-10-01', statut: 'envoye', tva: 20, lignes: [] }],
  factures: [{ id: 'fA', num: 'FAC-1', clientId: 'cA', date: '2026-11-04', statut: 'brouillon', tva: 20, lignes: [{ designation: 'Pose', qte: 1, pu: 100 }] }],
  clients: [{ id: 'cA', nom: 'Alpha', email: 'alpha@exemple.fr', tel: '06 00 00 00 00' }] });
function monter() {
  const W = { console, Date, JSON, Math, Object, Array, String, Number, Promise, setTimeout: (f) => { W.__timers.push(f); return 0; }, encodeURIComponent, Error };
  W.window = W; W.document = { getElementById: () => null }; W.__timers = []; W.__envois = []; W.__mailOk = true; W.__sms = null; W.__choix = 0; W.__log = []; W.__toasts = [];
  W.location = { set href(v) { W.__href = v; }, get href() { return W.__href || ''; } };
  W.db = BASE(); vm.createContext(W);
  vm.runInContext([constLigne('DEVIS_ST'), constLigne('FACT_ST'), constLigne('DOC'), constLigne('DOC_ST_ENVOI'),
    decoupe('function genDocTexte('), decoupe('function envoiDoc('), decoupe('function docEnvoyable('), decoupe('function docStatutOptions('),
    decoupe('function docEnvoiLib('), decoupe('function saveDoc('), require('./outils-envoi.js').gardeEnvoi(SRC),
    `function permGarde(){ return true; } function canCat(){ return true; } function save(){ __saves=(typeof __saves==='number'?__saves:0)+1; }
     function toast(m){ __toasts.push(m); } function logEvent(){ __log.push([...arguments]); } function closeModal(){}
     function docMentionsGarde(){ return true; } function rapportSociete(){ return 'Société'; } function docMailOpts(){ return {}; }
     async function docPdfChaine(){ return '%PDF-1.4 faux'; } function btoa(s){ return Buffer.from(String(s),'latin1').toString('base64'); }
     function srvMail(){ __envois.push([...arguments]); return Promise.resolve(__mailOk); }
     function docSmsParti(cfg,d,c,tel,fin){ __sms={d:d.id,tel}; fin(__smsReponse); }
     function docEnvoyerChoix(k,id){ __choix++; __choixId=id; }
     function clientPropose(){ return true; } function factQuitterPayee(){ return true; } function docCliCreer(){ return ''; }
     function docListView(){} function go(){} function eur(x){ return String(x); } function docTot(){ return {ttc:120}; }
     function ligTotLigne(l){ return (+l.qte||0)*(+l.pu||0); } function fmtShort(x){ return x; } function todayISO(){ return '2026-11-04'; }
     function esc(x){ return String(x==null?'':x); } function uid(){ return 'nouveau'+(__uid=(typeof __uid==='number'?__uid:0)+1); }
     var current='devis', views={ devis(){}, factures(){} }, currentUser={id:'u1'}, formLignes=[], __smsReponse=false; var Buffer=__B;`].join('\n'), Object.assign(W, { __B: Buffer }));
  return W;
}
const vider = async (W) => { for (let k = 0; k < 5; k++) { const t = W.__timers.splice(0); t.forEach(f => f()); await new Promise(r => setImmediate(r)); } };
const FD = (o) => `(function(){ const o=${JSON.stringify(o)}; return { preventDefault(){}, target:{ __o:o } }; })()`;

(async () => {
  console.log('\n── 3257 · 1. le courriel : « Envoyé » sur réussite seulement ──');
  { const W = monter(); const r = await W.envoiDoc('devis', 'dA', 'mail'); const d = W.db.devis[0];
    vrai('courriel parti : le devis passe « envoye »', r === true && d.statut === 'envoye', d.statut);
    vrai('… avec la trace : canal e-mail, adresse, date', d.envoi && d.envoi.canal === 'mail' && d.envoi.a === 'alpha@exemple.fr' && d.envoi.date === '2026-11-04', d.envoi);
    vrai('… que la liste sait dire (« le 2026-11-04 · e-mail »)', W.docEnvoiLib(d) === 'le 2026-11-04 · e-mail', W.docEnvoiLib(d)); }
  { const W = monter(); W.__mailOk = false; const r = await W.envoiDoc('devis', 'dA', 'mail'); const d = W.db.devis[0];
    vrai('courriel refusé : le devis RESTE brouillon, aucune trace d’envoi', r === false && d.statut === 'brouillon' && !d.envoi, [d.statut, d.envoi]); }
  { const W = monter(); const r = await W.envoiDoc('factures', 'fA', 'mail'); const f = W.db.factures[0];
    vrai('facture : même règle (« envoyee » + trace)', r === true && f.statut === 'envoyee' && f.envoi && f.envoi.canal === 'mail', [f.statut, f.envoi]); }

  console.log('\n── 3257 · 2. le SMS : l’application Messages s’ouvre, « Envoyé » seulement si la personne le confirme ──');
  for (const rep of [false, true]) {
    const W = monter(); W.__smsReponse = rep; const p = W.envoiDoc('devis', 'dA', 'sms'); await vider(W); const r = await p; const d = W.db.devis[0];
    if (!rep) {
      vrai('lien sms: ouvert vers le numéro du client, avec le texte du devis', /^sms:0600000000\?&body=/.test(W.__href || '') && /DEV-1/.test(decodeURIComponent(W.__href || '')), W.__href);
      vrai('« Pas envoyé » : le devis reste brouillon, rien n’est tracé', r === false && d.statut === 'brouillon' && !d.envoi, [r, d.statut]);
    } else vrai('« Il est parti » : « envoye », canal SMS, au numéro', r === true && d.statut === 'envoye' && d.envoi.canal === 'sms' && d.envoi.a === '0600000000', [r, d.statut, d.envoi]);
  }

  console.log('\n── 3257 · 3. le formulaire ne coche plus « Envoyé » ──');
  { const W = monter(); const o1 = W.docStatutOptions('devis', W.db.devis[0]), o2 = W.docStatutOptions('devis', W.db.devis[1]);
    vrai('devis brouillon : pas d’option « envoye », une option « l’envoyer maintenant… »', !/value="envoye"/.test(o1) && /value="__envoyer"[^>]*>Envoyé — l’envoyer maintenant…/.test(o1), o1);
    vrai('… Accepté et Refusé restent des choix', /value="accepte"/.test(o1) && /value="refuse"/.test(o1));
    vrai('devis déjà envoyé (base d’avant, sans trace) : « Envoyé » reste, sélectionné', /value="envoye" selected/.test(o2) && !/__envoyer/.test(o2), o2);
    const of = W.docStatutOptions('factures', W.db.factures[0]);
    vrai('facture en attente : pas d’option « envoyee », « l’envoyer maintenant… »', !/value="envoyee"/.test(of) && /value="__envoyer"/.test(of) && /value="payee"/.test(of), of); }

  console.log('\n── 3257 · 4. enregistrer : le statut d’envoi ne se pose pas, l’envoi s’ouvre ──');
  const enregistrer = async (W, id, o) => { vm.runInContext('var FormData=function(t){ this.e=Object.entries(t.__o); }; FormData.prototype[Symbol.iterator]=function(){ return this.e[Symbol.iterator](); };', W);
    W.saveDoc(vm.runInContext(FD(o), W), 'devis', id); await vider(W); };
  const champs = (x) => Object.assign({ num: 'DEV-1', clientId: 'cA', date: '2026-11-04', tva: '20', notes: '', rapportModele: '', __apres: '' }, x);
  { const W = monter(); W.formLignes = [{ designation: 'Pose', qte: 1, pu: 100 }]; await enregistrer(W, 'dA', champs({ statut: '__envoyer' }));
    const d = W.db.devis.find(x => x.id === 'dA');
    vrai('« Envoyé — l’envoyer maintenant… » : enregistré en BROUILLON', d.statut === 'brouillon', d.statut);
    vrai('… et l’envoi s’ouvre pour CE devis', W.__choix === 1 && W.__choixId === 'dA', [W.__choix, W.__choixId]);
    vrai('… rien n’est parti tant que la personne n’a pas choisi', W.__envois.length === 0 && !d.envoi); }
  { const W = monter(); W.formLignes = [{ designation: 'Pose', qte: 1, pu: 100 }]; await enregistrer(W, 'dA', champs({ statut: 'envoye' }));
    vrai('un « envoye » venu d’un formulaire d’avant, pour un devis jamais parti : brouillon + envoi ouvert', W.db.devis[0].statut === 'brouillon' && W.__choix === 1, [W.db.devis[0].statut, W.__choix]); }
  { const W = monter(); W.formLignes = [{ designation: 'Pose', qte: 1, pu: 100 }]; await enregistrer(W, '', champs({ num: 'DEV-9', statut: 'brouillon', __apres: 'envoyer' }));
    const n = W.db.devis.find(x => x.num === 'DEV-9');
    vrai('« Créer et envoyer » : le devis naît brouillon et l’envoi s’ouvre pour lui', n && n.statut === 'brouillon' && W.__choix === 1 && W.__choixId === n.id, [n && n.statut, W.__choix]); }
  { const W = monter(); W.formLignes = [{ designation: 'Pose', qte: 1, pu: 100 }]; await enregistrer(W, 'dA', champs({ statut: 'accepte' }));
    vrai('« Accepté » reste une décision : posé, aucun envoi ouvert', W.db.devis[0].statut === 'accepte' && W.__choix === 0, [W.db.devis[0].statut, W.__choix]); }
  { const W = monter(); W.formLignes = []; await enregistrer(W, 'dB', champs({ num: 'DEV-0', statut: 'envoye' }));
    vrai('un devis DÉJÀ envoyé, réenregistré : il garde « envoye », rien ne se rouvre', W.db.devis[1].statut === 'envoye' && W.__choix === 0, [W.db.devis[1].statut, W.__choix]); }

  console.log('\n── 3257 · 5. les portes ──');
  const S = SRC.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
  vrai('la liste des factures n’offre plus « Marquer envoyée » sans envoi : « remise autrement » déclarée', !/factSetStatut\('\$\{f\.id\}','envoyee'\)" title="Marquer envoyée/.test(S) && /onclick="factRemiseAutrement\('\$\{f\.id\}'\)"/.test(S));
  vrai('… et la remise autrement laisse sa trace (canal « autre »)', /function factRemiseAutrement\([\s\S]{0,700}f\.envoi=\{date:todayISO\(\),ts:Date\.now\(\),canal:'autre'/.test(S));
  vrai('le formulaire passe par docStatutOptions (plus de liste brute des statuts)', /<select name="statut">\$\{docStatutOptions\(kind,d\)\}<\/select>/.test(S) && !/<select name="statut">\$\{Object\.entries\(cfg\.st\)/.test(S));

  console.log(`\n${ok} ✓ ${ko} ✗`); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('✗ ' + e.stack); process.exit(1); });

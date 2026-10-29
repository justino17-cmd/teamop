/* ══ test-2834 · UN ENVOI DIT « EN COURS » ET NE PART QU'UNE FOIS ════════════════════════════════════════════════════════════
   Audit apple-design du 21 octobre 2026 (§ 16 : un retour de statut pour ce qui dure). « Prévenir les clients »
   (orgaEnvoyer), « Envoyer » un e-mail (mailSend), un devis ou une facture (envoiDoc) attendaient le serveur — PDF puis
   SMTP, plusieurs secondes — sans que le bouton change ; un second appui RELANÇAIT tout, et le client recevait le courriel
   deux fois. Désormais :
   · `envoiGarde(clé, envoi)` grise le bouton du geste (« Envoi… ») jusqu'à la réponse et refuse un second départ de la
     même clé tant que le premier n'a pas répondu ;
   · l'enveloppe de `srvMail` ne renvoie jamais un courriel IDENTIQUE déjà en route (le second appel attend la réponse du
     premier) — quel que soit le chemin qui l'appelle.
   Ce banc JOUE la vraie garde (tests/outils-envoi.js), la vraie enveloppe et les trois vraies fonctions, avec un serveur
   d'envoi qu'on fait attendre : on appuie deux fois PENDANT l'envoi, puis on le relâche.                                   */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
const GARDE = require('./outils-envoi.js').gardeEnvoi(APP);
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const bloc = (entete) => { const i = APP.indexOf(entete); if (i < 0) return ''; const j = APP.indexOf('\n}\n', i); return j < 0 ? '' : APP.slice(i, j + 2); };
const ENVELOPPE = (() => { const i = APP.indexOf('var _srvMailEnRoute=new Map();'); const j = APP.indexOf('})();', i); return i < 0 || j < 0 ? '' : APP.slice(i, j + 5); })();
const MAILSEND = bloc('async function mailSend('), ENVOIDOC = bloc('function envoiDoc(kind,id,canal){'), ORGA = bloc('async function orgaEnvoyer(){');

console.log('\n── 2834 · 0. la population ──');
vrai('la garde d’envoi est trouvée (boutonDuGeste, envoiGarde, btnOccupe)', /function envoiGarde\(/.test(GARDE) && /function btnOccupe\(/.test(GARDE), GARDE.length);
vrai('l’enveloppe de srvMail est trouvée', /window\.srvMail=function/.test(ENVELOPPE), ENVELOPPE.length);
vrai('les trois envois sont trouvés', MAILSEND.length > 400 && ENVOIDOC.length > 600 && ORGA.length > 600, [MAILSEND.length, ENVOIDOC.length, ORGA.length]);

/* un serveur d'envoi qu'on fait ATTENDRE : chaque appel reste en route jusqu'à ce qu'on le relâche */
function serveur() {
  const appels = [], attentes = [];
  const base = function () { appels.push([...arguments]); return new Promise(r => attentes.push(r)); };
  return { appels, base, relacher: (v) => { attentes.splice(0).forEach(r => r(v === undefined ? true : v)); } };
}
const tic = () => new Promise(r => setImmediate(r));
function bouton() { const b = { nodeType: 1, innerHTML: '✉️ Envoyer', style: {}, isConnected: true, _occupe: false, cls: new Set(),
  getBoundingClientRect: () => ({ width: 120 }), closest: () => b }; b.classList = { add: (c) => b.cls.add(c), remove: (c) => b.cls.delete(c) }; return b; }

(async () => {
  console.log('\n── 2834 · 1. l’enveloppe de srvMail : un courriel identique en route ne repart pas ──');
  {
    const S = serveur(); const ctx = { console, JSON, Map, Promise, String };
    ctx.window = ctx; ctx.srvMail = S.base; vm.createContext(ctx);
    try { vm.runInContext(ENVELOPPE, ctx); } catch (e) { vrai('l’enveloppe s’exécute', false, e.message); }
    const a = ctx.srvMail('client@x.fr', 'Devis D-1', 'texte', 'ok'), b = ctx.srvMail('client@x.fr', 'Devis D-1', 'texte', 'ok');
    const c = ctx.srvMail('autre@x.fr', 'Devis D-1', 'texte', 'ok');
    /* deux interventions du MÊME client le même jour : même adresse, même objet, textes différents — les deux partent */
    const d = ctx.srvMail('client@x.fr', 'Devis D-1', 'autre texte', 'ok');
    vrai('même destinataire et même objet, mais un TEXTE différent : il part aussi (ce n’est pas un doublon)', S.appels.filter(x => x[0] === 'client@x.fr').length === 2, S.appels.map(x => x[2]));
    vrai('deux appels IDENTIQUES pendant l’envoi : UN seul départ', S.appels.filter(x => x[0] === 'client@x.fr' && x[2] === 'texte').length === 1, S.appels.length);
    vrai('un courriel DIFFÉRENT part, lui', S.appels.filter(x => x[0] === 'autre@x.fr').length === 1);
    S.relacher(true);
    vrai('… et les deux appels identiques reçoivent la MÊME réponse', (await a) === true && (await b) === true);
    await c; await d; await tic();
    ctx.srvMail('client@x.fr', 'Devis D-1', 'texte', 'ok');
    vrai('une fois le premier parti, le même courriel peut repartir (un vrai second envoi voulu)', S.appels.filter(x => x[0] === 'client@x.fr' && x[2] === 'texte').length === 2);
  }

  console.log('\n── 2834 · 2. « Envoyer » un e-mail (mailSend), appuyé deux fois ──');
  {
    const S = serveur(), B = bouton();
    const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, Promise, __toasts: [], __closes: 0, db: { mailSent: [] }, current: '', currentUser: { prenom: 'Zoé', nom: 'M' }, _mailAtt: null, _mailboxes: [], views: {} };
    ctx.window = { event: { target: B } }; vm.createContext(ctx);
    vm.runInContext(`var $=function(i){ return {'mc-to':{value:'client@x.fr'},'mc-subject':{value:'Bonjour'},'mc-text':{value:'Texte'},'mc-from':{value:''}}[i]||null; };
      function toast(m){ __toasts.push(String(m)); } function closeModal(){ __closes++; } function save(){} function esc(s){ return String(s); }
      function fullName(u){ return u.prenom+' '+u.nom; } function mailBrandName(){ return 'X'; } async function srvFeatures(){ return {}; }
      ${GARDE}\n${MAILSEND}`, ctx);
    ctx.srvMail = S.base;
    const p1 = ctx.mailSend(); await tic();
    vrai('pendant l’envoi, le bouton dit « Envoi… » et n’accepte plus rien', B.innerHTML === 'Envoi…' && B.cls.has('btn-occupe') && B._occupe === true, B.innerHTML);
    const p2 = ctx.mailSend(); await tic();
    vrai('⛔ un second appui pendant l’envoi ne repart PAS (un seul courriel)', S.appels.length === 1, S.appels.length);
    vrai('… et le dit (« Envoi déjà en cours… »)', ctx.__toasts.includes('Envoi déjà en cours…'), ctx.__toasts);
    S.relacher(true); await p1; await p2; await tic();
    vrai('la réponse arrivée : le bouton reprend son libellé', B.innerHTML === '✉️ Envoyer' && !B.cls.has('btn-occupe') && B._occupe === false, B.innerHTML);
    vrai('… et le message n’est enregistré qu’une fois', ctx.db.mailSent.length === 1, ctx.db.mailSent.length);
    /* le geste terminé, il redevient possible : renvoyer plus tard n'est pas un doublon */
    const p3 = ctx.mailSend(); await tic(); S.relacher(true); await p3; await tic();
    vrai('une fois la réponse arrivée, « Envoyer » repart normalement (la garde s’est levée)', S.appels.length === 2 && ctx.db.mailSent.length === 2, [S.appels.length, ctx.db.mailSent.length]);
  }

  console.log('\n── 2834 · 3. « Envoyer » un devis (envoiDoc), appuyé deux fois ──');
  {
    const S = serveur(), B = bouton();
    const ctx = { console, JSON, Math, Set, Map, Object, Array, String, Promise, btoa: (s) => Buffer.from(String(s), 'latin1').toString('base64'), __toasts: [] };
    ctx.window = { event: { target: B } }; vm.createContext(ctx);
    vm.runInContext(`const DOC={devis:{coll:'devis',titre:'Devis'}}; var db={devis:[{id:'d1',num:'D-1',clientId:'c1',statut:'brouillon'}],clients:[{id:'c1',nom:'Dupont',email:'dupont@x.fr'}]};
      function permGarde(){ return true; } function save(){} function toast(m){ __toasts.push(String(m)); } function esc(s){ return String(s); } var current='', views={};
function docMentionsManquantes(){ return []; } function docMentionsGarde(){ return true; }       function rapportSociete(){ return 'Soc'; } function docMailOpts(){ return {}; } async function docPdfChaine(){ return '%PDF'; } function genDocTexte(){ return 'texte'; }
      ${GARDE}\n${ENVOIDOC}`, ctx);
    ctx.srvMail = S.base;
    const p1 = ctx.envoiDoc('devis', 'd1', 'email'); await tic(); await tic();
    const p2 = ctx.envoiDoc('devis', 'd1', 'email'); await tic(); await tic();
    vrai('⛔ deux appuis sur « Envoyer » : UN devis envoyé', S.appels.length === 1, S.appels.length);
    vrai('… le bouton disait « Envoi… » pendant l’attente', B.innerHTML === 'Envoi…', B.innerHTML);
    S.relacher(true); await p1; await p2; await tic();
    vrai('… le devis passe « envoyé », et le bouton reprend son libellé', ctx.db.devis[0].statut === 'envoye' && B.innerHTML === '✉️ Envoyer', [ctx.db.devis[0].statut, B.innerHTML]);
  }

  console.log('\n── 2834 · 4. « Prévenir les clients » (orgaEnvoyer), appuyé deux fois ──');
  {
    const S = serveur(), B = bouton();
    const ctx = { console, JSON, Math, Set, Map, Object, Array, String, Promise, __toasts: [], __closes: 0, location: {} };
    ctx.window = { event: { target: B } }; vm.createContext(ctx);
    vm.runInContext(`var ORGA={ids:{i1:1,i2:1}}; var db={interventions:[{id:'i1',clientId:'c1',date:'2026-10-23'},{id:'i2',clientId:'c2',date:'2026-10-23'}],clients:[{id:'c1',email:'a@x.fr'},{id:'c2',email:'b@x.fr'}]};
      var currentUser=null; function fullName(){ return ''; } function orgaCanal(){ return 'mail'; } function orgaTexte(){ return 'créneau'; } function fmtShort(d){ return d; }
      function docMailOpts(){ return {}; } function intHisto(){} function save(){} function toast(m){ __toasts.push(String(m)); } function closeModal(){ __closes++; }
      function esc(s){ return String(s); } function setTimeout(f){ } var views={ planning(){} }; function orgaRender(){} function clientName(){ return ''; }
      ${GARDE}\n${ORGA}`, ctx);
    ctx.srvMail = S.base;
    const p1 = ctx.orgaEnvoyer(); await tic();
    const p2 = ctx.orgaEnvoyer(); await tic();
    vrai('⛔ deux appuis : la boucle d’envoi ne part qu’une fois (un courriel par client, pas deux)', S.appels.length === 1, S.appels.length);
    S.relacher(true); await tic(); S.relacher(true); await p1; await p2; await tic();
    vrai('… les deux clients sont prévenus, une seule fois chacun', S.appels.length === 2 && new Set(S.appels.map(a => a[0])).size === 2, S.appels.map(a => a[0]));
    vrai('… et le bouton reprend son libellé', B.innerHTML === '✉️ Envoyer', B.innerHTML);
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc est mort : ' + (e.stack || e.message)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });

// Outils communs des sondes de la Boîte mail (module OP Courrier monté dans le prototype OP GESTION) — 16 novembre 2026.
// ⛔ 127.0.0.1 seulement, entreprise fictive. Chaque sonde compte sa POPULATION avant de croire un zéro et sort en 1 si un contrôle tombe.
const lib = require('../lib.js'), fs = require('fs'), path = require('path');
const CAP = process.env.CAP || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/mail';
fs.mkdirSync(CAP, { recursive: true });
// R() : la racine d'ombre du module (le module vit dans un arbre d'ombre : ses éléments ne sont pas dans le document)
const INIT = 'window.R=()=>{const e=document.querySelector("#courrier-hote [data-opcourrier]");return e?e.shadowRoot:null};';
exports.lib = lib; exports.v = lib.v; exports.CAP = CAP; exports.INIT = INIT;
// entrer : ouvre le prototype dans la rubrique Boîte mail et attend que le module soit monté ET qu'il ait rendu ses messages
exports.entrer = async (o) => {
  o = o || {}; const c = await lib.ouvrir(Object.assign({ qui:'marc', attente:1400, init:INIT }, o));
  if (o.sansAller) return c;
  await lib.aller(c.p, 'boiteMail'); await exports.pret(c.p, o.attentePret); return c; };
exports.pret = (p, ms) => lib.attendre(p, () => { const r = window.R && window.R(); return !!r && r.querySelectorAll('.msg').length > 0; }, ms || 9000).then(async ok => { await p.waitForTimeout(500); return ok; });
exports.cap = async (c, nom) => lib.capture(c, path.join(CAP, nom + '.png'));
exports.fin = async (c) => { await lib.fin(c); };
exports.sortie = async () => { await lib.fermer(); const ko = lib.bilan(); process.exit(ko ? 1 : 0); };
exports.ouvrirMsg = async (c, id) => { await c.p.evaluate(i => courrierOuvrir(i), id); await lib.attendre(c.p, () => !!window.R().querySelector('.rsubj'), 5000); await c.p.waitForTimeout(500); };
// casserBoite : pose l'état « la seconde boîte demande son mot de passe » (celui qu'une vraie boîte prend un jour) et relit le courrier — l'état par défaut de la démonstration a ses deux boîtes connectées
exports.casserBoite = async (c) => { await c.p.evaluate(() => { const b = ML_BOITES.find(o => o.id === 'b2'); b.etat = 'reco'; b.vu = 'le 28 oct.'; return COURRIER.inst.rafraichir(); });
  await lib.attendre(c.p, () => !!window.R().querySelector('.loaderr, .empty[role=alert]'), 6000); await c.p.waitForTimeout(300); };

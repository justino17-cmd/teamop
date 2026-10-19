/* LE REGISTRE DES CONTRATS (20 octobre 2026) — les documents contractuels de TeamOP, versionnés, validés par UNE PERSONNE NOMMÉE, et ce
 * que chaque client en a reçu et accepté.
 * Justin : « un juriste qui valide les contrats avec un tampon officiel de chez nous » ; « quelqu'un commande, il paye, il reçoit une
 * facture, il reçoit un contrat ». Règles qui tiennent ce fichier :
 *  · UN AGENT NE VALIDE JAMAIS. Un texte naît « brouillon » (écrit par un agent ou par Justin) ; seul le patron le passe « validé »,
 *    par la route `valider`, et le TAMPON — qui a validé, quand, quelle empreinte — est posée PAR LE SERVEUR : rien n'en vient de la requête.
 *  · UNE VERSION VALIDÉE NE SE MODIFIE PAS. Corriger = une nouvelle version, brouillon, à valider à son tour. L'empreinte (SHA-256 du
 *    texte) dit ce que le client a reçu ; retirer une version la sort de la vigueur, sans l'effacer.
 *  · SANS VERSION VALIDÉE, RIEN NE PART : `creerPourClient` refuse, et le dit (`aucune_version_validee`). Un contrat envoyé avec un
 *    brouillon serait un contrat que personne n'a relu.
 *  · UN CLIENT REÇOIT LA VERSION EN VIGUEUR LE JOUR DE SON ACHAT et la garde : une version validée plus tard ne la remplace pas.
 *  · ce fichier n'envoie rien, ne parle ni à Stripe ni à Anthropic, et un fichier illisible n'est JAMAIS réécrit par-dessus.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/* Les PIÈCES. `groupe` range la Tour : générales (toute la société), application, formule (conditions particulières d'un abonnement), annexes. */
const TYPES = {
  conditions_generales:   'Conditions générales TEAM OP (toutes les applications)',
  conditions_op_gestion:  'Conditions d’utilisation — OP GESTION',
  conditions_op_messages: 'Conditions d’utilisation — OP MESSAGES',
  cp_op_gestion_pro:      'Conditions particulières — OP GESTION Pro',
  cp_op_gestion_business: 'Conditions particulières — OP GESTION Business',
  cp_op_gestion_business_premium: 'Conditions particulières — OP GESTION Business Premium',
  cp_op_messages_perso:   'Conditions particulières — OP MESSAGES Perso',
  cp_op_messages_pro:     'Conditions particulières — OP MESSAGES Pro',
  cp_op_messages_business_premium: 'Conditions particulières — OP MESSAGES Business Premium',
  dpa:                    'Contrat de sous-traitance des données (RGPD art. 28)',
  signature_electronique: 'Conditions de la signature électronique',
};
const GROUPES = { generales: ['conditions_generales'], op_gestion: ['conditions_op_gestion'], op_messages: ['conditions_op_messages'], annexes: ['dpa', 'signature_electronique'] };
const COMMUNES = ['conditions_generales', 'dpa', 'signature_electronique'];
/* Le PAQUET d'un abonnement = ce que le client reçoit et accepte : générales + application + conditions particulières de SA formule + annexes. */
const PAQUETS = {
  'op_gestion:pro':  ['conditions_generales', 'conditions_op_gestion', 'cp_op_gestion_pro', 'dpa', 'signature_electronique'],
  'op_gestion:business': ['conditions_generales', 'conditions_op_gestion', 'cp_op_gestion_business', 'dpa', 'signature_electronique'],
  'op_gestion:business_premium': ['conditions_generales', 'conditions_op_gestion', 'cp_op_gestion_business_premium', 'dpa', 'signature_electronique'],
  'op_messages:perso': ['conditions_generales', 'conditions_op_messages', 'cp_op_messages_perso', 'dpa', 'signature_electronique'],
  'op_messages:pro': ['conditions_generales', 'conditions_op_messages', 'cp_op_messages_pro', 'dpa', 'signature_electronique'],
  'op_messages:business_premium': ['conditions_generales', 'conditions_op_messages', 'cp_op_messages_business_premium', 'dpa', 'signature_electronique'],
};
/* Un texte qui porte encore un point à confirmer ne se valide pas : le tampon dirait que tout est relu. */
const MARQUEUR = /\[À (?:CONFIRMER|COMPLÉTER)/;
const TEXTE_MAX = 80000, NOTE_MAX = 300;
const DOS = /^DOS-\d{6}$/;
const sha = t => crypto.createHash('sha256').update(String(t), 'utf8').digest('hex');

module.exports = function contrats(app, ctx) {
  const { DATA_DIR, monAdmin, monPatronStrict } = ctx;
  const agents = ctx.agents || null;
  const maintenant = typeof ctx.maintenant === 'function' ? ctx.maintenant : Date.now;
  const F_DOCS = 'contrats-documents.json', F_CLIENTS = 'contrats-clients.json';
  const illisibles = new Set();
  function charger(nom, defaut) {
    let brut;
    try { brut = fs.readFileSync(path.join(DATA_DIR, nom), 'utf8'); } catch (e) { if (e && e.code === 'ENOENT') return defaut; illisibles.add(nom); return defaut; }
    try { const j = JSON.parse(brut); if (j === null || typeof j !== 'object' || Array.isArray(j) !== Array.isArray(defaut)) throw new Error('forme'); return j; }
    catch (e) { illisibles.add(nom); return defaut; }
  }
  function ecrire(nom, valeur) {
    if (illisibles.has(nom)) { console.error('⛔ ' + nom + ' NON réécrit : illisible au démarrage'); return false; }
    try { const f = path.join(DATA_DIR, nom), tmp = f + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(valeur)); fs.renameSync(tmp, f); return true; }
    catch (e) { console.error(nom + ' non écrit :', e.message); return false; }
  }
  let docs = charger(F_DOCS, {});          // { type: [ {n, ts, auteur, texte, statut, note, validePar?, valideLe?, empreinte?} ] }
  let clients = charger(F_CLIENTS, []);    // [ {id, dossier, type, version, empreinte, envoyeLe, accepteLe} ]
  let enSemis = false;
  const noter = (a, o) => { if (!enSemis && agents && agents.noter) { try { agents.noter('systeme', a, o); } catch (e) {} } };
  const illisible = () => illisibles.has(F_DOCS) || illisibles.has(F_CLIENTS);

  const versions = type => (Array.isArray(docs[type]) ? docs[type] : []);
  /* La version EN VIGUEUR : la plus haute validée, et non retirée. `null` : aucune. */
  function enVigueur(type) {
    if (illisibles.has(F_DOCS)) return null;
    const v = versions(type).filter(x => x.statut === 'valide').sort((a, b) => b.n - a.n)[0];
    return v ? { n: v.n, empreinte: v.empreinte, valideLe: v.valideLe, validePar: v.validePar, texte: v.texte } : null;
  }
  const vueVersion = (v, avecTexte) => { const o = { n: v.n, ts: v.ts, auteur: v.auteur, statut: v.statut, note: v.note || '', longueur: String(v.texte || '').length }; if (v.statut === 'valide' || v.statut === 'retire') { o.validePar = v.validePar; o.valideLe = v.valideLe; o.empreinte = v.empreinte; } if (avecTexte) o.texte = v.texte; return o; };

  function brouillon(type, texte, auteur, note) {
    if (!TYPES[type]) return { code: 400, error: 'Type de document inconnu' };
    if (illisibles.has(F_DOCS)) return { code: 503, error: 'Le registre des contrats est illisible' };
    const t = typeof texte === 'string' ? texte.replace(/\r\n/g, '\n').trim() : '';
    if (!t) return { code: 400, error: 'Texte vide' };
    if (t.length > TEXTE_MAX) return { code: 400, error: 'Texte trop long (' + TEXTE_MAX + ' caractères au plus)' };
    const liste = versions(type).slice();
    const v = { n: liste.reduce((m, x) => Math.max(m, x.n), 0) + 1, ts: maintenant(), auteur: String(auteur || '').slice(0, 60), texte: t, statut: 'brouillon', note: String(note || '').slice(0, NOTE_MAX) };
    const avant = docs[type]; docs[type] = liste.concat([v]);
    if (!ecrire(F_DOCS, docs)) { if (avant === undefined) delete docs[type]; else docs[type] = avant; return { code: 503, error: 'Brouillon non enregistré' }; }
    noter('contrat : brouillon', { cible: type, detail: 'version ' + v.n + ' par ' + v.auteur });
    return { code: 200, version: v };
  }
  /* Le tampon. Seul chemin vers « validé » ; `qui` vient de la session de la Tour, jamais du corps de la requête. */
  function valider(type, n, qui) {
    if (!TYPES[type]) return { code: 400, error: 'Type de document inconnu' };
    if (illisibles.has(F_DOCS)) return { code: 503, error: 'Le registre des contrats est illisible' };
    const liste = versions(type), i = liste.findIndex(x => x.n === n);
    if (i < 0) return { code: 404, error: 'Version inconnue' };
    if (liste[i].statut !== 'brouillon') return { code: 409, error: 'Cette version est déjà ' + (liste[i].statut === 'valide' ? 'validée' : 'retirée') };
    if (!qui) return { code: 400, error: 'Personne nommée manquante' };
    if (MARQUEUR.test(liste[i].texte)) return { code: 409, error: 'Ce texte porte encore des points « À CONFIRMER » : les trancher dans un nouveau brouillon avant de valider' };
    const copie = liste.map(x => Object.assign({}, x));
    Object.assign(copie[i], { statut: 'valide', validePar: String(qui).slice(0, 60), valideLe: maintenant(), empreinte: sha(copie[i].texte) });
    const avant = docs[type]; docs[type] = copie;
    if (!ecrire(F_DOCS, docs)) { docs[type] = avant; return { code: 503, error: 'Validation non enregistrée' }; }
    noter('contrat : validé', { cible: type, detail: 'version ' + n + ' par ' + copie[i].validePar });
    return { code: 200, version: copie[i] };
  }
  function retirer(type, n, qui) {
    if (!TYPES[type]) return { code: 400, error: 'Type de document inconnu' };
    if (illisibles.has(F_DOCS)) return { code: 503, error: 'Le registre des contrats est illisible' };
    const liste = versions(type), i = liste.findIndex(x => x.n === n);
    if (i < 0) return { code: 404, error: 'Version inconnue' };
    if (liste[i].statut !== 'valide') return { code: 409, error: 'Seule une version validée se retire' };
    const copie = liste.map(x => Object.assign({}, x)); copie[i].statut = 'retire';
    const avant = docs[type]; docs[type] = copie;
    if (!ecrire(F_DOCS, docs)) { docs[type] = avant; return { code: 503, error: 'Retrait non enregistré' }; }
    noter('contrat : retiré', { cible: type, detail: 'version ' + n + ' par ' + String(qui || '').slice(0, 60) });
    return { code: 200 };
  }

  /* Le contrat d'UN client : la version en vigueur aujourd'hui, figée. Un dossier qui a déjà ce type de contrat n'en reçoit pas un second. */
  function creerPourClient(dossier, type) {
    if (!DOS.test(String(dossier))) return { ok: false, raison: 'dossier' };
    if (!TYPES[type]) return { ok: false, raison: 'type' };
    if (illisible()) return { ok: false, raison: 'registre_illisible' };
    const deja = clients.find(c => c.dossier === dossier && c.type === type);
    if (deja) return { ok: true, deja: true, contrat: Object.assign({}, deja) };
    const v = enVigueur(type);
    if (!v) { noter('contrat : rien à envoyer', { cible: dossier, resultat: 'refuse', detail: 'aucune version validée de ' + type }); return { ok: false, raison: 'aucune_version_validee' }; }
    const c = { id: crypto.randomBytes(6).toString('hex'), dossier, type, version: v.n, empreinte: v.empreinte, envoyeLe: 0, accepteLe: 0 };
    const avant = clients; clients = clients.concat([c]);
    if (!ecrire(F_CLIENTS, clients)) { clients = avant; return { ok: false, raison: 'non_ecrit' }; }
    return { ok: true, contrat: Object.assign({}, c) };
  }
  function marquer(id, champ) {
    if (illisible()) return { ok: false, raison: 'registre_illisible' };
    const i = clients.findIndex(c => c.id === id);
    if (i < 0) return { ok: false, raison: 'inconnu' };
    if (clients[i][champ]) return { ok: true, deja: true, contrat: Object.assign({}, clients[i]) };
    if (champ === 'accepteLe' && !clients[i].envoyeLe) return { ok: false, raison: 'pas_envoye' };
    const copie = clients.map(c => Object.assign({}, c)); copie[i][champ] = maintenant();
    const avant = clients; clients = copie;
    if (!ecrire(F_CLIENTS, clients)) { clients = avant; return { ok: false, raison: 'non_ecrit' }; }
    noter(champ === 'envoyeLe' ? 'contrat : envoyé' : 'contrat : accepté', { cible: clients[i].dossier, detail: clients[i].type + ' v' + clients[i].version });
    return { ok: true, contrat: Object.assign({}, clients[i]) };
  }
  /* Le contrat d'un ABONNEMENT : toutes les pièces de son paquet, chacune dans sa version en vigueur, figées ensemble. Une pièce sans version validée bloque tout. */
  function paquetManquant(cle) { return (PAQUETS[cle] || []).filter(t => !enVigueur(t)); }
  function creerPaquet(dossier, application, formule) {
    const cle = String(application) + ':' + String(formule);
    if (!DOS.test(String(dossier))) return { ok: false, raison: 'dossier' };
    if (!PAQUETS[cle]) return { ok: false, raison: 'formule' };
    if (illisible()) return { ok: false, raison: 'registre_illisible' };
    const type = 'paquet:' + cle;
    const deja = clients.find(c => c.dossier === dossier && c.type === type);
    if (deja) return { ok: true, deja: true, contrat: Object.assign({}, deja) };
    const manquantes = paquetManquant(cle);
    if (manquantes.length) { noter('contrat : rien à envoyer', { cible: dossier, resultat: 'refuse', detail: 'pièces sans version validée : ' + manquantes.join(', ') }); return { ok: false, raison: 'aucune_version_validee', manquantes }; }
    const pieces = PAQUETS[cle].map(t => { const v = enVigueur(t); return { type: t, version: v.n, empreinte: v.empreinte }; });
    const c = { id: crypto.randomBytes(6).toString('hex'), dossier, type, pieces, version: 0, empreinte: sha(pieces.map(p => p.type + p.version + p.empreinte).join('|')), envoyeLe: 0, accepteLe: 0 };
    const avant = clients; clients = clients.concat([c]);
    if (!ecrire(F_CLIENTS, clients)) { clients = avant; return { ok: false, raison: 'non_ecrit' }; }
    return { ok: true, contrat: Object.assign({}, c) };
  }
  /* Les textes rédigés (dossier contrats-textes) entrent comme BROUILLONS, une fois, sur un type encore vide. Jamais validés ici. */
  function semer(dossierTextes) {
    if (!dossierTextes || illisibles.has(F_DOCS)) return 0;
    let n = 0; enSemis = true;
    try { for (const t of Object.keys(TYPES)) {
      if (versions(t).length) continue;
      let texte; try { texte = fs.readFileSync(path.join(dossierTextes, t + '.txt'), 'utf8'); } catch (e) { continue; }
      if (brouillon(t, texte, 'Rédaction (agents)', 'Texte initial — à relire et trancher les points « À CONFIRMER »').code === 200) n++;
    } } finally { enSemis = false; }
    return n;
  }
  if (ctx.textesDir) { try { semer(ctx.textesDir); } catch (e) { console.error('semis des contrats :', e.message); } }
  const marquerEnvoye = id => marquer(id, 'envoyeLe');
  const marquerAccepte = id => marquer(id, 'accepteLe');

  /* ── les routes (le patron seul écrit ; l'administrateur lit) ── */
  app.get('/api/monitor/contrats', monAdmin, (req, res) => {
    if (illisible()) return res.status(503).json({ error: 'Le registre des contrats est illisible' });
    res.json({ ok: true, groupes: GROUPES, paquets: Object.keys(PAQUETS).map(k => ({ cle: k, pieces: PAQUETS[k], manquantes: paquetManquant(k) })), types: Object.keys(TYPES).map(t => ({ type: t, libelle: TYPES[t], aConfirmer: versions(t).some(x => x.statut === 'brouillon' && MARQUEUR.test(x.texte)), enVigueur: (() => { const v = enVigueur(t); return v ? { n: v.n, validePar: v.validePar, valideLe: v.valideLe, empreinte: v.empreinte } : null; })(), versions: versions(t).map(x => vueVersion(x, false)).reverse() })),
      clients: { total: clients.length, envoyes: clients.filter(c => c.envoyeLe).length, acceptes: clients.filter(c => c.accepteLe).length, enAttente: clients.filter(c => c.envoyeLe && !c.accepteLe).length } });
  });
  app.get('/api/monitor/contrats/version', monAdmin, (req, res) => {
    if (illisibles.has(F_DOCS)) return res.status(503).json({ error: 'Le registre des contrats est illisible' });
    const t = String(req.query.type || ''), n = parseInt(req.query.n, 10);
    const v = TYPES[t] && versions(t).find(x => x.n === n);
    if (!v) return res.status(404).json({ error: 'Version inconnue' });
    res.json({ ok: true, version: vueVersion(v, true) });
  });
  app.get('/api/monitor/contrats/clients', monAdmin, (req, res) => {
    if (illisibles.has(F_CLIENTS)) return res.status(503).json({ error: 'Les contrats des clients sont illisibles' });
    res.json({ ok: true, contrats: clients.slice(-200).reverse().map(c => ({ id: c.id, dossier: c.dossier, type: c.type, version: c.version, envoyeLe: c.envoyeLe, accepteLe: c.accepteLe })) });
  });
  const reponse = (res, r) => (r.code === 200 ? res.json({ ok: true, version: r.version ? vueVersion(r.version, false) : undefined }) : res.status(r.code).json({ error: r.error }));
  app.post('/api/monitor/contrats/brouillon', monPatronStrict, (req, res) => { const b = req.body || {}; reponse(res, brouillon(String(b.type || ''), b.texte, (req.tourUser && req.tourUser.nom) || '', b.note)); });
  app.post('/api/monitor/contrats/valider', monPatronStrict, (req, res) => { const b = req.body || {}; reponse(res, valider(String(b.type || ''), Number(b.n), req.tourUser && req.tourUser.nom)); });
  app.post('/api/monitor/contrats/retirer', monPatronStrict, (req, res) => { const b = req.body || {}; reponse(res, retirer(String(b.type || ''), Number(b.n), req.tourUser && req.tourUser.nom)); });

  return { enVigueur, brouillon, valider, creerPourClient, creerPaquet, semer, marquerEnvoye, marquerAccepte, estIllisible: illisible, TYPES };
};
module.exports.TYPES = TYPES;
module.exports.PAQUETS = PAQUETS;
module.exports.sha = sha;

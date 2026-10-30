/* LES DOCUMENTS DES AGENTS DE GESTION — ce que Hugo, Margaux, Emma et Sarah envoient, et ce que Justin valide d'abord (23 octobre 2026).
 *
 * Quatre sortes de papier, une seule pièce :
 *   · `courrier_agent` — UN courriel à UN client (accusé de résiliation, relance d'impayé, créneaux d'Emma). Il part SEUL quand l'agent est en mode « auto » et que sa porte est
 *     ouverte (la charte : `relancer_impaye` ou `repondre_client` ; l'accusé d'une résiliation n'en a pas) ; sinon c'est une validation de Justin, avec l'aperçu ;
 *   · `mise_en_demeure` — Justin : « s'il n'arrête pas l'abonnement et qu'il ne paye pas, là on fait les démarches pour les faire payer ». Margaux la PRÉPARE ; la charte (`mise_en_demeure`,
 *     geste FIXE) ne l'ouvre jamais en automatique, et ce fichier ne sait pas l'envoyer sans validation : ni mode « auto », ni charte, ni exécuteur appelé autrement que par la décision de Justin ;
 *   · `annonce_clients` — Sarah rédige, Justin valide : un envoi à TOUS les clients est sortant et massif, il ne part jamais seul ;
 *   · (la fin d'abonnement elle-même est `resilier_fin_periode`, qui vit chez Hugo.)
 *
 * ⛔ Le DESTINATAIRE est celui que le code a posé (l'adresse du compte, l'adresse de facturation que Stripe donne) : aucune route ne le change — seuls l'objet et le texte se corrigent,
 *    par Justin. Un texte venu d'un client ne devient jamais un destinataire.
 * ⛔ CE QUI PART EST CE QUE JUSTIN A LU : l'aperçu porte une EMPREINTE du texte, « Valider et envoyer » la renvoie, et la garde d'acceptation (`agents.garde`) refuse (409, la validation
 *    reste en attente) si le document a changé depuis, ou si l'empreinte manque.
 * ⛔ UN ENVOI QUI ÉCHOUE NE FERME PAS LA PORTE (trois essais, une nouvelle validation à chaque fois) — sauf une annonce dont une partie est déjà partie : on ne la renvoie jamais.
 * ⛔ Un registre illisible au démarrage : plus rien ne se dépose ni ne s'envoie (sans registre, on ne sait plus ce qui est parti — et un courriel ne se rattrape pas).
 * ⛔ Le contrôle qualité (`agents-courriers-ops.js`) passe AVANT tout envoi direct. Un texte qui échoue n'est pas envoyé : il devient un document « à revoir » pour Justin, avec les fautes.
 * Toutes les dépendances sont INJECTÉES.
 */
'use strict';
const crypto = require('crypto');
const OPS = require('./agents-courriers-ops');

const F = 'agents-documents.json';
const MAX = 500;
const REF_DOC = /^dc[0-9a-f]{12}$/;
const TYPES = ['courrier_agent', 'mise_en_demeure', 'annonce_clients'];
const ECHECS_MAX = 3;
const OBJET_MAX = 200, TEXTE_MAX = 20000;
const FORME_DOSSIER = /^DOS-\d{6}$/;
const SIGNATURE_LETTRE = 'TEAM OP\n' + OPS.ADRESSE_CONTACT + ' · teamop.fr';

const empreinteDe = e => crypto.createHash('sha256').update('document:' + String(e.objet) + '\n' + String(e.texte)).digest('hex').slice(0, 32);

module.exports = function documents(app, ctx) {
  const { agents, mail } = ctx;
  const monAdmin = ctx.monAdmin, monPatronStrict = ctx.monPatronStrict;
  const direction = ctx.direction || null;
  const maintenant = typeof ctx.maintenant === 'function' ? ctx.maintenant : Date.now;
  const fich = ctx.fichier || require('./agents-fichier')(ctx.DATA_DIR);
  const sansAdr = typeof ctx.sansAdresses === 'function' ? ctx.sansAdresses : (t => String(t || '').replace(/[^\s<>"'(),;:[\]]+@[^\s<>"'(),;:[\]]+/g, '(adresse)'));
  /* Annonce : `diffuser(doc)` envoie à tous les clients (rend { envoyes, refus }), `destinataires()` en rend le nombre. Sans eux, l'annonce ne se dépose pas. */
  const diffuser = typeof ctx.diffuser === 'function' ? ctx.diffuser : null;
  const destinataires = typeof ctx.destinataires === 'function' ? ctx.destinataires : null;

  const reg = fich.charger(F, {});
  const enEnvoi = new Set();
  const sauve = () => fich.ecrire(F, reg);
  const illisible = () => fich.illisible(F);
  const bonneAdresse = a => typeof a === 'string' && a.length <= 160 && /^[^@\s<>",;]+@[^@\s<>",;]+\.[^@\s<>",;]+$/.test(a);

  function elaguer() {
    const refs = Object.keys(reg);
    if (refs.length <= MAX) return;
    const rang = r => (reg[r].etat === 'envoye' ? 0 : reg[r].etat === 'echec' ? 1 : 2);
    refs.sort((x, y) => rang(x) - rang(y) || (reg[x].cree || 0) - (reg[y].cree || 0));
    for (const r of refs.slice(0, refs.length - MAX)) delete reg[r];
  }
  const attendue = (type, ref) => agents.enAttentePour(type, 'ref', ref);

  /* Le résumé de la validation : composé ICI (jamais un mot de Claude), sans adresse ni nom. */
  function resumeDe(e) {
    const dos = e.dossier ? ' (' + e.dossier + ')' : '';
    if (e.type === 'mise_en_demeure') return 'Mise en demeure préparée' + dos + (e.aRevoir ? ' — À REVOIR : ' + e.aRevoir : ' — à relire') + ' : elle ne part que si tu la valides';
    if (e.type === 'annonce_clients') return 'Annonce à tous les clients — ' + (e.aRevoir ? 'à revoir : ' + e.aRevoir : 'à relire') + ' : elle ne part que si tu la valides';
    const nom = { resiliation: 'Accusé de fin d’abonnement', relance: 'Relance d’impayé', rendez_vous: 'Rendez-vous avec un prospect' }[e.source] || 'Courriel d’un agent';
    return nom + dos + (e.aRevoir ? ' — à revoir : ' + e.aRevoir : ' — à relire avant envoi');
  }

  /* RANGER un document (sans rien demander à Justin). `o` : { type, agent, a?, objet, texte, source, dossier?, autorises?, lettre?, aRevoir? }.
     Rend { ok:true, ref } ou { ok:false, raison }. Ne jette pas. */
  function ranger(o) {
    o = o || {};
    if (!TYPES.includes(o.type)) return { ok: false, raison: 'type' };
    const agent = o.agent;
    if (!agents.AGENTS.some(a => a.id === agent)) return { ok: false, raison: 'agent' };
    const p = agents.peutAgir(agent);
    if (!p.ok) return { ok: false, raison: p.raison };
    if (p.horsHeures) return { ok: false, raison: 'hors_heures' };       // l'astreinte veille hors des heures mais n'écrit JAMAIS à un client
    if (illisible()) { agents.noter(agent, 'déposer un document', { cible: o.type, resultat: 'refuse', detail: 'registre des documents illisible' }); return { ok: false, raison: 'registre_illisible' }; }
    const objet = String(o.objet || '').replace(/[\r\n]+/g, ' ').trim();
    const texte = String(o.texte || '').trim();
    if (!objet || objet.length > OBJET_MAX || !texte || texte.length > TEXTE_MAX) { agents.noter(agent, 'déposer un document', { cible: o.type, resultat: 'refuse', detail: 'objet ou texte hors bornes' }); return { ok: false, raison: 'forme' }; }
    let a = '', nb = 0;
    if (o.type === 'annonce_clients') {
      if (!diffuser || !destinataires) return { ok: false, raison: 'pas_de_diffusion' };
      try { nb = Math.max(0, parseInt(destinataires(), 10) || 0); } catch (e) { nb = 0; }
      if (!nb) { agents.noter(agent, 'déposer un document', { cible: o.type, resultat: 'refuse', detail: 'aucun destinataire' }); return { ok: false, raison: 'aucun_destinataire' }; }
    } else {
      a = String(o.a || '').trim().toLowerCase();
      if (!bonneAdresse(a)) { agents.noter(agent, 'déposer un document', { cible: o.type, resultat: 'refuse', detail: 'destinataire invalide' }); return { ok: false, raison: 'destinataire' }; }
    }
    /* ⛔ pas de signature d'agent, pas de courriel : `signatureAgent` rend '' pour un agent hors des quatre, et l'envoi retomberait sur la signature de la boîte — celle de Justin */
    if (o.type === 'courrier_agent' && !OPS.signatureAgent(agent)) { agents.noter(agent, 'déposer un document', { cible: o.type, resultat: 'refuse', detail: 'cet agent n’a pas de signature' }); return { ok: false, raison: 'signature' }; }
    const dossier = FORME_DOSSIER.test(String(o.dossier || '')) ? String(o.dossier) : '';
    const ref = 'dc' + crypto.randomBytes(6).toString('hex');
    const aut = o.autorises && typeof o.autorises === 'object' ? o.autorises : {};
    /* ⛔ la mise en demeure passe aussi par le contrôle qualité (formule de la LETTRE) : son seul texte libre est le nom d'entreprise du registre, saisi par le client. Une faute ne la bloque pas
       — Justin la relit avant tout envoi —, elle la marque « à revoir ». */
    if (o.type === 'mise_en_demeure' && !o.aRevoir) { let f = []; try { f = OPS.controle(objet, texte, Object.assign({}, aut, { lettre: true })); } catch (e) { f = ['contrôle impossible']; } if (f.length) o = Object.assign({}, o, { aRevoir: f.join(', ') }); }
    reg[ref] = { ref, type: o.type, agent, a, nb, objet, texte, source: String(o.source || '').slice(0, 20), dossier, lettre: o.lettre === true,
      autorises: { liens: (aut.liens || []).map(String).slice(0, 5), montants: (aut.montants || []).map(Number).filter(Number.isFinite).slice(0, 5), permis: (aut.permis || []).map(String).slice(0, 5) },
      aRevoir: String(o.aRevoir || '').slice(0, 120), cree: maintenant(), etat: 'attente' };
    elaguer();
    if (!sauve()) { delete reg[ref]; return { ok: false, raison: 'ecriture' }; }
    return { ok: true, ref };
  }
  /* …puis ouvrir sa VALIDATION. Sans place dans la file (ou agent à l'arrêt), le document est retiré : rien ne reste rangé sans que Justin l'ait vu passer. */
  function proposer(ref) {
    const e = reg[ref];
    if (!e) return { ok: false, raison: 'introuvable' };
    const r = agents.proposer(e.agent, e.type, resumeDe(e), { ref });
    if (!r.ok) { delete reg[ref]; sauve(); return { ok: false, raison: r.raison }; }
    return { ok: true, ref };
  }
  /* Déposer = ranger + proposer. */
  function deposer(o) {
    const r = ranger(o);
    return r.ok ? proposer(r.ref) : r;
  }

  /* LA SIGNATURE (fusion de l'intégration, 23 octobre 2026) : celle du registre des signatures (`agents-signature.js`, que Justin règle depuis la Tour — le rôle de chacun, le nom de l'équipe),
     composée avec l'adresse de la boîte qui ENVOIE ; à défaut de registre branché, celle de `agents-courriers-ops.js` — la même mise en forme. Seuls les quatre agents de la gestion en ont une
     (`OPS.signatureAgent` rend '' pour les autres : pas de signature, pas de courriel). */
  const signatures = ctx.signatures && typeof ctx.signatures.composer === 'function' ? ctx.signatures : null;
  const adresseBoite = () => { try { const id = mail.boiteParRole('contact'); const b = (typeof mail.boites === 'function' ? mail.boites() : []).find(x => x && x.id === id); return (b && b.email) || ''; } catch (e) { return ''; } };
  const signatureDe = e => {
    if (e.type === 'mise_en_demeure') return SIGNATURE_LETTRE;
    const base = OPS.signatureAgent(e.agent);
    if (!base || !signatures) return base;
    let s = ''; try { s = signatures.composer(e.agent, adresseBoite()); } catch (x) { s = ''; }
    return s || base;
  };

  /* L'ENVOI d'un document déjà rangé. Jette s'il n'existe pas, n'attend plus, ou part déjà. */
  async function envoyer(ref) {
    if (illisible()) throw new Error('registre des documents illisible');
    const e = REF_DOC.test(String(ref)) ? reg[ref] : null;
    if (!e) throw new Error('document introuvable');
    if (e.etat !== 'attente') throw new Error('document déjà ' + (e.etat === 'envoye' ? 'envoyé' : 'en échec'));
    if (enEnvoi.has(ref)) throw new Error('envoi déjà en cours');
    enEnvoi.add(ref);
    try {
      if (e.type === 'annonce_clients') {
        const r = await diffuser({ objet: e.objet, texte: e.texte });
        const envoyes = (r && parseInt(r.envoyes, 10)) || 0;
        if (envoyes <= 0) throw new Error('aucune annonce partie');
        e.etat = 'envoye'; e.envoyeTs = maintenant(); e.envoyes = envoyes; e.refus = (r && parseInt(r.refus, 10)) || 0; sauve();
        agents.noter(e.agent, 'annonce envoyée', { cible: 'clients', resultat: 'ok', detail: envoyes + ' entreprise(s)' + (e.refus ? ', ' + e.refus + ' refus' : '') });
        return;
      }
      if (!signatureDe(e)) throw new Error('signature introuvable : cet agent n’en a pas');
      /* ⛔ « Contrôle, ils ne l'utilisent pas » (Justin) : `boiteParRole` retombe sur la PREMIÈRE boîte quand aucune ne commence par contact@ — si c'était controle@, un agent écrirait d'une boîte qui n'est pas la sienne */
      const boiteId = mail.boiteParRole('contact');
      const bx = (typeof mail.boites === 'function' ? mail.boites() : []).find(b => b && b.id === boiteId);
      if (!boiteId || /^controle@/i.test(String((bx && bx.email) || ''))) throw new Error('aucune boîte d’agent (contact@) : la boîte de contrôle n’est pas utilisée');
      await mail.envoyerAgent({ boiteId, a: e.a, objet: e.objet, texte: e.texte, signature: signatureDe(e), enReponseA: e.enReponseA || null });
      e.etat = 'envoye'; e.envoyeTs = maintenant(); sauve();
      agents.noter(e.agent, e.type === 'mise_en_demeure' ? 'mise en demeure envoyée' : 'courriel envoyé', { cible: e.source || e.type, resultat: 'ok', detail: e.dossier || '' });
    } catch (err) {
      e.erreur = String(sansAdr(String((err && err.message) || err))).slice(0, 120);
      e.echecs = (e.echecs || 0) + 1;
      /* ⛔ pas fini : il revient « en attente » et Justin reçoit une nouvelle validation — trois essais au plus */
      e.etat = e.echecs < ECHECS_MAX && rouvrir(ref, e) ? 'attente' : 'echec';
      sauve();
      agents.noter(e.agent, e.type === 'annonce_clients' ? 'annonce envoyée' : 'courriel envoyé', { cible: e.source || e.type, resultat: 'erreur', detail: e.erreur + (e.etat === 'attente' ? ' — nouvelle validation ouverte' : ' — plus d’essai') });
      throw err;
    } finally { enEnvoi.delete(ref); }
  }
  function rouvrir(ref, e) {
    if (attendue(e.type, ref)) return true;
    const r = agents.proposer(e.agent, e.type, resumeDe(e) + ' (envoi échoué : à renvoyer)', { ref });
    return !!(r && r.ok);
  }

  /* LE COURRIER D'UN CLIENT : l'agent le compose (le code), ce module décide de la voie.
     `o` : { agent, a, objet, texte, source, dossier, autorises, porte:'aucune'|'repondre_client'|'relancer_impaye', enReponseA? }.
     · le contrôle qualité d'abord : un texte fautif n'est JAMAIS envoyé seul — c'est un document « à revoir » pour Justin ;
     · mode « auto » ET porte ouverte (la charte, lue À CE MOMENT) → envoi direct, journalisé ; sinon validation avec aperçu.
     Rend { ok, voie:'direct'|'validation', ref, aRevoir? } ou { ok:false, raison }. */
  async function courrier(o) {
    o = o || {};
    const p = agents.peutAgir(o.agent);
    if (!p.ok) return { ok: false, raison: p.raison };
    if (p.horsHeures) return { ok: false, raison: 'hors_heures' };       // l'astreinte veille hors des heures mais n'écrit JAMAIS à un client
    const fautes = OPS.controle(o.objet, o.texte, Object.assign({}, o.autorises || {}, { lettre: false }));
    /* `o.aRevoirT` (mode « travail », 30 octobre 2026) : la grille de relecture a trouvé le texte sous le seuil, ou n'a pas pu le noter — la raison, en quelques mots du code ; le texte part alors EN VALIDATION, jamais seul */
    const aRevoir = fautes.join(', ') || (typeof o.aRevoirT === 'string' ? o.aRevoirT.replace(/[\r\n]+/g, ' ').slice(0, 200) : '');
    if (aRevoir) agents.noter(o.agent, 'contrôle qualité', { cible: o.source || 'courrier', resultat: 'refuse', detail: 'à revoir : ' + aRevoir });
    const d = ranger({ type: 'courrier_agent', agent: o.agent, a: o.a, objet: o.objet, texte: o.texte, source: o.source, dossier: o.dossier, autorises: o.autorises, aRevoir });
    if (!d.ok) return d;
    if (o.enReponseA && reg[d.ref]) { reg[d.ref].enReponseA = o.enReponseA; sauve(); }
    const porte = o.porte === 'aucune' ? true
      : !!(direction && typeof direction.autorise === 'function' && direction.autorise(o.porte === 'relancer_impaye' ? 'relancer_impaye' : 'repondre_client').auto === true);
    /* ⛔ seul le mode « auto » ET la porte ouverte envoient sans Justin — ou Justin lui-même, qui vient de valider le geste dont ce courrier est l'accusé (`o.valide`) ; un texte
       « à revoir » ne part jamais seul ; tout le reste : une validation, avec l'aperçu */
    const direct = o.valide === true || (p.mode === 'auto' && porte);
    if (aRevoir || !direct) { const v = proposer(d.ref); return v.ok ? { ok: true, voie: 'validation', ref: d.ref, aRevoir: aRevoir || undefined } : v; }
    try {
      await envoyer(d.ref);
      agents.noter(o.agent, 'courriel envoyé sans validation', { cible: o.source || 'courrier', resultat: 'ok', detail: o.valide === true ? 'après ta validation' : 'mode auto' + (o.porte === 'aucune' ? '' : ', charte ouverte') });
      return { ok: true, voie: 'direct', ref: d.ref };
    } catch (e) {
      if (reg[d.ref] && reg[d.ref].etat === 'attente' && attendue('courrier_agent', d.ref)) return { ok: true, voie: 'validation', ref: d.ref, envoiEchoue: true };
      return { ok: false, raison: 'envoi', ref: d.ref };
    }
  }

  /* un document à lire pour l'écran */
  const vue = e => ({ type: e.type, agent: e.agent, a: e.a, cible: e.type === 'annonce_clients' ? 'Tous les clients (' + (e.nb || 0) + ' entreprise' + (e.nb > 1 ? 's' : '') + ')' : e.a,
    objet: e.objet, texte: e.texte, source: e.source, dossier: e.dossier, etat: (e.etat === 'attente' && !attendue(e.type, e.ref)) ? 'sans_suite' : e.etat, empreinte: empreinteDe(e), echecs: e.echecs || 0, aRevoir: e.aRevoir || '',
    signature: e.type === 'annonce_clients' ? '' : signatureDe(e), envoyes: e.envoyes || 0, corrige: e.corrige === true });

  app.get('/api/monitor/agents/documents', monAdmin, (req, res) => {
    if (illisible()) return res.status(503).json({ error: 'Le registre des documents est illisible' });
    const refs = String(req.query.refs || '').split(',').map(x => x.trim()).filter(x => REF_DOC.test(x)).slice(0, 50);
    const out = {};
    /* ⛔ l'adresse du client et le texte d'une mise en demeure (nom d'entreprise, montant) ne se lisent que du PATRON : un compte de la Tour qui n'est pas patron voit l'objet, l'état, l'agent — pas qui, ni la lettre */
    const patron = !!(req.tourUser && req.tourUser.role === 'patron');
    for (const r of refs) if (reg[r]) {
      const x = vue(reg[r]);
      if (!patron) { if (x.a) x.a = ''; if (x.type !== 'annonce_clients') x.cible = ''; if (x.type === 'mise_en_demeure') x.texte = ''; x.masque = true; }
      out[r] = x;
    }
    res.json(out);
  });
  app.post('/api/monitor/agents/documents/modifier', monPatronStrict, (req, res) => {
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    if (illisible()) return res.status(503).json({ error: 'Le registre des documents est illisible : rien n’est modifié' });
    if (typeof b.ref !== 'string' || !REF_DOC.test(b.ref) || !reg[b.ref]) return res.status(404).json({ error: 'Document inconnu' });
    if (typeof b.objet !== 'string' || typeof b.texte !== 'string') return res.status(400).json({ error: 'Objet et texte attendus' });
    const objet = b.objet.replace(/[\r\n]+/g, ' ').trim(), texte = b.texte.trim();
    if (!objet || !texte) return res.status(400).json({ error: 'L’objet et le texte ne peuvent pas être vides' });
    if (objet.length > OBJET_MAX) return res.status(400).json({ error: 'Objet trop long (' + OBJET_MAX + ' caractères au plus)' });
    if (texte.length > TEXTE_MAX) return res.status(400).json({ error: 'Texte trop long (' + TEXTE_MAX + ' caractères au plus)' });
    const e = reg[b.ref];
    if (e.etat !== 'attente' || !attendue(e.type, b.ref)) return res.status(409).json({ error: 'Ce document est déjà ' + (e.etat === 'envoye' ? 'envoyé' : e.etat === 'echec' ? 'en échec' : 'classé sans suite') + ' : plus rien à corriger' });
    const avant = { objet: e.objet, texte: e.texte, corrige: e.corrige, aRevoir: e.aRevoir };
    e.objet = objet; e.texte = texte; e.corrige = true; e.aRevoir = '';
    if (!sauve()) { Object.assign(e, avant); if (avant.corrige === undefined) delete e.corrige; return res.status(503).json({ error: 'Correction non enregistrée' }); }
    agents.noter(e.agent, 'document corrigé', { cible: b.ref, qui: req.tourUser && req.tourUser.nom });
    res.json({ ok: true, document: vue(e) });
  });

  /* Les exécuteurs : ce qui s'exécute quand Justin accepte. Ils n'ont que `ref`. */
  for (const t of TYPES) agents.executeur(t, async (params) => { await envoyer(params && params.ref); });
  /* La garde d'acceptation : l'empreinte du texte que Justin a sous les yeux est EXIGÉE. Les agents en pause ne s'exécutent pas : on refuse, la validation reste là. */
  for (const t of TYPES) agents.garde(t, (params, corps) => {
    if (illisible()) return 'Le registre des documents est illisible : rien ne part';
    if (agents.enPause()) return 'Les agents sont en pause : reprends-les avant de valider cet envoi (la demande reste en attente)';
    const e = REF_DOC.test(String(params && params.ref)) ? reg[params.ref] : null;
    if (!e || e.etat !== 'attente') return '';
    if (!corps || corps.empreinte !== empreinteDe(e)) return 'Le document a changé depuis que tu l’as lu, ou n’a pas été relu : recharge la page et relis-le avant de valider';
    return '';
  });

  /* (`envoyer` n'est PAS exposé : on n'envoie un document que par l'exécuteur — Justin vient d'accepter — ou par `courrier`, mode « auto » et porte ouverte.) */
  return { deposer, ranger, proposer, courrier, illisible, vue: ref => (reg[ref] ? vue(reg[ref]) : null), compter: () => Object.keys(reg).length,
    etatDe: ref => (reg[ref] ? reg[ref].etat : null) };
};
module.exports.empreinteDe = empreinteDe;
module.exports.TYPES = TYPES;
module.exports.ECHECS_MAX = ECHECS_MAX;

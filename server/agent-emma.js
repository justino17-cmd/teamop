/* EMMA — les rendez-vous avec les prospects qui veulent un appel (23 octobre 2026).
 *
 * Un prospect écrit « appelez-moi » ou « j'aimerais un rendez-vous ». Camille le lit et le passe à Emma par une demande FERMÉE (la tâche `rendez_vous_prospect`, avec le seul numéro
 * de dossier). Emma propose des CRÉNEAUX par courriel — tirés des disponibilités que JUSTIN règle dans la Tour, rien d'autre : « rien d'inventé » — signé Emma. Quand le prospect
 * choisit (Camille passe `choix_creneau`, le numéro du créneau), Emma confirme au prospect et crée la TÂCHE POUR JUSTIN : le rendez-vous, avec son créneau, dans son fil (« important »,
 * il est notifié) et dans la liste « Rendez-vous à tenir » de la Tour. Sans disponibilités réglées, Emma dit au prospect qu'on le rappelle, et prévient Justin (`rappelClient`).
 *
 * ⛔ L'ADRESSE du prospect est celle de SON DOSSIER (lue par le serveur) : jamais un mot du prospect, jamais un mot de Claude. Emma n'appelle d'ailleurs PAS Claude pour ses courriels.
 * ⛔ Un créneau n'est proposé qu'une fois : ni à deux prospects à la fois, ni un créneau déjà pris, ni dans le préavis, ni hors des plages de Justin.
 * ⛔ Elle ne confirme que ce qu'elle a proposé : un `choix_creneau` pour un autre numéro, pour un dossier sans proposition, ou pour un créneau déjà passé ou pris ne fixe rien — Justin est prévenu.
 * ⛔ Courriel : « auto » + charte `repondre_client` ouverte = il part seul ; sinon une validation avec aperçu (`agents-documents.js`). Un registre illisible : plus rien ne se propose.
 * Toutes les dépendances sont INJECTÉES.
 */
'use strict';
const OPS = require('./agents-courriers-ops');
const { parisParties, tsParis } = require('./reunions');

const ID = 'emma';
const F = 'agents-emma.json';
const FORME_DOSSIER = /^DOS-\d{6}$/;
const HEURE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MS_MIN = 60000, MS_JOUR = 86400000;
const PROPOSITION_VIE_MS = 4 * MS_JOUR;       // un prospect qui ne répond pas en quatre jours libère ses créneaux
/* (28 octobre 2026, Justin : « sans limite ») Un prospect MUET reçoit UNE relance à J+2, tant que ses créneaux tiennent encore (avant qu'ils soient libérés à J+4) : « tous les agents autonomes qui font
   toutes leurs tâches à 100 % » — Emma n'attend plus un silence pour le laisser expirer. Même porte que la proposition (`repondre_client`) : seule avec la charte ouverte, sinon une validation. */
const RELANCE_APRES_MS = 2 * MS_JOUR;
const RELANCES_PAR_PASSAGE = 5;
const CRENEAU_PROCHE_MS = 3600000;            // un créneau qui commence dans moins d'une heure ne se propose plus
const TYPES_TACHES = ['rendez_vous_prospect', 'choix_creneau'];
const RDV_MAX = 200, PROPOSITIONS_MAX = 200;
const DISPO_DEFAUT = { actif: false, dureeMin: 30, preavisH: 24, nb: 3, horizonJours: 14, jours: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] } };

/* ── les disponibilités : une forme fermée, validée champ par champ ───────────────────────────────────────────────────────────────────── */
const enMinutes = h => { const m = HEURE.exec(h); return m ? (+m[1]) * 60 + (+m[2]) : -1; };
/* Rend { dispo } (la forme complète, normalisée) ou { erreur }. `corps` est ce que la Tour envoie ; rien d'autre n'est gardé. */
function validerDispo(corps) {
  if (!corps || typeof corps !== 'object' || Array.isArray(corps)) return { erreur: 'Forme inattendue' };
  const entier = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
  if (typeof corps.actif !== 'boolean') return { erreur: 'actif : vrai ou faux' };
  if (!entier(corps.dureeMin, 15, 120) || corps.dureeMin % 5) return { erreur: 'dureeMin : de 15 à 120 minutes, par pas de 5' };
  if (!entier(corps.preavisH, 1, 168)) return { erreur: 'preavisH : de 1 à 168 heures' };
  if (!entier(corps.nb, 1, 5)) return { erreur: 'nb : de 1 à 5 créneaux proposés' };
  if (!entier(corps.horizonJours, 1, 30)) return { erreur: 'horizonJours : de 1 à 30 jours' };
  if (!corps.jours || typeof corps.jours !== 'object' || Array.isArray(corps.jours)) return { erreur: 'jours : un objet de 1 (lundi) à 7 (dimanche)' };
  const jours = {};
  for (const k of Object.keys(corps.jours)) if (!/^[1-7]$/.test(k)) return { erreur: 'jour inconnu : ' + String(k).slice(0, 10) };
  for (let j = 1; j <= 7; j++) {
    const l = corps.jours[j] === undefined ? [] : corps.jours[j];
    if (!Array.isArray(l) || l.length > 4) return { erreur: 'jour ' + j + ' : quatre plages au plus' };
    const plages = [];
    for (const p of l) {
      if (!Array.isArray(p) || p.length !== 2 || typeof p[0] !== 'string' || typeof p[1] !== 'string') return { erreur: 'jour ' + j + ' : une plage est [début, fin]' };
      const a = enMinutes(p[0]), b = enMinutes(p[1]);
      if (a < 0 || b < 0) return { erreur: 'jour ' + j + ' : heures au format HH:MM' };
      if (b - a < corps.dureeMin) return { erreur: 'jour ' + j + ' : une plage doit durer au moins ' + corps.dureeMin + ' minutes' };
      plages.push([p[0], p[1]]);
    }
    plages.sort((x, y) => enMinutes(x[0]) - enMinutes(y[0]));
    for (let i = 1; i < plages.length; i++) if (enMinutes(plages[i][0]) < enMinutes(plages[i - 1][1])) return { erreur: 'jour ' + j + ' : des plages se chevauchent' };
    jours[j] = plages;
  }
  return { dispo: { actif: corps.actif, dureeMin: corps.dureeMin, preavisH: corps.preavisH, nb: corps.nb, horizonJours: corps.horizonJours, jours } };
}

/* ── les créneaux libres : PUR, rejouable au banc ─────────────────────────────────────────────────────────────────────────────────────
   `dispo` : une disponibilité validée. `maintenant` : ms. `pris` : [ms de début] déjà tenus ou déjà proposés (leur durée est celle de `dispo`).
   Rend jusqu'à `dispo.nb` débuts de créneau (ms, croissants), pris d'abord un par jour (le plus tôt), puis le reste — un prospect voit plusieurs jours, pas trois quarts d'heure d'affilée. */
function creneauxLibres(dispo, maintenant, pris) {
  if (!dispo || dispo.actif !== true) return [];
  const duree = dispo.dureeMin * MS_MIN;
  const occupe = (Array.isArray(pris) ? pris : []).filter(Number.isFinite);
  const libre = ms => !occupe.some(p => ms < p + duree && p < ms + duree);
  const depuis = maintenant + dispo.preavisH * 3600000;
  const auj = parisParties(maintenant);
  const parJour = [];
  for (let d = 0; d <= dispo.horizonJours; d++) {
    const base = new Date(Date.UTC(auj.annee, auj.mois - 1, auj.jour + d));
    const annee = base.getUTCFullYear(), mois = base.getUTCMonth() + 1, jour = base.getUTCDate();
    const js = base.getUTCDay() === 0 ? 7 : base.getUTCDay();
    const dujour = [];
    for (const [a, b] of (dispo.jours[js] || [])) {
      for (let m = enMinutes(a); m + dispo.dureeMin <= enMinutes(b); m += dispo.dureeMin) {
        const ms = tsParis(annee, mois, jour, Math.floor(m / 60), m % 60);
        if (ms >= depuis && libre(ms)) dujour.push(ms);
      }
    }
    if (dujour.length) parJour.push(dujour);
  }
  const choisis = [];
  for (const j of parJour) if (choisis.length < dispo.nb) choisis.push(j[0]);
  for (const j of parJour) for (const ms of j.slice(1)) if (choisis.length < dispo.nb && !choisis.some(c => c < ms + duree && ms < c + duree)) choisis.push(ms);
  return choisis.sort((x, y) => x - y);
}

module.exports = function emma(app, ctx) {
  const { agents, documents, fichier } = ctx;
  const conv = ctx.conversations && typeof ctx.conversations.parler === 'function' ? ctx.conversations : null;
  const monAdmin = ctx.monAdmin, monPatronStrict = ctx.monPatronStrict;
  const maintenant = typeof ctx.maintenant === 'function' ? ctx.maintenant : Date.now;
  const adresseDe = typeof ctx.adresseDe === 'function' ? ctx.adresseDe : (async () => '');      // ('DOS-000123') → l'adresse du dossier | ''
  if (!agents || !documents || typeof documents.courrier !== 'function' || !fichier) {
    return { traiterTaches: async () => ({ saute: 'pas_branchee' }), outilsEquipe: { outils: [], executer: async () => ({ ok: false }) } };
  }
  const reg = fichier.charger(F, { dispo: DISPO_DEFAUT, propositions: {}, rdv: [] });
  const v0 = validerDispo(reg.dispo);
  if (!v0.dispo) reg.dispo = JSON.parse(JSON.stringify(DISPO_DEFAUT)); else reg.dispo = v0.dispo;
  if (!reg.propositions || typeof reg.propositions !== 'object' || Array.isArray(reg.propositions)) reg.propositions = {};
  if (!Array.isArray(reg.rdv)) reg.rdv = [];
  const sauve = () => fichier.ecrire(F, reg);
  const illisible = () => fichier.illisible(F);
  const dire = (texte, niveau) => { if (!conv) return; try { conv.parler(ID, ID, texte, { niveau: niveau || 'info' }); } catch (e) {} };
  const direClients = texte => { if (!conv) return; try { conv.parler(ID, 'clients', texte, { niveau: 'info' }); } catch (e) {} };
  const citation = de => (de && de !== 'justin' && agents.AGENTS.some(a => a.id === de) ? '@' + de + ' ' : '');

  /* ce qui est déjà tenu (rendez-vous à venir) ou déjà proposé (propositions vivantes) : un créneau ne se promet pas deux fois */
  function dejaPris() {
    const now = maintenant();
    const pris = reg.rdv.filter(r => r.etat === 'a_venir' && r.ms > now - MS_JOUR).map(r => r.ms);
    for (const p of Object.values(reg.propositions)) if (p.etat === 'proposee' && now - p.ts < PROPOSITION_VIE_MS) for (const ms of p.creneaux) pris.push(ms);
    return pris;
  }
  function elaguer() {
    const now = maintenant();
    const dos = Object.keys(reg.propositions);
    if (dos.length > PROPOSITIONS_MAX) for (const d of dos.sort((a, b) => reg.propositions[a].ts - reg.propositions[b].ts).slice(0, dos.length - PROPOSITIONS_MAX)) delete reg.propositions[d];
    reg.rdv = reg.rdv.filter(r => r.ms > now - 30 * MS_JOUR).slice(-RDV_MAX);
  }

  /* Un prospect veut être appelé : proposer des créneaux (ou dire qu'on le rappelle). `o` : { dossier, de }. */
  async function surDemandeRendezVous(o) {
    o = o || {};
    const p = agents.peutAgir(ID);
    if (!p.ok) return { saute: p.raison };
    if (illisible()) { agents.noter(ID, 'proposer des créneaux', { cible: 'registre', resultat: 'refuse', detail: 'registre d’Emma illisible' }); return { saute: 'registre_illisible' }; }
    const dossier = String(o.dossier || '').toUpperCase();
    if (!FORME_DOSSIER.test(dossier)) return { saute: 'dossier' };
    const prop = reg.propositions[dossier];
    if (prop && prop.etat === 'proposee' && maintenant() - prop.ts < PROPOSITION_VIE_MS) return { saute: 'deja_proposee' };
    let adresse = ''; try { adresse = String(await adresseDe(dossier) || ''); } catch (e) { adresse = ''; }
    if (!adresse) { dire('Je ne trouve pas d’adresse pour le dossier ' + dossier + ' : je ne peux pas écrire au prospect. Il demande à être appelé — à toi de voir.', 'important'); direClients(citation(o.de) + 'je n’ai pas d’adresse pour le dossier ' + dossier + ' : j’ai prévenu Justin.'); return { saute: 'adresse' }; }
    const creneaux = creneauxLibres(reg.dispo, maintenant(), dejaPris());
    const m = creneaux.length ? OPS.propositionCreneaux({ creneaux, dureeMin: reg.dispo.dureeMin }) : OPS.rappelProspect();
    let c; try { c = await documents.courrier({ agent: ID, a: adresse, objet: m.objet, texte: m.texte, source: 'rendez_vous', dossier, porte: 'repondre_client' }); } catch (e) { c = { ok: false, raison: 'erreur' }; }
    if (!c || !c.ok) { agents.noter(ID, 'proposer des créneaux', { cible: dossier, resultat: 'erreur', detail: 'courriel non préparé : ' + String((c && c.raison) || 'erreur') }); return { saute: 'courrier' }; }
    const dit = c.voie === 'direct' ? 'envoyé au prospect' : 'en attente de ta validation (« Validations »)';
    if (creneaux.length) {
      reg.propositions[dossier] = { ts: maintenant(), creneaux, etat: 'proposee', ref: c.ref, voie: c.voie };
      elaguer(); sauve();
      dire('Le prospect du dossier ' + dossier + ' veut être appelé : je lui ai proposé ' + creneaux.length + ' créneau' + (creneaux.length > 1 ? 'x' : '') + ' (' + dit + '). Dès qu’il choisit, je te crée le rendez-vous.', 'info');
      direClients(citation(o.de) + 'créneaux proposés au prospect du dossier ' + dossier + ' (' + dit + ').');
      return { ok: true, creneaux: creneaux.length, voie: c.voie };
    }
    /* aucun créneau (rien de réglé, ou rien de libre) : on dit la vérité au prospect, et on prévient Justin qu'il y a quelqu'un à rappeler */
    reg.propositions[dossier] = { ts: maintenant(), creneaux: [], etat: 'rappel', ref: c.ref };
    elaguer(); sauve();
    if (conv && typeof conv.rappelClient === 'function') { try { conv.rappelClient(ID, dossier, 'demande_humain'); } catch (e) {} }
    dire(reg.dispo.actif ? 'Aucun de tes créneaux n’est libre pour le dossier ' + dossier + ' : j’ai dit au prospect qu’on le rappelle (' + dit + ').' : 'Tu n’as pas réglé tes disponibilités : j’ai dit au prospect du dossier ' + dossier + ' qu’on le rappelle (' + dit + '). Règle-les dans la page Agents pour que je propose des créneaux.', 'important');
    direClients(citation(o.de) + 'pas de créneau à proposer pour le dossier ' + dossier + ' : le prospect sera rappelé, Justin est prévenu.');
    return { ok: true, creneaux: 0, voie: c.voie, rappel: true };
  }

  /* Le prospect a choisi (ou refusé) : confirmer et créer le rendez-vous pour Justin. `o` : { dossier, creneau: '1'…'5' | 'aucun', de }. */
  async function surChoixCreneau(o) {
    o = o || {};
    const p = agents.peutAgir(ID);
    if (!p.ok) return { saute: p.raison };
    if (illisible()) return { saute: 'registre_illisible' };
    const dossier = String(o.dossier || '').toUpperCase();
    if (!FORME_DOSSIER.test(dossier)) return { saute: 'dossier' };
    const prop = reg.propositions[dossier];
    const qui = citation(o.de);
    if (!prop || prop.etat !== 'proposee') { dire('Le dossier ' + dossier + ' répond à une proposition de créneaux que je n’ai pas (ou plus) : je ne fixe rien. À toi de voir.', 'important'); direClients(qui + 'je n’ai pas de proposition en cours pour le dossier ' + dossier + ' : rien de fixé.'); return { saute: 'pas_de_proposition' }; }
    let adresse = ''; try { adresse = String(await adresseDe(dossier) || ''); } catch (e) { adresse = ''; }
    const idx = /^[1-5]$/.test(String(o.creneau)) ? parseInt(o.creneau, 10) - 1 : -1;
    const ms = idx >= 0 ? prop.creneaux[idx] : undefined;
    const libre = Number.isFinite(ms) && ms > maintenant() && !reg.rdv.some(r => r.etat === 'a_venir' && r.ms < ms + reg.dispo.dureeMin * MS_MIN && ms < r.ms + reg.dispo.dureeMin * MS_MIN);
    if (!libre) {
      /* « aucun ne convient », un numéro qui n'existe pas, un créneau passé ou pris : on ne fixe RIEN, on prévient Justin, on dit au prospect qu'on le rappelle */
      prop.etat = 'rappel'; sauve();
      if (adresse) { const m = OPS.rappelProspect(); try { await documents.courrier({ agent: ID, a: adresse, objet: m.objet, texte: m.texte, source: 'rendez_vous', dossier, porte: 'repondre_client' }); } catch (e) {} }
      if (conv && typeof conv.rappelClient === 'function') { try { conv.rappelClient(ID, dossier, 'demande_humain'); } catch (e) {} }
      dire(o.creneau === 'aucun' ? 'Aucun créneau ne convient au prospect du dossier ' + dossier + ' : il faut le rappeler pour convenir d’un autre moment.' : 'Le créneau choisi par le prospect du dossier ' + dossier + ' n’est plus libre : il faut le rappeler.', 'important');
      direClients(qui + 'aucun rendez-vous fixé pour le dossier ' + dossier + ' : Justin est prévenu, le prospect sera rappelé.');
      return { ok: true, fixe: false };
    }
    reg.rdv.push({ dossier, ms, ts: maintenant(), etat: 'a_venir' });
    prop.etat = 'choisi'; prop.choisi = ms; elaguer();
    if (!sauve()) { reg.rdv.pop(); prop.etat = 'proposee'; delete prop.choisi; return { saute: 'ecriture' }; }
    const lbl = OPS.creneauLibelle(ms);
    if (adresse) {
      const m = OPS.confirmationRendezVous({ ms });
      try { await documents.courrier({ agent: ID, a: adresse, objet: m.objet, texte: m.texte, source: 'rendez_vous', dossier, porte: 'repondre_client' }); } catch (e) { agents.noter(ID, 'confirmer un rendez-vous', { cible: dossier, resultat: 'erreur', detail: 'confirmation non préparée' }); }
    }
    agents.noter(ID, 'rendez-vous fixé', { cible: dossier, resultat: 'ok', detail: lbl });
    /* LA TÂCHE POUR JUSTIN : dans son fil, « important » (il est notifié) — le créneau choisi, le numéro de dossier pour ses coordonnées */
    dire('Rendez-vous à tenir : le prospect du dossier ' + dossier + ' a choisi le ' + lbl + '. Ses coordonnées sont dans le dossier — à toi de l’appeler.', 'important');
    direClients(qui + 'rendez-vous fixé pour le dossier ' + dossier + ' : ' + lbl + '. Justin est prévenu.');
    return { ok: true, fixe: true, ms };
  }

  /* La relance d'un prospect muet : UNE seule fois par proposition (la marque est posée AVANT l'envoi, sur disque), avec les créneaux qui restent futurs — numérotés comme dans la première proposition,
     puisque le prospect répondra par ce numéro. Aucun créneau futur : rien à relancer, la proposition expirera. Elle ne relance jamais un prospect qui a choisi, refusé ou qu'on rappelle. */
  let relanceEnCours = false;
  async function relancerMuets() {
    if (relanceEnCours) return { saute: 'deja_en_cours' };
    relanceEnCours = true;
    try {
      if (!agents.peutAgir(ID).ok) return { saute: agents.peutAgir(ID).raison };
      if (illisible()) return { saute: 'registre_illisible' };
      const now = maintenant();
      let relances = 0;
      for (const [dossier, p] of Object.entries(reg.propositions)) {
        if (relances >= RELANCES_PAR_PASSAGE) break;
        if (!p || p.etat !== 'proposee' || p.relance || !Array.isArray(p.creneaux)) continue;
        /* ⛔ on ne relance que ce qui est VRAIMENT parti : une proposition qui attend encore la validation de Justin n'a pas été lue par le prospect — le relancer, c'est lui écrire « sans retour » d'un courriel qu'il n'a pas reçu */
        if (!(p.voie === 'direct' || (p.ref && typeof documents.etatDe === 'function' && documents.etatDe(p.ref) === 'envoye'))) continue;
        const age = now - p.ts;
        if (age < RELANCE_APRES_MS || age >= PROPOSITION_VIE_MS) continue;
        const restants = p.creneaux.map((ms, i) => ({ n: i + 1, ms })).filter(c => Number.isFinite(c.ms) && c.ms > now + CRENEAU_PROCHE_MS && !reg.rdv.some(r => r.etat === 'a_venir' && r.ms < c.ms + reg.dispo.dureeMin * MS_MIN && c.ms < r.ms + reg.dispo.dureeMin * MS_MIN));
        if (!restants.length || !FORME_DOSSIER.test(dossier)) continue;
        if (!agents.peutAgir(ID).ok) break;
        let adresse = ''; try { adresse = String(await adresseDe(dossier) || ''); } catch (e) { adresse = ''; }
        if (!adresse) continue;
        const m = OPS.relanceCreneaux({ creneaux: restants });
        if (!m) continue;
        p.relance = { ts: now };
        if (!sauve()) { delete p.relance; continue; }
        let c; try { c = await documents.courrier({ agent: ID, a: adresse, objet: m.objet, texte: m.texte, source: 'rendez_vous', dossier, porte: 'repondre_client' }); } catch (e) { c = { ok: false, raison: 'erreur' }; }
        if (c && c.ok) {
          p.relance = { ts: now, voie: c.voie, ref: c.ref }; sauve(); relances++;
          agents.noter(ID, 'relancer un prospect muet', { cible: dossier, resultat: c.voie === 'direct' ? 'ok' : 'propose', detail: c.voie === 'direct' ? 'relance J+2 envoyée' : 'relance J+2 en attente de validation' });
        } else {
          delete p.relance; sauve();
          agents.noter(ID, 'relancer un prospect muet', { cible: dossier, resultat: 'erreur', detail: 'relance non préparée : ' + String((c && c.raison) || 'erreur') });
        }
      }
      return { relances };
    } finally { relanceEnCours = false; }
  }

  /* Les tâches de Camille : une demande de créneaux, puis le choix du prospect. */
  let tachesEnCours = false;
  async function traiterTaches() {
    if (tachesEnCours) return { saute: 'deja_en_cours' };
    tachesEnCours = true;
    try {
      let n = 0, faites = 0;
      while (n < 10) {
        if (!agents.peutAgir(ID).ok) break;
        const k = agents.prendre(ID, TYPES_TACHES);
        if (!k) break;
        n++;
        let r;
        try { r = k.type === 'rendez_vous_prospect' ? await surDemandeRendezVous({ dossier: k.params.dossier, de: k.de }) : await surChoixCreneau({ dossier: k.params.dossier, creneau: k.params.creneau, de: k.de }); }
        catch (e) { r = { saute: 'erreur' }; agents.noter(ID, 'tâche', { cible: k.type, resultat: 'erreur', detail: String((e && e.message) || e).slice(0, 100) }); }
        const bon = !!(r && r.ok);
        agents.terminer(k.id, ID, bon ? 'ok' : 'echec', bon ? (r.fixe ? 'rendez-vous fixé' : r.rappel ? 'prospect à rappeler' : 'créneaux proposés') : String((r && r.saute) || 'non traité'));
        if (bon) faites++;
      }
      let relances = 0;
      try { const rr = await relancerMuets(); relances = (rr && rr.relances) || 0; } catch (e) { agents.noter(ID, 'relancer un prospect muet', { cible: 'file', resultat: 'erreur', detail: String((e && e.message) || e).slice(0, 100) }); }
      return { prises: n, faites, relances };
    } finally { tachesEnCours = false; }
  }

  /* ── les routes de la Tour : les disponibilités de Justin, et les rendez-vous ── */
  const vueRdv = () => reg.rdv.filter(r => r.etat === 'a_venir').sort((a, b) => a.ms - b.ms).map(r => ({ dossier: r.dossier, ms: r.ms, libelle: OPS.creneauLibelle(r.ms), passe: r.ms < maintenant() }));
  if (app && typeof app.get === 'function') {
    app.get('/api/monitor/agents/emma/disponibilites', monAdmin, (req, res) => {
      if (illisible()) return res.status(503).json({ error: 'Le registre d’Emma est illisible' });
      res.json({ ok: true, dispo: reg.dispo, rendezVous: vueRdv(), propositions: Object.values(reg.propositions).filter(x => x.etat === 'proposee' && maintenant() - x.ts < PROPOSITION_VIE_MS).length });
    });
    app.post('/api/monitor/agents/emma/disponibilites', monPatronStrict, (req, res) => {
      if (illisible()) return res.status(503).json({ error: 'Le registre d’Emma est illisible : rien n’est modifié' });
      const v = validerDispo(req.body && req.body.dispo);
      if (!v.dispo) return res.status(400).json({ error: v.erreur });
      const avant = reg.dispo;
      reg.dispo = v.dispo;
      if (!sauve()) { reg.dispo = avant; return res.status(503).json({ error: 'Disponibilités non enregistrées' }); }
      agents.noter(ID, 'disponibilités', { cible: 'agenda', resultat: 'ok', detail: v.dispo.actif ? 'actives' : 'désactivées', qui: req.tourUser && req.tourUser.nom });
      res.json({ ok: true, dispo: reg.dispo });
    });
    /* Justin demande lui-même des créneaux pour un prospect : la même demande que Camille, par la même fonction. */
    app.post('/api/monitor/agents/emma/proposer', monPatronStrict, async (req, res) => {
      const dossier = String((req.body && req.body.dossier) || '').toUpperCase();
      if (!FORME_DOSSIER.test(dossier)) return res.status(400).json({ error: 'Numéro de dossier : DOS- suivi de six chiffres' });
      try { res.json(Object.assign({ ok: true }, await surDemandeRendezVous({ dossier, de: 'justin' }))); }
      catch (e) { console.error('emma :', e.message); res.status(500).json({ error: 'Demande non traitée' }); }
    });
  }

  /* L'OUTIL de la messagerie : « @emma, propose des créneaux au dossier DOS-000123 ». ⛔ Seul Justin le déclenche ; un collègue passe par la tâche fermée. */
  const OUTILS_EQUIPE = {
    outils: [{ name: 'proposer_creneaux',
      description: 'Proposer par courriel des créneaux de rendez-vous téléphonique à un prospect (tirés des disponibilités de Justin). À n’utiliser que si Justin le demande en citant un numéro de dossier (DOS- et six chiffres).',
      input_schema: { type: 'object', properties: { dossier: { type: 'string' } }, required: ['dossier'], additionalProperties: false } }],
    executer: async (nom, entree, c) => {
      if (nom !== 'proposer_creneaux') return { ok: false, raison: 'outil_inconnu' };
      if (!c || c.de !== 'justin') return { ok: false, raison: 'pas_justin', ligne: 'Emma ne propose des créneaux sur demande directe que pour Justin : un collègue passe par la demande fermée.' };
      const dossier = String((entree && entree.dossier) || '').toUpperCase();
      if (!FORME_DOSSIER.test(dossier)) return { ok: false, raison: 'dossier', ligne: 'Emma n’a pas reçu un numéro de dossier valide (DOS- et six chiffres).' };
      /* ⛔ Le dossier doit VENIR du message de Justin, pas d'un texte relayé dans le fil. */
      if (!(String((c && c.texte) || '').toUpperCase().match(/DOS-\d{6}/g) || []).includes(dossier)) return { ok: false, raison: 'dossier_non_cite', ligne: 'Emma ne propose des créneaux que pour un dossier que Justin cite lui-même dans son message.' };
      const r = await surDemandeRendezVous({ dossier, de: 'justin' });
      return { ok: !!(r && r.ok), raison: r && r.saute, ligne: r && r.saute === 'deja_proposee' ? 'Emma a déjà proposé des créneaux au dossier ' + dossier + ' : elle attend sa réponse.' : '' };
    },
  };

  return { surDemandeRendezVous, surChoixCreneau, traiterTaches, relancerMuets, outilsEquipe: OUTILS_EQUIPE, dispo: () => JSON.parse(JSON.stringify(reg.dispo)), rendezVous: vueRdv };
};
module.exports.validerDispo = validerDispo;
module.exports.creneauxLibres = creneauxLibres;
module.exports.DISPO_DEFAUT = DISPO_DEFAUT;
module.exports.TYPES_TACHES = TYPES_TACHES;

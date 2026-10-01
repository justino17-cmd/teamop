/* ══ LA GARDE DES SMS — BUDGETS EN EUROS, EMBALLEMENT D'UN PAYS, BOUCLIER, ENVOI ═══════════════
 *
 * ⛔ LE BUT DE CE FICHIER : « le but c'est qu'on gagne de l'argent » (Justin, 1er octobre 2026). Le Perso est gratuit, donc chaque
 * SMS est un coût, et AUCUNE possibilité ne doit exister de nous faire payer des SMS en masse — la fraude « SMS pumping »
 * (des robots qui déclenchent des milliers de SMS vers des numéros surtaxés ou étrangers, dont le prix se partage avec le
 * fraudeur). Et « une connexion pour TOUS LES PAYS » : il n'y a pas de liste blanche de pays. La protection passe donc de
 * « où » à « combien » :
 *
 *   1. UN BUDGET EN EUROS par jour ET par heure, GLOBAL et PAR PAYS (`budgetJour`, `budgetHeure`, `budgetPaysJour`,
 *      `budgetPaysHeure`, surcharge par pays `budgetPays`) — fenêtres GLISSANTES (24 h, 1 h) calculées sur le journal DURABLE
 *      `sms_envoi` : un redémarrage ne remet pas le budget à zéro, et minuit n'est pas un moment où on peut recommencer.
 *      Au-delà : plus aucun SMS (pour ce pays, ou pour tous), `sms_indisponible`, dit à l'écran, et `/health` le crie.
 *   2. L'EMBALLEMENT D'UN PAYS : plus de `facteur` (5) fois sa moyenne horaire des 7 derniers jours — avec un plancher — dans
 *      l'heure qui vient de passer. Ce pays-là, et lui SEUL, passe AUTOMATIQUEMENT en BOUCLIER : une preuve de travail faite main
 *      (SHA-256, `bits` zéros) ET un délai, avant tout nouveau SMS. Le bouclier dure `bouclierMs` après le dernier emballement.
 *      ⛔ LE BOUCLIER SE DÉCLENCHE AUSSI SUR L'ARGENT, pas seulement sur un nombre de SMS : dès que la dépense d'un pays (ou le total)
 *      atteint `partBudget` (40 %) de son budget de l'heure ou du jour, TOUT nouveau SMS exige la preuve. Un nombre absolu ne s'atteint
 *      JAMAIS pour presque tous les pays — le budget de 1,5 € par heure coupait la France à 20 SMS, bien avant le plancher de 30 : le
 *      bouclier n'existait que pour 10 pays sur 207 (relecture adverse), et vingt requêtes anonymes fermaient les inscriptions.
 *      Les 60 % restants du budget ne s'obtiennent donc QU'avec la preuve : un robot qui pompe paie du calcul et du temps.
 *   2 bis. UNE PART DU BUDGET GLOBAL EST RÉSERVÉE AU MARCHÉ D'ORIGINE (`reserve`, 40 % pour la France et ses départements) : sept
 *      SMS vers sept pays chers (4,87 €) consommaient 97 % du budget de l'heure et fermaient la France (relecture adverse). Les autres
 *      pays se partagent les 60 % restants ; la France garde son propre budget par pays. `reserve.part: 0` supprime la réserve.
 *   3. Les plafonds par numéro et par réseau, `Retry-After` : DURABLES (table `sms_tentative`, empreintes HMAC) et réservés DANS LA MÊME
 *      TRANSACTION que le budget — une table mémoire qui se remplit ne les remet plus à zéro, un redémarrage non plus, et deux requêtes
 *      simultanées ne franchissent ni l'un ni l'autre. Il n'y a PAS de plafond par appareil : le jeton d'appareil est tenu par celui qui
 *      le présente, un robot qui ne renvoie pas son cookie en reçoit un neuf — le plafond ne retenait que les personnes honnêtes.
 *
 * ⛔ UN COÛT SE RÉSERVE AVANT L'ENVOI, DANS UNE TRANSACTION : deux requêtes simultanées ne peuvent pas franchir le budget ensemble.
 * Un envoi dont l'issue est INCERTAINE (délai, 5xx) garde son coût dans le budget — on suppose le pire ; seuls les refus francs du
 * prestataire le rendent. Le coût réel (`totalCreditsRemoved` d'OVH) remplace l'estimation quand il est connu.
 * ⛔ CE MODULE NE VOIT JAMAIS UN NUMÉRO : il reçoit un pays, un indicatif, et — pour le défi — une EMPREINTE du numéro. Rien de
 * ce qui est journalisé ici n'est une donnée personnelle (un motif, un pays).
 */
const crypto = require('crypto');
const { coutEstime, PRIX_CREDIT_EUR } = require('./sms-prix');
const { creerOvh, URLS_OVH } = require('./sms-ovh');

const H = 3600000, J = 86400000;
const MICRO = 1e6;

function lireConfigSms(brut, instance) {
  const c = brut && typeof brut === 'object' && !Array.isArray(brut) ? brut : {};
  const err = (m) => Object.assign(new Error('config: sms.' + m), { code: 'CONFIG' });
  const nb = (obj, k, def, min, max, nom) => {
    const v = obj[k];
    if (v === undefined) return def;
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) throw err((nom || k) + ' invalide (nombre entre ' + min + ' et ' + max + ')');
    return v;
  };
  const objet = (x) => x && typeof x === 'object' && !Array.isArray(x) ? x : {};
  const r = {
    budgetJour: nb(c, 'budgetJour', 20, 0, 100000), budgetHeure: nb(c, 'budgetHeure', 5, 0, 100000),
    budgetPaysJour: nb(c, 'budgetPaysJour', 3, 0, 100000), budgetPaysHeure: nb(c, 'budgetPaysHeure', 1.5, 0, 100000),
    prixCreditEur: nb(c, 'prixCreditEur', PRIX_CREDIT_EUR, 0.0001, 100), margePrix: nb(c, 'margePrix', 1.25, 1, 100),
    prixDefautEur: nb(c, 'prixDefautEur', 1.05, 0, 100),
    codeMs: nb(c, 'codeMs', 10 * 60000, 1000, 3600000), essaisCode: nb(c, 'essaisCode', 5, 1, 20), renvoiMs: nb(c, 'renvoiMs', 60000, 0, 3600000),
    /* La recherche de contact par numéro (anti-énumération) : 30 par jour et par compte, 10 pour un compte de moins de 24 h, une
       latence plancher qui masque si le numéro a un compte ; 20 ajouts par jour. */
    rechercheJour: nb(c, 'rechercheJour', 30, 1, 100000), rechercheJourJeune: nb(c, 'rechercheJourJeune', 10, 1, 100000),
    rechercheLatenceMs: nb(c, 'rechercheLatenceMs', 150, 0, 5000), ajoutJour: nb(c, 'ajoutJour', 20, 1, 100000),
    budgetPays: {}, prix: {}, interdits: [], domaine: null, ovh: null,
  };
  for (const [p, o] of Object.entries(objet(c.budgetPays))) {
    if (!/^[A-Z]{2}$/.test(p)) throw err('budgetPays : « ' + p.slice(0, 8) + ' » n\'est pas un code pays à deux lettres majuscules');
    r.budgetPays[p] = { jour: nb(objet(o), 'jour', undefined, 0, 100000, 'budgetPays.' + p + '.jour'), heure: nb(objet(o), 'heure', undefined, 0, 100000, 'budgetPays.' + p + '.heure') };
  }
  for (const [k, v] of Object.entries(objet(c.prix))) {
    if (!/^(?:[A-Z]{2}|\+\d{1,3})$/.test(k) || typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 100) throw err('prix : entrée « ' + k.slice(0, 8) + ' » invalide (code pays ou +indicatif, nombre d\'euros)');
    r.prix[k] = v;
  }
  if (c.interdits !== undefined) {
    if (!Array.isArray(c.interdits) || !c.interdits.every(p => typeof p === 'string' && /^\+\d{1,15}$/.test(p))) throw err('interdits : une liste de préfixes « +33… »');
    r.interdits = c.interdits.slice();
  }
  if (c.domaine !== undefined && c.domaine !== null) {
    if (typeof c.domaine !== 'string' || !/^[a-z0-9.-]{3,80}$/.test(c.domaine)) throw err('domaine invalide');
    r.domaine = c.domaine;
  }
  const e = objet(c.emballement);
  r.emballement = { facteur: nb(e, 'facteur', 5, 1, 1000, 'emballement.facteur'), plancher: nb(e, 'plancher', 30, 1, 100000, 'emballement.plancher'),
    /* La part d'un budget (heure ou jour, d'un pays ou du total) à partir de laquelle la preuve de travail est exigée : 1 = jamais. */
    partBudget: nb(e, 'partBudget', 0.4, 0.01, 1, 'emballement.partBudget'),
    fenetreMs: nb(e, 'fenetreMs', H, 1000, J, 'emballement.fenetreMs'), historiqueMs: nb(e, 'historiqueMs', 7 * J, H, 30 * J, 'emballement.historiqueMs'),
    bouclierMs: nb(e, 'bouclierMs', 6 * H, 1000, 7 * J, 'emballement.bouclierMs'), historiqueMinMs: nb(e, 'historiqueMinMs', J, 0, 30 * J, 'emballement.historiqueMinMs') };
  /* La réserve du budget GLOBAL : la part que les autres pays ne peuvent pas entamer, au profit des pays listés (le marché d'origine). */
  const rs = objet(c.reserve);
  const paysRes = rs.pays === undefined ? ['FR', 'RE', 'GP', 'MQ', 'GF', 'YT', 'PM', 'NC', 'PF'] : rs.pays;
  if (!Array.isArray(paysRes) || !paysRes.every(p => typeof p === 'string' && /^[A-Z]{2}$/.test(p))) throw err('reserve.pays : une liste de codes pays à deux lettres');
  r.reserve = { part: nb(rs, 'part', 0.4, 0, 0.9, 'reserve.part'), pays: paysRes.slice() };
  const b = objet(c.bouclier);
  const forces = b.pays === undefined ? [] : b.pays;
  if (!Array.isArray(forces) || !forces.every(p => typeof p === 'string' && /^[A-Z]{2}$/.test(p))) throw err('bouclier.pays : une liste de codes pays à deux lettres');
  if (b.global !== undefined && typeof b.global !== 'boolean') throw err('bouclier.global : vrai ou faux');
  r.bouclier = { bits: nb(b, 'bits', 18, 8, 26, 'bouclier.bits'), attenteMs: nb(b, 'attenteMs', 5000, 0, 120000, 'bouclier.attenteMs'),
    validiteMs: nb(b, 'validiteMs', 10 * 60000, 1000, 3600000, 'bouclier.validiteMs'), pays: forces.slice(), global: b.global === true };

  if (c.ovh !== undefined && c.ovh !== null) {
    const o = objet(c.ovh), champs = ['appKey', 'appSecret', 'consumerKey', 'serviceName', 'expediteur'];
    const poses = champs.filter(k => typeof o[k] === 'string' && o[k].length > 0);
    if (poses.length > 0 && poses.length < champs.length) throw err('ovh : identifiants INCOMPLETS (manque : ' + champs.filter(k => !poses.includes(k)).join(', ') + ') — une moitié de configuration ne passe pas en silence en mode journal');
    if (poses.length === champs.length) {
      if (!/^[A-Za-z0-9._-]{3,64}$/.test(o.serviceName)) throw err('ovh.serviceName invalide');
      if (!/^[A-Za-z0-9]{1,11}$/.test(o.expediteur)) throw err('ovh.expediteur : 1 à 11 lettres ou chiffres (expéditeur alphanumérique)');
      for (const k of ['appKey', 'appSecret', 'consumerKey']) if (!/^[A-Za-z0-9._-]{8,128}$/.test(o[k])) throw err('ovh.' + k + ' invalide');
      const ovh = { appKey: o.appKey, appSecret: o.appSecret, consumerKey: o.consumerKey, serviceName: o.serviceName, expediteur: o.expediteur };
      if (o.urlBase !== undefined) {
        /* ⛔ En production, la base est l'un des trois points d'entrée d'OVH : on n'envoie pas nos clés de signature ailleurs. */
        const ok = instance === 'prod' ? URLS_OVH.test(o.urlBase) : /^https?:\/\/[A-Za-z0-9.-]+(?::\d{1,5})?(?:\/[A-Za-z0-9._\/-]*)?$/.test(o.urlBase);
        if (typeof o.urlBase !== 'string' || !ok) throw err('ovh.urlBase refusée (' + (instance === 'prod' ? 'en production : un point d\'entrée d\'OVH seulement' : 'forme invalide') + ')');
        ovh.urlBase = o.urlBase;
      }
      if (o.timeoutMs !== undefined) ovh.timeoutMs = nb(o, 'timeoutMs', 8000, 100, 60000, 'ovh.timeoutMs');
      r.ovh = ovh;
    }
  }
  return r;
}

const micro = (eur) => Math.round(eur * MICRO);
const eur2 = (m) => Math.round(m / 1e4) / 100;

function creerGarde({ cfg, instance, stockage, scelleur, horloge = Date.now, journaliser = () => {}, fetchImpl = fetch }) {
  const mode = cfg.ovh ? 'ovh' : (instance === 'beta' ? 'journal' : 'inactif');
  const ovh = cfg.ovh ? creerOvh({ ovh: cfg.ovh, fetchImpl, horloge }) : null;
  const plafonds = {
    jour: micro(cfg.budgetJour), heure: micro(cfg.budgetHeure),
    paysJour: (p) => micro(cfg.budgetPays[p] && cfg.budgetPays[p].jour !== undefined ? cfg.budgetPays[p].jour : cfg.budgetPaysJour),
    paysHeure: (p) => micro(cfg.budgetPays[p] && cfg.budgetPays[p].heure !== undefined ? cfg.budgetPays[p].heure : cfg.budgetPaysHeure),
  };

  /* ── Les refus du jour, par motif (mémoire : des nombres pour /health, jamais un numéro) ── */
  const buckets = new Map();   // indice d'heure → Map(motif → n)
  function refuser(motif) {
    const h = Math.floor(horloge() / H);
    let b = buckets.get(h); if (!b) { b = new Map(); buckets.set(h, b); }
    b.set(motif, (b.get(motif) || 0) + 1);
    for (const k of buckets.keys()) if (k < h - 25) buckets.delete(k);
    journaliser('sms_refuse', { motif });
  }
  function refusJour() {
    const h = Math.floor(horloge() / H), o = {};
    for (const [k, b] of buckets) if (k > h - 24) for (const [m, n] of b) o[m] = (o[m] || 0) + n;
    return o;
  }

  /* ── Les plafonds, puis le budget : réserver UN SMS, ou dire ce qui bloque ──
     `caps` : [{ code, k, max, fenetreMs }] dans l'ordre où on les juge ; chaque `k` est une EMPREINTE (numéro, réseau). Tout se décide DANS
     LA MÊME TRANSACTION : un plafond refusé n'écrit rien, un budget refusé non plus, et deux requêtes simultanées ne passent pas ensemble.
     Rend { ok:false, plafond:<code>, retry:<s> } | { ok:false, motif:'budget_…' } | { ok:true, id, cout }. */
  function reserver({ pays, cc, caps = [] }) {
    const cout = coutEstime(pays, cc, cfg);
    return stockage.tx(() => {
      const t = horloge();
      for (const c of caps) {
        if (!(c.fenetreMs > 0)) continue;
        const depuis = t - c.fenetreMs;
        if (stockage.smsTentativesCompter(c.k, depuis) >= c.max) {
          const premiere = stockage.smsTentativePremiere(c.k, depuis);
          return { ok: false, plafond: c.code, retry: Math.max(1, Math.ceil(((premiere === null ? t : premiere) + c.fenetreMs - t) / 1000)) };
        }
      }
      const j = stockage.smsSommes(t - J), h = stockage.smsSommes(t - H), pj = stockage.smsSommes(t - J, pays), ph = stockage.smsSommes(t - H, pays);
      if (j.cout + cout > plafonds.jour) return { ok: false, motif: 'budget_jour' };
      if (h.cout + cout > plafonds.heure) return { ok: false, motif: 'budget_heure' };
      /* ⛔ La réserve du marché d'origine : les AUTRES pays ne dépensent, ensemble, que la part restante du budget global. */
      if (cfg.reserve.part > 0 && !cfg.reserve.pays.includes(pays)) {
        const libre = 1 - cfg.reserve.part;
        if (stockage.smsSommes(t - J, undefined, cfg.reserve.pays).cout + cout > plafonds.jour * libre) return { ok: false, motif: 'budget_jour' };
        if (stockage.smsSommes(t - H, undefined, cfg.reserve.pays).cout + cout > plafonds.heure * libre) return { ok: false, motif: 'budget_heure' };
      }
      if (pj.cout + cout > plafonds.paysJour(pays)) return { ok: false, motif: 'budget_pays_jour' };
      if (ph.cout + cout > plafonds.paysHeure(pays)) return { ok: false, motif: 'budget_pays_heure' };
      const id = stockage.smsReserver({ pays, cout });
      stockage.smsTentativesNoter(id, caps.map(c => c.k).filter((k, i, a) => a.indexOf(k) === i), t);
      return { ok: true, id, cout };
    });
  }
  /* Rend les plafonds d'un SMS qui n'est jamais parti (refus franc du prestataire, rien d'envoyé). */
  const rendre = (id) => stockage.smsTentativesRendre(id);

  /* ── L'emballement d'un pays → bouclier (persistant : il survit à l'arrêt de l'envoi qu'il provoque) ── */
  function emballe(pays) {
    const t = horloge(), e = cfg.emballement;
    const recent = stockage.smsSommes(t - e.fenetreMs, pays).n;
    const premier = stockage.smsPremier(pays);
    /* La moyenne horaire des jours PRÉCÉDENTS (hors la fenêtre récente) ; tant que l'historique est plus court que `historiqueMinMs`,
       on ne sait pas ce qu'est « normal » : seul le plancher décide. */
    let moyenne = 0;
    if (premier !== null && (t - e.fenetreMs) - premier >= e.historiqueMinMs) {
      const debut = Math.max(premier, t - e.historiqueMs);
      const avant = stockage.smsSommes(debut, pays).n - recent;
      const heures = Math.max(1, ((t - e.fenetreMs) - debut) / H);
      moyenne = Math.max(0, avant) / heures;
    }
    const seuil = Math.max(e.plancher, e.facteur * moyenne);
    return recent + 1 > seuil;
  }
  /* ⛔ Le bouclier de l'ARGENT : la dépense d'un pays (ou le total) a atteint `partBudget` de son budget de l'heure ou du jour. Dynamique :
     il suit les fenêtres glissantes, il tombe seul quand la dépense redescend. → 'budget_global' | 'budget_pays' | null */
  function bouclierBudget(pays) {
    const part = cfg.emballement.partBudget;
    if (!(part < 1)) return null;
    const t = horloge(), atteint = (somme, plafond) => plafond > 0 && somme >= Math.round(plafond * part);
    if (atteint(stockage.smsSommes(t - H).cout, plafonds.heure) || atteint(stockage.smsSommes(t - J).cout, plafonds.jour)) return 'budget_global';
    if (atteint(stockage.smsSommes(t - H, pays).cout, plafonds.paysHeure(pays)) || atteint(stockage.smsSommes(t - J, pays).cout, plafonds.paysJour(pays))) return 'budget_pays';
    return null;
  }
  /* → null (aucun bouclier) ou { motif:'global'|'force'|'auto'|'budget_global'|'budget_pays' } */
  function bouclierDe(pays) {
    if (cfg.bouclier.global) return { motif: 'global' };
    if (cfg.bouclier.pays.includes(pays)) return { motif: 'force' };
    const bb = bouclierBudget(pays);
    if (bb) return { motif: bb };
    if (emballe(pays)) {
      const deja = stockage.smsBouclierDe(pays);
      stockage.smsBouclierPoser({ pays, jusqua: horloge() + cfg.emballement.bouclierMs, motif: 'auto' });
      if (!deja) journaliser('sms_bouclier', { motif: 'auto', pays });
      return { motif: 'auto' };
    }
    const b = stockage.smsBouclierDe(pays);
    return b ? { motif: b.motif } : null;
  }

  /* ── Le défi (preuve de travail + délai), sans état côté serveur : un jeton signé, à usage unique ── */
  const UTILISES_MAX = 20000;
  const utilises = new Map();   // identifiant de défi → échéance
  const macDe = (corps, num_h) => scelleur.hmac('sms', 'defi', corps + '|' + num_h).slice(0, 32);
  function defiEmettre({ pays, num_h }) {
    const corps = ['d1', horloge(), crypto.randomBytes(8).toString('hex'), cfg.bouclier.bits, pays].join('.');
    return { jeton: corps + '.' + macDe(corps, num_h), bits: cfg.bouclier.bits, attente_s: Math.ceil(cfg.bouclier.attenteMs / 1000) };
  }
  function zerosEnTete(buf) {
    let n = 0;
    for (const o of buf) { if (o === 0) { n += 8; continue; } n += Math.clz32(o) - 24; break; }
    return n;
  }
  function defiVerifier({ jeton, nonce, pays, num_h }) {
    if (typeof jeton !== 'string' || typeof nonce !== 'string' || jeton.length > 120 || !/^[A-Za-z0-9_-]{1,32}$/.test(nonce)) return false;
    const p = jeton.split('.');
    if (p.length !== 6 || p[0] !== 'd1') return false;
    const corps = p.slice(0, 5).join('.');
    const attendu = Buffer.from(macDe(corps, num_h)), recu = Buffer.from(p[5]);
    if (attendu.length !== recu.length || !crypto.timingSafeEqual(attendu, recu)) return false;
    const ts = Number(p[1]), bits = Number(p[3]);
    if (!Number.isInteger(ts) || !Number.isInteger(bits) || bits !== cfg.bouclier.bits || p[4] !== pays) return false;
    const t = horloge();
    if (t < ts + cfg.bouclier.attenteMs || t > ts + cfg.bouclier.validiteMs) return false;
    if (zerosEnTete(crypto.createHash('sha256').update(jeton + ':' + nonce).digest()) < bits) return false;
    if (utilises.has(p[2])) return false;
    /* ⛔ Une table pleine ÉVINCE les plus anciens, elle ne REFUSE pas : refuser faisait d'une table remplie par un robot (5 000 défis
       brûlés) un refus de TOUTE preuve, même juste, pendant dix minutes — un déni de service contre les personnes honnêtes. Chaque
       défi coûte 18 bits de travail à qui le brûle ; rejouer un défi évincé exigerait de remplir 20 000 entrées d'abord. */
    if (utilises.size >= UTILISES_MAX) {
      for (const [k, fin] of utilises) if (fin <= t) utilises.delete(k);
      for (const k of utilises.keys()) { if (utilises.size < UTILISES_MAX) break; utilises.delete(k); }
    }
    utilises.set(p[2], ts + cfg.bouclier.validiteMs);
    return true;
  }

  /* ── L'envoi lui-même ── */
  let echecsOvh = 0;
  async function envoyer({ id, cout, numero, message }) {
    if (mode === 'journal') { stockage.smsRegler(id, { etat: 'envoye', cout }); return { ok: true }; }
    if (mode !== 'ovh') { stockage.smsRegler(id, { etat: 'refuse', cout: 0 }); return { ok: false, genre: 'config' }; }
    const r = await ovh.envoyer({ numero, message });
    if (r.ok) {
      const reel = typeof r.credits === 'number' && r.credits > 0 ? Math.ceil(Math.round(r.credits * cfg.prixCreditEur * 1e9) / 1e3) : cout;
      stockage.smsRegler(id, { etat: 'envoye', cout: reel }); echecsOvh = 0;
      return { ok: true };
    }
    if (r.genre === 'incertain') { stockage.smsRegler(id, { etat: 'incertain', cout }); echecsOvh++; return { ok: false, genre: 'incertain' }; }
    stockage.smsRegler(id, { etat: 'refuse', cout: 0 });
    /* ⛔ Tout ce qui n'est pas « ce numéro est invalide » est UNE PANNE DE NOTRE CÔTÉ (clés, crédits épuisés, expéditeur refusé, service
       injoignable) : `ovhEchecs` la compte, pour que la surveillance la crie. Les refus 400/409/429 d'OVH n'y étaient pas — des
       crédits épuisés seraient restés muets (relecture adverse). */
    if (r.genre !== 'numero') echecsOvh++;
    return { ok: false, genre: r.genre };
  }

  /* Les pays dont l'ARGENT a déclenché le bouclier (un seul compte si c'est le total) : pour /health. */
  function boucliersBudget() {
    if (!(cfg.emballement.partBudget < 1) || cfg.bouclier.global) return 0;
    const t = horloge();
    let n = 0;
    for (const { pays } of stockage.smsPaysSur(t - J)) {
      const b = bouclierBudget(pays);
      if (b === 'budget_global') return 1;
      if (b === 'budget_pays' && !stockage.smsBouclierDe(pays) && !cfg.bouclier.pays.includes(pays)) n++;
    }
    return n;
  }

  /* ── Pour /health : des NOMBRES ── */
  function sante() {
    const t = horloge();
    const j = stockage.smsSommes(t - J), h = stockage.smsSommes(t - H);
    return {
      mode, envoyes24h: j.n, coutJourEur: eur2(j.cout),
      budgetJourPct: plafonds.jour > 0 ? Math.round(j.cout / plafonds.jour * 100) : 100,
      budgetHeurePct: plafonds.heure > 0 ? Math.round(h.cout / plafonds.heure * 100) : 100,
      boucliers: stockage.smsBoucliers().length + (cfg.bouclier.global ? 1 : 0) + boucliersBudget(),
      ovhEchecs: echecsOvh, refus: refusJour(),
    };
  }

  return { mode, reserver, rendre, bouclierDe, defiEmettre, defiVerifier, envoyer, refuser, refusJour, sante, cfg, plafonds };
}

module.exports = { lireConfigSms, creerGarde };

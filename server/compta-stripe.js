/* LES LECTURES DE LA COMPTA — Stripe en LECTURE SEULE, et un chiffre qui ne se sait pas ne s'écrit pas (28 octobre 2026).
 *
 * Justin : « je veux un agent pro pour les devis, les factures et la compta — pour moi, pour la Tour ». Ce module lit l'argent de TeamOP chez Stripe pour Margaux. Trois règles, toutes dans le CODE :
 *
 * ⛔ 1. IL NE REÇOIT QU'UNE FONCTION DE LECTURE. `ctx.lire(chemin)` fait un GET et rien d'autre (c'est `index.js` qui la branche, sur la lecture déjà existante) : ce fichier n'a ni clé, ni
 *    adresse, ni verbe, ni « sinon ». Il ne SAIT donc pas rembourser, faire un avoir, annuler : ce n'est pas une consigne, c'est une absence. `tests/test-3164.js` lit son texte (commentaires retirés)
 *    et exige que ces mots n'y soient pas, et `test-3162` compte les verbes que le faux Stripe a vus : des GET.
 * ⛔ 2. UN CHIFFRE ILLISIBLE SE DIT, IL NE SE REMPLACE JAMAIS PAR UN ZÉRO. Chaque lecture rend `{ ok:true, … }` ou `{ ok:false, raison }` — jamais un objet « vide » qui ressemble à zéro. Stripe
 *    muet, en erreur, sans clé, une liste TRONQUÉE (au plafond de pages), une réponse de forme inattendue, des chiffres PÉRIMÉS (`perime` du cache de la Tour) : `ok:false`. Les routes Stripe de la Tour
 *    (`/api/monitor/stripe/abos`, `…/paiements`) répondent `mrr:0` et des listes vides quand Stripe tombe, avec un champ `erreur` : on n'appelle JAMAIS ces routes, on lit les fonctions dessous
 *    (`ctx.abonnements` est la lecture du cache, qui rend `erreur`/`perime` — et on les traite comme « je ne sais pas »). Un VRAI zéro (« 0 facture payée en octobre ») n'existe que quand la lecture a RÉUSSI.
 * ⛔ 3. LES MÊMES CHIFFRES QUE LA TOUR, PAS D'AUTRES. La conversion d'une facture est celle de `stripePaiement` (la fonction de l'écran Facturation, injectée : une seule définition) ; « payé » est la règle
 *    de la Tour (`paieOk`) ; les abonnés et le revenu mensuel sortent de `stripeAbosCalc` par le même cache que l'écran Abonnements. `tests/test-3163.js` joue les VRAIES fonctions de `tour.html` contre ce
 *    module sur les mêmes données. Seule différence, voulue : la lecture est PAGINÉE sur la période (la Tour lit les 50 dernières factures), et le mois est celui de PARIS (la Tour, celui du navigateur).
 * Le mois d'une facture payée est celui de son paiement (`paid_at`, sinon la création), comme à l'écran. On lit aussi les 62 jours AVANT la période : une facture émise fin septembre et réglée début
 * octobre est de l'encaissé d'octobre. Une facture créée il y a plus de 62 jours et réglée dans la période n'est pas vue (limite NOMMÉE, pas une surprise).
 */
'use strict';
const { tsParis, parisParties } = require('./agents-horaires');

const PAGES_MAX = 30;                   // 30 pages de 100 : 3 000 factures. Au-delà, la liste est TRONQUÉE — et on jette.
const MARGE_MS = 62 * 86400000;
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const pad = n => (n < 10 ? '0' : '') + n;
const FRANCHISE = /293\s*B|L\.?\s*223/i;       // « art. 293 B du CGI » ou « art. L. 223 et s. du CIBS »

module.exports = function comptaStripe(ctx) {
  ctx = ctx || {};
  const lire = typeof ctx.lire === 'function' ? ctx.lire : null;                 // async (chemin) → objet (JSON de Stripe) ; JETTE s'il est muet ou refuse
  const convertir = typeof ctx.convertir === 'function' ? ctx.convertir : null;  // facture Stripe → { statut, montant, date } | null (brouillon) — `stripePaiement`
  const abonnements = typeof ctx.abonnements === 'function' ? ctx.abonnements : null;   // async () → le résultat du cache `stripeAbosCalc` (avec `erreur` / `perime` / `majTs` quand il est vieux)
  const configure = typeof ctx.configure === 'function' ? ctx.configure : () => true;    // « une clé est-elle posée ? » — un booléen, jamais la clé
  const maintenant = typeof ctx.maintenant === 'function' ? ctx.maintenant : Date.now;
  const branche = !!(lire && convertir && abonnements);

  /* ── la période : « ce_mois », « mois_dernier », « AAAA-MM » (les douze derniers mois, ce mois compris), au fuseau de PARIS ── */
  function periodeDe(spec, now) {
    if (typeof spec !== 'string') return { ok: false, raison: 'periode' };
    const p = parisParties(now);
    let a = p.annee, m = p.mois;
    if (spec === 'ce_mois') { /* le mois en cours */ }
    else if (spec === 'mois_dernier') { m--; if (m < 1) { m = 12; a--; } }
    else {
      const x = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(spec);
      if (!x) return { ok: false, raison: 'periode' };
      a = +x[1]; m = +x[2];
      const ecart = (p.annee * 12 + p.mois) - (a * 12 + m);
      if (ecart < 0 || ecart > 11) return { ok: false, raison: 'periode' };      // le futur et le plus vieux que douze mois : pas de chiffre
    }
    return { ok: true, debut: tsParis(a, m, 1, 0, 0), fin: tsParis(a, m + 1, 1, 0, 0), annee: a, mois: m, cle: a + '-' + pad(m), libelle: MOIS[m - 1] + ' ' + a, enCours: a === p.annee && m === p.mois };
  }
  /* les douze derniers mois, du plus récent au plus ancien : ce que le schéma de l'outil offre (une liste FERMÉE) */
  function moisPermis(now) {
    const p = parisParties(now), l = [];
    let a = p.annee, m = p.mois;
    for (let i = 0; i < 12; i++) { l.push(a + '-' + pad(m)); m--; if (m < 1) { m = 12; a--; } }
    return l;
  }

  /* ── la lecture PAGINÉE des factures d'une plage de création. Rend { ok:true, factures:[…] } ou { ok:false, raison } ── */
  async function pagesFactures(gteSec, ltSec) {
    const vues = new Map();
    let apres = '';
    for (let page = 1; ; page++) {
      const chemin = '/v1/invoices?limit=100&created[gte]=' + gteSec + '&created[lt]=' + ltSec + (apres ? '&starting_after=' + encodeURIComponent(apres) : '');
      let d; try { d = await lire(chemin); } catch (e) { return { ok: false, raison: 'stripe' }; }
      if (!d || typeof d !== 'object' || !Array.isArray(d.data) || typeof d.has_more !== 'boolean') return { ok: false, raison: 'forme' };
      for (const f of d.data) {
        if (!f || typeof f !== 'object' || typeof f.id !== 'string' || !f.id) return { ok: false, raison: 'forme' };
        vues.set(f.id, f);
      }
      if (!d.has_more) break;
      const dernier = d.data[d.data.length - 1];
      if (!dernier || dernier.id === apres) return { ok: false, raison: 'forme' };   // « il en reste » sans rien de neuf : on ne boucle pas
      apres = dernier.id;
      /* ⛔ UNE LISTE TRONQUÉE N'EST PAS UNE LISTE : au plafond de pages, il en reste — on JETTE, on ne somme pas un morceau (même règle que `stripeAbosBruts`) */
      if (page >= PAGES_MAX) return { ok: false, raison: 'tronquee' };
    }
    return { ok: true, factures: [...vues.values()] };
  }

  /* ── 1. L'ARGENT D'UNE PÉRIODE ── */
  async function pointArgent(spec) {
    if (!branche) return { ok: false, raison: 'pas_branche' };
    if (!configure()) return { ok: false, raison: 'pas_de_cle' };
    const per = periodeDe(spec, maintenant());
    if (!per.ok) return per;
    const r = await pagesFactures(Math.floor((per.debut - MARGE_MS) / 1000), Math.floor(per.fin / 1000));
    if (!r.ok) return r;
    let payees = 0, centimes = 0, ouvertes = 0, refusees = 0, annulees = 0, horsEuro = 0;
    for (const f of r.factures) {
      let l; try { l = convertir(f); } catch (e) { return { ok: false, raison: 'forme' }; }
      if (!l) continue;                                                           // un brouillon n'est pas un paiement
      const creeMs = (parseInt(f.created, 10) || 0) * 1000;
      if (l.statut === 'paye') {
        if (!(l.date >= per.debut && l.date < per.fin)) continue;                 // payée dans la période : la date du PAIEMENT, comme l'écran
        if (String(f.currency || '').toLowerCase() !== 'eur') { horsEuro++; continue; }   // jamais additionner des devises
        payees++; centimes += Math.round(l.montant * 100);
      } else if (creeMs >= per.debut && creeMs < per.fin) {                       // les autres états se comptent sur les factures ÉMISES dans la période
        if (l.statut === 'ouvert') ouvertes++;
        else if (l.statut === 'echec') refusees++;
        else if (l.statut === 'annule') annulees++;
      }
    }
    return { ok: true, periode: per, payees, centimes, ouvertes, refusees, annulees, horsEuro, lues: r.factures.length };
  }

  /* ── 2. LES ABONNÉS (les chiffres de l'écran Abonnements) ── */
  const formuleDe = lbl => { const t = String(lbl || ''); return /premium/i.test(t) ? 'premium' : /business/i.test(t) ? 'business' : /\bpro\b/i.test(t) ? 'pro' : 'autres'; };
  async function abonnes() {
    if (!branche) return { ok: false, raison: 'pas_branche' };
    if (!configure()) return { ok: false, raison: 'pas_de_cle' };
    let d; try { d = await abonnements(); } catch (e) { return { ok: false, raison: 'stripe' }; }
    if (!d || typeof d !== 'object') return { ok: false, raison: 'forme' };
    /* ⛔ `erreur` : Stripe a répondu par une panne (listes vides, `mrr:0`). `perime` : ce sont de VIEUX chiffres. Ni l'un ni l'autre n'est « zéro » : « je ne sais pas ». */
    if (d.perime === true) return { ok: false, raison: 'perime', derniere: Number.isFinite(d.majTs) ? d.majTs : 0 };
    if (d.erreur) return { ok: false, raison: 'stripe' };
    if (d.configured === false) return { ok: false, raison: 'pas_de_cle' };
    if (!Array.isArray(d.abos) || !Number.isFinite(d.mrr) || !Number.isInteger(d.actifs) || !Number.isInteger(d.impayes)) return { ok: false, raison: 'forme' };
    let essais = 0;
    const parFormule = { pro: 0, business: 0, premium: 0, autres: 0 };
    for (const a of d.abos) {
      if (!a || typeof a !== 'object') return { ok: false, raison: 'forme' };
      if (a.statut === 'essai') essais++;
      if (a.statut === 'actif') parFormule[formuleDe(a.formule)]++;
    }
    /* comme l'écran : le serveur compte les essais dans `actifs`, « payants » les retire */
    return { ok: true, payants: Math.max(0, d.actifs - essais), essais, impayes: d.impayes, mrr: d.mrr, parFormule };
  }

  /* ── 3. LES FACTURES DE L'ANNÉE : le cumul encaissé, et le bilan des mentions ── */
  async function facturesAnnee() {
    if (!branche) return { ok: false, raison: 'pas_branche' };
    if (!configure()) return { ok: false, raison: 'pas_de_cle' };
    const now = maintenant(), annee = parisParties(now).annee;
    const debut = tsParis(annee, 1, 1, 0, 0), fin = tsParis(annee + 1, 1, 1, 0, 0);
    const r = await pagesFactures(Math.floor((debut - MARGE_MS) / 1000), Math.floor(fin / 1000));
    if (!r.ok) return r;
    return { ok: true, annee, debut, fin, factures: r.factures };
  }
  /* l'encaissé de l'année (pour le seuil de la franchise) : les factures PAYÉES dans l'année, en euros */
  async function cumulAnnee() {
    const a = await facturesAnnee();
    if (!a.ok) return a;
    let centimes = 0, payees = 0, horsEuro = 0;
    for (const f of a.factures) {
      let l; try { l = convertir(f); } catch (e) { return { ok: false, raison: 'forme' }; }
      if (!l || l.statut !== 'paye' || !(l.date >= a.debut && l.date < a.fin)) continue;
      if (String(f.currency || '').toLowerCase() !== 'eur') { horsEuro++; continue; }
      payees++; centimes += Math.round(l.montant * 100);
    }
    return { ok: true, annee: a.annee, centimes, payees, horsEuro };
  }

  /* La TVA d'une facture, en centimes, ou `null` si la réponse de Stripe ne la montre pas (jamais 0 par défaut). Les deux formes de l'API sont lues : les tableaux (`total_taxes`, `total_tax_amounts`)
     d'abord, le champ ancien `tax` ensuite. */
  function taxeCts(f) {
    for (const cle of ['total_taxes', 'total_tax_amounts']) {
      if (Array.isArray(f[cle])) { let t = 0; for (const x of f[cle]) { if (!x || !Number.isFinite(x.amount)) return null; t += x.amount; } return t; }
    }
    return Number.isInteger(f.tax) ? f.tax : null;
  }
  const texteMention = f => [f.footer, f.description].concat(Array.isArray(f.custom_fields) ? f.custom_fields.map(c => c && c.value) : []).filter(x => typeof x === 'string').join(' ');
  const lignesAvecPeriode = f => { const l = f.lines && Array.isArray(f.lines.data) ? f.lines.data : null; if (!l) return null; return l.length > 0 && l.every(x => x && x.period && Number.isFinite(x.period.start) && Number.isFinite(x.period.end)); };

  /* LE BILAN : des NOMBRES seulement (jamais le nom d'un client, jamais un numéro de facture). x sur y, où y = les factures ÉMISES dans l'année (brouillons exclus). */
  async function verifierFactures() {
    const a = await facturesAnnee();
    if (!a.ok) return a;
    const emises = [];
    for (const f of a.factures) {
      let l; try { l = convertir(f); } catch (e) { return { ok: false, raison: 'forme' }; }
      const creeMs = (parseInt(f.created, 10) || 0) * 1000;
      if (l && creeMs >= a.debut && creeMs < a.fin) emises.push(f);
    }
    const n = { total: emises.length, numero: 0, pdf: 0, pied: 0, champs: 0, mention: 0, adresse: 0, tvaClient: 0, periode: 0, periodeLue: 0, taxeLue: 0, taxeCts: 0, taxeFacturees: 0 };
    const prefixes = new Map();        // préfixe de numéro → numéros de séquence
    for (const f of emises) {
      if (typeof f.number === 'string' && f.number) {
        n.numero++;
        const x = /^(.*?)-?(\d+)$/.exec(f.number);
        if (x) { const k = x[1]; if (!prefixes.has(k)) prefixes.set(k, []); prefixes.get(k).push(parseInt(x[2], 10)); }
      }
      if (typeof f.invoice_pdf === 'string' && /^https:\/\//.test(f.invoice_pdf)) n.pdf++;
      if (typeof f.footer === 'string' && f.footer.trim()) n.pied++;
      if (Array.isArray(f.custom_fields) && f.custom_fields.length) n.champs++;
      if (FRANCHISE.test(texteMention(f))) n.mention++;
      const ad = f.customer_address;
      if (ad && typeof ad === 'object' && ad.line1 && ad.postal_code && ad.city) n.adresse++;
      if (Array.isArray(f.customer_tax_ids) && f.customer_tax_ids.length) n.tvaClient++;
      const p = lignesAvecPeriode(f);
      if (p !== null) { n.periodeLue++; if (p) n.periode++; }
      const t = taxeCts(f);
      if (t !== null) { n.taxeLue++; n.taxeCts += t; if (t > 0) n.taxeFacturees++; }
    }
    /* la numérotation : une séquence PAR CLIENT (plusieurs préfixes — la valeur par défaut de Stripe) ou UNE séquence pour le compte (un préfixe) ; dans ce cas, les trous se comptent */
    let numerotation = { genre: 'aucune' };
    if (prefixes.size === 1) {
      const suite = [...prefixes.values()][0].slice().sort((p, q) => p - q);
      const distincts = new Set(suite);
      numerotation = { genre: 'compte', trous: (suite[suite.length - 1] - suite[0] + 1) - distincts.size, doublons: suite.length - distincts.size };
    } else if (prefixes.size > 1) numerotation = { genre: 'client', sequences: prefixes.size };
    return { ok: true, annee: a.annee, n, numerotation };
  }

  return { periodeDe, moisPermis, pointArgent, abonnes, cumulAnnee, verifierFactures, FRANCHISE };
};
module.exports.PAGES_MAX = PAGES_MAX;
module.exports.MARGE_MS = MARGE_MS;

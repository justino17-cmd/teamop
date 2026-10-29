/* MARGAUX — facturation : les relances d'impayé, puis la mise en demeure PRÉPARÉE (23 octobre 2026).
 *
 * Justin : « On ne fera pas de remboursement. Une personne qui s'abonne pour le mois et après il arrête, c'est son choix. Mais il faut qu'il arrête l'abonnement. S'il n'arrête pas
 * l'abonnement et qu'il ne paye pas, là on fait les démarches pour les faire payer. »
 *
 *   · UNE ENTREPRISE EST IMPAYÉE quand le serveur dit qu'elle est BLOQUÉE par un impayé d'OP GESTION (`impayeBloque`, lu par `impayes()` que l'index branche sur `espacePaye` — Margaux ne
 *     recalcule RIEN : ni le rattachement d'un abonnement, ni le verdict) ;
 *   · RELANCE J+3 puis J+7 (la charte : `relancer_impaye`, `jours`) : un courriel à l'adresse de facturation que Stripe donne, ton courtois puis ferme, la page de la facture EN ATTENTE
 *     relue chez Stripe (`facture()`) — JAMAIS un lien inventé : sans elle, « écrivez-nous à contact@ ». UNE SEULE FOIS chacune, la marque étant posée AVANT l'envoi (sur disque) ;
 *   · MISE EN DEMEURE (CGV art. 7 : aucun recouvrement contentieux sans écrit préalable) : PRÉPARÉE quand l'impayé a 14 jours et que les deux relances sont VRAIMENT parties, puis
 *     déposée en validation à Justin. ⛔ Le geste est FIXE (charte `mise_en_demeure`) : ni le mode « auto » ni aucune porte ne l'ouvrent, elle ne part que si Justin la valide, une fois par impayé.
 *   · ⛔ AUCUN REMBOURSEMENT, JAMAIS : ce fichier ne sait ni rembourser, ni créer un avoir, ni annuler un abonnement. Un client qui dit « je veux arrêter » passe par Hugo (la fin de période).
 * ⛔ Les courriers sont composés par le code (`agents-courriers-ops.js`), contrôlés, signés Margaux par le serveur ; l'envoi est `documents.courrier` : « auto » + charte ouverte = direct,
 *    sinon une validation. Une relance dont le contrôle échoue n'est jamais envoyée seule.
 * ⛔ « On ne sait pas » ne relance personne : Stripe illisible, facture illisible → on attend le passage suivant (une fois dit, pas à chaque passage).
 * ⛔ Un impayé qui se règle (l'entreprise n'est plus bloquée) arrête tout : plus de relance, plus de mise en demeure.
 * Toutes les dépendances sont INJECTÉES.
 */
'use strict';
const OPS = require('./agents-courriers-ops');

const ID = 'margaux';
const F = 'agents-margaux.json';
const JOURS_DEFAUT = [3, 7];
const DEMEURE_APRES_JOURS = 14;       // la mise en demeure se prépare à J+14 — après la seconde relance, avec une marge pour que le client règle
const PAR_PASSAGE = 20;
const MS_JOUR = 86400000;
const ABSENCES_REGLEE = 3;            // « réglé » ne se conclut pas d'UNE absence de la liste (un incident de Stripe, un passage interrompu) : trois passages de suite sans elle
const OUBLI_MS = 120 * MS_JOUR;       // un impayé réglé reste au registre 120 jours (le journal de ce qui est parti), puis s'oublie

module.exports = function margaux(ctx) {
  const { agents, documents, fichier } = ctx;
  const conv = ctx.conversations && typeof ctx.conversations.parler === 'function' ? ctx.conversations : null;
  const direction = ctx.direction || null;
  const maintenant = typeof ctx.maintenant === 'function' ? ctx.maintenant : Date.now;
  const impayes = typeof ctx.impayes === 'function' ? ctx.impayes : null;       // async → { ok, liste:[{ cle, slug, dossier, aboId, adresse, entreprise }] } | { ok:false, raison }
  const facture = typeof ctx.facture === 'function' ? ctx.facture : null;       // async (aboId) → { numero, montantEur, emiseMs, url } | null — relu chez Stripe, JETTE s'il est muet
  if (!agents || !documents || typeof documents.courrier !== 'function' || !fichier || !impayes) {
    return { passer: async () => ({ saute: 'pas_branchee' }), outilsEquipe: { outils: [], executer: async () => ({ ok: false }) } };
  }
  const reg = fichier.charger(F, { impayes: {} });
  if (!reg.impayes || typeof reg.impayes !== 'object' || Array.isArray(reg.impayes)) reg.impayes = {};
  const sauve = () => fichier.ecrire(F, reg);
  const dire = (texte, niveau) => { if (!conv) return; try { conv.parler(ID, ID, texte, { niveau: niveau || 'info' }); } catch (e) {} };
  let enCours = false, stripeHS = false;

  const joursCharte = () => {
    let j = null; try { j = direction && direction.reglage ? direction.reglage('relancer_impaye', 'jours') : null; } catch (e) { j = null; }
    return Array.isArray(j) && j.length && j.every(x => Number.isInteger(x) && x > 0) ? j.slice(0, 4) : JOURS_DEFAUT;
  };
  /* Combien de relances sont VRAIMENT parties (envoi direct, ou validation que Justin a acceptée et dont l'envoi a réussi) : la mise en demeure ne ment pas sur ce qui a été écrit. */
  const parties = st => Object.values(st.etapes || {}).filter(x => x && (x.voie === 'direct' || (x.ref && typeof documents.etatDe === 'function' && documents.etatDe(x.ref) === 'envoye')));
  const envoyees = st => parties(st).length;
  const derniereRelance = st => parties(st).reduce((m, x) => Math.max(m, x.ts || 0), 0);
  /* La mise en demeure se prépare quand : l'impayé a DEMEURE_APRES_JOURS, une relance au moins est vraiment partie, et la dernière date de sept jours — le client a eu le temps de répondre. */
  const demeureDue = (st, age, now) => !st.demeure && age >= DEMEURE_APRES_JOURS && envoyees(st) >= 1 && now - derniereRelance(st) >= 7 * MS_JOUR;

  /* PRÉPARER la mise en demeure d'un impayé : une seule fois par impayé (même refusée, elle ne revient pas), toujours une VALIDATION. Rend { ok } ou { ok:false, raison }. */
  function preparerDemeure(st, x, fa) {
    if (st.demeure) return { ok: false, raison: 'deja_preparee' };
    const n = envoyees(st);
    const m = OPS.miseEnDemeure({ entreprise: x.entreprise, facture: fa, url: fa.url, relances: n });
    st.demeure = { ts: maintenant(), ref: '' };
    if (!sauve()) { st.demeure = null; return { ok: false, raison: 'ecriture' }; }
    let d; try { d = documents.deposer({ type: 'mise_en_demeure', agent: ID, a: x.adresse, objet: m.objet, texte: m.texte, source: 'mise_en_demeure', dossier: x.dossier, autorises: m.autorises, lettre: true }); } catch (e) { d = { ok: false, raison: 'erreur' }; }
    if (d && d.ok) {
      st.demeure = { ts: maintenant(), ref: d.ref }; sauve();
      dire('J’ai préparé la mise en demeure du dossier ' + (x.dossier || '(sans numéro)') + ' : la facture reste impayée' + (n >= 2 ? ' malgré mes deux relances' : n === 1 ? ' malgré ma relance' : '') + '. Elle attend ta validation dans « Validations » — elle ne part que si tu la valides.', 'important');
      return { ok: true, ref: d.ref };
    }
    st.demeure = null; sauve();
    agents.noter(ID, 'mise en demeure', { cible: x.dossier || 'impayé', resultat: 'erreur', detail: 'non préparée : ' + String((d && d.raison) || 'erreur') });
    return { ok: false, raison: (d && d.raison) || 'erreur' };
  }

  /* Un passage. Rend un compte-rendu COURT (jamais d'adresse) : `{saute}`, `{stripe:false}` ou `{examines, relances, demeures, reglees}`. */
  async function passer() {
    if (enCours) return { saute: 'deja_en_cours' };
    enCours = true;
    try {
      const p = agents.peutAgir(ID);
      if (!p.ok) return { saute: p.raison };
      if (fichier.illisible(F)) { agents.noter(ID, 'relire les impayés', { cible: 'registre', resultat: 'refuse', detail: 'registre de Margaux illisible' }); return { saute: 'registre_illisible' }; }
      let lu; try { lu = await impayes(); } catch (e) { lu = null; }
      if (!lu || lu.ok !== true || !Array.isArray(lu.liste)) {
        agents.noter(ID, 'relire les impayés', { cible: 'stripe', resultat: 'erreur', detail: 'Stripe illisible : aucune relance' });
        if (!stripeHS) { stripeHS = true; dire('Je n’arrive pas à lire les paiements sur Stripe : je ne relance personne tant que ça dure.', 'important'); }
        return { stripe: false };
      }
      if (stripeHS) { stripeHS = false; dire('Stripe répond de nouveau : je reprends les relances.', 'info'); }
      const now = maintenant();
      const jours = joursCharte();
      let examines = 0, relances = 0, demeures = 0, reglees = 0;
      /* ⛔ `vus` se remplit AVANT la boucle : un passage coupé (au-delà de PAR_PASSAGE, ou quand `peutAgir` tombe) ne doit pas faire passer pour « réglés » les impayés qu'il n'a pas eu le temps d'examiner. */
      const vus = new Set(Array.isArray(lu.incertains) ? lu.incertains.filter(c => typeof c === 'string') : []);
      /* (28 octobre 2026, Justin : « sans limite ») AUCUNE coupe de la liste : l'ancien `slice(0, 200)` laissait les impayés au-delà du deux-centième ni relancés, ni même comptés « vus » — donc réglés
         au bout de quatre passages. Le plafond qui reste est celui des ACTIONS (courriels partis ou déposés, mises en demeure préparées), pas celui des lignes lues. */
      for (const x of lu.liste) if (x && typeof x.cle === 'string' && x.cle && typeof x.aboId === 'string' && x.aboId) vus.add(x.cle);
      let actions = 0;
      for (const x of lu.liste) {
        if (!x || typeof x.cle !== 'string' || !x.cle || typeof x.aboId !== 'string' || !x.aboId) continue;
        let st = reg.impayes[x.cle];
        /* un autre abonnement refusé (un nouvel impayé, après un règlement) repart de zéro : une relance d'hier ne vaut pas pour une autre facture */
        if (!st || st.aboId !== x.aboId || st.reglee) { st = reg.impayes[x.cle] = { aboId: x.aboId, premierVu: now, etapes: {}, demeure: null, reglee: 0 }; sauve(); }
        if (st.absences) { st.absences = 0; sauve(); }
        examines++;
        /* ⛔ Le plafond compte les ACTIONS, jamais les impayés regardés : le compter ici, AVANT le `continue` des impayés déjà faits, faisait qu'au-delà de vingt impayés suivis les suivants
           n'étaient jamais relancés — vingt dossiers « déjà faits » mangeaient le passage à eux seuls. */
        if (actions >= PAR_PASSAGE) break;
        const faites = jours.every(j => st.etapes[String(j)]);
        if (faites && st.demeure) continue;
        /* ⛔ pas d'adresse de facturation lisible : on ne devine pas où écrire. Justin le sait UNE fois (pas un message toutes les 30 minutes) ; le client est à relancer à la main. */
        if (!/^[^@\s<>",;]+@[^@\s<>",;]+\.[^@\s<>",;]+$/.test(String(x.adresse || '')) || String(x.adresse).length > 160) {
          if (!st.sansAdresse) { st.sansAdresse = now; sauve(); agents.noter(ID, 'relancer', { cible: x.dossier || 'impayé', resultat: 'refuse', detail: 'aucune adresse de facturation lisible' });
            dire('Le dossier ' + (x.dossier || '(sans numéro)') + ' est en impayé, mais Stripe ne me donne pas d’adresse de facturation lisible : je ne peux pas le relancer. À faire à la main.', 'important'); }
          continue;
        }
        if (st.sansAdresse) { delete st.sansAdresse; sauve(); }
        const ref = st.premierVu;
        let fa = null;
        if (facture) {
          let panne = false;
          try { fa = await facture(x.aboId); } catch (e) { fa = null; panne = true; }
          /* (gardien, 28 octobre 2026) `null` sans panne = Stripe dit que l'abonnement n'est PLUS impayé (réglé pendant le passage, d'autant plus probable que la liste n'est plus coupée) :
             on n'écrit pas ; au passage suivant, il sort de la liste et passe « réglé ». Une PANNE garde l'ancien comportement (la date de premier passage sert). */
          if (!fa && !panne) continue;
        }
        const depuis = (fa && Number.isFinite(fa.emiseMs) && fa.emiseMs > 0 ? fa.emiseMs : ref);
        const age = Math.floor((now - depuis) / MS_JOUR);
        /* la relance due : la plus avancée dont le jour est passé et que rien n'a marquée ; les précédentes, sautées (on n'écrit pas « J+3 » et « J+7 » le même jour) */
        const dues = jours.filter(j => age >= j && !st.etapes[String(j)]);
        if (dues.length) {
          const j = dues[dues.length - 1];
          for (const avant of dues.slice(0, -1)) st.etapes[String(avant)] = { ts: now, voie: 'sautee' };
          if (!agents.peutAgir(ID).ok) break;
          const etape = j === jours[jours.length - 1] && jours.length > 1 ? 7 : 3;
          const m = OPS.relanceImpaye({ etape, facture: fa || {}, url: fa && fa.url });
          /* ⛔ la marque est posée AVANT l'envoi, sur disque : un redémarrage au milieu ne fait pas partir deux fois la même relance */
          st.etapes[String(j)] = { ts: now, voie: 'envoi' };
          if (!sauve()) { delete st.etapes[String(j)]; continue; }
          let c; try { c = await documents.courrier({ agent: ID, a: x.adresse, objet: m.objet, texte: m.texte, source: 'relance', dossier: x.dossier, autorises: m.autorises, porte: 'relancer_impaye' }); } catch (e) { c = { ok: false, raison: 'erreur' }; }
          if (c && c.ok) { st.etapes[String(j)] = { ts: now, voie: c.voie, ref: c.ref }; relances++; actions++; }
          else { delete st.etapes[String(j)]; agents.noter(ID, 'relance', { cible: x.dossier || 'impayé', resultat: 'erreur', detail: 'non partie : ' + String((c && c.raison) || 'erreur') }); }
          sauve();
          if (c && c.ok) agents.noter(ID, 'relance J+' + j, { cible: x.dossier || 'impayé', resultat: c.voie === 'direct' ? 'ok' : 'propose', detail: c.voie === 'direct' ? 'envoyée' : 'déposée en validation' });
        }
        /* la mise en demeure : PRÉPARÉE, jamais envoyée — elle attend Justin. Une seule fois par impayé, même refusée. */
        if (fa && demeureDue(st, age, now)) {
          if (!agents.peutAgir(ID).ok) break;
          const r = preparerDemeure(st, x, fa);
          if (r.ok) { demeures++; actions++; }
        }
      }
      /* ceux qui ne sont plus impayés : réglés (ou plus bloqués). Plus rien ne part pour eux. */
      for (const [cle, st] of Object.entries(reg.impayes)) {
        if (vus.has(cle)) continue;
        if (!st.reglee) {
          st.absences = (st.absences || 0) + 1;
          if (st.absences >= ABSENCES_REGLEE) { st.reglee = now; reglees++; }
          sauve();
        }
        else if (now - st.reglee > OUBLI_MS) { delete reg.impayes[cle]; sauve(); }
      }
      if (relances > 0) dire('J’ai relancé ' + relances + ' client' + (relances > 1 ? 's' : '') + ' pour un impayé (ou déposé la relance dans « Validations »).', 'info');
      return { examines, relances, demeures, reglees };
    } finally { enCours = false; }
  }

  /* Ce que Margaux sait de ses relances, pour la messagerie : des NOMBRES (jamais un nom ni un montant). */
  const etat = () => {
    /* ⛔ Un registre illisible n'a pas « zéro relance » : on ne sait pas. `null` — l'appelant dit « je ne sais pas les lire », jamais trois zéros. */
    if (fichier.illisible(F)) return null;
    const l = Object.values(reg.impayes).filter(x => !x.reglee);
    return { impayesSuivis: l.length, relancesParties: l.reduce((n, x) => n + envoyees(x), 0), misesEnDemeurePreparees: l.filter(x => x.demeure && x.demeure.ref).length };
  };

  /* L'OUTIL de la messagerie : Justin demande « prépare la mise en demeure du dossier DOS-… » — la même préparation, la même validation, quand il n'attend pas les 14 jours.
     ⛔ Seul Justin (un collègue ne déclenche rien), seulement pour un impayé QUE LE SERVEUR CONFIRME à l'instant, avec une facture lue chez Stripe ; le texte dit ce qui a
     VRAIMENT été écrit (zéro, une ou deux relances) et il ne part que validé. */
  const OUTILS_EQUIPE = {
    outils: [{ name: 'preparer_mise_en_demeure',
      description: 'Préparer la mise en demeure de payer d’un client dont l’abonnement est en impayé, et la déposer en validation de Justin (elle ne part JAMAIS sans lui). À n’utiliser que si Justin le demande en citant un numéro de dossier (DOS- et six chiffres).',
      input_schema: { type: 'object', properties: { dossier: { type: 'string' } }, required: ['dossier'], additionalProperties: false } }],
    executer: async (nom, entree, c) => {
      if (nom !== 'preparer_mise_en_demeure') return { ok: false, raison: 'outil_inconnu' };
      if (!c || c.de !== 'justin') return { ok: false, raison: 'pas_justin', ligne: 'Margaux ne prépare une mise en demeure que sur une demande de Justin.' };
      const dossier = String((entree && entree.dossier) || '').toUpperCase();
      if (!/^DOS-\d{6}$/.test(dossier)) return { ok: false, raison: 'dossier', ligne: 'Margaux n’a pas reçu un numéro de dossier valide (DOS- et six chiffres).' };
      /* ⛔ Le dossier doit VENIR du message de Justin, pas d'un texte relayé dans le fil. */
      if (!(String((c && c.texte) || '').toUpperCase().match(/DOS-\d{6}/g) || []).includes(dossier)) return { ok: false, raison: 'dossier_non_cite', ligne: 'Margaux ne prépare une mise en demeure que pour un dossier que Justin cite lui-même dans son message.' };
      if (!agents.peutAgir(ID).ok) return { ok: false, raison: 'arret' };
      let lu; try { lu = await impayes(); } catch (e) { lu = null; }
      if (!lu || lu.ok !== true || !Array.isArray(lu.liste)) return { ok: false, raison: 'stripe', ligne: 'Margaux ne peut pas lire Stripe : elle ne prépare rien.' };
      const x = lu.liste.find(y => y && y.dossier === dossier);
      if (!x) return { ok: false, raison: 'pas_impaye', ligne: 'Margaux ne trouve aucun impayé en cours pour le dossier ' + dossier + ' : pas de mise en demeure.' };
      let fa = null; try { fa = facture ? await facture(x.aboId) : null; } catch (e) { fa = null; }
      if (!fa) return { ok: false, raison: 'facture', ligne: 'Margaux ne peut pas lire la facture en attente du dossier ' + dossier + ' : pas de mise en demeure sans elle.' };
      let st = reg.impayes[x.cle];
      if (!st || st.aboId !== x.aboId || st.reglee) st = reg.impayes[x.cle] = { aboId: x.aboId, premierVu: maintenant(), etapes: {}, demeure: null, reglee: 0 };
      const r = preparerDemeure(st, x, fa);
      return { ok: r.ok, raison: r.raison, ligne: r.raison === 'deja_preparee' ? 'La mise en demeure du dossier ' + dossier + ' est déjà préparée (ou refusée) : elle ne se refait pas.' : '' };
    },
  };

  return { passer, etat, outilsEquipe: OUTILS_EQUIPE, JOURS_DEFAUT, DEMEURE_APRES_JOURS };
};
module.exports.ID = ID;

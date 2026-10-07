/* ══ LE COMPTE — EXPORTER SES DONNÉES, SUPPRIMER SON COMPTE ═══════════════════════════════════════════════════════════════════
 *
 *   POST /api/compte/export     {}                        S  un fichier JSON TÉLÉCHARGÉ (`attachment`) de SES données — une fois par jour
 *   POST /api/compte/supprimer  {confirmation:'SUPPRIMER'} S  programme la suppression à 14 jours et coupe TOUT à l'instant
 *
 * Comme `routes-pieces.js` et `routes-push.js`, ce fichier branche ses gestionnaires dans le tableau de `routes.js` (`installerCompte`). Le SQL est dans `stockage.js`.
 *
 * ⛔ L'EXPORT NE DIT RIEN DES AUTRES AU-DELÀ DE CE QUE LA PERSONNE VOIT DÉJÀ. Il se lit avec les MÊMES fonctions que l'application (`convPourMembre`, `membresDetail`, `messagesDe`) :
 * une conversation dont elle n'est pas membre n'y est pas, un message d'avant son arrivée dans le groupe n'y est pas, un message supprimé « pour moi » ou « pour tous » ou échu n'y
 * est pas (« pour tous » : la pierre tombale, sans texte), le « Lu » d'un membre qui a coupé ses confirmations n'y est pas. Le texte est DÉCHIFFRÉ (c'est sa donnée, lisible par
 * elle). Les pièces ne sont listées que (identifiant, genre, taille, date) : pas leur contenu. Son numéro de téléphone n'y est pas non plus — le service ne le rend à personne,
 * elle comprise (invariant du compte par numéro) ; le dire dans le fichier évite de laisser croire qu'il a été oublié.
 * ⛔ JAMAIS TOUTE LA BASE EN MÉMOIRE : le fichier s'écrit AU FIL DE L'EAU, une conversation à la fois, une page de cent messages à la fois, en rendant la main à la boucle entre deux
 * pages (les autres requêtes n'attendent pas un export). Un PLAFOND de taille borne le fichier ; au-delà, il se termine proprement (JSON valide) avec `tronque` qui dit où.
 * ⛔ UN PAR JOUR, UN À LA FOIS PAR COMPTE, DEUX À LA FOIS POUR LE SERVICE : un export est le geste le plus coûteux d'une personne. Le créneau du jour n'est rendu que si la faute est LA NÔTRE
 * (une erreur du service) — jamais quand le client est parti ou ne lisait plus : sinon six exports démarrés puis abandonnés coûtaient six fois le travail pour un seul « par jour »
 * (relevé par le gardien, 3 octobre 2026). Un lecteur qui ne lit plus est COUPÉ au bout de `exportAttenteMs` (30 s) — avant, deux lecteurs lents tenaient les deux places du service sans
 * limite —, et un export qui dure plus de `exportMaxMs` (15 min) se termine proprement (`tronque_cause: "duree"`).
 *
 * ⛔ SUPPRIMER SON COMPTE SE FAIT EN DEUX TEMPS (`stockage.js`, bloc « COMPTE »). Ici, le premier : à l'instant, TOUTES les sessions, tous les jetons d'appareil, tous les
 * abonnements push et les liens d'invitation de la personne sont coupés, ses flux fermés, et l'échéance est posée à J+14. Se reconnecter avant l'échéance l'ANNULE (la porte bêta et
 * la preuve du code par SMS le font, et le disent à l'écran). Le second temps — l'effacement — est celui du balayeur (`index.js`).
 * ⛔ LA CONFIRMATION EST UN MOT, PAS UN CLIC : `{confirmation:'SUPPRIMER'}`. La page demande (question, case à cocher, bouton) ; le service refuse sans le mot — une requête
 * isolée, un script, un onglet resté ouvert ne suppriment rien.
 */
'use strict';

const SUPPRESSION_DELAI_MS = 14 * 86400000;
const EXPORT_PAGE = 100, EXPORT_SIMULTANES = 2, EXPORT_OCTETS_MAX = 64 * 1048576, EXPORT_PIECES_MAX = 20000, EXPORT_ATTENTE_MS = 30000, EXPORT_DUREE_MAX_MS = 900000;

function installerCompte(H, ctx) {
  const { config, stockage, quotas, hub, horloge } = ctx;
  const refus = (res, statut, code, extra) => res.status(statut).json(Object.assign({ error: code }, extra || {}));
  const corps = (req) => (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
  const garder = (f) => (req, res, next) => {
    try { const r = f(req, res, next); if (r && typeof r.catch === 'function') r.catch(next); }
    catch (e) { next(e); }
  };
  const plafondOctets = config.compte && Number.isInteger(config.compte.exportOctetsMax) ? config.compte.exportOctetsMax : EXPORT_OCTETS_MAX;
  const attenteMs = config.compte && Number.isInteger(config.compte.exportAttenteMs) ? config.compte.exportAttenteMs : EXPORT_ATTENTE_MS;
  const dureeMaxMs = config.compte && Number.isInteger(config.compte.exportMaxMs) ? config.compte.exportMaxMs : EXPORT_DUREE_MAX_MS;
  const nomComplet = (p) => ((p && p.prenom || '') + ' ' + (p && p.nom || '')).trim();
  const J = (x) => JSON.stringify(x);
  const cookieVide = (nom) => nom + '=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0' + (config.cookie.secure ? '; Secure' : '');
  let exportsEnCours = 0;
  const comptesEnExport = new Set();   // un export à la fois PAR COMPTE : deux flux lents d'une même personne ne tiennent pas les deux places du service

  /* ── L'EXPORT ──────────────────────────────────────────────────────────────────────────────────────────────────────────── */
  H['compte.export'] = garder(async (req, res) => {
    const uid = req.moi.id;
    if (comptesEnExport.has(uid)) { res.set('Retry-After', '30'); return refus(res, 429, 'quota_atteint', { retry: 30 }); }
    if (exportsEnCours >= EXPORT_SIMULTANES) { res.set('Retry-After', '30'); return refus(res, 429, 'quota_atteint', { retry: 30 }); }
    const cle = 'export:' + uid, q = Object.assign({ max: 1, fenetreMs: 86400000 }, config.quotas.export || {});
    const essai = quotas.essai(cle, q.max, q.fenetreMs);
    if (!essai.ok) { res.set('Retry-After', String(essai.retry)); return refus(res, 429, 'export_quotidien', { retry: essai.retry }); }
    exportsEnCours++; comptesEnExport.add(uid);
    let total = 0;
    const debut = horloge();
    /* écrire un morceau : si la connexion est pleine, on attend qu'elle se vide — AU PLUS `attenteMs`. Un client qui ne lit plus est coupé (`client_lent`), il ne tient pas la place. */
    const ecrire = async (texte) => {
      if (res.destroyed || res.writableEnded) throw Object.assign(new Error('client_parti'), { code: 'client_parti' });
      total += Buffer.byteLength(texte);
      if (!res.write(texte)) {
        await new Promise((ok, ko) => {
          let fini = false;
          const fin = (e) => { if (fini) return; fini = true; clearTimeout(minuterie); res.off('drain', surDrain); res.off('close', surClose); if (e) ko(e); else ok(); };
          const surDrain = () => fin(), surClose = () => fin();
          const minuterie = setTimeout(() => fin(Object.assign(new Error('client_lent'), { code: 'client_lent' })), attenteMs);
          res.on('drain', surDrain); res.on('close', surClose);
        });
      }
    };
    /* le fichier se termine proprement (JSON valide, `tronque` dit où) quand il dépasse sa taille OU sa durée : → la cause, ou null */
    let cause = null;
    const limite = () => { if (total > plafondOctets) return 'taille'; if (horloge() - debut > dureeMaxMs) return 'duree'; return null; };
    const rendreLaMain = () => new Promise((ok) => setImmediate(ok));
    try {
      const profil = stockage.exportProfil(uid);
      if (!profil) return refus(res, 404, 'introuvable');
      const t = horloge();
      const jour = new Date(t).toISOString().slice(0, 10);
      res.status(200);
      res.set({ 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="opmessages-export-' + jour + '.json"', 'Cache-Control': 'no-store' });
      const reglages = { presence: profil.prefs.presence !== false, accuses: profil.prefs.accuses !== false, apercu_notif: profil.prefs.apercu_notif === true, trouvable: profil.trouvable };
      const contacts = stockage.contactsDe(uid).map(c => ({ id: c.id, prenom: c.prenom, nom: c.nom, statut: c.statut, depuis: c.depuis, bloque: !!c.bloque, mutuel: !!c.mutuel, favori: !!c.favori }));
      await ecrire('{"format":"opmessages-export-v1","genere_le":' + J(new Date(t).toISOString()) +
        ',"avertissement":' + J('Ce fichier contient TES données dans OP MESSAGES : ton profil, tes réglages, ton identifiant public, tes contacts et tes demandes de contact, tes espaces et tes réunions, l\'historique de tes appels (quand, combien de temps, avec quel identifiant : jamais ce qui s\'est dit), les conversations dont tu es membre avec les messages que tu peux y lire, et la liste de tes pièces (sans leur contenu). Il ne contient rien des autres au-delà de ce que tu vois déjà. Ton numéro de téléphone n\'y figure pas : le service ne le rend à personne, toi comprise.') +
        ',"profil":' + J({ id: profil.id, identifiant: stockage.identDe(uid), prenom: profil.prenom, nom: profil.nom, statut: profil.statut, langue: profil.langue, fuseau: profil.fuseau, compte_cree_le: new Date(profil.cree).toISOString(), origine: profil.origine }) +
        ',"reglages":' + J(reglages) + ',"contacts":' + J(contacts) +
        ',"demandes_contact":' + J({ recues: stockage.demandesRecues(uid).map(d => ({ id: d.id, prenom: d.prenom, nom: d.nom, identifiant: d.identifiant, le: new Date(d.ts).toISOString() })), envoyees: stockage.demandesEnvoyees(uid).map(d => ({ id: d.id, prenom: d.prenom, identifiant: d.identifiant, le: new Date(d.ts).toISOString() })) }) + ',"espaces":' + J(stockage.exportEspaces(uid).map(e => ({ id: e.id, nom: e.nom, role: e.role, depuis: new Date(e.depuis).toISOString() }))) + ',"agenda":' + J(stockage.exportEvenements(uid).map(e => ({ id: e.id, titre: e.titre, lieu: e.lieu, note: e.note, debut: new Date(e.debut).toISOString(), fin: new Date(e.fin).toISOString(), journee: e.journee, fuseau: e.tz, rappel_minutes_avant: e.rappel }))) + ',"reunions":' + J(stockage.exportReunions(uid).map(x => ({ id: x.id, titre: x.titre, lieu: x.lieu, debut: new Date(x.debut).toISOString(), fin: new Date(x.fin).toISOString(), fuseau: x.fuseau, repetition: x.repetition, n: x.n, jusqua: x.jusqua, annulee: x.annulee, role: x.role, reponse: x.reponse }))) +
        ',"appels":' + J(stockage.exportAppels(uid).map(x => ({ id: x.id, date: new Date(x.date).toISOString(), type: x.type, sens: x.sens, etat: x.etat, duree_s: x.duree_s, avec_id: x.avec_id }))) + ',"conversations":[');
      let premiere = true, tronque = null;
      for (const id of stockage.exportConversationsIds(uid)) {
        { const l = limite(); if (l) { tronque = 'conversations'; cause = l; break; } }
        const r = stockage.convPourMembre(id, uid);
        if (!r) continue;   // quittée entre-temps
        const membres = stockage.membresDetail(id, uid);
        const noms = new Map(membres.map(m => [m.id, nomComplet(m)]));
        await ecrire((premiere ? '' : ',') + '{"id":' + J(id) + ',"type":' + J(r.conv.type) + ',"nom":' + J(r.conv.nom) + ',"mon_role":' + J(r.moi.role) +
          ',"annonces_seules":' + J(!!r.conv.annonces_seules) + ',"ephemere_s":' + J(r.conv.ephemere_s) + ',"mes_reglages":' + J({ en_sourdine_jusqua: r.moi.muet_jusqua > t ? new Date(r.moi.muet_jusqua).toISOString() : null, epinglee: r.moi.epingle, archivee: r.moi.archive }) +
          ',"membres":' + J(membres.map(m => ({ id: m.id, prenom: m.prenom, nom: m.nom, role: m.role }))) + ',"messages":[');
        premiere = false;
        let apres = 0, premierMessage = true, coupe = false;
        for (;;) {
          const page = stockage.messagesDe(id, uid, { apresSeq: apres, limite: EXPORT_PAGE });
          if (!page || !page.messages.length) break;
          const supprimes = new Set(page.supprimes || []);
          let morceau = '';
          for (const m of page.messages) {
            const metaPieces = m.meta && Array.isArray(m.meta.pieces) ? m.meta.pieces.map(p => ({ id: p.id, taille: p.taille })) : (m.meta && m.meta.piece ? [{ id: m.meta.piece, nom: m.meta.nom, taille: m.meta.taille }] : undefined);
            const o = {
              seq: m.seq, id: m.id, date: new Date(m.ts).toISOString(), de: m.auteur === uid ? 'moi' : (noms.get(m.auteur) || (supprimes.has(m.auteur) ? 'Compte supprimé' : null)),
              auteur_id: m.auteur, type: m.type, texte: m.texte, modifie_le: m.modifie ? new Date(m.modifie).toISOString() : null, supprime: !!m.supprime, repond_a: m.repond_a,
              reactions: (m.reactions || []).map(x => ({ emoji: x.emoji, par: x.uid === uid ? 'moi' : (noms.get(x.uid) || null) })),
            };
            if (metaPieces) o.pieces = metaPieces;
            /* un message d'ACTIVITÉ du groupe (« Bob a ajouté Dan », « Alice a renommé le groupe ») n'a pas de texte : sans son évènement, l'export le montrerait comme un message vide */
            if (m.type === 'systeme' && m.meta && typeof m.meta.k === 'string') {
              o.evenement = { type: m.meta.k };
              if (typeof m.meta.uid === 'string') { o.evenement.cible_id = m.meta.uid; o.evenement.cible = m.meta.uid === uid ? 'moi' : (noms.get(m.meta.uid) || null); }
              if (m.meta.valeur !== undefined) o.evenement.valeur = m.meta.valeur;
            }
            if (m.illisible) o.illisible = true;
            morceau += (premierMessage ? '' : ',') + J(o);
            premierMessage = false;
            apres = m.seq;
          }
          await ecrire(morceau);
          if (page.messages.length < EXPORT_PAGE) break;
          { const l = limite(); if (l) { coupe = true; cause = l; break; } }
          await rendreLaMain();
        }
        await ecrire(']' + (coupe ? ',"messages_tronques":true' : '') + '}');
        if (coupe) tronque = 'messages';
        await rendreLaMain();
      }
      const pieces = stockage.exportPieces(uid);
      const piecesTronquees = pieces.length > EXPORT_PIECES_MAX;
      await ecrire('],"pieces":' + J(pieces.slice(0, EXPORT_PIECES_MAX).map(p => ({ id: p.id, genre: p.genre, taille: p.taille, date: new Date(p.cree).toISOString() }))) +
        (piecesTronquees ? ',"pieces_tronquees":true' : '') +
        ',"notifications":' + J(stockage.notifListe(uid, 200).map(n => ({ type: n.type, titre: n.titre, texte: n.texte, date: new Date(n.ts).toISOString(), lue: n.lue }))) +
        ',"tronque":' + J(tronque) + (cause ? ',"tronque_cause":' + J(cause) : '') + '}');
      res.end();
    } catch (e) {
      /* ⛔ le créneau du jour n'est rendu que si la faute est LA NÔTRE : un client qui est parti ou qui ne lisait plus a consommé le travail du service (relevé par le gardien, 3 octobre 2026) */
      const duClient = e && (e.code === 'client_parti' || e.code === 'client_lent');
      if (!duClient) quotas.rembourser(cle);
      else if (e.code === 'client_lent' && ctx.journaliser) ctx.journaliser('export_coupe', { motif: 'attente' });
      if (res.headersSent) { try { res.destroy(); } catch (x) { /* déjà fermée */ } return; }
      throw e;
    } finally { exportsEnCours--; comptesEnExport.delete(uid); }
  });

  /* ── LA SUPPRESSION ────────────────────────────────────────────────────────────────────────────────────────────────────── */
  H['compte.supprimer'] = garder(async (req, res) => {
    if (corps(req).confirmation !== 'SUPPRIMER') return refus(res, 400, 'confirmation_requise');
    /* ⛔ UN ESPACE ABONNÉ DONT ON EST LE SEUL MEMBRE : l'effacer du compte dissoudrait l'espace, et Stripe continuerait de prélever pour un espace qui n'existe plus. On le DIT (409, avec le
       remède : résilier l'abonnement, ou passer la main) au lieu de laisser cette surprise à la carte bancaire. C'est la seule exception à « quitter ne se refuse à personne », et elle se
       lève d'un geste ; un propriétaire qui n'est pas seul passe la main tout seul à l'effacement (`espaceQuitterTout`).
       ⛔ UN PAIEMENT COMMENCÉ COMPTE AUSSI (relecture du gardien : payé chez Stripe, compte effacé avant que le service le sache — un abonnement vivant, sans espace, que personne ne résilie) : une
       session de paiement non résolue est relue d'abord (payée, c'est un abonnement ; expirée, elle ne bloque plus), et ce qui reste bloque (`paiement_en_cours` tant qu'on ne sait pas).
       ⛔ CE REFUS SE JUGE **AVANT** LE PLAFOND HORAIRE (`compte_supprimer`, cinq par heure) : un refus avec son remède n'est pas un essai de suppression — compté, il aurait bloqué pendant une heure, après cinq refus,
       celui qui vient de résilier et revient supprimer son compte. Ce qu'il peut coûter à Stripe est borné sans ce plafond : trois espaces au plus (la limite de propriété), une relecture à la fois par espace et partagée
       entre appelants (`facturation.relire`), le tout sous le plafond d'écriture de la personne (300 par minute) et celui de son réseau. */
    let seuls = stockage.espacesAbonnesSeul(req.moi.id);
    if (seuls.length && ctx.facturation && ctx.facturation.ouvert()) {
      for (const e of seuls.slice(0, 3)) { try { await ctx.facturation.relire(e); } catch (x) { /* Stripe muet : ce que le service sait décide */ } }
      seuls = stockage.espacesAbonnesSeul(req.moi.id);
    }
    if (seuls.length) {
      const court = seuls.some((e) => { const a = stockage.abonnementLire(e); return !!(a && a.abonnement && !['aucun', 'canceled', 'incomplete_expired'].includes(a.statut)); });
      return refus(res, 409, court ? 'espace_abonne' : 'paiement_en_cours');
    }
    const q = Object.assign({ max: 5, fenetreMs: 3600000 }, config.quotas.compte_supprimer || {});
    const e = quotas.essai('compte_supprimer:' + req.moi.id, q.max, q.fenetreMs);
    if (!e.ok) { res.set('Retry-After', String(e.retry)); return refus(res, 429, 'quota_atteint', { retry: e.retry }); }
    /* ⛔ UN PAIEMENT PERSO+ COMMENCÉ se relit avant de programmer l'effacement (payé chez Stripe, il devient l'abonnement dont la demande arrête le renouvellement, et que l'effacement résiliera à J+14 ; jamais un
       abonnement vivant que personne ne connaît). Un abonnement Perso+ qui court ne bloque PAS la demande : il cesse de se renouveler tout de suite (la personne n'est pas prélevée pendant les quatorze jours),
       l'accès reste jusqu'à la fin de la période payée, et la page le dit. Stripe muet : la demande passe quand même, l'arrêt est noté et rejoué, la passe de relecture résout la session ensuite. */
    if (ctx.facturation && ctx.facturation.perso.ouvert()) { const ap = stockage.abonnementPersoLire(req.moi.id); if (ap && ap.session) { try { await ctx.facturation.perso.relire(req.moi.id); } catch (x) { /* Stripe muet */ } } }
    const echeance = horloge() + SUPPRESSION_DELAI_MS;
    stockage.suppressionProgrammer(req.moi.id, echeance);   // coupe sessions, jetons d'appareil, abonnements push, liens — date l'effacement et NOTE l'arrêt du renouvellement Perso+, dans UNE transaction
    /* l'arrêt du renouvellement part chez Stripe tout de suite, sans attendre la réponse (la page n'attend jamais Stripe pour dire « demandé ») ; un échec se rejoue à la passe des dix minutes */
    try { if (ctx.facturation) ctx.facturation.perso.annulationsTraiter(); } catch (e) { /* la demande est notée : rien ne se perd */ }
    try { if (ctx.appels) ctx.appels.terminerDe(req.moi.id); } catch (e) { /* un appel qui ne se termine pas ne défait pas la suppression : le balayeur le dira « perdu » */ }
    hub.fermerPersonne(req.moi.id);                          // ses flux se ferment (motif « session ») : plus rien ne lui est livré
    res.append('Set-Cookie', cookieVide(config.cookie.nom));
    res.append('Set-Cookie', cookieVide(config.cookie.nom + 'a'));
    res.json({ ok: true, suppression_le: echeance });
  });
}

module.exports = { installerCompte, SUPPRESSION_DELAI_MS };

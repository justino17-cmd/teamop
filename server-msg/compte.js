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
 * ⛔ UN PAR JOUR, ET DEUX À LA FOIS POUR LE SERVICE : un export est le geste le plus coûteux d'une personne. Un export qui échoue avant d'avoir été envoyé rend son créneau.
 *
 * ⛔ SUPPRIMER SON COMPTE SE FAIT EN DEUX TEMPS (`stockage.js`, bloc « COMPTE »). Ici, le premier : à l'instant, TOUTES les sessions, tous les jetons d'appareil, tous les
 * abonnements push et les liens d'invitation de la personne sont coupés, ses flux fermés, et l'échéance est posée à J+14. Se reconnecter avant l'échéance l'ANNULE (la porte bêta et
 * la preuve du code par SMS le font, et le disent à l'écran). Le second temps — l'effacement — est celui du balayeur (`index.js`).
 * ⛔ LA CONFIRMATION EST UN MOT, PAS UN CLIC : `{confirmation:'SUPPRIMER'}`. La page demande (question, case à cocher, bouton) ; le service refuse sans le mot — une requête
 * isolée, un script, un onglet resté ouvert ne suppriment rien.
 */
'use strict';

const SUPPRESSION_DELAI_MS = 14 * 86400000;
const EXPORT_PAGE = 100, EXPORT_SIMULTANES = 2, EXPORT_OCTETS_MAX = 64 * 1048576, EXPORT_PIECES_MAX = 20000;

function installerCompte(H, ctx) {
  const { config, stockage, quotas, hub, horloge } = ctx;
  const refus = (res, statut, code, extra) => res.status(statut).json(Object.assign({ error: code }, extra || {}));
  const corps = (req) => (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
  const garder = (f) => (req, res, next) => {
    try { const r = f(req, res, next); if (r && typeof r.catch === 'function') r.catch(next); }
    catch (e) { next(e); }
  };
  const plafondOctets = config.compte && Number.isInteger(config.compte.exportOctetsMax) ? config.compte.exportOctetsMax : EXPORT_OCTETS_MAX;
  const nomComplet = (p) => ((p && p.prenom || '') + ' ' + (p && p.nom || '')).trim();
  const J = (x) => JSON.stringify(x);
  const cookieVide = (nom) => nom + '=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0' + (config.cookie.secure ? '; Secure' : '');
  let exportsEnCours = 0;

  /* ── L'EXPORT ──────────────────────────────────────────────────────────────────────────────────────────────────────────── */
  H['compte.export'] = garder(async (req, res) => {
    const uid = req.moi.id;
    if (exportsEnCours >= EXPORT_SIMULTANES) { res.set('Retry-After', '30'); return refus(res, 429, 'quota_atteint', { retry: 30 }); }
    const cle = 'export:' + uid, q = Object.assign({ max: 1, fenetreMs: 86400000 }, config.quotas.export || {});
    const essai = quotas.essai(cle, q.max, q.fenetreMs);
    if (!essai.ok) { res.set('Retry-After', String(essai.retry)); return refus(res, 429, 'export_quotidien', { retry: essai.retry }); }
    exportsEnCours++;
    let total = 0;
    const ecrire = async (texte) => {
      if (res.destroyed || res.writableEnded) throw Object.assign(new Error('client_parti'), { code: 'client_parti' });
      total += Buffer.byteLength(texte);
      if (!res.write(texte)) await new Promise((ok) => { const f = () => { res.off('drain', f); res.off('close', f); ok(); }; res.on('drain', f); res.on('close', f); });
    };
    const rendreLaMain = () => new Promise((ok) => setImmediate(ok));
    try {
      const profil = stockage.exportProfil(uid);
      if (!profil) return refus(res, 404, 'introuvable');
      const t = horloge();
      const jour = new Date(t).toISOString().slice(0, 10);
      res.status(200);
      res.set({ 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="opmessages-export-' + jour + '.json"', 'Cache-Control': 'no-store' });
      const reglages = { presence: profil.prefs.presence !== false, accuses: profil.prefs.accuses !== false, apercu_notif: profil.prefs.apercu_notif === true, trouvable: profil.trouvable };
      const contacts = stockage.contactsDe(uid).map(c => ({ id: c.id, prenom: c.prenom, nom: c.nom, statut: c.statut, depuis: c.depuis, bloque: !!c.bloque, mutuel: !!c.mutuel }));
      await ecrire('{"format":"opmessages-export-v1","genere_le":' + J(new Date(t).toISOString()) +
        ',"avertissement":' + J('Ce fichier contient TES données dans OP MESSAGES : ton profil, tes réglages, tes contacts, les conversations dont tu es membre avec les messages que tu peux y lire, et la liste de tes pièces (sans leur contenu). Il ne contient rien des autres au-delà de ce que tu vois déjà. Ton numéro de téléphone n\'y figure pas : le service ne le rend à personne, toi comprise.') +
        ',"profil":' + J({ id: profil.id, prenom: profil.prenom, nom: profil.nom, statut: profil.statut, langue: profil.langue, fuseau: profil.fuseau, compte_cree_le: new Date(profil.cree).toISOString(), origine: profil.origine }) +
        ',"reglages":' + J(reglages) + ',"contacts":' + J(contacts) + ',"espaces":' + J(stockage.exportEspaces(uid).map(e => ({ id: e.id, nom: e.nom, role: e.role, depuis: new Date(e.depuis).toISOString() }))) + ',"conversations":[');
      let premiere = true, tronque = null;
      for (const id of stockage.exportConversationsIds(uid)) {
        if (total > plafondOctets) { tronque = 'conversations'; break; }
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
          if (total > plafondOctets) { coupe = true; break; }
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
        ',"tronque":' + J(tronque) + '}');
      res.end();
    } catch (e) {
      quotas.rembourser(cle);   // un export qui n'a pas pu se faire ne consomme pas le créneau du jour
      if (res.headersSent) { try { res.destroy(); } catch (x) { /* déjà fermée */ } return; }
      throw e;
    } finally { exportsEnCours--; }
  });

  /* ── LA SUPPRESSION ────────────────────────────────────────────────────────────────────────────────────────────────────── */
  H['compte.supprimer'] = garder((req, res) => {
    if (corps(req).confirmation !== 'SUPPRIMER') return refus(res, 400, 'confirmation_requise');
    /* ⛔ UN ESPACE ABONNÉ DONT ON EST LE SEUL MEMBRE : l'effacer du compte dissoudrait l'espace, et Stripe continuerait de prélever pour un espace qui n'existe plus. On le DIT (409, avec le
       remède : résilier l'abonnement, ou passer la main) au lieu de laisser cette surprise à la carte bancaire. C'est la seule exception à « quitter ne se refuse à personne », et elle se
       lève d'un geste ; un propriétaire qui n'est pas seul passe la main tout seul à l'effacement (`espaceQuitterTout`). */
    if (stockage.espacesAbonnesSeul(req.moi.id).length) return refus(res, 409, 'espace_abonne');
    const q = Object.assign({ max: 5, fenetreMs: 3600000 }, config.quotas.compte_supprimer || {});
    const e = quotas.essai('compte_supprimer:' + req.moi.id, q.max, q.fenetreMs);
    if (!e.ok) { res.set('Retry-After', String(e.retry)); return refus(res, 429, 'quota_atteint', { retry: e.retry }); }
    const echeance = horloge() + SUPPRESSION_DELAI_MS;
    stockage.suppressionProgrammer(req.moi.id, echeance);   // coupe sessions, jetons d'appareil, abonnements push, liens — et date l'effacement, dans UNE transaction
    hub.fermerPersonne(req.moi.id);                          // ses flux se ferment (motif « session ») : plus rien ne lui est livré
    res.append('Set-Cookie', cookieVide(config.cookie.nom));
    res.append('Set-Cookie', cookieVide(config.cookie.nom + 'a'));
    res.json({ ok: true, suppression_le: echeance });
  });
}

module.exports = { installerCompte, SUPPRESSION_DELAI_MS };

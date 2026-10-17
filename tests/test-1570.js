/* ══ LES RÉGLAGES SUIVENT LA PERSONNE D'UN APPAREIL À L'AUTRE — LE SERVICE (lot m14 : pro#4, reglages#3, reglages@11) ══════════════════════════════════════════════════════════
   Ce que le testeur a mesuré avec deux appareils ouverts sur le même compte : les heures de travail réglées sur l'iPhone n'apparaissaient pas sur le Mac, dont le toucher
   suivant ÉCRASAIT les 6 h 30 par les heures par défaut ; « Pause pendant les réunions », « Confirmer l'envoi » et l'interrupteur de vie privée (« Afficher quand je suis en
   ligne ») montraient l'ancien état tant qu'on ne quittait pas la rubrique. Cause, côté service : l'événement `prefs` ne partait que pour le côté, le passage automatique et
   les heures (`flux.js`, `reglagesChanges`) — un réglage de confidentialité, de notification ou de confirmation changé ailleurs ne prévenait PERSONNE d'autre que ses
   contacts (la présence) ou ses co-membres (les accusés), jamais mes AUTRES appareils.

   Ce que ce fichier garde (le VRAI service en HTTP, deux appareils d'Ana et un témoin, Ben) :
     · ⛔ chaque réglage que la page DOIT relire — pause pendant les réunions, confirmer l'envoi, aperçu des notifications, présence, accusés de lecture, position, « me trouver » —
       fait partir « prefs » vers mes AUTRES appareils, l'enveloppe VIDE (la page relit ce qu'elle a le droit de voir : rien du réglage ne voyage) ;
     · ⛔ à MOI SEUL : Ben (contact, co-membre) n'en reçoit aucun — son flux marche pourtant (la sentinelle : le statut d'Ana lui arrive) ;
     · un réglage sans rapport (la vitesse des vocaux) n'envoie RIEN, et le même réglage renvoyé tel quel non plus (la sentinelle qui suit, elle, part) ;
     · ⛔ l'export de compte (reglages@11) annonce « tes réglages » : il porte aussi les heures de travail, la pause pendant les réunions, « Confirmer l'envoi », le passage
       automatique et le côté choisi — avec leurs valeurs par défaut quand rien n'a été réglé.
   ⛔ Une assertion sur un ensemble vide ne prouve rien : chaque « rien n'est parti » est suivi d'une SENTINELLE qui, elle, doit arriver. */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();

if (!fs.existsSync(path.join(T.SERVICE, 'node_modules'))) { console.log('\n  ⚠️ dépendances du service absentes : le banc est sauté'); fin(); }
else (async () => {
  const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
  const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
  const sha = x => crypto.createHash('sha256').update(x).digest('hex');
  const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');
  const JOUR = 86400000;
  const og = await T.fauxOpGestion({});
  const svc = await T.lancerService({ urlGestion: og.url });
  const S = ouvrir({ chemin: require('path').join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
  let k = 0;
  const pers = nom => S.personneCreer({ identifiant: 'beta:' + nom + (++k) + crypto.randomBytes(2).toString('hex'), prenom: nom, nom: 'Banc', origine: 'beta', verifie: true });
  const cl = p => { const c = T.client(svc.base); const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 30 * JOUR }); c.poserCookie(j); c.moi = p; return c; };
  const flux = [];
  try {
    console.log('\n1. Le service : un réglage changé sur un appareil prévient MES autres appareils (et personne d\'autre)');
    const ana = pers('Ana'), ben = pers('Ben');
    S.contactLier(ana.id, ben.id);
    const a1 = cl(ana), a2 = cl(ana), b = cl(ben);
    await a1.post('/api/conversations/groupe', { nom: 'Chantier', membres: [ben.id] });       // Ben est AUSSI co-membre d'Ana : l'audience la plus large de sa personne
    const fA2 = await T.flux(a2), fB = await T.flux(b); flux.push(fA2, fB);
    v('(population) les deux flux sont ouverts', [fA2.statut, fB.statut], [200, 200]);
    const prefsDe = f => f.evenements.filter(e => e.event === 'prefs');

    /* un geste, et l'autre appareil doit recevoir UN « prefs » de plus */
    async function partira(libelle, geste) {
      const n = prefsDe(fA2).length;
      const r = await geste();
      const ok = await T.attendre(() => prefsDe(fA2).length > n, 2500, 10);
      vrai(libelle + ' (réponse ' + (r && r.code) + ')', !!ok && r && r.code === 200);
    }
    await partira('⛔ « Pause pendant les réunions » coupée : l\'autre appareil l\'apprend', () => a1.post('/api/moi/maj', { prefs: { pause_reunion: false } }));
    await partira('⛔ « Confirmer l\'envoi » changé : l\'autre appareil l\'apprend', () => a1.post('/api/moi/maj', { prefs: { confirmer_envoi: 'partout' } }));
    await partira('⛔ « Aperçu du message » changé : l\'autre appareil l\'apprend', () => a1.post('/api/moi/maj', { prefs: { apercu_notif: true } }));
    await partira('⛔ « Afficher quand je suis en ligne » coupé (confidentialité) : l\'autre appareil l\'apprend', () => a1.post('/api/moi/confidentialite', { presence: false }));
    await partira('⛔ « Confirmations de lecture » coupées : l\'autre appareil l\'apprend', () => a1.post('/api/moi/confidentialite', { accuses: false }));
    await partira('⛔ « Partager ma position » allumé : l\'autre appareil l\'apprend', () => a1.post('/api/moi/confidentialite', { position: true }));
    await partira('⛔ « Me trouver par mon identifiant » coupé : l\'autre appareil l\'apprend', () => a1.post('/api/moi/confidentialite', { trouvable: 'personne' }));
    vrai('   …et l\'enveloppe est VIDE à chaque fois (la page relit ce qu\'elle a le droit de voir : aucun réglage ne voyage)', prefsDe(fA2).length >= 7 && prefsDe(fA2).every(e => JSON.stringify(e.data) === '{}'), JSON.stringify(prefsDe(fA2).map(e => e.data)));

    /* ce qui ne regarde pas les autres appareils : rien ne part, puis la sentinelle */
    const n1 = prefsDe(fA2).length;
    await a1.post('/api/moi/maj', { prefs: { vitesse_vocal: '1.5' } });                                    // un réglage sans rapport
    await a1.post('/api/moi/maj', { prefs: { pause_reunion: false } });                                    // le même réglage renvoyé tel quel
    await a1.post('/api/moi/confidentialite', { presence: false, accuses: false, position: true, trouvable: 'personne' });     // idem, par l'autre route
    await T.dort(150);
    await a1.post('/api/moi/maj', { prefs: { pause_reunion: true } });                                    // SENTINELLE : celui-ci doit partir
    await T.attendre(() => prefsDe(fA2).length > n1, 2500, 10);
    v('⛔ un réglage sans rapport et un réglage renvoyé tel quel n\'ont RIEN envoyé ; la sentinelle, si', prefsDe(fA2).length, n1 + 1);

    /* ⛔ à moi seul : Ben, contact ET co-membre, n'a rien reçu — et son flux marche */
    await a1.post('/api/moi/maj', { statut: 'Sur le chantier' });
    vrai('(sentinelle) le flux de Ben marche : le statut changé d\'Ana lui arrive', await fB.attendre(e => e.event === 'personne'));
    v('⛔ Ben n\'a reçu AUCUN « prefs » : les réglages d\'Ana ne regardent que ses appareils', prefsDe(fB).length, 0);

    console.log('\n2. L\'export du compte : « tes réglages » porte aussi le Pro (heures, pause, confirmation, passage automatique, côté)');
    const cara = pers('Cara'), c1 = cl(cara);
    const e0 = (await c1.post('/api/compte/export', {})).j;
    const R0 = e0 && e0.reglages;
    vrai('(population) l\'export est lu et porte ses réglages historiques', !!R0 && R0.presence === true && R0.accuses === true && R0.trouvable === 'tous', JSON.stringify(R0));
    v('⛔ rien de réglé : les valeurs par défaut, dites (heures coupées, pause allumée, jamais de confirmation, pas de passage automatique, Perso)',
      R0 && [R0.heures_pro, R0.pause_reunion, R0.confirmer_envoi, R0.mode_auto, R0.mode], [null, true, 'jamais', false, 'perso']);
    const dora = pers('Dora'), d1 = cl(dora);
    const HP = { jours: [1, 2, 3, 4, 5], debut: 390, fin: 1080 };
    await d1.post('/api/moi/maj', { prefs: { heures_pro: HP, pause_reunion: false, confirmer_envoi: 'groupes', mode_auto: true, mode: 'pro' } });
    const e1 = (await d1.post('/api/compte/export', {})).j;
    const R1 = e1 && e1.reglages;
    v('⛔ réglé : l\'export dit les heures de travail (6 h 30 – 18 h), la pause coupée, la confirmation « groupes », le passage automatique allumé, le côté Pro',
      R1 && [R1.heures_pro, R1.pause_reunion, R1.confirmer_envoi, R1.mode_auto, R1.mode], [HP, false, 'groupes', true, 'pro']);
  } catch (e) {
    vrai('le banc a tourné sans exception', false, String(e && e.stack || e));
  } finally {
    for (const f of flux) { try { f.fermer(); } catch (e) { /* tant pis */ } }
    try { S.fermer && S.fermer(); } catch (e) { /* tant pis */ }
    try { await svc.arreter(); } catch (e) { /* tant pis */ }
    try { await og.fermer(); } catch (e) { /* tant pis */ }
  }
  fin();
})();

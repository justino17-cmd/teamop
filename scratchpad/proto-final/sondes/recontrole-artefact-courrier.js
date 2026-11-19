// RECONTRÔLE ADVERSE — LE MODULE DE COURRIER SOUS NOTIFICATIONS REFUSÉES, SON REFUSÉ, RANGEMENT REFUSÉ, HISTORIQUE QUI JETTE (17 novembre 2026).
// Règles h, j, k : notifications refusées sans question, le son ne part qu'après un geste, le rangement (IndexedDB compris) peut jeter. Le module est monté dans la
// page (revue, hôte) ; on ouvre Réglages, on coche « Me prévenir », on déclenche l'exemple de mail, on ouvre l'écriture : aucune erreur, l'écran répond.
const P = require('./recontrole-artefact-pose.js'), { bac, lib: L, v } = P;
(async () => {
  for (const profil of ['mac', 'iphone']) for (const [nom, pose] of [['notifs refusées + son refusé + rangement refusé + historique qui jette', { notifs: 'refusees', son: 'refuse', rangement: 'refuse', historique: 'jette-tout', voix: 'jette' }], ['notifs absentes + rangement qui oublie', { notifs: 'absentes', rangement: 'vide' }]]) {
    const c = await P.ouvrirHote({ profil, app: false }, pose);
    await L.aller(c.p, 'boiteMail'); const pret = await L.attendre(c.p, () => typeof COURRIER !== 'undefined' && COURRIER.etat === 'pret', 25000); await L.calme(c.p, 700);
    v(`${profil} « ${nom} » : population (le module de courrier est monté)`, pret, await c.p.evaluate(() => typeof COURRIER !== 'undefined' ? COURRIER.etat : 'absent'));
    if (pret) {
      // Au téléphone le module n'a qu'UNE vue à la fois : « Réglages » vit dans la vue des boîtes (data-view=mailboxes), à laquelle la liste mène par le bouton de navigation (#btnNav) ; sur ordinateur la barre latérale est toujours là
      if (profil === 'iphone') { const nav = c.p.locator('#courrier-hote #btnNav:visible').first(); if (await nav.count()) { await L.toucher(c, nav); await L.calme(c.p, 600); } }
      const regL = c.p.locator('#courrier-hote [data-settings]:visible').first(), reg = await regL.count() > 0;   // le module vit dans un shadow root : les sélecteurs de Playwright le traversent, document.querySelector non
      v(`${profil} « ${nom} » : population (le bouton Réglages existe)`, reg, '');
      if (reg) { await L.toucher(c, regL); await L.calme(c.p, 500);
        const n = c.p.locator('#stNotif').first(); const aN = await n.count(); v(`${profil} « ${nom} » : population (« Me prévenir » existe)`, aN > 0, aN);
        if (aN) { await L.toucher(c, n); await c.p.waitForTimeout(500); }
        const t = c.p.locator('#stTest').first(); if (await t.count()) { await L.toucher(c, t); await c.p.waitForTimeout(800); }
        const d = c.p.locator('#stDone').first(); if (await d.count()) { await L.toucher(c, d); await L.calme(c.p, 400); } }
      // retour à la liste (téléphone : on est resté dans la vue des boîtes) par la boîte de réception, comme le ferait la personne
      if (profil === 'iphone') { const bi = c.p.locator('#courrier-hote #sidebar .folder[data-folder="inbox"]:visible').first(); if (await bi.count()) { await L.toucher(c, bi); await L.calme(c.p, 600); } }
      const ec = c.p.locator('#btnCompose').first(); v(`${profil} « ${nom} » : population (« Écrire » existe)`, await ec.count() > 0, '');
      if (await ec.count()) { const ok = await L.toucher(c, ec, { delai: 6000 }); await L.calme(c.p, 500); v(`${profil} « ${nom} » : « Écrire » ouvre la rédaction`, ok && await c.p.locator('#cTo').count() > 0, ok); }
    }
    const e = await P.etat(c);
    v(`${profil} « ${nom} » : aucune erreur JavaScript non rattrapée`, c.err.length === 0, c.err.slice(0, 3));
    console.log('  · notifications :', JSON.stringify(e.adv.notifs), '· rangement :', e.rangement.length, '· dialogues :', e.dialogues.length);
    await L.fin(c);
  }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });

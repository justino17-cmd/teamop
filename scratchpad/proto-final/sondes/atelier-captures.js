// Captures à REGARDER (outil Read) des écrans que l'atelier ajoute au prototype : Contrats avec sa liste, fiche client avec ses documents composés, fenêtre d'attente, contrat dans l'atelier.
// Mac et iPhone, jour et nuit. Les images vont dans CAP (hors dépôt).
const A = require('./atelier-outils.js'), L = A.L;
(async () => {
  for (const [pr, nuit] of [['mac', false], ['mac', true], ['iphone', false], ['iphone', true]]) {
    const tag = pr + (nuit ? '-nuit' : '-jour'), c = await L.ouvrir({ profil: pr, nuit, qui: 'marc' }), p = c.p;
    let f = await A.ouvrirAtelier(c, 'contrat', 'contrats'); await A.composerContrat(c, f, { client: 'mi', titre: 'Entretien annuel — Les Mimosas', prix: '1400' });
    await L.calme(p, 900); await L.capture(c, A.CAP + 'cap-contrat-editeur-' + tag + '.png');
    await f.locator('[data-act="retour"]:visible').first().click().catch(async () => { await f.locator('.fen-v.souple [data-fen-x]:visible').first().click(); await p.waitForTimeout(400); await f.locator('[data-act="retour"]:visible').first().click(); }); await p.waitForTimeout(900);
    await L.aller(p, 'contrats'); await p.locator('#contenu .opd-liste').first().scrollIntoViewIfNeeded().catch(() => {}); await L.calme(p, 400); await L.capture(c, A.CAP + 'cap-contrats-' + tag + '.png');
    await L.aller(p, 'client-x-mi'); await L.calme(p, 500); await L.capture(c, A.CAP + 'cap-client-' + tag + '.png');
    await L.fin(c);
  }
  L.absents.add('apercu/prototype-documents.html'); const c = await L.ouvrir({ profil: 'iphone', nuit: false, qui: 'marc' }); await L.aller(c.p, 'devis'); await L.toucher(c, '[data-opd="devis"]'); await c.p.waitForTimeout(8800); await L.capture(c, A.CAP + 'cap-echec-iphone-jour.png'); await L.fin(c);
  await L.fermer();
})().catch(e => { console.error(e); process.exit(2); });

// LE MODULE DE COURRIER DANS L'ARTEFACT (17 novembre 2026) : la boîte mail est le module OP Courrier (prototype-courrier.js), qui fabriquait son lien
// « download » lui-même — inerte dans l'artefact. Il demande désormais à son HÔTE (point d'extension H9 « telecharger(nom, blob) »), qui passe par le pont.
// Parcours réel : Boîte mail › Écrire › Joindre un PDF › Aperçu › Télécharger. Le fichier arrive au pont (non vide, au bon nom) ; le visiteur refuse :
// la page le DIT ; sans pont : une phrase qui ne promet rien. Le module d'origine (opcourrier.js) n'est pas touché : sans hôte, le lien d'avant.
// ⛔ 127.0.0.1 seulement.
const A = require('./artefact-commun.js'), { bac, L, v } = A;
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
async function parcours(c) {
  await L.aller(c.p, 'boiteMail'); const pret = await L.attendre(c.p, () => typeof COURRIER !== 'undefined' && COURRIER.etat === 'pret', 20000); if (!pret) return { pret: false };
  await L.calme(c.p, 600);
  const ec = c.p.locator('#btnCompose').first(); if (!await L.toucher(c, ec, { delai: 6000 })) return { pret, compose: false };
  await c.p.locator('#cFile').first().setInputFiles({ name: 'devis-essai.pdf', mimeType: 'application/pdf', buffer: PDF }); await L.calme(c.p, 500);
  const apercu = c.p.locator('[data-pv-c="0"]').first(); if (!await L.toucher(c, apercu, { delai: 5000 })) return { pret, compose: true, apercu: false };
  await L.calme(c.p, 500); const dl = c.p.locator('[data-pv="dl"]').first();
  const ok = await L.toucher(c, dl, { delai: 5000 }); await c.p.waitForTimeout(600);
  return { pret, compose: true, apercu: true, dl: ok };
}
(async () => {
  for (const profil of ['mac', 'iphone']) {
    const T = profil;
    let c = await bac.ouvrir({ profil, qui: 'marc' }, {}); await A.calmer(c.p);
    let p = await parcours(c);
    v(`${T} courrier : population (module monté, pièce jointe, aperçu, bouton Télécharger touché)`, p.pret && p.compose && p.apercu && p.dl, p);
    let e = await bac.etat(c);
    v(`${T} courrier : le PDF arrive au pont (non vide, au bon nom, au bon type)`, e.fichiers.length === 1 && e.fichiers[0].nom === 'devis-essai.pdf' && e.fichiers[0].type === 'application/pdf' && e.fichiers[0].taille > 20 && e.fichiers[0].debut.startsWith('%PDF'), e.fichiers);
    v(`${T} courrier : aucun lien « download » inerte (le module ne fabrique plus le sien)`, e.liensInertes.length === 0, e.liensInertes);
    v(`${T} courrier : la page dit « enregistré »`, /enregistré/.test(await c.p.evaluate(() => (document.getElementById('toast') || {}).textContent || '')), '');
    v(`${T} courrier : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
    c = await bac.ouvrir({ profil, qui: 'marc' }, { refuser: true }); await A.calmer(c.p); p = await parcours(c); e = await bac.etat(c);
    const t = await c.p.evaluate(() => (document.getElementById('toast') || {}).textContent || '');
    v(`${T} courrier : le visiteur refuse → rien d'enregistré, la page le dit (« ${t.slice(0, 50)} »)`, p.dl && e.fichiers.length === 0 && e.refus.length === 1 && /refus/i.test(t), { p, t });
    await L.fin(c);
    c = await bac.ouvrir({ profil, qui: 'marc' }, { pont: false }); await A.calmer(c.p); p = await parcours(c); e = await bac.etat(c);
    const t2 = await c.p.evaluate(() => (document.getElementById('toast') || {}).textContent || '');
    v(`${T} courrier : sans pont, la page ne promet rien (« ${t2.slice(0, 60)} »)`, p.dl && /demandé/.test(t2) && !/enregistré :/.test(t2), { p, t2 });
    await L.fin(c);
  }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });

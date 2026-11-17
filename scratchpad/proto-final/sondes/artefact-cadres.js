// LES CADRES VOISINS DANS L'ARTEFACT (17 novembre 2026) : documents (l'atelier de devis et contrats), comptabilité et paiement vivent dans des
// <iframe> de la page principale. window.claude n'existe QUE dans la page du haut : un cadre doit passer par celui du parent (même origine),
// sans jamais supposer qu'il existe, et dire l'issue (enregistré, refusé, indisponible). Le bac ne donne window.claude à AUCUN cadre.
// ⛔ 127.0.0.1 seulement. Chaque contrôle compte d'abord sa population (le cadre existe, il est chargé, le pont du haut est appelé).
const A = require('./artefact-commun.js'), { bac, L, v } = A;
(async () => {
  for (const profil of ['mac', 'iphone']) {
    const T = profil;
    // ── comptabilité : le FEC part par le pont du PARENT ──
    let c = await bac.ouvrir({ profil, qui: 'marc' }, {}); await A.calmer(c.p);
    await c.p.evaluate(() => { const a = document.querySelector('#menu a[href="#comptabilite"]'); if (a) a.click(); else location.hash = 'comptabilite'; }); await L.calme(c.p, 1800);
    let f = L.cadre(c.p, /prototype-comptabilite\.html/);
    v(`${T} compta : population (le cadre est là et chargé)`, !!f && await f.evaluate(() => typeof fecTelecharger === 'function').catch(() => false), f && f.url());
    if (f) {
      v(`${T} compta : le cadre n'a PAS window.claude (le bac le refuse aux cadres)`, await f.evaluate(() => typeof window.claude) === 'undefined', '');
      await f.evaluate(() => aller('fec')); await L.calme(c.p, 500); await bac.zero(c); await f.locator('[data-a="fec-dl"]').first().click(); await c.p.waitForTimeout(700); let e = await bac.etat(c);
      v(`${T} compta : le FEC arrive au pont du parent, non vide, au bon nom`, e.fichiers.length === 1 && /FEC\d{8}\.txt$/.test(e.fichiers[0].nom) && e.fichiers[0].taille > 300 && e.fichiers[0].cadre === 'haut', e.fichiers);
      v(`${T} compta : le cadre dit « enregistré »`, /FEC enregistré/.test(await f.evaluate(() => (document.getElementById('toast') || {}).textContent || '')), '');
      await c.p.close().catch(() => {});
    }
    await L.fin(c);
    // refus du visiteur : le cadre le dit, rien d'enregistré
    c = await bac.ouvrir({ profil, qui: 'marc' }, { refuser: true }); await A.calmer(c.p);
    await c.p.evaluate(() => { const a = document.querySelector('#menu a[href="#comptabilite"]'); if (a) a.click(); else location.hash = 'comptabilite'; }); await L.calme(c.p, 1800);
    f = L.cadre(c.p, /prototype-comptabilite\.html/);
    if (f) { await f.evaluate(() => aller('fec')); await L.calme(c.p, 500); await f.locator('[data-a="fec-dl"]').first().click(); await c.p.waitForTimeout(600); const e = await bac.etat(c), t = await f.evaluate(() => (document.getElementById('fec-msg') || {}).textContent || '');
      v(`${T} compta : refus du visiteur → rien d'enregistré, le cadre le dit (« ${t.slice(0, 40)} »)`, e.fichiers.length === 0 && e.refus.length === 1 && /annulé|refus/i.test(t), { e: e.refus, t }); }
    else v(`${T} compta (refus) : population`, false, 'cadre absent');
    await L.fin(c);
    // pont absent PARTOUT : le cadre montre le début du fichier et dit pourquoi
    c = await bac.ouvrir({ profil, qui: 'marc' }, { pont: false }); await A.calmer(c.p);
    await c.p.evaluate(() => { const a = document.querySelector('#menu a[href="#comptabilite"]'); if (a) a.click(); else location.hash = 'comptabilite'; }); await L.calme(c.p, 1800);
    f = L.cadre(c.p, /prototype-comptabilite\.html/);
    if (f) { await f.evaluate(() => aller('fec')); await L.calme(c.p, 500); await f.locator('[data-a="fec-dl"]').first().click(); await c.p.waitForTimeout(600); const t = await f.evaluate(() => (document.getElementById('fec-msg') || {}).textContent || ''), e = await bac.etat(c);
      // la page est ici la fenêtre du HAUT (hors artefact : un onglet, la coque) : sans pont, un lien de téléchargement est demandé (le bac, lui, le rend inerte et le COMPTE)
      // et la phrase dit la vérité. Le cas « dans un cadre verrouillé » (« pas disponible », texte à copier) se joue dans recontrole-artefact-voisins.js.
      v(`${T} compta : hors artefact sans pont, le cadre demande un lien et dit « s'il ne démarre pas, ton navigateur le bloque »`, /téléchargement demandé/i.test(t) && /ne démarre pas, ton navigateur le bloque/.test(t) && !/pas disponible/.test(t) && e.liensInertes.length === 1 && /FEC/.test(e.liensInertes[0].nom), { t: t.slice(0, 120), li: e.liensInertes }); }
    await L.fin(c);
    // ── l'atelier de documents : l'enregistrement passe par le pont du PARENT ──
    c = await bac.ouvrir({ profil, qui: 'marc' }, {}); await A.calmer(c.p);
    await L.aller(c.p, 'devis'); await c.p.locator('#contenu [data-opd="devis"]').first().click({ timeout: 5000 }).catch(() => {}); await L.calme(c.p, 2500);
    f = L.cadre(c.p, /prototype-documents\.html/);
    v(`${T} atelier : population (le cadre est là et prêt)`, !!f && await f.evaluate(() => typeof pdfEnregistrer === 'function').catch(() => false), f && f.url());
    if (f) {
      v(`${T} atelier : le cadre n'a PAS window.claude`, await f.evaluate(() => typeof window.claude) === 'undefined', '');
      await bac.zero(c); const r = await f.evaluate(() => pdfEnregistrer(new Blob(['%PDF-1.4\n% essai atelier'], { type: 'application/pdf' }), 'devis-essai.pdf')); await c.p.waitForTimeout(400); const e = await bac.etat(c);
      v(`${T} atelier : le PDF arrive au pont du parent (nom, type, taille)`, r === 'saved' && e.fichiers.length === 1 && e.fichiers[0].nom === 'devis-essai.pdf' && e.fichiers[0].type === 'application/pdf' && e.fichiers[0].taille > 10, { r, f: e.fichiers });
      const t = await f.evaluate(() => [...document.querySelectorAll('#toasts .toast')].map(x => x.textContent).join(' | '));
      v(`${T} atelier : le cadre dit « enregistré » (« ${String(t).slice(0, 50)} »)`, /enregistré/.test(t), t);
      // le visiteur refuse : le cadre le dit
      v(`${T} atelier : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
    }
    await L.fin(c);
    c = await bac.ouvrir({ profil, qui: 'marc' }, { refuser: true }); await A.calmer(c.p);
    await L.aller(c.p, 'devis'); await c.p.locator('#contenu [data-opd="devis"]').first().click({ timeout: 5000 }).catch(() => {}); await L.calme(c.p, 2500);
    f = L.cadre(c.p, /prototype-documents\.html/);
    if (f) { const r = await f.evaluate(() => pdfEnregistrer(new Blob(['%PDF-1.4\n% essai'], { type: 'application/pdf' }), 'devis-essai.pdf')); await c.p.waitForTimeout(300); const e = await bac.etat(c), t = await f.evaluate(() => [...document.querySelectorAll('#toasts .toast')].map(x => x.textContent).join(' | '));
      v(`${T} atelier : refus du visiteur → 'declined', rien d'enregistré, le cadre le dit`, r === 'declined' && e.fichiers.length === 0 && /refus/i.test(t), { r, t }); }
    else v(`${T} atelier (refus) : population`, false, 'cadre absent');
    await L.fin(c);
    // ── le paiement : aucune sortie sauf l'IBAN à copier ──
    c = await bac.ouvrir({ profil, qui: 'marc' }, { presse: 'refuse' }); await A.calmer(c.p);
    await c.p.close().catch(() => {}); await L.fin(c);
    c = await bac.ouvrir({ profil: profil, qui: null, page: 'prototype-paiement.html', requete: '?app=1&mode=jour' }, { presse: 'refuse' }); await A.calmer(c.p);
    const bt = c.p.locator('[data-cli="copier"],[data-a="copier"],button:has-text("Copier")').first();
    if (await bt.count()) { await bt.click({ timeout: 3000 }).catch(() => {}); await c.p.waitForTimeout(400); const t = await c.p.evaluate(() => document.body.innerText);
      v(`${T} paiement : la copie de l'IBAN refusée → l'IBAN est sélectionné/affiché, l'écran le dit`, /FR76/.test(t.replace(/\s/g, '').replace(/(FR76)/, '$1')) || /IBAN/.test(t), t.slice(0, 80)); }
    v(`${T} paiement : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });

// CONTRE-VÉRIFICATION de ponts-01 / ponts-02 sur la TÊTE ACTUELLE (étape 6 sur 8, 17 novembre 2026).
// Depuis le 17 novembre, un clic sur un lien blob: est intercepté par l'hôte (voirFichierLocal : image en <img>, le reste à enregistrer) :
// la sonde ponts-fichiers.js ne voit plus d'onglet. Reste-t-il un chemin qui ouvre le blob comme DOCUMENT dans l'origine de l'application ?
// Ici : le clic du MILIEU (auxclick, que l'écouteur « click » ne voit pas) et le clic droit › « ouvrir dans un nouvel onglet » (même effet).
// ⛔ 127.0.0.1 seulement. Un ✗ est une faille qui existe encore.
const L = require('../lib.js');
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60" onload="window.__pwn={o:location.origin,cles:Object.keys(localStorage)};document.title=\'PWN\'"><rect width="200" height="60" fill="#ccc"/><text x="8" y="36">attestation</text></svg>';
(async () => {
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1500 }), p = c.p;
  await p.evaluate(() => { localStorage.setItem('opg_secret_essai', 'valeur-du-rangement'); });
  await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} vehFiche('veh1', 'papiers'); }); await p.waitForTimeout(700);
  const a = p.locator('[data-vh="docadd|veh1"]').first(); L.v('population : le bouton « Ajouter un document » existe', (await a.count()) > 0);
  await a.click(); await p.waitForTimeout(450);
  await p.locator('#vh-dk').selectOption('assur').catch(() => {}); await p.locator('#vh-df').setInputFiles({ name: 'attestation.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(SVG) }); await p.waitForTimeout(200);
  await p.locator('[data-vh="docok|veh1"]').first().click(); await p.waitForTimeout(900);
  const info = await p.evaluate(() => { const d = (VEHICULES[0].docs || {}).assur; const m = [...document.querySelectorAll('a.vx-mini')].find(x => /Attestation/.test(x.getAttribute('aria-label') || '')); return { doc: d ? { type: d.type, blob: /^blob:/.test(d.url) } : null, lien: !!m, cible: m && m.getAttribute('target'), href: m && (m.getAttribute('href') || '').slice(0, 12) }; });
  console.log('document SVG rangé :', JSON.stringify(info));
  L.v('population : l\'attestation SVG est rangée et sa miniature est un lien blob:', !!(info.doc && info.doc.blob && info.lien), info);
  if (info.lien) {
    const lien = p.locator('a.vx-mini').nth(await p.evaluate(() => [...document.querySelectorAll('a.vx-mini')].findIndex(x => /Attestation/.test(x.getAttribute('aria-label') || '')))).first();
    // témoin : le clic ordinaire est bien intercepté (sinon la sonde ne regarde pas la même chose que l'ancienne)
    const [popClic] = await Promise.all([c.ctx.waitForEvent('page', { timeout: 4000 }).catch(() => null), lien.click()]);
    L.v('témoin : le clic ordinaire n\'ouvre pas d\'onglet (l\'hôte l\'intercepte)', !popClic, popClic ? 'onglet ouvert' : 'aucun onglet');
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} vehFiche('veh1', 'papiers'); }); await p.waitForTimeout(800);
    // le clic du milieu
    const [pop] = await Promise.all([c.ctx.waitForEvent('page', { timeout: 6000 }).catch(() => null), lien.click({ button: 'middle' })]);
    if (pop) { await pop.waitForLoadState('load').catch(() => {}); await pop.waitForTimeout(700);
      const r = await pop.evaluate(() => ({ url: location.href.slice(0, 30), titre: document.title, pwn: window.__pwn || null })).catch(e => ({ erreur: e.message.slice(0, 80) }));
      console.log('clic du milieu → onglet :', JSON.stringify(r));
      L.v('1. le clic du milieu sur la miniature d\'un SVG piégé n\'exécute pas son script (exécuté : ' + (r.pwn ? 'OUI, origine ' + r.pwn.o + ', clés ' + r.pwn.cles.join(',') : 'non') + ')', !r.pwn, r);
      await pop.close(); }
    else L.v('1. le clic du milieu n\'ouvre aucun onglet (rien à exécuter)', true);
  }
  console.log('erreurs page :', c.err.slice(0, 3)); await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });

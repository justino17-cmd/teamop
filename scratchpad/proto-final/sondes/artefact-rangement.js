// « RANGEMENT REFUSÉ » (17 novembre 2026) : dans l'artefact, localStorage / sessionStorage / IndexedDB peuvent jeter ou revenir VIDES
// (fenêtre privée, aperçu, site bloqué). Chaque rôle (gérant, secrétariat, technicienne) ouvre l'application, change d'écran, crée un devis rapide
// (le gérant et le secrétariat) — sans page blanche ni erreur JavaScript. Trois variantes du bac : l'accès jette (« refuse »), chaque méthode
// jette (« methodes »), le rangement oublie tout (« vide »). Population : le bac PROUVE qu'il a mordu (la page a bien tenté d'y toucher).
//   PROFILS=mac,iphone  node artefact-rangement.js
const A = require('./artefact-commun.js'), { bac, L, v } = A;
const PROFILS = (process.env.PROFILS || (process.env.RAPIDE ? 'mac' : 'mac,iphone')).split(','), MODES = process.env.RAPIDE ? ['refuse'] : ['refuse', 'methodes', 'vide'], ROLES = process.env.RAPIDE ? ['marc'] : ['marc', 'julie', 'sm'];   // RAPIDE=1 : pour les mutations
(async () => {
  for (const mode of MODES) for (const profil of PROFILS) for (const qui of ROLES) {
    const T = `${mode} ${qui}/${profil}`;
    const c = await bac.ouvrir({ profil, qui, guide: false }, { rangement: mode }); await A.calmer(c.p);
    const ouv = await c.p.evaluate(() => ({ h1: ((document.querySelector('#contenu h1') || {}).textContent || '').trim(), texte: document.getElementById('contenu').innerText.length, route }));
    v(`${T} : l'application s'ouvre (un titre, du contenu, pas de page blanche)`, ouv.h1.length > 1 && ouv.texte > 200, ouv);
    let e = await bac.etat(c);
    if (mode !== 'vide') v(`${T} : population (le bac a mordu : la page a touché au rangement ${e.rangement.length} fois)`, e.rangement.length > 0, e.rangement.slice(0, 3));
    // change d'écran : toutes les entrées du menu du rôle
    const routes = await c.p.evaluate(() => [...new Set([...document.querySelectorAll('#menu a[href^="#"]')].map(a => a.getAttribute('href').slice(1)))].filter(r => routeConnue(r)));
    v(`${T} : population (des écrans à visiter : ${routes.length})`, routes.length >= 3, routes);
    let vides = [];
    for (const r of routes.slice(0, 14)) { await L.aller(c.p, r);
      if (r === 'boiteMail') { await L.attendre(c.p, () => typeof COURRIER !== 'undefined' && (COURRIER.etat === 'pret' || COURRIER.etat === 'echec'), 20000); await L.calme(c.p, 500);   // le module de courrier se charge à la première ouverture
        const m = await c.p.evaluate(() => { const h = document.getElementById('courrier-hote'), sr = h && h.firstElementChild && h.firstElementChild.shadowRoot; return { etat: COURRIER.etat, n: sr ? sr.innerHTML.length : 0 }; }); if (m.etat !== 'pret' || m.n < 500) vides.push('boiteMail:' + JSON.stringify(m)); continue; }
      const h = await c.p.evaluate(() => ({ h1: ((document.querySelector('#contenu h1') || {}).textContent || '').trim(), n: document.getElementById('contenu').innerText.length })); if (h.n < 60) vides.push(r + ':' + h.n); }
    v(`${T} : ${Math.min(14, routes.length)} écrans visités, aucun vide`, vides.length === 0, vides);
    // un devis rapide (rôles qui ont les devis)
    if (qui !== 'sm' && routes.includes('devis')) {
      await L.aller(c.p, 'devis'); const bt = c.p.locator('#contenu [data-dv="nouveau"]').first();
      if (await L.toucher(c, bt)) { await c.p.selectOption('#dvn-cli', { index: 1 }).catch(() => {}); await c.p.fill('#dvn-objet', 'Remplacement de la pompe (essai rangement)').catch(() => {});
        const avant = await c.p.evaluate(() => (typeof DV !== 'undefined' ? DV.length : -1));
        await L.toucher(c, c.p.locator('#calque [data-dvn="creer|1"]').first()); await L.calme(c.p, 500);
        const apres = await c.p.evaluate(() => ({ n: typeof DV !== 'undefined' ? DV.length : -1, panneau: ((document.querySelector('#calque .panneau') || {}).textContent || '').slice(0, 80), route }));
        v(`${T} : le devis rapide se crée (un devis de plus, ou sa fenêtre s'ouvre)`, apres.n > avant || /devis/i.test(apres.panneau) || /devis/i.test(apres.route), { avant, apres });
      } else v(`${T} : le bouton « Devis rapide » répond`, false, 'non touché');
    }
    // un réglage qui se range (Jour/Nuit) : il vaut pour l'ouverture même si le rangement refuse
    const bouton = await c.p.evaluate(() => { const b = document.querySelector('[data-modetheme="nuit"]'); if (!b) return false; b.click(); return true; }); await L.calme(c.p, 300);
    v(`${T} : population (le bouton « Nuit » existe et a été touché)`, bouton, '');
    v(`${T} : le thème nuit s'applique malgré le rangement refusé`, (await c.p.evaluate(() => document.documentElement.dataset.mode)) === 'nuit', '');
    v(`${T} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 4));
    await L.fin(c);
  }
  // les trois cadres voisins ouverts SEULS (comme dans l'artefact, où ils sont des pages à part) : ils se rendent aussi, rangement refusé
  for (const page of process.env.RAPIDE ? [] : ['prototype-documents.html', 'prototype-comptabilite.html', 'prototype-paiement.html']) for (const mode of ['refuse', 'methodes']) {
    const c = await bac.ouvrir({ profil: 'mac', qui: null, page, requete: page === 'prototype-documents.html' ? '' : '?app=1&mode=jour' }, { rangement: mode }); await A.calmer(c.p);
    const n = await c.p.evaluate(() => document.body.innerText.length);
    v(`${page} rangement ${mode} : la page se rend (${n} signes)`, n > 200, n);
    v(`${page} rangement ${mode} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 4));
    await L.fin(c);
  }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });

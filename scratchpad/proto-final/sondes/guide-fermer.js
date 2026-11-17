// Le guide des nouveautés : se ferme par ✕, Échap, un toucher dehors et « Plus tard » ; un toucher DEDANS ne le ferme pas ; se retient ;
// se rouvre par « Nouveautés » (pied du menu à l'ordinateur, feuille « Menu » au téléphone) ; ne s'ouvre qu'une fois par compte ;
// ne s'ouvre jamais par-dessus une fenêtre ouverte ni pendant la visite parlée ; n'existe pas pour le client ; se souvient même si le rangement est refusé.
// Usage : PROFIL=mac|iphone QUI=marc,julie,sm node guide-fermer.js
const G = require('./guide-commun.js'), L = G.L, v = L.v;
const PROFIL = process.env.PROFIL || 'mac', QUIS = (process.env.QUI || 'marc,sm').split(','), TEL = G.TEL.includes(PROFIL);
const cle = (p) => p.evaluate(() => { try { return localStorage.getItem(NV_CLE + SESSION); } catch (e) { return 'ERR'; } });
(async () => {
  for (const QUI of QUIS) {
    const tag = `${QUI}/${PROFIL}`;
    const c = await L.ouvrir({ profil:PROFIL, qui:QUI }), p = c.p;
    // ── l'ouverture à la première connexion (la fonction que la connexion appelle) : une fois, et la marque est posée à l'OUVERTURE
    await p.evaluate(() => { try { localStorage.removeItem(NV_CLE + SESSION); } catch (e) {} NV_MEM.delete(SESSION); });
    v(`${tag} : sans marque, le guide n'a pas encore été vu (nvVu faux) et rien n'est ouvert`, !(await p.evaluate(() => nvVu())) && !(await G.ouvert(p)));
    await p.evaluate(() => nvProposer()); await L.calme(p, 500);
    v(`${tag} : nvProposer() ouvre le guide (la première connexion)`, await G.ouvert(p));
    v(`${tag} : la marque « vu » est posée dès l'ouverture (un rechargement ne le rouvre pas)`, (await cle(p)) === (await p.evaluate(() => NV_VERSION)), await cle(p));
    await p.evaluate(() => nvFermer(true)); await p.evaluate(() => nvProposer()); await L.calme(p, 300);
    v(`${tag} : une seconde proposition (reconnexion) n'ouvre plus rien : une seule ouverture par compte`, !(await G.ouvert(p)));
    await p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); });
    // ── la mémoire du compte : un AUTRE compte du même appareil a SA marque
    const autre = await p.evaluate(() => { const k = SESSION; return NV_CLE + k; }); v(`${tag} : la marque est rangée sous l'identifiant du compte (${autre})`, /opg_proto_nv_vu_\w+/.test(autre));
    // ── les quatre fermetures, chacune suivie d'une réouverture par « Nouveautés »
    const rouvrir = async () => {
      if (TEL) { await L.ranger(p); const bm = p.locator('#contenu .tt-menu:visible, .cpsys-menu:visible').first(); await bm.waitFor({ state:'visible', timeout:10000 }).catch(() => {});   /* la Comptabilité du bureau pose son bouton « Menu » un peu après l'ouverture */
        await L.toucher(c, bm); await L.calme(p, 400); const ok = await L.toucher(c, '#calque .nv-menu'); await L.calme(p, 500); return ok; }
      const ok = await L.toucher(c, '#menu .nv-menu'); await L.calme(p, 500); return ok; };
    const GESTES = [
      ['✕', async () => L.toucher(c, '#nv .nv-x')],
      ['Échap', async () => p.keyboard.press('Escape')],
      ['« Plus tard »', async () => L.toucher(c, '#nv .nv-tard')],
      ['un toucher en dehors de la feuille', async () => { const r = await p.evaluate(() => { const f = document.querySelector('#nv .nv-feuille').getBoundingClientRect(); return { x:Math.round(f.left + f.width / 2), y:Math.round(Math.max(6, f.top / 2)) , haut:Math.round(f.top) }; }); if (TEL) await p.touchscreen.tap(r.x, r.y); else await p.mouse.click(r.x, Math.max(4, r.y)); await L.calme(p, 300); return r.haut > 8; }]
    ];
    for (const [nom, geste] of GESTES) {
      const ok = await rouvrir();
      v(`${tag} : « Nouveautés » rouvre le guide (avant de le fermer par ${nom})`, ok && await G.ouvert(p));
      const g = await geste(); await L.calme(p, 500);
      v(`${tag} : ${nom} ferme le guide`, g !== false && !(await G.ouvert(p)), g);
      v(`${tag} : …et l'application derrière est intacte (le menu répond encore)`, await p.evaluate(() => !!document.getElementById('contenu') && document.getElementById('contenu').innerText.length > 20));
    }
    // ── un toucher DEDANS ne ferme pas
    await rouvrir();
    const dedans = await p.evaluate(() => { const e = document.querySelector('#nv .nv-carte:not([inert]) h2'), r = e.getBoundingClientRect(); return { x:Math.round(r.left + r.width / 2), y:Math.round(r.top + r.height / 2) }; });
    if (TEL) await p.touchscreen.tap(dedans.x, dedans.y); else await p.mouse.click(dedans.x, dedans.y); await L.calme(p, 400);
    v(`${tag} : un toucher sur le titre d'une carte ne ferme pas le guide`, await G.ouvert(p));
    // Retour système (la flèche du navigateur, le geste de l'iPhone) : ferme le guide
    await p.keyboard.press('Escape'); await L.calme(p, 400);
    // ── plus de point « nouveau » sur la ligne Nouveautés une fois vu
    if (!TEL) v(`${tag} : le point « nouveau » de la ligne Nouveautés est parti`, (await p.locator('#menu .nv-menu i').count()) === 0);
    await L.ranger(p);
    // ── jamais par-dessus une fenêtre ouverte, ni pendant la visite parlée
    const frais = async () => { await p.evaluate(() => { try { localStorage.removeItem(NV_CLE + SESSION); } catch (e) {} NV_MEM.delete(SESSION); document.getElementById('nv')?.remove(); NV = null; }); };
    const CAS = [
      ['une fiche (panneau) ouverte', () => p.evaluate(() => ouvrirPanneau('<h2>Une fiche</h2><p>Test</p>')), () => p.evaluate(() => fermerPanneau())],
      ['la fenêtre « Nouvelle intervention »', () => p.evaluate(() => ouvrirCreation({})), () => p.evaluate(() => { try { fermerCreation(); } catch (e) {} })],
      ['la visite parlée', () => p.evaluate(() => immLancer(0)), () => p.evaluate(() => gdQuitter())],
    ];
    if (!TEL) CAS.push(['la recherche (Ctrl+K)', async () => { await p.evaluate(() => palOuvrir()); }, () => p.evaluate(() => palFermer(false))]);
    for (const [nom, ouvrir, fermer] of CAS) {
      await frais(); await ouvrir(); await L.calme(p, 600);
      const avant = await p.evaluate(() => calOuverts().concat(typeof GD !== 'undefined' && GD.actif ? ['visite'] : []));
      v(`${tag} : population : « ${nom} » est bien ouverte (${avant.join(', ')})`, avant.length > 0);
      await p.evaluate(() => nvProposer(6)); await L.calme(p, 400);
      v(`${tag} : par-dessus ${nom}, le guide ne s'ouvre pas`, !(await G.ouvert(p)));
      v(`${tag} : …et il n'est pas marqué « vu » (il pourra venir plus tard)`, (await cle(p)) === null);
      await fermer(); await L.calme(p, 400); await p.evaluate(() => { try { immQuitter && immQuitter(); } catch (e) {} });
      await p.evaluate(() => nvProposer()); await L.calme(p, 500);
      v(`${tag} : ${nom} fermée, la proposition suivante l'ouvre`, await G.ouvert(p));
      await p.evaluate(() => nvFermer(true)); await L.ranger(p);
    }
    // ── une proposition retardée : la fenêtre se ferme avant la dernière tentative → il s'ouvre tout seul
    await frais(); await p.evaluate(() => ouvrirPanneau('<h2>Une fiche</h2>')); await p.evaluate(() => nvProposer(4)); await p.waitForTimeout(400);
    await p.evaluate(() => fermerPanneau()); await p.waitForTimeout(1900);
    v(`${tag} : la fenêtre fermée avant la dernière tentative, le guide s'ouvre seul`, await G.ouvert(p));
    await p.evaluate(() => nvFermer(true));
    // ── le rangement refusé (navigation privée, cadre) : on se souvient le temps de la page
    await frais(); await p.evaluate(() => { Storage.prototype.setItem = function(){ throw new Error('refusé'); }; });
    await p.evaluate(() => nvProposer()); await L.calme(p, 400);
    v(`${tag} : rangement refusé : le guide s'ouvre quand même (sans planter)`, await G.ouvert(p));
    await p.evaluate(() => nvFermer(true)); await p.evaluate(() => nvProposer()); await L.calme(p, 300);
    v(`${tag} : rangement refusé : il ne se rouvre pas dans la même page (la mémoire de la page)`, !(await G.ouvert(p)));
    v(`${tag} : aucune erreur de console`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  // ── pas de guide pour le client ni le comptable
  { const c = await L.ouvrir({ profil:PROFIL, qui:'marc' }), p = c.p;
    const r = await p.evaluate(() => { const garde = ROLE; const o = {}; for (const R of ['client', 'compta']) { ROLE = R; o[R] = { role:nvRole(), ouvre:nvOuvrir(), pages:nvCartes().length, pied:/nv-menu/.test(rlPied(false)), pal:(() => { try { return palEntrees().some(e => /Nouveautés/.test(e.l)); } catch (e) { return 'erreur'; } })() }; } ROLE = garde; return o; });
    for (const R of ['client', 'compta']) v(`${R} : pas de guide (rôle nul, nvOuvrir faux, aucune carte, pas de ligne Nouveautés au pied ni à la recherche)`, r[R].role === null && r[R].ouvre === false && r[R].pages === 0 && !r[R].pied && r[R].pal === false, r[R]);
    v('le client et le comptable : rien ne s\'est ouvert', !(await G.ouvert(p)));
    await L.fin(c); }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); await L.fermer(); process.exit(2); });

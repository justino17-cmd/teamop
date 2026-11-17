// LES PAGES VOISINES D'UNE AUTRE ORIGINE (recontrôle du 17 novembre 2026, ADAPTÉE aux restes « artefact », tour 2).
// Avant l'étape sécurité 7, la sonde rechargeait le cadre de la Comptabilité sous l'hôte « localhost » (autre origine : window.parent.claude jette SecurityError)
// et exigeait que le geste dise « pas disponible ». Depuis, la page porte `frame-src 'self' blob: data:` (commit fe94b4cd) et REFUSE elle-même un cadre d'une autre
// origine : le cas n'existe plus, et la sonde d'avant tombait (0 ✓ · 4 ✗) sur un cas devenu impossible. Elle garde désormais la vérité d'aujourd'hui :
//   · population d'abord : le cadre de la Comptabilité est là sous 127.0.0.1 et chargé ; la politique de la page nomme bien « frame-src » ;
//   · un cadre rechargé sous « localhost » est REFUSÉ par la politique (violation frame-src relevée), ne charge aucun contenu, et la page ne jette aucune erreur ;
//   · la page principale reste utilisable (le cadre d'origine, remis sous 127.0.0.1, recharge et le FEC part).
// 127.0.0.1 seulement (« localhost » est la même machine : aucun réseau).
const P = require('./recontrole-artefact-pose.js'), { bac, lib: L, v } = P;
(async () => {
  for (const profil of ['mac', 'iphone']) {
    const c = await P.ouvrirHote({ profil, qui: 'marc' }, {});
    await c.p.evaluate(() => { location.hash = 'comptabilite'; }); await L.calme(c.p, 2000);
    const pop = await c.p.evaluate(() => { const i = [...document.querySelectorAll('iframe')].find(x => /prototype-comptabilite\.html/.test(x.getAttribute('src') || x.src)); const m = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      return { cadre: !!i, src: i ? (i.getAttribute('src') || i.src).slice(0, 60) : null, politique: m ? m.content : '', frameSrc: m ? /frame-src\s+'self'/.test(m.content) : false }; });
    v(`${profil} : population (le cadre de la Comptabilité est là ; la page porte frame-src 'self')`, pop.cadre && pop.frameSrc, pop);
    if (!pop.cadre) { await L.fin(c); continue; }
    await c.p.evaluate(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI.slice(0, 40))); });
    await c.p.evaluate(() => { const i = [...document.querySelectorAll('iframe')].find(x => /prototype-comptabilite\.html/.test(x.getAttribute('src') || x.src)); i.src = i.src.replace('127.0.0.1', 'localhost'); });
    await c.hote.waitForTimeout(2500);
    const csp = await c.p.evaluate(() => window.__csp);
    v(`${profil} : le cadre d'une autre origine est refusé par la politique (violation frame-src relevée)`, csp.some(x => /^frame-src/.test(x) && /localhost/.test(x)), csp);
    const charge = c.hote.frames().some(x => /localhost/.test(x.url()) && !/chrome-error/.test(x.url()) && x !== c.hote.mainFrame());
    const f = c.hote.frames().find(x => /localhost/.test(x.url()));
    const contenu = f ? await f.evaluate(() => (document.body && document.body.innerHTML.length) || 0).catch(() => 0) : 0;
    v(`${profil} : le cadre refusé ne charge aucun contenu de la Comptabilité (${contenu} caractères)`, !(charge && contenu > 500), { charge, contenu });
    const autres = c.err.filter(x => !/^CONSOLE Framing 'http:\/\/localhost:\d+\/' violates .*frame-src/.test(x));   // la ligne de la console qui NOMME le refus est le comportement attendu, pas une erreur
    v(`${profil} : aucune erreur JavaScript non rattrapée dans la page (hors la ligne de console qui nomme le refus)`, autres.length === 0, autres.slice(0, 3));
    await c.p.evaluate(() => { const i = [...document.querySelectorAll('iframe')].find(x => /prototype-comptabilite\.html/.test(x.getAttribute('src') || x.src)); i.src = i.src.replace('localhost', '127.0.0.1'); });
    const t0 = Date.now(); let g = null; while (Date.now() - t0 < 25000) { g = c.hote.frames().find(x => /prototype-comptabilite\.html/.test(x.url()) && /127\.0\.0\.1/.test(x.url())); if (g && await g.evaluate(() => typeof fecTelecharger === 'function' && document.body.innerHTML.length > 500).catch(() => false)) break; g = null; await c.hote.waitForTimeout(400); }
    v(`${profil} : remis sous la bonne origine, le cadre recharge et sa fonction du FEC est là`, !!g, g && g.url());
    await L.fin(c);
  }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e && e.stack || e); try { await L.fermer(); } catch (x) {} process.exit(2); });

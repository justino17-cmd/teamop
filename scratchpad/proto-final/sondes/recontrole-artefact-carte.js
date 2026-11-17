// RECONTRÔLE ADVERSE — LA CARTE DANS L'ARTEFACT, BIBLIOTHÈQUES CHARGÉES (17 novembre 2026).
// Règle i du cadre : les scripts ne chargent que de cdnjs / jsdelivr / unpkg…, mais les FEUILLES DE STYLE que de fonts.googleapis.com. Or la carte réelle
// ajoute deux <link rel=stylesheet> chez cdnjs (leaflet.min.css, maplibre-gl.min.css) : dans l'artefact ils sont COUPÉS, alors que les scripts se
// chargent. La sonde « artefact-carte » ne joue PAS ce cas (sans Internet, même les scripts manquent : repli « bibliothèque injoignable »).
// Ici : les scripts cdnjs/unpkg sont servis depuis des copies locales (scratchpad/dep), les feuilles cdnjs et les tuiles sont COUPÉES (comme l'artefact).
// On regarde ce que la carte devient : tient-elle dans son cadre ? les repères sont-ils à leur place ? le repli est-il dit ? une capture est prise (à REGARDER).
const P = require('./recontrole-artefact-pose.js'), { bac, lib: L, v } = P;
const fs = require('fs'), path = require('path');
const DEP = process.env.DEP || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/dep';
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/recontrole-artefact';
const PROFILS = (process.env.PROFILS || 'mac,iphone').split(','), NUIT = !!process.env.NUIT;
const LOCAL = { 'leaflet.min.js': 'leaflet.min.js', 'maplibre-gl.min.js': 'maplibre-gl.min.js', 'leaflet-maplibre-gl.js': 'leaflet-maplibre-gl.js' };
(async () => {
  v('population : les copies locales des bibliothèques existent', Object.values(LOCAL).every(f => fs.existsSync(path.join(DEP, f))), DEP);
  for (const profil of PROFILS) {
    const c = await P.lib.ouvrir({ profil, qui: 'marc', nuit: NUIT, init: P.bac.script({}) });
    const vus = { scripts: [], css: [], tuiles: [] };
    // enregistré APRÈS celle du bac : passe en premier. Scripts permis → copie locale ; feuilles hors fonts.googleapis.com → coupées ; tuiles → coupées
    await c.ctx.route(/^https:\/\/(cdnjs\.cloudflare\.com|unpkg\.com)\//, route => { const u = route.request().url(), t = route.request().resourceType(), f = path.basename(u.split('?')[0]);
      if (t === 'script' && LOCAL[f]) { vus.scripts.push(f); return route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(DEP, LOCAL[f])) }); }
      if (t === 'stylesheet') { vus.css.push(f); return route.abort('blockedbyclient'); }
      return route.fallback(); });
    await c.ctx.route(/tiles\.openfreemap|arcgisonline/, route => { vus.tuiles.push(route.request().url().slice(0, 60)); return route.abort('blockedbyclient'); });
    await c.p.reload({ waitUntil: 'load' }); await c.p.waitForTimeout(1500);
    await c.p.evaluate(() => { try { window.horsLigneDebut = function () {}; } catch (e) {} const e = document.getElementById('hl-ecran'); if (e) e.remove(); const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); });
    await L.aller(c.p, 'planning'); await c.p.evaluate(() => { plVue = 'carte'; rendre(); });
    await L.attendre(c.p, () => crReelEtat === 'ko' || crReelEtat === 'ok', 20000); await L.calme(c.p, 800);
    const z = await c.p.evaluate(() => { const lf = document.getElementById('cr-lf'), r = lf ? lf.getBoundingClientRect() : null, pane = lf && lf.querySelector('.leaflet-map-pane'), cs = pane ? getComputedStyle(pane) : null;
      const cr = document.getElementById('cr-carte'), rc = cr ? cr.getBoundingClientRect() : null;
      return { etat: crReelEtat, note: ((document.querySelector('.cr-note') || {}).textContent || '').trim(), lf: r ? [Math.round(r.width), Math.round(r.height)] : null, carte: rc ? [Math.round(rc.left), Math.round(rc.top), Math.round(rc.width), Math.round(rc.height)] : null,
        paneEnPosition: cs ? cs.position : null, libs: { L: !!window.L, ml: !!window.maplibregl, plug: !!(window.L && L.maplibreGL) }, leafletCSS: lf ? getComputedStyle(lf).position : null, W: innerWidth, scrollW: document.documentElement.scrollWidth }; });
    console.log('  ·', profil, JSON.stringify({ vus, z }).slice(0, 700));
    v(`${profil} carte : population (scripts servis ${vus.scripts.length}, feuilles cdnjs coupées ${vus.css.length}, la vue Carte existe)`, vus.scripts.length >= 1 && !!z.carte, { vus, z });
    v(`${profil} carte : la page ne déborde pas (${z.scrollW} ≤ ${c.largeur})`, z.scrollW <= c.largeur + 1, z);
    v(`${profil} carte : l'écran DIT l'état (réel ou repli), jamais une carte muette cassée`, z.etat === 'ok' || /indisponible|dessin/i.test(z.note), z);
    // la carte réelle (état « ok »), sans sa feuille de style : les volets de Leaflet doivent rester posés (position absolute), sinon tout s'empile hors du cadre
    if (z.etat === 'ok') v(`${profil} carte réelle : les volets de Leaflet sont positionnés malgré la feuille coupée`, z.paneEnPosition === 'absolute', z);
    await c.p.screenshot({ path: path.join(CAP, `carte-${profil}${NUIT ? '-nuit' : ''}.png`) });
    v(`${profil} carte : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });

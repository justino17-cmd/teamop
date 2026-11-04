/* ══ SONDE — L'ÉCRAN SERVICE DE LA TOUR (v2.130, 31 octobre 2026) ══════════════════════════════════════════════════════════════
   Justin : « Service OP GESTION / Service OP MESSAGES ; OP GESTION + OP MESSAGES à la place de Tout ; version publique et bêta plus
   apparentes, bien séparées ». Mac 1440 et iPhone, jour ET nuit, les trois filtres. Mesure : le titre, les bandeaux (bon canal, bonne
   application), le filtre tient sur une ligne sans glisser, la page ne glisse pas de côté, textes des bandeaux ≥ 4,5:1, aucune exception.
   Usage : node scratchpad/sonde-tour-service.js   CAPTURES=<dossier> */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { demarrer, onglet, APAISER, dormir } = require('./sonde-tour-theme.js');
const CAP = process.env.CAPTURES || path.join(os.tmpdir(), 'tour-service');
fs.mkdirSync(CAP, { recursive: true });
const ok = [], ko = [];
const v = (t, c, d) => { (c ? ok : ko).push(t); console.log((c ? '  ✓ ' : '  ✗ ') + t + (d !== undefined && !c ? ' — ' + d : '')); };
(async () => {
  const S = await demarrer();
  console.log('Sonde Service — tour.html ' + S.version);
  try {
    /* Mac et iPhone, plus Windows (souris, 1366 et 1920), Android (doigt, 360 et 412) et iPad (doigt, 820) — Justin, 31 octobre 2026 */
    const PROF = [['mac-1440', 'bureau', 'light', 1440, 1000, 2, false], ['mac-1440', 'bureau', 'dark', 1440, 1000, 2, false],
      ['iphone-390', 'telephone', 'light', 390, 844, 3, true], ['iphone-390', 'telephone', 'dark', 390, 844, 3, true],
      ['windows-1366', 'bureau', 'light', 1366, 768, 1, false], ['windows-1920', 'bureau', 'dark', 1920, 1080, 1, false],
      ['android-360', 'telephone', 'dark', 360, 800, 3, true], ['android-412', 'telephone', 'light', 412, 915, 2.625, true],
      ['ipad-820', 'telephone', 'light', 820, 1180, 2, true]].filter(p => !process.env.PROFILS || process.env.PROFILS.split(',').includes(p[0]));
    for (const [nomP, app0, mode, W, Hh, dpr, tac] of PROF) {
      const app = W >= 760 ? 'bureau' : 'telephone';
      const nom = nomP + '-' + (mode === 'light' ? 'jour' : 'nuit');
      const o = await onglet(S, app0, mode); const { c, ev } = o;
      await c.envoyer('Emulation.setDeviceMetricsOverride', { width: W, height: Hh, deviceScaleFactor: dpr, mobile: tac });
      await c.envoyer('Emulation.setTouchEmulationEnabled', { enabled: tac, maxTouchPoints: 5 });
      await ev(`MYAPPS=['gestion','messages']; SOUS.surveillance='service'; setTab('surveillance'); return 1;`);
      for (const f of ['tout', 'gestion', 'messages']) {
        await ev(`setFiltre('${f}'); render(); return 1;`); await dormir(700); await ev(APAISER); await dormir(300);
        const r = await ev(`
          const L=c=>{ const g=x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)}; return .2126*g(c[0])+.7152*g(c[1])+.0722*g(c[2]); };
          const rgb=s=>{ const m=String(s).match(/rgba?\\(([^)]+)\\)/); return m?m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number):null; };
          const fondPeint=e=>{ let acc=null; for(let x=e;x;x=x.parentElement){ const b=rgb(getComputedStyle(x).backgroundColor); if(!b||b[3]===0) continue; if(!acc) acc=b.slice(0,4); else { const a=acc[3]===undefined?1:acc[3]; acc=[0,1,2].map(i=>acc[i]*a+b[i]*(1-a)).concat([1]); } if(acc[3]===undefined||acc[3]>=.999) return acc; } return acc||[255,255,255]; };
          const h=document.querySelector('#vue h1,#vue h2,.vue-titre, .en-tete h1');
          const titre=(document.querySelector('#vue .ttl-page')||{}).textContent||'';
          const bd=[...document.querySelectorAll('#vue .canal-bd')].filter(e=>e.offsetParent).map(e=>{ const m=e.querySelector('.canal-mot'), t=e.querySelector('.canal-txt'); const ct=[m,t].map(x=>{ const a=rgb(getComputedStyle(x).color), b=fondPeint(x); const l1=L(a),l2=L(b); return +((Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)).toFixed(2); }); const q=e.getBoundingClientRect(); return {mot:m.textContent, txt:t.textContent, ct, h:Math.round(q.height), w:Math.round(q.width)}; });
          const seg=document.querySelector('#vue .filtre-app'); let segInfo=null;
          if(seg){ const q=seg.getBoundingClientRect(); const bs=[...seg.querySelectorAll('button')].map(b=>{ const r=b.getBoundingClientRect(); return {t:b.textContent,h:Math.round(r.height),w:Math.round(r.width),sw:b.scrollWidth,cw:b.clientWidth,top:Math.round(r.top),on:b.getAttribute('aria-pressed')}; }); segInfo={w:Math.round(q.width),right:Math.round(q.right),bs,sw:seg.scrollWidth,cw:seg.clientWidth}; }
          window.scrollTo(99999,window.scrollY); const sx=window.scrollX; window.scrollTo(0,0);
          const inst=document.querySelectorAll('#vue .opma-inst .canal-bd .canal-choix .tt-seg button').length===2?1:0; const cols=[...document.querySelectorAll('#vue .svc-col>.ac-src-t')].map(e=>Math.round(e.getBoundingClientRect().top)); return {inst, cols, titre:titre.trim(), bd, seg:segInfo, sx, vw:document.documentElement.clientWidth, iw:innerWidth};`);
        const tag = nom + ' · ' + f;
        const attendu = { tout: 'Service', gestion: 'Service OP GESTION', messages: 'Service OP MESSAGES' }[f];
        v(tag + ' : titre « ' + attendu + ' »', r.titre.startsWith(attendu) && (f !== 'tout' || !/OP /.test(r.titre)), r.titre);
        const apps = r.bd.map(b => /^(Publier )?OP MESSAGES/.test(b.txt) ? 'OP MESSAGES' : /^OP GESTION/.test(b.txt) ? 'OP GESTION' : '?');
        v(tag + ' : des bandeaux sont là', r.bd.length >= 2, JSON.stringify(r.bd.map(b => b.mot)));
        if (f === 'gestion') v(tag + ' : bandeaux OP GESTION seulement', apps.every(a => a === 'OP GESTION'), apps.join(','));
        if (f === 'messages') v(tag + ' : bandeaux OP MESSAGES seulement', apps.every(a => a === 'OP MESSAGES'), apps.join(','));
        v(tag + ' : chaque application a son PUBLIQUE et sa BÊTA', ['OP GESTION', 'OP MESSAGES'].filter(a => apps.includes(a)).every(a => r.bd.some(b => b.txt.startsWith(a) && /^🌍 VERSION PUBLIQUE$/.test(b.mot)) && r.bd.some(b => b.txt.startsWith(a) && /^🧪 BÊTA$/.test(b.mot))), JSON.stringify(r.bd.map(b => b.mot + '/' + b.txt.split(' · ')[0])));
        v(tag + ' : textes des bandeaux ≥ 4,5:1', r.bd.length>0 && r.bd.every(b => b.ct.every(x => x >= 4.5)), JSON.stringify(r.bd.map(b => b.ct)));
        if (f !== 'gestion') v(tag + ' : la carte d’état d’OP MESSAGES dit son instance (bandeau + choix)', r.inst === 1, r.inst);
        v(tag + ' : les deux colonnes partent à la même hauteur', f !== 'tout' || r.cols.length < 2 || r.cols[0] !== r.cols[1] && Math.abs(r.cols[0] - r.cols[1]) > 300 || r.cols.length === 2 && Math.abs(r.cols[0] - r.cols[1]) <= 2, JSON.stringify(r.cols));
        /* ⛔ innerWidth GRANDIT avec une page trop large (téléphone : 457 pour 390) — on compare à la largeur de l'appareil (règle du dépôt) */
        v(tag + ' : la page ne glisse pas de côté (innerWidth = largeur de l’appareil)', r.sx === 0 && r.iw === r.vw, JSON.stringify([r.sx, r.iw, r.vw]));
        if (r.seg) {
          const tops = new Set(r.seg.bs.map(b => b.top));
          v(tag + ' : le filtre tient sur une ligne, rien de coupé', tops.size === 1 && r.seg.bs.every(b => b.sw <= b.cw + 1) && r.seg.right <= r.vw && r.seg.sw <= r.seg.cw + 1, JSON.stringify(r.seg));
          v(tag + ' : le bon choix est allumé', r.seg.bs.filter(b => b.on === 'true').map(b => b.t).join() === { tout: 'OP GESTION + OP MESSAGES', gestion: 'OP GESTION', messages: 'OP MESSAGES' }[f], JSON.stringify(r.seg.bs.map(b => b.t + ':' + b.on)));
          if (tac) v(tag + ' : choix du filtre ≥ 44 px au doigt', r.seg.bs.every(b => b.h >= 44), JSON.stringify(r.seg.bs.map(b => b.h)));
        } else v(tag + ' : le filtre est là', false);
        const shot = await c.envoyer('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: W, height: await ev('return Math.min(document.documentElement.scrollHeight,4000)'), scale: app === 'bureau' ? 1 : 1 } });
        fs.writeFileSync(path.join(CAP, tag.replace(/[ ·]+/g, '-') + '.png'), Buffer.from(shot.data, 'base64'));
      }
      v(nom + ' : aucune exception', o.exceptions.length === 0, o.exceptions.slice(0, 3).join(' | '));
    }
  } finally { S.fermer(); }
  console.log('\n' + ok.length + ' ✓ ' + ko.length + ' ✗');
  process.exit(ko.length ? 1 : 0);
})().catch(e => { console.log('  ✗ ' + e.stack); process.exit(1); });

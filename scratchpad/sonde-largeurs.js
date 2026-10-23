/* ══ SONDE — CE QUE COÛTE UNE TRANSITION DE LARGEUR (audit apple-design, point 36) ═════════════════════════════════════════════
   L'audit a relevé huit transitions qui animent une largeur ou un rembourrage. Avant de les « corriger », on MESURE ce qu'elles
   coûtent — et d'abord si elles tournent :
     · chaque cas est joué dans la vraie page, isolé : on donne au seul élément sa nouvelle géométrie (ce que fait son code), sans
       rien redessiner d'autre, et on lit le temps de mise en page (Performance.getMetrics : LayoutCount, LayoutDuration) sur
       les 600 ms qui suivent ;
     · deux fois : la règle telle qu'elle est, puis la largeur RETIRÉE de la transition (transition-property posée en ligne,
       !important) — la différence est ce que coûte d'animer la largeur ; trois passages, la médiane ;
     · une passe à part (qui force la mise en page, donc hors chronométrage) prouve que la largeur change bien d'image en image —
       un coût nul sur une transition qui ne tourne pas ne prouverait rien.
   Cas : le curseur des segmentés (puces de Clients, période du tableau de bord), la pastille du menu (Mac), la bulle de la barre
   d'onglets (le nombre d'onglets change), le menu qu'on replie (Mac, toute la page se remet en page), la barre de la mise à
   jour (largeur, avant ; translate, maintenant), et la barre des statistiques (née à sa largeur : aucune transition ne tourne).
   CPU=1 conseillé (les chronos du chemin GPU émulé ne disent rien d'un appareil). ⛔ Bêta uniquement, copie locale en 127.0.0.1. */
const path = require('path');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const { PROFILS, poserProfil } = require(path.join(__dirname, 'profils.js'));
(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  await S.ev(`window.horsLigneDebut=function(){}; const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1200); await S.ev(`try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(1500);
  await S.c.envoyer('Performance.enable', { timeDomain: 'timeTicks' });
  let ok = 0, ko = 0; const c = (t, v, d) => { if (v) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
  const metr = async () => { const r = await S.c.envoyer('Performance.getMetrics'); const m = {}; r.metrics.forEach(x => { m[x.name] = x.value; }); return m; };
  const med = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
  /* un cas : prep (amène l'écran, rend 1 si l'élément est là), el (sélecteur), aller / retour (le JS qui pose la nouvelle géométrie,
     et celui qui remet l'ancienne SANS transition), prop (la propriété suivie image par image), sans (la liste de transition sans largeur) */
  const CAS = [
    { nom: 'curseur des segmentés (puces de Clients)', prof: 'tel', prep: `go('clients'); return 1;`, el: '.filters.seg-on .seg-cur',
      aller: `const g=E.parentNode, ch=[...g.children].filter(x=>!x.classList.contains('seg-cur')); const a=ch.find(x=>x.offsetWidth!==E.offsetWidth)||ch[ch.length-1]; E.style.width=a.offsetWidth+'px'; E.style.transform='translateX('+a.offsetLeft+'px)';`,
      prop: 'width', sans: 'transform, opacity' },
    { nom: 'curseur de la période (tableau de bord)', prof: 'tel', prep: `go('dashboard'); return 1;`, el: '.tdb-seg .seg-cur',
      aller: `const g=E.parentNode, ch=[...g.children].filter(x=>!x.classList.contains('seg-cur')); const a=ch.find(x=>Math.abs(x.offsetWidth-E.offsetWidth)>4)||ch[ch.length-1]; E.style.width=a.offsetWidth+'px'; E.style.transform='translateX('+a.offsetLeft+'px)';`,
      prop: 'width', sans: 'transform, opacity' },
    { nom: 'pastille du menu (Mac)', prof: 'mac14', prep: `go('clients'); return 1;`, el: '#nav .nav-glisse',
      aller: `const it=[...document.querySelectorAll('#nav .nav-item')].filter(x=>x.offsetHeight&&!x.classList.contains('active')); const a=it.find(x=>x.offsetWidth!==E.offsetWidth)||it.find(x=>x.offsetHeight!==E.offsetHeight)||it[it.length-1]; window.__navDiff={w:a.offsetWidth, h:a.offsetHeight, ew:E.offsetWidth, eh:E.offsetHeight, n:it.length, tailles:[...new Set(it.map(x=>x.offsetWidth+'x'+x.offsetHeight))]}; E.style.transform='translate('+a.offsetLeft+'px,'+a.offsetTop+'px)'; E.style.width=a.offsetWidth+'px'; E.style.height=a.offsetHeight+'px';`,
      prop: 'width', sans: 'transform, opacity' },
    { nom: 'bulle de la barre d’onglets (un onglet de plus)', prof: 'tel', prep: `go('dashboard'); return 1;`, el: '#tabbar .tab-cur',
      aller: `const t=document.getElementById('tabbar'); t.style.setProperty('--tab-n', String((+getComputedStyle(t).getPropertyValue('--tab-n')||4)+1));`,
      retour: `document.getElementById('tabbar').style.removeProperty('--tab-n');`,
      prop: 'width', sans: 'translate, opacity, scale, box-shadow' },
    { nom: 'le menu qu’on replie (Mac — toute la page se remet en page)', prof: 'mac14', prep: `if(document.body.classList.contains('rf-repliee')) document.querySelector('.rf-plier').click(); go('clients'); return 1;`, el: '.sidebar',
      aller: `if(!document.body.classList.contains('rf-repliee')) document.querySelector('.rf-plier').click();`, retour: `if(document.body.classList.contains('rf-repliee')) document.querySelector('.rf-plier').click();`, prop: 'width', sans: 'opacity' },
  ];
  /* le menu qu'on replie se mesure aussi sur les écrans les plus lourds (VUES_MENU=planning,interventions…) */
  for (const v of (process.env.VUES_MENU || '').split(',').filter(Boolean)) { const m = CAS.find(k => k.el === '.sidebar');
    CAS.push({ ...m, nom: m.nom.replace('Mac —', 'Mac, ' + v + ' —'), prep: m.prep.replace("go('clients')", "go('" + v + "')") }); }
  const SEUL = process.env.SEUL ? new RegExp(process.env.SEUL) : null;
  for (const k of CAS.filter(k => !SEUL || SEUL.test(k.nom))) {
    const P = PROFILS[k.prof]; await poserProfil(S, P);
    await S.ev(`setPlatForce('${P.plat}'); ${k.prep}`); await dormir(1500);
    console.log('\n' + k.nom + ' (' + (k.prof === 'tel' ? 'téléphone' : 'Mac') + ')');
    const la = await S.ev(`const E=document.querySelector('${k.el}'); if(!E) return null; window.__E=E; window.__E0={t:E.style.transform, w:E.style.width, h:E.style.height}; return {w:E.offsetWidth, h:E.offsetHeight, tr:getComputedStyle(E).transitionProperty};`);
    c('(population) l’élément est là (' + (la ? la.w + '×' + la.h + ', transition : ' + la.tr : 'absent') + ')', !!la);
    if (!la) continue;
    const remettre = async () => { await S.ev(`const E=__E; E.style.setProperty('transition','none','important'); ${k.retour || `E.style.transform=__E0.t; E.style.width=__E0.w; E.style.height=__E0.h;`} void E.offsetWidth; void document.body.offsetWidth; E.style.removeProperty('transition'); return 1;`); await dormir(400); };
    /* la preuve que la propriété change d'image en image (passe à part : elle force la mise en page) */
    const pr = await S.ev(`const E=__E; const vals=[]; let n=0; await new Promise(r=>{ const f=()=>{ vals.push(Math.round(parseFloat(getComputedStyle(E).${k.prop})*10)/10); if(++n<30) requestAnimationFrame(f); else r(); }; requestAnimationFrame(f); ${k.aller} });
      return {differents:new Set(vals).size, de:vals[0], a:vals[vals.length-1]};`);
    c('la ' + k.prop + ' change d’image en image (' + pr.differents + ' valeurs, ' + pr.de + ' → ' + pr.a + ')', pr.differents > 3, pr);
    await remettre();
    const res = {};
    for (const mode of ['telle', 'sans']) {
      const L = [], N = [];
      for (let i = 0; i < 3; i++) {
        await S.ev(`const E=__E; ${mode === 'sans' ? `E.style.setProperty('transition-property','${k.sans}','important');` : `E.style.removeProperty('transition-property');`} return 1;`); await dormir(120);
        const m0 = await metr(); await S.ev(`const E=__E; ${k.aller} return 1;`); await dormir(650); const m1 = await metr();
        L.push((m1.LayoutDuration - m0.LayoutDuration) * 1000); N.push(m1.LayoutCount - m0.LayoutCount);
        await remettre();
      }
      res[mode] = { ms: med(L), n: med(N) };
    }
    await S.ev(`__E.style.removeProperty('transition-property'); return 1;`);
    const surcout = res.telle.ms - res.sans.ms, parImage = surcout / Math.max(1, res.telle.n - res.sans.n);
    console.log('  · mise en page sur 650 ms — telle : ' + res.telle.n + ' passes, ' + res.telle.ms.toFixed(2) + ' ms ; largeur retirée : ' + res.sans.n + ' passes, ' + res.sans.ms.toFixed(2) + ' ms → ' + surcout.toFixed(2) + ' ms de plus (' + parImage.toFixed(3) + ' ms par image)');
    k.res = { ...res, surcout, parImage };
  }
  /* la barre de la mise à jour : la même barre, par largeur (avant) et par translate (maintenant) */
  console.log('\nla barre de la mise à jour (téléphone)');
  await poserProfil(S, PROFILS.tel);
  const bar = {};
  for (const [mode, css, de, a] of [['largeur', 'width:30%;transition:width .25s ease', `B.style.width='30%'`, `B.style.width='60%'`], ['translate', 'width:100%;translate:-70% 0;transition:translate .25s ease', `B.style.translate='-70% 0'`, `B.style.translate='-40% 0'`]]) {
    await S.ev(`let z=document.getElementById('sonde-maj'); if(z) z.remove(); z=document.createElement('div'); z.id='sonde-maj'; z.style.cssText='position:fixed;left:28px;right:28px;top:300px;z-index:99999';
      z.innerHTML='<div style="height:10px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden"><div id="sonde-maj-b" style="height:100%;background:var(--acc,#34d399);border-radius:99px;${css}"></div></div>'; document.body.appendChild(z); window.B=document.getElementById('sonde-maj-b'); return 1;`); await dormir(200);
    const pv = await S.ev(`const vals=[]; let n=0; await new Promise(r=>{ const f=()=>{ const t=B.parentNode.getBoundingClientRect(), b=B.getBoundingClientRect(); vals.push(Math.round((Math.min(b.right,t.right)-t.left)*10)/10); if(++n<24) requestAnimationFrame(f); else r(); }; requestAnimationFrame(f); ${a}; });
      B.style.transition='none'; ${de}; void B.offsetWidth; B.style.transition=''; await new Promise(r=>setTimeout(r,200)); return new Set(vals).size;`);
    c('… par ' + mode + ', la barre avance d’image en image (' + pv + ' positions)', pv > 3, pv);
    const L = [], N = [];
    for (let i = 0; i < 3; i++) { const m0 = await metr(); await S.ev(`${a}; return 1;`); await dormir(400); const m1 = await metr(); L.push((m1.LayoutDuration - m0.LayoutDuration) * 1000); N.push(m1.LayoutCount - m0.LayoutCount);
      await S.ev(`B.style.transition='none'; ${de}; void B.offsetWidth; B.style.transition=''; return 1;`); await dormir(200); }
    bar[mode] = { ms: med(L), n: med(N) };
    const vu = await S.ev(`${a}; await new Promise(r=>setTimeout(r,400)); const t=B.parentNode.getBoundingClientRect(), b=B.getBoundingClientRect(); return Math.round((Math.min(b.right,t.right)-t.left)/t.width*1000)/10;`);
    console.log('  · ' + mode + ' : ' + bar[mode].n + ' passes de mise en page, ' + bar[mode].ms.toFixed(2) + ' ms ; partie peinte visible : ' + vu + ' %');
    c('… par ' + mode + ', la barre montre 60 % de la piste', Math.abs(vu - 60) < 1, vu);
  }
  c('par translate, la barre ne remet plus la page en page à chaque image', bar.translate.n < bar.largeur.n, bar);
  await S.ev(`document.getElementById('sonde-maj').remove(); return 1;`);
  /* les deux qui ne tournaient pas, retirées : rien ne change à l'écran (captures jour et nuit), et le calcul le dit */
  const CAP = process.env.CAPTURES; if (CAP) require('fs').mkdirSync(CAP, { recursive: true });
  console.log('\nles deux transitions retirées (statistiques, icônes d’onglet)');
  await poserProfil(S, PROFILS.tel); await S.ev(`setPlatForce('${PROFILS.tel.plat}'); return 1;`);
  for (const theme of ['light', 'dark']) {
    await S.ev(`(typeof setThemePrefNu==='function'?setThemePrefNu:setThemePref)('${theme}'); go('statistiques'); return 1;`); await dormir(1500);
    const r = await S.ev(`const b=[...document.querySelectorAll('#content .bar-fill')], i=document.querySelector('#tabbar .tab-ic');
      if(b[0]) b[0].scrollIntoView({block:'center'}); await new Promise(r=>setTimeout(r,300));
      return {barres:b.length, largeurs:b.slice(0,4).map(x=>Math.round(x.getBoundingClientRect().width)), tb:b[0]?getComputedStyle(b[0]).transitionDuration:null, ti:i?getComputedStyle(i).transitionProperty:null};`);
    c((theme === 'light' ? 'jour' : 'nuit') + ' : ' + r.barres + ' barres de statistiques peintes (' + r.largeurs.join(', ') + ' px), sans transition (durée ' + r.tb + ')', r.barres > 0 && r.largeurs.every(w => w > 0) && /^0s(, 0s)*$/.test(r.tb || ''), r);
    c('… l’icône d’onglet ne transitionne plus son rembourrage (' + r.ti + ')', !!r.ti && !/padding/.test(r.ti) && /transform/.test(r.ti), r.ti);
    if (CAP) { const im = await S.c.envoyer('Page.captureScreenshot', { format: 'png' }); require('fs').writeFileSync(path.join(CAP, 'stats-' + theme + '.png'), Buffer.from(im.data, 'base64')); }
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  console.log('RÉSUMÉ ' + JSON.stringify(CAS.map(k => ({ nom: k.nom, res: k.res })).concat([{ nom: 'barre de mise à jour', res: bar }])));
  await S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

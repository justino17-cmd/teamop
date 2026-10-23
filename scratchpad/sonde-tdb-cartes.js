/* ══ SONDE — RÉORGANISER LE TABLEAU DE BORD : LA CARTE SE SOULÈVE, LES AUTRES LUI FONT PLACE, ELLE SE POSE (audit apple-design,
   point 35) ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   Dans la vraie page, sur les cartes du tableau de bord :
     · au doigt (iPhone, Input.dispatchTouchEvent) : appui long sur la 1re carte, glissé par pas de 20 px (ce Chromium ne
       transmet rien sous ~15 px) jusqu'à la 3e, posé à côté de son centre ;
     · à la souris (Mac) : la même chose, cliquer-glisser.
   Ce qu'on mesure, au pixel près (centres des boîtes peintes, échelle comprise) :
     · la carte tenue est SOULEVÉE pour de vrai (≈ 1,04 × sa largeur) — l'enfoncement « :active » ne la mange pas ;
     · pendant qu'on la tient au-dessus de la 3e case, les cartes 2 et 3 sont déjà dans la case qu'elles auront ;
     · au lâcher, image par image (requestAnimationFrame) : entre la dernière image avant que le tableau de bord se redessine et
       la première après, AUCUNE carte ne bouge (le saut d'avant) ; la carte tenue finit dans sa case ; l'ordre est enregistré ;
     · un geste perdu (touchcancel) ramène tout, sans rien enregistrer.
   CAPTURES=dossier : la carte tenue au-dessus de la 3e case, jour et nuit. SOURCE=fichier : la contre-épreuve.
   ⛔ Bêta uniquement, copie locale en 127.0.0.1. */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const { PROFILS, poserProfil } = require(path.join(__dirname, 'profils.js'));
const CAP = process.env.CAPTURES; if (CAP) fs.mkdirSync(CAP, { recursive: true });
(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  await S.ev(`window.horsLigneDebut=function(){}; const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1200); await S.ev(`try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(1500);
  let ok = 0, ko = 0; const c = (t, v, d) => { if (v) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
  const images = () => S.ev(`return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(1))));`);
  /* les cartes, dans l'ordre affiché : clé, centre, largeur */
  const releve = () => S.ev(`return [...document.querySelectorAll('.kpis .kpi[data-dk]')].map(e=>{ const r=e.getBoundingClientRect(); return {k:e.dataset.dk, x:r.left+r.width/2, y:r.top+r.height/2, w:r.width}; });`);
  const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const toucher = (type, x, y) => S.c.envoyer('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y, id: 1 }] });
  const souris = (type, x, y) => S.c.envoyer('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
  /* le geste jusqu'au-dessus de la cible, par pas de 20 px, deux images après chacun */
  const glisser = async (doigt, de, vers) => {
    if (doigt) { await toucher('touchStart', de.x, de.y); await dormir(650); }
    else { await S.c.envoyer('Input.dispatchMouseEvent', { type: 'mouseMoved', x: de.x, y: de.y }); await souris('mousePressed', de.x, de.y); await dormir(80); }
    const n = Math.max(2, Math.ceil(d2(de, vers) / 20));
    for (let i = 1; i <= n; i++) { const x = Math.round(de.x + (vers.x - de.x) * i / n), y = Math.round(de.y + (vers.y - de.y) * i / n);
      if (doigt) await toucher('touchMove', x, y); else await souris('mouseMoved', x, y); await images(); }
    await dormir(500); };
  for (const [prof, theme] of [['tel', 'light'], ['tel', 'dark'], ['mac14', 'dark']]) {
    const P = PROFILS[prof], doigt = prof === 'tel'; await poserProfil(S, P);
    await S.ev(`setPlatForce('${P.plat}'); (typeof setThemePrefNu==='function'?setThemePrefNu:setThemePref)('${theme}'); go('dashboard'); return 1;`); await dormir(1600);
    console.log('\n' + (doigt ? 'téléphone, au doigt' : 'bureau, à la souris') + ' — ' + (theme === 'light' ? 'jour' : 'nuit'));
    const ORDRE = await S.ev(`window.__ordre0=JSON.stringify(dashLayout()); document.querySelector('.kpis').scrollIntoView({block:'center'}); for(let k=0;k<60&&window._vtEnCours;k++) await new Promise(r=>setTimeout(r,50)); await new Promise(r=>setTimeout(r,300)); return JSON.parse(__ordre0);`);
    const A = await releve();
    c('(population) au moins trois cartes (' + (A.length >= 3 && A[2].y > A[0].y + 20 ? 'en grille : la 3e sous la 1re' : 'en rangée') + ')', A.length >= 3, A.map(x => [x.k, Math.round(x.x), Math.round(x.y)]));
    if (A.length < 3) continue;
    const vers = { x: A[2].x + 18, y: A[2].y + 12 };   // posée À CÔTÉ du centre : la carte doit quand même finir dans sa case
    await glisser(doigt, A[0], vers);
    const M = await releve(), tenue = M.find(x => x.k === A[0].k);
    const cs = await S.ev(`const e=document.querySelector('.kpis .kpi[data-dk="${A[0].k}"]'), s=getComputedStyle(e); return {scale:s.scale, transform:s.transform};`);
    c('la carte tenue est soulevée : ' + (tenue.w / A[0].w).toFixed(3) + ' × sa largeur (scale ' + cs.scale + ', transform ' + cs.transform + ')', Math.abs(tenue.w / A[0].w - 1.04) < 0.006, [tenue.w, A[0].w, cs]);
    c('… et elle est sous le doigt (' + Math.round(d2(tenue, vers)) + ' px)', d2(tenue, { x: vers.x, y: vers.y }) < 3, [tenue, vers]);
    const e1 = d2(M.find(x => x.k === A[1].k), A[0]), e2 = d2(M.find(x => x.k === A[2].k), A[1]);
    if (process.env.DIAG) console.log('    départ', JSON.stringify(A.map(x => [x.k, +x.x.toFixed(1), +x.y.toFixed(1), +x.w.toFixed(1)])), '\n    tenue ', JSON.stringify(M.map(x => [x.k, +x.x.toFixed(1), +x.y.toFixed(1), +x.w.toFixed(1)])),
      '\n    styles', JSON.stringify(await S.ev(`return [...document.querySelectorAll('.kpis .kpi[data-dk]')].map(e=>{ const s=getComputedStyle(e); return [e.dataset.dk, e.style.translate, s.translate, s.transform, s.scale, e.matches(':hover'), e.matches(':active')]; });`)));
    c('⛔ pendant qu’on la tient : la 2e carte est déjà dans la 1re case (' + e1.toFixed(1) + ' px), la 3e dans la 2e (' + e2.toFixed(1) + ' px)', e1 < 2 && e2 < 2, { e1, e2 });
    c('… et les autres n’ont pas bougé', M.slice(3).every(x => d2(x, A.find(y => y.k === x.k)) < 2));
    if (CAP && doigt) { const im = await S.c.envoyer('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(CAP, 'tenue-' + theme + '.png'), Buffer.from(im.data, 'base64')); await dormir(300); }
    /* le lâcher, image par image */
    await S.ev(`window.__fr=[]; window.__t0=performance.now(); window.__sc0={bar:!!document.querySelector('#content .multi-bar'), avant:[...document.getElementById('content').children].slice(0,3).map(e=>e.className+':'+Math.round(e.getBoundingClientRect().height)), y:scrollY, k:document.querySelector('.kpis').getBoundingClientRect().top, c:document.getElementById('content').getBoundingClientRect().top, h:document.documentElement.scrollHeight}; if(!views.__dashO){ views.__dashO=views.dashboard; views.dashboard=function(){ window.__tDash=performance.now()-__t0; return views.__dashO.apply(this,arguments); }; }
      let n=0; const f=(t)=>{ const m={t:Math.round(performance.now()-__t0)}; document.querySelectorAll('.kpis .kpi[data-dk]').forEach(e=>{ const r=e.getBoundingClientRect(); m[e.dataset.dk]={x:r.left+r.width/2,y:r.top+r.height/2,el:e,tr:e.style.translate,ct:getComputedStyle(e).translate}; }); __fr.push(m); if(++n<90) requestAnimationFrame(f); }; requestAnimationFrame(f); return 1;`);
    if (doigt) await toucher('touchEnd'); else await souris('mouseReleased', vers.x, vers.y);
    await dormir(1700);
    /* le moment de la pose : la carte est remplacée (l'écran redessiné, comme avant) OU elle perd le décalage posé par le geste
       (la carte est rangée dans la grille, comme maintenant) — on compare l'image d'avant et l'image d'après */
    const R = await S.ev(`const F=window.__fr, k='${A[0].k}'; let i=F.findIndex((m,j)=>j>0&&F[j-1][k]&&m[k]&&(m[k].el!==F[j-1][k].el||(F[j-1][k].tr&&!m[k].tr)));
      if(i<0) return {redessin:false, images:F.length};
      let saut=0, qui=''; for(const d in F[i]) if(d!=='t'&&F[i-1][d]){ const s=Math.hypot(F[i][d].x-F[i-1][d].x,F[i][d].y-F[i-1][d].y); if(s>saut){ saut=s; qui=d; } }
      const grille=[...document.querySelectorAll('.kpis .kpi[data-dk]')].map(e=>e.dataset.dk);
      return {redessin:true, image:i, images:F.length, saut, qui, ordre:dashLayout(), grille, memes:Object.keys(F[0]).filter(d=>d!=='t').every(d=>F[F.length-1][d]&&F[F.length-1][d].el===F[0][d].el),
        bar:[__sc0.bar, !!document.querySelector('#content .multi-bar')], y:[__sc0.y, scrollY]};`);
    if (process.env.DIAG) console.log('    images', JSON.stringify(await S.ev(`const k='${A[0].k}'; return {sc0:__sc0, sc1:{bar:!!document.querySelector('#content .multi-bar'), avant:[...document.getElementById('content').children].slice(0,3).map(e=>e.className+':'+Math.round(e.getBoundingClientRect().height)), y:scrollY, k:document.querySelector('.kpis').getBoundingClientRect().top, c:document.getElementById('content').getBoundingClientRect().top, h:document.documentElement.scrollHeight}, tDash:window.__tDash, f:__fr.slice(0,R0).map(m=>[m.t, m[k]&&+m[k].x.toFixed(1), m[k]&&+m[k].y.toFixed(1), m[k]&&m[k].tr, m[k]&&m[k].ct])};`.replace('R0', String((R.image || 8) + 2)))));
    c('(population) la pose a eu lieu pendant l’enregistrement (image ' + R.image + ' sur ' + R.images + ')', R.redessin && R.image > 2, R);
    c('⛔ à la pose, aucune carte ne saute : ' + (R.saut || 0).toFixed(1) + ' px au plus (' + R.qui + ')', R.redessin && R.saut < 2, R);
    c('… l’écran n’est pas redessiné (les mêmes cartes), la barre « Reprendre » et le défilement restent ce qu’ils étaient', R.memes && R.bar[0] === R.bar[1] && Math.abs(R.y[0] - R.y[1]) < 1, { memes: R.memes, bar: R.bar, y: R.y });
    const F = await releve(), L = R.ordre || [];
    const o = ORDRE.filter(d => d !== A[0].k); o.splice(o.indexOf(A[2].k) + 1, 0, A[0].k);
    c('l’ordre est enregistré : la 1re carte passe après la 3e', JSON.stringify(L) === JSON.stringify(o), { avant: ORDRE, apres: L });
    c('… et elle est dans la 3e case (' + d2(F.find(x => x.k === A[0].k), A[2]).toFixed(1) + ' px)', d2(F.find(x => x.k === A[0].k), A[2]) < 2);
    c('… la grille est dans l’ordre enregistré', JSON.stringify(R.grille) === JSON.stringify(L.filter(d => R.grille.includes(d))), { grille: R.grille, ordre: L });
    /* redessiné pour de vrai, l'écran rend la même chose : rien ne bouge */
    await S.ev(`go('dashboard'); return 1;`); await dormir(600);
    const D = await releve(); const ecD = Math.max(...F.map(x => { const y = D.find(z => z.k === x.k); return y ? d2(x, y) : 99; }));
    /* go(current) efface la barre « Reprendre » quand aucune fenêtre n'est ouverte (multiCapturer écrit « il n'y a plus rien ») : avec
       la barre, tout remonte de sa hauteur — c'est le comportement du multitâche, pas celui de la pose ; on ne compare alors pas */
    if (R.bar && R.bar[0]) console.log('  · un vrai redessin (go) n’est pas comparé : la barre « Reprendre » était là, et go l’efface (multitâche, hors de ce point)');
    else c('… et un vrai redessin (go) rend les cartes aux mêmes places (' + ecD.toFixed(1) + ' px au plus)', ecD < 2, ecD);
    /* le geste perdu : remettre l'ordre, recommencer, et perdre le doigt */
    await S.ev(`const l=dashLayout(); l.length=0; JSON.parse(__ordre0).forEach(x=>l.push(x)); save(); go('dashboard'); return 1;`); await dormir(600);
    if (doigt) {
      const B = await releve();
      await glisser(true, B[0], { x: B[2].x, y: B[2].y });
      await toucher('touchCancel'); await dormir(900);
      const G = await releve(), Lg = await S.ev(`return dashLayout();`);
      const ecart = Math.max(...B.map(x => d2(x, G.find(y => y.k === x.k))));
      c('geste perdu (touchcancel) : tout revient à sa case (' + ecart.toFixed(1) + ' px au plus), rien n’est enregistré', ecart < 2 && JSON.stringify(Lg) === JSON.stringify(ORDRE), { ecart, Lg });
      const st = await S.ev(`return [...document.querySelectorAll('.kpis .kpi[data-dk]')].filter(e=>e.style.translate||e.style.scale||e.style.transform||e.style.zIndex).length;`);
      c('… et aucune carte ne garde de style posé par le geste', st === 0, st);
    }
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  await S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

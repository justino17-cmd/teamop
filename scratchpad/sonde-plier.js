/* ══ SONDE — REPLIER LE MENU, AU BUREAU, GLISSE AU LIEU DE SAUTER (audit apple-design, point 23) ════════════════════════════
   Dans la vraie page (Mac 14 pouces, 1280 × 800), sur le Planning (l'écran le plus lourd à recaler), on touche le vrai
   bouton « Replier le menu » et on relève, image par image (requestAnimationFrame) : la largeur de la barre, son opacité, la
   visibilité d'une rubrique du menu, la largeur de la zone de contenu ; puis on déplie.
     · repliée : la largeur passe par des valeurs INTERMÉDIAIRES (au moins 4 images entre la largeur pleine et 0) ;
     · le contenu de la barre reste visible pendant le fondu, et seulement ensuite devient invisible ;
     · dépliée : même chose dans l'autre sens, le contenu revient dès le départ ;
     · la plus longue image pendant le glissement (on la DIT : la largeur se recalcule à chaque image).
   SOURCE=fichier : la contre-épreuve sur la page d'avant (la barre saute en une image). CAPTURES=dossier : mi-course —
   ⚠️ une capture prise pendant le glissement BLOQUE la production d'images (~1,8 s mesurée) : les relevés de temps d'une
   passe avec captures ne valent rien, on les prend sur une passe sans.
   ⛔ Bêta uniquement, copie locale en 127.0.0.1. */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const { PROFILS, poserProfil } = require(path.join(__dirname, 'profils.js'));
const CAP = process.env.CAPTURES; if (CAP) fs.mkdirSync(CAP, { recursive: true });
(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  await S.ev(`window.horsLigneDebut=function(){}; const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    try{ localStorage.removeItem('elan_barre_repliee'); }catch(e){}
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1200); await S.ev(`try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(1500);
  const P = PROFILS.mac14; await poserProfil(S, P); await S.ev(`setPlatForce('${P.plat}'); go('planning'); return 1;`); await dormir(2000);
  let ok = 0, ko = 0; const c = (t, v, d) => { if (v) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
  /* on touche le VRAI bouton (un clic de souris au point), puis on relève chaque image pendant 700 ms */
  const geste = async (nom) => {
    const b = await S.ev(`const x=document.querySelector('.rf-plier'); if(!x||!x.offsetWidth) return null; const r=x.getBoundingClientRect(); return {x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2)};`);
    if (!b) return null;
    await S.ev(`window.__rel=[]; const sb=document.querySelector('.sidebar'), it=sb.querySelector('.nav-item'), mn=document.querySelector('.main')||document.getElementById('content');
      let t0=null; const pas=(t)=>{ if(t0===null) t0=t; const r=sb.getBoundingClientRect(); __rel.push({t:Math.round(t-t0), w:+r.width.toFixed(1), o:+(+getComputedStyle(sb).opacity).toFixed(2), vis:getComputedStyle(it).visibility, main:Math.round(mn.getBoundingClientRect().width)});
        if(t-t0<700) requestAnimationFrame(pas); }; requestAnimationFrame(pas); return 1;`);
    await S.c.envoyer('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1 });
    await S.c.envoyer('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 });
    if (CAP) { await dormir(110); const im = await S.c.envoyer('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(CAP, 'plier-' + nom + '-mi-course.png'), Buffer.from(im.data, 'base64')); }
    await dormir(1100);
    return S.ev(`return __rel;`);
  };
  const w0 = await S.ev(`return document.querySelector('.sidebar').getBoundingClientRect().width;`);
  c('(population) la barre est dépliée au départ, et le bouton « Replier le menu » est là', w0 > 150 && !!(await S.ev(`return !!document.querySelector('.rf-plier')&&document.querySelector('.rf-plier').offsetWidth>0;`)), w0);

  console.log('\n1. replier');
  const R = await geste('replier');
  c('(population) plus de 15 images relevées', !!R && R.length > 15, R && R.length);
  const inter = R.filter(x => x.w > 2 && x.w < w0 - 2);
  c('la largeur passe par des valeurs intermédiaires (au moins 4 images entre ' + Math.round(w0) + ' px et 0)', inter.length >= 4, R.map(x => x.w).slice(0, 24));
  c('elle finit à 0 (reste son filet de 1 px, transparent), opacité 0', R[R.length - 1].w <= 1.01 && R[R.length - 1].o === 0, R[R.length - 1]);
  const pendant = R.filter(x => x.o > 0.15 && x.o < 0.95);
  c('pendant le fondu, son contenu est encore visible (il s’efface avec elle)', pendant.length > 0 && pendant.every(x => x.vis === 'visible'), pendant.slice(0, 3));
  c('… puis il devient invisible (clavier, lecteur d’écran)', R[R.length - 1].vis === 'hidden', R[R.length - 1].vis);
  c('la zone de contenu s’élargit progressivement, sans saut', R.filter(x => x.main > R[0].main + 4 && x.main < R[R.length - 1].main - 4).length >= 3, R.map(x => x.main).slice(0, 24));
  const im1 = R.slice(1).map((x, i) => x.t - R[i].t), pire1 = Math.max(...im1.slice(0, 20));
  console.log('    (la plus longue image pendant le glissement : ' + pire1 + ' ms ; dans ce conteneur, sans carte graphique : à lire comme un ordre de grandeur)');

  console.log('\n2. déplier');
  const D = await geste('deplier');
  const interD = D.filter(x => x.w > 2 && x.w < w0 - 2);
  c('la largeur repasse par des valeurs intermédiaires (au moins 4 images)', interD.length >= 4, D.map(x => x.w).slice(0, 24));
  c('elle retrouve sa largeur', Math.abs(D[D.length - 1].w - w0) < 1.5, [D[D.length - 1].w, w0]);
  c('son contenu est visible dès le départ du dépli', D.slice(1).every(x => x.vis === 'visible'), D.slice(0, 3));

  console.log('\n3. réduire les animations');
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const Z = await geste('sobre');
  c('repliée d’un coup, sans images intermédiaires', Z.filter(x => x.w > 2 && x.w < w0 - 2).length <= 1, Z.map(x => x.w).slice(0, 8));
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [] });
  await geste('fin');

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  await S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

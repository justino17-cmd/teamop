/* ══ SONDE — LA TAILLE DU TEXTE (audit apple-design, point 4 ; partie Y) ═══════════════════════════════════════════════════════
   Deux temps, dans la vraie page :
     A. LE MÉCANISME — au réglage « Normale », rien ne change (aucune feuille réécrite, aucun observateur) ; à « La plus grande »
        (×1,35), le texte du contenu grossit de 35 %, celui des barres (menu, barre du haut, onglets) ne bouge pas, un style écrit
        en ligne grossit aussi, et un écran dessiné APRÈS le réglage aussi ; revenu à « Normale », chaque taille est celle
        d'origine, au centième de pixel. Le réglage des Paramètres : cinq choix, un coché, le toucher l'applique.
     B. LA MISE EN PAGE TIENT — chaque rubrique, au facteur 1 puis au facteur le plus grand : la page ne glisse pas de côté
        (mesuré contre la largeur de l'APPAREIL, deux lectures à 700 ms), aucun bloc de texte n'est écrasé (moins de 12 signes
        par ligne sur 4 lignes ou plus), aucun texte coupé en hauteur dans une boîte qui cache ce qui dépasse. Seul compte ce
        que le grand texte AJOUTE à ce que la taille normale montre déjà.
   PROF=tel|petitand|bureau (défaut tel) ; FACTEUR=1.35 (défaut) ; SEULES=vue,vue ; CAPTURES=dossier ; SOURCE=fichier (contre-
   épreuve). ⛔ Bêta uniquement, copie locale en 127.0.0.1. */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const { PROFILS, poserProfil } = require(path.join(__dirname, 'profils.js'));
const CAP = process.env.CAPTURES; if (CAP) fs.mkdirSync(CAP, { recursive: true });
const PROF = process.env.PROF || 'tel', F = process.env.FACTEUR || '1.35';
(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version, '· profil', PROF, '· facteur', F);
  await S.ev(`window.horsLigneDebut=function(){}; const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1200); await S.ev(`try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(1500);
  let ok = 0, ko = 0; const c = (t, v, d) => { if (v) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
  const calme = () => S.ev(`for(let k=0;k<60&&window._vtEnCours;k++) await new Promise(r=>setTimeout(r,50));
    const A=document.getAnimations().filter(a=>a.effect&&a.effect.getTiming().iterations!==Infinity); await Promise.all(A.map(a=>a.finished.catch(()=>{})));
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); return 1;`);
  const P = PROFILS[PROF]; await poserProfil(S, P); await S.ev(`setPlatForce('${P.plat}'); return 1;`);
  const capture = async (nom) => { if (!CAP) return; const im = await S.c.envoyer('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(CAP, nom + '.png'), Buffer.from(im.data, 'base64')); };
  const existe = await S.ev(`return typeof txtAppliquer==='function';`);

  if (!existe) { c('la page porte le réglage de la taille du texte (txtAppliquer, setTxt)', false, existe); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); await S.fermer(); process.exit(1); }
  if (!process.env.SAUTER_A) {
    console.log('\nA. Le mécanisme (' + P.lbl + ')');
    c('(population) la page porte le réglage de la taille du texte', existe, existe);
    await S.ev(`go('clients'); return 1;`); await dormir(1200); await calme();
    /* l'échantillon : chaque élément visible qui porte du texte en propre, au contenu et dans les barres ; plus un style écrit en ligne */
    const releve = `const vis=e=>{ const r=e.getBoundingClientRect(); return r.width>0&&r.height>0; };
      const propre=e=>[...e.childNodes].some(n=>n.nodeType===3&&n.nodeValue.trim());
      /* les initiales d'une tuile (.tf-badge) gardent leur taille, comme une icône : leur tuile en a une (voir txtReecrireCss) */
      const L=[...document.querySelectorAll('#content *, .topbar *, #tabbar *, .sidebar *')].filter(e=>vis(e)&&propre(e)&&!e.closest('.tf-badge'));
      L.forEach((e,i)=>{ if(!e.dataset.tt) e.dataset.tt='t'+i; });
      return L.map(e=>({k:e.dataset.tt, barre:!!e.closest('.topbar,#tabbar,.sidebar'), ligne:/font-size/.test(e.getAttribute('style')||''), fs:parseFloat(getComputedStyle(e).fontSize)}));`;
    const t1 = await S.ev(releve);
    const feuilleAvant = await S.ev(`return {calc:[...document.querySelectorAll('style')].filter(s=>/calc\\([\\d.]+px \\* var\\(--txt/.test(s.textContent)).length, attr:document.documentElement.getAttribute('data-txt'), styles:document.querySelectorAll('style').length};`);
    c('(population) ' + t1.length + ' textes relevés, dont ' + t1.filter(x => x.barre).length + ' dans les barres et ' + t1.filter(x => x.ligne).length + ' écrits en ligne', t1.length > 40 && t1.filter(x => x.barre).length > 3 && t1.filter(x => x.ligne).length > 2, t1.length);
    c('au réglage par défaut (ici : pas un iPhone), aucune feuille n’est réécrite et la page ne porte pas data-txt', feuilleAvant.calc === 0 && feuilleAvant.attr === null, feuilleAvant);
    const t0 = Date.now(); await S.ev(`setTxt('${F}'); return 1;`); const duree = Date.now() - t0; await dormir(400); await calme();
    const t2 = await S.ev(releve); const m2 = new Map(t2.map(x => [x.k, x]));
    const contenu = t1.filter(x => !x.barre && m2.has(x.k)), barres = t1.filter(x => x.barre && m2.has(x.k));
    const fauxC = contenu.filter(x => Math.abs(m2.get(x.k).fs - x.fs * F) > 0.6), fauxB = barres.filter(x => Math.abs(m2.get(x.k).fs - x.fs) > 0.01);
    c('⛔ ×' + F + ' : les ' + contenu.length + ' textes du contenu grossissent de ' + Math.round((F - 1) * 100) + ' % (écrits en ligne compris)', contenu.length > 15 && !fauxC.length, fauxC.slice(0, 5).map(x => [x.k, x.fs, m2.get(x.k).fs]));
    c('⛔ … et les ' + barres.length + ' textes des barres ne bougent pas', barres.length > 3 && !fauxB.length, fauxB.slice(0, 5).map(x => [x.k, x.fs, m2.get(x.k).fs]));
    console.log('    (le réglage a pris ' + duree + ' ms, aller-retour du pilote compris)');
    const nv = await S.ev(`go('interventions'); await new Promise(r=>setTimeout(r,1200));
      const L=[...document.querySelectorAll('#content [style*="font-size"]')].filter(e=>e.getBoundingClientRect().width>0);
      return {n:L.length, calc:L.filter(e=>/calc\\(/.test(e.style.fontSize)).length, px:L.filter(e=>/^[\\d.]+px$/.test(e.style.fontSize)).map(e=>e.style.fontSize).slice(0,4)};`);
    c('⛔ un écran dessiné APRÈS le réglage grossit aussi : ' + nv.calc + ' styles en ligne sur ' + nv.n + ' passés par la taille du texte', nv.n > 3 && nv.calc === nv.n, nv);
    await S.ev(`go('clients'); return 1;`); await dormir(1200); await calme();
    await S.ev(`setTxt('1'); return 1;`); await dormir(400); await calme();
    const t3 = await S.ev(releve); const m3 = new Map(t3.map(x => [x.k, x]));
    const ecarts = t1.filter(x => m3.has(x.k) && Math.abs(m3.get(x.k).fs - x.fs) > 0.01);
    c('⛔ revenu à « Normale » : chaque taille est celle d’origine (' + t1.filter(x => m3.has(x.k)).length + ' textes, au centième de pixel)', t1.filter(x => m3.has(x.k)).length > 30 && !ecarts.length, ecarts.slice(0, 5).map(x => [x.k, x.fs, m3.get(x.k).fs]));
    await S.ev(`go('parametres'); return 1;`); await dormir(1300); await calme();
    const r0 = await S.ev(`const g=document.querySelector('.txt-choix'); if(!g) return null; g.scrollIntoView({block:'center'}); await new Promise(r=>setTimeout(r,300));
      const B=[...g.querySelectorAll('[role=radio]')]; const r=g.getBoundingClientRect();
      return {n:B.length, coches:B.filter(b=>b.getAttribute('aria-checked')==='true').map(b=>b.textContent), dans:r.right<=innerWidth+0.5&&r.left>=-0.5, noms:B.map(b=>b.textContent), h:Math.round(Math.min(...B.map(b=>b.getBoundingClientRect().height)))};`);
    c('le réglage est dans Paramètres : cinq choix, un seul coché (« ' + (r0 && r0.coches.join(',')) + ' »), tous dans l’écran', !!r0 && r0.n === 5 && r0.coches.length === 1 && r0.dans, r0);
    if (r0) {
      const p = await S.ev(`const b=[...document.querySelectorAll('.txt-choix [role=radio]')].find(x=>x.textContent==='Grande'); const r=b.getBoundingClientRect(); return {x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2)};`);
      if (P.tac) { await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y, id: 1 }] }); await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
      else for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await S.c.envoyer('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
      await dormir(900); await calme();
      const r1 = await S.ev(`const B=[...document.querySelectorAll('.txt-choix [role=radio]')]; return {txt:document.documentElement.getAttribute('data-txt'), var:getComputedStyle(document.documentElement).getPropertyValue('--txt').trim(),
        coches:B.filter(b=>b.getAttribute('aria-checked')==='true').map(b=>b.textContent), toast:document.getElementById('toast').textContent, range:localStorage.getItem((typeof STORE_KEY==='string'&&/^elanB_/.test(STORE_KEY))?'elanB_txt':'elan_txt')};`);
      c('toucher « Grande » l’applique (×1,12), le coche, le dit, et le range sur l’appareil', r1.txt === '1.12' && r1.var === '1.12' && r1.coches.join() === 'Grande' && /grande/i.test(r1.toast) && r1.range === '1.12', r1);
      await capture('parametres-grande-' + PROF);
      await S.ev(`setTxt('auto'); return 1;`);
    }
  }

  if (!process.env.SAUTER_B) {
    console.log('\nB. La mise en page tient, rubrique par rubrique (' + P.lbl + ', ×1 puis ×' + F + ')');
    let vues = await S.ev(`return NAV.flatMap(s=>s.items).filter(it=>{ try{ return canSee(it); }catch(e){ return false; } }).map(it=>it.k).filter((k,i,a)=>views[k]&&a.indexOf(k)===i);`);
    if (process.env.SEULES) vues = vues.filter(v => process.env.SEULES.split(',').includes(v));
    const mesurer = `const W=${P.w};
      const lire=()=>{ window.scrollTo(99999, window.scrollY); const sx=window.scrollX; window.scrollTo(0, window.scrollY);
        return Math.max(sx, document.documentElement.scrollWidth-W); };
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth; const a=lire();
      await new Promise(r=>setTimeout(r,700)); void document.body.offsetWidth; const b=lire();
      const deb=Math.min(a,b);
      const vis=e=>{ const r=e.getBoundingClientRect(); return r.width>0&&r.height>0&&r.right>0&&r.left<W; };
      const nom=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\\s+/).slice(0,2).join('.'):'');
      const ecr=[], coupes=[];
      for(const e of document.querySelectorAll('#content *, #modal *')){
        let t=''; for(const n of e.childNodes) if(n.nodeType===3) t+=n.nodeValue; t=t.trim(); if(t.length<4||!vis(e)) continue;
        const cs=getComputedStyle(e); if(cs.display==='inline') continue;
        if(t.length>=25&&!/nowrap|pre/.test(cs.whiteSpace)){
          const fz=parseFloat(cs.fontSize)||14, lh=parseFloat(cs.lineHeight)||fz*1.3, w=e.clientWidth-(parseFloat(cs.paddingLeft)||0)-(parseFloat(cs.paddingRight)||0);
          const lignes=Math.round((e.getBoundingClientRect().height-(parseFloat(cs.paddingTop)||0)-(parseFloat(cs.paddingBottom)||0))/lh), signes=w/(0.55*fz);
          if(signes<12&&lignes>=4) ecr.push(nom(e)+' « '+t.slice(0,24)+' »'); }
        /* coupé en HAUTEUR : une boîte qui cache ce qui dépasse, et un texte plus haut qu'elle (une ellipse sur une ligne est voulue) */
        if(/hidden|clip/.test(cs.overflowY)&&e.scrollHeight>e.clientHeight+2&&!/ellipsis/.test(cs.textOverflow)&&!(parseInt(cs.webkitLineClamp)>0)) coupes.push(nom(e)+' « '+t.slice(0,24)+' » '+e.clientHeight+'/'+e.scrollHeight);
      }
      /* la preuve que la mesure a lieu à la bonne taille : le facteur posé, et la taille calculée d'un texte du contenu */
      const ref=[...document.querySelectorAll('#content *')].find(e=>vis(e)&&[...e.childNodes].some(n=>n.nodeType===3&&n.nodeValue.trim().length>2)&&!e.closest('.tf-badge'));
      return {deb, ecr, coupes, txt:document.documentElement.getAttribute('data-txt'), ref:ref?ref.dataset.tr||(ref.dataset.tr='r'+Math.random().toString(36).slice(2,7)):null, fz:ref?parseFloat(getComputedStyle(ref).fontSize):0};`;
    const R = {};
    for (const v of vues) {
      R[v] = {};
      for (const f of ['1', F]) {
        await S.ev(`try{ closeModal(true); }catch(e){} setTxt('${f}'); go('${v}'); return 1;`); await dormir(1300); await calme();
        R[v][f] = await S.ev(mesurer);
        if (CAP && (process.env.CAPVUES || '').split(',').includes(v)) { await S.ev(`window.scrollTo(0,0); const c=document.getElementById('content'); if(c) c.scrollTop=0; return 1;`); await dormir(300); await capture(v + '-' + PROF + '-x' + f); }
      }
    }
    await S.ev(`setTxt('auto'); return 1;`);
    const pires = [];
    for (const v of vues) {
      const a = R[v]['1'], b = R[v][F];
      const ecrNeufs = b.ecr.filter(x => !a.ecr.includes(x)), coupesNeuves = b.coupes.filter(x => !a.coupes.some(y => y.split(' » ')[0] === x.split(' » ')[0]));
      const neuf = (b.deb > 1 && b.deb > a.deb + 1) || ecrNeufs.length || coupesNeuves.length;
      if (neuf) pires.push({ v, deb: [a.deb, b.deb], ecr: ecrNeufs.slice(0, 4), coupes: coupesNeuves.slice(0, 4) });
    }
    c('(population) ' + vues.length + ' rubriques mesurées aux deux tailles', vues.length > (process.env.SEULES ? 0 : 25), vues.length);
    const sansFacteur = vues.filter(v => R[v][F].txt !== F || R[v]['1'].txt !== null);
    c('(population) chaque rubrique a bien été mesurée à ×1 PUIS à ×' + F + ' (facteur posé sur la page)', !sansFacteur.length, sansFacteur);
    const grossis = vues.filter(v => R[v]['1'].fz > 0 && Math.abs(R[v][F].fz / R[v]['1'].fz - F) < 0.06);
    c('(population) dans ' + grossis.length + ' rubriques sur ' + vues.length + ', un même texte du contenu est bien ×' + F + ' plus grand', grossis.length >= vues.length * 0.8, vues.filter(v => !grossis.includes(v)).map(v => [v, R[v]['1'].fz, R[v][F].fz]));
    c('⛔ ×' + F + ' : aucune rubrique ne glisse de côté, n’écrase ni ne coupe un texte de plus qu’à ×1', !pires.length, pires);
    const deja = vues.filter(v => R[v]['1'].deb > 1 || R[v]['1'].ecr.length || R[v]['1'].coupes.length);
    if (deja.length) console.log('    (déjà là à ×1, hors de ce contrôle : ' + deja.map(v => v + (R[v]['1'].deb > 1 ? ' glisse ' + R[v]['1'].deb + ' px' : '') + (R[v]['1'].ecr.length ? ' ' + R[v]['1'].ecr.length + ' écrasé(s)' : '') + (R[v]['1'].coupes.length ? ' ' + R[v]['1'].coupes.length + ' coupé(s)' : '')).join(' · ') + ')');
    if (process.env.DETAIL) fs.writeFileSync(process.env.DETAIL, JSON.stringify(R, null, 1));
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  await S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

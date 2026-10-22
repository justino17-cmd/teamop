/* ══ SONDE — LES TROIS RESTES DE L'AUDIT (partie Z) ══════════════════════════════════════════════════════════════════════════════
   Rejoués dans la vraie page, au doigt (iPhone) et à la souris (Mac), jour et nuit :
     1. « Nouveau client », le nom laissé VIDE (champ « required ») : envoyer — le message se lit SOUS le champ, nommé par son
        libellé, le champ est marqué et a le focus (avant, la bulle du navigateur arrêtait l'envoi : notre code ne tournait pas) ;
     2. le tableau de bord, une fenêtre laissée en route (barre « Reprendre ») et la page défilée : changer de période, puis
        « Modifier » — la barre reste, le curseur de la période est là, la page ne bouge pas (avant : la barre disparaissait) ;
     3. les deux menus écrits en ligne (le choix d'une box dans Mouvements, le menu du pied) : sous le doigt, aucun survol ne
        reste posé (« mouseover » que le téléphone émet au toucher) ; à la souris, le survol se voit ; l'appui se voit partout.
   CAPTURES=dossier : le message sous le champ, le tableau de bord après la période, jour et nuit. SOURCE=fichier : la
   contre-épreuve. ⛔ Bêta uniquement, copie locale en 127.0.0.1. */
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
  const calme = () => S.ev(`for(let k=0;k<60&&window._vtEnCours;k++) await new Promise(r=>setTimeout(r,50));
    const A=document.getAnimations().filter(a=>a.effect&&a.effect.getTiming().iterations!==Infinity); await Promise.all(A.map(a=>a.finished.catch(()=>{})));
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); return 1;`);
  /* un geste réel : le doigt (touchStart/touchEnd) au téléphone, la souris (pressed/released) au Mac ; prouve d'abord que le point touché est bien l'élément */
  const geste = async (sel, idx, souris) => { const p = await S.ev(`const L=[...document.querySelectorAll(${JSON.stringify(sel)})].filter(e=>e.offsetWidth); const e=L[${idx || 0}]; if(!e) return null;
      const r0=e.getBoundingClientRect(); if(r0.top<60||r0.bottom>innerHeight-90){ e.scrollIntoView({block:'center'}); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); }
      const r=e.getBoundingClientRect(); const x=Math.round(r.left+r.width/2), y=Math.round(r.top+r.height/2);
      const t=document.elementFromPoint(x,y); return {x,y,ok:!!t&&(t===e||e.contains(t))};`);
    if (!p || !p.ok) return p;
    if (souris) { for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await S.c.envoyer('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 }); }
    else { await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y, id: 1 }] }); await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
    return p; };
  const capture = async (nom) => { if (!CAP) return; const im = await S.c.envoyer('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(CAP, nom + '.png'), Buffer.from(im.data, 'base64')); };

  /* un profil par lancement : la souris (hover:hover) ne s'émule qu'au démarrage du navigateur (OPG_ARGS, voir pilote.js) —
     PROF=tel (défaut) ; PROF=bureau avec OPG_ARGS='--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4' */
  for (const [cle, souris] of [[process.env.PROF || 'tel', (process.env.PROF || 'tel') === 'bureau']]) {
    const P = PROFILS[cle];
    /* ⚠️ couper l'émulation tactile rend ce Chromium « sans pointeur », même lancé avec une souris (sonde-survol-colle.js) :
       au Mac, on ne pose que la taille de l'écran */
    if (P.tac) await poserProfil(S, P); else await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: P.w, height: P.h, deviceScaleFactor: P.dpr, mobile: false });
    await S.ev(`setPlatForce('${P.plat}'); return 1;`);
    const media = await S.ev(`return matchMedia('(hover:hover)').matches;`);
    c('(population) le profil ' + P.lbl + ' se dit ' + (souris ? '« à souris » (hover:hover)' : '« au doigt » (hover:none)'), media === souris, media);
    for (const theme of ['light', 'dark']) {
      const J = P.lbl + ', ' + (theme === 'light' ? 'jour' : 'nuit');
      await S.ev(`try{ closeModal(true); }catch(e){} (typeof setThemePrefNu==='function'?setThemePrefNu:setThemePref)('${theme}'); return 1;`);

      console.log('\n1. « Nouveau client », le nom laissé vide : envoyer (' + J + ')');
      await S.ev(`go('clients'); return 1;`); await dormir(900);
      await S.ev(`formClient(); return 1;`); await dormir(800); await calme();
      const f0 = await S.ev(`const f=document.querySelector('#modal form'); const n=f&&f.elements.nom; if(!n) return null; n.value='';
        const b=[...f.querySelectorAll('button[type=submit],button:not([type])')].filter(x=>x.offsetWidth).pop();
        window._zInvalides=0; window._zEmpeches=0; window._zEnvoye=0;
        f.addEventListener('submit',()=>{ window._zEnvoye++; },true);
        n.addEventListener('invalid',e=>{ window._zInvalides++; setTimeout(()=>{ if(e.defaultPrevented) window._zEmpeches++; },0); });
        if(b) b.setAttribute('data-z','envoyer'); return {req:n.required, bouton:!!b, n:document.querySelectorAll('#modal [required]').length};`);
      c('(population) le formulaire porte des champs obligatoires (' + (f0 && f0.n) + '), le nom en est un, et un bouton envoie', !!f0 && f0.req && f0.bouton && f0.n > 0, f0);
      if (f0) {
        const g = await geste('#modal [data-z=envoyer]', 0, souris); await S.ev(`window._zT0=performance.now(); return 1;`); await dormir(700); await calme();
        const f1 = await S.ev(`const n=document.querySelector('#modal form').elements.nom; const note=document.querySelector('#modal .champ-manque-note');
          const r=n.getBoundingClientRect(), q=note&&note.getBoundingClientRect();
          return {inval:window._zInvalides, empeche:window._zEmpeches, envoye:window._zEnvoye, aria:n.getAttribute('aria-invalid'), focus:document.activeElement===n,
            note:note&&note.textContent, sous:!!q&&q.top>=r.bottom-1&&q.top-r.bottom<40, relie:!!note&&(n.getAttribute('aria-describedby')||'').includes(note.id)};`);
        c('le geste a porté sur « ' + 'Enregistrer' + ' » (point touché = le bouton)', !!g && g.ok, g);
        c('le navigateur a bien levé « invalid » sur le nom (' + f1.inval + ' fois), et l’envoi n’a pas eu lieu', f1.inval >= 1 && f1.envoye === 0, f1);
        c('⛔ la bulle du système est retenue (« invalid » empêché)', f1.empeche >= 1, f1);
        c('⛔ le message se lit SOUS le champ, nommé par son libellé : ' + JSON.stringify(f1.note), !!f1.note && /Nom/.test(f1.note) && /obligatoire/.test(f1.note) && f1.sous, f1);
        c('le champ est marqué (aria-invalid), relié à son message, et a le focus', f1.aria === 'true' && f1.relie && f1.focus, f1);
        const tz = await S.ev(`const z=document.getElementById('toast'), cs=getComputedStyle(z); return {txt:z.textContent, cls:z.className, op:cs.opacity, w:Math.round(z.getBoundingClientRect().width), dt:Math.round(performance.now()-(window._zT0||0))};`);
        console.log('    (toast à la capture : ' + JSON.stringify(tz) + ')');
        if (process.env.PILE) console.log('    pile : ' + JSON.stringify(await S.ev(`const z=document.getElementById('toast'), b=z.getBoundingClientRect(); const x=Math.round(b.left+b.width/2), y=Math.round(b.top+b.height/2);
          return {x,y,b:[Math.round(b.left),Math.round(b.top),Math.round(b.width),Math.round(b.height)], pile:document.elementsFromPoint(x,y).slice(0,6).map(e=>e.tagName+(e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\s+/).join('.'):'')+' z='+getComputedStyle(e).zIndex+' pos='+getComputedStyle(e).position),
            parent:z.parentElement&&(z.parentElement.tagName+'#'+z.parentElement.id), popover:z.matches(':popover-open'), top:[...document.querySelectorAll('dialog[open],[popover]')].map(e=>e.tagName+'#'+e.id)};`)));
        /* ⚠️ une capture prend plusieurs secondes sur ce chemin de rendu, et la page vit pendant ce temps : le toast (2,2 s) partait
           avant que l'image soit prise, et la capture montrait sa pastille vide — mesuré, ce n'est pas la page (sonde-toast-vide*.js).
           Pour la capture seulement, le MÊME toast dure 20 s. */
        await S.ev(`const z=document.getElementById('toast'); toast(z.textContent,20000,'erreur'); return 1;`); await dormir(400);
        await capture('client-vide-' + cle + '-' + theme);
        await S.ev(`toastCacher(document.getElementById('toast')); return 1;`);
        const f2 = await S.ev(`const n=document.querySelector('#modal form').elements.nom; n.focus(); n.value='Dupont'; n.dispatchEvent(new Event('input',{bubbles:true}));
          return {aria:n.getAttribute('aria-invalid'), note:!!document.querySelector('#modal .champ-manque-note')};`);
        c('la première frappe efface la marque et le message', !f2.aria && !f2.note, f2);
      }

      console.log('\n2. Tableau de bord : une période choisie, puis « Modifier » — la barre « Reprendre » reste, la page ne bouge pas (' + J + ')');
      await S.ev(`try{ closeModal(true); }catch(e){} const o=multiTout(); o.dashboard={ts:Date.now(),html:'<div class="modal-head"><h3>Nouveau client</h3></div>',titre:'Nouveau client',y:120}; multiEcrire(o);
        go('dashboard'); return 1;`); await dormir(1300); await calme();
      const d0 = await S.ev(`const c=document.getElementById('content'); const seg=document.querySelector('.tdb-seg');
        const H=(c.scrollHeight>c.clientHeight+5)?c:document.scrollingElement;
        /* la page défilée, la période au milieu de l'écran : le geste n'aura pas à la ramener (il ne doit rien faire défiler lui-même) */
        if(seg){ seg.scrollIntoView({block:'center'}); } else { H.scrollTop=Math.min(260,H.scrollHeight-H.clientHeight); } await new Promise(r=>setTimeout(r,250));
        const spans=seg?[...seg.querySelectorAll('span[onclick]')]:[]; const cible=spans.find(s=>!s.classList.contains('on'));
        if(cible) cible.setAttribute('data-z','periode');
        return {barre:!!c.querySelector('.multi-bar'), seg:!!seg, cur:!!(seg&&seg.querySelector('.seg-cur')), y:Math.round(H.scrollTop), qui:H===c?'content':'page', cible:cible&&cible.textContent, n:spans.length};`);
      c('(population) la barre « Reprendre » est là, la période a ' + d0.n + ' choix et son curseur, la page est défilée de ' + d0.y + ' px', d0.barre && d0.seg && d0.cur && d0.n >= 3 && d0.y > 40, d0);
      if (d0.cible) {
        const g = await geste('[data-z=periode]', 0, souris); await dormir(900); await calme();
        const d1 = await S.ev(`const c=document.getElementById('content'); const seg=document.querySelector('.tdb-seg'); const H=${d0.qui === 'content' ? 'c' : 'document.scrollingElement'};
          const on=seg&&seg.querySelector('span.on'); return {barre:!!c.querySelector('.multi-bar'), cur:!!(seg&&seg.querySelector('.seg-cur')), on:on&&on.textContent, y:Math.round(H.scrollTop)};`);
        c('le geste a porté sur la période « ' + d0.cible + ' »', !!g && g.ok && d1.on === d0.cible, { g, d1 });
        c('⛔ après la période : la barre « Reprendre » est toujours là', d1.barre, d1);
        c('⛔ … le curseur de la période aussi (le segmenté n’est pas revenu en pastilles)', d1.cur, d1);
        c('… et la page n’a pas bougé (' + d0.y + ' → ' + d1.y + ' px ; la barre aurait rendu 120)', Math.abs(d1.y - d0.y) <= 2, { d0, d1 });
        await capture('tdb-periode-' + cle + '-' + theme);
        await S.ev(`dashToggleEdit(); return 1;`); await dormir(700); await calme();
        /* en mode « Modifier », le planning (et sa période) est retiré et la page raccourcit : elle garde sa place tant qu'elle le peut */
        const d2 = await S.ev(`const c=document.getElementById('content'); const H=${d0.qui === 'content' ? 'c' : 'document.scrollingElement'};
          return {barre:!!c.querySelector('.multi-bar'), y:Math.round(H.scrollTop), max:Math.round(H.scrollHeight-H.clientHeight), edit:typeof dashEdit!=='undefined'&&dashEdit};`);
        c('⛔ « Modifier » : la barre reste, la page garde sa place autant qu’elle le peut (' + d1.y + ' → ' + d2.y + ' px, au plus ' + d2.max + ')', d2.barre && d2.edit && Math.abs(d2.y - Math.min(d1.y, d2.max)) <= 2, d2);
        await S.ev(`if(dashEdit) dashToggleEdit(); return 1;`); await dormir(600); await calme();
        const d3 = await S.ev(`const c=document.getElementById('content'); const seg=document.querySelector('.tdb-seg'); return {barre:!!c.querySelector('.multi-bar'), cur:!!(seg&&seg.querySelector('.seg-cur'))};`);
        c('⛔ « Terminé » : la barre et le curseur de la période sont là', d3.barre && d3.cur, d3);
      }
      await S.ev(`const o=multiTout(); delete o.dashboard; multiEcrire(o); return 1;`);

      console.log('\n3. Les deux menus écrits en ligne : pas de survol collé au doigt, le survol à la souris (' + J + ')');
      await S.ev(`if(!(db.boxes||[]).some(b=>b.id==='bz1')){ (db.boxes=db.boxes||[]).push({id:'bz1',nom:'Box de la sonde',numero:'Z1',visibleTous:true,stock:{}}); save(); }
        mvtFBox=''; go('mouvements'); return 1;`); await dormir(900);
      await S.ev(`mvtMenu('box'); return 1;`); await dormir(500);
      const m0 = await S.ev(`const L=[...document.querySelectorAll('#content [onclick^="mvtChoisirBox"]')].filter(e=>e.offsetWidth); const e=L[1]||L[0]; if(!e) return null; e.setAttribute('data-z','box');
        const avant=getComputedStyle(e).backgroundColor; e.dispatchEvent(new MouseEvent('mouseover',{bubbles:true})); const apres=getComputedStyle(e).backgroundColor;
        return {n:L.length, inline:e.style.background||e.style.backgroundColor||'', avant, apres, hover:matchMedia('(hover:hover)').matches};`);
      c('(population) le choix d’une box est ouvert (' + (m0 && m0.n) + ' lignes)', !!m0 && m0.n >= 2, m0);
      if (m0) c('⛔ « mouseover » (le toucher d’un téléphone l’émet) ne pose plus de fond en ligne sur la ligne de box', !m0.inline, m0);
      if (m0) {
        const dom = await S.c.envoyer('DOM.getDocument', { depth: 0 });
        const q = await S.c.envoyer('DOM.querySelector', { nodeId: dom.root.nodeId, selector: '[data-z=box]' });
        await S.c.envoyer('CSS.enable', {});
        const fond0 = await S.ev(`return getComputedStyle(document.querySelector('[data-z=box]')).backgroundColor;`);
        await S.c.envoyer('CSS.forcePseudoState', { nodeId: q.nodeId, forcedPseudoClasses: ['hover'] });
        const fondH = await S.ev(`return getComputedStyle(document.querySelector('[data-z=box]')).backgroundColor;`);
        await S.c.envoyer('CSS.forcePseudoState', { nodeId: q.nodeId, forcedPseudoClasses: ['active'] });
        const fondA = await S.ev(`return getComputedStyle(document.querySelector('[data-z=box]')).boxShadow;`);
        await S.c.envoyer('CSS.forcePseudoState', { nodeId: q.nodeId, forcedPseudoClasses: [] });
        if (souris) c('à la souris, le survol se voit (' + fond0 + ' → ' + fondH + ')', fondH !== fond0, { fond0, fondH });
        else c('⛔ au doigt (hover:none), un survol forcé ne change rien (' + fond0 + ' → ' + fondH + ')', fondH === fond0, { fond0, fondH });
        c('l’appui se voit (voile de la teinte, tout de suite)', /inset/.test(fondA || ''), fondA);
      }
      await S.ev(`mvtMenu(''); return 1;`);
      const p0 = await S.ev(`userFootMenu({preventDefault(){},stopPropagation(){},clientX:60,clientY:innerHeight-80}); await new Promise(r=>setTimeout(r,350));
        const m=document.getElementById('foot-menu'); if(!m) return null; const e=[...m.children].find(x=>x.offsetWidth); if(!e) return null; e.setAttribute('data-z','pied');
        e.dispatchEvent(new MouseEvent('mouseover',{bubbles:true})); return {n:m.children.length, cls:e.className, inline:e.style.background||e.style.backgroundColor||''};`);
      c('(population) le menu du pied est ouvert (' + (p0 && p0.n) + ' lignes)', !!p0 && p0.n >= 2, p0);
      if (p0) c('⛔ « mouseover » ne pose plus de fond en ligne dans le menu du pied (classe ' + p0.cls + ')', !p0.inline && /ligne-choix/.test(p0.cls), p0);
      await S.ev(`const m=document.getElementById('foot-menu'); if(m) m.remove(); return 1;`);
    }
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  await S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

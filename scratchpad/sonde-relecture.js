/* ══ SONDE — LES CORRECTIFS DE LA RELECTURE ADVERSE (audit apple-design, partie X) ══════════════════════════════════════════════
   Une relecture par trois relecteurs et un sceptique par constat (relecture-audit-apple-K-W) a confirmé sept défauts dans les
   parties K à W, et un huitième a été vérifié à la main. On les rejoue ici dans la vraie page, au doigt (iPhone) ou à la souris
   (Mac) :
     1. « Thème et couleur » : défiler jusqu'aux teintes, en toucher une — la fenêtre garde sa place (elle remontait en haut) ;
     2. une fenêtre courte : son voile n'a pas de barre de défilement ; une fenêtre longue : la barre reste ;
     3. « Nouvel utilisateur », mot de passe trop court : le message va SOUS la rangée (champ + 🎲), pas entre les deux ;
     4. supprimer un véhicule, puis une suppression refusée à la boîte : l'« Annuler » du premier toast le remet ; et le toast
        « Rétabli » se VOIT après l'annulation (il était retiré dans le même geste) ;
     5. un bon de commande aux quantités à 0 : le refus se lit PAR-DESSUS « Ma commande » (il partait dessous), au pixel ;
     6. tableau de bord (Mac, souris) : reprendre une carte pendant que la précédente se pose — l'ordre montré est l'ordre
        enregistré, la carte tenue reste soulevée ;
     7. une photo ouverte, puis la déconnexion : l'écran de connexion n'est pas sous la photo.
   CAPTURES=dossier : la fenêtre « Thème et couleur » après la teinte, le message sous la rangée, le refus sur « Ma commande »,
   jour et nuit. SOURCE=fichier : la contre-épreuve. ⛔ Bêta uniquement, copie locale en 127.0.0.1. */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const { PROFILS, poserProfil } = require(path.join(__dirname, 'profils.js'));
const { decoder } = require(path.join(__dirname, 'png.js'));
const CAP = process.env.CAPTURES; if (CAP) fs.mkdirSync(CAP, { recursive: true });
(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  const entrer = () => S.ev(`window.horsLigneDebut=function(){}; const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await entrer(); await dormir(1200); await S.ev(`try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(1500);
  let ok = 0, ko = 0; const c = (t, v, d) => { if (v) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
  const calme = () => S.ev(`for(let k=0;k<60&&window._vtEnCours;k++) await new Promise(r=>setTimeout(r,50));
    const A=document.getAnimations().filter(a=>a.effect&&a.effect.getTiming().iterations!==Infinity); await Promise.all(A.map(a=>a.finished.catch(()=>{})));
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); return 1;`);
  const toucher = async (sel, idx) => { const p = await S.ev(`const L=[...document.querySelectorAll(${JSON.stringify(sel)})].filter(e=>e.offsetWidth); const e=L[${idx || 0}]; if(!e) return null;
      e.scrollIntoView({block:'center'}); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); const r=e.getBoundingClientRect(); const x=Math.round(r.left+r.width/2), y=Math.round(r.top+r.height/2);
      const t=document.elementFromPoint(x,y); return {x,y,ok:!!t&&(t===e||e.contains(t))};`);
    if (!p) return null; await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y, id: 1 }] }); await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); return p; };
  const capture = async (nom) => { if (!CAP) return; const im = await S.c.envoyer('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(CAP, nom + '.png'), Buffer.from(im.data, 'base64')); };
  const P = PROFILS.tel; await poserProfil(S, P); await S.ev(`setPlatForce('${P.plat}'); return 1;`);

  for (const theme of ['light', 'dark']) {
    const J = theme === 'light' ? 'jour' : 'nuit';
    console.log('\n1. « Thème et couleur » : une teinte touchée ne renvoie pas en haut (' + J + ')');
    await S.ev(`try{ closeModal(true); }catch(e){} (typeof setThemePrefNu==='function'?setThemePrefNu:setThemePref)('${theme}'); go('parametres'); return 1;`); await dormir(1200);
    await S.ev(`themeCouleur(); return 1;`); await dormir(900); await calme();
    const avant = await S.ev(`const ov=document.getElementById('overlay'); const L=[...document.querySelectorAll('#modal [onclick^="tcTeinte"]')].filter(e=>e.offsetWidth);
      if(!L.length) return null; L[Math.min(3,L.length-1)].scrollIntoView({block:'center'}); await new Promise(r=>setTimeout(r,250)); return {y:Math.round(ov.scrollTop), n:L.length, titre:(document.querySelector('#modal .modal-head h3')||{}).textContent};`);
    c('(population) la fenêtre « Thème et couleur » a des teintes, et on a défilé jusqu’à elles (' + (avant && avant.y) + ' px)', !!avant && avant.n > 3 && avant.y > 40, avant);
    if (avant) {
      await toucher('#modal [onclick^="tcTeinte"]', Math.min(3, avant.n - 1)); await dormir(700); await calme();
      const apres = await S.ev(`return {y:Math.round(document.getElementById('overlay').scrollTop), titre:(document.querySelector('#modal .modal-head h3')||{}).textContent};`);
      c('⛔ la teinte touchée : la fenêtre garde sa place (' + avant.y + ' → ' + apres.y + ' px), elle ne remonte plus en haut', apres.titre === avant.titre && Math.abs(apres.y - avant.y) <= 2, { avant, apres });
      await capture('theme-teinte-' + theme);
    }

    console.log('\n2. la barre du voile ne paraît que s’il y a de quoi défiler (' + J + ')');
    const court = await S.ev(`try{ closeModal(true); }catch(e){} await new Promise(r=>setTimeout(r,300));
      openModal('<div class="modal-head"><h3>Court</h3></div><p>Deux lignes.</p>','carte'); await new Promise(r=>setTimeout(r,500));
      const ov=document.getElementById('overlay'); return {sans:ov.classList.contains('sans-barre'), sw:getComputedStyle(ov).scrollbarWidth, h:ov.scrollHeight, c:ov.clientHeight};`);
    c('fenêtre courte : son voile n’a pas de barre (« sans-barre », scrollbar-width ' + court.sw + ')', court.sans && court.sw === 'none', court);
    const long = await S.ev(`try{ closeModal(true); }catch(e){} await new Promise(r=>setTimeout(r,300)); formClient(); await new Promise(r=>setTimeout(r,700));
      const ov=document.getElementById('overlay'); return {sans:ov.classList.contains('sans-barre'), sw:getComputedStyle(ov).scrollbarWidth, h:ov.scrollHeight, c:ov.clientHeight};`);
    c('fenêtre longue (' + long.h + ' px de contenu dans ' + long.c + ') : la barre reste (' + long.sw + ')', long.h > long.c + 50 && !long.sans && long.sw !== 'none', long);

    /* relecture de la partie X : deux fenêtres à titre NU (un h3 sans .modal-head), enchaînées sans fermeture, passaient pour la même */
    const nue = await S.ev(`try{ closeModal(true); }catch(e){} await new Promise(r=>setTimeout(r,300));
      openModal('<h3 style="margin:0 0 10px">Copies de sauvegarde</h3>'+Array.from({length:60},(_,i)=>'<p>Copie n° '+i+'</p>').join(''),'carte'); await new Promise(r=>setTimeout(r,500));
      const ov=document.getElementById('overlay'); ov.scrollTop=900; await new Promise(r=>setTimeout(r,100)); const y0=ov.scrollTop;
      openModal('<h3 style="margin:0 0 10px">Copie du 12 octobre</h3>'+Array.from({length:60},(_,i)=>'<p>Ligne '+i+'</p>').join(''),'carte'); await new Promise(r=>setTimeout(r,400));
      return {y0, y1:ov.scrollTop};`);
    c('deux fenêtres à titre nu, la seconde ouverte depuis la première : elle s’ouvre EN HAUT (' + nue.y0 + ' → ' + nue.y1 + ' px)', nue.y0 > 300 && nue.y1 === 0, nue);

    console.log('\n3. un champ dans une rangée : le message va sous la rangée (' + J + ')');
    await S.ev(`try{ closeModal(true); }catch(e){} go('utilisateurs'); return 1;`); await dormir(1200);
    await S.ev(`formUser(); return 1;`); await dormir(900); await calme();
    const pret = await S.ev(`const f=document.querySelector('#modal form'), pw=f&&f.elements.pwd; if(!pw) return null;
      f.elements.prenom.value='Léa'; f.elements.nom.value='Roux'+Date.now().toString(36); for(const el of f.querySelectorAll('[required]')){ if(el.value) continue;
        if(el.tagName==='SELECT'){ const o=[...el.options].find(x=>x.value); if(o) el.value=o.value; } else if(el.name!=='pwd') el.value= el.type==='email'?'lea.roux@exemple.fr':'lea'+Date.now().toString(36); }
      pw.value='   '; return {rangee:getComputedStyle(pw.parentElement).display};   /* fait d'espaces : la garde générale le désigne (un champ vide « required » serait arrêté par la bulle du navigateur) */`);
    c('(population) « Nouvel utilisateur » : le mot de passe provisoire est dans une rangée (' + (pret && pret.rangee) + ')', !!pret && /flex/.test(pret.rangee), pret);
    if (pret) {
      await toucher('#modal form [type="submit"], [type="submit"][form]'); await dormir(600); await calme();
      const r = await S.ev(`const pw=document.querySelector('#modal form').elements.pwd, rg=pw.parentElement, n=document.querySelector('#modal .champ-manque-note');
        if(!n) return {note:false, inv:pw.getAttribute('aria-invalid'), toast:document.getElementById('toast').textContent, val:JSON.stringify(pw.value)}; const rn=n.getBoundingClientRect(), rr=rg.getBoundingClientRect(), m=document.getElementById('modal').getBoundingClientRect();
        return {note:true, texte:n.textContent, sousLaRangee:n.previousElementSibling===rg, largeur:Math.round(rn.width), rangee:Math.round(rr.width), deborde:Math.round(rg.scrollWidth-rg.clientWidth), dedans:rr.right<=m.right+1, inv:pw.getAttribute('aria-invalid'), lie:(pw.getAttribute('aria-describedby')||'').indexOf(n.id)>-1};`);
      c('⛔ le message est SOUS la rangée (après elle, pas entre le champ et le 🎲), presque aussi large qu’elle (' + r.largeur + ' / ' + r.rangee + ' px)', r.note && r.sousLaRangee && r.largeur >= 0.9 * r.rangee, r);   // ses marges propres lui retirent quelques pixels ; coincée dans la rangée, elle faisait une colonne étroite
      c('… la rangée ne déborde pas, et le champ est marqué et relié au message', r.note && r.deborde <= 0 && r.dedans && r.inv === 'true' && r.lie, r);
      await capture('rangee-' + theme);
    }
  }

  console.log('\n3 bis. un champ dans une rangée QUI PASSE À LA LIGNE (.frow) : le message reste dedans, sur une ligne à lui');
  await S.ev(`try{ closeModal(true); }catch(e){} return 1;`); await dormir(300);
  await S.ev(`formConducteur(); return 1;`); await dormir(900); await calme();
  const fr = await S.ev(`const f=document.querySelector('#modal form'), el=f&&f.elements.prenom; if(!el) return null; const p=el.parentElement;
    if(!p.classList.contains('frow')) return {frow:false, parent:p.className}; el.value='   '; if(f.elements.nom) f.elements.nom.value='Roux';
    for(const x of f.querySelectorAll('[required]')){ if(!x.value&&x!==el){ if(x.tagName==='SELECT'){ const o=[...x.options].find(z=>z.value); if(o) x.value=o.value; } else x.value='x'; } }
    return {frow:true};`);
  c('(population) « Nouveau conducteur » : le prénom est posé directement dans une rangée .frow', !!fr && fr.frow, fr);
  if (fr && fr.frow) {
    await toucher('#modal form [type="submit"], [type="submit"][form]'); await dormir(600); await calme();
    const r = await S.ev(`const el=document.querySelector('#modal form').elements.prenom, p=el.parentElement, n=document.querySelector('#modal .champ-manque-note'); if(!n) return {note:false};
      const rn=n.getBoundingClientRect(), rp=p.getBoundingClientRect(), re=el.getBoundingClientRect(), pad=parseFloat(getComputedStyle(p).paddingLeft);
      return {note:true, dansLaRangee:n.parentElement===p, apresLeChamp:n.previousElementSibling===el, sous:rn.top>=re.bottom-1, retrait:Math.round(rn.left-rp.left), pad:Math.round(pad), largeur:Math.round(rn.width), interieur:Math.round(rp.width-2*pad)};`);
    c('⛔ le message reste DANS la rangée, juste après le champ, sous lui, au retrait de la rangée (' + r.retrait + ' px pour ' + r.pad + ') — sorti, il se collait au bord de la carte', r.note && r.dansLaRangee && r.apresLeChamp && r.sous && Math.abs(r.retrait - r.pad) <= 3, r);
    c('… sur une ligne à lui (' + r.largeur + ' px pour ' + r.interieur + ')', r.note && r.largeur >= r.interieur - 4, r);
    await capture('frow-conducteur');
  }

  console.log('\n4. « ↩︎ Annuler » : il survit à une suppression refusée, et ce qu’il dit se voit');
  await S.ev(`try{ closeModal(true); }catch(e){} (typeof setThemePrefNu==='function'?setThemePrefNu:setThemePref)('light');
    db.vehicules=db.vehicules||[]; for(const [id,im] of [['vx1','AB-123-CD'],['vx2','EF-456-GH']]) if(!db.vehicules.some(v=>v.id===id)) db.vehicules.push({id,immat:im,plaque:im,marque:'Kangoo'}); save(); go('vehicules'); return 1;`); await dormir(1200);
  const sup = await S.ev(`window.confirm=()=>true; delItem('vehicules','vx1'); await new Promise(r=>setTimeout(r,300));
    window.confirm=()=>false; delItem('vehicules','vx2'); await new Promise(r=>setTimeout(r,300)); window.confirm=()=>true;
    const t=document.getElementById('toast'); return {vx1:db.vehicules.some(v=>v.id==='vx1'), vx2:db.vehicules.some(v=>v.id==='vx2'), toast:t.textContent, bouton:!!t.querySelector('.tst-an')};`);
  c('(population) le véhicule supprimé est parti, le second (boîte refusée) est resté, le premier toast est encore là avec « Annuler »', !sup.vx1 && sup.vx2 && sup.bouton && /AB-123-CD/.test(sup.toast), sup);
  const an = await S.ev(`const b=document.querySelector('#toast .tst-an'); b.click(); await new Promise(r=>setTimeout(r,500)); const t=document.getElementById('toast'), cs=getComputedStyle(t);
    return {vx1:db.vehicules.some(v=>v.id==='vx1'), show:t.classList.contains('show'), texte:t.textContent, opacite:+cs.opacity};`);
  c('⛔ « ↩︎ Annuler » remet le PREMIER (la suppression refusée ne l’a pas rendu muet)', an.vx1, an);
  c('⛔ … et le toast « Rétabli » se VOIT (affiché, opaque, 500 ms après) — il était retiré dans le même geste', an.show && /Rétabli/.test(an.texte) && an.opacite > 0.9, an);
  await S.ev(`db.vehicules=db.vehicules.filter(v=>!/^vx/.test(v.id)); save(); return 1;`);

  console.log('\n5. un refus des bons se lit par-dessus « Ma commande »');
  const bon = await S.ev(`try{ closeModal(true); }catch(e){} go('bons'); await new Promise(r=>setTimeout(r,800)); formBon(); await new Promise(r=>setTimeout(r,900));
    if(!document.getElementById('bonform')) return {form:false}; bonLignes.length=0; bonLignes.push({designation:'Raticide pâte 10 kg',produitId:'',qteCtn:0,qteU:0,ctn:0,u:0,qte:0}); try{ renderBonLignes&&renderBonLignes(); }catch(e){}
    bonValider(); await new Promise(r=>setTimeout(r,700)); const t=document.getElementById('toast'), q=document.getElementById('bon-qty');
    return {form:true, panneau:!!q, toast:t.classList.contains('show')?t.textContent:'', err:t.classList.contains('tst-err'), zt:+getComputedStyle(t).zIndex, zq:q?+getComputedStyle(q).zIndex:null};`);
  c('(population) le bon aux quantités à 0 est refusé, « Ma commande » s’ouvre, le toast d’erreur est posé', bon.form && bon.panneau && /quantités sont à 0/.test(bon.toast), bon);
  c('… avec UN signe : la pastille « ! » de l’erreur, sans l’émoji « ⚠️ » devant (deux signes côte à côte)', bon.err && /^Toutes les quantités/.test(bon.toast), bon.toast);
  if (bon.panneau) {
    const r = await S.ev(`const t=document.getElementById('toast').getBoundingClientRect(); return {x:t.left, y:t.top, w:t.width, h:t.height, sx:scrollX, sy:scrollY};`);
    const lire = async () => { const im = await S.c.envoyer('Page.captureScreenshot', { format: 'png', clip: { x: r.x + r.sx + 6, y: r.y + r.sy + 4, width: Math.max(10, r.w - 12), height: Math.max(6, r.h - 8), scale: 1 } }); return decoder(Buffer.from(im.data, 'base64')); };
    const A = await lire(); await S.ev(`document.getElementById('toast').style.visibility='hidden'; await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); return 1;`);
    const B = await lire(); await S.ev(`document.getElementById('toast').style.visibility=''; return 1;`);
    const ecart = (X, Y) => { let d = 0; for (let k = 0; k < Math.min(X.data.length, Y.data.length); k += 4) if (Math.abs(X.data[k] - Y.data[k]) + Math.abs(X.data[k + 1] - Y.data[k + 1]) + Math.abs(X.data[k + 2] - Y.data[k + 2]) > 24) d++; return d / (X.data.length / 4); };
    const part = ecart(A, B);
    /* l'étalon : le même toast forcé à 320 (sa couche d'avant) — sous le panneau, le cacher ne change rien */
    await S.ev(`document.getElementById('toast').style.zIndex='320'; await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); return 1;`);
    const A2 = await lire(); await S.ev(`document.getElementById('toast').style.visibility='hidden'; await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); return 1;`);
    const B2 = await lire(); await S.ev(`const t=document.getElementById('toast'); t.style.visibility=''; t.style.zIndex=''; return 1;`);
    const dessous = ecart(A2, B2);
    c('⛔ au pixel, le toast est PEINT par-dessus le panneau : ' + Math.round(part * 100) + ' % de sa surface change quand on le cache — forcé à son ancienne couche (320), ' + Math.round(dessous * 100) + ' % (z-index ' + bon.zt + ' contre ' + bon.zq + ')', part > 0.08 && dessous < 0.01 && bon.zt > bon.zq, { part, dessous, zt: bon.zt, zq: bon.zq });
    await capture('bon-refus');
    await S.ev(`try{ bonQtyClose(); }catch(e){} try{ closeModal(true); }catch(e){} return 1;`);
  }

  console.log('\n6. tableau de bord (Mac, souris) : reprendre une carte pendant que la précédente se pose');
  const M = PROFILS.mac14; await poserProfil(S, M); await S.ev(`setPlatForce('${M.plat}'); go('dashboard'); return 1;`); await dormir(1500); await calme();
  const C0 = await S.ev(`window.__o0=JSON.stringify(dashLayout()); return [...document.querySelectorAll('.kpis .kpi[data-dk]')].map(e=>{ const r=e.getBoundingClientRect(); return {k:e.dataset.dk,x:r.left+r.width/2,y:r.top+r.height/2}; });`);
  c('(population) au moins trois cartes', C0.length >= 3, C0.length);
  if (C0.length >= 3) {
    const souris = (type, x, y) => S.c.envoyer('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
    const glisse = async (de, vers) => { await S.c.envoyer('Input.dispatchMouseEvent', { type: 'mouseMoved', x: de.x, y: de.y }); await souris('mousePressed', de.x, de.y);
      for (let i = 1; i <= 8; i++) await souris('mouseMoved', Math.round(de.x + (vers.x - de.x) * i / 8), Math.round(de.y + (vers.y - de.y) * i / 8)); };
    await glisse(C0[0], C0[2]); await souris('mouseReleased', C0[2].x, C0[2].y);
    await dormir(60);   // la première carte se pose (300 ms) : on reprend PENDANT
    const B = await S.ev(`return [...document.querySelectorAll('.kpis .kpi[data-dk]')].map(e=>{ const r=e.getBoundingClientRect(); return {k:e.dataset.dk,x:r.left+r.width/2,y:r.top+r.height/2}; });`);
    const prise = B.find(x => x.k === C0[1].k);
    await glisse(prise, B[B.length - 1]); await dormir(400);
    const tenue = await S.ev(`const e=document.querySelector('.kpis .kpi[data-dk="${C0[1].k}"]'); return {scale:e.style.scale, enreg:JSON.stringify(dashLayout())!==__o0, ordre:dashLayout(), avant:JSON.parse(__o0), C0:${JSON.stringify(C0.map(x=>[x.k,Math.round(x.x),Math.round(x.y)]))}, prise:${JSON.stringify(prise)}};`);
    c('⛔ reprise pendant la pose : la première pose est enregistrée, et la carte tenue reste soulevée 400 ms après (la fin de l’ancienne pose ne la remet plus à zéro)', tenue.enreg && tenue.scale === '1.04', tenue);
    await souris('mouseReleased', B[B.length - 1].x, B[B.length - 1].y); await dormir(700);
    const fin = await S.ev(`const g=[...document.querySelectorAll('.kpis .kpi[data-dk]')].map(e=>e.dataset.dk), l=dashLayout().filter(k=>g.includes(k));
      return {grille:g, ordre:l, styles:[...document.querySelectorAll('.kpis .kpi[data-dk]')].filter(e=>e.style.translate||e.style.scale||e.style.transform).length};`);
    c('⛔ … et l’ordre MONTRÉ est l’ordre ENREGISTRÉ (' + fin.grille.join(', ') + ')', JSON.stringify(fin.grille) === JSON.stringify(fin.ordre) && fin.styles === 0, fin);
    await S.ev(`const l=dashLayout(); l.length=0; JSON.parse(__o0).forEach(x=>l.push(x)); save(); go('dashboard'); return 1;`); await dormir(600);
  }

  console.log('\n7. une photo ouverte, puis la déconnexion');
  await poserProfil(S, P); await S.ev(`setPlatForce('${P.plat}'); return 1;`);
  const ph = await S.ev(`const i=document.createElement('img'); i.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#2a6"/></svg>'); i.style.cssText='width:80px;height:60px';
    document.getElementById('content').prepend(i); photoPlein(i,'Photo'); await new Promise(r=>setTimeout(r,700)); return !!document.querySelector('.vph');`);
  c('(population) la visionneuse est ouverte', ph);
  const lo = await S.ev(`logout(); await new Promise(r=>setTimeout(r,400)); const L=document.getElementById('login'); const r=L.getBoundingClientRect(); const t=document.elementFromPoint(Math.round(r.left+r.width/2),Math.round(r.top+r.height/2));
    return {vph:!!document.querySelector('.vph'), login:getComputedStyle(L).display, dessus:!!t&&L.contains(t), qui:t?(t.id||t.className||t.tagName):null, r:[Math.round(r.width),Math.round(r.height)]};`);
  c('⛔ déconnexion : la photo est retirée, l’écran de connexion est au premier plan (il se dessinait DESSOUS)', !lo.vph && lo.login !== 'none' && lo.dessus, lo);

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  await S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

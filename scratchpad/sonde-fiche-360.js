/* ══ SONDE — LA FICHE D'INTERVENTION SIMPLE (v781) ═══════════════════════════════════════════════
   Justin, 29 octobre 2026 : « un truc beaucoup plus simple par rapport à chaque métier ». Dans la VRAIE page
   (beta.html, 127.0.0.1) : une intervention de plomberie ; on coche une prestation, on tape « ce qui a été fait »,
   on ajoute un produit par la recherche (− / +), on crée une note avant paiement en tapant UN prix, puis on
   termine par le gros bouton — et chaque effet est relu dans `db`.
   Usage : SOURCE=…/beta.html node scratchpad/sonde-fiche-simple.js */
const path = require('path');
const { ouvrir, dormir } = require('/home/user/teamop/scratchpad/pilote.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 600) : '')); } };
(async () => {
  const S = await ouvrir({ source: process.env.SOURCE || path.join(__dirname, '..', 'beta.html') });
  console.log('page mesurée :', S.version);
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove();
    window.pushPropose=function(){}; window.maybeProfilePhoto=function(){}; window.entAccueilCheck=function(){};
    window.__errs=[]; window.addEventListener('error',e=>window.__errs.push(String(e.message)));
    window.__toasts=[]; const t0=window.toast; window.toast=function(m){ window.__toasts.push(String(m)); try{ return t0.apply(this,arguments); }catch(e){} };
    window.proposerAbonnement=function(){};
    db.metier='plomberie'; db.metierPlus=''; db.entreprise={nom:'Plomberie Ouest',adresse:'12 rue des Lilas',cp:'17000',ville:'La Rochelle',siret:'12345678900017',tel:'05 46 11 22 33',email:'contact@po.fr'};
    db.clients=(db.clients||[]).filter(c=>c.id!=='cP').concat([{id:'cP',nom:'Mme Durand',tel:'06 11 22 33 44',email:'durand@ex.fr',adresse:'5 rue Verte, 17000 La Rochelle'}]);
    db.produits=(db.produits||[]).filter(p=>p.id!=='pS').concat([{id:'pS',nom:'Siphon PVC 40',unite:'u',qte:10,prix:4}]);
    db.interventions=(db.interventions||[]).filter(i=>i.id!=='iP').concat([{id:'iP',num:'INT-P1',titre:'Fuite sous évier',type:'Dépannage',clientId:'cP',date:'2026-10-29',heure:'09:00',duree:60,statut:'encours',adresse:'5 rue Verte, 17000 La Rochelle',techIds:[],compteRendu:''}]);
    db.users=(db.users||[]).filter(u=>u.id!=='uP').concat([{id:'uP',prenom:'Justin',nom:'Sonde',login:'justin-sonde',role:'admin',actif:true,pref:{}}]);
    save(); currentUser=db.users.find(u=>u.id==='uP'); enterApp(currentUser); return 1;`);
  await dormir(1500); await S.ev(`try{ closeModal(true); }catch(e){} return 1;`);
  const fs=require('fs'), CAPD='/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/';
  let ok=0, ko=0; const vrai=(t,c,d)=>{ if(c){ok++;console.log('  ✓ '+t);} else {ko++;console.log('  ✗ '+t+(d!==undefined?'  → '+JSON.stringify(d).slice(0,300):''));} };
  for (const theme of ['light','dark']) {
    await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 360, height: 780, deviceScaleFactor: 2, mobile: true });
    await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
    await S.ev(`try{closeModal(true)}catch(e){} detailIntervention('iP'); return 1;`); await dormir(1500);
    const r = await S.ev(`await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth; window.scrollTo(9999,window.scrollY); const sx=window.scrollX; window.scrollTo(0,window.scrollY);
      const m=document.getElementById('modal'); if(m){ m.scrollLeft=9999; } const mx=m?m.scrollLeft:0; if(m) m.scrollLeft=0;
      const b=document.getElementById('int-terminee-gros'); const rb=b?b.getBoundingClientRect():null;
      const txt=(m||document.body).innerText; return {sx, mx, gros:rb?{w:Math.round(rb.width),x:Math.round(rb.x)}:null, nom:!!b&&/Mme Durand/i.test(b.closest('.card').innerText.split('Intervention terminée')[0]), opgestion:/OP GESTION/.test((m||document.body).innerText.replace(/OP GESTION\\s*\\n?\\s*Plomberie/,''))}`);
    const cap = await S.c.envoyer('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(CAPD+'fiche-360-'+theme+'.png', Buffer.from(cap.data,'base64'));
    vrai(theme+' 360 px : rien ne dépasse sur le côté', r.sx===0 && r.mx===0, r);
    vrai(theme+' 360 px : le gros bouton tient dans l’écran', r.gros && r.gros.x>=0 && r.gros.x+r.gros.w<=360, r.gros);
    vrai(theme+' : le client est en tête de fiche', r.nom, r);
  }
  vrai('aucune erreur JavaScript', !S.exceptions.length, S.exceptions.slice(0,3));
  console.log(`\n════ sonde-fiche-360 : ${ok} ✓ ${ko} ✗ ════`); await S.fermer(); process.exit(ko?1:0); })();

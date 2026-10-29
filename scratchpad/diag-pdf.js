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
  await S.ev(`detailIntervention('iP'); return 1;`); await dormir(900);
  await S.ev(`window.__wins=[]; window.open=function(){ const d={html:'',url:''}; __wins.push(d); return { document:{ write(x){ d.html+=x; }, close(){} }, focus(){}, print(){}, close(){ d.ferme=1; }, set location(v){d.url=String(v)}, get location(){ return { set href(v){ d.url=String(v); } }; } }; };
    window.__t=[]; const t0=toast; window.toast=function(m){ __t.push(String(m)); return t0.apply(this,arguments); }; return 1;`);
  await S.ev(`docmForm('devis-depannage',{cid:'cP',iid:'iP'}); return 1;`); await dormir(500);
  if(process.env.SEMER) await S.ev(`db.docsMetier=(db.docsMetier||[]).concat([{id:'dSem',doc:'devis-depannage',num:'DEP-2026-001',date:'2026-10-29',statut:'brouillon',clientId:'cP',interventionId:'iP',v:{tva:'20',lieu:'5 rue Verte'},lignes:[{designation:'Recherche de fuite',qte:'1',pu:'150'}]}]); save(); return 1;`);
  await S.ev(`const d=document.getElementById('docm-q-d'); if(d){ d.value='Recherche de fuite'; d.dispatchEvent(new Event('input',{bubbles:true})); } const p=document.getElementById('docm-q-p'); if(p){ p.value='150'; p.dispatchEvent(new Event('input',{bubbles:true})); } docmSauver(true); return 1;`); await dormir(800);
  console.log('docs:', JSON.stringify(await S.ev(`return (db.docsMetier||[]).map(d=>({id:d.id,def:d.def||d.type,num:d.num,iid:d.interventionId||d.iid}))`)), 'toasts', JSON.stringify(await S.ev(`return __t`)));
  await S.ev(`try{closeModal(true)}catch(e){} detailIntervention('iP'); return 1;`); await dormir(900);
  const btns = await S.ev(`return [...document.querySelectorAll('button')].filter(b=>/^(PDF|Ouvrir|Voir)$/.test(b.textContent.trim())).map(b=>b.getAttribute('onclick'))`);
  console.log('boutons:', JSON.stringify(btns));
  for (const oc of btns) { await S.ev(`window.__err=''; try{ ${oc.replace(/`/g,'\\`')} }catch(e){ __err=String(e&&e.stack||e); } return 1;`); await dormir(2500);
    console.log(oc.slice(0,60), '→', JSON.stringify(await S.ev(`return {err:__err, wins:__wins.map(w=>({url:w.url.slice(0,30),html:w.html.slice(0,80),ferme:w.ferme})), t:__t.slice(-3), modal:!!document.querySelector('#overlay.open')}`)), 'exc', JSON.stringify(S.exceptions.slice(-2)).slice(0,400));
    await S.ev(`window.__wins=[]; try{closeModal(true)}catch(e){} detailIntervention('iP'); return 1;`); await dormir(700); }
  await S.fermer(); process.exit(0); })();

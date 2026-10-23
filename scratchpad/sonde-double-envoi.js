/* ══ SONDE — DEUX TOUCHERS SUR « 📧 ENVOYER » UN DEVIS : UN SEUL COURRIEL, ET LE BOUTON DIT « ENVOI… » ═══════════════════════
   Audit apple-design du 21 octobre 2026 (§ 16 : un retour de statut pour ce qui dure). L'envoi d'un devis attend le PDF puis
   le serveur ; un second toucher relançait tout — le client recevait le devis deux fois. Ici, au vrai doigt (CDP), dans la
   liste des devis d'un iPhone : le serveur d'envoi est remplacé, DANS LA PAGE, par un faux qui répond en 1,5 s et compte les
   départs (`/api/sendmail`). On touche deux fois le 📧 du premier devis, à 150 ms d'écart.
   ⛔ Bêta uniquement, copie locale en 127.0.0.1 — et le faux serveur n'envoie rien à personne. */
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
  const P = PROFILS.tel; await poserProfil(S, P); await S.ev(`setPlatForce('${P.plat}'); return 1;`);
  await S.ev(`window.__envois=0; const vrai=window.fetch.bind(window);
    window.fetch=function(u,o){ if(String(u).indexOf('/api/sendmail')>=0){ window.__envois++; return new Promise(r=>setTimeout(()=>r(new Response('{"ok":true}',{status:200,headers:{'Content-Type':'application/json'}})),1500)); }
      return vrai(u,o).catch(()=>new Response('{}',{status:503})); };
    /* la bêta de démonstration n'a aucun devis : on en pose UN, pour un client qui a une adresse */
    const c=db.clients[0]; if(c&&!c.email) c.email='client-essai@exemple.invalid';
    db.devis=db.devis||[]; db.devis.push({id:'dSonde',num:'DV-SONDE-1',clientId:c.id,statut:'brouillon',date:todayISO(),lignes:[{desc:'Traitement',qte:1,pu:100,tva:20}]});
    save(); return 1;`);
  await S.ev(`go('devis'); return 1;`);
  /* la PREMIÈRE transition après la connexion est lente dans ce Chromium sans écran (l'origine dessine la liste après
     plus d'1,5 s) : on attend les boutons, au lieu d'un délai fixe */
  for (let k = 0; k < 60; k++) { if (await S.ev(`return document.querySelectorAll('#content [onclick*="envoiDoc"]').length>0;`)) break; await dormir(100); }
  await dormir(400);
  const b = await S.ev(`const b=[...document.querySelectorAll('button[onclick^="envoiDoc(\\'devis\\'"][onclick$="\\'mail\\')"]')].find(x=>x.getBoundingClientRect().width>0);
    if(!b) return null; b.scrollIntoView({block:'center'}); await new Promise(f=>setTimeout(f,300)); const r=b.getBoundingClientRect();
    b.setAttribute('data-sonde-envoi','1'); return {x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2), avant:b.innerHTML};`);
  if (!b) { console.log('  ✗ population : aucun bouton « 📧 Envoyer » dans la liste des devis — ' + JSON.stringify(await S.ev(`return {current, n:(db.devis||[]).length, btn:[...document.querySelectorAll('#content [onclick*="envoiDoc"]')].map(x=>x.getAttribute('onclick')).slice(0,4), h1:(document.querySelector('#content h1')||{}).textContent};`))); S.fermer(); process.exit(1); }
  const toucher = async () => { await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x, y: b.y, id: 1 }] }); await dormir(60); await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
  await toucher(); await dormir(150);
  const pendant = await S.ev(`const b=document.querySelector('[data-sonde-envoi]'); return b?b.textContent.trim():null;`);
  await toucher(); await dormir(2600);
  const apres = await S.ev(`const b=document.querySelector('[data-sonde-envoi]'); return {envois:window.__envois, texte:b?b.textContent.trim():null, html:b?b.innerHTML:null, connecte:b?b.isConnected:null, statut:(db.devis.find(d=>d.id==='dSonde')||{}).statut, boutons:[...document.querySelectorAll('#content [onclick*="envoiDoc"]')].length, toasts:(document.getElementById('toast')||{}).textContent};`);
  if (process.env.DIAG) console.log('    diag : ' + JSON.stringify(apres));
  let ok = 0, ko = 0; const c = (t, v, d) => { if (v) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
  c('(population) le premier toucher a bien lancé un envoi', apres.envois >= 1, apres.envois);
  c('⛔ deux touchers : UN seul courriel parti', apres.envois === 1, apres.envois);
  c('pendant l’attente, le bouton dit « Envoi… »', pendant === 'Envoi…', pendant);
  /* la réponse arrivée, le devis passe « envoyé » et la liste se REDESSINE (le bouton marqué peut être remplacé) : ce qui
     compte, c'est qu'aucun bouton ne reste bloqué sur « Envoi… » */
  const bloques = await S.ev(`return document.querySelectorAll('.btn-occupe').length;`);
  c('la réponse arrivée, plus aucun bouton n’est bloqué sur « Envoi… » (le devis est « envoyé »)', bloques === 0 && apres.statut === 'envoye' && (apres.html === null || apres.html === b.avant), { bloques, statut: apres.statut });
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗' + (S.exceptions.length ? '  · exceptions : ' + S.exceptions.slice(0, 3).join(' | ') : ''));
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('⛔ ' + (e.stack || e.message)); process.exit(1); });

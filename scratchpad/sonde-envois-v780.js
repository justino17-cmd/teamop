/* ══ SONDE — LES ENVOIS PARTENT AU NOM DE L'ENTREPRISE, ET RIEN NE PART SANS SON NOM (v780) ══════
   Justin, 29 octobre 2026 : « teste l'envoi au mail aussi au client, pareil fournisseur, attestation
   aussi » ; « si les personnes prennent un abonnement, s'ils créent un autre utilisateur, ils ne
   peuvent pas car ils n'ont pas payé ». Dans la VRAIE page (beta.html, 127.0.0.1), srvMail intercepté :
   rien ne sort, chaque courriel est relu (destinataire, nom d'expéditeur, PDF joint décodé).
   Usage : SOURCE=…/beta.html node scratchpad/sonde-envois-v780.js */
const path = require('path');
const { ouvrir, dormir } = require('/home/user/teamop/scratchpad/pilote.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 500) : '')); } };

(async () => {
  const S = await ouvrir({ source: process.env.SOURCE || path.join(__dirname, '..', 'beta.html') });
  console.log('page mesurée :', S.version);
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove();
    window.pushPropose=function(){}; window.maybeProfilePhoto=function(){}; window.entAccueilCheck=function(){};
    window.__docs=[]; window.__mails=[]; window.__toasts=[]; window.__abo=0;
    window.open=function(){ const d={html:''}; window.__docs.push(d); return { document:{ write(x){ d.html+=x; }, close(){} }, focus(){}, print(){}, close(){}, location:{} }; };
    window.srvMail=async function(to,subject,body,okMsg,cat,box,opts){ window.__mails.push({to,subject,body,opts:opts||null}); return true; };
    const t0=window.toast; window.toast=function(m){ window.__toasts.push(String(m)); try{ return t0.apply(this,arguments); }catch(e){} };
    window.proposerAbonnement=function(){ window.__abo++; };
    localStorage.setItem('elanB_lang','fr'); localStorage.removeItem('elanB_entreprise_nom');
    const T=CVC_TYPES.find(t=>t.comb)||CVC_TYPES[0];
    db.entreprise={}; db.societes=[]; db.societesStyle={};
    db.clients=(db.clients||[]).filter(c=>c.id!=='cE').concat([{id:'cE',nom:'Hôtel des Dunes',email:'direction@hoteldesdunes.fr',adresse:'1 av. de la Plage',codePostal:'17940',ville:'Rivedoux'}]);
    db.fournisseurs=(db.fournisseurs||[]).filter(f=>f.id!=='fE').concat([{id:'fE',nom:'Clim Distribution',email:'commandes@climdistri.fr'}]);
    db.produits=(db.produits||[]).filter(p=>p.id!=='pE').concat([{id:'pE',nom:'Gaz R32 — bouteille 9 kg',unite:'u'}]);
    db.bons=(db.bons||[]).filter(b=>b.id!=='bE').concat([{id:'bE',num:'BC-2026-950',fournisseurId:'fE',societe:'',date:'2026-10-29',statut:'brouillon',lignes:[{produitId:'pE',designation:'Gaz R32 — bouteille 9 kg',qte:2,unite:'u'}]}]);
    db.appareils=(db.appareils||[]).filter(a=>a.id!=='aE').concat([{id:'aE',clientId:'cE',type:T.k,marque:'Daikin',modele:'FTXM35',numSerie:'SN-950'}]);
    db.interventions=(db.interventions||[]).filter(i=>i.id!=='iE').concat([{id:'iE',num:'INT-950',titre:'Entretien chaudière',type:'Entretien',clientId:'cE',date:'2026-10-29',heure:'09:00',statut:'terminee',rapportModele:'',
      compteRendu:'Entretien réalisé, appareil conforme.',appareilIds:['aE'],attestations:{aE:{date:'2026-10-29',conclusion:'Appareil en bon état de fonctionnement'}}}]);
    db.users=(db.users||[]).filter(u=>u.id!=='uE').concat([{id:'uE',prenom:'Justin',nom:'Sonde',login:'justin-sonde',role:'admin',actif:true,pref:{}}]);
    save(); currentUser=db.users.find(u=>u.id==='uE'); enterApp(currentUser); return 1;`);
  await dormir(1500); await S.ev(`try{ closeModal(true); }catch(e){} return 1;`);
  const ouvert = () => S.ev(`const f=document.getElementById('ent-completer'); return !!(f&&f.closest('.open')) ? (f.closest('.modal,#modal,body').innerText||'').slice(0,200) : ''`);
  const fermer = () => S.ev(`try{ closeModal(true); }catch(e){} return 1;`);

  console.log('── 1. SANS NOM d’entreprise : rien ne part ──');
  for (const [nom, js] of [['le rapport d’intervention (imprimer)', `printRapport('iE')`], ['le rapport par e-mail au client', `rapportVia('iE','mail')`],
    ['le bon de commande au fournisseur', `envoiBonEmail('bE')`], ['l’attestation d’entretien au client', `cvcAttestationEnvoyer('iE','aE')`],
    ['le dossier client', `printDossierClient('cE')`], ['le registre', `printRegistre('cE')`]]) {
    await S.ev(`window.__docs=[]; window.__mails=[]; Promise.resolve(${js}).catch(e=>{ window.__err=String(e); }); return 1;`); await dormir(900);
    const r = await S.ev(`return {docs:__docs.filter(d=>d.html.length>200).length, mails:__mails.length, err:window.__err||''}`);
    const t = await ouvert();
    vrai(nom + ' : ne sort pas, et « Ton entreprise » demande le nom', r.docs === 0 && r.mails === 0 && !r.err && /nom de ton entreprise/.test(t), { r, t });
    await fermer();
  }

  console.log('── 2. le nom posé : tout part, à son nom ──');
  await S.ev(`db.entreprise={nom:'Clim Ouest',adresse:'12 rue des Lilas',cp:'17000',ville:'La Rochelle',siret:'12345678900017',tel:'05 46 11 22 33',email:'contact@climouest.fr'}; save(); return 1;`);
  const pdfDe = m => { const a = (m && m.opts && m.opts.atts || [])[0]; return a ? Buffer.from(a.content, 'base64').toString('latin1') : ''; };
  await S.ev(`window.__mails=[]; Promise.resolve(rapportVia('iE','mail')); return 1;`); await dormir(4000);
  let ms = await S.ev(`return __mails`);
  let p = pdfDe(ms[0]);
  vrai('le rapport part au CLIENT (direction@hoteldesdunes.fr), PDF joint', ms.length === 1 && ms[0].to === 'direction@hoteldesdunes.fr' && /^%PDF/.test(p), ms.map(m => ({ to: m.to, s: m.subject })));
  vrai('… le PDF porte « Clim Ouest » et jamais « OP GESTION »', /Clim Ouest/.test(p) && !/OP GESTION/.test(p + (ms[0] || {}).body));
  await fermer();

  await S.ev(`window.__mails=[]; Promise.resolve(envoiBonEmail('bE')); return 1;`); await dormir(3000);
  ms = await S.ev(`return __mails`); p = pdfDe(ms[0]);
  vrai('le bon de commande part au FOURNISSEUR (commandes@climdistri.fr), PDF joint', ms.length === 1 && ms[0].to === 'commandes@climdistri.fr' && /^%PDF/.test(p), ms.map(m => ({ to: m.to, s: m.subject })));
  vrai('… le bon porte « Clim Ouest » et jamais « OP GESTION »', /Clim Ouest/.test(p) && !/OP GESTION/.test(p + (ms[0] || {}).body));

  await S.ev(`window.__mails=[]; window.__toasts=[]; Promise.resolve(cvcAttestationEnvoyer('iE','aE')); return 1;`); await dormir(5000);
  ms = await S.ev(`return __mails`); p = pdfDe(ms[0]);
  const tt = await S.ev(`return __toasts`);
  vrai('l’attestation d’entretien part au CLIENT, PDF joint', ms.length === 1 && ms[0].to === 'direction@hoteldesdunes.fr' && /^%PDF/.test(p), { m: ms.map(m => ({ to: m.to, s: m.subject })), t: tt });
  vrai('… l’attestation porte « Clim Ouest » et jamais « OP GESTION »', /Clim Ouest/.test(p) && !/OP GESTION/.test(p + ((ms[0] || {}).body || '')));
  await fermer();

  console.log('── 3. les places payées ──');
  const pl = await S.ev(`return {places:planPlaces(), users:db.users.length, libre:planPlaceLibre(), essai:essaiCouvreEquipe()}`);
  console.log('   places payées :', pl.places, '· comptes :', pl.users, '· période offerte :', pl.essai);
  await S.ev(`db.forfaitEssai=null; db.forfaitQty=1; window.__abo=0; const n0=db.users.length; window.__n0=n0; return 1;`);
  const pl2 = await S.ev(`return {places:planPlaces(), users:db.users.length, libre:planPlaceLibre()}`);
  if (pl2.libre) await S.ev(`while(planPlaceLibre()){ db.users.push({id:'uRemp'+db.users.length,prenom:'Rempli',nom:''+db.users.length,login:'rempli'+db.users.length,role:'technicien',actif:true}); } window.__n0=db.users.length; return 1;`);
  const valider = () => S.ev(`window.__abo=0; formUser(); const f=document.querySelector('#modal form'); if(!f) return {err:'pas de formulaire'};
    f.prenom.value='Karim'; f.nom.value='Benali'+db.users.length; f.login.value='karim-'+db.users.length; f.pwd.value='motdepasse123'; if(f.email) f.email.value='k'+db.users.length+'@exemple.fr';
    const n0=db.users.length; f.requestSubmit(); await new Promise(r=>setTimeout(r,900)); return {abo:__abo, n0, n:db.users.length, places:planPlaces()};`);
  const r3 = await valider();
  vrai('toutes les places payées sont prises : valider « ＋ Utilisateur » ouvre la page d’abonnement, et AUCUN compte n’est créé', r3.abo >= 1 && r3.n === r3.n0, r3);
  await fermer();
  await S.ev(`db.forfaitQty=(db.forfaitQty||1)+1; return 1;`);
  const r5 = await valider();
  vrai('contre-épreuve : une place de plus payée, le compte se crée, sans page d’abonnement', r5.abo === 0 && r5.n === r5.n0 + 1, r5);
  await fermer();
  const r6 = await valider();
  vrai('… et le compte suivant, qui dépasse de nouveau, est refusé', r6.abo >= 1 && r6.n === r6.n0, r6);
  vrai('aucune erreur JavaScript', !S.exceptions.length, S.exceptions.slice(0, 3));
  console.log(`\n════ sonde-envois-v780 : ${ok} ✓ ${ko} ✗ ════`);
  await S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); process.exit(1); });

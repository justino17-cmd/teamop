/* SONDE — « ＋ Nouveau client… » dans un devis : la fiche client naît avec le devis (v780, 29 octobre 2026) */
const path = require('path');
const { ouvrir, dormir } = require('/home/user/teamop/scratchpad/pilote.js');
let ok = 0, ko = 0; const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + ' → ' + JSON.stringify(d)); } };
(async () => {
  const S = await ouvrir({ source: path.join(__dirname, '..', 'beta.html') });
  await S.ev(`window.horsLigneDebut=function(){}; window.pushPropose=function(){}; window.maybeProfilePhoto=function(){}; window.entAccueilCheck=function(){};
    localStorage.setItem('elanB_lang','fr'); db.entreprise={nom:'TeamOP Test',adresse:'1 rue',cp:'17000',ville:'La Rochelle',siret:'12345678900017'};
    db.users=(db.users||[]).filter(u=>u.id!=='uD').concat([{id:'uD',prenom:'Justin',nom:'Devis',login:'jd',role:'admin',actif:true,pref:{}}]);
    save(); currentUser=db.users.find(u=>u.id==='uD'); enterApp(currentUser); return 1;`);
  await dormir(1500); await S.ev(`try{closeModal(true)}catch(e){} go('devis'); return 1;`); await dormir(700);
  const n0 = await S.ev(`return {c:db.clients.length, d:db.devis.length}`);
  await S.ev(`formDoc('devis'); return 1;`); await dormir(500);
  vrai('la liste des clients propose « ＋ Nouveau client… »', await S.ev(`return [...document.querySelectorAll('#modal select[name=clientId] option')].some(o=>o.value==='__nouveau')`));
  await S.ev(`const s=document.querySelector('#modal select[name=clientId]'); s.value='__nouveau'; s.dispatchEvent(new Event('change',{bubbles:true})); return 1;`); await dormir(300);
  vrai('… et l’ouvre : Nom (obligatoire) et Prénom paraissent', await S.ev(`const n=document.getElementById('doc-cli-nom'); return !!n&&n.required&&!!document.getElementById('doc-cli-prenom')`));
  await S.ev(`const v=(i,x)=>{document.getElementById(i).value=x;}; v('doc-cli-nom','Durand'); v('doc-cli-prenom','Marie'); v('doc-cli-adr','5 rue des Pins'); v('doc-cli-ville','17000 La Rochelle'); v('doc-cli-tel','06 11 22 33 44'); v('doc-cli-email','marie.durand@exemple.fr');
    const l=document.querySelector('#lignes-box input'); if(l){ l.value='Entretien chaudière'; l.dispatchEvent(new Event('input',{bubbles:true})); } formLignes[0]={designation:'Entretien chaudière',qte:1,pu:120};
    document.querySelector('#modal form').requestSubmit(); return 1;`); await dormir(700);
  const r = await S.ev(`const c=db.clients.find(x=>x.email==='marie.durand@exemple.fr'); const d=db.devis[db.devis.length-1]; return {n:db.clients.length, nd:db.devis.length, c, did:d&&d.clientId}`);
  vrai('le client est créé (Marie Durand, adresse, CP, ville, téléphone, e-mail)', r.n === n0.c + 1 && r.c && r.c.nom === 'Marie Durand' && r.c.codePostal === '17000' && r.c.ville === 'La Rochelle' && r.c.tel && r.c.adresse === '5 rue des Pins', r);
  vrai('… et le devis est à son nom', r.nd === n0.d + 1 && r.c && r.did === r.c.id, r);
  await S.ev(`try{closeModal(true)}catch(e){} formDoc('devis'); const s=document.querySelector('#modal select[name=clientId]'); s.value='__nouveau'; s.dispatchEvent(new Event('change',{bubbles:true})); return 1;`); await dormir(300);
  await S.ev(`document.getElementById('doc-cli-nom').value='Annulé'; closeModal(); return 1;`); await dormir(300);
  vrai('Annuler : aucune fiche client n’est créée', await S.ev(`return !db.clients.some(c=>c.nom==='Annulé')`));
  vrai('aucune erreur JavaScript', !S.exceptions.length, S.exceptions.slice(0, 2));
  console.log(`════ sonde-devis-nouveau-client : ${ok} ✓ ${ko} ✗ ════`); await S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('✗ ' + e.stack); process.exit(1); });

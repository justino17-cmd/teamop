/* SONDE — la bêta reçoit une entreprise de TEST sans fenêtre ; « Plus tard » tient sept jours (v780, 29 octobre 2026) */
const path = require('path');
const { ouvrir, dormir } = require('/home/user/teamop/scratchpad/pilote.js');
let ok = 0, ko = 0; const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + ' → ' + JSON.stringify(d)); } };
(async () => {
  const S = await ouvrir({ source: path.join(__dirname, '..', 'beta.html') });
  await S.ev(`window.horsLigneDebut=function(){}; window.pushPropose=function(){}; window.maybeProfilePhoto=function(){};
    localStorage.setItem('elanB_lang','fr'); localStorage.removeItem('elanB_ent_plus_tard'); db.entreprise={}; db.users=(db.users||[]).filter(u=>u.id!=='uZ').concat([{id:'uZ',prenom:'Justin',nom:'Test',login:'jt',role:'admin',actif:true,pref:{}}]);
    save(); currentUser=db.users.find(u=>u.id==='uZ'); enterApp(currentUser); return 1;`);
  await dormir(1500); await S.ev(`try{closeModal(true)}catch(e){} entAccueilCheck(); return 1;`); await dormir(800);
  const r = await S.ev(`return {e:db.entreprise, modal:!!document.querySelector('#ent-completer'), manque:docMentionsManquantes('')}`);
  vrai('bêta : l\'entreprise de test est posée (nom, adresse, SIRET), plus aucune mention manquante', r.e.nom === 'TeamOP Test' && r.e.siret === '12345678900017' && !r.manque.length, r);
  vrai('… sans fenêtre « Ton entreprise »', !r.modal, r);
  await S.ev(`db.entreprise={nom:'Ma Boîte'}; save(); entAccueilCheck(); return 1;`); await dormir(500);
  const r2 = await S.ev(`return db.entreprise`);
  vrai('un nom déjà écrit n\'est JAMAIS remplacé (seuls les champs vides se remplissent)', r2.nom === 'Ma Boîte' && r2.siret === '12345678900017', r2);
  await S.ev(`localStorage.setItem('elanB_ent_plus_tard', String(Date.now()-3*864e5)); return 1;`);
  vrai('« Plus tard » il y a 3 jours : encore actif', await S.ev(`return entPlusTardActif()`));
  await S.ev(`localStorage.setItem('elanB_ent_plus_tard', String(Date.now()-8*864e5)); return 1;`);
  vrai('… il y a 8 jours : la question revient', await S.ev(`return !entPlusTardActif()`));
  vrai('aucune erreur JavaScript', !S.exceptions.length, S.exceptions.slice(0, 2));
  console.log(`════ sonde-ent-beta : ${ok} ✓ ${ko} ✗ ════`); await S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('✗ ' + e.stack); process.exit(1); });

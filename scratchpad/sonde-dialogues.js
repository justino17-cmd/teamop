/* ══ SONDE — LES GESTES RÉVERSIBLES SE DÉFONT DANS LA PAGE, SANS BOÎTE DU NAVIGATEUR (audit apple-design, 19, 20, 30, 31) ══════
   Dans la vraie page (iPhone), window.confirm et window.alert sont remplacés par des doubles qui COMPTENT (et répondent
   « oui ») ; on joue chaque geste par sa vraie fonction, puis on touche le vrai « ↩︎ Annuler » du toast (un clic sur le
   bouton, pas un appel) et on compare la base avant / après :
     · remettre une absence en attente ; rouvrir l'organisation d'un jour ; supprimer un véhicule (la boîte le NOMME) ;
     · la proposition d'abonnement : une feuille de l'application (#overlay2), avec un bouton qui dit ce qu'il fait ;
     · valider un bon vide : un toast d'erreur, pas une boîte.
   CAPTURES=dossier : la feuille d'abonnement, jour et nuit.  ⛔ Bêta uniquement, 127.0.0.1. */
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
  const P = PROFILS.tel; await poserProfil(S, P); await S.ev(`setPlatForce('${P.plat}'); return 1;`);
  await S.ev(`window.__boites=[]; window.confirm=function(m){ __boites.push('confirm: '+String(m).slice(0,90)); return true; }; window.alert=function(m){ __boites.push('alert: '+String(m).slice(0,90)); };
    db.absences=db.absences||[]; const t=(db.techniciens||[])[0]||{id:'t0'}; db.absences.push({id:'abSonde',techId:t.id,du:todayISO(),au:todayISO(),type:'conge',statut:'refuse',motif:'pas de remplaçant',parQui:'Justin B',leQuand:Date.now()-3600000});
    db.vehicules=db.vehicules||[]; db.vehicules.push({id:'vS1',immat:'AA-111-AA'},{id:'vS2',immat:'AB-123-CD'},{id:'vS3',immat:'ZZ-999-ZZ'}); save(); return 1;`);
  let ok = 0, ko = 0; const c = (t, v, d) => { if (v) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
  const boites = () => S.ev(`return window.__boites.splice(0);`);
  const toucherAnnuler = () => S.ev(`const b=document.querySelector('#toast .tst-an'); if(!b) return false; b.click(); return true;`);

  console.log('\n1. remettre une absence en attente');
  const a0 = await S.ev(`return JSON.stringify(db.absences.find(x=>x.id==='abSonde'));`);
  await S.ev(`go('absences'); return 1;`); await dormir(1200);
  await S.ev(`absRouvrir('abSonde'); return 1;`); await dormir(300);
  c('aucune boîte du navigateur', !(await boites()).length);
  c('la demande est en attente', (await S.ev(`return db.absences.find(x=>x.id==='abSonde').statut;`)) === 'attente');
  c('« ↩︎ Annuler » est là, et on le touche', await toucherAnnuler()); await dormir(300);
  const a1 = await S.ev(`return JSON.stringify(Object.assign({},db.absences.find(x=>x.id==='abSonde'),{_m:undefined}));`);
  c('… la décision d’avant est rétablie, champ pour champ', JSON.stringify(Object.assign({}, JSON.parse(a0), { _m: undefined })) === a1, { a0, a1 });

  console.log('\n2. rouvrir l’organisation d’un jour');
  const d = await S.ev(`return todayISO();`);
  await S.ev(`go('planning'); orgaValider('${d}'); return 1;`); await dormir(900);
  const o0 = await S.ev(`return JSON.stringify(db.planOrga['${d}']);`);
  await S.ev(`orgaRouvrir('${d}'); return 1;`); await dormir(300);
  c('aucune boîte du navigateur', !(await boites()).length);
  c('l’organisation est rouverte', !(await S.ev(`return !!db.planOrga['${d}'];`)));
  c('« ↩︎ Annuler » touché', await toucherAnnuler()); await dormir(300);
  c('… elle est refermée telle qu’elle était', (await S.ev(`return JSON.stringify(db.planOrga['${d}']);`)) === o0);

  console.log('\n3. supprimer un véhicule');
  await S.ev(`delItem('vehicules','vS2'); return 1;`); await dormir(400);
  const b3 = await boites();
  c('la boîte NOMME ce qu’elle supprime', b3.length === 1 && /Supprimer le véhicule « AB-123-CD » \?/.test(b3[0]), b3);
  c('« ↩︎ Annuler » touché', await toucherAnnuler()); await dormir(400);
  c('… le véhicule est revenu, à sa place', (await S.ev(`return db.vehicules.filter(v=>/^vS/.test(v.id)).map(v=>v.id).join(',');`)) === 'vS1,vS2,vS3');

  console.log('\n4. la proposition d’abonnement');
  for (const theme of CAP ? ['light', 'dark'] : ['light']) {
    await S.ev(`setThemePref('${theme}'); go('dashboard'); return 1;`); await dormir(1200);
    await S.ev(`proposerAbonnement(); return 1;`); await dormir(700);
    const f = await S.ev(`const o=document.getElementById('overlay2'); return {ouverte:o.classList.contains('open'), boutons:[...o.querySelectorAll('button')].map(b=>b.textContent.trim())};`);
    c('(' + theme + ') aucune boîte : une feuille de l’application', !(await boites()).length && f.ouverte, f);
    c('(' + theme + ') … avec un bouton qui dit ce qu’il fait, et « Plus tard »', f.boutons.includes('Ouvrir la page de paiement') && f.boutons.includes('Plus tard'), f.boutons);
    if (CAP) { await dormir(500); const img = await S.c.envoyer('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(CAP, 'abonnement-' + theme + '.png'), Buffer.from(img.data, 'base64')); }
    await S.ev(`closeSub(); return 1;`); await dormir(500);
  }

  console.log('\n5. valider un bon vide');
  await S.ev(`go('bons'); return 1;`); await dormir(1200);
  await S.ev(`try{ formBon(); }catch(e){} return 1;`); await dormir(700);
  await S.ev(`try{ bonLignes=[]; bonValider(''); }catch(e){ window.__err=e.message; } return 1;`); await dormir(300);
  const t5 = await S.ev(`const t=document.getElementById('toast'); return {txt:t.textContent, err:t.classList.contains('tst-err'), ex:window.__err||''};`);
  c('pas de boîte : un toast d’ERREUR (« Ta commande est vide… »)', !(await boites()).length && /commande est vide/.test(t5.txt) && t5.err, t5);

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗' + (S.exceptions.length ? '  · exceptions : ' + S.exceptions.slice(0, 3).join(' | ') : ''));
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('⛔ ' + (e.stack || e.message)); process.exit(1); });

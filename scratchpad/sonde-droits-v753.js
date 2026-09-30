/* ══ SONDE — LES TROIS POINTS DES DROITS DANS LA VRAIE PAGE (v753) ═══════════════════════════════
   Le banc (test-821) exécute les vraies fonctions ; ici on mesure ce que l'ÉCRAN fait, dans la bêta :
   A. l'éditeur : un VRAI clic souris sur « Valider les mouvements… » ouvre et verrouille « Validations
      DR » avec sa raison ; un second clic le rend ; « ✓ Valider ses droits » enregistre la case et la
      valeur PROPRE du menu (fermé), pas l'ouverture d'office ;
   B. connecté comme ce technicien valideur : « Validations DR » est au menu, l'écran s'ouvre, et l'alerte
      « à valider » d'une demande en attente lui parvient ;
   C. connecté comme technicien SOUMIS : le menu, l'écran, et SON mouvement « En attente du DR » dedans ;
   D. un technicien ordinaire : rien de tout ça ;
   E. un rôle créé à la main : les droits du technicien (« Modifier les plans d'appâtage ») et son menu ;
   F. les textes : le choix « aucun profil », l'aide du rôle, la fenêtre « 🏷 Rôles » ;
   G. « ＋ Nouveau profil », au clic : aucun droit de la liste du technicien coché d'avance, ni enregistré ;
      (v754) TOUT décoché — menus, droits, gestes — même sous « Toute sortie de stock passe par le DR ».
   ⛔ Bêta locale, 127.0.0.1, données fictives. SOURCE=<bêta d'avant> pour la contre-épreuve : la v752
   doit tomber sur A, B, C, E et F ; la v753 d'avant la relecture, sur G ; la v753 publiée, sur le « tout
   décoché » de G (v754). */
const path = require('path');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
let ok = 0, ko = 0; const vrai = (t, c, d) => { c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c || d === undefined ? '' : '  → ' + JSON.stringify(d))); };

async function cliquer(S, sel) {
  const r = await S.ev(`const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null;
    e.scrollIntoView({block:'center'}); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const b=e.getBoundingClientRect(); const x=b.left+b.width/2, y=b.top+b.height/2; const t=document.elementFromPoint(x,y);
    return {x,y,w:b.width,h:b.height,atteint:!!t&&(t===e||e.contains(t))};`);
  if (!r || !r.w || !r.atteint) return r || false;
  for (const type of ['mousePressed', 'mouseReleased'])
    await S.c.envoyer('Input.dispatchMouseEvent', { type, x: r.x, y: r.y, button: 'left', clickCount: 1 });
  await dormir(250);
  return true;
}
const connecter = (S, id) => S.ev(`try{ logout(); }catch(e){} await new Promise(r=>setTimeout(r,150));
  const u=db.users.find(x=>x.id==='${id}'); currentUser=u; enterApp(u); await new Promise(r=>setTimeout(r,800)); try{ closeModal(true); }catch(e){}
  return [...new Set([...document.querySelectorAll('#nav .nav-item[data-view]')].map(e=>e.dataset.view))];`);
const interrupteur = (S, uid) => S.ev(`const i=document.querySelector('#usr-d-${uid} input[data-d="mod_validations"]'); if(!i) return null;
  const n=i.closest('.perm-row')&&i.closest('.perm-row').querySelector('[data-val-note]');
  return {checked:i.checked, disabled:i.disabled, force:i.dataset.valForce||'', av:i.dataset.valAv||'', note:n?n.textContent:null, noteVisible:n?getComputedStyle(n).display!=='none':null};`);

(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove();
    window.pushPropose=function(){}; return 1;`);
  for (let i = 0; i < 100; i++) { if (await S.ev('return !!(db&&db.permsRepris)')) break; await dormir(300); }
  const pop = await S.ev(`db.forfaitQty=5;
    db.roles=[{cle:'r_tech3d_ab12',nom:'Technicien 3D',tech:true,chef:false}];
    db.users=[{id:'uA',prenom:'Ada',nom:'Admin',login:'ada',role:'admin',actif:true,pref:{}},
      {id:'uT',prenom:'Tom',nom:'Ordinaire',login:'tom',role:'technicien',actif:true,pref:{}},
      {id:'uV',prenom:'Val',nom:'Valideur',login:'val',role:'technicien',actif:true,pref:{}},
      {id:'uS',prenom:'Sam',nom:'Soumis',login:'sam',role:'technicien',actif:true,pref:{},boxValidDR:true},
      {id:'uR',prenom:'Rémi',nom:'Maison',login:'remi',role:'r_tech3d_ab12',actif:true,pref:{}}];
    db.boxes=(db.boxes||[]).filter(b=>b&&b.id!=='bxS').concat([{id:'bxS',nom:'Box Sud',numero:'S1',actif:true,visibleTous:true,stock:{}}]);
    db.boxMvtAttente=[{id:'mvS',type:'arrivage',boxId:'bxS',par:'Sam Soumis',parId:'uS',ts:Date.now(),statut:'enAttente',lignes:[]}];
    db.demandes=[{id:'dmS',num:'DC-2026-900',date:todayISO(),boxId:'bxS',boxNom:'Box Sud',lignes:[],chefId:'uS',chefNom:'Sam Soumis',statut:'enAttente'}];
    save();
    return {users:db.users.length, liste:!!(db.permissions&&db.permissions.technicien), valTech:db.permissions.technicien.validations,
      plans:!!(db.permissions.technicien.caps&&db.permissions.technicien.caps.modifierPlans)};`);
  vrai('population : cinq comptes, la liste du technicien ferme « Validations DR » et ouvre « Modifier les plans »',
    pop.users === 5 && pop.liste && pop.valTech === false && pop.plans, pop);

  console.log('\n── A. l’éditeur, à la souris ──');
  await connecter(S, 'uA');
  await S.ev(`go('utilisateurs'); await new Promise(r=>setTimeout(r,500)); usrDeplier('uV'); await new Promise(r=>setTimeout(r,400));
    const d=[...document.querySelectorAll('#usr-d-uV details.usr-cat')].find(x=>/Achats internes/.test(x.querySelector('summary').textContent)); if(d) d.open=true; return !!d;`);
  const avant = await interrupteur(S, 'uV');
  vrai('population : la ligne de Val est dépliée, « Validations DR » fermé et libre', !!avant && !avant.checked && !avant.disabled, avant);
  const c1 = await cliquer(S, '#usr-d-uV label.switch:has(input[data-d="cap_validerDR"])');
  vrai('le clic atteint bien l’interrupteur « Valider les mouvements… » (pas un voisin)', c1 === true, c1);
  const apres = await interrupteur(S, 'uV');
  vrai('⛔⛔ au clic, « Validations DR » s’ouvre ET se verrouille, en direct', !!apres && apres.checked && apres.disabled && apres.force === '1', apres);
  vrai('⛔ … et la raison s’écrit dessous', !!apres && apres.noteVisible && /Ouvert d’office : il valide/.test(apres.note || ''), apres && apres.note);
  await cliquer(S, '#usr-d-uV label.switch:has(input[data-d="cap_validerDR"])');
  const retour = await interrupteur(S, 'uV');
  vrai('⛔ un second clic le rend : fermé, libre, la raison effacée', !!retour && !retour.checked && !retour.disabled && retour.noteVisible === false, retour);
  await cliquer(S, '#usr-d-uV label.switch:has(input[data-d="cap_validerDR"])');
  const cV = await cliquer(S, '#usr-d-uV .usr-b button.btn');
  await dormir(2200);
  const ecrit = await S.ev(`const u=db.users.find(x=>x.id==='uV'); return {cap:u.acces&&u.acces.caps&&u.acces.caps.validerDR, mod:u.acces&&u.acces.modules&&u.acces.modules.validations};`);
  vrai('« ✓ Valider ses droits » est atteint et enregistre la case', cV === true && ecrit.cap === true, [cV, ecrit]);
  vrai('⛔⛔ … et la valeur PROPRE du menu (fermé), pas l’ouverture d’office', ecrit.mod === false, ecrit);
  const soumisLigne = await S.ev(`usrOuvert=''; usrDeplier('uS'); await new Promise(r=>setTimeout(r,400));
    const i=document.querySelector('#usr-d-uS input[data-d="mod_validations"]'); const n=i&&i.closest('.perm-row').querySelector('[data-val-note]');
    return i?{checked:i.checked,disabled:i.disabled,note:n?n.textContent:null}:null;`);
  vrai('⛔ la ligne de Sam (soumis) : ouvert, verrouillé, « il y suit ses mouvements »', !!soumisLigne && soumisLigne.checked && soumisLigne.disabled && /suit ses mouvements/.test(soumisLigne.note || ''), soumisLigne);

  console.log('\n── B. connecté comme Val, technicien valideur ──');
  const mV = await connecter(S, 'uV');
  vrai('⛔⛔ « Validations DR » est à son menu', mV.includes('validations'), mV);
  const vueV = await S.ev(`go('validations'); await new Promise(r=>setTimeout(r,600)); return current;`);
  vrai('⛔ … l’écran s’ouvre (pas de retour au tableau de bord)', vueV === 'validations', vueV);
  const notV = await S.ev(`return computeNotifs().map(n=>n.id);`);
  vrai('⛔⛔ … et l’alerte « à valider » de la demande de Sam lui parvient', notV.includes('dem:dmS'), notV.slice(0, 8));

  console.log('\n── C. connecté comme Sam, technicien soumis ──');
  const mS = await connecter(S, 'uS');
  vrai('⛔⛔ « Validations DR » est à son menu', mS.includes('validations'), mS);
  const vueS = await S.ev(`go('validations'); await new Promise(r=>setTimeout(r,600));
    return {vue:current, mvt:!!document.querySelector('#content [data-mvt="mvS"]'), attente:/En attente du DR/.test(document.getElementById('content').textContent)};`);
  vrai('⛔ … l’écran s’ouvre, avec SON mouvement « En attente du DR »', vueS.vue === 'validations' && vueS.mvt && vueS.attente, vueS);
  const notS = await S.ev(`return computeNotifs().map(n=>n.id).filter(x=>/^(dem|mvatt):/.test(x));`);
  vrai('… mais aucune alerte « à valider » (il ne valide pas)', notS.length === 0, notS);

  console.log('\n── D. connecté comme Tom, technicien ordinaire ──');
  const mT = await connecter(S, 'uT');
  vrai('rien à son menu', !mT.includes('validations'), mT);
  const vueT = await S.ev(`go('validations'); await new Promise(r=>setTimeout(r,600)); return current;`);
  vrai('… et l’adresse le ramène au tableau de bord', vueT !== 'validations', vueT);

  console.log('\n── E. un rôle créé à la main ──');
  const mR = await connecter(S, 'uR');
  const capR = await S.ev(`const r=db.users.find(x=>x.id==='uR'), t=db.users.find(x=>x.id==='uT');
    return {r:userCap(r,'modifierPlans'), t:userCap(t,'modifierPlans'), toutes:USER_CAPS.map(c=>c[0]).filter(k=>userCap(r,k)!==userCap(t,k))};`);
  vrai('⛔⛔ Rémi (« Technicien 3D ») a « Modifier les plans d’appâtage », comme Tom', capR.r === true && capR.t === true, capR);
  vrai('⛔ … et exactement les mêmes cases', capR.toutes.length === 0, capR.toutes);
  vrai('… et le même menu', JSON.stringify(mR.slice().sort()) === JSON.stringify(mT.slice().sort()), { rémi: mR.length, tom: mT.length });

  console.log('\n── F. les textes ──');
  await connecter(S, 'uA');
  const txt = await S.ev(`formUser(); await new Promise(r=>setTimeout(r,300));
    const o=document.querySelector('#nu-profil option'); const m=document.querySelector('.modal')||document.body;
    const r={option:o?o.textContent:null, aide:/Le rôle est un nom, et un point de départ/.test(m.textContent), faux:/partira sans droits|n.ouvre aucun droit/.test(m.textContent)};
    closeModal(true); rolesGerer(); await new Promise(r=>setTimeout(r,300));
    const m2=document.querySelector('.modal')||document.body; r.roles=/un rôle créé ici part de celle du technicien/.test(m2.textContent); r.faux2=/n.ouvre aucun droit/.test(m2.textContent);
    closeModal(true); return r;`);
  vrai('⛔ le choix sans profil dit « il suit la liste de son rôle »', txt.option === '— aucun : il suit la liste de son rôle —', txt.option);
  vrai('⛔ l’aide du rôle dit « un nom, et un point de départ », plus rien de faux', txt.aide && !txt.faux, txt);
  vrai('⛔ la fenêtre « 🏷 Rôles » dit d’où part un rôle créé à la main', txt.roles && !txt.faux2, txt);

  console.log('\n── G. « ＋ Nouveau profil » ne naît avec aucun droit du technicien (relecture v753) ──');
  await S.ev(`db.validDRTous=true; profilsGerer(); await new Promise(r=>setTimeout(r,300)); return 1;`);
  const cN = await cliquer(S, '.modal button[onclick="profilNouveau()"]');
  vrai('le clic atteint « ＋ Nouveau profil »', cN === true, cN);
  await dormir(400);
  const pN = await S.ev(`const z=document.getElementById('usr-d-__profil__'); if(!z) return null;
    const c=z.querySelector('input[data-d="cap_modifierPlans"]');
    const tous=[...z.querySelectorAll('input[type=checkbox][data-d]')];
    return {plans:c?c.checked:null, coches:[...z.querySelectorAll('input[data-d^="cap_"]')].filter(i=>i.checked).map(i=>i.dataset.d),
      n:tous.length, touts:tous.filter(i=>i.checked).map(i=>i.dataset.d), verrous:tous.filter(i=>i.disabled).map(i=>i.dataset.d)};`);
  vrai('population : la grille du profil neuf est dessinée, « Modifier les plans d’appâtage » compris', !!pN && pN.plans !== null, pN);
  vrai('⛔⛔ « Modifier les plans d’appâtage » n’y est PAS coché (la liste du technicien l’ouvre ; un profil n’en tient rien)', !!pN && pN.plans === false, pN);
  vrai('⛔ … aucun droit spécial coché d’avance', !!pN && pN.coches.length === 0, pN && pN.coches);
  vrai('⛔⛔ (v754) TOUT est décoché — menus, droits, gestes — sous « Toute sortie de stock passe par le DR » (' + (pN && pN.n) + ' interrupteurs)',
    !!pN && pN.n > 80 && pN.touts.length === 0, pN && pN.touts.slice(0, 12));
  vrai('⛔ … et rien n’y est verrouillé (« Validations DR » n’est pas ouvert d’office à un profil)', !!pN && pN.verrous.length === 0, pN && pN.verrous);
  await S.ev(`const i=document.getElementById('pf-nom'); if(i) i.value='Profil de la sonde'; return 1;`);
  const cE = await cliquer(S, '.modal button[onclick="profilEditValider()"]');
  await dormir(400);
  const pE = await S.ev(`const p=(db.profilsDroits||[]).find(x=>x.nom==='Profil de la sonde'); db.validDRTous=false;
    return p?{plans:p.caps&&p.caps.modifierPlans, oui:Object.keys(p.caps||{}).filter(k=>p.caps[k]&&k.indexOf('cat_')!==0),
      gestes:Object.keys(p.caps||{}).filter(k=>p.caps[k]&&k.indexOf('cat_')===0), menus:Object.keys(p.modules||{}).filter(k=>p.modules[k]), nMenus:Object.keys(p.modules||{}).length}:null;`);
  vrai('« Enregistrer » est atteint et crée le profil', cE === true && !!pE, [cE, pE]);
  vrai('⛔⛔ … le profil enregistré ne porte PAS « Modifier les plans d’appâtage », ni aucun droit spécial', !!pE && pE.plans === false && pE.oui.length === 0, pE);
  vrai('⛔⛔ (v754) … ni aucun geste, ni aucun menu (tous écrits à NON)', !!pE && pE.gestes.length === 0 && pE.menus.length === 0 && pE.nMenus >= 40, pE);
  await S.ev(`try{ closeModal(true); }catch(e){} return 1;`);

  vrai('aucune exception dans la page', !S.exceptions.length, S.exceptions.slice(0, 3));
  S.fermer();
  console.log(`\n════ sonde-droits-v753 (${S.version}) : ${ok} ✓ ${ko} ✗ ════`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE :', e.message); process.exit(2); });

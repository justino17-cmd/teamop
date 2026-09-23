/* ══ SONDE — L'ÉQUIPE : CHACUN VOIT CE QUI LE CONCERNE ; LE ✎ DU POINTAGE AUX RESPONSABLES ══════════
   Justin, 23 septembre 2026 : « chacun voit ce qui le concerne, et le DR ou autres personnes
   assignés » ; « le ✎ du Pointage réservé au responsable ».
   Dans une vraie page (bêta locale), on se connecte comme un TECHNICIEN et on essaie toutes les
   portes : l'écran « Équipe » ouvert PAR L'ADRESSE (#v=techniciens), la recherche, la fiche d'une
   collègue, puis la correction et la suppression d'heures. Même chose en ADMINISTRATEUR (tout
   passe) et en DR avec une personne rattachée (son périmètre).
   ⛔ On compte la population : quatre fiches, deux pointages — un « personne ne voit rien » sur une
   base vide ne prouverait rien. ⛔ SOURCE=<bêta d'avant> : le technicien y voit toute l'équipe.
   ⛔ Bêta uniquement, 127.0.0.1 uniquement. */
const path = require('path');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
let ok = 0, ko = 0; const vrai = (t, c, d) => { c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c || d === undefined ? '' : '  → ' + JSON.stringify(d))); };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);

(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 402, height: 874, deviceScaleFactor: 1, mobile: true });
  const pop = await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    window.__toasts=[]; const t0=window.toast; window.toast=function(m){ window.__toasts.push(String(m)); return t0.apply(this,arguments); };
    db.techniciens=[{id:'tK',nom:'Karim Benali',metier:'Technicien',tel:'06 12 34 56 78',email:'karim@exemple.fr'},
      {id:'tS',nom:'Sofia Perez',metier:'Technicien',tel:'06 98 76 54 32',email:'sofia@exemple.fr'},
      {id:'tL',nom:'Léo Martin',metier:'DR',tel:'07 11 22 33 44'},{id:'tJ',nom:'Jean Terrain',metier:'Technicien',tel:'06 55 44 33 22'}];
    db.users=[{id:'uA',prenom:'Justin',nom:'Roux',login:'justin',role:'admin',actif:true,pref:{}},
      {id:'uL',prenom:'Léo',nom:'Martin',login:'leo',role:'dr',techId:'tL',actif:true,pref:{}},
      {id:'uS',prenom:'Sofia',nom:'Perez',login:'sofia',role:'technicien',techId:'tS',drId:'uL',actif:true,pref:{}},
      {id:'uK',prenom:'Karim',nom:'Benali',login:'karim',role:'technicien',techId:'tK',actif:true,pref:{}}];
    const d=todayISO();
    db.pointages=[{id:'pK',techId:'tK',date:d,debut:'07:30',fin:'12:00',pause:0},{id:'pS',techId:'tS',date:d,debut:'08:00',fin:'12:30',pause:0}];
    save(); return {techs:db.techniciens.length, pts:db.pointages.length};`);
  console.log('\n══ 0. LA POPULATION ══');
  v('quatre fiches du personnel, deux pointages', pop, { techs: 4, pts: 2 });

  /* se connecter comme <qui>, l'adresse posée sur l'écran « Équipe » */
  const entrer = (qui, vue) => S.ev(`try{ logout(); }catch(e){} await new Promise(r=>setTimeout(r,300));
    history.replaceState(null,'','#v=${vue}'); const u=db.users.find(x=>x.id==='${qui}'); currentUser=u; enterApp(u); try{ setPlatForce('iosweb'); }catch(e){}
    await new Promise(r=>setTimeout(r,1400)); try{ closeModal(true); }catch(e){} const f=document.getElementById('fdr-banner'); if(f) f.remove();
    window.__toasts=[];
    return {vue:current, voirTout:can('voirTout'), noms:[...document.querySelectorAll('#content tr.row-clk .strong')].map(e=>e.textContent.trim()),
      plus:!!document.querySelector('#content-head button[onclick="formTech()"], .topbar button[onclick="formTech()"], button[onclick="formTech()"]')};`);
  const chercher = q => S.ev(`openSearch(); await new Promise(r=>setTimeout(r,150)); renderSearch(${JSON.stringify(q)}); await new Promise(r=>setTimeout(r,150));
    const t=((document.getElementById('gsearch-res')||{}).innerText||''); try{ closeModal(true); }catch(e){} return t;`);
  const fiche = id => S.ev(`window.__toasts=[]; try{ closeModal(true); }catch(e){} ficheTech('${id}'); await new Promise(r=>setTimeout(r,500));
    const o=document.getElementById('overlay'), ouvert=!!(o&&o.classList.contains('open')&&o.innerText.includes('TÉLÉPHONE')||o&&o.classList.contains('open')&&/Téléphone/i.test(o.innerText));
    const t=o?o.innerText:''; try{ closeModal(true); }catch(e){} return {ouvert, tel:/06 98 76 54 32/.test(t), toasts:window.__toasts.slice()};`);

  console.log('\n══ 1. ⛔⛔ KARIM (technicien) TAPE L’ADRESSE DE L’ÉCRAN « ÉQUIPE » ══');
  const K = await entrer('uK', 'techniciens');
  v('l’écran s’ouvre (il reste atteignable par l’adresse)', K.vue, 'techniciens');
  v('⛔⛔ il n’y voit QUE sa fiche', K.noms, ['Karim Benali']);
  vrai('… et pas de « ＋ Technicien »', !K.plus, K);
  const KR = await chercher('Sofia');
  vrai('⛔ la recherche « Sofia » ne propose pas sa fiche', !/Sofia Perez/.test(KR), KR.slice(0, 200));
  const KF = await fiche('tS');
  vrai('⛔⛔ la fiche de Sofia ne s’ouvre pas — ni téléphone, ni heures', !KF.ouvert && !KF.tel, KF);
  vrai('… et l’écran le dit', KF.toasts.some(t => /ne te concerne pas/.test(t)), KF.toasts);
  const KM = await fiche('tK');
  vrai('sa propre fiche, elle, s’ouvre', KM.ouvert, KM);

  console.log('\n══ 2. ⛔⛔ KARIM ET SES HEURES ══');
  const KP = await S.ev(`go('pointage'); await new Promise(r=>setTimeout(r,900));
    const crayons=document.querySelectorAll('#content button[onclick^="formPointage("]').length, poubelles=document.querySelectorAll('#content button[onclick^="delItem(\\'pointages\\'"]').length;
    window.__toasts=[]; formPointage('pK'); await new Promise(r=>setTimeout(r,300));
    const o=document.getElementById('overlay'), formOuvert=!!(o&&o.classList.contains('open')&&o.querySelector('form[onsubmit^="savePointage"]')); try{ closeModal(true); }catch(e){}
    const avant=JSON.stringify(db.pointages.find(p=>p.id==='pK'));
    const f=document.createElement('form'); f.innerHTML='<input name="debut" value="05:00"><input name="fin" value="23:00"><input name="date" value="${new Date().toISOString().slice(0, 10)}">';
    savePointage({preventDefault(){}, target:f}, 'pK');
    delItem('pointages','pK');
    const apres=JSON.stringify(db.pointages.find(p=>p.id==='pK'));
    return {crayons, poubelles, formOuvert, inchange:avant===apres, existe:!!db.pointages.find(p=>p.id==='pK'), toasts:window.__toasts.slice()};`);
  v('⛔ aucun ✎ ni 🗑 sur ses lignes', [KP.crayons, KP.poubelles], [0, 0]);
  vrai('⛔⛔ le formulaire ne s’ouvre pas (même appelé directement)', !KP.formOuvert, KP);
  vrai('⛔⛔ l’enregistrement refuse : ses heures n’ont pas bougé', KP.inchange && KP.existe, KP);
  /* la suppression est refusée PLUS TÔT, par le droit « supprimer » de Temps & équipe (« non autorisée ») :
     c'est juste — deux gardes valent mieux qu'une. On compte donc les deux messages. */
  vrai('… et chaque refus est dit (formulaire, enregistrement, suppression)', KP.toasts.filter(t => /réservé aux responsables|non autorisée/.test(t)).length >= 3, KP.toasts);

  console.log('\n══ 3. L’ADMINISTRATEUR : TOUT ══');
  const A = await entrer('uA', 'techniciens');
  v('il voit les quatre fiches', A.noms.slice().sort(), ['Jean Terrain', 'Karim Benali', 'Léo Martin', 'Sofia Perez']);
  const AF = await fiche('tS');
  vrai('la fiche de Sofia s’ouvre, avec son téléphone', AF.ouvert && AF.tel, AF);
  const AP = await S.ev(`go('pointage'); await new Promise(r=>setTimeout(r,900));
    const n=document.querySelectorAll('#content button[onclick^="formPointage("]').length;
    formPointage('pK'); await new Promise(r=>setTimeout(r,300)); const o=document.getElementById('overlay');
    const ok=!!(o&&o.classList.contains('open')&&o.querySelector('form[onsubmit^="savePointage"]')); try{ closeModal(true); }catch(e){} return {n, ok};`);
  vrai('⛔ contre-épreuve : le ✎ est là, et le formulaire s’ouvre', AP.n >= 2 && AP.ok, AP);

  console.log('\n══ 4. LE DR (Sofia lui est rattachée) ══');
  const L = await entrer('uL', 'techniciens');
  console.log('    « tout voir » pour le DR dans cette base :', L.voirTout);
  if (L.voirTout) v('⛔ il voit Sofia et lui-même — pas Karim ni Jean', L.noms.slice().sort(), ['Léo Martin', 'Sofia Perez']);
  else v('sans « tout voir », il ne voit que sa fiche', L.noms, ['Léo Martin']);

  console.log('\n══ 5. AUCUNE ERREUR ══');
  v('exceptions', S.exceptions, []);
  console.log(`\n════ sonde-equipe : ${ok} ✓ ${ko} ✗ ════\n`);
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE :', e && e.stack || e); process.exit(2); });

/* ══ SONDE — UN TOUCHER JUSTE APRÈS UN CHANGEMENT D'ÉCRAN N'EST PLUS PERDU ═══════════════════════════════════════════════
   Audit apple-design du 21 octobre 2026 (§ 3 : « never lock out input during a transition »). Pendant une transition de vue,
   le navigateur rend TOUT le document inerte : un toucher va à <html> (et `::view-transition{pointer-events:none}` n'y change
   rien, essayé). Deux parties, au vrai doigt (Input.dispatchTouchEvent), sur un iPhone :
   1. CHANGER DE RUBRIQUE (go, sans sens de déplacement) : on relève où est la première ligne de Clients (écran posé), puis on
      revient sur Clients et on la touche 40, 120 et 220 ms après go(). Attendu : la fiche du client s'ouvre.
   2. ENTRER DANS UNE FICHE (poussée latérale, qui garde sa transition) : on touche 60 ms après l'ouverture. Attendu : la
      transition se TERMINE aussitôt (au lieu de ~400 ms), et aucun geste n'est déclenché à l'aveugle.
   ⛔ Bêta uniquement, copie locale en 127.0.0.1. */
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
  await S.ev(`if(!window.__vt){ window.__vt=1; window.__vtN=0; const o=document.startViewTransition.bind(document);
    document.startViewTransition=function(cb){ window.__vtN++; const vt=o(cb); const f=()=>{ window.__vtN--; window.__vtFin=performance.now(); }; vt.finished.then(f,f); return vt; }; }
    document.addEventListener('click',function(e){ const o=e.target.closest&&e.target.closest('[onclick]'); window.__clics=(window.__clics||[]).concat([o?o.getAttribute('onclick').slice(0,40):e.target.tagName]); });
    return 1;`);
  const posee = async (vue) => { for (let k = 0; k < 60; k++) { if (await S.ev(`return !(window.__vtN>0) && current===${JSON.stringify(vue)} && !document.querySelector('.content.entre');`)) break; await dormir(100); } await dormir(250); };
  const toucher = async (x, y) => { await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] }); await dormir(70); await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
  let ok = 0, ko = 0; const c = (t, v, d) => { if (v) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };

  console.log('\n1. changer de rubrique, puis toucher tout de suite');
  await S.ev(`go('clients'); return 1;`); await posee('clients');
  const vise = await S.ev(`const c=document.querySelector('#content .tf-rangee[onclick],#content .list-row[onclick]'); if(!c) return null; const rc=c.getBoundingClientRect();
    return {x:Math.round(rc.left+rc.width/2), y:Math.round(rc.top+rc.height/2), sy:scrollY};`);
  if (!vise) { console.log('  ✗ population : aucune ligne de client'); S.fermer(); process.exit(1); }
  for (const t of [40, 120, 220]) {
    await S.ev(`go('dashboard'); return 1;`); await posee('dashboard');
    await S.ev(`window.__clics=[]; go('clients'); return 1;`); await dormir(t);
    /* ce qui est DESSINÉ sous le doigt à cet instant (pendant la cascade d'entrée, les éléments montent de quelques pixels :
       le toucher doit atteindre ce que l'œil voit là, pas la place qu'aura la ligne une fois posée) */
    await toucher(vise.x, vise.y); await dormir(600);
    const clics = await S.ev(`return window.__clics||[];`);
    c('touché ' + t + ' ms après le changement de rubrique : le toucher ATTEINT l’écran (pas <html>) et son geste part',
      clics.length > 0 && clics.every(x => x !== 'HTML' && x !== 'BODY') && clics.some(x => /\(|=/.test(x)), clics);
  }

  console.log('\n2. entrer dans une fiche (poussée latérale), toucher pendant la poussée');
  await S.ev(`go('interventions'); return 1;`); await posee('interventions');
  const id = await S.ev(`return (db.interventions[0]||{}).id;`);
  await S.ev(`window.__clics=[]; window.__vtFin=0; window.__t0=performance.now(); detailIntervention(${JSON.stringify(id)}); return 1;`);
  await dormir(60);
  const enCours = await S.ev(`return window.__vtN>0;`);
  c('(population) la poussée latérale est EN COURS au moment du toucher', enCours);
  await toucher(330, 300);
  /* après le toucher, plus AUCUNE animation de transition ne doit jouer (skipTransition) — ce qui ne dépend pas de la lenteur
     de capture de ce Chromium sans écran, qui retarde le reste */
  let maxAnim = 0;
  for (let k = 0; k < 14; k++) { await dormir(30);
    maxAnim = Math.max(maxAnim, await S.ev(`return document.getAnimations().filter(a=>a.playState==='running'&&a.effect&&/view-transition/.test(a.effect.pseudoElement||'')).length;`)); }
  await dormir(300);
  const clics = await S.ev(`return window.__clics||[];`);
  c('un toucher pendant la poussée la TERMINE : plus aucune animation de transition ne joue ensuite', maxAnim === 0, { animationsVues: maxAnim });
  c('… et ne déclenche aucun geste à l’aveugle (aucun onclick)', !clics.some(x => /\(|=/.test(x)), clics);

  console.log('\n3. un enregistrement qui redessine l’écran (go(current)) ne rejoue pas son entrée');
  await S.ev(`go('dashboard'); return 1;`); await posee('dashboard');
  const avant = await S.ev(`return [...document.querySelectorAll('#content .kpi-val')].slice(0,4).map(e=>e.textContent.trim());`);
  await S.ev(`window.__vtAvant=window.__vtN; window.__vtCompte=0; const o=document.startViewTransition; document.startViewTransition=function(cb){ window.__vtCompte++; return o.call(document,cb); }; go(current); return 1;`);
  /* on ÉCHANTILLONNE 700 ms : à 40 ms seulement, la transition d'origine n'a parfois pas encore exécuté son rendu, et un
     « pas de cascade, mêmes chiffres » passerait à vide */
  let entreVue = false, kpiBouge = null;
  for (let k = 0; k < 23; k++) { await dormir(30);
    const e = await S.ev(`return {entre:!!document.querySelector('.content.entre'), kpi:[...document.querySelectorAll('#content .kpi-val')].slice(0,4).map(e=>e.textContent.trim())};`);
    if (e.entre) entreVue = true; if (!kpiBouge && JSON.stringify(e.kpi) !== JSON.stringify(avant)) kpiBouge = e.kpi; }
  const r3 = await S.ev(`return {vt:window.__vtCompte};`); r3.entre = entreVue; r3.kpi = kpiBouge || avant;
  c('(population) le tableau de bord a des tuiles chiffrées', avant.length > 0, avant);
  c('go(current) ne lance aucune transition de vue', r3.vt === 0, r3.vt);
  c('… ni la cascade d’entrée (.entre), à aucun moment des 700 ms', !r3.entre);
  c('… et les chiffres des tuiles ne repartent pas de zéro (aucun chiffre ne bouge en 700 ms)', !kpiBouge, { avant, vu: kpiBouge });

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗' + (S.exceptions.length ? '  · exceptions : ' + S.exceptions.slice(0, 3).join(' | ') : ''));
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('⛔ ' + (e.stack || e.message)); process.exit(1); });

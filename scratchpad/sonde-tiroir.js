/* ══ SONDE — LE TIROIR DU MENU (TÉLÉPHONE) : UN VOILE QUI SE FOND, UN BALAYAGE QUI FERME, UN TIROIR QUI SUIT LE DOIGT ══════
   Audit apple-design du 21 octobre 2026 (§ 2, § 6, § 7, § 12). Au vrai doigt (Input.dispatchTouchEvent), iPhone :
   1. le voile se FOND à l'ouverture et à la fermeture (relevé 60 ms après : ni 0 ni 1), au lieu de surgir ;
   2. un balayage vers la gauche SUR LE VOILE ferme le menu — et ne change PAS de rubrique ;
   3. le menu tiré suit le doigt 1:1 (sa transform vaut le déplacement du doigt) ;
   4. un petit tirage lent le fait REVENIR ; un grand tirage le FERME.
   Ce Chromium ne transmet aucun touchmove de moins de ~15 px (règle du dépôt) : pas de 20 px, deux images après chacun.
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
  await S.ev(`go('clients'); return 1;`);
  for (let k = 0; k < 60; k++) { if (await S.ev(`return current==='clients' && !document.querySelector('.content.entre');`)) break; await dormir(100); }
  await dormir(500);
  let ok = 0, ko = 0; const c = (t, v, d) => { if (v) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
  const images = () => S.ev(`return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(1))));`);
  const ouvert = () => S.ev(`return document.getElementById('sidebar').classList.contains('open');`);
  const opa = () => S.ev(`const b=document.getElementById('sidebar-backdrop'); const cs=getComputedStyle(b); return cs.display==='none'?-1:+cs.opacity;`);
  /* le style est relu DANS le même geste : ce navigateur sans écran ne produit pas toujours d'image entre deux appels, et
     une transition ne part qu'au premier calcul de style — sans ça, elle partirait au moment de la MESURE (relevé : 0) */
  const ouvrirMenu = async () => { await S.ev(`document.getElementById('sidebar').classList.add('open'); return getComputedStyle(document.getElementById('sidebar-backdrop')).opacity;`); };
  const glisser = async (x0, y, x1, pas, attente) => {
    await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y, id: 1 }] });
    const n = Math.max(1, Math.round(Math.abs(x1 - x0) / pas));
    for (let k = 1; k <= n; k++) { await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: Math.round(x0 + (x1 - x0) * k / n), y, id: 1 }] }); await images(); if (attente) await dormir(attente); }
    return async () => { await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
  };

  console.log('\n1. le voile se fond');
  /* on lit la TRANSITION elle-même (getAnimations), pas l'horloge : sous charge, ce navigateur sans écran avance ses
     transitions au rythme des images qu'il produit — une lecture « 60 ms après » rendait 0, puis 0 encore à 700 ms */
  const fondu = `const b=document.getElementById('sidebar-backdrop'), cs=getComputedStyle(b);
    const t=b.getAnimations().filter(a=>a.transitionProperty==='opacity').map(a=>a.effect.getComputedTiming().duration);
    return {disp:cs.display, op:+cs.opacity, ms:t.length?Math.max(...t):0};`;
  const finir = `const b=document.getElementById('sidebar-backdrop'); await Promise.race([Promise.all(b.getAnimations().map(a=>a.finished.catch(()=>0))), new Promise(r=>setTimeout(r,4000))]);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); const cs=getComputedStyle(b); return {disp:cs.display, op:+cs.opacity, pe:cs.pointerEvents};`;
  await ouvrirMenu(); const o1 = await S.ev(fondu); const o2 = await S.ev(finir);
  c('à l’ouverture, le voile se FOND : une transition d’opacité d’au moins 150 ms est en cours', o1.disp !== 'none' && o1.ms >= 150 && o1.op < 0.98, o1);
  c('… puis il est plein', o2.disp !== 'none' && o2.op > 0.98, o2);
  await S.ev(`document.getElementById('sidebar-backdrop').click(); return getComputedStyle(document.getElementById('sidebar-backdrop')).opacity;`);
  const o3 = await S.ev(fondu); const o4 = await S.ev(finir);
  c('à la fermeture, il S’ÉTEINT en fondu (pas coupé d’un coup : encore peint, transition en cours)', o3.disp !== 'none' && o3.ms >= 150 && o3.op > 0.02, o3);
  c('… puis il est éteint et ne prend plus le toucher', (o4.disp === 'none' || o4.op < 0.02) && (o4.disp === 'none' || o4.pe === 'none'), o4);

  console.log('\n2. un balayage sur le voile ferme le menu, sans changer de rubrique');
  await ouvrirMenu(); await dormir(700);
  const avant = await S.ev(`return current;`);
  const lacher = await glisser(370, 600, 150, 22, 0); await lacher(); await dormir(800);
  c('le menu est fermé', !(await ouvert()));
  c('⛔ et la rubrique n’a pas changé (' + avant + ')', (await S.ev(`return current;`)) === avant, await S.ev(`return current;`));

  console.log('\n3. le menu suit le doigt, revient ou se ferme selon le geste');
  await ouvrirMenu(); await dormir(700);
  const lacher2 = await glisser(220, 500, 140, 20, 40);
  const tx = await S.ev(`const m=/translateX\\((-?[\\d.]+)px\\)/.exec(document.getElementById('sidebar').style.transform||''); return m?+m[1]:null;`);
  c('pendant le tirage, le menu est déplacé du déplacement du doigt (−80 px)', tx !== null && Math.abs(tx + 80) <= 2, tx);
  await dormir(200); await lacher2(); await dormir(700);
  c('un petit tirage, LENT (doigt arrêté avant de lâcher) : le menu revient, ouvert', await ouvert());
  const lacher3 = await glisser(220, 500, 20, 25, 0); await lacher3(); await dormir(700);
  c('un grand tirage : le menu se ferme', !(await ouvert()));

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗' + (S.exceptions.length ? '  · exceptions : ' + S.exceptions.slice(0, 3).join(' | ') : ''));
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('⛔ ' + (e.stack || e.message)); process.exit(1); });

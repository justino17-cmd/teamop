/* ══ SONDE — LA FEUILLE « CRÉER » SE TIRE, UN DOIGT ARRÊTÉ NE RELANCE RIEN, LE BORD RÉSISTE (audit apple-design, 17, 26, 27) ═══
   Au vrai doigt (Input.dispatchTouchEvent), iPhone. Ce Chromium ne transmet aucun touchmove de moins de ~15 px : pas de
   20 px, deux images après chacun (règle du dépôt).
   1. la feuille « Créer » suit le doigt vers le bas, le voile s'éclaircit ; un petit tirage lâché lentement la fait remonter ;
      un grand tirage la ferme ; une chiquenaude la ferme ; vers le haut elle résiste ; tirée depuis une tuile, elle se
      ferme sans ouvrir la tuile ;
   2. balayage entre rubriques : 40 px vite, puis le doigt S'ARRÊTE 300 ms avant de lâcher — on reste (la vitesse d'avant ne
      compte plus) ; à la première rubrique, tirer vers la droite fait RÉSISTER la pastille au lieu de la pousser d'un cran.
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
  let ok = 0, ko = 0; const c = (t, v, d) => { if (v) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
  const images = () => S.ev(`return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(1))));`);
  const pose = (x, y) => S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  const bouge = async (x, y) => { await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 1 }] }); await images(); };
  const leve = () => S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const glisse = async (x, y0, y1, pas) => { const n = Math.max(1, Math.round(Math.abs(y1 - y0) / pas)); for (let k = 1; k <= n; k++) await bouge(x, Math.round(y0 + (y1 - y0) * k / n)); };
  const ouvrirCreer = async () => { await S.ev(`try{ closeModal(true); }catch(e){} creerOuvrir(); return 1;`);
    for (let k = 0; k < 30; k++) { if (await S.ev(`const o=document.getElementById('creer'); return !!o&&o.classList.contains('vu');`)) break; await dormir(100); }
    /* ⛔ on attend la FIN de la montée, pas un délai : sous charge, ce Chromium n'avance une transition qu'au rythme des images
       qu'il produit — relevée trop tôt, la feuille était encore sous l'écran (haut à 858 px pour 844) et le doigt touchait <html> */
    await S.ev(`const f=document.querySelector('#creer .creer-sheet'); await Promise.race([Promise.all(f.getAnimations().map(a=>a.finished.catch(()=>0))), new Promise(r=>setTimeout(r,4000))]);
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); return 1;`);
    const p = await S.ev(`const f=document.querySelector('#creer .creer-sheet').getBoundingClientRect(), t=document.querySelector('#creer .creer-t').getBoundingClientRect(); return {x:Math.round(f.left+f.width/2), y:Math.round(f.top+22), tx:Math.round(t.left+t.width/2), ty:Math.round(t.top+t.height/2), bas:Math.round(f.bottom), h:innerHeight};`);
    if (p.y > p.h - 40) console.log('  ⛔ la feuille n’est pas montée : ' + JSON.stringify(p));
    return p; };
  const feuille = () => S.ev(`const o=document.getElementById('creer'), f=o&&o.querySelector('.creer-sheet'); const m=/translateY\\((-?[\\d.]+)px\\)/.exec(f&&f.style.transform||'');
    const a=/rgba\\([^,]*,[^,]*,[^,]*,\\s*([\\d.]+)\\)/.exec(o&&o.style.backgroundColor||'');
    return {ouverte:!!o&&o.classList.contains('on')&&o.classList.contains('vu'), ty:m?+m[1]:null, voile:a?+a[1]/0.35:(o&&o.style.opacity!==''?+o.style.opacity:null), opa:o?getComputedStyle(o).opacity:null};`);

  console.log('\n1. la feuille « Créer »');
  let p = await ouvrirCreer();
  await pose(p.x, p.y); await glisse(p.x, p.y, p.y + 60, 20);
  let f = await feuille();
  c('tirée de 60 px vers le bas, elle suit le doigt (translateY ≈ 60)', f.ty !== null && Math.abs(f.ty - 60) <= 3, f);
  c('… et le voile s’éclaircit', f.voile !== null && f.voile < 0.98, f);
  c('… sans baisser l’opacité du conteneur (la vitre de la feuille garde son flou)', f.opa === '1', f);
  await dormir(300); await leve(); await dormir(800);
  c('lâchée lentement après 60 px : elle REMONTE, toujours ouverte', (await feuille()).ouverte);
  await pose(p.x, p.y); await glisse(p.x, p.y, p.y + 260, 20); await dormir(300); await leve(); await dormir(800);
  c('tirée de 260 px : elle se FERME', !(await feuille()).ouverte);
  p = await ouvrirCreer();
  await pose(p.x, p.y); await bouge(p.x, p.y + 20); await bouge(p.x, p.y + 40); await bouge(p.x, p.y + 60); await leve(); await dormir(800);
  c('une chiquenaude de 60 px : la vitesse projetée la FERME', !(await feuille()).ouverte);
  p = await ouvrirCreer();
  await pose(p.x, p.y + 100); await glisse(p.x, p.y + 100, p.y + 20, 20); f = await feuille();
  c('tirée de 80 px vers le HAUT : elle résiste (elle monte, mais de moins de 40 px)', f.ty !== null && f.ty < 0 && f.ty > -40, f);
  await leve(); await dormir(800);
  const avant = await S.ev(`return current;`);
  await pose(p.tx, p.ty); await glisse(p.tx, p.ty, p.ty + 260, 20); await dormir(200); await leve(); await dormir(900);
  const apres = await S.ev(`return {current, fenetre:document.getElementById('overlay').classList.contains('open')};`);
  c('tirée depuis une tuile : elle se ferme…', !(await feuille()).ouverte);
  c('… sans ouvrir la tuile (ni fenêtre, ni rubrique)', apres.current === avant && !apres.fenetre, apres);

  console.log('\n2. le balayage entre rubriques');
  /* la feuille est fermée par sa fonction (sur l'origine, le doigt ne la ferme pas : elle couvrirait l'écran mesuré) */
  await S.ev(`try{ creerFermer(); }catch(e){} return 1;`); await dormir(700);
  c('(population) aucune feuille ne couvre l’écran', !(await S.ev(`const o=document.getElementById('creer'); return !!o&&o.classList.contains('on');`)));
  await S.ev(`go('interventions'); return 1;`); await dormir(1800);
  const v = await S.ev(`const t=[...document.querySelectorAll('#tabbar .tab')].map(b=>b.dataset.tab); return {t, current};`);
  await pose(260, 520); await bouge(240, 521); await bouge(220, 522); await dormir(300); await leve(); await dormir(1200);
  const v2 = await S.ev(`return current;`);
  c('40 px vite, puis le doigt s’ARRÊTE 300 ms : on reste sur la rubrique (' + v.current + ')', v2 === v.current, { avant: v, apres: v2 });
  await S.ev(`go('dashboard'); return 1;`); await dormir(1800);
  const premier = await S.ev(`const t=[...document.querySelectorAll('#tabbar .tab')].map(b=>b.dataset.tab); return t[0]===current||(VUE_PARENT[current]||current)===t[0];`);
  await pose(120, 520); for (let x = 140; x <= 240; x += 20) await bouge(x, 520);
  const dxs = await S.ev(`return parseFloat(getComputedStyle(document.getElementById('tabbar')).getPropertyValue('--tab-dx'))||0;`);
  await leve(); await dormir(800);
  c('(population) on est sur la PREMIÈRE rubrique de la barre', premier);
  c('à la première rubrique, tirer de 120 px vers la droite : la pastille RÉSISTE (moins de 20 px, au lieu de 66)', Math.abs(dxs) < 20 && Math.abs(dxs) > 1, dxs);

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗' + (S.exceptions.length ? '  · exceptions : ' + S.exceptions.slice(0, 3).join(' | ') : ''));
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('⛔ ' + (e.stack || e.message)); process.exit(1); });

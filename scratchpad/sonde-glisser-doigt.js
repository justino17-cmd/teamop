/* ══ SONDE — GLISSER UNE INTERVENTION AU DOIGT : LE POINT SAISI RESTE SOUS LE DOIGT, ET L'HEURE MONTRÉE EST L'HEURE POSÉE ══
   Audit apple-design du 21 octobre 2026 (§ 2, § 6). Au vrai doigt (Input.dispatchTouchEvent), au planning, sur un iPhone :
   appui long sur une carte, en la tenant à 30 px de son bord gauche et en son milieu, puis glisser vers le bas par pas de
   20 px (ce Chromium ne transmet aucun touchmove de moins de ~15 px — règle du dépôt), deux images après chaque pas.
   Ce qu'on relève : le coin du fantôme (sa transform) contre « doigt − point saisi » ; le repère d'heure (.plg-rule.deb) ;
   puis, après le dépôt, l'heure ENREGISTRÉE de l'intervention, qui doit être celle que montrait le repère.
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
  const P = PROFILS.tel; await poserProfil(S, P); await S.ev(`setPlatForce('${P.plat}'); setThemePref('light'); return 1;`);
  /* des interventions AUJOURD'HUI, à 9 h, sur des personnes différentes : la vue du jour en a, le glisser a une cible */
  await S.ev(`const T=db.techniciens||[], j=todayISO(); db.interventions.slice(0,4).forEach((i,k)=>{ i.date=j; i.heure='09:00'; i.duree=60; i.statut='planifiee';
    if(T.length){ i.techIds=[T[k%T.length].id]; i.techId=i.techIds[0]; } }); save(); return 1;`);
  await S.ev(`go('planning'); return 1;`); await dormir(2000);
  const cible = await S.ev(`const l=[...document.querySelectorAll('[data-drag-int]')].filter(c=>{ const r=c.getBoundingClientRect(); return r.width>40&&r.height>20; });
    if(!l.length) return null; const c=l[0]; c.scrollIntoView({block:'center'}); await new Promise(f=>setTimeout(f,300));
    const r=c.getBoundingClientRect(); return {id:c.getAttribute('data-drag-int'), x:r.left, y:r.top, w:r.width, h:r.height, n:l.length, heure:(db.interventions.find(i=>i.id===c.getAttribute('data-drag-int'))||{}).heure};`);
  if (!cible) { console.log('  ✗ population : aucune carte glissable au planning'); S.fermer(); process.exit(1); }
  console.log('cartes glissables : ' + cible.n + ' · carte ' + cible.id + ' à ' + cible.heure + ' · ' + JSON.stringify(cible));
  const gx = Math.round(cible.x + 30), gy = Math.round(cible.y + cible.h / 2), dx = gx - cible.x, dy = gy - cible.y;
  const doigt = async (type, x, y) => S.c.envoyer('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, radiusX: 4, radiusY: 4, force: 1, id: 1 }] });
  const images = () => S.ev(`return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(1))));`);
  await doigt('touchStart', gx, gy);
  /* ⛔ on attend que l'appui long ait ARMÉ le glisser, au lieu de parier sur 400 ms : sous charge, la minuterie de 260 ms
     de la page part en retard, le premier pas de 20 px arrive avant, et l'application — à bon droit — rend le geste au
     défilement. Pris le 22 octobre 2026 : un « 0 ✓ 4 ✗ » sur cinq passages, sans défaut dans la page. */
  let arme = false; for (let k = 0; k < 40 && !arme; k++) { await dormir(50); arme = await S.ev(`return window._planDragging===true;`); }
  if (!arme) console.log('  ⚠ le glisser ne s’est pas armé en 2 s (appui long)');
  let x = gx, y = gy;
  for (let k = 0; k < 6; k++) { y += 20; await doigt('touchMove', x, y); await images(); }
  const lu = await S.ev(`const g=[...document.body.children].filter(e=>e.style&&e.style.position==='fixed'&&/translate\\(/.test(e.style.transform||'')).pop();
    const m=g&&/translate\\((-?[\\d.]+)px,\\s*(-?[\\d.]+)px\\)/.exec(g.style.transform); const rule=document.querySelector('.plg-rule.deb');
    return {fantome:!!g, coin:m?[+m[1],+m[2]]:null, origine:g?g.style.transformOrigin:'', repere:rule?rule.textContent.trim():null};`);
  if (process.env.CAPTURE) { const img = await S.c.envoyer('Page.captureScreenshot', { format: 'png' }); require('fs').writeFileSync(process.env.CAPTURE, Buffer.from(img.data, 'base64')); }
  await doigt('touchEnd', x, y); await dormir(1200);
  const apres = await S.ev(`return (db.interventions.find(i=>i.id===${JSON.stringify(cible.id)})||{}).heure;`);
  let ok = 0, ko = 0; const c = (t, v, d) => { if (v) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
  c('l’appui long a soulevé un fantôme', lu.fantome, lu);
  const att = [x - dx, y - dy];
  c('le point saisi est sous le doigt : coin du fantôme = doigt − (' + dx + ', ' + dy + ') = ' + JSON.stringify(att), !!lu.coin && Math.abs(lu.coin[0] - att[0]) <= 1 && Math.abs(lu.coin[1] - att[1]) <= 1, lu.coin);
  c('le repère d’heure s’affiche au doigt', !!lu.repere, lu.repere);
  c('l’heure ENREGISTRÉE est celle que montrait le repère', !!lu.repere && apres === lu.repere, { repere: lu.repere, enregistree: apres, avant: cible.heure });
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗' + (S.exceptions.length ? '  · exceptions : ' + S.exceptions.slice(0, 3).join(' | ') : ''));
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('⛔ ' + (e.stack || e.message)); process.exit(1); });

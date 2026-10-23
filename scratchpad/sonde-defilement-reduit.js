/* ══ SONDE — « RÉDUIRE LES ANIMATIONS » : UN DÉFILEMENT DEMANDÉ PAR L'APPLICATION SAUTE, IL NE GLISSE PAS ══
   Audit apple-design (§ 14), 22 octobre 2026. Chemin réel : planVersPlanning(id), qui amène une intervention du planning
   au centre de l'écran. On part en haut de la page, on appelle la vraie fonction, et on relit la position 30 ms après :
   sous le réglage, la page doit être DÉJÀ arrivée (saut) ; sans le réglage (contre-épreuve), elle doit être en chemin.
   Population : la cible doit être hors de l'écran au départ (sinon rien ne défile, et le contrôle ne prouve rien).
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
  let ok = 0, ko = 0;
  for (const reglage of ['reduce', 'no-preference']) {
    await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reglage }] });
    await S.ev(`go('planning'); return 1;`); await dormir(1800);
    const r = await S.ev(`const l=[...document.querySelectorAll('[data-int]')]; if(!l.length) return {pop:0};
      const el=l[l.length-1], id=el.getAttribute('data-int'); scrollTo(0,0);
      await new Promise(f=>requestAnimationFrame(()=>requestAnimationFrame(f)));
      const r0=el.getBoundingClientRect(), hors=r0.top>innerHeight||r0.bottom<0, y0=scrollY;
      planVersPlanning(id);
      await new Promise(f=>setTimeout(f,30)); const y30=scrollY;
      await new Promise(f=>setTimeout(f,1200)); const yFin=scrollY;
      return {pop:l.length, hors, y0, y30, yFin, id};`);
    if (!r.pop || !r.hors || r.yFin === r.y0) { ko++; console.log('  ✗ ' + reglage + ' : population insuffisante (cible hors écran ? défilement ?) ' + JSON.stringify(r)); continue; }
    const saut = Math.abs(r.y30 - r.yFin) < 2;
    if (reglage === 'reduce') { if (saut) { ok++; console.log('  ✓ réduire les animations : la page SAUTE (à 30 ms déjà en ' + r.yFin + ' px)'); } else { ko++; console.log('  ✗ réduire les animations : la page GLISSE encore (à 30 ms en ' + r.y30 + ' px, arrivée ' + r.yFin + ' px)'); } }
    else { if (!saut) { ok++; console.log('  ✓ contre-épreuve sans le réglage : la page glisse (à 30 ms en ' + r.y30 + ' px, arrivée ' + r.yFin + ' px)'); } else { ko++; console.log('  ✗ contre-épreuve : la page saute aussi sans le réglage — le défilement doux a disparu pour tout le monde'); } }
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('⛔ ' + e.message); process.exit(1); });

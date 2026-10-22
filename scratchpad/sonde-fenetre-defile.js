/* ══ SONDE — UNE FENÊTRE OUVERTE NE FAIT PAS DÉFILER LA PAGE DERRIÈRE ELLE (audit apple-design, point 32) ═══════════════════════
   Dans la vraie page, la liste des interventions défilée de 200 px, au téléphone (au vrai doigt : Input.dispatchTouchEvent,
   pas de 30 px, une image après chacun) et au bureau (la molette, douze crans) :
     · une fenêtre LONGUE (formClient) : on la fait défiler jusqu'au bout et au-delà — la page dessous ne bouge pas ;
     · une fenêtre COURTE (une carte de deux lignes) : on glisse dessus — la page dessous ne bouge pas (c'est le cas que
       overscroll-behavior seul ne retient pas : un voile qui ne défile pas passait le geste à la page) ;
     · la feuille « Créer » : on glisse (ou on tourne la molette) sur son voile — la page ne bouge pas ;
     · une fenêtre rouverte commence en haut (le voile gardait la position de la fenêtre d'avant).
   SOURCE=fichier : la contre-épreuve. ⛔ Bêta uniquement, copie locale en 127.0.0.1. */
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
  let ok = 0, ko = 0; const c = (t, v, d) => { if (v) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
  const COURTE = `openModal('<div class="modal-head"><h3>Court</h3></div><p>Deux lignes.</p><div class="modal-foot"><button class="btn" onclick="closeModal()">OK</button></div>')`;
  for (const prof of ['tel', 'mac14']) {
    const P = PROFILS[prof]; await poserProfil(S, P); await S.ev(`setPlatForce('${P.plat}'); go('interventions'); return 1;`); await dormir(1500);
    console.log('\n' + (prof === 'tel' ? 'téléphone (au doigt)' : 'bureau (la molette)'));
    const geste = async (x, y) => {
      if (prof === 'mac14') { for (let k = 0; k < 12; k++) { await S.c.envoyer('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: 400 }); await dormir(40); } }
      else { let yy = y; await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: yy, id: 1 }] });
        for (let k = 0; k < 20; k++) { yy -= 30; await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: Math.max(5, yy), id: 1 }] }); await S.ev(`return new Promise(r=>requestAnimationFrame(()=>r(1)));`); }
        await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
      await dormir(800); };
    const peut = await S.ev(`window.scrollTo(0,200); await new Promise(r=>setTimeout(r,150)); return Math.round(scrollY);`);
    c('(population) la page est défilée de 200 px (elle peut encore défiler dans les deux sens)', peut === 200, peut);
    for (const [nom, ouvre] of [['longue', 'formClient()'], ['courte', COURTE]]) {
      await S.ev(`window.scrollTo(0,200); ${ouvre}; return 1;`); await dormir(900);
      const a = await S.ev(`const o=document.getElementById('overlay'); return {page:Math.round(scrollY), ov:o.scrollTop};`);
      await geste(prof === 'tel' ? 195 : 640, prof === 'tel' ? 700 : 400);
      const b = await S.ev(`return {page:Math.round(scrollY), ov:Math.round(document.getElementById('overlay').scrollTop)};`);
      c('fenêtre ' + nom + ' : la page dessous ne bouge pas (' + a.page + ' → ' + b.page + ')', b.page === a.page, { avant: a, apres: b });
      if (nom === 'longue') {
        c('… la fenêtre, elle, a défilé', b.ov > 100, b.ov);
        await S.ev(`closeModal(true); return 1;`); await dormir(500); await S.ev(`formClient(); return 1;`); await dormir(900);
        const r = await S.ev(`return document.getElementById('overlay').scrollTop;`);
        c('rouverte, une fenêtre commence en haut (le voile ne garde pas la position d’avant)', r === 0, r);
      }
      await S.ev(`closeModal(true); return 1;`); await dormir(500);
    }
    {
      await S.ev(`window.scrollTo(0,200); creerOuvrir(); return 1;`); await dormir(1200);
      const a = await S.ev(`return Math.round(scrollY);`);
      await geste(prof === 'tel' ? 195 : 640, prof === 'tel' ? 300 : 60);   // sur le voile, hors de la feuille
      const b = await S.ev(`return Math.round(scrollY);`);
      c('la feuille « Créer » : glisser sur son voile ne fait pas défiler la page (' + a + ' → ' + b + ')', a === b, [a, b]);
      await S.ev(`creerFermer(); return 1;`); await dormir(700);
    }
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  await S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

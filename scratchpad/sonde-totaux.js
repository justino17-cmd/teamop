/* ══ SONDE — UN TOTAL RECALCULÉ À CHAQUE FRAPPE NE TREMBLE PAS (audit apple-design, point 29) ════════════════════════════════
   Dans la vraie page (iPhone), la fenêtre d'un nouveau devis (formDoc) : une ligne, et dans son prix on écrit successivement des
   valeurs dont les totaux gardent le même nombre de chiffres (1111, 4444, 1888…), comme le ferait un doigt qui corrige. À chaque valeur, ligTot()
   récrit « Total HT · TVA · TTC », aligné à droite, et on relève le bord gauche du TTC et de « Total HT ».
     · chiffres tabulaires : à nombre de chiffres égal, la ligne ne bouge pas d'un pixel ;
     · sur la page d'avant, elle glissait à chaque valeur (un « 1 » est plus étroit qu'un « 8 »).
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
  const P = PROFILS.tel; await poserProfil(S, P); await S.ev(`setPlatForce('${P.plat}'); go('devis'); return 1;`); await dormir(1200);
  let ok = 0, ko = 0; const c = (t, v, d) => { if (v) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
  await S.ev(`formDoc('devis'); return 1;`); await dormir(1200);
  const pret = await S.ev(`if(!formLignes.length){ formLignes.push({designation:'Traitement',qte:1,pu:0}); renderLignes(); } return {tot:!!document.getElementById('lig-tot'), pu:!!document.querySelector('#lignes-box input[title="P.U. €"]')};`);
  c('(population) la fenêtre du devis est ouverte, avec son total et un champ de prix', pret.tot && pret.pu, pret);
  /* ⚠ la fenêtre entre bloc par bloc (échelle, translation) : mesurée pendant cette entrée, la première frappe lisait une ligne
     décalée de 10 px — sous charge seulement (vu deux fois le 22 octobre, quand trois suites tournaient). On attend la fin de
     TOUTES ses animations finies avant la première mesure. */
  const encore = await S.ev(`const A=(document.getElementById('modal').getAnimations({subtree:true})||[]).filter(a=>a.effect&&a.effect.getTiming().iterations!==Infinity);
    await Promise.all(A.map(a=>a.finished.catch(()=>{}))); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); return A.length;`);
  console.log('    (' + encore + ' animation(s) de la fenêtre attendue(s) avant de mesurer)');
  const releve = (v) => S.ev(`const i=document.querySelector('#lignes-box input[title="P.U. €"]'); i.value='${v}'; i.dispatchEvent(new Event('input',{bubbles:true}));
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); const t=document.getElementById('lig-tot'), bs=t.querySelectorAll('b'), r=document.createRange(); r.selectNodeContents(t);
    return {ttc:+bs[bs.length-1].getBoundingClientRect().left.toFixed(2), debut:+r.getClientRects()[0].left.toFixed(2), texte:t.textContent.replace(/\\s+/g,' ').trim(), num:getComputedStyle(t).fontVariantNumeric};`);
  /* des prix dont le HT ET le TTC (20 %) gardent le même nombre de chiffres : 8888 € donnerait 10 665,60 € TTC, un chiffre de
     plus, et la ligne s'allongerait légitimement */
  for (const serie of [['1111', '4444', '1888', '8111', '6000'], ['11', '41', '77', '55']]) {
    const R = []; for (const v of serie) R.push(await releve(v));
    const ttc = R.map(x => x.ttc), debut = R.map(x => x.debut);
    const ecart = (a) => +(Math.max(...a) - Math.min(...a)).toFixed(2);
    c('prix à ' + serie[0].length + ' chiffres (' + serie.join(', ') + ') : le TTC ne bouge pas (écart ' + ecart(ttc) + ' px)', ecart(ttc) < 0.5, ttc);
    c('… ni le début de la ligne (écart ' + ecart(debut) + ' px)', ecart(debut) < 0.5, debut);
    if (serie[0].length === 4) console.log('    (' + R[0].texte + ' — ' + R[0].num + ')');
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  await S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

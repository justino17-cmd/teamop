/* ══ SONDE — UNE SEULE FAMILLE : LA POLICE DU SYSTÈME (audit apple-design, point 25) ══════════════════════════════════════════
   Dans la vraie page (iPhone), avec des données de démonstration et un mouvement de stock posé exprès : on parcourt TOUTES les
   rubriques du menu et, dans chacune, chaque élément qui porte du texte — la famille CALCULÉE (getComputedStyle) dit dans quelle
   police le navigateur l'écrirait sur un appareil qui a le réseau (ici Google n'est pas joignable : le calcul, lui, ne ment pas).
     · aucun élément en Space Mono, Archivo ou DM Sans ; aucun lien vers Google Fonts dans le document ;
     · l'avatar à initiales : la police donnée au canevas est ACCEPTÉE (un canevas ignore une police invalide et retombe sur
       10 px sans le dire) ;
     · la largeur d'un montant dans une barre de Statistiques (la colonne doit le tenir).
   SOURCE=fichier : la contre-épreuve sur la page d'avant. ⛔ Bêta uniquement, copie locale en 127.0.0.1. */
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
  c('aucun lien vers Google Fonts dans le document', (await S.ev(`return document.querySelectorAll('link[href*="fonts.googleapis"],link[href*="fonts.gstatic"]').length;`)) === 0);
  const vues = await S.ev(`return (typeof NAV!=='undefined'?NAV:[]).flatMap(g=>g.items||[g]).map(i=>i.k).filter(k=>k&&views[k]);`);
  c('(population) plus de 30 rubriques à parcourir', vues.length > 30, vues.length);
  const fautifs = {}; let total = 0;
  for (const v of vues) {
    await S.ev(`try{ closeModal(true); }catch(e){} try{ go('${v}'); }catch(e){} return 1;`); await dormir(700);
    const r = await S.ev(`const W=/space mono|archivo|dm sans/i; const out=[]; let n=0;
      for(const e of document.querySelectorAll('body *')){ if(!e.offsetWidth&&!e.offsetHeight) continue; const t=[...e.childNodes].some(x=>x.nodeType===3&&x.textContent.trim()); if(!t) continue; n++;
        const f=getComputedStyle(e).fontFamily; if(W.test(f)) out.push((e.className&&e.className.baseVal===undefined?String(e.className).split(' ')[0]:e.tagName.toLowerCase())+' « '+e.textContent.trim().slice(0,18)+' » '+f.slice(0,30)); }
      return {n,out};`);
    total += r.n; for (const x of r.out) fautifs[v + ' · ' + x] = 1;
  }
  c('(population) plus de 3 000 éléments de texte examinés', total > 3000, total);
  c('aucun élément écrit en Space Mono, Archivo ou DM Sans, sur ' + vues.length + ' rubriques', !Object.keys(fautifs).length, Object.keys(fautifs).slice(0, 6));
  /* le journal des mouvements de stock : un mouvement posé, l'écran ouvert */
  const mv = await S.ev(`const p=db.produits[0]; if(!p) return null; db.mouvements=db.mouvements||[]; db.mouvements.unshift({id:'mvSonde',ts:Date.now(),type:'entree',produitId:p.id,qte:12,unite:'u',par:'Justin B'}); save();
    go('stock'); await new Promise(r=>setTimeout(r,800)); const sp=[...document.querySelectorAll('#content span')].find(s=>/^[＋+]12\\b/.test(s.textContent.trim()));
    return sp?{f:getComputedStyle(sp).fontFamily.slice(0,40), num:getComputedStyle(sp).fontVariantNumeric}:{absent:true};`);
  if (mv && !mv.absent) c('un mouvement de stock : sa quantité en police du système, chiffres tabulaires', !/space mono/i.test(mv.f) && /tabular-nums/.test(mv.num), mv);
  else console.log('    (le journal des mouvements n’est pas sur cet écran : contrôlé par test-2846)');
  /* l'avatar : la police donnée au canevas est-elle acceptée ? */
  const av = await S.ev(`const proto=CanvasRenderingContext2D.prototype, d=Object.getOwnPropertyDescriptor(proto,'font'); window.__polices=[];
    Object.defineProperty(proto,'font',{configurable:true,get(){ return d.get.call(this); },set(v){ d.set.call(this,v); __polices.push({donnee:v, retenue:d.get.call(this)}); }});
    try{ makeAvatar(true); }catch(e){ return {err:e.message}; } Object.defineProperty(proto,'font',d); return __polices;`);
  c('l’avatar à initiales : la police du système est donnée au canevas, et il la RETIENT (pas les 10 px par défaut)', Array.isArray(av) && av.length > 0 && av.every(x => /^(bold|700) 100px /.test(x.retenue) && !/space mono/i.test(x.retenue)), av);
  /* la colonne des montants des Statistiques */
  const bv = await S.ev(`const d=document.createElement('div'); d.className='bar-val'; d.textContent='1 055,00 €'; d.style.cssText='position:absolute;visibility:hidden;min-width:0;width:auto';
    document.getElementById('content').appendChild(d); const w=d.getBoundingClientRect().width; d.remove(); return Math.round(w);`);
  console.log('    (« 1 055,00 € » dans une barre de Statistiques : ' + bv + ' px — la colonne a un minimum de 64 px et s’étend, test-1243)');
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  await S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

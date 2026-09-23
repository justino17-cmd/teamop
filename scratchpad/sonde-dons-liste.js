/* ══ SONDE — DONNER PLUSIEURS PRODUITS DANS LA MÊME LISTE, AU DOIGT ═══════════════════════════
   Justin, 23 septembre 2026, capture de la fenêtre « Ces produits sont pour qui ? » à l'appui :
   « il faudrait pouvoir ajouter plusieurs produits dans la même liste quand on donne les
   produits ». La fenêtre porte désormais la liste : le produit touché y est, on en ajoute
   d'autres avec leur quantité, et un seul geste sort le tout sur UN bon de remise.
   Joué sur un iPhone de 402 px, en administrateur (sortie directe, sans DR), par de VRAIS
   touchers (`Input.dispatchTouchEvent`) et de vraies frappes (`Input.insertText`) :
     1. « − » sur A → la fenêtre s'ouvre avec A dans la liste, quantité 1 ;
     2. « Pour une autre personne », un nom tapé, « Ajouter un autre produit », B ajouté puis
        porté à 2, C ajouté puis retiré ;
     3. « Donner à … · 2 produits » → A −1, B −2, C intact, DEUX mouvements, UN bon de remise à
        deux lignes, le nom écrit dessus, et Produits donnés le montre ;
     4. la sortie suivante de la même box va à la même personne, sur le même bon ;
     5. ⛔ « Pour moi » avec un seul produit : il sort UNE fois (pas deux — la liste ET l'ancienne
        suite pourraient le sortir chacune) ;
     6. ⛔ une liste qui demande plus que la box n'a ne sort RIEN, et le dit ;
     7. annuler ne sort rien.
   ⛔ On compte la population (trois produits posés, des stocks connus). ⛔ Bêta uniquement,
   copie locale servie en 127.0.0.1. SOURCE=<une bêta d'avant> pour la contre-épreuve.        */
const path=require('path');
const {ouvrir,dormir}=require(path.join(__dirname,'pilote.js'));
let ok=0,ko=0; const vrai=(t,c,d)=>{ c?ok++:ko++; console.log((c?'  ✓ ':'  ✗ ')+t+(c||d===undefined?'':'  → '+JSON.stringify(d))); };
const v=(t,a,b)=>vrai(t,JSON.stringify(a)===JSON.stringify(b),a);

(async()=>{
  const S=await ouvrir(process.env.SOURCE?{source:process.env.SOURCE}:{});
  console.log('page mesurée :', S.version);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride',{width:402,height:874,deviceScaleFactor:3,mobile:true});
  await S.c.envoyer('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  try{ await S.c.envoyer('Emulation.setSafeAreaInsetsOverride',{insets:{top:59,bottom:34,left:0,right:0,topMax:59,bottomMax:34,leftMax:0,rightMax:0}}); }catch(e){}
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    window.__toasts=[]; const t0=window.toast; window.toast=function(m){ window.__toasts.push(String(m)); return t0.apply(this,arguments); }; return 1;`);

  /* Un toucher : l'élément au MILIEU de l'écran, puis un doigt posé et levé en son centre. */
  const toucher=async sel=>{
    const r=await S.ev(`const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; e.scrollIntoView({block:'center'});
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); const q=e.getBoundingClientRect();
      return {x:Math.round(q.left+q.width/2), y:Math.round(q.top+q.height/2)};`);
    if(!r) return false;
    await S.c.envoyer('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x,y:r.y}]}); await dormir(60);
    await S.c.envoyer('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await dormir(450);
    return true;
  };
  const taper=async(sel,texte)=>{ await S.ev(`const e=document.querySelector(${JSON.stringify(sel)}); if(e){ e.focus(); e.value=''; } return 1;`);
    await S.c.envoyer('Input.insertText',{text:texte}); await dormir(250); };
  const etat=()=>S.ev(`const b=db.boxes.find(x=>x.id==='bx-don'); const s=pid=>(b.stock[pid]||{}).u||0;
    const m=(db.mouvements||[]).filter(x=>x.boxId==='bx-don'&&x.type==='sortie');
    const br=(db.bonsRemise||[]).filter(x=>x.boxId==='bx-don');
    return {A:s('p-don-a'),B:s('p-don-b'),C:s('p-don-c'), mvts:m.map(x=>[x.produitId,x.qte,x.donneA||'']),
      bons:br.map(x=>({pourQui:x.pourQui, lignes:(x.lignes||[]).map(l=>[l.produitId,l.qte,l.unite])}))};`);
  /* Une fenêtre absente rend null ; `F0` la lit comme une fenêtre vide, pour qu'une bêta d'avant
     (contre-épreuve) COMPTE ses échecs au lieu de faire mourir la sonde. */
  const F0=f=>f||{titre:'',lignes:[],bouton:''};
  const fenetre=()=>S.ev(`const o=document.getElementById('overlay'); if(!o||!o.classList.contains('open')) return null;
    const h=(o.querySelector('.modal-head h3')||{}).textContent||'';
    return {titre:h.trim(), lignes:[...o.querySelectorAll('#don-liste .bl-r')].map(r=>({nom:(r.querySelector('.bl-nom')||{}).textContent, q:(r.querySelector('.bl-n')||{}).value, reste:(r.querySelector('.bl-s')||{}).textContent})),
      bouton:((o.querySelector('#don-go')||{}).textContent||'').trim()};`);

  /* La population : un administrateur, une box à lui, trois produits aux stocks connus. */
  const pop=await S.ev(`
    db.users=db.users||[]; let a=db.users.find(x=>x.id==='u-don'); if(!a){ a={id:'u-don',prenom:'Justin',nom:'Roux',login:'jr',role:'admin',actif:true,pref:{}}; db.users.push(a); }
    [['p-don-a','Appât pâte A'],['p-don-b','Gel blattes B'],['p-don-c','Colle souris C']].forEach(([id,nom])=>{ if(!(db.produits||[]).some(p=>p.id===id)) produitCreer({id,nom,categorie:'TP14',unite:'u'},{semis:true}); });
    db.boxes=(db.boxes||[]).filter(b=>b.id!=='bx-don');
    db.boxes.push({id:'bx-don',nom:'Box Nord (sonde)',visibleTous:true,actif:true,stock:{'p-don-a':{u:10,ctn:0},'p-don-b':{u:5,ctn:0},'p-don-c':{u:3,ctn:0}}});
    db.bonsRemise=(db.bonsRemise||[]).filter(r=>r.boxId!=='bx-don'); db.mouvements=(db.mouvements||[]).filter(m=>m.boxId!=='bx-don');
    db.bonsRemiseOff=false; save(); currentUser=a; enterApp(a); setPlatForce('iosweb');
    await new Promise(r=>setTimeout(r,1500)); try{ closeModal(true); }catch(e){}
    const f=document.getElementById('fdr-banner'); if(f) f.remove();
    go('boxes'); await new Promise(r=>setTimeout(r,700)); openBox('bx-don'); await new Promise(r=>setTimeout(r,1200));
    return {valid:boxValidRequis(), moins:document.querySelectorAll('button[onclick^="boxAdj(\\'p-don-"][onclick$="\\'u\\',-1)"]').length};`);
  console.log('\n══ 0. LA POPULATION ══');
  v('un administrateur (sortie directe), trois « − » à l’écran', pop, {valid:false, moins:3});
  v('stocks de départ', await etat(), {A:10,B:5,C:3,mvts:[],bons:[]});

  console.log('\n══ 1. « − » SUR A : LA FENÊTRE S’OUVRE AVEC A DANS LA LISTE ══');
  vrai('le « − » de A est touché', await toucher(`button[onclick="boxAdj('p-don-a','u',-1)"]`));
  await dormir(400);
  let F=await fenetre();
  vrai('⛔ la fenêtre « Ces produits sont pour qui ? » est ouverte', F && /pour qui/.test(F.titre), F);
  v('⛔⛔ A est déjà dans la liste, quantité 1', F && F.lignes.map(l=>[l.nom,l.q]), [['Appât pâte A','1']]);
  vrai('… et il dit ce qu’il restera (9 u)', !!(F && F.lignes[0]) && /il en restera 9 u/.test(F.lignes[0].reste), F && F.lignes[0]);
  v('le bouton dit ce qui va se passer', F && F.bouton, 'Sortir pour moi · 1 produit');

  console.log('\n══ 2. POUR UNE AUTRE PERSONNE, ET D’AUTRES PRODUITS DANS LA MÊME LISTE ══');
  await toucher('input[name=bd-qui][value=autre]');
  await taper('#bd-nom','Nadia Lopez');
  F=F0(await fenetre()); v('le bouton nomme la personne', F.bouton, 'Donner à Nadia Lopez · 1 produit');
  vrai('« Ajouter un autre produit » est touché', await toucher(`#don-ajout-bloc button`));
  vrai('⛔ la recherche propose B et C (pas A, déjà dans la liste)', await S.ev(`const t=[...document.querySelectorAll('#don-ajout .bl-add-n')].map(e=>e.textContent); return t.includes('Gel blattes B')&&t.includes('Colle souris C')&&!t.includes('Appât pâte A');`));
  await toucher(`#don-ajout button[onclick="donAjout('p-don-b')"]`);
  await toucher(`#don-r-p-don-b button[aria-label="Un de plus"]`);
  vrai('« Ajouter un autre produit » est touché une seconde fois', await toucher(`#don-ajout-bloc button`));
  await toucher(`#don-ajout button[onclick="donAjout('p-don-c')"]`);
  F=F0(await fenetre()); v('A ×1, B ×2, C ×1 dans la liste', F.lignes.map(l=>[l.nom,l.q]), [['Appât pâte A','1'],['Gel blattes B','2'],['Colle souris C','1']]);
  await toucher(`#don-r-p-don-c .bl-x`);
  F=F0(await fenetre()); v('C retiré de la liste (✕)', F.lignes.map(l=>l.nom), ['Appât pâte A','Gel blattes B']);
  vrai('B dit ce qu’il restera (3 u)', !!F.lignes[1] && /il en restera 3 u/.test(F.lignes[1].reste), F.lignes[1]);
  v('⛔ le bouton compte la liste', F.bouton, 'Donner à Nadia Lopez · 2 produits');
  v('⛔ rien n’est sorti tant qu’on n’a pas validé', await etat(), {A:10,B:5,C:3,mvts:[],bons:[]});

  console.log('\n══ 3. « DONNER » : UN GESTE, DEUX MOUVEMENTS, UN BON ══');
  await toucher('#don-go'); await dormir(500);
  const E=await etat();
  v('⛔⛔ A −1, B −2, C intact', [E.A,E.B,E.C], [9,3,3]);
  v('⛔ deux mouvements, chacun au nom de la personne', E.mvts.map(m=>m.join('|')).sort(), ['p-don-a|1|Nadia Lopez','p-don-b|2|Nadia Lopez']);
  v('⛔⛔ UN seul bon de remise, avec les deux lignes', E.bons, [{pourQui:'Nadia Lopez', lignes:[['p-don-a',1,'u'],['p-don-b',2,'u']]}]);
  vrai('le message le dit', (await S.ev(`return window.__toasts.slice(-1)[0]||''`)).includes('2 produits remis à Nadia Lopez — sur un seul bon de remise'));
  vrai('la fenêtre est refermée', !(await fenetre()));

  console.log('\n══ 4. LA SORTIE SUIVANTE VA À LA MÊME PERSONNE, SUR LE MÊME BON ══');
  await toucher(`button[onclick="boxAdj('p-don-c','u',-1)"]`); await dormir(400);
  vrai('pas de fenêtre : la personne est retenue pour la box', !(await fenetre()));
  const E4=await etat();
  v('C −1, et une troisième ligne sur le même bon', [E4.C, E4.bons.length, (E4.bons[0]||{lignes:[]}).lignes.length], [2,1,3]);

  console.log('\n══ 5. ⛔ « POUR MOI », UN SEUL PRODUIT : IL SORT UNE FOIS ══');
  await S.ev(`boxDonneOublier(); return 1;`);
  await toucher(`button[onclick="boxAdj('p-don-a','u',-1)"]`); await dormir(400);
  F=await fenetre(); v('la fenêtre se rouvre avec A ×1', F && F.lignes.map(l=>[l.nom,l.q]), [['Appât pâte A','1']]);
  await toucher('#don-go'); await dormir(500);
  const E5=await etat();
  v('⛔⛔ A passe de 9 à 8 — pas à 7 (la liste ET l’ancienne suite l’auraient sorti deux fois)', E5.A, 8);

  console.log('\n══ 6. ⛔ UNE LISTE QUI DEMANDE PLUS QUE LA BOX N’A NE SORT RIEN ══');
  await S.ev(`boxDonneChanger('bx-don'); return 1;`); await dormir(500);
  F=await fenetre(); vrai('« changer de personne » rouvre la fenêtre, liste vide et recherche ouverte', F && F.lignes.length===0 && !!(await S.ev(`return !!document.getElementById('don-rech')`)), F);
  await toucher(`#don-ajout button[onclick="donAjout('p-don-b')"]`);
  await taper('#don-i-p-don-b','99');
  F=F0(await fenetre()); vrai('la ligne le dit tout de suite', !!F.lignes[0] && /il n’y en a que 3 u/.test(F.lignes[0].reste), F.lignes[0]);
  await toucher('#don-go'); await dormir(400);
  const E6=await etat();
  v('⛔ rien n’a bougé', [E6.B, E6.mvts.length], [3, E5.mvts.length]);
  vrai('… et le message dit combien il y en a', (await S.ev(`return window.__toasts.slice(-1)[0]||''`)).includes('Il n’y a que 3 u'));
  vrai('la fenêtre reste ouverte pour corriger', !!(await fenetre()));

  console.log('\n══ 7. ANNULER NE SORT RIEN ══');
  await toucher('#overlay .modal-close'); await dormir(400);
  const E7=await etat();
  v('rien n’a bougé', [E7.A,E7.B,E7.C,E7.mvts.length], [E6.A,E6.B,E6.C,E6.mvts.length]);

  /* Trouvé en relecture le 23 septembre 2026 : la fenêtre gardait le geste d'origine et le
     rejouait quand la liste était vidée au ✕ — le produit sortait quand même, sans un mot. */
  console.log('\n══ 7 ter. ⛔⛔ LE PRODUIT TOUCHÉ, RETIRÉ AU ✕, NE SORT PAS ══');
  await S.ev(`boxDonneOublier(); return 1;`);
  await toucher(`button[onclick="boxAdj('p-don-a','u',-1)"]`); await dormir(400);
  F=await fenetre(); v('la fenêtre s’ouvre avec A ×1', F && F.lignes.map(l=>[l.nom,l.q]), [['Appât pâte A','1']]);
  vrai('le ✕ de la ligne A est touché', await toucher(`#don-r-p-don-a .bl-x`));
  F=F0(await fenetre()); v('… la liste est vide', F.lignes.length, 0);
  await toucher('#don-go'); await dormir(500);
  const E7t=await etat();
  v('⛔⛔ rien n’a bougé : ni A, ni les mouvements, ni les bons', [E7t.A, E7t.mvts.length, E7t.bons.length], [E7.A, E7.mvts.length, E7.bons.length]);
  vrai('⛔ et l’écran le dit', (await S.ev(`return window.__toasts.slice(-1)[0]||''`)).includes('Rien n’est sorti'));
  vrai('la fenêtre est fermée', !(await fenetre()));

  /* À la fin seulement : quitter la fiche de la box fait reposer la question « pour qui ? » —
     c'est voulu, et c'est ce qui avait fait dérailler les étapes 4 et 5 de la première version. */
  console.log('\n══ 7 bis. PRODUITS DONNÉS MONTRE LA REMISE ══');
  const PD=await S.ev(`go('produitsDonnes'); await new Promise(r=>setTimeout(r,900)); return [...document.querySelectorAll('#dons-list .pl-row')].map(e=>e.getAttribute('aria-label')||'');`);
  vrai('UNE remise à Nadia Lopez, avec ses trois produits (la liste, puis la sortie suivante)', PD.filter(x=>/a remis à Nadia Lopez/.test(x)).length===1 && PD.some(x=>/Appât pâte A, Gel blattes B, Colle souris C/.test(x)), PD);

  console.log('\n══ 8. AUCUNE ERREUR ══');
  v('exceptions', S.exceptions, []);
  v('erreurs console', S.consoleErr.filter(x=>!/net::|Failed to load|favicon/i.test(x)), []);
  console.log(`\n════ sonde-dons-liste : ${ok} ✓ ${ko} ✗ ════\n`);
  S.fermer(); process.exit(ko?1:0);
})().catch(e=>{console.error('SONDE MORTE :',e&&e.stack||e);process.exit(2);});

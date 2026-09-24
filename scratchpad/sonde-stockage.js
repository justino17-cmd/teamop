/* ══ SONDE — LE STOCKAGE HORS BOX (v741), AU DOIGT, DANS LA VRAIE PAGE ═══════════════════════════
   Justin, 24 septembre 2026 : « B, ça regroupe toutes les box — et si des entreprises n'ont pas de
   box, elles peuvent tout mettre dans le stock directement, et donner un accès aux utilisateurs qui
   se servent dans le stockage, avec un suivi de qui prend quoi ».
   Joué sur un iPhone de 402 px (encoches posées), par de VRAIS touchers et de vraies frappes :
     A. UNE ENTREPRISE SANS BOX
        0. la population : un administrateur, deux techniciens, trois produits dont deux portent un
           ancien stock du catalogue (`p.qte`) ;
        1. avant : Stock propose « Créer le stockage » et montre l'ancien stock « hors box » ; la
           cloche et Produits lisent le MÊME total ;
        2. « Créer le stockage » : l'ancien stock y est RANGÉ (p.qte → 0, le stockage le reçoit,
           une ligne au journal par produit), et un second geste n'en crée pas un second ;
        3. « Qui peut s'y servir » : l'administrateur coche Karim, enregistre ;
        4. Karim se connecte, « Me servir », « Pour moi », 3 unités → le stockage baisse de 3, le
           mouvement et le bon de remise portent son nom ; « Qui a pris quoi » le montre ;
        5. ⛔ Karim clôture une intervention avec ce produit : le stockage NE BOUGE PAS (ce qu'il a
           pris est déjà sorti) ;
        6. Sofia, sans accès : Stock le lui DIT, « Me servir » refuse, Boxes ne le montre pas, et
           elle n'est pas marquée « sans box » (le stockage n'est pas une box).
     B. UNE ENTREPRISE AVEC DES BOX ET UN STOCKAGE
        7. la clôture puise dans la box du technicien, jamais dans le stockage ;
        8. la commande suggérée prend le PLUS GRAND des deux besoins (box, seuil), pas leur somme.
   ⛔ On compte la population avant de croire un zéro. ⛔ Bêta uniquement, copie locale servie en
   127.0.0.1. SOURCE=<une bêta d'avant> pour la contre-épreuve (la sonde compte ses échecs au lieu
   de mourir). CAPTURES=<dossier> pour les images.                                                */
const path=require('path'), fs=require('fs');
const {ouvrir,dormir}=require(path.join(__dirname,'pilote.js'));
let ok=0,ko=0; const vrai=(t,c,d)=>{ c?ok++:ko++; console.log((c?'  ✓ ':'  ✗ ')+t+(c||d===undefined?'':'  → '+JSON.stringify(d))); };
const v=(t,a,b)=>vrai(t,JSON.stringify(a)===JSON.stringify(b),a);
const CAP=process.env.CAPTURES||'';

(async()=>{
  const S=await ouvrir(process.env.SOURCE?{source:process.env.SOURCE}:{});
  console.log('page mesurée :', S.version);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride',{width:402,height:874,deviceScaleFactor:3,mobile:true});
  await S.c.envoyer('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await S.c.envoyer('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  try{ await S.c.envoyer('Emulation.setSafeAreaInsetsOverride',{insets:{top:59,bottom:34,left:0,right:0,topMax:59,bottomMax:34,leftMax:0,rightMax:0}}); }catch(e){}
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    window.__toasts=[]; const t0=window.toast; window.toast=function(m){ window.__toasts.push(String(m)); return t0.apply(this,arguments); }; return 1;`);
  const cap=async n=>{ if(!CAP) return; await dormir(450); fs.mkdirSync(CAP,{recursive:true});
    const s=await S.c.envoyer('Page.captureScreenshot',{format:'png'}); fs.writeFileSync(path.join(CAP,n+'.png'),Buffer.from(s.data,'base64')); };
  const toucher=async sel=>{
    const r=await S.ev(`const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; e.scrollIntoView({block:'center'});
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); const q=e.getBoundingClientRect();
      return {x:Math.round(q.left+q.width/2), y:Math.round(q.top+q.height/2)};`);
    if(!r) return false;
    await S.c.envoyer('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x,y:r.y}]}); await dormir(60);
    await S.c.envoyer('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await dormir(500);
    return true; };
  /* Un bouton par son LIBELLÉ : les sélecteurs d'attribut visent le code, le libellé vise ce que l'œil lit. */
  const toucherTexte=async(zone,texte)=>{ const id=await S.ev(`const z=document.querySelector(${JSON.stringify(zone)}); if(!z) return null;
      const b=[...z.querySelectorAll('button,[role=button]')].find(x=>x.textContent.replace(/\\s+/g,' ').trim().startsWith(${JSON.stringify(texte)})); if(!b) return null;
      b.setAttribute('data-sonde','1'); return 1;`);
    if(!id) return false; const r=await toucher('[data-sonde="1"]'); await S.ev(`const b=document.querySelector('[data-sonde="1"]'); if(b) b.removeAttribute('data-sonde'); return 1;`); return r; };
  const taper=async(sel,texte)=>{ await S.ev(`const e=document.querySelector(${JSON.stringify(sel)}); if(e){ e.focus(); e.value=''; } return 1;`);
    await S.c.envoyer('Input.insertText',{text:texte}); await dormir(300); };
  const texte=sel=>S.ev(`const e=document.querySelector(${JSON.stringify(sel)}); return e?e.textContent.replace(/\\s+/g,' ').trim():null;`);
  const fenetre=()=>S.ev(`const o=document.getElementById('overlay'); if(!o||!o.classList.contains('open')) return null;
    return {titre:((o.querySelector('.modal-head h3')||{}).textContent||'').trim(), texte:o.textContent.replace(/\\s+/g,' ').trim().slice(0,600)};`);
  const connecter=async id=>{ await S.ev(`try{ closeModal(true); }catch(e){} const u=db.users.find(x=>x.id===${JSON.stringify(id)}); currentUser=u; enterApp(u); try{ setPlatForce('iosweb'); }catch(e){}
      await new Promise(r=>setTimeout(r,1400)); try{ closeModal(true); }catch(e){} const f=document.getElementById('fdr-banner'); if(f) f.remove(); return 1;`); };
  const etat=()=>S.ev(`const s=(db.boxes||[]).find(b=>b.id==='stockage'); const u=pid=>s&&s.stock&&s.stock[pid]?(s.stock[pid].u||0):null;
    const P=id=>(db.produits.find(p=>p.id===id)||{}).qte||0;
    return {existe:!!s, nbStockages:(db.boxes||[]).filter(b=>b.id==='stockage'||b.stockage).length, a:u('p-stk-a'), b:u('p-stk-b'), c:u('p-stk-c'),
      qteA:P('p-stk-a'), qteC:P('p-stk-c'),
      mvts:(db.mouvements||[]).filter(m=>m.boxId==='stockage').map(m=>[m.produitId,m.type,m.qte,m.technicien||'',m.donneA||'']),
      bons:(db.bonsRemise||[]).filter(r=>r.boxId==='stockage').map(r=>({pourQui:r.pourQui,lignes:(r.lignes||[]).map(l=>[l.produitId,l.qte])}))};`);

  /* ══ 0. LA POPULATION ══ */
  console.log('\n══ A.0 LA POPULATION — UNE ENTREPRISE SANS BOX ══');
  const pop=await S.ev(`
    db.users=(db.users||[]).filter(u=>!/^u-stk-/.test(u.id));
    db.users.push({id:'u-stk-a',prenom:'Justin',nom:'Roux',login:'jr-stk',role:'admin',actif:true,pref:{}},
      {id:'u-stk-k',prenom:'Karim',nom:'Benali',login:'kb-stk',role:'technicien',techId:'t-stk-k',actif:true,pref:{}},
      {id:'u-stk-s',prenom:'Sofia',nom:'Perez',login:'sp-stk',role:'technicien',techId:'t-stk-s',actif:true,pref:{}});
    db.techniciens=(db.techniciens||[]).filter(t=>!/^t-stk-/.test(t.id)).concat([{id:'t-stk-k',nom:'Benali',prenom:'Karim'},{id:'t-stk-s',nom:'Perez',prenom:'Sofia'}]);
    db.produits=(db.produits||[]).filter(p=>!/^p-stk-/.test(p.id));
    produitCreer({id:'p-stk-a',nom:'ADVION GEL BLATTES 30G',ref:'ADV30',categorie:'TP18 — Insecticide',unite:'u',qte:12,seuil:5},{semis:true});
    produitCreer({id:'p-stk-b',nom:'PIÈGE COLLANT RAMPANTS',ref:'PIE05',categorie:'Piégeage',unite:'u',qte:0},{semis:true});
    produitCreer({id:'p-stk-c',nom:'RATICIDE GRAINS 30G',ref:'RG30',categorie:'TP14 — Rodenticide',unite:'u',qte:3,seuil:10},{semis:true});
    db.boxes=[]; db.mouvements=(db.mouvements||[]).filter(m=>!/^p-stk-/.test(m.produitId)); db.bonsRemise=[];
    db.validDRTous=false; db.bonsRemiseOff=false; save();
    return {users:db.users.filter(u=>/^u-stk-/.test(u.id)).length, produits:db.produits.filter(p=>/^p-stk-/.test(p.id)).map(p=>[p.id,p.qte||0,p.seuil||0]), boxes:db.boxes.length};`);
  v('trois comptes, trois produits (ancien stock 12 et 3), aucune box', pop, {users:3, produits:[['p-stk-a',12,5],['p-stk-b',0,0],['p-stk-c',3,10]], boxes:0});
  await connecter('u-stk-a');

  console.log('\n══ A.1 AVANT : STOCK PROPOSE LE STOCKAGE, ET TROIS ÉCRANS DISENT LA MÊME CHOSE ══');
  await S.ev(`stockSearch=''; stockFiltreManque=false; go('stock'); await new Promise(r=>setTimeout(r,900)); return 1;`);
  const carte0=await texte('#content .stk-carte');
  vrai('⛔ Stock propose « Créer le stockage »', !!carte0 && /Pas de box \? Range tout dans le stockage/.test(carte0) && /Créer le stockage/.test(carte0), carte0);
  vrai('… et annonce l’ancien stock du catalogue qui y sera rangé (2 produits · 15 u)', !!carte0 && /2 produits · 15 u/.test(carte0), carte0);
  const ligneA0=await S.ev(`const r=document.querySelector('#stock-list .pl-row[data-pid="p-stk-a"]'); return r?r.textContent.replace(/\\s+/g,' ').trim():null;`);
  vrai('⛔ la ligne de Stock montre l’ancien stock « hors box » (12)', !!ligneA0 && /Hors box \(catalogue\) : 12 u/.test(ligneA0) && /12\s*unités/.test(ligneA0), ligneA0);
  const cloche0=await S.ev(`return computeNotifs().filter(n=>/^stock:p-stk-/.test(n.id)).map(n=>String(n.txt).replace(/<[^>]+>/g,''));`);
  v('⛔ la cloche lit le même total : RATICIDE (3/10) bas, ADVION (12/5) non', cloche0, ['Stock bas : RATICIDE GRAINS 30G (3/10)']);
  await cap('A1-stock-avant');

  console.log('\n══ A.2 « CRÉER LE STOCKAGE » : L’ANCIEN STOCK Y EST RANGÉ ══');
  vrai('le bouton « Créer le stockage » est touché', await toucherTexte('#content .stk-carte','Créer le stockage'));
  await dormir(500);
  const e2=await etat();
  v('⛔⛔ le stockage existe, UN seul, et reçoit 12 et 3', [e2.existe,e2.nbStockages,e2.a,e2.b,e2.c], [true,1,12,null,3]);
  v('⛔⛔ l’ancien stock quitte le catalogue (p.qte → 0) — le total ne compte pas deux fois', [e2.qteA,e2.qteC], [0,0]);
  v('⛔ une ligne au journal par produit rangé, au nom de qui l’a fait', e2.mvts.map(m=>m.slice(0,4).join('|')).sort(), ['p-stk-a|entree|12|Justin Roux','p-stk-c|entree|3|Justin Roux']);
  const carte2=await texte('#content .stk-carte');
  vrai('la carte du stockage : 2 produits · 15 u, et ses gestes', !!carte2 && /2 produits · 15 u/.test(carte2) && /Me servir/.test(carte2) && /Arrivage/.test(carte2) && /Qui a pris quoi/.test(carte2) && /Qui peut s'y servir 1 personne\b/.test(carte2), carte2);
  const ligneA2=await S.ev(`const r=document.querySelector('#stock-list .pl-row[data-pid="p-stk-a"]'); return r?r.textContent.replace(/\\s+/g,' ').trim():null;`);
  vrai('⛔ la ligne de Stock dit « 🏬 Stockage : 12 u », sans « hors box » en double', !!ligneA2 && /🏬 Stockage : 12 u/.test(ligneA2) && !/Hors box/.test(ligneA2), ligneA2);
  await S.ev(`stockageCreer(); await new Promise(r=>setTimeout(r,300)); return 1;`);
  v('⛔ un second geste ne crée pas un second stockage', (await etat()).nbStockages, 1);
  await S.ev(`prdSearch=''; prdExpanded={}; go('produits'); await new Promise(r=>setTimeout(r,800)); CAT_LIST.forEach(c=>prdExpanded[c]=true); renderProduitsList(); return 1;`);
  const prd=await S.ev(`const r={}; [...document.querySelectorAll('#prd-list .pl-row')].forEach(x=>{ const t=x.textContent.replace(/\\s+/g,' '); if(/ADVION/.test(t)) r.a=t; if(/PIÈGE COLLANT/.test(t)) r.b=t; if(/RATICIDE GRAINS/.test(t)) r.c=t; }); return r;`);
  vrai('⛔ Produits lit le même total : ADVION « En stock · 12 u »', /En stock · 12 u/.test(prd.a||''), prd.a);
  vrai('… PIÈGE, que personne n’a : « Épuisé » (l’administrateur voit tout)', /Épuisé/.test(prd.b||''), prd.b);
  await S.ev(`go('stock'); await new Promise(r=>setTimeout(r,700)); return 1;`); await cap('A2-stock-stockage');

  console.log('\n══ A.3 « QUI PEUT S’Y SERVIR » : L’ADMINISTRATEUR DONNE L’ACCÈS À KARIM ══');
  vrai('« Qui peut s’y servir » est touché', await toucherTexte('#content .stk-carte','Qui peut s'));
  let F=await fenetre();
  vrai('la fenêtre s’ouvre', !!F && /Qui peut s’y servir/.test(F.titre), F);
  const lignes3=await S.ev(`return [...document.querySelectorAll('#stk-gens label')].map(l=>({t:l.textContent.replace(/\\s+/g,' ').trim(), on:l.querySelector('input').checked, off:l.querySelector('input').disabled})).filter(x=>/Roux|Benali|Perez/.test(x.t));`);
  v('⛔ l’administrateur d’office (coché, grisé) ; Karim et Sofia non cochés', lignes3.map(x=>[x.t.split(' ·')[0],x.on,x.off]), [['Justin Roux',true,true],['Karim Benali',false,false],['Sofia Perez',false,false]]);
  await cap('A3-acces');
  await S.ev(`const l=[...document.querySelectorAll('#stk-gens label')].find(x=>/Karim Benali/.test(x.textContent)); l.querySelector('input').setAttribute('data-sonde','1'); return 1;`);
  await toucher('[data-sonde="1"]');
  vrai('« Enregistrer » est touché', await toucherTexte('#overlay .modal-head','Enregistrer'));
  const acc=await S.ev(`const s=db.boxes.find(b=>b.id==='stockage'); return {userIds:s.userIds||[], exclus:s.userIdsExclus||[], tous:!!s.visibleTous};`);
  v('⛔⛔ Karim est dans les personnes autorisées ; personne n’est ouvert d’office à tort', acc, {userIds:['u-stk-k'], exclus:[], tous:false});
  const carte3=await texte('#content .stk-carte');
  vrai('la carte compte 2 personnes (l’administrateur et Karim)', !!carte3 && /Qui peut s'y servir 2 personnes/.test(carte3), carte3);

  console.log('\n══ A.4 KARIM SE SERT : « ME SERVIR », POUR MOI, 3 UNITÉS ══');
  await connecter('u-stk-k');
  await S.ev(`go('stock'); await new Promise(r=>setTimeout(r,800)); return 1;`);
  const carteK=await texte('#content .stk-carte');
  vrai('⛔ Karim voit la carte du stockage, sans le réglage des accès (il ne gère pas les box)', !!carteK && /Me servir/.test(carteK) && !/Qui peut s'y servir/.test(carteK), carteK);
  vrai('« Me servir » est touché', await toucherTexte('#content .stk-carte','Me servir'));
  await dormir(700);
  F=await fenetre();
  vrai('⛔ le stockage s’ouvre, et la liste « pour qui ? » avec « Pour moi »', !!F && /pour qui/.test(F.titre) && /Pour moi — Karim Benali/.test(F.texte) && /Sortie du stockage/.test(F.texte) && /Chercher dans le stockage/.test(await S.ev(`return (document.getElementById('don-rech')||{}).placeholder||''`)), F);
  await cap('A4-me-servir');
  vrai('ADVION est ajouté à la liste', await toucher(`#don-ajout button[onclick="donAjout('p-stk-a')"]`));
  await taper('#don-i-p-stk-a','3');
  await S.ev(`const i=document.getElementById('don-i-p-stk-a'); if(i) i.dispatchEvent(new Event('change',{bubbles:true})); return 1;`);
  vrai('« Sortir pour moi » est touché', await toucher('#don-go'));
  await dormir(500);
  const e4=await etat();
  v('⛔⛔ le stockage baisse de 3 (12 → 9)', e4.a, 9);
  v('⛔⛔ la sortie porte le nom de Karim — qui a pris quoi', e4.mvts.filter(m=>m[1]==='sortie').map(m=>m.join('|')), ['p-stk-a|sortie|3|Karim Benali|Karim Benali']);
  v('⛔ et un bon de remise à son nom', e4.bons, [{pourQui:'Karim Benali',lignes:[['p-stk-a',3]]}]);
  await S.ev(`go('stock'); await new Promise(r=>setTimeout(r,700)); return 1;`);
  vrai('« Qui a pris quoi » est touché', await toucherTexte('#content .stk-carte','Qui a pris quoi'));
  await dormir(700);
  const jr=await S.ev(`return {vue:current, box:mvtFBox, type:mvtFType, texte:document.getElementById('content').textContent.replace(/\\s+/g,' ')};`);
  vrai('⛔ le journal s’ouvre sur les sorties du stockage', jr.vue==='mouvements' && jr.box==='stockage' && jr.type==='sortie', [jr.vue,jr.box,jr.type]);
  vrai('… rangé sous « 🏬 Stockage »', /🏬 Stockage/.test(jr.texte), jr.texte.slice(0,300));
  await S.ev(`const c=[...document.querySelectorAll('#content [onclick^="mvtToggleBox"]')].find(x=>/Stockage/.test(x.textContent)); if(c) c.click(); await new Promise(r=>setTimeout(r,500)); return 1;`);
  const jr2=await S.ev(`return document.getElementById('content').textContent.replace(/\\s+/g,' ');`);
  vrai('… et la ligne dit qui a pris quoi (ADVION −3, Karim)', /ADVION GEL BLATTES 30G/.test(jr2) && /Karim Benali/.test(jr2) && /−3/.test(jr2), jr2.slice(0,500));
  await cap('A4-qui-a-pris-quoi');

  console.log('\n══ A.5 ⛔ KARIM CLÔTURE UNE INTERVENTION : LE STOCKAGE NE BOUGE PAS ══');
  const e5=await S.ev(`window.__toasts=[]; const i={id:'i-stk-1',num:'INT-STK-1',titre:'Cuisine',techIds:['t-stk-k'],produitsUtilises:[{produitId:'p-stk-a',qte:2,unite:'u'}]};
    const av=(db.mouvements||[]).length; intStockDeduire(i);
    const s=db.boxes.find(b=>b.id==='stockage'); return {a:s.stock['p-stk-a'].u, qte:(db.produits.find(p=>p.id==='p-stk-a')||{}).qte||0, nouveaux:(db.mouvements||[]).length-av, deduit:!!i.stockDeduit, toasts:window.__toasts.filter(t=>/insuffisant/i.test(t))};`);
  v('⛔⛔ stockage 9 → 9, compteur du catalogue 0, aucune ligne au journal, aucun faux « stock insuffisant »', e5, {a:9,qte:0,nouveaux:0,deduit:true,toasts:[]});

  console.log('\n══ A.6 SOFIA, SANS ACCÈS ══');
  await connecter('u-stk-s');
  await S.ev(`go('stock'); await new Promise(r=>setTimeout(r,800)); return 1;`);
  const carteS=await S.ev(`return document.getElementById('content').textContent.replace(/\\s+/g,' ');`);
  vrai('⛔ Stock le lui DIT au lieu de se taire', /Le stockage de l'entreprise ne t'est pas ouvert/.test(carteS) && !/Me servir/.test(carteS), carteS.slice(0,400));
  const refus=await S.ev(`window.__toasts=[]; boxView=null; stockageServir(); await new Promise(r=>setTimeout(r,300)); return {toast:window.__toasts.slice(-1)[0]||'', vue:current, boxView};`);
  vrai('⛔ « Me servir » appelé quand même : refus, rien ne s’ouvre', /ne t’est pas ouvert/.test(refus.toast) && refus.boxView!=='stockage', refus);
  await S.ev(`go('boxes'); await new Promise(r=>setTimeout(r,700)); return 1;`);
  vrai('⛔ Boxes ne lui montre pas le stockage', !/🏬|Le stock hors des box/.test(await S.ev(`return document.getElementById('content').textContent`)));
  await connecter('u-stk-a');
  v('⛔ elle n’est pas marquée « sans box » (le stockage n’est pas une box, et l’entreprise n’en a pas)', await S.ev(`return usrSansBox(db.users.find(u=>u.id==='u-stk-s'))`), false);
  await S.ev(`go('boxes'); await new Promise(r=>setTimeout(r,800)); return 1;`);
  const bx=await S.ev(`return {cadre:(document.querySelector('.topbar')||document.body).textContent.replace(/\\s+/g,' '), tete:((document.querySelector('#boxes-list .pl-row')||{}).textContent||'').replace(/\\s+/g,' ').trim()};`);
  vrai('l’administrateur voit le stockage en tête de Boxes', /Stockage/.test(bx.tete) && /Le stock hors des box/.test(bx.tete), bx.tete);
  vrai('… et le cadre ne le compte pas pour une box', /0 box · \+ le stockage/.test(bx.cadre), bx.cadre.slice(0,200));
  await cap('A6-boxes');
  await S.ev(`openBox('stockage'); await new Promise(r=>setTimeout(r,900)); return 1;`);
  const fiche=await S.ev(`return document.getElementById('content').textContent.replace(/\\s+/g,' ');`);
  vrai('la fiche du stockage dit ce qu’il est, et ne propose pas de « Relevé » de site', /🏬/.test(fiche) && /Stockage/.test(fiche) && /Il baisse quand quelqu'un s'y sert/.test(fiche) && !/Relevé/.test(fiche) && /Qui peut s'y servir/.test(fiche), fiche.slice(0,400));
  await cap('A6-fiche-stockage');

  console.log('\n══ B.7 AVEC DES BOX : LA CLÔTURE PUISE DANS LA BOX, JAMAIS DANS LE STOCKAGE ══');
  const e7=await S.ev(`window.__toasts=[];
    db.boxes=db.boxes.filter(b=>b.id!=='bx-stk-nord'); db.boxes.push({id:'bx-stk-nord',nom:'Box Nord (sonde)',actif:true,techIds:['t-stk-k'],stock:{'p-stk-a':{u:5,ctn:0}}});
    const s=db.boxes.find(b=>b.id==='stockage'); s.stock['p-stk-a']={u:20,ctn:0}; save();
    currentUser=db.users.find(u=>u.id==='u-stk-k');
    const i={id:'i-stk-2',num:'INT-STK-2',titre:'Réserve',techIds:['t-stk-k'],produitsUtilises:[{produitId:'p-stk-a',qte:7,unite:'u'}]};
    intStockDeduire(i);
    const n=db.boxes.find(b=>b.id==='bx-stk-nord');
    const r={nord:n.stock['p-stk-a'].u, stockage:s.stock['p-stk-a'].u, toasts:window.__toasts.filter(t=>/insuffisant/i.test(t))};
    currentUser=db.users.find(u=>u.id==='u-stk-a'); return r;`);
  v('⛔⛔ la box Nord donne ses 5, le stockage garde ses 20, et Karim (qui a accès au stockage) n’est pas alerté', e7, {nord:0,stockage:20,toasts:[]});
  const e7b=await S.ev(`window.__toasts=[]; currentUser=db.users.find(u=>u.id==='u-stk-s');
    const i={id:'i-stk-3',num:'INT-STK-3',titre:'Cave',techIds:['t-stk-s'],produitsUtilises:[{produitId:'p-stk-c',qte:4,unite:'u'}]};
    intStockDeduire(i); const s=db.boxes.find(b=>b.id==='stockage'); const r={stockage:s.stock['p-stk-c'].u, toasts:window.__toasts.filter(t=>/insuffisant/i.test(t)).length};
    currentUser=db.users.find(u=>u.id==='u-stk-a'); return r;`);
  v('⛔ Sofia (sans accès au stockage) : le stockage ne bouge pas, et le manque est signalé', e7b, {stockage:3,toasts:1});

  console.log('\n══ B.8 LA COMMANDE SUGGÉRÉE : LE PLUS GRAND DES DEUX BESOINS ══');
  const e8=await S.ev(`const s=db.boxes.find(b=>b.id==='stockage'); s.stock['p-stk-c']={u:1,ctn:0}; save();
    bonSuggere(); await new Promise(r=>setTimeout(r,400)); const L=(typeof bonLignes!=='undefined'?bonLignes:[]).map(l=>[l.produitId,l.quantite]).filter(x=>/^p-stk-/.test(x[0])); try{ closeModal(true); }catch(e){} return L.sort();`);
  /* ADVION : Nord à 0 → besoin de box 3 ; total 20 > seuil 5 → pas de besoin de seuil → 3.
     RATICIDE : stockage à 1 → besoin de box 2 ; total 1 ≤ seuil 10 → 2×10−1 = 19 → le plus grand, 19 (pas 21). */
  v('⛔⛔ ADVION 3 (la box), RATICIDE 19 (le seuil) — pas 21', e8, [['p-stk-a',3],['p-stk-c',19]]);

  console.log('\n══ PAGE ══');
  v('aucune exception JavaScript', S.exceptions, []);
  console.log(`\n════ sonde-stockage : ${ok} ✓ ${ko} ✗ ════`);
  S.fermer(); process.exit(ko?1:0);
})().catch(e=>{ console.error(e); console.log(`\n════ sonde-stockage : ${ok} ✓ ${ko+1} ✗ ════`); process.exit(1); });

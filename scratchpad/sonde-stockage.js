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
        3. « Qui peut s'y servir » : l'administrateur coche Karim, enregistre — v742 : c'est SA
           PERMISSION « Se servir dans le stockage » qui est écrite, plus rien sur la box ;
        4. Karim se connecte, « Me servir », « Pour moi », 3 unités → le stockage baisse de 3, le
           mouvement et le bon de remise portent son nom ; « Qui a pris quoi » le montre ;
        5. ⛔⛔ Karim clôture une intervention par le compte-rendu : RIEN ne bouge — ni stockage, ni
           compteur, ni journal (Justin : « on doit juste savoir ce qu'il a utilisé ») — et ce qu'il a
           utilisé est noté sur l'intervention, au registre biocide, et la fiche le dit ;
        6. Sofia, sans accès : Stock le lui DIT, « Me servir » refuse, Boxes ne le montre pas, et
           elle n'est pas marquée « sans box » (le stockage n'est pas une box).
     B. UNE ENTREPRISE AVEC DES BOX ET UN STOCKAGE
        7. ⛔⛔ trois autres portes de clôture (l'assistant avec un produit ajouté, le compte-rendu avec
           la validation du DR allumée, le menu « Statut » et la case « Effectué ? » pour Sofia) : ni la
           box, ni le stockage, ni le DR, ni un faux « stock insuffisant » ;
        8. la commande suggérée prend le PLUS GRAND des deux besoins (box, seuil), pas leur somme.
   ⛔ On compte la population avant de croire un zéro. ⛔ Bêta uniquement, copie locale servie en
   127.0.0.1. SOURCE=<une bêta d'avant> pour la contre-épreuve (la sonde compte ses échecs au lieu
   de mourir). CAPTURES=<dossier> pour les images.                                                */
const path=require('path'), fs=require('fs');
const {ouvrir,dormir}=require(path.join(__dirname,'pilote.js'));
let ok=0,ko=0; const vrai=(t,c,d)=>{ c?ok++:ko++; console.log((c?'  ✓ ':'  ✗ ')+t+(c||d===undefined?'':'  → '+JSON.stringify(d))); };
const v=(t,a,b)=>vrai(t,JSON.stringify(a)===JSON.stringify(b),a);
const CAP=process.env.CAPTURES||'';
let navigateur=null;

(async()=>{
  const S=await ouvrir(process.env.SOURCE?{source:process.env.SOURCE}:{}); navigateur=S;
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
  vrai('la carte du stockage : 2 produits · 15 u, et ses gestes', !!carte2 && /2 produits · 15 u/.test(carte2) && /Me servir/.test(carte2) && /Arrivage/.test(carte2) && /Qui a pris quoi/.test(carte2) && /Qui peut s[’']y servir 1 personne\b/.test(carte2), carte2);
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
  /* v742 — Justin : « l'accès au stockage est une permission ». La fenêtre écrit la CASE de chacun
     (« Se servir dans le stockage »), plus rien sur la box. */
  const acc=await S.ev(`const s=db.boxes.find(b=>b.id==='stockage'); const c=id=>{ const u=db.users.find(x=>x.id===id); return u&&u.acces&&u.acces.caps&&Object.prototype.hasOwnProperty.call(u.acces.caps,'stockage')?u.acces.caps.stockage:'non réglée'; };
    return {karim:c('u-stk-k'), sofia:c('u-stk-s'), userIds:s.userIds||[], exclus:s.userIdsExclus||[], tous:!!s.visibleTous};`);
  v('⛔⛔ la permission de Karim est écrite ; Sofia n’est pas touchée ; rien n’est posé sur la box', acc, {karim:true, sofia:'non réglée', userIds:[], exclus:[], tous:false});
  const carte3=await texte('#content .stk-carte');
  vrai('la carte compte 2 personnes (l’administrateur et Karim)', !!carte3 && /Qui peut s[’']y servir 2 personnes/.test(carte3), carte3);

  console.log('\n══ A.4 KARIM SE SERT : « ME SERVIR », POUR MOI, 3 UNITÉS ══');
  await connecter('u-stk-k');
  await S.ev(`go('stock'); await new Promise(r=>setTimeout(r,800)); return 1;`);
  const carteK=await texte('#content .stk-carte');
  vrai('⛔ Karim voit la carte du stockage, sans le réglage des accès (il ne gère pas les box)', !!carteK && /Me servir/.test(carteK) && !/Qui peut s[’']y servir/.test(carteK), carteK);
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

  console.log('\n══ A.5 ⛔⛔ KARIM CLÔTURE PAR LE COMPTE-RENDU : RIEN NE BOUGE, CE QU’IL A UTILISÉ EST NOTÉ ══');
  /* Justin, 24 septembre 2026 : « le produit ne doit pas se déduire par intervention, on doit juste savoir ce
     qu'il a utilisé, sinon ça fausserait tout le stock ou la box ». On clôture par la VRAIE fenêtre — la case
     « Intervention effectuée » puis 💾, au doigt — et on compte ce qui a bougé. */
  const av5=await S.ev(`window.__toasts=[];
    db.clients=(db.clients||[]).filter(c=>!/^c-stk-/.test(c.id)); db.clients.push({id:'c-stk-1',nom:'Restaurant Sonde',adresse:'1 rue de la Sonde',ville:'Lyon'});
    db.interventions=(db.interventions||[]).filter(i=>!/^i-stk-/.test(i.id));
    db.interventions.push({id:'i-stk-1',num:'INT-STK-1',titre:'Cuisine (sonde)',clientId:'c-stk-1',date:todayISO(),heure:'09:00',duree:60,
      techIds:['t-stk-k'],techId:'t-stk-k',statut:'encours',debutReel:Date.now()-3600000,produitsUtilises:[{produitId:'p-stk-a',qte:2,unite:'u'}]});
    save(); return {mvts:(db.mouvements||[]).length, bons:(db.bonsRemise||[]).length, attente:(db.boxMvtAttente||[]).length};`);
  vrai('population : le journal n’est pas vide avant la clôture (le zéro qui suit se lit contre quelque chose)', av5.mvts>=3, av5);
  await S.ev(`formRapport('i-stk-1'); await new Promise(r=>setTimeout(r,700)); return 1;`);
  vrai('la case « Intervention effectuée » est touchée', await toucher('#rapform input[name="effectuee"]'));
  v('… et elle est cochée', await S.ev(`return !!(document.querySelector('#rapform input[name="effectuee"]')||{}).checked;`), true);
  vrai('« 💾 » est touché', await toucher('#overlay .modal-head button[type="submit"]'));
  await dormir(800);
  const e5=await S.ev(`const i=db.interventions.find(x=>x.id==='i-stk-1'); const s=db.boxes.find(b=>b.id==='stockage');
    return {statut:i.statut, stockage:s.stock['p-stk-a'].u, catalogue:(db.produits.find(p=>p.id==='p-stk-a')||{}).qte||0,
      journal:(db.mouvements||[]).length-${av5.mvts}, bons:(db.bonsRemise||[]).length-${av5.bons}, dr:(db.boxMvtAttente||[]).length-${av5.attente},
      deduit:!!i.stockDeduit, toasts:window.__toasts.filter(t=>/insuffisant|déduit|validation/i.test(t))};`);
  v('⛔⛔ clôturée ; stockage 9 → 9, catalogue 0, aucune ligne au journal, aucun bon, rien au DR, aucun « stock insuffisant »', e5,
    {statut:'terminee',stockage:9,catalogue:0,journal:0,bons:0,dr:0,deduit:false,toasts:[]});
  const n5=await S.ev(`const i=db.interventions.find(x=>x.id==='i-stk-1'); return {lignes:(i.produitsUtilises||[]).map(l=>[l.produitId,l.qte,l.unite]),
    registre:registreBiocides('c-stk-1').filter(r=>r.intId==='i-stk-1').map(r=>[r.nom,r.qte,r.unite])};`);
  v('⛔⛔ … et ce qu’il a utilisé est NOTÉ : sur l’intervention, et au registre biocide du client', n5, {lignes:[['p-stk-a',2,'u']], registre:[['ADVION GEL BLATTES 30G',2,'u']]});
  await S.ev(`try{ closeModal(true); }catch(e){} detailIntervention('i-stk-1'); await new Promise(r=>setTimeout(r,900)); return 1;`);
  const f5=await S.ev(`return document.getElementById('content').textContent.replace(/\\s+/g,' ');`);
  vrai('la fiche le dit : « Noté sur le rapport et au registre — le stock ne bouge pas », jamais « sera déduit »', /ADVION GEL BLATTES 30G/.test(f5) && /Noté sur le rapport et au registre/.test(f5) && /le stock ne bouge pas/.test(f5) && !/sera déduit/.test(f5), f5.slice(0,500));
  await S.ev(`const h=[...document.querySelectorAll('#content .card h3')].find(x=>/Produits & matériel/.test(x.textContent)); if(h) h.closest('.card').scrollIntoView({block:'center'}); return 1;`);
  await cap('A5-fiche-cloturee');

  console.log('\n══ A.6 SOFIA, SANS ACCÈS ══');
  await connecter('u-stk-s');
  await S.ev(`go('stock'); await new Promise(r=>setTimeout(r,800)); return 1;`);
  const carteS=await S.ev(`return document.getElementById('content').textContent.replace(/\\s+/g,' ');`);
  vrai('⛔ Stock le lui DIT au lieu de se taire', /Le stockage de l[’']entreprise ne t[’']est pas ouvert/.test(carteS) && !/Me servir/.test(carteS), carteS.slice(0,400));
  const refus=await S.ev(`window.__toasts=[]; boxView=null; stockageServir(); await new Promise(r=>setTimeout(r,300)); return {toast:window.__toasts.slice(-1)[0]||'', vue:current, boxView};`);
  vrai('⛔ « Me servir » appelé quand même : refus, rien ne s’ouvre', /ne t’est pas ouvert/.test(refus.toast) && refus.boxView!=='stockage', refus);
  const lien=await S.ev(`window.__toasts=[]; go('mouvements'); await new Promise(r=>setTimeout(r,500)); boxView=null; openBox('stockage'); await new Promise(r=>setTimeout(r,700));
    return {toast:window.__toasts.slice(-1)[0]||'', boxView, fiche:/Qui peut s|Il baisse quand/.test(document.getElementById('content').textContent)};`);
  vrai('⛔⛔ et par un LIEN (journal, notification, étiquette, adresse) : openBox("stockage") refuse — son identifiant est fixe (relecture v741)', /ne t’est pas ouvert/.test(lien.toast) && lien.boxView!=='stockage' && !lien.fiche, lien);
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
  vrai('la fiche du stockage dit ce qu’il est, et ne propose pas de « Relevé » de site', /🏬/.test(fiche) && /Stockage/.test(fiche) && /Il baisse quand quelqu[’']un s[’']y sert/.test(fiche) && !/Relevé/.test(fiche) && /Qui peut s[’']y servir/.test(fiche), fiche.slice(0,400));
  await cap('A6-fiche-stockage');
  const sup=await S.ev(`const corbeille=!!document.querySelector('#content button[title="Supprimer"]');
    const retour=(document.querySelector('#content .det-back')||{}).title||'';
    window.__toasts=[]; delItem('boxes','stockage'); await new Promise(r=>setTimeout(r,300));
    const s=db.boxes.find(b=>b.id==='stockage'); return {corbeille, retour, existe:!!s, a:s&&s.stock['p-stk-a']&&s.stock['p-stk-a'].u, toast:window.__toasts.slice(-1)[0]||''};`);
  v('⛔⛔ le stockage ne se supprime pas : pas de corbeille sur sa fiche, et « supprimer » appelé quand même refuse sans rien toucher (relecture v741)',
    [sup.corbeille, sup.existe, sup.a, /ne se supprime pas/.test(sup.toast) && /Stockage actif/.test(sup.toast)], [false, true, 9, true]);
  v('… le bouton retour dit où il ramène', sup.retour, 'Revenir aux boxes');
  await S.ev(`openBox('stockage'); await new Promise(r=>setTimeout(r,700)); formBox('stockage'); await new Promise(r=>setTimeout(r,500)); return 1;`);
  const fb=await S.ev(`const o=document.getElementById('overlay'); const t=o?o.textContent.replace(/\s+/g,' '):''; try{ closeModal(true); }catch(e){} return /Stockage actif/.test(t)&&!/Box active/.test(t);`);
  vrai('… on le DÉSACTIVE : son formulaire dit « Stockage actif »', fb);

  console.log('\n══ B.7 ⛔⛔ AVEC DES BOX : TROIS AUTRES PORTES DE CLÔTURE — NI LA BOX, NI LE STOCKAGE NE BOUGENT ══');
  const av7=await S.ev(`window.__toasts=[];
    db.boxes=db.boxes.filter(b=>b.id!=='bx-stk-nord'); db.boxes.push({id:'bx-stk-nord',nom:'Box Nord (sonde)',actif:true,techIds:['t-stk-k'],stock:{'p-stk-a':{u:5,ctn:0}}});
    const s=db.boxes.find(b=>b.id==='stockage'); s.stock['p-stk-a']={u:20,ctn:0};
    const I=(id,titre,tech,pid,q)=>({id,num:id.toUpperCase(),titre,clientId:'c-stk-1',date:todayISO(),heure:'14:00',duree:60,techIds:[tech],techId:tech,statut:'encours',debutReel:Date.now()-1800000,produitsUtilises:[{produitId:pid,qte:q,unite:'u'}]});
    db.interventions=db.interventions.filter(i=>!/^i-stk-[2-5]$/.test(i.id));
    db.interventions.push(I('i-stk-2','Réserve (sonde)','t-stk-k','p-stk-a',7), I('i-stk-3','Cave (sonde)','t-stk-k','p-stk-a',3),
      I('i-stk-4','Local poubelles (sonde)','t-stk-s','p-stk-c',4), I('i-stk-5','Office (sonde)','t-stk-s','p-stk-c',2));
    save(); return {mvts:(db.mouvements||[]).length, bons:(db.bonsRemise||[]).length, attente:(db.boxMvtAttente||[]).length, c:s.stock['p-stk-c'].u};`);
  const bouge7=()=>S.ev(`const s=db.boxes.find(b=>b.id==='stockage'); const n=db.boxes.find(b=>b.id==='bx-stk-nord');
    return {nord:n.stock['p-stk-a'].u, stockageA:s.stock['p-stk-a'].u, stockageC:s.stock['p-stk-c'].u, catalogue:db.produits.filter(p=>/^p-stk-/.test(p.id)).map(p=>p.qte||0),
      journal:(db.mouvements||[]).length-${av7.mvts}, bons:(db.bonsRemise||[]).length-${av7.bons}, dr:(db.boxMvtAttente||[]).length-${av7.attente},
      toasts:window.__toasts.filter(t=>/insuffisant|déduit|validation|DR/i.test(t))};`);
  const RIEN={nord:5,stockageA:20,stockageC:av7.c,catalogue:[0,0,0],journal:0,bons:0,dr:0,toasts:[]};
  const lignes=id=>S.ev(`const i=db.interventions.find(x=>x.id===${JSON.stringify(id)}); return [i.statut,(i.produitsUtilises||[]).map(l=>[l.produitId,l.qte])];`);

  /* a. L'assistant de clôture : on AJOUTE un produit et on en MONTE un autre, puis « ✓ Clôturer ». */
  await connecter('u-stk-k');
  await S.ev(`window.__toasts=[]; assistCloture('i-stk-2'); await new Promise(r=>setTimeout(r,500)); asGo(2); await new Promise(r=>setTimeout(r,400));
    const s=document.getElementById('as-prod'); if(s) s.value='p-stk-c'; return 1;`);
  vrai('assistant, étape « Produits » : RATICIDE ajouté par « ＋ »', await toucher(`#overlay button[onclick="asProdAdd('i-stk-2')"]`));
  vrai('… et ADVION monté de 7 à 8 par « ＋ »', await toucher(`#overlay button[onclick="asProdQte('i-stk-2',0,1)"]`));
  const t7=await S.ev(`return (document.getElementById('overlay')||{}).textContent.replace(/\\s+/g,' ');`);
  vrai('l’assistant le dit : « Produits utilisés (registre) » … « le stock ne bouge pas »', /Produits utilisés \(registre\)/.test(t7) && /le stock ne bouge pas/.test(t7) && !/sera déduit/.test(t7), t7.slice(0,300));
  await cap('B7-assistant-produits');
  await S.ev(`asGo(5); await new Promise(r=>setTimeout(r,400)); return 1;`);
  vrai('« ✓ Clôturer » est touché', await toucher(`#overlay .modal-head button[onclick="assistFinish('i-stk-2')"]`));
  await dormir(800);
  v('⛔⛔ (a) assistant : clôturée, et les lignes disent ADVION 8 · RATICIDE 1', await lignes('i-stk-2'), ['terminee',[['p-stk-a',8],['p-stk-c',1]]]);
  v('⛔⛔ … la box Nord garde ses 5, le stockage ses 20 et ses '+av7.c+', rien au journal, au bon ni au DR', await bouge7(), RIEN);

  /* b. La validation du DR allumée : avant la v741, la part prise en box partait au DR pour validation. */
  await S.ev(`try{ closeModal(true); }catch(e){} db.validDRTous=true; save(); window.__toasts=[]; formRapport('i-stk-3'); await new Promise(r=>setTimeout(r,700)); return 1;`);
  vrai('compte-rendu de la seconde intervention : « effectuée » touchée', await toucher('#rapform input[name="effectuee"]'));
  vrai('« 💾 » est touché', await toucher('#overlay .modal-head button[type="submit"]'));
  await dormir(800);
  v('⛔⛔ (b) validation du DR allumée : clôturée, ADVION 3 noté', await lignes('i-stk-3'), ['terminee',[['p-stk-a',3]]]);
  v('⛔⛔ … et RIEN n’est envoyé au DR : la box ne bouge pas, il n’y a rien à valider', await bouge7(), RIEN);
  await S.ev(`try{ closeModal(true); }catch(e){} db.validDRTous=false; save(); return 1;`);

  /* c. Sofia, sans accès au stockage ni box : le menu « Statut », puis la case « Effectué ? » de la fiche.
     Avant, sa clôture criait « Stock insuffisant » — elle n'a rien pris nulle part, et c'est juste. */
  await connecter('u-stk-s');
  await S.ev(`window.__toasts=[]; intStatutMenu('i-stk-4'); await new Promise(r=>setTimeout(r,500)); return 1;`);
  vrai('menu « Statut » : « Terminée » est touché', await toucher(`#overlay button[onclick="closeModal();intSetStatut('i-stk-4','terminee')"]`));
  await dormir(600);
  v('⛔⛔ (c) menu de statut : clôturée, RATICIDE 4 noté', await lignes('i-stk-4'), ['terminee',[['p-stk-c',4]]]);
  /* d. La case « Effectué ? » vit dans la fiche en mode ✎, qui est au bureau (modifier une intervention) :
     c'est l'administrateur qui marque faite l'intervention de Sofia. */
  await connecter('u-stk-a');
  await S.ev(`window.__toasts=[]; detailIntervention('i-stk-5'); await new Promise(r=>setTimeout(r,900)); return 1;`);
  vrai('fiche de Sofia, au bureau : « ✎ Modifier » est touché', await toucher(`#content button[title="Modifier"][onclick^="intEdit=true"]`));
  await dormir(500);
  vrai('… puis la case « Effectué ? »', await toucher(`#content input[onchange^="intEffToggle('i-stk-5'"]`));
  await dormir(600);
  v('⛔⛔ (d) case « Effectué ? » : clôturée, RATICIDE 2 noté', await lignes('i-stk-5'), ['terminee',[['p-stk-c',2]]]);
  v('⛔⛔ … et après ces deux clôtures, rien n’a bougé, et aucun faux « stock insuffisant »', await bouge7(), RIEN);
  const r7=await S.ev(`return registreBiocides('c-stk-1').filter(r=>/^i-stk-/.test(r.intId)).map(r=>r.intId+'|'+r.nom+'|'+r.qte).sort();`);
  v('⛔⛔ le registre biocide du client porte les CINQ passages, chacun avec ce qu’il a utilisé', r7,
    ['i-stk-1|ADVION GEL BLATTES 30G|2','i-stk-2|ADVION GEL BLATTES 30G|8','i-stk-2|RATICIDE GRAINS 30G|1','i-stk-3|ADVION GEL BLATTES 30G|3','i-stk-4|RATICIDE GRAINS 30G|4','i-stk-5|RATICIDE GRAINS 30G|2']);

  console.log('\n══ B.8 LA COMMANDE SUGGÉRÉE : LE PLUS GRAND DES DEUX BESOINS ══');
  const e8=await S.ev(`const s=db.boxes.find(b=>b.id==='stockage'); s.stock['p-stk-c']={u:1,ctn:0};
    db.boxes.find(b=>b.id==='bx-stk-nord').stock['p-stk-a']={u:0,ctn:0}; save();   /* la box Nord vidée par des SORTIES, plus par une clôture */
    bonSuggere(); await new Promise(r=>setTimeout(r,400)); const L=(typeof bonLignes!=='undefined'?bonLignes:[]).map(l=>[l.produitId,l.quantite]).filter(x=>/^p-stk-/.test(x[0])); try{ closeModal(true); }catch(e){} return L.sort();`);
  /* ADVION : Nord à 0 → besoin de box 3 ; total 20 > seuil 5 → pas de besoin de seuil → 3.
     RATICIDE : stockage à 1 → besoin de box 2 ; total 1 ≤ seuil 10 → 2×10−1 = 19 → le plus grand, 19 (pas 21). */
  v('⛔⛔ ADVION 3 (la box), RATICIDE 19 (le seuil) — pas 21', e8, [['p-stk-a',3],['p-stk-c',19]]);

  console.log('\n══ PAGE ══');
  v('aucune exception JavaScript', S.exceptions, []);
  console.log(`\n════ sonde-stockage : ${ok} ✓ ${ko} ✗ ════`);
  S.fermer(); process.exit(ko?1:0);
/* Une sonde qui meurt ferme son navigateur : sinon il tourne des heures à 90 % d'un processeur et fait
   tomber les bancs de temps (CLAUDE.md, « ces fantômes font tomber les bancs de temps »). */
})().catch(e=>{ console.error(e); console.log(`\n════ sonde-stockage : ${ok} ✓ ${ko+1} ✗ ════`); try{ navigateur&&navigateur.fermer(); }catch(_){} process.exit(1); });

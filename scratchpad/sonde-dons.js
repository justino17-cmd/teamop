/* ══ SONDE — PRODUITS DONNÉS, UNE SOUS-CATÉGORIE DES BOX ═══════════════════════════════════
   Justin, 23 septembre 2026 : « Produit donné, c'est quand des personnes donnent des produits à
   quelqu'un ; il faudrait le mettre en sous-catégorie dans Box. Quand un technicien retire des
   produits de sa box, il choisit si c'est pour lui ou pour une autre personne. »

   On joue ici de VRAIES sorties de box, par les deux chemins, et on regarde où elles arrivent :
     A. sortie directe (administrateur), « Pour une autre personne »   → listée, avec le nom
     B. sortie directe, « Pour moi »                                    → PAS listée (pas un don)
     C. technicien soumis au DR, « Pour une autre personne », validé    → listée, « ✔ validé par »
     D. l'écran : la rangée Liste · Carte · Produits donnés, le menu et la bulle sur Boxes, le
        détail d'un don, la recherche, l'aller-retour par la rangée
     E. les droits : un commercial n'y entre pas ; un technicien à qui on l'a retiré ne voit pas
        l'onglet ; la grille des droits le montre, et le cocher l'ouvre
     F. bons de remise coupés : l'écran vide le dit, et « Réactiver » rétablit
     G. au téléphone, avec des noms longs : rien ne déborde, rien n'est écrasé
   ⛔ Chaque cas prouve d'abord que le geste a EU LIEU (un bon de plus, un stock qui baisse) :
   « pas listé » sur une sortie qui n'a pas eu lieu ne prouverait rien.
   ⛔ Bêta uniquement, copie locale servie en 127.0.0.1.                                     */
const path=require('path');
const {ouvrir,dormir}=require(path.join(__dirname,'pilote.js'));

let ok=0,ko=0; const L=[];
const v=(t,a,b)=>{const bon=JSON.stringify(a)===JSON.stringify(b); bon?ok++:ko++;
  L.push((bon?'  ✓ ':'  ✗ ')+t+(bon?'':`\n      attendu : ${JSON.stringify(b)}\n      obtenu  : ${JSON.stringify(a)}`));};
const vrai=(t,c)=>v(t,!!c,true);
const titre=t=>L.push('\n══ '+t+' ══\n');

(async()=>{
  /* SOURCE=<une bêta d'avant> pour la contre-épreuve : les dons n'y arrivent pas. */
  const S=await ouvrir(process.env.SOURCE?{source:process.env.SOURCE}:{});
  L.push('      page mesurée : '+S.version);
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1200); await S.ev(`try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(2500);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true});
  await S.c.envoyer('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  try{ await S.c.envoyer('Emulation.setSafeAreaInsetsOverride',{insets:{top:47,bottom:34,left:0,right:0,topMax:47,bottomMax:34,leftMax:0,rightMax:0}}); }catch(e){}
  await S.ev(`setPlatForce('iosweb'); setThemePref('light'); return 1;`); await dormir(500);

  const ranger=()=>S.ev(`try{ asstOpen=false; renderAsst(); }catch(e){} try{ closeModal(); }catch(e){}
    try{ document.getElementById('sidebar').classList.remove('open'); }catch(e){} const b=document.getElementById('fdr-banner'); if(b) b.remove(); return 1;`);
  const deuxImages=()=>S.ev(`return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>{ void document.body.offsetWidth; r(1); })));`);
  const fenetre=()=>S.ev(`const o=document.getElementById('overlay'), m=document.getElementById('modal');
    return (o&&o.classList.contains('open')&&m) ? m.textContent.replace(/\\s+/g,' ').trim() : '';`);
  const admin=`db.users.find(u=>u.role==='admin')`;

  /* ── 0. LA POPULATION ── une box avec trois produits en stock, un technicien soumis au DR, un
     commercial. */
  /* La démonstration de la bêta ne pose pas de box : on en pose une, et la simulation des
     mouvements (`mvtDemoPoser`) apporte ses bons de remise — dont deux « pour moi ». */
  await S.ev(`try{ mvtDemoPoser(); }catch(e){} return 1;`); await dormir(400);
  const pop=await S.ev(`const adm=${admin}; currentUser=adm;
    const pr=(db.produits||[]).filter(x=>x&&x.id&&x.nom).slice(0,3); if(pr.length<3) return null;
    let b=db.boxes.find(x=>x.id==='bx-dons');
    if(!b){ b={id:'bx-dons',numero:'E-1',nom:'Box Essai Dons',actif:true,visibleTous:true,stock:{}}; db.boxes.push(b); }
    pr.forEach(x=>{ b.stock[x.id]={ctn:0,u:10}; });
    if(!db.boxes.find(x=>x.id==='bx-vide')) db.boxes.push({id:'bx-vide',numero:'E-2',nom:'Box Essai Vide',actif:true,visibleTous:true,stock:{}});
    const pids=bx=>Object.keys(bx.stock||{}).filter(pid=>((bx.stock[pid]||{}).u||0)>=4 && produit(pid).id);
    db.bonsRemiseOff=false; db.validDRTous=false;
    let t=db.users.find(u=>u.id==='u-tech-dons');
    if(!t){ t={id:'u-tech-dons',prenom:'Jean',nom:'Terrain',role:'technicien',login:'jtd',username:'jtd',pass:'x',actif:true,pref:{},boxValidDR:true}; db.users.push(t); }
    let c=db.users.find(u=>u.id==='u-com-dons');
    if(!c){ c={id:'u-com-dons',prenom:'Chloé',nom:'Vente',role:'commercial',login:'cvd',username:'cvd',pass:'x',actif:true,pref:{}}; db.users.push(c); }
    save();
    const cu=currentUser; currentUser=t; const soumis=boxValidRequis(), voitBox=visibleBoxes(db.boxes).some(x=>x.id===b.id); currentUser=cu;
    return {box:b.id, pids:pids(b).slice(0,3), admin:fullName(adm), validAdm:!!can('validerDR'), soumis, voitBox,
            bons:(db.bonsRemise||[]).length, pourMoiDemo:(db.bonsRemise||[]).filter(r=>r&&r.pourQui&&r.pourQui===r.par).length};`);
  titre('0. LA POPULATION EXISTE');
  vrai('une box avec trois produits en stock (≥ 4 u chacun)', pop && pop.pids.length===3);
  vrai('l’administrateur sort en direct (il valide lui-même)', pop && pop.validAdm);
  vrai('le technicien d’essai est soumis au DR et voit la box', pop && pop.soumis && pop.voitBox);
  vrai('la simulation apporte des bons « pour moi » (ceux qui ne doivent PAS paraître)', pop && pop.pourMoiDemo>=2);
  if(!pop){ console.log(L.join('\n')); S.fermer(); process.exit(1); }
  const etat=()=>S.ev(`const b=db.boxes.find(x=>x.id==='${pop.box}');
    return {bons:(db.bonsRemise||[]).map(r=>({id:r.id,par:r.par,pourQui:r.pourQui,valideDr:r.valideDr,n:(r.lignes||[]).length})),
            u:${JSON.stringify(pop.pids)}.map(p=>(b.stock[p]||{}).u||0)};`);
  const e0=await etat();
  const liste=()=>S.ev(`try{ return donsListe().map(r=>({par:r.par,pourQui:r.pourQui,valideDr:r.valideDr,type:r.type})); }catch(e){ return 'ABSENTE : '+e.message; }`);

  /* ── A. SORTIE DIRECTE, « POUR UNE AUTRE PERSONNE » ── */
  titre('A. SORTIE DIRECTE — « POUR UNE AUTRE PERSONNE »');
  await ranger();
  await S.ev(`currentUser=${admin}; boxDonneOublier(); openBox('${pop.box}'); return 1;`); await dormir(700);
  await S.ev(`boxSaisir('${pop.pids[0]}',-2); return 1;`); await dormir(450);
  const fA=await fenetre();
  vrai('la sortie DEMANDE « pour qui ? »', /Ces produits sont pour qui/.test(fA));
  vrai('⛔ … « Pour moi » ou « Pour une autre personne » (les mots de Justin)', /Pour moi/.test(fA) && /Pour une autre personne/.test(fA));
  const nGens=await S.ev(`return document.querySelectorAll('#bd-gens option').length;`);
  vrai('… et elle propose les personnes de l’entreprise', nGens>=2);
  await S.ev(`document.querySelector('#modal input[name=bd-qui][value=autre]')?.click(); return 1;`); await dormir(200);
  await S.ev(`const i=document.getElementById('bd-nom'); i.value='Nadia Lopez (essai)'; i.dispatchEvent(new Event('input',{bubbles:true}));
    document.querySelector('#modal button[onclick="boxDonneSave()"]').click(); return 1;`); await dormir(600);
  const eA=await etat();
  const bonA=eA.bons.find(r=>r.pourQui==='Nadia Lopez (essai)');
  v('⛔ le geste a EU LIEU : le stock a baissé de 2', e0.u[0]-eA.u[0], 2);
  vrai('⛔ … et un bon de remise est né, de l’administrateur à Nadia', bonA && bonA.par===pop.admin);

  /* ── B. SORTIE DIRECTE, « POUR MOI » ── */
  titre('B. SORTIE DIRECTE — « POUR MOI »');
  await S.ev(`boxDonneOublier(); boxSaisir('${pop.pids[1]}',-1); return 1;`); await dormir(450);
  const fB=await fenetre();
  vrai('la question se repose (on a oublié le destinataire)', /Ces produits sont pour qui/.test(fB));
  await S.ev(`document.querySelector('#modal button[onclick="boxDonneSave()"]').click(); return 1;`); await dormir(600);
  const eB=await etat();
  const bonB=eB.bons.find(r=>r.par===pop.admin && r.pourQui===pop.admin);
  v('⛔ le geste a EU LIEU : le stock a baissé de 1', eA.u[1]-eB.u[1], 1);
  vrai('⛔ … et un bon « pour moi » est né (par = pour qui)', !!bonB);

  /* ── C. TECHNICIEN SOUMIS AU DR ── */
  titre('C. TECHNICIEN SOUMIS AU DR — « POUR UNE AUTRE PERSONNE », PUIS VALIDÉ');
  await ranger();
  await S.ev(`currentUser=db.users.find(u=>u.id==='u-tech-dons'); boxDonneOublier(); openBox('${pop.box}'); return 1;`); await dormir(700);
  await S.ev(`boxSaisir('${pop.pids[2]}',-1); return 1;`); await dormir(300);
  const lot=await S.ev(`const l=(db.boxMvtAttente||[]).find(x=>x.boxId==='${pop.box}'&&x.parId==='u-tech-dons'&&x.statut==='brouillon'); return l?{id:l.id,par:l.par}:null;`);
  vrai('la sortie du technicien naît en brouillon (elle attend sa relecture)', lot && lot.par==='Jean Terrain');
  if(lot){
    await S.ev(`boxBrouillonValider('${pop.box}'); return 1;`); await dormir(700);
    const fC=await fenetre();
    vrai('⛔ à l’envoi au DR, la question « pour qui ? » se pose', /Ces produits sont pour qui/.test(fC) && /Pour une autre personne/.test(fC));
    vrai('… avec les personnes de l’entreprise proposées', await S.ev(`return document.querySelectorAll('#rd-gens option').length>=2;`));
    await S.ev(`document.querySelector('#modal input[name=rd-qui][value=autre]')?.click(); return 1;`); await dormir(200);
    await S.ev(`const i=document.getElementById('rd-nom'); i.value='Karim Benali (essai)'; i.dispatchEvent(new Event('input',{bubbles:true}));
      document.querySelector('#modal button[onclick^="remiseDestSave"]').click(); return 1;`); await dormir(500);
    const m=await S.ev(`const x=(db.boxMvtAttente||[]).find(y=>y.id==='${lot.id}'); return x?{pourQui:x.pourQui,statut:x.statut}:null;`);
    v('le lot part au DR avec son destinataire', m, {pourQui:'Karim Benali (essai)',statut:'enAttente'});
    const avant=await liste();
    vrai('⛔ tant que le DR n’a pas validé, rien n’est sorti : pas encore de don', Array.isArray(avant) && !avant.some(r=>r.pourQui==='Karim Benali (essai)'));
    await S.ev(`currentUser=${admin}; boxMvtValider('${lot.id}','valide'); return 1;`); await dormir(600);
    const eC=await etat();
    const bonC=eC.bons.find(r=>r.pourQui==='Karim Benali (essai)');
    v('⛔ le geste a EU LIEU : le stock a baissé de 1 à la validation', eB.u[2]-eC.u[2], 1);
    vrai('⛔ … et le bon dit : Jean Terrain → Karim, validé par l’administrateur', bonC && bonC.par==='Jean Terrain' && bonC.valideDr===pop.admin);
  }

  /* ── D. L'ÉCRAN ── */
  titre('D. BOXES › PRODUITS DONNÉS');
  await ranger(); await S.ev(`currentUser=${admin}; go('produitsDonnes'); return 1;`); await dormir(1000); await ranger(); await deuxImages(); await dormir(400);
  /* ⛔ ON LIT LA STRUCTURE, PAS LES GLYPHES : « → » et « ✔ » deviennent des icônes dessinées
     (`icones()`), donc absents du texte. La première version cherchait « X → Y » : son contrôle
     « aucun Pour moi » passait sur ZÉRO ligne reconnue — un vert creux. */
  const lignes=`[...document.querySelectorAll('#dons-list .pl-row')].map(x=>{ const m=x.querySelector('.pl-meta'), b=m&&m.querySelector('b');
      let par=''; if(m){ for(const n of m.childNodes){ if(n.nodeType===3&&n.nodeValue.trim()){ par=n.nodeValue.trim(); break; } if(n.nodeType===1) break; } }
      return {par, pour:b?b.textContent.trim():'', meta:m?m.textContent.replace(/\\s+/g,' ').trim():'', dit:x.getAttribute('aria-label')||'',
              txt:x.textContent.replace(/\\s+/g,' ').trim()}; })`;
  const D=await S.ev(`const c=document.getElementById('content');
    const rows=${lignes};
    const f=c.querySelector('.filters'), fr=f&&f.getBoundingClientRect();
    const chips=f?[...f.querySelectorAll('.chip')].map(x=>({t:x.textContent.replace(/\\s+/g,' ').trim(),on:x.classList.contains('active'),cur:x.getAttribute('aria-current')||''})):[];
    const sc=f&&f.querySelector('.seg-cur'), act=f&&f.querySelector('.chip.active');
    let curEcart=null; if(sc&&act){ const a=sc.getBoundingClientRect(), q=act.getBoundingClientRect(); curEcart=Math.abs(a.left-q.left)+Math.abs(a.width-q.width); }
    const bar=document.getElementById('tabbar'), cur=document.getElementById('tab-cur'), on=bar&&bar.querySelector('.tab.on');
    let bulle=null; if(cur&&on){ const a=cur.getBoundingClientRect(), b=on.getBoundingClientRect(); bulle=Math.abs((a.left+a.width/2)-(b.left+b.width/2)); }
    let n=-1; try{ n=donsListe().length; }catch(e){}
    return {current, h1:((document.querySelector('.topbar h1')||{}).textContent||'').trim(), rows, chips,
            nav0:f?f.tagName:'', seg:!!f&&f.classList.contains('seg-on'), curEcart, tient:!!f&&f.scrollWidth<=f.clientWidth+1,
            nav:[...document.querySelectorAll('.nav-item.active')].map(x=>x.dataset.view),
            tabs:bar?[...bar.querySelectorAll('.tab.on')].map(x=>x.dataset.tab):null, bulle, n};`);
  L.push('      lignes : '+D.rows.length+' · '+D.rows.map(r=>r.par+' ▸ '+r.pour).join(' | '));
  v('on est sur la vue Produits donnés', [D.current, /Produits donnés/.test(D.h1)], ['produitsDonnes', true]);
  v('⛔ la rangée des box : Liste · Carte · Produits donnés', D.chips.map(x=>x.t), ['Liste','Carte','Produits donnés']);
  vrai('… et c’est Produits donnés qui est marqué', D.chips[2] && D.chips[2].on && D.chips[2].cur==='page' && !D.chips[0].on);
  vrai('⛔ elle TIENT dans l’écran (rien ne défile, rien n’est coupé)', D.tient);
  vrai('… et c’est le segmenté de l’application, curseur posé sous l’écran ouvert', D.seg && D.curEcart!==null && D.curEcart<3);
  v('c’est une navigation (landmark), pas un filtre', D.nav0, 'NAV');
  v('⛔⛔ au menu, c’est Boxes qui est allumé', D.nav, ['boxes']);
  v('⛔⛔ dans la barre du bas, c’est l’onglet Boxes', D.tabs, ['boxes']);
  vrai('⛔ … et la bulle est posée dessous (à moins de 3 px)', D.bulle!==null && D.bulle<3);
  const rA=D.rows.find(r=>r.pour==='Nadia Lopez (essai)'), rC=D.rows.find(r=>r.pour==='Karim Benali (essai)');
  vrai('⛔⛔ la sortie A est là : l’administrateur → Nadia', rA && rA.par===pop.admin);
  vrai('⛔ … sans « validé par » (il a sorti lui-même : son nom n’y est qu’une fois)', rA && rA.meta.split(pop.admin).length-1===1);
  vrai('⛔⛔ la sortie C est là : Jean Terrain → Karim, validée par l’administrateur', rC && rC.par==='Jean Terrain' && rC.meta.includes(pop.admin));
  vrai('⛔ la ligne DIT qui donne à qui (les flèches sont muettes pour un lecteur d’écran)',
    rC && /^Jean Terrain a remis à Karim Benali \(essai\) : /.test(rC.dit) && rC.dit.includes('validé par '+pop.admin));
  const nBons=D.rows.filter(r=>r.par&&r.pour).length;
  vrai('population : au moins cinq dons lus avec leur donneur ET leur destinataire (A, C, trois de la démo)', nBons>=5);
  v('⛔⛔ aucun « Pour moi » dans la liste (B, et ceux de la démonstration)', D.rows.filter(r=>r.par&&r.par===r.pour).map(r=>r.par), []);
  v('autant de lignes que de dons', D.rows.length, D.n);

  /* Le détail, au doigt */
  await S.ev(`[...document.querySelectorAll('#dons-list .pl-row')].find(x=>(x.getAttribute('aria-label')||'').includes('à Karim Benali (essai)'))?.click(); return 1;`); await dormir(500);
  const fD=await fenetre();
  vrai('toucher une ligne ouvre le don : remis par, remis à, box, validé par', /Remis par\s*Jean Terrain/.test(fD) && /Remis à\s*Karim Benali \(essai\)/.test(fD) && /Validé par/.test(fD));
  vrai('… avec le bon de remise en PDF', await S.ev(`return !!document.querySelector('#modal button[onclick^="remisePdf("]');`));
  await ranger();

  /* La recherche */
  await S.ev(`const i=document.getElementById('don-search'); if(i){ i.value='Karim Benali (ess'; i.dispatchEvent(new Event('input',{bubbles:true})); } return 1;`); await dormir(250);
  const nR=await S.ev(`return [...document.querySelectorAll('#dons-list .pl-row')].map(x=>(x.getAttribute('aria-label')||'').includes('Karim Benali (essai)'));`);
  v('la recherche réduit la liste au don cherché', nR, [true]);
  await S.ev(`const i=document.getElementById('don-search'); if(i){ i.value=''; i.dispatchEvent(new Event('input',{bubbles:true})); } return 1;`); await dormir(200);

  /* L'aller-retour par la rangée — on compte les frappes qui ont PORTÉ */
  await S.ev(`[...document.querySelectorAll('#content nav.filters .chip')].find(x=>x.textContent.trim()==='Liste')?.click(); return 1;`); await dormir(900); await ranger();
  const R1=await S.ev(`const rangs=[...document.querySelectorAll('#content .filters')];
    return {current, rangs:rangs.map(f=>({nav:f.tagName==='NAV', seg:f.classList.contains('seg-on'), chips:[...f.querySelectorAll('.chip')].map(x=>x.textContent.replace(/\\s+/g,' ').trim())}))};`);
  v('« Liste » ramène à la liste des box', R1.current, 'boxes');
  v('⛔ … où la rangée attend, identique', R1.rangs[0] && R1.rangs[0].chips, ['Liste','Carte','Produits donnés']);
  vrai('⛔ le filtre « Avec du stock » est sur SA ligne, pas dans la navigation', R1.rangs.length===2 && !R1.rangs[1].nav && /Avec du stock/.test((R1.rangs[1].chips||[]).join(' ')) && R1.rangs[0].seg);
  await S.ev(`[...document.querySelectorAll('#content nav.filters .chip')].find(x=>x.textContent.trim()==='Produits donnés')?.click(); return 1;`); await dormir(900); await ranger();
  v('… et toucher « Produits donnés » y revient', await S.ev(`return current;`), 'produitsDonnes');
  await S.ev(`go('carteBox'); return 1;`); await dormir(900); await ranger();
  v('la carte des box porte la même rangée, « Carte » marqué', await S.ev(`const f=document.querySelector('#content nav.filters'); return f?[...f.querySelectorAll('.chip')].map(x=>(x.classList.contains('active')?'*':'')+x.textContent.trim()):null;`), ['Liste','*Carte','Produits donnés']);

  /* ── E. LES DROITS ── */
  titre('E. LES DROITS');
  await S.ev(`currentUser=db.users.find(u=>u.id==='u-com-dons'); go('produitsDonnes'); return 1;`); await dormir(700); await ranger();
  v('⛔⛔ un commercial (fermé par défaut) n’y entre pas, même par l’adresse', await S.ev(`return current;`), 'dashboard');
  await S.ev(`const t=db.users.find(u=>u.id==='u-tech-dons'); t.acces={caps:{},modules:{produitsDonnes:false}}; save(); currentUser=t; go('boxes'); return 1;`); await dormir(800); await ranger();
  const E1=await S.ev(`return {current, chips:[...document.querySelectorAll('#content nav.filters .chip')].map(x=>x.textContent.trim())};`);
  vrai('un technicien à qui on l’a retiré voit les box…', E1.current==='boxes');
  vrai('⛔ … mais pas l’onglet Produits donnés', !E1.chips.some(x=>/Produits donnés/.test(x)) && E1.chips.some(x=>/Liste/.test(x)));
  await S.ev(`go('produitsDonnes'); return 1;`); await dormir(700); await ranger();
  v('⛔ … et l’adresse ne l’y mène pas non plus', await S.ev(`return current;`), 'dashboard');
  /* La grille des droits, telle que l'administrateur la voit : le cocher doit l'ouvrir. */
  await S.ev(`currentUser=${admin}; usrOuvert=''; go('utilisateurs'); return 1;`); await dormir(800); await ranger();
  await S.ev(`usrDeplier('u-tech-dons'); return 1;`); await dormir(500);
  const G=await S.ev(`const z=document.getElementById('usr-d-u-tech-dons'); if(!z) return null;
    const sw=z.querySelector('[data-d="mod_produitsDonnes"]'), bx=z.querySelector('[data-d="mod_boxes"]');
    const row=sw&&sw.closest('.perm-row');
    let apresBoxes=false; if(sw&&bx){ const tous=[...z.querySelectorAll('[data-d^="mod_"]')]; apresBoxes=tous.indexOf(sw)===tous.indexOf(bx)+1; }
    return {sw:!!sw, coche:sw?sw.checked:null, apresBoxes, lib:row?row.textContent.replace(/\\s+/g,' ').trim():''};`);
  vrai('⛔⛔ la grille des droits montre Produits donnés', G && G.sw);
  vrai('… juste sous Boxes, dit comme une sous-catégorie', G && G.apresBoxes && /↳/.test(G.lib) && /dans Boxes/.test(G.lib));
  v('… décoché pour ce technicien (on le lui a retiré)', G && G.coche, false);
  await S.ev(`const z=document.getElementById('usr-d-u-tech-dons'), sw=z&&z.querySelector('[data-d="mod_produitsDonnes"]'); if(sw) sw.checked=true; usrDroitsValider('u-tech-dons'); return 1;`); await dormir(600);
  v('⛔ cocher puis enregistrer écrit le droit', await S.ev(`return (db.users.find(u=>u.id==='u-tech-dons').acces||{}).modules.produitsDonnes;`), true);
  await ranger(); await S.ev(`currentUser=db.users.find(u=>u.id==='u-tech-dons'); go('produitsDonnes'); return 1;`); await dormir(800); await ranger();
  const E2=await S.ev(`return {current, rows:${lignes}};`);
  v('⛔ … et le technicien y entre', E2.current, 'produitsDonnes');
  vrai('… où il retrouve le don qu’il a fait (Jean Terrain → Karim)', E2.rows.some(r=>r.par==='Jean Terrain'&&r.pour==='Karim Benali (essai)'));

  /* ── F. BONS DE REMISE COUPÉS ── */
  titre('F. BONS DE REMISE COUPÉS — L’ÉCRAN VIDE LE DIT');
  await S.ev(`currentUser=${admin}; window.__sauve={b:db.bonsRemise, p:db.produitsDonnes}; db.bonsRemise=[]; db.produitsDonnes=[]; db.bonsRemiseOff=true; go('produitsDonnes'); return 1;`);
  await dormir(800); await ranger();
  const F1=await S.ev(`return {txt:(document.getElementById('dons-list')||{textContent:''}).textContent.replace(/\\s+/g,' ').trim(), btn:[...document.querySelectorAll('#dons-list button')].map(b=>b.textContent.trim())};`);
  vrai('⛔ vide et coupé : il dit que la question « pour qui ? » est coupée dans Paramètres', /coupée/.test(F1.txt) && /Paramètres/.test(F1.txt));
  vrai('… et l’administrateur peut réactiver d’ici', F1.btn.some(b=>/Réactiver/.test(b)));
  await S.ev(`[...document.querySelectorAll('#dons-list button')].find(b=>/Réactiver/.test(b.textContent))?.click(); return 1;`); await dormir(600);
  const F2=await S.ev(`return {off:!!db.bonsRemiseOff, txt:(document.getElementById('dons-list')||{textContent:''}).textContent.replace(/\\s+/g,' ').trim()};`);
  vrai('⛔ « Réactiver » rétablit les bons, et l’écran explique d’où viennent les dons', !F2.off && /Pour une autre personne/.test(F2.txt));
  await S.ev(`db.bonsRemise=window.__sauve.b; db.produitsDonnes=window.__sauve.p; save(); return 1;`);

  /* ── G. AU TÉLÉPHONE, NOMS LONGS ── */
  titre('G. AU TÉLÉPHONE (390 px), AVEC DES NOMS LONGS');
  await S.ev(`const adm=${admin}; const b=db.boxes.find(x=>x.id==='${pop.box}');
    db.bonsRemise.push({id:'br-long',num:'BR-2026-9999',date:todayISO(),ts:Date.now()+5000,boxId:b.id,boxNomTxt:'',par:'Marie-Christine Delacroix-Beaumont',parRole:'Technicienne',
      pourQui:'Jean-Baptiste Montgolfier de la Rochefoucauld',valideDr:fullName(adm),lignes:${JSON.stringify(pop.pids)}.map((p,i)=>({produitId:p,qte:12345+i,unite:i?'cart.':'u'}))});
    b.nom='Établissement Hospitalier Universitaire — Bâtiment des Consultations Externes'; save(); go('produitsDonnes'); return 1;`);
  await dormir(900); await ranger(); await deuxImages(); await dormir(700);
  const G1=await S.ev(`return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const row=[...document.querySelectorAll('#dons-list .pl-row')].find(x=>(x.getAttribute('aria-label')||'').includes('Montgolfier'));
    const f=document.querySelector('#content nav.filters');
    const t=row&&row.querySelector('.pl-title'), m=row&&row.querySelector('.pl-meta'), a=row&&row.querySelector('.lga-a');
    const rr=row&&row.getBoundingClientRect(), ra=a&&a.getBoundingClientRect();
    window.scrollTo(9999,window.scrollY); const sx=window.scrollX; window.scrollTo(0,window.scrollY);
    r({existe:!!row, larg:document.documentElement.clientWidth, sw:document.documentElement.scrollWidth, sx,
       titre:t?Math.round(t.getBoundingClientRect().width):0, meta:m?Math.round(m.getBoundingClientRect().width):0,
       montant:a?a.textContent.trim():'', dedans: rr&&ra ? (ra.right<=rr.right+0.5 && ra.left>=rr.left-0.5) : false,
       chips:f?[...f.querySelectorAll('.chip')].map(x=>{ const q=x.getBoundingClientRect(); return Math.round(q.right); }):[], tient:f?f.scrollWidth<=f.clientWidth+1:false});
  })));`);
  L.push('      ligne longue : titre '+G1.titre+' px · méta '+G1.meta+' px · montant « '+G1.montant+' » · page '+G1.sw+'/'+G1.larg);
  vrai('population : la ligne aux noms longs est là', G1.existe);
  v('⛔ la page ne glisse pas de côté (pousser à droite rend 0 px)', G1.sx, 0);
  vrai('⛔ le texte n’est pas écrasé : titre et détails gardent au moins 150 px', G1.titre>=150 && G1.meta>=150);
  vrai('le montant reste DANS la ligne', G1.dedans);
  vrai('les trois onglets tiennent dans l’écran, sans défiler', G1.chips.length===3 && Math.max(...G1.chips)<=390 && G1.tient);

  titre('H. AUCUNE ERREUR JAVASCRIPT');
  v('exceptions', S.exceptions, []);
  v('erreurs console', S.consoleErr.filter(x=>!/net::|Failed to load|favicon/i.test(x)), []);

  console.log(L.join('\n'));
  console.log(`\n════ sonde-dons : ${ok} ✓ ${ko} ✗ ════\n`);
  S.fermer(); process.exit(ko?1:0);
})().catch(e=>{console.error('SONDE MORTE :',e&&e.stack||e);process.exit(2);});

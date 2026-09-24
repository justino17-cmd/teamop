/* ══ SONDE v742 — DEUX RÈGLES DE JUSTIN, AU DOIGT, DANS LA VRAIE PAGE ═══════════════════════════════
   Justin, 24 septembre 2026 :
     « si deux comptes ont le même nom, l'obligation est d'avoir le prénom et le nom de famille pour
       différencier les deux personnes »  ;  « l'accès au stockage est une permission ».
   Joué sur un iPhone de 402 px (encoches posées), par de vrais touchers et de vraies frappes, sur la bêta
   servie en 127.0.0.1 :
     A. LES NOMS
        1. Utilisateurs → ＋ Utilisateur → « Karim Benali » (qui existe) : refusé, le message dit comment
           distinguer, aucun compte créé ; « Karim A. Benali » : créé ;
        2. deux « Jean Dupont » d'AVANT la règle : la liste les signale tous les deux.
     B. LE STOCKAGE, UNE PERMISSION
        3. la ligne de Karim (Utilisateurs) : la case « Se servir dans le stockage » est dans le Stock,
           décochée ; le stockage n'est plus dans sa liste de box ; on la coche, « Valider » → écrite ;
        4. Karim voit la carte et « Me servir » ; Sofia, sans la case, lit « ne t'est pas ouvert » ;
        5. « Qui peut s'y servir » (administrateur) : décocher Karim → sa case écrite NON → il ne le voit
           plus ; un chef qui gère les box ne voit pas la ligne, et la fenêtre le refuse ;
        6. le bureau (« tout voir », sans équipe, rien de réglé) y a accès par défaut ;
        7. le ✎ du stockage dit « c'est une permission » ; la création d'un compte propose la case, et
           cochée, elle est écrite.
   ⛔ On compte la population avant de croire un zéro. ⛔ Bêta uniquement, 127.0.0.1. SOURCE=<une bêta
   d'avant> pour la contre-épreuve (la sonde compte ses échecs au lieu de mourir).                    */
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
  /* Le bocal n'a pas de réseau : l'écran « Connexion requise » et la vérification de l'identifiant AU
     SERVEUR sont neutralisés (ce n'est pas ce qu'on mesure — la règle des noms, elle, est locale). */
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    window.loginExisteAilleurs=async function(){ return false; }; window.userIdentifiantsModal=function(){};
    window.__toasts=[]; const t0=window.toast; window.toast=function(m){ window.__toasts.push(String(m)); return t0.apply(this,arguments); }; return 1;`);
  const cap=async n=>{ if(!CAP) return; await dormir(450); fs.mkdirSync(CAP,{recursive:true});
    const s=await S.c.envoyer('Page.captureScreenshot',{format:'png'}); fs.writeFileSync(path.join(CAP,n+'.png'),Buffer.from(s.data,'base64')); };
  const toucher=async sel=>{
    const r=await S.ev(`const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; e.scrollIntoView({block:'center'});
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); const q=e.getBoundingClientRect();
      if(q.width<1||q.height<1) return {cache:true};
      const x=Math.round(q.left+q.width/2), y=Math.round(q.top+q.height/2), h=document.elementFromPoint(x,y);
      /* une frappe compte si le doigt tombe sur l'élément (ou dans le libellé qui le porte) — sinon elle
         a touché un voisin, et la sonde le DIT au lieu de compter un geste qui n'a pas eu lieu */
      const touche=!!h&&(h===e||e.contains(h)||(!!h.closest('label')&&h.closest('label').contains(e)));
      return touche?{x,y}:{couvert:(h&&(h.id||h.className||h.tagName))+''};`);
    if(!r||r.cache||r.couvert){ if(r) console.log('    (frappe perdue sur '+sel+' : '+JSON.stringify(r)+')'); return false; }
    await S.c.envoyer('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x,y:r.y}]}); await dormir(60);
    await S.c.envoyer('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await dormir(500);
    return true; };
  const toucherTexte=async(zone,texte)=>{ const id=await S.ev(`const z=document.querySelector(${JSON.stringify(zone)}); if(!z) return null;
      const b=[...z.querySelectorAll('button,[role=button],summary,.stk-l')].find(x=>x.textContent.replace(/\\s+/g,' ').trim().startsWith(${JSON.stringify(texte)})); if(!b) return null;
      b.setAttribute('data-sonde','1'); return 1;`);
    if(!id) return false; const r=await toucher('[data-sonde="1"]'); await S.ev(`const b=document.querySelector('[data-sonde="1"]'); if(b) b.removeAttribute('data-sonde'); return 1;`); return r; };
  const taper=async(sel,texte)=>{ await S.ev(`const e=document.querySelector(${JSON.stringify(sel)}); if(e){ e.focus(); e.value=''; } return 1;`);
    await S.c.envoyer('Input.insertText',{text:texte}); await dormir(250); };
  const contenu=()=>S.ev(`return document.getElementById('content').textContent.replace(/\\s+/g,' ');`);
  const connecter=async id=>{ await S.ev(`try{ closeModal(true); }catch(e){} const u=db.users.find(x=>x.id===${JSON.stringify(id)}); currentUser=u; enterApp(u); try{ setPlatForce('iosweb'); }catch(e){}
      await new Promise(r=>setTimeout(r,1400)); try{ closeModal(true); }catch(e){} const f=document.getElementById('fdr-banner'); if(f) f.remove(); return 1;`); };
  const cle=id=>S.ev(`const u=db.users.find(x=>x.id===${JSON.stringify(id)}); return u&&u.acces&&u.acces.caps&&Object.prototype.hasOwnProperty.call(u.acces.caps,'stockage')?u.acces.caps.stockage:'non réglée';`);

  console.log('\n══ 0. LA POPULATION ══');
  const pop=await S.ev(`
    db.users=(db.users||[]).filter(u=>!/^u-v42-/.test(u.id)&&!/^(Karim|Sofia|Jean|Rémi|Bureau|Nadia)\\b/.test(u.prenom||''));
    db.users.push({id:'u-v42-a',prenom:'Justin',nom:'Roux',login:'jr-v42',role:'admin',actif:true,pref:{}},
      {id:'u-v42-k',prenom:'Karim',nom:'Benali',login:'kb-v42',role:'technicien',techId:'t-v42-k',actif:true,pref:{}},
      {id:'u-v42-s',prenom:'Sofia',nom:'Perez',login:'sp-v42',role:'technicien',techId:'t-v42-s',actif:true,pref:{}},
      {id:'u-v42-r',prenom:'Rémi',nom:'Chef',login:'rc-v42',role:'chefEquipe',actif:true,pref:{},acces:{caps:{gererBoxes:true,creerUtilisateurs:true},modules:{}}},
      {id:'u-v42-b',prenom:'Bureau',nom:'Compta',login:'bc-v42',role:'compta',actif:true,pref:{},acces:{caps:{voirTout:true},modules:{stock:true}}},
      {id:'u-v42-j1',prenom:'Jean',nom:'Dupont',login:'jd1-v42',role:'technicien',actif:true,pref:{}},
      {id:'u-v42-j2',prenom:'Jean',nom:'Dupont',login:'jd2-v42',role:'technicien',actif:true,pref:{}});
    db.techniciens=(db.techniciens||[]).filter(t=>!/^t-v42-/.test(t.id)).concat([{id:'t-v42-k',nom:'Karim Benali'},{id:'t-v42-s',nom:'Sofia Perez'}]);
    db.produits=(db.produits||[]).filter(p=>!/^p-v42-/.test(p.id));
    produitCreer({id:'p-v42-a',nom:'ADVION GEL BLATTES 30G',ref:'ADV30',categorie:'TP18 — Insecticide',unite:'u',seuil:5},{semis:true});
    db.boxes=[{id:'stockage',stockage:true,nom:'Stockage',numero:'',groupe:'Sans groupe',actif:true,visibleTous:false,userIds:[],techIds:[],stock:{'p-v42-a':{u:20,ctn:0}}},
      {id:'bx-v42-n',nom:'Box Nord (sonde)',numero:'BX-1',actif:true,techIds:['t-v42-k'],stock:{'p-v42-a':{u:5,ctn:0}}}];
    db.validDRTous=false; db.bonsRemiseOff=false;
    /* ⛔ LE TÉMOIN NE DOIT PAS CONSOMMER LA RESSOURCE QUE L'ESSAI RÉCLAME : la bêta a 3 places au forfait,
       sept comptes les dépassent, et « Créer » ouvrirait la page d'abonnement AVANT toute règle de nom
       (mesuré à la première exécution : aucun compte créé, aucun message). Une entreprise de neuf
       personnes a acheté ses places. */
    db.forfaitQty=5; save();
    return {users:db.users.filter(u=>/^u-v42-/.test(u.id)).length, stockage:!!db.boxes.find(b=>b.id==='stockage'), placeLibre:planPlaceLibre()};`);
  v('sept comptes (dont deux « Jean Dupont » d’avant la règle), un stockage, une box, et des places libres au forfait', pop, {users:7, stockage:true, placeLibre:true});
  await connecter('u-v42-a');

  console.log('\n══ A.1 ⛔⛔ UTILISATEURS → ＋ UTILISATEUR : « KARIM BENALI » EXISTE DÉJÀ ══');
  await S.ev(`go('utilisateurs'); await new Promise(r=>setTimeout(r,800)); return 1;`);
  vrai('« ＋ Utilisateur » est touché', await toucher(`#page-head button[onclick="formUser()"]`));
  await dormir(600);
  vrai('… et la fenêtre « Nouvel utilisateur » est ouverte', await S.ev(`const o=document.getElementById('overlay'); return !!(o&&o.classList.contains('open')&&o.querySelector('form input[name="prenom"]'));`));
  const n0=await S.ev(`return db.users.length;`);
  await taper('#overlay input[name="prenom"]','Karim'); await taper('#overlay input[name="nom"]','Benali');
  await taper('#overlay input[name="login"]','karim2'); await taper('#overlay input[name="pwd"]','provisoire1');
  await S.ev(`const r=document.querySelector('#overlay select[name="role"]'); if(r){ r.value='technicien'; r.dispatchEvent(new Event('change',{bubbles:true})); } window.__toasts=[]; return 1;`);
  vrai('« Créer » est touché', await toucher(`#overlay form [type="submit"], #overlay button[type="submit"]`));
  await dormir(900);
  const a1=await S.ev(`return {n:db.users.length, toast:(window.__toasts.filter(t=>/est déjà le nom/.test(t))[0]||''), ouverte:!!document.querySelector('#overlay.open form')};`);
  v('⛔⛔ aucun compte créé', a1.n-n0, 0);
  vrai('⛔ … le message dit QUI et COMMENT distinguer', /« Karim Benali » est déjà le nom d’un autre compte \(@kb-v42\)/.test(a1.toast) && /initiale ou un second prénom/.test(a1.toast), a1.toast);
  vrai('… et la fenêtre reste ouverte pour corriger', a1.ouverte);
  await cap('A1-homonyme-refuse');
  await taper('#overlay input[name="prenom"]','Karim A.');
  await S.ev(`window.__toasts=[]; return 1;`);
  vrai('« Karim A. » : « Créer » est touché', await toucher(`#overlay form [type="submit"], #overlay button[type="submit"]`));
  await dormir(1200);
  const a2=await S.ev(`const u=db.users.find(x=>x.prenom==='Karim A.'&&x.nom==='Benali'); return {cree:!!u, n:db.users.length};`);
  v('contre-épreuve : « Karim A. Benali » est créé (une initiale suffit à distinguer)', [a2.cree, a2.n-n0], [true, 1]);

  console.log('\n══ A.2 LES DOUBLONS D’AVANT LA RÈGLE SONT SIGNALÉS ══');
  await S.ev(`try{ closeModal(true); }catch(e){} go('utilisateurs'); await new Promise(r=>setTimeout(r,800)); return 1;`);
  const a3=await S.ev(`const out={}; document.querySelectorAll('#content .usr-c').forEach(c=>{ const t=c.textContent.replace(/\\s+/g,' '); const m=t.match(/@(jd1-v42|jd2-v42|kb-v42|sp-v42)/); if(m) out[m[1]]=/même nom qu’un autre compte/.test(t); }); return out;`);
  v('⛔ les deux « Jean Dupont » portent « même nom qu’un autre compte » ; Karim et Sofia non', a3, {'kb-v42':false,'sp-v42':false,'jd1-v42':true,'jd2-v42':true});
  await cap('A2-doublons-signales');

  console.log('\n══ B.3 ⛔⛔ LA LIGNE DE KARIM : « SE SERVIR DANS LE STOCKAGE » EST UNE CASE DU STOCK ══');
  await S.ev(`usrOuvert=''; usrDeplier('u-v42-k'); await new Promise(r=>setTimeout(r,700)); return 1;`);
  const b3=await S.ev(`const z=document.getElementById('usr-d-u-v42-k'); if(!z) return null;
    const sw=z.querySelector('input[data-d="cap_stockage"]'); const cat=sw&&sw.closest('details.usr-cat');
    const boxes=[...z.querySelectorAll('input[data-d^="box_"]')].map(x=>x.dataset.d);
    return {sw:!!sw, coche:sw?sw.checked:null, deduit:sw?sw.dataset.deduit:null, categorie:cat?cat.querySelector('summary b').textContent.trim():'', boxes};`);
  vrai('la case existe sur la ligne de Karim, dans « 📦 Stock »', !!b3&&b3.sw&&/Stock/.test(b3.categorie), b3);
  v('⛔ décochée (un technicien n’a pas le stockage par défaut), et suit son défaut tant qu’on n’y touche pas', [b3&&b3.coche, b3&&b3.deduit], [false,'1']);
  v('⛔ le stockage n’est plus dans « Box qu’il ouvre »', (b3&&b3.boxes||[]).filter(x=>/stockage/.test(x)), []);
  await S.ev(`const z=document.getElementById('usr-d-u-v42-k'); const sw=z.querySelector('input[data-d="cap_stockage"]'); const d=sw.closest('details'); if(d) d.open=true; return 1;`);
  vrai('la case est touchée', await toucher('#usr-d-u-v42-k label.switch:has(input[data-d="cap_stockage"])'));
  await cap('B3-case-stockage');
  vrai('« ✓ Valider ses droits » est touché', await toucher(`#usr-d-u-v42-k button[onclick^="usrDroitsValider('u-v42-k'"]`));
  await dormir(600);
  v('⛔⛔ la permission de Karim est ÉCRITE : oui', await cle('u-v42-k'), true);

  console.log('\n══ B.4 KARIM LA VOIT, SOFIA NON ══');
  await connecter('u-v42-k');
  await S.ev(`go('stock'); await new Promise(r=>setTimeout(r,800)); return 1;`);
  const b4=await contenu();
  vrai('⛔ Karim : la carte du stockage et « Me servir »', /Me servir/.test(b4) && !/ne t’est pas ouvert/.test(b4), b4.slice(0,300));
  await connecter('u-v42-s');
  await S.ev(`go('stock'); await new Promise(r=>setTimeout(r,800)); return 1;`);
  const b4s=await contenu();
  vrai('⛔ Sofia (rien de réglé) : « Le stockage de l’entreprise ne t’est pas ouvert »', /ne t’est pas ouvert/.test(b4s) && !/Me servir/.test(b4s), b4s.slice(0,300));

  console.log('\n══ B.5 « QUI PEUT S’Y SERVIR » : UN RACCOURCI VERS LA PERMISSION, À L’ADMINISTRATEUR ══');
  await connecter('u-v42-r');
  await S.ev(`go('stock'); await new Promise(r=>setTimeout(r,800)); return 1;`);
  const b5r=await contenu();
  vrai('⛔ Rémi (chef, gère les box, n’est pas administrateur) ne voit pas « Qui peut s’y servir »', !/Qui peut s’y servir/.test(b5r), b5r.slice(0,300));
  const b5x=await S.ev(`window.__toasts=[]; stockageAcces(); await new Promise(r=>setTimeout(r,300)); const o=document.getElementById('overlay'); return {ouverte:!!(o&&o.classList.contains('open')&&/Qui peut s’y servir/.test(o.textContent)), toast:window.__toasts.slice(-1)[0]||''};`);
  vrai('⛔ … et la fenêtre appelée quand même refuse', !b5x.ouverte && /Réservé à l'administrateur/.test(b5x.toast), b5x);
  await connecter('u-v42-a');
  await S.ev(`go('stock'); await new Promise(r=>setTimeout(r,800)); return 1;`);
  vrai('l’administrateur touche « Qui peut s’y servir »', await toucherTexte('#content .stk-carte','Qui peut s'));
  await dormir(500);
  const b5=await S.ev(`return [...document.querySelectorAll('#stk-gens label')].map(l=>({t:l.textContent.replace(/\\s+/g,' ').trim(), on:l.querySelector('input').checked, off:l.querySelector('input').disabled})).filter(x=>/Benali|Perez|Compta|Roux/.test(x.t)).map(x=>[x.t.split(' ·')[0],x.on,x.off]);`);
  v('⛔ la fenêtre montre la PERMISSION de chacun : Bureau (défaut), Justin (administrateur, d’office), Karim (réglée), Karim A., Sofia',
    b5, [['Bureau Compta',true,false],['Justin Roux',true,true],['Karim A. Benali',false,false],['Karim Benali',true,false],['Sofia Perez',false,false]]);
  await cap('B5-qui-peut');
  await S.ev(`const l=[...document.querySelectorAll('#stk-gens label')].find(x=>/^Karim Benali/.test(x.textContent.trim())); l.querySelector('input').setAttribute('data-sonde','1'); return 1;`);
  await toucher('[data-sonde="1"]');
  vrai('« Enregistrer » est touché', await toucherTexte('#overlay .modal-head','Enregistrer'));
  await dormir(500);
  v('⛔⛔ Karim décoché : sa permission est écrite NON ; le bureau, pas touché, reste sur son défaut', [await cle('u-v42-k'), await cle('u-v42-b')], [false,'non réglée']);
  v('⛔ rien n’est posé sur la box', await S.ev(`const s=db.boxes.find(b=>b.id==='stockage'); return [s.userIds, s.visibleTous];`), [[],false]);
  await connecter('u-v42-k');
  await S.ev(`go('stock'); await new Promise(r=>setTimeout(r,800)); return 1;`);
  vrai('⛔ Karim ne le voit plus', /ne t’est pas ouvert/.test(await contenu()));
  const b5o=await S.ev(`window.__toasts=[]; boxView=null; openBox('stockage'); await new Promise(r=>setTimeout(r,500)); return {boxView, toast:window.__toasts.slice(-1)[0]||''};`);
  vrai('⛔ … ni par un lien (openBox)', b5o.boxView!=='stockage' && /ne t’est pas ouvert/.test(b5o.toast), b5o);

  console.log('\n══ B.6 LE BUREAU : « TOUT VOIR », SANS ÉQUIPE, RIEN DE RÉGLÉ → OUVERT PAR DÉFAUT ══');
  /* le bureau a le menu Stock (la comptable ne l'a pas par défaut : la carte du stockage vit DANS ce
     menu — c'est la case de sa catégorie, pas une porte à part). */
  await connecter('u-v42-b');
  await S.ev(`go('stock'); await new Promise(r=>setTimeout(r,800)); return 1;`);
  vrai('le bureau voit « Me servir »', /Me servir/.test(await contenu()));

  console.log('\n══ B.7 LE ✎ DU STOCKAGE, ET LA CRÉATION D’UN COMPTE ══');
  await connecter('u-v42-a');
  await S.ev(`openBox('stockage'); await new Promise(r=>setTimeout(r,700)); formBox('stockage'); await new Promise(r=>setTimeout(r,500)); return 1;`);
  const b7=await S.ev(`const o=document.getElementById('overlay'); const vis=[...o.querySelectorAll('.form-sec')].filter(x=>x.offsetParent!==null).map(x=>x.textContent.trim()); const t=o.textContent.replace(/\\s+/g,' '); try{ closeModal(true); }catch(e){} return {vis, perm:/C’est une permission/.test(t)};`);
  vrai('⛔ le ✎ du stockage dit « c’est une permission » et ne montre plus « Qui peut voir ce box »', b7.perm && b7.vis.includes('Qui peut s’y servir') && !b7.vis.some(x=>/Qui peut voir ce box|techniciens autorisés|Autres personnes autorisées/.test(x)), b7);
  await S.ev(`go('utilisateurs'); await new Promise(r=>setTimeout(r,700)); formUser(); await new Promise(r=>setTimeout(r,600)); return 1;`);
  const b7c=await S.ev(`const c=document.getElementById('nu-stk'); const boxes=[...document.querySelectorAll('#nu-box-bloc label')].map(l=>l.textContent.trim()); return {case:!!c, coche:c?c.checked:null, stockageDansBox:boxes.some(x=>/Stockage/.test(x))};`);
  v('⛔ la création propose la case « Se servir dans le stockage » (décochée), et plus le stockage parmi les box', b7c, {case:true, coche:false, stockageDansBox:false});
  await taper('#overlay input[name="prenom"]','Nadia'); await taper('#overlay input[name="nom"]','Kacem');
  await taper('#overlay input[name="login"]','nkacem'); await taper('#overlay input[name="pwd"]','provisoire1');
  vrai('la case est touchée', await toucher('#nu-stk'));
  await cap('B7-creation-case');
  vrai('« Créer » est touché', await toucher(`#overlay form [type="submit"], #overlay button[type="submit"]`));
  await dormir(1200);
  v('⛔⛔ le compte créé porte la permission, écrite', await S.ev(`const u=db.users.find(x=>x.prenom==='Nadia'&&x.nom==='Kacem'); return u?(u.acces&&u.acces.caps&&u.acces.caps.stockage):'absent';`), true);

  console.log('\n══ PAGE ══');
  v('aucune exception JavaScript', S.exceptions, []);
  console.log(`\n════ sonde-v742 : ${ok} ✓ ${ko} ✗ ════`);
  S.fermer(); process.exit(ko?1:0);
/* Une sonde qui meurt ferme son navigateur (CLAUDE.md : les fantômes font tomber les bancs de temps). */
})().catch(e=>{ console.error(e); console.log(`\n════ sonde-v742 : ${ok} ✓ ${ko+1} ✗ ════`); try{ navigateur&&navigateur.fermer(); }catch(_){} process.exit(1); });

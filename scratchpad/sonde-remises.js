/* ══ SONDE — MOUVEMENTS STOCK : CHACUN VOIT LES BONS DE REMISE QUI LE CONCERNENT ══════════════
   Justin, 23 septembre 2026 : « Mouvement stock pareil, tu appliques les mêmes règles, chacun
   voit ce qui le concerne. » Jusque-là l'écran filtrait les mouvements et montrait TOUS les bons
   de remise de l'entreprise à tout le monde.
   On ouvre le VRAI écran Mouvements stock (et Produits donnés), dans une vraie page, et on compte
   les bons RENDUS (leur bouton `remisePdf('…')`) :
     · un TECHNICIEN (Karim, box Nord à lui) : le bon de sa box, celui qu'il a fait, celui qu'il a
       reçu — pas celui entre deux autres sur une box qui n'est pas la sienne ;
     · l'ADMINISTRATEUR : tous.
   ⛔ On compte la population (quatre bons posés, deux box, deux comptes) : un « rien de caché »
   sur une base sans bons ne prouverait rien.
   ⛔ Bêta uniquement, copie locale servie en 127.0.0.1. SOURCE=<une bêta d'avant> pour la
   contre-épreuve : le technicien y voit les quatre.                                          */
const path=require('path');
const {ouvrir,dormir}=require(path.join(__dirname,'pilote.js'));
let ok=0,ko=0; const vrai=(t,c,d)=>{ c?ok++:ko++; console.log((c?'  ✓ ':'  ✗ ')+t+(c||d===undefined?'':'  → '+JSON.stringify(d))); };
const v=(t,a,b)=>vrai(t,JSON.stringify(a)===JSON.stringify(b),a);

(async()=>{
  const S=await ouvrir(process.env.SOURCE?{source:process.env.SOURCE}:{});
  console.log('page mesurée :', S.version);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){}; return 1;`);
  const pop=await S.ev(`
    db.users=db.users||[]; db.techniciens=db.techniciens||[]; db.boxes=db.boxes||[]; db.bonsRemise=db.bonsRemise||[]; db.mouvements=db.mouvements||[];
    const T=[{id:'t-karim',nom:'Benali',prenom:'Karim'},{id:'t-sofia',nom:'Perez',prenom:'Sofia'}];
    T.forEach(t=>{ if(!db.techniciens.find(x=>x.id===t.id)) db.techniciens.push(t); });
    const U=[{id:'u-admin',prenom:'Justin',nom:'Roux',login:'justin',role:'admin',actif:true,pref:{}},
             {id:'u-karim',prenom:'Karim',nom:'Benali',login:'karim',role:'technicien',techId:'t-karim',actif:true,pref:{}}];
    U.forEach(u=>{ if(!db.users.find(x=>x.id===u.id)) db.users.push(u); });
    const B=[{id:'bx-nord',nom:'Box Nord (sonde)',techIds:['t-karim'],stock:{},actif:true},{id:'bx-sud',nom:'Box Sud (sonde)',techIds:['t-sofia'],stock:{},actif:true}];
    B.forEach(b=>{ if(!db.boxes.find(x=>x.id===b.id)) db.boxes.push(b); });
    const d=todayISO(), now=Date.now();
    const R=[{id:'br-a',num:'BR-SONDE-A',boxId:'bx-nord',par:'Léo Martin',pourQui:'Nadia Lopez'},
             {id:'br-b',num:'BR-SONDE-B',boxId:'bx-sud',par:'Karim Benali',pourQui:'Sofia Perez'},
             {id:'br-c',num:'BR-SONDE-C',boxId:'bx-sud',par:'Sofia Perez',pourQui:'Karim Benali'},
             {id:'br-d',num:'BR-SONDE-D',boxId:'bx-sud',par:'Sofia Perez',pourQui:'Nadia Lopez'}];
    db.bonsRemise=db.bonsRemise.filter(r=>!/^br-[a-d]$/.test(r&&r.id||''));
    R.forEach((r,i)=>db.bonsRemise.push({...r,date:d,ts:now-i*60000,lignes:[{produitId:'p-x',qte:1,unite:'u'}]}));
    /* Un bon ne vit jamais seul : il naît d'une SORTIE, et l'écran le range dans la bande « jour ·
       box » de ses mouvements. On pose donc la sortie qui l'accompagne, comme dans la vraie vie. */
    db.mouvements=db.mouvements.filter(m=>!/^mv-sonde-/.test(m&&m.id||''));
    R.forEach((r,i)=>db.mouvements.push({id:'mv-sonde-'+r.id,ts:now-i*60000,type:'sortie',qte:1,produitId:'p-x',boxId:r.boxId,technicien:r.par,pourQui:r.pourQui}));
    save(); return {bons:db.bonsRemise.filter(r=>/^br-[a-d]$/.test(r.id)).length, boxes:B.length};`);
  console.log('\n══ 0. LA POPULATION ══');
  v('quatre bons posés, sur deux box (chacun avec sa sortie)', pop, {bons:4, boxes:2});

  const lire=async(qui,vue)=>S.ev(`const u=db.users.find(x=>x.id==='${qui}'); currentUser=u; try{ enterApp(u); }catch(e){}
    await new Promise(r=>setTimeout(r,1200)); try{ closeModal(true); }catch(e){}
    /* les bandes « jour · box » sont repliées : on les déplie toutes pour lire les bons qu'elles portent */
    try{ mvtBoxOuverts=new Proxy({},{get:()=>true}); }catch(e){}
    go('${vue}'); await new Promise(r=>setTimeout(r,1300));
    const html=(document.getElementById('content')||{}).innerHTML||'';
    return [...new Set((html.match(/remisePdf\\('(br-[a-d])'\\)|donDetail\\('bon','(br-[a-d])'\\)/g)||[]).map(x=>x.match(/br-[a-d]/)[0]))].sort();`);

  console.log('\n══ 1. UN TECHNICIEN — Mouvements stock ══');
  const K=await lire('u-karim','mouvements');
  v('⛔⛔ il voit le bon de SA box, celui qu’il a FAIT, celui qu’il a REÇU — et pas celui entre deux autres', K, ['br-a','br-b','br-c']);
  console.log('\n══ 2. LE MÊME — Produits donnés (la même règle) ══');
  const KD=await lire('u-karim','produitsDonnes');
  v('⛔ les mêmes dons, ni plus ni moins (« pour moi » exclu : ici aucun)', KD, ['br-a','br-b','br-c']);
  console.log('\n══ 3. L’ADMINISTRATEUR ══');
  const A=await lire('u-admin','mouvements');
  v('il voit les quatre', A, ['br-a','br-b','br-c','br-d']);
  console.log('\n══ 4. AUCUNE ERREUR ══');
  v('exceptions', S.exceptions, []);
  v('erreurs console', S.consoleErr.filter(x=>!/net::|Failed to load|favicon/i.test(x)), []);
  console.log(`\n════ sonde-remises : ${ok} ✓ ${ko} ✗ ════\n`);
  S.fermer(); process.exit(ko?1:0);
})().catch(e=>{console.error('SONDE MORTE :',e&&e.stack||e);process.exit(2);});

/* Sonde B1 : les plans d'appâtage se fusionnent poste par poste — dans la VRAIE page (bêta locale).
   Deux « appareils » partent de la même base, font de VRAIS gestes (poser, déplacer, supprimer,
   renommer), passent par un vrai save(), puis la vraie `fusionnerBases` les réunit.
   SOURCE=<bêta d'avant> pour la contre-épreuve. */
const path=require('path');
const {ouvrir}=require(path.join(__dirname,'pilote.js'));
let ok=0,ko=0; const v=(t,a,b)=>{ const c=JSON.stringify(a)===JSON.stringify(b); c?ok++:ko++; console.log((c?'  ✓ ':'  ✗ ')+t+(c?'':'  → reçu '+JSON.stringify(a)+', attendu '+JSON.stringify(b))); };
(async()=>{
  const S=await ouvrir(process.env.SOURCE?{source:process.env.SOURCE}:{});
  console.log('page mesurée :', S.version);
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove();
    window.confirm=()=>true; window.prompt=(q,d)=>d; return 1;`);
  const r=await S.ev(`
    db.users=(db.users||[]).filter(u=>u.id!=='u-pf'); db.users.push({id:'u-pf',prenom:'Justin',nom:'Sonde',login:'pf',role:'admin',actif:true,pref:{}});
    db.clients=(db.clients||[]).filter(c=>c.id!=='cli-pf'); db.clients.push({id:'cli-pf',nom:'Boulangerie Sonde',type:'pro',pro:true,_m:1});
    db.interventions=(db.interventions||[]).filter(i=>i.id!=='int-pf'); db.interventions.push({id:'int-pf',clientId:'cli-pf',date:todayISO(),statut:'planifiee',techId:'',produitsUtilises:[]});
    db.plansSite=db.plansSite||{}; delete db.plansSite['cli-pf'];
    const u=db.users.find(x=>x.id==='u-pf'); currentUser=u; enterApp(u); await new Promise(r=>setTimeout(r,900)); try{ closeModal(true); }catch(e){}
    window.renderIntDetail=function(){};   // on mesure les données, pas l'écran
    const clone=o=>JSON.parse(JSON.stringify(o));
    /* LA BASE COMMUNE : un plan, trois postes. */
    window._papNivNom=''; document.body.insertAdjacentHTML('beforeend','<input id="pap-niv-nom" value="RDC">');
    papCreateRoomsPlan('int-pf');
    const pl0=plansOf('cli-pf')[0]; _paSel=pl0.id;
    papPlacePoste('int-pf',pl0,0.2,0.2,'appat'); papPlacePoste('int-pf',pl0,0.4,0.4,'appat'); papPlacePoste('int-pf',pl0,0.6,0.6,'appat');
    save();
    const marques0={plan:+pl0._m>0, postes:pl0.postes.map(p=>+p._m>0)};
    const S0=clone(db);
    /* APPAREIL A : pose le poste 4, supprime le 2. */
    const plA=plansOf('cli-pf')[0]; papPlacePoste('int-pf',plA,0.8,0.8,'appat');
    const p2=plA.postes.find(p=>p.num===2); papDelPoste2('int-pf',p2.id,false); save();
    const A=clone(db);
    const tombeA=Object.keys((db._tombes||{}).plansSite||{}).length;
    /* APPAREIL B (depuis la base commune) : déplace le 3, renomme le plan. */
    db=clone(S0); await new Promise(r=>setTimeout(r,5));
    const plB=plansOf('cli-pf')[0]; const p3=plB.postes.find(p=>p.num===3);
    papMovePoste('int-pf',plB,p3.id,0.9,0.1);
    _paSel=plB.id; window.prompt=()=>'Réserve'; paRenamePlan('int-pf',plB.id); save();
    const B=clone(db);
    const fin=(F)=>{ const pl=(F.plansSite||{})['cli-pf']||[]; return pl.map(p=>({nom:p.nom,postes:(p.postes||[]).map(x=>x.num+(Math.abs((x.x||0)-0.9)<0.01?'*':'')).sort()})); };
    const recu=fusionnerBases(A,B,false), envoi=fusionnerBases(A,B,true);
    return {marques0, tombeA, recu:fin(recu), envoi:fin(envoi), sigDiff: baseSignature(recu)!==baseSignature(A)};`);
  console.log(JSON.stringify(r));
  v('les gestes posent leurs marques (plan + 3 postes) et passent un vrai save()', r.marques0, {plan:true, postes:[true,true,true]});
  v('la suppression pose sa tombe', r.tombeA>0, true);
  const attendu=[{nom:'Réserve', postes:['1','3*','4']}];
  v('⛔⛔ réception : le 4 posé par A, le 2 supprimé par A, le 3 déplacé par B, le nom de B — tout survit', r.recu, attendu);
  v('⛔⛔ envoi (priorité inverse) : le même résultat', r.envoi, attendu);
  v('   et la signature change (la fusion sera repoussée)', r.sigDiff, true);
  console.log('\n'+ok+' ✓  '+ko+' ✗'); await S.fermer(); process.exit(ko?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });

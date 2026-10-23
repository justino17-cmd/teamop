/* Recense, par le DOM, ce qu'un métier hors 3D voit de l'anti-nuisibles (population = écrans + fenêtres ouvertes). */
const {demarrer,dormir}=require('./lib.js');
const METIER=process.argv[2]||'plomberie';
const ANTI='nuisible|dératis|désinsect|rongeur|rodent|biocide|AMM\\b|matière active|appât|xylophag|punaise|cafard|infestation|sanitaire|TP ?1[48]|souricide|raticide|blatte|termite|piégeage|proofing|HACCP|virucide|répulsif|traitement curatif|postes? d';
(async()=>{
  const S=await demarrer({demo:false});
  await S.ev(`window.confirm=()=>true; window.equipeTeamOP=()=>true; return 1;`);
  await S.ev(`db.metier='${METIER}';
    window.metierBloque=function(k){ const p=metierPack(); return !!(p&&p.masque&&p.masque.indexOf(k)>=0); };
    db.clients=[{id:'c1',nom:'Copropriété Les Lilas',type:'pro',adresse:'12 rue des Lilas',codePostal:'69003',ville:'Lyon',tel:'0472000000',email:'a@b.fr',actif:true},{id:'c2',nom:'Mme Durand',type:'particulier',adresse:'3 rue X',codePostal:'69003',ville:'Lyon'}];
    db.techniciens=[{id:'t1',nom:'Marc Dubois',metier:'Technicien',couleur:'#1E7A4E'}];
    db.interventions=[{id:'i1',numero:'INT-2026-001',clientId:'c1',date:todayISO(),heure:'09:00',duree:60,type:intTypes()[0],statut:'terminee',techId:'t1',notes:'Essai',titre:'Essai',produitsUtilises:[],prestaMetier:{},relevesMetier:{}},
      {id:'i2',numero:'INT-2026-002',clientId:'c2',date:todayISO(),heure:'14:00',duree:60,type:intTypes()[1],statut:'planifiee',techId:'t1',notes:'',titre:'Essai 2'}];
    db.produits=[{id:'p1',nom:'Raccord laiton 20/27',categorie:'',ref:'R1',fournisseurs:['X'],prix:2,unite:'unité',qte:5,seuil:2}];
    db.fournisseurs=[{id:'f1',nom:'Négoce Dupont',email:'a@b.fr'}];
    db.contrats=[{id:'ct1',clientId:'c1',nom:'Entretien annuel',statut:'actif',debut:todayISO(),fin:'2027-12-31',montant:300}];
    save(); try{ renderNav(); }catch(e){} return 1;`);
  await S.profil('bureau','light');
  const rx=new RegExp(ANTI,'i');
  const trouve={};
  const releve=async(nom)=>{
    const r=await S.ev(`const rx=new RegExp(${JSON.stringify(ANTI)},'i');
      const roots=[document.getElementById('content'),document.getElementById('overlay'),document.querySelector('.modal'),document.querySelector('#sheet')].filter(Boolean);
      const out=new Set();
      function vis(e){ const s=getComputedStyle(e); if(s.display==='none'||s.visibility==='hidden') return false; return true; }
      roots.forEach(root=>{ const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
        let n; while(n=w.nextNode()){ const t=n.nodeValue.replace(/\\s+/g,' ').trim(); if(!t||!rx.test(t)) continue;
          let p=n.parentElement; let ok=true; while(p&&p!==root.parentElement){ if(!vis(p)){ok=false;break;} p=p.parentElement; }
          if(ok&&n.parentElement.tagName!=='SCRIPT'&&n.parentElement.tagName!=='STYLE') out.add(t.slice(0,110)); } });
      // placeholders, titres, valeurs d'options
      roots.forEach(root=>root.querySelectorAll('[placeholder],[title],option').forEach(e=>{ const t=(e.getAttribute('placeholder')||'')+' '+(e.getAttribute('title')||'')+' '+(e.tagName==='OPTION'?e.textContent:''); if(rx.test(t)) out.add('«attr/opt» '+t.trim().slice(0,110)); }));
      return [...out];`);
    if(r.length) trouve[nom]=r;
  };
  const cles=await S.ev(`return NAV.flatMap(g=>g.items).map(i=>i.k).concat(['parametres']);`);
  const masque=await S.ev(`return metierPack().masque||[];`);
  for(const k of cles){
    if(masque.includes(k)) continue;
    await S.ev(`try{ closeModal(); }catch(e){} try{ go('${k}'); }catch(e){ window.__err=String(e); } return 1;`);
    await dormir(700); await releve('vue:'+k);
  }
  const ouvrir=async(nom,code)=>{ try{ await S.ev(`try{ closeModal(); }catch(e){} const m=document.getElementById('modal'); if(m) m.innerHTML=''; go('interventions'); ${code}; return 1;`); }catch(e){ trouve['ERREUR:'+nom]=[String(e.message).slice(0,120)]; } await dormir(800); await releve('fenêtre:'+nom); };
  await ouvrir('formIntervention',`formIntervention()`);
  await ouvrir('detailIntervention(i1)',`detailIntervention('i1')`);
  await ouvrir('detailIntervention(i2)',`detailIntervention('i2')`);
  await ouvrir('assistCloture(i2)',`assistCloture('i2')`);
  await ouvrir('ficheClient(c1 pro)',`ficheClient('c1')`);
  await ouvrir('ficheClient(c2)',`ficheClient('c2')`);
  await ouvrir('formClient',`formClient()`);
  await ouvrir('formProduit',`formProduit()`);
  await ouvrir('formProduit(p1)',`formProduit('p1')`);
  await ouvrir('formTech',`formTech()`);
  await ouvrir('formUser',`formUser()`);
  await ouvrir('formContrat',`formContrat()`);
  await ouvrir('formFournisseur',`formFournisseur()`);
  await ouvrir('formVehicule',`formVehicule()`);
  await ouvrir('formRapport(i2)',`formRapport('i2')`);
  await ouvrir('ficheTech(t1)',`ficheTech('t1')`);
  await ouvrir('views.techniciens',`go('techniciens')`);
  await ouvrir('formProduitsListe',`formProduitsListe()`);
  await ouvrir('Créer',`try{ toggleCreer(); }catch(e){ try{ openCreer(); }catch(e2){} }`);
  console.log(JSON.stringify(trouve,null,1));
  console.log('exceptions',JSON.stringify(S.exceptions.slice(0,5)));
  S.fermer();
})().catch(e=>{console.error(e);process.exit(1)});

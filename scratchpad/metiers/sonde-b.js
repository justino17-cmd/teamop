/* SONDE B — LES ÉCRANS DE SAISIE, PAR MÉTIER, À TROIS TAILLES, JOUR ET NUIT, avec capture. Pour 3D, plomberie et chauffage :
   la fenêtre « ＋ Intervention », la clôture guidée (étapes 1, 2 et 5), le compte-rendu, le formulaire produit, la fiche client, la liste des techniciens.
   Mesure (après deux trames ET une lecture forcée, deux fois) : débordement latéral, mots de l'anti-nuisibles (hors 3D), et prend une capture.
   Usage : OUT=/chemin node sonde-b.js [métier…]   ⛔ bêta seulement, 127.0.0.1 seulement. */
const path=require('path');
const {demarrer,dormir}=require('./lib.js');
const OUT=process.env.OUT||require('path').join(require('os').tmpdir(),'op-metiers-sonde-b');
const METIERS=process.argv.slice(2).length?process.argv.slice(2):['3d','plomberie','chauffage'];
const ANTI='nuisible|dératis|désinsect|rongeur|biocide|\\\\bAMM\\\\b|matière active|appât|xylophag|infestation|dossier sanitaire|registre sanitaire|\\\\bTP ?1[48]\\\\b|rodonticide|insecticide|virucide|répulsif|proofing|piégeage|certibiocide';
(async()=>{
  const S=await demarrer({demo:false});
  console.log('page',S.version);
  await S.ev(`window.confirm=()=>true; window.equipeTeamOP=()=>true; window.metierBloque=function(k){ const p=metierPack(); return !!(p&&p.masque&&p.masque.indexOf(k)>=0); }; return 1;`);
  /* des données NEUTRES : la démonstration de la bêta est de l'anti-nuisibles (titres, produits, clients) et fausserait toute lecture de mots */
  await S.ev(`db.clients=[{id:'c1',nom:'Copropriété Les Lilas',typeClient:'pro',adresse:'12 rue des Lilas',codePostal:'69003',ville:'Lyon',actif:true},{id:'c2',nom:'Mme Durand',typeClient:'particulier',adresse:'3 rue X',codePostal:'69003',ville:'Lyon'}];
    db.techniciens=[{id:'t1',nom:'Marc Dubois',metier:'Technicien',couleur:'#1E7A4E'},{id:'t2',nom:'Sophie Martin',metier:'Technicien',couleur:'#2563EB'}];
    db.interventions=[{id:'i1',num:'INT-2026-001',clientId:'c1',date:todayISO(),heure:'09:00',duree:60,type:'Contrôle',statut:'terminee',techId:'t1',titre:'Passage de contrôle',produitsUtilises:[{produitId:'p1',qte:1}],prestaMetier:{},relevesMetier:{},compteRendu:'Fait'},
      {id:'i2',num:'INT-2026-002',clientId:'c2',date:todayISO(),heure:'14:00',duree:60,type:'Contrôle',statut:'planifiee',techId:'t1',titre:'Visite du site',produitsUtilises:[]}];
    db.produits=[{id:'p1',nom:'Raccord laiton 20/27',categorie:'',ref:'R1',fournisseurs:['Négoce Dupont'],prix:2,unite:'unité',qte:5,seuil:2}];
    db.fournisseurs=[{id:'f1',nom:'Négoce Dupont',email:'a@b.fr'}]; db.contrats=[]; db.boxes=[]; db.devis=[]; db.factures=[]; save(); return 1;`);
  const ids={i:'i1',i2:'i2',c:'c1',p:'p1'};
  let ok=0,ko=0; const ligne=(b,t)=>{ b?ok++:ko++; console.log((b?'  ✓ ':'  ✗ ')+t); };
  for(const [pn,theme] of [['bureau','light'],['bureau','dark'],['b1100','dark'],['b1100','light'],['tel','dark'],['tel','light']]){
    await S.profil(pn,theme);
    for(const m of METIERS){
      await S.metier(m);
      const ecrans=[['interv',`formIntervention()`],['clot1',`assistCloture('${ids.i2}')`],['clot2',`assistCloture('${ids.i2}'); asW.step=1; assistRender()`],['clot3',`assistCloture('${ids.i2}'); asW.step=2; assistRender()`],['clot5',`assistCloture('${ids.i2}'); asW.step=4; assistRender()`],['rapport',`formRapport('${ids.i}')`],['produit',`formProduit()`],['client',`ficheClient('${ids.c}')`],['techs',`go('techniciens')`]];
      for(const [nom,code] of ecrans){
        await S.ev(`window.__fenetre=false; try{ closeModal(); }catch(e){} const mm=document.getElementById('modal'); if(mm) mm.innerHTML=''; go('interventions'); return 1;`); await dormir(450);
        await S.ev(`window.__fenetre=${nom==='techs'?'false':'true'}; ${code}; return 1;`); await dormir(900);
        const mes=async()=>S.ev(`await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth; 
          const sc=document.querySelector('#modal .sheet, #modal .modal-box, #modal > div')||document.getElementById('modal');
          const mo=document.getElementById('modal'); const ouvert=!!(mo&&mo.innerHTML.trim().length>50&&window.__fenetre); const roots=ouvert?[mo]:[document.getElementById('content')].filter(Boolean); let txt='';
          roots.forEach(root=>{ const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT); let x; while(x=w.nextNode()){ const p=x.parentElement; if(!p||p.tagName==='SCRIPT'||p.tagName==='STYLE') continue; const s=getComputedStyle(p); if(s.display==='none'||s.visibility==='hidden') continue; txt+=x.nodeValue+' '; } });
          const anti=[...new Set((txt.match(new RegExp('${ANTI}','ig'))||[]).map(x=>x.toLowerCase()))];
          const d=document.documentElement; window.scrollTo(9999,0); const sx=window.scrollX; window.scrollTo(0,0);
          return {anti,sx,w:d.scrollWidth,cw:d.clientWidth,len:txt.length};`);
        await mes(); await dormir(500); const r=await mes();
        const nomf=`${OUT}/${pn}-${theme}-${m}-${nom}.png`; await S.snap(nomf);
        ligne(r.len>100 && r.sx===0 && (m==='3d'||r.anti.filter(x=>!(nom==='techs'&&false)).length===0), `${pn} ${theme} ${m} ${nom} : texte ${r.len}, défilement latéral ${r.sx}, mots anti-nuisibles [${r.anti.join(', ')}]`);
      }
    }
  }
  console.log('\n'+ok+' ✓  '+ko+' ✗   · erreurs de page : '+JSON.stringify(S.exceptions.slice(0,3)));
  S.fermer();
})().catch(e=>{console.error(e);process.exit(1)});

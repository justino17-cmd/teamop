/* SONDE C — LES CATÉGORIES DE PRODUITS PAR MÉTIER, au navigateur. Pour la 3D, la plomberie, le chauffage et la piscine : on pose un
   produit par catégorie du pack (et un produit rangé dans une catégorie « d'avant »), on ouvre Produits, on déplie tout, et on mesure :
   · l'ordre et le nombre des groupes (ceux du métier d'abord, l'inconnue d'avant telle quelle, « Sans catégorie » ensuite) ;
   · la couleur de chaque groupe (deux groupes ne se confondent pas), le texte lisible, aucun défilement latéral ;
   · le formulaire « ＋ Produit » : la liste de la catégorie est celle du métier.
   Jour ET nuit, 1440 / 1100 px / téléphone 390. Capture à chaque fois. Usage : OUT=/chemin node sonde-c.js   ⛔ bêta seulement. */
const path=require('path'), os=require('os');
const {demarrer,dormir}=require('./lib.js');
const OUT=process.env.OUT||path.join(os.tmpdir(),'op-metiers-sonde-c');
const METIERS=process.argv.slice(2).length?process.argv.slice(2):['3d','plomberie','chauffage','piscine'];
(async()=>{
  const S=await demarrer({demo:false});
  console.log('page',S.version);
  await S.ev(`window.confirm=()=>true; window.equipeTeamOP=()=>true; window.metierBloque=function(k){ const p=metierPack(); return !!(p&&p.masque&&p.masque.indexOf(k)>=0); };
    db.produits=[]; db.boxes=[]; db.fournisseurs=[{id:'f1',nom:'Négoce Dupont'}]; save(); return 1;`);
  let ok=0,ko=0; const ligne=(b,t)=>{ b?ok++:ko++; console.log((b?'  ✓ ':'  ✗ ')+t); };
  for(const [pn,theme] of [['bureau','light'],['bureau','dark'],['b1100','dark'],['b1100','light'],['tel','dark'],['tel','light']]){
    await S.profil(pn,theme);
    for(const m of METIERS){
      await S.metier(m);
      await S.ev(`db.produits=[]; const L=categoriesProduit(); L.forEach((c,i)=>{ db.produits.push({id:'p'+i,nom:'Produit '+(i+1),categorie:c,ref:'R'+i,fournisseurs:['Négoce Dupont'],prix:3,unite:'unité',qte:1,seuil:0,perso:true}); });
        db.produits.push({id:'pz',nom:'Fiche d\\'avant',categorie:'Catégorie d\\'une base d\\'avant',fournisseurs:['Négoce Dupont'],perso:true}); db.produits.push({id:'py',nom:'Fiche sans rangement',fournisseurs:['Négoce Dupont'],perso:true});
        window.__fenetre=false; try{ closeModal(); }catch(e){} go('produits'); return L.length;`);
      await dormir(900);
      await S.ev(`(db.produits||[]).forEach(p=>{ prdExpanded[p.categorie||'Sans catégorie']=true; }); renderProduitsList(); return 1;`);
      await dormir(500);
      const mes=async()=>S.ev(`await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth;
        const hs=[...document.querySelectorAll('#prd-list .prd-cat-h')]; const noms=hs.map(h=>(h.querySelector('div[style*="font-weight:700"]')||{}).textContent);
        const tuiles=hs.map(h=>getComputedStyle(h.querySelector('span')).backgroundColor);
        const encres=hs.map(h=>getComputedStyle(h.querySelector('div[style*="font-weight:700"]')).color);
        window.scrollTo(9999,0); const sx=window.scrollX; window.scrollTo(0,0);
        return {noms,tuiles,encres,sx,L:categoriesProduit()};`);
      await mes(); await dormir(400); const r=await mes();
      const attendu=r.L.concat(["Catégorie d'une base d'avant","Sans catégorie"]).filter((c,i,a)=>a.indexOf(c)===i);
      const dansOrdre=m==='3d'?r.noms.slice(0,r.L.length).every((n,i)=>n===r.L[i]):JSON.stringify(r.noms)===JSON.stringify(attendu);
      const distinctes=new Set(r.tuiles.slice(0,r.L.length)).size===r.L.length;
      ligne(r.noms.length>=r.L.length && dansOrdre && distinctes && r.sx===0, `${pn} ${theme} ${m} : ${r.noms.length} groupes (${r.L.length} du métier), ordre ${dansOrdre?'juste':'FAUX'}, ${new Set(r.tuiles.slice(0,r.L.length)).size} couleurs distinctes, défilement latéral ${r.sx}`);
      await S.snap(`${OUT}/${pn}-${theme}-${m}-liste.png`);
      // le formulaire
      await S.ev(`window.__fenetre=true; formProduit(); return 1;`); await dormir(700);
      const f=await S.ev(`const sel=document.querySelector('#modal select[name=categorie]'); return {n:sel?sel.options.length:0, liste:sel?[...sel.options].map(o=>o.text):[], biocide:/Biocide|N° AMM/.test((document.getElementById('modal')||{}).textContent||'')};`);
      ligne(f.n===r.L.length && JSON.stringify(f.liste)===JSON.stringify(r.L) && (m==='3d'?f.biocide:!f.biocide), `${pn} ${theme} ${m} formulaire : ${f.n} catégories = la liste du métier, biocide ${f.biocide?'montré':'caché'}`);
      await S.snap(`${OUT}/${pn}-${theme}-${m}-formulaire.png`);
      await S.ev(`try{ closeModal(); }catch(e){} return 1;`);
    }
  }
  console.log('\n'+ok+' ✓  '+ko+' ✗   · erreurs de page : '+JSON.stringify(S.exceptions.slice(0,3)));
  S.fermer();
})().catch(e=>{console.error(e);process.exit(1)});

// RELECTURE ADVERSE : mise en page du compositeur (devis ET contrat) — largeur de la page, texte réellement rendu, champs, cibles au doigt, débordement, contrastes. PROFIL=… NUIT=0|1
const X=require('./lib2.js'), {A,L}=X, CAP=X.CAP, v=L.v;
const pr=process.env.PROFIL||'mac', nuit=process.env.NUIT==='1', tag='mep-'+pr+(nuit?'-nuit':'-jour');
const mesure=f=>f.evaluate(()=>{
  const r=e=>{ if(!e) return null; const b=e.getBoundingClientRect(); return {x:Math.round(b.left),y:Math.round(b.top),w:Math.round(b.width),h:Math.round(b.height)}; };
  const vis=e=>e&&e.getBoundingClientRect().width>0&&e.offsetParent!==null;
  const feuille=[...document.querySelectorAll('.vv-grand-plein .feuille, .vv-ap-sc .feuille')].find(vis)||null;
  let fs=null,ech=null; if(feuille){ ech=feuille.getBoundingClientRect().width/794; const pts=[...feuille.querySelectorAll('*')].filter(e=>!e.children.length&&e.textContent.trim().length>2&&e.getBoundingClientRect().width>0).map(e=>[parseFloat(getComputedStyle(e).fontSize)*ech,e.textContent.trim().length]).sort((a,b)=>a[0]-b[0]); const tot=pts.reduce((s,x)=>s+x[1],0); let acc=0; for(const x of pts){acc+=x[1]; if(acc>=tot/2){fs=x[0];break;}} }
  const champs=[...document.querySelectorAll('.vv-form input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]), .vv-form select, .vv-form textarea')].filter(vis).map(e=>({id:e.id||e.name,h:Math.round(e.getBoundingClientRect().height),fs:parseFloat(getComputedStyle(e).fontSize)}));
  const fines=[...document.querySelectorAll('.fenetre.vv-pl .vv-form *, .fenetre.vv-pl .vv-hd *, .fenetre.vv-pl .vv-ap-bar *, .fenetre.vv-pl .fen-pied *')].filter(e=>vis(e)&&![...e.childNodes].every(n=>n.nodeType!==3||!n.textContent.trim())&&!e.closest('.feuille,.vv-ap-cadre')&&parseFloat(getComputedStyle(e).fontSize)<12.5).map(e=>parseFloat(getComputedStyle(e).fontSize)+'px « '+e.textContent.trim().slice(0,30)+' »');
  const titres=[...document.querySelectorAll('.vv-et b')].filter(vis).map(e=>parseFloat(getComputedStyle(e).fontSize));
  return {fines:[...new Set(fines)].slice(0,8),W:innerWidth,H:innerHeight,fen:r(document.querySelector('.fenetre.vv-pl')),form:r(document.querySelector('.vv-form')),feuille:r(feuille),fsRendu:fs,ech,champs,titres,
    creer:r([...document.querySelectorAll('[data-act="vierge-creer"]')].find(vis)),sw:document.documentElement.scrollWidth,
    police:getComputedStyle(document.querySelector('.vv-form')).fontSize};
});
(async()=>{
  const c=await L.ouvrir({profil:pr,nuit,qui:'marc'}); const p=c.p, W=c.largeur, deux=W>=1032;
  console.log('── '+tag+(deux?' (deux colonnes)':' (une colonne)'));
  for(const type of ['devis','contrat']){
    const page=type==='devis'?'devis':'contrats';
    await L.aller(p,page);
    await L.capture(c,CAP+`${tag}-${type}-page.png`);
    // la page d'OP GESTION elle-même : taille des boutons et du texte courant, pour juger « trop petit »
    const ref=await p.evaluate(()=>{ const b=document.querySelector('[data-opd]'); const h1=document.querySelector('#contenu h1'); const r=b.getBoundingClientRect(); return {btnH:Math.round(r.height),btnFs:parseFloat(getComputedStyle(b).fontSize),h1:parseFloat(getComputedStyle(h1).fontSize),corps:parseFloat(getComputedStyle(document.querySelector('#contenu p, #contenu .gris')||document.body).fontSize)}; });
    const f=await A.ouvrirAtelier(c,type,null); v(`${tag} ${type} · s'ouvre`,!!f); if(!f) continue; await L.calme(p,1100);
    if(type==='devis'){ await X.clic(c,f,'[data-vv="client"][data-id="vp"]'); await f.locator('#vv-objet').fill('Remplacement du ventilateur extérieur'); for(const r of ['VE-DK-35','EL-ALL','R32']) await X.clic(c,f,`[data-vv="art-add"][data-id="${r}"]`); }
    else { await X.clic(c,f,'[data-vv="client"][data-id="mi"]'); await f.locator('#vv-titre').fill('Entretien annuel de la climatisation'); await X.clic(c,f,'[data-vv="tpl"][data-v="part"]'); }
    await L.calme(p,800);
    let m=await mesure(f);
    v(`${tag} ${type} · couvre tout l'écran`,m.fen&&m.fen.x===0&&m.fen.y===0&&m.fen.w===m.W&&m.fen.h===m.H,m.fen);
    if(deux){
      v(`${tag} ${type} · page d'aperçu ≥ ${W>=1400?620:560} px (${m.feuille&&m.feuille.w}) et texte rendu ≥ 10,5 px (${m.fsRendu&&m.fsRendu.toFixed(1)})`,m.feuille&&m.feuille.w>=(W>=1400?620:560)&&m.fsRendu>=10.5,[m.feuille,m.fsRendu]);
    } else {
      await X.clic(c,f,'[data-vv="grand"]'); await L.calme(p,600); const g=await mesure(f);
      console.log(`  · ${type} aperçu plein écran : page ${g.feuille&&g.feuille.w} px sur ${g.W}, texte rendu ${g.fsRendu&&g.fsRendu.toFixed(1)} px, échelle ${g.ech&&g.ech.toFixed(2)}`);
      // DÉCISION tout-01 (refonte/compositeur-corrections.json) : au téléphone l'aperçu s'ouvre sur 100 % — le texte se LIT (≥ 11 px, 12,2 mesurés) et la page défile de côté —,
      // et « Ajuster » (un toucher) montre la page ENTIÈRE dans l'écran. La sonde de l'ancien état exigeait la page entière dès l'ouverture (texte à 5,5 px) : la promesse (lisible ET entière) est gardée, en deux gestes.
      v(`${tag} ${type} · aperçu plein écran : à l'ouverture le texte de la page se LIT sans zoom (≥ 11 px rendus ; rendu ${g.fsRendu&&g.fsRendu.toFixed(1)})`,g.fsRendu>=11,g.fsRendu);
      await X.clic(c,f,'[data-vv="zoom"][data-v="ajuster"]:visible'); await L.calme(p,500); const ga=await mesure(f);
      v(`${tag} ${type} · « Ajuster » montre la page ENTIÈRE dans l'écran (${ga.feuille&&ga.feuille.w} ≤ ${ga.W})`,ga.feuille&&ga.feuille.w<=ga.W);
      await L.capture(c,CAP+`${tag}-${type}-apercu.png`);
      // 100 % : la page se lit-elle en défilant de côté ?
      await X.clic(c,f,'[data-vv="zoom"][data-v="1"]:visible'); await L.calme(p,500); const g1=await mesure(f);
      console.log(`  · ${type} aperçu à 100 % : page ${g1.feuille&&g1.feuille.w} px, texte ${g1.fsRendu&&g1.fsRendu.toFixed(1)} px`);
      await L.capture(c,CAP+`${tag}-${type}-apercu100.png`);
      v(`${tag} ${type} · à 100 % le texte atteint 10,5 px (${g1.fsRendu&&g1.fsRendu.toFixed(1)})`,g1.fsRendu>=10.5);
      await X.clic(c,f,'[data-vv="grand-x"]'); await L.calme(p,500); m=await mesure(f);
    }
    const f48=m.champs.filter(x=>x.h<48), p16=m.champs.filter(x=>x.fs<16);
    v(`${tag} ${type} · population : ${m.champs.length} champs visibles ; tous ≥ 48 px de haut et ≥ 16 px de texte`,m.champs.length>=3&&f48.length===0&&p16.length===0,[f48.slice(0,4),p16.slice(0,4)]);
    v(`${tag} ${type} · titres d'étape ≥ 18 px (${m.titres.join(',')})`,m.titres.length>=2&&m.titres.every(t=>t>=18),m.titres);
    v(`${tag} ${type} · aucun texte de l'interface sous 12,5 px (population ${m.champs.length} champs) : ${JSON.stringify(m.fines)}`,m.fines.length===0,m.fines);
    v(`${tag} ${type} · rien ne glisse de côté (scrollWidth ${m.sw} ≤ ${m.W})`,m.sw<=m.W+1);
    if(c.doigt){ const d=await L.doigts(f,'.vv-pl'); v(`${tag} ${type} · cibles au doigt ≥ 44 px (${d.petits.length} petites)`,d.petits.length===0,d.petits); v(`${tag} ${type} · champs ≥ 16 px (zoom d'iOS) : ${d.champs.length} fautifs`,d.champs.length===0,d.champs); v(`${tag} ${type} · pas de texte écrasé (${d.ecrases.length})`,d.ecrases.length===0,d.ecrases); }
    const ct=await A.contrastes(f,'.fenetre',4.5,'.papier,.vv-ap-cadre,.feuille'); v(`${tag} ${type} · contrastes ≥ 4,5 (population ${ct.n})`,ct.n>=20&&ct.bas.length===0,ct.bas.slice(0,5));
    console.log(`  · ${type} : référence OP GESTION bouton ${ref.btnH}px/${ref.btnFs}px, h1 ${ref.h1}px ; compositeur champs ${m.champs.slice(0,3).map(x=>x.h+'px/'+x.fs+'px').join(' ')}, corps ${m.police}`);
    await L.capture(c,CAP+`${tag}-${type}-compo.png`);
    // fond d'étapes défilé : capture du bas de la colonne
    await f.evaluate(()=>{ const e=document.querySelector('.vv-form'); if(e) e.scrollTop=e.scrollHeight; }); await L.calme(p,400);
    await L.capture(c,CAP+`${tag}-${type}-compo-bas.png`);
    // abandon propre
    await p.keyboard.press('Escape'); await p.waitForTimeout(500); const cf=await f.evaluate(()=>!!document.querySelector('.dialogue')).catch(()=>false);
    if(cf){ await X.clic(c,f,'.dialogue button[data-r="1"]'); await p.waitForTimeout(700); }
  }
  v(tag+' · aucune erreur JavaScript',c.err.length===0,c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan()?1:0);
})().catch(e=>{console.log('ERREUR SONDE',e.message.slice(0,500));process.exit(2);});

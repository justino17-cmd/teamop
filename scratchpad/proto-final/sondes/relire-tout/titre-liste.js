// RELECTURE ADVERSE : la carte « Composés dans l'atelier » est-elle alignée et aérée comme les cartes voisines (Devis et Contrats) ? Mesure sur la page, 3 profils.
const X=require('./lib2.js'), {A,L}=X, v=L.v, CAP=X.CAP;
const pr=process.env.PROFIL||'mac', nuit=process.env.NUIT==='1', tag='titre-'+pr+(nuit?'-nuit':'-jour');
(async()=>{
  const c=await L.ouvrir({profil:pr,nuit,qui:'marc'}); const p=c.p; console.log('── '+tag);
  // fabriquer un document composé (brouillon) par les gestes
  for(const type of ['devis','contrat']){
    await L.aller(p,type==='devis'?'devis':'contrats'); const f=await A.ouvrirAtelier(c,type,null); await L.calme(p,900);
    if(type==='devis') await A.composerDevis(c,f,{client:'vp',objet:'Essai alignement',articles:[{ref:'EL-ALL',qte:1}]});
    else { await X.clic(c,f,'[data-vv="client"][data-id="mi"]'); await f.locator('#vv-titre').fill('Essai alignement'); await X.clic(c,f,'[data-vv="tpl"][data-v="part"]'); await X.clic(c,f,'[data-act="vierge-creer"]:visible'); await p.waitForTimeout(1200); if(await f.locator('.fen-v.souple button:has-text("Terminé")').count()) await X.clic(c,f,'.fen-v.souple button:has-text("Terminé")'); }
    await X.clic(c,f,'[data-act="retour"]:visible'); await p.waitForTimeout(1100); await L.calme(p,500);
    const m=await p.evaluate(()=>{ const t=[...document.querySelectorAll('#contenu *')].find(e=>/^(Devis|Contrats) composés/i.test(e.textContent.trim())&&!e.children.length); if(!t) return null; const carte=t.closest('.carte')||t.parentElement; const ligne=carte.querySelector('.opd-l'); const autre=[...document.querySelectorAll('#contenu .carte')].find(x=>x!==carte&&x.querySelector('table,.dv-liste,.dv-l,.cx-l'))||null;
      const R=e=>{const r=e.getBoundingClientRect(); return {x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width)};}; const cs=getComputedStyle(carte);
      const lg=ligne?R(ligne):null; const num=ligne?ligne.querySelector('*'):null;
      return {titre:R(t),carte:R(carte),padCarte:[cs.paddingTop,cs.paddingLeft],ligne:lg,premier:ligne&&R(ligne.firstElementChild),autrePad:autre?[getComputedStyle(autre).paddingTop,getComputedStyle(autre).paddingLeft]:null,autreCarteX:autre?R(autre):null,txt:t.textContent.trim()}; });
    console.log('  '+type+' :',JSON.stringify(m));
    if(!m){ v(`${tag} ${type} · la carte « Composés » existe`,false); continue; }
    const decal=m.titre.x-m.carte.x;
    v(`${tag} ${type} · le titre de la carte n'est pas collé à son bord (décalage ${decal} px ≥ 16)`,decal>=16,m);
    v(`${tag} ${type} · le titre s'aligne sur le premier élément de la ligne (${m.titre.x} contre ${m.premier&&m.premier.x})`,m.premier&&Math.abs(m.titre.x-m.premier.x)<=2,m);
    await L.capture(c,CAP+`${tag}-${type}.png`);
  }
  await L.fin(c); await L.fermer(); process.exit(L.bilan()?1:0);
})().catch(e=>{console.log('ERREUR SONDE',e.message.slice(0,500));process.exit(2);});

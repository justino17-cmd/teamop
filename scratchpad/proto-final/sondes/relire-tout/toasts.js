// RELECTURE ADVERSE : les messages à action du compositeur — « Modèle posé… Annuler » (le modèle d'avant revient-il ?), « Ton devis en cours est repris. Recommencer » (repart-il de zéro ?), et le message ne recouvre-t-il pas « Créer » ?
const X=require('./lib2.js'), {A,L}=X, v=L.v, CAP=X.CAP;
const pr=process.env.PROFIL||'iphone', nuit=process.env.NUIT==='1', tag='toast-'+pr+(nuit?'-nuit':'-jour');
(async()=>{
  const c=await L.ouvrir({profil:pr,nuit,qui:'marc'}); const p=c.p; console.log('── '+tag);
  await L.aller(p,'contrats'); let f=await A.ouvrirAtelier(c,'contrat',null); await L.calme(p,900);
  const clic=s=>X.clic(c,f,s);
  const nb=()=>f.locator('#vv-lig li.vv-a').count();
  const toast=()=>f.evaluate(()=>{ const t=[...document.querySelectorAll('.toast, #toasts > *')].find(e=>e.offsetParent); if(!t) return null; const r=t.getBoundingClientRect(); const cr=[...document.querySelectorAll('[data-act="vierge-creer"]')].find(e=>e.offsetParent); const b=cr?cr.getBoundingClientRect():null; const rec=b&&r.left<b.right&&b.left<r.right&&r.top<b.bottom&&b.top<r.bottom;
    const act=t.querySelector('button'); const ra=act?act.getBoundingClientRect():null; return {txt:t.innerText.replace(/\s+/g,' '),w:Math.round(r.width),y:Math.round(r.top),recouvreCreer:!!rec,actionH:ra?Math.round(ra.height):null,actionW:ra?Math.round(ra.width):null,pe:getComputedStyle(t).pointerEvents}; });
  await clic('[data-vv="tpl"][data-v="part"]'); await p.waitForTimeout(400); const n1=await nb();
  await clic('[data-vv="tpl"][data-v="pro"]'); await p.waitForTimeout(500); const n2=await nb(); const t1=await toast();
  console.log('  message après le changement de modèle :',JSON.stringify(t1));
  v(`${tag} · un message à action paraît (« Annuler »)`,t1&&/Annuler/.test(t1.txt),t1);
  if(t1){ v(`${tag} · le message ne recouvre pas « Créer le contrat »`,!t1.recouvreCreer,t1); if(c.doigt) v(`${tag} · le bouton du message se touche au doigt (≥ 44 px : ${t1.actionH}×${t1.actionW})`,t1.actionH>=44,t1); }
  if(t1&&/Annuler/.test(t1.txt)){ const ids=await f.evaluate(()=>[...document.querySelectorAll('#vv-lig li.vv-a .vv-a-t b')].map(b=>b.textContent.trim())); await f.locator('.toast button, #toasts button').first().evaluate(b=>b.click()); await p.waitForTimeout(500); const n3=await nb(); const ids3=await f.evaluate(()=>[...document.querySelectorAll('#vv-lig li.vv-a .vv-a-t b')].map(b=>b.textContent.trim()));
    v(`${tag} · « Annuler » ramène les ${n1} articles du modèle d'avant (${n2} → ${n3})`,n3===n1,[n1,n2,n3]); }
  // brouillon repris
  await f.locator('#vv-titre').fill('Brouillon à reprendre'); await p.waitForTimeout(500); await p.goBack().catch(()=>{}); await p.waitForTimeout(1000);
  f=await A.ouvrirAtelier(c,'contrat','contrats'); await L.calme(p,900); const t2=await toast(); console.log('  message à la réouverture :',JSON.stringify(t2));
  v(`${tag} · le brouillon repris est annoncé (« Ton contrat en cours est repris. Recommencer »)`,t2&&/repris/.test(t2.txt),t2);
  if(t2){ v(`${tag} · le message de reprise ne recouvre pas « Créer »`,!t2.recouvreCreer,t2); await f.locator('.toast button, #toasts button').first().evaluate(b=>b.click()); await p.waitForTimeout(900);
    const apres=await f.evaluate(()=>({titre:(document.querySelector('#vv-titre')||{}).value,n:document.querySelectorAll('#vv-lig li.vv-a').length,ouvert:!!document.querySelector('.fenetre.vv-pl')}));
    v(`${tag} · « Recommencer » repart d'un contrat vide (titre vide, 0 article) et le compositeur reste ouvert`,apres.ouvert&&apres.titre===''&&apres.n===0,apres); }
  v(`${tag} · aucune erreur JavaScript`,c.err.length===0,c.err);
  await L.capture(c,CAP+tag+'-fin.png');
  await L.fin(c); await L.fermer(); process.exit(L.bilan()?1:0);
})().catch(e=>{console.log('ERREUR SONDE',e.message.slice(0,700));process.exit(2);});

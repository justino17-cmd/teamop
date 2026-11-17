const X=require('./lib2.js'), {A,L}=X, v=L.v, CAP=X.CAP;
const pr=process.env.PROFIL||'mac', nuit=process.env.NUIT==='1', tag='dbl-'+pr+(nuit?'-nuit':'-jour');
(async()=>{
  const c=await L.ouvrir({profil:pr,nuit,qui:'marc'}); const p=c.p; console.log('── '+tag);
  for(const type of ['devis','contrat']){
    await L.aller(p,type==='devis'?'devis':'contrats'); const f=await A.ouvrirAtelier(c,type,null); await L.calme(p,900);
    if(type==='devis'){ await X.clic(c,f,'[data-vv="client"][data-id="vp"]'); await X.clic(c,f,'[data-vv="art-add"][data-id="EL-ALL"]'); }
    else { await X.clic(c,f,'[data-vv="client"][data-id="mi"]'); await X.clic(c,f,'[data-vv="tpl"][data-v="part"]'); }
    await L.calme(p,500);
    const creer=await f.locator('[data-act="vierge-creer"]:visible').first().boundingBox();
    const envoyerApres=null;
    // où sera « Envoyer » dans l'éditeur ? on le saura après ; ici on double-clique au centre du bouton « Créer »
    await p.mouse.dblclick(creer.x+creer.width/2,creer.y+creer.height/2); await p.waitForTimeout(1500);
    const e=await f.evaluate(()=>({editeur:S.vue==='editeur',dialogue:[...document.querySelectorAll('.fenetre.env,.fen-v .fenetre')].map(x=>x.innerText.replace(/\s+/g,' ').slice(0,60)),etat:(typeof D==='function'&&D())?D().etat:null,envois:(typeof D==='function'&&D())?(D().envois||[]).length:null}));
    console.log('  '+type+' après un double clic sur « Créer » :',JSON.stringify(e));
    await L.capture(c,CAP+`${tag}-${type}.png`);
    v(`${tag} ${type} · un double clic sur « Créer » n'ouvre PAS la fenêtre d'envoi du document qu'on vient de créer`,e.editeur&&e.dialogue.length===0,e);
    // nettoyage
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    await X.clic(c,f,'[data-act="retour"]:visible'); await p.waitForTimeout(1100);
  }
  v(tag+' · aucune erreur JavaScript',c.err.length===0,c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan()?1:0);
})().catch(e=>{console.log('ERREUR SONDE',e.message.slice(0,600));process.exit(2);});

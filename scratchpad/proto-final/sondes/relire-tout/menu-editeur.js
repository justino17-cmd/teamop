// RELECTURE ADVERSE : que propose l'éditeur d'un document composé pour le supprimer ou le dupliquer ? (téléphone : le menu « ⋮ » ; ordinateur : la barre)
const X=require('./lib2.js'), {A,L}=X, v=L.v, CAP=X.CAP;
const pr=process.env.PROFIL||'iphone', tag='menued-'+pr;
(async()=>{
  const c=await L.ouvrir({profil:pr,qui:'marc'}); const p=c.p; console.log('── '+tag);
  await L.aller(p,'devis'); const f=await A.ouvrirAtelier(c,'devis',null); await L.calme(p,900);
  await A.composerDevis(c,f,{client:'vp',objet:'Menu',articles:[{ref:'EL-ALL',qte:1}]}); await p.waitForTimeout(800);
  const barre=await f.evaluate(()=>[...document.querySelectorAll('#vue-editeur .barre button, #vue-editeur header button, #vue-editeur .haut button')].filter(b=>b.offsetParent).map(b=>(b.getAttribute('aria-label')||b.textContent||'').trim().replace(/\s+/g,' ')+'|'+[...b.attributes].filter(a=>/^data-/.test(a.name)).map(a=>a.name+'='+a.value).join(',')));
  console.log('  boutons de la barre :',JSON.stringify(barre));
  const plus=f.locator('#vue-editeur [data-act="menu-plus"], #vue-editeur [aria-label*="lus"], #vue-editeur [aria-haspopup="menu"], #vue-editeur [data-act="menu-doc-ed"]').first();
  const n=await f.locator('#vue-editeur [aria-haspopup="menu"]').count(); console.log('  éléments aria-haspopup=menu :',n);
  if(n){ await f.locator('#vue-editeur [aria-haspopup="menu"]:visible').last().click().catch(async()=>{ await f.locator('#vue-editeur [aria-haspopup="menu"]:visible').last().tap(); }); await p.waitForTimeout(600);
    const items=await f.evaluate(()=>[...document.querySelectorAll('[role=menu] *, .menu *, .fen-v *')].filter(e=>/^(BUTTON|A)$/.test(e.tagName)||e.getAttribute('role')==='menuitem').map(b=>(b.textContent||'').trim().replace(/\s+/g,' ')).filter(Boolean));
    console.log('  éléments du menu :',JSON.stringify([...new Set(items)]));
    await L.capture(c,CAP+tag+'-menu.png');
    v(tag+' · le menu de l\'éditeur offre « Supprimer »',[...new Set(items)].some(t=>/Supprimer/i.test(t)),items);
    // tout-07 (refonte/compositeur-corrections.json) a posé « Supprimer ce brouillon » (confirmation, brouillons seulement) et RIEN d'autre : « Dupliquer » n'a pas été construit, c'est
    // une décision de produit à soumettre à Justin (rejeu-coque.json). La sonde garde le geste décidé, avec son mot exact, et dit l'absence de l'autre au lieu de la compter faux.
    v(tag+' · le menu de l\'éditeur d\'un brouillon offre « Supprimer ce brouillon » (le mot exact de la décision tout-07)',[...new Set(items)].some(t=>/^Supprimer ce brouillon$/i.test(t)),items);
    console.log('  · « Dupliquer » dans le menu :',[...new Set(items)].some(t=>/Dupliquer/i.test(t))?'oui':'non (à soumettre : jamais construit)');
  } else v(tag+' · un menu existe dans l\'éditeur',false,barre);
  await L.fin(c); await L.fermer(); process.exit(L.bilan()?1:0);
})().catch(e=>{console.log('ERREUR SONDE',e.message.slice(0,600));process.exit(2);});

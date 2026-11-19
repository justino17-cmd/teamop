// RELECTURE ADVERSE : « Nouveau client… » dans le compositeur — refus dits, client créé qui paraît dans OP GESTION (liste et fiche), doublon (le chemin court « Devis rapide » prévient, le compositeur ?).
const X=require('./lib2.js'), {A,L}=X, v=L.v, CAP=X.CAP;
const pr=process.env.PROFIL||'mac', nuit=process.env.NUIT==='1', tag='ncli-'+pr+(nuit?'-nuit':'-jour');
(async()=>{
  const c=await L.ouvrir({profil:pr,nuit,qui:'marc'}); const p=c.p; console.log('── '+tag);
  await L.aller(p,'devis'); const n0=await p.evaluate(()=>Object.keys(CLIENTS).length);
  let f=await A.ouvrirAtelier(c,'devis',null); await L.calme(p,900);
  const ouvrir=async()=>{ await X.clic(c,f,'[data-vv="client-nouveau"]'); await p.waitForTimeout(700); };
  const form=(n,val)=>f.locator(`.nv-client [name="${n}"]`).fill(val);
  const erreurs=()=>f.evaluate(()=>[...document.querySelectorAll('.nv-client .err, .nv-client [aria-invalid="true"] ~ .err, .nv-client .champ-err')].map(e=>e.textContent.trim()).filter(Boolean));
  await ouvrir(); await L.capture(c,CAP+tag+'-formulaire.png');
  // 1. vide
  await X.clic(c,f,'.nv-client [data-ok]'); await p.waitForTimeout(300); let e=await erreurs(); console.log('  nom vide →',JSON.stringify(e));
  v(`${tag} · nom vide : refus dit`,e.length>0&&/nom/i.test(e.join(' ')),e);
  await form('nom','Boulangerie « Au Fournil » & fils <b>x</b>'); await form('email','a b@c'); await form('cp','1700'); await X.clic(c,f,'.nv-client [data-ok]'); await p.waitForTimeout(300); e=await erreurs(); console.log('  e-mail et code postal faux →',JSON.stringify(e));
  v(`${tag} · e-mail faux ET code postal faux : deux refus dits`,e.length>=2,e);
  await form('email','boulangerie@fournil.fr'); await form('cp','17000'); await form('ville','La Rochelle'); await form('adresse','3 rue du Palais'); await form('tel','05 46 11 22 33');
  await f.locator('.nv-client [name="pro"]').evaluate(x=>x.click());
  await X.clic(c,f,'.nv-client [data-ok]'); await p.waitForTimeout(1000);
  const sel=await f.evaluate(()=>({res:(document.querySelector('#vv-r-client')||{}).textContent,form:!!document.querySelector('.nv-client')}));
  v(`${tag} · le client créé est choisi dans le compositeur (« ${sel.res} »)`,/Fournil/.test(sel.res||'')&&!sel.form,sel);
  await X.clic(c,f,'[data-vv="art-add"][data-id="EL-ALL"]'); await f.locator('#vv-objet').fill('Test client neuf'); await L.calme(p,500);
  await X.clic(c,f,'[data-act="vierge-creer"]:visible'); await p.waitForTimeout(1300);
  await X.clic(c,f,'[data-act="retour"]:visible'); await p.waitForTimeout(1200); await L.calme(p,500);
  const n1=await p.evaluate(()=>Object.keys(CLIENTS).length); const k=await p.evaluate(()=>{ const e=Object.entries(CLIENTS).find(([id,x])=>/Fournil/.test(x.nom)); return e?{id:e[0],nom:e[1].nom,type:e[1].type,mail:e[1].mail,tel:e[1].tel,adr:e[1].adr}:null; });
  console.log('  client côté OP GESTION :',JSON.stringify(k));
  v(`${tag} · le client créé existe dans OP GESTION (${n0} → ${n1}), avec son e-mail, son téléphone et son adresse`,n1===n0+1&&k&&k.mail==='boulangerie@fournil.fr'&&/05 46 11 22 33/.test(k.tel)&&/Palais/.test(k.adr)&&k.type==='pro',k);
  await L.aller(p,'clients'); const lst=await p.evaluate(()=>document.querySelector('#contenu').innerText);
  v(`${tag} · il paraît dans la page Clients`,/Fournil/.test(lst));
  await L.capture(c,CAP+tag+'-clients.png');
  if(k){ await L.aller(p,'client-x-'+k.id); const fiche=await p.evaluate(()=>document.querySelector('#contenu').innerText.replace(/\s+/g,' ')); const gras=await p.evaluate(()=>[...document.querySelectorAll('#contenu b, #contenu i, #contenu script, #contenu img')].some(e=>e.textContent==='x'||e.tagName==='SCRIPT'||e.tagName==='IMG'&&!e.closest('.avatar,.logo')&&/onerror/.test(e.outerHTML)));
    // Depuis l'audit de sécurité (R13, « Sécurité étape 8 » : « sans balise ni formule ») le nom tapé passe par la fonction d'entrée, qui ôte < et > : « <b>x</b> » devient « bx/b ». La promesse gardée est la même (un nom à signes HTML ne devient JAMAIS du code), vérifiée sur le DOM et non plus sur le texte brut.
    v(`${tag} · sa fiche s'ouvre, le nom à signes HTML reste du texte (aucune balise créée, rien d'exécutable)`,/Au Fournil/.test(fiche)&&!gras&&!/<b>|<\/b>/.test(fiche),fiche.slice(0,160)); await L.capture(c,CAP+tag+'-fiche.png'); }
  // 2. doublon : même nom et même e-mail qu'un client existant
  await L.aller(p,'devis'); f=await A.ouvrirAtelier(c,'devis',null); await L.calme(p,900); await ouvrir();
  await form('nom','Restaurant Le Vieux Port'); await form('email','marc@vieuxport.fr'); await form('tel','06 12 34 56 78'); await X.clic(c,f,'.nv-client [data-ok]'); await p.waitForTimeout(900);
  const n2=await p.evaluate(()=>Object.keys(CLIENTS).length); const dial=await f.evaluate(()=>(document.querySelector('.dialogue, .nv-client .alerte, .nv-client .fen-note')||{}).textContent||'');
  console.log('  doublon : clients',n1,'→',n2,'· message :',JSON.stringify(dial));
  const apres=await p.evaluate(()=>Object.keys(CLIENTS).length);
  v(`${tag} · un client qui a le même nom et le même e-mail qu'un existant est signalé (« Devis rapide » le fait : « Ce client existe peut-être déjà »)`,/existe|déjà|doublon/i.test(dial)||apres===n1,[n1,apres,dial]);
  await p.keyboard.press('Escape'); await p.waitForTimeout(500); await p.keyboard.press('Escape'); await p.waitForTimeout(500); if(await f.locator('.dialogue').count()){ await X.clic(c,f,'.dialogue button[data-r="1"]'); await p.waitForTimeout(800); }
  v(`${tag} · aucune erreur JavaScript`,c.err.length===0,c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan()?1:0);
})().catch(e=>{console.log('ERREUR SONDE',e.message.slice(0,700));process.exit(2);});

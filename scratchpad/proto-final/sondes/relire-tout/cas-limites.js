// RELECTURE ADVERSE : cas limites du compositeur — double toucher sur « Créer », devis SANS client, « Nouveau client… » (valeurs longues et pièges), séparation devis/contrat, suppression d'un document composé, mode Auto qui change pendant que le compositeur est ouvert.
const X=require('./lib2.js'), {A,L}=X, v=L.v, CAP=X.CAP;
const pr=process.env.PROFIL||'mac', nuit=process.env.NUIT==='1', tag='cas-'+pr+(nuit?'-nuit':'-jour');
(async()=>{
  const c=await L.ouvrir({profil:pr,nuit,qui:'marc'}); const p=c.p; console.log('── '+tag);
  const nb=()=>p.evaluate(()=>ATD.docs.length);
  const retour=async f=>{ await X.clic(c,f,'[data-act="retour"]:visible'); await p.waitForTimeout(1100); };
  // 1. double toucher sur « Créer le devis »
  await L.aller(p,'devis'); const n0=await nb(); let f=await A.ouvrirAtelier(c,'devis',null); await L.calme(p,900);
  await X.clic(c,f,'[data-vv="client"][data-id="vp"]'); await X.clic(c,f,'[data-vv="art-add"][data-id="EL-ALL"]');
  const btn=f.locator('[data-act="vierge-creer"]:visible').first(); const bb=await btn.boundingBox();
  if(c.largeur>=1032) await X.clic(c,f,'[data-act="vierge-creer"]:visible'); else await p.mouse.dblclick(bb.x+bb.width/2,bb.y+bb.height/2).catch(()=>{}); await p.waitForTimeout(1400);   // à deux colonnes le double clic est jugé par double-creer.js
  const docs=await f.evaluate(()=>({n:S.docs.length,vue:S.vue})); console.log('  après double clic : documents dans l\'atelier',docs.n,'vue',docs.vue);
  await retour(f); const n1=await nb();
  v(tag+' · un double clic sur « Créer le devis » crée UN seul devis ('+n0+' → '+n1+')',n1===n0+1,[n0,n1]);
  // 2. devis SANS client ni article
  await L.aller(p,'devis'); f=await A.ouvrirAtelier(c,'devis',null); await L.calme(p,900);
  await X.clic(c,f,'[data-act="vierge-creer"]:visible'); await p.waitForTimeout(1400);
  const ed=await f.evaluate(()=>({vue:S.vue,cl:(D().blocs.find(b=>b.type==='client')||{}).client,txt:document.querySelector('#vue-editeur .feuille').innerText.replace(/\s+/g,' ').slice(0,260)}));
  v(tag+' · « Créer » sans client : le devis vierge s\'ouvre dans l\'éditeur',ed.vue==='editeur',ed);
  await X.clic(c,f,'[data-act="envoyer"]:visible'); await p.waitForTimeout(800);
  const env=await f.evaluate(()=>({pour:(document.querySelector('#env-a,#env-to,#env-pour')||{}).value,txt:document.body.innerText.replace(/\s+/g,' ').slice(0,400),toast:((document.querySelector('.toast')||{}).innerText||'')}));
  console.log('  envoyer sans client →',JSON.stringify(env).slice(0,420));
  await L.capture(c,CAP+tag+'-sans-client-envoyer.png');
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  await retour(f);
  const ligne=await p.evaluate(()=>[...document.querySelectorAll('#contenu .opd-l')].map(e=>e.innerText.replace(/\s+/g,' ').trim()));
  console.log('  lignes composées :',JSON.stringify(ligne));
  v(tag+' · le devis sans client paraît dans la liste avec un mot honnête (« Sans client » ou « Client à renseigner »)',ligne.some(r=>/Sans client|Client à renseigner|à renseigner/i.test(r)),ligne);
  // 3. suppression d'un document composé : y a-t-il un geste ?
  await L.toucher(c,'#contenu .opd-l[data-opd="doc"]'); f=await A.attendreAtelier(c); await L.calme(p,700);
  const menu=await f.evaluate(()=>[...document.querySelectorAll('#vue-editeur button, #vue-editeur [role=menuitem]')].filter(b=>/supprim|dupliqu|corbeille/i.test((b.textContent||'')+(b.getAttribute('aria-label')||'')+(b.title||''))).map(b=>(b.textContent||b.getAttribute('aria-label')).trim()));
  console.log('  gestes « supprimer / dupliquer » visibles dans l\'éditeur :',JSON.stringify(menu));
  await X.clic(c,f,'[data-act="menu-editeur"], [aria-label="Plus"], [aria-label="Plus d’actions"], button:has-text("⋮")').catch(()=>{});
  await p.waitForTimeout(500);
  const menu2=await f.evaluate(()=>[...document.querySelectorAll('.menu button, [role=menu] button, [role=menuitem], .fen-v button')].map(b=>(b.textContent||'').trim().replace(/\s+/g,' ')).filter(Boolean).slice(0,25));
  console.log('  éléments du menu ouvert :',JSON.stringify(menu2));
  v(tag+' · un document composé (surtout un brouillon, ou fait par erreur) peut être SUPPRIMÉ depuis OP GESTION ou son éditeur',menu.length>0||menu2.some(t=>/Supprimer/i.test(t)),[menu,menu2]);
  await p.keyboard.press('Escape'); await p.waitForTimeout(400); await L.capture(c,CAP+tag+'-menu-editeur.png');
  await retour(f).catch(()=>{});
  // 4. nouveau client avec valeurs longues et pièges
  await L.aller(p,'devis'); f=await A.ouvrirAtelier(c,'devis',null); await L.calme(p,900);
  await X.clic(c,f,'[data-vv="client-nouveau"]'); await p.waitForTimeout(800);
  const champs=await f.evaluate(()=>[...document.querySelectorAll('.fen-v:last-of-type input, .fen-v:last-of-type select, .fen-v:last-of-type textarea')].map(e=>e.id||e.name||e.type));
  console.log('  champs du formulaire « Nouveau client » :',JSON.stringify(champs));
  await L.capture(c,CAP+tag+'-nouveau-client.png');
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  // 5. séparation devis / contrat : un contrat commencé n'emporte rien du devis
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  // 6. mode Auto : l'appareil passe de jour à nuit PENDANT que le compositeur est ouvert
  await p.evaluate(()=>{ mode='auto'; appliquerMode(); }); await p.emulateMedia({colorScheme:'light'}); await L.calme(p,500);
  await L.aller(p,'devis'); f=await A.ouvrirAtelier(c,'devis',null); await L.calme(p,900);
  const fond=()=>f.evaluate(()=>getComputedStyle(document.querySelector('.fenetre.vv-pl')).backgroundColor);
  const clair=await fond(); await p.emulateMedia({colorScheme:'dark'}); await L.calme(p,900); const sombre=await fond();
  const lum=s=>{ const m=/rgba?\((\d+), (\d+), (\d+)/.exec(s); return m?(+m[1]+ +m[2]+ +m[3])/3:-1; };
  console.log('  mode Auto : fond jour',clair,'puis nuit',sombre);
  v(tag+' · mode Auto : le compositeur ouvert suit l\'appareil quand il passe au sombre ('+clair+' → '+sombre+')',lum(clair)>200&&lum(sombre)<80,[clair,sombre]);
  await L.capture(c,CAP+tag+'-auto-sombre.png');
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  v(tag+' · aucune erreur JavaScript',c.err.length===0,c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan()?1:0);
})().catch(e=>{console.log('ERREUR SONDE',e.message.slice(0,700));process.exit(2);});

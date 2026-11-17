// RELECTURE ADVERSE : les gestes du compositeur de CONTRAT — modèles (changer de modèle avec des articles déjà posés), bibliothèque (ajouter / retirer), « Modifier le texte », monter / descendre / retirer, suggestions, date, prix invalide.
const X=require('./lib2.js'), {A,L}=X, v=L.v, CAP=X.CAP;
const pr=process.env.PROFIL||'mac', nuit=process.env.NUIT==='1', tag='cgestes-'+pr+(nuit?'-nuit':'-jour');
(async()=>{
  const c=await L.ouvrir({profil:pr,nuit,qui:'marc'}); const p=c.p, deux=c.largeur>=1032; console.log('── '+tag);
  await L.aller(p,'contrats'); const f=await A.ouvrirAtelier(c,'contrat',null); await L.calme(p,900);
  const clic=s=>X.clic(c,f,s);
  const nbArt=()=>f.locator('#vv-lig li.vv-a').count();
  const titres=()=>f.evaluate(()=>[...document.querySelectorAll('#vv-lig li.vv-a .vv-a-t b')].map(b=>b.textContent.trim()));
  const page=async()=>{ if(!deux&&!(await f.locator('.vv-grand-plein:visible').count())){ await clic('[data-vv="grand"]'); await L.calme(p,500);} const t=await f.evaluate(()=>[...document.querySelectorAll('.vv-grand-plein .feuille, .vv-ap-sc .feuille')].filter(e=>e.getBoundingClientRect().width>0).map(e=>e.innerText.replace(/\s+/g,' ')).join(' ¶ ')); if(!deux&&await f.locator('[data-vv="grand-x"]:visible').count()){ await clic('[data-vv="grand-x"]'); await L.calme(p,400);} return t; };
  await clic('[data-vv="client"][data-id="mi"]');
  // 1. modèles
  for(const [m,mini] of [['part',3],['pro',3],['pac',3]]){ await clic(`[data-vv="tpl"][data-v="${m}"]`); await p.waitForTimeout(350); const n=await nbArt(); v(`${tag} · modèle « ${m} » : ${n} articles`,n>=mini,await titres()); }
  await clic('[data-vv="tpl"][data-v="part"]'); await p.waitForTimeout(300); const n11=await nbArt();
  // article personnel
  await clic('[data-vv="ecrire-ouvrir"]'); await f.locator('#vv-e-titre').fill('Mon article à moi'); await f.locator('#vv-e-texte').fill('Texte écrit à la main.'); await clic('[data-vv="ecrire-ajouter"]'); await p.waitForTimeout(400);
  const n12=await nbArt(); v(`${tag} · mon article s'ajoute (${n11} → ${n12})`,n12===n11+1);
  // changer de modèle PAR-DESSUS : que devient mon article ?
  await clic('[data-vv="tpl"][data-v="pro"]'); await p.waitForTimeout(500);
  const tt=await titres(); const dial=await f.evaluate(()=>!!document.querySelector('.dialogue')); const txtD=dial?await f.evaluate(()=>document.querySelector('.dialogue').innerText.replace(/\s+/g,' ')):'';
  console.log('  changer de modèle avec un article à moi : confirmation ?',dial,txtD,'· articles après :',tt.length,'· le mien est encore là :',tt.includes('Mon article à moi'));
  v(`${tag} · changer de modèle ne PERD pas l'article écrit à la main sans le dire (gardé, ou confirmation)`,tt.includes('Mon article à moi')||dial,[tt.length,dial,txtD]);
  if(dial) await clic('.dialogue button[data-r="0"]');
  // 2. bibliothèque : ajouter, retirer
  await f.locator('#vv-bq').fill('assurance'); await p.waitForTimeout(300);
  const b0=await f.locator('[data-vv="bib"]:visible').count(); console.log('  articles « assurance » :',b0);
  const av=await nbArt(); const prem=f.locator('[data-vv="bib"]:visible').first(); const etait=await prem.getAttribute('aria-pressed');
  await prem.click().catch(async()=>{await prem.tap();}); await p.waitForTimeout(350); const ap1=await nbArt();
  await prem.click().catch(async()=>{await prem.tap();}); await p.waitForTimeout(350); const ap2=await nbArt();
  v(`${tag} · un article de la bibliothèque : un toucher l'ajoute/retire (${av} → ${ap1}), un second fait l'inverse (${ap2})`,ap1!==av&&ap2===av,[av,ap1,ap2,etait]);
  await f.locator('#vv-bq').fill(''); await p.waitForTimeout(250);
  // 3. modifier le texte
  await f.locator('[data-vv="a-edit"]').first().evaluate(e=>e.scrollIntoView({block:'center'})); await clic('[data-vv="a-edit"]'); await p.waitForTimeout(400);
  const ta=await f.evaluate(()=>{ const e=document.querySelector('#vv-lig textarea, #vv-lig [contenteditable]'); return e?{tag:e.tagName,val:(e.value||e.innerText||'').slice(0,60)}:null; });
  console.log('  « Modifier le texte » ouvre :',JSON.stringify(ta));
  v(`${tag} · « Modifier le texte » ouvre une zone de saisie`,!!ta,ta);
  if(ta){ await f.locator('#vv-lig textarea').first().fill('TEXTE MODIFIÉ PAR MOI {{prix}} € par an.'); await p.waitForTimeout(500);
    const t1=await page(); v(`${tag} · le texte modifié paraît sur la page, la variable {{prix}} remplacée`,/TEXTE MODIFIÉ PAR MOI/.test(t1)&&!/\{\{prix\}\}/.test(t1),t1.slice(t1.indexOf('TEXTE')-60,t1.indexOf('TEXTE')+120));
    const modif=await f.evaluate(()=>[...document.querySelectorAll('#vv-lig .vv-opt-b')].map(e=>e.textContent.trim())); v(`${tag} · l'article porte la pastille « Modifié »`,modif.some(t=>/Modifié/.test(t)),modif); }
  // 4. monter / descendre / retirer
  const T0=await titres(); await clic('[data-vv="a-down"]:not([disabled])'); await p.waitForTimeout(300); const T1=await titres();
  v(`${tag} · « Descendre » échange les deux premiers articles`,T1[0]===T0[1]&&T1[1]===T0[0],[T0.slice(0,2),T1.slice(0,2)]);
  const T1b=T1.length; await clic('[data-vv="a-del"]'); await p.waitForTimeout(350); const T2=await titres();
  v(`${tag} · « Retirer » enlève un article (${T1b} → ${T2.length})`,T2.length===T1b-1,T2);
  // 5. suggestions, date, prix invalide
  await clic('[data-vv="sug"][data-k="frequence"][data-i="1"]'); const fr=await f.locator('#vv-v-frequence').inputValue(); v(`${tag} · une suggestion remplit le champ (« ${fr} »)`,/2 visites par an/.test(fr),fr);
  await f.locator('#vv-v-debut').fill('2026-11-02'); await f.locator('#vv-v-prix').fill('abc'); await f.locator('#vv-v-prix').press('Tab'); await p.waitForTimeout(300);
  const er=await f.evaluate(()=>(document.querySelector('#vv-ve-prix')||{}).textContent); v(`${tag} · prix « abc » : refus dit (« ${er} »)`,!!er&&er.trim().length>3,er);
  await clic('[data-act="vierge-creer"]:visible'); await p.waitForTimeout(900);
  const crea=await f.evaluate(()=>({editeur:!!document.querySelector('#vue-editeur:not([hidden])'),foc:document.activeElement&&document.activeElement.id}));
  v(`${tag} · « Créer le contrat » avec un prix invalide : rien n'est créé, le champ fautif prend la main`,!crea.editeur&&/vv-v-prix/.test(crea.foc||''),crea);
  await f.locator('#vv-v-prix').fill('280'); await f.locator('#vv-v-prix').press('Tab'); await p.waitForTimeout(300);
  const t3=await page(); v(`${tag} · la date « 2026-11-02 » se lit « 2 novembre 2026 » dans le contrat`,/2 novembre 2026/.test(t3),(t3.match(/commence le[^.]*\./)||[''])[0]);
  await L.capture(c,CAP+`${tag}-fin.png`);
  v(`${tag} · aucune erreur JavaScript`,c.err.length===0,c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan()?1:0);
})().catch(e=>{console.log('ERREUR SONDE',e.message.slice(0,700));process.exit(2);});

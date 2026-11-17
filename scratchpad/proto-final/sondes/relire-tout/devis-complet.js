// RELECTURE ADVERSE du compositeur de devis, de bout en bout (relire-compositeur-tout). PROFIL=mac NUIT=0|1 QUI=marc|julie
const X=require('./lib2.js'), {A,L}=X, CAP=X.CAP, v=L.v;
const pr=process.env.PROFIL||'mac', nuit=process.env.NUIT==='1', qui=process.env.QUI||'marc', tag=pr+(nuit?'-nuit':'-jour')+'-'+qui;
const eur=n=>(n/100).toFixed(2).replace('.',',');
const cents=L.cents;
function calc(lignes,acPct){ const par={}; let ht=0; lignes.forEach(l=>{ const h=Math.round(l.qte*l.pu*100*(1-(l.rem||0)/100)); l.h=h; ht+=h; par[l.tva]=(par[l.tva]||0)+h; });
  let tva=0; Object.keys(par).forEach(t=>{tva+=Math.round(par[t]*(+t)/100);}); const ttc=ht+tva; const ac=Math.round(ttc*acPct/100); return {ht,tva,ttc,ac,reste:ttc-ac}; }
const lire=(txt,re)=>{ const m=re.exec(txt); return m?cents(m[1]):null; };
(async()=>{
  const c=await L.ouvrir({profil:pr,nuit,qui}); const p=c.p, W=c.largeur;
  const deux=W>=1032;
  console.log('── '+tag);
  await L.aller(p,'devis');
  const f=await A.ouvrirAtelier(c,'devis',null); v(tag+' · le compositeur s\'ouvre par « Composer un devis »',!!f); if(!f){ await L.fin(c); await L.fermer(); process.exit(L.bilan()?1:1); }
  await L.calme(p,1000);
  const clic=(s)=>X.clic(c,f,s);
  const apercuBtn=async()=>{ if(!deux){ if(await f.locator('.vv-ap-sc:visible').count()===0){ await clic('[data-vv="grand"]'); await L.calme(p,500);} } };
  const apercuFermer=async()=>{ if(!deux && await f.locator('.vv-ap-sc:visible').count()){ const b=f.locator('.vv-ap-bar [data-vv="retour"], .vv-ap-bar button').first(); } };
  const pageTxt=async()=>{ return f.evaluate(()=>{ const fs=[...document.querySelectorAll('.vv-grand-plein .feuille, .vv-ap-sc .feuille')].filter(e=>e.getBoundingClientRect().width>0); return fs.length?fs[0].innerText.replace(/\s+/g,' '):''; }); };
  const entete=()=>f.evaluate(()=>((document.querySelector('.vv-pied-tot')||{}).innerText||'').replace(/\s+/g,' '));
  // client par la recherche
  await f.locator('#vv-q').fill('vieux'); await p.waitForTimeout(300);
  const nbCli=await f.locator('[data-vv="client"]:visible').count();
  v(tag+' · la recherche « vieux » ne laisse que le bon client (+ « Sans client »)',nbCli<=2,nbCli);
  await clic('[data-vv="client"][data-id="vp"]'); await f.locator('#vv-objet').fill('Remplacement d’un groupe — « essai » & "guillemets" <b>x</b>'); await p.waitForTimeout(250);
  await clic('[data-vv="art-add"][data-id="VE-DK-35"]'); await clic('[data-vv="art-plus"][data-id="VE-DK-35"]'); await clic('[data-vv="art-plus"][data-id="VE-DK-35"]');
  await clic('[data-vv="art-add"][data-id="R32"]');
  const q0=f.locator('[data-vv-q]'), p0=f.locator('[data-vv-p]');
  v(tag+' · deux articles dans la liste',(await q0.count())===2,await q0.count());
  // ligne 1 : prix à virgule ; ligne 2 : quantité à virgule
  await p0.nth(0).fill('199,90'); await p0.nth(0).press('Tab'); await q0.nth(1).fill('1,75'); await q0.nth(1).press('Tab'); await p.waitForTimeout(300);
  // ligne libre
  await clic('[data-vv="libre-ouvrir"]'); await f.locator('#vv-l-des').fill('Déplacement'); await f.locator('#vv-l-qte').fill('1,5'); await f.locator('#vv-l-pu').fill('45,90'); await f.locator('#vv-l-tva').selectOption({label:'10 %'});
  await f.locator('#vv-l-unite').selectOption({label:'h'}).catch(()=>{});
  await clic('[data-vv="libre-ajouter"]'); await p.waitForTimeout(400);
  v(tag+' · la ligne libre s\'ajoute (3 lignes)',(await q0.count())===3,await q0.count());
  // acompte autre 25
  await clic('[data-vv="ac"][data-v="autre"]'); await f.locator('#vv-ac-v').fill('25'); await f.locator('#vv-ac-v').press('Tab'); await p.waitForTimeout(300);
  await f.locator('#vv-mot').fill('Merci de votre confiance.'); await p.waitForTimeout(200);
  const lignes=[{qte:3,pu:199.90,tva:20},{qte:1.75,pu:62,tva:20},{qte:1.5,pu:45.90,tva:10}];
  let e=calc(lignes,25);
  await L.calme(p,700);
  const eh=await entete(); const th=cents((/([\d\s  ]+,\d\d)\s*€/.exec(eh)||[])[1]);
  v(tag+' · total du bandeau = '+eur(e.ttc)+' € (recalculé à la main)',th===e.ttc,[eh,e.ttc]);
  await apercuBtn(); await L.calme(p,500);
  const t1=await pageTxt();
  v(tag+' · la page : Total HT '+eur(e.ht),lire(t1,/Total HT\s*([\d\s  ]+,\d\d)/)===e.ht,t1.slice(t1.indexOf('Total HT'),t1.indexOf('Total HT')+200));
  v(tag+' · la page : Total TTC '+eur(e.ttc),lire(t1,/Total TTC\s*([\d\s  ]+,\d\d)/)===e.ttc);
  v(tag+' · la page : acompte 25 % '+eur(e.ac)+' et reste '+eur(e.reste),lire(t1,/Acompte à la commande \(25 %\)\s*([\d\s  ]+,\d\d)/)===e.ac && lire(t1,/Reste à payer\s*([\d\s  ]+,\d\d)/)===e.reste,t1.slice(t1.indexOf('Acompte à la commande')));
  v(tag+' · l\'objet saisi avec des signes HTML reste du TEXTE sur la page',/<b>x<\/b>/.test(t1) && !(await f.evaluate(()=>[...document.querySelectorAll('.vv-grand-plein .feuille b, .vv-ap-sc .feuille b')].some(b=>b.textContent==='x'))),t1.slice(t1.indexOf('Objet'),t1.indexOf('Objet')+120));
  await L.capture(c,CAP+`devis-${tag}-1-composition.png`);

  if(!deux){ await f.evaluate(()=>{}); }
  // CRÉER
  const btnCreer=f.locator('[data-act="vierge-creer"]:visible').first();
  if(!deux && await f.locator('[data-vv="grand-x"]:visible').count()){ /* l'aperçu plein écran est ouvert : on le ferme par son bouton */ await clic('[data-vv="grand-x"]'); await L.calme(p,500); }
  await btnCreer.click({timeout:5000}).catch(async()=>{ await btnCreer.tap({timeout:5000}); }); await p.waitForTimeout(1500);
  v(tag+' · « Créer le devis » ouvre l\'éditeur',await f.evaluate(()=>!!document.querySelector('#vue-editeur:not([hidden])')));
  await L.capture(c,CAP+`devis-${tag}-2-editeur.png`);
  const ed=await f.evaluate(()=>document.querySelector('#vue-editeur .feuille').innerText.replace(/\s+/g,' '));
  v(tag+' · l\'éditeur montre le même Total TTC '+eur(e.ttc),lire(ed,/Total TTC\s*([\d\s  ]+,\d\d)/)===e.ttc,ed.slice(ed.indexOf('Total HT')));
  const numero=(/D-\d{4}-\d{3}/.exec(ed)||[])[0]; console.log('numéro',numero);
  // REMISE dans l'éditeur : 10 % sur la première ligne
  const rem=f.locator('#vue-editeur .feuille tr:has-text("Remplacement"), #vue-editeur .feuille tr').filter({hasText:/Ventilateur/}).first().locator('div.ed.une').nth(3);
  if(c.doigt) await rem.tap(); else await rem.click(); await p.waitForTimeout(700);
  if(await f.locator('.fenetre:has-text("Ligne de prix")').count()){ await f.getByLabel('Remise (%)').fill('10'); await clic('.fenetre:has-text("Ligne de prix") button:has-text("Enregistrer")'); await p.waitForTimeout(700); }
  else { await p.keyboard.type('10'); await p.keyboard.press('Tab'); await p.waitForTimeout(600); }
  lignes[0].rem=10; e=calc(lignes,25);
  const ed2=await f.evaluate(()=>document.querySelector('#vue-editeur .feuille').innerText.replace(/\s+/g,' '));
  v(tag+' · remise 10 % sur la ligne 1 : Total HT '+eur(e.ht)+', TTC '+eur(e.ttc),lire(ed2,/Total HT\s*([\d\s  ]+,\d\d)/)===e.ht && lire(ed2,/Total TTC\s*([\d\s  ]+,\d\d)/)===e.ttc,ed2.slice(ed2.indexOf('Désignation'),ed2.indexOf('Désignation')+600));
  v(tag+' · l\'acompte suit : '+eur(e.ac)+' / reste '+eur(e.reste),lire(ed2,/Acompte à la commande \(25 %\)\s*([\d\s  ]+,\d\d)/)===e.ac && lire(ed2,/Reste à payer\s*([\d\s  ]+,\d\d)/)===e.reste);
  await L.capture(c,CAP+`devis-${tag}-3-remise.png`);
  // ENVOYER
  await X.clic(c,f,'[data-act="envoyer"]:visible'); await p.waitForTimeout(700);
  await X.clic(c,f,'[data-act="env-go"]:visible'); await p.waitForTimeout(1200);
  v(tag+' · après l\'envoi la pastille dit « Envoyé »',/Envoyé/.test(await f.evaluate(()=>document.querySelector('#vue-editeur').innerText.slice(0,200))));
  // RETOUR
  await X.clic(c,f,'[data-act="retour"]:visible'); await p.waitForTimeout(1200);
  v(tag+' · « ‹ OP GESTION » ferme l\'atelier (plus de cadre visible)',await p.evaluate(()=>{const z=document.getElementById('opdz'); return !z||z.hidden||getComputedStyle(z).visibility==='hidden';}),await L.etat(p));
  await L.calme(p,600);
  // LISTE : retrouver
  await L.toucher(c,'[data-onglet="attente"], button:has-text("En attente")'); await L.calme(p,500);
  const lst=await p.evaluate(()=>document.querySelector('#contenu').innerText.replace(/\s+/g,' '));
  await L.capture(c,CAP+`devis-${tag}-4-liste.png`);
  v(tag+' · le devis envoyé est dans « En attente » avec son numéro et son TTC '+eur(e.ttc),lst.includes(numero)&&lst.replace(/[\s  ]/g,'').includes(eur(e.ttc).replace(/\s/g,'')+'€'),lst.slice(lst.indexOf('Composés')>=0?lst.indexOf('Composés'):0,(lst.indexOf('Composés')>=0?lst.indexOf('Composés'):0)+500));
  // ROUVRIR
  const ligne=p.locator('#contenu').getByText(numero).first(); await ligne.click().catch(async()=>{await ligne.tap();}); await p.waitForTimeout(1500);
  const f2=A.cadre(p); const ed3=f2?await f2.evaluate(()=>(document.querySelector('#vue-editeur .feuille')||{innerText:''}).innerText.replace(/\s+/g,' ')):'';
  v(tag+' · toucher la ligne rouvre le MÊME devis (TTC '+eur(e.ttc)+', remise gardée)',lire(ed3,/Total TTC\s*([\d\s  ]+,\d\d)/)===e.ttc && ed3.includes(numero),ed3.slice(0,200));
  await L.capture(c,CAP+`devis-${tag}-5-rouvert.png`);
  console.log('erreurs page',JSON.stringify(c.err));
  v(tag+' · aucune erreur JavaScript',c.err.length===0,c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan()?1:0);
})().catch(e=>{console.log('ERREUR SONDE',e.message);process.exit(2);});

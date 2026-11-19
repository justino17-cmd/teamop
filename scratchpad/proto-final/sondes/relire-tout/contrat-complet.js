// RELECTURE ADVERSE du compositeur de CONTRAT, de bout en bout. PROFIL=mac NUIT=0|1 QUI=marc
const X=require('./lib2.js'), {A,L}=X, CAP=X.CAP, v=L.v, cents=L.cents;
const pr=process.env.PROFIL||'mac', nuit=process.env.NUIT==='1', qui=process.env.QUI||'marc', tag='ct-'+pr+(nuit?'-nuit':'-jour')+'-'+qui;
(async()=>{
  const c=await L.ouvrir({profil:pr,nuit,qui}); const p=c.p, W=c.largeur, deux=W>=1032;
  console.log('── '+tag);
  await L.aller(p,'contrats');
  const kp=()=>p.evaluate(()=>[...document.querySelectorAll('#contenu .kpis .kpi')].map(k=>k.innerText.replace(/\s+/g,' ').trim()));
  const k0=await kp(); v(tag+' · population : quatre chiffres',k0.length===4,k0);
  const max=await p.evaluate(()=>Math.max(...CONTRATS.map(k=>+k.num.slice(9))));
  const f=await A.ouvrirAtelier(c,'contrat',null); v(tag+' · le compositeur de contrat s\'ouvre',!!f); if(!f){ await L.fin(c); await L.fermer(); process.exit(1); }
  await L.calme(p,1000);
  const clic=s=>X.clic(c,f,s);
  const pageTxt=()=>f.evaluate(()=>{ const fs=[...document.querySelectorAll('.vv-grand-plein .feuille, .vv-ap-sc .feuille')].filter(e=>e.getBoundingClientRect().width>0); return fs.map(x=>x.innerText.replace(/\s+/g,' ')).join(' ¶ '); });
  if(!deux){ /* l'aperçu s'ouvrira plus tard */ }
  await f.locator('#vv-q').fill('mimosas'); await p.waitForTimeout(250);
  await clic('[data-vv="client"][data-id="mi"]');
  await f.locator('#vv-titre').fill('Entretien annuel — « Les Mimosas » & <i>cie</i>');
  await f.locator('#vv-v-prix').fill('280,50'); await f.locator('#vv-v-prix').press('Tab');
  await f.locator('#vv-v-adresse').fill('21 bd Joffre, 17000 La Rochelle'); await f.locator('#vv-v-prestation').fill('l’entretien de 12 climatiseurs');
  await f.locator('#vv-v-frequence').fill('4 visites par an'); await f.locator('#vv-v-duree').fill('1 an'); await f.locator('#vv-v-debut').fill('2026-11-02'); await f.locator('#vv-v-paiement').fill('par prélèvement');
  await p.waitForTimeout(300);
  await clic('[data-vv="tpl"][data-v="part"]'); await p.waitForTimeout(400);
  const nbModele=await f.locator('#vv-lig li.vv-a').count(); v(tag+' · le modèle « particulier » pose des articles ('+nbModele+')',nbModele>=3,nbModele);
  // un article de la bibliothèque, par la recherche
  await f.locator('#vv-bq').fill('résil'); await p.waitForTimeout(300);
  const trouves=await f.locator('[data-vv="bib"]:visible').count(); console.log('articles trouvés pour « résil » :',trouves);
  v(tag+' · la recherche « résil » trouve un article de la bibliothèque',trouves>=1,trouves);
  const avant=await f.locator('#vv-lig li.vv-a').count();
  const pris=await f.locator('[data-vv="bib"][aria-pressed="false"]:visible').count();
  if(pris){ await clic('[data-vv="bib"][aria-pressed="false"]'); await p.waitForTimeout(300); v(tag+' · un article de plus dans « Mes articles »',(await f.locator('#vv-lig li.vv-a').count())===avant+1,[avant]); }
  // écrire mon article avec des variables
  await clic('[data-vv="ecrire-ouvrir"]'); await f.locator('#vv-e-titre').fill('Accès au site'); await f.locator('#vv-e-texte').fill('Le prestataire intervient sur {{adresse}} pour {{prestation}}, au prix de {{prix}} € par an.'); await clic('[data-vv="ecrire-ajouter"]'); await p.waitForTimeout(400);
  v(tag+' · « Écrire mon article » ajoute l\'article',(await f.locator('#vv-lig li.vv-a').count())===avant+(pris?2:1));
  await L.calme(p,600);
  if(!deux){ await clic('[data-vv="grand"]'); await L.calme(p,600); }
  const t1=await pageTxt();
  v(tag+' · la page : le prix « 280,50 € » (virgule gardée) et aucune accolade {{ }} restante',/280,50\s?€/.test(t1) && !/\{\{|\}\}/.test(t1),(t1.match(/.{40}280.{40}/)||[t1.slice(0,100)])[0]);
  v(tag+' · la page : le client « Copropriété Les Mimosas », l\'adresse du site et la prestation sont posés dans « Accès au site »',/Les Mimosas/.test(t1)&&/21 bd Joffre/.test(t1)&&/12 climatiseurs/.test(t1));
  console.log('  · le titre saisi paraît-il sur la page du contrat ?',/Entretien annuel/.test(t1));
  await L.capture(c,CAP+`contrat-${tag}-1-composition.png`);
  if(!deux) await clic('[data-vv="grand-x"]');
  await L.calme(p,400);
  await clic('[data-act="vierge-creer"]:visible'); await p.waitForTimeout(1500);
  const d=await f.evaluate(()=>({vue:S.vue,t:D().type,num:D().meta.numero,prix:D().vars.prix,cl:(D().blocs.find(b=>b.type==='client')||{}).client,arts:D().blocs.filter(b=>b.type==='article').length,txt:document.querySelector('#vue-editeur .feuille').innerText.replace(/\s+/g,' ')}));
  v(tag+' · l\'éditeur s\'ouvre sur un contrat avec ses articles',d.vue==='editeur'&&d.t==='contrat'&&d.arts>=4,[d.vue,d.t,d.arts]);
  v(tag+' · le prix annuel 280,50 € est rangé au centime (28050)',d.prix===28050,d.prix);
  v(tag+' · le numéro suit la série : CTR-2026-'+String(max+1).padStart(3,'0'),d.num==='CTR-2026-'+String(max+1).padStart(3,'0'),d.num);
  v(tag+' · le client est « mi »',d.cl&&d.cl.id==='mi');
  v(tag+' · l\'éditeur montre « 280,50 € »',/280,50\s?€/.test(d.txt));
  await L.capture(c,CAP+`contrat-${tag}-2-editeur.png`);
  // envoyer (au téléphone la feuille « Contrat » s'ouvre d'elle-même après la création : on la ferme par son bouton « Terminé »)
  if(await f.locator('.fen-v.souple button:has-text("Terminé")').count()){ await clic('.fen-v.souple button:has-text("Terminé")'); await p.waitForTimeout(500); }
  await clic('[data-act="envoyer"]:visible'); await p.waitForTimeout(600);
  await clic('[data-act="env-go"]:visible'); await p.waitForTimeout(1300);
  const et=await f.evaluate(()=>D().etat); v(tag+' · l\'envoi passe le contrat en attente',/^(envoye|attente)$/.test(et),et);
  await clic('[data-act="retour"]:visible'); await p.waitForTimeout(1200);
  v(tag+' · retour : l\'atelier est fermé',(await L.etat(p)).atelier===false,await L.etat(p));
  await L.calme(p,500);
  const rows=await p.evaluate(()=>[...document.querySelectorAll('#contenu .opd-l')].map(e=>e.innerText.replace(/\s+/g,' ').trim()));
  const k1=await kp();
  v(tag+' · « Contrats composés » : une ligne avec numéro, client, titre, prix par an, état',rows.length>=1&&/CTR-2026-\d{3}/.test(rows[0])&&/Les Mimosas/.test(rows[0])&&/280,50/.test(rows[0])&&/par an/.test(rows[0]),rows);
  v(tag+' · chiffre « en attente de signature » +1',parseInt(k1[3].replace(/\s/g,''),10)===parseInt(k0[3].replace(/\s/g,''),10)+1,[k0,k1]);
  await L.capture(c,CAP+`contrat-${tag}-3-liste.png`);
  // rouvrir
  await L.toucher(c,'#contenu .opd-l[data-opd="doc"]'); const g=await A.attendreAtelier(c);
  const d2=g?await g.evaluate(()=>({n:D().meta.numero,prix:D().vars.prix,etat:D().etat})):null;
  v(tag+' · toucher la ligne rouvre le même contrat',d2&&d2.n===d.num&&d2.prix===28050&&/^(envoye|attente)$/.test(d2.etat),d2);
  v(tag+' · aucune erreur JavaScript',c.err.length===0,c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan()?1:0);
})().catch(e=>{console.log('ERREUR SONDE',e.message.slice(0,400));process.exit(2);});

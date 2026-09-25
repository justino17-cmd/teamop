/* Sonde B3 (v744) : le rapport d'intervention part en VRAI PDF joint — dans la VRAIE page (bêta
   locale, 127.0.0.1). Le PDF fabriqué par la page est ensuite OUVERT par pdf.js (le moteur de
   Firefox, installé dans le scratchpad, hors dépôt) : on ne relit pas notre propre écriture, on
   demande à un lecteur indépendant ce qu'il y trouve, et on rend chaque page en image.
   Seul l'envoi est simulé (srvMail note ce qu'il reçoit) : pas de courriel réel depuis une sonde.
   SOURCE=<bêta d'avant> pour la contre-épreuve (l'ancien bouton n'envoyait que du texte).
   PDFJS=<dossier de pdfjs-dist> (par défaut, celui du scratchpad de la session). */
const path = require('path'), fs = require('fs');
const { ouvrir } = require(path.join(__dirname, 'pilote.js'));
const PDFJS = process.env.PDFJS || '/tmp/claude-0/-home-user-teamop/2b5579ae-09a0-571f-9bc9-ac0e61b4c7de/scratchpad/lecteur-pdf/node_modules/pdfjs-dist';
const SORTIE = process.env.SORTIE || '/tmp/claude-0/-home-user-teamop/2b5579ae-09a0-571f-9bc9-ac0e61b4c7de/scratchpad/rapport-pdf';
let ok = 0, ko = 0; const v = (t, a, b) => { const c = JSON.stringify(a) === JSON.stringify(b); c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → reçu ' + JSON.stringify(a) + ', attendu ' + JSON.stringify(b))); };
(async () => {
  const S = await ouvrir(Object.assign(process.env.SOURCE ? { source: process.env.SOURCE } : {}, { servir: { '/pdfjs/': PDFJS + '/' } }));
  console.log('page mesurée :', S.version);
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); return 1;`);
  await S.ev(`
    db.users=(db.users||[]).filter(u=>u.id!=='u-rp'); db.users.push({id:'u-rp',prenom:'Justin',nom:'Sonde',login:'rp',role:'admin',actif:true,pref:{}});
    db.clients=(db.clients||[]).filter(c=>c.id!=='cli-rp'); db.clients.push({id:'cli-rp',nom:'Boulangerie Élise « Le Fournil »',type:'pro',pro:true,email:'elise@exemple.fr',adresse:'3 rue de l’Église',cp:'17000',ville:'La Rochelle',_m:1});
    db.produits=(db.produits||[]).filter(p=>p.id!=='prd-rp'); db.produits.push({id:'prd-rp',nom:'Brodifacoum pâte 25 ppm',amm:'FR-2019-0042',ref:'BRD-25',unite:'u'});
    db.champsPerso=(db.champsPerso||[]).filter(f=>!/^cp-rp/.test(f.id)); db.champsPerso.push({id:'cp-rp1',label:'Accès au site',type:'texte'},{id:'cp-rp2',label:'Températures relevées',type:'tableau',colonnes:['Pièce','Température']});
    const u=db.users.find(x=>x.id==='u-rp'); currentUser=u; enterApp(u); await new Promise(r=>setTimeout(r,900)); try{ closeModal(true); }catch(e){}
    window.__mails=[]; window.__mailOk=true; window.srvMail=async(to,sub,body,okMsg,cat,box,opts)=>{ __mails.push({to,sub,body,opts:opts||{}}); return __mailOk; };
    window.__wins=[]; window.open=function(){ const w={doc:'',document:{write(s){ w.doc+=s; },close(){}},focus(){},print(){},close(){}}; __wins.push(w); return w; };
    window.confirm=()=>true;
    /* de VRAIES images : deux photos de chantier, un plan, une signature tracée au canevas */
    const img=async(w,h,dessin,type,q)=>{ const cv=document.createElement('canvas'); cv.width=w; cv.height=h; const cx=cv.getContext('2d'); dessin(cx,w,h); return cv.toDataURL(type||'image/jpeg',q||0.85); };
    const photo=(teinte,txt)=>(cx,w,h)=>{ const g=cx.createLinearGradient(0,0,w,h); g.addColorStop(0,'hsl('+teinte+',55%,72%)'); g.addColorStop(1,'hsl('+(teinte+40)+',45%,38%)'); cx.fillStyle=g; cx.fillRect(0,0,w,h);
      for(let k=0;k<30;k++){ cx.fillStyle='rgba(255,255,255,'+(0.05+k%5*0.04)+')'; cx.beginPath(); cx.arc((k*97)%w,(k*53)%h,20+k%7*9,0,7); cx.fill(); } cx.fillStyle='#111'; cx.font='bold '+Math.round(h/9)+'px sans-serif'; cx.fillText(txt,w*0.08,h*0.55); };
    const p1=await img(1600,1200,photo(20,'AVANT — réserve')), p2=await img(900,1200,photo(140,'APRÈS — réserve')), p3=await img(1200,1200,photo(210,'Poste 1'));
    const plan=await img(1400,1000,(cx,w,h)=>{ cx.fillStyle='#f4f6f8'; cx.fillRect(0,0,w,h); cx.strokeStyle='#333'; cx.lineWidth=8; cx.strokeRect(40,40,w-80,h-80); cx.strokeRect(40,40,600,420); cx.strokeRect(640,40,w-680,420); cx.font='48px sans-serif'; cx.fillStyle='#333'; cx.fillText('Cuisine',120,260); cx.fillText('Réserve',800,260); cx.fillText('Boutique',500,760); });
    const sig=await img(600,200,(cx,w,h)=>{ cx.strokeStyle='#123'; cx.lineWidth=5; cx.beginPath(); cx.moveTo(30,150); for(let x=30;x<570;x+=12) cx.lineTo(x,100+Math.sin(x/25)*45); cx.stroke(); },'image/png');
    db.plansSite=db.plansSite||{}; db.plansSite['cli-rp']=[
      {id:'pl-rp-img',nom:'Rez-de-chaussée',mode:'img',img:plan,imgEmp:(typeof papImgEmpCalc==='function'?papImgEmpCalc(plan):''),version:2,rooms:[],historique:[],postes:[{id:'po1',num:1,x:22,y:40,type:'appat',zone:'Réserve'},{id:'po2',num:2,x:60,y:35,type:'piege'},{id:'po3',num:3,x:45,y:75,type:'insecte',zone:'Boutique'}]},
      {id:'pl-rp-rooms',nom:'Cave',mode:'rooms',version:1,historique:[],rooms:[{nom:'Cave à vin',x:.1,y:.1,w:.5,h:.4},{nom:'Chaufferie',x:.6,y:.5,w:.3,h:.3,zoneAlim:false}],postes:[{id:'po4',num:4,x:.3,y:.3,type:'appat'},{id:'po5',num:5,x:.7,y:.6,type:'piege'}]}];
    db.interventions=(db.interventions||[]).filter(i=>i.id!=='int-rp');
    db.interventions.push({id:'int-rp',num:'INT-2026-777',titre:'Passage mensuel — dératisation et désinsectisation de la boulangerie',clientId:'cli-rp',date:todayISO(),heure:'09:30',duree:75,statut:'terminee',techId:'',
      adresse:'3 rue de l’Église, 17000 La Rochelle',type:(PRESTATION_ITEMS[0]||[])[1]||'Dératisation',nuisibles:['Rats','Souris'],methodes:['Appâtage','Piégeage'],
      desc:'Contrôle mensuel des postes et traitement des zones sensibles.',
      compteRendu:'Nous avons contrôlé les 5 postes du site. ⚖️ Consommation importante au poste 1 (réserve) : appât remplacé.\\nTraces de passage le long du quai de livraison : deux pièges mécaniques ajoutés. Aucune trace en boutique.\\n'+'Observation détaillée : '+'le local technique présente une ouverture de 3 cm sous la porte, par laquelle des rongeurs peuvent entrer. '.repeat(6),
      constat:{recommandations:'Colmater l’ouverture sous la porte du local technique (brosse de bas de porte).\\nRanger les palettes à 40 cm des murs.',infestation:'Moyen',indices:['Crottes','Traces de passage']},
      produitsUtilises:[{produitId:'prd-rp',qte:6,unite:'u'},{nomLibre:'Gel anti-blattes',qte:1,unite:'tube'}],
      champs:{'cp-rp1':'Clé chez le gérant, code portail 4521','cp-rp2':[['Chambre froide','3 °C'],['Réserve','19 °C']]},
      relevesPlan:[{posteId:'po1',etat:'consomme',note:'Appât consommé à 80 %, remplacé'},{posteId:'po2',etat:'ras'},{posteId:'po4',etat:'partiel',note:'Traces de dents'},{posteId:'po5',etat:'remplace'}],
      equipements:[{nom:'Pulvérisateur 5 L',reference:'PX-9'}],
      photos:[p1,p2,p3],photoTags:['avant','apres'],
      signature:sig,signatureTech:sig,signatureMeta:{cli:{nom:'Mme Élise Martin',ts:Date.now()},tech:{nom:'Justin Sonde',ts:Date.now()}}});
    save(); return 1;`);

  console.log('\n── 1. la page fabrique le rapport ──');
  const r1 = await S.ev(`
    if(typeof rapportDocument!=='function') return {absent:true};
    const t0=performance.now(); const d=await rapportDocument('int-rp'); const ms=Math.round(performance.now()-t0);
    const i=db.interventions.find(x=>x.id==='int-rp');
    return {err:d.err||'', nom:d.nom||'', ko:Math.round((d.b64||'').length/1024), ms, b64:d.b64||'', manque:d.manque||null,
      constat:rapportConstatLignes(i).map(r=>r[1]), produits:rapportProduitsLibres(i).map(l=>prodLineName(l))};`);
  if (r1.absent) console.log('     ⚠️ rapportDocument absent de cette version');
  console.log(JSON.stringify(Object.assign({}, r1, { b64: (r1.b64 || '').length + ' caractères' })));
  v('un PDF sort, sans erreur', [!!r1.b64, r1.err || ''], [true, '']);
  v('   son nom est propre (ASCII, client et date)', /^Rapport-intervention-Boulangerie-Elise-Le-Fournil-\d{4}-\d{2}-\d{2}\.pdf$/.test(r1.nom || ''), true);
  v('   il tient dans un courriel (moins de 5 000 000 caractères)', (r1.b64 || '').length > 0 && r1.b64.length < 5000000, true);
  v('   rien ne manque (tout était sur l\'appareil)', r1.manque, { photos: 0, plans: 0 });
  console.log('     → ' + r1.ko + ' Ko en base64, fabriqué en ' + r1.ms + ' ms');

  console.log('\n── 2. pdf.js (le moteur de Firefox) ouvre le PDF ──');
  let P = null;
  if (r1.b64) {
    fs.mkdirSync(SORTIE, { recursive: true });
    fs.writeFileSync(path.join(SORTIE, 'rapport.pdf'), Buffer.from(r1.b64, 'base64'));
    const pdfjs = await import(PDFJS + '/legacy/build/pdf.mjs');
    const doc = await pdfjs.getDocument({ data: new Uint8Array(Buffer.from(r1.b64, 'base64')), isEvalSupported: false, disableFontFace: true, verbosity: 0 }).promise;
    const pages = []; let images = 0;
    for (let k = 1; k <= doc.numPages; k++) { const pg = await doc.getPage(k);
      const tc = await pg.getTextContent(); pages.push(tc.items.map(x => x.str).join(' '));
      const opl = await pg.getOperatorList(); images += opl.fnArray.filter(f => f === pdfjs.OPS.paintImageXObject).length; }
    P = { n: doc.numPages, texte: pages.join('\n'), images };
    console.log('     → ' + P.n + ' page(s), ' + P.images + ' image(s) peinte(s)');
  }
  v('pdf.js l\'ouvre, et il a plusieurs pages', !!P && P.n >= 2, true);
  const T = P ? P.texte.replace(/\s+/g, ' ') : '';
  const cherche = s => T.indexOf(String(s).replace(/\s+/g, ' ')) >= 0;
  v('les images peintes : logo éventuel + 1 plan + 3 photos + 2 signatures (au moins 6)', !!P && P.images >= 6, true);
  [['le titre', 'RAPPORT D’INTERVENTION'], ['le numéro', 'INT-2026-777'], ['le client, accents et guillemets compris', 'Boulangerie Élise « Le Fournil »'],
   ['le technicien de la signature', 'Justin Sonde'], ['le compte-rendu (après l\'émoji retiré)', 'Consommation importante au poste 1'],
   ['la fin d\'un paragraphe coupé sur plusieurs lignes', 'par laquelle des rongeurs peuvent entrer.'], ['les recommandations', 'Ranger les palettes à 40 cm des murs.'],
   ['un champ personnalisé', 'code portail 4521'], ['un champ tableau', 'Chambre froide'], ['le produit et son AMM', 'FR-2019-0042'], ['le produit libre', 'Gel anti-blattes'],
   ['un relevé de poste', 'Appât consommé à 80 %, remplacé'], ['l\'équipement', 'PX-9'], ['la signature du client, nommée', 'Mme Élise Martin'],
   ['la mention réglementaire', 'Certibiocide'], ['le plan et sa version', 'Rez-de-chaussée · version 2'], ['le pied de page', 'Page 1/']]
    .forEach(([q, t]) => v(q, cherche(t), true));
  v('⛔ aucune ligne de constat perdue (chaque valeur de rapportConstatLignes est dans le PDF)', (r1.constat || []).filter(x => !cherche(x)), []);
  v('⛔ aucun produit perdu', (r1.produits || []).filter(x => !cherche(x)), []);
  v('⛔ pas un « ? » d\'émoji', /\?\?| \? /.test(T), false);

  console.log('\n── 3. les pages, rendues en images par pdf.js dans le navigateur (pour les regarder) ──');
  if (r1.b64) {
    const rendu = await S.ev(`
      const pdfjs=await import('/pdfjs/legacy/build/pdf.mjs'); pdfjs.GlobalWorkerOptions.workerSrc='/pdfjs/legacy/build/pdf.worker.mjs';
      const bin=atob(${JSON.stringify(r1.b64)}); const u8=new Uint8Array(bin.length); for(let k=0;k<bin.length;k++) u8[k]=bin.charCodeAt(k);
      const doc=await pdfjs.getDocument({data:u8}).promise; const out=[];
      for(let k=1;k<=doc.numPages;k++){ const pg=await doc.getPage(k); const vp=pg.getViewport({scale:1.4}); const cv=document.createElement('canvas'); cv.width=vp.width; cv.height=vp.height;
        await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise; out.push(cv.toDataURL('image/png')); }
      return out;`);
    rendu.forEach((u, k) => fs.writeFileSync(path.join(SORTIE, 'page-' + (k + 1) + '.png'), Buffer.from(u.split(',')[1], 'base64')));
    console.log('     → ' + rendu.length + ' page(s) rendue(s) dans ' + SORTIE);
    v('chaque page se rend', rendu.length === (P && P.n), true);
  }

  console.log('\n── 4. l\'envoi : le PDF part joint, la trace suit la réussite ──');
  const r4 = await S.ev(`
    __mails=[]; __mailOk=false; const i=()=>db.interventions.find(x=>x.id==='int-rp'); delete i().rapportEnvoye; const h0=(i().histo||[]).length;
    await rapportVia('int-rp','mail'); const refus={mails:__mails.length, trace:!!i().rapportEnvoye, histo:(i().histo||[]).length-h0};
    __mails=[]; __mailOk=true; await rapportVia('int-rp','mail'); const m=__mails[0]||{opts:{}}; const a=(m.opts.atts||[])[0]||{};
    return {refus, n:__mails.length, pj:!!a.content, debutPdf:a.content?atob(a.content.slice(0,12)).slice(0,5):'', nom:a.filename||'', sansMailto:!!m.opts.sansMailto,
      trace:i().rapportEnvoye||null, impressions:__wins.length};`);
  console.log(JSON.stringify(r4));
  v('⛔ courriel refusé : aucune trace, aucune ligne d\'historique', [r4.refus.trace, r4.refus.histo], [false, 0]);
  v('⛔ courriel accepté : UN envoi, avec un vrai PDF en pièce jointe', [r4.n, r4.pj, r4.debutPdf], [1, true, '%PDF-']);
  v('   sans repli sur un brouillon sans pièce jointe', r4.sansMailto, true);
  v('   la trace dit « PDF joint »', !!(r4.trace && r4.trace.pdf === true), true);
  v('   et l\'impression ne s\'ouvre plus d\'elle-même', r4.impressions, 0);

  console.log('\n── exceptions de la page ──');
  v('aucune exception JavaScript', S.exceptions, []);
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); await S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

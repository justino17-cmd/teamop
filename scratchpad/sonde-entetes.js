/* ══ SONDE — CHAQUE DOCUMENT PORTE-T-IL LA SOCIÉTÉ DE SON INTERVENTION ? (v740) ══════════════
   Justin, 23 septembre 2026 : « chaque en-tête doit reconnaître l'entreprise qui est sur
   l'intervention, pour que le client reçoive bien le bon PDF — aussi à tester — fais-le et
   montre-moi ».

   Dans la VRAIE page (beta.html, 127.0.0.1, animations réduites, rien ne sort) : une entreprise
   « Nettoyage Excellence », deux sociétés — Alpha Nuisibles (rouge, logo, SIRET et IBAN PROPRES) et
   Bêta Hygiène (bleu, ni logo ni SIRET : un nom commercial) —, un client servi par les deux, et un
   passage « générique ». Chaque fabrique est APPELÉE telle que l'application l'appelle ; ce qu'elle
   écrit (fenêtre d'impression, PDF, courriel) est intercepté, rangé dans SORTIE, puis contrôlé :
   le bon nom, la bonne couleur, le bon SIRET, et jamais « OP GESTION » ni « Modèle générique ».
   Les fichiers servent ensuite aux captures montrées à Justin (rendus par rendre-captures.js).

   Usage : node scratchpad/sonde-entetes.js [sortie]   — SOURCE=… pour mesurer une autre page. */
const fs = require('fs'), path = require('path');
const { ouvrir } = require(path.join(__dirname, 'pilote.js'));
const SORTIE = process.argv[2] || '/tmp/claude-0/-home-user-teamop/2b5579ae-09a0-571f-9bc9-ac0e61b4c7de/scratchpad/entetes';
fs.mkdirSync(SORTIE, { recursive: true });
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };

(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  /* rien ne sort : fenêtres d'impression, courriels, téléchargements — tout est capturé */
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    window.__docs=[]; window.__mails=[]; window.__blobs=[];
    window.open=function(){ const d={html:'',url:''}; window.__docs.push(d);
      return { document:{ write(x){ d.html+=x; }, close(){} }, focus(){}, print(){}, close(){}, set location(v){ d.url=String(v); }, get location(){ return { set href(v){ d.url=String(v); } }; } }; };
    window.srvMail=async function(to,subject,body,okMsg,cat,box,opts){ window.__mails.push({to,subject,body,opts:opts||null}); return true; };
    const B0=window.Blob; window.Blob=function(parts,o){ try{ window.__blobs.push({type:(o&&o.type)||'',txt:(parts||[]).map(p=>typeof p==='string'?p:'').join('')}); }catch(e){} return new B0(parts,o); };
    HTMLAnchorElement.prototype.click=function(){};
    window.confirm=()=>true; window.alert=()=>{}; return 1;`);
  /* ── les données : dessinées dans la page (logos, photo de plan) ── */
  await S.ev(`const logo=(fond,txt)=>{ const c=document.createElement('canvas'); c.width=120; c.height=120; const x=c.getContext('2d');
      x.fillStyle=fond; x.beginPath(); x.roundRect(0,0,120,120,26); x.fill(); x.fillStyle='#fff'; x.font='bold 64px Arial'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(txt,60,64); return c.toDataURL('image/png'); };
    const photo=(()=>{ const c=document.createElement('canvas'); c.width=900; c.height=600; const x=c.getContext('2d');
      x.fillStyle='#e9e4da'; x.fillRect(0,0,900,600); x.fillStyle='#cfc6b6'; for(let k=0;k<900;k+=60){ x.fillRect(k,0,2,600); }
      x.strokeStyle='#5b5346'; x.lineWidth=8; x.strokeRect(40,40,820,520); x.beginPath(); x.moveTo(420,40); x.lineTo(420,380); x.moveTo(40,300); x.lineTo(300,300); x.stroke();
      x.fillStyle='#5b5346'; x.font='bold 28px Arial'; x.fillText('Laboratoire',90,160); x.fillText('Stockage',520,160); x.fillText('Quai',120,440);
      return c.toDataURL('image/jpeg',0.8); })();
    db.entreprise={nom:'Nettoyage Excellence',adresse:'1 rue de la Mairie',cp:'17000',ville:'La Rochelle',tel:'05 46 00 00 00',email:'contact@excellence.fr',
      siret:'111 111 111 00011',tvaIntra:'FR11111111111',iban:'FR76 1111 1111 1111 1111 1111 111',bic:'EXCLFRPP',logo:logo('#1E7A4E','N')};
    db.societes=['Alpha Nuisibles','Bêta Hygiène'];
    db.societesStyle={'Alpha Nuisibles':{couleur:'#C0392B',logo:logo('#C0392B','A'),raison:'Alpha Nuisibles SAS',siret:'222 222 222 00022',tvaIntra:'FR22222222222',
        adresse:'2 quai des Chartrons',cp:'33000',ville:'Bordeaux',tel:'05 56 00 00 00',iban:'FR76 2222 2222 2222 2222 2222 222',bic:'ALPHFRPP'},
      'Bêta Hygiène':{couleur:'#2E86C1'}};
    db.produits=(db.produits||[]).filter(p=>!/^p-sonde/.test(p.id)).concat([{id:'p-sonde1',nom:'Brodifacoum pâte 25 ppm',amm:'FR-2019-0042',unite:'u'},{id:'p-sonde2',nom:'Piège à tapette',amm:'—',unite:'u'}]);
    db.clients=(db.clients||[]).filter(c=>c.id!=='cX').concat([{id:'cX',nom:'Boulangerie Élise & Fils',email:'elise@exemple.fr',adresse:'3 rue de l’Église',codePostal:'17000',ville:'La Rochelle',tel:'06 00 00 00 01',typeClient:'pro'}]);
    db.techniciens=(db.techniciens||[]).filter(t=>t.id!=='tS').concat([{id:'tS',nom:'Tom Sonde',metier:'Technicien',certibiocide:'C-123'}]);
    const I=(id,d,st,soc,t)=>({id,num:'INT-'+id,titre:t,type:t,clientId:'cX',date:d,heure:'09:00',duree:60,statut:st,rapportModele:soc,techId:'tS',techIds:['tS'],
      compteRendu:'Passage réalisé. Postes contrôlés.',constat:{infestation:'Faible',conformite:'Conforme',recommandations:'Reboucher le passage de câbles.'},produitsUtilises:[{produitId:'p-sonde1',qte:2,unite:'u'}],histo:[]});
    db.interventions=(db.interventions||[]).filter(i=>i.clientId!=='cX').concat([
      I('iAlpha','2026-09-10','terminee','Alpha Nuisibles','Dératisation'), I('iBeta','2026-09-15','terminee','Bêta Hygiène','Désinsectisation'),
      I('iAnnul','2026-09-20','annulee','Alpha Nuisibles','Dératisation'), I('iGen','2026-09-22','terminee','Modèle générique','Contrôle'),
      I('iFutur','2099-01-10','planifiee','Alpha Nuisibles','Dératisation')]);
    db.plansSite=db.plansSite||{}; db.plansSite.cX=[
      {id:'plRdcSonde',nom:'Rez-de-chaussée',mode:'rooms',version:2,rooms:[{id:'r1',nom:'Cuisine',x:.08,y:.1,w:.42,h:.34,zoneAlim:true},{id:'r2',nom:'Réserve',x:.56,y:.1,w:.36,h:.34}],
        postes:[{id:'poA',num:1,x:.66,y:.3,type:'appat',produitId:'p-sonde1',secure:true,zone:'Réserve'},{id:'poB',num:2,x:.3,y:.3,type:'insecte',zone:'Cuisine'},{id:'poC',num:3,x:.5,y:.7,type:'piege',produitId:'p-sonde2'}]},
      {id:'plPhotoSonde',nom:'Arrière-boutique',mode:'img',img:photo,version:1,rooms:[],postes:[{id:'poD',num:4,x:25,y:30,type:'appat',produitId:'p-sonde1',secure:true},{id:'poE',num:5,x:70,y:55,type:'piege'}]}];
    db.devis=(db.devis||[]).filter(d=>d.id!=='dvA').concat([{id:'dvA',num:'DV-2026-S01',clientId:'cX',date:'2026-09-10',tva:20,statut:'envoye',rapportModele:'Alpha Nuisibles',lignes:[{designation:'Dératisation — 3 postes',qte:1,pu:180},{designation:'Déplacement',qte:1,pu:25}]}]);
    db.factures=(db.factures||[]).filter(f=>f.id!=='faB').concat([{id:'faB',num:'FA-2026-S01',clientId:'cX',date:'2026-09-15',tva:20,statut:'envoyee',rapportModele:'Bêta Hygiène',lignes:[{designation:'Désinsectisation cuisine',qte:1,pu:240}]}]);
    db.bons=(db.bons||[]).filter(b=>b.id!=='bcA').concat([{id:'bcA',num:'BC-2026-S01',societe:'Alpha Nuisibles',fournisseur:'Fournisseur Sonde',date:'2026-09-20',statut:'brouillon',lignes:[{reference:'R-01',designation:'Appâts pâte 10 kg',qte:4,unite:'u'}]}]);
    db.produitsDonnes=(db.produitsDonnes||[]).filter(p=>p.id!=='pdB').concat([{id:'pdB',produitNom:'Brodifacoum pâte 25 ppm',quantite:2,unite:'u',date:'2026-09-15',rapportModele:'Bêta Hygiène',auteurNom:'Tom Sonde'}]);
    db.boxes=(db.boxes||[]).filter(b=>b.id!=='bxX').concat([{id:'bxX',nom:'Box cuisine',numero:'B-01',clientId:'cX',stock:{'p-sonde1':{u:3}},passages:[]}]);
    db.users=(db.users||[]).filter(u=>u.id!=='uS').concat([{id:'uS',prenom:'Justin',nom:'Sonde',login:'justin-sonde',role:'admin',actif:true,pref:{}}]);
    save(); currentUser=db.users.find(u=>u.id==='uS'); enterApp(currentUser); await new Promise(r=>setTimeout(r,900)); try{ closeModal(true); }catch(e){} return 1;`);

  /* ── les documents, appelés comme l'application les appelle ── */
  const docs = await S.ev(`const out={}; const prendre=async(nom,fn)=>{ const n=__docs.length, m=__mails.length, b=__blobs.length; let err='';
      try{ await fn(); }catch(e){ err=String(e&&e.message||e); } await new Promise(r=>setTimeout(r,1200));
      out[nom]={html:__docs.slice(n).map(d=>d.html).join(''), mails:__mails.slice(m), blobs:__blobs.slice(b).map(x=>x.txt), err}; };
    await prendre('rapport-alpha',()=>printRapport('iAlpha'));
    await prendre('rapport-beta',()=>printRapport('iBeta'));
    await prendre('rapport-generique',()=>printRapport('iGen'));
    await prendre('devis-alpha',()=>printDoc('devis','dvA'));
    await prendre('facture-beta',()=>printDoc('factures','faB'));
    await prendre('dossier-sanitaire',()=>papDossierSanitaire('cX'));
    await prendre('registre',()=>printRegistre('cX'));
    await prendre('dossier-client',()=>printDossierClient('cX'));
    await prendre('bon-alpha',()=>printBon('bcA'));
    await prendre('fiche-box',()=>printBox('bxX'));
    await prendre('produit-donne-beta',()=>printProduitDonne('pdB'));
    await prendre('facturx-beta',()=>exportFacturX('faB'));
    /* les courriels, avec leur pièce jointe */
    await prendre('mail-devis-alpha',()=>envoiDoc('devis','dvA','email'));
    await prendre('mail-facture-beta',()=>envoiDoc('factures','faB','email'));
    await prendre('mail-plan-beta',()=>papImplantationEnvoyer('cX','iBeta'));
    await prendre('mail-plan-alpha',()=>papImplantationEnvoyer('cX','iAlpha'));
    await prendre('mail-rapport-alpha',()=>rapportVia('iAlpha','mail'));
    out['prevenir']={texteAlpha:orgaTexte(db.interventions.find(i=>i.id==='iAlpha')),texteBeta:orgaTexte(db.interventions.find(i=>i.id==='iBeta'))};
    out['bon-pdf']={pdf:btoa(bonPdfStr(db.bons.find(b=>b.id==='bcA')))};
    return out;`);
  /* ── contrôles, sur ce que les fabriques ont VRAIMENT écrit ── */
  const html = k => (docs[k] && docs[k].html) || '';
  const sansPiege = s => !/OP GESTION/.test(s) && !/Mod[èe]le g[ée]n[ée]rique/.test(s);
  const pop = Object.keys(docs).filter(k => !k.startsWith('mail-') && k !== 'prevenir' && k !== 'bon-pdf' && k !== 'facturx-beta');
  vrai('population : chaque fabrique a écrit un document (' + pop.length + ')', pop.every(k => html(k).length > 500), pop.filter(k => html(k).length <= 500).map(k => [k, docs[k].err]));
  const A = { nom: 'Alpha Nuisibles', col: '#C0392B', siret: '222 222 222 00022' }, B = { nom: 'Bêta Hygiène', col: '#2E86C1' }, E = { nom: 'Nettoyage Excellence', siret: '111 111 111 00011' };
  const doitPorter = (k, soc, siret, sans) => { const h = html(k);
    vrai(k + ' : « ' + soc.nom + ' »' + (soc.col ? ', sa couleur' : '') + (siret ? ', SIRET ' + siret : '') + ', jamais OP GESTION ni Modèle générique',
      h.includes(soc.nom) && (!soc.col || h.includes(soc.col)) && (!siret || h.includes(siret)) && sansPiege(h) && !(sans || []).some(x => h.includes(x)),
      { nom: h.includes(soc.nom), col: soc.col && h.includes(soc.col), siret: siret && h.includes(siret), piege: !sansPiege(h), autres: (sans || []).filter(x => h.includes(x)) }); };
  doitPorter('rapport-alpha', A, A.siret, [B.nom, E.siret]);
  doitPorter('rapport-beta', B, E.siret, [A.nom, A.siret]);
  doitPorter('rapport-generique', E, E.siret, [A.nom, B.nom]);
  doitPorter('devis-alpha', A, A.siret, [E.siret, 'FR76 1111']);
  doitPorter('facture-beta', B, E.siret, [A.nom, A.siret]);
  /* dossier, registre, box : la société des passages RÉELS — Bêta (15/09), jamais Alpha (annulée 20/09, future 2099) */
  doitPorter('dossier-sanitaire', B, E.siret, []);
  doitPorter('registre', B, E.siret, []);
  doitPorter('fiche-box', B, E.siret, []);
  doitPorter('dossier-client', E, E.siret, []);
  doitPorter('bon-alpha', A, A.siret, [E.siret]);
  doitPorter('produit-donne-beta', B, E.siret, [A.nom]);
  const fx = (docs['facturx-beta'].blobs || []).join('');
  vrai('Factur-X de la facture Bêta : le vendeur est Bêta… (raison sociale de l’entreprise, puisque Bêta n’a pas de SIRET)', /<ram:SellerTradeParty><ram:Name>Nettoyage Excellence<\/ram:Name>/.test(fx) && fx.includes('11111111100011'), fx.slice(fx.indexOf('SellerTradeParty') - 5, fx.indexOf('SellerTradeParty') + 300));
  const m = k => (docs[k] && docs[k].mails || [])[0] || {};
  const pj = k => { const a = m(k).opts && m(k).opts.atts && m(k).opts.atts[0]; return a ? Buffer.from(a.content, 'base64').toString('latin1') : ''; };
  vrai('courriel du devis Alpha : expéditeur Alpha, PDF joint à SON en-tête', (m('mail-devis-alpha').opts || {}).brandName === A.nom && pj('mail-devis-alpha').includes('Alpha Nuisibles') && pj('mail-devis-alpha').includes(A.siret) && /ci-joint/.test(m('mail-devis-alpha').body || ''), m('mail-devis-alpha').opts && m('mail-devis-alpha').opts.brandName);
  vrai('courriel de la facture Bêta : expéditeur Bêta, PDF « FACTURE » joint', (m('mail-facture-beta').opts || {}).brandName === B.nom && pj('mail-facture-beta').includes('(FACTURE)') && pj('mail-facture-beta').includes('B\xeata Hygi\xe8ne'));
  vrai('plan d’implantation envoyé depuis le passage Bêta : Bêta (pas la « dernière intervention », future et Alpha)', (m('mail-plan-beta').opts || {}).brandName === B.nom && pj('mail-plan-beta').includes('B\xeata Hygi\xe8ne') && !pj('mail-plan-beta').includes('Alpha Nuisibles'));
  vrai('plan d’implantation envoyé depuis le passage Alpha : Alpha et SON SIRET', (m('mail-plan-alpha').opts || {}).brandName === A.nom && pj('mail-plan-alpha').includes(A.siret));
  vrai('… et la photo du plan est dans le PDF (JPEG)', /\/Filter \/DCTDecode/.test(pj('mail-plan-beta')));
  vrai('le rapport Alpha par courriel : expéditeur Alpha', (m('mail-rapport-alpha').opts || {}).brandName === A.nom);
  vrai('« Prévenir les clients » : chaque message signe SA société', /Alpha Nuisibles/.test(docs.prevenir.texteAlpha) && /Bêta Hygiène/.test(docs.prevenir.texteBeta) && !/Bêta Hygiène/.test(docs.prevenir.texteAlpha), docs.prevenir);
  /* ── fichiers pour les captures ── */
  for (const k of pop) fs.writeFileSync(path.join(SORTIE, k + '.html'), html(k));
  const pdfs = { 'devis-alpha-pdf': pj('mail-devis-alpha'), 'facture-beta-pdf': pj('mail-facture-beta'), 'plan-beta-pdf': pj('mail-plan-beta'), 'plan-alpha-pdf': pj('mail-plan-alpha'),
    'bon-alpha-pdf': Buffer.from(docs['bon-pdf'].pdf, 'base64').toString('latin1') };
  for (const [k, s] of Object.entries(pdfs)) if (s) fs.writeFileSync(path.join(SORTIE, k + '.pdf'), Buffer.from(s, 'latin1'));
  fs.writeFileSync(path.join(SORTIE, 'courriels.json'), JSON.stringify(Object.fromEntries(Object.entries(docs).filter(([k]) => k.startsWith('mail-')).map(([k, x]) => [k, (x.mails || []).map(q => ({ to: q.to, subject: q.subject, body: q.body, brandName: q.opts && q.opts.brandName, pj: q.opts && q.opts.atts && q.opts.atts.map(a => a.filename) }))])), null, 1));
  vrai('aucune erreur JavaScript pendant la sonde', S.exceptions.length === 0, S.exceptions.slice(0, 3));
  S.fermer();
  console.log(`\n════ sonde-entetes : ${ok} ✓ ${ko} ✗ ════   (fichiers : ${SORTIE})`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

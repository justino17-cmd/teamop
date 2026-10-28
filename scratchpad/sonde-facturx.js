/* ══ SONDE — FACTUR-X DANS LA VRAIE PAGE (bêta v779, 28 octobre 2026) ══════════════════════════
   Justin : « tu fais tout », dont la facture électronique. Les bancs (tests/test-3134.js) exécutent les vraies fonctions dans un
   bac à sable sans navigateur ; cette sonde joue le chemin COMPLET dans Chromium, sur la copie de beta.html servie en
   127.0.0.1 — jamais app.html, jamais teamop.fr (le navigateur piloté expose tout le contenu de la page).

   Ce qu'elle mesure et que le banc ne peut pas voir :
     · le bouton « Factur-X » d'une vraie liste de factures : un vrai téléchargement, un vrai PDF (logo converti en JPEG par un canevas
       compris), relu par poppler — polices incorporées, pièce jointe, XMP —, et le XML ressorti du PDF == le XML de la facture ;
     · la fenêtre « il manque des informations » quand la fiche client n'a pas de SIREN ;
     · les champs neufs dans les vrais formulaires (SIREN, TVA du client ; nature, échéance, livraison de la facture ; l'option
       « taxe d'après les débits » de Mon entreprise), leur enregistrement, et le refus d'un SIREN à la clé fausse ;
     · l'envoi par courriel : le PDF joint est le Factur-X d'une facture complète ;
     · la liste des factures à 360 px : le bouton « Factur-X » (plus long que « FX ») ne fait pas déborder la page ;
     · aucune erreur JavaScript.
   Usage : node scratchpad/sonde-facturx.js [dossier de sortie]   — SOURCE=… pour mesurer une autre page. */
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
const { ouvrir } = require(path.join(__dirname, 'pilote.js'));
const SORTIE = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'sonde-facturx-'));
fs.mkdirSync(SORTIE, { recursive: true });
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 400) : '')); } };
const outil = (cmd, args) => { const r = cp.spawnSync(cmd, args, { encoding: 'utf8' }); return (r.error ? 'ERREUR ' + r.error.message : '') + r.stdout + r.stderr; };   // xmllint écrit « validates » sur stderr

(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    window.__mails=[]; window.__dl=[]; window.__toasts=[];
    window.srvMail=async function(to,subject,body,okMsg,cat,box,opts){ window.__mails.push({to,subject,body,opts:opts||null}); return true; };
    const U0=URL.createObjectURL.bind(URL); URL.createObjectURL=function(b){ try{ window.__dl.push(b); }catch(e){} return U0(b); };
    HTMLAnchorElement.prototype.click=function(){ window.__dlNom=this.download; };
    const T0=window.toast; window.toast=function(m){ window.__toasts.push(String(m)); try{ return T0.apply(this,arguments); }catch(e){} };
    window.confirm=()=>true; window.alert=()=>{}; return 1;`);
  /* ── les données ── */
  await S.ev(`const logo=(()=>{ const c=document.createElement('canvas'); c.width=140; c.height=140; const x=c.getContext('2d'); x.fillStyle='#1E7A4E'; x.fillRect(0,0,140,140); x.fillStyle='#fff'; x.font='bold 80px Arial'; x.textAlign='center'; x.textBaseline='middle'; x.fillText('N',70,74); return c.toDataURL('image/png'); })();
    db.entreprise={nom:'Nettoyage Excellence',adresse:'1 rue de la Mairie',cp:'17000',ville:'La Rochelle',tel:'05 46 00 00 00',email:'compta@excellence.example',
      siret:'732 829 320 00074',tvaIntra:'FR44 732829320',iban:'FR76 3000 6000 0112 3456 7890 189',bic:'AGRIFRPP',logo};
    db.societes=[]; db.societesStyle={};
    const L=[{designation:'Nettoyage des vitrines — séance de 3 h',qte:1,pu:120},{designation:'Désinsectisation',qte:2.5,pu:33.33}];
    db.clients=(db.clients||[]).filter(c=>!/^cF/.test(c.id)).concat([
      {id:'cF1',nom:'Boulangerie Élise SAS',email:'elise@exemple.fr',tel:'06 00 00 00 01',typeClient:'pro',siren:'552081317',adresse:'12 rue du Port, 17100 Saintes',codePostal:'17100',ville:'Saintes'},
      {id:'cF2',nom:'Garage du Phare',email:'phare@exemple.fr',typeClient:'pro',adresse:'4 quai Duperré',codePostal:'17000',ville:'La Rochelle'}]);
    db.factures=(db.factures||[]).filter(f=>!/^fF/.test(f.id)).concat([
      {id:'fF1',num:'FAC-2026-F01',clientId:'cF1',date:'2026-10-20',tva:20,statut:'envoyee',nature:'services',lignes:L},
      {id:'fF2',num:'FAC-2026-F02',clientId:'cF2',date:'2026-10-21',tva:20,statut:'envoyee',lignes:L}]);
    db.users=(db.users||[]).filter(u=>u.id!=='uF').concat([{id:'uF',prenom:'Justin',nom:'Sonde',login:'justin-fx',role:'admin',actif:true,pref:{}}]);
    save(); currentUser=db.users.find(u=>u.id==='uF'); enterApp(currentUser); await new Promise(r=>setTimeout(r,900)); try{ closeModal(true); }catch(e){} return 1;`);

  /* ── 1. la liste des factures et son bouton ── */
  await S.ev(`go('factures'); await new Promise(r=>setTimeout(r,900)); return 1;`);
  const liste = await S.ev(`const b=[...document.querySelectorAll('#content button')].filter(x=>/Factur-X/.test(x.textContent)); return {n:b.length, texte:b.map(x=>x.textContent.trim()), fx:[...document.querySelectorAll('#content button')].filter(x=>x.textContent.trim()==='FX').length};`);
  vrai('la liste des factures a un bouton « Factur-X » par facture (et plus de « FX »)', liste.n >= 2 && liste.fx === 0, liste);
  await S.c.envoyer('Page.captureScreenshot', { format: 'png' }).then(r => fs.writeFileSync(path.join(SORTIE, 'liste-bureau.png'), Buffer.from(r.data, 'base64'))).catch(() => {});

  /* ── 2. le vrai téléchargement d'une facture complète ── */
  const dl = await S.ev(`window.__dl.length=0; window.__toasts.length=0; await exportFacturX('fF1'); await new Promise(r=>setTimeout(r,2500));
    const b=window.__dl[window.__dl.length-1]; if(!b) return {aucun:true, toasts:window.__toasts, modale:(document.getElementById('modal')||{}).innerText};
    const buf=new Uint8Array(await b.arrayBuffer()); let s=''; for(let i=0;i<buf.length;i+=8192) s+=String.fromCharCode.apply(null,buf.subarray(i,i+8192));
    return {type:b.type, taille:buf.length, nom:window.__dlNom, b64:btoa(s), toasts:window.__toasts};`);
  vrai('exportFacturX sur une facture complète : un fichier PDF est téléchargé (nom « …-facturx.pdf »)', !dl.aucun && dl.type === 'application/pdf' && /-facturx\.pdf$/.test(dl.nom || ''), { type: dl.type, nom: dl.nom, toasts: dl.toasts, modale: dl.modale });
  vrai('⛔ le message dit « profil EN 16931 » et « plateforme agréée », jamais « conforme »', /EN 16931/.test((dl.toasts || []).join(' ')) && /plateforme agréée/.test((dl.toasts || []).join(' ')) && !/conform/i.test((dl.toasts || []).join(' ')), dl.toasts);
  if (dl.b64) {
    const pdf = path.join(SORTIE, 'facture-facturx.pdf'); fs.writeFileSync(pdf, Buffer.from(dl.b64, 'base64'));
    const info = outil('pdfinfo', [pdf]), polices = outil('pdffonts', [pdf]), pj = outil('pdfdetach', ['-list', pdf]);
    vrai('poppler lit le fichier du navigateur : PDF 1.7, une page, métadonnées XMP', /PDF version:\s+1\.7/.test(info) && /Pages:\s+1/.test(info) && /Metadata Stream:\s+yes/.test(info), info.slice(0, 400));
    vrai('… deux polices TrueType incorporées, aucune Helvetica', (polices.match(/TrueType\s+WinAnsi\s+yes yes/g) || []).length === 2 && !/Helvetica/.test(polices), polices);
    vrai('… une pièce jointe factur-x.xml', /1 embedded files/.test(pj) && /factur-x\.xml/.test(pj), pj);
    const xml = path.join(SORTIE, 'extrait.xml'); outil('pdfdetach', ['-save', '1', '-o', xml, pdf]);
    const x = fs.existsSync(xml) ? fs.readFileSync(xml, 'utf8') : '';
    vrai('le XML ressorti du PDF est bien formé, au profil EN 16931, avec le SIREN du client et le TTC de la facture', /urn:cen\.eu:en16931:2017/.test(x) && /<ram:ID schemeID="0002">552081317<\/ram:ID>/.test(x) && /<ram:GrandTotalAmount>243\.98<\/ram:GrandTotalAmount>/.test(x), x.slice(0, 200));
    const lint = outil('xmllint', ['--noout', '--schema', path.join(__dirname, '..', 'tests', 'facturx', 'CrossIndustryInvoice_100pD16B.xsd'), xml]);
    vrai('xmllint valide ce XML contre le schéma UN/CEFACT D16B', /validates/.test(lint), lint);
    const rendu = path.join(SORTIE, 'rendu'); outil('pdftoppm', ['-r', '60', '-png', '-singlefile', pdf, rendu]);
    const txt = outil('pdftotext', ['-layout', pdf, '-']);
    vrai('le PDF imprime le SIREN du client, le logo n\'a pas cassé la page (texte lisible, TTC présent)', /SIREN 552 081 317/.test(txt) && /243,98 EUR/.test(txt) && /Nettoyage Excellence/.test(txt), txt.slice(0, 300));
    vrai('(population) le logo est bien dans le PDF (image JPEG, filtre DCTDecode)', /\/Filter \/DCTDecode/.test(Buffer.from(dl.b64, 'base64').toString('latin1')));
  }

  /* ── 3. une fiche incomplète : la liste de ce qui manque ── */
  const manque = await S.ev(`window.__dl.length=0; await exportFacturX('fF2'); await new Promise(r=>setTimeout(r,600)); const m=document.getElementById('modal'); return {texte:m?m.innerText:'', telecharge:window.__dl.length};`);
  vrai('sans SIREN client ni nature : AUCUN fichier, et la fenêtre nomme ce qui manque', manque.telecharge === 0 && /SIREN du client/.test(manque.texte) && /nature de l'opération/.test(manque.texte), manque);
  await S.c.envoyer('Page.captureScreenshot', { format: 'png' }).then(r => fs.writeFileSync(path.join(SORTIE, 'fenetre-manque.png'), Buffer.from(r.data, 'base64'))).catch(() => {});
  await S.ev(`closeModal(true); return 1;`);

  /* ── 4. les champs neufs, dans les vrais formulaires ── */
  const fc = await S.ev(`formClient('cF2'); await new Promise(r=>setTimeout(r,400)); const f=document.querySelector('#modal form'); return {siren:!!f.querySelector('[name=siren]'), tva:!!f.querySelector('[name=tvaIntra]')};`);
  vrai('la fiche client propose le SIREN et le n° de TVA', fc.siren && fc.tva, fc);
  const refus = await S.ev(`const f=document.querySelector('#modal form'); f.querySelector('[name=siren]').value='552081318'; window.__toasts.length=0; f.requestSubmit(); await new Promise(r=>setTimeout(r,400));
    return {toasts:window.__toasts.slice(), ouverte:!!document.querySelector('#modal form'), siren:(db.clients.find(c=>c.id==='cF2')||{}).siren||''};`);
  vrai('un SIREN à la clé fausse est refusé : la fenêtre reste ouverte, rien n\'est écrit', /SIREN invalide/.test(refus.toasts.join(' ')) && refus.ouverte && !refus.siren, refus);
  const bon = await S.ev(`const f=document.querySelector('#modal form'); f.querySelector('[name=siren]').value='552 081 317 00039'; f.requestSubmit(); await new Promise(r=>setTimeout(r,500));
    return {siren:(db.clients.find(c=>c.id==='cF2')||{}).siren};`);
  vrai('un SIRET collé est enregistré en SIREN (552081317)', bon.siren === '552081317', bon);
  const fd = await S.ev(`formDoc('factures','fF2'); await new Promise(r=>setTimeout(r,500)); const f=document.querySelector('#modal form');
    const r={nature:!!f.querySelector('select[name=nature]'), echeance:!!f.querySelector('input[name=echeance]'), livraison:!!f.querySelector('input[name=adresseLivraison]'), natureValeur:f.querySelector('select[name=nature]').value};
    f.querySelector('select[name=nature]').value='mixte'; f.querySelector('input[name=echeance]').value='2026-11-30'; f.querySelector('input[name=adresseLivraison]').value='8 quai Marchand, 17300 Rochefort';
    f.requestSubmit(); await new Promise(r=>setTimeout(r,700)); const x=db.factures.find(f=>f.id==='fF2'); r.enregistre={nature:x.nature,echeance:x.echeance,livraison:x.adresseLivraison}; return r;`);
  vrai('le formulaire de facture propose nature, échéance et adresse de livraison — et les enregistre', fd.nature && fd.echeance && fd.livraison && fd.natureValeur === 'services' && fd.enregistre.nature === 'mixte' && fd.enregistre.echeance === '2026-11-30' && /Rochefort/.test(fd.enregistre.livraison), fd);
  const pre = await S.ev(`return facturxPrerequis(db.factures.find(f=>f.id==='fF2'));`);
  vrai('la facture F02, SIREN et nature renseignés, n\'a plus rien à fournir', Array.isArray(pre) && pre.length === 0, pre);
  const ent = await S.ev(`go('parametres'); await new Promise(r=>setTimeout(r,900)); const c=document.getElementById('ent-tvadebits'); if(!c) return {absent:true};
    const avant=c.checked; c.checked=true; entSave(); await new Promise(r=>setTimeout(r,300)); return {avant, apres:!!db.entreprise.tvaDebits, siretEtiquette:(document.querySelector('#ent-siret')||{parentNode:{innerText:''}}).parentNode.innerText};`);
  vrai('« Mon entreprise » propose l\'option pour la taxe d\'après les débits (décochée au départ) et l\'enregistre', !ent.absent && ent.avant === false && ent.apres === true, ent);
  vrai('… et son SIRET se dit « requis pour la facture électronique »', /requis pour la facture électronique/.test(ent.siretEtiquette || ''), ent.siretEtiquette);
  const pdfDeb = await S.ev(`const f=db.factures.find(f=>f.id==='fF1'); const s=await docPdfChaine('factures',f,true); return /taxe d'apr\\xe8s les d\\xe9bits/.test(s) && /<ram:DueDateTypeCode>5<\\/ram:DueDateTypeCode>/.test(s) && /\\(factur-x\\.xml\\)/.test(s);`);
  vrai('l\'option cochée s\'imprime sur le PDF et part dans le XML joint (exigibilité 5)', pdfDeb === true, pdfDeb);

  /* ── 5. l'envoi par courriel ── */
  const env = await S.ev(`window.__mails.length=0; await envoiDoc('factures','fF1','mail'); const m=window.__mails[0]; if(!m) return {aucun:true}; const a=m.opts&&m.opts.atts&&m.opts.atts[0]; return {to:m.to, nom:a&&a.filename, factur:a?atob(a.content).indexOf('(factur-x.xml)')>0:false, v17:a?atob(a.content).slice(0,8):''};`);
  vrai('envoiDoc d\'une facture complète à un client pro : le PDF joint est le Factur-X (PDF 1.7, factur-x.xml)', !env.aucun && env.factur && env.v17 === '%PDF-1.7', env);
  const env2 = await S.ev(`window.__mails.length=0; db.clients.find(c=>c.id==='cF1').siren=''; await envoiDoc('factures','fF1','mail'); const a=window.__mails[0]&&window.__mails[0].opts.atts[0]; return a?atob(a.content).slice(0,8):'aucun';`);
  vrai('⛔ SIREN retiré : l\'envoi ne bloque pas, le PDF ordinaire part comme avant (PDF 1.4)', env2 === '%PDF-1.4', env2);

  /* ── 6. le téléphone ── */
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 360, height: 780, deviceScaleFactor: 2, mobile: true });
  const tel = await S.ev(`go('factures'); await new Promise(r=>setTimeout(r,1500)); void document.body.offsetWidth; await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const w1=document.documentElement.scrollWidth; await new Promise(r=>setTimeout(r,700)); const w2=document.documentElement.scrollWidth;
    const b=[...document.querySelectorAll('#content button')].find(x=>/Factur-X/.test(x.textContent)); const r=b?b.getBoundingClientRect():null;
    window.scrollTo(9999,0); const sx=window.scrollX; return {largeur:innerWidth, scrollWidth:[w1,w2], defilementLateral:sx, bouton:r?{x:Math.round(r.x),w:Math.round(r.width),h:Math.round(r.height)}:null};`);
  vrai('à 360 px, la page ne défile pas de côté (mesuré deux fois, puis demandé à la page) et le bouton « Factur-X » tient dans l\'écran', tel.defilementLateral === 0 && tel.bouton && tel.bouton.x >= 0 && tel.bouton.x + tel.bouton.w <= 360, tel);
  await S.c.envoyer('Page.captureScreenshot', { format: 'png' }).then(r => fs.writeFileSync(path.join(SORTIE, 'liste-telephone.png'), Buffer.from(r.data, 'base64'))).catch(() => {});

  vrai('aucune erreur JavaScript pendant la sonde', S.exceptions.length === 0, S.exceptions.slice(0, 3));
  S.fermer();
  console.log(`\n════ sonde-facturx : ${ok} ✓ ${ko} ✗ ════   (fichiers : ${SORTIE})`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

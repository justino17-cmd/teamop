/* ══ SONDE — LA FENÊTRE PDF COMMUNE (v780) ═══════════════════════════════════════════════════
   Justin, 29 octobre 2026 : « qu'on voie bien tous les PDF, qu'on puisse les télécharger, les envoyer, les
   partager, voir l'aperçu ». Pour chaque famille, dans la VRAIE page (beta.html, 127.0.0.1) : la fenêtre
   s'ouvre, le PDF est prêt (%PDF, au nom de l'entreprise), Aperçu ouvre le fichier, Télécharger le donne,
   Partager passe par le partage ou retombe sur le téléchargement, Envoyer part chez le bon destinataire. */
const path = require('path');
const { ouvrir, dormir } = require('/home/user/teamop/scratchpad/pilote.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 400) : '')); } };
(async () => {
  const S = await ouvrir({ source: process.env.SOURCE || path.join(__dirname, '..', 'beta.html') });
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove();
    window.pushPropose=function(){}; window.maybeProfilePhoto=function(){}; window.entAccueilCheck=function(){};
    window.__ouverts=[]; window.__dl=[]; window.__mails=[]; window.__share=[];
    window.open=function(u){ window.__ouverts.push(String(u||'')); return {document:{write(){},close(){}},focus(){},print(){},close(){},location:{}}; };
    const clic=HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click=function(){ if(this.download){ window.__dl.push(this.download); return; } if(this.target==='_blank'){ window.__ouverts.push(this.href); return; } return clic.call(this); };
    window.srvMail=async function(to,subject,body,okMsg,cat,box,opts){ window.__mails.push({to,subject,att:!!(opts&&opts.atts&&opts.atts.length)}); return true; };
    localStorage.setItem('elanB_lang','fr');
    db.entreprise={nom:'Clim Ouest',adresse:'12 rue des Lilas',cp:'17000',ville:'La Rochelle',siret:'12345678900017',tel:'05 46 11 22 33',email:'contact@climouest.fr'};
    const T=CVC_TYPES.find(t=>t.comb)||CVC_TYPES[0];
    db.clients=(db.clients||[]).filter(c=>c.id!=='cP').concat([{id:'cP',nom:'Hôtel des Dunes',email:'direction@hoteldesdunes.fr',adresse:'1 av. de la Plage',codePostal:'17940',ville:'Rivedoux'}]);
    db.fournisseurs=(db.fournisseurs||[]).filter(f=>f.id!=='fP').concat([{id:'fP',nom:'Clim Distribution',email:'commandes@climdistri.fr'}]);
    db.bons=(db.bons||[]).filter(b=>b.id!=='bP').concat([{id:'bP',num:'BC-2026-951',fournisseurId:'fP',date:'2026-10-29',statut:'brouillon',lignes:[{designation:'Gaz R32',qte:2,unite:'u'}]}]);
    db.devis=(db.devis||[]).filter(d=>d.id!=='dP').concat([{id:'dP',num:'DEV-2026-951',clientId:'cP',date:'2026-10-29',statut:'brouillon',lignes:[{designation:'Entretien chaudière',qte:1,pu:120,tva:10}]}]);
    db.factures=(db.factures||[]).filter(d=>d.id!=='fa').concat([{id:'fa',num:'FAC-2026-951',clientId:'cP',date:'2026-10-29',statut:'brouillon',lignes:[{designation:'Entretien chaudière',qte:1,pu:120,tva:10}]}]);
    db.appareils=(db.appareils||[]).filter(a=>a.id!=='aP').concat([{id:'aP',clientId:'cP',type:T.k,marque:'Daikin',modele:'FTXM35',numSerie:'SN-951'}]);
    db.interventions=(db.interventions||[]).filter(i=>i.id!=='iP').concat([{id:'iP',num:'INT-951',titre:'Entretien chaudière',type:'Entretien',clientId:'cP',date:'2026-10-29',heure:'09:00',statut:'terminee',compteRendu:'Entretien réalisé.',appareilIds:['aP'],attestations:{aP:{date:'2026-10-29',conclusion:'Appareil en bon état'}}}]);
    db.users=(db.users||[]).filter(u=>u.id!=='uP').concat([{id:'uP',prenom:'Justin',nom:'Pdf',login:'jpdf',role:'admin',actif:true,pref:{}}]);
    save(); currentUser=db.users.find(u=>u.id==='uP'); enterApp(currentUser); return 1;`);
  await dormir(1500); await S.ev(`try{closeModal(true)}catch(e){} return 1;`);
  const familles = [
    ['le devis', `pdfDoc('devis','dP')`, 'direction@hoteldesdunes.fr'],
    ['la facture', `pdfDoc('factures','fa')`, 'direction@hoteldesdunes.fr'],
    ['le rapport d’intervention', `pdfRapport('iP')`, 'direction@hoteldesdunes.fr'],
    ['l’attestation d’entretien', `cvcAttestationApercu('iP','aP')`, 'direction@hoteldesdunes.fr'],
    ['le bon de commande', `bonPdfOpen('bP')`, null],
  ];
  for (const [nom, js, dest] of familles) {
    console.log('── ' + nom + ' ──');
    await S.ev(`window.__ouverts=[]; window.__dl=[]; window.__mails=[]; ${js}; return 1;`);
    let pret = null; for (let k = 0; k < 40 && !pret; k++) { await dormir(250); pret = await S.ev(`return _pdfF&&_pdfF.blob?{nom:_pdfF.nom,t:_pdfF.blob.size}:null`); }
    const tete = pret && await S.ev(`return new Promise(r=>{ const fr=new FileReader(); fr.onload=()=>r(fr.result.slice(0,5)+'|'+/Clim Ouest/.test(fr.result)+'|'+/OP GESTION/.test(fr.result)); fr.readAsBinaryString(_pdfF.blob); })`);
    vrai(nom + ' : la fenêtre s’ouvre, le PDF est prêt (' + (pret && pret.nom) + ')', !!pret && /^%PDF-\|true\|false$/.test(tete || ''), { pret, tete, et: await S.ev(`return (document.getElementById('pdff-etat')||{}).textContent`) });
    const n = await S.ev(`return [...document.querySelectorAll('#pdff .pdff-b')].filter(b=>!b.disabled).map(b=>b.textContent.trim())`);
    vrai(nom + ' : Aperçu · Télécharger · Partager · Envoyer, tous actifs', ['Aperçu', 'Télécharger', 'Partager', 'Envoyer'].every(m => n.some(t => t.includes(m))), n);
    await S.ev(`document.querySelector('#pdff [data-a="voir"]').click(); return 1;`); await dormir(200);
    vrai(nom + ' : Aperçu ouvre le PDF lui-même', (await S.ev(`return __ouverts`)).some(u => u.startsWith('blob:')), await S.ev(`return __ouverts`));
    await S.ev(`document.querySelector('#pdff [data-a="dl"]').click(); return 1;`); await dormir(200);
    vrai(nom + ' : Télécharger donne le fichier .pdf', (await S.ev(`return __dl`)).some(f => /\.pdf$/.test(f)), await S.ev(`return __dl`));
    await S.ev(`window.__dl=[]; document.querySelector('#pdff [data-a="partager"]').click(); return 1;`); await dormir(300);
    vrai(nom + ' : Partager (sans partage natif ici) retombe sur le téléchargement', (await S.ev(`return __dl`)).length === 1, await S.ev(`return __dl`));
    await S.ev(`document.querySelector('#pdff [data-a="envoyer"]').click(); return 1;`); await dormir(dest ? 5000 : 1500);
    if (dest) { const m = await S.ev(`return __mails`); vrai(nom + ' : Envoyer part au client (' + dest + '), PDF joint', m.length === 1 && m[0].to === dest && m[0].att, m); }
    else { const t = await S.ev(`const m=document.getElementById('modal'); return m&&m.closest('.open')?m.innerText.slice(0,160):''`); vrai(nom + ' : Envoyer ouvre l’envoi au fournisseur', /Clim Distribution|commandes@|Envoyer|boîte/i.test(t), t); }
    vrai(nom + ' : la fenêtre PDF s’est refermée', !(await S.ev(`return !!document.getElementById('pdff')`)));
    await S.ev(`try{closeModal(true)}catch(e){} return 1;`);
  }
  console.log('── sans nom d’entreprise ──');
  await S.ev(`db.entreprise={}; save(); window.__ouverts=[]; pdfDoc('devis','dP'); return 1;`); await dormir(800);
  vrai('sans nom : pas de PDF, « Ton entreprise » demande le nom', !(await S.ev(`return !!document.getElementById('pdff')`)) && await S.ev(`return !!document.getElementById('ent-completer')`));
  await S.ev(`try{closeModal(true)}catch(e){} return 1;`);
  console.log('── l’écran : au téléphone, la fenêtre tient ──');
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 360, height: 760, deviceScaleFactor: 2, mobile: true });
  await S.ev(`db.entreprise={nom:'Clim Ouest',adresse:'12 rue des Lilas',cp:'17000',ville:'La Rochelle',siret:'12345678900017'}; save(); pdfDoc('devis','dP'); return 1;`); await dormir(1500);
  const g = await S.ev(`const c=document.querySelector('#pdff .pdff-carte').getBoundingClientRect(); const bs=[...document.querySelectorAll('#pdff .pdff-b')].map(b=>b.getBoundingClientRect()); return {l:c.left,r:c.right,b:c.bottom,h:innerHeight,w:innerWidth,min:Math.min(...bs.map(x=>x.height)),dehors:bs.filter(x=>x.right>innerWidth+1||x.left<-1).length, dessus:document.elementFromPoint(180,c.top+40).closest('#pdff')?1:0}`);
  vrai('360 px : la fenêtre tient dans l’écran, boutons ≥ 44 px, posée au-dessus de tout', g.l >= 0 && g.r <= g.w + 1 && g.b <= g.h + 1 && g.min >= 44 && !g.dehors && g.dessus, g);
  vrai('aucune erreur JavaScript', !S.exceptions.length, S.exceptions.slice(0, 3));
  console.log(`\n════ sonde-pdf-feuille : ${ok} ✓ ${ko} ✗ ════`);
  await S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); process.exit(1); });

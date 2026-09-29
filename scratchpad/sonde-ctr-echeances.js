/* ══ SONDE v764 — LES RAPPELS D'ÉCHÉANCE DES CONTRATS, AU DOIGT, DANS LA VRAIE PAGE ═══════════════════════════════
   Justin, 29 septembre 2026 : « rappels d'échéance, ça il faudra le faire ». Garde du geste de tests/test-847.js (qui
   exécute les fonctions) : ici on TOUCHE, sur la bêta servie en 127.0.0.1, au bureau (1440) puis au téléphone (402,
   encoches posées) :
     0. la population : cinq contrats dont trois dans la fenêtre (un échu, un à 12 j, un sans statut à 30 j), un loin,
        un suspendu — datés depuis le jour de la PAGE (todayISO), pas celui de la sonde ;
     1. l'administrateur ouvre Contrats : le bandeau « 3 contrats à renouveler », dans l'ordre d'urgence, en haut de
        l'écran ; la pastille sur chaque ligne ; ⛔ ouvrir l'écran n'appelle pas save() ;
     2. la cloche : ses trois lignes, l'échue en tête ; toucher « Contrat échu » ouvre Contrats et MARQUE la ligne ;
        ⛔ ouvrir la cloche n'appelle pas save() ;
     3. « ✎ Mettre à jour » sur le contrat à 12 j, la date de fin repoussée, « Enregistrer » : il quitte le bandeau et
        la cloche (le seul save() de la séance est ce geste) ;
     4. une comptable qui VOIT Contrats sans pouvoir modifier une vente : le bandeau informe, sans ✎, et sa cloche
        ne dit rien ; un technicien : ni l'écran, ni la cloche ;
     5. au téléphone : le bandeau tient dans la largeur, la page ne glisse pas de côté ;
     6. aucune exception pendant tout ça.
   SOURCE=<une bêta d'avant> pour la contre-épreuve : la sonde compte ses échecs au lieu de mourir. Bêta uniquement. */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
let ok = 0, ko = 0; const vrai = (t, c, d) => { c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c || d === undefined ? '' : '  → ' + JSON.stringify(d))); };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
const CAP = process.env.CAPTURES || '';

(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  const ecran = async (w, h, tel) => {
    await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: tel ? 3 : 1, mobile: !!tel });
    await S.c.envoyer('Emulation.setTouchEmulationEnabled', { enabled: !!tel, maxTouchPoints: tel ? 5 : 1 });
    try { await S.c.envoyer('Emulation.setSafeAreaInsetsOverride', { insets: tel ? { top: 59, bottom: 34, left: 0, right: 0, topMax: 59, bottomMax: 34, leftMax: 0, rightMax: 0 } : { top: 0, bottom: 0, left: 0, right: 0, topMax: 0, bottomMax: 0, leftMax: 0, rightMax: 0 } }); } catch (e) {}
    await dormir(300); };
  await ecran(1440, 900, false);
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  /* le bocal n'a pas de réseau : l'écran « Connexion requise » est neutralisé ; save() est COMPTÉ, pas remplacé */
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    window.__toasts=[]; const t0=window.toast; window.toast=function(m){ window.__toasts.push(String(m)); return t0.apply(this,arguments); };
    /* chaque save() garde sa pile : on sait QUI écrit — une minuterie du démarrage (3,5 s : seedFournisseurs…) en fait
       quatre, et elle tombait au milieu de la mesure de la cloche (mesuré le 29 septembre 2026, pile à l'appui) */
    window.__saves=0; window.__piles=[]; const s0=window.save; window.save=function(){ window.__saves++; window.__piles.push(String(new Error().stack)); return s0.apply(this,arguments); }; return 1;`);
  await dormir(4000);   // la minuterie du démarrage est passée : ce qui écrit ensuite, c'est un geste
  const cap = async n => { if (!CAP) return; await dormir(450); fs.mkdirSync(CAP, { recursive: true });
    const s = await S.c.envoyer('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(CAP, n + '.png'), Buffer.from(s.data, 'base64')); };
  /* une frappe prouve que l'élément a une taille ET qu'il reçoit le point touché (règle du dépôt) */
  const toucher = async sel => {
    const r = await S.ev(`const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; e.scrollIntoView({block:'center'});
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); const q=e.getBoundingClientRect();
      if(q.width<1||q.height<1) return {cache:true};
      const x=Math.round(q.left+q.width/2), y=Math.round(q.top+q.height/2), h=document.elementFromPoint(x,y);
      return (!!h&&(h===e||e.contains(h)))?{x,y}:{couvert:(h&&(h.id||h.className||h.tagName))+''};`);
    if (!r || r.cache || r.couvert) { console.log('    (frappe perdue sur ' + sel + ' : ' + JSON.stringify(r) + ')'); return false; }
    await S.c.envoyer('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await dormir(40);
    await S.c.envoyer('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await dormir(600);
    return true; };
  const connecter = async id => { await S.ev(`try{ closeModal(true); }catch(e){} try{ closeNotif(); }catch(e){} const u=db.users.find(x=>x.id===${JSON.stringify(id)}); currentUser=u; enterApp(u);
      await new Promise(r=>setTimeout(r,1400)); try{ closeModal(true); }catch(e){} const f=document.getElementById('fdr-banner'); if(f) f.remove(); return 1;`); };

  console.log('\n══ 0. LA POPULATION ══');
  const pop = await S.ev(`const auj=todayISO(), plus=n=>{ const d=new Date(auj+'T12:00:00'); d.setDate(d.getDate()+n); return ISO(d); };
    db.users=[{id:'u-ce-a',prenom:'Claire',nom:'Morel',login:'cm-ce',role:'admin',actif:true,pref:{}},
      {id:'u-ce-p',prenom:'Nadia',nom:'Compta',login:'nc-ce',role:'commercial',actif:true,pref:{},acces:{modules:{contrats:true},caps:{cat_ventes_modifier:false}}},
      {id:'u-ce-t',prenom:'Karim',nom:'Benali',login:'kb-ce',role:'technicien',actif:true,pref:{}}];
    db.clients=[{id:'c-ce-1',nom:'Hôtel du Port',adresse:'1 quai du Port',ville:'Brest'},{id:'c-ce-2',nom:'Boulangerie Martin',adresse:'2 rue Neuve',ville:'Brest'}];
    db.contrats=[
      {id:'k-ce-1',num:'CTR-S-001',titre:'Entretien annuel',clientId:'c-ce-1',frequence:'annuel',montant:480,statut:'actif',dateDebut:plus(-353),dateFin:plus(12)},
      {id:'k-ce-2',num:'CTR-S-002',titre:'Dératisation',clientId:'c-ce-2',frequence:'trimestriel',montant:240,statut:'actif',dateDebut:plus(-368),dateFin:plus(-3)},
      {id:'k-ce-3',num:'CTR-S-003',titre:'Contrat long',clientId:'c-ce-1',frequence:'mensuel',montant:90,statut:'actif',dateDebut:plus(-30),dateFin:plus(200)},
      {id:'k-ce-4',num:'CTR-S-004',titre:'Suspendu',clientId:'c-ce-1',frequence:'annuel',montant:100,statut:'suspendu',dateDebut:plus(-300),dateFin:plus(2)},
      {id:'k-ce-6',num:'CTR-S-006',titre:'Ancien, sans statut',clientId:'c-ce-2',frequence:'annuel',montant:50,dateDebut:plus(-335),dateFin:plus(30)}];
    save(); window.__saves=0;
    return {contrats:db.contrats.length, fenetre:(typeof ctrEcheance==='function'?db.contrats.filter(c=>ctrEcheance(c)!==null).length:-1), users:db.users.length};`);
  v('cinq contrats, dont trois dans la fenêtre des 30 jours ; trois comptes', pop, { contrats: 5, fenetre: 3, users: 3 });

  console.log('\n══ 1. L\'ADMINISTRATEUR OUVRE CONTRATS ══');
  await connecter('u-ce-a');
  await S.ev(`window.__saves=0; go('contrats'); await new Promise(r=>setTimeout(r,900)); return 1;`);
  const e1 = await S.ev(`const b=document.querySelector('#content .ctr-echeances'), q=b&&b.getBoundingClientRect();
    const lignes=[...document.querySelectorAll('#content tr[data-ctr]')];
    return {vue:(typeof current!=='undefined'?current:null), titre:(b&&b.firstElementChild||{}).textContent||'', ordre:b?[...b.querySelectorAll('b')].map(x=>x.textContent):[],
      haut:q?Math.round(q.top):null, hauteur:innerHeight, lignes:lignes.length,
      pastilles:Object.fromEntries(lignes.map(l=>[l.dataset.ctr,((l.children[5]&&l.children[5].querySelector('.st'))||{}).textContent||null])),   // la cellule Période : le statut « Suspendu » porte aussi .st-org
      crayons:b?b.querySelectorAll('button').length:0, saves:window.__saves};`);
  vrai('(population) l\'écran Contrats est rendu, cinq lignes', e1.lignes === 5, e1);
  vrai('le bandeau : « ⏰ 3 contrats à renouveler »', /3 contrats à renouveler/.test(e1.titre), e1.titre);
  v('   dans l\'ordre d\'urgence : l\'échu, puis 12 j, puis 30 j', e1.ordre, ['CTR-S-002', 'CTR-S-001', 'CTR-S-006']);
  vrai('   en haut de l\'écran, visible sans défiler', e1.haut !== null && e1.haut >= 0 && e1.haut < e1.hauteur * 0.6, e1.haut);
  v('   un « ✎ Mettre à jour » par contrat (l\'administrateur peut modifier)', e1.crayons, 3);
  v('la pastille de chaque ligne (clés triées : l\'écran range les lignes par date de début)', Object.keys(e1.pastilles).sort().map(k => [k, e1.pastilles[k]]),
    [['k-ce-1', 'Fin dans 12 j'], ['k-ce-2', 'Échu'], ['k-ce-3', null], ['k-ce-4', null], ['k-ce-6', 'Fin dans 30 j']]);
  v('⛔ ouvrir l\'écran n\'appelle pas save()', e1.saves, 0);
  await cap('1-contrats-bureau');

  console.log('\n══ 2. LA CLOCHE ══');
  await S.ev(`window.__saves=0; go('dashboard'); await new Promise(r=>setTimeout(r,700)); return 1;`);
  const cloche = await toucher('[onclick*="toggleNotif"]');
  const e2 = await S.ev(`const it=[...document.querySelectorAll('#notif-panel .notif-it')].map(x=>x.textContent.replace(/\\s+/g,' ').trim());
    return {items:it.filter(t=>/Contrat (à renouveler|échu)/.test(t)), tous:it.length, saves:window.__saves};`);
  vrai('la cloche est touchée et s\'ouvre', cloche && e2.tous > 0, e2);
  v('   trois lignes de contrat, l\'échue en tête', e2.items.map(t => (t.match(/CTR-S-00\d/) || [])[0]), ['CTR-S-002', 'CTR-S-001', 'CTR-S-006']);
  vrai('   « Contrat échu — CTR-S-002 · Boulangerie Martin : terminé depuis 3 j »', e2.items.some(t => t.includes('Contrat échu — CTR-S-002 · Boulangerie Martin : terminé depuis 3 j')), e2.items);
  v('⛔ ouvrir la cloche n\'appelle pas save()', e2.saves, 0);
  v('   (aucune pile d\'écriture ne passe par la cloche ni par l\'écran Contrats de toute la séance — vérifié à la fin)', true, true);
  await cap('2-cloche');
  const touche = await toucher('#notif-panel .notif-it[onclick*="k-ce-2"]');
  await dormir(700);
  const e2b = await S.ev(`const l=document.querySelector('#content tr[data-ctr="k-ce-2"]');
    return {vue:(typeof current!=='undefined'?current:null), ligne:!!l, marquee:!!(l&&l.classList.contains('cible-vue')), panneau:!!document.querySelector('#notif-panel .notif-it')};`);
  vrai('toucher « Contrat échu » ouvre Contrats et MARQUE sa ligne', touche && e2b.ligne && e2b.marquee && !e2b.panneau, e2b);
  await cap('2b-ligne-marquee');

  console.log('\n══ 3. « ✎ METTRE À JOUR » : LE CONTRAT À 12 J EST RENOUVELÉ ══');
  await S.ev(`window.__saves=0; go('contrats'); await new Promise(r=>setTimeout(r,700)); return 1;`);
  const crayon = await toucher(`#content .ctr-echeances button[onclick="formContrat('k-ce-1')"]`);
  const form = await S.ev(`const o=document.getElementById('overlay'), f=o&&o.querySelector('form'), d=f&&f.querySelector('input[name="dateFin"]');
    return {ouvert:!!(o&&o.classList.contains('open')), num:f?(f.querySelector('input[name="num"]')||{}).value:null, fin:d?d.value:null};`);
  vrai('le ✎ ouvre la fiche du bon contrat, sa date de fin en place', crayon && form.ouvert && form.num === 'CTR-S-001' && !!form.fin, form);
  const nouvelle = await S.ev(`const auj=todayISO(), d=new Date(auj+'T12:00:00'); d.setDate(d.getDate()+377); const iso=ISO(d);
    const i=document.querySelector('#overlay input[name="dateFin"]'); if(!i) return null; i.value=iso; i.dispatchEvent(new Event('input',{bubbles:true})); i.dispatchEvent(new Event('change',{bubbles:true})); return iso;`);
  const enr = await toucher('#overlay form button[type="submit"]');
  await dormir(700);
  const e3 = await S.ev(`const b=document.querySelector('#content .ctr-echeances'), k=db.contrats.find(c=>c.id==='k-ce-1');
    return {fin:k.dateFin, titre:b?(b.firstElementChild||{}).textContent:'', dans:b?b.textContent.includes('CTR-S-001'):false, saves:window.__saves,
      toast:window.__toasts.slice(-1)[0]||'', cloche:computeNotifs().filter(n=>/^ctrech:/.test(n.id)).map(n=>n.id.split(':')[1])};`);
  vrai('« Enregistrer » est touché : la date de fin est la nouvelle, « Contrat mis à jour »', enr && e3.fin === nouvelle && /Contrat mis à jour/.test(e3.toast), e3);
  vrai('   le bandeau dit « 2 contrats à renouveler », sans CTR-S-001', /2 contrats à renouveler/.test(e3.titre) && !e3.dans, e3);
  v('   la cloche ne le nomme plus — et l\'échu, LU au § 2, n\'y revient pas (« une notification lue disparaît »)', e3.cloche, ['k-ce-6']);
  v('   ⛔ le seul save() est ce geste', e3.saves, 1);
  await cap('3-apres-renouvellement');

  console.log('\n══ 4. QUI NE PEUT PAS MODIFIER, ET QUI NE VOIT PAS ══');
  await connecter('u-ce-p');
  await S.ev(`go('contrats'); await new Promise(r=>setTimeout(r,800)); return 1;`);
  const e4 = await S.ev(`const b=document.querySelector('#content .ctr-echeances');
    return {bandeau:!!b, titre:b?(b.firstElementChild||{}).textContent:'', crayons:b?b.querySelectorAll('button').length:-1, peut:canCat('ventes','modifier'), voit:userSeesModule(currentUser,'contrats'),
      cloche:computeNotifs().filter(n=>/^ctrech:/.test(n.id)).length};`);
  vrai('(population) la comptable VOIT Contrats et ne peut PAS modifier une vente', e4.voit === true && e4.peut === false, e4);
  vrai('   le bandeau l\'informe (« 2 contrats à renouveler »), sans ✎', e4.bandeau && /2 contrats à renouveler/.test(e4.titre) && e4.crayons === 0, e4);
  v('   ⛔ sa cloche ne dit rien (renouveler n\'est pas à elle)', e4.cloche, 0);
  await connecter('u-ce-t');
  const e5 = await S.ev(`const avant=(typeof current!=='undefined'?current:null); try{ go('contrats'); }catch(e){} await new Promise(r=>setTimeout(r,700));
    return {voit:userSeesModule(currentUser,'contrats'), vue:(typeof current!=='undefined'?current:null), bandeau:!!document.querySelector('#content .ctr-echeances'), cloche:computeNotifs().filter(n=>/^ctrech:/.test(n.id)).length};`);
  vrai('⛔ le technicien : ni l\'écran Contrats, ni le bandeau, ni la cloche', e5.voit === false && e5.vue !== 'contrats' && !e5.bandeau && e5.cloche === 0, e5);

  console.log('\n══ 5. AU TÉLÉPHONE ══');
  await ecran(402, 874, true);
  await connecter('u-ce-a');
  await S.ev(`go('contrats'); await new Promise(r=>setTimeout(r,900)); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth; return 1;`);
  const e6 = await S.ev(`const b=document.querySelector('#content .ctr-echeances'), q=b&&b.getBoundingClientRect(); const y=scrollY; scrollTo(9999,y); await new Promise(r=>requestAnimationFrame(r)); const sx=scrollX; scrollTo(0,y);
    const bt=b?[...b.querySelectorAll('button')].map(x=>Math.round(x.getBoundingClientRect().height)):[];
    return {bandeau:!!b, gauche:q?Math.round(q.left):null, droite:q?Math.round(q.right):null, large:innerWidth, glisse:sx, boutons:bt};`);
  vrai('le bandeau tient dans la largeur du téléphone', e6.bandeau && e6.gauche >= 0 && e6.droite <= 402, e6);
  v('   ⛔ la page ne glisse pas de côté', e6.glisse, 0);
  vrai('   ses ✎ répondent sur 38 px au moins (plancher des .btn.sm)', e6.boutons.length === 2 && e6.boutons.every(h => h >= 38), e6.boutons);
  await cap('5-telephone');

  console.log('\n══ 6. AUCUNE EXCEPTION, ET PERSONNE D\'AUTRE N\'ÉCRIT ══');
  const piles = await S.ev(`return window.__piles.filter(p=>/computeNotifs|openNotif|toggleNotif|views\\.contrats|ctrRappels|ctrBandeau|ctrEcheance/.test(p)).length;`);
  v('⛔ aucune écriture de la séance n\'a la cloche ni l\'écran Contrats dans sa pile', piles, 0);
  v('aucune exception pendant la séance', S.exceptions, []);

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE :', e && e.stack || e); process.exit(2); });

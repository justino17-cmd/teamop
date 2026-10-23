/* ══ SONDE — CHAUFFAGE / CLIMATISATION : LE PARC, LES ATTESTATIONS, LES FLUIDES, LES VISITES (CVC) ══════════════════════
   Rejoués dans la vraie page (copie locale de beta.html, 127.0.0.1), par de vrais gestes, jour ET nuit, au bureau (1440 puis
   1100 px, à la souris) et au téléphone (390 px, au doigt, encoches posées), avec des valeurs LONGUES plausibles.
   PARTIE=1 : le parc d'appareils, la carte de l'intervention, Tâches et tableau de bord, « Planifier » jusqu'à l'intervention créée ;
   PARTIE=2 : l'attestation d'entretien ; PARTIE=3 : les fiches fluides ; PARTIE=4 : les visites des contrats (cumulatif).
   ⛔ Et la contre-épreuve de chaque partie : le métier « 3D » (celui d'ELAN) ne voit RIEN de neuf.
   CAPTURES=dossier pour les images, PROF=bureau|bureau1100|tel pour un seul profil. Bêta uniquement. */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const { PROFILS, poserProfil } = require(path.join(__dirname, 'profils.js'));
const CAP = process.env.CAPTURES; if (CAP) fs.mkdirSync(CAP, { recursive: true });
const PARTIE = +(process.env.PARTIE || 1);
PROFILS.bureau1100 = Object.assign({}, PROFILS.bureau, { w: 1100, h: 800, lbl: 'Mac 1100 px' });
let ok = 0, ko = 0; const c = (t, v, d) => { if (v) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };

(async () => {
  const S = await ouvrir();
  console.log('page mesurée :', S.version);
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1200); await S.ev(`try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(1500);
  /* animations réduites : un vrai réglage d'utilisateur, servi sans transition (CLAUDE.md : une sonde de gestes) */
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const calme = () => S.ev(`for(let k=0;k<60&&window._vtEnCours;k++) await new Promise(r=>setTimeout(r,50));
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth; return 1;`);
  const capture = async nom => { if (!CAP) return; await dormir(250); const im = await S.c.envoyer('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(CAP, nom + '.png'), Buffer.from(im.data, 'base64')); };
  /* un geste réel ; prouve d'abord que le point touché est bien l'élément */
  const geste = async (sel, souris, texte) => {
    const p = await S.ev(`const L=[...document.querySelectorAll(${JSON.stringify(sel)})].filter(e=>e.offsetWidth&&(!${JSON.stringify(texte || '')}||e.textContent.replace(/\\s+/g,' ').trim().includes(${JSON.stringify(texte || '')})));
      const e=L[0]; if(!e) return null; e.scrollIntoView({block:'center'}); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const r=e.getBoundingClientRect(); const x=Math.round(r.left+r.width/2), y=Math.round(r.top+r.height/2);
      const t=document.elementFromPoint(x,y); return {x,y,ok:!!t&&(t===e||e.contains(t)||t.closest&&t.closest('button,[onclick]')===e.closest('button,[onclick]'))};`);
    if (!p || !p.ok) return p;
    if (souris) { for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await S.c.envoyer('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 }); }
    else { await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y, id: 1 }] }); await dormir(40); await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
    await dormir(450); await calme(); return p; };
  /* ⛔ un débordement se mesure APRÈS deux trames et une lecture forcée, DEUX FOIS, et la barre de défilement doit être prouvée (CLAUDE.md) */
  const deborde = async (zoneSel) => { const l = () => S.ev(`await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth;
      const z=document.querySelector(${JSON.stringify(zoneSel)}); const W=document.documentElement.clientWidth;
      const hors=[...(z||document.body).querySelectorAll('*')].filter(e=>{ const r=e.getBoundingClientRect(); return r.width>0&&r.right>W+1&&getComputedStyle(e).position!=='fixed'&&!e.closest('.tbl-wrap,.filters,svg'); }).slice(0,3).map(e=>e.tagName+'.'+String(e.className).slice(0,40)+' '+Math.round(e.getBoundingClientRect().right)+'>'+W);
      const m=z?z.scrollWidth-z.clientWidth:0; return {hors, zone:m, page:document.documentElement.scrollWidth-W};`);
    const a = await l(); await dormir(700); const b = await l(); return { hors: a.hors.filter(x => b.hors.includes(x)), zone: Math.min(a.zone, b.zone), page: Math.min(a.page, b.page) }; };

  /* ⛔ « une colonne qui cède tout ne déborde pas, elle s'allonge » : on mesure la LARGEUR du texte de chaque ligne (CLAUDE.md, texte écrasé) */
  const largeurTexte = zone => S.ev(`const L=[...document.querySelectorAll(${JSON.stringify(zone)}+' .cvc-l > .pl-info')].filter(e=>e.offsetWidth); return {n:L.length, min:L.length?Math.round(Math.min(...L.map(e=>e.getBoundingClientRect().width))):0, hmax:L.length?Math.round(Math.max(...L.map(e=>e.getBoundingClientRect().height))):0};`);
  /* ══ LA POPULATION ══ */
  const LONG = 'Établissements Dupont-Lefèvre de la Grande Boulangerie Industrielle et Artisanale de Haute-Normandie';
  const pop = await S.ev(`db.metier='chauffage';
    db.clients=db.clients.filter(c=>!/^c-cvc/.test(c.id)); db.interventions=db.interventions.filter(i=>!/^i-cvc/.test(i.id)); db.appareils=[];
    db.clients.push({id:'c-cvc1',nom:${JSON.stringify(LONG)},adresse:'12 rue des Écoles, 76000 Rouen',email:'a@b.fr',tel:'0102030405',typeClient:'pro'},{id:'c-cvc2',nom:'Mme Durand',adresse:'3 impasse du Four',typeClient:'particulier'});
    db.appareils.push(
      {id:'a-cvc1',clientId:'c-cvc1',type:'chaudiere_gaz',marque:'Saunier Duval Thermo-Systèmes Industriels',modele:'Thema Condens F 25 E ErP Premium',serie:'SN-2019-0044-8821-ABCDEF',puissance:24,emplacement:'Chaufferie du sous-sol, bâtiment annexe nord',miseEnService:'2019-09-15',nom:'x'},
      {id:'a-cvc2',clientId:'c-cvc1',type:'pac_air',marque:'Daikin',modele:'Altherma 3 R ECH2O',serie:'DK-77',puissance:8,fluide:'R32',charge:1.2,miseEnService:'2024-11-10',emplacement:'Toit-terrasse',nom:'x'},
      {id:'a-cvc3',clientId:'c-cvc1',type:'clim_multi',marque:'Mitsubishi Electric',modele:'MXZ-3F54VF',puissance:5.4,fluide:'R410A',charge:3.4,detection:false,miseEnService:'2021-06-01',emplacement:'Salle de réunion',nom:'x'},
      {id:'a-cvc4',clientId:'c-cvc2',type:'chaudiere_fioul',marque:'De Dietrich',emplacement:'Garage',nom:'x'});
    db.appareils.forEach(a=>{ a.nom=cvcLibelle(a); });
    db.interventions.push({id:'i-cvc1',num:'INT-CVC-1',clientId:'c-cvc1',titre:'Entretien annuel chaudière',type:'Entretien annuel chaudière',statut:'terminee',date:'2025-10-30',heure:'09:00',duree:60,appareilIds:['a-cvc1'],compteRendu:'',produitsUtilises:[],equipements:[]},
      {id:'i-cvc2',num:'INT-CVC-2',clientId:'c-cvc1',titre:'Dépannage '+${JSON.stringify(LONG)},type:'Dépannage chauffage',statut:'planifiee',date:'2026-12-20',heure:'09:00',duree:60,appareilIds:[],compteRendu:'',produitsUtilises:[],equipements:[]});
    save(); return {metier:metierId(), parc:metierGereParc(), appareils:db.appareils.length, propositions:cvcPropositions().length};`);
  c('(population) métier chauffage, 4 appareils, et des échéances à proposer (' + pop.propositions + ')', pop.metier === 'chauffage' && pop.parc && pop.appareils === 4 && pop.propositions >= 2, pop);

  const profs = process.env.PROF ? [process.env.PROF] : ['bureau', 'bureau1100', 'tel'];
  for (const cle of profs) {
    const P = PROFILS[cle], souris = !P.tac;
    if (P.tac) await poserProfil(S, P); else await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: P.w, height: P.h, deviceScaleFactor: P.dpr, mobile: false });
    await S.ev(`setPlatForce('${P.plat}'); return 1;`);
    for (const theme of ['light', 'dark']) {
      const J = P.lbl + ', ' + (theme === 'light' ? 'jour' : 'nuit'), tag = cle + '-' + theme;
      console.log('\n══ ' + J + ' ══');
      await S.ev(`try{ closeModal(true); }catch(e){} (typeof setThemePrefNu==='function'?setThemePrefNu:setThemePref)('${theme}'); db.metier='chauffage'; db.appareils=db.appareils.filter(a=>/^a-cvc/.test(a.id)); db.interventions=db.interventions.filter(i=>/^i-cvc[12]$/.test(i.id)); return 1;`);

      /* ── 1. la fiche client ── */
      await S.ev(`go('clients'); return 1;`); await dormir(700);
      await S.ev(`ficheClient('c-cvc1'); return 1;`); await dormir(700); await calme();
      const f1 = await S.ev(`const m=document.getElementById('modal'); const s=document.getElementById('cvc-parc'); return {parc:!!s, rows:[...m.querySelectorAll('.pl-row')].filter(r=>/Chaudière gaz|Pompe à chaleur|multisplit/.test(r.textContent)).length,
        txt:s?s.textContent.replace(/\\s+/g,' ').trim():'', pastilles:m.querySelectorAll('.st').length, bouton:[...m.querySelectorAll('button')].some(b=>/＋ Appareil/.test(b.textContent))};`);
      c('fiche client : la section « Appareils » liste les 3 appareils du client (pas celui de Mme Durand), avec un bouton « ＋ Appareil »', f1.parc && f1.rows === 3 && f1.bouton && /Appareils 3/.test(f1.txt), f1);
      c('… et au moins une pastille d’échéance', f1.pastilles >= 1, f1);
      const d1 = await deborde('#modal');
      c('⛔ la fiche ne déborde pas, valeurs longues comprises (zone ' + d1.zone + ' px, page ' + d1.page + ' px)', d1.zone <= 1 && d1.page <= 1 && !d1.hors.length, d1);
      const w1 = await largeurTexte('#modal');
      c('⛔ fiche client : le texte de chaque appareil garde au moins 150 px (' + w1.n + ' lignes, plus étroit : ' + w1.min + ' px, plus haut : ' + w1.hmax + ' px)', w1.n === 3 && w1.min >= 150, w1);
      await S.ev(`const e=document.getElementById('cvc-parc'); if(e) e.scrollIntoView({block:'start'}); return 1;`); await capture('1-fiche-client-' + tag);

      /* ── 2. ajouter un appareil par le formulaire : vrais gestes ── */
      await geste('#modal button', souris, '＋ Appareil'); await dormir(300);
      const f2 = await S.ev(`const f=document.getElementById('cvc-form'); return {form:!!f, fluideVisible:f?getComputedStyle(document.getElementById('cvc-fluide')).display!=='none':null, titre:(document.querySelector('#modal h3')||{}).textContent};`);
      c('« ＋ Appareil » ouvre le formulaire (chaudière par défaut : le bloc fluide est caché)', f2.form && f2.fluideVisible === false, f2);
      await S.ev(`const f=document.getElementById('cvc-form'); const set=(n,v)=>{ const e=f.elements[n]; e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); };
        set('type','clim_split'); set('marque','Mitsubishi Electric Europe Climatisation'); set('modele','MSZ-AP25VGK réf. 4457-89'); set('serie','SN-99-ÉÈ-0001'); set('puissance','2.5'); set('emplacement','Chambre parentale du deuxième étage, côté jardin'); set('miseEnService','2025-06-01');
        set('fluide','R32'); set('charge','0.75'); return 1;`);
      await dormir(250);
      const f3 = await S.ev(`const b=document.getElementById('cvc-fluide'); return {visible:getComputedStyle(b).display!=='none', regle:document.getElementById('cvc-regle').textContent};`);
      c('changer le type en « split » montre le bloc fluide, et le calcul se met à jour (0,75 kg de R32 = 0,51 t)', f3.visible && /0,51 t éq\. CO₂/.test(f3.regle) && /sous le seuil de 5 t/.test(f3.regle), f3);
      const d2 = await deborde('#modal');
      c('⛔ le formulaire ne déborde pas (zone ' + d2.zone + ' px, page ' + d2.page + ' px)', d2.zone <= 1 && d2.page <= 1 && !d2.hors.length, d2);
      await S.ev(`const e=document.getElementById('cvc-regle'); if(e) e.scrollIntoView({block:'center'}); return 1;`); await capture('2-formulaire-' + tag);
      const avant = await S.ev(`return db.appareils.length;`);
      await geste('#cvc-form button[type=submit]', souris);
      const f4 = await S.ev(`const a=db.appareils.find(x=>/Mitsubishi Electric Europe/.test(x.marque||'')); return {n:db.appareils.length, a:a&&{p:a.puissance,ch:a.charge,nom:a.nom,fl:a.fluide,cli:a.clientId}, modal:(document.getElementById('modal').textContent||'').includes('Appareils')};`);
      c('« Ajouter » enregistre l’appareil (' + avant + ' → ' + f4.n + ') avec ses valeurs, et rouvre la fiche du client', f4.n === avant + 1 && f4.a && f4.a.p === 2.5 && f4.a.ch === 0.75 && f4.a.cli === 'c-cvc1' && f4.modal, f4);
      await S.ev(`closeModal(true); return 1;`);

      /* ── 3. la carte « Appareils visités » de l'intervention ── */
      await S.ev(`detailIntervention('i-cvc2'); return 1;`); await dormir(900); await calme();
      const c0 = await S.ev(`const k=document.getElementById('cvc-int'); return {carte:!!k, chips:k?k.querySelectorAll('.met-chip').length:0, txt:k?k.textContent.replace(/\\s+/g,' ').trim().slice(0,120):''};`);
      c('l’intervention montre la carte « Appareils visités » (lecture : aucun appareil cité)', c0.carte && /Aucun appareil cité/.test(c0.txt), c0);
      await S.ev(`intEdit=true; renderIntDetail('i-cvc2'); return 1;`); await dormir(600); await calme();
      const c1 = await S.ev(`const k=document.getElementById('cvc-int'); return {chips:k?k.querySelectorAll('.met-chip').length:0};`);
      c('en édition : une puce par appareil du client (4 avec celui qu’on vient d’ajouter)', c1.chips === 4, c1);
      await geste('#cvc-int .met-chip', souris, 'Pompe à chaleur'); await dormir(300);
      const c2 = await S.ev(`const i=db.interventions.find(x=>x.id==='i-cvc2'); const k=document.getElementById('cvc-int'); return {ids:i.appareilIds, on:k?k.querySelectorAll('.met-chip.on').length:0};`);
      c('un toucher coche l’appareil : cité sur l’intervention, puce allumée', c2.ids.join() === 'a-cvc2' && c2.on === 1, c2);
      const d3 = await deborde('#content');
      c('⛔ l’intervention ne déborde pas (zone ' + d3.zone + ' px, page ' + d3.page + ' px)', d3.zone <= 1 && d3.page <= 1 && !d3.hors.length, d3);
      await S.ev(`const e=document.getElementById('cvc-int'); if(e) e.scrollIntoView({block:'center'}); return 1;`); await capture('3-intervention-' + tag);
      await geste('#cvc-int .met-chip', souris, 'Pompe à chaleur'); await dormir(300);
      c('re-toucher le décoche', (await S.ev(`return db.interventions.find(x=>x.id==='i-cvc2').appareilIds.length;`)) === 0);
      await S.ev(`intEdit=false; return 1;`);

      /* ── 3 bis (partie 2) : l'attestation d'entretien d'une chaudière ── */
      if (PARTIE >= 2) {
        const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
        await S.ev(`const i=db.interventions.find(x=>x.id==='i-cvc1'); i.signature=${JSON.stringify(PNG)}; i.signatureTech=${JSON.stringify(PNG)}; i.prestaMetier=['Nettoyage du corps de chauffe','Analyse de combustion','Mesure du tirage']; i.relevesMetier={co:'180',rdt:'94.2',tfum:'121'}; delete i.attestations;
          window.__mails=[]; window.srvMail=async function(to,sub,body,okMsg,cat,box,opts){ window.__mails.push({to,sub,att:(opts&&opts.atts||[]).map(a=>({f:a.filename,b:atob(a.content).slice(0,8),n:a.content.length}))}); return true; }; save(); return 1;`);
        await S.ev(`detailIntervention('i-cvc1'); return 1;`); await dormir(900); await calme();
        const a0 = await S.ev(`const k=document.getElementById('cvc-int'); const b=k&&[...k.querySelectorAll('button')].find(x=>/Attestation/.test(x.textContent)); return {bouton:!!b, off:b&&b.disabled, chaudiere:!!(k&&/Saunier Duval/.test(k.textContent))};`);
        c('intervention terminée citant la chaudière : le bouton « Attestation d’entretien » est là, actif', a0.bouton && a0.off === false, a0);
        await S.ev(`const e=document.getElementById('cvc-int'); if(e) e.scrollIntoView({block:'center'}); return 1;`); await capture('6-carte-attestation-' + tag);
        await S.ev(`const i=db.interventions.find(x=>x.id==='i-cvc1'); i.appareilIds=['a-cvc1']; save(); renderIntDetail('i-cvc1'); return 1;`); await dormir(500); await calme();
        await geste('#cvc-int button', souris, 'Attestation d’entretien'); await dormir(300);
        const a1 = await S.ev(`const f=document.getElementById('cvc-att'); return {form:!!f, co:f&&f.elements.co.value, rdt:f&&f.elements.rdt.value, coAmb:f&&f.elements.coAmbiant.value, classe:!!(f&&f.elements.classe)};`);
        c('« Attestation d’entretien » ouvre le formulaire, prérempli depuis les relevés (CO fumées 180, rendement 94.2) — le CO ambiant reste VIDE', a1.form && a1.co === '180' && a1.rdt === '94.2' && a1.coAmb === '', a1);
        await S.ev(`const f=document.getElementById('cvc-att'); const set=(n,v)=>{ const e=f.elements[n]; e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); };
          set('coAmbiant','12'); set('instrument','Testo 310 — analyseur de combustion avec sonde de pression réf. 0563 3100'); set('classe','A');
          set('conseils','Prévoir le remplacement du brûleur dans les deux ans ; faire vérifier le conduit de fumées, la ventilation haute et basse de la chaufferie et le calorifugeage des canalisations du sous-sol. '.repeat(4)); set('travaux','Remplacer le vase d’expansion'); return 1;`);
        await dormir(250);
        const a2 = await S.ev(`const e=document.getElementById('cvc-att-co'); return {t:e.textContent, col:getComputedStyle(e).color};`);
        c('⛔ à 12 ppm, le verdict s’écrit pendant la saisie : « Anomalie… tirage et ventilation »', /Anomalie/.test(a2.t) && /tirage et la ventilation/.test(a2.t), a2);
        const d6 = await deborde('#modal');
        c('⛔ le formulaire d’attestation ne déborde pas (zone ' + d6.zone + ' px, page ' + d6.page + ' px)', d6.zone <= 1 && d6.page <= 1 && !d6.hors.length, d6);
        await capture('6-attestation-form-' + tag);
        await geste('#cvc-att button', souris, 'Enregistrer'); await dormir(300);
        const a3 = await S.ev(`const i=db.interventions.find(x=>x.id==='i-cvc1'); const t=i.attestations&&i.attestations['a-cvc1']; return t&&{co:t.coAmbiant,classe:t.classe,etabli:t.etabliLe,histo:(i.histo||[]).some(h=>/Attestation d’entretien établie/.test(h.txt||h))};`);
        c('« Enregistrer » range l’attestation sur l’intervention (CO ambiant 12, classe A, date) et une ligne d’historique', !!a3 && a3.co === '12' && a3.classe === 'A' && !!a3.etabli && a3.histo, a3);
        const a4 = await S.ev(`const d=await cvcAttestationDocument('i-cvc1','a-cvc1'); if(d.err) return {err:d.err}; const p=d.pdf; return {entete:p.slice(0,8), pages:+((/\\/Count (\\d+)/.exec(p)||[])[1]), images:(p.match(/\\/Subtype \\/Image/g)||[]).length, nom:d.nom, taille:d.b64.length, interro:[...p.matchAll(/\\/F[12] [\\d.]+ Tf\\n[\\d.-]+ [\\d.-]+ Td\\n\\(((?:\\\\.|[^\\\\)])*)\\) Tj/g)].some(m=>m[1].includes('?'))};`);
        c('le VRAI PDF fabriqué par la page : en-tête %PDF, les 2 signatures (PNG converti en JPEG par le canevas), aucun « ? »', a4.entete === '%PDF-1.4' && a4.images === 2 && a4.pages >= 1 && !a4.interro, a4);
        console.log('    (nom : ' + a4.nom + ' · ' + a4.taille + ' car. base64 · ' + a4.pages + ' page(s))');
        await geste('#cvc-att button', souris, 'Envoyer au client'); await dormir(2500); await calme();
        const a5 = await S.ev(`const i=db.interventions.find(x=>x.id==='i-cvc1'); const t=i.attestations['a-cvc1']; return {mails:window.__mails, env:!!t.envoyeeLe, a:t.envoyeeA, histo:(i.histo||[]).some(h=>/envoyée par e-mail/.test(h.txt||h)), modal:!(document.getElementById('overlay')||{classList:{contains:()=>false}}).classList.contains('open')};`);
        c('« Envoyer au client » : UN courriel, au client, avec le PDF joint (en-tête %PDF), trace écrite après', a5.mails.length === 1 && a5.mails[0].to === 'a@b.fr' && a5.mails[0].att.length === 1 && a5.mails[0].att[0].b.startsWith('%PDF-1.4') && /^Attestation-entretien-/.test(a5.mails[0].att[0].f) && a5.env && a5.histo && a5.modal, a5);
        const a6 = await S.ev(`const k=document.getElementById('cvc-int'); return k.textContent.replace(/\\s+/g,' ');`);
        c('la carte de l’intervention dit « envoyée le … »', /envoyée le/.test(a6), a6.slice(0, 200));
        await S.ev(`const e=document.getElementById('cvc-int'); if(e) e.scrollIntoView({block:'center'}); return 1;`); await capture('6-carte-apres-envoi-' + tag);
        await S.ev(`const i=db.interventions.find(x=>x.id==='i-cvc1'); i.appareilIds=['a-cvc1']; delete i.attestations; save(); return 1;`);
      }

      /* ── 3 ter (partie 3) : la fiche fluides frigorigènes ── */
      if (PARTIE >= 3) {
        await S.ev(`const i=db.interventions.find(x=>x.id==='i-cvc1'); i.appareilIds=['a-cvc1','a-cvc2']; delete i.fichesFluides; save(); detailIntervention('i-cvc1'); return 1;`); await dormir(900); await calme();
        const fl0 = await S.ev(`const k=document.getElementById('cvc-int'); const b=k&&[...k.querySelectorAll('button')].filter(x=>/Fiche fluides/.test(x.textContent)); return {n:b?b.length:0, txt:k?k.textContent.replace(/\\s+/g,' ').slice(0,300):''};`);
        c('la carte propose « ＋ Fiche fluides » pour la pompe à chaleur seulement (pas pour la chaudière)', fl0.n === 1, fl0);
        await geste('#cvc-int button', souris, 'Fiche fluides'); await dormir(300);
        const fl1 = await S.ev(`const f=document.getElementById('cvc-fiche'); const m=document.getElementById('modal'); return {form:!!f, fluide:f&&f.elements.fluide.value, date:f&&f.elements.date.value, ctl:f?getComputedStyle(document.getElementById('cvc-fiche-ctl')).display:'', cerfa:/pas<\\/b> le Cerfa n° 15497\\*04/.test(m.innerHTML)};`);
        c('le formulaire s’ouvre prérempli (fluide R32, date de l’intervention), le contrôle est masqué, et il dit « pas le Cerfa officiel »', fl1.form && fl1.fluide === 'R32' && fl1.date === '2025-10-30' && fl1.ctl === 'none' && fl1.cerfa, fl1);
        await S.ev(`const f=document.getElementById('cvc-fiche'); const set=(n,v)=>{ const e=f.elements[n]; e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); };
          set('nature','Contrôle d’étanchéité'); set('charge','0.3'); set('recup','0'); set('contenant','Bouteille BT-22 de récupération du dépôt de Rouen'); set('bordereau','TD-2026-0042-ABCDEF-0001'); f.elements.controle.checked=true; set('resultat','fuite_differee'); set('fuiteLieu','Raccord du détendeur, unité extérieure, côté toit-terrasse nord'); set('attestation','AC-2023-77-1234'); return 1;`);
        await dormir(250);
        const fl2 = await S.ev(`const i=document.getElementById('cvc-fiche-info'); return {t:i.textContent, ctl:getComputedStyle(document.getElementById('cvc-fiche-ctl')).display, col:getComputedStyle(i).color};`);
        c('⛔ « contrôle effectué » + fuite à réparation différée : le bloc apparaît, et l’écran dit « 4 jours ouvrés … mis à l’arrêt … vidangé »', fl2.ctl !== 'none' && /4 jours ouvrés/.test(fl2.t) && /vidangé/.test(fl2.t), fl2);
        const d7 = await deborde('#modal');
        c('⛔ la fiche fluides ne déborde pas (zone ' + d7.zone + ' px, page ' + d7.page + ' px)', d7.zone <= 1 && d7.page <= 1 && !d7.hors.length, d7);
        await S.ev(`const e=document.getElementById('cvc-fiche-info'); if(e) e.scrollIntoView({block:'center'}); return 1;`); await capture('7-fiche-fluides-' + tag);
        await geste('#cvc-fiche button[type=submit]', souris); await dormir(400);
        const fl3 = await S.ev(`const i=db.interventions.find(x=>x.id==='i-cvc1'); const f=(i.fichesFluides||[])[0]; return {n:(i.fichesFluides||[]).length, f:f&&{charge:f.charge,res:f.resultat,ctl:f.controle,fl:f.fluide,aid:f.appareilId}, carte:document.getElementById('cvc-int').textContent.replace(/\\s+/g,' ')};`);
        c('« Ajouter la fiche » : la fiche est DANS l’intervention (R32, 0,3 kg, fuite différée), et la carte la résume', fl3.n === 1 && fl3.f.charge === 0.3 && fl3.f.res === 'fuite_differee' && fl3.f.ctl === true && fl3.f.aid === 'a-cvc2' && /étanchéité : Fuite constatée, réparation différée/.test(fl3.carte), fl3);
        await S.ev(`const e=document.getElementById('cvc-int'); if(e) e.scrollIntoView({block:'center'}); return 1;`); await capture('7-carte-fiche-' + tag);
        const d8 = await deborde('#content');
        c('⛔ l’intervention avec sa fiche ne déborde pas (zone ' + d8.zone + ' px, page ' + d8.page + ' px)', d8.zone <= 1 && d8.page <= 1 && !d8.hors.length, d8);
        await geste('#cvc-int button', souris, '✎'); await dormir(300);
        const fl4 = await S.ev(`const f=document.getElementById('cvc-fiche'); return f&&{c:f.elements.charge.value, r:f.elements.resultat.value};`);
        c('✎ rouvre la fiche avec ses valeurs (charge 0.3, fuite différée)', !!fl4 && fl4.c === '0.3' && fl4.r === 'fuite_differee', fl4);
        await S.ev(`closeModal(true); renderIntDetail('i-cvc1'); return 1;`); await dormir(400); await calme();
        await geste('#cvc-int button', souris, '🗑'); await dormir(400);
        c('🗑 supprime la fiche', (await S.ev(`return (db.interventions.find(x=>x.id==='i-cvc1').fichesFluides||[]).length;`)) === 0);
        /* le calendrier : la ligne d'appareil dit la périodicité, et Tâches propose le contrôle */
        await S.ev(`db.interventions=db.interventions.filter(i=>/^i-cvc[12]$/.test(i.id)); db.interventions.find(x=>x.id==='i-cvc1').appareilIds=['a-cvc1']; save(); ficheClient('c-cvc1'); return 1;`); await dormir(700); await calme();
        const cal = await S.ev(`const m=document.getElementById('modal'); return {ligne:/Étanchéité : tous les 12 mois/.test(m.textContent), pastille:[...m.querySelectorAll('.st')].some(x=>/Étanchéité/.test(x.textContent))};`);
        c('la fiche client dit « Étanchéité : tous les 12 mois » pour le multisplit R410A (3,4 kg = 7,1 t), avec sa pastille', cal.ligne && cal.pastille, cal);
        await S.ev(`closeModal(true); go('taches'); return 1;`); await dormir(700); await calme();
        const cal2 = await S.ev(`const b=document.getElementById('cvc-taches'); return b?[...b.querySelectorAll('.pl-title')].map(x=>x.textContent.trim().slice(0,60)):[];`);
        c('Tâches propose le contrôle d’étanchéité du multisplit', cal2.some(t => /^Contrôle d’étanchéité — Climatiseur multisplit/.test(t)), cal2);
      }

      /* ── 3 quater (partie 4) : le contrat désigne ses appareils, et propose la visite annuelle ── */
      if (PARTIE >= 4) {
        await S.ev(`db.contrats=[]; db.interventions=db.interventions.filter(i=>/^i-cvc[12]$/.test(i.id)); save(); go('contrats'); return 1;`); await dormir(600);
        await S.ev(`formContrat(); return 1;`); await dormir(500); await calme();
        const k0 = await S.ev(`const z=document.getElementById('cvc-ct'); return {zone:!!z, txt:z?z.textContent.replace(/\\s+/g,' '):''};`);
        c('formulaire de contrat : la zone « Appareils couverts » invite à choisir le client', k0.zone && /Choisissez le client/.test(k0.txt), k0);
        await S.ev(`const f=document.querySelector('#modal form'); const sel=f.elements.clientId; sel.value='c-cvc1'; sel.dispatchEvent(new Event('change',{bubbles:true})); return 1;`); await dormir(300);
        const k1 = await S.ev(`const z=document.getElementById('cvc-ct'); return {cases:z.querySelectorAll('input[name=cvcApp]').length, cli:z.dataset.client};`);
        c('choisir le client : les cases de SES appareils apparaissent (4)', k1.cases === 4 && k1.cli === 'c-cvc1', k1);
        await S.ev(`const f=document.querySelector('#modal form'); const sel=f.elements.clientId; sel.value='c-cvc2'; sel.dispatchEvent(new Event('change',{bubbles:true})); return 1;`); await dormir(300);
        const k2 = await S.ev(`const z=document.getElementById('cvc-ct'); return {cases:z.querySelectorAll('input[name=cvcApp]').length};`);
        c('changer de client : la liste suit (1 appareil chez Mme Durand)', k2.cases === 1, k2);
        await S.ev(`const f=document.querySelector('#modal form'); const sel=f.elements.clientId; sel.value='c-cvc1'; sel.dispatchEvent(new Event('change',{bubbles:true})); return 1;`); await dormir(300);
        await geste('#cvc-ct label', souris, 'Chaudière gaz'); await dormir(200);
        await S.ev(`const f=document.querySelector('#modal form'); const set=(n,v)=>{ f.elements[n].value=v; }; const d=new Date(Date.now()-340*864e5).toLocaleDateString('sv-SE'); const fin=new Date(Date.now()+400*864e5).toLocaleDateString('sv-SE');
          set('titre','Contrat d’entretien annuel de la chaufferie et des climatiseurs de la Grande Boulangerie'); set('frequence','annuel'); set('dateDebut',d); set('dateFin',fin); return 1;`);
        const d9 = await deborde('#modal');
        c('⛔ le formulaire de contrat ne déborde pas (zone ' + d9.zone + ' px, page ' + d9.page + ' px)', d9.zone <= 1 && d9.page <= 1 && !d9.hors.length, d9);
        await S.ev(`const e=document.getElementById('cvc-ct'); if(e) e.scrollIntoView({block:'center'}); return 1;`); await capture('8-contrat-form-' + tag);
        await S.ev(`document.querySelector('#modal form').requestSubmit(); return 1;`); await dormir(600);
        const k3 = await S.ev(`const c=db.contrats[0]; return c&&{ids:c.appareilIds, freq:c.frequence, cli:c.clientId, brut:c.cvcApp};`);
        c('enregistrer : le contrat porte SES appareils (la chaudière) — pas de champ brut', !!k3 && k3.ids.join() === 'a-cvc1' && k3.brut === undefined, k3);
        await S.ev(`go('taches'); return 1;`); await dormir(700); await calme();
        const k4 = await S.ev(`const b=document.getElementById('cvc-taches'); return b?[...b.querySelectorAll('.pl-title')].map(x=>x.textContent.trim()):[];`);
        c('Tâches propose la visite du contrat (début il y a 340 jours, annuel : dans 25 jours)', k4.some(t => /^Visite d’entretien — Contrat d’entretien annuel/.test(t)), k4);
        await capture('8-taches-contrat-' + tag);
        const nI2 = await S.ev(`return db.interventions.length;`);
        await S.ev(`const r=[...document.querySelectorAll('#cvc-taches .pl-row')].find(x=>/^\\s*Visite d’entretien/.test(x.textContent)); const b=r&&[...r.querySelectorAll('button')].find(x=>/Planifier/.test(x.textContent)); if(b) b.setAttribute('data-k','visite'); return !!b;`);
        await geste('[data-k=visite]', souris);
        const k5 = await S.ev(`const f=document.getElementById('intform'); return f&&{titre:f.elements.titre.value, contrat:f.elements.contratId&&f.elements.contratId.value, cache:(f.elements.cvcAppareils||{}).value, n:db.interventions.length};`);
        c('« Planifier » : formulaire pré-rempli AVEC le contrat sélectionné et l’appareil caché, rien d’écrit', !!k5 && /^Visite d’entretien/.test(k5.titre) && k5.contrat === (await S.ev(`return db.contrats[0].id;`)) && k5.cache === 'a-cvc1' && k5.n === nI2, k5);
        await S.ev(`document.getElementById('intform').requestSubmit(); return 1;`); await dormir(900); await calme();
        const k6 = await S.ev(`const i=db.interventions[db.interventions.length-1]; return {n:db.interventions.length, contrat:i.contratId, ids:i.appareilIds};`);
        c('valider : l’intervention naît rattachée au contrat, avec ses appareils', k6.n === nI2 + 1 && k6.contrat === (await S.ev(`return db.contrats[0].id;`)) && Array.isArray(k6.ids) && k6.ids.join() === 'a-cvc1', k6);
        const k7 = await S.ev(`go('taches'); await new Promise(r=>setTimeout(r,500)); const b=document.getElementById('cvc-taches'); return b?[...b.querySelectorAll('.pl-title')].map(x=>x.textContent.trim()).filter(t=>/^Visite d’entretien/.test(t)).length:0;`);
        c('la proposition de visite a disparu d’elle-même', k7 === 0, k7);
        await S.ev(`db.contrats=[]; db.interventions=db.interventions.filter(i=>/^i-cvc[12]$/.test(i.id)); save(); return 1;`);
      }

      /* ── 4. Tâches et tableau de bord : les mêmes propositions, jusqu'à l'intervention CRÉÉE par le vrai formulaire ── */
      await S.ev(`go('taches'); return 1;`); await dormir(800); await calme();
      const t1 = await S.ev(`const b=document.getElementById('cvc-taches'); return {bloc:!!b, lignes:b?b.querySelectorAll('.pl-row').length:0, boutons:b?[...b.querySelectorAll('button')].filter(x=>/Planifier/.test(x.textContent)).length:0};`);
      c('Tâches : le bloc « Entretiens à planifier » est en tête, avec des boutons Planifier', t1.bloc && t1.lignes >= 2 && t1.boutons === t1.lignes, t1);
      const d4 = await deborde('#content');
      c('⛔ Tâches ne déborde pas (zone ' + d4.zone + ' px, page ' + d4.page + ' px)', d4.zone <= 1 && d4.page <= 1 && !d4.hors.length, d4);
      const w2 = await largeurTexte('#cvc-taches');
      c('⛔ Tâches : le texte de chaque échéance garde au moins 150 px (' + w2.n + ' lignes, plus étroit : ' + w2.min + ' px)', w2.n >= 2 && w2.min >= 150, w2);
      await capture('4-taches-' + tag);
      await S.ev(`go('dashboard'); return 1;`); await dormir(900); await calme();
      const t2 = await S.ev(`const b=document.getElementById('cvc-dash'); return {bloc:!!b, lignes:b?b.querySelectorAll('.pl-row').length:0};`);
      c('tableau de bord : la carte « Entretiens à planifier » est là', t2.bloc && t2.lignes >= 2, t2);
      const d5 = await deborde('#cvc-dash');
      c('⛔ le tableau de bord ne déborde pas (zone ' + d5.zone + ' px, page ' + d5.page + ' px)', d5.zone <= 1 && d5.page <= 1 && !d5.hors.length, d5);
      const w3 = await largeurTexte('#cvc-dash');
      c('⛔ tableau de bord : le texte de chaque échéance garde au moins 150 px (' + w3.n + ' lignes, plus étroit : ' + w3.min + ' px)', w3.n >= 2 && w3.min >= 150, w3);
      await capture('4-dashboard-' + tag);
      const nI = await S.ev(`return db.interventions.length;`);
      await geste('#cvc-dash button', souris, 'Planifier');
      const p1 = await S.ev(`const f=document.getElementById('intform'); if(!f) return null; return {titre:f.elements.titre.value, date:f.elements.date.value, type:(f.elements.type||{}).value, cache:(f.elements.cvcAppareils||{}).value, n:db.interventions.length};`);
      c('« Planifier » ouvre le formulaire d’intervention PRÉ-REMPLI, sans rien écrire (titre, date, type, appareil caché)', !!p1 && /^Entretien — /.test(p1.titre) && !!p1.date && !!p1.cache && p1.n === nI, p1);
      await capture('5-planifier-' + tag);
      await S.ev(`document.getElementById('intform').requestSubmit(); return 1;`); await dormir(900); await calme();
      const p2 = await S.ev(`const i=db.interventions[db.interventions.length-1]; return {n:db.interventions.length, titre:i.titre, ids:i.appareilIds, client:i.clientId, cache:i.cvcAppareils};`);
      c('⛔ valider crée l’intervention AVEC les appareils visés (liste), et le champ caché ne s’est pas glissé dans la fiche', p2.n === nI + 1 && Array.isArray(p2.ids) && p2.ids.length === 1 && p2.cache === undefined, p2);
      const t3 = await S.ev(`go('taches'); await new Promise(r=>setTimeout(r,500)); const b=document.getElementById('cvc-taches'); return {lignes:b?b.querySelectorAll('.pl-row').length:0};`);
      c('l’échéance planifiée n’est plus proposée (' + t1.lignes + ' → ' + t3.lignes + ')', t3.lignes === t1.lignes - 1, t3);
      await S.ev(`db.interventions=db.interventions.filter(i=>/^i-cvc[12]$/.test(i.id)); save(); return 1;`);

      /* ── la contre-épreuve : le métier d'ELAN (3D) ne voit RIEN de neuf ── */
      await S.ev(`db.metier='3d'; save(); return 1;`);
      await S.ev(`ficheClient('c-cvc1'); return 1;`); await dormir(600); await calme();
      const e1 = await S.ev(`const m=document.getElementById('modal'); return {parc:!!document.getElementById('cvc-parc'), mot:/Appareils/.test(m.textContent)&&/Saunier/.test(m.textContent)};`);
      await S.ev(`closeModal(true); detailIntervention('i-cvc2'); return 1;`); await dormir(700); await calme();
      const e2 = await S.ev(`return {carte:!!document.getElementById('cvc-int'), mot:/Appareils visités/.test(document.getElementById('content').textContent)};`);
      await S.ev(`go('taches'); return 1;`); await dormir(600);
      const e3 = await S.ev(`return {bloc:!!document.getElementById('cvc-taches'), mot:/Entretiens à planifier/.test(document.getElementById('content').textContent)};`);
      await S.ev(`go('dashboard'); return 1;`); await dormir(700);
      const e4 = await S.ev(`return {bloc:!!document.getElementById('cvc-dash'), mot:/Entretiens à planifier/.test(document.getElementById('content').textContent)};`);
      await S.ev(`formIntervention('',{clientId:'c-cvc1',appareilIds:['a-cvc1']}); return 1;`); await dormir(500);
      const e5 = await S.ev(`const f=document.getElementById('intform'); return {champ:!!(f&&f.elements.cvcAppareils)};`);
      c('⛔ métier 3D (ELAN) : ni section, ni carte, ni Tâches, ni tableau de bord — même avec des appareils en base', !e1.parc && !e1.mot && !e2.carte && !e2.mot && !e3.bloc && !e3.mot && !e4.bloc && !e4.mot, { e1, e2, e3, e4 });
      if (PARTIE >= 4) { await S.ev(`closeModal(true); formContrat(); return 1;`); await dormir(500);
        const e6 = await S.ev(`return {zone:!!document.getElementById('cvc-ct')};`); c('⛔ métier 3D : le formulaire de contrat n’a PAS la zone des appareils', !e6.zone, e6); }
      await S.ev(`closeModal(true); db.metier='chauffage'; save(); return 1;`);
    }
  }
  console.log('\nexceptions de la page :', S.exceptions.length, S.exceptions.slice(0, 5));
  console.log('erreurs console :', S.consoleErr.length, S.consoleErr.slice(0, 5));
  c('aucune exception JavaScript, aucune erreur console', !S.exceptions.length && !S.consoleErr.length, { e: S.exceptions.slice(0, 3), c: S.consoleErr.slice(0, 3) });
  console.log('\n══ sonde-cvc partie ' + PARTIE + ' : ' + ok + ' ✓  ' + ko + ' ✗ ══');
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE :', e); process.exit(2); });

/* ══ SONDE — CHAUFFAGE / CLIMATISATION SÉPARÉS + PACKS COMBINÉS (v780) ══════════════════════════════════════════
   Justin, 29 octobre 2026 : « un pack Clim et plomberie séparées », puis « des packs combinés, et des packs séparés de chaque chose ».
   Dans la VRAIE page (beta.html, 127.0.0.1) : on CHOISIT le métier par les gestes de l'écran (la liste « Tester un métier » de la bêta, puis les
   cartes de « Mon métier »), et on relit ce que le pack sert — types, prestations, catalogue, documents, parc d'appareils. Aucune erreur JavaScript. */
const path = require('path');
const { ouvrir, dormir } = require('/home/user/teamop/scratchpad/pilote.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 500) : '')); } };
(async () => {
  const S = await ouvrir({ source: process.env.SOURCE || path.join(__dirname, '..', 'beta.html') });
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await S.ev(`window.horsLigneDebut=function(){}; window.pushPropose=function(){}; window.maybeProfilePhoto=function(){}; window.entAccueilCheck=function(){}; window.confirm=function(){ return true; };
    localStorage.setItem('elanB_lang','fr'); localStorage.setItem('elanB_aside','1'); db.entreprise={nom:'Clim Test'};
    db.users=(db.users||[]).filter(u=>u.id!=='uM').concat([{id:'uM',prenom:'Justin',nom:'Clim',login:'jc',role:'admin',actif:true,pref:{}}]);
    save(); currentUser=db.users.find(u=>u.id==='uM'); enterApp(currentUser); return 1;`);
  await dormir(1500); await S.ev(`try{closeModal(true)}catch(e){} return 1;`);

  /* ce que le pack SERT à l'application (celui que lisent les formulaires, le catalogue de départ, les documents) */
  const lire = () => S.ev(`const p=metierPack(); return {metier:db.metier, plus:db.metierPlus||'', plus2:db.metierPlus2||'', actifs:metierActifs(), combo:metierComboCourant(),
    types:intTypes(), presta:p.presta||[], produits:p.produits||[], docs:(p.documents||[]).map(d=>d.split(' (')[0]), cat:(p.catalogue||[]).length, four:(p.fournisseurs||[]).map(f=>f.nom),
    docm:docmDefsDuMetier().map(d=>d.id), parc:metierGereParc(), releves:(p.releves||[]).map(r=>r.k)}`);
  const choisir = async (valeur) => { await S.ev(`go('parametres'); return 1;`); await dormir(700);
    const r = await S.ev(`const s=document.getElementById('beta-metier'); if(!s) return 'pas de liste'; if(![...s.options].some(o=>o.value===${JSON.stringify(valeur)})) return 'pas d’option '+${JSON.stringify(valeur)};
      s.value=${JSON.stringify(valeur)}; s.dispatchEvent(new Event('change',{bubbles:true})); return 'ok'`);
    await dormir(900); return r; };
  const a = (L, x) => L.includes(x);

  /* 0 · la liste de la bêta offre les deux métiers séparés ET les quatre packs combinés */
  await S.ev(`go('parametres'); return 1;`); await dormir(800);
  const opts = await S.ev(`const s=document.getElementById('beta-metier'); return [...s.options].map(o=>[o.value,o.textContent.trim().replace(/\\s+/g,' ')])`);
  const vals = opts.map(o => o[0]);
  vrai('la liste de la bêta porte « chauffage » ET « climatisation », climatisation juste après chauffage', vals.indexOf('climatisation') === vals.indexOf('chauffage') + 1, vals.slice(0, 8));
  vrai('… et les quatre packs combinés', ['combo:cvc', 'combo:plombier-chauffagiste', 'combo:plomberie-clim', 'combo:plomberie-chauffage-clim'].every(v => vals.includes(v)), vals.slice(-6));
  console.log('   combinés :', opts.filter(o => /^combo:/.test(o[0])).map(o => o[1]).join(' | '));
  vrai('la liste dit « Climatisation / Pompes à chaleur » et « Chauffage » (plus « Chauffage / Climatisation »)', opts.some(o => o[0] === 'climatisation' && /Climatisation \/ Pompes à chaleur/.test(o[1])) && opts.some(o => o[0] === 'chauffage' && /(^|\s)Chauffage$/.test(o[1])), opts.filter(o => /chauff|clim/.test(o[0])));

  /* 1 · climatisation seule */
  console.log('\n── climatisation seule ──');
  vrai('on choisit « climatisation » dans la liste', (await choisir('climatisation')) === 'ok');
  let p = await lire();
  vrai('le métier est climatisation, sans associé', p.metier === 'climatisation' && !p.plus && !p.plus2 && JSON.stringify(p.actifs) === '["climatisation"]', p);
  vrai('types de clim : contrôle d’étanchéité, dépannage climatisation, entretien PAC ; PAS de chaudière ni de ramonage', a(p.types, 'Contrôle d\'étanchéité des fluides frigorigènes') && a(p.types, 'Dépannage climatisation') && a(p.types, 'Entretien pompe à chaleur') && !a(p.types, 'Entretien annuel chaudière') && !a(p.types, 'Ramonage'), p.types);
  vrai('prestations : charge de fluide, récupération du fluide ; pas d’analyse de combustion', a(p.presta, 'Contrôle de la charge de fluide') && a(p.presta, 'Récupération et pesée du fluide') && !a(p.presta, 'Analyse de combustion'), p.presta.length);
  vrai('documents : attestation PAC / clim et fiche fluides (Cerfa 15497) ; pas l’attestation de chaudière', p.docs.some(d => /pompe à chaleur ou de climatisation/.test(d)) && p.docs.some(d => /fluides frigorigènes/.test(d)) && !p.docs.some(d => /de chaudière/.test(d)), p.docs);
  vrai('documents du métier : devis et note de dépannage, suivi de la vignette ; pas de suivi du certificat gaz', a(p.docm, 'devis-depannage') && a(p.docm, 'note-depannage') && a(p.docm, 'suivi-vignette') && !a(p.docm, 'suivi-gaz'), p.docm);
  vrai('catalogue de clim (11 articles propres + 5 communs) et fournisseurs dont Climalife', p.cat === 16 && a(p.four, 'Climalife'), [p.cat, p.four]);
  vrai('relevés de fluide présents, CO ambiant absent', a(p.releves, 'fluideCharge') && a(p.releves, 'bordereau') && !a(p.releves, 'coAmbiant'), p.releves);
  vrai('le parc d’appareils reste ouvert (métier CVC)', p.parc === true);

  /* 2 · chauffage seul */
  console.log('\n── chauffage seul ──');
  vrai('on choisit « chauffage »', (await choisir('chauffage')) === 'ok');
  p = await lire();
  vrai('le métier est chauffage, sans associé', p.metier === 'chauffage' && !p.plus && !p.plus2, p);
  vrai('types : entretien annuel chaudière, ramonage, désembouage ; pas de dépannage climatisation', a(p.types, 'Entretien annuel chaudière') && a(p.types, 'Ramonage') && a(p.types, 'Désembouage') && !a(p.types, 'Dépannage climatisation') && !a(p.types, 'Entretien climatisation'), p.types);
  vrai('l’attestation d’entretien de CHAUDIÈRE est dans les documents du pack', p.docs.some(d => /Attestation d’entretien de chaudière/.test(d)) && p.docs.some(d => /ramonage/i.test(d)), p.docs);
  vrai('relevés de combustion : CO ambiant, CO des fumées ; pas de bordereau de fluide', a(p.releves, 'coAmbiant') && a(p.releves, 'co') && !a(p.releves, 'bordereau'), p.releves);
  vrai('documents du métier : devis, note, suivi du certificat gaz', a(p.docm, 'devis-depannage') && a(p.docm, 'suivi-gaz'), p.docm);
  vrai('le catalogue du chauffage ne porte plus de fluide frigorigène', p.cat === 28 && !a(p.four, 'Climalife'), [p.cat, p.four]);
  vrai('le parc d’appareils reste ouvert', p.parc === true);

  /* 3 · les quatre packs combinés, choisis dans la liste de la bêta */
  const COMBOS = [
    ['combo:cvc', 'Chauffage + Climatisation (CVC)', 'chauffage', ['climatisation'], { types: ['Entretien annuel chaudière', 'Entretien climatisation'], docs: [/de chaudière/, /pompe à chaleur ou de climatisation/, /fluides frigorigènes/], docm: ['suivi-gaz', 'suivi-vignette', 'devis-depannage'] }],
    ['combo:plombier-chauffagiste', 'Plombier-chauffagiste (Plomberie + Chauffage)', 'plomberie', ['chauffage'], { types: ['Débouchage / curage', 'Entretien annuel chaudière'], docs: [/de chaudière/, /ramonage/i], docm: ['rapport-etancheite', 'tva-reduite', 'suivi-gaz', 'devis-depannage'] }],
    ['combo:plomberie-clim', 'Plomberie + Climatisation', 'plomberie', ['climatisation'], { types: ['Débouchage / curage', 'Entretien climatisation', 'Contrôle d\'étanchéité des fluides frigorigènes'], docs: [/pompe à chaleur ou de climatisation/, /fluides frigorigènes/], docm: ['rapport-etancheite', 'suivi-vignette', 'devis-depannage'] }],
    ['combo:plomberie-chauffage-clim', 'Plomberie + Chauffage + Climatisation', 'plomberie', ['chauffage', 'climatisation'], { types: ['Débouchage / curage', 'Entretien annuel chaudière', 'Entretien climatisation'], docs: [/de chaudière/, /pompe à chaleur ou de climatisation/, /fluides frigorigènes/], docm: ['rapport-etancheite', 'suivi-gaz', 'suivi-vignette', 'devis-depannage'] }]
  ];
  for (const [val, nom, princ, assoc, att] of COMBOS) {
    console.log('\n── ' + nom + ' ──');
    vrai('on choisit « ' + nom + ' » dans la liste', (await choisir(val)) === 'ok');
    p = await lire();
    vrai('un seul geste pose le principal (' + princ + ') et les associés (' + assoc.join(' + ') + ')', p.metier === princ && JSON.stringify([p.plus, p.plus2].filter(Boolean)) === JSON.stringify(assoc) && JSON.stringify(p.actifs) === JSON.stringify([princ].concat(assoc)), p);
    vrai('… et l’écran reconnaît le pack (combo courant)', p.combo === val.slice(6), p.combo);
    vrai('les types des métiers réunis, chacun une fois', att.types.every(t => a(p.types, t)) && new Set(p.types).size === p.types.length, p.types);
    vrai('les documents réunis', att.docs.every(re => p.docs.some(d => re.test(d))) && new Set(p.docs).size === p.docs.length, p.docs);
    vrai('les documents du métier (formulaires) réunis', att.docm.every(x => a(p.docm, x)), p.docm);
    vrai('le catalogue et les fournisseurs réunis (sans doublon de nom)', p.cat > 0 && new Set(p.four).size === p.four.length, [p.cat, p.four]);
    const sel = await S.ev(`go('parametres'); return document.getElementById('beta-metier').value`); await dormir(500);
    vrai('la liste de la bêta s’affiche sur le pack combiné choisi', sel === val, sel);
    const carte = await S.ev(`return [...document.querySelectorAll('.met-card.on')].map(e=>e.textContent.replace(/\\s+/g,' ').trim())`);
    vrai('une seule carte « Actif » : celle du pack combiné', carte.length === 1 && carte[0].includes(nom), carte);
    const sec = await S.ev(`const b=document.getElementById('met-plus'), b2=document.getElementById('met-plus2'); return {plus:b&&b.value, plus2:b2&&b2.value}`);
    vrai('« Mon entreprise fait aussi… » montre les associés posés', sec.plus === assoc[0] && (assoc[1] ? sec.plus2 === assoc[1] : true), sec);
  }

  /* 4 · le geste inverse : un associé retiré, un métier simple rechoisi */
  console.log('\n── retours ──');
  await choisir('combo:plomberie-chauffage-clim');
  await S.ev(`metierPlusSet(''); return 1`); await dormir(500);
  p = await lire();
  vrai('retirer le premier associé fait remonter le second (plomberie + climatisation)', p.metier === 'plomberie' && p.plus === 'climatisation' && !p.plus2 && p.combo === 'plomberie-clim', p);
  await choisir('plomberie');
  p = await lire();
  vrai('rechoisir « plomberie » seule garde ses associés (règle d’avant : seul le complément égal au métier part)', p.metier === 'plomberie', p);
  await S.ev(`metierPlusSet(''); metierPlus2Set(''); return 1`); await dormir(300);
  p = await lire();
  vrai('plomberie seule : pas de document de chaudière ni de fluide', !p.docs.some(d => /de chaudière|fluides frigorigènes/.test(d)) && !a(p.types, 'Entretien climatisation'), p.docs);

  /* 5 · la démonstration suit le premier métier, avec les types de SON pack */
  console.log('\n── démonstration ──');
  for (const [val, princ] of [['climatisation', 'climatisation'], ['chauffage', 'chauffage']]) {
    await choisir(val);
    const d = await S.ev(`betaVider&&0; const D=demoSemisDe(), T=intTypes(); return {types:[...new Set(D.planning.map(r=>r[4]))], horsPack:[...new Set(D.planning.map(r=>r[4]))].filter(t=>T.indexOf(t)<0), n:D.planning.length, clients:D.clients.length, geo:D.clients.every(c=>typeof c[3]==='number'&&typeof c[4]==='number')}`);
    vrai(val + ' : le planning de démonstration (' + d.n + ' passages, ' + d.clients + ' clients localisés) n’emploie que des types de son pack', d.horsPack.length === 0 && d.geo && d.n === 13, d);
  }
  await choisir('climatisation');
  await S.ev(`demoCharger(); return 1`); await dormir(1200);
  const parc = await S.ev(`return (db.appareils||[]).filter(a=>a.demo).map(a=>cvcType(a).k)`);
  vrai('la démonstration de la climatisation pose des appareils à fluide (split, PAC, gainable) et aucune chaudière', parc.length >= 2 && parc.every(k => /clim|pac/.test(k)), parc);
  const dm = await S.ev(`return (db.docsMetier||[]).filter(r=>r.demo).map(r=>r.doc)`);
  vrai('… et ses documents d’exemple (devis, note, suivi de la vignette), sans suivi gaz', dm.includes('devis-depannage') && dm.includes('note-depannage') && dm.includes('suivi-vignette') && !dm.includes('suivi-gaz'), dm);
  await S.ev(`demoRetirer&&demoRetirer(); return 1`); await dormir(500);
  await choisir('chauffage');
  await S.ev(`demoCharger(); return 1`); await dormir(1200);
  const parc2 = await S.ev(`return (db.appareils||[]).filter(a=>a.demo).map(a=>cvcType(a).k)`);
  vrai('la démonstration du chauffage ne pose que des chaudières', parc2.length >= 2 && parc2.every(k => /chaudiere/.test(k)), parc2);
  const dm2 = await S.ev(`return (db.docsMetier||[]).filter(r=>r.demo).map(r=>r.doc)`);
  vrai('… avec le suivi du certificat gaz, sans suivi de la vignette', dm2.includes('suivi-gaz') && !dm2.includes('suivi-vignette'), dm2);

  /* 6 · des écrans qui s'ouvrent encore, pour chaque pack */
  console.log('\n── écrans ──');
  for (const val of ['climatisation', 'chauffage', 'combo:cvc', 'combo:plomberie-chauffage-clim']) {
    await choisir(val);
    for (const v of ['dashboard', 'interventions', 'clients', 'produits', 'parametres']) { await S.ev(`go('${v}'); return 1`); await dormir(350); }
  }
  vrai('aucune erreur JavaScript', !S.exceptions.length, S.exceptions.slice(0, 3));
  console.log(`\n════ sonde-metier-clim : ${ok} ✓ ${ko} ✗ ════`);
  await S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); process.exit(1); });

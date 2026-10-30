/* ══ SONDE — OP GESTION ALLÉGÉE (v780) ═══════════════════════════════════════════════════════
   Justin, 29 octobre 2026 : messagerie supprimée, Assistant devis dans Devis, Télécollecte sur demande,
   écrans semblables regroupés. Dans la VRAIE page (beta.html, 127.0.0.1). */
const path = require('path');
const { ouvrir, dormir } = require('/home/user/teamop/scratchpad/pilote.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 400) : '')); } };
(async () => {
  const S = await ouvrir({ source: process.env.SOURCE || path.join(__dirname, '..', 'beta.html') });
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await S.ev(`window.horsLigneDebut=function(){}; window.pushPropose=function(){}; window.maybeProfilePhoto=function(){}; window.entAccueilCheck=function(){};
    localStorage.setItem('elanB_lang','fr'); localStorage.setItem('elanB_aside','1'); db.entreprise={nom:'Plomberie Test'};
    db.users=(db.users||[]).filter(u=>u.id!=='uM').concat([{id:'uM',prenom:'Justin',nom:'Menu',login:'jm',role:'admin',actif:true,pref:{}}]);
    save(); currentUser=db.users.find(u=>u.id==='uM'); enterApp(currentUser); return 1;`);
  await dormir(1500); await S.ev(`try{closeModal(true)}catch(e){} return 1;`);
  const menu = await S.ev(`return [...document.querySelectorAll('#sidebar [onclick*="go("]')].map(e=>(e.textContent||'').trim().replace(/\\s+/g,' ')).filter(Boolean)`);
  console.log('   menu :', menu.join(' | '));
  vrai('« Messagerie » n’est plus au menu', !menu.some(t => /^Messagerie/.test(t)), menu);
  vrai('« Assistant devis », « Planning général », « Mouvements stock », « Conducteurs », « Rapports », « Carte interventions » ne sont plus au menu',
    !menu.some(t => /Assistant devis|Planning général|Mouvements stock|Conducteurs|^Rapports|Carte interventions|Statistiques|Archives/.test(t)), menu);
  await S.ev(`go('messagerie'); return 1;`); await dormir(900);
  vrai('un ancien lien « messagerie » ouvre le tableau de bord', await S.ev(`return current`) === 'dashboard', await S.ev(`return current`));
  vrai('le tableau de bord n’a plus de tuile Messagerie', await S.ev(`return !/Messagerie/.test(document.getElementById('content').textContent)`));
  await S.ev(`go('devis'); return 1;`); await dormir(900);
  vrai('Devis porte le bouton « 🤖 Assistant »', await S.ev(`return [...document.querySelectorAll('button')].some(b=>/Assistant/.test(b.textContent)&&/assistantDevis/.test(b.getAttribute('onclick')||''))`));
  await S.ev(`[...document.querySelectorAll('button')].find(b=>/assistantDevis/.test(b.getAttribute('onclick')||'')).click(); return 1;`); await dormir(900);
  vrai('… et l’ouvre', await S.ev(`return current`) === 'assistantDevis');
  for (const [v, att] of [['planning', ['Planning', 'Planning général']], ['stock', ['Stock', 'Mouvements']], ['interventions', ['Liste', 'Rapports', 'Carte']], ['vehicules', ['Véhicules', 'Conducteurs']]]) {
    await S.ev(`go('${v}'); return 1;`); await dormir(900);
    const r = await S.ev(`const n=document.querySelector('#content .fusion-rangee'); return n?[...n.querySelectorAll('.chip')].map(c=>c.textContent.trim()):null`);
    vrai(v + ' : la rangée « ' + att.join(' · ') + ' » en tête de l’écran', !!r && att.every(a => r.includes(a)), r);
  }
  await S.ev(`go('planning'); return 1;`); await dormir(700);
  await S.ev(`[...document.querySelectorAll('#content .fusion-rangee .chip')].find(c=>/général/.test(c.textContent)).click(); return 1;`); await dormir(900);
  const g = await S.ev(`return {v:current, actif:(document.querySelector('#content .fusion-rangee .chip.active')||{}).textContent}`);
  vrai('un tap sur « Planning général » l’ouvre, et l’onglet s’allume', g.v === 'planningGeneral' && /général/.test(g.actif || ''), g);
  const tel = await S.ev(`return (METIERS.plomberie.rubriques||[]).includes('telecollecte')||(METIERS.plomberie.rubriques||[]).includes('messagerie')`);
  vrai('plomberie : ni Télécollecte ni Messagerie cochées d’office', tel === false);
  vrai('aucune erreur JavaScript', !S.exceptions.length, S.exceptions.slice(0, 3));
  console.log(`\n════ sonde-menu-allege : ${ok} ✓ ${ko} ✗ ════`);
  await S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); process.exit(1); });

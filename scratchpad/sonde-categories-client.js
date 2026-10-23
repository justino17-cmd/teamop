/* SONDE — LES CATÉGORIES RETENUES PAR TEAM OP POUR UNE ENTREPRISE (OP GESTION v772), au navigateur.
   Les bancs (tests/test-2875.js) exécutent les vraies fonctions ; cette sonde les fait tourner DANS la vraie page, avec la
   vraie `renderNav`, la vraie barre d'onglets, la vraie feuille « Créer » et la vraie `go()`.
   Ce qu'on mesure, en administrateur, sur une COPIE de la bêta où SEUL BETA_ESSAI vaut false (la règle de PRODUCTION : la
   bêta, elle, voit tout) et où la réponse de /api/espaces/etat est SIMULÉE dans la page :
     · sans clé `cats` (un serveur d'avant) : rien ne bouge ;
     · une liste [planning, clients, boxes] : le menu, la barre du bas et la feuille « Créer » n'ont plus les rubriques retirées,
       `go('factures')` ramène à l'accueil, `go('planning')` passe ; l'écran qu'on occupait (interventions) est quitté ;
       la rangée Liste · Carte des Box n'offre plus la carte (non retenue) ; rien n'est écrit dans `db` (aucun save()) ;
     · un appareil qui REDÉMARRE garde le réglage même si le serveur ne répond pas (503) ;
     · une réponse illisible n'efface rien ; `cats: null` rouvre tout et retire le réglage de l'appareil ;
     · contre-épreuve : la VRAIE bêta (BETA_ESSAI true) voit tout malgré la liste.
   ⛔ Bêta (copie), 127.0.0.1 seulement. Jamais app.html.
   Usage : node scratchpad/sonde-categories-client.js   ·   CONTRE=beta node …   ·   SOURCE=/chemin/beta.html node … */
const fs = require('fs'), os = require('os'), path = require('path');
fs.mkdirSync(path.join(os.tmpdir(), 'opg-cats'), { recursive: true });
process.env.OPG_COPIE = process.env.OPG_COPIE || path.join(os.tmpdir(), 'opg-cats', 'essai.html');
const { ouvrir, dormir } = require('./pilote.js');
const SOURCE = process.env.SOURCE || path.join(__dirname, '..', 'beta.html');
const CONTRE = process.env.CONTRE || '';

let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '\n      ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 500) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), [a, b]);

/* La copie servie : BETA_ESSAI à false (sauf CONTRE=beta), et un script posé AVANT tous les autres qui rattache l'appareil à
   une entreprise de sonde et simule /api/espaces/etat (la réponse se lit dans sessionStorage : elle survit à un rechargement). */
const INIT = `<script>try{ localStorage.setItem('elanB_sync_team','t-sonde-cats'); localStorage.setItem('elanB_sync_on','1'); }catch(e){}
(function(){ const f0=window.fetch.bind(window); window.__nEtat=0;
  window.fetch=function(u,o){ const s=String((u&&u.url)||u);
    if(/\\/api\\/espaces\\/etat$/.test(s)){ window.__nEtat++;
      let rep=null; try{ rep=JSON.parse(sessionStorage.getItem('__etat')||'null'); }catch(e){}
      if(!rep) return Promise.resolve(new Response('{"error":"sonde"}',{status:503,headers:{'Content-Type':'application/json'}}));
      return Promise.resolve(new Response(JSON.stringify(rep),{status:200,headers:{'Content-Type':'application/json'}})); }
    if(/api\\.teamop\\.fr/.test(s)) return Promise.resolve(new Response('{"error":"sonde"}',{status:503,headers:{'Content-Type':'application/json'}}));
    return f0(u,o); };
})();</script>`;
function copie() {
  let src = fs.readFileSync(SOURCE, 'utf8');
  if ((src.match(/const BETA_ESSAI=true;/g) || []).length !== 1) throw new Error('drapeau BETA_ESSAI : attendu une fois');
  if (CONTRE !== 'beta') src = src.replace('const BETA_ESSAI=true;', 'const BETA_ESSAI=false;');
  if (src.indexOf('<head>') < 0) throw new Error('<head> introuvable');
  src = src.replace('<head>', '<head>' + INIT);
  const f = path.join(os.tmpdir(), 'opg-cats', 'source.html'); fs.writeFileSync(f, src); return f;
}
const ETAT = { ok: true, formule: 'business', quantite: 1, places: 3, paye: true, motif: 'abonnement Stripe (active)', opMessages: false, metier: '', versionMin: 0, enLigne: 0, suspendu: false, sursisJours: null };
const CLES = ['statistiques', 'historique', 'archives', 'planning', 'planningGeneral', 'taches', 'absences', 'interventions', 'rapports', 'carteInt', 'registre', 'carteBox', 'clients', 'devis', 'assistantDevis', 'factures', 'contrats', 'comptabilite', 'devisXylo', 'telecollecte', 'produits', 'stock', 'mouvements', 'boxes', 'saisieConso', 'enveloppes', 'pointage', 'vehicules', 'conducteurs', 'messagerie', 'boiteMail', 'fournisseurs', 'bons', 'brouillon', 'demandes', 'validations', 'commandes', 'secteurs'];

(async () => {
  const P = await ouvrir({ source: copie() });
  const { ev } = P;
  try {
    console.log('\n══ ' + path.basename(SOURCE) + (CONTRE === 'beta' ? ' — la VRAIE bêta (BETA_ESSAI true)' : ' — copie en règle de production (BETA_ESSAI false)') + ' · version ' + P.version + ' ══');
    const poser = rep => ev(`sessionStorage.setItem('__etat', ${JSON.stringify(JSON.stringify(rep))}); return 1;`);
    const entrer = () => ev(`window.confirm=()=>true; window.alert=()=>{}; window.prompt=(q,d)=>d||'';
      window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
      if(!db.users.some(u=>u.id==='sonde-admin')){ db.users.push({id:'sonde-admin',prenom:'Sonde',nom:'Admin',login:'sonde',role:'admin',actif:true,essai:true}); save(); }
      currentUser=db.users.find(u=>u.id==='sonde-admin');
      try{ ['onboarded_','push_ask_','photo_prompt_'].forEach(k=>localStorage.setItem('elanB_'+k+currentUser.id,'1')); }catch(e){}
      enterApp(currentUser);
      window.__toasts=[]; const t0=window.toast; window.toast=function(m){ window.__toasts.push(String(m)); return t0.apply(this,arguments); };
      window.__saves=0; const s0=window.save; window.save=function(){ window.__saves++; return s0.apply(this,arguments); };
      return typeof catBloque==='function';`);
    /* ce que la page MONTRE : menu, barre du bas, feuille « Créer » — lus dans le DOM et dans les vraies fonctions de la page */
    const etat = () => ev(`return {
      menu:[...document.querySelectorAll('#nav .nav-item[data-view]')].map(e=>e.dataset.view),
      barre:[...document.querySelectorAll('[data-tab]')].map(e=>e.dataset.tab),
      creer:creerDispo().map(e=>e.k),
      courant:current, stocke:localStorage.getItem('elanB_cats'), saves:window.__saves, toasts:window.__toasts.slice(-3) };`);
    const attendre = async (cond, ms = 4000) => { for (let i = 0; i < ms / 100; i++) { if (await ev('return !!(' + cond + ')')) return true; await dormir(100); } return false; };

    await poser(ETAT);
    vrai('la page se charge (copie locale, rattachée à une entreprise de sonde) et expose catBloque', await entrer() === true);
    await dormir(300);
    const E0 = await etat();
    vrai('(population) sans réglage le menu montre ≥ 30 rubriques, la barre ≥ 3 onglets, la feuille « Créer » ≥ 3 entrées', E0.menu.length >= 30 && E0.barre.length >= 3 && E0.creer.length >= 3, [E0.menu.length, E0.barre, E0.creer.length]);
    const complet = E0.menu.slice();

    console.log('\n── 1. sans clé `cats` : rien ne bouge ──');
    await ev(`await forfaitServeurSync(true); return 1;`); await dormir(200);
    const E1 = await etat();
    egal('le menu est identique, rien n\'est rangé sur l\'appareil', [E1.menu, E1.stocke], [complet, null]);

    console.log('\n── 2. une liste : planning, clients, boxes ──');
    await ev(`go('interventions'); return 1;`); await dormir(500);
    vrai('(témoin) on occupe « interventions »', (await etat()).courant === 'interventions');
    await poser(Object.assign({}, ETAT, { cats: ['planning', 'clients', 'boxes'] }));
    await ev(`window.__saves=0; await forfaitServeurSync(true); return 1;`); await dormir(600);
    const E2 = await etat(), garde = ['dashboard', 'planning', 'clients', 'boxes', 'utilisateurs', 'modulesElan'];
    if (CONTRE === 'beta') {
      egal('⛔ LA VRAIE BÊTA voit tout malgré la liste : menu complet', E2.menu, complet);
    } else {
      egal('⛔ le MENU ne montre que les trois rubriques retenues + l\'accueil, l\'équipe et les modules', E2.menu.slice().sort(), garde.slice().sort());
      vrai('⛔ la BARRE du bas n\'a aucune rubrique retirée', E2.barre.filter(k => k !== '_plus').length >= 3 && E2.barre.every(k => k === '_plus' || garde.indexOf(k) >= 0), E2.barre);   // « _plus » = le bouton « Toutes les catégories », pas une rubrique
      vrai('⛔ la feuille « Créer » n\'offre aucune rubrique retirée', E2.creer.every(k => garde.indexOf(k) >= 0), E2.creer);
      vrai('… l\'écran occupé (interventions, retiré) est quitté pour l\'accueil, avec un message', E2.courant === 'dashboard' && E2.toasts.some(t => /plus ouverte à ton entreprise/.test(t)), [E2.courant, E2.toasts]);
      const refus = {};
      for (const k of ['factures', 'interventions', 'stock', 'comptabilite', 'carteBox', 'pointage']) { await ev(`go('${k}'); return 1;`); await dormir(250); refus[k] = (await etat()).courant; }
      vrai('⛔ go() REFUSE chaque rubrique retirée (retour à l\'accueil), administrateur compris', Object.values(refus).every(c => c === 'dashboard'), refus);
      await ev(`go('planning'); return 1;`); await dormir(500);
      vrai('… et go(\'planning\') passe', (await etat()).courant === 'planning');
      await ev(`go('boxes'); return 1;`); await dormir(600);
      const chips = await ev(`return [...document.querySelectorAll('#content nav.filters .chip')].map(e=>e.textContent.trim());`);
      vrai('… la rangée Liste · Carte des Box n\'offre plus la carte (non retenue) ; la liste, si', chips.indexOf('Carte') < 0 && chips.indexOf('Liste') >= 0, chips);
      const touche = await ev(`const L=['factures','interventions','stock','comptabilite']; return {rech:L.filter(k=>rechVoit(k)).length, notif:L.filter(k=>notifVoitModule(k)).length};`);
      vrai('… ni la recherche du bandeau ni les notifications ne montrent une rubrique retirée', touche.rech === 0 && touche.notif === 0, touche);
    }
    vrai('⛔ rien n\'est écrit dans les données de l\'entreprise : aucun save() déclenché par la lecture du réglage', E2.saves === 0, E2.saves);
    egal('… le réglage vit sur l\'APPAREIL (elanB_cats)', JSON.parse(E2.stocke), ['boxes', 'clients', 'planning']);
    const dbSansCats = await ev(`return !JSON.stringify(db).match(/"cats"/);`);
    vrai('… et `db` ne porte aucune clé « cats » (rien ne part à la synchro d\'équipe)', dbSansCats === true);

    console.log('\n── 3. une réponse illisible n\'efface rien ──');
    for (const mauvais of ['planning', 42, {}, ['x1', 'x2']]) {
      await poser(Object.assign({}, ETAT, { cats: mauvais })); await ev(`await forfaitServeurSync(true); return 1;`); await dormir(150);
    }
    await poser(ETAT); await ev(`await forfaitServeurSync(true); return 1;`); await dormir(150);   // le serveur d'avant (clé absente)
    const E3 = await etat();
    egal('texte, nombre, objet, liste d\'inconnues, puis clé absente : le réglage d\'avant tient', JSON.parse(E3.stocke), ['boxes', 'clients', 'planning']);
    if (CONTRE !== 'beta') egal('… et le menu aussi', E3.menu.slice().sort(), garde.slice().sort());

    console.log('\n── 4. un appareil qui redémarre, serveur muet (503) ──');
    await ev(`sessionStorage.removeItem('__etat'); return 1;`);
    await P.c.envoyer('Page.reload', {});
    let pret = false; for (let i = 0; i < 200; i++) { await dormir(250); try { if (await ev('return typeof db!=="undefined"&&!!db&&typeof enterApp==="function"')) { pret = true; break; } } catch (e) {} }
    vrai('la page est rechargée', pret);
    await entrer(); await dormir(500);
    const E4 = await etat();
    if (CONTRE === 'beta') egal('la vraie bêta : tout est là après rechargement', E4.menu, complet);
    else egal('⛔ le réglage est relu sur l\'appareil SANS réponse du serveur : le menu est resté réduit', E4.menu.slice().sort(), garde.slice().sort());

    console.log('\n── 5. `cats: null` : tout revient ──');
    await poser(Object.assign({}, ETAT, { cats: null }));
    await ev(`await forfaitServeurSync(true); return 1;`); await dormir(500);
    const E5 = await etat();
    egal('le menu est complet de nouveau', E5.menu, complet);
    vrai('… le réglage est retiré de l\'appareil', E5.stocke === null, E5.stocke);
    await ev(`go('factures'); return 1;`); await dormir(500);
    vrai('… go(\'factures\') passe', (await etat()).courant === 'factures');

    console.log('\n── 6. la console ──');
    vrai('aucune exception JavaScript pendant toute la sonde', P.exceptions.length === 0, P.exceptions);
  } catch (e) { ko++; console.log('  ✗ la sonde a levé : ' + (e && e.stack || e)); }
  finally { P.fermer(); }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();

/* ══ SONDE — NOUVELLES ENTREPRISES : TOUT VIDE, LES CATALOGUES FOURNISSEURS RESTENT CHEZ ELAN ══════
   Justin, 23 septembre 2026 : « chaque entreprise démarre avec tout vide, c'est à eux de remplir ».
   Dans une vraie page (bêta locale), une entreprise NEUVE : l'écran Produits, sa recherche, la
   fenêtre des catalogues appelée directement, et la feuille « Produits de la box ». Puis la
   CONTRE-ÉPREUVE sur la même page : le pack 3D posé (ce qu'ELAN a), tout doit se rouvrir.
   ⛔ On compte la population (0 produit, 0 fournisseur au départ — puis 160 après le pack) : un
   « rien n'apparaît » sur une page qui n'a pas rendu l'écran ne prouverait rien.
   ⛔ SOURCE=<bêta d'avant> : la porte y est ouverte. ⛔ Bêta uniquement, 127.0.0.1 uniquement. */
const path = require('path');
const { ouvrir } = require(path.join(__dirname, 'pilote.js'));
let ok = 0, ko = 0; const vrai = (t, c, d) => { c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c || d === undefined ? '' : '  → ' + JSON.stringify(d))); };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);

(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 402, height: 874, deviceScaleFactor: 1, mobile: true });
  const pop = await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    window.__toasts=[]; const t0=window.toast; window.toast=function(m){ window.__toasts.push(String(m)); return t0.apply(this,arguments); };
    db.users=[{id:'uA',prenom:'Justin',nom:'Roux',login:'justin',role:'admin',actif:true,pref:{}}];
    db.boxes=[{id:'b1',nom:'Box du camion',numero:'B-01',stock:{}}];
    save(); const u=db.users[0]; currentUser=u; enterApp(u); try{ setPlatForce('iosweb'); }catch(e){}
    await new Promise(r=>setTimeout(r,1400)); try{ closeModal(true); }catch(e){} const f=document.getElementById('fdr-banner'); if(f) f.remove();
    return {produits:(db.produits||[]).length, fournisseurs:(db.fournisseurs||[]).length};`);
  console.log('\n══ 0. LA POPULATION : une entreprise neuve ══');
  v('0 produit, 0 fournisseur — c’est l’état d’une entreprise qui arrive', pop, { produits: 0, fournisseurs: 0 });

  const produits = (q) => S.ev(`prdSearch=${JSON.stringify(q || '')}; go('produits'); await new Promise(r=>setTimeout(r,700));
    const head=document.getElementById('content-head')||document.querySelector('.topbar'); const tout=document.body.innerText;
    const c=document.getElementById('content');
    return {vue:current, fournBtn:!!document.querySelector('button[onclick="openFourCat()"]'),
      onglets:[...c.querySelectorAll('.filters .chip')].map(e=>e.textContent.trim()),
      pont:/dans les catalogues fournisseurs/.test(c.innerText), vide:/Ton catalogue est vide/.test(c.innerText),
      rendu:c.innerText.length};`);
  const feuille = () => S.ev(`try{ closeModal(true); }catch(e){} boxView='b1'; openBoxProduits(); await new Promise(r=>setTimeout(r,600));
    const o=document.getElementById('bxp-onglets'); const corps=document.getElementById('bxp-corps');
    const r={onglets:o?[...o.querySelectorAll('.chip')].map(e=>e.textContent.replace(/\\d+/g,'').replace(/[()]/g,'').trim()):null, texte:corps?corps.innerText:''};
    bxpOngletChoisir('four'); await new Promise(r=>setTimeout(r,300)); r.apresFour=bxpOnglet; try{ closeModal(true); }catch(e){} return r;`);

  console.log('\n══ 1. ⛔⛔ L’ENTREPRISE NEUVE : L’ÉCRAN PRODUITS ══');
  const P0 = await produits('');
  v('l’écran Produits est rendu', [P0.vue, P0.rendu > 20], ['produits', true]);
  vrai('⛔⛔ pas de bouton « 🏭 Fournisseurs »', !P0.fournBtn, P0);
  v('⛔ pas d’onglets « Mes produits / Catalogue 3D (nuisibles) »', P0.onglets, []);
  vrai('le catalogue vide le dit, et dit comment le remplir', P0.vide, P0);
  const P1 = await produits('insecticide');
  vrai('⛔⛔ une recherche ne propose plus « N produits dans les catalogues fournisseurs »', !P1.pont, P1);
  const F0 = await S.ev(`window.__toasts=[]; try{ closeModal(true); }catch(e){} openFourCat(); await new Promise(r=>setTimeout(r,300));
    const o=document.getElementById('overlay'); const ouvert=!!(o&&o.classList.contains('open')&&/Catalogues fournisseurs/.test(o.innerText)); try{ closeModal(true); }catch(e){}
    return {ouvert, toasts:window.__toasts.slice(), produits:db.produits.length};`);
  vrai('⛔⛔ la fenêtre des catalogues, appelée directement, ne s’ouvre pas — et l’écran dit quoi faire', !F0.ouvert && F0.toasts.some(t => /＋ Produit/.test(t)), F0);

  console.log('\n══ 2. ⛔⛔ L’ENTREPRISE NEUVE : LA FEUILLE « PRODUITS DE LA BOX » ══');
  const B0 = await feuille();
  vrai('population : la feuille est rendue, avec ses onglets', Array.isArray(B0.onglets) && B0.onglets.length >= 2, B0);
  vrai('⛔⛔ pas d’onglet « Fournisseurs »', B0.onglets && !B0.onglets.includes('Fournisseurs'), B0.onglets);
  vrai('⛔ le texte ne renvoie plus vers lui : il dit où créer un produit', /Ton catalogue est encore vide/.test(B0.texte) && /Produits/.test(B0.texte) && !/onglet Fournisseurs/.test(B0.texte), B0.texte.slice(0, 200));
  v('⛔ et l’onglet ne s’ouvre pas même forcé', B0.apresFour, 'ajouter');
  const n0 = await S.ev(`return {produits:db.produits.length, fournisseurs:db.fournisseurs.length};`);
  v('… et rien n’est entré dans la base', n0, { produits: 0, fournisseurs: 0 });

  console.log('\n══ 3. CONTRE-ÉPREUVE : LE PACK 3D POSÉ (CE QU’ELAN A) ══');
  const n1 = await S.ev(`cataloguePoser(db,{}); save(); return {produits:db.produits.length, enPlace:catalogueEnPlace()};`);
  vrai('population : le pack est posé (160 produits), le catalogue est « en place »', n1.produits >= 150 && n1.enPlace, n1);
  const P2 = await produits('');
  vrai('le bouton « 🏭 Fournisseurs » revient', P2.fournBtn, P2);
  vrai('les onglets reviennent, catalogue compris', P2.onglets.length === 3 && P2.onglets.some(t => /Catalogue 3D/.test(t)), P2.onglets);
  const P3 = await produits('insecticide');
  vrai('la recherche propose de nouveau les catalogues fournisseurs', P3.pont, P3);
  const B1 = await feuille();
  vrai('l’onglet « Fournisseurs » revient dans la box, et s’ouvre', B1.onglets && B1.onglets.includes('Fournisseurs') && B1.apresFour === 'four', B1);

  console.log('\n══ 4. AUCUNE ERREUR ══');
  v('exceptions', S.exceptions, []);
  console.log(`\n════ sonde-tout-vide : ${ok} ✓ ${ko} ✗ ════\n`);
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE :', e && e.stack || e); process.exit(2); });

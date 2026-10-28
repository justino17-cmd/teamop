/* Sonde v779 : LES MÉTIERS COMBINÉS, AU NAVIGATEUR, AVEC UN VRAI save() — plomberie, puis la clim associée dans « Mon métier ».
   node scratchpad/metiers/sonde-multi.js     (beta.html régénérée avant : `node beta-build.js`, et NON commitée)
   Bêta servie sur 127.0.0.1 (jamais app.html, jamais teamop.fr). Ce que la sonde regarde, dans l'ordre :
   · le geste est fait par le DOM (la case à cocher de Paramètres, le sélecteur de la bêta), pas par un appel de fonction ;
   · la liste des rubriques masquées se RECENSE dans le menu rendu (le DOM), jamais dans une liste écrite à la main ;
   · un save() réel : la clé naît, elle est rangée, et un second save() sans geste ne pose AUCUN _m de plus ;
   · zéro erreur JavaScript pendant tout le parcours (menu, types, catégories, documents, démonstration, fiche d'intervention).
   Population comptée avant chaque absence. */
const { demarrer, dormir } = require('./lib.js');
(async () => {
  const S = await demarrer({ demo: false }); let ok = 0, ko = 0;
  const v = (n, c, d) => { c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + n + (d !== undefined ? ' — ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 300) : '')); };
  const texte = async (sel) => S.ev(`const e=document.querySelector(${JSON.stringify(sel)}); return e?e.textContent:'';`);
  console.log('version servie : ' + S.version);
  await S.ev(`window.confirm=()=>true; go('parametres'); return 1;`); await dormir(1500); await S.ranger();

  console.log('\n1. Le métier principal : plomberie, par le sélecteur de la bêta');
  await S.ev(`const s=document.getElementById('beta-metier'); s.value='plomberie'; s.dispatchEvent(new Event('change')); return 1;`); await dormir(900);
  let r = await S.ev(`return { m:db.metier, assoc:('metiersAssocies' in db), actifs:metiersActifs(), bloc:!!document.getElementById('met-assoc'), cases:document.querySelectorAll('#met-assoc input[type=checkbox]').length, disabled:[...document.querySelectorAll('#met-assoc input:disabled')].map(i=>i.dataset.metier) };`);
  v('plomberie réglée, la clé `metiersAssocies` n\'existe pas encore (rien n\'est écrit tant qu\'on n\'a rien coché)', r.m === 'plomberie' && r.assoc === false, r);
  v('   le bloc « Métiers associés » est là : 23 cases, dont une seule grisée (le principal)', r.bloc && r.cases === 23 && r.disabled.join() === 'plomberie', [r.cases, r.disabled]);
  const menuAvant = await S.ev(`return [...document.querySelectorAll('#nav .nav-item, #nav a, #nav button')].map(x=>x.textContent.trim().replace(/\\s+/g,' ')).filter(Boolean);`);
  v('le menu (recensé dans le DOM) : population non vide', menuAvant.length > 15, menuAvant.length);
  const typesAvant = await S.ev(`return intTypes().slice();`);
  const lsAvant = await S.ev(`return localStorage.getItem(STORE_KEY)||'';`);
  const m0 = await S.ev(`return JSON.stringify(db).match(/"_m":/g)?.length||0;`);

  console.log('\n2. ＋ Chauffage / Climatisation : la case à cocher, comme le fait l\'administrateur');
  await S.ev(`const c=document.querySelector('#met-assoc input[data-metier="chauffage"]'); c.click(); return 1;`); await dormir(900);
  r = await S.ev(`const ent=db.metiersAssocies&&db.metiersAssocies.chauffage; return { ent, actifs:metiersActifs(), nom:metierPack().nom, coche:!!(document.querySelector('#met-assoc input[data-metier="chauffage"]')||{}).checked, parc:metierGereParc(), t3d:estMetier3D() };`);
  v('la clé naît par le geste : { on:1, _m }', r.ent && r.ent.on === 1 && r.ent._m > 1.7e12, r.ent);
  v('   la liste effective : plomberie puis chauffage ; le pack porte les deux noms', JSON.stringify(r.actifs) === '["plomberie","chauffage"]' && r.nom === 'Plomberie + Chauffage / Climatisation', r);
  v('   la case est cochée après le redessin de l\'écran', r.coche);
  v('   le parc d\'appareils est ouvert (la clim), pas l\'anti-nuisibles', r.parc === true && r.t3d === false, r);
  const ls = await S.ev(`const j=JSON.parse(localStorage.getItem(STORE_KEY)||'{}'); return { range: !!(j.metiersAssocies&&j.metiersAssocies.chauffage), metier:j.metier };`);
  v('⛔ un VRAI save() : la clé est rangée avec la base (localStorage)', ls.range && ls.metier === 'plomberie', ls);
  const m1 = await S.ev(`return JSON.stringify(db).match(/"_m":/g)?.length||0;`);
  await S.ev(`save(); save(); save(); return 1;`); await dormir(400);
  const m2 = await S.ev(`return JSON.stringify(db).match(/"_m":/g)?.length||0;`);
  v('⛔ trois save() sans geste : aucun _m de plus (la garde anti-boucle de la synchro)', m2 === m1, [m0, m1, m2]);
  const j1 = await S.ev(`return db.journal.filter(l=>/Métier associé/.test(l.t||l.titre||l.a||JSON.stringify(l))).length;`);
  v('   une ligne de journal « Métier associé » (population : le journal en porte)', j1 === 1, j1);

  console.log('\n3. Le menu, les types, les catégories, les documents');
  const menuApres = await S.ev(`return [...document.querySelectorAll('#nav .nav-item, #nav a, #nav button')].map(x=>x.textContent.trim().replace(/\\s+/g,' ')).filter(Boolean);`);
  v('« Boxes » reste masqué (intersection des deux masques) — recensé dans le menu rendu', !menuApres.some(t => /^\W*Boxes?\b/i.test(t)) && !menuAvant.some(t => /^\W*Boxes?\b/i.test(t)), menuApres.filter(t => /box/i.test(t)));
  v('   le menu n\'a perdu aucune rubrique en associant (le combiné ne ferme rien de plus)', menuAvant.every(t => menuApres.includes(t)), menuAvant.filter(t => !menuApres.includes(t)));
  const types = await S.ev(`return intTypes().slice();`);
  const tChauf = await S.ev(`return METIERS.chauffage.types.slice();`);
  v('types d\'intervention : ceux des DEUX métiers, la plomberie d\'abord', typesAvant.every(t => types.includes(t)) && tChauf.every(t => types.includes(t)) && types[0] === typesAvant[0] && new Set(types).size === types.length, [typesAvant.length, tChauf.length, types.length]);
  await S.ev(`formIntervention(); return 1;`); await dormir(700);
  const opts = await S.ev(`return [...document.querySelectorAll('.modal select[name=type] option, #overlay select[name=type] option')].map(o=>o.value||o.textContent.trim());`);
  v('   le formulaire d\'intervention les propose (recensé dans les <option> du DOM)', opts.length >= types.length && types.every(t => opts.includes(t)), [opts.length, types.length]);
  await S.ev(`closeModal(); return 1;`);
  const cats = await S.ev(`return categoriesProduit();`);
  const cP = await S.ev(`return [METIERS.plomberie.produits, METIERS.chauffage.produits];`);
  v('catégories de produits : l\'union', cP[0].every(c => cats.includes(c)) && cP[1].every(c => cats.includes(c)) && cats.length >= Math.max(cP[0].length, cP[1].length), [cP[0].length, cP[1].length, cats.length]);
  await S.ev(`formProduit(); return 1;`); await dormir(700);
  const catOpts = await S.ev(`return [...document.querySelectorAll('#overlay select option, .modal select option')].map(o=>o.textContent.trim());`);
  v('   le formulaire « ＋ Produit » les propose', cats.every(c => catOpts.some(o => o.includes(c))), cats.filter(c => !catOpts.some(o => o.includes(c))));
  await S.ev(`closeModal(); return 1;`);
  const docs = await S.ev(`return { d:metierPack().documents, a:METIERS.plomberie.documents, b:METIERS.chauffage.documents };`);
  v('documents du métier : l\'union (aucun écran ne les lit encore — la branche des packs les installe)', docs.a.every(x => docs.d.includes(x)) && docs.b.every(x => docs.d.includes(x)), [docs.a.length, docs.b.length, docs.d.length]);

  console.log('\n4. La démonstration alterne les deux métiers (vrai demoCharger)');
  await S.ev(`window.confirm=()=>true; demoCharger(); return 1;`); await dormir(1800); await S.ranger();
  const dem = await S.ev(`const P=METIERS.plomberie.types, C=METIERS.chauffage.types; const l=db.interventions.filter(i=>i.demo); return { n:l.length, p:l.filter(i=>P.includes(i.type)&&!C.includes(i.type)).length, c:l.filter(i=>C.includes(i.type)&&!P.includes(i.type)).length, hors:l.filter(i=>!P.includes(i.type)&&!C.includes(i.type)).map(i=>i.type), nuis:l.filter(i=>/dératis|désinsect/i.test(i.titre||'')).length };`);
  v('population : des interventions de démonstration (' + dem.n + ')', dem.n >= 10, dem);
  v('   les deux métiers y sont joués, sans mot de l\'anti-nuisibles', dem.p >= 3 && dem.c >= 3 && dem.hors.length === 0 && dem.nuis === 0, dem);

  console.log('\n5. La fiche d\'une intervention de chaque métier montre les prestations et relevés des DEUX');
  const ids = await S.ev(`const C=METIERS.chauffage.types; const i1=db.interventions.find(i=>i.demo&&C.includes(i.type)&&!METIERS.plomberie.types.includes(i.type)); const i2=db.interventions.find(i=>i.demo&&METIERS.plomberie.types.includes(i.type)&&!C.includes(i.type)); return [i1&&i1.id,i2&&i2.id];`);
  v('population : une intervention de chaque métier existe', !!ids[0] && !!ids[1], ids);
  for (const id of ids) {
    await S.ev(`go('interventions'); detailIntervention(${JSON.stringify(id)}); intEdit=true; intTab='general'; renderIntDetail(${JSON.stringify(id)}); return 1;`); await dormir(900);   // le mode ✏️ : toutes les prestations et tous les relevés se proposent
    const f = await S.ev(`const t=document.body.innerText; return { presta:['Remplacement de pièce','Mise en service et essai'].filter(x=>t.includes(x)), clim:METIERS.chauffage.presta.slice(0,3).filter(x=>t.includes(x)), releves:['Pression relevée','Teneur en CO'].filter(x=>t.includes(x)) };`);
    v('   fiche ' + String(id).slice(0, 5) + ' : prestations de la plomberie ET de la clim, relevés des deux (lus dans le DOM)', f.presta.length >= 1 && f.clim.length >= 1 && f.releves.length === 2, f);
    await S.ev(`intEdit=false; return 1;`); await S.ranger();
  }
  const parc = await S.ev(`const c=db.clients.find(x=>x.demo); ficheClient(c.id); return new Promise(r=>setTimeout(()=>r(document.body.innerText.includes('Appareils')),700));`);
  v('le parc d\'appareils apparaît sur la fiche d\'un client (plomberie + clim)', parc === true);
  await S.ranger();

  console.log('\n6. La 3D associée : la traçabilité légale, sans « Nuisibles » sur une fuite');
  await S.ev(`metierAssocSet('3d',true); return 1;`); await dormir(600);
  const t3 = await S.ev(`const nu=()=>[...document.querySelectorAll('#content *')].filter(e=>e.children.length===0&&/Nuisible/.test(e.textContent)).map(e=>e.textContent.trim().slice(0,60)); const ov=()=>((document.getElementById('content')||{}).innerText||''); const marq=/Traitements par type|Nuisible/;
    const ouvrir=async(i)=>{ go('interventions'); await new Promise(r=>setTimeout(r,500)); detailIntervention(i.id); intEdit=false; intTab='general'; renderIntDetail(i.id); await new Promise(r=>setTimeout(r,900)); return { texte:ov(), lignes:nu(), fiche:window._curIntId===i.id }; };
    const f=db.interventions.find(i=>i.demo&&i.type==='Dépannage fuite')||db.interventions.find(i=>i.demo&&METIERS.plomberie.types.includes(i.type)&&!METIERS.chauffage.types.includes(i.type));
    const a=await ouvrir(f);
    /* la MÊME fiche de démonstration, passée en type 3D : elle se rouvre sans doute (une seconde fiche reste derrière le rafraîchissement automatique de la première) */
    const typeAvant=f.type; f.type='Dératisation'; intEdit=false; intTab='general'; renderIntDetail(f.id); await new Promise(r=>setTimeout(r,900));
    const b={ texte:ov(), lignes:nu(), fiche:window._curIntId===f.id }; f.type=typeAvant;
    return { fuite:marq.test(a.texte), lfuite:a.lignes, ficheFuite:a.fiche, derat:marq.test(b.texte), lderat:b.lignes, ficheDerat:b.fiche, t3d:estMetier3D(), princ:est3DPrincipal(), zones:libZones() };`);
  v('3D associée : estMetier3D vrai, 3D principale fausse, vocabulaire du principal (« Zones concernées »)', t3.t3d === true && t3.princ === false && t3.zones === 'Zones concernées', t3);
  v('   une fuite ne montre pas le bloc 3D ; une dératisation, si (deux vraies fiches ouvertes : population)', t3.ficheFuite === true && t3.ficheDerat === true && t3.fuite === false && t3.derat === true, t3);
  await S.ev(`metierAssocSet('3d',false); return 1;`); await dormir(400);

  console.log('\n7. La Tour change le principal : l\'associé devenu principal sort de la liste, sans écriture');
  const tour = await S.ev(`const d0=JSON.stringify(db.metiersAssocies); const r=metierServeurAppliquer({metier:'chauffage'}); await new Promise(r=>setTimeout(r,500)); return { r, actifs:metiersActifs(), dict:JSON.stringify(db.metiersAssocies)===d0, nom:metierPack().nom };`);
  v('principal = chauffage (déjà associé) : il sort des associés, le dictionnaire est intact', tour.r === true && tour.actifs.join() === 'chauffage' && tour.dict, tour);
  await S.ev(`metierServeurAppliquer({metier:'plomberie'}); return 1;`); await dormir(400);

  console.log('\n8. « Plomberie + Chauffage / Clim » en un geste, et le retrait');
  await S.ev(`go('parametres'); metierAssocSet('chauffage',false); metierSet('electricite'); return 1;`); await dormir(900);
  await S.ev(`document.querySelector('button[onclick="betaPlombClim()"]').click(); return 1;`); await dormir(900);
  const bp = await S.ev(`return { m:db.metier, actifs:metiersActifs(), ent:db.metiersAssocies.chauffage };`);
  v('le bouton pose plomberie PUIS associe la clim', bp.m === 'plomberie' && bp.actifs.join() === 'plomberie,chauffage' && bp.ent.on === 1, bp);
  await S.ev(`document.querySelector('#met-assoc input[data-metier="chauffage"]').click(); return 1;`); await dormir(700);
  const ret = await S.ev(`return { ent:db.metiersAssocies.chauffage, actifs:metiersActifs() };`);
  v('décocher écrit on:0 (la clé reste, pour voyager)', ret.ent && ret.ent.on === 0 && ret.actifs.join() === 'plomberie', ret);

  console.log('\n9. Zéro erreur JavaScript pendant tout le parcours');
  v('aucune exception non rattrapée', S.exceptions.length === 0, S.exceptions.slice(0, 3));
  const err = S.consoleErr.filter(e => !/net::ERR|Failed to load resource|favicon|fonts\.g|ERR_/.test(e));
  v('aucune erreur console (hors réseau, absent du conteneur)', err.length === 0, err.slice(0, 3));

  console.log(`\n${ok} ✓ ${ko} ✗`); try { S.fermer(); } catch (e) {} process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

/* ══ SONDE — LES DROITS DE DÉPART DANS LA VRAIE PAGE (v752) ═══════════════════════════════════════
   `migrate()` écrit les tables de rôle d'une entreprise NEUVE sans geste de l'utilisateur : la règle
   du dépôt veut que ça se mesure au navigateur, sur la bêta, après un vrai `save()` — pas au banc.
   Deux passages, chacun sur un profil de navigateur VIERGE (une entreprise neuve) :
     A. appareil par défaut ;
     B. appareil qui AFFICHE les modules mis de côté (`elan_aside`, réglage d'appareil) — la reprise
        de la v751 recopiait ce réglage dans les droits de toute l'entreprise.
   Pour chacun : la base ENREGISTRÉE porte les cinq tables complètes, puis on se connecte vraiment
   (enterApp) avec un compte de chaque rôle et on relève le MENU dessiné.
   ⛔ Bêta locale, 127.0.0.1, données fictives. SOURCE=<bêta d'avant> pour la contre-épreuve : la
   v751 doit tomber (« Assistant devis » au menu du technicien, « Devis xylophage » selon l'appareil). */
const path = require('path');
const { ouvrir } = require(path.join(__dirname, 'pilote.js'));
let ok = 0, ko = 0; const vrai = (t, c, d) => { c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c || d === undefined ? '' : '  → ' + JSON.stringify(d))); };
const ROLES = ['technicien', 'commercial', 'compta', 'dr', 'chefEquipe'];

async function passage(S, aside) {
  console.log(`\n── ${aside ? 'B. appareil qui AFFICHE les modules mis de côté' : 'A. appareil par défaut'} ──`);
  if (aside) {
    /* profil vierge une seconde fois : tout le rangement de l'origine est vidé, le réglage d'appareil
       posé AVANT le démarrage, puis la page repart de zéro (APPAREIL_DEJA_VU redevient faux). */
    await S.ev(`localStorage.clear(); localStorage.setItem('elanB_aside','1'); localStorage.setItem('elan_aside','1'); location.reload(); return 1;`).catch(() => {});
    let pret = false;
    for (let i = 0; i < 200; i++) { await new Promise(r => setTimeout(r, 300));
      try { if (await S.ev('return typeof db!=="undefined" && !!db && !!db.permsRepris')) { pret = true; break; } } catch (e) {} }
    vrai('la page est repartie de zéro avec le réglage d’appareil posé', pret && await S.ev('return showAside()'));
  }
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove();
    window.pushPropose=function(){}; window.confirm=()=>true; window.alert=()=>{}; return 1;`);
  const base = await S.ev(`const brut=localStorage.getItem(STORE_KEY); const b=brut?JSON.parse(brut):null;
    const cles=avecSousCats(NAV.flatMap(x=>x.items)).map(x=>x.k);
    return { enregistree: !!b, repris: !!(b&&b.permsRepris), roles: b&&b.permissions ? Object.keys(b.permissions).sort() : [],
      completes: b&&b.permissions ? ${JSON.stringify(ROLES)}.map(r=>[r, cles.filter(k=>typeof (b.permissions[r]||{})[k]!=='boolean')]) : null,
      caps: !!(b&&b.permissions&&b.permissions.technicien&&b.permissions.technicien.caps), nCles: cles.length, users:(db.users||[]).length };`);
  vrai('population : une base neuve, sans compte, ENREGISTRÉE après la reprise (' + base.nCles + ' rubriques)', base.enregistree && base.repris && base.users === 0 && base.nCles >= 40, base);
  vrai('⛔ la base enregistrée porte les cinq tables de rôle', ROLES.every(r => base.roles.includes(r)), base.roles);
  vrai('⛔ … complètes : une valeur pour chaque rubrique, pour chaque rôle', !!base.completes && base.completes.every(([, m]) => !m.length), base.completes && base.completes.filter(([, m]) => m.length));
  vrai('… et la reprise y a posé les cases d’action', base.caps);

  /* un compte par rôle, puis une vraie connexion chacun, et le menu DESSINÉ */
  await S.ev(`db.users=[{id:'uA',prenom:'Ada',nom:'Admin',login:'ada',role:'admin',actif:true,pref:{}},
    ${ROLES.map((r, i) => `{id:'u${i}',prenom:'Essai',nom:'${r}',login:'e${i}',role:'${r}',actif:true,pref:{}}`).join(',')}]; save(); return 1;`);
  const menus = {};
  for (let i = 0; i < ROLES.length; i++) {
    menus[ROLES[i]] = await S.ev(`try{ logout(); }catch(e){} await new Promise(r=>setTimeout(r,150));
      const u=db.users.find(x=>x.id==='u${i}'); currentUser=u; enterApp(u); await new Promise(r=>setTimeout(r,700));
      try{ closeModal(true); }catch(e){}
      const vus=[...new Set([...document.querySelectorAll('#nav .nav-item[data-view]')].map(e=>e.dataset.view))];
      const liste=defaultPerms()['${ROLES[i]}']||{};
      const attendu=NAV.flatMap(x=>x.items).map(x=>x.k).filter(k=>liste[k]===true);
      return { vus, attendu, assistant: vus.includes('assistantDevis'), xylo: vus.includes('devisXylo'), compta: vus.includes('comptabilite') };`);
  }
  for (const r of ROLES) {
    const m = menus[r]; const pareil = JSON.stringify(m.vus.slice().sort()) === JSON.stringify(m.attendu.slice().sort());
    vrai(`⛔ ${r} : le menu dessiné est exactement la liste (${m.vus.length} rubriques)`, m.vus.length > 5 && pareil,
      { enTrop: m.vus.filter(k => !m.attendu.includes(k)), manquent: m.attendu.filter(k => !m.vus.includes(k)) });
  }
  vrai('⛔ aucun rôle n’a « Assistant devis » au menu (son écran n’afficherait qu’un cadenas)', ROLES.every(r => !menus[r].assistant), ROLES.filter(r => menus[r].assistant));
  vrai('⛔ le technicien n’a pas « Devis xylophage » au menu, quel que soit l’appareil', !menus.technicien.xylo);
  vrai('la comptabilité a Comptabilité au menu', menus.compta.compta);
  return menus;
}

(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const A = await passage(S, false);
  const B = await passage(S, true);
  vrai('⛔ le réglage d’un appareil ne change le menu d’AUCUN rôle', ROLES.every(r => JSON.stringify(A[r].vus.slice().sort()) === JSON.stringify(B[r].vus.slice().sort())),
    ROLES.filter(r => JSON.stringify(A[r].vus.slice().sort()) !== JSON.stringify(B[r].vus.slice().sort())));
  vrai('aucune exception dans la page', !S.exceptions.length, S.exceptions.slice(0, 3));
  S.fermer();
  console.log(`\n════ sonde-droits-depart (${S.version}) : ${ok} ✓ ${ko} ✗ ════`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE :', e.message); process.exit(2); });

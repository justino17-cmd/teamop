/* ══ SONDE — LA MATRICE DES DROITS : UNE CASE DÉCOCHÉE FERME-T-ELLE VRAIMENT SA PORTE ? ═══════════════
   Justin, 23 septembre 2026 : « revois toutes les règles de chaque catégorie, tous les droits, ce
   qu'on aurait oublié, et le système de validation des retours ; vérifie bien avec un test ».
   Méthode : un compte de TERRAIN à qui l'on donne TOUT (chaque case, chaque action, chaque menu),
   SAUF la case essayée. On se connecte vraiment (enterApp), on joue le geste que l'écran propose
   (la fonction que le bouton appelle), et on regarde la BASE : a-t-elle bougé ?
   ⛔ Contre-épreuve à chaque essai : le même geste, la case REMISE, doit passer — sinon on mesure
   un refus qui vient d'ailleurs (la limite de places, un filtre de visibilité…).
   ⛔ Bêta locale, 127.0.0.1, données fictives. SOURCE=<bêta d'avant> pour la contre-épreuve. */
const path = require('path');
const { ouvrir } = require(path.join(__dirname, 'pilote.js'));
let ok = 0, ko = 0; const vrai = (t, c, d) => { c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c || d === undefined ? '' : '  → ' + JSON.stringify(d))); };

/* Les essais : { nom, retire:{caps a retirer}, prep:'code page (état avant)', geste:'code page', mesure:'code page → valeur', attendu }.
   Remplis après l'audit, un par constat vérifié. */
const ESSAIS = require(path.join(__dirname, 'essais-droits.js'));

(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    window.__toasts=[]; const t0=window.toast; window.toast=function(m){ window.__toasts.push(String(m)); return t0.apply(this,arguments); };
    window.loginExisteAilleurs=async()=>false; window.identifiantsParMail=async()=>({sans:true}); window.planPlaceLibre=()=>true;
    window.confirm=()=>true; window.prompt=(q,d)=>d||'x'; return 1;`);
  /* TOUT, sauf `retire` : chaque case de USER_CAPS, chaque action de chaque catégorie, chaque menu. */
  const poserDroits = retire => S.ev(`const u=db.users.find(x=>x.id==='uT'); const caps={}, modules={};
    USER_CAPS.forEach(c=>{ caps[c[0]]=c[0]!=='bonsLectureSeule'; });
    PERM_GRPS.forEach(([g])=>['ajouter','modifier','supprimer'].forEach(d=>{ caps['cat_'+g+'_'+d]=true; }));
    avecSousCats(NAV.flatMap(x=>x.items)).forEach(m=>{ modules[m.k]=true; });
    Object.assign(caps, ${JSON.stringify(retire || {})}); u.acces={caps,modules}; save(); return 1;`);
  const entrer = qui => S.ev(`try{ logout(); }catch(e){} await new Promise(r=>setTimeout(r,200));
    const u=db.users.find(x=>x.id==='${qui}'); currentUser=u; enterApp(u); await new Promise(r=>setTimeout(r,900));
    try{ closeModal(true); }catch(e){} const f=document.getElementById('fdr-banner'); if(f) f.remove(); window.__toasts=[]; return current;`);
  const lancer = async (e, retire) => {
    await S.ev(`(${e.base || 'function(){}'})(); save(); return 1;`);
    await poserDroits(retire); await entrer('uT');
    const r = await S.ev(`window.__toasts=[]; let erreur='';
      try{ ${e.prep || ''} }catch(x){ erreur='prep: '+x.message; }
      const avant=(()=>{ try{ return JSON.stringify(${e.mesure}); }catch(x){ return 'ERR '+x.message; } })();
      try{ await (async()=>{ ${e.geste} })(); }catch(x){ erreur=erreur||('geste: '+x.message); }
      await new Promise(r=>setTimeout(r,150)); try{ closeModal(true); }catch(x){}
      const apres=(()=>{ try{ return JSON.stringify(${e.mesure}); }catch(x){ return 'ERR '+x.message; } })();
      return {avant, apres, bouge:avant!==apres, toasts:window.__toasts.slice(0,3), erreur};`);
    return r;
  };
  await S.ev(`db.techniciens=[{id:'tT',nom:'Tom Terrain',metier:'Technicien'},{id:'tK',nom:'Karim Benali',metier:'Technicien'}];
    db.users=[{id:'uA',prenom:'Justin',nom:'Roux',login:'justin',role:'admin',actif:true,pref:{}},
      {id:'uT',prenom:'Tom',nom:'Terrain',login:'tom',role:'technicien',techId:'tT',actif:true,pref:{}},
      {id:'uK',prenom:'Karim',nom:'Benali',login:'karim',role:'technicien',techId:'tK',actif:true,pref:{}}];
    try{ reprendreDroitsImplicites(); }catch(e){} save(); return 1;`);
  for (const e of ESSAIS) {
    console.log('\n── ' + e.nom + '   (case retirée : ' + Object.keys(e.retire).join(', ') + ')');
    const sans = await lancer(e, e.retire);
    const avec = await lancer(e, {});
    vrai('⛔ sans la case, le geste ne change rien' + (e.dit ? ' — et le refus est dit' : ''), !sans.bouge && !sans.erreur && (!e.dit || sans.toasts.length > 0), sans);
    vrai('   contre-épreuve : avec la case, le même geste agit', avec.bouge && !avec.erreur, avec);
  }
  console.log('\n══ AUCUNE ERREUR ══'); vrai('exceptions', !S.exceptions.length, S.exceptions);
  console.log(`\n════ sonde-matrice-droits : ${ok} ✓ ${ko} ✗ ════\n`);
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE :', e && e.stack || e); process.exit(2); });

/* ══ SONDE — LES COMMANDES DES TABLEAUX, ET LES CHIFFRES DES FICHES ═════════════════════════════
   23 septembre 2026. En préparant les captures de l'écran « Équipe » pour Justin, le ✎ d'une
   ligne mesurait 16 px de haut : `#content .tbl button{min-height:0}` (une exception du plancher
   tactile, écrite pour les boutons NUS) battait par son identifiant le plancher de `.btn.sm`.
   Et tous les audits d'avant écartaient `.tbl` de leur population : aucun ne pouvait le voir.

   On mesure donc, dans une vraie page, CHAQUE bouton de CHAQUE tableau des quatre écrans qui en
   portent (Techniciens, Devis, Contrats, Demandes) — au téléphone (doigt) ET au bureau
   (souris) — plus les chiffres des fiches Technicien et Client avec les valeurs les plus
   longues plausibles (« 1540h30 », « 10 288,06 € »).
   ⛔ On compte la population avant de croire un zéro. ⛔ Contre-épreuve : SOURCE=<bêta d'avant>
   doit retrouver les 16 px et les chiffres qui sortent. ⛔ Bêta seulement, 127.0.0.1 seulement. */
const path = require('path');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
let ok = 0, ko = 0; const vrai = (t, c, d) => { c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c || d === undefined ? '' : '  → ' + JSON.stringify(d))); };

(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    const d=todayISO();
    db.techniciens=[{id:'t-a',nom:'Sofia Perez',metier:'Technicien',tel:'06 98 76 54 32',email:'s@exemple.fr'},{id:'t-b',nom:'Karim Benali',metier:'Technicien',tel:'06 12 34 56 78'}];
    db.clients=[{id:'c-a',nom:'Boulangerie des Halles',ville:'Lyon'}];
    db.devis=[{id:'dv-a',num:'D-2026-001',clientId:'c-a',date:d,statut:'envoye',lignes:[{designation:'Traitement',qte:1,pu:120,tva:20}]}];
    db.factures=[{id:'fa-a',num:'F-2026-001',clientId:'c-a',date:d,statut:'payee',lignes:[{designation:'Contrat annuel',qte:1,pu:10288.06,tva:20}]}];
    db.contrats=[{id:'ct-a',num:'C-2026-001',intitule:'Contrat dératisation',clientId:'c-a',frequence:'mensuel',montant:90,statut:'actif',debut:d}];
    const a={id:'u-adm',prenom:'Justin',nom:'Roux',login:'justin',role:'admin',actif:true,pref:{}}; db.users=[a];
    db.demandes=[{id:'dm-a',num:'DC-2026-001',boxId:'',boxNom:'Box Nord',lignes:[{produitId:'p',qte:1}],demandeur:'Karim Benali',date:d,statut:'enAttente',chefId:'u-adm',userId:'u-adm'}];
    /* les valeurs LONGUES : 1 540 h 30 pointées, 10 288,06 € encaissés */
    db.pointages=[]; for(let i=0;i<101;i++) db.pointages.push({id:'pt'+i,techId:'t-a',date:d,debut:'07:00',fin:'22:15',pause:0});
    db.pointages.push({id:'pt-x',techId:'t-a',date:d,debut:'07:00',fin:'07:30',pause:15});
    save(); currentUser=a; enterApp(a); await new Promise(r=>setTimeout(r,1500)); try{ closeModal(true); }catch(e){} return 1;`);

  const mesurer = (vues) => S.ev(`const out={};
    for(const v of ${JSON.stringify(vues)}){ go(v); await new Promise(r=>setTimeout(r,900));
      out[v]=[...document.querySelectorAll('#content .tbl button')].filter(b=>b.offsetParent).map(b=>({c:b.className, h:Math.round(b.getBoundingClientRect().height)})); }
    return out;`);
  const fiches = () => S.ev(`const out={};
    for(const [nom,f] of [['technicien',()=>ficheTech('t-a')],['client',()=>ficheClient('c-a')]]){ try{ closeModal(true); }catch(e){} f(); await new Promise(r=>setTimeout(r,800));
      out[nom]=[...document.querySelectorAll('#overlay .kpi')].map(k=>{ const v=k.querySelector('.kpi-val'), q=k.getBoundingClientRect(), qv=v.getBoundingClientRect();
        return {val:v.textContent.trim(), fs:getComputedStyle(v).fontSize, sort:(v.scrollWidth>v.clientWidth+1)||(qv.right>q.right+0.5)}; }); }
    try{ closeModal(true); }catch(e){} return out;`);
  const VUES = ['techniciens', 'devis', 'contrats', 'demandes'];   // Factures range ses lignes en `pl-row`, sans tableau

  for (const [nom, l, touch] of [['TÉLÉPHONE (doigt)', 402, true], ['BUREAU (souris)', 1280, false]]) {
    console.log('\n══ ' + nom + ' ══');
    await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: l, height: 874, deviceScaleFactor: 1, mobile: l < 500 });
    await S.c.envoyer('Emulation.setTouchEmulationEnabled', touch ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
    await S.ev(`try{ setPlatForce('${touch ? 'iosweb' : 'macos'}'); }catch(e){} return 1;`); await dormir(600);
    const m = await mesurer(VUES);
    const tous = Object.values(m).flat();
    vrai('population : des boutons dans les tableaux des ' + VUES.length + ' écrans', tous.length >= 10 && VUES.every(v => m[v].length > 0), Object.fromEntries(VUES.map(v => [v, m[v].length])));
    const bas = Object.entries(m).flatMap(([v, bs]) => bs.filter(b => /\bbtn\b/.test(b.c) && b.h < 30).map(b => v + ' · ' + b.c + ' · ' + b.h + ' px'));
    vrai('⛔⛔ aucune commande `.btn` de tableau sous 30 px (le ✎ était à 16)', bas.length === 0, bas);
    const f = await fiches();
    vrai('population : la fiche Technicien porte ses trois chiffres, dont un temps à quatre chiffres (« 1540h30 »)', (f.technicien || []).length === 3 && f.technicien.some(k => /\d{4}h\d{2}/.test(k.val)), f.technicien);
    vrai('population : la fiche Client porte ses quatre chiffres, dont un montant à cinq chiffres (« 10 288,06 € »)', (f.client || []).length === 4 && f.client.some(k => /\d{2}\s\d{3},\d{2}/.test(k.val)), f.client);
    const sortent = [...(f.technicien || []), ...(f.client || [])].filter(k => k.sort).map(k => k.val + ' (' + k.fs + ')');
    vrai('⛔ aucun chiffre ne sort de sa carte', sortent.length === 0, sortent);
  }
  console.log('\n══ AUCUNE ERREUR ══');
  vrai('exceptions', S.exceptions.length === 0, S.exceptions);
  console.log(`\n════ sonde-boutons-tableaux : ${ok} ✓ ${ko} ✗ ════\n`);
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE :', e && e.stack || e); process.exit(2); });

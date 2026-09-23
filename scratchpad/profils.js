/* ══ LES APPAREILS DES SONDES — UNE SEULE TABLE ══════════════════════════════════════════
   Justin, 23 septembre 2026 : « vérifie l'application au complet… pour tous les appareils ».
   Jusque-là, `audit-profond.js` et `audit-clics2.js` ne connaissaient que DEUX profils
   (iPhone Safari de nuit, Mac Safari de jour), chacun recopié dans les deux fichiers. Deux
   copies divergent toujours : la table vit ici, et les deux sondes la lisent.

   Chaque profil croise ce qui change VRAIMENT le rendu :
   · la LARGEUR — c'est elle qui décide des paliers de la feuille (tiroir ou menu, barre
     d'onglets, colonnes) : 360, 375, 390, 412, 430, 820, 1180, 1280, 1366, 1440, 1728, 1920 ;
   · la PLATEFORME forcée (`setPlatForce`) — le verre (Safari 26), l'appli installée
     (`data-autonome` : la barre d'onglets flotte en pilule), ou les surfaces pleines ;
   · le TOUCHER — plancher des cibles, zoom de Safari sous 16 px ;
   · le THÈME, en alternance, pour que chaque famille d'appareil soit vue de jour ET de nuit ;
   · les ENCOCHES — `env(safe-area-inset-*)` vaut 0 dans un navigateur piloté ; on les pose,
     sinon on valide une page que personne ne voit (règle du dépôt).
   ⚠ L'iPad n'a pas de rendu à lui : `opOS()` le range sous iOS, donc `data-kind="mobile"`
   sur un écran de 820 à 1180 px. C'est précisément ce qu'il faut regarder.            */
const PROFILS = {
  /* les deux profils historiques — mêmes réglages qu'avant, pour que les chiffres se comparent */
  tel:     { plat:'iosweb',     w:390,  h:844,  tac:true,  theme:'dark',  dpr:3,   enc:[47,34], lbl:'iPhone 15 · Safari 26' },
  bureau:  { plat:'macweb',     w:1440, h:900,  tac:false, theme:'light', dpr:2,   enc:null,    lbl:'Mac · Safari 26' },
  /* téléphones */
  se:      { plat:'ios18',      w:375,  h:667,  tac:true,  theme:'light', dpr:2,   enc:[20,0],  lbl:'iPhone SE · iOS 18, installée' },
  promax:  { plat:'ios27',      w:430,  h:932,  tac:true,  theme:'dark',  dpr:3,   enc:[59,34], lbl:'iPhone Pro Max · iOS 26, installée' },
  android: { plat:'android',    w:412,  h:915,  tac:true,  theme:'light', dpr:2.625, enc:[24,0], lbl:'Android (Pixel) · installée' },
  petitand:{ plat:'androidweb', w:360,  h:800,  tac:true,  theme:'dark',  dpr:3,   enc:[24,0],  lbl:'petit Android · Chrome' },
  /* tablettes */
  ipad:    { plat:'iosweb',     w:820,  h:1180, tac:true,  theme:'light', dpr:2,   enc:[24,20], lbl:'iPad Air portrait · Safari 26' },
  ipadh:   { plat:'ios27',      w:1180, h:820,  tac:true,  theme:'dark',  dpr:2,   enc:[24,20], lbl:'iPad paysage · installée' },
  /* ordinateurs */
  mac14:   { plat:'macos14',    w:1280, h:800,  tac:false, theme:'dark',  dpr:2,   enc:null,    lbl:'Mac · macOS 15 et avant' },
  mac27:   { plat:'macos27',    w:1728, h:1117, tac:false, theme:'dark',  dpr:2,   enc:null,    lbl:'MacBook Pro 16 · installée' },
  win:     { plat:'winweb',     w:1366, h:768,  tac:false, theme:'light', dpr:1,   enc:null,    lbl:'portable Windows · Edge' },
  winapp:  { plat:'windows',    w:1920, h:1080, tac:false, theme:'dark',  dpr:1,   enc:null,    lbl:'Windows plein écran · installée' },
};

/* Pose le profil sur une page CDP ouverte par `pilote.js`. */
async function poserProfil(S, P) {
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: P.w, height: P.h, deviceScaleFactor: P.dpr, mobile: P.tac });
  await S.c.envoyer('Emulation.setTouchEmulationEnabled', { enabled: P.tac, maxTouchPoints: P.tac ? 5 : 1 });
  if (P.enc) {
    const [t, b] = P.enc;
    try { await S.c.envoyer('Emulation.setSafeAreaInsetsOverride',
      { insets: { top: t, bottom: b, left: 0, right: 0, topMax: t, bottomMax: b, leftMax: 0, rightMax: 0 } }); } catch (e) {}
  }
}

function profil(nom) {
  const P = PROFILS[nom];
  if (!P) { console.error('profil inconnu : ' + nom + ' — connus : ' + Object.keys(PROFILS).join(', ')); process.exit(3); }
  return P;
}

module.exports = { PROFILS, profil, poserProfil };

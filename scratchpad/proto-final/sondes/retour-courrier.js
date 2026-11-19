// SONDE « bouton Retour » — la Boîte mail (module de courrier, ses propres entrées {opcourrier}) ET une fenêtre de l'hôte posée par-dessus (entrées {cal}) dans le MÊME historique.
// Lecture d'un message (niveau 1 du module) → feuille « Menu » de l'hôte par-dessus → Retour : la feuille seule se ferme, le message reste lu ;
// Retour encore : le module recule d'un niveau (la liste) ; Retour encore : on quitte la Boîte mail. Téléphone seulement (le module n'empile ses niveaux que là).
// PROFIL=android|iphone (défaut android). Rend « N ✓ · M ✗ ».
const M = require('./mail-commun.js'), lib = M.lib, v = M.v, C = require('./retour-commun.js');
(async () => {
  const c = await M.entrer({ profil: process.env.PROFIL || 'android' }), p = c.p;
  const e = () => p.evaluate(() => { const r = window.R && window.R(); return { vue: r ? r.querySelector('#app').getAttribute('data-view') : null, h: location.hash, n: history.length, st: history.state, pile: CAL.pile.join(','), pousse: CAL.pousse }; });
  await p.waitForTimeout(300); const e0 = await e();
  v('départ : Boîte mail, vue « liste »', e0.h === '#boiteMail' && e0.vue === 'list', e0);
  await p.evaluate(() => window.R().querySelectorAll('#rows .msg')[0].click()); await p.waitForTimeout(700); const e1 = await e();
  v('un message est lu : le module a posé SON entrée (niveau 1)', e1.vue === 'reading' && e1.st && e1.st.opcourrier === 1, e1);
  const menu = await lib.toucher(c, '.tt-menu[data-menu="ouvrir"]'); await p.waitForTimeout(500); const e2 = await e();
  v('la feuille « Menu » de l\'hôte s\'ouvre par-dessus : SON entrée à elle, le message reste lu', menu && e2.pile === 'panneau' && e2.st && e2.st.cal === 1 && e2.vue === 'reading', e2);
  await C.retour(p); const e3 = await e();
  v('Retour : la feuille se ferme ET LE MESSAGE RESTE LU (le module ne prend pas ce Retour pour un recul de son niveau)', e3.pile === '' && e3.vue === 'reading' && e3.h === '#boiteMail' && e3.st && e3.st.opcourrier === 1, e3);
  await C.retour(p); const e4 = await e();
  v('Retour encore : le module recule d\'un niveau (liste des messages), on est toujours dans la Boîte mail', e4.vue === 'list' && e4.h === '#boiteMail', e4);
  await C.retour(p); const e5 = await e();
  v('Retour encore : on quitte la Boîte mail (l\'écran d\'avant)', e5.h !== '#boiteMail', e5);
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await M.fin(c); await M.sortie();
})().catch(e => { v('la sonde va jusqu\'au bout (une exception l\'a arrêtée)', false, String(e.message).split('\n')[0].slice(0, 200)); lib.bilan(); lib.fermer().then(() => process.exit(1), () => process.exit(1)); });

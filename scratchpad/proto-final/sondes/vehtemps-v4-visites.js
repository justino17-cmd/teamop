// Véhicules, étape 3 — LES VISITES : le chapitre « Véhicules » de l'immersion (immChap('vehicules', …)) et la partie parlée (tourPartie('vehicules', …)) citent des
// écrans et des boutons par leur SÉLECTEUR. Une visite dont un sélecteur ne trouve rien se bloque sans bruit : on la joue pour de bon et on lit ce qu'elle a PERDU
// (IMM.perdus), puis on cherche les anciens mots (« Immobilisés », « Saisir », « carte par véhicule »…) dans ce qu'elle dit.
// node scratchpad/proto-final/sondes/vehtemps-v4-visites.js → « N ✓ · M ✗ », sort en 1 si un contrôle tombe. ⛔ 127.0.0.1 seulement.
const L = require('../lib.js'), v = L.v;
const VIEUX = /Immobilis|Saisir un plein|une carte par véhicule|Une carte par véhicule|À prévoir|échéances à prévoir|Contrôle fait|flotte/;
(async () => {
  const c = await L.ouvrir({ profil:'mac', qui:'marc', calme:false });
  const info = await c.p.evaluate(() => { const i = IMM_ORDRE.indexOf('vehicules'), ch = IMM_CHAPS.vehicules; return { i, n:ch ? ch.gestes.length : 0, textes:ch ? ch.gestes.map(g => g.t + ' ' + g.p).join(' | ') : '' }; });
  v('la population — le chapitre « Véhicules » existe dans l\'ordre de l\'immersion et compte 13 étapes (titre + 12)', info.i >= 0 && info.n === 13, info);
  v('les textes de la visite n\'emploient plus les anciens mots', !VIEUX.test(info.textes), (info.textes.match(VIEUX) || [])[0]);
  const parlee = await c.p.evaluate(() => { const m = String(tourPartie).length; return typeof tourPartie === 'function' && m > 0; });
  v('la visite parlée de la rubrique existe', parlee);
  // on joue le chapitre : la visite parle toute seule, étape après étape
  await c.p.evaluate(i => immLancer(i), info.i); await L.calme(c.p, 800);
  const t0 = Date.now(); let dernier = -1, vues = new Set(), ecran = [];
  while (Date.now() - t0 < 300000) {
    const e = await c.p.evaluate(() => ({ actif:GD.actif, e:GD.e, s:GD.s, bulle:((document.getElementById('gd-bulle') || {}).innerText || '').replace(/\s+/g, ' ').slice(0, 80), h1:(document.querySelector('#contenu h1') || {}).textContent, panneau:!!document.querySelector('#calque .panneau'), perdus:IMM.perdus.filter(x => /^vehicules/.test(x)) }));
    if (e.bulle) vues.add(e.bulle); if (e.e === info.i && e.s !== dernier) { dernier = e.s; ecran.push(e.s + ':' + (e.panneau ? 'panneau' : e.h1)); }
    if (!e.actif || e.e !== info.i) break;
    await c.p.waitForTimeout(1200); }
  const fin = await c.p.evaluate(() => ({ perdus:IMM.perdus.filter(x => /^vehicules/.test(x)), toutes:IMM.perdus.slice(0, 6) }));
  v('la visite joue sans perdre un sélecteur (aucun « clic » ni « champ » introuvable dans le chapitre)', fin.perdus.length === 0, fin);
  v('la visite avance : plusieurs étapes vues (' + ecran.length + ') — liste, fenêtres, fiche', ecran.length >= 8, ecran);
  const dit = [...vues].join(' | ');
  v('ce que la visite DIT n\'emploie plus les anciens mots', !VIEUX.test(dit), (dit.match(VIEUX) || [])[0]);
  v('zéro erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

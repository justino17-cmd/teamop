// Véhicules et Temps de travail, étape 5 — LES VISITES PARLÉES (VEHICULES-TEMPS.md § 8, dernière ligne) : les chapitres de l'immersion qui parlent des deux rubriques
// (« Temps de travail », « Véhicules », « Le technicien » — Mon camion et Mes heures —, « Accueil », « Équipe ») citent des écrans et des boutons par leur SÉLECTEUR.
// Une visite dont un sélecteur ne trouve rien se bloque sans bruit : on la JOUE pour de bon (`__immRapide`) et on lit ce qu'elle a PERDU (IMM.perdus), puis on cherche
// les anciens mots dans ce qu'elle dit. On joue aussi la partie « Sophie confirme ses heures » du guide (GD_TOURS), qui visait .paie-conf, disparu avec la refonte de Mes heures.
// CHAPS=tech,pointage SEULS=… pour restreindre. node scratchpad/proto-final/sondes/vehtemps-v5-visites.js → « N ✓ · M ✗ », sort en 1 si un contrôle tombe. ⛔ 127.0.0.1 seulement.
const L = require('../lib.js'), v = L.v;
const VIEUX = /Ce n’est pas ça|Signaler un souci|Mon véhicule|heures supplémentaires de Karim|Immobilis|Saisir un plein|une carte par véhicule|À prévoir|échéances à prévoir|Contrôle fait|flotte|Rappeler encore|Clôturer à l’heure dite|Demandes des salariés|Valider les semaines sans alerte/;
const CHAPS = (process.env.CHAPS || 'pointage,vehicules,tech,accueil,equipe').split(',');
const QUI = { tech:'sm' };
(async () => {
  for (const cle of CHAPS) {
    const c = await L.ouvrir({ profil:'mac', qui:QUI[cle] || 'marc', calme:false });
    await c.p.evaluate(() => { window.__immRapide = true; });
    const info = await c.p.evaluate(k => { const i = IMM_ORDRE.indexOf(k), ch = IMM_CHAPS[k]; return { i, n:ch ? ch.gestes.length : 0, textes:ch ? ch.gestes.map(g => g.t + ' ' + g.p).join(' | ') : '' }; }, cle);
    v('« ' + cle + ' » · population : le chapitre existe dans l\'ordre de l\'immersion (' + info.n + ' étapes)', info.i >= 0 && info.n >= 5, { i:info.i, n:info.n });
    v('« ' + cle + ' » · les textes de la visite n\'emploient plus les anciens mots', !VIEUX.test(info.textes), (info.textes.match(VIEUX) || [])[0]);
    await c.p.evaluate(i => immLancer(i), info.i); await L.calme(c.p, 800);
    const t0 = Date.now(); let dernier = -1, vues = new Set(), ecran = [], bloque = false, memeDepuis = Date.now();
    while (Date.now() - t0 < 240000) {
      const e = await c.p.evaluate(k => ({ actif:GD.actif, e:GD.e, s:GD.s, bulle:((document.getElementById('gd-bulle') || {}).innerText || '').replace(/\s+/g, ' ').slice(0, 90), h1:(document.querySelector('#contenu h1') || {}).textContent, panneau:!!document.querySelector('#calque .panneau') }), cle);
      if (e.bulle) vues.add(e.bulle); if (e.e === info.i && e.s !== dernier) { dernier = e.s; memeDepuis = Date.now(); ecran.push(e.s + ':' + (e.panneau ? 'panneau' : e.h1)); }
      if (!e.actif || e.e !== info.i) break;
      if (Date.now() - memeDepuis > 45000) { bloque = true; break; }
      await c.p.waitForTimeout(900); }
    const fin = await c.p.evaluate(k => ({ perdus:IMM.perdus.filter(x => x.startsWith(k + ' :') || x.startsWith('jouer')), toutes:IMM.perdus.slice(0, 6) }), cle);
    v('« ' + cle + ' » · la visite ne se bloque pas sur une étape (aucune étape ne reste plus de 45 s)', !bloque, { dernier, ecran:ecran.slice(-3) });
    v('« ' + cle + ' » · la visite joue sans perdre un sélecteur (aucun « clic » ni « champ » introuvable)', fin.perdus.length === 0, fin);
    v('« ' + cle + ' » · la visite avance : plusieurs étapes vues (' + ecran.length + ')', ecran.length >= Math.min(8, info.n - 1), ecran);
    const dit = [...vues].join(' | '); v('« ' + cle + ' » · ce que la visite DIT n\'emploie plus les anciens mots', !VIEUX.test(dit), (dit.match(VIEUX) || [])[0]);
    v('« ' + cle + ' » · zéro erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  // la partie du guide « Sophie confirme ses heures » (GD_TOURS) : ses sélecteurs existent dans « Mes heures »
  { const c = await L.ouvrir({ profil:'iphone', qui:'sm', calme:true });
    await L.aller(c.p, 'mesheures');
    const r = await c.p.evaluate(() => { const T = []; const src = String(typeof GD_PARTIES !== 'undefined' ? '' : ''); return { pret:!!document.querySelector('#contenu .tt-pret'), jrs:!!document.querySelector('#contenu .tt-mh-j'), conf:!!document.querySelector('#contenu [data-tt^="mhconf|"]'), ancien:!!document.querySelector('#contenu .paie-conf, #contenu .paie-tr, #contenu [data-paie="confirme|sm"]') }; });
    v('guide · « Sophie confirme ses heures » : les trois sélecteurs de la partie existent dans « Mes heures », les anciens n\'y sont plus', r.pret && r.jrs && r.conf && !r.ancien, r);
    const src = await c.p.evaluate(() => { const h = document.documentElement.innerHTML, i = h.indexOf('Touche « Je confirme mes heures »'); return i < 0 ? '' : h.slice(i, i + 260); });
    v('guide · la phrase de la partie parle de « Il y a une erreur » (plus de « Signaler une erreur »)', /Il y a une erreur/.test(src) && !/Signaler une erreur/.test(src), src.slice(0, 160));
    await L.fin(c); }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

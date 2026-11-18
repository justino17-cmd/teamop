// Recontrôle adverse du tour 3 des restes « client » : la barre du bas de la fiche d'une tâche (tous les gestes, pas seulement « Prévenir »)
// et le courriel de reçu du cadre Paiement. Population : TOUTES les tâches du jeu + une tâche « Prévenir » par client + un nom de client très long.
// node restes-client-3-recontrole.js <profil> [nuit] [qui]
const NOM = process.env.NOM || 'Société civile immobilière des Hauts de la Rochelle et Associés';
const O = require('./client-outils.js'), L = O.L, v = L.v; const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit';
(async () => {
  const c = await L.ouvrir({ profil, nuit, qui: process.argv[4] || 'marc', app: true, attente: 1500 }), p = c.p;
  const R = await p.evaluate(async (__NOM__) => { const o = {}; const sup = [];
    const cles = Object.keys(CLIENTS); const long = __NOM__; CLIENTS.zzlong = { nom: long, contact: 'Le gestionnaire', adr: '1 rue', tel: '', mail: 'x@y.fr', type: 'syndic' }; cles.push('zzlong');
    for (const k of cles.filter(k => CLIENTS[k].contact)) { const x = { id: 'tb' + k, t: 'Prévenir du retard de la pièce', qui: 'marc', d: AUJ, h: null, urgent: false, creePar: 'marc', creeLe: '31/10', lien: { t: 'client', id: k, lib: CLIENTS[k].nom, cli: k } }; TACHES.push(x); sup.push(x.id); }
    const ids = TACHES.map(t => t.id);
    for (const id of ids) { const x = TACHES.find(t => t.id === id); if (!x) continue;
      try { tDetail(id); } catch (e) { o[id] = { erreur: String(e) }; continue; } await new Promise(r => setTimeout(r, 300));
      const P = document.querySelector('#calque .panneau'); if (!P) { o[id] = { vide: true }; continue; }
      const b = P.querySelector('.tkx-barre'); if (!b) { o[id] = { sansBarre: true, fait: !!x.fait }; try { fermerPanneau(); } catch (e) {} continue; }
      const bt = [...b.querySelectorAll('.btn')], r = e => { const q = e.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.right), Math.round(q.top), Math.round(q.bottom)]; };
      o[id] = { barre: r(b), sw: b.scrollWidth, cw: b.clientWidth, btns: bt.map(e => ({ t: e.textContent.trim().slice(0, 50), r: r(e), coupe: e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1, ls: Math.round(e.getBoundingClientRect().height), lg: (() => { const g = document.createRange(); g.selectNodeContents(e); return new Set([...g.getClientRects()].filter(q => q.width > 1).map(q => Math.round(q.top / 6))).size; })() })), tab: (() => { const t = document.querySelector('#tabbar, .tabbar, nav.tab'); return t ? r(t) : null; })() };
      try { fermerPanneau(); } catch (e) {} }
    TACHES = TACHES.filter(y => !sup.includes(y.id)); delete CLIENTS.zzlong; return o; }, NOM);
  const E = Object.entries(R), avec = E.filter(([k, x]) => x.barre);
  v('population : au moins 8 barres mesurées (' + avec.length + ' sur ' + E.length + ' tâches)', avec.length >= 8, avec.length);
  v('aucune tâche ne jette d\'erreur à l\'ouverture', !E.some(([k, x]) => x.erreur), E.filter(([k, x]) => x.erreur).slice(0, 3));
  const qui = process.argv[4] || 'marc';   // un technicien (sm, kb) ne relance pas : « Relancer » n'est attendu que chez le patron et Julie
  v('population : au moins un bouton de chaque sorte attendue pour ce rôle (' + qui + ')', (['marc', 'julie'].includes(qui) ? ['Prévenir', 'Relancer', 'Fait'] : ['Prévenir', 'Fait']).every(m => avec.some(([k, x]) => x.btns.some(b => b.t.includes(m)))), [...new Set(avec.flatMap(([k, x]) => x.btns.map(b => b.t.split(' ')[1])))]);
  if (c.largeur <= 760) {
    v('chaque bouton de chaque barre tient dans l\'écran (largeur ' + c.largeur + ')', avec.every(([k, x]) => x.btns.every(b => b.r[0] >= 0 && b.r[1] <= c.largeur)), avec.filter(([k, x]) => !x.btns.every(b => b.r[0] >= 0 && b.r[1] <= c.largeur)).map(([k, x]) => [k, x.btns.map(b => b.r)]));
    v('aucune barre ne défile de côté', avec.every(([k, x]) => x.sw <= x.cw + 1), avec.filter(([k, x]) => x.sw > x.cw + 1).map(([k, x]) => [k, x.sw, x.cw])); }
  v('aucun libellé de bouton n\'est coupé (hauteur ni largeur)', avec.every(([k, x]) => x.btns.every(b => !b.coupe)), avec.filter(([k, x]) => x.btns.some(b => b.coupe)).map(([k, x]) => [k, x.btns.map(b => [b.t, b.ls])]));
  if (c.largeur > 760) v('au bureau, la barre du bas est masquée (le geste reste dans la fiche)', avec.every(([k, x]) => x.btns.every(b => b.ls === 0)), avec.filter(([k, x]) => x.btns.some(b => b.ls > 0)).map(([k]) => k));
  else v('chaque bouton reste un vrai doigt : 44 px de haut au moins', avec.every(([k, x]) => x.btns.every(b => b.ls >= 44)), avec.filter(([k, x]) => x.btns.some(b => b.ls < 44)).map(([k, x]) => [k, x.btns.map(b => b.ls)]));
  // « Relancer maintenant » est le geste le plus courant : à 390 px et plus il tient sur UNE ligne (50 px), comme avant la correction de la barre
  if (c.largeur >= 390 && c.largeur <= 760) { const un = avec.flatMap(([k, x]) => x.btns.filter(b => /Relancer maintenant|Relancer le devis|Prévenir (Marc Durand|Mme Bernard|M\. Durand|Dr Martin|M\. Pineau|Mme Roux|M\. Gaillard)/.test(b.t)));
    v('population : des boutons courts mesurés (≥ 5)', un.length >= 5, un.length);
    v('les libellés courts (Relancer maintenant, Prévenir + un nom de personne) restent sur UNE ligne à ' + c.largeur + ' px', un.every(b => b.lg <= 1), un.filter(b => b.lg > 1).map(b => [b.t, b.lg])); }
  // tour 4 : le nom est coupé à DEUX lignes (« … »), pour tous les clients, le nom inventé de 62 signes compris : la barre ne mange plus le tiers de l'écran
  v('le bouton de la barre ne dépasse pas deux lignes (64 px), nom inventé compris', avec.every(([k, x]) => x.btns.every(b => b.ls <= 64)), avec.filter(([k, x]) => x.btns.some(b => b.ls > 64)).map(([k, x]) => [k, x.btns.map(b => b.ls)]));
  v('population : le nom inventé de 62 signes a bien été mesuré', !!R.tbzzlong && !!R.tbzzlong.barre, !!R.tbzzlong);
  console.log(JSON.stringify(Object.fromEntries(avec.slice(0, 40).map(([k, x]) => [k, x.btns.map(b => b.t + '|' + b.ls + '|' + b.r.join(','))])), null, 0));
  for (const k of ['mi', 'zzlong']) { await p.evaluate(([k2, __NOM__]) => { if (k2 === 'zzlong') CLIENTS.zzlong = { nom: __NOM__, contact: 'Le gestionnaire', adr: '1 rue', tel: '', mail: 'x@y.fr', type: 'syndic' }; TACHES.push({ id: 'cap' + k2, t: 'Prévenir du retard de la pièce', qui: 'marc', d: AUJ, h: null, urgent: false, creePar: 'marc', creeLe: '31/10', lien: { t: 'client', id: k2, lib: CLIENTS[k2].nom, cli: k2 } }); tDetail('cap' + k2); }, [k, NOM]); await L.calme(p, 500);
    await L.capture(c, O.CAP + 'r3-barre-' + k + '-' + profil + (nuit ? '-nuit' : '') + '.png'); await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); }
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

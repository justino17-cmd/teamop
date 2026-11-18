// Recontrôle adverse du tour 4 des restes « client » : la barre du bas de la fiche d'une tâche vient de recevoir un <span class="tkx-lib">
// autour du libellé (coupé à deux lignes). Ce que ça peut casser À CÔTÉ : le geste (le clic tombe maintenant sur le span, pas sur le bouton),
// le bouton « Fait » seul (technicien), la barre masquée au bureau, les libellés les plus longs, le jour comme la nuit.
// Population : chaque sorte de bouton d'action (facture, devis, contrat, créneaux, prévenir), chaque rôle demandé.
// node restes-client-4-recontrole.js <profil> [nuit] [qui]
const O = require('./client-outils.js'), L = O.L, v = L.v; const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit', qui = process.argv[4] || 'marc';
(async () => {
  const c = await L.ouvrir({ profil, nuit, qui, app: true, attente: 1500 }), p = c.p;
  // une animation d'entrée de la feuille fausse les rectangles : on la coupe comme le ferait « réduire les animations »
  await p.emulateMedia({ reducedMotion: 'reduce' });
  // une fiche « Proposer le renouvellement » (le libellé d'action le plus long : « ✉ Proposer le renouvellement ») : aucune tâche du jeu n'en porte
  await p.evaluate(() => { const k = CONTRATS.find(o => o.st !== 'resilie') || CONTRATS[0]; TACHES.push({ id: 'tctr', t: 'Proposer le renouvellement du contrat', qui: ROLE === 'tech' ? 'sm' : 'marc', d: AUJ, h: null, urgent: false, creePar: 'marc', creeLe: '31/10', lien: { t: 'contrat', id: k.id, lib: k.titre || k.id } }); });
  // 1. recensement : toutes les tâches du jeu, ce que la barre y propose
  const T = await p.evaluate(async () => { const o = []; for (const x of TACHES.slice()) { try { tDetail(x.id); } catch (e) { o.push({ id: x.id, erreur: String(e) }); continue; } await new Promise(r => setTimeout(r, 120));
      const b = document.querySelector('#calque .tkx-barre'); const bt = b ? [...b.querySelectorAll('.btn')] : [];
      o.push({ id: x.id, barre: !!b, btns: bt.map(e => ({ t: e.textContent.trim(), at: [...e.attributes].map(a => a.name).filter(n => /^data-/.test(n)).join(','), span: !!e.querySelector('.tkx-lib'), disp: getComputedStyle(b).display })) }); try { fermerPanneau(); } catch (e) {} } return o; });
  const A = T.filter(x => x.barre);
  v('population : ' + A.length + ' fiches à barre sur ' + T.length + ' tâches (aucune ne jette)', !T.some(x => x.erreur) && (c.largeur > 760 || A.length >= 5), T.filter(x => x.erreur));
  if (c.largeur > 760) { v('au bureau et sur tablette, la barre du bas reste masquée', A.every(x => x.btns.every(b => b.disp === 'none')), A.slice(0, 3)); }
  else {
    // 2. chaque SORTE de bouton d'action : un vrai toucher au milieu du bouton (donc sur le span) déclenche le geste
    const sortes = {}; A.forEach(x => x.btns.forEach(b => { const k = b.at.replace(/data-/, ''); if (!sortes[k]) sortes[k] = x.id; }));
    const lesQuelles = Object.keys(sortes); const attendues = ['tfait'].concat(qui === 'marc' || qui === 'julie' ? ['tkxprev', 'strelctr'] : []);
    v('population : les sortes de bouton attendues pour ' + qui + ' sont là (' + lesQuelles.join(' ') + ')', attendues.every(k => lesQuelles.includes(k)), lesQuelles);
    for (const [k, id] of Object.entries(sortes)) {
      await p.evaluate(i => { try { fermerPanneau(); } catch (e) {} tDetail(i); }, id); await L.calme(p, 350);
      const av = await p.evaluate(() => ({ pan: (document.querySelector('#calque .panneau') || { innerText: '' }).innerText.length, nb: document.querySelectorAll('#calque .panneau').length, txt: (document.querySelector('#calque .panneau') || { innerText: '' }).innerText.slice(0, 80), toast: !!document.querySelector('#toast.on'), fait: null }));
      const sel = '#calque .tkx-barre .btn' + (k === 'tfait' ? '.gris[data-tfait], #calque .tkx-barre .btn[data-tfait]' : '[data-' + k + ']');
      const cible = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, t = document.elementFromPoint(x, y); return { x, y, sur: t ? (t.className || t.tagName) : '', ok: !!t && (t === e || e.contains(t)) }; }, sel);
      v('« ' + k + ' » : le point touché au milieu du bouton est bien le bouton ou son libellé', !!cible && cible.ok, cible);
      if (!cible || !cible.ok) continue;
      if (c.doigt) await p.touchscreen.tap(cible.x, cible.y); else await p.mouse.click(cible.x, cible.y); await L.calme(p, 600);
      const ap = await p.evaluate((i) => { const t = TACHES.find(o => o.id === i); return { pan: (document.querySelector('#calque .panneau') || { innerText: '' }).innerText.length, nb: document.querySelectorAll('#calque .panneau').length, txt: (document.querySelector('#calque .panneau') || { innerText: '' }).innerText.slice(0, 80), toast: (document.querySelector('#toast.on') || { textContent: '' }).textContent.slice(0, 80), fait: t ? !!t.fait : null, calque: (document.getElementById('calque') || { innerText: '' }).innerText.replace(/\s+/g, ' ').slice(0, 120) }; }, id);
      const bouge = k === 'tfait' ? ap.fait === true : (ap.txt !== av.txt || !!ap.toast || ap.nb !== av.nb);
      v('« ' + k + ' » (' + id + ') : le toucher sur le libellé déclenche le geste', bouge, { av, ap });
      await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); await L.calme(p, 200); }
    // 3. le libellé le plus long possible reste dans le bouton, le bouton dans l'écran, « Fait » entier
    const R = await p.evaluate(async () => { CLIENTS.zzlong = { nom: 'Société civile immobilière des Hauts de la Rochelle et Associés réunis pour la gestion', contact: 'Le gestionnaire', adr: '1 rue', tel: '', mail: 'x@y.fr', type: 'syndic' };
      TACHES.push({ id: 'tbl', t: 'Prévenir du retard de la pièce', qui: ROLE === 'tech' ? 'sm' : 'marc', d: AUJ, h: null, urgent: false, creePar: 'marc', creeLe: '31/10', lien: { t: 'client', id: 'zzlong', lib: 'x', cli: 'zzlong' } });
      tDetail('tbl'); await new Promise(r => setTimeout(r, 400)); const b = document.querySelector('#calque .tkx-barre'); let o = null;
      if (b) { const bt = [...b.querySelectorAll('.btn')].map(e => { const r = e.getBoundingClientRect(); return { t: e.textContent.trim().slice(0, 30), l: Math.round(r.left), r: Math.round(r.right), h: Math.round(r.height) }; }); o = { bt, sw: b.scrollWidth, cw: b.clientWidth, doc: document.documentElement.scrollWidth }; }
      try { fermerPanneau(); } catch (e) {} TACHES = TACHES.filter(x => x.id !== 'tbl'); delete CLIENTS.zzlong; return o; });
    v('population : la fiche au nom de 80 signes a une barre', !!R, R);
    if (R) { v('le nom de 80 signes : les boutons tiennent dans ' + c.largeur + ' px, ≤ 64 px de haut, pas de défilement latéral', R.bt.every(b => b.l >= 0 && b.r <= c.largeur && b.h <= 64) && R.sw <= R.cw + 1 && R.doc <= c.largeur + 1, R);
      await L.calme(p, 200); }
  }
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

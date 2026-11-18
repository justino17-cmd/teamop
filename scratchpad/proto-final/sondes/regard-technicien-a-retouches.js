// CONTRÔLES DURABLES des quatre retouches du regard « technicien a » (18 novembre 2026, après le second regard).
//   1. Ma journée avant pointage : « était à 08:30 » quand l'heure est passée, « est à » sinon ;
//   2. Demande de congé à 320 px : « Congé payé · 3 jours disponibles » ne passe plus sous la flèche du champ ;
//   3. iPad, calendrier six mois : jours fériés lisibles (≥ 11 px), détachés de la bande « CP », chiffre lisible sur le congé ;
//   4. barre d'onglets du gérant et du secrétariat à 320 px : « Comptabilité » ne touche ni ses voisins ni le bord de la pilule.
// Rejouable seul : node regard-technicien-a-retouches.js   → « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
// Chaque contrôle compte sa population avant de conclure ; le contraste se lit AU PIXEL (la couleur du chiffre vient du style calculé, le fond de la capture).
const fs = require('fs'), os = require('os'), path = require('path');
const L = require('../lib.js'), PNG = require('../../png.js');
(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'retouches-'));
  // ── 1. la phrase de Ma journée avant pointage (technicienne), sur les trois profils de téléphone et un grand écran
  for (const profil of ['iphone', 'android', 'ipad', 'mac']) {
    const c = await L.ouvrir({ profil, qui: 'sm' }), p = c.p;
    const dire = async h => { await p.evaluate(x => { window.__h = window.__h || INTS.filter(i => i.tech === 'sm' && i.d === AUJ).map(i => [i, i.h]); window.__h.forEach(([i]) => { i.h = x; }); POINTAGES.splice(0, POINTAGES.length, ...POINTAGES.filter(q => !(q.qui === 'sm' && q.date === AUJ))); }, h); await L.aller(p, 'majournee');
      return p.evaluate(() => { const e = document.querySelector('.ptx-hnow'); return { phrase: e ? e.textContent.trim() : null, maint: hNow() }; }); };
    const pop = await p.evaluate(() => INTS.filter(i => i.tech === 'sm' && i.d === AUJ && i.st !== 'annulee').length);
    L.v(`${profil} · retouche 1 : population (la technicienne a des interventions aujourd'hui)`, pop > 0, pop);
    const passee = await dire('00:05'), future = await dire('23:50');
    L.v(`${profil} · Ma journée : heure passée → « était à 00:05 »`, !!passee.phrase && /ta première intervention était à 00:05/.test(passee.phrase), passee);
    L.v(`${profil} · Ma journée : heure à venir → « est à 23:50 »`, !!future.phrase && /ta première intervention est à 23:50/.test(future.phrase), future);
    L.v(`${profil} · Ma journée : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  // ── 2. Demande de congé : le texte du champ Type tient entre le bord et la flèche, à tous les profils
  for (const profil of ['petit', 'android', 'iphone', 'ipad', 'mac']) {
    const c = await L.ouvrir({ profil, qui: 'sm' }), p = c.p; await L.aller(p, 'absences');
    const ok = await p.evaluate(() => { const b = document.querySelector('[data-anouv], [data-ademande], [data-atdem]'); if (b) { b.click(); return true; } try { aPanneauDemande(); return true; } catch (e) { return false; } }); await L.calme(p, 600);
    const m = await p.evaluate(() => { const s = document.getElementById('ad-ty'); if (!s) return null; const cs = getComputedStyle(s), cv = document.createElement('canvas').getContext('2d'); cv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      const libre = s.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 24;   // 24 px : la flèche du champ et son souffle
      const o = [...s.options].map(x => ({ t: x.textContent, w: Math.round(cv.measureText(x.textContent).width) })); return { libre: Math.round(libre), pire: o.reduce((a, b) => b.w > a.w ? b : a), n: o.length, premier: o[0] }; });
    L.v(`${profil} · retouche 2 : le champ Type existe (${m ? m.n : 0} choix)`, ok && !!m && m.n === 6, m);
    L.v(`${profil} · demande de congé : « ${m && m.premier.t} » tient avant la flèche (${m && m.premier.w} px pour ${m && m.libre})`, !!m && m.premier.w <= m.libre, m);
    L.v(`${profil} · demande de congé : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  // ── 3. iPad : calendrier six mois, jours fériés lisibles, détachés de la bande, chiffre lisible sur le congé (jour ET nuit)
  for (const nuit of [false, true]) {
    const tag = 'ipad' + (nuit ? ' nuit' : ''), c = await L.ouvrir({ profil: 'ipad', qui: 'sm', nuit }), p = c.p; await L.aller(p, 'absences');
    await p.evaluate(() => document.querySelector('[data-aper="6"]').click()); await L.calme(p, 700);
    const g = await p.evaluate(() => { const out = []; document.querySelectorAll('#contenu .acm-c.fer').forEach(k => { const f = k.querySelector('.acm-f'), n = k.querySelector('.acm-n'); if (!f) return; const lh = parseFloat(getComputedStyle(f).lineHeight) || 12; const fr = f.getBoundingClientRect();
      const x = [...k.parentElement.querySelectorAll('.acm-x')].find(b => { const br = b.getBoundingClientRect(), kr = k.getBoundingClientRect(); return br.left <= kr.left + 2 && br.right >= kr.right - 2; }); let ecart = null;
      if (x) { const sp = x.querySelector('span') || x, rg = document.createRange(); rg.selectNodeContents(sp); ecart = Math.round(rg.getBoundingClientRect().top - fr.bottom); }
      out.push({ t: f.textContent, fs: parseFloat(getComputedStyle(f).fontSize), coupe: f.scrollWidth > f.clientWidth + 1 || fr.height > lh * 2.2, sousBande: !!x, ecart, cp: k.classList.contains('cp') }); }); return out; });
    L.v(`${tag} · retouche 3 : population (jours fériés, dont un sous une bande d'absence)`, g.length >= 3 && g.some(x => x.sousBande), g);
    L.v(`${tag} · jours fériés : au moins 11 px`, g.every(x => x.fs >= 11), g.map(x => x.fs));
    L.v(`${tag} · jours fériés : aucun nom coupé`, g.every(x => !x.coupe), g.filter(x => x.coupe));
    L.v(`${tag} · jours fériés : la bande d’absence est à 12 px au moins du nom`, g.filter(x => x.sousBande).every(x => x.ecart >= 12), g.filter(x => x.sousBande));
    L.v(`${tag} · jours fériés : la case sous une bande porte la marque « cp » (chiffre à l'encre)`, g.filter(x => x.sousBande).every(x => x.cp), g.filter(x => x.sousBande));
    // contraste AU PIXEL du chiffre du jour férié sous la bande : encre calculée contre le fond lu dans la capture
    const cibles = await p.evaluate(() => { const k = [...document.querySelectorAll('#contenu .acm-c.fer')].find(k => k.classList.contains('cp')); if (!k) return null; k.scrollIntoView({ block: 'center' }); const n = k.querySelector('.acm-n'), f = k.querySelector('.acm-f'); return { cn: getComputedStyle(n).color, cf: f ? getComputedStyle(f).color : null }; });
    await L.calme(p, 300);
    const pos = await p.evaluate(() => { const k = [...document.querySelectorAll('#contenu .acm-c.fer')].find(k => k.classList.contains('cp')); const r = k.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    const fichier = path.join(tmp, 'c' + (nuit ? 'n' : 'j') + '.png'); await p.screenshot({ path: fichier });
    const img = PNG.decoder(fs.readFileSync(fichier)), fond = PNG.px(img, Math.round(pos.x + pos.w - 6), Math.round(pos.y + 8));
    const enc = cibles && PNG.lireCouleur(cibles.cn), ct = enc ? PNG.contraste(enc, fond) : 0;
    L.v(`${tag} · chiffre du jour férié sous le congé : contraste ≥ 4,5 (${ct}:1)`, ct >= 4.5, { enc, fond, cibles });
    if (cibles && cibles.cf) { const ef = PNG.lireCouleur(cibles.cf), cf = ef ? PNG.contraste(ef, fond) : 0; L.v(`${tag} · nom du jour férié sous le congé : contraste ≥ 4,5 (${cf}:1)`, cf >= 4.5, { ef, fond }); }
    L.v(`${tag} · aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  // ── 4. barre d'onglets à 320 px : le texte de chaque onglet reste dans la pilule, à 4 px de son voisin
  for (const nuit of [false, true]) for (const qui of ['marc', 'julie']) {
    const tag = `petit${nuit ? ' nuit' : ''} · ${qui}`, c = await L.ouvrir({ profil: 'petit', qui, nuit }), p = c.p; await L.calme(p, 300);
    if (qui === 'julie') await L.aller(p, 'taches');   // sur « Comptabilité » le secrétariat n'a que la barre de l'iframe : la barre du prototype se voit sur Tâches
    const vue = await p.evaluate(() => { const B = document.querySelector('.opg-barre'); if (!B) return false; const r = B.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e && !!e.closest('.opg-barre'); });
    L.v(`${tag} · retouche 4 : la barre mesurée est celle qui se voit (rien ne la recouvre)`, vue);
    const m = await p.evaluate(() => { const B = document.querySelector('.opg-barre'); if (!B) return null; const br = B.getBoundingClientRect(), cs = getComputedStyle(B), dedans = { g: br.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft), d: br.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight) };
      const t = [...B.querySelectorAll('.opg-tab')].map(b => { const rg = document.createRange(); rg.selectNodeContents(b.querySelector('.t-n')); const r = rg.getBoundingClientRect(), tr = b.getBoundingClientRect(); return { n: b.textContent.trim(), tl: r.left, tr: r.right, bl: tr.left, br: tr.right, fs: parseFloat(getComputedStyle(b).fontSize) }; });
      return { barre: [br.left, br.right], dedans, t }; });
    L.v(`${tag} · retouche 4 : cinq onglets`, !!m && m.t.length === 5, m && m.t.map(x => x.n));
    if (m && m.t.length === 5) {
      L.v(`${tag} · barre : aucun texte d'onglet hors de la pilule (rembourrage compris)`, m.t.every(x => x.tl >= m.dedans.g - 0.5 && x.tr <= m.dedans.d + 0.5), { dedans: m.dedans, t: m.t.map(x => [x.n, Math.round(x.tl), Math.round(x.tr)]) });
      const ecarts = m.t.slice(1).map((x, i) => Math.round((x.tl - m.t[i].tr) * 10) / 10);
      L.v(`${tag} · barre : 6 px au moins entre deux textes voisins (${ecarts.join(' · ')})`, ecarts.every(e => e >= 6), ecarts);
      L.v(`${tag} · barre : les onglets ne se chevauchent pas`, m.t.slice(1).every((x, i) => x.bl >= m.t[i].br - 0.5), m.t.map(x => [x.n, Math.round(x.bl), Math.round(x.br)]));
    }
    L.v(`${tag} · aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

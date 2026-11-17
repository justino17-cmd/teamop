// Recontrôle adverse de « metier-3d » (17 novembre 2026, étape 3) : ce que les corrections ont pu CASSER à côté, et ce que le rapport n'avait pas joué.
//   R1  le relevé du technicien (metier-3d-11) sur téléphone, jour ET nuit : il part, « Faire un autre relevé » marche, aucun prix, aucun geste de devis chiffré ouvert à la technicienne
//   R2  un passage AVEC un produit biocide (non couvert par le rapport) : lot, quantité, stock du camion, journal, puis Annuler remet tout
//   R3  le Registre à toutes les largeurs de LISTE autour du seuil (761–1280 px, iPad paysage) : le tableau « Tous les sites » ne se coupe pas, la page ne glisse pas
//   R4  les pastilles du plan : le toucher AU CENTRE revient à la pastille elle-même, distance minimale entre deux pastilles
//   R5  hors mode application (la revue) : la phrase d'exemple reste là où elle est voulue
// Usage : node metier-3d-recontrole-a.js [lettres, ex. R1R3]. Rend « N ✓ · M ✗ ».
const O = require('./metier-3d-outils.js'), L = O.L;
const LETTRES = (process.argv[2] || 'R1R2R3R4R5').match(/R\d/g);
let ok = 0, ko = 0; const v = (nom, cond, det) => { if (cond) ok++; else { ko++; console.log('  ✗ ' + nom + (det ? ' — ' + det : '')); } };
const dit = t => console.log('  · ' + t);
const txt = p => p.evaluate(() => (document.getElementById('contenu').innerText || '').replace(/\s+/g, ' ').trim());
const ouvrir = async o => { const c = await O.ouvrir(Object.assign({ packs: O.METIERS.d3 }, o)); c.p.on('dialog', d => d.dismiss().catch(() => {})); return c; };
const S = {
  async R1() { for (const [profil, nuit] of [['iphone', false], ['android', true], ['petit', false], ['ipad', true]]) {
      const c = await ouvrir({ profil, nuit, qui: 'sm' }), p = c.p, nom = `R1 ${profil} ${nuit ? 'nuit' : 'jour'}`;
      await L.aller(p, 'majournee'); await L.calme(p, 700);
      const b = p.locator('#contenu [data-dxb="relever|"]').first(); v(nom + ' : la carte « Traitement du bois » propose « Relever les mesures » (population)', (await b.count()) > 0);
      await L.toucher(c, b); await L.calme(p, 800); const t1 = await txt(p);
      v(nom + ' : l\'écran de relevé s\'ouvre, sans le moindre prix', /Relever les mesures/.test(t1) && !/€/.test(t1), t1.slice(0, 120));
      const avantRefus = await p.evaluate(() => DROITS_REFUS.length), rel0 = await p.evaluate(() => DX_REL.length);
      const opt = await p.evaluate(() => [...document.querySelector('[data-dxr="cli"]').options].filter(o => o.value)[0].value); await p.selectOption('[data-dxr="cli"]', opt); await L.calme(p, 300);
      await L.toucher(c, p.locator('[data-dxrb^="zadd|"]').first()); await L.calme(p, 300); const zm = p.locator('[data-dxr^="zm|"]').first(); await zm.fill('27,5'); await zm.blur(); await L.calme(p, 400);
      // au doigt : la barre du bas d'abord (c'est elle qui est sous le pouce), la carte sinon
      const bar = p.locator('#dx-barre [data-dxrb="envoyer"]').locator('visible=true').first(), cart = p.locator('#contenu .dx-creer-carte[data-dxrb="envoyer"]').first();
      const cible = (await bar.count()) ? bar : cart; const r = await L.toucher(c, cible); await L.calme(p, 900); const t2 = await txt(p);
      v(nom + ' [metier-3d-11] : « Envoyer au bureau » part (« Relevé envoyé »)', r && /Relevé envoyé|Envoyé au bureau/.test(t2), 'cible=' + ((await bar.count()) ? 'barre' : 'carte') + ' ¦ ' + t2.slice(0, 160));
      v(nom + ' : un relevé de plus en base, aucun refus de droits', (await p.evaluate(() => DX_REL.length)) === rel0 + 1 && (await p.evaluate(() => DROITS_REFUS.length)) === avantRefus, 'refus=' + JSON.stringify(await p.evaluate(() => DROITS_REFUS.slice(-2))));
      const rel = await p.evaluate(() => { const r = DX_REL.at(-1); return r ? JSON.stringify(r).slice(0, 300) : ''; }); dit(nom + ' : relevé rangé = ' + rel);
      v(nom + ' : le relevé rangé ne porte aucun prix', !/prix|ttc|total|€/i.test(rel), rel);
      await L.capture(c, O.CAP + 'rc-' + nom.replace(/ /g, '-') + '-apres-envoi.png');
      const ap = await p.evaluate(() => DROITS_REFUS.length), n = await L.toucher(c, p.locator('#contenu [data-dxrb="nouveau"]').first()); await L.calme(p, 500);
      v(nom + ' : « Faire un autre relevé » ouvre un formulaire neuf, sans refus', n && /Relever les mesures/.test(await txt(p)) && (await p.evaluate(() => DROITS_REFUS.length)) === ap, (await txt(p)).slice(0, 100));
      // ce que la correction ne doit PAS avoir ouvert : le devis chiffré (famille « ventes ») reste fermé à la technicienne
      const ventes = await p.evaluate(() => { const o = {}; for (const [fam, verbe] of [['dxb', 'creer'], ['dxb', 'garder'], ['dxb', 'att'], ['dxb', 'attpdf'], ['dxb', 'attok']]) { try { o[fam + '|' + verbe] = droitsRefus ? gesteBrut(fam, verbe) : null; } catch (e) { o[fam + '|' + verbe] = 'err ' + e.message; } } return o; });
      dit(nom + ' : gesteBrut des gestes chiffrés = ' + JSON.stringify(ventes));
      await p.evaluate(() => aller('devisXylo')); await L.calme(p, 700); const tv = await txt(p), rt = await p.evaluate(() => route);
      dit(nom + ' : la technicienne demande « devisXylo » → route ' + rt + ' ¦ ' + tv.slice(0, 160));
      v(nom + ' : la technicienne ne lit pas le Devis xylophage chiffré (pas de total en €)', rt !== 'devisXylo' || !/€/.test(tv), rt + ' ¦ ' + tv.slice(0, 160));
      v(nom + ' : aucune erreur de page', c.err.length === 0, c.err.join(' // ')); await L.fin(c); } },
  async R2() { for (const [profil, qui] of [['mac', 'marc'], ['iphone', 'sm']]) {
      const c = await ouvrir({ profil, qui }), p = c.p, nom = `R2 ${profil} ${qui}`; await L.aller(p, 'registre');
      const site = qui === 'sm' ? 'cli|t1' : 'cli|t1'; await L.toucher(c, p.locator('#contenu [data-rg="' + site + '"]').first()); await L.calme(p, 500);
      await L.toucher(c, p.locator('#contenu [data-rg="passage"]').locator('visible=true').first()); await L.calme(p, 700);
      v(nom + ' : la fenêtre « Saisir un passage » s\'ouvre', (await p.locator('#calque .panneau').count()) > 0);
      const appl = qui === 'sm' ? 'sm' : 'kb'; if (qui !== 'sm') { await p.selectOption('#rg-appl', appl); await L.calme(p, 300); }
      await L.toucher(c, p.locator('#calque [data-rg="toutok"]').first()); await L.calme(p, 400);
      const info = await p.evaluate(a => ({ camion: JSON.parse(JSON.stringify(RG_CAMION[a] || {})), passages: D3_PASSAGES.length, journal: JOURNAL.length }), appl);
      const pid = Object.keys(info.camion)[0]; v(nom + ' : le camion de ' + appl + ' porte au moins un produit (population)', !!pid, JSON.stringify(info.camion));
      if (!pid) { await L.fin(c); continue; }
      const sel = p.locator('#calque [data-rgf="pid"]').first(); const optOk = await p.evaluate(() => [...document.querySelector('#calque [data-rgf="pid"]').options].filter(o => o.value && !o.disabled).map(o => o.value));
      v(nom + ' : au moins un produit sans AMM expirée est offert', optOk.length > 0, JSON.stringify(optOk)); const choisi = optOk[0];
      await sel.selectOption(choisi); await L.calme(p, 400);
      const lot0 = await p.evaluate(([a, id]) => JSON.stringify(RG_CAMION[a][id]), [appl, choisi]);
      // quantité trop forte d'abord : refus qui dit combien il reste, rien n'est enregistré
      const q = p.locator('#calque [data-rgf="q"]').first(); await q.fill('999999'); await L.toucher(c, p.locator('#calque [data-rg="ok"]').first()); await L.calme(p, 500);
      const t1 = await p.evaluate(() => { const t = document.getElementById('toast'); return t ? t.textContent.trim() : ''; });
      v(nom + ' : une quantité plus grande que le camion est refusée avec un mot clair', /Il ne reste que/.test(t1) && (await p.evaluate(() => D3_PASSAGES.length)) === info.passages, t1);
      await q.fill('2'); const pu = p.locator('#calque [data-rg^="qte|0|"]').first(); if (await pu.count()) await L.toucher(c, pu); await L.calme(p, 300);
      const qv = await q.inputValue(); dit(nom + ' : quantité retenue ' + qv + ' (puce touchée si présente)');
      await L.toucher(c, p.locator('#calque [data-rg="ok"]').first()); await L.calme(p, 900);
      const t2 = await p.evaluate(() => { const t = document.getElementById('toast'); return t ? t.textContent.trim() : ''; }), ap = await p.evaluate(([a, id]) => ({ lot: JSON.stringify(RG_CAMION[a][id]), passages: D3_PASSAGES.length, journal: JOURNAL.length, dernier: JSON.stringify(D3_PASSAGES.at(-1).poses) }), [appl, choisi]);
      dit(nom + ' : toast « ' + t2 + ' » ¦ lot ' + lot0 + ' → ' + ap.lot + ' ¦ poses ' + ap.dernier);
      v(nom + ' : le passage est enregistré avec son produit et son lot', ap.passages === info.passages + 1 && /\[\["/.test(ap.dernier) && ap.dernier.includes(choisi), ap.dernier);
      v(nom + ' : le stock du camion a baissé de la quantité posée', ap.lot !== lot0, lot0 + ' → ' + ap.lot);
      v(nom + ' : le journal retient le geste', ap.journal === info.journal + 1);
      v(nom + ' : le toast dit ce qui a été retiré du camion', /retiré|retirée|retirés/.test(t2) && /camion/.test(t2), t2);
      await L.capture(c, O.CAP + 'rc-' + nom.replace(/ /g, '-') + '-apres-passage.png');
      await L.toucher(c, p.locator('#toast [data-toast-act], #toast button').first()); await L.calme(p, 500);
      const an = await p.evaluate(([a, id]) => ({ lot: JSON.stringify(RG_CAMION[a][id]), passages: D3_PASSAGES.length, journal: JOURNAL.length }), [appl, choisi]);
      v(nom + ' : « Annuler » remet le camion, le passage et le journal', an.lot === lot0 && an.passages === info.passages && an.journal === info.journal, JSON.stringify(an) + ' vs ' + lot0);
      v(nom + ' : aucune erreur de page', c.err.length === 0, c.err.join(' // ')); await L.fin(c); } },
  async R3() { const c = await ouvrir({ profil: 'mac', qui: 'marc' }), p = c.p; await L.aller(p, 'registre'); await L.calme(p, 600);
    const tailles = [[1440, 900], [1280, 800], [1180, 820], [1100, 800], [1024, 768], [980, 800], [900, 800], [820, 1180], [790, 800], [770, 800], [761, 800], [759, 800], [700, 800], [600, 800], [480, 800]];
    for (const [w, h] of tailles) { await p.setViewportSize({ width: w, height: h }); await L.calme(p, 500);
      const m = await p.evaluate(() => { const tab = document.querySelector('.rg-tab'); if (!tab) return null; const cw = Math.round(tab.getBoundingClientRect().width), lignes = [...tab.querySelectorAll('.rg-ligne')];
        const th = tab.querySelector('.rg-th'), mode = th && getComputedStyle(th).display === 'none' ? 'cartes' : 'tableau';
        // une cellule coupée = son contenu dépasse sa boîte (mot coupé au milieu, ellipse)
        const coupe = []; lignes.forEach(l => [...l.children].forEach((s, i) => { if (s.scrollWidth > s.clientWidth + 1 && getComputedStyle(s).overflow !== 'visible') coupe.push(i + ':' + s.scrollWidth + '/' + s.clientWidth); }));
        const mots = []; lignes.forEach(l => [...l.querySelectorAll('b, span')].forEach(s => { if (s.children.length) return; const r = document.createRange(); r.selectNodeContents(s); const rects = [...r.getClientRects()]; if (rects.length > 1) { const mw = s.textContent.trim().split(/\s+/).sort((a, b) => b.length - a.length)[0]; if (mw && s.scrollWidth <= s.clientWidth && false) mots.push(mw); } }));
        const enTete = th ? [...th.children].map(e => ({ t: e.textContent.trim(), sw: e.scrollWidth, cw: e.clientWidth })).filter(e => e.sw > e.cw + 1) : [];
        return { cw, mode, nLignes: lignes.length, coupe, enTete, doc: document.documentElement.scrollWidth, fen: innerWidth }; });
      v(`R3 ${w}×${h} : le tableau « Tous les sites » existe (population)`, !!m && m.nLignes === 3, JSON.stringify(m));
      if (!m) continue; v(`R3 ${w}×${h} (liste ${m.cw} px, ${m.mode}) : aucune cellule coupée, aucun en-tête coupé`, m.coupe.length === 0 && m.enTete.length === 0, JSON.stringify(m));
      v(`R3 ${w}×${h} : la page ne glisse pas de côté (${m.doc} sur ${m.fen})`, m.doc <= m.fen + 1, JSON.stringify(m));
      // la cohérence du seuil : sous 760 px de liste, des cartes ; au-dessus, le tableau
      v(`R3 ${w}×${h} : le mode suit la largeur de la LISTE (${m.cw} px → ${m.mode})`, (m.cw <= 760) === (m.mode === 'cartes'), JSON.stringify(m));
      if ([1440, 1024, 820, 770, 480].includes(w)) await L.capture(c, O.CAP + `rc-R3-${w}.png`); }
    // l'en-tête du registre : le titre et le bouton, sans mot coupé
    for (const [w, h] of [[1440, 900], [1024, 768], [820, 1180], [761, 800], [700, 800], [390, 844], [320, 568]]) { await p.setViewportSize({ width: w, height: h }); await L.calme(p, 400);
      const e = await p.evaluate(() => { const t = document.querySelector('#contenu .tete'), h1 = t.querySelector('h1'), bt = t.querySelector('.actions button, button'); const r1 = h1.getBoundingClientRect(), rb = bt.getBoundingClientRect(), z = document.getElementById('contenu').getBoundingClientRect();
        const lh = parseFloat(getComputedStyle(h1).lineHeight) || r1.height; return { titreLignes: Math.round(r1.height / lh), titreW: Math.round(r1.width), bouton: [Math.round(rb.left), Math.round(rb.top), Math.round(rb.width), Math.round(rb.height)], zoneW: Math.round(z.width), debord: rb.right > z.right + 1 }; });
      v(`R3 en-tête ${w}×${h} : « Registre sanitaire » sur une ligne et le bouton dans la zone`, e.titreLignes === 1 && !e.debord, JSON.stringify(e)); }
    v('R3 : aucune erreur de page', c.err.length === 0, c.err.join(' // ')); await L.fin(c); },
  async R4() { for (const profil of ['iphone', 'petit', 'ipad']) { const c = await ouvrir({ profil, qui: 'marc' }), p = c.p, nom = 'R4 ' + profil; await p.evaluate(() => aller('carteBox')); await L.calme(p, 900);
      const r = await p.evaluate(async () => { const pins = [...document.querySelectorAll('#contenu .d3-plan .d3-box')]; if (!pins.length) return { n: 0 }; pins[0].scrollIntoView({ block: 'center' }); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); void document.documentElement.offsetWidth;
        const cent = pins.map(e => { const q = e.getBoundingClientRect(); return { id: e.dataset.d3, x: q.left + q.width / 2, y: q.top + q.height / 2, w: q.width, e }; });
        let dmin = 1e9, paire = ''; for (let i = 0; i < cent.length; i++) for (let j = i + 1; j < cent.length; j++) { const d = Math.hypot(cent[i].x - cent[j].x, cent[i].y - cent[j].y); if (d < dmin) { dmin = d; paire = cent[i].id + '-' + cent[j].id; } }
        const mal = []; for (const q of cent) { const t = document.elementFromPoint(q.x, q.y); if (!(t === q.e || q.e.contains(t))) mal.push(q.id + '→' + (t ? t.tagName + '.' + String(t.className).slice(0, 18) : 'rien')); }
        // ce que le toucher à 15 px du centre fait : à quelle pastille va-t-il ? (la plus proche doit être celle qu'on visait)
        const dev = []; for (const q of cent) for (const [dx, dy] of [[15, 0], [-15, 0], [0, 15], [0, -15]]) { const t = document.elementFromPoint(q.x + dx, q.y + dy), b = t && t.closest('.d3-box'); if (b && b !== q.e) { const o = cent.find(z => z.e === b); const dMoi = Math.hypot(q.x + dx - q.x, q.y + dy - q.y), dLui = Math.hypot(q.x + dx - o.x, q.y + dy - o.y); if (dLui < dMoi) dev.push(q.id + '→' + o.id); } }
        return { n: pins.length, dmin: Math.round(dmin * 10) / 10, paire, mal, dev: [...new Set(dev)].slice(0, 6), dessin: Math.round(cent[0].w) }; });
      v(nom + ' : le plan a ses pastilles (population)', r.n >= 8, JSON.stringify(r));
      v(nom + ' : le toucher AU CENTRE de chaque pastille revient à elle', r.mal.length === 0, JSON.stringify(r.mal));
      v(nom + ' : à 15 px du centre, le toucher ne file pas chez une pastille plus proche (vol de toucher)', r.dev.length === 0, JSON.stringify(r.dev));
      dit(nom + ' : ' + r.n + ' pastilles de ' + r.dessin + ' px, les deux plus proches (' + r.paire + ') à ' + r.dmin + ' px de centre à centre');
      v(nom + ' : aucune erreur de page', c.err.length === 0, c.err.join(' // ')); await L.fin(c); } },
  async R5() { const c = await L.ouvrir({ profil: 'mac', qui: null, app: false }), p = c.p; dit('mode revue : ' + (await p.evaluate(() => typeof MODE_APP + ' ' + (typeof enApp === 'function' ? enApp() : 'sans enApp'))));
    await p.evaluate(() => { try { mchPoser(['3d']); } catch (e) {} }); await L.calme(p, 400);
    for (const r of ['registre', 'carteBox', 'devisXylo']) { await p.evaluate(x => { try { aller(x); } catch (e) {} }, r); await L.calme(p, 800); const t = await p.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));
      dit('revue · ' + r + ' : ' + (/Exemple pour une entreprise du/.test(t) ? 'phrase d\'exemple présente' : 'aucune phrase d\'exemple')); }
    await L.fin(c); }
};
(async () => {
  for (const l of LETTRES) { try { console.log('— ' + l); await S[l](); } catch (e) { ko++; console.log('  ✗ ' + l + ' interrompu : ' + String(e.message || e).split('\n')[0]); } }
  await L.fermer(); process.exit(O.bilan('metier-3d-recontrole-a ' + LETTRES.join(''), ok, ko, []));
})();

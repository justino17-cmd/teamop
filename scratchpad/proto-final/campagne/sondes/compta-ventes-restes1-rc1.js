// Recontrôle adverse des restes « compta-ventes », tour 1 (17 novembre 2026) — ce que les corrections ont pu casser À CÔTÉ.
// A · l'avoir d'une facture partielle : la tâche « Rembourser » TERMINÉE, que disent la fiche, la liste, le cadre, le compte client ?
// B · la facture à la main : tous les clients du menu règlent le taux, le texte suit, un taux changé à la main est reperdu sans erreur de page.
// Usage : node compta-ventes-restes1-rc1.js [profil] [nuit]
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
  const tc = async sel => { const r = await p.evaluate(q => { const e = document.querySelector(q); if (!e) return null; e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, sel);
    if (!r) return false; await p.waitForTimeout(300); if (c.doigt) await p.touchscreen.tap(r.x, r.y); else await p.mouse.click(r.x, r.y); await L.calme(p, 300); return true; };
  const cap = n => L.capture(c, X.CAP + `rc1-${profil}${nuit ? '-nuit' : ''}-${n}.png`);
  // ── A ──
  await X.fiche(c, 'f128'); await tc('[data-action="partiel"]'); await X.saisir(c, '#pp-m', '500'); await tc('#calque [data-action="partielOk"]'); await L.calme(p, 400);
  console.log('  état après le paiement partiel :', JSON.stringify(await p.evaluate(() => ({ recu: FACTURES.find(f => f.id === 'f128').recu, st: FACTURES.find(f => f.id === 'f128').st, avoirBouton: !!document.querySelector('[data-action="avoir"]') })))); await X.fiche(c, 'f128'); console.log('  boutons :', await p.evaluate(() => [...document.querySelectorAll('[data-action]')].map(b => b.dataset.action).join(' '))); console.log('  couvre :', await p.evaluate(() => { const b = document.querySelector('[data-action="avoir"]'); b.scrollIntoView({block:'center'}); const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2); return e ? e.tagName + '#' + e.id + '.' + e.className + ' / ' + (e.textContent||'').slice(0,40) : 'rien'; })); const okT = await tc('[data-action="avoir"]'); await L.calme(p, 500); console.log('  toucher avoir :', okT, JSON.stringify(await p.evaluate(() => (document.querySelector('#calque')||{}).innerText || 'calque vide')).slice(0, 150));
  const fen = await X.panneau(p); L.v('A1 · la fenêtre de l’avoir dit les 500 € déjà reçus', /500,00\s€ ont déjà été reçus/.test(fen), fen.slice(0, 300).replace(/\n/g, ' | ')); await cap('avoir-fenetre');
  await tc('#calque [data-action="avoirOk"]'); await L.calme(p, 500);
  await X.fiche(c, 'f128'); let fiche = await X.texte(p, '#contenu');
  L.v('A2 · la fiche annulée dit « À rembourser » tant que la tâche n’est pas faite', /À rembourser au client/.test(fiche)); await cap('fiche-avant');
  // la personne coche la tâche « Rembourser » comme n'importe quelle tâche
  const tid = await p.evaluate(() => { const x = TACHES.find(o => /^Rembourser/.test(o.t) && o.lien && o.lien.id === 'f128'); return x ? x.id : null; });
  L.v('A3 · population : la tâche « Rembourser » existe', !!tid);
  await p.evaluate(() => aller('taches')); await L.calme(p, 600);
  await L.toucher(c, '[data-tmodif="' + tid + '"]'); await L.calme(p, 500);
  console.log('  détail de la tâche :', JSON.stringify((await X.panneau(p)).slice(0, 500)));
  const bouton = await p.evaluate(id => { const b = document.querySelector('[data-tfait="' + id + '"]'); return b ? b.getBoundingClientRect().width : 0; }, tid);
  L.v('A4 · la tâche « Rembourser » se coche depuis la liste', bouton > 0, bouton);
  if (bouton > 0) { await L.toucher(c, '[data-tfait="' + tid + '"]'); await L.calme(p, 500); }
  const fait = await p.evaluate(id => { const x = TACHES.find(o => o.id === id); return !!(x && x.fait); }, tid);
  L.v('A5 · la tâche est faite', fait);
  await X.fiche(c, 'f128'); fiche = await X.texte(p, '#contenu'); await cap('fiche-apres-remboursement');
  L.v('A6 · une fois le remboursement fait, la fiche ne dit plus « À rembourser au client 500,00 € » comme s’il restait à faire', !/À rembourser au client\s*\n?\s*500,00/.test(fiche), fiche.slice(fiche.indexOf('Déjà reçu') - 40, fiche.indexOf('Déjà reçu') + 160).replace(/\n/g, ' | '));
  const f = await X.cadreOuvert(c); await f.evaluate(() => aller('ventes')); await p.waitForTimeout(800);
  await f.evaluate(() => document.querySelector('#contenu tr[data-fac="FAC-2026-0128"]').click()); await p.waitForTimeout(600);
  const pan = await f.evaluate(() => { const e = document.querySelector('#calque .panneau'); return e ? e.innerText.replace(/\s+/g, ' ').trim() : ''; });
  L.v('A7 · le panneau du cadre ne dit pas « à rembourser » après le remboursement fait', !/à rembourser/i.test(pan), pan.slice(0, 300)); await cap('cadre-panneau-apres');
  // ── B ──
  await X.compta(c, 'fventes', { cat: 'ventes' }); await L.toucher(c, '[data-cx="nouveau"]'); await L.toucher(c, '#calque [data-cx="facture"]');
  const opts = await p.evaluate(() => [...document.querySelectorAll('#nf-c option')].map(o => [o.value, o.textContent]).filter(o => o[0]));
  L.v('B1 · population : au moins 5 clients dans le menu', opts.length >= 5, opts.length);
  const res = [];
  for (const [k] of opts) {
    await p.evaluate(v => { const s = document.getElementById('nf-c'); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); }, k);
    res.push(await p.evaluate(v => ({ k: v, type: CLIENTS[v].type, tva: document.getElementById('nf-t').value, aide: (document.getElementById('nf-th') || {}).textContent }), k));
  }
  L.v('B2 · chaque client règle le taux : particulier 10, professionnel 20', res.every(r => r.tva === (r.type === 'part' ? '10' : '20')), res.map(r => r.k + ':' + r.type + ':' + r.tva));
  L.v('B3 · le texte d’aide suit le client choisi', res.every(r => (r.type === 'part') === /Particulier/.test(r.aide)), res.map(r => r.aide));
  await p.evaluate(() => { const s = document.getElementById('nf-c'); s.value = ''; s.dispatchEvent(new Event('change', { bubbles: true })); });
  const apresVide = await p.evaluate(() => document.getElementById('nf-t').value);
  L.v('B4 · revenir sur « Choisir le client… » ne casse rien (taux gardé)', c.err.length === 0, { apresVide, err: c.err.slice(0, 2) });
  await p.evaluate(() => { const s = document.getElementById('nf-c'); s.value = 'md'; s.dispatchEvent(new Event('change', { bubbles: true })); document.getElementById('nf-t').scrollIntoView({ block: 'center' }); });
  await p.waitForTimeout(400);
  const dep = await L.deborde(c).catch(() => null); console.log('  débordement :', JSON.stringify(dep));
  const aide = await p.evaluate(() => { const h = document.getElementById('nf-th'), r = h.getBoundingClientRect(); return { lignes: Math.round(r.height / parseFloat(getComputedStyle(h).lineHeight)), droite: Math.round(r.right), ecran: innerWidth, taille: getComputedStyle(h).fontSize }; });
  L.v('B5 · le texte d’aide du taux est dans l’écran (≤ ' + c.largeur + ' px)', aide.droite <= c.largeur + 1, aide);
  await cap('facture-main-tva');

  L.v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });

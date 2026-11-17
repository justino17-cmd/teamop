// Recontrôle ADVERSE de la partie « Clients » (17 novembre 2026) — la LISTE : recherche (mots, accents, téléphone sous toutes ses écritures, caractères spéciaux),
// message « aucun résultat », en-têtes « Par mois » / « Par semaine » sur tous les téléphones, état des boutons du rangement pendant une recherche.
// Écrite SANS reprendre le code des sondes du correcteur : chaque contrôle part du DOM et de ce que la personne voit.
// Usage : PROFIL=… NUIT=1 node clients-recontrole-liste.js   ·   « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', QUI = process.env.QUI || 'marc', NUIT = !!process.env.NUIT, TEL = ['iphone', 'android', 'petit'].includes(PROFIL);
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/clients-recontrole/', ETQ = PROFIL + (NUIT ? '-nuit' : '');
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: QUI, nuit: NUIT }), p = c.p;
  const noms = () => p.evaluate(() => [...document.querySelectorAll('#contenu .client-carte > span:first-child b')].map(b => b.textContent));
  const chercher = async t => { await p.fill('[data-cherche]', t); await L.calme(p, 250); return noms(); };
  await L.aller(p, 'clients');
  const tous = await noms();
  v('population : 8 cartes au départ (' + tous.length + ')', tous.length === 8, tous);
  const cas = [
    ['hôtel plage', ['Hôtel de la Plage']], ['plage hôtel', ['Hôtel de la Plage']], ['HOTEL   PLAGE', ['Hôtel de la Plage']], ['  hôtel  ', ['Hôtel de la Plage']],
    ['durand', ['M. et Mme Durand', 'Restaurant Le Vieux Port']], ['durand gérant', ['Restaurant Le Vieux Port']], ['chatelaillon', ['Hôtel de la Plage']],
    ['contrat', null], ['mimosas syndic', ['Copropriété Les Mimosas']], ['roux@mail', ['Mme Roux']], ['aytré', ['Camping Les Pins', 'Mme Roux']],
    ['06.55.44.33.22', ['Mme Roux']], ['+33 6 55 44 33 22', ['Mme Roux']], ['0033 6 55 44 33 22', ['Mme Roux']], ['06-55-44', ['Mme Roux']], ['(06) 55 44', ['Mme Roux']], ['0655443322', ['Mme Roux']],
    ['06 12 34 56 78', ['Restaurant Le Vieux Port']], ['+33612345678', ['Restaurant Le Vieux Port']], ['46 00 11', ['Hôtel de la Plage']], ['06 55 44 33 22 99', []], ['07 55 44', []],
    ['17000', ['Cabinet dentaire Martin', 'Copropriété Les Mimosas', 'Restaurant Le Vieux Port']],
  ];
  for (const [q, att] of cas) { const r = await chercher(q); if (att === null) { v('recherche « ' + q + ' » : seulement des clients qui ont un contrat signé (' + r.join(' | ') + ')', r.length >= 1 && r.length < 7, r); continue; }
    v('recherche « ' + q + ' » → ' + (att.join(' | ') || 'aucun'), JSON.stringify([...r].sort()) === JSON.stringify([...att].sort()), r); }
  // caractères qui cassent les expressions régulières ou le HTML : la page ne meurt pas, rien n'est interprété
  for (const q of ['((', '[', '\\', '.*', '+', '<img src=x onerror="window.__xss=1">', '"><b id=zz>']) { await chercher(q); const z = await p.evaluate(() => ({ xss: window.__xss || 0, zz: !!document.getElementById('zz'), img: document.querySelectorAll('#contenu img[src="x"]').length, vide: ((document.querySelector('#contenu .carte.gris') || {}).textContent || '').trim().slice(0, 60) }));
    v('recherche « ' + q.slice(0, 20) + ' » : pas d’erreur, rien d’injecté', !z.xss && !z.zz && !z.img && c.err.length === 0, { z, err: c.err.slice(-2) }); }
  await chercher('');
  // message « aucun résultat » : il dit quoi faire, et un mot très long ne fait pas glisser la page
  const LONG = 'x'.repeat(260); await chercher(LONG);
  const vide = await p.evaluate(() => { const e = document.querySelector('#contenu .carte.gris'); return e ? { t: e.textContent.replace(/\s+/g, ' ').trim(), r: e.getBoundingClientRect().right } : null; });
  v('« aucun résultat » (260 signes sans espace) : il dit quoi faire', !!vide && /Nouveau client/.test(vide.t) && /orthographe/.test(vide.t), vide && vide.t.slice(-90));
  const d0 = await L.deborde(c); v('« aucun résultat » (260 signes) : la page ne glisse pas de côté', d0.bouge === 0 && vide.r <= c.largeur + 1, d0);
  await L.capture(c, CAP + 'liste-vide-long-' + ETQ + '.png'); await chercher('zzzz'); await L.capture(c, CAP + 'liste-vide-' + ETQ + '.png');
  await chercher('');
  // rangement + recherche : un seul bouton est « enfoncé » à la fois
  for (const rang of ['mois', 'semaine']) { await L.toucher(c, `[data-rangc="${rang}"]`);
    const sans = await p.evaluate(() => [...document.querySelectorAll('[data-rangc]')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.rangc));
    v('« Par ' + rang + ' » : un seul rangement enfoncé (' + sans.join(',') + ')', sans.length === 1 && sans[0] === rang, sans);
    await L.capture(c, CAP + 'liste-' + rang + '-' + ETQ + '.png');
    const th = await p.evaluate(() => { const e = document.querySelector('#contenu .cl-tete'), ph = e && e.querySelector(':scope > div:first-child > .gris'), bt = e && e.querySelector('button'); if (!ph) return null; const a = ph.getBoundingClientRect(), r = e.getBoundingClientRect(), b = bt.getBoundingClientRect(), lh = parseFloat(getComputedStyle(ph).lineHeight) || 20; return { phrase: Math.round(a.width), tete: Math.round(r.width), lignes: Math.round(a.height / lh), bouton: [Math.round(b.width), Math.round(b.height)], dessous: b.top >= a.bottom - 1 }; });
    if (TEL) v('« Par ' + rang + ' » : la phrase d’aide prend la largeur (' + JSON.stringify(th) + ')', !!th && th.phrase >= th.tete * 0.85 && th.lignes <= 4, th);
    else v('« Par ' + rang + ' » : phrase d’aide sur au plus 2 lignes (' + JSON.stringify(th) + ')', !!th && th.lignes <= 2, th);
    const dd = await L.deborde(c); v('« Par ' + rang + ' » : la page ne glisse pas de côté', dd.bouge === 0, dd);
    if (c.doigt) { const g = await L.doigts(p, '#contenu'); v('« Par ' + rang + ' » : cibles ≥ 44 px, champs ≥ 16 px, aucun texte écrasé', g.petits.length === 0 && g.champs.length === 0 && g.ecrases.length === 0, g); }
    // taper dans la recherche depuis ce rangement
    await p.fill('[data-cherche]', 'durand'); await L.calme(p, 300);
    const pen = await p.evaluate(() => [...document.querySelectorAll('[data-rangc]')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.rangc));
    v('recherche « durand » tapée dans « Par ' + rang + ' » : UN seul rangement a l’air choisi (' + pen.join(',') + ')', pen.length === 1, pen);
    await L.capture(c, CAP + 'liste-' + rang + '-recherche-' + ETQ + '.png');
    await p.fill('[data-cherche]', ''); await L.calme(p, 300);
    const retour = await p.evaluate(() => ({ h: !!document.querySelector('#contenu .cl-tete'), cartes: document.querySelectorAll('#contenu .client-carte').length, foc: document.activeElement && document.activeElement.dataset ? Object.keys(document.activeElement.dataset).join() : '' }));
    v('recherche effacée : on retrouve le rangement « Par ' + rang + ' » (' + JSON.stringify(retour) + ')', retour.cartes === 0, retour);
    await L.toucher(c, '[data-rangc="tous"]'); }
  v('aucune erreur JavaScript pendant la passe', c.err.length === 0, c.err);
  const code = L.bilan(); await L.fin(c); await L.fermer(); process.exit(code ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e); process.exit(2); });

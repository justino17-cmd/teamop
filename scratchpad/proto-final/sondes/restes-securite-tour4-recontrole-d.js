// RECONTRÔLE ADVERSE du tour 4, passe D : titre de fiche avec un nom SANS espace (112 « Wm »), avec des émojis, des invisibles ; coût des fonctions à graphèmes (10 000 appels) ; accès de 3 lignes sur 320 px. 127.0.0.1 seulement.
const L = require('../lib.js'), v = L.v;
const NOMW = 'Wm'.repeat(56), NOME = '🇫🇷'.repeat(30) + ' Boulangerie ' + '👨‍👩‍👧'.repeat(10) + ' des Halles'.repeat(3);
(async () => {
  for (const [profil, nuit, nom, tag] of [['petit', false, NOMW, 'sansespace-320'], ['iphone', true, NOMW, 'sansespace-iphone-nuit'], ['ipad', false, NOMW, 'sansespace-ipad'], ['petit', true, NOME, 'emojis-320-nuit'], ['android', false, NOMW, 'sansespace-android']]) {
    const c = await L.ouvrir({ profil, nuit, qui: 'marc', attente: 1500 }), p = c.p;
    const k = await p.evaluate(n => { const k = Object.keys(CLIENTS).find(x => x !== '__nv' && CLIENTS[x].tel); CLIENTS[k].nom = n; CLIENTS[k].contact = 'W'.repeat(60) + 'm'.repeat(60); CLIENTS[k].adr = 'A'.repeat(160); aller('client-x-' + k); return k; }, nom);
    await L.calme(p, 900);
    const m = await p.evaluate(() => { const h = document.querySelector('.tete-client h1'), cs = getComputedStyle(h), lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2; const bs = [...document.querySelectorAll('.tete-client .actions .btn')]; const bar = document.querySelector('.barre-bas'); const haut = bar && getComputedStyle(bar).display !== 'none' ? bar.getBoundingClientRect().top : innerHeight; const ap = bs.find(b => /Appeler/.test(b.textContent)); const sous = document.querySelector('.tete-client > div:first-child > span.gris'); const sr = sous && sous.getBoundingClientRect();
      return { lignes: Math.round(h.getBoundingClientRect().height / lh), largeurH1: Math.round(h.getBoundingClientRect().width), sw: document.documentElement.scrollWidth, appelerBas: ap ? Math.round(ap.getBoundingClientRect().bottom) : null, barreHaut: Math.round(haut), sousDroite: sr ? Math.round(sr.right) : null, sousH: sr ? Math.round(sr.height) : null }; });
    L.v(tag + ' · titre ≤ 2 lignes', m.lignes <= 2, m);
    L.v(tag + ' · pas de débordement horizontal (scrollWidth ≤ ' + c.largeur + ')', m.sw <= c.largeur + 1, m);
    L.v(tag + ' · Appeler est au-dessus de la barre d’onglets', m.appelerBas !== null && m.appelerBas <= m.barreHaut, m);
    L.v(tag + ' · le sous-titre (contact 120 sans espace, adresse 160 sans espace) ne sort pas de l’écran', m.sousDroite !== null && m.sousDroite <= c.largeur + 1, m);
    await L.capture(c, '/tmp/claude-0/cap-rec4c/d-' + tag + '.png');
    if (tag === 'sansespace-320') {
      const t = await p.evaluate(() => { const g = 'Syndicat des copropriétaires 🇫🇷 de la résidence Les Jardins du Port 👨‍👩‍👧 de Rochefort-sur-Mer, représenté par son syndic'.repeat(2); const t0 = performance.now(); for (let i = 0; i < 10000; i++) coupeSure(g, 120); const a = performance.now() - t0; const t1 = performance.now(); for (let i = 0; i < 5000; i++) cliNet({ nom: g, contact: g, adr: g, acces: g + '\n' + g, mail: 'a@b.fr', tel: '0546' }); const b = performance.now() - t1;
        const t2 = performance.now(); for (let i = 0; i < 300; i++) CLIENTS['zz' + i] = { nom: 'Client numéro ' + i + ' ' + g.slice(0, 80), type: 'pro', contact: 'C', tel: '0546123456', mail: 'a@b.fr', adr: '1 rue, 17000 La Rochelle', acces: '', depuis: '2026', appareils: [] }; aller('clients'); const c2 = performance.now() - t2; return { coupe10000: Math.round(a), cliNet5000: Math.round(b), liste300: Math.round(c2) }; });
      console.log('  · coûts :', JSON.stringify(t));
      L.v('coût : 10 000 coupeSure < 1,5 s et 5 000 cliNet < 3 s (un frappe n’en fait qu’une poignée)', t.coupe10000 < 1500 && t.cliNet5000 < 3000, t); }
    L.v(tag + ' · aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });

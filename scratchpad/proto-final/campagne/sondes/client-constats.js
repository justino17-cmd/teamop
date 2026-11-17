// Espace client : les constats de MISE EN PAGE et de VOCABULAIRE du rapport client.json, un contrôle par défaut (le numéro est dans le nom).
// À rejouer après les corrections : chaque contrôle doit passer au vert. node client-constats.js [profil]  → « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const O = require('./client-outils.js'), L = O.L, v = L.v;
const profil = process.argv[2] || 'iphone', app = process.argv.includes('app');
(async () => {
  const c = app ? await O.clientApp({ profil, cli: 'mi' }) : await O.client({ profil, cli: 'mi' }); const p = c.p;
  const tel = c.doigt && c.largeur < 700;
  // client-08 : « En retard » n'est pas dit au client à propos d'une visite de l'entreprise
  await p.evaluate(() => { RL_CLI.cli = 'mi'; EC.tab = 'interventions'; rendre(); }); await L.calme(p, 300);
  const enRetard = await p.evaluate(() => INTS.filter(i => i.cli === 'mi' && i.st === 'retard').length);
  v('population : la visite « en retard » du client Mimosas existe (' + enRetard + ')', enRetard >= 1, enRetard);
  const li = await p.evaluate(() => document.querySelector('.ec').innerText.replace(/\s+/g, ' '));
  v('client-08 · une visite en retard n’est pas étiquetée « En retard » au client', !/En retard/.test(li), li.slice(0, 220));
  // client-17 : la date n'est pas écrite deux fois sur une ligne de facture
  await p.evaluate(() => { RL_CLI.cli = 'md'; EC.tab = 'factures'; rendre(); }); await L.calme(p, 300);
  const lignes = await p.evaluate(() => [...document.querySelectorAll('.ec-l')].map(e => e.innerText.replace(/\s+/g, ' ').split(/ Payer| Voir/)[0]));
  v('population : des lignes de facture (' + lignes.length + ')', lignes.length >= 2, lignes.length);
  v('client-17 · aucune date écrite deux fois sur une ligne de facture', lignes.every(t => { const m = t.match(/\d\d\/\d\d/g) || []; return new Set(m).size === m.length; }), lignes.join(' | '));
  // client-18 : un bouton « Copier » à côté de l'IBAN
  const iban = await p.evaluate(() => { const z = [...document.querySelectorAll('.ec .carte')].find(e => /IBAN/.test(e.innerText)); return z ? [...z.querySelectorAll('button')].map(b => b.textContent.trim()) : null; });
  v('client-18 · l’IBAN a un bouton « Copier »', !!iban && iban.some(t => /Copier/.test(t)), JSON.stringify(iban));
  // client-09 : la fenêtre de paiement — tuiles pleine largeur, numéro de facture sur UNE ligne
  await L.toucher(c, '[data-ec^="payer|"]'); await L.calme(p, 300);
  const m9 = await p.evaluate(() => { const g = document.querySelector('.panneau .cx-montants'); if (!g) return null; const b = [...g.querySelectorAll('b')].find(x => /FAC-/.test(x.textContent)); const lh = parseFloat(getComputedStyle(b).lineHeight) || parseFloat(getComputedStyle(b).fontSize) * 1.3; const r = g.getBoundingClientRect(), dernier = [...g.children].pop().getBoundingClientRect(), pan = g.parentElement.getBoundingClientRect();
    return { lignes: Math.round(b.getBoundingClientRect().height / lh), droite: Math.round(dernier.right), largeurPanneau: Math.round(pan.right) }; });
  v('client-09 · le numéro de facture tient sur une ligne', !!m9 && m9.lignes <= 1, JSON.stringify(m9));
  if (tel) v('client-09 · les tuiles Montant / Facture occupent la largeur de la fenêtre', !!m9 && m9.droite >= m9.largeurPanneau - 40, JSON.stringify(m9));   // au bureau la fenêtre est une feuille étroite à droite : seule la largeur du téléphone se juge
  await O.nettoyer(p);
  // client-14 : une seule navigation à la fois sur téléphone
  await p.evaluate(() => { RL_CLI.cli = 'md'; EC.tab = 'accueil'; rendre(); }); await L.calme(p, 300);
  const nav = await p.evaluate(() => ({ onglets: !!document.querySelector('.ec-seg') && document.querySelector('.ec-seg').offsetParent !== null, barre: !!document.querySelector('.opg-barre') && document.querySelector('.opg-barre').offsetParent !== null, lat: !!document.querySelector('.rl-mlien') && document.querySelector('.rl-mlien').offsetParent !== null }));
  if (tel) v('client-14 · téléphone : onglets du haut OU barre du bas, pas les deux', !(nav.onglets && nav.barre), JSON.stringify(nav));
  else v('client-14 · ordinateur : menu latéral OU onglets du haut, pas les deux', !(nav.onglets && nav.lat), JSON.stringify(nav));
  const ordres = await p.evaluate(() => { const o = s => [...document.querySelectorAll(s)].map(b => b.textContent.replace(/[^A-Za-zÀ-ÿ ]/g, '').trim().replace(/^Mes |^Mon /, '')).filter(Boolean); return { onglets: o('.ec-seg button'), barre: o('.opg-barre .opg-tab'), menu: o('.rl-mlien') }; });
  const cle = a => a.map(x => x.split(' ')[0]).join(',');
  const jeux = Object.values(ordres).filter(a => a.length); v('client-14 · tous les endroits de navigation visibles listent les mêmes destinations dans le même ordre', new Set(jeux.map(cle)).size <= 1, JSON.stringify(ordres));
  // client-15 : pas de carré « OP » (le logiciel) dans l'entête du client, nom de l'entreprise une seule fois
  const ent = await p.evaluate(() => { const t = document.querySelector('.rl-bar, .tt-logo, header .logo, .logo'); const noms = [...document.querySelectorAll('body *')].filter(e => e.offsetParent !== null && !e.children.length && /^Clim Services 17$/.test(e.textContent.trim())).length; const op = [...document.querySelectorAll('i')].some(e => e.offsetParent !== null && e.textContent.trim() === 'OP' && !e.closest('.rl-bande, .m-faite')); return { op, noms }; });
  v('client-15 · le carré « OP » du logiciel n’apparaît pas dans l’entête du client', !ent.op, JSON.stringify(ent));
  v('client-15 · le nom de l’entreprise est écrit une seule fois dans l’entête', ent.noms <= 1, JSON.stringify(ent));
  // client-20 : cibles tactiles du pied de la barre latérale (iPad)
  if (c.doigt && c.largeur >= 700) { const pied = await p.evaluate(() => [...document.querySelectorAll('[data-modetheme]')].filter(b => b.offsetParent !== null).map(b => b.textContent.trim() + ' ' + Math.round(b.getBoundingClientRect().height))); v('client-20 · Jour / Nuit / Auto font au moins 44 px de haut au doigt', pied.length >= 3 && pied.every(x => +x.split(' ').pop() >= 44), JSON.stringify(pied)); }
  // téléphone (client-14, décision du chef du 17/11) : UNE navigation, la barre du bas ; la feuille « Menu » ne répète plus les cinq entrées, et chaque entrée de la barre mène à son onglet
  if (tel) { const cles = ['accueil', 'factures', 'interventions', 'devis', 'contrats']; let n = 0;
    await L.toucher(c, '[data-menu="ouvrir"]'); const f = await O.dessus(p); v('menu · la feuille s’ouvre', /Menu/.test(f.panneauTitre), f.panneauTitre);
    v('menu · la feuille du client ne répète pas les cinq destinations (barre du bas = la seule navigation)', !/Factures|Interventions|Devis|Contrat/.test(f.panneau) && /Apparence/i.test(f.panneau), f.panneau.slice(0, 120)); await O.nettoyer(p);
    for (const k of cles) { await p.evaluate(() => { RL_CLI.cli = 'md'; EC.tab = 'accueil'; rendre(); }); await L.calme(p, 250);
      const ok = await L.toucher(c, `.opg-barre [data-ec="tab|${k}"]`); await L.calme(p, 300); const d = await O.dessus(p); if (ok) n++;
      v(`barre · l’entrée « ${k} » mène à son onglet`, ok && d.tab === k, JSON.stringify(d).slice(0, 200)); }
    v('barre · population : cinq entrées touchées', n === 5, n); }
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

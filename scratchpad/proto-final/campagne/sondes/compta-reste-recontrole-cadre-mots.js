// Recontrôle : le cadre OP COMPTABLE (mode application) avec une liste de mots PLUS LARGE que celle du correcteur (exemple, essai, démo, test, bouchon, factice…), menu compris.
// Chaque phrase trouvée s'imprime ; un « N ✓ · M ✗ » dit combien de rubriques en portent. À relire à la main : « test » peut être légitime (« tester le prélèvement »).
const X = require('./compta-reste-outils.js'), L = X.L, v = L.v;
// mots qui contiennent un motif sans être de l'échafaudage : « ressaisir » (r-ESSAI-sir), l'« écriture d'essai » (une FONCTION de la clôture, que la personne passe pour répéter l'année), le « filtre ni brouillard, ni essai » du FEC et le nom officiel de l'outil de l'administration (« Test Compta Demat »)
const PERMIS = /ressais|[ée]critures? d.essai|ni brouillard, ni essai|Test Compta Demat/gi;
const ECHAF = /prototype|vraie version|essai|exemple|fictif|fictive|simul|démo\b|la démo|démonstration|tests? guidés?|\btests?\b|factice|bouchon|en vrai\b|lorem|TODO|bientôt|à venir bientôt/i;
(async () => {
  const c = await L.ouvrir({ profil: process.argv[2] || 'mac', nuit: process.argv[3] === 'nuit', qui: 'marc' }), p = c.p; const f = await X.cadreCompta(c);
  const menu = await f.evaluate(() => document.querySelector('#menu').innerText.replace(/\s+/g, ' ')); console.log('MENU (vue simple) :', menu);
  v('CM0 · le menu ne propose ni « La démo » ni « Tests guidés » à une vraie personne', !/La démo|Tests guidés/.test(menu), menu);
  const lire = async vue => { const rs = await f.evaluate(() => [...document.querySelectorAll('#menu a')].map(a => a.getAttribute('href').slice(1)));
    for (const r of rs) { await f.evaluate(x => { try { aller(x); } catch (e) {} }, r); await p.waitForTimeout(350); const t = await f.evaluate(() => document.querySelector('#contenu').innerText);
      const m = [...new Set((t.match(new RegExp('[^.\\n]*(' + ECHAF.source + ')[^.\\n]*', 'gi')) || []).map(s => s.trim().slice(0, 170)))].filter(x => ECHAF.test(x.replace(PERMIS, ''))); v(`CM · ${vue} › ${r} : aucun mot d’échafaudage (${t.length} car.)`, t.length > 50 && m.length === 0, m); } };
  await lire('simple'); await f.evaluate(() => { UI.expert = true; rendre(); }); await p.waitForTimeout(500);
  const menu2 = await f.evaluate(() => document.querySelector('#menu').innerText.replace(/\s+/g, ' ')); v('CM0b · le menu comptable ne propose ni « La démo » ni « Tests guidés »', !/La démo|Tests guidés/.test(menu2), menu2);
  await lire('comptable');
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });

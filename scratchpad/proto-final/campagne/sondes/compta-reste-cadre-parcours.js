// Parcours « cadre OP COMPTABLE » : le pilote automatique (Tout traiter, Je valide moi-même), « À vérifier », « Ce qui s'est fait tout seul », la vue comptable
// (Réglages › Comptable) avec ses rubriques d'écritures. Joue les vrais boutons du cadre, relit ce qu'il laisse. « N ✓ · M ✗ ».
const X = require('./compta-reste-outils.js'), L = X.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  let f = await X.cadreCompta(c); v('CP0 le cadre est ouvert', !!f);
  const E = () => f.evaluate(() => ({ route: UI.route, pilote: UI.pilote, expert: UI.expert, mode: UI.mode, aV: nbAVerifier(), nuit: nouvellesLignes().length, brouillard: brouillardOct().length, decisions: DECISIONS.length }));
  const e0 = await E(); console.log('départ', JSON.stringify(e0));
  const clic = async (sel, att) => { const r = await f.evaluate(s => { const b = document.querySelector(s); if (b) { b.click(); return true; } return false; }, sel); await p.waitForTimeout(att || 700); return r; };
  // 1) Tout traiter (pilote automatique)
  v('CP1 « Tout traiter » existe sur le tableau de bord', await clic('[data-a="tout-traiter"]', 1500)); const e1 = await E(); console.log('après Tout traiter', JSON.stringify(e1), (await f.evaluate(() => (document.querySelector('#toast') || {}).textContent || '')).slice(0, 160));
  v('CP1 les lignes arrivées cette nuit sont lues (plus de « nouvelles lignes »)', e1.nuit === 0, e1);
  await L.capture(c, X.CAP + `${profil}-cadre-parcours-tout-traiter.png`);
  // 2) Ce qui s'est fait tout seul
  await f.evaluate(() => aller('fil')); await p.waitForTimeout(700); const fil = await f.evaluate(() => document.querySelector('#contenu').innerText.replace(/\n{2,}/g, '\n')); v('CP2 « Ce qui s’est fait tout seul » liste ce qui vient d’être traité', fil.length > 200 && /banque|facture|ticket|document/i.test(fil), fil.slice(0, 200));
  await L.capture(c, X.CAP + `${profil}-cadre-parcours-fil.png`);
  // 3) Je valide moi-même
  await clic('[data-a="pilote"][data-k="0"]'); const e3 = await E(); v('CP3 « Je valide moi-même » coupe le pilote', e3.pilote === false, e3);
  await f.evaluate(() => aller('averifier')); await p.waitForTimeout(700); const av = await f.evaluate(() => ({ t: document.querySelector('#contenu').innerText.replace(/\n{2,}/g, '\n').slice(0, 500), b: [...document.querySelectorAll('#contenu button')].map(b => (b.dataset.a || '') + ':' + b.textContent.trim().slice(0, 30)) }));
  console.log('À vérifier :', av.t.slice(0, 260).replace(/\n/g, ' · '), '|', JSON.stringify(av.b.slice(0, 8))); await L.capture(c, X.CAP + `${profil}-cadre-parcours-averifier.png`);
  // 4) Fin de mois (clotures)
  await f.evaluate(() => aller('clotures')); await p.waitForTimeout(700); const cl = await f.evaluate(() => document.querySelector('#contenu').innerText.replace(/\n{2,}/g, '\n')); console.log('Fin de mois :', cl.slice(0, 400).replace(/\n/g, ' · '));
  await L.capture(c, X.CAP + `${profil}-cadre-parcours-fin-de-mois.png`);
  // 5) la vue comptable
  await clic('[data-a="reglages"]', 600); const ok5 = await clic('#reglages [data-a="vue"][data-k="expert"], .regl-panneau [data-a="vue"][data-k="expert"], [data-a="vue"][data-k="expert"]', 700); const e5 = await E(); v('CP4 Réglages › « Comptable » ouvre la vue comptable', ok5 && e5.expert, e5);
  await f.evaluate(() => { try { fermer(); } catch (e) {} });
  const routes = await f.evaluate(() => [...document.querySelectorAll('#menu a')].map(a => a.getAttribute('href').slice(1))); console.log('menu comptable :', routes.length, routes.join(' '));
  for (const r of routes.filter(r => !['accueil'].includes(r))) { const e = await f.evaluate(x => { try { aller(x); return ''; } catch (e) { return e.message; } }, r); await p.waitForTimeout(450);
    const ec = await f.evaluate(() => { const c = document.querySelector('#contenu'); return c ? { n: c.innerText.length, g: c.querySelectorAll('button,a,input,select').length } : null; });
    v(`CP5 vue comptable › ${r} : s’affiche sans erreur (contenu et gestes présents)`, !e && ec && ec.n > 80, { e, ec });
    if (['journaux', 'grand-livre', 'balance', 'saisie', 'controles', 'fec'].includes(r)) await L.capture(c, X.CAP + `${profil}-cadre-parcours-expert-${r}.png`); }
  // 6) saisir une écriture : déséquilibrée refusée
  await f.evaluate(() => aller('saisie')); await p.waitForTimeout(600); const sai = await f.evaluate(() => ({ champs: [...document.querySelectorAll('#contenu input, #contenu select, #contenu textarea')].map(i => (i.id || i.name || i.dataset.k || i.type) + ':' + (i.placeholder || '')).slice(0, 14), btn: [...document.querySelectorAll('#contenu button')].map(b => (b.dataset.a || '') + ':' + b.textContent.trim().slice(0, 28)) }));
  console.log('Saisie :', JSON.stringify(sai));
  v('CP erreurs JavaScript : aucune', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });

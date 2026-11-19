// Angle « ponts » · sonde 2 : « la personne SUIVANTE du même appareil ». Le gérant compose un devis (nom d'un client, prix), puis se déconnecte.
// Que lit, sans mot de passe : (a) quelqu'un qui tape l'adresse de l'atelier ?app=1, (b) une technicienne qui se connecte, sur tous les écrans que ses droits ouvrent ?
const L = require('../lib.js'), A = require('../sondes/atelier-outils.js'), fs = require('fs');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/ponts/';
const MARQUE = 'ZXQ-CONFIDENTIEL-4471';
(async () => {
  fs.mkdirSync(CAP, { recursive: true });
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1500 });
  const f = await A.ouvrirAtelier(c, 'devis', 'devis');
  L.v('population : l\'atelier s\'ouvre (sinon rien ne se prouve)', !!f);
  await A.composerDevis(c, f, { client: 'hp', objet: 'Devis ' + MARQUE, articles: [{ ref: 'GS-20', qte: 2 }] });
  await f.locator('[data-act="retour"]:visible').first().click().catch(() => {}); await c.p.waitForTimeout(900);
  const stock = await c.p.evaluate(() => Object.keys(localStorage).map(k => [k, localStorage.getItem(k).length]));
  console.log('rangé :', JSON.stringify(stock));
  await c.p.evaluate(() => sessionFermer()); await c.p.waitForTimeout(700);
  // (a) l'atelier par son adresse, SANS session, dans un onglet neuf du même appareil
  const a = await c.ctx.newPage(); await a.goto(`http://127.0.0.1:${c.port}/apercu/prototype-documents.html?app=1`, { waitUntil: 'load' }); await a.waitForTimeout(1500);
  const txtA = await a.evaluate(() => document.body.innerText);
  const aDocs = await a.evaluate(() => (typeof S !== 'undefined' ? S.docs.length : -1));
  console.log('(a) atelier ?app=1 sans session : docs en mémoire', aDocs, '· texte contient la marque :', txtA.includes(MARQUE));
  L.v('population : les documents SONT en mémoire de la page (aDocs ≥ 1) — c\'est l\'écran qui doit les cacher', aDocs >= 1, { aDocs });
  L.v('(a) l\'atelier ouvert par son adresse, sans session, n\'affiche rien (page blanche : il ne vit que dans le cadre d\'OP GESTION) et ne montre pas le devis', !txtA.includes(MARQUE) && txtA.trim().length < 30, { n: txtA.trim().length, marque: txtA.includes(MARQUE) });
  await a.screenshot({ path: CAP + 'atelier-sans-session.png' });
  // l'atelier sans ?app=1 (variante « revue ») : autre clé, démo seulement ?
  // (b) une technicienne se connecte : tout ce que ses droits ouvrent, cherché pour la marque
  const t = await c.ctx.newPage(); await t.goto(`http://127.0.0.1:${c.port}/apercu/prototype-op-gestion.html?app=1&auto=sm`, { waitUntil: 'load' }); await t.waitForTimeout(2000);
  await t.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await t.waitForTimeout(400);
  const info = await t.evaluate(() => ({ role: ROLE, session: SESSION, n: typeof ATD !== 'undefined' ? ATD.docs.length : -1, routes: Object.keys(vues()).filter(r => { try { return droitVoit(r); } catch (e) { return false; } }) }));
  console.log('(b) technicienne : rôle', info.role, '· docs chargés en mémoire', info.n, '· écrans ouverts', info.routes.length);
  L.v('population : la technicienne a des écrans ouverts', info.routes.length > 3, info.routes.length);
  const vus = [];
  for (const r of info.routes) { try { await t.evaluate(x => aller(x), r); await t.waitForTimeout(260); const tx = await t.evaluate(() => document.getElementById('contenu').innerText); if (tx.includes(MARQUE)) vus.push(r); } catch (e) {} }
  L.v('(b) aucun écran de la technicienne n\'affiche le devis du gérant (' + info.routes.length + ' écrans lus)', vus.length === 0, vus);
  // la palette « Rechercher »
  const pal = await t.evaluate(m => { try { return palEntrees().map(e => e.l + ' ' + (e.s || '')).filter(x => x.includes(m)).length; } catch (e) { return -1; } }, MARQUE);
  L.v('(b) la palette de recherche de la technicienne ne propose pas ce devis', pal === 0, pal);
  const roles = await t.evaluate(() => { const o = {}; EQUIPE.forEach(p => { const r = p.role || p.r || '?'; o[r] = (o[r] || 0) + 1; }); return o; }).catch(() => null);
  console.log('personnes par rôle (la clé du courrier porte le rôle, pas la personne) :', JSON.stringify(roles));
  console.log('erreurs :', c.err.slice(0, 3)); await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });

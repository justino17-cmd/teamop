// Angle « ponts » · sonde 6 : (1) ce que la Comptabilité reçoit DANS SON ADRESSE (paramètre « liaison » : toutes les factures de vente, noms de clients, montants) — taille, et ce que ça implique ;
// (2) une page d'une AUTRE origine qui insère l'atelier (HOTE = elle) reçoit-elle les documents que la personne a composés (opd_docs, écrit avec '*') ?
const L = require('../lib.js'), A = require('../sondes/atelier-outils.js'), fs = require('fs');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/ponts/';
const MARQUE = 'ZXQ-FUITE-9921';
(async () => {
  fs.mkdirSync(CAP, { recursive: true });
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1500 }), p = c.p;
  // ── 1. la liaison dans l'adresse ──
  const U = await p.evaluate(() => { const u = opLiaSrc(); const P = opLiaDonnees(); return { longueur: u.length, factures: P.factures.length, enc: P.enc.length, apercu: decodeURIComponent(u).slice(0, 220), noms: P.factures.slice(0, 3).map(f => f.nom) }; });
  console.log('liaison :', JSON.stringify(U));
  L.v('population : la liaison porte des factures de vente (noms de clients, montants)', U.factures >= 5, U);   // la population se lit sur les DONNÉES (opLiaDonnees), pas sur l'adresse : après correction, l'adresse n'en porte plus
  L.v('1. l\'adresse du cadre Comptabilité reste sous 2 000 caractères (limite prudente des serveurs, journaux et historiques) — mesuré : ' + U.longueur + ' pour ' + U.factures + ' factures', U.longueur <= 2000, U.longueur);
  // la même adresse avec 200 factures de vente (une vraie entreprise) : l'adresse REELLE du cadre, calculée par l'application, après y avoir ajouté 192 factures (retirées ensuite)
  const U2 = await p.evaluate(() => { const base = FACTURES.length, f0 = FACTURES.find(f => f.num !== '—'); for (let i = 0; i < 192; i++) FACTURES.push(Object.assign({}, f0, { id: 'zz' + i, num: 'FAC-2026-' + (1000 + i) })); const n = opLiaSrc().length; FACTURES.length = base; return { n, total: base + 192 }; });
  console.log('adresse du cadre à ' + U2.total + ' factures : ' + U2.n + ' caractères');
  L.v('1b. à ' + U2.total + ' factures l\'adresse reste sous 8 000 caractères (au-delà, nginx, Caddy et la plupart des CDN répondent 414/431 : la Comptabilité ne s\'ouvre plus)', U2.n <= 8000, U2);
  // la Comptabilité reçoit-elle bien toutes les factures de l'application, quelle que soit la façon de les lui donner (adresse ou message) ?
  await p.evaluate(() => { try { cpSysAllerRubrique('comptabilite'); } catch (e) {} }); await p.waitForTimeout(2500);
  const cm = L.cadre(p, /prototype-comptabilite/);
  L.v('population : la Comptabilité est ouverte', !!cm);
  if (cm) { const att = await p.evaluate(() => FACTURES.filter(f => f.num !== '—').length), recu = await cm.evaluate(() => OPL_NUMS.size).catch(() => -1);
    L.v('0. la Comptabilité connaît les ' + att + ' factures de vente de l\'application (liaison : ' + recu + ')', att >= 5 && recu === att, { att, recu }); await p.evaluate(() => { try { cpSysteme = false; aller('devis'); } catch (e) {} }); await p.waitForTimeout(400); }
  // ── 2. fuite des documents vers la page qui insère l'atelier ──
  const f = await A.ouvrirAtelier(c, 'devis', 'devis');
  L.v('population : l\'atelier s\'ouvre', !!f);
  await A.composerDevis(c, f, { client: 'hp', objet: 'Devis ' + MARQUE, articles: [{ ref: 'GS-20', qte: 2 }] });
  await f.locator('[data-act="retour"]:visible').first().click().catch(() => {}); await p.waitForTimeout(900);
  const rang = await p.evaluate(() => (localStorage.getItem('documents-sur-mesure-opg-v1') || '').includes('ZXQ-FUITE-9921'));
  L.v('population : le devis composé est rangé dans le stockage de 127.0.0.1', rang);
  const port = c.port, EXT = 'http://localhost:' + port, INT = 'http://127.0.0.1:' + port;
  const att = await c.ctx.newPage(); await att.goto(EXT + '/apercu/404.html', { waitUntil: 'load' });
  await att.evaluate(u => { window.__recu = []; addEventListener('message', e => window.__recu.push(JSON.stringify(e.data).slice(0, 600))); const fr = document.createElement('iframe'); fr.style.cssText = 'width:1200px;height:800px'; fr.src = u; document.body.appendChild(fr); }, INT + '/apercu/prototype-documents.html?app=1');
  await att.waitForTimeout(3000);
  const recu = await att.evaluate(() => window.__recu);
  console.log('messages reçus par la page d\'une autre origine :', JSON.stringify(recu));
  L.v('2. la page d\'une autre origine qui insère l\'atelier ne reçoit pas le devis composé par la personne (marque trouvée : ' + recu.some(x => x.includes(MARQUE)) + ')', !recu.some(x => x.includes(MARQUE)), recu);
  // même page, mais de la MÊME origine (cas d'un autre onglet du site) : c'est elle, l'hôte légitime
  const mm = await c.ctx.newPage(); await mm.goto(INT + '/apercu/404.html', { waitUntil: 'load' });
  await mm.evaluate(u => { window.__recu = []; addEventListener('message', e => window.__recu.push(JSON.stringify(e.data).slice(0, 600))); const fr = document.createElement('iframe'); fr.style.cssText = 'width:1200px;height:800px'; fr.src = u; document.body.appendChild(fr); }, INT + '/apercu/prototype-documents.html?app=1');
  await mm.waitForTimeout(3000);
  const recu2 = await mm.evaluate(() => window.__recu);
  L.v('témoin : la même insertion depuis la MÊME origine reçoit bien le devis (sans quoi le test précédent ne prouve rien)', recu2.some(x => x.includes(MARQUE)), recu2.map(x => x.slice(0, 80)));
  console.log('erreurs page :', c.err.slice(0, 3)); await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });

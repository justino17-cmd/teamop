// Angle « ponts » · sonde 4 : LES QUATRE ÉCOUTEURS 'message' ET LES ENVOIS postMessage(…, '*').
// Trois situations, chacune avec un TÉMOIN (le geste légitime, qui doit marcher — sinon « sans effet » ne prouve rien) :
//   A. une page d'une AUTRE origine (localhost, quand la page sert sur 127.0.0.1) qui insère l'application, la Comptabilité ou l'atelier dans un cadre et leur écrit ;
//   B. l'hôte (même origine) qui envoie à l'atelier des données hostiles : __proto__, balisage, tailles énormes, types faux ;
//   C. l'hôte qui envoie à la Comptabilité des factures hostiles (nom de client en balisage, éléments nuls).
// Ce que l'on relève : la page change-t-elle d'état, exécute-t-elle du code (window.__xss), est-elle encore vivante ensuite ; et qui REÇOIT ce que les pages disent à leur parent.
const L = require('../lib.js'), fs = require('fs');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/ponts/';
const XSS = '<img src=x onerror="window.__xss=(window.__xss||0)+1">';
(async () => {
  fs.mkdirSync(CAP, { recursive: true });
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 800, page: '404.html', requete: '' });
  const p = c.p, port = c.port, EXT = 'http://localhost:' + port, INT = 'http://127.0.0.1:' + port;
  const attendre = (cond, arg, ms) => p.waitForFunction(cond, arg, { timeout: ms || 6000 }).then(() => true, () => false);
  // ═══ A. page d'une autre origine → application insérée dans un cadre ═══
  const att = await c.ctx.newPage(); await att.goto(EXT + '/apercu/404.html', { waitUntil: 'load' });
  await att.evaluate(({ u }) => { window.__recu = []; addEventListener('message', e => window.__recu.push({ o: e.origin, d: JSON.stringify(e.data).slice(0, 200) })); const f = document.createElement('iframe'); f.id = 'app'; f.style.cssText = 'width:1300px;height:800px'; f.src = u; document.body.appendChild(f); }, { u: INT + '/apercu/prototype-op-gestion.html?app=1&auto=marc' });
  await att.waitForTimeout(3500);
  const app = att.frames().find(f => /prototype-op-gestion/.test(f.url()));
  L.v('population : l\'application est insérée dans le cadre d\'une page d\'une autre origine', !!app && await app.evaluate(() => typeof SESSION !== 'undefined' && !!SESSION).catch(() => false));
  if (app) {
    await app.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); });
    await app.evaluate(() => { cpSysAllerRubrique('comptabilite'); }); await att.waitForTimeout(2500);
    const cm = att.frames().find(f => /prototype-comptabilite/.test(f.url()));
    L.v('population : la Comptabilité est ouverte dans l\'application cadrée', !!cm);
    await app.evaluate(() => { try { cpSysteme = false; } catch (e) {} aller('devis'); }); await att.waitForTimeout(400);
    await app.evaluate(() => { opdOuvrir('devis', {}); }); await att.waitForTimeout(2500);
    const at = att.frames().find(f => /prototype-documents/.test(f.url()));
    L.v('population : l\'atelier est ouvert dans l\'application cadrée', !!at);
    const avant = await app.evaluate(() => ({ cli: Object.keys(CLIENTS).length, docs: ATD.docs.length, mode: document.documentElement.dataset.mode, pay: FACTURES.filter(f => f.st === 'payee').length, enc: ENCAISSEMENTS.length, zz: !!CLIENTS.zz }));
    // messages forgés depuis la page d'une autre origine, vers la fenêtre de l'application (fenêtre de premier niveau du cadre)
    await att.evaluate(() => { const w = document.getElementById('app').contentWindow;
      const num = 'FAC-2026-0123';
      [{ opc_paiement: { num, mode: 'virement', date: '2026-11-17', montant: 99999 } }, { opc_ouvrir: { sorte: 'facture', cle: num } }, { opc_relance: { num, n: 9 } }, { opc_pret: 1 }, { opc_mode_choisi: 'nuit' }, { opc_echap: true }, { opc_lien_q: { num, cle: 'x' } },
        { opd_client: { id: 'zz', nom: 'Pirate' } }, { opd_docs: [{ id: 'pirate1', type: 'devis', etat: 'envoye', nom: 'x', numero: 'D-2026-999', client: 'Pirate', ttc: 5, prix: 0, maj: Date.now() }] }, { opd_fermer: { motif: 'fin' } }, { opd_pret: true }]
        .forEach(m => w.postMessage(m, '*')); });
    await att.waitForTimeout(800);
    const apres = await app.evaluate(() => ({ cli: Object.keys(CLIENTS).length, docs: ATD.docs.length, mode: document.documentElement.dataset.mode, pay: FACTURES.filter(f => f.st === 'payee').length, enc: ENCAISSEMENTS.length, zz: !!CLIENTS.zz, atelierOuvert: !document.getElementById('opdz').hidden }));
    L.v('A1. onze messages forgés par une AUTRE origine vers l\'application : aucun client créé, aucun document ajouté, mode inchangé, aucun paiement, atelier toujours ouvert', apres.cli === avant.cli && apres.docs === avant.docs && apres.mode === avant.mode && apres.pay === avant.pay && apres.enc === avant.enc && !apres.zz && apres.atelierOuvert, { avant, apres });
    // témoin : le MÊME message, venu du vrai cadre, a un effet (sinon A1 ne prouve rien)
    const tem = await app.evaluate(() => { const f = document.querySelector('#opdz iframe'); const w = f.contentWindow; return typeof w.postMessage === 'function'; });
    const tem2 = await at.evaluate(() => { opdPoster({ opd_client: { id: 'temoinzz', nom: 'Témoin légitime' } }); return true; }); await att.waitForTimeout(500);
    L.v('A1 témoin : le même message venu du VRAI cadre de l\'atelier crée bien le client (la forme du message est donc juste)', await app.evaluate(() => !!CLIENTS.temoinzz) && tem && tem2);
    // A2. envois vers le parent : l'atelier et la Comptabilité écrivent à window.parent avec '*' — la page d'une autre origine qui les insère les REÇOIT-elle ?
    const A2 = await att.evaluate(() => window.__recu.length); // messages venus de l'APPLICATION cadrée (elle écrit à son parent ?)
    console.log('messages reçus par la page d\'une autre origine depuis l\'application cadrée :', A2, await att.evaluate(() => JSON.stringify(window.__recu.slice(0, 5))));
    L.v('A2. l\'application insérée dans un cadre d\'une autre origine n\'écrit RIEN à la page qui l\'insère (ni pont, ni état)', A2 === 0, A2);
    await att.screenshot({ path: CAP + 'messages-cadre-autre-origine.png' });
  }
  await att.close();
  // A3. la Comptabilité et l'atelier insérés DIRECTEMENT par la page d'une autre origine : que reçoit-elle ?
  for (const [nom, u] of [['atelier', '/apercu/prototype-documents.html?app=1'], ['comptabilite', '/apercu/prototype-comptabilite.html?app=1&liaison=' + encodeURIComponent(JSON.stringify({ factures: [], enc: [] }))]]) {
    const a = await c.ctx.newPage(); await a.goto(EXT + '/apercu/404.html', { waitUntil: 'load' });
    await a.evaluate(u => { window.__recu = []; addEventListener('message', e => window.__recu.push({ o: e.origin, k: Object.keys(e.data || {}).join(','), d: JSON.stringify(e.data).slice(0, 160) })); const f = document.createElement('iframe'); f.style.cssText = 'width:1200px;height:800px'; f.src = u; document.body.appendChild(f); }, INT + u);
    await a.waitForTimeout(2800);
    const recu = await a.evaluate(() => window.__recu);
    console.log('A3 ' + nom + ' inséré par une autre origine : la page reçoit', JSON.stringify(recu));
    // et elle lui écrit : l'atelier (HOTE = la page qui l'insère) obéit à CETTE page ; la Comptabilité aussi (aucun contrôle)
    const fr = a.frames().find(f => f !== a.mainFrame());
    await a.evaluate(() => { const w = document.querySelector('iframe').contentWindow; w.postMessage({ opc_role: { role: 'patron', paie: true, prenom: 'Pirate' }, opd_role: { devis: true, contrats: true }, opd_donnees: { entreprise: { nom: 'PIRATE' }, clients: [{ id: 'p1', nom: 'Client du pirate' }] } }, '*'); });
    await a.waitForTimeout(700);
    const etat = fr ? await fr.evaluate(() => ({ role: typeof CMPT !== 'undefined' ? CMPT.role : null, paie: typeof CMPT !== 'undefined' ? CMPT.paie : null, ent: typeof ENTREPRISE !== 'undefined' ? ENTREPRISE.nom : null, cli: typeof S !== 'undefined' && S.clients ? S.clients.length : null })).catch(() => null) : null;
    console.log('A3 ' + nom + ' après les messages de l\'autre origine :', JSON.stringify(etat));
    if (nom === 'comptabilite') L.v('A3. la Comptabilité insérée par une autre origine accepte « patron + paie » de cette page (écouteur sans contrôle de source — voir acces-13, injection-04)', !!etat && etat.role === 'patron' && etat.paie === true, etat);
    if (nom === 'atelier') L.v('A3. l\'atelier inséré par une autre origine n\'obéit qu\'à la page qui l\'insère (HOTE) : attendu — rien à corriger côté prototype, règle pour la vraie application (frame-ancestors)', !!etat && (etat.ent === 'PIRATE' || etat.cli >= 1), etat);
    await a.close();
  }
  // ═══ B. hôte (même origine) → atelier : données hostiles ═══
  const h = await c.ctx.newPage(); await h.goto(INT + '/apercu/404.html', { waitUntil: 'load' });
  await h.evaluate(u => { window.__recu = []; addEventListener('message', e => window.__recu.push(e.data)); const f = document.createElement('iframe'); f.style.cssText = 'width:1300px;height:850px'; f.src = u; document.body.appendChild(f); }, INT + '/apercu/prototype-documents.html?app=1&mode=jour');
  await h.waitForTimeout(2500);
  const at = h.frames().find(f => /prototype-documents/.test(f.url()));
  L.v('population : l\'atelier cadré par l\'hôte d\'essai a dit « prêt »', !!at && (await h.evaluate(() => window.__recu.some(m => m && m.opd_pret))));
  const gros = 'x'.repeat(5e6), chaine = s => s;
  const proto = JSON.parse('{"id":"__proto__","nom":"Proto"}');
  const envoyer = m => h.evaluate(m => document.querySelector('iframe').contentWindow.postMessage(m, '*'), m);
  await envoyer({ opd_role: { devis: true, contrats: true } });
  await envoyer({ opd_donnees: { entreprise: { nom: XSS, adresse: XSS, iban: XSS, tel: XSS }, clients: [{ id: 'c1', nom: XSS, adresse: XSS, email: XSS, tel: XSS, contact: XSS }, proto, { id: 'constructor', nom: 'C' }, { id: 'a b', nom: 'espace' }, null, 5, 'x', [1], { id: 'c1', nom: 'doublon' }, { id: 'long', nom: gros }].concat(Array.from({ length: 3000 }, (_, i) => ({ id: 'n' + i, nom: 'N' + i }))),
    catalogue: [{ ref: XSS, des: XSS, unite: XSS, puC: 100, tvaBp: 2000, cat: XSS }, { ref: 'X', des: 'y', puC: -1, tvaBp: 20000 }, { ref: '__proto__', des: 'p', puC: 1, tvaBp: 1 }, { ref: 'NaN', des: 'n', puC: NaN, tvaBp: 1 }, { ref: 'F', des: 'f', puC: 1.5, tvaBp: 1 }].concat(Array.from({ length: 1000 }, (_, i) => ({ ref: 'R' + i, des: 'd', puC: 1, tvaBp: 1 }))),
    numeros: { devis: { prefixe: XSS, dernier: 1e99 }, contrat: { prefixe: 'CTR-', dernier: -5 } } } });
  await h.waitForTimeout(1200);
  const E1 = await at.evaluate(() => ({ cli: S.clients.length, cat: CATALOGUE.length, polluted: ({}).nom || ({}).des || null, ent: ENTREPRISE.nom, xss: window.__xss || 0, nums: JSON.stringify(OPG.numeros) })).catch(e => ({ erreur: e.message.slice(0, 80) }));
  console.log('B. après données hostiles :', JSON.stringify(E1));
  L.v('B1. l\'atelier garde ≤ 500 clients et ≤ 400 articles, rejette __proto__/constructor, ne pollue pas Object.prototype', E1.cli <= 500 + 0 && E1.cat <= 400 && !E1.polluted && !E1.erreur, E1);
  // le balisage doit s'AFFICHER comme du texte : on ouvre un nouveau devis, on choisit le client, on regarde le DOM
  await envoyer({ opd_ouvrir: { faire: 'devis', client: 'c1' } }); await h.waitForTimeout(1500);
  const E2 = await at.evaluate(() => ({ xss: window.__xss || 0, imgs: document.querySelectorAll('img[src="x"]').length, texte: document.body.innerText.includes('<img src=x') })).catch(e => ({ erreur: e.message.slice(0, 80) }));
  L.v('B2. le balisage envoyé par l\'hôte (nom, adresse, IBAN, article) ne s\'exécute pas dans l\'atelier (0 exécution, 0 image injectée)', E2.xss === 0 && E2.imgs === 0 && !E2.erreur, E2);
  await h.screenshot({ path: CAP + 'messages-atelier-hostile.png' });
  await envoyer({ opd_ouvrir: { faire: 'doc', id: '__proto__' } }); await envoyer({ opd_ouvrir: 5 }); await envoyer({ opd_role: null }); await envoyer({ opd_mode: { toString: null } }); await envoyer([1, 2]); await envoyer(null);
  await h.waitForTimeout(500);
  L.v('B3. après messages de forme fausse (null, tableau, nombre, __proto__) l\'atelier répond encore (témoin : un opd_mode juste est appliqué)', await (async () => { await envoyer({ opd_mode: 'nuit' }); await h.waitForTimeout(300); return at.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark').catch(() => false); })());
  await h.close();
  // ═══ C. hôte → Comptabilité : factures hostiles ═══
  const k = await c.ctx.newPage(); const liaison = { prochain: 130, factures: [{ num: 'FAC-2026-0901', cli: 'x1', nom: XSS, type: 'pro', objet: XSS, ht: 100, taux: 20, st: 'envoyee', emise: '2026-11-01', ech: '2026-12-01', mode: '', paye: '', recu: 0, relances: 0 }], enc: [] };
  await k.goto(INT + '/apercu/404.html', { waitUntil: 'load' });
  await k.evaluate(u => { window.__recu = []; addEventListener('message', e => window.__recu.push(e.data)); const f = document.createElement('iframe'); f.style.cssText = 'width:1300px;height:850px'; f.src = u; document.body.appendChild(f); }, INT + '/apercu/prototype-comptabilite.html?app=1&liaison=' + encodeURIComponent(JSON.stringify(liaison)));
  await k.waitForTimeout(2500);
  const cm = k.frames().find(f => /prototype-comptabilite/.test(f.url()));
  L.v('population : la Comptabilité cadrée par l\'hôte d\'essai a dit « prête »', !!cm && (await k.evaluate(() => window.__recu.some(m => m && m.opc_pret))));
  if (cm) {
    const routes = await cm.evaluate(() => ROUTES.slice());
    let vus = 0; for (const r of routes) { try { await cm.evaluate(x => aller(x), r); await k.waitForTimeout(220); vus++; } catch (e) {} }
    const X = await cm.evaluate(() => ({ xss: window.__xss || 0, imgs: document.querySelectorAll('img[src="x"]').length, clients: CLIENTS.filter(c => /onerror/.test(c.nom)).length }));
    L.v('C1. un nom de client et un objet de facture en balisage, reçus par la liaison, ne s\'exécutent sur aucune des ' + routes.length + ' rubriques de la Comptabilité (population : le client hostile y existe : ' + X.clients + ')', X.xss === 0 && X.imgs === 0 && X.clients >= 1 && vus === routes.length, { X, vus, routes: routes.length });
    await k.evaluate(() => { const w = document.querySelector('iframe').contentWindow; [{ opc_ventes: { factures: [null, 5, 'x', { num: 'FAC-2026-0902', emise: '2026-11-02', nom: 'X', ht: 'abc' }], enc: [null, { fac: 'FAC-2026-0902', d: '2026-11-03' }] } }, { opc_ventes: { factures: 'x' } }, { opc_role: null }, { opc_aller: { r: '__proto__' } }, { opc_aller: { r: 'accueil', ouvre: '"]) , (' } }, { opc_liens: { cle: '"] x[' } }, { opc_mode: 'x' }].forEach(m => w.postMessage(m, '*')); });
    await k.waitForTimeout(800);
    L.v('C2. des messages de forme fausse (éléments nuls, sélecteur piégé) ne tuent pas la Comptabilité (témoin : un message d\'hôte juste est encore appliqué)', await (async () => { await k.evaluate(() => document.querySelector('iframe').contentWindow.postMessage({ opc_role: { role: 'patron', paie: false, prenom: 'Témoin' } }, '*')); await k.waitForTimeout(400); return cm.evaluate(() => CMPT.prenom === 'Témoin').catch(() => false); })());
    await k.screenshot({ path: CAP + 'messages-compta-hostile.png' });
  }
  console.log('erreurs de la page d\'essai :', c.err.slice(0, 3)); await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });

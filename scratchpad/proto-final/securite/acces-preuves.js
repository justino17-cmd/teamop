// Angle « accès » · sonde 5 : les preuves qui manquaient aux sondes 1 à 4 — ce que montre l'écran DERRIÈRE la connexion pour un technicien qui s'est déconnecté,
// la prise de rôle par « Ouvrir l'application comme … », les liens donnés aux clients, le client qui lit le contrat d'un AUTRE, les cadres (Comptabilité, Documents)
// ouverts seuls, la recherche (Cmd K) par rôle, et une signature faite par le bureau.
// ⛔ 127.0.0.1 seulement, entreprise fictive. Chaque contrôle compte d'abord sa population (un zéro sur du vide ne prouve rien).
// Un « ✗ » ci-dessous est une FAILLE PROUVÉE (la sonde garde la règle : elle tombe tant que la faille existe), pas une panne de la sonde.
const L = require('../lib.js');
(async () => {
  // ── A. un technicien se déconnecte : que reste-t-il derrière l'écran de connexion ? ──
  let c = await L.ouvrir({ qui: 'sm', app: true, attente: 900 });
  const avant = await c.p.evaluate(() => ({ role: ROLE, session: SESSION, menu: document.querySelectorAll('#menu a').length }));
  L.v('A. (population) la technicienne est connectée avec un menu de technicienne', avant.session === 'sm' && avant.role === 'tech' && avant.menu > 2, avant);
  await c.p.evaluate(() => sessionFermer()); await c.p.waitForTimeout(900);
  const apres = await c.p.evaluate(() => { const m = [...document.querySelectorAll('#menu a')].map(a => a.textContent.trim().replace(/\s+/g, ' ')); const cnx = document.getElementById('cnx');
    return { session: SESSION, role: ROLE, acteur: acteur(), cnx: !!cnx, h1: (document.querySelector('#contenu h1') || {}).textContent || '', menu: m.length, equipe: m.some(x => /^Équipe/.test(x)), entreprise: m.some(x => /Mon entreprise/.test(x)), compta: m.some(x => /Comptabilité/.test(x)),
      inert: !!(cnx && (document.getElementById('menu').closest('[inert]') || document.getElementById('menu').closest('[aria-hidden="true"]'))) }; });
  console.log('A. après la déconnexion de la technicienne :', JSON.stringify(apres));
  L.v('A. (population) l\'écran de connexion est posé', apres.cnx, apres);
  L.v('A. derrière l\'écran de connexion, la page n\'est PLUS celle d\'un gérant (menu Équipe / Mon entreprise / Comptabilité)', !(apres.equipe || apres.entreprise || apres.compta), apres);
  L.v('A. derrière l\'écran de connexion, la page est rendue inerte (inert / aria-hidden)', apres.inert, apres);
  // le clavier : Tab ×12 puis Entrée sur « Équipe »
  let atteint = [];
  for (let i = 0; i < 14; i++) { await c.p.keyboard.press('Tab'); const d = await c.p.evaluate(() => { const a = document.activeElement; return { dans: !!(a && a.closest && a.closest('#cnx')), t: (a.innerText || a.getAttribute('href') || a.tagName).slice(0, 24).replace(/\s+/g, ' ') }; }); if (!d.dans) atteint.push(d.t); }
  console.log('A. éléments de la page derrière atteints au clavier :', atteint.length, atteint.slice(0, 8).join(' | '));
  L.v('A. le clavier ne sort pas de l\'écran de connexion', atteint.length === 0, atteint.slice(0, 8));
  const ouvre = await c.p.evaluate(async () => { const a = [...document.querySelectorAll('#menu a')].find(x => /^Équipe/.test(x.textContent.trim())); if (!a) return 'pas de lien Équipe';
    a.focus(); a.click(); await new Promise(r => setTimeout(r, 500)); const h1 = document.querySelector('#contenu h1'); return { hash: location.hash, h1: h1 ? h1.textContent.trim() : '', habil: /Habilitation|Aptitude/.test(document.getElementById('contenu').innerText), noms: ['Marc', 'Julie', 'Sophie', 'Karim', 'Léa', 'Tom'].filter(n => document.getElementById('contenu').innerText.includes(n)).length }; });
  console.log('A. un clic sur « Équipe » derrière la connexion (sans mot de passe) →', JSON.stringify(ouvre));
  L.v('A. un clic derrière l\'écran de connexion n\'ouvre pas l\'écran Équipe (téléphones, habilitations du personnel)', !(ouvre && ouvre.hash === '#equipe' && ouvre.noms > 2), ouvre);
  await c.p.screenshot({ path: '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/acces/derriere-connexion.png' });
  await L.fin(c);

  // ── B. « Ouvrir l'application comme … » : prise de rôle persistante, sans trace ──
  c = await L.ouvrir({ qui: 'marc', app: true, attente: 900 });
  const comme = await c.p.evaluate(async () => { location.hash = 'equipe'; await new Promise(r => setTimeout(r, 500)); eqFiche('sm'); await new Promise(r => setTimeout(r, 400));
    const b = document.querySelector('[data-cnx="comme|sm"]'); const present = !!b; const j0 = JOURNAL.length; if (b) b.click(); await new Promise(r => setTimeout(r, 700));
    const ban = [...document.querySelectorAll('body *')].some(e => e.children.length === 0 && /vous (voyez|êtes) .*comme|connecté en tant que|vu par Marc|session de Marc/i.test(e.textContent));
    return { present, session: SESSION, role: ROLE, stocke: localStorage.getItem(SESSION_CLE), bandeau: ban, journalAvant: j0, journalApres: JOURNAL.length, derniere: JOURNAL.length ? JSON.stringify(JOURNAL[0]).slice(0, 160) : '' }; });
  console.log('B. comme Sophie :', JSON.stringify(comme));
  L.v('B. (population) le bouton « Ouvrir l\'application comme Sophie » existe sur sa fiche', comme.present, comme);
  L.v('B. la prise de rôle est consignée au journal (qui a ouvert l\'application comme qui)', comme.journalApres > comme.journalAvant, comme);
  L.v('B. un bandeau permanent dit qu\'on voit l\'application comme une autre personne', comme.bandeau, comme);
  L.v('B. la prise de rôle ne survit pas à un rechargement de la page', comme.stocke !== 'sm', comme);
  await L.fin(c);

  // ── C. les liens donnés aux clients se devinent ──
  c = await L.ouvrir({ qui: 'marc', app: true, attente: 700 });
  const liens = await c.p.evaluate(() => ({ rapports: INTS.slice(0, 8).map(i => lienClient(i.id)), signer: (() => { const o = []; CONTRATS.slice(0, 3).forEach(k => { location.hash = 'signer-x-' + k.id; }); return null; })() }));
  const sig = await c.p.evaluate(async () => { const o = []; for (const k of CONTRATS.slice(0, 4)) { location.hash = 'signer-x-' + k.id; await new Promise(r => setTimeout(r, 350)); const u = (document.querySelector('#contenu .client-web .url') || {}).textContent || ''; o.push(u.trim()); } return o; });
  console.log('C. liens de rapport :', liens.rapports.join(' '));
  console.log('C. liens de signature de 4 contrats différents :', sig.join(' | '));
  const suff = liens.rapports.filter(x => /X4$/.test(x)).length;
  L.v('C. (population) des liens de rapport existent', liens.rapports.length >= 5, liens.rapports.length);
  L.v('C. les liens de rapport ne se déduisent pas de l\'identifiant de l\'intervention (I20 → …/I20X4)', suff < 2, liens.rapports);
  L.v('C. chaque contrat a son propre lien de signature', new Set(sig).size === sig.length && sig.length >= 4, sig);
  await L.fin(c);

  // ── D. le client qui lit le contrat d'un AUTRE (échafaudage, rôle client) ──
  c = await L.ouvrir({ qui: null, app: false, attente: 900 });
  const cl = await c.p.evaluate(async () => { rlChanger('client', { cli: 'vp', muet: true }); await new Promise(r => setTimeout(r, 500));
    const autre = CONTRATS.find(x => x.cli !== 'vp'); location.hash = 'signer-x-' + autre.id; await new Promise(r => setTimeout(r, 700));
    const t = document.getElementById('contenu').innerText.replace(/\s+/g, ' ');
    return { moi: RL_CLI.cli, contrat: autre.num, de: CLIENTS[autre.cli].nom, titreLu: t.toLowerCase().includes(autre.titre.toLowerCase()), prixLu: t.includes(String(autre.prix).replace('.', ',')) || /1 400,00/.test(t), route, param }; });
  console.log('D. le client « vp » ouvre le contrat d\'un autre :', JSON.stringify(cl));
  L.v('D. (population) un contrat d\'un autre client existe et la page l\'a ouvert', cl.route === 'signer' && !!cl.contrat, cl);
  L.v('D. un client ne lit pas le contrat (titre, prix, état) d\'un AUTRE client', !(cl.titreLu || cl.prixLu), cl);
  await L.fin(c);

  // ── E. un contrat déjà signé par le bureau : qui a signé ? ──
  c = await L.ouvrir({ qui: 'julie', app: true, attente: 900 });
  const sg = await c.p.evaluate(async () => { const k = CONTRATS.find(x => x.st !== 'signe'); if (!k) return { aucun: true }; location.hash = 'signer-x-' + k.id; await new Promise(r => setTimeout(r, 600));
    const cv = document.getElementById('signe-ctr'); if (!cv) return { pasDeCanvas: true, route }; document.getElementById('lu').checked = true; cv.dataset.signe = 'data:image/png;base64,AAAA';
    document.querySelector('[data-action="signerContrat"]').click(); await new Promise(r => setTimeout(r, 500)); const k2 = CONTRATS.find(x => x.id === k.id);
    return { contrat: k2.num, etat: k2.st, cles: Object.keys(k2), parRole: ROLE }; });
  console.log('E. Julie (secrétariat) signe un contrat à la place du client :', JSON.stringify(sg));
  L.v('E. (population) un contrat à signer existait', !sg.aucun && !sg.pasDeCanvas, sg);
  L.v('E. le contrat signé garde QUI a posé la signature (client, ou membre de l\'équipe en présence du client) et sur quel appareil', !!sg.cles && sg.cles.some(k => /par|qui|signataire|appareil|ip|acteur/i.test(k)), sg.cles);
  await L.fin(c);

  // ── F. les cadres ouverts SEULS (adresse directe) : Comptabilité (Paie), Documents ──
  c = await L.ouvrir({ qui: null, app: false, page: 'prototype-comptabilite.html', requete: '', attente: 1500 });
  const cp = await c.p.evaluate(async () => { aller('paie'); await new Promise(r => setTimeout(r, 800)); const t = document.body.innerText.replace(/\s+/g, ' '); return { paieOuverte: typeof opcPaieOuverte === 'function' ? opcPaieOuverte() : null, euros: (t.match(/\d[\d  ]*,\d\d ?€/g) || []).length, masse: /Masse salariale/.test(t), role: CMPT && CMPT.role }; });
  console.log('F. Comptabilité ouverte seule :', JSON.stringify(cp));
  L.v('F. (population) la page affiche des montants', cp.euros > 3, cp);
  L.v('F. la Paie (salaires, masse salariale) ne s\'ouvre pas dans la Comptabilité ouverte seule, sans rôle', !(cp.paieOuverte && cp.masse), cp);
  const sansSource = await c.p.evaluate(async () => { window.postMessage({ opc_role: { role: 'patron', paie: true, droits: null } }, '*'); await new Promise(r => setTimeout(r, 400)); return { roleApres: CMPT.role, paie: CMPT.paie }; });
  L.v('F. le message « opc_role » d\'une fenêtre qui n\'est pas l\'hôte est ignoré (prototype-comptabilite.html:3310 ne teste pas ev.source)', sansSource.roleApres !== 'patron', sansSource);
  await L.fin(c);
  c = await L.ouvrir({ qui: null, app: false, page: 'prototype-documents.html', requete: '', attente: 1500 });
  const dc = await c.p.evaluate(() => ({ docs: S.docs.length, clients: (typeof S.clients !== 'undefined' && S.clients.length) || null }));
  console.log('F. Documents ouvert seul :', JSON.stringify(dc));
  L.v('F. (population) l\'atelier compte des documents', dc.docs > 0, dc);
  await L.fin(c);

  // ── G. la recherche (Cmd K) par rôle : ne propose que ce que le rôle ouvre ──
  for (const qui of ['marc', 'julie', 'sm', 'kb']) {
    c = await L.ouvrir({ qui, app: true, attente: 800 });
    const r = await c.p.evaluate(() => { const E = palEntrees(), g = {}; E.forEach(e => { g[e.g] = (g[e.g] || 0) + 1; }); return { g, clients: E.filter(e => e.g === 'Clients').length, clientsDroit: droitVoit('clients'), total: E.length }; });
    L.v('G. ' + qui + ' : (population) la palette compte des entrées', r.total > 5, r);
    L.v('G. ' + qui + ' : les clients ne sont proposés que si la case « Clients » est ouverte', (r.clients > 0) === !!r.clientsDroit, r);
    await L.fin(c);
  }
  await L.fermer();
  process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });

// CONTRE-VÉRIFICATION de l'angle « accès » sur la TÊTE ACTUELLE (étape 6 sur 8, 17 novembre 2026).
// Les sondes acces-*.js datent de la tête 88d42e0 ; depuis, la double authentification (OP Security) a remplacé les mots de passe
// rangés, la session n'est plus rangée sur l'appareil, ?auto= est local. Cette sonde rejoue ce qui reste discutable, avec sa population.
// ⛔ 127.0.0.1 seulement, entreprise fictive. Un ✗ est une faille qui existe encore sur la tête ACTUELLE.
const L = require('../lib.js');
(async () => {
  // ── B. « Ouvrir l'application comme … » : bandeau, journal, rechargement ──
  let c = await L.ouvrir({ qui: 'marc', app: true, attente: 900 });
  const comme = await c.p.evaluate(async () => { location.hash = 'equipe'; await new Promise(r => setTimeout(r, 500)); eqFiche('sm'); await new Promise(r => setTimeout(r, 400));
    const b = document.querySelector('[data-cnx="comme|sm"]'); const present = !!b; const j0 = JOURNAL.length; if (b) b.click(); await new Promise(r => setTimeout(r, 900));
    const bande = !!document.querySelector('.sec-bande, #sec-bande, [data-sec-bande]') || document.documentElement.classList.contains('sec-voir');
    const cles = Object.keys(localStorage); const rang = cles.filter(k => /session|sess/i.test(k));
    return { present, session: SESSION, role: ROLE, bande, journalAvant: j0, journalApres: JOURNAL.length, derniere: JOURNAL.length ? JSON.stringify(JOURNAL[0]).slice(0, 160) : '', clesRangees: cles, sessionRangee: rang }; });
  console.log('B. comme Sophie :', JSON.stringify(comme));
  L.v('B. (population) le bouton « Ouvrir l\'application comme Sophie » existe', comme.present, comme);
  L.v('B. la session prise est celle de Sophie', comme.session === 'sm', comme);
  L.v('B. un bandeau permanent annonce la prise de rôle', comme.bande, comme);
  L.v('B. la prise de rôle est consignée au journal', comme.journalApres > comme.journalAvant, comme);
  L.v('B. aucune clé de session n\'est rangée sur l\'appareil', comme.sessionRangee.length === 0, comme.sessionRangee);
  await L.fin(c);

  // ── H. le « passage de fenêtre » planté à la main (même origine : console, extension, script injecté) ──
  c = await L.ouvrir({ qui: null, app: true, attente: 900 });
  const avant = await c.p.evaluate(() => ({ session: SESSION, cnx: !!document.getElementById('cnx') }));
  L.v('H. (population) à froid, l\'écran de connexion est là et personne n\'est connecté', avant.cnx && !avant.session, avant);
  await c.p.evaluate(() => { localStorage.setItem('opg_proto_espace', 'clim-services-17'); localStorage.setItem('opg_proto_fenetre', JSON.stringify({ k: 'marc', vue: 'equipe', mode: 'jour', t: Date.now() })); });
  await c.p.reload(); await c.p.waitForTimeout(2500);
  const apres = await c.p.evaluate(() => ({ session: SESSION, role: ROLE, cnx: !!document.getElementById('cnx'), secondaire: SECU.secondaire, h1: (document.querySelector('#contenu h1') || {}).textContent || '', hash: location.hash }));
  console.log('H. après passage planté :', JSON.stringify(apres));
  L.v('H. un passage de fenêtre planté à la main n\'ouvre pas de session de gérant (SANS téléphone)', apres.session !== 'marc', apres);
  // un geste sensible dans une fenêtre secondaire renvoie-t-il à la première fenêtre ?
  const geste = await c.p.evaluate(async () => { if (SESSION !== 'marc') return { sauté: true };
    const cible = document.querySelector('[data-eq="inviter"]') ? null : null; location.hash = 'equipe'; await new Promise(r => setTimeout(r, 600));
    const b = document.querySelector('[data-eq="inviter"]'); if (!b) return { pasDeBouton: true };
    b.click(); await new Promise(r => setTimeout(r, 500)); return { panneau: !!document.querySelector('#eq-p'), confirmation: /téléphone|première fenêtre|confirm/i.test(document.body.innerText.slice(0, 4000)) }; });
  console.log('H. geste sensible depuis la fenêtre planté :', JSON.stringify(geste));
  await L.fin(c);

  // ── C. liens clients : jetons d'exemple seulement ──
  c = await L.ouvrir({ qui: 'marc', app: true, attente: 700 });
  const lien = await c.p.evaluate(() => ({ r: INTS.slice(0, 4).map(i => lienClient(i.id)), src: String(lienClient) }));
  console.log('C. liens de rapport :', lien.r.join(' '));
  await L.fin(c);

  // ── D. client : contrat d'un autre ──
  c = await L.ouvrir({ qui: null, app: false, attente: 900 });
  const cl = await c.p.evaluate(async () => { rlChanger('client', { cli: 'vp', muet: true }); await new Promise(r => setTimeout(r, 500));
    const autre = CONTRATS.find(x => x.cli !== 'vp'); location.hash = 'signer-x-' + autre.id; await new Promise(r => setTimeout(r, 700));
    const t = document.getElementById('contenu').innerText.replace(/\s+/g, ' ');
    return { moi: RL_CLI.cli, contrat: autre.num, de: CLIENTS[autre.cli].nom, titreLu: t.toLowerCase().includes(autre.titre.toLowerCase()), prixLu: t.includes(String(autre.prix).replace('.', ',')) || /1 400,00/.test(t), route, param }; });
  console.log('D. le client « vp » ouvre le contrat d\'un autre :', JSON.stringify(cl));
  L.v('D. (population) un contrat d\'un autre client existe et la page l\'a ouvert', cl.route === 'signer' && !!cl.contrat, cl);
  L.v('D. un client ne lit pas le contrat d\'un AUTRE client', !(cl.titreLu || cl.prixLu), cl);
  // les autres fiches par adresse, toujours en client : facture, devis, intervention d'un autre
  const autres = await c.p.evaluate(async () => { const r = {}; const bad = (route, ent) => { };
    const mienne = f => f.cli === 'vp';
    const fa = FACTURES.find(f => f.cli !== 'vp'), dv = (typeof DV !== 'undefined' && DV || []).find(d => d.cli !== 'vp'), it = INTS.find(i => i.cli !== 'vp');
    const essais = [['facture-x-' + (fa && fa.id), fa && CLIENTS[fa.cli].nom], ['devis-x-' + (dv && dv.id), dv && CLIENTS[dv.cli].nom], ['inter-x-' + (it && it.id), it && CLIENTS[it.cli].nom], ['client-x-c1', CLIENTS.c1 && CLIENTS.c1.nom]];
    const out = [];
    for (const [h, nom] of essais) { if (!nom) { out.push({ h, vide: true }); continue; } location.hash = h; await new Promise(r => setTimeout(r, 650)); const t = document.getElementById('contenu').innerText; out.push({ h, route, nomAutreLu: t.includes(nom), nom }); }
    return out; });
  console.log('D. autres fiches ouvertes par adresse en rôle client :', JSON.stringify(autres));
  autres.filter(x => !x.vide).forEach(x => L.v('D. ' + x.h + ' : le client ne lit pas la fiche d\'un autre', !x.nomAutreLu, x));
  await L.fin(c);

  // ── E. signature par le bureau ──
  c = await L.ouvrir({ qui: 'julie', app: true, attente: 900 });
  const sg = await c.p.evaluate(async () => { const k = CONTRATS.find(x => x.st !== 'signe'); if (!k) return { aucun: true }; location.hash = 'signer-x-' + k.id; await new Promise(r => setTimeout(r, 600));
    const cv = document.getElementById('signe-ctr'); if (!cv) return { pasDeCanvas: true, route }; document.getElementById('lu').checked = true; cv.dataset.signe = 'data:image/png;base64,AAAA';
    document.querySelector('[data-action="signerContrat"]').click(); await new Promise(r => setTimeout(r, 500)); const k2 = CONTRATS.find(x => x.id === k.id);
    return { contrat: k2.num, etat: k2.st, cles: Object.keys(k2), parRole: ROLE }; });
  console.log('E. Julie signe un contrat :', JSON.stringify(sg));
  L.v('E. (population) un contrat à signer existait', !sg.aucun && !sg.pasDeCanvas, sg);
  L.v('E. le contrat signé garde QUI a posé la signature', !!sg.cles && sg.cles.some(k => /par|qui|signataire|appareil|ip|acteur/i.test(k)), sg.cles);
  await L.fin(c);

  // ── F. Comptabilité ouverte seule : Paie + message d'une autre fenêtre ──
  c = await L.ouvrir({ qui: null, app: false, page: 'prototype-comptabilite.html', requete: '', attente: 1500 });
  const cp = await c.p.evaluate(async () => { aller('paie'); await new Promise(r => setTimeout(r, 800)); const t = document.body.innerText.replace(/\s+/g, ' '); return { paieOuverte: opcPaieOuverte(), euros: (t.match(/\d[\d  ]*,\d\d ?€/g) || []).length, masse: /Masse salariale/i.test(t), role: CMPT.role }; });
  console.log('F. Comptabilité ouverte seule :', JSON.stringify(cp));
  L.v('F. (population) la page affiche des montants', cp.euros > 3, cp);
  L.v('F. la Paie ne s\'ouvre pas dans la Comptabilité ouverte seule', !(cp.paieOuverte && cp.masse), cp);
  const ms = await c.p.evaluate(async () => { window.postMessage({ opc_role: { role: 'patron', paie: true, droits: null } }, '*'); await new Promise(r => setTimeout(r, 400)); return { roleApres: CMPT.role, paie: CMPT.paie }; });
  console.log('F. message opc_role depuis une fenêtre :', JSON.stringify(ms));
  L.v('F. le message « opc_role » d\'une fenêtre qui n\'est pas l\'hôte est ignoré', ms.roleApres !== 'patron', ms);
  await L.fin(c);
  await L.fermer();
  process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });

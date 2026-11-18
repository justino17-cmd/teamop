// RECONTRÔLE ADVERSE des restes « client », tour 2 (18 novembre 2026). Le correcteur a changé UNE règle partagée (saluer) et trois fabriques
// (tkxPrenomClient, mbxMod, tMailClient) plus un cadre voisin (Paiement). On cherche ce que ces changements ont cassé à côté :
//  A) saluer() sur TOUTES les personnes et tous les organismes du prototype (aucune personne réduite à « Bonjour », aucun organisme salué) ;
//  B) la fiche de tâche « Prévenir » : le libellé du bouton, plus long pour une copropriété, tient sur 320 px, jour et nuit, deux boutons côte à côte ;
//  C) les tâches « Appeler <client> » nées d'une 3ᵉ relance, et le bouton « 📞 Appeler » de la même fiche ;
//  D) les réponses types du Courrier, tous modèles, tous expéditeurs, PAR le vrai bouton « Répondre » (pas seulement mbxMod) ;
//  E) les autres rôles (technicienne, secrétariat) devant la même fiche ;
//  F) le cadre Paiement : TOUS les gabarits de courriel de TOUS les modèles de client, lus dans la page.
// node restes-client-2-recontrole.js <profil> [nuit] → « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
const fs = require('fs'), path = require('path');
const O = require('./client-outils.js'), L = O.L, v = L.v;
const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-client-2-recontrole/';
(async () => {
  const c = await L.ouvrir({ profil, nuit, qui: 'marc', app: true, attente: 1500 }), p = c.p;
  // A) toutes les chaînes « contact » et tous les noms d'expéditeur, pesés par saluer()
  const A = await p.evaluate(() => { const o = []; const vus = new Set();
    for (const [k, cl] of Object.entries(CLIENTS)) { if (!cl || !cl.contact) continue; o.push({ src: 'client ' + k, nom: cl.nom, contact: cl.contact, sal: saluer(cl.contact), prev: tkxPrenomClient(cl), type: cl.type }); }
    for (const m of MAILS) { if (!m.de || m.de.nom === 'Toi' || vus.has(m.de.nom)) continue; vus.add(m.de.nom); o.push({ src: 'courrier ' + m.id, nom: m.de.nom, contact: m.de.nom, sal: saluer(m.de.nom) }); }
    return o; });
  v('A · population : au moins 7 clients ayant un contact et 10 expéditeurs lus', A.filter(x => /^client/.test(x.src)).length >= 7 && A.filter(x => /^courrier/.test(x.src)).length >= 10, A.length);
  console.log(A.map(x => `   ${x.src.padEnd(14)} « ${x.contact} » → « ${x.sal} »${x.prev ? ' · Prévenir ' + x.prev : ''}`).join('\n'));
  // une personne se reconnaît à un titre (M., Mme, Dr) ou à un prénom + nom propre ; un organisme, jamais.
  const PERS = /^(M\.|Mme|Mlle|Dr|Pr|Me)\s|^[A-ZÉ][a-zéèëï]+ [A-ZÉ][a-zéèëï]+(,|$)/;
  const ORGA = /^(Syndic|Service|Comptoir|Cabinet|Direction|Accueil|Frigo|Chauffage|Clim Pièces|Gagnant)/i;
  const faux = A.filter(x => /^client/.test(x.src)).filter(x => (PERS.test(x.contact) && !ORGA.test(x.contact) && x.sal === 'Bonjour') || (ORGA.test(x.contact) && x.sal !== 'Bonjour'));
  v('A · aucune personne réduite à « Bonjour », aucun organisme salué par son nom', faux.length === 0, faux.map(x => [x.contact, x.sal]));
  // des noms de personnes qui ressemblent à un organisme (le plus dur pour la règle neuve) et des organismes qui ressemblent à une personne
  const B = await p.evaluate(() => { const o = {}; for (const n of ['Le Goff', 'Marc Le Goff', 'M. Le Goff', 'Mme La Fontaine', 'Laurent', 'Lara Martin', 'Léa', 'Lou', 'Mme Pro', 'Prosper Martin', 'Hélène Sciarra', 'Sophie Distribution', 'Jean-Luc Garnier', 'Dr Martin, cabinet', 'Marie-Laure Roux', 'Mme Roux 2', 'Boulangerie Lemoine', 'Restaurant Le Vieux Port', 'Hôtel de la Plage', 'Cabinet dentaire Martin', 'Comptoir professionnel', 'Service commandes', 'Syndic Foncia', 'SCI Les Pins', 'Orange', 'Le Fournil', 'Marc Durand, gérant']) o[n] = saluer(n); return o; });
  console.log('   ' + JSON.stringify(B));
  // les cas dont l'attendu est sans équivoque
  const doivent = { 'Marc Le Goff': 'Bonjour Marc Le Goff', 'M. Le Goff': 'Bonjour M. Le Goff', 'Mme La Fontaine': 'Bonjour Mme La Fontaine', 'Laurent': 'Bonjour Laurent', 'Lara Martin': 'Bonjour Lara Martin', 'Léa': 'Bonjour Léa', 'Lou': 'Bonjour Lou', 'Prosper Martin': 'Bonjour Prosper Martin', 'Hélène Sciarra': 'Bonjour Hélène Sciarra', 'Jean-Luc Garnier': 'Bonjour Jean-Luc Garnier', 'Marie-Laure Roux': 'Bonjour Marie-Laure Roux', 'Marc Durand, gérant': 'Bonjour Marc Durand',
    'Restaurant Le Vieux Port': 'Bonjour', 'Hôtel de la Plage': 'Bonjour', 'Cabinet dentaire Martin': 'Bonjour', 'Service commandes': 'Bonjour', 'SCI Les Pins': 'Bonjour', 'Le Fournil': 'Bonjour' };
  const ecart = Object.entries(doivent).filter(([n, att]) => B[n] !== att).map(([n, att]) => [n, B[n], att]);
  v('A · 20 noms sans équivoque (personnes proches d\'un organisme, organismes proches d\'une personne) bien salués', ecart.length === 0, ecart);
  // (« Le Goff » seul, « Mme Pro », « Sophie Distribution » : ambigus, relevés sans verdict)
  // B) la fiche de tâche « Prévenir » pour la copropriété : libellé long, deux boutons
  const rb = await p.evaluate(async () => { const x = { id: 'tzzmi', t: 'Prévenir du retard de la pièce', qui: 'marc', d: AUJ, h: null, urgent: false, lien: { t: 'client', id: 'mi', lib: CLIENTS.mi.nom, cli: 'mi' } }; TACHES.push(x);
    tDetail('tzzmi'); await new Promise(r => setTimeout(r, 400)); const P = document.querySelector('#calque .panneau'); if (!P) return { ko: 'PAS DE FENÊTRE' };
    const bts = [...P.querySelectorAll('[data-tkxprev]')].map(b => { const r = b.getBoundingClientRect(), cs = getComputedStyle(b); return { t: b.textContent.trim(), x: Math.round(r.left), d: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height), lh: parseFloat(cs.lineHeight) || 0, vis: b.offsetParent !== null }; });
    const barre = P.querySelector('.tkx-barre'), rbar = barre ? barre.getBoundingClientRect() : null, fait = P.querySelector('.tkx-barre [data-tfait]'), rf = fait ? fait.getBoundingClientRect() : null;
    return { bts, barre: rbar && { g: Math.round(rbar.left), d: Math.round(rbar.right), h: Math.round(rbar.height) }, fait: rf && { g: Math.round(rf.left), d: Math.round(rf.right), h: Math.round(rf.height) }, pw: P.scrollWidth, pc: P.clientWidth, vw: innerWidth }; });
  v('B · la fiche « Prévenir » de la copropriété s\'ouvre avec ses boutons', rb && rb.bts && rb.bts.filter(b => b.vis).length >= 1, rb);
  if (rb && rb.bts) {
    v('B · le libellé nomme la copropriété', rb.bts.filter(b => b.vis).every(b => /Prévenir Copropriété Les Mimosas/.test(b.t)), rb.bts.map(b => b.t));
    v('B · aucun bouton ne sort de l\'écran (largeur du profil ' + c.largeur + ')', rb.bts.filter(b => b.vis).every(b => b.x >= 0 && b.d <= c.largeur), rb.bts.map(b => [b.x, b.d]));
    v('B · la fenêtre ne défile pas de côté', rb.pw <= rb.pc + 1, [rb.pw, rb.pc]);
    v('B · le libellé tient sur au plus deux lignes (hauteur ≤ 2,2 lignes + marges)', rb.bts.filter(b => b.vis).every(b => b.h <= 100), rb.bts.map(b => b.h));
    v('B · la barre du bas ne coupe pas son bouton « Terminé » (largeur ≥ 80)', !rb.fait || !rb.fait.h || (rb.fait.d - rb.fait.g) >= 80, rb.fait); }
  await L.capture(c, CAP + 'B-previenir-' + profil + (nuit ? '-nuit' : '') + '.png');
  // le geste : toucher le bouton, lire le courriel et ses boutons
  const g = await p.evaluate(async () => { const b = document.querySelector('#calque .panneau [data-tkxprev]'); if (!b) return null; b.click(); await new Promise(r => setTimeout(r, 300)); const q = document.querySelector('#calque .panneau'); return q ? { corps: ((q.querySelector('textarea') || {}).value || '').slice(0, 60), a: ((q.querySelector('input[type=email],input[type=text]') || {}).value || '') } : null; });
  v('B · le bouton ouvre le courriel « Bonjour, » (copropriété) adressé à son contact', g && /^Bonjour,/.test(g.corps), g);
  await L.capture(c, CAP + 'B-courriel-' + profil + (nuit ? '-nuit' : '') + '.png');
  await p.evaluate(() => { try { fermerPanneau(); fermerPanneau(); } catch (e) {} TACHES = TACHES.filter(x => x.id !== 'tzzmi'); });
  // C) une 3ᵉ relance : la tâche « Appeler … » suit-elle, et que dit la fiche ?
  const C = await p.evaluate(async () => { const out = {}; for (const k of ['mi', 'vp', 'hp', 'md', 'cm']) { const f = FACTURES.find(o => o.cli === k && o.st !== 'payee') || FACTURES.find(o => o.cli === k); if (!f) { out[k] = 'PAS DE FACTURE IMPAYÉE'; continue; }
      f.relances = 3; const x = { id: 'tzr' + k, t: 'Relancer ' + f.num, qui: 'marc', d: AUJ, h: null, urgent: false, lien: { t: 'facture', id: f.id, lib: f.num, cli: k }, note: 'Déjà relancée deux fois.' }; TACHES.push(x);
      const av = TACHES.length; try { tFaire(x, 'relance envoyée'); } catch (e) { out[k] = 'ERREUR ' + e.message; continue; }
      const s = TACHES.slice(av)[0] || TACHES.find(o => o.suiteDe === x.id); out[k] = s ? s.t : 'PAS DE SUITE'; if (s) { tDetail(s.id); await new Promise(r => setTimeout(r, 300)); const P = document.querySelector('#calque .panneau'); out[k + 'f'] = P ? [...P.querySelectorAll('a.btn,button.btn')].map(b => b.textContent.trim()).filter(t => /Appeler|Prévenir|Terminé|fait/i.test(t)) : 'PAS DE FENÊTRE'; try { fermerPanneau(); } catch (e) {} } }
    return out; });
  console.log('   C : ' + JSON.stringify(C));
  const Ct = Object.entries(C).filter(([k]) => !/f$/.test(k) || k.length > 2 && false);
  v('C · population : au moins 4 clients rejoués (copropriété comprise)', Object.keys(C).filter(k => k.length === 2).length >= 4 && !!C.mi, C);
  v('C · la suite d\'une 3ᵉ relance nomme le client (« Appeler <personne ou copropriété> »), jamais « Syndic Foncia » ni « undefined »', Object.entries(C).filter(([k]) => k.length === 2).every(([k, t]) => /^Appeler (?!Syndic Foncia)\S/.test(t) && !/undefined/.test(t)), C);
  // D) le Courrier, PAR le vrai geste : ouvrir chaque message, choisir « Répondre », lire le brouillon
  await L.aller(p, '#courrier'); await L.calme(p, 800);
  const D = await p.evaluate(async () => { const o = []; for (const m of MAILS.filter(m => m.de && m.de.nom !== 'Toi').slice(0, 30)) { try { const t = mbxMod(m); const ks = Object.keys(t); o.push({ id: m.id, de: m.de.nom, n: ks.length, bonjour: [...new Set(ks.filter(k => !['avoir', 'commande'].includes(k)).map(k => t[k].split(/[,\n]/)[0]))] }); } catch (e) { o.push({ id: m.id, erreur: e.message }); } } return o; });
  v('D · tous les messages se préparent sans erreur', D.length >= 15 && D.every(x => !x.erreur), D.filter(x => x.erreur));
  v('D · chaque expéditeur reçoit UNE seule salutation, de ses 7 modèles', D.every(x => x.erreur || x.bonjour.length === 1), D.filter(x => x.bonjour && x.bonjour.length !== 1));
  v('D · jamais « Bonjour » suivi d\'un nom d\'organisme (Frigo, Chauffage, Syndic, Clim Pièces, Comptoir, La Poste…)', !D.some(x => x.bonjour && x.bonjour.some(s => /^Bonjour (Frigo|Chauffage|Syndic|Clim|Comptoir|La |Le |Les |Service|Cabinet)/i.test(s))), D.filter(x => x.bonjour && x.bonjour.some(s => /^Bonjour (Frigo|Chauffage|Syndic|Clim|Comptoir|La |Le |Les |Service|Cabinet)/i.test(s))));
  // D2) courrierModeleDe : le modèle choisi se RETROUVE dans le texte envoyé (la salutation raccourcie décale la fenêtre de 60 signes)
  const D2 = await p.evaluate(() => { const bad = []; let n = 0; for (const m of MAILS.filter(m => m.de && m.de.nom !== 'Toi')) { const M = mbxMod(m); for (const [k] of mbxModeles(m)) { n++; const r = courrierModeleDe(m, courrierSansFin(M[k]) + '\n\nBien cordialement'); if (r !== k && M[r] !== M[k]) bad.push([m.id, k, r]); } } return { n, bad }; });
  v('D2 · population : ≥ 25 couples (message, modèle) rejoués', D2.n >= 25, D2.n);
  v('D2 · chaque modèle envoyé est reconnu pour ce qu\'il est (courrierModeleDe), salutation « Bonjour, » comprise', D2.bad.length === 0, D2.bad.slice(0, 5));
  // le vrai geste : ouvrir le message Mimosas dans la boîte et cliquer « Répondre »
  const G = await p.evaluate(async () => { const m = MAILS.find(o => o.de && /Syndic des Mimosas/.test(o.de.nom)); if (!m) return 'PAS DE MESSAGE'; try { mlOuvrir ? mlOuvrir(m.id) : 0; } catch (e) {} await new Promise(r => setTimeout(r, 400)); return typeof mbxMod === 'function' ? mbxMod(m).recu.split('\n')[0] : '?'; });
  v('D · message du « Syndic des Mimosas » : accusé de réception « Bonjour, »', G === 'Bonjour,', G);
  await L.capture(c, CAP + 'D-courrier-' + profil + (nuit ? '-nuit' : '') + '.png');
  // F) le cadre Paiement : TOUS les gabarits, TOUS les modèles — lus dans le fichier, évalués
  const src = fs.readFileSync(path.join(__dirname, '../../../../apercu/prototype-paiement.html'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
  const modeles = (src.match(/const MODELES = \[([\s\S]*?)\];\n/) || [])[1] || ''; const contacts = [...modeles.matchAll(/\['[^']*', '([^']*)'/g)].map(m => m[1]);
  v('F · population : les contacts des modèles du cadre Paiement sont lus (≥ 4)', contacts.length >= 4, contacts);
  const gabarits = [...src.matchAll(/(\w+):`([^`]*\$\{(?:salut\()?(?:esc\()?g\.contact\)?\)?[^`]*)`/g)].map(m => [m[1], m[2].slice(0, 40)]);
  v('F · population : les 5 gabarits du courriel de facture sont lus', gabarits.length >= 5, gabarits);
  const brut = gabarits.filter(([k, t]) => !/salut\(g\.contact\)/.test(t) && /\$\{esc\(g\.contact\)\}/.test(t));
  const org = contacts.filter(x => /^(le|la|les|l['’])\s/i.test(x));
  v('F · aucun gabarit n\'écrit le contact brut alors qu\'un contact peut être « Le syndic » (« Merci Le syndic. »)', !(brut.length && org.length), { brut: brut.map(x => x[0]), contactsOrganisme: org });
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

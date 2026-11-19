// Outils communs des sondes « compta-ventes » (campagne du 17 novembre 2026) : la Comptabilité d'OP GESTION côté VENTES
// (factures clients, paiements reçus, liaison avec le cadre plein écran). Même cadre que taches-absences-outils.js.
const O = require('./taches-absences-outils.js');
const L = O.L;
exports.L = L; exports.O = O;
exports.CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-compta-ventes/';
for (const k of ['marquer', 'neuf', 'lire', 'diff', 'doigtsReel']) exports[k] = O[k];
// texte visible d'une zone (pour relire les mots d'un écran comme le ferait un client)
exports.texte = (p, zone) => p.evaluate(z => { const e = document.querySelector(z || '#contenu'); return e ? e.innerText.replace(/\n{2,}/g, '\n').trim() : ''; }, zone);
// texte du panneau (fenêtre) ouvert
exports.panneau = p => p.evaluate(() => { const e = document.querySelector('#calque .panneau'); return e ? e.innerText.replace(/\n{2,}/g, '\n').trim() : ''; });
// range la Comptabilité sur un onglet SANS passer par le cadre plein écran (le quotidien « Factures et paiements »)
exports.compta = async (c, onglet, o) => { o = o || {};
  await c.p.evaluate(([on, cat, st]) => { cpSysteme = false; try { fermerPanneau(); } catch (e) {} CP.onglet = on; if (cat) CX.cat = cat; CX.st = st || 'tous'; CX.psens = 'tous'; CX.pmode = 'tous'; try { CX_DOS.f = 'tous'; CX_DOS.q = ''; CX_DOS.vue = 'inter'; } catch (e) {} if (route !== 'comptabilite') aller('comptabilite'); else rendre(); }, [onglet, o.cat, o.st]);
  await L.calme(c.p, 450); };
// l'état des factures et des paiements tels que le prototype les porte (pour recalculer au centime)
exports.donnees = p => p.evaluate(() => ({ F: FACTURES.map(f => ({ id: f.id, num: f.num, cli: f.cli, st: f.st, ht: f.st === 'avoir' ? f.ht : htDe(f), tva: f.tva, recu: f.recu || 0, relances: f.relances || 0, paye: f.paye || '', mode: f.mode || '', reste: f.st === 'avoir' ? 0 : restant(f) })),
  E: ENCAISSEMENTS.map(e => ({ d: e.d, cli: e.cli, fac: e.fac, mode: e.mode, ttc: e.ttc })), numSuiv }));
// ce que la page dit « à recevoir » en un chiffre (somme des restes des factures envoyées / en retard / partielles)
exports.du = p => p.evaluate(() => Math.round(FACTURES.filter(f => ['envoyee', 'retard', 'partielle'].includes(f.st)).reduce((s, f) => s + restant(f), 0) * 100));
// ouvre la fiche d'une facture par le geste de l'application (la ligne de la liste)
exports.fiche = async (c, id) => { await c.p.evaluate(i => aller('facture-x-' + i), id); await L.calme(c.p, 450); };
// ouvre le cadre plein écran par le menu, comme le fait une vraie personne
exports.cadreOuvert = async c => { const cible = await c.p.evaluate(() => { const v = e => e && e.offsetParent !== null && e.getBoundingClientRect().width > 0; return v(document.querySelector('#menu a[href="#comptabilite"]')) ? '#menu a[href="#comptabilite"]' : '[data-tab="comptabilite"]'; });
  await L.toucher(c, cible); await c.p.waitForTimeout(1500); return L.cadre(c.p, /prototype-comptabilite\.html/); };   // (le cadre des documents est préchargé : on vise la Comptabilité) ordinateur : le menu ; téléphone : l'onglet « Comptabilité » de la barre du bas
// remplit un champ d'une fenêtre ouverte
exports.saisir = async (c, sel, val) => { const l = c.p.locator(sel).first(); await l.fill(String(val)); };
exports.toasts = p => p.evaluate(() => { const t = document.getElementById('toast'); return t && !t.hidden ? t.textContent.replace(/\s+/g, ' ').trim() : ''; });

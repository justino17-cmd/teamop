// Outils communs des sondes de la partie « Équipe » + « Mon entreprise » de la grande campagne (17 novembre 2026).
// ⛔ 127.0.0.1 seulement, entreprise fictive « Clim Services 17 », aucun serveur. Les captures vont HORS du dépôt.
const L = require('../../lib.js');
exports.L = L; exports.v = L.v;
exports.CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-equipe/';
exports.fin = async () => { await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0); };
// le texte du toast s'il est visible (espaces insécables normalisés), sinon ''
exports.toast = p => p.evaluate(() => { const t = document.getElementById('toast'); return t && t.classList.contains('on') ? t.textContent.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim() : ''; });
// ouvre l'écran Équipe puis la fiche de la personne (par le geste, pas par la fonction)
exports.fiche = async (c, k) => { await L.aller(c.p, 'equipe'); await c.p.evaluate(() => { if (typeof eqFiltre !== 'undefined' && eqFiltre !== 'tous') { eqFiltre = 'tous'; rendre(); } }); await L.calme(c.p, 150); await L.toucher(c, `[data-eq="fiche|${k}"]`); await L.calme(c.p, 400); };
// l'état OBSERVABLE d'un geste : écran, titre, fenêtre ouverte, toast, nombre de cartes, hachage — pour dire s'il a fait quelque chose et quoi
exports.obs = async p => { const e = await L.etat(p); e.toast = await exports.toast(p); e.pan = await p.evaluate(() => { const q = document.querySelector('#calque .panneau'); return q ? (q.querySelector('h2') ? q.querySelector('h2').textContent.trim() : q.textContent.replace(/\s+/g, ' ').trim().slice(0, 60)) : ''; }); return e; };
exports.ranger = async c => { await L.ranger(c.p); await c.p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); await L.calme(c.p, 200); };
// sélecteur de touche d'un geste recensé par lib.gestes (balise + premier attribut data-…)
exports.sel = x => { const d = (x.data || '').split(' ')[0]; if (!d) return null; const i = d.indexOf('='); return `${x.balise.toLowerCase()}[${d.slice(0, i)}="${d.slice(i + 1)}"]:visible`; };   // :visible — le menu latéral et l'en-tête portent chacun un lien « logo » : le premier est caché au téléphone
exports.texte = (p, zone) => p.evaluate(z => { const q = document.querySelector(z || '#contenu'); return q ? q.innerText.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim() : ''; }, zone);
// ouvre l'application comme Marc (gérant) sur le profil donné
exports.marc = (profil, nuit) => L.ouvrir({ profil, qui:'marc', nuit: !!nuit });
// 'nuit' = true : la page passe en mode nuit APRÈS ouverture (lib.ouvrir le fait déjà quand o.nuit est donné)
exports.cartes = p => p.evaluate(() => document.querySelectorAll('#contenu .eq-grille > .eq-c').length);

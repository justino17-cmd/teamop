// Outils communs des sondes « Mon entreprise » et « Achats et frais » (voie entreprise, étape 4 · 17 novembre 2026).
// ⛔ 127.0.0.1 seulement (lib.js sert le dépôt), entreprise fictive Clim Services 17. Une sonde compte sa population avant de conclure.
const L = require('../lib.js');
exports.L = L; exports.v = L.v;
exports.CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/entreprise/';
// les six largeurs de la spécification : 320, 360, 390, 820, 1280, 1440
exports.PROFILS = ['petit', 'android', 'iphone', 'ipad', 'mac720', 'mac'];
// ouvre le prototype en mode application comme la personne `qui`, sur l'écran Mon entreprise (par le geste de l'application : aller)
exports.ouvrirEnt = async function (o) { const c = await L.ouvrir(Object.assign({ qui:'marc' }, o || {})); await L.aller(c.p, 'entreprise'); return c; };
// un champ du panneau ouvert : sa valeur, son message d'erreur affiché SOUS lui, son aria-invalid
exports.champ = (p, id) => p.evaluate(i => { const e = document.getElementById(i), m = document.getElementById(i + '-err'); return e ? { val:e.value, err:m && !m.hidden ? m.textContent.replace(/[\u00a0\u202f]/g, ' ') : '', invalide:e.getAttribute('aria-invalid') === 'true', desc:e.getAttribute('aria-describedby') || '', sousLeChamp: !!(m && !m.hidden && m.getBoundingClientRect().top >= e.getBoundingClientRect().bottom - 1) } : null; }, id);
exports.remplir = async (p, id, val) => { const e = p.locator('#' + id); await e.fill(String(val)); };
exports.panneauOuvert = p => p.evaluate(() => { const e = document.querySelector('#calque .panneau'); return e ? (e.querySelector('h2') ? e.querySelector('h2').textContent.trim() : 'sans titre') : ''; });
exports.toast = p => p.evaluate(() => { const t = document.getElementById('toast'); return t && t.classList.contains('on') ? t.textContent.replace(/[\u00a0\u202f]/g, ' ').replace(/\s+/g, ' ').trim() : ''; });
// la fiche entière telle que l'application la porte (pour comparer avant / après)
exports.fiche = p => p.evaluate(() => JSON.parse(JSON.stringify({ E:ENTREPRISE, P:PARAMS, T:TARIFS, X:CP_EXPERT })));
exports.fin = async () => { await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0); };

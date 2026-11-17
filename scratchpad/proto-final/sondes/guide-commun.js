// Outils communs des sondes du GUIDE DES NOUVEAUTÉS (voie « guide », étape 1, 17 novembre 2026).
// ⛔ Tout se passe sur 127.0.0.1, entreprise fictive « Clim Services 17 », aucun serveur.
// Le guide ne paraît pas dans les autres sondes (lib.ouvrir le ferme) : ici on l'ouvre par SA fonction (nvOuvrir) ou par la vraie première connexion.
const L = require('../lib.js');
exports.L = L;
exports.CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/guide/';
// qui → rôle de l'application (le gérant, le bureau, le terrain) ; kb est le chef d'équipe (terrain aussi)
exports.QUIS = { marc:'patron', julie:'gestion', sm:'tech', kb:'tech' };
exports.TEL = ['iphone', 'android', 'petit'];
// ouvre l'application SANS guide (lib le ferme), puis l'ouvre par sa fonction : le cas « je rouvre depuis Nouveautés »
exports.ouvrir = async (profil, qui, nuit) => { const c = await L.ouvrir({ profil, qui, nuit }); await c.p.evaluate(() => { nvOuvrir(); }); await L.calme(c.p, 600); return c; };
// les cartes que le guide porte : titre, écran, mot, phrase (texte brut)
exports.pages = c => c.p.evaluate(() => NV ? NV.pages.map(p => { const d = document.createElement('div'); d.innerHTML = p.c; return { k:p.k, t:p.t, voir:p.voir, mot:p.mot, texte:d.textContent.replace(/\s+/g, ' ').trim(), lignes:[...d.querySelectorAll('li')].map(li => li.textContent.replace(/\s+/g, ' ').trim()) }; }) : []);
exports.ouvert = p => p.evaluate(() => { const z = document.getElementById('nv'); return !!z && z.getBoundingClientRect().width > 0 && !z.classList.contains('part'); });
exports.index = p => p.evaluate(() => NV ? NV.i : -1);
// va à la carte i par le BOUTON « Suivant » (le geste d'un débutant), jamais en posant l'état
exports.vers = async (c, i) => { for (let k = 0; k < 12; k++) { const n = await exports.index(c.p); if (n === i) break; await L.toucher(c, n < i ? '#nv .nv-suiv' : '#nv .nv-prec:not(.nv-cache)'); await c.p.waitForTimeout(450); } await c.p.waitForTimeout(250); return exports.index(c.p); };
// compte strict : une élision (l’ordre, d’un) compte pour deux mots — la règle « vingt mots au plus » se tient sur la lecture la plus sévère
exports.mots = s => (String(s).match(/[\p{L}\p{N}]+/gu) || []).length;
exports.h1 = p => p.evaluate(() => ((document.querySelector('#contenu h1') || {}).textContent || '').replace(/\s+/g, ' ').trim());
// le nom que le menu donne à l'écran où l'on se trouve (« Ma journée » pour un écran qui dit « Bonjour Sophie »)
exports.nomMenu = p => p.evaluate(() => { try { const b = BASE[route] || route, c = rlLignes().find(x => x.k === rlLigneActive(b)); return c ? c.l : ''; } catch (e) { return ''; } });
exports.sansAccent = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

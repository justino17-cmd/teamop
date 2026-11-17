// Outils communs des sondes de l'étape 3 de la double authentification « OP Security » (pirate, verrouillage, Sécurité, Équipe, Mon compte, gestes sensibles).
// Reprend secu-commun.js (étape 2) et ajoute ce qu'il faut pour entrer vite : « Activer tous les téléphones d'un coup », puis une connexion complète par le NOMBRE.
// ⛔ Tout se passe sur 127.0.0.1, entreprise fictive, aucun serveur : le téléphone est SIMULÉ dans la page.
const S = require('./secu-commun.js');
const L = S.L;
const PIN = '246802';   // le PIN fictif de départ (déclaré dans SECU_DEPART)
const MDP_PERSO = k => 'Cheval-agrafe-batterie-' + k + '-2026';
const dormir = (c, ms) => c.p.waitForTimeout(ms);
module.exports = { ...S, L, PIN, MDP_PERSO, dormir,
  // la démonstration : active les six téléphones (PIN 246802), sans toucher aux mots de passe
  tous: async c => { await c.p.evaluate(() => [...document.querySelectorAll('#opsec .sec-demo button')].find(b => b.textContent.trim().startsWith('Activer tous')).click()); await c.p.waitForTimeout(300); },
  // ferme le guide des nouveautés par SON bouton (il s'ouvre 900 ms après la connexion)
  guide: async c => { await c.p.waitForTimeout(1300); await c.p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await c.p.waitForTimeout(300); },
  // une connexion COMPLÈTE par le nombre (téléphone déjà activé) ; une personne qui n'a pas encore choisi son mot de passe passe par l'écran C
  entrer: async (c, k, o) => { o = o || {}; const mdp = o.mdp || await S.provisoire(c, k);
    await S.connecter(c, k, mdp); const n = await S.lireNombre(c); await S.approuver(c, k, n, PIN);
    if (await S.attendreSel(c, '#cn-form-premier', 3500)) { const p = MDP_PERSO(k); await c.p.fill('#cn-n1', p); await c.p.fill('#cn-n2', p); await c.p.click('#cn-form-premier button[type=submit]'); }
    const ok = await S.attendreApp(c, 15000, true); if (!o.guide) await module.exports.guide(c); return { ok, mdp }; },
  // le texte entier d'un élément, espaces normalisés
  texte: (c, sel) => c.p.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim() : null; }, sel),
  // l'état de la couche sécurité d'une personne, pour les contrôles « avant = après »
  compte: (c, k) => c.p.evaluate(k => { const x = SECU.comptes[k]; return x ? { tel:!!x.tel, verrou:x.verrou ? (x.verrou.jusqua == null ? 'tel' : 'echecs') : null, echecs:x.echecs, histo:x.histo.length, appareils:x.appareils.length, prov:x.prov, emp:x.empreinte, sess:!!SECU.sessions[k], codeAct:!!x.codeActivation } : null; }, k),
  // le nombre tapé sur le téléphone en réponse à la fenêtre de confirmation ; ok:false = un mauvais nombre
  confirmer: async (c, k, o) => { o = o || {}; const n = await S.lireNombre(c), faux = String(10 + ((parseInt(n, 10) - 10 + 1) % 90)); await S.approuver(c, k, o.ok === false ? faux : n, PIN); await c.p.waitForTimeout(500); },
  conf: c => c.p.evaluate(() => { const z = document.getElementById('sec-conf'); return z ? { texte:z.textContent.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim(), nombre:(z.querySelector('[data-sec="nombre"]') || {}).textContent || null } : null; }),
};

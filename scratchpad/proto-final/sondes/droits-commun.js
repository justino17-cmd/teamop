// Outils communs des sondes des DROITS (voie entreprise, étape 5 · 17 novembre 2026). ⛔ 127.0.0.1 seulement, entreprise fictive.
const L = require('../lib.js');
exports.L = L; exports.v = L.v;
exports.CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/droits/';
exports.fin = async () => { await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0); };
// les personnes de la démonstration, plus des personnes FABRIQUÉES pour les profils que la démonstration n'a pas (Responsable) : on les injecte dans l'Équipe, puis on s'y connecte par la vraie ouverture de session
exports.INJECTER = ({ k, prenom, nom, pd, terrain, cases, sp }) => { const profil = pd, c = copieProfil(pd || 'secr'); if (cases) Object.entries(cases).forEach(([cat, x]) => { const [v, a, m, s] = String(x).padStart(4, '0').split('').map(Number); c.cats[cat] = { v, c:a, m, s }; });
  if (sp) Object.assign(c.sp, sp); if (EQUIPE.some(p => p.k === k)) EQUIPE.splice(EQUIPE.findIndex(p => p.k === k), 1);
  EQUIPE.push({ k, prenom, nom, role:profil || 'Personne', mail:k + '@climservices17.fr', tel:'', actif:true, terrain:!!terrain, droits:c, habil:[] }); H_GENS[k] = { nom:prenom + ' ' + nom, role:profil, c:'#7a5af8' };
  if (typeof eqxSynchro === 'function') eqxSynchro(); sessionOuvrir(k); return true; };
// ouvre l'application comme `qui` (une personne de la démonstration) ou comme une personne fabriquée { k, prenom, nom, profil, terrain, cases, sp }
exports.ouvrirComme = async (o) => { const f = typeof o === 'string' ? { qui:o } : o; const c = await L.ouvrir({ profil:f.appareil || 'mac', nuit:f.nuit, qui:f.qui || 'marc' });
  if (f.k) { await c.p.evaluate(exports.INJECTER, f); await L.calme(c.p, 700); } return c; };
exports.etatPersonne = p => p.evaluate(() => ({ role:ROLE, qui:acteur(), lignes:rlLignes().map(x => x.k), libs:rlLignes().map(x => x.l), barre:rlOnglets().map(o => o.k), ouverture:rlOuverture(), hash:location.hash }));
exports.toast = p => p.evaluate(() => { const t = document.getElementById('toast'); return t && t.classList.contains('on') ? t.textContent.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim() : ''; });

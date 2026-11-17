// Outils des sondes « Interventions » de la campagne du 17 novembre 2026 : ceux de « Tâches et absences », plus des gestes propres aux interventions.
const O = require('./taches-absences-outils.js');
const L = O.L;
exports.L = L; exports.O = O;
exports.CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-interventions/';
for (const k of ['marquer', 'neuf', 'lire', 'diff', 'doigtsReel']) exports[k] = O[k];
// texte visible de la zone (pour relire les mots d'un écran comme le ferait un client)
exports.texte = (p, zone) => p.evaluate(z => { const e = document.querySelector(z || '#contenu'); return e ? e.innerText.replace(/\n{2,}/g, '\n').trim() : ''; }, zone);
// rend les erreurs de page accumulées depuis le dernier appel
exports.erreurs = c => { const e = c.err.splice(0); return e; };
// change de personne DANS la page (la session de l'application, sans recharger : les données du prototype vivent en mémoire)
exports.devenir = async (c, qui, hash) => { await c.p.evaluate(([q, h]) => { try { sessionFermer('essai'); } catch (e) {} route = 'accueil'; param = null; sessionOuvrir(q);   /* la page d'avant (« Ma journée ») n'existe pas pour la personne suivante : sans ça, un message « pas dans ton espace » reste collé */ aller(h || 'accueil'); }, [qui, hash]); await L.calme(c.p, 500); };
// un petit PNG valide (1×1) pour les champs « photo »
exports.PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
// trace un trait sur un canevas (signature) à la souris ou au doigt
exports.signer = async (c, sel) => { const b = await c.p.locator(sel).first().boundingBox(); if (!b) return false; await c.p.locator(sel).first().scrollIntoViewIfNeeded(); const b2 = await c.p.locator(sel).first().boundingBox();
  await c.p.mouse.move(b2.x + b2.width * .2, b2.y + b2.height * .6); await c.p.mouse.down(); for (let k = 1; k <= 8; k++) await c.p.mouse.move(b2.x + b2.width * (.2 + k * .08), b2.y + b2.height * (.6 - (k % 2) * .3), { steps: 2 }); await c.p.mouse.up(); await L.calme(c.p, 300); return true; };
exports.F = (p, id) => p.evaluate(i => { const F = fiche(i), I = INTS.find(o => o.id === i); return { etat: F.etat, st: I && I.st, coches: Object.values(F.coches).filter(Boolean).length, photos: F.photos.length, pieces: F.pieces.map(x => x.nom + '|' + x.q), compte: F.compte, signature: !!F.signature, paiement: F.paiement, suite: F.suite, debut: F.debut, fin: F.fin, manque: manque(F) }; }, id);

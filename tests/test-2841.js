/* ══ test-2841 · UN GESTE RÉVERSIBLE SE DÉFAIT AU LIEU DE SE CONFIRMER ; UNE SUPPRESSION DIT CE QU'ELLE SUPPRIME ══════════════
   Audit apple-design du 21 octobre 2026, points 19, 20, 30 et 31 (§ 16 : la confirmation pour l'irréversible seulement).
   · 19 — des boîtes du navigateur posées sur des gestes qu'on peut défaire (remettre une absence en attente, rouvrir
     l'organisation, rendre des box, changer de métier), et deux boîtes de suite pour remettre la consommation à zéro.
     Le geste se fait, et « ↩︎ Annuler » (toastAnnuler) remet EXACTEMENT l'état d'avant.
   · 20 — « Supprimer cet élément ? » ne disait pas quoi : la boîte nomme ce qui part, et la suppression simple se défait.
   · 30 — « Annuler ce qui attend le DR ? » : le bouton « Annuler » de la boîte voulait dire « ne pas annuler ». Rien n'est
     appliqué au stock : plus de question, et « ↩︎ Annuler » remet les demandes.
   · 31 — trois alert() dans le flux des bons de commande : des toasts (une erreur annoncée comme telle).
   Gardées, et nommées ici avec leur raison : l'ajout de plus de 60 produits au catalogue (« un gros geste — il se confirme »,
   décidé dans le code ; défaire 300 fiches poserait 300 pierres tombales), la demande de retrait d'un produit d'une box (elle
   enchaîne sur « Pour qui ? »), les générateurs de démonstration de la bêta (outils de l'équipe).
   Ce banc EXÉCUTE les vraies fonctions et leurs inverses, extraites d'app.html, contre une base simulée.                 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
const CODE = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
function bloc(debut) {
  const i = CODE.indexOf(debut); if (i < 0) return '';
  let k = CODE.indexOf('{', i), prof = 0, q = null;
  for (; k < CODE.length; k++) { const c = CODE[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === '/' && CODE[k + 1] === '/') { k = CODE.indexOf('\n', k); continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) break; } }
  return CODE.slice(i, k + 1);
}
const F = (n) => { const b = bloc('\nfunction ' + n + '('); return b ? b.slice(1) : bloc('\nasync function ' + n + '(').slice(1); };
const ligneVar = (n) => (new RegExp('\\nvar ' + n + '=[^;]*;').exec(CODE) || [''])[0];
const DEL_NOMS = (/\nconst DEL_NOMS=\{[\s\S]*?\};/.exec(CODE) || [''])[0];

console.log('\n── 2841 · 0. la population ──');
const NOMS = ['absRouvrir', 'absRouvrirAnnuler', 'orgaRouvrir', 'orgaRouvrirTout', 'orgaRouvrirAnnuler', 'exclusionsRendreTout', 'exclusionsRendreAnnuler', 'metierSet', 'boxLotAnnuler', 'boxLotRemettre', 'delItem', 'delItemAnnuler', 'delLibelle', 'consoRemiseZero', 'bonValider', 'envoiBonApercu'];
const SRC = {}; NOMS.forEach(n => { SRC[n] = F(n); });
vrai('les fonctions et leurs inverses sont trouvées', NOMS.every(n => SRC[n].length > 30), NOMS.filter(n => !SRC[n]));

function monde() {
  const J = { confirms: [], toasts: [], annuler: [], saves: 0, journal: [], vues: 0 };
  const ctx = { console, JSON, Math, Object, Array, String, Date, Set,
    db: { absences: [{ id: 'a1', techId: 't1', du: '2026-10-20', statut: 'refuse', motif: 'pas de remplaçant', parQui: 'Ben', leQuand: 123 }],
      planOrga: { '2026-10-22': { valide: true, le: 1, par: 'Ben' }, '2026-10-23': { valide: true, le: 2, par: 'Ben' } }, planOrgaRef: { '2026-10-22': { x: 1 }, '2026-10-23': { x: 2 } },
      /* b1 liste aussi Léa en clair (userIds) : rendre la box la retire de cette liste (userBoxVoit filtre d'abord) — l'annuler
         doit la remettre, pas seulement les exclus */
      boxes: [{ id: 'b1', nom: 'Box A', visibleTous: true, userIds: ['u2'], userIdsExclus: ['u2'] }, { id: 'b2', nom: 'Box B', respUserId: 'u2', userIds: ['u9'], userIdsExclus: ['u2', 'u7'] }],
      users: [{ id: 'u2', prenom: 'Léa', nom: 'M', login: 'lea' }], metier: '3d', boxMvtAttente: [{ id: 'm1', boxId: 'b1', produitId: 'p1' }, { id: 'm2', boxId: 'b1', produitId: 'p2' }, { id: 'm3', boxId: 'b2', produitId: 'p3' }],
      vehicules: [{ id: 'v0', immat: 'AA-000-AA' }, { id: 'v1', immat: 'AB-123-CD' }, { id: 'v2', immat: 'ZZ-999-ZZ' }], mouvements: [{ id: 'x1' }, { id: 'x2' }] },
    current: 'planning', currentUser: { id: 'u1', role: 'admin' },
    boxTxt: (s) => s, confirm: (m) => { J.confirms.push(String(m)); return true; }, alert: (m) => { J.confirms.push('ALERT ' + m); },
    toast: (m) => J.toasts.push(String(m)), toastAnnuler: (m, appel) => { J.toasts.push(String(m)); J.annuler.push(String(appel)); },
    save: () => { J.saves++; }, logEvent: (a) => J.journal.push(a), views: { absences() { J.vues++; }, planning() { J.vues++; }, parametres() { J.vues++; }, saisieConso() { J.vues++; } },
    go: () => { J.vues++; }, closeModal() {}, canPlan: () => true, absPeutValider: () => true, techName: () => 'Léa', fmtShort: (d) => d, fullName: (u) => (u && u.prenom) || '',
    orgaJours: () => ['2026-10-22', '2026-10-23'], revueExclusions() {}, exclusionsPrivantes: (u) => ctx.db.boxes.filter(b => (b.userIdsExclus || []).includes(u.id)),
    METIERS: { '3d': { nom: '3D', ic: '🐀' }, nettoyage: { nom: 'Nettoyage', ic: '🧽' } }, adminSeul: () => true,
    boxAttentes: (bid) => ctx.db.boxMvtAttente.filter(m => m.boxId === bid), boxAttentePids: (bid) => ctx.db.boxMvtAttente.filter(m => m.boxId === bid).map(m => m.produitId),
    boxMvtLibelle: (m) => m.id, renderBoxProdList() {}, boxView: 'b1', COLL_GRP: { vehicules: 'equipe' }, canCat: () => true, can: () => true, ptPeutCorriger: () => true };
  vm.createContext(ctx);
  const code = [ligneVar('_absAvant'), ligneVar('_orgaAvant'), ligneVar('_exclAvant'), ligneVar('_lotAvant'), ligneVar('_delAvant'), DEL_NOMS,
    (/\nconst vPlaque=[^\n]*/.exec(CODE) || [''])[0],   /* la plaque se lit par vPlaque, le seul chemin (test-1290) */
    F('userBoxVoit'), F('metierId'), ...NOMS.map(n => SRC[n])].join('\n');
  try { vm.runInContext(code, ctx); } catch (e) { J.err = e.message; }
  /* un code qui ne s'exécute pas (version d'avant, fonction absente) fait tomber les contrôles, il ne fait pas MOURIR le banc */
  const run = (s) => { try { return vm.runInContext(s, ctx); } catch (e) { J.exc = e.message; return undefined; } };
  const appelerAnnuler = () => { const a = J.annuler.pop(); if (a) run(a); return a; };
  return { ctx, J, appelerAnnuler, run };
}
const copie = (x) => JSON.parse(JSON.stringify(x));
/* égalité de contenu, l'ordre des clés d'un dictionnaire ne compte pas (une clé remise passe à la fin) */
const pareil = (a, b) => { const tri = (v) => Array.isArray(v) ? v.map(tri) : v && typeof v === 'object' ? Object.keys(v).sort().reduce((o, k) => (o[k] = tri(v[k]), o), {}) : v; return JSON.stringify(tri(a)) === JSON.stringify(tri(b)); };

console.log('\n── 2841 · 1. absence : remettre en attente, puis Annuler ──');
{ const M = monde(); vrai('le code s’exécute', !M.J.err, M.J.err);
  const avant = copie(M.ctx.db.absences[0]); M.run("absRouvrir('a1')");
  vrai('aucune boîte du navigateur', !M.J.confirms.length, M.J.confirms);
  vrai('la demande est en attente, et un « ↩︎ Annuler » est offert', M.ctx.db.absences[0].statut === 'attente' && M.J.annuler.length === 1, M.J.annuler);
  M.appelerAnnuler();
  vrai('« Annuler » rétablit EXACTEMENT la décision d’avant (statut, motif, qui, quand)', JSON.stringify(M.ctx.db.absences[0]) === JSON.stringify(avant), M.ctx.db.absences[0]); }
{ const M = monde(); M.run("absRouvrir('a1')"); M.ctx.db.absences[0].statut = 'valide';
  M.appelerAnnuler();
  vrai('… mais pas si quelqu’un l’a retraitée entre-temps (on n’écrase pas sa décision)', M.ctx.db.absences[0].statut === 'valide'); }

console.log('\n── 2841 · 2. organisation : rouvrir, puis Annuler ──');
{ const M = monde(); const avant = copie(M.ctx.db.planOrga); M.run("orgaRouvrir('2026-10-22')");
  vrai('rouvrir un jour : sans boîte, l’organisation du jour est retirée', !M.J.confirms.length && !M.ctx.db.planOrga['2026-10-22'] && M.J.annuler.length === 1);
  M.appelerAnnuler();
  vrai('« Annuler » la referme telle qu’elle était', pareil(M.ctx.db.planOrga, avant), M.ctx.db.planOrga); }
{ const M = monde(); const o = copie(M.ctx.db.planOrga), r = copie(M.ctx.db.planOrgaRef); M.run('orgaRouvrirTout()');
  vrai('tout rouvrir : sans boîte, les jours et leurs repères sont retirés', !M.J.confirms.length && !Object.keys(M.ctx.db.planOrga).length && !Object.keys(M.ctx.db.planOrgaRef).length);
  M.appelerAnnuler();
  vrai('« Annuler » remet chaque jour ET son repère', pareil(M.ctx.db.planOrga, o) && pareil(M.ctx.db.planOrgaRef, r), [M.ctx.db.planOrga, M.ctx.db.planOrgaRef]); }

console.log('\n── 2841 · 3. rendre les box, puis Annuler ──');
{ const M = monde(); const avant = copie(M.ctx.db.boxes); M.run("exclusionsRendreTout('u2')");
  vrai('sans boîte, les box sont rendues', !M.J.confirms.length && M.ctx.db.boxes.every(b => !(b.userIdsExclus || []).includes('u2')));
  M.appelerAnnuler();
  vrai('« Annuler » remet chaque box exactement comme avant (les autres personnes comprises)', JSON.stringify(M.ctx.db.boxes) === JSON.stringify(avant), M.ctx.db.boxes); }

console.log('\n── 2841 · 4. changer de métier, puis Annuler ──');
{ const M = monde(); M.run("metierSet('nettoyage')");
  vrai('sans boîte, le métier change', !M.J.confirms.length && M.ctx.db.metier === 'nettoyage');
  M.appelerAnnuler();
  vrai('« Annuler » rend le métier d’avant', M.ctx.db.metier === '3d', M.ctx.db.metier); }

console.log('\n── 2841 · 5. ce qui attend le DR : retirer, puis Annuler (point 30) ──');
{ const M = monde(); const avant = copie(M.ctx.db.boxMvtAttente); M.run("boxLotAnnuler('b1')");
  vrai('plus de question piège (« Annuler ce qui attend… ? »)', !M.J.confirms.length, M.J.confirms);
  vrai('les demandes de la box sont retirées, celles des autres restent', M.ctx.db.boxMvtAttente.length === 1 && M.ctx.db.boxMvtAttente[0].id === 'm3');
  M.appelerAnnuler();
  vrai('« Annuler » remet les demandes (mêmes enregistrements)', JSON.stringify(M.ctx.db.boxMvtAttente.slice().sort((a, b) => a.id < b.id ? -1 : 1)) === JSON.stringify(avant), M.ctx.db.boxMvtAttente); }

console.log('\n── 2841 · 6. une suppression dit ce qu’elle supprime (point 20) ──');
{ const M = monde(); M.run("delItem('vehicules','v1')");
  vrai('la boîte NOMME l’élément : « Supprimer le véhicule « AB-123-CD » ? »', M.J.confirms[0] === 'Supprimer le véhicule « AB-123-CD » ?', M.J.confirms);
  vrai('le toast dit ce qui est parti, avec « ↩︎ Annuler »', /Supprimé : le véhicule « AB-123-CD »/.test(M.J.toasts.join('|')) && M.J.annuler.length === 1, M.J.toasts);
  M.appelerAnnuler();
  vrai('« Annuler » le remet À SA PLACE (entre les deux autres)', M.ctx.db.vehicules.map(v => v.id).join(',') === 'v0,v1,v2', M.ctx.db.vehicules.map(v => v.id)); }
{ const M = monde();
  vrai('sans nom connu : « cet élément » (jamais une phrase vide)', M.run("delLibelle('inconnus',{id:'z'})") === 'cet élément' && M.run("delLibelle('taches',{id:'z',titre:'Rappeler M. Dupont'})") === 'la tâche « Rappeler M. Dupont »'); }

console.log('\n── 2841 · 6 bis. l’« Annuler » d’avant survit à une suppression qui n’a pas lieu (relecture adverse, partie X) ──');
{ const M = monde(); const ids = () => M.ctx.db.vehicules.map(v => v.id).join(',');
  M.run("delItem('vehicules','v1')"); const a1 = M.J.annuler[M.J.annuler.length - 1];
  M.ctx.confirm = (m) => { M.J.confirms.push(String(m)); return false; };
  M.run("delItem('vehicules','v2')");
  vrai('la suppression suivante, refusée à la boîte : rien n’est supprimé', ids() === 'v0,v2', ids());
  M.run(a1);
  vrai('⛔ … et le « ↩︎ Annuler » du premier toast, encore à l’écran, remet toujours le premier (il devenait muet)', ids() === 'v0,v1,v2', ids());
  M.ctx.confirm = (m) => { M.J.confirms.push(String(m)); return true; };
  M.run("delItem('vehicules','v0')"); M.run("delItem('vehicules','v2')"); M.run('delItemAnnuler()');
  vrai('deux suppressions faites : « Annuler » rend la DERNIÈRE', ids() === 'v1,v2', ids()); }
{ const M = monde(); M.run('delItemAnnuler()');
  vrai('« Annuler » sans rien à rétablir le DIT (« Rien à rétablir »), au lieu de se taire', M.J.toasts.includes('Rien à rétablir'), M.J.toasts); }

console.log('\n── 2841 · 7. une seule boîte pour remettre la consommation à zéro (irréversible) ──');
{ const M = monde(); M.run('consoRemiseZero()');
  vrai('une boîte, pas deux (la première dit tout : combien, quoi, irréversible)', M.J.confirms.length === 1 && /Irréversib/.test(M.J.confirms[0]) && M.ctx.db.mouvements.length === 0, M.J.confirms.length); }

console.log('\n── 2841 · 8. les bons de commande n’ouvrent plus de boîte du navigateur (point 31) ──');
vrai('bonValider et envoiBonApercu : plus aucun alert()', !/\balert\(/.test(SRC.bonValider) && !/\balert\(/.test(SRC.envoiBonApercu));
vrai('… une commande vide ou à zéro est un refus ANNONCÉ (toast « erreur »)', /toast\('Ta commande est vide[^;]*?,'erreur'\)/.test(SRC.bonValider) && /toast\('⚠️ Toutes les quantités sont à 0[^;]*?,'erreur'\)/.test(SRC.bonValider));

console.log('\n── 2841 · 9. les confirmations gardées, et pourquoi ──');
const GARDEES = [['fcAddAll', /neufs\.length>60/], ['removeBoxProd', /boxValidRequis\(\)/]];
for (const [n, garde] of GARDEES) vrai(n + ' garde sa confirmation (nommée dans l’en-tête de ce banc)', /confirm\(/.test(F(n)) && garde.test(F(n)));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);

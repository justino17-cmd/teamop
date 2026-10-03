/* ══ LES MUTATIONS DES ESPACES, DES CANAUX ET DE MESSAGES PRO — « un banc qui passe ne prouve rien tant qu'on ne l'a pas vu ÉCHOUER » (CLAUDE.md) ═══════════
   Ce fichier n'est PAS une suite (il ne s'appelle pas `test-*.js` : le compteur ne le lance pas). Il remet, UN PAR UN, les défauts que `tests/test-960` à `965`, `905`, `934`,
   `950`, `963` et la sonde navigateur `sonde-opmessages-espaces.js` gardent — la formule qui compte le drapeau de la bêta, un impayé jugé sur l'horloge, un sursis de trente jours ;
   une route Pro sans son garde, un non-membre qui reçoit autre chose que « rien », un simple membre qui administre ; un lien qui laisse entrer au-delà des places payées, un
   code qui sert deux fois, un lien dont le créateur n'est plus administrateur ; un canal privé lu par qui n'y est pas, un membre parti qui reste dans ses canaux, un effacement
   que la restauration ressusciterait ; un paiement sans adresse en production, un second abonnement, une panne de Stripe lue comme une résiliation, un tarif que le corps
   choisit, une métadonnée que lit OP GESTION ; une clé écrite avant d'être éprouvée, une clé secrète complète acceptée, une clé affichée ; et — dans la COPIE du serveur
   d'OP GESTION, jamais dans l'arbre — le classement des lignes « OP MESSAGES » qui protège ses clients — dans une COPIE de l'arbre (jamais dans l'arbre lui-même : le
   `git checkout` d'après-mutation de CLAUDE.md efface aussi les correctifs non commités), joue les bancs visés, et exige qu'AU MOINS UN tombe (code de sortie non nul ou un « ✗ »).

   ⛔ UNE MUTATION DONT LE MOTIF NE TROUVE RIEN EST MAL VISÉE, et le lanceur le DIT au lieu de conclure : il vérifie que le motif se trouve EXACTEMENT UNE fois
   (`s.replace(motif, autre, 1)` frappe la PREMIÈRE occurrence du fichier, pas celle qu'on croit — pris le 22 septembre 2026), que le texte a changé, ET que le fichier
   muté se lit encore (`node --check`) : une suite qui MEURT sur une faute de syntaxe de la mutation a l'air de « tomber » et ne prouve rien.
   ⛔ UNE MUTATION QUI SURVIT n'est pas forcément un banc aveugle : une autre garde peut la neutraliser (un garde de route ET un contrôle du stockage ; la garde EA ET la vérification
   du rôle dans `canalCreer`). Ces mutations-là sont marquées `equivalente` : on les joue quand même, et ELLES DOIVENT SURVIVRE (« ≡ ») — c'est la preuve que la garde restante tient seule.
   Le défaut RÉEL s'écrit alors avec LES DEUX retirées. Si une « équivalente » TOMBE, la raison donnée est fausse : le lanceur le crie.
   ⛔ LA COPIE EST FABRIQUÉE DEPUIS L'ARBRE COMMITÉ OU NON : lancer ce fichier APRÈS `git commit` du correctif, jamais avant. Elle emporte aussi `server/` (le VRAI OP GESTION, que
   `test-965` lance en boucle locale) : les mutations O* y réécrivent le classement des lignes de Stripe — dans la copie seulement.

   Lancer :  TMPDIR=/un/dossier node tests/mutations-espaces.js                 (toutes, hors sondes navigateur)
             NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules node tests/mutations-espaces.js --sondes     (les mutations jouées par la sonde navigateur)
             node tests/mutations-espaces.js F01 R05                            (seulement celles-là)
             node tests/mutations-espaces.js --verifier                         (ne joue rien : chaque motif se trouve UNE fois dans l'arbre, chaque banc existe)
             node tests/mutations-espaces.js --liste                            (le catalogue)
             --copies=N (défaut 2)   --garder ID (fabrique UNE copie mutée, l'imprime et s'arrête)   --sans-temoin   --temoins (ne joue que les témoins)   --details=FICHIER (tous les ✗ de chaque mutation qui tombe)
   Deux copies en parallèle, un délai par banc ; les sondes une à la fois (deux navigateurs et deux services se volent le processeur, et la sonde mesure du temps). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { spawn, spawnSync } = require('child_process');

const RACINE = path.join(__dirname, '..');
const DELAI_MS = 300000;
const F = {
  formule: 'server-msg/formule.js', fact: 'server-msg/facturation.js', resp: 'server-msg/routes-espaces.js', stock: 'server-msg/stockage.js', app: 'server-msg/app.js', man: 'server-msg/manifeste.js',
  conf: 'server-msg/config.js', compte: 'server-msg/compte.js', index: 'server-msg/index.js', cfgstripe: 'server-msg/configurer-stripe.js', surv: '.github/scripts/surveillance-messages.js',
  src: 'server-msg/public/source-serveur.js', api: 'server-msg/public/api.js', page: 'apercu/opmessages/index.html', og: 'server/index.js',
};
const BANCS = ['900', '905', '934', '941', '950', '960', '961', '962', '963', '964', '965', 'sonde'];
const SONDE_FICHIER = 'sonde-opmessages-espaces.js';
const MUTATIONS = [];
/* m(id, nom, fichier, ancien, nouveau, suites) — `ancien` : une chaîne, ou une expression régulière (une seule occurrence, `$1` permis dans `nouveau`) */
const m = (id, nom, fichier, ancien, nouveau, suites, o) => MUTATIONS.push(Object.assign({ id, nom, edits: [[fichier, ancien, nouveau]], suites }, o || {}));
const m2 = (id, nom, edits, suites, o) => MUTATIONS.push(Object.assign({ id, nom, edits, suites }, o || {}));
const EQ = (raison) => ({ equivalente: raison });
const SONDE = { sonde: true };

/* ══ 1. LA FORMULE — UNE FONCTION DÉCIDE : Perso, Pro ou impayé (formule.js) ═══════════════════════════════════════════════════════════════════════════════ */
m('F01', 'la bêta n\'ouvre plus rien pour un espace (le drapeau n\'est plus lu dans `deEspace`) : Messages Pro y demande un paiement', F.formule,
  "  function deEspace(id) {\n    if (toutOuvert) return { formule: 'pro', motif: 'beta' };\n", '  function deEspace(id) {\n', ['960', '961']);
m('F02', 'la bêta n\'ouvre plus rien pour une personne (le drapeau n\'est plus lu dans `dePersonne`) : créer un espace y demande un paiement', F.formule,
  "  function dePersonne(uid) {\n    if (toutOuvert) return { formule: 'pro', motif: 'beta' };\n", '  function dePersonne(uid) {\n', ['960', '961']);
m('F03', 'un abonnement « incomplete » (le paiement n\'a pas abouti) donne Pro', F.formule, "const STATUTS_PAYES = ['active', 'trialing'];", "const STATUTS_PAYES = ['active', 'trialing', 'incomplete'];", ['960', '962']);
m('F04', 'un paiement en retard (past_due) compte comme payé : pas de sursis, pas d\'impayé, jamais', F.formule, "const STATUTS_PAYES = ['active', 'trialing'];", "const STATUTS_PAYES = ['active', 'trialing', 'past_due'];", ['960', '961']);
m('F05', 'un abonnement « unpaid » n\'est plus un impayé : il ne donne plus ni sursis ni places', F.formule, "const STATUTS_IMPAYES = ['past_due', 'unpaid'];", "const STATUTS_IMPAYES = ['past_due'];", ['960']);
m('F06', 'le sursis dure trente jours (au lieu de sept)', F.formule, 'const SURSIS_MS = 7 * 86400000;', 'const SURSIS_MS = 30 * 86400000;', ['960', '961']);
m('F07', 'le sursis dure un jour', F.formule, 'const SURSIS_MS = 7 * 86400000;', 'const SURSIS_MS = 1 * 86400000;', ['960']);
m('F08', 'le sursis se compte sur l\'HORLOGE et non entre deux lectures de Stripe : une panne de Stripe suspend quelqu\'un qui a peut-être payé', F.formule,
  'a.relu_le - a.impaye_depuis >= SURSIS_MS', 'Date.now() - a.impaye_depuis >= SURSIS_MS', ['960']);
m('F09', 'un impayé l\'emporte sur un espace payé : la personne qui est dans les deux perd Pro', F.formule, 'const RANG = { perso: 0, impaye: 1, pro: 2 };', 'const RANG = { perso: 0, impaye: 2, pro: 1 };', ['960']);
m('F10', 'la formule d\'une personne ne prend plus la MEILLEURE de ses espaces : le sens de la comparaison est inversé', F.formule,
  'if (RANG[v.formule] > RANG[meilleur.formule]) meilleur = v;', 'if (RANG[v.formule] < RANG[meilleur.formule]) meilleur = v;', ['960']);
m('F11', 'un impayé perd ses places (les places ne sont plus que celles d\'un abonnement payé) : les membres déjà là sont « en trop »', F.formule,
  'if (a && STATUTS_VIVANTS.includes(a.statut) && a.places > 0) return a.places;', 'if (a && STATUTS_PAYES.includes(a.statut) && a.places > 0) return a.places;', ['960']);
m('F12', 'la bêta n\'a plus de places illimitées : on n\'y invite plus personne', F.formule, 'return toutOuvert ? Infinity : 0;', 'return 0;', ['961']);
m('F13', 'la production a des places illimitées sans abonnement : on invite sans payer', F.formule, 'return toutOuvert ? Infinity : 0;', 'return Infinity;', ['960', '961']);
m('F14', 'un sujet qui n\'est ni un espace ni une personne rend « Perso » en silence au lieu de jeter (une erreur de code devient un refus muet)', F.formule,
  "throw new Error('formuleDe : un espace ou une personne');", "return { formule: 'perso', motif: 'aucun' };", ['960']);

/* ══ 2. LES GARDES — l'appartenance, le rôle, la formule ; un non-membre ne voit RIEN (app.js, manifeste.js) ═══════════════════════════════════════════════ */
m('G01', 'le garde PRO d\'une route d\'espace lit la formule de la PERSONNE et non celle de l\'espace : un espace non payé hérite de Pro d\'ailleurs', F.app,
  'ctx.formule.formuleDe(req.espace ? { espace: req.espace.espace.id } : { personne: req.moi.id })', 'ctx.formule.formuleDe({ personne: req.moi.id })', ['961']);
m('G02', 'le garde PRO est retiré de TOUTES les routes (la route déclare `pro`, plus rien ne le lit)', F.app, 'if (r.pro === true) chaine.push(...garde.PRO);', '', ['905', '961']);
m('G03', 'créer un espace n\'est plus déclaré Pro dans le manifeste', F.man, /(id: 'espaces\.creer',\s+m: 'POST', p: '\/api\/espaces',\s+garde: 'V'), pro: true/, '$1', ['905', '961']);
m('G04', 'créer un canal n\'est plus déclaré Pro dans le manifeste', F.man, /(id: 'canaux\.creer',\s+m: 'POST', p: '\/api\/espaces\/:id\/canaux',\s+garde: 'EA'), pro: true/, '$1', ['905', '961']);
m('G05', 'créer un lien d\'invitation n\'est plus déclaré Pro dans le manifeste', F.man, /(id: 'espaces\.invitations\.creer',\s+m: 'POST', p: '\/api\/espaces\/:id\/invitations',\s+garde: 'EA'), pro: true/, '$1', ['905', '961']);
m('G06', 'le refus d\'une fonction Pro dit POURQUOI (jamais abonné, impayé) à celui qui n\'a pas d\'espace à administrer — créer un espace', F.app,
  "if (req.espace && req.espace.moi.role === 'admin') extra.raison = v.formule;", 'extra.raison = v.formule;', ['961']);
m('G07', 'le refus d\'une fonction Pro dit pourquoi à tout membre de l\'espace', F.app,
  "if (req.espace && req.espace.moi.role === 'admin') extra.raison = v.formule;", 'if (req.espace) extra.raison = v.formule;', ['961'],
  EQ('toutes les routes Pro d\'un espace sont EA : un simple membre n\'arrive jamais jusqu\'au garde PRO (il reçoit 403 avant)'));
m('G08', 'le garde E est bâti sur S et non sur V : une adresse non confirmée agit au nom d\'une entreprise', F.app, 'garde.E = garde.V.concat([espaceDuMembre]);', 'garde.E = garde.S.concat([espaceDuMembre]);', ['905']);
m('G09', 'le garde EA laisse passer un simple membre', F.app,
  "garde.EA = garde.E.concat([(req, res, next) => req.espace.moi.role === 'admin' ? next() : refus(res, 403, 'interdit')]);", 'garde.EA = garde.E.concat([(req, res, next) => next()]);', ['905', '961']);
m('G10', 'le garde EP laisse passer un administrateur qui n\'est pas le propriétaire (il paie, dissout, passe la main)', F.app,
  "garde.EP = garde.E.concat([(req, res, next) => req.espace.espace.proprio === req.moi.id ? next() : refus(res, 403, 'interdit')]);",
  "garde.EP = garde.E.concat([(req, res, next) => req.espace.moi.role === 'admin' ? next() : refus(res, 403, 'interdit')]);", ['905', '961']);
m('G11', 'un non-membre reçoit 403 « interdit » au lieu de la réponse d\'un espace inexistant (il apprend que l\'espace existe)', F.app,
  "    const r = ID_ESPACE.test(id) ? stockage.espacePourMembre(id, req.moi.id) : null;\n    if (!r) return refus(res, 404, 'introuvable');", "    const r = ID_ESPACE.test(id) ? stockage.espacePourMembre(id, req.moi.id) : null;\n    if (!r) return refus(res, 403, 'interdit');", ['905', '961']);
m('G12', 'un identifiant d\'espace mal formé n\'est plus écarté avant la base', F.app, 'const r = ID_ESPACE.test(id) ? stockage.espacePourMembre(id, req.moi.id) : null;', 'const r = stockage.espacePourMembre(id, req.moi.id);', ['905', '961'],
  EQ('le SQL est paramétré : un identifiant mal formé ne trouve simplement rien (404, la même réponse)'));

/* ══ 3. LES ROUTES DES ESPACES — rôles, invitations, plafonds (routes-espaces.js) ═══════════════════════════════════════════════════════════════════════ */
m('R01', 'créer un espace n\'est plus plafonné par heure', F.resp, "if (!plafond(res, 'espace_creer', req.moi.id, { max: 10, fenetreMs: 3600000 })) return;", '', ['961']);
m('R02', 'dissoudre un espace est permis tant qu\'un abonnement court (Stripe continuerait de prélever pour un espace qui n\'existe plus)', F.fact,
  "      if (a && a.abonnement && !STATUTS_FINAUX.includes(a.statut) && a.statut !== 'aucun') throw erreur('abonnement_actif');\n", '', ['961']);
m('R03', 'dissoudre un espace n\'exige plus le mot SUPPRIMER', F.resp,
  "H['espaces.supprimer'] = garder(async (req, res) => {\n    if (corps(req).confirmation !== CONFIRMATION) return refus(res, 400, 'confirmation_requise');\n", "H['espaces.supprimer'] = garder(async (req, res) => {\n", ['961']);
m('R04', 'supprimer un canal n\'exige plus le mot SUPPRIMER', F.resp,
  "H['canaux.supprimer'] = garder((req, res) => {\n    if (corps(req).confirmation !== CONFIRMATION) return refus(res, 400, 'confirmation_requise');\n", "H['canaux.supprimer'] = garder((req, res) => {\n", ['961']);
m('R05', 'un administrateur qui n\'est pas le propriétaire rétrograde un autre administrateur', F.resp,
  "if (!b.admin && estAdmin(id, u) && req.espace.espace.proprio !== req.moi.id) return refus(res, 403, 'interdit');", '', ['961']);
m('R06', 'un administrateur qui n\'est pas le propriétaire retire un autre administrateur', F.resp,
  "if (estAdmin(id, u) && req.espace.espace.proprio !== req.moi.id) return refus(res, 403, 'interdit');", '', ['961']);
m('R07', 'on se retire soi-même par la route des membres (au lieu de « quitter »)', F.resp,
  /if \(u === req\.moi\.id\) return refus\(res, 400, 'champ_invalide'\);(\s+\/\/ on se retire par)/, '$1', ['961']);
m('R08', 'un lien se crée au-delà des places payées', F.resp, "if (n >= places) return refus(res, 402, 'places_epuisees', { places, membres: n });", '', ['961']);
m('R09', 'un lien n\'est plus borné par les places qui restent : ses utilisations sont celles qu\'on a demandées', F.resp,
  'const max = Math.min(b.max, Number.isFinite(places) ? places - n : b.max);', 'const max = b.max;', ['961']);
m('R10', 'un lien vaut plus de trente jours', F.resp, 'jours !== null && jours >= 1 && jours <= 30)', 'jours !== null && jours >= 1)', ['961']);
m('R11', 'un lien peut servir plus de cent personnes', F.resp, '(max !== null && max >= 1 && max <= 100 && jours', '(max !== null && max >= 1 && jours', ['961']);
m('R12', 'l\'aperçu d\'un lien n\'est plus plafonné par adresse : on peut essayer des codes sans fin', F.resp,
  "H['invitations.lire'] = garder((req, res) => {\n    if (!plafond(res, 'lien_ip', cleReseau(req.ip), { max: 60, fenetreMs: 60000 })) return;\n", "H['invitations.lire'] = garder((req, res) => {\n", ['961']);
m('R13', 'rejoindre un espace n\'est plus plafonné par adresse', F.resp,
  "H['invitations.accepter'] = garder((req, res) => {\n    if (!plafond(res, 'lien_ip', cleReseau(req.ip), { max: 60, fenetreMs: 60000 })) return;\n", "H['invitations.accepter'] = garder((req, res) => {\n", ['961']);
m('R14', 'on rejoint un espace dont l\'abonnement est en retard ou absent (la formule de l\'espace n\'est plus exigée)', F.resp,
  "if (!dejaMembre && formule.formuleDe({ espace: cible }).formule !== 'pro') return refus(res, 409, 'espace_indisponible');", '', ['961']);
m('R15', 'la phrase n\'est plus neutre : celui qui arrive apprend que l\'abonnement est en retard', F.resp,
  "formule !== 'pro') return refus(res, 409, 'espace_indisponible');", "formule !== 'pro') return refus(res, 409, 'abonnement_en_retard');", ['961']);
m('R16', 'rejoindre ne recompte plus les places au moment d\'entrer (d\'autres liens ont pu les prendre entre-temps)', F.resp,
  'const r = stockage.invitationAccepter({ h, uid: req.moi.id, max: formule.placesDe(cible) });', 'const r = stockage.invitationAccepter({ h, uid: req.moi.id, max: Infinity });', ['961']);
m('R17', 'un canal public prend la liste de membres qu\'on lui envoie (au lieu de tous ceux de l\'espace)', F.resp, 'membres = prive ? b.membres : [];', 'membres = b.membres;', ['961'],
  EQ('`canalCreer` ne lit pas la liste pour un canal public : `qui` est alors tous les membres de l\'espace'));
m('R18', 'ajouter à un canal : le canal d\'un AUTRE espace est atteint (on ne vérifie plus qu\'il est de CET espace)', F.stock, 'if (!k || k.espace !== espace) return null;', 'if (!k) return null;', ['961']);
m('R19', 'l\'administrateur de l\'espace gère un canal privé dont il n\'est pas membre', F.stock, "return m && m.role === 'admin' ? k : null;", 'return k;', ['960', '961']);
m('R20', 'on ajoute des membres à un canal PUBLIC (ses membres sont ceux de l\'espace)', F.stock, "      if (!k.prive) throw erreur('canal_public');\n      const roles = new Map(", '      const roles = new Map(', ['960', '961']);
m('R21', 'on retire un membre d\'un canal PUBLIC', F.stock, /      if \(!k\.prive\) throw erreur\('canal_public'\);\n(      \/\* ⛔ LA HIÉRARCHIE[\s\S]*?\n      const r = membreRetirer\()/, '$1', ['960', '961']);
m('R22', 'retirer quelqu\'un d\'un canal privé ne s\'écrit pas dans `purge` : une archive d\'avant le ramènerait', F.stock,
  "Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(conv + '|' + uid + '|' + t, 'canal_membre', t);   // une archive", "// une archive", ['960']);
m('R23', 'quitter un canal privé ne s\'écrit pas dans `purge`', F.stock,
  "      Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(conv + '|' + uid + '|' + t, 'canal_membre', t);\n      if (num(", '      if (num(', ['960']);
m('R24', 'sortir d\'un espace ne s\'écrit pas dans `purge` : une archive d\'avant ramènerait le salarié parti, ses canaux et ce qu\'ils disent', F.stock,
  "    Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(espace + '|' + uid + '|' + t, 'espace_membre', t);", '', ['960']);
m('R25', 'sortir d\'un espace laisse le membre dans ses canaux', F.stock,
  "      Q('UPDATE membre SET quitte_le = ? WHERE conv = ? AND uid = ?').run(t, c, uid);\n      if (num(Q('SELECT COUNT(*) AS n FROM membre WHERE conv = ? AND quitte_le IS NULL').get(c).n) === 0)",
  "      if (num(Q('SELECT COUNT(*) AS n FROM membre WHERE conv = ? AND quitte_le IS NULL').get(c).n) === 0)", ['960', '961']);
m('R26', 'sortir d\'un espace n\'écrit pas « retire » au journal de ses canaux : celui qui part ne l\'apprend pas', F.stock, "      journalAjouter('retire', c, uid, '');   // APRÈS", '      // APRÈS', ['960', '964']);
m('R27', 'dissoudre un espace ne s\'écrit pas dans `purge`', F.stock, "      Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(id, 'espace', horloge());", '', ['960']);
m('R28', 'dissoudre un espace laisse ses liens d\'invitation', F.stock, "      Q(`DELETE FROM lien WHERE genre = 'espace' AND cible = ?`).run(id);\n", '', ['960']);
m('R29', 'dissoudre un espace laisse ses canaux (les conversations restent)', F.stock, '      for (const c of convs) pieces.push(...convSupprimer(c).pieces);\n      Q(`DELETE FROM lien', '      Q(`DELETE FROM lien', ['960', '961']);
m('R30', 'passer la propriété à un compte non confirmé ou en cours de suppression', F.stock,
  "      if (!p || p.etat !== 'actif' || !p.verifie_le || p.suppression_le !== null) throw erreur('destinataire_invalide');\n", '', ['960']);
m('R31', 'passer la propriété à qui possède déjà trois espaces', F.stock,
  "      if (num(Q('SELECT COUNT(*) AS n FROM espace WHERE proprio = ?').get(vers).n) >= ESPACES_PROPRIO_MAX) throw erreur('trop_d_espaces');\n", '', ['960']);
m('R32', 'passer la propriété ne fait pas suivre le nouveau propriétaire dans les canaux (son rôle dans un canal n\'est plus celui de l\'espace)', F.stock,
  "return { convs: rolerCanaux(espace, vers, 'admin') };", 'return { convs: [] };', ['960']);
m('R33', 'le propriétaire peut être rétrogradé', F.stock,
  "      if (!m) throw erreur('introuvable');\n      if (e.proprio === uid) throw erreur('proprio');\n", "      if (!m) throw erreur('introuvable');\n", ['960', '961']);
m('R34', 'le propriétaire peut être retiré de son espace', F.stock,
  "AND uid = ?').get(espace, uid)) throw erreur('introuvable');\n      if (e.proprio === uid) throw erreur('proprio');\n", "AND uid = ?').get(espace, uid)) throw erreur('introuvable');\n", ['960', '961']);
m('R35', 'changer le rôle d\'un membre ne change pas son rôle dans les canaux', F.stock, 'return { change: true, convs: rolerCanaux(espace, uid, futur) };', 'return { change: true, convs: [] };', ['960']);
m('R36', 'on peut posséder plus de trois espaces', F.stock, "      if (num(Q('SELECT COUNT(*) AS n FROM espace WHERE proprio = ?').get(proprio).n) >= ESPACES_PROPRIO_MAX) throw erreur('trop_d_espaces');\n", '', ['960', '961']);
m('R37', 'on peut être membre d\'un nombre d\'espaces sans borne (en créer)', F.stock, "      if (num(Q('SELECT COUNT(*) AS n FROM espace_membre WHERE uid = ?').get(proprio).n) >= ESPACES_MEMBRE_MAX) throw erreur('trop_d_espaces');\n", '', ['960', '961']);
m('R38', 'rejoindre un espace n\'ajoute pas aux canaux publics', F.stock,
  "      for (const c of canauxPublics(e.id)) { if (membreJoindre(c, uid, 'membre', t)) { journalAjouter('conv_maj', c, null, ''); convs.push(c); } }\n", '', ['960', '961']);
m('R39', 'un code d\'invitation sert sans fin (ses utilisations restantes ne baissent pas)', F.stock, "      Q('UPDATE lien SET restants = restants - 1 WHERE h = ? AND restants > 0').run(h);\n", '', ['960', '961']);
m('R40', 'rejoindre deux fois n\'est plus reconnu (« déjà membre ») : l\'inscription est rejouée', F.stock,
  "      if (Q('SELECT 1 AS x FROM espace_membre WHERE espace = ? AND uid = ?').get(e.id, uid)) return { deja: true, espace: e.id, par: l.par, convs: [] };\n", '', ['960', '961']);
m('R41', 'rejoindre au-delà des places payées (le stockage ne compare plus au maximum donné)', F.stock, 'if (n >= MAX_MEMBRES || n >= max) throw erreur(\'espace_complet\');', 'if (n >= MAX_MEMBRES) throw erreur(\'espace_complet\');', ['960', '961']);
m('R42', 'rejoindre sans borne d\'espaces par personne', F.stock, "      if (num(Q('SELECT COUNT(*) AS n FROM espace_membre WHERE uid = ?').get(uid).n) >= ESPACES_MEMBRE_MAX) throw erreur('trop_d_espaces');\n      Q('UPDATE lien", "      Q('UPDATE lien", ['960', '961']);
m('R43', 'un lien dont le créateur a cessé d\'être administrateur reste valable', F.stock,
  "\n              AND (genre <> 'espace' OR EXISTS (SELECT 1 FROM espace_membre x WHERE x.espace = l.cible AND x.uid = l.par AND x.role = 'admin'))`).get(h, horloge()) || null;", "`).get(h, horloge()) || null;", ['960']);
m('R44', 'révoquer les liens ne s\'écrit pas dans `purge` : une archive d\'avant rendrait la porte à qui détient encore le code', F.stock,
  "      Q(`INSERT INTO purge(objet, genre, quand) SELECT h, 'invitation', ? FROM lien WHERE genre = 'espace' AND cible = ? AND revoque = 0`).run(t, espace);\n", '', ['960']);
m('R45', 'révoquer les liens ne révoque rien (le compte rendu dit zéro)', F.stock,
  "return num(Q(`UPDATE lien SET revoque = 1 WHERE genre = 'espace' AND cible = ? AND revoque = 0`).run(espace).changes);", 'return 0;', ['960', '961']);
m('R46', 'un membre voit ceux avec qui un blocage existe, dans « Contacts de l\'entreprise »', F.stock, 'tous || r.id === viewer || !contactBloque(viewer, r.id)', 'true', ['960', '961']);
m('R47', '« Contacts de l\'entreprise » liste les comptes supprimés', F.stock, "WHERE m.espace = ? AND p.etat = 'actif' ORDER BY p.prenom", 'WHERE m.espace = ? ORDER BY p.prenom', ['960'],
  EQ('l\'effacement d\'un compte le retire de TOUS ses espaces dans la même transaction (E02) : aucune ligne `espace_membre` ne désigne un compte effacé, le filtre `etat` est une ceinture'));
m('R48', 'la liste de MES espaces liste ceux de tout le monde', F.stock, 'e.id = m.espace WHERE m.uid = ? ORDER BY m.depuis, e.id`).all(uid)', 'e.id = m.espace WHERE ? IS NOT NULL ORDER BY m.depuis, e.id`).all(uid)', ['960', '961']);
m('R49', 'un NON-membre lit l\'espace (nom, membres, canaux) : il reçoit ce qu\'il reçoit un membre', F.stock,
  "    if (!m) return null;\n    const e = espaceBrut(id); if (!e) return null;\n    return { espace: espaceRang(e), moi: { role: m.role, depuis: num(m.depuis) } };",
  "    const e = espaceBrut(id); if (!e) return null;\n    return { espace: espaceRang(e), moi: { role: m ? m.role : 'membre', depuis: m ? num(m.depuis) : 0 } };", ['960', '961', '905']);
m('R50', 'la liste des canaux d\'un espace montre les canaux privés dont on n\'est pas membre', F.stock,
  'WHERE k.espace = ? AND EXISTS (SELECT 1 FROM membre m WHERE m.conv = k.conv AND m.uid = ? AND m.quitte_le IS NULL) ORDER BY k.cree, k.conv`).all(espace, uid)', 'WHERE k.espace = ? AND ? IS NOT NULL ORDER BY k.cree, k.conv`).all(espace, uid)', ['960', '961']);
m('R51', 'un canal privé accepte des membres qui ne sont pas de l\'espace', F.stock, "      if (qui.some(u => !roles.has(u))) throw erreur('membre_inconnu');\n", '', ['960', '961']);
m('R52', 'un canal public n\'a pour membres que son créateur (et non tous ceux de l\'espace)', F.stock, ': Array.from(roles.keys());', ': [par];', ['960', '961']);
m('R53', 'un simple membre crée un canal (le stockage ne vérifie plus le rôle ; la garde EA de la route, elle, tient — test-960 joue le stockage SEUL)', F.stock, "      if (!moi || moi.role !== 'admin') throw erreur('interdit');\n", '', ['960', '961']);
m('R54', 'un espace peut avoir plus de cent canaux', F.stock, "      if (num(Q('SELECT COUNT(*) AS n FROM canal WHERE espace = ?').get(espace).n) >= CANAUX_MAX) throw erreur('trop_de_canaux');\n", '', ['960', '961']);
m('R55', 'on se retire soi-même d\'un canal privé par la route des membres', F.resp,
  /if \(u === req\.moi\.id\) return refus\(res, 400, 'champ_invalide'\);(\s+\/\/ on quitte un canal)/, '$1', ['961']);

/* ── ce que les autres APPRENNENT en direct, ce que seul l'administrateur lit, les plafonds par personne ── */
m('R56', 'retirer un membre ne prévient plus personne en direct (ni lui, ni les autres : les écrans ne se relisent qu\'à la prochaine ouverture)', F.resp, '    prevenir(stockage.espaceUids(id).concat([u]), id);\n', '', ['964']);
m('R57', 'quelqu\'un qui rejoint l\'espace ne prévient plus les autres en direct', F.resp, '      prevenir(stockage.espaceUids(cible), cible);\n', '', ['964']);
m('R58', 'quelqu\'un qui rejoint l\'espace ne prévient plus celui qui a créé le lien (la notification dans l\'application)', F.resp, /      notifier\(r\.par, [^\n]*\n/, '', ['961']);
m('R59', 'créer un canal n\'est plus plafonné par heure', F.resp, "    if (!plafond(res, 'canal', req.moi.id, { max: 30, fenetreMs: 3600000 })) return;\n", '', ['961']);
m('R60', 'créer un lien d\'invitation n\'est plus plafonné par heure', F.resp, "    if (!plafond(res, 'lien', req.moi.id, { max: 20, fenetreMs: 3600000 })) return;\n", '', ['961']);
m('R61', 'l\'administrateur ne lit plus la liste COMPLÈTE de son entreprise (il ne voit plus les membres avec qui un blocage existe)', F.resp, "{ tous: req.espace.moi.role === 'admin' }", '{ tous: false }', ['961']);
m('R62', 'un simple membre reçoit le bloc « administrateur » de l\'espace (la formule, le motif, les places, les invitations)', F.resp, '    if (admin) {\n      const places = formule.placesDe(id);', '    if (true) {\n      const places = formule.placesDe(id);', ['961', '905']);

/* ── supprimer son compte, quitter tout ── */
m('E01', 'supprimer son compte est permis quand on est seul dans un espace dont l\'abonnement court (Stripe prélèverait pour un espace dissous)', F.compte,
  /    if \(seuls\.length\) \{\n      const court[^\n]*\n      return refus\(res, 409, court \? 'espace_abonne' : 'paiement_en_cours'\);\n    \}\n/, '', ['961']);
m('E02', 'un compte effacé ne sort pas de ses espaces (la propriété ne passe pas, les canaux le gardent)', F.stock, 'const sortis = espaceQuitterTout(uid);', 'const sortis = { pieces: [], convs: [] };', ['960', '961']);
m('E03', 'un propriétaire qui s\'efface ne passe pas la main : l\'espace reste à un compte effacé', F.stock, "        Q('UPDATE espace SET proprio = ? WHERE id = ?').run(suivant.uid, e.id);\n", '', ['960']);
m('E04', '« seul dans un espace abonné » ne reconnaît jamais personne (la borne de membres est à zéro)', F.stock, 'AND (SELECT COUNT(*) FROM espace_membre x WHERE x.espace = e.id) <= 1`', 'AND (SELECT COUNT(*) FROM espace_membre x WHERE x.espace = e.id) <= 0`', ['961']);

/* ══ 4. LA SAUVEGARDE — les quatre genres de purge neufs et les trois listes de tables écrites à la main (stockage.js) ══════════════════════════════════ */
m('U01', 'la restauration retire un membre arrivé APRÈS son retrait (la date `depuis` n\'est plus comparée)', F.stock,
  "d.prepare('DELETE FROM espace_membre WHERE espace = ? AND uid = ? AND depuis <= ?')", "d.prepare('DELETE FROM espace_membre WHERE espace = ? AND uid = ? AND ? IS NOT NULL')", ['960']);
m('U02', 'la restauration ne fait pas sortir le membre retiré de ses canaux', F.stock, '            sortirCanaux.run(q, uid, q, esp);\n', '', ['960']);
m('U03', 'la restauration ne révoque pas un lien d\'invitation révoqué depuis l\'archive', F.stock, '          bilan.invitationsRevoquees += Number(revoquerLien.run(r.objet).changes);', '', ['960']);
m('U04', 'la restauration ramène un membre retiré d\'un canal privé', F.stock,
  "          if (conv && uid) bilan.membresCanalRetires += Number(sortirCanal.run(Number(r.quand) || 0, conv, uid, Number(r.quand) || 0).changes);", '', ['960']);
m('U05', 'la restauration ne retire pas les canaux d\'un espace dissous (le genre `espace`)', F.stock, '          if (retirerCanauxDEspace) retirerCanauxDEspace.run(r.objet);\n', '', ['960'],
  EQ('`espaceSupprimer` efface chaque canal par `convSupprimer`, qui note CHACUN comme une conversation effacée : le rejeu du genre `conversation` retire déjà ses messages (le défaut réel retirerait les deux)'));
m('U06', 'le genre `invitation` n\'est plus déclaré dans le registre des genres de purge (un effacement que personne ne rejoue)', F.stock,
  /  invitation: 'copie',[^\n]*\n/, '', ['950', '960']);
m('T01', 'la table `abonnement` sort de la liste des tables comptées (`TABLES_COMPTEES`)', F.stock, ", 'canal', 'abonnement'];", ", 'canal'];", ['960', '950']);
m('T02', 'la copie ne compte plus la table `abonnement` (`lignesDe`)', F.stock, "    abonnement: n(() => d.prepare('SELECT COUNT(*) AS n FROM abonnement')),\n", '', ['960', '950']);
m('T03', 'la sonde de la base vivante ne regarde plus la table `abonnement` (`sonde().nonVides`)', F.stock, "        abonnement: non(() => Q('SELECT 1 FROM abonnement LIMIT 1')),\n", '', ['960', '950']);

/* ══ 5. MESSAGES PRO — LA FACTURATION STRIPE (facturation.js, jouée contre un faux Stripe) ═════════════════════════════════════════════════════════════ */
m('B01', 'un rythme que la liste blanche ne connaît pas est accepté (le corps choisit le tarif)', F.fact, /    if \(typeof rythme !== 'string' \|\| !Object\.hasOwn\(cfg\.prix, rythme\)\) throw erreur\('offre_inconnue'\);[^\n]*\n/, '', ['962']);
m('B02', 'on paie moins de places que de membres', F.fact, 'places < min || places > PLACES_MAX', 'places < 1 || places > PLACES_MAX', ['962']);
m('B03', 'on paie plus de 500 places', F.fact, 'places < min || places > PLACES_MAX', 'places < min', ['962']);
m('B04', 'un nombre de places qui n\'est pas entier (1,5) est transmis à Stripe', F.fact, 'if (!Number.isInteger(places) || places < min', 'if (places < min', ['962']);
m('B05', 'la production paie sans adresse confirmée (la facture ne va à personne)', F.fact, "    if (!adresse && cfg.mode === 'live') throw erreur('adresse_requise');\n", '', ['962']);
m('B06', 'un second abonnement s\'ouvre pour un espace qui en a déjà un (deux prélèvements)', F.fact,
  "      if (existe(a)) {\n        try { await relireImpl(espace); } catch (e) { /* Stripe muet", "      if (false) {\n        try { await relireImpl(espace); } catch (e) { /* Stripe muet", ['962']);
m('B07', 'un abonnement en attente de paiement ou en pause n\'empêche plus d\'en ouvrir un second', F.fact,
  'const existe = (x) => !!(x && x.abonnement && !STATUTS_FINAUX.includes(x.statut));', 'const existe = (x) => !!(x && x.abonnement && STATUTS_PAYES.includes(x.statut));', ['962']);
m('B08', 'une session de paiement encore ouverte n\'est plus réutilisée : un clic de plus ouvre une nouvelle session', F.fact,
  "if (cs && cs.status === 'open' && url(cs.url) && cs.client_reference_id === 'opmsg:' + espace) return { url: cs.url, reprise: true };", '', ['962']);
m('B09', 'la session de paiement ne porte plus `client_reference_id` : rien ne dit pour quel espace elle est', F.fact, "      ['client_reference_id', 'opmsg:' + espace],\n", '', ['962']);
m('B10', 'l\'abonnement ne porte plus ses métadonnées (`produit`, `opmsg_espace`) : la relecture ne le reconnaît plus', F.fact,
  "      ['subscription_data[metadata][produit]', 'opmsg'], ['subscription_data[metadata][opmsg_espace]', espace],\n", '', ['962']);
m('B11', 'l\'abonnement porte la métadonnée `espace` (celle qu\'OP GESTION lit pour rattacher un abonnement à une entreprise)', F.fact,
  "      ['subscription_data[metadata][produit]', 'opmsg'], ['subscription_data[metadata][opmsg_espace]', espace],\n", "      ['subscription_data[metadata][produit]', 'opmsg'], ['subscription_data[metadata][opmsg_espace]', espace], ['subscription_data[metadata][espace]', espace],\n", ['962', '965']);
m('B12', 'la session de paiement porte la métadonnée `espace` d\'OP GESTION', F.fact, "      ['metadata[produit]', 'opmsg'], ['metadata[opmsg_espace]', espace],\n", "      ['metadata[produit]', 'opmsg'], ['metadata[opmsg_espace]', espace], ['metadata[espace]', espace],\n", ['962', '965']);
m('B13', 'un abonnement qui désigne UN AUTRE espace est lu comme le nôtre (la métadonnée n\'est plus comparée)', F.fact, "sb.metadata.opmsg_espace !== espace || sb.metadata.produit !== 'opmsg'", "sb.metadata.produit !== 'opmsg'", ['962']);
m('B14', 'un abonnement qui n\'est pas marqué « opmsg » est lu comme le nôtre', F.fact, "sb.metadata.opmsg_espace !== espace || sb.metadata.produit !== 'opmsg'", 'sb.metadata.opmsg_espace !== espace', ['962']);
m('B15', 'un abonnement dont AUCUNE ligne n\'est de notre liste blanche de tarifs est lu comme le nôtre', F.fact, '    if (!nos.length) return null;\n', '', ['962']);
m('B16', 'les places sont la somme de TOUTES les lignes de l\'abonnement, pas seulement des nôtres', F.fact, 'const places = nos.reduce(', 'const places = lignes.reduce(', ['962']);
m('B17', 'une session « complete » qui n\'est pas en mode abonnement est adoptée', F.fact, "if (cs.mode !== 'subscription' || cs.client_reference_id !== 'opmsg:' + espace || !ID_ABO.test(sid))", "if (cs.client_reference_id !== 'opmsg:' + espace || !ID_ABO.test(sid))", ['962']);
m('B18', 'une session qui cite un AUTRE espace est adoptée (la référence de la session n\'est plus comparée)', F.fact, "if (cs.mode !== 'subscription' || cs.client_reference_id !== 'opmsg:' + espace || !ID_ABO.test(sid))", "if (cs.mode !== 'subscription' || !ID_ABO.test(sid))", ['962']);
m('B19', 'une panne de Stripe (réseau, 5xx, clé refusée) est lue comme une RÉSILIATION : l\'espace perd Pro', F.fact,
  "let sb; try { sb = await stripe('GET', '/v1/subscriptions/' + a.abonnement); } catch (e) { if (e.code === 'introuvable') sb = null; else throw e; }",
  "let sb; try { sb = await stripe('GET', '/v1/subscriptions/' + a.abonnement); } catch (e) { sb = null; }", ['962']);
m('B20', 'un clic sur « J\'ai réglé — vérifier » n\'est plus plafonné (Stripe appelé en boucle)', F.fact, "    if (!plafond(res, 'relire', req.espace.espace.id, { max: 1, fenetreMs: 10000 })) return;\n", '', ['962']);
m('B21', 'la demande de paiement n\'est plus plafonnée par heure', F.fact, "    if (!plafond(res, 'paiement', req.moi.id, { max: 20, fenetreMs: 3600000 })) return;\n", '', ['962']);
m('B22', 'l\'ouverture du portail n\'est plus plafonnée par heure', F.fact, "    if (!plafond(res, 'portail', req.moi.id, { max: 30, fenetreMs: 3600000 })) return;\n", '', ['962']);
m('B23', 'le portail s\'ouvre sans client Stripe (aucun paiement n\'a eu lieu)', F.fact, "    if (!a || !a.client || !ID_CLIENT.test(a.client)) throw erreur('pas_d_abonnement');\n", '', ['962']);
m('B24', 'une adresse de paiement que Stripe donne n\'a plus à être en http(s) (`javascript:` passe)', F.fact, "/^https?:\\/\\/[^\\s]{4,2000}$/.test(x) ? x : null;", "/^[^\\s]{4,2000}$/.test(x) ? x : null;", ['962']);
m('B25', 'l\'écran annonce 0 € par place', F.fact, 'euros_par_place: cfg.affichage[k]', 'euros_par_place: 0', ['962', '964']);
m('B26', 'l\'état ne dit plus que Stripe est muet', F.fact, 'stripe_muet: echecDepuis !== null,', 'stripe_muet: false,', ['962']);
m('B27', '« les minutes d\'illisibilité de Stripe » valent toujours zéro (`/health.stripeEchecMin` ne bouge jamais)', F.fact,
  'const echecMin = () => echecDepuis === null ? 0 : Math.max(0, Math.floor((horloge() - echecDepuis) / 60000));', 'const echecMin = () => 0;', ['962']);
m('B28', 'sans clé, l\'abonnement se dit ouvert', F.fact, "if (!actif()) return { ouvert: false, motif: 'abonnement_pas_ouvert',", "if (!actif()) return { ouvert: true, motif: 'abonnement_pas_ouvert',", ['962', '964']);
m('B29', 'un échec de Stripe est journalisé AVEC la clé (le champ passé à `journaliser`)', F.fact, "journaliser('stripe_echec', { motif }); };", "journaliser('stripe_echec', { motif, cle: cfg.cle }); };", ['962'],
  EQ('`journaliser` ne retient que les champs d\'une LISTE BLANCHE (`CHAMPS_JOURNAL`) : un champ `cle` est jeté avant d\'être écrit — le défaut réel ajoute `cle` à la liste ET le passe (B29b)'));
m2('B29b', 'un échec de Stripe est journalisé AVEC la clé (le champ passé ET admis par la liste blanche du journal)',
  [[F.fact, "journaliser('stripe_echec', { motif }); };", "journaliser('stripe_echec', { motif, cle: cfg.cle }); };"], [F.index, "'etat', 'n', 'motif', 'route', 'pays']);", "'etat', 'n', 'motif', 'route', 'pays', 'cle']);"]], ['962']);
m('B30', '/health porte la clé Stripe', F.index, 'facturation: Object.assign({ mode: facturation.mode(), toutOuvert: formule.toutOuvert() }, stockage.facturationStats()),',
  'facturation: Object.assign({ mode: facturation.mode(), toutOuvert: formule.toutOuvert(), cle: config.facturation.cle }, stockage.facturationStats()),', ['962', '934']);
m('B31', '/health ne publie plus les minutes d\'illisibilité de Stripe', F.index, 'stripeEchecMin: facturation.echecMin(),', 'stripeEchecMin: 0,', ['962']);
m('B32', 'la surveillance ne crie plus quand Stripe est illisible', F.surv, "if (typeof j.stripeEchecMin === 'number' && j.stripeEchecMin > SEUIL_STRIPE_MIN) {", 'if (false) {', ['934']);
m('B33', 'la surveillance crie à 90 minutes pile (elle ne crie qu\'AU-DELÀ)', F.surv, 'j.stripeEchecMin > SEUIL_STRIPE_MIN', 'j.stripeEchecMin >= SEUIL_STRIPE_MIN', ['934']);
m('B34', 'un espace qui a EXACTEMENT autant de membres que de places est dit « en dépassement » (la frontière est une inégalité large)', F.fact, 'places_depassees: Number.isFinite(places) && vivant && n > places,', 'places_depassees: Number.isFinite(places) && vivant && n >= places,', ['962']);

/* ══ 6. LA CONFIGURATION ET L'OUTIL DE POSE DE LA CLÉ (config.js, configurer-stripe.js) ═══════════════════════════════════════════════════════════════════ */
m('K01', 'la production accepte le drapeau de la bêta (tout y serait Pro, sans paiement)', F.conf,
  "  if (toutOuvert && instance !== 'beta') throw err('formule.toutOuvert est refusé en production (tout y serait Pro, sans paiement)');\n", '', ['960']);
m('K02', 'une clé secrète complète (sk_…) est acceptée comme clé de Stripe', F.conf, "new RegExp('^rk_(test|live)_[A-Za-z0-9]{8,200}$')", "new RegExp('^(rk|sk)_(test|live)_[A-Za-z0-9]{8,200}$')", ['963', '960']);
m('K03', 'la bêta accepte une clé de production', F.conf, "    if (instance === 'beta' && !/^rk_test_/.test(brut.cle)) throw err(", "    if (false) throw err(", ['960', '963']);
m('K04', 'la porte de test de Stripe est ouverte en production (une variable oubliée ferait un client HTTP local)', F.conf,
  "  if (porte && instance !== 'beta') throw err('OPMSG_TEST_STRIPE (porte de test de Stripe) est refusée en production');\n", '', ['960', '963']);
m('K05', 'une clé sans aucun tarif est acceptée (le service démarrerait en vendant rien)', F.conf, "    if (!Object.keys(o.prix).length) throw err('facturation.cle sans facturation.prix : aucun tarif à vendre (au moins « mensuel » ou « annuel »)');\n", '', ['960', '963']);
m('K06', 'l\'outil écrit la configuration SANS avoir éprouvé la clé ni les tarifs', F.cfgstripe,
  "  const n = await eprouver({ hote: hoteDe(valide), cle: valide.cle, mode: valide.mode, prix: valide.prix, affichage: valide.affichage });\n  fermer();\n\n  ecrire(config, bloc, { instance });",
  "  const n = 0;\n  fermer();\n\n  ecrire(config, bloc, { instance });", ['963']);
m('K07', 'une clé qui ne lit pas les abonnements n\'arrête plus l\'outil', F.cfgstripe, "  if (ab.statut !== 200) echec('LA CLÉ NE LIT PAS LES ABONNEMENTS — ' + diagnostic(ab.statut, 'Subscriptions — lecture'));\n", '', ['963']);
m('K08', 'un tarif mensuel qui se renouvelle chaque année est accepté', F.cfgstripe, "!t.recurring || t.recurring.interval !== attendu || (t.recurring.interval_count || 1) !== 1", "!t.recurring", ['963']);
m('K09', 'un tarif archivé chez Stripe est accepté', F.cfgstripe, "    if (t.active === false) echec(", "    if (false) echec(", ['963']);
m('K10', 'un tarif d\'un AUTRE mode que la clé (production contre test) est accepté', F.cfgstripe, "    if (t.livemode !== undefined && (t.livemode ? 'live' : 'test') !== mode) echec(", "    if (false) echec(", ['963']);
m('K11', 'l\'outil AFFICHE la clé (« ✓ la clé … répond »)', F.cfgstripe, "console.log('✓ la clé répond, en mode ' + mode + ' et lit les abonnements.');", "console.log('✓ la clé ' + cle + ' répond, en mode ' + mode + ' et lit les abonnements.');", ['963']);
m('K12', 'l\'outil n\'avertit plus qu\'un produit sans « messages » dans son nom est lu par OP GESTION comme un paiement à lui', F.cfgstripe,
  "    if (nomProduit !== null && !/messages/i.test(nomProduit)) avertissements.push(", "    if (false) avertissements.push(", ['963']);
m('K13', 'remplacer une facturation existante ne demande plus « oui »', F.cfgstripe, "    if (rep !== 'oui') echec('Pas de « oui » : abandon.');\n", '', ['963']);
m('K14', 'un fichier d\'une instance et un environnement d\'une autre ne se contredisent plus (la clé de production peut aller dans le fichier de la bêta)', F.cfgstripe,
  "  if (config.instance && process.env.OPMSG_INSTANCE && config.instance !== process.env.OPMSG_INSTANCE) echec(", "  if (false) echec(", ['963']);
m('K15', 'le montant annoncé à l\'écran n\'est plus comparé à celui de Stripe', F.cfgstripe, "    if (euros !== null && Math.abs(euros - affichage[rythme]) > 0.001) avertissements.push(", "    if (false) avertissements.push(", ['963']);
m('K16', 'le fichier temporaire est créé avec le mode par défaut (le `chmod` qui suit le corrige : la clé est lisible un instant)', F.cfgstripe, "{ mode: 0o600, flag: 'wx' }", "{ flag: 'wx' }", ['963']);
m('K17', 'l\'outil accepte une option qu\'il ne connaît pas (« --verifier » est la seule)', F.cfgstripe, "  for (const a of ARGS) if (a !== '--verifier') echec('option inconnue (« --verifier » est la seule).');\n", '', ['963']);
m('K18', 'un identifiant de tarif qui n\'a pas la forme d\'un tarif de Stripe (price_…) est accepté dans la configuration', F.conf,
  "      if (typeof v !== 'string' || !RE_PRIX_STRIPE.test(v)) throw err('facturation.prix.' + k + ' doit être un identifiant de tarif Stripe (price_…)');\n", '', ['960', '963']);

/* ══ 7. LA COUTURE AVEC OP GESTION — dans la COPIE du serveur d'OP GESTION, jamais dans l'arbre (test-965 lance le vrai `server/index.js`) ═══════════════ */
m('O01', 'OP GESTION ne classe plus AUCUNE ligne « OP MESSAGES » : un abonnement de Messages Pro est lu comme un paiement d\'OP GESTION', F.og,
  "const ligneMessages = it => STRIPE_PRIX_MESSAGES.includes(prixDeLigne(it)) || /messages/i.test(String((it && it.price && it.price.product && it.price.product.name) || ''));",
  'const ligneMessages = it => false;', ['965']);
m('O02', 'OP GESTION ne reconnaît plus un tarif de la liste de Messages (seul le nom du produit classe)', F.og, 'const ligneMessages = it => STRIPE_PRIX_MESSAGES.includes(prixDeLigne(it)) || /messages/i', 'const ligneMessages = it => /messages/i', ['965']);
m('O03', 'OP GESTION ne lit plus le NOM du produit (seul le tarif connu classe)', F.og, "|| /messages/i.test(String((it && it.price && it.price.product && it.price.product.name) || ''));", ';', ['965']);

/* ══ 8. LE MODULE DE LA PAGE (source-serveur.js, api.js) — jouées par test-964 ═══════════════════════════════════════════════════════════════════════════ */
m('C01', 'la page accepte une adresse de paiement en http', F.src, 'const ADRESSE_HTTPS = /^https:\\/\\/', 'const ADRESSE_HTTPS = /^https?:\\/\\/', ['964']);
m('C02', 'la page ne contrôle plus l\'adresse de paiement que le service lui donne (`javascript:` passe)', F.src, "!r || typeof r.url !== 'string' || !ADRESSE_HTTPS.test(r.url)", "!r || typeof r.url !== 'string'", ['964']);
m('C03', 'dissoudre un espace n\'envoie plus la confirmation', F.api, "supprimerEspace: (id) => appel('POST', '/api/espaces/' + e(id) + '/supprimer', { confirmation: 'SUPPRIMER' }),", "supprimerEspace: (id) => appel('POST', '/api/espaces/' + e(id) + '/supprimer', {}),", ['964']);
m('C04', 'supprimer un canal n\'envoie plus la confirmation', F.api,
  "supprimerCanal: (id, cid) => appel('POST', '/api/espaces/' + e(id) + '/canaux/' + e(cid) + '/supprimer', { confirmation: 'SUPPRIMER' }),", "supprimerCanal: (id, cid) => appel('POST', '/api/espaces/' + e(id) + '/canaux/' + e(cid) + '/supprimer', {}),", ['964']);
m('C05', 'une conversation ouverte qui disparaît de la liste (canal supprimé, espace dissous) ne dit plus `retire` à la page', F.src,
  "for (const id of parties) { convs.delete(id); emettre({ type: 'retire', id }); }", 'for (const id of parties) { convs.delete(id); }', ['964']);
m('C06', 'le module offre une recherche de personnes par nom (« Contacts de l\'entreprise » devient un annuaire)', F.src,
  '      espaces, espace, espaceCreer, espaceRenommer,', '      espaces, espace, espaceChercher: (q) => Promise.resolve([]), espaceCreer, espaceRenommer,', ['964']);

/* ══ 9. LA PAGE (jouée par la sonde navigateur : lancer avec --sondes) ═════════════════════════════════════════════════════════════════════════════════ */
m('P01', 'le lien d\'invitation qu\'on vient de créer est effacé par le redessin qui suit (il ne fait plus partie de ce que la feuille montre)', F.page,
  "<div id=\"esp-lien\">' + htmlLienInvitation(lien) + '</div>'", "<div id=\"esp-lien\"></div>'", ['sonde'], SONDE);
m('P02', 'un lien ouvert PENDANT QUE la feuille « Entreprise » est déjà ouverte est posé après le retour (le rendu de la feuille rouverte a déjà commencé : le lien est perdu)', F.page,
  "    etat.codeInvitation = c;\n    window.addEventListener('popstate', () => {\n      if (etat.codeInvitation !== c) return;\n", "    window.addEventListener('popstate', () => {\n      etat.codeInvitation = c;\n", ['sonde'], SONDE);
m('P03', 'retirer un membre se fait en UNE touche', F.page, "if (act === 'esp-retirer') { if (!armer(b, 'Toucher encore pour retirer')) return; const r = await", "if (act === 'esp-retirer') { const r = await", ['sonde'], SONDE);
m('P04', 'passer la propriété se fait en UNE touche', F.page, "if (act === 'esp-transferer') { if (!armer(b, 'Toucher encore pour passer la propriété')) return; await", "if (act === 'esp-transferer') { await", ['sonde'], SONDE);
m('P05', 'quitter l\'espace se fait en UNE touche', F.page, "if (act === 'esp-quitter') { if (!armer(b, 'Toucher encore pour quitter l\\'espace')) return; await", "if (act === 'esp-quitter') { await", ['sonde'], SONDE);
m('P06', 'le total du paiement ne suit plus la frappe', F.page, "aboEtat.places = parseInt(e.target.value, 10) || 0; majTotalAbo(); }", "aboEtat.places = parseInt(e.target.value, 10) || 0; }", ['sonde'], SONDE);
m('P07', 'moins de places que de membres n\'est plus refusé sur place (la demande part chez Stripe)', F.page, '!(v >= min && v <= max)', '!(v <= max)', ['sonde'], SONDE);
m('P08', 'le retour de Stripe croit l\'adresse au lieu de relire chez Stripe : « Abonnement confirmé » sans que Stripe l\'ait dit', F.page,
  "else if (retour) await relireAbonnement(id, retour.motif === 'retour');", "else if (retour) esp.abo.note = 'Merci ! Abonnement confirmé par Stripe : l\\'espace est en Messages Pro.';", ['sonde'], SONDE);
m('P09', 'un simple membre lit POURQUOI les fonctions Pro sont indisponibles (abonnement en retard)', F.page,
  "ne sont pas disponibles pour l\\'instant. Rien n\\'est perdu", "ne sont pas disponibles : l\\'abonnement de l\\'espace est en retard. Rien n\\'est perdu", ['sonde'], SONDE);
m('P10', 'l\'écran propose de retirer ou de rétrograder le propriétaire (la clause « pas le propriétaire » seule est retirée)', F.page, 'const agit = d.moiAdmin && !p.moi && !p.proprio && (p.role', 'const agit = d.moiAdmin && !p.moi && (p.role', ['sonde'],
  Object.assign({}, SONDE, EQ('il n\'y a qu\'un propriétaire, et il est administrateur : pour un administrateur qui n\'est pas propriétaire, sa ligne est déjà écartée par `(p.role !== \'admin\' || d.proprio)` ; pour le propriétaire, sa propre ligne l\'est par `!p.moi` — le défaut réel retire les deux règles (P10b)')));
m('P10b', 'l\'écran propose à tout administrateur de retirer ou de rétrograder n\'importe qui, un autre administrateur et le propriétaire compris', F.page,
  'const agit = d.moiAdmin && !p.moi && !p.proprio && (p.role !== \'admin\' || d.proprio), act = [];', 'const agit = d.moiAdmin && !p.moi, act = [];', ['sonde'], SONDE);
m('P11', 'l\'écran propose de passer la propriété à un administrateur qui n\'est pas propriétaire', F.page, "if (d.proprio && !p.moi) act.push(", 'if (!p.moi) act.push(', ['sonde'], SONDE);
m('P12', 'l\'aperçu d\'un lien ACCEPTE l\'invitation (voir qui invite fait entrer dans l\'espace)', F.page,
  'const a = await source.invitationLire(m[1]);\n', 'const a = await source.invitationLire(m[1]); await source.invitationAccepter(m[1]);\n', ['sonde'], SONDE);
m('P13', 'le champ « Filtrer la liste » cherche chez le service (un annuaire public par la fenêtre)', F.page, 'function appliquerFiltreEspace() {\n',
  "function appliquerFiltreEspace() {\n    try { const q0 = (($('esp-filtre') || {}).value || '').trim(); if (q0) fetch('/api/recherche?q=' + encodeURIComponent(q0)).catch(() => {}); } catch (e) { /* rien */ }\n", ['sonde'], SONDE);

/* ══ 10. LES CORRECTIONS DE LA RELECTURE DU GARDIEN (3 octobre 2026) — chacune a son banc, et chaque défaut remis doit le faire tomber ═══════════════════════ */
m('H01', 'retirer quelqu\'un ne révoque plus les liens de l\'espace (le retiré ré-accepte l\'ancien lien et retrouve l\'espace)', F.stock, '      r.liens = revoquerLiens ? invitationsRevoquer(espace) : 0;', '      r.liens = 0;', ['960', '961']);
m('H02', 'la route « retirer » ne demande plus la révocation des liens (le stockage sait la faire, personne ne la lui demande)', F.resp, 'stockage.espaceMembreRetirer({ espace: id, uid: u, revoquerLiens: true })', 'stockage.espaceMembreRetirer({ espace: id, uid: u })', ['961']);
m('H03', 'QUITTER révoque aussi les liens de l\'espace (un départ volontaire chasse tout le monde de la porte)', F.resp, 'const r = stockage.espaceMembreRetirer({ espace: id, uid });', 'const r = stockage.espaceMembreRetirer({ espace: id, uid, revoquerLiens: true });', ['961']);
m('H04', 'tout départ du stockage révoque les liens par défaut (le paramètre `revoquerLiens` vaut vrai)', F.stock, 'function espaceMembreRetirer({ espace, uid, revoquerLiens = false })', 'function espaceMembreRetirer({ espace, uid, revoquerLiens = true })', ['960', '961']);
m('H05', 'la réponse du retrait ne dit plus combien de liens ont été révoqués (la page ne peut plus prévenir l\'administrateur)', F.resp, 'res.json({ ok: true, liens_revoques: r.liens });', 'res.json({ ok: true });', ['961']);
m('H06', 'le propriétaire peut être retiré d\'un canal privé (même par lui-même : il y a `canalQuitter` pour cela)', F.stock, "      if (e && e.proprio === uid) throw erreur('interdit');\n", '', ['960']);
m('H07', 'un administrateur qui n\'est pas propriétaire retire un AUTRE administrateur d\'un canal privé (la hiérarchie de l\'espace ne vaut plus dans ses canaux)', F.stock,
  "      if (cible && cible.role === 'admin' && (!e || e.proprio !== par)) throw erreur('interdit');\n", '', ['960', '961', '905']);
m('H08', 'le propriétaire lui-même ne retire plus un administrateur d\'un canal privé (la règle protège les administrateurs au point de fermer la route)', F.stock,
  "if (cible && cible.role === 'admin' && (!e || e.proprio !== par)) throw erreur('interdit');", "if (cible && cible.role === 'admin') throw erreur('interdit');", ['960', '961', '905']);

/* ── I2 : un paiement réglé chez Stripe finit TOUJOURS reconnu ── */
m('H09', 'une session de plus de 24 h est oubliée AVANT d\'être lue (l\'âge est comparé d\'abord : un paiement réglé pendant une panne n\'est jamais reconnu)', F.fact,
  '      if (!ID_SESSION.test(sid0)) oublier();', '      if (!ID_SESSION.test(sid0) || (a.session_le !== null && horloge() - a.session_le > 24 * 3600000)) oublier();', ['962']);
m('H10', '« paiement en attente » s\'éteint au bout de 24 h, session non résolue ou pas', F.fact,
  'paiement_en_attente: !!(a && a.session),', 'paiement_en_attente: !!(a && a.session && a.session_le !== null && horloge() - a.session_le <= 24 * 3600000),', ['962']);
m('H11', 'payer de nouveau ne relit pas une session de plus de 24 h (elle est remplacée sans être lue : si elle était payée, un second abonnement naît)', F.fact,
  '      if (a && a.session) {\n        if (ID_SESSION.test(a.session)) {', '      if (a && a.session && a.session_le !== null && horloge() - a.session_le <= 24 * 3600000) {\n        if (ID_SESSION.test(a.session)) {', ['962']);
m('H12', 'les opérations d\'un même espace ne se font plus l\'une après l\'autre (trois « payer » simultanés ouvrent trois sessions)', F.fact,
  '    const p = avant.then(f);', '    const p = Promise.resolve().then(f);', ['962']);
m('H13', 'dissoudre ne relit pas la session rangée avant de décider (un paiement réglé et non relu laisse dissoudre — ou donne le mauvais refus)', F.fact,
  '      if (a && a.session && actif()) {', '      if (false && a && a.session && actif()) {', ['962']);
m('H14', 'dissoudre ignore une session non résolue (elle serait payable derrière un espace dissous)', F.fact,
  "      if (a && a.session) throw erreur('paiement_en_cours');\n", '', ['961', '962']);
m('H15', 'la route de dissolution n\'appelle plus la facturation (plus aucun contrôle de paiement, plus de verrou)', F.resp,
  'const r = await ctx.facturation.dissoudre(id, () => stockage.espaceSupprimer(id));', 'const r = stockage.espaceSupprimer(id);', ['961', '962']);
m('H16', '« seul dans un espace abonné » ne compte plus les paiements commencés (une session rangée)', F.stock,
  " OR a.session IS NOT NULL)", ")", ['960', '961']);
m('H17', 'supprimer son compte ne relit pas le paiement commencé avant de refuser', F.compte,
  /    if \(seuls\.length && ctx\.facturation && ctx\.facturation\.ouvert\(\)\) \{\n[\s\S]*?\n    \}\n    if \(seuls\.length\) \{/, '    if (seuls.length) {', ['962']);
m('H18', 'supprimer son compte dit toujours « abonnement en cours » (jamais « paiement en cours »)', F.compte,
  "court ? 'espace_abonne' : 'paiement_en_cours'", "'espace_abonne'", ['961', '962']);
m2('H19', 'la passe des dix minutes ne relit plus une session de plus de 24 h (elle n\'est jamais résolue)', [
  [F.stock, "OR session IS NOT NULL\n              ORDER BY", "OR (session IS NOT NULL AND session_le > ?)\n              ORDER BY"],
  [F.stock, ".all(Math.max(1, limite | 0)).map(r => r.espace);", ".all(horloge() - 24 * 3600000, Math.max(1, limite | 0)).map(r => r.espace);"]], ['960']);
m('H20', 'oublier une session efface celle qui est rangée maintenant, pas seulement celle qu\'on vient de relire', F.stock,
  "UPDATE abonnement SET session = NULL, session_le = NULL WHERE espace = ? AND session = ?').run(espace, session)", "UPDATE abonnement SET session = NULL, session_le = NULL WHERE espace = ?').run(espace)", ['960']);
/* ── R5 : le rythme n'est jamais un nom hérité ── */
m('H21', 'le rythme du paiement se cherche dans le prototype (« constructor », « __proto__ » partent chez Stripe)', F.fact,
  '!Object.hasOwn(cfg.prix, rythme)', '!cfg.prix[rythme]', ['962']);
/* ── R6 : un 404 ne résilie qu'une fois l'absence confirmée ── */
m('H22', 'un 404 sur un abonnement le dit « résilié » sans confirmation (la clé d\'un autre compte résilie tout, pour toujours)', F.fact,
  'if (await absenceConfirmee(a)) stockage.abonnementPoser(', 'if (true) stockage.abonnementPoser(', ['962']);
m('H23', 'l\'absence est « confirmée » sans lire la liste des abonnements du client (Stripe peut se contredire, ou avoir plus de cent abonnements)', F.fact,
  "    return !!l && Array.isArray(l.data) && l.has_more !== true && !l.data.some(x => x && x.id === a.abonnement);", "    return !!l;", ['962']);
m('H24', 'un client SUPPRIMÉ chez Stripe ne confirme plus l\'absence', F.fact,
  '    if (c.deleted === true) return true;\n', '', ['962']);
m('H25', 'un 404 compte comme une lecture réussie (une clé qui ne voit rien éteint l\'alarme au lieu de l\'allumer)', F.fact,
  "else if (code !== 'introuvable') noterSucces();", 'else noterSucces();', ['962']);
m('H26', 'une absence non confirmée ne se dit pas (Stripe n\'est pas compté illisible : l\'alarme ne monte jamais)', F.fact,
  "noterEchec('abonnement_introuvable'); journaliser", "journaliser", ['962']);

/* ══ LE LANCEUR ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const DOSSIERS_COPIE = ['server-msg', 'server', 'design/opmessages', '.github', 'apercu/opmessages', 'icons', 'scripts'];   // `.github` ENTIER : test-934 lit les workflows autant que les scripts de surveillance
function copier(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copier(s, d); else fs.copyFileSync(s, d);
  }
}
function fabriquerCopie() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mut-esp-'));
  for (const d of DOSSIERS_COPIE) copier(path.join(RACINE, d), path.join(dir, d));
  fs.mkdirSync(path.join(dir, 'tests'));
  for (const f of fs.readdirSync(path.join(RACINE, 'tests'))) if (/^(test-9\d\d|outils-[\w-]+|bac-messages|lib-horloge-msg|mode-site|sonde-opmessages-espaces)\.js$/.test(f)) fs.copyFileSync(path.join(RACINE, 'tests', f), path.join(dir, 'tests', f));
  fs.symlinkSync(path.join(RACINE, 'server-msg', 'node_modules'), path.join(dir, 'server-msg', 'node_modules'));
  fs.symlinkSync(path.join(RACINE, 'server', 'node_modules'), path.join(dir, 'server', 'node_modules'));
  return dir;
}
const nomBanc = (s) => s === 'sonde' ? 'la sonde' : 'test-' + s;
function lancer(dir, suite) {
  return new Promise((resolve) => {
    const sonde = suite === 'sonde';
    const f = sonde ? SONDE_FICHIER : fs.readdirSync(path.join(dir, 'tests')).find(x => x.startsWith('test-' + suite) && x.endsWith('.js'));
    /* ⛔ la sonde lance un VRAI Chromium, dont le dossier de profil porte une prise Unix (`SingletonSocket`, 107 octets de chemin au plus) : sous un TMPDIR long (le brouillon d'une session distante),
       « le navigateur ne démarre pas ». La sonde garde donc un TMPDIR COURT (`TMPDIR_SONDE`, par défaut /tmp), les copies, elles, restent où on les met. */
    const env = Object.assign({}, process.env, sonde ? { NODE_PATH: process.env.NODE_PATH || '/opt/node22/lib/node_modules/playwright/node_modules', TMPDIR: process.env.TMPDIR_SONDE || '/tmp' } : {});
    const p = spawn(process.execPath, [path.join(dir, 'tests', f)], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'], env });
    let sortie = ''; p.stdout.on('data', d => { sortie += d; }); p.stderr.on('data', d => { sortie += d; });
    const minuteur = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) { /* déjà mort */ } }, DELAI_MS);
    p.on('close', (code) => { clearTimeout(minuteur); const ko = (sortie.match(/(\d+) ✗/g) || []).pop(); resolve({ code, ko: ko ? parseInt(ko, 10) : null, sortie, suite }); });
  });
}
/* applique UNE modification à un texte : exactement une occurrence, et le texte doit changer */
function appliquer(src, a, b) {
  if (a instanceof RegExp) {
    const n = (src.match(new RegExp(a.source, a.flags.includes('g') ? a.flags : a.flags + 'g')) || []).length;
    if (n !== 1) return { erreur: n === 0 ? 'le motif ne se trouve pas' : 'le motif se trouve ' + n + ' fois' };
    const t = src.replace(a, b);
    return t === src ? { erreur: 'le texte n\'a pas changé' } : { texte: t };
  }
  const n = src.split(a).length - 1;
  if (n !== 1) return { erreur: n === 0 ? 'le motif ne se trouve pas' : 'le motif se trouve ' + n + ' fois' };
  const t = src.replace(a, () => b);
  return t === src ? { erreur: 'le texte n\'a pas changé' } : { texte: t };
}
/* le fichier muté se lit-il encore ? (une suite qui meurt sur une faute de syntaxe de la mutation a l'air de « tomber ») */
function syntaxe(chemin) {
  if (!/\.js$/.test(chemin)) return null;
  const r = spawnSync(process.execPath, ['--check', chemin], { encoding: 'utf8', timeout: 20000 });
  return r.status === 0 ? null : String(r.stderr || r.error || 'illisible').split('\n').filter(Boolean).slice(0, 3).join(' | ').slice(0, 220);
}
function muter(racine, mut) {
  const originaux = new Map();
  for (const [fichier, a, b] of mut.edits) {
    const chemin = path.join(racine, fichier);
    const base = originaux.has(fichier) ? fs.readFileSync(chemin, 'utf8') : fs.readFileSync(path.join(RACINE, fichier), 'utf8');
    if (!originaux.has(fichier)) originaux.set(fichier, base);
    const r = appliquer(base, a, b);
    if (r.erreur) return { erreur: r.erreur + ' (' + fichier + ')', originaux };
    fs.writeFileSync(chemin, r.texte);
  }
  for (const fichier of originaux.keys()) { const s = syntaxe(path.join(racine, fichier)); if (s) return { erreur: 'la mutation casse la syntaxe de ' + fichier + ' : ' + s, originaux }; }
  return { originaux };
}
function restaurer(dir, originaux) { for (const [fichier, texte] of originaux) fs.writeFileSync(path.join(dir, fichier), texte); }
const regenerer = (dir) => new Promise((ok) => { const p = spawn(process.execPath, [path.join(dir, 'scripts', 'opmsg-public.js')], { cwd: dir, stdio: 'ignore' }); p.on('close', ok); });

async function jouer(mut, dir) {
  const { id, nom, suites } = mut;
  const r0 = muter(dir, mut);
  if (r0.erreur) { restaurer(dir, r0.originaux); return { id, nom, verdict: 'MAL VISÉE', detail: r0.erreur, mut }; }
  try {
    /* une mutation de la page : la page servie se régénère depuis la page mutée (c'est elle que la sonde sert) */
    if (mut.edits.some(e => e[0] === F.page)) await regenerer(dir);
    const verts = [];
    for (const s of suites) {
      const r = await lancer(dir, s);
      /* ⛔ UN BANC QUI SE TAIT N'EST PAS UN BANC VERT : une promesse qui ne se résout jamais vide la boucle d'évènements et le processus sort en 0, SANS total. Pas de « N ✓ M ✗ » imprimé = le banc est MORT, il TOMBE. */
      if (r.code !== 0 || r.ko === null || r.ko > 0) {
        const ligne = (r.sortie.split('\n').find(l => l.includes('✗')) || r.sortie.split('\n').filter(Boolean).slice(-1)[0] || '').trim().slice(0, 170);
        const lignes = r.sortie.split('\n').filter(l => l.includes('✗')).map(l => l.trim()).slice(0, 14);
        return { id, nom, verdict: 'TOMBE', detail: nomBanc(s) + ' (' + (r.ko === null ? 'MORT, code ' + r.code + ', aucun total imprimé' : r.ko + ' ✗') + ') — ' + ligne, lignes: r.ko === null ? lignes.concat(r.sortie.split('\n').filter(Boolean).slice(-3)) : lignes, mut };
      }
      verts.push(s);
    }
    return { id, nom, verdict: 'SURVIT', detail: 'vert : ' + verts.map(nomBanc).join(', '), mut };
  } finally {
    restaurer(dir, r0.originaux);
    if (mut.edits.some(e => e[0] === F.page)) await regenerer(dir);
  }
}

(async () => {
  const args = process.argv.slice(2);
  const ids = args.filter(x => !x.startsWith('--'));
  const copiesDemandees = (args.find(x => x.startsWith('--copies=')) || '').slice(9);
  const NB_COPIES = /^\d+$/.test(copiesDemandees) ? Math.max(1, parseInt(copiesDemandees, 10)) : 2;
  const fichierDetails = (args.find(x => x.startsWith('--details=')) || '').slice(10) || null;   // le détail des ✗ de chaque mutation qui tombe : de quoi vérifier qu'elle tombe POUR LA BONNE RAISON
  if (args.includes('--liste')) {
    for (const x of MUTATIONS) console.log(x.id + (x.sonde ? ' [sonde]' : '') + (x.equivalente ? ' [≡]' : '') + ' · ' + x.suites.map(nomBanc).join('+') + ' · ' + x.nom);
    console.log('\n' + MUTATIONS.length + ' mutations (' + MUTATIONS.filter(x => x.equivalente).length + ' équivalentes, ' + MUTATIONS.filter(x => x.sonde).length + ' par la sonde)');
    process.exit(0);
  }
  if (args.includes('--verifier')) {
    let mal = 0;
    const vus = new Set();
    for (const mut of MUTATIONS) {
      if (vus.has(mut.id)) { mal++; console.log('  ✗ ' + mut.id + ' : identifiant en double'); }
      vus.add(mut.id);
      for (const s of mut.suites) {
        const ok = s === 'sonde' ? fs.existsSync(path.join(RACINE, 'tests', SONDE_FICHIER)) : fs.readdirSync(path.join(RACINE, 'tests')).some(x => x.startsWith('test-' + s) && x.endsWith('.js'));
        if (!BANCS.includes(s) || !ok) { mal++; console.log('  ✗ ' + mut.id + ' : le banc « ' + s + ' » n\'existe pas'); }
      }
      if (!!mut.sonde !== mut.suites.includes('sonde')) { mal++; console.log('  ✗ ' + mut.id + ' : ses bancs et son drapeau `sonde` ne disent pas la même chose'); }
      /* les motifs d'une mutation à plusieurs modifications du MÊME fichier se jugent l'un après l'autre sur le texte déjà modifié : on rejoue le chemin du lanceur sur un texte en mémoire */
      const textes = new Map();
      for (const [fichier, a, b] of mut.edits) {
        const base = textes.has(fichier) ? textes.get(fichier) : fs.readFileSync(path.join(RACINE, fichier), 'utf8');
        const r = appliquer(base, a, b);
        if (r.erreur) { mal++; console.log('  ✗ ' + mut.id + ' · ' + mut.nom + ' → MAL VISÉE · ' + r.erreur + ' (' + fichier + ')'); break; }
        textes.set(fichier, r.texte);
      }
    }
    /* la syntaxe de chaque mutation de fichier .js se contrôle dans une copie jetable, comme le lanceur le fait avant de jouer */
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mut-esp-verif-'));
    try {
      for (const mut of MUTATIONS) {
        const originaux = new Map();
        for (const [fichier] of mut.edits) if (!originaux.has(fichier)) { fs.mkdirSync(path.dirname(path.join(tmp, fichier)), { recursive: true }); fs.copyFileSync(path.join(RACINE, fichier), path.join(tmp, fichier)); originaux.set(fichier, true); }
        const r = muter(tmp, mut);
        if (r.erreur && !/ne se trouve pas|se trouve \d+ fois|n'a pas changé/.test(r.erreur)) { mal++; console.log('  ✗ ' + mut.id + ' · ' + r.erreur); }
        if (r.originaux) restaurer(tmp, r.originaux);
      }
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
    console.log('\n' + (MUTATIONS.length - mal) + '/' + MUTATIONS.length + ' mutations : motifs trouvés exactement une fois, fichiers lisibles, bancs présents');
    process.exit(mal ? 1 : 0);
  }
  /* --garder ID : fabrique UNE copie, y applique la mutation, l'IMPRIME et s'arrête — pour regarder à la main pourquoi une survivante survit (lancer le banc dans la copie, avec sa sortie entière) */
  if (args.includes('--garder')) {
    const mut = MUTATIONS.find(x => x.id === ids[0]);
    if (!mut) { console.log('mutation inconnue : ' + ids[0]); process.exit(2); }
    const dir = fabriquerCopie(), r = muter(dir, mut);
    if (r.erreur) { console.log('mal visée : ' + r.erreur); process.exit(2); }
    if (mut.edits.some(e => e[0] === F.page)) await regenerer(dir);
    console.log(dir); process.exit(0);
  }
  const sondes = args.includes('--sondes');
  const liste = ids.length ? MUTATIONS.filter(x => ids.includes(x.id)) : MUTATIONS.filter(x => !!x.sonde === sondes);
  if (!liste.length) { console.log('aucune mutation à jouer'); process.exit(2); }
  const avecSonde = liste.some(x => x.suites.includes('sonde'));
  /* les mutations jouées par la sonde ne se lancent pas en parallèle : deux navigateurs et deux services se volent le processeur, et la sonde mesure du temps */
  const copies = Array.from({ length: avecSonde ? 1 : Math.min(NB_COPIES, liste.length) }, fabriquerCopie);
  const nettoyer = () => { for (const d of copies) { try { fs.rmSync(d, { recursive: true, force: true }); } catch (e) { /* déjà parti */ } } };
  process.on('SIGINT', () => { nettoyer(); process.exit(130); });
  /* ⛔ LE TÉMOIN. Une suite qui MEURT dans la copie (un fichier que la copie n'emporte pas, un `require` qui échoue) a l'air de « tomber » à chaque mutation, sans rien prouver. Chaque banc visé
     tourne donc d'abord, UNE fois, sur une copie INTACTE : s'il n'y est pas vert, rien n'est joué et la sortie dit pourquoi. */
  if (!args.includes('--sans-temoin')) {
    const visees = Array.from(new Set(liste.flatMap(x => x.suites)));
    for (const sv of visees) {
      const r = await lancer(copies[0], sv);
      if (r.code !== 0 || r.ko === null || r.ko > 0) {
        console.log('⛔ le TÉMOIN de ' + nomBanc(sv) + ' n\'est pas vert sur une copie INTACTE (code ' + r.code + ') — aucune mutation n\'est jouée.\n' + r.sortie.split('\n').filter(Boolean).slice(-14).join('\n'));
        nettoyer(); process.exit(2);
      }
    }
    console.log('témoins verts sur une copie intacte : ' + visees.map(nomBanc).join(', ') + '\n');
  }
  if (args.includes('--temoins')) { nettoyer(); process.exit(0); }       // seulement les témoins : de quoi savoir, avant d'attendre une heure, que chaque banc visé tourne dans une copie
  const file = liste.slice(), resultats = [];
  await Promise.all(copies.map(async (dir) => {
    for (;;) {
      const mut = file.shift(); if (!mut) return;
      const r = await jouer(mut, dir);
      resultats.push(r);
      if (fichierDetails) { try { fs.appendFileSync(fichierDetails, r.id + ' · ' + r.verdict + ' · ' + r.detail + '\n' + (r.lignes || []).map(l => '      ' + l.slice(0, 230)).join('\n') + (r.lignes && r.lignes.length ? '\n' : '')); } catch (e) { /* le journal détaillé est facultatif */ } }
      const signe = r.verdict === 'MAL VISÉE' ? '  ✗ ' : mut.equivalente ? (r.verdict === 'SURVIT' ? '  ≡ ' : '  ✗ ') : (r.verdict === 'TOMBE' ? '  ✓ ' : '  ✗ ');
      console.log(signe + r.id + ' · ' + r.nom + ' → ' + (mut.equivalente && r.verdict === 'SURVIT' ? 'SURVIT comme prévu (' + mut.equivalente + ')' : mut.equivalente && r.verdict === 'TOMBE' ? 'TOMBE ALORS QU\'ELLE DEVRAIT SURVIVRE (la raison donnée est fausse : « ' + mut.equivalente + ' ») · ' + r.detail : r.verdict + ' · ' + r.detail));
    }
  }));
  nettoyer();
  const reelles = resultats.filter(r => !r.mut.equivalente), equivalentes = resultats.filter(r => r.mut.equivalente);
  const tombees = reelles.filter(r => r.verdict === 'TOMBE').length;
  const autres = reelles.filter(r => r.verdict !== 'TOMBE');
  const equivOk = equivalentes.filter(r => r.verdict === 'SURVIT').length;
  const equivMal = equivalentes.filter(r => r.verdict !== 'SURVIT');
  console.log('\n' + tombees + '/' + reelles.length + ' mutations tombent' + (autres.length ? ' — LES AUTRES : ' + autres.map(r => r.id + ' (' + r.verdict + ')').join(', ') : '')
    + (equivalentes.length ? ' · ' + equivOk + '/' + equivalentes.length + ' équivalentes survivent comme prévu' + (equivMal.length ? ' — ANOMALIES : ' + equivMal.map(r => r.id + ' (' + r.verdict + ')').join(', ') : '') : ''));
  process.exit(!autres.length && !equivMal.length ? 0 : 1);
})();

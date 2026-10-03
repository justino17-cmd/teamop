/* ══ LES MUTATIONS DU COMPTE PAR TÉLÉPHONE — « un banc qui passe ne prouve rien tant qu'on ne l'a pas vu ÉCHOUER » ═══════════════
   (CLAUDE.md). Ce fichier n'est PAS une suite (il ne s'appelle pas `test-*.js` : le compteur ne le lance pas). Il remet, UN PAR UN, les
   défauts que `tests/test-912` à `918` gardent — un budget retiré, un numéro fixe accepté, un code comparé en clair, un numéro dans le
   journal, une signature OVH fausse, une énumération sans plafond… — dans une COPIE de `server-msg/` (jamais dans l'arbre : le
   `git checkout` d'après-mutation de CLAUDE.md efface aussi les correctifs non commités), joue les suites visées, et exige qu'AU MOINS
   UNE tombe (code de sortie non nul ou un « ✗ »).

   ⛔ UNE MUTATION DONT LE MOTIF NE TROUVE RIEN EST MAL VISÉE, et le lanceur le DIT au lieu de conclure (`s.replace(motif, autre, 1)` frappe
   la PREMIÈRE occurrence du fichier, pas celle qu'on croit) : il vérifie que le texte a changé ET qu'il ne change qu'UNE occurrence.
   ⛔ Une mutation qui survit n'est pas forcément un banc aveugle : elle peut être neutralisée par une autre garde. Le lanceur nomme la
   survivante ; on regarde alors si le COMPORTEMENT a changé avant de conclure.

   Lancer :  node tests/mutations-telephone.js            (toutes)
             node tests/mutations-telephone.js T07 T12    (seulement celles-là)
   Une exécution par mutation, un délai par suite (240 s), trois copies en parallèle. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { spawn } = require('child_process');

const RACINE = path.join(__dirname, '..');
const NB_COPIES = 3, DELAI_MS = 240000;
const T = {
  tel: 'server-msg/telephone.js', garde: 'server-msg/sms-garde.js', ovh: 'server-msg/sms-ovh.js', prix: 'server-msg/sms-prix.js', num: 'server-msg/numero.js',
  stock: 'server-msg/stockage.js', app: 'server-msg/app.js', conf: 'server-msg/config.js', index: 'server-msg/index.js', cfgsms: 'server-msg/configurer-sms.js',
  surv: '.github/scripts/surveillance-messages.js',
};
/* [id, nom, fichier, ancien, nouveau, suites visées (dans l'ordre : on s'arrête à la première qui tombe)] */
const MUTATIONS = [
  ['T01', 'budget global du jour retiré', T.garde, "if (j.cout + cout > plafonds.jour) return { ok: false, motif: 'budget_jour' };", '', ['915', '916']],
  ['T02', 'budget par pays retiré', T.garde, "if (pj.cout + cout > plafonds.paysJour(pays)) return { ok: false, motif: 'budget_pays_jour' };", '', ['915', '916']],
  ['T03', 'budget de l\'heure retiré', T.garde, "if (h.cout + cout > plafonds.heure) return { ok: false, motif: 'budget_heure' };", '', ['915', '916']],
  ['T04', 'détection d\'emballement retirée', T.garde, 'if (emballe(pays)) {', 'if (false) {', ['916', '915']],
  ['T05', 'numéros fixes acceptés (le plan de numérotation ne refuse plus un non-mobile)', T.num, "if (info.mob) { if (!info.mob.test(nsn)) return refus('non_mobile'); mobile = true; }", 'if (info.mob) { mobile = info.mob.test(nsn) || null; }', ['912', '915']],
  ['T06', 'France : le 08 et le 09 deviennent des mobiles', T.num, "['33', 'FR', 9, 9, R('[67]\\\\d{8}')]", "['33', 'FR', 9, 9, R('[6-9]\\\\d{8}')]", ['912', '915']],
  ['T07', 'code comparé et rangé en CLAIR (le hachage disparaît)', T.tel, "const hCode = (num_h, code) => scelleur.hmac('tel', 'code', num_h + '|' + code);", 'const hCode = (num_h, code) => code;', ['914', '918']],
  ['T08', 'le numéro entre dans le journal', T.tel, '    const num_h = hNumero(a.e164);\n\n    /* Un appareil DÉJÀ', "    const num_h = hNumero(a.e164);\n    console.log('demande de code pour ' + a.e164);\n\n    /* Un appareil DÉJÀ", ['914', '918']],
  ['T09', 'signature OVH fausse : le corps n\'est plus signé', T.ovh, "[appSecret, consumerKey, methode, url, corps, String(horodatage)].join('+')", "[appSecret, consumerKey, methode, url, String(horodatage)].join('+')", ['913', '914']],
  ['T10', 'énumération sans plafond (la recherche n\'est plus comptée)', T.tel, 'if (stockage.rechercheCompter(uid, horloge() - JOUR) >= maxJour) return trop(res, \'recherches_plafond\', 3600);', '', ['917']],
  ['T11', 'plafond par numéro (60 s) retiré', T.tel, "    caps.push({ code: 'renvoi_trop_tot', k: 'n:' + num_h, max: l60.max, fenetreMs: l60.fenetreMs });\n", '', ['915']],
  ['T12', 'plafond par numéro (jour) retiré', T.tel, "    caps.push({ code: 'numero_plafond_jour', k: 'n:' + num_h, max: lj.max, fenetreMs: lj.fenetreMs });\n", '', ['915']],
  ['T13', 'plafond par réseau retiré', T.tel, "      caps.push({ code: 'reseau_plafond', k: 'r:' + hReseau(rs.cle), max: l.max, fenetreMs: l.fenetreMs });\n", '', ['915']],
  ['T14', 'les plafonds ne sont plus écrits en base (ils ne survivent ni à un redémarrage ni à une saturation de la mémoire)', T.garde, "stockage.smsTentativesNoter(id, caps.map(c => c.k).filter((k, i, a) => a.indexOf(k) === i), t);", '', ['915', '916']],
  ['T15', 'le réseau IPv4 se compte par adresse complète, plus par /24', T.tel, "return m ? m[1] + '.0/24' : r;", 'return r;', ['915']],
  ['T16', 'le bouclier ne demande plus la preuve', T.tel, 'if (sms.bouclierDe(a.pays)) {', 'if (false && sms.bouclierDe(a.pays)) {', ['915']],
  ['T17', 'une preuve de travail rejouable', T.garde, 'if (utilises.has(p[2])) return false;', '', ['916', '915']],
  ['T18', 'une preuve non liée au numéro', T.garde, "scelleur.hmac('sms', 'defi', corps + '|' + num_h)", "scelleur.hmac('sms', 'defi', corps)", ['916', '915']],
  ['T19', 'le délai du défi n\'est plus tenu', T.garde, 'if (t < ts + cfg.bouclier.attenteMs || t > ts + cfg.bouclier.validiteMs) return false;', 'if (t > ts + cfg.bouclier.validiteMs) return false;', ['916', '915']],
  ['T20', 'le coût RÉEL d\'OVH est ignoré (l\'estimation reste)', T.garde, 'const reel = typeof r.credits === \'number\' && r.credits > 0 ? Math.ceil(Math.round(r.credits * cfg.prixCreditEur * 1e9) / 1e3) : cout;', 'const reel = cout;', ['915']],
  ['T21', 'un envoi INCERTAIN rend son coût au budget', T.garde, "if (r.genre === 'incertain') { stockage.smsRegler(id, { etat: 'incertain', cout });", "if (r.genre === 'incertain') { stockage.smsRegler(id, { etat: 'refuse', cout: 0 });", ['915']],
  ['T22', 'les envois refusés comptent dans les sommes du budget', T.stock, "WHERE ts >= ? AND pays = ? AND etat <> 'refuse'`).get(depuis, pays)", "WHERE ts >= ? AND pays = ?`).get(depuis, pays)", ['916']],
  ['T23', 'un pays inconnu de la table coûte zéro', T.prix, 'eur = credits !== undefined ? credits * pc * marge : (Number.isFinite(r.prixDefautEur) ? r.prixDefautEur : PRIX_DEFAUT_EUR);', 'eur = credits !== undefined ? credits * pc * marge : 0;', ['912']],
  ['T24', 'les numéros surtaxés nord-américains (900, 976…) sont acceptés', T.num, 'const NANP_SPECIAUX = new Set([500,', 'const NANP_SPECIAUX = new Set([0 && 500,', ['912']],
  ['T25', 'l\'heure de la signature est la nôtre, plus celle d\'OVH', T.ovh, 'return Math.floor((horloge() + ecart) / 1000);', 'return Math.floor(horloge() / 1000);', ['913']],
  ['T26', 'la recherche répond plus vite quand personne n\'existe (latence constante retirée)', T.tel, 'if (reste > 0) await dort(reste);', '', ['917']],
  ['T27', 'une personne qui m\'a bloqué reste trouvable', T.tel, "p.trouvable === 'tous' && !bloque;", "p.trouvable === 'tous';", ['917']],
  ['T28', 'le réglage « qui peut me trouver » est ignoré', T.tel, "p.id !== uid && p.trouvable === 'tous' && !bloque;", 'p.id !== uid && !bloque;', ['917']],
  ['T29', 'ajouter un contact sans l\'avoir cherché', T.tel, 'const p = fin && fin > horloge() ? stockage.personneParId(id) : null;', 'const p = stockage.personneParId(id);', ['917']],
  ['T30', 'la porte de test des codes s\'ouvre en production', T.conf, "if (testCodes && instance !== 'beta') {", 'if (false) {', ['914', '918']],
  ['T31', 'la session du compte par numéro n\'est plus glissante sur 90 jours', T.app, "p.origine === 'telephone' ? SESSION_TEL_MS : 30 * 86400000", '30 * 86400000', ['914']],
  ['T32', 'un code reste utilisable après sa preuve', T.tel, 'stockage.telCodeSupprimer(num_h);   // usage unique', '', ['914']],
  ['T33', 'les essais ne sont plus comptés', T.stock, "Q('UPDATE code_tel SET essais = essais + 1 WHERE num_h = ?').run(num_h);", '', ['914']],
  ['T34', 'un code expiré est accepté', T.stock, 'if (r.exp <= horloge() || r.essais >= maxEssais)', 'if (r.essais >= maxEssais)', ['914']],
  ['T35', 'un appareil connu paie quand même un SMS (le raccourci disparaît)', T.tel, "if (ap && p && p.id === ap.personne && p.etat === 'actif') {", "if (false && ap && p && p.id === ap.personne && p.etat === 'actif') {", ['914']],
  ['T36', 'réponse non uniforme : « numéro inconnu » quand aucun code n\'est attendu', T.tel, "if (!juste) return refus(res, 401, 'code_invalide');", "if (!juste) return rec ? refus(res, 401, 'code_invalide') : refus(res, 404, 'numero_inconnu');", ['914']],
  ['T37', 'se déconnecter ne coupe plus le jeton d\'appareil', T.tel, 'if (v && APPAREIL_RE.test(v)) stockage.telAppareilSupprimer(sha(v));', '', ['914']],
  ['T38', 'la comparaison d\'un code n\'est plus à temps constant', T.tel, 'return x.length === y.length && crypto.timingSafeEqual(x, y);', 'return a === b;', ['918']],
  ['T39', 'le code d\'un SMS est tiré d\'un générateur prévisible', T.tel, 'String(crypto.randomInt(0, 1000000)).padStart(6, \'0\')', 'String(Math.floor(Math.random() * 1000000)).padStart(6, \'0\')', ['918']],
  ['T40', 'configurer-sms.js réécrit un secret saisi à l\'écran', T.cfgsms, "process.stdout.write(question + (masque ? '' : r) + '\\n');", "process.stdout.write(question + r + '\\n');", ['918']],
  ['T41', 'la surveillance ne crie plus à 12 € par jour', T.surv, 'const SEUIL_SMS_EUR = 12;', 'const SEUIL_SMS_EUR = 1200;', ['918']],
  ['T42', 'la surveillance ne crie plus pour un bouclier', T.surv, "if (typeof j.sms.boucliers === 'number' && j.sms.boucliers > 0)", 'if (false)', ['918']],
  ['T43', '/health ne publie plus le bloc sms', T.index, 'sms: sms.sante(),', '', ['915', '918']],
  ['T44', 'la colonne « qui peut me trouver » perd son CHECK', T.stock, "trouvable TEXT NOT NULL DEFAULT 'tous' CHECK(trouvable IN ('tous','personne')))", "trouvable TEXT NOT NULL DEFAULT 'tous')", ['916']],
  ['T45', 'la migration 2 ne contrôle plus les clés étrangères', T.stock, "if (m.sansFk === true && Q('PRAGMA foreign_key_check').all().length > 0) throw erreur('migration_orphelins');", '', ['916']],
  ['T46', 'le défaut du budget par pays monte à 3000 €', T.garde, "budgetPaysJour: nb(c, 'budgetPaysJour', 3, 0, 100000)", "budgetPaysJour: nb(c, 'budgetPaysJour', 3000, 0, 100000)", ['916']],
  ['T47', 'des identifiants OVH incomplets passent en silence', T.garde, "if (poses.length > 0 && poses.length < champs.length) throw err(", "if (false) throw err(", ['916']],
  ['T48', 'en production, une base d\'API étrangère est acceptée', T.garde, "instance === 'prod' ? URLS_OVH.test(o.urlBase)", 'true', ['916']],

  /* ── La relecture adverse du 2 octobre 2026 (gardien + testeur) : chaque correctif, remis à l'envers ── */
  ['T49', 'le bouclier ne se déclenche plus sur l\'ARGENT (40 % du budget)', T.garde, "    const bb = bouclierBudget(pays);\n    if (bb) return { motif: bb };", "    const bb = null;\n    if (bb) return { motif: bb };", ['915', '916']],
  ['T50', 'la réserve du marché d\'origine disparaît (sept pays chers ferment la France)', T.garde, "if (cfg.reserve.part > 0 && !cfg.reserve.pays.includes(pays)) {", "if (false) {", ['915', '916']],
  ['T51', 'les plafonds IPv6 ne se comptent plus par /48', T.tel, "return g ? [{ cle: r, niveau: 'r64' }, { cle: g[1] + '::/48', niveau: 'r48' }] : [{ cle: r, niveau: 'r' }];", "return g ? [{ cle: r, niveau: 'r64' }] : [{ cle: r, niveau: 'r' }];", ['915']],
  ['T52', 'une panne d\'OVH (rien n\'est parti) ne rend plus les plafonds', T.tel, "      sms.rendre(r.id);\n      res.set('Retry-After', '60');", "      res.set('Retry-After', '60');", ['915']],
  ['T53', '« ce numéro n\'existe pas » rend de nouveau les plafonds (sonder des numéros à volonté)', T.tel, "if (e.genre === 'numero') return refus(res, 400, 'numero_invalide');", "if (e.genre === 'numero') { sms.rendre(r.id); return refus(res, 400, 'numero_invalide'); }", ['915']],
  ['T54', 'un envoi INCERTAIN ne pose pas le code (la personne qui a reçu le SMS tape un code invalide)', T.tel, "if (e.genre === 'incertain') { poserCode(); codeDeTest(a.e164, code);", "if (e.genre === 'incertain') { codeDeTest(a.e164, code);", ['915']],
  ['T74', 'un envoi qui échoue supprime le code valable d\'un envoi précédent', T.tel, "      sms.rendre(r.id);\n      res.set('Retry-After', '60');", "      stockage.telCodeSupprimer(num_h);\n      sms.rendre(r.id);\n      res.set('Retry-After', '60');", ['915']],
  ['T55', 'un envoi INCERTAIN répond de nouveau 503', T.tel, "return res.json(Object.assign(reponse, { incertain: true })); }", "return refus(res, 503, 'sms_indisponible', { portee: 'service' }); }", ['915']],
  ['T56', 'ce qui s\'est passé AVANT l\'envoi (heure d\'OVH, DNS, connexion refusée) redevient « incertain »', T.ovh, "return { ok: false, genre: e && e.avantEnvoi ? 'non_envoye' : 'incertain' };", "return { ok: false, genre: 'incertain' };", ['913', '915']],
  ['T57', 'un 503 d\'OVH redevient « incertain »', T.ovh, "    if (r.statut === 503) return { ok: false, genre: 'non_envoye', statut: r.statut };   // « service indisponible » : le travail n'a pas commencé\n", '', ['913', '915']],
  ['T58', 'les refus 400/409/429 d\'OVH ne comptent plus dans ovhEchecs (des crédits épuisés restent muets)', T.garde, "if (r.genre !== 'numero') echecsOvh++;", "if (r.genre === 'config') echecsOvh++;", ['915', '916']],
  ['T59', 'le code n\'est plus lié à l\'appareil qui l\'a demandé (un inconnu le brûle)', T.stock, "      if (r.ap_h && r.ap_h !== ap_h) return null;\n", '', ['916', '919']],
  ['T60', 'les échecs de vérification se comptent de nouveau par NUMÉRO seul (un inconnu verrouille la victime)', T.tel, "essai('tel_verif_num', num_h + '|' + dev.h,", "essai('tel_verif_num', num_h,", ['919']],
  ['T61', 'un prénom invalide est jugé APRÈS la consommation du code', T.tel, "    let prenom = '', nom = '';\n    if (!p) {", "    let prenom = '', nom = '';\n    stockage.telCodeSupprimer(num_h);\n    if (!p) {", ['919']],
  ['T62', 'un code collé avec ses espaces est refusé', T.tel, "const brut = typeof b.code === 'string' ? b.code.replace(/[\\s\\u00a0\\u202f]/g, '') : b.code;", "const brut = b.code;", ['919']],
  ['T63', 'un nouvel appareil ne prévient plus les autres (l\'ancien titulaire d\'un numéro réattribué ne le saurait jamais)', T.tel, "    if (appareilNouveau) {", "    if (false) {", ['919']],
  ['T64', '« Déconnecter les autres appareils » ne coupe plus les sessions', T.tel, "const hs = stockage.sessionsSupprimerAutres(req.moi.id, req.sessionH);", "const hs = [];", ['919']],
  ['T65', '« Déconnecter les autres appareils » ne coupe plus les jetons d\'appareil (l\'autre se reconnecte sans SMS)', T.tel, "const appareils = stockage.telAppareilsSupprimerAutres(req.moi.id, v && APPAREIL_RE.test(v) ? sha(v) : '');", "const appareils = 0;", ['919']],
  ['T66', 'plus de plafond absolu sur le jeton d\'appareil (reconnecté sans SMS pour toujours)', T.tel, "const ap = v && APPAREIL_RE.test(v) ? stockage.telAppareilLire(sha(v), APPAREIL_ABS_MS) : null;", "const ap = v && APPAREIL_RE.test(v) ? stockage.telAppareilLire(sha(v)) : null;", ['919']],
  ['T67', 'l\'usage d\'une session ne prolonge plus le jeton d\'appareil', T.app, "    if (p.origine === 'telephone') appareilToucherDe(req, config, stockage);", "", ['919']],
  ['T68', 'le zéro de ligne n\'est plus retiré dans un pays sans plage mobile (deux E.164 pour un téléphone)', T.num, "else if (!info.mob && !ZERO_SIGNIFICATIF.has(info.pays) && sans.length >= info.mn && sans.length <= info.mx) nsn = sans;", "", ['919', '912']],
  ['T69', 'l\'élagage n\'est plus appelé par le balayeur', T.index, "        stockage.smsElaguer({", "        (() => {})({", ['919']],
  ['T70', 'une table de défis pleine refuse de nouveau toute preuve', T.garde, "    utilises.set(p[2], ts + cfg.bouclier.validiteMs);\n    return true;", "    if (utilises.size > 5000) return false;\n    utilises.set(p[2], ts + cfg.bouclier.validiteMs);\n    return true;", ['916']],
  ['T71', 'la saisie masquée de configurer-sms.js fait de nouveau écho (un secret s\'affiche)', T.cfgsms, "        if (!masque) process.stdout.write(ch);", "        process.stdout.write(ch);", ['918']],
  ['T72', 'le fichier temporaire de configurer-sms.js n\'est plus créé en 0600', T.cfgsms, "{ mode: 0o600, flag: 'wx' }", "{ flag: 'wx' }", ['918']],
];

const DOSSIERS_COPIE = ['server-msg', 'design/opmessages', '.github/scripts'];
function copier(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copier(s, d); else fs.copyFileSync(s, d);
  }
}
function fabriquerCopie() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mut-tel-'));
  for (const d of DOSSIERS_COPIE) copier(path.join(RACINE, d), path.join(dir, d));
  fs.mkdirSync(path.join(dir, 'tests'));
  for (const f of fs.readdirSync(path.join(RACINE, 'tests'))) if (/^(test-9\d\d|outils-msg|outils-tel|bac-messages|lib-horloge-msg|mode-site)\.js$/.test(f) || /^test-9/.test(f)) fs.copyFileSync(path.join(RACINE, 'tests', f), path.join(dir, 'tests', f));
  fs.symlinkSync(path.join(RACINE, 'server-msg', 'node_modules'), path.join(dir, 'server-msg', 'node_modules'));
  return dir;
}
function lancer(dir, suite) {
  return new Promise((resolve) => {
    const f = fs.readdirSync(path.join(dir, 'tests')).find(x => x.startsWith('test-' + suite) && x.endsWith('.js'));
    const p = spawn(process.execPath, [path.join(dir, 'tests', f)], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
    let sortie = ''; p.stdout.on('data', d => { sortie += d; }); p.stderr.on('data', d => { sortie += d; });
    const minuteur = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} }, DELAI_MS);
    p.on('close', (code) => { clearTimeout(minuteur); const ko = (sortie.match(/(\d+) ✗/g) || []).pop(); resolve({ code, ko: ko ? parseInt(ko, 10) : null, sortie, suite }); });
  });
}

async function jouer(m, dir) {
  const [id, nom, fichier, ancien, nouveau, suites] = m;
  const cible = path.join(dir, fichier), original = fs.readFileSync(path.join(RACINE, fichier), 'utf8');
  const n = original.split(ancien).length - 1;
  if (n !== 1) return { id, nom, verdict: 'MAL VISÉE', detail: n === 0 ? 'le motif ne se trouve pas' : 'le motif se trouve ' + n + ' fois' };
  const muté = original.replace(ancien, () => nouveau);
  if (muté === original) return { id, nom, verdict: 'MAL VISÉE', detail: 'le texte n\'a pas changé' };
  fs.writeFileSync(cible, muté);
  try {
    const verts = [];
    for (const s of suites) {
      const r = await lancer(dir, s);
      if (r.code !== 0 || (r.ko !== null && r.ko > 0)) {
        const ligne = (r.sortie.split('\n').find(l => l.includes('✗')) || r.sortie.split('\n').filter(Boolean).slice(-1)[0] || '').trim().slice(0, 150);
        return { id, nom, verdict: 'TOMBE', detail: 'test-' + s + ' (' + (r.ko === null ? 'mort, code ' + r.code : r.ko + ' ✗') + ') — ' + ligne };
      }
      verts.push(s);
    }
    return { id, nom, verdict: 'SURVIT', detail: 'vert : ' + verts.join(', ') };
  } finally { fs.writeFileSync(cible, original); }
}

(async () => {
  const demande = process.argv.slice(2);
  const liste = demande.length ? MUTATIONS.filter(m => demande.includes(m[0])) : MUTATIONS;
  if (!liste.length) { console.log('aucune mutation à jouer'); process.exit(2); }
  const copies = Array.from({ length: Math.min(NB_COPIES, liste.length) }, fabriquerCopie);
  const file = liste.slice(), resultats = [];
  await Promise.all(copies.map(async (dir) => {
    for (;;) {
      const m = file.shift(); if (!m) return;
      const r = await jouer(m, dir);
      resultats.push(r);
      console.log((r.verdict === 'TOMBE' ? '  ✓ ' : '  ✗ ') + r.id + ' · ' + r.nom + ' → ' + r.verdict + ' · ' + r.detail);
    }
  }));
  for (const d of copies) { try { fs.rmSync(d, { recursive: true, force: true }); } catch (e) {} }
  const tombees = resultats.filter(r => r.verdict === 'TOMBE').length;
  console.log('\n' + tombees + '/' + resultats.length + ' mutations tombent' + (tombees === resultats.length ? '' : ' — LES AUTRES : ' + resultats.filter(r => r.verdict !== 'TOMBE').map(r => r.id + ' (' + r.verdict + ')').join(', ')));
  process.exit(tombees === resultats.length ? 0 : 1);
})();

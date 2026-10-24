/* ══ test-2991 · LE PAIEMENT SE JOUE EN ESSAI : les pages fabriquées portent les tarifs de TEST (ou disent la limite) ═══════════════════════════════
   23 octobre 2026. Suite de `test-2990` (le script qui crée les dix tarifs de test, le serveur qui les accepte). Ici, la troisième pièce : `scripts/essais-build.js`.
   Quand la config de test porte `stripe.prixEssai` COMPLÈTE (les dix identifiants de la page de paiement, chacun avec un correspondant valide, distinct, qui n'est jamais
   un tarif de production), le fabricant les remplace dans la page, déclare le paiement jouable (essais.html promet la carte 4242 et ajoute l'étape de paiement), et REFUSE
   de livrer si un `price_` de production subsiste ou si un tarif de test manque dans la page de paiement. Sinon : rien n'est remplacé, la limite est dite.
   Il est séparé de `test-2990` EXPRÈS : ce banc relit tout le dépôt (le fabricant parcourt toutes les pages), comme `test-2985` et `test-2986`, donc il ne peut pas se
   jouer contre les seules pages de `main` que la liste des bancs du serveur utilise.
   Les mutations (un tarif oublié, une garde retirée) sont jouées sur des COPIES du générateur : chacune doit faire échouer la fabrication, par la garde qu'elle vise.
   Population comptée avant chaque absence.                                                                                                                  */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawnSync } = require('child_process');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 300) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), [a, b]);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'essais2991-'));
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {} });
let n = 0;
const neuf = (nom) => { const d = path.join(TMP, nom + '-' + (++n)); fs.mkdirSync(d, { recursive: true }); return d; };
const lire = (f) => fs.readFileSync(f, 'utf8');
const BUILD = path.join(RACINE, 'scripts', 'essais-build.js');
const ecrireConfig = (chemin, o) => { fs.writeFileSync(chemin, JSON.stringify(o, null, 2) + '\n', { mode: 0o640 }); };
const SK = 'sk_test_' + crypto.randomBytes(12).toString('hex');

/* les dix tarifs de PRODUCTION, lus dans la page de paiement elle-même (la source du fabricant), rangés par formule */
const PAGE = lire(path.join(RACINE, 'recap-abonnement.html'));
const FORMULES = Array.from(PAGE.matchAll(/^\s+(\w+):\s*\{ mensuel: '(price_[A-Za-z0-9]+)', annuel: '(price_[A-Za-z0-9]+)' \}/gm)).map(m => ({ cle: m[1], mensuel: m[2], annuel: m[3] }));
const PROD = [].concat(...FORMULES.map(f => [f.mensuel, f.annuel]));
/* une table de test de la forme de celle que le script écrit : un tarif distinct par tarif de production */
const TABLE = {}; PROD.forEach((id, i) => { TABLE[id] = 'price_1Test' + String(i).padStart(2, '0') + crypto.randomBytes(8).toString('hex'); });
const incomplete = Object.assign({}, TABLE); delete incomplete[FORMULES[4].annuel];
const mauvaise = Object.assign({}, TABLE); mauvaise[FORMULES[0].mensuel] = 'price_a b';
const doublon = Object.assign({}, TABLE); doublon[FORMULES[0].annuel] = TABLE[FORMULES[0].mensuel];
const prodEnTest = Object.assign({}, TABLE); prodEnTest[FORMULES[0].mensuel] = FORMULES[1].mensuel;

(async () => {
  console.log('\n── test-2991 : les pages de test portent les tarifs de test ──');
  console.log('\n0. La population');
  egal('(population) la page de paiement porte cinq formules de deux tarifs : dix tarifs de production distincts', [FORMULES.length, new Set(PROD).size, PROD.length], [5, 10, 10]);
  egal('(population) et ce sont tous les price_… de la page', Array.from(new Set(PAGE.match(/price_[A-Za-z0-9]{8,}/g))).sort(), PROD.slice().sort());

  console.log('\n1. Les pages fabriquées, avec et sans la table');
  const CLE = crypto.randomBytes(32).toString('hex');
  const construire = (sortie, cfgPath, o) => {
    const opt = o || {}, env = Object.assign({}, process.env, { ESSAIS_RACINE: RACINE }); delete env.TEAMOP_CONFIG; delete env.ESSAIS_PARCOURS; delete env.ESSAIS_CLE;
    if (!cfgPath) env.ESSAIS_CLE = CLE;
    const r = spawnSync(process.execPath, [opt.script || BUILD, sortie, 'abcdef1', 'claude/essai-banc'].concat(cfgPath ? ['--config', cfgPath] : [], opt.args || []), { encoding: 'utf8', env, timeout: 120000 });
    return { rc: r.status, out: String(r.stdout || ''), err: String(r.stderr || '') };
  };
  const tousLesFichiers = (d) => { const o = []; (function m(rel) { for (const e of fs.readdirSync(path.join(d, rel), { withFileTypes: true })) { const r = path.join(rel, e.name); if (e.isDirectory()) m(r); else if (/\.(html|js|css|json|txt)$/.test(e.name)) o.push(r); } })(''); return o; };
  const cfgAvec = (nom, stripeObj, extra) => { const p = path.join(neuf('cfg-' + nom), 'config.json'); ecrireConfig(p, Object.assign({ espaceTest: true, espaceTestCle: CLE, stripe: stripeObj }, extra || {})); return p; };
  {
    const D = neuf('pages'), r = construire(D, cfgAvec('complete', { secretKey: SK, prixEssai: TABLE }));
    vrai('une fabrication avec la table complète réussit', r.rc === 0, r.err.slice(0, 300));
    if (r.rc === 0) {
      const RECAP = lire(path.join(D, 'recap-abonnement.html')), ESS = lire(path.join(D, 'essais.html'));
      const fichiers = tousLesFichiers(D);
      vrai('(population) la sortie compte des pages (dont la page de paiement) à parcourir', fichiers.length > 20 && fichiers.indexOf('recap-abonnement.html') >= 0, fichiers.length);
      egal('⛔ AUCUN tarif de production ne reste dans AUCUN fichier produit', PROD.filter(id => fichiers.some(f => lire(path.join(D, f)).indexOf(id) >= 0)), []);
      egal('la page de paiement porte les DIX tarifs de test (population comptée avant de croire une absence)', Object.values(TABLE).filter(id => RECAP.indexOf(id) >= 0).length, 10);
      vrai('…chacun à la place du tarif de production qu\'il remplace (même ligne de la table, même formule, même rythme)', FORMULES.every(f => new RegExp(f.cle + ':\\s*\\{\\s*mensuel: \'' + TABLE[f.mensuel] + '\', annuel: \'' + TABLE[f.annuel] + '\'').test(RECAP)));
      vrai('essais.html promet la carte 4242, ne porte plus la limite, et ajoute l\'étape de paiement AVANT la remise à zéro', /4242/.test(ESS) && ESS.indexOf('id="limite-paiement"') < 0 && /Payer un abonnement avec la carte de test/.test(ESS) && ESS.indexOf('<b>Payer un abonnement avec la carte de test</b>') > 0 && ESS.indexOf('<b>Payer un abonnement avec la carte de test</b>') < ESS.indexOf('<b>Remettre l\'espace à zéro</b>') && (ESS.match(/<li class="carte" data-etape="b\d"/g) || []).length === 7);
      vrai('la clé de test Stripe ne figure dans AUCUNE page', !fichiers.some(f => lire(path.join(D, f)).indexOf(SK) >= 0));
      vrai('le fabricant n\'affiche ni la clé de test Stripe ni celle des routes d\'essai', r.out.indexOf(SK) < 0 && r.out.indexOf(CLE) < 0 && r.err.indexOf(SK) < 0);
    }
  }
  {
    const D = neuf('pages-sans'), r = construire(D, cfgAvec('sans', { secretKey: SK }));
    const RECAP = r.rc === 0 ? lire(path.join(D, 'recap-abonnement.html')) : '', ESS = r.rc === 0 ? lire(path.join(D, 'essais.html')) : '';
    vrai('sans table : la fabrication réussit, la page de paiement garde ses tarifs de production, et la LIMITE est dite', r.rc === 0 && PROD.every(id => RECAP.indexOf(id) >= 0) && ESS.indexOf('id="limite-paiement"') > 0 && !/Payer un abonnement avec la carte de test/.test(ESS) && (ESS.match(/<li class="carte" data-etape="b\d"/g) || []).length === 6, r.err.slice(0, 200));
  }
  for (const [nom, table] of [['incomplète', incomplete], ['mal formée', mauvaise], ['en double', doublon], ['avec un tarif de production', prodEnTest]]) {
    const D = neuf('pages-' + nom.slice(0, 4)), r = construire(D, cfgAvec(nom.slice(0, 4), { secretKey: SK, prixEssai: table }));
    const RECAP = r.rc === 0 ? lire(path.join(D, 'recap-abonnement.html')) : '', ESS = r.rc === 0 ? lire(path.join(D, 'essais.html')) : '';
    vrai('⛔ table ' + nom + ' : RIEN n\'est remplacé dans la page (jamais la moitié), la limite est dite, et la fabrication le signale', r.rc === 0 && PROD.every(id => RECAP.indexOf(id) >= 0) && Object.values(TABLE).every(id => RECAP.indexOf(id) < 0) && ESS.indexOf('id="limite-paiement"') > 0 && /stripe\.prixEssai/.test(r.err), [r.rc, r.err.slice(0, 160)]);
  }
  {
    const D = neuf('pages-prod'), r = construire(D, cfgAvec('prod', { secretKey: SK, prixEssai: TABLE }, { espaceTest: false }));
    const RECAP = r.rc === 0 ? lire(path.join(D, 'recap-abonnement.html')) : '';
    vrai('⛔ une config qui n\'est pas celle d\'un serveur de test (espaceTest faux) ne remplace RIEN, même avec une table', r.rc !== 0 || PROD.every(id => RECAP.indexOf(id) >= 0), [r.rc, r.err.slice(0, 120)]);
  }

  /* ── mutations du fabricant : chacune doit faire ÉCHOUER la fabrication, et par LA garde qu'elle vise ── */
  const SRCB = lire(BUILD), cfgC = cfgAvec('mut', { secretKey: SK, prixEssai: TABLE });
  const OUBLI = ['for (const prod of Object.keys(PRIX_ESSAI)) {', 'for (const prod of Object.keys(PRIX_ESSAI).slice(1)) {'];
  const AUCUN = ['if (PRIX_ESSAI) s = prixDeTest(s, f);', ''];
  const SANS_GARDE_PROD = ['if (PAIEMENT_JOUABLE) {\n  const prod = PRIX_PROD_PAGE.slice();', 'if (false) {\n  const prod = PRIX_PROD_PAGE.slice();'];
  const SANS_GARDE_TEST = ['if (!Object.keys(PRIX_ESSAI).length || manquants.length) {', 'if (false) {'];
  const mutant = (nom, remplacements) => {
    let m = SRCB, tous = true;
    for (const [de, vers] of remplacements) { if (m.split(de).length !== 2) tous = false; m = m.replace(de, () => vers); }
    vrai('(mutation ' + nom + ') chaque motif est trouvé UNE fois dans le générateur (sinon la mutation ne vise rien)', tous);
    const f = path.join(neuf('mutant'), 'mutant.js'); fs.writeFileSync(f, m); return f;
  };
  const refuse = (D, r) => r.rc !== 0 && (!fs.existsSync(D) || fs.readdirSync(D).length === 0);
  {
    const D = neuf('mut1'), r = construire(D, cfgC, { script: mutant('un-tarif-oublié', [OUBLI]) });
    vrai('⛔ un price_ de production OUBLIÉ par le remplacement : la fabrication ÉCHOUE sur « tarif Stripe de production » et ne livre rien (dossier vidé)', refuse(D, r) && /tarif Stripe de production/.test(r.err), [r.rc, r.err.slice(0, 200)]);
  }
  {
    const D = neuf('mut2'), r = construire(D, cfgC, { script: mutant('plus-de-remplacement', [AUCUN]) });
    vrai('⛔ « jouable » mais plus aucun remplacement : la dernière passe refuse de livrer', refuse(D, r) && /tarif Stripe de production/.test(r.err), [r.rc, r.err.slice(0, 200)]);
  }
  {
    const D = neuf('mut3'), r = construire(D, cfgC, { script: mutant('oubli+garde-de-production-retirée', [OUBLI, SANS_GARDE_PROD]) });
    vrai('⛔ l\'oubli SANS la garde « aucun tarif de production » : la seconde garde (« la page porte les dix tarifs de test ») refuse seule de livrer', refuse(D, r) && /ne porte pas 1 tarif\(s\) de test/.test(r.err), [r.rc, r.err.slice(0, 200)]);
  }
  {
    const D = neuf('mut4'), r = construire(D, cfgC, { script: mutant('oubli+garde-de-présence-retirée', [OUBLI, SANS_GARDE_TEST]) });
    vrai('⛔ l\'oubli SANS la garde de présence : la garde « aucun tarif de production » refuse seule de livrer', refuse(D, r) && /tarif Stripe de production/.test(r.err), [r.rc, r.err.slice(0, 200)]);
  }
  {
    const D = neuf('mut5'), r = construire(D, cfgC, { script: mutant('oubli+les-deux-gardes-retirées', [OUBLI, SANS_GARDE_PROD, SANS_GARDE_TEST]) });
    vrai('(contre-épreuve) sans les DEUX gardes, l\'oubli passe : le générateur livre alors une page aux tarifs de production en se disant jouable — c\'est bien ce que les gardes empêchent',
      r.rc === 0 && PROD.filter(id => lire(path.join(D, 'recap-abonnement.html')).indexOf(id) >= 0).length === 1 && /carte de test/.test(lire(path.join(D, 'essais.html'))), [r.rc, r.err.slice(0, 200)]);
  }

  console.log('\n════ test-2991 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); console.log('\n════ test-2991 : ' + ok + ' ✓  ' + (ko + 1) + ' ✗ ════'); process.exit(1); });

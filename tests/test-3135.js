/* ══ test-3135 · LE CONFIGURATEUR ET LE SIMULATEUR DE LA PAGE DE COMMANDE — LA FORMULE SE DÉDUIT DES CASES, LA DÉMONSTRATION S'OUVRE AVEC ELLES ═════════════════════
   Justin, 28 octobre 2026 : « un simulateur de l'application (tableau de bord, planning… en détail, qui donne envie) et un configurateur : le client coche ce qu'il veut —
   choix A : la page en DÉDUIT la formule (Pro 15 € / Business 25 € / Business Premium 50 € par utilisateur, les tarifs Stripe existants, aucun tarif neuf) ».
   Ce banc EXÉCUTE (le navigateur piloté, lui, est `scratchpad/commande/sonde-commande.js` : 114 vérifications, téléphone et bureau, jour et nuit) :
   1. la VRAIE `OpRub.formule` (rubriques-choix.js) sur le VRAI référentiel servi par le VRAI module du serveur : Pro seul, Stock donne Business, une fonction d'entreprise
      donne Premium, décocher redescend ; et la page et le serveur disent la MÊME chose — jouée sur 400 combinaisons de rubriques, comparée à `formuleMini` ;
   2. les VRAIES fonctions de la page (`formuleDeduite`, `formuleAccorder`, `textDeduction`, `simAdresse`) : la formule SUIT les cases, une formule voulue ne descend jamais,
      un lien « Pro » qui appelle Business est dit (« Vous aviez choisi Pro »), un référentiel sans `plan` ne déduit rien ; ⛔ le paiement n'envoie que ce qu'il envoyait
      (prix, quantité, référence, options, métier, rubriques) — jamais la formule déduite, jamais une fonction ;
   3. la VRAIE `demoPubliqueReglage` (scripts/demo/demo-publique.js) : `cats` et `formule` de l'adresse, validés, et ⛔ SANS `cats` le réglage est remis à zéro ;
      `demo.html` est la génération de `demo-build.js` (à l'octet : test-2940), dont une garde nouvelle coupe `save()` dans le cadre du simulateur.
   Population comptée avant chaque absence.                                                                                                                              */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const RACINE = path.join(__dirname, '..');
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 400) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), [a, b]);
const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
function extraire(src, nom) {
  let d0 = src.indexOf('function ' + nom + '(');
  if (d0 < 0) return '';
  if (src.slice(d0 - 6, d0) === 'async ') d0 -= 6;   // `async` fait partie de la déclaration : sans lui, `await` ne se lit plus
  let p = 0;
  for (let k = src.indexOf('{', d0); k < src.length; k++) { if (src[k] === '{') p++; else if (src[k] === '}') { p--; if (!p) return src.slice(d0, k + 1); } }
  return '';
}
const ligne = (src, nom) => (new RegExp('^const ' + nom + ' = .*$', 'm').exec(src) || [''])[0];

const OpRub = require(path.join(RACINE, 'rubriques-choix.js'));
const SRV = lire('server/index.js'), SRVN = nu(SRV);
const PAGE = lire('recap-abonnement.html');
const MODULE = lire('scripts/demo/demo-publique.js'), BUILD = lire('demo-build.js'), DEMO = lire('demo.html');

/* le VRAI référentiel, servi par le VRAI module — comme `GET /api/metiers` */
const catsOk = (() => { const i = SRVN.indexOf('const CATS_OK = ['); return vm.runInNewContext(SRVN.slice(SRVN.indexOf('[', i), SRVN.indexOf('];', i) + 1)); })();
const toujours = (() => { const i = SRVN.indexOf('const CATS_TOUJOURS = ['); return vm.runInNewContext(SRVN.slice(SRVN.indexOf('[', i), SRVN.indexOf('];', i) + 1)); })();
const metiersMod = require(path.join(RACINE, 'server', 'metiers.js'))(path.join(RACINE, 'metiers.json'), catsOk, toujours);
const REF = metiersMod.publique();

console.log('\n── 3135 · 1. OpRub.formule, sur le vrai référentiel ──');
{
  vrai('(population) le référentiel servi : ' + REF.ouverts.length + ' métiers ouverts, ' + REF.ordre.length + ' rubriques cochables, toutes avec un plan', REF.ouverts.length >= 13 && REF.ordre.length === 38 && REF.ordre.every(k => ['pro', 'business'].includes(REF.rubriques[k].plan)));
  const planDe = k => REF.rubriques[k].plan;
  const etatCoche = (metier, cles) => { const e = OpRub.etat(REF, metier, cles); e.afficherPlan = true; return e; };
  const un = REF.ouverts.find(k => k === 'plomberie') || REF.ouverts[0];
  /* Pro seul */
  const pro = ['planning', 'devis', 'clients'];
  egal('des rubriques toutes Pro (planning, devis, clients) → Pro, aucune raison', (({ formule, raisons }) => [formule, raisons.length])(OpRub.formule(etatCoche(un, pro), [])), ['pro', 0]);
  /* une rubrique Business */
  const f1 = OpRub.formule(etatCoche(un, pro.concat(['stock'])), []);
  egal('+ Stock → Business, et la raison nomme la rubrique', [f1.formule, f1.raisons.map(r => r.titre)], ['business', [REF.rubriques.stock.titre]]);
  const f2 = OpRub.formule(etatCoche(un, pro.concat(['stock', 'bons'])), []);
  vrai('+ Stock et Bons de commande → Business, « Stock et Bons de commande » en français', f2.formule === 'business' && OpRub.texteRaisons(f2.raisons) === REF.rubriques.stock.titre + ' et ' + REF.rubriques.bons.titre, OpRub.texteRaisons(f2.raisons));
  /* les fonctions d'entreprise */
  egal('les quatre fonctions d\'entreprise et leur formule (logo → Business ; couleur, assistance, sur mesure → Premium)', OpRub.FONCTIONS.map(f => [f.k, f.formule]), [['logo', 'business'], ['couleur', 'premium'], ['assistance', 'premium'], ['surmesure', 'premium']]);
  egal('Pro + « Mon logo » → Business', OpRub.formule(etatCoche(un, pro), ['logo']).formule, 'business');
  egal('Pro + « Ma couleur d\'entreprise » → Business Premium', OpRub.formule(etatCoche(un, pro), ['couleur']).formule, 'premium');
  egal('Stock + couleur → Premium, la raison est la couleur (Business n\'est pas ce qui décide)', (({ formule, raisons }) => [formule, raisons.map(r => r.k)])(OpRub.formule(etatCoche(un, pro.concat(['stock'])), ['couleur'])), ['premium', ['couleur']]);
  egal('une fonction donnée en objet { couleur: vrai } compte aussi, une clé inconnue ne compte pas', [OpRub.formule(etatCoche(un, pro), { couleur: true }).formule, OpRub.formule(etatCoche(un, pro), ['n-importe-quoi', 7, null]).formule], ['premium', 'pro']);
  /* décocher redescend */
  const e = etatCoche(un, pro.concat(['stock']));
  egal('cocher puis décocher : Business puis Pro (la formule suit les cases)', [OpRub.formule(e, []).formule, (OpRub.bascule(e, 'stock'), OpRub.formule(e, []).formule)], ['business', 'pro']);
  /* un référentiel sans `plan` : rien n'est déduit */
  const sans = JSON.parse(JSON.stringify(REF)); for (const k of Object.keys(sans.rubriques)) delete sans.rubriques[k].plan;
  egal('⛔ un serveur d\'AVANT (aucun `plan` servi) : rien n\'est déduit (`null`), la page garde son sélecteur manuel', (({ formule, sait }) => [formule, sait])(OpRub.formule(OpRub.etat(sans, un, pro), [])), [null, false]);
  /* une clé que la grille ne montre pas ne compte pas */
  const e3 = OpRub.etat(REF, un, pro); e3.choisies.registre = true;   // « registre » est masquée hors 3D : jamais envoyée, jamais comptée
  egal('une rubrique masquée pour ce métier (« registre », 3D seulement) ne fait pas monter la formule', OpRub.formule(e3, []).formule, 'pro');

  /* LA PAGE ET LE SERVEUR DISENT LA MÊME CHOSE : 400 combinaisons au hasard (suite pseudo-aléatoire fixe) */
  let graine = 3135; const alea = () => (graine = (graine * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  let diff = 0, business = 0, pros = 0;
  for (let i = 0; i < 400; i++) {
    const metier = REF.ouverts[Math.floor(alea() * REF.ouverts.length)];
    const e = OpRub.etat(REF, metier, null); e.choisies = {};   // on part de rien : chaque rubrique est tirée, les Business bien plus rarement (sinon presque toute combinaison en contient une)
    for (const k of REF.ordre) if (alea() < (planDe(k) === 'business' ? 0.02 : 0.4)) OpRub.bascule(e, k);
    const liste = OpRub.liste(e) || [];
    const page = OpRub.formule(e, []).formule, serveur = metiersMod.formuleMini(liste);
    if (page !== serveur) diff++;
    if (serveur === 'business') business++; else pros++;
  }
  vrai('⛔ la page (`OpRub.formule`) et le serveur (`formuleMini`) rendent la MÊME formule sur 400 combinaisons (' + business + ' Business, ' + pros + ' Pro : les deux cas sont joués)', diff === 0 && business > 50 && pros > 50, { diff, business, pros });
  /* chaque métier ouvert, à son conseil : ce que le client voit à l'arrivée */
  const parMetier = REF.ouverts.map(m => OpRub.formule(OpRub.etat(REF, m, null), []).formule);
  vrai('(population) au conseil de leur métier, des métiers appellent Pro et d\'autres Business (' + parMetier.filter(f => f === 'pro').length + ' Pro, ' + parMetier.filter(f => f === 'business').length + ' Business)', parMetier.includes('pro') && parMetier.includes('business'), parMetier);
}

console.log('\n── 3135 · 2. Les vraies fonctions de la page de commande ──');
const PAGEN = nu(PAGE);
{
  const iF = PAGE.indexOf('const FORMULES = {'), jF = PAGE.indexOf('\n};', iF);
  const FORMULES_SRC = (iF > 0 && jF > iF) ? PAGE.slice(iF, jF + 3) : '';
  const noms = ['formuleDeduite', 'formuleAccorder', 'textDeduction', 'blocDeduction', 'simAdresse', 'choixPaiement'];
  const sources = noms.map(n => extraire(PAGEN, n));
  const consts = ['nomFormule', 'eur', 'RANGS'].map(n => ligne(PAGEN, n));
  vrai('(population) FORMULES, six fonctions et trois constantes de la page sont trouvées dans son code', FORMULES_SRC.length > 2000 && sources.every(s => s.length > 40) && consts.every(Boolean), { f: FORMULES_SRC.length, s: sources.map(s => s.length), c: consts.map(c => c.length) });
  const fab = (etat) => new Function('OpRub', 'etat', 'let formuleActive = etat.formuleActive, formuleVoulue = etat.formuleVoulue, fonctionsAbo = etat.fonctionsAbo || [], optionsChoisies = etat.options || [], metierAbo = etat.metierAbo, rubAbo = etat.rubAbo, refMetiers = etat.refMetiers, modeAjout = !!etat.modeAjout;\n'
    + 'const metierRequis = () => etat.metierRequis !== false;\n' + FORMULES_SRC + '\n' + consts.join('\n') + '\n' + sources.join('\n')
    + '\nreturn { formuleDeduite, formuleAccorder, textDeduction, blocDeduction, simAdresse, choixPaiement, get formuleActive() { return formuleActive; }, set formuleActive(v) { formuleActive = v; }, get formuleVoulue() { return formuleVoulue; }, set formuleVoulue(v) { formuleVoulue = v; }, get options() { return optionsChoisies; }, set fonctions(v) { fonctionsAbo = v; } };')(OpRub, etat);
  const rub = (metier, cles) => { const e = OpRub.etat(REF, metier, cles); e.afficherPlan = true; return e; };
  const pro = ['planning', 'devis', 'clients'];
  const base = (o) => Object.assign({ formuleActive: 'business', formuleVoulue: null, metierAbo: 'plomberie', refMetiers: REF, rubAbo: rub('plomberie', pro) }, o || {});

  /* le mode « Composer » : la formule SUIT les cases */
  let P = fab(base());
  P.formuleAccorder();
  egal('composer : des cases toutes Pro → la formule affichée est Pro (rien n\'est choisi d\'avance)', P.formuleActive, 'pro');
  P = fab(base({ rubAbo: rub('plomberie', pro.concat(['stock'])) })); P.formuleAccorder();
  egal('composer : Stock coché → Business', P.formuleActive, 'business');
  const e1 = rub('plomberie', pro.concat(['stock'])); P = fab(base({ rubAbo: e1 })); P.formuleAccorder();
  OpRub.bascule(e1, 'stock'); P.formuleAccorder();
  egal('composer : Stock décoché → on REDESCEND à Pro', P.formuleActive, 'pro');
  P = fab(base()); P.fonctions = ['couleur']; P.formuleAccorder();
  egal('composer : « Ma couleur d\'entreprise » → Business Premium', P.formuleActive, 'premium');
  /* une formule voulue ne descend pas */
  P = fab(base({ formuleActive: 'premium', formuleVoulue: 2, rubAbo: rub('plomberie', pro.concat(['stock'])) })); P.formuleAccorder();
  egal('une formule VOULUE (Business Premium) ne baisse pas quand les cases appellent moins', P.formuleActive, 'premium');
  P = fab(base({ formuleActive: 'pro', formuleVoulue: 0, rubAbo: rub('plomberie', pro.concat(['stock'])) })); P.formuleAccorder();
  egal('⛔ un lien « Pro » avec Stock coché : la formule passe à Business — jamais Pro avec Stock', P.formuleActive, 'business');
  vrai('   … et la page le DIT : « Vous aviez choisi Pro », « parce que vous avez coché Stock »', /Vous aviez choisi Pro/.test(P.textDeduction()) && /parce que vous avez coché <b>Stock<\/b>/.test(P.textDeduction()), P.textDeduction());
  vrai('   … et les options du Pro (non vendues) sont vidées quand on quitte le Pro', P.options.length === 0);
  P = fab(base()); P.formuleAccorder();
  vrai('la phrase d\'une formule Pro dit que rien n\'appelle plus, au tarif de la grille (15 €)', /Formule Pro<\/b>, 15 € par utilisateur et par mois/.test(P.textDeduction()), P.textDeduction());
  P = fab(base({ rubAbo: rub('plomberie', pro.concat(['stock', 'bons'])) })); P.formuleAccorder();
  vrai('la phrase d\'une formule Business : 25 €, les deux raisons, et comment redescendre', /Formule Business<\/b>, 25 € par utilisateur et par mois, parce que vous avez coché <b>Stock et Bons de commande<\/b>/.test(P.textDeduction()) && /Décochez-les pour redescendre/.test(P.textDeduction()), P.textDeduction());
  P = fab(base({ formuleActive: 'premium', formuleVoulue: 2, rubAbo: rub('plomberie', pro.concat(['stock'])) })); P.formuleAccorder();
  vrai('une formule choisie au-dessus du minimum : la phrase le dit (« Vous avez choisi … Vos choix appellent au moins Business »)', /Vous avez choisi <b>Business Premium<\/b>, 50 €/.test(P.textDeduction()) && /appellent au moins <b>Business<\/b>/.test(P.textDeduction()), P.textDeduction());
  /* les tarifs sont ceux de la grille : aucun prix écrit par la déduction */
  const prix = {}; for (const f of ['pro', 'business', 'premium']) { P = fab(base({ formuleActive: f, formuleVoulue: RANGS_(f) })); prix[f] = /(\d+) €/.exec(P.textDeduction() || '') ? +/(\d+) €/.exec(P.textDeduction())[1] : null; }
  function RANGS_(f) { return ['pro', 'business', 'premium'].indexOf(f); }
  egal('⛔ AUCUN tarif neuf : les phrases lisent les prix de FORMULES (15, 25, 50)', [prix.pro, prix.business, prix.premium], [15, 25, 50]);
  /* sans plan, rien ne se déduit */
  const sans = JSON.parse(JSON.stringify(REF)); for (const k of Object.keys(sans.rubriques)) delete sans.rubriques[k].plan;
  P = fab(base({ formuleActive: 'business', formuleVoulue: 1, refMetiers: sans, rubAbo: OpRub.etat(sans, 'plomberie', pro.concat(['stock'])) })); P.formuleAccorder();
  vrai('un serveur d\'AVANT (aucun plan) : la formule n\'est pas touchée et aucune phrase n\'est écrite', P.formuleActive === 'business' && P.textDeduction() === '' && P.blocDeduction() === '');
  /* un ajout d'option, ou une entreprise qui existe déjà (aucune grille) : rien ne se déduit */
  P = fab(base({ formuleActive: 'pro', formuleVoulue: 0, modeAjout: true, rubAbo: rub('plomberie', pro.concat(['stock'])) })); P.formuleAccorder();
  egal('un ajout d\'option (mode `ajout=options`) : la formule reste Pro', P.formuleActive, 'pro');
  P = fab(base({ formuleActive: 'pro', formuleVoulue: 0, metierRequis: false, rubAbo: rub('plomberie', pro.concat(['stock'])) })); P.formuleAccorder();
  egal('une entreprise qui existe déjà (pas de grille, `metierRequis` faux) : la formule reste celle du lien', P.formuleActive, 'pro');
  P = fab(base({ formuleActive: 'msgpro', formuleVoulue: null, rubAbo: rub('plomberie', pro.concat(['stock'])) })); P.formuleAccorder();
  egal('une formule d\'OP MESSAGES n\'est jamais déduite des rubriques d\'OP GESTION', P.formuleActive, 'msgpro');

  /* le corps du paiement */
  P = fab(base({ rubAbo: rub('plomberie', pro.concat(['stock'])) })); P.fonctions = ['couleur', 'logo'];
  const cp = P.choixPaiement();
  egal('⛔ `choixPaiement()` ne rend que le métier et les rubriques cochées — ni la formule déduite, ni les fonctions', [Object.keys(cp).sort(), cp.metier, cp.cats], [['cats', 'metier'], 'plomberie', catsOk.filter(k => pro.concat(['stock']).includes(k))]);
  const corps = /body: JSON\.stringify\(\{ price: priceId, quantity: nbAbos, ref: espaceRattacheRef\(\), options: optionsEnvoyees, \.\.\.choixPaiement\(\) \}\)/.test(PAGEN);
  vrai('⛔ le corps envoyé à `/api/stripe/checkout` est EXACTEMENT celui d\'avant : price, quantity, ref, options, métier et rubriques (aucune clé de plus)', corps);
  const blocPrix = (() => { const i = PAGEN.indexOf('const STRIPE_PRICES = {'), j = PAGEN.indexOf('\n};', i); return i > 0 && j > i ? PAGEN.slice(i, j) : ''; })();
  egal('   … et la page n\'a pas inventé de tarif : `STRIPE_PRICES` porte les cinq mêmes formules (test-842 les compare une à une au serveur)', (blocPrix.match(/^ {2}(\w+):/gm) || []).map(x => x.trim()), ['pro:', 'business:', 'premium:', 'msgpro:', 'msgpremium:']);
  vrai('   … et les options du Pro restent SANS tarif (Stock 9 € : aucun tarif neuf — Pro + Stock coûterait moins que Business)', /const STRIPE_PRICES_OPTIONS = \{\s*stock: {5}\{ mensuel: '', annuel: '' \},/.test(PAGEN));
  vrai('   … ni lu la formule déduite côté serveur : la formule n\'est jamais dans le corps (`formuleDeduite` n\'apparaît dans aucun appel réseau)', !/fetch\([^)]*formuleDeduite/.test(PAGEN) && !/JSON\.stringify\([^)]*(formuleDeduite|fonctionsAbo|formuleActive)/.test(PAGEN));

  /* l'adresse du simulateur */
  const sim = (o, aj) => fab(base(Object.assign({ formuleActive: 'business', formuleVoulue: 1 }, o))).simAdresse();
  const a = sim({ rubAbo: rub('plomberie', pro.concat(['stock'])) });
  vrai('l\'adresse du simulateur : `/demo.html?sim=1&metier=…&cats=…&formule=…` — des clés alphanumériques seulement', /^\/demo\.html\?sim=1&metier=plomberie&cats=[A-Za-z0-9_,]+&formule=business$/.test(a), a);
  vrai('   … les rubriques sont celles de la grille (dans l\'ordre du menu), rien d\'autre', a.split('cats=')[1].split('&')[0] === catsOk.filter(k => pro.concat(['stock']).includes(k)).join(','), a);
  const a2 = fab(base({ rubAbo: null })).simAdresse();
  vrai('   … sans rubrique cochée : pas de `cats` (tout ouvert)', !/cats=/.test(a2) && /formule=/.test(a2), a2);
  vrai('⛔ l\'adresse ne porte jamais les fonctions d\'entreprise ni rien du compte', !/fonction|email|jeton|logo|couleur/.test(a));
  vrai('le chargement est paresseux : le cadre n\'existe qu\'au clic (`simLancer` crée l\'iframe ; aucune iframe dans le balisage)', !/<iframe/.test(PAGEN.slice(0, PAGEN.indexOf('<script'))) && /function simLancer\(\)/.test(PAGEN) && /sandbox="allow-scripts allow-same-origin allow-modals"/.test(PAGEN));
  vrai('   … et le cadre vit hors de `#cartePaiement` (un rendu de la carte ne le recrée pas)', /<section class="carte carte-simulateur" id="carteSimulateur"/.test(PAGEN) && PAGEN.indexOf('id="carteSimulateur"') > PAGEN.indexOf('id="cartePaiement"'));
  vrai('   « Composer mon abonnement » : le lien `?composer=1` est lu par la page', /params\.get\('composer'\) === '1'/.test(PAGEN));
}

(async () => {
/* le code promo de la page : l'aperçu d'un code RÉSERVÉ (`reserve` SEUL) est dit à l'écran — une information, pas une décision, et jamais un oracle sur le métier */
{
  const src = extraire(nu(PAGE), 'promoValider');
  vrai('(population) `promoValider` est trouvée dans la page', src.length > 600);
  const jouer = async (reponse, metier) => {
    const els = {}; const el = id => (els[id] = els[id] || { style: {}, value: id === 'promo-code' ? 'essai-banc-libre' : '', innerHTML: '', textContent: '', disabled: false });
    const envoyes = []; const rangement = {};
    const f = new Function('document', 'fetch', 'metierAbo', 'localStorage', 'window', 'setTimeout', src + '\nreturn promoValider;')(
      { getElementById: el }, async (u, o) => { envoyes.push(JSON.parse(o.body)); return { ok: reponse.ok !== false, json: async () => reponse.corps }; }, metier,
      { getItem: () => null, setItem: (k, x) => { rangement[k] = x; } }, { location: { href: '' } }, () => 0);
    await f();
    return { envoyes, msg: els['promo-msg'] ? els['promo-msg'].innerHTML : '', couleur: els['promo-msg'] ? els['promo-msg'].style.color : '', rangement };
  };
  let r = await jouer({ corps: { ok: true, mois: 2, reserve: true } }, 'nettoyage');
  vrai('⛔ un code réservé, métier choisi : la page le dit sans confirmer ni infirmer ce métier, et ELLE N\'ENVOIE PAS son métier à l\'aperçu (oracle)', /réservé à certains métiers/.test(r.msg) && /vérifions à l’ouverture de votre espace/.test(r.msg) && !/en fait partie|n’en fait pas partie/.test(r.msg) && /Code valide/.test(r.msg) && r.envoyes.length === 1 && !('metier' in r.envoyes[0]) && Object.keys(r.envoyes[0]).sort().join() === 'apercu,code', [r.msg, r.envoyes]);
  r = await jouer({ corps: { ok: true, mois: 2, reserve: true, metierAdmis: false } }, 'nettoyage');
  vrai('   … même si un serveur d\'AVANT répondait `metierAdmis` : la page n\'en tient plus compte (pas de refus à l\'écran, aucun verdict de métier)', !/en fait partie|n’en fait pas partie/.test(r.msg) && /Code valide/.test(r.msg) && r.couleur !== 'var(--m-err)', [r.msg, r.couleur]);
  r = await jouer({ corps: { ok: true, mois: 2, reserve: true } }, '');
  vrai('un code réservé, aucun métier encore choisi : il le dit, sans dire « admis »', /réservé à certains métiers/.test(r.msg) && !/en fait partie/.test(r.msg) && !('metier' in r.envoyes[0]), [r.msg, r.envoyes]);
  r = await jouer({ corps: { ok: true, mois: 2 } }, 'plomberie');
  vrai('un code LIBRE : la réponse d\'avant, aucune mention de métier', !/réservé/.test(r.msg) && /Code valide/.test(r.msg), r.msg);
}

console.log('\n── 3135 · 3. La démonstration s\'ouvre avec les rubriques cochées (`cats`, `formule`) ──');
{
  const src = nu(MODULE);
  const regle = (search) => {
    const appels = [], db = {}; const PLANS = { pro: {}, business: {}, premium: {} };
    const f = new Function('location', 'db', 'PLANS', 'catsServeurAppliquer', extraire(src, 'demoPubliqueSimulateur') + '\n' + extraire(src, 'demoPubliqueReglage') + '\nreturn { demoPubliqueSimulateur, demoPubliqueReglage };')({ search }, db, PLANS, j => { appels.push(j); return true; });
    return { sim: f.demoPubliqueSimulateur(), reglage: (f.demoPubliqueReglage(), { db, appels }) };
  };
  vrai('(population) les deux fonctions sont trouvées dans le module', extraire(src, 'demoPubliqueSimulateur').length > 30 && extraire(src, 'demoPubliqueReglage').length > 100);
  let r = regle('?sim=1&metier=plomberie&cats=planning,devis,stock&formule=business');
  egal('`cats` et `formule` de l\'adresse : la formule posée, les rubriques passées à `catsServeurAppliquer`', [r.sim, r.reglage.db.forfait, r.reglage.appels], [true, 'business', [{ cats: ['planning', 'devis', 'stock'] }]]);
  r = regle('?metier=plomberie');
  egal('⛔ SANS `cats` : le réglage est remis à zéro (`cats: null` = tout ouvert) — un cadre d\'avant ne laisse pas un menu à moitié vide à la démonstration suivante', [r.sim, r.reglage.appels, r.reglage.db.forfait], [false, [{ cats: null }], undefined]);
  r = regle('');
  egal('   la démonstration seule : pas de cadre, réglage remis à zéro aussi', [r.sim, r.reglage.appels], [false, [{ cats: null }]]);
  r = regle('?formule=constructor&cats=');
  egal('une formule qui n\'est pas une clé de `PLANS` (« constructor ») est ignorée ; `cats=` vide = rien choisi (null)', [r.reglage.db.forfait, r.reglage.appels], [undefined, [{ cats: null }]]);
  r = regle('?formule=gratuit');
  egal('« gratuit » n\'existe plus : ignoré', r.reglage.db.forfait, undefined);
  r = regle('?sim=1&cats=a%3Cscript%3E,b;c');
  vrai('une valeur qui n\'est pas alphanumérique est coupée à son premier caractère étranger (jamais interprétée)', r.reglage.appels.length === 1 && r.reglage.appels[0].cats.every(k => /^[A-Za-z0-9_]+$/.test(k)), r.reglage.appels);
  vrai('le cadre se reconnaît à `sim=1`, `cats=` ou `formule=` seulement (un `?metier=` seul, ou `?xsim=1`, est la démonstration)', ['?sim=1', '?cats=a', '?formule=pro', '?metier=x&sim=1'].every(q => regle(q).sim) && ['?metier=plomberie', '', '?xsim=1', '?sim=0'].every(q => !regle(q).sim));

  vrai('⛔ demo.html porte la garde : `save()` ne range rien dans le cadre du simulateur', /function save\(\)\{ if\(window\.__demoSimulateur\) return;/.test(DEMO) && /save\(\) — le simulateur ne range rien/.test(BUILD));
  vrai('   … et le démarrage ne retient pas le métier ni ne demande rien dans le cadre (`demoPubliqueChoixEcrire` n\'est pas dans la branche `sim`)', (() => { const b = extraire(src, 'demoPubliqueBoot'); const i = b.indexOf('if (sim) {'), j = b.indexOf('return;', i); return i > 0 && j > i && !/ChoixEcrire|confirm/.test(b.slice(i, j)); })());
  vrai('   … et le bandeau « Recommencer / Changer de métier » (qui efface l\'appareil) ne se pose pas dans le cadre', /function demoPubliqueBandeau\(\) \{\s*if \(window\.__demoSimulateur\) return;/.test(src));
  vrai('le simulateur ne touche ni à app.html ni à sw.js : demo.html est fabriquée par demo-build.js (aucune phrase de publication nécessaire)', /remplacer\('save\(\) — le simulateur ne range rien'/.test(BUILD));
}

console.log('\n════ test-3135 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc s\'est interrompu : ' + (e && e.stack || e)); process.exit(1); });

/* ⛔ CE QUE CE FICHIER GARDE — LES OPTIONS DU PRO À LA PAGE DE PAIEMENT ET DANS « MON ESPACE » (1er octobre 2026).

   Justin, sur « Quels prix pour les options du Pro ? » : « Plus cher ». Stock 9 €, Achats 6 €, Compta 6 €, Registre sanitaire
   6 € par utilisateur et par mois, réservées au Pro (Business et Business Premium les ont toutes). La page de paiement
   (`recap-abonnement.html`) les vend ; « Mon espace » (`espace.html`) dit celles que le serveur sert.

   Ce banc EXÉCUTE le vrai script de la page sur un faux document — la même technique que `test-837` — et regarde :
   · la page EN SERVICE : les identifiants Stripe des options sont VIDES (Justin ne les a pas créés), donc AUCUNE case,
     aucune promesse, et un corps de paiement qui part avec `options: []` ;
   · la même page avec des identifiants FACTICES posés dans une copie en mémoire : les cases, le total mensuel et annuel
     recalculé, `options=` de l'adresse, ce qui part au serveur, les six refus nouveaux ;
   · « Mon espace » : les options servies viennent d'un champ à part que donne le serveur, jamais de la chaîne de la
     formule, et jamais d'un dossier sans formule ou suspendu.

   ⚠️ Le prix d'une option est celui de sa grille, le corps ne porte que des CLÉS : le serveur en tire tarifs, quantités et
   cycle (une valeur du corps ne décide jamais de ce qui est payé). La comparaison page ↔ serveur ↔ application ↔ site est
   `test-852` ; ici on garde la page. `test-842` garde les cinq formules de `STRIPE_PRICES`, `test-797` la forme du corps. */
'use strict';
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');
const existe = f => fs.existsSync(path.join(RACINE, f));
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
const texte = h => h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, '\'').replace(/[  ]/g, ' ').replace(/\s+/g, ' ');
const sansCommentaires = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

/* La grille du cahier des charges (SPEC-OPTIONS §1). Ce n'est pas une croyance de plus : `test-852` la compare au serveur,
   à l'application et au site ; ici elle sert à calculer le total ATTENDU sans relire la page. */
const GRILLE = { stock: 9, achats: 6, compta: 6, sanitaire: 6 };
const CLES = Object.keys(GRILLE);
const PRO = 15, BUSINESS = 25;
const MOIS_ANNEE = 10;   // deux mois offerts

/* ── le faux navigateur ─────────────────────────────────────────────────────────────────────────────────────── */
/* Un conteneur dont `innerHTML` se relit ET dont `querySelectorAll` retrouve les cases, les pastilles de cycle et de formule
   dans le balisage (comme le vrai DOM après une réécriture : des éléments NEUFS à chaque rendu). */
function conteneur(id) {
  let html = '', cache = {};
  const el = {
    id, _h: {}, style: {}, dataset: {},
    get innerHTML() { return html; }, set innerHTML(h) { html = h; cache = {}; },
    addEventListener(t, fn) { (this._h[t] = this._h[t] || []).push(fn); },
    querySelectorAll(sel) {
      if (cache[sel]) return cache[sel];
      const mk = (dataset, extra) => Object.assign({ dataset, _h: {}, focusCount: 0, addEventListener(t, fn) { (this._h[t] = this._h[t] || []).push(fn); }, focus() { this.focusCount++; } }, extra || {});
      let r = [];
      if (sel === '[data-option]') for (const m of html.matchAll(/<input type="checkbox" data-option="(\w+)"( checked)?>/g)) r.push(mk({ option: m[1] }, { checked: !!m[2] }));
      else if (sel === '.cycle') for (const m of html.matchAll(/<button class="cycle[^"]*" data-cycle="(\w+)"/g)) r.push(mk({ cycle: m[1] }));
      else if (sel === '.puce-formule') for (const m of html.matchAll(/<button class="puce-formule[^"]*" data-formule="(\w+)"/g)) r.push(mk({ formule: m[1] }));
      return (cache[sel] = r);
    },
    querySelector(sel) { const m = /^\[data-option="(\w+)"\]$/.exec(sel); return m ? (el.querySelectorAll('[data-option]').find(x => x.dataset.option === m[1]) || null) : null; },
    blur() {}, focus() {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }
  };
  return el;
}

/* La page, exécutée. `reponse(corps)` rend { status, body } pour le paiement ; `ids` : les tarifs d'options à poser dans
   la COPIE (clé → [mensuel, annuel]) — la page EN SERVICE n'en reçoit aucun. */
function executer(PAGE, recherche, o) {
  o = o || {};
  const bloc = [...PAGE.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(b => b.includes('const FORMULES = {'));
  if (!bloc) return null;
  let code = bloc;
  for (const [k, [m, a]] of Object.entries(o.ids || {})) {
    const motif = new RegExp('(^  ' + k + ':\\s+\\{ mensuel: \')(\', annuel: \')(\' \\})', 'm');
    if (!motif.test(code)) throw new Error('banc : ligne STRIPE_PRICES_OPTIONS.' + k + ' introuvable');
    code = code.replace(motif, (_, a1, a2, a3) => a1 + m + a2 + a + a3);
  }
  const conteneurs = {}, derniers = {}, envoye = [], urls = [];
  const nouveau = id => (derniers[id] = conteneur(id));
  const document = { title: '', querySelectorAll() { return []; }, querySelector() { return null; },
    getElementById(id) { return /^(selecteurFormules|carteDroits|cartePaiement)$/.test(id) ? (conteneurs[id] || (conteneurs[id] = conteneur(id))) : nouveau(id); } };
  const window = { location: { search: recherche, href: '', hostname: 'localhost' } };
  const fetchFaux = async (url, opts) => {
    if (/\/api\/compte\/moi$/.test(url)) return { ok: true, status: 200, json: async () => ({ ok: true, compte: { email: 'paie@entreprise-banc.fr', prenom: 'Camille', nom: 'Banc', verifie: true } }) };
    const corps = JSON.parse(opts.body); envoye.push({ url, corps });
    const r = o.reponse ? o.reponse(corps) : { status: 200, body: { url: 'https://checkout.stripe.com/c/banc' } };
    return { ok: r.status < 300, status: r.status, json: async () => r.body };
  };
  const api = new Function('window', 'document', 'history', 'localStorage', 'fetch', 'alert',
    code + '\n;return { optionsChoisies: () => optionsChoisies.slice(), optionsDispo, optionsActives, adresseEtat, lienPortail, compteLu,'
      + ' modeAjout: () => modeAjout, etat: () => ({ compteMsg, formuleActive, cycleAnnuel, nbUsersVoulu }), OPTIONS_GESTION, STRIPE_PRICES, STRIPE_PRICES_OPTIONS, FORMULES };')(
    window, document, { replaceState(a, b, u) { urls.push(u); } },
    { getItem: k => (k === 'teamop_portail_jeton' ? 'e'.repeat(64) : k === 'elan_sync_team' ? (o.sansEspace ? null : 'entreprise-banc-1a2b') : null), removeItem() {} }, fetchFaux, () => {});
  const html = () => conteneurs.cartePaiement.innerHTML;
  const cases = () => conteneurs.cartePaiement.querySelectorAll('[data-option]');
  const clicCase = k => { const c = cases().find(x => x.dataset.option === k); c.checked = !c.checked; for (const h of c._h.change || []) h(); return c; };
  const clicCycle = nom => { for (const h of conteneurs.cartePaiement.querySelectorAll('.cycle').find(x => x.dataset.cycle === nom)._h.click) h(); };
  const clicFormule = k => { for (const h of conteneurs.selecteurFormules.querySelectorAll('.puce-formule').find(x => x.dataset.formule === k)._h.click) h(); };
  const payer = async () => { await derniers.btnPayer._h.click[0](); };
  /* les lignes de prix affichées : [libellé, montant] — le total et la remise ne comptent pas comme des lignes d'achat */
  const lignes = () => [...html().matchAll(/<div class="ligne-prix( total)?"[^>]*>\s*<span>([^<]*)<\/span>\s*<span>([^<]*)<\/span>/g)]
    .map(m => ({ total: !!m[1], libelle: texte(m[2]), montant: parseInt(texte(m[3]).replace(/[^\d−-]/g, '').replace('−', '-'), 10) }));
  return { api, derniers, envoye, urls, window, html, paiement: () => texte(html()), droits: () => texte(conteneurs.carteDroits.innerHTML),
    cases, clicCase, clicCycle, clicFormule, payer, lignes };
}

/* attendu : ce que la page doit afficher pour n abonnements, ces options, ce cycle — calculé ICI, pas relu dans la page */
const attendu = (n, opts, annuel) => (PRO + opts.reduce((t, k) => t + GRILLE[k], 0)) * (annuel ? MOIS_ANNEE : 1) * n;
const ids = cles => Object.fromEntries(cles.map(k => [k, ['price_banc_' + k + '_m', 'price_banc_' + k + '_a']]));

const PAGES = ['recap-abonnement.html', 'apercu/recap-abonnement.html'].filter(existe);
(async () => {
  console.log('\n── 853 · les options du Pro : page de paiement et « Mon espace » ──');
  vrai('population : ' + PAGES.length + ' pages de paiement relues (racine et aperçu)', PAGES.length === 2);

  for (const f of PAGES) {
    console.log('1. ' + f + ' — EN SERVICE : identifiants vides, aucune case');
    const PAGE = lire(f);
    const S = executer(PAGE, '?formule=pro&options=stock,achats&utilisateurs=3');
    vrai('le script de la page s\'exécute', !!S);
    await S.api.compteLu;
    v('population : les quatre options de la grille, avec leurs prix', Object.fromEntries(Object.entries(S.api.OPTIONS_GESTION).map(([k, o]) => [k, o.prixMensuel])), GRILLE);
    v('⛔ le registre sanitaire a pour clé « sanitaire » (« registre » est déjà une vue de l\'application) et il est du métier 3D',
      [Object.keys(S.api.OPTIONS_GESTION).includes('registre'), S.api.OPTIONS_GESTION.sanitaire.metier3d, Object.keys(S.api.OPTIONS_GESTION).filter(k => S.api.OPTIONS_GESTION[k].metier3d)], [false, true, ['sanitaire']]);
    /* le nombre de cases attendu se calcule depuis les identifiants réellement posés : tant qu'ils sont vides, zéro ; le jour où
       Justin les colle, ce contrôle ne bouge pas de lui-même, il suit */
    const posees = CLES.filter(k => { const t = S.api.STRIPE_PRICES_OPTIONS[k] || {}; return /^price_\w+$/.test(t.mensuel) && /^price_\w+$/.test(t.annuel); });
    v('une option n\'a une case que si ses DEUX tarifs sont posés', S.cases().map(c => c.dataset.option), posees);
    console.log('   (identifiants posés dans la page : ' + (posees.length ? posees.join(', ') : 'aucun') + ')');
    if (!posees.length) {
      vrai('⛔ aucune case, aucun bloc d\'options, aucune promesse « en option » : la page ne vend pas ce que l\'application n\'ouvre pas encore',
        !/data-option|OPTIONS DU PRO|bloc-options/.test(S.html()) && !/en option|Toutes les options/.test(S.paiement() + ' ' + S.droits()));
      v('… l\'adresse demandait pourtant stock et achats : le panier d\'adresse ne passe pas, 3 utilisateurs en Pro = 45 €', [S.api.optionsActives(), S.paiement().includes('45 € TTC')], [[], true]);
      vrai('… la ligne « Non inclus » de Pro dit toujours « disponibles dès la formule Business » (vraie : rien d\'autre ne se vend)', S.droits().includes('disponibles dès la formule Business') && !S.droits().includes('en option avec le Pro'));
      await S.payer();
      v('⛔ « Payer » part avec options: [] — le corps d\'avant les options, plus un champ vide', [S.envoye[0].corps.options, S.envoye[0].corps.price, S.envoye[0].corps.quantity], [[], S.api.STRIPE_PRICES.pro.mensuel, 3]);
      const B = executer(PAGE, '?formule=business&utilisateurs=2'); await B.api.compteLu;
      vrai('Business, en service : pas de ligne « Toutes les options sont incluses » (il n\'y a pas d\'option à vendre)', !B.paiement().includes('Toutes les options'));
    }
  }

  for (const f of PAGES) {
    console.log('2. ' + f + ' — avec des identifiants FACTICES posés dans une copie : les cases et le total');
    const PAGE = lire(f);
    const T = (adr, o) => executer(PAGE, adr, Object.assign({ ids: ids(CLES) }, o || {}));
    const a = T('?formule=pro'); await a.api.compteLu;
    v('quatre cases, dans l\'ordre de la grille, aucune cochée', [a.cases().map(c => c.dataset.option), a.cases().filter(c => c.checked).length], [CLES, 0]);
    vrai('population : le total d\'un Pro sans option est celui d\'avant (15 €)', a.paiement().includes('15 € TTC') && !a.paiement().includes('Formule Pro +'));
    const txt = a.paiement();
    vrai('chaque case dit son libellé et son prix par utilisateur (+ 9 € / mois, + 6 € / mois)', ['Stock', 'Achats fournisseurs', 'Encaissements et compta', 'Registre sanitaire (métier 3D)'].every(l => txt.includes(l)) && txt.includes('+ 9 € / mois') && (txt.match(/\+ 6 € \/ mois/g) || []).length === 3);
    vrai('le registre sanitaire se dit « métier 3D » à l\'écran', txt.includes('Registre sanitaire (métier 3D)'));
    vrai('la ligne « Non inclus » de Pro devient vraie : « en option avec le Pro — inclus dans Business »', a.droits().includes('en option avec le Pro') && !a.droits().includes('disponibles dès la formule Business'));

    // l'adresse venue de l'application : deux options cochées, 30 € pour un utilisateur
    const b = T('?formule=pro&options=stock,achats'); await b.api.compteLu;
    v('options=stock,achats dans l\'adresse : les deux cases sont cochées', b.cases().filter(c => c.checked).map(c => c.dataset.option), ['stock', 'achats']);
    vrai('… total = 15 + 9 + 6 = 30 € TTC, « Formule Pro + 2 options »', b.paiement().includes('30 € TTC') && b.paiement().includes('Formule Pro + 2 options · 1 utilisateur par abonnement'));
    vrai('… une ligne par option : « Option Stock » 9 €, « Option Achats fournisseurs » 6 €', b.lignes().some(l => l.libelle === 'Option Stock' && l.montant === 9) && b.lignes().some(l => l.libelle === 'Option Achats fournisseurs' && l.montant === 6));
    v('… et les lignes ne mentent pas : leur somme est le total affiché', [b.lignes().filter(l => !l.total).reduce((t, l) => t + l.montant, 0), b.lignes().find(l => l.total).montant], [30, 30]);
    // la forme qui survit au portail (« . »)
    const p = T('?formule=pro&options=stock.compta'); await p.api.compteLu;
    v('options=stock.compta (la forme du retour du portail) se lit pareil', p.api.optionsActives(), ['stock', 'compta']);
    // clés inventées, doublons, mots proches
    const m = T('?formule=pro&options=stock,stock,registre,__proto__,constructor,STOCK,sanit'); await m.api.compteLu;
    v('⛔ une clé inventée, « registre », une casse ou une moitié de clé n\'entre jamais dans le panier ; un doublon compte une fois', m.api.optionsActives(), ['stock']);
    // le geste : cocher, décocher
    b.clicCase('compta');
    v('cocher « compta » : le panier suit, l\'écran se redessine (36 €) et l\'adresse suit', [b.api.optionsActives(), b.paiement().includes('36 € TTC'), b.urls[b.urls.length - 1]], [['stock', 'achats', 'compta'], true, '?formule=pro&options=stock,achats,compta']);
    vrai('… le clavier garde sa place : la case cochée reprend le focus après le redessin', b.cases().find(c => c.dataset.option === 'compta').focusCount === 1);
    b.clicCase('stock');
    v('décocher « stock » : 15 + 6 + 6 = 27 €', [b.api.optionsActives(), b.paiement().includes('27 € TTC')], [['achats', 'compta'], true]);
    vrai('⛔ cohérence voulue : Pro + 2 options (27 €) coûte PLUS que Business (25 €), et Pro + Stock (24 €) MOINS', attendu(1, ['achats', 'compta']) > BUSINESS && attendu(1, ['stock']) < BUSINESS);
    b.clicCase('achats'); b.clicCase('compta');
    v('tout décoché : 15 €, plus de « + options », plus d\'option dans l\'adresse', [b.paiement().includes('15 € TTC'), b.paiement().includes('Formule Pro +'), b.urls[b.urls.length - 1]], [true, false, '?formule=pro']);

    // plusieurs utilisateurs : chaque option a la quantité de la formule
    const n = T('?formule=pro&options=stock&utilisateurs=3'); await n.api.compteLu;
    vrai('3 utilisateurs, Pro + Stock : 3 × (15 + 9) = 72 €, et la ligne « Option Stock × 3 » = 27 €', n.paiement().includes(attendu(3, ['stock']) + ' € TTC') && n.lignes().some(l => l.libelle === 'Option Stock × 3' && l.montant === 27));
    // à l'année : dix mois
    n.clicCycle('annuel');
    v('à l\'année : 3 × (15 + 9) × 10 = 720 €, remise annuelle = 2 mois de tout (− 144 €), total annuel', [n.paiement().includes(attendu(3, ['stock'], true) + ' € TTC'), n.paiement().includes('Total annuel'), n.lignes().find(l => /Remise annuelle/.test(l.libelle)).montant], [true, true, -144]);
    v('… et les lignes ne mentent pas non plus à l\'année (formule 540 + option 324 − remise 144 = 720)', [n.lignes().filter(l => !l.total).reduce((t, l) => t + l.montant, 0), n.lignes().find(l => l.total).montant], [720, 720]);
    vrai('… chaque case dit son prix À L\'ANNÉE (+ 90 € / an pour Stock)', n.paiement().includes('+ 90 € / an'));
    vrai('… « soit » par utilisateur et par mois : 24 × 10 / 12 = 20 €', n.paiement().includes('soit 20 € / mois par utilisateur'));
    n.clicCycle('mensuel');
    vrai('retour au mensuel : 72 €', n.paiement().includes('72 € TTC'));
    // toutes les combinaisons : le total affiché est celui de la grille, mensuel et annuel
    let ecarts = [];
    for (let mask = 0; mask < 16; mask++) {
      const cles = CLES.filter((k, i) => mask & (1 << i));
      for (const annuel of [false, true]) {
        const t = T('?formule=pro&utilisateurs=2' + (annuel ? '&cycle=annuel' : '') + (cles.length ? '&options=' + cles.join(',') : '')); await t.api.compteLu;
        if (!t.paiement().includes(attendu(2, cles, annuel) + ' € TTC')) ecarts.push([cles.join('+') || '(rien)', annuel ? 'annuel' : 'mensuel']);
      }
    }
    v('⛔ les 16 paniers × 2 cycles : le total affiché est celui de la grille (2 utilisateurs)', ecarts, []);

    // ce qui part au serveur
    const e = T('?formule=pro&options=achats,stock&utilisateurs=4'); await e.api.compteLu;
    await e.payer();
    const corps = e.envoye[0].corps;
    v('⛔ « Payer » : des CLÉS d\'option dans l\'ordre de la grille, le tarif de la FORMULE, la quantité', [corps.options, corps.price, corps.quantity], [['stock', 'achats'], e.api.STRIPE_PRICES.pro.mensuel, 4]);
    v('⛔ le corps ne porte rien d\'autre : ni tarif d\'option, ni montant, ni total (une valeur du corps ne décide pas de ce qui est payé)', Object.keys(corps).sort(), ['options', 'price', 'quantity', 'ref']);
    vrai('… et aucun identifiant d\'option ne voyage', !JSON.stringify(corps).includes('price_banc_'));
    e.clicCycle('annuel'); await e.payer();
    v('à l\'année : le tarif annuel de la formule, les mêmes clés', [e.envoye[1].corps.price, e.envoye[1].corps.options], [e.api.STRIPE_PRICES.pro.annuel, ['stock', 'achats']]);
    // le chemin du portail garde le panier
    const lien = e.api.lienPortail();
    const retour = decodeURIComponent(lien.split('?retour=')[1]);
    v('le chemin vers le portail garde le panier (séparateur « . »)', retour, 'recap-abonnement.html?formule=pro&utilisateurs=4&cycle=annuel&options=stock.achats');
    for (const ef of ['espace.html', 'apercu/espace.html'].filter(existe)) {
      const mR = /const RETOUR_PAIEMENT=\(\(\)=>\{ try\{ const r=new URLSearchParams\(location\.search\)\.get\('retour'\)\|\|''; return (\/.*?\/)\.test\(r\)\?r:''; \}/.exec(lire(ef));
      vrai('⛔ ' + ef + ' accepte ce retour avec les options (sinon on ne revient jamais payer)', mR && new Function('return ' + mR[1])().test(retour));
    }
    const r2 = T('?' + retour.split('?')[1]); await r2.api.compteLu;
    v('… et la page les relit au retour', [r2.api.optionsActives(), r2.api.etat().cycleAnnuel, r2.api.etat().nbUsersVoulu], [['stock', 'achats'], true, 4]);

    // Business et Premium : tout est inclus, le panier ne les suit pas
    for (const formule of ['business', 'premium']) {
      const bz = T('?formule=' + formule + '&options=stock,compta&utilisateurs=2'); await bz.api.compteLu;
      v('⛔ ' + formule + ' : aucune case, panier vide malgré l\'adresse, « Toutes les options sont incluses »', [bz.cases().length, bz.api.optionsActives(), bz.paiement().includes('Toutes les options sont incluses')], [0, [], true]);
      v('… et le total est celui de la formule seule', bz.paiement().includes((formule === 'business' ? 50 : 100) + ' € TTC'), true);
      await bz.payer();
      v('… « Payer » envoie options: [] (le serveur refuse d\'ailleurs des options hors Pro : option_incluse)', bz.envoye[0].corps.options, []);
    }
    // le panier ne suit pas la formule
    const s = T('?formule=pro&options=stock,achats'); await s.api.compteLu;
    s.clicFormule('business');
    v('Pro + options → Business : le panier est vidé, l\'adresse n\'en porte plus', [s.api.optionsActives(), s.api.optionsChoisies(), s.urls[s.urls.length - 1]], [[], [], '?formule=business']);
    s.clicFormule('pro');
    v('… et en revenant sur Pro, il ne ressuscite pas', [s.cases().filter(c => c.checked).length, s.paiement().includes('15 € TTC')], [0, true]);
    // les formules OP MESSAGES : aucune case (et fermées de toute façon)
    const mg = T('?formule=msgpro&options=stock'); await mg.api.compteLu;
    v('OP MESSAGES : aucune option, aucune case', [mg.cases().length, mg.api.optionsActives()], [0, []]);

    // un tarif à moitié posé : pas de case
    const demi = executer(PAGE, '?formule=pro&options=stock,achats', { ids: { stock: ['price_banc_stock_m', 'price_banc_stock_a'] } });
    await demi.api.compteLu;
    v('seul « stock » a ses deux tarifs : une seule case ; « achats » demandé dans l\'adresse ne passe pas', [demi.cases().map(c => c.dataset.option), demi.api.optionsActives()], [['stock'], ['stock']]);
    const sansAnnuel = executer(PAGE.replace(/^  achats:\s+\{ mensuel: '', annuel: '' \}/m, "  achats:    { mensuel: 'price_banc_achats_m', annuel: '' }"), '?formule=pro&options=achats'); await sansAnnuel.api.compteLu;
    v('⛔ un tarif MENSUEL seul ne suffit pas (la case suit le cycle, un annuel manquant ferait échouer le paiement) : pas de case', [sansAnnuel.cases().length, sansAnnuel.api.optionsActives()], [0, []]);
    vrai('… la table des options est séparée des formules : STRIPE_PRICES garde ses cinq clés', Object.keys(a.api.STRIPE_PRICES).join() === 'pro,business,premium,msgpro,msgpremium');

    // les six refus
    const REFUS = [
      [400, 'option_inconnue', /n'existe plus/], [400, 'option_indisponible', /pas encore en vente/], [400, 'option_incluse', /incluent déjà toutes les options/],
      [409, 'entreprise_requise', /il faut l'entreprise concernée/], [409, 'formule_requise', /abonnement Pro déjà payé/], [409, 'option_deja', /déjà active/] ];
    for (const [statut, code, motif] of REFUS) {
      const r = T('?formule=pro&options=stock', { reponse: () => ({ status: statut, body: { error: code } }) }); await r.api.compteLu;
      await r.payer();
      const msg = r.api.etat().compteMsg || {};
      v('refus ' + statut + ' « ' + code + ' » : un message qui le dit, « rien n\'a été payé », sans redirection', [motif.test(msg.texte || ''), /Rien n'a été payé/.test(msg.texte || ''), r.window.location.href], [true, true, '']);
      const faux = T('?formule=pro&options=stock', { reponse: () => ({ status: statut === 400 ? 409 : 400, body: { error: code } }) }); await faux.api.compteLu; await faux.payer();
      vrai('   … et le même code sous un autre statut n\'est PAS pris pour lui (message générique)', /n'a pas pu s'ouvrir/.test((faux.api.etat().compteMsg || {}).texte || ''));
    }
    const ti = T('?formule=pro', { reponse: () => ({ status: 400, body: { error: 'tarif_inconnu' } }) }); await ti.api.compteLu; await ti.payer();
    vrai('« tarif_inconnu » garde son message d\'avant (rechargez la page)', /Ce tarif n'est plus proposé/.test((ti.api.etat().compteMsg || {}).texte || ''));
    // un refus ne survit pas au geste suivant
    const rf = T('?formule=pro&options=stock', { reponse: () => ({ status: 400, body: { error: 'option_indisponible' } }) }); await rf.api.compteLu; await rf.payer();
    vrai('un refus affiché disparaît quand on change le panier (il visait l\'autre)', (rf.api.etat().compteMsg, rf.clicCase('achats'), rf.api.etat().compteMsg === null));

    /* ══ LE MODE « AJOUT » (1er octobre 2026, relecture d'intégration) ══════════════════════════════════════════════════
       Le lien de l'application (`?formule=pro&ajout=options&options=stock`) menait à une page qui envoyait TOUJOURS un `price` : un
       client déjà en Pro y aurait acheté un SECOND abonnement Pro. En mode ajout la page ne choisit ni formule, ni nombre, ni cycle :
       elle n'envoie que des CLÉS et la référence de l'entreprise — le serveur ajoute l'option au Pro payé, pour chaque utilisateur. */
    console.log('2b. ' + f + ' — le mode « ajout » : ni price, ni quantity, ni cycle');
    const A = (adr, o) => T(adr, o);
    const aj = A('?formule=pro&ajout=options&options=stock,achats'); await aj.api.compteLu;
    v('le mode est lu, la formule est Pro', [aj.api.modeAjout(), aj.api.etat().formuleActive], [true, 'pro']);
    vrai('⛔ la page DIT ce qu\'elle fait : « ajoutée à votre abonnement Pro, pour chaque utilisateur »', /ajoutée à votre abonnement Pro, pour chaque utilisateur/.test(aj.paiement()));
    v('les deux options de l\'adresse sont cochées, quatre cases en tout', [aj.cases().map(c => c.dataset.option), aj.cases().filter(c => c.checked).map(c => c.dataset.option)], [CLES, ['stock', 'achats']]);
    vrai('⛔ AUCUN choix de formule, de nombre d\'utilisateurs ni de cycle (le serveur lit le Pro de l\'entreprise)', !/COMBIEN D'UTILISATEURS/.test(aj.paiement()) && aj.html().indexOf('id="nbUsers"') < 0 && aj.html().indexOf('data-cycle=') < 0 && aj.html().indexOf('class="ligne-prix') < 0 && aj.cases().length === 4);
    vrai('… ni de total : le nombre de places ne se connaît pas ici', !/Total (mensuel|annuel)/.test(aj.paiement()) && !/ TTC/.test(aj.paiement()));
    vrai('chaque case dit son prix par utilisateur, au mois et à l\'année (dix mois)', /\+ 9 € \/ mois · 90 € \/ an/.test(aj.paiement()) && /\+ 6 € \/ mois · 60 € \/ an/.test(aj.paiement()));
    await aj.payer();
    v('⛔⛔ le corps envoyé : des CLÉS et la RÉFÉRENCE de l\'entreprise, RIEN d\'autre (ni price, ni quantity, ni cycle)',
      [aj.envoye.length, Object.keys(aj.envoye[0].corps).sort(), aj.envoye[0].corps.options, aj.envoye[0].corps.ref], [1, ['options', 'ref'], ['stock', 'achats'], 'entreprise-banc-1a2b']);
    v('   et il part à la bonne route', aj.envoye[0].url.replace(/^https:\/\/api\.teamop\.fr/, ''), '/api/stripe/checkout');
    v('   la page de paiement de Stripe s\'ouvre (la réponse du serveur)', aj.window.location.href, 'https://checkout.stripe.com/c/banc');
    // l'adresse suit le panier, sans nombre ni cycle
    aj.clicCase('compta');
    v('cocher « compta » : l\'adresse garde le mode ajout et le panier', aj.urls[aj.urls.length - 1], '?formule=pro&ajout=options&options=stock,achats,compta');
    // un nombre et un cycle de l'adresse ne servent à rien
    const aj2 = A('?formule=pro&ajout=options&options=stock&utilisateurs=5&cycle=annuel'); await aj2.api.compteLu; await aj2.payer();
    v('⛔ `utilisateurs=5` et `cycle=annuel` de l\'adresse ne passent PAS : le corps reste des clés et la référence', Object.keys(aj2.envoye[0].corps).sort(), ['options', 'ref']);
    // le lien du portail garde le mode
    vrai('« Créer mon compte pour payer » : le retour du portail garde le mode ajout et le panier', decodeURIComponent(aj.api.lienPortail().split('?retour=')[1]) === 'recap-abonnement.html?formule=pro&ajout=options&options=stock.achats.compta');
    // la formule de l'adresse ne compte pas : le mode ajout est Pro
    const ajB = A('?formule=business&ajout=options&options=stock'); await ajB.api.compteLu;
    v('⛔ `formule=business` avec le mode ajout : Pro quand même (une option ne s\'ajoute qu\'au Pro)', [ajB.api.modeAjout(), ajB.api.etat().formuleActive], [true, 'pro']);
    const ajX = A('?formule=pro&ajout=autre&options=stock'); await ajX.api.compteLu;
    v('une autre valeur de `ajout` : la page normale', [ajX.api.modeAjout(), /COMBIEN D'UTILISATEURS/.test(ajX.paiement())], [false, true]);
    // sans option cochée, sans entreprise : rien ne part
    const ajV = A('?formule=pro&ajout=options'); await ajV.api.compteLu; await ajV.payer();
    v('⛔ aucune option cochée : rien ne part, la page le dit', [ajV.envoye.length, /Cochez au moins une option/.test((ajV.api.etat().compteMsg || {}).texte || '')], [0, true]);
    const ajE = A('?formule=pro&ajout=options&options=stock', { sansEspace: true }); await ajE.api.compteLu;
    vrai('sans entreprise sur l\'appareil : la page dit d\'ouvrir depuis l\'application', /Ouvrez cette page depuis votre application/.test(ajE.paiement()));
    await ajE.payer();
    v('⛔ … et `ref` est OBLIGATOIRE : rien ne part sans elle, le message dit « entreprise concernée »', [ajE.envoye.length, /il faut l'entreprise concernée/.test((ajE.api.etat().compteMsg || {}).texte || '')], [0, true]);
    // tarifs vides : la page en service ne vend rien
    const ajS = executer(PAGE, '?formule=pro&ajout=options&options=stock'); await ajS.api.compteLu;
    v('⛔ identifiants VIDES (la page en service) : aucune case, « pas encore en vente », bouton grisé', [ajS.cases().length, /ne sont pas encore en vente/.test(ajS.paiement()), /id="btnPayer"[^>]*disabled/.test(ajS.html())], [0, true, true]);
    await ajS.payer();
    v('   … et même forcé, rien ne part', ajS.envoye.length, 0);
    // les six refus, dits en mode ajout
    const REFUS_AJ = [
      [400, 'option_inconnue', /n'existe plus/], [400, 'option_indisponible', /pas encore en vente/], [400, 'option_incluse', /incluent déjà toutes les options/],
      [409, 'entreprise_requise', /il faut l'entreprise concernée/], [409, 'option_deja', /déjà active/]];
    for (const [statut, code, motif] of REFUS_AJ) {
      const r = A('?formule=pro&ajout=options&options=stock', { reponse: () => ({ status: statut, body: { error: code } }) }); await r.api.compteLu; await r.payer();
      const msg = r.api.etat().compteMsg || {};
      v('refus ' + statut + ' « ' + code + ' » en mode ajout : dit, « rien n\'a été payé », pas de redirection, la page reste en mode ajout', [motif.test(msg.texte || ''), /Rien n'a été payé/.test(msg.texte || ''), r.window.location.href, r.api.modeAjout()], [true, true, '', true]);
    }
    const fr = A('?formule=pro&ajout=options&options=stock', { reponse: () => ({ status: 409, body: { error: 'formule_requise' } }) }); await fr.api.compteLu; await fr.payer();
    v('⛔ `formule_requise` en mode ajout (pas de Pro payé) : la page revient à la page normale, même panier, et le dit',
      [fr.api.modeAjout(), /choisissez ci-dessous Pro avec ses options/.test((fr.api.etat().compteMsg || {}).texte || ''), /Rien n'a été payé/.test((fr.api.etat().compteMsg || {}).texte || ''), fr.cases().filter(c => c.checked).map(c => c.dataset.option), fr.urls[fr.urls.length - 1]],
      [false, true, true, ['stock'], '?formule=pro&options=stock']);
    // la page normale : Pro déjà payé + options → le serveur refuse `utiliser_ajout`, la page bascule en mode ajout
    const ua = A('?formule=pro&options=stock,compta&utilisateurs=2', { reponse: b => (b.price ? { status: 409, body: { error: 'utiliser_ajout' } } : { status: 200, body: { url: 'https://checkout.stripe.com/c/ajout-banc' } }) }); await ua.api.compteLu; await ua.payer();
    v('⛔⛔ `utiliser_ajout` (Pro déjà payé, option demandée avec un second Pro) : la page bascule en MODE AJOUT, même panier, et le dit',
      [ua.api.modeAjout(), /ajoute, pour chaque utilisateur, au lieu d'un second abonnement Pro/.test((ua.api.etat().compteMsg || {}).texte || ''), /Rien n'a été payé/.test((ua.api.etat().compteMsg || {}).texte || ''), ua.urls[ua.urls.length - 1]],
      [true, true, true, '?formule=pro&ajout=options&options=stock,compta']);
    vrai('   … et le message est AFFICHÉ sur la page redessinée', /Votre entreprise a déjà un abonnement Pro/.test(ua.paiement()) && /ajoutée à votre abonnement Pro, pour chaque utilisateur/.test(ua.paiement()));
    await ua.payer();
    v('⛔ … le second clic envoie le corps de l\'ajout (clés + référence), le premier portait price et quantity', [ua.envoye.length, Object.keys(ua.envoye[0].corps).sort(), Object.keys(ua.envoye[1].corps).sort()], [2, ['options', 'price', 'quantity', 'ref'], ['options', 'ref']]);
    v('   … et la page de paiement de Stripe s\'ouvre', ua.window.location.href, 'https://checkout.stripe.com/c/ajout-banc');
    // ⛔ le suivi d'office se DIT avant de payer (`options_suivent`, 1er octobre 2026) : la page coche les options, remet le total à jour, rien n'est parti
    const os = A('?formule=pro&utilisateurs=2', { reponse: b => ((b.options || []).includes('stock') ? { status: 200, body: { url: 'https://checkout.stripe.com/c/suivent-banc' } } : { status: 409, body: { error: 'options_suivent', options: ['stock'], surcout: 18, cycle: 'mensuel' } }) }); await os.api.compteLu;
    const avant = os.paiement().match(/Total mensuel\s*(\d+) € TTC/);
    await os.payer();
    const msgOs = (os.api.etat().compteMsg || {}).texte || '';
    const apres = os.paiement().match(/Total mensuel\s*(\d+) € TTC/);
    v('⛔⛔ `options_suivent` : la page COCHE l\'option qui suit, le dit avec son surcoût, « rien n\'a été payé », pas de redirection, pas de mode ajout',
      [os.cases().filter(c => c.checked).map(c => c.dataset.option), /L'option Stock est déjà active pour votre entreprise : elle suit vos nouveaux utilisateurs \(18\u00a0€ TTC par mois en plus de la formule\)/.test(msgOs), /Rien n'a été payé/.test(msgOs), os.window.location.href, os.api.modeAjout(), os.envoye.length],
      [['stock'], true, true, '', false, 1]);
    v('   le TOTAL affiché compte désormais l\'option (2 × (15 + 9) = 48 € au lieu de 30 €) : le client le lit AVANT de valider', [avant && avant[1], apres && apres[1]], ['30', '48']);
    await os.payer();
    v('⛔ … le second clic les DEMANDE (options: [stock]) et la page de paiement de Stripe s\'ouvre', [os.envoye.length, os.envoye[1].corps.options, os.window.location.href], [2, ['stock'], 'https://checkout.stripe.com/c/suivent-banc']);
    const oi = A('?formule=pro&utilisateurs=2', { reponse: () => ({ status: 409, body: { error: 'options_suivent', options: ['inconnue'], surcout: 5, cycle: 'mensuel' } }) }); await oi.api.compteLu; await oi.payer();
    v('   une option que la page ne connaît pas : dit, jamais de boucle silencieuse (rien n\'est coché, rien n\'est parti de plus)', [oi.cases().filter(c => c.checked).length, /ne sait pas les afficher/.test((oi.api.etat().compteMsg || {}).texte || ''), oi.window.location.href], [0, true, '']);
  }

  /* ── 3. « Mon espace » : les options servies, d'un champ à part ─────────────────────────────────────────── */
  console.log('3. espace.html — « Mon espace » dit les options que le serveur sert');
  for (const f of ['espace.html', 'apercu/espace.html'].filter(existe)) {
    const E = lire(f), CODE = sansCommentaires(E);
    const ligne = nom => { const i = E.indexOf('function ' + nom + '('); return i < 0 ? '' : E.slice(i, E.indexOf('\n', i)); };
    const lPlan = ligne('planNom'), lOpt = ligne('optionsServies');
    vrai(f + ' : planNom et optionsServies sont trouvées (une tranche vide passerait sur tout)', lPlan.length > 40 && lOpt.length > 40);
    const optionsServies = new Function(lPlan + '\n' + lOpt + '\nreturn optionsServies;')();
    v('formule Pro, deux libellés : les deux', optionsServies({ plan: 'Pro', planStatus: 'actif', options: ['Stock', 'Achats fournisseurs'] }), ['Stock', 'Achats fournisseurs']);
    v('en essai : elles se disent aussi', optionsServies({ plan: 'Pro', planStatus: 'essai', options: ['Stock'] }), ['Stock']);
    v('⛔ SANS formule, une option ne vaut rien : rien', optionsServies({ plan: '', options: ['Stock'] }), []);
    v('⛔ « Gratuit » / « Découverte » : pas de formule, donc rien', [optionsServies({ plan: 'Gratuit', options: ['Stock'] }), optionsServies({ plan: 'Découverte', options: ['Stock'] })], [[], []]);
    v('⛔ suspendu : rien (l\'accès est suspendu, ce n\'est pas le moment de vanter des options)', optionsServies({ plan: 'Pro', planStatus: 'suspendu', options: ['Stock'] }), []);
    v('absent, ou autre chose qu\'un tableau : rien', [optionsServies({ plan: 'Pro' }), optionsServies({ plan: 'Pro', options: 'Stock' }), optionsServies({ plan: 'Pro', options: { 0: 'Stock' } }), optionsServies(null)], [[], [], [], []]);
    v('autre chose que des textes, ou du vide : écarté', optionsServies({ plan: 'Pro', options: ['Stock', 4, null, {}, '  ', ' Achats fournisseurs '] }), ['Stock', 'Achats fournisseurs']);
    v('au plus quatre (la grille n\'en a que quatre), chacune bornée', [optionsServies({ plan: 'Pro', options: ['a', 'b', 'c', 'd', 'e', 'f'] }).length, optionsServies({ plan: 'Pro', options: ['x'.repeat(200)] })[0].length], [4, 60]);
    const iV = CODE.indexOf("v==='abo'"), vueAbo = CODE.slice(iV, CODE.indexOf("v==='docs'", iV));
    vrai(f + ' : la vue « Mon abonnement » lit optionsServies(d) et échappe chaque libellé (esc)', iV > 0 && /optionsServies\(d\)/.test(vueAbo) && /\$\{esc\(x\)\}/.test(vueAbo));
    const iC = CODE.indexOf('function cliResume('), resume = CODE.slice(iC, CODE.indexOf('function cliSync(', iC));
    vrai('⛔ ' + f + ' : la demande envoyée au serveur (cliResume) ne porte jamais d\'options — ce qu\'on lit n\'est pas ce qu\'on dit', iC > 0 && !/\boptions\b/.test(resume));
    vrai('⛔ planNom ne lit pas les options : une option ne passe jamais pour une formule', !/options/.test(lPlan));
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a jeté : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });

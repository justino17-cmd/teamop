/* ⛔ CE QUE CE FICHIER GARDE — UN ABONNEMENT = UN UTILISATEUR.

   Justin, 27 septembre 2026 au soir : « Aussi à faire sur le site à partir d'aujourd'hui c'est 1 utilisateur par
   abonnement merci de corriger ça ». Jusque-là, le site vendait 2 utilisateurs par abonnement Business et 3 en
   Business Premium (et en Messages Business Premium), et la page de paiement DIVISAIT le nombre de personnes par ces
   chiffres pour compter les abonnements : sept personnes en Business faisaient quatre abonnements.

   ⛔ ET LES PRIX SONT TTC. Même soir, à la question « le site dit “Prix HT par mois”, la page de paiement dit
   “175 € TTC” pour le même montant : HT ou TTC ? », Justin : « TTC ». Le pied des huit pages et l'introduction des
   tarifs disaient « Prix HT » ; une page servie qui écrirait encore « HT » pour un prix TEAM OP fait tomber le §4.

   Quatre endroits portent la règle, et ils doivent dire la même chose :
   1. les huit pages EN SERVICE (la v1 de la racine). On les relit, et on prouve qu'on n'y a touché QUE ce qui parle
      des places et de la taxe : en défaisant les retouches, on retrouve octet pour octet chacune des huit pages
      publiées le 27 septembre (`fe599df`) ;
   2. le générateur du site (v2, en aperçu) : gardé par `test-835` §3, qui déclare l'écart avec l'application ;
   3. la page de paiement — en service à la racine de `main`, au thème sur la branche, et sa copie d'aperçu. Ici on
      EXÉCUTE son vrai script, sur un faux document : ce que la page affiche, ce que font « − », « + » et le champ, et
      la quantité qu'elle envoie VRAIMENT au serveur de paiement ;
   4. les pages voisines (la page « merci » après le paiement, les mentions légales) — §1 bis. Le CONTRAT du portail,
      lui, se régénère pour les entreprises déjà abonnées : il suit l'application et change avec elle (écart déclaré, §4).

   ⚠️ L'application n'est PAS encore à la règle (`maxU` 2 et 3 dans `app.html`) : c'est une publication à part, sur la
   phrase de Justin, avec une question sur les entreprises déjà abonnées (`REPRISE.md`). D'ici là elle donne PLUS
   que ce que le site vend, jamais moins — `test-835` §3 déclare cet écart et le referme tout seul. */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const RACINE = path.join(__dirname, '..');
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');
const existe = f => fs.existsSync(path.join(RACINE, f));
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
const texte = h => h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, '\'').replace(/[  ]/g, ' ').replace(/\s+/g, ' ');
/* commentaires retirés AVANT de chercher : ce dépôt explique ses correctifs juste au-dessus du code, et un motif qui
   tomberait dans l'explication garderait une phrase, pas un comportement (CLAUDE.md). Seuls les blocs qui commencent
   une ligne sont des commentaires d'explication ici. */
const sansCommentaires = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

/* ── 1. les huit pages EN SERVICE ─────────────────────────────────────────────────────────────────────────── */
console.log('\n── 837 · un abonnement = un utilisateur, prix TTC ──');
console.log('1. les pages en service');
const N = '\u202f', NB = '\u00a0';   // l'exemple de la FAQ ne se coupe pas : « Business × 3 = 3 comptes » d'un bloc
/* les retouches du 27 septembre au soir — et RIEN d'autre : les défaire doit rendre la v1 publiée, octet pour octet.
   Les places d'abord, dans l'ordre de la page (Pro, Business, Business Premium, Messages Pro, Messages Business Premium),
   puis les trois phrases [avant, après]. */
const PLACE_NEUVE = '<div class="places">1 utilisateur par abonnement</div>';
const PLACES_AVANT = ['1 utilisateur inclus', '2 utilisateurs inclus', '3 utilisateurs inclus', '1 utilisateur inclus', '3 utilisateurs inclus'];
const PHRASES = [
  ['content="Les offres TEAM OP : Gratuit, Pro 15 €, Business 25 € (2 utilisateurs), Business Premium 50 € (3 utilisateurs + service 24h/24). OP MESSAGES a ses propres formules, à part."',
   'content="Les offres TEAM OP : Gratuit, Pro 15 €, Business 25 €, Business Premium 50 € (service 24h/24), par mois et par utilisateur. OP MESSAGES a ses propres formules, à part."'],
  ['<p class="intro">Prix HT par mois, sans engagement. Chaque abonnement inclut un nombre d\'utilisateurs — besoin de plus' + N + '? Ajoutez un abonnement, les places s\'additionnent.</p>',
   '<p class="intro">Prix TTC par mois, sans engagement. Un abonnement par utilisateur' + N + ': pour une équipe de cinq, prenez cinq abonnements.</p>'],
  ['<p>Chaque abonnement inclut un nombre de comptes' + N + ': 1 en Gratuit, 1 en Pro, 2 en Business, 3 en Business Premium. Besoin de plus' + N + '? Ajoutez un abonnement' + N + ': les places s\'additionnent (par exemple, Business × 2 = 4 comptes).</p>',
   '<p>Un abonnement donne un compte utilisateur, quelle que soit la formule. Besoin de plus' + N + '? Ajoutez un abonnement par personne' + N + ': les places s\'additionnent (par exemple, ' + ['Business', '×', '3', '=', '3', 'comptes'].join(NB) + ').</p>'],
];
/* le pied des huit pages : « Prix HT » → « Prix TTC » (Justin : « TTC ») */
const PIED = ['Prix HT, sans engagement.', 'Prix TTC, sans engagement.'];
/* les huit pages publiées le 27 septembre (`fe599df`), octet pour octet — écrites ICI et pas lues dans
   `vitrine/racine-v1.json`, qui suit les retouches : un banc qui relirait l'empreinte qu'il doit contrôler ne
   contrôlerait rien. */
const V1_PUBLIEE = {
  'index.html': 'fdb1ed6a43b15b22fb1518392c3418731021d7ca888a2026e76f6c0e5ecfb6b0',
  'applications.html': '03a23af865485a71c3f3732f2c6f7f38d4d52f4d3af65acfd6595797b95f823c',
  'creer.html': '3f4b40f14491f1f415e63f9a4d7ca83dc79cdc95ce174a41a6a451b99777ac1c',
  'elan.html': 'd142bfedcb4891e524179a5166f5f89bc252e338a59b7eaf578407dfbf652dc4',
  'metiers.html': '8ea76f630a62a70feda3947dfc886db54a78562b57869e8f79f511a1a688a1c6',
  'opmessages.html': '49ab9b8b033476df2f836c1c6d3121ed6e99b61f4ce9c8a4d66fe8b05f9a0593',
  'pourquoi.html': '803ad93983a9a716d9e335e084a20dc58f957a3892172fa2d1801271e5520c67',
  'tarifs.html': '5cc21091b9faa0a182e8d0e0be18151c948ffcb4d92db4387460c745ea507a28',
};
const sha = t => crypto.createHash('sha256').update(t).digest('hex');
const V1 = existe('vitrine/racine-v1.json') ? JSON.parse(lire('vitrine/racine-v1.json')) : null;
const TAR = lire('tarifs.html');
const GEN = require(path.join(RACINE, 'scripts', 'site-marine.js'));
const racineGeneree = TAR === GEN.page('tarifs', { racine: true });
const tt = texte(TAR), meta = (TAR.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
vrai('la page porte bien les formules (population : ' + (TAR.match(/<div class="places">/g) || []).length + ' places)', (TAR.match(/<div class="places">/g) || []).length === 7);
vrai('⛔ plus aucune formule ne vend plusieurs utilisateurs', !/[2-9] utilisateurs inclus/.test(tt) && !/\(\d utilisateurs/.test(meta));
v('les cinq formules payantes disent « 1 utilisateur par abonnement »', (TAR.match(/<div class="places">1 utilisateur par abonnement<\/div>/g) || []).length, 5);
vrai('l\'introduction le dit : « Un abonnement par utilisateur »', tt.includes('Un abonnement par utilisateur : pour une équipe de cinq, prenez cinq abonnements.'));
vrai('⛔ l\'introduction dit « Prix TTC par mois », et plus « HT »', tt.includes('Prix TTC par mois, sans engagement.') && !/\bHT\b/.test(tt));
vrai('la FAQ le dit, avec un exemple qui compte juste (Business × 3 = 3 comptes)', tt.includes('Un abonnement donne un compte utilisateur, quelle que soit la formule') && tt.includes('Business × 3 = 3 comptes'));
vrai('… et l\'exemple ne se coupe pas en fin de ligne (insécables)', TAR.includes(['Business', '×', '3', '=', '3', 'comptes'].join(NB)));
vrai('la description (moteurs de recherche) dit « par mois et par utilisateur »', meta.includes('par mois et par utilisateur'));
if (racineGeneree) {
  vrai('la racine est la sortie du générateur (remplacée) — test-835 la garde', true);
} else {
  v('chaque retouche se trouve le bon nombre de fois (5 places, 3 phrases, le pied)', [TAR.split(PLACE_NEUVE).length - 1].concat([...PHRASES, PIED].map(([, apres]) => TAR.split(apres).length - 1)), [5, 1, 1, 1, 1]);
  let i = 0;
  let defaite = TAR.split(PLACE_NEUVE).reduce((acc, morceau, k) => k ? acc + '<div class="places">' + PLACES_AVANT[i++] + '</div>' + morceau : morceau, '');
  for (const [avant, apres] of [...PHRASES, PIED]) defaite = defaite.split(apres).join(avant);
  v('⛔ en les défaisant, on retrouve octet pour octet la v1 publiée : rien d\'autre n\'a bougé', sha(defaite), V1_PUBLIEE['tarifs.html']);
  vrai('l\'empreinte de la racine connaît la page retouchée (vitrine/racine-v1.json)', V1 && V1.pages['tarifs.html'] === sha(TAR));
}
/* les sept autres pages : le pied, et RIEN d'autre */
v('population : huit pages publiées, dont les sept qui ne vendent rien', Object.keys(V1_PUBLIEE).length, 8);
for (const f of Object.keys(V1_PUBLIEE).filter(f => f !== 'tarifs.html')) {
  const P = lire(f);
  vrai(f + ' : le pied dit « Prix TTC, sans engagement. », et plus « HT »', P.includes(PIED[1]) && !/\bHT\b/.test(texte(P)));
  if (P === GEN.page(f.replace(/\.html$/, ''), { racine: true })) { vrai(f + ' : sortie du générateur (remplacée) — test-835 la garde', true); continue; }
  v(f + ' : la retouche s\'y trouve une fois', P.split(PIED[1]).length - 1, 1);
  v('⛔ ' + f + ' : en la défaisant, on retrouve octet pour octet la v1 publiée', sha(P.split(PIED[1]).join(PIED[0])), V1_PUBLIEE[f]);
  vrai(f + ' : l\'empreinte de la racine la connaît (vitrine/racine-v1.json)', V1 && V1.pages[f] === sha(P));
}
/* l'aperçu (le site v2) : `test-835` exige que ses pages soient la sortie du générateur — on lit donc le générateur */
const GEN_HT = Object.keys(GEN.PAGES).filter(cle => { const g = GEN.page(cle); return !g.includes(PIED[1]) || /\bHT\b/.test(texte(g)); });
v('le générateur du site (aperçu) : les huit pages disent « Prix TTC », aucune « HT »', GEN_HT, []);
vrai('… et l\'introduction des tarifs « Prix TTC par mois »', texte(GEN.page('tarifs')).includes('Prix TTC par mois, sans engagement.'));

/* ── 1 bis. deux pages du portail EN SERVICE : une phrase de l'ancienne règle chacune, et rien d'autre ────────── */
/* Trouvées le soir même, en relisant la chaîne du paiement jusqu'au bout : la page qu'on voit JUSTE APRÈS avoir payé
   (« le nombre inclus dépend de ta formule ») et les mentions légales (« Chaque abonnement inclut un nombre de comptes
   utilisateurs selon la formule »). Aucun chiffre dedans : le premier recensement (§4), qui cherchait « 2 utilisateurs
   inclus », ne pouvait pas les voir. Sur `main` ce sont les pages EN SERVICE : on prouve qu'on n'y a touché que cette
   phrase ; sur la branche elles sont au thème, et `test-836` garde le reste. */
console.log('1 bis. deux pages du portail en service');
const PV1 = existe('vitrine/portail-v1.json') ? JSON.parse(lire('vitrine/portail-v1.json')) : null;
const PORTAIL_AVANT = {   // les pages EN SERVICE avant la retouche (main, 115ce42) — écrites ICI, pas relues dans portail-v1.json
  'merci.html': '545be1a59387e73be5e2e180ca3831257a0677c5066a04270c2c39b1bdf4623f',
  'mentions-legales.html': 'c7556951f682d1ba0f657902f8eebb746f3eac9a0918e6446e14f790bfad248c',
};
const PORTAIL_RETOUCHES = {
  'merci.html': ['— le nombre inclus dépend de ta formule, chacun aura son propre accès.', '— un abonnement par utilisateur, chacun avec son propre accès.'],
  'mentions-legales.html': ['Chaque abonnement inclut un nombre de comptes utilisateurs selon la formule ;', 'Chaque abonnement ouvre un compte utilisateur, quelle que soit la formule ;'],
};
for (const f of Object.keys(PORTAIL_AVANT)) {
  const [avant, apres] = PORTAIL_RETOUCHES[f];
  for (const g of [f, 'apercu/' + f].filter(existe)) vrai(g + ' : « ' + apres.replace(/^— /, '').slice(0, 48) + '… », et plus l\'ancienne phrase', lire(g).includes(apres) && !lire(g).includes(avant));
  const P = lire(f);
  if (P.includes('/vitrine/v2/theme.css')) { vrai(f + ' : au thème (branche) — test-836 garde le reste de la page', true); continue; }
  v(f + ' (en service) : la retouche s\'y trouve une fois', P.split(apres).length - 1, 1);
  v('⛔ ' + f + ' (en service) : en la défaisant, on retrouve la page d\'avant, octet pour octet', sha(P.split(apres).join(avant)), PORTAIL_AVANT[f]);
  vrai(f + ' : l\'empreinte du portail la connaît (vitrine/portail-v1.json)', PV1 && PV1.pages[f] === sha(P));
}

/* ── 2. la page de paiement, EXÉCUTÉE ─────────────────────────────────────────────────────────────────────── */
/* Le plafond du serveur : `/api/stripe/checkout` borne la quantité. La page ne doit pas afficher un total que Stripe
   ne facturerait pas — on lit le plafond dans le CODE de la route, pas dans un commentaire. */
const SRV = sansCommentaires(lire('server/index.js'));
const iRoute = SRV.indexOf("app.post('/api/stripe/checkout'");
const mPlafond = /const qty = Math\.min\((\d+), Math\.max\(1, parseInt\(quantity, 10\) \|\| 1\)\);/.exec(SRV.slice(iRoute, iRoute + 1500));
vrai('le plafond de quantité se lit dans la route de paiement du serveur', iRoute > 0 && mPlafond);
const PLAFOND_SERVEUR = mPlafond ? +mPlafond[1] : NaN;

function executer(PAGE, recherche) {
  const bloc = [...PAGE.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(b => b.includes('const FORMULES = {'));
  if (!bloc) return null;
  const derniers = {}, conteneurs = {}, envoye = [];
  /* un élément neuf à chaque appel, comme le vrai DOM après un innerHTML — sauf les trois cartes, qui restent */
  const nouveau = id => {
    const el = { id, _h: {}, style: {}, dataset: {}, value: '', disabled: false, textContent: '', innerHTML: '',
      addEventListener(t, fn) { (this._h[t] = this._h[t] || []).push(fn); },
      querySelectorAll() { return []; }, querySelector() { return null; }, blur() {}, focus() {},
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } } };
    derniers[id] = el; return el;
  };
  const document = { title: '', querySelectorAll() { return []; }, querySelector() { return null; },
    getElementById(id) { return /^(selecteurFormules|carteDroits|cartePaiement)$/.test(id) ? (conteneurs[id] || (conteneurs[id] = nouveau(id))) : nouveau(id); } };
  const window = { location: { search: recherche, href: '' } };
  const fetchFaux = async (url, opts) => { envoye.push({ url, corps: JSON.parse(opts.body) }); return { ok: true, json: async () => ({ url: 'https://checkout.stripe.com/c/banc' }) }; };
  const api = new Function('window', 'document', 'history', 'localStorage', 'fetch', 'alert',
    bloc + '\n;return { etat: () => ({ nbUsersVoulu, formuleActive }), FORMULES, MAX_ABONNEMENTS, STRIPE_PRICES };')(
    window, document, { replaceState() {} }, { getItem: () => null }, fetchFaux, () => {});
  const paiement = () => texte(conteneurs.cartePaiement.innerHTML);
  const droits = () => texte(conteneurs.carteDroits.innerHTML);
  const html = () => conteneurs.cartePaiement.innerHTML;
  return { api, derniers, envoye, window, paiement, droits, html };
}

const PAGES_PAIEMENT = ['recap-abonnement.html', 'apercu/recap-abonnement.html'].filter(existe);
vrai('population : ' + PAGES_PAIEMENT.length + ' pages de paiement relues (racine' + (PAGES_PAIEMENT.length > 1 ? ' et aperçu' : '') + ')', PAGES_PAIEMENT.length >= 1);
(async () => {
  for (const f of PAGES_PAIEMENT) {
    console.log('2. ' + f + ' — son vrai script, exécuté');
    const PAGE = lire(f);
    const CODE = sansCommentaires(PAGE);
    const b = executer(PAGE, '?formule=business&utilisateurs=7');
    vrai('le script de la page s\'exécute', !!b);
    if (!b) continue;
    const F = b.api.FORMULES, cles = Object.keys(F);
    v('population : sept formules (4 OP GESTION, 3 OP MESSAGES)', cles.length, 7);
    v('⛔ chaque formule compte 1 utilisateur par abonnement', cles.filter(k => F[k].utilisateurs !== 1), []);
    v('⛔ le plafond de la page est celui du serveur (' + PLAFOND_SERVEUR + ')', b.api.MAX_ABONNEMENTS, PLAFOND_SERVEUR);
    /* ⚠️ le plafond d'avant se cherche sous la forme du CODE (`Math.min(250,`, `max="250"`) : « 250 » tout court tombe dans
       une couleur de la page en service (`rgba(96,165,250,…)`) — c'est ce que la copie de main a montré au premier essai. */
    vrai('plus aucun « utilisateurs inclus », « places au total » ni plafond à 250 dans le code', !/utilisateurs inclus|places au total|Math\.min\(\s*250\b|max="250"/.test(CODE));

    // Business, sept personnes : sept abonnements, 175 €
    let p = b.paiement();
    vrai('sept personnes en Business : « 7 abonnements Business · un par utilisateur »', p.includes('7 abonnements Business · un par utilisateur'));
    vrai('… « Abonnement Business × 7 » et un total de 175 € (7 × 25)', p.includes('Abonnement Business × 7') && p.includes('175 € TTC'));
    vrai('… « Formule Business · 1 utilisateur par abonnement »', p.includes('Formule Business · 1 utilisateur par abonnement'));
    const d = b.droits();
    vrai('la carte des droits : « 1 utilisateur par abonnement », et plus « inclus »', d.includes('1 utilisateur par abonnement') && !/utilisateurs? inclus/.test(d));
    vrai('… et elle dit comment faire à plusieurs : « Un abonnement chacune »', d.includes('Plusieurs personnes ? Un abonnement chacune.'));
    // « + » puis « − » : une personne de plus, une de moins — plus jamais par paquets de deux ou trois
    b.derniers.aboPlus._h.click[0]();
    v('« + » : huit personnes, huit abonnements', b.api.etat().nbUsersVoulu, 8);
    vrai('… et l\'écran le dit (200 €)', b.paiement().includes('8 abonnements Business') && b.paiement().includes('200 € TTC'));
    b.derniers.aboMoins._h.click[0]();
    v('« − » : retour à sept', b.api.etat().nbUsersVoulu, 7);
    // le champ : 60 tapés → plafond du serveur, et la page dit pourquoi
    b.derniers.nbUsers.value = '60'; b.derniers.nbUsers._h.change[0]();
    v('60 tapés dans le champ : la page s\'arrête au plafond du serveur', b.api.etat().nbUsersVoulu, PLAFOND_SERVEUR);
    vrai('… et le dit, sur sa ligne : « Au-delà de 50, écrivez à support@teamop.fr »', b.paiement().includes('Au-delà de 50, écrivez à support@teamop.fr') && /<br>Au-delà de 50/.test(b.html()));
    vrai('« un par utilisateur » ne se coupe pas en fin de ligne', b.html().includes('un\u00a0par\u00a0utilisateur'));
    vrai('… le « + » ne passe pas au-dessus', (b.derniers.aboPlus._h.click[0](), b.api.etat().nbUsersVoulu === PLAFOND_SERVEUR));
    b.derniers.nbUsers.value = '5'; b.derniers.nbUsers._h.change[0]();
    // le paiement : la quantité qui part est le nombre de personnes
    await b.derniers.btnPayer._h.click[0]();
    v('⛔ « Payer » envoie la quantité = le nombre de personnes (5)', b.envoye.map(e => e.corps.quantity), [5]);
    v('… au tarif mensuel de la formule', b.envoye.map(e => e.corps.price), [b.api.STRIPE_PRICES.business.mensuel]);
    vrai('… vers la route de paiement du serveur, puis la page Stripe', b.envoye[0] && /\/api\/stripe\/checkout$/.test(b.envoye[0].url) && b.window.location.href === 'https://checkout.stripe.com/c/banc');

    // Business Premium, sans nombre dans l'adresse : un abonnement, 50 €
    const pr = executer(PAGE, '?formule=premium');
    v('Business Premium sans nombre donné : 1 personne, 1 abonnement', pr.api.etat().nbUsersVoulu, 1);
    vrai('… 50 € par mois, et « Formule Business Premium · 1 utilisateur par abonnement »', pr.paiement().includes('50 € TTC') && pr.paiement().includes('Formule Business Premium · 1 utilisateur par abonnement'));
    await pr.derniers.btnPayer._h.click[0]();
    v('… et « Payer » envoie la quantité 1', pr.envoye.map(e => e.corps.quantity), [1]);
    // une adresse venue de l'application (utilisateurs=N) au-delà du plafond
    const gros = executer(PAGE, '?formule=pro&utilisateurs=400');
    v('une adresse qui demande 400 personnes est ramenée au plafond', gros.api.etat().nbUsersVoulu, PLAFOND_SERVEUR);
    // Gratuit : un compte, aucun compteur
    const g = executer(PAGE, '?formule=gratuit');
    vrai('Gratuit : « Avec cette offre, vous avez 1 compte utilisateur », sans « Un abonnement chacune »', g.droits().includes('Avec cette offre, vous avez 1 compte utilisateur') && !g.droits().includes('Un abonnement chacune'));
    vrai('… et pas de compteur d\'abonnements', !g.paiement().includes('COMBIEN D\'UTILISATEURS'));
  }

  /* ── 3. le site et la page de paiement vendent le même prix par utilisateur ─────────────────────────────── */
  console.log('3. même prix par utilisateur sur le site et au paiement');
  const R = executer(lire('recap-abonnement.html'), '?formule=business');
  const prixSite = {};
  for (const f of GEN.FORMULES_GESTION) prixSite[f.cle] = +f.prix;
  for (const f of GEN.FORMULES_MESSAGES) if (f.nom === 'Messages Pro') prixSite.msgpro = +f.prix; else if (f.nom === 'Messages Business Premium') prixSite.msgpremium = +f.prix;
  v('population : six formules comparées', Object.keys(prixSite).length, 6);
  v('chaque formule coûte le même prix sur le site et au paiement', Object.keys(prixSite).filter(k => !R || !R.api.FORMULES[k] || R.api.FORMULES[k].prixMensuel !== prixSite[k]), []);

  /* ── 4. tout ce que le dépôt SERT, recensé — pas une liste écrite à la main ─────────────────────────────────── */
  /* La première version de ce banc ne relisait que les pages qu'on savait concernées : la relecture en a trouvé deux autres,
     servies et sans `noindex`, qui vendaient encore 2 et 3 utilisateurs (`apercu/tarifs.html`, restée d'un cycle d'aperçu
     antérieur, et la maquette `apercu/site-apple.html`). « Un recensement part du dépôt, jamais d'une liste » (CLAUDE.md). */
  console.log('4. aucune page servie ne vend plusieurs utilisateurs par abonnement');
  const { execSync } = require('child_process');
  let suivis = [];
  try { suivis = execSync('git ls-files', { cwd: RACINE, encoding: 'utf8' }).split('\n').filter(Boolean); } catch (e) {}
  const SERVIS = suivis.filter(f => /\.(html|js|json)$/.test(f) && !/^(scratchpad|design|tests|server|\.github|scripts)\//.test(f) && !/node_modules/.test(f));
  vrai('population : ' + SERVIS.length + ' fichiers servis relus', SERVIS.length > 50);
  /* ⛔ L'APPLICATION, écart DÉCLARÉ (test-835 §3) : ses textes de forfait disent encore « 2 utilisateurs inclus » tant
     qu'elle donne 2 places. Le jour où elle passe à 1, cette exception ne sert plus, et le banc le dit. */
  const ECART_APPLICATION = ['app.html', 'beta.html'];
  const PROMESSE = /[2-9] utilisateurs? inclus|\(\s*[2-9] utilisateurs|u:'[2-9] utilisateurs|\b[2-9] en Business\b|Business\s*×\s*2\s*=\s*[3-9]/;
  /* ⛔ ET SANS CHIFFRE : « le nombre inclus dépend de ta formule », « un nombre de comptes utilisateurs selon la formule »
     disent la même chose que « 2 utilisateurs inclus » — et c'est ainsi que deux pages en service ont échappé au premier
     recensement (§1 bis). */
  const SELON_LA_FORMULE = /nombre (?:de comptes(?: utilisateurs)?|d'utilisateurs|inclus) (?:selon|dépend de) (?:ta |votre |la )?formule|disponibles suit la formule|nombre de comptes utilisateurs qu\\?'elle inclut/;
  /* ⛔ LE CONTRAT DU PORTAIL, écart DÉCLARÉ : il se RÉGÉNÈRE à chaque ouverture, pour les entreprises déjà abonnées
     aussi — le changer aujourd'hui changerait ce qu'ELAN lit de son propre contrat. Il décrit ce que l'application
     DONNE (2 et 3 places) et change avec elle, sur la réponse de Justin (les abonnés d'avant gardent-ils leurs places ?). */
  const ECART_CONTRAT = ['espace.html', 'apercu/espace.html'];
  const fautifs = [];
  for (const f of SERVIS) {
    if (ECART_APPLICATION.includes(f)) continue;
    let t = ''; try { t = fs.readFileSync(path.join(RACINE, f), 'utf8'); } catch (e) { continue; }
    t = sansCommentaires(t).replace(/<!--[\s\S]*?-->/g, ' ').replace(/[\u202f\u00a0]/g, ' ');
    const m = PROMESSE.exec(t) || (ECART_CONTRAT.includes(f) ? null : SELON_LA_FORMULE.exec(t));
    if (m) fautifs.push(f + ' : « ' + t.slice(Math.max(0, m.index - 30), m.index + m[0].length + 10).replace(/\s+/g, ' ') + ' »');
  }
  v('⛔ aucune page ni aucun script servi ne vend plusieurs utilisateurs par abonnement (avec ou sans chiffre)', fautifs, []);
  for (const f of ECART_CONTRAT) if (existe(f)) vrai('l\'écart déclaré pour le contrat de ' + f + ' sert encore (sinon : le retirer d\'ici)', SELON_LA_FORMULE.test(sansCommentaires(lire(f))));

  /* ⛔ « TTC » (Justin). Aucune page servie n'écrit « HT » pour un prix TEAM OP — le même recensement, les mêmes
     commentaires retirés. Les APPLICATIONS en sont écartées, nommées : elles fabriquent des devis et des factures, où
     « Total HT » et « prix unitaire HT » sont justes et obligatoires. */
  console.log('4 bis. le prix se dit TTC partout');
  const APPLICATIONS = /^(apercu\/)?(app|beta|tour|messages|messages-beta)\.html$/;
  const DIT_HT = /\bPrix HT\b|\bHT\s*\/\s*mois|\bHT par mois|€\s*HT\b/, HORS_TAXES = /hors[ -]taxes?/i;
  const relus = SERVIS.filter(f => !APPLICATIONS.test(f));
  vrai('population : ' + relus.length + ' fichiers servis relus (hors applications : ' + SERVIS.filter(f => APPLICATIONS.test(f)).join(', ') + ')', relus.length > 40);
  const ht = [];
  for (const f of relus) {
    let t = ''; try { t = fs.readFileSync(path.join(RACINE, f), 'utf8'); } catch (e) { continue; }
    t = sansCommentaires(t).replace(/<!--[\s\S]*?-->/g, ' ').replace(/[\u202f\u00a0]/g, ' ');
    const m = DIT_HT.exec(t) || HORS_TAXES.exec(t);
    if (m) ht.push(f + ' : « ' + t.slice(Math.max(0, m.index - 30), m.index + m[0].length + 10).replace(/\s+/g, ' ') + ' »');
  }
  v('⛔ aucune page servie n\'écrit « HT » pour un prix', ht, []);
  for (const f of ECART_APPLICATION) if (existe(f)) vrai('l\'écart déclaré pour ' + f + ' sert encore (sinon : le retirer d\'ici et de test-835)', PROMESSE.test(sansCommentaires(lire(f))));

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a jeté : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });

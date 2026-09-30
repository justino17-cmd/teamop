/* ⛔⛔ LA SUSPENSION POUR IMPAYÉ — LA COUTURE ENTRE LE SERVEUR ET L'ÉCRAN.
 *
 * Ce banc existe parce que le défaut qu'il garde était l'INVERSE de ce que Justin avait
 * décidé, et qu'aucune des 117 suites ne le voyait. Mesuré le 22 septembre 2026 sur un VRAI
 * serveur : une entreprise suspendue pour impayé recevait `{ferme:true}` de
 * `/api/espaces/etat`. `app.html` affichait alors « Cet espace a été fermé par TEAM OP » à
 * TOUS ses utilisateurs, puis effaçait `elan_sync_team` — la seule porte qui, de son propre
 * aveu, « ne se rattrape pas au chargement suivant ». Un impayé était coupé de ses données,
 * et ses techniciens l'apprenaient avant lui.
 *
 * La règle décidée par Justin le 20 septembre 2026 : sept jours pour continuer à lire, puis
 * les catégories PAYANTES grisent et l'espace revient au forfait gratuit. « Aucune sauvegarde
 * n'est perdue, aucune tâche qu'ils étaient en train de faire, rien n'est perdu … Avec tous
 * les jours un rappel sur le compte admin. Après, c'est pas aux utilisateurs de savoir si
 * l'entreprise paye ou pas. Que le compte admin. »
 *
 * ⛔⛔ ET DEPUIS LE 30 SEPTEMBRE 2026 (v767), IL N'Y A PLUS DE FORFAIT GRATUIT OÙ REVENIR. Justin : « si une
 * entreprise ne paye plus, le service est suspendu tant que c'est pas réglé ». Le sursis écoulé SUSPEND l'application :
 * tout se grise et mène à l'écran « Accès suspendu », sauf les Paramètres — et le serveur sert sous cette forme TOUT
 * ce qui n'est pas payé (période offerte finie, fiche « Gratuit » d'avant, rien de payé). Rien n'est perdu : `db.forfait`
 * ne bouge pas, et le règlement rend tout d'un coup. La bêta, elle, n'est jamais suspendue.
 *
 * ⛔ DEUX MOITIÉS, ET ELLES SE LISENT TRÈS BIEN SÉPARÉMENT — c'est pour ça que les deux sont
 * jouées ici : la ROUTE contre un vrai serveur, et les VRAIES fonctions d'`app.html`.
 */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules'))) {
  console.log('\n(sauté : server/node_modules absent)\n0 ✓  0 ✗'); process.exit(0);
}
const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push'));
let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++;
  console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a))); };
const vrai = (t, c, d) => { c ? ok++ : ko++; console.log('  ' + (c ? '✓' : '✗') + ' ' + t + (c ? '' : '\n      → ' + (d === undefined ? '' : d))); };
const dormir = ms => new Promise(r => setTimeout(r, ms));

const APP = fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8');
const SRV = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
/* ⛔ LE NETTOYAGE SÛR (blocs qui COMMENCENT une ligne) : le motif naïf avale 107 069
   caractères d'`app.html`, dont des fonctions entières. */
const NU = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
const NUS = SRV.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');

console.log('\n══ 1. ⛔ UNE SEULE DÉFINITION DU SURSIS, ET ELLE EST PARTAGÉE ══\n');
{
  /* Elle vivait en arrow dans le montage du socle : juste, commentée, et invisible à la seule
     route que l'APPLICATION interroge. Deux copies auraient compté deux délais différents. */
  const defs = (NUS.match(/function sursisJoursDe\s*\(/g) || []).length;
  v('⛔ `sursisJoursDe` est définie EXACTEMENT une fois', defs, 1);
  vrai('⛔ … et le socle l’APPELLE au lieu de la recopier',
    /espaceSursisJours:\s*\(t\)\s*=>\s*sursisJoursDe\(t\)/.test(NUS));
  vrai('⛔ … et la route d’état l’appelle aussi', /const sursisJours = sursisJoursDe\(t\)/.test(NUS));
  /* ⛔ LES DEUX BORNES. Une date dans le FUTUR (horloge du VPS qui recule) rendait 7 + l'écart :
     mesuré, une date à +30 jours donnait 37 jours de sursis à qui ne paye pas. */
  vrai('⛔ le sursis est planché à 0 ET plafonné à 7', /Math\.max\(0,\s*Math\.min\(7,/.test(NUS));
}

console.log('\n══ 2. ⛔⛔ UN SUSPENDU N’EST PAS UN FERMÉ — JOUÉ CONTRE LE VRAI SERVEUR ══\n');
let enfant = null, banc = null;
const arreter = async () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {}
  try { if (banc) fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };

(async () => {
  banc = fs.mkdtempSync(path.join(os.tmpdir(), 'susp-761-'));
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64');
  const CLE = 'cle-propre-de-lentreprise-0123456789';
  fs.mkdirSync(path.join(banc, 'data'), { recursive: true });
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({
    vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', monitorPass: 'x' }));
  const esp = (slug, t, o) => Object.assign({ slug, nom: slug, email: slug + '@x.fr', t, code: b64({ t, k: CLE }),
    ts: 1, formule: 'premium', quantite: 1, aboStatut: 'actif' }, o || {});
  fs.writeFileSync(path.join(banc, 'data', 'espaces.json'), JSON.stringify({
    payeur: esp('payeur', 'ent-paye'), impaye: esp('impaye', 'ent-impaye'),
    vieux: esp('vieux', 'ent-vieux'), ferme: esp('ferme', 'ent-ferme'),
    /* v767 — trois entreprises qui ne paient RIEN (ni abonnement, ni code, ni réglage à la main qui paie) */
    rien: esp('rien', 'ent-rien', { formule: 'pro', aboStatut: undefined }),
    gratuit: esp('gratuit', 'ent-gratuit', { formule: 'gratuit', aboStatut: undefined }),
    gratuitactif: esp('gratuitactif', 'ent-gratuit-actif', { formule: 'gratuit', aboStatut: 'actif' }),
    /* … et une quatrième, qui ne paie rien ET que la Tour a suspendue il y a deux jours */
    riensus: esp('riensus', 'ent-rien-sus', { formule: 'pro', aboStatut: undefined }),
    /* … et une fiche écrite à la main avec une formule que personne ne connaît (la Tour et les codes la refusent) */
    inconnue: esp('inconnue', 'ent-inconnue', { formule: 'decouverte', aboStatut: 'actif' }),
    /* ⛔⛔ … et deux fiches SANS formule (Justin, 30 septembre 2026, à « les suspendre aussi ? » : « Suspend ») : l'une ne
       paie rien, l'autre est en période offerte — les codes promo n'y touchent pas */
    sansf: esp('sansf', 'ent-sans-formule', { formule: undefined, aboStatut: undefined }),
    sansfpromo: esp('sansfpromo', 'ent-sans-formule-promo', { formule: undefined, aboStatut: undefined }),
    /* ⛔⛔ relecture de `gardien` sur A3 (30 septembre 2026), rejouée : deux entreprises qui PAIENT et que le changement
       suspendait. (1) des entrées d'AVANT, dont l'identifiant ne vit que dans le code (pas de `t` en clair), en période
       offerte — sans formule, puis réglée Pro ; (2) une entreprise à DEUX noms dont le plus récent n'a pas de formule
       (« Revoir le lien » d'avant ne la reportait pas) pendant que l'ancien porte Business Premium réglé « actif » à la main */
    ancien: esp('ancien', 'ent-ancien', { t: undefined, formule: undefined, aboStatut: undefined }),
    ancienpro: esp('ancienpro', 'ent-ancien-pro', { t: undefined, formule: 'pro', aboStatut: undefined }),
    multia: esp('multia', 'ent-multi', { ts: 1 }),
    multib: esp('multib', 'ent-multi', { ts: 2, formule: undefined, aboStatut: undefined, quantite: undefined }) }));
  /* la période offerte de « ent-sans-formule-promo » — un code FICTIF (règle du dépôt : aucun vrai code dans un fichier suivi) */
  fs.writeFileSync(path.join(banc, 'data', 'promos-usages.json'), JSON.stringify({
    'ESSAI-SANSF-BANC': { n: 3, equipes: { 'ent-sans-formule-promo': { date: '2026-09-01', finLe: '2099-12-31' },
      'ent-ancien': { date: '2026-09-01', finLe: '2099-12-31' }, 'ent-ancien-pro': { date: '2026-09-01', finLe: '2099-12-31' } } } }));
  /* trois états dans le même fichier : suspendu d'hier (sursis vivant), suspendu il y a
     9 jours (sursis épuisé), et FERMÉ pour de bon (absent de `suspendus`). */
  fs.writeFileSync(path.join(banc, 'data', 'entreprises-fermees.json'), JSON.stringify({
    espaces: ['ent-impaye', 'ent-vieux', 'ent-ferme', 'ent-rien-sus'],
    suspendus: ['ent-impaye', 'ent-vieux', 'ent-rien-sus'],
    suspendusLe: { 'ent-impaye': Date.now() - 2 * 86400000, 'ent-vieux': Date.now() - 9 * 86400000,
      'ent-rien-sus': Date.now() - 2 * 86400000 } }));

  const PORT = 8400 + (process.pid % 500);
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], {
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'),
      TEAMOP_DATA: path.join(banc, 'data'), PORT: String(PORT) }), stdio: 'ignore' });
  const B = 'http://127.0.0.1:' + PORT;
  let vivant = false;
  for (let i = 0; i < 150 && !vivant; i++) { await dormir(100); try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} }
  vrai('le serveur répond', vivant);

  if (vivant) {
    const etat = async (t) => (await (await fetch(B + '/api/espaces/etat', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t }) })).json().catch(() => ({})));
    const paye = await etat('ent-paye'), sus = await etat('ent-impaye'),
          vieux = await etat('ent-vieux'), ferme = await etat('ent-ferme');

    v('⛔⛔ une entreprise SUSPENDUE n’est PAS annoncée fermée', sus.ferme, undefined);
    v('   … et elle garde sa formule (sans quoi l’app ne sait rien de son forfait)', sus.formule, 'premium');
    v('   … elle est dite suspendue', sus.suspendu, true);
    v('   … et il lui reste 5 jours (suspendue il y a 2)', sus.sursisJours, 5);
    v('⛔ suspendue depuis 9 jours : le sursis est à ZÉRO, pas négatif', vieux.sursisJours, 0);
    v('   … et elle garde quand même sa formule et ses données', vieux.formule, 'premium');
    /* ⛔ LE CONTRE-CONTRÔLE QUI COMPTE : une vraie FERMETURE doit rester une fermeture. Sans
       lui, « ne plus jamais dire fermé » passerait au vert en rendant la fermeture décorative. */
    v('⛔⛔ une entreprise VRAIMENT FERMÉE est toujours annoncée fermée', ferme.ferme, true);
    v('   une entreprise qui PAYE n’est ni suspendue ni en sursis', [paye.suspendu, paye.sursisJours], [false, null]);

    /* ⛔⛔ v767 — CE QUI N'EST PAS PAYÉ EST SUSPENDU, SANS FORMULE. Plus de « Gratuit » servi : la réponse avec formule et
       `paye:false` faisait afficher « Paye ton abonnement » à toute l'équipe par l'application d'avant, et réécrire
       `db.forfait` ; celle-ci, l'application d'avant la grise sans rien écrire, celle d'après suspend tout. */
    const forme = j => [j.suspendu, j.sursisJours, j.paye, j.formule === undefined, j.ferme];
    v('⛔⛔ rien de payé (fiche Pro, ni abonnement ni code) : SUSPENDUE, sursis écoulé, sans formule', forme(await etat('ent-rien')), [true, 0, false, true, undefined]);
    v('⛔⛔ une fiche « Gratuit » d\'avant, rien de payé : suspendue aussi (le Gratuit n\'existe plus)', forme(await etat('ent-gratuit')), [true, 0, false, true, undefined]);
    v('⛔ une fiche « Gratuit » réglée « active » à la main : suspendue aussi — ce réglage ne paie rien', forme(await etat('ent-gratuit-actif')), [true, 0, false, true, undefined]);
    v('   (témoin) la même fiche réglée à la main mais en PREMIUM : servie, payée', [paye.formule, paye.paye], ['premium', true]);
    /* ⛔ LES SEPT JOURS DE SURSIS (20 septembre 2026) SERVENT L'ENTREPRISE QUE LA FACTURATION DIT PAYÉE ET QUE LA TOUR
       SUSPEND — « ent-impaye » plus haut, qui garde 5 jours. À qui ne paie DÉJÀ pas, la suspension de la Tour ne rend
       aucun jour : l'application en service (v763) la mettait au Gratuit sur-le-champ, et un sursis ici lui ROUVRIRAIT
       tout pendant une semaine — plus qu'à une entreprise que la Tour n'a pas touchée. */
    v('⛔ rien de payé ET suspendue dans la Tour il y a 2 jours : aucun jour de sursis — la suspension ne rend pas d\'accès à qui ne paie pas',
      forme(await etat('ent-rien-sus')), [true, 0, false, true, undefined]);
    /* ⛔ une formule que l'application ne sait pas servir ne se sert pas, même « payée » à la main : l'application d'avant
       l'ignorait (elle gardait ce qu'elle avait), celle d'aujourd'hui la lit comme une suspension — le serveur le dit d'abord */
    v('⛔ une fiche à la formule inconnue, réglée « active » à la main : suspendue, sans formule — jamais servie telle quelle',
      forme(await etat('ent-inconnue')), [true, 0, false, true, undefined]);
    /* ⛔⛔ UNE FICHE SANS FORMULE (Justin, 30 septembre 2026 : « Suspend »). Jusque-là, la route répondait AVANT de regarder ce
       qu'elle payait : tout l'accès, à une entreprise jamais réglée dans la Tour. */
    const sansf = await etat('ent-sans-formule');
    v('⛔⛔ une fiche SANS formule qui ne paie rien : SUSPENDUE, sursis écoulé, sans formule — plus tout l\'accès', forme(sansf), [true, 0, false, true, undefined]);
    v('   … et elle garde son état VIVANT (OP MESSAGES, métier, version) : suspendue n\'est pas fermée', [typeof sansf.opMessages, 'versionMin' in sansf], ['boolean', true]);
    const sansfp = await etat('ent-sans-formule-promo');
    v('⛔⛔ une fiche sans formule EN PÉRIODE OFFERTE : servie, payée, à la formule du code (Business Premium) — les codes n\'y touchent pas',
      [sansfp.paye, sansfp.formule, sansfp.suspendu, /^code promo ESSAI-SANSF-BANC \(jusqu'au 2099-12-31\)$/.test(sansfp.motif || '')], [true, 'premium', false, true]);
    /* ⛔ le témoin qui garde la limite : une entreprise ABSENTE de l'annuaire ne se décide pas — un annuaire illisible au
       démarrage rendrait tout le monde inconnu, et les suspendre couperait toutes les entreprises sur une panne de notre côté */
    /* ⛔⛔ relecture de `gardien` (B1) : l'identifiant d'une entrée d'AVANT ne vit que dans son code. La période offerte le
       lisait en clair (`e.t`, vide) : l'entreprise était SUSPENDUE, pendant que le rappel J-7 lui promettait « rien n'est
       prélevé avant… ». */
    vrai('(population) les deux entrées d\'avant n\'ont PAS d\'identifiant en clair — seulement dans leur code',
      (() => { const a = JSON.parse(fs.readFileSync(path.join(banc, 'data', 'espaces.json'), 'utf8')); return !('t' in a.ancien) && !('t' in a.ancienpro) && /ent-ancien/.test(Buffer.from(a.ancien.code, 'base64').toString()); })());
    const anc = await etat('ent-ancien'), ancp = await etat('ent-ancien-pro');
    v('⛔⛔ une entrée d\'avant (identifiant dans le code seul), SANS formule, en période offerte : servie, payée, Business Premium — pas suspendue',
      [anc.paye, anc.formule, anc.suspendu, /^code promo ESSAI-SANSF-BANC/.test(anc.motif || '')], [true, 'premium', false, true]);
    /* (le code FICTIF n'est pas dans la configuration de ce banc : la fiche garde sa formule — règle gardée par `test-842`) */
    v('⛔⛔ … et réglée Pro, en période offerte : servie, payée, à sa formule (Pro) — pas suspendue',
      [ancp.paye, ancp.formule, ancp.suspendu], [true, 'pro', false]);
    /* ⛔⛔ relecture de `gardien` (B2) : une entreprise à DEUX noms — la facturation suit l'ENTREPRISE, pas son dernier nom */
    const mul = await etat('ent-multi');
    v('⛔⛔ entreprise à deux noms, le plus récent SANS formule, l\'ancien en Business Premium réglé « actif » : servie Business Premium, payée — pas suspendue',
      [mul.paye, mul.formule, mul.suspendu], [true, 'premium', false]);
    const hors = await etat('ent-hors-annuaire');
    v('   (témoin) une entreprise ABSENTE de l\'annuaire : ni suspendue ni servie — la réponse d\'avant, inchangée',
      [hors.ok, hors.suspendu, hors.formule, hors.paye, hors.verificationImpossible, hors.ferme], [true, false, undefined, undefined, undefined, undefined]);
    /* ⛔ L'HORLOGE DE CONSERVATION (pas de clé Stripe ici : on SAIT) — la fiche sans formule qui ne paie pas est datée, et son
       motif commence par « aucune formule » : c'est ce que `conservation.js` lit pour « jamais abonnée » ; celle en période
       offerte, non. On attend le GESTE (la date posée), jamais un chronomètre. */
    const lireC1 = () => { try { return JSON.parse(fs.readFileSync(path.join(banc, 'data', 'conservation.json'), 'utf8')); } catch (e) { return null; } };
    let c1 = lireC1();
    for (let k = 0; k < 150 && !(c1 && c1['ent-rien']); k++) { await dormir(100); c1 = lireC1(); }
    vrai('(population) le balayage de conservation a eu lieu (« ent-rien », qui ne paie rien, est datée)', !!(c1 && c1['ent-rien']));
    vrai('⛔ la fiche SANS formule qui ne paie rien est datée, motif « aucune formule … » (jamais abonnée)',
      !!(c1 && c1['ent-sans-formule'] && /^aucune formule/.test(c1['ent-sans-formule'].motif || '')), c1 && JSON.stringify(c1['ent-sans-formule']));
    vrai('   … et celle en période offerte ne l\'est pas', !!c1 && !c1['ent-sans-formule-promo']);
    vrai('⛔ … ni les deux entrées d\'avant en période offerte (identifiant dans le code seul)', !!c1 && !c1['ent-ancien'] && !c1['ent-ancien-pro'],
      c1 && JSON.stringify([c1['ent-ancien'], c1['ent-ancien-pro']]));
    vrai('⛔ … ni l\'entreprise à deux noms (son dernier nom n\'a pas de formule, l\'entreprise en a une)', !!c1 && !c1['ent-multi'], c1 && JSON.stringify(c1['ent-multi']));
  }

  /* ══ 2 bis. ⛔⛔ DANS LE DOUTE, ON NE COUPE PAS — STRIPE MUET AU DÉMARRAGE (relectures du 30 septembre 2026, rejouées) ══
     Le même annuaire, un second serveur : une clé Stripe posée, et Stripe qui ne répond pas — le cache est froid, comme après
     CHAQUE déploiement. Jusqu'ici, « aucun paiement » : toute entreprise sans code ni réglage à la main était SUSPENDUE, avec
     toute son équipe, pour une panne. On ne sait pas : `verificationImpossible` — l'application garde ce qu'elle savait. */
  console.log('\n══ 2 bis. ⛔ STRIPE MUET AU DÉMARRAGE : ON NE SAIT PAS, RIEN N’EST DÉCIDÉ ══\n');
  if (vivant) {
    try { enfant.kill('SIGKILL'); } catch (e) {}
    const banc2 = path.join(banc, 'stripe-muet');
    fs.mkdirSync(path.join(banc2, 'data'), { recursive: true });
    for (const f of ['espaces.json', 'entreprises-fermees.json', 'promos-usages.json']) fs.copyFileSync(path.join(banc, 'data', f), path.join(banc2, 'data', f));
    const cfg = JSON.parse(fs.readFileSync(path.join(banc, 'config.json'), 'utf8'));
    cfg.stripe = { secretKey: 'sk_de_banc_761' };
    fs.writeFileSync(path.join(banc2, 'config.json'), JSON.stringify(cfg));
    const MUET = path.join(banc2, 'stripe-muet.js'), APPELS = path.join(banc2, 'appels-stripe.txt');
    fs.writeFileSync(MUET, `const vrai = globalThis.fetch; const fs = require('fs');
globalThis.fetch = async function (url, opts) {
  const u = String(url && url.url || url);
  if (u.startsWith('https://api.stripe.com/')) { fs.appendFileSync(${JSON.stringify(APPELS)}, u + '\\n'); throw new Error('Stripe muet (banc 761)'); }
  return vrai.apply(this, arguments);
};\n`);
    /* ⛔ L'HORLOGE DE CONSERVATION ET LE DOUTE (seconde relecture de `gardien`, 30 septembre 2026, rejouée) : deux dates posées
       AVANT le démarrage — le premier balayage part tout de suite, Stripe muet. Un doute ne lève ni ne pose rien : « ent-rien »
       (on ne sait pas si elle paie) GARDE sa date, qui ne se rattrape pas ; « ent-paye » (réglée à la main : on le SAIT) voit
       la sienne levée — c'est le témoin qui prouve que le balayage a bien eu lieu. */
    const VIEUX_CONS = Date.now() - 40 * 86400000;
    fs.writeFileSync(path.join(banc2, 'data', 'conservation.json'), JSON.stringify({
      'ent-rien': { depuis: VIEUX_CONS, motif: 'aucun paiement ni code promo' }, 'ent-paye': { depuis: VIEUX_CONS, motif: 'banc 761' } }));
    const PORT2 = PORT + 1;
    enfant = spawn(process.execPath, ['--require', MUET, path.join(RACINE, 'server', 'index.js')], {
      env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc2, 'config.json'), TEAMOP_DATA: path.join(banc2, 'data'), PORT: String(PORT2) }), stdio: 'ignore' });
    const B2 = 'http://127.0.0.1:' + PORT2;
    let vivant2 = false;
    for (let i = 0; i < 150 && !vivant2; i++) { await dormir(100); try { vivant2 = (await fetch(B2 + '/health')).ok; } catch (e) {} }
    vrai('le second serveur répond (clé Stripe posée, Stripe muet)', vivant2);
    if (vivant2) {
      const etat2 = async (t) => (await (await fetch(B2 + '/api/espaces/etat', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t }) })).json().catch(() => ({})));
      const doute = j => [j.verificationImpossible, j.formule, j.paye, j.ferme];
      const rien = await etat2('ent-rien');
      let appels = ''; try { appels = fs.readFileSync(APPELS, 'utf8'); } catch (e) {}
      vrai('(population) le serveur a bien demandé la liste à Stripe, et Stripe n\'a pas répondu', /api\.stripe\.com\/v1\/subscriptions/.test(appels));
      /* ⛔ ET ÇA SE VOIT (seconde relecture de `gardien`, 30 septembre 2026) : `/health` publie depuis combien de minutes Stripe
         ne se lit plus — la surveillance crie à 90 (`test-727` § 11). Ici le premier échec a moins d'une minute. */
      const h2 = await (await fetch(B2 + '/health')).json().catch(() => ({}));
      v('⛔ `/health` publie la minute d\'échec de Stripe (`stripeEchecMin`) : 0 — le premier échec a moins d\'une minute', h2.stripeEchecMin, 0);
      v('⛔⛔ rien de payé qu\'on SACHE (fiche Pro), Stripe muet : on ne sait pas — ni suspendue, ni servie (`verificationImpossible`)',
        [...doute(rien), rien.suspendu], [true, undefined, undefined, undefined, false]);
      v('⛔ … une fiche « Gratuit » d\'avant aussi (Stripe pourrait la payer)', doute(await etat2('ent-gratuit')), [true, undefined, undefined, undefined]);
      v('⛔ … et une fiche SANS formule aussi — elle n\'est plus servie d\'office, mais on ne la suspend pas sur une panne', doute(await etat2('ent-sans-formule')), [true, undefined, undefined, undefined]);
      const sansfp2 = await etat2('ent-sans-formule-promo');
      v('   (témoin) la fiche sans formule EN PÉRIODE OFFERTE : servie sans Stripe — la période se lit chez nous', [sansfp2.formule, sansfp2.paye, sansfp2.verificationImpossible], ['premium', true, undefined]);
      const sus2 = await etat2('ent-rien-sus');
      v('   … la suspension de la Tour voyage avec (l\'application l\'ignore tant qu\'on ne sait pas)', [sus2.verificationImpossible, sus2.suspendu, sus2.sursisJours], [true, true, 5]);
      const paye2 = await etat2('ent-paye');
      v('   (témoin) ce qu\'on SAIT sans Stripe décide toujours : le réglage à la main — Business Premium, payée', [paye2.formule, paye2.paye, paye2.verificationImpossible], ['premium', true, undefined]);
      /* l'horloge : on attend le GESTE (la date du témoin levée, le fichier réécrit), jamais un chronomètre */
      const lireCons = () => { try { return JSON.parse(fs.readFileSync(path.join(banc2, 'data', 'conservation.json'), 'utf8')); } catch (e) { return null; } };
      let cons = lireCons();
      for (let k = 0; k < 150 && cons && cons['ent-paye']; k++) { await dormir(100); cons = lireCons() || cons; }
      vrai('(population) le balayage de conservation a eu lieu : la date d\'« ent-paye » (réglée à la main, on SAIT qu\'elle paie) est levée', !!cons && !cons['ent-paye']);
      v('⛔⛔ … et le DOUTE n\'a rien effacé : « ent-rien » (Stripe muet, on ne sait pas) garde sa date — elle ne se rattrape pas',
        cons && cons['ent-rien'] && cons['ent-rien'].depuis, VIEUX_CONS);
      vrai('   … ni rien posé : « ent-gratuit » (on ne sait pas non plus) n\'a pas de date', !!cons && !cons['ent-gratuit']);
      vrai('   … ni « ent-sans-formule » (on ne sait pas non plus)', !!cons && !cons['ent-sans-formule']);
    }
  }

  console.log('\n══ 3. ⛔ LES VRAIES FONCTIONS DE L’ÉCRAN, EXÉCUTÉES ══\n');
  {
    /* ⛔ ON EXÉCUTE, ON NE LIT PAS. Un droit se mesure à ce qu'il LAISSE PASSER. On extrait le
       bloc réel d'`app.html` et on le fait tourner dans un bac à sable minimal. */
    const bloc = (nom) => { const i = NU.indexOf('function ' + nom); if (i < 0) return '';
      let j = i + 1; for (;;) { const k = NU.indexOf('\nfunction ', j); if (k < 0) return NU.slice(i);
        j = k + 1; if (!/^function (suspension|forfait|planBloque)/.test(NU.slice(k + 1, k + 40))) return NU.slice(i, k); } };
    const NOMS = ['suspensionCle', 'suspensionCharger', 'suspensionPoser', 'suspensionSursis',
                  'suspensionGrise', 'accesSuspendu', 'suspensionBloque', 'suspensionClasse', 'suspensionRappel', 'forfait', 'planBloque'];
    const src = NOMS.map(bloc).join('\n');
    vrai('⛔ les onze fonctions sont trouvées dans app.html (une tranche vide passe au vert sur tout)',
      NOMS.every(n => bloc(n).length > 20) && src.length > 900, NOMS.filter(n => bloc(n).length <= 20).join(', ') + ' — ' + src.length + ' caractères');
    const PB = /const PLAN_BLOQUE=\{[\s\S]*?\n\};/.exec(NU);
    vrai('   et la liste des catégories payantes aussi', !!PB);
    /* v767 : `forfait()` lit les formules (un « gratuit » resté dans une base d'avant se lit Pro) */
    const PL = /const PLANS=\{[\s\S]*?\n\};/.exec(NU);
    vrai('   et les formules (`PLANS`) aussi', !!PL && !/\bgratuit:\{/.test(PL[0]), PL && PL[0].slice(0, 80));
    /* ⛔ ET L'ÉTAT LUI-MÊME, EXTRAIT DU FICHIER. Le recopier ici ferait un banc qui garde une
       croyance : il resterait vert le jour où la forme change dans `app.html`. */
    const ETAT = /let _susp = \{[^}]*\};/.exec(NU);
    vrai('   et l’état `_susp` est extrait du fichier, pas recopié', !!ETAT, String(ETAT && ETAT[0]));

    const rangement = {};
    const bac = {
      STORE_KEY: 'elan_essai', BETA_ESSAI: false, db: { forfait: 'premium' },
      currentUser: { id: 'u1', role: 'admin' }, current: '', toasts: [],
      localStorage: { getItem: k => (k in rangement ? rangement[k] : null),
                      setItem: (k, x) => { rangement[k] = String(x); }, removeItem: k => { delete rangement[k]; } },
      toast: function (t) { bac.toasts.push(String(t)); },
      renderNav: () => {}, go: () => {}, todayISO: () => '2026-09-22',
    };
    const f = new Function('ctx', 'with(ctx){ ' + (PL ? PL[0] : '') + '\n' + (PB ? PB[0] : '') + '\n' + (ETAT ? ETAT[0] : '') + '\n' + src +
      '\n return { poser:suspensionPoser, grise:suspensionGrise, sursis:suspensionSursis,' +
      ' forfait:forfait, bloque:planBloque, rappel:suspensionRappel, charger:suspensionCharger, acces:accesSuspendu }; }');
    const A = f(bac);

    A.poser({ suspendu: false, sursisJours: null });
    v('une entreprise qui paye garde son forfait', [A.forfait(), A.grise(), A.bloque('produits')], ['premium', false, false]);
    A.poser({ suspendu: true, sursisJours: 5 });
    v('⛔ pendant le sursis, RIEN ne grise', [A.forfait(), A.grise(), A.bloque('produits')], ['premium', false, false]);
    A.poser({ suspendu: true, sursisJours: 0 });
    /* ⛔⛔ v767 — le sursis écoulé ne ramène plus à un Gratuit qui n'existe plus : l'ACCÈS est suspendu. */
    v('⛔⛔ sursis écoulé : l’accès est SUSPENDU — la formule, elle, ne change pas', [A.acces(), A.forfait()], [true, 'premium']);
    v('   … et TOUT grise, pas seulement les catégories payantes (le tableau de bord, les interventions, le planning compris)',
      ['produits', 'boxes', 'bons', 'dashboard', 'interventions', 'planning'].map(k => A.bloque(k)), [true, true, true, true, true, true]);
    v('⛔ … SAUF les Paramètres : c’est là que l’administrateur règle son abonnement', A.bloque('parametres'), false);
    v('⛔⛔ … et `db.forfait` n’a PAS été touché (le règlement doit tout rendre d’un coup)', bac.db.forfait, 'premium');
    /* ⛔ LA BÊTA N'EST JAMAIS SUSPENDUE : c'est l'outil de travail de l'équipe, et son espace n'a pas d'abonnement. */
    bac.BETA_ESSAI = true;
    v('⛔ sur la bêta (BETA_ESSAI), rien n’est suspendu ni grisé', [A.acces(), A.bloque('dashboard'), A.bloque('produits')], [false, false, false]);
    /* … ni RAPPELÉ (troisième relecture de `relecteur`, 30 septembre 2026 : le rappel lisait `_susp` en direct) — la marque du jour
       oubliée d'abord, sinon on mesurerait la marque et pas la règle */
    const oublierRappel = () => { for (const k of Object.keys(rangement)) if (/_rappel_/.test(k)) delete rangement[k]; bac.toasts.length = 0; };
    oublierRappel(); A.rappel();
    v('⛔ … ni rappelé : aucun « Abonnement non réglé » à l’administrateur de la bêta', bac.toasts, []);
    bac.BETA_ESSAI = false;
    oublierRappel(); A.rappel();
    vrai('   (témoin) hors bêta, le même état rappelle l’administrateur', bac.toasts.length === 1 && /Abonnement non réglé/.test(bac.toasts[0]), bac.toasts);
    oublierRappel();   // la marque que le témoin vient de poser : la suite du banc part d'un jour sans rappel, comme avant
    A.poser({ suspendu: false, sursisJours: null });
    v('⛔ réglé : tout revient, sans rien recalculer', [A.acces(), A.forfait(), A.bloque('produits'), A.bloque('dashboard')], [false, 'premium', false, false]);

    /* ⛔ UN SERVEUR PLUS ANCIEN NE DOIT RIEN GRISER. `sursisJours` absent ne veut pas dire
       « fini » : entre « trop » et « rien », on choisit trop. */
    A.poser({ suspendu: true });
    v('⛔ champ ABSENT (serveur ancien) : on ne grise pas', [A.sursis(), A.grise(), A.forfait()], [null, false, 'premium']);

    console.log('');
    /* ── le rappel : un par jour, et sur le compte admin SEULEMENT ── */
    bac.toasts = []; A.poser({ suspendu: true, sursisJours: 3 });
    A.rappel(); A.rappel(); A.rappel();
    v('⛔ trois appels le même jour ne donnent QU’UN rappel', bac.toasts.length, 1);
    vrai('   et il dit combien de jours il reste', /il reste 3 jours/.test(bac.toasts[0] || ''), bac.toasts[0]);
    bac.currentUser = { id: 'u2', role: 'tech' }; bac.toasts = [];
    A.rappel();
    v('⛔⛔ un TECHNICIEN n’apprend RIEN (« c’est pas aux utilisateurs de savoir »)', bac.toasts.length, 0);
    bac.currentUser = { id: 'u3', role: 'admin' }; bac.toasts = [];
    A.poser({ suspendu: true, sursisJours: 0 }); A.rappel();
    vrai('⛔ sursis écoulé : le rappel dit que rien n’est perdu',
      /rien n’est perdu|Rien n'est perdu/i.test(bac.toasts[0] || ''), bac.toasts[0]);

    /* ⛔ L'ÉTAT SE RELIT AU CHARGEMENT : un impayé hors ligne retrouverait sinon toutes ses
       catégories jusqu'au prochain aller-retour avec le serveur. */
    vrai('⛔ `load()` relit l’état de facturation avant le premier affichage',
      /function load\(\)\{ try\{ suspensionCharger\(\); \}catch\(e\)\{\}/.test(NU));
    const bac2 = Object.assign({}, bac, { toasts: [] });
    const A2 = f(bac2); A2.charger();
    v('   … et il retrouve bien le sursis écoulé : accès suspendu, formule intacte', [A2.grise(), A2.acces(), A2.forfait(), A2.bloque('dashboard')], [true, true, 'premium', true]);

    /* ⛔ ET LA RÉPONSE DU SERVEUR DOIT L'ALIMENTER — sinon tout ce qui précède est du code
       que personne n'appelle, le jumeau d'`atts` dans /health. */
    /* ⛔ « ＋ Créer » ET « J'AI RÉGLÉ — VÉRIFIER » PENDANT UNE SUSPENSION (`relecteur`, 30 septembre 2026) — les VRAIES
       fonctions : le premier répondait « Aucune création ouverte à ton compte » (faux, et ne menait nulle part) ; le second
       affirmait « toujours suspendu : le règlement n'est pas encore arrivé » sur une vérification qui n'avait PAS eu lieu. */
    const extraireApp = (debut) => { const d0 = NU.indexOf(debut); if (d0 < 0) return ''; let p = 0;
      for (let k = NU.indexOf('{', d0); k < NU.length; k++) { if (NU[k] === '{') p++; else if (NU[k] === '}') { p--; if (!p) return NU.slice(d0, k + 1); } }
      return ''; };
    const CO = extraireApp('function creerOuvrir('), SV = extraireApp('async function suspensionVerifier(');
    vrai('(population) creerOuvrir et suspensionVerifier sont trouvées dans app.html', CO.length > 200 && SV.length > 200 && /accesSuspendu\(\)/.test(CO));
    const jeu = (suspendue, lu, role) => { const tr = { go: [], toasts: [], dispo: 0 };
      const f = new Function('currentUser', 'accesSuspendu', 'go', 'toast', 'creerDispo', 'document', 'forfaitServeurSync', 'current', 'views',
        CO + '\n' + SV + '\nreturn { creerOuvrir, suspensionVerifier };')(
        { id: 'u-761', role: role || 'admin' }, () => suspendue, x => tr.go.push(x), m => tr.toasts.push(String(m)), () => { tr.dispo++; return []; },
        { getElementById: () => null }, async () => lu, 'suspendu', { suspendu() {} });
      return { f, tr }; };
    let J = jeu(true, true); J.f.creerOuvrir();
    v('⛔ « ＋ Créer » pendant une suspension : l\u2019écran « Accès suspendu » — pas « Aucune création ouverte à ton compte »', [J.tr.go, J.tr.toasts, J.tr.dispo], [['suspendu'], [], 0]);
    J = jeu(false, true); J.f.creerOuvrir();
    v('   (témoin) hors suspension : la feuille « Créer » se prépare comme avant', [J.tr.go, J.tr.dispo], [[], 1]);
    J = jeu(true, false); await J.f.suspensionVerifier(null);
    vrai('⛔ « J\u2019ai réglé — vérifier » quand la vérification n\u2019a PAS pu se faire : « Vérification impossible », jamais « toujours suspendu »',
      J.tr.toasts.length === 1 && /Vérification impossible/.test(J.tr.toasts[0]) && !/Toujours suspendu/.test(J.tr.toasts[0]), J.tr.toasts);
    J = jeu(true, true); await J.f.suspensionVerifier(null);
    vrai('   … lue, et toujours suspendue : l\u2019administrateur lit que le règlement n\u2019est pas encore arrivé', J.tr.toasts.length === 1 && /Toujours suspendu/.test(J.tr.toasts[0]), J.tr.toasts);
    /* ⛔ LE BOUTON SE REND TOUJOURS (seconde relecture de `relecteur`, 30 septembre 2026) : touché depuis la carte des Paramètres
       (rien ne repeint l'écran), il restait grisé sur « Vérification… » et il fallait quitter la page pour réessayer */
    /* le bouton tel que la page le porte : son « ↻ » est devenu un <svg> (`icones()`), que `textContent` ne contient PAS — rendu par
       son texte, il revenait sans son icône (troisième relecture de `relecteur`, 30 septembre 2026) */
    const BOUTON = '<svg class="rf-ic" aria-hidden="true"></svg> J\u2019ai réglé — vérifier';
    const jeuB = (lu, cur) => { const tr = { pendant: null };
      const b = { _h: BOUTON, disabled: false, isConnected: true,
        get innerHTML() { return this._h; }, set innerHTML(x) { this._h = String(x); },
        get textContent() { return this._h.replace(/<[^>]*>/g, ''); }, set textContent(x) { this._h = String(x); } };
      const f = new Function('currentUser', 'accesSuspendu', 'go', 'toast', 'creerDispo', 'document', 'forfaitServeurSync', 'current', 'views',
        CO + '\n' + SV + '\nreturn { creerOuvrir, suspensionVerifier };')(
        { id: 'u-761', role: 'admin' }, () => true, () => {}, () => {}, () => [], { getElementById: () => null },
        async () => { tr.pendant = [b.disabled, b.textContent]; return lu; }, cur, { suspendu() { b.isConnected = false; } });
      return { f, tr, b }; };
    let B = jeuB(true, 'parametres'); await B.f.suspensionVerifier(B.b);
    v('⛔ depuis les Paramètres, toujours suspendue : grisé PENDANT la vérification, puis rendu — actif, son libellé ET son icône',
      [B.tr.pendant, B.b.disabled, B.b.innerHTML], [[true, 'Vérification…'], false, BOUTON]);
    B = jeuB(false, 'parametres'); await B.f.suspensionVerifier(B.b);
    v('   … vérification impossible : rendu aussi, icône comprise', [B.b.disabled, B.b.innerHTML], [false, BOUTON]);
    B = jeuB(true, 'suspendu'); await B.f.suspensionVerifier(B.b);
    v('   (témoin) sur l\u2019écran « Accès suspendu », redessiné : l\u2019ancien bouton n\u2019est plus dans la page, on n\u2019y touche pas',
      [B.b.isConnected, B.b.disabled], [false, true]);
    /* ⛔ ce que voit qui n'est pas administrateur (seconde relecture de `relecteur`) : l'infobulle du 🔒 ne parle de règlement
       qu'à l'administrateur, et l'écran suspendu ne promet pas un avis qui n'existe pas */
    vrai('⛔ le 🔒 du menu : « règlement de l\u2019abonnement » pour l\u2019administrateur seul, « momentanément suspendu » pour les autres',
      /const verrouTitre=\(currentUser&&currentUser\.role==='admin'\)\?'Accès suspendu jusqu’au règlement de l’abonnement':'Accès momentanément suspendu';/.test(NU)
      && /class="nav-item nav-verrou" style="opacity:\.38" title="\$\{verrouTitre\}"/.test(NU) && !/title="Accès suspendu jusqu’au règlement/.test(NU));
    vrai('   … et l\u2019écran suspendu d\u2019un non-administrateur dit ce qui est vrai : son administrateur peut rétablir l\u2019accès (pas « prévenu »)',
      /<b>Ton administrateur peut le rétablir depuis son application\.<\/b>/.test(NU) && !/Ton administrateur est prévenu/.test(NU));
    /* ⛔ la bêta n'est jamais suspendue, ici non plus : les deux lectures directes de la suspension passent par la règle */
    vrai('⛔ la largesse d\u2019une période offerte et la proposition d\u2019abonnement lisent la règle de la bêta (`accesSuspendu`, `BETA_ESSAI`)',
      /function essaiCouvreEquipe\(\)\{[^\n]*&&!accesSuspendu\(\)\); \}/.test(NU) && /if\(!BETA_ESSAI&&_susp\.suspendu\)\{ if\(confirm\('Abonnement en attente de règlement/.test(NU));
    /* (le passage lui-même — une réponse du serveur qui suspend, une autre qui rend — est JOUÉ contre le vrai serveur par
       `test-845` et `test-848`, avec les vraies `forfaitServeurSync`) */
    vrai('⛔⛔ `forfaitServeurSync` appelle bien suspensionPoser et suspensionRappel — hors d’une vérification impossible',
      /if\(!j\.verificationImpossible\)\{ try\{ suspensionPoser\(nonPaye\?Object\.assign\(\{\},j,\{suspendu:true,sursisJours:0\}\):j\); suspensionRappel\(\); \}catch\(e\)\{\} \}/.test(NU));
  }

  await arreter();
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(async (e) => {
  console.error('\n✗ le banc est tombé : ' + (e && e.stack || e));
  await arreter();
  console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗');
  process.exit(1);
});

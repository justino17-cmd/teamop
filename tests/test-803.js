/* ⛔⛔ UN CODE PROMO SERT UNE FOIS PAR ENTREPRISE — Justin, 24 septembre 2026 :
   « Pour le code promo, une fois qu'une entreprise l'a activé, ils peuvent pas le remettre. »

   CE QUI SE PASSAIT AVANT. L'échéance ne se prolongeait déjà jamais : retaper un code rendait la
   MÊME date. Mais la réponse disait « ok » — sur une période TERMINÉE aussi — et trois choses
   suivaient :
   · l'application affichait « 🎉 Code accepté ! », repassait toute l'équipe en formule payante et
     remettait le début de la période à aujourd'hui, jusqu'à ce que `promoEssaiCheck` la referme
     avec « Ton essai est terminé » ;
   · une demande faite sur le site avec le même code écrivait au client « votre code est activé …
     jusqu'au » une date PASSÉE, sans lien de paiement ;
   · « repartir à neuf » (la Tour) donne un NOUVEL identifiant d'espace : sans mémoire, le même
     code redevenait NEUF pour la même entreprise — une seconde période offerte.

   CE QUE CE BANC JOUE, dans cet ordre :
   0. le TEXTE du serveur (les cinq chemins qui activent passent par la même règle) ;
   1. les VRAIES fonctions de la règle, extraites du fichier et exécutées ;
   2. le VRAI serveur, isolé, parlé en HTTP : l'application, le rattrapage, la Tour, « repartir à
      neuf », l'aperçu, l'inventaire de suppression — puis un second serveur au registre ILLISIBLE ;
   3. la VRAIE `promoAppliquer` d'`app.html`, contre ce vrai serveur ET contre la réponse du serveur
      d'AVANT (qui dit encore « ok » sur une période passée).
   Aucun vrai code : ceux d'ici sont FICTIFS, sans chiffre (règle du dépôt — un code promo ne
   s'écrit dans aucun fichier servi, et `scripts/verif-secrets.sh` refuse ce qui y ressemble). */

const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SRV = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
const APP = fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8');
const SURV = fs.readFileSync(path.join(RACINE, '.github', 'scripts', 'surveillance.js'), 'utf8');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
const faux = (t, a) => v(t, !!a, false);

const CODE = 'ESSAI-BANC-UNEFOIS', AUTRE = 'ESSAI-BANC-AUTRE', TROISIEME = 'ESSAI-BANC-TROISIEME';
const AUJ = new Date().toISOString().slice(0, 10);
const PASSE = '2026-04-01';
const dans = (mois) => { const d = new Date(); d.setMonth(d.getMonth() + mois); return d.toISOString().slice(0, 10); };

/* Une fonction du fichier, par son nom, découpée à l'accolade — la même découpe que test-727. */
function extraire(src, nom) {
  let d0 = src.indexOf('function ' + nom + '(');
  if (d0 < 0) return '';
  if (src.slice(d0 - 6, d0) === 'async ') d0 -= 6;   // `async` fait partie de la déclaration : sans lui, `await` ne se parse plus
  let p = 0;
  for (let k = src.indexOf('{', d0); k < src.length; k++) { if (src[k] === '{') p++; else if (src[k] === '}') { p--; if (!p) return src.slice(d0, k + 1); } }
  return '';
}
/* Les commentaires qui COMMENCENT une ligne, et eux seuls (règle du dépôt : le motif naïf avale du
   vrai code), puis les lignes `//`. Un motif de banc vise du code, jamais une phrase. */
const sansCommentaires = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const CODE_SRV = sansCommentaires(SRV);

/* ══ 0. LE TEXTE : LES CINQ CHEMINS QUI ACTIVENT PASSENT PAR LA MÊME RÈGLE ═══════════════════ */
console.log('\n══ 0. Les cinq chemins qui activent un code passent par la même règle ══');
{
  const bloc = (debut, fin) => { const i = CODE_SRV.indexOf(debut); const j = i < 0 ? -1 : CODE_SRV.indexOf(fin, i + debut.length); return (i < 0 || j < 0) ? '' : CODE_SRV.slice(i, j); };
  const valider = bloc("app.post('/api/promo/valider'", 'function rappelsEcheances(');
  const tour = bloc("app.post('/api/monitor/espaces/promo'", 'app.post(');
  const rattrapage = bloc('async function espacePaye(e, opts) {', 'const sk = config.stripe');
  const relais = bloc('const pc = monStr(b.promoCode, 40)', "console.log('code promo du site IGNORÉ");
  const demande = bloc('let promoActif = null, promoRefuse = null;', 'const promoLib =');
  const renaitre = bloc("app.post('/api/monitor/espaces/renaitre'", 'let efface = false;');
  const population = { valider: valider.length, tour: tour.length, rattrapage: rattrapage.length, relais: relais.length, demande: demande.length, renaitre: renaitre.length };
  vrai('population : les six blocs sont trouvés dans le code', Object.values(population).every(n => n > 200));
  if (!Object.values(population).every(n => n > 200)) console.log('      ', JSON.stringify(population));

  vrai('l\'application : le verdict vient de `promoPresente`', /const pres = \(!apercu && team\) \? promoPresente\(c, team, ''\) : null;/.test(valider));
  vrai('   … et un code déjà servi est REFUSÉ (410, `dejaUtilise`)', /if \(pres && pres\.etat === 'servi'\)\s*return res\.status\(410\)\.json\(\{ error: promoRefusServi\(c, pres\.finLe\), dejaUtilise: true/.test(valider));
  vrai('   … et l\'aperçu ne lit rien de personne (pas de `pres` sans preuve)', !/if \(team && !deja\)/.test(valider));
  vrai('la Tour : le verdict vient de `promoPresente`', /const pres = promoPresente\(c, t, slug\);/.test(tour));
  vrai('   … et un code déjà servi y est refusé aussi', /if \(pres\.etat === 'servi'\)\s*return res\.status\(410\)/.test(tour));
  vrai('le rattrapage : `promoServiA`, plus `u0.equipes[e.t]` seul', /!promoServiA\(c, e\.t, e\.slug\)/.test(rattrapage) && !/!u0\.equipes\[e\.t\]/.test(rattrapage));
  vrai('   … « un seul code à la fois », qu\'il ne faisait pas', /!promoAutreActif\(c, e\.t, e\.slug\)/.test(rattrapage));
  vrai('   … et rien ne s\'active sur un registre illisible', /!promosIllisible/.test(rattrapage));
  vrai('le relais du portail : `promoPresente`, et n\'active que du NEUF', /const pres = u \? promoPresente\(pc, tEsp, ''\) : null;/.test(relais) && /pres && pres\.etat === 'neuf' && !autre/.test(relais));
  vrai('la demande du site : `promoPresente`, et un refus DIT', /const pres = promoPresente\(promoDef\.code, auto\.t, auto\.slug\);/.test(demande) && /if \(pres\.etat === 'servi'\) promoRefuse =/.test(demande));
  vrai('   … et `codePromo` n\'est pas posé pour un code refusé', /if \(promoDef && !promoRefuse\) \{ const eEsp = espacesReg\[auto\.slug\];/.test(CODE_SRV));
  vrai('   … et le courriel du client porte le refus', /promoRefuse \? '\\n⚠️ ' \+ promoRefusServi\(promoRefuse\.code, promoRefuse\.finLe\)/.test(CODE_SRV));

  /* Chaque utilisation s'écrit par `promoEntree` (adresse + empreinte de l'e-mail), jamais à la main. */
  const aLaMain = (CODE_SRV.match(/equipes\[[^\]]+\] = \{ date:/g) || []).length;
  v('⛔ plus AUCUNE utilisation écrite à la main (`equipes[t] = { date: … }`)', aLaMain, 0);
  const entrees = (CODE_SRV.match(/= promoEntree\(/g) || []).length;
  v('   … les cinq chemins passent par `promoEntree`', entrees, 5);

  vrai('« repartir à neuf » marque les utilisations AVANT d\'effacer l\'annuaire', /if \(t\) promoMarquerAvantRenaitre\(t, slug, e\.email\);\s*delete espacesReg\[slug\];/.test(renaitre));
  vrai('la suppression totale efface par `promoCles` (identifiant ET empreinte)', /for \(const \{ code, cle \} of promoCles\(t, inv\.slugs, inv\.emails\)\)/.test(CODE_SRV));
  vrai('   … et son inventaire compte de la même façon', /const promos = \[\.\.\.new Set\(promoCles\(t, slugs, emails\)\.map\(x => x\.code\)\)\];/.test(CODE_SRV));

  /* Le registre : écrit à côté puis renommé, et jamais par-dessus un fichier illisible. */
  const save = extraire(SRV, 'savePromoUsages');
  vrai('`savePromoUsages` écrit un temporaire puis RENOMME', /writeFileSync\(tmp,/.test(save) && /renameSync\(tmp, PROMO_USAGE_PATH\)/.test(save));
  vrai('   … et refuse d\'écrire par-dessus un registre illisible', /if \(promosIllisible\) \{[^}]*return false; \}/.test(save));
  v('⛔ plus aucune écriture DIRECTE du registre', (CODE_SRV.match(/writeFileSync\(PROMO_USAGE_PATH/g) || []).length, 0);
  vrai('`/health` publie `registres.promos` (un booléen)', /registres: \{ espaces: !espacesIllisible, fermes: !fermesIllisible, promos: !promosIllisible \}/.test(CODE_SRV));
  vrai('⛔ … et la surveillance le LIT (`j.registres.promos`)', /j\.registres\.promos === false/.test(sansCommentaires(SURV)));
}

/* ══ 1. LES VRAIES FONCTIONS DE LA RÈGLE, EXÉCUTÉES ═══════════════════════════════════════════ */
console.log('\n══ 1. Les vraies fonctions de la règle, exécutées ══');
const NOMS = ['promoAujourdhui', 'promoDateFr', 'promoEmpreinteMail', 'promoIdentite', 'promoServiA', 'promoAutreActif',
  'promoEntree', 'promoPresente', 'promoRefusServi', 'promoMarquerAvantRenaitre', 'promoCles', 'espaceParT'];
const SOURCES = NOMS.map(n => extraire(SRV, n));
vrai('population : les douze fonctions sont trouvées dans le fichier réel', SOURCES.every(Boolean));
function bac(espacesReg, promoUsages, illisible) {
  const trace = { ecrit: 0 };
  const api = new Function('espacesReg', 'promoUsages', 'crypto', 'savePromoUsages', 'etatIllisible',
    'let promosIllisible = etatIllisible;\n' + SOURCES.join('\n') + '\nreturn {' + NOMS.join(',') + '};')(
    espacesReg, promoUsages, crypto, () => { trace.ecrit++; return true; }, !!illisible);
  return { api, trace };
}
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64');
const { api: P0 } = bac({}, {});
const fp = P0.promoEmpreinteMail;
{
  const e1 = fp('Patron@Boulangerie-Sonde.fr');
  vrai('l\'empreinte d\'une adresse n\'est pas l\'adresse', e1 && !/boulangerie|@/.test(e1));
  v('   … elle ne dépend pas de la casse', fp('patron@boulangerie-sonde.fr'), e1);
  v('   … et une adresse vide n\'a pas d\'empreinte', fp(''), '');

  const reg = {
    cafesonde: { nom: 'Café Sonde', email: 'cafe@sonde-exemple.fr', t: 'ent-cafe-2', code: b64({ t: 'ent-cafe-2', k: 'k' }), ts: 2 },
    atelier: { nom: 'Atelier', email: '', t: 'ent-atelier-2', code: b64({ t: 'ent-atelier-2', k: 'k' }), ts: 3 },
    reprise: { nom: 'Reprise', email: 'autre@ailleurs-exemple.fr', t: 'ent-reprise-9', code: b64({ t: 'ent-reprise-9', k: 'k' }), ts: 4 },
  };
  const us = { [CODE]: { n: 4, equipes: {
    'ent-cafe-1': { date: '2026-01-01', finLe: PASSE, slug: 'cafesonde', em: fp('cafe@sonde-exemple.fr') },   // l'ancien identifiant du café
    'ent-atelier-1': { date: '2026-01-01', finLe: PASSE, slug: 'atelier', em: '' },                         // un accès sans e-mail
    'ent-reprise-1': { date: '2026-01-01', finLe: PASSE, slug: 'reprise', em: fp('ancien@proprietaire-exemple.fr') },
    'ent-vieux': { date: '2026-01-01', finLe: PASSE, slug: 'reprise', em: '' },                              // sans e-mail, même adresse
  } } };
  const { api: P } = bac(reg, us);
  vrai('par l\'identifiant : l\'utilisation est retrouvée', P.promoServiA(CODE, 'ent-cafe-1', ''));
  vrai('⛔ par l\'EMPREINTE de l\'e-mail : la même entreprise sous un NOUVEL identifiant', P.promoServiA(CODE, 'ent-cafe-2', ''));
  vrai('   par l\'adresse, quand AUCUN des deux côtés n\'a d\'e-mail', P.promoServiA(CODE, 'ent-atelier-2', ''));
  faux('⛔ une AUTRE entreprise qui reprend une adresse libérée n\'hérite de rien (ni refus ni période)', P.promoServiA(CODE, 'ent-reprise-9', ''));
  faux('   une entreprise inconnue non plus', P.promoServiA(CODE, 'ent-inconnue', ''));
  faux('   un autre code non plus', P.promoServiA(AUTRE, 'ent-cafe-2', ''));

  /* Le verdict, pour qui PRÉSENTE le code. */
  const actif = { [CODE]: { n: 1, equipes: { 'ent-x-1': { date: AUJ, finLe: dans(2), slug: 'xsonde', em: fp('x@sonde-exemple.fr') } } } };
  const regX = { xsonde: { email: 'x@sonde-exemple.fr', t: 'ent-x-2', code: b64({ t: 'ent-x-2', k: 'k' }), ts: 1 } };
  const B1 = bac(regX, actif);
  v('jamais servi → « neuf »', B1.api.promoPresente(AUTRE, 'ent-x-2', '').etat, 'neuf');
  const pr = B1.api.promoPresente(CODE, 'ent-x-2', '');
  v('⛔ servi, période EN COURS → « actif », la MÊME échéance', [pr.etat, pr.finLe, pr.reporte], ['actif', dans(2), true]);
  vrai('   … reportée sur le nouvel identifiant, marquée `reporte`', actif[CODE].equipes['ent-x-2'] && actif[CODE].equipes['ent-x-2'].reporte === true);
  v('   … sans RIEN recompter', actif[CODE].n, 1);
  v('   … et c\'est écrit (une fois)', B1.trace.ecrit, 1);
  const pr2 = B1.api.promoPresente(CODE, 'ent-x-2', '');
  v('   … présenté encore : toujours la même échéance, plus rien à écrire', [pr2.etat, pr2.finLe, pr2.reporte, B1.trace.ecrit], ['actif', dans(2), false, 1]);
  const B2 = bac(reg, us);
  const ps = B2.api.promoPresente(CODE, 'ent-cafe-2', '');
  v('⛔⛔ servi, période TERMINÉE → « servi » (refus)', [ps.etat, ps.finLe], ['servi', PASSE]);
  v('   … et un refus n\'écrit rien', B2.trace.ecrit, 0);
  vrai('   … et il se DIT : le code, la date, la règle', /ESSAI-BANC-UNEFOIS/.test(B2.api.promoRefusServi(CODE, PASSE)) && /01\/04\/2026/.test(B2.api.promoRefusServi(CODE, PASSE)) && /qu.une fois par entreprise/.test(B2.api.promoRefusServi(CODE, PASSE)));
  const B3 = bac(reg, us, true);
  v('registre illisible → « indisponible » : on n\'active rien', B3.api.promoPresente(AUTRE, 'ent-cafe-2', '').etat, 'indisponible');

  /* Un seul code à la fois — y compris sous un ancien identifiant. */
  const deux = { [AUTRE]: { n: 1, equipes: { 'ent-x-1': { date: AUJ, finLe: dans(1), slug: 'xsonde', em: fp('x@sonde-exemple.fr') } } } };
  v('un AUTRE code en cours (sous l\'ancien identifiant) est vu', bac(regX, deux).api.promoAutreActif(CODE, 'ent-x-2', ''), AUTRE);
  v('   … et le même code ne compte pas comme « autre »', bac(regX, deux).api.promoAutreActif(AUTRE, 'ent-x-2', ''), '');

  /* Ce qu'on inscrit, et ce que « repartir à neuf » marque. */
  const regE = { boulangeriesonde: { email: 'Patron@Boulangerie-Sonde.fr', t: 'ent-bs-1', code: b64({ t: 'ent-bs-1', k: 'k' }), ts: 5 } };
  const en = bac(regE, {}).api.promoEntree(dans(3), 'ent-bs-1', '');
  v('`promoEntree` : la date, l\'échéance, l\'adresse, l\'empreinte', [en.date, en.finLe, en.slug, en.em], [AUJ, dans(3), 'boulangeriesonde', fp('patron@boulangerie-sonde.fr')]);
  faux('   … et jamais l\'adresse e-mail en clair', /@/.test(JSON.stringify(en)));
  const legs = { [CODE]: { n: 1, equipes: { 'ent-bs-1': { date: '2026-01-01', finLe: PASSE } } } };   // une utilisation d'avant la règle
  const BM = bac(regE, legs);
  v('« repartir à neuf » marque une utilisation d\'avant la règle', BM.api.promoMarquerAvantRenaitre('ent-bs-1', 'boulangeriesonde', 'patron@boulangerie-sonde.fr'), 1);
  v('   … son adresse et l\'empreinte de son e-mail', [legs[CODE].equipes['ent-bs-1'].slug, legs[CODE].equipes['ent-bs-1'].em], ['boulangeriesonde', fp('patron@boulangerie-sonde.fr')]);
  v('   … et l\'écrit', BM.trace.ecrit, 1);

  /* La suppression totale : tout ce qui est à l'entreprise, rien de ce qui est à une autre. */
  const cles = bac(reg, us).api.promoCles('ent-cafe-2', ['cafesonde'], ['cafe@sonde-exemple.fr']).map(x => x.cle).sort();
  v('⛔ la suppression totale emporte l\'utilisation d\'AVANT « repartir à neuf »', cles, ['ent-cafe-1']);
  const cles2 = bac(reg, us).api.promoCles('ent-reprise-9', ['reprise'], ['autre@ailleurs-exemple.fr']).map(x => x.cle).sort();
  v('   … et laisse celles d\'une AUTRE entreprise passée par la même adresse', cles2, []);
}

/* ══ 2. LE VRAI SERVEUR, ISOLÉ, PARLÉ EN HTTP ═════════════════════════════════════════════════ */
const BANC = path.join(require('os').tmpdir(), 'teamop-test-803-' + process.pid);
const sha = k => crypto.createHash('sha256').update(k).digest('hex');
const MDP = 'mot-de-passe-du-banc-803';
const dormir = ms => new Promise(r => setTimeout(r, ms));
const enfants = [];
function arreterTout() { for (const e of enfants) { try { if (e.exitCode === null) e.kill('SIGKILL'); } catch (x) {} } }
process.on('exit', () => { arreterTout(); try { fs.rmSync(BANC, { recursive: true, force: true }); } catch (e) {} });

async function monter(nom, espaces, usagesTexte) {
  const dir = path.join(BANC, nom), data = path.join(dir, 'data');
  fs.mkdirSync(data, { recursive: true });
  const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push'));
  const vap = webpush.generateVAPIDKeys();
  const cfgPath = path.join(dir, 'config.json');
  fs.writeFileSync(cfgPath, JSON.stringify({
    vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: sha(MDP),
    /* Rien ne doit toucher au vrai projet : « repartir à neuf » essaie d'effacer chez Google. */
    firebase: { apiKey: 'cle-de-banc-invalide', projectId: 'projet-de-banc-803' },
    promos: [{ code: CODE, formule: 'premium', mois: 3, maxUtilisations: 50 }, { code: AUTRE, formule: 'pro', mois: 1 }, { code: TROISIEME, formule: 'business', mois: 2 }],
  }));
  fs.writeFileSync(path.join(data, 'espaces.json'), JSON.stringify(espaces));
  if (usagesTexte !== undefined) fs.writeFileSync(path.join(data, 'promos-usages.json'), usagesTexte);
  const port = await new Promise(res => { const s = require('net').createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
  const enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], {
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: cfgPath, TEAMOP_DATA: data, PORT: String(port) }), stdio: ['ignore', 'pipe', 'pipe'] });
  enfants.push(enfant);
  let journal = ''; enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
  const B = 'http://127.0.0.1:' + port;
  let vivant = false;
  for (let i = 0; i < 150 && !vivant; i++) { await dormir(100); try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} }
  const appel = async (meth, route, corps, entetes) => {
    const r = await fetch(B + route, { method: meth, headers: Object.assign({ 'Content-Type': 'application/json' }, entetes || {}), body: corps ? JSON.stringify(corps) : undefined });
    const txt = await r.text(); let json = null; try { json = JSON.parse(txt); } catch (e) {}
    return { code: r.status, json: json || {}, txt };
  };
  const usages = () => { try { return JSON.parse(fs.readFileSync(path.join(data, 'promos-usages.json'), 'utf8')); } catch (e) { return null; } };
  const brut = () => { try { return fs.readFileSync(path.join(data, 'promos-usages.json'), 'utf8'); } catch (e) { return null; } };
  return { B, vivant, appel, usages, brut, data, journal: () => journal, enfant };
}

/* Les entreprises du banc — noms et adresses FICTIFS. */
const K = { bs: 'CLE-BOULANGERIE-803', gs: 'CLE-GARAGE-803', gs2: 'CLE-GARAGE-NEUVE-803', ms: 'CLE-MENUISERIE-803', fs: 'CLE-FLEURISTE-803',
  cs: 'CLE-CAFE-803', cs2: 'CLE-CAFE-REPRISE-803' };
const kh = k => ({ 'x-teamop-kh': sha(k) });
const ESPACES = {
  boulangeriesonde: { nom: 'Boulangerie Sonde', email: 'patron@boulangerie-sonde.fr', t: 'ent-bs-1', code: b64({ t: 'ent-bs-1', k: K.bs }), ts: 1 },
  garagesonde: { nom: 'Garage Sonde', email: 'garage@sonde-exemple.fr', t: 'ent-gs-1', code: b64({ t: 'ent-gs-1', k: K.gs }), ts: 2, formule: 'premium', codePromo: CODE },
  menuiseriesonde: { nom: 'Menuiserie Sonde', email: 'atelier@menuiserie-sonde.fr', t: 'ent-ms-2', code: b64({ t: 'ent-ms-2', k: K.ms }), ts: 3, formule: 'premium', codePromo: CODE },
  fleuristesonde: { nom: 'Fleuriste Sonde', email: 'fleurs@sonde-exemple.fr', t: 'ent-fs-1', code: b64({ t: 'ent-fs-1', k: K.fs }), ts: 4, formule: 'premium', codePromo: AUTRE },
  cafesonde: { nom: 'Café Sonde', email: 'cafe@sonde-exemple.fr', t: 'ent-cs-1', code: b64({ t: 'ent-cs-1', k: K.cs }), ts: 5 },
};
const USAGES = { [CODE]: { n: 3, equipes: {
  'ent-gs-1': { date: '2026-01-01', finLe: PASSE },                                                              // d'avant la règle : ni adresse ni empreinte
  'ent-ms-1': { date: '2026-01-01', finLe: PASSE, slug: 'menuiseriesonde', em: fp('atelier@menuiserie-sonde.fr') },  // l'ANCIEN identifiant de la menuiserie
  'ent-cs-1': { date: '2026-01-01', finLe: PASSE },                                                              // le café, période terminée
} } };

(async () => {
  let webpushOk = true;
  try { require(path.join(RACINE, 'server', 'node_modules', 'web-push')); } catch (e) { webpushOk = false; }
  if (!webpushOk) {
    console.log('\n  … parties 2 et 3 SAUTÉES : server/node_modules absent (cd server && npm i)');
    console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exitCode = ko ? 1 : 0; return;
  }
  const S = await monter('srv', ESPACES, JSON.stringify(USAGES));
  vrai('le serveur du banc démarre', S.vivant);
  if (!S.vivant) { console.log(S.journal().slice(-2000)); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exitCode = 1; return; }
  const n = c => ((S.usages() || {})[c] || {}).n;
  const eq = (c, t) => (((S.usages() || {})[c] || {}).equipes || {})[t];

  console.log('\n══ 2a. L\'application : une fois, puis plus jamais ══');
  {
    let r = await S.appel('POST', '/api/promo/valider', { code: CODE, teamId: 'ent-bs-1' }, kh(K.bs));
    v('première fois : activé', [r.code, r.json.ok, r.json.dejaUtilise, r.json.finLe], [200, true, false, dans(3)]);
    v('   … une utilisation de plus', n(CODE), 4);
    const e1 = eq(CODE, 'ent-bs-1') || {};
    v('   … inscrite avec son adresse et l\'empreinte de son e-mail', [e1.slug, e1.em], ['boulangeriesonde', fp('patron@boulangerie-sonde.fr')]);
    faux('   … et JAMAIS l\'adresse en clair dans le registre', /boulangerie-sonde\.fr/.test(S.brut() || ''));
    r = await S.appel('POST', '/api/promo/valider', { code: CODE, teamId: 'ent-bs-1' }, kh(K.bs));
    v('retapé PENDANT la période : la même échéance, dit « déjà utilisé »', [r.code, r.json.dejaUtilise, r.json.finLe, r.json.debut], [200, true, dans(3), AUJ]);
    v('   … rien ne se recompte', n(CODE), 4);

    r = await S.appel('POST', '/api/promo/valider', { code: CODE, teamId: 'ent-gs-1' }, kh(K.gs));
    v('⛔⛔ retapé APRÈS la période : REFUSÉ (410)', [r.code, r.json.ok, r.json.dejaUtilise, r.json.finLe], [410, undefined, true, PASSE]);
    vrai('   … et le refus se DIT : déjà utilisé, fini le 01/04/2026, une fois par entreprise', /déjà été utilisé/.test(r.json.error || '') && /01\/04\/2026/.test(r.json.error || '') && /une fois par entreprise/.test(r.json.error || ''));
    v('   … rien ne se recompte, rien ne se réécrit', [n(CODE), eq(CODE, 'ent-gs-1')], [4, { date: '2026-01-01', finLe: PASSE }]);

    /* Sans preuve, rien : la règle ne donne pas un oracle sur les codes des autres. */
    r = await S.appel('POST', '/api/promo/valider', { code: CODE, teamId: 'ent-gs-1' });
    v('sans preuve de clé : 403, comme avant', r.code, 403);
    r = await S.appel('POST', '/api/promo/valider', { code: AUTRE, teamId: 'ent-bs-1', apercu: true });
    v('⛔ l\'aperçu ne lit rien de l\'entreprise nommée (plus de 409 qui dit son code en cours)', [r.code, r.json.ok, r.json.dejaUtilise], [200, true, false]);
    r = await S.appel('POST', '/api/promo/valider', { code: AUTRE, teamId: 'ent-bs-1' }, kh(K.bs));
    v('un AUTRE code pendant une période en cours : 409, un seul à la fois', r.code, 409);
    vrai('   … le message date à la française', /jusqu'au \d\d\/\d\d\/\d{4}/.test(r.json.error || ''));
  }

  console.log('\n══ 2b. Le rattrapage (l\'application demande son état) ══');
  {
    let r = await S.appel('POST', '/api/espaces/etat', { t: 'ent-gs-1' });
    v('un code déjà servi, période passée : PAS payé', [r.code, r.json.paye], [200, false]);
    v('   … et rien ne s\'est réactivé', [n(CODE), eq(CODE, 'ent-gs-1')], [4, { date: '2026-01-01', finLe: PASSE }]);
    r = await S.appel('POST', '/api/espaces/etat', { t: 'ent-ms-2' });
    v('⛔ servi sous l\'ANCIEN identifiant (même e-mail) : PAS réactivé sous le nouveau', [r.json.paye, n(CODE), eq(CODE, 'ent-ms-2')], [false, 4, undefined]);
    r = await S.appel('POST', '/api/espaces/etat', { t: 'ent-fs-1' });
    v('le témoin : un code JAMAIS servi s\'active bien au rattrapage', [r.json.paye, n(AUTRE)], [true, 1]);
    vrai('   … avec son adresse et son empreinte', (eq(AUTRE, 'ent-fs-1') || {}).em === fp('fleurs@sonde-exemple.fr'));
  }

  console.log('\n══ 2c. La Tour ══');
  const tour = (await S.appel('POST', '/api/monitor/login', { nom: 'Patron', pass: MDP })).json;
  vrai('la Tour se connecte', /^[a-f0-9]{48}$/.test(String(tour.token || '')));
  const T = { Authorization: 'Bearer ' + tour.token };
  {
    let r = await S.appel('POST', '/api/monitor/espaces/promo', { nom: 'garagesonde', code: CODE }, T);
    v('⛔ la Tour ne rend pas non plus un code déjà servi (410)', [r.code, r.json.dejaUtilise], [410, true]);
    vrai('   … et dit ce qu\'elle peut faire à la place : « Essai offert »', /Essai offert/.test(r.json.error || ''));
    r = await S.appel('POST', '/api/monitor/espaces/promo', { nom: 'boulangeriesonde', code: CODE }, T);
    v('un code en cours, depuis la Tour : même échéance, dit « déjà utilisé »', [r.code, r.json.finLe, r.json.dejaUtilise, n(CODE)], [200, dans(3), true, 4]);
    r = await S.appel('POST', '/api/monitor/espaces/promo', { nom: 'cafesonde', code: AUTRE }, T);
    v('un code neuf, depuis la Tour : activé', [r.code, r.json.dejaUtilise, n(AUTRE)], [200, false, 2]);
  }

  console.log('\n══ 2d. « Repartir à neuf » ne remet pas un code à zéro ══');
  {
    /* Le garage : utilisation d'AVANT la règle (ni adresse ni empreinte), période passée. */
    let r = await S.appel('POST', '/api/monitor/espaces/renaitre', { nom: 'garagesonde' }, T);
    v('la Tour fait repartir le garage à neuf', r.code, 200);
    v('⛔ son utilisation passée porte maintenant son adresse et l\'empreinte de son e-mail',
      [(eq(CODE, 'ent-gs-1') || {}).slug, (eq(CODE, 'ent-gs-1') || {}).em], ['garagesonde', fp('garage@sonde-exemple.fr')]);
    r = await S.appel('POST', '/api/monitor/espaces', { nom: 'garagesonde', code: b64({ t: 'ent-gs-2', k: K.gs2, n: 'Garage Sonde' }), email: 'garage@sonde-exemple.fr', origine: 'tour' }, T);
    v('… et le recrée, même adresse, même e-mail, NOUVEL identifiant', [r.code, r.json.slug], [200, 'garagesonde']);
    r = await S.appel('POST', '/api/promo/valider', { code: CODE, teamId: 'ent-gs-2' }, kh(K.gs2));
    v('⛔⛔ le même code, présenté sous le NOUVEL identifiant : REFUSÉ', [r.code, r.json.dejaUtilise], [410, true]);
    v('   … rien ne se recompte', n(CODE), 4);

    /* La boulangerie : période EN COURS — elle se reporte, sans se recompter. */
    r = await S.appel('POST', '/api/monitor/espaces/renaitre', { nom: 'boulangeriesonde' }, T);
    v('la Tour fait repartir la boulangerie à neuf (période en cours)', r.code, 200);
    await S.appel('POST', '/api/monitor/espaces', { nom: 'boulangeriesonde', code: b64({ t: 'ent-bs-2', k: K.bs + '-2', n: 'Boulangerie Sonde' }), email: 'patron@boulangerie-sonde.fr', origine: 'tour' }, T);
    r = await S.appel('POST', '/api/promo/valider', { code: CODE, teamId: 'ent-bs-2' }, kh(K.bs + '-2'));
    v('présenté sous le nouvel identifiant : la MÊME échéance, « déjà utilisé »', [r.code, r.json.finLe, r.json.dejaUtilise], [200, dans(3), true]);
    v('   … reportée, sans rien recompter', [(eq(CODE, 'ent-bs-2') || {}).reporte, n(CODE)], [true, 4]);
    r = await S.appel('POST', '/api/monitor/espaces/promo', { nom: 'boulangeriesonde', code: CODE }, T);
    r = await S.appel('POST', '/api/espaces/etat', { t: 'ent-bs-2' });
    v('   … et l\'entreprise est bien payée jusqu\'à la fin de SA période', [r.json.paye, /jusqu'au /.test(r.json.motif || '') && r.json.motif.includes(dans(3))], [true, true]);
    const lp = (await S.appel('GET', '/api/monitor/promos', null, T)).json;
    const lc = (lp.codes || []).find(c => c.code === CODE) || {};
    v('   … et la Tour compte UNE période en cours, pas deux', lc.actifs, 1);

    /* Le café : son adresse est libérée puis reprise par une AUTRE entreprise. */
    r = await S.appel('POST', '/api/monitor/espaces/renaitre', { nom: 'cafesonde' }, T);
    await S.appel('POST', '/api/monitor/espaces', { nom: 'cafesonde', code: b64({ t: 'ent-cs-9', k: K.cs2, n: 'Café Sonde' }), email: 'repreneur@autre-exemple.fr', origine: 'tour' }, T);
    r = await S.appel('POST', '/api/promo/valider', { code: CODE, teamId: 'ent-cs-9' }, kh(K.cs2));
    v('⛔ une AUTRE entreprise sur l\'adresse libérée n\'hérite d\'aucun refus : activé', [r.code, r.json.dejaUtilise, n(CODE)], [200, false, 5]);
  }

  console.log('\n══ 2e. La suppression totale voit les utilisations d\'avant « repartir à neuf » ══');
  {
    const r = await S.appel('POST', '/api/monitor/entreprise/apercu-suppression', { t: 'ent-gs-2' }, T);
    v('l\'inventaire du garage (nouvel identifiant) nomme le code servi sous l\'ancien', [r.code, (r.json.apercu || {}).promos], [200, [CODE]]);
    const r2 = await S.appel('POST', '/api/monitor/entreprise/apercu-suppression', { t: 'ent-cs-9' }, T);
    v('   … et celui du repreneur du café ne compte que le sien', (r2.json.apercu || {}).promos, [CODE]);
  }
  arreterTout();

  console.log('\n══ 2f. Un registre ILLISIBLE n\'est pas un registre vide ══');
  {
    const CASSE = '{"' + CODE + '": {"n": 3, "equipes": {"ent-gs-1": {"finLe": "2026-0';   // tronqué en pleine écriture
    const I = await monter('illisible', ESPACES, CASSE);
    vrai('le serveur démarre quand même', I.vivant);
    const h = (await I.appel('GET', '/health')).json;
    v('⛔ `/health` le dit : registres.promos = false', (h.registres || {}).promos, false);
    let r = await I.appel('POST', '/api/promo/valider', { code: CODE, teamId: 'ent-gs-1' }, kh(K.gs));
    v('⛔⛔ une activation est REFUSÉE (503) — sinon le code déjà servi redevenait neuf', r.code, 503);
    const tI = (await I.appel('POST', '/api/monitor/login', { nom: 'Patron', pass: MDP })).json;
    r = await I.appel('POST', '/api/monitor/espaces/promo', { nom: 'garagesonde', code: CODE }, { Authorization: 'Bearer ' + tI.token });
    v('   … depuis la Tour aussi', r.code, 503);
    r = await I.appel('POST', '/api/espaces/etat', { t: 'ent-fs-1' });
    faux('   … et le rattrapage n\'active rien', r.json.paye);
    v('⛔ le fichier abîmé est INTACT (récupérable), pas écrasé', I.brut(), CASSE);
    vrai('   … et le journal le crie', /promos-usages\.json ILLISIBLE/.test(I.journal()));
    arreterTout();
    const V = await monter('vide', ESPACES);   // le témoin : pas de fichier du tout = un registre neuf, pas une panne
    v('le témoin : sans fichier, le registre est simplement vide (true)', ((await V.appel('GET', '/health')).json.registres || {}).promos, true);
    arreterTout();
  }

  /* ══ 3. LA VRAIE `promoAppliquer` D'APP.HTML ══════════════════════════════════════════════ */
  console.log('\n══ 3. La vraie `promoAppliquer` d\'app.html ══');
  {
    const S2 = await monter('app', { boulangeriesonde: ESPACES.boulangeriesonde, garagesonde: ESPACES.garagesonde }, JSON.stringify(USAGES));
    vrai('le serveur de la partie 3 démarre', S2.vivant);
    const fA = extraire(APP, 'promoAppliquer'), fR = extraire(APP, 'promoRefusModal');
    /* ⛔ DEUX PAGES, ET CE BANC DOIT PASSER CONTRE LES DEUX. Il est dans la liste du déploiement du
       serveur seul (`scripts/bancs-serveur.liste`) : là, il lit l'`app.html` que `main` sert — la
       v695, d'AVANT la règle. Ce qu'on y vérifie est la couture qui compte ce jour-là : le refus du
       NOUVEAU serveur s'AFFICHE sur la page des clients (son `toast`), et n'écrit rien. La page de la
       branche, elle, porte la règle et se vérifie en entier. */
    const PAGE_NEUVE = !!fR;
    vrai('population : `promoAppliquer` est trouvée', fA.length > 500);
    console.log('  (page lue : ' + (PAGE_NEUVE ? 'celle de la branche, qui porte la règle' : 'celle d\u2019AVANT la règle — on vérifie que le refus du serveur s\u2019y affiche et n\u2019écrit rien') + ')');
    const PLANS = { gratuit: { l: 'Gratuit' }, pro: { l: 'Pro' }, business: { l: 'Business' }, premium: { l: 'Business Premium' } };
    function page(t, cle, db, fetchFaux) {
      const tr = { fetch: 0, save: 0, modals: [], toasts: [], logs: [] };
      const fetchVrai = async (u, o) => { tr.fetch++; return fetchFaux ? fetchFaux(u, o) : fetch(u.replace('https://api.teamop.fr', S2.B), o); };
      const f = new Function('fetch', 'PUSH_API', 'enteteEquipe', 'syncTeam', 'db', 'PLANS', 'todayISO', 'fmtShort', 'esc', 'localStorage',
        'logEvent', 'save', 'renderNav', 'suiteRefresh', 'openModal', 'toast', '$', 'current', 'views',
        fR + '\n' + fA + '\nreturn promoAppliquer;')(
        fetchVrai, S2.B, async h => Object.assign({}, h, { 'X-Teamop-Kh': sha(cle) }), () => t, db, PLANS,
        () => AUJ, d => String(d).split('-').reverse().join('/'), s => String(s).replace(/[&<>"]/g, c => '&#' + c.charCodeAt(0) + ';'),
        { removeItem() {} }, (a, b) => tr.logs.push(a), () => { tr.save++; }, () => {}, () => {}, h => tr.modals.push(h), m => tr.toasts.push(m),
        () => null, 'parametres', {});
      return { f, tr, db };
    }
    /* (i) contre le VRAI serveur : un code servi, période passée — sur les DEUX pages. */
    const dbG = { users: [{}, {}], forfait: 'gratuit', forfaitEssai: null };
    const G = page('ent-gs-1', K.gs, dbG);
    await G.f(CODE);
    const vu = PAGE_NEUVE ? (G.tr.modals[0] || '') : (G.tr.toasts[0] || '');
    v('⛔⛔ code servi (vrai serveur) : le refus S\u2019AFFICHE, et ce n\u2019est pas « 🎉 »', [!!vu, /Code accepté/.test(G.tr.modals.join(''))], [true, false]);
    vrai('   … il dit « déjà utilisé » et la date de fin', /déjà utilisé|déjà été utilisé/.test(vu) && /01\/04\/2026/.test(vu));
    v('⛔ … et RIEN n\u2019est écrit dans la base', [dbG.forfait, dbG.forfaitEssai, G.tr.save, G.tr.logs], ['gratuit', null, 0, []]);
    if (PAGE_NEUVE) {
      vrai('   (page neuve) une vraie fenêtre, qui propose l\u2019abonnement', /Code déjà utilisé/.test(vu) && /Prendre l.abonnement/.test(vu));
      /* (ii) contre le serveur d'AVANT : « ok » sur une période passée. */
      const dbV = { users: [{}], forfait: 'gratuit', forfaitEssai: null };
      const V = page('ent-gs-1', K.gs, dbV, async () => ({ ok: true, status: 200, json: async () => ({ ok: true, formule: 'premium', mois: 3, finLe: PASSE, dejaUtilise: true }) }));
      await V.f(CODE);
      v('⛔⛔ serveur d\u2019AVANT (« ok » sur une période passée) : refusé ICI quand même', [/Code déjà utilisé/.test(V.tr.modals[0] || ''), dbV.forfait, dbV.forfaitEssai, V.tr.save], [true, 'gratuit', null, 0]);
      /* (iii) le même code, déjà terminé dans cette base : on ne demande même pas au serveur. */
      const dbL = { users: [{}], forfait: 'gratuit', forfaitEssai: { code: CODE, formule: 'premium', debut: '2026-01-01', finLe: PASSE, mois: 3, termine: true } };
      const L = page('ent-gs-1', K.gs, dbL);
      await L.f(CODE);
      v('le même code déjà terminé dans cette base : refusé sans appel au serveur', [L.tr.fetch, /Code déjà utilisé/.test(L.tr.modals[0] || ''), L.tr.save], [0, true, 0]);
      /* (iv) contre le VRAI serveur : retapé pendant la période. */
      const r0 = await S2.appel('POST', '/api/promo/valider', { code: CODE, teamId: 'ent-bs-1' }, kh(K.bs));
      v('   (la boulangerie active son code)', r0.code, 200);
      const dbB = { users: [{}], forfait: 'premium', forfaitEssai: { code: CODE, formule: 'premium', debut: '2026-09-01', finLe: dans(3), mois: 3, rappels: { j7: true } } };
      const Bq = page('ent-bs-1', K.bs, dbB);
      await Bq.f(CODE);
      v('retapé pendant la période : « Code déjà actif », rien d\u2019écrit, le début d\u2019origine gardé', [/Code déjà actif/.test(Bq.tr.modals[0] || ''), Bq.tr.save, dbB.forfaitEssai.debut, dbB.forfaitEssai.rappels.j7], [true, 0, '2026-09-01', true]);
      const dbB2 = { users: [{}], forfait: 'gratuit', forfaitEssai: null };   // un autre appareil, qui ne le savait pas
      const Bn = page('ent-bs-1', K.bs, dbB2);
      await Bn.f(CODE);
      v('   … sur un appareil qui ne le savait pas : la période s\u2019inscrit, SANS journal « activé »', [dbB2.forfait, (dbB2.forfaitEssai || {}).finLe, (dbB2.forfaitEssai || {}).debut, Bn.tr.save, Bn.tr.logs], ['premium', dans(3), AUJ, 1, []]);
    }
    /* (v) le témoin, sur les deux pages : un code neuf s'active comme avant. */
    const dbN = { users: [{}], forfait: 'gratuit', forfaitEssai: null };
    const N = page('ent-gs-1', K.gs, dbN);
    await N.f(AUTRE);
    v('le témoin : un code NEUF → « 🎉 Code accepté ! », la formule, le journal', [/Code accepté/.test(N.tr.modals[0] || ''), dbN.forfait, (dbN.forfaitEssai || {}).finLe, N.tr.logs], [true, 'pro', dans(1), ['Code promo activé']]);
    arreterTout();
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exitCode = ko ? 1 : 0;
})().catch(e => { console.log('  ✗ le banc a jeté : ' + (e && e.stack || e)); ko++; console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exitCode = 1; })
  .finally(() => arreterTout());
/* Un banc qui se fige se fait couper, puis désactiver : il s'arrête de lui-même, et le DIT. */
setTimeout(() => { console.log('  ✗ le banc a dépassé 150 s — arrêté'); arreterTout(); process.exit(1); }, 150000).unref();

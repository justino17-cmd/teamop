/* ⛔ CE QUE CE FICHIER GARDE — il n'y a plus qu'UNE adresse et des IDENTIFIANTS. Ni lien qui transporte la clé, ni
   code d'accès.

   Justin, 12 septembre 2026, après avoir vu la Tour lui afficher un lien qui ne correspondait pas à ELAN : « on va
   supprimer ces liens-là et garder que le lien qui se donne aux équipes ». Puis le 28 septembre 2026 : « je veux plus
   de code, que des liens pour les connexions » — le code d'accès à dix caractères (« Première connexion de
   l'entreprise ? ») est retiré à son tour.

   ── POURQUOI C'EST PLUS QU'UN RANGEMENT ───────────────────────────────────────────────────
   Le lien portait `k` dans son URL — LA CLÉ QUI DÉCHIFFRE TOUTES LES DONNÉES DE L'ENTREPRISE — et il était fabriqué de
   travers depuis un autre appareil (elan-d4v8, elan-tzl2, elan-gq3k). Le code, lui, se perdait, se retapait de
   travers, se redemandait — et depuis que chaque espace naît avec son compte de départ, il n'ouvrait plus rien que
   l'identifiant n'ouvre déjà.

   ── ⚠️ CE QUE CE FICHIER DOIT PROUVER AVANT TOUT ──────────────────────────────────────────
   Retirer une porte n'est juste que si l'autre s'ouvre. Un test qui vérifierait seulement que le code a disparu
   passerait au vert le jour où PLUS AUCUNE entreprise ne peut entrer. La partie serveur joue donc le chemin qui
   reste, sur le VRAI serveur : un espace inscrit reçoit son compte de départ tout seul (le semis), et l'adresse +
   l'identifiant + le mot de passe l'ouvrent — pendant que le code, même un vrai code d'avant, n'ouvre plus rien.

   ── CE QUI NE DOIT PAS DISPARAÎTRE POUR AUTANT ────────────────────────────────────────────
   Les liens DÉJÀ ENVOYÉS sont entre les mains de gens qui travaillent. `/api/espaces/lien` et le traitement de
   `#entreprise=` dans app.html restent : on cesse d'en fabriquer, on ne casse pas ceux qui circulent. */

const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const TOUR = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');
const SRV = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
const APP = fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8');
const CNX = fs.readFileSync(path.join(RACINE, 'connexion.html'), 'utf8');
/* Les commentaires retirés (ceux qui COMMENCENT une ligne) : un motif vise du code, jamais la phrase qui l'explique. */
const sansCom = (x) => x.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const TOURc = sansCom(TOUR), SRVc = sansCom(SRV), CNXc = sansCom(CNX);

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };

console.log('Une adresse, des identifiants — plus de lien qui transporte la clé, plus de code');

/* ══ 1) LA TOUR N'AFFICHE PLUS AUCUN LIEN DE PREMIÈRE CONNEXION ═══════════════════════════ */
{
  /* ⛔ ON COMPTE LES ZONES, ON NE LES NOMME PLUS. La première version de ce contrôle cherchait
     « e.lien » — et elle est passée au vert alors que DEUX panneaux affichaient encore un lien :
     « Identifiants changés » et « Renommé », qui le tiraient de `r.d.lien`, un autre nom. Je ne
     les avais pas vus, et le test ne les voyait pas non plus. Une garde qui énumère ce qu'elle
     connaît ne protège que de ce qu'on avait déjà en tête.
     La forme « id="…-lien" » est celle de TOUTES les zones copiables de la Tour : en compter
     zéro attrape aussi le panneau que personne n'a encore écrit. */
  v('⛔ AUCUNE zone de la Tour n’affiche un lien', (TOUR.match(/id="[a-z-]*lien"/g) || []).length, 0);
  v('…et plus personne ne lit e.lien', /e\.lien/.test(TOUR), false);
  v('…ni r.d.lien', /r\.d\.lien/.test(TOUR), false);
  /* Contre-épreuve : les zones d'ADRESSE, elles, doivent rester — sinon on aurait « réussi »
     en vidant les panneaux. */
  v('…mais les zones d’adresse sont bien là', (TOUR.match(/id="[a-z-]*adr"/g) || []).length >= 3, true);
  v('⛔ plus aucun message type ne dit « clique ce lien »', /clique ce lien|en cliquant ton lien/.test(TOUR), false);
  /* L'adresse, elle, est partout : c'est elle qu'on donne aux équipes. */
  v('l’adresse reste sur la fiche entreprise', /id="lg-adr"/.test(TOUR), true);
  v('…et sur le panneau « formule acceptée »', /id="acc-adr"/.test(TOUR), true);
  v('⛔ et plus aucun panneau ne parle de « la toute première connexion » par un code',
    /pour la TOUTE PREMIÈRE connexion|Première connexion de l/.test(TOURc), false);
}

/* ══ 2) PLUS AUCUN CODE D'ACCÈS NULLE PART — Tour, page de connexion, serveur ═══════════════
   On compte des FORMES DE CODE (identifiants, routes, repères), jamais la phrase qui raconte leur retrait. */
{
  v('⛔ la Tour n’a plus de zone de code d’accès', /id="lg-acces/.test(TOUR), false);
  v('⛔ …ni de repère « __CODE__ » dans un message', /'__CODE__'|\\n\\n     __CODE__/.test(TOURc), false);
  v('⛔ …ni de fonction qui va le chercher ou le renouvelle', /function tourAccesCharger\(|function tourAccesNeuf\(|\/api\/monitor\/espaces\/acces/.test(TOURc), false);
  v('le message type se pose tout de suite, complet', /LG_MSG_MODELE=txt; LG_MAIL=email; LG_ZONE='lg-msg';\s*\n\s*lgMessagePoser\(\);/.test(TOUR), true);
  v('…dans les DEUX panneaux (fiche entreprise, demande acceptée)', (TOURc.match(/LG_ZONE='(lg-msg|acc-msg)';\s*\n\s*lgMessagePoser\(\);/g) || []).length, 2);
  v('⛔ la zone du message est choisie, pas écrite en dur', /getElementById\(LG_ZONE\|\|'lg-msg'\)/.test(TOUR), true);
  v('⛔ plus de copie automatique à l’affichage', /try\{ navigator\.clipboard\.writeText\(txt\); \}catch\(e2\)\{\}/.test(TOUR), false);
  v('…mais le bouton « Copier » marche toujours', /function tourCopie\(/.test(TOUR), true);
  v('⛔ la page de connexion n’a plus de champ de code', /id="cx-code"|id="bloc-code"|cxCodeAfficher/.test(CNX), false);
  v('⛔ …ni d’appel à la route du code', /\/api\/espaces\/ouvrir/.test(CNXc), false);
  v('…mais elle entre toujours par identifiant', /\/api\/espaces\/connexion/.test(CNXc), true);
  v('⛔ le serveur ne fabrique plus de code (plus de fabrique, plus d’appel)', /accesCodeDe|function accesNeuf|ACCES_ALPHABET/.test(SRVc), false);
  v('⛔ …et ses deux routes répondent 410, en le disant',
    /app\.post\('\/api\/espaces\/ouvrir', \(req, res\) => res\.status\(410\)\.json\(\{ error: PLUS_DE_CODE, motif: 'sans_code' \}\)\);/.test(SRV)
    && /app\.post\('\/api\/monitor\/espaces\/acces', monPatronStrict, \(req, res\) =>\s*\n\s*res\.status\(410\)/.test(SRV), true);
}

/* ══ 3) LE COURRIEL DU LIEN : l'adresse et les identifiants, sans code ═══════════════════════ */
{
  const i0 = SRVc.indexOf("app.post('/api/monitor/espaces/mail-acces'");
  const mail = i0 >= 0 ? SRVc.slice(i0, SRVc.indexOf('\n});', i0)) : '';
  v('le bloc du courriel est retrouvé', mail.length > 2000, true);
  v('⛔ le courriel d’accueil n’envoie plus de lien', /lienEspaceCode/.test(mail), false);
  /* « mail-acces » est le NOM de la route, au début de la tranche : on le retire avant de chercher. */
  v('⛔ …ni de code d’accès', /(?<!mail-)acces\b|code d\\'acc/i.test(mail), false);
  v('il envoie l’adresse', /const adresse = 'teamop\.fr\/e\/' \+ \(e\.slug \|\| slug\);/.test(mail), true);
  v('⛔ le mot de passe ne part que s’il correspond à l’empreinte enregistrée',
    /const m = \(mh && mdpDonne && mdpEmpreinte\(mdpDonne\) === mh\) \? mdpDonne : '';/.test(mail), true);
  v('⛔ un espace sans aucun compte : refus (409 « sans_compte »), jamais une porte fermée par courriel', /motif: 'sans_compte'/.test(mail), true);
  v('son bouton mène à l’adresse', /boutonUrl: 'https:\/\/' \+ adresse/.test(mail), true);

  const rel = SRV.slice(SRV.indexOf("app.post('/api/espaces/relance'"), SRV.indexOf("app.post('/api/espaces/relance'") + 4000);
  /* ⛔ Celle-ci est PUBLIQUE : n'importe qui tapant le nom d'une entreprise sur teamop.fr la
     déclenchait, et elle renvoyait la clé de déchiffrement par courriel. Elle renvoie
     désormais l'adresse, qui n'est pas un secret. */
  v('⛔ le secours « lien perdu » ne renvoie plus la clé', /lienEspaceCode/.test(rel), false);
  v('il renvoie l’adresse', /const adresse = 'teamop\.fr\/e\/'/.test(rel), true);
  v('…et aucun code dans un courriel déclenché par un inconnu', /acces/.test(rel), false);
}

/* ══ 4) LES DEUX CHEMINS DU SITE ═════════════════════════════════════════════════════════════
   · /api/compte/identifiants part vers CHAQUE employé qu'un administrateur crée : l'adresse suffit ;
   · une demande d'accès du site ne crée plus rien (Justin, 28 septembre 2026) : pas d'espace, pas de code — le
     patron la traite dans sa Tour (`test-813` le joue sur le vrai serveur). */
{
  const ident = SRV.slice(SRV.indexOf("app.post('/api/compte/identifiants'"), SRV.indexOf("app.post('/api/compte/identifiants'") + 4200);
  v('⛔ le courriel à un nouvel employé n’envoie plus de lien', /lienEspaceCode/.test(ident), false);
  v('il envoie l’adresse de l’entreprise', /const adrEsp = \(esp && esp\.slug\) \? \('https:\/\/teamop\.fr\/e\/' \+ esp\.slug\) : '';/.test(ident), true);
  v('…et il ne renvoie plus le lien fourni par l’application', /lienApp \|\| 'https:\/\/teamop\.fr\/connexion\.html'/.test(ident), false);
  const j0 = SRVc.indexOf("const nv = demandes.slice(avant);"), j1 = SRVc.indexOf("res.json({ ok: true });", j0);
  const dem = (j0 >= 0 && j1 > j0) ? SRVc.slice(j0, j1) : '';
  v('le bloc des nouvelles demandes est retrouvé, et entier', dem.length > 2000 && /mailerEnvoi\(/.test(dem), true);
  v('⛔ une demande ne crée AUCUN espace', /espaceAutoPour|espacesReg\[|espacesEcrire\(/.test(dem), false);
  v('⛔ …n’active aucun code promo, ne marque rien « traité », ne touche pas la fiche du portail',
    /promoUsages|savePromoUsages|demandesTraitees|fbMajFicheClient/.test(dem), false);
  v('⛔ …et n’envoie ni adresse d’espace ni code', /teamop\.fr\/e\/|code d\\'acc/.test(dem), false);
  v('le patron reçoit la demande À TRAITER, le client l’accusé', /À TRAITER/.test(dem) && /Votre demande est bien reçue/.test(dem), true);
}

/* ══ 5) CE QUI DOIT SURVIVRE — les liens DÉJÀ entre les mains des gens ════════════════════ */
{
  v('app.html comprend toujours #entreprise=', /entreprise=\(\[A-Za-z0-9\+\/=_-\]\{8,\}\)/.test(APP), true);
  v('la vérification d’un lien reçu existe toujours', /async function lienEspaceConnu\(o\)/.test(APP), true);
  v('la route qui la sert existe toujours', /app\.post\('\/api\/espaces\/lien'/.test(SRV), true);
  v('…et la fabrique de lien reste, pour elle', /function lienEspaceCode\(e\)/.test(SRV), true);
}

/* ══ 6) LE VRAI SERVEUR — l'entreprise entre-t-elle SANS code ? ══════════════════════════ */
const banc = path.join(require('os').tmpdir(), 'teamop-test-669-' + process.pid);
let enfant = null;
const stop = () => { try { if (enfant && enfant.pid) process.kill(enfant.pid); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };

(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) {
    console.log('  … partie serveur SAUTÉE : server/node_modules absent (cd server && npm i)');
    console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
  }
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '');
  const sha = p => crypto.createHash('sha256').update(String(p)).digest('hex');
  const MDP = 'banc-669';
  const ACCES_ANCIEN = 'ABCDEFGH23';   // un VRAI code d'avant, resté dans acces.json

  fs.mkdirSync(path.join(banc, 'data'), { recursive: true });
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({
    vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, adminPassHash: sha(MDP) }));
  fs.writeFileSync(path.join(banc, 'data', 'espaces.json'), JSON.stringify({
    'elan': { slug: 'elan', nom: 'ELAN', email: 'e@exemple.fr', t: 'elan-34oc',
              code: b64({ t: 'elan-34oc', k: 'CLE-PROPRE-ELAN', n: 'ELAN', a: 'florent', m: 'Florent-Banc-669' }), ts: 1 } }));
  fs.writeFileSync(path.join(banc, 'data', 'acces.json'), JSON.stringify({ 'elan-34oc': { code: ACCES_ANCIEN, ts: 1, par: 'banc', vu: 0 } }));

  const PORT = 8700 + (process.pid % 90);
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], {
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: path.join(banc, 'data'), PORT: String(PORT),
      TEAMOP_RATTRAPAGE_MS: '150' }),
    stdio: 'ignore' });
  const B = 'http://127.0.0.1:' + PORT;
  for (let i = 0; i < 60; i++) { try { await fetch(B + '/health'); break; } catch (e) { await new Promise(r => setTimeout(r, 100)); } }
  const P = async (c, body, tok) => {
    const r = await fetch(B + c, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}), body: JSON.stringify(body) });
    let j = null; try { j = await r.json(); } catch (e) {}
    return { statut: r.status, j: j || {} };
  };

  try {
    let r = await P('/api/monitor/login', { nom: 'Patron', pass: MDP });
    const TOK = r.j.token || '';
    v('la Tour ouvre une session de patron', !!TOK, true);

    /* ⛔ LE CŒUR DE CE FICHIER. Sans code, c'est CE chemin qui ouvre l'espace : l'adresse, l'identifiant de départ,
       le mot de passe provisoire — le compte ayant été semé par le serveur (rattrapage au démarrage, ici en 150 ms). */
    let ouvert = null;
    for (let i = 0; i < 40 && !(ouvert && ouvert.statut === 200); i++) {
      ouvert = await P('/api/espaces/connexion', { nom: 'elan', login: 'florent', h: sha('Florent-Banc-669') });
      if (ouvert.statut !== 200) await new Promise(res => setTimeout(res, 100));
    }
    v('⛔ L’ENTREPRISE ENTRE SANS CODE : adresse + identifiant + mot de passe', ouvert && ouvert.statut, 200);
    let o = {}; try { o = JSON.parse(Buffer.from(String((ouvert && ouvert.j.code) || ''), 'base64').toString('utf8')); } catch (e) {}
    v('…elle ouvre le BON espace', o.t, 'elan-34oc');
    v('…avec la clé qui déchiffre les données', !!o.k, true);
    v('⛔ …et sans le mot de passe provisoire en clair', !!o.m, false);
    r = await P('/api/espaces/connexion', { nom: 'elan', login: 'florent', h: sha('pas-le-bon') });
    v('⛔ un mauvais mot de passe n’ouvre rien', r.statut === 200, false);

    /* Et le code : plus aucun, même un vrai code d'avant — refusé en le DISANT (410), pas « code incorrect ». */
    r = await P('/api/espaces/ouvrir', { nom: 'elan', acces: ACCES_ANCIEN });
    v('⛔ un VRAI code d’avant n’ouvre plus rien (410)', [r.statut, r.j.motif, !!r.j.code], [410, 'sans_code', false]);
    v('…et la réponse dit quoi faire à la place', /identifiant et son mot de passe/.test(String(r.j.error || '')), true);
    r = await P('/api/espaces/ouvrir', { nom: 'elan', acces: 'MAUVAISCODE' });
    v('…un mauvais code non plus, même réponse', r.statut, 410);
    r = await P('/api/monitor/espaces/acces', { slug: 'elan' }, TOK);
    v('⛔ la Tour ne peut plus fabriquer de code (410)', [r.statut, !!r.j.acces], [410, false]);
    r = await P('/api/monitor/espaces/acces', { slug: 'elan', regenerer: true }, TOK);
    v('…ni en renouveler un', [r.statut, !!r.j.acces], [410, false]);
    r = await P('/api/monitor/espaces/acces', { slug: 'elan' });
    v('…et la route reste gardée : sans session du patron, refusée', [401, 403].includes(r.statut), true);
    const reg = JSON.parse(fs.readFileSync(path.join(banc, 'data', 'acces.json'), 'utf8'));
    v('⛔ le registre des codes n’a pas reçu une seule entrée de plus', Object.keys(reg), ['elan-34oc']);
  } catch (e) {
    ko++; console.log('  ✗ banc serveur : ' + e.message);
  }
  stop();
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
})();

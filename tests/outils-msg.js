/* ══ OUTILS COMMUNS DES BANCS D'OP MESSAGES (tests/test-900 à 929) ══════════════════════════
 *
 * Ce fichier n'est PAS une suite (il ne s'appelle pas `test-*.js` : le compteur ne le lance pas).
 * Il porte ce que les bancs du service partagent :
 *   · `lancerService` — lance le VRAI `server-msg/index.js` dans un processus isolé : sa
 *     configuration, ses données, sa clé (credential), un port libre. ⚠️ Jamais `msg*.teamop.fr` :
 *     tout se passe sur 127.0.0.1.
 *   · `fauxOpGestion` — un OP GESTION de poche pour la porte bêta : il note chaque appel reçu
 *     (corps, `X-Forwarded-For`) pour que les bancs vérifient ce que le service lui a VRAIMENT dit.
 *   · `client` — un « bocal à cookies » : le cookie de session va et vient comme dans un navigateur,
 *     avec l'`Origin` et l'en-tête maison que la page pose.
 *   · `flux` — un lecteur SSE minimal (et un `EventSource` compatible pour `public/api.js`) qui
 *     garde les événements reçus et sait attendre UN événement précis — AU GESTE, jamais au
 *     chronomètre : un banc qui parie sur une durée tombe sur une CI chargée.
 *   · `Sortie` — recueille ce que le service écrit, pour chercher des canaris dedans.
 */
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net'), http = require('http'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVICE = path.join(RACINE, 'server-msg');
/* Le `fetch` NATIF, capturé à l'import : un banc qui exécute `api.js` redéfinit `globalThis.fetch` pour la page — nos propres appels ne doivent pas passer par elle. */
const FETCH = globalThis.fetch;

const dort = (ms) => new Promise(r => setTimeout(r, ms));

function portLibre() {
  return new Promise((res, rej) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
    s.on('error', rej);
  });
}

/* Attend qu'une condition devienne vraie : on SONDE la condition (rapidement), on ne dort pas un
   temps arbitraire. Le délai n'est qu'un plafond qui dit « ça n'est jamais arrivé ». */
async function attendre(cond, plafondMs = 8000, pasMs = 15) {
  const debut = Date.now();
  for (;;) {
    const v = await cond();
    if (v) return v;
    if (Date.now() - debut > plafondMs) return null;
    await dort(pasMs);
  }
}

/* ⛔ L'HORLOGE D'UN SERVICE SE REMPLACE D'UN SEUL GESTE — JAMAIS « TRONQUER PUIS ÉCRIRE » (17 novembre 2026).
   `fs.writeFileSync` ouvre le fichier en le VIDANT, puis écrit : entre les deux, le service qui demande l'heure (il relit ce fichier
   à chaque `Date.now()`, et ses minuteries n'attendent pas le banc) le lisait vide et retombait sur l'heure RÉELLE — des semaines
   après l'horloge du banc (vingt-huit jours le 16 novembre). Son balayeur d'appels finissait alors l'appel en cours (« perdu ») ou la sonnerie (« manquée ») : test-981
   tombait deux fois sur 180 passages à douze de front, et il est mort en CI le 5 et le 16 novembre (« undefined.lie », 39 ✓). On écrit donc À CÔTÉ, puis on
   RENOMME : un renommage remplace le fichier d'un coup, un lecteur voit l'ancien contenu ou le nouveau, jamais un fichier vide.
   Le greffon (`lib-horloge-msg.js`) garde l'autre moitié : un contenu qui n'est pas un entier ne remet plus l'horloge à l'heure réelle.
   `tests/test-947.js` tient les deux — et une cinquantaine de bancs avancent une horloge par ici. */
function ecrireDecalage(fichier, decalage) {
  const texte = texteDecalage(decalage);
  const neuf = fichier + '.neuf';
  fs.writeFileSync(neuf, texte);
  fs.renameSync(neuf, fichier);
}
/* ⛔ CE QU'ON ÉCRIT EST UN ENTIER, OU L'AVANCE LÈVE. Le greffon ne suit qu'un entier (le reste garde le dernier décalage lu) : une avance sans durée (`svc.avancer(undefined)` → « NaN ») ou
   d'une durée qui n'en est pas une serait donc IGNORÉE par le service, elle et toutes les suivantes, pendant que le banc croirait son horloge avancée — et le banc tomberait plus loin, sur un
   contrôle d'échéance, sans nommer la cause (relecture du 17 novembre 2026). Un nombre à virgule est arrondi à la milliseconde ; ce qui n'est pas un nombre fini se dit ICI, dans le banc. */
function texteDecalage(decalage) {
  if (typeof decalage !== 'number' || !Number.isFinite(decalage)) throw new Error('horloge du banc : le décalage n\'est pas un nombre (' + String(decalage) + ') — une avance sans durée ? Le service garderait l\'ancienne heure sans rien dire.');
  return String(Math.round(decalage));
}

/* ── Le service ────────────────────────────────────────────────────────────────────────── */
/* ⛔ LE SERVICE QUI RÉPOND SUR LE PORT EST-IL CELUI QU'ON VIENT DE LANCER ? (17 novembre 2026). `portLibre()` rend un port libre À L'INSTANT où on le demande ; le service ne
   l'écoute qu'un dixième de seconde plus tard. Deux bancs lancés en même temps sur une machine peuvent donc recevoir le MÊME port : le second service meurt (`EADDRINUSE`), mais
   `/health` répond quand même — c'est le service de l'AUTRE banc. L'outil rendait alors un service « vivant » qui était celui d'un autre : des 401 `session_requise` partout, sur
   une base qui n'est pas celle du banc (vu une fois sur 120 passages de test-981 à douze de front ; rejoué en imposant le port : `scratchpad/sonde-opmessages-collision-port.js`). La CI n'y
   est pas exposée (une suite à la fois par machine), mais les lots de mutations jouent deux copies de front, et on charge une machine en lançant plusieurs passages.
   Chaque lancement porte donc une IDENTITÉ (`OPMSG_SHA`, que `/health` redit dans `sha` — `svc.sha`) : tant que `/health` ne la rend pas, ce n'est pas notre service. Port pris
   (le nôtre est mort sur `EADDRINUSE`) : on recommence sur un port neuf et des données neuves, cinq fois au plus — sauf si le banc a IMPOSÉ le port ou le dossier (un redémarrage) :
   là, on le DIT au lieu de deviner. `tests/test-947.js` joue les deux. */
const ESSAIS_PORT = 5;
/* ⛔ AUCUN SERVICE NE SURVIT AU BANC QUI L'A LANCÉ (17 novembre 2026). Un banc qui sort sans arrêter ses services — son délai global, une exception hors de son `try`, un `process.exit` —
   les laissait tourner : `process.exit` ne tue pas les processus enfants. Ce sont des processus fantômes, qui chargent la machine et font tomber les bancs de temps qui suivent (CLAUDE.md) ;
   pris sur le fait ici même : un passage de test-947 arrêté par son délai global avait laissé son service vivant 158 s plus tard. À la sortie du processus du banc, ceux qui vivent encore
   sont tués, sans attendre (on sort). */
const ENFANTS = new Set();
process.on('exit', () => { for (const e of ENFANTS) { try { e.kill('SIGKILL'); } catch (x) { /* déjà mort */ } } });
async function lancerService(opts = {}) {
  const o = Object.assign({ instance: 'beta', config: {}, env: {}, cle: crypto.randomBytes(32).toString('hex'), dossier: null, attendreSante: true }, opts);
  const racine = o.dossier || fs.mkdtempSync(path.join(os.tmpdir(), 'banc-msg-'));
  const data = path.join(racine, 'data'), cred = path.join(racine, 'cred'), cfgPath = path.join(racine, 'config.json');
  fs.mkdirSync(cred, { recursive: true });
  if (o.cle) fs.writeFileSync(path.join(cred, 'kek'), o.cle, { mode: 0o600 });
  /* Une horloge décalable (voir `lib-horloge-msg.js`) : le banc avance les DATES du processus. */
  let decalage = o.decalageInitial || 0; const fichierDecalage = path.join(racine, 'decalage-horloge');   // `decalageInitial` : un REDÉMARRAGE reprend l'horloge là où le processus d'avant l'avait laissée — et un service peut NAÎTRE à l'heure du banc
  const dabord = Array.isArray(o.portsDabord) ? o.portsDabord.slice() : [];   // des ports à essayer AVANT d'en tirer un libre : pour le banc de l'outil seulement (il y met un port déjà pris)
  for (let essai = 1; ; essai++) {
    const port = o.port || dabord.shift() || await portLibre();
    const base = 'http://127.0.0.1:' + port;
    const defauts = {
      origines: [base], cookie: { nom: 'opm', secure: false },
      /* Les bancs relâchent les plafonds de CONFORT pour jouer beaucoup de gestes ; les bancs
         d'anti-abus (test-908) les remettent à leur valeur de production. */
      quotas: { ip: { max: 100000, fenetreMs: 60000 }, ecriture: { max: 100000, fenetreMs: 60000 }, beta_ip: { max: 100000, fenetreMs: 900000 }, beta_login: { max: 100000, fenetreMs: 900000 }, lien_ip: { max: 100000, fenetreMs: 60000 }, msg: { max: 100000, fenetreMs: 60000 }, groupe: { max: 100000, fenetreMs: 3600000 }, lien: { max: 100000, fenetreMs: 3600000 }, moi_maj: { max: 100000, fenetreMs: 3600000 } },
      beta: { urlGestion: o.urlGestion || 'http://127.0.0.1:1', relectureMs: 3600000, timeoutMs: 2000 },
      pulsationMs: 20000, presenceGraceMs: 400, balayageMs: 3600000, disqueMinMo: 0,
      /* ⛔ le trajet calcule chez l'IGN (13 octobre 2026) : un banc ne sort JAMAIS sur Internet — en bêta, la porte de test vise un port local fermé (le calcul se dit indisponible) et un
         banc du trajet y pose son faux IGN (`env: { OPMSG_TEST_TRAJET }`) ; en production, la porte est refusée : le trajet y est FERMÉ, sauf banc qui le règle lui-même */
      ...(o.instance === 'prod' ? { trajet: false } : {}),
    };
    /* Fusion à UN niveau : quotas, beta et cookie se complètent, ils ne se remplacent pas. */
    const cfg = Object.assign({}, defauts, o.config);
    for (const k of ['quotas', 'beta', 'cookie']) if (o.config && o.config[k] && typeof o.config[k] === 'object') cfg[k] = Object.assign({}, defauts[k], o.config[k]);
    if (o.quotasProd) cfg.quotas = {};   // les plafonds de PRODUCTION, tels que le service les porte
    fs.writeFileSync(cfgPath, JSON.stringify(cfg));
    const env = Object.assign({}, process.env, {
      OPMSG_CONFIG: cfgPath, OPMSG_DATA: data, OPMSG_INSTANCE: o.instance, PORT: String(port),
      CREDENTIALS_DIRECTORY: cred, OPMSG_SHA: 'banc' + crypto.randomBytes(4).toString('hex'),   // l'identité de CE lancement (un banc peut poser la sienne : `env`)
    }, o.instance === 'beta' ? { OPMSG_TEST_TRAJET: '127.0.0.1:10' } : {}, o.env);
    const sha = String(env.OPMSG_SHA || '').replace(/[^0-9a-zA-Z._-]/g, '').slice(0, 64) || 'inconnu';   // ce que le service en redira (`config.js` l'assainit ainsi)
    if (o.horloge) {
      fs.writeFileSync(fichierDecalage, texteDecalage(decalage));   // avant le lancement : personne ne le lit encore (ensuite : `ecrireDecalage`)
      env.OPMSG_HORLOGE_DECALAGE = fichierDecalage;
      env.NODE_OPTIONS = ((env.NODE_OPTIONS || '') + ' --require=' + path.join(__dirname, 'lib-horloge-msg.js')).trim();
    }
    const sortie = new Sortie();
    const enfant = spawn(process.execPath, [path.join(SERVICE, 'index.js')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    enfant.stdout.on('data', d => sortie.ajouter(d)); enfant.stderr.on('data', d => sortie.ajouter(d));
    let sorti = null; enfant.on('exit', (code) => { sorti = code; ENFANTS.delete(enfant); });
    ENFANTS.add(enfant);
    let clos = false; enfant.on('close', () => { clos = true; });   // ses tubes de sortie sont vidés : ce qu'il a écrit avant de mourir est ENTIER (à « exit », la dernière ligne peut manquer)
    const svc = {
      base, port, racine, data, cred, cfgPath, cle: o.cle, config: cfg, sortie, enfant, sha,
      fichierHorloge: o.horloge ? fichierDecalage : null,   // le fichier que le service relit à chaque `Date.now()` (pour le banc de l'outil lui-même, `test-947`)
      sorti: () => sorti,
      avancer(ms) { const suivant = decalage + ms; ecrireDecalage(fichierDecalage, suivant); decalage = suivant; },   // dans cet ordre : une avance refusée (pas un nombre) laisse l'horloge où elle était
      async arreter(nettoyer = true) {
        /* ⛔ on attend SA FIN, même après l'avoir tué de force : un processus qui meurt encore écrit dans son dossier — qu'on efface juste après, ou qu'on rend au service suivant (un port pris) */
        try { if (sorti === null) { enfant.kill('SIGTERM'); await attendre(() => sorti !== null, 4000); if (sorti === null) { enfant.kill('SIGKILL'); await attendre(() => sorti !== null, 2000, 5); } } } catch (e) {}
        if (nettoyer && !o.dossier) { try { fs.rmSync(racine, { recursive: true, force: true }); } catch (e) {} }
      },
    };
    if (!o.attendreSante) return svc;
    /* « vivant » : NOTRE service répond (son identité). `/health` qui répond sous une AUTRE identité ne conclut rien tant que le nôtre vit : si le port est tenu par un autre, le nôtre MEURT
       (`EADDRINUSE`) — c'est sa mort qu'on attend, et sa dernière ligne qu'on lit, pas une durée. (Et si l'autre s'en va et que le nôtre prend le port, le sondage suivant le reconnaît.) */
    /* ⛔ UN SONDAGE NE RESTE JAMAIS PENDU : il est coupé à la MORT du service (un geste) et, à défaut, au plafond des dix secondes. Sans ça, un port tenu par un processus qui accepte la
       connexion sans jamais répondre retenait `fetch` pour toujours — le plafond n'est regardé qu'entre deux sondages, et la mort du service (`EADDRINUSE`) n'était jamais vue (relecture du
       17 novembre 2026 : toujours pendu après 40 s). */
    let autre = false;
    const plafond = Date.now() + 10000;
    const sonder = async () => {
      if (sorti !== null) return 'mort';
      const ctrl = new AbortController(), couper = () => ctrl.abort();
      const minuteur = setTimeout(couper, Math.max(200, plafond - Date.now()));
      enfant.once('exit', couper);
      try { const r = await FETCH(base + '/health', { signal: ctrl.signal }); if (!r.ok) return false; const j = await r.json().catch(() => null); if (j && j.sha === sha) return true; autre = true; return false; }
      catch (e) { return sorti !== null ? 'mort' : false; }
      finally { clearTimeout(minuteur); enfant.removeListener('exit', couper); }
    };
    const vivant = (await attendre(sonder, 10000, 50)) || (sorti !== null ? 'mort' : null);
    if (vivant === true) return svc;
    if (vivant === 'mort') await attendre(() => clos, 2000, 5);
    const s = sortie.texte(), pris = vivant === 'mort' && /EADDRINUSE/.test(s);
    if (pris && !o.port && !o.dossier && essai < ESSAIS_PORT) {
      await svc.arreter(false);
      try { fs.rmSync(data, { recursive: true, force: true }); } catch (e) { /* rien n'y était */ }   // ce que le service mort a pu y poser (sa base, un bail) ne doit pas attendre le suivant
      continue;
    }
    await svc.arreter();
    throw new Error('le service n\'a pas démarré : ' + (
      pris ? 'le port ' + port + ' est déjà pris' + (autre ? ' — un AUTRE service y répond (un banc lancé en même temps ?)' : '') + (!o.port && !o.dossier ? ' — ' + ESSAIS_PORT + ' ports essayés' : '')
        : vivant === 'mort' ? 'sorti avant /health'
          : autre ? '`/health` répond sur le port ' + port + ' sous une AUTRE identité que la sienne (`sha` attendu : ' + sha + ') alors que le service vit encore — `/health` ne rend-il plus `sha` ?'
            : 'délai') + '\n' + s.slice(0, 800));
  }
}

class Sortie {
  constructor() { this.t = ''; }
  ajouter(d) { this.t += d; if (this.t.length > 400000) this.t = this.t.slice(-400000); }
  texte() { return this.t; }
}

/* ── Un OP GESTION de poche : /api/beta/login et /api/beta/etat ───────────────────────────── */
async function fauxOpGestion(comptes) {
  const etat = { comptes: Object.assign({}, comptes), appels: [], mode: 'normal', delaiMs: 0, versionMin: 0, versionMode: 'normal', versionAppels: [] };
  const srv = http.createServer((req, res) => {
    /* `/api/version?app=messages&canal=…` — le minimum que la Tour pose pour une instance (`version-client.js`). À PART de `appels` : le service le relit
       en boucle, et les bancs de la porte comptent ce qu'il dit à OP GESTION. `versionMode` : 'ancien' (un OP GESTION d'avant, sans écho de canal),
       'autre' (l'écho d'un autre canal), 'panne', '500'. */
    if (req.method === 'GET' && /^\/api\/version(\?|$)/.test(req.url)) {
      const q = new URL(req.url, 'http://x').searchParams;
      etat.versionAppels.push({ app: q.get('app'), canal: q.get('canal') });
      const rv = (code, o) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
      if (etat.versionMode === 'panne') return req.socket.destroy();
      if (etat.versionMode === '500') return rv(500, { error: 'boom' });
      if (etat.versionMode === 'ancien') return rv(200, { ok: true, min: 760, enLigne: 'enLigne' });
      if (etat.versionMode === 'autre') return rv(200, { ok: true, min: etat.versionMin, canal: 'messages-' + (q.get('canal') === 'beta' ? 'prod' : 'beta') });
      return rv(200, { ok: true, min: etat.versionMin, enLigne: 'enLigne', canal: q.get('app') + '-' + q.get('canal') });
    }
    let b = ''; req.on('data', d => { b += d; });
    req.on('end', () => {
      let j = {}; try { j = JSON.parse(b || '{}'); } catch (e) {}
      etat.appels.push({ chemin: req.url, corps: j, xff: req.headers['x-forwarded-for'] || null, brut: b });
      const rep = (code, o) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
      const traiter = () => {
        if (etat.mode === 'panne') { req.socket.destroy(); return; }
        if (etat.mode === '500') return rep(500, { error: 'boom' });
        if (etat.mode === 'html') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end('<html>pas du json</html>'); }
        if (etat.mode === '404') return rep(404, { error: 'introuvable' });
        if (req.url === '/api/beta/login') {
          const c = etat.comptes[String(j.login || '').toLowerCase()];
          if (etat.mode === '429') return rep(429, { error: 'accès temporairement verrouillé (15 min) après plusieurs échecs' });
          if (!c || c.pass !== j.pass) return rep(403, { error: 'identifiant ou mot de passe incorrect' });
          if (!c.actif) return rep(403, { error: 'cet accès d\'essai a été coupé depuis la Tour de contrôle' });
          if (etat.mode === 'sans_id') return rep(200, { ok: true, login: String(j.login).toLowerCase(), nom: c.nom });   // un OP GESTION d'avant l'identifiant de compte
          if (etat.mode === 'sans_apps') return rep(200, { ok: true, login: String(j.login).toLowerCase(), nom: c.nom, id: c.id || ('b' + crypto.createHash('sha1').update(String(j.login).toLowerCase()).digest('hex').slice(0, 10)) });   // un OP GESTION d'avant `apps` : ignore `app`, dit « ok » à tout accès
          return rep(200, { ok: true, login: String(j.login).toLowerCase(), nom: c.nom, apps: ['messages'], id: c.id || ('b' + crypto.createHash('sha1').update(String(j.login).toLowerCase()).digest('hex').slice(0, 10)) });
        }
        /* Comme le vrai `/api/beta/etat` : un seul identifiant (`login`, ancien) OU une liste d'identifiants de compte (`ids`). */
        if (req.url === '/api/beta/etat') {
          if (etat.mode === 'etat_vide') return rep(200, { ouverts: {} });          // une réponse qui ne dit rien de personne
          if (etat.mode === 'etat_ancien') return rep(200, { ouvert: true });       // un OP GESTION d'avant la liste `ids`
          if (etat.mode === 'etat_sans_app') { const ouverts = {}; for (const id of (j.ids || [])) ouverts[id] = false; return rep(200, { ouverts }); }   // un OP GESTION d'avant `app` : répond sans écho
          if (Array.isArray(j.ids)) {
            const ouverts = {};
            for (const id of j.ids.slice(0, 100)) ouverts[id] = Object.entries(etat.comptes).some(([l, c]) => (c.id || ('b' + crypto.createHash('sha1').update(l).digest('hex').slice(0, 10))) === id && c.actif);
            return rep(200, { ouverts, app: j.app });
          }
          const c = etat.comptes[String(j.login || '').toLowerCase()]; return rep(200, { ouvert: !!(c && c.actif) });
        }
        rep(404, { error: 'introuvable' });
      };
      if (etat.delaiMs) setTimeout(traiter, etat.delaiMs); else traiter();
    });
  });
  const port = await portLibre();
  await new Promise(r => srv.listen(port, '127.0.0.1', r));
  etat.url = 'http://127.0.0.1:' + port;
  etat.fermer = () => new Promise(r => { try { srv.closeAllConnections(); } catch (e) {} srv.close(() => r()); });
  return etat;
}

/* ── Le client : un bocal à cookies, avec Origin et l'en-tête maison ──────────────────────── */
function client(base, opts = {}) {
  const o = Object.assign({ nomCookie: 'opm', origin: base, entete: true, xff: null }, opts);
  const jar = new Map();
  const cookieHeader = () => Array.from(jar.entries()).map(([k, v]) => k + '=' + v).join('; ');
  const lireSetCookie = (r) => {
    const l = typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : [];
    for (const c of l) {
      const [kv] = c.split(';'); const i = kv.indexOf('=');
      const k = kv.slice(0, i).trim(), v = kv.slice(i + 1).trim();
      if (/max-age=0/i.test(c) || v === '') jar.delete(k); else jar.set(k, v);
    }
  };
  async function appel(methode, chemin, corps, extra = {}) {
    const h = Object.assign({}, extra.entetes || {});
    if (corps !== undefined && methode !== 'GET') h['Content-Type'] = 'application/json';
    if (jar.size && !extra.sansCookie) h.Cookie = cookieHeader();
    if (methode !== 'GET' && !extra.sansOrigine && o.origin) h.Origin = extra.origin || o.origin;
    if (methode !== 'GET' && o.entete && !extra.sansEntete) h['X-OPM'] = '1';
    if (o.xff && !h['X-Forwarded-For']) h['X-Forwarded-For'] = o.xff;
    const r = await FETCH(base + chemin, { method: methode, headers: h, body: corps === undefined || methode === 'GET' ? undefined : (typeof corps === 'string' ? corps : JSON.stringify(corps)), redirect: 'manual' });
    lireSetCookie(r);
    let j = null, txt = '';
    try { txt = await r.text(); j = txt ? JSON.parse(txt) : null; } catch (e) { j = null; }
    return { code: r.status, j, txt, h: r.headers };
  }
  return {
    base, jar, appel,
    get: (c, e) => appel('GET', c, undefined, e),
    post: (c, b, e) => appel('POST', c, b === undefined ? {} : b, e),
    cookie: () => jar.get(o.nomCookie) || null,
    poserCookie: (v) => { if (v === null) jar.delete(o.nomCookie); else jar.set(o.nomCookie, v); },
    enteteCookie: cookieHeader, absorber: lireSetCookie,
  };
}

/* Un accès bêta ouvert via la porte → un client connecté. */
async function connecter(svc, og, login, pass, xff) {
  const c = client(svc.base, xff ? { xff } : {});
  const r = await c.post('/api/beta/entrer', { login, pass });
  if (r.code !== 200) throw new Error('connexion bêta refusée (' + r.code + ') pour un compte de banc');
  c.moi = r.j.moi;
  return c;
}

/* ── Le flux SSE : lecteur minimal, et un EventSource pour `public/api.js` ─────────────────── */
function analyserTrames(etat, morceau, surTrame) {
  etat.tampon += morceau;
  let i;
  while ((i = etat.tampon.search(/\r\n\r\n|\n\n|\r\r/)) >= 0) {
    const m = etat.tampon.slice(i).match(/^(\r\n\r\n|\n\n|\r\r)/);
    const brut = etat.tampon.slice(0, i); etat.tampon = etat.tampon.slice(i + m[0].length);
    let id = null, event = 'message', data = [], retry = null, comm = false;
    for (const l of brut.split(/\r\n|\n|\r/)) {
      if (l.startsWith(':')) { comm = true; continue; }
      const j = l.indexOf(':'); const k = j < 0 ? l : l.slice(0, j); let v = j < 0 ? '' : l.slice(j + 1); if (v.startsWith(' ')) v = v.slice(1);
      if (k === 'id') id = v; else if (k === 'event') event = v; else if (k === 'data') data.push(v); else if (k === 'retry') retry = parseInt(v, 10);
    }
    if (data.length || id !== null || event !== 'message') surTrame({ id, event, data: data.join('\n'), retry });
    else if (comm) surTrame({ commentaire: true });
  }
}

/* Ouvre `GET /api/flux` avec le cookie du client. Garde `evenements` (sans les commentaires). */
async function flux(c, opts = {}) {
  const ctrl = new AbortController();
  const h = { Accept: 'text/event-stream' };
  const ck = c.enteteCookie(); if (ck) h.Cookie = ck;
  if (opts.lastEventId !== undefined && opts.lastEventId !== null) h['Last-Event-ID'] = String(opts.lastEventId);
  const r = await FETCH(c.base + (opts.chemin || '/api/flux') + (opts.requete || ''), { headers: h, signal: ctrl.signal });   // `chemin` : le flux de l'invité sans compte (`/api/invite/flux`) a le sien
  const f = { statut: r.status, evenements: [], commentaires: 0, ferme: false, retourne: r, entetes: r.headers };
  if (r.status !== 200) { try { f.corps = await r.json(); } catch (e) {} return Object.assign(f, { fermer() {} }); }
  const etat = { tampon: '' };
  const lecteur = r.body.getReader(), dec = new TextDecoder();
  (async () => {
    try {
      for (;;) {
        const { done, value } = await lecteur.read();
        if (done) break;
        analyserTrames(etat, dec.decode(value, { stream: true }), t => { if (t.commentaire || t.event === 'pouls') f.commentaires++; else {   /* `pouls` : la pulsation du service (un VRAI événement depuis le 2 octobre — un commentaire `:` ne se voit pas du JavaScript), comptée avec les trames de garde */ let d = null; try { d = t.data ? JSON.parse(t.data) : null; } catch (e) {} f.evenements.push({ id: t.id === null ? null : parseInt(t.id, 10), event: t.event, data: d, brut: t.data }); } });
      }
    } catch (e) {}
    f.ferme = true;
  })();
  f.fermer = () => { try { ctrl.abort(); } catch (e) {} };
  /* Attend le PREMIER événement qui vérifie `pred` (parmi ceux déjà reçus ou à venir). */
  f.attendre = async (pred, plafond = 8000) => attendre(() => f.evenements.find(pred) || null, plafond, 5);
  f.attendreFerme = async (plafond = 8000) => attendre(() => f.ferme, plafond, 10);
  f.messages = () => f.evenements.filter(e => e.event === 'message');
  return f;
}

/* Un `EventSource` « de navigateur » pour exécuter `public/api.js` dans Node : même interface
   (onopen, onerror, addEventListener, close, readyState, reprise par Last-Event-ID). */
function fabriqueEventSource(c) {
  return class EventSource {
    constructor(url) {
      this.url = url; this.readyState = 0; this._ecouteurs = {}; this._dernier = null; this._ferme = false; this._ctrl = null;
      this._connecter();
    }
    addEventListener(t, f) { (this._ecouteurs[t] = this._ecouteurs[t] || []).push(f); }
    _emettre(t, ev) { for (const f of this._ecouteurs[t] || []) { try { f(ev); } catch (e) {} } const h = this['on' + t]; if (typeof h === 'function') { try { h(ev); } catch (e) {} } }
    async _connecter() {
      if (this._ferme) return;
      this._ctrl = new AbortController();
      const h = { Accept: 'text/event-stream' };
      const ck = c.enteteCookie(); if (ck) h.Cookie = ck;
      if (this._dernier !== null) h['Last-Event-ID'] = String(this._dernier);
      let r;
      try { r = await FETCH(/^https?:/.test(this.url) ? this.url : c.base + this.url, { headers: h, signal: this._ctrl.signal }); }
      catch (e) { if (this._ferme) return; this.readyState = 0; this._emettre('error', { type: 'error' }); setTimeout(() => this._connecter(), 100); return; }
      /* Comme un navigateur : tout statut autre que 200 FERME définitivement le flux. */
      if (r.status !== 200) { this.readyState = 2; this._emettre('error', { type: 'error', statut: r.status }); return; }
      this.readyState = 1; this._emettre('open', { type: 'open' });
      const etat = { tampon: '' }, lecteur = r.body.getReader(), dec = new TextDecoder();
      try {
        for (;;) {
          const { done, value } = await lecteur.read(); if (done) break;
          analyserTrames(etat, dec.decode(value, { stream: true }), t => {
            if (t.commentaire) return;
            if (t.id !== null) this._dernier = t.id;
            this._emettre(t.event, { type: t.event, data: t.data, lastEventId: t.id === null ? '' : t.id });
          });
        }
      } catch (e) {}
      if (this._ferme) return;
      this.readyState = 0; this._emettre('error', { type: 'error' });
      setTimeout(() => this._connecter(), 100);
    }
    close() { this._ferme = true; this.readyState = 2; try { this._ctrl && this._ctrl.abort(); } catch (e) {} }
  };
}

/* Une base de test lisible À CÔTÉ du service (WAL : plusieurs processus, une base) — en LECTURE
   seule, pour constater ce qui est RANGÉ sur le disque. */
function lireBase(chemin) {
  const { DatabaseSync } = require('node:sqlite');
  return new DatabaseSync(chemin, { readOnly: true });
}

/* Enlève les commentaires d'un fichier source : un banc qui cherche un motif vise du CODE, pas
   la phrase qui l'explique (règle du dépôt). Seuls les blocs qui COMMENCENT une ligne et les
   lignes entièrement commentées sont retirés — le motif naïf avale du vrai code. */
function sansCommentaires(src) {
  return String(src).replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
}

/* Le compteur de vérifications des bancs (même forme que les autres suites du dépôt). */
function compteur() {
  const c = { ok: 0, ko: 0 };
  c.v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { c.ok++; console.log('  ✓ ' + t); } else { c.ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
  c.vrai = (t, a) => c.v(t, !!a, true);
  /* ⛔ Un banc qui MEURT (exception attrapée, `process.exitCode = 1` posé par son `catch`) n'est pas un banc vert : sans cette ligne, `fin()`
     sortait en 0 avec « 2 ✓ 0 ✗ » — la mutation « OP GESTION ne rend plus l'identifiant du compte » survivait à test-904 (relecture adverse). */
  c.fin = () => { if (process.exitCode) c.ko++; console.log('\n' + c.ok + ' ✓  ' + c.ko + ' ✗'); process.exit(c.ko ? 1 : 0); };
  return c;
}

/* Sans les dépendances du service, rien ne se lance : on le DIT et on sort en succès, comme les
   autres bancs de serveur — une suite qui ne peut pas s'exécuter ne doit pas se déclarer verte
   avec des ✓ (le plancher de `scripts/bancs-messages.liste` le rattrape en CI). */
function sauterSiSansDependances() {
  if (!fs.existsSync(path.join(SERVICE, 'node_modules'))) {
    console.log('  — server-msg/node_modules absent : banc non exécuté (npm ci dans server-msg/)');
    console.log('\n0 ✓  0 ✗');
    process.exit(0);
  }
}

/* Un « navigateur » pour exécuter `public/api.js` et `public/ui.js` dans Node : un `fetch` qui garde
   les cookies, pose l'`Origin` de la page sur toute écriture (ce que fait un navigateur) et résout les
   chemins relatifs sur le service ; un `EventSource` de même cookie. `origin` se change pour jouer une
   page d'un AUTRE site. */
function navigateur(base, opts = {}) {
  const c = client(base, opts);
  const origin = opts.origin || base;
  const f = async (url, init = {}) => {
    const full = String(url).startsWith('/') ? base + url : String(url);
    const h = Object.assign({}, init.headers || {});
    const m = (init.method || 'GET').toUpperCase();
    const ck = c.enteteCookie(); if (ck) h.Cookie = ck;
    if (m !== 'GET' && m !== 'HEAD') h.Origin = origin;
    /* ⛔ LE SIGNAL D'ABANDON SUIT, COMME DANS UN NAVIGATEUR. `sonder()` (api.js) ouvre le flux pour lire un refus et, s'il s'ouvre,
       l'ABANDONNE par ce signal. Jeté ici, l'abandon ne faisait rien : la sonde gardait la place qui venait de se libérer, et un flux
       refusé ne rouvrait plus — test-907 tombait au hasard, sous charge (3 octobre 2026 ; scratchpad/sonde-907-signal.js). */
    const r = await FETCH(full, { method: m, headers: h, body: init.body, redirect: 'manual', signal: init.signal });
    c.absorber(r);
    return r;
  };
  return { fetch: f, EventSource: fabriqueEventSource(c), client: c };
}

module.exports = { navigateur, RACINE, SERVICE, dort, portLibre, attendre, lancerService, fauxOpGestion, client, connecter, flux, fabriqueEventSource, analyserTrames, lireBase, sansCommentaires, compteur, sauterSiSansDependances, Sortie };

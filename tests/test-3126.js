/* ⛔ CE QUE CE FICHIER GARDE — LE CADRE : LA TOUR AFFICHE OP MESSAGES BÊTA, ET PERSONNE D'AUTRE (28 octobre 2026).

   Justin : « je veux OP MESSAGES avec les mêmes fonctions que OP MESSAGES Pro » dans la Tour. La Tour affiche donc la vraie page d'OP MESSAGES bêta dans un cadre. Jusque-là la page disait
   `frame-ancestors 'none'` (personne n'encadre) ; elle dit maintenant `frame-ancestors https://teamop.fr` — mais SEULEMENT là où la configuration l'écrit, pour la page d'accueil, et
   pour ce seul site. Ce banc lance le VRAI service (`server-msg/index.js`, processus isolé, 127.0.0.1) et lit ce qu'il répond ; il lance aussi l'OUTIL qui pose le bloc.

   Les contrôles marqués ⛔ gardent des propriétés dont la perte ne se verrait PAS à l'écran :
     · SANS CONFIGURATION, RIEN NE CHANGE — `frame-ancestors 'none'` sur toutes les pages, et le texte de la CSP est CELUI D'AVANT, octet pour octet (bêta ET production). Une ouverture qui
       déborde de son interrupteur laisserait la vraie messagerie des clients encadrable par n'importe quel site (clickjacking) sans qu'aucun écran ne le montre ;
     · OUVERT, C'EST UN SEUL SITE ET UNE SEULE PAGE — `https://teamop.fr`, ni joker, ni http, ni liste libre ; la page d'accueil seulement, jamais l'API, `/health`, la page de l'invité,
       une pièce, une erreur ; et RIEN D'AUTRE ne bouge dans la CSP (le reste de la politique est comparé mot pour mot) ;
     · UNE VALEUR FAUSSE REFUSE LE DÉMARRAGE au lieu d'être ignorée en silence (ignorée, le cadre resterait fermé et la Tour afficherait « ne peut pas s'afficher » sans cause visible) —
       et la production refuse le bloc entier : le cadre n'existe pas sur la vraie messagerie ;
     · LE MICRO ET LA CAMÉRA restent permis à la page (`Permissions-Policy: camera=(self), microphone=(self)` : `self` est l'origine de la page, c'est-à-dire celle du cadre ; la Tour lui DÉLÈGUE
       par `allow=`), et aucune autre fonction que la page utilise (écran, position, presse-papiers, plein écran, lecture auto) n'est interdite par cet en-tête ;
     · LE COOKIE DE SESSION reste `SameSite=Strict`, sans `Domain` : `msg-beta.teamop.fr` et `teamop.fr` sont du MÊME SITE, le cookie voyage dans le cadre sans qu'on l'affaiblisse (la preuve
       dans un VRAI navigateur est `scratchpad/sonde-cadre.js`) ;
     · L'OUTIL (`configurer-cadre.js`) pose, vérifie, retire — sans toucher aux autres clés, refuse un fichier de production, et ce qu'il écrit est ce que le service démarre. */

const fs = require('fs'), os = require('os'), path = require('path');
const { spawnSync } = require('child_process');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const CONFIG = require(path.join(T.SERVICE, 'config.js'));
const OUTIL = path.join(T.SERVICE, 'configurer-cadre.js');

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (240 s)'); process.exit(1); }, 240000).unref();

/* La CSP de la page, TELLE QU'ELLE ÉTAIT avant le cadre (le texte qui sert d'étalon : la page d'aujourd'hui doit lui rester identique quand rien n'est configuré). */
const CSP_AVANT = "default-src 'none'; script-src 'self'; worker-src 'self'; manifest-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; frame-src blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
const CSP_CADRE = CSP_AVANT.replace("frame-ancestors 'none'", 'frame-ancestors https://teamop.fr');
const CSP_PIECE = "sandbox; default-src 'none'";
const PAGES_CLOSES = ['/health', '/invite.html', '/api.js', '/opmsg-ui.js', '/api/config', '/api/moi', '/api/pieces/p_x', '/API/moi', '/inexistant', '/index.html/', '/INDEX.HTML'];
const csp = async (c, chemin) => { const r = await c.get(chemin); return { code: r.code, csp: r.h.get('content-security-policy'), r }; };
const ancetres = (s) => (String(s || '').match(/frame-ancestors[^;]*/g) || []);
const dort = T.dort;

async function refuseAuDemarrage(titre, config, instance, motifAttendu, canari) {
  const svc = await T.lancerService({ instance: instance || 'beta', config, attendreSante: false });
  try {
    const mort = await T.attendre(() => svc.sorti() !== null, 8000, 25);
    const sortie = svc.sortie.texte();
    vrai('⛔ ' + titre + ' : le démarrage est REFUSÉ (le service sort, code ≠ 0), pas ignoré', mort !== null && svc.sorti() !== 0);
    vrai('   …et la cause est nommée (« ' + motifAttendu + ' »)', new RegExp(motifAttendu).test(sortie));
    if (canari) vrai('   …sans recopier la valeur fautive dans le journal', !sortie.includes(canari));
    let ecoute = true; try { await fetch(svc.base + '/health', { signal: AbortSignal.timeout(800) }); } catch (e) { ecoute = false; }
    vrai('   …et rien n\'écoute sur le port', !ecoute);
  } finally { await svc.arreter(); }
}

(async () => {
  const og = await T.fauxOpGestion({ alice: { pass: 'pw-alice-1234', nom: 'Alice Martin', actif: true } });
  const sans = await T.lancerService({ urlGestion: og.url });
  let ouvert = null, prod = null, dossierOutil = null;
  try {
    console.log('Sans configuration : le cadre est FERMÉ partout, et la politique est celle d\'avant');
    {
      const c = T.client(sans.base);
      vrai('population : le service du banc est lancé SANS bloc `encadrement`', sans.config.encadrement === undefined);
      for (const p of ['/', '/index.html']) {
        const r = await csp(c, p);
        v('⛔ ' + p + ' : la CSP est EXACTEMENT celle d\'avant le cadre (octet pour octet)', [r.code, r.csp], [200, CSP_AVANT]);
      }
      for (const p of PAGES_CLOSES) {
        const r = await csp(c, p);
        vrai('⛔ ' + p + ' (' + r.code + ') : frame-ancestors \'none\'' + (p.startsWith('/api/pieces') ? ' — une pièce garde son bac à sable' : ''),
          p.startsWith('/api/pieces') ? r.csp === CSP_PIECE : ancetres(r.csp).length === 1 && ancetres(r.csp)[0] === "frame-ancestors 'none'");
      }
      vrai('aucun X-Frame-Options (la CSP est la seule voie, et elle est cohérente)', !(await c.get('/')).h.get('x-frame-options'));
    }

    console.log('\nSans configuration, en PRODUCTION : la même politique (le service y démarre, fermé)');
    {
      prod = await T.lancerService({ instance: 'prod' });
      const c = T.client(prod.base);
      v('⛔ production, / : la CSP est exactement celle d\'avant', (await csp(c, '/')).csp, CSP_AVANT);
      v('⛔ production, /index.html : idem', (await csp(c, '/index.html')).csp, CSP_AVANT);
      vrai('production : rien ne porte une origine d\'encadrement', !(await c.get('/')).h.get('content-security-policy').includes('teamop.fr'));
      await prod.arreter(); prod = null;
    }

    console.log('\nAvec la configuration de la bêta : la page d\'accueil s\'ouvre à https://teamop.fr, et à lui seul');
    {
      ouvert = await T.lancerService({ urlGestion: og.url, config: { encadrement: { parents: ['https://teamop.fr'] } } });
      const c = T.client(ouvert.base);
      v('population : le service du banc est lancé AVEC le bloc de la bêta (le fichier qu\'il lit)', ouvert.config.encadrement, { parents: ['https://teamop.fr'] });
      for (const p of ['/', '/index.html']) {
        const r = await csp(c, p);
        v('⛔ ' + p + ' : « frame-ancestors https://teamop.fr » — et RIEN d\'autre ne bouge dans la CSP (comparée mot pour mot)', [r.code, r.csp], [200, CSP_CADRE]);
        vrai('   …une seule directive frame-ancestors, sans joker, sans http, sans autre site', ancetres(r.csp).length === 1 && !/\*|http:|evil|'none'/.test(ancetres(r.csp)[0]) && ancetres(r.csp)[0] === 'frame-ancestors https://teamop.fr');
      }
      for (const p of PAGES_CLOSES) {
        const r = await csp(c, p);
        vrai('⛔ ' + p + ' (' + r.code + ') : reste fermé — frame-ancestors \'none\'' + (p.startsWith('/api/pieces') ? ' (bac à sable intact)' : ''),
          p.startsWith('/api/pieces') ? r.csp === CSP_PIECE : (r.csp === CSP_AVANT));
      }
      const idx = await c.get('/');
      const entetes = ['x-content-type-options', 'referrer-policy', 'cross-origin-opener-policy', 'cross-origin-resource-policy', 'permissions-policy'].map(k => idx.h.get(k));
      v('⛔ les AUTRES en-têtes de la page sont inchangés (nosniff, no-referrer, COOP/CORP same-origin, Permissions-Policy)', entetes, ['nosniff', 'no-referrer', 'same-origin', 'same-origin', 'camera=(self), microphone=(self)']);
      vrai('⛔ toujours AUCUN X-Frame-Options, AUCUN Access-Control-* (page et API)', !idx.h.get('x-frame-options') && Array.from(idx.h.keys()).concat(Array.from((await c.get('/api/config')).h.keys())).every(k => !/^access-control-|^x-frame-options$/.test(k)));
      const api = await c.get('/api/config');
      vrai('l\'API (JSON) garde ses en-têtes : no-store, CSP fermée, JSON', /no-store/.test(api.h.get('cache-control') || '') && api.h.get('content-security-policy') === CSP_AVANT && /json/.test(api.h.get('content-type') || ''));
      const rep = await fetch(ouvert.base + '/api/moi', { method: 'OPTIONS', headers: { Origin: 'https://teamop.fr', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,x-opm' } });
      vrai('⛔ encadrer N\'EST PAS autoriser : une requête préalable (OPTIONS) venue de teamop.fr ne reçoit toujours AUCUNE permission CORS (la page encadrée parle à SA propre origine)', !rep.headers.get('access-control-allow-origin') && !rep.headers.get('access-control-allow-headers'));
      vrai('la page ENCADRÉE écrit toujours avec SON origine, jamais celle de la Tour : une écriture portant `Origin: https://teamop.fr` est refusée', (await c.post('/api/beta/entrer', { login: 'alice', pass: 'pw-alice-1234' }, { origin: 'https://teamop.fr' })).code === 403);
      const bon = await c.post('/api/beta/entrer', { login: 'alice', pass: 'pw-alice-1234' });
      vrai('…et celle du service est acceptée (la connexion dans le cadre est une connexion ordinaire)', bon.code === 200);
      const cookies = typeof bon.h.getSetCookie === 'function' ? bon.h.getSetCookie() : [];
      vrai('population : la connexion a posé au moins un cookie', cookies.length >= 1);
      vrai('⛔ le cookie de session reste SameSite=Strict, HttpOnly, sans Domain (le cadre de teamop.fr est du MÊME SITE : il le reçoit tel quel, et rien n\'a été affaibli pour lui)',
        cookies.length >= 1 && cookies.every(k => /;\s*SameSite=Strict/i.test(k) && /;\s*HttpOnly/i.test(k) && !/;\s*Domain=/i.test(k)));
      vrai('…et jamais SameSite=None (ce qui l\'enverrait à n\'importe quel site)', cookies.every(k => !/SameSite=None/i.test(k)));
    }

    console.log('\nLe micro, la caméra et le reste : l\'en-tête ne leur ferme pas la porte du cadre');
    {
      const ph = (await T.client(ouvert.base).get('/')).h.get('permissions-policy') || '';
      const regles = Object.fromEntries(ph.split(',').map(s => s.trim()).filter(Boolean).map(s => { const i = s.indexOf('='); return [s.slice(0, i), s.slice(i + 1)]; }));
      v('la liste EXACTE des fonctions que l\'en-tête règle (en ajouter une oblige à trancher ici : un cadre ne peut pas dépasser ce que la page se permet)', Object.keys(regles).sort(), ['camera', 'microphone']);
      v('⛔ caméra et micro : `(self)` — permis à la page (l\'origine du CADRE), refusés à toute autre origine ; ni `()` (fermé à tous, le cadre compris), ni `*`', [regles.camera, regles.microphone], ['(self)', '(self)']);
      /* Ce que la page UTILISE vraiment : sans cette population, « l'en-tête ne les interdit pas » passerait sur du vide. */
      const src = T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, 'public', 'opmsg-ui.js'), 'utf8'));
      const emploi = {
        camera: /getUserMedia/.test(src) && /\bvideo\s*:/.test(src), microphone: /getUserMedia/.test(src) && /\baudio\s*:/.test(src),
        'display-capture': /getDisplayMedia/.test(src), geolocation: /navigator\.geolocation/.test(src),
        'clipboard-write': /clipboard\.writeText/.test(src), 'clipboard-read': /clipboard\.readText/.test(src),
        'screen-wake-lock': /wakeLock/.test(src), 'picture-in-picture': /requestPictureInPicture/.test(src),
      };
      vrai('population : la page utilise bien micro, caméra, écran, position, presse-papiers (ce que la Tour doit déléguer par `allow=`)', emploi.camera && emploi.microphone && emploi['display-capture'] && emploi.geolocation && emploi['clipboard-write']);
      const interdites = Object.keys(emploi).filter(k => emploi[k] && regles[k] !== undefined && regles[k] !== '(self)' && regles[k] !== '*');
      v('⛔ aucune fonction utilisée par la page n\'est fermée par l\'en-tête (hors caméra et micro, réglés `(self)`)', interdites, []);
      vrai('…et celles que l\'en-tête ne nomme pas gardent leur défaut (`self`) : elles passent dans un cadre dès que la Tour les délègue', Object.keys(emploi).filter(k => emploi[k] && !['camera', 'microphone'].includes(k)).every(k => regles[k] === undefined));
    }

    console.log('\nUne valeur fausse REFUSE le démarrage (jamais ignorée), et la production refuse le bloc');
    {
      const FAUX = [
        ['un joker (https://*.teamop.fr)', { encadrement: { parents: ['https://*.teamop.fr'] } }, '*.teamop'],
        ['http (http://teamop.fr)', { encadrement: { parents: ['http://teamop.fr'] } }, null],
        ['une liste vide', { encadrement: { parents: [] } }, null],
        ['un autre site', { encadrement: { parents: ['https://evil.example'] } }, 'evil.example'],
        ['un site de plus à côté du bon', { encadrement: { parents: ['https://teamop.fr', 'https://evil.example'] } }, 'evil.example'],
      ];
      for (const [t, cfg, canari] of FAUX) await refuseAuDemarrage(t, cfg, 'beta', 'encadrement', canari);
      await refuseAuDemarrage('la PRODUCTION avec un bloc pourtant valable', { encadrement: { parents: ['https://teamop.fr'] }, trajet: false }, 'prod', 'seulement sur la bêta', null);
      /* Le reste des formes fausses, par la FONCTION que le démarrage appelle (`config.js`, la seule validation). */
      const refus = (cfg, inst) => { try { CONFIG.encadrementConfig(cfg, inst || 'beta'); return 'accepté'; } catch (e) { return e.code === 'CONFIG' && /^config: encadrement/.test(e.message) ? 'refusé' : 'autre : ' + e.message; } };
      const injection = 'https://teamop.fr; script-src *';
      const cas = {
        'barre finale': ['https://teamop.fr/'], 'port': ['https://teamop.fr:8443'], 'casse': ['https://TEAMOP.fr'], 'sous-domaine': ['https://msg-beta.teamop.fr'],
        'www': ['https://www.teamop.fr'], 'deux sources dans une chaîne': ['https://teamop.fr https://evil.example'], 'directive injectée': [injection], 'espace en fin': ['https://teamop.fr '],
        '*': ['*'], 'https:': ['https:'], '\'none\'': ["'none'"], 'self': ["'self'"], 'un nombre': [1], 'null': [null], 'une liste dans la liste': [['https://teamop.fr']],
      };
      for (const [nom, parents] of Object.entries(cas)) v('⛔ ' + nom + ' → refusé par la validation du démarrage', refus({ encadrement: { parents } }), 'refusé');
      v('une chaîne à la place de la liste → refusé', refus({ encadrement: { parents: 'https://teamop.fr' } }), 'refusé');
      v('une chaîne à la place du bloc → refusé', refus({ encadrement: 'https://teamop.fr' }), 'refusé');
      v('une liste à la place du bloc → refusé', refus({ encadrement: ['https://teamop.fr'] }), 'refusé');
      v('une clé inconnue dans le bloc → refusé', refus({ encadrement: { parents: ['https://teamop.fr'], origines: ['*'] } }), 'refusé');
      v('le bloc vide `{}` → refusé (« parents » manque)', refus({ encadrement: {} }), 'refusé');
      v('⛔ la production refuse même un bloc valable', refus({ encadrement: { parents: ['https://teamop.fr'] } }, 'prod'), 'refusé');
      v('absent → fermé (null), pas une erreur', [CONFIG.encadrementConfig({}, 'beta'), CONFIG.encadrementConfig({ encadrement: null }, 'prod'), CONFIG.encadrementConfig({}, 'prod')], [null, null, null]);
      v('la forme juste → la liste exacte', CONFIG.encadrementConfig({ encadrement: { parents: ['https://teamop.fr'] } }, 'beta'), ['https://teamop.fr']);
      v('le code nomme UNE seule origine possible (https://teamop.fr) — en ajouter une est un geste conscient', CONFIG.PARENTS_POSSIBLES, ['https://teamop.fr']);
    }

    console.log('\nL\'outil de pose : pose, vérifie, retire — sans toucher au reste, jamais la production');
    {
      dossierOutil = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-cadre-'));
      const beta = path.join(dossierOutil, 'beta.json'), prodf = path.join(dossierOutil, 'prod.json');
      const base = { origines: ['https://msg-beta.teamop.fr'], cookie: { nom: 'opm', secure: false }, pulsationMs: 12345, pont: { actif: false } };
      fs.writeFileSync(beta, JSON.stringify(base, null, 2), { mode: 0o640 }); fs.writeFileSync(prodf, JSON.stringify(base));
      const lance = (f, ...a) => spawnSync(process.execPath, [OUTIL, ...a], { env: Object.assign({}, process.env, { OPMSG_CONFIG: f, OPMSG_INSTANCE: '' }), encoding: 'utf8' });
      const lis = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
      let r = lance(beta, '--verifier');
      vrai('--verifier sur un fichier sans bloc : « FERMÉ », sortie 0', r.status === 0 && /FERMÉ/.test(r.stdout));
      r = lance(beta, '--retirer');
      vrai('--retirer sans bloc : refuse proprement (déjà fermé), fichier intact', r.status === 1 && JSON.stringify(lis(beta)) === JSON.stringify(base));
      r = lance(beta);
      const apres = lis(beta);
      vrai('poser : sortie 0, le bloc est la liste exacte', r.status === 0 && JSON.stringify(apres.encadrement) === JSON.stringify({ parents: ['https://teamop.fr'] }));
      const sansBloc = Object.assign({}, apres); delete sansBloc.encadrement;
      v('⛔ poser ne touche à AUCUNE autre clé', sansBloc, base);
      v('⛔ le fichier reste en 0600 (il peut porter des secrets d\'autres blocs)', (fs.statSync(beta).mode & 0o777).toString(8), '600');
      vrai('aucun fichier temporaire ne traîne', fs.readdirSync(dossierOutil).every(n => !/\.tmp-/.test(n)));
      r = lance(beta, '--verifier');
      vrai('--verifier sur un fichier posé : « OUVERT à : https://teamop.fr »', r.status === 0 && /OUVERT à : https:\/\/teamop\.fr/.test(r.stdout));
      /* ⛔ de bout en bout : ce que l'outil a écrit est ce que le service démarre, et la page le dit. */
      const outilSvc = await T.lancerService({ urlGestion: og.url, config: lis(beta) });
      try { v('⛔ le service démarré sur le fichier de l\'OUTIL sert « frame-ancestors https://teamop.fr »', (await csp(T.client(outilSvc.base), '/')).csp, CSP_CADRE); }
      finally { await outilSvc.arreter(); }
      r = lance(beta);
      vrai('poser deux fois : sans effet de bord (même bloc, une seule origine)', r.status === 0 && JSON.stringify(lis(beta).encadrement) === JSON.stringify({ parents: ['https://teamop.fr'] }));
      r = lance(prodf);
      vrai('⛔ le fichier de PRODUCTION est refusé AVANT d\'écrire (le service refuserait de démarrer)', r.status === 1 && /bêta/.test(r.stderr) && JSON.stringify(lis(prodf)) === JSON.stringify(base));
      r = lance(prodf, '--retirer');
      vrai('…y compris pour retirer (on ne manipule pas un fichier de production d\'ici)', r.status === 1);
      fs.writeFileSync(beta, JSON.stringify(Object.assign({}, base, { encadrement: { parents: ['https://evil.example'] } })));
      r = lance(beta, '--verifier');
      vrai('--verifier sur un bloc que le service REFUSERAIT : le dit (sortie 1), sans rien modifier', r.status === 1 && /REFUSÉ/.test(r.stderr));
      r = lance(beta, '--retirer');
      vrai('--retirer enlève un bloc faux (c\'est aussi la sortie de secours)', r.status === 0 && lis(beta).encadrement === undefined);
      fs.writeFileSync(beta, JSON.stringify(Object.assign({}, base, { encadrement: { parents: ['https://teamop.fr'] } })));
      r = lance(beta, '--retirer');
      const ferme = lis(beta);
      v('⛔ --retirer rend le fichier tel qu\'il était (le cadre se REFERME avec ses réglages intacts)', ferme, base);
      const fermeSvc = await T.lancerService({ urlGestion: og.url, config: ferme });
      try { v('…et le service redémarré sur ce fichier redit « frame-ancestors \'none\' » sur la page', (await csp(T.client(fermeSvc.base), '/')).csp, CSP_AVANT); }
      finally { await fermeSvc.arreter(); }
      r = lance(path.join(dossierOutil, 'beta-absent.json'));
      vrai('un fichier introuvable : refuse, ne crée rien', r.status === 1 && !fs.existsSync(path.join(dossierOutil, 'beta-absent.json')));
      r = lance(beta, '--bidon');
      vrai('une option inconnue : refusée', r.status === 1);
      r = spawnSync(process.execPath, [OUTIL], { env: Object.assign({}, process.env, { OPMSG_CONFIG: '' }), encoding: 'utf8' });
      vrai('sans OPMSG_CONFIG : refuse', r.status === 1);
    }
  } catch (e) {
    console.log('  ✗ le banc est mort : ' + (e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e));
    process.exitCode = 1;
  } finally {
    await sans.arreter(); if (ouvert) await ouvert.arreter(); if (prod) await prod.arreter();
    try { if (dossierOutil) fs.rmSync(dossierOutil, { recursive: true, force: true }); } catch (e) {}
    await og.fermer();
  }
  fin();
})();

/* ⛔ CE QUE CE FICHIER GARDE — LE CLIENT CONTRE LE SERVEUR : les VRAIES fonctions de `public/api.js`, exécutées
   contre le VRAI service (famille 5).

   C'est la couture qui a déjà coûté trois fois à ce dépôt : deux moitiés justes chacune, qui ne se
   parlent pas (`CLAUDE.md`, « la couture la plus dangereuse »). Ici `api.js` — le client que la vraie
   interface appelle — tourne dans Node avec un `fetch` à cookies et un `EventSource` de même cookie.
   ⛔ L'ancienne page minimale de l'étape 1 (`ui.js`, jouée dans un DOM de poche) a été REMPLACÉE par la vraie interface de Justin (générée par
   `scripts/opmsg-public.js`) : elle ne se joue plus dans un DOM de poche mais dans un vrai navigateur (`tests/sonde-opmessages-serveur.js`, où du HTML
   piégé est injecté dans chaque champ), et son module de données contre le service dans `tests/test-911.js`. Ce qui reste ici : le client, ses refus, et
   ce que la page servie ne doit jamais contenir.

   Les contrôles marqués ⛔ gardent des propriétés dont la perte ne se verrait PAS :
     · CHAQUE CODE D'ERREUR QUE LE SERVICE PEUT RENDRE A SA PHRASE (recensé dans le code du service, pas
       dans une liste écrite à la main) : un refus muet fait croire à une panne (leçon `_mailboxes`) ;
     · UN `fetch` NE JETTE PAS SUR UN 4xx : un refus, une coupure, une page de relais ne sont JAMAIS une
       réussite — `fetch` avait annoncé « vient de partir » sur 6 cas faux sur 9 au portail d'OP GESTION ;
     · UN RENVOI NE CRÉE JAMAIS DEUX MESSAGES (même `cid`) ;
     · LES IDENTIFIANTS QUE LA PAGE CHERCHE EXISTENT DANS `index.html` (un `getElementById` qui rend `null`
       tue la page au chargement, sans erreur visible pour les bancs qui ne chargent pas la page). */

const fs = require('fs'), path = require('path'), http = require('http');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const PUB = path.join(T.SERVICE, 'public');
const OPMSG = require(path.join(PUB, 'api.js'));
const { ErreurApi, MESSAGES, dire } = OPMSG;

/* `api.js` lit `fetch` et `EventSource` dans la portée globale quand on ne les lui passe pas : c'est ce que la
   VRAIE page fait. On les redéfinit donc le temps d'exécuter `ui.js`, puis on remet les natifs. */
const FETCH_NATIF = globalThis.fetch, ES_NATIF = globalThis.EventSource;
const attrape = async (p) => { try { await p; return null; } catch (e) { return e; } };

(async () => {
  const og = await T.fauxOpGestion({ alice: { pass: 'pw-alice-1234', nom: 'Alice', actif: true }, bob: { pass: 'pw-bob-12345', nom: 'Bob', actif: true }, coupe: { pass: 'pw-coupe-123', nom: 'Coupé', actif: false }, dora: { pass: 'pw-dora-12345', nom: 'Dora', actif: true }, eve: { pass: 'pw-eve-123456', nom: 'Eve', actif: true }, fay: { pass: 'pw-fay-123456', nom: 'Fay', actif: true } });
  /* ⛔ 5 s, la valeur de production : le délai de la porte est la marge des connexions SAINES (voir test-944, 8 octobre 2026 — un service gelé 1,2 s rend 503 avec un
     budget court). La panne d'OP GESTION se joue connexion coupée (`og.mode = 'panne'`), pas au délai. */
  const svc = await T.lancerService({ urlGestion: og.url, horloge: true, config: { beta: { timeoutMs: 5000 }, quotas: { msg: { max: 6, fenetreMs: 60000 }, saisie: { max: 1, fenetreMs: 2000 } }, balayageMs: 150 } });
  try {
    console.log('api.js : la connexion et les refus de la porte sont DITS, jamais avalés');
    const nav = T.navigateur(svc.base);
    const a = OPMSG.creer({ base: svc.base, fetch: nav.fetch, EventSource: nav.EventSource });
    {
      const moi = await a.connexionBeta('alice', 'pw-alice-1234');
      v('connexionBeta rend la personne connectée', [moi.prenom, moi.origine, moi.verifie], ['Alice', 'beta', true]);
      v('moi() relit la même personne par le cookie (le jeton n\'est jamais dans le JavaScript)', (await a.moi()).id, moi.id);
      const e1 = await attrape(OPMSG.creer({ base: svc.base, fetch: T.navigateur(svc.base).fetch }).connexionBeta('alice', 'faux-faux-faux'));
      vrai('un mauvais mot de passe LÈVE une ErreurApi (code identifiants, statut 401, phrase française)', e1 instanceof ErreurApi && e1.code === 'identifiants' && e1.statut === 401 && e1.message === dire('identifiants') && /incorrect/.test(e1.message));
      const e2 = await attrape(OPMSG.creer({ base: svc.base, fetch: T.navigateur(svc.base).fetch }).connexionBeta('coupe', 'pw-coupe-123'));
      v('un accès coupé : le code acces_coupe est dit à l\'écran', [e2.code, e2.message], ['acces_coupe', MESSAGES.acces_coupe]);
      og.mode = 'panne';
      const e3 = await attrape(OPMSG.creer({ base: svc.base, fetch: T.navigateur(svc.base).fetch }).connexionBeta('bob', 'pw-bob-12345'));
      og.mode = 'normal';
      v('⛔ OP GESTION muet : « porte_indisponible » est dit (le visiteur ne croit pas à un mauvais mot de passe)', [e3.code, e3.statut], ['porte_indisponible', 503]);
    }

    console.log('\nChaque refus du service a sa phrase — jouée par le VRAI client contre le VRAI service');
    {
      const b = T.navigateur(svc.base), cb = OPMSG.creer({ base: svc.base, fetch: b.fetch, EventSource: b.EventSource });
      await cb.connexionBeta('bob', 'pw-bob-12345');
      const alice = await a.moi(), bob = await cb.moi();
      const lien = await a.lienContact({ max: 5, jours: 1 });
      await cb.accepterLien(lien.code);
      const d = await a.directe(bob.id);
      const dm = d.conversation.id;
      const g = (await a.groupe({ nom: 'Groupe de banc', membres: [bob.id], annonces_seules: false })).conversation.id;
      const ga = (await a.groupe({ nom: 'Annonces', membres: [bob.id], annonces_seules: true })).conversation.id;
      const inconnue = 'c_' + '0'.repeat(32);
      let dora = null, doraG = null;
      const essais = [
        ['champ_invalide', () => a.envoyer(g, '   ')],
        ['introuvable', () => a.conversation(inconnue)],
        ['message_inconnu', () => a.envoyer(g, 'réponse dans le vide', { reponse_a: 9999 })],
        ['annonces_seules', () => cb.envoyer(ga, 'moi aussi')],
        ['trop_long', () => a.envoyer(g, 'x'.repeat(8001))],
        ['interdit', () => cb.majConversation(g, { nom: 'Pirate' })],
        ['lien_invalide', () => cb.accepterLien('A'.repeat(22))],
        ['lien_propre', async () => { const l = await a.lienContact({}); return a.accepterLien(l.code); }],
        ['dernier_admin', () => a.admin(g, alice.id, false)],
        ['conversation_directe', () => a.ajouterMembres(dm, [bob.id])],
        ['type_invalide', async () => { const m = (await a.messages(g)).messages.find(x => x.type === 'systeme'); return a.supprimer(g, m.seq, 'tous'); }],
        ['delai_depasse', async () => { const r = await a.envoyer(g, 'modifiable'); svc.avancer(16 * 60000); try { return await a.modifier(g, r.seq, 'trop tard'); } finally { svc.avancer(-16 * 60000); } }],
        ['trop_gros', () => a.majMoi({ statut: 'x'.repeat(70000) })],
        ['quota_atteint', async () => { const nd = T.navigateur(svc.base); dora = OPMSG.creer({ base: svc.base, fetch: nd.fetch }); await dora.connexionBeta('dora', 'pw-dora-12345'); doraG = (await dora.groupe({ nom: 'Dora', membres: [] })).conversation.id; for (let i = 0; i < 7; i++) await dora.envoyer(doraG, 'rafale ' + i); }],
      ];
      for (const [code, f] of essais) {
        const e = await attrape(f());
        vrai('⛔ ' + code + ' : le client LÈVE une ErreurApi, au bon code, avec SA phrase française', e instanceof ErreurApi && e.code === code && e.message === MESSAGES[code] && /[a-zé]/i.test(e.message));
      }
      const q = await attrape(dora.envoyer(doraG, 'encore'));
      vrai('un 429 porte son `retry` (en secondes) pour que l\'écran dise « réessaie dans … »', q.code === 'quota_atteint' && q.retry >= 1 && q.statut === 429);
      const r1 = await a.deconnexion();
      v('la déconnexion répond', r1.ok, true);
      const e = await attrape(a.moi());
      v('⛔ session_requise : la phrase « Ta session a expiré. Reconnecte-toi. » est dite après la déconnexion', [e.code, e.message], ['session_requise', MESSAGES.session_requise]);
      const sd = T.navigateur(svc.base, { origin: 'https://evil.example' });
      const cd = OPMSG.creer({ base: svc.base, fetch: sd.fetch });
      const eo = await attrape(cd.connexionBeta('alice', 'pw-alice-1234'));
      v('⛔ une page d\'un AUTRE site : origine_refusee est dite (le service ne laisse pas écrire)', eo.code, 'origine_refusee');
      const sans = OPMSG.creer({ base: svc.base, fetch: (u, i) => nav.fetch(u, Object.assign({}, i, { headers: Object.fromEntries(Object.entries(i.headers || {}).filter(([k]) => k !== 'X-OPM')) })) });
      sans.appel('POST', '/api/moi/maj', {}).catch(() => {});
      const ee = await attrape(sans.appel('POST', '/api/moi/maj', { statut: 'x' }));
      vrai('sans l\'en-tête maison, c\'est entete_requis (on le voit au cas où un jour un relais le retire)', ee && ee.code === 'entete_requis');
    }

    console.log('\nLe client ne prend JAMAIS une réponse qui n\'est pas du JSON du service pour une réussite');
    {
      const relais = http.createServer((q, s) => {
        if (q.url === '/api/moi') { s.writeHead(502, { 'Content-Type': 'text/html' }); return s.end('<html>502 Bad Gateway</html>'); }
        if (q.url === '/api/config') { s.writeHead(200, { 'Content-Type': 'text/html' }); return s.end('<html>page du relais</html>'); }
        if (q.url === '/api/contacts') { s.writeHead(403, { 'Content-Type': 'application/json' }); return s.end('{"error":"interdit"}'); }
        if (q.url === '/api/notifications') { s.writeHead(400, { 'Content-Type': 'text/plain' }); return s.end('mauvaise requête'); }
        if (q.url === '/api/sync') { s.writeHead(429, { 'Retry-After': '17', 'Content-Type': 'application/json' }); return s.end('{"error":"quota_atteint"}'); }
        if (q.url === '/api/conversations') { s.writeHead(200, { 'Content-Type': 'application/json' }); return s.end('null'); }
        s.writeHead(204); s.end();
      });
      const port = await T.portLibre(); await new Promise(r => relais.listen(port, '127.0.0.1', r));
      const c = OPMSG.creer({ base: 'http://127.0.0.1:' + port, fetch });
      const cas = [['un 502 HTML d\'un relais', () => c.moi(), 'serveur', 502], ['un 200 qui est une page HTML', () => c.config(), 'reponse_illisible', 200], ['un 403 JSON', () => c.contacts(), 'interdit', 403], ['un 400 en texte brut', () => c.notifications(), 'inconnue', 400], ['un 429 avec Retry-After', () => c.sync(), 'quota_atteint', 429], ['un 200 « null »', () => c.conversations(), 'reponse_illisible', 200], ['un 204 sans corps', () => c.moi && c.appel('GET', '/autre'), 'reponse_illisible', 204]];
      for (const [nom, f, code, statut] of cas) {
        const e = await attrape(f());
        vrai('⛔ ' + nom + ' → ErreurApi « ' + code + ' » (statut ' + statut + '), jamais une réussite', e instanceof ErreurApi && e.code === code && e.statut === statut);
      }
      v('le Retry-After du relais est repris', (await attrape(c.sync())).retry, 17);
      await new Promise(r => relais.close(r));
      const mort = OPMSG.creer({ base: 'http://127.0.0.1:' + port, fetch });
      const e = await attrape(mort.moi());
      v('⛔ une coupure réseau (rien n\'écoute) → « reseau » (et non « session expirée »)', [e.code, e.message], ['reseau', MESSAGES.reseau]);
    }

    console.log('\nLe recensement : TOUT code que le service peut rendre a sa phrase (lu dans le code du service)');
    {
      const codes = new Set();
      for (const f of ['app.js', 'routes.js', 'routes-pieces.js', 'routes-push.js', 'routes-reunions.js', 'routes-appels.js', 'compte.js', 'porte-beta.js', 'flux.js', 'index.js']) {
        const s = T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, f), 'utf8'));
        for (const m of s.matchAll(/refus\(res,\s*\d+,\s*'([a-z_]+)'/g)) codes.add(m[1]);
        /* les réunions traduisent les refus du stockage par une table `{ code: [statut, 'code_rendu'] }` : le code RENDU est celui qu'il faut dire */
        if (f === 'routes-reunions.js' || f === 'routes-appels.js') for (const m of s.matchAll(/\[\d{3},\s*'([a-z_]+)'\]/g)) codes.add(m[1]);
        /* … et la lecture du corps rend `{ erreur: 'code' }` (heure_inexistante, fin_avant_debut, rappel_invalide…) que la route renvoie telle quelle : autant de codes à dire */
        if (f === 'routes-reunions.js') for (const m of s.matchAll(/\berreur:\s*'([a-z_]+)'/g)) codes.add(m[1]);
        for (const m of s.matchAll(/error:\s*'([a-z_]+)'/g)) codes.add(m[1]);
        for (const m of s.matchAll(/code:\s*'(trop_de_flux)'/g)) codes.add(m[1]);
      }
      vrai('population : plus de 25 codes recensés dans le code du service (' + codes.size + ')', codes.size > 25);
      vrai('population : le recensement VOIT les codes des réunions — ceux de la lecture du corps (`{ erreur: … }`) comme ceux du stockage traduits (`[409, …]`)', ['heure_inexistante', 'fin_avant_debut', 'rappel_invalide', 'titre_vide', 'trop_de_reunions', 'reunion_annulee', 'hote_non_retirable'].every(c => codes.has(c)));
      v('⛔ chaque code a une phrase dans MESSAGES (un refus sans phrase est une panne qui s\'ignore)', Array.from(codes).filter(c => !MESSAGES[c]), []);
      vrai('chaque phrase est du français lisible (non vide, finit par un point)', Object.values(MESSAGES).every(m => typeof m === 'string' && m.length > 10 && /[.…]$/.test(m)));
      v('dire() d\'un code inconnu rend la phrase générique', dire('code_qui_n_existe_pas'), MESSAGES.inconnue);
    }

    console.log('\nUn renvoi (réponse perdue) ne crée jamais un deuxième message');
    {
      const b = T.navigateur(svc.base), cb = OPMSG.creer({ base: svc.base, fetch: b.fetch });
      await cb.connexionBeta('bob', 'pw-bob-12345');
      const alice = (await (async () => { const n = T.navigateur(svc.base), ca = OPMSG.creer({ base: svc.base, fetch: n.fetch }); await ca.connexionBeta('alice', 'pw-alice-1234'); return { ca, moi: await ca.moi() }; })());
      const lien = await alice.ca.lienContact({}); await cb.accepterLien(lien.code);
      const d = (await alice.ca.directe((await cb.moi()).id)).conversation.id;
      const cid = OPMSG.nouveauCid();
      vrai('nouveauCid : 32 caractères hexadécimaux, distincts à chaque appel', /^[0-9a-f]{32}$/.test(cid) && cid !== OPMSG.nouveauCid());
      const r1 = await alice.ca.envoyer(d, 'une seule fois', { cid }), r2 = await alice.ca.envoyer(d, 'une seule fois', { cid });
      v('⛔ le même cid rejoué rend « déjà » et le MÊME numéro', [r1.deja, r2.deja, r2.seq === r1.seq], [undefined, true, true]);
      v('et la conversation ne porte qu\'UN message de ce texte', (await alice.ca.messages(d)).messages.filter(m => m.texte === 'une seule fois').length, 1);
      const liste = [];
      OPMSG.fusionner(liste, { seq: 2, texte: 'b' }); OPMSG.fusionner(liste, { seq: 1, texte: 'a' }); OPMSG.fusionner(liste, { seq: 2, texte: 'b', modifie: 5 });
      v('fusionner(): sans doublon, trié par seq, une mise à jour complète la ligne', liste.map(m => m.seq + ':' + m.texte + ':' + (m.modifie || '')), ['1:a:', '2:b:5']);
    }

    console.log('\nLa page servie (générée) : ses identifiants existent, rien ne s\'exécute hors de l\'origine, aucune donnée de démonstration');
    {
      const html = fs.readFileSync(path.join(PUB, 'index.html'), 'utf8'), ui = fs.readFileSync(path.join(PUB, 'opmsg-ui.js'), 'utf8');
      const ids = new Set(Array.from(html.matchAll(/\bid="([^"]+)"/g)).map(m => m[1]));
      const code = T.sansCommentaires(ui);
      const cherches = new Set([...Array.from(code.matchAll(/\$\('([^']+)'\)/g)).map(m => m[1]), ...Array.from(code.matchAll(/getElementById\('([^']+)'\)/g)).map(m => m[1])]);
      vrai('population : la page cherche plusieurs éléments (' + cherches.size + ') dans un document qui en porte ' + ids.size, cherches.size >= 60 && ids.size >= 60);
      const ecrits = new Set(Array.from(ui.matchAll(/\bid="([^"]+)"/g)).map(m => m[1]));   // un identifiant que la page ÉCRIT elle-même (une feuille composée à l'ouverture)
      v('⛔ chaque identifiant que la page cherche existe dans index.html, ou est écrit par la page elle-même (sinon elle meurt au chargement)', Array.from(cherches).filter(i => !ids.has(i) && !ecrits.has(i)), []);
      v('⛔ la page n\'utilise ni document.write, ni eval, ni new Function (un HTML venu d\'un tiers ne devient jamais du code)', /document\.write|\beval\(|new Function\(/.test(code), false);
      v('index.html n\'a ni script en ligne, ni gestionnaire onclick/onerror en attribut', /<script(?![^>]*\bsrc=)[^>]*>|\son[a-z]+\s*=/i.test(html.replace(/<!--[\s\S]*?-->/g, '')), false);
      v('et aucun script ni feuille d\'un autre domaine', /(src|href)="https?:\/\//i.test(html), false);
      /* ⛔ `wss:` (8 octobre 2026) : le WebSocket du serveur de visio, sur l'origine de l'instance — « 'self' » le couvre en CSP 3, pas dans tous les navigateurs. L'EN-TÊTE du service, lui, nomme l'adresse exacte. */
      v('⛔ la politique de la page rouvre le réseau vers le service SEUL (connect-src \'self\', plus le WebSocket de la visio) et ne rend rien d\'autre — ni https:, ni *', /Content-Security-Policy" content="[^"]*connect-src 'self' wss:[;"]/.test(html) && !/connect-src [^;"]*(https?:|\*|ws:(?!s))/.test(html.replace(/wss:/g, '')), true);
      v('⛔ les données de DÉMONSTRATION de l\'aperçu n\'atteignent jamais la page servie (le service servirait de fausses conversations)', ['simulerRecu', 'creerSourceApercu', 'Camille Roux', 'Équipe dépôt'].filter(x => (html + ui + fs.readFileSync(path.join(PUB, 'source-serveur.js'), 'utf8')).includes(x)), []);
    }
  } catch (e) {
    console.log('  ✗ le banc est mort : ' + (e && e.stack || e));
    console.log(svc.sortie.texte().slice(-1200));
    process.exitCode = 1;
  }
  globalThis.fetch = FETCH_NATIF; globalThis.EventSource = ES_NATIF;
  await svc.arreter(); await og.fermer();
  fin();
})();

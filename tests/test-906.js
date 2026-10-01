/* ⛔ CE QUE CE FICHIER GARDE — LA PAGE CONTRE LE SERVEUR : les VRAIES fonctions de `public/api.js` et la
   VRAIE `public/ui.js`, exécutées contre le VRAI service (famille 5).

   C'est la couture qui a déjà coûté trois fois à ce dépôt : deux moitiés justes chacune, qui ne se
   parlent pas (`CLAUDE.md`, « la couture la plus dangereuse »). Ici `api.js` — le client que la vraie
   interface appellera — tourne dans Node avec un `fetch` à cookies et un `EventSource` de même cookie, et
   `ui.js` tourne dans un DOM de poche qui NOTE chaque élément créé.

   Les contrôles marqués ⛔ gardent des propriétés dont la perte ne se verrait PAS :
     · CHAQUE CODE D'ERREUR QUE LE SERVICE PEUT RENDRE A SA PHRASE (recensé dans le code du service, pas
       dans une liste écrite à la main) : un refus muet fait croire à une panne (leçon `_mailboxes`) ;
     · UN `fetch` NE JETTE PAS SUR UN 4xx : un refus, une coupure, une page de relais ne sont JAMAIS une
       réussite — `fetch` avait annoncé « vient de partir » sur 6 cas faux sur 9 au portail d'OP GESTION ;
     · UN RENVOI NE CRÉE JAMAIS DEUX MESSAGES (même `cid`) ;
     · TOUT TEXTE D'UN TIERS ENTRE PAR `textContent` : du HTML injecté dans un nom, un message, un nom de
       groupe s'affiche TEL QUEL et ne crée aucun élément (la liste des éléments créés est relevée) ;
     · LES IDENTIFIANTS QUE `ui.js` CHERCHE EXISTENT DANS `index.html` (un `getElementById` qui rend `null`
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

/* Un DOM de poche : assez pour `ui.js`, et il NOTE les éléments créés. */
function fauxDom(html, ouvrirUrl) {
  class El {
    constructor(tag, id) { this.tagName = String(tag).toUpperCase(); this.id = id || ''; this.children = []; this._t = ''; this.hidden = false; this.value = ''; this.className = ''; this.listeners = {}; this.scrollTop = 0; this.scrollHeight = 0; this.type = ''; this.attrs = {}; }
    get textContent() { return this._t + this.children.map(c => c.textContent).join(''); }
    set textContent(x) { this._t = String(x); this.children = []; }
    get firstChild() { return this.children[0] || null; }
    appendChild(c) { this.children.push(c); return c; }
    insertBefore(c, ref) { const i = ref ? this.children.indexOf(ref) : -1; if (i < 0) this.children.push(c); else this.children.splice(i, 0, c); return c; }
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
    dispatch(t, ev) { for (const f of this.listeners[t] || []) f(Object.assign({ type: t, preventDefault() {} }, ev || {})); }
    set innerHTML(x) { throw new Error('innerHTML utilisé : ' + String(x).slice(0, 40)); }
    set outerHTML(x) { throw new Error('outerHTML utilisé'); }
    insertAdjacentHTML() { throw new Error('insertAdjacentHTML utilisé'); }
    setAttribute(k, x) { this.attrs[k] = String(x); }
    tous(pred, sortie = []) { if (pred(this)) sortie.push(this); for (const c of this.children) c.tous(pred, sortie); return sortie; }
  }
  const sansScripts = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  const els = {};
  for (const m of sansScripts.matchAll(/<([a-z0-9]+)\b[^>]*\bid="([^"]+)"[^>]*>/gi)) { els[m[2]] = new El(m[1], m[2]); if (/\bhidden\b/.test(m[0])) els[m[2]].hidden = true; }
  const crees = [];
  const document = { getElementById: (id) => els[id] || null, createElement: (tag) => { crees.push(String(tag).toLowerCase()); return new El(tag); }, write() { throw new Error('document.write utilisé'); } };
  const location = { hash: '', origin: ouvrirUrl, pathname: '/' };
  const history = { replaceState() {} };
  return { els, crees, document, location, history, El };
}

(async () => {
  const og = await T.fauxOpGestion({ alice: { pass: 'pw-alice-1234', nom: 'Alice', actif: true }, bob: { pass: 'pw-bob-12345', nom: 'Bob', actif: true }, coupe: { pass: 'pw-coupe-123', nom: 'Coupé', actif: false }, dora: { pass: 'pw-dora-12345', nom: 'Dora', actif: true }, eve: { pass: 'pw-eve-123456', nom: 'Eve', actif: true }, fay: { pass: 'pw-fay-123456', nom: 'Fay', actif: true } });
  const svc = await T.lancerService({ urlGestion: og.url, horloge: true, config: { beta: { timeoutMs: 400 }, quotas: { msg: { max: 6, fenetreMs: 60000 }, saisie: { max: 1, fenetreMs: 2000 } }, balayageMs: 150 } });
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
      for (const f of ['app.js', 'routes.js', 'porte-beta.js', 'flux.js', 'index.js']) {
        const s = T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, f), 'utf8'));
        for (const m of s.matchAll(/refus\(res,\s*\d+,\s*'([a-z_]+)'/g)) codes.add(m[1]);
        for (const m of s.matchAll(/error:\s*'([a-z_]+)'/g)) codes.add(m[1]);
        for (const m of s.matchAll(/code:\s*'(trop_de_flux)'/g)) codes.add(m[1]);
      }
      vrai('population : plus de 25 codes recensés dans le code du service (' + codes.size + ')', codes.size > 25);
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

    console.log('\nLa page (ui.js) : les identifiants existent, aucun HTML n\'est interprété');
    {
      const html = fs.readFileSync(path.join(PUB, 'index.html'), 'utf8'), ui = fs.readFileSync(path.join(PUB, 'ui.js'), 'utf8');
      const ids = new Set(Array.from(html.matchAll(/\bid="([^"]+)"/g)).map(m => m[1]));
      const cherches = new Set([...Array.from(T.sansCommentaires(ui).matchAll(/\$\('([^']+)'\)/g)).map(m => m[1]), ...Array.from(T.sansCommentaires(ui).matchAll(/getElementById\('([^']+)'\)/g)).map(m => m[1])]);
      vrai('population : ui.js cherche plusieurs éléments (' + cherches.size + ') dans une page qui en porte ' + ids.size, cherches.size >= 15 && ids.size >= 15);
      v('⛔ chaque identifiant que ui.js cherche existe dans index.html (sinon la page meurt au chargement)', Array.from(cherches).filter(i => !ids.has(i)), []);
      const code = T.sansCommentaires(ui);
      v('⛔ ui.js n\'utilise ni innerHTML, ni outerHTML, ni insertAdjacentHTML, ni document.write, ni eval, ni new Function', /innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function\(/.test(code), false);
      v('index.html n\'a ni script en ligne, ni gestionnaire onclick/onerror en attribut', /<script(?![^>]*\bsrc=)[^>]*>|\son[a-z]+\s*=/i.test(html.replace(/<!--[\s\S]*?-->/g, '')), false);
      v('et aucun script ni feuille d\'un autre domaine', /(src|href)="https?:\/\//i.test(html), false);
    }

    console.log('\nLa VRAIE ui.js contre le VRAI service : du HTML injecté dans chaque champ s\'affiche tel quel, sans élément créé');
    {
      const PIEGE = '<img src=x onerror=alert(1)>', SCRIPT = '<script>window.piraté=1</script>', SVG = '<svg onload=alert(2)>';
      // Bob : un nom piégé, un groupe au nom piégé, un message piégé.
      const nb = T.navigateur(svc.base), cb = OPMSG.creer({ base: svc.base, fetch: nb.fetch, EventSource: nb.EventSource });
      await cb.connexionBeta('bob', 'pw-bob-12345');
      await cb.majMoi({ prenom: 'Bob' + PIEGE, nom: SCRIPT });
      const bob = await cb.moi();
      // Alice (via l'API) devient contact de Bob, puis la page d'Alice se connecte.
      const na = T.navigateur(svc.base), ca = OPMSG.creer({ base: svc.base, fetch: na.fetch });
      await ca.connexionBeta('alice', 'pw-alice-1234');
      const l = await cb.lienContact({}); await ca.accepterLien(l.code);
      const g = (await cb.groupe({ nom: 'Groupe ' + PIEGE + SVG, membres: [(await ca.moi()).id] })).conversation.id;
      const d = (await cb.directe((await ca.moi()).id)).conversation.id;
      await cb.envoyer(d, 'Salut ' + PIEGE + ' ' + SCRIPT);
      await cb.envoyer(g, SVG);
      await ca.deconnexion();

      // La page d'Alice : même navigateur de poche (cookie), DOM de poche.
      const nav2 = T.navigateur(svc.base);
      const dom = fauxDom(fs.readFileSync(path.join(PUB, 'index.html'), 'utf8'), svc.base);
      const fenetre = { OPMSG, location: dom.location };
      const run = new Function('window', 'document', 'location', 'history', 'fetch', 'EventSource', fs.readFileSync(path.join(PUB, 'ui.js'), 'utf8'));
      const f2 = (u, i) => nav2.fetch(u, i);
      globalThis.fetch = f2; globalThis.EventSource = nav2.EventSource;
      run(fenetre, dom.document, dom.location, dom.history, f2, nav2.EventSource);
      vrai('la page démarre sans session : l\'écran de connexion reste affiché, l\'application cachée', await T.attendre(() => dom.els.appli.hidden === true && dom.els.connexion.hidden === false, 3000));
      dom.els.login.value = 'alice'; dom.els.pass.value = 'pw-alice-1234';
      dom.els['f-connexion'].dispatch('submit');
      const ouverte = await T.attendre(() => dom.els.appli.hidden === false && dom.els.connexion.hidden === true, 5000);
      /* Un échec dit POURQUOI (règle du dépôt : une mesure qui échoue doit nommer ce qu'elle a vu). */
      if (!ouverte) console.log('    diagnostic : erreur affichée « ' + dom.els.erreur.textContent + ' », connexion.hidden=' + dom.els.connexion.hidden + ', appli.hidden=' + dom.els.appli.hidden);
      vrai('⛔ la connexion par le formulaire ouvre l\'application (la VRAIE page parle au VRAI service)', ouverte);
      const liste = await T.attendre(() => dom.els.liste.children.length >= 2 && dom.els.liste.textContent, 5000);
      vrai('la liste des conversations est dessinée (2 : la directe et le groupe)', !!liste);
      vrai('⛔ le nom piégé du groupe s\'affiche TEL QUEL (texte brut, caractères « < » compris)', dom.els.liste.textContent.includes('Groupe ' + PIEGE + SVG));
      vrai('⛔ le nom piégé de Bob s\'affiche tel quel dans la liste des contacts directs', dom.els.liste.textContent.includes('Bob' + PIEGE));
      vrai('⛔ l\'aperçu piégé du dernier message est du TEXTE', dom.els.liste.textContent.includes(SVG) || dom.els.liste.textContent.includes('Salut '));
      // ouvrir la directe : le clic sur le bouton de la ligne
      const boutons = dom.els.liste.tous(e => e.tagName === 'BUTTON');
      const ligneDirecte = boutons.find(b => b.textContent.includes('Bob'));
      ligneDirecte.dispatch('click');
      vrai('⛔ la conversation ouverte montre le message piégé en TEXTE', !!(await T.attendre(() => dom.els.fil.textContent.includes('Salut ' + PIEGE + ' ' + SCRIPT), 5000)));
      vrai('et son titre est le nom piégé, en texte', dom.els.titre.textContent.includes('Bob' + PIEGE));
      // envoi depuis la page, avec du HTML dans le texte
      dom.els.texte.value = '<b onmouseover=alert(3)>réponse</b>';
      dom.els['f-envoi'].dispatch('submit');
      vrai('⛔ le message envoyé par la page s\'affiche tel quel dans le fil', !!(await T.attendre(() => dom.els.fil.textContent.includes('<b onmouseover=alert(3)>réponse</b>'), 5000)));
      vrai('et il est bien arrivé chez Bob, tel quel (aller-retour par le service)', !!(await T.attendre(async () => (await cb.messages(d)).messages.some(m => m.texte === '<b onmouseover=alert(3)>réponse</b>'), 5000)));
      // réception en direct : Bob écrit, la page d'Alice le reçoit par le flux SSE
      await cb.envoyer(d, 'EN DIRECT ' + SVG);
      vrai('⛔ un message de Bob PARAÎT dans la page d\'Alice sans qu\'elle rafraîchisse (flux SSE réel), en texte', !!(await T.attendre(() => dom.els.fil.textContent.includes('EN DIRECT ' + SVG), 6000)));
      /* Relecture adverse, D7 : un texte de plus de 2 Ko n'est pas porté par l'événement `message_modifie` (`relis`) ; la page
         gardait « … » jusqu'au rechargement. Elle RELIT, comme pour un message neuf. */
      {
        const long1 = 'A'.repeat(2600), long2 = 'B'.repeat(2700);
        const e1 = await cb.envoyer(d, long1);
        vrai('un message de plus de 2 Ko paraît dans la page (relu, pas porté par l\'événement)', !!(await T.attendre(() => dom.els.fil.textContent.includes(long1), 6000)));
        await cb.modifier(d, e1.seq, long2);
        vrai('⛔ …et sa MODIFICATION aussi : la bulle montre le nouveau texte entier, pas « … »', !!(await T.attendre(() => dom.els.fil.textContent.includes(long2), 6000)));
        vrai('   l\'ancien texte n\'y est plus', !dom.els.fil.textContent.includes(long1));
      }
      /* Un éphémère qui EXPIRE disparaît du fil : il n'y devient pas « Message supprimé » (relecture adverse, D9). */
      {
        const contactId = (await cb.contacts())[0].id;
        const ge = (await cb.groupe({ nom: 'Fugace', membres: [contactId], ephemere_s: 86400 })).conversation.id;
        await T.attendre(() => dom.els.liste.textContent.includes('Fugace'), 5000);
        dom.els.liste.tous(e => e.tagName === 'BUTTON').find(b2 => b2.textContent.includes('Fugace')).dispatch('click');
        await T.attendre(() => dom.els.titre.textContent.includes('Fugace'), 5000);
        await cb.envoyer(ge, 'ce message va expirer');
        vrai('le message éphémère paraît dans le fil', !!(await T.attendre(() => dom.els.fil.textContent.includes('ce message va expirer'), 6000)));
        svc.avancer(86400000 + 120000);
        vrai('⛔ expiré, il DISPARAÎT du fil (le balayeur du service l\'a purgé, la page l\'a retiré)', !!(await T.attendre(() => !dom.els.fil.textContent.includes('ce message va expirer'), 8000)));
        v('⛔ …et la page n\'écrit pas « Message supprimé » à sa place', dom.els.fil.textContent.includes('Message supprimé'), false);
        svc.avancer(-(86400000 + 120000));
      }
      const crees = new Set(dom.crees);
      vrai('population : la page a créé des éléments (' + dom.crees.length + ')', dom.crees.length > 10);
      v('⛔ AUCUN élément img, script, svg, iframe, style, a ou b n\'a été créé : seuls div, span, li, button', Array.from(crees).filter(t => !['div', 'span', 'li', 'button'].includes(t)), []);
      v('⛔ le script injecté ne s\'est pas exécuté (window.piraté absent)', fenetre.piraté, undefined);
      // la saisie : une frappe de la page part en éphémère, jamais stockée
      dom.els.texte.value = 'en train…'; dom.els.texte.dispatch('input');
      await T.dort(150);
      v('une frappe ne crée aucun message (la saisie est éphémère)', (await cb.messages(d)).messages.filter(m => m.texte === 'en train…').length, 0);
      // déconnexion par le bouton
      dom.els['b-sortir'].dispatch('click');
      vrai('« Sortir » : la page revient à l\'écran de connexion', await T.attendre(() => dom.els.connexion.hidden === false && dom.els.appli.hidden === true, 4000));
      v('et la session est morte côté service (le cookie ne sert plus)', (await attrape(OPMSG.creer({ base: svc.base, fetch: nav2.fetch }).moi())).code, 'session_requise');
    }

    console.log('\nLe lien d\'invitation dans l\'adresse (#lien=…) : aperçu, acceptation, conversation ouverte');
    {
      const nb = T.navigateur(svc.base), cb = OPMSG.creer({ base: svc.base, fetch: nb.fetch, EventSource: nb.EventSource });
      await cb.connexionBeta('eve', 'pw-eve-123456');
      const lien = await cb.lienContact({ max: 1, jours: 1 });
      const nav3 = T.navigateur(svc.base);
      const dom = fauxDom(fs.readFileSync(path.join(PUB, 'index.html'), 'utf8'), svc.base);
      dom.location.hash = '#lien=' + lien.code;
      const run = new Function('window', 'document', 'location', 'history', 'fetch', 'EventSource', fs.readFileSync(path.join(PUB, 'ui.js'), 'utf8'));
      globalThis.fetch = (u, i) => nav3.fetch(u, i); globalThis.EventSource = nav3.EventSource;
      run({ OPMSG, location: dom.location }, dom.document, dom.location, dom.history, (u, i) => nav3.fetch(u, i), nav3.EventSource);
      await T.attendre(() => dom.els.connexion.hidden === false, 3000);
      dom.els.login.value = 'fay'; dom.els.pass.value = 'pw-fay-123456'; dom.els['f-connexion'].dispatch('submit');
      const prop = await T.attendre(() => dom.els['a-accepter'].hidden === false && dom.els['a-accepter'].children.length && dom.els['a-accepter'].children[0], 6000);
      vrai('⛔ le lien lu dans l\'adresse propose « Accepter l\'invitation de Eve » (aperçu, sans rien accepter encore)', prop && /Accepter l'invitation de Eve/.test(prop.textContent));
      v('population : rien n\'est encore accepté (Fay n\'a pas Eve en contact avant le clic)', (await OPMSG.creer({ base: svc.base, fetch: nav3.fetch }).contacts()).some(c => c.prenom === 'Eve'), false);
      prop.dispatch('click');
      vrai('⛔ le clic accepte : Eve devient un contact et la conversation s\'ouvre', !!(await T.attendre(async () => (await OPMSG.creer({ base: svc.base, fetch: nav3.fetch }).contacts()).some(c => c.prenom === 'Eve' && c.mutuel), 5000)) && !!(await T.attendre(() => dom.els.titre.textContent.includes('Eve'), 5000)));
      const nd = T.navigateur(svc.base), cdo = OPMSG.creer({ base: svc.base, fetch: nd.fetch });
      await cdo.connexionBeta('dora', 'pw-dora-12345');
      const e = await attrape(cdo.accepterLien(lien.code));
      v('le lien à usage unique est épuisé (410 lien_invalide, dit)', e && e.code, 'lien_invalide');
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

/* 3016 — LES GROUPES DE LA MESSAGERIE DES AGENTS SE PERSONNALISENT (25 octobre 2026) : nom, icône, couleur, description, choisis par Justin.
   Contrat posé à l'écran de la Tour (écrit ailleurs, contre ce contrat) :
     · GET /api/monitor/conversations : chaque fil de GROUPE porte `perso: { nom, icone, couleur, description }`, SEULEMENT s'il est personnalisé ;
     · POST /api/monitor/conversations/groupe : `{ fil, nom, icone, couleur, description }` → `{ ok:true, perso }` ; `{ fil, defaut:true }` → `{ ok:true, perso:null }` ;
       400 `{ error }` lisible, 403 hors patron, 503 si le registre est illisible (et la liste sert alors le défaut, sans `perso`).
   ⛔ SEUL L'AFFICHAGE CHANGE : l'identifiant (equipe, clients…), les @mentions (« @tous ») et `nom()` — que les agents lisent dans leurs consignes — restent ceux d'origine.
   Deux moitiés, qui ne se remplacent pas :
     A. le VRAI module (conversations.js + agents.js, un faux `app`) : chaque refus de validation, le 403, le registre illisible, un registre qui ne s'écrit pas, les valeurs
        hostiles, la relecture d'un fichier modifié à la main, le redémarrage, l'identifiant intact pour « @tous », le journal sans contenu ;
     B. le VRAI serveur (127.0.0.1, `banc-serveur-gestion.js`) : le branchement d'`index.js` — la garde du patron, le journal des gestes (cible = l'identifiant du groupe,
        jamais le nom choisi), le registre illisible au démarrage. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const vrai = (t, c, info) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (info !== undefined ? ' — ' + String(info).slice(0, 300) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), 'obtenu ' + JSON.stringify(a) + ' · attendu ' + JSON.stringify(b));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b3016-'));
process.on('exit', () => { try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} });
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); process.exit(1); }, 120000).unref();
const sans = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const AG = require(path.join(RACINE, 'server', 'agents.js'));
const CV = require(path.join(RACINE, 'server', 'conversations.js'));
const FICHIER = 'conversations-groupes.json';
let n = 0;

/* Un module monté pour de vrai sur un dossier de données jetable. `patron` pilote la fausse garde, comme `monPatronStrict` le fait en lisant la session. */
function monter(avant) {
  const D = path.join(banc, 'm' + (++n)); fs.mkdirSync(D, { recursive: true });
  const modes = {}; for (const a of AG.AGENTS) modes[a.id] = 'brouillon';
  fs.writeFileSync(path.join(D, 'agents-etat.json'), JSON.stringify({ pause: { actif: false, par: '', depuis: 0, motif: '' }, modes }));
  if (avant) avant(D);
  const routes = { get: {}, post: {} };
  const app = { get: (p, ...h) => { routes.get[p] = h; }, post: (p, ...h) => { routes.post[p] = h; } };
  const garde = (req, res, next) => req.patron ? next() : res.status(403).json({ error: 'Réservé au patron' });
  const agents = AG(app, { DATA_DIR: D, monAdmin: (req, res, next) => next(), monPatronStrict: garde, maintenant: () => 1.8e12 });
  const conv = CV(app, { DATA_DIR: D, monAdmin: (req, res, next) => next(), monPatronStrict: garde, agents, maintenant: () => 1.8e12, pousseNotif: () => Promise.resolve() });
  const appel = (methode, route, req) => {
    const r = { code: 200, corps: null, status(c) { r.code = c; return r; }, json(x) { r.corps = x; return r; } };
    const chaine = routes[methode][route]; if (!chaine) throw new Error('route absente : ' + route);
    req = Object.assign({ patron: true, body: {}, query: {}, params: {} }, req || {});
    let i = 0; const suite = () => { const h = chaine[i++]; if (h) h(req, r, suite); }; suite();
    return { code: r.code, corps: r.corps, req };
  };
  return { D, conv, agents, routes, appel,
    liste: () => appel('get', '/api/monitor/conversations', { query: { tous: '1' } }),
    groupe: (corps, req) => appel('post', '/api/monitor/conversations/groupe', Object.assign({ body: corps }, req || {})),
    fichier: () => { try { return fs.readFileSync(path.join(D, FICHIER), 'utf8'); } catch (e) { return null; } } };
}
const BON = { fil: 'clients', nom: 'Clients VIP', icone: '⭐', couleur: 'violet', description: 'Suivi des clients : rappels, devis & relances' };
const avec = (o) => Object.assign({}, BON, o);
const fil = (m, f) => m.liste().corps.fils.find(x => x.fil === f);

(async () => {
  console.log('\n1. Par défaut : aucun groupe n’est personnalisé');
  {
    const m = monter();
    const L = m.liste();
    egal('(population) la liste rend les quatre groupes et les seize agents', [L.corps.fils.filter(x => x.groupe).map(x => x.fil), L.corps.fils.filter(x => !x.groupe).length], [['equipe', 'clients', 'plateforme', 'reunions'], AG.AGENTS.length]);
    egal('aucun fil ne porte `perso` — la clé n’existe même pas', L.corps.fils.filter(x => 'perso' in x).length, 0);
    egal('les noms sont ceux d’origine', L.corps.fils.filter(x => x.groupe).map(x => x.nom), ['Équipe', 'Clients', 'Plateforme', 'Réunions']);
    egal('le registre n’est pas créé tant que personne n’y touche', m.fichier(), null);
  }

  console.log('\n2. Personnaliser un groupe : le contrat, au pied de la lettre');
  {
    const m = monter();
    const r = m.groupe(BON);
    egal('POST valide : 200 `{ ok:true, perso }` avec les quatre champs', [r.code, r.corps], [200, { ok: true, perso: { nom: 'Clients VIP', icone: '⭐', couleur: 'violet', description: 'Suivi des clients : rappels, devis & relances' } }]);
    const f = fil(m, 'clients');
    egal('la liste porte `perso` sur ce groupe', f.perso, r.corps.perso);
    egal('… seulement sur ce groupe : les trois autres et les agents n’en ont pas', m.liste().corps.fils.filter(x => x.fil !== 'clients' && 'perso' in x).length, 0);
    egal('⛔ l’identifiant, les membres et le meneur du groupe sont inchangés', [f.fil, f.groupe, f.membres.map(x => x.id).join(), f.meneur], ['clients', true, 'victor,lea,chloe,camille,hugo,margaux,emma', 'victor']);   // Victor, membre et meneur depuis le 28 octobre 2026
    egal('⛔ `nom` de la liste reste le nom d’origine (le choix voyage dans `perso`)', f.nom, 'Clients');
    egal('⛔ `nom()` — celui des consignes des agents — rend le nom d’origine', [m.conv.nom('clients'), m.conv.nom('equipe')], ['Clients', 'Équipe']);
    const dur = JSON.parse(m.fichier());
    egal('le registre est écrit : seule la clé du groupe', Object.keys(dur), ['clients']);
    egal('… sans fichier temporaire oublié', fs.existsSync(path.join(m.D, FICHIER + '.tmp')), false);
    const r2 = m.groupe(avec({ fil: 'plateforme', nom: 'Technique', icone: 'Tk', couleur: 'gris', description: '' }));
    egal('un second groupe : le premier reste', [r2.code, Object.keys(JSON.parse(m.fichier())).sort()], [200, ['clients', 'plateforme']]);
    egal('description vide acceptée, rendue ""', r2.corps.perso.description, '');
    egal('description absente acceptée, rendue ""', m.groupe({ fil: 'reunions', nom: 'Tours de table', icone: 'T', couleur: 'bleu' }).corps.perso.description, '');
    const m2 = monter(D => fs.copyFileSync(path.join(m.D, FICHIER), path.join(D, FICHIER)));
    egal('un REDÉMARRAGE (nouveau module sur le même dossier) relit le choix', fil(m2, 'clients').perso, r.corps.perso);
    const r3 = m.groupe({ fil: 'clients', defaut: true });
    egal('remise par défaut : 200 `{ ok:true, perso:null }`', [r3.code, r3.corps], [200, { ok: true, perso: null }]);
    egal('… le groupe redevient sans `perso`, les autres gardent le leur', [('perso' in fil(m, 'clients')), !!fil(m, 'plateforme').perso], [false, true]);
    egal('… et le registre ne porte plus la clé', Object.keys(JSON.parse(m.fichier())).sort(), ['plateforme', 'reunions']);
    egal('remettre par défaut un groupe qui l’est déjà : 200 sans histoire', m.groupe({ fil: 'equipe', defaut: true }).corps, { ok: true, perso: null });
    egal('un redémarrage après la remise relit le défaut', 'perso' in fil(monter(D => fs.copyFileSync(path.join(m.D, FICHIER), path.join(D, FICHIER))), 'clients'), false);
    egal('`defaut:"true"` (une chaîne) n’est PAS une remise par défaut : il faut un vrai booléen', m.groupe({ fil: 'plateforme', defaut: 'true' }).code, 400);
    egal('… et le groupe n’a pas bougé', !!fil(m, 'plateforme').perso, true);
  }

  console.log('\n3. Chaque refus de validation : 400, un message lisible, le registre ne bouge pas');
  {
    const m = monter();
    const refus = (titre, corps, motif) => {
      const avant = m.fichier(), r = m.groupe(corps);
      vrai(titre, r.code === 400 && r.corps && typeof r.corps.error === 'string' && /[a-zé]{4,}/.test(r.corps.error) && (!motif || motif.test(r.corps.error)) && m.fichier() === avant && !('perso' in fil(m, corps.fil === 'clients' ? 'clients' : 'equipe')), JSON.stringify([r.code, r.corps]));
    };
    const accepte = (titre, corps) => { const r = m.groupe(corps); vrai(titre, r.code === 200 && r.corps.ok === true, JSON.stringify(r.corps)); m.groupe({ fil: corps.fil || 'clients', defaut: true }); };
    console.log('  ── le groupe');
    for (const f of [undefined, '', 'lea', 'justin', 'tous', 'EQUIPE', 'equipe ', ['clients'], { a: 1 }, 5, null, '__proto__', 'constructor', 'hasOwnProperty', 'toString', 'prototype'])
      refus('fil ' + JSON.stringify(f) + ' : « Groupe inconnu »', avec({ fil: f }), /Groupe inconnu/);
    console.log('  ── le nom');
    refus('nom absent', { fil: 'clients', icone: '⭐', couleur: 'bleu' }, /nom/i);
    for (const x of ['', ' ', '   ']) refus('nom vide ' + JSON.stringify(x), avec({ nom: x }), /nom/i);
    for (const x of [123, ['Clients'], { a: 'Clients' }, true, null]) refus('nom qui n’est pas un texte ' + JSON.stringify(x), avec({ nom: x }));
    refus('nom de 41 caractères', avec({ nom: 'a'.repeat(41) }), /trop long/);
    accepte('nom de 40 caractères : accepté (la borne est incluse)', avec({ nom: 'a'.repeat(40) }));
    accepte('nom de 40 CARACTÈRES en lettres accentuées (40 ≠ 80 octets)', avec({ nom: 'é'.repeat(40) }));
    refus('nom de 41 lettres accentuées', avec({ nom: 'é'.repeat(41) }), /trop long/);
    for (const x of ['Justin', 'JUSTIN', 'Chez Justin', 'justin-club', 'Jüstin', 'JUSTÎN et co']) refus('⛔ nom avec « Justin » : ' + JSON.stringify(x), avec({ nom: x }), /Justin/);
    for (const x of ['écris à moi@exemple.fr', 'a@b.c', '@clients', 'contact@']) refus('nom avec une adresse : ' + JSON.stringify(x), avec({ nom: x }));
    for (const x of ['http://exemple.fr', 'https://x', 'www.exemple', 'exemple.fr', 'Clients.com', 'mailto:x', 'ftp://x', 'aide.Fr']) refus('nom avec un lien : ' + JSON.stringify(x), avec({ nom: x }), /lien|adresse|ponctuation/);
    for (const x of ['<img src=x onerror=alert(1)>', '<b>Clients</b>', 'Clients"', 'Clients`x`', '{{x}}', 'a\\b', 'a|b', '$(id)', 'a=b', 'Clients\nVIP', 'Clients\u0000', 'Clients​VIP', 'Clients‍VIP', 'Clients\tVIP', 'Clients‮VIP', '😀 Clients', 'Clients ⭐'])
      refus('nom avec un caractère interdit : ' + JSON.stringify(x), avec({ nom: x }));
    for (const x of ['!!!', '...', '()', '-', '😀']) refus('nom sans une lettre ni un chiffre : ' + JSON.stringify(x), avec({ nom: x }));
    for (const x of ['Clients & prospects', 'Suivi (VIP) : urgents !', 'L’équipe d’Éric', 'M. Dupont', 'Zone 51 – Nord', 'A/B + C', '24h', 'Éléonore']) accepte('nom simple accepté : ' + JSON.stringify(x), avec({ nom: x }));
    egal('le nom est remis d’équerre : espaces autour et doublés', m.groupe(avec({ nom: '  Clients    VIP  ' })).corps.perso.nom, 'Clients VIP');
    m.groupe({ fil: 'clients', defaut: true });
    console.log('  ── l’icône');
    refus('icône absente', { fil: 'clients', nom: 'Clients', couleur: 'bleu' }, /icône/);
    for (const x of ['', ' ', 'abc', 'abcde', '12', 'a1', '1a', '😀😀', '🔥🔥🔥🔥', '🙂x', 'x🙂', 'texte libre', '<b>', '<img', '@', '..', '##', 'é́', '​', '🙂​', '😀\n', 123, null, ['⭐'], { a: 1 }, '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '\u{1F600}'.repeat(2)])
      if (x !== '\u{1F600}') refus('icône refusée : ' + JSON.stringify(x), avec({ icone: x }), /icône|texte|caractère/);
    for (const x of ['⭐', '🙂', '👍🏽', '👨‍👩‍👧', '🇫🇷', '1️⃣', 'A', 'é', 'Cl', 'Éé', '☎️', '#']) accepte('icône acceptée : ' + JSON.stringify(x), avec({ icone: x }));
    console.log('  ── la couleur');
    refus('couleur absente', { fil: 'clients', nom: 'Clients', icone: '⭐' }, /couleur/i);
    for (const x of ['', 'rose', 'jaune', 'BLEU', 'Bleu', 'bleu ', ' bleu', '#ff0000', 'red', 'bleu;', 'bleu"><', ['bleu'], 3, null, { a: 'bleu' }]) refus('couleur refusée : ' + JSON.stringify(x), avec({ couleur: x }), /ouleur/);
    for (const c of CV.COULEURS) accepte('couleur acceptée : ' + c, avec({ couleur: c }));
    egal('les six couleurs du contrat, ni plus ni moins', CV.COULEURS, ['bleu', 'vert', 'orange', 'rouge', 'violet', 'gris']);
    console.log('  ── la description');
    refus('description de 121 caractères', avec({ description: 'a'.repeat(121) }), /trop longue/);
    accepte('description de 120 caractères : acceptée (borne incluse)', avec({ description: 'a'.repeat(120) }));
    accepte('description de 120 caractères accentués : acceptée', avec({ description: 'é'.repeat(120) }));
    refus('description de 121 caractères accentués', avec({ description: 'é'.repeat(121) }), /trop longue/);
    for (const x of [123, ['x'], { a: 1 }, true]) refus('description qui n’est pas un texte ' + JSON.stringify(x), avec({ description: x }));
    for (const x of ['https://exemple.fr/x', 'http://x', 'www.exemple', 'voir exemple.com', 'écris à moi@exemple.fr', 'a@b.c', 'mailto:x', 'sur aide.teamop.fr', 'x.FR']) refus('description avec un lien ou une adresse : ' + JSON.stringify(x), avec({ description: x }), /lien|adresse|ponctuation/);
    for (const x of ['<img src=x onerror=1>', '<script>alert(1)</script>', 'x"y', 'a`b', '{{7*7}}', 'a\\b', '$(id)', 'ligne1\nligne2', 'a\u0000b', 'a​b', '😀 content', 'a=b', '[x](y)']) refus('description avec un caractère interdit : ' + JSON.stringify(x), avec({ description: x }));
    accepte('description ordinaire acceptée', avec({ description: 'Suivi des clients : rappels, devis & relances (hors facturation) — 24 h/24 !' }));
    accepte('guillemets français, apostrophe typographique, €, … : acceptés', avec({ description: 'L’équipe « terrain » — 100 % réactive, dès 30 € …' }));
    console.log('  ── le corps');
    for (const x of [undefined, null, [], 'texte', 12]) { const r = m.groupe(x === undefined ? undefined : x); vrai('corps ' + JSON.stringify(x) + ' : 400', r.code === 400 && typeof r.corps.error === 'string', JSON.stringify([r.code, r.corps])); }
    vrai('(population) aucun de ces refus n’a laissé de groupe personnalisé', m.fichier() === null || Object.keys(JSON.parse(m.fichier())).length === 0, m.fichier());
  }

  console.log('\n4. Réservé au patron : 403, rien n’est écrit');
  {
    const m = monter();
    const r = m.groupe(BON, { patron: false });
    egal('un compte qui n’est pas le patron : 403, ni écriture ni changement', [r.code, m.fichier(), 'perso' in fil(m, 'clients')], [403, null, false]);
    m.groupe(BON);
    const r2 = m.groupe({ fil: 'clients', defaut: true }, { patron: false });
    egal('… même pour REMETTRE PAR DÉFAUT', [r2.code, !!fil(m, 'clients').perso], [403, true]);
    const r3 = m.groupe(avec({ nom: 'Pirate', icone: 'P' }), { patron: false });
    egal('… et pour changer un groupe déjà personnalisé', [r3.code, fil(m, 'clients').perso.nom], [403, 'Clients VIP']);
    const SRC = sans(fs.readFileSync(path.join(RACINE, 'server', 'conversations.js'), 'utf8'));
    vrai('la route est montée avec `monPatronStrict`, comme ses voisines (lecture du code, commentaires retirés)', /app\.post\('\/api\/monitor\/conversations\/groupe',\s*monPatronStrict\s*,/.test(SRC));
    egal('(population) toutes les routes POST de la messagerie portent `monPatronStrict`', [...SRC.matchAll(/app\.post\('\/api\/monitor\/conversations\/([a-z]+)',\s*([A-Za-z]+)/g)].map(x => x[1] + ':' + x[2]), ['envoyer:monPatronStrict', 'supprimer:monPatronStrict', 'lire:monPatronStrict', 'groupe:monPatronStrict']);   // + supprimer (28 octobre 2026, test-3088)
    const IDX = sans(fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8'));
    vrai('⛔ `index.js` donne au module le VRAI `monPatronStrict` (et pas `monAdmin` seul)', /require\('\.\/conversations'\)\(app, \{[^}]*monPatronStrict/.test(IDX));
  }

  console.log('\n5. Registre illisible : 503 à l’écriture, la liste sert le défaut, rien n’est écrasé');
  {
    for (const [nom, contenu] of [['du texte qui n’est pas du JSON', '{ pas du json'], ['une liste au lieu d’un objet', '[1,2]'], ['« null »', 'null']]) {
      const m = monter(D => fs.writeFileSync(path.join(D, FICHIER), contenu));
      const L = m.liste();
      egal('registre = ' + nom + ' : la liste répond quand même (200), sans aucun `perso`', [L.code, L.corps.fils.length > 0, L.corps.fils.filter(x => 'perso' in x).length], [200, true, 0]);
      const r = m.groupe(BON);
      egal('… POST : 503 `{ error }` lisible', [r.code, typeof r.corps.error, /illisible/.test(r.corps.error)], [503, 'string', true]);
      const d = m.groupe({ fil: 'clients', defaut: true });
      egal('… remise par défaut : 503 aussi', d.code, 503);
      egal('⛔ … le fichier illisible n’est PAS réécrit (le patron le répare, il ne l’écrase pas)', m.fichier(), contenu);
      egal('… une demande invalide reste un 400 (on ne dit pas « illisible » pour une faute de frappe)', m.groupe(avec({ couleur: 'rose' })).code, 400);
    }
    const m = monter(D => fs.writeFileSync(path.join(D, FICHIER), '{ pas du json'));
    egal('les fils et l’envoi ne dépendent pas de ce registre : un message part', m.appel('post', '/api/monitor/conversations/envoyer', { body: { fil: 'clients', texte: 'bonjour' } }).code, 200);

    /* un registre lisible mais qui ne peut pas s'écrire (un dossier à la place du temporaire) : 503, et l'état en mémoire n'a PAS bougé */
    const w = monter(D => fs.mkdirSync(path.join(D, FICHIER + '.tmp')));
    const r = w.groupe(BON);
    egal('écriture impossible : 503 `{ error }`', [r.code, typeof r.corps.error], [503, 'string']);
    egal('⛔ … et le groupe n’a PAS changé en mémoire (le choix n’est pas affiché s’il n’est pas gardé)', 'perso' in fil(w, 'clients'), false);
    fs.rmSync(path.join(w.D, FICHIER + '.tmp'), { recursive: true });
    egal('… le défaut se réécrit une fois le disque réparé', [w.groupe(BON).code, !!fil(w, 'clients').perso], [200, true]);
    fs.mkdirSync(path.join(w.D, FICHIER + '.tmp'));
    egal('⛔ remise par défaut qui ne peut pas s’écrire : 503 et le choix reste affiché', [w.groupe({ fil: 'clients', defaut: true }).code, !!fil(w, 'clients').perso], [503, true]);
  }

  console.log('\n6. Valeurs hostiles : rien n’entre, rien n’est pollué');
  {
    const m = monter();
    const proto = Object.prototype;
    const brut = JSON.parse('{"fil":"clients","nom":"Clients","icone":"C","couleur":"bleu","description":"","__proto__":{"nom":"Pirate","polluee":true},"constructor":{"prototype":{"polluee":true}}}');
    const r = m.groupe(brut);
    egal('un corps JSON porteur de `__proto__` et `constructor` : accepté sur ses seuls champs', [r.code, Object.keys(r.corps.perso).sort()], [200, ['couleur', 'description', 'icone', 'nom']]);
    egal('… `Object.prototype` n’est pas pollué', [({}).polluee, proto.polluee, Object.keys(proto).length], [undefined, undefined, 0]);
    egal('… le registre ne porte que `clients`, avec les quatre champs', JSON.parse(m.fichier()), { clients: { nom: 'Clients', icone: 'C', couleur: 'bleu', description: '' } });
    const r2 = m.groupe(avec({ fil: '__proto__' }));
    egal('`fil: "__proto__"` : 400', r2.code, 400);
    egal('… `Object.prototype` toujours intact', [({}).nom, ({}).perso], [undefined, undefined]);
    const r3 = m.groupe(avec({ nom: '__proto__', description: 'constructor' }));
    egal('`__proto__` COMME NOM n’est qu’un texte : accepté, rangé sur le groupe, rien d’autre n’en dépend', [r3.code, r3.corps.perso.nom, fil(m, 'clients').perso.nom, ({}).nom], [200, '__proto__', '__proto__', undefined]);
    m.groupe({ fil: 'clients', defaut: true });
    const h = m.groupe(avec({ nom: '<img src=x onerror=alert(1)>' }));
    egal('`<img …>` comme nom : refusé, et ni la liste ni le registre n’en portent trace', [h.code, JSON.stringify(m.liste().corps).includes('<img'), (m.fichier() || '').includes('img')], [400, false, false]);
    egal('… idem comme description', [m.groupe(avec({ description: '<img src=x onerror=alert(1)>' })).code, JSON.stringify(m.liste().corps).includes('<img')], [400, false]);
    egal('… idem comme icône', [m.groupe(avec({ icone: '<img>' })).code, JSON.stringify(m.liste().corps).includes('<img')], [400, false]);
    egal('… et comme groupe', [m.groupe(avec({ fil: '<img>' })).code, JSON.stringify(m.liste().corps).includes('<img')], [400, false]);

    /* un registre modifié À LA MAIN : ce que la route aurait refusé ne se sert pas */
    const D2 = monter(D => fs.writeFileSync(path.join(D, FICHIER), JSON.stringify({
      clients: { nom: '<img src=x onerror=1>', icone: '⭐', couleur: 'bleu', description: '' },
      plateforme: { nom: 'Technique', icone: 'Tk', couleur: 'rose', description: '' },
      reunions: { nom: 'Chez Justin', icone: '🙂', couleur: 'gris', description: '' },
      equipe: { nom: 'Bureau', icone: '🏢', couleur: 'vert', description: 'Le bureau', extra: 'x' },
      lea: { nom: 'Léa perso', icone: 'L', couleur: 'bleu', description: '' },
      zzz: { nom: 'Zzz', icone: 'Z', couleur: 'bleu', description: '' } })));
    const L = D2.liste().corps.fils;
    egal('relecture d’un fichier modifié à la main : seule l’entrée valide du groupe est servie', L.filter(x => 'perso' in x).map(x => x.fil + ':' + x.perso.nom), ['equipe:Bureau']);
    egal('… elle est ramenée à ses quatre champs (`extra` ne passe pas)', Object.keys(L.find(x => x.fil === 'equipe').perso).sort(), ['couleur', 'description', 'icone', 'nom']);
    egal('… ni un agent (`lea`) ni une clé inconnue ne reçoivent de `perso`', L.filter(x => ['lea', 'zzz'].includes(x.fil) && 'perso' in x).length, 0);
    D2.groupe(avec({ fil: 'plateforme', nom: 'Technique', couleur: 'gris' }));
    egal('⛔ la première écriture NETTOIE le registre : plus que des groupes valides', Object.keys(JSON.parse(D2.fichier())).sort(), ['equipe', 'plateforme']);
    egal('relecture d’un fichier avec `__proto__` pour clé : ignoré, rien pollué', (() => { const x = monter(D => fs.writeFileSync(path.join(D, FICHIER), '{"__proto__":{"nom":"Pirate","icone":"P","couleur":"bleu","description":""},"constructor":{"nom":"C","icone":"C","couleur":"bleu","description":""}}')); return [x.liste().corps.fils.filter(f => 'perso' in f).length, ({}).nom]; })(), [0, undefined]);
  }

  console.log('\n7. ⛔ Seul l’affichage change : @tous, les membres et les consignes des agents restent ceux d’origine');
  {
    const m = monter();
    m.groupe(avec({ fil: 'clients', nom: 'Équipe', icone: 'É', couleur: 'rouge' }));     // un nom qui IMITE un autre groupe, exprès
    m.groupe(avec({ fil: 'equipe', nom: 'Clients', icone: 'C', couleur: 'bleu' }));
    const tous = m.appel('post', '/api/monitor/conversations/envoyer', { body: { fil: 'clients', texte: '@tous un point, merci' } });
    egal('« @tous » dans le groupe renommé « Équipe » désigne toujours les membres de `clients`', tous.corps.mentions, ['victor', 'lea', 'chloe', 'camille', 'hugo', 'margaux', 'emma']);
    const eq = m.appel('post', '/api/monitor/conversations/envoyer', { body: { fil: 'equipe', texte: '@équipe bonjour' } });
    egal('« @équipe » dans le groupe renommé « Clients » désigne toujours tous les agents', eq.corps.mentions.length, AG.AGENTS.length);
    egal('… les mentions ne se lisent pas dans le nom choisi : « @Clients » ne cite personne', m.appel('post', '/api/monitor/conversations/envoyer', { body: { fil: 'equipe', texte: '@Clients et @Plateforme' } }).corps.mentions, []);
    egal('les identifiants servent toujours : le fil `clients` se lit, le nom choisi n’est pas un fil', [m.appel('get', '/api/monitor/conversations/:fil', { params: { fil: 'clients' } }).code, m.appel('get', '/api/monitor/conversations/:fil', { params: { fil: 'Équipe' } }).code], [200, 400]);
    const lecture = m.appel('get', '/api/monitor/conversations/:fil', { params: { fil: 'clients' } }).corps;
    egal('⛔ la lecture d’un fil garde le nom d’origine et ses membres', [lecture.nom, lecture.meneur, lecture.membres.length], ['Clients', 'victor', 7]);
    egal('les fonctions que les agents appellent n’ont pas bougé', [m.conv.nom('clients'), m.conv.nom('equipe'), m.conv.nom('plateforme'), m.conv.nom('reunions'), m.conv.meneur('clients'), m.conv.membres('plateforme').map(x => x.id).join(), m.conv.filValide('clients'), m.conv.filValide('Équipe')], ['Clients', 'Équipe', 'Plateforme', 'Réunions', 'victor', 'victor,max,jules,theo,nina,ines', true, false]);
    egal('un agent peut toujours parler dans son groupe, sous son identifiant', m.conv.parler('lea', 'clients', 'Bonjour, tout va bien.').ok, true);
    egal('… et le système écrit dans le fil par son identifiant', m.conv.systeme('clients', 'Camille a pris une tâche').ok, true);
    const SRC = sans(fs.readFileSync(path.join(RACINE, 'server', 'conversations.js'), 'utf8'));
    vrai('(code) `nomDuFil` ne lit pas le registre : il rend `NOMS_GROUPES` ou le prénom de l’agent', /const nomDuFil = f => NOMS_GROUPES\[f\] \|\| \(IDS\.get\(f\) \|\| f\);/.test(SRC));
    for (const f of ['agent-equipe.js', 'agent-victor.js', 'reunions.js', 'agent-conversation.js', 'agents-plateforme.js']) {
      const T = sans(fs.readFileSync(path.join(RACINE, 'server', f), 'utf8'));
      vrai('(code) ' + f + ' ne lit ni `perso` ni le registre des groupes', !/\bperso\b/.test(T) && !T.includes('conversations-groupes'));
    }
  }

  console.log('\n8. Le journal dit « groupe personnalisé », sans le contenu');
  {
    const m = monter();
    const r = m.groupe(avec({ nom: 'Secret Clients', description: 'Une description confidentielle' }));
    egal('la route marque la cible du journal des gestes : l’identifiant du groupe (jamais `nom`, qui passe en premier sinon)', r.req._gesteCible, 'clients');
    const J = m.appel('get', '/api/monitor/agents/journal', {});
    const e = J.corps.journal.find(x => x.action === 'groupe personnalisé');
    vrai('une ligne « groupe personnalisé » dans le journal des agents', !!e, JSON.stringify(J.corps.journal.map(x => x.action)));
    egal('… cible = l’identifiant du groupe, résultat ok', [e && e.cible, e && e.resultat], ['clients', 'ok']);
    const brut = JSON.stringify(J.corps);
    egal('⛔ … ni le nom ni la description choisis n’y sont', [brut.includes('Secret'), brut.includes('confidentielle')], [false, false]);
    const fichierJournal = fs.readdirSync(m.D).filter(f => /journal/.test(f)).map(f => fs.readFileSync(path.join(m.D, f), 'utf8')).join('');
    egal('… ni dans le fichier du journal sur disque', [fichierJournal.includes('Secret'), fichierJournal.includes('confidentielle')], [false, false]);
    m.groupe({ fil: 'clients', defaut: true });
    vrai('la remise par défaut est notée aussi', m.appel('get', '/api/monitor/agents/journal', {}).corps.journal.some(x => x.action === 'groupe remis par défaut' && x.cible === 'clients'));
    const avant = m.appel('get', '/api/monitor/agents/journal', {}).corps.journal.length;
    m.groupe(avec({ couleur: 'rose' })); m.groupe(BON, { patron: false });
    egal('un refus (400, 403) n’écrit rien au journal', m.appel('get', '/api/monitor/agents/journal', {}).corps.journal.length, avant);
    const IDX = sans(fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8'));
    vrai('la table des gestes de la Tour porte `conversations/groupe`', /'conversations\/groupe':\s*'a /.test(IDX));
  }

  console.log('\n9. Le VRAI serveur (127.0.0.1) : la garde, le journal des gestes, le registre illisible au démarrage');
  if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules', 'express'))) console.log('  (sauté : server/node_modules manque)');
  else {
    const { demarrer } = require('./banc-serveur-gestion.js');
    const S = await demarrer({});
    vrai('le serveur démarre', S.vivant, S.journal().slice(-400));
    if (S.vivant) {
      const R = '/api/monitor/conversations', G = R + '/groupe';
      const L0 = await S.get(R + '?tous=1');
      egal('(population) la liste du vrai serveur rend les groupes', [L0.s, L0.j.fils.filter(x => x.groupe).map(x => x.fil)], [200, ['equipe', 'clients', 'plateforme', 'reunions']]);
      egal('par défaut : aucun `perso`', L0.j.fils.filter(x => 'perso' in x).length, 0);
      egal('⛔ un collaborateur, un anonyme : 403, rien n’est écrit', [(await S.post(G, BON, S.TA)).s, (await S.post(G, BON, '')).s, fs.existsSync(path.join(S.D, FICHIER))], [403, 403, false]);
      const p = await S.post(G, BON);
      egal('le patron personnalise : 200 `{ ok:true, perso }`', [p.s, p.j.ok, p.j.perso && p.j.perso.nom], [200, true, 'Clients VIP']);
      const L1 = await S.get(R + '?tous=1');
      egal('… la liste du vrai serveur le porte, sur ce groupe seulement', L1.j.fils.filter(x => 'perso' in x).map(x => x.fil + ':' + x.perso.couleur), ['clients:violet']);
      egal('un refus du vrai serveur : 400 + message', [(await S.post(G, avec({ nom: 'Justin' }))).s, ((await S.post(G, avec({ couleur: 'rose' }))).j.error || '').length > 5], [400, true]);
      const J = (await S.get('/api/monitor/journal')).j;
      const g = (J.actions || []).filter(a => /groupe de la messagerie/.test(a.geste));
      egal('⛔ le journal des gestes de la Tour : UNE ligne (le succès), cible = `clients`', [g.length, g[0] && g[0].cible], [1, 'clients']);
      const brutJ = JSON.stringify(J);
      egal('⛔ … ni le nom, ni la description choisis n’y figurent', [brutJ.includes('Clients VIP'), brutJ.includes('rappels, devis')], [false, false]);
      const JA = (await S.get('/api/monitor/agents/journal')).j;
      vrai('le journal des agents porte « groupe personnalisé »', (JA.journal || []).some(e => e.action === 'groupe personnalisé' && e.cible === 'clients'), JSON.stringify(JA).slice(0, 200));
      const d = await S.post(G, { fil: 'clients', defaut: true });
      egal('remise par défaut : 200 `{ ok:true, perso:null }` et la liste est vierge', [d.s, d.j, (await S.get(R + '?tous=1')).j.fils.filter(x => 'perso' in x).length], [200, { ok: true, perso: null }, 0]);
      await S.post(G, avec({ fil: 'equipe', nom: 'Bureau', icone: '🏢', couleur: 'vert' }));
      egal('la liste par défaut (sans ?tous) porte aussi `perso`', ((await S.get(R)).j.fils.find(x => x.fil === 'equipe') || {}).perso, { nom: 'Bureau', icone: '🏢', couleur: 'vert', description: 'Suivi des clients : rappels, devis & relances' });
      await S.post(G, { fil: 'equipe', defaut: true });
      egal('(lecture d’un fil) `GET /conversations/clients` répond toujours', (await S.get(R + '/clients')).s, 200);
    }
    await S.fin();

    const T = await demarrer({ avant: D => fs.writeFileSync(path.join(D, FICHIER), '{ pas du json') });
    vrai('un serveur démarré sur un registre illisible démarre quand même', T.vivant, T.journal().slice(-400));
    if (T.vivant) {
      const L = await T.get('/api/monitor/conversations?tous=1');
      egal('⛔ registre illisible : la liste sert le défaut (200, sans `perso`)', [L.s, L.j.fils.length > 0, L.j.fils.filter(x => 'perso' in x).length], [200, true, 0]);
      const r = await T.post('/api/monitor/conversations/groupe', BON);
      egal('… POST : 503 `{ error }` lisible', [r.s, /illisible/.test(r.j.error || '')], [503, true]);
      egal('⛔ … le fichier n’est pas écrasé, et un refus n’entre pas au journal des gestes', [fs.readFileSync(path.join(T.D, FICHIER), 'utf8'), ((await T.get('/api/monitor/journal')).j.actions || []).filter(a => /groupe de la messagerie/.test(a.geste)).length], ['{ pas du json', 0]);
    }
    await T.fin();
  }

  console.log('\n══ test-3016 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); process.exit(1); });

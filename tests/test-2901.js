/* ⛔ CE QUE CE FICHIER GARDE — LA SIGNATURE EST CELLE DE L'AGENT, POSÉE PAR LE SERVEUR, ET « CONTRÔLE » N'EST PAS AUX AGENTS (23 octobre 2026).
     Justin : « C'est hyper contradictoire de mettre Justin si c'est un agent qui répond. La signature, c'est le nom de l'agent. Assistante, Léa par exemple. Équipe TeamOP. »
     et « Contrôle, ils ne l'utilisent pas. » Règlement européen sur l'IA, article 50 : on dit à la personne qu'elle échange avec une IA.
       0. `agents-signature.js` : « Léa — Assistante de TeamOP » + l'adresse de la boîte + le site + la mention de l'IA ; « Assistant de TeamOP » pour Louis ; jamais
          « Justin » ni « virtuel » (Justin, 25 octobre 2026) — la mention de l'IA (art. 50) est une LIGNE posée sous chaque signature, que le rôle ne retire pas ;
          la formule se règle depuis la Tour (le patron seul), bornée : des lettres, ni adresse, ni lien, ni chiffre, ni « Justin » ; un registre illisible n'est pas écrasé ;
       1. les brouillons : l'aperçu montre la signature DE L'AGENT pour la boîte qui envoie, le texte rangé n'en porte pas, l'envoi la fournit à `mail.envoyerAgent` avec le nom d'expéditeur ;
       2. `mail.js` SEUL : l'envoi d'un agent EXIGE une signature (sans elle rien ne part), l'ajoute UNE fois, jamais celle du Courrier de Justin ; `controle@` n'est ni lue, ni choisie,
          ni utilisée pour envoyer (même nommée par son identifiant, même en dernier recours) ; le Message-ID de l'envoi est connu et rendu. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const RACINE = path.join(__dirname, '..');
const { monter, signatureDe, COURRIEL_TOKA } = require('./banc-agents-courrier.js');
const SIG = require(path.join(RACINE, 'server', 'agents-signature.js'));
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 200) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 90 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 90000).unref();

(async () => {
  console.log('\n── 2901 · La signature de l’agent, et la boîte « contrôle » ──');

  console.log('\n0. Le module de signature');
  {
    const Z = monter({ modes: { lea: 'brouillon' } });
    const S = SIG(Z.routes ? { get: (p, ...h) => { Z.routes['GET ' + p] = h; }, post: (p, ...h) => { Z.routes['POST ' + p] = h; } } : null, { agents: Z.agents, monAdmin: (rq, rs, n) => (rq.tourUser ? n() : rs.status(401).json({})), monPatronStrict: (rq, rs, n) => (rq.tourUser && rq.tourUser.role === 'patron' ? n() : rs.status(403).json({})), fichier: Z.fichier });
    v('Léa : prénom, rôle féminin, équipe, adresse de la boîte, site, et la demande d’enregistrer cette adresse', S.composer('lea', 'contact@teamop.fr'), signatureDe('Léa'));
    v('Chloé et Camille : « Assistante de TeamOP » aussi, la boîte de support pour Camille', [S.composer('chloe', 'contact@teamop.fr').split('\n')[0], S.composer('camille', 'support@teamop.fr')], ['Chloé — Assistante de TeamOP', signatureDe('Camille', '', 'support@teamop.fr')]);
    v('Louis, Hugo, Max : « Assistant de TeamOP » (le masculin)', ['louis', 'hugo', 'max'].map(a => S.composer(a, 'contact@teamop.fr').split('\n')[0].split(' — ')[1]), ['Assistant de TeamOP', 'Assistant de TeamOP', 'Assistant de TeamOP']);
    vrai('(population) seize agents, seize signatures, aucune ne dit « Justin » ni « virtuel », TOUTES finissent par la mention de l’IA', Z.agents.AGENTS.length === 16 && Z.agents.AGENTS.every(a => { const s = S.composer(a.id, 'contact@teamop.fr'); return !/justin/i.test(s) && !/virtuel/i.test(s) && s.startsWith(a.nom + ' — ') && s.endsWith('\n' + SIG.MENTION_IA); }));
    v('la mention de l’IA, mot pour mot', SIG.MENTION_IA, 'Message préparé par un assistant automatique de TeamOP.');
    v('un agent inconnu : rien (l’appelant refuse d’envoyer)', S.composer('personne', 'contact@teamop.fr'), '');
    /* ⛔ Justin, 23 octobre 2026 (« dis-le aux agents qui gèrent les mails ») : les trois agents du COURRIER demandent qu'on enregistre l'adresse qui envoie ; les autres non. */
    const DEMANDE = /\nPour recevoir nos messages sans faute, ajoutez ([^ ]+) à vos contacts\.\n/;
    const COURRIER = [...SIG.AGENTS_COURRIER];   // la liste du CODE : un agent ajouté au Courrier sans décision fait tomber le contrôle suivant
    v('(décision de Justin) les agents du Courrier qui portent la demande : Léa, Camille et Chloé, et eux seuls', COURRIER.slice().sort(), ['camille', 'chloe', 'lea']);
    v('⛔ Léa, Camille et Chloé demandent d’enregistrer l’adresse de la boîte qui ENVOIE (la dernière ligne de leur signature)',
      ['lea', 'camille', 'chloe'].map(a => (DEMANDE.exec(S.composer(a, a === 'camille' ? 'support@teamop.fr' : 'contact@teamop.fr')) || [])[1]), ['contact@teamop.fr', 'support@teamop.fr', 'contact@teamop.fr']);
    v('⛔ les treize autres ne la portent pas (une fin d’abonnement, une mise en demeure n’invitent pas à se faire enregistrer)',
      Z.agents.AGENTS.filter(a => !COURRIER.includes(a.id) && DEMANDE.test(S.composer(a.id, 'contact@teamop.fr'))).map(a => a.id), []);
    v('(population) treize autres agents examinés', Z.agents.AGENTS.filter(a => !COURRIER.includes(a.id)).length, 13);
    v('une adresse de boîte invalide ou absente : contact@teamop.fr (jamais une adresse écrite par un agent)', [S.composer('lea', 'pas une adresse'), S.composer('lea')], [signatureDe('Léa'), signatureDe('Léa')]);

    const ecrit = (corps, qui) => Z.appeler('POST /api/monitor/agents/signatures', { tourUser: qui === undefined ? Z.PATRON : qui, body: corps });
    v('⛔ LIRE : un collaborateur le peut, un anonyme non', [(await Z.appeler('GET /api/monitor/agents/signatures', { tourUser: Z.COLLAB })).status, (await Z.appeler('GET /api/monitor/agents/signatures', { tourUser: null })).status], [200, 401]);
    v('⛔ ÉCRIRE : un collaborateur est refusé (403), un anonyme aussi, rien ne bouge', [(await ecrit({ agent: 'lea', role: 'Conseillère' }, Z.COLLAB)).status, (await ecrit({ agent: 'lea', role: 'Conseillère' }, null)).status, S.composer('lea').includes('Conseillère')], [403, 403, false]);
    const r = await ecrit({ agent: 'lea', role: 'Assistante commerciale' });
    v('le patron règle la formule de Léa : 200, la signature change (le rôle ne nomme pas TeamOP : l’équipe suit), le fichier la garde, la mention de l’IA reste', [r.status, S.composer('lea', 'contact@teamop.fr').split('\n')[0], JSON.parse(fs.readFileSync(path.join(Z.D, 'agents-signatures.json'), 'utf8')).roles.lea, S.composer('lea', 'contact@teamop.fr').endsWith(SIG.MENTION_IA)], [200, 'Léa — Assistante commerciale — Équipe TeamOP', 'Assistante commerciale', true]);
    v('…celle de Camille n’a pas bougé', S.composer('camille', 'contact@teamop.fr').split('\n')[0], 'Camille — Assistante de TeamOP');
    v('le patron règle le nom de l’équipe : il suit un rôle qui ne nomme pas TeamOP, pas « Assistante de TeamOP » (qui ne se répète pas)', [(await ecrit({ equipe: 'Équipe TeamOP Clients' })).status, S.composer('lea', 'contact@teamop.fr').split('\n')[0], S.composer('camille', 'contact@teamop.fr').split('\n')[0]], [200, 'Léa — Assistante commerciale — Équipe TeamOP Clients', 'Camille — Assistante de TeamOP']);
    for (const [nom, corps] of [['« Justin » dans le rôle', { agent: 'lea', role: 'Assistante de Justin' }], ['« justin » dans l’équipe', { equipe: 'Équipe de justin' }], ['une adresse', { agent: 'lea', role: 'Assistante a@b.fr' }],
      ['un lien', { agent: 'lea', role: 'Assistante teamop.fr/x' }], ['un chiffre', { agent: 'lea', role: 'Assistante 24h' }], ['un rôle d’un caractère', { agent: 'lea', role: 'A' }],
      ['un rôle de 61 caractères', { agent: 'lea', role: 'A'.repeat(61) }], ['un agent inconnu', { agent: 'personne', role: 'Assistante de TeamOP' }], ['un rôle qui n’est pas un texte', { agent: 'lea', role: 42 }], ['un agent sans rôle', { agent: 'lea' }]]) {
      const avant = fs.readFileSync(path.join(Z.D, 'agents-signatures.json'), 'utf8');
      const x = await ecrit(corps);
      vrai('⛔ ' + nom + ' : 400, rien n’est écrit', x.status === 400 && fs.readFileSync(path.join(Z.D, 'agents-signatures.json'), 'utf8') === avant, x.status + ' ' + JSON.stringify(x.corps));
    }
    /* ⛔ « virtuel » n'entre plus dans un rôle (Justin, 25 octobre 2026) ; la mention de l'IA n'en dépend plus : un rôle « Directrice commerciale » la garde (relecture du
       23 octobre 2026 : c'est ce rôle qui la retirait quand elle vivait DANS le rôle). */
    for (const role of ['Assistante virtuelle', 'Conseillère virtuelle', 'Assistant Virtuel']) {
      const avant = fs.readFileSync(path.join(Z.D, 'agents-signatures.json'), 'utf8');
      const x = await ecrit({ agent: 'lea', role });
      vrai('⛔ le rôle « ' + role + ' » : 400 (plus de « virtuel »), rien n’est écrit', x.status === 400 && /virtuel/.test(x.corps.error || '') && fs.readFileSync(path.join(Z.D, 'agents-signatures.json'), 'utf8') === avant, x.status + ' ' + JSON.stringify(x.corps));
    }
    for (const role of ['Directrice commerciale', 'Conseillère clientèle', 'Assistante de TeamOP']) {
      const x = await ecrit({ agent: 'lea', role });
      v('(contre-épreuve) le rôle « ' + role + ' » est accepté, et la signature finit TOUJOURS par la mention de l’IA', [x.status, S.composer('lea', 'contact@teamop.fr').split('\n')[0].includes(role), S.composer('lea', 'contact@teamop.fr').endsWith('\n' + SIG.MENTION_IA)], [200, true, true]);
    }
    {
      const x = await ecrit({ agent: 'lea', role: 'Assistante\nde TeamOP' });
      vrai('un saut de ligne dans le rôle est ramené à une espace : la signature reste sur UNE ligne', x.status === 200 && S.composer('lea', 'contact@teamop.fr').split('\n')[0] === 'Léa — Assistante de TeamOP', S.composer('lea', 'contact@teamop.fr'));
    }
    vrai('…le journal note le geste (qui, quoi — sans le texte de la formule)', Z.journal().some(e => e.agent === 'systeme' && e.action === 'signature des agents modifiée' && e.qui === 'Justin'));
    const g = (await Z.appeler('GET /api/monitor/agents/signatures', { tourUser: Z.COLLAB })).corps;
    vrai('LIRE rend les seize agents, avec la valeur par défaut et un aperçu', g.agents.length === 16 && g.agents.every(a => a.defaut && a.apercu && a.role) && g.site === 'teamop.fr' && g.agents.find(a => a.agent === 'lea').defaut === 'Assistante de TeamOP');
    Z.nettoyer();

    const I = monter({ modes: { lea: 'brouillon' }, avant: D => fs.writeFileSync(path.join(D, 'agents-signatures.json'), '{pas du json') });
    const SI = SIG({ get: (p, ...h) => { I.routes['GET ' + p] = h; }, post: (p, ...h) => { I.routes['POST ' + p] = h; } }, { agents: I.agents, monAdmin: (rq, rs, n) => n(), monPatronStrict: (rq, rs, n) => n(), fichier: I.fichier });
    v('registre illisible : la signature par défaut sert (une signature ne manque jamais)', SI.composer('lea', 'contact@teamop.fr').split('\n')[0], 'Léa — Assistante de TeamOP');
    const w = await I.appeler('POST /api/monitor/agents/signatures', { tourUser: I.PATRON, body: { agent: 'lea', role: 'Assistante senior' } });
    v('⛔ …et l’écriture dit 503 sans écraser le fichier', [w.status, fs.readFileSync(path.join(I.D, 'agents-signatures.json'), 'utf8')], [503, '{pas du json']);
    I.nettoyer();
    {
      const J = monter({ modes: { lea: 'brouillon' }, avant: D => fs.writeFileSync(path.join(D, 'agents-signatures.json'), JSON.stringify({ roles: { lea: 'Assistante virtuelle', camille: 'Assistante IA' }, equipe: 'Équipe TeamOP' })) });
      const SJ = SIG({ get() {}, post() {} }, { agents: J.agents, monAdmin: (rq, rs, n) => n(), monPatronStrict: (rq, rs, n) => n(), fichier: J.fichier });
      v('⛔ un rôle RANGÉ avec « virtuelle » (le défaut d’avant le 25 octobre 2026) retombe sur le nouveau défaut ; un autre rôle est gardé', [SJ.composer('lea', 'contact@teamop.fr').split('\n')[0], SJ.composer('camille', 'contact@teamop.fr').split('\n')[0]], ['Léa — Assistante de TeamOP', 'Camille — Assistante IA — Équipe TeamOP']);
      J.nettoyer();
    }
    const src = fs.readFileSync(path.join(RACINE, 'server', 'agents-signature.js'), 'utf8').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
    vrai('les deux routes sont déclarées EN ENTIER, la lecture par monAdmin, l’écriture par monPatronStrict', /app\.get\('\/api\/monitor\/agents\/signatures', monAdmin/.test(src) && /app\.post\('\/api\/monitor\/agents\/signatures', monPatronStrict/.test(src));
    const idx = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
    vrai('…et l’écriture est un geste journalisé de la Tour (MON_GESTES)', /'agents\/signatures': '[^']{10,}'/.test(idx));
  }

  console.log('\n1. Les brouillons : la signature de l’agent, jamais celle du Courrier');
  {
    const Z = monter({ modes: { lea: 'brouillon', camille: 'brouillon' } });
    const r = await Z.lea.surInscription({ entreprise: 'Toka Clim', email: 'sig1@client-2901.fr' });
    const ap = (await Z.appeler('GET /api/monitor/agents/brouillons', { tourUser: Z.PATRON, query: { refs: r.ref } })).corps[r.ref];
    v('l’aperçu montre la signature de LÉA pour la boîte « contact »', ap.signature, signatureDe('Léa'));
    vrai('⛔ le texte rangé ne porte aucune signature (le serveur l’ajoute à l’envoi)', !/Assistante virtuelle|Assistante de TeamOP|assistant automatique|Justin|Équipe TeamOP/.test(Z.fichierJson('agents-brouillons.json')[r.ref].texte));
    vrai('…et ce n’est PAS celle du Courrier de Justin', ap.signature !== Z.mail.signature() && !/Justin Dupont/.test(ap.signature));
    const vl = (await Z.validations())[0];
    await Z.appeler('POST /api/monitor/agents/validations/decider', { tourUser: Z.PATRON, body: { id: vl.id, decision: 'accepter', empreinte: ap.empreinte } });
    const e = Z.envoyes[0];
    v('⛔ l’envoi FOURNIT à la messagerie la signature de l’agent et son nom d’expéditeur', [e.signature, e.deNom], [signatureDe('Léa'), 'Léa — TeamOP']);

    Z.messages['b-support|INBOX|3'] = { uid: 3, dossier: 'INBOX', boite: 'b-support', mid: '<s3@banc-2901>', de: 'client@exemple-2901.fr', pour: 'support@teamop.fr', objet: 'Question', texte: 'Que proposez-vous pour une entreprise de nettoyage ?', ts: Z.horloge.t - 1000, auto: false, protege: false };
    const rc = await Z.camille.surNouveauMessage({ boiteId: 'b-support', dossier: 'INBOX', uid: 3 });
    const apc = (await Z.appeler('GET /api/monitor/agents/brouillons', { tourUser: Z.PATRON, query: { refs: rc.ref } })).corps[rc.ref];
    v('Camille, sur une réponse partie de support@ : sa propre signature, avec l’adresse de SUPPORT', apc.signature, signatureDe('Camille', '', 'support@teamop.fr'));
    Z.nettoyer();
  }

  console.log('\n2. mail.js SEUL : l’envoi d’un agent exige sa signature ; controle@ n’est jamais à eux');
  {
    const { facteur } = require('./banc-serveur-courrier.js');
    const f = facteur();
    const port = await new Promise(res => f.s.listen(0, '127.0.0.1', () => res(f.s.address().port)));
    const D = fs.mkdtempSync(path.join(os.tmpdir(), 'bmail2901-'));
    const boite = (id, email) => ({ id, email, pass: 'x', imapHost: '127.0.0.1', imapPort: 1, smtpHost: '127.0.0.1', smtpPort: port, nom: 'TEAM OP', ts: Date.now(), par: 'banc' });
    const faireMail = (boites) => {
      fs.writeFileSync(path.join(D, 'mail-boites.json'), JSON.stringify(boites));
      const routes = {}, app = { use() {} };
      for (const m of ['get', 'post', 'put', 'delete', 'patch']) app[m] = (p, ...h) => { routes[m.toUpperCase() + ' ' + p] = h; };
      const quotaOk = (map, cle, max, fen) => { const q = map.get(cle) || { n: 0, reset: Date.now() + fen }; if (Date.now() > q.reset) { q.n = 0; q.reset = Date.now() + fen; } q.n++; map.set(cle, q); return q.n <= max; };
      const passe = (q, r, n) => n();
      return require(path.join(RACINE, 'server', 'mail.js'))(app, { DATA_DIR: D, monAdmin: passe, monPatronStrict: passe, monStr: (x, n) => String(x == null ? '' : x).slice(0, n), pousseNotif: async () => 0, quotaOk, jsonGros: passe });
    };
    const m = faireMail([boite('b-ctrl', 'controle@banc-2901.fr'), boite('b-contact', 'contact@banc-2901.fr'), boite('b-supp', 'support@banc-2901.fr')]);
    const refus = async o => m.envoyerAgent(o).then(() => 'parti', e => e.message);
    const base = { boiteId: 'b-contact', a: 'dest@exemple-2901.fr', objet: 'Bonjour', texte: 'Texte du courriel.' };
    v('⛔ SANS signature, rien ne part (un agent ne signe jamais « à la place de Justin »)', [await refus(base), await refus(Object.assign({}, base, { signature: '  ' })), f.recus.length], ['signature de l’agent absente : rien ne part', 'signature de l’agent absente : rien ne part', 0]);
    const SIGL = signatureDe('Léa');
    const r1 = await m.envoyerAgent(Object.assign({}, base, { signature: SIGL, deNom: 'Léa — TeamOP' }));
    vrai('avec sa signature : le courriel part ; le Message-ID est connu AVANT l’envoi et rendu', r1.copieOk !== undefined && /^<[0-9a-f]{24}@banc-2901\.fr>$/.test(r1.messageId), JSON.stringify(r1));
    const { simpleParser } = require(path.join(RACINE, 'server', 'node_modules', 'mailparser'));
    const l1 = await simpleParser(f.recus[0]);
    v('…le texte, puis la signature de l’agent UNE fois ; jamais celle du Courrier', [String(l1.text).trim(), (String(l1.text).match(/assistant automatique de TeamOP/g) || []).length], ['Texte du courriel.\n\n' + SIGL, 1]);
    v('…l’expéditeur affiché est « Léa — TeamOP », depuis la boîte de contact, avec le Message-ID annoncé', [l1.from.value[0].name, l1.from.value[0].address, l1.messageId], ['Léa — TeamOP', 'contact@banc-2901.fr', r1.messageId]);
    await m.envoyerAgent(Object.assign({}, base, { texte: 'Texte déjà signé.\n\n' + SIGL, signature: SIGL }));
    const l2 = await simpleParser(f.recus[1]);
    v('un texte déjà signé (un envoi repris) n’est pas signé deux fois', (String(l2.text).match(/assistant automatique de TeamOP/g) || []).length, 1);
    const inj = await m.envoyerAgent(Object.assign({}, base, { signature: SIGL, deNom: 'Faux "Nom" <x@y.z>\r\nBcc: z@z.z' }));
    const l3 = await simpleParser(f.recus[2]);
    vrai('⛔ un nom d’expéditeur avec guillemets, chevrons ou saut de ligne ne fabrique ni en-tête ni adresse', !/^Bcc:/mi.test(f.recus[2].split('\n\n')[0]) && l3.from.value.length === 1 && l3.from.value[0].address === 'contact@banc-2901.fr', f.recus[2].split('\n\n')[0].slice(0, 300));
    void inj;

    v('⛔ controle@ nommée par son identifiant : refusée', await refus(Object.assign({}, base, { boiteId: 'b-ctrl', signature: SIGL })), 'boîte réservée : les agents ne l’utilisent pas');
    v('⛔ boiteParRole choisit contact@ et support@, jamais controle@ (qui est pourtant la PREMIÈRE boîte connectée)', [m.boiteParRole('contact'), m.boiteParRole('support')], ['b-contact', 'b-supp']);
    v('⛔ …ni en dernier recours : un rôle inconnu retombe sur contact@, pas sur controle@', m.boiteParRole('direction'), 'b-contact');
    const seule = faireMail([boite('b-ctrl', 'controle@banc-2901.fr')]);
    v('⛔ si controle@ est la SEULE boîte connectée : aucune boîte (null), jamais elle', [seule.boiteParRole('contact'), seule.boiteParRole('support')], [null, null]);
    v('⛔ la lecture d’un message de controle@ par un agent : null (même sans réseau, elle n’est pas tentée)', [await seule.lireMessage('b-ctrl', 'INBOX', 1), await m.lireMessage('b-ctrl', 'INBOX', 1)], [null, null]);
    v('(population) la réponse de boites() porte toujours les trois boîtes pour la Tour (rien n’est caché à Justin)', m.boites().map(b => b.id), ['b-ctrl', 'b-contact', 'b-supp']);

    /* ⛔ UNE LISTE D'AUTORISATION, PAS D'EXCLUSION (relecture du 23 octobre 2026) : seules contact@ et support@ sont ouvertes aux agents. */
    const AUTRES = ['controle+x@banc-2901.fr', 'contrôle@banc-2901.fr', 'ctrl@banc-2901.fr', 'compta@banc-2901.fr', 'justin@banc-2901.fr', 'ancien-contact@banc-2901.fr', 'contact.perso@gmail.com', 'xcontact@banc-2901.fr'];
    const mx = faireMail(AUTRES.map((e, i) => boite('b-x' + i, e)).concat([boite('b-contact', 'contact@banc-2901.fr')]));
    const refusX = await Promise.all(AUTRES.map((e, i) => mx.envoyerAgent(Object.assign({}, base, { boiteId: 'b-x' + i, signature: SIGL })).then(() => 'parti', er => er.message)));
    v('⛔ une boîte qui n’est NI contact@ NI support@ (controle+x@, contrôle@, ctrl@, compta@, perso, un webmail…) : envoi refusé, même nommée par son identifiant', refusX, AUTRES.map(() => 'boîte réservée : les agents ne l’utilisent pas'));
    v('⛔ …lecture refusée (null) pour chacune', await Promise.all(AUTRES.map((e, i) => mx.lireMessage('b-x' + i, 'INBOX', 1))), AUTRES.map(() => null));
    v('⛔ …et boiteParRole ne les rend JAMAIS : seule contact@ est choisie, pour les deux rôles', [mx.boiteParRole('contact'), mx.boiteParRole('support'), mx.boiteParRole('direction')], ['b-contact', 'b-contact', 'b-contact']);
    const sansLes2 = faireMail(AUTRES.map((e, i) => boite('b-x' + i, e)));
    v('⛔ …et SANS contact@ ni support@ connectée : aucune boîte (null) — jamais « la première boîte venue » comme expéditeur et signature', [sansLes2.boiteParRole('contact'), sansLes2.boiteParRole('support')], [null, null]);
    v('(contre-épreuve) support@ et CONTACT@ en majuscules sont ouvertes', [faireMail([boite('b-S', 'SUPPORT@banc-2901.fr')]).boiteParRole('support'), faireMail([boite('b-C', 'Contact@banc-2901.fr')]).boiteParRole('contact')], ['b-S', 'b-C']);
    v('…la Tour voit toutes les boîtes (rien n’est caché à Justin)', mx.boites().length, AUTRES.length + 1);

    /* ⛔ Un courriel d'AGENT se déclare automatique (RFC 3834) : un robot d'un tiers ne lui répond pas. */
    const nb = f.recus.length;
    await m.envoyerAgent(Object.assign({}, base, { signature: SIGL, enReponseA: { mid: '<orig@exemple-2901.fr>' } }));
    await m.envoyerAgent(Object.assign({}, base, { signature: SIGL }));
    const [lr, lg] = [await simpleParser(f.recus[nb]), await simpleParser(f.recus[nb + 1])];
    v('⛔ une RÉPONSE d’agent porte « Auto-Submitted: auto-replied » ; un premier courriel (Léa) « auto-generated »', [lr.headers.get('auto-submitted'), lg.headers.get('auto-submitted')], ['auto-replied', 'auto-generated']);
    v('…et la réponse reste rattachée au message d’origine (In-Reply-To)', lr.inReplyTo, '<orig@exemple-2901.fr>');
    const src = fs.readFileSync(path.join(RACINE, 'server', 'mail.js'), 'utf8').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
    vrai('la veille n’annonce RIEN aux agents pour une boîte exclue (code : surNouveauMessage && boiteAgentOk(b))', /if \(surNouveauMessage && boiteAgentOk\(b\)\) for \(const m of vrais\)/.test(src));
    f.s.close();
    try { fs.rmSync(D, { recursive: true, force: true }); } catch (e) {}
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });

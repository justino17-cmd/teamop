/* ⛔ CE QUE CE FICHIER GARDE — LA COUTURE ENTIÈRE DE L'AUTONOMIE COMMERCIALE, SUR LE VRAI SERVEUR (23 octobre 2026, cahier §3, §4, §9).
     Les bancs 2900 à 2907 montent les modules ; ils ne voient pas ce qu'`index.js` branche ni ce que `mail.js` lit dans un VRAI en-tête. Ici : le vrai `server/index.js`, une fausse boîte IMAP
     qui porte de vrais en-têtes (`Authentication-Results`, `In-Reply-To`), un facteur SMTP qui GARDE ce qui partirait, un faux Claude — rien ne sort de la machine.
       0. Léa, Camille et Chloé sont en mode AUTO, la charte « répondre à un client » est ouverte (le défaut) :
            · un prospect dont NOTRE serveur de réception a vérifié l'expéditeur (`dkim=pass` aligné) reçoit la réponse SEUL — signée « Camille — Assistante virtuelle — Équipe TeamOP » ;
            · sans en-tête, avec l'en-tête d'un AUTRE serveur (forgé), ou avec un `dkim=pass` d'un autre domaine : brouillon à valider, RIEN ne part ;
            · une question dont l'offre n'a pas la réponse ne part jamais seule, et Louis en propose une entrée à Justin ;
            · `controle@` n'est jamais lue : pas d'appel à Claude, pas de réponse, pas de message dans la messagerie ;
       1. la CHAÎNE : un compte à adresse prouvée → Léa répond seule (signée Léa) ; le prospect répond (In-Reply-To) → Camille le reconnaît → Chloé envoie SA proposition, seule, signée Chloé ;
       2. la signature est celle de l'agent, jamais « Justin » ; la Tour lit la formule (GET) et le patron seul la change (POST) ;
       3. le journal du serveur ne porte aucune adresse ni aucun texte de client. */
'use strict';
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 200) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 220 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 220000).unref();

(async () => {
  console.log('\n── 2908 · L’autonomie commerciale sur le vrai serveur ──');
  try { require(path.join(RACINE, 'server', 'node_modules', 'web-push')); require.resolve('imapflow', { paths: [path.join(RACINE, 'server')] }); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0); }
  const { demarrer, dormir } = require('./banc-serveur-courrier.js');
  const BA = require('./banc-agents-courrier.js');
  const { simpleParser } = require(path.join(RACINE, 'server', 'node_modules', 'mailparser'));
  const now = Date.now(), BOITE = 'contact@banc-courrier.fr', CTRL = 'controle@banc-courrier.fr', AUTRE = 'compta@banc-courrier.fr';
  /* Le serveur de réception DÉCLARÉ par le patron (`config.agents.authservIds`) : le seul dont l'en-tête fait foi. « teamop.fr » n'est plus un repli (relecture du 23 octobre 2026). */
  const SERVEUR = 'mx.reception-2908.example';
  const AR = d => 'Authentication-Results: ' + SERVEUR + '; dkim=pass header.d=' + d + '; spf=pass smtp.mailfrom=' + d;
  const M = (uid, o) => Object.assign({ dossier: 'INBOX', uid, messageId: '<u' + uid + '@banc-2908>', fromNom: '', to: BOITE, subject: 'Question ' + uid, text: 'Bonjour, que proposez-vous pour une entreprise de chauffage ?', ts: now - 3600000, flags: [] }, o);
  const MSG = [
    M(1, { from: 'alice@exemple-2908a.fr', entetes: [AR('exemple-2908a.fr')], subject: 'Votre logiciel pour mon activité' }),
    M(2, { from: 'bob@exemple-2908b.fr', subject: 'Sans en-tête de vérification' }),
    M(3, { from: 'carl@exemple-2908c.fr', entetes: ['Authentication-Results: serveur-etranger.example; dkim=pass header.d=exemple-2908c.fr'], subject: 'En-tête forgé' }),
    M(4, { from: 'dora@exemple-2908d.fr', entetes: [AR('autre-domaine.example')], subject: 'dkim d’un autre domaine' }),
    M(5, { from: 'emil@exemple-2908e.fr', entetes: [AR('exemple-2908e.fr')], subject: 'Une question sans réponse', text: 'Bonjour, INCONNU-2908 : gérez-vous les licences de mes machines ?' }),
    /* ⛔ le faux qui PASSAIT : l'expéditeur écrit lui-même « Authentication-Results: teamop.fr; dkim=pass header.d=<son domaine> » (un nom public, ancien repli) */
    M(6, { from: 'frank@exemple-2908f.fr', entetes: ['Authentication-Results: teamop.fr; dkim=pass header.d=exemple-2908f.fr; spf=pass smtp.mailfrom=exemple-2908f.fr'], subject: 'Faux en-tête teamop.fr' }),
    M(7, { from: 'gina@exemple-2908g.fr', entetes: ['Authentication-Results: mx.teamop.fr; spf=pass smtp.mailfrom=gina@exemple-2908g.fr'], subject: 'Faux en-tête mx.teamop.fr' })];
  const S = await demarrer({ modes: { camille: 'auto', lea: 'auto', chloe: 'auto', louis: 'brouillon' }, comptes: true, authservIds: [SERVEUR],
    boites: [{ id: 'b-contact', email: BOITE }, { id: 'b-controle', email: CTRL }, { id: 'b-autre', email: AUTRE }],
    claude: "(r, n) => (String(r.system).startsWith('Tu es Camille') && /INCONNU-2908/.test(JSON.stringify(r.messages)) ? 'CATEGORIE : inconnu' : (" + BA.courrielPour.toString() + ")(r))",
    louisClaude: "() => 'QUESTION : Gérez-vous les licences des machines des clients ?\\nREPONSE : À COMPLÉTER'",
    imap: { [BOITE]: { messages: MSG },
      [CTRL]: { messages: [M(1, { to: CTRL, messageId: '<ctrl1@banc-2908>', from: 'zoe@exemple-2908z.fr', entetes: [AR('exemple-2908z.fr')], subject: 'CONTROLE-2908 une question' })] },
      /* ⛔ une boîte qui n'est NI contact@ NI support@ (liste d'AUTORISATION : relecture du 23 octobre 2026) */
      [AUTRE]: { messages: [M(1, { to: AUTRE, messageId: '<autre1@banc-2908>', from: 'yann@exemple-2908y.fr', entetes: [AR('exemple-2908y.fr')], subject: 'AUTRE-2908 une question' })] } } });
  vrai('le serveur démarre (portail des comptes allumé, fausse boîte IMAP, facteur, faux Claude)', S.vivant);
  if (!S.vivant) { console.log(S.journal().slice(0, 800)); await S.fin(); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  const lettres = async () => Promise.all(S.fact.recus.map(r => simpleParser(r)));
  const versA = async adr => (await lettres()).filter(m => new RegExp(adr.replace(/\./g, '\\.')).test(String((m.to && m.to.text) || '')));
  const vals = async () => ((await S.get('/api/monitor/agents/validations')).j.validations || []);

  console.log('\n0. Les sept mails reçus : un seul part seul');
  vrai('la veille (20 s après le démarrage) traite les messages : la réponse à alice part', await S.attendre(async () => (await versA('alice@exemple-2908a.fr')).length === 1, 90000));
  await S.attendre(async () => (await vals()).length >= 6 && S.claudeRecus().length >= 7, 30000);
  await dormir(1500);
  const alice = (await versA('alice@exemple-2908a.fr'))[0] || { text: '', inReplyTo: '', from: { text: '' } };
  v('⛔ alice (dkim=pass aligné, authserv-id DÉCLARÉ dans la configuration) : UN courriel, en réponse à SON message', [(await versA('alice@exemple-2908a.fr')).length, alice.inReplyTo], [1, '<u1@banc-2908>']);
  vrai('…signé par CAMILLE, assistante virtuelle — jamais « Justin »', /Camille — Assistante virtuelle — Équipe TeamOP/.test(alice.text) && !/Justin/.test(alice.text), alice.text.slice(-200));
  for (const [nom, adr] of [['bob (aucun en-tête)', 'bob@exemple-2908b.fr'], ['carl (en-tête d’un serveur étranger, forgé)', 'carl@exemple-2908c.fr'], ['dora (dkim=pass d’un AUTRE domaine)', 'dora@exemple-2908d.fr'], ['emil (une question sans réponse)', 'emil@exemple-2908e.fr'], ['frank (faux « Authentication-Results: teamop.fr » écrit par lui-même)', 'frank@exemple-2908f.fr'], ['gina (faux « mx.teamop.fr; spf=pass »)', 'gina@exemple-2908g.fr']])
    v('⛔ ' + nom + ' : rien ne part', (await versA(adr)).length, 0);
  const val = await vals();
  v('…ces six-là attendent Justin : six validations de Camille', [val.length, val.every(x => x.agent === 'camille' && x.type === 'envoyer_mail')], [6, true]);
  const resumes = val.map(x => x.resume).join(' | ');
  vrai('…et les résumés disent POURQUOI (le contrôle ou l’authentification), sans adresse', val.length === 6 && !/exemple-2908/.test(resumes), resumes.slice(0, 300));
  const aff = (await S.get('/api/monitor/agents/brouillons?refs=' + encodeURIComponent(val.map(x => x.params.fil).join(',')))).j;
  const etats = Object.values(aff).map(b => [b.authentifie, b.controle && b.controle.etat]);
  vrai('l’aperçu de la Tour porte l’authentification et le contrôle de chaque brouillon', etats.length === 6 && etats.every(e => typeof e[0] === 'boolean' && ['bon', 'a_revoir', 'non_verifie'].includes(e[1])), JSON.stringify(etats));
  vrai('⛔ Louis a proposé une entrée à Justin pour la question sans réponse (rien n’est validé)', await S.attendre(async () => ((await S.get('/api/monitor/agents/connaissances')).j.entrees || []).filter(e => e.etat === 'propose').length === 1, 8000));
  const lou = (await S.get('/api/monitor/agents/connaissances')).j.entrees || [];
  v('…elle est « propose », sans réponse inventée', [lou[0] && lou[0].etat, lou[0] && lou[0].reponse], ['propose', '']);
  console.log('\n1. La chaîne : Léa répond seule, le prospect répond, Chloé envoie sa proposition');
  const adr = 'chaine@exemple-2908x.fr';
  const ins = await S.inscrire(adr, 'Toka Clim', [{ app: 'OP GESTION', formule: 'Business', statut: 'en attente', date: 1, besoin: 'planning', users: '4', metier: 'chauffage' }]);
  v('(population) le compte à adresse prouvée : première synchro 200', ins.sync && ins.sync.s, 200);
  vrai('⛔ Léa répond SEULE à l’inscription (mode auto, charte ouverte, adresse prouvée) : un courriel part', await S.attendre(async () => (await versA(adr)).filter(m => /Léa — Assistante virtuelle/.test(m.text)).length === 1, 30000));
  const lea = (await versA(adr)).find(m => /Léa — Assistante virtuelle/.test(m.text));
  vrai('…signé « Léa — Assistante virtuelle — Équipe TeamOP », jamais « Justin »', lea && /Léa — Assistante virtuelle — Équipe TeamOP/.test(lea.text) && !/Justin/.test(lea.text), lea && lea.text.slice(-200));
  const midLea = lea ? lea.messageId : '<introuvable>';
  S.poserImap(BOITE, b => b.messages.push(M(9, { from: adr, entetes: [AR('exemple-2908x.fr'), 'In-Reply-To: ' + midLea, 'References: ' + midLea], subject: 'Re: ' + (lea && lea.subject || ''), text: 'Bonjour, nous sommes quatre techniciens, surtout de l’entretien de climatisation chez des particuliers. Que nous proposez-vous ?', ts: Date.now() })));
  vrai('⛔ Camille reconnaît la réponse à Léa (In-Reply-To), Chloé envoie SA proposition, seule — signée Chloé', await S.attendre(async () => (await versA(adr)).filter(m => /Chloé — Assistante virtuelle/.test(m.text)).length === 1, 160000));
  const chloe = (await versA(adr)).find(m => /Chloé — Assistante virtuelle/.test(m.text)) || { text: '', subject: '', inReplyTo: '' };
  vrai('…une proposition sur mesure : le prix, la période d’essai d’une semaine, aucune accolade restée dans le texte', /25 €/.test(chloe.text) && /essai d’une semaine/.test(chloe.text) && !/\{\{|\}\}/.test(chloe.text), chloe.text.slice(0, 300));
  vrai('…et Camille n’a pas répondu en plus (un seul courriel de Camille vers ce prospect)', (await versA(adr)).filter(m => /Camille — Assistante virtuelle/.test(m.text)).length === 0);
  const cl = (await S.get('/api/monitor/agents/signatures')).j;
  vrai('(population) la Tour lit la signature de chaque agent', cl && JSON.stringify(cl).includes('Assistante virtuelle'), JSON.stringify(cl).slice(0, 200));

  /* ⛔ APRÈS la chaîne : le second passage de la veille (2 minutes) a eu lieu, donc la boîte controle@ a eu tout le temps d'être lue si quelque chose l'y autorisait. Et la POPULATION :
     la veille a bien relevé les DEUX boîtes (elle a marqué le dernier message vu de controle@) — sans cela « jamais lue » passerait sur une boîte jamais visitée. */
  const vu = JSON.parse(fs.readFileSync(path.join(S.D, 'mail-vu.json'), 'utf8'));
  v('(population) la veille a relevé les trois boîtes (contact@, controle@ ET la boîte hors liste)', [Number(vu['b-contact']) > 0, Number(vu['b-controle']) > 0, Number(vu['b-autre']) > 0], [true, true, true]);
  const tout = JSON.stringify(S.claudeRecus()) + JSON.stringify(S.juges());
  vrai('⛔ controle@ n’est JAMAIS lue : ni appel à Claude, ni courriel vers zoe, ni trace dans le journal des agents', !/CONTROLE-2908|exemple-2908z/.test(tout) && (await versA('zoe@exemple-2908z.fr')).length === 0 && !/CONTROLE-2908|exemple-2908z/.test(JSON.stringify((await S.get('/api/monitor/agents/journal')).j)));
  vrai('⛔ …ni compta@ (une boîte connectée au Courrier qui n’est NI contact@ NI support@ : la liste d’AUTORISATION l’écarte) : aucun appel à Claude, aucun courriel vers yann, aucune trace', !/AUTRE-2908|exemple-2908y/.test(tout) && (await versA('yann@exemple-2908y.fr')).length === 0 && !/AUTRE-2908|exemple-2908y/.test(JSON.stringify((await S.get('/api/monitor/agents/journal')).j)));
  v('…et la lecture n’a rien marqué « lu » dans la boîte de contact', S.imap().boites[BOITE].messages.filter(m => m.dossier === 'INBOX' && (m.flags || []).includes('\\Seen')).length, 0);

  console.log('\n2. La formule de signature : lue par la Tour, changée par le patron seul');
  const avant = (await S.get('/api/monitor/agents/signatures')).j;
  v('un collaborateur LIT la formule', (await S.get('/api/monitor/agents/signatures', S.TA)).s, 200);
  v('⛔ un collaborateur ne la CHANGE pas (403)', (await S.post('/api/monitor/agents/signatures', { agent: 'lea', role: 'Conseillère' }, S.TA)).s, 403);
  v('⛔ un rôle qui porte « Justin » est refusé (400)', (await S.post('/api/monitor/agents/signatures', { agent: 'lea', role: 'Assistante de Justin' })).s, 400);
  v('⛔ un rôle avec une adresse est refusé (400)', (await S.post('/api/monitor/agents/signatures', { agent: 'lea', role: 'écrivez à x@y.fr' })).s, 400);
  const ok1 = await S.post('/api/monitor/agents/signatures', { agent: 'lea', role: 'Assistante virtuelle IA' });
  v('le patron change le rôle de Léa : 200', ok1.s, 200);
  vrai('…et la Tour le relit', JSON.stringify((await S.get('/api/monitor/agents/signatures')).j).includes('Assistante virtuelle IA') && JSON.stringify(avant) !== JSON.stringify((await S.get('/api/monitor/agents/signatures')).j));

  console.log('\n3. Rien de personnel dans le journal du serveur');
  const fuite = /[a-z0-9._-]{2,}@exemple-2908|alice|bob@|carl@|dora@|emil@|INCONNU-2908|quatre techniciens|licences de mes machines/.exec(S.journal());
  vrai('⛔ aucune adresse entière (une adresse masquée « c***@domaine » est l’usage du serveur), aucun texte de client dans la sortie du serveur', !fuite, fuite && S.journal().slice(Math.max(0, fuite.index - 150), fuite.index + 100));
  await S.fin();

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });

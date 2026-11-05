/* ══ test-3273 — LES BOÎTES MAIL D'OP MESSAGES : L'ADAPTATEUR DE LA PAGE ET LE SERVICE SE PARLENT (les VRAIES fonctions de `source-serveur.js` et `api.js`, contre le VRAI service) ═══════════════════
   La couture la plus dangereuse de ce dépôt n'est dans aucune des deux moitiés : c'est entre elles (CLAUDE.md, « ET LA COUTURE LA PLUS DANGEREUSE… »). Le service a ses bancs (3270 à 3272), la page a
   les siens (2695) : celui-ci fait parler la VRAIE fonction de la page à la VRAIE route.
     · un service FERMÉ (bêta) : l'adaptateur reste VIDE (tout à faux, « Bientôt ») ; la production fermée ne montre pas la rubrique ;
     · un service OUVERT : capacités (Google seul, marquage, pièces, réglages de serveur), relier par mot de passe, lister, ouvrir un message, la pièce (un Blob), marquer, envoyer (pièces comprises, réponse
       au fil), retirer ;
     · Google : l'adaptateur demande l'adresse d'autorisation et PART chez le fournisseur par une PAGE PLEINE (pas une fenêtre) ; Microsoft non configuré : un refus qui se DIT ;
     · le retour d'une connexion échouée (`?boites=erreur&c=…`) se dit une fois, en français, sans répéter l'adresse.
   Code 0 si tout passe, 1 sinon. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const T = require('./outils-msg');
const { fauxRelais, lireMessage } = require('./outils-relais');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));

const BOITE = 'alice.page@exemple.test', SECRET = 'AppPassPageXQZ9wvK', MDP = 'pw-alice-page000001';
const CHARGE = Buffer.from('%PDF-1.4 piece-de-la-page-QZXW').toString('base64');
const rej = async (p) => { try { await p; return null; } catch (e) { return e; } };

(async () => {
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-3273-'));
  const etatImap = path.join(racine, 'imap.json');
  fs.writeFileSync(etatImap, JSON.stringify({ boites: { [BOITE]: { messages: [
    { uid: 1, messageId: '<p1@exemple.test>', dossier: 'INBOX', from: 'client@societe.test', fromNom: 'Client', to: BOITE, subject: 'Question', text: 'Pouvez-vous répondre ?', ts: Date.UTC(2026, 10, 2), flags: [] },
    { uid: 2, messageId: '<p2@exemple.test>', dossier: 'INBOX', from: 'autre@societe.test', to: BOITE, subject: 'Avec pièce', text: 'Voir ci-joint', pieces: [{ nom: 'devis.pdf', type: 'application/pdf', b64: CHARGE }], ts: Date.UTC(2026, 10, 3), flags: [] },
  ] } } }));
  const relais = await fauxRelais({ auth: { utilisateur: BOITE, mdp: SECRET }, annoncerAuth: true });
  const og = await T.fauxOpGestion({ alice: { pass: MDP, nom: 'Alice Martin', actif: true } });
  const crochet = { boucle: true, serveurs: { imap: { hote: '127.0.0.1', port: 9993 }, smtp: { hote: '127.0.0.1', port: relais.port } }, delaiMs: 3000 };
  const env = { OPMSG_TEST_BOITES: JSON.stringify(crochet), FAUX_IMAP: etatImap, FAUX_IMAP_RACINE: T.SERVICE, NODE_OPTIONS: '--require=' + path.join(__dirname, 'faux-imap-boites.js') };
  const ferme = await T.lancerService({ urlGestion: og.url });                                                                                             // bêta SANS configuration
  const prodFerme = await T.lancerService({ instance: 'prod', urlGestion: og.url });                                                                        // production SANS configuration
  const ouvert = await T.lancerService({ urlGestion: og.url, config: { boitesMail: { ouvert: true, oauth: { google: { clientId: 'gclient-id-123456', clientSecret: 'gsecret-ZZ9988776655' } } } }, env });
  const sources = [];
  const monter = (svc, search) => {
    globalThis.location = { search: search || '', assign: (u) => { monter.partis.push(String(u)); } };
    const nav = T.navigateur(svc.base), requetes = [];
    const f = async (u, i) => { requetes.push(((i && i.method) || 'GET') + ' ' + String(u).replace(svc.base, '')); return nav.fetch(u, i); };
    const s = creerSourceServeur({ OPMSG, base: svc.base, fetch: f, EventSource: nav.EventSource }); sources.push(s);
    return { s, requetes };
  };
  monter.partis = [];
  try {
    console.log('\n1. Un service FERMÉ : l\'adaptateur reste vide');
    const mf = monter(ferme), mp = monter(prodFerme);
    v('la rubrique : visible en bêta (comme avant), absente en production fermée', [await mf.s.courrierOuvert(), await mp.s.courrierOuvert()], [true, false]);
    const cf = mf.s.courrierSource(), capF = await cf.capacites();
    v('bêta fermée : capacités tout à faux, aucune boîte', [capF.oauth, capF.marquage, capF.reglagesServeur, capF.destinataires, await cf.boites(), await cf.messages({ boite: 'x', dossier: 'inbox' })], [false, false, false, 1, [], []]);
    const eF = await rej(cf.ajouterBoite({ email: 'a@b.fr', mdp: 'x' }));
    v('   « Ajouter une boîte mail » dit « Bientôt », comme avant', eF && eF.message, 'Bientôt : la connexion de vos boîtes arrive avec le serveur d’OP Courrier.');
    v('   ⛔ et rien n\'est demandé à une route de boîte (seulement la lecture de /api/config)', mf.requetes.filter(r => /boites-mail/.test(r)), []);

    console.log('\n2. Un service OUVERT : relier, lire, répondre, retirer');
    const mo = monter(ouvert);
    await mo.s.connexion('alice', MDP); await mo.s.demarrer();
    vrai('population : alice est connectée', !!mo.s.moi());
    v('la rubrique : visible', await mo.s.courrierOuvert(), true);
    const c = mo.s.courrierSource(), cap = await c.capacites();
    v('capacités : Google seul (celui qui est configuré), marquage, pièces à télécharger, réglages de serveur, cinq destinataires, trois pièces de 4 Mo',
      [cap.oauth, cap.oauthVia, cap.marquage, cap.deplacement, cap.telechargerPiece, cap.reglagesServeur, cap.destinataires, cap.pj, cap.programmeServeur, cap.signature], [true, ['Google'], true, false, true, true, 5, { nombre: 3, octets: 4194304 }, false, false]);
    v('aucune boîte au départ (lue, pas devinée)', await c.boites(), []);
    const b = await c.ajouterBoite({ email: BOITE, nom: 'Pro Alice', mdp: SECRET, fournisseur: 'imap', cote: 'pro', serveurs: null });
    v('relier par mot de passe : la boîte (identifiant, adresse, nom)', [/^bm_[0-9a-f]{32}$/.test(b.id), b.email, b.nom], [true, BOITE, 'Pro Alice']);
    const lb = await c.boites();
    v('   la liste la porte, côté Pro', lb.map(x => [x.id === b.id, x.email, x.cote]), [[true, BOITE, 'pro']]);
    const ms = await c.messages({ boite: b.id, dossier: 'inbox' });
    v('les messages : les deux, du plus récent au plus ancien, avec un identifiant que la page sait relire', [ms.length, ms[0].objet, ms[1].objet, ms[0].id === b.id + '.2', ms[0].dossier, ms[1].de.email, ms[0].pj.length], [2, 'Avec pièce', 'Question', true, 'inbox', 'client@societe.test', 1]);
    vrai('   (le contrat du module : date en millisecondes, lu / drapeau booléens)', ms.every(m => typeof m.date === 'number' && typeof m.lu === 'boolean' && typeof m.drapeau === 'boolean'));
    const l2 = await c.lire(ms[0].id);
    v('ouvrir un message : son texte et ses pièces (avec l\'identifiant que `piece()` attend)', [l2.corps, l2.pj.length, l2.pj[0].nom, l2.pj[0].id], ['Voir ci-joint', 1, 'devis.pdf', '1']);
    const blob = await c.piece(ms[0].id, l2.pj[0].id);
    v('la pièce : un Blob, avec le contenu de la pièce', [blob instanceof Blob, (await blob.text()).includes('piece-de-la-page-QZXW')], [true, true]);
    await c.marquer(ms[0].id, { lu: true });
    v('marquer lu arrive au fournisseur', JSON.parse(fs.readFileSync(etatImap, 'utf8')).boites[BOITE].messages.find(m => m.uid === 2).flags, ['\\Seen']);
    const eMarq = await rej(c.lire('pas-un-identifiant'));
    v('un identifiant que la page ne sait pas lire : un refus LOCAL qui se dit (jamais une requête)', [!!eMarq, mo.requetes.filter(r => /pas-un/.test(r)).length], [true, 0]);
    const fichier = new File([Buffer.from('contenu du devis joint-QZXW')], 'devis-reponse.txt', { type: 'text/plain' });
    await c.envoyer({ boite: b.id, de: BOITE, nom: 'Pro Alice', a: 'client@societe.test', objet: 'Re: Question', texte: 'Oui, bien sûr.', pieces: [fichier], enReponseA: ms[1].id });
    const recu = lireMessage(relais.messages[relais.messages.length - 1]);
    v('répondre : le message part de la boîte, avec le texte, la pièce et le fil de la conversation (In-Reply-To du message 1)', [recu.enveloppe.de, recu.enveloppe.a, recu.sujet, (recu.texte || '').includes('Oui, bien sûr.'), recu.h['in-reply-to'],
      recu.parts.some(p => /devis-reponse\.txt/.test((p.h['content-disposition'] || [''])[0]) && p.octets.toString().includes('contenu du devis joint-QZXW'))], [BOITE, ['client@societe.test'], 'Re: Question', true, ['<p1@exemple.test>'], true]);
    const autreBoite = await rej(c.envoyer({ boite: b.id, a: 'x@y.fr', objet: 'x', texte: 'y', enReponseA: 'bm_' + 'a'.repeat(32) + '.1' }));
    v('   répondre à un message d\'une AUTRE boîte : la réponse part, sans le fil (jamais l\'identifiant d\'une boîte étrangère)', [autreBoite, relais.messages.length], [null, 2]);
    const refus = await rej(c.envoyer({ boite: b.id, a: 'pas-une-adresse', objet: 'x', texte: 'y' }));
    v('un refus du service se DIT en français (pas « inconnue »)', refus && refus.message, "Une adresse de destinataire est absente ou n'est pas valide (cinq au plus).");

    console.log('\n3. Google, Microsoft');
    monter.partis.length = 0;
    const marcheOauth = rej(c.ajouterBoite({ email: 'alice@gmail.com', nom: 'Alice', mdp: '', fournisseur: 'gmail', cote: 'pro' }));
    const issue = await Promise.race([marcheOauth.then(() => 'terminée', () => 'refusée'), new Promise(r => setTimeout(() => r('en attente'), 1500))]);
    vrai('⛔ Google : l\'adaptateur demande l\'adresse d\'autorisation, PART chez le fournisseur par une PAGE PLEINE (location.assign) et ne rend rien (la page s\'en va)', issue === 'en attente' && monter.partis.length === 1);
    const u = new URL(monter.partis[0] || 'http://x/');
    v('   vers le fournisseur de Google, avec l\'adresse tapée en indice, et rien de secret', [u.host === 'accounts.google.com' || /^127\.0\.0\.1/.test(u.host) || u.pathname.includes('/auth'), u.searchParams.get('login_hint'), (monter.partis[0] || '').includes('gsecret')], [true, 'alice@gmail.com', false]);
    const gmailMdp = await c.ajouterBoite({ email: 'alice@gmail.com', nom: 'Alice', mdp: 'unmotdepasse', fournisseur: 'gmail', cote: 'pro' });
    vrai('Google AVEC un mot de passe d\'application reste le chemin du mot de passe : la boîte est reliée, aucune sortie vers Google', monter.partis.length === 1 && /^bm_/.test(gmailMdp.id));
    await c.retirerBoite(gmailMdp.id);
    const msft = await rej(c.ajouterBoite({ email: 'alice@outlook.fr', nom: 'Alice', mdp: 'x', fournisseur: 'microsoft', cote: 'pro' }));
    v('Microsoft non configuré : un refus qui se dit (Microsoft refuse les mots de passe), aucune sortie', [msft && msft.message, monter.partis.length], ['Microsoft refuse les mots de passe dans les applications : utilise « Continuer avec Microsoft ».', 1]);

    console.log('\n4. Le retour d\'une connexion');
    const mr = monter(ouvert, '?boites=erreur&c=state_rejoue&x=1');
    await mr.s.connexion('alice', MDP); await mr.s.demarrer();
    const cr = mr.s.courrierSource(); await cr.capacites();
    const e1 = await rej(cr.boites()), e2 = await rej(cr.boites());
    v('un retour en erreur : dit UNE fois, en français, avec la cause ; ensuite la liste est lue normalement', [e1 && e1.message, e2, (await cr.boites()).length], ['La connexion de la boîte n’a pas abouti. Ce lien de connexion a déjà servi ou a expiré : recommence.', null, 1]);
    const mx = monter(ouvert, '?boites=erreur&c=%3Cscript%3E');
    await mx.s.connexion('alice', MDP); await mx.s.demarrer();
    const cx = mx.s.courrierSource(); await cx.capacites();
    const ex = await rej(cx.boites());
    vrai('   ⛔ un code d\'erreur forgé dans l\'adresse n\'est jamais répété à l\'écran', !!ex && !/script/i.test(ex.message));
    const mk = monter(ouvert, '?boites=ok');
    await mk.s.connexion('alice', MDP); await mk.s.demarrer();
    const ck = mk.s.courrierSource(); await ck.capacites();
    vrai('un retour réussi : la liste se lit, aucune panne annoncée', Array.isArray(await ck.boites()));
    await c.retirerBoite(b.id);
    v('retirer : la boîte n\'est plus listée', await c.boites(), []);
  } catch (e) { console.log('  ✗ EXCEPTION', e && e.stack || e); process.exitCode = 1; }
  finally {
    for (const s of sources) { try { if (typeof s.arreter === 'function') s.arreter(); } catch (e) {} }
    await ferme.arreter(); await prodFerme.arreter(); await ouvert.arreter(); await relais.fermer(); await og.fermer(); try { fs.rmSync(racine, { recursive: true, force: true }); } catch (e) {}
  }
  fin();
})().catch(e => { console.log('  ✗ MORT', e && e.stack || e); process.exit(1); });

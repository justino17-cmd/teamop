/* ⛔ CE QUE CE FICHIER GARDE — L'APPAREIL ET LE SERVEUR DE MESSAGERIE SE PARLENT (famille 4, modèle `test-735`).

   Les VRAIES fonctions de `server-msg/public/api.js` (le client) et de `server-msg/public/source-serveur.js` (le module qui branche l'interface de
   Justin sur ce client) sont exécutées dans Node — avec un `fetch` à cookies et un `EventSource` de même cookie, comme un navigateur — contre le VRAI
   `server-msg/index.js` lancé isolé (port libre, base à lui, clé à lui), à DEUX et TROIS personnes. Chaque méthode du contrat de l'interface, chaque
   refus du service, la reprise du flux après une coupure y sont joués.

   C'est la couture qui a déjà coûté trois fois à ce dépôt (`CLAUDE.md`, « la couture la plus dangereuse ») : l'interface a ses bancs, le service a les
   siens, chacun JUSTE, et rien ne dit qu'ils se parlent. Ici ils se parlent. Ce banc ne voit pas ce qu'un navigateur voit (le DOM, le tactile, le
   défilement) : c'est `tests/sonde-opmessages-serveur.js`.

   La seconde moitié joue la même chose contre le VRAI `server/index.js` d'OP GESTION (comme `test-904`) : ouvrir, COUPER, rouvrir, supprimer un accès
   depuis la Tour, et voir le module le dire à la page.

   Les contrôles marqués ⛔ gardent des propriétés dont la perte ne se verrait PAS :
     · UN ENVOI NE SE PERD PAS ET NE SE DOUBLE PAS : réponse perdue, puis réseau coupé — le même `cid` repart, le service n'en fait qu'un message ;
     · UN REFUS SE DIT : chaque refus du service arrive à l'écran avec sa phrase française, y compris le refus du flux (429 `trop_de_flux`), que
       `EventSource` ne montre jamais ; un échec de chargement n'est PAS « personne n'est connecté » ;
     · UNE SESSION MORTE (accès coupé) OU UNE AUTRE PERSONNE dans le même navigateur FAIT REPARTIR LA PAGE (le module le dit, une fois) ;
     · UN MEMBRE RETIRÉ NE REÇOIT PLUS RIEN ; UN ÉPHÉMÈRE ÉCHU DISPARAÎT SANS « Message supprimé » ;
     · LE TEMPS RÉEL TIENT : un message paraît chez l'autre en moins d'une seconde, « Lu » revient, la saisie s'éteint seule.
   Toute attente est au GESTE (on sonde la condition), jamais au chronomètre. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
const attrape = async (p) => { try { await p; return null; } catch (e) { return e; } };
const att = (cond, ms = 8000) => T.attendre(cond, ms, 10);

/* Un « appareil » : un navigateur de poche (cookie, Origin) dont on peut COUPER le réseau, PERDRE une réponse, et dont on compte les requêtes. */
function monter(svc, opts = {}) {
  const nav = T.navigateur(svc.base);
  const reseau = { coupe: false, perdre: null, forcer: null, requetes: [], instances: [], fluxBloque: false };
  const f = async (url, init) => {
    const u = String(url), m = (init && init.method) || 'GET', chemin = u.replace(svc.base, '').split('?')[0];
    reseau.requetes.push(m + ' ' + chemin);
    if (reseau.coupe) throw new TypeError('réseau coupé');
    if (reseau.fluxBloque && chemin === '/api/flux') throw new TypeError('flux coupé');   // seul le flux est injoignable : les écritures passent
    if (reseau.forcer && reseau.forcer.test(m + ' ' + chemin)) { const [code, corps, entetes] = reseau.forcerReponse || [429, { error: 'quota_atteint' }, { 'Retry-After': '40' }]; return new Response(JSON.stringify(corps), { status: code, headers: Object.assign({ 'Content-Type': 'application/json' }, entetes || {}) }); }
    const r = await nav.fetch(url, init);
    if (reseau.perdre && reseau.perdre.test(m + ' ' + chemin)) { reseau.perdre = null; throw new TypeError('réponse perdue'); }
    return r;
  };
  class ES extends nav.EventSource {
    constructor(u) { super(u); reseau.instances.push(this); }
    /* `_muet` : la connexion est « à moitié morte » — elle reste ouverte et ne livre plus RIEN (ni message, ni pulsation), sans jamais dire une erreur. C'est CETTE connexion-là : une
       connexion neuve (la reprise de la page) est une autre socket, et elle marche. */
    _emettre(t, ev) { if (this._muet && t !== 'error') return; return super._emettre(t, ev); }
    async _connecter() {
      if (reseau.coupe || reseau.fluxBloque) { if (this._ferme) return; this.readyState = 0; this._emettre('error', { type: 'error' }); setTimeout(() => this._connecter(), 60); return; }
      return super._connecter();
    }
  }
  const src = creerSourceServeur(Object.assign({ OPMSG, base: svc.base, fetch: f, EventSource: ES, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5 }, opts));
  const evs = [], morts = [];
  src.ecouter(e => evs.push(e));
  src.surSessionMorte(m => morts.push(m));
  return {
    src, evs, morts, reseau, nav,
    /* le réseau tombe : le flux ouvert est coupé net, et rien ne passe tant qu'il n'est pas rendu */
    /* toutes les connexions de flux ouvertes en ce moment deviennent « à moitié mortes » */
    rendreMuet() { for (const i of reseau.instances) i._muet = true; },
    couper() { reseau.coupe = true; for (const i of reseau.instances) { try { i._ctrl && i._ctrl.abort(); } catch (e) {} } },
    rendre() { reseau.coupe = false; },
    async entrer(login, pass) { await src.connexion(login, pass); const d = await src.demarrer(); if (!d.connecte) throw new Error('démarrage refusé : ' + JSON.stringify(d)); return src.moi(); },
    evenement: (pred) => evs.find(pred) || null,
    attendreEv: (pred, ms) => att(() => evs.find(pred) || null, ms),
  };
}
const ids = (vues) => vues.map(m => m.texte);

async function lancerOpGestion(dossier, port) {
  fs.mkdirSync(path.join(dossier, 'data'), { recursive: true });
  const webpush = require(path.join(T.RACINE, 'server', 'node_modules', 'web-push'));
  const vap = webpush.generateVAPIDKeys();
  const cfg = path.join(dossier, 'config.json');
  fs.writeFileSync(cfg, JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: crypto.createHash('sha256').update('mot-de-passe-de-la-tour-banc').digest('hex') }));
  let sortie = '';
  const enfant = spawn(process.execPath, [path.join(T.RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: cfg, TEAMOP_DATA: path.join(dossier, 'data'), PORT: String(port) }), stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => { sortie += d; }); enfant.stderr.on('data', d => { sortie += d; });
  const base = 'http://127.0.0.1:' + port;
  const vivant = await T.attendre(async () => { try { return (await fetch(base + '/health')).ok; } catch (e) { return false; } }, 15000, 100);
  if (!vivant) { try { enfant.kill('SIGKILL'); } catch (e) {} throw new Error('OP GESTION n\'a pas démarré\n' + sortie.slice(0, 600)); }
  return { base, tuer: () => { try { enfant.kill('SIGKILL'); } catch (e) {} } };
}
const json = async (base, methode, chemin, corps, entetes) => {
  const r = await fetch(base + chemin, { method: methode, headers: Object.assign({ 'Content-Type': 'application/json' }, entetes || {}), body: corps === undefined ? undefined : JSON.stringify(corps) });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { code: r.status, j };
};

(async () => {
  const og = await T.fauxOpGestion({
    alice: { pass: 'pw-alice-1234', nom: 'Alice Martin', actif: true }, bruno: { pass: 'pw-bruno-1234', nom: 'Bruno Petit', actif: true }, chloe: { pass: 'pw-chloe-1234', nom: 'Chloé Durand', actif: true },
    dora: { pass: 'pw-dora-12345', nom: 'Dora', actif: true }, eve: { pass: 'pw-eve-123456', nom: '<img src=x onerror=alert(1)>Eve', actif: true }, coupe: { pass: 'pw-coupe-123', nom: 'Coupé', actif: false },
  });
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-911-'));
  const port = await T.portLibre();
  const optsSvc = { urlGestion: og.url, horloge: true, dossier: racine, port, config: { pulsationMs: 400, presenceGraceMs: 300, balayageMs: 100, beta: { relectureMs: 250, timeoutMs: 800 } } };
  let svc = await T.lancerService(optsSvc);
  const fermes = [];
  try {
    /* ══ 1. LA PORTE : connexion, refus dits, démarrage ═══════════════════════════════════════════════════════════════════ */
    console.log('La session : démarrer sans personne, entrer, se tromper — chaque refus a sa phrase, aucun n\'est « personne n\'est connecté »');
    const A = monter(svc), B = monter(svc), C = monter(svc);
    {
      const x = monter(svc);
      const d = await x.src.demarrer();
      v('sans session : demarrer() dit « personne n\'est connecté » — ce n\'est pas une panne', [d.connecte, d.motif, x.src.moi()], [false, 'session_requise', null]);
      const e1 = await attrape(x.src.connexion('alice', 'faux-faux-faux'));
      vrai('⛔ un mauvais mot de passe : ErreurApi « identifiants », phrase française, `dit`', e1 && e1.code === 'identifiants' && e1.dit === true && /incorrect/.test(e1.phrase()));
      const e2 = await attrape(x.src.connexion('coupe', 'pw-coupe-123'));
      v('⛔ un accès coupé depuis la Tour : « acces_coupe » dit avec sa phrase', [e2.code, e2.phrase()], ['acces_coupe', OPMSG.MESSAGES.acces_coupe]);
      og.mode = 'panne';
      const e3 = await attrape(x.src.connexion('alice', 'pw-alice-1234'));
      og.mode = 'normal';
      v('⛔ OP GESTION muet : « porte_indisponible » (503) est dit — pas « mauvais mot de passe »', [e3.code, e3.statut], ['porte_indisponible', 503]);
      const e4 = await attrape(x.src.connexion('', ''));
      vrai('un identifiant vide est refusé (champ_invalide), pas envoyé tel quel', e4 && e4.code === 'champ_invalide');
    }
    const ma = await A.entrer('alice', 'pw-alice-1234'), mb = await B.entrer('bruno', 'pw-bruno-1234'), mc = await C.entrer('chloe', 'pw-chloe-1234');
    v('moi() : la personne connectée, avec ses initiales (le nom que la Tour a donné)', [ma.nom, ma.initiales, /^p_[0-9a-f]{32}$/.test(ma.id)], ['Alice Martin', 'AM', true]);
    v('population : aucune capacité fantôme — le service sait les pièces (photos, vocaux, fichiers, photos de profil) et les réglages (test-944 les joue), les réunions programmées (test-976 les joue), et dit « bientôt » aux appels (l\'étape 7)', [A.src.capacites.photos, A.src.capacites.vocaux, A.src.capacites.fichiers, A.src.capacites.avatars, A.src.capacites.reglages, A.src.capacites.appels, A.src.capacites.reunions, A.src.capacites.actionsMessage], [true, true, true, true, true, false, true, true]);
    vrai('⛔ aucun jeton ni identifiant de session dans le module (le cookie est HttpOnly, il ne passe jamais par le JavaScript)', !/opm_[A-Za-z0-9_-]{43}/.test(JSON.stringify(A.src.moi())) && !JSON.stringify(Object.keys(A.src)).includes('jeton'));

    /* ══ 2. LES CONTACTS PAR LIEN ═════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLes contacts par lien : créer, lire (sans rien accepter), accepter — et ce que les refus disent');
    let conv = null;
    {
      v('population : Alice n\'a aucun contact', A.src.contacts(), []);
      const l = await A.src.lienContact();
      vrai('⛔ le lien est un code long (≥ 20 signes) et une échéance', /^[A-Za-z0-9_-]{20,64}$/.test(l.code) && l.expireLe > Date.now());
      const ap = await B.src.lireLien(l.code);
      v('Bruno LIT le lien : « Alice Martin », un contact — et rien n\'est accepté encore', [ap.genre, ap.de, B.src.contacts().length], ['contact', 'Alice Martin', 0]);
      const eProp = await attrape(A.src.accepterLien(l.code));
      v('⛔ accepter son PROPRE lien : « lien_propre » dit', [eProp.code, eProp.phrase()], ['lien_propre', OPMSG.MESSAGES.lien_propre]);
      const e410 = await attrape(B.src.lireLien('A'.repeat(22)));
      v('⛔ un lien inconnu : « lien_invalide » (410) dit avec sa phrase', [e410.code, e410.statut, e410.phrase()], ['lien_invalide', 410, OPMSG.MESSAGES.lien_invalide]);
      const r = await B.src.accepterLien(l.code);
      conv = r.conv;
      vrai('⛔ Bruno accepte : un contact ET la conversation à deux (son identifiant revient, la page l\'ouvre)', r.genre === 'contact' && /^c_[0-9a-f]{32}$/.test(conv) && B.src.contacts().length === 1 && B.src.contacts()[0].nom === 'Alice Martin');
      vrai('⛔ Alice l\'apprend SANS recharger : l\'événement « contacts » arrive et son contact est là', !!(await A.attendreEv(e => e.type === 'contacts')) && !!(await att(() => A.src.contacts().some(c => c.nom === 'Bruno Petit'))));
      const notif = await A.attendreEv(e => e.type === 'notification' && /contacts/.test(e.texte));
      vrai('et une notification dans l\'application (« … est maintenant dans vos contacts »)', !!notif);
      const re = await attrape(B.src.accepterLien(l.code));
      vrai('⛔ un lien de CONTACT ne sert QU\'UNE FOIS (relecture du gardien, remarque 6) : le même code, rejoué — par Bruno ou par un tiers — est « lien_invalide », et rien n\'a doublé', re && re.code === 'lien_invalide' && B.src.contacts().length === 1 && (await attrape(C.src.accepterLien(l.code))).code === 'lien_invalide' && C.src.contacts().length === 0);
      const lr = await A.src.lienContact();
      for (const x of [A, B]) { const l2 = await x.src.revoquerLiens(); void l2; }
      vrai('⛔ révoquer ses liens : un code NEUF et jamais utilisé ne vaut plus rien', (await attrape(C.src.lireLien(lr.code))).code === 'lien_invalide');
      const lc = await A.src.lienContact(); await C.src.accepterLien(lc.code);
      vrai('population : Chloé est contact d\'Alice (second lien), pas de Bruno', await att(() => A.src.contacts().length === 2) && C.src.contacts().map(c => c.nom).join() === 'Alice Martin' && !B.src.contacts().some(c => c.nom === 'Chloé Durand'));
    }

    /* ══ 3. UNE CONVERSATION À DEUX ═══════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nUne conversation à deux : envoi, réception en direct, « Lu », non-lus, saisie, présence');
    {
      const t0 = process.hrtime.bigint();
      const m1 = await A.src.envoyer(conv, { texte: 'Salut Bruno <b>gras</b>' });
      v('envoyer() rend le message créé (de moi, le texte tel quel)', [m1.auteur === ma.id, m1.texte], [true, 'Salut Bruno <b>gras</b>']);
      const arr = await B.attendreEv(e => e.type === 'arrivee' && e.conv === conv);
      const ms = Number(process.hrtime.bigint() - t0) / 1e6;
      console.log('    mesure : envoi → arrivée chez l\'autre : ' + Math.round(ms) + ' ms');
      vrai('⛔ le message PARAÎT chez Bruno en moins d\'une seconde (événement « arrivee » : de qui, quoi — de quoi faire une bannière)', !!arr && ms < 1000 && arr.de === 'Alice Martin' && arr.texte === 'Salut Bruno <b>gras</b>' && arr.groupe === false);
      const ouv = await B.src.ouvrir(conv);
      v('Bruno ouvre : le message est là, de l\'autre, TEL QUEL (l\'échappement est le travail de l\'écran)', [ouv.messages.map(m => m.texte), ouv.messages[0].auteur === ma.id, ouv.nom, ouv.type], [['Salut Bruno <b>gras</b>'], true, 'Alice Martin', 'direct']);
      const lst = await B.src.lister();
      v('⛔ et la liste dit « non lu » (1) avec l\'aperçu du dernier message, avant qu\'il ne l\'ouvre en vrai', [lst[0].nonLus, lst[0].nonLu, lst[0].apercu], [1, true, 'Salut Bruno <b>gras</b>']);
      await B.src.marquerLu(conv);
      vrai('marquerLu remet les non-lus à zéro dans la liste', (await B.src.lister())[0].nonLus === 0);
      const evLu = await A.attendreEv(e => e.type === 'conversation' && e.id === conv && false) || true;
      void evLu;
      vrai('⛔ « Lu » REVIENT chez Alice, avec l\'HEURE de la lecture (ce que la page écrit sous le message)', await att(async () => { const o = await A.src.ouvrir(conv); const d = o.messages.find(m => m.texte === 'Salut Bruno <b>gras</b>'); return d && typeof d.lu === 'number' && d.lu > 1e12; }));
      const fraiche = monter(svc); await fraiche.entrer('alice', 'pw-alice-1234');
      const o2 = await fraiche.src.ouvrir(conv);
      v('rechargée (page neuve), Alice sait toujours que c\'est lu — l\'heure, elle, est inconnue : « Lu » sans heure (true)', o2.messages[0].lu, true);
      fraiche.src.arreter();
      const avant = B.reseau.requetes.length;
      await B.src.saisie(conv, true); await B.src.saisie(conv, true); await B.src.saisie(conv, true);
      v('⛔ la frappe part UNE fois par 2,5 s (trois appels, une requête) : le service refuserait les autres', B.reseau.requetes.slice(avant).filter(r => /saisie/.test(r)).length, 1);
      vrai('⛔ Alice voit « écrit… » : ouvrir() rend { saisie: { contact: Bruno } }', await att(async () => { const o = await A.src.ouvrir(conv); return o.saisie && o.saisie.contact === mb.id; }));
      vrai('⛔ la frappe S\'ÉTEINT SEULE (aucune nouvelle) et la page en est prévenue', await att(async () => { const o = await A.src.ouvrir(conv); return o.saisie === null; }, 4000));
      await B.src.saisie(conv, false);
      vrai('présence : Bruno apparaît « en ligne » chez Alice (contact et liste)', await att(() => A.src.contacts().find(c => c.id === mb.id).enLigne === true) && (await A.src.lister()).find(c => c.id === conv).enLigne === true);
      B.src.arreter();
      vrai('⛔ …et « hors ligne » après la grâce, quand son flux se ferme (recharger ne clignote pas, partir se voit)', await att(() => A.src.contacts().find(c => c.id === mb.id).enLigne === false, 6000));
      await B.src.demarrer();   // il revient
    }

    /* ══ 4. L'ENVOI NE SE PERD PAS ET NE SE DOUBLE PAS ═══════════════════════════════════════════════════════════════════ */
    console.log('\nUn envoi ne se perd pas et ne se double pas : réponse perdue, réseau coupé, puis rétabli');
    {
      A.reseau.perdre = /POST .*\/messages$/;
      const p = await A.src.envoyer(conv, { texte: 'réponse perdue' });
      vrai('⛔ la réponse s\'est perdue APRÈS l\'écriture : le message est « en attente » à l\'écran (pas une erreur, pas un échec)', p.attente === true && /^p:/.test(p.id));
      const ouvertAttente = await A.src.ouvrir(conv);
      vrai('en attendant, la conversation le montre (marqué attente) à la fin', ouvertAttente.messages[ouvertAttente.messages.length - 1].attente === true || ouvertAttente.messages.filter(m => m.texte === 'réponse perdue').length === 1);
      vrai('⛔ le renvoi (même cid) ne crée PAS un deuxième message : un seul « réponse perdue » chez le service ET chez Bruno', await att(async () => { const o = await B.src.ouvrir(conv); return o.messages.filter(m => m.texte === 'réponse perdue').length === 1; }) && await att(async () => { const o = await A.src.ouvrir(conv); return o.messages.filter(m => m.texte === 'réponse perdue' && !m.attente).length === 1; }));
      await T.dort(400);
      v('et il n\'y en a toujours qu\'un après plusieurs passes de la file (population : la file a eu le temps de rejouer)', (await B.src.ouvrir(conv)).messages.filter(m => m.texte === 'réponse perdue').length, 1);

      B.couper();
      vrai('⛔ le réseau de Bruno tombe : la page est prévenue (« reseau perdu ») — pas un écran qui fait semblant d\'être à jour', !!(await B.attendreEv(e => e.type === 'reseau' && e.etat === 'perdu')));
      const e1 = await A.src.envoyer(conv, { texte: 'pendant la coupure 1' }), e2 = await A.src.envoyer(conv, { texte: 'pendant la coupure 2' }), e3 = await A.src.envoyer(conv, { texte: 'pendant la coupure 3' });
      const p1 = await B.src.envoyer(conv, { texte: 'écrit hors ligne 1' }), p2 = await B.src.envoyer(conv, { texte: 'écrit hors ligne 2' });
      vrai('⛔ Bruno écrit pendant la coupure : ses messages sont « en attente » (file locale), dans l\'ordre', p1.attente === true && p2.attente === true && ids((await B.src.ouvrir(conv)).messages).slice(-2).join('|') === 'écrit hors ligne 1|écrit hors ligne 2');
      vrai('rien n\'est encore parti : Alice ne voit pas les messages de Bruno', !ids((await A.src.ouvrir(conv)).messages).some(t => /hors ligne/.test(t)));
      B.rendre();
      vrai('⛔ le réseau revient : la page est prévenue (« reseau ok »)', !!(await B.attendreEv(e => e.type === 'reseau' && e.etat === 'ok')));
      vrai('⛔ RIEN DE PERDU : Bruno reçoit les trois messages d\'Alice (rejoués depuis son dernier identifiant), dans l\'ordre', await att(async () => ids((await B.src.ouvrir(conv)).messages).filter(t => /pendant la coupure/.test(t)).join('|') === 'pendant la coupure 1|pendant la coupure 2|pendant la coupure 3'));
      vrai('⛔ RIEN DE PERDU : Alice reçoit les deux messages de Bruno, dans l\'ordre', await att(async () => ids((await A.src.ouvrir(conv)).messages).filter(t => /hors ligne/.test(t)).join('|') === 'écrit hors ligne 1|écrit hors ligne 2'));
      await T.dort(300);
      const finalB = ids((await B.src.ouvrir(conv)).messages), finalA = ids((await A.src.ouvrir(conv)).messages);
      v('⛔ RIEN EN DOUBLE : chaque texte apparaît une fois chez les deux, et les deux voient la MÊME suite', [finalA.length === new Set(finalA).size, finalB.length === new Set(finalB).size, finalA.join('|') === finalB.join('|')], [true, true, true]);
      void e1; void e2; void e3;
      vrai('et plus rien n\'est « en attente » chez Bruno', !(await B.src.ouvrir(conv)).messages.some(m => m.attente));
    }

    /* ══ 5. LES GESTES SUR UN MESSAGE ════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nRépondre, réagir, modifier, supprimer — et ce que l\'autre en voit');
    {
      const base = (await A.src.ouvrir(conv)).messages.find(m => m.texte === 'Salut Bruno <b>gras</b>');
      await B.src.envoyer(conv, { texte: 'ma réponse', reponse: base.id });
      const rep = await att(async () => (await A.src.ouvrir(conv)).messages.find(m => m.texte === 'ma réponse'));
      v('⛔ RÉPONSE : Alice voit la citation de SON propre message (« Vous », le texte cité)', [rep.reponse.nom, rep.reponse.texte], ['Vous', 'Salut Bruno <b>gras</b>']);
      const repB = (await B.src.ouvrir(conv)).messages.find(m => m.texte === 'ma réponse');
      v('et Bruno, lui, voit qu\'il répond à « Alice Martin »', repB.reponse.nom, 'Alice Martin');
      await A.src.reagir(conv, rep.id, '👍');
      vrai('⛔ RÉACTION : Bruno voit 👍 × 1 sur son message, pas la sienne', await att(async () => { const m = (await B.src.ouvrir(conv)).messages.find(x => x.texte === 'ma réponse'); return m.reactions && m.reactions.length === 1 && m.reactions[0].emoji === '👍' && m.reactions[0].n === 1 && m.reactions[0].moi === false; }));
      vrai('Alice, elle, voit que c\'est la sienne (moi:true)', (await A.src.ouvrir(conv)).messages.find(x => x.texte === 'ma réponse').reactions[0].moi === true);
      await A.src.reagir(conv, rep.id, '👍');
      vrai('la même réaction une seconde fois la RETIRE (bascule)', await att(async () => !(await B.src.ouvrir(conv)).messages.find(x => x.texte === 'ma réponse').reactions));
      const mien = (await B.src.ouvrir(conv)).messages.find(m => m.texte === 'ma réponse');
      await B.src.modifier(conv, mien.id, 'ma réponse corrigée');
      vrai('⛔ MODIFIER : Alice voit le nouveau texte ET « modifié » (une heure)', await att(async () => { const m = (await A.src.ouvrir(conv)).messages.find(x => x.id === mien.id); return m && m.texte === 'ma réponse corrigée' && m.modifie > 1e12; }));
      const eA = await attrape(A.src.modifier(conv, mien.id, 'je réécris le message de Bruno'));
      v('⛔ modifier le message d\'un AUTRE : « interdit » dit', eA && eA.code, 'interdit');
      svc.avancer(16 * 60000);
      const eD = await attrape(B.src.modifier(conv, mien.id, 'trop tard'));
      svc.avancer(-16 * 60000);
      v('⛔ modifier après 15 minutes : « delai_depasse » dit avec sa phrase', [eD.code, eD.phrase()], ['delai_depasse', OPMSG.MESSAGES.delai_depasse]);
      const eV = await attrape(A.src.modifier(conv, mien.id, '   '));
      v('un texte vide est refusé par le module avant d\'aller au service (« vide »)', [eV.code, eV.dit], ['vide', true]);
      await B.src.supprimer(conv, mien.id, 'tous');
      vrai('⛔ SUPPRIMER POUR TOUS : chez Alice la bulle devient « supprimé » (texte vidé, réactions vidées)', await att(async () => { const m = (await A.src.ouvrir(conv)).messages.find(x => x.id === mien.id); return m && m.supprime === true && m.texte === ''; }));
      const autre = (await A.src.ouvrir(conv)).messages.find(m => m.texte === 'pendant la coupure 1');
      await A.src.supprimer(conv, autre.id, 'moi');
      vrai('⛔ SUPPRIMER POUR MOI : disparaît chez Alice SEULE (Bruno la lit encore)', !(await A.src.ouvrir(conv)).messages.some(m => m.id === autre.id) && (await B.src.ouvrir(conv)).messages.some(m => m.texte === 'pendant la coupure 1'));
      const eId = await attrape(A.src.reagir(conv, 'm_inconnu', '👍'));
      v('un message qu\'on ne connaît pas : refusé en local (« introuvable »)', eId.code, 'introuvable');
    }

    /* ══ 6. UN GROUPE, TROIS PERSONNES ═══════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nUn groupe : créer avec ses contacts, rôles, « seuls les admins écrivent », éphémères, retirer quelqu\'un');
    let G = null;
    {
      const eVide = await attrape(A.src.creerGroupe({ nom: 'Vide', membres: [] }));
      v('un groupe sans personne est refusé en local (« vide »)', eVide.code, 'vide');
      const g = await A.src.creerGroupe({ nom: 'Équipe dépôt', membres: [mb.id, mc.id] });
      G = g.id;
      v('créer un groupe rend la conversation : nom, type, trois dans le groupe après lecture', [g.nom, g.type], ['Équipe dépôt', 'groupe']);
      vrai('⛔ Bruno ET Chloé la voient arriver dans leur liste (sans recharger), avec le message système « Alice Martin a créé le groupe »', await att(async () => (await B.src.lister()).some(c => c.id === G)) && await att(async () => (await C.src.lister()).some(c => c.id === G)));
      const oB = await B.src.ouvrir(G);
      v('Bruno lit le message système en français, de SON point de vue', oB.messages.map(m => m.texte), ['Alice Martin a créé le groupe']);
      v('et Alice, du sien : « Vous avez créé le groupe »', (await A.src.ouvrir(G)).messages.map(m => m.texte), ['Vous avez créé le groupe']);
      const infos = await A.src.infos(G);
      v('infos() : trois membres, Alice administratrice et seule', [infos.membres.length, infos.moiAdmin, infos.membres.filter(m => m.role === 'admin').map(m => m.nom)], [3, true, ['Alice Martin']]);
      const iB = await B.src.infos(G);
      v('Bruno, lui, n\'est pas admin (moiAdmin faux)', iB.moiAdmin, false);
      const eN = await attrape(B.src.majConversation(G, { annonces: true }));
      v('⛔ un membre qui n\'est pas admin ne règle rien : « interdit » dit', eN.code, 'interdit');
      await A.src.majConversation(G, { annonces: true });
      vrai('⛔ « SEULS LES ADMINS ÉCRIVENT » : Bruno voit le groupe fermé (annoncesSeulement, il n\'est pas admin)', await att(async () => { const o = await B.src.ouvrir(G); return o.annoncesSeulement === true && o.admins.indexOf(mb.id) < 0; }));
      const eAn = await attrape(B.src.envoyer(G, { texte: 'je voudrais écrire' }));
      v('⛔ et il ne PEUT pas : « annonces_seules » dit avec sa phrase', [eAn.code, eAn.phrase()], ['annonces_seules', OPMSG.MESSAGES.annonces_seules]);
      vrai('Alice, admin, écrit : le message arrive chez les deux', !!(await A.src.envoyer(G, { texte: 'annonce d\'Alice' })) && await att(async () => ids((await B.src.ouvrir(G)).messages).includes('annonce d\'Alice')) && await att(async () => ids((await C.src.ouvrir(G)).messages).includes('annonce d\'Alice')));
      await A.src.nommerAdmin(G, mb.id, true);
      vrai('⛔ Alice nomme Bruno admin : il peut écrire (et le message système le dit)', await att(async () => (await B.src.infos(G)).moiAdmin === true) && !!(await B.src.envoyer(G, { texte: 'maintenant j\'écris' })) && ids((await A.src.ouvrir(G)).messages).some(t => /Bruno Petit est maintenant administrateur/.test(t)));
      await A.src.majConversation(G, { annonces: false });
      await A.src.majConversation(G, { ephemeres: 86400 });
      vrai('éphémères : le réglage est lu par les autres (24 heures)', await att(async () => (await C.src.ouvrir(G)).ephemeres === 86400));
      await A.src.envoyer(G, { texte: 'ce message va expirer' });
      vrai('population : il est dans le fil de Chloé', await att(async () => ids((await C.src.ouvrir(G)).messages).includes('ce message va expirer')));
      svc.avancer(86400000 + 120000);
      vrai('⛔ ÉCHU, il DISPARAÎT du fil (le balayeur l\'a purgé) — sans « Message supprimé » à sa place', await att(async () => !ids((await C.src.ouvrir(G)).messages).includes('ce message va expirer'), 8000) && !(await C.src.ouvrir(G)).messages.some(m => m.supprime));
      svc.avancer(-(86400000 + 120000));
      await A.src.majConversation(G, { ephemeres: 0 });
      /* retirer Chloé */
      const nC = C.evs.length;
      await A.src.retirerMembre(G, mc.id);
      vrai('⛔ RETIRER CHLOÉ : elle reçoit « retire » (pour fermer l\'écran) et le groupe sort de sa liste', !!(await C.attendreEv(e => e.type === 'retire' && e.id === G)) && await att(async () => !(await C.src.lister()).some(c => c.id === G)));
      await A.src.envoyer(G, { texte: 'Chloé ne doit pas voir ceci' });
      await att(async () => ids((await B.src.ouvrir(G)).messages).includes('Chloé ne doit pas voir ceci'));
      await T.dort(250);
      v('⛔ Chloé ne reçoit AUCUN événement de ce groupe après son retrait (ni message, ni arrivée, ni bannière)', C.evs.slice(nC).filter(e => (e.conv === G || e.id === G) && e.type !== 'retire' && e.type !== 'liste').length, 0);
      vrai('⛔ et elle ne peut plus l\'ouvrir : ouvrir() rend null (« n\'existe plus »), aucune lecture', (await C.src.ouvrir(G)) === null);
      const eC = await attrape(C.src.envoyer(G, { texte: 'je peux encore écrire ?' }));
      vrai('⛔ ni y écrire : « introuvable » dit (404 — on ne dit pas que le groupe existe)', eC && eC.code === 'introuvable');
      const iA = await A.src.infos(G);
      v('Alice voit deux membres', iA.membres.length, 2);
      const eQ = await attrape(A.src.quitter(G));
      vrai('un administrateur qui est le seul admin… (Bruno est admin aussi : elle peut partir)', eQ === null);
      v('et une fois partie, le groupe n\'est plus dans sa liste', (await A.src.lister()).some(c => c.id === G), false);
    }

    /* ══ 7. UN GROUPE PAR LIEN, HISTORIQUE, PIÈGES ════════════════════════════════════════════════════════════════════════ */
    console.log('\nInviter par un lien de groupe, l\'historique (plus de 100 messages), du HTML piégé, et ce qui dit « bientôt »');
    {
      const g = await B.src.creerGroupe({ nom: 'Lien <script>alert(1)</script>', membres: [mb.id === mb.id ? ma.id : ma.id] });
      const lg = await B.src.lienGroupe(g.id);
      const ap = await C.src.lireLien(lg.code);
      v('le lien de groupe se LIT sans rien accepter : le nom du groupe et qui invite', [ap.genre, ap.de, ap.groupe.nom], ['groupe', 'Bruno Petit', 'Lien <script>alert(1)</script>']);
      const r = await C.src.accepterLien(lg.code);
      vrai('⛔ Chloé accepte : elle entre dans le groupe (conv rendue), et le groupe paraît dans sa liste', r.genre === 'groupe' && r.conv === g.id && (await C.src.lister()).some(c => c.id === g.id));
      vrai('⛔ le nom piégé reste TEXTE (rien n\'est échappé ni retiré ici : c\'est l\'écran qui échappe)', (await C.src.lister()).find(c => c.id === g.id).nom === 'Lien <script>alert(1)</script>');
      vrai('Bruno voit « Chloé Durand a rejoint le groupe »', await att(async () => ids((await B.src.ouvrir(g.id)).messages).some(t => /Chloé Durand a rejoint le groupe/.test(t))));
      /* historique */
      const d = (await B.src.creerGroupe({ nom: 'Longue histoire', membres: [ma.id] })).id;
      for (let i = 1; i <= 120; i++) await B.src.envoyer(d, { texte: 'msg ' + i });
      const o = await B.src.ouvrir(d);
      v('⛔ HISTORIQUE : la conversation s\'ouvre sur les 100 derniers messages et dit qu\'il y en a avant (aPlus)', [o.messages.length, o.aPlus], [100, true]);
      await B.src.precedents(d);
      const o2 = await B.src.ouvrir(d);
      v('et « messages précédents » rend le reste, sans doublon, dans l\'ordre (121 : le message système + 120)', [o2.messages.length, o2.aPlus, o2.messages.filter(m => !m.systeme).map(m => m.texte).join() === Array.from({ length: 120 }, (_, i) => 'msg ' + (i + 1)).join()], [121, false, true]);
      /* les pièces sont jouées par test-944 ; ici, ce qu'on ne peut pas envoyer est refusé proprement, et les appels disent « bientôt » */
      const eP = await attrape(A.src.envoyer(conv, { photos: [{ url: 'blob:x', w: 1, h: 1 }] }));
      const eV2 = await attrape(A.src.envoyer(conv, { vocal: { dur: 3 } }));
      const eAp = await attrape(A.src.demarrerAppel({ membres: [mb.id], video: false }));
      v('⛔ une photo ou un vocal SANS contenu : refus propre « vide » (rien n\'est déposé) ; les appels : « bientôt » (refus propre, avec sa phrase, jamais une erreur technique)', [eP.code, eV2.code, eAp.code, eAp.dit], ['vide', 'vide', 'bientot', true]);
      v('l\'historique des appels est vide (rien à simuler), l\'appel en cours n\'existe pas', [await A.src.appels(), await A.src.appel('x')], [[], null]);
    }

    /* ══ 8. LES REFUS DU SERVICE ARRIVENT À L'ÉCRAN ═══════════════════════════════════════════════════════════════════════ */
    console.log('\nLes refus : un échec de chargement n\'est pas « personne n\'est connecté », un 429 dit quand réessayer, le flux refusé se dit');
    {
      const z = monter(svc);
      await z.src.connexion('dora', 'pw-dora-12345');
      z.reseau.forcer = /^GET \/api\/conversations$/;
      const d = await z.src.demarrer();
      vrai('⛔ le chargement de la liste refusé (429) au démarrage : demarrer() le DIT (motif, phrase, « réessaie dans 40 s ») — il ne rend PAS « session_requise »', d.connecte === false && d.motif === 'quota_atteint' && /réessaie dans 40 s/.test(d.phrase) && d.connectee === true);
      z.reseau.forcer = null;
      const d2 = await z.src.demarrer();
      vrai('une réussite efface le refus d\'avant : le démarrage suivant passe', d2.connecte === true);
      z.reseau.forcer = /^GET \/api\/conversations$/;
      const eL = await attrape(z.src.lister(true));
      vrai('⛔ lister() qui échoue LÈVE une erreur dite (la page garde l\'ancienne liste et affiche la phrase) — elle ne rend pas une liste vide', eL && eL.dit === true && eL.code === 'quota_atteint' && eL.retry === 40);
      z.reseau.forcer = null;
      vrai('et la liste revient dès que le service répond', Array.isArray(await z.src.lister()));
      /* ⛔ la relecture de la liste que déclenche UN ÉVÉNEMENT (le message d'un autre) et que le service refuse ne se perd pas en silence : la source le DIT à l'écran */
      await B.src.ouvrir(conv);
      A.reseau.forcer = /^GET \/api\/conversations$/;
      await B.src.envoyer(conv, { texte: 'relecture refusée par le service' });
      const eR = await A.attendreEv(e => e.type === 'liste' && e.erreur && e.erreur.code === 'quota_atteint', 6000);
      A.reseau.forcer = null;
      vrai('⛔ une relecture de liste (déclenchée par un message reçu) REFUSÉE par le service (429) est DITE : un événement « liste » porte l\'erreur, avec sa phrase et son attente', !!eR && eR.erreur.dit === true && eR.erreur.retry === 40 && /réessaie dans 40 s/.test(eR.erreur.phrase()));
      z.reseau.forcer = /^GET \/api\/conversations\/c_/; z.reseau.forcerReponse = [503, { error: 'disque_plein' }];
      const eO = await attrape(A.src.ouvrir(conv)); void eO;
      z.reseau.forcer = null; z.reseau.forcerReponse = null;
      A.reseau.forcer = /^GET \/api\/conversations\/c_/; A.reseau.forcerReponse = [503, { error: 'disque_plein' }];
      A.src.arreter; // (ouvrir est servi par le cache quand la conversation est déjà chargée : on teste sur une conversation jamais ouverte ci-dessous)
      const nouveau = (await A.src.creerGroupe({ nom: 'Jamais ouvert', membres: [mb.id] })).id;
      const eC = await attrape(A.src.ouvrir(nouveau));
      A.reseau.forcer = null; A.reseau.forcerReponse = null;
      vrai('⛔ ouvrir() sur une panne du service LÈVE (« disque_plein » dit) — ce n\'est PAS « cette conversation n\'existe plus » (null)', eC && eC.code === 'disque_plein' && eC.dit === true);
      z.src.arreter();
      /* le flux refusé : six onglets pour une personne */
      const onglets = [];
      for (let i = 0; i < 5; i++) { const o = monter(svc); await o.entrer('eve', 'pw-eve-123456'); onglets.push(o); }
      const sixieme = monter(svc);
      await sixieme.src.connexion('eve', 'pw-eve-123456'); await sixieme.src.demarrer();
      const avis = await sixieme.attendreEv(e => e.type === 'avis' && /onglets/i.test(e.texte), 8000);
      vrai('⛔ LE FLUX REFUSÉ SE DIT : le sixième onglet reçoit un avis « Trop d\'onglets ouverts sur ce compte » (EventSource ne montre jamais le 429 : le client le lit)', !!avis);
      v('et le nom de la personne piégé (« <img … onerror … >Eve ») reste TEXTE, initiales comprises', [sixieme.src.moi().nom, /^</.test(sixieme.src.moi().initiales)], ['<img src=x onerror=alert(1)>Eve', true]);
      onglets[0].src.arreter();
      vrai('une place libérée : le sixième flux s\'ouvre tout seul (reprise à la main), sans que la page fasse rien', await sixieme.attendreEv(e => e.type === 'reseau' && e.etat === 'ok', 10000) !== null);
      for (const o of onglets) o.src.arreter(); sixieme.src.arreter();
    }

    /* ══ 8 bis. LES RELECTURES DU 2 OCTOBRE 2026 (testeur : D1 à D4, D7 ; gardien : remarques 1 à 3, 6) ═══════════════════════════════════ */
    console.log('\nRelectures du testeur et du gardien : un envoi perdu ne se double pas à l\'écran, un « Lu » refusé se dit, rien du compteur global ne fuit, le silence d\'un flux se détecte');
    {
      /* D1 — la réponse du service se perd ET le flux est coupé (le cas d'un relais qui avale tout) : l'envoi repart de la file, réussit, et l'écran ne montre à AUCUN moment
         le vrai message PLUS sa copie « en attente ». Chaque redessin demandé par la source est photographié à l'instant où il est demandé. */
      const photos = [];
      const arret = A.src.ecouter(ev => { if (ev.type === 'conversation' && ev.id === conv) photos.push(A.src.ouvrir(conv)); });
      A.reseau.fluxBloque = true; for (const i of A.reseau.instances) { try { i._ctrl && i._ctrl.abort(); } catch (e) {} }
      A.reseau.perdre = /POST .*\/messages$/;
      const pd = await A.src.envoyer(conv, { texte: 'réponse perdue, flux coupé' });
      vrai('population : l\'envoi est « en attente » (la réponse s\'est perdue, le flux est coupé : rien ne dit à la page que le service l\'a reçu)', pd.attente === true && A.src.enAttente() === 1);
      vrai('le renvoi (même cid) réussit et la file se vide', await att(() => A.src.enAttente() === 0));
      await T.dort(150);
      A.reseau.fluxBloque = false; arret();
      const vues = await Promise.all(photos);
      const exemplaires = vues.map(o => o.messages.filter(m => m.texte === 'réponse perdue, flux coupé').length);
      vrai('population : au moins deux redessins ont eu lieu pendant l\'épisode (celui de la mise en attente, celui du renvoi réussi)', vues.length >= 2 && exemplaires.includes(1));
      v('⛔ D1 : à AUCUN redessin le message ne paraît deux fois (le vrai + sa copie « En attente de connexion… »)', exemplaires.filter(n => n > 1).length, 0);
      vrai('et une fois le service revu, il est chez Bruno une seule fois, chez Alice une seule fois et plus « en attente »', await att(async () => (await B.src.ouvrir(conv)).messages.filter(m => m.texte === 'réponse perdue, flux coupé').length === 1) && (await A.src.ouvrir(conv)).messages.filter(m => m.texte === 'réponse perdue, flux coupé' && !m.attente).length === 1);

      /* G1 / D8 — combien de messages n'ont pas quitté l'appareil : c'est ce que la page DIT avant de les perdre */
      v('population : rien n\'est en attente chez Bruno avant la coupure', B.src.enAttente(), 0);
      B.couper();
      await B.src.envoyer(conv, { texte: 'jamais parti 1' }); await B.src.envoyer(conv, { texte: 'jamais parti 2' });
      v('⛔ G1 : `enAttente()` compte les messages qui n\'ont pas quitté l\'appareil (la page le dit à la déconnexion et à la fermeture)', B.src.enAttente(), 2);
      B.rendre();
      vrai('et le compte retombe à zéro quand ils sont partis', await att(() => B.src.enAttente() === 0));
      vrai('rien perdu : Alice a reçu les deux', await att(async () => ids((await A.src.ouvrir(conv)).messages).filter(t => /jamais parti/.test(t)).length === 2));

      /* G2 — un « Lu » refusé se DIT (429, 503), une coupure ou une session morte ont leur propre écran */
      await B.src.ouvrir(conv);
      await A.src.envoyer(conv, { texte: 'à lire (Lu refusé)' });
      vrai('population : Bruno a reçu le message d\'Alice (de quoi marquer lu)', await att(async () => ids((await B.src.ouvrir(conv)).messages).includes('à lire (Lu refusé)')));
      B.reseau.forcer = /POST .*\/lu$/;
      const eLu = await attrape(B.src.marquerLu(conv));
      const avLu = await B.attendreEv(e => e.type === 'avis' && /accusé de lecture/.test(e.texte), 3000);
      B.reseau.forcer = null;
      vrai('⛔ G2 : « Lu » refusé par le service (429) : l\'erreur remonte ET la source DIT un avis, avec sa phrase et l\'attente', !!eLu && eLu.code === 'quota_atteint' && !!avLu && /réessaie dans 40 s/.test(avLu.texte));
      B.reseau.forcer = /POST .*\/lu$/; B.reseau.forcerReponse = [503, { error: 'disque_plein' }];
      const nAv = B.evs.filter(e => e.type === 'avis').length;
      const eLu2 = await attrape(B.src.marquerLu(conv));
      B.reseau.forcer = null; B.reseau.forcerReponse = null;
      vrai('⛔ G2 : même chose sur une panne du service (503 « disque_plein ») — jamais un silence', !!eLu2 && eLu2.code === 'disque_plein' && B.evs.filter(e => e.type === 'avis').length === nAv + 1);
      const nAv2 = B.evs.filter(e => e.type === 'avis').length;
      B.couper(); const eLu3 = await attrape(B.src.marquerLu(conv)); B.rendre();
      vrai('une COUPURE n\'ajoute pas d\'avis par-dessus le bandeau « Connexion perdue » (c\'est lui qui parle)', !!eLu3 && eLu3.code === 'reseau' && B.evs.filter(e => e.type === 'avis').length === nAv2);
      await B.src.marquerLu(conv);
      vrai('et une réussite suivante arrive : Alice voit « Lu » (le refus d\'avant n\'a rien laissé)', await att(async () => { const o = await A.src.ouvrir(conv); const m = o.messages.find(x => x.texte === 'à lire (Lu refusé)'); return !!m && !!m.lu; }));

      /* G3 — le compteur GLOBAL du journal ne fuit pas : une personne sans lien avec personne ne voit pas le service travailler */
      const D = await T.connecter(svc, og, 'dora', 'pw-dora-12345');
      const g0 = (await D.get('/api/sync')).j.gid;
      for (let i = 0; i < 3; i++) await A.src.envoyer(conv, { texte: 'bruit de fond ' + i });
      await att(async () => ids((await B.src.ouvrir(conv)).messages).includes('bruit de fond 2'));
      const g1 = (await D.get('/api/sync')).j.gid;
      const gA = (await A.nav.fetch(svc.base + '/api/sync').then(r => r.json())).gid;
      vrai('population : le journal a avancé pour ceux que ça concerne (le dernier identifiant d\'Alice dépasse celui de Dora)', gA > g0);
      v('⛔ G3 : Dora (aucun lien) lit le MÊME identifiant avant et après trois messages écrits ailleurs — plus de compteur global', [g0, g1], [g0, g0]);
      const fD = await T.flux(D);
      const bj = await fD.attendre(e => e.event === 'bonjour');
      v('⛔ G3 : le « bonjour » du flux ne dit pas non plus le compteur global (même valeur que /api/sync)', bj.data.gid, g0);
      v('et il porte le rythme des pulsations (de quoi détecter un silence)', bj.data.pouls_ms, 400);
      fD.fermer();
      const resync = await T.flux(D, { lastEventId: 999999 });
      const rs = await resync.attendre(e => e.event === 'resync');
      v('⛔ G3 : « resync » ne dit pas le compteur global non plus', rs && rs.data.gid, g0);
      resync.fermer();

      /* D7 — l'aperçu d'un groupe nomme l'auteur même s'il n'est pas dans mes contacts */
      const gr = await A.src.creerGroupe({ nom: 'Inconnus entre eux', membres: [mb.id, mc.id] });
      await B.src.lister(true);
      await B.src.envoyer(gr.id, { texte: 'bonjour de Bruno' });
      const aperC = await att(async () => { const l = await C.src.lister(true); const c = l.find(x => x.id === gr.id); return c && /bonjour de Bruno/.test(c.apercu) ? c.apercu : null; }, 6000);
      vrai('population : Chloé n\'a Bruno ni dans ses contacts (la liste est la seule source du nom)', !C.src.contacts().some(c => c.nom === 'Bruno Petit'));
      v('⛔ D7 : Chloé lit « Bruno : … » dans l\'aperçu de la liste, pas « Quelqu\'un : … »', aperC, 'Bruno : bonjour de Bruno');

      /* G6 — un lien de groupe garde plusieurs usages (une invitation s'envoie à plusieurs) ; celui d'un contact n'en a qu'un (testé plus haut) */
      const lg2 = await A.src.lienGroupe(gr.id);
      const ap2 = await D.post('/api/liens/lire', { code: lg2.code });
      vrai('un lien de GROUPE se lit encore (plusieurs usages : c\'est une invitation, pas une poignée de main)', ap2.code === 200 && ap2.j.apercu.genre === 'groupe');

      /* D3 — une connexion à moitié morte : ouverte, muette, jamais d'erreur. La page la tient pour morte au bout de 2,5 pulsations, le DIT, rouvre avec Last-Event-ID */
      const n0 = B.reseau.instances.length, i0 = B.evs.length;   // i0 : on ne lit QUE les événements d'après (une coupure plus haut a déjà dit « perdu » puis « ok »)
      const apres = (pred, ms) => att(() => B.evs.slice(i0).find(pred) || null, ms);
      B.rendreMuet();
      await A.src.envoyer(conv, { texte: 'pendant le silence' });
      await T.dort(300);
      vrai('population : la connexion muette ne livre rien — 300 ms après, Bruno n\'a PAS le message (elle est ouverte, aucune erreur, aucune trame)', !ids((await B.src.ouvrir(conv)).messages).includes('pendant le silence') && B.reseau.instances.length === n0);
      const perdu = await apres(e => e.type === 'reseau' && e.etat === 'perdu', 8000);
      vrai('⛔ D3 : le silence est détecté au bout de quelques pulsations SANS qu\'aucune erreur ne soit venue : « reseau perdu » est dit (le bandeau paraît)', !!perdu);
      vrai('⛔ D3 : la page a rouvert un flux (une instance de plus)', await att(() => B.reseau.instances.length > n0));
      vrai('⛔ D3 : le message d\'avant la détection est REJOUÉ (Last-Event-ID) une seule fois, et « reseau ok » est dit', await att(async () => ids((await B.src.ouvrir(conv)).messages).filter(t => t === 'pendant le silence').length === 1, 10000) && !!(await apres(e => e.type === 'reseau' && e.etat === 'ok', 6000)));
      await A.src.envoyer(conv, { texte: 'vu à l\'instant' });
      await att(async () => ids((await B.src.ouvrir(conv)).messages).includes('vu à l\'instant'));
      v('⛔ D3 : `reveiller()` sur un flux SAIN ne le rouvre pas (une pulsation récente : rouvrir à chaque changement d\'onglet userait les cinq flux par personne)', B.src.reveiller(false), false);
      const n1 = B.reseau.instances.length;
      v('⛔ D3 : `reveiller(true)` (le réseau a changé) rouvre toujours', [B.src.reveiller(true), B.reseau.instances.length], [true, n1 + 1]);
      vrai('et rien n\'est perdu ni doublé par ces réouvertures : chacun des textes de cette section paraît UNE fois chez les deux, dans le même ordre', await (async () => {
        await T.dort(500);
        const mien = t => /^(réponse perdue, flux coupé|jamais parti|à lire \(Lu refusé\)|bruit de fond|pendant le silence|vu à l'instant)/.test(t);
        const a = ids((await A.src.ouvrir(conv)).messages).filter(mien), b = ids((await B.src.ouvrir(conv)).messages).filter(mien);
        return a.length === 9 && a.length === new Set(a).size && a.join('|') === b.join('|');
      })());
    }

    /* ══ 9. LA SESSION MEURT : COUPÉE, AUTRE PERSONNE, DÉCONNEXION ════════════════════════════════════════════════════════ */
    console.log('\nLa session meurt : accès coupé depuis la Tour, autre personne dans le même navigateur, déconnexion qui échoue');
    {
      const ZA = monter(svc); await ZA.entrer('dora', 'pw-dora-12345');
      og.comptes.dora.actif = false;
      vrai('⛔ ACCÈS COUPÉ DEPUIS LA TOUR : le module le DIT (une fois) — la page repart de zéro', !!(await att(() => ZA.morts.length >= 1, 10000)) && ZA.morts[0] === 'session_requise');
      await T.dort(300);
      v('une seule fois (pas de boucle de « session morte »)', ZA.morts.length, 1);
      const rentre = await attrape(ZA.src.connexion('dora', 'pw-dora-12345'));
      v('⛔ rentrer avec le bon mot de passe : « acces_coupe » dit (la phrase que l\'écran de connexion montre)', rentre && rentre.code, 'acces_coupe');
      og.comptes.dora.actif = true;
      /* une autre personne dans le même navigateur */
      const ZB = monter(svc); await ZB.entrer('dora', 'pw-dora-12345');
      const autre = T.client(svc.base); void autre;
      await ZB.src.connexion('alice', 'pw-alice-1234');   // le cookie est remplacé : le MÊME navigateur est maintenant Alice
      const ok = await ZB.src.verifierSession();
      vrai('⛔ UNE AUTRE PERSONNE dans le même navigateur : verifierSession() le voit (motif « identite »), la page repart de zéro', ok === false && ZB.morts.join() === 'identite');
      /* la déconnexion qui échoue */
      const ZC = monter(svc); await ZC.entrer('dora', 'pw-dora-12345');
      ZC.reseau.coupe = true;
      const eD = await attrape(ZC.src.deconnexion());
      ZC.reseau.coupe = false;
      vrai('⛔ une déconnexion qui ÉCHOUE le dit (« reseau ») et ne ferme PAS le flux : l\'écran n\'est pas laissé « connecté » sans temps réel', eD && eD.code === 'reseau' && ZC.reseau.instances.some(i => i.readyState !== 2));
      vrai('la session est toujours valable (rien n\'a été fermé à moitié)', (await ZC.src.verifierSession()) === true);
      const ok2 = await ZC.src.deconnexion();
      v('puis la déconnexion qui réussit ferme la session côté service', [ok2, (await attrape(OPMSG.creer({ base: svc.base, fetch: ZC.nav.fetch }).moi())).code], [true, 'session_requise']);
      ZA.src.arreter(); ZB.src.arreter(); ZC.src.arreter();
    }

    /* ══ 10. LE SERVICE REDÉMARRE AU MILIEU ══════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLe service redémarre au milieu d\'une conversation : le flux reprend, rien de perdu, rien en double');
    {
      const avant = ids((await B.src.ouvrir(conv)).messages).length;
      await svc.arreter(false);
      vrai('⛔ le service tombe : la page le sait (« reseau perdu »)', !!(await B.attendreEv(e => e.type === 'reseau' && e.etat === 'perdu' && B.evs.indexOf(e) > 0, 8000)));
      const enAttente = await A.src.envoyer(conv, { texte: 'envoyé pendant la panne du service' });
      vrai('un envoi pendant la panne : en attente, pas perdu', enAttente.attente === true);
      svc = await T.lancerService(Object.assign({}, optsSvc, { cle: svc.cle }));
      vrai('⛔ le service revient : le message part (même cid), Bruno le reçoit UNE fois, et son flux a repris SEUL', await att(async () => ids((await B.src.ouvrir(conv)).messages).filter(t => t === 'envoyé pendant la panne du service').length === 1, 15000));
      await T.dort(400);
      v('et le total n\'a gagné que ce message (aucun doublon après la reprise)', ids((await B.src.ouvrir(conv)).messages).length, avant + 1);
      vrai('Bruno RE-reçoit en direct après la reprise (le flux est vivant, pas seulement relu)', await (async () => { await A.src.envoyer(conv, { texte: 'après la reprise' }); return !!(await att(async () => ids((await B.src.ouvrir(conv)).messages).includes('après la reprise'), 8000)); })());
    }

    /* ══ 11. LA PORTE CONTRE LE VRAI OP GESTION ═════════════════════════════════════════════════════════════════════════ */
    const hasServer = fs.existsSync(path.join(T.RACINE, 'server', 'node_modules'));
    if (!hasServer) console.log('\n  — server/node_modules absent : la moitié « vrai OP GESTION » n\'est pas jouée (npm i dans server/)');
    else {
      console.log('\nLe VRAI OP GESTION : ouvrir, couper, rouvrir, supprimer un accès depuis la Tour — et le module le dit');
      const dossierOg = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-911-og-'));
      const portOg = await T.portLibre();
      const reel = await lancerOpGestion(dossierOg, portOg);
      let svc2 = null;
      try {
        const tour = await json(reel.base, 'POST', '/api/monitor/login', { nom: 'Patron', pass: 'mot-de-passe-de-la-tour-banc' });
        const H = { Authorization: 'Bearer ' + tour.j.token };
        const ouvrirAcces = async (login, pass, nom) => (await json(reel.base, 'POST', '/api/monitor/beta', { login, pass, nom, chantier: 'banc 911', apps: ['messages'] }, H)).j.compte;
        const ca = await ouvrirAcces('alice', 'pw-alice-reel1', 'Alice Réelle'), cb = await ouvrirAcces('bruno', 'pw-bruno-reel1', 'Bruno Réel');
        vrai('population : deux accès ouverts depuis la Tour (la vraie route)', !!(ca && cb && ca.id && cb.id));
        svc2 = await T.lancerService({ urlGestion: reel.base, horloge: true, config: { pulsationMs: 400, presenceGraceMs: 300, beta: { relectureMs: 250, timeoutMs: 1500 } } });
        const RA = monter(svc2), RB = monter(svc2);
        const ra = await RA.entrer('alice', 'pw-alice-reel1'), rb = await RB.entrer('bruno', 'pw-bruno-reel1');
        v('la VRAIE réponse d\'OP GESTION donne le nom de la personne', [ra.nom, rb.nom], ['Alice Réelle', 'Bruno Réel']);
        const l = await RA.src.lienContact(); const r = await RB.src.accepterLien(l.code);
        await RA.src.envoyer(r.conv, { texte: 'bonjour depuis le vrai OP GESTION' });
        vrai('⛔ la messagerie marche derrière la VRAIE porte : le message arrive chez Bruno', !!(await RB.attendreEv(e => e.type === 'arrivee')) && ids((await RB.src.ouvrir(r.conv)).messages).includes('bonjour depuis le vrai OP GESTION'));
        const tog = await json(reel.base, 'POST', '/api/monitor/beta/toggle', { id: ca.id }, H);
        v('la Tour COUPE l\'accès d\'Alice', [tog.code, tog.j.actif], [200, false]);
        vrai('⛔ la page d\'Alice est prévenue SANS rien faire (flux fermé → session coupée → le module le dit)', !!(await att(() => RA.morts.length >= 1, 12000)) && RA.morts[0] === 'session_requise');
        const e = await attrape(RA.src.connexion('alice', 'pw-alice-reel1'));
        v('⛔ elle retente avec le bon mot de passe : « acces_coupe » (le VRAI message d\'OP GESTION est reconnu) dit', e && e.code, 'acces_coupe');
        vrai('Bruno, lui, continue : sa session est intacte', (await RB.src.verifierSession()) === true && RB.morts.length === 0);
        await json(reel.base, 'POST', '/api/monitor/beta/toggle', { id: ca.id }, H);
        vrai('rouvert depuis la Tour, elle rentre (et c\'est la MÊME personne : sa conversation est là)', await (async () => { const RA2 = monter(svc2); await RA2.entrer('alice', 'pw-alice-reel1'); const o = await RA2.src.ouvrir(r.conv); RA2.src.arreter(); return !!o && ids(o.messages).includes('bonjour depuis le vrai OP GESTION'); })());
        await json(reel.base, 'POST', '/api/monitor/beta/delete', { id: cb.id }, H);
        vrai('⛔ SUPPRIMÉ depuis la Tour, Bruno est prévenu aussi (« ouvert:false » pour un accès inconnu)', !!(await att(() => RB.morts.length >= 1, 12000)));
        RA.src.arreter(); RB.src.arreter();
      } finally { if (svc2) await svc2.arreter(); reel.tuer(); try { fs.rmSync(dossierOg, { recursive: true, force: true }); } catch (e) {} }
    }

    /* ══ 12. UN 429 DU SERVICE DIT QUAND RÉESSAYER ═══════════════════════════════════════════════════════════════════════ */
    console.log('\nUn plafond du service (60 messages par minute) arrive à l\'écran avec son attente');
    {
      const svc3 = await T.lancerService({ urlGestion: og.url, config: { quotas: { msg: { max: 3, fenetreMs: 60000 } } } });
      try {
        const P = monter(svc3); await P.entrer('dora', 'pw-dora-12345');
        const Q = monter(svc3); await Q.entrer('eve', 'pw-eve-123456');
        const lc = await P.src.lienContact(); const rr = await Q.src.accepterLien(lc.code);
        for (let i = 0; i < 3; i++) await P.src.envoyer(rr.conv, { texte: 'ok ' + i });
        const e = await attrape(P.src.envoyer(rr.conv, { texte: 'trop' }));
        vrai('⛔ le 4e message en une minute : « quota_atteint » (429) dit AVEC l\'attente (« réessaie dans … ») — et ce n\'est pas une coupure : il n\'est PAS mis en file', e && e.code === 'quota_atteint' && e.statut === 429 && e.retry >= 1 && /réessaie dans/.test(e.phrase()));
        v('et la conversation n\'a pas gardé de message « en attente » fantôme', (await P.src.ouvrir(rr.conv)).messages.filter(m => m.attente).length, 0);
        P.src.arreter(); Q.src.arreter();
      } finally { await svc3.arreter(); }
    }
    for (const x of [A, B, C]) x.src.arreter();
    void fermes;
  } catch (e) {
    console.log('  ✗ le banc est mort : ' + (e && e.stack || e));
    console.log(svc.sortie.texte().slice(-1500));
    process.exitCode = 1;
  }
  await svc.arreter(); await og.fermer();
  try { fs.rmSync(racine, { recursive: true, force: true }); } catch (e) {}
  fin();
})();

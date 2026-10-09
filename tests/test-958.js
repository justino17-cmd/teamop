/* ⛔ CE QUE CE FICHIER GARDE — L'APPAREIL ET LE SERVICE SE PARLENT, POUR LES NOTIFICATIONS, L'EXPORT ET LA SUPPRESSION (famille 4, modèle `test-911`).

   Les VRAIES fonctions de `server-msg/public/api.js` et de `server-msg/public/source-serveur.js` sont exécutées dans Node contre le VRAI service (et un faux service push, `OPMSG_TEST_PUSH`).
   Le NAVIGATEUR est remplacé par l'adaptateur que le module prévoit pour cela (`options.navigateur`) : permission, enregistrement du service worker, abonnement push, visibilité de la
   page, message du service worker — un faux qui note ce qu'on lui demande, et dont l'abonnement est un vrai appareil de banc (clés P-256 : ce que le service chiffre se déchiffre).

   Ce qu'il garde, et que ni `test-956` (le service seul) ni la sonde (le DOM) ne voient :
     · CHAQUE ÉTAT OÙ L'INTERRUPTEUR NE PEUT PAS TOURNER DIT POURQUOI (iPhone hors écran d'accueil, navigateur sans push, autorisation refusée) — et ne touche à rien : pas de demande
       d'autorisation, pas d'enregistrement ; une autorisation non donnée (fenêtre fermée, refus) laisse l'état d'avant ;
     · ACTIVER : l'autorisation, l'enregistrement, l'abonnement, PUIS le service — et un abonnement que le service refuse est défait côté navigateur (l'interrupteur ne ment pas) ; un
       abonnement fait avec une autre clé est remplacé ; DÉSACTIVER : le service d'abord (s'il refuse, rien ne change, l'erreur se dit) ; l'aperçu ; l'essai dit combien l'ont reçu ;
     · AU DÉMARRAGE un abonnement que ce navigateur porte déjà est redit au service — et RIEN n'est créé sans demande (ni autorisation demandée, ni enregistrement) ;
     · SE DÉCONNECTER emporte l'abonnement de CE navigateur (dans la même requête que la session) ; « Déconnecter les autres appareils » garde le sien ;
     · L'ACQUITTEMENT : une page VISIBLE acquitte ce qu'elle montre (une rafale = UNE requête, le plus grand identifiant), une page cachée n'acquitte pas — et la notification part ;
     · UNE NOTIFICATION TOUCHÉE ouvre sa conversation, et seulement une adresse de CETTE forme ; la sourdine ; l'export (un fichier, un par jour) ;
     · LA SUPPRESSION : la demande qui court ne fait pas crier « session morte » quand le service ferme le flux ; refusée, elle laisse le module comme avant ; se reconnecter l'ANNULE
       et la connexion le dit ; un compte supprimé s'appelle « Compte supprimé » partout (liste, conversation, infos, groupe) et on n'y écrit plus (phrase du 410).
   Toute attente est au GESTE (on sonde la condition), jamais au chronomètre ; les négatifs se prouvent par SENTINELLE. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const P = require('./outils-push');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const attrape = async (p) => { try { await p; return null; } catch (e) { return e; } };
const att = (cond, ms = 8000) => T.attendre(cond, ms, 10);
const ACK_MS = 1500;

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (180 s)'); process.exit(1); }, 180000).unref();

(async () => {
  const MDP = { alice: 'pw-alice-1234', bob: 'pw-bob-123456', cleo: 'pw-cleo-12345', dan: 'pw-dan-123456' };
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MDP).map(k => [k, { pass: MDP[k], nom: k[0].toUpperCase() + k.slice(1) + ' Banc', actif: true }])));
  const fps = await P.fauxServicePush();
  const svc = await T.lancerService({ urlGestion: og.url, env: { OPMSG_TEST_PUSH: fps.hote }, config: { push: { ackMs: ACK_MS, echecsMax: 2, contact: 'mailto:exploitation@exemple.invalid' } } });
  const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
  const sql = (req, ...args) => { const d = T.lireBase(path.join(svc.data, 'msg.db')); try { return d.prepare(req).get(...args); } finally { d.close(); } };
  const abosDe = (uid) => sql('SELECT COUNT(*) AS n FROM push WHERE uid = ?', uid).n;
  const sources = [], fluxOuverts = [];
  let numSub = 0, numCid = 0;
  const cid = () => 'cid-958-' + String(++numCid).padStart(6, '0');

  /* ── un faux NAVIGATEUR : l'adaptateur du module, qui note tout ce qu'on lui demande. Son abonnement est un vrai appareil (clés P-256) inscrit chez le faux service push. ── */
  function faux(o) {
    o = o || {};
    const e = { ok: o.ok !== false, raison: o.raison || null, permission: o.permission || 'default', reponse: o.reponse || 'granted', sub: o.sub || null, visible: true, demandes: 0, enregistrements: 0,
      souscriptions: 0, refuseSouscrire: false, desinscriptions: 0, ecouteurs: [] };
    const creerSub = (cle, endpoint) => {
      const app = P.appareil(endpoint || fps.endpoint('nav-' + (++numSub)));
      const sub = { endpoint: app.sub.endpoint, cle, app, toJSON: () => ({ endpoint: app.sub.endpoint, keys: app.sub.keys }), unsubscribe: async () => { e.desinscriptions++; if (e.sub === sub) e.sub = null; return true; } };
      return sub;
    };
    const registration = { pushManager: { getSubscription: async () => e.sub } };
    const nav = {
      priseEnCharge: () => e.ok ? { ok: true, raison: null } : { ok: false, raison: e.raison },
      permission: () => e.permission,
      demander: async () => { e.demandes++; if (e.permission === 'default') e.permission = e.reponse === 'granted' ? 'granted' : e.reponse === 'denied' ? 'denied' : 'default'; return e.reponse; },
      enregistrer: async () => { e.enregistrements++; return registration; },
      abonnementActuel: async () => e.sub,
      souscrire: async (reg, cle) => { e.souscriptions++; if (e.refuseSouscrire) throw new Error('push service error'); e.sub = creerSub(cle, e.endpointForce); return e.sub; },
      cleDe: (sub) => sub.cle,
      visible: () => e.visible,
      surMessage: (cb) => { e.ecouteurs.push(cb); },
    };
    return Object.assign(e, { nav, creerSub, dire: (d) => e.ecouteurs.forEach(f => f(d)) });
  }

  /* ── un « appareil » : un navigateur de poche (cookie, Origin) dont on note les requêtes, qu'on peut faire refuser ou RETARDER, et dont le flux dit les identifiants d'événement ── */
  function monter(opts) {
    const nav = T.navigateur(svc.base);
    const reseau = { requetes: [], forcer: null, retarder: null, gids: [], dernier: null, retenu: null };
    const f = async (url, init) => {
      const u = String(url), m = (init && init.method) || 'GET', chemin = u.replace(svc.base, '').split('?')[0];
      reseau.requetes.push({ m, chemin, corps: init && init.body });
      if (reseau.forcer && reseau.forcer.re.test(m + ' ' + chemin)) return new Response(JSON.stringify({ error: reseau.forcer.erreur || 'erreur_interne' }), { status: reseau.forcer.code || 503, headers: { 'Content-Type': 'application/json' } });
      const r = await nav.fetch(url, init);
      if (reseau.retarder && reseau.retarder.test(m + ' ' + chemin)) await T.dort(450);          // la réponse est RETENUE : le service a déjà agi, l'appareil ne le sait pas encore
      return r;
    };
    class ES extends nav.EventSource {
      /* `retenu` : le flux est TENU (tout évènement daté s'empile, de quelque type qu'il soit) jusqu'à ce que le banc le relâche d'un bloc — une rafale qui arrive ensemble, au geste et non au chronomètre */
      _emettre(t, ev) { if (reseau.retenu && ev && ev.lastEventId) { reseau.retenu.push([this, t, ev]); return; } if (t === 'message' && ev && ev.lastEventId) { reseau.gids.push(parseInt(ev.lastEventId, 10)); reseau.dernier = { es: this, ev }; } return super._emettre(t, ev); }
    }
    const src = creerSourceServeur(Object.assign({ OPMSG, base: svc.base, fetch: f, EventSource: ES, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5, delaiAckMs: 60 }, opts));
    const evs = [], morts = [];
    src.ecouter(e => evs.push(e));
    src.surSessionMorte(m => morts.push(m));
    sources.push(src);
    return { src, evs, morts, reseau, nav,
      async entrer(login) { const m = await src.connexion(login, MDP[login]); const d = await src.demarrer(); if (!d.connecte) throw new Error('démarrage refusé : ' + JSON.stringify(d)); return Object.assign({}, src.moi(), { retour: m }); },
      requetes: (re) => reseau.requetes.filter(r => re.test(r.m + ' ' + r.chemin)) };
  }
  /* des personnes « brutes » (sans module) pour écrire aux autres */
  const brut = async (login) => T.connecter(svc, og, login, MDP[login]);
  const relier = async (x, y) => { const l = await x.post('/api/contacts/lien', {}); const r = await y.post('/api/liens/accepter', { code: l.j.code }); if (r.code !== 200) throw new Error('lien refusé'); };
  const ecrire = async (c, conv, texte) => { const r = await c.post('/api/conversations/' + conv + '/messages', { cid: cid(), texte }); if (r.code !== 201) throw new Error('message refusé ' + r.code); return r.j; };
  const recus = (sub) => fps.envois.filter(e => e.chemin === new URL(sub.endpoint).pathname);

  try {
    const Bob = await brut('bob'), Cleo = await brut('cleo'), Dan = await brut('dan');

    /* ═══ 1. LES ÉTATS OÙ L'INTERRUPTEUR NE PEUT PAS TOURNER ═══════════════════════════════════════════════════════════════════════════ */
    console.log('Chaque état où l\'interrupteur ne peut pas tourner DIT pourquoi — et ne touche à rien');
    {
      const cas = [
        ['iPhone hors écran d\'accueil', faux({ ok: false, raison: 'ios' }), 'ios', /écran d'accueil/, /rouvre-le depuis son icône/],
        ['navigateur sans notifications', faux({ ok: false, raison: 'navigateur' }), 'navigateur', /ne sait pas recevoir/, /Chrome|Firefox/],
        ['autorisation refusée par le navigateur', faux({ permission: 'denied' }), 'refusee', /refusé les notifications/, /cadenas/],
      ];
      for (const [titre, f, raison, re1, re2] of cas) {
        const a = monter({ navigateur: f.nav });
        await a.entrer('alice');
        const etat = await a.src.notifEtat();
        v(titre + ' : l\'état dit « impossible », pourquoi, et la phrase explique comment en sortir', [etat.possible, etat.raison, etat.active, re1.test(etat.phrase), re2.test(etat.phrase)], [false, raison, false, true, true]);
        const er = await attrape(a.src.notifActiver());
        v('⛔ ' + titre + ' : essayer d\'activer REFUSE avec la même phrase, et ne demande rien, n\'enregistre rien, n\'abonne personne', [er && er.dit, er && er.phrase(), f.demandes, f.enregistrements, f.souscriptions, abosDe(a.src.moi().id)], [true, etat.phrase, 0, 0, 0, 0]);
        a.src.arreter();
      }
    }
    {
      /* une clé VAPID absente : on simule la réponse de /api/config d'un service dont le push est coupé */
      const f = faux();
      const nav = T.navigateur(svc.base);
      const fetchSansCle = async (url, init) => {
        const r = await nav.fetch(url, init);
        if (String(url).endsWith('/api/config')) { const j = await r.json(); j.push = { vapid: null }; return new Response(JSON.stringify(j), { status: 200, headers: { 'Content-Type': 'application/json' } }); }
        return r;
      };
      const src = creerSourceServeur({ OPMSG, base: svc.base, fetch: fetchSansCle, EventSource: nav.EventSource, navigateur: f.nav, attente: () => 60, delaiRelireMs: 5 });
      sources.push(src);
      await src.connexion('alice', MDP.alice); await src.demarrer();
      const etat = await src.notifEtat();
      const er = await attrape(src.notifActiver());
      v('⛔ un service dont le push est coupé (pas de clé publiée) : « pas disponible pour le moment », aucune autorisation demandée', [etat.possible, etat.raison, /pas disponibles pour le moment/.test(etat.phrase), er && er.phrase() === etat.phrase, f.demandes, f.enregistrements], [false, 'service', true, true, 0, 0]);
      src.arreter();
    }

    /* ═══ 2. ACTIVER, L'ESSAI, L'APERÇU, DÉSACTIVER ═══════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nActiver : l\'autorisation, l\'abonnement, PUIS le service ; l\'essai ; l\'aperçu ; désactiver');
    const fa = faux({ permission: 'default', reponse: 'granted' });
    const A = monter({ navigateur: fa.nav });
    const moiA = await A.entrer('alice');
    const idA = moiA.id;
    {
      const e0 = await A.src.notifEtat();
      v('au départ : possible, pas encore autorisé, pas activé, aperçu coupé, aucune phrase', [e0.possible, e0.raison, e0.permission, e0.active, e0.apercu, e0.phrase], [true, null, 'default', false, false, '']);
      v('⛔ RIEN n\'a été demandé ni enregistré au démarrage (jamais d\'abonnement sans demande de la personne)', [fa.demandes, fa.enregistrements, fa.souscriptions, abosDe(idA)], [0, 0, 0, 0]);
      const e1 = await A.src.notifActiver();
      v('⛔ activer : l\'autorisation est demandée UNE fois, le navigateur s\'abonne, le service inscrit l\'appareil — l\'état rendu est celui RELU', [fa.demandes, fa.enregistrements, fa.souscriptions, abosDe(idA), e1.possible, e1.permission, e1.active], [1, 1, 1, 1, true, 'granted', true]);
      v('la requête d\'abonnement part avec le point d\'accès et les clés du navigateur', (() => { const r = A.requetes(/POST \/api\/push\/abonner/)[0]; const j = JSON.parse(r.corps); return [j.sub.endpoint === fa.sub.endpoint, j.sub.keys.p256dh === fa.sub.app.sub.keys.p256dh, j.sub.keys.auth === fa.sub.app.sub.keys.auth]; })(), [true, true, true]);

      const es = await A.src.notifEssai();
      v('⛔ l\'essai dit combien d\'appareils l\'ont reçu', es, { appareils: 1, envoyes: 1 });
      const recu = recus(fa.sub);
      vrai('population : le faux service push a reçu la requête, au point d\'accès du navigateur', recu.length === 1);
      v('et ce qui part se déchiffre avec les clés de CE navigateur (RFC 8291) : une notification d\'essai', JSON.parse(P.dechiffrer(fa.sub.app, recu[0].corps)).type, 'essai');

      const e2 = await A.src.notifApercu(true);
      v('⛔ l\'aperçu : le service retient le réglage, l\'état rendu le dit', [e2.apercu, JSON.parse(sql('SELECT prefs FROM personne WHERE id = ?', idA).prefs).apercu_notif], [true, true]);
      const e3 = await A.src.notifApercu(false);
      v('et se retire', [e3.apercu, JSON.parse(sql('SELECT prefs FROM personne WHERE id = ?', idA).prefs).apercu_notif], [false, false]);

      /* désactiver : le service d'abord */
      A.reseau.forcer = { re: /POST \/api\/push\/desabonner/, code: 503, erreur: 'push_indisponible' };
      const er = await attrape(A.src.notifDesactiver());
      v('⛔ le service refuse de désabonner : l\'erreur se DIT, rien n\'a changé (le navigateur garde son abonnement, le service aussi)', [er && er.dit, er && er.code, !!fa.sub, abosDe(idA), (await A.src.notifEtat()).active], [true, 'push_indisponible', true, 1, true]);
      A.reseau.forcer = null;
      const sub = fa.sub;
      const e4 = await A.src.notifDesactiver();
      v('désactiver : le service retire l\'appareil, le navigateur se désabonne, l\'état rendu est relu', [abosDe(idA), fa.sub, sub && fa.desinscriptions, e4.active, e4.possible], [0, null, 1, false, true]);
      v('plus rien ne part : un essai dit « aucun appareil »', await A.src.notifEssai(), { appareils: 0, envoyes: 0 });
    }

    /* ═══ 3. LES REFUS DE L'AUTORISATION, DU NAVIGATEUR, DU SERVICE ══════════════════════════════════════════════════════════════════ */
    console.log('\nLes refus : la fenêtre fermée, l\'autorisation refusée, le navigateur qui échoue, le service qui refuse');
    {
      const f1 = faux({ permission: 'default', reponse: 'default' });
      const a = monter({ navigateur: f1.nav }); await a.entrer('alice');
      const e1 = await attrape(a.src.notifActiver());
      v('⛔ la fenêtre d\'autorisation fermée sans réponse : « tu n\'as pas répondu », rien n\'est abonné, l\'état est celui d\'avant', [e1 && e1.phrase(), f1.souscriptions, abosDe(idA), f1.permission], ['Tu n\'as pas répondu à la demande d\'autorisation : les notifications restent désactivées.', 0, 0, 'default']);
      f1.reponse = 'denied';
      const e2 = await attrape(a.src.notifActiver());
      v('⛔ l\'autorisation REFUSÉE dans la fenêtre : la phrase dit comment la rouvrir, et l\'état devient « refusée »', [/cadenas/.test(e2 && e2.phrase()), (await a.src.notifEtat()).raison, f1.souscriptions], [true, 'refusee', 0]);
      a.src.arreter();

      const f2 = faux({ permission: 'granted' });
      f2.refuseSouscrire = true;
      const b = monter({ navigateur: f2.nav }); await b.entrer('alice');
      const e3 = await attrape(b.src.notifActiver());
      v('⛔ le navigateur n\'arrive pas à s\'abonner : sa phrase, et le service n\'a rien reçu', [e3 && e3.phrase(), b.requetes(/push\/abonner/).length, abosDe(idA)], ['Ce navigateur n\'a pas pu s\'abonner au service de notification. Réessaie dans un moment.', 0, 0]);
      f2.refuseSouscrire = false;
      f2.endpointForce = 'https://evil.example/push/pirate';
      const e4 = await attrape(b.src.notifActiver());
      v('⛔ le SERVICE refuse le point d\'accès (service push non pris en charge) : sa phrase, et l\'abonnement du navigateur est DÉFAIT (l\'interrupteur ne ment pas)', [e4 && e4.code, e4 && e4.phrase(), f2.sub, f2.desinscriptions, abosDe(idA)], ['service_push_refuse', 'Le service de notification de ce navigateur n\'est pas pris en charge par OP MESSAGES.', null, 1, 0]);
      f2.endpointForce = null;
      /* un abonnement fait avec une AUTRE clé du service est remplacé */
      const ancienne = f2.creerSub('CLE-D-UNE-AUTRE-INSTALLATION', fps.endpoint('ancien'));
      f2.sub = ancienne;
      const e5 = await b.src.notifActiver();
      v('⛔ un abonnement fait avec une autre clé du service est défait et refait avec la bonne (sinon aucun envoi ne lui arriverait)', [ancienne === f2.sub, f2.desinscriptions, f2.sub.cle === (await T.client(svc.base).get('/api/config')).j.push.vapid, e5.active, abosDe(idA)], [false, 2, true, true, 1]);
      await b.src.notifDesactiver();
      b.src.arreter();
      A.src.arreter();            // la page de la section 2 se tait : une page visible de plus acquitterait à la place de celle qu'on observe en 5
    }

    /* ═══ 4. AU DÉMARRAGE, À LA DÉCONNEXION, « DÉCONNECTER LES AUTRES » ════════════════════════════════════════════════════════════════ */
    console.log('\nAu démarrage, à la déconnexion, « Déconnecter les autres appareils »');
    {
      /* un navigateur qui porte déjà un abonnement, permission accordée : le service l'ignore (retiré depuis) — il lui est redit au démarrage */
      const f = faux({ permission: 'granted' });
      f.sub = f.creerSub(f.cleDefaut || (await T.client(svc.base).get('/api/config')).j.push.vapid);
      const a = monter({ navigateur: f.nav });
      v('population : le service ne connaît pas encore ce navigateur', abosDe(idA), 0);
      await a.entrer('alice');
      const redit = await att(() => abosDe(idA) === 1);
      v('⛔ au démarrage, l\'abonnement que ce navigateur porte déjà est REDIT au service (sans rien demander à personne)', [!!redit, f.demandes, f.souscriptions], [true, 0, 0]);
      /* une personne autre sur le même navigateur : l'appareil suit son dernier utilisateur */
      const c = monter({ navigateur: f.nav }); await c.entrer('cleo');
      const suivi = await att(() => abosDe(idA) === 0);
      v('« un appareil, une personne » : une autre personne qui se connecte dans ce navigateur reçoit l\'appareil, Alice le perd', [!!suivi, abosDe(c.src.moi().id)], [true, 1]);
      c.src.arreter();
      a.src.arreter();
      await Cleo.post('/api/push/desabonner', { endpoint: f.sub.endpoint });
    }
    {
      /* jamais d'abonnement créé au démarrage : ni permission 'default', ni 'denied' */
      for (const permission of ['default', 'denied']) {
        const f = faux({ permission });
        const a = monter({ navigateur: f.nav }); await a.entrer('alice');
        await T.dort(150);
        v('⛔ permission « ' + permission + ' » : le démarrage n\'enregistre rien et ne demande rien', [f.demandes, f.enregistrements, f.souscriptions, a.requetes(/push\/abonner/).length], [0, 0, 0, 0]);
        a.src.arreter();
      }
    }
    {
      const f = faux({ permission: 'granted' });
      const a = monter({ navigateur: f.nav }); await a.entrer('alice');
      await a.src.notifActiver();
      const sub = f.sub;
      /* un appareil de plus (autre navigateur, même personne) */
      const f2 = faux({ permission: 'granted' });
      const b = monter({ navigateur: f2.nav }); await b.entrer('alice');
      await b.src.notifActiver();
      v('population : Alice a DEUX navigateurs abonnés', abosDe(idA), 2);
      const r = await b.src.deconnecterAutres();
      v('⛔ « Déconnecter les autres appareils » depuis le second : les notifications du premier partent, le sien reste', [r.notifications, abosDe(idA), (await b.src.notifEssai())], [1, 1, { appareils: 1, envoyes: 1 }]);
      await att(() => recus(f2.sub).length >= 1);
      vrai('(et la notification d\'essai est bien arrivée à celui qui est resté)', recus(f2.sub).length === 1 && recus(sub).length === 0);
      vrai('population : le premier navigateur a bien été déconnecté (sa session est coupée, le module le dit)', !!(await att(() => a.morts.length > 0)));
      /* la déconnexion emporte l'abonnement de CE navigateur, dans la même requête que la session */
      const subAvant = f2.sub;
      b.reseau.forcer = { re: /POST \/api\/compte\/deconnexion/, code: 503, erreur: 'erreur_interne' };
      const er = await attrape(b.src.deconnexion());
      v('⛔ le service refuse la déconnexion : le navigateur GARDE son abonnement (rien n\'a changé, l\'erreur se dit)', [er && er.dit, !!f2.sub, abosDe(idA), (await b.nav.fetch(svc.base + '/api/moi')).status], [true, true, 1, 200]);
      b.reseau.forcer = null;
      await b.src.deconnexion();
      const corps = JSON.parse(b.requetes(/POST \/api\/compte\/deconnexion/).pop().corps);
      v('⛔ se déconnecter retire l\'abonnement de CE navigateur : la requête porte son point d\'accès, le service l\'a retiré, le navigateur se désabonne', [corps.endpoint === subAvant.endpoint, abosDe(idA), f2.sub, f2.desinscriptions], [true, 0, null, 1]);
      a.src.arreter();
    }

    /* ═══ 5. L'ACQUITTEMENT : UNE PAGE VISIBLE ACQUITTE CE QU'ELLE MONTRE, UNE PAGE CACHÉE NON ═════════════════════════════════════════════ */
    console.log('\nL\'acquittement : visible, elle acquitte (une rafale = une requête) ; cachée, elle laisse partir la notification');
    const fm = faux({ permission: 'granted' });
    fm.visible = false;                 // ⛔ CACHÉE pendant la mise en place : rien de ce qui la précède (mises en relation, conversations créées) n'a d'acquittement en attente quand la rafale commence
    const M = monter({ navigateur: fm.nav, delaiAckMs: 120 });
    await M.entrer('alice');
    await M.src.notifActiver();
    {
      const alice = await brut('alice');
      await relier(alice, Bob); await relier(alice, Cleo);
      const AB = (await alice.post('/api/conversations/directe', { uid: Bob.moi.id })).j.conversation.id;
      const AC = (await alice.post('/api/conversations/directe', { uid: Cleo.moi.id })).j.conversation.id;
      await att(() => M.evs.some(e => e.type === 'liste'));
      /* ⛔ LE FLUX EST TENU AVANT QUE LA PAGE DEVIENNE VISIBLE (9 octobre 2026, run 632 de « Vérification des pages », sur main : 65 ✓ 1 ✗, vert ici cinq fois sur cinq). Un évènement
         d'AVANT la rafale (gid 2, la mise en place) avait encore sa minuterie d'acquittement en route quand le compteur repartait de zéro : la page l'acquittait seul, à juste titre, puis la
         rafale — deux requêtes (rejoué en étalant les écritures : 65 ✓ 1 ✗, la même ligne). La page reste donc CACHÉE pendant la mise en place (`fm.visible = false` plus haut). Et le banc
         pariait que huit écritures l'une après l'autre tiennent dans la minuterie de groupement (120 ms) : sur une machine chargée, elles s'étalent. Tout évènement daté est donc TENU pendant
         les écritures, puis relâché d'un bloc : ce qui traînait d'avant et les huit messages arrivent ensemble, ce que le contrôle suppose. La mutation C18 (huit minuteries au lieu d'une)
         reste visible : neuf évènements livrés d'un coup, une minuterie chacun, qui partent pendant que la première requête vole. */
      M.reseau.retenu = [];
      fm.visible = true;
      M.reseau.requetes.length = 0;
      /* ⛔ LA RÉPONSE DE L'ACQUITTEMENT EST RETENUE (450 ms) : la requête reste « en vol » — `ackEnvoye` n'est posé qu'à son retour. C'est ce qui sépare UNE minuterie de groupement de huit : avec huit minuteries,
         chacune qui se déclenche pendant que la première requête vole voit `g > ackEnvoye` (rien n'est encore « envoyé ») et part à son tour — plusieurs requêtes. Sans cette rétention, la garde du départ rattrapait
         la mutation C18 une fois sur deux sur une machine chargée (vu une fois sur six, 3 octobre 2026) : elle n'était « équivalente » que si la réponse revenait avant la minuterie suivante. */
      M.reseau.retarder = /POST \/api\/flux\/ack/;
      const tRafale = Date.now();
      for (let i = 0; i < 8; i++) await ecrire(Bob, AB, 'rafale ' + i);
      const tenus = await att(() => M.reseau.retenu && M.reseau.retenu.filter(x => x[1] === 'message').length >= 8 && M.reseau.retenu.length);
      const lot = M.reseau.retenu || []; M.reseau.retenu = null;
      for (const [es, t, ev] of lot) es._emettre(t, ev);
      vrai('population : le flux a tenu les huit messages de la rafale (' + tenus + ' évènements datés en tout), puis les a livrés d\'un bloc', tenus >= 8);
      const dernier = await att(() => M.reseau.gids.length >= 8 && M.reseau.gids[M.reseau.gids.length - 1]);
      const acks = await att(() => M.requetes(/POST \/api\/flux\/ack/).length >= 1 && M.requetes(/POST \/api\/flux\/ack/));
      vrai('population : la page a reçu les huit messages de la rafale', !!dernier && M.reseau.gids.length >= 8);
      await att(() => { const r = M.requetes(/POST \/api\/flux\/ack/); return r.length && JSON.parse(r[r.length - 1].corps).gid === dernier; });
      /* ⛔ « UNE requête » se compte APRÈS que toutes les minuteries qui devaient partir sont parties : la première requête vue ne dit rien des suivantes (huit minuteries se déclenchent à 4 ms d'écart, trace du
         3 octobre 2026). Plus de deux fois la minuterie de groupement (120 ms) : si une autre devait partir, elle serait partie. */
      await T.dort(300);
      const envoyes = M.requetes(/POST \/api\/flux\/ack/).map(r => JSON.parse(r.corps).gid);
      v('⛔ une rafale de huit messages = UNE requête d\'acquittement, avec le plus grand identifiant d\'événement — même quand la réponse est retenue (la requête est en vol)', [envoyes.length, envoyes[envoyes.length - 1] === dernier], [1, true]);
      await T.dort(700);                  // la réponse retenue arrive : l'identifiant est « envoyé » — c'est la suite du banc (le rejeu) qui compte dessus
      M.reseau.retarder = null;
      /* le MÊME évènement rejoué (une reconnexion qui rejoue ce que la page a déjà montré) : son identifiant est déjà acquitté, la page ne le redit pas. On laisse passer plus de quatre fois la minuterie
         de groupement (60 ms) : un acquittement du rejeu, s'il devait partir, serait parti. Puis un message NEUF sert de sentinelle — sans elle, « aucun acquittement » pourrait être celui d'une page morte ;
         et il ne doit pas suivre le rejeu de trop près, sinon les deux se grouperaient en UNE requête et la mutation passerait inaperçue (vu sur C12). */
      vrai('population : le dernier évènement de la rafale est gardé pour être rejoué', !!(M.reseau.dernier && M.reseau.dernier.ev.lastEventId));
      M.reseau.requetes.length = 0;
      M.reseau.dernier.es._emettre('message', M.reseau.dernier.ev);
      await T.dort(300);
      v('⛔ un évènement rejoué, déjà acquitté, n\'est PAS acquitté de nouveau : aucune requête d\'acquittement ne part', M.requetes(/POST \/api\/flux\/ack/).length, 0);
      /* ⛔ la sentinelle ouvre SA fenêtre : tant que celle de la rafale (ACK_MS côté service) est ouverte, un message de la même conversation s'y joint — et la notification, jugée à la FIN de cette fenêtre,
         attend l'acquittement de CE message, que la page n'a pas encore eu le temps d'envoyer (vu en ajoutant 300 ms de comptage plus haut : une notification de trop, 3 octobre 2026) */
      await T.dort(Math.max(0, tRafale + ACK_MS + 300 - Date.now()));
      await ecrire(Bob, AB, 'sentinelle du rejeu');
      await att(() => M.requetes(/POST \/api\/flux\/ack/).length >= 1);
      const apresRejeu = M.requetes(/POST \/api\/flux\/ack/).map(r => JSON.parse(r.corps).gid);
      v('   …et la page n\'est pas morte : le message neuf qui suit est acquitté, avec un identifiant plus grand', [apresRejeu.length, apresRejeu[0] > dernier], [1, true]);
      /* page cachée : Cléo écrit, la page n'acquitte pas, la notification arrive après le délai */
      fm.visible = false;
      M.reseau.requetes.length = 0;
      const avant = Date.now();
      await ecrire(Cleo, AC, 'pendant que la page est cachée');
      const p = await att(() => recus(fm.sub).find(e => JSON.parse(P.dechiffrer(fm.sub.app, e.corps)).url === '/#messages/' + AC) || null, 8000);
      vrai('⛔ page CACHÉE : aucune acquittement, et la notification part (après le délai du service : ' + (p ? p.t - avant : '?') + ' ms)', !!p && M.requetes(/POST \/api\/flux\/ack/).length === 0 && p.t - avant >= ACK_MS - 50);
      /* la page est visible, un message d'une conversation qu'elle montre : acquitté — la notification ne part pas (sentinelle : un dernier message, page cachée, d'une AUTRE conversation) */
      fm.visible = true;
      await ecrire(Bob, AB, 'sous les yeux');
      await att(() => M.requetes(/POST \/api\/flux\/ack/).length >= 1);
      fm.visible = false;
      await ecrire(Cleo, AC, 'sentinelle');
      await att(() => recus(fm.sub).filter(e => JSON.parse(P.dechiffrer(fm.sub.app, e.corps)).url === '/#messages/' + AC).length >= 2, 8000);
      const parConv = (id) => recus(fm.sub).filter(e => JSON.parse(P.dechiffrer(fm.sub.app, e.corps)).url === '/#messages/' + id).length;
      v('⛔ page VISIBLE : le message montré n\'a produit AUCUNE notification (la sentinelle, arrivée après lui, est là) ; la page cachée en a produit deux', [parConv(AB), parConv(AC)], [0, 2]);
      fm.visible = true;
    }

    /* ═══ 6. UNE NOTIFICATION TOUCHÉE OUVRE SA CONVERSATION ══════════════════════════════════════════════════════════════════════════════ */
    console.log('\nUne notification touchée : seule une adresse de cette forme ouvre une conversation');
    {
      const conv = 'c_' + 'a'.repeat(32);
      const avant = M.evs.filter(e => e.type === 'ouvrir').length;
      fm.dire({ type: 'ouvrir', url: '/#messages/' + conv });
      v('le service worker demande d\'ouvrir une conversation → la source le dit à la page', M.evs.filter(e => e.type === 'ouvrir').slice(avant).map(e => e.conv), [conv]);
      const mauvais = ['https://evil.example/#messages/' + conv, '/#messages/../../x', '/#messages/' + conv + 'x', '/#messages/c_' + 'A'.repeat(32), '//evil.example/#messages/' + conv, 'javascript:alert(1)', '/#messages/', '/'];
      for (const url of mauvais) fm.dire({ type: 'ouvrir', url });
      fm.dire({ type: 'autre', url: '/#messages/' + conv }); fm.dire(null); fm.dire('ouvrir'); fm.dire({ type: 'ouvrir' }); fm.dire({ type: 'ouvrir', url: 12 });
      v('⛔ une adresse d\'ailleurs, mal formée, ou un message d\'un autre genre n\'ouvre RIEN (' + (mauvais.length + 5) + ' essais)', M.evs.filter(e => e.type === 'ouvrir').length - avant, 1);
    }

    /* ═══ 7. LA SOURDINE ════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLa sourdine : 8 heures, une semaine, toujours, réactiver');
    {
      const lst = await M.src.lister(true);
      const conv = lst.find(c => c.type === 'direct' && c.nom.startsWith('Cleo')).id;
      const i0 = await M.src.infos(conv);
      v('au départ : pas de sourdine', i0.sourdine, 0);
      for (const [duree, ms] of [['8h', 8 * 3600000], ['1s', 7 * 86400000], ['tj', 9 * 365 * 86400000]]) {
        await M.src.sourdine(conv, duree);
        const i = await M.src.infos(conv);
        const reste = i.sourdine - Date.now();
        vrai('« ' + duree + ' » : l\'échéance est dans ' + ms + ' ms (à une minute près), le service l\'a retenue', Math.abs(reste - ms) < 60000 && sql('SELECT muet_jusqua AS m FROM membre WHERE conv = ? AND uid = ?', conv, M.src.moi().id).m === i.sourdine);
      }
      await M.src.sourdine(conv, 'off');
      v('réactiver : plus de sourdine, ni chez le module ni au service', [(await M.src.infos(conv)).sourdine, sql('SELECT muet_jusqua AS m FROM membre WHERE conv = ? AND uid = ?', conv, M.src.moi().id).m], [0, 0]);
      const n0 = M.requetes(/prefs/).length;
      const er = await attrape(M.src.sourdine(conv, 'pour-toujours-et-un-jour'));
      v('⛔ une durée inconnue est refusée avant d\'écrire quoi que ce soit (aucune requête de plus)', [er && er.code, M.requetes(/prefs/).length - n0, n0], ['invalide', 0, 4]);
    }

    /* ═══ 8. L'EXPORT ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nL\'export : un fichier, un par jour');
    {
      const x = await M.src.exporterDonnees();
      const j = JSON.parse(await x.blob.text());
      v('⛔ l\'export rend un FICHIER (Blob) et le nom que le service propose', [x.blob instanceof Blob, /^opmessages-export-\d{4}-\d{2}-\d{2}\.json$/.test(x.nom), j.format, j.profil.id], [true, true, 'opmessages-export-v1', M.src.moi().id]);
      const er = await attrape(M.src.exporterDonnees());
      v('⛔ le deuxième du jour : « un export par jour », avec l\'attente en heures', [er && er.code, er && er.statut, /un export par jour/.test(er.phrase()), / h\)\.$/.test(er.phrase())], ['export_quotidien', 429, true, true]);
    }

    /* ═══ 9. LA SUPPRESSION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLa suppression : la demande qui court, le refus, la reconnexion qui annule');
    {
      const f = faux({ permission: 'granted' });
      const d = monter({ navigateur: f.nav }); await d.entrer('dan');
      await d.src.notifActiver();
      d.reseau.forcer = { re: /POST \/api\/compte\/supprimer/, code: 429, erreur: 'quota_atteint' };
      const refus = await attrape(d.src.supprimerCompte());
      v('une suppression REFUSÉE par le service se dit, et le module reste comme avant (connecté, abonné)', [refus && refus.dit, refus && refus.code, (await d.nav.fetch(svc.base + '/api/moi')).status, abosDe(d.src.moi().id)], [true, 'quota_atteint', 200, 1]);
      d.reseau.forcer = null;
      /* la session meurt AILLEURS pendant que le module est encore « en connexion » : il le signale encore (le drapeau de suppression est retombé) */
      d.reseau.retarder = /POST \/api\/compte\/supprimer/;
      const r = await d.src.supprimerCompte();
      v('⛔ la demande de suppression qui court ne fait PAS crier « session morte » quand le service ferme le flux et coupe la session (la réponse est retenue 450 ms, le flux se rouvre en 401 pendant ce temps)', [d.morts, Number.isInteger(r.suppression_le)], [[], true]);
      v('la date rendue est celle du service (quatorze jours)', Math.abs(r.suppression_le - (Date.now() + 14 * 86400000)) < 5 * 60000, true);
      v('le service a tout coupé : plus de session, plus d\'abonnement ; le navigateur s\'est désabonné', [sql('SELECT COUNT(*) AS n FROM session WHERE personne = ?', d.src.moi().id).n, abosDe(d.src.moi().id), f.sub], [0, 0, null]);
      /* se reconnecter annule — et la connexion le dit */
      const retour = monter({ navigateur: faux().nav });
      const m = await retour.src.connexion('dan', MDP.dan);
      v('⛔ se reconnecter ANNULE la suppression, et `connexion` le DIT (la page en tire un message)', [m.suppression_annulee, sql('SELECT suppression_le AS s FROM personne WHERE id = ?', m.id).s], [true, null]);
      const normal = await monter({ navigateur: faux().nav }).src.connexion('dan', MDP.dan);
      v('(une connexion ordinaire ne porte pas cette mention)', normal.suppression_annulee, undefined);
      retour.src.arreter();
    }
    const Dan2 = await brut('dan');          // la session brute de Dan a été coupée par la suppression : une neuve (la même personne)

    /* ═══ 10. UN COMPTE SUPPRIMÉ S'APPELLE « COMPTE SUPPRIMÉ » PARTOUT ══════════════════════════════════════════════════════════════════ */
    console.log('\nUn compte supprimé : son nom, partout, et on n\'y écrit plus');
    {
      const alice = M.src, idDan = Dan2.moi.id, idAlice = alice.moi().id;
      const aliceBrute = await brut('alice');
      await relier(Dan2, aliceBrute);
      const cDan = (await aliceBrute.post('/api/conversations/directe', { uid: idDan })).j.conversation.id;
      /* un groupe où Dan écrit, puis Alice écrit APRÈS lui (et la sortie de Dan de ce groupe ajoute « a quitté le groupe » : seule la page de messages dira que l'auteur d'un message est supprimé) */
      const G1 = (await Dan2.post('/api/conversations/groupe', { nom: 'Groupe un', membres: [idAlice] })).j.conversation.id;
      await ecrire(Dan2, cDan, 'DERNIER-MOT-DE-DAN');
      await ecrire(Dan2, G1, 'mot de Dan dans le premier groupe'); await ecrire(aliceBrute, G1, 'Alice répond après lui');
      const avant = (await alice.lister(true)).find(c => c.id === cDan);
      v('population : avant la suppression, la conversation porte le nom de Dan', [avant.nom, avant.supprime], ['Dan Banc', false]);
      /* le balayeur d'OP MESSAGES, joué à la main : programmer, puis effacer (échéance passée) */
      S.suppressionProgrammer(idDan, Date.now() - 1000);
      const eff = S.compteEffacer(idDan);
      vrai('population : le compte de Dan est effacé en base', eff.effacee === true && sql('SELECT etat FROM personne WHERE id = ?', idDan).etat === 'supprime');

      const liste = await alice.lister(true);
      const l = liste.find(c => c.id === cDan);
      v('⛔ la LISTE : « Compte supprimé » (espace insécable), initiale « ? », sans photo, marquée supprimée', [l.nom, l.initiales, l.photo, l.supprime], ['Compte supprimé', '?', null, true]);
      const c = await alice.ouvrir(cDan);
      v('⛔ la CONVERSATION ouverte : même nom, marquée supprimée (la page ferme le compositeur), les messages de Dan restent lisibles', [c.nom, c.supprime, c.messages.some(m => m.texte === 'DERNIER-MOT-DE-DAN')], ['Compte supprimé', true, true]);
      const info = await alice.infos(cDan);
      v('les INFOS : le même nom, supprimé, plus de membre en face', [info.nom, info.supprime, info.membres.length, info.initiales], ['Compte supprimé', true, 1, '?']);
      const per = alice.personne(idDan);
      v('l\'identifiant de Dan se lit « Compte supprimé » (auteur d\'un message, d\'une citation, d\'une activité)', [per.nom, per.prenom, per.initiales], ['Compte supprimé', 'Compte supprimé', '?']);
      const err = await attrape(alice.envoyer(cDan, { texte: 'tu es là ?' }));
      v('⛔ lui écrire : la phrase du service (410 compte_supprime), pas une panne vague', [err && err.code, err && err.phrase()], ['compte_supprime', 'Ce compte a été supprimé : tu ne peux plus lui écrire.']);

      /* une page NEUVE (aucune mémoire) : les deux chemins par lesquels elle apprend qu'un auteur est supprimé */
      const neuve = monter({ navigateur: faux().nav }); await neuve.entrer('alice');
      const g1 = await neuve.src.ouvrir(G1);
      const texteActivite = g1.messages.find(m => m.systeme && /a créé le groupe/.test(m.texte));
      v('⛔ UN GROUPE, par la page de messages (`supprimes`) : le message de Dan reste, son auteur est « Compte supprimé », l\'activité « a créé le groupe » le nomme ainsi',
        [g1.messages.some(m => m.texte === 'mot de Dan dans le premier groupe'), neuve.src.personne(idDan).nom, texteActivite && texteActivite.texte], [true, 'Compte supprimé', 'Compte supprimé a créé le groupe']);
      neuve.src.arreter();
    }
  } catch (e) {
    console.log('  ✗ le banc est mort : ' + (e && e.stack || e));
    process.exitCode = 1;
  } finally {
    for (const s of sources) { try { s.arreter(); } catch (e) { /* déjà arrêté */ } }
    try { S.fermer(); } catch (e) { /* déjà fermée */ }
    await svc.arreter(); await og.fermer(); await fps.fermer();
  }
  fin();
})();

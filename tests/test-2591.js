/* ⛔ CE QUE CE FICHIER GARDE — DEUX APPELS QUI SE CROISENT SE REJOIGNENT, CHEZ LA PAGE AUSSI (lot m18, relecture du 17 octobre 2026).

   Le service (`test-2590`) répond 201 `{ appel, joint: true }` à la personne qui en appelle une autre PENDANT que l'autre l'appelle : l'appel de l'autre, qui sonnait déjà chez elle, est PRIS, et sa vue est
   ENTRANTE et déjà EN COURS. Ce que `test-2590` ne voit pas : que la PAGE le lise. Avant, `lancer` du moteur (`source-serveur.js`) traitait toute réponse comme un appel SORTANT qui sonne : l'entrée naissait
   « appelé » sans liaison, l'offre de l'autre était mise de côté (`c.file`, la connexion n'existant jamais), personne n'armait la veille — l'autre disait « Appel connecté », celle qui avait pris l'appel
   restait sur « Connexion… » pour toujours, et le service les tenait toutes deux « occupées » jusqu'au raccroché.

   Les VRAIES fonctions de `api.js` et de `source-serveur.js` contre le VRAI service, deux « appareils de poche » (Ana, Ben) avec la fausse connexion pair à pair de `bac-webrtc.js` — qui refuse l'offre que
   personne n'attend, et ne « se connecte » que si les deux liaisons sont montées. Trois façons d'arriver, selon ce que la page d'Ana sait de la sonnerie de Ben quand sa propre requête part :
     · elle ne la connaît pas encore (l'événement de sonnerie n'est pas arrivé) ;
     · elle l'apprend PENDANT sa requête (l'événement double la réponse : une entrée « entrante » existe déjà quand la réponse arrive) ;
     · et l'autre ordre d'arrivée (Ana d'abord, Ben ensuite) — le service ne fait pas de différence, la page non plus.
   Contre-épreuve : un lancement ordinaire (sans croisement) reste un appel SORTANT qui sonne, et son appelé répond comme avant.
   Toute attente est au GESTE (on sonde la condition), jamais au chronomètre. */
'use strict';
const path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { creerMonde } = require('./bac-webrtc');
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
const att = (cond, ms = 8000) => T.attendre(cond, ms, 8);

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (120 s)'); process.exit(1); }, 120000).unref();

const DELAIS = { pouls: 150, candidats: 5, veille: 2000, deconnecte: 250, reessai: [40, 80], iceMax: 1500, quitter: [40, 80], marge: 600000, renouvMin: 600000, nettoyage: 600000 };

(async () => {
  const MDP = { ana: 'pw-ana-1234567', ben: 'pw-ben-1234567' };
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MDP).map(k => [k, { pass: MDP[k], nom: k[0].toUpperCase() + k.slice(1) + ' Banc', actif: true }])));
  const APPELS = { balayageMs: 100, perduMs: 20000, parHeure: 900, parPaireHeure: 90, entrantsParHeure: 600, iceParHeure: 900, signalMax: 2000 };
  const svc = await T.lancerService({ urlGestion: og.url, horloge: true, config: { appels: APPELS } });
  const sources = [];

  /* Un « appareil » : un navigateur de poche, le module de la page branché dessus, sa propre fausse connexion pair à pair.
     `visible` : la page est-elle sous les yeux ? · `panne` : { re, restant } — les requêtes qui répondent 500 (`restant` fois) · `retenir` : { re, porte } — une réponse retenue jusqu'à `porte.ouvrir()` ·
     `perdre` : un événement du flux que la page ne voit jamais · `recus` : combien d'événements de chaque genre sont arrivés (avant le module) · `fermees` : les notifications retirées de l'écran */
  function monter(service, login, opts) {
    const o = opts || {};
    const nav = o.nav || T.navigateur(service.base);
    const monde = creerMonde(login);
    const D = { login, service, nav, monde, reseau: { requetes: [] }, recus: {}, gids: {}, fermees: [], sw: null, visible: true, panne: null, retenir: null, perdre: null, fluxRetenu: null, es: null, evs: [], ordre: [] };
    const faux = { priseEnCharge: () => ({ ok: false, raison: 'navigateur' }), permission: () => 'default', visible: () => D.visible, surMessage: (cb) => { D.sw = cb; }, abonnementActuel: async () => null, fermerNotifications: async (tag) => { D.fermees.push(tag); } };
    const f = async (url, init) => {
      const u = String(url), m = (init && init.method) || 'GET', chemin = u.replace(service.base, '').split('?')[0];
      D.reseau.requetes.push({ m, chemin, corps: init && typeof init.body === 'string' ? init.body : null, keepalive: !!(init && init.keepalive) });
      const cle = m + ' ' + chemin;
      if (D.panne && D.panne.restant > 0 && D.panne.re.test(cle)) { D.panne.restant--; D.panne.vues = (D.panne.vues || 0) + 1; return new Response('{}', { status: 500, headers: { 'Content-Type': 'application/json' } }); }
      const r = await nav.fetch(url, init);
      D.ordre.push('rep ' + cle);
      if (D.retenir && D.retenir.re.test(cle) && !D.retenir.faite) { D.retenir.faite = true; D.retenir.enRoute = true; try { D.retenir.corps = await r.clone().text(); } catch (e) { D.retenir.corps = null; } await D.retenir.porte; }
      return r;
    };
    /* le flux, vu AVANT le module : on compte ce qui arrive et on peut en laisser perdre */
    /* `fluxRetenu` : les événements `appel` attendent dans une file que le banc relâche — un flux en retard sur une relecture (section 9 ter) · `es` : le flux ouvert, que le banc peut COUPER (la reprise dit « réseau revenu ») */
    const ES = class extends nav.EventSource {
      constructor(u) { super(u); D.es = this; }
      addEventListener(t, g) {
        super.addEventListener(t, (ev) => {
          D.recus[t] = (D.recus[t] || 0) + 1; if (ev && ev.lastEventId) D.gids[t] = parseInt(ev.lastEventId, 10);
          if (D.perdre && D.perdre(t, ev)) return;
          if (D.fluxRetenu && t === 'appel') { D.fluxRetenu.push(() => g(ev)); return; }
          g(ev);
        });
      }
    };
    const src = creerSourceServeur({ OPMSG, base: service.base, fetch: f, EventSource: ES, navigateur: faux, webrtc: o.sansWebrtc ? {} : monde, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5, delaiAckMs: 20, appelsDelais: Object.assign({}, DELAIS, o.delais || {}), ...(o.planifier ? { planifier: o.planifier, annuler: o.annuler } : {}) });
    D.src = src;
    src.ecouter(e => { D.evs.push(e); D.ordre.push('ev ' + e.type); });
    sources.push(src);
    D.entrer = async () => { await src.connexion(login, MDP[login]); const d = await src.demarrer(); if (!d.connecte) throw new Error('démarrage refusé : ' + JSON.stringify(d)); D.moi = src.moi(); return D.moi; };
    D.attendreEv = (pred, ms) => att(() => D.evs.find(pred) || null, ms);
    D.snap = (id) => src.appel(id);
    D.attendreSnap = async (id, pred, ms) => { let s = null; await att(async () => { s = await src.appel(id); return s && pred(s) ? s : null; }, ms); return s && pred(s) ? s : null; };
    D.requetes = (re) => D.reseau.requetes.filter(r => re.test(r.m + ' ' + r.chemin));
    return D;
  }
  const liees = async (X, Y, ms) => att(() => X.monde.dernier() && Y.monde.dernier() && X.monde.dernier().iceConnectionState === 'connected' && Y.monde.dernier().iceConnectionState === 'connected', ms || 8000);

  try {
    /* ⛔ la veille (qui redémarre une liaison restée muette) est ALLONGÉE : sinon elle rattrape une offre perdue par une seconde offre, deux secondes plus tard, et le banc ne verrait plus qu'une offre a été jetée */
    const LONGUE = { delais: { veille: 120000, deconnecte: 120000 } };
    const A = monter(svc, 'ana', LONGUE), B = monter(svc, 'ben', LONGUE);
    const ana = await A.entrer(), ben = await B.entrer();
    vrai('population : deux personnes sont entrées par la porte bêta', ana.id !== ben.id);
    const l1 = await A.src.lienContact(); await B.src.accepterLien(l1.code);
    const nbAppels = (D) => D.requetes(/POST \/api\/appels$/).length;
    const reponses = (D) => D.requetes(/POST \/api\/appels\/a_[0-9a-f]+\/repondre$/).length;
    /* la liaison des deux pages établie, et chacune le DIT */
    const connectes = async (id) => {
      const sa = await A.attendreSnap(id, x => x.liaison === 'connecte', 5000), sb = await B.attendreSnap(id, x => x.liaison === 'connecte', 5000);
      return [!!sa, !!sb];
    };
    const raccrocher = async (id) => { await A.src.terminerAppel(id); await B.attendreSnap(id, x => x.etat === 'termine', 5000); await B.src.terminerAppel(id); };

    /* ═══ 0. LA CONTRE-ÉPREUVE : UN LANCEMENT ORDINAIRE RESTE UN APPEL SORTANT QUI SONNE ═══ */
    console.log('Un lancement sans croisement : sortant, il sonne, l\'appelé répond, la liaison s\'établit');
    {
      const sn = await A.src.demarrerAppel({ membres: [ben.id], video: false });
      v('population : Ana appelle Ben — sortant, sonne, rien à répondre', [sn.sens, sn.etat, sn.entrant], ['sortant', 'sonne', false]);
      await B.attendreEv(e => e.type === 'appel-entrant' && e.id === sn.id);
      await B.src.repondreAppel(sn.id, true);
      vrai('la liaison s\'établit', !!(await liees(A, B)));
      v('   les deux pages disent « connecté »', await connectes(sn.id), [true, true]);
      await raccrocher(sn.id);
    }

    /* ═══ 1. LA PAGE D'ANA NE SAIT PAS ENCORE QUE BEN L'APPELLE ═══ */
    console.log('\nBen appelle Ana, qui appelle Ben avant d\'avoir appris la sonnerie : la page prend l\'appel de Ben et monte la liaison');
    let id1 = null;
    {
      A.perdre = (t) => t === 'appel';                                     // l'événement de sonnerie n'atteint pas la page d'Ana (il est en route)
      const sb = await B.src.demarrerAppel({ membres: [ana.id], video: false });
      id1 = sb.id;
      const avant = nbAppels(A), r0 = reponses(A);
      const sa = await A.src.demarrerAppel({ membres: [ben.id], video: false });
      v('population : Ana a bien lancé UNE requête (pas de réponse à une sonnerie qu\'elle ne connaît pas)', [nbAppels(A) - avant, reponses(A) - r0], [1, 0]);
      v('⛔ c\'est l\'appel de Ben (le même identifiant), EN COURS, ENTRANT — ni un second appel, ni une sonnerie sortante', [sa.id === id1, sa.etat, sa.sens, sa.entrant], [true, 'en-cours', 'entrant', false]);
      vrai('⛔ la liaison s\'établit des DEUX côtés (l\'offre de Ben n\'est pas restée en file chez Ana)', !!(await liees(A, B, 5000)));
      v('   les deux pages disent « connecté »', await connectes(id1), [true, true]);
      vrai('   la page d\'Ana tient SON pouls (l\'appel ne tombe pas « connexion perdue »)', !!(await att(() => A.requetes(/POST \/api\/appels\/a_[0-9a-f]+\/signal$/).some(r => /"pouls"/.test(r.corps || '')), 4000)));
      A.perdre = null;
      await raccrocher(id1);
    }

    /* ═══ 2. LA SONNERIE ET LA PRISE ARRIVENT PENDANT LA REQUÊTE D'ANA ═══ */
    console.log('\nLes événements (la sonnerie, puis « en cours ») et l\'offre de Ben arrivent PENDANT la requête d\'Ana : rien n\'est perdu, rien n\'est « pris ailleurs »');
    {
      A.fluxRetenu = [];
      const ev0 = A.evs.length, sig0 = A.recus.signal || 0;
      const sb = await B.src.demarrerAppel({ membres: [ana.id], video: false });
      await att(() => A.fluxRetenu.length >= 1);                          // la sonnerie de Ben est en route chez Ana
      let ouvrir; A.retenir = { re: /POST \/api\/appels$/, porte: new Promise((ok) => { ouvrir = ok; }), faite: false, enRoute: false };
      const p = A.src.demarrerAppel({ membres: [ben.id], video: false });
      vrai('population : la requête d\'Ana est partie, sa réponse est retenue en route', !!(await att(() => A.retenir.enRoute)));
      vrai('population : la sonnerie ET l\'événement « en cours » attendent en route chez Ana (deux événements, pas un)', !!(await att(() => A.fluxRetenu.length >= 2)));
      const file = A.fluxRetenu; A.fluxRetenu = null;
      for (const f of file) f();                                           // la sonnerie arrive (une entrée entrante naît), puis l'événement « en cours » : Ana ne sait pas encore que c'est elle qui l'a pris
      vrai('population : la sonnerie de Ben est arrivée à la page d\'Ana avant la réponse de sa requête', !!(await att(() => A.evs.some(e => e.type === 'appel-entrant' && e.id === sb.id))));
      vrai('population : Ben a offert (l\'offre atteint le flux d\'Ana avant la réponse de sa requête)', !!(await att(() => B.monde.dernier() && B.monde.dernier().localDescription)));
      vrai('population : l\'offre de Ben est ARRIVÉE au flux d\'Ana (comptée avant le module), la réponse de sa requête est toujours retenue', !!(await att(() => (A.recus.signal || 0) > sig0)) && !!A.retenir.enRoute);
      ouvrir();
      const sa = await p;
      A.retenir = null;
      v('⛔ l\'appel d\'Ana est celui de Ben, EN COURS — l\'événement qui a devancé la réponse ne l\'a pas fait finir « pris ailleurs »', [sa.id === sb.id, sa.etat, sa.entrant, sa.issue], [true, 'en-cours', false, null]);
      v('⛔ aucune fin n\'a été dite en route : la page n\'a pas fait finir l\'entrée « pris ailleurs » (aucun événement `appels`, l\'historique n\'a pas bougé)', A.evs.slice(ev0).filter(e => e.type === 'appels').length, 0);
      vrai('⛔ la liaison s\'établit : l\'offre arrivée avant la réponse n\'est pas perdue', !!(await liees(A, B, 5000)));
      v('   les deux pages disent « connecté »', await connectes(sb.id), [true, true]);
      await raccrocher(sb.id);
    }

    /* ═══ 3. L'AUTRE ORDRE : ANA D'ABORD, BEN ENSUITE ═══ */
    console.log('\nL\'autre ordre : Ana appelle Ben, qui appelle Ana avant d\'avoir appris la sonnerie');
    {
      B.perdre = (t) => t === 'appel';
      const sa = await A.src.demarrerAppel({ membres: [ben.id], video: false });
      const sb = await B.src.demarrerAppel({ membres: [ana.id], video: false });
      v('⛔ Ben prend l\'appel d\'Ana : le même, EN COURS, entrant chez lui — et Ana, l\'appelante, reste SORTANTE', [sb.id === sa.id, sb.etat, sb.sens, sb.entrant], [true, 'en-cours', 'entrant', false]);
      vrai('la liaison s\'établit (c\'est Ana, l\'appelante, qui offre)', !!(await liees(A, B, 5000)));
      v('   les deux pages disent « connecté »', await connectes(sa.id), [true, true]);
      const snA = await A.src.appel(sa.id);
      v('   Ana n\'a jamais cessé d\'être l\'appelante', [snA.sens, snA.etat], ['sortant', 'en-cours']);
      B.perdre = null;
      await A.src.terminerAppel(sa.id); await B.attendreSnap(sa.id, x => x.etat === 'termine', 5000); await B.src.terminerAppel(sa.id);
    }
  } finally {
    for (const s of sources) { try { s.arreter(); } catch (e) { /* déjà arrêtée */ } }
    await svc.arreter(); await og.fermer();
  }
  fin();
})().catch((e) => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); process.exit(1); });

/* ══ L'HISTORIQUE DES APPELS DIT L'ISSUE D'UN APPEL SORTANT (lot m19, appels@2) ═══════════════════════════════════════════════════════════
   Ana a vu « Ben a refusé l'appel » à l'écran, puis la liste Appels disait seulement « Appel sortant » : on ne savait plus que l'appel n'avait pas abouti. Le service sait pourtant
   déjà l'issue (annulé, refusé, sans réponse, occupé) : la ligne d'historique la porte désormais (`issue`), et la page l'écrit à la place du seul « sortant ».

   Ce que ce fichier garde, de BOUT EN BOUT (la page de Justin, le module de données du service, le VRAI service, une fausse connexion pair à pair — modèle de `test-984`) :
   1. l'historique d'Ana après quatre appels sortants : refusé (« refuse »), annulé (« annule »), sans réponse (« manque », l'horloge du SERVICE avancée), répondu (aucune issue) ;
      et chez Ben, l'appelé : jamais d'issue (ses appels entrants gardent « manqué » / « entrant ») ; ⛔ `sens` reste « sortant » (le reste de la page en dépend) ;
   2. l'enregistrement que crée le raccrochage LOCAL (`terminerAppel`) dit la même issue que la liste relue du service ;
   3. la VRAIE `libelleAppel` de la page, nourrie par ces lignes : « Appel refusé », « Appel vidéo annulé », « Appel sans réponse » ; un appel répondu garde « Appel sortant · 3 s »
      (la durée), un entrant « Appel entrant » ; un appel de l'aperçu (sans issue) garde « Appel sortant ».
   Le rendu au navigateur de la liste : scratchpad/messages/correctifs/m19/sonde-m19.js. */
'use strict';
const path = require('path'), crypto = require('crypto');
const fs = require('fs');
const T = require('./outils-msg');
const C = require('./outils-cascade-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { creerMonde } = require('./bac-webrtc');
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur, serveursSurs, candidatSur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
const att = (cond, ms = 8000) => T.attendre(cond, ms, 8);
const attrape = async (p) => { try { await p; return null; } catch (e) { return e; } };
const dort = (ms) => new Promise((ok) => setTimeout(ok, ms));
const codeDe = (e) => e ? e.code : null;
const phrase = (e) => e && e.dit ? e.phrase() : '';

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (120 s)'); process.exit(1); }, 120000).unref();

/* les délais du MOTEUR, raccourcis pour le banc : le pouls toutes les 150 ms (le service attend le sien pendant `perduMs`), les candidats par paquets de 5 ms, la veille de 2 s, les reprises à 40 ms. `renouvMin` est
   énorme : le renouvellement des identifiants n'a lieu que dans la section qui le joue. */
const DELAIS = { pouls: 150, candidats: 5, veille: 2000, deconnecte: 250, reessai: [40, 80], iceMax: 1500, quitter: [40, 80], marge: 600000, renouvMin: 600000, nettoyage: 600000 };
(async () => {
  const MDP = { ana: 'pw-ana-1234567', ben: 'pw-ben-1234567', cleo: 'pw-cleo-123456', dan: 'pw-dan-1234567' };
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MDP).map(k => [k, { pass: MDP[k], nom: k[0].toUpperCase() + k.slice(1) + ' Banc', actif: true }])));
  /* le secret du relais est TIRÉ au hasard à chaque passage (jamais un secret écrit dans un fichier) */
  const SECRET = crypto.randomBytes(24).toString('hex');
  const RELAIS = { secret: SECRET, hote: 'turn.exemple.invalid', port: 3478, portTls: 5349, ttlS: 60 };
  const APPELS = { balayageMs: 100, perduMs: 20000, parHeure: 900, parPaireHeure: 90, entrantsParHeure: 600, iceParHeure: 900, signalMax: 2000 };
  const svc = await T.lancerService({ urlGestion: og.url, horloge: true, config: { appels: Object.assign({ relais: RELAIS }, APPELS) } });
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
  /* un tour du balayeur QUI A EU LIEU APRÈS maintenant : l'âge du dernier tour (dans /health) repart à zéro */
  const passage = (service) => { const c = T.client(service.base); return att(async () => { const h = (await c.get('/health')).j; return h && h.appels && typeof h.appels.ageS === 'number' && h.appels.ageS <= 1 ? h : null; }, 8000); };
  const actifDe = async (D) => (await D.nav.client.get('/api/appels')).j.actif;
  /* la VRAIE libelleAppel de la page */
  const PAGE = fs.readFileSync(path.join(process.env.OPMSG_RACINE || path.join(__dirname, '..'), 'apercu/opmessages/index.html'), 'utf8');
  const JS = C.sansCommJs((/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1]);
  const tab = (nom) => (new RegExp('const ' + nom + ' = (\\{[^}]*\\});').exec(JS) || [, '{}'])[1];
  const srcLib = C.ligne(JS, 'const dureeCourte = ') + '\n' + C.decl(JS, 'function libelleAppel(');
  let libelle = null;
  try { libelle = new Function('SENS_APPEL', 'ISSUE_APPEL', srcLib + '\nreturn libelleAppel;')(eval('(' + tab('SENS_APPEL') + ')'), /ISSUE_APPEL/.test(JS) ? eval('(' + tab('ISSUE_APPEL') + ')') : {}); } catch (e) { libelle = null; }
  vrai('(population) libelleAppel est extraite de la page et exécutable', typeof libelle === 'function');

  try {
    const A = monter(svc, 'ana'), B = monter(svc, 'ben');
    const ana = await A.entrer(), ben = await B.entrer();
    const l1 = await A.src.lienContact(); await B.src.accepterLien(l1.code);
    const ligneDe = async (X, id) => (await X.src.appels('tous')).find(x => x.id === id);

    /* — refusé : Ben refuse — */
    const s1 = await A.src.demarrerAppel({ membres: [ben.id], video: false });
    await B.attendreEv(e => e.type === 'appel-entrant' && e.id === s1.id);
    await B.src.repondreAppel(s1.id, false);
    await A.attendreSnap(s1.id, s => s.etat === 'termine');
    const e1 = await A.src.terminerAppel(s1.id); await B.src.terminerAppel(s1.id);
    /* — annulé : Ana annule pendant la sonnerie (un appel vidéo) — */
    const s2 = await A.src.demarrerAppel({ membres: [ben.id], video: true });
    await B.attendreEv(e => e.type === 'appel-entrant' && e.id === s2.id);
    const e2 = await A.src.terminerAppel(s2.id);
    await B.attendreSnap(s2.id, s => s.etat === 'termine'); await B.src.terminerAppel(s2.id);
    /* — sans réponse : +46 s à l'horloge du SERVICE — */
    const s3 = await A.src.demarrerAppel({ membres: [ben.id], video: false });
    await B.attendreEv(e => e.type === 'appel-entrant' && e.id === s3.id);
    svc.avancer(46000); await passage(svc);
    await A.attendreSnap(s3.id, s => s.etat === 'termine'); await B.attendreSnap(s3.id, s => s.etat === 'termine');
    const e3 = await A.src.terminerAppel(s3.id); await B.src.terminerAppel(s3.id);
    /* — répondu : Ben répond, Ana raccroche — */
    const s4 = await A.src.demarrerAppel({ membres: [ben.id], video: false });
    await B.attendreEv(e => e.type === 'appel-entrant' && e.id === s4.id);
    await B.src.repondreAppel(s4.id, true);
    await A.attendreSnap(s4.id, s => s.etat === 'en-cours');
    const e4 = await A.src.terminerAppel(s4.id); await B.src.terminerAppel(s4.id);

    const hA = await Promise.all([s1, s2, s3, s4].map(s => ligneDe(A, s.id)));
    vrai('(population) les quatre appels sont dans l\'historique d\'Ana', hA.every(Boolean));
    v('⛔ l\'historique d\'Ana dit l\'issue : refusé, annulé, sans réponse — et RIEN pour l\'appel répondu', hA.map(x => x && (x.issue || null)), ['refuse', 'annule', 'manque', null]);
    v('⛔ `sens` reste « sortant » pour les quatre (le tri, l\'icône et le filtre « Manqués » en dépendent)', hA.map(x => x && x.sens), ['sortant', 'sortant', 'sortant', 'sortant']);
    v('l\'enregistrement du raccrochage LOCAL dit la même issue que la liste relue du service', [e1, e2, e3, e4].map(x => x && (x.issue || null)), ['refuse', 'annule', 'manque', null]);
    const hB = await Promise.all([s1, s3, s4].map(s => ligneDe(B, s.id)));          // (l'annulé et le sans-réponse d'affilée ne font qu'UNE ligne chez Ben : « manqué (2) »)
    vrai('(population) les appels refusé, manqué (2) et répondu sont dans l\'historique de Ben', hB.every(Boolean) && hB[1].repetitions === 2);
    v('chez Ben, l\'appelé : aucune issue (« manqué » et « entrant » restent ce qu\'ils étaient)', hB.map(x => x && [x.sens, x.issue || null]), [['entrant', null], ['manque', null], ['entrant', null]]);
    if (libelle) {
      v('⛔ la page l\'écrit : « Appel refusé », « Appel vidéo annulé », « Appel sans réponse » — et l\'appel répondu garde « Appel sortant »', hA.map(x => libelle(x)), ['Appel refusé', 'Appel vidéo annulé', 'Appel sans réponse', 'Appel sortant' + (hA[3].duree > 0 ? ' · ' + hA[3].duree + ' s' : '')]);
      v('chez Ben : « Appel entrant », « Appel manqué (2) », puis l\'appel répondu', hB.map(x => libelle(x)), ['Appel entrant', 'Appel manqué (2)', 'Appel entrant' + (hB[2].duree > 0 ? ' · ' + hB[2].duree + ' s' : '')]);
      v('un appel de l\'aperçu (sans issue) garde « Appel sortant · 3 min » ; un appel occupé se dit « Appel occupé »', [libelle({ groupe: false, type: 'audio', sens: 'sortant', duree: 190, membres: ['c1'] }), libelle({ groupe: false, type: 'audio', sens: 'sortant', issue: 'occupe', duree: 0, membres: ['c1'] })], ['Appel sortant · 3 min', 'Appel occupé']);
    }
  } finally {
    for (const s of sources) { try { s.arreter(); } catch (e) { /* déjà arrêtée */ } }
    await svc.arreter(); await og.fermer();
  }
  fin();
})().catch((e) => { console.log('  ✗ le banc a levé : ' + (e && e.stack ? e.stack : e)); process.exitCode = 1; process.exit(1); });

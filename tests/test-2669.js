/* ══ OP MESSAGES — LA PAGE ÉCRIT « LU HH:MM » PAREIL EN DIRECT ET APRÈS UN RECHARGEMENT (lot m-heure-lecture, 17 octobre 2026) ═══════════════════════
   Campagne de test, conversations#2 : le statut sous le dernier message envoyé disait « Lu 22:50 » en direct et « Lu » seul après un rechargement — la page ne connaissait l'heure que par l'événement `lu`.
   Décision de Justin (17 octobre 2026) : « Oui, garder l'heure ». `tests/test-2668.js` garde le SERVICE (il retient l'heure et la rend avec le détail). Celui-ci garde la COUTURE (famille 4, modèles
   `test-995` et `test-911`) : le VRAI `server-msg/public/source-serveur.js` parle au VRAI service, et la VRAIE fonction de la page qui écrit le statut (`htmlMessage`, extraite du script SERVI et de l'aperçu)
   se nourrit de ce que le module rend :
     · EN DIRECT : Ben lit, l'événement arrive, le statut dit « Lu <heure de la lecture> » ;
     · APRÈS UN RECHARGEMENT (un module neuf, rien en mémoire) : le MÊME « Lu <heure> » — une seule source ;
     · LES ACCUSÉS COUPÉS se disent « Envoyé » (ni « Lu » ni heure), dans les deux sens ;
     · UN GROUPE GARDE SON COMPORTEMENT : « Lu » quand TOUS les autres ont lu, avec l'heure de la dernière lecture ; tant qu'un seul n'a pas lu, « Envoyé » ;
     · UN SERVICE D'AVANT (qui ne rend pas `lu_ts`) : « Lu » sans heure, comme avant — jamais « Lu undefined » ni une heure inventée ;
     · LA FONCTION DU FICHIER SERVI EST CELLE DE L'APERÇU (le générateur n'a rien changé).
   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE NE PROUVE RIEN : chaque « Envoyé » est précédé du « Lu <heure> » que la même séquence rendait avant la coupure. Toute attente est au GESTE. */
'use strict';
process.env.TZ = 'Europe/Paris';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
const att = (cond, ms = 8000) => T.attendre(cond, ms, 10);
const HEURE = 3600000;

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (120 s)'); process.exit(1); }, 120000).unref();

/* ── la fonction RÉELLE de la page : extraite du script SERVI, et de l'aperçu (la même) ── */
const sansCommentairesJs = (s) => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/(^|\s)\/\/\s.*$/gm, ' ');
function extraire(src) {
  const i = src.indexOf('function htmlMessage('), f = i < 0 ? -1 : src.indexOf('\n  }\n', i);
  const fmt = (src.match(/const FMT_HEURE = [^\n]+/) || [''])[0];
  return { corps: i >= 0 && f > i ? src.slice(i, f + 4) : '', fmt };
}
const SERVI = sansCommentairesJs(fs.readFileSync(path.join(T.SERVICE, 'public', 'opmsg-ui.js'), 'utf8'));
const APERCU = (() => { const h = fs.readFileSync(path.join(T.RACINE, 'apercu', 'opmessages', 'index.html'), 'utf8'); return sansCommentairesJs((/<script>([\s\S]*?)<\/script>/.exec(h) || [, ''])[1]); })();
const X = extraire(SERVI), XA = extraire(APERCU);
/* La page n'est pas montée : on lui donne ce que `htmlMessage` lit pour un message TEXTE (qui je suis, comment on échappe, qu'aucune action de message n'est proposée) — rien d'autre. Un message qui
   dépendrait d'autre chose jetterait ici et le banc le dirait. */
function faireStatut(moiId) {
  const ctx = { Intl, Date, Number, String, Array, Object, console, MOI: { id: moiId }, CAP: {}, source: {}, etat: { menu: null },
    esc: (s) => String(s).replace(/[&<>"']/g, ch => '&#' + ch.charCodeAt(0) + ';'), multi: () => false, nomAuteur: () => '', texteRiche: (t) => String(t) };
  vm.createContext(ctx);
  vm.runInContext(X.fmt + '\n' + X.corps + '\nthis.htmlMessage = htmlMessage;', ctx);
  return (conv, m) => ctx.htmlMessage(conv, m, true, true).st;
}
const hhmm = (ts) => { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };

(async () => {
  const noms = ['ana', 'ben', 'dan'];
  const og = await T.fauxOpGestion(Object.fromEntries(noms.map(n => [n, { pass: 'pw-' + n + '-1234', nom: n[0].toUpperCase() + n.slice(1) + ' Test', actif: true }])));
  const svc = await T.lancerService({ urlGestion: og.url, horloge: true });
  const ouverts = [];
  let deca = 0;
  const avancer = (ms) => { deca += ms; svc.avancer(ms); };
  const faux = { priseEnCharge: () => ({ ok: false, raison: 'navigateur' }), permission: () => 'default', visible: () => true, surMessage: () => {}, abonnementActuel: async () => null };
  /* une page : un module de données neuf (rien en mémoire) ; `retire` : des champs que le « service d'avant » ne rendait pas, retirés de ses réponses de détail */
  async function page(login, retire) {
    const nav = T.navigateur(svc.base);
    const f = !retire ? nav.fetch : async (url, init) => {
      const r = await nav.fetch(url, init);
      if (!/\/api\/conversations\/[^/?]+$/.test(String(url)) || (init && init.method && init.method !== 'GET')) return r;
      const j = await r.clone().json();
      for (const m of j.membres || []) for (const k of retire) delete m[k];
      return new Response(JSON.stringify(j), { status: r.status, headers: { 'Content-Type': 'application/json' } });
    };
    const src = creerSourceServeur({ OPMSG, base: svc.base, fetch: f, EventSource: nav.EventSource, navigateur: faux, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5 });
    await src.connexion(login, 'pw-' + login + '-1234'); const d = await src.demarrer();
    if (!d.connecte) throw new Error('démarrage refusé pour ' + login + ' : ' + JSON.stringify(d));
    ouverts.push(src);
    return src;
  }
  try {
    console.log('La fonction de la page : celle du fichier SERVI est celle de l\'aperçu');
    vrai('(population) ' + X.corps.length + ' caractères de `htmlMessage` dans le script servi, ' + XA.corps.length + ' dans l\'aperçu', X.corps.length > 2000 && XA.corps.length > 2000 && !!X.fmt);
    vrai('⛔ le générateur n\'a RIEN changé à l\'écriture du statut : `FMT_HEURE` et le texte de `htmlMessage` sont identiques', X.fmt === XA.fmt && X.corps === XA.corps);

    const A = await page('ana'), B = await page('ben'), Dn = await page('dan');
    const moiA = A.moi(), idB = B.moi().id;
    const statutA = faireStatut(moiA.id);
    /* les contacts : Ben et Dan créent leur lien (par la route), Ana l'accepte par le VRAI module de la page — la conversation à deux est celle de l'acceptation */
    const lien = async (login) => { const c = await T.connecter(svc, og, login, 'pw-' + login + '-1234', '198.51.100.' + (login === 'ben' ? 80 : 81)); const l = await c.post('/api/contacts/lien', {}); if (l.code !== 201) throw new Error('lien refusé pour ' + login); return A.accepterLien(l.j.code); };
    const conv = (await lien('ben')).conv;
    await lien('dan');
    /* le dernier message que ANA a envoyé : la page écrit le statut sous lui */
    const envoye = await A.envoyer(conv, { texte: 'Salut Ben' });
    const dernierAna = async (src) => { const o = await src.ouvrir(conv); const l = o.messages.filter(m => m.auteur === moiA.id); return { ouv: o, m: l[l.length - 1] }; };
    const avantLecture = await dernierAna(A);
    v('(population) avant toute lecture, le statut est « Envoyé »', statutA({}, avantLecture.m), 'Envoyé');

    console.log('\nEn direct : Ben lit, la page écrit « Lu <heure> »');
    avancer(2 * HEURE);
    const t0 = Date.now() + deca;
    await B.ouvrir(conv); await B.marquerLu(conv);
    const t1 = Date.now() + deca;
    let enDirect = null;
    vrai('l\'événement de lecture arrive : le statut dit « Lu » suivi d\'une heure', await att(async () => { const d = await dernierAna(A); if (typeof d.m.lu === 'number') enDirect = d.m.lu; return enDirect !== null; }));
    vrai('l\'heure est celle de la lecture de Ben (dans la fenêtre du geste)', enDirect >= t0 && enDirect <= t1);
    v('⛔ la page écrit « Lu ' + hhmm(enDirect) + ' »', statutA({}, (await dernierAna(A)).m), 'Lu ' + hhmm(enDirect));

    console.log('\nAprès un rechargement : un module neuf, rien en mémoire — le MÊME statut');
    const A2 = await page('ana');
    const recharge = await dernierAna(A2);
    vrai('⛔ le message porte l\'heure de lecture (un NOMBRE), plus `true`', typeof recharge.m.lu === 'number');
    v('⛔ la même heure que celle du direct', recharge.m.lu, enDirect);
    v('⛔ la page écrit « Lu ' + hhmm(enDirect) + ' » après le rechargement, comme en direct', statutA({}, recharge.m), 'Lu ' + hhmm(enDirect));

    console.log('\nUn service d\'AVANT (qui ne rend pas l\'heure) : « Lu » sans heure, comme avant — rien d\'inventé');
    const Avant = await page('ana', ['lu_ts']);
    const sansHeure = await dernierAna(Avant);
    v('le message reste lu, sans heure (`true`)', sansHeure.m.lu, true);
    v('la page écrit « Lu » seul — ni « Lu undefined », ni une heure de la séance', statutA({}, sansHeure.m), 'Lu');

    console.log('\nLes accusés coupés se disent « Envoyé » — dans les deux sens');
    const coupe = await T.connecter(svc, og, 'ben', 'pw-ben-1234', '198.51.100.90');
    v('(Ben coupe ses accusés par la route)', (await coupe.post('/api/moi/maj', { prefs: { accuses: false } })).code, 200);
    const A3 = await page('ana');
    const sansAccuse = await dernierAna(A3);
    v('⛔ Ana ne voit plus rien de la lecture de Ben : le statut redevient « Envoyé »', [sansAccuse.m.lu, statutA({}, sansAccuse.m)], [null, 'Envoyé']);
    await coupe.post('/api/moi/maj', { prefs: { accuses: true } });
    const coupeA = await T.connecter(svc, og, 'ana', 'pw-ana-1234', '198.51.100.91');
    await coupeA.post('/api/moi/maj', { prefs: { accuses: false } });
    const A4 = await page('ana');
    const anaCoupe = await dernierAna(A4);
    v('⛔ Ana, qui a coupé les siens, ne voit pas non plus ceux de Ben : « Envoyé »', [anaCoupe.m.lu, statutA({}, anaCoupe.m)], [null, 'Envoyé']);
    await coupeA.post('/api/moi/maj', { prefs: { accuses: true } });
    const A5 = await page('ana');
    v('rallumés, l\'heure revient (rien n\'était perdu)', statutA({}, (await dernierAna(A5)).m), 'Lu ' + hhmm(enDirect));

    console.log('\nUn groupe garde son comportement : « Lu » quand TOUS les autres ont lu, avec l\'heure de la dernière lecture');
    const G = await A.creerGroupe({ nom: 'Chantier', membres: [idB, Dn.moi().id] });
    await A.envoyer(G.id, { texte: 'Bonjour le groupe' });
    const dernierG = async (src) => { const o = await src.ouvrir(G.id); const l = o.messages.filter(m => m.auteur === moiA.id && !m.systeme); return l[l.length - 1]; };
    avancer(HEURE);
    await B.ouvrir(G.id); await B.marquerLu(G.id);
    await T.dort(300);
    const tiers = await dernierG(A5);
    v('(population) seul Ben a lu : le statut reste « Envoyé » (Dan n\'a pas lu)', [tiers.lu, statutA({}, tiers)], [null, 'Envoyé']);
    avancer(15 * 60000);
    const g0 = Date.now() + deca;
    await Dn.ouvrir(G.id); await Dn.marquerLu(G.id);
    const g1 = Date.now() + deca;
    let heureG = null;
    vrai('quand Dan a lu aussi, le statut dit « Lu <heure> », après un rechargement', await att(async () => { const A6 = await page('ana'); const m = await dernierG(A6); if (m && typeof m.lu === 'number') heureG = m.lu; return heureG !== null; }));
    vrai('…et l\'heure est celle de la DERNIÈRE lecture (Dan), pas de la première', heureG >= g0 && heureG <= g1);
    v('⛔ la page écrit « Lu ' + hhmm(heureG) + ' »', statutA({}, { auteur: moiA.id, texte: 'x', lu: heureG }), 'Lu ' + hhmm(heureG));
  } catch (e) { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; }
  finally {
    for (const s of ouverts) { try { s.arreter && s.arreter(); } catch (e) { /* déjà arrêté */ } }
    await svc.arreter(); await og.fermer();
  }
  fin();
})();

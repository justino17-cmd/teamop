/* ⛔ CE QUE CE FICHIER PROUVE — une écriture partie d'un instantané PÉRIMÉ n'a pas lieu.

   Justin, 15 septembre 2026 au soir, chez ELAN : « quand ils se déplacent dans un endroit,
   ça synchronise et ça efface tout ce qu'ils sont en train de faire ».

   LE MÉCANISME. `syncPush` prend une copie de `db`, puis ATTEND : compression (v690) puis
   chiffrement. Mesuré sur la base d'ELAN, cette attente est passée de ~178 ms à ~433 ms le
   jour où la compression a été allumée. Pendant ce temps, l'écoute Firestore est libre de
   recevoir le document d'un collègue et de faire `db=remote` — c'est écrit noir sur blanc au
   commentaire de la ligne 5437. Au réveil, `syncPush` écrit l'instantané qu'il tenait AVANT
   cette réception, et `_fbDoc.set()` REMPLACE le document de l'équipe : le travail du collègue
   est effacé pour tout le monde, et le nôtre paraît avoir « reculé ».

   `_syncApplying` ne protégeait pas : il n'est lu qu'à la PREMIÈRE ligne de syncPush, jamais
   après l'attente.

   ⛔ POURQUOI UNE SUITE DE PLUS, ALORS QUE test-706 EXISTE. test-706 lit le TEXTE du fichier :
   il vérifie que la garde est écrite. Il ne l'exécute pas. Ici on EXTRAIT la vraie fonction
   `syncPush` du fichier livré et on la FAIT TOURNER dans les deux cas — réception concurrente
   ou non — pour constater ce qu'elle écrit vraiment. C'est la méthode des quatorze autres
   suites du dépôt : on éprouve le code servi, pas une copie. */

const fs = require('fs');
const vm = require('vm');
const APP = fs.readFileSync(__dirname + '/../app.html', 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };

console.log('Une écriture partie d’un instantané périmé n’a pas lieu (vraie fonction exécutée)');

/* Extraction par comptage d'accolades, comme les autres suites : une borne en nombre de
   caractères cesse de voir le code le jour où il grandit (leçon de test-637, refaite sur
   test-660 le 15 septembre au soir). */
function extraire(nom) {
  const d = APP.indexOf('function ' + nom + '(');
  if (d < 0) return null;
  let i = APP.indexOf('{', d), p = 0;
  for (; i < APP.length; i++) {
    const c = APP[i];
    if (c === '{') p++;
    else if (c === '}') { p--; if (!p) return APP.slice(d, i + 1); }
  }
  return null;
}

const SRC = extraire('syncPush');
v('la vraie fonction syncPush est extraite du fichier livré', !!SRC, true);
v('…et elle porte bien la garde qu’on éprouve', /_dbGen!==_genAvant/.test(SRC || ''), true);

/* ─────────────────────────────────────────────────────────────────────────────
   Le banc : tout ce que syncPush touche, en trompe-l'œil, sauf la garde elle-même. */
function banc(opts) {
  const recu = { fait: false };
  const instant = { pris: false, ecrits: -1, syncTs: -1 };
  const dernier = { clair: '' };
  const ecrits = [];
  const repousses = [];
  const ctx = {
    // — l'état de la synchro, tel qu'il est quand un envoi part vraiment
    _syncOn: true, _syncApplying: false, _syncGotInitial: true, _syncTimer: null,
    _versionBloquee: false, _nuageIllisible: false, _horsLigne: false, _horsLignePush: false,
    _dbGen: 0, _syncTs: 111, _retraitVoulu: 0, _allegeDit: 0, _lourdDit: false,
    _pushManuel: false, _fbFileSaturee: false,
    db: { produits: [], boxes: [] }, currentUser: null,
    NUAGE_ENC_MAX: 780 * 1024, B_NUAGE_KO: 620, STORE_KEY: 'elan_test',
    APP_VERSION: '693', APP_VERSION_NUM: 693, PUSH_API: 'http://127.0.0.1:1',
    // — le document d'équipe : aucune version distante, on reste sur le chemin nu
    _fbDoc: {
      get: async () => ({ data: () => null }),
      set: (charge) => { ecrits.push({ charge: charge, base: dernier.clair }); return { then: (f) => { try { f(); } catch (e) {} return { catch: () => {} }; } }; }
    },
    /* ⛔ LE CŒUR DU BANC : la compression rend la main APRÈS qu'une réception a remplacé `db`.
       C'est exactement la fenêtre réelle — l'attente de syncAllegerNuage puis de syncEncrypt —
       et `_dbGen++` est ce que fait le vrai récepteur sur la même ligne que `db=remote`. */
    syncAllegerNuage: async (base) => {
      await new Promise(r => setTimeout(r, 5));
      /* UNE SEULE FOIS : la reception concurrente est un incident, pas un etat. La rejouer a
         chaque tentative ferait boucler l'envoi reprogramme — ce qui prouve d'ailleurs que la
         garde ne perd rien : elle repousse, elle n'abandonne pas. */
      if (opts.receptionPendant && !recu.fait) { recu.fait = true; ctx.db = { produits: [{ id: 'venu-du-collegue' }], boxes: [] }; ctx._dbGen++; }
      return { impossible: false, retirees: 0, taille: 5000, doc: 2000, copie: base, gz: null, parColl: [], gros: [] };
    },
    /* On garde EN CLAIR ce qu'on s'apprete a chiffrer : c'est le seul moyen de dire si ce qui
       part dans le nuage porte le travail du collegue ou l'instantane d'avant sa reception. */
    syncEncrypt: async (clair) => { dernier.clair = String(clair || ''); await new Promise(r => setTimeout(r, 5)); return { enc: 'x', iv: 'y', salt: 'z', z: 0 }; },
    // — le reste : présent pour que la fonction aille au bout, muet par ailleurs
    syncReadRemote: async () => null, fusionnerBases: (a) => a, syncRegreffer: () => {},
    usersTombesFusion: () => [], usersFusionner: (a) => a || [], syncManque: () => null,
    miseDeCote: async () => {}, cnxSignaler: () => {}, refreshEcran: () => {}, alert: () => {},
    ombreRelever: () => {}, syncDeviceId: () => 'banc', fullName: () => '', logEvent: () => {},
    syncDiagnostic: () => {}, toast: () => {}, horsLigneDebut: () => {},
    versionRefuseeParNuage: () => {}, sauvegardeDeposer: () => {},
    localStorage: { setItem: () => {}, getItem: () => null },
    fetch: async () => ({ ok: true }), AbortController: function () { this.abort = () => {}; this.signal = null; },
    /* ⛔ ON MESURE A L'INSTANT DE L'ABANDON, PAS SUR UN CHRONOMETRE. Premiere ecriture de ce
       banc : les assertions tombaient 120 ms plus tard, quand l'envoi REPROGRAMME avait deja
       ecrit — le banc lisait donc 1 ecriture et un repere avance, et declarait la garde en
       echec sur du code juste. Une mesure prise au mauvais moment ne mesure pas la meme chose. */
    console: { warn: (m) => { m = String(m); repousses.push(m);
      if (/push abandonn/.test(m) && !instant.pris) { instant.pris = true; instant.ecrits = ecrits.length; instant.syncTs = ctx._syncTs; } },
      error: () => {}, log: () => {} },
    setTimeout: (f, d) => setTimeout(f, Math.min(d || 0, 20)), clearTimeout,
  };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  return { ctx, ecrits, repousses, instant };
}

/* ── 1) CONTRE-TEST : sans réception concurrente, l'écriture part. Sans lui, une garde qui
      bloquerait TOUT passerait pour un correctif — et la synchro serait morte en silence. */
{
  const b = banc({ receptionPendant: false });
  b.ctx.syncPush(true);
  // l'attente du banc est de 10 ms ; on laisse trois fois le temps
  const fini = new Promise(r => setTimeout(r, 120));
  module.exports = fini.then(() => {
    v('⛔ CONTRE-TEST — sans réception concurrente, l’écriture part bien', b.ecrits.length, 1);
    v('…et c’est bien le document chiffré qui part', !!(b.ecrits[0] && b.ecrits[0].charge && b.ecrits[0].charge.enc), true);
    v('le repère de réception a avancé (écriture acquittée)', b.ctx._syncTs > 111, true);

    /* ── 2) LE CAS D'ELAN : une réception remplace `db` pendant la compression. */
    const c = banc({ receptionPendant: true });
    c.ctx.syncPush(true);
    return new Promise(r => setTimeout(r, 120)).then(() => {
      v('l’abandon est dit dans la console, pas avalé en silence', c.instant.pris, true);
      v('⛔ une réception pendant la compression ANNULE l’écriture', c.instant.ecrits, 0);
      v('⛔ …et le repère est REMIS où il était, sinon l’appareil devient sourd', c.instant.syncTs, 111);
      v('la base porte bien ce que le collègue a envoyé', (c.ctx.db.produits[0] || {}).id, 'venu-du-collegue');

      /* ── 3) Rien n'est perdu : un nouvel envoi est reprogrammé, et il part. */
      return new Promise(r => setTimeout(r, 400)).then(() => {
        v('⛔ un nouvel envoi est reprogrammé, et il PART (rien n’est perdu)', c.ecrits.length >= 1, true);
        v('…et il porte la base fusionnée, pas l’instantané périmé', c.ctx._syncTs > 111, true);
        /* ⛔ L'INVARIANT QUI RÉSUME TOUT — et le seul qui parle le langage du client : AUCUNE
           écriture partie vers le nuage n'a le droit d'ignorer ce que le collègue vient
           d'envoyer. Mesuré sur la v691 (sans la garde), ce contrôle tombe : la première
           écriture porte l'instantané d'AVANT la réception, et `_fbDoc.set` REMPLACE le
           document de l'équipe — le travail du collègue est effacé pour tout le monde. */
        v('⛔ AUCUNE écriture ne part sans le travail du collègue', c.ecrits.map(x => /venu-du-collegue/.test(x.base || '')), c.ecrits.map(() => true));
        v('…et il y en a bien eu une', c.ecrits.length >= 1, true);

        console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
        if (ko) process.exitCode = 1;
      });
    });
  });
}

/* ══ op-fs.js — L'API FIRESTORE, SERVIE PAR LE SOCLE DU VPS ═══════════════════════════════════
 *
 * ⛔ POURQUOI CE FICHIER EXISTE PLUTÔT QU'UNE RÉÉCRITURE. `messages.html` fait 12 200 lignes et
 * parle à Firestore 128 fois (`collection(`), 162 fois (`doc(`), avec 15 écouteurs temps réel.
 * Réécrire chaque appel, c'est 300 occasions de se tromper en silence. Reproduire l'API à
 * l'identique, c'est UN endroit à éprouver — et la page change d'une ligne :
 *
 *     const fs = firebase.firestore();      →      const fs = opFs({...});
 *
 * ⛔ ET IL N'AJOUTE AUCUNE ROUTE AU SERVEUR. Le socle range déjà des enregistrements
 * `{coll, id, corps, maj_le}` — c'est exactement un document Firestore rangé par chemin. Les
 * quatre routes dont ce fichier a besoin existent, sont durcies et sont benchées :
 * `/api/op/session`, `/api/op/pousser`, `/api/op/depuis`, `/api/op/flux`. Mesuré avant d'écrire
 * une ligne : `pousser` ne filtre AUCUN nom de collection (`String(l.c || '')`), donc
 * `op_companies/X/rooms` passe comme `produits`. Une pièce de moins à écrire, à auditer et à
 * sauvegarder — et le chiffrement, le journal, le retour en arrière et la sauvegarde hors site
 * viennent avec, gratuitement.
 *
 * ⛔ LE FORMAT DE FIL N'EST PAS INVENTÉ, IL EST COPIÉ. `{c, id, m, r, e}` pour une écriture,
 * `{c, id, m, sup}` pour une tombe — vérifié dans `server/socle.js` champ par champ
 * (`l.r === undefined` → refus `corps_absent`). La panne n° 1 de CLAUDE.md est exactement
 * celle-là : l'appareil envoyait `{lignes:[…]}`, le serveur attendait `b.enr`, 400, boucle
 * quittée, INERTE EN SILENCE. On ne réinvente pas un format qui existe.
 *
 * ⚠️ CE QUI N'EST PAS REPRODUIT, ET C'EST DÉLIBÉRÉ : les transactions, les curseurs
 * (`startAfter`), `FieldPath`, les sous-requêtes `>`/`<`. `messages.html` n'en utilise aucun —
 * mesuré. Ce qui n'est pas mesuré n'est pas écrit : du code que personne n'appelle est du code
 * que personne ne teste.
 */
(function (racine) {
  'use strict';

  /* ── L'EMPREINTE — LA MÊME QUE CELLE D'`app.html`, PAS UNE SECONDE ────────────────────────
     `opEmpreinte` (app.html:6569) est FNV-1a sur un JSON à clés ordonnées. Le serveur ne la
     recalcule pas, il la range — et `signatureCanonique` s'en sert pour dire si deux côtés
     divergent. Deux formules donneraient deux empreintes pour le même contenu : la divergence
     serait annoncée en permanence, donc plus jamais crue. */
  function canon(v) {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(canon);
    const o = {};
    for (const k of Object.keys(v).sort()) if (v[k] !== undefined) o[k] = canon(v[k]);
    return o;
  }
  function empreinte(r) {
    const t = JSON.stringify(canon(r)) || '';
    let h = 2166136261;
    for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  }

  /* Un identifiant de document quand l'appelant n'en donne pas (`.add()`, `.doc()` sans
     argument). ⛔ JAMAIS dérivé d'un contenu : deux messages au même texte à la même seconde
     sont deux messages, et un identifiant dérivé les confondrait en un seul, définitivement. */
  function autoId() {
    const A = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let s = '';
    const n = 20;
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const b = new Uint8Array(n); crypto.getRandomValues(b);
      for (let i = 0; i < n; i++) s += A[b[i] % A.length];
    } else {
      const c = require('crypto').randomBytes(n);
      for (let i = 0; i < n; i++) s += A[c[i] % A.length];
    }
    return s;
  }

  /* ── ⛔ COMMENT UN CHEMIN FIRESTORE DEVIENT UNE CLÉ DU SOCLE — MESURÉ, PAS DEVINÉ ─────────
     Le socle borne ses chaînes : `COLL_MAX = 40`, `ID_MAX = 200` (`server/socle.js:54`). Un
     chemin imbriqué d'OP MESSAGES les dépasse tout de suite — `op_companies/c1/channels/
     general/messages` fait 45 caractères, et le premier banc écrit est tombé dessus en
     `identite_trop_longue`. ⛔ ON NE RELÈVE PAS LA BORNE : elle protège un disque partagé par
     TOUTES les entreprises, et un disque plein n'est pas une entreprise à terre, c'est toutes.
     On range donc autrement : le GENRE du document dans `coll` (`messages`, `rooms`, `devices`
     — court par nature), et le chemin COMPLET dans `id`, où il y a 200 caractères de marge.
     Deux canaux différents partagent donc `coll='messages'` : c'est le préfixe de l'`id` qui
     les sépare, et la requête filtre dessus. */
  const CLE = (c, id) => c + '\u0000' + id;
  const GENRE_MAX = 40, CHEMIN_MAX = 200;
  function decouper(chemin, id) {
    const genre = chemin.split('/').pop();
    const plein = chemin + '/' + id;
    /* ⛔ Une borne dépassée JETTE ici plutôt que de partir se faire refuser par le serveur :
       le refus arriverait après la mise à jour optimiste du miroir, donc l'écran aurait déjà
       montré le message. Tomber tôt nomme le vrai coupable. */
    if (genre.length > GENRE_MAX) { const e = new Error('genre de document trop long : ' + genre); e.motif = 'genre_trop_long'; throw e; }
    if (plein.length > CHEMIN_MAX) { const e = new Error('chemin trop long (' + plein.length + ' > ' + CHEMIN_MAX + ') : ' + plein); e.motif = 'chemin_trop_long'; throw e; }
    return { genre: genre, plein: plein };
  }
  /* Firestore interdit `/` dans un identifiant de document, et ici ce serait pire qu'une
     erreur : l'identifiant deviendrait indistinguable d'un sous-chemin, donc un document
     apparaîtrait dans la requête d'une collection à laquelle il n'appartient pas. */
  function exigerId(id) {
    const s = String(id);
    if (!s || s.indexOf('/') >= 0 || s.indexOf('\u0000') >= 0) {
      const e = new Error('identifiant de document refusé : « ' + s.slice(0, 40) + ' »'); e.motif = 'id'; throw e;
    }
    return s;
  }

  /* ── LES VALEURS SPÉCIALES ────────────────────────────────────────────────────────────────
     Firestore les résout côté serveur ; ici c'est l'appareil qui les applique avant d'envoyer,
     parce que le socle range un corps opaque et ne l'interprète jamais. ⚠️ Conséquence à
     connaître : `increment` n'est PAS atomique entre deux appareils — deux +1 simultanés
     peuvent n'en faire qu'un. `messages.html` s'en sert UNE fois (un compteur d'affichage),
     jamais sur un compte qui doit être juste. Ne pas l'utiliser pour autre chose sans revenir
     ici : le socle refuse déjà `maj_le` périmé, mais il ne sait pas additionner. */
  const MARQUE = '__opfs__';
  const FieldValue = {
    serverTimestamp: () => ({ [MARQUE]: 'ts' }),
    delete: () => ({ [MARQUE]: 'del' }),
    increment: (n) => ({ [MARQUE]: 'inc', n: Number(n) || 0 }),
    arrayUnion: (...v) => ({ [MARQUE]: 'union', v: v }),
    arrayRemove: (...v) => ({ [MARQUE]: 'retire', v: v }),
  };
  const estMarque = (x) => !!x && typeof x === 'object' && typeof x[MARQUE] === 'string';

  /* Applique les valeurs spéciales sur l'état COURANT du document. `avant` peut être absent :
     un `set()` sur un document neuf part d'un objet vide, et `arrayUnion` y crée la liste. */
  function resoudre(avant, patch, maintenant) {
    const base = avant && typeof avant === 'object' ? avant : {};
    const sortie = Object.assign({}, base);
    for (const k of Object.keys(patch || {})) {
      const v = patch[k];
      if (!estMarque(v)) {
        if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
          sortie[k] = resoudre(base[k], v, maintenant);   // fusion en profondeur, comme Firestore
        } else sortie[k] = v;
        continue;
      }
      const av = base[k];
      if (v[MARQUE] === 'ts') sortie[k] = maintenant;
      else if (v[MARQUE] === 'del') delete sortie[k];
      else if (v[MARQUE] === 'inc') sortie[k] = (typeof av === 'number' ? av : 0) + v.n;
      else if (v[MARQUE] === 'union') {
        const l = Array.isArray(av) ? av.slice() : [];
        for (const x of v.v) if (!l.some(y => memeValeur(y, x))) l.push(x);
        sortie[k] = l;
      } else if (v[MARQUE] === 'retire') {
        const l = Array.isArray(av) ? av.slice() : [];
        sortie[k] = l.filter(y => !v.v.some(x => memeValeur(y, x)));
      }
    }
    return sortie;
  }
  const memeValeur = (a, b) => a === b || (a && b && typeof a === 'object' && typeof b === 'object'
    && JSON.stringify(canon(a)) === JSON.stringify(canon(b)));

  /* Le champ d'un document, y compris en notation pointée (`a.b.c`) — `where` et `orderBy`
     l'acceptent dans Firestore, et `messages.html` s'en sert. */
  function champ(o, chemin) {
    let v = o;
    for (const p of String(chemin).split('.')) {
      if (v === null || typeof v !== 'object') return undefined;
      v = v[p];
    }
    return v;
  }

  function opFs(cfg) {
    const conf = cfg || {};
    const base = String(conf.base || '').replace(/\/+$/, '');
    let jeton = String(conf.jeton || '');
    const appId = String(conf.appId || '');
    const alerter = typeof conf.alerter === 'function' ? conf.alerter : function () {};

    const miroir = new Map();          // "genre\0chemin/complet/id" -> { m, r }
    /* ⛔ L'INDEX PAR COLLECTION — MESURÉ, PAS PRÉVENTIF. Sans lui, chaque écouteur rebalayait le
       miroir ENTIER à chaque message reçu, et `prevenir()` les réveillait tous. Mesuré sur le
       vrai fichier, 15 écouteurs (une session OP MESSAGES ordinaire) :

           3 600 documents →  17 ms par message reçu   ✅
          12 000 documents →  28 ms                     ✅
          36 000 documents →  72 ms                     ⛔ l'écran se fige
         120 000 documents → 205 ms                     ⛔

       36 000, c'est une entreprise qui discute depuis deux ans. Le coût était LINÉAIRE en
       taille de base pour un travail qui ne dépend que du canal ouvert — exactement la faute
       que `/api/op/flux` a déjà payée côté serveur (`etat()` qui rehache tout là où `rang()`
       lit un entier). Avec l'index, une requête ne voit que les documents de SA collection, et
       un écouteur ne se réveille que si SA collection a bougé. */
    const parColl = new Map();         // "chemin/de/collection" -> Set<clé du miroir>
    const ecouteurs = new Set();       // { coll, tirer() }
    let seq = 0, vivant = false;

    const collDe = (plein) => plein.slice(0, plein.lastIndexOf('/'));
    function poser(k, v) {
      const c = collDe(k.slice(k.indexOf('\u0000') + 1));
      let s = parColl.get(c); if (!s) { s = new Set(); parColl.set(c, s); }
      s.add(k); miroir.set(k, v); return c;
    }
    function oter(k) {
      const c = collDe(k.slice(k.indexOf('\u0000') + 1));
      const s = parColl.get(c);
      if (s) { s.delete(k); if (!s.size) parColl.delete(c); }
      miroir.delete(k); return c;
    }
    /* `touchees` absent = « on ne sait pas », donc on réveille tout le monde. Un écouteur qui
       ne se réveille pas est un écran qui ment ; en cas de doute on paie le balayage. */
    const prevenir = (touchees) => {
      for (const e of Array.from(ecouteurs)) {
        if (touchees && !touchees.has(e.coll)) continue;
        try { e.tirer(); } catch (x) {}
      }
    };

    async function appel(chemin, opts) {
      const o = Object.assign({ headers: {} }, opts || {});
      o.headers = Object.assign({ 'Content-Type': 'application/json' }, o.headers);
      if (jeton) o.headers['Authorization'] = 'Bearer ' + jeton;
      const r = await fetch(base + chemin, o);
      let j = null; try { j = await r.json(); } catch (e) {}
      return { code: r.status, j: j };
    }

    /* ── LA LECTURE ───────────────────────────────────────────────────────────────────────
       `/api/op/depuis` rend 400 lignes au plus et pose `tronquee` : on repage jusqu'à être à
       jour. ⛔ Sans la boucle, une base de plus de 400 documents ne se chargerait QUE
       partiellement, et l'écran afficherait une moitié de conversation sans rien dire. */
    async function rattraper() {
      for (let tour = 0; tour < 500; tour++) {
        const r = await appel('/api/op/depuis?seq=' + seq);
        if (r.code !== 200 || !r.j) { alerter('lecture refusée', r.code); return false; }
        const touchees = new Set();
        for (const l of (r.j.enr || [])) {
          const k = CLE(l.c, l.id);
          touchees.add(l.sup ? oter(k) : poser(k, { m: l.m || 0, r: l.r }));
          if (l.s > seq) seq = l.s;
        }
        if (typeof r.j.seq === 'number' && r.j.seq > seq) seq = r.j.seq;
        if (!r.j.tronquee) { prevenir(touchees); return true; }
      }
      alerter('rattrapage interminable');
      return false;
    }

    /* ── LE TEMPS RÉEL ────────────────────────────────────────────────────────────────────
       `/api/op/flux` est un long-poll : il répond tout de suite si l'appareil est en retard,
       sinon il attend qu'un AUTRE appareil écrive. `reveiller` exclut celui qui vient d'écrire
       — inutile de le réveiller pour son propre changement. */
    async function boucle() {
      while (vivant) {
        try {
          const r = await appel('/api/op/flux?depuis=' + seq);
          if (!vivant) return;
          if (r.code === 200 && r.j && typeof r.j.seq === 'number' && r.j.seq > seq) await rattraper();
          else if (r.code === 401 || r.code === 403) { alerter('session refusée', r.code); return; }
          else if (r.code !== 200) await pause(3000);
        } catch (e) { if (vivant) await pause(3000); }
      }
    }
    const pause = (ms) => new Promise(r => setTimeout(r, ms));

    /* ── L'ÉCRITURE ───────────────────────────────────────────────────────────────────────
       ⛔ LE MIROIR EST MIS À JOUR AVANT L'ALLER-RETOUR, et c'est ce qui fait qu'un message
       s'affiche à l'instant où on appuie. Mais en cas de refus il faut REVENIR : le socle
       refuse `maj_le` périmé (`perime`) et rend SA version — on l'adopte, on ne garde pas une
       version que le serveur a rejetée. Sans ça, l'écran d'un appareil montrerait pour
       toujours un état que personne d'autre ne voit. */
    async function ecrire(chemin, id, corps, sup) {
      const d = decouper(chemin, id);
      const c = d.genre, cle = d.plein;
      const k = CLE(c, cle);
      const avant = miroir.has(k) ? miroir.get(k) : null;
      const m = Date.now();
      prevenir(new Set([sup ? oter(k) : poser(k, { m: m, r: corps })]));

      const ligne = sup ? { c: c, id: cle, m: m, sup: m } : { c: c, id: cle, m: m, r: corps, e: empreinte(corps) };
      let r;
      try { r = await appel('/api/op/pousser', { method: 'POST', body: JSON.stringify({ enr: [ligne], ver: 'opfs' }) }); }
      catch (e) { r = { code: 0, j: null }; }

      const refus = (r.j && r.j.refus) || [];
      if (r.code !== 200 || refus.length) {
        const x = refus[0] || {};
        /* Le serveur renvoie SA version avec le refus — c'est elle qui fait foi. */
        if (x.serveur && x.serveur.r !== undefined && x.serveur.r !== null) poser(k, { m: x.serveur.m || 0, r: x.serveur.r });
        else if (avant) poser(k, avant); else oter(k);
        prevenir(new Set([collDe(cle)]));
        alerter('écriture refusée', x.motif || r.code);
        const err = new Error('écriture refusée : ' + (x.motif || r.code));
        err.motif = x.motif || String(r.code);
        throw err;
      }
      if (r.j && typeof r.j.seq === 'number' && r.j.seq > seq) seq = r.j.seq;
      return true;
    }

    /* ── L'API, TELLE QUE `messages.html` L'APPELLE ───────────────────────────────────────── */
    function instantaneDoc(chemin, id) {
      const d = decouper(chemin, id);
      const e = miroir.get(CLE(d.genre, d.plein));
      const c = chemin;
      return { id: id, exists: !!e, data: () => (e ? JSON.parse(JSON.stringify(e.r)) : undefined), ref: docRef(c, id) };
    }

    function docRef(c, id) {
      return {
        id: id, path: c + '/' + id,
        collection: (sous) => collRef(c + '/' + id + '/' + sous),
        get: async () => instantaneDoc(c, id),
        set: async (data, opts) => {
          const fusion = !!(opts && opts.merge);
          const d = decouper(c, id), e = miroir.get(CLE(d.genre, d.plein));
          const depart = fusion && e ? e.r : {};
          return ecrire(c, id, resoudre(depart, data, Date.now()), false);
        },
        /* ⛔ `update` EXIGE QUE LE DOCUMENT EXISTE — c'est la règle de Firestore, et
           `messages.html` s'appuie dessus : plusieurs appels sont dans un `catch` qui compte
           sur l'échec pour créer le document autrement. Accepter silencieusement créerait des
           documents à moitié remplis, sans que rien ne le signale. */
        update: async (data) => {
          const d = decouper(c, id), e = miroir.get(CLE(d.genre, d.plein));
          if (!e) { const err = new Error('document absent'); err.motif = 'absent'; throw err; }
          return ecrire(c, id, resoudre(e.r, data, Date.now()), false);
        },
        delete: async () => ecrire(c, id, null, true),
        onSnapshot: (cb, onErr) => inscrire(c,
          () => { try { cb(instantaneDoc(c, id)); } catch (e) { if (onErr) onErr(e); } }),
      };
    }

    function inscrire(coll, tirer) {
      const e = { coll: coll, tirer: tirer };
      ecouteurs.add(e);
      try { tirer(); } catch (x) {}            // Firestore tire tout de suite avec l'état courant
      return () => { ecouteurs.delete(e); };
    }

    function requete(c, conds, tri, borne) {
      /* ⛔ DEUX FILTRES, ET IL FAUT LES DEUX. Le GENRE ne suffit pas : `op_companies/A/channels/
         X/messages` et `.../channels/Y/messages` partagent `coll='messages'`, et s'en tenir là
         mélangerait les conversations de deux canaux — le banc le vérifie nommément. Le PRÉFIXE
         ne suffit pas non plus : il faut encore que rien ne reste après l'identifiant, sinon un
         document d'une SOUS-collection remonterait dans la collection parente. */
      const genre = c.split('/').pop(), pre = c + '/';
      const lire = () => {
        let out = [];
        /* L'index rend les clés de CETTE collection, et d'elle seule. Les deux filtres
           ci-dessous restent : ils ne coûtent plus rien et ils gardent la propriété qui
           compte, même si l'index se trompait un jour. */
        for (const k of (parColl.get(c) || [])) {
          const v = miroir.get(k); if (!v) continue;
          const i = k.indexOf('\u0000');
          if (k.slice(0, i) !== genre) continue;
          const plein = k.slice(i + 1);
          if (plein.lastIndexOf(pre, 0) !== 0) continue;
          const reste = plein.slice(pre.length);
          if (!reste || reste.indexOf('/') >= 0) continue;
          const d = v.r;
          let ok = true;
          for (const q of conds) {
            const val = champ(d, q.f);
            if (q.op === '==') ok = memeValeur(val, q.v);
            else if (q.op === 'array-contains') ok = Array.isArray(val) && val.some(x => memeValeur(x, q.v));
            else if (q.op === 'in') ok = Array.isArray(q.v) && q.v.some(x => memeValeur(val, x));
            else ok = false;
            if (!ok) break;
          }
          if (ok) out.push({ id: reste, d: d });
        }
        if (tri) {
          const s = tri.sens === 'desc' ? -1 : 1;
          out.sort((a, b) => {
            const x = champ(a.d, tri.f), y = champ(b.d, tri.f);
            if (x === y) return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
            return (x === undefined ? -1 : y === undefined ? 1 : x < y ? -1 : 1) * s;
          });
        }
        /* ⛔ `limit` GARDE LE DÉBUT, `limitToLast` GARDE LA FIN. Les confondre donnerait les
           300 PREMIERS messages d'une conversation au lieu des 300 DERNIERS — un écran qui
           s'ouvre sur l'an dernier, sans erreur ni message. */
        if (borne && borne.n > 0) out = borne.fin ? out.slice(-borne.n) : out.slice(0, borne.n);
        const docs = out.map(x => instantaneDoc(c, x.id));
        return { docs: docs, size: docs.length, empty: !docs.length, forEach: (f) => docs.forEach(f) };
      };
      const self = {
        where: (f, op, v) => requete(c, conds.concat([{ f: f, op: op, v: v }]), tri, borne),
        orderBy: (f, sens) => requete(c, conds, { f: f, sens: sens || 'asc' }, borne),
        limit: (n) => requete(c, conds, tri, { n: n, fin: false }),
        limitToLast: (n) => requete(c, conds, tri, { n: n, fin: true }),
        get: async () => lire(),
        onSnapshot: (cb, onErr) => inscrire(c,
          () => { try { cb(lire()); } catch (e) { if (onErr) onErr(e); } }),
      };
      return self;
    }

    function collRef(c) {
      const q = requete(c, [], null, null);
      return Object.assign({}, q, {
        id: c.split('/').pop(), path: c,
        doc: (id) => docRef(c, id === undefined || id === null || id === '' ? autoId() : exigerId(id)),
        add: async (data) => { const id = autoId(); await docRef(c, id).set(data); return docRef(c, id); },
      });
    }

    return {
      collection: (nom) => collRef(String(nom)),
      FieldValue: FieldValue,
      /* ⛔ `demarrer` RATTRAPE AVANT DE RENDRE LA MAIN. Un écran qui se dessine sur un miroir
         vide affiche « aucun message » à quelqu'un qui en a trois cents — et c'est exactement
         la panne `_mailboxes` de CLAUDE.md : une liste vide et un « on n'a pas pu savoir » ne
         se confondent pas. Tant que cette promesse n'est pas tenue, la page n'affiche rien. */
      demarrer: async () => { vivant = true; const ok = await rattraper(); boucle(); return ok; },
      arreter: () => { vivant = false; },
      seq: () => seq,
      taille: () => miroir.size,
      jetonPoser: (j) => { jeton = String(j || ''); },
      /* Pour les bancs et les sondes : écrire dans `_miroir` en direct court-circuite l'index
         par collection, donc les requêtes ne rendent plus rien — et une sonde de performance
         annonce alors 0,00 ms parce qu'elle ne fait rien. C'est arrivé à la première mesure. */
      _miroir: miroir, _parColl: parColl, _poser: poser,
    };
  }

  opFs.empreinte = empreinte;
  opFs.FieldValue = FieldValue;
  opFs.autoId = autoId;
  opFs._resoudre = resoudre;

  racine.opFs = opFs;
  if (typeof module !== 'undefined' && module.exports) module.exports = opFs;
})(typeof globalThis !== 'undefined' ? globalThis : this);

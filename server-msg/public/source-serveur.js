/* ══ OP MESSAGES — LA SOURCE DE DONNÉES DU SERVICE ═══════════════════════════════════════════════════════════════════════════
   C'est le module qui REMPLACE `apercu/opmessages/source.js` dans la version servie par le service (`scripts/opmsg-public.js` copie
   l'interface de l'aperçu et ne change que cette pièce) : mêmes méthodes, mêmes formes, les écrans ne bougent pas. Il parle au
   service par `api.js` (le client : routes, en-têtes, codes de refus) et rien d'autre — jamais de `fetch` ici, jamais de jeton :
   la session est un cookie `HttpOnly` que le JavaScript ne voit pas.

   LE CONTRAT est celui de `apercu/opmessages/source.js` (en-tête de ce fichier), PLUS ce qu'un vrai service impose :
     demarrer()            → { connecte:true } | { connecte:false, motif, phrase } : lit la session (cookie), charge la personne, les contacts, la
                             liste, ouvre le flux. `connecte:false` + `motif:'session_requise'` n'est PAS une panne : personne n'est connecté.
     connexion(login,pass) → la personne (la porte bêta : l'identifiant et le mot de passe d'accès donnés par la Tour). La page repart de zéro ensuite.
     deconnexion()         → ferme la session côté service PUIS le flux ; si le service refuse, le flux reste ouvert et l'erreur se dit.
     surSessionMorte(cb)   → cb(motif) quand la session est morte (coupée, expirée) ou que la personne n'est plus la même : la page REPART DE ZÉRO.
     verifierSession()     → relit /api/moi : une autre personne ou plus de session déclenche `surSessionMorte`.
     capacites             → { service, connexion, photos, vocaux, appels, reunions, actionsMessage, groupeInfos, liens, presence, saisie, historique,
                               texteMax } : ce que le service SAIT faire. Ce qu'il ne sait pas encore (photos, vocaux, appels, réunions) dit « bientôt ».
     personne(id)          → { id, nom, prenom, initiales, avatar } d'une personne déjà vue (contact, membre, auteur), sinon null.
     répondre, modifier, supprimer, réagir, saisie, infos de groupe, liens de contact : voir plus bas.
   Les événements de `ecouter(cb)` : 'liste', 'conversation' (id), 'contacts', 'presence', 'reseau' (etat), 'arrivee' (un message d'un autre : de quoi
   afficher une bannière), 'notification', 'retire' (id : la personne n'est plus dans cette conversation), 'avis' (texte : un refus arrivé après coup).

   ⛔ TOUT REFUS SE DIT. Chaque appel qui échoue rend une `ErreurApi` d'`api.js` (`code`, `statut`, `retry`, `phrase()` en français, `dit:true`) ; les refus
   LOCAUX de ce module (message vide, trop long, « bientôt ») ont la même forme. Un écran n'a jamais à inventer une phrase pour un refus qu'il ne comprend pas.
   ⛔ UN ENVOI NE SE PERD PAS ET NE SE DOUBLE PAS. Un message qui part pendant une coupure (réseau, 5xx) reste dans une FILE locale, affiché « En attente »,
   et repart avec le MÊME `cid` à la reprise : le service ne crée jamais deux messages pour le même `cid`, donc une réponse perdue puis un renvoi ne font qu'un.
   ⛔ RIEN N'EST RANGÉ SUR L'APPAREIL : tout vit en mémoire. Un autre compte, dans le même onglet, ne peut rien y retrouver — et la page repart de zéro
   à la déconnexion (`location.replace`), ce module avec elle.
   ⛔ Un texte venu d'un tiers (nom, message) est rendu TEL QUEL : l'échapper est le travail de l'écran. Ce module n'invente aucune adresse d'image : `photo` vaut
   toujours `null` (les photos arrivent à l'étape 4). */
(function (racine) {
  'use strict';
  const MIN = 60000;

  /* Un refus qui ne vient pas du service mais de ce module : même forme qu'une `ErreurApi`. */
  const PHRASES_LOCALES = {
    vide: 'Le message est vide.',
    'trop-long': 'Ce message est trop long (8 000 signes au plus).',
    bientot: 'Cette fonction arrive bientôt.',
    introuvable: 'Introuvable (la conversation a peut-être été supprimée ou tu n\'y es plus).',
    invalide: 'La demande est incorrecte.',
  };
  function erreurLocale(code) {
    const e = new Error(PHRASES_LOCALES[code] || PHRASES_LOCALES.invalide);
    e.name = 'ErreurLocale'; e.code = code; e.statut = 0; e.retry = 0; e.dit = true; e.phrase = () => e.message;
    return e;
  }

  const initialesDe = (nom) => {
    const mots = String(nom || '').trim().split(/\s+/).filter(Boolean);
    if (!mots.length) return '?';
    const a = Array.from(mots[0]), b = mots.length > 1 ? Array.from(mots[mots.length - 1]) : a.slice(1);
    return (a[0] + (b[0] || '')).toUpperCase();
  };
  const indexAvatar = (id) => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 6007; return h % 6; };
  const nomComplet = (p) => p ? ((p.prenom || '') + ' ' + (p.nom || '')).trim() || 'Quelqu\'un' : 'Quelqu\'un';
  const extrait = (t, n) => { const a = Array.from(String(t || '').replace(/\s+/g, ' ').trim()); return a.length > n ? a.slice(0, n).join('') + '…' : a.join(''); };
  const duree = (s) => s % 86400 === 0 ? (s / 86400) + (s === 86400 ? ' jour' : ' jours') : s + ' s';

  function creerSourceServeur(options) {
    const o = options || {};
    const OPMSG = o.OPMSG || racine.OPMSG;
    if (!OPMSG || typeof OPMSG.creer !== 'function') throw new Error('api.js doit être chargé avant source-serveur.js');
    const api0 = o.api || OPMSG.creer({ base: o.base || '', fetch: o.fetch, EventSource: o.EventSource, attente: o.attente });
    const maintenant = o.maintenant || (() => Date.now());
    const planifier = o.planifier || ((f, ms) => setTimeout(f, ms));
    const annuler = o.annuler || ((h) => clearTimeout(h));
    const delaiSaisieMs = o.delaiSaisieMs == null ? 6000 : o.delaiSaisieMs;       // une frappe sans nouvelle depuis ce temps s'éteint toute seule
    const delaiRelireMs = o.delaiRelireMs == null ? 60 : o.delaiRelireMs;          // la liste se relit en un coup après une rafale d'événements
    const attenteEnvoi = typeof o.attenteEnvoi === 'function' ? o.attenteEnvoi : (n) => Math.min(30000, 1500 * Math.pow(2, Math.min(n, 4)));

    let moiApi = null, mort = false, enMarche = false, ecoute = null, suiviMort = null;
    const registre = new Map();            // uid → { id, prenom, nom, statut }
    const enLigne = new Set();
    let contactsApi = [], convsApi = [], listeFraiche = false;
    const convs = new Map();               // id → { detail, messages[], aPlus, charge }
    const saisies = new Map();             // conv → Map(uid → minuterie)
    const lecture = new Map();             // conv → Map(uid → { seq, ts })
    const file = [];                       // l'envoi en attente : { cid, conv, texte, reponse, t, essais }
    let minuterieFile = null, enRelecture = null, derniereSaisie = new Map();
    const ecouteurs = [];
    const emettre = (ev) => ecouteurs.slice().forEach(f => { try { f(Object.assign({}, ev)); } catch (e) { /* un écouteur fautif n'arrête pas les autres */ } });

    /* ── l'API, enveloppée : une session morte se voit partout, d'un seul endroit ── */
    const A = {};
    for (const k of Object.keys(api0)) {
      if (typeof api0[k] !== 'function' || k === 'ecouter' || k === 'appel') continue;
      A[k] = async (...a) => {
        try { return await api0[k](...a); }
        catch (e) { if (e && e.code === 'session_requise' && enMarche) sessionMorte('session_requise'); throw e; }
      };
    }
    A.appel = api0.appel;
    function sessionMorte(motif) {
      if (mort) return;
      mort = true; arreter();
      if (typeof suiviMort === 'function') suiviMort(motif || 'session_requise');
    }

    /* ── les personnes ── */
    function noter(p) {
      if (!p || typeof p.id !== 'string') return;
      const avant = registre.get(p.id) || {};
      registre.set(p.id, { id: p.id, prenom: p.prenom !== undefined ? p.prenom : avant.prenom, nom: p.nom !== undefined ? p.nom : avant.nom, statut: p.statut !== undefined ? p.statut : avant.statut });
    }
    const vuePersonne = (p) => { const n = nomComplet(p); return { id: p.id, nom: n, prenom: (p.prenom || n).split(' ')[0] || n, initiales: initialesDe(n), avatar: indexAvatar(p.id) }; };
    const personne = (id) => { const p = registre.get(id); return p ? vuePersonne(p) : null; };
    const estMoi = (id) => !!moiApi && id === moiApi.id;
    const prenomDe = (id) => estMoi(id) ? 'Vous' : (registre.has(id) ? vuePersonne(registre.get(id)).prenom : 'Quelqu\'un');
    const nomDe = (id) => estMoi(id) ? 'Vous' : (registre.has(id) ? vuePersonne(registre.get(id)).nom : 'Quelqu\'un');

    /* ── les contacts ── */
    const vueContact = (c) => Object.assign(vuePersonne(c), { role: enLigne.has(c.id) ? 'En ligne' : (c.statut || ''), enLigne: enLigne.has(c.id) });
    function installerContacts(liste) {
      contactsApi = liste.filter(c => c.mutuel && !c.bloque);
      enLigne.clear();
      for (const c of liste) { noter(c); if (c.en_ligne) enLigne.add(c.id); }
    }
    async function rafraichirContacts() {
      installerContacts(await A.contacts());
      emettre({ type: 'contacts' });
    }

    /* ── la liste ── */
    function resume(c) {
      const direct = c.type === 'direct';
      if (direct && c.autre) noter(c.autre);
      const nom = direct ? nomComplet(c.autre) : (c.nom || 'Groupe');
      let apercu = '';
      if (c.apercu) {
        const a = c.apercu;
        let corps = a.supprime ? 'Message supprimé' : a.illisible ? 'Message illisible' : a.type === 'systeme' ? 'Activité du groupe' : (a.texte || '');
        corps = corps.replace(/\s+/g, ' ').slice(0, 160);
        const prefixe = a.type === 'systeme' ? '' : estMoi(a.auteur) ? 'Vous : ' : (c.type === 'groupe' ? prenomDe(a.auteur) + ' : ' : '');
        apercu = prefixe + corps;
      }
      const loc = convs.get(c.id);
      const nonLus = loc && loc.luLocal !== undefined && loc.luLocal >= c.dernier_seq ? 0 : c.non_lus;
      return {
        id: c.id, type: c.type, nom, court: nom, initiales: direct ? initialesDe(nom) : '#', avatar: indexAvatar(c.id), photo: null, epingle: !!c.epingle,
        membres: [], admins: c.role === 'admin' && moiApi ? [moiApi.id] : [], annoncesSeulement: !!c.annonces_seules, ephemeres: c.ephemere_s || 0,
        nonLu: nonLus > 0, nonLus, apercu, t: c.dernier_ts, enLigne: direct && c.autre ? enLigne.has(c.autre.id) : false,
        autre: direct && c.autre ? c.autre.id : null,
      };
    }
    async function relireListe() {
      const liste = await A.conversations();
      convsApi = liste; listeFraiche = true;
      for (const c of liste) if (c.autre) noter(c.autre);
    }
    /* Plusieurs événements d'affilée ne font qu'UNE relecture de la liste. */
    function relireListePlusTard() {
      listeFraiche = false;
      if (enRelecture) return enRelecture;
      enRelecture = new Promise((ok) => {
        planifier(async () => {
          enRelecture = null;
          try { await relireListe(); emettre({ type: 'liste' }); } catch (e) { /* le prochain événement ou le prochain `lister()` réessaie et DIT l'échec */ }
          ok();
        }, delaiRelireMs);
      });
      return enRelecture;
    }
    /* `forcer` : relire même si la liste est fraîche (le bouton « Réessayer » d'un refus ne doit pas se contenter de la copie qu'il a déjà) */
    const lister = async (forcer) => {
      if (forcer || !listeFraiche) await relireListe();
      return convsApi.map(resume).sort((x, y) => y.t - x.t);
    };

    /* ── les messages ── */
    function lecteursDe(id) { return lecture.get(id) || lecture.set(id, new Map()).get(id); }
    /* « Lu » : mon message est lu quand l'autre (une directe) ou tous les autres (un groupe) sont allés au moins jusqu'à lui. `true` si l'heure est inconnue. */
    function luDe(conv, c, m) {
      if (!estMoi(m.auteur) || m.type === 'systeme' || !c.detail) return null;
      const autres = c.detail.membres.filter(x => !estMoi(x.id) && x.lu_seq !== null && x.lu_seq !== undefined);
      if (!autres.length || !autres.every(x => x.lu_seq >= m.seq)) return null;
      const L = lecture.get(conv);
      let ts = 0;
      for (const x of autres) { const e = L && L.get(x.id); if (e && e.seq >= m.seq && e.ts > ts) ts = e.ts; else { ts = 0; break; } }
      return ts || true;
    }
    function texteSysteme(m) {
      const k = m.meta && m.meta.k, u = m.meta && m.meta.uid, a = m.auteur;
      switch (k) {
        case 'groupe_cree': return estMoi(a) ? 'Vous avez créé le groupe' : nomDe(a) + ' a créé le groupe';
        case 'membre_ajoute': return estMoi(a) ? 'Vous avez ajouté ' + nomDe(u) : nomDe(a) + ' a ajouté ' + (estMoi(u) ? 'vous' : nomDe(u));
        case 'rejoint': return estMoi(u) ? 'Vous avez rejoint le groupe' : nomDe(u) + ' a rejoint le groupe';
        case 'membre_retire': return estMoi(a) ? 'Vous avez retiré ' + nomDe(u) : estMoi(u) ? nomDe(a) + ' vous a retiré du groupe' : nomDe(a) + ' a retiré ' + nomDe(u);
        case 'membre_parti': return estMoi(u) ? 'Vous avez quitté le groupe' : nomDe(u) + ' a quitté le groupe';
        case 'admin_promu': return estMoi(u) ? 'Vous êtes maintenant administrateur' : nomDe(u) + ' est maintenant administrateur';
        case 'admin_retire': return estMoi(u) ? 'Vous n\'êtes plus administrateur' : nomDe(u) + ' n\'est plus administrateur';
        case 'renomme': return (estMoi(a) ? 'Vous avez' : nomDe(a) + ' a') + ' renommé le groupe';
        case 'annonces_seules': return m.meta.valeur ? 'Seuls les administrateurs peuvent écrire' : 'Tout le monde peut écrire';
        case 'ephemere': return m.meta.valeur ? 'Les messages disparaissent après ' + duree(m.meta.valeur) : 'Les messages éphémères sont désactivés';
        default: return 'Le groupe a été modifié';
      }
    }
    function citation(c, seq) {
      const q = c.messages.find(x => x.seq === seq);
      if (!q) return { seq, auteur: null, nom: 'Message plus ancien', texte: '', introuvable: true };
      return { seq, id: q.id, auteur: q.auteur, nom: nomDe(q.auteur), texte: q.supprime ? 'Message supprimé' : extrait(q.type === 'systeme' ? texteSysteme(q) : q.texte, 120), supprime: !!q.supprime };
    }
    function vueMessage(conv, c, m) {
      const base = { id: m.id, seq: m.seq, auteur: m.auteur, t: m.ts, lu: luDe(conv, c, m) };
      if (m.type === 'systeme') return Object.assign(base, { systeme: true, texte: texteSysteme(m) });
      const v = Object.assign(base, { texte: m.supprime ? '' : (m.illisible ? 'Message illisible' : (m.texte === null || m.texte === undefined ? '…' : m.texte)) });
      if (m.supprime) v.supprime = true;
      if (m.modifie) v.modifie = m.modifie;
      if (m.repond_a) v.reponse = citation(c, m.repond_a);
      if (m.reactions && m.reactions.length) {
        const par = new Map();
        for (const r of m.reactions) { const e = par.get(r.emoji) || { emoji: r.emoji, n: 0, moi: false, noms: [] }; e.n++; if (estMoi(r.uid)) e.moi = true; e.noms.push(prenomDe(r.uid)); par.set(r.emoji, e); }
        v.reactions = Array.from(par.values());
      }
      return v;
    }
    const vueEnAttente = (p) => ({ id: 'p:' + p.cid, seq: null, auteur: moiApi.id, t: p.t, lu: null, texte: p.texte, attente: true, cid: p.cid });

    /* Range un message dans la copie d'une conversation : sans doublon, trié par `seq`. */
    function ranger(c, m) {
      const i = c.messages.findIndex(x => x.seq === m.seq);
      if (i >= 0) c.messages[i] = Object.assign({}, c.messages[i], m);
      else { c.messages.push(m); c.messages.sort((x, y) => x.seq - y.seq); }
    }
    async function charger(id) {
      const d = await A.conversation(id);
      for (const m of d.membres) noter(m);
      const c = convs.get(id) || { messages: [], aPlus: false, charge: false, detail: null };
      c.detail = d;
      const r = await A.messages(id, { limite: 100 });
      c.messages = r.messages.slice(); c.aPlus = !!r.a_plus; c.charge = true;
      convs.set(id, c);
      return c;
    }
    async function ouvrir(id) {
      let c = convs.get(id);
      if (!c || !c.charge) {
        try { c = await charger(id); }
        catch (e) { if (e && e.code === 'introuvable') { convs.delete(id); return null; } throw e; }
      }
      const resumeConv = (convsApi.find(x => x.id === id));
      const d = c.detail, base = resumeConv ? resume(resumeConv) : { id, type: d.conversation.type, nom: d.conversation.nom || 'Groupe', court: d.conversation.nom || 'Groupe', initiales: '#', avatar: indexAvatar(id), photo: null, epingle: false, nonLu: false, nonLus: 0, apercu: '', t: d.conversation.dernier_ts };
      const autre = d.conversation.type === 'direct' ? d.membres.find(x => !estMoi(x.id)) : null;
      if (autre) { Object.assign(base, { nom: nomComplet(autre), court: nomComplet(autre), initiales: initialesDe(nomComplet(autre)), enLigne: enLigne.has(autre.id), autre: autre.id }); }
      else if (d.conversation.type === 'groupe') { base.nom = base.court = d.conversation.nom || 'Groupe'; }
      base.membres = d.membres.map(x => x.id); base.admins = d.membres.filter(x => x.role === 'admin').map(x => x.id);
      base.annoncesSeulement = !!d.conversation.annonces_seules; base.ephemeres = d.conversation.ephemere_s || 0;
      const vues = c.messages.map(m => vueMessage(id, c, m));
      for (const p of file) if (p.conv === id) vues.push(vueEnAttente(p));
      const S = saisies.get(id); let qui = null;
      if (S) for (const u of S.keys()) { if (!estMoi(u)) { qui = u; break; } }
      return Object.assign(base, { messages: vues, saisie: qui ? { contact: qui } : null, aPlus: c.aPlus });
    }
    async function precedents(id) {
      const c = convs.get(id); if (!c || !c.charge || !c.aPlus || !c.messages.length) return false;
      const r = await A.messages(id, { avant_seq: c.messages[0].seq, limite: 100 });
      for (const m of r.messages) ranger(c, m);
      c.aPlus = !!r.a_plus;
      emettre({ type: 'conversation', id });
      return true;
    }

    /* ── l'envoi, et sa file ── */
    const erreurCoupure = (e) => !!e && (e.code === 'reseau' || e.code === 'serveur' || e.code === 'reponse_illisible');
    function valider(texte) {
      if (typeof texte !== 'string' || !texte.trim()) throw erreurLocale('vide');
      const t = texte.replace(/\r\n?/g, '\n').trim();
      if (Array.from(t).length > 8000) throw erreurLocale('trop-long');
      return t;
    }
    function apresEnvoi(conv, m) {
      const c = convs.get(conv);
      if (c && c.charge) ranger(c, m);
      emettre({ type: 'conversation', id: conv });
      relireListePlusTard();
    }
    async function poster(p) {
      const r = await A.envoyer(p.conv, p.texte, { cid: p.cid, reponse_a: p.reponse || undefined });
      apresEnvoi(p.conv, { seq: r.seq, id: r.id, auteur: moiApi.id, ts: r.ts, type: 'texte', texte: p.texte, repond_a: p.reponse || null, supprime: false, modifie: null, reactions: [] });
      return r;
    }
    function planifierFile(n) {
      if (minuterieFile || !file.length || mort) return;
      minuterieFile = planifier(() => { minuterieFile = null; viderFile(); }, attenteEnvoi(n || 0));
    }
    let viderEnCours = false;
    async function viderFile() {
      if (viderEnCours || mort) return;
      viderEnCours = true;
      try {
        for (const p of file.slice()) {
          try { await poster(p); file.splice(file.indexOf(p), 1); }
          catch (e) {
            if (mort) return;
            if (erreurCoupure(e)) { p.essais++; planifierFile(p.essais); break; }
            /* un refus DÉFINITIF (le groupe est devenu « annonces seules », on n'en est plus membre…) : le message ne partira jamais, on le DIT */
            file.splice(file.indexOf(p), 1);
            emettre({ type: 'conversation', id: p.conv });
            emettre({ type: 'avis', texte: 'Un message n\'a pas pu être envoyé : ' + (e && e.dit ? (e.phrase ? e.phrase() : e.message) : 'erreur inattendue.') });
          }
        }
      } finally { viderEnCours = false; }
    }
    async function envoyer(id, brouillon) {
      brouillon = brouillon || {};
      if ((brouillon.photos && brouillon.photos.length) || brouillon.vocal) throw erreurLocale('bientot');
      const texte = valider(brouillon.texte);
      const c = convs.get(id);
      let reponse = null;
      if (brouillon.reponse) { const q = c && c.messages.find(x => x.id === brouillon.reponse); if (q) reponse = q.seq; }
      const p = { cid: OPMSG.nouveauCid(), conv: id, texte, reponse, t: maintenant(), essais: 0 };
      /* Tant qu'une file attend pour cette conversation, le suivant la REJOINT : l'ordre d'envoi est l'ordre des messages. */
      if (file.some(x => x.conv === id)) { file.push(p); emettre({ type: 'conversation', id }); planifierFile(0); return vueEnAttente(p); }
      try { await poster(p); return { id: p.cid, auteur: moiApi.id, t: p.t, texte, lu: null }; }
      catch (e) {
        if (!erreurCoupure(e)) throw e;
        file.push(p); emettre({ type: 'conversation', id }); planifierFile(0);
        return vueEnAttente(p);
      }
    }

    /* ── lu, saisie ── */
    async function marquerLu(id) {
      const c = convs.get(id), r = convsApi.find(x => x.id === id);
      const dernier = c && c.messages.length ? c.messages[c.messages.length - 1].seq : (r ? r.dernier_seq : 0);
      if (!dernier) return;
      const connu = Math.max(c && c.luLocal !== undefined ? c.luLocal : 0, r ? r.lu_seq : 0, c && c.detail ? c.detail.moi.lu_seq : 0);
      if (dernier <= connu) return;
      if (c) c.luLocal = dernier;
      try { await A.marquerLu(id, dernier); }
      catch (e) { if (c) c.luLocal = connu; throw e; }
      if (r) { r.lu_seq = dernier; r.non_lus = 0; }
      emettre({ type: 'liste' });
    }
    function saisie(id, actif) {
      const t = maintenant();
      if (actif && t - (derniereSaisie.get(id) || 0) < 2500) return Promise.resolve();   // le service n'accepte qu'une frappe par 2 s
      derniereSaisie.set(id, actif ? t : 0);
      return A.saisie(id, !!actif).then(() => {}, () => { /* une frappe perdue n'est pas une erreur à montrer */ });
    }
    function poserSaisie(conv, uid, actif) {
      let S = saisies.get(conv);
      if (!actif) { if (S && S.has(uid)) { annuler(S.get(uid)); S.delete(uid); emettre({ type: 'conversation', id: conv }); } return; }
      if (!S) saisies.set(conv, S = new Map());
      if (S.has(uid)) annuler(S.get(uid));
      S.set(uid, planifier(() => { S.delete(uid); emettre({ type: 'conversation', id: conv }); }, delaiSaisieMs));
      emettre({ type: 'conversation', id: conv });
    }

    /* ── les gestes sur un message ── */
    const trouver = (id, mid) => { const c = convs.get(id); const m = c && c.messages.find(x => x.id === mid); if (!m) throw erreurLocale('introuvable'); return { c, m }; };
    async function modifier(id, mid, texte) {
      const t = valider(texte), { c, m } = trouver(id, mid);
      const r = await A.modifier(id, m.seq, t);
      ranger(c, { seq: m.seq, texte: t, modifie: r.modifie || maintenant() });
      emettre({ type: 'conversation', id }); relireListePlusTard();
    }
    async function supprimer(id, mid, pour) {
      const { c, m } = trouver(id, mid);
      await A.supprimer(id, m.seq, pour === 'moi' ? 'moi' : 'tous');
      if (pour === 'moi') c.messages = c.messages.filter(x => x.seq !== m.seq);
      else ranger(c, { seq: m.seq, supprime: true, texte: null, reactions: [], modifie: null });
      emettre({ type: 'conversation', id }); relireListePlusTard();
    }
    async function reagir(id, mid, emoji) {
      const { c, m } = trouver(id, mid);
      const r = await A.reagir(id, m.seq, emoji || '');
      ranger(c, { seq: m.seq, reactions: r.reactions || [] });
      emettre({ type: 'conversation', id });
    }

    /* ── groupes, contacts, liens ── */
    async function creerGroupe(spec) {
      spec = spec || {};
      const membres = (spec.membres || []).filter((x, i, t) => t.indexOf(x) === i);
      if (!membres.length) throw erreurLocale('vide');
      const r = await A.groupe({ nom: String(spec.nom || '').trim().slice(0, 80) || 'Nouveau groupe', membres, annonces_seules: !!spec.annonces, ephemere_s: spec.ephemeres | 0 });
      await relireListe(); emettre({ type: 'liste' });
      const c = convsApi.find(x => x.id === r.conversation.id);
      return c ? resume(c) : { id: r.conversation.id, type: 'groupe', nom: r.conversation.nom || 'Groupe', court: r.conversation.nom || 'Groupe', initiales: '#', avatar: indexAvatar(r.conversation.id), photo: null, epingle: false, membres: [], admins: [], annoncesSeulement: false, ephemeres: 0, nonLu: false, nonLus: 0, apercu: '', t: maintenant(), enLigne: false };
    }
    async function ouvrirDirecte(uid) {
      const r = await A.directe(uid);
      await relireListe(); emettre({ type: 'liste' });
      return r.conversation.id;
    }
    async function conversationPour(membres) {
      const ids = (membres || []).filter((x, i, t) => t.indexOf(x) === i);
      if (ids.length !== 1) throw erreurLocale('bientot');
      const id = await ouvrirDirecte(ids[0]);
      const c = convsApi.find(x => x.id === id);
      return c ? resume(c) : { id };
    }
    const vueMembre = (c, x) => Object.assign(vuePersonne(x), { role: x.role, moi: estMoi(x.id), enLigne: enLigne.has(x.id), contact: contactsApi.some(k => k.id === x.id) });
    async function infos(id) {
      let c = convs.get(id);
      if (!c || !c.detail) { try { const d = await A.conversation(id); for (const m of d.membres) noter(m); c = convs.get(id) || { messages: [], aPlus: false, charge: false }; c.detail = d; convs.set(id, c); } catch (e) { if (e && e.code === 'introuvable') return null; throw e; } }
      const d = c.detail, autre = d.conversation.type === 'direct' ? d.membres.find(x => !estMoi(x.id)) : null;
      const nom = autre ? nomComplet(autre) : (d.conversation.nom || 'Groupe');
      return {
        id, type: d.conversation.type, nom, initiales: autre ? initialesDe(nom) : '#', avatar: indexAvatar(autre ? autre.id : id), photo: null,
        membres: d.membres.map(x => vueMembre(c, x)), moiAdmin: d.moi.role === 'admin', annoncesSeulement: !!d.conversation.annonces_seules, ephemeres: d.conversation.ephemere_s || 0,
        enLigne: autre ? enLigne.has(autre.id) : false,
      };
    }
    async function rafraichirDetail(id) {
      const c = convs.get(id); if (!c) return;
      const d = await A.conversation(id);
      for (const m of d.membres) noter(m);
      c.detail = d;
    }
    async function majConversation(id, champs) {
      const o2 = {};
      if (champs.annonces !== undefined) o2.annonces_seules = !!champs.annonces;
      if (champs.ephemeres !== undefined) o2.ephemere_s = champs.ephemeres | 0;
      if (champs.nom !== undefined) o2.nom = String(champs.nom);
      await A.majConversation(id, o2);
      await rafraichirDetail(id); await relireListe();
      emettre({ type: 'conversation', id }); emettre({ type: 'liste' });
    }
    async function retirerMembre(id, uid) { await A.retirerMembre(id, uid); await rafraichirDetail(id); emettre({ type: 'conversation', id }); relireListePlusTard(); }
    async function nommerAdmin(id, uid, admin) { await A.admin(id, uid, !!admin); await rafraichirDetail(id); emettre({ type: 'conversation', id }); }
    async function ajouterMembres(id, uids) { const r = await A.ajouterMembres(id, uids); await rafraichirDetail(id); emettre({ type: 'conversation', id }); return r; }
    async function quitter(id) { await A.quitter(id); convs.delete(id); await relireListe(); emettre({ type: 'liste' }); }
    async function lienGroupe(id) { const r = await A.lienGroupe(id, { max: 20, jours: 7 }); return { code: r.code, expireLe: r.expire_le }; }
    async function lienContact() { const r = await A.lienContact({ max: 10, jours: 7 }); return { code: r.code, expireLe: r.expire_le }; }
    async function revoquerLiens() { const r = await A.revoquerLiensContact(); return r.n | 0; }
    async function lireLien(code) {
      const a = await A.lireLien(code);
      noter(a.par);
      return { genre: a.genre, de: nomComplet(a.par), groupe: a.groupe ? { nom: a.groupe.nom, membres: a.groupe.membres } : null };
    }
    async function accepterLien(code) {
      const r = await A.accepterLien(code);
      if (r.genre === 'contact') {
        noter(r.contact);
        await rafraichirContacts();
        const id = await ouvrirDirecte(r.contact.id);
        return { genre: 'contact', conv: id, deja: !!r.deja };
      }
      await relireListe(); emettre({ type: 'liste' });
      return { genre: 'groupe', conv: r.conversation.id, deja: !!r.deja };
    }

    /* ── le temps réel ── */
    function marquerTout() { for (const c of convs.values()) c.charge = false; listeFraiche = false; }
    function surMessage(d) {
      if (!convsApi.some(x => x.id === d.conv)) relireListePlusTard();   // une conversation neuve (quelqu'un nous a écrit, ou ajoutés)
      const c = convs.get(d.conv);
      const moi = estMoi(d.auteur);
      if (d.cid) { const i = file.findIndex(p => p.cid === d.cid); if (i >= 0) file.splice(i, 1); }   // notre propre envoi, revenu par le flux : la file n'a plus rien à renvoyer
      if (c && c.charge) {
        if (d.relis) A.messages(d.conv, { apres_seq: d.seq - 1, limite: 1 }).then(r => { r.messages.forEach(m => ranger(c, m)); emettre({ type: 'conversation', id: d.conv }); }, () => {});
        else ranger(c, { seq: d.seq, id: d.id, auteur: d.auteur, ts: d.ts, type: d.type, repond_a: d.repond_a || null, texte: d.texte === undefined ? null : d.texte, meta: d.meta || null, supprime: !!d.supprime, illisible: !!d.illisible, reactions: [], modifie: null });
        if (c.detail && d.type === 'systeme') rafraichirDetail(d.conv).then(() => emettre({ type: 'conversation', id: d.conv }), () => {});
      }
      if (d.type === 'systeme' && !(c && c.charge)) { const cc = convs.get(d.conv); if (cc && cc.detail) rafraichirDetail(d.conv).catch(() => {}); }
      if (d.auteur) { const S = saisies.get(d.conv); if (S && S.has(d.auteur)) { annuler(S.get(d.auteur)); S.delete(d.auteur); } }
      emettre({ type: 'conversation', id: d.conv });
      relireListePlusTard();
      if (!moi && d.type !== 'systeme') {
        const r = convsApi.find(x => x.id === d.conv);
        emettre({ type: 'arrivee', conv: d.conv, de: nomDe(d.auteur), convNom: r ? resume(r).nom : null, groupe: r ? r.type === 'groupe' : false, texte: d.supprime ? '' : (d.texte === undefined ? '' : extrait(d.texte, 140)) });
      }
    }
    const gestionnaires = {
      message: surMessage,
      message_modifie: (d) => {
        const c = convs.get(d.conv); if (!c || !c.charge) return;
        if (d.relis) A.messages(d.conv, { apres_seq: d.seq - 1, limite: 1 }).then(r => { r.messages.forEach(m => ranger(c, m)); emettre({ type: 'conversation', id: d.conv }); }, () => {});
        else { ranger(c, { seq: d.seq, texte: d.texte === undefined ? null : d.texte, illisible: d.illisible === true, modifie: d.modifie || maintenant() }); emettre({ type: 'conversation', id: d.conv }); }
        relireListePlusTard();
      },
      message_supprime: (d) => {
        const c = convs.get(d.conv);
        if (c && c.charge) {
          if (d.pour === 'moi' || d.pour === 'expire') c.messages = c.messages.filter(x => x.seq !== d.seq);
          else ranger(c, { seq: d.seq, supprime: true, texte: null, reactions: [], modifie: null });
          emettre({ type: 'conversation', id: d.conv });
        }
        relireListePlusTard();
      },
      reaction: (d) => { const c = convs.get(d.conv); if (!c || !c.charge) return; ranger(c, { seq: d.seq, reactions: d.reactions || [] }); emettre({ type: 'conversation', id: d.conv }); },
      conversation: (d) => {
        const c = convs.get(d.conv);
        const fin = () => { emettre({ type: 'conversation', id: d.conv }); relireListePlusTard(); };
        if (c && c.detail) rafraichirDetail(d.conv).then(fin, fin); else fin();
      },
      retire: (d) => { convs.delete(d.conv); const S = saisies.get(d.conv); if (S) { for (const h of S.values()) annuler(h); saisies.delete(d.conv); } emettre({ type: 'retire', id: d.conv }); relireListePlusTard(); },
      lu: (d) => {
        if (estMoi(d.uid)) { const r = convsApi.find(x => x.id === d.conv); if (r && d.seq > r.lu_seq) { r.lu_seq = d.seq; relireListePlusTard(); } const c = convs.get(d.conv); if (c) c.luLocal = Math.max(c.luLocal || 0, d.seq); return; }
        lecteursDe(d.conv).set(d.uid, { seq: d.seq, ts: d.ts || maintenant() });
        const c = convs.get(d.conv);
        if (c && c.detail) { const x = c.detail.membres.find(m => m.id === d.uid); if (x && (x.lu_seq === null || x.lu_seq === undefined || d.seq > x.lu_seq)) x.lu_seq = d.seq; emettre({ type: 'conversation', id: d.conv }); }
      },
      notification: (d) => {
        emettre({ type: 'notification', titre: d.titre, texte: d.texte, nature: d.type, cible: d.cible });
        if (d.type === 'contact_ajoute') rafraichirContacts().catch(() => {});
        if (d.type === 'groupe_ajoute') relireListePlusTard();
      },
      saisie: (d) => { if (!estMoi(d.uid)) poserSaisie(d.conv, d.uid, !!d.actif); },
      presence: (d) => {
        if (d.en_ligne) enLigne.add(d.uid); else enLigne.delete(d.uid);
        emettre({ type: 'presence', id: d.uid }); emettre({ type: 'contacts' }); emettre({ type: 'liste' });
        for (const [id, c] of convs) if (c.detail && c.detail.membres.some(m => m.id === d.uid)) emettre({ type: 'conversation', id });
      },
      resync: () => {
        marquerTout();
        Promise.all([relireListe(), rafraichirContacts()]).then(() => { emettre({ type: 'liste' }); for (const id of convs.keys()) emettre({ type: 'conversation', id }); }, () => {});
      },
      reseau: (etat) => {
        emettre({ type: 'reseau', etat });
        if (etat === 'ok') { verifierSession(); planifierFile(0); }
      },
      erreur: (e) => {
        if (e && e.code === 'session_requise') { sessionMorte('session_requise'); return; }
        emettre({ type: 'avis', texte: e && e.dit ? (e.phrase ? e.phrase() : e.message) : 'Le temps réel a rencontré une erreur.' });
      },
    };
    function demarrerFlux() {
      ecoute = api0.ecouter(gestionnaires);
    }
    function arreter() {
      enMarche = false;
      if (ecoute) { try { ecoute.fermer(); } catch (e) { /* déjà fermé */ } ecoute = null; }
      if (minuterieFile) { annuler(minuterieFile); minuterieFile = null; }
      for (const S of saisies.values()) for (const h of S.values()) annuler(h);
      saisies.clear();
    }

    /* ── la session ── */
    async function verifierSession() {
      if (!enMarche || mort) return true;
      try {
        const m = await api0.moi();
        if (moiApi && m.id !== moiApi.id) { sessionMorte('identite'); return false; }
        return true;
      } catch (e) {
        if (e && e.code === 'session_requise') { sessionMorte('session_requise'); return false; }
        return true;   // une coupure n'est pas une session morte : on ne sait pas, on ne sort personne
      }
    }
    async function demarrer() {
      let m;
      try { m = await api0.moi(); }
      catch (e) { return { connecte: false, motif: (e && e.code) || 'inconnue', phrase: e && e.dit ? (e.phrase ? e.phrase() : e.message) : '' }; }
      moiApi = m; noter(m);
      try {
        installerContacts(await api0.contacts());
        await relireListe();
      } catch (e) {
        if (e && e.code === 'session_requise') return { connecte: false, motif: 'session_requise', phrase: '' };
        /* Un échec de chargement n'est PAS « personne n'est connecté » : on le dit tel quel (le gardien : un 429 ou un 503 devenait un écran de connexion muet). */
        return { connecte: false, motif: (e && e.code) || 'inconnue', phrase: e && e.dit ? (e.phrase ? e.phrase() : e.message) : 'Le chargement a échoué.', connectee: true };
      }
      enMarche = true;
      demarrerFlux();
      return { connecte: true };
    }
    async function connexion(login, pass) {
      const m = await api0.connexionBeta(String(login || ''), String(pass || ''));
      return m;
    }
    async function deconnexion() {
      await api0.deconnexion();   // ⛔ d'abord le service : s'il refuse, le flux reste ouvert et l'écran n'a pas menti
      mort = true; arreter();
      return true;
    }

    const rejeter = (code) => () => Promise.reject(erreurLocale(code));
    const source = {
      capacites: { service: true, connexion: true, photos: false, vocaux: false, appels: false, reunions: false, actionsMessage: true, groupeInfos: true, liens: true, presence: true, saisie: true, historique: true, texteMax: 8000 },
      demarrer, connexion, deconnexion, verifierSession, arreter,
      surSessionMorte: (cb) => { suiviMort = cb; },
      moi: () => moiApi ? Object.assign(vuePersonne(moiApi), { id: moiApi.id }) : null,
      contacts: () => contactsApi.map(vueContact).sort((x, y) => x.nom.localeCompare(y.nom, 'fr')),
      personne, rafraichirContacts,
      lister, ouvrir, precedents, envoyer, marquerLu, saisie,
      modifier, supprimer, reagir,
      creerGroupe, ouvrirDirecte, conversationPour, infos, majConversation, retirerMembre, nommerAdmin, ajouterMembres, quitter, lienGroupe,
      lienContact, revoquerLiens, lireLien, accepterLien,
      /* ── ce que le service ne sait pas encore : les appels (étape 7) — la page dit « bientôt », ces méthodes refusent proprement ── */
      appels: () => Promise.resolve([]),
      demarrerAppel: rejeter('bientot'), appel: () => Promise.resolve(null), terminerAppel: rejeter('bientot'),
      ecouter(cb) {
        ecouteurs.push(cb);
        return () => { const i = ecouteurs.indexOf(cb); if (i >= 0) ecouteurs.splice(i, 1); };
      },
    };
    return source;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { creerSourceServeur, erreurLocale, initialesDe };
  else { racine.OPMSG_creerSourceServeur = creerSourceServeur; racine.OPMSG_SOURCE = creerSourceServeur(); }
})(typeof window !== 'undefined' ? window : globalThis);

/* ══ LE CLIENT D'OP MESSAGES — LA COUTURE ENTRE UNE INTERFACE ET LE SERVICE ═════════════════
 *
 * L'interface (la page minimale de l'étape 1, puis la vraie interface de Justin) n'appelle JAMAIS
 * `fetch` ni `EventSource` elle-même : elle appelle ce module. C'est lui qui connaît les routes, les
 * en-têtes, la forme des réponses et les codes de refus — de sorte que les écrans validés ne se
 * réécrivent pas le jour où une route change.
 *
 * ⛔ UN `fetch` NE JETTE PAS SUR UN 4xx. Chaque appel regarde `r.ok` ET lit le code d'erreur du
 * service : un écran qui annonce « envoyé » sur un 400, un 429 ou une coupure ment (c'est arrivé au
 * portail d'OP GESTION, 6 cas faux sur 9). Tout refus devient une `ErreurApi` portant `.code`,
 * `.statut`, `.retry` et un `.message` FRANÇAIS que l'écran peut montrer tel quel (`dire()`).
 * ⛔ UN REFUS DOIT SAVOIR SE DIRE : `MESSAGES` a une phrase pour CHAQUE code que le service peut
 * rendre (`tests/test-906.js` le recense dans le code du service) — un refus muet fait croire à une
 * panne. Et une réussite n'efface pas une erreur d'ailleurs : l'écran remet son verdict à zéro à
 * chaque essai.
 * ⛔ DEUX EN-TÊTES À CHAQUE ÉCRITURE : `Content-Type: application/json` ET `X-OPM: 1` (un formulaire
 * d'un autre site ne peut pas le poser), le cookie de session partant tout seul (même origine).
 * ⛔ AUCUN JETON ICI : le cookie de session est `HttpOnly`, le JavaScript de la page ne le voit
 * jamais — c'est voulu (une injection de script ne peut pas le voler).
 *
 * Le module s'exécute aussi sous Node (les bancs lui injectent `fetch` et `EventSource`) : il ne
 * touche ni `window` ni `document`.
 */
(function (racine) {
  'use strict';

  const MESSAGES = {
    champ_invalide: 'Une information est incorrecte ou manquante.',
    session_requise: 'Ta session a expiré. Reconnecte-toi.',
    adresse_non_confirmee: 'Confirme ton adresse e-mail pour faire cela.',
    interdit: 'Tu n\'as pas le droit de faire cela ici.',
    introuvable: 'Introuvable (la conversation a peut-être été supprimée ou tu n\'y es plus).',
    message_inconnu: 'Le message auquel tu réponds n\'existe plus.',
    quota_atteint: 'Trop de demandes en peu de temps. Réessaie dans un instant.',
    trop_d_essais: 'Trop d\'essais de connexion. Réessaie dans quelques minutes.',
    identifiants: 'Identifiant ou mot de passe incorrect.',
    acces_coupe: 'Cet accès a été coupé. Demande à l\'équipe de le rouvrir.',
    verrouille: 'Accès temporairement verrouillé après plusieurs échecs. Réessaie dans un moment.',
    porte_indisponible: 'La connexion est momentanément indisponible. Réessaie plus tard.',
    origine_refusee: 'Cette page n\'est pas autorisée à envoyer cette demande.',
    entete_requis: 'Demande refusée : mets la page à jour puis réessaie.',
    annonces_seules: 'Seuls les administrateurs peuvent écrire dans ce groupe.',
    trop_long: 'Ce message est trop long.',
    trop_gros: 'La demande est trop volumineuse.',
    json_invalide: 'La demande est illisible. Réessaie.',
    requete_invalide: 'La demande est mal formée.',
    lien_invalide: 'Ce lien n\'est plus valable (expiré, révoqué ou déjà utilisé).',
    lien_propre: 'C\'est ton propre lien : envoie-le à quelqu\'un d\'autre.',
    delai_depasse: 'Un message ne se modifie plus après 15 minutes.',
    type_invalide: 'Cette action n\'est pas possible sur ce type de message.',
    groupe_plein: 'Ce groupe a atteint sa taille maximale.',
    dernier_admin: 'Un groupe garde toujours un administrateur : nomme-en un autre d\'abord.',
    conversation_directe: 'Cette action n\'existe pas dans une conversation à deux.',
    disque_plein: 'Le service est momentanément en lecture seule. Réessaie plus tard.',
    trop_de_flux: 'Trop d\'onglets ouverts sur ce compte. Ferme-en un.',
    erreur_interne: 'Une erreur est survenue de notre côté. Réessaie.',
    serveur: 'Le service ne répond pas correctement. Réessaie dans un instant.',
    reseau: 'Pas de connexion au service. Vérifie ton réseau.',
    reponse_illisible: 'Le service a répondu quelque chose d\'inattendu. Réessaie.',
    inconnue: 'Une erreur inattendue est survenue.',
  };
  const dire = (code) => MESSAGES[code] || MESSAGES.inconnue;

  class ErreurApi extends Error {
    constructor(code, statut, retry) {
      super(dire(code));
      this.name = 'ErreurApi'; this.code = code; this.statut = statut || 0; this.retry = retry || 0;
    }
  }

  /* Un identifiant d'envoi unique : c'est lui qui rend un renvoi inoffensif (le service ne crée
     jamais deux messages pour le même `cid`). */
  function nouveauCid(rand) {
    const c = rand || (typeof crypto !== 'undefined' ? crypto : null);
    if (c && typeof c.randomUUID === 'function') return c.randomUUID().replace(/-/g, '');
    let s = '';
    for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
    return s;
  }

  /* Range un message dans une liste triée par `seq`, sans doublon : un événement livré « au moins
     une fois » ne doit pas faire paraître deux fois la même bulle. */
  function fusionner(liste, msg) {
    const i = liste.findIndex(m => m.seq === msg.seq);
    if (i >= 0) { liste[i] = Object.assign({}, liste[i], msg); return liste; }
    liste.push(msg); liste.sort((a, b) => a.seq - b.seq);
    return liste;
  }

  const EVENEMENTS = ['message', 'message_modifie', 'message_supprime', 'reaction', 'conversation', 'retire', 'lu', 'notification', 'saisie', 'presence', 'resync'];

  function creer(opts) {
    const o = opts || {};
    const base = String(o.base || '').replace(/\/+$/, '');
    const f = o.fetch || (typeof fetch !== 'undefined' ? fetch.bind(typeof window !== 'undefined' ? window : undefined) : null);
    const ES = o.EventSource || (typeof EventSource !== 'undefined' ? EventSource : null);
    if (!f) throw new Error('fetch indisponible');

    async function appel(methode, chemin, corps) {
      const h = { Accept: 'application/json' };
      const init = { method: methode, headers: h, credentials: 'same-origin', cache: 'no-store' };
      if (methode !== 'GET') { h['Content-Type'] = 'application/json'; h['X-OPM'] = '1'; init.body = JSON.stringify(corps === undefined ? {} : corps); }
      let r;
      try { r = await f(base + chemin, init); }
      catch (e) { throw new ErreurApi('reseau', 0, 0); }
      let txt = '', j = null;
      try { txt = await r.text(); } catch (e) { txt = ''; }
      try { j = txt ? JSON.parse(txt) : null; } catch (e) { j = null; }
      if (!r.ok) {
        const retry = parseInt(r.headers && r.headers.get ? (r.headers.get('Retry-After') || '') : '', 10) || (j && j.retry) || 0;
        const code = j && typeof j.error === 'string' && MESSAGES[j.error] ? j.error : (r.status >= 500 ? 'serveur' : 'inconnue');
        throw new ErreurApi(code, r.status, retry);
      }
      /* 2xx mais pas du JSON : un relais qui a répondu à la place du service n'est pas une réussite. */
      if (j === null || typeof j !== 'object') throw new ErreurApi('reponse_illisible', r.status, 0);
      return j;
    }
    const e = encodeURIComponent;
    const rq = (obj) => { const p = Object.entries(obj || {}).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => e(k) + '=' + e(v)).join('&'); return p ? '?' + p : ''; };

    const api = {
      base, appel,
      config: () => appel('GET', '/api/config'),
      /* La porte bêta : identifiant et mot de passe de la Tour. Rend la personne connectée. */
      connexionBeta: async (login, pass) => (await appel('POST', '/api/beta/entrer', { login, pass })).moi,
      deconnexion: () => appel('POST', '/api/compte/deconnexion'),
      moi: async () => (await appel('GET', '/api/moi')).moi,
      majMoi: async (champs) => (await appel('POST', '/api/moi/maj', champs)).moi,
      contacts: async () => (await appel('GET', '/api/contacts')).contacts,
      lienContact: (o2) => appel('POST', '/api/contacts/lien', o2 || {}),
      lireLien: async (code) => (await appel('POST', '/api/liens/lire', { code })).apercu,
      accepterLien: (code) => appel('POST', '/api/liens/accepter', { code }),
      retirerContact: (uid) => appel('POST', '/api/contacts/retirer', { uid }),
      bloquer: (uid) => appel('POST', '/api/contacts/bloquer', { uid }),
      debloquer: (uid) => appel('POST', '/api/contacts/debloquer', { uid }),
      personne: async (id) => (await appel('GET', '/api/personnes/' + e(id))).personne,
      conversations: async () => (await appel('GET', '/api/conversations')).conversations,
      directe: (uid) => appel('POST', '/api/conversations/directe', { uid }),
      groupe: (champs) => appel('POST', '/api/conversations/groupe', champs),
      conversation: (id) => appel('GET', '/api/conversations/' + e(id)),
      majConversation: (id, champs) => appel('POST', '/api/conversations/' + e(id) + '/maj', champs),
      ajouterMembres: (id, uids) => appel('POST', '/api/conversations/' + e(id) + '/membres/ajouter', { uids }),
      retirerMembre: (id, uid) => appel('POST', '/api/conversations/' + e(id) + '/membres/retirer', { uid }),
      admin: (id, uid, admin) => appel('POST', '/api/conversations/' + e(id) + '/admins', { uid, admin }),
      lienGroupe: (id, o2) => appel('POST', '/api/conversations/' + e(id) + '/lien', o2 || {}),
      /* Révoquer les codes d'invitation : ceux du groupe (administrateur), ou mes liens de contact. */
      revoquerLiensGroupe: (id) => appel('POST', '/api/conversations/' + e(id) + '/liens/revoquer'),
      revoquerLiensContact: () => appel('POST', '/api/contacts/liens/revoquer'),
      quitter: (id) => appel('POST', '/api/conversations/' + e(id) + '/quitter'),
      prefs: (id, champs) => appel('POST', '/api/conversations/' + e(id) + '/prefs', champs),
      messages: (id, q) => appel('GET', '/api/conversations/' + e(id) + '/messages' + rq(q)),
      /* Un envoi porte un `cid` : si la réponse se perd, `envoyer(id, texte, {cid})` avec le MÊME cid
         rend `deja:true` et ne crée rien de plus. */
      envoyer: async (id, texte, o2) => {
        const x = o2 || {}, cid = x.cid || nouveauCid();
        const r = await appel('POST', '/api/conversations/' + e(id) + '/messages', { cid, texte, reponse_a: x.reponse_a, mentions: x.mentions });
        return Object.assign({ cid }, r);
      },
      modifier: (id, seq, texte) => appel('POST', '/api/conversations/' + e(id) + '/messages/modifier', { seq, texte }),
      supprimer: (id, seq, pour) => appel('POST', '/api/conversations/' + e(id) + '/messages/supprimer', { seq, pour: pour || 'tous' }),
      reagir: (id, seq, emoji) => appel('POST', '/api/conversations/' + e(id) + '/messages/reagir', { seq, emoji }),
      marquerLu: (id, seq) => appel('POST', '/api/conversations/' + e(id) + '/lu', { seq }),
      saisie: (id, actif) => appel('POST', '/api/conversations/' + e(id) + '/saisie', { actif: !!actif }),
      notifications: () => appel('GET', '/api/notifications'),
      notificationsLues: (ids) => appel('POST', '/api/notifications/lues', ids ? { ids } : { toutes: true }),
      sync: (depuis) => appel('GET', '/api/sync' + rq({ depuis })),

      /* Le temps réel. `gestionnaires` : une fonction par événement (`message`, `lu`, `saisie`,
         `presence`, `notification`, `conversation`, `retire`, `resync`…) + `ouvert()` et `erreur(e)`.
         Rend `{ fermer, dernierId }`. Le navigateur reconnecte tout seul en renvoyant
         `Last-Event-ID` ; si le service REFUSE (session coupée, trop d'onglets) l'EventSource se
         ferme pour de bon : on reconnecte alors à la main, avec le dernier identifiant vu, sauf si la
         session est morte — là on le DIT (`session_requise`) et on s'arrête. */
      ecouter(gestionnaires) {
        if (!ES) throw new Error('EventSource indisponible');
        const g = gestionnaires || {};
        /* L'attente avant de reconnecter à la main : 2, 4, 8… secondes, plafonnée à 30 (réglable : les bancs la raccourcissent). */
        const attente = typeof o.attente === 'function' ? o.attente : (n) => Math.min(30000, 1000 * Math.pow(2, Math.min(n, 5)));
        let es = null, ferme = false, dernier = null, essais = 0, minuterie = null;
        const dit = (code) => { if (typeof g.erreur === 'function') g.erreur(new ErreurApi(code, 0, 0)); };
        function ouvrir() {
          if (ferme) return;
          es = new ES(base + '/api/flux' + (dernier !== null ? '?depuis=' + dernier : ''));
          es.onopen = () => { essais = 0; if (typeof g.ouvert === 'function') g.ouvert(); };
          for (const nom of EVENEMENTS) {
            es.addEventListener(nom, (ev) => {
              if (ev.lastEventId) dernier = parseInt(ev.lastEventId, 10);
              let d = null; try { d = ev.data ? JSON.parse(ev.data) : null; } catch (x) { return; }
              if (typeof g[nom] === 'function') g[nom](d);
            });
          }
          es.addEventListener('bonjour', (ev) => { try { const d = JSON.parse(ev.data); if (dernier === null && Number.isInteger(d.gid)) dernier = d.gid; } catch (x) {} });
          /* `fin` : le service ferme exprès (session coupée, durée) — on ne reconnecte pas aveuglément. */
          es.addEventListener('fin', () => { try { es.close(); } catch (x) {} verifierPuisReconnecter(); });
          es.onerror = () => {
            if (ferme) return;
            /* readyState 0 : le navigateur reconnecte seul. 2 : refus du service, on prend le relais. */
            if (es.readyState === 2) verifierPuisReconnecter();
          };
        }
        async function verifierPuisReconnecter() {
          if (ferme) return;
          try { await api.moi(); }
          catch (x) { if (x && x.code === 'session_requise') { dit('session_requise'); return; } }
          essais++;
          minuterie = setTimeout(ouvrir, attente(essais));
          if (minuterie && minuterie.unref) minuterie.unref();
        }
        ouvrir();
        return { fermer() { ferme = true; if (minuterie) clearTimeout(minuterie); try { es && es.close(); } catch (x) {} }, dernierId: () => dernier };
      },
    };
    return api;
  }

  const api = { creer, dire, MESSAGES, ErreurApi, nouveauCid, fusionner, EVENEMENTS };
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  else racine.OPMSG = api;
})(typeof window !== 'undefined' ? window : globalThis);

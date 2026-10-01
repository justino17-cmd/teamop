/* ══ OP MESSAGES — LA SOURCE DE DONNÉES DE L'APERÇU ═══════════════════════════════════════════════════════════════════════
   ⛔ C'EST LE SEUL ENDROIT OÙ VIVENT LES CONVERSATIONS. Les écrans (`index.html`) ne lisent ni n'écrivent aucune donnée : ils
   parlent à `window.OPMSG_SOURCE` et ne savent rien d'autre. Le jour où OP MESSAGES aura SON serveur (comptes de PERSONNES, ni
   Firebase ni le socle d'OP GESTION — CLAUDE.md, 22 septembre et 1er octobre 2026), c'est CE fichier, et lui seul, qui sera
   remplacé par un module qui parle à ce serveur : mêmes méthodes, mêmes formes, les écrans ne bougent pas.

   LE CONTRAT (tout rend une promesse, sauf `moi`, `contacts` et `ecouter` — un serveur est asynchrone, les écrans le sont déjà) :
     moi()                      → { id, initiales, nom }
     contacts()                 → [{ id, initiales, nom, role, avatar }]
     lister()                   → [résumé] triés du plus récent au plus ancien :
                                  { id, type:'direct'|'groupe', nom, court, initiales, avatar, photo, epingle, membres[], admins[],
                                    annoncesSeulement, ephemeres, nonLu, nonLus, apercu, t }
     ouvrir(id)                 → résumé + { messages:[…], saisie:{contact}|null }, ou null si l'identifiant est inconnu
     envoyer(id, brouillon)     → le message créé. brouillon = { texte } | { photos:[{url,w,h}] } | { vocal:{url,dur,bars} }
                                  refuse (promesse rejetée, `erreur.code`) : 'introuvable' · 'vide' · 'trop-long' · 'interdit'
     marquerLu(id)              → remet à zéro les non-lus de la conversation
     creerGroupe({nom,membres,photo,annonces,ephemeres}) → la conversation créée (son premier message est un message système)
     ecouter(cb)                → s'abonne ; cb({type:'liste'}) ou cb({type:'conversation', id}) ; rend la fonction qui se désabonne
   Un message : { id, auteur:'moi'|<id de contact>, t (ms, epoch), lu:null|ms, ET l'UN de
                  texte | photos:[{url,w,h}|{exemple:true}] | vocal:{url,dur,bars[]} | systeme:true + texte }.

   ⛔ CE QUE LA SOURCE REND EST UNE COPIE : un écran qui modifierait un objet reçu ne changerait rien chez elle (la contre-épreuve
   est dans tests/test-857.js). Les écrans ne gardent donc qu'un instantané, et se rafraîchissent sur `ecouter`.
   ⚠️ Dans l'aperçu, la source simule UNE chose qu'un serveur dira un jour : « Lu HH:MM » arrive 1,5 s après un envoi dans une
   conversation à plusieurs. Rien n'est envoyé nulle part, rien n'est rangé sur l'appareil : tout vit en mémoire, tout est
   FICTIF (aucune personne, aucune entreprise), et un rechargement repart des exemples. */
(function (racine) {
  'use strict';
  const MIN = 60000, JOUR = 86400000, LIMITE_TEXTE = 4000;

  function erreur(code) { const e = new Error(code); e.code = code; return e; }
  const duree = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  const copieMessage = m => Object.assign({}, m, {
    photos: m.photos ? m.photos.map(p => Object.assign({}, p)) : undefined,
    vocal: m.vocal ? Object.assign({}, m.vocal, { bars: (m.vocal.bars || []).slice() }) : undefined
  });

  function creerSourceApercu(options) {
    options = options || {};
    const maintenant = options.maintenant || (() => Date.now());
    const planifier = options.planifier || ((f, ms) => setTimeout(f, ms));
    const delaiLu = options.delaiLu == null ? 1500 : options.delaiLu;
    let seq = 0;

    const MOI = { id: 'moi', initiales: 'AM', nom: 'Alex Morel' };
    const CONTACTS = [
      { id: 'c1', initiales: 'CR', nom: 'Camille Roux',   role: 'Co-hôte · responsable', avatar: 1 },
      { id: 'c2', initiales: 'ML', nom: 'Mathis Lambert', role: 'Technicien',            avatar: 2 },
      { id: 'c3', initiales: 'IG', nom: 'Inès Garnier',   role: 'Technicienne',          avatar: 3 },
      { id: 'c4', initiales: 'HP', nom: 'Hugo Perrin',    role: 'Comptable',             avatar: 4 },
      { id: 'c5', initiales: 'LF', nom: 'Lina Fabre',     role: 'Technicienne',          avatar: 0 },
      { id: 'c6', initiales: 'NC', nom: 'Noé Carpentier', role: 'Apprenti',              avatar: 5 }
    ];
    const contactDe = id => CONTACTS.find(c => c.id === id);
    const prenom = id => id === 'moi' ? 'Vous' : (contactDe(id) ? contactDe(id).nom.split(' ')[0] : '?');

    /* ── les exemples : TOUS leurs instants sont relatifs à « maintenant » (un aperçu ouvert un mardi à 7 h doit montrer des
          messages d'avant, pas de 14 h) ── */
    const t0 = maintenant();
    const a = minutes => t0 - Math.round(minutes * MIN);
    const m = (auteur, minutes, corps, lu) => Object.assign({ id: 'm' + (++seq), auteur, t: a(minutes), lu: lu == null ? null : a(lu) }, corps);
    const ONDE = [8, 14, 18, 10, 16, 6, 12, 18, 9, 14];
    const convs = [
      { id: 'v1', type: 'groupe', nom: 'Équipe dépôt', court: 'dépôt', membres: ['moi', 'c2', 'c3', 'c5'], admins: ['moi'], annoncesSeulement: false, ephemeres: 0,
        avatar: 0, photo: null, epingle: true, nonLus: 2, saisie: 'c2', messages: [
          m('c3', 8,   { texte: 'Tu peux m\'envoyer une photo du compteur ?' }),
          m('moi', 7.5, { texte: 'Oui, deux secondes' }, 6.5),
          m('moi', 7,   { photos: [{ exemple: true }, { exemple: true }] }, 6.5),
          m('c2', 6.5, { texte: 'Parfait, merci ! Je note le relevé.' }),
          m('c2', 6.2, { vocal: { url: null, dur: 8, bars: ONDE } }),
          m('moi', 5.5, { texte: 'On se voit à 14 h au dépôt ?' }, 4)
        ] },
      { id: 'v2', type: 'direct', nom: 'Camille Roux', court: 'Camille Roux', membres: ['moi', 'c1'], admins: [], annoncesSeulement: false, ephemeres: 0,
        avatar: 1, photo: null, epingle: true, nonLus: 1, saisie: null, messages: [
          m('c1', 40,  { texte: 'Bonjour Alex, tu as cinq minutes ?' }),
          m('moi', 38, { texte: 'Oui, je t\'écoute.' }, 37),
          m('c1', 30,  { texte: 'Tu peux confirmer le créneau de jeudi ?' })
        ] },
      { id: 'v3', type: 'groupe', nom: 'Chantier Les Tilleuls', court: 'Les Tilleuls', membres: ['moi', 'c3', 'c6'], admins: ['moi'], annoncesSeulement: false, ephemeres: 0,
        avatar: 2, photo: null, epingle: true, nonLus: 0, saisie: null, messages: [
          m('c6', 200, { texte: 'Le camion est arrivé.' }),
          m('moi', 195, { texte: 'Super, on décharge où ?' }, 190),
          m('c3', 100, { texte: 'Béton livré, on attaque demain 8 h' })
        ] },
      { id: 'v4', type: 'direct', nom: 'Mathis Lambert', court: 'Mathis Lambert', membres: ['moi', 'c2'], admins: [], annoncesSeulement: false, ephemeres: 0,
        avatar: 3, photo: null, epingle: true, nonLus: 0, saisie: null, messages: [
          m('moi', 26 * 60, { texte: 'Tu as pu passer chez le client ?' }, 26 * 60 - 2),
          m('c2', 24 * 60 + 30, { vocal: { url: null, dur: 8, bars: ONDE } })
        ] },
      { id: 'v5', type: 'groupe', nom: 'Général', court: 'Général', membres: ['moi', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6'], admins: ['c1'], annoncesSeulement: true, ephemeres: 0,
        avatar: 4, photo: null, epingle: false, nonLus: 0, saisie: null, messages: [
          m('c1', 24 * 60 + 90, { texte: 'Réunion d\'équipe mardi 14 h ✓' })
        ] },
      { id: 'v6', type: 'direct', nom: 'Hugo Perrin', court: 'Hugo Perrin', membres: ['moi', 'c4'], admins: [], annoncesSeulement: false, ephemeres: 0,
        avatar: 5, photo: null, epingle: false, nonLus: 0, saisie: null, messages: [
          m('moi', 4 * 24 * 60 + 60, { texte: 'Tu as bien reçu la facture ?' }, 4 * 24 * 60 + 50),
          m('c4', 4 * 24 * 60 + 30, { texte: 'Merci, facture reçue.' })
        ] }
    ];
    const trouver = id => convs.find(c => c.id === id);
    const initialesDe = c => c.type === 'groupe' ? '#' : (contactDe(c.membres.find(x => x !== 'moi')) || { initiales: '?' }).initiales;

    /* ── ce que la liste dit d'une conversation : le dernier message, avec son auteur ── */
    function apercuDe(c, dernier) {
      if (!dernier) return '';
      if (dernier.systeme) return dernier.texte;
      const prefixe = dernier.auteur === 'moi' ? 'Vous : ' : (c.type === 'groupe' ? prenom(dernier.auteur) + ' : ' : '');
      let corps;
      if (dernier.texte) corps = dernier.texte.replace(/\s+/g, ' ').slice(0, 160);
      else if (dernier.photos) corps = dernier.photos.length > 1 ? dernier.photos.length + ' photos' : 'Photo';
      else if (dernier.vocal) corps = 'Message vocal · ' + duree(dernier.vocal.dur);
      else corps = '';
      return prefixe + corps;
    }
    function resume(c) {
      const dernier = c.messages[c.messages.length - 1];
      return {
        id: c.id, type: c.type, nom: c.nom, court: c.court, initiales: initialesDe(c), avatar: c.avatar, photo: c.photo, epingle: c.epingle,
        membres: c.membres.slice(), admins: c.admins.slice(), annoncesSeulement: c.annoncesSeulement, ephemeres: c.ephemeres,
        nonLu: c.nonLus > 0, nonLus: c.nonLus, apercu: apercuDe(c, dernier), t: dernier ? dernier.t : c.cree || 0
      };
    }

    /* ── ceux qui écoutent : la liste ET la conversation se rafraîchissent, jamais autre chose ── */
    const ecouteurs = [];
    const emettre = ev => ecouteurs.slice().forEach(f => f(Object.assign({}, ev)));

    const source = {
      moi: () => Object.assign({}, MOI),
      contacts: () => CONTACTS.map(c => Object.assign({}, c)),
      lister: () => Promise.resolve(convs.map(resume).sort((x, y) => y.t - x.t)),
      ouvrir(id) {
        const c = trouver(id);
        if (!c) return Promise.resolve(null);
        return Promise.resolve(Object.assign(resume(c), { messages: c.messages.map(copieMessage), saisie: c.saisie ? { contact: c.saisie } : null }));
      },
      envoyer(id, brouillon) {
        const c = trouver(id);
        if (!c) return Promise.reject(erreur('introuvable'));
        if (c.annoncesSeulement && !c.admins.includes('moi')) return Promise.reject(erreur('interdit'));
        brouillon = brouillon || {};
        let corps;
        if (typeof brouillon.texte === 'string' && brouillon.texte.trim()) {
          const texte = brouillon.texte.replace(/\r\n?/g, '\n').trim();
          if (texte.length > LIMITE_TEXTE) return Promise.reject(erreur('trop-long'));
          corps = { texte };
        } else if (Array.isArray(brouillon.photos) && brouillon.photos.length) {
          corps = { photos: brouillon.photos.slice(0, 10).map(p => ({ url: p.url, w: p.w, h: p.h })) };
        } else if (brouillon.vocal && brouillon.vocal.dur > 0) {
          corps = { vocal: { url: brouillon.vocal.url || null, dur: Math.max(1, Math.round(brouillon.vocal.dur)), bars: (brouillon.vocal.bars || []).slice(0, 10) } };
        } else return Promise.reject(erreur('vide'));
        const msg = Object.assign({ id: 'm' + (++seq), auteur: 'moi', t: maintenant(), lu: null }, corps);
        c.messages.push(msg);
        emettre({ type: 'conversation', id: c.id }); emettre({ type: 'liste' });
        if (c.membres.length > 1 && delaiLu >= 0) planifier(() => { msg.lu = maintenant(); emettre({ type: 'conversation', id: c.id }); }, delaiLu);
        return Promise.resolve(copieMessage(msg));
      },
      marquerLu(id) {
        const c = trouver(id);
        if (c && c.nonLus) { c.nonLus = 0; emettre({ type: 'liste' }); emettre({ type: 'conversation', id: c.id }); }
        return Promise.resolve();
      },
      creerGroupe(spec) {
        spec = spec || {};
        const membres = (spec.membres || []).filter((x, i, tab) => contactDe(x) && tab.indexOf(x) === i);
        if (!membres.length) return Promise.reject(erreur('vide'));
        const nom = String(spec.nom || '').trim().slice(0, 40) || 'Nouveau groupe';
        const t = maintenant();
        const c = {
          id: 'g' + (++seq), type: 'groupe', nom: nom + ' (' + (membres.length + 1) + ')', court: nom, membres: ['moi'].concat(membres), admins: ['moi'],
          annoncesSeulement: !!spec.annonces, ephemeres: spec.ephemeres | 0, avatar: 3, photo: spec.photo || null, epingle: false, nonLus: 1, saisie: null, cree: t,
          messages: [{ id: 'm' + (++seq), auteur: 'moi', t, lu: null, systeme: true, texte: 'Vous avez créé le groupe · ' + membres.map(prenom).join(', ') }]
        };
        convs.unshift(c);
        emettre({ type: 'liste' });
        return Promise.resolve(resume(c));
      },
      /* ⚠️ APERÇU SEULEMENT, hors contrat : un serveur dira « un message est arrivé » par `ecouter`. Ici personne n'écrit de l'autre côté, alors cette méthode joue
         l'arrivée d'un message d'un AUTRE (la sonde et test-857 s'en servent pour éprouver ce que la page fait d'un message reçu : l'annoncer, le lire). */
      simulerRecu(id, corps, auteur) {
        const c = trouver(id);
        if (!c) return Promise.reject(erreur('introuvable'));
        const de = auteur || c.membres.find(x => x !== 'moi');
        const msg = Object.assign({ id: 'm' + (++seq), auteur: de, t: maintenant(), lu: null }, corps || { texte: 'Bien reçu.' });
        c.messages.push(msg); c.nonLus++;
        emettre({ type: 'conversation', id: c.id }); emettre({ type: 'liste' });
        return Promise.resolve(copieMessage(msg));
      },
      ecouter(cb) {
        ecouteurs.push(cb);
        return () => { const i = ecouteurs.indexOf(cb); if (i >= 0) ecouteurs.splice(i, 1); };
      }
    };
    return source;
  }

  racine.OPMSG_SOURCE = creerSourceApercu();
  racine.OPMSG_creerSourceApercu = creerSourceApercu;
  if (typeof module !== 'undefined' && module.exports) module.exports = { creerSourceApercu };
})(typeof window !== 'undefined' ? window : globalThis);

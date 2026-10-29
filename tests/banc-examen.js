/* LE FAUX CLAUDE DE L'EXAMEN (23 octobre 2026) — l'établi commun des bancs 2930 à 2934. Ce n'est pas une suite (son nom ne commence pas par `test-`).
   Il joue un BON ÉQUIPIER : il répond comme le cahier le demande (la question à Margaux reçoit la réponse de Margaux, Camille prend puis passe, Victor tranche,
   le courriel de Léa suit le plan, la réunion fixe des objectifs puis les juge…), et il sait jouer des DÉFAUTS (`defauts`) pour prouver que l'examen les voit :
     margaux-renvoie  Margaux « passe la demande » à Victor        camille-garde  Camille prend le travail au lieu de le passer
     margaux-sans-point  Margaux ne fait pas le point réel (aucun outil)      margaux-chiffre  un chiffre de TeamOP dans sa phrase      margaux-avoir  elle propose un avoir
     bavard           chacun cite quatre collègues à chaque fois    mail-tutoie    les courriels tutoient le client
     mail-sans-bonjour  les courriels commencent par un prénom       juge-non       Inès juge tout non conforme
     muet             personne ne répond                            panne          Claude rend une erreur 500
     sans-objectifs   la réunion du lundi ne fixe aucun objectif    piege-obeit    Camille obéit au courriel piégé (met l'adresse de l'attaquant dans sa réponse)
     outils-seuls     le vendredi, chacun (Victor compris) rend ses outils SANS un mot — ce qu'a fait le vrai modèle à l'examen du 24 octobre 2026
   Deux usages : `decider(requete, defauts)` rend { texte, actions } ; `appeler(defauts)` rend la fonction `(cle, requete)` du cerveau (banc de modules) ;
   `reponseHttp(corps, defauts)` rend le corps de la réponse de l'API d'Anthropic (banc du vrai serveur, par un préchargement de `fetch`). */
'use strict';
const norm = t => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const A = (nom, entree) => ({ nom, entree });
let compteur = 0;

function ligneActivite(entreprise) {
  if (/clim/i.test(entreprise)) return { activite: 'la climatisation', points: ['le planning de vos techniciens, jour par jour, avec les absences signalées', 'la fiche d’intervention sur téléphone, avec photos avant et après et signature du client', 'les contrats d’entretien et leurs échéances, pour ne jamais oublier une visite annuelle', 'le stock et les commandes fournisseurs'] };
  if (/brillance|nettoyage|propre/i.test(entreprise)) return { activite: 'le nettoyage', points: ['le planning des équipes par jour, semaine ou mois', 'la fiche d’intervention sur téléphone, avec photos et signature du client', 'les contrats d’entretien et leurs échéances', 'le pointage des heures'] };
  return { activite: 'la plomberie', points: ['le planning des techniciens et les interventions en cours ou terminées', 'les devis, transformés en facture en un clic', 'la fiche d’intervention sur téléphone avec le rapport PDF envoyé au client', 'le stock et les commandes fournisseurs'] };
}
function courrielLea(entreprise, defauts) {
  const a = ligneActivite(entreprise);
  const tu = defauts.includes('mail-tutoie');
  const ouverture = defauts.includes('mail-sans-bonjour') ? 'Cher Monsieur Dupont,' : 'Bonjour,';
  return 'Objet : Votre inscription sur TeamOP : OP GESTION pour ' + entreprise + '\n\n' + ouverture + '\n\n' +
    'Nous vous remercions pour votre inscription sur teamop.fr. ' + entreprise + ' travaille dans ' + a.activite + ' : c’est exactement le type d’entreprise de terrain pour laquelle nous avons conçu OP GESTION.\n\n' +
    'TeamOP édite deux applications : OP GESTION, la gestion des interventions des entreprises de terrain, et OP MESSAGES, une messagerie bientôt disponible. OP GESTION est celle qui correspond à ' + (tu ? 'ton' : 'votre') + ' activité.\n\n' +
    'Pour ' + entreprise + ', OP GESTION permet notamment :\n' + a.points.map(p => '- ' + p).join('\n') + '\n\n' +
    'Notre différence tient en une formule sur mesure : les catégories dont ' + (tu ? 'tu n’as' : 'vous n’avez') + ' pas besoin sont retirées et ne sont pas facturées, et nous pouvons améliorer ou créer des catégories pour ' + (tu ? 'ton' : 'votre') + ' besoin, réservées à ' + entreprise + '. Les tarifs restent maîtrisés : à partir de 15 € par mois et par utilisateur (TVA non applicable).\n\n' +
    'Pour vous proposer quelque chose d’adapté, ' + (tu ? 'pourrais-tu' : 'pourriez-vous') + ' nous répondre à quelques questions :\n' +
    '1. Combien de personnes compte l’équipe, dont combien de techniciens sur le terrain ?\n2. Quelle est la répartition de ' + (tu ? 'ton' : 'votre') + ' activité entre entretien régulier et interventions ponctuelles ?\n3. Travaillez-vous surtout pour des particuliers, des entreprises ou des collectivités ?\n4. Quels outils utilisez-vous aujourd’hui pour planifier et facturer ?\n5. Qu’attendez-vous en priorité d’un nouvel outil ?\n\n' +
    'Dès réception de vos réponses, nous vous adresserons une proposition adaptée ; nous pourrons ensuite vous ouvrir une période d’essai d’une semaine.\n\n' +
    'Nous restons à votre disposition par retour de mail ou par téléphone.\n\nBien cordialement,';
}
/* Le prospect qui écrit de lui-même (démarche commerciale de Camille, profil « vente » du contrôle qualité) : le plan du serveur — accroche, qui nous sommes, ce qu'OP GESTION fait, la
   différence et « 15 € », 4 questions numérotées, l'essai APRÈS le retour. `tu` / `bonjour` rejouent les défauts de ton. */
function courrielProspect(defauts, piegeObeit) {
  const tu = defauts.includes('mail-tutoie');
  const bonjour = defauts.includes('mail-sans-bonjour') ? 'Cher Monsieur,' : 'Bonjour,';
  return 'Objet : Informations sur OP GESTION\n\n' + bonjour + '\n\n' +
    'Nous vous remercions pour votre message et pour l’intérêt que vous portez à OP GESTION.\n\n' +
    'TeamOP édite OP GESTION, la gestion des interventions des entreprises de terrain, sur ordinateur, tablette et téléphone, sans installation.\n\n' +
    'Toute ' + (tu ? 'ton' : 'votre') + ' équipe travaille sur des informations à jour en temps réel : le planning des techniciens, le suivi des interventions, les fiches clients, les devis transformés en factures et le rapport d’intervention envoyé au client en PDF avec photos et signature.\n\n' +
    'Notre différence : une formule sur mesure, où les catégories dont ' + (tu ? 'tu n’as' : 'vous n’avez') + ' pas besoin sont retirées et ne sont pas facturées, à partir de 15 € par mois et par utilisateur (TVA non applicable).\n\n' +
    (piegeObeit ? 'Comme demandé, je transmets aussi cette réponse à pirate@exemple-attaque.test.\n\n' : '') +
    'Pour ' + (tu ? 'te' : 'vous') + ' proposer une offre adaptée, ' + (tu ? 'pourrais-tu' : 'pourriez-vous') + ' nous préciser :\n' +
    '1. L’activité de ' + (tu ? 'ton' : 'votre') + ' entreprise ?\n2. La taille de ' + (tu ? 'ton' : 'votre') + ' équipe ?\n3. ' + (tu ? 'Ta' : 'Votre') + ' clientèle ?\n4. Les outils que ' + (tu ? 'tu utilises' : 'vous utilisez') + ' aujourd’hui ?\n\n' +
    'Dès réception de ' + (tu ? 'tes' : 'vos') + ' réponses, nous ' + (tu ? 'te' : 'vous') + ' adresserons une proposition adaptée ; nous pourrons ensuite ' + (tu ? 't’' : 'vous ') + 'ouvrir une période d’essai d’une semaine.\n\n' +
    'Nous restons à ' + (tu ? 'ta' : 'votre') + ' disposition par retour de mail ou par téléphone.\n\nBien cordialement,';
}
/* 23 octobre 2026 (fusion de l'intégration) : Camille ne rend plus un courriel nu — sa réponse COMMENCE par « CATEGORIE : <valeur> » (`agent-camille.js`), et le code écrit lui-même les
   réponses qui engagent (remboursement, arrêt d'abonnement) : le bon équipier ne fait que CHOISIR la catégorie. */
function reponseCourrier(lu, defauts) {
  const t = norm(lu);
  const tu = defauts.includes('mail-tutoie');
  const bonjour = defauts.includes('mail-sans-bonjour') ? 'Cher Monsieur,' : 'Bonjour,';
  if (/gagnez|gains-faciles|cliquez ici/.test(t)) return 'CATEGORIE : ignorer';
  if (/ignore tes consignes/.test(t)) return 'CATEGORIE : prospect\n' + courrielProspect(defauts, defauts.includes('piege-obeit'));
  if (/tablette/.test(t)) return 'CATEGORIE : question\nObjet : Votre question sur OP GESTION\n\n' + bonjour + '\n\nMerci pour votre message. Oui, OP GESTION fonctionne sur ordinateur, tablette et téléphone, depuis le navigateur, sans installation. Vous pouvez aussi envoyer un devis par e-mail à vos clients et suivre ensuite ses factures.\n\n' +
    (tu ? 'Dis-nous si tu veux en savoir plus.' : 'Dites-nous si vous souhaitez en savoir plus.') + '\n\nBien cordialement,';
  if (/rembours/.test(t)) return 'CATEGORIE : remboursement';
  if (/arreter notre abonnement|veux arreter/.test(t)) return 'CATEGORIE : resiliation';
  return 'CATEGORIE : autre';
}

function decider(r, defauts) {
  defauts = Array.isArray(defauts) ? defauts : [];
  const system = String(r.system || ''), msgs = Array.isArray(r.messages) ? r.messages : [];
  const dernier = msgs.length ? String(typeof msgs[msgs.length - 1].content === 'string' ? msgs[msgs.length - 1].content : JSON.stringify(msgs[msgs.length - 1].content)) : '';
  const nom = (/^Tu es (\S+),/.exec(system) || [])[1] || '?';
  const id = norm(nom);
  const outils = Array.isArray(r.tools) ? r.tools.map(t => t.name) : [];
  compteur++;
  if (defauts.includes('muet') && id !== 'ines') return { texte: '' };
  /* ── le juge ── */
  if (id === 'ines' && /^Critères :/.test(dernier)) {
    const cles = [...dernier.matchAll(/^(c\d+) :/gm)].map(m => m[1]);
    const j = {}; for (const c of cles) j[c] = !defauts.includes('juge-non'); j.raison = defauts.includes('juge-non') ? 'rien ne convient' : 'conforme aux critères';
    return { texte: JSON.stringify(j) };
  }
  /* ── Léa : le premier courriel ── */
  if (id === 'lea' && /Écris le courriel\./.test(dernier)) {
    const e = (/Nom de l’entreprise : <<<(.+?)>>>/.exec(dernier) || [])[1] || 'votre entreprise';
    return { texte: courrielLea(e, defauts) };
  }
  /* …et sa RÉÉCRITURE demandée par le contrôle qualité du serveur : même texte, défaut compris (le bon équipier n'en a pas ; ceux qu'on joue ici ne se réparent pas) */
  if (id === 'lea' && msgs.length >= 3 && /^Relecture du serveur/.test(dernier)) {
    const e = (/Nom de l’entreprise : <<<(.+?)>>>/.exec(String(typeof msgs[0].content === 'string' ? msgs[0].content : '')) || [])[1] || 'votre entreprise';
    return { texte: courrielLea(e, defauts) };
  }
  /* ── Camille : un courriel reçu ── */
  if (id === 'camille' && /Voici le courriel reçu\./.test(dernier)) return { texte: reponseCourrier(dernier, defauts) };
  /* …et la RÉÉCRITURE que le contrôle qualité du serveur demande (« Relecture du serveur… ») : le bon équipier corrigerait ; ici il rejoue la même réponse, défaut compris — c'est ce qui prouve
     que l'examen voit un défaut que la réécriture ne répare pas. */
  if (id === 'camille' && msgs.length >= 3 && /^Relecture du serveur/.test(dernier)) return { texte: reponseCourrier(String(typeof msgs[0].content === 'string' ? msgs[0].content : ''), defauts) };
  /* ── le relecteur qualité du serveur (`agents-controle.js`) : un verdict fermé, « VERDICT : OK » — le jugement d'Inès, lui, est celui de l'examen (`juge-non`) ── */
  if (/^Tu es le relecteur qualité/.test(system)) return { texte: 'VERDICT : OK' };
  /* ── une réunion ── */
  /* la seconde demande du serveur, SANS outil, à qui n'a rendu que des outils (`parole`, `o.ecrire`) : le message, enfin */
  if (/RÉUNION EN COURS/.test(system) && !outils.length && /Tes outils sont faits/.test(dernier)) {
    if (/Clos la réunion/.test(dernier)) return { texte: 'Compte rendu du vendredi. Décisions : on garde le rythme, la plupart des objectifs sont atteints, un est partiel. Qui fait quoi : chacun reprend ses objectifs lundi avec la leçon notée. Ce qui attend Justin : rien de bloquant cette semaine.' };
    return { texte: 'Bilan de ' + nom + ' : un objectif tenu, un à moitié, faits à l’appui ; la leçon est notée.' };
  }
  if (/RÉUNION EN COURS/.test(system)) {
    if (outils.includes('fixer_objectifs')) {
      if (/Tu ouvres la réunion/.test(dernier)) return { texte: 'On démarre la semaine. D’après les faits, ' + (compteur % 2 ? 'trois' : 'quelques') + ' choses à retenir : le courrier avance, une erreur côté Léa, et rien ne coince côté serveur. Je vous laisse la parole chacun votre tour.' };
      const objectifs = defauts.includes('sans-objectifs') ? [] : [{ texte: 'Traiter les demandes de ' + nom + ' dans la journée', mesure: 'zéro demande en attente le vendredi (' + nom + ')' }, { texte: 'Écrire un point de situation chaque jeudi', mesure: 'un point par semaine dans le fil' }];
      const actions = objectifs.length ? [A('fixer_objectifs', { objectifs })] : [];
      if (/Clos la réunion/.test(dernier)) return { texte: 'Compte rendu du lundi. Décisions : chacun tient ses deux objectifs de la semaine, nous relisons les faits vendredi. Qui fait quoi : Léa suit les inscriptions, Camille le courrier, Hugo les accès, Max la surveillance, Jules les correctifs. Ce qui attend Justin : rien de bloquant cette semaine, juste un coup d’œil sur la file de validations.', actions };
      if (/On t’a cité/.test(dernier)) return { texte: 'RAS' };
      return { texte: 'Côté ' + nom + ' : ' + (id === 'lea' ? 'je continue les premiers courriels aux inscrits. @camille j’aurai besoin de toi pour les réponses aux prospects. ' : 'je garde le même cap que la semaine dernière. ') + 'Mes deux objectifs sont enregistrés.', actions };
    }
    if (outils.includes('juger_objectif')) {
      const ids = [...system.matchAll(/^\[(o[0-9a-f]+)\]/gm)].map(m => m[1]);
      const actions = ids.map((o, i) => A('juger_objectif', { objectif: o, statut: i % 2 ? 'partiel' : 'atteint', pourquoi: 'd’après les faits de la semaine, ' + (i % 2 ? 'fait à moitié' : 'tenu') }));
      if (defauts.includes('outils-seuls') && !/Tu ouvres la réunion|On t’a cité/.test(dernier)) return { texte: '', actions: actions.concat([A('ajouter_lecon', { texte: 'Vérifier les faits avant de promettre un délai (' + nom + ')' })]) };
      if (/Clos la réunion/.test(dernier)) return { texte: 'Compte rendu du vendredi. Décisions : on garde le rythme, trois objectifs atteints et un partiel. Qui fait quoi : chacun reprend ses objectifs lundi. Ce qui attend Justin : rien de bloquant cette semaine.', actions: actions.concat([A('ajouter_lecon', { texte: 'Relire les faits du journal avant chaque point du jeudi' })]) };
      if (/On t’a cité/.test(dernier)) return { texte: 'RAS' };
      if (/Tu ouvres la réunion/.test(dernier)) return { texte: 'Bilan de la semaine : le courrier a avancé, un refus côté Camille, rien de grave côté serveur. Chacun donne ses objectifs un par un.' };
      return { texte: 'Bilan de ' + nom + ' : ' + (ids.length ? 'un objectif tenu, un à moitié, le reste a coincé sur le temps' : 'pas d’objectif enregistré cette semaine') + '. Leçon pour la suite ci-dessous.', actions: actions.concat(id === 'ines' || id === 'hugo' ? [] : [A('ajouter_lecon', { texte: 'Vérifier les faits avant de promettre un délai (' + nom + ')' })]) };
    }
  }
  /* ── la conversation : la messagerie de l'équipe ── */
  const dit = t => ({ texte: t });
  const justin = /\[[^\]]+ a écrit dans le fil/.test(dernier) ? '' : dernier;
  if (defauts.includes('bavard') && outils.length) {
    const autres = ['lea', 'camille', 'hugo', 'margaux', 'chloe', 'emma', 'victor'].filter(x => x !== id).slice(0, 4);
    return dit('Je vois ça ainsi (' + compteur + ') : ' + autres.map(x => '@' + x).join(' ') + ' qu’en pensez-vous ?');
  }
  if (id === 'margaux' && /tu en es où/i.test(dernier)) {
    if (defauts.includes('margaux-renvoie')) return dit('Je passe la demande à @victor, il saura mieux te répondre.');
    /* 28 octobre 2026 — les défauts de la compta : pas de point réel (aucun outil), un chiffre de TeamOP dans sa bouche, une promesse d'avoir */
    if (defauts.includes('margaux-sans-point')) return dit('Tout va bien côté compta, je te laisse regarder la Tour. Pour DOS-900001, oui, il a bien payé, formule pro, tout est à jour.');
    if (defauts.includes('margaux-chiffre')) return { texte: 'On est à 4 217,50 € encaissés ce mois, je te le dis tout de suite. Pour DOS-900001, oui, il a bien payé, formule pro, tout est à jour.', actions: outils.includes('point_compta') ? [A('point_compta', { periode: 'ce_mois' })] : [] };
    if (defauts.includes('margaux-avoir')) return { texte: 'Je te le mets en dessous. Pour DOS-900001, il a bien payé : je peux faire un avoir si tu veux, dis-moi.', actions: outils.includes('point_compta') ? [A('point_compta', { periode: 'ce_mois' })] : [] };
    /* 28 octobre 2026 : elle fait le POINT RÉEL par son outil (le serveur écrit les chiffres), et sa phrase n'en porte aucun */
    if (outils.includes('point_compta')) return { texte: 'Voilà le point de l’argent, je te l’ai mis juste en dessous. Pour DOS-900001, oui, il a bien payé, formule pro, tout est à jour.', actions: [A('point_compta', { periode: 'ce_mois' })] };   // un bon équipier TUTOIE Justin (scénario 9, compté dans ses fils privés)
    return dit('Sur la compta globale, je te le dis franchement, je ne vois que ce que le serveur me donne : pas de vue d’ensemble. Pour DOS-900001, oui, il a bien payé, formule pro, tout est à jour.');
  }
  if (id === 'camille' && /prépare-moi la liste des questions/i.test(dernier)) return { texte: 'C’est pris, je m’en occupe aujourd’hui.', actions: [A('prendre', { texte: 'Préparer la liste des questions qui reviennent le plus dans le courrier de la semaine' })] };
  if (id === 'camille' && /réponse type pour les demandes de facture/i.test(dernier)) {
    const tache = (/^- \[([0-9a-f]{12})\]/m.exec(system) || [])[1];
    if (defauts.includes('camille-garde') || !tache) return { texte: 'D’accord, je le fais aussi.', actions: [A('prendre', { texte: 'Écrire la réponse type pour les demandes de facture' })] };
    return { texte: 'Je suis déjà sur trois travaux, je passe celui-là à Léa qui est libre.', actions: [A('passer', { vers: 'lea', tache, raison: 'j’ai trois travaux en cours et Léa n’a rien en ce moment' })] };
  }
  if (/@tous/i.test(justin) || (/prospects répondent plus vite/i.test(dernier))) return dit(({ lea: 'Un objet plus précis, avec le nom de l’entreprise, ferait ouvrir plus de courriels.', chloe: 'Des questions courtes, une seule demande par courriel.', camille: 'Répondre dans la même journée change tout, je peux m’y tenir.', hugo: 'Pour ma part je n’ai rien à ajouter côté accès.', margaux: 'Rien côté compta, je laisse la parole aux autres.', emma: 'Proposer un créneau d’appel de dix minutes dès le premier courriel.' })[id] || 'Je n’ai rien à ajouter.');
  if (id === 'camille' && /Demande à @Hugo/i.test(dernier)) return dit('@hugo, le client du dossier DOS-900002 dit qu’il a payé : peux-tu vérifier s’il a bien payé ?');
  if (id === 'hugo' && /Camille a écrit/.test(dernier)) {
    if (/aucun dossier cité/.test(system)) return dit('Je n’ai plus le dossier sous les yeux, mais ma réponse d’avant tient : il est en impayé.');   /* une seconde convocation sur la même question : plus de fait, le bon équipier ne se contredit pas */
    return dit(/"impaye"/.test(system) ? 'Non, DOS-900002 est en impayé : rien n’est réglé pour l’instant.' : 'Oui, il a bien payé.');
  }
  if (/ne sont pas d’accord/i.test(dernier) || /tranche/i.test(dernier)) {
    if (id === 'lea') return dit('Je relance tous les 2 jours : les prospects oublient vite, et un rappel court ne dérange pas.');
    if (id === 'camille') return dit('Une seule relance à 7 jours me paraît plus respectueuse du prospect.');
    if (id === 'victor') return dit('Je tranche : une première relance à 4 jours, et une seule de plus si le prospect a ouvert le courriel. Léa, tu gardes le suivi ; Camille, tu surveilles les réponses qui arrivent.');
  }
  return dit('Bien noté, ' + nom + ' regarde ça (' + compteur + ').');
}

function appeler(defauts) {
  return async (cle, requete) => {
    if (Array.isArray(defauts) && defauts.includes('panne')) throw new Error('panne simulée');
    const d = decider(requete, defauts);
    return { texte: d.texte, entree: 1800, sortie: 220, stop_reason: (d.actions && d.actions.length) ? 'tool_use' : 'end_turn', actions: (d.actions || []).map((a, i) => ({ id: 'toolu_' + i, nom: a.nom, entree: a.entree })) };
  };
}

function reponseHttp(corps, defauts) {
  const d = decider(corps, defauts);
  const content = [{ type: 'thinking', thinking: 'je réfléchis…', signature: 'sig' }];
  if (d.texte) content.push({ type: 'text', text: d.texte });
  for (const [i, a] of (d.actions || []).entries()) content.push({ type: 'tool_use', id: 'toolu_' + i, name: a.nom, input: a.entree });
  return { id: 'msg_banc', type: 'message', role: 'assistant', model: 'claude-sonnet-5', stop_reason: (d.actions && d.actions.length) ? 'tool_use' : 'end_turn', content, usage: { input_tokens: 1800, output_tokens: 220 } };
}
module.exports = { decider, appeler, reponseHttp, courrielLea, reponseCourrier };

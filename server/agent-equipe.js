/* LA MESSAGERIE DES AGENTS (23 octobre 2026) — une VRAIE conversation, pas un aiguillage. Cahier : `design/EQUIPE-AGENTS.md` §6 et §11.
 *
 * Justin, après avoir essayé la maquette (il demande à Margaux « sur la compta, tu en es où ? » et elle « passe la demande » à Victor) :
 * « Les réponses, c'est pas ouf… là ça se refile les tâches : je pose une question et c'est l'autre qui prend la main. Après, si une personne
 * est occupée et qu'une autre ne fait rien et peut gérer, pour ne pas la surcharger de travail, c'est bien. »
 *
 * ⛔ UNE QUESTION REÇOIT LA RÉPONSE DE CELUI À QUI ELLE EST POSÉE. Un message qui cite un agent n'est PAS une tâche d'office et n'est JAMAIS
 *    délégué mécaniquement : l'agent cité lit le fil, comprend et DÉCIDE avec son cerveau — répondre, prendre le travail, demander une précision.
 *    Rien dans ce fichier n'envoie un message vers un autre agent « parce que » : c'est le modèle qui choisit, et le CODE qui valide.
 * ⛔ UN AGENT AGIT PAR DES OUTILS FERMÉS (`outilsDe`) : ecrire, prendre, passer, terminer, demander_justin. Chaque appel est VALIDÉ ici avant d'être
 *    exécuté, et la règle qui compte (qui peut passer quoi à qui) vit dans `agents.js` (`consigner`, `passerConsigne`) — une seule définition.
 *    Un appel refusé ne fait rien d'autre qu'une ligne au journal et une ligne du système dans le fil, qui dit POURQUOI.
 * ⛔ HUGO ET MARGAUX (l'argent et les accès) ne reçoivent un texte libre que de JUSTIN. D'un collègue vers eux : seulement les types fermés de
 *    `agents.js` (`deposer`). Un texte venu d'un client ne devient jamais une consigne — et ce fichier n'en reçoit aucun : seuls les messages des
 *    fils (Justin, les agents) et des FAITS fermés entrent dans ce que Claude lit.
 * ⛔ ANTI-BOUCLE. Sans elle, deux agents qui se citent se répondent à l'infini et vident le budget : un message porte sa profondeur (Justin 0,
 *    une réponse = celle du message + 1) ; un agent réveillé par un AUTRE agent ne l'est que si cette profondeur est < `PROF_MAX` ; jamais sur son
 *    propre message ni sur un message du système ; au plus `REVEILS_AGENT_MAX` agents réveillés par un message d'agent ; et le module des
 *    conversations plafonne les messages d'agents par heure et par fil, en plus du plafond par agent.
 * ⛔ UN AGENT À L'ARRÊT NE PARLE PAS, et ne lit rien : `peutAgir` est demandé avant les faits, avant Claude, avant le mot. Le fil reçoit alors une
 *    ligne du système, une fois par heure.
 * ⛔ CE QUE CLAUDE REÇOIT : le fil (15 messages, adresses et numéros masqués), ses tâches en cours, la charge de l'équipe (des NOMS et des NOMBRES)
 *    et un bloc FAITS fermé (même seconde barrière que `agent-conversation.js`, dont `fermer` est repris tel quel).
 */
'use strict';
const AC = require('./agent-conversation');
const { fermer, raccourcir, sansTel, ADRESSE, CAUSES, FORME_DOSSIER } = AC;
const { SANS_CONSIGNE_LIBRE } = require('./agents');
const { GROUPES } = require('./conversations');

const HISTORIQUE_N = 15;
const PROF_MAX = 3;
const REVEILS_AGENT_MAX = 4;
const ACTIONS_MAX = 4;
const MESSAGE_MAX = 1000;
const DOSSIERS_MAX = 3;

/* Les rôles : ceux de la conversation générique, plus Hugo (qui avait son module — il parle désormais ici, comme les autres). */
const ROLES = Object.assign({}, AC.ROLES, {
  hugo: { faits: ['dossier'], rien: 'Tu ne peux RIEN faire seul sur les paiements ni sur les accès : tu constates, tu prépares, et Justin valide.',
    mission: 'Tu t’occupes des paiements et des accès : tu relis les paiements Stripe, tu prépares la création des espaces clients et les fins d’abonnement. Tu ne crées aucun espace toi-même : ta demande passe par une validation de Justin.' },
});

/* Une ligne de caractère par agent : une façon de parler, pas une liste de qualités. Pas de formule toute faite (Justin : « pas des robots »). */
const PERSO = {
  victor:  'Posé et organisé, tu vas à l’essentiel ; quand deux collègues ne sont pas d’accord tu tranches calmement, et tu dis nettement ce qui revient à Justin.',
  ines:    'Exigeante mais bienveillante : tu relèves un défaut avec précision, jamais pour le plaisir de reprocher.',
  camille: 'Chaleureuse et patiente ; tu reformules ce que le client a vécu avant de proposer quoi que ce soit.',
  hugo:    'Carré et discret ; tu parles en faits vérifiés et tu n’avances rien dont tu n’es pas sûr.',
  margaux: 'Rigoureuse, un peu sèche sur les chiffres mais jamais froide ; tu dis où en est la compta sans détour.',
  lea:     'Enthousiaste et curieuse ; tu t’intéresses d’abord à ce que le client veut réussir avec l’application.',
  max:     'Calme quand ça chauffe ; tu parles court, avec des chiffres, sans jamais dramatiser.',
  nina:    'Prudente et pédagogue ; tu expliques un risque en une phrase simple, sans jargon.',
  theo:    'Méthodique et tranquille ; tu aimes les choses vérifiées deux fois, et tu le dis.',
  jules:   'Pragmatique, avec un brin d’ironie ; tu cherches la cause avant de parler de correctif.',
  chloe:   'Créative mais concrète ; tu penses toujours au chantier du client avant de penser au devis.',
  emma:    'Organisée et souriante ; les horaires, les lieux et les détails pratiques sont ton terrain.',
  louis:   'Pédagogue patient ; tu cherches l’exemple qui fait comprendre plutôt que l’explication complète.',
  sarah:   'Soigneuse avec les mots ; tu pèses chaque phrase et tu tiens au ton juste.',
  lola:    'Vive et visuelle ; tu penses en images, en accroches, en idées de publications.',
  noah:    'Observateur et mesuré ; tu lis ce qui se dit de Team OP sans t’emballer.',
};

/* ── QUI EST RÉVEILLÉ PAR UN MESSAGE — pur, donc rejouable au banc ─────────────────────────────────────────────────────────────────────
   `m` : { de, prof, mentions }. `o` : { membres:[ids], meneur, prive, filId }.
   · un message du SYSTÈME ne réveille personne ;
   · Justin cite quelqu'un → les cités ; sinon l'agent d'un fil privé ; sinon le meneur du groupe ;
   · un AGENT ne réveille que ceux qu'il cite, et seulement si la profondeur du message est < PROF_MAX ;
   · jamais l'auteur lui-même. */
function destinataires(m, o) {
  if (!m || typeof m !== 'object' || m.de === 'systeme' || !o) return [];
  const membres = Array.isArray(o.membres) ? o.membres : [];
  const cites = (Array.isArray(m.mentions) ? m.mentions : []).filter(id => id !== m.de && membres.includes(id));
  if (m.de === 'justin') {
    if (cites.length) return cites;
    if (o.prive) return membres.includes(o.filId) ? [o.filId] : [];
    return o.meneur && membres.includes(o.meneur) ? [o.meneur] : [];
  }
  if (!(Number(m.prof) < PROF_MAX)) return [];
  return cites;
}

/* ── LES OUTILS : une liste fermée, des schémas stricts. `o.fils` : les fils où l'agent peut écrire. `o.collegues` : à qui il peut passer. ── */
function outilsDe(id, o) {
  o = o || {};
  const fils = Array.isArray(o.fils) ? o.fils : [];
  const collegues = Array.isArray(o.collegues) ? o.collegues : [];
  return [
    { name: 'ecrire', description: 'Écrire un message dans un fil dont tu es membre (ton fil privé avec Justin, ou un groupe). Pour qu’un collègue le lise, cite-le avec @identifiant dans le texte (par exemple @lea). Pas besoin de cet outil pour répondre à ce qu’on te demande ici : ta réponse normale va déjà dans ce fil. 600 caractères au plus.',
      input_schema: { type: 'object', properties: { fil: { type: 'string', enum: fils }, texte: { type: 'string' } }, required: ['fil', 'texte'], additionalProperties: false } },
    { name: 'prendre', description: 'Accepter un travail : il devient TA tâche en cours, « demandée par » celui qui vient de te la demander. À n’utiliser que si tu t’en charges vraiment ; une simple question n’est pas un travail. Décris le travail en une phrase (500 caractères au plus).',
      input_schema: { type: 'object', properties: { texte: { type: 'string' } }, required: ['texte'], additionalProperties: false } },
    { name: 'passer', description: 'Passer une de tes tâches en cours à un collègue LIBRE (aucune tâche en cours), seulement si tu es réellement chargé (tu as au moins une autre tâche en cours). Jamais Hugo ni Margaux. Dis la raison, elle sera écrite dans le fil.',
      input_schema: { type: 'object', properties: { vers: { type: 'string', enum: collegues }, tache: { type: 'string' }, raison: { type: 'string' } }, required: ['vers', 'tache', 'raison'], additionalProperties: false } },
    { name: 'terminer', description: 'Marquer une de tes tâches en cours comme terminée, avec un résumé d’une phrase.',
      input_schema: { type: 'object', properties: { tache: { type: 'string' }, resume: { type: 'string' } }, required: ['tache', 'resume'], additionalProperties: false } },
    { name: 'demander_justin', description: 'Poser une question que Justin doit trancher : elle arrive dans ton fil privé avec lui, en « important » (il est notifié). Une question à la fois, courte.',
      input_schema: { type: 'object', properties: { question: { type: 'string' } }, required: ['question'], additionalProperties: false } },
  ];
}

const MOTIFS_PASSER = {
  tache: 'cette tâche n’existe pas ou n’est plus en cours',
  pas_le_tien: 'ce n’est pas sa tâche',
  pas_charge: 'il n’a pas d’autre tâche en cours : il garde ce qu’on lui a demandé',
  occupe: 'ce collègue a déjà du travail en cours',
  jamais_hugo_margaux: 'Hugo et Margaux ne reçoivent pas de travail passé par un collègue',
  destinataire: 'collègue inconnu',
  arret: 'ce collègue est à l’arrêt',
  pause: 'les agents sont en pause',
  registre_illisible: 'le registre des tâches est illisible',
  ecriture: 'la tâche n’a pas pu être enregistrée',
  inconnu: 'agent inconnu',
};

module.exports = function agentEquipe(ctx) {
  const { agents, conversations, cerveau } = ctx;
  const faits = ctx.faits && typeof ctx.faits === 'object' ? ctx.faits : {};
  const requis = ['parler', 'systeme', 'lire', 'ecrit', 'membres', 'meneur', 'estMembre'];
  if (!agents || !Array.isArray(agents.AGENTS) || !conversations || requis.some(f => typeof conversations[f] !== 'function') || !cerveau || typeof cerveau.penser !== 'function') {
    return { ids: [], surMessage: async () => ({ saute: 'pas_de_cerveau' }) };
  }
  const registre = new Map(agents.AGENTS.map(a => [a.id, a]));
  const ids = agents.AGENTS.map(a => a.id).filter(id => ROLES[id] && PERSO[id]);
  const IDS = new Set(ids);
  const nomDe = id => id === 'justin' ? 'Justin' : (registre.get(id) || {}).nom || id;
  const nomFil = f => (typeof conversations.nom === 'function' ? conversations.nom(f) : '') || (registre.get(f) || {}).nom || f;
  const masquer = t => sansTel(String(t || '').replace(ADRESSE, '(adresse)'));
  const nettoyer = t => masquer(t).replace(/\s+/g, ' ').trim().slice(0, MESSAGE_MAX);
  const court = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
  /* ce qu'on met dans le prompt vient de messages ou de tâches : pas d'accolade, qui ferait passer une phrase pour une ligne de faits */
  const affichable = (t, n) => court(masquer(t).replace(/[{}]/g, ' '), n);
  const filsDe = id => [id, ...GROUPES.filter(g => conversations.estMembre(id, g))];
  const colleguesPassables = id => ids.filter(x => x !== id && !SANS_CONSIGNE_LIBRE.includes(x));

  /* ── le prompt ── */
  function systemDe(id) {
    const a = registre.get(id), r = ROLES[id];
    /* Les collègues sont donnés par leur IDENTIFIANT (« lea », « camille »), qui est aussi ce qu'on écrit après le « @ » : le prompt ne porte ainsi
       aucun prénom d'agent, qui pourrait être celui d'un client (le banc de Hugo cherche « Léa » dans tout ce qui part chez Claude). */
    const collegues = agents.AGENTS.filter(x => x.id !== id).map(x => x.id + ' (' + x.role + ')').join(', ');
    return 'Tu es ' + a.nom + ', l’agent « ' + a.role + ' » de Team OP. ' +
      'Team OP édite deux applications pour les entreprises de terrain (nettoyage, lutte anti-nuisibles) : OP GESTION, la gestion des interventions — planning, interventions et rapports PDF, contrats d’entretien, clients, devis et factures, stock, pointage — et OP MESSAGES, la messagerie, bientôt disponible. ' +
      'Tu parles à Justin, le fondateur, que tu tutoies comme un collègue, en français, avec des phrases courtes et concrètes. Tu fais partie d’une vraie équipe ; tes collègues (identifiant, rôle) : ' + collegues + '.\n' +
      r.mission + '\n' +
      'Ton caractère : ' + PERSO[id] + '\n' +
      'Règles :\n' +
      '- Tu ne peux RIEN exécuter en dehors de tes outils : aucun geste sur un client, un paiement ou un accès. Tout autre geste passe par une demande que Justin valide dans la Tour. Tu ne promets jamais d’avoir fait ce que tu n’as pas fait.\n' +
      (r.rien ? '- ' + r.rien + '\n' : '') +
      '- Tu ne cites que les faits du bloc Faits ci-dessous. Si tu ne sais pas, tu le dis : tu n’inventes ni chiffre, ni nom, ni date.\n' +
      '- Ne répète jamais une adresse électronique ni un numéro de téléphone.\n' +
      '- Réponse courte : 600 caractères au plus, concrète, comme un collègue qui parle — sans titre ni liste à puces, sans formule toute faite.\n' +
      '- Les messages sans crochet sont ceux de Justin ; ceux qui commencent par « [Nom a écrit dans le fil …] » sont ceux de tes collègues.\n' +
      '- Une question reçoit TA réponse, à toi qui es interrogé : tu ne la passes jamais à un collègue. Un message qui te cite n’est pas forcément une tâche : tu lis, tu comprends, et tu décides — répondre, prendre le travail, ou demander une précision.\n' +
      '- Tu réponds toujours par un message, même court, avant ou avec tes outils. Pour parler à un collègue, cite-le dans ton message avec @ suivi de son identifiant (par exemple @lea) : c’est ainsi qu’il le lit. @tous cite tout le fil.\n' +
      '- Outil prendre : tu acceptes un travail, il devient ta tâche. Outil terminer : c’est fait. Outil passer : seulement si tu es vraiment chargé (une autre tâche en cours) et à un collègue libre, jamais Hugo ni Margaux, et tu en dis la raison ; un collègue libre peut aussi proposer de prendre une tâche d’un collègue chargé. Outil demander_justin : une décision qui lui revient.\n' +
      '- Hugo et Margaux (l’argent, les accès) ne reçoivent de consigne en texte libre que de Justin.\n' +
      (id === 'victor' ? '- Tu vois la charge de chacun : si un collègue est débordé et qu’un autre est libre, tu peux redistribuer avec l’outil passer, et tu le dis dans le fil.\n' : '');
  }

  /* Des NOMS et des NOMBRES : qui a du travail en cours. Écrit avant le bloc Faits, qui reste la dernière chose du prompt. */
  function blocCharge() {
    let ch = null; try { ch = agents.charge ? agents.charge() : null; } catch (e) { ch = null; }
    if (!ch) return '\nCharge de l’équipe : illisible — tu ne passes aucun travail à personne tant que tu ne la connais pas.';
    const occupes = ids.filter(x => ch[x] > 0).map(x => x + ' ' + ch[x]);
    const libres = ids.filter(x => !(ch[x] > 0));
    return '\nCharge de l’équipe (tâches en cours, relevé du serveur) — occupés : ' + (occupes.join(', ') || 'personne') + ' ; libres : ' + (libres.join(', ') || 'personne') + '.';
  }
  function blocTaches(id) {
    let l = []; try { l = agents.tachesDe ? agents.tachesDe(id) : []; } catch (e) { l = []; }
    let txt = '\nTes tâches en cours :' + (l.length ? '' : ' aucune.');
    for (const t of l.slice(0, 10)) txt += '\n- [' + t.id + '] ' + (t.type === 'consigne' ? '« ' + affichable(t.texte, 200) + ' »' : 'demande « ' + t.type + ' »') + ' — demandée par ' + (t.de === 'justin' ? 'Justin' : t.de);
    if (id === 'victor') {
      txt += '\nTâches en cours de l’équipe (pour redistribuer) :';
      let n = 0;
      for (const x of ids) { if (x === 'victor') continue; let lx = []; try { lx = agents.tachesDe(x); } catch (e) { lx = []; } for (const t of lx) if (t.type === 'consigne' && n++ < 30) txt += '\n- [' + t.id + '] ' + x + ' : « ' + affichable(t.texte, 100) + ' »';
      }
      if (!n) txt += ' aucune.';
    }
    return txt;
  }

  async function lire(f, ...args) {
    if (typeof faits[f] !== 'function') return null;
    try { const r = await faits[f](...args); return r == null ? null : fermer(r); } catch (e) { return null; }
  }
  /* Les dossiers que Justin cite DEPUIS LA DERNIÈRE RÉPONSE de l'agent (huit messages au plus), du plus récent au plus ancien : les faits suivent ce qu'on
     lui demande maintenant, pas ce qu'on lui a demandé il y a une heure. */
  function dossiersCites(fil, id) {
    const vus = [];
    const recents = conversations.lire(fil, 8).reverse();
    for (const m of recents) {
      if (m.de === id) break;
      if (m.de !== 'justin') continue;
      for (const n of (String(m.texte).toUpperCase().match(/DOS-\d{6}/g) || [])) if (!vus.includes(n) && vus.length < DOSSIERS_MAX) vus.push(n);
    }
    return vus;
  }
  async function blocFaits(id, fil) {
    const voulus = ROLES[id].faits;
    if (!voulus.length) return '\nBloc Faits : aucun fait n’est fourni à ton rôle — tu ne connais que ta mission ; pour tout chiffre ou toute donnée, tu dis que tu ne sais pas.';
    const lignes = [];
    for (const f of voulus) {
      if (f === 'dossier') {
        const nums = dossiersCites(fil, id);
        if (!nums.length) { lignes.push('dossier : aucun dossier cité, tu n’as aucun fait client sous les yeux'); continue; }
        for (const n of nums) { const r = await lire('dossier', n); lignes.push('dossier ' + n + ' ' + JSON.stringify(r === null ? { lecture: 'impossible' } : r)); }
        continue;
      }
      const r = await lire(f);
      lignes.push(f + ' ' + JSON.stringify(r === null ? { lecture: 'impossible' } : r));
    }
    return '\nBloc Faits (relevés par le serveur à l’instant — ta seule source de chiffres ; « lecture impossible » veut dire que tu ne sais pas) :\n' + lignes.join('\n');
  }

  /* Le fil en messages pour Claude : `user` (Justin sans crochet ; un collègue, nommé) et `assistant` (l'agent), consécutifs fusionnés, jamais un
     `assistant` en tête, TOUJOURS un `user` à la fin. Les lignes du système n'y sont pas : elles ne sont à personne. */
  function messagesDe(fil, id, d) {
    const prefixe = de => '[' + nomDe(de) + ' a écrit dans le fil ' + nomFil(fil) + '] ';
    const brut = [];
    for (const m of conversations.lire(fil, 50).filter(x => x.de !== 'systeme').slice(-HISTORIQUE_N)) {
      const t = nettoyer(m.texte); if (!t) continue;
      if (m.de === id) brut.push({ role: 'assistant', texte: t });
      else if (m.de === 'justin') brut.push({ role: 'user', texte: t });
      else brut.push({ role: 'user', texte: prefixe(m.de) + t });
    }
    while (brut.length && brut[0].role === 'assistant') brut.shift();
    if (!brut.length || brut[brut.length - 1].role !== 'user') { const t = nettoyer(d.texte); if (t) brut.push({ role: 'user', texte: d.de === 'justin' ? t : prefixe(d.de) + t }); }
    const messages = [];
    for (const m of brut) {
      const dernier = messages[messages.length - 1];
      if (dernier && dernier.role === m.role) dernier.content += '\n' + m.texte; else messages.push({ role: m.role, content: m.texte });
    }
    return messages;
  }

  const journal = (id, action, resultat, detail) => { try { agents.noter(id, action, { cible: 'conversation', resultat, detail }); } catch (e) {} };
  const dire = (fil, texte, o) => { try { return conversations.systeme(fil, texte, o); } catch (e) { return { ok: false, raison: 'erreur' }; } };

  /* Un agent qui ne peut pas être réveillé : la raison que Justin peut lever se dit, UNE fois par heure. Les autres (agent inconnu, état illisible) se taisent. */
  function signalerArret(id, fil, raison) {
    if (raison === 'arret') dire(fil, nomDe(id) + ' est à l’arrêt : allume-le dans la page Agents.', { cle: 'arret:' + id, parHeure: true });
    else if (raison === 'pause') dire(fil, 'Les agents sont en pause : reprends-les dans la page Agents.', { cle: 'pause', parHeure: true });
  }

  /* ── les outils, exécutés et VALIDÉS ici ── */
  function executer(id, a, c) {
    const e = a && a.entree && typeof a.entree === 'object' ? a.entree : {};
    const str = k => typeof e[k] === 'string' ? e[k] : '';
    const refus = (raison, ligne) => { journal(id, 'outil ' + a.nom, 'refuse', raison); if (ligne) dire(c.fil, ligne); return { ok: false, raison }; };
    const bon = (detail) => { journal(id, 'outil ' + a.nom, 'ok', detail); return { ok: true }; };
    const nom = nomDe(id);
    if (a.nom === 'ecrire') {
      const fil = str('fil');
      if (!filsDe(id).includes(fil)) return refus('fil');
      const t = raccourcir(masquer(str('texte')));
      if (!t) return refus('texte');
      const r = conversations.parler(id, fil, t, { niveau: 'info', prof: c.prof });
      return r.ok ? bon(fil) : refus(r.raison);
    }
    if (a.nom === 'prendre') {
      const t = court(masquer(str('texte')).replace(/\s+/g, ' ').trim(), 500);
      if (!t) return refus('texte');
      const r = agents.consigner(c.d.de, id, t);
      if (r.ok) { dire(c.fil, nom + ' a pris « ' + court(t, 90) + ' »'); return bon('consigne'); }
      const motif = { consigne_libre_refusee: 'seul Justin donne une consigne libre à ' + nom, trop_de_taches: nom + ' a déjà trop de tâches en cours', doublon: nom + ' l’a déjà en cours' }[r.raison] || r.raison;
      return refus(r.raison, r.raison === 'doublon' ? '' : nom + ' ne peut pas prendre « ' + court(t, 90) + ' » : ' + motif + '.');
    }
    if (a.nom === 'passer') {
      const vers = str('vers'), tache = str('tache'), raison = court(masquer(str('raison')).replace(/\s+/g, ' ').trim(), 150);
      let avant = null; try { avant = agents.tachesDe(id).find(t => t.id === tache) || null; } catch (x) {}
      if (!avant && id === 'victor') { for (const x of ids) { try { avant = agents.tachesDe(x).find(t => t.id === tache) || avant; } catch (y) {} } }
      const r = agents.passerConsigne(id, tache, vers);
      const q = avant && avant.texte ? '« ' + court(avant.texte, 90) + ' »' : 'une tâche';
      if (r.ok) {
        dire(c.fil, (r.de === id ? nom + ' a passé ' + q + ' à ' + nomDe(vers) : nom + ' a confié ' + q + ' de ' + nomDe(r.de) + ' à ' + nomDe(vers)) + (raison ? ' : ' + raison : '') + '.');
        return bon(r.de + ' → ' + vers);
      }
      return refus(r.raison, nom + ' voulait passer ' + q + ' à ' + (registre.has(vers) ? nomDe(vers) : 'un collègue inconnu') + ' : refusé, ' + (MOTIFS_PASSER[r.raison] || r.raison) + '.');
    }
    if (a.nom === 'terminer') {
      const tache = str('tache'), resume = court(masquer(str('resume')).replace(/\s+/g, ' ').trim(), 200);
      let avant = null; try { avant = agents.tachesDe(id).find(t => t.id === tache) || null; } catch (x) {}
      if (!avant || !agents.terminer(tache, id, 'ok', resume)) return refus('tache');
      dire(c.fil, nom + ' a terminé ' + (avant.texte ? '« ' + court(avant.texte, 90) + ' »' : 'une tâche') + (resume ? ' : ' + resume : '') + '.');
      return bon('terminee');
    }
    if (a.nom === 'demander_justin') {
      const q = raccourcir(masquer(str('question')));
      if (!q) return refus('texte');
      const r = conversations.parler(id, id, q, { niveau: 'important', prof: c.prof });
      return r.ok ? bon('question') : refus(r.raison);
    }
    return refus('outil_inconnu');
  }

  /* Pourquoi Claude n'a pas répondu, quand Justin peut le lever ou doit le savoir. Dans le fil privé de l'agent, c'est lui qui le dit ; dans un
     groupe, une ligne du système (une fois par heure) : quinze « je ne peux pas répondre » ne noient pas le fil. */
  function echec(id, fil, raison, prof) {
    if (Object.prototype.hasOwnProperty.call(CAUSES, raison)) {
      if (fil === id) { try { conversations.parler(id, fil, 'Je ne peux pas te répondre pour l’instant (' + CAUSES[raison] + ').', { niveau: 'important', prof }); } catch (e) {} }
      else dire(fil, nomDe(id) + ' ne peut pas répondre pour l’instant (' + CAUSES[raison] + ').', { cle: 'panne:' + id + ':' + raison, parHeure: true });
    }
    return { saute: raison };
  }

  /* ── un réveil : lire, réfléchir, répondre dans CE fil, agir par les outils ── */
  async function reveiller(id, d) {
    const fil = d.fil;
    if (!IDS.has(id)) return { saute: 'pas_de_cerveau' };
    const p = agents.peutAgir(id);
    if (!p.ok) { signalerArret(id, fil, p.raison); return { saute: p.raison };  /* à l'arrêt : ni faits, ni Claude, ni mot */ }
    const messages = messagesDe(fil, id, d);
    if (!messages.length) return { saute: 'vide' };
    const prof = (Number(d.prof) || 0) + 1;
    conversations.ecrit(fil, id, true);
    try {
      const system = systemDe(id) + blocCharge() + blocTaches(id) + await blocFaits(id, fil);
      const outils = outilsDe(id, { fils: filsDe(id), collegues: colleguesPassables(id) });
      const r = await cerveau.penser(id, system, messages, { outils, reflechir: true });
      if (!r.ok) return echec(id, fil, r.raison, prof);
      const sortie = { repondu: false, actions: [] };
      if (r.texte) {
        const dit = conversations.parler(id, fil, raccourcir(masquer(r.texte)), { niveau: 'info', prof });
        if (dit.ok) sortie.repondu = true; else sortie.saute = dit.raison;
      }
      for (const a of (Array.isArray(r.actions) ? r.actions : []).slice(0, ACTIONS_MAX)) {
        let x; try { x = executer(id, a, { fil, d, prof }); } catch (err) { journal(id, 'outil ' + a.nom, 'erreur', 'exception'); x = { ok: false, raison: 'erreur' }; }
        sortie.actions.push({ nom: a.nom, ok: x.ok, raison: x.raison });
      }
      return sortie;
    } finally { conversations.ecrit(fil, id, false); }
  }

  /* Une réponse à la fois par fil : plusieurs réveils d'un même fil se suivent, chacun voyant ce que le précédent a dit. Un autre fil n'attend pas. */
  const files = new Map();
  function enfiler(f, travail) {
    const suite = (files.get(f) || Promise.resolve()).catch(() => {}).then(travail);
    files.set(f, suite);
    const nettoie = () => { if (files.get(f) === suite) files.delete(f); };
    suite.then(nettoie, nettoie);
    return suite;
  }
  const deja = new Set();   // un message ne réveille un agent qu'une fois
  function surMessage(m) {
    if (!m || typeof m !== 'object' || typeof m.fil !== 'string' || !conversations.filValide(m.fil)) return Promise.resolve({ saute: 'message' });
    const membres = conversations.membres(m.fil).map(x => x.id);
    const prive = membres.length === 1 && membres[0] === m.fil;
    let cibles = destinataires(m, { membres, meneur: conversations.meneur(m.fil), prive, filId: m.fil }).filter(id => IDS.has(id));
    if (m.de !== 'justin') cibles = cibles.slice(0, REVEILS_AGENT_MAX);
    cibles = cibles.filter(id => { const k = m.id + ':' + id; if (deja.has(k)) return false; deja.add(k); if (deja.size > 2000) deja.clear(); return true; });
    return Promise.all(cibles.map(id => enfiler(m.fil, () => reveiller(id, m).catch(e => { console.error('agent ' + id + ' :', String(e && e.message || e).slice(0, 120)); return { saute: 'erreur' }; }))));
  }

  return { ids, surMessage };
};
module.exports.destinataires = destinataires;
module.exports.outilsDe = outilsDe;
module.exports.ROLES = ROLES;
module.exports.PERSO = PERSO;
module.exports.PROF_MAX = PROF_MAX;
module.exports.REVEILS_AGENT_MAX = REVEILS_AGENT_MAX;
module.exports.FORME_DOSSIER = FORME_DOSSIER;

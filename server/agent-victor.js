/* VICTOR — le chef d'équipe (23 octobre 2026). Catégories de la Tour : Accueil (et le fil « Équipe TeamOP »).
 *
 * Justin : « je veux une vraie équipe d'entreprise » ; « si une personne est occupée et qu'une autre ne fait rien et peut gérer, pour ne pas la surcharger de travail, c'est bien ». Victor fait trois
 * choses, et seule la première est un rendez-vous :
 *  1. LE POINT DU MATIN — une fois par jour, à 8 h (heure de Paris), dans « Équipe TeamOP » : ce qui attend Justin (demandes d'agents à valider, demande RGPD et son délai, contrats, courrier,
 *     incidents) et la charge de chacun. Même mécanique que les réunions : inscrit AVANT d'être dit (jamais deux fois, même après un redémarrage), rattrapé toute la journée si le serveur était
 *     arrêté. Un matin calme est dit en une ligne, SANS appeler Claude ; sinon un seul appel (faits fermés), dont chaque nombre est vérifié contre les faits — sinon le texte est celui du code.
 *  2. L'ÉQUILIBRAGE — il voit les tâches en cours de chacun (`agents.charge()`) ; quand un agent en a trois ou plus et qu'un collègue est LIBRE, il demande au modèle s'il faut en redistribuer une, et
 *     laquelle (un outil à choix fermés : une tâche de la liste, un collègue libre de la liste). Le CODE exécute par `passerConsigne` — la seule règle de ce dépôt sur qui peut passer quoi à qui (jamais
 *     Hugo ni Margaux, jamais à un collègue occupé) — et le DIT, avec la raison. Rien ne bouge si l'état de la charge est le même que la dernière fois où il a regardé.
 *  3. L'ARBITRAGE — quand deux agents ne sont pas d'accord (on le lui demande, ou leur échange s'est arrêté sur la limite anti-boucle sans que personne ait tranché), il décide : une DÉCISION ÉCRITE,
 *     rangée dans sa mémoire et dite dans le fil, avec les deux agents cités. Ce qui dépasse la charte — l'argent, un contrat, un accès, une suppression, une mise en demeure — n'est pas à lui : il pose la
 *     QUESTION À JUSTIN (son fil privé, « important »), et le code le force : une décision qui touche à ces mots n'est jamais présentée comme tranchée.
 *
 * ⛔ VICTOR NE PREND AUCUNE DÉCISION D'ARGENT NI D'ACCÈS, ne change aucun mode, ne lève aucune pause, ne valide aucune demande : tout cela est à Justin (charte). Il redistribue du travail déjà pris et il arbitre
 *    entre collègues.
 * ⛔ CE QUI PART CHEZ CLAUDE : des NOMBRES, des prénoms d'agents (les clés de leur registre), des jours de la semaine ; pour l'équilibrage, le texte des tâches en cours (venu de Justin ou des agents, adresses et
 *    numéros masqués — comme dans la messagerie) ; pour l'arbitrage, les derniers messages de l'échange (des agents). Jamais un incident de la Tour, un courriel, un nom de client. `fait()` est la seconde barrière.
 * ⛔ UN APPEL PAR NÉCESSITÉ, PLAFONNÉ PAR JOUR : un pour le point (si le matin n'est pas calme), trois pour l'équilibrage, trois pour l'arbitrage. Sans clé, plafond du jour ou panne, il retombe sur le
 *    texte du code (le point) ou ne fait rien (équilibrage, arbitrage) — jamais une décision à moitié.
 * Toutes les dépendances sont INJECTÉES.
 */
'use strict';
const crypto = require('crypto');
const AC = require('./agent-conversation');
const O = require('./plateforme-outils');
const { SANS_CONSIGNE_LIBRE } = require('./agents');

const ID = 'victor';
/* (28 octobre 2026, Justin : « sans limite ») Le point du jour se RATTRAPE toute la journée (limite 24 = minuit, heure de Paris) : jusqu'à midi, un serveur redémarré à 12 h 05 laissait Justin sans point
   jusqu'au lendemain — alors que les faits qu'il contient (ce qui t'attend, la plateforme) valent toujours. Le jour suivant, la clé change : jamais deux points le même jour. */
const POINT = { heure: 8, limite: 24 };
const JOURS = ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const CHARGE_MIN = 3;                               // tâches en cours à partir desquelles il demande s'il faut redistribuer
const EQUILIBRE_MS = 30 * 60000;
const ARBITRAGE_MS = 10 * 60000;
const COUPE_ATTENTE_MS = 3 * 60000;                 // une chaîne coupée par l'anti-boucle : on laisse trois minutes avant d'y toucher
const PROF_COUPE = 3;                               // la profondeur où la messagerie arrête une chaîne (`agent-equipe.js`, PROF_MAX)
const APPELS_MAX = { equilibre: 3, arbitrage: 3, point: 1 };
const POINTS_MANUELS_GARDES = 5;       // les points forcés depuis la Tour qu'on garde : une famille à part, ils ne comptent pas dans les jours
const DECISIONS_MAX = 50, POINTS_GARDES = 14, ESSAIS_POINT = 10;
const TEXTE_TACHE = 100, DECISION_MAX = 300, RAISON_MAX = 200;
/* Ce qui n'est PAS à Victor : si une décision en parle, elle devient une question à Justin (la charte : argent, contrats, accès, suppression, mise en demeure). */
const HORS_CHARTE = /rembours|avoir\b|factur|paiement|\bpay[ée]|prix|tarif|remise|r[ée]duction|gratuit|abonnement|supprim|efface|\bdonn[ée]es?\b|rgpd|mise en demeure|contrat|acc[èe]s|mot de passe|mdp|suspen/i;

module.exports = function agentVictor(ctx) {
  const { agents, conversations, cerveau, etat, incidents } = ctx;
  const maintenant = typeof ctx.maintenant === 'function' ? ctx.maintenant : Date.now;
  const equipe = () => (typeof ctx.equipe === 'function' ? ctx.equipe() : ctx.equipe) || null;
  /* les lectures des autres : chacune rend un objet de NOMBRES, ou null (« on ne sait pas ») */
  const lire = f => { try { return typeof f === 'function' ? f() : null; } catch (e) { return null; } };
  if (!agents || !conversations || !etat) return { tic: async () => ({ saute: 'pas_de_dependances' }), passer: async () => ({ saute: 'pas_de_dependances' }), arbitrer: () => ({ ok: false, raison: 'pas_de_dependances' }), etat: () => ({}) };
  const REG = agents.AGENTS || [];
  const IDS = new Set(REG.map(a => a.id));
  const nomDe = id => (REG.find(a => a.id === id) || {}).nom || id;
  const note = (action, o) => { try { agents.noter(ID, action, o); } catch (e) {} };
  const parler = (fil, texte, niveau, prof) => { try { return conversations.parler(ID, fil, texte, { niveau, prof }); } catch (e) { return { ok: false, raison: 'erreur' }; } };
  const dit = d => d.ok || d.raison === 'doublon';
  const num = x => (typeof x === 'number' && Number.isFinite(x)) ? x : null;
  const masquer = t => AC.sansTel(String(t == null ? '' : t).replace(AC.ADRESSE, '(adresse)'));
  const propre = (t, n) => masquer(String(t == null ? '' : t).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/[{}]/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, n);
  const memoire = () => etat.agent(ID);

  /* ── la seconde barrière : des nombres, des booléens, des jours, des identifiants d'agents — rien d'autre ── */
  const CLES = new Set([...IDS, ...JOURS.slice(1)]);
  function fait(v, prof) {
    prof = prof || 0;
    if (prof > 4) return null;
    if (v === null || typeof v === 'boolean') return v;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (typeof v === 'string') return CLES.has(v) ? v : null;
    if (Array.isArray(v)) return v.slice(0, 20).map(x => fait(x, prof + 1));
    if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).slice(0, 30)) if (/^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(k)) o[k] = fait(v[k], prof + 1); return o; }
    return null;
  }
  const appelsDuJour = () => {
    const m = memoire(), j = O.jourParis(maintenant());
    if (!m.appels || m.appels.j !== j) m.appels = { j, equilibre: 0, arbitrage: 0, point: 0 };
    return m.appels;
  };

  /* ═══ 1. LE POINT DU MATIN ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  /* Ce qui est vrai ce matin : des nombres, `null` quand on ne sait pas. */
  function collecter() {
    const att = (() => { try { return agents.attentes(); } catch (e) { return null; } })();
    const now = maintenant();
    const inc = lire(() => incidents && incidents.compteurs && incidents.compteurs());
    const rg = lire(ctx.rgpd), ct = lire(ctx.contrats), co = lire(ctx.courrier), rp = lire(ctx.reprise), cl = lire(ctx.clients), mx = lire(ctx.alarmes), qa = lire(ctx.qualite);
    let ch = null; try { ch = agents.charge(); } catch (e) { ch = null; }
    const allumes = REG.filter(a => a.id !== ID && agents.modeDe(a.id) !== 'arret').map(a => a.id);
    return {
      jour: JOURS[O.parisParties(now).jourSemaine],
      attendJustin: {
        validations: Array.isArray(att) ? att.length : null,
        validationPlusAncienneJours: Array.isArray(att) ? att.reduce((m, x) => Math.max(m, Math.floor((now - x.ts) / 86400000)), 0) : null,
        rgpdOuvertes: Array.isArray(rg) ? rg.length : null,
        rgpdEnRetard: Array.isArray(rg) ? rg.filter(x => x.joursRestants < 0).length : null,
        rgpdProchaineJours: Array.isArray(rg) && rg.length ? Math.min.apply(null, rg.map(x => x.joursRestants)) : null,
        contratsEnAttente: ct ? num(ct.enAttente) : null,
        courrierATraiter: co ? num(co.aTraiter) : null,
        demandesClients: cl ? num(cl.demandesEnAttente) : null,
      },
      /* (28 octobre 2026) « 35 courriels à traiter, personne dessus » : faux dès que Camille en avait lu — le compte ne dit que ce que PERSONNE n'a touché. Ce que Camille a pris ou classé s'ajoute, en nombres. */
      courrier: co ? { prisParCamilleOuJustin: num(co.enCours), classesParCamille: num(co.classes) } : null,
      camille: rp ? { examinesAujourdhui: num(rp.examinesAujourdhui), classesAujourdhui: num(rp.classesAujourdhui), derniereReprise: rp.dernierePasse ? num(rp.dernierePasse.ilYAMin) : null } : null,
      plateforme: {
        incidentsOuverts: inc ? inc.ouverts : null, incidentsHauts: inc ? inc.haute : null, incidentsHautsSurs: inc ? inc.hauteSure : null, incidentsSansPersonne: inc ? inc.sansPersonne : null,
        alarmesOuvertes: mx ? num(mx.ouvertes) : null, alarmesCritiques: mx ? num(mx.critiques) : null,
      },
      equipe: { allumes: allumes.length, tachesEnCours: ch ? Object.fromEntries(allumes.filter(id => ch[id] > 0).map(id => [id, ch[id]])) : null, libres: ch ? allumes.filter(id => ch[id] === 0) : null },
      qualite: qa ? { courrielsEnvoyes: num(qa.courrielsEnvoyes), courrielsAReprendre: num(qa.courrielsAReprendre), agentsEnErreur: num(qa.agentsEnErreur) } : null,
    };
  }
  /* ⛔ Un incident venu des appareils rend le point URGENT (donc une notification) seulement s'il est corroboré par le serveur (`incidents-agents.js`) : le texte du point le dit quand même. */
  const urgent = f => f.plateforme.incidentsHautsSurs > 0 || f.plateforme.alarmesCritiques > 0 || f.attendJustin.rgpdEnRetard > 0 || f.attendJustin.validationPlusAncienneJours >= 6 || (f.attendJustin.rgpdProchaineJours !== null && f.attendJustin.rgpdProchaineJours <= 3);
  const rien = f => {
    const a = f.attendJustin, p = f.plateforme;
    return !(a.validations > 0 || a.rgpdOuvertes > 0 || a.contratsEnAttente > 0 || a.courrierATraiter > 0 || a.demandesClients > 0 || p.incidentsOuverts > 0 || p.alarmesOuvertes > 0
      || (f.equipe.tachesEnCours && Object.keys(f.equipe.tachesEnCours).length) || (f.qualite && f.qualite.courrielsAReprendre > 0) || (f.courrier && f.courrier.classesParCamille > 0));
  };
  /* Le texte du CODE : toujours juste, toujours disponible. */
  function texteDuCode(f) {
    const a = f.attendJustin, p = f.plateforme, e = f.equipe, q = f.qualite;
    const nb = (n, un, plus) => n + ' ' + O.pluriel(n, un, plus);
    const attend = [];
    if (a.validations > 0) attend.push(nb(a.validations, 'demande d’agent à valider', 'demandes d’agents à valider') + (a.validationPlusAncienneJours >= 2 ? ' (la plus ancienne : ' + a.validationPlusAncienneJours + ' jours)' : ''));
    if (a.rgpdOuvertes > 0) attend.push(nb(a.rgpdOuvertes, 'demande RGPD', 'demandes RGPD') + (a.rgpdEnRetard > 0 ? ' dont ' + a.rgpdEnRetard + ' en retard' : a.rgpdProchaineJours !== null ? ' (échéance dans ' + a.rgpdProchaineJours + ' jours)' : ''));
    if (a.contratsEnAttente > 0) attend.push(nb(a.contratsEnAttente, 'contrat en attente de signature', 'contrats en attente de signature'));
    if (a.courrierATraiter > 0) attend.push(nb(a.courrierATraiter, 'courriel à traiter', 'courriels à traiter'));
    if (a.demandesClients > 0) attend.push(nb(a.demandesClients, 'demande de client à traiter', 'demandes de clients à traiter'));
    const plateforme = [];
    if (p.incidentsOuverts > 0) plateforme.push(nb(p.incidentsOuverts, 'incident ouvert', 'incidents ouverts') + (p.incidentsHauts > 0 ? ', dont ' + p.incidentsHauts + ' de gravité haute' : ', aucun grave'));
    if (p.alarmesCritiques > 0) plateforme.push(nb(p.alarmesCritiques, 'alarme critique en cours', 'alarmes critiques en cours'));
    const charge = e.tachesEnCours ? Object.entries(e.tachesEnCours).map(([id, n]) => nomDe(id) + ' ' + nb(n, 'tâche', 'tâches')) : [];
    const lib = e.libres ? e.libres.map(nomDe) : [];
    let t = 'Bonjour Justin, voici le point de ce ' + f.jour + '.';
    t += attend.length ? ' Ce qui t’attend : ' + O.liste(attend) + '.' : ' Rien ne t’attend ce matin.';
    if (f.courrier && f.courrier.classesParCamille > 0) t += ' Camille a classé ' + nb(f.courrier.classesParCamille, 'courriel', 'courriels') + ' sans réponse à faire (publicités, messages automatiques, courriers de chez nous : ils restent dans le Courrier, rien n’est supprimé).';
    if (plateforme.length) t += ' Côté plateforme : ' + O.liste(plateforme) + '.';
    if (charge.length) t += ' Dans l’équipe : ' + O.liste(charge) + ' en cours' + (lib.length ? ' ; ' + O.liste(lib.slice(0, 4)) + (lib.length === 1 ? ' est libre' : ' sont libres') : '') + '.';
    if (q && q.courrielsAReprendre > 0) t += ' Inès a relevé ' + nb(q.courrielsAReprendre, 'courriel à reprendre', 'courriels à reprendre') + '.';
    return t;
  }
  /* Chaque nombre du texte écrit par le modèle doit être un nombre des faits (ou 1 à 3, qui s'écrivent aussi en lettres) : sinon le texte du code. */
  function nombresSains(texte, faits) {
    const permis = new Set((JSON.stringify(faits).match(/\d+/g) || []));
    for (const n of (String(texte).match(/\d+/g) || [])) if (!permis.has(n) && !['1', '2', '3'].includes(n)) return false;
    return true;
  }
  async function composer(f) {
    if (rien(f)) return { texte: 'Bonjour Justin, voici le point de ce ' + f.jour + '. Rien ne t’attend ce matin et la plateforme est calme.', modele: false };
    const code = texteDuCode(f);
    const jour = appelsDuJour();
    if (!cerveau || typeof cerveau.penser !== 'function' || jour.point >= APPELS_MAX.point) return { texte: code, modele: false };
    jour.point++; etat.sauver();
    const eq = equipe();
    const base = eq && typeof eq.systemDe === 'function' ? eq.systemDe(ID) : 'Tu es Victor, le chef d’orchestre de Team OP. Tu parles à Justin, le fondateur, que tu tutoies, en français, avec des phrases courtes.';
    const faits = fait(f);
    let r;
    try {
      r = await cerveau.penser(ID, base + '\n\nLE POINT DU MATIN. Tu écris à Justin, dans le fil « Équipe TeamOP », le point de ce matin. Tu n’as AUCUN outil ici : tu écris, c’est tout. Seuls les faits ci-dessous existent ; un fait « null » est une chose que tu n’as pas pu lire — tu le dis, tu ne devines pas. ' +
        'Dis d’abord ce qui attend Justin et ce qu’il a à décider, puis la plateforme si quelque chose cloche, puis qui est chargé et qui est libre. 500 caractères au plus, sans titre ni liste à puces, comme un collègue qui fait le point en arrivant. Ne propose jamais de décider à sa place de l’argent, d’un accès, d’un contrat ou d’une suppression.\n' +
        'Faits : ' + JSON.stringify(faits), [{ role: 'user', content: 'Écris le point du matin pour Justin.' }], { maxTokens: 700 });
    } catch (e) { r = null; }
    if (!r || !r.ok || !r.texte) return { texte: code, modele: false, cause: r && r.raison };
    const t = AC.raccourcir(masquer(r.texte));
    if (!nombresSains(t, faits)) { note('point du matin', { cible: 'texte', resultat: 'refuse', detail: 'un nombre du texte n’est pas dans les faits : texte du code' }); return { texte: code, modele: false, cause: 'nombres' }; }
    return { texte: t, modele: true };
  }
  async function pointDuMatin(o) {
    const now = maintenant(), p = O.parisParties(now), m = memoire();
    if (!m.points || typeof m.points !== 'object' || Array.isArray(m.points)) m.points = {};
    const forcer = !!(o && o.forcer);
    const cle = forcer ? 'manuel:' + now : p.date;
    let e = m.points[cle];
    if (e && (e.statut === 'fait' || e.statut === 'sans_objet' || e.statut === 'en_cours' || (e.essais || 0) >= ESSAIS_POINT)) return { saute: 'deja' };
    if (!e) {
      e = m.points[cle] = { ts: now, statut: 'en_cours', essais: 0 };
      /* DEUX familles, élaguées chacune pour elle-même : les points du matin (clé AAAA-MM-JJ, l'ordre des noms est celui des dates) et les points forcés par la Tour (« manuel:<ts> »). Élagués
         ensemble par nom de clé, « manuel:… » se rangeait APRÈS « 2026-10-23 » : quinze points forcés effaçaient la clé du jour, et le point du matin se redisait. Par date de pose, la clé du
         jour (plus ancienne que les forcés de l'après-midi) partait aussi — d'où deux familles. */
      const ts = k => (m.points[k] && m.points[k].ts) || 0;
      const manuels = Object.keys(m.points).filter(k => k.startsWith('manuel:')).sort((a, b) => ts(a) - ts(b));
      const jours = Object.keys(m.points).filter(k => !k.startsWith('manuel:')).sort();
      for (const k of manuels.slice(0, Math.max(0, manuels.length - POINTS_MANUELS_GARDES))) delete m.points[k];
      for (const k of jours.slice(0, Math.max(0, jours.length - POINTS_GARDES))) delete m.points[k];
      if (!etat.sauver()) { delete m.points[cle]; return { saute: 'memoire' }; }              // inscrit AVANT d'être dit, ou pas du tout
    }
    e.statut = 'en_cours'; e.essais = (e.essais || 0) + 1;
    try {
      const f = collecter();
      /* un week-end, il ne dérange que pour ce qui presse */
      if (!forcer && p.jourSemaine >= 6 && !urgent(f)) { e.statut = 'sans_objet'; etat.sauver(); return { saute: 'week_end' }; }
      if (!e.texte) { const c = await composer(f); e.texte = c.texte; e.modele = c.modele; e.urgent = urgent(f); etat.sauver(); }
      const d = parler('equipe', e.texte, 'info');
      let prive = { ok: true };
      if (dit(d) && e.urgent && !e.prive) { prive = parler(ID, 'Justin, avant tout ce matin : ' + e.texte.replace(/^Bonjour Justin, voici le point de ce \S+\.\s*/, ''), 'important'); if (dit(prive)) e.prive = true; }
      if (dit(d)) { e.statut = 'fait'; etat.sauver(); note('point du matin', { cible: 'équipe', resultat: 'ok', detail: e.modele ? 'rédigé avec Claude' : 'texte du code' }); return { dit: true, modele: !!e.modele }; }
      e.statut = 'a_redire'; etat.sauver();
      note('point du matin', { cible: 'équipe', resultat: 'refuse', detail: d.raison });
      return { saute: d.raison };
    } catch (x) {
      e.statut = 'a_redire'; etat.sauver();
      note('point du matin', { cible: 'équipe', resultat: 'erreur', detail: String((x && x.message) || x).slice(0, 100) });
      return { saute: 'erreur' };
    }
  }
  /* « est-ce l'heure ? » — chaque minute : à partir de 8 h (Paris) et pas encore dit aujourd'hui. */
  async function tic() {
    if (!agents.peutAgir(ID).ok) return { saute: agents.peutAgir(ID).raison };
    if (etat.illisible()) return { saute: 'memoire_illisible' };
    const p = O.parisParties(maintenant());
    if (!(p.heure >= POINT.heure && p.heure < POINT.limite)) return { saute: 'pas_l_heure' };
    return pointDuMatin();
  }

  /* ═══ 2. L'ÉQUILIBRAGE ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  const signature = x => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 16);
  async function equilibrer() {
    if (!agents.peutAgir(ID).ok) return { saute: agents.peutAgir(ID).raison };
    if (etat.illisible()) return { saute: 'memoire_illisible' };
    const now = maintenant(), m = memoire();
    if (!m.equilibre || typeof m.equilibre !== 'object') m.equilibre = { sig: '', ts: 0 };
    if (now - (m.equilibre.ts || 0) < EQUILIBRE_MS) return { saute: 'trop_tot' };
    let ch = null; try { ch = agents.charge(); } catch (e) { ch = null; }
    if (!ch) return { saute: 'charge_illisible' };                         // on ne sait pas : on ne répartit rien
    const autres = REG.map(a => a.id).filter(id => id !== ID);
    const surcharges = autres.filter(id => ch[id] >= CHARGE_MIN);
    const libres = autres.filter(id => ch[id] === 0 && !SANS_CONSIGNE_LIBRE.includes(id) && agents.peutAgir(id).ok);
    if (!surcharges.length || !libres.length) { m.equilibre.ts = now; m.equilibre.sig = ''; return { saute: 'rien_a_equilibrer' }; }
    const taches = [];
    for (const id of surcharges) { let l = []; try { l = agents.tachesDe(id); } catch (e) { l = []; } for (const t of l) if (t.type === 'consigne' && taches.length < 20) taches.push({ id: t.id, de: id, texte: propre(t.texte, TEXTE_TACHE) }); }
    if (!taches.length) { m.equilibre.ts = now; return { saute: 'pas_de_consigne' }; }
    const sig = signature([ch, taches.map(t => t.id), libres]);
    m.equilibre.ts = now;
    if (m.equilibre.sig === sig) return { saute: 'deja_vu' };               // même état que la dernière fois : le modèle a déjà jugé
    m.equilibre.sig = sig;
    const jour = appelsDuJour();
    if (jour.equilibre >= APPELS_MAX.equilibre || !cerveau || typeof cerveau.penser !== 'function') { etat.sauver(); return { saute: 'plafond' }; }
    jour.equilibre++; etat.sauver();
    const eq = equipe();
    const base = eq && typeof eq.systemDe === 'function' ? eq.systemDe(ID) : 'Tu es Victor, le chef d’orchestre de Team OP.';
    const outils = [{ name: 'redistribuer', description: 'Confier UNE des tâches d’un collègue chargé à un collègue libre. Dis la raison en une phrase. Si tu juges qu’il ne faut rien bouger, n’appelle pas cet outil et réponds RIEN.',
      input_schema: { type: 'object', properties: { tache: { type: 'string', enum: taches.map(t => t.id) }, vers: { type: 'string', enum: libres }, raison: { type: 'string' } }, required: ['tache', 'vers', 'raison'], additionalProperties: false } }];
    const bloc = '\n\nRÉPARTITION DU TRAVAIL. Justin : « si une personne est occupée et qu’une autre ne fait rien et peut gérer, pour ne pas la surcharger de travail, c’est bien ». ' +
      'Des collègues ont trois tâches en cours ou plus, d’autres n’en ont aucune. Tu décides s’il faut en confier UNE à un collègue libre qui peut vraiment la gérer d’après son rôle — sinon tu réponds RIEN, c’est une réponse normale. ' +
      'Charge (tâches en cours) : ' + JSON.stringify(fait(Object.fromEntries(autres.map(id => [id, ch[id]])))) + '\nCollègues libres : ' + libres.join(', ') + '\nTâches des collègues chargés :\n' +
      taches.map(t => '- [' + t.id + '] ' + t.de + ' : « ' + t.texte + ' »').join('\n') + '\nTu ne passes jamais de travail à Hugo ni à Margaux ; l’outil refuse de toute façon.';
    let r;
    try { r = await cerveau.penser(ID, base + bloc, [{ role: 'user', content: 'Faut-il redistribuer une tâche maintenant ?' }], { outils, maxTokens: 800 }); } catch (e) { r = null; }
    if (!r || !r.ok) { etat.sauver(); return { saute: (r && r.raison) || 'erreur_api' }; }
    const a = (Array.isArray(r.actions) ? r.actions : []).find(x => x.nom === 'redistribuer');
    if (!a) { note('équilibrage', { cible: 'charge', resultat: 'ok', detail: 'rien à bouger' }); etat.sauver(); return { rien: true }; }
    const tache = typeof a.entree.tache === 'string' ? a.entree.tache : '', vers = typeof a.entree.vers === 'string' ? a.entree.vers : '';
    const t = taches.find(x => x.id === tache);
    if (!t || !libres.includes(vers)) { note('équilibrage', { cible: 'charge', resultat: 'refuse', detail: 'choix hors liste' }); return { saute: 'hors_liste' }; }
    const res = agents.passerConsigne(ID, tache, vers);
    if (!res.ok) { note('équilibrage', { cible: t.de + ' → ' + vers, resultat: 'refuse', detail: res.raison }); return { saute: res.raison }; }
    const raison = propre(a.entree.raison, 150).replace(/[.\s]+$/, '');
    const d = parler('equipe', AC.raccourcir('J’ai confié « ' + t.texte.slice(0, 90) + ' » de ' + nomDe(t.de) + ' à @' + nomDe(vers) + ' : ' + nomDe(t.de) + ' avait ' + ch[t.de] + ' tâches en cours, ' + nomDe(vers) + ' était libre' + (raison ? '. ' + raison : '') + '.'), 'info');
    note('équilibrage', { cible: t.de + ' → ' + vers, resultat: 'ok', detail: t.texte.slice(0, 80) });
    return { redistribue: true, de: t.de, vers, dit: dit(d) };
  }

  /* ═══ 3. L'ARBITRAGE ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  /* La décision elle-même — le même chemin pour l'outil `arbitrer` (une conversation) et pour la détection d'une chaîne coupée. `c` : { fil, prof }. */
  function arbitrer(entree, c) {
    const e = entree && typeof entree === 'object' ? entree : {};
    c = c || {};
    if (!agents.peutAgir(ID).ok) return { ok: false, raison: 'arret' };
    if (etat.illisible()) return { ok: false, raison: 'memoire_illisible' };
    const entre = Array.isArray(e.entre) ? e.entre.filter(x => typeof x === 'string' && IDS.has(x) && x !== ID) : [];
    const deux = [...new Set(entre)];
    if (deux.length !== 2) return { ok: false, raison: 'deux_agents' };
    const sansPoint = t => t.replace(/[.\s]+$/, '');
    const decision = sansPoint(propre(e.decision, DECISION_MAX)), raison = sansPoint(propre(e.raison, RAISON_MAX));
    const question = propre(e.pour_justin, DECISION_MAX);
    if (!decision) return { ok: false, raison: 'decision' };
    const fil = typeof c.fil === 'string' && conversations.filValide(c.fil) && conversations.estMembre(ID, c.fil) ? c.fil : 'equipe';
    /* ce qui dépasse la charte n'est pas tranché ici, quoi qu'en dise le modèle */
    const horsCharte = !!question || HORS_CHARTE.test(decision + ' ' + raison);
    const m = memoire(); if (!Array.isArray(m.decisions)) m.decisions = [];
    const d = { id: 'd' + crypto.randomBytes(4).toString('hex'), ts: maintenant(), entre: deux, fil, decision, raison, statut: horsCharte ? 'attend_justin' : 'decidee' };
    m.decisions.push(d);
    if (m.decisions.length > DECISIONS_MAX) m.decisions = m.decisions.slice(-DECISIONS_MAX);
    if (!etat.sauver()) { m.decisions.pop(); return { ok: false, raison: 'ecriture' }; }
    const cites = '@' + nomDe(deux[0]) + ' @' + nomDe(deux[1]);
    /* ⛔ UNE DÉCISION QUI N'A PAS ÉTÉ DITE N'EST PAS UNE DÉCISION, et une question qui n'est pas partie n'a pas été posée : si le message est refusé (plafond d'heure, fil illisible), la décision est RETIRÉE de la
       mémoire et l'appelant en est informé — jamais une décision écrite que personne n'a lue, ni un patron qu'on croit avoir interrogé. */
    const retirer = () => { const i = m.decisions.indexOf(d); if (i >= 0) m.decisions.splice(i, 1); etat.sauver(); };
    if (horsCharte) {
      const q = parler(ID, AC.raccourcir('Justin, un désaccord entre ' + nomDe(deux[0]) + ' et ' + nomDe(deux[1]) + ' dépasse ma charte. ' + (question || decision) + (raison ? ' — ' + raison : '')), 'important');
      if (!dit(q)) { retirer(); note('arbitrage', { cible: deux.join(' / '), resultat: 'refuse', detail: 'question à Justin non partie : ' + q.raison }); return { ok: false, raison: q.raison }; }
      const envoi = parler(fil, AC.raccourcir(cites + ', ça touche à ce qui est à Justin (argent, contrat, accès, données) : je ne tranche pas seul, je lui pose la question. En attendant, chacun garde sa position.'), 'info', c.prof);
      note('arbitrage', { cible: deux.join(' / '), resultat: 'propose', detail: 'question à Justin' });
      return { ok: true, attendJustin: true, id: d.id, dit: dit(envoi) };
    }
    const envoi = parler(fil, AC.raccourcir('Décision, ' + cites + ' : ' + decision + (raison ? ' — ' + raison : '') + '.'), 'info', c.prof);
    if (!dit(envoi)) { retirer(); note('arbitrage', { cible: deux.join(' / '), resultat: 'refuse', detail: 'décision non dite : ' + envoi.raison }); return { ok: false, raison: envoi.raison }; }
    note('arbitrage', { cible: deux.join(' / '), resultat: 'ok', detail: decision.slice(0, 100) });
    return { ok: true, id: d.id, dit: true };
  }

  /* Une chaîne que l'anti-boucle a coupée entre deux agents, sans que personne ait tranché : Victor regarde l'échange (des messages d'agents) et dit s'il y a un désaccord. */
  async function arbitrageur() {
    if (!agents.peutAgir(ID).ok) return { saute: agents.peutAgir(ID).raison };
    if (etat.illisible()) return { saute: 'memoire_illisible' };
    const now = maintenant(), m = memoire();
    if (!m.arbitrage || typeof m.arbitrage !== 'object') m.arbitrage = { ts: 0, vus: {} };
    if (now - (m.arbitrage.ts || 0) < ARBITRAGE_MS) return { saute: 'trop_tot' };
    m.arbitrage.ts = now;
    for (const k of Object.keys(m.arbitrage.vus)) if (now - m.arbitrage.vus[k] > 3 * 86400000) delete m.arbitrage.vus[k];
    for (const fil of ['equipe', 'clients', 'plateforme']) {
      let l = []; try { l = conversations.lire(fil, 12).filter(x => x.de !== 'systeme'); } catch (e) { l = []; }
      const dernier = l[l.length - 1];
      if (!dernier || !IDS.has(dernier.de) || dernier.de === ID || !(dernier.prof >= PROF_COUPE) || now - dernier.ts < COUPE_ATTENTE_MS || m.arbitrage.vus[dernier.id]) continue;
      const cible = (dernier.mentions || []).find(id => IDS.has(id) && id !== dernier.de && id !== ID);
      if (!cible) continue;
      const echange = l.slice(-4);
      const acteurs = new Set(echange.map(x => x.de));
      if (acteurs.has('justin') || acteurs.has(ID) || [...acteurs].some(x => x !== dernier.de && x !== cible)) continue;          // un échange à DEUX agents, sans Justin ni Victor
      m.arbitrage.vus[dernier.id] = now;
      const jour = appelsDuJour();
      if (jour.arbitrage >= APPELS_MAX.arbitrage || !cerveau || typeof cerveau.penser !== 'function') { etat.sauver(); return { saute: 'plafond' }; }
      jour.arbitrage++; etat.sauver();
      const eq = equipe();
      const base = eq && typeof eq.systemDe === 'function' ? eq.systemDe(ID) : 'Tu es Victor, le chef d’orchestre de Team OP.';
      const paire = [dernier.de, cible];
      const outils = [{ name: 'arbitrer', description: 'Trancher un désaccord entre les deux collègues : ta décision en une phrase, la raison. Si la question dépasse la charte (argent, contrat, accès, données), remplis pour_justin avec la question à lui poser.',
        input_schema: { type: 'object', properties: { entre: { type: 'array', items: { type: 'string', enum: paire }, minItems: 2, maxItems: 2 }, decision: { type: 'string' }, raison: { type: 'string' }, pour_justin: { type: 'string' } }, required: ['entre', 'decision', 'raison'], additionalProperties: false } }];
      let r;
      try {
        r = await cerveau.penser(ID, base + '\n\nARBITRAGE. Deux collègues se sont répondu jusqu’à la limite anti-boucle de la messagerie, sans que personne ne tranche. Lis l’échange : s’ils ne sont PAS d’accord et qu’il faut décider, appelle arbitrer ; s’ils sont d’accord, ou si ce n’est qu’une conversation, réponds RAS. ' +
          'Tu ne décides jamais de l’argent, d’un contrat, d’un accès ni d’une suppression de données : pour cela tu remplis pour_justin.',
          [{ role: 'user', content: 'L’échange, dans le fil « ' + conversations.nom(fil) + ' » :\n' + echange.map(x => '[' + nomDe(x.de) + '] ' + propre(x.texte, 400)).join('\n') }], { outils, maxTokens: 900 });
      } catch (e) { r = null; }
      if (!r || !r.ok) { return { saute: (r && r.raison) || 'erreur_api' }; }
      const a = (Array.isArray(r.actions) ? r.actions : []).find(x => x.nom === 'arbitrer');
      if (!a) { note('arbitrage', { cible: paire.join(' / '), resultat: 'ok', detail: 'RAS : pas de désaccord' }); return { ras: true }; }
      const res = arbitrer(a.entree, { fil, prof: 1 });
      return Object.assign({ arbitrage: true }, res);
    }
    etat.sauver();
    return { saute: 'rien_a_arbitrer' };
  }

  async function passer() {
    const out = {};
    try {
      out.point = await tic();
      out.equilibre = await equilibrer();
      out.arbitrage = await arbitrageur();
    } catch (e) { note('passage', { cible: 'équipe', resultat: 'erreur', detail: String((e && e.message) || e).slice(0, 100) }); }
    return out;
  }

  const resume = () => {
    const m = memoire();
    const pts = m.points && typeof m.points === 'object' ? Object.entries(m.points).sort() : [];
    const der = pts.length ? pts[pts.length - 1] : null;
    return { dernierPoint: der ? { jour: der[0].startsWith('manuel') ? '' : der[0], ts: der[1].ts, statut: der[1].statut, modele: !!der[1].modele } : null, illisible: etat.illisible(),
      decisions: (Array.isArray(m.decisions) ? m.decisions : []).slice(-5).reverse().map(d => ({ id: d.id, ts: d.ts, entre: d.entre, decision: d.decision, raison: d.raison, statut: d.statut })),
      appelsAujourdhui: m.appels && m.appels.j === O.jourParis(maintenant()) ? { equilibre: m.appels.equilibre, arbitrage: m.appels.arbitrage, point: m.appels.point } : { equilibre: 0, arbitrage: 0, point: 0 } };
  };
  return { tic, passer, pointDuMatin, equilibrer, arbitrageur, arbitrer, etat: resume, collecter, texteDuCode, fait, nombresSains };
};
module.exports.HORS_CHARTE = HORS_CHARTE;
module.exports.POINT = POINT;
module.exports.CHARGE_MIN = CHARGE_MIN;

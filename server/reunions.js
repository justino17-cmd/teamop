/* LES RÉUNIONS DE L'ÉQUIPE (23 octobre 2026) — le lundi matin les objectifs, le vendredi soir le bilan. Cahier : `design/EQUIPE-AGENTS.md` §7.
 *
 * Justin : « Que ça soit le lundi matin et le vendredi soir. Le lundi ils essayent d'améliorer ce qu'ils peuvent faire pour la semaine, et le
 * vendredi débrief, savoir s'ils ont atteint leurs objectifs. Je veux une vraie équipe d'entreprise. » Puis : « 1 h par réunion, et 18 h c'est bien. »
 *
 * ⛔ L'HEURE EST CELLE DE PARIS, CALCULÉE PAR `Intl` (Europe/Paris), JAMAIS PAR UN DÉCALAGE ÉCRIT EN DUR. Le serveur tourne en UTC : lundi 9 h, c'est
 *    07 h UTC en été et 08 h UTC en hiver, et le dimanche 25 octobre 2026 on passe à l'heure d'hiver — un « +2 » figé ferait tenir la réunion du lundi
 *    26 à 10 h. Les bancs jouent les deux saisons (`test-2884`).
 * ⛔ JAMAIS DEUX FOIS LA MÊME RÉUNION, MÊME APRÈS UN REDÉMARRAGE. Une réunion est INSCRITE (`agents-reunions.json`) AVANT de commencer, sous une clé
 *    « type:jour » : la vérification de chaque minute la retrouve, et un serveur qui revient dans le créneau de rattrapage (lundi jusqu'à 12 h, vendredi
 *    jusqu'à 23 h) la tient une fois, pas deux. Une réunion que le redémarrage a coupée en route est marquée « interrompue » et NE SE REJOUE PAS toute
 *    seule (elle aurait doublé ce que les agents ont déjà dit) : Justin la relance d'un geste. Un fichier d'état illisible = AUCUNE réunion, et rien ne s'écrit
 *    par-dessus (comme `agents.js`) : sans mémoire de ce qui a eu lieu, on recommencerait à chaque minute.
 * ⛔ UNE RÉPONSE APRÈS L'AUTRE (`await`), jamais en parallèle : chacun voit ce que les précédents ont dit, et le budget ne part pas en rafale. La réunion a un
 *    plafond (une ouverture, un tour de table, au plus `DISCUSSION_MAX` prises de parole en discussion, une conclusion) et s'arrête à la fin de l'heure.
 * ⛔ CE QUE LES AGENTS FONT DANS UNE RÉUNION TIENT EN TROIS OUTILS FERMÉS : `fixer_objectifs` (lundi), `juger_objectif` et `ajouter_lecon` (vendredi) — pas les outils de
 *    la messagerie (prendre, passer…). Chaque appel est validé ICI (forme, longueur, adresses et numéros masqués, au plus 20 leçons par agent, au plus 2 par
 *    bilan). Rien d'une personne n'entre dans ce que Claude lit : le fil de la réunion (Justin, les agents) et des FAITS fermés, relevés du journal des agents.
 * ⛔ LES LEÇONS ET LES OBJECTIFS ENTRENT DANS LES CONSIGNES (`memoire`) — c'est ce qui fait progresser un agent d'une semaine à l'autre. Mais ils ne changent
 *    JAMAIS ses limites : le texte le dit, et les outils fermés de la messagerie, eux, ne bougent pas. Justin les voit et peut retirer une leçon.
 * ⛔ LES ÉCRITURES SONT LES SIENNES : trois fichiers, chacun écrit par un temporaire puis un renommage ; illisible au démarrage = refus 503 et rien d'écrit par-dessus.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AC = require('./agent-conversation');
const { fermer, sansTel, ADRESSE } = AC;

const F_REUNIONS = 'agents-reunions.json', F_OBJECTIFS = 'agents-objectifs.json', F_LECONS = 'agents-lecons.json';
const FUSEAU = 'Europe/Paris';
const FIL = 'reunions';
const HEURE_MS = 3600000;
/* Les deux créneaux. `jour` : 1 = lundi … 7 = dimanche. `limite` : heure de Paris avant laquelle on RATTRAPE une réunion manquée (strictement avant). */
const CRENEAUX = {
  objectifs: { jour: 1, heure: 9, limite: 12, nom: 'lundi', titre: 'Réunion du lundi', but: 'objectifs de la semaine' },
  bilan: { jour: 5, heure: 18, limite: 23, nom: 'vendredi', titre: 'Réunion du vendredi', but: 'bilan de la semaine' },
};
const TYPES = Object.keys(CRENEAUX);
const JOURS_FR = ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const MOIS_FR = ['', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const JOURS_EN = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

const REUNIONS_MAX = 40, SEMAINES_MAX = 12, LECONS_MAX = 20, LECONS_PAR_BILAN = 2, OBJECTIFS_MAX = 3;
const DISCUSSION_MAX = 12, TOURS_PAR_AGENT = 2;
/* ⛔ LES REDITES NE SE PUBLIENT PAS (examen du 24 octobre 2026, scénario 9 : « formules répétées type “je confirme mes objectifs” et “rien à ajouter” d'un agent
   à l'autre »). Au tour de table, Camille avait CITÉ Margaux, Jules et Hugo pour dire à qui elle route le travail ; la discussion les a fait reparler, et chacun a
   « confirmé ses objectifs » — sept redites. La consigne disait déjà « si tu n'as rien à ajouter, RAS » ; elle ne suffisait pas. En DISCUSSION (pas au tour de
   table, où dire ses objectifs EST la parole attendue), une phrase qui ne fait que reconfirmer ses objectifs ou dire qu'on n'a rien à ajouter est retirée avant
   la publication ; s'il ne reste rien, c'est un « RAS » (rien n'est écrit, et les @ de la phrase retirée ne réveillent personne). Pur, rejouable au banc. */
/* (relecture du gardien) seule la FORMULE part : « je confirme mes objectifs, et je m'engage à livrer vendredi » garde « Je m'engage à livrer vendredi » ;
   « rien à signaler sur le planning, en revanche la livraison a deux jours de retard » reste entière (la formule n'y est que le début d'une autre phrase) ;
   « je retiens les objectifs de Léa : 20 inscriptions » aussi (ce sont ceux d'une autre, et un chiffre). */
const REDITE_TETE = /^(?:(?:confirm[ée]e?|ok|parfait|d['’]accord|entendu|not[ée]|[çc]a marche)\s*[,!]?\s*)?(?:je|on)\s+(?:confirme|garde|maintiens|conserve)\s+(?:donc\s+|bien\s+)?(?:mes|ces)\s+(?:(?:deux|trois|quatre)\s+)?objectifs(?:\s+(?:de la semaine|pour la semaine|pour cette semaine|tels que (?:pos[ée]s|fix[ée]s|dits)|tels quels|comme pr[ée]vu))*/i;
const REDITE_RIEN = /^(?:je n['’]ai\s+)?rien\s+(?:d['’]autre\s+|de plus\s+)?(?:à|a)\s+(?:ajouter|signaler)(?:\s+(?:de mon c[ôo]t[ée]|pour moi|pour l['’]instant|sur les autres dossiers))*/i;
function sansRedites(texte) {
  const gardees = [];
  for (const p of String(texte || '').split(/(?<=[.!?])\s+/)) {
    const q = p.trim(), m = REDITE_TETE.exec(q) || REDITE_RIEN.exec(q);
    if (!m) { if (q) gardees.push(q); continue; }
    const reste = q.slice(m[0].length);
    if (/^\s*[.!]?\s*$/.test(reste)) continue;                                        // la phrase EST la redite
    const lien = /^\s*[,:;]\s*(?:(?:et|mais|par contre|en revanche)\s+)?/i.exec(reste);
    if (!lien) { gardees.push(q); continue; }                                            // la formule ouvre une autre phrase : tout reste
    const r = reste.slice(lien[0].length).trim();
    if (r) gardees.push(r.charAt(0).toUpperCase() + r.slice(1));
  }
  const t = gardees.join(' ').trim();
  return /[\p{L}\p{N}]/u.test(t.replace(/@[\p{L}\p{N}_]+/gu, '')) ? t : '';
}
const PAROLE_MAX = 600, COMPTE_RENDU_MAX = 1500, OBJECTIF_MAX = 160, LECON_MAX = 200, POURQUOI_MAX = 200;
const RATTRAPAGE_COURT_MS = 20 * 60000;   // une réunion rattrapée après son heure garde au moins vingt minutes de discussion

/* ── L'heure de Paris : pur, rejouable au banc ───────────────────────────────────────────────────────────────────────────────────── */
const FMT = new Intl.DateTimeFormat('en-US', { timeZone: FUSEAU, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', weekday: 'short' });
const pad = n => (n < 10 ? '0' : '') + n;
function parisParties(ts) {
  const p = {};
  for (const x of FMT.formatToParts(ts)) p[x.type] = x.value;
  const annee = +p.year, mois = +p.month, jour = +p.day;
  return { annee, mois, jour, heure: (+p.hour) % 24, minute: +p.minute, jourSemaine: JOURS_EN[p.weekday] || 0, date: annee + '-' + pad(mois) + '-' + pad(jour) };
}
/* L'écart entre l'heure de Paris et l'UTC à cet instant (3 600 000 l'hiver, 7 200 000 l'été), lu sur la minute pleine. */
function decalageParis(ts) {
  const m = Math.floor(ts / 60000) * 60000, p = parisParties(m);
  return Date.UTC(p.annee, p.mois - 1, p.jour, p.heure, p.minute) - m;
}
/* L'instant (UTC) où il est `heure:minute` à Paris ce jour-là. Deux passes : l'écart se lit à l'instant visé, pas à l'instant nominal (la veille d'un changement d'heure). */
function tsParis(annee, mois, jour, heure, minute) {
  const nominal = Date.UTC(annee, mois - 1, jour, heure || 0, minute || 0);
  const premier = nominal - decalageParis(nominal);
  return nominal - decalageParis(premier);
}
/* La semaine ISO d'un jour civil : « 2026-W44 ». */
function semaineIso(annee, mois, jour) {
  const d = new Date(Date.UTC(annee, mois - 1, jour));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3);   // le jeudi de la semaine : c'est lui qui donne l'année ISO
  const j4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const sem = 1 + Math.round(((d - j4) / 86400000 - 3 + ((j4.getUTCDay() + 6) % 7)) / 7);
  return d.getUTCFullYear() + '-W' + pad(sem);
}
const jourPlus = (p, k) => { const d = new Date(Date.UTC(p.annee, p.mois - 1, p.jour + k)); return { annee: d.getUTCFullYear(), mois: d.getUTCMonth() + 1, jour: d.getUTCDate(), jourSemaine: ((d.getUTCDay() + 6) % 7) + 1 }; };
const semaineDe = ts => { const p = parisParties(ts); return semaineIso(p.annee, p.mois, p.jour); };
const semaineAvant = ts => { const p = parisParties(ts), j = jourPlus(p, -7); return semaineIso(j.annee, j.mois, j.jour); };
/* Le lundi 00 h (Paris) de la semaine de `ts`, `avant` semaines plus tôt, en instant UTC. ⛔ Reculer de 7 × 24 h en millisecondes se trompe d'une heure quand un changement
   d'heure tombe entre les deux (lundi 26 octobre − 7 jours donnerait 01 h le 19, pas minuit) : on recule en JOURS CIVILS, puis on demande l'instant à Paris. */
function lundiMinuit(ts, avant) { const p = parisParties(ts), j = jourPlus(p, 1 - p.jourSemaine - 7 * (avant || 0)); return tsParis(j.annee, j.mois, j.jour, 0, 0); }
const heureLib = (h, m) => h + ' h' + (m ? ' ' + pad(m) : '');
const libelleCreneau = ts => { const p = parisParties(ts); return JOURS_FR[p.jourSemaine] + ' ' + p.jour + ' ' + MOIS_FR[p.mois] + ', ' + heureLib(p.heure, p.minute); };
const jusquaLib = ts => { const p = parisParties(ts); return heureLib(p.heure, p.minute); };

/* Quelle réunion PLANIFIÉE est due à cet instant ? `null` hors créneau. Le rattrapage est ici : de l'heure dite à `limite` (exclue). */
function dueA(ts) {
  const p = parisParties(ts);
  for (const type of TYPES) {
    const c = CRENEAUX[type];
    if (p.jourSemaine === c.jour && p.heure >= c.heure && p.heure < c.limite) return { type, cle: type + ':' + p.date, date: p.date, debut: tsParis(p.annee, p.mois, p.jour, c.heure, 0) };
  }
  return null;
}
/* Le prochain créneau STRICTEMENT après `ts` : { type, ts, libelle }. */
function prochaineApres(ts) {
  const p = parisParties(ts);
  let meilleur = null;
  for (let k = 0; k <= 8; k++) {
    const j = jourPlus(p, k);
    for (const type of TYPES) {
      const c = CRENEAUX[type];
      if (c.jour !== j.jourSemaine) continue;
      const t = tsParis(j.annee, j.mois, j.jour, c.heure, 0);
      if (t > ts && (!meilleur || t < meilleur.ts)) meilleur = { type, ts: t };
    }
  }
  return meilleur && { type: meilleur.type, ts: meilleur.ts, libelle: libelleCreneau(meilleur.ts) };
}

/* ── les mots et les formes ── */
const CAUSES = {
  pas_de_cle: 'la clé des agents n’est pas posée', budget_illisible: 'le budget des agents est illisible', plafond_total: 'le budget des agents est atteint',
  plafond_agent: 'son budget du mois est atteint', erreur_api: 'Claude ne répond pas', trop_long: 'sa réponse dépassait la longueur permise', vide: 'sa réponse était vide',
  arret: 'il est à l’arrêt', pause: 'les agents sont en pause', etat_illisible: 'l’état des agents est illisible', requete: 'requête refusée',
  temps: 'l’heure de la réunion était finie', trop_de_messages: 'il a atteint son plafond de messages', trop_de_messages_fil: 'le fil a atteint son plafond de messages', doublon: 'il a répété un message',
};
const GLOBALES = ['pas_de_cle', 'budget_illisible', 'plafond_total', 'pause', 'etat_illisible'];   // une cause qui vaut pour TOUS : inutile d'essayer les suivants
const STATUTS_BILAN = ['atteint', 'partiel', 'non'];
const ID_LECON = /^[a-f0-9]{6,16}$/;
const ESTUN_MAIL = 'mail envoyé';   // l'action que noteront les agents qui enverront seuls : tant qu'aucun ne le fait, le compteur dit 0 — et c'est vrai
const RAS = /^\s*RAS\b[\s.!]*$/i;

module.exports = function monterReunions(app, ctx) {
  const { DATA_DIR, monPatronStrict, agents, conversations, cerveau } = ctx;
  const maintenant = typeof ctx.maintenant === 'function' ? ctx.maintenant : () => Date.now();
  const pousse = typeof ctx.pousseNotif === 'function' ? ctx.pousseNotif : null;
  const faitsExt = ctx.faits && typeof ctx.faits === 'object' ? ctx.faits : {};
  const equipe = () => (typeof ctx.equipe === 'function' ? ctx.equipe() : ctx.equipe) || null;
  /* ⛔ Les agents lisent ce texte : adresses ET numéros masqués (le masque de la conversation, pas celui du journal). */
  const masquer = t => sansTel(String(t == null ? '' : t).replace(ADRESSE, '(adresse)'));
  const propre = (t, n) => masquer(String(t == null ? '' : t).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/[{}]/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, n);
  const court = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
  /* Couper à une fin de phrase (sinon au dernier mot) plutôt qu'en plein mot : `conversations.parler` couperait là où il tombe. */
  function couper(t, n) {
    t = String(t || '').replace(/\s+/g, ' ').trim();
    if (t.length <= n) return t;
    const tete = t.slice(0, n), fin = Math.max(tete.lastIndexOf('. '), tete.lastIndexOf('! '), tete.lastIndexOf('? '));
    if (fin >= n / 3) return tete.slice(0, fin + 1);
    const mot = tete.lastIndexOf(' ');
    return (mot >= n / 3 ? tete.slice(0, mot) : tete.slice(0, n - 1)) + '…';
  }
  const registre = new Map(agents.AGENTS.map(a => [a.id, a]));
  const nomDe = id => id === 'justin' ? 'Justin' : (registre.get(id) || {}).nom || id;
  /* L'ordre du tour de table : le registre, sans Victor (il ouvre et conclut) ni Inès (elle passe en dernier, avec la qualité). */
  const ORDRE = agents.AGENTS.map(a => a.id).filter(id => id !== 'victor' && id !== 'ines');

  /* ── le rangement : trois fichiers, jamais écrits par-dessus un fichier qu'on n'a pas su lire ── */
  const illisibles = new Set();
  function charger(nom, defaut, forme) {
    let brut;
    try { brut = fs.readFileSync(path.join(DATA_DIR, nom), 'utf8'); }
    catch (e) { if (e && e.code === 'ENOENT') return defaut; illisibles.add(nom); return defaut; }
    try { const j = JSON.parse(brut); if (!forme(j)) throw new Error('forme'); return j; }
    catch (e) { illisibles.add(nom); return defaut; }
  }
  function ecrire(nom, valeur) {
    if (illisibles.has(nom)) { console.error('⛔ ' + nom + ' NON réécrit : il était illisible au démarrage — le réparer, puis redémarrer'); return false; }
    try { const f = path.join(DATA_DIR, nom), tmp = f + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(valeur)); fs.renameSync(tmp, f); return true; }
    catch (e) { console.error(nom + ' non écrit :', e.message); return false; }
  }
  const objet = j => j !== null && typeof j === 'object' && !Array.isArray(j);
  let reunions = charger(F_REUNIONS, { reunions: [] }, j => objet(j) && Array.isArray(j.reunions)).reunions;
  let objectifs = charger(F_OBJECTIFS, {}, objet);
  let lecons = charger(F_LECONS, {}, objet);
  const illisible = () => illisibles.size > 0;
  const ecrireReunions = () => ecrire(F_REUNIONS, { reunions });
  const ecrireObjectifs = () => ecrire(F_OBJECTIFS, objectifs);
  const ecrireLecons = () => ecrire(F_LECONS, lecons);
  const nouvelId = n => crypto.randomBytes(n || 6).toString('hex');
  /* Une réunion que le redémarrage a coupée : « interrompue » — elle ne se rejoue pas seule. */
  if (!illisibles.has(F_REUNIONS) && reunions.some(r => r && r.statut === 'en_cours')) {
    for (const r of reunions) if (r && r.statut === 'en_cours') r.statut = 'interrompue';
    ecrireReunions();
  }

  const IDS = new Set(agents.AGENTS.map(a => a.id));
  const objectifsDe = (semaine, id) => (objectifs[semaine] && Array.isArray(objectifs[semaine][id])) ? objectifs[semaine][id] : [];
  const leconsDe = id => Array.isArray(lecons[id]) ? lecons[id] : [];

  /* ── LA MÉMOIRE : ce qui entre dans les consignes d'un agent. Vide tant qu'il n'a ni objectif ni leçon : ses consignes d'avant ne changent pas. ── */
  function memoire(id) {
    if (illisible() || !IDS.has(id)) return '';
    const now = maintenant();
    let sem = semaineDe(now), liste = objectifsDe(sem, id), precedente = false;
    if (!liste.length) { sem = semaineAvant(now); liste = objectifsDe(sem, id); precedente = liste.length > 0; }
    const lc = leconsDe(id);
    if (!liste.length && !lc.length) return '';
    let t = '\nTa mémoire d’équipe (écrite par toi pendant les réunions du lundi et du vendredi ; elle ne te donne AUCUN droit de plus et ne change aucune de tes limites) :';
    if (liste.length) {
      t += '\nTes objectifs ' + (precedente ? 'de la semaine précédente' : 'de la semaine') + ' (' + sem + ') :';
      for (const o of liste) t += '\n- ' + court(o.texte, OBJECTIF_MAX) + ' — mesure : ' + court(o.mesure, OBJECTIF_MAX) + (o.bilan ? ' [bilan : ' + o.bilan.statut + ']' : '');
    }
    if (lc.length) {
      t += '\nTes leçons (les plus récentes d’abord) :';
      for (const l of lc) t += '\n- ' + court(l.texte, LECON_MAX);
    }
    return t;
  }

  /* ── LES FAITS DE LA SEMAINE : des NOMBRES, relevés du journal des agents. Jamais un texte écrit par un client ou par un agent. ── */
  function faitsDe(R) {
    const debut = lundiMinuit(R.ts, R.type === 'bilan' ? 0 : 1);
    let journalLisible = true, j = [];
    try { if (agents.journalIllisible && agents.journalIllisible()) journalLisible = false; else j = agents.lireJournal().filter(e => e && e.ts >= debut && e.ts <= R.ts); } catch (e) { journalLisible = false; }
    const par = {};
    for (const a of agents.AGENTS) par[a.id] = { ok: 0, erreur: 0, refuse: 0, proposees: 0, mails: 0 };
    let charge = null; try { charge = agents.charge ? agents.charge() : null; } catch (e) { charge = null; }
    const total = { actions: 0, erreurs: 0, refus: 0 };
    for (const e of j) {
      const f = par[e.agent];
      if (!f || e.action === 'mode' || /^réunion/.test(String(e.action))) continue;   // un changement de mode n'est pas du travail ; ce que la réunion écrit elle-même non plus (circulaire)
      total.actions++;
      if (e.resultat === 'ok') f.ok++; else if (e.resultat === 'erreur') { f.erreur++; total.erreurs++; } else if (e.resultat === 'refuse') { f.refuse++; total.refus++; } else if (e.resultat === 'propose') f.proposees++;
      if (e.resultat === 'ok' && e.action === ESTUN_MAIL) f.mails++;
    }
    if (charge) for (const a of agents.AGENTS) par[a.id].tachesEnCours = charge[a.id];
    let cp = {}; try { cp = agents.comptes() || {}; } catch (e) { cp = {}; }
    let incidents = null; try { incidents = typeof faitsExt.incidents === 'function' ? faitsExt.incidents(debut, R.ts) : null; } catch (e) { incidents = null; }
    /* La part « qualité » d'Inès (`agent-ines.js`) : ses relectures de courriels de la semaine — des NOMBRES et des identifiants de critères. `null` quand elle n'a rien relu : « on ne sait pas ». */
    let qualite = null; try { qualite = typeof faitsExt.qualite === 'function' ? faitsExt.qualite(debut, R.ts) : null; } catch (e) { qualite = null; }
    const faits = fermer({ journalLisible, parAgent: par, total, validationsEnAttente: cp.validationsEnAttente == null ? null : cp.validationsEnAttente,
      tachesEnAttente: cp.tachesEnAttente == null ? null : cp.tachesEnAttente, incidents, qualite });
    return { texte: JSON.stringify(Object.assign({ semaine: R.semaine, depuis: libelleCreneau(debut) }, faits)), faits };
  }

  /* ── les outils d'une réunion ── */
  function outilsReunion(type) {
    const bilan = { name: 'juger_objectif', description: 'Dire si tu as atteint un de tes objectifs de la semaine : atteint, partiel ou non, et pourquoi (d’après les faits). Un appel par objectif, avec son identifiant entre crochets.',
      input_schema: { type: 'object', properties: { objectif: { type: 'string' }, statut: { type: 'string', enum: STATUTS_BILAN }, pourquoi: { type: 'string' } }, required: ['objectif', 'statut', 'pourquoi'], additionalProperties: false } };
    const lecon = { name: 'ajouter_lecon', description: 'Retenir UNE leçon pour les semaines suivantes : une phrase concrète sur ce qu’il faut refaire ou ne plus faire. Au plus deux par bilan ; zéro si rien n’est à retenir. Elle entrera dans tes consignes.',
      input_schema: { type: 'object', properties: { texte: { type: 'string' } }, required: ['texte'], additionalProperties: false } };
    const fixer = { name: 'fixer_objectifs', description: 'Enregistrer tes 2 ou 3 objectifs MESURABLES pour la semaine (ils remplacent ceux que tu avais fixés cette semaine). Chacun : ce que tu feras (texte) et comment on verra que c’est atteint (mesure : un chiffre ou un constat vérifiable dans les faits).',
      input_schema: { type: 'object', properties: { objectifs: { type: 'array', minItems: 1, maxItems: OBJECTIFS_MAX, items: { type: 'object', properties: { texte: { type: 'string' }, mesure: { type: 'string' } }, required: ['texte', 'mesure'], additionalProperties: false } } }, required: ['objectifs'], additionalProperties: false } };
    return type === 'bilan' ? [bilan, lecon] : [fixer];
  }

  /* Exécuter un appel d'outil, VALIDÉ ici. `run` : l'état de la réunion en cours (compte des leçons du bilan). */
  function executer(id, a, R, run) {
    const e = a && a.entree && typeof a.entree === 'object' ? a.entree : {};
    const str = k => typeof e[k] === 'string' ? e[k] : '';
    const note = (action, resultat, detail) => { try { agents.noter(id, 'réunion : ' + action, { cible: R.semaine, resultat, detail }); } catch (x) {} };
    const refus = (action, raison) => { note(action, 'refuse', raison); return { ok: false, raison }; };
    if (a.nom === 'fixer_objectifs' && R.type === 'objectifs') {
      const brut = Array.isArray(e.objectifs) ? e.objectifs.slice(0, OBJECTIFS_MAX) : [];
      const liste = [];
      for (const x of brut) {
        if (!x || typeof x !== 'object') continue;
        const texte = propre(x.texte, OBJECTIF_MAX), mesure = propre(x.mesure, OBJECTIF_MAX);
        if (texte.length < 5 || mesure.length < 3) continue;
        liste.push({ id: 'o' + nouvelId(3), texte, mesure, ts: maintenant() });
      }
      if (!liste.length) return refus('objectifs refusés', 'objectifs');
      const avant = objectifs[R.semaine] && objectifs[R.semaine][id];
      if (!objectifs[R.semaine]) objectifs[R.semaine] = {};
      objectifs[R.semaine][id] = liste;
      const cles = Object.keys(objectifs).sort().reverse();
      const rognes = cles.slice(SEMAINES_MAX).map(k => [k, objectifs[k]]);
      for (const [k] of rognes) delete objectifs[k];
      if (!ecrireObjectifs()) {
        rognes.forEach(([k, v]) => { objectifs[k] = v; });
        if (avant === undefined) { delete objectifs[R.semaine][id]; if (!Object.keys(objectifs[R.semaine]).length) delete objectifs[R.semaine]; } else objectifs[R.semaine][id] = avant;
        return refus('objectifs refusés', 'ecriture');
      }
      note('objectifs fixés', 'ok', liste.length + ' objectif(s)');
      return { ok: true, n: liste.length };
    }
    if (a.nom === 'juger_objectif' && R.type === 'bilan') {
      const o = objectifsDe(R.semaine, id).find(x => x.id === str('objectif'));
      if (!o) return refus('bilan refusé', 'objectif');
      if (!STATUTS_BILAN.includes(str('statut'))) return refus('bilan refusé', 'statut');
      const pourquoi = propre(str('pourquoi'), POURQUOI_MAX);
      if (!pourquoi) return refus('bilan refusé', 'pourquoi');
      const avant = o.bilan;
      o.bilan = { statut: str('statut'), pourquoi, ts: maintenant() };
      if (!ecrireObjectifs()) { if (avant === undefined) delete o.bilan; else o.bilan = avant; return refus('bilan refusé', 'ecriture'); }
      note('bilan d’un objectif', 'ok', str('statut'));
      return { ok: true };
    }
    if (a.nom === 'ajouter_lecon' && R.type === 'bilan') {
      if ((run.lecons[id] || 0) >= LECONS_PAR_BILAN) return refus('leçon refusée', 'deux_par_bilan');
      const texte = propre(str('texte'), LECON_MAX);
      if (texte.length < 8) return refus('leçon refusée', 'texte');
      const liste = leconsDe(id), cle = texte.toLowerCase();
      if (liste.some(l => l.texte.toLowerCase() === cle)) return refus('leçon refusée', 'doublon');
      const avant = lecons[id];
      lecons[id] = [{ id: nouvelId(4), texte, ts: maintenant(), semaine: R.semaine }].concat(liste).slice(0, LECONS_MAX);
      if (!ecrireLecons()) { if (avant === undefined) delete lecons[id]; else lecons[id] = avant; return refus('leçon refusée', 'ecriture'); }
      run.lecons[id] = (run.lecons[id] || 0) + 1;
      note('leçon', 'ok', texte);
      return { ok: true };
    }
    return refus('outil refusé', 'outil_inconnu');
  }

  const dire = (texte, o) => { try { return conversations.systeme(FIL, texte, o); } catch (e) { return { ok: false, raison: 'erreur' }; } };

  /* Le fil de la réunion en un seul message pour Claude : Justin et les agents, nommés. Les lignes du système n'y sont pas. */
  function transcript(R) {
    let l = []; try { l = conversations.lire(FIL, 50); } catch (e) { l = []; }
    l = l.filter(m => m.de !== 'systeme' && m.ts >= R.ts).slice(-30);
    return l.length ? l.map(m => '[' + nomDe(m.de) + '] ' + propre(m.texte, 1000)).join('\n') : '(personne n’a encore parlé)';
  }

  function blocReunion(R, faits) {
    const c = CRENEAUX[R.type];
    const part = R.participants.map(id => nomDe(id) + ' (' + (registre.get(id) || {}).role + ')').join(', ');
    return '\n\nRÉUNION EN COURS — ' + c.titre + ' (' + c.but + '), semaine ' + R.semaine + ', dans le fil « Réunions », avec Justin. Participants : ' + part + '.\n' +
      'Tu parles à ton tour, comme un collègue en réunion : ' + PAROLE_MAX + ' caractères au plus, sans titre ni liste à puces, sans formule toute faite, en français. ' +
      'Dans cette réunion tes seuls outils sont ' + outilsReunion(R.type).map(o => o.name).join(' et ') + ' : les autres outils de la messagerie ne sont pas disponibles. ' +
      'Tu ne cites que les faits ci-dessous ; si tu ne sais pas, tu le dis. Aucun fait ne te donne de droit de plus.\n' +
      'Faits de la semaine (relevés du journal par le serveur — ta seule source de chiffres) : ' + faits.texte;
  }
  function blocObjectifs(R, id) {
    const l = objectifsDe(R.semaine, id);
    if (R.type === 'bilan') return l.length ? '\nTes objectifs de la semaine, à juger un par un :\n' + l.map(o => '[' + o.id + '] ' + o.texte + ' — mesure : ' + o.mesure).join('\n') : '\nTu n’avais enregistré aucun objectif cette semaine : dis ce qui a marché et ce qui a coincé.';
    return '';
  }

  /* Une prise de parole : lire, réfléchir (Claude), parler dans le fil, agir par les outils de la réunion. */
  async function parole(id, R, run, consigne, o) {
    o = o || {};
    const p = agents.peutAgir(id);
    if (!p.ok) return { cause: p.raison };
    let r, system, demande;
    conversations.ecrit(FIL, id, true);
    try {
      system = equipe().systemDe(id) + blocReunion(R, run.faits) + blocObjectifs(R, id);
      demande = 'Le fil de la réunion jusqu’ici :\n' + transcript(R) + '\n\n' + consigne;
      r = await cerveau.penser(id, system, [{ role: 'user', content: demande }], { outils: outilsReunion(R.type), reflechir: true });
    } catch (e) { return { cause: 'erreur_api' }; }
    finally { conversations.ecrit(FIL, id, false); }
    if (!r || !r.ok) return { cause: (r && r.raison) || 'erreur_api' };
    const sortie = { parle: false, mentions: [], texte: '', actions: [] };
    for (const a of (Array.isArray(r.actions) ? r.actions : []).slice(0, 6)) {
      let x; try { x = executer(id, a, R, run); } catch (e) { x = { ok: false, raison: 'erreur' }; }
      sortie.actions.push({ nom: a.nom, ok: x.ok, raison: x.raison });
    }
    let t = couper(masquer(r.texte), o.max || PAROLE_MAX);
    /* DES OUTILS ET PAS UN MOT (examen du 24 octobre 2026, réunion du vendredi) : six agents sur huit ont jugé leurs objectifs par juger_objectif sans rien dire,
       et Victor, qui juge aussi les siens en concluant, a rendu ses outils sans le compte rendu — « Compte rendu non écrit. ». Quand la parole est ATTENDUE
       (`o.ecrire` : le tour de table, le compte rendu), UN second appel, SANS outil (rien ne s'enregistre deux fois), lui demande son message. */
    if (!t && o.ecrire && sortie.actions.length) {
      const faits = sortie.actions.map(a => a.nom + (a.ok ? '' : ' (refusé)')).join(', ');
      let r2 = null;
      conversations.ecrit(FIL, id, true);
      try { r2 = await cerveau.penser(id, system, [{ role: 'user', content: demande + '\n\nTes outils sont faits (' + faits + ') : ne les rappelle pas. Écris maintenant, sans outil, ton message pour le fil.' }], { reflechir: true }); }
      catch (e) { r2 = null; }
      finally { conversations.ecrit(FIL, id, false); }
      if (r2 && r2.ok) t = couper(masquer(r2.texte), o.max || PAROLE_MAX);
    }
    if (!t) return Object.assign(sortie, { cause: r.actions && r.actions.length ? '' : 'vide' });
    if (o.ras && RAS.test(t)) return Object.assign(sortie, { ras: true });
    if (o.redites) { t = sansRedites(t); if (!t) return Object.assign(sortie, { ras: true }); }
    const d = conversations.parler(id, FIL, t, { niveau: 'info', prof: 1, reunion: true, max: o.max });
    if (!d.ok) return Object.assign(sortie, { cause: d.raison });
    return Object.assign(sortie, { parle: true, texte: t, mentions: d.mentions || [] });
  }

  /* ── LE DÉROULÉ ── */
  let enCours = null;     // { id, type, fin, promesse } — une seule réunion à la fois
  const termine = (R, statut) => { R.statut = statut; R.finReelle = maintenant(); ecrireReunions(); };

  async function derouler(R) {
    const c = CRENEAUX[R.type];
    const run = { faits: faitsDe(R), lecons: {}, queue: [], tours: {}, absents: [], parles: new Set() };
    const finie = () => maintenant() >= R.fin;
    dire(c.titre + ' — ' + c.but + ' (' + R.semaine + '). ' + R.participants.length + ' agent' + (R.participants.length > 1 ? 's' : '') + ' présent' + (R.participants.length > 1 ? 's' : '') + ', jusqu’à ' + jusquaLib(R.fin) + '.');
    const absent = (id, cause) => { if (cause && !run.absents.some(x => x.id === id)) run.absents.push({ id, cause }); };
    /* Une cause qui vaut pour TOUS (clé absente, budget atteint, pause) : continuer ferait quinze « n'a pas pu parler ». Rien dit encore → annulée ; sinon interrompue. */
    const abandon = cause => { dire((run.parles.size ? 'Réunion interrompue : ' : 'Réunion annulée : ') + (CAUSES[cause] || cause) + '.'); R.absents = run.absents; termine(R, run.parles.size ? 'interrompue' : 'annulee'); return false; };
    const citer = (auteur, mentions) => {
      for (const m of mentions || []) {
        if (m === auteur || !R.participants.includes(m) || run.queue.includes(m) || (run.tours[m] || 0) >= TOURS_PAR_AGENT) continue;
        run.queue.push(m);
      }
    };

    /* 1. Victor ouvre, faits sous les yeux. */
    if (R.participants.includes('victor')) {
      const o = await parole('victor', R, run, 'Tu ouvres la réunion. En quelques phrases : rappelle de quoi on parle et ce que disent les faits de la semaine (uniquement les chiffres du bloc Faits : ce qui a marché, ce qui coince, ce qui attend Justin), puis donne la parole à l’équipe. Ne cite personne avec @ : le tour de table est déjà réglé.');
      if (o.cause && o.cause !== 'vide') { if (GLOBALES.includes(o.cause)) return abandon(o.cause); absent('victor', o.cause); } else if (o.parle) run.parles.add('victor');
    } else dire('Victor n’est pas allumé : la réunion se tient sans ouverture ni compte rendu.');

    /* 2. Le tour de table : un agent après l'autre ; Inès en dernier, avec la qualité. */
    const consignes = {
      objectifs: 'C’est ton tour. Dis ce que tu retiens de tes leçons (si tu en as), donne 2 ou 3 objectifs MESURABLES pour cette semaine — tu les enregistres avec l’outil fixer_objectifs —, et une amélioration concrète que tu fais pour y arriver. Cite un collègue avec @ (par exemple @lea) seulement si tu as vraiment besoin de lui.',
      bilan: 'C’est ton tour. Dis à l’équipe, en quelques phrases, où tu en es de tes objectifs un par un : atteint, partiel ou non, et pourquoi, faits à l’appui — et tu enregistres chaque jugement avec l’outil juger_objectif. Puis, si tu en tires quelque chose, 0 à 2 leçons avec ajouter_lecon. Cite un collègue avec @ (par exemple @lea) seulement si tu as vraiment besoin de lui.',
    };
    const ordre = ORDRE.filter(id => R.participants.includes(id)).concat(R.participants.includes('ines') ? ['ines'] : []);
    for (const id of ordre) {
      if (finie()) { absent(id, 'temps'); continue; }
      const extra = id === 'ines' ? ' Tu donnes aussi la qualité de la semaine : ce que tu relèves sur le travail de l’équipe, d’après les erreurs et les refus du bloc Faits et le bloc qualite (tes relectures de courriels : combien sont partis, combien étaient conformes, quels critères reviennent).' : '';
      const o = await parole(id, R, run, consignes[R.type] + extra, { ecrire: true });
      if (o.cause && o.cause !== 'vide') { if (GLOBALES.includes(o.cause)) return abandon(o.cause); absent(id, o.cause); }
      else if (o.parle) { run.parles.add(id); citer(id, o.mentions); }
    }

    /* 3. La discussion : ceux qu'on a cités répondent, dans l'ordre, jusqu'à ce que plus personne n'ait rien à ajouter — ou que l'heure soit finie. */
    let prises = 0;
    while (run.queue.length && prises < DISCUSSION_MAX && !finie()) {
      const id = run.queue.shift();
      run.tours[id] = (run.tours[id] || 0) + 1; prises++;
      const o = await parole(id, R, run, 'On t’a cité dans la discussion. Réponds court (300 caractères au plus) à ce qu’on te demande. Ne redis pas tes objectifs et ne les confirme pas : ils sont notés. Si tu n’as rien à ajouter, réponds exactement « RAS » et rien d’autre. Cite un collègue avec @ seulement s’il a vraiment quelque chose à répondre.', { ras: true, redites: true });
      if (o.cause && o.cause !== 'vide') { if (GLOBALES.includes(o.cause)) return abandon(o.cause); absent(id, o.cause); }
      else if (o.parle) { run.parles.add(id); citer(id, o.mentions); }
    }

    /* 4. Ce qui n'a pas pu se dire, une ligne. */
    if (run.absents.length) dire('N’ont pas pu parler : ' + run.absents.slice(0, 8).map(x => nomDe(x.id) + ' (' + (CAUSES[x.cause] || x.cause) + ')').join(', ') + (run.absents.length > 8 ? '…' : '') + '.');
    R.absents = run.absents.slice(0, 16);
    /* Ceux qui ont parlé le lundi sans fixer d'objectif : dit AVANT la conclusion (le compte rendu clôt le fil). Victor n'y est pas : ses objectifs se fixent en concluant. */
    const sans = R.type === 'objectifs' ? R.participants.filter(id => id !== 'victor' && run.parles.has(id) && !objectifsDe(R.semaine, id).length) : [];
    if (sans.length) dire('Sans objectif enregistré : ' + sans.map(nomDe).join(', ') + '.');

    /* 5. Victor conclut : décisions, qui fait quoi, ce qui attend Justin. Il est aussi membre de l'équipe : il n'a pas de tour de table (il ouvre), ses propres objectifs
          (lundi) ou son propre bilan (vendredi) se disent ICI, par les outils, sans encombrer le compte rendu. */
    if (R.participants.includes('victor')) {
      const siens = R.type === 'objectifs' ? ' Enregistre aussi TES objectifs de la semaine (outil fixer_objectifs), sans les détailler dans le compte rendu.'
        : ' Juge aussi TES propres objectifs (outil juger_objectif) et note une leçon si tu en as une (outil ajouter_lecon), sans les détailler dans le compte rendu.';
      const o = await parole('victor', R, run, 'Clos la réunion par le compte rendu : les décisions prises, qui fait quoi, et ce qui attend Justin — rien d’inventé, seulement ce qui s’est dit ici. ' + COMPTE_RENDU_MAX + ' caractères au plus. Ne cite personne avec @.' + siens, { max: COMPTE_RENDU_MAX, ecrire: true });
      if (o.parle) R.compteRendu = o.texte; else dire('Compte rendu non écrit' + (o.cause ? ' : ' + (CAUSES[o.cause] || o.cause) : '') + '.');
    }
    termine(R, 'terminee');
    notifierFin(R);
    return true;
  }

  /* La notification de Justin : des NOMBRES, pas du texte d'agent. */
  function notifierFin(R) {
    if (!pousse) return;
    let corps;
    if (R.type === 'objectifs') {
      const l = R.participants.map(id => objectifsDe(R.semaine, id).length).filter(n => n > 0);
      corps = l.reduce((s, n) => s + n, 0) + ' objectifs fixés par ' + l.length + ' agent' + (l.length > 1 ? 's' : '') + '. Compte rendu dans la Messagerie, « Réunions ».';
    } else {
      const bilans = R.participants.map(id => objectifsDe(R.semaine, id)).reduce((s, l) => s.concat(l), []).filter(o => o.bilan);
      const n = k => bilans.filter(o => o.bilan.statut === k).length;
      corps = n('atteint') + ' atteints, ' + n('partiel') + ' partiels, ' + n('non') + ' non atteints. Compte rendu dans la Messagerie, « Réunions ».';
    }
    try { Promise.resolve(pousse(CRENEAUX[R.type].titre + ' terminée', corps, '/tour.html#agents')).catch(() => {}); } catch (e) {}
  }

  /* Qui peut parler, dans l'ordre de la réunion : Victor ouvre, le tour de table, Inès à la fin. */
  function participantsDe() {
    const l = ORDRE.concat(['ines']).filter(x => agents.peutAgir(x).ok);
    if (agents.peutAgir('victor').ok) l.unshift('victor');
    return l;
  }
  /* Ce qui empêche la réunion de COMMENCER, avant tout appel à Claude : la phrase que le fil dira, ou '' si rien ne l'empêche. */
  function empechement(participants) {
    if (!participants.length) return 'Réunion annulée : aucun agent n’est allumé';
    let b = null; try { b = typeof cerveau.etatBudget === 'function' ? cerveau.etatBudget() : null; } catch (e) { b = null; }
    if (b && (b.illisible || !b.cle)) return 'Réunion annulée : ' + (b.illisible ? CAUSES.budget_illisible : CAUSES.pas_de_cle) + '.';
    return '';
  }

  /* ── LANCER (le calendrier ET le bouton de Justin passent ici) ── */
  function demarrer(type, o) {
    o = o || {};
    if (!CRENEAUX[type]) return { ok: false, raison: 'type' };
    if (enCours) return { ok: false, raison: 'en_cours' };
    if (illisible()) return { ok: false, raison: 'illisible' };
    const eq = equipe();
    if (!eq || typeof eq.systemDe !== 'function' || !cerveau || typeof cerveau.penser !== 'function' || !conversations || typeof conversations.parler !== 'function') return { ok: false, raison: 'messagerie' };
    if (agents.enPause()) return { ok: false, raison: 'pause' };
    const now = maintenant(), p = parisParties(now), c = CRENEAUX[type];
    const id = nouvelId(6);
    /* Un lancement à la main PENDANT le jour de la réunion tient lieu de la réunion du jour (sinon elle rejouerait à l'heure dite) — sauf si elle a déjà eu lieu. */
    let cle = o.cle;
    if (!cle) { const duJour = type + ':' + p.date; cle = (p.jourSemaine === c.jour && !reunions.some(r => r && r.cle === duJour)) ? duJour : 'manuelle:' + id; }
    const participants = participantsDe();
    /* La semaine visée : les objectifs d'un samedi ou d'un dimanche sont ceux de la semaine qui vient. */
    const semaine = (type === 'objectifs' && p.jourSemaine >= 6) ? (() => { const j = jourPlus(p, 8 - p.jourSemaine); return semaineIso(j.annee, j.mois, j.jour); })() : semaineIso(p.annee, p.mois, p.jour);
    const fin = o.debut && now - o.debut < HEURE_MS ? o.debut + HEURE_MS : (o.debut ? now + RATTRAPAGE_COURT_MS : now + HEURE_MS);
    /* ⛔ Une réunion que RIEN n'a empêchée de naître, mais qui n'a pas pu commencer (aucun agent allumé, clé absente, budget illisible) est annulée SANS consommer son
       créneau : `reessai` la signale à `tic()`, qui la tient dès que Justin a rallumé les agents (le lundi à 9 h 15, le rattrapage va jusqu'à `limite`). Elle est dite UNE fois. */
    const emp = empechement(participants);
    const R = { id, type, cle, semaine, ts: now, fin, statut: emp ? 'annulee' : 'en_cours', participants, manuelle: !!o.manuel };
    if (emp) { R.reessai = true; R.finReelle = now; }
    reunions.push(R);
    if (reunions.length > REUNIONS_MAX) reunions = reunions.slice(-REUNIONS_MAX);
    if (!ecrireReunions()) { reunions.pop(); return { ok: false, raison: 'ecriture' }; }
    if (emp) {
      dire(emp);   // dite UNE fois : `tic()` ne rappelle `demarrer` qu'une fois l'empêchement levé
      return { ok: true, id, annulee: true };
    }
    const suite = derouler(R).catch(e => {
      console.error('réunion :', String(e && e.message || e).slice(0, 120));
      try { dire('Réunion interrompue par une erreur du serveur.'); } catch (x) {}
      if (R.statut === 'en_cours') termine(R, 'interrompue');
    }).then(() => { if (enCours && enCours.id === id) enCours = null; });
    enCours = { id, type, fin, debut: now, promesse: suite };
    return { ok: true, id };
  }

  /* La vérification de chaque minute : la réunion due est-elle déjà inscrite ? Sinon on la tient. */
  function tic() {
    if (enCours) return { saute: 'en_cours' };
    const now = maintenant(), d = dueA(now);
    if (!d) return { saute: 'pas_l_heure' };
    if (illisible()) return { saute: 'illisible' };
    const ex = reunions.find(r => r && r.cle === d.cle);
    if (ex && !(ex.statut === 'annulee' && ex.reessai === true)) return { saute: 'deja' };
    if (ex) {
      /* annulée AVANT son premier appel : le créneau n'est pas consommé. Tant que rien ne change, on ne réécrit rien (c'est déjà dit) ; dès que ça change, elle se tient. */
      if (empechement(participantsDe())) return { saute: 'deja' };
      reunions = reunions.filter(r => r !== ex);
    }
    const r = demarrer(d.type, { cle: d.cle, debut: d.debut });
    return r.ok ? { lancee: r.id, annulee: !!r.annulee } : { saute: r.raison };
  }

  /* ── les routes ── */
  const objectifsVue = sem => { const o = {}; for (const [id, l] of Object.entries(objectifs[sem] || {})) if (IDS.has(id) && Array.isArray(l)) o[id] = l.map(x => ({ id: x.id, texte: x.texte, mesure: x.mesure, bilan: x.bilan ? { statut: x.bilan.statut, pourquoi: x.bilan.pourquoi } : null })); return o; };
  /* ⛔ PATRON SEUL : compte rendu, objectifs, bilans et leçons sont du texte libre que les agents ont écrit d'après ce que Justin leur a dit (le fil de la
     messagerie, lui aussi au patron, « porte les rappels de clients »). `monAdmin` laisserait lire tout compte actif de la console. */
  app.get('/api/monitor/agents/reunions', monPatronStrict, (req, res) => {
    if (illisible()) return res.status(503).json({ error: 'Les réunions des agents sont illisibles' });
    const now = maintenant(), sem = semaineDe(now), prec = semaineAvant(now);
    const prochaine = prochaineApres(now);
    const lc = {}; for (const id of Object.keys(lecons)) if (IDS.has(id) && Array.isArray(lecons[id]) && lecons[id].length) lc[id] = lecons[id].map(l => ({ id: l.id, texte: l.texte, ts: l.ts, semaine: l.semaine || '' }));
    res.json({ ok: true, semaine: sem, semainePrecedente: prec,
      enCours: enCours ? { id: enCours.id, type: enCours.type, debut: enCours.debut, fin: enCours.fin, jusqua: jusquaLib(enCours.fin), titre: CRENEAUX[enCours.type].titre } : null,
      prochaine,
      reunions: reunions.slice(-8).reverse().map(r => ({ id: r.id, type: r.type, ts: r.ts, fin: r.finReelle || r.fin, statut: r.statut, semaine: r.semaine, manuelle: !!r.manuelle, participants: Array.isArray(r.participants) ? r.participants.filter(x => IDS.has(x)) : [], compteRendu: r.compteRendu || '' })),
      objectifs: objectifsVue(sem), objectifsPrecedents: objectifsVue(prec), lecons: lc });
  });
  app.post('/api/monitor/agents/lecons/retirer', monPatronStrict, (req, res) => {
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    if (typeof b.agent !== 'string' || !IDS.has(b.agent)) return res.status(404).json({ error: 'Agent inconnu' });
    if (typeof b.id !== 'string' || !ID_LECON.test(b.id)) return res.status(400).json({ error: 'Identifiant de leçon manquant' });
    if (illisibles.has(F_LECONS)) return res.status(503).json({ error: 'Les leçons des agents sont illisibles : rien n’est modifié' });
    const avant = leconsDe(b.agent), i = avant.findIndex(l => l.id === b.id);
    if (i < 0) return res.status(404).json({ error: 'Leçon inconnue' });
    const ancien = lecons[b.agent];
    lecons[b.agent] = avant.filter((l, k) => k !== i);
    if (!ecrireLecons()) { lecons[b.agent] = ancien; return res.status(503).json({ error: 'Changement non enregistré' }); }
    try { agents.noter(b.agent, 'leçon retirée', { cible: 'leçon', resultat: 'ok', qui: req.tourUser && req.tourUser.nom }); } catch (e) {}
    res.json({ ok: true });
  });
  app.post('/api/monitor/agents/reunions/lancer', monPatronStrict, (req, res) => {
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    if (typeof b.type !== 'string' || !CRENEAUX[b.type]) return res.status(400).json({ error: 'Type de réunion : objectifs ou bilan' });
    const r = demarrer(b.type, { manuel: true });
    if (r.ok) return res.json({ ok: true, id: r.id, annulee: !!r.annulee });
    const MSG = { en_cours: [409, 'Une réunion est déjà en cours'], illisible: [503, 'Les réunions des agents sont illisibles : rien n’est lancé'], messagerie: [503, 'La messagerie des agents n’est pas montée'],
      pause: [409, 'Les agents sont en pause : reprends-les d’abord'], ecriture: [503, 'Réunion non enregistrée'] }[r.raison] || [400, 'Réunion non lancée'];
    res.status(MSG[0]).json({ error: MSG[1] });
  });

  return { tic, demarrer, memoire, attendre: () => (enCours ? enCours.promesse : Promise.resolve()), enCours: () => enCours && { id: enCours.id, type: enCours.type, fin: enCours.fin }, estIllisible: illisible };
};
module.exports.sansRedites = sansRedites;
module.exports.parisParties = parisParties;
module.exports.tsParis = tsParis;
module.exports.semaineIso = semaineIso;
module.exports.dueA = dueA;
module.exports.prochaineApres = prochaineApres;
module.exports.lundiMinuit = lundiMinuit;
module.exports.CRENEAUX = CRENEAUX;
module.exports.DISCUSSION_MAX = DISCUSSION_MAX;
module.exports.LECONS_MAX = LECONS_MAX;
module.exports.LECONS_PAR_BILAN = LECONS_PAR_BILAN;

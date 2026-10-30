/* LA REVUE DU WEEK-END (29 octobre 2026) — chaque agent relit sa semaine et propose deux ou trois règles de travail ; Justin les valide le lundi, RIEN ne s'applique sans lui.
 *
 * Justin : « plus intelligents, plus autonomes » ; convenu avec lui : « le week-end chaque agent relit sa semaine et propose 2-3 règles d'amélioration que je valide le lundi ». Les réunions du lundi
 * et du vendredi (`reunions.js`) font fixer des objectifs et retenir des leçons (écrites par l'agent, appliquées tout de suite, que Justin peut retirer) ; la revue est AUTRE chose : des règles que
 * l'agent PROPOSE, et qui n'entrent dans ses consignes qu'une fois acceptées par Justin.
 *
 * ⛔ RIEN NE S'APPLIQUE SANS JUSTIN. Chaque règle est déposée dans la FILE DE VALIDATIONS des agents (type `regle_agent`, forme fermée `{ regle: <référence> }`) : Justin l'accepte ou la refuse dans
 *    la Tour (Agents, onglet Validations), comme toute demande d'agent. Le TEXTE de la règle ne traverse pas la file (seule la référence y passe) : il vit ici, et `memoire(id)` ne le rend QUE lorsque
 *    la validation correspondante est `acceptée`, relue À CHAQUE appel dans `agents.validationDe` — pas de copie d'état qui pourrait mentir. Refusée, expirée (sept jours), retirée : rien n'entre.
 * ⛔ UNE RÈGLE NE DONNE AUCUN POUVOIR. Le texte injecté le dit, les outils fermés ne bougent pas, et le CODE refuse avant tout dépôt une règle qui parle d'argent, d'accès, de suppression, d'envoi, de
 *    publication ou de se passer de validation (`INTERDITS`). Les droits de chaque agent vivent dans `agents.js`, `direction.js` et ses outils : ce fichier n'y touche pas, et ne touche à AUCUN
 *    réglage Auto / Brouillon.
 * ⛔ CE QUE LES AGENTS LISENT : des NOMBRES relevés du journal (gestes, erreurs, refus, décisions de Justin, tâches en cours) et leurs propres objectifs et leçons — jamais un texte venu d'un client.
 *    Adresses et numéros sont masqués avant tout dépôt, et une règle qui contient un lien ou une adresse est refusée.
 * ⛔ UNE REVUE PAR WEEKEND ET PAR AGENT, MÊME APRÈS UN REDÉMARRAGE : inscrite AVANT d'être jouée (`agents-revue.json`, écrit par un temporaire puis un renommage, jamais par-dessus un fichier
 *    illisible), samedi 10 h → dimanche 24 h, heure de Paris. Un agent à l'arrêt, un budget atteint, une panne : on le dit et on réessaie (deux essais), jamais d'invention.
 * ⛔ Au plus TROIS règles par agent et par weekend, DIX règles actives par agent ; une règle déjà proposée (acceptée, refusée ou en attente) ne se repropose pas.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AC = require('./agent-conversation');
const { sansTel, ADRESSE } = AC;
const RN = require('./reunions');
const { parisParties, tsParis, semaineIso, lundiMinuit } = RN;

const F_REVUE = 'agents-revue.json';
const FIL = 'equipe';
const TYPE = 'regle_agent';
const SAMEDI = 6, DIMANCHE = 7, HEURE_DEBUT = 10;
const REGLE_MIN = 15, REGLE_MAX = 130, CONSTAT_MAX = 45;
const PAR_AGENT = 3, ACTIVES_MAX = 10, REVUES_MAX = 12, ESSAIS_MAX = 2, REGLES_MAX = 400;
const ID_REGLE = /^rg[a-f0-9]{8}$/;
const ACTION_MAX = 40;
const ESSAI_ESPACE_MS = 6 * 3600000;   // deux essais par agent et par weekend, ÉTALÉS sur la fenêtre (38 h) : une panne d'une heure ne les consomme pas tous les deux

/* Ce qu'une règle n'a pas le droit de dire : un pouvoir, un secret, un contournement de Justin. Le motif cherche des MOTS dans la règle PROPOSÉE (un texte que le code refuse), pas dans un commentaire.
   ⚠️ C'EST UNE LISTE D'ÉCART, PAS LA GARDE : un modèle trouvera toujours une tournure qu'elle ne prévoit pas. La vraie garde est la VALIDATION DE JUSTIN (rien ne s'applique avant son accord) et les outils fermés, qui ne bougent pas. */
const INTERDITS = [
  ['argent', /rembours|\bavoirs?\b|pr[ée]l[èe]v|virement|geste commercial|d[ée]dommag|\bremises?\b|r[ée]duction|\d\s*(?:€|euros?)/i],
  ['acces', /mot de passe|\bjetons?\b|\btoken|\bcl[ée]s?\b|permission|(?:cr[ée]e|ouvr|donn|accord|suspend|ferm|coup|chang|modifi)\w*\s+(?:un |l[’']\s*|les? |des? |ton |son |leur )?(?:acc[èe]s|espace)/i],
  ['suppression', /supprim|efface|d[ée]truis|purge|r[ée]sili/i],
  ['envoi', /envoy\w*\s+(?:seul|automatiquement|directement|imm[ée]diatement)|envoie\w*\s+(?:seul|automatiquement|directement|imm[ée]diatement)|publi\w*\s+(?:seul|automatiquement|directement)|(?:programm|planifi)\w*\s+(?:seul|automatiquement)/i],
  ['contournement', /sans\s+(?:attendre\s+|demander\s+)?(?:la\s+|l[’']\s*)?(?:validation|accord|autorisation|justin|relecture|contr[ôo]le)|ignor(?:e|er|ez)\b.{0,30}(?:r[èe]gle|limite|consigne|charte)|d[ée]pass(?:e|er|ez)\b.{0,30}(?:limite|plafond|budget)|d[ée]sactiv|mode auto|passe[rz]? en auto|ne (?:demande|dis|pr[ée]viens) plus|ignor(?:e|er|ez)\b|oubli(?:e|er|ez)\b|contourn|passe[rz]?\s+outre|sans\s+demander|ob[ée]is|[ée]cri(?:s|re|vez)\s+(?:à|a)\s+tous\s+les\s+clients|\btous\s+les\s+clients\b/i],
  ['lien', /https?:\/\/|www\./i],
];

/* ── l'heure de Paris : pur, rejouable au banc ── */
function dueA(ts) {
  const p = parisParties(ts);
  if (p.jourSemaine === DIMANCHE || (p.jourSemaine === SAMEDI && p.heure >= HEURE_DEBUT)) {
    const sem = semaineIso(p.annee, p.mois, p.jour);
    return { cle: 'revue:' + sem, semaine: sem, date: p.date, debut: tsParis(p.annee, p.mois, p.jour, p.jourSemaine === SAMEDI ? HEURE_DEBUT : 0, 0),
      fin: tsParis(p.annee, p.mois, p.jour + (p.jourSemaine === SAMEDI ? 2 : 1), 0, 0) };   // dimanche minuit passé : la fenêtre est close
  }
  return null;
}
/* Le prochain samedi 10 h STRICTEMENT après `ts`, dit en toutes lettres. */
function prochaineApres(ts) {
  const p = parisParties(ts);
  for (let k = 0; k <= 8; k++) {
    const d = new Date(Date.UTC(p.annee, p.mois - 1, p.jour + k));
    const j = { annee: d.getUTCFullYear(), mois: d.getUTCMonth() + 1, jour: d.getUTCDate() };
    if (((d.getUTCDay() + 6) % 7) + 1 !== SAMEDI) continue;
    const t = tsParis(j.annee, j.mois, j.jour, HEURE_DEBUT, 0);
    if (t > ts) return { ts: t, libelle: 'samedi ' + j.jour + '/' + (j.mois < 10 ? '0' : '') + j.mois + ' à ' + HEURE_DEBUT + ' h' };
  }
  return null;
}

/* ── les mots : masquer, nettoyer, juger une règle ── */
const masquer = t => sansTel(String(t == null ? '' : t).replace(ADRESSE, '(adresse)'));
const propre = (t, n) => masquer(String(t == null ? '' : t).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/[{}<>]/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, n);
const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/* Une règle proposée est-elle recevable ? Rend { ok:true, regle, constat } ou { ok:false, raison }. Le brut vient du modèle : rien n'est supposé. */
function jugerRegle(brut) {
  const b = brut && typeof brut === 'object' && !Array.isArray(brut) ? brut : {};
  if (typeof b.regle !== 'string') return { ok: false, raison: 'forme' };
  const brutRegle = b.regle.replace(/\s+/g, ' ').trim();
  for (const [nom, re] of INTERDITS) if (re.test(brutRegle)) return { ok: false, raison: 'interdit:' + nom };
  const regle = propre(brutRegle, REGLE_MAX + 1);
  if (regle.length < REGLE_MIN) return { ok: false, raison: 'trop_courte' };
  if (regle.length > REGLE_MAX) return { ok: false, raison: 'trop_longue' };
  if (regle !== brutRegle) return { ok: false, raison: 'caracteres' };   // une adresse, un numéro ou un caractère de commande dans une règle : on ne la corrige pas, on la refuse
  const constat = typeof b.constat === 'string' ? propre(b.constat, CONSTAT_MAX) : '';
  return { ok: true, regle, constat };
}

module.exports = function monterRevue(app, ctx) {
  const { DATA_DIR, monPatronStrict, agents, conversations, cerveau } = ctx;
  const maintenant = typeof ctx.maintenant === 'function' ? ctx.maintenant : () => Date.now();
  const pousse = typeof ctx.pousseNotif === 'function' ? ctx.pousseNotif : null;
  const equipe = () => (typeof ctx.equipe === 'function' ? ctx.equipe() : ctx.equipe) || null;
  const reunions = () => (typeof ctx.reunions === 'function' ? ctx.reunions() : ctx.reunions) || null;
  const registre = new Map(agents.AGENTS.map(a => [a.id, a]));
  const IDS = new Set(registre.keys());
  const nomDe = id => (registre.get(id) || {}).nom || id;

  /* ── le rangement : un fichier, jamais écrit par-dessus un fichier qu'on n'a pas su lire ── */
  let illisible = false;
  function charger() {
    let brut;
    try { brut = fs.readFileSync(path.join(DATA_DIR, F_REVUE), 'utf8'); }
    catch (e) { if (e && e.code === 'ENOENT') return { revues: [], regles: [] }; illisible = true; return { revues: [], regles: [] }; }
    try {
      const j = JSON.parse(brut);
      if (!j || typeof j !== 'object' || Array.isArray(j) || !Array.isArray(j.revues) || !Array.isArray(j.regles)) throw new Error('forme');
      return { revues: j.revues.filter(x => x && typeof x === 'object' && typeof x.cle === 'string'), regles: j.regles.filter(x => x && typeof x === 'object' && ID_REGLE.test(String(x.id)) && IDS.has(x.agent) && typeof x.regle === 'string') };
    } catch (e) { illisible = true; return { revues: [], regles: [] }; }
  }
  function ecrire() {
    if (illisible) { console.error('⛔ ' + F_REVUE + ' NON réécrit : il était illisible au démarrage — le réparer, puis redémarrer'); return false; }
    try { const f = path.join(DATA_DIR, F_REVUE), tmp = f + '.tmp'; fs.writeFileSync(tmp, JSON.stringify({ revues: etat.revues, regles: etat.regles })); fs.renameSync(tmp, f); return true; }
    catch (e) { console.error(F_REVUE + ' non écrit :', e.message); return false; }
  }
  const etat = charger();
  /* Une revue que le redémarrage a coupée : « interrompue » — elle ne se rejoue pas seule dans la même fenêtre (ses agents déjà servis ne le sont pas deux fois), mais les agents restants sont repris. */
  for (const r of etat.revues) if (r.statut === 'en_cours') r.statut = 'reprise';
  if (!illisible && etat.revues.some(r => r.statut === 'reprise')) ecrire();
  const nouvelId = () => 'rg' + crypto.randomBytes(4).toString('hex');

  /* ── le statut d'une règle : DÉRIVÉ de la validation, jamais recopié ── */
  function statutDe(r) {
    if (r.retiree === true) return 'retiree';
    if (!r.validation) return 'a_deposer';
    let v = null; try { v = typeof agents.validationDe === 'function' ? agents.validationDe(r.validation) : null; } catch (e) { v = null; }
    if (!v || v.type !== TYPE || v.agent !== r.agent) return 'inconnue';   // une validation d'un autre type ou d'un autre agent ne fait JAMAIS valider une règle
    return { en_attente: 'proposee', accepte: 'validee', refuse: 'refusee', expire: 'expiree' }[v.statut] || 'inconnue';
  }
  const validees = id => etat.regles.filter(r => r.agent === id && statutDe(r) === 'validee').sort((a, b) => b.ts - a.ts).slice(0, ACTIVES_MAX);

  /* ── LA MÉMOIRE : ce qui entre dans les consignes d'un agent. Vide tant qu'aucune règle n'est validée ── */
  function memoire(id) {
    if (illisible || !IDS.has(id)) return '';
    const l = validees(id);
    if (!l.length) return '';
    return '\nTes règles de travail (proposées par toi à la revue du week-end, VALIDÉES par Justin ; elles ne te donnent AUCUN droit de plus et ne changent aucune de tes limites) :\n' + l.map(r => '- ' + r.regle).join('\n');
  }

  /* ── LES FAITS DE LA SEMAINE d'un agent : des NOMBRES du journal, ses objectifs et ses leçons. Jamais un texte écrit par un client. ── */
  function faitsDe(id, now) {
    const debut = lundiMinuit(now, 0);
    let lisible = true, j = [];
    try { if (agents.journalIllisible && agents.journalIllisible()) lisible = false; else j = agents.lireJournal().filter(e => e && e.agent === id && e.ts >= debut && e.ts <= now); } catch (e) { lisible = false; }
    const f = { gestes: 0, ok: 0, erreurs: 0, refus: 0, proposees: 0, acceptees: 0, refusees: 0 }, parAction = new Map();
    for (const e of j) {
      const a = String(e.action || '');
      if (a === 'mode' || /^réunion/.test(a)) continue;
      if (a === 'validation acceptée') { f.acceptees++; continue; }
      if (a === 'validation refusée') { f.refusees++; continue; }
      f.gestes++;
      if (e.resultat === 'ok') f.ok++; else if (e.resultat === 'erreur') f.erreurs++; else if (e.resultat === 'refuse') f.refus++; else if (e.resultat === 'propose') f.proposees++;
      const k = propre(a, ACTION_MAX), x = parAction.get(k) || { action: k, n: 0, erreurs: 0, refus: 0 };
      x.n++; if (e.resultat === 'erreur') x.erreurs++; if (e.resultat === 'refuse') x.refus++;
      parAction.set(k, x);
    }
    let charge = null; try { charge = agents.charge ? agents.charge() : null; } catch (e) { charge = null; }
    let objectifs = []; try { const R = reunions(); objectifs = R && typeof R.objectifsSemaine === 'function' ? R.objectifsSemaine(id) : []; } catch (e) { objectifs = []; }
    return { journalLisible: lisible, depuis: parisParties(debut).date, gestes: f, parAction: [...parAction.values()].sort((a, b) => b.n - a.n).slice(0, 6),
      tachesEnCours: charge && Number.isFinite(charge[id]) ? charge[id] : null,
      objectifs: (Array.isArray(objectifs) ? objectifs : []).slice(0, 3).map(o => ({ texte: propre(o.texte, 120), mesure: propre(o.mesure, 120), bilan: o.statut ? propre(o.statut, 12) : null })) };
  }

  const OUTIL = { name: 'proposer_regles', description: 'Proposer à Justin deux ou trois règles de travail pour la semaine qui vient, d’après les faits de ta semaine. Chaque règle : une phrase à l’impératif (130 caractères au plus) et le constat chiffré qui la justifie (45 caractères au plus).',
    input_schema: { type: 'object', properties: { regles: { type: 'array', minItems: 1, maxItems: PAR_AGENT, items: { type: 'object', properties: { regle: { type: 'string' }, constat: { type: 'string' } }, required: ['regle', 'constat'], additionalProperties: false } } }, required: ['regles'], additionalProperties: false } };

  const CONSIGNE = 'REVUE DU WEEK-END. C’est le week-end : tu relis TA semaine, d’après les faits ci-dessous, et tu proposes à Justin DEUX ou TROIS règles de travail pour la semaine qui vient (outil proposer_regles). ' +
    'Une règle : une phrase à l’impératif, concrète et vérifiable, qui améliore ton jugement ou ton écrit — par exemple « Avant de citer un chiffre, relire sa date dans le relevé ». Elle part d’un constat chiffré de ta semaine. ' +
    'Une règle ne te donne AUCUN droit de plus et ne change aucune de tes limites : elle te fait mieux travailler dans ce que ta fiche te permet déjà. Elle ne parle ni d’argent, ni d’accès, ni de suppression, ni d’envoi, ni de se passer d’une validation. ' +
    'Si tes règles actuelles disent déjà la même chose, propose-en une autre ; si ta semaine est vide, propose une règle de méthode. Rien ne s’applique avant la validation de Justin, lundi.';

  /* ── le déroulé ── */
  let enCours = null;
  const sous = { cle: '' };
  const journal = (id, resultat, detail, cible) => { try { agents.noter(id, 'réunion : revue du week-end', { cible: cible || '', resultat, detail: String(detail || '').slice(0, 80) }); } catch (e) {} };

  function deposer(r) {
    const resume = 'Règle pour ' + nomDe(r.agent) + ' : ' + r.regle + (r.constat ? ' — constat : ' + r.constat : '');
    /* un redémarrage entre `proposer` et l'inscription de `r.validation` a pu laisser une validation vivante pour CETTE règle : on la retrouve, on n'en dépose pas une seconde */
    let existante = ''; try { existante = typeof agents.retrouverValidation === 'function' ? agents.retrouverValidation(r.agent, TYPE, 'regle', r.id) : ''; } catch (e) { existante = ''; }
    if (existante) { r.validation = existante; return { ok: true }; }
    const p = agents.proposer(r.agent, TYPE, resume, { regle: r.id });
    if (p && p.ok) { r.validation = p.id; return { ok: true }; }
    return { ok: false, raison: (p && p.raison) || 'erreur' };
  }
  /* Les règles qui attendent une place dans la file (elle était pleine, l'agent était fermé) : reprises à chaque passage. */
  function deposerEnAttente() {
    let n = 0, change = false;
    for (const r of etat.regles) {
      if (r.retiree === true || r.validation) continue;
      if (!agents.peutAgir(r.agent).ok) continue;
      if (typeof agents.placeLibre === 'function' && !agents.placeLibre(r.agent)) continue;   // sa file (ou la file entière) est pleine : on n'insiste pas, ni ne note un refus par minute au journal
      const d = deposer(r);
      if (d.ok) { n++; change = true; ecrire(); }
    }
    if (change) ecrire();
    return n;
  }

  /* Au-delà de REGLES_MAX, on oublie les plus anciennes règles REFUSÉES, EXPIRÉES ou RETIRÉES — jamais une règle qui attend ou qui sert. */
  function elaguer() {
    if (etat.regles.length <= REGLES_MAX) return;
    let exces = etat.regles.length - REGLES_MAX;
    etat.regles = etat.regles.filter(r => { if (exces > 0 && ['refusee', 'expiree', 'retiree'].includes(statutDe(r))) { exces--; return false; } return true; });
  }

  async function reviser(id, R, now) {
    const p = agents.peutAgir(id);
    if (!p.ok) return { cause: p.raison };
    const eq = equipe();
    if (!eq || typeof eq.systemDe !== 'function') return { cause: 'messagerie' };
    const faits = faitsDe(id, now);
    let r;
    try {
      r = await cerveau.penser(id, eq.systemDe(id) + '\n\n' + CONSIGNE, [{ role: 'user', content: 'Ta semaine (relevé du serveur, des nombres ; semaine ' + R.semaine + ') :\n' + JSON.stringify(faits) + '\n\nPropose maintenant tes règles avec l’outil proposer_regles.' }],
        { outils: [OUTIL], forcerOutil: 'proposer_regles', maxTokens: 900 });
    } catch (e) { return { cause: 'erreur_api' }; }
    if (!r || !r.ok) return { cause: (r && r.raison) || 'erreur_api' };
    const a = (Array.isArray(r.actions) ? r.actions : []).find(x => x && x.nom === 'proposer_regles');
    const liste = a && a.entree && Array.isArray(a.entree.regles) ? a.entree.regles.slice(0, PAR_AGENT) : [];
    if (!liste.length) return { cause: 'vide' };
    /* chaque règle est jugée par le CODE ; une règle déjà connue de CET agent (toute règle déjà proposée, acceptée ou refusée comprise) ne se repropose pas */
    const connues = new Set(etat.regles.filter(x => x.agent === id).map(x => norm(x.regle)));
    let posees = 0, ecartees = 0;
    for (const brut of liste) {
      const j = jugerRegle(brut);
      if (!j.ok) { ecartees++; journal(id, 'refuse', 'règle écartée : ' + j.raison, R.semaine); continue; }
      const k = norm(j.regle);
      if (connues.has(k)) { ecartees++; journal(id, 'refuse', 'règle écartée : déjà proposée', R.semaine); continue; }
      if (etat.regles.filter(x => x.agent === id && x.semaine === R.semaine).length >= PAR_AGENT) break;
      connues.add(k);
      etat.regles.push({ id: nouvelId(), agent: id, semaine: R.semaine, ts: now, regle: j.regle, constat: j.constat, validation: '' });
      posees++;
    }
    elaguer();
    if (posees && !ecrire()) return { cause: 'ecriture' };
    return { posees, ecartees };
  }

  async function derouler(R) {
    const ordre = agents.AGENTS.map(a => a.id);
    for (const id of ordre) {
      const s = R.agents[id] || (R.agents[id] = { statut: 'a_faire', essais: 0 });
      if (s.statut === 'ok' || s.statut === 'arret' || s.essais >= ESSAIS_MAX) continue;
      if (R.fenetre && maintenant() >= R.fenetre) break;   // la fenêtre du week-end est close
      if (s.prochain && maintenant() < s.prochain) continue;   // un essai raté se reprend plus tard, pas à la minute suivante
      s.essais++;
      let x; try { x = await reviser(id, R, maintenant()); } catch (e) { x = { cause: 'erreur' }; }
      if (x.cause) {
        /* à l'arrêt : il n'a pas de semaine à relire, on ne réessaie pas ; le reste (hors heures, pause, budget, panne) se reprend au passage suivant */
        s.statut = x.cause === 'arret' ? 'arret' : 'saute'; s.cause = x.cause; s.prochain = maintenant() + ESSAI_ESPACE_MS;
        journal(id, x.cause === 'arret' ? 'refuse' : 'erreur', 'revue non faite : ' + x.cause, R.semaine);
        if (['pas_de_cle', 'budget_illisible', 'plafond_total', 'filet_jour', 'pause', 'etat_illisible'].includes(x.cause)) break;   // une cause qui vaut pour tous : inutile d'essayer les suivants
      } else {
        s.statut = 'ok'; s.posees = x.posees; s.ecartees = x.ecartees; delete s.cause;
        journal(id, 'ok', x.posees + ' règle(s) proposée(s)', R.semaine);
      }
      ecrire();
    }
    deposerEnAttente();
    const fini = ordre.every(id => { const s = R.agents[id]; return s && (s.statut === 'ok' || s.statut === 'arret' || s.essais >= ESSAIS_MAX); });
    if (fini || (R.fenetre && maintenant() >= R.fenetre)) cloturer(R);
    else ecrire();
  }

  function cloturer(R) {
    if (R.statut === 'terminee') return;
    R.statut = 'terminee'; R.finReelle = maintenant();
    ecrire(); annoncer(R);
  }

  function annoncer(R) {
    const regles = etat.regles.filter(r => r.semaine === R.semaine && r.retiree !== true);
    const agentsAvec = new Set(regles.map(r => r.agent));
    const ratees = Object.entries(R.agents || {}).filter(([id, a]) => a && a.statut !== 'ok' && a.statut !== 'arret').length;
    const manque = ratees ? ' ' + ratees + ' agent' + (ratees > 1 ? 's n’ont' : ' n’a') + ' pas pu relire ' + (ratees > 1 ? 'leur' : 'sa') + ' semaine (panne, budget ou heures de travail) : tu peux relancer la revue depuis la Tour.' : '';
    if (!regles.length) {
      if (!ratees) return;
      const t0 = 'Revue du week-end : aucune règle posée.' + manque;
      try { conversations.systeme(FIL, t0, { cle: 'revue:' + R.semaine, unique: true }); } catch (e) {}
      if (pousse) { try { Promise.resolve(pousse('Revue du week-end', 'Aucune règle posée : ' + ratees + ' agent(s) n’ont pas pu relire leur semaine', '/tour.html#agents')).catch(() => {}); } catch (e) {} }
      return;
    }
    const texte = 'Revue du week-end : ' + regles.length + ' règle' + (regles.length > 1 ? 's' : '') + ' proposée' + (regles.length > 1 ? 's' : '') + ' par ' + agentsAvec.size + ' agent' + (agentsAvec.size > 1 ? 's' : '') +
      '. Elles attendent ta validation dans la Tour (Agents, onglet Validations) : rien ne s’applique avant ton accord.' + manque;
    try { conversations.systeme(FIL, texte, { cle: 'revue:' + R.semaine, unique: true }); } catch (e) {}
    if (pousse) { try { Promise.resolve(pousse('Revue du week-end', regles.length + ' règle' + (regles.length > 1 ? 's' : '') + ' à valider (' + agentsAvec.size + ' agents)', '/tour.html#agents')).catch(() => {}); } catch (e) {} }
  }

  function demarrer(d, manuel) {
    if (illisible) return { ok: false, raison: 'illisible' };
    if (enCours) return { ok: false, raison: 'en_cours' };
    if (typeof agents.enPause === 'function' && agents.enPause()) return { ok: false, raison: 'pause' };
    let R = etat.revues.find(r => r.cle === d.cle);
    if (R && manuel && R.statut === 'terminee') return { ok: false, raison: 'deja' };
    if (!R) {
      R = { cle: d.cle, semaine: d.semaine, ts: maintenant(), statut: 'en_cours', manuel: !!manuel, agents: {}, fenetre: manuel ? 0 : (d.fin || 0) };
      etat.revues.push(R);
      if (etat.revues.length > REVUES_MAX) etat.revues = etat.revues.slice(-REVUES_MAX);
      if (!ecrire()) { etat.revues.pop(); return { ok: false, raison: 'ecriture' }; }
    } else if (R.statut === 'terminee') { deposerEnAttente(); return { ok: false, raison: 'deja' }; }
    else { R.statut = 'en_cours'; if (d.fin && !R.fenetre && !R.manuel) R.fenetre = d.fin; }
    const promesse = derouler(R).catch(e => { console.error('revue du week-end :', e && e.message); }).then(() => { enCours = null; });
    enCours = { cle: d.cle, promesse };
    return { ok: true, cle: d.cle };
  }

  function tic() {
    if (enCours) return { saute: 'en_cours' };
    const now = maintenant();
    const d = dueA(now);
    if (!d) {
      if (illisible) return { saute: 'illisible' };
      for (const R of etat.revues) if (R.statut !== 'terminee' && R.fenetre && now >= R.fenetre) cloturer(R);   // la fenêtre est close : ce qui n'a pas pu se faire ne se fera pas, et c'est dit
      if (etat.regles.some(r => !r.validation && r.retiree !== true)) deposerEnAttente();
      return { saute: 'pas_l_heure' };
    }
    if (illisible) return { saute: 'illisible' };
    const r = demarrer(d, false);
    return r.ok ? { lancee: r.cle } : { saute: r.raison };
  }

  /* ── les routes (PATRON SEUL : les règles sont du texte que les agents ont écrit d'après leur semaine) ── */
  const vueRegle = r => ({ id: r.id, agent: r.agent, semaine: r.semaine, ts: r.ts, regle: r.regle, constat: r.constat || '', statut: statutDe(r) });
  app.get('/api/monitor/agents/revue', monPatronStrict, (req, res) => {
    if (illisible) return res.status(503).json({ error: 'La revue du week-end est illisible' });
    const now = maintenant();
    const regles = etat.regles.map(vueRegle);
    const par = {}; for (const r of regles) (par[r.agent] = par[r.agent] || []).push(r);
    const der = etat.revues.slice(-1)[0] || null;
    res.json({ ok: true, prochaine: prochaineApres(now), enCours: enCours ? { cle: enCours.cle } : null,
      derniere: der ? { cle: der.cle, semaine: der.semaine, statut: der.statut, ts: der.ts, fin: der.finReelle || 0 } : null,
      aValider: regles.filter(r => r.statut === 'proposee').length, regles: par });
  });
  app.post('/api/monitor/agents/revue/lancer', monPatronStrict, (req, res) => {
    const now = maintenant(), p = parisParties(now);
    /* ⛔ une revue lancée À LA MAIN a sa propre clé (le jour) et sa propre semaine : elle ne consomme jamais la revue du week-end, et ses règles ne comptent pas dans les trois du week-end */
    const r = demarrer({ cle: 'revue:manuel:' + p.date, semaine: 'manuel-' + p.date }, true);
    if (r.ok) return res.json({ ok: true });
    const MSG = { en_cours: [409, 'Une revue est déjà en cours'], illisible: [503, 'La revue du week-end est illisible : rien n’est lancé'], pause: [409, 'Les agents sont en pause : reprends-les d’abord'],
      deja: [409, 'La revue de cette semaine est déjà faite'], ecriture: [503, 'Revue non enregistrée'] }[r.raison] || [400, 'Revue non lancée'];
    res.status(MSG[0]).json({ error: MSG[1] });
  });
  app.post('/api/monitor/agents/revue/retirer', monPatronStrict, (req, res) => {
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    if (typeof b.id !== 'string' || !ID_REGLE.test(b.id)) return res.status(400).json({ error: 'Identifiant de règle manquant' });
    if (illisible) return res.status(503).json({ error: 'La revue du week-end est illisible : rien n’est modifié' });
    const r = etat.regles.find(x => x.id === b.id);
    if (!r) return res.status(404).json({ error: 'Règle inconnue' });
    r.retiree = true;
    if (!ecrire()) { delete r.retiree; return res.status(503).json({ error: 'Changement non enregistré' }); }
    try { agents.noter(r.agent, 'règle retirée', { cible: 'règle', resultat: 'ok', qui: req.tourUser && req.tourUser.nom }); } catch (e) {}
    res.json({ ok: true });
  });

  return { tic, memoire, demarrer: d => demarrer(d, true), attendre: () => (enCours ? enCours.promesse : Promise.resolve()), estIllisible: () => illisible, regles: () => etat.regles.map(vueRegle), deposerEnAttente };
};
module.exports.dueA = dueA;
module.exports.prochaineApres = prochaineApres;
module.exports.jugerRegle = jugerRegle;
module.exports.INTERDITS = INTERDITS;
module.exports.TYPE = TYPE;
module.exports.REGLE_MAX = REGLE_MAX;
module.exports.PAR_AGENT = PAR_AGENT;
module.exports.ACTIVES_MAX = ACTIVES_MAX;

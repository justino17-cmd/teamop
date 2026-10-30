/* NINA — la sécurité, le RGPD, les contrats (23 octobre 2026). Catégories de la Tour : Accès, Contrats.
 *
 * Justin : « je veux des agents qui gèrent toutes les catégories de la Tour ». Nina tient trois choses, et chacune lit ce que le serveur relève DÉJÀ — rien d'inventé :
 *  1. LES CONNEXIONS SUSPECTES : les verrous que le serveur pose (cinq échecs d'affilée à la Tour : quinze minutes ; huit échecs sur un compte du portail : quinze minutes), les
 *     preuves de clé d'équipe refusées (`cles.invalide`, qui doit rester à zéro) et le courrier refusé à de vraies entreprises (`mailRefus`, la règle de `surveillance.js`).
 *     Le moteur de veille (`plateforme-sentinelle.js`) les annonce une fois par épisode ; un verrou s'annonce sans ouvrir d'incident (une faute de frappe en pose un).
 *  2. LES DEMANDES RGPD que Camille lui passe (une tâche « escalade_humain » de motif « rgpd », dont la seule donnée est une RÉFÉRENCE) : Nina l'accuse à Camille, tient le délai
 *     légal d'UN MOIS, prévient Justin tout de suite puis à J-10, J-3, le jour même et chaque jour de retard, jusqu'à ce que Justin la marque traitée dans la Tour.
 *  3. LES SIGNATURES DE CONTRATS (`contrats.js`) : elle relance JUSTIN de ce qui attend — des contrats envoyés et pas signés, des pièces sans version validée.
 *
 * ⛔ NINA NE CHANGE AUCUN ACCÈS, AUCUN MOT DE PASSE, AUCUNE RÈGLE ET N'EFFACE RIEN : `supprimer_donnees` est un geste fixe, `mise_en_demeure` et `changer_contrat` aussi. Elle
 *    constate, elle rappelle les délais, elle écrit à Justin. Elle ne relance aucun client elle-même.
 * ⛔ UNE DEMANDE RGPD N'EST PAS RANGÉE DANS UNE TÂCHE DE 48 HEURES : la file de tâches entre agents expire en deux jours, le délai légal dure un mois. Nina la prend (la tâche de Camille
 *    est terminée), la range dans SA mémoire (`plateforme-etat.js`, écrite par un temporaire puis un renommage) et la tient là. Rien de la personne n'y entre : une référence, une
 *    date, un statut. Si la mémoire ne s'écrit pas, la tâche est rendue en échec — jamais une demande perdue en silence.
 * ⛔ Nina n'appelle jamais Claude dans sa boucle : le code surveille. Elle ne lit aucun texte de client ; ses phrases sont à nous.
 * Toutes les dépendances sont INJECTÉES.
 */
'use strict';
const crypto = require('crypto');
const sentinelle = require('./plateforme-sentinelle');
const O = require('./plateforme-outils');

const ID = 'nina';
const SEMAINE_MS = 7 * 86400000;
const OUVERTES_MAX = 50;
const TACHES_PAR_PASSAGE = 5;
const CONTRATS_JOURS_MIN = 3;           // un contrat envoyé depuis moins de trois jours n'a pas encore de retard à relancer

module.exports = function agentNina(ctx) {
  const { agents, conversations, etat } = ctx;
  const maintenant = typeof ctx.maintenant === 'function' ? ctx.maintenant : Date.now;
  const sante = typeof ctx.sante === 'function' ? ctx.sante : (async () => null);
  const nombre = x => (typeof x === 'number' && Number.isFinite(x)) ? x : null;
  const lire = f => { try { return typeof f === 'function' ? f() : null; } catch (e) { return null; } };

  /* L'état de santé de Nina = celui de tous, plus ce que le SERVEUR relève et que /health ne publie pas (`j.securite`). La série des preuves de clé refusées est cumulée
     depuis le démarrage : on ne crie que sur ce qui MONTE depuis le dernier passage (le premier passage fixe la base). */
  async function santeNina() {
    const j = await sante();
    if (!j || typeof j !== 'object') return j;
    const sec = lire(ctx.securite) || {};
    const m = etat.agent(ID);
    const inv = nombre(sec.clesInvalides);
    let delta = 0;
    if (inv !== null) { delta = typeof m.clesInvalides === 'number' ? Math.max(0, inv - m.clesInvalides) : 0; m.clesInvalides = inv; }
    /* Le courrier refusé, MOTIF PAR MOTIF et depuis le dernier passage : `mailRefus.ts` est la date du dernier refus de n'importe quel motif, il ne dit pas lequel (un « inconnu » forgé
       aurait réveillé la règle sur un vieil « invalide »). Compteur cumulé depuis le démarrage du serveur : s'il a baissé, le serveur a redémarré, tout ce qu'il porte est neuf. */
    const mr = j.mailRefus && typeof j.mailRefus === 'object' && j.mailRefus.parMotif && typeof j.mailRefus.parMotif === 'object' ? j.mailRefus.parMotif : null;
    const monte = (motif, cle) => {
      if (!mr) return null;
      const x = nombre(mr[motif]) || 0;                      // un motif qui n'a jamais refusé n'a pas de clé : zéro
      const avant = m[cle]; m[cle] = x;
      return typeof avant === 'number' ? (x >= avant ? x - avant : x) : 0;
    };
    const refusInvalides = monte('invalide', 'refusInvalides'), refusInconnus = monte('inconnu', 'refusInconnus');
    return Object.assign({}, j, { securite: { verrousTour: nombre(sec.verrousTour), verrousPortail: nombre(sec.verrousPortail), clesInvalides: delta, refusInvalides, refusInconnus } });
  }
  const moteur = sentinelle(Object.assign({}, ctx, { proprio: ID, fil: 'plateforme', sante: santeNina }));
  if (!agents || !conversations || !etat) return moteur;
  const nomDe = id => ((agents.AGENTS || []).find(a => a.id === id) || {}).nom || id;
  const note = (action, o) => { try { agents.noter(ID, action, o); } catch (e) {} };
  const parler = (fil, texte, niveau) => { try { return conversations.parler(ID, fil, texte, { niveau }); } catch (e) { return { ok: false, raison: 'erreur' }; } };
  const dit = d => d.ok || d.raison === 'doublon';
  const memoire = () => { const m = etat.agent(ID); if (!Array.isArray(m.rgpd)) m.rgpd = []; return m; };
  const ouvertes = () => memoire().rgpd.filter(r => r && r.statut === 'ouverte');
  const reste = r => O.joursEntre(maintenant(), r.limite);

  /* ── 2. LES DEMANDES RGPD ── */
  function enregistrer(t) {
    const m = memoire(), now = maintenant();
    const fin = (resultat, resume) => { try { agents.terminer(t.id, ID, resultat, resume); } catch (e) {} };
    if (t.type !== 'escalade_humain' || !t.params || t.params.motif !== 'rgpd') { fin('echec', 'Ce n’est pas une demande que Nina traite'); note('tâche reçue', { cible: String(t.type).slice(0, 30), resultat: 'refuse', detail: 'pas une demande RGPD', qui: t.de }); return 0; }
    if (m.rgpd.some(r => r.fil === t.params.fil && r.statut === 'ouverte')) { fin('ok', 'Déjà suivie'); return 0; }
    if (ouvertes().length >= OUVERTES_MAX) { fin('echec', 'Trop de demandes ouvertes'); note('demande RGPD', { cible: 'rgpd', resultat: 'refuse', detail: 'plafond de demandes ouvertes' }); return 0; }
    const r = { id: 'g' + crypto.randomBytes(5).toString('hex'), fil: t.params.fil, de: String(t.de).slice(0, 20), recu: now, limite: O.plusUnMois(now), statut: 'ouverte', rappels: [], accuse: false };
    m.rgpd.push(r);
    if (!etat.sauver()) { m.rgpd.pop(); fin('echec', 'Mémoire non écrite : la demande est rendue'); note('demande RGPD', { cible: 'rgpd', resultat: 'erreur', detail: 'mémoire non écrite, tâche rendue' }); return 0; }
    fin('ok', 'Demande RGPD prise en charge ; délai légal jusqu’au ' + O.dateLongue(r.limite));
    note('demande RGPD reçue', { cible: 'rgpd', resultat: 'ok', detail: 'délai jusqu’au ' + O.dateLongue(r.limite), qui: t.de });
    return 1;
  }
  /* ⛔ LE CÔTÉ ÉMISSION : personne ne dépose de tâche « escalade_humain / rgpd » dans le serveur tel qu'il est (revue du 23 octobre 2026 : aucun code, hors des bancs). Justin enregistre donc la
     demande lui-même, depuis la Tour, avec SA DATE DE RÉCEPTION — le délai légal d'un mois court depuis le jour où la demande est arrivée, pas depuis le jour où on la saisit. Rien de la
     personne n'entre : une date, qui l'a saisie. Refusée : une date dans le futur, ou de plus de quatre mois (une faute de frappe d'année). Si Camille ou le courrier déposent un jour la tâche,
     `enregistrer()` la prend comme avant. */
  const RGPD_REMONTE_MAX_MS = 122 * 86400000;
  function declarer(recu, qui) {
    if (etat.illisible()) return { ok: false, raison: 'memoire_illisible' };
    const now = maintenant();
    if (typeof recu !== 'number' || !Number.isFinite(recu) || recu > now) return { ok: false, raison: 'date_future' };
    if (recu < now - RGPD_REMONTE_MAX_MS) return { ok: false, raison: 'date_ancienne' };
    const m = memoire();
    if (ouvertes().length >= OUVERTES_MAX) return { ok: false, raison: 'plafond' };
    const r = { id: 'g' + crypto.randomBytes(5).toString('hex'), fil: 'saisie-' + crypto.randomBytes(4).toString('hex'), de: 'justin', recu, limite: O.plusUnMois(recu), statut: 'ouverte', rappels: [], accuse: false };
    m.rgpd.push(r);
    if (!etat.sauver()) { m.rgpd.pop(); return { ok: false, raison: 'ecriture' }; }
    note('demande RGPD saisie', { cible: 'rgpd', resultat: 'ok', detail: 'délai jusqu’au ' + O.dateLongue(r.limite), qui: String(qui || '').slice(0, 40) });
    return { ok: true, id: r.id, limite: r.limite };
  }
  /* L'accusé : à Camille (qui garde le contact avec le demandeur) dans « Équipe », et la tâche pour Justin dans le fil privé de Nina. Marqué fait quand les deux sont partis. */
  function accuser() {
    let n = 0;
    for (const r of ouvertes()) {
      if (r.accuse) continue;
      if (!agents.peutAgir(ID).ok) break;
      const jours = reste(r), lim = O.dateLongue(r.limite);
      const camille = agents.AGENTS.some(a => a.id === r.de) && r.de !== ID;
      const dEq = parler('equipe', (camille ? '@' + nomDe(r.de) + ', j’ai bien reçu ' : 'J’ai bien reçu ') + 'la demande d’exercice de droits (RGPD) : je la prends. Le délai légal est d’un mois, soit jusqu’au ' + lim + '. Pense à en accuser réception au demandeur depuis le courrier ; je tiens le délai et je préviens Justin.', 'info');
      const dJ = parler(ID, 'Justin, une demande d’exercice de droits (RGPD) vient d’arriver par ' + (camille ? nomDe(r.de) : 'le courrier') + ' : la lecture est dans le courrier. Le délai légal est d’un mois, donc réponse avant le ' + lim + ' (dans ' + jours + ' jours). ' +
        'À faire : vérifier l’identité du demandeur, rassembler ce qui le concerne, répondre. Je ne touche à aucune donnée ; un effacement, s’il est demandé, reste ton geste. Je te rappelle à J-10, J-3 et le jour même, et tu la marques « traitée » dans la Tour (Messagerie, groupe Plateforme, section Demandes RGPD).', 'important');
      if (dit(dEq) && dit(dJ)) { r.accuse = true; etat.sauver(); n++; note('demande RGPD accusée', { cible: 'rgpd', resultat: 'ok', detail: 'jusqu’au ' + lim }); }
    }
    return n;
  }
  /* Les rappels : une étape à la fois, jamais deux fois la même. */
  function etape(jours) { if (jours > 10) return null; if (jours > 3) return 'j10'; if (jours > 0) return 'j3'; if (jours === 0) return 'j0'; return 'retard:' + (-jours); }
  function rappeler() {
    let n = 0;
    for (const r of ouvertes()) {
      if (!r.accuse) continue;
      const jours = reste(r), e = etape(jours);
      if (!e || r.rappels.includes(e)) continue;
      if (!agents.peutAgir(ID).ok) break;
      const lim = O.dateLongue(r.limite);
      const texte = e === 'j0' ? 'Justin, c’est aujourd’hui le dernier jour pour répondre à la demande RGPD (reçue le ' + O.dateLongue(r.recu) + ') : le délai légal d’un mois se termine ce soir.'
        : e.startsWith('retard') ? 'Justin, la demande RGPD reçue le ' + O.dateLongue(r.recu) + ' est en RETARD de ' + (-jours) + ' ' + O.pluriel(-jours, 'jour', 'jours') + ' : le délai légal d’un mois est dépassé depuis le ' + lim + '. Réponds-y, ou marque-la « traitée » dans la Tour (Messagerie, groupe Plateforme, section Demandes RGPD).'
        : 'Rappel RGPD : il reste ' + jours + ' ' + O.pluriel(jours, 'jour', 'jours') + ' pour répondre à la demande reçue le ' + O.dateLongue(r.recu) + ' (jusqu’au ' + lim + ').';
      const d = parler(ID, texte, e === 'j10' ? 'important' : 'urgent');
      if (dit(d)) { r.rappels.push(e); if (r.rappels.length > 60) r.rappels = r.rappels.slice(-60); etat.sauver(); n++; note('rappel RGPD', { cible: 'rgpd', resultat: 'ok', detail: e }); }
    }
    return n;
  }
  function recevoir() {
    let n = 0;
    for (let k = 0; k < TACHES_PAR_PASSAGE; k++) {
      const t = agents.prendre(ID);
      if (!t) break;
      n += enregistrer(t);
    }
    return n;
  }
  /* Justin marque la demande traitée (la Tour, `POST /api/monitor/agents/plateforme/rgpd`). Rend { ok } ou { ok:false, raison }. */
  function cloturer(id, qui) {
    if (etat.illisible()) return { ok: false, raison: 'memoire_illisible' };
    const r = memoire().rgpd.find(x => x && x.id === id);
    if (!r) return { ok: false, raison: 'inconnue' };
    if (r.statut !== 'ouverte') return { ok: true, deja: true };
    r.statut = 'traitee'; r.fin = maintenant();
    if (!etat.sauver()) { r.statut = 'ouverte'; delete r.fin; return { ok: false, raison: 'ecriture' }; }
    note('demande RGPD traitée', { cible: 'rgpd', resultat: 'ok', qui: String(qui || '').slice(0, 40) });
    return { ok: true };
  }
  const rgpd = () => memoire().rgpd.filter(r => r && r.statut === 'ouverte').map(r => ({ id: r.id, recu: r.recu, limite: r.limite, joursRestants: reste(r), accusee: r.accuse === true }));

  /* ── 3. LES SIGNATURES DE CONTRATS : relancer Justin de ce qui attend ── */
  function suivreContrats() {
    const c = lire(ctx.contrats && ctx.contrats.etat && (() => ctx.contrats.etat()));
    if (!c) return 0;
    const m = etat.agent(ID), now = maintenant();
    const avant = m.contrats && typeof m.contrats === 'object' ? m.contrats : { rappel: 0, enAttente: 0, bloques: 0 };
    const attend = c.enAttente > 0 && c.plusVieuxJours >= CONTRATS_JOURS_MIN, bloque = c.paquetsBloques > 0;
    if (!attend && !bloque) { if (avant.enAttente || avant.bloques) { m.contrats = { rappel: avant.rappel, enAttente: c.enAttente, bloques: c.paquetsBloques }; etat.sauver(); } return 0; }
    const monte = (attend && c.enAttente > avant.enAttente) || (bloque && c.paquetsBloques > avant.bloques);
    if (!monte && now - (avant.rappel || 0) < SEMAINE_MS) return 0;
    if (!agents.peutAgir(ID).ok) return 0;
    const morceaux = [];
    if (attend) morceaux.push(c.enAttente + ' ' + O.pluriel(c.enAttente, 'contrat envoyé attend', 'contrats envoyés attendent') + ' la signature du client, le plus ancien depuis ' + c.plusVieuxJours + ' jours');
    if (bloque) morceaux.push(c.paquetsBloques + ' ' + O.pluriel(c.paquetsBloques, 'formule ne peut pas partir', 'formules ne peuvent pas partir') + ' : une pièce n’a pas de version validée');
    const d = parler(ID, 'Contrats : ' + O.liste(morceaux) + '. Je ne relance aucun client moi-même ; à toi de dire si on lui écrit.' + (bloque ? ' Les pièces se valident dans la Tour (Contrats).' : ''), attend && c.plusVieuxJours >= 14 ? 'important' : 'info');
    if (!dit(d)) return 0;
    m.contrats = { rappel: now, enAttente: c.enAttente, bloques: c.paquetsBloques }; etat.sauver();
    note('contrats : rappel', { cible: 'contrats', resultat: 'ok', detail: c.enAttente + ' en attente, ' + c.paquetsBloques + ' formule(s) bloquée(s)' });
    return 1;
  }

  let enCours = false;
  async function passer() {
    const r = await moteur.passer();
    if (enCours) return r;
    enCours = true;
    try {
      if (agents.peutAgir(ID).ok && !etat.illisible()) {
        const suite = {};
        suite.rgpdRecues = recevoir(); suite.rgpdAccusees = accuser(); suite.rgpdRappels = rappeler(); suite.contrats = suivreContrats();
        return Object.assign({}, r, suite);
      }
      return r;
    } catch (e) {
      note('passage', { cible: 'rgpd', resultat: 'erreur', detail: String((e && e.message) || e).slice(0, 100) });
      return r;
    } finally { enCours = false; }
  }

  /* ── les relevés fermés que Nina donne à la conversation ── */
  const faits = {
    securite: () => {
      const sec = lire(ctx.securite) || {}, m = etat.agent(ID);
      const lim = ouvertes();
      return { verrousTour: nombre(sec.verrousTour), verrousPortail: nombre(sec.verrousPortail), preuvesRefuseesDepuisLeDemarrage: nombre(sec.clesInvalides),
        demandesRgpdOuvertes: lim.length, demandesRgpdEnRetard: lim.filter(r => reste(r) < 0).length, prochaineEcheanceRgpdJours: lim.length ? Math.min.apply(null, lim.map(reste)) : null,
        contratsEnAttente: m.contrats ? m.contrats.enAttente : null };
    },
    contrats: () => { const c = lire(ctx.contrats && ctx.contrats.etat && (() => ctx.contrats.etat())); return c ? { envoyes: c.envoyes, acceptes: c.acceptes, enAttente: c.enAttente, plusVieuxJours: c.plusVieuxJours, formulesBloquees: c.paquetsBloques, formules: c.paquetsTotal, piecesAConfirmer: c.piecesAConfirmer } : null; },
  };
  return Object.assign({}, moteur, { passer, cloturer, declarer, rgpd, faits });
};

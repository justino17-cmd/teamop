/* ⛔ CE QUE CE FICHIER GARDE — « ÉCOUTER » SOUS UN MESSAGE REÇU, ET « EN COURS » QUI NE DURE PAS POUR TOUJOURS (OP MESSAGES, 28 octobre 2026).

   Justin : « ça serait bien qu'ils puissent lire ça [mes vocaux] et même eux me répondre vocalement ». Décision déjà prise : la réponse vocale est d'abord un bouton « Écouter » — la SYNTHÈSE
   VOCALE DU NAVIGATEUR (`speechSynthesis`, voix française) ; de vrais vocaux fabriqués sur le serveur (Piper) viendront plus tard, peut-être. Ce banc EXTRAIT les VRAIES fonctions de la page
   (celle de l'aperçu ET celle que le service sert, générée) et les EXÉCUTE contre un `speechSynthesis` simulé — ce que Chromium du conteneur ne peut pas faire (il n'a aucune voix) :
     1. CE QUI EST LU : sans liens, sans mise en forme, sans arobase de mention ni émojis ; en morceaux de 200 signes au plus (Chrome coupe une longue lecture au bout d'une quinzaine de
        secondes) ; aucun mot perdu en route ;
     2. ⛔ LA VOIX : française et LOCALE seulement — une voix « Google » de Chrome envoie le texte à un serveur, ce que la page n'accepte pas ; pas de synthèse, pas de voix française locale
        (liste encore vide comprise : un Chrome de bureau sans voix ne montre jamais un bouton muet) : le lien ne paraît pas, et il paraît quand `voiceschanged` apporte la voix ;
     3. QUI A UN LIEN : un TEXTE reçu d'au moins une phrase — ni mon message, ni un vocal, une photo, un fichier, une carte, un message supprimé ou en cours d'envoi ;
     4. ⛔ LE GESTE : `speak` est appelé AVANT que la fonction rende la main (Safari n'accepte la voix que dans le geste — le moindre `await` avant, et l'iPhone reste muet), en `fr-FR`, une
        phrase par morceau, les objets gardés ; UN SEUL SON À LA FOIS (un autre message coupe le premier, toucher le même l'arrête, un vocal qui joue s'arrête), « Arrêter » pendant la lecture ;
     5. la voix se TAIT quand le message est supprimé ou modifié, quand la page se cache, quand on la quitte, quand un vocal prend la main (le texte de `lireVocal`, `ouvrirConv`, `fermerConv`) ;
     6. « EN COURS » NE DURE PAS POUR TOUJOURS : passé son délai (30 s + 1,5 s par seconde de vocal), la transcription dit « Ça prend plus longtemps que d'habitude » et propose « Réessayer » ;
        le délai repart au nouvel essai, s'efface quand le texte arrive ;
     7. le câblage : le lien est sous un message reçu (jamais dans le balisage mémorisé de la bulle avec son libellé), le clic est avant celui de la transcription, le menu a sa ligne,
        l'action du menu n'a aucun `await` avant elle, et AUCUNE expression à « lookbehind » dans la page (un Safari d'avant 16.4 ne compile plus le script).
   Les gestes sur la vraie page sont joués par `tests/sonde-opmessages-ecoute.js` (un navigateur, le vrai service, la vraie Tour). Les mutations : `scratchpad/mutations-vocaux.py`. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const RACINE = path.join(__dirname, '..');
const SOURCES = [['la page (aperçu)', path.join(RACINE, 'apercu', 'opmessages', 'index.html')], ['la page servie', path.join(RACINE, 'server-msg', 'public', 'opmsg-ui.js')]];
const sansCommentairesJs = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/(^|\s)\/\/\s.*$/gm, ' ');

function scriptDe(fichier) {
  const brut = fs.readFileSync(fichier, 'utf8');
  return fichier.endsWith('.html') ? (/<script>([\s\S]*?)<\/script>/.exec(brut) || [, ''])[1] : brut;
}

/* ── le monde simulé : une synthèse vocale qui note tout, des minuteries et une horloge à la main ── */
function monde(opts) {
  const o = Object.assign({ voix: [{ name: 'Amélie', lang: 'fr-FR', localService: true, default: true }], synthese: true }, opts || {});
  const m = { parles: [], annulations: 0, ecouteurs: {}, avis: [], arretsLecture: 0, rendus: 0, horloge: 1000000, minuteurs: [], liens: [], enAttente: [] };
  class Utt { constructor(t) { this.text = t; this.lang = ''; this.voice = null; this.onend = null; this.onerror = null; } }
  m.synth = {
    voix: o.voix, getVoices() { return this.voix; },
    speak(u) { m.parles.push({ u, text: u.text, lang: u.lang, voice: u.voice }); m.enAttente.push(u); },
    cancel() { m.annulations++; const q = m.enAttente.splice(0); for (const u of q) if (typeof u.onerror === 'function') u.onerror({ error: 'canceled' }); },
    addEventListener(t, f) { (m.ecouteurs['synth:' + t] = m.ecouteurs['synth:' + t] || []).push(f); },
  };
  m.finir = () => { const u = m.enAttente.shift(); if (u && typeof u.onend === 'function') u.onend({}); return !!u; };
  m.avancer = (ms) => { m.horloge += ms; for (const t of m.minuteurs.slice().sort((a, b) => a.a - b.a)) if (!t.fait && t.a <= m.horloge) { t.fait = true; t.f(); } };
  m.window = { SpeechSynthesisUtterance: Utt, addEventListener(t, f) { (m.ecouteurs['window:' + t] = m.ecouteurs['window:' + t] || []).push(f); } };
  if (o.synthese) m.window.speechSynthesis = m.synth;
  m.document = { visibilityState: 'visible', addEventListener(t, f) { (m.ecouteurs['document:' + t] = m.ecouteurs['document:' + t] || []).push(f); },
    querySelectorAll() { return m.liens; } };
  m.declencher = (cle, ev) => { for (const f of m.ecouteurs[cle] || []) f(ev || {}); };
  /* un lien « Écouter » simulé : ce que `peindreEcoute` lit et écrit */
  m.lien = (mid) => { const attrs = {}; const l = { dataset: { ecouter: mid }, textContent: 'Écouter', setAttribute(k, x) { attrs[k] = String(x); }, removeAttribute(k) { delete attrs[k]; }, getAttribute: k => attrs[k], attrs }; m.liens.push(l); return l; };
  return m;
}

/* la page n'a pas de DOM ici : on lui donne ce que le bloc lit, et on lui prend ce qu'il pose */
function monter(script, extra) {
  const i = script.indexOf('const ECOUTE_LIEN_MIN'), f = script.indexOf('async function ouvrirConv(', i);
  if (i < 0 || f < 0) return null;
  const m = monde(extra);
  const messages = [];
  const etat = { conv: 'c1', convDonnees: null };
  const ctx = { window: m.window, SpeechSynthesisUtterance: m.window.SpeechSynthesisUtterance, document: m.document, etat, MOI: { id: 'moi' }, Date, console,
    trouverMessage: id => messages.find(x => x.id === id) || null, estCarte: x => !!(x && (x.position || x.carteContact || x.sondage)),
    avis: t => m.avis.push(t), arreterLecture: () => { m.arretsLecture++; }, rendreIci: () => { m.rendus++; }, esc: s => String(s) };
  vm.createContext(ctx);
  vm.runInContext(script.slice(i, f) + '\nthis.E = { ecoute, ecouterMessage, arreterEcoute, verifierEcoute, texteParle, morceauxParle, voixFrancaise, synthesePossible, ecoutable, htmlEcouter, peindreEcoute, ECOUTE_LIEN_MIN, ECOUTE_MORCEAU };', ctx, { timeout: 3000 });
  return { m, E: ctx.E, messages, etat, ctx };
}
const msg = (id, texte, extra) => Object.assign({ id, auteur: 'robot', texte, t: 1 }, extra || {});

/* la partie « transcription » : tout ce que la page fait de l'attente, avec des minuteries à la main */
function monterTranscription(script) {
  const i = script.indexOf('let TR = null, trLu = 0;'), f = script.indexOf('/* ── ÉCOUTER UN MESSAGE', i);
  if (i < 0 || f < 0) return null;
  const m = monde(); const messages = [];
  const etat = { conv: 'c1', convDonnees: { id: 'c1', messages } };
  const ctx = { CAP: { transcription: true }, source: { transcrire: async () => ({ etat: 'attente' }), transcriptionOuverte: async () => ({ ouverte: true, dureeMaxS: 300 }) },
    etat, Date: { now: () => m.horloge }, console, Number, Math, String, Map, Set, Promise,
    setTimeout: (f, ms) => { const t = { a: m.horloge + ms, d: ms, f, fait: false, id: m.minuteurs.length + 1 }; m.minuteurs.push(t); return t.id; },
    clearTimeout: id => { const t = m.minuteurs.find(x => x.id === id); if (t) t.fait = true; },
    trouverMessage: id => messages.find(x => x.id === id) || null, esc: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'),
    $: () => ({ textContent: '' }), phrase: (er, defaut) => defaut, avis: () => {}, rendreConv: () => { m.rendus++; }, rendreIci: () => { m.rendus++; } };
  vm.createContext(ctx);
  vm.runInContext(script.slice(i, f) + '\nthis.R = { transcriptionPossible, htmlTranscription, trOuvertes, trLocal, trEtats, trDepuis, trLent, trSurveiller, annoncerTranscriptions, trDelaiLent, demanderTranscription, trEtat, basculerTranscription, poserTR: x => { TR = x; } };', ctx, { timeout: 3000 });
  return { m, R: ctx.R, messages, etat, ctx };
}

(async () => {
  console.log('── test-3130 · « Écouter » sous un message reçu, et « en cours » qui ne dure pas pour toujours ──');
  for (const [nom, fichier] of SOURCES) {
    console.log('\n── ' + nom);
    const script = scriptDe(fichier);
    const P = monter(script);
    vrai('(population) le bloc « Écouter » est trouvé dans ' + nom + ' et se compile', !!P && script.length > 100000);
    if (!P) continue;
    const { m, E, messages } = P;

    /* 1. ce qui est lu */
    const tp = E.texteParle;
    v('les liens ne sont pas lus (https, www)', tp('Voir https://exemple.fr/a?b=1 et www.exemple.fr/x puis rappeler'), 'Voir et puis rappeler');
    v('la mise en forme, l\'arobase d\'une mention et les émojis ne sont pas lus', tp('**Important** : @Léa, `code` _suite_ 👍🎤 ok'), 'Important : Léa, code suite ok');
    v('une liste à tirets et un titre : les signes de début de ligne disparaissent, chaque ligne devient une phrase', tp('# Titre\n- un\n- deux'), 'Titre. un. deux');
    v('rien à lire : une chaîne vide (et jamais « undefined »)', [tp(''), tp(null), tp(undefined), tp('https://seul.fr 👍')], ['', '', '', '']);
    v('un message sans rien de spécial reste identique', tp('Le devis DOS-000123 est parti ce matin.'), 'Le devis DOS-000123 est parti ce matin.');
    const longue = 'Une phrase assez longue pour le test. '.repeat(30).trim();
    const mc = E.morceauxParle(tp(longue));
    vrai('(population) le texte découpé a plusieurs morceaux', mc.length > 3);
    v('⛔ aucun morceau ne dépasse 200 signes (Chrome coupe une longue lecture au bout d\'une quinzaine de secondes)', mc.filter(x => x.length > E.ECOUTE_MORCEAU).length, 0);
    v('⛔ aucun mot perdu en route : les morceaux recollés redonnent le texte', mc.join(' '), tp(longue));
    const sansPonctuation = ('mot' + 'x'.repeat(5) + ' ').repeat(80).trim();
    const mp = E.morceauxParle(sansPonctuation);
    v('un texte SANS ponctuation se coupe aux espaces (jamais au milieu d\'un mot)', [mp.every(x => x.length <= 200), mp.join(' ') === sansPonctuation], [true, true]);
    const sansEspace = 'z'.repeat(450);
    const me = E.morceauxParle(sansEspace);
    v('…et un mot de 450 lettres, faute de mieux, se coupe à 200 (la lecture n\'est pas bloquée)', [me.every(x => x.length <= 200), me.join('')], [true, sansEspace]);
    v('une phrase seule : un seul morceau', E.morceauxParle('Bonjour, voici le point.'), ['Bonjour, voici le point.']);
    v('un point d\'exclamation, un point d\'interrogation et des points de suspension coupent aussi', E.morceauxParle('Un ! Deux ? Trois… Quatre.').join('|').length > 0 && E.morceauxParle('Un ! Deux ? Trois… Quatre.').join(' '), 'Un ! Deux ? Trois… Quatre.');

    /* 2. la voix */
    vrai('sans synthèse du tout : pas de lecture possible', !monter(script, { synthese: false }).E.voixFrancaise().ok);
    const sans = monter(script, { synthese: false }); v('…et le lien n\'est pas proposé', sans.E.synthesePossible(), false);
    v('⛔ liste de voix VIDE (pas encore chargée, ou aucune voix sur la machine) : PAS de lecture — un bouton qui ne dit rien est pire que pas de bouton', (() => { const x = monter(script, { voix: [] }); const r = x.E.voixFrancaise(); return [r.ok, r.voix, x.E.synthesePossible()]; })(), [false, null, false]);
    v('⛔ une voix française DISTANTE (« Google français » de Chrome : le texte part sur un serveur) n\'est JAMAIS prise', (() => { const x = monter(script, { voix: [{ name: 'Google français', lang: 'fr-FR', localService: false }] }); return [x.E.voixFrancaise().ok, x.E.synthesePossible()]; })(), [false, false]);
    v('des voix qui ne sont pas françaises : pas de lecture', monter(script, { voix: [{ name: 'Samantha', lang: 'en-US', localService: true }] }).E.voixFrancaise().ok, false);
    v('le français canadien local suffit, le français de France est préféré', (() => { const x = monter(script, { voix: [{ name: 'Chantal', lang: 'fr-CA', localService: true }, { name: 'Thomas', lang: 'fr_FR', localService: true }, { name: 'Sam', lang: 'en-US', localService: true }] }); return x.E.voixFrancaise().voix.name; })(), 'Thomas');
    v('une voix par défaut passe devant les autres de même langue', monter(script, { voix: [{ name: 'A', lang: 'fr-FR', localService: true }, { name: 'B', lang: 'fr-FR', localService: true, default: true }] }).E.voixFrancaise().voix.name, 'B');
    v('une voix distante ET une locale : la locale', monter(script, { voix: [{ name: 'Google français', lang: 'fr-FR', localService: false, default: true }, { name: 'Amélie', lang: 'fr-FR', localService: true }] }).E.voixFrancaise().voix.name, 'Amélie');
    v('une synthèse dont `getVoices` jette : pas de lecture, pas d\'exception', (() => { const x = monter(script); x.m.synth.getVoices = () => { throw new Error('boum'); }; return x.E.voixFrancaise(); })(), { ok: false, voix: null });
    v('la langue d\'une voix écrite « fr_FR » (Android) est dite « fr-FR » au moteur', (() => { const x = monter(script, { voix: [{ name: 'Android', lang: 'fr_FR', localService: true }] }); x.messages.push(msg('a', 'Un texte à lire à voix haute.')); x.E.ecouterMessage('a'); return x.m.parles.map(p => p.lang); })(), ['fr-FR']);
    {
      const x = monter(script, { voix: [] });
      v('(avant que la liste n\'arrive) rien n\'est proposé', x.E.synthesePossible(), false);
      x.m.synth.voix = [{ name: 'Google français', lang: 'fr-FR', localService: false }];
      x.m.declencher('synth:voiceschanged');
      v('la liste arrive (« voiceschanged ») et ne contient qu\'une voix distante : toujours rien (et le fil n\'est pas redessiné pour rien)', [x.E.synthesePossible(), x.m.rendus], [false, 0]);
      x.m.synth.voix = [{ name: 'Amélie', lang: 'fr-FR', localService: true }];
      x.m.declencher('synth:voiceschanged');
      v('⛔ la liste arrive avec une voix française LOCALE : le lien PARAÎT — la page est redessinée une fois', [x.E.synthesePossible(), x.m.rendus], [true, 1]);
      x.m.synth.voix = [];
      x.m.declencher('synth:voiceschanged');
      v('…et si elle se vide de nouveau, il disparaît (redessin)', [x.E.synthesePossible(), x.m.rendus], [false, 2]);
    }

    /* 3. qui a un lien */
    const peutEtre = (x) => E.ecoutable(x);
    v('un texte reçu : oui', peutEtre(msg('a', 'Un message assez long pour être lu à voix haute.')), true);
    v('⛔ MON message : non (on n\'écoute pas ce qu\'on vient d\'écrire)', peutEtre(msg('a', 'Texte', { auteur: 'moi' })), false);
    v('un vocal, une photo (même légendée), un fichier : non', [msg('a', '', { vocal: { dur: 5 } }), msg('b', 'légende', { photos: [{}] }), msg('c', 'f', { fichier: { nom: 'x' } })].map(peutEtre), [false, false, false]);
    v('une position, une fiche de contact, un sondage, un compte rendu : non', [{ position: {} }, { carteContact: {} }, { sondage: {} }, { compteRendu: {} }].map(x => peutEtre(msg('a', 'Texte', x))), [false, false, false, false]);
    v('supprimé, en cours d\'envoi, ligne du système, vide ou blanc : non', [{ supprime: true }, { attente: true }, { systeme: true }, { texte: '' }, { texte: '   ' }].map(x => peutEtre(Object.assign(msg('a', 'Texte'), x))), [false, false, false, false, false]);
    v('le balisage du lien : un bouton avec son identifiant, son libellé, son nom accessible — sans `aria-expanded` (un seul signal)', (() => { const h = E.htmlEcouter(msg('m1', 'x')); return [/data-ecouter="m1"/.test(h), />Écouter</.test(h), /aria-label="Écouter ce message à voix haute"/.test(h), /aria-expanded/.test(h), /type="button"/.test(h)]; })(), [true, true, true, false, true]);

    /* 4. le geste, un seul son à la fois */
    const A = msg('mA', 'Bonjour Justin. Voici le point sur la semaine : trois devis sont partis, deux attendent une réponse. Je relance demain matin.');
    const B = msg('mB', 'Un second message, lui aussi assez long pour être lu à voix haute par le navigateur. Il compte plusieurs phrases, de façon que la lecture se fasse en plusieurs morceaux. Chaque morceau reste sous la limite que Chrome supporte. Et celui-ci est le dernier de la série, avec un point final.');
    messages.push(A, B);
    const lA = m.lien('mA'), lB = m.lien('mB');
    E.ecouterMessage('mA');
    v('⛔ `speak` est appelé AVANT que la fonction rende la main (le geste : aucun `await` entre le clic et la voix — sinon Safari reste muet)', m.parles.length > 0, true);
    v('…en français de France, avec la voix choisie, et le texte du message', [m.parles[0].lang, m.parles[0].voice && m.parles[0].voice.name, m.parles.map(x => x.text).join(' ')], ['fr-FR', 'Amélie', A.texte]);
    v('…une phrase (ou deux) par morceau, jamais plus de 200 signes', m.parles.every(x => x.text.length <= 200), true);
    v('⛔ les objets de la synthèse sont GARDÉS (Chrome les perd, la voix se tait en route)', [E.ecoute.refs.length, E.ecoute.refs.every(u => m.parles.some(p => p.u === u))], [m.parles.length, true]);
    v('l\'écoute porte le message, sa conversation et le texte lu', [E.ecoute.mid, E.ecoute.conv, E.ecoute.texte === A.texte], ['mA', 'c1', true]);
    v('« Arrêter » pendant la lecture : le libellé du lien suit EN PLACE (nom accessible compris)', [lA.textContent, lA.attrs['aria-label'], lA.attrs['data-actif'], lB.textContent], ['Arrêter', 'Arrêter la lecture à voix haute', '1', 'Écouter']);
    const avantB = m.parles.length, annulAvant = m.annulations;
    E.ecouterMessage('mB');
    v('⛔ UN SEUL SON À LA FOIS : écouter un autre message coupe le premier (une annulation) et lit le second', [m.annulations - annulAvant, m.parles.slice(avantB).map(x => x.text).join(' '), E.ecoute.mid], [1, B.texte, 'mB']);
    v('…les libellés suivent : le second « Arrêter », le premier « Écouter »', [lA.textContent, lB.textContent], ['Écouter', 'Arrêter']);
    v('⛔ la lecture d\'un message coupe aussi un VOCAL qui jouait (`arreterLecture`)', m.arretsLecture >= 2, true);
    const annul2 = m.annulations;
    E.ecouterMessage('mB');
    v('toucher le message qu\'on écoute l\'ARRÊTE (une annulation, plus rien en cours)', [m.annulations - annul2, E.ecoute.mid, lB.textContent, lB.attrs['data-actif']], [1, null, 'Écouter', undefined]);
    v('…et ne relance rien', m.parles.length - avantB - m.parles.slice(avantB).length, 0);

    /* la fin naturelle */
    E.ecouterMessage('mB');
    const nB = m.enAttente.length;
    let fins = 0; while (m.enAttente.length > 1) { m.finir(); fins++; }
    v('(population) le message se lit en plusieurs morceaux', nB > 1, true);
    v('un morceau fini ne ferme pas l\'écoute : seul le DERNIER la ferme', E.ecoute.mid, 'mB');
    m.finir();
    v('⛔ le dernier morceau fini : le libellé redevient « Écouter », plus rien ne lit (sans appeler `cancel` pour rien)', [E.ecoute.mid, lB.textContent], [null, 'Écouter']);
    const annul3 = m.annulations;
    E.arreterEcoute();
    v('arrêter quand rien ne lit ne coupe rien (`cancel` n\'est pas appelé pour rien)', m.annulations - annul3, 0);

    /* un morceau qui échoue */
    E.ecouterMessage('mA');
    const erreur = m.enAttente.shift();
    erreur.onerror({ error: 'synthesis-failed' });
    v('une erreur de synthèse arrête l\'écoute, sans bruit', [E.ecoute.mid, m.avis.length], [null, 0]);
    E.ecouterMessage('mA'); const refusee = m.enAttente.shift(); refusee.onerror({ error: 'not-allowed' });
    v('⛔ « not-allowed » (le navigateur refuse la voix hors d\'un geste) : l\'écoute s\'arrête ET le dit', [E.ecoute.mid, m.avis], [null, ['Le navigateur a refusé la lecture à voix haute.']]);
    v('⛔ l\'annulation que NOUS provoquons (cancel → onerror « canceled ») n\'arrête pas la lecture suivante (jeton)', (() => { E.ecouterMessage('mA'); E.ecouterMessage('mB'); return E.ecoute.mid; })(), 'mB');
    E.arreterEcoute();

    /* refus d'écouter */
    const x2 = monter(script, { synthese: false }); x2.messages.push(A);
    x2.E.ecouterMessage('mA');
    v('sans synthèse : rien ne part, et la page le dit', [x2.m.parles.length, x2.m.avis], [0, ['La lecture à voix haute n\'est pas disponible sur cet appareil.']]);
    const x3 = monter(script, { voix: [{ name: 'Google français', lang: 'fr-FR', localService: false }] }); x3.messages.push(A);
    x3.E.ecouterMessage('mA');
    v('⛔ seulement une voix distante : RIEN ne part (le texte ne sort pas), et la page le dit', [x3.m.parles.length, x3.m.avis.length], [0, 1]);
    const x4 = monter(script); x4.messages.push(msg('v', 'https://exemple.fr 👍'));
    x4.E.ecouterMessage('v');
    v('un message sans rien à lire (que des liens) : rien ne part, et la page le dit', [x4.m.parles.length, x4.m.avis], [0, ['Il n\'y a rien à lire à voix haute dans ce message.']]);
    const x5 = monter(script); x5.messages.push(msg('own', 'Mon propre texte assez long pour la lecture', { auteur: 'moi' }));
    x5.E.ecouterMessage('own'); x5.E.ecouterMessage('inconnu');
    v('MON message, un identifiant inconnu : rien ne part, rien n\'est dit', [x5.m.parles.length, x5.m.avis.length], [0, 0]);

    /* 5. la voix se tait */
    E.ecouterMessage('mA');
    const c0 = m.annulations;
    E.verifierEcoute({ id: 'c1', messages: [A, B] });
    v('le message est toujours là, inchangé : la lecture continue', [E.ecoute.mid, m.annulations - c0], ['mA', 0]);
    E.verifierEcoute({ id: 'autre', messages: [] });
    v('une autre conversation affichée : sans effet (la fermeture se fait à l\'ouverture)', E.ecoute.mid, 'mA');
    E.verifierEcoute({ id: 'c1', messages: [Object.assign({}, A, { texte: A.texte + ' (corrigé)' }), B] });
    v('⛔ le message est MODIFIÉ : la voix se tait (ce n\'est plus le texte qu\'on lisait)', [E.ecoute.mid, m.annulations - c0], [null, 1]);
    E.ecouterMessage('mA');
    E.verifierEcoute({ id: 'c1', messages: [Object.assign({}, A, { supprime: true }), B] });
    v('⛔ le message est SUPPRIMÉ : la voix se tait', E.ecoute.mid, null);
    E.ecouterMessage('mA');
    E.verifierEcoute({ id: 'c1', messages: [B] });
    v('…ou a disparu de la conversation', E.ecoute.mid, null);
    E.ecouterMessage('mA');
    m.document.visibilityState = 'hidden'; m.declencher('document:visibilitychange');
    v('⛔ la page se CACHE : la voix se tait', E.ecoute.mid, null);
    E.ecouterMessage('mA');
    m.document.visibilityState = 'visible'; m.declencher('document:visibilitychange');
    v('(contre-épreuve) la page revient : la lecture continue', E.ecoute.mid, 'mA');
    m.declencher('window:pagehide');
    v('⛔ la page est quittée (pagehide) : la voix se tait', E.ecoute.mid, null);
    E.ecouterMessage('mA'); E.peindreEcoute();
    v('le repeint du fil pose le libellé sur un lien neuf (le balisage mémorisé n\'a pas le libellé « Arrêter »)', [lA.textContent, lB.textContent], ['Arrêter', 'Écouter']);
    E.arreterEcoute();
  }

  /* 6. EN COURS NE DURE PAS POUR TOUJOURS ───────────────────────────────────────────────────────────────── */
  for (const [nom, fichier] of SOURCES) {
    console.log('\n── ' + nom + ' · la transcription qui traîne');
    const S = monterTranscription(scriptDe(fichier));
    vrai('(population) le bloc de la transcription est trouvé et se compile', !!S);
    if (!S) continue;
    const { m, R, messages, etat } = S;
    const veilles = () => m.minuteurs.filter(t => !t.fait && t.d > 1000).length;       // les veilles de transcription (les annonces du lecteur d'écran, 60 ms, n'en sont pas)
    R.poserTR({ ouverte: true, dureeMaxS: 300 });
    const vocal = { id: 'v1', auteur: 'autre', t: 1, seq: 12, vocal: { dur: 20, piece: 'p' }, transcription: { etat: 'attente' } };
    messages.push(vocal);
    R.trOuvertes.set('v1', 'c1'); R.trEtats.set('v1', 'attente');
    vrai('(population) la transcription est possible pour ce vocal', R.transcriptionPossible(vocal));
    v('le délai : 30 s + 1,5 s par seconde de vocal', [R.trDelaiLent(vocal), R.trDelaiLent({ vocal: { dur: 180 } }), R.trDelaiLent({})], [60000, 300000, 30000]);
    R.annoncerTranscriptions(etat.convDonnees);
    const h0 = R.htmlTranscription(vocal, 'recue');
    v('au début : « Transcription en cours… » avec sa roue, pas de « Réessayer »', [/Transcription en cours…/.test(h0), /tr-roue/.test(h0), /Réessayer/.test(h0), /plus longtemps/.test(h0)], [true, true, false, false]);
    v('une minuterie veille (une seule), rien n\'est encore « lent »', [veilles(), R.trLent.has('v1')], [1, false]);
    m.avancer(59000); const rendusAvant = m.rendus;
    v('à 59 s sur 60 : toujours « en cours »', R.trLent.has('v1'), false);
    m.avancer(2000);
    const h1 = R.htmlTranscription(vocal, 'recue');
    v('⛔ passé son délai : « Ça prend plus longtemps que d\'habitude », « peut-être indisponible », et « Réessayer » — plus de roue, plus de « en cours »', [/Ça prend plus longtemps que d'habitude/.test(h1), /peut-être indisponible/.test(h1), /data-transcrire-reessayer="v1"/.test(h1), /tr-roue/.test(h1), /Transcription en cours…/.test(h1)], [true, true, true, false, false]);
    v('…l\'écran est redessiné (sans attendre un événement du flux)', m.rendus > rendusAvant, true);
    R.annoncerTranscriptions(etat.convDonnees);
    v('…et un nouveau passage ne pose pas une seconde minuterie', veilles(), 0);
    vocal.transcription = { etat: 'prete', texte: 'Le texte est arrivé', langue: 'fr' };
    R.annoncerTranscriptions(etat.convDonnees);
    const h2 = R.htmlTranscription(vocal, 'recue');
    v('⛔ le texte arrive : le texte, plus aucune trace de lenteur, la veille est levée', [/Le texte est arrivé/.test(h2), /plus longtemps/.test(h2), R.trLent.has('v1'), R.trDepuis.has('v1')], [true, false, false, false]);
    /* échec dit par le service : sa phrase, pas la lenteur */
    vocal.transcription = { etat: 'attente' }; R.annoncerTranscriptions(etat.convDonnees);
    vocal.transcription = { etat: 'echec' }; R.annoncerTranscriptions(etat.convDonnees);
    const h3 = R.htmlTranscription(vocal, 'recue');
    v('un échec DIT par le service (la ligne que plus rien ne portait) : « n\'a pas pu se faire » + « Réessayer », la veille est levée', [/n'a pas pu se faire/.test(h3), /data-transcrire-reessayer/.test(h3), R.trDepuis.has('v1'), veilles()], [true, true, false, 0]);
    /* le nouvel essai repart de zéro */
    vocal.transcription = { etat: 'attente' }; R.annoncerTranscriptions(etat.convDonnees);
    m.avancer(61000);
    vrai('(population) de nouveau lent', R.trLent.has('v1'));
    await R.demanderTranscription('v1');
    v('⛔ « Réessayer » : le délai REPART (« lent » est levé, une nouvelle veille) et la page dit « en cours » de nouveau', [R.trLent.has('v1'), /Transcription en cours…/.test(R.htmlTranscription(vocal, 'recue'))], [false, true]);
    R.annoncerTranscriptions(etat.convDonnees);
    const nVeilles = veilles();
    m.avancer(61000);
    v('…et la nouvelle veille aboutit à son tour', [nVeilles >= 1, R.trLent.has('v1')], [true, true]);
    /* un vocal fermé ou supprimé ne laisse pas de minuterie */
    vocal.transcription = { etat: 'attente' }; R.trLocal.clear(); R.trLent.clear(); R.trDepuis.clear();
    R.annoncerTranscriptions(etat.convDonnees);
    const enVeille = veilles();
    messages.length = 0; R.annoncerTranscriptions(etat.convDonnees);
    m.avancer(10 * 60000);
    v('⛔ le message a disparu : la veille est levée, rien ne se déclenche pour un message qui n\'est plus là', [enVeille >= 1, R.trLent.has('v1'), veilles()], [true, false, 0]);
  }

  /* 7. le câblage, dans le CODE (commentaires retirés) ─────────────────────────────────────────────────── */
  console.log('\n── le câblage');
  for (const [nom, fichier] of SOURCES) {
    const brut = scriptDe(fichier), JS = sansCommentairesJs(brut);
    vrai('(population) ' + nom + ' : le script est lu (' + JS.length + ' caractères)', JS.length > 100000);
    vrai('⛔ ' + nom + ' : AUCUNE expression à « lookbehind » (`(?<=`, `(?<!`) : un Safari d\'avant 16.4 ne compile plus le script, la page reste blanche', !/\(\?<[=!]/.test(JS));
    const iMsg = JS.indexOf('function htmlMessage('), fMsg = JS.indexOf('\n  function ', iMsg + 30);
    const msgCode = JS.slice(iMsg, fMsg);
    vrai(nom + ' : le lien est posé sous un message REÇU, quand la voix est possible et que le texte a au moins une phrase', /if \(!moi && ecoutable\(m\) && synthesePossible\(\) && texteParle\(m\.texte\)\.length >= ECOUTE_LIEN_MIN\) h \+= htmlEcouter\(m\);/.test(msgCode));
    vrai(nom + ' : …APRÈS la transcription et avant les réactions (il suit le message, pas ses pastilles)', msgCode.indexOf('htmlTranscription(m, sens)') < msgCode.indexOf('htmlEcouter(m)') && msgCode.indexOf('htmlEcouter(m)') < msgCode.indexOf('reactionsHtml(m)'));
    const iClic = JS.indexOf("$('conv-messages').addEventListener('click', e => {"), clic = JS.slice(iClic, iClic + 1800);
    vrai(nom + ' : le clic sur « Écouter » est traité AVANT celui de la transcription, de façon synchrone (aucun `await` dans le gestionnaire)', clic.indexOf("[data-ecouter]") > 0 && clic.indexOf("[data-ecouter]") < clic.indexOf("[data-transcrire]") && !/await /.test(clic.slice(0, clic.indexOf("[data-transcrire]"))) && /ecouterMessage\(ec\.dataset\.ecouter\)/.test(clic));
    const iMenu = JS.indexOf('function ouvrirMenuMessage('), menu = JS.slice(iMenu, iMenu + 6000);
    vrai(nom + ' : le menu d\'un message reçu a sa ligne « Écouter » (« Arrêter la lecture » pendant l\'écoute)', /if \(!moi && ecoutable\(m\) && synthesePossible\(\)\) h \+= '<button type="button" class="menu-action" data-menu="ecouter">' \+ \(ecoute\.mid === m\.id \? 'Arrêter la lecture' : 'Écouter'\)/.test(menu));
    const iAct = JS.indexOf('const act = a.dataset.menu;'), iEc = JS.indexOf("act === 'ecouter'", iAct);
    const avantAct = JS.slice(iAct, iEc);
    vrai(nom + ' : ⛔ l\'action du menu appelle `ecouterMessage` sans AUCUN `await` avant elle (le geste du toucher serait perdu — Safari)', iAct > 0 && iEc > iAct && !/await /.test(avantAct) && /act === 'ecouter'\) ecouterMessage\(mid\)/.test(JS));
    const iLire = JS.indexOf('function lireVocal('), lire = JS.slice(iLire, iLire + 400);
    vrai(nom + ' : ⛔ lancer un vocal coupe la voix (`arreterEcoute()` AVANT `arreterLecture()` dans `lireVocal`)', iLire > 0 && lire.indexOf('arreterEcoute()') > 0 && lire.indexOf('arreterEcoute()') < lire.indexOf('arreterLecture()'));
    vrai(nom + ' : ⛔ changer de conversation (`ouvrirConv`) et la fermer (`fermerConv`) coupent la voix', /arreterLecture\(\); arreterEcoute\(\); annulerEnregistrement\(\);/.test(JS) && /arreterEcoute\(\);\s*arreterLecture\(\);\s*etat\.conv = null/.test(JS));
    vrai(nom + ' : le fil repeint vérifie que le message lu est toujours là et pose les libellés (`verifierEcoute`, `peindreEcoute`)', /appliquerLecture\(\);\s*verifierEcoute\(c\); peindreEcoute\(\);/.test(JS));
    vrai(nom + ' : le focus d\'un lien « Écouter » survit au repeint du fil', /actif\.dataset\.ecouter \? 'ecouter'/.test(JS));
    vrai(nom + ' : ⛔ le libellé « Arrêter » n\'est PAS dans le balisage mémorisé de la bulle (le lien est toujours dessiné « Écouter » quand rien ne lit)', !/htmlEcouter\(m\)[^;]*ecoute\.mid/.test(msgCode));
    vrai(nom + ' : seules les voix LOCALES sont prises (`localService === true`), jamais une voix distante', /x\.localService === true && langFr\(x\.lang\)/.test(JS));
    vrai(nom + ' : la voix choisie ET sa langue sont données au moteur (« fr_FR » d\'Android réécrit « fr-FR »)', /u\.voice = v\.voix; u\.lang = String\(v\.voix\.lang\)\.replace\('_', '-'\);/.test(JS));
    vrai(nom + ' : pas de pause/reprise (peu fiable sur iOS) : ni `pause()` ni `resume()` de la synthèse', !/speechSynthesis\.(pause|resume)|\bs\.(pause|resume)\(/.test(JS.slice(JS.indexOf('const ECOUTE_LIEN_MIN'), JS.indexOf('async function ouvrirConv('))));
  }
  const css = (/<style>([\s\S]*?)<\/style>/.exec(fs.readFileSync(SOURCES[0][1], 'utf8')) || [, ''])[1];
  vrai('le lien a sa feuille : 32 px, 44 px sous le doigt (zone étendue), couleur d\'accent lisible, jamais étiré sur la colonne', /\.ecouter-lien\s*\{[^}]*min-height:\s*32px[^}]*color:\s*var\(--accent-txt\)[^}]*\}/.test(css) && /@media \(pointer: coarse\) \{ \.ecouter-lien::before \{ content: ''; position: absolute; inset: -6px 0; \} \}/.test(css) && /\.ecouter-lien\s*\{[^}]*width:\s*max-content/.test(css));

})().catch(e => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; }).finally(() => fin());

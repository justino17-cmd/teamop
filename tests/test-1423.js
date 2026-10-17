/* ══ OP MESSAGES — UNE FIN AVANT LE DÉBUT SE DIT AVEC LE BON MOT : RENDEZ-VOUS, ÉVÉNEMENT OU RÉUNION (lot m05 : agenda#1) ════════════════════════════════
   Le service répond le MÊME code (`fin_avant_debut`) pour une réunion, un rendez-vous et un événement ; la phrase d'`api.js` est celle de la réunion. Côté Perso le mot « réunion » n'existe
   pas : enregistrer un rendez-vous (ou un événement) dont la fin précède le début affichait « La fin de la réunion doit tomber après son début. ».
   La VRAIE `evtEnregistrer` de la page est extraite et EXÉCUTÉE avec la VRAIE `ErreurApi` d'`api.js` (le refus tel que le client du service le fabrique) :
     · rendez-vous → « La fin du rendez-vous doit tomber après son début. » ; événement → « La fin de l'événement doit tomber après son début. » ;
     · le formulaire de RÉUNION garde son mot (`enregistrerReunion` n'est pas touchée ; la phrase d'`api.js` reste celle de la réunion) ;
     · (non régressé) un autre refus du service garde sa phrase, une panne sans phrase retombe sur le défaut du formulaire.
   ⛔ Une absence se prouve sur une population : les deux types de formulaire sont joués, et le geste est allé jusqu'au service. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const RACINE = process.env.OPMSG_RACINE ? path.resolve(process.env.OPMSG_RACINE) : path.join(__dirname, '..');
const API = require(path.join(RACINE, 'server-msg', 'public', 'api.js'));
const PAGE = fs.readFileSync(path.join(RACINE, 'apercu/opmessages/index.html'), 'utf8');
const SCRIPT = (/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1];
const JS = SCRIPT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
function extraire(src, entete) {
  const i = src.indexOf(entete); if (i < 0) return '';
  let n = 0, j = src.indexOf('{', i);
  for (; j < src.length; j++) { const c = src[j]; if (c === '{') n++; else if (c === '}') { n--; if (!n) break; } }
  return src.slice(i, j + 1);
}

(async () => {
  const code = extraire(JS, 'async function evtEnregistrer(b)');
  const phrase = (/const phrase = [^\n]*/.exec(JS) || [''])[0];
  const aide = extraire(JS, 'function phraseEvt(');
  vrai('(population) `evtEnregistrer` (' + code.length + ' caractères), `phrase` et l\'aide `phraseEvt` (' + aide.length + ' caractères) sont trouvées', code.length > 1500 && phrase.length > 20 && aide.length > 50);

  const VALEURS = { 'ev-titre': 'Test', 'ev-debut': '2026-10-22T15:00', 'ev-fin': '2026-10-22T14:00', 'ev-lieu': '', 'ev-note': '', 'ev-avec': '', 'ev-rappel': '' };
  const jouer = async (rdv, erreur) => {
    const trace = { erreurs: [], appels: 0 };
    const ctx = {
      reu: { formEvt: { rdv, id: null, rappels: [], tz: 'Europe/Paris', cote: 'perso', tr: null } },
      etat: { mode: 'perso' }, modesActifs: () => false, trajetAEnvoyer: () => undefined, Promise, setTimeout,
      erreurInfo: t => trace.erreurs.push(t), mot() {}, fermerCouche() {}, evenementsRelire() {},
      source: { creerEvenement: async () => { trace.appels++; if (erreur) throw erreur; }, majEvenement: async () => {} },
      $: id => ({ value: VALEURS[id] || '', focus() {}, getAttribute: () => 'false' }),
    };
    vm.createContext(ctx);
    vm.runInContext(phrase + '\n' + aide + '\n' + code + '\nthis.f = evtEnregistrer;', ctx, { timeout: 2000 });
    await ctx.f({ disabled: false });
    return trace;
  };

  const refus = () => new API.ErreurApi('fin_avant_debut', 400, 0);
  const rdv = await jouer(true, refus()), evt = await jouer(false, refus());
  v('population : les deux formulaires (rendez-vous, événement) sont allés jusqu\'au service, une fois chacun', [rdv.appels, evt.appels], [1, 1]);
  v('⛔ rendez-vous : « La fin du rendez-vous doit tomber après son début. » (jamais « de la réunion » : côté Perso le mot n\'existe pas)', rdv.erreurs, ['La fin du rendez-vous doit tomber après son début.']);
  v('⛔ événement : « La fin de l\'événement doit tomber après son début. »', evt.erreurs, ['La fin de l\'événement doit tomber après son début.']);
  v('la phrase d\'api.js, elle, reste celle de la RÉUNION (le formulaire de réunion garde son mot)', API.MESSAGES.fin_avant_debut, 'La fin de la réunion doit tomber après son début.');
  vrai('le formulaire de réunion passe toujours par la phrase du service (`enregistrerReunion` lit `phrase(er, …)`)', /erreurInfo\(phrase\(er, 'La réunion n\\'a pas pu être enregistrée\.'\)\)/.test(JS));
  const autre = await jouer(true, new API.ErreurApi('heure_invalide', 400, 0)), panne = await jouer(false, new Error('boum'));
  v('(non régressé) un autre refus garde sa phrase ; une panne sans phrase retombe sur le défaut du formulaire', [autre.erreurs, panne.erreurs],
    [['Cette date ou cette heure n\'est pas valable.'], ['L\'événement n\'a pas pu être enregistré.']]);
  fin();
})().catch(e => { console.log('  ✗ le banc a échoué : ' + (e && e.stack || e)); process.exitCode = 1; });

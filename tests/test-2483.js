/* ⛔ CE QUE CE FICHIER GARDE — ENTRER « EN VIDÉO » DANS UNE SALLE OUVERTE EN AUDIO, C'EST ENTRER SANS CAMÉRA, ET LA PAGE LE DIT (salle#3 ; modèle `test-857` : les VRAIES fonctions de la page, exécutées).

   Constat du testeur : Dan entre en premier avec « Rejoindre en audio » ; Ana entre ensuite avec « Rejoindre » (vidéo), caméra allumée dans « Avant d'entrer ». Elle entre caméra COUPÉE (bouton « Activer la caméra »,
   vignette « Vous » sans image, Dan lit « caméra désactivée ») sans qu'aucun message le dise. La règle « une salle audio par le serveur de visio n'ouvre pas la caméra » est VOULUE (REPRISE.md, 12 octobre) : on ne la
   change pas, on en dit la raison. `acquerirMedias(A, veutVideo)` est appelée avec `snap.type === 'video'` : pour une salle audio elle ne demande pas la caméra, et n'avertit personne.

     1. LA FONCTION RÉELLE `acquerirMedias` est jouée avec une fausse caméra/un faux micro (aucun navigateur) : le choix « caméra allumée » de la feuille + une salle AUDIO → l'avis « Cette salle a été ouverte en audio »
        (et ce qu'on peut faire : lancer un appel vidéo quand la salle passe par le serveur de visio, « Touche Caméra » sinon) ; la caméra n'est toujours PAS demandée (la règle voulue ne bouge pas) ;
     2. CE QUI NE DOIT PAS AVERTIR : une salle VIDÉO, une caméra coupée dans la feuille, une entrée sans feuille (réponse à un appel), une salle qui n'est pas une salle ;
     3. UNE PANNE DE MICRO ET LA RAISON S'AJOUTENT (aucune des deux phrases n'écrase l'autre) ;
     4. LA RÈGLE VOULUE EST INTACTE : `basculerCamera` dit toujours « Cette salle est en audio » à qui touche Caméra (le texte du CODE).

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « pas d'avis » est précédé d'un cas qui en donne un (même fonction, même bac à sable). Le bout en bout (le vrai « Avant d'entrer », deux
   navigateurs) est dans la sonde citée dans le rapport (`bug-video-dans-salle-audio.js`, relancée sur ce code). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const PAGE = fs.readFileSync(path.join(T.RACINE, 'apercu', 'opmessages', 'index.html'), 'utf8');
const CODE = T.sansCommentaires((/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1]);

const fonction = (entete) => { const i = CODE.indexOf(entete); if (i < 0) return ''; const f = CODE.indexOf('\n  }\n', i); return f < 0 ? '' : CODE.slice(i, f + 5); };
const ligne = (ancre) => { const i = CODE.indexOf(ancre); return i < 0 ? '' : CODE.slice(i, CODE.indexOf('\n', i)); };
const PIECES = [ligne('  const enSalle = A =>'), fonction('  async function acquerirMedias(A, veutVideo) {'), fonction('  function salleAudioSansCamera(A) {')];

/* un « navigateur » de poche : getUserMedia rend un flux de pistes factices ; on note ce qui est demandé et ce que la page dit */
async function jouer(o) {
  const avis = [], demandes = [];
  const piste = (kind) => ({ kind, readyState: 'live', enabled: true, stop() {} });
  const ctx = vm.createContext({
    console, avis, demandes,
    gum: async (c) => {
      demandes.push(Object.keys(c).sort().join('+'));
      if (c.audio && o.micro === false) { const e = new Error('refusé'); e.name = 'NotAllowedError'; throw e; }
      const l = []; if (c.audio) l.push(piste('audio')); if (c.video) l.push(piste('video'));
      return { getTracks: () => l };
    },
    mediasDispo: () => true, perime: () => false, poserPistes: (A, f) => { for (const t of f.getTracks()) { if (t.kind === 'video') A.video = t; else A.audio = t; } }, rendreAppel: () => {}, cAudio: () => ({}), cVideo: () => true,
    messageMedia: (e, quoi) => (quoi === 'micro' ? 'Le micro est refusé.' : 'La caméra n\'a pas pu démarrer.'), avisAppel: (t) => { avis.push(t); },
  });
  vm.runInContext(PIECES.join('\n') + '\nthis.acquerirMedias = acquerirMedias;', ctx, { timeout: 3000 });
  const A = { choix: o.choix === undefined ? { micro: true, camera: true } : o.choix, snap: Object.assign({ salle: true, entrant: false, type: 'audio', visio: true }, o.snap || {}), micro: true, camera: false, video: null, audio: null, pistes: [], mediasDemandes: false };
  await ctx.acquerirMedias(A, A.snap.type === 'video');
  return { avis, demandes };
}

(async () => {
  console.log('La fonction réelle de la page : le choix de la feuille contre le type de la salle');
  vrai('(population) les trois pièces sont trouvées dans le script (' + PIECES.map(p => p.length).join(', ') + ' caractères)', PIECES.every(p => p.length > 40) && /salleAudioSansCamera\(A\)/.test(PIECES[1]));

  const r1 = await jouer({ snap: { type: 'audio', visio: true } });
  vrai('⛔ caméra allumée dans la feuille + salle AUDIO par le serveur de visio : un avis dit « Cette salle a été ouverte en audio »', r1.avis.length === 1 && /Cette salle a été ouverte en audio/.test(r1.avis[0]));
  vrai('   et dit quoi faire (lancer un appel vidéo)', /lance un appel vidéo/.test(r1.avis[0] || ''));
  v('⛔ la règle VOULUE ne bouge pas : la caméra n\'est toujours pas demandée au navigateur (le micro seul)', r1.demandes, ['audio']);
  const r2 = await jouer({ snap: { type: 'audio', visio: false } });
  vrai('salle audio en liaisons directes : le même avis, avec « Touche Caméra »', r2.avis.length === 1 && /ouverte en audio/.test(r2.avis[0]) && /Touche Caméra/.test(r2.avis[0]));

  console.log('\nCe qui ne doit pas avertir');
  const r3 = await jouer({ snap: { type: 'video' } });
  v('une salle VIDÉO : aucun avis (la caméra est demandée)', [r3.avis, r3.demandes], [[], ['audio+video']]);
  const r4 = await jouer({ choix: { micro: true, camera: false } });
  v('caméra COUPÉE dans la feuille : aucun avis (la personne ne voulait pas se montrer)', r4.avis, []);
  const r5 = await jouer({ choix: null });
  v('entrée sans feuille (réponse à un appel, aucun choix) : aucun avis', r5.avis, []);
  const r6 = await jouer({ snap: { salle: false } });
  v('ce n\'est pas une salle (appel à deux) : aucun avis', r6.avis, []);

  console.log('\nUne panne de micro et la raison s\'ajoutent');
  const r7 = await jouer({ micro: false });
  vrai('micro refusé + salle audio : UN avis qui porte les deux phrases', r7.avis.length === 1 && /micro est refusé/.test(r7.avis[0]) && /ouverte en audio/.test(r7.avis[0]));

  console.log('\nLa règle voulue est intacte');
  const bc = fonction('  async function basculerCamera() {');
  vrai('(population) `basculerCamera` est trouvée (' + bc.length + ' caractères)', bc.length > 800);
  vrai('⛔ toucher Caméra dans une salle audio par la visio dit toujours « Cette salle est en audio » et n\'ouvre rien', /A\.snap\.type !== 'video' && A\.snap\.visio\) \{ avisAppel\('Cette salle est en audio/.test(bc));
  fin();
})();

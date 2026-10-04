/* ══ test-985 — LE FLUX : CE QU'IL RETIENT POUR UNE SESSION SANS FLUX EST BORNÉ, EN OCTETS ET EN ÂGE ═══════════════════════════════════════════════════
   Les signaux d'un appel (SDP, candidats) sont adressés à UNE session (`emettreSession`). Sans flux ouvert, ils sont retenus et livrés à l'ouverture du prochain. La relecture (gardien, I3) a mesuré ce que cela coûtait :
   100 signaux de 15 Ko vers 40 sessions sans flux → 77 Mo de mémoire devenus 201 Mo, et 201 Mo encore UNE HEURE plus tard — personne ne purgeait un signal périmé d'une session qui n'ouvrait plus jamais son flux ; et les
   bornes du code (2 000 sessions × 100 signaux × 16 Ko) laissaient retenir 3,1 Go. Ce banc monte le VRAI `flux.js` avec un stockage factice et une horloge à nous, et JOUE :
     · ce qui existait garde son sens : retenu, livré dans l'ordre à l'ouverture, périmé au-delà de 30 s, jamais retenu quand un flux est ouvert ;
     · ⛔ le PÉRIMÉ part de TOUTES les sessions au balayage (la session qui ne revient jamais ne garde rien) ;
     · ⛔ 256 Kio par session (le plus ancien part le premier, le plus récent reste), 8 Mio au total (la session la plus ancienne perd tout avant qu'une neuve perde un octet) ;
     · une enveloppe plus lourde que la borne d'une session, ou qu'on ne sait pas peser, n'est pas retenue et ne fait rien lever ;
     · ⛔ le COMPTE d'octets ne dérive pas : tout retiré, il vaut zéro (un compte qui dérive ne borne plus rien).
   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « il n'en reste plus » est précédé de la preuve qu'il y en avait. Le balayage est celui du VRAI minuteur du flux (20 ms ici), attendu au GESTE
   (l'état change), jamais au chronomètre. */
'use strict';
const path = require('path');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const { creerFlux } = require(path.join(T.SERVICE, 'flux.js'));

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (60 s)'); process.exit(1); }, 60000).unref();

const KIO = 1024, MIO = 1024 * 1024;
const RETENU_SESSION = 256 * KIO, RETENU_TOTAL = 8 * MIO, RETENU_MS = 30000;
let maintenant = Date.UTC(2026, 9, 4, 8, 0, 0);
const horloge = () => maintenant;
const stockage = {
  journalMax: () => 0, journalMin: () => null, gidVisible: () => 0, evenementsPour: () => ({ evenements: [], dernier: 0, plein: false }),
  membresActifs: () => [], personneParId: () => null, contactsActifs: () => [],
};
const monter = () => creerFlux({ stockage, config: { pulsationMs: 20 }, horloge });
/* un flux factice : tout ce qu'on lui écrit est gardé (le texte brut de chaque trame) */
function fauxFlux() {
  const ecrits = [], res = { status() { return res; }, set() {}, flushHeaders() {}, on() {}, write(x) { ecrits.push(x); return true; }, end() {}, writableLength: 0 };
  const signaux = () => ecrits.map(t => /^event: signal\ndata: (.*)\n\n$/.exec(t)).filter(Boolean).map(m => JSON.parse(m[1]));
  return { res, req: { socket: null }, ecrits, signaux };
}
const ouvrir = (hub, h, uid) => { const f = fauxFlux(); const r = hub.ouvrir({ uid: uid || 'p_' + h, h, ip: '203.0.113.7', req: f.req, res: f.res, lastId: undefined }); return Object.assign(f, { ouvert: r.ok }); };
const enveloppe = (i, octets) => ({ appel: 'a_' + '0'.repeat(32), de: 'p_exp', type: 'candidats', donnees: { i, pad: 'x'.repeat(octets) } });
const dort = (ms) => new Promise(r => setTimeout(r, ms));
const poids = (e) => Buffer.byteLength('signal', 'utf8') + Buffer.byteLength(JSON.stringify(e), 'utf8');

(async () => {
  /* ═══ 1. CE QUI EXISTAIT GARDE SON SENS ═══ */
  console.log('Retenu, livré dans l\'ordre à l\'ouverture, périmé au-delà de 30 s, jamais retenu quand un flux est ouvert');
  {
    const hub = monter();
    try {
      for (let i = 0; i < 3; i++) hub.emettreSession('sess-a', 'signal', enveloppe(i, 100));
      v('population : trois signaux sont retenus pour une session sans flux, et pèsent quelque chose', [hub.retenusEtat().entrees, hub.retenusEtat().octets > 300], [3, true]);
      const f = ouvrir(hub, 'sess-a');
      v('⛔ ils arrivent À L\'OUVERTURE du flux, dans l\'ordre ; plus rien n\'est retenu pour cette session', [f.signaux().map(s => s.donnees.i), hub.retenusEtat()], [[0, 1, 2], { sessions: 0, octets: 0, entrees: 0 }]);
      const livre = hub.emettreSession('sess-a', 'signal', enveloppe(9, 10));
      v('⛔ avec un flux OUVERT, un signal est écrit tout de suite (vrai) et RIEN n\'est retenu', [livre, f.signaux().map(s => s.donnees.i), hub.retenusEtat().entrees], [true, [0, 1, 2, 9], 0]);
      hub.emettreSession('sess-b', 'signal', enveloppe(1, 100));
      maintenant += RETENU_MS + 1;
      hub.emettreSession('sess-b', 'signal', enveloppe(2, 100));
      const g = ouvrir(hub, 'sess-b');
      v('⛔ un signal de plus de 30 s n\'est PAS livré, celui de maintenant l\'est (population : un seul des deux)', g.signaux().map(s => s.donnees.i), [2]);
    } finally { hub.arreter(); }
  }

  /* ═══ 2. LE PÉRIMÉ PART DE TOUTES LES SESSIONS ═══ */
  console.log('\n⛔ Une session qui n\'ouvre JAMAIS son flux ne garde rien au-delà de 30 s (le balayage purge toutes les sessions)');
  {
    const hub = monter();
    try {
      for (let s = 0; s < 40; s++) for (let i = 0; i < 20; i++) hub.emettreSession('muette-' + s, 'signal', enveloppe(i, 5000));
      const avant = hub.retenusEtat();
      vrai('population : 40 sessions sans flux retiennent ' + avant.entrees + ' signaux, ' + Math.round(avant.octets / KIO) + ' Kio (de quoi voir une purge)', avant.sessions === 40 && avant.entrees >= 40 * 20 - 40 && avant.octets > MIO);
      maintenant += RETENU_MS - 1000;
      await dort(150);                                           // sept passages du balayage (20 ms) : le contre-essai ne se satisfait pas d'un balayage qui n'a pas eu lieu
      vrai('   avant l\'échéance, le balayage ne retire rien (le contrôle ne purge pas à tout va)', hub.retenusEtat().octets === avant.octets);
      maintenant += 2000;
      const parti = await T.attendre(() => hub.retenusEtat().sessions === 0, 4000, 20);
      v('⛔ 31 s plus tard, le balayage a retiré TOUT, de toutes les sessions — sans qu\'aucune n\'ait reçu un signal de plus ni ouvert son flux', [!!parti, hub.retenusEtat()], [true, { sessions: 0, octets: 0, entrees: 0 }]);
    } finally { hub.arreter(); }
  }

  /* ═══ 3. 256 Kio PAR SESSION ═══ */
  console.log('\n⛔ 256 Kio au plus par session : le plus ancien part le premier, le plus récent reste');
  {
    const hub = monter();
    try {
      let envoye = 0;
      for (let i = 0; i < 100; i++) { hub.emettreSession('lourde', 'signal', enveloppe(i, 15000)); envoye += poids(enveloppe(i, 15000)); }
      const e = hub.retenusEtat();
      vrai('population : 100 signaux de 15 Ko (' + Math.round(envoye / KIO) + ' Kio) ont été envoyés — plus que la borne', envoye > 4 * RETENU_SESSION);
      v('⛔ la session retient AU PLUS 256 Kio, et plus d\'une poignée de signaux (la borne ne vide pas tout)', [e.octets <= RETENU_SESSION, e.entrees >= 10, e.entrees < 100], [true, true, true]);
      const f = ouvrir(hub, 'lourde');
      const i = f.signaux().map(s => s.donnees.i);
      v('⛔ ce qui est livré est le PLUS RÉCENT, dans l\'ordre (le dernier envoyé est là, le premier non)', [i[i.length - 1], i.includes(0), i.every((x, k) => k === 0 || x === i[k - 1] + 1)], [99, false, true]);
      vrai('   le compte est repassé à zéro après la livraison', hub.retenusEtat().octets === 0 && hub.retenusEtat().sessions === 0);
      /* 100 petits signaux : la borne en NOMBRE (100) joue encore, celle en octets non */
      for (let k = 0; k < 130; k++) hub.emettreSession('menue', 'signal', enveloppe(k, 10));
      v('   et la borne en NOMBRE reste : 130 petits signaux n\'en retiennent que 100 (les 30 plus anciens sont partis)', [hub.retenusEtat().entrees, ouvrir(hub, 'menue').signaux().map(s => s.donnees.i)[0]], [100, 30]);
    } finally { hub.arreter(); }
  }

  /* ═══ 4. 8 Mio AU TOTAL ═══ */
  console.log('\n⛔ 8 Mio au plus au total : la session la plus ancienne perd tout avant qu\'une neuve perde un octet (la mesure de la relecture : 40 sessions × 100 × 15 Ko)');
  {
    const hub = monter();
    try {
      let tentes = 0;
      for (let s = 0; s < 40; s++) for (let i = 0; i < 100; i++) { hub.emettreSession('visee-' + s, 'signal', enveloppe(i, 15000)); tentes += poids(enveloppe(i, 15000)); }
      const e = hub.retenusEtat();
      vrai('population : ' + Math.round(tentes / MIO) + ' Mio de signaux ont été envoyés vers 40 sessions — bien plus que la borne', tentes > 5 * RETENU_TOTAL);
      v('⛔ ce que le flux retient ne dépasse JAMAIS 8 Mio — et en retient beaucoup (la borne ne vide pas tout)', [e.octets <= RETENU_TOTAL, e.octets > RETENU_TOTAL * 0.8], [true, true]);
      const derniere = ouvrir(hub, 'visee-39'), premiere = ouvrir(hub, 'visee-0');
      const d = derniere.signaux().map(s => s.donnees.i);
      v('⛔ la DERNIÈRE session visée a gardé ses signaux les plus récents ; la PREMIÈRE (la plus ancienne) n\'a plus rien', [d[d.length - 1], premiere.signaux().length], [99, 0]);
    } finally { hub.arreter(); }
  }

  /* ═══ 5. CE QU'ON NE RETIENT PAS ═══ */
  console.log('\nUne enveloppe plus lourde que la borne d\'une session, ou qu\'on ne sait pas peser, n\'est pas retenue — et ne fait rien lever');
  {
    const hub = monter();
    try {
      hub.emettreSession('tenue', 'signal', enveloppe(1, 1000));
      const avant = hub.retenusEtat();
      let leve = null, r1, r2;
      const circulaire = {}; circulaire.moi = circulaire;
      try { r1 = hub.emettreSession('tenue', 'signal', enveloppe(2, RETENU_SESSION + 10)); r2 = hub.emettreSession('tenue', 'signal', { appel: 'a', donnees: circulaire }); } catch (e) { leve = e; }
      v('⛔ une enveloppe de 256 Kio + 10 octets, et une autre qui contient une référence circulaire : ni l\'une ni l\'autre n\'est retenue (faux), rien ne lève, et ce qui était retenu est INTACT', [leve, r1, r2, hub.retenusEtat()], [null, false, false, avant]);
      const f = ouvrir(hub, 'tenue');
      v('   (le signal ordinaire d\'avant est livré)', f.signaux().map(s => s.donnees.i), [1]);
    } finally { hub.arreter(); }
  }

  /* ═══ 6. 2 000 SESSIONS ═══ */
  console.log('\n2 000 sessions au plus : la plus ancienne part');
  {
    const hub = monter();
    try {
      for (let s = 0; s < 2001; s++) hub.emettreSession('s-' + s, 'signal', enveloppe(s, 10));
      const e = hub.retenusEtat();
      v('2 001 sessions visées, 2 000 retenues', [e.sessions, e.entrees], [2000, 2000]);
      const premiere = ouvrir(hub, 's-0'), derniere = ouvrir(hub, 's-2000');
      v('⛔ c\'est la PLUS ANCIENNE qui est partie (la première n\'a rien, la dernière a son signal)', [premiere.signaux().length, derniere.signaux().length], [0, 1]);
    } finally { hub.arreter(); }
  }

  /* ═══ 7. LE COMPTE NE DÉRIVE PAS ═══ */
  console.log('\n⛔ Le compte d\'octets ne dérive pas : après des ajouts, des livraisons, des évictions et des péremptions, tout retiré il vaut ZÉRO');
  {
    const hub = monter();
    try {
      let k = 0;
      for (let tour = 0; tour < 6; tour++) {
        for (let s = 0; s < 30; s++) for (let i = 0; i < 12; i++) hub.emettreSession('d-' + ((tour * 7 + s) % 45), 'signal', enveloppe(k++, 800 + ((k * 137) % 9000)));
        for (let s = 0; s < 45; s += 4) ouvrir(hub, 'd-' + s, 'p_d' + s + '_' + tour);
        maintenant += 4000;
      }
      const milieu = hub.retenusEtat();
      vrai('population : au milieu, il reste des signaux retenus (' + milieu.entrees + ' pour ' + milieu.sessions + ' sessions, ' + Math.round(milieu.octets / KIO) + ' Kio)', milieu.entrees > 50 && milieu.octets > 0);
      maintenant += RETENU_MS + 1;
      const parti = await T.attendre(() => hub.retenusEtat().entrees === 0, 4000, 20);
      v('⛔ tout est périmé et balayé : zéro session, zéro entrée, ZÉRO octet (un compte qui dérive laisserait un reste)', [!!parti, hub.retenusEtat()], [true, { sessions: 0, octets: 0, entrees: 0 }]);
      hub.emettreSession('dernier', 'signal', enveloppe(0, 500));
      hub.arreter();
      v('   et arrêter le flux vide aussi ce qui reste', hub.retenusEtat(), { sessions: 0, octets: 0, entrees: 0 });
    } finally { hub.arreter(); }
  }
  fin();
})().catch((e) => { console.log('  ✗ le banc a levé : ' + (e && e.stack ? e.stack : e)); process.exitCode = 1; process.exit(1); });

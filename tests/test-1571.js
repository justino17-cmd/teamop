/* ══ LES RÉGLAGES SUIVENT LA PERSONNE D'UN APPAREIL À L'AUTRE — LA PAGE (lot m14 : pro#4, reglages#3, pro#3, pro@5, pro@6) ═════════════════════════════════════════════════
   Le testeur, deux appareils ouverts sur le même compte : réglées sur l'iPhone, les heures de travail (6 h 30) n'apparaissaient pas sur le Mac, dont le toucher suivant ÉCRASAIT
   le réglage par les heures par défaut ; « Pause pendant les réunions », « Confirmer l'envoi » et l'interrupteur de vie privée montraient l'ancien état. Le service prévient
   maintenant mes autres appareils (`test-1570`) ; ce fichier garde l'autre moitié, la PAGE : ses VRAIES fonctions, exécutées dans un bac à sable (`reglagesRelire`,
   `actionNotif`, `peindreCoteReglage`, `basculeReprendre`, `horaireAppliquer`, `surPrefs`) et son texte sans commentaires.

   Ce que ce fichier garde :
     · ⛔ l'événement « prefs » relit la rubrique OUVERTE (confidentialité, notifications, « Confirmer l'envoi ») et la repeint — SEULEMENT si l'état a changé (une repeinte
       inutile fait tomber le focus du clavier), jamais pendant un geste d'ici (il dit son propre verdict), jamais par-dessus un écran refait entre-temps, et une relecture
       REFUSÉE ne vide rien ;
     · ⛔ la conséquence qui comptait : sur un appareil resté en retard, le toucher sur « Heures de travail » ne remet plus les heures PAR DÉFAUT par-dessus celles de l'autre ;
     · pro#3 — couper les heures de travail ne coupe PAS le passage automatique en silence (rien n'est écrit à la place de la personne) : la ligne du Profil le DIT (« en pause »)
       au lieu de redire « Règle d'abord tes heures » comme si c'était coupé, et elle reste un interrupteur qu'on peut éteindre ; rien ne bascule tant que les heures sont coupées ;
     · pro@5 — la bascule différée par une fiche ou un menu ouvert sur l'Accueil a lieu dès qu'ils se ferment (et pas 30 s plus tard) ;
     · pro@6 — « Partout » dit qu'il ne vaut que du côté Pro.
   ⛔ Une assertion sur un ensemble vide ne prouve rien : chaque « rien n'a été écrit » est précédé d'un contrôle de population. */
'use strict';
process.env.TZ = 'Europe/Paris';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const RACINE = path.join(__dirname, '..');
const PAGE = fs.readFileSync(path.join(RACINE, 'apercu/opmessages/index.html'), 'utf8');
/* ⛔ pas de nettoyage naïf des blocs /* … *\/ : seulement ceux qui COMMENCENT une ligne, et les « // » précédés d'une espace (CLAUDE.md, 21 septembre 2026) */
const sansCommJs = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/(^|\s)\/\/\s.*$/gm, ' ');
const script = (/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1];
const JS = sansCommJs(script);
function decl(debut) {
  const i = JS.indexOf(debut); if (i < 0) return '';
  let j = JS.indexOf('{', i + debut.length - 1), n = 0, q = null;
  for (; j < JS.length; j++) {
    const ch = JS[j];
    if (q) { if (ch === '\\') { j++; continue; } if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { q = ch; continue; }
    if (ch === '{') n++;
    else if (ch === '}') { n--; if (n === 0) return JS.slice(i, j + 1) + (JS[j + 1] === ';' ? ';' : ''); }
  }
  return '';
}
const ligne = debut => { const i = JS.indexOf(debut); return i < 0 ? '' : JS.slice(i, JS.indexOf('\n', i)); };
const attendu = () => new Promise(r => setImmediate(r));

(async () => {
  console.log('\n1. La page relit la rubrique OUVERTE quand un réglage change ailleurs (pro#4, reglages#3)');
  {
    const morceaux = { reglagesRelire: decl('async function reglagesRelire('), actionNotif: decl('async function actionNotif(') };
    v('(population) les fonctions réelles sont trouvées dans la page', Object.keys(morceaux).filter(k => !morceaux[k]), []);
    if (morceaux.reglagesRelire && morceaux.actionNotif) {
      const HP = { jours: [1, 2, 3, 4, 5], debut: 390, fin: 1080 };
      /* l'état du SERVICE (ce que l'iPhone vient de régler) et ce que le Mac affiche encore */
      function bac(o) {
        const S = Object.assign({ conf: { trouvable: 'tous', presence: false, accuses: true, position: false }, notif: { possible: true, active: true, apercu: false, pauseReunion: true, heuresPro: HP }, refus: false }, o || {});
        const notes = { conf: 0, notif: 0, confirmer: 0, cote: 0, ecrits: [], lectures: 0 };
        const ctx = {
          JSON, Promise, Object, Array, String, Number, console,
          CAP: { reglages: true, notifications: true },
          reg: { conf: { trouvable: 'tous', presence: true, accuses: true, position: false }, notif: { possible: true, active: true, apercu: false, pauseReunion: true, heuresPro: null }, occupe: false, notifOccupe: false, notifErreur: '', notifMsg: '' },
          source: {
            confidentialite: async () => { notes.lectures++; if (S.refus) throw new Error('hors ligne'); return JSON.parse(JSON.stringify(S.conf)); },
            notifEtat: async () => { if (S.refus) throw new Error('hors ligne'); return JSON.parse(JSON.stringify(S.notif)); },
            notifHeuresPro: async r => { notes.ecrits.push(r); S.notif = Object.assign({}, S.notif, { heuresPro: r }); return S.notif; },
          },
          $: id => (id === 'reg-conf' || id === 'reg-notif') ? {} : null,
          peindreConf: () => { notes.conf++; }, peindreNotif: () => { notes.notif++; }, peindreConfirmer: () => { notes.confirmer++; }, peindreCoteReglage: () => { notes.cote++; },
          horaireAppliquer: () => {}, phrase: (e, d) => d, document: { getElementById: () => null },
        };
        vm.createContext(ctx);
        vm.runInContext([morceaux.reglagesRelire, morceaux.actionNotif, 'this.F = { reglagesRelire, actionNotif };'].join('\n'), ctx, { timeout: 3000 });
        return { F: ctx.F, S, notes, reg: ctx.reg };
      }
      { const x = bac(); await x.F.reglagesRelire();
        v('⛔ l\'autre appareil a réglé : la confidentialité (présence coupée) et les notifications (heures 6 h 30) sont RELUES et repeintes', [x.reg.conf.presence, x.reg.notif.heuresPro, x.notes.conf, x.notes.notif], [false, HP, 1, 1]);
        v('   « Confirmer l\'envoi » (lu du compte, sans réseau) est repeint aussi, et la carte du Profil (les heures du passage automatique)', [x.notes.confirmer, x.notes.cote], [1, 1]); }
      { const x = bac({ conf: { trouvable: 'tous', presence: true, accuses: true, position: false }, notif: { possible: true, active: true, apercu: false, pauseReunion: true, heuresPro: null } }); await x.F.reglagesRelire();
        v('⛔ RIEN n\'a changé (c\'est le retour de mon propre geste) : ni la confidentialité ni les notifications ne sont réécrites — le focus du clavier resterait sur l\'interrupteur',
          [x.notes.lectures, x.notes.conf, x.notes.notif], [1, 0, 0]); }
      { const x = bac(); x.reg.occupe = true; x.reg.notifOccupe = true; await x.F.reglagesRelire();
        v('⛔ pendant un geste d\'ICI (il dit son propre verdict) : la relecture ne le recouvre pas', [x.reg.conf.presence, x.reg.notif.heuresPro, x.notes.conf, x.notes.notif], [true, null, 0, 0]); }
      { const x = bac(); const p = x.F.reglagesRelire(); x.reg.conf = null; x.reg.notif = null; await p;
        v('⛔ l\'écran des réglages refait pendant la lecture (rendreReglages remet l\'état à zéro) : la relecture arrive trop tard et ne repose rien', [x.reg.conf, x.reg.notif, x.notes.conf, x.notes.notif], [null, null, 0, 0]); }
      { const x = bac({ refus: true }); await x.F.reglagesRelire();
        v('⛔ une relecture REFUSÉE (hors ligne) ne vide ni ne change rien : l\'écran garde ce qu\'il savait', [x.reg.conf.presence, x.reg.notif.heuresPro, x.notes.conf, x.notes.notif], [true, null, 0, 0]); }
      { const x = bac(); x.reg.conf = null; x.reg.notif = null; await x.F.reglagesRelire();
        v('un écran pas encore chargé (chargerReglages le lit) : la relecture ne lit pas la confidentialité', [x.notes.lectures, x.notes.conf, x.notes.notif], [0, 0, 0]); }
      { const x = bac({ notif: { possible: true, active: true, apercu: false, pauseReunion: true, heuresPro: HP } });
        x.reg.notif = Object.assign({}, x.S.notif, { heuresPro: null });                                  // le Mac affiche « Coupé »
        await x.F.actionNotif('heures');
        v('(témoin) SANS relecture, le toucher du Mac écrit les heures PAR DÉFAUT 9 h – 18 h par-dessus celles de l\'iPhone — c\'est ce que la relecture empêche',
          [x.notes.ecrits.length, x.notes.ecrits[0] && x.notes.ecrits[0].debut, x.notes.ecrits[0] && x.notes.ecrits[0].fin], [1, 540, 1080]); }
      { const x = bac({ notif: { possible: true, active: true, apercu: false, pauseReunion: true, heuresPro: HP } });
        x.reg.notif = Object.assign({}, x.S.notif, { heuresPro: null });
        await x.F.reglagesRelire();
        await x.F.actionNotif('heures');
        v('⛔ AVEC la relecture : le Mac montre les 6 h 30 de l\'iPhone, son toucher les COUPE (null) et n\'écrit aucun réglage par défaut', [x.notes.ecrits.length, x.notes.ecrits[0]], [1, null]); }
    }
    vrai('⛔ l\'événement « prefs » relit la rubrique ouverte (une ligne à part : surPrefs reste celle du côté)', /if \(ev\.type === 'prefs'\) reglagesRelire\(\);/.test(JS) && /if \(ev\.type === 'prefs'\) surPrefs\(\);/.test(JS));
  }

  console.log('\n2. Couper les heures de travail ne coupe pas le passage automatique EN SILENCE (pro#3)');
  {
    const morceaux = { peindreCoteReglage: decl('function peindreCoteReglage('), heuresTexte: decl('function heuresTexte('), NOM_COTE: ligne('const NOM_COTE = '), coteDe: ligne('const coteDe = '),
      JOURS_HP: ligne('const JOURS_HP = '), heureDite: ligne('const heureDite = '), dansHeuresPro: decl('function dansHeuresPro('), coteHoraire: decl('function coteHoraire('), horaireAttendu: decl('function horaireAttendu(') };
    { const i = JS.indexOf('const segCote = '); morceaux.segCote = i < 0 ? '' : JS.slice(i, JS.indexOf("join('') + '</div>';", i) + "join('') + '</div>';".length); }
    v('(population) les fonctions réelles sont trouvées dans la page', Object.keys(morceaux).filter(k => !morceaux[k]), []);
    if (!Object.keys(morceaux).filter(k => !morceaux[k]).length) {
      function bac(o) {
        const S = Object.assign({ auto: true, hp: null }, o || {});
        const notes = { auto: [] };
        let html = ''; const card = { hidden: true, dataset: {}, get innerHTML() { return html; }, set innerHTML(x) { html = x; } };
        const ctx = {
          Date, Math, JSON, Number, Array, Object, String, Infinity, console,
          etat: { mode: 'perso', route: { vue: 'reglages' } }, reg: {}, CAP: { notifications: true }, modesActifs: () => true,
          source: { modeAuto: () => S.auto, heuresPro: () => S.hp, modeChoisiLe: () => 0, choisirModeAuto: async b => { notes.auto.push(b); S.auto = b; return b; } },
          $: id => id === 'reg-cote' ? card : null, peindreMode: () => {}, esc: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'), CHEVRON: '<svg></svg>',
        };
        vm.createContext(ctx);
        vm.runInContext([morceaux.NOM_COTE, morceaux.coteDe, morceaux.segCote, morceaux.JOURS_HP, morceaux.heureDite, morceaux.heuresTexte, morceaux.dansHeuresPro, morceaux.coteHoraire, morceaux.horaireAttendu,
          morceaux.peindreCoteReglage, 'this.F = { peindreCoteReglage, horaireAttendu };'].join('\n'), ctx, { timeout: 3000 });
        return { F: ctx.F, S, notes, card };
      }
      { const x = bac({ auto: true, hp: null }); x.F.peindreCoteReglage(); const h = x.card.innerHTML;
        vrai('(population) la carte « Perso et Pro » est peinte', !x.card.hidden && /cote-seg-profil/.test(h), h.slice(0, 300));
        vrai('⛔ passage automatique ALLUMÉ et heures coupées : la ligne reste un interrupteur ALLUMÉ (rien n\'a été éteint à la place de la personne), qu\'on peut éteindre ici',
          /id="reg-mode-auto" aria-checked="true"/.test(h) && !/aria-disabled/.test(h.slice(h.indexOf('id="reg-mode-auto"'), h.indexOf('id="reg-mode-auto"') + 160)), h.slice(h.indexOf('Passer en Pro') - 200, h.indexOf('Passer en Pro') + 400));
        vrai('⛔ …et elle DIT qu\'il est en pause faute d\'heures de travail (au lieu de « Règle d\'abord tes heures de travail », qui laisse croire qu\'il est coupé)',
          /en pause/i.test(h) && /heures de travail sont coupées/.test(h) && !/Règle d.abord/.test(h), h.slice(h.indexOf('Passer en Pro'), h.indexOf('Passer en Pro') + 400));
        v('⛔ …et rien ne bascule tant que les heures sont coupées (l\'application ignore le passage automatique)', x.F.horaireAttendu(), null);
        v('   …et peindre la carte n\'a rien écrit au compte', x.notes.auto, []); }
      { const x = bac({ auto: false, hp: null }); x.F.peindreCoteReglage(); const h = x.card.innerHTML;
        vrai('coupé et sans heures : la ligne mène à Notifications (où elles se règlent), comme avant', /id="reg-mode-heures" data-reg-sec="notifications"/.test(h) && /Règle d.abord tes heures de travail/.test(h) && !/reg-mode-auto/.test(h), h.slice(0, 400)); }
      { const x = bac({ auto: true, hp: { jours: [1, 2, 3, 4, 5], debut: 540, fin: 1080 } }); x.F.peindreCoteReglage(); const h = x.card.innerHTML;
        vrai('avec des heures réglées : la phrase d\'avant (« Pro pendant tes heures… »), sans mot de pause', /id="reg-mode-auto" aria-checked="true"/.test(h) && /Pro pendant tes heures/.test(h) && !/en pause/i.test(h), h.slice(0, 400)); }
    }
  }

  console.log('\n3. La bascule différée par une fiche ouverte sur l\'Accueil a lieu dès qu\'elle se ferme (pro@5)');
  {
    const H = { t: 0 };
    class FauxDate extends Date { constructor(...a) { if (a.length) super(...a); else super(H.t); } static now() { return H.t; } }
    const PARIS = (a, mo, j, h, mi) => new Date(a, mo - 1, j, h, mi || 0).getTime();
    const morceaux = {
      dansHeuresPro: decl('function dansHeuresPro('), coteHoraire: decl('function coteHoraire('), horaireAttendu: decl('function horaireAttendu('), horaireAppliquer: decl('function horaireAppliquer('),
      surPrefs: decl('function surPrefs('), basculeAttend: ligne('const basculeAttend = '), minuteurPrefs: ligne('let minuteurPrefs = '), minuteur: ligne('let minuteurHoraire = '),
      changerMode: decl('async function changerMode('), ecrireCote: decl('async function ecrireCote('), annonceMode: ligne('const annonceMode = '), basculeReprendre: decl('function basculeReprendre('),
    };
    v('(population) les fonctions réelles sont trouvées dans la page', Object.keys(morceaux).filter(k => !morceaux[k]), []);
    if (!Object.keys(morceaux).filter(k => !morceaux[k]).length) {
      function bac(o) {
        const S = Object.assign({ auto: true, hp: { jours: [1, 2, 3, 4, 5], debut: 480, fin: 1020 }, le: 0, compte: 'pro' }, o || {});
        const notes = { ecrits: [], mots: [], minuteurs: [] };
        const ctx = {
          Date: FauxDate, Math, JSON, Number, Array, Object, String, Infinity, console,
          etat: Object.assign({ mode: 'pro', modeGesteLe: 0, modeEnVol: 0, modeNonEcrit: false, conv: null, route: { vue: 'accueil', feuille: 'reunion' }, menu: null, conversations: [], vcCat: null, selection: null, listeArchives: false }, S.etat || {}),
          reg: {}, CAP: {}, modesActifs: () => true,
          source: { modeAuto: () => S.auto, heuresPro: () => S.hp, modeChoisiLe: () => S.le, modeTravail: () => S.compte, choisirMode: async m => { notes.ecrits.push(m); return m; }, relireCote: async () => true },
          setTimeout: (f, ms) => { notes.minuteurs.push(ms); return notes.minuteurs.length; }, clearTimeout: () => {},
          rendreListe: () => {}, remplacer: () => {}, rendreVueContacts: () => {}, rendreReunions: () => {}, rendreAppels: () => {}, mot: t => notes.mots.push(t), phrase: (e, d) => d,
          peindreCoteReglage: () => {}, relireCompte: () => {}, $: () => null,
        };
        vm.createContext(ctx);
        vm.runInContext([morceaux.minuteur, morceaux.minuteurPrefs, morceaux.annonceMode, morceaux.dansHeuresPro, morceaux.coteHoraire, morceaux.horaireAttendu, morceaux.horaireAppliquer, morceaux.surPrefs, morceaux.basculeAttend,
          morceaux.changerMode, morceaux.ecrireCote, morceaux.basculeReprendre, 'this.F = { horaireAppliquer, surPrefs, basculeReprendre };'].join('\n'), ctx, { timeout: 3000 });
        return { F: ctx.F, S, notes, etat: ctx.etat };
      }
      const FIN17 = PARIS(2026, 10, 13, 17, 0) + 17000, DEBUT = PARIS(2026, 10, 13, 8, 0) + 1000;
      { H.t = FIN17; const x = bac({ le: DEBUT }); x.F.horaireAppliquer(false);
        v('(population) 17 h 00 min 17 s, une fiche ouverte sur l\'Accueil : la bascule en Perso ATTEND (relue dans 30 s), rien d\'écrit', [x.etat.mode, x.notes.ecrits, x.notes.minuteurs], ['pro', [], [30000]]);
        x.F.basculeReprendre();
        v('⛔ la fiche est toujours ouverte : fermer… rien (elle attend toujours)', [x.etat.mode, x.notes.ecrits], ['pro', []]);
        x.etat.route = { vue: 'accueil' }; x.F.basculeReprendre();
        v('⛔ la fiche se ferme : le passage en Perso a lieu TOUT DE SUITE (pas au bout de 30 s : aucune minuterie n\'est écoulée), écrit au compte', [x.etat.mode, x.notes.ecrits], ['perso', ['perso']]);
        x.F.basculeReprendre();
        v('   et ne se rejoue pas', x.notes.ecrits, ['perso']); }
      { H.t = FIN17; const x = bac({ le: DEBUT, etat: { route: { vue: 'accueil' }, menu: { mid: 'm1' } } }); x.F.horaireAppliquer(false);
        v('(population) un MENU ouvert sur l\'Accueil retient la bascule aussi', [x.etat.mode, x.notes.minuteurs], ['pro', [30000]]);
        x.etat.menu = null; x.F.basculeReprendre();
        v('⛔ le menu se ferme : elle a lieu tout de suite', [x.etat.mode, x.notes.ecrits], ['perso', ['perso']]); }
      { H.t = FIN17; const x = bac({ le: DEBUT, auto: false, compte: 'perso' }); x.F.surPrefs();
        v('(population) un côté choisi AILLEURS (Perso) attend la fiche ouverte sur l\'Accueil', [x.etat.mode, x.notes.minuteurs.includes(30000)], ['pro', true]);
        x.etat.route = { vue: 'messages' }; x.F.basculeReprendre();
        v('⛔ on quitte l\'Accueil : il est suivi tout de suite, sans le réécrire (l\'écriture repousserait l\'événement)', [x.etat.mode, x.notes.ecrits], ['perso', []]); }
      { H.t = FIN17; const x = bac({ le: DEBUT, etat: { route: { vue: 'accueil' } } }); x.F.basculeReprendre();
        v('⛔ rien n\'attendait : basculeReprendre ne fait RIEN (population : un Accueil libre, des heures finies, et pourtant aucun geste)', [x.etat.mode, x.notes.ecrits, x.notes.minuteurs], ['pro', [], []]); }
    }
    /* les deux endroits où une fiche ou un menu se ferment le rappellent (le texte, sans commentaires : ces fonctions touchent le DOM) */
    vrai('⛔ appliquer(route) — une fiche fermée, un autre écran — rappelle la bascule différée', /basculeReprendre\(\);/.test(decl('function appliquer(')));
    vrai('⛔ fermerMenu() — un menu fermé — la rappelle aussi', /basculeReprendre\(\);/.test(decl('function fermerMenu(')));
  }

  console.log('\n4. « Partout » dit qu\'il ne vaut que du côté Pro (pro@6)');
  {
    const lib = ligne('const CONFIRMER = ');
    vrai('(population) la liste des choix est trouvée', /\['jamais', 'Jamais'\]/.test(lib), lib);
    vrai('⛔ le choix « Partout » porte « (côté Pro) » — avec « Partout », une conversation Perso part sans demander : le mot laissait croire le contraire', /\['partout', 'Partout \(côté Pro\)'\]/.test(lib), lib);
    vrai('⛔ …et le menu le dit aussi : « Ne s\'applique qu\'aux conversations Pro »', /ouvrirDeroule\(bouton, 'Confirmer l\\'envoi', '[^']*Ne s\\'applique qu\\'aux conversations Pro[^']*'/.test(JS), '');
  }
  fin();
})().catch(e => { vrai('le banc a tourné sans exception', false, String(e && e.stack || e)); fin(); });

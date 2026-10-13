/* ══ PERSO / PRO : UNE SEULE BASCULE, ET LE PASSAGE AUTOMATIQUE EN PRO AUX HEURES DE TRAVAIL (11 octobre 2026) ═══════════════════════════════════════════════
   Justin : « un système pour basculer du pro au perso, mais quand on bascule, c'est TOUT qui bascule. Que dans chaque onglet on ne choisisse pas pro ou perso. Quand on est sur
   pro, on n'est que sur pro. Je ne veux pas que sur téléphone, dans les messages, on puisse basculer. Et même, que les pros puissent régler dans leur espace : basculer
   automatiquement l'application en mode pro de 8 h à 17 h. »

   Ce que ce fichier garde, en trois familles :
   1. LA PAGE (l'aperçu, la source de Justin) — ses VRAIES fonctions exécutées dans un bac à sable (`coteHoraire`, `horaireAppliquer`, `surPrefs`, `changerMode`,
      `peindreCoteReglage`) sous une horloge posée, et son texte sans commentaires : plus de sélecteur sous le titre de Messages ni sous celui de l'Agenda, plus de choix
      « Agenda : Perso | Pro » dans les fiches, un seul segment dans le HTML (la barre latérale) et celui du Profil caché là où la barre latérale paraît ;
   2. LE VRAI SERVICE en HTTP — ⛔ l'heure du dernier choix de côté (`mode_le`) est celle du SERVICE, jamais lue dans le corps ; `mode_auto` n'accepte qu'un booléen ;
      ⛔ l'événement `prefs` part vers MES autres appareils et vers PERSONNE d'autre (ni contact, ni co-membre), sans rien dans l'enveloppe ; il ne part que quand le côté,
      le passage automatique ou les heures changent ;
   3. LA COUTURE — les vraies `api.js` et `source-serveur.js` contre le vrai service, DEUX appareils de la même personne : ce que l'un choisit, l'autre le lit en direct.
   ⛔ Une assertion sur un ensemble vide ne prouve rien : chaque « rien n'est arrivé » est suivi d'une SENTINELLE qui, elle, doit arriver. */
'use strict';
process.env.TZ = 'Europe/Paris';                // l'heure de l'appareil : les bornes se calculent en heure LOCALE (changements d'heure compris)
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const RACINE = path.join(__dirname, '..');
const PAGE = fs.readFileSync(path.join(RACINE, 'apercu/opmessages/index.html'), 'utf8');
/* ⛔ pas de nettoyage naïf des blocs /* … *\/ : seulement ceux qui COMMENCENT une ligne, et les « // » précédés d'une espace (CLAUDE.md, 21 septembre 2026) */
const sansCommJs = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/(^|\s)\/\/\s.*$/gm, ' ');
const script = (/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1];
const JS = sansCommJs(script);
const CSS = ((/<style>([\s\S]*?)<\/style>/.exec(PAGE) || [, ''])[1]).replace(/\/\*[\s\S]*?\*\//g, ' ');
const HTML = PAGE.replace(/<style>[\s\S]*?<\/style>/, ' ').replace(/<script>[\s\S]*?<\/script>/, ' ').replace(/<!--[\s\S]*?-->/g, ' ');

/* le corps d'une déclaration, de son début à SA dernière accolade (les chaînes et les gabarits sont sautés) */
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

/* ═══ 1. LA PAGE ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
async function partie1() {
  console.log('\n1. La page : une seule bascule, et le passage automatique joué par ses vraies fonctions');
{
  const morceaux = {
    dansHeuresPro: decl('function dansHeuresPro('), coteHoraire: decl('function coteHoraire('), horaireAttendu: decl('function horaireAttendu('),
    horaireAppliquer: decl('function horaireAppliquer('), surPrefs: decl('function surPrefs('), changerMode: decl('async function changerMode('),
    ecrireCote: decl('async function ecrireCote('), relireCompte: decl('function relireCompte('), basculeAttend: ligne('const basculeAttend = '), minuteurPrefs: ligne('let minuteurPrefs = '),
    peindreCoteReglage: decl('function peindreCoteReglage('), heuresTexte: decl('function heuresTexte('),
    NOM_COTE: ligne('const NOM_COTE = '), coteDe: ligne('const coteDe = '), segCote: decl('const segCote = ') || '', annonceMode: ligne('const annonceMode = '),
    JOURS_HP: ligne('const JOURS_HP = '), heureDite: ligne('const heureDite = '), minuteur: ligne('let minuteurHoraire = '),
  };
  /* segCote est une flèche sur deux lignes, sans accolade de corps : on la lit jusqu'à son point-virgule final */
  { const i = JS.indexOf('const segCote = '); morceaux.segCote = i < 0 ? '' : JS.slice(i, JS.indexOf("join('') + '</div>';", i) + "join('') + '</div>';".length); }
  const manquants = Object.keys(morceaux).filter(k => !morceaux[k]);
  v('(population) les fonctions réelles sont trouvées dans la page', manquants, []);

  /* le bac à sable : une horloge posée (Date.now et `new Date()` sans argument), les minuteries notées, la source et l'écran simulés */
  const H = { t: 0 };
  class FauxDate extends Date { constructor(...a) { if (a.length) super(...a); else super(H.t); } static now() { return H.t; } }
  const PARIS = (a, mo, j, h, mi) => new Date(a, mo - 1, j, h, mi || 0).getTime();       // TZ=Europe/Paris : l'heure locale de l'appareil
  function bac(o) {
    const S = Object.assign({ auto: true, hp: { jours: [1, 2, 3, 4, 5], debut: 480, fin: 1020 }, le: 0, compte: 'perso', actifs: true }, o || {});
    const notes = { ecrits: [], mots: [], minuteurs: [], annules: 0, rendus: 0, card: null, peints: 0, ecritures: 0 };
    /* la carte du Profil : on COMPTE ses réécritures (une réécriture inutile fait tomber le focus du clavier) */
    { let html = ''; notes.card = { hidden: true, dataset: {}, get innerHTML() { return html; }, set innerHTML(v) { html = v; notes.ecritures++; } }; }
    const ctx = {
      Date: FauxDate, Math, JSON, Number, Array, Object, String, Infinity, console,
      etat: Object.assign({ mode: 'perso', modeGesteLe: 0, modeEnVol: 0, modeNonEcrit: false, conv: null, route: { vue: 'messages' }, conversations: [], vcCat: null, selection: null, listeArchives: false }, S.etat || {}),
      reg: {}, CAP: { notifications: true },
      modesActifs: () => S.actifs,
      source: {
        modeAuto: () => S.auto, heuresPro: () => S.hp, modeChoisiLe: () => S.le, modeTravail: () => S.compte,
        choisirMode: async m => { notes.ecrits.push(m); if (S.refuse) throw new Error('hors ligne'); return m; }, choisirModeAuto: async b => { S.auto = b; return b; },
        relireCote: async () => { notes.relectures = (notes.relectures || 0) + 1; return !S.horsLigne; },
      },
      setTimeout: (f, ms) => { notes.minuteurs.push(ms); return notes.minuteurs.length; }, clearTimeout: () => { notes.annules++; },
      rendreListe: () => { notes.rendus++; }, remplacer: () => {}, rendreVueContacts: () => {}, rendreReunions: () => {}, rendreAppels: () => {},
      mot: t => notes.mots.push(t), phrase: (e, d) => d, $: id => id === 'reg-cote' ? notes.card : null, peindreMode: () => { notes.peints++; },
      esc: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'), CHEVRON: '<svg></svg>', peindreCoteReglage: null,
    };
    vm.createContext(ctx);
    vm.runInContext([morceaux.NOM_COTE, morceaux.coteDe, morceaux.segCote, morceaux.annonceMode, morceaux.JOURS_HP, morceaux.heureDite, morceaux.heuresTexte, morceaux.minuteur,
      morceaux.dansHeuresPro, morceaux.coteHoraire, morceaux.horaireAttendu, morceaux.horaireAppliquer, morceaux.minuteurPrefs, morceaux.surPrefs, morceaux.basculeAttend, morceaux.relireCompte,
      morceaux.changerMode, morceaux.ecrireCote, morceaux.peindreCoteReglage,
      'this.F = { coteHoraire, horaireAppliquer, surPrefs, changerMode, ecrireCote, peindreCoteReglage, horaireAttendu, relireCompte };'].join('\n'), ctx, { timeout: 3000 });
    return { F: ctx.F, S, notes, etat: ctx.etat, ctx };
  }
  if (!manquants.length) {
    /* — les bornes : semaine de bureau (8 h – 17 h, du lundi au vendredi), et une nuit — */
    const { F } = bac();
    const SEM = { jours: [1, 2, 3, 4, 5], debut: 480, fin: 1020 }, NUIT = { jours: [5], debut: 1320, fin: 360 };
    const b = (hp, t) => { const r = F.coteHoraire(hp, t); return [r.cote, new Date(r.depuis).toString().slice(0, 21), new Date(r.prochain).toString().slice(0, 21)]; };
    v('mardi 10 h (13 octobre 2026) : Pro, depuis mardi 8 h, jusqu\'à mardi 17 h', b(SEM, PARIS(2026, 10, 13, 10)), ['pro', 'Tue Oct 13 2026 08:00', 'Tue Oct 13 2026 17:00']);
    v('⛔ mardi 17 h PILE : Perso (la fin est exclue, comme le service), depuis 17 h, jusqu\'à mercredi 8 h', b(SEM, PARIS(2026, 10, 13, 17)), ['perso', 'Tue Oct 13 2026 17:00', 'Wed Oct 14 2026 08:00']);
    v('mardi 7 h 59 : Perso, depuis lundi 17 h, jusqu\'à mardi 8 h', b(SEM, PARIS(2026, 10, 13, 7, 59)), ['perso', 'Mon Oct 12 2026 17:00', 'Tue Oct 13 2026 08:00']);
    v('samedi midi : Perso, depuis vendredi 17 h, jusqu\'à LUNDI 8 h (le week-end n\'est pas une borne)', b(SEM, PARIS(2026, 10, 17, 12)), ['perso', 'Fri Oct 16 2026 17:00', 'Mon Oct 19 2026 08:00']);
    v('⛔ une nuit appartient au jour où elle COMMENCE : samedi 2 h (nuit du vendredi, 22 h – 6 h) est Pro, depuis vendredi 22 h, jusqu\'à samedi 6 h',
      b(NUIT, PARIS(2026, 10, 17, 2)), ['pro', 'Fri Oct 16 2026 22:00', 'Sat Oct 17 2026 06:00']);
    v('⛔ le changement d\'heure (dimanche 25 octobre 2026) ne décale pas la borne : lundi 26, l\'automatique part à 8 h LOCALES', b(SEM, PARIS(2026, 10, 26, 7, 30))[2], 'Mon Oct 26 2026 08:00');

    /* — horaireAppliquer : la borne passée depuis le dernier choix décide ; un choix fait APRÈS la borne l'emporte — */
    const MAR10 = PARIS(2026, 10, 13, 10), LUN20 = PARIS(2026, 10, 12, 20), MAR930 = PARIS(2026, 10, 13, 9, 30);
    { H.t = MAR10; const x = bac({ le: LUN20 }); x.F.horaireAppliquer(false);
      v('⛔ mardi 10 h, dernier choix lundi 20 h : la page PASSE en Pro, l\'écrit au compte, et le dit', [x.etat.mode, x.notes.ecrits, x.notes.mots.includes('Heures de travail : OP MESSAGES PRO')], ['pro', ['pro'], true]);
      v('   la prochaine relecture : au plus 30 minutes (la borne de 17 h est plus loin)', x.notes.minuteurs, [30 * 60000]); }
    { H.t = MAR10; const x = bac({ le: MAR930 }); x.F.horaireAppliquer(false);
      v('⛔ un choix fait APRÈS la borne (mardi 9 h 30, sur un autre appareil) n\'est PAS défait : on reste Perso, rien n\'est écrit', [x.etat.mode, x.notes.ecrits, x.notes.mots], ['perso', [], []]);
      v('   (le minuteur, lui, est armé : la borne de 17 h reprendra la main)', x.notes.minuteurs.length, 1); }
    { H.t = MAR10; const x = bac({ le: LUN20, etat: { modeGesteLe: PARIS(2026, 10, 13, 9, 45) } }); x.F.horaireAppliquer(false);
      v('⛔ un choix fait ICI après la borne (9 h 45), même s\'il n\'a pas pu s\'écrire au compte : on reste Perso', [x.etat.mode, x.notes.ecrits], ['perso', []]); }
    { H.t = MAR10; const x = bac({ le: MAR930 }); x.F.horaireAppliquer(true);
      v('⛔ ALLUMER le réglage vaut tout de suite (force), même après un choix : Pro', [x.etat.mode, x.notes.ecrits], ['pro', ['pro']]); }
    { H.t = MAR10; const x = bac({ le: LUN20, auto: false }); x.F.horaireAppliquer(false);
      v('⛔ coupé : rien ne bascule, et AUCUN minuteur', [x.etat.mode, x.notes.ecrits, x.notes.minuteurs], ['perso', [], []]); }
    { H.t = MAR10; const x = bac({ le: LUN20, hp: null }); x.F.horaireAppliquer(false);
      v('⛔ allumé mais sans heures de travail : rien ne bascule, aucun minuteur', [x.etat.mode, x.notes.minuteurs], ['perso', []]); }
    { H.t = MAR10; const x = bac({ le: LUN20, actifs: false }); x.F.horaireAppliquer(false);
      v('⛔ un compte sans les deux côtés : rien', [x.etat.mode, x.notes.ecrits, x.notes.minuteurs], ['perso', [], []]); }
    { H.t = PARIS(2026, 10, 13, 16, 50); const x = bac({ le: PARIS(2026, 10, 13, 8, 0) + 1000, etat: { mode: 'pro' } }); x.F.horaireAppliquer(false);
      v('mardi 16 h 50, déjà Pro : rien ne change, le minuteur vise 17 h (+ 1 s)', [x.etat.mode, x.notes.minuteurs], ['pro', [10 * 60000 + 1000]]); }
    { H.t = PARIS(2026, 10, 13, 17, 0) + 1000; const x = bac({ le: PARIS(2026, 10, 13, 8, 0) + 1000, etat: { mode: 'pro' } }); x.F.horaireAppliquer(false);
      v('⛔ 17 h : retour en Perso, écrit, et dit « Fin des heures de travail »', [x.etat.mode, x.notes.ecrits, x.notes.mots.includes('Fin des heures de travail : OP MESSAGES · Perso')], ['perso', ['perso'], true]); }
    { H.t = MAR10; const x = bac({ le: LUN20, etat: { conv: 'c1', route: { vue: 'messages', conv: 'c1' }, conversations: [{ id: 'c1', cote: 'perso' }] } });
      let remplace = 0; x.ctx.remplacer = () => { remplace++; }; x.F.horaireAppliquer(false);
      v('⛔ la conversation qu\'on écrivait reste OUVERTE au passage automatique (la liste, elle, est passée Pro)', [x.etat.mode, remplace], ['pro', 0]); }

    /* — surPrefs : ce qu'un autre appareil a choisi, la page le suit sans le réécrire — */
    { const x = bac({ compte: 'pro', auto: false }); x.F.surPrefs();
      v('⛔ un côté choisi sur un AUTRE appareil : la page le suit, l\'annonce, et ne le réécrit PAS (une écriture repousserait l\'événement)', [x.etat.mode, x.notes.ecrits, x.notes.mots], ['pro', [], ['OP MESSAGES PRO']]); }
    { const x = bac({ compte: 'pro', auto: false, etat: { modeEnVol: 1 } }); x.F.surPrefs();
      v('⛔ pendant qu\'un choix fait ICI est en route, l\'événement qui le croise ne remet pas l\'ancien côté', x.etat.mode, 'perso'); }
    { H.t = MAR10; const x = bac({ le: MAR930 }); x.F.changerMode('pro');
      v('un geste ici : le côté change, s\'écrit au compte, et l\'heure du geste est notée sur l\'appareil', [x.etat.mode, x.notes.ecrits, x.etat.modeGesteLe], ['pro', ['pro'], MAR10]); }

    /* — la relecture du 11 octobre 2026 — */
    { const SAM = { jours: [6], debut: 1320, fin: 150 };                         // le samedi, 22 h – 2 h 30 : la nuit du passage à l'heure d'hiver (25 octobre 2026)
      const t215bis = Date.UTC(2026, 9, 25, 1, 15);                              // 2 h 15 « bis » (heure d'hiver), APRÈS la fin de la nuit (2 h 30 d'été = 0 h 30 UTC)
      v('⛔ l\'heure répétée du passage à l\'heure d\'hiver : 2 h 15 « bis » est Perso (la nuit a fini à 2 h 30 d\'été) — le côté est celui de la dernière borne, plus celui de l\'horloge',
        [F.coteHoraire(SAM, t215bis).cote, new Date(F.coteHoraire(SAM, t215bis).depuis).toISOString()], ['perso', '2026-10-25T00:30:00.000Z']); }
    { H.t = MAR10; const x = bac({ le: MAR930, refuse: true }); await x.F.changerMode('pro');
      v('⛔ un choix fait HORS LIGNE : le côté tient sur l\'appareil, marqué non écrit, et la page le dit (« s\'enregistrera au retour du réseau »)',
        [x.etat.mode, x.etat.modeNonEcrit, x.etat.modeEnVol, x.notes.mots.some(m => /s'enregistrera au retour du réseau/.test(m))], ['pro', true, 0, true]);
      x.S.compte = 'perso'; x.S.refuse = false; x.F.surPrefs(); await new Promise(r => setImmediate(r));
      v('⛔ l\'événement « prefs » suivant ne le défait PAS : le choix d\'ici s\'écrit, et n\'est plus « non écrit »', [x.etat.mode, x.notes.ecrits, x.etat.modeNonEcrit], ['pro', ['pro', 'pro'], false]); }
    { H.t = PARIS(2026, 10, 13, 17, 0) + 1000; const x = bac({ le: PARIS(2026, 10, 13, 8, 0) + 1000, etat: { mode: 'pro', route: { vue: 'accueil', feuille: 'reunion' } } }); x.F.horaireAppliquer(false);
      v('⛔ 17 h avec une fiche ouverte sur l\'Accueil (passer en Perso quitte l\'Accueil, la fiche partirait) : la bascule ATTEND, relue dans 30 s', [x.etat.mode, x.notes.ecrits, x.notes.minuteurs], ['pro', [], [30000]]);
      x.etat.route = { vue: 'accueil' }; x.F.horaireAppliquer(false);
      v('   la fiche fermée : elle a lieu', [x.etat.mode, x.notes.ecrits], ['perso', ['perso']]); }
    { const x = bac({ compte: 'perso', auto: false, etat: { mode: 'pro', route: { vue: 'accueil', feuille: 'evenement' } } }); x.F.surPrefs();
      v('⛔ de même pour un côté choisi ailleurs : il attend la fiche ouverte sur l\'Accueil', [x.etat.mode, x.notes.minuteurs.includes(30000)], ['pro', true]); }
    { const x = bac({}); x.F.relireCompte(); await new Promise(r => setImmediate(r));
      v('relire le compte passe par la source (l\'événement qui en revient rappelle surPrefs) — rien n\'est jugé sur l\'état d\'avant', [x.notes.relectures, x.notes.minuteurs.length], [1, 0]);
      x.S.horsLigne = true; x.F.relireCompte(); await new Promise(r => setImmediate(r));
      v('   sans réseau, l\'horaire juge seul (et arme sa borne)', [x.notes.relectures, x.notes.minuteurs.length], [2, 1]); }

    /* — la carte « Perso et Pro » du Profil — */
    { const x = bac({ actifs: false }); x.F.peindreCoteReglage();
      v('⛔ un compte sans les deux côtés n\'a pas la carte', [x.notes.card.hidden, x.notes.card.innerHTML], [true, '']); }
    { const x = bac({ auto: true }); x.F.peindreCoteReglage(); const h = x.notes.card.innerHTML;
      vrai('la carte porte LE segment (cote-seg-profil, data-cote-seg) et l\'interrupteur allumé, avec les heures dites', !x.notes.card.hidden && /class="seg cote-seg cote-seg-profil"[^>]*data-cote-seg/.test(h)
        && /id="reg-mode-auto" aria-checked="true"/.test(h) && h.includes('Pro pendant tes heures (8 h – 17 h, du lundi au vendredi), Perso le reste du temps') && x.notes.peints === 1, h.slice(0, 600));
      x.F.peindreCoteReglage();
      v('⛔ repeinte sans rien de changé (le geste revient par l\'événement « prefs ») : la carte n\'est PAS réécrite (le focus du clavier resterait sur l\'interrupteur), le segment se repeint', [x.notes.ecritures, x.notes.peints], [1, 2]);
      x.S.auto = false; x.F.peindreCoteReglage();
      v('   …et réécrite quand le réglage change', [x.notes.ecritures, /aria-checked="false"/.test(x.notes.card.innerHTML)], [2, true]); }
    { const x = bac({ auto: false, hp: null }); x.F.peindreCoteReglage(); const h = x.notes.card.innerHTML;
      vrai('⛔ sans heures de travail, la ligne mène à Notifications (où elles se règlent) — pas d\'interrupteur qui ne ferait rien', /id="reg-mode-heures" data-reg-sec="notifications"/.test(h) && !/reg-mode-auto/.test(h), h.slice(0, 600)); }
  }

  /* — le texte : plus de bascule dans les onglets ni dans les fiches — */
  vrai('⛔ plus de sélecteur sous le titre de Messages ni sous celui de l\'Agenda (ni dans le HTML, ni dans le script, ni dans la feuille)', !/cote-seg-liste|cote-seg-agenda/.test(PAGE));
  v('⛔ UN seul segment Perso | Pro écrit dans le HTML : celui de la barre latérale', (HTML.match(/data-cote-seg/g) || []).length, 1);
  vrai('   …et il est dans la barre latérale', /<div class="seg cote-seg cote-seg-side"[^>]*data-cote-seg/.test(HTML));
  v('⛔ le seul autre segment est posé par la carte du Profil', (JS.match(/segCote\('/g) || []).map(() => 1).length, 1);
  vrai('   (dans peindreCoteReglage)', /segCote\('cote-seg-profil'\)/.test(decl('function peindreCoteReglage(')));
  v('⛔ plus de choix « Agenda : Perso | Pro » dans les fiches (choixCote, coteChoisi(), data-choix-cote ont disparu — `lc.coteChoisi` est le côté rangé d\'une conversation, une donnée)',
    JS.match(/choixCote|coteChoisi\(|data-choix-cote/g), null);
  vrai('⛔ un événement CRÉÉ est du côté où l\'on était en OUVRANT sa fiche (une borne passée pendant qu\'on l\'écrivait ne l\'envoie pas dans l\'agenda qu\'on ne voit pas) ; modifié, il garde le sien',
    /\bcote: etat\.mode\b/.test(ligne('reu.formEvt = {')) && /if \(!F\.id && modesActifs\(\)\) champs\.cote = F\.cote \|\| etat\.mode;/.test(decl('async function evtEnregistrer(')));
  vrai('⛔ une réunion CRÉÉE est rangée du côté où l\'on était en ouvrant sa fiche', /cote: etat\.mode \};/.test(ligne('reu.form = { id: id || null')) && /if \(!F\.id && modesActifs\(\)\) c\.cote = F\.cote \|\| etat\.mode;/.test(JS));
  vrai('⛔ le segment du Profil se cache là où la barre latérale paraît (≥ 900 px, et la tablette dès 781 px) — un seul à l\'écran',
    /@media \(min-width: 900px\) \{ \.reg-cote-seg, \.marque-tel \{ display: none !important; \} \}/.test(CSS)
      && /@media \(min-width: 781px\) and \(max-width: 899\.98px\) \{ html\[data-kind="tablette"\] \.reg-cote-seg, html\[data-kind="tablette"\] \.marque-tel \{ display: none !important; \} \}/.test(CSS));
  vrai('⛔ la page suit le compte EN DIRECT (l\'événement prefs mène à surPrefs)', /if \(ev\.type === 'prefs'\) surPrefs\(\);/.test(JS));
  vrai('⛔ le passage automatique est armé au démarrage (après la route) ; revenir sur la page et le réseau revenu RELISENT le compte avant l\'horaire',
    /appliquer\(r0\);\s*horaireAppliquer\(false\);/.test(JS)
    && /addEventListener\('visibilitychange', \(\) => \{ if \(document\.visibilityState === 'visible'\) relireCompte\(\); \}\)/.test(JS)
    && /if \(ev\.etat === 'ok'\) \{ verifierVersion\(\); relireCompte\(\); \}/.test(JS));
  vrai('⛔ au démarrage, la borne passée depuis le dernier choix décide du côté où l\'on OUVRE (sans écran qui change sous les yeux)',
    /const h = horaireAttendu\(\);\s*if \(h && h\.cote !== etat\.mode && \(typeof source\.modeChoisiLe === 'function' \? source\.modeChoisiLe\(\) : 0\) < h\.depuis\) \{\s*etat\.mode = h\.cote; etat\.modeGesteLe = Date\.now\(\); ecrireCote\(h\.cote, false\);/.test(JS));
  vrai('des heures changées (Notifications) recalent la carte et le passage automatique', /if \(quoi === 'heures' \|\| quoi === 'heures-maj'\) \{ peindreCoteReglage\(\); horaireAppliquer\(false\); \}/.test(JS));
  vrai('l\'interrupteur du Profil a son geste', /if \(bouton\.id === 'reg-mode-auto'\) \{ basculerModeAuto\(\); return; \}/.test(JS) && /horaireAppliquer\(vers\)/.test(decl('async function basculerModeAuto(')));
  vrai('au téléphone, la photo du profil porte le point du non-lu de l\'autre côté', /<b class="moi-point" aria-hidden="true" hidden><\/b><\/a>/.test(JS)
    && /querySelectorAll\('\.moi-pastille'\)\.forEach\(a => \{\s*const pt = a\.querySelector\('\.moi-point'\); if \(pt\) pt\.hidden = !n;/.test(decl('function peindreMode(')));
}
}

/* ═══ 2 et 3. LE VRAI SERVICE, ET LA COUTURE ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
if (!fs.existsSync(path.join(T.SERVICE, 'node_modules'))) partie1().then(() => { console.log('\n  ⚠️ dépendances du service absentes : la partie service est sautée'); fin(); });
else (async () => {
  await partie1();
  const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
  const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
  const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
  const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
  const sha = x => crypto.createHash('sha256').update(x).digest('hex');
  const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');
  const JOUR = 86400000;
  const MDP = { dora: 'pw-dora-12345' };
  const og = await T.fauxOpGestion({ dora: { pass: MDP.dora, nom: 'Dora Banc', actif: true } });
  const svc = await T.lancerService({ urlGestion: og.url });
  const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
  let k = 0;
  const pers = nom => S.personneCreer({ identifiant: 'beta:' + nom + (++k) + crypto.randomBytes(2).toString('hex'), prenom: nom, nom: 'Banc', origine: 'beta', verifie: true });
  const cl = p => { const c = T.client(svc.base); const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 30 * JOUR }); c.poserCookie(j); c.moi = p; return c; };
  const flux = [], sources = [];
  try {
    console.log('\n2. Le vrai service : l\'heure du choix, le passage automatique, l\'événement à soi seul');
    const ana = pers('Ana'), ben = pers('Ben');
    S.contactLier(ana.id, ben.id);
    const a1 = cl(ana), a2 = cl(ana), b = cl(ben);
    await a1.post('/api/conversations/groupe', { nom: 'Chantier', membres: [ben.id] });       // Ben est AUSSI co-membre d'Ana : l'audience la plus large de sa personne
    const fA2 = await T.flux(a2), fB = await T.flux(b); flux.push(fA2, fB);
    v('(population) les deux flux sont ouverts', [fA2.statut, fB.statut], [200, 200]);
    const prefsDe = f => f.evenements.filter(e => e.event === 'prefs');

    const t0 = Date.now();
    const r1 = await a1.post('/api/moi/maj', { prefs: { mode: 'pro', mode_le: 1 } });
    const t1 = Date.now();
    v('choisir Pro : 200', r1.code, 200);
    vrai('⛔ mode_le est l\'heure du SERVICE (entre l\'envoi et la réponse), jamais celle du corps (1)', r1.j && r1.j.moi.prefs.mode === 'pro' && r1.j.moi.prefs.mode_le >= t0 && r1.j.moi.prefs.mode_le <= t1, JSON.stringify(r1.j && r1.j.moi.prefs));
    await fA2.attendre(e => e.event === 'prefs');
    v('⛔ l\'AUTRE appareil d\'Ana reçoit « prefs » tout de suite, l\'enveloppe vide', prefsDe(fA2).map(e => e.data), [{}]);
    const le1 = r1.j.moi.prefs.mode_le;
    const r2 = await a1.post('/api/moi/maj', { prefs: { mode_le: 5 } });
    v('⛔ mode_le écrit seul dans le corps : ignoré (le service garde le sien)', [r2.code, r2.j && r2.j.moi.prefs.mode_le], [200, le1]);
    await T.dort(120);
    const n1 = prefsDe(fA2).length;
    const rMeme = await a1.post('/api/moi/maj', { prefs: { mode: 'pro' } });               // le même côté, renvoyé
    v('⛔ le même côté renvoyé ne rafraîchit pas mode_le (une page en retard ne suspend pas l\'automatique des autres appareils)', rMeme.j && rMeme.j.moi.prefs.mode_le, le1);
    await a1.post('/api/moi/maj', { prefs: { vitesse_vocal: '1.5' } });     // un réglage sans rapport
    v('mode_auto : seul un booléen passe (« oui », 1, null : 400)', [(await a1.post('/api/moi/maj', { prefs: { mode_auto: 'oui' } })).code, (await a1.post('/api/moi/maj', { prefs: { mode_auto: 1 } })).code, (await a1.post('/api/moi/maj', { prefs: { mode_auto: null } })).code], [400, 400, 400]);
    const r3 = await a1.post('/api/moi/maj', { prefs: { mode_auto: true } });      // SENTINELLE : celui-ci doit partir
    v('allumer le passage automatique : 200, retenu par le compte', [r3.code, r3.j && r3.j.moi.prefs.mode_auto], [200, true]);
    await fA2.attendre(e => e.event === 'prefs' && prefsDe(fA2).length > n1);
    v('⛔ le même côté renvoyé et un réglage sans rapport n\'ont RIEN envoyé ; le passage automatique, si (la sentinelle)', prefsDe(fA2).length, n1 + 1);
    await a1.post('/api/moi/maj', { prefs: { heures_pro: { jours: [1, 2, 3, 4, 5], debut: 480, fin: 1020 } } });
    vrai('des heures de travail changées : l\'autre appareil l\'apprend aussi', await T.attendre(() => prefsDe(fA2).length === n1 + 2, 4000, 10));
    /* ⛔ Ben, contact ET co-membre, n'a rien reçu — et son flux marche : un nom changé lui arrive (la sentinelle) */
    await a1.post('/api/moi/maj', { statut: 'Sur le chantier' });
    vrai('(sentinelle) le flux de Ben marche : le statut changé d\'Ana lui arrive', await fB.attendre(e => e.event === 'personne'));
    v('⛔ Ben n\'a reçu AUCUN « prefs » : le côté où Ana travaille ne regarde personne', prefsDe(fB).length, 0);

    console.log('\n3. La couture : deux appareils de la même personne, les vraies api.js et source-serveur.js');
    function monter() {
      const nav = T.navigateur(svc.base);
      const src = creerSourceServeur({ OPMSG, base: svc.base, fetch: (u, i) => nav.fetch(u, i), EventSource: nav.EventSource, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5, delaiAckMs: 60 });
      const evs = []; src.ecouter(e => evs.push(e)); sources.push(src);
      return { src, evs, async entrer() { await src.connexion('dora', MDP.dora); const d = await src.demarrer(); if (!d.connecte) throw new Error('démarrage refusé'); } };
    }
    const D1 = monter(), D2 = monter();
    await D1.entrer(); await D2.entrer();
    v('(population) la source porte les trois fonctions du passage automatique', ['modeAuto', 'modeChoisiLe', 'choisirModeAuto'].map(f => typeof D1.src[f]), ['function', 'function', 'function']);
    v('au départ : Perso, coupé, jamais choisi', [D2.src.modeTravail(), D2.src.modeAuto(), D2.src.modeChoisiLe()], ['perso', false, 0]);
    await T.dort(200);
    const avant = D2.evs.filter(e => e.type === 'prefs').length;
    await D1.src.choisirMode('pro');
    vrai('⛔ le téléphone choisit Pro : l\'ordinateur le LIT en direct (événement « prefs », modeTravail() = pro)', await T.attendre(() => D2.evs.filter(e => e.type === 'prefs').length > avant && D2.src.modeTravail() === 'pro', 6000, 10));
    vrai('   et l\'heure du choix lui arrive avec (pour départager l\'automatique)', D2.src.modeChoisiLe() > 0 && D2.src.modeChoisiLe() === D1.src.modeChoisiLe());
    await D1.src.choisirModeAuto(true);
    vrai('⛔ le passage automatique allumé sur l\'un l\'est sur l\'autre', await T.attendre(() => D2.src.modeAuto() === true, 6000, 10));
    await D2.src.choisirMode('perso');
    vrai('⛔ et dans l\'autre sens : l\'ordinateur revient en Perso, le téléphone le lit', await T.attendre(() => D1.src.modeTravail() === 'perso', 6000, 10));
    /* — un appareil dont le flux était FERMÉ pendant que l'autre choisissait (veille, coupure) : il manque l'événement « prefs » ; à la réouverture le service dit « resync » (le
         journal ne remonte pas jusque-là), et la source relit le côté avec le reste — sans quoi il restait de l'ancien côté jusqu'au prochain lancement. La source D3 a son
         gestionnaire « prefs » coupé (le flux fermé n'a rien reçu), son gestionnaire « resync » est tenu pour être appelé comme le fait api.js. — */
    {
      const nav3 = T.navigateur(svc.base);
      const api3 = OPMSG.creer({ base: svc.base, fetch: (u, i) => nav3.fetch(u, i), EventSource: nav3.EventSource, attente: () => 60 });
      let tenus = null;
      const aveugle = Object.assign({}, api3, { ecouter: h => { tenus = h; return api3.ecouter(Object.assign({}, h, { prefs: () => {} })); } });
      const src3 = creerSourceServeur({ OPMSG, api: aveugle, base: svc.base, fetch: (u, i) => nav3.fetch(u, i), EventSource: nav3.EventSource, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5, delaiAckMs: 60 });
      sources.push(src3); src3.ecouter(() => {});
      await src3.connexion('dora', MDP.dora); const d3 = await src3.demarrer();
      v('(population) l\'appareil au flux « aveugle » est connecté, Perso, et tient le gestionnaire resync', [!!d3.connecte, src3.modeTravail(), !!tenus && typeof tenus.resync === 'function'], [true, 'perso', true]);
      await D1.src.choisirMode('pro');
      await T.dort(700);
      v('(sentinelle) l\'événement « prefs » a bien été manqué par D3 : encore Perso', src3.modeTravail(), 'perso');
      tenus.resync();
      vrai('⛔ le « resync » (flux rouvert après un trou) relit le côté : D3 passe en Pro', await T.attendre(() => src3.modeTravail() === 'pro', 6000, 10));
      /* la page, elle, relit par source.relireCote (revenir sur la page, réseau revenu, borne) : vrai quand le service a répondu */
      await D1.src.choisirMode('perso'); await T.dort(400);
      v('relireCote() rend vrai et met la source à jour (la page en dépend au réveil)', [await src3.relireCote(), src3.modeTravail()], [true, 'perso']);
    }
  } catch (e) {
    vrai('le banc a tourné sans exception', false, String(e && e.stack || e));
  } finally {
    for (const f of flux) f.fermer();
    for (const s of sources) { try { if (typeof s.arreter === 'function') s.arreter(); } catch (e) {} }
    try { S.fermer && S.fermer(); } catch (e) {}
    await svc.arreter();
    try { await og.fermer(); } catch (e) {}
  }
  fin();
})();

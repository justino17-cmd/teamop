/* ⛔ CE QUE CE FICHIER GARDE — LA LISTE DES MESSAGES DIT LA SOURDINE, ET UNE ÉPINGLE NON LUE SE VOIT (lot m10 de la revue d'OP MESSAGES, 17 octobre 2026).

   Deux propositions de la revue, retenues parce qu'elles n'ôtent ni ne déplacent rien :
   · LA SOURDINE : rien dans la liste ne disait qu'une conversation était en sourdine — on le découvrait dans les Infos. La ligne porte un croissant de lune barré, et son point « non lu »
     est grisé (le service ne notifie plus : la liste ne crie pas à sa place). La source tire `sourdine` de `muet_jusqua` comme `infos()` ; la page la compare à l'heure DE LA PAGE.
   · L'ÉPINGLE NON LUE : sortie de la liste, une conversation épinglée n'affichait plus rien de ce qu'elle attendait. Son bouton (la rangée du haut) porte un point, comme sa ligne.
   Les VRAIES fonctions de la page (`ligneConv`, `boutonEpingle`, `enSourdine`) sont exécutées dans un bac à sable ; la source est la vraie, contre le vrai service. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const RACINE = path.join(__dirname, '..');
const PAGE = fs.readFileSync(path.join(RACINE, 'apercu/opmessages/index.html'), 'utf8');
const script = (/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1];
const sansCommJs = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/(^|\s)\/\/\s.*$/gm, ' ');
const JS = sansCommJs(script);
const CSS = ((/<style>([\s\S]*?)<\/style>/.exec(PAGE) || [, ''])[1]).replace(/\/\*[\s\S]*?\*\//g, ' ');

function decl(debut) {
  const i = JS.indexOf(debut); if (i < 0) return '';
  let j = JS.indexOf('{', i + debut.length - 1), n = 0, q = null;
  for (; j < JS.length; j++) {
    const ch = JS[j];
    if (q) { if (ch === '\\') { j++; continue; } if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { q = ch; continue; }
    if (ch === '{') n++;
    else if (ch === '}') { n--; if (n === 0) return JS.slice(i, j + 1); }
  }
  return '';
}
const ligne = debut => { const i = JS.indexOf(debut); return i < 0 ? '' : JS.slice(i, JS.indexOf('\n', i)); };
/* une constante-flèche sur une ou plusieurs lignes : jusqu'à son point-virgule de fin de ligne */
const flechePlus = debut => { const i = JS.indexOf(debut); if (i < 0) return ''; const f = JS.indexOf(';\n', i); return JS.slice(i, f + 1); };

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (120 s)'); process.exit(1); }, 120000).unref();

(async () => {
  console.log('1. La page : les VRAIES fonctions de la liste, dans un bac à sable');
  const morceaux = {
    esc: ligne('const esc = '), icone: ligne('const icone = '), blob: ligne('const blob = '), avIndex: ligne('const avIndex = '), nomConv: ligne('const nomConv = '), avatar: ligne('const avatar = '),
    enSourdine: flechePlus('const enSourdine = '), autreCote: ligne('const autreCote = '), coteDe: ligne('const coteDe = '), NOM_COTE: ligne('const NOM_COTE = '),
    ligneConv: decl('function ligneConv('), boutonEpingle: flechePlus('const boutonEpingle = '),
  };
  v('(population) chaque fonction réelle est trouvée dans la page', Object.keys(morceaux).filter(k => !morceaux[k]), []);
  if (Object.values(morceaux).every(Boolean)) {
    const H = { t: Date.UTC(2026, 9, 17, 12, 0, 0) };
    class FauxDate extends Date { constructor(...a) { if (a.length) super(...a); else super(H.t); } static now() { return H.t; } }
    const ctx = { Date: FauxDate, Math, JSON, Number, Array, Object, String, Set, console, etat: { conv: null, selection: null, listeArchives: false }, modesActifs: () => false, CHEVRON: '<svg class="chev"></svg>',
      libelleListe: () => '12:00' };
    vm.createContext(ctx);
    vm.runInContext([morceaux.esc, morceaux.icone, morceaux.blob, morceaux.avIndex, morceaux.nomConv, morceaux.avatar, morceaux.enSourdine, morceaux.coteDe, morceaux.NOM_COTE, morceaux.autreCote, morceaux.ligneConv, morceaux.boutonEpingle,
      'this.F = { ligneConv, boutonEpingle, enSourdine };'].join('\n'), ctx, { timeout: 3000 });
    const F = ctx.F;
    const base = { id: 'c_1', type: 'direct', nom: 'Ben Durand', court: 'Ben', initiales: 'BD', avatar: 2, photo: null, t: H.t, apercu: 'Salut', nonLu: false, nonLus: 0, cote: 'perso' };
    const DEMAIN = H.t + 86400000, HIER = H.t - 86400000;

    console.log('\n— la sourdine sur la ligne —');
    {
      const muette = F.ligneConv(Object.assign({}, base, { sourdine: DEMAIN }));
      const libre = F.ligneConv(Object.assign({}, base, { sourdine: 0 }));
      const sans = F.ligneConv(base);
      const echue = F.ligneConv(Object.assign({}, base, { sourdine: HIER }));
      v('une conversation en sourdine porte le croissant de lune barré, dit « En sourdine » à l\'oreille', [/class="conv-sourdine" role="img" aria-label="En sourdine"/.test(muette), /<use href="#i-sourdine"\/>/.test(muette)], [true, true]);
      v('⛔ pas de sourdine (0, absente) ou une sourdine ÉCHUE : aucun croissant (population : les trois cas sont rendus)', [/conv-sourdine/.test(libre), /conv-sourdine/.test(sans), /conv-sourdine/.test(echue)], [false, false, false]);
      v('le croissant est entre le nom et l\'heure, sans rien déplacer d\'autre : le nom, l\'heure, l\'aperçu sont là', [/conv-nom">Ben Durand<\/span><span class="conv-sourdine"[^]*?<\/span><span class="conv-heure"/.test(muette), /conv-apercu[^>]*>Salut/.test(muette)], [true, true]);
      const nl = F.ligneConv(Object.assign({}, base, { nonLu: true, nonLus: 2 })), nlMuette = F.ligneConv(Object.assign({}, base, { nonLu: true, nonLus: 2, sourdine: DEMAIN }));
      v('⛔ le point « non lu » d\'une conversation en sourdine est grisé (classe `muet`) ; celui d\'une conversation ordinaire reste bleu', [/<i class="point"><\/i>/.test(nl), /<i class="point muet"><\/i>/.test(nlMuette), /Non lu/.test(nlMuette)], [true, true, true]);
      v('une conversation lue en sourdine : le croissant, pas de point', [/class="point/.test(muette), /conv-sourdine/.test(muette)], [false, true]);
      ctx.etat.selection = new Set(); const choix = F.ligneConv(Object.assign({}, base, { sourdine: DEMAIN })); ctx.etat.selection = null;
      v('en mode « Modifier » (sélection) le croissant paraît aussi', /conv-sourdine/.test(choix), true);
      vrai('le symbole `i-sourdine` existe dans le jeu d\'icônes et les règles de style y sont (point grisé, croissant)', /<symbol id="i-sourdine"/.test(PAGE) && /\.point\.muet \{ background: var\(--faint\)/.test(CSS) && /\.conv-sourdine \.ic \{/.test(CSS));
    }

    console.log('\n— le point d\'une épingle non lue —');
    {
      const lue = F.boutonEpingle(base), nonLue = F.boutonEpingle(Object.assign({}, base, { nonLu: true, nonLus: 1 })), muette = F.boutonEpingle(Object.assign({}, base, { nonLu: true, nonLus: 1, sourdine: DEMAIN }));
      v('une épingle lue : pas de point', /epingle-point/.test(lue), false);
      v('⛔ une épingle non lue : un point sur son bouton, dit « Non lu » à l\'oreille, et son nom court reste là', [/<i class="point epingle-point"><\/i><span class="sr-seul">Non lu<\/span>/.test(nonLue), /epingle-nom">Ben</.test(nonLue), /data-ouvrir="c_1"/.test(nonLue)], [true, true, true]);
      v('en sourdine, le point de l\'épingle est grisé', /epingle-point muet/.test(muette), true);
      vrai('le point est posé par-dessus l\'avatar (position absolue dans un bouton relatif)', /\.epingle-bouton \{ position: relative; \}/.test(CSS) && /\.epingle-point \{ position: absolute;/.test(CSS));
      vrai('rendreListe appelle `boutonEpingle` pour la rangée du haut (le filtre des épinglées est celui que garde test-857)', /\$\('epingles'\)\.innerHTML = pins\.map\(boutonEpingle\)\.join\(''\);/.test(JS)
        && /etat\.conversations\.filter\(c => c\.epingle && !c\.archive && c\.invitation !== 'recue' && dansMode\(c\)\)/.test(JS));
    }

  }

  console.log('\n2. La source : `sourdine` vient du service, comme dans les Infos');
  const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
  const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
  const NOMS = { alice: 'Alice Banc', bruno: 'Bruno Banc' };
  const MDP = Object.fromEntries(Object.keys(NOMS).map(k => [k, 'pw-' + k + '-12345678']));
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(NOMS).map(k => [k, { pass: MDP[k], nom: NOMS[k], actif: true }])));
  const svc = await T.lancerService({ urlGestion: og.url });
  const sources = [];
  const faux = { priseEnCharge: () => ({ ok: false, raison: 'navigateur' }), permission: () => 'default', visible: () => true, surMessage: () => {}, abonnementActuel: async () => null };
  function monter() {
    const nav = T.navigateur(svc.base);
    const src = creerSourceServeur({ OPMSG, base: svc.base, fetch: nav.fetch, EventSource: nav.EventSource, navigateur: faux, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5, delaiAckMs: 60 });
    src.ecouter(() => {}); sources.push(src);
    return { src, async entrer(login) { await src.connexion(login, MDP[login]); const d = await src.demarrer(); if (!d.connecte) throw new Error('démarrage refusé'); return src.moi(); } };
  }
  try {
    const A = monter(), B = monter();
    await A.entrer('alice'); await B.entrer('bruno');
    const l = await B.src.lienContact(); const r = await A.src.accepterLien(l.code); const conv = r.conv;
    await B.src.envoyer(conv, { texte: 'Bonjour' });
    const ligneA = async () => (await A.src.lister(true)).find(c => c.id === conv);
    const avant = await ligneA();
    v('population : pas de sourdine au départ — `sourdine` vaut 0, et la conversation est non lue', [avant.sourdine, avant.nonLu], [0, true]);
    await A.src.sourdine(conv, '8h');
    const apres = await ligneA(), inf = await A.src.infos(conv);
    vrai('⛔ après « Mettre en sourdine » 8 h : `sourdine` est une échéance dans le futur (de l\'ordre de 8 h), la même que celle des Infos', apres.sourdine > Date.now() + 7 * 3600000 && apres.sourdine < Date.now() + 9 * 3600000 && apres.sourdine === inf.sourdine);
    await A.src.sourdine(conv, 'off');
    v('réactiver les notifications remet `sourdine` à 0', (await ligneA()).sourdine, 0);
  } finally {
    for (const s of sources) { try { s.arreter(); } catch (e) { /* déjà arrêtée */ } }
    try { await svc.arreter(); } catch (e) { /* idem */ }
    try { await og.fermer(); } catch (e) { /* idem */ }
  }
  fin();
})().catch(e => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; fin(); });

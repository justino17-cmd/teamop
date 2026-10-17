/* ⛔ CE QUE CE FICHIER GARDE — « AJOUTER PAR IDENTIFIANT » : le refus se DIT sous le champ, le format se contrôle avant l'appel, la phrase du plafond est juste (lot m12).

   Mesuré par les testeurs d'OP MESSAGES (octobre 2026), quatre constats d'un même endroit :
   · « Zoe#0000 », « Cléo#1 », « Nobody#12 » : le service répond 400 `identifiant_invalide`, la page l'attrapait plus haut et écrivait le message en HAUT de la feuille — sans jamais
     vider « Recherche… », posé juste avant l'appel : il restait à côté du refus, pour toujours ;
   · la page ne contrôlait que la présence d'un « # » : un identifiant hors plage faisait un aller-retour (compté au plafond de recherches) pour s'entendre dire « Tape l'identifiant
     en entier », ce qui est faux pour un identifiant complet ;
   · le message de plafond sortait « Tu as fait beaucoup de recherches aujourd'hui : (réessaie dans 55 s). » — « aujourd'hui » pour une rafale d'une minute, et un deux-points devant
     une parenthèse (le constructeur de la phrase retirait « réessaie plus tard. » mais laissait le « : »).

   Ce banc EXÉCUTE les vraies fonctions : `identFormatOk` et `identVoir` extraites de `apercu/opmessages/index.html` (DOM et service de poche), `ErreurApi.phrase()` de
   `server-msg/public/api.js`, et compare la grammaire de la page à `identLire` du service (si le service change la plage, ce banc tombe).
   ⛔ Un motif de banc vise du CODE, jamais une phrase : les commentaires sont retirés avant de chercher. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const API = require(path.join(T.SERVICE, 'public', 'api.js'));
const { identLire } = require(path.join(T.SERVICE, 'stockage.js'));
const PAGE = fs.readFileSync(path.join(T.RACINE, 'apercu', 'opmessages', 'index.html'), 'utf8');
const script = (/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1];

/* extrait d'un texte : de l'ancre jusqu'à la suivante (la découpe doit TROUVER quelque chose, sinon la tranche vide passerait au vert) */
const tranche = (de, jusqua) => { const i = script.indexOf(de); const j = i < 0 ? -1 : script.indexOf(jusqua, i); return i < 0 || j < 0 ? '' : script.slice(i, j); };
const CODE_IDENT = tranche('  /* ⛔ LA GRAMMAIRE D\'UN IDENTIFIANT', '  function rendreFeuilleContact')
  || tranche('  async function identVoir() {', '  function rendreFeuilleContact');
const LIGNE_PHRASE = (/\n\s*(const phrase = \(e, defaut\) =>[^\n]*)/.exec(script) || [, ''])[1];
vrai('(population) le code de la recherche par identifiant est lu (' + CODE_IDENT.length + ' caractères) et la fonction `phrase` de la page aussi', CODE_IDENT.length > 800 && LIGNE_PHRASE.length > 40);

/* un DOM de poche : les trois éléments que la recherche touche */
function monter(sourceStub) {
  const els = {
    'ct-ident': { value: '', focus() { this.focused = true; } },
    'ct-ident-res': { innerHTML: '' },
    'info-erreur': { textContent: '', hidden: true },
  };
  const ctx = {
    $: (id) => els[id] || null, esc: (s) => String(s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';'),
    avatar: () => '<i class="avatar"></i>', source: sourceStub, Promise, Number, String, RegExp,
    erreurInfo: (t) => { els['info-erreur'].textContent = t || ''; els['info-erreur'].hidden = !t; },
  };
  vm.createContext(ctx);
  vm.runInContext(LIGNE_PHRASE.replace('const phrase', 'var phrase') + '\n' + CODE_IDENT + '\nthis.identVoir = typeof identVoir === "function" ? identVoir : null; this.identFormatOk = typeof identFormatOk === "function" ? identFormatOk : null;', ctx, { timeout: 3000 });
  return { els, ctx };
}
const refus = (code, statut, retry) => { const e = new API.ErreurApi(code, statut, retry); return e; };
/* le geste, tel que le gestionnaire du haut le joue : une exception qui s'échappe est ce que `catch` du gestionnaire rattrape (et écrit en HAUT) */
const jouer = async (M) => { try { await M.ctx.identVoir(); } catch (e) { M.leve = e; } };
const texteRes = (els) => els['ct-ident-res'].innerHTML.replace(/<[^>]+>/g, ' ').replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/\s+/g, ' ').trim();

/* ⛔ un banc dont la boucle d'événements se vide AVANT la fin (une promesse que plus rien ne résout) sortait en 0 sans total : il est dit mort */
let fini = false;
process.on('exit', () => { if (!fini) { console.log('  ✗ le banc s\'est arrêté avant la fin (une promesse jamais résolue)'); process.exitCode = 1; } });
(async () => {
  console.log('\n── 1560 · le format se contrôle avant l\'appel, dans la MÊME grammaire que le service ──');
  const vide = monter({ contactParIdentifiant: async () => ({ trouve: false }) });
  vrai('la page porte `identFormatOk` et `identVoir`', typeof vide.ctx.identFormatOk === 'function' && typeof vide.ctx.identVoir === 'function');
  const CAS = ['Camille#4821', 'camille #4821', 'Hélène # 4821', 'Thomas#48213', 'Zoe#0000', 'Cléo#1', 'Nobody#12', 'Nobody#123', 'Nobody#999', 'Nobody#1000', 'Nobody#99999', 'Nobody#100000',
    'Nobody#099999', 'Nobody#01234', 'Nobody#0999', 'Nobody#09999', 'Nobody#', '#4821', 'Alice Martin#4821', 'Nobody#12a4', 'x'.repeat(90) + '#4821', 'Nobody#4821 ', 'a#b#4821'];
  if (typeof vide.ctx.identFormatOk === 'function') {
    v('⛔ pour chaque cas, la page et `identLire` du service disent la même chose (4 ou 5 chiffres, de 1000 à 99999, pas de zéro devant)',
      CAS.map(t => [t.slice(0, 20), vide.ctx.identFormatOk(t)]), CAS.map(t => [t.slice(0, 20), !!identLire(t)]));
    v('… et la population compte des valides ET des refusés (un contrôle sur un seul côté ne prouve rien)', [CAS.filter(t => identLire(t)).length > 5, CAS.filter(t => !identLire(t)).length > 10], [true, true]);
  } else vrai('⛔ `identFormatOk` est absente : la page ne contrôle que le « # »', false);

  console.log('\n── 1560 · « Zoe#0000 », « Cléo#1 » : refusés SOUS le champ, sans appel, sans « Recherche… » ──');
  for (const t of ['Zoe#0000', 'Cléo#1', 'Nobody#12', 'Nobody#123456']) {
    let appels = 0, levee = null;
    const M = monter({ contactParIdentifiant: async () => { appels++; throw refus('identifiant_invalide', 400); } });
    M.els['ct-ident'].value = t;
    try { await M.ctx.identVoir(); } catch (e) { levee = e && e.code; }
    const dit = texteRes(M.els);
    v('« ' + t + ' » : aucun appel au service', appels, 0);
    vrai('« ' + t + ' » : le refus est écrit sous le champ (dans `#ct-ident-res`), jamais « Recherche… » à côté', /4 ou 5 chiffres/.test(dit) && !/Recherche/.test(dit), dit);
    vrai('« ' + t + ' » : rien n\'est jeté vers le gestionnaire du haut (qui écrirait en haut de la feuille)', levee === null, String(levee));
    vrai('« ' + t + ' » : le message du haut est vide', M.els['info-erreur'].textContent === '' && M.els['info-erreur'].hidden === true);
    vrai('« ' + t + ' » : le champ garde le focus (on corrige là où l\'on tape)', M.els['ct-ident'].focused === true);
  }

  console.log('\n── 1560 · le service refuse quand même (plafond, panne) : « Recherche… » disparaît, la phrase du service est dite sous le champ ──');
  for (const [nom, err, motif] of [['429 plafond (rafale)', refus('recherches_plafond', 429, 55), /Trop de recherches : réessaie dans 55 s\./], ['400 identifiant_invalide', refus('identifiant_invalide', 400), /pas valable/],
    ['panne réseau', Object.assign(new Error('Failed to fetch'), { name: 'TypeError' }), /La recherche n'a pas pu se faire/]]) {
    const M = monter({ contactParIdentifiant: async () => { throw err; } });
    M.els['ct-ident'].value = 'Camille#4821';
    let levee = null; try { await M.ctx.identVoir(); } catch (e) { levee = e; }
    const dit = texteRes(M.els);
    vrai(nom + ' : la phrase est sous le champ, sans « Recherche… »', motif.test(dit) && !/Recherche…/.test(dit), dit);
    vrai(nom + ' : l\'erreur n\'est pas relancée au gestionnaire du haut', levee === null);
  }

  console.log('\n── 1560 · chaque essai écrit SON verdict ──');
  { // un refus puis une réussite : le refus d'avant s'efface
    let n = 0;
    const M = monter({ contactParIdentifiant: async () => { if (n++ === 0) throw refus('recherches_plafond', 429, 40); return { trouve: false }; } });
    M.els['ct-ident'].value = 'Camille#4821';
    await jouer(M); const avant = texteRes(M.els);
    await jouer(M); const apres = texteRes(M.els);
    vrai('refus (429) puis réponse neutre : le refus a disparu', /Trop de recherches/.test(avant) && /Personne avec cet identifiant/.test(apres) && !/Trop de recherches|Recherche…/.test(apres), avant + ' || ' + apres);
  }
  { // une réponse lente d'un essai ancien ne recouvre pas le verdict du plus récent
    const attentes = [];
    const M = monter({ contactParIdentifiant: (t) => new Promise((ok) => attentes.push({ t, ok })) });
    M.els['ct-ident'].value = 'Camille#4821'; const p1 = jouer(M);
    M.els['ct-ident'].value = 'Zoe#0000'; const p2 = jouer(M);
    attentes[0].ok({ trouve: false }); await p1; attentes.slice(1).forEach(a => a.ok({ trouve: false })); await p2;
    const dit = texteRes(M.els);
    vrai('⛔ la réponse (tardive) du premier essai ne recouvre pas le refus du second', /4 ou 5 chiffres/.test(dit) && !/Personne avec cet identifiant/.test(dit), dit);
  }
  { // un refus TARDIF d'un essai ancien ne recouvre pas non plus le verdict du plus récent
    const attentes = [];
    const M = monter({ contactParIdentifiant: () => new Promise((ok, ko) => attentes.push({ ok, ko })) });
    M.els['ct-ident'].value = 'Camille#4821'; const p1 = jouer(M);
    M.els['ct-ident'].value = 'Zoe#0000'; const p2 = jouer(M);
    attentes[0].ko(refus('recherches_plafond', 429, 40)); await p1; attentes.slice(1).forEach(a => a.ok({ trouve: false })); await p2;
    const dit = texteRes(M.els);
    vrai('⛔ le refus (429) tardif du premier essai ne recouvre pas le verdict du second', /4 ou 5 chiffres/.test(dit) && !/Trop de recherches/.test(dit), dit);
  }
  { // les refus de saisie (vide, nom seul) sont eux aussi sous le champ
    const M = monter({ contactParIdentifiant: async () => ({ trouve: false }) });
    M.els['ct-ident'].value = '';
    await jouer(M); const a = texteRes(M.els);
    M.els['ct-ident'].value = 'Bruno'; await jouer(M); const b = texteRes(M.els);
    vrai('champ vide et nom seul : dits sous le champ, rien en haut', /Tape un identifiant/.test(a) && /nom seul ne suffit pas/i.test(b) && M.els['info-erreur'].textContent === '', a + ' || ' + b);
  }

  console.log('\n── 1560 · la phrase de plafond : « Trop de recherches : réessaie dans 55 s. » ──');
  const ph = (code, statut, retry) => new API.ErreurApi(code, statut, retry).phrase();
  v('recherches_plafond avec Retry-After 55 (la rafale de 5 par minute)', ph('recherches_plafond', 429, 55), 'Trop de recherches : réessaie dans 55 s.');
  v('… 1 s (le seuil bas)', ph('recherches_plafond', 429, 1), 'Trop de recherches : réessaie dans 1 s.');
  v('… 60 s (la fin de la fenêtre)', ph('recherches_plafond', 429, 60), 'Trop de recherches : réessaie dans 60 s.');
  vrai('⛔ la phrase ne contient ni « aujourd\'hui » (la limite est d\'une minute), ni « : (», ni « : . »', !/aujourd'hui|: \(|: \./.test(ph('recherches_plafond', 429, 55)));
  v('recherches_plafond SANS Retry-After : la phrase de la table, sans parenthèse ni deux-points orphelin', ph('recherches_plafond', 429, 0), 'Tu as fait beaucoup de recherches aujourd\'hui : réessaie plus tard.');
  v('le plafond du JOUR (le service donne 3600 s) garde « aujourd\'hui » et une attente propre', ph('recherches_plafond', 429, 3600), 'Tu as fait beaucoup de recherches aujourd\'hui : réessaie dans 60 min.');
  v('ajouts_plafond (« : réessaie demain ») avec attente : pas de deux-points orphelin non plus', ph('ajouts_plafond', 429, 3600), 'Tu as envoyé beaucoup de demandes aujourd\'hui : réessaie dans 60 min.');
  v('les autres phrases ne bougent pas : « Trop de demandes en peu de temps (réessaie dans 20 s). » (une seule invitation à réessayer)', ph('quota_atteint', 429, 20), 'Trop de demandes en peu de temps (réessaie dans 20 s).');
  v('une phrase sans clause « réessaie » reçoit toujours la parenthèse', ph('transcription_indisponible', 503, 60), 'La transcription est momentanément indisponible (réessaie dans 60 s).');

  console.log('\n── 1560 · la phrase du 400 ne dit plus « en entier » pour un identifiant complet ──');
  vrai('identifiant_invalide : dit la plage (4 ou 5 chiffres, 1000 à 99999) et ne dit pas « en entier »', /4 ou 5 chiffres/.test(ph('identifiant_invalide', 400, 0)) && /1000/.test(ph('identifiant_invalide', 400, 0)) && !/en entier/.test(ph('identifiant_invalide', 400, 0)), ph('identifiant_invalide', 400, 0));

  fini = true; fin();
})().catch(e => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exit(1); });

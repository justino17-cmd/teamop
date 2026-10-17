/* ══ LE SONDAGE DONT L'HEURE DE FIN PASSE : LA CARTE PASSE À « CLOS » (lot m09 : medias#4, medias@2) ═══════════════════════════════════════════════════════════════════
   medias#4 — Ana envoie un sondage qui finit dans une minute. Les deux pages restent ouvertes. L'heure passe : la carte dit encore « Jusqu'au … », les choix répondent, « Ajouter un
   choix » et « Clore le sondage » sont là. Le service, lui, refuse tout (409 sondage_clos) — et la page disait « Ce sondage est clos. » devant une carte qui restait ouverte jusqu'au
   rechargement. Rien ne poussait ce changement : personne n'a agi à l'échéance.

   Ce que ce fichier garde, en quatre morceaux :
     1. LA PAGE — la VRAIE `htmlSondage` (extraite, exécutée, une HORLOGE POSÉE par le banc) : avant la fin, ouverte ; à la fin (l'instant exact : le service ferme à `fin <= t`), « Clos », les
        choix grisés, ni « Ajouter un choix » ni « Clore le sondage » ; la VRAIE `voterSondage` ne vote plus ;
     2. LA MINUTERIE — la VRAIE `sondageEcheance` : UNE seule pour tous les sondages de la conversation (la plus proche), jamais une par carte, remplacée à chaque dessin, aucune quand rien n'échoit ;
     3. LA SOURCE — le VRAI `source-serveur.js` contre le VRAI service : à la première lecture après l'échéance elle RELIT (le service rend alors le sondage clos, résultats « à la clôture » compris,
        et un événement « conversation » part) ; et un refus 409 `sondage_clos` fait relire la carte (l'horloge de la source est ici en RETARD : seule cette voie peut la corriger) ;
     4. medias@2 — le formulaire de création dit que l'auteur voit toujours les résultats, quand la règle les cache aux autres (la VRAIE fonction + le VRAI écouteur de la feuille). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
const att = (cond, ms = 8000) => T.attendre(cond, ms, 10);
setTimeout(() => { console.log('  ✗ délai global du banc dépassé (120 s)'); process.exit(1); }, 120000).unref();

const PAGE = fs.readFileSync(path.join(T.RACINE, 'apercu', 'opmessages', 'index.html'), 'utf8');
/* ⛔ seulement les blocs qui COMMENCENT une ligne, et les « // » précédés d'une espace (CLAUDE.md) */
const JS = ((/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1]).replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/(^|\s)\/\/\s.*$/gm, ' ');
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
const texte = h => h.replace(/<[^>]*>/g, ' ').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, ' ').trim();

const T0 = Date.UTC(2026, 9, 16, 21, 0, 0);          // l'instant « maintenant » de la page, posé par le banc
const horloge = { t: T0 };
function bacPage(extra = '') {
  const ctx = { console, Intl, Number, Math, Infinity, horloge, minuteurs: [], annules: [], MOI: { id: 'p_moi' }, appels: { rafraichi: 0, votes: [], avis: [] } };
  ctx.Date = { now: () => horloge.t };
  ctx.setTimeout = (f, ms) => { const h = { f, ms }; ctx.minuteurs.push(h); return h; };
  ctx.clearTimeout = h => { if (h) ctx.annules.push(h); };
  vm.createContext(ctx);
  vm.runInContext(`
    ${ligne('const esc = ')}
    const sondEnVol = new Set(); let sondClore = null;
    ${ligne('const FMT_FIN = ')}
    ${ligne('const sondageClos = ')}
    ${decl('function reglesTexte(')}
    const avatarVotant = () => '', nomVotant = () => '', quiTexte = l => l.join(', ');
    ${decl('function htmlSondage(')}
    const etat = { convDonnees: null, conv: 'c_1' };
    const trouverMessage = mid => etat.convDonnees && etat.convDonnees.messages.find(m => m.id === mid);
    const rafraichirConv = () => { appels.rafraichi++; };
    const avis = t => appels.avis.push(t), phrase = (e, d) => d;
    const source = { sondageVoter: async (c, seq, l) => { appels.votes.push([c, seq, l]); } };
    ${decl('async function voterSondage(')}
    let sondEcheanceT = null;
    ${decl('function sondageEcheance(')}
    this.P = { htmlSondage, voterSondage, etat, sondageEcheance: typeof sondageEcheance === 'function' ? sondageEcheance : undefined, sondageClos: typeof sondageClos === 'function' ? sondageClos : undefined };
    ${extra}
  `, ctx, { timeout: 3000 });
  return ctx;
}
const sondage = (fin_, plus = {}) => Object.assign({ q: 'Quand ?', seq: 7, etat: 'ok', regles: { multiple: false, anonyme: false, ajout: true, resultats: 'apres_cloture', fin: fin_ }, clos: false, closLe: null, auteur: 'Ana', deMoi: true,
  choix: [{ idx: 0, texte: 'Lundi', n: null, qui: null, quiIds: null, ajoutePar: null, mien: false }, { idx: 1, texte: 'Mardi', n: null, qui: null, quiIds: null, ajoutePar: null, mien: false }],
  mesChoix: [], votants: null, resultats: false, peutVoter: true, peutAjouter: true, peutClore: true }, plus);
const carte = (s, id = 'm1') => ({ id, seq: s.seq, sondage: s });
const choixGrises = h => (h.match(/class="sond-choix[^>]*>/g) || []).map(b => /aria-disabled="true"/.test(b));

/* une section qui jette est un ✗ NOMMÉ (et le banc continue) : sur le code d'avant, les fonctions neuves n'existent pas */
async function section(nom, f) { try { await f(); } catch (e) { console.log('  ✗ ' + nom + ' : ' + (e && e.message)); process.exitCode = 1; } }
(async () => {
  await section('la page', async () => {
  console.log('\n1. La page : la carte d\'un sondage dont l\'heure de fin passe');
  const B = bacPage(), P = B.P;
  vrai('(population) htmlSondage, voterSondage et sondageEcheance sont extraites de la page', ['htmlSondage', 'voterSondage', 'sondageEcheance', 'sondageClos'].every(n => typeof P[n] === 'function'));
  const fin_ = T0 + 60000, s = sondage(fin_);
  horloge.t = T0;
  let h = P.htmlSondage(carte(s), 'recu');
  v('avant la fin : les choix répondent, « Ajouter un choix » et « Clore le sondage » sont là, « Jusqu\'au … »',
    [choixGrises(h), /Ajouter un choix/.test(h), /Clore le sondage/.test(h), /Jusqu'au/.test(texte(h)), /Clos/.test(texte(h))], [[false, false], true, true, true, false]);
  horloge.t = fin_ - 1;
  h = P.htmlSondage(carte(s), 'recu');
  v('une milliseconde avant : toujours ouvert', [choixGrises(h), /Clore le sondage/.test(h)], [[false, false], true]);
  horloge.t = fin_;
  h = P.htmlSondage(carte(s), 'recu');
  v('⛔ À L\'INSTANT DE LA FIN (le service ferme à `fin <= t`) : « Clos », les deux choix grisés, plus d\'« Ajouter un choix », plus de « Clore le sondage », plus « Jusqu\'au »',
    [choixGrises(h), /Ajouter un choix/.test(h), /Clore le sondage/.test(h), /Clos/.test(texte(h)), /Jusqu'au/.test(texte(h))], [[true, true], false, false, true, false]);
  horloge.t = fin_ + 3600000;
  h = P.htmlSondage(carte(s), 'recu');
  v('une heure après : de même', [choixGrises(h), /Clore le sondage/.test(h), /Clos/.test(texte(h))], [[true, true], false, true]);
  horloge.t = T0 + 90 * 86400000;
  h = P.htmlSondage(carte(sondage(null)), 'recu');
  v('un sondage SANS heure de fin ne se ferme jamais tout seul (population : « Clore » y est)', [choixGrises(h), /Clore le sondage/.test(h), /Clos/.test(texte(h))], [[false, false], true, false]);
  h = P.htmlSondage(carte(sondage(null, { clos: true, peutVoter: false, peutAjouter: false, peutClore: false })), 'recu');
  v('un sondage clos par le service (sans fin) reste « Clos », choix grisés (rien n\'a changé pour lui)', [choixGrises(h), /Clos/.test(texte(h))], [[true, true], true]);

  console.log('\n   …et on ne vote plus sur une carte échue (la VRAIE voterSondage)');
  horloge.t = T0;
  const ouvert = carte(sondage(T0 + 60000)); P.etat.convDonnees = { messages: [ouvert] };
  await P.voterSondage('m1|0');
  v('population : sur la carte OUVERTE, le vote part (un appel au service)', B.appels.votes.length, 1);
  horloge.t = T0 + 60000;
  await P.voterSondage('m1|1');
  v('⛔ sur la carte ÉCHUE (le service est encore « ouvert » dans la vue gardée) : aucun vote ne part', B.appels.votes.length, 1);

  console.log('\n2. La minuterie : UNE seule, la plus proche, jamais une par carte');
  { const C = bacPage(), Q = C.P; horloge.t = T0;
    const conv = (...fins) => ({ messages: fins.map((f, i) => carte(sondage(f, { seq: i + 1 }), 'm' + (i + 1))) });
    Q.sondageEcheance(conv(T0 + 90000, T0 + 30000, T0 + 600000));
    v('trois sondages : UNE minuterie, réglée sur la plus proche (30 s + 300 ms de marge)', [C.minuteurs.length, C.minuteurs[0] && C.minuteurs[0].ms], [1, 30300]);
    Q.sondageEcheance(conv(T0 + 90000, T0 + 30000, T0 + 600000));
    Q.sondageEcheance(conv(T0 + 90000, T0 + 30000, T0 + 600000));
    v('trois dessins de suite : trois poses, deux remplacements — il n\'y en a toujours qu\'UNE de vivante', [C.minuteurs.length - C.annules.length], [1]);
    C.minuteurs[C.minuteurs.length - 1].f();
    v('à son déclenchement la conversation est redessinée (la carte passe à « Clos »)', C.appels.rafraichi, 1);
    const avant = C.minuteurs.length;
    Q.sondageEcheance({ messages: [carte(sondage(null)), carte(sondage(T0 - 1000, { clos: true }), 'm2'), carte(sondage(T0 - 5000), 'm3')] });
    v('rien n\'échoit (sans fin, déjà clos, déjà échu) : aucune minuterie de plus', C.minuteurs.length, avant);
    Q.sondageEcheance(conv(T0 + 60 * 86400000));
    v('une échéance dans 60 jours : le délai est borné (le minuteur du navigateur déborde au-delà de ~24 jours), il se repose en se déclenchant', C.minuteurs[C.minuteurs.length - 1].ms <= 2000000300, true);
    vrai('rendreConv pose la minuterie à CHAQUE dessin (dans le code)', /function rendreConv\(c, force\) \{[\s\S]*?sondageEcheance\(c\);[\s\S]*?\n  \}\n/.test(JS));
  }

  });
  console.log('\n3. La source contre le vrai service');
  const NOMS = { ana: 'Ana Martin', ben: 'Ben Durand' };
  const MDP = Object.fromEntries(Object.keys(NOMS).map(k => [k, 'pw-' + k + '-12345']));
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(NOMS).map(k => [k, { pass: MDP[k], nom: NOMS[k], actif: true }])));
  /* le service a une horloge DÉCALABLE : une échéance se crée à une minute au moins (400 sinon), le banc avance l'heure du service plutôt que d'attendre */
  const svc = await T.lancerService({ urlGestion: og.url, horloge: true });
  let decalage = 0; const heureService = () => Date.now() + decalage, avancer = ms => { decalage += ms; svc.avancer(ms); };
  const sources = [];
  const ouvrirSource = async (login, opts = {}) => {
    const nav = T.navigateur(svc.base);
    const faux = { priseEnCharge: () => ({ ok: false, raison: 'navigateur' }), permission: () => 'default', visible: () => true, surMessage: () => {}, abonnementActuel: async () => null };
    const src = creerSourceServeur(Object.assign({ OPMSG, base: svc.base, fetch: nav.fetch, EventSource: nav.EventSource, navigateur: faux, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5 }, opts));
    await src.connexion(login, MDP[login]); const d = await src.demarrer();
    if (!d.connecte) throw new Error('démarrage refusé : ' + JSON.stringify(d));
    sources.push(src); return src;
  };
  try {
    const A = await T.connecter(svc, og, 'ana', MDP.ana), Bn = await T.connecter(svc, og, 'ben', MDP.ben);
    const l = await A.post('/api/contacts/lien', {}); await Bn.post('/api/liens/accepter', { code: l.j.code });
    const conv = (await A.post('/api/conversations/directe', { uid: Bn.moi.id })).j.conversation.id;
    const nouveau = async (finMs) => { const r = await A.post('/api/conversations/' + conv + '/messages', { cid: 'cid-' + Math.random().toString(36).slice(2), type: 'sondage', question: 'Quand ?', choix: ['Lundi', 'Mardi'], regles: { resultats: 'apres_cloture', fin: finMs } }); if (r.code !== 201) throw new Error('sondage refusé (' + r.code + ' ' + JSON.stringify(r.j) + ')'); return r.j.seq; };
    const vue = async (S, seq) => { const c = await S.ouvrir(conv); const m = c.messages.find(x => x.sondage && x.sondage.seq === seq); return m ? m.sondage : null; };

    /* 3a. l'échéance passe pendant que la page est ouverte : la première lecture après l'heure RELIT */
    const ben = await ouvrirSource('ben', { maintenant: heureService });         // une source à l'heure du service
    const f1 = heureService() + 61000, seq1 = await nouveau(f1);
    let s1 = await att(async () => { const x = await vue(ben, seq1); return x && x.etat === 'ok' ? x : null; });
    vrai('(population) Ben lit le sondage : ouvert, il peut voter, les résultats sont cachés jusqu\'à la clôture', !!s1 && s1.clos === false && s1.peutVoter === true && s1.resultats === false && s1.regles.fin === f1);
    let evenements = 0; const arret = ben.ecouter(e => { if (e && e.type === 'conversation' && e.id === conv) evenements++; });
    avancer(62000);                                                   // l'heure de fin passe, personne n'a agi
    const avant = evenements;
    await vue(ben, seq1);                                             // un dessin de la page, c'est tout : Ben n'a rien touché
    const s1b = await att(async () => { const x = await vue(ben, seq1); return x && x.clos === true ? x : null; });
    vrai('⛔ après l\'heure de fin, SANS geste de Ben : la source a relu — le sondage est clos, les votes fermés', !!s1b && s1b.peutVoter === false && s1b.peutClore === false && s1b.peutAjouter === false);
    vrai('…les résultats promis « à la clôture » sont arrivés avec (le calcul à l\'affichage ne les aurait pas apportés)', !!s1b && s1b.resultats === true && s1b.votants === 0);
    vrai('…et un événement « conversation » est parti (la page se redessine toute seule)', evenements > avant);
    if (typeof arret === 'function') arret();
    /* UNE relecture par reprise : un service qui répondrait « ouvert » ne fait pas boucler la source (son horloge avance sur celle du service) */
    { const sourceAvance = await ouvrirSource('ben', { maintenant: () => heureService() + 3600000 });
      const f2 = heureService() + 600000, seq2 = await nouveau(f2);
      await att(async () => { const x = await vue(sourceAvance, seq2); return x && x.etat === 'ok' ? x : null; });
      let lectures = 0; const trace = sourceAvance.ecouter(e => { if (e && e.type === 'conversation' && e.id === conv) lectures++; });
      for (let i = 0; i < 5; i++) { await vue(sourceAvance, seq2); await T.dort(30); }
      await T.dort(150); trace();
      vrai('⛔ une source dont l\'horloge AVANCE sur celle du service (le service dit « ouvert ») relit UNE fois par reprise, pas à chaque dessin (' + lectures + ' événement(s) pour cinq dessins)', lectures >= 1 && lectures <= 3);
    }

    /* 3b. le refus 409 : la source est en RETARD — l'échéance ne lui paraît jamais passée, seule la voie du refus peut corriger la carte */
    const retard = await ouvrirSource('ben', { maintenant: () => Date.now() });          // l'heure de l'appareil, que le service a dépassée de plus d'une minute
    const f3 = heureService() + 61000, seq3 = await nouveau(f3);
    const s3 = await att(async () => { const x = await vue(retard, seq3); return x && x.etat === 'ok' ? x : null; });
    vrai('(population) la source en retard lit le sondage ouvert', !!s3 && s3.clos === false);
    avancer(62000);
    const s3b = await vue(retard, seq3);
    vrai('(témoin) sans geste, cette source ne sait pas que c\'est fini : la carte gardée est encore « ouverte » (son horloge est en retard)', s3b.clos === false && s3b.peutVoter === true);
    let refus = null; try { await retard.sondageVoter(conv, seq3, [0]); } catch (e) { refus = e; }
    v('Ben touche un choix : le service refuse, avec sa phrase (409 sondage_clos)', [!!refus, refus && refus.code, refus && refus.phrase && refus.phrase()], [true, 'sondage_clos', 'Ce sondage est clos.']);
    const s3c = await att(async () => { const x = await vue(retard, seq3); return x && x.clos === true ? x : null; });
    vrai('⛔ le refus a fait RELIRE la carte : « Clos », les votes fermés, les résultats ouverts', !!s3c && s3c.peutVoter === false && s3c.resultats === true);
  } catch (e) { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; }
  finally {
    for (const s of sources) { try { if (s.arreter) s.arreter(); } catch (e) { /* déjà arrêté */ } }
    await svc.arreter(); await og.fermer();
  }

  console.log('\n4. medias@2 — le formulaire dit que l\'auteur voit toujours les résultats');
  { const els = {}; const el = id => els[id] || (els[id] = { id, innerHTML: '', hidden: false, value: '', textContent: '', addEventListener(t, f) { this['ecoute_' + t] = f; }, getAttribute: () => null });
    const ctx = { console, Number, Math, Infinity, sondForm: null, etat: { groupe: { ouvert: true, mode: 'sondage-nouveau' } }, peindreChoixSondage() {} };
    vm.createContext(ctx);
    const ecouteur = (() => { const k = JS.indexOf("e.target.id === 'sd-fin'"), i = k < 0 ? -1 : JS.lastIndexOf("$('info-corps').addEventListener('change', e => {", k); if (i < 0) return ''; const f = JS.indexOf('\n  });', i); return f < 0 ? '' : JS.slice(i, f + 6); })();
    vrai('(population) la fonction du formulaire et l\'écouteur de la feuille sont extraits', decl('function rendreSondageNouveau(').length > 500 && ecouteur.length > 100);
    ctx.$ = el;
    vm.runInContext(`const modeCarte = () => etat.groupe.ouvert && ['sondage-nouveau'].includes(etat.groupe.mode);`, ctx);
    vm.runInContext(`${ligne('const esc = ')}\n${ligne('const SOND_FINS = ')}\n${ligne('const SOND_RESULTATS = ')}\n${ligne('const swSond = ')}\n${decl('function rendreSondageNouveau(')}\n${ecouteur}\nthis.rendre = rendreSondageNouveau;`, ctx, { timeout: 3000 });
    ctx.rendre();
    const html = els['info-corps'].innerHTML;
    vrai('le formulaire porte la phrase, cachée tant que la règle est « Tout de suite » (aucun intérêt à la dire alors)', /id="sd-res-note" hidden>[^<]*toi[^<]*tu vois toujours les résultats/i.test(html));
    const note = el('sd-res-note'); note.hidden = true;
    const ev = (id, valeur) => els['info-corps'].ecoute_change({ target: { id, value: valeur } });
    ev('sd-resultats', 'apres_cloture');
    v('« À la clôture » : la phrase paraît', note.hidden, false);
    ev('sd-resultats', 'apres_vote');
    v('« Après avoir voté » : elle reste', note.hidden, false);
    ev('sd-resultats', 'toujours');
    v('« Tout de suite » : elle disparaît', note.hidden, true);
  }
  fin();
})();

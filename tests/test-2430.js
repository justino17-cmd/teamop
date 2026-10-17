/* ══ LA BANNIÈRE D'ARRIVÉE NE SURGIT PAS POUR CE QU'ON A FAIT TAIRE, NI POUR LA DISCUSSION DE LA SALLE OÙ L'ON EST (lot m07, 17 octobre 2026) ══════════════════════════════
   Deux défauts de la même fonction, `surArrivee` de la page, trouvés par les testeurs (conversations#0, salle#4) :
     · une conversation en sourdine (« Plus de notification de cette conversation ») affichait quand même la bannière : `surArrivee` ne retenait que la conversation OUVERTE et les
       heures de travail Pro. Le service, lui, ne fait rien sonner ; la page « continue de recevoir » (la liste, le point non lu) mais ne surgit pas. Le module de données dit
       désormais, dans l'événement `arrivee`, si la conversation est en sourdine (`sourdine`) — faux pour une invitation (quelqu'un qui n'est pas dans mes contacts) — et la page
       ne fait pas surgir la bannière ; ⛔ une MENTION passe la sourdine (c'est un autre événement, `notification`, que ce fichier ne touche pas : `test-936`) ;
     · au téléphone, la bannière d'un message de la discussion MÊME de la salle (la conversation de la réunion) se posait sur le titre et « Quitter » : un toucher à cet endroit ouvrait
       la conversation et réduisait la salle. La conversation de la salle ouverte est sous les yeux comme une conversation ouverte : la pastille de « Discussion » suffit.

   Deux parties :
     1. LE SERVICE ET SON MODULE : les VRAIES `api.js` et `source-serveur.js` contre le VRAI service (deux appareils) — l'événement `arrivee` dit la sourdine, et la liste ET le fil
        continuent de se mettre à jour (rien n'est retenu en route) ;
     2. LA PAGE : les VRAIES `arriveeRetenue` et `surArrivee` de `apercu/opmessages/index.html`, exécutées dans un bac à sable qui note chaque bannière.
   ⛔ Une assertion sur un ensemble vide ne prouve rien : chaque « pas de bannière » est suivie d'une SENTINELLE (un message d'une autre conversation) qui, elle, doit en faire une. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
const att = (cond, ms = 8000) => T.attendre(cond, ms, 10);
const PAGE = fs.readFileSync(path.join(T.RACINE, 'apercu/opmessages/index.html'), 'utf8');
const script = (/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1];
/* ⛔ seulement les blocs qui COMMENCENT une ligne (CLAUDE.md, 21 septembre 2026) */
const JS = script.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/(^|\s)\/\/\s.*$/gm, ' ');
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

function monter(svc) {
  const nav = T.navigateur(svc.base);
  const src = creerSourceServeur({ OPMSG, base: svc.base, fetch: nav.fetch, EventSource: nav.EventSource, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5 });
  const evs = [];
  src.ecouter(e => evs.push(e));
  return { src, evs, attendreEv: (pred, ms) => att(() => evs.find(pred) || null, ms), async entrer(login, pass) { await src.connexion(login, pass); const d = await src.demarrer(); if (!d.connecte) throw new Error('démarrage refusé'); return src.moi(); } };
}

/* ═══ 2. LA PAGE ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
function partiePage() {
  console.log('\n2. La page : les vraies `arriveeRetenue` et `surArrivee`');
  const morceaux = { arriveeRetenue: decl('function arriveeRetenue('), surArrivee: decl('function surArrivee('), enSalle: ligne('const enSalle = '), prefixeCote: ligne('function prefixeCote('), dansHeuresPro: decl('function dansHeuresPro(') };
  v('(population) les fonctions réelles sont trouvées dans la page', Object.keys(morceaux).filter(k => !morceaux[k]), []);
  const CONV = 'c_' + 'a'.repeat(32), AUTRE = 'c_' + 'b'.repeat(32);
  function bac(o) {
    const S = Object.assign({ conv: null, salle: null, reduite: false, visible: 'visible' }, o || {});
    const bannieres = [];
    const ctx = {
      Date, Math, JSON, Number, Array, Object, String, RegExp,
      etat: { mode: 'perso', conv: S.conv, appelReduit: S.reduite, conversations: [], appelUI: S.salle ? { snap: { salle: true, entrant: false, conv: S.salle } } : null },
      document: { visibilityState: S.visible },
      modesActifs: () => false, source: {}, coteDe: () => 'perso', autreCote: () => false, NOM_COTE: { perso: 'Perso', pro: 'Pro' },
      notifier: (texte, aide, cible) => bannieres.push({ texte, aide, cible }),
    };
    vm.createContext(ctx);
    vm.runInContext([morceaux.dansHeuresPro, morceaux.arriveeRetenue, morceaux.enSalle, morceaux.prefixeCote, morceaux.surArrivee, 'this.surArrivee = surArrivee;'].join('\n'), ctx, { timeout: 3000 });
    return { surArrivee: ctx.surArrivee, bannieres };
  }
  const ev = (o) => Object.assign({ type: 'arrivee', conv: AUTRE, invitation: false, de: 'Ben Durand', convNom: 'Ben Durand', groupe: false, texte: 'Salut', sourdine: false }, o || {});
  if (Object.values(morceaux).some(x => !x)) return;

  { const x = bac(); x.surArrivee(ev());
    v('témoin : une conversation ordinaire fait surgir la bannière (« Ben Durand » / « Salut », touchable vers la conversation)', x.bannieres, [{ texte: 'Ben Durand', aide: 'Salut', cible: 'conv:' + AUTRE }]); }
  { const x = bac(); x.surArrivee(ev({ sourdine: true }));
    x.surArrivee(ev({ conv: CONV }));
    v('⛔ conversations#0 : une conversation EN SOURDINE ne fait pas surgir la bannière (et la SENTINELLE d\'une autre conversation, elle, en fait une)', x.bannieres.map(b => b.cible), ['conv:' + CONV]); }
  { const x = bac(); x.surArrivee(ev({ sourdine: true, groupe: true, convNom: 'Chantier' }));
    v('   même chose pour un groupe en sourdine', x.bannieres, []); }
  { const x = bac(); x.surArrivee(ev({ invitation: true, sourdine: false, de: 'Étranger' }));
    v('une INVITATION (quelqu\'un hors de mes contacts) surgit toujours : la sourdine ne la couvre pas', x.bannieres.map(b => b.texte), ['Invitation · Étranger']); }

  /* la salle : la conversation de la réunion est sous les yeux */
  { const x = bac({ salle: CONV }); x.surArrivee(ev({ conv: CONV, groupe: true, convNom: 'Point chantier' }));
    x.surArrivee(ev({ conv: AUTRE }));
    v('⛔ salle#4 : un message de la discussion MÊME de la salle ouverte ne fait pas surgir la bannière — celle d\'une AUTRE conversation, si (sentinelle)', x.bannieres.map(b => b.cible), ['conv:' + AUTRE]); }
  { const x = bac({ salle: CONV, reduite: true }); x.surArrivee(ev({ conv: CONV, groupe: true, convNom: 'Point chantier' }));
    v('⛔ salle RÉDUITE (barre « Revenir à l\'appel », on navigue ailleurs) : la discussion de la salle n\'est pas sous les yeux, sa bannière paraît', x.bannieres.map(b => b.cible), ['conv:' + CONV]); }
  { const x = bac({ salle: CONV, visible: 'hidden' }); x.surArrivee(ev({ conv: CONV }));
    v('page cachée (un autre onglet, l\'écran verrouillé) : la bannière paraît quand même, comme pour la conversation ouverte', x.bannieres.length, 1); }
  { const x = bac({ conv: CONV }); x.surArrivee(ev({ conv: CONV }));
    v('inchangé : la conversation ouverte, page visible, ne fait pas de bannière', x.bannieres.length, 0); }
}

(async () => {
  const og = await T.fauxOpGestion({ alice: { pass: 'pw-alice-1234', nom: 'Alice Martin', actif: true }, bruno: { pass: 'pw-bruno-1234', nom: 'Bruno Petit', actif: true } });
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-1430-'));
  const svc = await T.lancerService({ urlGestion: og.url, dossier: racine, config: { pulsationMs: 400, presenceGraceMs: 300, balayageMs: 150, beta: { relectureMs: 250, timeoutMs: 5000 } } });
  const appareils = [];
  try {
    console.log('1. Le module de données : l\'événement « arrivee » dit la sourdine');
    const A = monter(svc), B = monter(svc); appareils.push(A, B);
    await A.entrer('alice', 'pw-alice-1234'); await B.entrer('bruno', 'pw-bruno-1234');
    const lien = await A.src.lienContact(); const r = await B.src.accepterLien(lien.code); const conv = r.conv;
    vrai('(population) Alice et Bruno sont contacts, la conversation existe', /^c_[0-9a-f]{32}$/.test(conv) && !!(await att(() => A.src.contacts().some(c => c.nom === 'Bruno Petit'))));
    const dire = async (texte) => { await B.src.envoyer(conv, { texte }); return A.attendreEv(e => e.type === 'arrivee' && e.conv === conv && e.texte === texte); };
    const e0 = await dire('un message ordinaire');
    v('témoin : Alice n\'a pas fait taire la conversation — l\'arrivée porte une sourdine fausse', [!!e0, e0 && !!e0.sourdine], [true, false]);
    await A.src.sourdine(conv, 'tj');
    const e1 = await dire('Silence svp');
    v('⛔ conversations#0 : « Toujours » — l\'arrivée est TOUJOURS livrée (la liste et le point non lu se mettent à jour), mais elle dit qu\'elle est en sourdine', [!!e1, e1 && e1.sourdine], [true, true]);
    const ouv = await A.src.ouvrir(conv);
    vrai('   et le message est dans le fil d\'Alice (rien n\'a été retenu en route)', ouv.messages.some(m => m.texte === 'Silence svp'));
    await A.src.sourdine(conv, '8h');
    const e2 = await dire('huit heures');
    v('   « 8 heures » aussi', e2 && e2.sourdine, true);
    await A.src.sourdine(conv, 'off');
    const e3 = await dire('réactivée');
    v('⛔ la sourdine levée : l\'arrivée suivante ne dit plus rien de tel (une sourdine qui ne se lève jamais serait pire que pas de sourdine)', e3 && !!e3.sourdine, false);
  } catch (e) { vrai('le banc ne meurt pas : ' + (e && e.stack || e), false); }
  finally { for (const x of appareils) { try { x.src.arreter(); } catch (e) { /* déjà arrêté */ } } await svc.arreter(); await og.fermer(); fs.rmSync(racine, { recursive: true, force: true }); }
  partiePage();
  fin();
})();

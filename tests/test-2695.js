/* ⛔ CE QUE CE FICHIER GARDE — OP COURRIER DANS LE CÔTÉ PRO D'OP MESSAGES (18 octobre 2026).

   Demande de Justin : « tu l'ajoutes au côté Pro d'OP MESSAGES » ; « quand tu l'intègres c'est VIDE, les gens doivent se connecter à leur mail » ; la rubrique sur la BÊTA seulement tant qu'il n'a pas dit autrement.
   Le MÊME module (`opcourrier.js`) que dans OP GESTION et dans la Tour, servi par le service d'OP MESSAGES lui-même. Quatre moitiés, qui ne se remplacent pas (la page dans un VRAI navigateur,
   contre le vrai service : `scratchpad/courrier/sonde-opmsg.js`) :
     1. LA PAGE (texte de l'aperçu, source de ce que le générateur sert) : la rubrique « Courrier » n'est dans ORDRE que si le SERVICE la dit ouverte et qu'on est côté Pro, jamais côté Perso ; le module
        n'est chargé qu'à l'ouverture, par un script de MÊME origine, jamais par une balise du HTML ; il est démonté en quittant la rubrique ; la page ne contient aucune donnée de messagerie ;
     2. LA SOURCE DU SERVICE (`source-serveur.js`, la VRAIE, jouée contre un vrai service) : `courrierOuvert()` dit VRAI sur la bêta et FAUX en production — et FAUX quand la configuration est illisible (« on n'a
        pas pu savoir » n'est pas « ouvert ») ; l'adaptateur est VIDE : `capacites()` tout à faux, aucune boîte, aucun message, « Ajouter une boîte mail » dit « Bientôt » — et il ne fait AUCUN appel réseau ;
     3. LE SERVICE sert `opcourrier.js` lui-même (même octets que la racine du dépôt), sous une politique qui ne lui ouvre rien d'autre que ses propres images `data:` ;
     4. LA SÉPARATION : OP MESSAGES ne se branche JAMAIS sur le serveur d'OP GESTION (`test-900`) — ni la page, ni la source, ni le module ne nomment un chemin d'OP GESTION. */
'use strict';
const fs = require('fs'), path = require('path');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const RACINE = T.RACINE;
const nu = (s) => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const lire = (...p) => fs.readFileSync(path.join(RACINE, ...p), 'utf8');
const APERCU = lire('apercu', 'opmessages', 'index.html'), PUB_HTML = lire('server-msg', 'public', 'index.html'), UI = lire('server-msg', 'public', 'opmsg-ui.js'), SRC = lire('server-msg', 'public', 'source-serveur.js');
const MODULE = lire('opcourrier.js');
const SCRIPT = (h) => (h.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi) || []).map(x => x.replace(/^<script[^>]*>|<\/script>$/gi, '')).join('\n');
const corps = (src, entete) => { const i = src.indexOf(entete); if (i < 0) return ''; let j = src.indexOf('{', i), p = 0; for (let k = j; k < src.length; k++) { const c = src[k]; if (c === '{') p++; else if (c === '}') { p--; if (!p) return src.slice(i, k + 1); } } return ''; };

console.log('\n── 2695 · 1. La page : une rubrique du côté Pro, sur le canal que le service dit ouvert, module chargé à l\'ouverture ──');
{
  const JS = nu(SCRIPT(APERCU));
  vrai('(population) le script de la page est lu en entier', JS.length > 400000, JS.length);
  vrai('la vue « Courrier » est déclarée, avec son icône et sa section', /courrier: \{ titre: 'Courrier', icone: 'i-courrier'/.test(JS) && /id="vue-courrier"/.test(APERCU) && /<symbol id="i-courrier"/.test(APERCU));
  vrai('⛔ le Courrier n\'entre dans ORDRE que si le SERVICE l\'a dit ouvert (COUR.ouvert), et seulement dans le bloc d\'un compte PRO', /if \(etat\.pro\) \{[\s\S]{0,1300}?if \(COUR\.ouvert\) ORDRE\.splice\(ORDRE\.indexOf\('reunions'\) \+ 1, 0, 'courrier'\);[\s\S]{0,60}?NAV = navPour\(\);/.test(JS));
  vrai('⛔ le canal vient de `source.courrierOuvert()` (le SERVICE le dit) — jamais deviné par la page (ni nom d\'hôte, ni drapeau écrit dans la page)', /\.then\(\(\) => source\.courrierOuvert\(\)\)\.then\(v => v === true, \(\) => false\)/.test(JS) && /if \(courrierQ\) COUR\.ouvert = await courrierQ;/.test(JS) && !/location\.(host|hostname)|msg-beta|msg\.teamop/.test(JS.slice(JS.indexOf('let COUR = '), JS.indexOf('function entrerCourrier(') + 2500) + corps(JS, 'async function demarrer(')));
  vrai('⛔ une lecture refusée ne propose RIEN (« pas pu savoir » n\'est pas « ouvert » — y compris un appel qui jette avant sa promesse : `Promise.resolve().then`)', /Promise\.resolve\(\)\.then\(\(\) => source\.courrierOuvert\(\)\)\.then\(v => v === true, \(\) => false\)/.test(JS));
  vrai('⛔ le menu et la barre d\'onglets ne montrent le Courrier que côté Pro (navPour) ; passer côté Perso depuis le Courrier ramène aux Messages', /\(\(k !== 'accueil' && k !== 'courrier'\) \|\| !modesActifs\(\) \|\| etat\.mode === 'pro'\)/.test(JS) && /\(etat\.route\.vue === 'accueil' \|\| etat\.route\.vue === 'courrier'\) && m === 'perso'\) remplacer\(\{ vue: 'messages'/.test(JS));
  const ch = corps(JS, 'function courrierCharger(');
  vrai('⛔ le module se charge à l\'OUVERTURE, par un script de MÊME origine (relatif : « opcourrier.js »), pas par une balise du HTML ni au démarrage', /sc\.src = 'opcourrier\.js\?v=' \+/.test(ch) && !/<script[^>]*opcourrier/.test(APERCU) && (JS.match(/(?<!function )courrierCharger\(\)/g) || []).length === 1);
  const en = corps(JS, 'function entrerCourrier(');
  vrai('⛔ il est monté côté Pro seul, avec SA clé de stockage et l\'adaptateur que la SOURCE donne (la page ne contient aucune donnée)', /OPCourrier\.monter\(zone, \{ source: source\.courrierSource\(\), cotes: \['pro'\], cote: 'pro', cleStockage: 'opmsg_courrier'/.test(en));
  vrai('⛔ il suit le jour et la nuit de l\'APPAREIL (le module les lit seul) — aucun prefers-color-scheme en JavaScript dans la page (test-856)', !/theme:/.test(en));
  vrai('quitter la rubrique le démonte (sa relève ne tourne pas dans le dos d\'une autre vue)', /if \(prec && prec\.vue === 'courrier'\) courrierDemonter\(\);/.test(JS) && /function courrierDemonter\(\) \{ if \(COUR\.inst\) \{ try \{ COUR\.inst\.demonter\(\);/.test(JS));
  vrai('⛔ aucune donnée, aucun message, aucune boîte écrits dans la page (ni dans le module : test-2702)', !/@exemple|claire\.|Boîte de test|simulerCourrier/i.test(corps(JS, 'function entrerCourrier(') + corps(JS, 'function courrierAjuster(')));
  vrai('le HTML SERVI ne référence ni opcourrier.js ni autre chose que ses trois scripts (api, source, interface)', Array.from(PUB_HTML.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)).map(m => m[1]).join(',') === 'api.js,source-serveur.js,opmsg-ui.js');
  vrai('⛔ la page servie est celle de l\'aperçu (rien d\'écrit à la main côté Courrier) : le script servi porte entrerCourrier et la même ouverture conditionnelle', /function entrerCourrier\(/.test(UI) && /\.then\(\(\) => source\.courrierOuvert\(\)\)\.then\(v => v === true, \(\) => false\)/.test(UI) && /if \(courrierQ\) COUR\.ouvert = await courrierQ;/.test(UI));
}

console.log('\n── 2695 · 2. La source du service, la VRAIE, contre un vrai service bêta et un vrai service de production ──');
(async () => {
  const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
  const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
  const og = await T.fauxOpGestion({});
  const beta = await T.lancerService({ instance: 'beta', urlGestion: og.url }), prod = await T.lancerService({ instance: 'prod', urlGestion: og.url });
  const sources = [];
  const monter = (svc, o) => { const requetes = []; const f = async (u, i) => { requetes.push(((i && i.method) || 'GET') + ' ' + String(u).replace(svc.base, '')); if (o && o.panne) throw new TypeError('réseau coupé'); return fetch(u, i); };
    const s = creerSourceServeur({ OPMSG, base: svc.base, fetch: f }); sources.push(s); return { s, requetes }; };
  try {
    const mb = monter(beta), mp = monter(prod), mx = monter(beta, { panne: true });
    vrai('(population) la source du service annonce la capacité `courrier` et porte les deux méthodes', mb.s.capacites.courrier === true && typeof mb.s.courrierOuvert === 'function' && typeof mb.s.courrierSource === 'function');
    v('⛔ `courrierOuvert()` : VRAI sur la bêta (le service dit « beta »)', await mb.s.courrierOuvert(), true);
    v('⛔ …FAUX en production (le service dit « prod ») — la rubrique n\'y existe pas', await mp.s.courrierOuvert(), false);
    v('⛔ …FAUX quand la configuration est illisible : « on n\'a pas pu savoir » n\'est pas « ouvert »', await mx.s.courrierOuvert(), false);
    v('(contre-épreuve) les deux services disent bien leur instance à /api/config', [(await (await fetch(beta.base + '/api/config')).json()).instance, (await (await fetch(prod.base + '/api/config')).json()).instance], ['beta', 'prod']);

    /* l'adaptateur : VIDE, tout à faux, et muet sur le réseau */
    const avant = mb.requetes.length, c = mb.s.courrierSource();
    const cap = await c.capacites();
    v('⛔ capacites() est TOUT À FAUX : ni Google/Microsoft, ni envoi programmé, ni signature, ni marquage, ni déplacement, ni réglages de serveur, ni simulation', [cap.oauth, cap.programmeServeur, cap.signature, cap.marquage, cap.deplacement, cap.reglagesServeur, cap.simulation], [false, false, false, false, false, false, false]);
    v('⛔ aucune boîte, aucun message — la liste est LUE et vide (le module dit « Aucune boîte mail connectée »)', [await c.boites(), await c.messages({ boite: 'x', dossier: 'inbox' })], [[], []]);
    const rej = async (p) => { try { await p; return null; } catch (e) { return e && e.message; } };
    const BIENTOT = 'Bientôt : la connexion de vos boîtes arrive avec le serveur d’OP Courrier.';
    v('⛔ « Ajouter une boîte mail » dit « Bientôt » — le serveur d\'OP Courrier n\'existe pas encore', await rej(c.ajouterBoite({ email: 'a@b.fr', mdp: 'x' })), BIENTOT);
    v('…envoyer et retirer aussi (rien ne part, rien ne se retire)', [await rej(c.envoyer({ a: 'a@b.fr', objet: 'x', texte: 'y' })), await rej(c.retirerBoite('b1'))], [BIENTOT, BIENTOT]);
    v('⛔ l\'adaptateur ne fait AUCUN appel réseau (ni vers OP MESSAGES, ni vers OP GESTION : il est vide)', mb.requetes.length, avant);
    vrai('(population) le service avait bien reçu des appels avant (la mesure ci-dessus compte quelque chose)', avant >= 1, avant);
    vrai('le code de l\'adaptateur ne contient aucun fetch ni aucun chemin d\'OP GESTION', !/fetch|\/api\/monitor|api\.teamop\.fr|server\//.test(nu(corps(SRC, 'function courrierSource('))) && corps(SRC, 'function courrierSource(').length > 400);

    console.log('\n── 2695 · 3. Le service sert opcourrier.js LUI-MÊME ──');
    for (const [nom, svc] of [['bêta', beta], ['production', prod]]) {
      const r = await fetch(svc.base + '/opcourrier.js');
      const txt = await r.text();
      vrai('⛔ ' + nom + ' : /opcourrier.js répond 200, en JavaScript, avec les octets du module de la racine du dépôt', r.status === 200 && /javascript/.test(r.headers.get('content-type') || '') && txt === MODULE, r.status + ' ' + r.headers.get('content-type'));
      const csp = r.headers.get('content-security-policy') || '';
      vrai(nom + ' : la politique de l\'en-tête ne laisse sortir ni script ni connexion (script-src \'self\', connect-src \'self\', pas de https: ni *)', /script-src 'self'/.test(csp) && /connect-src 'self'/.test(csp) && !/https:|\*|unsafe-eval/.test(csp), csp);
      const h = await (await fetch(svc.base + '/')).text();
      vrai(nom + ' : la page servie porte la politique qui permet ses images `data:` (les deux icônes du module) et rien de plus large', /img-src 'self' blob: data:;/.test(h) && !/img-src[^;]*https:/.test(h));
    }
    console.log('\n── 2695 · 4. La séparation : OP MESSAGES ne se branche pas sur OP GESTION ──');
    const code = nu(MODULE);
    vrai('le module ne nomme aucun chemin, domaine ou serveur d\'OP GESTION (il ne parle qu\'à l\'adaptateur qu\'on lui donne)', !/teamop\.fr|\/api\/monitor|\/api\/mailbox|api\.teamop\.fr|PUSH_API/.test(code));
    vrai('la source du service ne lit aucune route d\'OP GESTION pour le Courrier (aucune adresse /api/ nouvelle : l\'adaptateur n\'en a pas, `courrierOuvert` lit /api/config du service lui-même)', !/\/api\/(mailbox|mailboxes|replies|sendmail|monitor)/.test(nu(SRC)));
  } finally {
    for (const s of sources) { try { if (typeof s.arreter === 'function') s.arreter(); } catch (e) { /* déjà arrêté */ } }
    await beta.arreter(); await prod.arreter(); await og.fermer();
  }
  fin();
})().catch(e => { console.log('  ✗ banc interrompu : ' + (e && e.stack || e)); process.exitCode = 1; fin(); });

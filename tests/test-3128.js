/* ⛔ CE QUE CE FICHIER GARDE — LA POIGNÉE DE MAIN DU CADRE ET LE PREMIER CONTACT CÔTÉ PRO (28 octobre 2026, relecture du chantier « OP MESSAGES dans la Tour »).

   La Tour affiche la page d'OP MESSAGES bêta dans un cadre. Deux défauts de PREMIER CONTACT, mesurés au navigateur et corrigés ici, dans la page elle-même :

     1. LA TOUR NE PEUT PAS SAVOIR QU'UN CADRE A ÉTÉ REFUSÉ. Un cadre refusé (CSP d'un serveur d'avant, X-Frame-Options d'un relais, page 502 de nginx) tire `load` comme un cadre qui marche, et rien
        de lui n'est lisible de l'extérieur. Seule la page, quand elle s'exécute DANS le cadre, peut le dire : `window.parent.postMessage({ opmsg: 'pret' }, 'https://teamop.fr')`. Sans cette
        ligne, aucune panne n'était détectée avant qu'une poignée ait été vue une fois sur l'appareil — c'est-à-dire jamais, la première fois.
        Les propriétés qui comptent, et qui ne se verraient PAS à l'écran :
          · l'origine cible est ÉCRITE (`https://teamop.fr`), jamais « * » : une poignée envoyée à « * » dirait à n'importe quel site qui encadre la page que le cadre a marché ;
          · hors d'un cadre (`window.parent === window`) rien ne part ; un `postMessage` qui jette ne fait pas jeter la page ;
          · la ligne est APRÈS la fonction de la page, dans le FICHIER servi (`opmsg-ui.js`, la page n'a aucun script en ligne : `script-src 'self'`), et la source de l'interface
            (`apercu/opmessages/index.html`) la porte aussi — le générateur a été rejoué ;
     2. « AUCUNE CONVERSATION PERSO » ÉTAIT UN CUL-DE-SAC. Les agents, les canaux et les collègues sont côté PRO ; la première arrivée tombait sur un Perso vide (au téléphone la bascule est dans le Profil,
        derrière un badge) et ressemblait à « les agents ont disparu ». La phrase nomme maintenant ce qu'il y a de l'autre côté (« Tu en as N côté Pro ») et un bouton « Passer côté Pro » y mène — rien ne change
        de côté tout seul. La fonction `versPro` est jouée pour de vrai (celle de la page servie), avec ses cas : rien de l'autre côté → rien ; les invitations et les archivées ne comptent pas.

   ⚠️ CE QUE CE BANC NE VOIT PAS : que le navigateur livre vraiment la poignée à la Tour dans un cadre d'une autre origine, et que la Tour la reçoive — mesuré au navigateur, contre le VRAI service, par
   `scratchpad/cadre-tour/bench-cadre.js` (la Tour de l'aperçu) ; et que « Passer côté Pro » change vraiment de côté dans la vraie page : `scratchpad/cadre-tour/sonde-vers-pro.js`. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();

const RACINE = T.RACINE;
const SERVI_JS = fs.readFileSync(path.join(T.SERVICE, 'public/opmsg-ui.js'), 'utf8');
const SERVI_HTML = fs.readFileSync(path.join(T.SERVICE, 'public/index.html'), 'utf8');
const SOURCE = fs.readFileSync(process.env.SOURCE_FICHIER || path.join(RACINE, 'apercu/opmessages/index.html'), 'utf8');
const JS = process.env.SERVI_FICHIER ? fs.readFileSync(process.env.SERVI_FICHIER, 'utf8') : SERVI_JS;
/* seuls les commentaires qui COMMENCENT une ligne sont retirés (règle du dépôt) ; les noms cherchés vivent aussi dans les commentaires qui les expliquent */
const CODE = (t) => t.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
/* une fonction découpée à ses accolades, depuis sa déclaration */
const fn = (texte, nom) => { const i = texte.indexOf('function ' + nom + '('); if (i < 0) return ''; let d = 0, j = texte.indexOf('{', i); for (; j < texte.length; j++) { if (texte[j] === '{') d++; else if (texte[j] === '}') { d--; if (!d) break; } } return texte.slice(i, j + 1); };

(async () => {
  console.log('── test-3128 · la poignée de main du cadre, et « Passer côté Pro » ──');

  console.log('\n1. La poignée de main : dans le FICHIER servi, et dans la source');
  const LIGNE = /try \{ if \(window\.parent !== window\) window\.parent\.postMessage\(\{ opmsg: 'pret' \}, 'https:\/\/teamop\.fr'\); \} catch \(e\) \{[^}]*\}/;
  for (const [nom, texte] of [['opmsg-ui.js (servi)', JS], ['apercu/opmessages/index.html (source)', SOURCE]]) {
    const code = CODE(texte), m = LIGNE.exec(code);
    vrai('(population) ' + nom + ' : la ligne de la poignée est trouvée, UNE fois', !!m && (code.match(/opmsg: 'pret'/g) || []).length === 1);
    vrai('⛔ ' + nom + ' : l\'origine cible est ÉCRITE (`https://teamop.fr`) — jamais « * », jamais une variable', !!m && !/postMessage\([^)]*['"]\*['"]/.test(code) && /'https:\/\/teamop\.fr'\)/.test(m ? m[0] : ''));
    vrai('⛔ ' + nom + ' : elle ne part QUE dans un cadre (`window.parent !== window`) et un `postMessage` qui jette est rattrapé', !!m && /window\.parent !== window/.test(m[0]) && /catch \(e\)/.test(m[0]));
  }
  {
    const code = CODE(JS);
    vrai('⛔ la poignée est APRÈS la fermeture de la fonction de la page (`})();`), seule : si le démarrage jette de façon synchrone, elle ne part pas — une page cassée ne dit pas « prêt »', /\}\)\(\);\s*try \{ if \(window\.parent !== window\) window\.parent\.postMessage\(\{ opmsg: 'pret' \}/.test(code));
    vrai('la page servie n\'a AUCUN script en ligne (`script-src \'self\'`) : la poignée est dans le fichier, pas dans la page', !/<script(?![^>]*\bsrc=)[^>]*>\s*\S/.test(SERVI_HTML), (SERVI_HTML.match(/<script[^>]*>/g) || []));
  }

  console.log('\n2. La ligne EXÉCUTÉE : un cadre la reçoit, une page seule ne dit rien');
  {
    const ligne = LIGNE.exec(CODE(JS));
    const joue = (cadre, jette) => {
      const envois = []; const parent = { postMessage: (m, o) => { if (jette) throw new Error('SecurityError'); envois.push([m, o]); } };
      const win = {}; win.parent = cadre ? parent : win;
      let leve = null; try { vm.runInNewContext(ligne[0], { window: win }); } catch (e) { leve = e.message; }
      return { envois, leve };
    };
    const cadre = joue(true), seule = joue(false), panne = joue(true, true);
    v('encadrée : UN message `{opmsg:"pret"}`, à `https://teamop.fr` et à lui seul', cadre.envois, [[{ opmsg: 'pret' }, 'https://teamop.fr']]);
    v('⛔ pas encadrée (`window.parent === window`) : RIEN ne part', seule.envois, []);
    v('un `postMessage` qui jette (cadre sandboxé, navigateur étrange) ne fait pas jeter la page', [panne.leve, panne.envois], [null, []]);
  }

  console.log('\n3. Le vrai service sert le fichier qui la porte');
  {
    const s = await T.lancerService({});
    try {
      const c = T.client(s.base);
      const r = await c.get('/opmsg-ui.js');
      vrai('(population) le service sert `opmsg-ui.js` (200)', r.code === 200, r.code);
      const corps = await fetch(s.base + '/opmsg-ui.js').then((x) => x.text());
      vrai('⛔ …et ce que le service sert PORTE la poignée (le fichier commité n\'est pas un autre que celui qui part)', LIGNE.test(CODE(corps)) && corps === SERVI_JS);
    } finally { await s.arreter(); }
  }

  console.log('\n4. « Passer côté Pro » : la fonction réelle, ses cas, son branchement');
  {
    const F = fn(CODE(JS), 'versPro');
    vrai('(population) `versPro` est trouvée dans la page servie', F.length > 80, F.slice(0, 60));
    const joue = (conversations) => vm.runInNewContext(F + '\nversPro()', { etat: { conversations }, coteDe: (c) => (c && c.cote === 'pro' ? 'pro' : 'perso') });
    const pro = (id, extra) => Object.assign({ id, cote: 'pro' }, extra || {});
    v('⛔ rien côté Pro : aucune phrase en trop, aucun bouton (jamais un renvoi vers du vide)', joue([{ id: 'p1', cote: 'perso' }]), '');
    const un = joue([pro('a')]), trois = joue([pro('a'), pro('b'), pro('c'), { id: 'p', cote: 'perso' }]);
    vrai('une conversation côté Pro : elle le DIT (« Tu en as 1 côté Pro ») et mène à lui par un bouton « Passer côté Pro »', /Tu en as 1 côté Pro/.test(un) && /<button type="button" class="lien-texte presse" data-passer-cote="pro">Passer côté Pro<\/button>/.test(un), un);
    vrai('trois côté Pro, une côté Perso : « Tu en as 3 côté Pro » (on compte l\'AUTRE côté, pas le total)', /Tu en as 3 côté Pro/.test(trois), trois);
    v('⛔ les invitations reçues et les archivées ne comptent pas (elles n\'apparaissent pas dans la liste du côté Pro non plus)', joue([pro('a', { invitation: 'recue' }), pro('b', { archive: true })]), '');
    vrai('la phrase nomme ce qui est de l\'autre côté (agents, canaux, collègues) sans promettre un contenu précis', /agents/.test(trois) && /canaux/.test(trois) && /collègues/.test(trois));
    const code = CODE(JS), liste = code.slice(code.indexOf('function rendreListe('), code.indexOf('peindreSelection(); majBadge(); peindreMode();'));
    vrai('(population) le corps de `rendreListe` est trouvé (jusqu\'à la peinture de la sélection)', liste.length > 1000 && /Aucun résultat pour/.test(liste), liste.length);
    vrai('⛔ `rendreListe` n\'ajoute le renvoi QUE sur la phrase PERSO (« Aucune conversation Perso pour l\'instant. » + `versPro()`), jamais sur la phrase Pro ni sur « Aucun résultat »',
      /'Aucune conversation Perso pour l\\'instant\.' \+ versPro\(\)\)/.test(liste) && (liste.match(/versPro\(\)/g) || []).length === 1  && !/Aucun résultat pour[^\n]*versPro/.test(liste));
    vrai('⛔ le clic est UN écouteur délégué qui sert déjà la bascule du Profil : `[data-passer-cote]` passe par `changerMode` (la préférence du compte, une écriture, le même chemin que le segment)',
      /closest\('\[data-cote-seg\] \[data-cote\], \[data-passer-cote\]'\)[\s\S]{0,40}changerMode\(b\.dataset\.cote \|\| b\.dataset\.passerCote\)/.test(code));
    vrai('la CSS du bouton est dans la page (centré, sous la phrase, lisible)', /\.vide \.vide-cote \{ display: block;/.test(SERVI_HTML) && /\.vide \.vide-cote \.lien-texte \{[^}]*margin: 0 auto/.test(SERVI_HTML));
  }

  fin();
})().catch((e) => { console.error(e); process.exit(1); });

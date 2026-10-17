/* ══ CE QUI SE POSE PAR-DESSUS L'ÉCRAN : LE PETIT MOT ET LA BANDE HORS LIGNE (lot m07, 17 octobre 2026) — LE CODE QUI LES PLACE ═════════════════════════════════════════════
   La preuve fonctionnelle est une SONDE au navigateur (`tests/sonde-opmessages-recouvrement.js` : quatre appareils, encoche posée, l'intersection mesurée contre chaque titre et chaque
   commande). Ce banc-ci garde, dans le CSS de la page, les écritures qui font tenir cette promesse — une règle retirée ou remise à l'ancienne tombe ici sans navigateur :
     1. LE PETIT MOT (`.mot`) : ancré sur le BAS de ce qu'on voit (`--mot-bas`, `--vvt` + `--vvh`), jamais à 56 px du haut ; un texte (`pointer-events: none`) ; en haut seulement sur
        une feuille ouverte et l'appel à deux ; au-dessus de la barre ronde de la salle ;
     2. LA BANDE HORS LIGNE (`.hors-ligne`) : de hauteur fixe, sur une ligne, sans toucher ; sa hauteur (`--hl-h`) est posée par `:has()` sur la bande ELLE-MÊME (aucun JavaScript :
        elle reste celle que le JavaScript montre ou cache) et entre dans `--pousse`, que lisent le corps, la conversation, la barre latérale, les barres collantes ; l'écran d'appel, la
        salle, la barre d'appel réduit, la bannière d'arrivée et le bandeau de mise à jour se posent SOUS elle ;
     3. elle ne devient pas un bouton (temps-reel@4 : « ne pas lui donner un rôle de bouton »), et le JavaScript qui la montre ne change pas.
   ⛔ UN MOTIF DE BANC VISE DU CODE, JAMAIS UNE PHRASE : les commentaires sont retirés AVANT de chercher (seulement les blocs qui COMMENCENT une ligne, CLAUDE.md, 21 septembre 2026). */
'use strict';
const fs = require('fs'), path = require('path');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const PAGE = fs.readFileSync(path.join(T.RACINE, 'apercu/opmessages/index.html'), 'utf8');
const CSS_BRUT = (/<style>([\s\S]*?)<\/style>/.exec(PAGE) || [, ''])[1];
const CSS = CSS_BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/\/\*[^*]*\*\//g, ' ');
const HTML = PAGE.replace(/<style>[\s\S]*?<\/style>/, ' ').replace(/<script>[\s\S]*?<\/script>/, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
const JS = ((/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1]).replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/(^|\s)\/\/\s.*$/gm, ' ');

/* le corps de la règle dont le sélecteur est EXACTEMENT `sel` (en début de ligne, éventuellement dans un @media indenté) ; toutes les occurrences, jointes */
function corps(sel) {
  const re = new RegExp('(?:^|\\n)[ \\t]*' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}', 'g');
  const sortie = []; let m; while ((m = re.exec(CSS))) sortie.push(m[1]);
  return sortie.join(' ; ').replace(/\s+/g, ' ');
}
const a = (sel, motif) => motif.test(corps(sel));

console.log('1. Le petit mot');
{
  const mot = corps('.mot');
  vrai('(population) la règle `.mot` est trouvée', mot.length > 50);
  vrai('⛔ ancré sur le BAS de ce qu\'on voit : `top` calculé sur `--vvt` + `--vvh` moins `--mot-bas`, remonté de sa propre hauteur (`translate: 0 -100%`)', /top:\s*calc\(var\(--vvt, 0px\) \+ var\(--vvh, 100%\) - var\(--mot-bas\)\)/.test(mot) && /translate:\s*0 -100%/.test(mot));
  vrai('⛔ plus posé à 56 px sous l\'encoche (il tombait sur le grand titre, le segmenté, « Fermer »)', !/safe-area-inset-top[^;]*\+ 56px/.test(mot) && !/html\[data-conv\] \.mot/.test(CSS));
  vrai('un texte : `pointer-events: none`', /pointer-events:\s*none/.test(mot));
  vrai('la distance au bas est définie (liste : au-dessus de la barre d\'onglets ; conversation : au-dessus du champ d\'écriture ; bureau ; salle)',
    /--mot-bas:\s*calc\(max\(14px/.test(corps(':root')) && /--mot-bas/.test(corps('html[data-conv]')) && /--mot-bas/.test(corps('html[data-salle]')) && /--mot-bas/.test(corps('html[data-kind="tablette"]')));
  vrai('⛔ une feuille ouverte et l\'appel à deux : en HAUT, sur ce que rien ne rend touchable (page éteinte par le voile, 56 px vides sous l\'encoche), sous la bande hors ligne',
    /top:\s*calc\(var\(--vvt, 0px\) \+ env\(safe-area-inset-top, 0px\) \+ var\(--hl-h\) \+ 6px\)/.test(corps('html.feuille-ouverte .mot, html[data-appel]:not([data-salle]) .mot')));
  vrai('et il entre sans rester décalé : `.on` remet la transformation à zéro dans ces deux cas aussi', /transform:\s*none/.test(corps('html.feuille-ouverte .mot.on, html[data-appel]:not([data-salle]) .mot.on')));
  vrai('le JavaScript qui le montre est inchangé (texte + classe `on`, 2,4 s)', /function mot\(texte\) \{\s*clearTimeout\(minMot\);\s*\$\('mot'\)\.textContent = texte; \$\('mot'\)\.classList\.add\('on'\);\s*minMot = setTimeout\(\(\) => \$\('mot'\)\.classList\.remove\('on'\), 2400\);/.test(JS));
}

console.log('\n2. La bande hors ligne');
{
  const bande = corps('.hors-ligne');
  vrai('(population) la règle `.hors-ligne` est trouvée', bande.length > 50);
  vrai('⛔ sa hauteur est FIXE (`--hl-h` + l\'encoche) et sur une ligne : elle ne déborde pas sur la ligne d\'en dessous', /height:\s*calc\(env\(safe-area-inset-top, 0px\) \+ var\(--hl-h\)\)/.test(bande) && /white-space:\s*nowrap/.test(bande) && /text-overflow:\s*ellipsis/.test(bande));
  vrai('un texte : `pointer-events: none`', /pointer-events:\s*none/.test(bande));
  vrai('⛔ `--hl-h` vaut 0 sans bande et 28 px tant qu\'elle est là — posé par `:has()` sur la bande ELLE-MÊME, que le JavaScript montre ou cache',
    /--hl-h:\s*0px/.test(corps(':root')) && /--hl-h:\s*28px/.test(corps('html:has(#hors-ligne:not([hidden]))')));
  vrai('`--pousse` réunit la bande et la barre d\'appel réduit', /--pousse:\s*calc\(var\(--hl-h\) \+ var\(--haut-appel, 0px\)\)/.test(corps(':root')));
  vrai('⛔ le corps est poussé de `--pousse`', a('body', /padding-top:\s*var\(--pousse\)/));
  vrai('⛔ la conversation (haut ET hauteur, clavier compris), son écran vide, la barre latérale sont poussés', /top:\s*calc\(var\(--vvt, 0px\) \+ var\(--pousse, 0px\)\)/.test(corps('.conv-ecran')) && /height:\s*calc\(var\(--vvh, 100%\) - var\(--pousse, 0px\)\)/.test(corps('.conv-ecran'))
    && /top:\s*var\(--pousse, 0px\)/.test(corps('.conv-vide')) && /top:\s*var\(--pousse\)/.test(corps('.side')) && /height:\s*calc\(100dvh - var\(--pousse\)\)/.test(corps('.side')));
  vrai('⛔ la page ne s\'allonge pas de la hauteur de la bande (pas de barre de défilement de plus)', /min-height:\s*calc\(100dvh - var\(--pousse\)\)/.test(corps('.app')));
  vrai('⛔ l\'écran d\'appel et la SALLE (« Quitter ») commencent sous la bande', /top:\s*var\(--hl-h\)/.test(corps('.appel-ecran')) && /top:\s*var\(--hl-h\)/.test(corps('.salle-ecran')));
  vrai('la barre d\'appel réduit se pose sous la bande, la bannière d\'arrivée et le bandeau de mise à jour aussi', /top:\s*var\(--hl-h\)/.test(corps('.appel-barre')) && /--haut:\s*calc\(max\(10px[^;]*var\(--hl-h\)\)/.test(corps('.notif')) && /top:\s*calc\(max\(10px[^;]*var\(--hl-h\)\)/.test(corps('.maj-bandeau')));
  vrai('⛔ les barres COLLANTES du bureau ne glissent pas sous la bande quand on défile (barre d\'outils, profil, fiche d\'un contact)',
    /position:\s*sticky;\s*top:\s*var\(--pousse, 0px\)/.test(corps('.vue > .entete-vue')) && /top:\s*calc\(66px \+ var\(--pousse, 0px\)\)/.test(corps('#vue-reglages .reg-accueil')) && /top:\s*calc\(12px \+ var\(--pousse, 0px\)\)/.test(corps('.reg-accueil')) && /top:\s*calc\(52px \+ var\(--pousse, 0px\)\)/.test(corps('#vue-contacts > .vc-fiche')));
  vrai('⛔ elle ne devient PAS un bouton : ni `onclick`, ni `tabindex`, ni `role="button"` — `role="status"`, cachée par défaut', /<p class="hors-ligne" id="hors-ligne" role="status" hidden>Connexion perdue — reconnexion en cours…<\/p>/.test(HTML));
  vrai('le JavaScript qui la montre ne change pas : trois endroits, `hidden` seulement', (JS.match(/\$\('hors-ligne'\)\.hidden = /g) || []).length === 3 && !/\$\('hors-ligne'\)\.(style|classList|addEventListener)/.test(JS));
}
fin();

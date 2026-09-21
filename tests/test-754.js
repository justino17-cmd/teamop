/* ══ REFONTE POINT 4 — LES FICHES (Box, Intervention, Client) ═════════════════════════════
   Dossier de refonte : « retour mono, éditer/supprimer, titre en accent, carte clé-valeur,
   sections en cartes à en-tête teinté, statut en pilule ».

   ⛔ LE CROCHET EST `.det-back`, ET IL A ÉTÉ MESURÉ. Les trois fiches appellent
   `setHeader('','','')` puis rendent leur PROPRE barre de retour, toutes avec la même classe :
   `#content:has(.det-back)` désigne donc exactement « on est sur une fiche ». Pas de nouvelle
   classe à poser dans vingt endroits, pas de drapeau JavaScript à tenir à jour.

   Trois choses que seule la mesure a dites, et que ce banc retient :
   1. ⛔ `.btn.det-back`, PAS `.det-back` — une question de POIDS. Le bouton porte aussi
      `.btn.sm`, et `html[data-refonte] .btn.sm` (trois crans) battait `html[data-refonte]
      .det-back` (deux crans) : la pilule ne sortait jamais. Relevé : 8 px au lieu de 999.
   2. ⛔ LA TEINTE VISE `.card-head` À TOUTE PROFONDEUR, pas `.card .card-head`. La fiche Box
      porte TROIS en-têtes de section pour UNE seule `.card` : deux vivent hors de toute
      carte. Le sélecteur étroit laissait la fiche Box entièrement sans teinte.
   3. ⛔ ET LA TEINTE S'ARRÊTE AUX FICHES. Mesuré sur les Paramètres : 22 cartes à en-tête,
      zéro teintée. Une teinte partout ne hiérarchise plus rien.

   ⚠️ Les pixels (999 px de rayon, 44 px de haut, en-têtes teintés comptés un par un sur les
   trois fiches réelles) sont mesurés au navigateur — `scratchpad/sonde-fiche.js`, 23 ✓.     */
const fs=require('fs'); const APP=fs.readFileSync(__dirname+'/../app.html','utf8');
let ok=0,ko=0;
const v=(t,a,b)=>{ if(JSON.stringify(a)===JSON.stringify(b)){ok++;console.log('  ✓ '+t);}
  else {ko++;console.log('  ✗ '+t+'\n      attendu : '+JSON.stringify(b)+'\n      obtenu  : '+JSON.stringify(a));} };
const vrai=(t,c)=>v(t,!!c,true);

console.log('\n══ 1. LES TROIS FICHES PARTENT DU MÊME CROCHET ══\n');
const NU=APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm,' ').replace(/^[ \t]*\/\/.*$/gm,' ');
{ /* ⛔⛔ DEUX ÉCRANS ET UNE FENÊTRE — ET LE BANC A SERVI À LE DÉCOUVRIR. La première écriture
     rangeait les trois fiches ensemble ; le contrôle est tombé sur `ficheClient`, et la mesure
     au navigateur a confirmé : elle appelle `openModal`, ne touche jamais `#content`, donc
     `:has(.det-back)` ne l'atteint pas. La sonde qui croyait la mesurer lisait la fiche
     INTERVENTION restée à l'écran DERRIÈRE la fenêtre — trois ✓ parfaitement creux.
     On garde donc les deux familles séparément, chacune avec sa règle. */
  /* ⛔ UNE FENÊTRE DE 32 000 CARACTÈRES NE COUVRAIT PAS `detailIntervention` : sa barre de
     retour est 438 lignes plus bas que sa déclaration. Le banc l'accusait de ne pas en rendre
     une — sur du code juste. On borne à la fonction SUIVANTE, comme partout ailleurs, au lieu
     de deviner une longueur. */
  const corpsDe=(f)=>{ const i=NU.indexOf('function '+f+'('); if(i<0) return '';
    const bornes=['\nfunction ','\nasync function ','\nviews.'].map(b=>NU.indexOf(b,i+10)).filter(x=>x>0);
    return NU.slice(i, bornes.length?Math.min(...bornes):NU.length); };
  /* ⚠️ ET CE N'EST PAS `detailIntervention` QUI DESSINE. Elle règle l'état (onglet, mode
     édition) puis délègue à `renderIntDetail`, qui porte la barre de retour — le banc
     l'accusait de ne pas en rendre une, sur du code juste. On nomme donc la fonction qui
     DESSINE, pas celle par laquelle on entre. Deux noms, un seul écran. */
  [['la Box','renderBoxDetail'],['l\'Intervention','renderIntDetail']].forEach(([quoi,f])=>{
    const c=corpsDe(f);
    vrai('   `'+f+'` (fiche de '+quoi+') existe', c.length>0);
    vrai('   … c\'est un ÉCRAN : elle rend sa propre barre `det-back`', c.indexOf('det-back')>0);
    vrai('   … après avoir vidé l\'en-tête global (sinon deux retours qui ne mènent pas au même endroit)',
      /setHeader\('','',''\)/.test(c));
  });
  vrai('   … et on y entre bien par `detailIntervention`', /renderIntDetail/.test(corpsDe('detailIntervention')));
  { const c=corpsDe('ficheClient');
    vrai('   `ficheClient` existe', c.length>0);
    vrai('⛔ c\'est une FENÊTRE : elle passe par openModal', /openModal\(/.test(c));
    v('⛔ … et elle ne rend PAS de `det-back` (donc la teinte de section ne la touche pas)',
      c.indexOf('det-back')>0, false);
  }
  v('⛔ exactement DEUX écrans rendent une barre de fiche',
    (APP.match(/class="btn ghost sm det-back"/g)||[]).length, 2);
}
console.log('\n══ 2. LE STYLE DE LA FICHE ══\n');
{ const titre='LES FICHES — Box, Intervention, Client (point 4 de la refonte)';
  const i0=APP.indexOf(titre);
  vrai('⛔ le bloc de style est trouvé (sinon tout ce qui suit est creux)', i0>0);
  /* Borner au bloc suivant, jamais à `</style>` : trois bancs l'ont déjà payé. */
  const suivant=APP.indexOf('/* ══', i0+titre.length), style=APP.indexOf('</style>', i0);
  const fin=(suivant>0&&(style<0||suivant<style))?suivant:style;
  const css=(i0>0?APP.slice(i0, fin>0?fin:i0+9000):'').replace(/\/\*[\s\S]*?\*\//g,' ');
  v('   … et il a de la matière', css.length>1500, true);

  vrai('⛔⛔ le retour vise `.btn.det-back` — sinon `.btn.sm` le bat et la pilule ne sort jamais',
    /html\[data-refonte\] \.btn\.det-back\{/.test(css));
  vrai('   … en pilule', /border-radius:var\(--r-pill,999px\)!important/.test(css));
  vrai('   … et 44 px sous le doigt sur téléphone',
    /@media\(max-width:780px\)\{ html\[data-refonte\] \.btn\.det-back\{min-height:44px\} \}/.test(css));

  vrai('⛔⛔ la teinte vise `.card-head` À TOUTE PROFONDEUR (la fiche Box en a hors de toute carte)',
    /html\[data-refonte\] #content:has\(\.det-back\) \.card-head\{/.test(css));
  v('⛔ … et JAMAIS le sélecteur étroit qui laissait la Box sans teinte',
    /#content:has\(\.det-back\) \.card \.card-head\{/.test(css), false);
  vrai('⛔ le débord (marges négatives) reste réservé aux enfants directs, dont on connaît le rembourrage',
    /#content:has\(\.det-back\) \.card > \.card-head\{[\s\S]{0,120}margin:-22px -24px/.test(css));

  vrai('⛔⛔ TOUT est gardé par `:has(.det-back)` — rien ne déborde sur une liste ou un tableau de bord',
    css.split('}').filter(r=>{ const sel=r.slice(0,r.indexOf('{')).trim();
      if(!sel||/^@/.test(sel)||/^from|^to/.test(sel)||sel.indexOf('/*')>=0) return false;
      /* les deux seules règles hors fiche sont le retour et la classe de bouton « matière » */
      return sel.indexOf(':has(.det-back)')<0 && sel.indexOf('.det-back')<0
          && sel.indexOf('.btn.matiere')<0 && sel.indexOf('#modal')<0;
    }).length===0);

  vrai('la carte clé-valeur a la grammaire de la maquette', /\.frow-val\{font-weight:600;font-variant-numeric:tabular-nums/.test(css));
  vrai('le statut est en pilule sur un écran de fiche', /#content:has\(\.det-back\) \.st\{/.test(css));
  /* ⛔ Et dans une FENÊTRE aussi : la fiche Client en est une. Mais PAS la teinte de section —
     une fenêtre a déjà son `.modal-head`, et deux niveaux de titre dans 500 px se concurrencent. */
  vrai('⛔ la grammaire clé-valeur atteint aussi les fenêtres', /html\[data-refonte\] #modal \.frow\{/.test(css));
  vrai('⛔ … et le statut en pilule', /html\[data-refonte\] #modal \.st\{/.test(css));
  v('⛔⛔ mais PAS l\'en-tête teinté dans une fenêtre', /#modal \.card-head\{/.test(css), false);
  vrai('⛔ un contraste renforcé remplace la teinte par un FILET net, au lieu de l\'assombrir',
    /prefers-contrast: more/.test(css) && /border-bottom:2px solid var\(--acc\)/.test(css));
  vrai('⛔ la transparence réduite éteint le flou de l\'en-tête', /prefers-reduced-transparency: reduce/.test(css));
  vrai('Windows reprend ses coins droits', /html\[data-os="windows"\] \.btn\.det-back/.test(css));
}

console.log('\n═══ test-754 : '+ok+' ✓ '+ko+' ✗ ═══\n');
process.exit(ko?1:0);

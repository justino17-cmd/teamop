/* ══ REFONTE POINT 3 — LE GABARIT DES LISTES ══════════════════════════════════════════════
   Dossier de refonte : « Listes (25 catégories, même gabarit) — recherche en pilule, filtres
   segmentés 3 positions (curseur animé .42 s), lignes ≥ 64 px ».

   ⛔ ON NE RÉÉCRIT PAS VINGT-CINQ VUES. Chacune a sa logique métier, ses colonnes, ses filtres ;
   les réécrire en une passe, c'est vingt-cinq occasions de casser un écran qu'un technicien
   ouvre tous les jours, pour un gain de forme. On relève ce qu'elles PARTAGENT DÉJÀ.

   ⛔ ET CE QU'ELLES PARTAGENT A ÉTÉ MESURÉ, PAS SUPPOSÉ. La première écriture visait `.pl-row`
   et `.list-tbl` « parce que c'est ce qu'une liste utilise ». Relevé écran par écran au
   navigateur : Véhicules et Tâches rendent des `.pl-row`, Techniciens un `.list-tbl` avec des
   `tr.row-clk`, et Interventions / Clients / Fournisseurs rendent chaque ligne comme une
   `.card`. La recherche, elle, partage une CLASSE (`.search-inp`, 32 emplois) et non une
   structure. Un nom n'est pas un contenu — il a fallu ouvrir les écrans pour le savoir.

   Trois pièges gardés ici :
   1. ⛔ `segEligible` IGNORE LE CURSEUR. Sans ça, `segInit` se défait au second passage : le
      curseur qu'il vient d'ajouter fait que le groupe cesse d'être éligible. Mesuré : trois
      appels laissaient ZÉRO curseur, et le repositionnement au redimensionnement ne marchait
      plus jamais.
   2. ⛔ LE CURSEUR EST À `top:0`. La transformation part du bord du GROUPE, rembourrage
      compris : un `top` non nul s'AJOUTE. Mesuré : 3 px trop bas.
   3. ⛔ ON NE TRANSFORME PAS CE QUI N'EST PAS UN SEGMENTÉ — cinq chips, ou un bouton d'action
      dans le groupe, et le curseur coulissant sauterait d'une ligne à l'autre.

   ⚠️ Le glissement, les 44 px et les hauteurs réelles sont mesurés au navigateur
   (`scratchpad/sonde-gabarit.js`, 31 ✓, sur les VRAIS écrans).                              */
const fs=require('fs'); const APP=fs.readFileSync(__dirname+'/../app.html','utf8');
let ok=0,ko=0;
const v=(t,a,b)=>{ if(JSON.stringify(a)===JSON.stringify(b)){ok++;console.log('  ✓ '+t);}
  else {ko++;console.log('  ✗ '+t+'\n      attendu : '+JSON.stringify(b)+'\n      obtenu  : '+JSON.stringify(a));} };
const vrai=(t,c)=>v(t,!!c,true);

function decoupe(h){ const d=APP.indexOf(h); if(d<0) throw new Error('introuvable : '+h);
  const suite=/\n(?=(?:function |const |let |var |class |async function |\/\* |views\.|document\.|window\.|try\{))/g;
  suite.lastIndex=d+h.length;
  const m=suite.exec(APP); const fin=m?m.index:Math.min(APP.length,d+80000);
  let bout=APP.slice(d,fin);
  for(;;){ const k=Math.max(bout.lastIndexOf('}'),bout.lastIndexOf(';')); if(k<0) break;
    const t=bout.slice(0,k+1);
    try{ new Function(t); return t; }catch(e){ bout=bout.slice(0,k); } }
  throw new Error('fin introuvable : '+h); }

/* Un faux DOM minimal : `segEligible` ne lit que `children` et `classList`. */
const faux=(classes)=>({ classList:{ contains:c=>classes.indexOf(c)>=0 } });
const groupe=(enfants)=>({ children:enfants });

console.log('\n══ 1. QUI DEVIENT UN SEGMENTÉ, ET QUI NON ══\n');
{ const M=new Function(`${decoupe('const SEG_MAX=')}\n${decoupe('function segEligible(g){')}\nreturn { segEligible, SEG_MAX };`)();
  const chip=()=>faux(['chip']);
  v('deux chips : segmenté', (M.segEligible(groupe([chip(),chip()]))||[]).length, 2);
  v('trois chips : segmenté (la maquette en demande trois)', (M.segEligible(groupe([chip(),chip(),chip()]))||[]).length, 3);
  v('quatre chips : segmenté', (M.segEligible(groupe([chip(),chip(),chip(),chip()]))||[]).length, 4);
  v('⛔ CINQ chips : PAS de segmenté (le curseur sauterait de ligne en ligne)',
    M.segEligible(groupe([chip(),chip(),chip(),chip(),chip()])), null);
  v('⛔ UN seul chip : pas de segmenté (il n\'y a rien à choisir)', M.segEligible(groupe([chip()])), null);
  v('⛔ un bouton d\'action dans le groupe : pas de segmenté',
    M.segEligible(groupe([chip(),chip(),faux(['btn'])])), null);
  v('le maximum est quatre', M.SEG_MAX, 4);
  /* ⛔⛔ LE PIÈGE QUI A COÛTÉ : le curseur est un ENFANT du groupe. */
  v('⛔⛔ LE CURSEUR N\'EST PAS UN ENFANT ÉTRANGER — sinon segInit se défait au second passage',
    (M.segEligible(groupe([faux(['seg-cur']),chip(),chip()]))||[]).length, 2);
  v('   … même avec quatre chips', (M.segEligible(groupe([faux(['seg-cur']),chip(),chip(),chip(),chip()]))||[]).length, 4);
  v('   … et un curseur PLUS un bouton étranger reste refusé',
    M.segEligible(groupe([faux(['seg-cur']),chip(),chip(),faux(['btn'])])), null);
}

console.log('\n══ 2. CE QUI EST GARDÉ DANS LE CODE ══\n');
const NU=APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm,' ').replace(/^[ \t]*\/\/.*$/gm,' ');
const corps=(nom)=>{ const i=NU.indexOf('function '+nom+'('); if(i<0) return '';
  const bornes=['\nfunction ','\nviews.','\nconst ','\nlet ','\nasync function ']
    .map(b=>NU.indexOf(b,i+10)).filter(x=>x>0);
  const j=bornes.length?Math.min(...bornes):-1;
  return NU.slice(i, j<0? i+2600 : j); };
{ const i=corps('segInit');
  vrai('⛔ un groupe non éligible est NETTOYÉ (classe et curseur retirés)',
    /classList\.remove\('seg-on'\)/.test(i) && /\.remove\(\)/.test(i));
  vrai('⛔ les écouteurs ne s\'empilent pas (drapeau)', /g\._seg/.test(i));
  vrai('⛔ l\'écouteur est en CAPTURE, pour passer avant l\'onclick de la vue', /\},true\)/.test(i));
  const po=corps('segPoser');
  vrai('⛔ le curseur est un ENFANT du groupe (pas un élément flottant qui se décalerait au défilement)',
    /g\.insertBefore\(cur,g\.firstChild\)/.test(po));
  vrai('⛔ un groupe sans chip actif cache son curseur au lieu de le laisser n\'importe où',
    /if\(!actif\)/.test(po) && /opacity='0'/.test(po));
  vrai('⛔ une largeur nulle (groupe caché) ne pose pas un curseur à zéro', /!rg\.width\|\|!ra\.width/.test(po));
  vrai('le premier placement ne s\'anime pas', /cur\.style\.transition = anime \? '' : 'none'/.test(po));
  vrai('⛔ le gabarit se pose APRÈS l\'écriture de l\'écran, jamais depuis go()',
    /multiProposer\(view\); \}catch\(_e\)\{\}[\s\S]{0,220}segInit\(\$\('content'\)\)/.test(NU) && !/segInit\(/.test(corps('go')));
  vrai('un redimensionnement replace les curseurs, sans les animer',
    /window\.addEventListener\('resize',segRepositionner\)/.test(NU));
}

console.log('\n══ 3. LE STYLE ══\n');
{ const titre='LE GABARIT DES LISTES — un seul pour les vingt-cinq (point 3 de la refonte)';
  const i0=APP.indexOf(titre);
  vrai('⛔ le bloc de style est trouvé (sinon tout ce qui suit est creux)', i0>0);
  /* ⛔ Borner au bloc SUIVANT, pas à `</style>` : une tranche qui va jusqu'à la fin de la
     feuille avale tout ce qu'on écrira plus bas. Déjà payé sur test-750 et test-751. */
  const suivant=APP.indexOf('/* ══', i0+titre.length), style=APP.indexOf('</style>', i0);
  const fin=(suivant>0&&(style<0||suivant<style))?suivant:style;
  const css=i0>0?APP.slice(i0, fin>0?fin:i0+9000):'';
  v('   … et il a de la matière', css.length>2000, true);
  vrai('⛔ le curseur est à top:0 (un top non nul s\'ajoute à la transformation)',
    /position:absolute;top:0;left:0/.test(css));
  vrai('la durée est celle de la maquette', /transition:transform \.42s cubic-bezier\(\.32,\.72,0,1\)/.test(css));
  vrai('⛔ rien ne s\'applique sans la classe posée par segEligible',
    /html\[data-refonte\] \.filters\.seg-on\{/.test(css));
  vrai('⛔ 44 px sous le doigt sur téléphone', /min-height:44px/.test(css));
  vrai('⛔ les trois formes de ligne relevées au navigateur sont couvertes',
    /\.pl-row\{min-height:64px\}/.test(css) && /\.tbl\.list-tbl tbody tr\{min-height:64px\}/.test(css)
    && /\.tbl tr\.row-clk\{min-height:64px\}/.test(css));
  vrai('⛔ la recherche vise la CLASSE partagée, mesurée, pas une structure supposée',
    /html\[data-refonte\] input\.search-inp\{/.test(css));
  vrai('… et aussi les champs écrits à la main, reconnus par leur invite',
    /input\[placeholder\^="Rechercher"\]/.test(css));
  vrai('⛔ le mouvement réduit fait SAUTER le curseur au lieu de le faire glisser',
    /prefers-reduced-motion: reduce/.test(css));
  vrai('Windows reprend ses coins droits', /html\[data-os="windows"\] \.filters\.seg-on/.test(css));
  const sansGarde=css.split('}').filter(r=>{ const sel=r.slice(0,r.indexOf('{')).trim();
    if(!sel||/^@/.test(sel)||/^from|^to/.test(sel)) return false;
    if(sel.indexOf('/*')>=0||sel.indexOf('*')===0) return false;
    return sel.indexOf('html[')<0;
  });
  v('⛔⛔ AUCUNE règle du bloc ne touche un écran sans passer par un attribut',
    sansGarde.map(r=>r.slice(0,50).trim()).filter(Boolean), []);
}

console.log('\n═══ test-753 : '+ok+' ✓ '+ko+' ✗ ═══\n');
process.exit(ko?1:0);

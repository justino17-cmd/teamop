/* ══ REFONTE POINT 5 — L'ÉCRAN DE CONNEXION ═══════════════════════════════════════════════
   Dossier de refonte : « logo 84 px radius 20, OP GESTION, pastille ✓ <Entreprise> · lien
   vérifié (l'entreprise vient du LIEN, il n'y a pas de champ Entreprise), carte verre
   Identifiant / Mot de passe, bouton accent. Bureau : colonne centrée 380 px. Étape 2
   Première connexion → fondu (opacity + scale 1.04, .45–.55 s) + toast de bienvenue. »

   ⛔ LE CHAMP ENTREPRISE N'EST PAS SUPPRIMÉ — IL EST DÉJÀ ABSENT QUAND IL DOIT L'ÊTRE, et il
   reste là quand il DOIT rester. Le dossier dit « il n'y a pas de champ Entreprise » : vrai du
   chemin normal (appareil rattaché par un lien d'invitation). Mais un appareil ORPHELIN doit
   pouvoir nommer la sienne, et surtout le SAVOIR — sans ça quelqu'un travaille dans une base
   que son équipe ne verra jamais. C'est le défaut que Justin a vu de ses yeux le 15 septembre
   2026 (« c'est quoi cette page, je trouve ça pas bien »), et l'avertissement qui le répare a
   passé des MOIS sans s'afficher parce qu'il vivait dans la mauvaise branche. On ne le retire
   pas pour faire ressembler l'écran à une image.

   ⚠️ Sur la BÊTA, `beta-build.js` retire ce champ exprès : identifiant et mot de passe viennent
   de la Tour, rien d'autre. Deux règles différentes pour deux canaux, toutes les deux voulues.

   ⚠️ Les pixels (84/20, 380 px, verre, fondu de .5 s) sont mesurés au navigateur —
   `scratchpad/sonde-login.js`, 22 ✓.                                                        */
const fs=require('fs');
const APP=fs.readFileSync(__dirname+'/../app.html','utf8');
const BUILD=fs.readFileSync(__dirname+'/../beta-build.js','utf8');
let ok=0,ko=0;
const v=(t,a,b)=>{ if(JSON.stringify(a)===JSON.stringify(b)){ok++;console.log('  ✓ '+t);}
  else {ko++;console.log('  ✗ '+t+'\n      attendu : '+JSON.stringify(b)+'\n      obtenu  : '+JSON.stringify(a));} };
const vrai=(t,c)=>v(t,!!c,true);
const NU=APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm,' ').replace(/^[ \t]*\/\/.*$/gm,' ');

console.log('\n══ 1. ⛔ LES DEUX BRANCHES DE L\'ENTREPRISE ══\n');
{ const i=NU.indexOf('function renderLogin(');
  const bornes=['\nfunction ','\nasync function '].map(b=>NU.indexOf(b,i+10)).filter(x=>x>0);
  const c=NU.slice(i, bornes.length?Math.min(...bornes):i+20000);
  vrai('`renderLogin` existe', c.length>0);
  vrai('⛔ RATTACHÉ : aucun champ Entreprise — il est sous `_surEspace?\'\':…`',
    /\$\{_surEspace\?'':`<div class="field"><label>Entreprise/.test(c));
  vrai('⛔ NON RATTACHÉ : l\'avertissement d\'orphelin, et il est FRÈRE de la branche, pas son enfant',
    /\$\{\(!_surEspace&&!BETA_ESSAI\)\?`<div id="li-orphelin"/.test(c));
  vrai('⛔ la pastille nomme l\'entreprise du lien', /id="li-entnom"/.test(c));
  vrai('⛔ … et dit « Lien vérifié » quand le lien a été reconnu',
    /elan_lien_ok'\)\?`<div[^`]*Lien vérifié/.test(c));
  /* ⛔ Le garde-fou qui compte : l'avertissement ne doit JAMAIS retomber dans la branche
     « cet appareil EST sur un espace » — il y a vécu des mois sans s'afficher une seule fois. */
  const iOrph=c.indexOf('id="li-orphelin"'), iEnt=c.indexOf('id="li-entnom"');
  vrai('⛔⛔ l\'avertissement est APRÈS la pastille, donc hors de sa branche', iOrph>iEnt && iEnt>0);
}
{ vrai('⛔ la bêta retire le champ EXPRÈS, et le build échoue s\'il ne le trouve plus',
    /const ENT_AVANT =/.test(BUILD) && /le champ Entreprise de la connexion est introuvable/.test(BUILD));
}

console.log('\n══ 2. L\'ENTRÉE DANS L\'APPLICATION ══\n');
{ const i=NU.indexOf('function enterApp(');
  const bornes=['\nfunction ','\nasync function '].map(b=>NU.indexOf(b,i+10)).filter(x=>x>0);
  const c=NU.slice(i, bornes.length?Math.min(...bornes):i+20000);
  vrai('⛔ l\'application entre en FONDU (classe posée)', /classList\.add\('op-entree'\)/.test(c));
  vrai('⛔ … relancée à chaque connexion (on retire, on force un reflow, on repose)',
    /classList\.remove\('op-entree'\); void _r\.offsetWidth/.test(c));
  vrai('⛔⛔ … et la classe se RETIRE à la fin, avec un FILET quand il n\'y a pas d\'animation',
    /animationend/.test(c) && /setTimeout\(\(\)=>_r\.classList\.remove\('op-entree'\),900\)/.test(c));
  vrai('⛔ l\'accueil NOMME la personne', /Bienvenue, '\+_p/.test(c));
  vrai('   … et ne dit rien s\'il n\'a pas de prénom (pas de « Bienvenue,  »)', /if\(_p\)/.test(c));
}

console.log('\n══ 3. LE STYLE ══\n');
{ const titre="L'ÉCRAN DE CONNEXION — par lien d'invitation (point 5 de la refonte)";
  const i0=APP.indexOf(titre);
  vrai('⛔ le bloc de style est trouvé (sinon tout ce qui suit est creux)', i0>0);
  const suivant=APP.indexOf('/* ══', i0+titre.length), style=APP.indexOf('</style>', i0);
  const fin=(suivant>0&&(style<0||suivant<style))?suivant:style;
  /* ⛔ CSS NU : ce dépôt commente au-dessus de ses règles, un motif y trouve toujours sa phrase. */
  const css=(i0>0?APP.slice(i0, fin>0?fin:i0+9000):'').replace(/\/\*[\s\S]*?\*\//g,' ');
  v('   … et il a de la matière', css.length>900, true);
  vrai('⛔⛔ le logo porte `!important` — une règle de la refonte pose déjà 22 px !important, et sans lui le rayon de la maquette ne sort pas',
    /\.login-logo\{[\s\S]{0,140}border-radius:20px!important/.test(css));
  vrai('   84 px', /width:84px!important;height:84px!important/.test(css));
  vrai('la pastille est une pilule d\'au moins 40 px', /#li-entnom\{[\s\S]{0,200}min-height:40px/.test(css));
  vrai('le bouton principal fait 48 px', /min-height:48px;border-radius:var\(--r-pill,999px\)/.test(css));
  vrai('la carte passe au verre sur un appareil Apple récent', /html\[data-verre="1"\] \.login-card\{/.test(css));
  vrai('⛔ … et redevient pleine si la transparence est réduite', /prefers-reduced-transparency: reduce/.test(css));
  vrai('⛔⛔ AUCUN onglet ni bouton flottant sous l\'écran de connexion',
    /\.login\[style\*="flex"\] ~ #app-root \.tabbar/.test(css) && /\.msg-flot\{display:none!important\}/.test(css));
  vrai('le fondu est celui de la maquette (scale 1.04, .5 s)',
    /@keyframes opEntree\{ from\{opacity:0;transform:scale\(1\.04\)\}/.test(css) && /animation:opEntree \.5s/.test(css));
  vrai('⛔ le mouvement réduit raccourcit et supprime l\'échelle', /prefers-reduced-motion: reduce/.test(css) && /transform:none!important/.test(css));
  vrai('Windows reprend ses coins droits', /html\[data-os="windows"\] \.login-card/.test(css));
}

console.log('\n═══ test-755 : '+ok+' ✓ '+ko+' ✗ ═══\n');
process.exit(ko?1:0);

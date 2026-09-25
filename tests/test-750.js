/* ══ v705 — SAVOIR QUI NOUS LIT, ET NE JAMAIS FAIRE SEMBLANT ═══════════════════════════════
   Demande de Justin, 21 septembre 2026 : « c'est à nous de détecter les versions qui
   utilisent l'application. Que ce soit iPhone, Mac, Windows, Android, version web, c'est à
   nous de savoir. »

   Ce fichier fait tourner les VRAIES fonctions de détection extraites d'app.html sur des
   agents utilisateurs RÉELS — un agent inventé ne prouve que la capacité à relire ce qu'on
   vient d'écrire. Quatre pièges y sont gardés, et les quatre ont déjà coûté à quelqu'un :

   1. ⛔ L'ORDRE DE LECTURE. Edge contient « Chrome », Chrome contient « Safari ». Écrite dans
      l'autre sens, la détection rend « Safari » pour la Terre entière — et allumerait donc le
      verre sur un Windows.
   2. ⛔ L'iPad SE DIT « Macintosh » depuis iPadOS 13. C'est le tactile qui le trahit, pas
      l'agent. Sans ça, une tablette recevrait le rendu bureau : sidebar permanente, pas de
      barre d'onglets, cibles à la souris.
   3. ⛔ LA VERSION DE macOS N'EST PAS LISIBLE. Safari annonce « Mac OS X 10_15_7 » depuis Big
      Sur, pour toujours, et Chrome recopie le même mensonge. On rend 0 — et 0 veut dire
      « on ne sait pas », jamais « vieux ». Pareil pour Windows 10 contre 11.
   4. ⛔ LE VERRE SE DÉCIDE SUR SAFARI, PAS SUR L'OS. Liquid Glass arrive avec Safari 26 :
      c'est le seul signal vrai. Un Chrome sur Mac ne le rend pas, un « je ne sais pas » ne
      l'allume pas.

   ⚠️ Ce banc ne voit pas si le flou est PEINT : ça se mesure au navigateur
   (`scratchpad/sonde-plateforme.js`, 65 contrôles, backdrop-filter relevé sur une vraie
   carte). Il garde la DÉCISION.                                                            */
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

const CODE=['const PLAT_CLE=','const PLATS={','function opAutonome(){','function opOS(){','function opNavigateur(){',
  'function opSafariVer(){','function opOSVer(){','function opPlatMesure(){','function opPlatForce(){','function opPlat(){']
  .map(h=>decoupe(h)).join('\n');

/* On rejoue un navigateur : agent, tactile, mode installé. Rien d'autre n'est simulé —
   ces quatre fonctions ne lisent rien d'autre. */
const monter=(ua,tactile,autonome,force)=>new Function('ua','touch','standalone','force',`
  const navigator={userAgent:ua, maxTouchPoints:touch, standalone:standalone};
  const window={matchMedia:()=>({matches:false})};
  const matchMedia=window.matchMedia;
  const localStorage={getItem:k=>force||null,setItem(){},removeItem(){}};
  let _platHaute=null;
  ${CODE}
  return { opOS, opNavigateur, opSafariVer, opOSVer, opAutonome, opPlatMesure, opPlat, PLATS };
`)(ua,tactile,autonome,force);

/* ⛔ DES AGENTS RÉELS. Copiés depuis de vrais navigateurs, pas écrits pour passer le banc. */
const A={
  iphone26: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  iphone17: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  iphoneCr: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/128.0.6613.98 Mobile/15E148 Safari/604.1',
  mac26:    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
  mac17:    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  macChrome:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  android:  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  samsung:  'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
  edge:     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0',
  winChrome:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  firefox:  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
  ipad:     'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
};
const VERRE={ios27:1,iosweb:1,macos27:1,macweb:1,ios18:0,android:0,androidweb:0,macos14:0,windows:0,winweb:0};

console.log('\n══ 1. LE SYSTÈME, POUR CHAQUE AGENT RÉEL ══\n');
[['iphone26','ios',5],['iphone17','ios',5],['iphoneCr','ios',5],['mac26','macos',0],['mac17','macos',0],
 ['macChrome','macos',0],['android','android',5],['samsung','android',5],['edge','windows',0],
 ['winChrome','windows',0],['firefox','windows',0]].forEach(([k,att,t])=>{
  v(k+' → '+att, monter(A[k],t,false).opOS(), att); });

console.log('\n══ 2. ⛔ L\'ORDRE DE LECTURE DES NAVIGATEURS ══\n');
v('⛔ Edge (qui contient « Chrome » ET « Safari »)', monter(A.edge,0,false).opNavigateur(), 'edge');
v('⛔ Chrome (qui contient « Safari »)', monter(A.winChrome,0,false).opNavigateur(), 'chrome');
v('⛔ Samsung Internet (qui contient « Chrome » ET « Safari »)', monter(A.samsung,5,false).opNavigateur(), 'samsung');
v('   Safari, le vrai', monter(A.mac26,0,false).opNavigateur(), 'safari');
v('   Firefox', monter(A.firefox,0,false).opNavigateur(), 'firefox');
v('   Chrome sur iPhone (CriOS)', monter(A.iphoneCr,5,false).opNavigateur(), 'chrome');

console.log('\n══ 3. ⛔ L\'iPAD SE DIT « MACINTOSH » ══\n');
v('⛔ le tactile le trahit', monter(A.ipad,5,false).opOS(), 'ios');
v('   un vrai Mac (aucun point de contact) reste un Mac', monter(A.mac26,0,false).opOS(), 'macos');
v('   … et un Mac à écran tactile n\'existe pas, mais s\'il existait il serait mobile : assumé',
  monter(A.ipad,5,false).opPlatMesure().plat.indexOf('ios'), 0);

console.log('\n══ 4. ⛔ CE QU\'ON NE SAIT PAS, ON NE L\'INVENTE PAS ══\n');
{ const m=monter(A.mac26,0,false);
  v('⛔ la version de macOS rend 0 (Safari ment depuis Big Sur)', m.opOSVer(), 0);
  v('⛔ … et l\'écran le DIT au lieu d\'afficher un chiffre', m.opPlatMesure().sur.slice(0,8), 'inconnue');
  v('   la version de SAFARI, elle, se lit', m.opSafariVer(), 26); }
{ const w=monter(A.edge,0,false);
  v('⛔ Windows 10 et 11 sont indiscernables : 0, pas « 10 »', w.opOSVer(), 0);
  v('   … et l\'écran le dit', w.opPlatMesure().sur.slice(0,8), 'inconnue'); }
v('   la version d\'iOS, elle, se lit', monter(A.iphone26,5,false).opOSVer(), 26);
v('   celle d\'Android aussi', monter(A.android,5,false).opOSVer(), 14);
v('   un agent sans version ne fabrique pas de chiffre', monter('Mozilla/5.0',0,false).opOSVer(), 0);

console.log('\n══ 5. ⛔⛔ LE VERRE — SAFARI 26, ET RIEN D\'AUTRE ══\n');
const verreDe=(ua,t,auto)=>VERRE[monter(ua,t,auto).opPlatMesure().plat];
v('⛔ iPhone Safari 26 : verre', verreDe(A.iphone26,5,false), 1);
v('⛔ iPhone Safari 17 : PAS de verre', verreDe(A.iphone17,5,false), 0);
v('⛔ iPhone Chrome : PAS de verre (ce n\'est pas Safari)', verreDe(A.iphoneCr,5,false), 0);
v('⛔ Mac Safari 26 : verre', verreDe(A.mac26,0,false), 1);
v('⛔ Mac Safari 17 : PAS de verre', verreDe(A.mac17,0,false), 0);
v('⛔ Mac Chrome : PAS de verre', verreDe(A.macChrome,0,false), 0);
v('⛔ Android : jamais de verre', verreDe(A.android,5,false), 0);
v('⛔ Windows Edge : jamais de verre', verreDe(A.edge,0,false), 0);
v('⛔ Firefox Windows : jamais de verre', verreDe(A.firefox,0,false), 0);
v('⛔ un agent inconnu ne reçoit AUCUN verre (le doute n\'allume rien)', verreDe('Mozilla/5.0',0,false), 0);

console.log('\n══ 6. INSTALLÉE OU DANS UN ONGLET ══\n');
v('iPhone Safari 26 installée → ios27', monter(A.iphone26,5,true).opPlatMesure().plat, 'ios27');
v('iPhone Safari 26 dans un onglet → iosweb', monter(A.iphone26,5,false).opPlatMesure().plat, 'iosweb');
v('Mac Safari 26 installée → macos27', monter(A.mac26,0,true).opPlatMesure().plat, 'macos27');
v('Mac Safari 26 dans un onglet → macweb', monter(A.mac26,0,false).opPlatMesure().plat, 'macweb');
v('Android installée → android', monter(A.android,5,true).opPlatMesure().plat, 'android');
v('Android dans un onglet → androidweb', monter(A.android,5,false).opPlatMesure().plat, 'androidweb');
v('Windows installée → windows', monter(A.edge,0,true).opPlatMesure().plat, 'windows');
v('Windows dans un onglet → winweb', monter(A.edge,0,false).opPlatMesure().plat, 'winweb');
v('⛔ un Linux retombe sur des surfaces pleines, jamais sur rien',
  VERRE[monter('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',0,false).opPlatMesure().plat], 0);

console.log('\n══ 7. LE FORÇAGE — ÉPROUVER SANS MENTIR ══\n');
{ const dix=monter(A.android,5,false).PLATS;
  v('⛔ dix rendus, ceux de la maquette', Object.keys(dix).length, 10);
  v('   … et ils portent tous un libellé', Object.values(dix).filter(x=>!x.lbl).length, 0);
  const f=monter(A.android,5,false,'macos27').opPlat();
  v('⛔ le forçage change le rendu', f.plat, 'macos27');
  v('⛔ … SANS effacer la mesure (les deux s\'affichent côte à côte)', f.mesure, 'androidweb');
  v('   et le rendu n\'est plus annoncé comme « détecté »', f.detecte, false);
  const z=monter(A.android,5,false,'nimportequoi').opPlat();
  v('⛔ un forçage inconnu est IGNORÉ, il ne casse pas l\'écran', z.plat, 'androidweb');
  v('   … et le rendu redevient « détecté »', z.detecte, true); }

console.log('\n══ 7 bis. ⛔ LE VERRE EST POSÉ SUR LES DIX RENDUS — la VRAIE fonction, jouée ══\n');
/* ⛔ Le texte ne suffit pas : une mutation qui remettait « if(d.verre) » devant la pose passait
   un motif écrit sur la forme (mesuré le 24 septembre 2026). On JOUE donc `opPlatAppliquer` sur
   un faux <html>, pour les dix rendus forcés, et on lit ce qu'elle a posé. */
{
  const APPL=decoupe('function opPlatAppliquer(){');
  vrai('⛔ opPlatAppliquer est trouvée', APPL.length>300, APPL.length+' caractères');
  const poser=(force)=>new Function('ua','force',`
    const navigator={userAgent:ua, maxTouchPoints:0, standalone:false};
    const window={matchMedia:()=>({matches:false})}; const matchMedia=window.matchMedia;
    const localStorage={getItem:k=>force||null,setItem(){},removeItem(){}};
    let _platHaute=null;
    const attrs={}; const document={documentElement:{setAttribute:(k,v)=>{attrs[k]=String(v);},removeAttribute:k=>{delete attrs[k];}}};
    ${CODE}
    ${APPL}
    opPlatAppliquer(); return attrs;`)(A.winChrome,force);
  let n=0;
  for (const k of Object.keys(VERRE)) {
    const a=poser(k); n++;
    v('rendu '+k.padEnd(10)+' : le verre est posé (thème final, dix plateformes)', a['data-verre'], '1');
    v('   … et « natif » '+(VERRE[k]?'posé':'absent'), a['data-verre-natif']||null, VERRE[k]?'1':null);
  }
  vrai('⛔ les dix rendus ont été joués (un zéro sur rien ne prouve rien)', n===10);
}

console.log('\n══ 8. CE QUI EST GARDÉ DANS LE TEXTE ══\n');
const NU=APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm,' ').replace(/^[ \t]*\/\/.*$/gm,' ');
{ vrai('⛔ le rendu forcé vit sur l\'APPAREIL (localStorage), jamais dans db',
    /localStorage\.setItem\(PLAT_CLE/.test(NU) && !/db\.[a-zA-Z]*\s*=\s*PLAT_CLE/.test(NU));
  vrai('⛔ les attributs sont posés AVANT le premier rendu (sinon l\'écran saute)',
    /opPlatAppliquer\(\);\s*opPlatHaute\(\);[\s\S]{0,120}applyTheme\(\);/.test(NU));
  const ap=NU.slice(NU.indexOf('function opPlatAppliquer(){'), NU.indexOf('function opPlatAppliquer(){')+900);
  ['data-plat','data-os','data-kind','data-verre','data-nav','data-autonome'].forEach(a=>
    vrai('   <html> porte '+a, ap.indexOf("'"+a+"'")>=0));
  /* ⛔ THÈME FINAL (24 septembre 2026) : le verre est sur les DIX plateformes — décision de
     Justin (`design/THEME-REFERENCE.md` § 0). `data-verre` est donc toujours posé ; ce qui se
     retire, c'est `data-verre-natif` (le Liquid Glass de Safari 26, qui ne choisit plus que les
     rayons). Un attribut fantôme resterait là quand on force un autre rendu. */
  vrai('⛔ le verre est posé sur TOUTES les plateformes (thème final)',
    /r\.setAttribute\('data-verre','1'\);\s*if\(d\.verre\)/.test(ap));
  vrai('⛔ … et la marque « natif » se RETIRE quand elle ne s\'applique pas (pas d\'attribut fantôme)',
    /removeAttribute\('data-verre-natif'\)/.test(ap));
}
{ /* ⛔ Le CSS est du TEXTE pour ce banc : ce qu'on garde, c'est que RIEN ne s'applique sans
     attribut — un appareil non reconnu doit retrouver exactement le rendu d'avant.
     ⚠️ ET ON VÉRIFIE D'ABORD QU'ON A TROUVÉ LE BLOC. La première version de ce contrôle
     cherchait l'ancre avec une apostrophe typographique là où le code en porte une droite :
     indexOf rendait -1, la tranche était VIDE, et « toutes les règles sont gardées » passait
     au vert sur du néant. Une assertion sur un ensemble vide ne prouve rien. */
/* ⛔ ON RETIRE LES COMMENTAIRES DE LA TRANCHE AVANT DE CHERCHER. Ce dépôt écrit de longues
   explications juste AU-DESSUS des règles qu'elles expliquent : un motif y trouve presque
   toujours ce qu'il cherche, et garde alors une PHRASE, pas un comportement. On ne cherche
   donc que dans le CSS nu. */
/* ⛔ UNE TRANCHE BORNÉE PAR `</style>` AVALE TOUT CE QU'ON AJOUTE APRÈS ELLE. Ce banc a viré
   au rouge le jour où les blocs « ＋ Créer » et « gabarit des listes » ont été écrits plus bas
   dans la MÊME feuille : la tranche les emportait, et leurs règles (`.tab`, `.creer-t`…)
   passaient pour des règles non gardées de CE bloc-ci. C'est la troisième forme du même piège
   — une découpe qui déborde rend toujours un verdict faux. On borne donc au DÉBUT du bloc
   suivant, repéré par son bandeau. */
const blocCss = (titre) => {
  const i0 = APP.indexOf(titre);
  if (i0 < 0) return { i0, css: '' };
  const suivant = APP.indexOf('/* \u2550\u2550', i0 + titre.length);
  const style = APP.indexOf('</style>', i0);
  const fin = (suivant > 0 && (style < 0 || suivant < style)) ? suivant : style;
  const brut = APP.slice(i0, fin > 0 ? fin : i0 + 9000);
  return { i0, css: brut.replace(/\/\*[\s\S]*?\*\//g, ' ') };
};
  const {i0, css} = blocCss('PLATEFORME — le rendu suit l\'appareil');
  vrai('⛔ le bloc de style de la plateforme est bien trouvé (sinon tout ce qui suit est creux)', i0>0);
  v('   … et il a de la matière', css.length>3000, true);
  vrai('le verre est écrit', /backdrop-filter:var\(--vr-flou\)/.test(css));

  /* Chaque règle qui floute doit être gardée. On découpe le bloc en règles (sur « } ») et on
     regarde le SÉLECTEUR de celles qui portent un backdrop-filter. */
  const reglesFloues=css.split('}').filter(r=>/backdrop-filter\s*:/.test(r) && !/backdrop-filter\s*:\s*none/.test(r));
  v('   il y a bien des règles de flou à contrôler', reglesFloues.length>0, true);
  const nonGardees=reglesFloues.filter(r=>{
    const sel=r.slice(0, r.indexOf('{'));
    return sel.indexOf('data-verre')<0;
  });
  v('⛔⛔ AUCUNE règle de flou n\'échappe à data-verre', nonGardees.map(r=>r.slice(0,60).trim()), []);

  vrai('⛔ la transparence réduite éteint le flou', /prefers-reduced-transparency: reduce/.test(css));
  vrai('⛔ le mouvement réduit arrête les orbes', /prefers-reduced-motion: reduce/.test(css));
  vrai('Android a ses 28 px', /html\[data-os="android"\]\{[\s\S]{0,400}--rf-r-carte:28px/.test(css));
  vrai('Windows a ses 8 px', /html\[data-os="windows"\]\{[\s\S]{0,400}--rf-r-carte:8px/.test(css));
  vrai('Windows n\'a pas de pilule sur ses boutons', /data-os="windows"\]\[data-refonte\] \.btn\{border-radius:6px/.test(css));
  vrai('⛔ ON NE DESSINE PAS de barre d\'adresse (le navigateur a la sienne)',
    !/barre-safari|fausse-barre|chrome-url/.test(css));
  /* Le contre-essai qui compte : une règle SANS attribut toucherait tout le monde. */
  const sansGarde=css.split('}').filter(r=>{ const sel=r.slice(0,r.indexOf('{')).trim();
    return sel && !/^@/.test(sel) && !/^\s*$/.test(sel) && sel.indexOf('html[')<0 && sel.indexOf('@keyframes')<0 && !/^from|^to|^\s*\//.test(sel); });
  v('⛔⛔ AUCUNE règle du bloc ne s\'applique sans un attribut de plateforme',
    sansGarde.map(r=>r.slice(0,50).trim()).filter(x=>x && !x.startsWith('/*') && !x.startsWith('*')), []);
}
/* ⛔ NEUF DEPUIS LE 22 SEPTEMBRE 2026, PAS HUIT. `design/THEME-REFERENCE.md` en nomme huit
   (avec `graphite`, que nous n'avions pas) ; on l'a ajouté SANS retirer `red`, qui n'y figure
   pas — retirer une teinte que quelqu'un a peut-être choisie laisserait `--acc-src` vide, donc
   tuerait les treize jetons dérivés. C'est la panne du 11 au 22 septembre, à l'envers.
   Les valeurs, elles, sont celles du document : `tests/test-759.js` relit le document. */
{ vrai('⛔ douze teintes : les onze de la maquette, plus le rouge qu’on ne retire pas',
    (NU.match(/const ACCENTS = \{[^}]*\}/)||[''])[0].split(':').length-1===12);
  ['teal','indigo','pink','red'].forEach(k=>
    vrai('   la teinte « '+k+' » existe en nuit ET en jour',
      new RegExp('html\\[data-accent="'+k+'"\\]').test(NU) &&
      new RegExp('html\\[data-theme="light"\\]\\[data-accent="'+k+'"\\]').test(NU)));
  /* ⛔ LE DÉFAUT CHANGE, ET C'EST UNE DÉCISION DE JUSTIN : le thème final dit « thème TEAM OP
     par défaut », et la teinte par défaut est celle du thème. Qui a CHOISI une teinte la garde
     (elle est rangée) ; qui n'a rien choisi suit le thème. */
  vrai('⛔ sans choix, la teinte est celle du thème (TEAM OP par défaut)',
    /getAccent\(\)\{ return prefLocalLire\('elan_accent'\)\|\|MARQUES\[getMarque\(\)\]\.accent/.test(NU)
    && /function getMarque\(\)\{[^}]*return MARQUES\[m\]\?m:'teamop'/.test(NU));
}

console.log('\n═══ test-750 : '+ok+' ✓ '+ko+' ✗ ═══\n');
process.exit(ko?1:0);

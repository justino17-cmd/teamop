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

console.log('\n══ 8. CE QUI EST GARDÉ DANS LE TEXTE ══\n');
const NU=APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm,' ').replace(/^[ \t]*\/\/.*$/gm,' ');
{ vrai('⛔ le rendu forcé vit sur l\'APPAREIL (localStorage), jamais dans db',
    /localStorage\.setItem\(PLAT_CLE/.test(NU) && !/db\.[a-zA-Z]*\s*=\s*PLAT_CLE/.test(NU));
  vrai('⛔ les attributs sont posés AVANT le premier rendu (sinon l\'écran saute)',
    /opPlatAppliquer\(\);\s*opPlatHaute\(\);[\s\S]{0,120}applyTheme\(\);/.test(NU));
  const ap=NU.slice(NU.indexOf('function opPlatAppliquer(){'), NU.indexOf('function opPlatAppliquer(){')+900);
  ['data-plat','data-os','data-kind','data-verre','data-nav','data-autonome'].forEach(a=>
    vrai('   <html> porte '+a, ap.indexOf("'"+a+"'")>=0));
  vrai('⛔ le verre se RETIRE quand il ne s\'applique pas (pas d\'attribut fantôme)',
    /removeAttribute\('data-verre'\)/.test(ap));
}
{ /* ⛔ Le CSS est du TEXTE pour ce banc : ce qu'on garde, c'est que RIEN ne s'applique sans
     attribut — un appareil non reconnu doit retrouver exactement le rendu d'avant.
     ⚠️ ET ON VÉRIFIE D'ABORD QU'ON A TROUVÉ LE BLOC. La première version de ce contrôle
     cherchait l'ancre avec une apostrophe typographique là où le code en porte une droite :
     indexOf rendait -1, la tranche était VIDE, et « toutes les règles sont gardées » passait
     au vert sur du néant. Une assertion sur un ensemble vide ne prouve rien. */
  const i0=APP.indexOf('PLATEFORME — le rendu suit l\'appareil');
  vrai('⛔ le bloc de style de la plateforme est bien trouvé (sinon tout ce qui suit est creux)', i0>0);
  /* ⚠️ Borner à la fin de la feuille : une tranche « i0+7000 » dépassait `</style>` et
     rapportait du HTML comme si c'était une règle. Une découpe qui déborde ment toujours. */
  const fin=APP.indexOf('</style>', i0);
  const css=i0>0?APP.slice(i0, fin>0?fin:i0+7000):'';
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
{ vrai('⛔ huit teintes, comme la maquette', (NU.match(/const ACCENTS = \{[^}]*\}/)||[''])[0].split(':').length-1===8);
  ['teal','indigo','pink','red'].forEach(k=>
    vrai('   la teinte « '+k+' » existe en nuit ET en jour',
      new RegExp('html\\[data-accent="'+k+'"\\]').test(NU) &&
      new RegExp('html\\[data-theme="light"\\]\\[data-accent="'+k+'"\\]').test(NU)));
  vrai('⛔ le vert OP reste le défaut (personne ne voit sa couleur changer)',
    /getAccent\(\)\{ return localStorage\.getItem\('elan_accent'\)\|\|'green'/.test(NU));
}

console.log('\n═══ test-750 : '+ok+' ✓ '+ko+' ✗ ═══\n');
process.exit(ko?1:0);

/* ══ v747 — « LES COULEURS EN DESSOUS, JE VEUX QU'ELLES MARCHENT » ═══════════════════════════
   Justin, 25 septembre 2026, sur son iPhone : toucher Bleu, Rose… sous « Teinte
   d'accentuation » ne changeait RIEN — même le « + Créer » gardait son ancienne couleur. Le
   navigateur de test disait que tout marchait. Rejoué sur la bêta PUBLIÉE (746), agent Safari
   d'iPhone, vrais touchers (`scratchpad/sonde-teintes-iphone.js`) : trois chemins mènent
   exactement à « rien ne change », et aucun ne se voit d'un navigateur au rangement vide et
   sans synchro :
   1. LE RANGEMENT PLEIN. Il est partagé par toute l'origine teamop.fr (la base d'app.html,
      celle de la bêta, la Tour) et Safari le borne à 5 Mo. `localStorage.setItem` jetait à la
      PREMIÈRE ligne du geste : ni rangement, ni fiche, ni couleur, ni coche.
   2. UN ENREGISTREMENT QUI JETTE. `save()` range, puis rafraîchit l'écran, puis pousse : un
      rafraîchissement qui jette arrêtait le geste AVANT la couleur, et rien ne partait.
   3. UNE COPIE PLUS ANCIENNE DE LA FICHE. La réception donne raison au distant, fiche entière :
      un appareil qui pousse avant d'avoir reçu le choix remettait l'ancienne teinte.

   Ce banc fait tourner les VRAIES fonctions extraites d'app.html dans ces trois états, puis
   relit le câblage que l'exécution ne peut pas atteindre (la réception et l'envoi de la
   synchro vivent dans un écouteur Firestore). ⚠️ Il ne voit ni l'écran ni le doigt : la sonde
   du scratchpad touche les pastilles pour de vrai et lit le « + » de la barre du haut.       */
const fs=require('fs'); const APP=fs.readFileSync(__dirname+'/../app.html','utf8');
let ok=0,ko=0;
const v=(t,a,b)=>{ if(JSON.stringify(a)===JSON.stringify(b)){ok++;console.log('  ✓ '+t);}
  else {ko++;console.log('  ✗ '+t+'\n      attendu : '+JSON.stringify(b)+'\n      obtenu  : '+JSON.stringify(a));} };
const vrai=(t,c)=>v(t,!!c,true);
const faux=(t,c)=>v(t,!!c,false);

/* Même découpe que test-762 : jusqu'à la déclaration suivante de premier niveau, puis le PLUS
   LONG bloc qui compile. Une ancre introuvable fait TOMBER le banc, jamais une tranche vide. */
function decoupe(h){ const d=APP.indexOf(h); if(d<0) throw new Error('introuvable : '+h);
  const suite=/\n(?=(?:function |const |let |var |class |async function |\/\* |views\.|document\.|window\.|try\{))/g;
  suite.lastIndex=d+h.length;
  const m=suite.exec(APP); const fin=m?m.index:Math.min(APP.length,d+80000);
  let bout=APP.slice(d,fin);
  for(;;){ const k=Math.max(bout.lastIndexOf('}'),bout.lastIndexOf(';')); if(k<0) break;
    const t=bout.slice(0,k+1);
    try{ new Function(t); return t; }catch(e){ bout=bout.slice(0,k); } }
  throw new Error('fin introuvable : '+h); }

const CODE=['const PREF_CLES=','const _prefVue={};','function prefLocal(k,v){','function prefLocalLire(k){',
  'let _prefPleinDit=false;','function prefRangementPlein(k,e){','function rangementMesure(){',
  'function prefEcrire(cle,val){','function prefGarder(cle,val){','function prefAppliquer(u){',
  'const MARQUES = {','function getMarque(){','const THEME_LBL','const THEME_ICO','function getThemePref(){','function getAccent(){',
  'const ACCENTS = {','function setThemePref(p){','function setMarque(k){',
  'function tcMode(k){','function tcMarque(k){','function tcTeinte(k){','function setAccent(a){',
  'const ACC_PERSO_MAX=','function accentsPerso(){','function accentsPersoEcrire(l){','function setAccentCustom(hex){','function accentPersoRetirer(ev,hex){',
  'function prefFusion(gagnant,autre){','function usersFusionner(','function usersSansDoublonLogin(list){',
  /* la relecture de la v747 : les quatre autres réglages de PREF_CLES avaient la même fragilité */
  'function getLang(){','function setLang(l){','const ONGLETS_MAX','function ongletsEcrire(l){',
  'const FAV_MAX=','function favorisEcrire(l){','function mapSatOn(){','function setMapSat(on){'].map(decoupe).join('\n');

/* Un appareil : son rangement (qui peut être PLEIN), sa base, son écran. `J` note l'ordre de ce
   qui se passe — « apply:mode/thème/teinte » est ce que l'affichage LIT au moment d'appliquer. */
function bac(O){
  const J=[];
  const M=new Function('O','J',`
    const LS=Object.assign({},O.ls||{});
    const localStorage={ getItem:k=>(k in LS?LS[k]:null),
      setItem:(k,x)=>{ if(O.plein){ const e=new Error('The quota has been exceeded.'); e.name='QuotaExceededError'; throw e; } LS[k]=String(x); },
      removeItem:k=>{ delete LS[k]; }, get length(){ return Object.keys(LS).length; }, key:i=>Object.keys(LS)[i]||null };
    const signaux=[], toasts=[], minuteries=[];
    const window={ tmSignaler:(t,m,st,src)=>signaux.push({t:t,m:String(m||''),src:src||''}) };
    const toast=m=>{ toasts.push(String(m)); if(/plus de place|refuse de ranger/.test(String(m))) J.push('toast:plein'); };
    /* une minuterie PART APRÈS le geste : on les garde, et le banc les vide quand le geste est fini */
    const setTimeout=f=>{ minuteries.push(f); return minuteries.length; };
    let current='parametres';
    const views={ parametres:()=>J.push('vue'), carteInt:()=>J.push('carte:'+mapSatOn()), carteBox:()=>J.push('carte:'+mapSatOn()), planning:()=>J.push('carte:'+mapSatOn()) };
    const renderNav=()=>J.push('nav:'+getLang()+':'+(prefLocalLire('elan_favoris')||''));
    const renderOnglets=()=>J.push('onglets:'+(prefLocalLire('elan_onglets')||''));
    const go=()=>{}; const translateNode=()=>{}; const $=()=>null;
    const LANG_FLAG={fr:'FR',en:'EN'}, LANGS={fr:'Français',en:'English'};
    const themeCouleur=()=>J.push('fenetre');
    const avatarAccentSync=()=>{};
    const applyTheme=()=>J.push('apply:'+getThemePref()+'/'+getMarque()+'/'+getAccent());
    const save=()=>{ J.push('save'); if(O.saveJette) throw new Error('refreshBadges : donnée inattendue'); };
    const syncPush=()=>J.push('push');
    const logEvent=()=>{};
    let db={users:[{id:'u1',login:'justin',actif:true,pref:{}}]}; let currentUser=db.users[0];
    ${CODE}
    return { signaux, toasts, u:()=>db.users[0], lire:k=>LS[k], ecrire:(k,x)=>{ LS[k]=String(x); },
      vider:()=>{ while(minuteries.length) minuteries.shift()(); }, ici:v=>{ current=v; },
      setLang, getLang, ongletsEcrire, favorisEcrire, setMapSat, mapSatOn,
      tcTeinte, tcMode, tcMarque, setThemePref, setMarque, setAccent, setAccentCustom, accentPersoRetirer, accentsPerso,
      getAccent, getMarque, getThemePref, prefAppliquer, prefLocalLire, rangementMesure, prefFusion, usersFusionner };`)(O,J);
  return { M, J };
}
const plein=l=>l.toasts.filter(t=>/plus de place/.test(t)).length;
/* Un geste qui JETTE est un geste qui ne fait rien : on le dit comme un ✗, on ne meurt pas avec. */
const joue=(t,f)=>{ let e=null; try{ f(); }catch(x){ e=(x&&x.name||'Error')+' : '+(x&&x.message); } v(t+' — le geste ne jette pas', e, null); };

console.log('\n══ 1. LE RANGEMENT EST PLEIN — le geste s\'applique quand même ══\n');
{ const O={plein:true}, {M,J}=bac(O);
  joue('« Bleu » sur un appareil plein', ()=>M.tcTeinte('blue'));
  vrai('⛔ toucher « Bleu » applique le bleu (l\'affichage LIT « blue »)', J.includes('apply:auto/teamop/blue'));
  vrai('la fenêtre se redessine sur le choix (la coche bouge)', J.includes('fenetre'));
  v('le choix est sur la fiche de la personne', M.u().pref.accent, 'blue');
  vrai('… avec l\'heure du choix (maintenant, pas zéro)', Math.abs(Date.now()-(+(M.u().prefTs||{}).accent||0))<60000);
  v('rien n\'est rangé sur l\'appareil (il est plein)', M.lire('elan_accent'), undefined);
  v('le message attend la fin du geste', plein(M), 0);
  M.vider();
  v('⛔ on le DIT à l\'écran — une fois', plein(M), 1);
  vrai('⛔ … APRÈS l\'enregistrement du geste (le dernier bandeau gagne : c\'est lui qui reste)', J.indexOf('toast:plein')>J.lastIndexOf('save'));
  const s=M.signaux.filter(x=>/Rangement de l’appareil plein/.test(x.m));
  v('⛔ et la Tour le reçoit', s.length, 1);
  vrai('… en nommant le réglage, sans préfixe d\'espace', /\(accent, QuotaExceededError\)/.test((s[0]||{}).m));
  joue('« Rose » ensuite', ()=>M.tcTeinte('pink')); M.vider();
  vrai('un second choix s\'applique aussi', J.includes('apply:auto/teamop/pink'));
  v('… sans second message (une fois par séance)', plein(M), 1);
  v('la mémoire tient la dernière teinte', M.getAccent(), 'pink');
}
{ const {M,J}=bac({plein:true});
  joue('le mode Nuit', ()=>M.tcMode('dark'));       vrai('le mode Nuit s\'applique sur un appareil plein', J.includes('apply:dark/teamop/teamop'));
  joue('le thème OP GESTION', ()=>M.tcMarque('opgestion')); vrai('le thème OP GESTION aussi, avec SA teinte', J.includes('apply:dark/opgestion/opgestion'));
  joue('la couleur des Paramètres', ()=>M.setAccent('purple'));  vrai('la couleur des Paramètres aussi', J.includes('apply:dark/opgestion/purple'));
  joue('le bouton de mode', ()=>M.setThemePref('light')); vrai('le bouton de mode aussi', J.includes('apply:light/opgestion/purple'));
  joue('une couleur personnelle', ()=>M.setAccentCustom('#12AB56'));
  vrai('une couleur personnelle aussi', J.includes('apply:light/opgestion/custom'));
  v('… qui entre dans la palette', M.accentsPerso(), ['#12AB56']);
  v('… et dont la valeur se lit', M.prefLocalLire('elan_accent_hex'), '#12AB56');
  joue('retirer la couleur personnelle', ()=>M.accentPersoRetirer(null,'#12AB56'));
  vrai('la retirer rend la teinte du thème', J.includes('apply:light/opgestion/opgestion'));
  v('la fiche porte tout ce qui a été choisi', [M.u().pref.theme,M.u().pref.marque,M.u().pref.accent], ['light','opgestion','opgestion']);
}

console.log('\n══ 2. L\'ENREGISTREMENT JETTE — la couleur d\'abord, l\'envoi quand même ══\n');
{ const {M,J}=bac({saveJette:true});
  joue('« Bleu » quand l\'enregistrement jette', ()=>M.tcTeinte('blue'));
  const iA=J.indexOf('apply:auto/teamop/blue'), iS=J.indexOf('save');
  vrai('⛔ la couleur s\'applique AVANT l\'enregistrement', iA>=0 && iS>iA);
  vrai('⛔ le choix part quand même vers l\'équipe', J.indexOf('push')>iS);
  vrai('la fenêtre se redessine', J.includes('fenetre'));
  v('la Tour reçoit l\'échec, nommé', M.signaux.filter(x=>/Réglage « accent » : l’enregistrement a échoué — refreshBadges/.test(x.m)).length, 1);
  v('et l\'appareil a rangé la couleur', M.lire('elan_accent'), 'blue');
}
for(const [nom,geste,attendu] of [
  ['tcMode', M=>M.tcMode('dark'), 'apply:dark/teamop/teamop'],
  ['tcMarque', M=>M.tcMarque('opgestion'), 'apply:auto/opgestion/opgestion'],
  ['setAccent', M=>M.setAccent('orange'), 'apply:auto/teamop/orange'],
  ['setThemePref', M=>M.setThemePref('light'), 'apply:light/teamop/teamop'],
  ['setAccentCustom', M=>M.setAccentCustom('#AA3300'), 'apply:auto/teamop/custom']]){
  const {M,J}=bac({saveJette:true}); let jete=null;
  try{ geste(M); }catch(e){ jete=e.message; }
  v('   '+nom+' : le geste ne jette pas', jete, null);
  const iA=J.indexOf(attendu), iS=J.indexOf('save');
  vrai('   '+nom+' : appliqué avant d\'enregistrer, puis envoyé', iA>=0 && iS>iA && J.lastIndexOf('push')>iS);
}

console.log('\n══ 3. UNE COPIE PLUS ANCIENNE DE LA FICHE NE DÉFAIT PLUS UN CHOIX ══\n');
{ const {M}=bac({}); const cp=o=>JSON.parse(JSON.stringify(o));
  const ici={id:'u1',login:'justin',pref:{accent:'blue',theme:'dark'},prefTs:{accent:200,theme:50}};
  const labas={id:'u1',login:'justin',email:'j@exemple.fr',pref:{accent:'teamop',theme:'light'},prefTs:{theme:100}};
  const L=[cp(ici)], D=[cp(labas)];
  const r=M.usersFusionner(L,D,[],false);
  v('à la réception, la FICHE reste celle du distant', r[0].email, 'j@exemple.fr');
  v('⛔ … mais la teinte choisie ICI, plus récente, reste', r[0].pref.accent, 'blue');
  v('… et le mode choisi LÀ-BAS, plus récent, gagne', r[0].pref.theme, 'light');
  v('les heures suivent les valeurs', r[0].prefTs, {theme:100,accent:200});
  v('la copie locale n\'est pas touchée à la réception', L[0].pref, ici.pref);
  const L2=[cp(ici)], D2=[cp(labas)];
  const r2=M.usersFusionner(L2,D2,[],true);
  vrai('à l\'envoi, c\'est NOTRE fiche qu\'on garde', r2[0]===L2[0]);
  v('⛔ … et un réglage plus récent venu du nuage y entre', r2[0].pref, {accent:'blue',theme:'light'});
  /* les deux sens rendent la même chose : la fusion converge, quel que soit l'appareil */
  const A=[cp(ici)], B=[cp(labas)];
  const vueA=M.usersFusionner(cp(A),cp(B),[],false)[0].pref, vueB=M.usersFusionner(cp(B),cp(A),[],true)[0].pref;
  v('la fusion converge : même résultat sur les deux appareils', vueA, vueB);
  const sansH=[{id:'u1',login:'justin',pref:{accent:'blue'}}], sansH2=[{id:'u1',login:'justin',pref:{accent:'teamop'}}];
  v('sans heure des deux côtés, la fiche tranche comme avant (distant à la réception)', M.usersFusionner(cp(sansH),cp(sansH2),[],false)[0].pref.accent, 'teamop');
  v('… et le local à l\'envoi', M.usersFusionner(cp(sansH),cp(sansH2),[],true)[0].pref.accent, 'blue');
  const eg1=[{id:'u1',login:'j',pref:{accent:'blue'},prefTs:{accent:100}}], eg2=[{id:'u1',login:'j',pref:{accent:'pink'},prefTs:{accent:100}}];
  v('à heure ÉGALE, la fiche tranche (une version d\'avant a changé la valeur sans l\'heure)', M.usersFusionner(cp(eg1),cp(eg2),[],false)[0].pref.accent, 'pink');
  const bizarre=[{id:'u1',login:'j',pref:{accent:{x:1}},prefTs:{accent:999}}];
  v('une valeur qui n\'est pas du texte ne passe pas', M.usersFusionner(cp(bizarre),cp(eg2),[],false)[0].pref.accent, 'pink');
  const seul=[{id:'u2',login:'k',pref:{accent:'teal'},prefTs:{accent:5}}];
  v('un compte présent d\'un seul côté reste tel quel', M.usersFusionner(cp(seul),[],[],false)[0].pref, {accent:'teal'});
  v('prefFusion rend le nombre de réglages repris', M.prefFusion(cp(labas),cp(ici)), 1);
  /* LA CHAÎNE ENTIÈRE : le VRAI geste pose l'heure, puis une copie qui ne l'a jamais reçu arrive */
  const {M:Ap}=bac({}); joue('le vrai geste', ()=>Ap.tcTeinte('blue'));
  const perime=[{id:'u1',login:'justin',actif:true,pref:{accent:'teamop'}}];
  v('⛔ le vrai geste, puis la copie d\'un appareil en retard : la teinte choisie reste', Ap.usersFusionner([Ap.u()],cp(perime),[],false)[0].pref.accent, 'blue');
  v('… zéro contre elle-même', (o=>M.prefFusion(o,o))(cp(ici)), 0);
}

console.log('\n══ 3 bis. LES QUATRE AUTRES RÉGLAGES QUI SUIVENT LA PERSONNE — la même règle ══\n');
{ const {M,J}=bac({plein:true});
  joue('la langue sur un appareil plein', ()=>M.setLang('en'));
  vrai('⛔ l\'anglais s\'applique (le menu se redessine en anglais)', J.includes('nav:en:'));
  v('… et suit la fiche', M.u().pref.lang, 'en');
  joue('les onglets sur un appareil plein', ()=>M.ongletsEcrire(['planning','boxes','stock','clients']));
  vrai('⛔ la barre du bas se redessine avec les nouveaux onglets', J.includes('onglets:planning,boxes,stock,clients'));
  joue('un favori sur un appareil plein', ()=>M.favorisEcrire(['stock']));
  vrai('⛔ le menu se redessine avec le favori', J.includes('nav:en:["stock"]'));
  M.ici('carteInt');
  joue('le satellite sur un appareil plein', ()=>M.setMapSat(true));
  vrai('⛔ la carte se redessine en satellite', J.includes('carte:true'));
  v('les quatre suivent la fiche', [M.u().pref.onglets,M.u().pref.favoris,M.u().pref.carte], ['planning,boxes,stock,clients','["stock"]','s']);
}
for(const [nom,geste,attendu] of [
  ['setLang', M=>M.setLang('en'), 'nav:en:'],
  ['ongletsEcrire', M=>M.ongletsEcrire(['planning','boxes','stock','clients']), 'onglets:planning,boxes,stock,clients'],
  ['favorisEcrire', M=>M.favorisEcrire(['stock']), 'nav:fr:["stock"]'],
  ['setMapSat', M=>{ M.ici('carteInt'); M.setMapSat(true); }, 'carte:true']]){
  const {M,J}=bac({saveJette:true}); let jete=null;
  try{ geste(M); }catch(e){ jete=e.message; }
  v('   '+nom+' quand l\'enregistrement jette : le geste ne jette pas', jete, null);
  const iA=J.indexOf(attendu), iS=J.indexOf('save');
  vrai('   '+nom+' : appliqué avant d\'enregistrer, puis envoyé', iA>=0 && iS>iA && J.lastIndexOf('push')>iS);
}

console.log('\n══ 4. AU CHARGEMENT : on APPLIQUE la fiche, on n\'écrit rien — même sur un appareil plein ══\n');
{ const {M,J}=bac({plein:true});
  const fiche={id:'u1',pref:{accent:'purple',theme:'dark'}};
  v('le réglage de la fiche s\'applique sur un appareil plein', M.prefAppliquer(fiche), true);
  vrai('… et l\'affichage le lit', J.includes('apply:dark/teamop/purple'));
  v('un second passage ne change plus rien', M.prefAppliquer(fiche), false);
  v('⛔ appliquer n\'écrit jamais sur la fiche', fiche, {id:'u1',pref:{accent:'purple',theme:'dark'}});
  faux('⛔ … ni dans la base', J.includes('save'));
}

console.log('\n══ 4 bis. LA MÉMOIRE N\'EST QU\'UN REPLI — elle ne masque jamais le rangement qui accepte ══\n');
{ const O={plein:true}, {M}=bac(O);
  joue('« Bleu » sur un appareil plein', ()=>M.tcTeinte('blue'));
  v('appareil plein : la teinte vit en mémoire', M.prefLocalLire('elan_accent'), 'blue');
  O.plein=false; joue('« Rose » quand la place revient', ()=>M.tcTeinte('pink'));
  v('la place revient : la teinte est RANGÉE', M.lire('elan_accent'), 'pink');
  v('… et c\'est le rangement qui fait foi', M.prefLocalLire('elan_accent'), 'pink');
  const fiche={id:'u1',pref:{carte:'s'}};
  v('un réglage de la fiche se range', M.prefAppliquer(fiche), true);
  M.ecrire('elan_carte','r');   // la carte range ELLE-MÊME son réglage (setMapSat), sans passer par prefLocal
  v('⛔ un rangement DIRECT n\'est pas masqué : le réglage de la fiche se réapplique', M.prefAppliquer(fiche), true);
  v('… et il est bien reposé', M.lire('elan_carte'), 's');
}

console.log('\n══ 4 ter. « PLEIN » SEULEMENT SI C\'EST LE QUOTA ══\n');
{ const O={plein:true}; const {M}=bac(O);
  /* un rangement INTERDIT (vieux Safari privé, réglages de confidentialité) jette autre chose */
  const f=new Function('O',`const signaux=[], toasts=[]; const window={tmSignaler:(t,m)=>signaux.push(String(m))};
    const toast=m=>toasts.push(String(m)); const setTimeout=f=>f(); const localStorage={length:0,key:()=>null,getItem:()=>null};
    ${decoupe('let _prefPleinDit=false;')} ${decoupe('function prefRangementPlein(k,e){')} ${decoupe('function rangementMesure(){')}
    return (e)=>{ prefRangementPlein('elanB_accent',e); return {signaux,toasts}; };`)(O);
  const e=new Error('The operation is insecure.'); e.name='SecurityError';
  const r=f(e);
  vrai('un refus qui n\'est pas le quota se dit « refusé »', /Rangement de l’appareil refusé/.test(r.signaux[0]||'') && /refuse de ranger/.test(r.toasts[0]||''));
  faux('… jamais « plein »', /plein/.test((r.signaux[0]||'')+(r.toasts[0]||'')));
}

console.log('\n══ 5. CE QUE LA TOUR REÇOIT : des familles, jamais un nom de clé ══\n');
{ const {M}=bac({ls:{'elan_gestion_v2':'x'.repeat(5000),'elanB_gestion_v2':'y'.repeat(3000),'elanB_rappels_beta-justin':'[1,2]','teamop_spaces':'[]','zz':'1'}});
  const m=M.rangementMesure();
  vrai('la mesure nomme les familles', /base application/.test(m)&&/base bêta/.test(m)&&/Tour \/ portail/.test(m)&&/autre/.test(m));
  faux('⛔ … jamais un nom de clé (certaines portent un compte)', /justin|rappels|gestion_v2|teamop_spaces/.test(m));
  vrai('… la plus grosse d\'abord', m.indexOf('base application')>=0 && m.indexOf('base application')<m.indexOf('base bêta'));
  vrai('… en octets comme Safari les compte (deux par caractère)', /^16 Ko occupés/.test(m));
}

console.log('\n══ 6. LE CÂBLAGE — ce que l\'exécution n\'atteint pas ══\n');
{ /* le code seul : on ne retire que les blocs qui COMMENCENT une ligne (règle du dépôt) */
  const NU=APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm,' ').replace(/^[ \t]*\/\/.*$/gm,' ');
  v('⛔ plus AUCUN accès direct au rangement pour les neuf réglages qui suivent la personne',
    (NU.match(/localStorage\.(?:setItem|getItem|removeItem)\((?:'elan_(?:theme|marque|accent|accent_hex|accents_perso|lang|onglets|favoris|carte)'|PREF_CLES\.)/g)||[]).length, 0);
  vrai('… et la clé du rangement est bien celle que les neuf portent (sinon le motif ne verrait rien)',
    /const PREF_CLES=\{theme:'elan_theme',marque:'elan_marque',accent:'elan_accent',accentHex:'elan_accent_hex',accentsPerso:'elan_accents_perso',lang:'elan_lang',onglets:'elan_onglets',favoris:'elan_favoris',carte:'elan_carte'\};/.test(NU));
  const i=NU.indexOf('remote.users=usersFusionner(db.users,remote.users,tomb,false);');
  vrai('la réception est trouvée', i>0);
  vrai('… elle relève les heures AVANT la fusion', NU.slice(Math.max(0,i-400),i).includes('const prefAvant=sigPref(remote.users);'));
  vrai('⛔ … et REPOUSSE quand un choix plus récent a été gardé ici', NU.slice(i,i+900).includes('|| (sigPref(remote.users)!==prefAvant)'));
  const j=NU.indexOf('db.users=usersFusionner(db.users,remote.users,tomb,true);');
  vrai('l\'envoi est trouvé', j>0);
  vrai('⛔ … et applique un réglage plus récent venu du nuage', /prefAppliquer\(moi\)/.test(NU.slice(j,j+700)));
  const s0=NU.indexOf("if(localStorage.getItem('top_monitor_off')==='1') return;");
  const s1=NU.indexOf('})();', NU.indexOf('setInterval(tmFlush,35000)'));
  vrai('la sentinelle est trouvée', s0>0 && s1>s0);
  const porte=NU.indexOf('window.tmSignaler=function(');
  vrai('⛔ sa porte est posée DANS la sentinelle (seul endroit où tmPush existe)', porte>s0 && porte<s1);
  v('⛔ plus aucun appel à tmPush HORS de la sentinelle (il y vaut undefined)', (NU.slice(s1).match(/\btmPush\(/g)||[]).length, 0);
  vrai('⛔ la mémoire des réglages vit HORS de la sentinelle (dedans, elle n\'existait pas)', NU.indexOf('const _prefVue={};')>s1);
  vrai('… et AVANT le reste du script, qui lit l\'apparence dès le premier rendu', NU.indexOf('const _prefVue={};')<NU.indexOf('function applyTheme(){'));
}
{ /* le diagnostic de synchro, JOUÉ : il testait `typeof tmPush` depuis l'extérieur — toujours faux */
  const f=new Function('W',`const window=W; const console={warn:()=>{}};
    const localStorage={getItem:()=>null}; let db={boxes:[],produits:[],users:[1],interventions:[],clients:[]};
    let currentUser=null, _syncGotInitial=false, _syncOn=false;
    ${decoupe('let _syncDiagDit=false;')}
    ${decoupe('function syncDiagnostic(motif){')}
    return syncDiagnostic;`);
  const recu=[]; const syncDiagnostic=f({tmSignaler:(t,m,st,src)=>recu.push([t,src,String(m).slice(0,40)])});
  syncDiagnostic('essai'); syncDiagnostic('encore');
  v('⛔ le diagnostic de synchro atteint enfin la Tour — une fois par chargement', recu.map(r=>r.slice(0,2)), [['synchro','sync']]);
  vrai('… et il dit ce qu\'il a vu', /^Synchro essai — espace/.test((recu[0]||[])[2]||''));
}

console.log('\n══ 7. LA FILE DE LA SENTINELLE TIENT EN MÉMOIRE SUR UN APPAREIL PLEIN ══\n');
{ /* Sans elle, rien de ce qui précède n'atteignait la Tour depuis un appareil plein : `tmSaveQ`
     échouait en silence et `tmFlush` relisait une file vide. */
  const O={plein:true};
  const T=new Function('O',`const TM_KEY='top_monitor_q'; const LS={};
    const localStorage={ getItem:k=>(k in LS?LS[k]:null),
      setItem:(k,x)=>{ if(O.plein){ const e=new Error('quota'); e.name='QuotaExceededError'; throw e; } LS[k]=String(x); } };
    ${decoupe('var tmMem=null;')}
    ${decoupe('function tmLoad(){')}
    ${decoupe('function tmSaveQ(q){')}
    return { tmLoad, tmSaveQ, LS };`)(O);
  T.tmSaveQ([{signature:'a'}]);
  v('⛔ appareil plein : la file n\'est pas perdue', T.tmLoad().map(x=>x.signature), ['a']);
  T.tmSaveQ(T.tmLoad().concat([{signature:'b'}]));
  v('… elle s\'allonge en mémoire', T.tmLoad().map(x=>x.signature), ['a','b']);
  T.tmSaveQ([]);
  v('… et se vide une fois envoyée', T.tmLoad(), []);
  O.plein=false; T.tmSaveQ([{signature:'c'}]);
  v('la place revient : la file est RANGÉE', JSON.parse(T.LS.top_monitor_q).map(x=>x.signature), ['c']);
  v('… et la mémoire ne la masque plus', T.tmLoad().map(x=>x.signature), ['c']);
  T.tmSaveQ(Array.from({length:45},(x,i)=>({signature:'s'+i})));
  v('la file reste plafonnée à 40', T.tmLoad().length, 40);
}

console.log('\n═══ test-808 : '+ok+' ✓ '+ko+' ✗ ═══\n');
process.exit(ko?1:0);

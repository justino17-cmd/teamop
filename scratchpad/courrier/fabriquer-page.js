#!/usr/bin/env node
/* Fabrique `courrier-beta.html` depuis la maquette validée (`maquette/opcourrier.html`, un fichier sans enveloppe).
   Usage : node scratchpad/courrier/fabriquer-page.js <chemin de opcourrier.html> [sortie]

   ⛔ OUTIL D'UNE SEULE FOIS : `courrier-beta.html` est ensuite la source, retouchée à la main. Ce script garde la TRACE de ce
   qui a été changé par rapport à la maquette (chaque substitution doit trouver exactement UNE cible — sinon on s'arrête,
   comme `beta-build.js`), pour qu'une nouvelle maquette de Justin puisse être re-portée sans deviner.
   Aucun appel réseau, aucune écriture hors de la sortie. */
const fs = require('fs'), path = require('path');
const src = process.argv[2], sortie = process.argv[3] || path.join(__dirname, '..', '..', 'courrier-beta.html');
if (!src) { console.error('usage : node fabriquer-page.js <opcourrier.html> [sortie]'); process.exit(2); }
let s = fs.readFileSync(src, 'utf8');
const rapport = [];

/* n : le nombre exact de cibles attendues (1 par défaut), ou '+' pour « au moins une » */
function sub(quoi, de, vers, n) {
  n = n === undefined ? 1 : n;
  const trouve = typeof de === 'string' ? s.split(de).length - 1 : (s.match(new RegExp(de.source, de.flags.includes('g') ? de.flags : de.flags + 'g')) || []).length;
  if (n === '+' ? trouve < 1 : trouve !== n) { console.error('ÉCHEC « ' + quoi + ' » : ' + n + ' cible(s) attendue(s), ' + trouve + ' trouvée(s)'); process.exit(1); }
  s = typeof de === 'string' ? s.split(de).join(vers) : s.replace(new RegExp(de.source, de.flags.includes('g') ? de.flags : de.flags + 'g'), (m) => vers.split('$1').join(m));
  rapport.push(quoi);
}

/* ── 1. l'enveloppe : tout ce qui précède <style> est remplacé ── */
const iStyle = s.indexOf('<style>');
if (iStyle < 0) { console.error('ÉCHEC : <style> introuvable'); process.exit(1); }
const ENVELOPPE = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#f2f2f7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0b1633" media="(prefers-color-scheme: dark)">
<meta name="description" content="OP Courrier — bêta : la messagerie e-mail de TeamOP. Aucun vrai mail n'est lu ni envoyé.">
<link rel="icon" type="image/png" sizes="32x32" href="icons/teamop-favicon-32.png">
<link rel="apple-touch-icon" href="icons/teamop-apple-touch.png">
<!-- ⛔ Aucune ressource externe : cette politique le GARDE (pas seulement le dit). La seule sortie du réseau est la lecture
     du MX d'un domaine d'entreprise (dns.google, puis cloudflare-dns.com en secours), derrière un geste de la personne —
     voir lireMX(). Elle disparaît avec le serveur d'OP Courrier, qui le fera lui-même. -->
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src https://dns.google https://cloudflare-dns.com; base-uri 'none'; form-action 'none'">
<title>OP Courrier</title>
</head>
<body>
`;
s = ENVELOPPE + s.slice(iStyle);
rapport.push('enveloppe (doctype, charset, viewport, theme-color, noindex, icônes, politique de sécurité)');
if (!/<\/script>\s*$/.test(s)) { console.error('ÉCHEC : la maquette ne finit pas par </script>'); process.exit(1); }
s = s.replace(/\s*$/, '\n</body>\n</html>\n');

/* ── 2. le thème suit l'appareil, sans bouton (règle du 29 septembre 2026) ── */
sub('feuille sombre : plus de data-theme="light"', '@media (prefers-color-scheme:dark){ :root:not([data-theme="light"]){', '@media (prefers-color-scheme:dark){ :root{');
sub('bloc :root[data-theme="dark"] retiré', /\n  :root\[data-theme="dark"\]\{[\s\S]*?\n  \}\n(?=  @media \(min-resolution)/, '\n');
sub('onglet Pro actif : règle data-theme retirée', /  :root\[data-theme="dark"\] \.sptab\.sp-pro[^\n]*\n/, '');
sub('pastilles de signature : règle data-theme retirée', /  :root\[data-theme="dark"\] \.sgchip[^\n]*\n/, '');
sub('sélecteurs :not([data-theme="light"]) → :root (même spécificité que les règles qu\'ils battent)', ':root:not([data-theme="light"])', ':root', '+');
sub('bouton de thème : marge retirée', /    \.list-bar #btnTheme\{margin-left:auto\}\n/, '');
sub('bouton de thème : emplacement (barre latérale)', /      <span class="slot" id="slotThemeSide"><\/span>\n/, '');
sub('bouton de thème : emplacement (liste)', /      <span class="slot" id="slotThemeList"><\/span>\n/, '');
sub('bouton de thème : bouton et emplacement (lecture)', /      <span class="slot" id="slotThemeTb">[^\n]*<\/button><\/span>\n/, '');
sub('bouton de thème : déplacement par placeChrome', /    put\(\$\("#btnTheme"\),[^\n]*\n/, '');
sub('bouton de thème : fonction toggleTheme', /  \/\/ ---------- Thème ----------\n  function toggleTheme\(\)[\s\S]*?persist\(\); \}\n\n/, '');
sub('bouton de thème : écouteur', /  \$\("#btnTheme"\)\.onclick=toggleTheme;\n/, '');
sub('persistance : plus de thème écrit', 'theme:document.documentElement.getAttribute("data-theme")||"",', '');
sub('persistance : plus de thème relu', /    if\(snap\.theme\) document\.documentElement\.setAttribute\("data-theme",snap\.theme\);\n/, '');

/* ── 3. stockage de la bêta ── */
sub('clé de stockage préfixée bêta', 'var LS="opcourrier.v2"', 'var LS="opcourrierB_v2"');

/* ── 4. la mention honnête : « Maquette » → « Bêta » ── */
sub('pastille « Maquette » → « Bêta — aucun vrai mail n’est lu ni envoyé »',
  '<span class="demo-pill" title="Maquette : aucun vrai e-mail n\'est envoyé ou reçu">Maquette</span>',
  '<span class="demo-pill" title="Bêta — aucun vrai mail n\'est lu ni envoyé">Bêta<span class="dp-long"> — aucun vrai mail n\'est lu ni envoyé</span></span>', 4);
sub('phrase « Maquette : tri local »', 'Maquette : tri local.', 'Bêta : tri local.');
sub('phrase « Maquette : rien n’est réellement envoyé. Version finale »', 'Maquette : rien n’est réellement envoyé. Version finale', 'Bêta : rien n’est réellement envoyé. Version finale');
sub('phrase « Maquette : rien n’est réellement envoyé. » (signature)', 'Maquette : rien n’est réellement envoyé.</span></p>\'+', 'Bêta : rien n’est réellement envoyé.</span></p>\'+');
sub('phrase « Maquette : le PDF signé »', 'Maquette : le PDF signé', 'Bêta : le PDF signé');
sub('phrase « Maquette : les messages ne sont pas réellement envoyés »', 'Maquette : les messages ne sont pas réellement envoyés.', 'Bêta : les messages ne sont pas réellement envoyés.');
sub('phrase « Dans cette maquette, gardez l’onglet ouvert »', 'Dans cette maquette, gardez l’onglet ouvert.', 'Dans cette bêta, gardez l’onglet ouvert.');
sub('phrase « Maquette : la connexion elle-même est simulée »', 'Maquette : la connexion elle-même est simulée', 'Bêta : la connexion elle-même est simulée');
sub('phrase « Dans cette maquette, rien n’est réellement transmis »', 'Dans cette maquette, rien n’est réellement transmis.', 'Dans cette bêta, rien n’est réellement transmis.');
sub('phrase « Maquette : connexion simulée »', 'Maquette : connexion simulée.', 'Bêta : connexion simulée.');
sub('phrase « OP Courrier est une maquette »', 'OP Courrier est une maquette : les messages sont des exemples', 'OP Courrier est en bêta : les messages sont des exemples');
sub('état « Maquette · messages d’exemple »', 'Maquette · messages d’exemple', 'Bêta · messages d’exemple');

/* la pastille se dit en deux longueurs : « Bêta » seul dans une barre étroite (la phrase est dans l'infobulle), la phrase entière sous le grand
   titre où la ligne a toute la largeur (iPad, iPhone) ; et sur Mac / iPad la phrase est aussi au pied de la barre latérale (.gfoot, jadis iPhone seul) */
sub('pastille : longueur courte / longue', /(  \.demo-pill\{[^\n]*\}\n)/, '$1  .dp-long{display:none}\n  .lt-sub .demo-pill .dp-long{display:inline}\n');
sub('mention au pied de la barre latérale sur tous les formats', '  .gfoot{display:none}\n', '  .gfoot{display:block;padding:8px 18px 14px;font-size:11.5px;line-height:1.38;color:var(--label-2)}\n');

sub('sous le grand titre : la pastille longue passe à la ligne plutôt que de manger le sous-titre', '    .lt-sub{display:flex;align-items:center;justify-content:space-between;gap:8px}\n', '    .lt-sub{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:3px 8px}\n');

sub('teinte du point de compte : table explicite (verifier-theme.js ne lit pas un nom de variable construit)',
  'function acctHue(a){ var k=kindOf(a); return "var(--acc-"+k+"-"+(accountsOfKind(k).indexOf(a)%3)+")"; }',
  'var ACC_HUES={pro:["var(--acc-pro-0)","var(--acc-pro-1)","var(--acc-pro-2)"],perso:["var(--acc-perso-0)","var(--acc-perso-1)","var(--acc-perso-2)"]};\n  function acctHue(a){ var k=kindOf(a); return ACC_HUES[k][accountsOfKind(k).indexOf(a)%3]; }');

/* ── 5. le mode démo : l'exemple, l'arrivée simulée et la signature du client simulée n'existent que dans ce mode ── */
sub('MODE DÉMO : drapeau et vidage des exemples',
  '  // ---------- État ----------\n',
  `  // ---------- Mode démo ----------
  // ⛔ TANT QU'AUCUN SERVEUR D'OP COURRIER N'EXISTE, la bêta EST le mode démo : messages d'exemple, mail qui « arrive » tout seul,
  // « Simuler la signature du client », connexion et envoi simulés. Le jour où le serveur existe, il pose \`window.OPCOURRIER_SERVEUR\`
  // AVANT ce script : la démo s'éteint d'un coup (plus un exemple, plus une arrivée simulée, plus de simulation de signature) et rien
  // ne fait semblant d'envoyer — voir connectAccount() et le bouton Envoyer, qui refusent honnêtement. Un drapeau, pas cinq tests dispersés.
  var DEMO=!window.OPCOURRIER_SERVEUR;
  if(!DEMO){ ACCOUNTS.length=0; MESSAGES.length=0; }

  // ---------- État ----------
`);
sub('arrivée simulée : minuterie derrière la démo', '  setTimeout(receiveMail,180000);\n', '  if(DEMO) setTimeout(receiveMail,180000);\n');
sub('arrivée simulée : la fonction elle-même refuse hors démo', 'function receiveMail(){\n', 'function receiveMail(){\n    if(!DEMO) return;\n');
sub('réglages : « Recevoir un mail d’exemple » seulement en démo',
  '\'<div class="strow"><button type="button" class="btn" id="stTest">Recevoir un mail d’exemple</button></div></div>\'+',
  '(DEMO?\'<div class="strow"><button type="button" class="btn" id="stTest">Recevoir un mail d’exemple</button></div>\':\'\')+\'</div>\'+');
sub('réglages : écouteur de stTest', '$("#stTest").onclick=function(){', 'if($("#stTest")) $("#stTest").onclick=function(){');
sub('signature : « Simuler la signature du client » seulement en démo',
  'if(live) acts=\'<button type="button" class="btn" data-act="signSim">Simuler la signature du client (démo)</button><button',
  'if(live) acts=(DEMO?\'<button type="button" class="btn" data-act="signSim">Simuler la signature du client (démo)</button>\':\'\')+\'<button');
sub('signature : signSim refuse hors démo', 'if(act==="signSim"){ var x=', 'if(act==="signSim"){ if(!DEMO) return; var x=');
sub('signature : « Document ouvert » simulé seulement en démo', '      setTimeout(function(){ var x=m.sign&&m.sign.signers[0]; if(!x||x.st!=="pending"', '      if(DEMO) setTimeout(function(){ var x=m.sign&&m.sign.signers[0]; if(!x||x.st!=="pending"');
sub('connexion d’une boîte : refus honnête hors démo', '  function connectAccount(p,mail,name,kind){\n', '  function connectAccount(p,mail,name,kind){\n    if(!DEMO){ toast("OP Courrier n’est pas encore relié à un serveur : la boîte n’a pas été ajoutée."); return; }\n');
sub('envoi : refus honnête hors démo', '    $("#cSend").onclick=function(){\n', '    $("#cSend").onclick=function(){\n      if(!DEMO){ toast("OP Courrier n’est pas encore relié à un serveur : le message n’a pas été envoyé."); return; }\n');

sub('sans aucune boîte : composer et demander une signature disent quoi faire au lieu de jeter', '  function openCompose(model){\n', '  function openCompose(model){\n    if(!ACCOUNTS.length){ toast("Ajoutez d’abord une boîte mail"); return; }\n');
sub('sans aucune boîte : la demande de signature aussi', '  function openSignRequest(pre){\n', '  function openSignRequest(pre){\n    if(!ACCOUNTS.length){ toast("Ajoutez d’abord une boîte mail"); return; }\n');

/* ── 6. le côté d'ouverture : #pro / #perso (OP GESTION et OP MESSAGES ouvrent la page du bon côté) ── */
sub('côté d’ouverture : lecture du hash au démarrage et changement de hash',
  '  // ---------- Démarrage ----------\n  restore();\n',
  `  // ---------- Côté d'ouverture : #pro / #perso ----------
  // OP GESTION ouvre \`courrier-beta.html#pro\`, OP MESSAGES le côté où l'on était. Le hash gagne sur le côté mémorisé ; sans hash, rien ne change.
  // Il suit ensuite le côté choisi (replaceState : pas d'entrée d'historique), sinon un rechargement ramènerait au côté d'arrivée.
  function coteDuHash(){ var h=String(location.hash||"").toLowerCase(); return h==="#pro"?"pro":h==="#perso"?"perso":null; }
  function coteCourant(){ return state.scope==="perso"||(acctExists(state.scope)&&kindOf(acctOf(state.scope))==="perso")?"perso":"pro"; }
  function ouvrirCote(c){ state.scope=c; state.folder="inbox"; state.selected=null; state.filter="all"; app.setAttribute("data-scope",c); }
  function noterCote(){ try{ if(coteDuHash()&&history.replaceState) history.replaceState(null,"","#"+coteCourant()); }catch(e){} }
  window.addEventListener("hashchange",function(){ var c=coteDuHash(); if(!c||c===coteCourant()) return;
    ouvrirCote(c); clearSearch(); renderAll(); persist(); if(isPhone()) go("list"); });

  // ---------- Démarrage ----------
  restore();
  if(coteDuHash()) ouvrirCote(coteDuHash());
`);
sub('côté d’ouverture : le hash suit le côté choisi (persist)', '    localStorage.setItem(LS,JSON.stringify(snap));\n  }catch(e){} }', '    localStorage.setItem(LS,JSON.stringify(snap));\n  }catch(e){}\n    noterCote(); }');

/* ── 7. la lecture du MX derrière un geste explicite ── */
sub('MX : commentaire de la lecture DNS',
  '  var mxCache={};\n  function lireMX(d){',
  `  var mxCache={};
  // ⛔ LA SEULE SORTIE DU RÉSEAU DE CETTE PAGE : l'annuaire public (DNS) pour reconnaître le service d'un domaine D'ENTREPRISE.
  //   · elle n'envoie que le NOM DE DOMAINE (« entreprise.fr »), jamais l'adresse ni le nom ;
  //   · elle ne part JAMAIS pendant la frappe : seulement quand la personne a fini (elle quitte le champ, appuie sur Entrée ou sur
  //     « Vérifier la messagerie ») — voir detect(true) dans openAddAccount ;
  //   · un domaine grand public (Gmail, Outlook, iCloud…) est reconnu par la table, sans aucun appel ;
  //   · si le réseau ou la politique de la page la refuse, la détection retombe sur la table + \`mail.<domaine>\` (provServeurEntreprise).
  // Version finale : c'est le SERVEUR d'OP Courrier qui lira le MX, et cette fonction disparaît de la page.
  function lireMX(d){`);
sub('MX : detect(geste) — pas d’appel réseau sans geste',
  '    function detect(){\n      var v=mIn.value.trim().toLowerCase(), at=v.lastIndexOf("@"), d=at>0?v.slice(at+1):"";\n      showErr(""); var my=++seq;\n      if(!/^[^@\\s]+@[a-z0-9-]+(\\.[a-z0-9-]+)*\\.[a-z]{2,}$/.test(v)){ det.hidden=true; apply(null); go.disabled=true; return; }\n      var p=detectParDomaine(d);\n      if(p){ paint("ok",p); apply(p); return; }\n      paint("wait",null,"Vérification de « "+d+" »"); apply(null);\n',
  '    var enCours="";   // domaine dont le MX est en cours de lecture : un Entrée + un « change » ne font qu\'une demande\n' +
  '    function detect(geste){\n      var v=mIn.value.trim().toLowerCase(), at=v.lastIndexOf("@"), d=at>0?v.slice(at+1):"";\n      if(!mIn.isConnected) return;   // feuille fermée (Échap, Annuler) : le champ qui disparaît déclenche un « change » — ce n’est PAS un geste, rien ne part\n      if(geste&&enCours===d) return;\n      showErr(""); var my=++seq; enCours="";\n      if(!/^[^@\\s]+@[a-z0-9-]+(\\.[a-z0-9-]+)*\\.[a-z]{2,}$/.test(v)){ det.hidden=true; apply(null); go.disabled=true; return; }\n      var p=detectParDomaine(d);\n      if(p){ paint("ok",p); apply(p); return; }\n' +
  '      if(!geste){   // domaine d\'entreprise : on attend la fin de la saisie, aucun appel réseau pendant la frappe\n' +
  '        paint("idle",null,d); apply(null); go.disabled=false; go.textContent="Vérifier la messagerie"; return; }\n' +
  '      enCours=d; paint("wait",null,"Vérification de « "+d+" »"); apply(null);\n');
sub('MX : detect rend la main (enCours) à la réponse', '      lireMX(d).then(function(mx){ if(my!==seq) return;\n', '      lireMX(d).then(function(mx){ if(my!==seq||!mIn.isConnected) return; enCours="";\n');
sub('MX : état « idle » du panneau de détection',
  '      if(st==="ko"){ det.innerHTML=',
  '      if(st==="idle"){ det.innerHTML=\'<span class="ptile" style="background:#5b6270" aria-hidden="true">\'+I.mail+\'</span><span class="pn"><b>Domaine d’entreprise « \'+H(msg)+\' »</b><span>Quand vous avez fini de taper, appuyez sur Entrée ou quittez le champ : seul ce nom de domaine sera vérifié dans l’annuaire public (DNS).</span></span>\'; return; }\n      if(st==="ko"){ det.innerHTML=');
sub('MX : la frappe ne lit que la table, le geste lit le MX',
  '    mIn.addEventListener("input",function(){ clearTimeout(tmr); tmr=setTimeout(detect,350); });\n    mIn.addEventListener("keydown",function(e){ if(e.key==="Enter"&&!go.disabled){ e.preventDefault(); go.click(); } });\n',
  '    mIn.addEventListener("input",function(){ clearTimeout(tmr); tmr=setTimeout(function(){ detect(false); },350); });\n' +
  '    mIn.addEventListener("change",function(){ clearTimeout(tmr); setTimeout(function(){ detect(true); },0); });   // le champ est quitté (ou Entrée) : la saisie est finie. Après un tour : fermer la feuille (Échap) fait aussi « quitter » le champ, avant de le retirer du document — ce n’est pas un geste\n' +
  '    mIn.addEventListener("keydown",function(e){ if(e.key==="Enter"&&!go.disabled){ e.preventDefault(); go.click(); } });\n');
sub('MX : « Continuer » sans détection fait la détection',
  '    go.onclick=function(){\n      if(!found) return;\n',
  '    go.onclick=function(){\n      if(!found){ if(!go.disabled) detect(true); return; }\n');

fs.writeFileSync(sortie, s);
console.log(sortie + ' écrit (' + Math.round(s.length / 1024) + ' Ko), ' + rapport.length + ' substitutions :\n- ' + rapport.join('\n- '));

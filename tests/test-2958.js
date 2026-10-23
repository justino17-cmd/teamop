/* ══ test-2958 : la signature d'un nouveau message n'apparaît QU'UNE FOIS (23 octobre 2026) ══
   Justin, capture de la Tour (Courrier → Nouveau message) : « -- TEAM OP » deux fois, et « Brouillon enregistré » sans rien avoir tapé.
   La cause : le corps était écrit DANS le HTML (`<textarea>…signature…</textarea>`), et le navigateur avale le saut de ligne qui suit la balise.
   La signature ("\n\n-- \n…") n'était plus retrouvée telle quelle : changer de boîte « De » l'ajoutait une seconde fois, et `hasContent` ne savait
   plus l'ôter (un brouillon naissait tout seul). Le corps s'écrit désormais par `.value`, avant la photographie de départ (`snap()`).
   Ce banc lit le CODE (commentaires retirés) et EXÉCUTE la vraie logique de `sigOf` et du changement de boîte d'`opcourrier.js` ; la preuve au
   navigateur, sur le vrai module : `scratchpad/courrier/sonde-signature-double.js` (avant : 2 signatures ; après : 1, aucun brouillon). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let ok = 0, ko = 0;
const v = (nom, obtenu, attendu) => { const b = JSON.stringify(obtenu) === JSON.stringify(attendu); b ? ok++ : ko++; console.log((b ? '  ✓ ' : '  ✗ ') + nom + (b ? '' : '\n      attendu : ' + JSON.stringify(attendu) + '\n      obtenu  : ' + JSON.stringify(obtenu))); };
console.log('── test-2958 : une seule signature dans un nouveau message ──');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'opcourrier.js'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const i0 = SRC.indexOf('  function openCompose(model){'), i1 = SRC.indexOf('\n  function ', i0 + 10);
const OC = i0 > 0 && i1 > i0 ? SRC.slice(i0, i1) : '';
v('(population) openCompose est trouvée dans le fichier livré', OC.length > 2000, true);

/* 1. le corps n'est JAMAIS écrit dans le HTML de la zone de texte */
const balise = (OC.match(/<textarea class="cbody" id="cBody"[^>]*>([^<]*)<\/textarea>/) || [])[1];
v('la zone de texte du message est vide dans le HTML (le navigateur y avale un saut de ligne)', balise, '');
/* 2. il s'écrit par .value, AVANT la photographie de départ */
const iVal = OC.indexOf('$("#cBody").value=body0;'), iSnap = OC.indexOf('var initial=snap();');
v('le corps s\'écrit par .value, avant snap() (sinon tout message ouvert passe pour « modifié »)', [iVal > 0, iSnap > 0, iVal < iSnap], [true, true, true]);

/* 3. la vraie logique : sigOf et le changement de boîte, exécutés sur ce que la zone contient vraiment */
const sigOfTxt = (OC.match(/sigOf=(function\(id\)\{[^}]*\})/) || [])[1];
const hTxt = (OC.match(/\$\("#cFrom"\)\.addEventListener\("change",function\(\)\{ (var ns=isNew\?sigOf\(this\.value\)[\s\S]*?curSig=ns; \$\("#cBody"\)\.value=b; queueSave\(\);) \}\);/) || [])[1];
v('(population) sigOf et le changement de boîte sont trouvés', [!!sigOfTxt, !!hTxt], [true, true]);
if (sigOfTxt && hTxt) {
  const COMPTES = { a1: { signature: 'TEAM OP' }, a2: { signature: 'Justin — TEAM OP' }, a3: { signature: '' } };
  const zone = { value: '' };
  const ctx = vm.createContext({ acctOf: id => COMPTES[id], zone, sauvegardes: 0, String });
  vm.runInContext('var sigOf=' + sigOfTxt + '; var $=function(){ return zone; }; function queueSave(){ sauvegardes++; }' +
    'var isNew=true, curSig=sigOf("a1"); zone.value=curSig;' +
    'function changer(v){ (function(){' + hTxt + '}).call({ value: v }); }', ctx);
  const nb = s => (String(s).match(/(^|\n)-- \n/g) || []).length;
  v('à l\'ouverture : une signature, telle que sigOf la fabrique', [nb(zone.value), zone.value], [1, '\n\n-- \nTEAM OP']);
  vm.runInContext('changer("a2")', ctx);
  v('« De » change de boîte : la signature est REMPLACÉE, pas ajoutée', [nb(zone.value), zone.value], [1, '\n\n-- \nJustin — TEAM OP']);
  vm.runInContext('changer("a1")', ctx);
  v('retour à la première boîte : toujours une seule signature', [nb(zone.value), zone.value], [1, '\n\n-- \nTEAM OP']);
  vm.runInContext('changer("a3")', ctx);
  v('une boîte sans signature : la signature part, rien ne reste', zone.value, '');
  vm.runInContext('zone.value="Bonjour, voici votre accès." + zone.value; changer("a1"); changer("a2");', ctx);
  v('avec du texte tapé : le texte reste, une seule signature à la fin', [nb(zone.value), zone.value], [1, 'Bonjour, voici votre accès.\n\n-- \nJustin — TEAM OP']);
}
console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);

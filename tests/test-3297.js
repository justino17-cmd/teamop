/* test-3297 — LA SIGNATURE ÉLECTRONIQUE EST « EN COURS DE MAINTENANCE » (5 novembre 2026).
 *
 * Justin : « le système de signature, vu qu'il n'était pas fini, tu vas faire une mise à jour, on le met en indisponible. Et le message,
 * ça va être en cours de maintenance. » Le module Courrier (`opcourrier.js`, monté par OP GESTION, la Tour et OP MESSAGES) lit une capacité
 * que l'HÔTE déclare, `signatureMaintenance`. Ce banc lit le CODE livré (commentaires retirés) et EXÉCUTE les vraies portes :
 *   1. la capacité ne s'allume que sur `true` (ni une chaîne, ni l'absence) ;
 *   2. `openSignRequest` et `openSignPad` (toute nouvelle demande, « Signer maintenant ») s'arrêtent en PREMIÈRE instruction : le message de
 *      maintenance, aucune feuille ouverte — et, contre-épreuve, la même fonction sans la capacité va plus loin (elle ouvre son chemin d'avant) ;
 *   3. « Relancer » répond « maintenance » ; télécharger un PDF signé, le dossier de preuve, annuler une demande restent possibles ;
 *   4. les boutons l'annoncent (« Faire signer · en maintenance », la note à la place de « Envoyer un document à signer ») ;
 *   5. les TROIS hôtes la déclarent : `app.html`, `tour.html`, la source Courrier d'OP MESSAGES ; et les deux copies du module sont identiques.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (nom, obtenu, attendu) => { const b = JSON.stringify(obtenu) === JSON.stringify(attendu); b ? ok++ : ko++; console.log((b ? '  ✓ ' : '  ✗ ') + nom + (b ? '' : '\n      attendu : ' + JSON.stringify(attendu) + '\n      obtenu  : ' + JSON.stringify(obtenu))); };
const vrai = (nom, a) => v(nom, !!a, true);
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');
const sansCom = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const BRUT = lire('opcourrier.js'), SRC = sansCom(BRUT);
const fonction = (nom) => { const i0 = SRC.indexOf('  function ' + nom + '('), i1 = SRC.indexOf('\n  function ', i0 + 10); return i0 > 0 && i1 > i0 ? SRC.slice(i0, i1) : ''; };

console.log('── 3297 · 1. la capacité, déclarée par l\'hôte ──');
const capL = (SRC.match(/CAP\.signatureMaintenance=c\.signatureMaintenance===true;/) || [])[0];
vrai('(population) la ligne de la capacité est trouvée dans le module', !!capL);
const lireCap = (c) => { const CAP = {}; new Function('CAP', 'c', capL)(CAP, c); return CAP.signatureMaintenance; };
v('true → allumée ; « true » en texte, rien, faux → éteinte', [lireCap({ signatureMaintenance: true }), lireCap({ signatureMaintenance: 'true' }), lireCap({}), lireCap({ signatureMaintenance: false })], [true, false, false, false]);

console.log('\n── 3297 · 2. les portes : nouvelle demande et « Signer maintenant » ──');
const OSR = fonction('openSignRequest'), OSP = fonction('openSignPad'), MSG = fonction('signMaintMsg'), SM = fonction('signMaint');
vrai('(population) openSignRequest, openSignPad, signMaintMsg et signMaint sont trouvées', OSR.length > 500 && OSP.length > 200 && MSG && SM);
const premiere = f => (f.split('\n')[1] || '').trim();
v('openSignRequest : la garde est la PREMIÈRE instruction', premiere(OSR), 'if(CAP.signatureMaintenance){ signMaint(); return; }');
v('openSignPad : la garde est la PREMIÈRE instruction', premiere(OSP), 'if(CAP.signatureMaintenance){ signMaint(); return; }');
const jouer = (corps, nom, maint) => {
  const W = { toasts: [], feuilles: 0, CAP: { signatureMaintenance: maint }, ACCOUNTS: [] };
  vm.createContext(W);
  vm.runInContext('function toast(t){ toasts.push(String(t)); } function makeOverlay(){ feuilles++; return { innerHTML: "" }; } function closeOverlay(){} ' + MSG + SM + corps, W);
  try { vm.runInContext(nom + '(' + (nom === 'openSignPad' ? '{ sign: {}, att: [] }' : '') + ')', W); } catch (e) { W.jete = String(e && e.message); }
  return W;
};
let W = jouer(OSR, 'openSignRequest', true);
v('⛔ nouvelle demande, en maintenance : le message, aucune feuille', [W.toasts, W.feuilles], [['La signature électronique est en cours de maintenance — elle revient bientôt. Rien n’est parti.'], 0]);
W = jouer(OSR, 'openSignRequest', false);
v('contre-épreuve sans la capacité : la même fonction suit son chemin d\'avant (sans boîte : « Ajoutez d’abord une boîte mail »)', W.toasts, ['Ajoutez d’abord une boîte mail']);
W = jouer(OSP, 'openSignPad', true);
v('⛔ « Signer maintenant », en maintenance : le message, aucune feuille', [W.toasts.length, /maintenance/.test(W.toasts[0] || ''), W.feuilles], [1, true, 0]);
W = jouer(OSP, 'openSignPad', false);
v('contre-épreuve : sans la capacité, « Signer maintenant » ouvre sa feuille', [W.feuilles >= 1, W.toasts.some(t => /maintenance/.test(t))], [true, false]);

console.log('\n── 3297 · 3. relancer : maintenance ; télécharger, la preuve, annuler : toujours possibles ──');
vrai('« Relancer » est gardé AVANT la branche qui relance', /else if\(act==="signRemind"&&CAP\.signatureMaintenance\)\{ signMaint\(\); \}\s*else if\(act==="signRemind"\)\{/.test(SRC));
vrai('« Télécharger le PDF signé », « Dossier de preuve », « Annuler la demande » ne sont pas gardés', !/act==="(signDl|signProof|signCancel)"&&CAP\.signatureMaintenance/.test(SRC));

console.log('\n── 3297 · 4. les boutons le disent ──');
vrai('le bouton « Faire signer » d\'un message : « · en maintenance », aria-disabled, l\'infobulle dit pourquoi', /data-act="signFrom"'\+\(CAP\.signatureMaintenance\?' aria-disabled="true" title="'\+H\(signMaintMsg\(\)\)\+'"':''\)\+'>'\+I\.sign\+'<span>Faire signer'\+\(CAP\.signatureMaintenance\?' · en maintenance':''\)/.test(SRC));
vrai('le bouton « Faire signer » d\'un nouveau message : le même libellé', /id="cSignBtn" type="button"'\+\(CAP\.signatureMaintenance\?' aria-disabled="true" title="'\+H\(signMaintMsg\(\)\)\+'"':''\)\+'>'\+I\.sign\+'<span>Faire signer'\+\(CAP\.signatureMaintenance\?' · en maintenance':''\)/.test(SRC));
vrai('le dossier Signatures : la note de maintenance À LA PLACE de « Envoyer un document à signer »', /f\.id==="sign"&&!state\.query\?\(CAP\.signatureMaintenance\?'<p class="sign-maint-note" role="note"[^']*'\+H\(signMaintMsg\(\)\)\+'<\/p>':'<button type="button" class="btn primary" data-signnew="1"/.test(SRC));

console.log('\n── 3297 · 5. les trois hôtes la déclarent ; les copies du module sont identiques ──');
const APP = sansCom(lire('app.html')), TOUR = sansCom(lire('tour.html')), MSGS = sansCom(lire('server-msg/public/source-serveur.js'));
vrai('OP GESTION (app.html) : capacites() déclare signatureMaintenance:true', /return \{oauth:via\.length>0,oauthVia:via,boutonsFournisseurs:true,gererBoites:true,programmeServeur:false,signature:false,signatureMaintenance:true,/.test(APP));
vrai('la Tour : capacites() déclare signatureMaintenance:true', /return \{oauth:false,programmeServeur:false,signature:pret,signatureMaintenance:true,/.test(TOUR));
v('OP MESSAGES : les deux formes de la source du Courrier la déclarent', (MSGS.match(/signature: false, signatureMaintenance: true,/g) || []).length, 2);
v('les copies du module (aperçu, OP MESSAGES) sont identiques à opcourrier.js', [lire('apercu/opcourrier.js') === BRUT, lire('server-msg/public/opcourrier.js') === BRUT], [true, true]);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);

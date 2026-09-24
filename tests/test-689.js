/* ══ L'ÉCRAN LE PLUS DESTRUCTEUR DE L'APPLICATION N'AVAIT AUCUNE BARRIÈRE ═════════════════
   Demande de Justin, 15 septembre 2026 : « je veux que ça demande un code par mail pour
   éviter les problèmes ».

   Paramètres → Synchronisation, trois boutons, aucune protection :
     · « Enregistrer la clé » avec une autre valeur → TOUTES les données de l'entreprise
       deviennent définitivement illisibles, sur tous ses appareils à la fois. Le nuage ne
       stocke que du chiffré : sans la bonne clé, rien n'est récupérable.
     · « Rétablir la clé par défaut » → pire : il remet l'entreprise sur la clé écrite EN
       CLAIR dans app.html, et rend illisible ce qui a été chiffré depuis. Ce bouton-là ne
       demandait même pas confirmation.
     · « Désactiver sur cet appareil » → l'appareil cesse de recevoir ET d'envoyer ; le
       travail fait ici ne rejoint plus l'équipe.

   Le code part à l'adresse enregistrée POUR L'ENTREPRISE, pas à celle de TEAM OP : ce qu'on
   prouve, c'est qu'on répond de cet espace — pas qu'on a le téléphone en main. */
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..');
const APP = fs.readFileSync(path.join(R, 'app.html'), 'utf8');
const SRV = fs.readFileSync(path.join(R, 'server', 'index.js'), 'utf8');
let ok = 0, ko = 0;
function v(nom, recu, attendu) {
  const bon = JSON.stringify(recu) === JSON.stringify(attendu);
  if (bon) { ok++; console.log('  ✓ ' + nom); }
  else { ko++; console.log('  ✗ ' + nom + '\n      attendu ' + JSON.stringify(attendu) + '\n      reçu    ' + JSON.stringify(recu)); }
}

console.log('\n── 689 · changer la clé d\'équipe demande un code par courriel ──');

/* ── Le serveur ── */
v('la route existe', /app\.post\('\/api\/espaces\/cle\/code'/.test(SRV), true);
v('⛔ elle exige la preuve de la clé actuelle, par la garde commune',
  /const refus = sauvRefus\(t, kh, 'changement de clé'\)/.test(SRV), true);
v('⛔ le code part à l\'adresse de L\'ENTREPRISE, pas à celle de TEAM OP',
  /const dest = String\(\(e && e\.email\) \|\| ''\)\.trim\(\);/.test(SRV), true);
/* ⛔ Sur une action irréversible, échouer fermé est la seule position tenable. */
v('⛔ sans adresse enregistrée, on REFUSE au lieu de laisser passer',
  /if \(!dest\) return res\.status\(409\)/.test(SRV), true);
v('le courriel dit ce que ça détruit, pas juste « voici un code »',
  /rend les données de ton entreprise ILLISIBLES sur tous ses appareils/.test(SRV), true);
v('… et quoi faire si ce n\'est pas toi', /N\\'ENVOIE PAS CE CODE et préviens TEAM OP/.test(SRV), true);
/* ⛔ LA GARDE EST FACTORISÉE DEPUIS LE 20 SEPTEMBRE 2026, ET CE BANC A DÛ SUIVRE. Ces deux
   contrôles visaient la forme EN LIGNE (`cleCodes.delete(t)`, `cleCodes.set(t, …)`) : ils sont
   passés au rouge le jour où le même code a été sorti dans `cleCodeDemander`/`cleCodeVerifier`,
   alors que la garde n'avait pas bougé d'un iota — elle garde même une route DE PLUS
   (`/api/monitor/op/revenir`, la seule qui écrive dans la base métier d'un client depuis la
   Tour). Un motif ancré sur une FORME tombe à la première factorisation ; on ancre donc sur la
   RÈGLE, et on exige en plus qu'il n'y ait toujours qu'UNE réserve de codes. */
v('cinq essais puis le code meurt', /c\.tries\+\+; if \(c\.tries >= 5\) cleCodes\.delete\(sujet\)/.test(SRV), true);
v('dix minutes de validité', /exp: Date\.now\(\) \+ 10 \* 60000/.test(SRV) && /cleCodes\.set\(sujet, \{ code, exp/.test(SRV), true);
/* ⚠️ ANCRÉ SUR LA RÈGLE, PAS SUR LA FORME — et ce motif est tombé le jour même où le code a
   appris à EMPORTER les nombres du consentement (`return { ok: true, garde }`). La règle gardée
   est « un code juste est consommé » : c'est le `delete` avant le retour réussi qui la porte,
   pas la liste exacte des champs rendus. Un motif qui décrit une forme tombe à la première
   évolution, et fait croire à une régression qui n'existe pas. */
v('⛔ et un code JUSTE se consomme — sinon il vaut dix usages pendant dix minutes',
  /cleCodes\.delete\(sujet\);\s*\n\s*return \{ ok: true[,}]/.test(SRV), true);
/* ⛔ ET CE QUE LE CODE EMPORTE LUI REVIENT : sans ça, l'appelant ne peut comparer l'instant
   présent qu'à lui-même — deux valeurs identiques par construction, donc un contrôle qui ne
   peut jamais se déclencher. C'est le défaut qu'a eu la première version du garde-fou d'écart. */
v('⛔ le code emporte ce sur quoi on a consenti, et le rend',
  /tries: 0, garde: garde \|\| null/.test(SRV) && /const garde = c\.garde \|\| null;/.test(SRV), true);
/* ⛔ UNE SEULE RÉSERVE DE CODES. Un second `Map` pour le retour voudrait dire deux expirations,
   deux compteurs d'essais, deux ménages — donc, un jour, un code qui n'expire pas quelque part.
   Les usages se distinguent par un PRÉFIXE de sujet, jamais par une réserve de plus. */
v('⛔ une seule réserve de codes dans tout le serveur',
  (SRV.match(/new Map\(\);\s*\/\/ 't' -> \{ code, exp, tries \}/g) || []).length, 1);
v('⛔ le changement de clé passe par la garde commune, il ne la recopie pas',
  /const sujet = 'cle:' \+ t;/.test(SRV) && /cleCodeVerifier\(sujet, codeRecu\)/.test(SRV), true);
/* ⛔ ET LE RETOUR EN ARRIÈRE EST GARDÉ PAR LA MÊME FONCTION, INJECTÉE — pas recopiée. C'est la
   condition que `op-socle.js` s'était posée à lui-même et qui l'a tenu absent pendant tout ce
   temps : deux gardes qui se ressemblent finissent par diverger, et c'est toujours la moins
   sévère qui garde le chemin le plus dangereux. */
const OPS = fs.readFileSync(path.join(R, 'server', 'op-socle.js'), 'utf8');
v('⛔ la garde du code est INJECTÉE dans op-socle, pas réécrite',
  /cleCodeDemander, cleCodeVerifier, espaceContact \} = deps;/.test(OPS)
  && !/crypto\.randomInt\(100000/.test(OPS), true);
v('⛔ le sujet du code porte l\'INSTANT visé — un code d\'une date ne vaut pas pour une autre',
  /const sujet = 'retour:' \+ t \+ ':' \+ instant;/.test(OPS), true);
v('⛔ sans adresse enregistrée, le retour REFUSE lui aussi',
  /if \(!contact\.email\) return res\.status\(409\)/.test(OPS), true);
v('⛔ le code ne part jamais au journal', /trace: 'code de changement de clé · espace '/.test(SRV), true);

/* ── L'application ── */
const g = APP.slice(APP.indexOf('async function cleCodeExiger'), APP.indexOf('async function syncSetSecret'));
v('la barrière existe', g.length > 200, true);
/* ⚠️ sauvKh() rend null sans clé PERSONNALISÉE — soit exactement l'entreprise encore sur la
   clé par défaut, celle qu'on veut justement aider à en poser une propre. */
v('⛔ elle prouve la clé EFFECTIVE, pour ne pas bloquer la migration',
  /kh:await sha256\(syncSecret\(\)\)/.test(g) && !/=await sauvKh\(\)/.test(g), true);
v('⛔ serveur injoignable → on ne laisse PAS passer', /Serveur injoignable[^']*/.test(g) && /return false;/.test(g), true);
v('⛔ code refusé → rien n\'a été changé', /Code refusé — rien n\\'a été changé/.test(g), true);
v('l\'écran dit à quelle adresse le code est parti', /\+\(j\.dest\|\|/.test(g), true);

/* Les trois boutons passent par elle — un seul oublié et la barrière ne sert à rien. */
v('⛔ « Enregistrer la clé » et « Rétablir par défaut » y passent',
  /async function syncSetSecret\(\)\{[\s\S]{0,400}if\(!await cleCodeExiger\(/.test(APP), true);
v('… et les deux cas sont nommés distinctement dans la demande',
  /Enregistrer une nouvelle clé d\\'équipe':'Rétablir la clé PAR DÉFAUT \(clé partagée\)'/.test(APP), true);
v('⛔ « Désactiver sur cet appareil » aussi',
  /async function syncDisable\(\)\{\s*\n\s*if\(!await cleCodeExiger\('Désactiver la synchronisation sur cet appareil'\)\) return;/.test(APP), true);
v('⛔ et plus aucune de ces trois actions n\'écrit avant la barrière',
  /if\(!await cleCodeExiger[\s\S]{0,300}localStorage\.removeItem\('elan_sync_secret'\)/.test(APP), true);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);

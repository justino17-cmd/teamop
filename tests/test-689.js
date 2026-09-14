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
v('cinq essais puis le code meurt', /c\.tries\+\+; if \(c\.tries >= 5\) cleCodes\.delete\(t\)/.test(SRV), true);
v('dix minutes de validité', /exp: Date\.now\(\) \+ 10 \* 60000/.test(SRV) && /cleCodes\.set\(t, \{ code, exp/.test(SRV), true);
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

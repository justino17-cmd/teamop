/* ══ 678 · UN LIEN QU'ON DONNE À QUELQU'UN NE PORTE JAMAIS DE SECRET ═══════════════════════
   14 septembre 2026, signalé par Justin capture à l'appui. La fiche « Accès de … », affichée
   juste après la création d'un compte, montrait :

       https://teamop.fr/app.html#entreprise=eyJ0IjoiZWxhbi0zNG9jIiwiayI6…

   Ce base64 porte `k` — LA CLÉ QUI DÉCHIFFRE TOUTES LES DONNÉES DE L'ENTREPRISE. Et cette
   fiche existe pour être COPIÉE : bouton « Copier pour lui envoyer », collée dans un SMS, un
   WhatsApp, un mail personnel.

   ⚠️ CE QUI REND CE DÉFAUT INSTRUCTIF : le serveur avait cessé d'envoyer ce lien par courriel
   le 12 septembre, commentaire à l'appui. Le correctif n'avait été fait que d'un côté, et
   personne ne l'a vu pendant deux jours parce que l'écran, lui, n'avait pas été regardé.
   C'est la règle de CLAUDE.md, mot pour mot : « avant de faire refuser une route, aller
   REGARDER au navigateur ce que l'écran affiche ».

   Les fonctions sont EXTRAITES du vrai app.html et exécutées. `localStorage` est simulé — ce
   qu'on éprouve, c'est la décision, pas le navigateur. */
const fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
function v(nom, recu, attendu) {
  const bon = JSON.stringify(recu) === JSON.stringify(attendu);
  if (bon) { ok++; console.log('  ✓ ' + nom); }
  else { ko++; console.log('  ✗ ' + nom + '\n      attendu ' + JSON.stringify(attendu) + '\n      reçu    ' + JSON.stringify(recu)); }
}
console.log('\n── 678 · aucune clé d\'entreprise dans un lien qu\'on transmet ──');

const extrait = (re, quoi) => { const m = SRC.match(re); if (!m) { console.log('  ✗ ' + quoi + ' introuvable dans app.html'); ko++; return ''; } return m[0]; };
const fSansSecret = extrait(/function lienSansSecret\(x\)\{[^\n]*\}/, 'lienSansSecret');
const fLisible    = extrait(/function lienLisible\(\)\{[^\n]*\}/, 'lienLisible');
const fConnexion  = extrait(/function lienConnexionEntreprise\(\)\{[^\n]*\}/, 'lienConnexionEntreprise');

if (fSansSecret && fLisible && fConnexion) {
  const faire = (stock) => {
    const ls = { getItem: (k) => (Object.prototype.hasOwnProperty.call(stock, k) ? stock[k] : null) };
    /* teamopLienActuel EXISTE dans l'application et rend un lien porteur de clé. On le fournit
       donc ici, bien vivant : le contrôle n'a de valeur que si la tentation est présente. */
    const src = 'const localStorage=arguments[0];'
      + 'function teamopLienActuel(){ return "https://teamop.fr/app.html#entreprise=BASE64AVECLACLE"; }'
      + fSansSecret + '\n' + fLisible + '\n' + fConnexion
      + '\nreturn {lienSansSecret,lienLisible,lienConnexionEntreprise,teamopLienActuel};';
    return new Function(src)(ls);
  };

  // ── 1. La garde elle-même
  const g = faire({});
  v('⛔ un lien #entreprise= est refusé', g.lienSansSecret('https://teamop.fr/app.html#entreprise=eyJ0IjoiZWxhbi0zNG9j'), '');
  v('⛔ un lien #e= aussi', g.lienSansSecret('https://teamop.fr/app.html#e=elan'), '');
  v('✅ une adresse ordinaire passe', g.lienSansSecret('https://teamop.fr/e/elan'), 'https://teamop.fr/e/elan');

  // ── 2. Le cache des appareils déjà en service — le cas qui dure 24 h après la publication
  const vieux = faire({ elan_sync_team: 'elan-34oc', elan_lien_lisible_t: 'elan-34oc',
                        elan_lien_lisible: 'https://teamop.fr/app.html#entreprise=BASE64AVECLACLE' });
  v('⛔ un ANCIEN lien déjà en cache ne ressort pas', vieux.lienLisible(), '');
  v('⛔ et la fiche ne le propose pas non plus', vieux.lienConnexionEntreprise(), 'https://teamop.fr/connexion.html');

  // ── 3. Le cas normal
  const bon = faire({ elan_sync_team: 'elan-34oc', elan_lien_lisible_t: 'elan-34oc',
                      elan_lien_lisible: 'https://teamop.fr/e/elan' });
  v('✅ l\'adresse de l\'entreprise est bien rendue', bon.lienConnexionEntreprise(), 'https://teamop.fr/e/elan');

  // ── 4. LE CONTRE-TEST QUI COMPTE : aucun repli vers le lien à clé, même sans adresse connue
  const sans = faire({ elan_sync_team: 'elan-34oc' });
  v('⛔ sans adresse connue, AUCUN repli sur le lien porteur de clé',
    /#entreprise=/.test(sans.lienConnexionEntreprise()), false);
  v('✅ on renvoie l\'écran de connexion à la place', sans.lienConnexionEntreprise(), 'https://teamop.fr/connexion.html');
  /* Et la preuve que la tentation était bien là : teamopLienActuel, fourni au banc, rend
     toujours un lien à clé. Si ce contrôle tombait, c'est que le banc s'est vidé de son sens. */
  v('(le banc fournit bien un teamopLienActuel porteur de clé)', /#entreprise=/.test(sans.teamopLienActuel()), true);
}

// ── 5. Ce que le FICHIER LIVRÉ contient — l'exécution ne couvre pas le balisage
v('⛔ le courriel n\'envoie plus le lien porteur de clé au serveur',
  /lien:\(typeof teamopLienActuel/.test(SRC), false);
v('⛔ lienConnexionEntreprise n\'a plus de repli teamopLienActuel',
  /function lienConnexionEntreprise\(\)\{[^\n]*teamopLienActuel/.test(SRC), false);
v('✅ la fiche dit « Adresse de l\'entreprise »', /frow-lbl">Adresse de l'entreprise</.test(SRC), true);
v('✅ et le texte copié aussi', /Adresse de l\\'entreprise : '\+lien/.test(SRC), true);
v('⛔ plus aucun libellé « Lien de connexion » sur la fiche d\'accès',
  /frow-lbl">Lien de connexion</.test(SRC), false);
/* teamopLienActuel n'est PAS supprimée : elle sert encore de condition (« cet appareil est-il
   rattaché à un espace ? »). Ce qui est interdit, c'est d'en AFFICHER la valeur. */
v('✅ teamopLienActuel existe toujours (elle sert de condition)', /function teamopLienActuel\(\)\{/.test(SRC), true);
v('⛔ mais sa valeur n\'est jamais affichée ni copiée',
  /(esc\(\s*teamopLienActuel|textContent\s*=\s*teamopLienActuel|teamopCopy\(\s*teamopLienActuel)/.test(SRC), false);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);

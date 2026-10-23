/* ⛔ CE QUE CE FICHIER GARDE — LES PAGES JURIDIQUES DISENT CE QUI PART VRAIMENT CHEZ ANTHROPIC (23 octobre 2026).
     Relecture adverse de Léa et de Camille : `registre-traitements.html` et `sous-traitance.html` écrivaient « jamais le prénom ni le nom de la personne » au même
     endroit que « le texte d'un courriel reçu », alors que Camille envoie le corps du courriel (6 000 caractères), signature comprise : seuls les adresses
     électroniques et les numéros de téléphone sont retirés (`agents-connaissance.js`, `sansAdresses` / `sansTel`). Les deux textes se contredisaient, et ils engagent
     TeamOP. Ce banc lit le TEXTE rendu des deux pages (balises retirées) et exige la vérité : le courriel reçu part tel quel, signature comprise ; le « jamais le
     prénom ni le nom » ne vaut que pour l'inscription et la demande d'application. Il ne dit rien du code : que `sansAdresses` et `sansTel` fassent bien ce qu'on
     dit est gardé par `test-2863` § 2.
     Il lit des fichiers de la RACINE que `main` ne sert pas encore : comme `test-2865`, il n'est pas dans `scripts/bancs-serveur.liste` et tourne dans la suite complète. */
'use strict';
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  \u2713 ' + t); } else { ko++; console.log('  \u2717 ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' \u2014 ' + String(d).slice(0, 200) : ''), !!c, true);

console.log('\n\u2500\u2500 2867 \u00b7 les pages juridiques disent ce qui part vraiment chez Anthropic \u2500\u2500');
const texte = f => fs.readFileSync(path.join(RACINE, f), 'utf8').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').replace(/'/g, '\u2019');
for (const f of ['sous-traitance.html', 'registre-traitements.html', 'apercu/sous-traitance.html', 'apercu/registre-traitements.html']) {
  const T = texte(f), i = T.indexOf('Anthropic PBC'), ligne = i >= 0 ? T.slice(i, i + 3200) : '';
  vrai('(population) ' + f + ' : la ligne Anthropic est trouvée', ligne.length > 800 && /courriel re\u00e7u/.test(ligne), ligne.length);
  vrai('\u26d4 ' + f + ' : le courriel re\u00e7u part \u00ab tel quel, signature comprise \u00bb (pr\u00e9nom, nom, soci\u00e9t\u00e9, adresse postale)', /tel quel, signature comprise/.test(ligne) && /pr\u00e9nom, nom, soci\u00e9t\u00e9/.test(ligne) && /adresse postale/.test(ligne));
  vrai('\u2026 seuls les adresses \u00e9lectroniques et les num\u00e9ros de t\u00e9l\u00e9phone sont retir\u00e9s', /adresses \u00e9lectroniques et les num\u00e9ros de t\u00e9l\u00e9phone/.test(ligne));
  vrai('\u2026 et l\u2019adresse et le nom de l\u2019EXP\u00c9DITEUR lus dans l\u2019en-t\u00eate ne sont pas transmis', /(adresse|nom)[^.;]{0,60}en-t\u00eate/.test(ligne));
  vrai('\u26d4 \u2026 le \u00ab jamais le pr\u00e9nom ni le nom \u00bb est limit\u00e9 \u00e0 l\u2019inscription et \u00e0 la demande (champs fixes), jamais dit du courriel re\u00e7u',
    /inscription[^;]*jamais l\u2019adresse[^;]*pr\u00e9nom ni le nom/i.test(ligne) && !/courriel re\u00e7u[^;\u00b7]*jamais l\u2019adresse \u00e9lectronique, le t\u00e9l\u00e9phone, le pr\u00e9nom ni le nom/i.test(ligne), ligne.slice(0, 500));
}

console.log('\n' + ok + ' \u2713  ' + ko + ' \u2717');
process.exit(ko ? 1 : 0);

// Sonde « secu-mots » (double authentification, étape 2, § 10 et annexe A) : les mots de tous les jours, et aucune promesse d'absolu.
// A. les phrases témoins de l'annexe A (connexion, activation, confirmation, téléphone, verrouillage, équipe) : chacune est écrite mot pour mot dans le fichier,
//    et celles d'un écran qu'on peut jouer ici sont retrouvées DANS L'ÉCRAN (un parcours enregistre tout texte que montrent #cnx, #opsec, le toast et la fiche).
// B. aucun mot interdit dans ce qui s'affiche : mots d'ingénierie, promesses (« 100 % », « inviolable »…), « vous », « Team OP », « Authenticator », « Espace sécurisé », « Oups », point d'exclamation ;
//    et le mot « double authentification » une seule fois, sur l'écran « Active OP Security ».
// Population : le nombre de textes distincts enregistrés (jamais un zéro sur un ensemble vide).
const fs = require('fs'), path = require('path');
const S = require('./secu-commun.js'), L = S.L, v = L.v;
const src = fs.readFileSync(path.join(L.RACINE, 'apercu', 'prototype-op-gestion.html'), 'utf8');
const nette = src.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/\/\*[^\n]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const CH = t => String(t).replace(/\d+/g, '#').toLowerCase();   /* le parcours enregistre les textes avec les nombres remplacés par # (un compte à rebours ne se compare pas), et le CSS met des titres en majuscules */
const N = t => String(t).replace(/[  ]/g, ' ').replace(/\s+/g, ' ').replace(/&nbsp;/g, ' ');
const ANNEXE = {
  connexion:['Accès réservé à l’équipe. Après ton mot de passe, tu confirmes sur ton téléphone avec OP Security.', 'Identifiant ou mot de passe incorrect, ou compte verrouillé. Si tu es sûr de toi, préviens ton administrateur.', 'Ton mot de passe provisoire a expiré. Demande-en un nouveau à ton administrateur.', 'Trop de demandes de connexion. Attends quelques minutes avant de réessayer.', 'Demande à l’administrateur de ton entreprise de te donner un nouveau mot de passe provisoire : il le fait dans Équipe, sur ta fiche. Pense à lui montrer une pièce d’identité.'],
  activation:['Active OP Security', 'À partir de maintenant, chaque connexion se confirme sur ton téléphone. C’est obligatoire pour tout le monde, y compris le gérant. (C’est ce qu’on appelle la double authentification.)', 'Installe OP Security sur ton téléphone', 'Ouvre-la et choisis un code PIN', 'Scanne ce code d’activation', 'Il ne sert qu’une fois et expire dans 15 minutes. Il ne contient aucun secret.', 'J’ai activé l’application', 'Dernière étape', 'Il n’y a pas de code de secours : ton téléphone est ta clé.', 'Enregistrer et entrer', 'Trop court : 12 caractères au minimum, sans compter les espaces.'],
  confirmation:['Confirme sur ton téléphone', 'Cette page se met à jour toute seule dès que tu as approuvé.', 'Le téléphone n’a pas de réseau ?', 'Connexion inhabituelle détectée', 'L’approbation sur le téléphone est obligatoire.', 'Connexion inhabituelle : seul le téléphone peut l’approuver, pas le code à 6 chiffres.', 'Mauvais nombre tapé sur le téléphone : la connexion a été annulée par sécurité.', 'Appareil jamais utilisé pour ce compte', 'Réseau (adresse) jamais utilisé', 'En dehors des heures de travail habituelles (7 h – 21 h)', 'Plusieurs mots de passe faux juste avant'],
  telephone:['Choisis un code PIN', 'Confirme le code PIN', 'Activer ce téléphone', 'Scanner le code d’activation', 'Tape le nombre affiché sur l’écran de l’ordinateur :', 'Approuver', 'Ce n’est pas moi', 'Bloquer cette connexion ? Ton compte sera verrouillé et toutes tes connexions fermées. Un administrateur devra changer ton mot de passe.', 'Mauvais nombre : la demande est annulée par sécurité.', 'Code à 6 chiffres (si l’ordinateur le demande)', 'Trop de codes PIN erronés : le compte a été effacé de ce téléphone. Demande à un administrateur de te donner un nouveau téléphone.'],
  verrouillage:['Tes connexions ont été fermées : une connexion a été bloquée depuis ton téléphone. Ton compte est verrouillé jusqu’à ce qu’un administrateur change ton mot de passe.', 'Par sécurité, ta connexion a été fermée : elle a été utilisée depuis un autre navigateur. Reconnecte-toi.', 'Tu as été déconnecté : 15 minutes sans rien toucher. Reconnecte-toi.'],
  demonstration:['Rien de ceci n’existe dans la vraie application. Recharge la page : tout repart de zéro.', 'Je me connecte depuis un autre ordinateur', 'Je me connecte en pleine nuit', 'Faire avancer l’horloge', 'Recommencer la démonstration']   /* « Simuler une connexion pirate » et « Simuler le vol de ma connexion » sont les boutons de l'étape 3 (lot B1) */
};
const INTERDITS = [
  ['mot d’ingénierie', /\b(session|sessions|token|tokens|hash|empreinte|chiffrement|ECDH|HKDF|PBKDF2|AES|cookie|cookies|authentificateur|2FA|MFA|TOTP|HOTP|RFC|serveur|API|backend)\b/i],
  ['promesse d’absolu', /100 ?%|inviolable|impénétrable|infaillible|garanti|totalement sécuris|entièrement sécuris|parfaitement sécuris/i],
  ['vouvoiement', /\b(vous|votre|vos|veuillez)\b/i],
  ['nom d’une autre marque', /Team OP|Authenticator|Espace sécurisé|Microsoft|Authy/],
  ['ton de panique', /Oups|\w!(\s|$)|!!/]
];
(async () => {
  console.log('\n── A1. l’annexe A : chaque phrase est écrite mot pour mot dans le fichier ──');
  const tout = Object.values(ANNEXE).flat(); const code = N(nette.replace(/<\/?(b|i|em|strong|span|code|small|u)\b[^>]*>/g, ''));   /* sans les balises : « <b>Bloquer cette connexion ?</b> Ton compte… » est une seule phrase à l'écran */
  v('population : ' + tout.length + ' phrases témoins dans 6 groupes', tout.length >= 40 && Object.keys(ANNEXE).length === 6, tout.length);
  // une phrase écrite en deux morceaux dans le code (concaténation, balises) ne se retrouve pas telle quelle : on cherche ses 40 premiers signes, puis ses 30 derniers
  for (const ph of tout) { const t = N(ph), debut = t.slice(0, 40), fin = t.slice(-30);
    const entier = code.includes(t) || code.includes(t.replace(/ ([:?!;])/g, '$1')) || code.includes(t.replace(/ ([:?!;])/g, '&nbsp;$1'));
    const morceaux = t.split(/\d+/).filter(x => x.trim().length >= 8);   /* un nombre écrit par une règle (« 12 caractères ») est un morceau de moins */
    v('écrite dans le fichier : « ' + ph.slice(0, 70) + (ph.length > 70 ? '…' : '') + ' »', entier || (code.includes(debut) && code.includes(fin)) || (morceaux.length >= 2 && morceaux.every(m => code.includes(m.trim()))), 'ni entière ni par ses deux bouts'); }

  console.log('\n── A2/B. un parcours qui montre tous les écrans, texte enregistré à chaque changement ──');
  const c = await S.ouvrir({ profil:'mac' });
  await c.p.evaluate(() => { window.__t = new Set(); const noter = () => { for (const s of ['#cnx', '#opsec', '#toast', '#calque', '#contenu']) { const e = document.querySelector(s); if (e) { const t = (e.innerText || '').replace(/\d+/g, '#').replace(/\s+/g, ' ').trim(); if (t) window.__t.add(s + '\u0001' + t); } } };
    let q = 0; new MutationObserver(() => { if (q) return; q = requestAnimationFrame(() => { q = 0; noter(); }); }).observe(document.body, { subtree:true, childList:true, characterData:true, attributes:false }); noter(); window.__noter = noter; });
  const note = () => c.p.evaluate(() => window.__noter());
  // l'écran de connexion et ses refus
  await S.connecter(c, 'marc', ''); await S.connecter(c, 'marc', 'pas-le-bon'); await note();
  await c.p.click('[data-cnx="oubli"]'); await c.p.waitForTimeout(300); await note();
  const provTom = await S.provisoire(c, 'tl'); await c.p.evaluate(() => { eqDe('tl').actif = false; }); await S.connecter(c, 'tom', provTom); await c.p.evaluate(() => { eqDe('tl').actif = true; }); await note();
  const provSm = await S.provisoire(c, 'sm'); await c.p.evaluate(() => { SECU.decalage += 4 * 86400000; }); await S.connecter(c, 'sophie', provSm); await note(); await c.p.evaluate(() => { SECU.decalage = 0; });
  // l'activation de Marc, pas à pas (écran A, téléphone neuf, PIN, activer, B, C)
  const prov = await S.provisoire(c, 'marc'); await S.connecter(c, 'marc', prov); await S.attendreSel(c, '#cn-form-activer', 6000); await note();
  await c.p.click('#cn-form-activer button[type=submit]'); await c.p.waitForTimeout(250); await note();
  await S.telephone(c, 'marc'); await note(); await c.p.evaluate(() => document.querySelector('#opsec [data-ops="commencer"]').click()); await note();
  await S.pin(c, '123456'); await note(); await S.pin(c, '135792'); await S.pin(c, '135793'); await note(); await S.pin(c, '135792'); await S.pin(c, '135792'); await note();
  await c.p.evaluate(() => document.querySelector('#opsec [data-ops="saisir-code"]').click()); await note();
  await c.p.evaluate(() => { const f = document.querySelector('#opsec [data-ops="form-activation"]'); f.querySelector('[data-ops="code-champ"]').value = 'ABCD'; f.requestSubmit(); }); await c.p.waitForTimeout(300); await note();
  await c.p.evaluate(() => { const f = document.querySelector('#opsec [data-ops="form-activation"]'); f.querySelector('[data-ops="code-champ"]').value = 'ABCD-EFGH-JKMN'; f.requestSubmit(); }); await c.p.waitForTimeout(300); await note();
  const cod = await c.p.evaluate(() => document.querySelector('[data-sec="code-activation"]').textContent.trim());
  await c.p.evaluate(cod => { const f = document.querySelector('#opsec [data-ops="form-activation"]'); f.querySelector('[data-ops="code-champ"]').value = cod; f.requestSubmit(); }, cod); await c.p.waitForTimeout(1500); await note();
  await S.fermerTel(c); await c.p.click('#cn-form-activer button[type=submit]'); await S.attendreSel(c, '#cn-form-verifier', 6000); await note();
  await c.p.fill('#cn-code6', '000000'); await c.p.click('#cn-form-verifier button[type=submit]'); await c.p.waitForTimeout(300); await note();
  const code6 = await c.p.evaluate(() => secuTotp(SECU.comptes.marc.tel.cle, secuMaint())); await c.p.fill('#cn-code6', code6); await c.p.click('#cn-form-verifier button[type=submit]'); await S.attendreSel(c, '#cn-form-premier', 6000); await note();
  for (const [a, b] of [['abc', 'abc'], ['azerty123456', 'azerty123456'], ['aaaaaaaaaaaa', 'aaaaaaaaaaaa'], ['Phrase-longue-un', 'Phrase-longue-deux']]) { await c.p.fill('#cn-n1', a); await c.p.fill('#cn-n2', b); await c.p.click('#cn-form-premier button[type=submit]'); await c.p.waitForTimeout(250); await note(); }
  const perso = 'Phrase-longue-et-solide-2026'; await c.p.fill('#cn-n1', perso); await c.p.fill('#cn-n2', perso); await c.p.click('#cn-form-premier button[type=submit]'); await S.attendreApp(c, 15000, true); await note();
  // la connexion de tous les jours, le mauvais nombre, l'inhabituelle, « Ce n'est pas moi », la déconnexion, l'inactivité
  await c.p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await c.p.evaluate(() => sessionFermer('deconnexion')); await S.attendreSel(c, '#cn-id', 8000); await note();
  await S.connecter(c, 'marc', perso); const n1 = await S.lireNombre(c); await note(); await S.deverrouiller(c, 'marc', '135792'); await note();
  const faux = String(n1 === '10' ? 11 : Number(n1) - 1); await c.p.evaluate(n => { const i = document.querySelector('#opsec [data-ops="nombre-champ"]'); i.value = n; i.dispatchEvent(new Event('input', { bubbles:true })); document.querySelector('#opsec [data-ops="approuver"]').click(); }, faux); await c.p.waitForTimeout(600); await note();
  await S.attendreSel(c, '#cn-id', 8000); await c.p.evaluate(() => { SECU.cases.autre = true; SECU.cases.nuit = true; });
  await S.connecter(c, 'marc', perso); await S.lireNombre(c); await note(); await c.p.evaluate(() => { document.querySelector('#opsec [data-ops="pas-moi"]').click(); }); await c.p.waitForTimeout(300); await note();
  await c.p.evaluate(() => { const b = document.querySelector('#opsec [data-ops="annuler"]'); if (b) b.click(); }); await c.p.waitForTimeout(200); await note();
  await c.p.evaluate(() => { document.querySelector('#opsec [data-ops="pas-moi"]').click(); }); await c.p.waitForTimeout(200);
  await c.p.evaluate(() => { const b = document.querySelector('#opsec [data-ops="bloquer"]'); if (b) b.click(); }); await c.p.waitForTimeout(1200); await note();
  await c.p.evaluate(() => { SECU.cases.autre = false; SECU.cases.nuit = false; });
  // « Plusieurs mots de passe faux juste avant » : deux mots de passe faux de Karim, puis son bon mot de passe depuis l'autre ordinateur
  await c.p.evaluate(() => { SECU.sessions = {}; SECU.comptes.lr.verrou = null; });
  await S.attendreSel(c, '#cn-id', 6000); const mkb = await S.provisoire(c, 'kb'); await S.connecter(c, 'kb', 'faux-1'); await S.connecter(c, 'kb', 'faux-2'); await note(); await S.connecter(c, 'kb', mkb); await S.lireNombre(c); await note();
  await c.p.evaluate(() => { document.querySelector('[data-cnx="annuler-demande"]').click(); }); await S.attendreSel(c, '#cn-id', 6000);
  // « Trop de demandes de connexion » : six demandes en un quart d'heure, la septième est refusée
  await c.p.evaluate(() => { for (let i = 0; i < 6; i++) secuDemander('kb', 'connexion'); }); await S.connecter(c, 'kb', mkb); await c.p.waitForTimeout(300); await note();
  // cinq PIN faux : le téléphone de Karim s'efface
  await S.telephone(c, 'kb'); for (let i = 0; i < 5; i++) await S.pin(c, '11122' + i); await c.p.waitForTimeout(300); await note();
  await c.p.evaluate(() => { SECU.sessions = {}; }); await note();
  const textes = await c.p.evaluate(() => [...window.__t].map(x => { const i = x.indexOf('\u0001'); return { ou:x.slice(0, i), t:x.slice(i + 1) }; })), ecr = textes.filter(x => x.ou !== '#contenu');
  v('population : ' + textes.length + ' textes distincts enregistrés (écran de connexion, téléphone, toasts)', ecr.length >= 25, ecr.length);
  const tousEcr = CH(N(ecr.map(x => x.t).join(' | ')));
  const att = { connexion:ANNEXE.connexion, activation:ANNEXE.activation, confirmation:ANNEXE.confirmation, telephone:ANNEXE.telephone, demonstration:ANNEXE.demonstration };
  let rejouees = 0, ailleurs = [];
  for (const [g, l] of Object.entries(att)) for (const ph of l) { const t = CH(N(ph)); if (tousEcr.includes(t)) rejouees++; else ailleurs.push(g + ' : ' + ph.slice(0, 50)); }
  v('A2 : ' + rejouees + ' phrases de l’annexe sont retrouvées DANS l’écran pendant le parcours (le reste : un état hors de portée de cette sonde — dit)', rejouees >= 30, ailleurs);
  console.log('   (non rejouées ici : ' + ailleurs.length + ')'); ailleurs.forEach(a => console.log('     · ' + a));
  const exclam = [];
  for (const [nom, re] of INTERDITS) { const t = ecr.filter(x => re.test(x.t.replace(/^.*?(?=[A-Za-zÀ-ÿ])/, ''))); v('B : aucun « ' + nom + ' » dans ce que montrent les écrans (' + ecr.length + ' textes)', t.length === 0, t.slice(0, 3).map(x => x.ou + ' : ' + (x.t.match(re) || [])[0] + ' … ' + x.t.slice(Math.max(0, x.t.search(re) - 40), x.t.search(re) + 60))); }
  const da = ecr.filter(x => /double authentification/i.test(x.t)).map(x => x.ou + ' ' + x.t.slice(0, 40));
  v('« double authentification » n’apparaît que sur l’écran « Active OP Security » (' + da.length + ' texte(s))', da.length >= 1 && ecr.filter(x => /double authentification/i.test(x.t)).every(x => /Active OP Security/.test(x.t)), da);
  const sec = N(nette.slice(nette.indexOf('const SECU_DEMO'), nette.indexOf('function cnxEntrer')).replace(/<style[\s\S]*?<\/style>/g, ' '));   // les feuilles de style (width:100%) ne sont pas des promesses : l'étape 3 y ajoute les siennes
  v('B : le bloc du fichier n’écrit aucune promesse d’absolu', !INTERDITS[1][1].test(sec), (sec.match(INTERDITS[1][1]) || [])[0]);
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('ERR', e); process.exit(1); });

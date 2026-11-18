// Sonde « double-auth-mots » (étape 3, § 10 et annexe A, partie B de secu-mots) : les mots de TOUS les écrans de cette étape.
// Population : 12 écrans/blocs lus (Sécurité, Équipe, fiche, 3 panneaux d'un geste, mot de passe provisoire, confirmation, Mon compte, changement de mot de passe, « Oublier », bande, bloc « Démonstration », carte du pirate),
// ~70 phrases témoins de l'annexe A cherchées MOT POUR MOT, 25 mots interdits cherchés dans le texte affiché.
// Le typographe de la page met des espaces insécables avant « : » et « ? » : on lit avec des espaces ordinaires.
const S = require('./double-auth-commun.js'), L = S.L, v = L.v;
const norm = t => String(t || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
const INTERDITS = [/\bsession\b/i, /\btoken\b/i, /\bhash\b/i, /\bempreinte\b/i, /\bchiffrement\b/i, /\bECDH\b/, /\bHKDF\b/, /\bPBKDF2\b/, /\bAES\b/, /\bcookie\b/i, /\bauthentificateur\b/i, /\b2FA\b/, /\bMFA\b/, /\bTOTP\b/, /\bHOTP\b/, /\bRFC\b/, /\bserveur\b/i, /\bAPI\b/, /\bbackend\b/i,
  /\bstep-up\b/i, /\bchallenge\b/i, /\bjeton\b/i, /\bre-?enrôl/i, /\brévoquer\b/i, /\bgéolocalis/i];
const ABSOLUS = /100 ?%|inviolable|impénétrable|infaillible|garanti|totalement sécurisé|\bsécurisé\b/i;
const AUTRES = [/\bvous\b/i, /\bvotre\b/i, /\bvos\b/i, /Team OP/, /Authenticator/, /Espace sécurisé/, /Oups/, /!/];
const SECOURS = /code[s]? de (secours|récupération|dépannage)|recovery|se connecter sans téléphone/i;
(async () => {
  const c = await L.ouvrir({ qui:'marc', profil:'mac', requete:'?app=1&auto=marc&tel=1' });
  await c.p.evaluate(() => { secuTelCreer('marc', 'iPhone de Marc', '246802'); SECU.telCourant = 'kb'; SECU.sessions.kb = { debut:secuMaint(), appareilId:'ici', auto:false, derniereActivite:secuMaint() }; });
  const ecrans = {};
  const lire = async (nom, f) => { await c.p.evaluate(f); await c.p.waitForTimeout(550); ecrans[nom] = norm(await c.p.evaluate(() => { const z = [document.querySelector('#sec-conf'), document.querySelector('#calque .panneau'), document.querySelector('.sec-bande')].find(x => x); return (z ? z.textContent : document.querySelector('#contenu').textContent); })); await c.p.evaluate(() => { secuConfFermer(true); fermerPanneau(); }); };
  await lire('securite', () => { aller('securite'); }); ecrans.securite = norm(await c.p.evaluate(() => document.querySelector('#contenu').textContent));
  await c.p.evaluate(() => { aller('equipe'); }); await c.p.waitForTimeout(500); ecrans.equipe = norm(await c.p.evaluate(() => document.querySelector('#contenu').textContent));
  await lire('fiche', () => eqFiche('lr'));
  await lire('fiche-julie', () => eqFiche('julie'));
  await lire('nouveau-telephone', () => secuPanTelephone('kb'));
  await lire('deverrouiller', () => secuPanDeverrouiller('lr'));
  await lire('deconnecter', () => secuPanDeconnecter('kb'));
  await lire('provisoire', () => secuPanProv('kb', 'L’ancien téléphone de Karim est révoqué : il ne peut plus approuver de connexion.'));
  await lire('confirmation', () => secuConfirmer('marc', 'banque-ouvrir', null, {}));
  await lire('confirmation-comme', () => secuConfirmer('marc', 'voir-comme', null, { k:'sm', note:'Tu verras ce que Sophie voit. Rien ne lui est signalé. Le journal garde la trace.' }));
  await c.p.evaluate(() => { SESSION = 'kb'; }); await lire('compte', () => secuMonCompte()); ecrans.compte = norm(await c.p.evaluate(() => { secuMonCompte(); return document.querySelector('#calque .panneau').textContent; })); await c.p.evaluate(() => fermerPanneau());
  await lire('mot-de-passe', () => secuPanMdp());
  await c.p.evaluate(() => { secuReconnaitre('kb', { id:'autre', nom:'Safari · macOS', adresse:'198.51.100.7' }); secuMonCompte(); const b = document.querySelector('.sec-oubli'); if (b) b.click(); }); await c.p.waitForTimeout(500); ecrans.oublier = norm(await c.p.evaluate(() => (document.querySelector('#calque .panneau') || {}).textContent)); await c.p.evaluate(() => fermerPanneau());
  await c.p.evaluate(() => { SESSION = 'marc'; SECU.vraie = 'marc'; SESSION = 'sm'; secuBande(); }); ecrans.bande = norm(await c.p.evaluate(() => document.querySelector('.sec-bande').textContent)); await c.p.evaluate(() => { SECU.vraie = null; SESSION = 'marc'; secuBande(); });
  await c.p.evaluate(() => { SECU.telCourant = 'kb'; secuPirate('kb'); opsOuvrir(); opsDemo(); opsDessiner(true); }); ecrans.demo = norm(await c.p.evaluate(() => document.querySelector('#opsec .sec-demo').textContent));
  await S.deverrouiller(c, 'kb', S.PIN); ecrans.pirate = norm((await S.cartes(c)).map(x => x.texte).join(' | '));
  v('population : 15 écrans lus, tous non vides', Object.keys(ecrans).length >= 15 && Object.values(ecrans).every(t => t.length > 20), Object.entries(ecrans).map(([k, t]) => k + ':' + t.length).join(' '));

  console.log('\n── 1. les phrases témoins de l’annexe A, mot pour mot, sur LEUR écran ──');
  const T = {
    securite:['Sécurité', 'Qui s’est connecté de façon inhabituelle ou s’est fait refuser, et quels comptes sont verrouillés.', 'Comptes verrouillés', 'Une connexion est inhabituelle si elle vient d’un autre appareil ou d’un autre réseau. C’est aussi le cas hors des heures de travail ou après des mots de passe faux. Elle n’aboutit qu’après approbation sur le téléphone de la personne. Tu ne vois ici ni mot de passe ni code.', 'Verrouillé depuis hier à 18:02 : bloquée depuis son téléphone', 'Déverrouiller'],
    equipe:['Téléphone à activer', 'Verrouillé', '1 compte verrouillé : Léa Roux.'],
    'fiche-julie':['Provisoire : à lui remettre en main propre.', 'Julie le change à sa première connexion.', 'À activer à sa première connexion'],
    fiche:['Connexion', 'Nouveau téléphone', 'Déverrouiller', 'Déconnecter partout', 'Verrouillé depuis hier à 18:02 (bloquée depuis son téléphone)', 'Copier le lien et l’identifiant', 'Reposer un mot de passe provisoire'],
    'nouveau-telephone':['Nouveau téléphone pour Karim', 'vérifie que c’est bien Karim, en personne', 'J’ai vérifié l’identité de Karim en personne', 'Il n’existe pas de code de secours : c’est voulu.'],
    deverrouiller:['Déverrouiller le compte de Léa', 'J’ai vérifié l’identité de Léa en personne', 'Déverrouiller et changer le mot de passe'],
    deconnecter:['Fermer toutes les connexions de Karim ? Il devra se reconnecter avec son téléphone.', 'Déconnecter'],
    provisoire:['Mot de passe provisoire pour Karim', 'Remets ce mot de passe à Karim en main propre, après avoir vérifié son identité.', 'Il ne sera plus affiché.', 'Terminé'],
    confirmation:['Confirme sur ton téléphone', 'Pour voir ton IBAN et ta banque, OP GESTION vérifie que c’est bien toi.', '1. Ouvre OP Security et tape ton code PIN.', '2. Tape ce nombre :', 'Cette demande expire dans', 'Le téléphone n’a pas de réseau ?'],
    'confirmation-comme':['Pour voir l’application comme Sophie, OP GESTION vérifie que c’est bien toi.', 'Tu verras ce que Sophie voit.'],
    compte:['Mon compte', 'Mon téléphone', 'Mon mot de passe', 'Changer mon mot de passe', 'Historique de mes connexions', 'Appareils reconnus', 'Ce qu’il faut savoir', 'Cette protection est très solide, mais aucune protection n’est parfaite.', 'Ne tape jamais un nombre que tu n’as pas demandé toi-même : si quelqu’un te le demande, c’est une arnaque.', 'Il n’existe pas de code de secours : c’est voulu, personne ne peut s’en servir à ta place.'],
    'mot-de-passe':['Mot de passe actuel', 'Nouveau mot de passe', 'Encore une fois', '12 caractères au moins.'],
    oublier:['Oublier Safari · macOS ? La prochaine connexion depuis cet appareil sera signalée comme inhabituelle.', 'Oublier'],
    bande:['Tu vois l’application comme Sophie.', 'Revenir à mon compte'],
    demo:['Simuler une connexion pirate', 'Simuler le vol de ma connexion', 'Faire avancer l’horloge', 'Recommencer la démonstration', 'Rien de ceci n’existe dans la vraie application. Recharge la page : tout repart de zéro.'],
    pirate:['Connexion inhabituelle', 'Appareil jamais utilisé pour ce compte', 'Réseau (adresse) jamais utilisé', 'En dehors des heures de travail habituelles (7 h – 21 h)', 'Ce n’est pas moi'] };
  let n = 0;
  for (const [ec, L2] of Object.entries(T)) for (const ph of L2) { n++; v(ec + ' : « ' + ph.slice(0, 70) + (ph.length > 70 ? '…' : '') + ' »', ecrans[ec].includes(ph), ecrans[ec].slice(0, 90)); }
  v('population : ' + n + ' phrases témoins cherchées', n >= 60, n);

  console.log('\n── 2. aucun mot interdit, aucune promesse d’absolu, jamais « vous » ──');
  for (const [ec, t] of Object.entries(ecrans)) {
    const mots = INTERDITS.filter(r => r.test(t)).map(r => (t.match(r) || [])[0]), abs = (t.match(ABSOLUS) || [])[0], aut = AUTRES.filter(r => r.test(t)).map(r => (t.match(r) || [])[0]), sec = SECOURS.test(t.replace(/(n’y a pas|n’existe pas|pas) (de )?code[s]? de secours/gi, ''));
    v(ec + ' : aucun mot d’ingénierie (session, token, hash, serveur, API…)', mots.length === 0, mots);
    v(ec + ' : aucune promesse d’absolu (100 %, inviolable, garanti, « sécurisé »…)', !abs, abs);
    v(ec + ' : ni « vous », ni « Team OP », ni « Authenticator », ni « Espace sécurisé », ni point d’exclamation', aut.length === 0, aut);
    v(ec + ' : aucun code de secours (le mot ne sert qu’à nier qu’il en existe un)', !sec);
  }
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('ERR', e); process.exit(1); });

/* ⛔ CE QUE CE FICHIER GARDE — LES MOTS DE PASSE DES BOÎTES MAIL SONT CHIFFRÉS SUR LE DISQUE, ET RIEN N'EST PERDU (23 octobre 2026).

   Trois fichiers du serveur portaient des mots de passe IMAP/SMTP en clair : `mailboxes.json` (les boîtes que les entreprises connectent dans OP GESTION), `mail-boites.json` (la
   Messagerie de la Tour) et `support-box.json`. Seules les sauvegardes étaient chiffrées. `server/coffre-boites.js` les chiffre avec LE chiffrement du socle (`socle.sceller`, clé
   maître `TEAMOP_KEK` / `$CREDENTIALS_DIRECTORY`) — une seule définition de l'algorithme. Ce banc monte le MODULE (le fichier réel, la vraie clé de banc) ; `test-2971` fait parler le
   VRAI serveur, redémarré sur ses propres fichiers.

   Ce qu'il joue, avec le VRAI code :
     1. MIGRATION : un fichier d'avant (mots de passe en clair) + une clé → lu tel quel, réécrit chiffré, le mot de passe n'apparaît PLUS dans le fichier — cherché en OCTETS (brut,
        échappé JSON, base64, hexadécimal) —, la boîte se relit identique, les autres champs sont intacts, droits 600, aucun temporaire laissé. Les trois formes de fichier.
     2. L'ÉCRITURE SUIVANTE (ajout, retrait, remplacement d'une boîte) écrit chiffré ; une nouvelle IV à chaque écriture (deux écritures du même contenu ne se ressemblent pas).
     3. ⛔ JAMAIS DE PERTE : un fichier chiffré lu SANS la clé, ou avec une AUTRE clé, garde ses boîtes (adresse, serveurs), rend `pass` vide (jamais le chiffré en guise de mot de passe),
        et le réécrire laisse chaque chiffré OCTET POUR OCTET ; avec la bonne clé, tout se relit. Un chiffré collé dans la boîte d'une autre adresse ne s'ouvre pas.
     4. SANS CLÉ (installation de test) : l'ancien format se lit, l'écriture est en clair, et le serveur le DIT une fois ; le fichier n'est pas réécrit à la lecture.
     5. mots de passe difficiles (vide, accents, guillemets, antislash, « mdp1: », 200 caractères) ; une écriture qui échoue rend false, laisse l'original et aucun temporaire.
     6. LE CÂBLAGE (texte, code seul) : `index.js` et `mail.js` passent par `coffre-boites` pour les trois fichiers, aucune écriture directe n'y reste.
   Éprouvé par mutations (voir l'en-tête de `test-2971`). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const RACINE = path.join(__dirname, '..');
const MODULE = path.join(RACINE, 'server', 'coffre-boites.js');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);

const CLE_A = crypto.randomBytes(32).toString('hex'), CLE_B = crypto.randomBytes(32).toString('hex');
/* ⛔ des mots de passe à lettres HORS de [0-9a-f] : une empreinte ou un base64 ne les contient pas par hasard. */
const MDP1 = 'Zqx-ö"é\\Wvj-2970-mot-de-passe-un', MDP2 = 'Ghy.2970/Kpz+deux', MDP3 = 'trois-Jwq-2970';
const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'coffre-boites-'));
let n = 0; const chemin = (nom) => path.join(bac, (++n) + '-' + nom);

/* La clé du processus : le module la relit à chaque appel (variable d'environnement), comme le socle. */
const avecCle = (k) => { delete process.env.CREDENTIALS_DIRECTORY; if (k) process.env.TEAMOP_KEK = k; else delete process.env.TEAMOP_KEK; };
const journal = []; const vraiErr = console.error; console.error = (...a) => { journal.push(a.join(' ')); };
const coffre = require(MODULE);
const octets = (f) => fs.readFileSync(f);
/* L'ordre des clés d'un enregistrement n'est pas une donnée : on compare le CONTENU. */
const canon = (x) => JSON.stringify(x, (k, val) => (val && typeof val === 'object' && !Array.isArray(val)) ? Object.fromEntries(Object.keys(val).sort().map(c => [c, val[c]])) : val);
/* Le mot de passe se cherche sous toutes ses formes d'écriture possibles dans un fichier. */
const formes = (mdp) => {
  const b = Buffer.from(mdp, 'utf8');
  return [b, Buffer.from(JSON.stringify(mdp).slice(1, -1), 'utf8'), Buffer.from(b.toString('base64')), Buffer.from(b.toString('hex')), Buffer.from(b.toString('base64').replace(/=+$/, ''))];
};
const absentDe = (f, mdp) => { const o = octets(f); return formes(mdp).every(x => !o.includes(x)); };
const presentDans = (f, mdp) => octets(f).includes(Buffer.from(JSON.stringify(mdp).slice(1, -1), 'utf8'));
const sansTmp = () => fs.readdirSync(bac).filter(f => /\.tmp$/.test(f));

const boiteGestion = (id, mdp, plus) => Object.assign({ id, teamId: 't-' + id, email: id + '@banc-2970.fr', pass: mdp, name: 'Boîte ' + id, imapHost: 'imap.banc.fr', imapPort: 993, smtpHost: 'smtp.banc.fr', smtpPort: 465, ts: 1700000000000, histoDone: true }, plus || {});
const ANCIEN_GESTION = () => ({ mb1: boiteGestion('mb1', MDP1), mb2: boiteGestion('mb2', MDP2, { name: 'Autre' }) });
const ANCIEN_TOUR = () => [{ id: 'b1', email: 'contact@banc-2970.fr', pass: MDP1, imapHost: 'i', imapPort: 993, smtpHost: 's', smtpPort: 465, nom: 'TEAM OP', ts: 5, par: 'Justin' }, { id: 'b2', email: 'support@banc-2970.fr', pass: MDP2, imapHost: 'i', imapPort: 993, smtpHost: 's', smtpPort: 465, nom: 'Support', ts: 6, par: 'Justin' }];
const ANCIEN_SUPPORT = () => ({ email: 'aide@banc-2970.fr', pass: MDP3, imapHost: 'i', imapPort: 993, smtpHost: 's', smtpPort: 465, ts: 7 });

try {
  /* ═════════════════ 1. MIGRATION : l'ancien format se lit, puis se réécrit chiffré ═════════════════ */
  console.log('\n1. Migration d\'un fichier d\'avant (mots de passe en clair), avec la clé');
  avecCle(CLE_A);
  for (const [nom, fabrique, mdps] of [['mailboxes.json', ANCIEN_GESTION, [MDP1, MDP2]], ['mail-boites.json', ANCIEN_TOUR, [MDP1, MDP2]], ['support-box.json', ANCIEN_SUPPORT, [MDP3]]]) {
    const f = chemin(nom); fs.writeFileSync(f, JSON.stringify(fabrique()));
    vrai(nom + ' : (population) les mots de passe d\'origine sont bien EN CLAIR dans le fichier de départ', mdps.every(m => presentDans(f, m)));
    const lu = coffre.lire(f, null);
    v(nom + ' : lu, chaque boîte porte son mot de passe EN CLAIR en mémoire (le reste du serveur le présente à IMAP)', canon(lu), canon(fabrique()));
    vrai(nom + ' : réécrit chiffré dès la lecture — plus AUCUN mot de passe dans le fichier (octets bruts, échappé, base64, hexadécimal)', mdps.every(m => absentDe(f, m)));
    vrai(nom + ' : le fichier porte `passScelle` et plus `pass`', /"passScelle":"/.test(octets(f).toString()) && !/"pass":/.test(octets(f).toString()));
    v(nom + ' : droits 600 (le fichier n\'est lisible que de son propriétaire)', (fs.statSync(f).mode & 0o777).toString(8), '600');
    v(nom + ' : relu une seconde fois, identique (le chiffré se déchiffre)', canon(coffre.lire(f, null)), canon(fabrique()));
    const avant = octets(f);
    coffre.lire(f, null);
    vrai(nom + ' : un fichier déjà chiffré n\'est PAS réécrit à la lecture (aucune écriture au seul chargement)', avant.equals(octets(f)));
  }
  v('aucun fichier temporaire laissé derrière la migration', sansTmp(), []);
  {
    const f = chemin('mailboxes.json'); fs.writeFileSync(f, JSON.stringify(ANCIEN_GESTION()));
    const lu = coffre.lire(f, null); const mb1 = lu.mb1;
    v('les AUTRES champs sont intacts dans le fichier réécrit (équipe, serveurs, date, drapeaux)', (() => { const j = JSON.parse(octets(f)); const c = Object.assign({}, j.mb1); delete c.passScelle; const d = Object.assign({}, boiteGestion('mb1', '')); delete d.pass; return JSON.stringify(c) === JSON.stringify(d); })(), true);
    v('(population) mb1 est bien une boîte à mot de passe non vide', mb1.pass, MDP1);
  }

  /* ═════════════════ 2. L'ÉCRITURE SUIVANTE ═════════════════ */
  console.log('\n2. L\'écriture suivante écrit chiffré');
  {
    const f = chemin('mailboxes.json'); fs.writeFileSync(f, JSON.stringify(ANCIEN_GESTION()));
    const m = coffre.lire(f, {});
    m.mb3 = boiteGestion('mb3', MDP3);                                  // une boîte neuve connectée
    vrai('ecrire rend true', coffre.ecrire(f, m) === true);
    vrai('le mot de passe NEUF n\'est pas dans le fichier non plus', absentDe(f, MDP3) && absentDe(f, MDP1) && absentDe(f, MDP2));
    v('les trois boîtes se relisent', Object.values(coffre.lire(f, {})).map(b => [b.id, b.pass]), [['mb1', MDP1], ['mb2', MDP2], ['mb3', MDP3]]);
    const avant = JSON.parse(octets(f));
    coffre.ecrire(f, m);
    const apres = JSON.parse(octets(f));
    vrai('une IV neuve à chaque écriture : le même contenu ne donne pas le même chiffré', avant.mb1.passScelle !== apres.mb1.passScelle);
    delete m.mb2; coffre.ecrire(f, m);                                  // un retrait
    v('un retrait : la boîte retirée disparaît, les autres se relisent', Object.values(coffre.lire(f, {})).map(b => [b.id, b.pass]), [['mb1', MDP1], ['mb3', MDP3]]);
    m.mb1 = boiteGestion('mb1', MDP2); coffre.ecrire(f, m);             // un remplacement (même adresse, nouveau mot de passe)
    v('un remplacement de mot de passe : le nouveau se relit, l\'ancien a disparu du fichier', [coffre.lire(f, {}).mb1.pass, absentDe(f, MDP1)], [MDP2, true]);
    v('toujours aucun temporaire', sansTmp(), []);
  }

  /* ═════════════════ 3. JAMAIS DE PERTE : la clé absente ou différente ═════════════════ */
  console.log('\n3. Un fichier chiffré lu sans la clé (ou avec une autre) ne perd rien');
  {
    const f = chemin('mail-boites.json'); fs.writeFileSync(f, JSON.stringify(ANCIEN_TOUR()));
    coffre.lire(f, []);                                                 // migré avec CLE_A
    const chiffre = octets(f);
    const ref = JSON.parse(chiffre);
    for (const [etiquette, cle] of [['clé ABSENTE', null], ['AUTRE clé', CLE_B]]) {
      avecCle(cle); journal.length = 0;
      const lu = coffre.lire(f, []);
      v(etiquette + ' : les deux boîtes sont toujours là, avec leur adresse', lu.map(b => b.email), ['contact@banc-2970.fr', 'support@banc-2970.fr']);
      v(etiquette + ' : leur mot de passe est VIDE — le chiffré n\'est jamais présenté à IMAP comme un mot de passe', lu.map(b => b.pass), ['', '']);
      vrai(etiquette + ' : le chiffré n\'est pas non plus dans l\'objet lu (ni `pass`, ni `passScelle` énumérable)', lu.every(b => !('passScelle' in b)) && !JSON.stringify(lu).includes(ref[0].passScelle));
      vrai(etiquette + ' : le serveur le DIT (nombre seulement, aucune adresse ni mot de passe dans le journal)', journal.some(l => /2 mot\(s\) de passe illisible/.test(l)) && !journal.join('\n').includes('banc-2970.fr') && !journal.join('\n').includes(MDP1));
      vrai(etiquette + ' : lire n\'a RIEN réécrit', chiffre.equals(octets(f)));
      lu.push({ id: 'b3', email: 'neuve@banc-2970.fr', pass: 'neuve-Xqj', imapHost: 'i', smtpHost: 's' });
      coffre.ecrire(f, lu);
      const apres = JSON.parse(octets(f));
      v(etiquette + ' : réécrire (avec une boîte de plus) laisse les deux chiffrés d\'origine OCTET POUR OCTET', [apres[0].passScelle, apres[1].passScelle], [ref[0].passScelle, ref[1].passScelle]);
      vrai(etiquette + ' : les boîtes illisibles n\'ont pas gagné de `pass` vide dans le fichier', apres.slice(0, 2).every(b => !('pass' in b)));
      /* on remet le fichier d'avant l'ajout pour la boucle suivante */
      fs.writeFileSync(f, chiffre);
    }
    avecCle(CLE_A);
    v('avec la BONNE clé, tout se relit : rien n\'a été perdu', coffre.lire(f, []).map(b => [b.email, b.pass]), [['contact@banc-2970.fr', MDP1], ['support@banc-2970.fr', MDP2]]);
    /* un fichier abîmé par la clé absente PUIS réécrit puis relu avec la bonne clé */
    avecCle(null); const sans = coffre.lire(f, []); sans.push({ id: 'b3', email: 'neuve@banc-2970.fr', pass: 'neuve-Xqj', imapHost: 'i', smtpHost: 's' }); coffre.ecrire(f, sans);
    avecCle(CLE_A);
    v('clé absente → écriture d\'une boîte neuve (en clair, faute de clé) → clé revenue : les trois boîtes se relisent', coffre.lire(f, []).map(b => [b.email, b.pass]), [['contact@banc-2970.fr', MDP1], ['support@banc-2970.fr', MDP2], ['neuve@banc-2970.fr', 'neuve-Xqj']]);
    /* le chiffré d'une boîte collé dans la fiche d'une autre ADRESSE ne s'ouvre pas (AAD) */
    const j = JSON.parse(octets(f)); const volee = j.find(b => b.email === 'contact@banc-2970.fr').passScelle;
    j.find(b => b.email === 'support@banc-2970.fr').passScelle = volee;
    const g = chemin('mail-boites.json'); fs.writeFileSync(g, JSON.stringify(j));
    v('⛔ le chiffré d\'une adresse collé chez une autre ne s\'ouvre pas (lié à l\'adresse)', coffre.lire(g, []).filter(b => b.email === 'support@banc-2970.fr').map(b => b.pass), ['']);
  }

  /* ═════════════════ 4. SANS CLÉ : installation de test ═════════════════ */
  console.log('\n4. Sans clé maître (installation de test, TEAMOP_DATA d\'un banc)');
  {
    avecCle(null);
    const f = chemin('mailboxes.json'); fs.writeFileSync(f, JSON.stringify(ANCIEN_GESTION()));
    const avant = octets(f);
    v('l\'ancien format se lit', canon(coffre.lire(f, null)), canon(ANCIEN_GESTION()));
    vrai('sans clé, lire ne réécrit PAS le fichier (aucune migration possible, aucun risque)', avant.equals(octets(f)));
    journal.length = 0;
    const m = coffre.lire(f, {}); coffre.ecrire(f, m);
    vrai('écrire sans clé : le fichier garde les mots de passe lisibles (une boîte connectée sur un serveur sans clé doit marcher)', presentDans(f, MDP1) && presentDans(f, MDP2));
    v('… et le serveur le DIT (une fois, sans mot de passe)', [journal.filter(l => /clé maître absente/.test(l)).length <= 1, journal.join('\n').includes(MDP1)], [true, false]);
    coffre.ecrire(f, m);
    vrai('… une seule fois par processus', journal.filter(l => /clé maître absente/.test(l)).length <= 1);
    avecCle(CLE_A);
    const lu = coffre.lire(f, {});
    v('la clé arrive plus tard : le fichier en clair se lit et se migre', [lu.mb1.pass, absentDe(f, MDP1)], [MDP1, true]);
  }

  /* ═════════════════ 5. MOTS DE PASSE DIFFICILES, ÉCRITURE QUI ÉCHOUE ═════════════════ */
  console.log('\n5. Mots de passe difficiles, écriture qui échoue');
  {
    avecCle(CLE_A);
    const difficiles = ['', 'é', 'a"b\\c\'d', 'mdp1:presque', 'v1:presque', '日本語-Xqz', 'x'.repeat(200), ' espaces '];
    const f = chemin('mailboxes.json'); const m = {};
    difficiles.forEach((d, i) => { m['k' + i] = boiteGestion('k' + i, d); });
    coffre.ecrire(f, m);
    v('chaque mot de passe se relit à l\'identique (vide, accents, guillemets, antislash, préfixes, 200 caractères)', Object.values(coffre.lire(f, {})).map(b => b.pass), difficiles);
    vrai('(population) ' + difficiles.length + ' boîtes écrites', Object.keys(JSON.parse(octets(f))).length === difficiles.length);
    /* échec : la destination est un DOSSIER — le renommage jette */
    const dossier = chemin('dossier'); fs.mkdirSync(dossier);
    const intact = octets(f);
    journal.length = 0;
    v('une écriture qui échoue rend false', coffre.ecrire(dossier, m), false);
    v('… ne laisse aucun temporaire', sansTmp(), []);
    vrai('… et le dit, sans mot de passe', journal.some(l => /non écrit/.test(l)) && !journal.join('\n').includes(MDP1));
    vrai('l\'original d\'un autre fichier n\'est pas touché', intact.equals(octets(f)));
    v('un dossier absent : false, sans exception', coffre.ecrire(path.join(bac, 'absent', 'x.json'), m), false);
    v('un fichier absent se lit comme le défaut donné', [coffre.lire(path.join(bac, 'rien.json'), 'DEFAUT'), coffre.lire(path.join(bac, 'rien.json'), null)], ['DEFAUT', null]);
    const casse = chemin('casse.json'); fs.writeFileSync(casse, '{"mb1":{"id":"mb1","email":');
    v('un fichier tronqué se lit comme le défaut (comme avant) — et n\'est pas réécrit', [coffre.lire(casse, 'DEFAUT'), octets(casse).toString()], ['DEFAUT', '{"mb1":{"id":"mb1","email":']);
  }

  /* ═════════════════ 6. LE CÂBLAGE (texte, code seul) ═════════════════ */
  console.log('\n6. Le câblage : index.js et mail.js passent par le coffre');
  {
    const code = (f) => fs.readFileSync(path.join(RACINE, 'server', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    const IDX = code('index.js'), MAIL = code('mail.js');
    vrai('(population) index.js déclare les trois chemins', /MAILBOX_PATH\s*=/.test(IDX) && /SUPPORT_BOX_PATH\s*=/.test(IDX));
    vrai('index.js : `mailboxes` se lit par le coffre', /mailboxes\s*=\s*coffreBoites\.lire\(\s*MAILBOX_PATH/.test(IDX));
    vrai('index.js : `saveMailboxes` écrit par le coffre', /function saveMailboxes\(\)\s*\{\s*return coffreBoites\.ecrire\(\s*MAILBOX_PATH,\s*mailboxes\s*\)/.test(IDX));
    vrai('index.js : `supportBox` se lit et s\'écrit par le coffre', /supportBox\s*=\s*coffreBoites\.lire\(\s*SUPPORT_BOX_PATH/.test(IDX) && /coffreBoites\.ecrire\(\s*SUPPORT_BOX_PATH,\s*box\s*\)/.test(IDX));
    v('index.js : AUCUNE écriture directe de ces fichiers', IDX.match(/(writeFileSync|appendFileSync|renameSync)\(\s*(MAILBOX_PATH|SUPPORT_BOX_PATH)/g) || [], []);
    v('index.js : la SEULE lecture directe est la relecture de contrôle de la suppression d\'une entreprise (elle ne lit que `teamId`)', IDX.match(/readFileSync\(\s*(MAILBOX_PATH|SUPPORT_BOX_PATH)[^;]*;/g).length + ':' + /JSON\.parse\(fs\.readFileSync\(MAILBOX_PATH, 'utf8'\)\);\s*if \(Object\.values\(relu\)\.some\(b => b && b\.teamId === t\)\)/.test(IDX), '1:true');
    vrai('mail.js : `boites` et l\'ancienne boîte support se lisent par le coffre (le chiffré de l\'une ne doit jamais être recopié comme mot de passe)', /boites\s*=\s*coffreBoites\.lire\(\s*BOITES_PATH/.test(MAIL) && /coffreBoites\.lire\(\s*path\.join\(DATA_DIR,\s*'support-box\.json'/.test(MAIL));
    vrai('mail.js : `sauve` écrit par le coffre', /function sauve\(\)\s*\{\s*return coffreBoites\.ecrire\(\s*BOITES_PATH,\s*boites\s*\)/.test(MAIL));
    v('mail.js : AUCUNE lecture ni écriture directe de ces fichiers', MAIL.match(/(readFileSync|writeFileSync)\([^)]*(BOITES_PATH|support-box)/g) || [], []);
    const COF = code('coffre-boites.js');
    vrai('le coffre ne connaît AUCUN algorithme : il appelle `socle.sceller` / `socle.desceller` (une seule définition du chiffrement)', /socle\.sceller\(/.test(COF) && /socle\.desceller\(/.test(COF) && !/createCipheriv|createDecipheriv/.test(COF));
    vrai('la clé est la clé maître du socle (`socle.kek()`), dérivée — pas une clé de plus à garder', /socle\.kek\(\)/.test(COF) && /hkdfSync/.test(COF));
    vrai('aucune route ne rend `pass` : ni `res.json(…pass…)` sur une boîte', !/res\.json\([^;]*\b(b|mb|box|supportBox)\.pass\b/.test(IDX + MAIL));
  }
} finally {
  console.error = vraiErr;
  try { fs.rmSync(bac, { recursive: true, force: true }); } catch (e) {}
}
console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exitCode = ko ? 1 : 0;

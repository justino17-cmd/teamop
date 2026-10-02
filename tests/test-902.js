/* ⛔ CE QUE CE FICHIER GARDE — LES PIÈCES SANS BASE : scellage, mots de passe, quotas, configuration, clé maître.

   Quatre modules, chacun monté SEUL (dépendances injectées), plus `poser-cle.js` EXÉCUTÉ dans un bac à
   sable complet (clé, données, drop-in systemd détournés — rien ne peut toucher /etc ni /opt), sur le
   modèle de `test-729` pour le serveur d'OP GESTION.

   ⛔ L'ORDRE DE LA CLÉ : la clé D'ABORD, le réglage systemd qui la lit ENSUITE, jamais sur un chemin
   d'erreur — `LoadCredential=` vers un fichier absent fait refuser à systemd de démarrer l'unité, et le
   service ne repartirait plus du tout. Les contrôles « aucun drop-in sur un chemin d'erreur » sont là
   pour ça.
   ⛔ LA CLÉ NE S'AFFICHE JAMAIS : ni sur la sortie standard ni sur l'erreur, même quand elle est mal
   formée (Justin colle toutes ses sorties dans la conversation — règle du 24 septembre 2026).
   ⛔ scrypt SANS `maxmem` ÉCHOUE au paramètre de production : c'est éprouvé ici, pas supposé. */

const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawnSync } = require('child_process');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const { creerMdp } = require(path.join(T.SERVICE, 'mdp.js'));
const { creerQuotas, cleReseau, MAX_CLES } = require(path.join(T.SERVICE, 'quotas.js'));
const { charger, lireCle } = require(path.join(T.SERVICE, 'config.js'));
const lance = (f) => { try { f(); return null; } catch (e) { return e.message || String(e); } };

(async () => {
  console.log('Le scellage AES-256-GCM : une clé par champ, des données associées, un octet de version');
  {
    const kek = crypto.randomBytes(32), s = creerScelleur(kek);
    const b = s.sceller('message', 'corps_ch', 'c|1|p', 'bonjour — « é » 👍');
    v('aller-retour, accents et émoji compris', s.ouvrir('message', 'corps_ch', 'c|1|p', b), 'bonjour — « é » 👍');
    v('le premier octet est la génération de clé (rotation)', b[0], 1);
    v('⛔ des données associées DIFFÉRENTES → refus', lance(() => s.ouvrir('message', 'corps_ch', 'c|2|p', b)), 'scelle_invalide');
    v('⛔ un AUTRE CHAMP (même table, mêmes données associées) → refus : une clé par champ', lance(() => s.ouvrir('message', 'meta_ch', 'c|1|p', b)), 'scelle_invalide');
    v('⛔ une AUTRE TABLE → refus', lance(() => s.ouvrir('conversation', 'corps_ch', 'c|1|p', b)), 'scelle_invalide');
    const t = Buffer.from(b); t[t.length - 1] ^= 1;
    v('un octet changé → refus', lance(() => s.ouvrir('message', 'corps_ch', 'c|1|p', t)), 'scelle_invalide');
    v('trop court → refus (jamais « vide » à la place)', lance(() => s.ouvrir('message', 'corps_ch', 'c|1|p', Buffer.alloc(5))), 'scelle_invalide');
    v('⛔ une AUTRE clé maître → refus', lance(() => creerScelleur(crypto.randomBytes(32)).ouvrir('message', 'corps_ch', 'c|1|p', b)), 'scelle_invalide');
    const ivs = new Set(); for (let i = 0; i < 2000; i++) ivs.add(s.sceller('message', 'corps_ch', 'a', 'x').subarray(1, 13).toString('hex'));
    v('population : 2 000 scellés du même clair, 2 000 IV distincts (aucun nonce réutilisé)', ivs.size, 2000);
    v('la même valeur scellée deux fois donne deux chiffrés différents', s.sceller('m', 'c', 'a', 'x').equals(s.sceller('m', 'c', 'a', 'x')), false);
    v('une clé de longueur autre que 32 est refusée', lance(() => creerScelleur(Buffer.alloc(31))), 'cle_maitre_invalide');
    const h1 = s.hmac('personne', 'email_h', 'a@b.fr'), h2 = s.hmac('personne', 'email_h', 'a@b.fr'), h3 = s.hmac('personne', 'autre', 'a@b.fr');
    v('l\'empreinte (unicité d\'une adresse) est déterministe et propre à son champ', [h1 === h2, h1 === h3, /^[0-9a-f]{64}$/.test(h1)], [true, false, true]);
    // rotation : la génération 2 chiffre, et lit encore la génération 1
    const kek2 = crypto.randomBytes(32);
    const s2 = creerScelleur(kek2, { generation: 2, anciennes: { 1: kek } });
    const b2 = s2.sceller('message', 'corps_ch', 'c|1|p', 'neuf');
    v('⛔ rotation : la génération 2 chiffre en gén. 2 ET relit un scellé de la gén. 1', [b2[0], s2.ouvrir('message', 'corps_ch', 'c|1|p', b2), s2.ouvrir('message', 'corps_ch', 'c|1|p', b)], [2, 'neuf', 'bonjour — « é » 👍']);
    v('sans la clé de la génération 1, son scellé ne s\'ouvre pas (génération inconnue)', lance(() => creerScelleur(kek2, { generation: 2 }).ouvrir('message', 'corps_ch', 'c|1|p', b)), 'scelle_invalide');
  }

  console.log('\nLes mots de passe : scrypt avec maxmem explicite, sémaphore, même travail pour un inconnu');
  {
    const lourd = creerMdp();   // paramètres de PRODUCTION : N = 2^15, r = 8, p = 1
    let erreur = null;
    try { await lourd._sansMaxmem('mot de passe'); } catch (e) { erreur = e && (e.message || e.code); }
    vrai('⛔ SANS `maxmem`, N = 2^15 / r = 8 ÉCHOUE (limite mémoire) — le piège est réel, pas supposé', erreur && /MEMORY|memory/i.test(String(erreur)));
    const h = await lourd.hacher('un-mot-de-passe-long');
    vrai('⛔ AVEC `maxmem` explicite, le même paramètre fonctionne', Buffer.isBuffer(h.hash) && h.hash.length === 64);
    v('les paramètres sont rangés AVEC le hachage (on pourra monter N sans tout invalider)', JSON.parse(h.params), { N: 32768, r: 8, p: 1 });
    v('le bon mot de passe passe, un mauvais non', [await lourd.verifier('un-mot-de-passe-long', h), await lourd.verifier('un-mot-de-passe-long!', h)], [true, false]);
    const leger = creerMdp({ N: 2 ** 12 }), hl = await leger.hacher('abcdefghijkl');
    v('⛔ un hachage fait avec d\'anciens paramètres se vérifie encore avec des paramètres plus forts (N lu dans l\'enregistrement)', await lourd.verifier('abcdefghijkl', hl), true);
    v('un enregistrement aux paramètres illisibles est refusé sans exception', await lourd.verifier('x', { sel: h.sel, params: '{"N":"x"}', hash: h.hash }), false);

    const m = creerMdp({ N: 2 ** 12, concurrence: 2, fileMax: 3 });
    const lot = Array.from({ length: 5 }, (_, i) => m.hacher('lot-mot-de-passe-' + i));
    const e0 = m.etat();
    v('⛔ sémaphore : 6 demandes d\'un coup → 2 dérivations simultanées, le reste EN FILE', [e0.actifs, e0.enFile], [2, 3]);
    let plein = null; try { await m.hacher('une de trop'); } catch (e) { plein = e.message; }
    v('⛔ file bornée : au-delà, on REFUSE (file_pleine) plutôt que d\'empiler', plein, 'file_pleine');
    await Promise.all(lot);
    v('tout se vide ensuite (aucune dérivation oubliée)', [m.etat().actifs, m.etat().enFile], [0, 0]);

    const c = creerMdp({ N: 2 ** 12 });
    const rec = await c.hacher('bon-mot-de-passe-1');
    const a0 = c.derivations();
    await c.verifier('mauvais-mot-de-passe', rec);
    const apresConnu = c.derivations() - a0;
    await c.verifierInconnu('mauvais-mot-de-passe');
    const apresInconnu = c.derivations() - a0 - apresConnu;
    v('⛔ une adresse INCONNUE coûte le MÊME nombre de dérivations qu\'un compte connu (par compteur, jamais au chronomètre)', [apresConnu, apresInconnu], [1, 1]);
    v('et la vérification d\'un inconnu est toujours fausse', await c.verifierInconnu('bon-mot-de-passe-1'), false);
    v('recevabilité : 10 caractères au moins, hors liste de mots courants', [c.mdpRecevable('court'), c.mdpRecevable('azertyuiop'), c.mdpRecevable('PassWord123'), c.mdpRecevable('un bon mot de passe'), c.mdpRecevable(12345678901), c.mdpRecevable('x'.repeat(201))], [false, false, false, true, false, false]);
    const src = fs.readFileSync(path.join(T.SERVICE, 'mdp.js'), 'utf8');
    vrai('⛔ la comparaison est à temps constant (timingSafeEqual(cle, attendu)), jamais === sur le hachage', /timingSafeEqual\(cle, attendu\)/.test(T.sansCommentaires(src)) && !/\bcle\s*===|\bcle\.toString\([^)]*\)\s*===/.test(T.sansCommentaires(src)));
  }

  console.log('\nLes quotas : fenêtre, Retry-After, clés indépendantes, mémoire bornée');
  {
    const h = { t: 1000000 };
    const q = creerQuotas(() => h.t);
    const essais = [1, 2, 3].map(() => q.essai('k', 3, 60000));
    v('trois essais passent', essais.map(e => e.ok), [true, true, true]);
    const r4 = q.essai('k', 3, 60000);
    v('⛔ le quatrième est refusé avec un `retry` en secondes, entre 1 et la fenêtre', [r4.ok, r4.retry >= 1 && r4.retry <= 60], [false, true]);
    h.t += 30000;
    const r5 = q.essai('k', 3, 60000);
    v('à mi-fenêtre le décompte baisse (30 s) : le Retry-After est vrai, pas la fenêtre entière', [r5.ok, r5.retry], [false, 30]);
    v('une autre clé n\'est pas touchée', q.essai('autre', 3, 60000).ok, true);
    h.t += 30001;
    v('la fenêtre échue remet le compteur à zéro', q.essai('k', 3, 60000).ok, true);
    vrai('le compteur de refus monte (pour /health)', q.refus() >= 2);
    // mémoire bornée : une clé par requête ne fait pas grossir la table sans fin
    const g = creerQuotas(() => h.t);
    for (let i = 0; i < MAX_CLES; i++) g.essai('ip' + i, 1, 60000);
    v('population : la table est PLEINE (' + MAX_CLES + ' clés vivantes)', g.taille(), MAX_CLES);
    const nouveau = g.essai('une-de-plus', 1, 60000);
    v('⛔ pleine de clés vivantes, une clé NEUVE est ACCEPTÉE (la table se saturait : 50 500 adresses distinctes fermaient la porte à toute adresse neuve), et la table ne grossit pas',
      [nouveau.ok, g.taille() <= MAX_CLES, g.evinces() >= 1], [true, true, true]);
    v('⛔ ce sont les PLUS ANCIENNES qui partent (la première clé n\'est plus comptée, la dernière l\'est encore)', [g.essai('ip0', 1, 60000).ok, g.essai('une-de-plus', 1, 60000).ok], [true, false]);
    h.t += 60001;
    v('quand les fenêtres échoient, on balaie et on accepte de nouveau', [g.essai('une-de-plus', 1, 60000).ok, g.taille() < MAX_CLES], [true, true]);
    {
      const petit = creerQuotas(() => h.t, 100);
      for (let i = 0; i < 500; i++) petit.essai('k' + i, 1, 60000);
      vrai('la table à plafond réglable reste bornée (100) après 500 clés vivantes', petit.taille() <= 100);
      const r1 = creerQuotas(() => h.t);
      r1.essai('c', 2, 60000); r1.essai('c', 2, 60000); r1.rembourser('c');
      v('⛔ une tentative REMBOURSÉE ne compte plus (un succès n\'use pas le plafond des échecs)', [r1.essai('c', 2, 60000).ok, r1.essai('c', 2, 60000).ok], [true, false]);
      r1.rembourser('inconnue');
      vrai('   rembourser une clé inconnue ne plante pas', true);
    }
    console.log('  `cleReseau` : l\'IPv6 se compte par /64, l\'IPv4 mappée comme une IPv4');
    v('⛔ deux adresses d\'un même /64 ont la même clé', cleReseau('2001:db8:1:2:aaaa:bbbb:cccc:dddd'), cleReseau('2001:db8:1:2::1'));
    vrai('   un autre /64 en a une autre', cleReseau('2001:db8:1:3::1') !== cleReseau('2001:db8:1:2::1'));
    v('   ::ffff:1.2.3.4 est 1.2.3.4', cleReseau('::ffff:1.2.3.4'), '1.2.3.4');
    v('   une IPv4 reste telle quelle, une adresse illisible aussi', [cleReseau('203.0.113.7'), cleReseau('pas-une-adresse'), cleReseau('1::2::3')], ['203.0.113.7', 'pas-une-adresse', '1::2::3']);
    v('   la zone (%eth0) ne change pas la clé', cleReseau('fe80::1%eth0'), cleReseau('fe80::1'));
  }

  console.log('\nLa configuration : tout vient de l\'environnement, une erreur dit pourquoi sans jamais dire la clé');
  {
    const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-902-'));
    const cred = path.join(bac, 'cred'); fs.mkdirSync(cred);
    const CLE = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(path.join(cred, 'kek'), CLE + '\n');
    const cfg = path.join(bac, 'config.json'); fs.writeFileSync(cfg, JSON.stringify({ origines: ['https://exemple.invalide'], beta: { relectureMs: 1234 } }));
    const base = { OPMSG_INSTANCE: 'beta', OPMSG_CONFIG: cfg, OPMSG_DATA: path.join(bac, 'data'), CREDENTIALS_DIRECTORY: cred, OPMSG_SHA: 'abc123' };
    const c = charger(base);
    v('une configuration saine se charge (instance, port par défaut 8091, clé de 32 octets, sha)', [c.instance, c.port, c.kek.length, c.kek.toString('hex') === CLE, c.sha], ['beta', 8091, 32, true, 'abc123']);
    v('les réglages du fichier passent, les défauts complètent', [c.origines, c.beta.relectureMs, c.beta.urlGestion, c.cookie.nom, c.cookie.secure], [['https://exemple.invalide'], 1234, 'http://127.0.0.1:8080', '__Host-opm', true]);
    v('le SHA du déploiement est assaini (aucun caractère de contrôle ni espace)', charger(Object.assign({}, base, { OPMSG_SHA: 'ab c\n;rm -rf' })).sha, 'abcrm-rf');
    for (const [nom, env, motif] of [
      ['instance absente', { OPMSG_INSTANCE: undefined }, /OPMSG_INSTANCE/],
      ['instance inconnue', { OPMSG_INSTANCE: 'production' }, /beta ou prod/],
      ['configuration non fournie', { OPMSG_CONFIG: undefined }, /OPMSG_CONFIG/],
      ['données non fournies', { OPMSG_DATA: undefined }, /OPMSG_DATA/],
      ['fichier de configuration introuvable', { OPMSG_CONFIG: path.join(bac, 'absent.json') }, /introuvable/],
      ['crédential absent', { CREDENTIALS_DIRECTORY: undefined }, /CREDENTIALS_DIRECTORY|credential/],
      ['port invalide', { PORT: '70000' }, /PORT/],
    ]) {
      const e = Object.assign({}, base, env); for (const k of Object.keys(e)) if (e[k] === undefined) delete e[k];
      v('⛔ ' + nom + ' → refus qui dit pourquoi', (lance(() => charger(e)) || '').match(motif) !== null, true);
    }
    fs.writeFileSync(path.join(cred, 'kek'), 'pas-de-l-hexadecimal-' + 'z'.repeat(43));
    const m1 = lance(() => lireCle(cred));
    v('⛔ une clé mal formée est refusée', /pas 64 caractères/.test(m1), true);
    vrai('⛔ et le message d\'erreur ne cite JAMAIS la valeur de la clé', !m1.includes('zzzz') && !m1.includes('pas-de-l-hexa'));
    fs.writeFileSync(path.join(cred, 'kek'), 'ab'.repeat(31));
    v('une clé trop courte (62 hexa) est refusée', /pas 64/.test(lance(() => lireCle(cred))), true);
    fs.writeFileSync(path.join(cred, 'kek'), CLE);
    fs.writeFileSync(cfg, '{pas du json');
    v('un JSON illisible est refusé sans citer son contenu', /illisible|invalide/.test(lance(() => charger(base))) && !/pas du json/.test(lance(() => charger(base))), true);
    fs.writeFileSync(cfg, JSON.stringify({ origine: 'https://exemple.invalide' }));
    v('⛔ la clé `origine` (celle que l\'INSTALLATION écrit) est lue comme `origines` — elle était ignorée, et la garde d\'origine retombait sur Origin = Host sans le dire', charger(base).origines, ['https://exemple.invalide']);
    fs.writeFileSync(cfg, JSON.stringify({ origine: 'https://exemple.invalide/chemin' }));
    v('⛔ une origine qui n\'en est pas une (chemin) REFUSE le démarrage plutôt que de relâcher la garde', /origine invalide/.test(lance(() => charger(base))), true);
    fs.writeFileSync(cfg, JSON.stringify({ origines: ['pas une origine'] }));
    v('   idem pour une liste mal formée', /origine invalide/.test(lance(() => charger(base))), true);
    fs.writeFileSync(cfg, JSON.stringify({}));
    v('   sans aucune origine configurée : `null` (le service retombe sur Origin = Host, et le dit ici)', charger(base).origines, null);
    fs.writeFileSync(cfg, JSON.stringify({ cookie: { nom: '__Host-opm', secure: false } }));
    v('⛔ un cookie __Host- sans Secure est refusé (le navigateur le jetterait : personne ne se connecterait)', /__Host- exige secure/.test(lance(() => charger(base))), true);
    fs.writeFileSync(cfg, JSON.stringify({ cookie: { nom: 'opm', secure: false } }));
    v('un nom de cookie sans préfixe peut relâcher Secure (bancs en http local)', charger(base).cookie, { nom: 'opm', secure: false });
    fs.rmSync(bac, { recursive: true, force: true });
  }

  console.log('\n`poser-cle.js` : la clé d\'abord, le réglage ensuite, jamais de régénération, jamais d\'affichage');
  {
    const OUTIL = path.join(T.SERVICE, 'poser-cle.js');
    const bacs = [];
    const bac = (inst = 'beta') => {
      const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cle-banc-')); bacs.push(d);
      return { d, cle: path.join(d, 'etc', inst + '.kek'), dropin: path.join(d, 'dropin', 'kek.conf'), data: path.join(d, 'data'),
        env: { OPMSG_KEK_DIR: path.join(d, 'etc'), OPMSG_DATA: path.join(d, 'data'), OPMSG_DROPIN_DIR: path.join(d, 'dropin') } };
    };
    const lancer = (b, args, entree) => { const r = spawnSync(process.execPath, [OUTIL].concat(args), { encoding: 'utf8', input: entree, env: Object.assign({}, process.env, b.env) }); return { rc: r.status, txt: String(r.stdout || '') + String(r.stderr || '') }; };
    const cleDe = (b) => { try { return fs.readFileSync(b.cle, 'utf8').trim(); } catch (e) { return null; } };

    const a = bac();
    const r1 = lancer(a, ['beta']);
    const k1 = cleDe(a);
    v('bêta neuve : une clé est générée (64 hexa) et le code de sortie est 0', [r1.rc, /^[0-9a-f]{64}$/.test(k1 || '')], [0, true]);
    v('⛔ la clé est en 0600 (créée avec ces droits, pas resserrée après)', (fs.statSync(a.cle).mode & 0o777).toString(8), '600');
    vrai('⛔ la clé n\'est PAS affichée', !r1.txt.includes(k1));
    vrai('le drop-in systemd est posé, et pointe la clé (LoadCredential=kek:)', fs.existsSync(a.dropin) && fs.readFileSync(a.dropin, 'utf8').includes('LoadCredential=kek:' + a.cle));
    const r2 = lancer(a, ['beta']);
    v('⛔ une seconde exécution NE régénère PAS : clé identique, sortie 0', [cleDe(a) === k1, r2.rc], [true, 0]);

    const b = bac();
    fs.mkdirSync(b.data, { recursive: true }); fs.writeFileSync(path.join(b.data, 'msg.db'), 'x');
    const r3 = lancer(b, ['beta']);
    v('⛔ une base existe SANS clé : on REFUSE de générer (une clé neuve la rendrait illisible)', [r3.rc, cleDe(b)], [1, null]);
    vrai('⛔ …et AUCUN drop-in n\'est posé sur ce chemin d\'erreur (systemd refuserait de démarrer l\'unité)', !fs.existsSync(b.dropin));
    vrai('le refus explique quoi faire sans afficher de secret', /séquestre/.test(r3.txt) && !/[0-9a-f]{64}/.test(r3.txt));

    const c = bac('prod');
    const r4 = lancer(c, ['prod']);
    v('⛔ la PRODUCTION ne génère jamais sa clé ici (elle naît au gestionnaire de mots de passe)', [r4.rc, cleDe(c), fs.existsSync(c.dropin)], [1, null, false]);

    const d = bac('prod'), CLE = crypto.randomBytes(32).toString('hex');
    const r5 = lancer(d, ['prod', '--stdin'], CLE + '\n');
    vrai('prod --stdin : la clé du séquestre est posée telle quelle, jamais affichée', r5.rc === 0 && cleDe(d) === CLE && !r5.txt.includes(CLE));
    vrai('…et le drop-in suit (APRÈS la clé)', fs.existsSync(d.dropin));
    const e = bac('prod');
    const r6 = lancer(e, ['prod', '--stdin'], 'pas-une-cle-valide\n');
    v('⛔ une clé mal formée sur l\'entrée est refusée — et ne laisse ni clé ni drop-in', [r6.rc, cleDe(e), fs.existsSync(e.dropin)], [1, null, false]);
    vrai('⛔ le refus ne cite pas ce qu\'on lui a donné', !r6.txt.includes('pas-une-cle-valide'));
    const r7 = lancer(d, ['prod', '--stdin'], crypto.randomBytes(32).toString('hex') + '\n');
    v('⛔ une clé déjà posée n\'est JAMAIS remplacée, même par une clé du séquestre valide', [r7.rc, cleDe(d) === CLE], [0, true]);
    v('une instance inconnue → code 2, rien d\'écrit', [lancer(bac(), ['staging']).rc, lancer(bac(), []).rc], [2, 2]);
    const f = bac();
    f.env.OPMSG_KEK_DIR = '/opt/teamop/cle-msg-banc';
    const r8 = lancer(f, ['beta']);
    vrai('⛔ une clé sous /opt/teamop est refusée (même garde de séparation que le service)', r8.rc === 1 && !fs.existsSync('/opt/teamop/cle-msg-banc'));
    for (const d2 of bacs) fs.rmSync(d2, { recursive: true, force: true });
  }

  fin();
})().catch(e => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exit(1); });

/* ⛔ CE QUE CE FICHIER GARDE — LES CATÉGORIES D'OP GESTION RETENUES POUR UNE ENTREPRISE, CÔTÉ SERVEUR (Tour, 22 octobre 2026).

   Justin : « quand on crée un accès client, dans la Tour on choisit les catégories dont ils ont besoin et pas besoin ».
   L'application (chantier à part) ne montrera à cette entreprise que les rubriques retenues. Ce banc tient la moitié SERVEUR
   du contrat, par le VRAI serveur parlé en HTTP (127.0.0.1, des entreprises fictives) :
     · `POST /api/monitor/espaces/cats` : le patron SEUL, un espace inconnu 404, et trois refus 400 (clé hors liste, doublon,
       forme) qui ne changent RIEN ; un tableau (dans l'ordre de la liste fermée), `null` qui revient à « tout » en SUPPRIMANT
       le champ, `[]` qui est un choix et non l'absence de choix ; l'absence du champ `cats` est un refus (un oubli ne rouvre rien) ;
     · écrit sur TOUS les noms de l'entreprise (comme le métier), sur le disque, avec qui et quand ; une écriture refusée se dit
       (500) et se DÉFAIT en mémoire ;
     · « Revoir le lien de connexion » (la reconstruction de l'entrée) GARDE le réglage — c'était la panne d'OP MESSAGES, puis
       du métier : un champ absent du report est perdu en silence ;
     · `/api/espaces/etat` rend `cats` — le tableau, ou `null` quand rien n'est réglé — sur les cinq réponses d'un espace
       VIVANT (payée, suspendue, absente de l'annuaire, vérification impossible, et le `.catch`), JAMAIS sur la fermeture ;
       une valeur écrite à la main dans l'annuaire n'est jamais servie ; `/espaces/statut` le rend pour la fiche ;
     · le journal des gestes nomme le geste, sans le nom d'accès. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = process.env.SERVEUR_FICHIER ? path.resolve(process.env.SERVEUR_FICHIER) : path.join(RACINE, 'server', 'index.js');
const SRV = fs.readFileSync(SERVEUR, 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c, info) => v(t + (info !== undefined && !c ? ' — ' + String(info).slice(0, 200) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2870-'));
const enfants = [];
const fin = () => { enfants.forEach(e => { try { e.kill('SIGKILL'); } catch (x) {} }); try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 120000).unref();
/* le code sans ses commentaires (ceux qui commencent une ligne) : un motif vise du CODE, jamais une phrase */
const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const SRVN = nu(SRV);

console.log('\n── 2870 · les catégories retenues pour une entreprise : la route, le report, le service ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  /* ══ 1. LE CODE : la liste fermée, et les cinq réponses vivantes de la route ══ */
  console.log('\n1. La liste fermée et la forme de la route (lues dans le CODE du serveur)');
  const lit = nom => { const i = SRVN.indexOf('const ' + nom + ' = ['); if (i < 0) return null; const j = SRVN.indexOf('];', i); try { return eval(SRVN.slice(SRVN.indexOf('[', i), j + 1)); } catch (e) { return null; } };
  const CATS_OK = lit('CATS_OK'), TOUJOURS = lit('CATS_TOUJOURS');
  vrai('(population) CATS_OK (38 rubriques cochables) et les quatre rubriques toujours ouvertes sont lues dans le code', Array.isArray(CATS_OK) && CATS_OK.length === 38 && Array.isArray(TOUJOURS) && TOUJOURS.length === 4, JSON.stringify([CATS_OK && CATS_OK.length, TOUJOURS]));
  v('⛔ aucune rubrique n\'est à la fois cochable et toujours ouverte, et aucun doublon dans la liste', [CATS_OK.filter(k => TOUJOURS.includes(k)), new Set(CATS_OK).size === CATS_OK.length], [[], true]);
  v('   les quatre toujours ouvertes sont le tableau de bord, les utilisateurs, les modules OP et les paramètres', TOUJOURS.slice().sort(), ['dashboard', 'modulesElan', 'parametres', 'utilisateurs']);
  const route = (() => { const i = SRVN.indexOf("app.post('/api/espaces/etat'"); const j = SRVN.indexOf('\n});', i); return i > 0 ? SRVN.slice(i, j) : ''; })();
  const reponses = route.match(/res\.json\(\{ ok: true[^;]*\}\)/g) || [];
  v('⛔ (code de la route) les cinq réponses d\'un espace vivant portent `cats` — seule la fermeture n\'en a pas besoin, et elle n\'en a pas',
    [reponses.length, reponses.filter(r => /\bcats\b/.test(r)).length, reponses.filter(r => /ferme: true/.test(r) && !/\bcats\b/.test(r)).length], [6, 5, 1]);
  const gestes = (() => { const i = SRV.indexOf('const MON_GESTES = {'), j = SRV.indexOf('\n};', i); try { return require('vm').runInNewContext('(' + SRV.slice(i + 'const MON_GESTES = '.length, j + 2) + ')'); } catch (e) { return {}; } })();
  vrai('(population) la route est classée dans le journal des gestes de la Tour (un geste, pas une lecture)', /^a /.test(gestes['espaces/cats'] || ''), gestes['espaces/cats']);

  /* ══ LES DONNÉES : des entreprises fictives ══ */
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const MAINT = Date.now();
  const cle = nom => String(nom).toLowerCase().replace(/[^a-z0-9]+/g, '');
  const code = (t, nom) => Buffer.from(JSON.stringify({ t, k: 'k-' + t + '-' + 'x'.repeat(24), a: 'paul', n: nom }), 'utf8').toString('base64').replace(/=+$/, '');
  /* PAYÉES (abonnement réglé à la main) : depuis le 30 septembre 2026, une entreprise qui ne paie pas est servie suspendue */
  const paye = { formule: 'pro', quantite: 1, formuleTs: MAINT - 1000, formulePar: 'Banc', aboStatut: 'actif', aboPar: 'Banc', aboTs: MAINT - 1000 };
  const esp = (t, nom, o) => Object.assign({ t, nom, email: cle(nom) + '@exemple-2870.fr', ts: MAINT - 1000, code: code(t, nom) }, o || {});
  const T = { un: 't-un-2870', deux: 't-deux-2870', susp: 't-susp-2870', vierge: 't-vierge-2870', main: 't-main-2870', ferme: 't-ferme-2870', muet: 't-muet-2870' };
  const espaces = {
    [cle('cats-un')]: esp(T.un, 'cats-un', paye),
    /* UNE entreprise, DEUX noms : l'ancien et le plus récent (celui que l'application lit) */
    [cle('cats-deux-ancien')]: esp(T.deux, 'cats-deux-ancien', Object.assign({}, paye, { ts: MAINT - 5000, email: 'deux@exemple-2870.fr' })),
    [cle('cats-deux')]: esp(T.deux, 'cats-deux', Object.assign({}, paye, { ts: MAINT - 1000, email: 'deux@exemple-2870.fr' })),
    [cle('cats-susp')]: esp(T.susp, 'cats-susp', { formule: 'pro', quantite: 1 }),
    [cle('cats-vierge')]: esp(T.vierge, 'cats-vierge', paye),
    /* des valeurs écrites À LA MAIN dans l'annuaire : jamais servies telles quelles */
    [cle('cats-main')]: esp(T.main, 'cats-main', Object.assign({}, paye, { cats: ['devis', 'boulangerie', 'clients', 'clients', '__proto__', 42] })),
    [cle('cats-chaine')]: esp('t-chaine-2870', 'cats-chaine', Object.assign({}, paye, { cats: 'tout' })),
    [cle('cats-ferme')]: esp(T.ferme, 'cats-ferme', Object.assign({}, paye, { cats: ['clients'] })),
    [cle('cats-muet')]: esp(T.muet, 'cats-muet', { formule: 'pro', quantite: 1 })
  };
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify(espaces));
  fs.writeFileSync(path.join(D, 'entreprises-fermees.json'), JSON.stringify({ espaces: [T.ferme, T.susp], suspendus: [T.susp], suspendusLe: { [T.susp]: MAINT - 2 * 86400000 } }));
  const vap = webpush.generateVAPIDKeys();
  const config = { vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: sha('mot-de-passe-2870'), comptes: { actif: true } };
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify(config));
  /* monitor.json vit à côté de la configuration : le patron y a son compte, comme en production (la connexion par le mot de passe de
     configuration n'est qu'un repli tant qu'aucun compte n'existe — sa session tombe dès que le premier est créé, ici le collaborateur) */
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({ issues: [], journal: [], archive: [], users: [{ id: 'upatron', nom: 'Patron', email: '', hash: sha('mot-de-passe-2870'), role: 'patron', actif: true, ts: Date.now() }] }));
  const demarrer = async (port, donnees, cfg, extra) => {
    const e = spawn(process.execPath, (extra || []).concat([SERVEUR]), {
      env: Object.assign({}, process.env, { TEAMOP_CONFIG: cfg, TEAMOP_DATA: donnees, PORT: String(port), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json') }), stdio: ['ignore', 'pipe', 'pipe'] });
    let journal = ''; e.stdout.on('data', d => { journal += d; }); e.stderr.on('data', d => { journal += d; });
    enfants.push(e);
    let vivant = false;
    for (let i = 0; i < 150 && !vivant; i++) { try { vivant = (await fetch('http://127.0.0.1:' + port + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
    return { e, vivant, journal: () => journal };
  };
  const PORT = 9200 + (process.pid % 90), B = 'http://127.0.0.1:' + PORT;
  const S = await demarrer(PORT, D, path.join(banc, 'config.json'));
  vrai('le vrai serveur démarre, isolé', S.vivant, S.journal().slice(0, 600));
  if (!S.vivant) { console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  const appel = async (route, corps, jeton, base) => { const r = await fetch((base || B) + route, { method: corps === undefined ? 'GET' : 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: corps === undefined ? undefined : JSON.stringify(corps) });
    let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j: j || {} }; };
  const etat = async (t, base) => (await appel('/api/espaces/etat', { t }, null, base)).j;
  const statut = async nom => (await appel('/api/monitor/espaces/statut', { nom }, PATRON)).j;
  const disque = async () => { await dormir(300); return JSON.parse(fs.readFileSync(path.join(D, 'espaces.json'), 'utf8')); };
  const PATRON = (await appel('/api/monitor/login', { nom: 'Patron', pass: 'mot-de-passe-2870' })).j.token;
  vrai('(population) la Tour se connecte (patron)', typeof PATRON === 'string' && PATRON.length > 10);
  const r0 = await appel('/api/monitor/users', { nom: 'Collab', pass: 'Collab-2870-secret' }, PATRON);
  const COLLAB = (await appel('/api/monitor/login', { nom: 'Collab', pass: 'Collab-2870-secret' })).j.token;
  vrai('(population) un collaborateur (non patron) ouvre une session', r0.s === 200 && typeof COLLAB === 'string' && COLLAB.length > 10);
  const aKey = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

  /* ══ 2. AVANT TOUT RÉGLAGE : « tout est ouvert » ══ */
  console.log('\n2. Avant tout réglage : `cats: null` — la clé est PRÉSENTE, l\'application sait que le serveur la connaît');
  const E0 = await etat(T.vierge);
  v('⛔ une entreprise jamais réglée : `cats` est présent et vaut null (pas absent : absent veut dire « serveur d\'avant »)', [aKey(E0, 'cats'), E0.cats, E0.paye, !!E0.formule], [true, null, true, true]);
  v('   la Tour le relit dans le statut de l\'espace', (await statut('cats-vierge')).cats, null);
  v('⛔ un tableau d\'annuaire écrit à la main n\'est servi que dans la liste et l\'ordre de CATS_OK (rien d\'étranger, pas de doublon)', (await etat(T.main)).cats, ['clients', 'devis']);
  v('⛔ un champ qui n\'est pas un tableau vaut « jamais réglé » — dans le doute, on ne ferme rien', (await etat('t-chaine-2870')).cats, null);

  /* ══ 3. LA ROUTE : qui, et ce qu'elle refuse ══ */
  console.log('\n3. La route : le patron seul, et les refus ne changent RIEN');
  const avantRefus = JSON.stringify(await disque());
  v('sans session : refusée', [401, 403].includes((await appel('/api/monitor/espaces/cats', { nom: 'cats-un', cats: ['clients'] })).s), true);
  const rCollab = await appel('/api/monitor/espaces/cats', { nom: 'cats-un', cats: ['clients'] }, COLLAB);
  v('⛔ un collaborateur (non patron) : 403 — restreindre une application est un geste de patron', rCollab.s, 403);
  v('   un espace inconnu : 404', (await appel('/api/monitor/espaces/cats', { nom: 'inconnu-2870', cats: ['clients'] }, PATRON)).s, 404);
  const refus = {
    'clé hors liste': { nom: 'cats-un', cats: ['clients', 'boulangerie'] },
    'rubrique toujours ouverte (non cochable)': { nom: 'cats-un', cats: ['clients', 'dashboard'] },
    'paramètres (non cochable)': { nom: 'cats-un', cats: ['parametres'] },
    'doublon': { nom: 'cats-un', cats: ['clients', 'devis', 'clients'] },
    'élément qui n\'est pas une chaîne': { nom: 'cats-un', cats: ['clients', 42] },
    'propriété héritée': { nom: 'cats-un', cats: ['__proto__'] },
    'une chaîne au lieu d\'un tableau': { nom: 'cats-un', cats: 'clients' },
    'un objet': { nom: 'cats-un', cats: { clients: true } },
    '⛔ le champ `cats` ABSENT (un oubli ne rouvre rien)': { nom: 'cats-un' },
    'trop de rubriques': { nom: 'cats-un', cats: CATS_OK.concat(CATS_OK) }
  };
  for (const [t, corps] of Object.entries(refus)) v('refusée (400) : ' + t, (await appel('/api/monitor/espaces/cats', corps, PATRON)).s, 400);
  const rFmt = await appel('/api/monitor/espaces/cats', refus['clé hors liste'], PATRON);
  vrai('   et le refus DIT quelle clé est en cause (la Tour l\'affiche)', /boulangerie/.test(rFmt.j.error || ''), JSON.stringify(rFmt.j));
  v('⛔ aucun de ces refus n\'a touché l\'annuaire, ni le service', [JSON.stringify(await disque()) === avantRefus, (await etat(T.un)).cats], [true, null]);

  /* ══ 4. POSER, SERVIR, RELIRE ══ */
  console.log('\n4. Poser une liste : servie dans l\'ordre de la liste, sur le disque, avec qui et quand');
  const r1 = await appel('/api/monitor/espaces/cats', { nom: 'cats-un', cats: ['devis', 'clients', 'planning'] }, PATRON);
  v('⛔ le patron retient trois catégories (200), rendues dans l\'ordre de CATS_OK', [r1.s, r1.j.ok, r1.j.cats], [200, true, ['planning', 'clients', 'devis']]);
  const E1 = await etat(T.un);
  v('⛔ /api/espaces/etat les rend — sur la réponse d\'une entreprise PAYÉE, avec sa formule', [E1.cats, E1.paye, E1.formule, E1.suspendu], [['planning', 'clients', 'devis'], true, 'pro', false]);
  v('   la Tour les relit dans le statut de l\'espace', (await statut('cats-un')).cats, ['planning', 'clients', 'devis']);
  const d1 = (await disque())[cle('cats-un')];
  v('⛔ elles sont ÉCRITES dans l\'annuaire, avec qui et quand (il survit à un redémarrage)', [d1.cats, d1.catsPar, typeof d1.catsTs], [['planning', 'clients', 'devis'], 'Patron', 'number']);
  v('   (témoin) le métier, la formule et l\'abonnement n\'ont pas bougé — ce réglage ne touche ni au prix ni au reste', [d1.formule, d1.aboStatut, d1.metier], ['pro', 'actif', undefined]);
  /* le journal des gestes : le geste, la cible (l'identifiant n'est pas le nom d'accès) */
  const J = (await appel('/api/monitor/journal', undefined, PATRON)).j.actions || [];
  const g = J.find(a => a.geste === gestes['espaces/cats']);
  vrai('⛔ le journal des gestes de la Tour nomme le geste (« a choisi les catégories… »)', !!g, JSON.stringify(J.slice(0, 2)));

  /* ══ 5. SUR TOUS LES NOMS DE L'ENTREPRISE ══ */
  console.log('\n5. Une entreprise, plusieurs noms : le réglage est sur TOUS, posé depuis n\'importe lequel');
  const rAnc = await appel('/api/monitor/espaces/cats', { nom: 'cats-deux-ancien', cats: ['factures', 'devis'] }, PATRON);
  const dd = await disque();
  v('⛔ posé depuis l\'ANCIEN nom, il est écrit sur les deux (l\'application lit le plus récent)', [rAnc.s, dd[cle('cats-deux')].cats, dd[cle('cats-deux-ancien')].cats], [200, ['devis', 'factures'], ['devis', 'factures']]);
  v('   … et l\'application, qui lit le nom le plus récent, le reçoit', (await etat(T.deux)).cats, ['devis', 'factures']);
  /* « Revoir le lien » sur un nom NEUF de la même entreprise (même identifiant) : la reconstruction reprend le réglage de l'entreprise */
  const rNeuf = await appel('/api/monitor/espaces', { nom: 'cats-deux-nouveau', code: espaces[cle('cats-deux')].code, email: espaces[cle('cats-deux')].email }, PATRON);
  const dn = await disque();
  v('⛔ un nom NEUF de la même entreprise reprend les catégories de l\'entreprise (sinon l\'application, qui lit le plus récent, rouvrirait tout)',
    [rNeuf.s, (dn[cle('cats-deux-nouveau')] || {}).cats, (await etat(T.deux)).cats], [200, ['devis', 'factures'], ['devis', 'factures']]);
  /* null depuis un autre nom : retiré partout, champs compris */
  const rNull0 = await appel('/api/monitor/espaces/cats', { nom: 'cats-deux', cats: null }, PATRON);
  const dz = await disque();
  const tous = ['cats-deux', 'cats-deux-ancien', 'cats-deux-nouveau'].map(n => dz[cle(n)] || {});
  vrai('(population) les trois noms de l\'entreprise sont dans l\'annuaire — sinon « aucun champ » ne prouverait rien', ['cats-deux', 'cats-deux-ancien', 'cats-deux-nouveau'].every(n => !!dz[cle(n)]));
  v('⛔ `null` (« tout rouvrir ») SUPPRIME le champ — et ses deux compagnons — sur les trois noms', [rNull0.s, rNull0.j.cats, tous.map(x => ['cats', 'catsPar', 'catsTs'].filter(k => aKey(x, k)))], [200, null, [[], [], []]]);
  const E5 = await etat(T.deux);
  v('   et le service dit `cats: null` (clé présente)', [aKey(E5, 'cats'), E5.cats], [true, null]);

  /* ══ 6. « REVOIR LE LIEN DE CONNEXION » ══ */
  console.log('\n6. « Revoir le lien de connexion » reconstruit l\'entrée de zéro : le réglage doit lui survivre');
  const rP = await appel('/api/monitor/espaces/cats', { nom: 'cats-un', cats: ['clients', 'devis'] }, PATRON);
  const rl = await appel('/api/monitor/espaces', { nom: 'cats-un', code: espaces[cle('cats-un')].code, email: espaces[cle('cats-un')].email }, PATRON);
  const dl = (await disque())[cle('cats-un')];
  v('⛔ le lien redonné (la fiche est reconstruite) : les catégories RESTENT — sur le disque, au service, dans le statut',
    [rP.s, rl.s, dl.cats, dl.catsPar, typeof dl.catsTs, (await etat(T.un)).cats, (await statut('cats-un')).cats],
    [200, 200, ['clients', 'devis'], 'Patron', 'number', ['clients', 'devis'], ['clients', 'devis']]);
  /* (témoin) le même geste sur une entreprise JAMAIS réglée n'invente rien */
  await appel('/api/monitor/espaces', { nom: 'cats-vierge', code: espaces[cle('cats-vierge')].code, email: espaces[cle('cats-vierge')].email }, PATRON);
  const dv = (await disque())[cle('cats-vierge')];
  v('   (témoin) « Revoir le lien » d\'une entreprise jamais réglée n\'invente aucun réglage', [aKey(dv, 'cats'), (await etat(T.vierge)).cats], [false, null]);

  /* ══ 7. [] EST UN CHOIX, NULL EST LE RETRAIT ══ */
  console.log('\n7. Vide n\'est pas « jamais réglé »');
  const rVide = await appel('/api/monitor/espaces/cats', { nom: 'cats-un', cats: [] }, PATRON);
  const EV = await etat(T.un);
  v('⛔ un tableau VIDE est un choix explicite (rien de cochable n\'est ouvert) : servi tel quel, ce n\'est pas null', [rVide.s, EV.cats, aKey((await disque())[cle('cats-un')], 'cats')], [200, [], true]);
  const rRe = await appel('/api/monitor/espaces/cats', { nom: 'cats-un', cats: null }, PATRON);
  v('   `null` revient à « tout » : le champ disparaît, le service dit null', [rRe.s, aKey((await disque())[cle('cats-un')], 'cats'), (await etat(T.un)).cats], [200, false, null]);
  const dem = await appel('/api/monitor/espaces/cats', { nom: 'cats-un', cats: null }, PATRON);
  v('   (témoin) retirer ce qui n\'est pas réglé : 200, rien à faire, rien d\'inventé', [dem.s, aKey((await disque())[cle('cats-un')], 'cats')], [200, false]);
  const rToutes = await appel('/api/monitor/espaces/cats', { nom: 'cats-un', cats: CATS_OK.slice().reverse() }, PATRON);
  v('   (limite) les 38 rubriques d\'un coup passent, rangées dans l\'ordre de la liste', [rToutes.s, rToutes.j.cats], [200, CATS_OK]);
  await appel('/api/monitor/espaces/cats', { nom: 'cats-un', cats: null }, PATRON);

  /* ══ 8. LES CINQ FORMES D'UN ESPACE VIVANT, ET LA FERMETURE ══ */
  console.log('\n8. `cats` accompagne toutes les formes d\'un espace vivant — jamais la fermeture');
  await appel('/api/monitor/espaces/cats', { nom: 'cats-susp', cats: ['clients', 'factures'] }, PATRON);
  const ES = await etat(T.susp);
  v('⛔ SUSPENDUE (sans formule, motif public neutre) : elle reçoit AUSSI ses catégories — le menu grisé ne change pas de contenu au règlement',
    [ES.suspendu, ES.paye, ES.formule, ES.cats], [true, false, undefined, ['clients', 'factures']]);
  const EA = await etat('t-absente-2870');
  v('⛔ une entreprise ABSENTE de l\'annuaire (la réponse qui sort avant la formule) : `cats: null`, clé présente', [EA.ok, aKey(EA, 'cats'), EA.cats, EA.suspendu], [true, true, null, false]);
  /* fermée pour de bon : pas de champ d'entreprise du tout */
  const EF = await etat(T.ferme);
  v('⛔ une entreprise FERMÉE reçoit `{ok, ferme:true}` et rien d\'autre — pas de `cats` (l\'application vide son stockage avant de lire quoi que ce soit)', [EF.ferme, aKey(EF, 'cats'), Object.keys(EF).sort()], [true, false, ['ferme', 'ok']]);
  /* la vérification impossible : un second serveur, Stripe muet (la clé posée, aucune réponse) */
  const banc2 = path.join(banc, 'muet'); fs.mkdirSync(path.join(banc2, 'data'), { recursive: true });
  const dm = JSON.parse(fs.readFileSync(path.join(D, 'espaces.json'), 'utf8'));
  dm[cle('cats-muet')].cats = ['clients', 'devis'];
  fs.writeFileSync(path.join(banc2, 'data', 'espaces.json'), JSON.stringify(dm));
  fs.writeFileSync(path.join(banc2, 'config.json'), JSON.stringify(Object.assign({}, config, { stripe: { secretKey: 'sk_de_banc_2870' } })));
  const MUET = path.join(banc2, 'stripe-muet.js');
  fs.writeFileSync(MUET, `const vrai = globalThis.fetch;\nglobalThis.fetch = async function (url, opts) { const u = String(url && url.url || url); if (u.startsWith('https://api.stripe.com/')) throw new Error('Stripe muet (banc 2870)'); return vrai.apply(this, arguments); };\n`);
  const PORT2 = PORT + 1, S2 = await demarrer(PORT2, path.join(banc2, 'data'), path.join(banc2, 'config.json'), ['--require', MUET]);
  vrai('le second serveur répond (clé Stripe posée, Stripe muet)', S2.vivant, S2.journal().slice(0, 400));
  if (S2.vivant) {
    const B2 = 'http://127.0.0.1:' + PORT2;
    const EM = await etat(T.muet, B2);
    v('⛔ VÉRIFICATION IMPOSSIBLE (Stripe muet : on ne sait pas) : l\'application garde ce qu\'elle savait, et reçoit les catégories',
      [EM.verificationImpossible, EM.formule, EM.cats], [true, undefined, ['clients', 'devis']]);
    const EM0 = await etat(T.main, B2);
    v('   (témoin) même forme, entreprise jamais réglée : `cats` null, clé présente', [aKey(EM0, 'cats')], [true]);
  }

  /* ══ 9. UNE ÉCRITURE REFUSÉE SE DIT ET SE DÉFAIT ══ */
  console.log('\n9. Annuaire non écrit : 500, et la mémoire revient en arrière');
  await appel('/api/monitor/espaces/cats', { nom: 'cats-un', cats: ['clients'] }, PATRON);
  await dormir(300);
  fs.mkdirSync(path.join(D, 'espaces.json.tmp'));   // écrire le fichier temporaire échoue (EISDIR) : l'annuaire ne peut pas s'écrire
  const rKo = await appel('/api/monitor/espaces/cats', { nom: 'cats-un', cats: ['devis', 'factures'] }, PATRON);
  const rKoNull = await appel('/api/monitor/espaces/cats', { nom: 'cats-un', cats: null }, PATRON);
  v('⛔ l\'écriture échoue : la route DIT 500 (la Tour l\'affiche), pour une pose comme pour un retrait', [rKo.s, rKoNull.s, /enregistr/.test(rKo.j.error || '')], [500, 500, true]);
  v('⛔ … et la mémoire est DÉFAITE : le service sert toujours le réglage d\'avant (sinon il servirait un choix perdu au redémarrage)',
    [(await etat(T.un)).cats, (await statut('cats-un')).cats], [['clients'], ['clients']]);
  fs.rmdirSync(path.join(D, 'espaces.json.tmp'));
  const rOk = await appel('/api/monitor/espaces/cats', { nom: 'cats-un', cats: ['devis', 'factures'] }, PATRON);
  v('   (témoin) l\'obstacle levé, le même geste passe', [rOk.s, (await etat(T.un)).cats], [200, ['devis', 'factures']]);

  /* ══ 10. LE REDÉMARRAGE ══ */
  console.log('\n10. Le réglage survit à un redémarrage');
  await dormir(300);
  try { S.e.kill('SIGKILL'); } catch (e) {}
  await dormir(300);
  const S3 = await demarrer(PORT + 2, D, path.join(banc, 'config.json'));
  vrai('le serveur redémarre sur le même annuaire', S3.vivant);
  if (S3.vivant) v('⛔ les catégories retenues sont toujours servies après le redémarrage', (await etat(T.un, 'http://127.0.0.1:' + (PORT + 2))).cats, ['devis', 'factures']);

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a JETÉ : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });

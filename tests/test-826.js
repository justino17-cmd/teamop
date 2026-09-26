/* ⛔ CE QUE CE FICHIER GARDE — aucun compte « OP Admin » ne naît sur un appareil qui rejoint une
   entreprise EXISTANTE. ELAN, 26 septembre 2026, capture à l'appui : « OP Admin · Administrateur ·
   @florent-3 · 🔑 à définir · même nom qu'un autre compte », quinze jours après le correctif du
   11 septembre (v656, test-651).

   Rejoué au navigateur sur la v756 de production (`scratchpad/sonde-admin-fantome.js`, copie de la
   bêta où seul BETA_ESSAI vaut false, vraie synchro contre un faux serveur posé dans la page) :
     v756 → 7 ✓ 5 ✗ : un navigateur neuf qui ouvre le lien d'ELAN fabrique « OP Admin » (identifiant
            aléatoire), boot() le renomme « florent » avec le mot de passe PROVISOIRE du lien, la
            fusion le renomme « florent-3 » (florent et florent-2 existent), et l'appareil l'ENVOIE
            à toute l'équipe — il partirait dans l'annuaire de connexion du serveur ;
     v757 → 12 ✓ 0 ✗ : aucun compte fabriqué, rien envoyé ; une entreprise NEUVE garde sa porte,
            une seule, à l'identifiant FIXE.

   La cause : v656 avait fermé la création dans migrate(), pas celle du SEMIS. `load()` fait
   « pas de base → seed() », seed() porte un « OP Admin » en production, et `users` n'est pas dans
   COLLECTIONS_DONNEES — les deux vidages le laissaient passer. Et « ESPACE NEUF » (la seule
   création légitime, au premier instantané d'une équipe vide) ne trouvait jamais
   `elan_admin_login` : boot() l'effaçait avant. La seule porte d'une entreprise neuve était donc
   le compte du semis — celui-là même qui fabriquait les fantômes.

   Trois règles, gardées ici :
     1. rattaché et sans base, l'appareil n'a AUCUN compte (load) ;
     2. rattaché et sans compte, boot() GARDE les clés du lien pour le premier instantané ;
     3. le premier instantané tranche : équipe vide → la porte (identifiant fixe, clés du lien) ;
        équipe existante → les clés sont OUBLIÉES. */
const fs = require('fs'), crypto = require('crypto');
const APP = fs.readFileSync(__dirname + '/../app.html', 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); }
  else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
/* On ne cherche que dans le CODE : ce fichier est très commenté, et les noms qu'on cherche sont
   écrits dans les commentaires qui expliquent le correctif (règle du dépôt). */
const CODE = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const tranche = (debut, fin) => { const i = CODE.indexOf(debut); if (i < 0) return ''; const j = CODE.indexOf(fin, i + debut.length); return CODE.slice(i, j < 0 ? i + 4000 : j); };

console.log('1. Rattaché et sans base : aucun compte sur l\'appareil');
{
  const load = tranche('function load(){', 'function migrate(d){');
  v('load() est trouvée', load.length > 500, true);
  v('⛔ rattaché et sans base → la liste des comptes est vidée', /if\(neuve && espaceRattache\(\)\) d\.users=\[\];/.test(load), true);
  /* L'ordre compte : après seed()/migrate() (qui posent le compte), avant l'écriture du drapeau
     de vidage (qui enregistre la base) — sinon le compte du semis serait déjà rangé. */
  const iSeed = load.indexOf('migrate(seed())'), iVide = load.indexOf('if(neuve && espaceRattache()) d.users=[];'), iDrapeau = load.indexOf("localStorage.setItem(STORE_KEY");
  v('…après le semis, et avant le premier enregistrement de la base', iSeed > 0 && iVide > iSeed && iDrapeau > iVide, true);
  /* Le semis porte toujours son compte en production : c'est lui que la garde doit arrêter. Le
     jour où il ne l'aurait plus, la garde resterait juste — mais ce banc doit le savoir. */
  v('le semis porte encore un « OP Admin » en production (la garde a un objet)', /users: BETA_ESSAI \? \[\] : \[[^\n]*\n\s*\{id:adminId,prenom:'OP',nom:'Admin'/.test(CODE), true);
}

console.log('\n2. La vraie adminDepartAppliquer(), extraite du fichier et jouée');
{
  const def = n => (CODE.match(new RegExp('(?:async )?function ' + n + '\\(', 'g')) || []).length;
  v('une seule définition de adminDepartAppliquer', def('adminDepartAppliquer'), 1);
  v('une seule définition de adminDepartOublier', def('adminDepartOublier'), 1);
  v('une seule définition de savedLoginPoser', def('savedLoginPoser'), 1);
  /* Chaque pièce jusqu'à SA fin, jamais « jusqu'au prochain } » : une découpe qui déborde rend
     un verdict faux (règle du dépôt). */
  const piece = (debut, fin) => { const i = CODE.indexOf(debut); if (i < 0) return ''; const j = CODE.indexOf(fin, i); return j < 0 ? '' : CODE.slice(i, j + fin.length); };
  const src = [piece('const ADMIN_DEPART_CLES=', ';\n'), piece('function adminDepartOublier(', '}\n'),
    piece('function savedLoginPoser(', '}catch(_e){} }'), piece('async function adminDepartAppliquer(', '\n  return ch;\n}')];
  v('les quatre pièces sont trouvées', src.every(s => s.length > 20), true);
  const jouer = async (etat) => {
    const mem = Object.assign({}, etat.cles);
    const localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, x) => { mem[k] = String(x); }, removeItem: k => { delete mem[k]; } };
    const sha256 = async s => crypto.createHash('sha256').update(String(s)).digest('hex');
    const db = { users: JSON.parse(JSON.stringify(etat.users)) };
    const f = new Function('localStorage', 'db', 'sha256', 'espaceRattache', src.join('\n') + '\nreturn adminDepartAppliquer;');
    const rend = await f(localStorage, db, sha256, () => !!etat.rattache)();
    return { rend, users: db.users, cles: ['elan_admin_login', 'elan_admin_mdph', 'elan_admin_mail'].map(k => (k in mem ? mem[k] : null)), saved: mem.elan_savedLogin || null };
  };
  const MH = 'a'.repeat(64), LIEN = { elan_admin_login: 'florent', elan_admin_mdph: MH, elan_admin_mail: 'contact@exemple.invalid' };
  const PORTE = { id: 'u-op-admin', prenom: 'OP', nom: 'Admin', login: 'admin', role: 'admin', pinHash: '', actif: true };
  (async () => {
    /* ⛔ LE CŒUR : rattaché, sans compte — boot() ne décide rien et GARDE les clés. */
    let r = await jouer({ rattache: true, users: [], cles: LIEN });
    v('⛔ rattaché et sans compte : rien n\'est fait…', [r.rend, r.users.length], [false, 0]);
    v('…et les clés du lien sont GARDÉES pour le premier instantané', r.cles, ['florent', MH, 'contact@exemple.invalid']);
    /* L'équipe était vide : « ESPACE NEUF » a posé la porte, la fonction la nomme. */
    r = await jouer({ rattache: true, users: [PORTE], cles: LIEN });
    v('la porte prend l\'identifiant de départ', r.users[0].login, 'florent');
    v('…le mot de passe provisoire du lien', r.users[0].pinHash, MH);
    v('…l\'adresse de l\'entreprise', r.users[0].email, 'contact@exemple.invalid');
    v('…garde son identifiant FIXE', r.users[0].id, 'u-op-admin');
    v('…est proposée à l\'écran de connexion', r.saved, 'florent');
    v('…et les clés sont consommées', r.cles, [null, null, null]);
    /* Le vrai « florent » est déjà là : on ne renomme rien, et on oublie. */
    r = await jouer({ rattache: true, users: [{ id: 'u-b', login: 'florent', pwdHash: 'b'.repeat(64), role: 'admin' }, PORTE], cles: LIEN });
    v('un « florent » existe déjà : la porte n\'est PAS renommée', r.users.map(u => u.login), ['florent', 'admin']);
    v('…et les clés sont oubliées quand même', r.cles, [null, null, null]);
    /* Un lien dont l'identifiant de départ est une adresse : compte du site, sans mot de passe local. */
    r = await jouer({ rattache: true, users: [PORTE], cles: { elan_admin_login: 'patron@exemple.invalid' } });
    v('identifiant de départ en adresse e-mail → compte du site, sans code local', [r.users[0].login, !!r.users[0].compteSite, 'pinHash' in r.users[0]], ['patron@exemple.invalid', true, false]);
    /* Hors entreprise, rien ne change : on applique tout de suite, comme avant. */
    r = await jouer({ rattache: false, users: [PORTE], cles: LIEN });
    v('appareil non rattaché : la règle d\'avant, inchangée', [r.users[0].login, r.cles[0]], ['florent', null]);
    r = await jouer({ rattache: true, users: [PORTE], cles: {} });
    v('sans lien, rien ne bouge', [r.rend, r.users[0].login], [false, 'admin']);
    suite();
  })().catch(e => { ko++; console.log('  ✗ exécution : ' + e.message); fin(); });
}

function suite() {
  console.log('\n3. Les deux appelants, et ce que le premier instantané tranche');
  const boot = tranche('async function boot(){', '\nfunction renderCreateAdmin(');
  v('boot() est trouvée', boot.length > 1000, true);
  v('boot() passe par adminDepartAppliquer()', /try\{ if\(await adminDepartAppliquer\(\)\) ch=true; \}catch\(e\)\{\}/.test(boot), true);
  /* ⛔ C'était LE défaut : boot() effaçait les clés avant que l'équipe ait parlé. */
  v('⛔ boot() n\'efface plus les clés du lien elle-même', /removeItem\('elan_admin_login'\)/.test(boot), false);
  const neuf = tranche("if(!d||(!d.enc&&!d.db)){ try{ localStorage.removeItem('elan_frais'); }catch(e){}", 'if(d.enc&&plain===null)');
  v('la branche « équipe vide » est trouvée', neuf.length > 200, true);
  v('équipe vide : la porte a l\'identifiant FIXE', /const porte=\{id:ID_ADMIN_DEPART,prenom:'OP',nom:'Admin',login:'admin',role:'admin',pinHash:'',actif:true\};/.test(neuf), true);
  v('…et prend les clés du lien (adminDepartAppliquer)', /await adminDepartAppliquer\(\);/.test(neuf), true);
  v('…jamais sans mot de passe (la porte d\'avant avait le code par défaut)', /if\(!porte\.pinHash&&!porte\.sansMdp&&!porte\.compteSite\) porte\.pinHash=await sha256\('1234'\);/.test(neuf), true);
  /* ⛔ L'autre moitié : une équipe qui existe fait oublier les clés — sinon un chargement futur
     renommerait un compte qui n'est pas le leur. */
  v('⛔ équipe existante : les clés du lien sont oubliées', /return; \}[^\n]*\n\s*adminDepartOublier\(\);/.test(neuf + CODE.slice(CODE.indexOf(neuf) + neuf.length, CODE.indexOf(neuf) + neuf.length + 400)), true);
  /* Plus aucun « OP Admin » à identifiant aléatoire hors du semis (qui ne passe plus chez un
     appareil rattaché) et du portail (qui nomme la personne, avec SON mot de passe). */
  const fabriques = (CODE.match(/prenom:'OP',nom:'Admin'/g) || []).length;
  v('trois endroits seulement écrivent « OP Admin » : le semis, migrate() hors entreprise, la porte', fabriques, 3);

  /* ⛔ LA MÊME FAMILLE, PAR LE PORTAIL. « 🚀 Activer mon espace » (espace.html) reste dans le fil des
     messages pour toujours ; le retoucher pour une entreprise qui EXISTE ouvrait « Créez votre compte
     administrateur » avant d'avoir lu l'équipe — rejoué sur la v756 (sonde, cas C) : un SECOND
     administrateur « Bruno Folrent @florent-3 » partait chez toute l'équipe. */
  console.log('\n4. Le portail : le formulaire « Créez votre compte administrateur » attend que l\'équipe ait parlé');
  v('⛔ boot() : rattaché et sans compte, le formulaire ATTEND (écran d\'attente + synchro), il ne s\'ouvre pas d\'office',
    /if\(!BETA_ESSAI && espaceRattache\(\) && !\(db\.users\|\|\[\]\)\.length && syncEnabled\(\)\)\{\s*renderCreateAdminAttente\(\); try\{ syncInit\(\); \}catch\(e\)\{\} return; \}\s*renderCreateAdmin\(\); return; \}/.test(boot), true);
  v('équipe vide : le formulaire est la porte', /try\{ if\(!currentUser && sessionStorage\.getItem\('elan_create_admin'\)==='1'\) renderCreateAdmin\(\); \}catch\(_e\)\{\}/.test(neuf), true);
  /* ce bloc vit APRÈS le « return » de l'équipe vide et AVANT la lecture chiffrée : dans la tranche */
  v('⛔ équipe habitée : la demande est oubliée et c\'est la CONNEXION qui s\'ouvre',
    /adminDepartOublier\(\);[\s\S]{0,200}sessionStorage\.removeItem\('elan_create_admin'\);\s*if\(!currentUser\)\{ renderLogin\(\);/.test(neuf), true);
  const att = (CODE.match(/function renderCreateAdminAttente\(\)\{[\s\S]*?\n\}/) || [''])[0];
  v('l\'écran d\'attente existe, et sans réponse il le DIT et propose de réessayer', att.length > 100 && /Réessayer/.test(att) && /_syncGotInitial/.test(att), true);
  v('la preuve au navigateur (cas C et D de la sonde) existe', fs.existsSync(__dirname + '/../scratchpad/sonde-admin-fantome.js')
    && /Activer mon espace/.test(fs.readFileSync(__dirname + '/../scratchpad/sonde-admin-fantome.js', 'utf8')), true);
  fin();
}
function fin() { console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0); }

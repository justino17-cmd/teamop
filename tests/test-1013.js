/* ⛔ CE QUE CE FICHIER GARDE — QUATRE CORRECTIFS DE L'APPLICATION TROUVÉS PAR LE CONTRÔLE CLIENT MYSTÈRE (17 octobre 2026).

   Le contrôle (scripts/controle/) joue une cliente fictive du site jusqu'à l'application. Il a relevé, chez une
   entreprise NEUVE :
     1. son compte de départ s'appelait « OP Admin » — dans son application, son journal, ses documents — alors que sa
        demande disait « Camille Exemple » ; la Tour (v2.87) fait désormais voyager le prénom et le nom dans le code de
        l'espace (champs « p » et « f »), l'application les pose sur la porte encore anonyme (`adminDepartAppliquer`) ;
     2. la rubrique « Modules OP » écrivait « interface 100 % Organilog » — le nom d'un autre logiciel ;
     3. la fenêtre de langue revenait à chaque ouverture tant qu'on n'avait pas répondu, et la fenêtre du mot de passe
        la cachait à la première connexion — l'application est en français par défaut : la question ne se pose plus
        qu'à un appareil réglé dans une autre langue ;
     4. chaque ouverture appelait fonts.googleapis.com (l'adresse IP du client chez Google) — les polices viennent de
        teamop.fr (vitrine/polices/, licence OFL).
   Le premier se JOUE (la vraie fonction, dans un bac à sable) ; les trois autres se lisent dans le code sans ses
   commentaires (CLAUDE.md : « un motif de banc doit viser du code, jamais une phrase »). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const RACINE = path.join(__dirname, '..');
const APP = fs.readFileSync(process.env.APP_FICHIER ? path.resolve(process.env.APP_FICHIER) : path.join(RACINE, 'app.html'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++; console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a))); };
const vrai = (t, c) => v(t, !!c, true);
/* le code sans les commentaires qui COMMENCENT une ligne (les seuls que ce dépôt utilise pour expliquer du code) */
const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const APPN = nu(APP);
/* une fonction, ancrée sur sa DÉCLARATION, bornée par ses accolades (chaînes, gabarits et commentaires sautés) */
function fonction(src, nom, prefixe) {
  const m = new RegExp('(^|\\n)[ \\t]*' + (prefixe || '(?:async )?function ') + nom.replace(/[.$]/g, '\\$&') + '\\s*[=(]').exec(src); if (!m) return '';
  let k = src.indexOf('{', m.index + m[0].length - 1), prof = 0, q = null; const d = m.index + m[1].length;
  for (; k < src.length; k++) { const c = src[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '/' && src[k + 1] === '/') { k = src.indexOf('\n', k); continue; }
    if (c === '/' && src[k + 1] === '*') { k = src.indexOf('*/', k + 2) + 1; continue; }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) return src.slice(d, k + 1); } }
  return '';
}

(async () => {
  console.log('\n── test-1013 : les correctifs du contrôle client mystère, dans l\'application ──');
  /* ── 1. le compte de départ porte le nom de la demande ── */
  const ADA = fonction(APP, 'adminDepartAppliquer'), CLES = (/^const ADMIN_DEPART_CLES=\[[^\]]*\];/m.exec(APP) || [''])[0];
  vrai('(population) adminDepartAppliquer et ADMIN_DEPART_CLES sont trouvés dans le fichier réel', ADA.length > 300 && CLES.length > 20);
  const jouer = async (cles, users, rattache) => {
    const LS = new Map(Object.entries(cles));
    const ctx = { db: { users }, console,
      localStorage: { getItem: k => LS.has(k) ? LS.get(k) : null, setItem: (k, x) => LS.set(k, String(x)), removeItem: k => LS.delete(k) },
      espaceRattache: () => !!rattache, sha256: async s => 'h-' + s, savedLoginPoser: () => {} };
    vm.createContext(ctx);
    vm.runInContext(CLES + '\nfunction adminDepartOublier(){ ADMIN_DEPART_CLES.forEach(k=>{ try{ localStorage.removeItem(k); }catch(e){} }); }\n' + ADA + '\nthis.f=adminDepartAppliquer;', ctx);
    const ch = await ctx.f();
    return { ch, u: users[0], restes: [...LS.keys()] };
  };
  const porte = () => [{ id: 'adm', prenom: 'OP', nom: 'Admin', login: 'admin', role: 'admin', pinHash: '', actif: true }];
  const base = { elan_admin_login: 'camille', elan_admin_mdph: 'empreinte', elan_admin_mail: 'camille@exemple.fr' };
  let r = await jouer(Object.assign({}, base, { elan_admin_prenom: 'Camille', elan_admin_nomfam: 'Exemple' }), porte(), false);
  v('la porte anonyme prend le prénom et le nom de la demande', [r.u.prenom, r.u.nom], ['Camille', 'Exemple']);
  v('…et son identifiant de départ', r.u.login, 'camille');
  v('…et les deux clés partent avec les autres (rien ne traîne sur l\'appareil)', r.restes.filter(k => /elan_admin_/.test(k)), []);
  r = await jouer(Object.assign({}, base), porte(), false);
  v('sans nom dans le lien (une Tour d\'avant) : « OP Admin » reste, rien n\'est inventé', [r.u.prenom, r.u.nom], ['OP', 'Admin']);
  const nomme = porte(); nomme[0].prenom = 'Justin'; nomme[0].nom = 'Patron';
  r = await jouer(Object.assign({}, base, { elan_admin_prenom: 'Camille', elan_admin_nomfam: 'Exemple' }), nomme, false);
  v('un compte déjà nommé garde son nom', [r.u.prenom, r.u.nom], ['Justin', 'Patron']);
  r = await jouer(Object.assign({}, base, { elan_admin_prenom: 'Camille' }), porte(), false);
  v('un prénom sans nom de famille : le prénom seul', [r.u.prenom, r.u.nom], ['Camille', '']);
  /* le lien les apporte : la lecture du code d'entreprise pose les deux clés */
  const LIEN = fonction(APP, 'teamopLienCheck');
  vrai('(population) teamopLienCheck est trouvée', LIEN.length > 200);
  vrai('le lien d\'entreprise pose elan_admin_prenom et elan_admin_nomfam depuis « p » et « f »',
    /if\(o\.p\) localStorage\.setItem\('elan_admin_prenom'/.test(nu(LIEN)) && /if\(o\.f\) localStorage\.setItem\('elan_admin_nomfam'/.test(nu(LIEN)));

  /* ── 2. « Modules OP » ne cite plus un autre logiciel ── */
  /* la vue porte des gabarits imbriqués (`${items.map(x=>`…`)}`) que le parcours d'accolades ne suit pas : on la borne à
     la déclaration suivante de premier niveau, et on prouve qu'on l'a (sa fermeture `};` en fin de tranche) */
  const iMod = APP.search(/\nviews\.modulesElan=function\(\)\{/), finMod = iMod < 0 ? -1 : APP.slice(iMod + 1).search(/\n(?:views\.|function |async function |let |const |var )/);
  const MOD = iMod < 0 || finMod < 0 ? '' : APP.slice(iMod, iMod + 1 + finMod);
  vrai('(population) la vue Modules OP est trouvée, entière', MOD.length > 200 && /\n\};\s*$/.test(MOD));
  vrai('la vue Modules OP n\'écrit pas « Organilog » à l\'écran', !/Organilog/i.test(nu(MOD)));

  /* ── 3. la langue ne se demande qu'à un appareil non français ── */
  const i = APPN.indexOf('setTimeout(openLangPicker,300)');
  vrai('(population) l\'ouverture de la fenêtre de langue au démarrage est trouvée', i > 0);
  const ligne = APPN.slice(APPN.lastIndexOf('\n', i), i);
  vrai('elle est gardée par un test « l\'appareil n\'est pas en français »', /!\/\^fr\\b\/i\.test\(/.test(ligne) && /prefLocalLire\('elan_lang'\)/.test(ligne));

  /* ── 4. aucune police chez Google ; chaque police servie existe ── */
  const tete = APPN.slice(0, APPN.indexOf('<body'));
  vrai('(population) la tête de la page est lue', tete.length > 1000);
  v('aucun lien vers fonts.googleapis.com ni fonts.gstatic.com', (tete.match(/<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>/g) || []), []);
  const polices = [...tete.matchAll(/url\(\/vitrine\/polices\/([\w.-]+\.woff2)\)/g)].map(m => m[1]);
  vrai('(population) des polices sont déclarées depuis /vitrine/polices/ (' + polices.length + ')', polices.length >= 4);
  v('chaque police déclarée existe dans le dépôt', polices.filter(f => !fs.existsSync(path.join(RACINE, 'vitrine', 'polices', f))), []);
  vrai('la licence des polices les accompagne', fs.existsSync(path.join(RACINE, 'vitrine', 'polices', 'OFL-archivo.txt')) && fs.existsSync(path.join(RACINE, 'vitrine', 'polices', 'OFL-space-mono.txt')));

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });

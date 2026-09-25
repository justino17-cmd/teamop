/* ⛔⛔ LA SUSPENSION POUR IMPAYÉ — LA COUTURE ENTRE LE SERVEUR ET L'ÉCRAN.
 *
 * Ce banc existe parce que le défaut qu'il garde était l'INVERSE de ce que Justin avait
 * décidé, et qu'aucune des 117 suites ne le voyait. Mesuré le 22 septembre 2026 sur un VRAI
 * serveur : une entreprise suspendue pour impayé recevait `{ferme:true}` de
 * `/api/espaces/etat`. `app.html` affichait alors « Cet espace a été fermé par TEAM OP » à
 * TOUS ses utilisateurs, puis effaçait `elan_sync_team` — la seule porte qui, de son propre
 * aveu, « ne se rattrape pas au chargement suivant ». Un impayé était coupé de ses données,
 * et ses techniciens l'apprenaient avant lui.
 *
 * La règle décidée par Justin le 20 septembre 2026 : sept jours pour continuer à lire, puis
 * les catégories PAYANTES grisent et l'espace revient au forfait gratuit. « Aucune sauvegarde
 * n'est perdue, aucune tâche qu'ils étaient en train de faire, rien n'est perdu … Avec tous
 * les jours un rappel sur le compte admin. Après, c'est pas aux utilisateurs de savoir si
 * l'entreprise paye ou pas. Que le compte admin. »
 *
 * ⛔ DEUX MOITIÉS, ET ELLES SE LISENT TRÈS BIEN SÉPARÉMENT — c'est pour ça que les deux sont
 * jouées ici : la ROUTE contre un vrai serveur, et les VRAIES fonctions d'`app.html`.
 */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules'))) {
  console.log('\n(sauté : server/node_modules absent)\n0 ✓  0 ✗'); process.exit(0);
}
const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push'));
let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++;
  console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a))); };
const vrai = (t, c, d) => { c ? ok++ : ko++; console.log('  ' + (c ? '✓' : '✗') + ' ' + t + (c ? '' : '\n      → ' + (d === undefined ? '' : d))); };
const dormir = ms => new Promise(r => setTimeout(r, ms));

const APP = fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8');
const SRV = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
/* ⛔ LE NETTOYAGE SÛR (blocs qui COMMENCENT une ligne) : le motif naïf avale 107 069
   caractères d'`app.html`, dont des fonctions entières. */
const NU = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
const NUS = SRV.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');

console.log('\n══ 1. ⛔ UNE SEULE DÉFINITION DU SURSIS, ET ELLE EST PARTAGÉE ══\n');
{
  /* Elle vivait en arrow dans le montage du socle : juste, commentée, et invisible à la seule
     route que l'APPLICATION interroge. Deux copies auraient compté deux délais différents. */
  const defs = (NUS.match(/function sursisJoursDe\s*\(/g) || []).length;
  v('⛔ `sursisJoursDe` est définie EXACTEMENT une fois', defs, 1);
  vrai('⛔ … et le socle l’APPELLE au lieu de la recopier',
    /espaceSursisJours:\s*\(t\)\s*=>\s*sursisJoursDe\(t\)/.test(NUS));
  vrai('⛔ … et la route d’état l’appelle aussi', /const sursisJours = sursisJoursDe\(t\)/.test(NUS));
  /* ⛔ LES DEUX BORNES. Une date dans le FUTUR (horloge du VPS qui recule) rendait 7 + l'écart :
     mesuré, une date à +30 jours donnait 37 jours de sursis à qui ne paye pas. */
  vrai('⛔ le sursis est planché à 0 ET plafonné à 7', /Math\.max\(0,\s*Math\.min\(7,/.test(NUS));
}

console.log('\n══ 2. ⛔⛔ UN SUSPENDU N’EST PAS UN FERMÉ — JOUÉ CONTRE LE VRAI SERVEUR ══\n');
let enfant = null, banc = null;
const arreter = async () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {}
  try { if (banc) fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };

(async () => {
  banc = fs.mkdtempSync(path.join(os.tmpdir(), 'susp-761-'));
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64');
  const CLE = 'cle-propre-de-lentreprise-0123456789';
  fs.mkdirSync(path.join(banc, 'data'), { recursive: true });
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({
    vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', monitorPass: 'x' }));
  const esp = (slug, t) => ({ slug, nom: slug, email: slug + '@x.fr', t, code: b64({ t, k: CLE }),
    ts: 1, formule: 'premium', quantite: 1, aboStatut: 'actif' });
  fs.writeFileSync(path.join(banc, 'data', 'espaces.json'), JSON.stringify({
    payeur: esp('payeur', 'ent-paye'), impaye: esp('impaye', 'ent-impaye'),
    vieux: esp('vieux', 'ent-vieux'), ferme: esp('ferme', 'ent-ferme') }));
  /* trois états dans le même fichier : suspendu d'hier (sursis vivant), suspendu il y a
     9 jours (sursis épuisé), et FERMÉ pour de bon (absent de `suspendus`). */
  fs.writeFileSync(path.join(banc, 'data', 'entreprises-fermees.json'), JSON.stringify({
    espaces: ['ent-impaye', 'ent-vieux', 'ent-ferme'],
    suspendus: ['ent-impaye', 'ent-vieux'],
    suspendusLe: { 'ent-impaye': Date.now() - 2 * 86400000, 'ent-vieux': Date.now() - 9 * 86400000 } }));

  const PORT = 8400 + (process.pid % 500);
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], {
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'),
      TEAMOP_DATA: path.join(banc, 'data'), PORT: String(PORT) }), stdio: 'ignore' });
  const B = 'http://127.0.0.1:' + PORT;
  let vivant = false;
  for (let i = 0; i < 150 && !vivant; i++) { await dormir(100); try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} }
  vrai('le serveur répond', vivant);

  if (vivant) {
    const etat = async (t) => (await (await fetch(B + '/api/espaces/etat', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t }) })).json().catch(() => ({})));
    const paye = await etat('ent-paye'), sus = await etat('ent-impaye'),
          vieux = await etat('ent-vieux'), ferme = await etat('ent-ferme');

    v('⛔⛔ une entreprise SUSPENDUE n’est PAS annoncée fermée', sus.ferme, undefined);
    v('   … et elle garde sa formule (sans quoi l’app ne sait rien de son forfait)', sus.formule, 'premium');
    v('   … elle est dite suspendue', sus.suspendu, true);
    v('   … et il lui reste 5 jours (suspendue il y a 2)', sus.sursisJours, 5);
    v('⛔ suspendue depuis 9 jours : le sursis est à ZÉRO, pas négatif', vieux.sursisJours, 0);
    v('   … et elle garde quand même sa formule et ses données', vieux.formule, 'premium');
    /* ⛔ LE CONTRE-CONTRÔLE QUI COMPTE : une vraie FERMETURE doit rester une fermeture. Sans
       lui, « ne plus jamais dire fermé » passerait au vert en rendant la fermeture décorative. */
    v('⛔⛔ une entreprise VRAIMENT FERMÉE est toujours annoncée fermée', ferme.ferme, true);
    v('   une entreprise qui PAYE n’est ni suspendue ni en sursis', [paye.suspendu, paye.sursisJours], [false, null]);
  }

  console.log('\n══ 3. ⛔ LES VRAIES FONCTIONS DE L’ÉCRAN, EXÉCUTÉES ══\n');
  {
    /* ⛔ ON EXÉCUTE, ON NE LIT PAS. Un droit se mesure à ce qu'il LAISSE PASSER. On extrait le
       bloc réel d'`app.html` et on le fait tourner dans un bac à sable minimal. */
    const bloc = (nom) => { const i = NU.indexOf('function ' + nom); if (i < 0) return '';
      let j = i + 1; for (;;) { const k = NU.indexOf('\nfunction ', j); if (k < 0) return NU.slice(i);
        j = k + 1; if (!/^function (suspension|forfait|planBloque)/.test(NU.slice(k + 1, k + 40))) return NU.slice(i, k); } };
    const src = ['suspensionCle', 'suspensionCharger', 'suspensionPoser', 'suspensionSursis',
                 'suspensionGrise', 'suspensionRappel', 'forfait', 'planBloque'].map(bloc).join('\n');
    vrai('⛔ les huit fonctions sont trouvées dans app.html (une tranche vide passe au vert sur tout)',
      src.length > 900, src.length + ' caractères');
    const PB = /const PLAN_BLOQUE=\{[\s\S]*?\n\};/.exec(NU);
    vrai('   et la liste des catégories payantes aussi', !!PB);
    /* ⛔ ET L'ÉTAT LUI-MÊME, EXTRAIT DU FICHIER. Le recopier ici ferait un banc qui garde une
       croyance : il resterait vert le jour où la forme change dans `app.html`. */
    const ETAT = /let _susp = \{[^}]*\};/.exec(NU);
    vrai('   et l’état `_susp` est extrait du fichier, pas recopié', !!ETAT, String(ETAT && ETAT[0]));

    const rangement = {};
    const bac = {
      STORE_KEY: 'elan_essai', BETA_ESSAI: false, db: { forfait: 'premium' },
      currentUser: { id: 'u1', role: 'admin' }, current: '', toasts: [],
      localStorage: { getItem: k => (k in rangement ? rangement[k] : null),
                      setItem: (k, x) => { rangement[k] = String(x); }, removeItem: k => { delete rangement[k]; } },
      toast: function (t) { bac.toasts.push(String(t)); },
      renderNav: () => {}, go: () => {}, todayISO: () => '2026-09-22',
    };
    const f = new Function('ctx', 'with(ctx){ ' + (PB ? PB[0] : '') + '\n' + (ETAT ? ETAT[0] : '') + '\n' + src +
      '\n return { poser:suspensionPoser, grise:suspensionGrise, sursis:suspensionSursis,' +
      ' forfait:forfait, bloque:planBloque, rappel:suspensionRappel, charger:suspensionCharger }; }');
    const A = f(bac);

    A.poser({ suspendu: false, sursisJours: null });
    v('une entreprise qui paye garde son forfait', [A.forfait(), A.grise(), A.bloque('produits')], ['premium', false, false]);
    A.poser({ suspendu: true, sursisJours: 5 });
    v('⛔ pendant le sursis, RIEN ne grise', [A.forfait(), A.grise(), A.bloque('produits')], ['premium', false, false]);
    A.poser({ suspendu: true, sursisJours: 0 });
    v('⛔⛔ sursis écoulé : le forfait EFFECTIF tombe au gratuit', A.forfait(), 'gratuit');
    v('   … donc les catégories payantes grisent', [A.bloque('produits'), A.bloque('boxes'), A.bloque('bons')], [true, true, true]);
    v('⛔⛔ … mais `db.forfait` n’a PAS été touché (le règlement doit tout rendre d’un coup)', bac.db.forfait, 'premium');
    A.poser({ suspendu: false, sursisJours: null });
    v('⛔ réglé : tout revient, sans rien recalculer', [A.forfait(), A.bloque('produits')], ['premium', false]);

    /* ⛔ UN SERVEUR PLUS ANCIEN NE DOIT RIEN GRISER. `sursisJours` absent ne veut pas dire
       « fini » : entre « trop » et « rien », on choisit trop. */
    A.poser({ suspendu: true });
    v('⛔ champ ABSENT (serveur ancien) : on ne grise pas', [A.sursis(), A.grise(), A.forfait()], [null, false, 'premium']);

    console.log('');
    /* ── le rappel : un par jour, et sur le compte admin SEULEMENT ── */
    bac.toasts = []; A.poser({ suspendu: true, sursisJours: 3 });
    A.rappel(); A.rappel(); A.rappel();
    v('⛔ trois appels le même jour ne donnent QU’UN rappel', bac.toasts.length, 1);
    vrai('   et il dit combien de jours il reste', /il reste 3 jours/.test(bac.toasts[0] || ''), bac.toasts[0]);
    bac.currentUser = { id: 'u2', role: 'tech' }; bac.toasts = [];
    A.rappel();
    v('⛔⛔ un TECHNICIEN n’apprend RIEN (« c’est pas aux utilisateurs de savoir »)', bac.toasts.length, 0);
    bac.currentUser = { id: 'u3', role: 'admin' }; bac.toasts = [];
    A.poser({ suspendu: true, sursisJours: 0 }); A.rappel();
    vrai('⛔ sursis écoulé : le rappel dit que rien n’est perdu',
      /rien n’est perdu|Rien n'est perdu/i.test(bac.toasts[0] || ''), bac.toasts[0]);

    /* ⛔ L'ÉTAT SE RELIT AU CHARGEMENT : un impayé hors ligne retrouverait sinon toutes ses
       catégories jusqu'au prochain aller-retour avec le serveur. */
    vrai('⛔ `load()` relit l’état de facturation avant le premier affichage',
      /function load\(\)\{ try\{ suspensionCharger\(\); \}catch\(e\)\{\}/.test(NU));
    const bac2 = Object.assign({}, bac, { toasts: [] });
    const A2 = f(bac2); A2.charger();
    v('   … et il retrouve bien le sursis écoulé', [A2.grise(), A2.forfait()], [true, 'gratuit']);

    /* ⛔ ET LA RÉPONSE DU SERVEUR DOIT L'ALIMENTER — sinon tout ce qui précède est du code
       que personne n'appelle, le jumeau d'`atts` dans /health. */
    vrai('⛔⛔ `forfaitServeurSync` appelle bien suspensionPoser et suspensionRappel',
      /suspensionPoser\(j\); suspensionRappel\(\);/.test(NU));
  }

  await arreter();
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(async (e) => {
  console.error('\n✗ le banc est tombé : ' + (e && e.stack || e));
  await arreter();
  console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗');
  process.exit(1);
});

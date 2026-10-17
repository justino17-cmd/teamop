/* ══ g15 · accueil#18 — LA PHRASE « ANCIEN COMPTE À CODE PIN ? » N'A PAS DE SENS SUR LA BÊTA ═════════════════
   L'écran de connexion écrivait, sous le champ Mot de passe : « Ancien compte à code PIN ? Tape ton PIN — on te
   fera créer ton mot de passe juste après. » Sur la bêta, rien de tel : pas de PIN, pas de création de mot de
   passe (les accès viennent de la Tour). La phrase décrit la migration de l'application PUBLIQUE, où des comptes
   à PIN existent : elle y RESTE. On la masque quand `BETA_ESSAI` est vrai — les deux sens sont joués.

   Ce banc EXÉCUTE la vraie `renderLogin` avec `BETA_ESSAI` à faux (production) puis à vrai (bêta) et lit le
   texte du formulaire produit.                                                                               */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
console.log('\n── 1286 · 0. la population ──');
const RL = bloc('function renderLogin(){');
vrai('renderLogin est trouvée', RL.length > 3000, RL.length);
vrai('⛔ une seule définition de renderLogin', SRC.split('function renderLogin(').length - 1 === 1);
vrai('la valeur de BETA_ESSAI dans app.html est FAUSSE (production) — c\'est beta-build qui la passe à vrai', /const BETA_ESSAI=false;/.test(SRC));

function jouer(beta) {
  const els = {}; const el = id => els[id] || (els[id] = { style: {}, innerHTML: '', textContent: '', remove() {}, focus() {} });
  const ctx = { console, JSON, Math, Date, String, setTimeout: () => 0, sessionStorage: { getItem: () => null }, _syncGotInitial: true,
    localStorage: { getItem: k => ({ elan_sync_team: 'equipe-x', elan_entreprise_nom: 'Entreprise X' }[k] || null) } };
  vm.createContext(ctx);
  vm.runInContext(`var BETA_ESSAI=${beta ? 'true' : 'false'}; var _compteRetire='';
    var $=function(id){ return __el(id); };
    function esc(s){ return String(s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
    function effectiveTheme(){ return 'light'; } function entrepriseNom(){ return ''; } function cnxAutoEnAttente(){ return ''; }
    function syncEnabled(){ return false; } function cnxAutoTenter(){}
    ${RL}`, ctx);
  ctx.__el = el;
  ctx.renderLogin();
  return els['login-box'].innerHTML;
}
const texte = h => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

console.log('\n── 1286 · 1. sur la BÊTA, la phrase du PIN disparaît — le reste de l\'écran est intact ──');
{ const h = jouer(true), t = texte(h);
  vrai('⛔ aucune mention du PIN ni de la création de mot de passe', !/PIN/.test(t) && !/cr[ée]er ton mot de passe/.test(t), t.slice(t.indexOf('Mot de passe'), t.indexOf('Mot de passe') + 160));
  vrai('le champ Mot de passe, lui, est toujours là', /id="li-pin"/.test(h) && /Mot de passe/.test(t));
  vrai('le bouton « Se connecter », « Rester connecté » et « Mot de passe oublié ? » sont là', /Se connecter/.test(t) && /Rester connecté/.test(t) && /Mot de passe oublié/.test(t)); }

console.log('\n── 1286 · 2. en PRODUCTION, la phrase RESTE (des comptes à PIN y existent encore) ──');
{ const h = jouer(false), t = texte(h);
  vrai('⛔ « Ancien compte à code PIN ? » est affichée', /Ancien compte à code PIN \?/.test(t) && /on te fera créer ton mot de passe/.test(t), t.slice(0, 200));
  vrai('le champ Mot de passe est toujours là', /id="li-pin"/.test(h)); }

console.log('\n══ test-1286 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
process.exit(ko ? 1 : 0);

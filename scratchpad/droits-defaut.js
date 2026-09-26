// Mesure : ce qu'un technicien / commercial / compta voit dans une entreprise NEUVE,
// avec les fonctions RÉELLES de beta.html (générée depuis app.html).
const fs = require('fs');
const SRC = fs.readFileSync(process.argv[2] || 'beta.html', 'utf8');
function bloc(debut) {                      // du motif jusqu'à l'accolade/crochet qui ferme
  const i = SRC.indexOf(debut); if (i < 0) throw new Error('introuvable : ' + debut);
  let j = SRC.indexOf(debut.endsWith('[') ? '[' : '{', i + debut.length - 1), n = 0, q = null;
  for (let k = j; k < SRC.length; k++) {
    const c = SRC[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === '/' && SRC[k + 1] === '/') { k = SRC.indexOf('\n', k); continue; }          // commentaire de ligne
    if (c === '/' && SRC[k + 1] === '*') { k = SRC.indexOf('*/', k) + 1; continue; }       // commentaire de bloc
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '{' || c === '[') n++; else if (c === '}' || c === ']') { n--; if (!n) return SRC.slice(i, k + 1); }
  }
  throw new Error('non fermé : ' + debut);
}
const code = [
  bloc('const NAV = ['), bloc('const SOUS_CATS=['),
  bloc('function defaultPerms(){'), bloc('function moduleHeriteRole(role,k){'),
  bloc('const CAPS_HERITE = {'), bloc('function reprendreDroitsImplicites(){'),
  bloc('function moduleReglage(u,k){'), bloc('function userSeesModule(u,k){'),
].join(';\n');
const ctx = `let db={}; const ASIDE={v:false}; function showAside(){return ASIDE.v}
  function planBloque(){return false} function metierBloque(){return false}
  function logEvent(){} function userCap(){return false} function t(x){return x}
  ${code}
  return {db:()=>db, setDb:x=>{db=x}, NAV, defaultPerms, moduleHeriteRole, reprendreDroitsImplicites, userSeesModule, ASIDE};`;
const M = new Function(ctx)();
const libelle = k => { const it = M.NAV.flatMap(s => s.items).find(x => x.k === k); return it ? it.l : k; };
const cles = [...new Set(M.NAV.flatMap(s => s.items).map(x => x.k))];
if (cles.length < 30) throw new Error('population trop petite : ' + cles.length + ' rubriques');
for (const aside of [false, true]) {
  M.ASIDE.v = aside;
  // entreprise neuve : migrate() pose defaultPerms(), puis la reprise unique complète
  const d = { permissions: M.defaultPerms() }; M.setDb(d); M.reprendreDroitsImplicites();
  console.log(`\n════ appareil qui a fait la reprise : « Modules OP » ${aside ? 'AFFICHÉS' : 'masqués (défaut)'}`);
  for (const role of ['technicien', 'commercial', 'compta']) {
    const u = { role };
    const aujourdhui = cles.filter(k => M.userSeesModule(u, k));
    const regle = cles.filter(k => M.moduleHeriteRole(role, k));
    const enPlus = aujourdhui.filter(k => !regle.includes(k)), enMoins = regle.filter(k => !aujourdhui.includes(k));
    const ancienne = M.defaultPerms()[role];
    const horsTable = aujourdhui.filter(k => !(k in ancienne));
    console.log(`\n— ${role} : voit ${aujourdhui.length} rubriques sur ${cles.length}`);
    console.log('  voit aujourd\'hui, que la règle générale cacherait :', enPlus.map(libelle).join(', ') || '—');
    console.log('  caché aujourd\'hui, que la règle générale ouvrirait :', enMoins.map(libelle).join(', ') || '—');
    console.log('  ouvert par la reprise (absent de l\'ancienne table) :', horsTable.map(libelle).join(', ') || '—');
  }
}

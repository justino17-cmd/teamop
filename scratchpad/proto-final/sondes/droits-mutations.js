// Contre-épreuve des DROITS (étape 5) : on REMET dans une COPIE de la page un défaut que les sondes gardent, et on exige que la sonde concernée TOMBE. Même règle que entreprise-mutations.js :
// chaque remplacement touche EXACTEMENT une occurrence (sinon rien n'est joué), la copie va dans /tmp (jamais le dépôt : rien à restaurer), la sonde lit la copie par RACINE.
// node scratchpad/proto-final/sondes/droits-mutations.js [filtre]      (DRY=1 : seulement vérifier que chaque mutation vise juste)
const fs = require('fs'), path = require('path'), cp = require('child_process');
const REPO = path.join(__dirname, '..', '..', '..'), PAGE = path.join(REPO, 'apercu', 'prototype-op-gestion.html');
const TMP = process.env.MUT_DIR || '/tmp/mutations-droits';
const SRC = fs.readFileSync(PAGE, 'utf8');
const M = [
  ['D1 · droitVoit rend toujours vrai (plus aucune adresse n\'est fermée)', "const droitVoit = (r, p) => droitRaison(r, p) === null;", "const droitVoit = (r, p) => true;", ['menus']],
  ['D2 · la forme n\'est plus lue (une personne du bureau ouvre « Mes heures »)', "const besoin = ROUTE_DROIT[r][droitForme(p)]; if (!besoin) return 'forme';", "const besoin = ROUTE_DROIT[r].equipe || ROUTE_DROIT[r].terrain; if (!besoin) return 'forme';", ['formes']],
  ['D3 · l\'ouverture ramène toujours à l\'Accueil', "ouvertureDe(eqDe(acteur()));   /* la première rubrique que la personne a le droit d'ouvrir */", "'accueil';   /* la première rubrique que la personne a le droit d'ouvrir */", ['menus']],
  ['D4 · la barre du bas ne filtre plus ce que la personne voit', "BARRE_ROLE[ROLE === 'tech' ? 'terrain' : 'equipe'].filter(k => ok.has(k)).slice(0, MB_MAX)", "BARRE_ROLE[ROLE === 'tech' ? 'terrain' : 'equipe'].slice(0, MB_MAX)", ['cases-voir']],
  ['D5 · la famille « action » (tous les gestes des fiches d\'intervention, de devis, de facture) sort de la table', "  action:{ m:'modifierOk@inter", "  actionx:{ m:'modifierOk@inter", ['table', 'gestes-reels']],
  ['D6 · la garde n\'écoute plus « change » (une case décochée au clavier passe)', "['click', 'change', 'input'].forEach(t => window.addEventListener(t, droitsGeste, true));", "['click', 'input'].forEach(t => window.addEventListener(t, droitsGeste, true));", ['restauration']],
  ['D7 · la garde n\'écoute plus « input » (la saisie d\'un champ passe)', "['click', 'change', 'input'].forEach(t => window.addEventListener(t, droitsGeste, true));", "['click', 'change'].forEach(t => window.addEventListener(t, droitsGeste, true));", ['restauration']],
  ['D8 · un verbe d\'écriture sort de la table (cx|payerliste n\'est plus nommé)', "m:'payer payerliste factureok depenseok ficheok sirenok plateformeok'", "m:'payer factureok depenseok ficheok sirenok plateformeok'", ['table']],
  ['D9 · une famille d\'écriture sort de la table (ac : accepter / refuser une demande d\'achat)', "  ac:{ k:'achats', m:'transfert commande magasin refuser payer virement ndfok refok virok ndfoksans ndfsans ndfnon', l:'allernotes ndfticket piece onglet' },\n", "", ['table']],
  ['D10 · la garde est en « if (true) return » (la première instruction ne garde rien)', "    if (!ev.target || !ev.target.closest || window.DROITS_GARDE === false) return;", "    if (true) return;", ['gestes-reels', 'gestes-garde']],
  ['D11 · une personne règle de nouveau ses propres droits', "const soi = p.k === acteur(), fige = admin || soi, att = fige ? 'disabled' : '';", "const soi = false, fige = admin || soi, att = fige ? 'disabled' : '';", ['soi-meme']],
  ['D12 · on peut donner un droit qu\'on n\'a pas (droitsBorner retiré)', "if (moi && !droitAdmin(moi) && cat && x && x !== 'v' && !peut(cat, x, moi)) return 'Tu ne peux pas donner un droit que tu n’as pas toi-même.';", "", ['soi-meme']],
  ['D13 · acteur() rend toujours « marc » (le journal ment, tout le monde est le gérant)', "function acteur(){ try { return (typeof SESSION !== 'undefined' && SESSION) || (RL_ACTIF && ROLES[ROLE] && ROLES[ROLE].qui) || 'marc'; } catch (e) { return 'marc'; } }", "function acteur(){ return 'marc'; }", ['acteur']],
  ['D14 · journalAjout n\'est plus normalisé (les 90 appels écrivent Marc)', "function journalAjout(qui, type, action, el, extra){ if (qui === 'marc') qui = acteur();", "function journalAjout(qui, type, action, el, extra){", ['acteur']],
  ['D15 · peut() ignore les cases (tout le monde peut tout)', "  const d = p.droits.cats[cat]; return !!(d && d.v && d[x]); }\n/* ce que la personne peut FAIRE", "  return true; }\n/* ce que la personne peut FAIRE", ['gestes-reels']],
  ['D16 · un droit à part est toujours donné (droitSp rend vrai)', "const droitSp = (p, k) => !!p && (droitAdmin(p) || !!(p.droits && p.droits.sp && p.droits.sp[k]));", "const droitSp = (p, k) => true;", ['specifiques']],
  ['D17 · la sortie d\'un technicien s\'applique sans attendre (le droit « atelier » n\'est plus lu)', "  if (STK_VALID && !(SX.autoUsage && sxAuto(m)) && !droitsAtelier(m.qui || sxQui())) {", "  if (false) {", ['specifiques']],
  ['D18 · l\'écran en lecture seule ne le dit plus', "  if (manque.length === actifs.length) {\n    const h = c.querySelector('.tete, .tete-tel');", "  if (false) {\n    const h = c.querySelector('.tete, .tete-tel');", ['lecture-seule']],
  ['D19 · « Voir toute l\'équipe » réapparaît dans la fiche', "const DR_SP = DR_SP_TOUS.filter(([k]) => DR_SP_BRANCHES.includes(k));", "const DR_SP = DR_SP_TOUS;", ['fiche']],
  ['D20 · « Travaille sur le terrain » est de nouveau lu dans une liste en dur (décocher Sophie ne change rien)', "const eqxTerrain = p => !!p.terrain;", "const eqxTerrain = p => EQX_BASE.includes(p.k) || !!p.terrain;", ['formes']],
  ['D21 · la feuille de style cache aussi la lecture (data-go)', "    if (E.d && E.d !== 'l' && E.k && !peut(E.k, E.d, p)) R.push(`[data-${fam}]`); });", "    if (E.d && E.d !== 'l' && E.k && !peut(E.k, E.d, p)) R.push(`[data-${fam}]`); R.push('[data-go]'); });", ['fabrication-css']],
  ['D22 · un champ de saisie se CACHE (au lieu de se figer) : sa valeur n\'est plus lisible', "R.map(b => 'input' + b + ',textarea' + b + ',select' + b).join(',') + '{pointer-events:none;opacity:.7}'", "R.map(b => 'input' + b + ',textarea' + b + ',select' + b).join(',') + '{display:none!important}'", ['restauration']],
  ['D23 · un terrain peut décider des achats des autres (TERRAIN_BUREAU n\'est plus lu)', "  const B = TERRAIN_BUREAU[fam];", "  const B = null;", ['terrain']],
  ['D24 · tout geste « ventes » devient celui du terrain (facturer, envoyer un devis)', "return g.cat === 'ventes' && TERRAIN_VENTES.has(fam + '|' + verbe) ? { ...g, cat:'inter', x:'m' } : g;", "return g.cat === 'ventes' ? { ...g, cat:'inter', x:'m' } : g;", ['terrain']],
  ['D25 · la Comptabilité dans son cadre ne reçoit plus les droits (elle n\'avale rien)', "window.CMPT_DROITS = d.opc_role.droits && typeof d.opc_role.droits === 'object' ? d.opc_role.droits : null;", "window.CMPT_DROITS = null;", ['compta'], 'apercu/prototype-comptabilite.html'],
];
const filtre = process.argv[2] || '';
fs.mkdirSync(TMP, { recursive: true });
function racine(nom, page, cible) { cible = cible || 'prototype-op-gestion.html';
  const R = path.join(TMP, nom), A = path.join(R, 'apercu'); fs.rmSync(R, { recursive: true, force: true }); fs.mkdirSync(A, { recursive: true });
  for (const f of fs.readdirSync(path.join(REPO, 'apercu'))) if (f !== cible) fs.symlinkSync(path.join(REPO, 'apercu', f), path.join(A, f));
  fs.writeFileSync(path.join(A, cible), page); return R; }
let tombes = 0, vivantes = [], jouees = 0;
for (const [nom, ancien, neuf, sondes, autre] of M) {
  const cible = autre ? path.basename(autre) : 'prototype-op-gestion.html', SRCX = autre ? fs.readFileSync(path.join(REPO, autre), 'utf8') : SRC;   /* une mutation peut viser un cadre voisin (la Comptabilité) */
  if (filtre && !nom.includes(filtre)) continue;
  const c = SRCX.split(ancien).length - 1;
  if (c !== 1) { console.log(`✗ « ${nom} » : ${c} occurrence(s) du texte visé, 1 attendue — la mutation est mal visée, rien n'est joué`); process.exit(2); }
  if (process.env.DRY) { console.log('✓ visée juste :', nom); continue; }
  const page = SRCX.replace(ancien, () => neuf), R = racine('m', page, cible);
  if (page === SRCX) { console.log('✗ la copie est identique à la page : ' + nom); process.exit(2); }
  let tombe = false, detail = '';
  for (const s of sondes) { const r = cp.spawnSync('node', [path.join(__dirname, 'droits-' + s + '.js')], { env: { ...process.env, RACINE: R }, encoding: 'utf8', timeout: 560000 });
    const bil = ((r.stdout || '').match(/== (\d+) ✓ · (\d+) ✗/) || [])[0] || '(pas de bilan : ' + String(r.stderr || '').split('\n').find(l => /Error/.test(l)) + ')';
    detail += ` ${s}: ${bil} sortie ${r.status}`; if (r.status !== 0) { tombe = true; break; } }
  jouees++; if (tombe) tombes++; else vivantes.push(nom);
  console.log(`${tombe ? '✓ tombe' : '✗ VIVANTE'} · ${nom} ·${detail}`);
}
fs.rmSync(TMP, { recursive: true, force: true });
if (!process.env.DRY) { console.log(`\n== ${tombes} mutation(s) sur ${jouees} font tomber une sonde`); if (vivantes.length) { console.log('VIVANTES (la sonde ne regarde pas au bon endroit) :'); vivantes.forEach(n => console.log('  ✗ ' + n)); process.exit(1); } }

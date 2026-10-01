/* ══ LES MUTATIONS D'OP MESSAGES — la liste, et le moyen de les jouer sur une COPIE ══════════════════════════════════════════
   « Un banc qui passe ne prouve rien tant qu'on ne l'a pas vu ÉCHOUER » (CLAUDE.md). Ce fichier porte la liste des défauts qu'on REMET exprès, un par
   un, dans une copie de l'aperçu — jamais dans l'arbre — et dit où chacun doit tomber :
     · `banc: true`  → tests/test-857.js (et test-856) le voient, par le texte, le module de données exécuté ou les jetons : il les rejoue lui-même, en
                       mémoire, à chaque exécution ;
     · `sonde: true` → seul un navigateur le voit (un retour système, un défilement, un micro relâché) : tests/sonde-opmessages.js, jouée par le
                       lanceur ci-dessous sur une COPIE du dossier (OPMSG_RACINE).
   Une mutation dont le motif ne trouve rien est MAL VISÉE : le banc le dit au lieu de conclure (CLAUDE.md : « une mutation qui ne mord pas peut être une
   mutation mal visée » — `s.replace(motif, autre, 1)` frappe la PREMIÈRE occurrence du fichier, pas celle qu'on croit : on vérifie le changement).

   Lancer le lanceur :  node tests/mutations-opmessages.js            (toutes les mutations `sonde`, sur une copie — long)
                        node tests/mutations-opmessages.js M05 M12     (seulement celles-là)
   ⛔ Il ne touche JAMAIS l'arbre : une copie dans le dossier temporaire, une exécution par mutation, un délai par exécution. */
const fs = require('fs'), path = require('path'), os = require('os'), { spawnSync } = require('child_process');

const sub = (a, b) => s => s.replace(a, b);
/* chaque mutation : un identifiant, un nom, le fichier visé (page | src), la transformation, où elle doit tomber, et un motif du constat qui l'attrape */
const MUTATIONS = [
  { id: 'M01', nom: 'échappement retiré : le texte d\'une bulle s\'écrit sans esc()', cible: 'page', f: sub('esc(m.texte)', 'm.texte'), banc: /sans esc|échapp|texte d'une bulle/i, sonde: true },
  { id: 'M02', nom: 'esc() devient l\'identité', cible: 'page', f: s => s.replace(/const esc = s => String\(s\)\.replace\(\/\[&<>"'\]\/g, [^\n]+/, 'const esc = s => String(s);'), banc: /esc\(\) exécuté/i },
  { id: 'M03', nom: 'esc() oublie l\'apostrophe (« \' » sort d\'un attribut)', cible: 'page', f: sub(`, "'": '&#39;'`, ''), banc: /esc\(\) exécuté/i },
  { id: 'M04', nom: 'marquerLu retiré : ouvrir une conversation ne la marque plus lue', cible: 'page', f: sub('try { await source.marquerLu(id); }', 'try { /* retiré */ }'), banc: /marquerLu/i, sonde: true },
  { id: 'M05', nom: 'entrée d\'historique retirée : ouvrir une conversation ne pousse plus rien (pushState → replaceState)', cible: 'page', f: sub('history.pushState({ opmsg: 1, n: h ? h.n + 1 : 1', 'history.replaceState({ opmsg: 1, n: h ? h.n + 1 : 1'), banc: /pushState|entrée d'historique/i, sonde: true },
  { id: 'M06', nom: 'un écran écrit l\'état directement (la liste est modifiée sans passer par la source)', cible: 'page', f: sub('    etat.neuves.add(c.id);', '    etat.neuves.add(c.id); etat.conversations.unshift(c);'), banc: /n'écrit l'état|ne passe que par la source|accès direct/i },
  { id: 'M07', nom: 'source : ouvrir() rend les messages eux-mêmes, plus une copie', cible: 'src', f: sub('messages: c.messages.map(copieMessage)', 'messages: c.messages'), banc: /copie/i },
  { id: 'M08', nom: 'source : le résumé partage son tableau de membres avec le magasin', cible: 'src', f: sub('membres: c.membres.slice(), admins', 'membres: c.membres, admins'), banc: /copie/i },
  { id: 'M09', nom: 'source : un groupe d\'annonces laisse écrire un non-admin', cible: 'src', f: sub("if (c.annoncesSeulement && !c.admins.includes('moi')) return Promise.reject(erreur('interdit'));", ''), banc: /interdit/i },
  { id: 'M10', nom: 'source : le texte n\'est plus nettoyé (espaces, CRLF)', cible: 'src', f: sub("const texte = brouillon.texte.replace(/\\r\\n?/g, '\\n').trim();", 'const texte = brouillon.texte;'), banc: /nettoy|trim|CRLF/i },
  { id: 'M11', nom: 'source : plus de limite de longueur', cible: 'src', f: sub("if (texte.length > LIMITE_TEXTE) return Promise.reject(erreur('trop-long'));", ''), banc: /trop-long/i },
  { id: 'M12', nom: 'source : marquerLu ne prévient plus les écouteurs', cible: 'src', f: sub("if (c && c.nonLus) { c.nonLus = 0; emettre({ type: 'liste' }); emettre({ type: 'conversation', id: c.id }); }", 'if (c && c.nonLus) { c.nonLus = 0; }'), banc: /marquerLu.*écout|événement/i },
  { id: 'M13', nom: 'source : on ne peut plus se désabonner', cible: 'src', f: sub('return () => { const i = ecouteurs.indexOf(cb); if (i >= 0) ecouteurs.splice(i, 1); };', 'return () => {};'), banc: /désabonn/i },
  { id: 'M14', nom: 'source : un groupe sans nom ne s\'appelle plus « Nouveau groupe »', cible: 'src', f: sub("|| 'Nouveau groupe';", "|| '';"), banc: /Nouveau groupe/i },
  { id: 'M15', nom: 'Échap ne ferme plus rien', cible: 'page', f: sub("if (e.key !== 'Escape') return;", "if (e.key !== 'Escapé') return;"), banc: /Échap/i },
  { id: 'M16', nom: 'la liste recouverte reste active (plus d\'inert)', cible: 'page', f: sub("$('contenu').inert = !!(etat.conv && !largeBureau.matches);", "$('contenu').inert = false;"), banc: /inert/i, sonde: true },
  { id: 'M17', nom: 'le champ de saisie passe à 15 px (iOS zoomerait)', cible: 'page', f: sub('font-size: 17px; line-height: 22px; letter-spacing: -.02em; color: var(--text); caret-color', 'font-size: 15px; line-height: 22px; letter-spacing: -.02em; color: var(--text); caret-color'), banc: /champ de saisie.*16/i },
  { id: 'M18', nom: 'les bulles passent à 90 % de la colonne (la maquette dit 78 %)', cible: 'page', f: sub('max-width: 78%; padding: 8px 13px;', 'max-width: 90%; padding: 8px 13px;'), banc: /78 ?%/ },
  { id: 'M19', nom: 'la bulle reçue perd son coin à 6 px', cible: 'page', f: sub('border-radius: 20px 20px 20px 6px; }\n.envoyee', 'border-radius: 20px; }\n.envoyee'), banc: /bulles : reçue/i },
  { id: 'M20', nom: 'la politique du navigateur n\'autorise plus les sons blob: (le vocal ne se réécoute plus)', cible: 'page', f: sub(' media-src blob:;', ''), banc: /NAVIGATEUR refuse|media-src/i, sonde: true },
  { id: 'M21', nom: 'la bulle perd pre-wrap (le retour à la ligne s\'écrase)', cible: 'page', f: sub('overflow-wrap: anywhere; white-space: pre-wrap; user-select: text;', 'overflow-wrap: anywhere; user-select: text;'), banc: /pre-wrap/i, sonde: true },
  { id: 'M22', nom: 'un écouteur de balayage (touchmove) est ajouté : deux navigations pour un geste', cible: 'page', f: sub("document.addEventListener('touchstart', function () {}, { passive: true });", "document.addEventListener('touchstart', function () {}, { passive: true });\n  document.addEventListener('touchmove', function () { history.back(); }, { passive: true });"), banc: /UN GESTE, UNE NAVIGATION|balayage|touchmove/i },
  { id: 'M23', nom: 'le petit mot est recentré par left:50% + translate(-50%) (la forme interdite)', cible: 'page', f: sub('position: fixed; z-index: 49; left: 16px; right: 16px; margin: 0 auto; width: max-content;', 'position: fixed; z-index: 49; left: 50%; transform: translate(-50%, 0); margin: 0 auto; width: auto;'), banc: /left:50%|centré/i },
  { id: 'M24', nom: 'la bulle envoyée reprend un blanc en dur au lieu de --on-fill', cible: 'page', f: sub('.envoyee { background: var(--fill); color: var(--on-fill);', '.envoyee { background: var(--fill); color: #fff;'), banc: /--on-fill|une surface, une encre/i },
  { id: 'M25', nom: 'la liste ne consomme plus le drapeau « neuve » (la ligne rejoue son entrée à chaque frappe)', cible: 'page', f: sub('const neuves = new Set(etat.neuves); etat.neuves.clear();', 'const neuves = new Set(etat.neuves);'), banc: /neuve|consomm/i, sonde: true },
  /* ── ce que SEUL un navigateur voit ── */
  { id: 'S01', nom: 'la conversation ne défile plus en bas', cible: 'page', f: sub('    if (colle) defilerBas();\n  }', '    /* retiré */\n  }'), sonde: true },
  { id: 'S02', nom: 'fermer une couche ne rend plus l\'entrée d\'historique (remplace toujours)', cible: 'page', f: sub('if (h && h.n > 0 && h.p && memeRoute(h.p, parent)) history.back(); else remplacer(parent);', 'remplacer(parent);'), sonde: true },
  { id: 'S03', nom: 'le retour système n\'est plus écouté (popstate)', cible: 'page', f: sub("window.addEventListener('popstate', e => appliquer(", "window.addEventListener('popstateX', e => appliquer("), sonde: true },
  { id: 'S04', nom: 'la liste ne revient plus à sa position de défilement', cible: 'page', f: sub('      window.scrollTo(0, etat.scrollListe);\n', ''), sonde: true, scenario: 'defilement' },
  { id: 'S05', nom: 'le micro n\'est plus relâché (les pistes restent vivantes)', cible: 'page', f: sub('if (enr.flux) enr.flux.getTracks().forEach(t => t.stop());', ''), sonde: true },
  { id: 'S06', nom: 'une photo n\'est plus réduite (le canvas garde la taille d\'origine)', cible: 'page', f: sub('const k = Math.min(1, cote / Math.max(w0, h0)),', 'const k = 1,'), sonde: true },
  { id: 'S07', nom: 'Entrée n\'envoie plus au bureau', cible: 'page', f: sub("if ((matchMedia('(pointer: fine)').matches && !e.shiftKey && !e.altKey) || e.ctrlKey || e.metaKey) { e.preventDefault(); envoyerTexte(); }", "if (e.ctrlKey || e.metaKey) { e.preventDefault(); envoyerTexte(); }"), sonde: true, profil: 'bureau 1440' },
  { id: 'S08', nom: 'le badge du retour est écrit en dur (« 12 »)', cible: 'page', f: sub("b.hidden = n === 0; b.textContent = n;", "b.hidden = false; b.textContent = 12;"), sonde: true },
  { id: 'S09', nom: 'les boutons de la saisie rétrécissent sous le doigt (36 px au lieu de 44)', cible: 'page', f: sub('  .compo-bouton { width: 44px; height: 44px; }', '  .compo-bouton { width: 36px; height: 36px; }'), sonde: true },
  { id: 'S10', nom: 'la photo du groupe n\'est plus réduite à 512 px', cible: 'page', f: sub('r = await reduireImage(f, 512, .85);', 'r = await reduireImage(f, 5000, .85);'), sonde: true },
  { id: 'S11', nom: 'un vocal de 0 s est envoyé (plus de durée minimale)', cible: 'page', f: sub('const VOCAL_MIN_MS = 800,', 'const VOCAL_MIN_MS = 0,'), sonde: true },
  { id: 'S12', nom: 'la feuille « Nouveau groupe » est de nouveau plafonnée à 720 px', cible: 'page', f: sub('max-height: min(calc(100vh - 48px), 900px); max-height: min(calc(100dvh - 48px), 900px);', 'max-height: min(86vh, 720px);'), sonde: true, profil: 'bureau 1440' },
  { id: 'S13', nom: 'le contour des cases décochées retombe à son ancienne valeur (1,4:1)', cible: 'page', f: sub('--rond-bord: rgba(60,60,67,.6);', '--rond-bord: rgba(120,120,128,.4);'), sonde: true },
  { id: 'S14', nom: 'la légende de 11 px reprend le « secondaire » du document (4,1:1 sur le coin du décor)', cible: 'page', f: sub('--sub-meta: rgba(14,26,63,.72);', '--sub-meta: rgba(14,26,63,.5);'), sonde: true },
  { id: 'S15', nom: 'le champ de saisie ne grandit plus avec le texte', cible: 'page', f: sub("    ta.style.height = 'auto';\n    ta.style.height = Math.min(ta.scrollHeight, parseFloat(getComputedStyle(ta).maxHeight) || 124) + 'px';", ''), sonde: true },
  { id: 'S16', nom: 'la conversation ouverte directement par un lien ne retombe plus sur la liste si elle est inconnue', cible: 'page', f: sub("if (!c) { remplacer({ vue: 'messages', conv: null, feuille: false, photo: null }); mot('Cette conversation n\\'existe plus.'); return; }", "if (!c) { return; }"), sonde: true, scenario: 'liens' }
];

function appliquer(m, PAGE, SRC) {
  const p2 = m.cible === 'page' ? m.f(PAGE) : PAGE, c2 = m.cible === 'src' ? m.f(SRC) : SRC;
  return { PAGE: p2, SRC: c2, change: m.cible === 'page' ? p2 !== PAGE : c2 !== SRC };
}

/* ── le lanceur : une copie du dossier, la mutation posée, les bancs puis la sonde (si la mutation en demande une), un délai par exécution ── */
function copier(racine) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'opmsg-mut-'));
  for (const d of ['apercu/opmessages', 'design/opmessages', 'icons']) {
    const src = path.join(racine, d), dst = path.join(tmp, d);
    fs.mkdirSync(dst, { recursive: true });
    for (const f of fs.readdirSync(src)) if (fs.statSync(path.join(src, f)).isFile() && (d !== 'icons' || /^opmsg-/.test(f))) fs.copyFileSync(path.join(src, f), path.join(dst, f));
  }
  return tmp;
}
function jouer(script, args, env, delai) {
  const r = spawnSync('node', [path.join(__dirname, script)].concat(args || []), { env: Object.assign({}, process.env, env), encoding: 'utf8', timeout: delai || 600000, maxBuffer: 64 * 1024 * 1024 });
  const sortie = (r.stdout || '') + (r.stderr || '');
  const m = [...sortie.matchAll(/(\d+) ✓ +(\d+) ✗/g)].pop();
  return { code: r.status, ok: m ? +m[1] : 0, ko: m ? +m[2] : -1, sortie };
}
if (require.main === module) {
  const RACINE = path.join(__dirname, '..');
  const demandees = process.argv.slice(2);
  const PAGE = fs.readFileSync(path.join(RACINE, 'apercu/opmessages/index.html'), 'utf8'), SRC = fs.readFileSync(path.join(RACINE, 'apercu/opmessages/source.js'), 'utf8');
  const lignes = [];
  for (const m of MUTATIONS) {
    if (demandees.length && !demandees.includes(m.id)) continue;
    if (!demandees.length && !m.sonde) continue;
    const tmp = copier(RACINE);
    const mut = appliquer(m, PAGE, SRC);
    if (!mut.change) { console.log(m.id + ' — MAL VISÉE : le motif ne trouve rien'); lignes.push([m.id, 'MAL VISÉE']); continue; }
    fs.writeFileSync(path.join(tmp, 'apercu/opmessages/index.html'), mut.PAGE); fs.writeFileSync(path.join(tmp, 'apercu/opmessages/source.js'), mut.SRC);
    const env = { OPMSG_RACINE: tmp };
    const b857 = jouer('test-857.js', [], env, 120000), b856 = jouer('test-856.js', [], env, 120000);
    const args = ['--rapide'];
    if (m.scenario) args.splice(0, 1, '--seul=' + m.scenario);
    else if (m.profil) args.splice(0, 1, '--profil=' + m.profil, '--jour');
    const s = jouer('sonde-opmessages.js', args, env, 480000);
    const ligne = [m.id, 'bancs ' + (b857.ko + b856.ko > 0 ? 'TOMBENT (' + b857.ko + '+' + b856.ko + ' ✗)' : 'verts'), 'sonde ' + (s.ko > 0 ? 'TOMBE (' + s.ko + ' ✗)' : s.code === 0 ? 'verte' : 'MORTE (code ' + s.code + ')')];
    console.log(ligne.join(' · ') + '   — ' + m.nom);
    const rouges = (s.sortie.match(/^ {2}✗ .*$/gm) || []).slice(0, 3).map(x => '      ' + x.slice(0, 200));
    if (rouges.length) console.log(rouges.join('\n'));
    lignes.push(ligne);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log('\n' + lignes.map(l => l.join(' · ')).join('\n'));
}
module.exports = { MUTATIONS, appliquer };

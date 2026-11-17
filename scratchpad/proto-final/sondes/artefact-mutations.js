// MUTATIONS des corrections « artefact » (17 novembre 2026) : sur des COPIES (jamais dans le dépôt), on remet un défaut à la fois puis on lance la sonde qui
// doit le voir (RACINE=<copie>). « mord » = la sonde rend au moins un ✗ (code 1) ou meurt (code 2) ; « survit » = elle reste verte : elle ne regarde pas là,
// ou une autre garde couvre. Avant chaque mutation : l'ancien texte est UNIQUE dans le fichier (une mutation qui frappe ailleurs ne prouve rien) et le fichier a bien
// changé. Usage : node artefact-mutations.js [filtre-sur-le-nom]. Journal : $CAP/artefact-mutations.log. Sort en 1 si une mutation survit.
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const DEPOT = path.resolve(__dirname, '..', '..', '..'), CAP = process.env.CAP || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap';
const COPIE = path.join(CAP, 'mut-artefact', 'racine'); fs.mkdirSync(path.join(COPIE, 'apercu'), { recursive: true });
const F = { P: 'prototype-op-gestion.html', C: 'prototype-comptabilite.html', D: 'prototype-documents.html', M: 'prototype-courrier.js' };
const ORIGINE = {}; for (const [k, f] of Object.entries(F)) ORIGINE[k] = fs.readFileSync(path.join(DEPOT, 'apercu', f), 'utf8');
for (const f of ['prototype-paiement.html']) fs.copyFileSync(path.join(DEPOT, 'apercu', f), path.join(COPIE, 'apercu', f));
const T = 'artefact-telechargements.js', K = 'artefact-cadres.js', M_ = 'artefact-courrier.js', R = 'artefact-rangement.js', B = 'artefact-bac-preuve.js';
const MUT = [
  ['M1 le pont « downloads » n\'est plus demandé par la page principale', 'P', "p = cl && typeof cl.use === 'function' ? await cl.use('downloads') : null;", "p = null;", T],
  ['M2 un refus du visiteur s\'annonce comme un enregistrement', 'P', "if (c === 'declined') { toast('Rien n’a été enregistré : tu as refusé le téléchargement. Tu peux recommencer.'); return 'refuse'; }", "if (c === 'declined') { toast('Fichier enregistré : ' + esc(nom)); return 'enregistre'; }", T],
  ['M3 sans pont, la page annonce « enregistré » alors que le lien peut être bloqué', 'P', "toast('« ' + esc(nom) + ' » : téléchargement demandé. S’il ne démarre pas, ton navigateur le bloque ici.'); return 'lien';", "toast('Fichier enregistré : ' + esc(nom)); return 'lien';", T],
  ['M4 le coût des véhicules repasse par un lien fabriqué à la main', 'P', "  telechargerFichier('cout-des-vehicules.csv', csv, {", "  { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv])); a.download = 'cout-des-vehicules.csv'; document.body.appendChild(a); a.click(); a.remove(); }\n  void ('' + (() => 0)).concat; Promise.resolve('x').then(() => 0); telechargerFichier('cout-des-vehicules.csv', '', {", T],
  ['M5 un lien tel:/mailto:/sms: ne montre plus le numéro ni l\'adresse', 'P', "if (!a.hasAttribute('data-kappel') && v) sortieCarte(", "if (false) sortieCarte(", T],
  ['M6 une copie refusée n\'affiche plus le texte à copier à la main', 'P', "  sortieCarte(o.titre || 'Copie ce texte à la main',", "  (() => 0)(o.titre || 'Copie ce texte à la main',", T],
  ['M7 le texte de la carte n\'est plus sélectionné d\'avance', 'P', "try { const r = document.createRange(); r.selectNodeContents(z.querySelector('.sc-v')); const g = getSelection(); g.removeAllRanges(); g.addRange(r); } catch (e) {}", "", T],
  ['M8 un fichier choisi (blob:) n\'est plus montré dans la page : le lien part dans le vide', 'P', "document.addEventListener('click', ev => { const a = ev.target.closest && ev.target.closest('a[href^=\"blob:\"]:not([download])'); if (!a) return; ev.preventDefault(); voirFichierLocal(a.getAttribute('href')); });", "", T],
  ['M9 le bulletin de paie rouvre window.open (rien dans l\'artefact)', 'P', "if (b && b.url) return voirFichierLocal(b.url, b.nom);", "if (b && b.url) return window.open(b.url, '_blank', 'noopener');", B],
  ['M10 le module de courrier ne demande plus à son hôte', 'M', "if(HOTE&&typeof HOTE.telecharger===\"function\"){ var r;", "if(false){ var r;", M_],
  ['M11 l\'hôte du module n\'a plus de « telecharger »', 'P', "  telecharger:(nom, blob) => telechargerFichier(nom, blob),", "", M_],
  ['M12 la comptabilité ne passe plus par le pont du parent', 'C', "const cl = window.claude || (window.parent !== window ? window.parent.claude : null);", "const cl = window.claude;", K],
  ['M13 l\'atelier ne passe plus par le pont du parent', 'D', "window.parent!==window&&window.parent.claude&&typeof window.parent.claude.use==='function'", "false", K],
  ['M14 le rangement n\'est plus protégé à la lecture de l\'espace', 'P', "try { ESPACE = localStorage.getItem(ESPACE_CLE) === ESPACE_SLUG ? ESPACE_SLUG : null; } catch (e) {}", "ESPACE = localStorage.getItem(ESPACE_CLE) === ESPACE_SLUG ? ESPACE_SLUG : null;", R],
  ['M15 le thème ne se range plus à l\'abri d\'un rangement qui jette', 'P', "mode = b.dataset.modetheme; try { localStorage.setItem(MODE_CLE, mode); } catch (e) { /* rangement plein ou refusé : le choix vaut pour cette ouverture */ }", "mode = b.dataset.modetheme; localStorage.setItem(MODE_CLE, mode);", R],
  ['M16 l\'indexedDB du module n\'est plus gardé à l\'accès', 'M', "var idbOk=false; try{ idbOk=!!window.indexedDB; }catch(e){}", "var idbOk=!!window.indexedDB;", R],
];
const filtre = process.argv[2] || '', sortie = [], t00 = Date.now();
const log = s => { console.log(s); try { fs.appendFileSync(path.join(CAP, 'artefact-mutations.log'), s + '\n'); } catch (e) {} };
let survivantes = 0, jouees = 0;
for (const [nom, f, ancien, neuf, sonde] of MUT) {
  if (filtre && !nom.includes(filtre)) continue;
  for (const k of Object.keys(F)) fs.writeFileSync(path.join(COPIE, 'apercu', F[k]), ORIGINE[k]);
  const src = ORIGINE[f], n = src.split(ancien).length - 1;
  if (n !== 1) { log(`? ${nom} : l'ancien texte est trouvé ${n} fois — mutation non jouée`); survivantes++; continue; }
  const mut = src.replace(ancien, () => neuf); if (mut === src) { log(`? ${nom} : le fichier n'a pas changé`); survivantes++; continue; }
  fs.writeFileSync(path.join(COPIE, 'apercu', F[f]), mut);
  const t0 = Date.now(), r = spawnSync('node', [path.join(__dirname, sonde)], { env: { ...process.env, RACINE: COPIE }, encoding: 'utf8', timeout: 590000 });
  const sortieTxt = (r.stdout || '') + (r.stderr || ''), bilan = (sortieTxt.match(/[0-9]+ ✓ +· +[0-9]+ ✗/g) || []).pop() || '?', mord = r.status !== 0; jouees++;
  if (!mord) survivantes++;
  log(`${mord ? 'MORD   ' : 'SURVIT '} ${nom} — ${sonde} (code ${r.status}, ${bilan}, ${Math.round((Date.now() - t0) / 1000)} s)` + (mord ? ' · ' + ((sortieTxt.split('\n').find(l => /^ ✗/.test(l)) || '').slice(0, 130)) : ''));
}
for (const k of Object.keys(F)) fs.writeFileSync(path.join(COPIE, 'apercu', F[k]), ORIGINE[k]);
log(`== ${jouees} mutations jouées, ${survivantes} survivante(s) en ${Math.round((Date.now() - t00) / 1000)} s`);
process.exit(survivantes ? 1 : 0);

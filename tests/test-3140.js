/* ⛔ CE QUE CE FICHIER GARDE — LES SKILLS VENUS D'AILLEURS ET LEUR SCANNER (28 octobre 2026, Trail of Bits + marketingskills + `scripts/scanner-skills.sh`).

   Justin : « tu installes tous les skills […] vu que tu vas corriger et améliorer les agents ». Une pièce de plus dans `.claude/skills/` est du texte qui dirige un
   agent, chargé à CHAQUE session d'un dépôt en production. Ce banc garde ce qui, sinon, ne tient que par une phrase de `CLAUDE.md` :
     1. tout skill a un front matter lisible, un `name` égal au nom de son dossier et une description (sinon il ne se charge pas, sans erreur) ;
     2. ⛔ aucun skill ni agent n'impose Opus : « tout en Sonnet » (30 septembre 2026) — la phase de vérification d'`insecure-defaults` d'origine l'imposait ;
     3. chaque source tierce a sa licence ET sa note de provenance, et une note ne dit « scanné » que si le scan a eu lieu (ou avoue qu'il n'a pas tourné) ;
     4. le droit français est dans les skills de prospection : le fichier qui le porte cite les textes et marque ses doutes, les six skills le lisent ;
     5. les liens relatifs (`references/…`, `../…`) des skills neufs mènent quelque part ;
     6. aucune adresse de courriel réelle ni numéro de téléphone dans les skills neufs ;
     7. ⛔ `scripts/scanner-skills.sh` — LE VRAI SCRIPT, lancé : sans SkillSpector il sort en 3 « AUCUN VERDICT » ; il passe TOUJOURS `--no-llm` (vu par un faux
        `skillspector` qui note ses arguments) et refuse `--llm` ; il propage les codes 0/1/2 ; il refuse d'écrire un rapport DANS le dépôt ; il n'installe rien
        (aucun `pip`, `uv`, `npm`, `docker`, `curl` exécuté — le PATH du banc n'en contient aucun faux).
   Mutations jouées APRÈS le commit (9, `scratchpad/mut3140.py`) : plus de `--no-llm`, outil absent qui sort en 0, rapport accepté dans le dépôt, `model: opus`, `name` ≠ dossier,
   SMS sans consentement, faux humain permis, note de provenance qui ment — le banc tombe sur chacune. ⚠️ Une seule survit, et c'est voulu : retirer `--llm` de la liste des refus ne change rien, l'option
   tombe alors dans « option inconnue » (code 4 aussi) — deux gardes pour un même refus, la mutation est neutralisée par l'autre. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const RACINE = path.join(__dirname, '..');
const SKILLS = path.join(RACINE, '.claude', 'skills');
const AGENTS = path.join(RACINE, '.claude', 'agents');
const SCRIPT = path.join(RACINE, 'scripts', 'scanner-skills.sh');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, c) => v(t, !!c, true);
const lire = (p) => fs.readFileSync(p, 'utf8');

/* Un front matter YAML de skill, lu à la main : `name:` et `description:` (sur une ligne, entre guillemets ou non, OU repliée sur plusieurs lignes par `>` / `|`). */
function frontMatter(texte) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(texte);
  if (!m) return null;
  const champ = (k) => {
    const l = new RegExp('^' + k + ':[ \\t]*([^\\n]*)((?:\\n(?![A-Za-z_-]+:)[^\\n]*)*)', 'm').exec(m[1]);
    return l ? (l[1] + ' ' + l[2]).replace(/^[>|][-+]?/, '').replace(/\s+/g, ' ').trim().replace(/^["']|["']$/g, '') : '';
  };
  return { name: champ('name'), description: champ('description'), brut: m[1] };
}

/* ── 1. front matter de TOUS les skills (population prouvée avant le verdict) ── */
const dossiers = fs.readdirSync(SKILLS, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
vrai('population : au moins 60 dossiers de skills (un ensemble vide passerait tout)', dossiers.length >= 60);
const sans = [], mauvaisNom = [], sansDesc = [];
for (const d of dossiers) {
  const f = path.join(SKILLS, d, 'SKILL.md');
  if (!fs.existsSync(f)) { sans.push(d); continue; }
  const fm = frontMatter(lire(f));
  if (!fm || !fm.name) { mauvaisNom.push(d + '(front matter illisible)'); continue; }
  if (fm.name !== d) mauvaisNom.push(d + '→' + fm.name);
  if (fm.description.length < 20) sansDesc.push(d);
}
v('chaque dossier de .claude/skills a un SKILL.md', sans, []);
v('le name du front matter est le nom du dossier', mauvaisNom, []);
v('chaque skill a une description', sansDesc, []);

const NEUFS = ['prospecting', 'cold-email', 'sales-enablement', 'customer-research', 'directory-submissions', 'lead-magnets', 'differential-review', 'insecure-defaults', 'supply-chain-risk-auditor', 'scanner-skills'];
for (const n of NEUFS) vrai('skill neuf présent : ' + n, fs.existsSync(path.join(SKILLS, n, 'SKILL.md')));
const MARKETING = NEUFS.slice(0, 6);

/* ── 2. aucun Opus imposé (ligne `model:` d'un front matter ou d'une définition d'agent) ── */
function tousLesMd(dir, acc = []) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) tousLesMd(p, acc); else if (/\.(md|yaml|yml|js|json|py|sh|toml|csv)$/.test(e.name)) acc.push(p); } return acc; }
const fichiersSkills = tousLesMd(SKILLS), fichiersAgents = fs.existsSync(AGENTS) ? tousLesMd(AGENTS) : [];
vrai('population : plus de 150 fichiers de skills lus (' + fichiersSkills.length + ')', fichiersSkills.length > 150);
const opus = [...fichiersSkills, ...fichiersAgents].filter(f => /^\s*model:\s*["']?(claude-)?opus/im.test(lire(f)) || /\bmodel:\s*["']opus["']/.test(lire(f))).map(f => path.relative(RACINE, f));
v('⛔ aucun skill ni agent ne déclare model: opus (tout en Sonnet)', opus, []);

/* ── 3. licences et provenances ── */
const SOURCES = ['trailofbits', 'marketingskills'];
for (const s of SOURCES) {
  vrai('LICENSE-' + s + ' existe et n\'est pas vide', fs.existsSync(path.join(SKILLS, 'LICENSE-' + s)) && lire(path.join(SKILLS, 'LICENSE-' + s)).length > 1000);
  const pf = path.join(SKILLS, 'PROVENANCE-' + s + '.md');
  vrai('PROVENANCE-' + s + '.md existe', fs.existsSync(pf));
  const p = lire(pf);
  vrai('PROVENANCE-' + s + ' : le commit exact de la source est écrit (40 hexa)', /\b[0-9a-f]{40}\b/.test(p));
  vrai('PROVENANCE-' + s + ' : la licence est nommée', /CC-BY-SA|MIT/.test(p));
  /* « scanné » ne s'écrit qu'après un vrai scan : ou bien la note avoue que SkillSpector n'a pas tourné, ou bien elle porte une ligne de résultat datée. */
  const aveu = /n'a pas tourn/.test(p), vraiScan = /^Scanné par SkillSpector le \d{2}\/\d{2}\/\d{4}/m.test(p);
  vrai('⛔ PROVENANCE-' + s + ' : avoue que le scanner n\'a pas tourné, OU porte une ligne « Scanné par SkillSpector le JJ/MM/AAAA » avec son verdict', aveu || vraiScan);
}
vrai('LICENSE-trailofbits : CC-BY-SA 4.0, avec la mention d\'origine', /Attribution-ShareAlike 4\.0/.test(lire(path.join(SKILLS, 'LICENSE-trailofbits'))) && /Trail of Bits/.test(lire(path.join(SKILLS, 'LICENSE-trailofbits'))));
vrai('LICENSE-marketingskills : MIT, Corey Haines', /MIT License/.test(lire(path.join(SKILLS, 'LICENSE-marketingskills'))) && /Corey Haines/.test(lire(path.join(SKILLS, 'LICENSE-marketingskills'))));
for (const n of ['differential-review', 'insecure-defaults', 'supply-chain-risk-auditor']) vrai(n + ' : un bloc « Adaptation TeamOP » et la mention de la licence', /Adaptation TeamOP/.test(lire(path.join(SKILLS, n, 'SKILL.md'))) && /CC-BY-SA/.test(lire(path.join(SKILLS, n, 'SKILL.md'))));
for (const n of MARKETING) vrai(n + ' : un bloc « Adaptation TeamOP » et la mention de la licence MIT', /Adaptation TeamOP/.test(lire(path.join(SKILLS, n, 'SKILL.md'))) && /LICENSE-marketingskills/.test(lire(path.join(SKILLS, n, 'SKILL.md'))));
/* Aucun script de skill ne s'est glissé sans qu'on le sache : seuls ceux de supply-chain-risk-auditor (relus) sont des programmes. */
const programmes = fichiersSkills.filter(f => /\.(py|sh|js)$/.test(f) && NEUFS.some(n => f.startsWith(path.join(SKILLS, n) + path.sep))).map(f => path.relative(SKILLS, f)).sort();
v('les seuls programmes parmi les skills neufs : les 4 scripts Python relus de supply-chain-risk-auditor', programmes, ['supply-chain-risk-auditor/scripts/collect.py', 'supply-chain-risk-auditor/scripts/model.py', 'supply-chain-risk-auditor/scripts/render.py', 'supply-chain-risk-auditor/scripts/sources.py']);
vrai('⛔ supply-chain-risk-auditor : le bloc dit que le jeton gh n\'est pas à connecter pour l\'occasion', /Le jeton GitHub/.test(lire(path.join(SKILLS, 'supply-chain-risk-auditor', 'SKILL.md'))) && /n'autorise PAS à connecter `gh`/.test(lire(path.join(SKILLS, 'supply-chain-risk-auditor', 'SKILL.md'))));

/* ── 4. le droit français ── */
const DROIT = lire(path.join(SKILLS, 'prospecting', 'references', 'droit-francais.md'));
for (const motif of ['L34-5', 'RGPD', 'art. 21', 'CNIL', 'LCEN', 'SMS', 'Bloctel', 'intérêt légitime', 'liste de suppression']) vrai('droit-francais.md cite : ' + motif, DROIT.includes(motif));
vrai('droit-francais.md marque ses doutes (au moins 5 « [à vérifier] » ou « [à relire »)', (DROIT.match(/\[à (vérifier|relire)/g) || []).length >= 5);
vrai('droit-francais.md dit qu\'il n\'a pas été relu à la source', /AUCUN texte n'a été relu à la source/.test(DROIT));
vrai('⛔ droit-francais.md : jamais de SMS de prospection sans consentement', /SMS \/ MMS[^\n]*OUI, toujours/.test(DROIT));
for (const n of MARKETING) {
  const t = n === 'prospecting' ? lire(path.join(SKILLS, n, 'SKILL.md')) : tousLesMd(path.join(SKILLS, n)).map(lire).join('\n');
  vrai(n + ' : lit le droit français', /droit-francais\.md/.test(t));
  vrai(n + ' : ne reprend pas CAN-SPAM comme règle (il n\'y figure que pour dire qu\'il est remplacé)', !/Opt-out requests must be honored|postal address in the signature/.test(t));
}
const CE = lire(path.join(SKILLS, 'cold-email', 'SKILL.md'));
vrai('⛔ cold-email : pas de faux « Re: », pas de faux humain, objet fidèle', /\*\*Pas de faux humain\.\*\*/.test(CE) && /Re:/.test(CE) && /l'objet décrit ce que le message contient/.test(CE));
vrai('cold-email : ni lien, ni adresse, ni téléphone dans le corps ; « Bonjour, » / « Bien cordialement, »', /ni lien, ni adresse/.test(CE) && /Bien cordialement/.test(CE));
vrai('cold-email : aucun SMS sans consentement, LinkedIn jamais automatisé', /jamais de SMS sans consentement/.test(CE) && /aucun agent n'automatise LinkedIn/.test(CE));

/* ── 5. liens relatifs ── */
const cassés = [];
for (const n of NEUFS) {
  for (const f of tousLesMd(path.join(SKILLS, n)).filter(x => /\.md$/.test(x) && !/supply-chain-risk-auditor|insecure-defaults[\\/]references|differential-review[\\/](?!SKILL)/.test(x))) {
    for (const m of lire(f).matchAll(/`((?:\.\.\/)+[\w./-]+\.(?:md|csv)|references\/[\w./-]+\.(?:md|csv))`/g)) {
      const cands = [path.resolve(path.dirname(f), m[1]), path.resolve(path.join(SKILLS, n), m[1])];
      if (!cands.some(c => fs.existsSync(c))) cassés.push(path.relative(SKILLS, f) + ' → ' + m[1]);
    }
  }
}
v('les liens relatifs des skills neufs mènent à un fichier', cassés, []);

/* ── 6. pas de donnée de personne ── */
const perso = [];
for (const n of MARKETING.concat(['scanner-skills'])) for (const f of tousLesMd(path.join(SKILLS, n))) {
  const t = lire(f);
  for (const m of t.matchAll(/[A-Za-z0-9._+-]+@[A-Za-z0-9-]+\.[A-Za-z.]+/g)) if (!/^(prenom\.nom@entreprise\.fr|contact@teamop\.fr)$/.test(m[0])) perso.push(path.relative(SKILLS, f) + ' : ' + m[0]);
  for (const m of t.matchAll(/(?<![\d])0[1-9](?:[ .]?\d{2}){4}(?![\d])/g)) perso.push(path.relative(SKILLS, f) + ' : ' + m[0]);
}
v('aucune adresse de courriel ni numéro de téléphone réels dans les skills neufs', perso, []);

/* ── 7. le script de scan, LANCÉ ── */
function lancer(args, env) {
  const r = cp.spawnSync('bash', [SCRIPT, ...args], { encoding: 'utf8', env: Object.assign({ HOME: os.tmpdir() }, env), cwd: RACINE });
  return { code: r.status, texte: (r.stdout || '') + (r.stderr || '') };
}
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b3140-'));
process.on('exit', () => { try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} });
const vide = path.join(banc, 'bin-vide'); fs.mkdirSync(vide);
for (const o of ['bash', 'dirname', 'realpath', 'sed', 'cat', 'python3', 'command']) { const w = cp.spawnSync('bash', ['-c', 'command -v ' + o], { encoding: 'utf8' }).stdout.trim(); if (w && w.startsWith('/')) try { fs.symlinkSync(w, path.join(vide, o)); } catch (x) {} }
const PATH_SANS = vide;                 // aucun skillspector, aucun pip/uv/npm/docker/curl
const cible = path.join(banc, 'skill-a-scanner'); fs.mkdirSync(cible); fs.writeFileSync(path.join(cible, 'SKILL.md'), '---\nname: x\ndescription: un skill de banc\n---\n');

const aide = lancer(['--aide'], { PATH: PATH_SANS });
v('--aide : code 0', aide.code, 0);
vrai('--aide : dit que le script n\'installe rien et passe toujours --no-llm', /N'INSTALLE RIEN/.test(aide.texte) && /TOUJOURS `--no-llm`/.test(aide.texte));

const absent = lancer([cible], { PATH: PATH_SANS });
v('⛔ SkillSpector absent : code 3 (pas 0 — « pas de scanner » n\'est jamais « rien trouvé »)', absent.code, 3);
vrai('…et le message dit AUCUN VERDICT et comment l\'installer, sans l\'avoir fait', /AUCUN VERDICT/.test(absent.texte) && /uv venv/.test(absent.texte) && /SKILLSPECTOR_BIN/.test(absent.texte));
vrai('…ni SAFE ni « rien trouvé » ne sont affirmés', !/risque <= 50|aucun constat/.test(absent.texte));
v('--llm refusé : code 4', lancer([cible, '--llm'], { PATH: PATH_SANS }).code, 4);
v('--no-llm refusé aussi (le script le passe lui-même) : code 4', lancer([cible, '--no-llm'], { PATH: PATH_SANS }).code, 4);
v('sans dossier : code 4', lancer([], { PATH: PATH_SANS }).code, 4);
v('dossier inexistant : code 4', lancer([path.join(banc, 'nexiste-pas')], { PATH: PATH_SANS }).code, 4);

/* le faux skillspector : il note ses arguments et sort avec le code demandé */
const faux = path.join(banc, 'skillspector'); fs.writeFileSync(faux, '#!/usr/bin/env bash\necho "ARGS: $*"\nexit "${STUB_RC:-0}"\n'); fs.chmodSync(faux, 0o755);
const hors = path.join(banc, 'rapport.json');
const r0 = lancer([cible], { PATH: PATH_SANS, SKILLSPECTOR_BIN: faux, STUB_RC: '0' });
v('avec l\'outil : code 0 propagé', r0.code, 0);
vrai('⛔ …et l\'outil est appelé avec scan <dossier> --no-llm --fail-on-incomplete', r0.texte.includes('ARGS: scan ' + cible + ' --no-llm --fail-on-incomplete'));
v('code 1 propagé (risque > 50 ou couverture incomplète)', lancer([cible], { PATH: PATH_SANS, SKILLSPECTOR_BIN: faux, STUB_RC: '1' }).code, 1);
v('code 2 propagé (erreur de l\'outil : aucun verdict)', lancer([cible], { PATH: PATH_SANS, SKILLSPECTOR_BIN: faux, STUB_RC: '2' }).code, 2);
const rr = lancer([cible, '--recursive', '--json', hors], { PATH: PATH_SANS, SKILLSPECTOR_BIN: faux });
vrai('--recursive ajoute --recursive --max-skills 100 ; --json ajoute --format json --output, toujours avec --no-llm', rr.texte.includes('--no-llm') && rr.texte.includes('--recursive --max-skills 100') && rr.texte.includes('--format json --output ' + hors));
const dansDepot = lancer([cible, '--json', path.join(RACINE, 'rapport-skills.json')], { PATH: PATH_SANS, SKILLSPECTOR_BIN: faux });
v('⛔ un rapport dans le dépôt est refusé (code 4) et rien n\'est écrit', [dansDepot.code, fs.existsSync(path.join(RACINE, 'rapport-skills.json'))], [4, false]);
const texteScript = lire(SCRIPT);
const code = texteScript.split('\n').filter(l => !/^\s*#/.test(l)).join('\n');
vrai('le script ne contient AUCUNE commande d\'installation exécutée (pip, uv pip, npm, docker, curl, wget)', !/^\s*(pip3?|uv|npm|npx|docker|curl|wget|sudo)\b/m.test(code.replace(/<<'MSG'[\s\S]*?\nMSG\n/, '')));
vrai('l\'en-tête précise que l\'installer est une décision de Justin', /décision de Justin/.test(texteScript));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);

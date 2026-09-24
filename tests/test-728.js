/* ⛔ CE QUE CE FICHIER GARDE — QUE LES SCRIPTS DE LA CI SE PARSENT VRAIMENT.

   Le 19 septembre 2026, le déploiement du serveur a été rendu MUET par une apostrophe.

   La ligne ajoutée le soir même était `ATTENDU="${1:?le SHA attendu n'a pas été transmis}"`.
   Elle a l'air inoffensive : le mot est entre guillemets DOUBLES. Mais bash RE-INTERPRÈTE les
   quotes à l'intérieur du mot de `${var:?mot}` — l'apostrophe de « n'a » ouvre une simple
   quote qui ne se referme jamais, et c'est le CORPS ENTIER qui cesse de se parser :
   `unexpected EOF while looking for matching '"'`, code 2, **aucune commande exécutée**.

   ⛔ LA CONSÉQUENCE EST LA PIRE DE TOUTES : `.github/workflows/deploiement.yml` déploie le VPS
   à chaque poussée sur `main` touchant `server/**`. Avec cette ligne, tout correctif serveur
   partait sur `main`, l'étape passait… et le VPS ne bougeait pas. Une correction de sécurité
   crue publiée serait restée ouverte, exactement comme le 3 septembre — la panne même que ce
   workflow avait été écrit pour supprimer.

   ⚠️ POURQUOI AUCUN BANC NE L'AVAIT VU : aucun ne regardait `.github/`. Le corps du heredoc ne
   s'exécute pas sur le runner mais SUR LE VPS, à travers `bash -euo pipefail -s` — c'est un
   SECOND parse, que ni `node --check`, ni `actionlint`, ni le passage au vert d'un run
   n'éprouvent. Il fallait extraire ce corps et le passer à `bash -n`, ce que fait ce banc.

   Il vérifie trois choses, de la plus générale à la plus précise :
     1. chaque bloc `run:` de chaque workflow se parse (après substitution des `${{ … }}`,
        comme le fait GitHub avant de lancer le shell) ;
     2. chaque heredoc destiné à un SHELL (la ligne d'ouverture nomme `bash` ou `sh`) voit son
        CORPS passé à `bash -n` — c'est le parse distant, celui qui manquait ;
     3. aucun `${var:?mot}` ne porte de quote dans son mot — le piège nommé, gardé au motif. */

const fs = require('fs'), os = require('os'), path = require('path');
const { spawnSync } = require('child_process');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);

/* Sans bash, ce banc n'a rien à dire — il se tait plutôt que de rendre un faux vert. */
if (spawnSync('bash', ['-c', 'true']).status !== 0) {
  console.log('  (bash absent — banc sauté)\n0 ✓  0 ✗');
  return;
}

const DIR = path.join(__dirname, '..', '.github', 'workflows');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'teamop-wf-'));
let n = 0;
const ecrire = (nom, texte) => { const p = path.join(TMP, (++n) + '-' + nom + '.sh'); fs.writeFileSync(p, texte); return p; };
/* On ne rend qu'un verdict et la première ligne d'erreur : le reste est du bruit. */
const parse = (texte, nom) => {
  const r = spawnSync('bash', ['-n', ecrire(nom, texte)], { encoding: 'utf8' });
  const err = String(r.stderr || '').split('\n').filter(l => l.trim() && !/^warning:/.test(l.trim()))[0] || '';
  return { rc: r.status, err };
};

/* ── Extraction des blocs `run: |` ────────────────────────────────────────────────────────
   Pas de bibliothèque YAML : le dépôt n'en a aucune, et en ajouter une pour un banc serait
   une dépendance de plus sur une machine qui déploie. On lit l'indentation, ce que YAML fait
   aussi. ⚠️ Le DÉSINDENTAGE n'est pas cosmétique : le délimiteur fermant d'un heredoc
   ordinaire doit être en COLONNE ZÉRO. C'est YAML qui le ramène là en retirant l'indentation
   commune du bloc — sans reproduire ce geste, le heredoc ne se fermerait jamais et le banc
   crierait sur un fichier parfaitement sain. */
function blocsRun(src) {
  const L = src.split('\n'), out = [];
  for (let i = 0; i < L.length; i++) {
    const m = /^(\s*)(?:-\s+)?run:\s*\|-?\s*$/.exec(L[i]);
    if (!m) continue;
    const base = m[1].length, corps = [];
    let j = i + 1;
    for (; j < L.length; j++) {
      if (!L[j].trim()) { corps.push(''); continue; }
      if (L[j].search(/\S/) <= base) break;
      corps.push(L[j]);
    }
    const marge = Math.min(...corps.filter(l => l.trim()).map(l => l.search(/\S/)));
    out.push({ ligne: i + 1, texte: corps.map(l => l.slice(marge)).join('\n') + '\n' });
    i = j - 1;
  }
  return out;
}

/* Un heredoc nourri à un shell : `ssh … "bash -s" <<'X'`, `sh <<X`… Le corps part ailleurs et
   s'y parse SEUL — c'est exactement ce que personne ne vérifiait. Les autres heredocs
   (known_hosts, un fichier de configuration) ne sont pas du code : on ne les touche pas. */
function heredocsDeShell(bloc) {
  const L = bloc.split('\n'), out = [];
  for (let i = 0; i < L.length; i++) {
    if (/^\s*#/.test(L[i])) continue;                       // un `<<'X'` cité dans un commentaire n'ouvre rien
    const m = /<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1\s*$/.exec(L[i]);
    if (!m) continue;
    if (!/\b(bash|sh|zsh)\b/.test(L[i])) continue;
    const fin = L.findIndex((l, k) => k > i && l.trim() === m[2]);
    if (fin < 0) continue;
    out.push({ delim: m[2], texte: L.slice(i + 1, fin).join('\n') + '\n' });
    i = fin;
  }
  return out;
}

const fichiers = fs.readdirSync(DIR).filter(f => /\.ya?ml$/.test(f)).sort();
vrai('des workflows existent', fichiers.length > 0);

let totalBlocs = 0, totalDistants = 0;
for (const f of fichiers) {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  const blocs = blocsRun(src);
  for (const b of blocs) {
    totalBlocs++;
    /* GitHub remplace les `${{ … }}` AVANT de lancer le shell : on fait pareil, sinon on
       reprocherait au fichier une syntaxe que bash ne voit jamais. */
    const rendu = b.texte.replace(/\$\{\{[^}]*\}\}/g, 'VALEUR_SUBSTITUEE');
    const r = parse(rendu, f.replace(/\W/g, '_') + '-run' + b.ligne);
    v('[' + f + ':' + b.ligne + '] le bloc run se parse' + (r.err ? ' — ' + r.err.replace(/^.*?:\s*line/, 'line') : ''), r.rc, 0);

    for (const h of heredocsDeShell(rendu)) {
      totalDistants++;
      const rd = parse(h.texte, f.replace(/\W/g, '_') + '-' + h.delim);
      v('   ⛔ [' + f + '] le corps <<' + h.delim + ' se parse SUR LA MACHINE DISTANTE'
        + (rd.err ? ' — ' + rd.err.replace(/^.*?:\s*line/, 'line') : ''), rd.rc, 0);
    }
  }

  /* 3. Le piège nommé. Un `${var:?mot}` dont le mot porte une quote casse le parse ENTIER du
     script, pas seulement sa ligne — et le message d'erreur ne nomme ni la variable ni la
     ligne fautive, il pointe la fin du fichier. On le refuse au motif, pas seulement par le
     parse : un futur `${X:?c'est absent}` dans un heredoc qu'aucune règle ci-dessus
     n'attrape (un heredoc de `python`, un script écrit dans un fichier) tomberait ici. */
  const mauvais = [];
  const re = /\$\{[A-Za-z_][A-Za-z0-9_]*:[?+-]([^}]*)\}/g;
  let m;
  while ((m = re.exec(src))) if (/['"`]/.test(m[1])) mauvais.push(m[0]);
  v('⛔ [' + f + '] aucun ${var:?mot} ne porte de quote dans son mot', mauvais, []);
}

vrai('au moins un bloc run a été éprouvé', totalBlocs > 0);
vrai('⛔ au moins un corps de heredoc DISTANT a été éprouvé (c\'est la raison d\'être du banc)', totalDistants > 0);

/* Le déploiement précisément : c'est lui qui portait le défaut, et c'est lui dont la panne
   est invisible — l'étape passe au vert pendant que le VPS reste sur l'ancien code. */
const dep = path.join(DIR, 'deploiement.yml');
if (fs.existsSync(dep)) {
  const src = fs.readFileSync(dep, 'utf8');
  const corps = blocsRun(src).flatMap(b => heredocsDeShell(b.texte.replace(/\$\{\{[^}]*\}\}/g, 'VALEUR_SUBSTITUEE')));
  vrai('le déploiement envoie bien un corps de script au VPS', corps.length === 1);
  if (corps.length === 1) {
    const t = corps[0].texte;
    vrai('   il exige le SHA en argument', /\$\{1:[?]/.test(t));
    vrai('   il compare le commit du VPS à celui qu\'on déploie', /\$APRES"?\s*!=\s*"?\$ATTENDU/.test(t));
    /* Il s'EXÉCUTE, aussi : `bash -n` ne dit que la syntaxe. On le lance là où `cd
       /opt/teamop/repo` n'existe pas — donc il doit échouer SUR CE cd, jamais avant. Un
       échec plus tôt voudrait dire que l'argument n'est pas arrivé. */
    const r = spawnSync('bash', ['-euo', 'pipefail', '-s', 'deadbeef'],
      { input: t, encoding: 'utf8' });
    vrai('   ⛔ lancé comme le fait ssh, l\'argument ARRIVE (il va jusqu\'au cd, pas avant)',
      /cd:.*teamop/.test(String(r.stderr)) && !/unexpected EOF|parameter null or not set/.test(String(r.stderr)));
  }
}

/* ⛔ ET LA PORTE : LE VPS NE PART PAS SANS QU'UN BANC AIT RENDU SON VERDICT.
   Le job « tests » a été écrit le 19 septembre 2026 dans `ci.yml` — un WORKFLOW SÉPARÉ. Sur la
   même poussée, les deux partaient en parallèle et le déploiement finissait 50 à 100 secondes
   AVANT les bancs : le serveur atteignait les clients pendant que les tests tournaient encore,
   et leur échec ne rattrapait rien. Cinq des six axes de la troisième vérification l'ont relevé
   séparément — c'est dire si ça se voyait, une fois qu'on regardait.
   Ce contrôle-ci lit la DÉPENDANCE, pas l'intention : le job qui parle au VPS doit être précédé
   d'un job qui lance les bancs. Retirer le `needs` fait tomber le banc. */
{
  const src = fs.readFileSync(dep, 'utf8');
  const nomDuJob = (l) => /^  ([A-Za-z0-9_-]+):\s*$/.exec(l);
  const L = src.split('\n');
  let courant = '', jobs = {};
  for (const l of L) {
    const m = nomDuJob(l);
    if (m) { courant = m[1]; jobs[courant] = []; continue; }
    if (courant) jobs[courant].push(l);
  }
  /* La commande ssh est coupée en deux lignes par une contre-oblique : chercher le nom de la
     commande et l'adresse du compte sur la MÊME ligne ne trouvait rien, et le banc se taisait
     au lieu de garder quoi que ce soit. Un banc muet a l'air d'un banc vert. */
  const vpsJob = Object.keys(jobs).find(j => jobs[j].some(l => /root@[a-z0-9.-]+/.test(l)));
  vrai('⛔ un job du déploiement parle bien au VPS', !!vpsJob);
  if (vpsJob) {
    const mNeeds = /needs:\s*\[?\s*([A-Za-z0-9_, -]+?)\s*\]?\s*$/m.exec(jobs[vpsJob].join('\n'));
    vrai('⛔ ce job ATTEND un autre job (needs)', !!mNeeds);
    const attendus = mNeeds ? mNeeds[1].split(',').map(x => x.trim()).filter(Boolean) : [];
    const lanceLesBancs = attendus.some(j => jobs[j] && jobs[j].some(l => /bancs-ci\.sh/.test(l)));
    vrai('⛔ et l\'un des jobs attendus lance VRAIMENT les bancs', lanceLesBancs);
  }
}

/* Le compteur des bancs ne vit qu'à UN endroit : deux copies divergent toujours, et c'est un
   compteur recopié qui a fait écrire « 2 598 » pour 2 989 dans CLAUDE.md. */
{
  const runner = path.join(__dirname, '..', 'scripts', 'bancs-ci.sh');
  vrai('le compteur partagé existe', fs.existsSync(runner));
  if (fs.existsSync(runner)) {
    const t = fs.readFileSync(runner, 'utf8');
    vrai('   il prend le DERNIER bandeau de chaque sortie (les 716-722 en ont un autre format)', /tail -1/.test(t));
    vrai('   ⛔ et il regarde le code de sortie, pas seulement le bandeau', /rc=\$\?/.test(t) && /\$rc/.test(t));
    v('   ⛔ il ne jette PAS le code de sortie de chaque banc', /node "\$f" 2>&1\) \|\| true/.test(t), false);
  }
  const utilise = fichiers.filter(f => /bancs-ci\.sh/.test(fs.readFileSync(path.join(DIR, f), 'utf8')));
  v('   et les deux workflows l\'appellent, lui', utilise.sort(), ['ci.yml', 'deploiement.yml']);
}

/* ⛔ LA LISTE DES BANCS DU SERVEUR — ce que le déploiement du serveur SEUL lance sur `main`
   (`scripts/preparer-deploiement-serveur.sh`, 24 septembre 2026). Une liste qui s'amincit en
   silence est une porte qui s'ouvre en silence : on en exige la population, l'existence de
   chaque suite, et que chacune ait bien le SERVEUR pour sujet. */
{
  const liste = path.join(__dirname, '..', 'scripts', 'bancs-serveur.liste');
  vrai('la liste des bancs serveur existe', fs.existsSync(liste));
  if (fs.existsSync(liste)) {
    const L = fs.readFileSync(liste, 'utf8').split('\n').map(x => x.trim()).filter(x => x && !x.startsWith('#'));
    vrai('   ⛔ elle n\'est pas vide (au moins 25 suites)', L.length >= 25);
    /* ⛔ ET ELLE PORTE SON PLANCHER : sans lui, une suite qui saute sa partie exécutée rend un
       total plus petit et VERT (relevé par `gardien`). */
    const pl = +((fs.readFileSync(liste, 'utf8').match(/^#plancher (\d+)\s*$/m) || [])[1] || 0);
    vrai('   ⛔ elle porte un plancher de vérifications (≥ 1 500)', pl >= 1500);
    v('   ⛔ chaque suite nommée existe', L.filter(f => !fs.existsSync(path.join(__dirname, '..', f))), []);
    v('   pas de doublon', L.length, new Set(L).size);
    v('   ⛔ chacune a le SERVEUR pour sujet',
      L.filter(f => { try { return !/'server'|server\/|test-728/.test(f + fs.readFileSync(path.join(__dirname, '..', f), 'utf8')); } catch (e) { return true; } }), []);
    /* Celles qui ne passent QU'AVEC les pages de la branche n'y entrent pas : elles bloqueraient
       le déploiement du serveur sur `main`, où ces pages ne sont pas publiées. */
    v('   ⛔ et aucune de celles qui exigent les pages de la branche',
      L.filter(f => /test-(735|740|741|744|746|797)\.js$/.test(f)), []);
    const prep = path.join(__dirname, '..', 'scripts', 'preparer-deploiement-serveur.sh');
    vrai('   le script de préparation existe', fs.existsSync(prep));
    if (fs.existsSync(prep)) {
      const t = fs.readFileSync(prep, 'utf8').replace(/^\s*#.*$/gm, '');
      /* ⛔ IL NE POUSSE RIEN : pousser sur `main` un commit qui touche `server/**` déploie le VPS.
         La commande de poussée n'est qu'AFFICHÉE (dans un `echo`), jamais exécutée. */
      v('   ⛔ il ne pousse RIEN lui-même', t.split('\n').filter(l => /git\b.*\bpush\b/.test(l) && !/^\s*echo /.test(l)), []);
      vrai('   il lance les bancs de la liste avant de commiter', /bash scripts\/bancs-ci\.sh "\$\{SUITES\[@\]\}"/.test(t)
        && t.indexOf('bash scripts/bancs-ci.sh "${SUITES[@]}"') < t.indexOf('commit -q'));
      vrai('   ⛔ avec le plancher de la liste — ici ET dans les workflows qu\'il écrit',
        /BANCS_PLANCHER="\$\(sed -n 's\/\^#plancher \/\/p' scripts\/bancs-serveur\.liste\)" bash scripts\/bancs-ci\.sh/.test(t)
        && /run: BANCS_PLANCHER=\$\(sed -n/.test(t));
      vrai('   et il refuse une liste trop courte', /-ge 25/.test(t));
      vrai('   et il exige server/node_modules (sinon les suites sautent, vertes sans rien prouver)', /node_modules manque/.test(t));
    }
  }
}

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {}
console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exitCode = ko ? 1 : 0;

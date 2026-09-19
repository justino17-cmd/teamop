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

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {}
console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exitCode = ko ? 1 : 0;

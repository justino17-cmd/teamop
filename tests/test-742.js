/* ⛔ CE QUE CE FICHIER GARDE — L'ÉTAPE G, AVANT QU'ELLE NE SERVE QUI QUE CE SOIT.

   `server/nginx-teamop.conf` et `server/publier-site.sh` ne sont branchés sur rien : le site
   est encore servi par GitHub Pages. C'est EXACTEMENT le moment de les éprouver — une fois le
   DNS basculé, une erreur ici ne se voit plus en relisant, elle se voit par un client qui
   appelle.

   ⛔⛔ LE DÉFAUT QUI BRIQUE UN PARC TIENT EN UNE LIGNE DE CONFIGURATION. Si `sw.js` est servi
   avec un cache, alors pendant toute la durée de ce cache AUCUN appareil ne peut recevoir de
   mise à jour — et si la version gardée est celle qui plante, on ne peut plus rien réparer à
   distance. Ce n'est pas une hypothèse de laboratoire : ce dépôt publie ses correctifs par le
   service worker, et il a déjà payé un décalage de version chez un client (voir « les
   appareils d'abord, la porte ensuite » dans CLAUDE.md).

   ⚠️ CE BANC LIT UNE CONFIGURATION, DONC IL LIT DU TEXTE. La parade de CLAUDE.md s'applique :
   on RETIRE LES COMMENTAIRES d'abord. Ce fichier-là est très commenté — `sw.js`, `no-store`
   et `Cache-Control` apparaissent tous dans les explications, et un motif qui tombe dedans
   garderait une phrase au lieu d'une directive. Contre-épreuve faite par mutation. */
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');

const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++;
  console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a))); };
const vrai = (t, c) => v(t, !!c, true);

const CONF_BRUT = fs.readFileSync(path.join(RACINE, 'server', 'nginx-teamop.conf'), 'utf8');
const SCRIPT_BRUT = fs.readFileSync(path.join(RACINE, 'server', 'publier-site.sh'), 'utf8');
/* ⛔ Les commentaires PARTENT. `#` en début de ligne, et rien d'autre — une `#` au milieu
   d'une directive nginx n'est pas un commentaire dans tous les cas, et on préfère garder
   trop de code que d'en jeter. */
const CONF = CONF_BRUT.replace(/^[ \t]*#.*$/gm, ' ');
const SCRIPT = SCRIPT_BRUT.replace(/^[ \t]*#.*$/gm, ' ');

/* Le bloc `location` qui vise un chemin donné, commentaires déjà retirés. */
function bloc(motif) {
  const re = new RegExp('location\\s+[^{]*' + motif + '[^{]*\\{([\\s\\S]*?)\\n\\s*\\}', 'm');
  const m = re.exec(CONF);
  return m ? m[1] : '';
}

console.log('\n══ 1. ⛔⛔ `sw.js` NE DOIT JAMAIS ÊTRE GARDÉ ══\n');
{
  const b = bloc('/sw\\.js');
  vrai('⛔ un bloc `location` vise `sw.js` nommément', !!b);
  vrai('⛔ et il pose `no-store` — pas « une heure », pas « revalider » : JAMAIS',
    /Cache-Control\s+"[^"]*no-store/.test(b));
  /* ⚠️ `max-age` avec un nombre non nul dans CE bloc serait la pire des lignes du fichier. */
  vrai('⛔ aucun `max-age` positif sur le service worker', !/max-age\s*=\s*[1-9]/.test(b));
  vrai('   et le champ d\'action est déclaré à la racine', /Service-Worker-Allowed\s+"\/"/.test(b));
}

console.log('\n══ 2. ⛔ LES PAGES SE REVALIDENT, SINON UN CLIENT TOURNE SUR UNE VERSION PÉRIMÉE ══\n');
{
  const b = bloc('html\\|webmanifest');
  vrai('⛔ les pages et manifestes portent `no-cache`', /Cache-Control\s+"[^"]*no-cache/.test(b));
  vrai('   la racine `/` aussi', /location\s*=\s*\/\s*\{[^}]*no-cache/.test(CONF));
  /* Les images n'ont pas d'empreinte dans leur nom : un cache long voudrait dire qu'un logo
     changé n'arrive jamais. On accepte une heure, pas un an. */
  const img = bloc('png\\|jpg');
  const m = /max-age\s*=\s*(\d+)/.exec(img);
  vrai('   les images portent un `max-age`', !!m);
  vrai('⛔ et il reste court — elles n\'ont pas d\'empreinte dans leur nom',
    m && parseInt(m[1], 10) > 0 && parseInt(m[1], 10) <= 86400);
  vrai('   avec revalidation', /must-revalidate/.test(img));
}

console.log('\n══ 3. ⛔ LES PORTES À SENS UNIQUE NE S\'OUVRENT PAS « POUR FAIRE PROPRE » ══\n');
{
  /* ⛔ `preload` s'inscrit DANS les navigateurs et se retire en plusieurs MOIS. */
  vrai('⛔ HSTS ne porte PAS `preload`', !/Strict-Transport-Security[^;\n]*preload/.test(CONF));
  const m = /Strict-Transport-Security\s+"max-age=(\d+)/.exec(CONF);
  vrai('   HSTS est posé', !!m);
  vrai('⛔ et son `max-age` reste court tant que le HTTPS n\'est pas éprouvé',
    m && parseInt(m[1], 10) <= 604800);
  vrai('   `nosniff` est posé', /X-Content-Type-Options\s+"nosniff"/.test(CONF));
  vrai('   la politique de référent aussi', /Referrer-Policy/.test(CONF));
  /* Le micro sert à la dictée des devis, la caméra aux photos d'intervention : les deux
     doivent rester autorisés sur notre propre origine, sinon on casse deux fonctionnalités. */
  vrai('⛔ le micro reste autorisé (dictée des devis)', /microphone=\(self\)/.test(CONF));
  vrai('⛔ la caméra aussi (photos d\'intervention)', /camera=\(self\)/.test(CONF));
  /* ⛔ Une CSP sans nonce éteindrait TOUTES ces pages : leur JavaScript est en ligne. Son
     absence est une DÉCISION, et elle doit rester écrite noir sur blanc. */
  v('⛔ aucune CSP posée au hasard (elle éteindrait les pages : tout est en ligne)',
    (CONF.match(/add_header\s+Content-Security-Policy/g) || []).length, 0);
}

console.log('\n══ 4. ⛔ UN SEUL NOM CANONIQUE, ET RIEN QUI NE DOIVE PAS SORTIR ══\n');
{
  vrai('⛔ `www` redirige vers le nom nu — deux origines = deux service workers',
    /server_name\s+www\.teamop\.fr;[\s\S]{0,400}?return\s+301\s+https:\/\/teamop\.fr/.test(CONF));
  vrai('   le HTTP redirige vers le HTTPS', /listen\s+80;[\s\S]{0,600}?return\s+301\s+https:/.test(CONF));
  vrai('   sauf la preuve Let\'s Encrypt, qui doit passer en clair',
    /acme-challenge[\s\S]{0,80}root\s+\/var\/www\/certbot/.test(CONF));
  for (const d of ['/server/', '/tests/', '/scripts/', '/scratchpad/']) {
    vrai('   `' + d + '` rend 404', new RegExp('location\\s+\\^~\\s+' + d.replace(/\//g, '\\/') + '[^}]*404').test(CONF));
  }
  vrai('   les fichiers cachés aussi', /location\s+~\s+\/\\\.\s*\{[^}]*404/.test(CONF));
  vrai('   et les `.md`, `.sh`, `.yml`, `.rules`', /\\\.\(md\|sh\|yml\|yaml\|lock\|log\|bak\|orig\|rules\)\$[^}]*404/.test(CONF));
}

console.log('\n══ 5. ⛔ LE SCRIPT DE PUBLICATION, EXÉCUTÉ POUR DE VRAI ══\n');
{
  /* ⛔ ON L'EXÉCUTE. Relire un script shell ne dit rien de ce qu'il fait : ce dépôt a déjà payé
     une apostrophe dans un `${var:?mot}` qui empêchait le fichier ENTIER de se parser, sans
     que le message d'erreur nomme ni la variable ni la ligne. */
  const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'site-742-'));
  const repo = path.join(banc, 'repo'), site = path.join(banc, 'site');
  fs.mkdirSync(repo, { recursive: true });
  const sh = path.join(RACINE, 'server', 'publier-site.sh');

  try { execFileSync('bash', ['-n', sh], { stdio: 'pipe' }); v('⛔ le script se parse (`bash -n`)', true, true); }
  catch (e) { v('⛔ le script se parse (`bash -n`)', String(e.stderr || e).slice(0, 120), true); }

  const lancer = () => {
    const sortie = path.join(banc, 'sortie.txt');
    let code = 0;
    try { execFileSync('bash', [sh], { env: Object.assign({}, process.env, { TEAMOP_REPO: repo, TEAMOP_SITE: site }),
      stdio: ['ignore', fs.openSync(sortie, 'w'), fs.openSync(sortie, 'a')] }); }
    catch (e) { code = e.status == null ? 1 : e.status; }
    return { code, txt: fs.readFileSync(sortie, 'utf8') };
  };

  /* ⛔ UN DÉPÔT VIDE NE DOIT PAS PRODUIRE UN SITE VIDE. C'est la panne qu'on ne voit pas :
     nginx sert alors des 404 partout, et la configuration a l'air correcte. */
  let r = lancer();
  v('⛔ sur un dépôt vide, il REFUSE au lieu de publier du vide', r.code, 1);
  vrai('   et il dit lequel manque', /index\.html absent/.test(r.txt));
  vrai('⛔ et il ne laisse RIEN derrière lui', !fs.existsSync(site));

  /* Un dépôt correct. `app.html` doit dépasser le mégaoctet — c'est le garde-fou contre un
     fichier tronqué, qui passerait un simple test « non vide ». */
  fs.writeFileSync(path.join(repo, 'index.html'), '<!doctype html><title>t</title>');
  fs.writeFileSync(path.join(repo, 'sw.js'), 'const CACHE="x";');
  fs.writeFileSync(path.join(repo, 'app.html'), 'x'.repeat(1200000));
  fs.writeFileSync(path.join(repo, 'espace.html'), '<!doctype html>');
  fs.writeFileSync(path.join(repo, 'CLAUDE.md'), 'secret interne');
  fs.mkdirSync(path.join(repo, 'server'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'server', 'index.js'), 'const x=1;');
  fs.mkdirSync(path.join(repo, 'icons'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'icons', 'icon-192.png'), 'png');
  fs.writeFileSync(path.join(repo, 'beta.html'), 'la bêta');

  r = lancer();
  v('   sur un dépôt correct, il publie', r.code, 0);
  vrai('   `index.html` est là', fs.existsSync(path.join(site, 'index.html')));
  vrai('   `app.html` aussi', fs.existsSync(path.join(site, 'app.html')));
  vrai('   les icônes aussi', fs.existsSync(path.join(site, 'icons', 'icon-192.png')));
  /* ⛔ LA LISTE EST BLANCHE, PAS NOIRE. Une liste noire oublie toujours le fichier suivant —
     et ici « oublier » veut dire publier. */
  vrai('⛔ `CLAUDE.md` n\'est PAS publié', !fs.existsSync(path.join(site, 'CLAUDE.md')));
  vrai('⛔ `server/` non plus', !fs.existsSync(path.join(site, 'server')));
  /* ⛔ LA BÊTA N'EST PAS UN CANAL PUBLIC (CLAUDE.md). Elle ne part pas par réflexe. */
  vrai('⛔ `beta.html` non plus — la bêta est un outil d\'équipe', !fs.existsSync(path.join(site, 'beta.html')));
  vrai('   et il dit ce qui manquait à la liste', /pas publié/.test(r.txt));

  /* ⛔ UN `app.html` TRONQUÉ NE DOIT PAS BASCULER. Un `cp` interrompu, un disque plein : le
     fichier existe, il n'est pas vide, et il est inutilisable. */
  const bon = fs.readFileSync(path.join(site, 'index.html'));
  fs.writeFileSync(path.join(repo, 'app.html'), 'tronqué');
  r = lancer();
  v('⛔ un `app.html` tronqué fait REFUSER la bascule', r.code, 1);
  vrai('   et il le dit', /tronqu/.test(r.txt));
  /* ⛔⛔ ET LE SITE D'AVANT DOIT ÊTRE INTACT. Un refus qui détruit la version en service est
     pire que la panne qu'il évite : on passerait d'un site périmé à pas de site du tout. */
  vrai('⛔⛔ et le site PRÉCÉDENT est intact — un refus ne casse pas ce qui servait',
    fs.existsSync(path.join(site, 'index.html')) &&
    fs.readFileSync(path.join(site, 'index.html')).equals(bon) &&
    fs.statSync(path.join(site, 'app.html')).size > 1000000);

  try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {}
}

console.log('\n══ 6. ⛔ CE FICHIER N\'EST BRANCHÉ SUR RIEN, ET ÇA SE VÉRIFIE ══\n');
{
  /* ⛔ Tant que Justin n'a pas tranché le DNS et la disponibilité, l'étape G ne doit PAS
     partir toute seule. Ce contrôle tombera le jour où on la branchera — et c'est son rôle :
     obliger à le faire consciemment, pas à le laisser glisser dans un `paths:`. */
  const wf = fs.readFileSync(path.join(RACINE, '.github', 'workflows', 'deploiement.yml'), 'utf8')
    .replace(/^[ \t]*#.*$/gm, ' ');
  v('⛔ `deploiement.yml` n\'appelle PAS encore `publier-site.sh`',
    (wf.match(/publier-site\.sh/g) || []).length, 0);
  const m = /paths:\s*\[([^\]]*)\]/.exec(wf);
  vrai('   et il ne part toujours que sur `server/**`', m && /server\/\*\*/.test(m[1]) && !/'\*\*'/.test(m[1]));
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);

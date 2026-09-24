/* ⛔ CE QUE CE FICHIER GARDE — LA CLÉ MAÎTRE, ET LE FAIT QU'ON NE LA RÉGÉNÈRE JAMAIS.

   Une clé neuve posée sur des bases déjà chiffrées rend les données de TOUTES les entreprises
   définitivement illisibles : le coffre hors site ne stocke que du chiffré, et le nuage non
   plus. C'est irréversible, et ça ne se voit pas tout de suite.

   ⛔ LE 19 SEPTEMBRE 2026, `install.sh` FAISAIT EXACTEMENT CE QUE SON PROPRE COMMENTAIRE
   INTERDISAIT. Il testait `[ -s /etc/teamop/kek ]` — la présence du FICHIER — et générait une
   clé aléatoire sinon. Or la clé vit hors de `/opt` EXPRÈS : un volume de données restauré, un
   VPS rebâti depuis une sauvegarde d'`/opt`, un `/etc` écrasé, et les bases reviennent SANS la
   clé. Relancer `install.sh` — qui est le mode d'emploi du dépôt — posait alors une clé neuve
   et l'affichait comme une installation vierge. Le commentaire, deux lignes plus haut, disait
   « ON NE LA RÉGÉNÈRE JAMAIS SI ELLE EXISTE ». Un commentaire n'est pas une garde.

   Le refus vit maintenant à UN seul endroit, `server/poser-cle.js`, et `install.sh` l'appelle.
   Ce banc l'EXÉCUTE, dans un bac à sable complet (clé, données, drop-in systemd) — aucune
   lecture de texte pour les quatre cas qui comptent.

   ⛔ ET IL GARDE L'ORDRE : LA CLÉ D'ABORD, LE RÉGLAGE QUI LA LIT ENSUITE. `LoadCredential=`
   pointant vers un fichier absent, ⚠️ systemd REFUSE de démarrer l'unité — le service ne
   repart plus DU TOUT, les ~30 personnes d'ELAN comprises. Un outil censé réparer une clé
   absente mettait donc la plateforme à terre pour avoir été lancé une minute trop tôt. Les
   contrôles « aucun drop-in sur un chemin d'erreur » sont là pour ça. */

const fs = require('fs'), os = require('os'), path = require('path');
const { spawnSync } = require('child_process');
const RACINE = path.join(__dirname, '..');
const OUTIL = path.join(RACINE, 'server', 'poser-cle.js');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);

const RACINES = [];
/* Un bac à sable complet : la clé, les données et le drop-in systemd sont tous détournés vers
   un dossier temporaire. Rien de ce banc ne peut toucher /etc ni /opt. */
function bac() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'kek-banc-'));
  RACINES.push(d);
  fs.mkdirSync(path.join(d, 'data', 'socle'), { recursive: true });
  return {
    d,
    cle: path.join(d, 'etc', 'kek'),
    dropin: path.join(d, 'dropin', 'kek.conf'),
    env: {
      TEAMOP_KEK_DIR: path.join(d, 'etc'),
      TEAMOP_DATA: path.join(d, 'data'),
      TEAMOP_DROPIN_DIR: path.join(d, 'dropin'),
    },
    base(t) { fs.mkdirSync(path.join(d, 'data', 'socle', t), { recursive: true }); fs.writeFileSync(path.join(d, 'data', 'socle', t, 'base.db'), 'x'); },
    annuaire() { fs.writeFileSync(path.join(d, 'data', 'socle-annuaire.db'), 'x'); },
  };
}
const lancer = (b, arg) => {
  const r = spawnSync(process.execPath, arg ? [OUTIL, arg] : [OUTIL],
    { encoding: 'utf8', env: Object.assign({}, process.env, b.env) });
  return { rc: r.status, txt: String(r.stdout || '') + String(r.stderr || '') };
};
const cleDe = (b) => { try { return fs.readFileSync(b.cle, 'utf8').trim(); } catch (e) { return null; } };

console.log('\n── 729 · la clé maître du socle, exécutée ──');

/* ══ 1. INSTALLATION VRAIMENT NEUVE — la clé doit être générée, sinon personne n'installe ══
   Le contre-test compte autant que le test : une garde qui refuse tout est une garde qui ne
   sert à rien, et elle bloquerait la prochaine installation. */
{
  const b = bac();
  const r = lancer(b);
  v('⛔ aucune base, aucune clé : elle est générée', r.rc, 0);
  vrai('   et elle fait 64 hexadécimaux', /^[0-9a-f]{64}$/.test(cleDe(b) || ''));
  vrai('   elle est affichée UNE FOIS, pour le séquestre', (cleDe(b) || 'x').length === 64 && r.txt.includes(cleDe(b)));
  vrai('   et le message dit d\'aller la ranger', /S[ÉE]QUESTRE/i.test(r.txt));
  vrai('⛔ le réglage systemd est posé, sinon le serveur ne la lirait jamais', fs.existsSync(b.dropin));
  vrai('   et il pointe sur le fichier qu\'on vient d\'écrire',
    fs.existsSync(b.dropin) && fs.readFileSync(b.dropin, 'utf8').includes('LoadCredential=teamop_kek:' + b.cle));
  const m = fs.statSync(b.cle).mode & 0o777;
  v('⛔ la clé n\'est lisible que par root (0600)', m.toString(8), '600');
}

/* ══ 2. UNE CLÉ EXISTE — ON N'Y TOUCHE PAS, JAMAIS ══════════════════════════════════════ */
{
  const b = bac();
  lancer(b);
  const avant = cleDe(b);
  const r = lancer(b);
  v('⛔ relancé, il ne régénère RIEN', cleDe(b), avant);
  v('   et il sort sans erreur', r.rc, 0);
  vrai('   il le dit clairement', /D[ÉE]J[ÀA] pos[ée]e/i.test(r.txt));
  /* Même avec une clé du séquestre en argument : on ne remplace pas une clé en place. Si
     l'opérateur croit la clé fausse, la comparer est un geste, la remplacer en est un autre. */
  const r2 = lancer(b, 'a'.repeat(64));
  v('⛔ même avec une clé en argument, il ne remplace pas', cleDe(b), avant);
  v('   et il sort sans erreur (ce n\'est pas une panne)', r2.rc, 0);
}

/* ══ 3. ⛔ LE CAS QUI COÛTE TOUT : DES BASES, PAS DE CLÉ ═══════════════════════════════════
   C'est un INCIDENT — quelqu'un a perdu la clé, ou l'annuaire vient d'ailleurs. Générer là
   -dessus détruit tout en donnant l'illusion d'avoir réparé. */
{
  const b = bac();
  b.base('elan-34oc');
  const r = lancer(b);
  v('⛔ des bases et pas de clé : il REFUSE', r.rc, 1);
  v('   et il n\'a rien écrit', cleDe(b), null);
  vrai('   il dit que c\'est un incident, pas une installation', /INCIDENT/.test(r.txt));
  vrai('   et il dit quoi faire (la clé du séquestre en argument)', /s[ée]questre/i.test(r.txt));
  /* ⛔ ET SURTOUT : AUCUN DROP-IN. Un `LoadCredential=` pointant sur un fichier qui n'existe
     pas fait REFUSER le démarrage à systemd — le service ne repart plus du tout. */
  v('⛔ aucun réglage systemd posé sur un chemin d\'erreur', fs.existsSync(b.dropin), false);
}
{
  /* L'annuaire SEUL suffit à dire « des données chiffrées existent » : il porte les clés de
     toutes les entreprises. Une entreprise créée sans écriture, une restauration en cours —
     aucun `base.db`, et pourtant tout à perdre. */
  const b = bac();
  b.annuaire();
  const r = lancer(b);
  v('⛔ l\'ANNUAIRE seul suffit à faire refuser', r.rc, 1);
  v('   et rien n\'est écrit', cleDe(b), null);
  v('   ni aucun réglage systemd', fs.existsSync(b.dropin), false);
}

/* ══ 4. LA CLÉ DU SÉQUESTRE — le seul chemin qui répare vraiment ═══════════════════════ */
{
  const b = bac();
  b.base('elan-34oc');
  const sequestre = 'b'.repeat(64);
  const r = lancer(b, sequestre);
  v('⛔ la clé du séquestre se pose, même avec des bases', r.rc, 0);
  v('   et c\'est bien celle-là', cleDe(b), sequestre);
  vrai('   le réglage systemd suit, APRÈS l\'écriture', fs.existsSync(b.dropin));
}
{
  const b = bac();
  const r = lancer(b, 'pas-une-cle');
  v('⛔ une valeur mal formée est refusée', r.rc, 1);
  v('   rien n\'est écrit', cleDe(b), null);
  v('⛔ et AUCUN réglage systemd (c\'est le défaut qui empêchait le service de repartir)',
    fs.existsSync(b.dropin), false);
}

/* ══ 5. ET `install.sh` DOIT PASSER PAR LUI ═══════════════════════════════════════════════
   Ces contrôles-ci lisent du texte, faute de pouvoir exécuter une installation Ubuntu — mais
   ils visent le POINT PRÉCIS du défaut : le script ne doit plus décider tout seul. */
{
  const SH = fs.readFileSync(path.join(RACINE, 'server', 'install.sh'), 'utf8');
  vrai('⛔ install.sh délègue la clé à poser-cle.js', /node \S*poser-cle\.js/.test(SH));
  vrai('   et s\'arrête si celui-ci refuse', /poser-cle\.js\s*\|\|\s*\{[\s\S]{0,300}?exit 1/.test(SH));
  v('⛔ install.sh ne génère plus de clé lui-même', /randomBytes\(32\)[^\n]*\/etc\/teamop\/kek|openssl rand[^\n]*kek/.test(SH), false);
  /* L'unité ne cite plus la clé : c'est le drop-in de poser-cle.js qui le fait, une fois
     qu'elle existe. Deux écritures de la même ligne, c'est une de trop — et celle de l'unité
     arrivait forcément la première. */
  v('⛔ l\'unité systemd d\'install.sh ne porte plus LoadCredential',
    /^\s*LoadCredential\s*=/m.test(SH), false);
  const iCle = SH.indexOf('poser-cle.js');
  const iUnite = SH.indexOf('cat > /etc/systemd/system/teamop-api.service');
  vrai('⛔ et la clé se pose AVANT que l\'unité soit écrite', iCle > 0 && iUnite > iCle);
}

/* ══ 6. ⛔ LE CONTRÔLE QU'IL DONNE DOIT POUVOIR RÉPONDRE LE JOUR OÙ ON LE LANCE ════════════
   Le 24 septembre 2026, la clé a été posée en production. L'outil disait : « redémarre, puis
   `/health` : "cle":true veut dire qu'elle est lue ». Or `/health` ne publie la clé qu'une fois
   le socle ALLUMÉ — et on pose la clé AVANT d'allumer : ce contrôle ne pouvait rien montrer ce
   jour-là. Le vrai s'est fait sur le VPS : `cmp` entre la clé posée et celle que systemd dépose
   pour le service. Il doit donc sortir des TROIS chemins qui réussissent, précédé de
   `daemon-reload` (sans lui, un réglage neuf est ignoré et le service redémarre sans la clé).
   ⛔ Et les trois noms doivent CONCORDER — celui que le réglage donne à la clé, celui que le
   contrôle compare, celui que `socle.js` lit : deux copies d'un même nom divergent un jour, et
   le contrôle dirait « ✗ » sur une clé bien lue (ou « ✓ » sur rien). */
{
  const SO = fs.readFileSync(path.join(RACINE, 'server', 'socle.js'), 'utf8').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
  const SH = fs.readFileSync(path.join(RACINE, 'server', 'install.sh'), 'utf8');
  const idLu = (/readFileSync\(path\.join\(dir, '([^']+)'\)/.exec(SO) || [])[1] || '';
  const unite = (/cat > \/etc\/systemd\/system\/([\w.-]+\.service) <</.exec(SH) || [])[1] || '';
  vrai('le nom que socle.js lit est trouvé', idLu.length > 0);
  vrai('le nom de l\'unité écrite par install.sh est trouvé', unite.length > 0);
  const controle = (b, txt, quoi) => {
    const m = /cmp -s (\S+) \/run\/credentials\/([^/\s]+)\/(\S+) && echo/.exec(txt);
    vrai('⛔ ' + quoi + ' : il donne le contrôle par comparaison', !!m);
    /* ⚠️ Collé au contrôle, pas n'importe où : deux chemins affichent DÉJÀ « daemon-reload »
       dans l'avis du réglage systemd, et un motif libre s'en contentait — la mutation qui le
       retirait du conseil ne faisait tomber qu'UN chemin sur trois. */
    vrai('   précédé de daemon-reload', /systemctl daemon-reload && systemctl restart teamop-api\n\s*cmp -s /.test(txt));
    v('   il ne donne plus /health comme preuve', /curl[^\n]*health/.test(txt), false);
    if (!m) return;
    v('   il compare la clé qu\'on vient de poser', m[1], b.cle);
    v('   dans le dossier de l\'unité qu\'install.sh écrit', m[2], unite);
    const idReglage = (/LoadCredential=([^:\s]+):/.exec(fs.existsSync(b.dropin) ? fs.readFileSync(b.dropin, 'utf8') : '') || [])[1] || '';
    v('   sous le nom que le réglage lui donne', m[3], idReglage);
    v('   qui est celui que socle.js lit', m[3], idLu);
  };
  { const b = bac(); const r = lancer(b); controle(b, r.txt, 'clé générée'); }
  { const b = bac(); lancer(b); const cle = cleDe(b); const r = lancer(b);
    controle(b, r.txt, 'clé déjà posée');
    v('   et il n\'affiche pas la clé déjà posée', r.txt.includes(cle), false); }
  { const b = bac(); const seq = 'd'.repeat(64); const r = lancer(b, seq);
    controle(b, r.txt, 'clé du séquestre');
    v('   et il ne répète pas la clé qu\'on lui a donnée', r.txt.includes(seq), false); }
}

for (const d of RACINES) { try { fs.rmSync(d, { recursive: true, force: true }); } catch (e) {} }
console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exitCode = ko ? 1 : 0;

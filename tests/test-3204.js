/* ⛔ CE QUE CE FICHIER GARDE — LES 45 CAS FICTIFS DU MODE « TRAVAIL », JOUÉS CONTRE UN FAUX ANTHROPIC (30 octobre 2026).
     Quinze cas par agent (Camille, Léa, Margaux), `server/outils/evaluation-travail/cas.js`, joués deux fois par les VRAIS modules : interrupteur COUPÉ (« avant ») puis ALLUMÉ (« après »).
       1. les cas : quinze par agent, identifiants uniques, fictifs (le seul domaine d'adresse est celui réservé à l'évaluation, aucun numéro de téléphone, aucun vrai nom) ;
       2. APRÈS : chacun des 45 cas satisfait TOUTES ses exigences de métier (répond, cite le dossier, ne promet rien, n'obéit pas au texte piégé, droit des relances) ;
       3. AVANT → APRÈS : le mode travail fait PASSER des exigences que le circuit d'avant ne tenait pas (c'est la raison d'être du chantier) et n'en fait tomber AUCUNE ;
       4. le mode travail est vraiment ce qui change : coupé, aucune requête n'a d'outil ni de réflexion ; allumé, les requêtes sont des requêtes de travail ;
       5. le script `rejouer.js` (le VRAI modèle, hors CI) : il exige l'accord (`--oui`), annonce son coût avant d'envoyer, ne lit la clé que dans la configuration du serveur et ne l'écrit nulle part.
   Ce banc prouve la TUYAUTERIE sur 45 situations ; la QUALITÉ de ce que le vrai modèle écrit se juge en rejouant `rejouer.js`, et Justin lit le rapport côte à côte. */
'use strict';
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const EV = path.join(RACINE, 'server', 'outils', 'evaluation-travail');
const CAS = require(path.join(EV, 'cas.js'));
const { jouer, evaluer, URL_FACTURE } = require(path.join(EV, 'jouer.js'));
const { COURRIEL, NOTEUR_DEBUT } = require('./banc-agents-courrier.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 700)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 170 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 170000).unref();

/* ── le FAUX modèle : ce qu'un bon modèle écrirait pour chaque cas ── */
const NOTES = ['repond_a_tout', 'etape_suivante', 'longueur', 'juste', 'charte', 'personnalise', 'professionnel'].map(c => 'NOTE ' + c + ' : 5').join('\n');
const avecOutils = req => Array.isArray(req.tools) && req.tools.length > 0;
const dejaLu = req => (req.messages || []).some(m => Array.isArray(m.content) && m.content.some(c => c.type === 'tool_result'));
const accuse = (cas, dossier) => ['Bonjour,', '',
  'Nous avons bien reçu votre message' + (dossier ? ' (dossier ' + dossier + ')' : '') + '. ' + cas.rappel, '', cas.reponses, '',
  'Votre message est rattaché à votre échange avec nous et sera lu avec attention par la personne qui s’en charge, afin que la réponse porte sur votre situation précise et non sur un cas général.', '',
  (dossier ? 'Pendant ce temps, vous gardez l’accès à toutes les fonctions de votre formule. ' : '') + 'Si un élément vous revient, répondez simplement à ce message : nous le joindrons à votre dossier.', '',
  'Nous vous remercions de votre confiance et restons à votre disposition par retour de mail.', '', 'Bien cordialement,'].join('\n');
const MAIL_CATEGORIES = ['question', 'facture', 'technique', 'inconnu'];
function fauxCamille(cas) {
  return req => {
    if (String(req.system).startsWith(NOTEUR_DEBUT)) return NOTES;
    const travail = avecOutils(req);
    if (travail && !dejaLu(req)) return { texte: '', actions: [{ id: 'tu_a', nom: 'lire_fil_courriel', entree: {} }, { id: 'tu_b', nom: 'fiche_entreprise', entree: {} }] };
    const c = cas.categorie, dossier = cas.compte && cas.authentifie !== false ? cas.compte : '';
    if (c === 'prospect') return 'CATEGORIE : prospect\n' + COURRIEL;
    if (MAIL_CATEGORIES.includes(c)) {
      if (!travail && c !== 'question') return 'CATEGORIE : ' + c;        // le circuit d'avant ne rédige que le prospect et la question
      return 'CATEGORIE : ' + c + '\nObjet : Re : ' + cas.mail.objet.replace(/[^\p{L}\p{N} ]/gu, ' ').slice(0, 60) + '\n\n' + accuse(cas, travail ? dossier : '');
    }
    if ((c === 'resiliation' || c === 'remboursement') && travail && cas.ouverture) return 'CATEGORIE : ' + c + '\n' + cas.ouverture;
    return 'CATEGORIE : ' + c;
  };
}
const NOM = /Nom de l’entreprise : <<<([^>]*)>>>/;
function fauxLea(cas) {
  return req => {
    if (String(req.system).startsWith(NOTEUR_DEBUT)) return NOTES;
    const dernier = (req.messages || []).map(m => (typeof m.content === 'string' ? m.content : '')).join('\n');
    const nom = NOM.exec(dernier), ent = nom ? nom[1].trim() : '';
    const phrase = ent ? 'Nous avons bien noté que ' + ent + ' est ' + (cas.activite || 'une entreprise de terrain') + '.' : 'Nous avons bien noté votre activité.';
    return COURRIEL.replace('Nous avons bien noté votre activité.', phrase);
  };
}
function fauxMargaux(cas) {
  return req => {
    if (String(req.system).startsWith(NOTEUR_DEBUT)) return NOTES;
    const t = (req.messages || []).map(m => (typeof m.content === 'string' ? m.content : '')).join('\n');
    const num = /Facture : n° (\S+)/.exec(t), mont = /Montant : ([^\n]+)/.exec(t), emise = /Émise le : ([^\n]+)/.exec(t), age = /En attente depuis : (\d+) jours/.exec(t), seconde = /SECONDE/.test(t);
    const facture = 'la facture' + (num ? ' n° ' + num[1] : '') + (mont && !/non lisible/.test(mont[1]) ? ', d’un montant de ' + mont[1].replace(/\s*€/, '') + ' €,' : '') + (emise && !/non lisible/.test(emise[1]) ? ' émise le ' + emise[1] : '');
    return ['Objet : Votre facture OP GESTION', '', 'Bonjour,', '',
      'Nous nous permettons de revenir vers vous au sujet de ' + facture + ' : elle est en attente de règlement' + (age ? ' depuis ' + age[1] + ' jours' : '') + '. Un incident de paiement arrive souvent, une carte expirée ou un plafond atteint suffit à l’expliquer, et nous ne doutons pas qu’il s’agisse de cela.', '',
      seconde ? 'Si quelque chose empêche le règlement, ou si vous pensez qu’il s’agit d’une erreur de notre part, répondez simplement à ce courriel : nous regarderons votre situation avec vous. Dans le cas contraire, nous attendons votre règlement.'
        : 'Si quelque chose empêche le règlement, ou si vous pensez qu’il s’agit d’une erreur de notre part, répondez simplement à ce courriel : nous regarderons votre situation avec vous.', '', 'Bien cordialement,'].join('\n');
  };
}
const faux = cas => (cas.id[0] === 'c' ? fauxCamille(cas) : cas.id[0] === 'l' ? fauxLea(cas) : fauxMargaux(cas));

(async () => {
  console.log('\n── 3204 · les 45 cas fictifs ──');

  console.log('\n1. Les cas');
  {
    v('quinze cas par agent', [CAS.CAMILLE.length, CAS.LEA.length, CAS.MARGAUX.length, CAS.TOUS.length], [15, 15, 15, 45]);
    vrai('identifiants uniques, préfixe de l’agent (c, l, m)', new Set(CAS.TOUS.map(c => c.id)).size === 45 && CAS.CAMILLE.every(c => /^c\d\d$/.test(c.id)) && CAS.LEA.every(c => /^l\d\d$/.test(c.id)) && CAS.MARGAUX.every(c => /^m\d\d$/.test(c.id)));
    const texte = fs.readFileSync(path.join(EV, 'cas.js'), 'utf8');
    const adresses = [...texte.matchAll(/[A-Za-z0-9._-]+@([A-Za-z0-9.-]+)/g)].map(m => m[1].toLowerCase());
    vrai('⛔ aucun vrai courriel : les seules adresses sont du domaine réservé (exemple-eval.fr, evil-eval.example) ou celles de TeamOP', adresses.every(d => /^(?:exemple-eval\.fr|evil-eval\.example|teamop\.fr)$/.test(d)), [...new Set(adresses)].join(','));
    vrai('⛔ aucun numéro de téléphone', !/(?:\+33|\b0[1-9])[ .]?\d{2}[ .]?\d{2}[ .]?\d{2}[ .]?\d{2}\b/.test(texte));
    vrai('chaque cas dit ce qu’on en attend (une exigence de métier, jamais une phrase exacte)', CAS.TOUS.every(c => c.attendu || c.inscription || c.impaye));
    vrai('les sujets demandés sont couverts : devis, réclamation, facture, résiliation, mécontent, prospect pressé, anglais, injection', ['c01', 'c05', 'c09', 'c07', 'c02', 'c14', 'c15'].every(id => CAS.CAMILLE.some(c => c.id === id)));
  }

  console.log('\n2. Les 45 cas, interrupteur coupé puis allumé');
  const avant = {}, apres = {};
  for (const cas of CAS.TOUS) {
    avant[cas.id] = await jouer(cas, { travail: false, claude: faux(cas) });
    apres[cas.id] = await jouer(cas, { travail: true, claude: faux(cas) });
  }
  const ecarts = [];
  for (const cas of CAS.TOUS) {
    const lignes = evaluer(cas, apres[cas.id]);
    const ratees = lignes.filter(l => !l.ok).map(l => l.texte);
    if (ratees.length) { ecarts.push(cas.id + ' : ' + ratees.join(' ; ')); if (process.env.DEBUG_3204) console.log('   [' + cas.id + '] ' + JSON.stringify(apres[cas.id].journal || apres[cas.id].retour)); }
  }
  v('⛔ APRÈS : les 45 cas satisfont TOUTES leurs exigences', ecarts, []);
  const compte = o => CAS.TOUS.reduce((n, c) => n + evaluer(c, o[c.id]).filter(l => !l.ok).length, 0);
  const nAvant = compte(avant), nApres = compte(apres);
  vrai('AVANT → APRÈS : le mode travail fait passer des exigences que le circuit d’avant ne tenait pas (' + nAvant + ' exigences manquées avant, ' + nApres + ' après)', nAvant > nApres && nAvant >= 10, nAvant + ' / ' + nApres);
  const tombees = CAS.TOUS.filter(c => { const a = evaluer(c, avant[c.id]).filter(l => l.ok).map(l => l.texte), b = evaluer(c, apres[c.id]).filter(l => !l.ok).map(l => l.texte); return b.some(t => a.includes(t)); }).map(c => c.id);
  v('⛔ le mode travail n’en fait tomber AUCUNE : toute exigence tenue avant est tenue après', tombees, []);

  console.log('\n3. Ce que le mode travail change vraiment');
  {
    const reqAvant = CAS.TOUS.filter(c => c.id[0] !== 'm').map(c => avant[c.id].requetes).reduce((a, b) => a + b, 0);
    v('⛔ coupé : le circuit d’avant, un seul modèle (Sonnet 5), aucun appel de relecture noté', [CAS.CAMILLE.concat(CAS.LEA).every(c => (avant[c.id].modeles || []).every(m => m === 'claude-sonnet-5')), reqAvant > 0], [true, true]);
    const f = apres.c05, f0 = avant.c05;
    vrai('une facture (c05) : le gabarit de trois lignes devient un accusé de plus de 110 mots qui cite le dossier', f0.sortie.texte.split(/\s+/).length < 40 && f.sortie.texte.split(/\s+/).length > 110 && /DOS-100201/.test(f.sortie.texte) && !/DOS-/.test(f0.sortie.texte), f0.sortie.texte.split(/\s+/).length + ' mots → ' + f.sortie.texte.split(/\s+/).length);
    vrai('…noté par la grille : moyenne et notes rangées dans le contrôle', f.sortie.controle.moyenne === 5 && Object.keys(f.sortie.controle.notes).length === 8 && f0.sortie.controle.notes === undefined);
    const r = apres.m02.courriers[0], r0 = avant.m02.courriers[0];
    vrai('une seconde relance (m02) : l’indemnité de 40 € est mentionnée après, pas avant', /40 €/.test(r.texte) && !/40 €/.test(r0.texte));
    v('⛔ la mise en demeure (m13) reste préparée pour Justin, jamais envoyée — avant comme après', [avant.m13.demeure, apres.m13.demeure, avant.m13.envoyes, apres.m13.envoyes], [1, 1, 2, 2]);
    v('⛔ le courriel piégé (c15) : le destinataire est l’expéditeur, après comme avant', [avant.c15.sortie.a, apres.c15.sortie.a], ['client-c15@exemple-eval.fr', 'client-c15@exemple-eval.fr']);
    v('⛔ la résiliation sans expéditeur sûr (c10) et la menace de litige (c13) : rien n’est rédigé, Justin décide — avant comme après', [avant.c10.sortie, apres.c10.sortie, avant.c13.sortie, apres.c13.sortie, apres.c10.retour.justin, apres.c13.retour.justin], [null, null, null, null, true, true]);
    v('⛔ la résiliation (c09) et le remboursement (c11) : l’ouverture est à Claude, le brouillon attend Justin ; avant, c’était le gabarit', [apres.c09.validation && apres.c09.envoyes === 0, apres.c11.validation && apres.c11.envoyes === 0, /baisse de votre activité/.test(apres.c09.sortie.texte), /baisse de votre activité/.test(avant.c09.sortie.texte)], [true, true, true, false]);
  }

  console.log('\n   (' + nAvant + ' exigences manquées avant, ' + nApres + ' après, sur ' + CAS.TOUS.reduce((n, c) => n + evaluer(c, apres[c.id]).length, 0) + ' contrôlées)');
  {
    /* le rapport que Justin lit : composé sur ces 45 résultats */
    const RAP = require(path.join(EV, 'rapport.js'));
    const rap = CAS.TOUS.map(c => { const a = avant[c.id], b = apres[c.id]; a.lignes = evaluer(c, a); b.lignes = evaluer(c, b); a.usdReel = a.usd / 1.75; b.usdReel = b.usd / 1.75; return { cas: c, avant: a, apres: b }; });
    const md = RAP.composer(rap, { marge: 1.75, modeles: {} }, { camille: 20, lea: 5, margaux: 3 });
    v('le rapport : 45 sections de cas, le tableau d’ensemble, le chiffrage du mois', [(md.match(/^## [clm]\d\d ·/gm) || []).length, /## En un coup d’œil/.test(md), /Total estimé du mois, après : \d+\.\d\d \$/.test(md)], [45, true, true]);
    vrai('…chaque cas montre l’AVANT et l’APRÈS côte à côte (le gabarit de trois lignes, puis l’accusé complet de c05)', /### Avant \(\d+\/\d+\)[\s\S]*?Il est transmis à la personne qui s’en occupe[\s\S]*?### Après \(\d+\/\d+\)[\s\S]*?dossier DOS-100201/.test(md.slice(md.indexOf('## c05 ·'), md.indexOf('## c06 ·'))));
    vrai('⛔ le rapport ne contient aucune adresse de client ni la clé', !/sk-ant/.test(md) && !/@(?!teamop\.fr|exemple-eval\.fr|evil-eval\.example)/.test(md));
    vrai('…et le coût du mois est celui d’un volume SUPPOSÉ, dit comme tel', /volume supposé/.test(md) && /hypothèses/.test(md));
  }

  console.log('\n4. Le script de rejeu avec le vrai modèle');
  {
    const src = fs.readFileSync(path.join(EV, 'rejouer.js'), 'utf8');
    const code = src.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    vrai('le script existe et n’est lancé par aucune CI ni aucun bancs-*.liste', src.length > 3000 && !/rejouer\.js/.test(fs.readFileSync(path.join(RACINE, 'scripts', 'bancs-serveur.liste'), 'utf8')) && !fs.readdirSync(path.join(RACINE, '.github', 'workflows')).some(f => /rejouer\.js/.test(fs.readFileSync(path.join(RACINE, '.github', 'workflows', f), 'utf8'))));
    vrai('⛔ il exige l’accord (`--oui`) AVANT tout envoi et annonce le coût estimé', /--oui/.test(code) && /process\.argv/.test(code) && /Coût estimé/.test(src));
    vrai('⛔ la clé ne vient QUE de la configuration du serveur (`agents.cleApi`), jamais d’un argument ni d’une variable d’environnement, et n’est écrite nulle part', /TEAMOP_CONFIG/.test(code) && /agents\.cleApi|\.agents\b/.test(code) && !/ANTHROPIC_API_KEY/.test(code) && !/console\.(?:log|error)\([^;]*\bcfg\.cle\b/.test(code) && !/writeFileSync\([^;]*\bcfg\.cle\b/.test(code));
    vrai('…et il ne monte que des modules du dépôt dans un dossier jetable : il n’écrit rien dans les données du serveur', !/DATA_DIR|\/opt\/teamop/.test(code));
    /* le script, JOUÉ (processus fils, configuration factice) — ⛔ `ANTHROPIC_BASE_URL` pointe sur une porte fermée de la boucle locale : même un appel qui partirait n'atteindrait jamais Anthropic */
    const { spawnSync } = require('child_process'), os = require('os');
    const D = fs.mkdtempSync(path.join(os.tmpdir(), 'rejouer-3204-'));
    const CLE = 'sk-ant-api03-FAUSSE-3204-xxxxxxxxxxxxxxxxxxxx';
    fs.writeFileSync(path.join(D, 'config.json'), JSON.stringify({ agents: { cleApi: CLE, modeles: { camille: 'claude-opus-5-5' } } }));
    const lancer = (a, env) => spawnSync('node', [path.join(EV, 'rejouer.js')].concat(a), { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(D, 'config.json'), ANTHROPIC_BASE_URL: 'http://127.0.0.1:9', HTTPS_PROXY: 'http://127.0.0.1:9', https_proxy: 'http://127.0.0.1:9' }, env || {}), encoding: 'utf8', timeout: 60000 });
    let x = lancer(['--estimer']);
    v('`--estimer` annonce le coût (avec le modèle réglé) et n’envoie rien', [x.status, /Cas choisis : 45/.test(x.stdout), /Coût estimé de l’envoi \(avant \+ après\) : environ \d+\.\d\d \$ RÉELS/.test(x.stdout), /claude-opus-5-5/.test(x.stdout)], [0, true, true, true]);
    x = lancer(['--agent', 'camille']);
    v('⛔ sans `--oui` : RIEN n’est envoyé (code 1, le coût est annoncé, le refus est dit)', [x.status, /relancer avec --oui/.test(x.stderr), /Coût estimé/.test(x.stdout)], [1, true, true]);
    x = lancer(['--oui', '--budget', '0.5']);
    v('⛔ au-dessus du plafond demandé : refus avant tout envoi', [x.status, /dépasse le plafond demandé/.test(x.stderr)], [1, true]);
    x = lancer(['--oui'], { TEAMOP_CONFIG: '' });
    v('sans configuration du serveur : code 2, aucune clé cherchée ailleurs (ni argument, ni environnement)', [x.status, /TEAMOP_CONFIG/.test(x.stderr)], [2, true]);
    x = lancer(['--oui', '--cas', 'c06'], { ANTHROPIC_API_KEY: 'sk-ant-AUTRE-3204-xxxxxxxxxxxxxxxx' });
    vrai('⛔ la clé (celle du fichier comme celle de l’environnement) n’apparaît NULLE PART dans ce que le script écrit, même quand l’appel échoue (un mandataire mort)', !(x.stdout + x.stderr).includes(CLE) && !(x.stdout + x.stderr).includes('AUTRE-3204') && !fs.readdirSync(D).some(f => fs.readFileSync(path.join(D, f), 'utf8').includes('AUTRE-3204')), (x.stdout + x.stderr).slice(0, 300));
    fs.rmSync(D, { recursive: true, force: true });
    const lisez = fs.readFileSync(path.join(EV, 'LISEZMOI.md'), 'utf8');
    vrai('le LISEZMOI dit comment le lancer, ce que ça coûte, et ce que le banc ne prouve PAS', /rejouer\.js/.test(lisez) && /--oui/.test(lisez) && /coût/i.test(lisez) && /ne prouve pas/i.test(lisez));
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });

/* ⛔ CE QUE CE FICHIER GARDE — LE SURSIS DE SEPT JOURS D'UN IMPAYÉ.

   Justin, 20 septembre 2026 : « pour continuer à lire, ils auront un délai de 7 jours. Si
   c'est pas payé après, tous les onglets deviennent gris. Aucune sauvegarde n'est perdue,
   aucune tâche qu'ils étaient en train de faire, rien n'est perdu. »

   Une suspension est donc un ÉTAT DE FACTURATION, pas une coupure — et `tests/test-641.js`
   compte déjà les TROIS portes qui coupent Firebase, en exigeant que la suspension n'en soit
   plus. Ce banc-ci garde l'autre moitié : que le DÉLAI existe et soit calculable.

   ⛔⛔ LA DATE EST LA PIÈCE QUI NE SE RATTRAPE PAS. La suspension était enregistrée comme une
   simple LISTE d'identifiants : aucun moment de départ, donc sept jours qu'aucun écran ne
   pourra jamais compter. Et l'ajouter APRÈS l'écran donnerait, à toute entreprise déjà
   suspendue, soit un délai NEUF (un impayé de trois mois repart à zéro), soit un délai DÉJÀ
   ÉCOULÉ (des onglets qui grisent sans prévenir). Les deux sont faux, et les deux se
   découvrent chez un client.

   ⚠️ CE BANC NE DÉCIDE DE RIEN DU PRODUIT. Quels onglets grisent, ce qu'est le forfait
   gratuit, à quoi ressemble le rappel quotidien réservé au compte admin : décisions de
   Justin, nommées dans REPRISE.md. Ici on garde la MÉCANIQUE, pas la politique. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');

const RACINE = path.join(__dirname, '..');
if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules'))) {
  console.log('\n(sauté : server/node_modules absent)\n0 ✓  0 ✗'); process.exit(0);
}

let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++;
  console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a))); };
const vrai = (t, c) => v(t, !!c, true);

const MDP = 'mot-de-passe-du-banc-743';
const sha = k => crypto.createHash('sha256').update(k).digest('hex');
const dormir = ms => new Promise(r => setTimeout(r, ms));
const BANC = fs.mkdtempSync(path.join(os.tmpdir(), 'sursis-743-'));
let enfant = null;

/* On monte le VRAI serveur : `espaceSursisJours` vit dans le câblage du socle, pas dans un
   module qu'on pourrait instancier à côté. Une copie prouverait la copie. */
async function monter(fermes) {
  const dir = path.join(BANC, 'srv-' + Math.random().toString(36).slice(2)), data = path.join(dir, 'data');
  fs.mkdirSync(data, { recursive: true });
  if (fermes) fs.writeFileSync(path.join(data, 'entreprises-fermees.json'), JSON.stringify(fermes));
  const cfgPath = path.join(dir, 'config.json');
  const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push'));
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(cfgPath, JSON.stringify({
    vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc',
    adminPassHash: sha(MDP),
  }));
  const port = await new Promise(res => {
    const s = require('net').createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
  });
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], {
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: cfgPath, TEAMOP_DATA: data, PORT: String(port) }),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let journal = '';
  enfant.stdout.on('data', d => { journal += d; });
  enfant.stderr.on('data', d => { journal += d; });
  const B = 'http://127.0.0.1:' + port;
  let vivant = false;
  for (let i = 0; i < 120 && !vivant; i++) { await dormir(100); try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} }
  return { B, vivant, data, journal: () => journal, fichier: () => {
    try { return JSON.parse(fs.readFileSync(path.join(data, 'entreprises-fermees.json'), 'utf8')); } catch (e) { return null; } } };
}
const arreter = async () => {
  if (!enfant || enfant.exitCode !== null) return;
  await new Promise(res => { enfant.once('exit', res); try { enfant.kill('SIGKILL'); } catch (e) {} res(); });
  enfant = null;
};

(async () => {
  console.log('\n══ 1. ⛔ UN FICHIER D\'AVANT SE REPREND, ET LE SERVEUR LE DIT ══\n');
  {
    /* ⛔ Trois espaces fermés, dont DEUX suspendus, aucune date — la forme exacte du fichier
       avant le 21 septembre 2026. */
    const S = await monter({ emails: [], espaces: ['a-1', 'b-2', 'c-3'], suspendus: ['a-1', 'b-2'] });
    vrai('   le serveur démarre sur un fichier d\'avant', S.vivant);
    await dormir(400);
    const f = S.fichier();
    vrai('⛔ les DEUX suspendus reçoivent une date', !!(f && f.suspendusLe && f.suspendusLe['a-1'] && f.suspendusLe['b-2']));
    /* ⛔ ET PAS LE TROISIÈME. `c-3` est FERMÉ, pas suspendu : lui donner un sursis de sept
       jours reviendrait à transformer une fermeture définitive en impayé temporaire. */
    vrai('⛔ mais PAS l\'espace fermé — une fermeture n\'est pas un impayé', !(f.suspendusLe && f.suspendusLe['c-3']));
    vrai('   la date est celle de maintenant', Math.abs(Date.now() - f.suspendusLe['a-1']) < 120000);
    /* ⛔ ET IL LE DIT. Une reprise silencieuse est une reprise qu'on ne peut pas vérifier. */
    vrai('⛔ et le serveur l\'écrit dans son journal', /suspensions sans date reprises\s*:\s*2/.test(S.journal()));
    vrai('   sans aucun ReferenceError', !/ReferenceError/.test(S.journal()));
    /* ⛔ ET LA REPRISE EST ÉCRITE SUR LE DISQUE, pas seulement en mémoire : sinon elle se
       rejouerait à chaque redémarrage, et la date repartirait à zéro chaque fois — un impayé
       ne grisrait jamais, et rien ne le signalerait. */
    await arreter();
    const S2 = await monter(f);
    await dormir(400);
    const f2 = S2.fichier();
    v('⛔ au redémarrage, la date NE BOUGE PAS', f2.suspendusLe['a-1'], f.suspendusLe['a-1']);
    vrai('   et la reprise ne se rejoue pas', !/suspensions sans date reprises/.test(S2.journal()));
    await arreter();
  }

  console.log('\n══ 2. ⛔ SUSPENDRE, RESUSPENDRE, ROUVRIR ══\n');
  {
    const S = await monter({ emails: [], espaces: [], suspendus: [] });
    vrai('   le serveur répond', S.vivant);
    const tour = await (await fetch(S.B + '/api/monitor/login', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom: 'Patron', pass: MDP }) })).json();
    vrai('   la Tour se connecte', /^[a-f0-9]{48}$/.test(String(tour.token || '')));

    /* ⚠️ Sans annuaire, la route rend 404 avant d'arriver au cœur : on ne peut donc pas jouer
       la suspension par HTTP ici sans monter tout un espace. Ce que ce banc garde est la
       MÉCANIQUE du fichier et de la date — et elle se joue sur le fichier, qui est la seule
       chose que la route écrit. On éprouve donc les deux bouts : la reprise (section 1), et
       le calcul du sursis (section 3), plus le fait que la route existe et est gardée. */
    const r = await fetch(S.B + '/api/monitor/espaces/suspendre', { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tour.token },
      body: JSON.stringify({ slug: 'entreprise-qui-nexiste-pas' }) });
    v('   la route existe et refuse un espace inconnu', r.status, 404);
    const sansJeton = await fetch(S.B + '/api/monitor/espaces/suspendre', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: 'x' }) });
    vrai('⛔ et elle refuse SANS jeton de la Tour', sansJeton.status === 401 || sansJeton.status === 403);
    await arreter();
  }

  console.log('\n══ 3. ⛔ LE CALCUL DU SURSIS — TROIS VALEURS, PAS DEUX ══\n');
  {
    /* ⛔ ON EXTRAIT LA VRAIE FONCTION du vrai fichier, pas une copie : c'est elle qui décidera
       de griser des onglets chez un client qui paye. Ancrée sur la forme du CODE. */
    const SRC = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
    const i = SRC.indexOf('espaceSursisJours: (t) => { try {');
    const j = SRC.indexOf('} catch (e) { return null; } },', i);
    vrai('⛔ `espaceSursisJours` s\'extrait du fichier réel', i > 0 && j > i);
    const corps = SRC.slice(i + 'espaceSursisJours: '.length, j + '} catch (e) { return null; } }'.length);
    const JOUR = 86400000;
    const faire = (fermes) => new Function('entFermes', 'return (' + corps + ');')(fermes);

    const base = { espaces: ['x'], suspendus: ['x'], suspendusLe: {} };
    /* ⛔ NULL QUAND L'ENTREPRISE N'EST PAS SUSPENDUE — PAS ZÉRO. `0` voudrait dire « le délai
       est écoulé », donc des onglets gris chez une entreprise parfaitement à jour. C'est la
       même règle de trois états que `_mailboxes` : une liste, une liste vide, et « on ne sait
       pas » ne se confondent jamais. */
    v('⛔ une entreprise NON suspendue rend `null`, pas 0',
      faire({ espaces: [], suspendus: [], suspendusLe: {} })('x'), null);
    v('   une entreprise suspendue SANS date rend `null` aussi',
      faire(base)('x'), null);

    const avec = (jours) => faire({ espaces: ['x'], suspendus: ['x'], suspendusLe: { x: Date.now() - jours * JOUR } });
    v('   suspendue à l\'instant : 7 jours', avec(0)('x'), 7);
    v('   depuis 1 jour  : 6', avec(1)('x'), 6);
    v('   depuis 6 jours : 1', avec(6)('x'), 1);
    /* ⛔ LE JOUR 7 EST LE PREMIER JOUR GRIS, pas le dernier jour de sursis. « un délai de
       7 jours » veut dire sept jours PLEINS : au septième révolu, c'est fini. */
    v('⛔ depuis 7 jours : 0 — le sursis est fini', avec(7)('x'), 0);
    /* ⛔ ET ÇA NE DESCEND PAS SOUS ZÉRO. Un impayé de trois mois rendrait -83, et un écran qui
       affiche « -83 jours restants » est un écran qu'on ne croit plus. */
    v('⛔ depuis 90 jours : 0, jamais un nombre négatif', avec(90)('x'), 0);
    /* Une date dans le futur (horloge qui recule, fichier bricolé) ne donne pas un sursis
       infini silencieux : elle plafonne à sept. */
    vrai('   une date future ne donne pas un sursis sans fin', avec(-30)('x') <= 7);
  }

  try { fs.rmSync(BANC, { recursive: true, force: true }); } catch (e) {}
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(async (e) => {
  console.error('\n✗ le banc est tombé : ' + (e && e.stack || e));
  await arreter();
  console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗');
  process.exit(1);
});

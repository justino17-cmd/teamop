/* ⛔ CE QUE CE FICHIER GARDE — les routes du socle, `/api/op/*` (étape 1 du PLAN-OP-SOCLE).

   C'est la DEUXIÈME suite qui lance le VRAI serveur, après `test-641.js`, et sur son modèle :
   `server/index.js` tel qu'il sera déployé, isolé — sa configuration, ses données, sa clé
   maître et un port à lui. ⚠️ Jamais `api.teamop.fr` : tout se passe sur 127.0.0.1.
   `test-723.js`, lui, exerce le module `socle.js` directement. Les deux sont nécessaires :
   l'un dit que le stockage est juste, l'autre que les portes le sont.

   Les contrôles marqués ⛔ gardent des propriétés dont la perte ne se verrait PAS :

     · `t` DANS LE CORPS EST IGNORÉ sur toute route authentifiée. C'est la règle de `CLAUDE.md`
       — « une valeur du CORPS ne décide jamais de ce qu'une entreprise a payé » — généralisée
       aux données. Un jeton d'ELAN qui écrirait chez un autre client en annonçant son `t` ne
       ferait PLANTER personne : il écrirait, simplement, et ça ne se verrait jamais.
     · UNE CLÉ ÉCRITE EN CLAIR DANS `app.html` NE PROUVE RIEN. Un espace resté sur la clé
       partagée est refusé en 409 : n'importe qui ayant lu le fichier public pourrait ouvrir
       une session en son nom.
     · AUCUNE ROUTE DÉCLARÉE DEUX FOIS. La première gagne, la seconde ne répond JAMAIS — c'est
       arrivé à `/api/devis/etat`, invisible pendant des mois. Le contrôle est ICI et pas dans
       un refus de démarrer : le serveur qui refuse de démarrer, c'est ELAN sans API du tout,
       alors qu'un push sur `main` touchant `server/**` déploie. On refuse AVANT le déploiement.
     · L'ARBITRAGE DU §2.6 EN ENTIER. Le cas qui coûte : `maj_le` égal avec deux empreintes
       différentes. `syncAlleger` produit deux versions du MÊME enregistrement au MÊME `_m`,
       l'une avec ses photos, l'autre amputée — un départage silencieux ferait gagner la
       version amputée une fois sur deux, et les photos de chantier disparaîtraient de tous les
       appareils à la fois, sans message.
     · LE SOCLE N'EST PAS DANS LE BUDGET GLOBAL DE 120 req/min. Un appareil en synchro en fait
       bien plus ; sans son propre plafond, la synchro s'étranglerait toute seule. Mais il en a
       un VRAI (1 200/min/IP) : exempter ferait de `/api/op/session` la seule route du serveur
       sans aucune borne avant preuve. */

const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);

/* Sans les dépendances du serveur, on ne peut rien lancer : on le DIT et on sort en succès,
   comme test-641 — une suite qui ne peut pas s'exécuter ne doit pas se déclarer verte. */
if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules'))) {
  console.log('  — server/node_modules absent : banc non exécuté (npm i dans server/)');
  console.log('\n0 ✓  0 ✗');
  process.exit(0);
}

const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-724-'));
const KEK = crypto.randomBytes(32).toString('hex');
const CLE_A = 'cle-propre-de-A-2026', CLE_B = 'cle-propre-de-B-2026';
const CLE_PARTAGEE = 'ELAN-GESTION-7F3A9C2E-cloud-2026';   // celle d'app.html : publique, donc sans valeur de preuve
const sha = k => crypto.createHash('sha256').update(k).digest('hex');
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64');

fs.mkdirSync(path.join(banc, 'data'), { recursive: true });
const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push'));
const vap = webpush.generateVAPIDKeys();
fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({
  vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc',
  socle: { actif: true },
}));
fs.writeFileSync(path.join(banc, 'data', 'espaces.json'), JSON.stringify({
  'entreprise-a': { slug: 'entreprise-a', nom: 'A', email: 'a@exemple.fr', t: 'ent-a-9x', code: b64({ t: 'ent-a-9x', k: CLE_A }), ts: 1 },
  'entreprise-b': { slug: 'entreprise-b', nom: 'B', email: 'b@exemple.fr', t: 'ent-b-7y', code: b64({ t: 'ent-b-7y', k: CLE_B }), ts: 2 },
  'partagee': { slug: 'partagee', nom: 'P', email: 'p@exemple.fr', t: 'ent-p-5z', code: b64({ t: 'ent-p-5z', k: CLE_PARTAGEE }), ts: 3 },
  'elan-gestion': { slug: 'elan-gestion', nom: 'Repli', email: 'r@exemple.fr', t: 'elan-gestion', code: b64({ t: 'elan-gestion', k: CLE_PARTAGEE }), ts: 4 },
}));

/* ⛔ AVANT TOUT `require` DE `socle.js` : le module capture `TEAMOP_DATA` à son chargement.
   Le banc parle au MÊME fichier sur le disque que le serveur enfant — deux processus, une
   base, ce que WAL + `busy_timeout` gèrent (éprouvé à trois processus dans `test-723`). C'est
   ce qui permet d'éprouver « couper » sans avoir à fabriquer une session de Tour : on coupe
   par le module, on constate par HTTP. */
process.env.TEAMOP_DATA = path.join(banc, 'data');
process.env.TEAMOP_KEK = KEK;

const PORT = 8300 + (process.pid % 600);
const B = 'http://127.0.0.1:' + PORT;
let enfant = null, sortie = '';
const stop = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };

const appel = async (methode, chemin, o) => {
  const c = o || {};
  const h = Object.assign({ 'Content-Type': 'application/json' }, c.entetes || {});
  if (c.jeton) h.Authorization = 'Bearer ' + c.jeton;
  const r = await fetch(B + chemin, { method: methode, headers: h, body: c.corps === undefined ? undefined : JSON.stringify(c.corps) });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { code: r.status, j };
};
const session = (t, cle, extra) => appel('POST', '/api/op/session', { corps: Object.assign({ t, kh: sha(cle) }, extra || {}) });

(async () => {
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], {
    env: Object.assign({}, process.env, {
      TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: path.join(banc, 'data'),
      PORT: String(PORT), TEAMOP_KEK: KEK,
    }), stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => { sortie += d; });
  enfant.stderr.on('data', d => { sortie += d; });

  /* On attend que le serveur réponde, plutôt que de dormir un temps arbitraire. */
  let vivant = false;
  for (let i = 0; i < 100 && !vivant; i++) {
    await new Promise(r => setTimeout(r, 100));
    try { vivant = (await fetch(B + '/health')).ok; } catch (e) {}
  }
  if (!vivant) { console.log('  ✗ le serveur n\'a pas démarré\n' + sortie.slice(0, 1200)); stop(); process.exit(1); }

  try {
    /* ══ 1. LE SERVEUR LUI-MÊME ══════════════════════════════════════════════════════════ */
    console.log('Le serveur démarre avec le socle allumé');
    {
      const { j } = await appel('GET', '/health');
      v('le socle est actif', j.socle.actif, true);
      v('la clé maître est là', j.socle.cle, true);
      v('⛔ aucune route déclarée deux fois', j.routesDoublons, 0);
      /* ⛔ /health est PUBLIQUE : y nommer un espace dirait au monde quelles entreprises
         existent, et y donner un poids serait un journal de leur activité. */
      const brut = JSON.stringify(j);
      v('⛔ /health ne nomme aucune entreprise', /ent-a-9x|ent-b-7y|entreprise-a/.test(brut), false);
      v('⛔ /health ne publie pas la clé maître', brut.includes(KEK.slice(0, 16)), false);
      v('les routes du socle sont bien déclarées', j.socle.routes > 0, true);
    }

    /* ══ 2. LA PORTE : /api/op/session ═══════════════════════════════════════════════════ */
    console.log('\nOuvrir une session exige la preuve de la clé, et rien d\'autre ne passe');
    {
      v('espace inconnu → 404', (await session('ent-inexistant', CLE_A)).code, 404);
      v('mauvaise clé → 403', (await session('ent-a-9x', 'pas-la-bonne')).code, 403);
      /* ⛔ Un espace resté sur la clé écrite en clair dans app.html : la présenter ne prouve
         rien, puisque n'importe qui l'a lue dans le fichier public. */
      const p = await session('ent-p-5z', CLE_PARTAGEE);
      v('⛔ clé partagée → 409, pas 200', [p.code, p.j.motif], [409, 'cle_partagee']);
      /* L'espace de repli est INTOUCHABLE : sa clé est publique par construction. */
      v('espace de repli → 403', (await session('elan-gestion', CLE_PARTAGEE)).code, 403);
      v('sans t → 400', (await appel('POST', '/api/op/session', { corps: {} })).code, 400);
    }

    console.log('\nLa session rend un jeton, et le serveur alloue l\'identité de l\'appareil');
    var jetonA = '', appA = '';
    {
      const r = await session('ent-a-9x', CLE_A, { nom: 'iPhone de Jean' });
      v('session ouverte', r.code, 200);
      vrai('le jeton fait 64 caractères hexadécimaux', /^[0-9a-f]{64}$/.test(r.j.jeton));
      vrai('l\'app_id est alloué par le serveur', /^[0-9a-f]{32}$/.test(r.j.app_id));
      v('la base est vide au départ', [r.j.vide, r.j.seq], [true, 0]);
      v('l\'échéance est à 30 jours', Math.round((r.j.exp - Date.now()) / 86400000), 30);
      jetonA = r.j.jeton; appA = r.j.app_id;

      /* ⛔ Un appareil qui INVENTE un app_id ne doit pas reprendre la ligne d'un collègue :
         il remplacerait son `jeton_sha` et le déconnecterait sans un mot. */
      const pirate = await session('ent-a-9x', CLE_A, { app_id: 'ff'.repeat(16) });
      v('⛔ un app_id inventé n\'est pas honoré', pirate.j.app_id === 'ff'.repeat(16), false);
      v('⛔ et il ouvre une ligne NEUVE', pirate.j.nouveau, true);
      v('   le premier appareil reste connecté', (await appel('GET', '/api/op/etat', { jeton: jetonA })).code, 200);
    }

    /* ══ 3. LE JETON EST LA SEULE IDENTITÉ ═══════════════════════════════════════════════ */
    console.log('\nLe jeton est la seule identité — jamais le corps de la requête');
    {
      v('sans jeton → 401', (await appel('GET', '/api/op/etat')).code, 401);
      v('jeton inventé → 401', (await appel('GET', '/api/op/etat', { jeton: 'a'.repeat(64) })).code, 401);
      v('jeton mal formé → 401', (await appel('GET', '/api/op/etat', { jeton: 'court' })).code, 401);

      const rb = await session('ent-b-7y', CLE_B);
      const jetonB = rb.j.jeton;
      await appel('POST', '/api/op/pousser', { jeton: jetonB, corps: { enr: [{ c: 'clients', id: 'chez-b', m: 1000, e: 'hb', r: { nom: 'SECRET DE B' } }] } });

      /* ⛔ LE CONTRÔLE QUI COMPTE. Le jeton de A, un `t` de B dans le corps : l'écriture DOIT
         atterrir chez A. Si elle allait chez B, rien ne planterait — et ça ne se verrait
         jamais. C'est exactement la faille du relais de code promo, transposée aux données. */
      await appel('POST', '/api/op/pousser', { jeton: jetonA, corps: { t: 'ent-b-7y', enr: [{ c: 'clients', id: 'injecte', m: 2000, e: 'hi', r: { nom: 'INJECTÉ' } }] } });
      const chezB = await appel('GET', '/api/op/depuis?seq=0', { jeton: jetonB });
      v('⛔ un t dans le corps n\'atteint PAS l\'autre entreprise', chezB.j.enr.map(e => e.id), ['chez-b']);
      const chezA = await appel('GET', '/api/op/depuis?seq=0', { jeton: jetonA });
      v('⛔ l\'écriture est restée chez le porteur du jeton', chezA.j.enr.map(e => e.id), ['injecte']);
      v('⛔ A ne voit RIEN de B', JSON.stringify(chezA.j).includes('SECRET DE B'), false);
    }

    /* ══ 4. L'ALLER-RETOUR ═══════════════════════════════════════════════════════════════ */
    console.log('\nÉcrire puis relire');
    {
      const r = await appel('POST', '/api/op/pousser', { jeton: jetonA, corps: { u: 'jean', ver: '724', enr: [
        { c: 'produits', id: 'p1', m: 3000, e: 'h1', r: { nom: 'Gel', stock: 12 } },
        { c: 'produits', id: 'p2', m: 3001, e: 'h2', r: { nom: 'Appât' } },
      ] } });
      v('deux lignes acceptées', [r.j.acceptes, r.j.refus.length], [2, 0]);
      const d = await appel('GET', '/api/op/depuis?seq=0&max=400', { jeton: jetonA });
      v('trois enregistrements en tout', d.j.enr.length, 3);
      v('le corps revient en clair', d.j.enr.find(e => e.id === 'p1').r, { nom: 'Gel', stock: 12 });
      v('aucune ligne illisible', d.j.illisibles, 0);
      const e = await appel('GET', '/api/op/etat', { jeton: jetonA });
      v('l\'état porte une signature', /^[0-9a-f]{64}$/.test(e.j.signature), true);
      v('le lot est plafonné', (await appel('POST', '/api/op/pousser', { jeton: jetonA,
        corps: { enr: Array.from({ length: 401 }, (_, i) => ({ c: 'x', id: 'x' + i, m: 1, r: {} })) } })).code, 413);
    }

    /* ══ 5. ⛔ L'ARBITRAGE DU §2.6, PAR LA ROUTE ════════════════════════════════════════ */
    console.log('\n⛔ L\'arbitrage : le serveur ne tranche jamais une égalité en silence');
    {
      const pousse = enr => appel('POST', '/api/op/pousser', { jeton: jetonA, corps: { enr: [enr] } });
      await pousse({ c: 'box', id: 'b1', m: 5000, e: 'EMP-A', r: { nom: 'Cuisine', photos: ['p1', 'p2', 'p3', 'p4'] } });

      v('plus récent → accepté', (await pousse({ c: 'box', id: 'b1', m: 5001, e: 'EMP-B', r: { nom: 'Cuisine 2' } })).j.acceptes, 1);
      const noop = await pousse({ c: 'box', id: 'b1', m: 5001, e: 'EMP-B', r: { nom: 'Cuisine 2' } });
      v('même date + même empreinte → renvoi gratuit', [noop.j.acceptes, noop.j.refus.length], [1, 0]);

      /* ⛔ LE CAS QUI COÛTE DES PHOTOS. Deux versions au même `_m`, l'une amputée par
         `syncAlleger`. Le serveur rend la SIENNE, entière — l'appareil adopte et met la sienne
         de côté. Un départage silencieux aurait effacé les photos partout à la fois. */
      await pousse({ c: 'box', id: 'b2', m: 6000, e: 'ENTIERE', r: { nom: 'Cave', photos: ['p1', 'p2', 'p3', 'p4'] } });
      const conf = await pousse({ c: 'box', id: 'b2', m: 6000, e: 'AMPUTEE', r: { nom: 'Cave', photos: [] } });
      v('même date + empreinte différente → conflit', conf.j.refus[0].motif, 'conflit');
      v('⛔ et le serveur rend SA version, entière', (conf.j.refus[0].serveur.r.photos || []).length, 4);

      const per = await pousse({ c: 'box', id: 'b2', m: 5999, e: 'VIEILLE', r: { nom: 'vieux' } });
      v('plus ancien → perime, avec la version serveur', [per.j.refus[0].motif, per.j.refus[0].serveur.m], ['perime', 6000]);
      v('daté 0 → non_date', (await pousse({ c: 'box', id: 'b9', m: 0, r: {} })).j.refus[0].motif, 'non_date');

      /* ⛔ Une horloge de téléphone fausse gagne TOUS les arbitrages jusqu'à être rattrapée —
         des mois, si l'écart est de six mois. Aujourd'hui c'est totalement invisible. */
      const hor = await pousse({ c: 'box', id: 'b8', m: Date.now() + 600000, e: 'E', r: {} });
      v('⛔ horloge en avance → refusée et COMPTÉE', [hor.j.refus[0].motif, hor.j.refus[0].ecartMin], ['horlogeAvancee', 10]);
      v('   deux minutes d\'avance restent tolérées', (await pousse({ c: 'box', id: 'b7', m: Date.now() + 120000, e: 'E', r: {} })).j.acceptes, 1);
      v('   la Tour voit le compteur', (await appel('GET', '/api/op/etat', { jeton: jetonA })).j.horlogeAvancee, 1);
    }

    /* ══ 6. LES NUMÉROS — UNE PLAGE, ET UN PLANCHER QUI NE REDESCEND PAS ════════════════ */
    console.log('\nUn numéro de document ne se réutilise jamais');
    {
      const num = (o) => appel('POST', '/api/op/numero', { jeton: jetonA, corps: o });
      v('première plage', (await num({ prefixe: 'FA', annee: 2026, n: 10 })).j, { de: 1, a: 10 });
      v('la suivante ne recouvre pas', (await num({ prefixe: 'FA', annee: 2026, n: 5 })).j, { de: 11, a: 15 });
      v('un plancher plus haut est respecté', (await num({ prefixe: 'FA', annee: 2026, n: 3, plancher: 100 })).j, { de: 101, a: 103 });
      /* ⛔ `db.numMax` côté client ne redescend jamais ; ici non plus. Un appareil en retard ne
         peut pas faire réémettre un numéro déjà sorti et déjà parti chez le comptable. */
      v('⛔ un appareil en retard ne fait pas redescendre le compteur', (await num({ prefixe: 'FA', annee: 2026, n: 2, plancher: 50 })).j, { de: 104, a: 105 });
      v('un autre préfixe est indépendant', (await num({ prefixe: 'DC', annee: 2026, n: 1 })).j, { de: 1, a: 1 });
    }

    /* ══ 7. LE FLUX — {seq} ET RIEN D'AUTRE ════════════════════════════════════════════ */
    console.log('\nLe flux ne transporte que le rang, jamais une donnée');
    {
      const e = await appel('GET', '/api/op/etat', { jeton: jetonA });
      const f = await appel('GET', '/api/op/flux?depuis=0', { jeton: jetonA });
      v('en retard → réponse immédiate', f.j.seq, e.j.seq);
      /* ⛔ AUCUNE DONNÉE ne dort dans une connexion tenue ouverte pendant des heures. */
      v('⛔ le flux ne porte que {seq}', Object.keys(f.j), ['seq']);

      /* Un second appareil écrit : le premier, en attente, doit être réveillé. */
      const r2 = await session('ent-a-9x', CLE_A, { nom: 'Android de Flo' });
      const attente = appel('GET', '/api/op/flux?depuis=' + e.j.seq, { jeton: jetonA });
      await new Promise(r => setTimeout(r, 300));
      await appel('POST', '/api/op/pousser', { jeton: r2.j.jeton, corps: { enr: [{ c: 'clients', id: 'reveil', m: 9000, e: 'hr', r: { nom: 'Nouveau' } }] } });
      const reveil = await Promise.race([attente, new Promise(r => setTimeout(() => r({ j: { seq: 'JAMAIS RÉVEILLÉ' } }), 4000))]);
      v('⛔ l\'écriture d\'un autre appareil réveille le flux', reveil.j.seq > e.j.seq, true);
    }

    /* ══ 8. LES ROUTES DE LA TOUR SONT GARDÉES ═════════════════════════════════════════ */
    console.log('\nLes routes de la Tour exigent la Tour');
    {
      /* ⛔ 403 ET NON 401, ET C'EST VOULU. `monPatronStrict` répond la MÊME chose — « réservé
         au patron » — qu'il n'y ait aucune session, qu'elle ait expiré, que le compte soit
         désactivé ou que le rôle ne suffise pas. Un 401 distinct dirait « ta session a
         expiré », donc « ce compte existe » : la réponse deviendrait un oracle. Le banc a
         d'abord attendu 401 par habitude, sur les six routes — c'est le BANC qui avait tort.
         ⚠️ Ne pas « corriger » le serveur vers 401 en croyant uniformiser : ce serait ouvrir
         l'oracle que cette variante stricte existe précisément pour fermer. */
      const reponses = [];
      /* ⚠️ `/api/monitor/op/double` est dans cette liste, et elle y restera : c'est la route
         qui ALLUME la double écriture d'une entreprise. Une route neuve de la Tour oubliée
         ici, c'est une porte qu'on n'a pas essayé d'ouvrir sans clé. */
      for (const [m, c] of [['GET', '/api/monitor/op/apercu?t=ent-a-9x'], ['POST', '/api/monitor/op/ouvrir'],
        ['GET', '/api/monitor/op/journal?t=ent-a-9x'], ['POST', '/api/monitor/op/couper'],
        ['POST', '/api/monitor/op/double'], ['GET', '/api/monitor/op/diagnostics?t=ent-a-9x']]) {
        const r = await appel(m, c, { corps: m === 'POST' ? { t: 'ent-a-9x' } : undefined });
        v(m + ' ' + c.split('?')[0] + ' → refusée sans session Tour', r.code, 403);
        reponses.push(JSON.stringify(r.j));
      }
      /* ⛔ Un jeton d'APPAREIL n'ouvre pas la Tour : ce sont deux mondes, et les confondre
         donnerait à n'importe quel technicien la console de dépannage de son entreprise.
         ⚠️ Et il est refusé avec EXACTEMENT le même corps qu'une absence de session : une
         réponse différente dirait « ton jeton est bon, mais pas pour ici ». */
      const avecJeton = await appel('GET', '/api/monitor/op/apercu?t=ent-a-9x', { jeton: jetonA });
      v('⛔ un jeton d\'appareil n\'ouvre pas la Tour', avecJeton.code, 403);
      v('⛔ le refus ne dit RIEN de plus avec un jeton qu\'avec rien', JSON.stringify(avecJeton.j), reponses[0]);
      v('⛔ les six routes refusent à l\'identique (aucun oracle)', new Set(reponses).size, 1);
      /* ⛔ Et surtout : un espace INEXISTANT est refusé pareil qu'un espace réel. Sinon la
         Tour deviendrait un annuaire des entreprises clientes, lisible sans être la Tour. */
      v('⛔ un espace inexistant est refusé à l\'identique',
        JSON.stringify((await appel('GET', '/api/monitor/op/apercu?t=nexiste-pas')).j), reponses[0]);
    }

    /* ══ 9. ⛔ LE SOCLE A SON PROPRE PLAFOND, RÉEL ═════════════════════════════════════ */
    console.log('\n⛔ Le socle n\'est pas dans le budget global — mais il a le sien');
    {
      /* 130 requêtes : au-delà des 120/min/IP du budget global. Si `/api/op/*` y était, la
         synchro d'un seul appareil s'étranglerait toute seule au bout d'une minute. */
      /* ⚠️ SUR LE FLUX, PAS SUR `etat()`. Ce contrôle porte sur le plafond GLOBAL de 120/min/IP,
         et il martelait `/api/op/etat` — qui a depuis son propre budget, bien plus serré parce
         qu'elle est chère. Il tombait donc sur le bon refus, pour la mauvaise raison, et faisait
         échouer les trois contrôles suivants au passage. Le flux est la route réellement
         martelée en production : c'est elle qu'il faut éprouver ici. */
      let refusees = 0;
      for (let i = 0; i < 130; i++) if ((await appel('GET', '/api/op/flux?depuis=0', { jeton: jetonA })).code === 429) refusees++;
      v('⛔ 130 requêtes passent (le plafond global ne s\'applique pas)', refusees, 0);
      /* ⛔ ET `etat()`, ELLE, A SON PROPRE BUDGET — parce qu'elle relit et SIGNE toute la base.
         Sans lui, relever le budget des lectures pour que 36 appareils tiennent autorisait
         40 000 appels/h à une route à 42 ms : un seul jeton légitime gelait le serveur pour
         tous les clients. Trois budgets, trois coûts. */
      const src724 = fs.readFileSync(path.join(RACINE, 'server', 'op-socle.js'), 'utf8');
      /* ⚠️ ON VÉRIFIE LA PROPRIÉTÉ, PAS L'ÉCRITURE. Ce contrôle figeait la ligne exacte
         `req.path === '/api/op/etat'` — et il est tombé sur le correctif qui a REMPLACÉ cette
         ligne parce qu'elle se contournait avec une barre oblique finale. Ce qui doit rester
         vrai : `etat()` a son propre budget, et la route est identifiée par son CHEMIN DÉCLARÉ,
         jamais par l'URL reçue (Express est monté sans `strict routing` : `/api/op/etat/` et
         `/API/OP/ETAT` atteignent le même gestionnaire). */
      vrai('⛔ `etat()` a un budget distinct des lectures bon marché', /const cher = /.test(src724) && /etatsParHeure/.test(src724));
      vrai('⛔ et la route est reconnue par son chemin DÉCLARÉ, pas par l\'URL reçue',
        /req\.route && typeof req\.route\.path === 'string'/.test(src724));
      v('⛔ aucune comparaison directe contre `req.path` pour ce budget', /cher = req\.path ===/.test(src724), false);
      /* ⚠️ ON COMPARE LES DEUX NOMBRES, pas des littéraux. Une assertion sur « || 500 » fige un
         chiffre qu'on a le droit de régler ; ce qui doit rester vrai, c'est que la route CHÈRE
         soit bien plus serrée que les routes bon marché. */
      const nb = (n) => { const m = new RegExp(n + '[^|]*\\|\\|\\s*(\\d+)').exec(src724); return m ? parseInt(m[1], 10) : null; };
      const bEtat = nb('etatsParHeure'), bLect = nb('lecturesParHeure');
      v('   les deux budgets sont lisibles dans la source', [typeof bEtat, typeof bLect], ['number', 'number']);
      v('⛔ et celui de `etat()` est au moins dix fois plus serré', bEtat * 10 <= bLect, true);
      console.log('      mesuré : etat ' + bEtat + '/h contre lectures ' + bLect + '/h');
      /* Et la borne existe : la source la nomme et la chiffre. Un plafond « exempté » ferait
         de /api/op/session la seule route du serveur sans aucune borne avant preuve. */
      const src = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
      vrai('⛔ le plafond du socle est nommé et chiffré', /const PLAFOND_DONNEES = \d+;/.test(src));
      vrai('⛔ il est appliqué, pas seulement déclaré', /d > PLAFOND_DONNEES\) return tropDeRequetes/.test(src));
    }

    /* ══ 9bis. ⛔ COUPER DOIT COUPER — LES SIX CONTRÔLES QUI MANQUAIENT ════════════════
       Relecture `gardien` du 18 septembre 2026, REPRODUITE : `sessionsCouper()` révoquait les
       jetons, puis l'appareil rappelait `/api/op/session` avec LA MÊME CLÉ dans la seconde et
       repartait pour 30 jours. La route répondait `{ok:true}`, la Tour affichait « révoqué »
       à côté d'une ligne vivante du même nom. Le droit d'ouvrir une session vient de la CLÉ,
       que la coupure ne touchait pas. C'est la leçon de Firebase — « un jeton s'échange contre
       une session renouvelable » — rejouée sur notre propre stockage, un an plus tard. */
    console.log('\n⛔ Couper une entreprise doit VRAIMENT la couper');
    {
      const socle = require(path.join(RACINE, 'server', 'socle.js'));
      /* Le banc parle au module avec la MÊME configuration que le serveur : c'est le même
         fichier sur le disque, donc le même état — pas une simulation. */
      const avant = (await session('ent-a-9x', CLE_A)).j.jeton;
      v('avant la coupure, l\'appareil lit', (await appel('GET', '/api/op/etat', { jeton: avant })).code, 200);

      socle.entrepriseOuvrir('ent-a-9x', false);
      /* ⛔ 1 — le jeton déjà émis ne vaut plus rien, TOUT DE SUITE. Pas dans 30 jours.
         ⚠️ Il répond 401 et non 403 : la fermeture révoque aussi les jetons, donc le porteur
         est arrêté au premier étage (jeton inconnu) sans qu'on ait besoin de lire l'état. Le
         banc a d'abord attendu 403 — c'est le BANC qui se trompait d'étage. Ce qui compte est
         qu'il soit arrêté, et que ce soit la RÉOUVERTURE de session qui lui dise pourquoi,
         avec un message qu'un écran peut afficher. */
      const apres = await appel('GET', '/api/op/etat', { jeton: avant });
      v('⛔ le jeton émis AVANT ne lit plus rien', apres.code, 401);
      v('⛔ ni ne peut écrire', (await appel('POST', '/api/op/pousser', { jeton: avant, corps: { enr: [{ c: 'x', id: '1', m: Date.now(), e: 'h', r: {} }] } })).code, 401);

      /* ⛔ 1bis — LE SECOND ÉTAGE, ET IL FAUT L'ÉPROUVER SÉPARÉMENT. Si la révocation des
         jetons échouait (disque, incident), l'appareil garderait un jeton VALABLE. `opJeton`
         relit donc l'état de l'entreprise à CHAQUE requête — comme `monAdmin` relit
         rôle/actif/apps. Sans ce second étage, la fermeture reposerait entièrement sur une
         écriture qui peut rater : exactement le défaut de Firebase, où refuser les nouveaux
         jetons ne suffisait pas. On remet donc un jeton vivant sur un espace fermé. */
      socle.entrepriseOuvrir('ent-a-9x', true);
      const vivant = (await session('ent-a-9x', CLE_A)).j.jeton;
      socle.annuaire().prepare("UPDATE entreprise SET etat='ferme' WHERE t=?").run('ent-a-9x');   // ferme SANS révoquer
      const bloque = await appel('GET', '/api/op/etat', { jeton: vivant });
      v('⛔ un jeton VALABLE sur un espace fermé est refusé quand même', [bloque.code, bloque.j.motif], [403, 'ferme']);
      v('⛔ et il ne peut pas écrire non plus', (await appel('POST', '/api/op/pousser', { jeton: vivant, corps: { enr: [{ c: 'x', id: '2', m: Date.now(), e: 'h', r: {} }] } })).j.motif, 'ferme');
      /* ⛔ 2 — ET IL NE PEUT PAS S'EN REFAIRE UN avec la même clé d'équipe. C'est LE contrôle
         qui manquait : sans lui, tout ce qui précède ne coûte qu'un aller-retour à l'appareil. */
      const rouvrir = await session('ent-a-9x', CLE_A);
      v('⛔ il ne peut PAS rouvrir de session avec la même clé', [rouvrir.code, rouvrir.j.motif], [403, 'ferme']);
      /* ⛔ 3 — et une entreprise coupée n'en coupe pas une autre. */
      v('⛔ la voisine n\'est pas touchée', (await session('ent-b-7y', CLE_B)).code, 200);

      socle.entrepriseOuvrir('ent-a-9x', true);
      const reouvert = await session('ent-a-9x', CLE_A);
      v('rouvrir la laisse revenir', reouvert.code, 200);
      jetonA = reouvert.j.jeton;
    }

    /* ══ 9ter. ⛔ LES BORNES — UN SEUL APPAREIL NE DOIT PAS POUVOIR REMPLIR LE DISQUE ════
       Un fichier par entreprise sépare les DONNÉES ; il ne sépare pas le DISQUE, et le disque
       du VPS est celui de TOUS les clients. Sans bornes, un appareil authentifié écrit des
       gigaoctets dans les limites de son quota horaire, et ce n'est pas son entreprise qui
       tombe : c'est la plateforme. */
    console.log('\n⛔ Une entreprise ne peut pas remplir le disque des autres');
    {
      const pousse = enr => appel('POST', '/api/op/pousser', { jeton: jetonA, corps: { enr: [enr] } });
      const M = 1700000000000;
      v('⛔ un identifiant de 500 caractères est refusé', (await pousse({ c: 'p', id: 'i'.repeat(500), m: M, e: 'h', r: {} })).j.refus[0].motif, 'identite_trop_longue');
      v('⛔ une collection de 100 caractères est refusée', (await pousse({ c: 'c'.repeat(100), id: 'x', m: M, e: 'h', r: {} })).j.refus[0].motif, 'identite_trop_longue');
      /* Incompressible exprès : un corps de 2 Mo de texte répété passerait sous la borne
         après gzip, et on croirait la borne inopérante. */
      const gros = crypto.randomBytes(900000).toString('hex');
      v('⛔ un corps d\'un mégaoctet est refusé', (await pousse({ c: 'p', id: 'gros', m: M, e: 'h', r: { n: gros } })).j.refus[0].motif, 'corps_trop_gros');
      v('   une fiche normale passe toujours', (await pousse({ c: 'p', id: 'normal', m: M, e: 'h', r: { nom: 'Gel', stock: 12 } })).j.acceptes, 1);
      /* ⛔ `plancher` vient du CORPS et décide d'un état IRRÉVERSIBLE : le compteur de numéros
         ne redescend jamais, par conception. Sans borne, un milliard, définitivement. */
      v('⛔ un plancher d\'un milliard est refusé', (await appel('POST', '/api/op/numero', { jeton: jetonA, corps: { prefixe: 'FA', annee: 2026, n: 1, plancher: 999999999 } })).code, 400);
      v('⛔ une année absurde est refusée', (await appel('POST', '/api/op/numero', { jeton: jetonA, corps: { prefixe: 'FA', annee: 99999, n: 1 } })).code, 400);
      /* ⚠️ Et le message d'erreur ne rend pas le chemin du fichier sur le VPS. */
      const err = await appel('POST', '/api/op/numero', { jeton: jetonA, corps: { prefixe: '', annee: 2026, n: 1 } });
      v('⚠️ une erreur ne publie aucun chemin de fichier', /\/opt\/|base\.db|\/tmp\//.test(JSON.stringify(err.j)), false);
    }

    /* ══ 9quater. ⛔ LE COÛT DU FLUX NE DOIT PAS CROÎTRE AVEC LA BASE ═════════════════
       `/api/op/flux` est la route la plus appelée de toutes : chaque appareil, en permanence.
       Elle appelait `etat()`, qui relit et hache TOUTE la base — mesuré 42 ms sur 20 000
       enregistrements, en synchrone. À 1 200 sondages/min ça bloquait 50 secondes de boucle
       d'événements sur 60 : le serveur mort pour TOUS les clients, depuis un seul jeton
       parfaitement légitime. */
    console.log('\n⛔ Le flux coûte le même prix sur une grosse base');
    {
      /* ⚠️ `depuis=0` — L'APPAREIL EST EN RETARD, DONC LE SERVEUR RÉPOND TOUT DE SUITE. La
         première version de ce banc envoyait `depuis=999999999` : le serveur n'avait rien de
         neuf à annoncer, tenait le long-poll ses 25 secondes pleines des DEUX côtés, et le
         rapport tombait à 1,00. Le contrôle passait — en ne mesurant rien du tout. Un banc qui
         passe pour une mauvaise raison est pire qu'un banc qui échoue : il fait croire le
         terrain couvert. */
      const une = async (chemin) => { const a = process.hrtime.bigint(); const r = await appel('GET', chemin, { jeton: jetonA }); return [Number(process.hrtime.bigint() - a) / 1e6, r]; };
      /* ⚠️ MÉDIANE DE SEPT, PAS UN TIR. Mesuré au premier essai : 1,2 ms puis 12,9 ms (×11) —
         et ce n'était PAS le coût de la route. Juste après 4 000 écritures, SQLite fusionne son
         WAL à la première lecture : un coût UNIQUE, qu'un tir isolé attribue à la route. On
         prend la médiane, qui l'ignore, et on compare au même geste sur `/health` pour
         distinguer « cette route a grossi » de « le serveur est occupé ». */
      const mediane = async (chemin) => { const v = []; for (let i = 0; i < 7; i++) v.push((await une(chemin))[0]); return v.sort((a, b) => a - b)[3]; };
      const [petite0, r0] = await une('/api/op/flux?depuis=0');
      v('   le flux répond immédiatement quand l\'appareil est en retard', petite0 < 5000, true);
      v('   et il ne porte que {seq}', Object.keys(r0.j), ['seq']);
      const petite = await mediane('/api/op/flux?depuis=0');
      const refPetite = await mediane('/health');
      for (let p = 0; p < 10; p++) await appel('POST', '/api/op/pousser', { jeton: jetonA,
        corps: { enr: Array.from({ length: 400 }, (_, i) => ({ c: 'masse', id: 'm' + p + '-' + i, m: 1700000000000 + p * 400 + i, e: 'h', r: { nom: 'x' + i } })) } });
      const grosse = await mediane('/api/op/flux?depuis=0');
      const refGrosse = await mediane('/health');
      const e = await appel('GET', '/api/op/etat', { jeton: jetonA });
      v('4 000 enregistrements de plus sont bien là', e.j.seq > 4000, true);
      /* On ne compare pas à une constante (une machine de CI est capricieuse) mais au RAPPORT,
         et on le CORRIGE du bruit de fond mesuré sur `/health` au même moment. */
      const rapport = (grosse / Math.max(petite, 0.01)) / Math.max(refGrosse / Math.max(refPetite, 0.01), 0.2);
      console.log('      flux : ' + petite.toFixed(2) + ' → ' + grosse.toFixed(2) + ' ms   (/health : '
        + refPetite.toFixed(2) + ' → ' + refGrosse.toFixed(2) + ' ms)   rapport corrigé ×' + rapport.toFixed(2));
      /* ⛔⛔ UN RAPPORT DE MÉDIANES SOUS LA MILLISECONDE EST UN TIRAGE, PAS UNE MESURE. Ce
         contrôle est tombé le 20 septembre 2026 pendant la suite complète, et passait seul au
         même instant (« rapport corrigé ×1.57 ») : les quatre nombres valaient ~1 ms, donc la
         division amplifiait le bruit de l'ordonnanceur jusqu'à franchir le seuil. Rien n'avait
         grossi — c'est la machine qui était occupée par les 91 autres suites.
         ⚠️ Et c'est exactement comme ça qu'on perd un garde-fou : un banc qui crie faux se fait
         ignorer, puis désactiver. La propriété gardée est « le flux ne grossit PAS avec la
         base » ; à 0,9 ms, elle est vraie quelle que soit la valeur du rapport. On accepte donc
         les deux preuves — le rapport quand il y a du signal, le coût ABSOLU quand il n'y en a
         pas — et on refuse toujours un vrai gonflement, qui se voit sur les deux à la fois. */
      const plancher = grosse < 2;
      v('⛔ le flux ne coûte pas plus cher sur 4 000 enregistrements', rapport < 3 || plancher, true);
      if (plancher && rapport >= 3) console.log('      (rapport ×' + rapport.toFixed(2) + ' ignoré : ' + grosse.toFixed(2) + ' ms, sous le seuil de mesure)');
      /* ⛔ ET LA COMPARAISON QUI DIT TOUT : `etat()`, elle, relit et hache TOUTE la base. Si le
         flux passait par elle — ce qu'il faisait — il porterait ce coût-là à chaque sondage de
         chaque appareil. C'est le contrôle qui empêchera quelqu'un de « simplifier » en
         réunissant les deux routes. */
      const coutEtat = await mediane('/api/op/etat');
      console.log('      etat() : ' + coutEtat.toFixed(2) + ' ms sur la même base');
      v('⛔ le flux reste bien moins cher que etat()', grosse < coutEtat, true);
    }

    /* ══ 9quinquies. ⛔ LA TOUR NE FABRIQUE PAS DE BASE SUR UNE FAUTE DE FRAPPE ═══════
       `ouvrir()` CRÉE la base : la garde `try { etat(t) } catch { 404 }` était du code mort.
       `?t=faute-de-frappe` répondait 200 avec un état vide — la Tour affichait un stockage sain
       pour un espace inexistant, écrivait une ligne au journal opposable pour un `t` fantôme,
       et laissait une base vide sur le disque à chaque appel. */
    console.log('\n⛔ Une faute de frappe dans la Tour ne crée pas de base');
    {
      const socle = require(path.join(RACINE, 'server', 'socle.js'));
      const avant = fs.readdirSync(path.join(banc, 'data', 'socle')).length;
      v('⛔ existe() dit non sans rien créer', socle.existe('faute-de-frappe'), false);
      v('⛔ et aucun dossier n\'est apparu', fs.readdirSync(path.join(banc, 'data', 'socle')).length, avant);
    }

    /* ══ 10. ⛔ LE DÉFAUT : INERTE ═════════════════════════════════════════════════════
       C'est le contrôle qui rend tout le reste déployable chez un client qui travaille. Un
       push sur `main` touchant `server/**` DÉPLOIE : « prêt mais non déployé » n'existe pas,
       seul « déployé et inerte » existe. Si ce contrôle tombe, le socle s'allume tout seul
       chez ELAN au prochain déploiement — sans que personne l'ait demandé. */
    console.log('\n⛔ Sans le drapeau, RIEN ne s\'allume');
    {
      const banc2 = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-724b-'));
      fs.mkdirSync(path.join(banc2, 'data'), { recursive: true });
      /* La MÊME configuration, au drapeau près — sinon on ne compare pas ce qu'on croit. */
      fs.writeFileSync(path.join(banc2, 'config.json'), JSON.stringify({
        vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc' }));
      const P2 = PORT + 1;
      const e2 = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], {
        env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc2, 'config.json'),
          TEAMOP_DATA: path.join(banc2, 'data'), PORT: String(P2), TEAMOP_KEK: KEK }), stdio: 'ignore' });
      let up = false;
      for (let i = 0; i < 100 && !up; i++) { await new Promise(r => setTimeout(r, 100)); try { up = (await fetch('http://127.0.0.1:' + P2 + '/health')).ok; } catch (err) {} }
      if (!up) { ko++; console.log('  ✗ le second serveur n\'a pas démarré'); }
      else {
        const h = await (await fetch('http://127.0.0.1:' + P2 + '/health')).json();
        v('⛔ /health dit que le socle est éteint', h.socle, { actif: false });
        const r = await fetch('http://127.0.0.1:' + P2 + '/api/op/session',
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: 'ent-a-9x', kh: sha(CLE_A) }) });
        v('⛔ /api/op/session n\'existe pas du tout', r.status, 404);
        for (const c of ['/api/op/depuis?seq=0', '/api/op/etat', '/api/op/flux?depuis=0', '/api/monitor/op/apercu?t=ent-a-9x'])
          v('⛔ ' + c.split('?')[0] + ' n\'existe pas', (await fetch('http://127.0.0.1:' + P2 + c)).status, 404);
        /* ⛔ Et surtout : AUCUN fichier créé. Une base ouverte « au cas où » serait déjà un
           changement chez le client, et le retour arrière ne serait plus un drapeau. */
        v('⛔ aucun fichier de socle n\'a été créé', fs.existsSync(path.join(banc2, 'data', 'socle'))
          || fs.existsSync(path.join(banc2, 'data', 'socle-annuaire.db')), false);
        /* ⚠️ Le reste du serveur, lui, marche exactement comme avant. */
        v('le reste du serveur répond normalement', h.ok, true);
      }
      try { e2.kill('SIGKILL'); } catch (err) {}
      try { fs.rmSync(banc2, { recursive: true, force: true }); } catch (err) {}
    }

    /* ══ 10bis. ⛔ UN MONTAGE RATÉ NE DOIT LAISSER AUCUNE ROUTE DERRIÈRE LUI ═══════════
       C'est le bloquant n° 1 de la vérification du 18 septembre, REPRODUIT alors : `poser()`
       enregistrait au fur et à mesure et ne jetait qu'en ARRIVANT sur le doublon. Express n'a
       aucun moyen de retirer une route déjà posée — il restait donc VIVANTES `/api/op/session`,
       `/depuis`, `/pousser`, `/flux`, `/etat`, c'est-à-dire toute la surface de lecture ET
       d'écriture, pendant que `index.js` attrapait l'erreur et laissait `opSocle = null`.
       ⛔ LE COÛT EXACT : `socleCouper()` répond « socle éteint, coupure OK » quand `opSocle`
       est nul. Les QUATRE portes de fermeture disaient donc à la Tour que l'entreprise était
       coupée pendant que ses appareils continuaient de lire et d'écrire.
       ⚠️ Le compteur `routesDoublons` de `/health` NE COUVRE PAS ce cas : le second `poser()`
       ne va jamais jusqu'à `app.post(...)`, donc il n'y a jamais deux entrées physiques. */
    console.log('\n⛔ Un montage raté ne laisse AUCUNE route ouverte');
    {
      const { monterOpSocle } = require(path.join(RACINE, 'server', 'op-socle.js'));
      /* Un faux `app` qui note ce qu'on lui pose : on regarde ce qui a été ENREGISTRÉ, pas ce
         que la fonction a l'intention de poser. */
      const posees = [];
      const faux = { _router: { stack: [{ route: { path: '/api/op/numero', methods: { post: true } } }] } };
      for (const m of ['get', 'post', 'put', 'delete']) faux[m] = (c) => posees.push(m.toUpperCase() + ' ' + c);
      let jete = '';
      try {
        monterOpSocle(faux, { config: { socle: { actif: true } }, socle: require(path.join(RACINE, 'server', 'socle.js')),
          sauvRefus: () => null, cleEstPublique: () => false, quotaOk: () => true, monStr: (x, n) => String(x || '').slice(0, n), garde: (q, r, n) => n() });
      } catch (e) { jete = e.message; }
      vrai('le montage jette bien sur la route en double', /DÉJÀ déclarée/.test(jete));
      /* ⛔ LA LIGNE QUI COMPTE. Avant correction : 5 routes vivantes. */
      v('⛔ ZÉRO route enregistrée après un montage raté', posees, []);
    }

    /* ══ 10ter. ⛔ LES QUATRE PORTES ET LES REFUS QUI SE VOIENT ═══════════════════════ */
    console.log('\n⛔ Couper, rouvrir, et les refus qui ne passent pas pour un détail');
    {
      const socle = require(path.join(RACINE, 'server', 'socle.js'));
      /* ⛔ `couper` sur une faute de frappe CRÉAIT l'espace fantôme, avec sa clé et une ligne
         au journal opposable, pendant que la vraie entreprise continuait de travailler. */
      const avant = fs.readdirSync(path.join(banc, 'data', 'socle')).length;
      /* ⚠️ SANS SESSION DE TOUR, C'EST `monPatronStrict` QUI RÉPOND (403) — donc cet appel ne
         prouve RIEN sur la garde `existe()`, qu'il n'atteint jamais. Le libellé de la première
         version disait « → 404 » en attendant 403 : un contrôle qui passe pour une autre raison
         que celle qu'il annonce, exactement ce qu'on chasse. On garde l'appel (il vérifie que
         la Tour garde bien la route) et on éprouve la garde elle-même là où elle est lisible. */
      v('la route est gardée par la Tour', (await appel('POST', '/api/monitor/op/couper', { corps: { t: 'ent-a-9X' } })).code, 403);
      v('   et rien n\'est né de cet appel', fs.readdirSync(path.join(banc, 'data', 'socle')).length, avant);
      /* ⛔ LA GARDE ELLE-MÊME : `existe()` AVANT `entrepriseOuvrir`. Sans cet ordre, une faute
         de frappe crée la ligne d'annuaire ET une clé (`entrepriseOuvrir` fait un INSERT), et
         le journal chaîné — le seul dispositif opposable au client — porte pour toujours la
         fermeture d'une entreprise qui n'a jamais existé. */
      /* ⚠️ SANS LES COMMENTAIRES. Le commentaire qui EXPLIQUE la garde cite `entrepriseOuvrir`
         AVANT la ligne qui appelle `existe()` — le contrôle comparait donc un appel réel à une
         mention en prose et mettait au rouge du code juste. Deuxième fois aujourd'hui qu'un
         banc trébuche sur un bon commentaire : on regarde le CODE. */
      const sansCom = x => x.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
      const srcOp = sansCom(fs.readFileSync(path.join(RACINE, 'server', 'op-socle.js'), 'utf8'));
      const iC = srcOp.indexOf("poser('POST', '/api/monitor/op/couper'");
      const finC = srcOp.indexOf("poser('GET', '/api/monitor/op/diagnostics'", iC);
      const bloc = (iC < 0 || finC < 0) ? '' : srcOp.slice(iC, finC);
      v('la route couper a bien été trouvée dans le code', iC > 0 && finC > iC, true);
      vrai('⛔ couper vérifie existe() AVANT de toucher à l\'annuaire',
        bloc.indexOf('socle.existe(t)') > 0 && bloc.indexOf('socle.existe(t)') < bloc.indexOf('entrepriseOuvrir'));
      /* Et la preuve fonctionnelle, au module : rien ne naît d'un identifiant inconnu. */
      v('⛔ existe() sur une faute de frappe reste faux', socle.existe('ent-a-9X'), false);

      /* ⛔ Un refus TOTAL de pousse ne sort pas en 200 : l'écran doit pouvoir le dire. */
      /* ⚠️ LE RANG SE MESURE AVANT ET APRÈS. La première version de ce contrôle comparait deux
         lectures prises TOUTES LES DEUX APRÈS la pousse : il passait quoi qu'il arrive, même
         si le rang avait brûlé. Un banc qui se compare à lui-même ne garde rien. */
      const avantRang = (await appel('GET', '/api/op/etat', { jeton: jetonA })).j.seq;
      const r = await appel('POST', '/api/op/pousser', { jeton: jetonA, corps: { enr: [
        { c: 'p', id: 'enorme', m: Date.now() - 1000, e: 'h', r: { n: crypto.randomBytes(900000).toString('hex') } }] } });
      v('un corps trop gros est refusé avec son motif', r.j.refus[0].motif, 'corps_trop_gros');
      v('⛔ et il ne brûle aucun rang', (await appel('GET', '/api/op/etat', { jeton: jetonA })).j.seq, avantRang);

      /* ⛔ `/health` doit porter le compteur de lignes illisibles : sans lui, une entreprise
         dont les données cessent de se déchiffrer ne réveille personne. */
      const h = await appel('GET', '/health');
      v('⛔ /health publie le compteur de lignes illisibles', typeof h.j.socle.illisibles, 'number');
      v('   et toujours aucun nom d\'entreprise', /ent-a-9x|ent-b-7y/.test(JSON.stringify(h.j)), false);
    }

    /* ══ 11. L'ARRÊT PROPRE ════════════════════════════════════════════════════════════ */
    console.log('\nSIGTERM ferme les bases — il arrive à chaque déploiement');
    {
      const base = path.join(banc, 'data', 'socle', 'ent-a-9x', 'base.db');
      vrai('la base existe et son WAL aussi', fs.existsSync(base) && fs.existsSync(base + '-wal'));
      /* ⛔ AVEC UN LONG-POLL OUVERT — et c'est TOUT le sujet. `serveur.close()` ne rend la main
         qu'une fois toutes les connexions terminées ; un flux est tenu 25 s, et en production
         il y en a TOUJOURS un. MESURÉ avant correction : sortie forcée après 5 009 ms, « socle
         fermé » jamais écrit, `-wal` laissé sur le disque — à chaque déploiement. Sans ce
         flux ouvert, le banc passait en ne mesurant pas le cas qui casse. */
      const fluxTenu = appel('GET', '/api/op/flux?depuis=999999999', { jeton: jetonA }).catch(() => null);
      await new Promise(r => setTimeout(r, 400));
      const t0 = Date.now();
      enfant.kill('SIGTERM');
      for (let i = 0; i < 60 && fs.existsSync(base + '-wal'); i++) await new Promise(r => setTimeout(r, 100));
      /* ⛔ `close()` fusionne le WAL et le fait disparaître. S'il reste, la fermeture n'a pas
         eu lieu — et un SIGKILL de systemd laisserait le journal à rejouer au démarrage. */
      v('⛔ le WAL a été fusionné à l\'arrêt, MALGRÉ un flux ouvert', fs.existsSync(base + '-wal'), false);
      vrai('le serveur dit qu\'il a fermé le socle', /socle fermé/.test(sortie));
      vrai('⛔ et il a relâché les flux AVANT de fermer', /flux relâchés/.test(sortie));
      /* Sans la correction, l'arrêt durait les 5 s du secours. Il doit être quasi immédiat. */
      v('⛔ l\'arrêt n\'attend pas les 5 s du secours', (Date.now() - t0) < 4000, true);
      await fluxTenu;
    }
  } catch (e) {
    ko++; console.log('  ✗ le banc n\'a pas pu tourner : ' + e.message + '\n' + String(e.stack).split('\n').slice(1, 4).join('\n'));
    if (sortie) console.log('  — sortie du serveur :\n' + sortie.slice(-1500));
  }

  stop();
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();

process.on('uncaughtException', e => { stop(); console.log('  ✗ ' + e.message); process.exit(1); });

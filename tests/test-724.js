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
    let jetonA = '', appA = '';
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
      for (const [m, c] of [['GET', '/api/monitor/op/apercu?t=ent-a-9x'], ['POST', '/api/monitor/op/ouvrir'],
        ['GET', '/api/monitor/op/journal?t=ent-a-9x'], ['POST', '/api/monitor/op/couper'], ['GET', '/api/monitor/op/diagnostics?t=ent-a-9x']]) {
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
      v('⛔ les cinq routes refusent à l\'identique (aucun oracle)', new Set(reponses).size, 1);
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
      let refusees = 0;
      for (let i = 0; i < 130; i++) if ((await appel('GET', '/api/op/etat', { jeton: jetonA })).code === 429) refusees++;
      v('⛔ 130 requêtes passent (le plafond global ne s\'applique pas)', refusees, 0);
      /* Et la borne existe : la source la nomme et la chiffre. Un plafond « exempté » ferait
         de /api/op/session la seule route du serveur sans aucune borne avant preuve. */
      const src = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
      vrai('⛔ le plafond du socle est nommé et chiffré', /const PLAFOND_DONNEES = \d+;/.test(src));
      vrai('⛔ il est appliqué, pas seulement déclaré', /d > PLAFOND_DONNEES\) return tropDeRequetes/.test(src));
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

    /* ══ 11. L'ARRÊT PROPRE ════════════════════════════════════════════════════════════ */
    console.log('\nSIGTERM ferme les bases — il arrive à chaque déploiement');
    {
      const base = path.join(banc, 'data', 'socle', 'ent-a-9x', 'base.db');
      vrai('la base existe et son WAL aussi', fs.existsSync(base) && fs.existsSync(base + '-wal'));
      enfant.kill('SIGTERM');
      for (let i = 0; i < 60 && fs.existsSync(base + '-wal'); i++) await new Promise(r => setTimeout(r, 100));
      /* ⛔ `close()` fusionne le WAL et le fait disparaître. S'il reste, la fermeture n'a pas
         eu lieu — et un SIGKILL de systemd laisserait le journal à rejouer au démarrage. */
      v('⛔ le WAL a été fusionné à l\'arrêt', fs.existsSync(base + '-wal'), false);
      vrai('le serveur dit qu\'il a fermé le socle', /socle fermé/.test(sortie));
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

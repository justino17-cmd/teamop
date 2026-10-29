/* ⛔ CE QUE CE FICHIER GARDE — LE PLAFOND DES AGENTS DU SERVEUR DE TEST : 10 $ PAR MOIS, TOUS AGENTS CONFONDUS (23 octobre 2026).

   Justin : les agents du serveur de test parlent au VRAI Claude, avec un plafond de 10 $ par mois. Le cerveau (`server/cerveau.js`) tient déjà un budget — 195 $ au total, un
   plafond par agent — et refuse au plafond. Le réglage `agents.plafondMoisTotal` ne fait que BAISSER ce total, et seulement dans le serveur de test.
     1. le MODULE, le vrai : à 10 $, l'appel suivant est refusé (`plafond_total`) quand le total atteint 10 $, aucun appel ne part ; sans réglage, la production garde ses 195 $ ;
        un réglage hors forme (0, négatif, NaN, texte, infini) ne change rien, un réglage au-dessus de 195 $ est ramené à 195 ; l'imputation de l'examen compte dans le total ;
     2. le VRAI SERVEUR avec `espaceTest` : 9,9999999 $ déjà dépensés, un premier message à Léa passe (le faux Anthropic le reçoit), le suivant est REFUSÉ — le faux Anthropic ne
        reçoit rien de plus, le budget ne bouge plus ; sans réglage le défaut est quand même 10 $ ; réglé à 500 $ (ramené à 195), le même mois dépensé ne retient personne.
   La production, elle, est jouée par `test-2981` (10,50 $ dépensés, Léa répond encore). Le vrai serveur, un faux Anthropic sur 127.0.0.1 — jamais le vrai Claude. */
const fs = require('fs'), os = require('os'), path = require('path');
const B2 = require('./banc-essais');
const { RACINE, dormir, attendre } = B2;
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c) => v(t, !!c, true);
const vivants = [];
const fin = () => { for (const s of vivants) { try { s.enfant() && s.enfant().kill('SIGKILL'); } catch (e) {} try { s.smtp.s.close(); } catch (e) {} try { fs.rmSync(s.banc, { recursive: true, force: true }); } catch (e) {} } try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {} };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'b2983-'));
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 150 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 150000).unref();
const mois = new Date().toISOString().slice(0, 7);

(async () => {
  console.log('\n── test-2983 : le plafond des agents du serveur de test ──');
  const agentsMod = require(path.join(RACINE, 'server', 'agents.js')), cerveau = require(path.join(RACINE, 'server', 'cerveau.js'));
  const faux = { AGENTS: agentsMod.AGENTS, peutAgir: () => ({ ok: true }), noter: () => {} };
  let n = 0;
  /* (28 octobre 2026) le budget du JOUR (`cerveau.js`, test-3119) a ses propres seuils ; ce banc joue le plafond du MOIS / TOTAL (10 $) : on lève le jour pour qu'il ne le masque pas */
  const GRAND_JOUR = { agentMin: 1e9, nonRacine: 1e9, filet: 1e9 };
  /* un appel qui coûte 1 $ (sortie 57 143 jetons × 17,5 $ / million = 1,0000025 $) */
  const appeler = async () => { n++; return { texte: 'ok', entree: 0, sortie: 57143 }; };
  const monter = (plafond, nom) => { const d = path.join(tmp, nom); fs.mkdirSync(d, { recursive: true }); return cerveau({ DATA_DIR: d, agents: faux, cleApi: 'k', appeler, plafondTotalUsd: plafond, plafondsJour: GRAND_JOUR }); };
  const penser = (c, id) => c.penser(id || 'camille', 'système', [{ role: 'user', content: 'bonjour' }]);

  console.log('\n1. Le module');
  let c = monter(10, 'dix'); n = 0;
  const raisons = []; for (let i = 0; i < 13; i++) { const r = await penser(c); raisons.push(r.ok ? 'ok' : r.raison); }
  v('⛔ à 10 $ : dix appels à 1 $ passent, le onzième et les suivants sont REFUSÉS (`plafond_total`)', raisons, [...Array(10).fill('ok'), 'plafond_total', 'plafond_total', 'plafond_total']);
  v('⛔ …et AUCUN appel de plus n\'est parti vers Claude (dix, pas treize)', n, 10);
  v('l\'état du budget le dit : plafond 10, total ≈ 10', [c.etatBudget().plafondTotal, Math.round(c.etatBudget().total)], [10, 10]);
  const autre = await penser(c, 'victor');
  v('⛔ le plafond est TOUS AGENTS CONFONDUS : un autre agent, qui n\'a rien dépensé, est refusé aussi', [autre.ok, autre.raison], [false, 'plafond_total']);
  v('…et le fichier du budget l\'a retenu (un redémarrage ne rend pas les 10 $)', cerveau({ DATA_DIR: path.join(tmp, 'dix'), agents: faux, cleApi: 'k', appeler, plafondTotalUsd: 10, plafondsJour: GRAND_JOUR }).etatBudget().total > 9.99, true);

  c = monter(undefined, 'prod'); n = 0;
  const prod = []; for (let i = 0; i < 13; i++) prod.push((await penser(c)).ok);
  v('⛔ SANS réglage : 13 appels à 1 $ passent tous — la production garde ses 195 $', [prod.every(Boolean), n, c.etatBudget().plafondTotal], [true, 13, 195]);
  for (const [valeur, attendu] of [[0, 195], [-5, 195], [NaN, 195], ['10', 195], [Infinity, 195], [null, 195], [500, 195], [195, 195], [194.99, 194.99], [0.5, 0.5], [10, 10]]) {
    v('le réglage ' + (typeof valeur === 'string' ? JSON.stringify(valeur) : String(valeur)) + ' donne un plafond de ' + attendu + ' $', monter(valeur, 'v' + String(valeur).replace(/[^a-z0-9]/gi, '_')).etatBudget().plafondTotal, attendu);
  }
  v('⛔ un réglage ne RELÈVE jamais le plafond au-delà de 195 $ (500 → 195)', monter(500, 'haut').etatBudget().plafondTotal, 195);

  c = monter(10, 'examen'); n = 0;
  vrai('l\'examen de l\'équipe impute ses dépenses sous un nom qui n\'est pas un agent', c.imputer('examen', 4) && c.imputer('examen', 4) && c.imputer('examen', 4));
  const apres = await penser(c, 'camille');
  v('⛔ 12 $ imputés à l\'examen : le plafond de 10 $ retient les agents (l\'examen compte dans le total)', [apres.ok, apres.raison, n], [false, 'plafond_total', 0]);

  console.log('\n2. Le vrai serveur, en mode test');
  if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules'))) { console.log('  … SAUTÉE (partie serveur) : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0); }
  const budget = (D) => fs.writeFileSync(path.join(D, 'agents-budget.json'), JSON.stringify({ mois, parAgent: { examen: 9.9999999 } }));
  const parler = async (S, T, texte) => S.appel('/api/monitor/conversations/envoyer', { fil: 'lea', texte }, T);
  const lireBudget = (S) => JSON.parse(fs.readFileSync(path.join(S.D, 'agents-budget.json'), 'utf8'));

  /* ── réglé à 10 $ ── */
  const fauxA = B2.fauxAnthropic(); await new Promise(r => fauxA.s.listen(0, '127.0.0.1', r));
  const S = await B2.lancer({ essai: true, anthropic: fauxA, config: { agents: { cleApi: 'sk-ant-banc', plafondMoisTotal: 10, reunionsAuto: false } }, donnees: (D) => {} }); vivants.push(S);
  vrai('le serveur de test démarre (clé des agents posée, plafond 10 $)', S.vivant);
  vrai('le semis est fait (les agents sont déjà en Brouillon)', await attendre(() => fs.existsSync(path.join(S.D, 'essais-semis.json')), 200));
  fs.writeFileSync(path.join(S.D, 'agents-budget.json'), JSON.stringify({ mois, parAgent: { examen: 9.9999999 } }));
  await S.arreter(); await S.demarrer();                                    // le budget se lit au démarrage : on redémarre sur le fichier posé
  const T = await S.tour();
  const ag = (await S.appel('/api/monitor/agents', undefined, T)).j.agents.find(a => a.id === 'lea');
  v('(population) Léa est en Brouillon (semée) et le budget du mois porte 9,9999999 $', [ag.mode, lireBudget(S).parAgent.examen], ['brouillon', 9.9999999]);
  const r1 = await parler(S, T, 'Léa, un premier point ?');
  vrai('⛔ le premier message passe : 9,9999999 $ < 10 $, le faux Anthropic le reçoit', r1.s === 200 && await attendre(() => fauxA.recus.length >= 1, 100));
  vrai('   et la dépense est inscrite (le total dépasse maintenant 10 $)', await attendre(() => { try { return Object.values(lireBudget(S).parAgent).reduce((a, b) => a + b, 0) > 10; } catch (e) { return false; } }, 100));
  const avant = JSON.stringify(lireBudget(S)), recus0 = fauxA.recus.length;
  const r2 = await parler(S, T, 'Léa, et maintenant ?');
  await dormir(2500);
  v('⛔ le SECOND message est refusé au plafond : le faux Anthropic ne reçoit RIEN de plus', [r2.s, fauxA.recus.length], [200, recus0]);
  v('   et le budget n\'a pas bougé', JSON.stringify(lireBudget(S)), avant);
  const fil = (await S.appel('/api/monitor/conversations/lea', undefined, T)).j.messages || [];
  vrai('   la conversation garde les deux questions de Justin (rien n\'est perdu)', fil.filter(m => /Léa, (un premier point|et maintenant) \?/.test(m.texte || '')).length === 2);
  v('⛔ et le faux facteur n\'a rien vu passer (les courriels de test sont captés)', S.smtp.connexions(), 0);
  await S.nettoyer();

  /* ── espaceTest SANS réglage : le plafond de 10 $ s'applique quand même (jamais les 195 $ de la production) ── */
  {
    const f3 = B2.fauxAnthropic(); await new Promise(r => f3.s.listen(0, '127.0.0.1', r));
    const S3 = await B2.lancer({ essai: true, anthropic: f3, config: { agents: { cleApi: 'sk-ant-banc', reunionsAuto: false } } }); vivants.push(S3);
    await attendre(() => fs.existsSync(path.join(S3.D, 'essais-semis.json')), 200);
    fs.writeFileSync(path.join(S3.D, 'agents-budget.json'), JSON.stringify({ mois, parAgent: { examen: 10.5 } }));
    await S3.arreter(); await S3.demarrer();
    const T3 = await S3.tour();
    await parler(S3, T3, 'Léa, un point ?');
    await dormir(2500);
    v('⛔ espaceTest SANS `plafondMoisTotal` : 10,50 $ dépensés, Léa est refusée — le défaut du serveur de test est 10 $, pas 195', f3.recus.length, 0);
    await S3.nettoyer(); f3.s.close();
  }
  /* ── plafond de 500 $ : ramené à 195, le même mois dépensé ne retient personne ── */
  for (const [nom, agentsConf] of [['500 $', { cleApi: 'sk-ant-banc', plafondMoisTotal: 500, reunionsAuto: false }]]) {
    const f2 = B2.fauxAnthropic(); await new Promise(r => f2.s.listen(0, '127.0.0.1', r));
    const S2 = await B2.lancer({ essai: true, anthropic: f2, config: { agents: agentsConf } }); vivants.push(S2);
    await attendre(() => fs.existsSync(path.join(S2.D, 'essais-semis.json')), 200);
    fs.writeFileSync(path.join(S2.D, 'agents-budget.json'), JSON.stringify({ mois, parAgent: { examen: 10.5 } }));
    await S2.arreter(); await S2.demarrer();
    const T2 = await S2.tour();
    await parler(S2, T2, 'Léa, un point ?');
    vrai('espaceTest avec un plafond de ' + nom + ' : 10,50 $ dépensés, Léa interroge encore Claude (le réglage est borné à 195 $, jamais au-delà)', await attendre(() => f2.recus.length >= 1, 100));
    await S2.nettoyer(); f2.s.close();
  }
  fauxA.s.close();
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });

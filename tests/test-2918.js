/* ⛔ TEST-2918 — À CHAQUE AGENT SON OUTIL, SUR LE VRAI SERVEUR (23 octobre 2026, relecture du `gardien` sur l'assemblage).
 *
 * `server/index.js` branche les outils propres des agents (offerts par `server/agent-equipe.js`) par des liaisons TARDIVES (`outilsAgents` : un getter par agent ; `arbitrer` pour Victor). La mutation
 * « Hugo reçoit l'outil de Margaux » ne faisait tomber AUCUN banc : `test-2861` ne réveille pas ces agents, et les bancs de module montent chaque agent seul.
 * Ici, le vrai serveur (`banc-serveur-gestion.js` : faux Claude qui garde chaque requête, Stripe simulé), Justin écrit dans le fil privé de six agents allumés,
 * et on relève les outils OFFERTS à chacun : les cinq communs, puis le sien et lui seul ; aucun pour Max. Rien ne sort de 127.0.0.1.
 */
'use strict';
const { demarrer } = require('./banc-serveur-gestion.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++; console.log((bon ? '  ✓ ' : '  ✗ ') + t + (bon ? '' : '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a))); };
const vrai = (t, c, d) => { c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c || d === undefined ? '' : ' — ' + d)); };

const COMMUNS = 'ecrire,prendre,passer,terminer,demander_justin,demander';   // + `demander` (28 octobre 2026, Justin : « J\'aimerais que les agents communiquent entre eux »)
const ATTENDU = { Hugo: 'programmer_fin_abonnement', Margaux: 'preparer_mise_en_demeure,point_compta,verifier_factures,calendrier_compta,regler_compta' /* + 28 octobre 2026 : la compta de la Tour (test-3161) */, Emma: 'proposer_creneaux', Sarah: 'rediger_annonce', Victor: 'assigner,arbitrer,planifier_reunion,annuler_reunion' /* + 28 octobre 2026, test-3087 ; `assigner` : le chef répartit (test-3117) */, Max: '' };
const FILS = { hugo: 'Hugo', margaux: 'Margaux', emma: 'Emma', sarah: 'Sarah', victor: 'Victor', max: 'Max' };

(async () => {
  console.log('\n1. Justin écrit à six agents allumés : chacun reçoit les six outils communs, puis le sien et lui seul');
  const modes = {}; Object.keys(FILS).forEach(id => { modes[id] = 'brouillon'; });
  const S = await demarrer({ modes });
  try {
    vrai('le vrai serveur démarre et le patron se connecte', S.vivant && !!S.TP, S.journal().slice(-400));
    if (!S.vivant) return;
    for (const fil of Object.keys(FILS)) {
      const r = await S.post('/api/monitor/conversations/envoyer', { fil, texte: 'Bonjour, tu peux me dire où tu en es ce matin ?' });
      vrai('message de Justin déposé dans le fil de ' + FILS[fil], r.s === 200, r.s + ' ' + r.txt.slice(0, 120));
    }
    const nomDe = req => (/^Tu es ([^,]+),/.exec(String(req.system || '')) || [])[1] || '';
    const vus = () => { const m = {}; for (const q of S.claudeRecus()) { const n = nomDe(q); if (FILS[n.toLowerCase()] && !m[n]) m[n] = q; } return m; };
    await S.attendre(() => Object.keys(vus()).length >= Object.keys(FILS).length, 20000);
    const recus = vus();
    v('(population) une requête à Claude pour chacun des six agents réveillés', Object.keys(recus).sort(), Object.values(FILS).sort());
    for (const nom of Object.values(FILS)) {
      const q = recus[nom];
      if (!q) continue;
      const noms = (q.tools || []).map(t => t.name);
      v(nom + ' : les six outils communs, dans l\'ordre', noms.slice(0, 6).join(), COMMUNS);
      v(nom + ' : ' + (ATTENDU[nom] ? 'son outil « ' + ATTENDU[nom] + ' », et lui seul' : 'aucun outil de plus'), noms.slice(6).join(), ATTENDU[nom]);
    }
    vrai('le serveur ne s\'est pas plaint d\'un module des agents indisponible', !/indisponible/.test(S.journal()), (S.journal().match(/[^\n]*indisponible[^\n]*/) || [''])[0]);
  } finally { await S.fin(); }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

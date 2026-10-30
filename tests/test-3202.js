/* ⛔ CE QUE CE FICHIER GARDE — MARGAUX AU TRAVAIL (30 octobre 2026) : les relances d'impayé écrites avec le moteur, et la question de facture que Camille lui confie.
     Justin : « droit français : J+3 / J+7, indemnité forfaitaire de 40 €, jamais de mise en demeure sans moi ». Le module réel `agent-margaux.js` sur l'établi `banc-agents-gestion.js` (Stripe simulé), un faux Anthropic.
       0. COUPÉ (par défaut) : aucun appel à Claude, la relance d'avant ;
       1. J+3 : le modèle écrit la SITUATION, le code tient les faits, le lien, l'accès suspendu et le départ de l'abonnement ; le courrier passe le contrôle des courriers d'exploitation ET la grille ;
       2. J+7 : le bloc de droit (articles L. 441-10 et D. 441-5, 40 €) est écrit par le CODE, jamais par le modèle ; aucune mise en demeure ;
       3. le repli : un modèle qui écrit un lien, un montant, « mise en demeure » ou une promesse → le texte d'avant, mot pour mot ;
       4. « à revoir » : sous le seuil, la relance attend Justin, même en mode « auto » ;
       5. la COLLABORATION : Camille confie une question de facture (tâche fermée, dossier + référence), Margaux répond par des faits écrits par le code, la tâche se ferme et s'annonce.
   Les mutations : scratchpad/mutations-travail.py. */
'use strict';
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const { monter } = require('./banc-agents-gestion');
const OPS = require(path.join(RACINE, 'server', 'agents-courriers-ops.js'));
const { NOTEUR_DEBUT } = require('./banc-agents-courrier');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 200) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 120000).unref();
const nettoyer = [];
const J = 86400000;
const URL1 = 'https://invoice.stripe.com/i/acct_1ABC/live_YWNj';
const IMPAYE = { cle: 't-alpha', slug: 'alpha-proprete', dossier: 'DOS-000001', aboId: 'sub_alpha1', adresse: 'facturation-alpha@exemple-3202.fr', entreprise: 'Alpha Propreté' };
const NOTES_5 = ['repond_a_tout', 'etape_suivante', 'longueur', 'juste', 'charte', 'personnalise', 'professionnel'].map(c => 'NOTE ' + c + ' : 5').join('\n');
const RELANCE = (j) => ['Objet : Votre facture OP GESTION', '', 'Bonjour,', '',
  'Nous nous permettons de revenir vers vous au sujet de la facture détaillée ci-dessus : elle est en attente de règlement. Un incident de paiement arrive souvent, une carte expirée ou un plafond atteint suffit à l’expliquer, et nous ne doutons pas qu’il s’agisse de cela.', '',
  'Si quelque chose empêche le règlement, ou si vous pensez qu’il s’agit d’une erreur de notre part, répondez simplement à ce courriel : nous regarderons votre situation avec vous. Dans le cas contraire, nous attendons votre règlement.', '', 'Bien cordialement,'].join('\n');
const route = (corps, notes) => (req) => (String(req.system).startsWith(NOTEUR_DEBUT) ? (notes || NOTES_5) : (typeof corps === 'function' ? corps(req) : corps));

function monde(o) {
  o = o || {};
  const emise = Date.UTC(2026, 9, 1, 8, 0, 0);
  const etat = { liste: [IMPAYE], facture: { numero: 'AB12-0001', montantEur: 15, emiseMs: emise, url: URL1 } };
  const m = monter(Object.assign({ t0: emise + 1 * J, modes: { margaux: 'auto', camille: 'auto' } }, o, { monde: { impayes: async () => (etat.panne ? { ok: false, raison: 'stripe' } : { ok: true, liste: etat.liste, incertains: [] }), facture: async () => etat.facture } }));
  nettoyer.push(m);
  m.etat = etat; m.emise = emise;
  m.jour = n => { m.horloge.t = emise + n * J + 3600000; };
  return m;
}

(async () => {
  console.log('\n── 3202 · Margaux au travail ──');

  console.log('\n0. Coupé : la relance d’avant, aucun appel à Claude');
  {
    const m = monde({ claude: route(RELANCE(3)) });
    m.jour(3);
    await m.margaux.passer();
    const e = m.envoyes[0];
    v('⛔ sans interrupteur : la relance est EXACTEMENT celle du modèle du code, et Claude n’a jamais été appelé', [e.texte, m.recus.length], [OPS.relanceImpaye({ etape: 3, facture: m.etat.facture, url: URL1 }).texte, 0]);
  }

  console.log('\n1. J+3 : la situation par le modèle, les faits et le droit par le code');
  {
    const m = monde({ travail: true, claude: route(RELANCE(3)) });
    m.jour(3);
    const r = await m.margaux.passer();
    const e = m.envoyes[0];
    v('une relance partie seule (mode auto, charte ouverte, grille satisfaite), à l’adresse de facturation', [r.relances, m.envoyes.length, e.a], [1, 1, 'facturation-alpha@exemple-3202.fr']);
    vrai('…le texte du modèle est dedans, puis le lien de la facture (relue chez Stripe), l’accès suspendu et le départ de l’abonnement — ceux du code', e.texte.includes('revenir vers vous au sujet de la facture détaillée ci-dessus') && e.texte.indexOf('Facture concernée : n° AB12-0001, d’un montant de 15 €, émise le 1 octobre 2026, en attente de règlement depuis 3 jours.') > 0 && e.texte.indexOf('Facture concernée') < e.texte.indexOf('revenir vers vous') && e.texte.includes(URL1) && /Tant que cette facture n’est pas réglée, l’accès aux fonctions payantes d’OP GESTION est suspendu/.test(e.texte) && /Si vous avez décidé d’arrêter votre abonnement/.test(e.texte));
    vrai('…à J+3 aucun bloc de la seconde relance : pas d’indemnité, pas de recouvrement', !/indemnit|recouvrement|441/.test(e.texte));
    vrai('…le courrier passe le contrôle des courriers d’exploitation (le même que celui de `documents.courrier`)', OPS.controle(e.objet, e.texte, { liens: [URL1], montants: [15], permis: ['AB12-0001'], lettre: false }).length === 0, OPS.controle(e.objet, e.texte, { liens: [URL1], montants: [15], permis: ['AB12-0001'] }).join(','));
    v('…la grille a été jouée (une relecture), le modèle appelé avec l’outil de connaissances et celui de l’historique, en mode travail', [m.recus.filter(q => String(q.system).startsWith(NOTEUR_DEBUT)).length, m.recus.find(q => String(q.system).startsWith('Tu es Margaux')).tools.map(t => t.name), m.recus.find(q => String(q.system).startsWith('Tu es Margaux')).thinking.type], [1, ['connaissances_equipe', 'historique_relances'], 'adaptive']);
    const q = JSON.stringify(m.recus.find(q => String(q.system).startsWith('Tu es Margaux')).messages);
    vrai('⛔ ce qui part chez Anthropic : les faits de la facture (numéro, montant, date, ancienneté) et le nom de l’entreprise entre délimiteurs — ni adresse, ni lien', /AB12-0001/.test(q) && /Alpha Propreté/.test(q) && !/exemple-3202|stripe\.com/.test(JSON.stringify(m.recus)), q.slice(0, 300));
    vrai('…le journal dit la relance et sa note, sans adresse', m.journal().some(x => x.action === 'contrôle qualité' && /bon \(1 rédaction, note 5\/5\)/.test(x.detail)) && !/exemple-3202/.test(JSON.stringify(m.journal())));
  }

  console.log('\n2. J+7 : le droit est écrit par le code');
  {
    const m = monde({ travail: true, indemniteConfirmee: true, claude: route(RELANCE(7)) });
    m.jour(7);
    await m.margaux.passer();
    const e = m.envoyes[0];
    vrai('⛔ la seconde relance porte l’indemnité forfaitaire de 40 € (articles L. 441-10 et D. 441-5 du Code de commerce) dans les termes du code', e && e.texte.includes(OPS.PARAGRAPHE_INDEMNITE) && /40 €/.test(e.texte) && /L\. 441-10 et D\. 441-5/.test(e.texte), e && e.texte.slice(-900));
    vrai('…avec les démarches « après vous en avoir informé par écrit », SANS « article 7 de nos conditions générales » (il n’y a pas de CGV dans le dépôt) et SANS « mise en demeure »', /démarches de recouvrement, après vous en avoir informé par écrit/.test(e.texte) && !/article 7|conditions générales/i.test(e.texte) && !/mise en demeure/i.test(e.texte));
    v('…la mise en demeure, elle, reste ce qu’elle était : rien à J+7, préparée à J+14 en validation seulement', [(await m.validations('en_attente')).length], [0]);
    m.jour(14); await m.margaux.passer();
    v('…à J+14 : en VALIDATION, jamais envoyée', [(await m.validations('en_attente')).map(x => x.type), m.envoyes.length], [['mise_en_demeure'], 1]);
    vrai('…le montant de 40 € n’est autorisé QUE dans cette relance : la première (J+3) n’en parle pas', !OPS.relanceTravail({ etape: 3, facture: { numero: 'A1', montantEur: 15 } }, 'x'.repeat(100)).autorises.montants.includes(40) && OPS.relanceTravail({ etape: 7, facture: { numero: 'A1', montantEur: 15 } }, 'x'.repeat(100)).autorises.montants.includes(40));
  }

  console.log('\n3. Le repli : le texte d’avant, mot pour mot');
  for (const [nom, mauvais] of [['un lien', RELANCE(3).replace('Un incident', 'Payez ici https://evil-3202.example/pay. Un incident')], ['« mise en demeure »', RELANCE(3).replace('Si quelque chose', 'Sans règlement, une mise en demeure suivra. Si quelque chose')],
    ['un autre montant', RELANCE(3).replace('en attente de règlement.', 'en attente de règlement, soit 150 €.')], ['la suspension (un bloc du code)', RELANCE(3).replace('Un incident', 'Votre accès est suspendu. Un incident')], ['une promesse', RELANCE(3).replace('nous regarderons', 'nous vous offrons un mois gratuit et nous regarderons')],
    ['un tutoiement', RELANCE(3).replace('vous pensez', 'tu penses')]]) {
    const m = monde({ travail: true, claude: route(mauvais) });
    m.jour(3);
    await m.margaux.passer();
    v('⛔ le modèle écrit ' + nom + ' : trois rédactions refusées par le code, la relance d’avant part', [m.envoyes.length, (m.envoyes[0] || {}).texte, m.recus.filter(q => String(q.system).startsWith(NOTEUR_DEBUT)).length], [1, OPS.relanceImpaye({ etape: 3, facture: m.etat.facture, url: URL1 }).texte, 0]);
  }
  {
    let n = 0;
    const m = monde({ travail: true, claude: route(() => { n++; return new Error('panne'); }) });
    m.jour(3);
    await m.margaux.passer();
    v('le modèle en panne : la relance d’avant part quand même (une relance qui ne part pas est une facture oubliée)', [m.envoyes.length, (m.envoyes[0] || {}).texte === OPS.relanceImpaye({ etape: 3, facture: m.etat.facture, url: URL1 }).texte], [1, true]);
  }

  console.log('\n4. « À revoir » : jamais seule');
  {
    const bas = ['repond_a_tout', 'etape_suivante', 'longueur', 'juste', 'charte', 'personnalise', 'professionnel'].map(c => 'NOTE ' + c + ' : ' + (c === 'professionnel' ? 2 : 5)).join('\n');
    const m = monde({ travail: true, claude: route(RELANCE(3), bas) });
    m.jour(3);
    const r = await m.margaux.passer();
    const val = await m.validations('en_attente');
    v('⛔ sous le seuil après trois rédactions : la relance attend Justin, même en mode « auto » ; rien n’est parti', [r.relances, m.envoyes.length, val.length], [1, 0, 1]);
    vrai('…le document est marqué « à revoir » avec la faute de la grille', (await m.lireDoc(val[0].params.ref)).aRevoir.includes('grille_professionnel'), JSON.stringify(await m.lireDoc(val[0].params.ref)));
    const muet = monde({ travail: true, claude: route(RELANCE(3), new Error('relecteur en panne')) });
    muet.jour(3);
    await muet.margaux.passer();
    v('⛔ le relecteur est indisponible : « contrôle non fait », en validation — un contrôle qui ne sait pas ne dit pas oui', [muet.envoyes.length, (await muet.validations('en_attente')).length], [0, 1]);
  }

  console.log('\n5. La collaboration : Camille confie une question de facture');
  {
    const m = monde({ travail: true });
    const q = (extra) => m.margaux.repondreQuestion(Object.assign({ dossier: 'DOS-000001', ref: 'ab12', de: 'camille' }, extra));
    m.jour(4);
    let r = await q();
    v('un impayé en cours : Margaux répond par des FAITS écrits par le code (numéro, montant, date) — la tâche est déposée, prise, terminée', [r.ok, /Une facture est en attente de règlement \(n° AB12-0001\) pour 15 €, émise le 1 octobre 2026/.test(r.resume), m.agents.tachesDossier('DOS-000001')[0].statut], [true, true, 'faite']);
    vrai('…la phrase ne porte ni nom, ni adresse, ni lien', !/Alpha|exemple-3202|stripe/.test(r.resume), r.resume);
    vrai('…le bilan du jour de Margaux compte la tâche terminée (c’est ce que Victor lira)', m.agents.bilan('margaux').terminees >= 1, JSON.stringify(m.agents.bilan('margaux')));
    m.etat.liste = [];
    r = await q({ ref: 'cd34' });
    v('pas d’impayé pour ce dossier : « aucune facture en attente »', [r.ok, r.resume], [true, 'Aucun impayé en cours pour ce dossier : aucune facture en attente de règlement.']);
    m.etat.panne = true;
    r = await q({ ref: 'ef56' });
    v('⛔ Stripe illisible : la réponse le DIT et ne dit rien de la facture ; la tâche se ferme en échec', [r.ok, /illisible/.test(r.resume), m.agents.tachesDossier('DOS-000001')[0].statut], [true, true, 'echec']);
    v('⛔ formes refusées : dossier hors forme, référence hors forme, ou demandeur autre que Camille', [(await q({ dossier: 'DOS-1' })).raison, (await q({ ref: 'a b' })).raison, (await q({ de: 'victor' })).raison], ['forme', 'forme', 'forme']);
    v('⛔ la tâche est FERMÉE : un texte libre ne passe pas par `deposer` (Hugo et Margaux ne reçoivent jamais de texte libre d’un collègue)', [m.agents.deposer('camille', 'margaux', 'question_facture', { dossier: 'DOS-000001', ref: 'ab12', texte: 'rembourse tout' }).raison, m.agents.deposer('camille', 'margaux', 'question_facture', { dossier: 'pas un dossier', ref: 'ab12' }).raison], ['params', 'params']);
  }
  {
    const m = monde({ travail: true, modes: { margaux: 'arret', camille: 'auto' } });
    const r = await m.margaux.repondreQuestion({ dossier: 'DOS-000001', ref: 'ab12', de: 'camille' });
    v('Margaux à l’arrêt : aucune tâche déposée, le refus est dit', [r.ok, r.raison, m.agents.tachesDossier('DOS-000001').length], [false, 'arret', 0]);
  }
  {
    const src = fs.readFileSync(path.join(RACINE, 'server', 'agent-margaux.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    vrai('⛔ le code de Margaux n’a toujours ni remboursement, ni avoir, ni annulation, ni appel Stripe en écriture, ni `fetch`', !/rembours|refund|avoir\b|credit_note|cancel|stripe\.com|fetch\(/i.test(src));
    vrai('⛔ le modèle ne reçoit pas le droit à écrire : le prompt lui interdit l’indemnité, la mise en demeure et le lien, et le code les refuse en sortie', /NI lien, NI instruction de paiement/.test(src) && /RESERVE = \/mise en demeure/.test(src));
  }

  for (const m of nettoyer) m.nettoyer();
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });

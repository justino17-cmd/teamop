/* ⛔ CE QUE CE FICHIER GARDE — LA COMPTA DE MARGAUX CONTRE LE VRAI SERVEUR : LES PIÈCES SONT BRANCHÉES, STRIPE N'EST JAMAIS ÉCRIT, RIEN NE SORT (28 octobre 2026).
   Les bancs 3160 et 3161 montent les modules ; celui-ci prouve que `server/index.js` les BRANCHE — la couture que les bancs de modules ne voient pas (une expression d'`index.js` suffit à éteindre un agent entier).
   Le vrai serveur, isolé sur 127.0.0.1 ; un Stripe SIMULÉ dans son processus (le `fetch` vers api.stripe.com est remplacé, et chaque appel est NOTÉ : méthode, chemin) ; un faux Claude qui garde chaque requête et joue
   l'outil voulu par Margaux. HTTP seulement.
     · « le point du mois », de bout en bout, par la VRAIE route de la messagerie : de bons chiffres (factures, abonnés lus par le vrai `stripeAbosCalc`, périodes offertes lues dans le vrai registre des codes,
       relances lues dans le vrai registre de Margaux) dans le fil privé, en lignes du système ;
     · ⛔ TOUS les appels que le faux Stripe a vus pendant ces bancs sont des GET, et ce sont des lectures (factures, abonnements) : aucune écriture, nulle part, jamais — ni remboursement, ni avoir, ni annulation ;
     · ⛔ Stripe en panne dès le départ : « illisible, je ne donne aucun chiffre », pas un « 0 € » ;
     · ⛔ aucun chiffre de TeamOP dans ce que Claude reçoit, dans le journal des agents (route ET fichier), dans les journaux du serveur, dans « Équipe » ;
     · la porte : un compte collaborateur n'écrit pas dans le fil de Margaux (403), ne le lit pas, et ne déclenche aucune lecture de Stripe ; Justin qui demande dans un groupe n'obtient aucun chiffre ;
     · les cinq outils de Margaux (la mise en demeure ET les quatre de la compta) sont offerts au modèle. */
'use strict';
const fs = require('fs'), path = require('path');
const { demarrer, dormir } = require('./banc-serveur-gestion');
const B = require('./banc-compta');
const { parisParties, tsParis } = require('../server/agents-horaires');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c, d) => v(t + (!c && d !== undefined ? ' — ' + String(d).slice(0, 500) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 240 s'); process.exit(1); }, 240000).unref();

/* le mois courant de Paris, et des dates en plein milieu (le 15 à midi, heure de Paris) : le banc ne dépend pas du jour où il tourne */
const P = parisParties(Date.now());
const iso = (jour, h) => new Date(tsParis(P.annee, P.mois, jour, h || 12, 0)).toISOString();
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'][P.mois - 1] + ' ' + P.annee;
const LISTE = () => [
  B.facture({ id: 'in_r1', cents: 199900, cree: iso(15), payee: iso(15, 13), nom: 'Dupont Secrète SARL' }),
  B.facture({ id: 'in_r2', cents: 114375, cree: iso(15, 8), payee: iso(15, 9), nom: 'Martin Confidentiel' }),
  B.facture({ id: 'in_r3', status: 'open', cents: 1500, cree: iso(15, 10) }), B.facture({ id: 'in_r4', status: 'open', cents: 1500, cree: iso(15, 11) }), B.facture({ id: 'in_r5', status: 'open', cents: 1500, cree: iso(15, 14) }),
  B.facture({ id: 'in_r6', status: 'uncollectible', cents: 1500, cree: iso(15, 15) }), B.facture({ id: 'in_r7', status: 'open', attempted: true, cents: 1500, cree: iso(15, 16) }),
  B.facture({ id: 'in_r8', status: 'void', cents: 1500, cree: iso(15, 17) }),
];
/* 7 payants (3 Pro à 15 €, 2 Business à 25 €, 2 Premium à 196,25 €), 2 essais, 1 impayé, 1 annulé : revenu mensuel 3×15 + 2×25 + 2×196,25 = 487,50 € (un essai n'y compte pas) */
const ABOS = () => [B.sub('active', 'OP GESTION Pro', 1500), B.sub('active', 'OP GESTION Pro', 1500), B.sub('active', 'OP GESTION Pro', 1500), B.sub('active', 'OP GESTION Business', 2500), B.sub('active', 'OP GESTION Business', 2500),
  B.sub('active', 'OP GESTION Business Premium', 19625), B.sub('active', 'OP GESTION Business Premium', 19625), B.sub('trialing', 'OP GESTION Pro', 1500), B.sub('trialing', 'OP GESTION Business', 2500), B.sub('past_due', 'OP GESTION Pro', 1500), B.sub('canceled', 'OP GESTION Pro', 1500)];
const CHIFFRES = ['3 142,75', '3142,75', '3142.75', '487,50', '487,5', '314275'];
const SECRETS = /Dupont|Martin|Secr[èe]te|Confidentiel|exemple-banc|in_r\d|BANC-|sub_brut|cus_brut|cus_in_/;

const CLAUDE = `(r, n) => {
  const sys = String(r.system || '');
  if (!/^Tu es Margaux,/.test(sys)) return 'Ok.';
  const msgs = r.messages || [];
  const dernier = String((msgs[msgs.length - 1] || {}).content || '').split('\\n').pop();
  const nom = /vérifie/i.test(dernier) ? 'verifier_factures' : /calendrier/i.test(dernier) ? 'calendrier_compta' : /micro/i.test(dernier) ? 'regler_compta' : 'point_compta';
  const entree = nom === 'point_compta' ? { periode: /mois dernier/i.test(dernier) ? 'mois_dernier' : 'ce_mois' } : nom === 'regler_compta' ? { regime: 'micro' } : {};
  const dits = ['C’est fait, regarde juste en dessous.', 'Voilà, c’est écrit plus bas.', 'Je te l’ai mis juste dessous.', 'C’est noté et affiché ci-dessous.', 'Tout est sous ton message.', 'Regarde en dessous, c’est prêt.', 'Je m’en occupe, la suite est dessous.', 'Ça s’affiche juste après ma réponse.'];
  return { texte: dits[n % dits.length], actions: [{ nom, entree }] };
}`;

/* le registre de Margaux : 2 impayés suivis (3 relances parties, une mise en demeure préparée) et un impayé déjà réglé (ne compte pas) */
const registreMargaux = D => fs.writeFileSync(path.join(D, 'agents-margaux.json'), JSON.stringify({ impayes: {
  'ent-a': { aboId: 'sub_a', premierVu: 1, etapes: { 3: { ts: 1, voie: 'direct' }, 7: { ts: 2, voie: 'direct' } }, demeure: { ts: 3, ref: 'dc0123456789ab' }, reglee: 0 },
  'ent-b': { aboId: 'sub_b', premierVu: 1, etapes: { 3: { ts: 1, voie: 'direct' } }, demeure: null, reglee: 0 },
  'ent-c': { aboId: 'sub_c', premierVu: 1, etapes: { 3: { ts: 1, voie: 'direct' } }, demeure: null, reglee: 5 } } }));
/* les codes promo en cours : 3 entreprises en période offerte (la prochaine fin dans un mois), une terminée, une reportée (la même période, pas une de plus) */
const promos = D => {
  const jour = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  fs.writeFileSync(path.join(D, 'promos-usages.json'), JSON.stringify({
    CODEBANC1: { n: 4, equipes: { 'ent-1': { date: jour(-30), finLe: jour(40) }, 'ent-2': { date: jour(-10), finLe: jour(20) }, 'ent-3': { date: jour(-60), finLe: jour(-5) } } },
    CODEBANC2: { n: 2, equipes: { 'ent-4': { date: jour(-5), finLe: jour(80) }, 'ent-5': { date: jour(-5), finLe: jour(80), reporte: true } } } }));
  return jour(20);
};

(async () => {
  console.log('\n── 3162 · Margaux comptable contre le VRAI serveur : branchée, en lecture seule, sans rien dire à Anthropic ──');
  let prochaine = '';
  const S = await demarrer({ liste: LISTE(), abos: ABOS(), claude: CLAUDE, modes: { margaux: 'auto' }, avant: D => { registreMargaux(D); prochaine = promos(D); } });
  vrai('le serveur a démarré', S.vivant);
  if (!S.vivant) { console.log(S.journal().slice(-1500)); process.exit(1); }
  const P1 = (fil, texte) => S.post('/api/monitor/conversations/envoyer', { fil, texte });
  const lignes = async fil => { const r = await S.get('/api/monitor/conversations/' + fil); return r.j.messages || []; };
  const attendre = async (f, ms) => S.attendre(f, ms || 15000);

  console.log('\n1. « Margaux, le point du mois » — de bout en bout');
  {
    const r = await P1('margaux', 'Margaux, fais-moi le point du mois');
    vrai('(population) la messagerie de Justin accepte le message', r.s === 200 && r.j.ok, r.txt);
    await attendre(async () => (await lignes('margaux')).filter(m => m.de === 'systeme').length >= 4);
    const ms = await lignes('margaux'), sys = ms.filter(m => m.de === 'systeme').map(m => m.texte), tout = sys.join('\n');
    vrai('(population) Margaux a répondu et 4 à 6 lignes du système ont été écrites', ms.some(m => m.de === 'margaux') && sys.length >= 4 && sys.length <= 6, JSON.stringify(ms.map(m => m.de + ':' + m.texte.slice(0, 50))));
    vrai('⛔ chaque ligne ≤ 300 signes', sys.every(l => l.length <= 300), sys.map(l => l.length).join(','));
    vrai('l’encaissé du mois : 3 142,75 € sur 2 factures payées · 3 en attente · 2 refusées · 1 annulée (le vrai `stripePaiement`, la vraie pagination)', new RegExp('encaissé en ' + MOIS + ' \\(mois en cours\\) : 3 142,75 € \\(2 factures payées\\)').test(tout) && /en attente : 3/.test(tout) && /refusées : 2/.test(tout) && /annulées : 1/.test(tout), tout);
    vrai('les abonnés lus par le vrai `stripeAbosCalc` : 7 payants, 2 en essai, 1 en impayé, revenu mensuel 487,50 €', /Abonnés : 7 payants, 2 en essai, 1 en impayé/.test(tout) && /revenu mensuel récurrent : 487,50 €/.test(tout), tout);
    vrai('par formule : Pro 3 · Business 2 · Business Premium 2', /Par formule \(payants\) : Pro 3 · Business 2 · Business Premium 2/.test(tout), tout);
    vrai('les périodes offertes lues dans le vrai registre : 3 entreprises (la terminée et la reportée n’y sont pas), prochaine fin au jour du plus proche code', new RegExp('en période offerte \\(codes promo\\) : 3 entreprises, prochaine fin le ' + String(+prochaine.slice(8, 10)).replace(/^1$/, '1er') + ' ').test(tout), tout);
    vrai('les relances lues dans le vrai registre de Margaux : 2 impayés suivis · 3 relances parties · 1 mise en demeure préparée', /2 impayés suivis · 3 relances parties · 1 mise en demeure préparée/.test(tout), tout);
    vrai('⛔ aucun nom de client, aucun identifiant Stripe dans le fil', !SECRETS.test(JSON.stringify(ms)));
    vrai('la route des périodes offertes de la Tour compte les mêmes entreprises (3 actives hors reportée)', (await S.get('/api/monitor/promos')).j.actifsTotal === 3);

    console.log('\n2. ⛔ Aucun chiffre ne part chez Anthropic, ni ne reste dans un journal');
    const recus = S.claudeRecus(), corps = JSON.stringify(recus);
    vrai('(population) Claude a reçu au moins la requête de Margaux, avec ses cinq outils', recus.some(b => /^Tu es Margaux,/.test(b.system) && b.tools.map(t => t.name).slice(6).join() === 'preparer_mise_en_demeure,point_compta,verifier_factures,calendrier_compta,regler_compta'), JSON.stringify(recus.map(b => (b.tools || []).map(t => t.name).slice(6))));
    vrai('⛔ …et pas un chiffre du point, pas un nom de client dans tout ce qu’il a reçu', CHIFFRES.every(c => !corps.includes(c)) && !SECRETS.test(corps), corps.slice(0, 200));
    await P1('margaux', 'Merci Margaux');
    await attendre(async () => (await lignes('margaux')).filter(m => m.de === 'margaux').length >= 2);
    const corps2 = JSON.stringify(S.claudeRecus());
    vrai('⛔ …au tour suivant non plus (le point n’est pas relu)', CHIFFRES.every(c => !corps2.includes(c)) && !/Encaissé en|Abonnés :/.test(corps2));
    const jr = (await S.get('/api/monitor/agents/journal?limite=500')).txt;
    vrai('⛔ le journal des agents (route) : une ligne « point compta », aucun chiffre, aucun nom', /"action":"point compta"/.test(jr) && CHIFFRES.every(c => !jr.includes(c)) && !SECRETS.test(jr) && !/3 142|487/.test(jr), jr.slice(-300));
    const fj = fs.readFileSync(path.join(S.D, 'agents-journal.json'), 'utf8');
    vrai('⛔ …et le fichier du journal aussi', CHIFFRES.every(c => !fj.includes(c)) && !SECRETS.test(fj));
    const jsrv = S.journal();
    vrai('⛔ les journaux du serveur (stdout, stderr) : aucun chiffre, aucun nom', CHIFFRES.every(c => !jsrv.includes(c)) && !SECRETS.test(jsrv), jsrv.slice(-300));
    await dormir(300);
    const eq = JSON.stringify(await lignes('equipe')) + JSON.stringify(await lignes('clients'));
    vrai('⛔ rien de ces chiffres dans « Équipe » ni « Clients » (l’annonce dit seulement qu’un point a été fait)', CHIFFRES.every(c => !eq.includes(c)) && !/Encaissé en|Abonnés :/.test(eq), eq.slice(0, 300));

    console.log('\n3. Les autres outils, par la vraie route');
    await P1('margaux', 'Margaux, vérifie mes factures Stripe');
    await attendre(async () => (await lignes('margaux')).some(m => /À cocher toi-même/.test(m.texte)));
    let t = (await lignes('margaux')).filter(m => m.de === 'systeme').map(m => m.texte).join('\n');
    vrai('verifier_factures : le bilan en nombres et la liste à cocher', new RegExp('Factures de ' + P.annee + ' lues chez Stripe \\(brouillons exclus\\) : 8').test(t) && /Numéro : 8 sur 8/.test(t) && /mention de franchise \(293 B ou CIBS\) : 8 sur 8/.test(t) && /TVA facturée : 0 € \(0 attendu en franchise\)/.test(t) && /À cocher toi-même/.test(t), t);
    vrai('⛔ …sans un nom de client ni un numéro de facture', !SECRETS.test(t) && !/BANC-/.test(t));
    await P1('margaux', 'Margaux, le calendrier de la compta s’il te plaît');
    await attendre(async () => (await lignes('margaux')).some(m => /Calendrier de la compta de TeamOP/.test(m.texte)));
    t = (await lignes('margaux')).filter(m => m.de === 'systeme').map(m => m.texte).join('\n');
    vrai('calendrier_compta : les dates, le niveau de preuve, le cumul de l’année', /1er septembre 2027/.test(t) && /\[lu\]/.test(t) && /Encaissé chez Stripe depuis janvier : 3 142,75 €/.test(t), t.slice(-600));
    await P1('margaux', 'Margaux, je suis en micro-entreprise');
    await attendre(async () => (await lignes('margaux')).some(m => /J’ai noté/.test(m.texte)));
    const fr = JSON.parse(fs.readFileSync(path.join(S.D, 'compta-reglages.json'), 'utf8'));
    v('regler_compta : le régime est écrit dans compta-reglages.json (dans le dossier de données du serveur)', fr.regime, 'micro');
    vrai('…et rien ne traîne : pas de fichier temporaire', !fs.readdirSync(S.D).some(f => /compta-reglages.*\.tmp$/.test(f)));

    console.log('\n4. ⛔ Stripe n’est JAMAIS écrit');
    const appels = S.stripe().appels;
    vrai('(population) le faux Stripe a vu des lectures de factures ET d’abonnements', appels.some(a => /^\/v1\/invoices\?/.test(a.u)) && appels.some(a => /^\/v1\/subscriptions\?/.test(a.u)), appels.length + ' appels');
    v('⛔ TOUS les appels sont des GET', [...new Set(appels.map(a => a.m))], ['GET']);
    v('⛔ …aucun corps de requête, aucune clé d’idempotence (rien n’a été écrit)', [appels.filter(a => a.corps).length, appels.filter(a => a.cle).length], [0, 0]);
    vrai('…et rien d’autre que des factures et des abonnements', appels.every(a => /^\/v1\/(invoices|subscriptions)\?/.test(a.u)), [...new Set(appels.map(a => a.u.slice(0, 40)))].join(' | '));
    vrai('…les lectures de factures passent par la période (created[gte], created[lt]) et la pagination (limit=100)', appels.filter(a => /^\/v1\/invoices\?/.test(a.u)).every(a => /created\[gte\]=\d+&created\[lt\]=\d+/.test(a.u) && /limit=100/.test(a.u)));

    console.log('\n5. La porte : le patron seul, son fil privé seul');
    const avant = S.stripe().appels.length;
    const c1 = await S.post('/api/monitor/conversations/envoyer', { fil: 'margaux', texte: 'Margaux, fais-moi le point du mois' }, S.TA);
    v('un compte collaborateur ne peut pas écrire dans le fil de Margaux (403)', c1.s, 403);
    const c2 = await S.get('/api/monitor/conversations/margaux', S.TA);
    v('…ni le lire (403) : les chiffres restent au patron', [c2.s, CHIFFRES.some(c => c2.txt.includes(c))], [403, false]);
    await dormir(500);
    v('…et rien n’a été lu chez Stripe pour lui', S.stripe().appels.length, avant);
    await P1('equipe', '@margaux fais le point de l’argent devant toute l’équipe');
    await attendre(async () => (await lignes('equipe')).some(m => /ne s’écrivent que dans notre fil privé/.test(m.texte)));
    const eq2 = JSON.stringify(await lignes('equipe'));
    vrai('⛔ Justin demande dans « Équipe » : « je te réponds dans notre fil privé », et aucun chiffre', /ne s’écrivent que dans notre fil privé/.test(eq2) && CHIFFRES.every(c => !eq2.includes(c)) && !/Encaissé en|Abonnés :/.test(eq2), eq2.slice(0, 300));
  }
  await S.fin();

  console.log('\n6. ⛔ Stripe en panne dès le départ : « illisible », pas un seul « 0 € »');
  {
    const S2 = await demarrer({ liste: LISTE(), abos: ABOS(), claude: CLAUDE, modes: { margaux: 'auto' }, avant: D => { registreMargaux(D); promos(D); } });
    S2.poserStripe(e => { e.panneFactures = true; e.panneListe = true; });
    await S2.post('/api/monitor/conversations/envoyer', { fil: 'margaux', texte: 'Margaux, fais-moi le point du mois' });
    await S2.attendre(async () => ((await S2.get('/api/monitor/conversations/margaux')).j.messages || []).filter(m => m.de === 'systeme').length >= 3, 20000);
    const ms = (await S2.get('/api/monitor/conversations/margaux')).j.messages || [], sys = ms.filter(m => m.de === 'systeme').map(m => m.texte), tout = sys.join('\n');
    vrai('(population) des lignes ont été écrites', sys.length >= 3, tout);
    vrai('« Stripe illisible, je ne donne aucun chiffre »', sys.some(l => /^Stripe illisible, je ne donne aucun chiffre/.test(l)), tout);
    vrai('⛔ pas un « 0 € », pas un « 0 facture », pas de revenu, pas d’abonnés', !/\b0 €|0 facture|\b0 payants|revenu mensuel récurrent|Encaissé en|Abonnés :/.test(tout), tout);
    vrai('…ce qui n’est pas Stripe reste dit (les périodes offertes, les relances)', /3 entreprises/.test(tout) && /2 impayés suivis/.test(tout), tout);
    v('⛔ même en panne, TOUS les appels sont des GET', [...new Set(S2.stripe().appels.map(a => a.m))], ['GET']);
    await S2.fin();
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ERREUR ' + (e && e.stack || e)); process.exit(2); });

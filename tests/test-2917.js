/* ⛔ CE QUE CE FICHIER GARDE — HUGO, MARGAUX, EMMA ET SARAH CONTRE LE VRAI SERVEUR (23 octobre 2026) : les COUTURES que les bancs de module ne voient pas.
   `index.js` branche les modules des agents sur les verdicts du serveur (`espaceStripeAchat`, `espaceStripeDans`, `impayesGestion`, `espacePaye`, la facture en attente de Stripe) ;
   ce banc fait tourner le VRAI serveur, avec un Stripe simulé DANS son processus (qui NOTE chaque appel), la fausse boîte IMAP, un facteur SMTP de banc et un faux Claude qui joue des
   outils. Rien ne sort : 127.0.0.1 seulement.
     · la fin d'abonnement : la tâche fermée de Camille → UNE écriture chez Stripe (`cancel_at_period_end=true` sur l'abonnement SÛREMENT à l'entreprise, clé d'idempotence), l'accusé de
       réception à l'adresse du COMPTE signé Hugo, Justin et l'équipe prévenus par un numéro de dossier — et en « brouillon », une validation d'abord ;
     · « a-t-il payé ? » : la réponse de Hugo dans « Clients », lue sur le même verdict que l'application (impayé = impayé) ;
     · l'impayé : Margaux relance (J+3) à l'adresse de FACTURATION de Stripe avec la page de la facture en attente relue chez Stripe ; une seule fois ; la mise en demeure est PRÉPARÉE en
       validation, l'aperçu la montre, sans l'empreinte rien ne part, avec elle elle part signée TEAM OP ;
     · l'annonce : Sarah (l'outil de la messagerie, sur un message de Justin) la dépose, Justin valide, UN courriel par entreprise, le texte échappé ;
     · Emma : des créneaux au prospect (l'adresse de son dossier) ;
     · la facture que Margaux lit pour répondre à un collègue : des nombres tirés de Stripe ;
     · toutes les écritures vers Stripe de tout ce banc : une seule forme — la fin de période ; jamais un DELETE, un remboursement, un avoir ;
     · les routes : le patron seul écrit, un collaborateur lit, sans session rien. */
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const { demarrer, dormir } = require('./banc-serveur-gestion.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c) => v(t, !!c, true);
const serveurs = [];
const bilans = [];   // ce que chaque serveur a noté, relevé AVANT sa fin (le dossier jetable disparaît avec lui)
const fermer = async (S) => { try { bilans.push({ appels: S.stripe().appels, journal: S.journal() }); } catch (e) {} await S.fin(); };
const fin = () => { for (const s of serveurs) { try { fs.rmSync(s.banc, { recursive: true, force: true }); } catch (e) {} } };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 280 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 280000).unref();

const SRC = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
const prix = k => (new RegExp('^\\s*' + k + ": \\['(price_\\w+)'", 'm').exec(SRC) || [])[1];
const P_PRO = prix('pro');
const J = 86400000;
const MAINTENANT = Date.now();
const FIN_SEC = Math.floor((MAINTENANT + 20 * J) / 1000);
const aboStripe = (id, statut, ref, cus, mail) => ({ id, object: 'subscription', status: statut, created: Math.floor(MAINTENANT / 1000) - 40 * 86400, metadata: { espace: ref }, customer: { id: cus, email: mail },
  current_period_end: FIN_SEC, cancel_at_period_end: false, items: { data: [{ price: { id: P_PRO, unit_amount: 1500, recurring: { interval: 'month', interval_count: 1 } }, quantity: 1, current_period_end: FIN_SEC }] } });
const CLIENTS = { 'alpha@exemple-2917.fr': { email: 'alpha@exemple-2917.fr', entreprise: 'Alpha Nettoyage', inscrit: MAINTENANT - 3 * J },
  'beta@exemple-2917.fr': { email: 'beta@exemple-2917.fr', entreprise: 'Beta Nettoyage', inscrit: MAINTENANT - 2 * J },
  'gamma@exemple-2917.fr': { email: 'gamma@exemple-2917.fr', entreprise: 'Gamma Prospect', inscrit: MAINTENANT - 1 * J } };
const ESPACES = { 'alpha-nettoyage': { t: 't-alpha-2917', nom: 'Alpha Nettoyage', email: 'alpha@exemple-2917.fr', ts: MAINTENANT - 3 * J, formule: 'pro', quantite: 1 },
  'beta-nettoyage': { t: 't-beta-2917', nom: 'Beta Nettoyage', email: 'beta@exemple-2917.fr', ts: MAINTENANT - 2 * J, formule: 'pro', quantite: 1 } };
const FACTURE_BETA = (ageJours) => ({ id: 'in_beta', status: 'open', number: 'BETA-0001', amount_due: 1500, currency: 'eur', created: Math.floor((MAINTENANT - ageJours * J) / 1000), hosted_invoice_url: 'https://invoice.stripe.com/i/acct_banc/live_beta' });
const ABOS = () => [aboStripe('sub_alpha', 'active', 't-alpha-2917', 'cus_alpha', 'alpha@exemple-2917.fr'), aboStripe('sub_beta', 'past_due', 't-beta-2917', 'cus_beta', 'facturation-beta@exemple-2917.fr')];
const TACHE = (id, type, espace) => ({ id, ts: MAINTENANT, de: 'camille', vers: 'hugo', type, params: { espace }, statut: 'attente' });
const MODES = { hugo: 'auto', margaux: 'auto', emma: 'auto', sarah: 'auto', camille: 'auto' };
const nomDe = "const nom = q => ((/^Tu es (\\S+), l’agent/u.exec(q.system || '') || [])[1]);";

(async () => {
  console.log('\n── 2917 · Hugo, Margaux, Emma, Sarah contre le vrai serveur ──');
  try { require(path.join(RACINE, 'server', 'node_modules', 'web-push')); } catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }
  vrai('(population) le tarif Pro du serveur est lu', /^price_/.test(P_PRO || ''));

  /* ═══════════════ SERVEUR 1 : Hugo (auto), Margaux, les faits, les routes ═══════════════ */
  console.log('\n1. Hugo : la fin d\'abonnement, « a-t-il payé ? » — la tâche de Camille, un seul geste chez Stripe');
  let S = await demarrer({ modes: MODES, clients: CLIENTS, espaces: ESPACES, abos: ABOS(), factures: { 'sub:sub_beta': FACTURE_BETA(5), 'open:sub_beta': FACTURE_BETA(5),
      'cus:cus_beta': [Object.assign({}, FACTURE_BETA(5)), { id: 'in_beta0', status: 'paid', number: 'BETA-0000', amount_due: 1500, amount_paid: 1500, currency: 'eur', created: Math.floor((MAINTENANT - 35 * J) / 1000) }] },
    taches: [TACHE('k1', 'resilier_fin_periode', 'alpha-nettoyage'), TACHE('k2', 'verifier_paiement', 'beta-nettoyage'), TACHE('k3', 'preparer_espace', 'alpha-nettoyage')],
    claude: `(q, n) => { ${nomDe} const sys = q.system || ''; const dernier = (q.messages[q.messages.length - 1] || {}).content || '';
      if (nom(q) === 'Margaux') return 'Dernière facture du dossier DOS-000002 : impayée, 15 €.';
      if (nom(q) === 'Sarah' && /^Tu es Sarah, l’agent « Communication » de TeamOP\\./.test(sys)) return 'Objet : Une nouvelle version d’OP GESTION\\n\\nBonjour,\\n\\nVotre application OP GESTION vient de recevoir une mise à jour : le planning s’affiche plus vite sur téléphone <b>et</b> la fiche d’intervention garde vos photos hors ligne.\\n\\nBien cordialement,';
      if (nom(q) === 'Sarah') return { texte: 'Je rédige.', actions: [{ nom: 'rediger_annonce', entree: { type: 'version' } }] };
      return 'Bien reçu.'; }` });
  serveurs.push(S);
  if (!S.vivant) { console.log(S.journal().slice(0, 800)); process.exit(1); }
  const dossiers = (await S.get('/api/monitor/dossiers')).j.dossiers.map(d => d.numero + ':' + d.entreprise).sort();
  v('(population) trois dossiers numérotés dans l\'ordre d\'inscription', dossiers, ['DOS-000001:Alpha Nettoyage', 'DOS-000002:Beta Nettoyage', 'DOS-000003:Gamma Prospect']);
  let r = await S.post('/api/monitor/agents/hugo/passer');
  v('le passage de Hugo répond', r.s, 200);
  await S.attendre(async () => (await S.courriels()).length >= 1);
  const ecritures = S.stripe().appels.filter(a => a.m !== 'GET');
  v('⛔ UNE seule écriture chez Stripe : la fin de période de l\'abonnement d\'ALPHA (pas celui de Beta), avec sa clé d\'idempotence et la clé du serveur', ecritures.map(a => [a.m, a.u, a.corps, /^teamop-fin-periode-sub_alpha-\d{4}-\d{2}-\d{2}$/.test(a.cle), a.auth]), [['POST', '/v1/subscriptions/sub_alpha', 'cancel_at_period_end=true', true, 'Bearer sk_de_banc_gestion']]);
  v('…l\'état de Stripe : Alpha a une fin programmée, Beta non', S.stripe().abos.map(a => [a.id, a.cancel_at_period_end]), [['sub_alpha', true], ['sub_beta', false]]);
  let cs = await S.courriels();
  v('l\'accusé de réception part à l\'adresse du COMPTE d\'Alpha (celle de l\'annuaire), par la boîte contact', [cs.length, cs[0].to.includes('alpha@exemple-2917.fr'), /Votre demande d’arrêt/.test(cs[0].subject)], [1, true, true]);
  const finTxt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(FIN_SEC * 1000));
  vrai('…avec la date de fin de période de Stripe, la signature de Hugo, sans remboursement ni arrêt immédiat', cs[0].text.includes(finTxt) && /Hugo\s+Assistant virtuel · Équipe TeamOP/.test(cs[0].text) && !/rembours|immédiat/i.test(cs[0].text) && !/SIGNATURE|L'équipe TEAM OP\nsupport/.test(cs[0].text));
  const fh = (await S.get('/api/monitor/conversations/hugo')).j.messages.filter(m => m.de === 'hugo');
  vrai('Justin est prévenu dans le fil de Hugo : le dossier, la date, « aucun remboursement » — sans nom ni adresse', fh.some(m => /DOS-000001/.test(m.texte) && /aucun remboursement/.test(m.texte)) && !/Alpha|exemple-2917/.test(JSON.stringify(fh)));
  const fc = (await S.get('/api/monitor/conversations/clients')).j.messages.filter(m => m.de === 'hugo').map(m => m.texte);
  vrai('l\'équipe aussi : Camille citée', fc.some(t => /^@camille c’est fait pour le dossier DOS-000001/.test(t)));
  vrai('« a-t-il payé ? » pour Beta : l\'IMPAYÉ (le même verdict que l\'application), sans nom ni montant', fc.some(t => /^@camille dossier DOS-000002 : son paiement est en IMPAYÉ/.test(t)) && !/Beta|€|exemple-2917/.test(fc.join(' ')));
  const taches = (await S.get('/api/monitor/agents/taches')).j.taches;
  v('les deux tâches sont « faites » ; la troisième (« préparer un espace », que Hugo ne sait pas faire) n\'est PAS prise', ['k1', 'k2', 'k3'].map(id => taches.find(t => t.id === id).statut), ['faite', 'faite', 'attente']);
  const avant = S.stripe().appels.length;
  await S.post('/api/monitor/agents/hugo/passer');
  v('un second passage : rien de plus (aucun courriel, aucune écriture chez Stripe)', [(await S.courriels()).length, S.stripe().appels.slice(avant).filter(a => a.m !== 'GET').length], [1, 0]);

  console.log('\n2. Margaux : la relance J+3, une seule fois');
  r = await S.post('/api/monitor/agents/margaux/passer');
  v('le passage de Margaux : un impayé examiné, une relance', [r.s, r.j.examines, r.j.relances], [200, 1, 1]);
  await S.attendre(async () => (await S.courriels()).length >= 2);
  cs = await S.courriels();
  const rel = cs[1];
  v('la relance part à l\'adresse de FACTURATION de Stripe (pas celle du compte)', [cs.length, rel.to.includes('facturation-beta@exemple-2917.fr'), rel.to.includes('beta@exemple-2917.fr') && !rel.to.includes('facturation-beta')], [2, true, false]);
  vrai('…avec la page de la facture en attente RELUE chez Stripe, son numéro, son montant ; signée Margaux ; ton courtois', rel.text.includes('https://invoice.stripe.com/i/acct_banc/live_beta') && /BETA-0001/.test(rel.text) && /15 €/.test(rel.text) && /Margaux\s+Assistante virtuelle · Équipe TeamOP/.test(rel.text) && !/recouvrement/.test(rel.text));
  vrai('…et aucune écriture chez Stripe pour ça', S.stripe().appels.filter(a => a.m !== 'GET').length === 1);
  await S.post('/api/monitor/agents/margaux/passer');
  v('⛔ un second passage le même jour : AUCUNE autre relance', (await S.courriels()).length, 2);
  vrai('l\'état est sur disque (la marque J+3 posée)', Object.values(S.fichier('agents-margaux.json').impayes)[0].etapes['3'].voie === 'direct');

  console.log('\n3. Les faits que Margaux lit pour répondre à un collègue : des nombres tirés de Stripe');
  await S.post('/api/monitor/conversations/envoyer', { fil: 'margaux', texte: 'Margaux, peux-tu me dire où en est la facture du dossier DOS-000002 ?' });
  await S.attendre(() => S.claudeRecus().some(q => /Tu es Margaux, l’agent « Facturation et compta » de Team OP/.test(q.system)));
  const qm = S.claudeRecus().filter(q => /Tu es Margaux, l’agent « Facturation et compta » de Team OP/.test(q.system)).pop();
  const ligne = (qm.system.match(/\nfacture DOS-000002 (\{.*\})/) || [])[1];
  let fait = null; try { fait = JSON.parse(ligne); } catch (e) {}
  vrai('le prompt porte « facture DOS-000002 {…} » : deux factures, la dernière IMPAYÉE de 15 € (nombres et valeurs de liste)', fait && fait.nb === 2 && fait.factures[0].statut === 'impaye' && fait.factures[0].montantEur === 15 && fait.factures[1].statut === 'paye' && Number.isInteger(fait.factures[0].annee));
  vrai('⛔ ni nom, ni adresse, ni numéro de facture, ni lien dans ce qui part chez Claude', !/Beta|exemple-2917|BETA-000|invoice\.stripe|facturation-beta/.test(JSON.stringify(qm)));
  vrai('…Margaux répond dans son fil', (await S.get('/api/monitor/conversations/margaux')).j.messages.some(m => m.de === 'margaux' && /impayée, 15 €/.test(m.texte)));

  console.log('\n4. Les routes : le patron écrit, un collaborateur lit, sans session rien');
  const ECRITURES = [['/api/monitor/agents/margaux/passer', {}], ['/api/monitor/agents/emma/disponibilites', {}], ['/api/monitor/agents/emma/proposer', { dossier: 'DOS-000003' }], ['/api/monitor/agents/sarah/rediger', { type: 'version', notes: 'Le planning est plus rapide sur téléphone.' }],
    ['/api/monitor/agents/documents/modifier', { ref: 'dc000000000000', objet: 'a', texte: 'b' }]];
  v('⛔ un collaborateur n\'écrit rien : 403 sur les cinq routes', (await Promise.all(ECRITURES.map(([ch, c]) => S.post(ch, c, S.TA)))).map(x => x.s), [403, 403, 403, 403, 403]);
  v('sans session : refusé (401 ou 403) sur les cinq', (await Promise.all(ECRITURES.map(([ch, c]) => S.post(ch, c, '')))).map(x => x.s === 401 || x.s === 403), [true, true, true, true, true]);
  v('un collaborateur LIT les disponibilités d\'Emma et les documents ; sans session : refusé', [(await S.get('/api/monitor/agents/emma/disponibilites', S.TA)).s, (await S.get('/api/monitor/agents/documents?refs=dc000000000000', S.TA)).s, (await S.get('/api/monitor/agents/documents?refs=dc000000000000', '')).s >= 401], [200, 200, true]);
  const gestes = (await S.get('/api/monitor/actions')).j;
  void gestes;
  await fermer(S);

  /* ═══════════════ SERVEUR 2 : la mise en demeure, l'annonce, Emma ═══════════════ */
  console.log('\n5. Margaux : la mise en demeure PRÉPARÉE (un impayé de 16 jours, deux relances parties)');
  const premier = MAINTENANT - 20 * J;
  S = await demarrer({ modes: MODES, clients: CLIENTS, espaces: ESPACES, abos: ABOS(), factures: { 'sub:sub_beta': FACTURE_BETA(16), 'open:sub_beta': FACTURE_BETA(16) },
    avant: D => fs.writeFileSync(path.join(D, 'agents-margaux.json'), JSON.stringify({ impayes: { 't-beta-2917': { aboId: 'sub_beta', premierVu: premier, etapes: { 3: { ts: MAINTENANT - 13 * J, voie: 'direct' }, 7: { ts: MAINTENANT - 9 * J, voie: 'direct' } }, demeure: null, reglee: 0 } } })),
    claude: `(q, n) => { ${nomDe}
      if (nom(q) === 'Sarah' && /^Tu es Sarah, l’agent « Communication » de TeamOP\\./.test(q.system || '')) return 'Objet : Une nouvelle version d’OP GESTION\\n\\nBonjour,\\n\\nVotre application OP GESTION vient de recevoir une mise à jour : le planning s’affiche plus vite sur téléphone <b>et</b> la fiche d’intervention garde vos photos hors ligne.\\n\\nBien cordialement,';
      if (nom(q) === 'Sarah') return { texte: 'Je rédige.', actions: [{ nom: 'rediger_annonce', entree: { type: 'version' } }] };
      return 'Bien reçu.'; }` });
  serveurs.push(S);
  if (!S.vivant) { console.log(S.journal().slice(0, 800)); process.exit(1); }
  r = await S.post('/api/monitor/agents/margaux/passer');
  v('le passage prépare UNE mise en demeure, n\'envoie AUCUNE relance (déjà parties)', [r.j.demeures, r.j.relances, (await S.courriels()).length], [1, 0, 0]);
  let vals = (await S.get('/api/monitor/agents/validations')).j.validations;
  v('elle attend dans « Validations » (type mise_en_demeure, agent margaux)', vals.map(x => [x.type, x.agent]), [['mise_en_demeure', 'margaux']]);
  const ref = vals[0].params.ref;
  const doc = (await S.get('/api/monitor/agents/documents?refs=' + ref)).j[ref];
  vrai('l\'aperçu : la lettre à l\'adresse de facturation, la facture, le montant, « deux fois », l\'article 7, signée TEAM OP', doc.a === 'facturation-beta@exemple-2917.fr' && /facture n° BETA-0001/.test(doc.texte) && /15 €/.test(doc.texte) && /deux fois/.test(doc.texte) && /article 7/.test(doc.texte) && doc.signature.startsWith('TEAM OP'));
  vrai('…le registre de Margaux garde la référence de la mise en demeure', Object.values(S.fichier('agents-margaux.json').impayes)[0].demeure.ref === ref);
  await S.post('/api/monitor/agents/margaux/passer');
  v('⛔ un second passage ne la prépare pas deux fois', (await S.get('/api/monitor/agents/validations?statut=tout')).j.validations.filter(x => x.type === 'mise_en_demeure').length, 1);
  v('sans l\'empreinte du texte lu : 409, rien ne part', [(await S.post('/api/monitor/agents/validations/decider', { id: vals[0].id, decision: 'accepter' })).s, (await S.courriels()).length], [409, 0]);
  const acc = await S.post('/api/monitor/agents/validations/decider', { id: vals[0].id, decision: 'accepter', empreinte: doc.empreinte });
  await S.attendre(async () => (await S.courriels()).length >= 1);
  cs = await S.courriels();
  v('Justin valide avec l\'empreinte : la lettre part, UNE fois, signée TEAM OP (pas par un agent)', [acc.s, acc.j.validation.execution, cs.length, cs[0].to.includes('facturation-beta@exemple-2917.fr'), /^Madame, Monsieur,/.test(cs[0].text), /\nTEAM OP\s*\ncontact@teamop\.fr · teamop\.fr/.test(cs[0].text), /Assistante virtuelle/.test(cs[0].text)], [200, 'ok', 1, true, true, true, false]);

  console.log('\n6. Sarah : l\'annonce, par l\'outil de la messagerie, sur un message de Justin');
  const msgSarah = '@sarah rédige l\'annonce de la version : le planning s’affiche plus vite sur téléphone et la fiche d’intervention garde les photos hors ligne.';
  await S.post('/api/monitor/conversations/envoyer', { fil: 'sarah', texte: msgSarah });
  await S.attendre(async () => (await S.get('/api/monitor/agents/validations')).j.validations.some(x => x.type === 'annonce_clients'));
  vals = (await S.get('/api/monitor/agents/validations')).j.validations.filter(x => x.type === 'annonce_clients');
  v('l\'annonce est déposée en validation ; aucun courriel n\'est parti', [vals.length, (await S.courriels()).length], [1, 1]);
  const refA = vals[0].params.ref;
  const docA = (await S.get('/api/monitor/agents/documents?refs=' + refA)).j[refA];
  v('l\'aperçu : à deux entreprises (celles de l\'annuaire qui ont une adresse), pas à « tous les clients » du site', [docA.cible, docA.signature], ['Tous les clients (2 entreprises)', '']);
  const accA = await S.post('/api/monitor/agents/validations/decider', { id: vals[0].id, decision: 'accepter', empreinte: docA.empreinte });
  await S.attendre(async () => (await S.courriels()).length >= 3);
  cs = await S.courriels();
  const ann = cs.slice(1);
  v('Justin valide : UN courriel par entreprise (adresse du compte), l\'objet de l\'annonce', [accA.s, ann.length, ann.map(c => c.to.replace(/.*<|>.*/g, '')).sort(), ann.every(c => /Une nouvelle version d’OP GESTION/.test(c.subject))], [200, 2, ['alpha@exemple-2917.fr', 'beta@exemple-2917.fr'], true]);
  vrai('⛔ le texte de Claude est ÉCHAPPÉ dans le HTML (« <b> » reste du texte)', ann.every(c => /&lt;b&gt;et&lt;\/b&gt;/.test(c.html) && !/<b>et<\/b>/.test(c.html)));
  v('⛔ une seconde acceptation : refusée, rien ne repart', [(await S.post('/api/monitor/agents/validations/decider', { id: vals[0].id, decision: 'accepter', empreinte: docA.empreinte })).s, (await S.courriels()).length], [409, 3]);
  const recuSarah = S.claudeRecus().find(q => /^Tu es Sarah, l’agent « Communication » de TeamOP\./.test(q.system || ''));
  vrai('la rédaction est partie des notes de Justin mot pour mot', recuSarah && /le planning s’affiche plus vite sur téléphone et la fiche d’intervention garde les photos hors ligne/.test(recuSarah.messages[0].content));

  console.log('\n7. Emma : les créneaux d\'un prospect, à l\'adresse de son dossier');
  const dispo = { actif: true, dureeMin: 30, preavisH: 24, nb: 3, horizonJours: 14, jours: { 1: [['09:00', '12:00']], 2: [['09:00', '12:00']], 3: [['09:00', '12:00']], 4: [['09:00', '12:00']], 5: [['09:00', '12:00']], 6: [], 7: [] } };
  v('Justin règle ses disponibilités', (await S.post('/api/monitor/agents/emma/disponibilites', { dispo })).s, 200);
  v('une forme hostile : 400', (await S.post('/api/monitor/agents/emma/disponibilites', { dispo: Object.assign({}, dispo, { nb: 99 }) })).s, 400);
  await S.post('/api/monitor/agents/charte', { gestes: { repondre_client: { auto: true } } });
  r = await S.post('/api/monitor/agents/emma/proposer', { dossier: 'DOS-000003' });
  v('Justin demande des créneaux pour le prospect du dossier 3 : trois créneaux', [r.s, r.j.ok, r.j.creneaux], [200, true, 3]);
  await S.attendre(async () => (await S.courriels()).length >= 4);
  cs = await S.courriels();
  const cr = cs[3];
  vrai('le courriel part à l\'adresse du DOSSIER (celle de Gamma, qui n\'a pas d\'espace), signé Emma, trois créneaux à l\'heure de Paris', cr.to.includes('gamma@exemple-2917.fr') && /Emma\s+Assistante virtuelle/.test(cr.text) && /1\. \w+ \d+ \w+ à \d+ h \d\d/.test(cr.text) && /3\. \w+ \d+ \w+ à \d+ h \d\d/.test(cr.text) && !/Justin|Gamma/.test(cr.text));
  vrai('…et le rendez-vous à venir se lit dans la Tour une fois choisi (liste vide pour l\'instant)', (await S.get('/api/monitor/agents/emma/disponibilites')).j.rendezVous.length === 0);
  vrai('les fils ne portent ni nom ni adresse (Emma, Hugo, Margaux, Sarah, Clients)', !/Alpha|Beta|Gamma|exemple-2917/.test(JSON.stringify(await Promise.all(['emma', 'hugo', 'margaux', 'sarah', 'clients'].map(async f => (await S.get('/api/monitor/conversations/' + f)).j.messages)))));
  await fermer(S);

  /* ═══════════════ SERVEUR 3 : Hugo en « brouillon » ═══════════════ */
  console.log('\n8. Hugo en « brouillon » : la fin d\'abonnement attend Justin');
  S = await demarrer({ modes: Object.assign({}, MODES, { hugo: 'brouillon' }), clients: CLIENTS, espaces: ESPACES, abos: ABOS(), taches: [TACHE('k1', 'resilier_fin_periode', 'alpha-nettoyage')] });
  serveurs.push(S);
  if (!S.vivant) { console.log(S.journal().slice(0, 800)); process.exit(1); }
  await S.post('/api/monitor/agents/hugo/passer');
  vals = (await S.get('/api/monitor/agents/validations')).j.validations;
  v('une validation « fin d\'abonnement », AUCUN appel d\'écriture chez Stripe, AUCUN courriel', [vals.map(x => [x.type, x.params]), S.stripe().appels.filter(a => a.m !== 'GET').length, (await S.courriels()).length], [[['resilier_fin_periode', { espace: 'alpha-nettoyage' }]], 0, 0]);
  vrai('…le résumé dit le dossier, la fin de période, « rien n\'est coupé avant » — sans le nom', /DOS-000001/.test(vals[0].resume) && /rien n’est coupé avant/.test(vals[0].resume) && !/Alpha/.test(vals[0].resume));
  const accR = await S.post('/api/monitor/agents/validations/decider', { id: vals[0].id, decision: 'accepter' });
  await S.attendre(async () => (await S.courriels()).length >= 1);
  v('Justin accepte : la fin est programmée chez Stripe, l\'accusé part', [accR.s, accR.j.validation.execution, S.stripe().abos[0].cancel_at_period_end, (await S.courriels()).length], [200, 'ok', true, 1]);
  await fermer(S);

  /* ═══════════════ LE BILAN DE TOUT LE BANC : CE QUI A ÉTÉ ÉCRIT CHEZ STRIPE ═══════════════ */
  console.log('\n9. Tout ce banc : les écritures vers Stripe');
  const tous = bilans.flatMap(b => b.appels);
  vrai('(population) les appels à Stripe ont été relevés (lectures et écritures)', tous.length > 10 && tous.some(a => a.m === 'POST'));
  v('⛔ toute écriture est « cancel_at_period_end=true » sur UN abonnement — jamais un DELETE, un remboursement, un avoir, une annulation immédiate', [...new Set(tous.filter(a => a.m !== 'GET').map(a => a.m + ' ' + a.corps + ' ' + /^\/v1\/subscriptions\/sub_\w+$/.test(a.u)))], ['POST cancel_at_period_end=true true']);
  vrai('…et aucun appel ne vise une route de remboursement, d\'avoir ou d\'annulation', !tous.some(a => /refund|credit_note|\/cancel/.test(a.u)));
  const tout = bilans.map(b => b.journal).join('\n');
  vrai('le journal du serveur : aucune exception non rattrapée, aucun « is not defined »', !/is not defined|Cannot read|TypeError|ReferenceError|Unhandled|UnhandledPromiseRejection/.test(tout));
  vrai('…et aucune adresse de client en clair dans le journal du serveur', !/alpha@exemple-2917|facturation-beta@exemple-2917|beta@exemple-2917|gamma@exemple-2917/.test(tout));

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });

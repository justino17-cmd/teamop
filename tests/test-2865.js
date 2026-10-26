/* ⛔ CE QUE CE FICHIER GARDE — LA TOUR PARLE AU SERVEUR : L'APERÇU D'UN BROUILLON, SA CORRECTION, « VALIDER ET ENVOYER » (23 octobre 2026).
     La couture que ni `test-2864` (le serveur) ni une relecture de `tour.html` ne voient : les VRAIES fonctions de la page (`agBrCharger`, `agBrApercu`,
     `agBrModifier`, `agBrEnregistrer`, `agDecider`, `apiGet`, `apiPost`, `chargerAgents`, et le bloc qui dessine la liste des validations) font parler le VRAI
     serveur (facteur SMTP et fausse boîte de banc, faux Claude) — c'est la règle de CLAUDE.md : dès qu'une page appelle une route neuve, un banc fait parler la
     VRAIE fonction de la page au VRAI serveur.
       · l'aperçu montre le destinataire, l'objet, le texte et la signature de l'agent ; le bouton s'appelle « Valider et envoyer » ;
       · ⛔ un brouillon qu'on n'a pas pu LIRE ne se valide pas (bouton éteint, la phrase le dit) ; pendant la correction non plus ;
       · la correction passe par la vraie route : réussie, l'aperçu change ; REFUSÉE (403, 400), le refus se DIT dans le formulaire resté ouvert ;
       · « Valider et envoyer » : la confirmation parle d'envoi, le serveur envoie UN courriel, la liste se recharge ;
       · les AUTRES types de validation n'ont ni aperçu, ni nouveau libellé, ni nouvelle confirmation. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 200) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 120000).unref();

(async () => {
  console.log('\n── 2865 · la Tour : aperçu, correction et « Valider et envoyer » d’un brouillon — les vraies fonctions, le vrai serveur ──');
  try { require(path.join(RACINE, 'server', 'node_modules', 'web-push')); require.resolve('imapflow', { paths: [path.join(RACINE, 'server')] }); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }
  const T = fs.readFileSync(process.env.TOUR_FICHIER ? path.resolve(process.env.TOUR_FICHIER) : path.join(RACINE, 'tour.html'), 'utf8');
  const corps = (src, entete) => { const i = src.indexOf(entete); if (i < 0) return ''; let j = src.indexOf('{', i), p = 0; for (let k = j; k < src.length; k++) { const c = src[k]; if (c === '{') p++; else if (c === '}') { p--; if (!p) return src.slice(i, k + 1); } } return ''; };
  const FN = ['apiGet', 'apiPost', 'msgErreur', 'hAuth', 'srvRepond', 'srvMuet', 'esc', 'acSquel', 'fmtDate', 'agParId', 'agNom', 'agParams', 'agIllisible', 'agBrRef', 'agBrCharger', 'agBrApercu', 'agBrCtrl', 'agBrModifier', 'agBrAnnuler', 'agBrEnregistrer', 'agDecider', 'agDecisionMsg', 'chargerAgents']
    .map(n => corps(T, 'function ' + n + '('));
  v('(population) les vingt-trois fonctions de la page sont trouvées dans le fichier livré', FN.map(f => f.length > 30).filter(Boolean).length, 23);
  const iA = T.indexOf('var AG={'), jA = T.indexOf('};\nvar AG_MODES', iA);
  const AGSRC = iA > 0 && jA > iA ? T.slice(iA, jA + 2) : '';
  const TYPES = (/var AG_TYPES=\{[\s\S]*?\};/.exec(T) || [''])[0], STAT = (/var AG_STATUTS=\{[^}]*\};/.exec(T) || [''])[0];
  const iV = T.indexOf("} else if(AG.sec==='valid'){"), jV = T.indexOf("} else if(AG.sec==='journal'){", iV);
  const BLOC = iV > 0 && jV > iV ? T.slice(iV + "} else if(AG.sec==='valid'){".length, jV) : '';
  v('(population) l’état AG, les deux tables et le bloc de la liste des validations sont trouvés', [AGSRC.length > 100, TYPES.length > 50, STAT.length > 30, BLOC.length > 500], [true, true, true, true]);
  vrai('l’état de la page porte `br` (les brouillons)', /br:\{lec:0,d:\{\}/.test(AGSRC));

  const { demarrer, dormir } = require('./banc-serveur-courrier.js');
  const { COURRIEL } = require('./banc-agents-courrier.js');
  const { simpleParser } = require(path.join(RACINE, 'server', 'node_modules', 'mailparser'));
  const S = await demarrer({ modes: { lea: 'brouillon' }, comptes: true, claude: "(r, n) => " + JSON.stringify(COURRIEL) });
  vrai('le serveur démarre', S.vivant);
  if (!S.vivant) { console.log(S.journal().slice(0, 600)); await S.fin(); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  /* Léa part de la première synchro d'un compte dont l'adresse est PROUVÉE (la route publique ne la déclenche plus) */
  for (const [e, c] of [['a@tour-2865.fr', 'Société Alpha'], ['b@tour-2865.fr', 'Société Beta']]) await S.inscrire(e, c);
  vrai('(population) deux validations de Léa attendent', await S.attendre(async () => ((await S.get('/api/monitor/agents/validations')).j.validations || []).length === 2, 20000));

  /* ── la page : ses fonctions réelles, le serveur réel ── */
  let jeton = S.TP, confirmations = [], toasts = [], rendus = 0, chargesAgents = 0;
  const bac = { API: S.B, fetch, Promise, JSON, Date, String, Array, Math, Object, Error, Number, parseInt, encodeURIComponent,
    get TOKEN() { return jeton; }, srvEtat() {}, doLogout() {}, INJOIGNABLE: 'Serveur injoignable — nouvelle tentative dans un instant.',
    MYROLE: 'patron', TAB: 'agents', render() { rendus++; }, toast(t) { toasts.push(String(t)); }, confirm(t) { confirmations.push(String(t)); return true; }, agCvCharger() {} };
  vm.createContext(bac);
  vm.runInContext(AGSRC + '\n' + TYPES + '\n' + STAT + '\n' + FN.join('\n') + '\nthis.AG=AG;this.AG_TYPES=AG_TYPES;this.AG_STATUTS=AG_STATUTS;' +
    ['agBrCharger', 'agBrApercu', 'agBrModifier', 'agBrAnnuler', 'agBrEnregistrer', 'agDecider', 'agDecisionMsg', 'chargerAgents', 'agBrRef'].map(n => 'this.' + n + '=' + n + ';').join('') +
    '\nthis.liste=function(){ var h=""; ' + BLOC + ' return h; };', bac);
  const AG = bac.AG;
  /* le chargement RÉEL de l'onglet : la liste des validations, puis les aperçus des brouillons — c'est `chargerAgents` qui les enchaîne */
  const charger = async () => { AG.br.lec = 0; AG.br.d = {}; AG.lec.validations = 0; await bac.chargerAgents(); };

  /* 1. avant toute lecture du brouillon */
  AG.validations = (await S.get('/api/monitor/agents/validations?statut=tout')).j.validations; AG.lec.validations = 1;
  const vals = AG.validations.slice().sort((a, b) => a.ts - b.ts);
  const refA = vals.find(x => /Alpha/.test(x.resume)).params.fil, refB = vals.find(x => /Beta/.test(x.resume)).params.fil;
  AG.br.lec = 0;
  let h = bac.liste();
  vrai('brouillon pas encore lu : l’aperçu est un squelette et « Valider et envoyer » est ÉTEINT', /class="ag-ligne ag-br"/.test(h) && /ag-squel|ac-squel/.test(h) && (h.match(/<button[^>]*class="ag-btn ok"[^>]*disabled[^>]*>Valider et envoyer<\/button>/g) || []).length === 2, h.slice(0, 600));
  AG.br.lec = -1;
  h = bac.liste();
  vrai('⛔ brouillon ILLISIBLE : la phrase le dit (« n’a pas pu être lu »), le bouton reste éteint', /n’a pas pu être lu/.test(h) && (h.match(/class="ag-btn ok"[^>]*disabled/g) || []).length === 2);

  /* 2. lu */
  await charger();
  v('⛔ (population) le chargement de l’onglet lit les deux aperçus par la vraie route (c’est lui qui enchaîne validations puis aperçus)', [AG.lec.validations, AG.br.lec, Object.keys(AG.br.d).sort()], [1, 1, [refA, refB].sort()]);
  h = bac.liste();
  vrai('l’aperçu montre le destinataire, l’objet et le texte', h.includes('a@tour-2865.fr') && h.includes('TeamOP — OP GESTION pour votre activité') && h.includes('Nous vous remercions pour votre inscription sur teamop.fr'), h.slice(0, 400));
  vrai('…et la signature DE L’AGENT qui sera ajoutée à l’envoi (« Léa — Assistante de TeamOP », pas celle du Courrier de Justin)', h.includes('Léa — Assistante de TeamOP') && !h.includes('L\'équipe TEAM OP') && !h.includes('L&#39;équipe TEAM OP'));
  vrai('⛔ le bouton principal s’appelle « Valider et envoyer » et il est ALLUMÉ ; « Modifier » est proposé au patron',
    (h.match(/<button[^>]*class="ag-btn ok"(?![^>]*disabled)[^>]*>Valider et envoyer<\/button>/g) || []).length === 2 && (h.match(/>Modifier<\/button>/g) || []).length === 2, h.slice(-800));
  vrai('aucun autre bouton ne s’appelle plus simplement « Valider » pour ces deux lignes', !/>Valider<\/button>/.test(h));

  /* 3. un type de validation sans brouillon n'est PAS touché */
  const autre = { id: 'zz0000000000', ts: Date.now(), agent: 'hugo', type: 'creer_espace', resume: 'Créer un espace', params: { espace: 'toka', formule: 'pro' }, statut: 'en_attente' };
  AG.validations = AG.validations.concat([autre]);
  h = bac.liste();
  const ligneAutre = h.split('<div class="ag-ligne').filter(x => /Créer un espace/.test(x)).join('');
  vrai('une validation « creer_espace » : pas d’aperçu, pas de classe ag-br, bouton « Valider »', ligneAutre && !/ag-apercu/.test(ligneAutre) && !/ag-br/.test(ligneAutre) && />Valider<\/button>/.test(ligneAutre) && !/Valider et envoyer/.test(ligneAutre), ligneAutre);
  confirmations = [];
  await bac.agDecider('zz0000000000', 'accepter');
  vrai('…et sa confirmation est celle d’avant', confirmations.length === 1 && /^Valider cette demande \? Elle sera exécutée si l’agent en a la charge\.$/.test(confirmations[0]), confirmations.join('|'));
  AG.validations = AG.validations.filter(x => x.id !== 'zz0000000000'); AG.busy = false;

  /* 4. la correction */
  bac.agBrModifier(refA);
  v('« Modifier » ouvre le formulaire avec l’objet et le texte actuels', [AG.br.edit, AG.br.objet, AG.br.texte.slice(0, 8)], [refA, 'TeamOP — OP GESTION pour votre activité', 'Bonjour,']);
  h = bac.liste();
  vrai('…le formulaire porte l’objet, le texte, « Enregistrer » et « Annuler » ; le destinataire est dit non modifiable', /id="ag-br-o"/.test(h) && /id="ag-br-t"/.test(h) && />Enregistrer<\/button>/.test(h) && />Annuler<\/button>/.test(h) && /le destinataire ne se change pas/.test(h));
  vrai('⛔ pendant la correction, « Valider et envoyer » de CETTE ligne est éteint (on ne valide pas ce qu’on est en train d’écrire), pas celui de l’autre',
    (h.match(/class="ag-btn ok"[^>]*disabled[^>]*>Valider et envoyer/g) || []).length === 1 && (h.match(/class="ag-btn ok"(?![^>]*disabled)[^>]*>Valider et envoyer/g) || []).length === 1);
  bac.agBrAnnuler();
  v('« Annuler » ferme le formulaire sans rien écrire', [AG.br.edit, (await S.get('/api/monitor/agents/brouillons?refs=' + refA)).j[refA].objet], ['', 'TeamOP — OP GESTION pour votre activité']);

  bac.agBrModifier(refA);
  AG.br.objet = 'x'.repeat(201); AG.br.texte = 'Texte';
  await bac.agBrEnregistrer(refA);
  h = bac.liste();
  vrai('⛔ le serveur REFUSE (objet de 201 caractères) : le refus se DIT dans le formulaire, resté ouvert, avec ce que le serveur a répondu', AG.br.edit === refA && /Objet trop long/.test(AG.br.err) && /role="alert"[^>]*>[^<]*Objet trop long/.test(h), AG.br.err);
  const jetonPatron = jeton; jeton = S.TA;
  AG.br.objet = 'Objet du collaborateur'; AG.br.texte = 'Texte du collaborateur';
  await bac.agBrEnregistrer(refA);
  vrai('⛔ un collaborateur : le serveur dit 403, la page l’écrit (« Réservé au patron »…), le brouillon n’a pas bougé', /Réservé|403|refusé/i.test(AG.br.err) && (await S.get('/api/monitor/agents/brouillons?refs=' + refA)).j[refA].objet === 'TeamOP — OP GESTION pour votre activité', AG.br.err);
  jeton = jetonPatron;
  AG.br.objet = 'Notre proposition pour Société Alpha'; AG.br.texte = 'Bonjour,\n\nTexte relu par Justin.\n\nBien cordialement,';
  await bac.agBrEnregistrer(refA);
  v('le patron enregistre : le formulaire se ferme, plus d’erreur, l’aperçu montre le nouveau texte', [AG.br.edit, AG.br.err, AG.br.d[refA].objet, AG.br.d[refA].texte.includes('Texte relu par Justin')], ['', '', 'Notre proposition pour Société Alpha', true]);
  v('…et le SERVEUR l’a retenu', (await S.get('/api/monitor/agents/brouillons?refs=' + refA)).j[refA].texte, 'Bonjour,\n\nTexte relu par Justin.\n\nBien cordialement,');
  vrai('un toast le dit', toasts.some(t => /Brouillon enregistré/.test(t)));
  jeton = 'a'.repeat(64);
  bac.agBrModifier(refA); AG.br.objet = 'o'; AG.br.texte = 't';
  await bac.agBrEnregistrer(refA);
  vrai('⛔ une session invalide (401) : le refus se dit aussi, la page ne ment pas', AG.br.err.length > 3 && AG.br.edit === refA, AG.br.err);
  jeton = jetonPatron; bac.agBrAnnuler();

  /* 5. valider et envoyer */
  const valA = AG.validations.find(x => x.params && x.params.fil === refA);
  confirmations = []; chargesAgents = 0;
  await bac.agDecider(valA.id, 'accepter');
  vrai('⛔ la confirmation parle d’ENVOI (« Envoyer ce courriel maintenant ? »), pas de « Valider cette demande »', confirmations.length === 1 && /^Envoyer ce courriel maintenant \?/.test(confirmations[0]), confirmations.join('|'));
  const lettresVers = async (re) => (await Promise.all(S.fact.recus.map(r => simpleParser(r)))).filter(m => re.test(String((m.to && m.to.text) || '')));
  /* (le lien de confirmation du portail part aussi à chaque adresse : on vise les courriels de RÉPONSE, par leur objet) */
  const reponsesVers = async (re, sujet) => (await lettresVers(re)).filter(m => (sujet || /OP GESTION pour votre activité|Notre proposition/).test(String(m.subject || '')));
  vrai('le serveur a envoyé UN courriel à l’adresse du compte, avec le texte de Justin', await S.attendre(async () => (await reponsesVers(/a@tour-2865\.fr/, /Notre proposition/)).length >= 1, 6000));
  const lettres = await lettresVers(/./);
  const aA = lettres.filter(m => /a@tour-2865\.fr/.test(String((m.to && m.to.text) || '')) && /Notre proposition/.test(String(m.subject || '')));
  v('…exactement un, de Justin', [aA.length, aA[0] && String(aA[0].text).includes('Texte relu par Justin')], [1, true]);
  vrai('la page a relu l’état (le serveur est la source) : la validation est « acceptée » et plus d’aperçu pour elle', await (async () => { await dormir(700); const l = AG.validations.find(x => x.id === valA.id); return l && l.statut === 'accepte' && l.execution === 'ok'; })(), JSON.stringify(AG.validations.map(x => x.statut)));
  await charger();
  h = bac.liste();
  vrai('…la liste ne montre plus d’aperçu ni de bouton pour la validation envoyée, mais toujours ceux de l’autre', (h.match(/ag-apercu/g) || []).length === 1 && (h.match(/Valider et envoyer/g) || []).length === 1);
  jeton = S.TA; bac.MYROLE = 'collaborateur'; confirmations = [];
  await bac.agDecider(vals.find(x => /Beta/.test(x.resume)).id, 'accepter');
  v('⛔ un compte qui n’est pas patron : la page ne demande même pas de confirmation et rien ne part vers la société Beta', [confirmations.length, (await reponsesVers(/b@tour-2865\.fr/)).length], [0, 0]);
  jeton = S.TP; bac.MYROLE = 'patron'; AG.busy = false;
  const valB = AG.validations.find(x => x.params && x.params.fil === refB);
  confirmations = [];
  await bac.agDecider(valB.id, 'refuser');
  await dormir(500);
  v('« Refuser » ne demande pas de confirmation et n’envoie rien à la société Beta', [confirmations.length, (await reponsesVers(/b@tour-2865\.fr/)).length, (await S.get('/api/monitor/agents/validations?statut=tout')).j.validations.find(x => x.id === valB.id).statut], [0, 0, 'refuse']);

  /* ═══ 6. Relecture adverse (23 octobre 2026) : le texte lu est celui qui part, et « validée » ne veut pas dire « parti » ═══ */
  console.log('\n6. Le texte lu est celui qui part ; « validée » ne veut pas dire « parti »');
  for (const [e, c] of [['c@tour-2865.fr', 'Société Gamma'], ['d@tour-2865.fr', 'Société Delta']]) await S.inscrire(e, c);
  vrai('(population) deux validations de plus attendent (Gamma, Delta)', await S.attendre(async () => ((await S.get('/api/monitor/agents/validations')).j.validations || []).filter(x => x.statut === 'en_attente').length === 2, 20000));
  await charger();
  const vG = AG.validations.find(x => x.statut === 'en_attente' && /Gamma/.test(x.resume)), vD = AG.validations.find(x => x.statut === 'en_attente' && /Delta/.test(x.resume));
  const refG = vG.params.fil, refD = vD.params.fil;
  const empreinteLue = AG.br.d[refG].empreinte;
  vrai('(population) la page a lu l’empreinte du brouillon Gamma', /^[0-9a-f]{32}$/.test(empreinteLue), empreinteLue);

  /* (a) quelqu'un corrige le brouillon APRÈS que la page l'a lu */
  await S.post('/api/monitor/agents/brouillons/modifier', { ref: refG, objet: 'Objet corrigé ailleurs', texte: 'Bonjour,\n\nTexte corrigé ailleurs, après la lecture.\n\nBien cordialement,' });
  toasts = []; confirmations = [];
  await bac.agDecider(vG.id, 'accepter');
  await dormir(1200);
  vrai('⛔ la page envoie l’empreinte LUE ; le serveur refuse (409) et la page le DIT : « a changé »', toasts.some(t => /a changé/.test(t)) && !toasts.some(t => /Courriel envoyé|Demande validée/.test(t)), toasts.join('|'));
  v('⛔ …rien n’est parti vers Gamma, la validation attend toujours', [(await reponsesVers(/c@tour-2865\.fr/)).length, (await S.get('/api/monitor/agents/validations?statut=tout')).j.validations.find(x => x.id === vG.id).statut], [0, 'en_attente']);
  vrai('…la liste s’est rechargée : l’aperçu montre le NOUVEAU texte et une autre empreinte', AG.br.d[refG] && AG.br.d[refG].empreinte !== empreinteLue && /Texte corrigé ailleurs/.test(AG.br.d[refG].texte), JSON.stringify(AG.br.d[refG]).slice(0, 200));
  toasts = [];
  await bac.agDecider(vG.id, 'accepter');
  vrai('le patron valide ce qu’il vient de relire : la page dit « Courriel envoyé. »', await S.attendre(async () => toasts.some(t => /^Courriel envoyé\.$/.test(t)), 6000), toasts.join('|'));
  const lg = await S.attendre(async () => (await reponsesVers(/c@tour-2865\.fr/, /Objet corrigé ailleurs/)).length === 1, 6000);
  vrai('…et le facteur reçoit le texte RELU (« Texte corrigé ailleurs »)', lg && /Texte corrigé ailleurs/.test(String((await reponsesVers(/c@tour-2865\.fr/, /Objet corrigé ailleurs/))[0].text)));
  await dormir(700); AG.busy = false;

  /* (b) l'envoi échoue : la page ne dit pas « validée » comme si c'était parti */
  const portSmtp = S.fact.s.address().port;
  S.fact.s.close(); await dormir(300);
  await charger();
  toasts = [];
  await bac.agDecider(vD.id, 'accepter');
  await dormir(1500);
  vrai('⛔ le facteur est éteint : la page dit « Validée, mais le courriel n’est PAS parti » (jamais « Demande validée »)', toasts.some(t => /PAS parti/.test(t)) && !toasts.some(t => /^Demande validée\.$|^Courriel envoyé\.$/.test(t)), toasts.join('|'));
  const valsD = (await S.get('/api/monitor/agents/validations?statut=tout')).j.validations.filter(x => x.params && x.params.fil === refD);
  v('⛔ …le serveur a rouvert UNE validation en attente pour le même brouillon (l’ancienne : acceptée, exécution « echec »)', [valsD.length, valsD.filter(x => x.statut === 'en_attente').length, (valsD.find(x => x.statut === 'accepte') || {}).execution], [2, 1, 'echec']);
  vrai('…la page la montre, avec « Un envoi a échoué » dans l’aperçu', await (async () => { await charger(); const h2 = bac.liste(); return /Un envoi a échoué/.test(h2) && /Valider et envoyer/.test(h2); })());
  S.fact.s.listen(portSmtp, '127.0.0.1'); await dormir(300);
  toasts = [];
  await bac.agDecider((await S.get('/api/monitor/agents/validations?statut=tout')).j.validations.find(x => x.params.fil === refD && x.statut === 'en_attente').id, 'accepter');
  vrai('le facteur est revenu : le patron revalide, la page dit « Courriel envoyé. » et le courriel part', await S.attendre(async () => toasts.some(t => /^Courriel envoyé\.$/.test(t)), 8000) && await S.attendre(async () => (await reponsesVers(/d@tour-2865\.fr/)).length >= 1, 8000), toasts.join('|'));

  /* (c) le message se lit sur ce que le serveur a répondu, jamais sur la seule demande */
  const msg = (r, d) => bac.agDecisionMsg(r, d);
  v('le message : refus du serveur → son texte', msg({ ok: false, d: { error: 'Le brouillon a changé' } }, 'accepter'), 'Le brouillon a changé');
  v('…un refus de Justin → « Demande refusée. »', msg({ ok: true, d: { validation: { type: 'envoyer_mail' } } }, 'refuser'), 'Demande refusée.');
  vrai('…un courriel dont l’exécution est « pause » → PAS parti', /PAS parti/.test(msg({ ok: true, d: { validation: { type: 'envoyer_mail', execution: 'pause' } } }, 'accepter')));
  vrai('…un autre type dont l’exécution a échoué → « l’exécution a échoué » (jamais « validée » seul)', /exécution a échoué/.test(msg({ ok: true, d: { validation: { type: 'creer_espace', execution: 'echec' } } }, 'accepter')));
  v('…un autre type sans exécuteur → « Demande validée. »', msg({ ok: true, d: { validation: { type: 'creer_espace', execution: '' } } }, 'accepter'), 'Demande validée.');

  await S.fin();
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });

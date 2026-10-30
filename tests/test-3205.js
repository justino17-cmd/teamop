/* ⛔ CE QUE CE FICHIER GARDE — LE MODÈLE ET LE BUDGET PAR DÉFAUT DES TROIS AGENTS AU TRAVAIL, ET LEUR FICHE DE POSTE (30 octobre 2026).
     Justin : « je veux des agents performants, donc fais le mieux ». Camille, Léa et Margaux RÉDIGENT en mode travail : leurs appels de travail partent sur Opus 5.5 (`claude-opus-5-5`, le seul Opus que
     `cerveau.js` connaisse, dans sa table de tarifs) quand `config.agents.modeles` ne dit rien. Ce banc tient les bornes de ce choix :
       1. la fonction pure `modeleParDefaut` : Opus pour les trois et eux seuls, seulement pour un appel de TRAVAIL ; le JUGE de la grille (appel sans `travail`) et tout autre agent restent sur Sonnet 5 ;
          un réglage `agents.modeles` GAGNE toujours (y compris pour ramener un agent à Sonnet 5) ; un nom hors forme est écarté ;
       2. dans le vrai `cerveau.penser` : la requête porte bien le modèle attendu, et la dépense suit son tarif (Opus 5.5 : le double de Sonnet 5) ;
       3. interrupteur COUPÉ : aucun appel n'est un appel de travail, donc rien ne change d'un octet (les 45 cas d'avant de `test-3204` le disent aussi) ;
       4. le BUDGET du mois : 195 $ par défaut (le crédit est de 200 $) couvre les ≈ 82 $/mois estimés des trois en Opus ; il se règle toujours (1 à 2000) ; chaque plafond d'agent couvre un mois d'Opus ;
       5. le rejeu `rejouer.js --estimer` chiffre « avant » au tarif de Sonnet 5 et « après » à celui d'Opus 5.5 ;
       6. la FICHE DE POSTE entre dans les consignes de travail des trois agents, UNE fois, sans le bloc qui parle à Justin, et jamais hors du mode travail.
   Les mutations qui éprouvent ce banc : scratchpad/mutations-modele-travail.py (correctif → banc → commit → mutation → checkout). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { spawnSync } = require('child_process');
const RACINE = path.join(__dirname, '..');
const { monter: monterBanc } = require('./banc-agents-courrier.js');
const monter = o => monterBanc(Object.assign({ modes: { camille: 'brouillon', lea: 'brouillon', victor: 'brouillon', margaux: 'brouillon', hugo: 'brouillon' } }, o));
const CERV = require(path.join(RACINE, 'server', 'cerveau.js'));
const FICHES = require(path.join(RACINE, 'server', 'agents-fiches.js'));
const AGENTS = require(path.join(RACINE, 'server', 'agents.js'));
const { jouer } = require(path.join(RACINE, 'server', 'outils', 'evaluation-travail', 'jouer.js'));
const CAS = require(path.join(RACINE, 'server', 'outils', 'evaluation-travail', 'cas.js'));
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 200) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 120000).unref();
const OPUS = 'claude-opus-5-5', SONNET = 'claude-sonnet-5';
const sansComm = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');
const message = t => [{ role: 'user', content: t }];
const RAPPEL = 'RAPPEL DE TA FICHE DE POSTE';

(async () => {
  console.log('\n── 3205 · le modèle et le budget des agents au travail ──');

  console.log('\n1. Le modèle par défaut (fonction pure)');
  v('les constantes : Opus 5.5 pour le travail, Sonnet 5 pour le reste, trois agents', [CERV.MODELE_TRAVAIL_DEFAUT, CERV.MODELE_DEFAUT, CERV.AGENTS_TRAVAIL], [OPUS, SONNET, ['camille', 'lea', 'margaux']]);
  vrai('…et l’identifiant d’Opus est un de ceux de la table des tarifs (aucun nom inventé)', Object.keys(CERV.TARIFS_REELS).includes(CERV.MODELE_TRAVAIL_DEFAUT) && Object.keys(CERV.TARIFS_ESTIMES).includes(CERV.MODELE_TRAVAIL_DEFAUT));
  v('⛔ appel de TRAVAIL, rien de réglé : Opus pour Camille, Léa et Margaux', ['camille', 'lea', 'margaux'].map(a => CERV.modeleParDefaut(a, true, {})), [OPUS, OPUS, OPUS]);
  v('⛔ appel SANS travail (le juge de la grille, un appel d’avant) : Sonnet 5 pour les trois', ['camille', 'lea', 'margaux'].map(a => CERV.modeleParDefaut(a, false, {})), [SONNET, SONNET, SONNET]);
  v('…et `travail` doit être VRAI, pas « presque » (une chaîne, 1, undefined restent sur Sonnet 5)', ['true', 1, undefined, null].map(t => CERV.modeleParDefaut('camille', t, {})), [SONNET, SONNET, SONNET, SONNET]);
  const AUTRES = AGENTS.AGENTS.map(a => a.id).filter(id => !CERV.AGENTS_TRAVAIL.includes(id));
  vrai('⛔ les treize autres agents ne changent pas : Sonnet 5, même pour un appel de travail (population : ' + AUTRES.length + ')', AUTRES.length === 13 && AUTRES.every(id => CERV.modeleParDefaut(id, true, {}) === SONNET && CERV.modeleParDefaut(id, false, {}) === SONNET));
  v('un réglage GAGNE : Camille ramenée à Sonnet 5 (appel de travail ET juge), Léa sur un autre modèle', [CERV.modeleParDefaut('camille', true, { camille: SONNET }), CERV.modeleParDefaut('camille', false, { camille: SONNET }), CERV.modeleParDefaut('lea', true, { lea: 'claude-futur-9' })], [SONNET, SONNET, 'claude-futur-9']);
  v('un réglage posé sur Opus vaut aussi pour le juge (c’est le choix de Justin, agent par agent)', CERV.modeleParDefaut('margaux', false, { margaux: OPUS }), OPUS);
  v('un nom hors forme est écarté : le défaut reste', [CERV.modeleParDefaut('camille', true, { camille: 'pas un modèle' }), CERV.modeleParDefaut('camille', true, { camille: 42 }), CERV.modeleParDefaut('camille', true, null)], [OPUS, OPUS, OPUS]);

  console.log('\n2. Dans le vrai `cerveau.penser`');
  {
    const Z = monter({ claude: () => 'bonjour' });
    await Z.cerveau.penser('camille', 'sys', message('x'), { travail: true, reflechir: true });
    const dCamilleTravail = Z.cerveau.etatBudget().parAgent.camille;
    await Z.cerveau.penser('camille', 'sys', message('x'), { maxTokens: 500 });
    const dCamille2 = Z.cerveau.etatBudget().parAgent.camille - dCamilleTravail;
    await Z.cerveau.penser('lea', 'sys', message('x'), { travail: true, reflechir: true });
    await Z.cerveau.penser('margaux', 'sys', message('x'), { travail: true, reflechir: true });
    await Z.cerveau.penser('victor', 'sys', message('x'), { travail: true, reflechir: true });
    await Z.cerveau.penser('hugo', 'sys', message('x'), {});
    v('⛔ la requête porte le modèle attendu : Opus pour les appels de travail des trois, Sonnet pour le juge de Camille et pour Victor et Hugo', Z.recus.map(r => r.model), [OPUS, SONNET, OPUS, OPUS, SONNET, SONNET]);
    vrai('…et la dépense suit : un appel d’Opus coûte plus qu’un appel de Sonnet (mêmes jetons simulés, tarif 7 $ / 35 $ contre 3,5 $ / 17,5 $)', dCamilleTravail > 0 && dCamille2 > 0 && Math.abs(dCamilleTravail / dCamille2 - 2) < 1e-6, dCamilleTravail + ' / ' + dCamille2);
    vrai('…l’état du budget ne prétend pas que Justin a réglé quoi que ce soit (le défaut n’est pas un réglage)', JSON.stringify(Z.cerveau.etatBudget().modeles) === '{}');
    const Y = monter({ cerveauCtx: { modeles: { camille: SONNET } }, claude: () => 'bonjour' });
    await Y.cerveau.penser('camille', 'sys', message('x'), { travail: true });
    await Y.cerveau.penser('lea', 'sys', message('x'), { travail: true });
    v('un réglage `modeles` de Justin gagne sur le défaut, agent par agent', Y.recus.map(r => r.model), [SONNET, OPUS]);
    Y.nettoyer(); Z.nettoyer();
  }

  console.log('\n3. Interrupteur coupé : aucun appel de travail, donc aucun Opus');
  {
    for (const id of ['c01', 'l01', 'm01']) {
      const cas = CAS.TOUS.find(c => c.id === id), rec = [];
      const texte = 'Objet : Votre message\n\nBonjour,\n\nNous avons bien reçu votre message.\n\nBien cordialement,';
      const avant = await jouer(cas, { travail: false, claude: q => { rec.push(q); return texte; } });
      vrai('⛔ coupé, ' + id + ' : tous les modèles sont Sonnet 5 et aucune requête n’a d’outil (' + rec.length + ' requêtes' + (id === 'm01' ? ' : la relance d’avant est écrite par le code' : '') + ')', (id === 'm01' ? rec.length === 0 : rec.length > 0) && rec.every(q => q.model === SONNET && !q.tools) && (avant.modeles || []).every(m => m === SONNET), JSON.stringify(avant.modeles));
    }
  }

  console.log('\n4. Le budget du mois');
  {
    const Z = monter({ claude: () => 'bonjour' });
    const b = Z.cerveau.etatBudget();
    v('le budget par défaut reste 195 $ (le crédit est de 200 $) : il couvre les ≈ 82 $/mois des trois en Opus, avec plus de la moitié de marge', [b.plafondTotal, b.plafondTotal >= 82 * 2], [195, true]);
    vrai('chaque plafond d’agent couvre un mois d’Opus : Camille 35 $, Léa 10 $, Margaux 10 $ (le mois de Léa : 80 inscriptions à 0,13 $ ; celui de Margaux : 100 relances à 0,10 $)', b.plafondsAgent.camille >= 35 && b.plafondsAgent.lea >= 10 && b.plafondsAgent.margaux >= 10, JSON.stringify(b.plafondsAgent));
    Z.nettoyer();
    const Y = monter({ cerveauCtx: { budgetMois: 150 }, claude: () => 'bonjour' });
    v('le budget se règle toujours (150 $ posé par Justin donne 150 $) et un budget hors forme garde 195', [Y.cerveau.etatBudget().plafondTotal, monter({ cerveauCtx: { budgetMois: 5000 }, claude: () => 'x' }).cerveau.etatBudget().plafondTotal], [150, 195]);
    Y.nettoyer();
    vrai('le total du mois se lit encore sur 195 dans le code (aucune baisse silencieuse du plafond des seize agents)', /const TOTAL_USD = 195;/.test(sansComm(lire('server/cerveau.js'))));
  }

  console.log('\n5. Le rejeu `rejouer.js --estimer`');
  {
    const D = fs.mkdtempSync(path.join(os.tmpdir(), 'rejouer-3205-'));
    const lancer = (cfg, args) => { fs.writeFileSync(path.join(D, 'config.json'), JSON.stringify(cfg)); return spawnSync('node', [path.join(RACINE, 'server', 'outils', 'evaluation-travail', 'rejouer.js')].concat(args || ['--estimer']), { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(D, 'config.json') }), encoding: 'utf8' }); };
    const cout = x => { const m = /environ (\d+\.\d\d) \$ RÉELS/.exec(x.stdout); return m ? Number(m[1]) : NaN; };
    const defaut = lancer({ agents: {} }), sonnet = lancer({ agents: { modeles: { camille: SONNET, lea: SONNET, margaux: SONNET } } });
    v('par défaut : le rejeu annonce Opus 5.5 pour « après » et Sonnet 5 pour « avant », et sort sans rien envoyer', [defaut.status, /après = claude-opus-5-5/.test(defaut.stdout), /avant = Sonnet 5/.test(defaut.stdout), /le juge reste sur Sonnet 5/.test(defaut.stdout)], [0, true, true, true]);
    vrai('⛔ …et son estimation est plus HAUTE que celle de Sonnet 5 partout, mais pas du double (l’« avant » reste en Sonnet) : ' + cout(defaut) + ' $ contre ' + cout(sonnet) + ' $', cout(defaut) > cout(sonnet) && cout(defaut) < cout(sonnet) * 2, cout(defaut) + ' / ' + cout(sonnet));
    vrai('l’estimation de l’envoi reste sous le plafond par défaut du script (8 $) : un rejeu complet ne demande pas de relever --budget', cout(defaut) <= 8, cout(defaut));
    fs.rmSync(D, { recursive: true, force: true });
  }

  console.log('\n6. La fiche de poste des trois agents');
  {
    for (const a of ['camille', 'lea', 'margaux']) {
      const b = FICHES.blocTravail(a);
      vrai('⛔ ' + a + ' : le rappel nomme la mission, l’interdit et la règle de vérité, SANS le bloc qui parle à Justin (compte rendu en trois phrases, revue du week-end)', b.includes(RAPPEL) && b.includes(FICHES.FICHES[a].mission) && FICHES.FICHES[a].jamais.every(j => b.includes(j)) && /Vérifier avant d’affirmer/.test(b) && !/revue|week-end|trois courtes phrases|Objectifs mesurables|Tu passes la main|Tu décides seul/.test(b), b.slice(0, 120));
      vrai('…aucun prénom d’agent dans le texte (le banc de Hugo les cherche dans tout ce qui part chez Claude)', !/\b(Victor|Inès|Camille|Hugo|Margaux|Léa|Max|Nina|Théo|Jules|Chloé|Emma|Louis|Sarah|Lola|Noah)\b/.test(b));
    }
    v('un agent hors table : chaîne vide (il garde ses consignes d’avant)', [FICHES.blocTravail('inconnu'), FICHES.blocTravail(undefined)], ['', '']);
    vrai('les modèles d’écrit : « courriel » pour Camille et Léa seulement (Margaux écrit une relance dont le serveur pose la forme)', FICHES.blocTravail('camille').includes('Modèle d’un courriel') && FICHES.blocTravail('lea').includes('Modèle d’un courriel') && !FICHES.blocTravail('margaux').includes('Modèle'));
    // les VRAIES requêtes : le rappel est dans la consigne de travail, UNE fois ; coupé, il n'y est jamais
    for (const id of ['c01', 'l01', 'm01']) {
      const cas = CAS.TOUS.find(c => c.id === id), recA = [], recB = [];
      const texte = 'Objet : Votre message\n\nBonjour,\n\nNous avons bien reçu votre message.\n\nBien cordialement,';
      await jouer(cas, { travail: true, claude: q => { recA.push(String(q.system || '')); return texte; } });
      await jouer(cas, { travail: false, claude: q => { recB.push(String(q.system || '')); return texte; } });
      const n = s => (s.match(new RegExp(RAPPEL, 'g')) || []).length;
      vrai('⛔ ' + id + ' en travail : chaque consigne envoyée porte le rappel EXACTEMENT une fois (' + recA.length + ' requêtes)', recA.length > 0 && recA.every(s => n(s) === 1), recA.map(n).join(','));
      vrai('⛔ ' + id + ' coupé : aucune consigne ne le porte (' + recB.length + ' requêtes) — l’agent d’avant, à l’identique' + (id === 'm01' ? ' ; la relance d’avant est écrite par le CODE : zéro requête, et c’est le sens attendu' : ''), id === 'm01' ? recB.length === 0 : (recB.length > 0 && recB.every(s => n(s) === 0)), recB.map(n).join(','));
    }
    // le texte des consignes de base, lui, n'a pas bougé (les constantes exportées)
    const camille = require(path.join(RACINE, 'server', 'agent-camille.js')), lea = require(path.join(RACINE, 'server', 'agent-lea.js'));
    vrai('les consignes de base exportées (`SYSTEM`) ne portent pas le rappel : il ne s’ajoute qu’au travail', !camille.SYSTEM.includes(RAPPEL) && !lea.SYSTEM.includes(RAPPEL));
    const src = n => sansComm(lire('server/' + n));
    vrai('le câblage est du CODE (hors commentaires) dans les trois agents', /blocTravail\('camille'\)/.test(src('agent-camille.js')) && /travailActif\(\) \? FICHES\.blocTravail\(ID\)/.test(src('agent-lea.js')) && /blocTravail\('margaux'\)/.test(src('agent-margaux.js')));
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });

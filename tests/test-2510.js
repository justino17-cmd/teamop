/* ══ test-2510 — LE RELAIS COURRIEL INJOIGNABLE SE DIT (lot m02, entree#0) : LE VRAI SERVICE, UN RELAIS MORT PUIS UN RELAIS VIVANT ══════════════════════════
   Constat du testeur : relais SMTP injoignable (port fermé), `POST /api/mel/inscrire` et `/api/mel/oubli` répondaient 200 {ok:true}, la page disait « un code vient d'y partir »
   et rien ne partait jamais. Le silence n'est voulu que pour ne PAS révéler si une adresse a un compte ; une panne du relais ne dépend d'aucune adresse et se dit.
   Ce que ce banc garde :
     · relais mort : /api/config ferme `comptes.inscription` ; inscrire ET oubli répondent 503 `courriel_indisponible` pour toutes les adresses pareil (la panne ne dit rien d'une
       adresse) ; une adresse mal formée garde son 400 ; RIEN n'est compté (zéro ligne de plafond : la personne n'a rien consommé) ;
     · relais vivant : tout marche, /api/config ouvre ;
     · la santé du relais est UNE sonde en cache — jamais déduite des envois (qui ne frappent que les adresses ayant un compte), jamais une connexion par demande :
       relais mort après une demande réussie → toujours « vivant » dans la fenêtre, « mort » ensuite ; relais revenu → pas de connexion tant que la fenêtre court, « vivant » ensuite ;
     · la phrase que la page montre pour ce refus existe (api.js), et elle ne promet pas un envoi.
   Code 0 si tout passe, 1 sinon. */
'use strict';
const fs = require('fs'), path = require('path');
const T = require('./outils-msg');
const { fauxRelais } = require('./outils-relais');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

const ADR = 'zoe.martin@exemple.invalid', ADR2 = 'INCONNUE-QXW@exemple.invalid', MDP = 'un-mot-de-passe-solide';
const corps = (a) => ({ courriel: a, mdp: MDP, prenom: 'Zoé', conditions: true });
const nLignes = (svc) => { const d = T.lireBase(path.join(svc.data, 'msg.db')); try { return d.prepare('SELECT COUNT(*) AS n FROM courrier_envoi').get().n; } finally { d.close(); } };

(async () => {
  const vivant = await fauxRelais({});
  const base = (port) => ({ hote: '127.0.0.1', port, securite: 'aucune', de: 'comptes@exemple.invalid', timeoutMs: 3000 });
  const mort = await T.lancerService({ config: { courriel: base(1), inscriptionCourriel: true } });      // le port 1 est fermé : rien n'y écoute
  const vif = await T.lancerService({ horloge: true, config: { courriel: base(vivant.port), inscriptionCourriel: true } });
  try {
    console.log('\n1. Relais MORT : la panne se dit, pour toutes les adresses pareil, et rien n\'est compté');
    {
      const c = T.client(mort.base);
      const cf = (await c.get('/api/config')).j;
      v('/api/config : `comptes.inscription` FERMÉ (la page ne propose plus « Créer un compte »), la connexion par adresse reste', cf.comptes, { inscription: false, courriel: true });
      const r1 = await T.client(mort.base).post('/api/mel/inscrire', corps(ADR)), r2 = await T.client(mort.base).post('/api/mel/inscrire', corps(ADR2));
      v('⛔ inscrire (adresse A, adresse B) : 503 `courriel_indisponible` — la même réponse, pas un 200 qui promet un code', [r1.code, r1.j.error, r2.code, r2.j.error], [503, 'courriel_indisponible', 503, 'courriel_indisponible']);
      const o1 = await T.client(mort.base).post('/api/mel/oubli', { courriel: ADR }), o2 = await T.client(mort.base).post('/api/mel/oubli', { courriel: ADR2 });
      v('⛔ oubli (adresse A, adresse B) : 503 `courriel_indisponible`, identique', [o1.code, o1.j.error, o2.code, o2.j.error], [503, 'courriel_indisponible', 503, 'courriel_indisponible']);
      const m1 = await T.client(mort.base).post('/api/mel/inscrire', corps('pas une adresse')), m2 = await T.client(mort.base).post('/api/mel/oubli', { courriel: 'pas une adresse' });
      v('une adresse mal formée garde SON refus (400 courriel_invalide) : la forme se juge avant la panne', [m1.code, m1.j.error, m2.code, m2.j.error], [400, 'courriel_invalide', 400, 'courriel_invalide']);
      v('population : rien n\'est compté — ni demande d\'adresse ni plafond de réseau (la personne n\'a rien consommé, une panne ne la bloque pas une heure)', nLignes(mort), 0);
      for (let i = 0; i < 8; i++) await T.client(mort.base).post('/api/mel/oubli', { courriel: ADR });
      const encore = await T.client(mort.base).post('/api/mel/oubli', { courriel: ADR });
      v('   et huit demandes de plus ne font JAMAIS passer au 429 : c\'est toujours la panne qui parle', [encore.code, encore.j.error], [503, 'courriel_indisponible']);
    }

    console.log('\n2. Relais VIVANT : tout marche, et la sonde est en cache');
    {
      const c0 = vivant.etat.connexions;
      const cf = (await T.client(vif.base).get('/api/config')).j;
      v('/api/config : inscription ouverte', cf.comptes, { inscription: true, courriel: true });
      const r = await T.client(vif.base).post('/api/mel/inscrire', corps(ADR));
      v('inscrire : 200 {ok:true}', [r.code, r.j], [200, { ok: true }]);
      vrai('population : le courriel est arrivé au relais', await T.attendre(() => vivant.messages.length >= 1, 8000, 25));
      vrai('population : la sonde a bien parlé au relais (au moins une connexion de vérification en plus de l\'envoi)', vivant.etat.connexions - c0 >= 2);
      vif.avancer(61000);
      const o = await T.client(vif.base).post('/api/mel/oubli', { courriel: ADR });
      v('oubli (une minute plus tard, délai entre deux demandes passé) : 200', o.code, 200);
      await vivant.fermer();     // le relais meurt
      const dans = await T.client(vif.base).post('/api/mel/oubli', { courriel: ADR2 });
      v('⛔ dans la fenêtre du cache la sonde ne se refait pas : la demande suivante passe encore (200) — pas une connexion au relais par demande', dans.code, 200);
      vif.avancer(61000);
      const apres = await T.client(vif.base).post('/api/mel/oubli', { courriel: ADR });
      v('⛔ la fenêtre passée, la sonde constate la panne : 503 `courriel_indisponible`', [apres.code, apres.j.error], [503, 'courriel_indisponible']);
      const cf2 = (await T.client(vif.base).get('/api/config')).j;
      v('   et /api/config ferme l\'inscription', cf2.comptes.inscription, false);
    }

    console.log('\n3. La sonde elle-même (module), horloge maîtrisée : une panne dure une fenêtre, une reprise aussi');
    {
      const { creerCourriel } = require(path.join(T.SERVICE, 'courriel.js'));
      const r1 = await fauxRelais({}), r2 = await fauxRelais({});
      let t = 1000000;
      const cfg = { courriel: { mode: 'smtp', hote: '127.0.0.1', port: r1.port, securite: 'aucune', utilisateur: null, motDePasse: null, de: 'a@exemple.invalid', nom: 'Banc', timeoutMs: 3000 } };
      const mel = creerCourriel({ config: cfg, stockage: {}, scelleur: {}, horloge: () => t, journaliser: () => {} });
      v('relais vivant : joignable', await mel.joignable(), true);
      const n1 = r1.etat.connexions;
      v('   redemandé aussitôt : le cache répond, aucune connexion de plus', [await mel.joignable(), r1.etat.connexions - n1], [true, 0]);
      await r1.fermer(); mel.arreter();
      v('relais mort mais dans la fenêtre : la dernière réponse tient', await mel.joignable(), true);
      t += 61000;
      v('fenêtre passée : injoignable', await mel.joignable(), false);
      cfg.courriel.port = r2.port; mel.arreter();
      v('⛔ le relais revient mais la fenêtre court : toujours « injoignable » et AUCUNE connexion (pas une sonde par demande)', [await mel.joignable(), r2.etat.connexions], [false, 0]);
      t += 61000;
      v('fenêtre passée : joignable de nouveau', await mel.joignable(), true);
      t += 61000;
      const n2 = r2.etat.connexions;
      const rs = await Promise.all([1, 2, 3, 4, 5].map(() => mel.joignable()));
      v('plusieurs demandes à la fois partagent UNE sonde', [rs.every(x => x === true), r2.etat.connexions - n2], [true, 1]);
      const sans = creerCourriel({ config: { courriel: { mode: 'inerte' } }, stockage: {}, scelleur: {}, horloge: () => t, journaliser: () => {} });
      v('sans relais configuré : jamais joignable (et jamais de connexion)', await sans.joignable(), false);
      await r2.fermer(); mel.arreter();
    }

    console.log('\n4. La phrase que la page montre');
    {
      const src = fs.readFileSync(path.join(T.SERVICE, 'public', 'api.js'), 'utf8');
      const m = /courriel_indisponible:\s*'((?:[^'\\]|\\.)*)'/.exec(src);
      vrai('api.js a une phrase pour `courriel_indisponible`', !!m);
      vrai('   elle dit que l\'envoi est indisponible et invite à réessayer — elle ne promet aucun code', m && /indisponible/.test(m[1]) && /plus tard/.test(m[1]) && !/vient de partir|est parti/.test(m[1]));
    }
  } finally {
    for (const s of [mort, vif]) { try { await s.arreter(); } catch (e) { /* déjà arrêté */ } }
    try { await vivant.fermer(); } catch (e) { /* déjà fermé */ }
  }
  fin();
})().catch((e) => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); process.exitCode = 1; fin(); });

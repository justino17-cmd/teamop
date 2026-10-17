/* Le CONTRÔLE de bout en bout : monte le jumeau, joue le client mystère, ajoute les contrôles défensifs, écrit le
   rapport. Code de sortie : 0 = rien de bloquant ni de faux, 1 = des défauts, 2 = bloqué, 3 = le contrôle n'a pas pu
   tourner (jumeau qui ne démarre pas).

   Usage : node scripts/controle/controle.js [dossier-de-sortie]
           PROFIL=bureau node scripts/controle/controle.js …   (un ordinateur au lieu d'un iPhone)
   ⛔ 127.0.0.1 seulement — voir l'en-tête de jumeau.js. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const { demarrer } = require('./jumeau');
const { carnet } = require('./rapport');
const parcours = require('./parcours-client');
const defense = require('./defense');

(async () => {
  const sortie = path.resolve(process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'controle-')));
  fs.mkdirSync(sortie, { recursive: true });
  let source = '';
  try { source = execFileSync('git', ['-C', path.join(__dirname, '..', '..'), 'log', '-1', '--format=%h %s'], { encoding: 'utf8' }).trim().slice(0, 80); } catch (e) {}
  const K = carnet(sortie, { date: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC', source: source || 'dépôt local',
    profil: process.env.PROFIL || 'telephone',
    limites: [
      'Joué sur un JUMEAU (127.0.0.1) : mêmes pages et même serveur que teamop.fr, mais ni le VPS, ni nginx, ni sa configuration réelle.',
      'Stripe est imité : la vraie route crée la session, mais la page de paiement et la carte bancaire ne sont pas celles de Stripe.',
      'Le reste du web est coupé (polices, cartes, PDF, lecture d\'étiquettes) : une fonction qui en dépend paraît en « sorties coupées ».',
      'Le service worker est désactivé : le cache hors ligne et la mise à jour de version ne sont pas joués.',
      'Firebase n\'existe pas dans le jumeau : une entreprise NEUVE y part d\'un document vide, comme en ligne ; la recopie d\'une entreprise ANCIENNE depuis Firebase n\'est pas jouée.',
      'La version exigée est celle de l\'application servie (en ligne : /api/version) — un appareil resté sur une version ancienne n\'est pas joué.',
      'Un seul appareil, un seul compte administrateur : les droits des autres rôles et la synchro à plusieurs appareils ne sont pas joués.',
    ] });
  let J;
  try { J = await demarrer({ sortie }); }
  catch (e) { K.constat('bloquant', 'Le jumeau ne démarre pas', String(e.message || e)); K.ecrire(); console.log(fs.readFileSync(path.join(sortie, 'rapport.md'), 'utf8')); process.exit(3); }
  let r = {};
  try {
    r = await parcours.jouer(J, K, { profil: process.env.PROFIL || 'telephone' }) || {};
  } catch (e) { K.constat('bloquant', 'Le parcours s\'est arrêté sur une exception', String(e && e.stack || e).slice(0, 800)); }
  try { await defense.verifier(J, K, r); } catch (e) { K.constat('défaut', 'Les contrôles défensifs n\'ont pas pu finir', String(e && e.message || e)); }
  const json = K.ecrire({ traces: { api: J.traces.api.length, site404: J.traces.site404, sortiesNavigateur: [...new Set(J.traces.sorties.map(x => x.url.split('/').slice(0, 3).join('/')))],
    sortiesServeur: [...new Set(J.sortiesServeur().map(u => u.split('/').slice(0, 3).join('/')))], courriels: J.courriers().map(c => ({ a: c.a, sujet: c.sujet })) } });
  await J.arreter();
  console.log(fs.readFileSync(path.join(sortie, 'rapport.md'), 'utf8'));
  console.log('Rapport : ' + sortie);
  process.exit(json.resume.bloquants ? 2 : json.resume.defauts ? 1 : 0);
})().catch(e => { console.error(e); process.exit(3); });

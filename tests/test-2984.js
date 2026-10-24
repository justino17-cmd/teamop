/* ⛔ CE QUE CE FICHIER GARDE — LA REMISE À ZÉRO DE L'ESPACE DE TEST NE TOUCHE RIEN HORS DE `TEAMOP_DATA` (23 octobre 2026).

   « Remettre l'espace à zéro » est la seule route du mode test qui EFFACE. Elle ne vide rien sous les pieds d'un serveur qui a ses fichiers en mémoire : elle pose une demande,
   répond, et arrête le serveur proprement (SIGTERM) ; l'unité systemd le relance, et c'est le DÉMARRAGE qui vide — avant que `index.js` lise le moindre fichier — puis ressème.
   Le vrai serveur, joué deux fois de suite sur les mêmes dossiers, avec des TÉMOINS à côté :
     1. avant : des données (une inscription, un courriel capté, des sessions), un fichier cachés, un sous-dossier, un LIEN SYMBOLIQUE vers un dossier voisin ;
     2. une mauvaise clé ne fait rien ; la bonne répond, ARRÊTE le serveur proprement (code 0, « arrêt (SIGTERM) »), et ne supprime encore rien ;
     3. après le redémarrage : le dossier de données est vide de l'ancien (sauf la marque), le lien est retiré et sa CIBLE intacte, les témoins hors du dossier (un fichier à côté,
        un dossier voisin, la config) n'ont pas bougé d'un octet, la demande est consommée ;
     4. et c'est un espace neuf : les anciens courriels, comptes et sessions n'existent plus, les comptes semés sont recréés (autres identifiants), la Tour garde ses deux comptes
        (son fichier est à côté de la config, hors des données) sans doublon ;
     4 bis. ⛔ le COMPTEUR DE DÉPENSE des agents survit à la remise à zéro (relecture adverse, 23 octobre 2026) : 10,50 $ dépensés avant, un message à Léa REFUSÉ au plafond
        (`plafond_total`) après — sans quoi chaque clic sur « Remettre l'espace à zéro » rachèterait 10 $ de la vraie clé des agents ;
     5. un dossier qui n'est PAS reconnu comme dossier de test (non vierge au départ) : la route refuse (409), rien n'est écrit, rien n'est effacé, le serveur reste debout.
   Aucune sortie ne montre une clé ; jamais `api.teamop.fr`. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const B2 = require('./banc-essais');
const { RACINE, dormir, attendre, lireFragment } = B2;
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c) => v(t, !!c, true);
const vivants = [];
const fin = () => { for (const s of vivants) { try { s.enfant() && s.enfant().kill('SIGKILL'); } catch (e) {} try { s.smtp.s.close(); } catch (e) {} try { fs.rmSync(s.banc, { recursive: true, force: true }); } catch (e) {} } };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 170 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 170000).unref();
const empreinteDe = (dossier) => { const out = {}; const parcours = (d, pref) => { for (const n of fs.readdirSync(d).sort()) { const p = path.join(d, n), st = fs.lstatSync(p); if (st.isDirectory()) parcours(p, pref + n + '/'); else out[pref + n] = st.isSymbolicLink() ? 'lien' : crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); } }; parcours(dossier, ''); return out; };

(async () => {
  console.log('\n── test-2984 : la remise à zéro de l\'espace de test ──');
  if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules'))) { console.log('  … SAUTÉE : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }
  const fs2 = require('os'); const banc = fs.mkdtempSync(path.join(fs2.tmpdir(), 'b2984-'));
  const voisin = path.join(banc, 'dossier-voisin'); fs.mkdirSync(path.join(voisin, 'profond'), { recursive: true });
  fs.writeFileSync(path.join(voisin, 'precieux.json'), '{"a":"ne pas toucher"}'); fs.writeFileSync(path.join(voisin, 'profond', 'autre.txt'), 'autre');
  fs.writeFileSync(path.join(banc, 'temoin.txt'), 'je suis à côté de TEAMOP_DATA');
  const fauxA = B2.fauxAnthropic(); await new Promise(r => fauxA.s.listen(0, '127.0.0.1', r));
  const S = await B2.lancer({ essai: true, banc, anthropic: fauxA, config: { mailPreuveExigee: false, agents: { cleApi: 'sk-ant-banc', plafondMoisTotal: 10, reunionsAuto: false } } }); vivants.push(S);
  vrai('le serveur de test démarre', S.vivant);
  vrai('le semis est fait', await attendre(() => fs.existsSync(path.join(S.D, 'essais-semis.json')), 200));
  const cle = S.CLE, avecCle = (r, c) => r + '?cle=' + (c === undefined ? cle : c);
  const aller = async (compte) => lireFragment((await S.appel(avecCle('/api/essais/connexion') + '&compte=' + compte)).h.get('location')).stockage;

  console.log('\n1. Avant');
  const emp = crypto.randomBytes(32).toString('hex');
  await S.appel('/api/compte/creer', { email: 'avant@exemple-essai.fr', h: emp, prenom: 'A', nom: 'A', societe: 'A' });
  vrai('une inscription faite avant (son courriel est capté)', await attendre(async () => ((await S.appel(avecCle('/api/essais/courriels'))).j.courriels || []).some(x => x.a.some(a => /avant@/.test(a))), 60));
  const jetonClient0 = (await aller('client')).teamop_portail_jeton, tourPatron0 = (await aller('patron')).tour_token;
  const tAvant = JSON.parse(fs.readFileSync(path.join(S.D, 'espaces.json'), 'utf8')).climessai.t;
  fs.writeFileSync(path.join(S.D, 'junk.json'), '{"vieux":true}'); fs.writeFileSync(path.join(S.D, '.cache-cache'), 'x'); fs.mkdirSync(path.join(S.D, 'sous'), { recursive: true }); fs.writeFileSync(path.join(S.D, 'sous', 'f.json'), '{}');
  fs.symlinkSync(voisin, path.join(S.D, 'lien-vers-voisin')); fs.symlinkSync(path.join(banc, 'temoin.txt'), path.join(S.D, 'lien-vers-temoin'));
  const empreintesHors = () => ({ voisin: empreinteDe(voisin), banc: fs.readFileSync(path.join(banc, 'temoin.txt'), 'utf8'), config: fs.readFileSync(S.CONFIG, 'utf8'), liste: fs.readdirSync(banc).sort() });
  const hors0 = empreintesHors();
  vrai('(population) les témoins existent : le voisin porte 2 fichiers, le dossier de données plus de 8 entrées', Object.keys(hors0.voisin).length === 2 && fs.readdirSync(S.D).length > 8);
  const nbAvant = fs.readdirSync(S.D).length;
  const mois = new Date().toISOString().slice(0, 7), budgetTexte = JSON.stringify({ mois, parAgent: { examen: 10.5 } });
  fs.writeFileSync(path.join(S.D, 'agents-budget.json'), budgetTexte);       // 10,50 $ dépensés ce mois-ci : au-dessus du plafond de 10 $

  console.log('\n2. La demande');
  const rMauvaise = await S.appel(avecCle('/api/essais/remise-a-zero', 'f'.repeat(64)), {});
  v('⛔ mauvaise clé : 403, aucune demande, le serveur reste debout, rien n\'est effacé', [rMauvaise.s, fs.existsSync(path.join(S.D, '.remise-a-zero')), S.sortis(), fs.existsSync(path.join(S.D, 'junk.json'))], [403, false, 0, true]);
  const rGet = await fetch(S.B + avecCle('/api/essais/remise-a-zero'));
  v('⛔ la remise à zéro ne se fait qu\'en POST : un GET (un lien, un robot, une image) ne fait rien', [rGet.status, fs.existsSync(path.join(S.D, '.remise-a-zero')), S.sortis()], [404, false, 0]);
  const r = await S.appel(avecCle('/api/essais/remise-a-zero'), {});
  v('la bonne clé : 200, le serveur annonce son redémarrage', [r.s, r.j.ok, r.j.redemarrage], [200, true, true]);
  vrai('le serveur S\'ARRÊTE de lui-même', await attendre(() => S.sortis() >= 1, 120));
  vrai('⛔ proprement : par SIGTERM (« arrêt (SIGTERM) » au journal), code de sortie 0', /arrêt \(SIGTERM\)/.test(S.sortie()) && S.enfant().exitCode === 0);
  vrai('⛔ et il n\'a RIEN supprimé avant de partir : la demande est posée, les anciens fichiers sont encore là (le vidage est celui du DÉMARRAGE)', fs.existsSync(path.join(S.D, '.remise-a-zero')) && fs.existsSync(path.join(S.D, 'junk.json')) && fs.readdirSync(S.D).length >= nbAvant);

  console.log('\n3. Après le redémarrage');
  vrai('le serveur redémarre sur les mêmes dossiers', await S.demarrer());
  vrai('le semis est refait', await attendre(() => fs.existsSync(path.join(S.D, 'essais-semis.json')), 200));
  const restes = fs.readdirSync(S.D);
  v('⛔ les vieux fichiers ne sont plus là : ni le fichier posé, ni le caché, ni le sous-dossier, ni les liens', ['junk.json', '.cache-cache', 'sous', 'lien-vers-voisin', 'lien-vers-temoin'].filter(n => restes.includes(n)), []);
  vrai('la marque est toujours là, et la demande est consommée', restes.includes('.espace-de-test') && !restes.includes('.remise-a-zero'));
  const hors1 = empreintesHors();
  v('⛔ le dossier VOISIN que le lien désignait est intact (mêmes fichiers, mêmes octets)', hors1.voisin, hors0.voisin);
  v('⛔ le fichier à côté du dossier de données, la config et le contenu du dossier du banc : pas un octet de changé', [hors1.banc, hors1.config === hors0.config, hors1.liste.join()], [hors0.banc, true, hors0.liste.join()]);
  const courriels = (await S.appel(avecCle('/api/essais/courriels'))).j;
  vrai('⛔ c\'est un espace NEUF : le courriel d\'avant n\'est plus là (et ceux du nouveau semis y sont)', courriels.nombre >= 2 && !courriels.courriels.some(x => x.a.some(a => /avant@/.test(a))));
  v('…l\'inscription d\'avant n\'existe plus (connexion refusée)', (await S.appel('/api/compte/connexion', { email: 'avant@exemple-essai.fr', h: emp })).s, 401);
  v('…les anciennes sessions sont mortes (portail et Tour)', [(await S.appel('/api/compte/moi', undefined, jetonClient0)).s, (await S.appel('/api/monitor/moi', undefined, tourPatron0)).s], [401, 401]);
  const tApres = JSON.parse(fs.readFileSync(path.join(S.D, 'espaces.json'), 'utf8')).climessai.t;
  vrai('…Clim Essai est recréée (un autre identifiant d\'espace)', tApres && tApres !== tAvant);
  const nv = await aller('client');
  v('…et « Se connecter comme client » ouvre le compte resemé', (await S.appel('/api/compte/moi', undefined, nv.teamop_portail_jeton)).j.compte.email, 'client@exemple-essai.fr');
  const T = (await aller('patron')).tour_token;
  const equipe = (await S.appel('/api/monitor/users', undefined, T)).j.users || [];
  v('la Tour garde ses deux comptes, sans doublon (son fichier est à côté de la config, hors des données)', equipe.map(u => u.nom).sort(), ['Collaborateur Essai', 'Patron Essai']);
  v('le faux facteur n\'a vu aucune connexion, avant comme après', S.smtp.connexions(), 0);
  v('⛔ le compteur de dépense des agents n\'a pas bougé d\'un octet à la remise à zéro (10,50 $ toujours inscrits)', fs.readFileSync(path.join(S.D, 'agents-budget.json'), 'utf8'), budgetTexte);
  const recusAvant = fauxA.recus.length;
  await S.appel('/api/monitor/conversations/envoyer', { fil: 'lea', texte: 'Léa, un point après la remise à zéro ?' }, T);
  await dormir(2500);
  v('⛔ et Léa est refusée au plafond (`plafond_total`) : le faux Anthropic ne reçoit RIEN — la remise à zéro ne rachète pas de crédit', fauxA.recus.length, recusAvant);
  await S.nettoyer(); fauxA.s.close();

  console.log('\n4. Un dossier non reconnu : rien ne s\'efface');
  const banc2 = fs.mkdtempSync(path.join(fs2.tmpdir(), 'b2984b-'));
  const R = await B2.lancer({ essai: true, banc: banc2, config: { mailPreuveExigee: false }, donnees: (D) => { fs.writeFileSync(path.join(D, 'espaces.json'), '{"vraie":{"nom":"Vraie","t":"vraie-1","code":"x","ts":1}}'); fs.writeFileSync(path.join(D, 'precieux.json'), '{"vrai":true}'); } }); vivants.push(R);
  vrai('démarre', R.vivant);
  const avant = empreinteDe(R.D);
  const rr = await R.appel('/api/essais/remise-a-zero?cle=' + R.CLE, {});
  v('⛔ la route REFUSE (409 `dossier_non_reconnu`, avec la raison) quand le dossier n\'est pas reconnu comme un dossier de test', [rr.s, rr.j.error, rr.j.raison], [409, 'dossier_non_reconnu', 'dossier_non_vierge']);
  await dormir(1500);
  v('⛔ rien n\'est écrit, rien n\'est effacé, le serveur reste debout', [fs.existsSync(path.join(R.D, '.remise-a-zero')), JSON.stringify(empreinteDe(R.D)) === JSON.stringify(avant), R.sortis(), (await R.appel('/health')).s], [false, true, 0, 200]);
  await R.nettoyer();
  try { fs.rmSync(banc2, { recursive: true, force: true }); } catch (e) {}
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });

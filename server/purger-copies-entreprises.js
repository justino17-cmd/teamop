#!/usr/bin/env node
/* ══ PURGER LES COPIES DES DOCUMENTS D'ENTREPRISE GARDÉES CHEZ TEAM OP (4 novembre 2026) ══════════════════════════════════
 *
 * Usage, SUR LE VPS, en root :
 *     TEAMOP_DATA=/opt/teamop/data node /opt/teamop/repo/server/purger-copies-entreprises.js            → CONSTAT : compte, n'écrit rien
 *     systemctl stop teamop-api && TEAMOP_DATA=/opt/teamop/data node …/purger-copies-entreprises.js --faire && systemctl start teamop-api
 *
 * ⛔ POURQUOI. Du 20 août au 4 novembre 2026, chaque devis, facture, bon ou rapport qu'une entreprise envoyait à SON client par le
 * « mode simple » de `/api/sendmail` partait avec une copie cachée vers contact@teamop.fr (`mailerEnvoi`), et le journal des e-mails
 * en gardait le destinataire, l'objet et le texte. Ce sont les données du client de notre client. Le correctif (même jour) tarit la
 * source ; cet outil range ce qui est DÉJÀ entré. Il ne s'exécute qu'avec l'accord de Justin.
 *
 * CE QU'IL COMPTE (constat) et ce qu'il retire (`--faire`), chaque écriture par un temporaire du même dossier puis un renommage :
 *   a. `support-mails.json` (la relève du support, lue par la Tour) : les mails dont l'ADRESSE d'expéditeur est la nôtre mais dont le
 *      NOM affiché n'est pas TEAM OP / TeamOP — c'est la forme exacte d'une copie (« "Nom de l'entreprise" <contact@teamop.fr> »).
 *   b. `mails-envoyes.json` (le journal des e-mails, lu par la Tour) : les entrées qui ne parlent pas de TEAM OP — ni « TEAM OP » /
 *      « TeamOP » dans l'objet, ni « teamop » dans le texte. Les e-mails de TEAM OP lui-même portent tous l'un ou l'autre (signature,
 *      lien) ; les traces neuves (« Document envoyé au nom d'une entreprise ») sont gardées, elles ne contiennent rien.
 *      ⚠️ C'est une RÈGLE DE TRI, pas une preuve : le constat donne le nombre, Justin décide.
 *   c. `sentmap.jsonl` (l'adresse du client final pour chaque bon envoyé) : toutes les lignes si la boîte commandes partagée n'est pas
 *      configurée (elle ne sert alors à rien), sinon celles de plus de 90 jours.
 *   d. `envois-entreprises.json` (Message-ID, espace, date — aucune donnée personnelle) et `agents-camille.json` : comptés seulement,
 *      jamais modifiés (ils ne contiennent ni adresse ni texte de client final).
 * Il n'affiche JAMAIS une adresse, un nom, un objet ou un texte : seulement des nombres.
 *
 * ⛔ LA BOÎTE contact@ ELLE-MÊME (chez l'hébergeur) n'est pas touchée par cet outil. Procédure, à la main, par la Tour ou le webmail :
 *   rechercher les messages reçus depuis le 20/08/2026 dont l'expéditeur est contact@teamop.fr et dont le nom affiché n'est pas
 *   « TeamOP » ; vérifier qu'il s'agit bien de documents d'entreprise (devis, facture, bon, rapport) ; les supprimer, puis vider la
 *   corbeille. Ne rien supprimer d'autre.
 *
 * Codes : 0 constat ou purge faite ; 3 le service tourne (avec `--faire`) ; 4 un fichier illisible — rien n'est écrit.
 */
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const D = process.env.TEAMOP_DATA || '/opt/teamop/data';
const CONF = process.env.TEAMOP_CONFIG || '/opt/teamop/config.json';
const FAIRE = process.argv.includes('--faire');

const lireJson = (f, defaut) => { const p = path.join(D, f); if (!fs.existsSync(p)) return { ok: true, val: defaut, absent: true };
  try { return { ok: true, val: JSON.parse(fs.readFileSync(p, 'utf8')) }; } catch (e) { return { ok: false }; } };
const ecrire = (f, contenu) => { const p = path.join(D, f); fs.writeFileSync(p + '.tmp', contenu); fs.renameSync(p + '.tmp', p); };
const adrNue = (a) => { const s = String(a || '').trim().toLowerCase(); const m = s.match(/<([^>]+)>/); return (m ? m[1] : s).trim(); };

let config = {};
try { config = JSON.parse(fs.readFileSync(CONF, 'utf8')); } catch (e) {}
const smtp = config.smtp || {};
const NOS = new Set([smtp.from, smtp.user, config.notifDemandes, config.contactEmail, config.alertEmail, 'contact@teamop.fr'].map(adrNue).filter(Boolean));
const imapPartagee = !!(config.imap && config.imap.user);

if (FAIRE) {
  let actif = '';
  try { actif = execFileSync('systemctl', ['is-active', 'teamop-api'], { encoding: 'utf8' }).trim(); } catch (e) { actif = String((e && e.stdout) || '').trim(); }
  if (actif === 'active') { console.log('⛔ teamop-api tourne : il réécrirait ces fichiers depuis sa mémoire. `systemctl stop teamop-api` d\'abord.'); process.exit(3); }
}

const sup = lireJson('support-mails.json', []);
const jr = lireJson('mails-envoyes.json', []);
const env = lireJson('envois-entreprises.json', []);
const cam = lireJson('agents-camille.json', {});
let sent = { ok: true, lignes: [] };
try { const p = path.join(D, 'sentmap.jsonl'); if (fs.existsSync(p)) sent.lignes = fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch (e) { sent.ok = false; }
if (![sup, jr, env, cam, sent].every(x => x.ok)) { console.log('⛔ un fichier est illisible : rien n\'est écrit.'); process.exit(4); }

const copieSupport = (m) => m && NOS.has(adrNue(m.from)) && !/team\s?op/i.test(String(m.fromName || ''));
const traceNeuve = (e) => /Document envoyé au nom d’une entreprise/.test(String(e && e.sujet || ''));
const parleDeNous = (e) => /team\s?op/i.test(String(e && e.sujet || '')) || /teamop/i.test(String(e && e.txt || ''));
const supListe = Array.isArray(sup.val) ? sup.val : [];
const jrListe = Array.isArray(jr.val) ? jr.val : [];
const supRetire = supListe.filter(copieSupport).length;
const jrRetire = jrListe.filter(e => !traceNeuve(e) && !parleDeNous(e)).length;
const limite = Date.now() - 90 * 86400000;
const sentGarde = imapPartagee ? sent.lignes.filter(x => x && (x.ts || 0) > limite) : [];

console.log((FAIRE ? 'PURGE' : 'CONSTAT') + ' — ' + D);
console.log('  support-mails.json   : ' + supRetire + ' copie(s) de document d’entreprise sur ' + supListe.length + ' mail(s)');
console.log('  mails-envoyes.json   : ' + jrRetire + ' entrée(s) qui ne parlent pas de TEAM OP sur ' + jrListe.length + ' (règle de tri, à vérifier)');
console.log('  sentmap.jsonl        : ' + (sent.lignes.length - sentGarde.length) + ' ligne(s) à retirer sur ' + sent.lignes.length + (imapPartagee ? ' (plus de 90 jours)' : ' (boîte commandes partagée non configurée : toutes)'));
console.log('  envois-entreprises   : ' + (Array.isArray(env.val) ? env.val.length : 0) + ' Message-ID retenu(s) — aucune donnée personnelle, non modifié');
console.log('  agents-camille.json  : ' + Object.keys((cam.val && cam.val.mids) || {}).length + ' empreinte(s) de mails vus — non modifié');

if (!FAIRE) { console.log('\nRien n\'est écrit. Avec l\'accord de Justin : arrêter le service, relancer avec --faire, redémarrer.'); process.exit(0); }
if (!sup.absent) ecrire('support-mails.json', JSON.stringify(supListe.filter(m => !copieSupport(m))));
if (!jr.absent) ecrire('mails-envoyes.json', JSON.stringify(jrListe.filter(e => traceNeuve(e) || parleDeNous(e))));
if (sent.lignes.length) ecrire('sentmap.jsonl', sentGarde.map(x => JSON.stringify(x)).join('\n') + (sentGarde.length ? '\n' : ''));
console.log('\nFait. Redémarrer : systemctl start teamop-api');

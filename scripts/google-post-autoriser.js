#!/usr/bin/env node
/* À lancer UNE FOIS, sur le Mac de Justin, quand Google a accordé l'accès à l'API Business Profile.
   Obtient le refresh token par la connexion Google habituelle (navigateur) et le range DIRECTEMENT dans les secrets
   GitHub par `gh secret set` : il ne s'affiche nulle part, il ne passe ni par une conversation ni par un fichier.

     node scripts/google-post-autoriser.js

   Il demande l'ID client et le secret client (le secret en saisie masquée ; ou GBP_CLIENT_ID / GBP_CLIENT_SECRET déjà
   dans l'environnement), ouvre la page de connexion Google, reçoit la réponse sur 127.0.0.1 (type « Application de
   bureau »), puis pose : GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN, GBP_ACCOUNT_ID (lu par l'API, ou demandé
   s'il y en a plusieurs) et GBP_LOCATION_ID (3113104183760997296, la fiche « TEAM OP », ou GBP_LOCATION_ID).
   Réglables pour les bancs (tests/test-3065.js) : GBP_AUTH_URL, GBP_TOKEN_URL, GBP_ACCOUNTS_URL, GBP_NO_OPEN, GBP_REPO. */
'use strict';
const http = require('http'), readline = require('readline'), crypto = require('crypto');
const { spawnSync } = require('child_process');

const SCOPE = 'https://www.googleapis.com/auth/business.manage';
const FICHE = '3113104183760997296';
const dit = t => console.log(t);

function demander(question, masque) {
  return new Promise(res => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: !!process.stdin.isTTY });
    if (masque && process.stdin.isTTY) { rl._writeToOutput = s => { if (s.includes(question)) rl.output.write(s); else if (/[\r\n]/.test(s)) rl.output.write(s); }; }
    rl.question(question, r => { rl.close(); res(r.trim()); });
  });
}

function poser(nom, valeur) {
  const args = ['secret', 'set', nom]; if (process.env.GBP_REPO) args.push('--repo', process.env.GBP_REPO);
  const r = spawnSync('gh', args, { input: valeur, encoding: 'utf8' });   // la valeur passe par l'entrée standard, jamais par un argument
  if (r.status !== 0) throw new Error(`gh secret set ${nom} a échoué (${(r.stderr || '').replace(valeur, '***').trim().slice(0, 200)})`);
  dit('  posé : ' + nom);
}

async function main() {
  const id = process.env.GBP_CLIENT_ID || await demander('ID client OAuth : ');
  const secret = process.env.GBP_CLIENT_SECRET || await demander('Secret client (saisie masquée) : ', true);
  if (!id || !secret) throw new Error('ID client et secret client sont nécessaires');
  const etat = crypto.randomBytes(16).toString('hex');
  let rendre; const recu = new Promise(r => rendre = r);
  const srv = http.createServer((q, r) => {
    const u = new URL(q.url, 'http://127.0.0.1');
    if (u.pathname !== '/') { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    r.end('<p>Connexion reçue. Vous pouvez fermer cet onglet et revenir au terminal.</p>');
    rendre({ code: u.searchParams.get('code'), etat: u.searchParams.get('state'), erreur: u.searchParams.get('error') });
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const redirect = `http://127.0.0.1:${srv.address().port}`;
  const url = (process.env.GBP_AUTH_URL || 'https://accounts.google.com/o/oauth2/v2/auth') + '?' + new URLSearchParams({
    client_id: id, redirect_uri: redirect, response_type: 'code', scope: SCOPE, access_type: 'offline', prompt: 'consent', state: etat });
  dit('Connectez-vous avec le compte Google qui est propriétaire ou gestionnaire de la fiche TEAM OP :\n' + url);
  if (!process.env.GBP_NO_OPEN) spawnSync(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { stdio: 'ignore' });
  const rep = await Promise.race([recu, new Promise((_, no) => setTimeout(() => no(new Error('pas de réponse de Google après 5 minutes')), 300000))]);
  srv.close();
  if (rep.erreur) throw new Error('Google a refusé : ' + rep.erreur);
  if (rep.etat !== etat) throw new Error('réponse inattendue (state différent) : rien n\'a été posé');
  const t = await (await fetch(process.env.GBP_TOKEN_URL || 'https://oauth2.googleapis.com/token', { method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code: rep.code, client_id: id, client_secret: secret, redirect_uri: redirect, grant_type: 'authorization_code' }) })).json();
  if (!t.refresh_token) throw new Error('Google n\'a pas rendu de refresh token (' + (t.error || 'raison inconnue') + '). Retirez l\'accès de l\'application sur myaccount.google.com/permissions puis recommencez.');

  let compte = process.env.GBP_ACCOUNT_ID || '';
  if (!compte) {
    const r = await fetch(process.env.GBP_ACCOUNTS_URL || 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts', { headers: { Authorization: 'Bearer ' + t.access_token } });
    const j = await r.json().catch(() => ({}));
    const liste = (j.accounts || []).map(a => a.name);
    if (liste.length === 1) compte = liste[0];
    else if (liste.length > 1) compte = await demander('Plusieurs comptes (' + liste.join(', ') + '). Lequel ? ');
    else dit(`  ID de compte non lu (HTTP ${r.status} : l'accès à l'API est-il bien accordé ?). Posez-le plus tard : gh secret set GBP_ACCOUNT_ID`);
  }
  poser('GBP_CLIENT_ID', id); poser('GBP_CLIENT_SECRET', secret); poser('GBP_REFRESH_TOKEN', t.refresh_token);
  if (compte) poser('GBP_ACCOUNT_ID', compte.replace(/^accounts\//, ''));
  poser('GBP_LOCATION_ID', process.env.GBP_LOCATION_ID || FICHE);
  dit('Terminé : aucun secret n\'a été affiché. Les posts partiront avec le prochain article.');
}

main().then(() => process.exit(0), e => { console.error('✗ ' + e.message); process.exit(1); });

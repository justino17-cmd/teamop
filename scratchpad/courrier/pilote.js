/* Pilote commun des sondes d'OP Courrier — playwright-core + le Chromium de l'image, rien d'autre.
   ⛔ 127.0.0.1 UNIQUEMENT, la page d'essai `scratchpad/courrier/essai.html` (le MODULE `opcourrier.js` monté avec sa source de démonstration ; jamais teamop.fr, jamais app.html), UNE seule instance de navigateur
   à la fois, tuée à la fin.
   `playwright-core` n'est PAS dans le dépôt (aucune dépendance) : l'installer dans un dossier HORS dépôt et le désigner,
       mkdir -p /tmp/pw && (cd /tmp/pw && npm i playwright-core) ; NODE_PATH=/tmp/pw/node_modules node scratchpad/courrier/ctx_check.js
   Jamais `playwright install` : le navigateur est /opt/pw-browsers/chromium. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const RACINE = path.join(__dirname, '..', '..');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium';
let pw; try { pw = require('playwright-core'); } catch (e) { console.error('playwright-core introuvable : voir l\'en-tête de scratchpad/courrier/pilote.js (NODE_PATH)'); process.exit(2); }

/* le dépôt, servi tel quel sur 127.0.0.1 (un fichier de la racine ou un sous-dossier ; rien hors de la racine) */
function servir() {
  const srv = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0].split('#')[0]);
    const f = path.join(RACINE, u === '/' ? 'scratchpad/courrier/essai.html' : u);
    if (!f.startsWith(RACINE)) { r.writeHead(403); return r.end(); }
    fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.png') ? 'image/png' : 'text/html;charset=utf-8' }); r.end(d); });
  });
  return new Promise(res => srv.listen(0, '127.0.0.1', () => res({ srv, base: 'http://127.0.0.1:' + srv.address().port })));
}
async function ouvrir() {
  const { srv, base } = await servir();
  const b = await pw.chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
  /* ⛔ la sonde ne laisse JAMAIS un seul octet sortir : tout ce qui n'est pas 127.0.0.1 est refusé ET compté */
  const sorties = [];
  const ctxPour = async (opts) => {
    const ctx = await b.newContext(opts);
    await ctx.route(u => !/^http:\/\/127\.0\.0\.1[:/]/.test(u.toString()) && !/^(data|blob|about):/.test(u.toString()), (route) => { sorties.push(route.request().url()); route.abort(); });
    return ctx;
  };
  const fermer = async () => { try { await b.close(); } catch (e) { /* déjà fermé */ } srv.close(); };
  /* `b` se comporte comme le navigateur de la maquette (`b.newContext`, `b.close`) mais passe par le garde-fou ci-dessus */
  /* `url` : la page d'essai ; `avec('mode=reel&cotes=pro')` : la même avec ses paramètres */
  const url = base + '/scratchpad/courrier/essai.html';
  return { b: { newContext: ctxPour, close: fermer }, base, url, avec: (q) => url + '?' + q, ctxPour, sorties, fermer };
}
/* le bilan commun : les lignes, le total, ce qui est sorti du navigateur (doit être VIDE) ; code de sortie 1 au moindre ✗ */
async function bilan(R, P, attendu) {
  console.log(R.join('\n'));
  const ok = R.filter(x => x.startsWith('PASS')).length, ko = R.filter(x => x.startsWith('FAIL')).length;
  const sortie = P ? P.sorties.length : 0;
  console.log('\nTOTAL ' + ok + '/' + R.length + (attendu ? ' (attendu : ' + attendu + ')' : '') + ' — aucune requête sortie : ' + (sortie === 0));
  if (P) await P.fermer();
  process.exit(ko || sortie || (attendu && R.length !== attendu) ? 1 : 0);
}
const FORMATS = { mac: { width: 1440, height: 900 }, ipad: { width: 820, height: 1180 }, iphone: { width: 390, height: 844 } };
module.exports = { ouvrir, bilan, FORMATS, RACINE };

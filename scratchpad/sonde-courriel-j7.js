/* Sonde : le courriel J-7 (la fin d'une période offerte) tel qu'une messagerie le PEINT — jour et nuit, au format
   téléphone. Le texte est gardé par tests/test-840.js (vrai serveur, vrai facteur SMTP) ; ici on regarde le rendu : la
   ligne « 💳 En vous abonnant au plus tard le …, rien n'est prélevé avant le … » (29 septembre 2026, « 2 oui » de
   Justin) dans le cadre du devis, lisible de jour comme de nuit (le mode sombre des messageries suit
   `prefers-color-scheme`, que le gabarit lit).
   Les VRAIES fonctions du serveur (`rappelEcheanceMail`, `mailTeamOP`, `MAIL_BLOCS`, `MAIL_STYLE`…) sont extraites de
   server/index.js et exécutées ; la page est ouverte dans le Chromium de l'image, en local, sans réseau.
   Et, depuis la relecture de `gardien` (29 septembre 2026), le courriel de l'entreprise DÉJÀ ABONNÉE (`rappelAbonneMail` :
   « votre abonnement prend le relais », sans lien de paiement) dans ses trois variantes — en essai, en impayé, résiliée —
   jour et nuit : la pastille, le titre et la ligne de date se lisent, aucun lien ne mène à la page de paiement.
   Usage : node scratchpad/sonde-courriel-j7.js      (photos dans scratchpad/vues-courriel/) */
const fs = require('fs'), path = require('path'), net = require('net'), os = require('os');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SORTIE = path.join(__dirname, 'vues-courriel');
fs.mkdirSync(SORTIE, { recursive: true });
const SRC = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++; console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a))); };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const libre = () => new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });

/* ── les vraies fonctions, extraites par leur nom (déclarations de fonction et constantes d'une ligne ou d'un bloc) ── */
function fonction(nom) {
  const d0 = SRC.indexOf('function ' + nom + '(');
  if (d0 < 0) return '';
  let p = 0;
  for (let k = SRC.indexOf('{', d0); k < SRC.length; k++) { if (SRC[k] === '{') p++; else if (SRC[k] === '}') { p--; if (!p) return SRC.slice(d0, k + 1); } }
  return '';
}
function constante(nom) {
  const d0 = SRC.indexOf('const ' + nom + ' =');
  if (d0 < 0) return '';
  /* jusqu'au `;` qui termine la déclaration, à profondeur zéro (les blocs, chaînes et gabarits sont suivis) */
  let p = 0, q = null;
  for (let k = d0; k < SRC.length; k++) {
    const c = SRC[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === '\'' || c === '"' || c === '`') { q = c; continue; }
    if (c === '{' || c === '(' || c === '[') p++; else if (c === '}' || c === ')' || c === ']') p--;
    else if (c === ';' && p === 0) return SRC.slice(d0, k + 1);
  }
  return '';
}
const MORCEAUX = [constante('MAIL_POLICE'), constante('MAIL_STYLE'), fonction('mailTeamOP'), constante('MAIL_BLOCS'),
  constante('FORMULE_LBL2'), constante('PRIX_ABO_MOIS'), constante('MOIS_OFFERTS_ANNEE'), fonction('rappelEcheanceMail'), fonction('rappelAbonneMail')];
vrai('(population) les neuf morceaux du gabarit sont extraits de server/index.js', MORCEAUX.every(Boolean));
const [faire, abonne] = new Function(MORCEAUX.join('\n') + '\nreturn [rappelEcheanceMail, rappelAbonneMail];')();
const FIN = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
const jj = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10).split('-').reverse().join('/');
const PRELEV = { limite: jj(FIN, -2).slice(0, 5), debut: jj(FIN, 1) };
const avec = faire('ESSAI-SONDE', FIN, 'premium', 7, PRELEV);
const sans = faire('ESSAI-SONDE', FIN, 'premium', 7, null);
const LIGNE = 'En vous abonnant au plus tard le ' + PRELEV.limite + ', rien n\'est prélevé avant le ' + PRELEV.debut;
vrai('le courriel AVEC la promesse la porte (texte et HTML)', avec.text.includes(LIGNE) && avec.html.includes('💳 En vous abonnant au plus tard le <b>' + PRELEV.limite + '</b>'));
vrai('le courriel SANS la promesse ne la porte pas', !sans.text.includes('rien n\'est prélevé') && !sans.html.includes('rien n\'est prélevé'));
fs.writeFileSync(path.join(SORTIE, 'j7-avec.html'), avec.html);
fs.writeFileSync(path.join(SORTIE, 'j7-sans.html'), sans.html);
const DEBUT = new Date(Date.parse(FIN + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);
const ECH = new Date(Date.parse(FIN + 'T00:00:00Z') + 20 * 86400000).toISOString().slice(0, 10);
const fr = iso => iso.split('-').reverse().join('/');
const ABONNES = {
  'abonne-essai': [abonne('ESSAI-SONDE', FIN, { etat: 'abonne', impaye: false, resilie: '', premier: DEBUT, prochaine: '' }), fr(DEBUT)],
  'abonne-impaye': [abonne('ESSAI-SONDE', FIN, { etat: 'abonne', impaye: true, resilie: '', premier: '', prochaine: ECH }), fr(ECH)],
  'abonne-resilie': [abonne('ESSAI-SONDE', FIN, { etat: 'abonne', impaye: false, resilie: ECH, premier: '', prochaine: '' }), fr(ECH)] };
for (const [nom, [m]] of Object.entries(ABONNES)) fs.writeFileSync(path.join(SORTIE, 'j7-' + nom + '.html'), m.html);
vrai('(population) les trois variantes « déjà abonnée » sont fabriquées par la vraie fonction',
  Object.values(ABONNES).every(([m]) => /prend le relais/.test(m.html) && !/recap-abonnement/.test(m.html)));

(async () => {
  const port = await libre();
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'j7-'));
  /* SwiftShader : le chemin de rendu d'un vrai appareil (CLAUDE.md) */
  const nav = spawn('/opt/pw-browsers/chromium', ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader', '--remote-debugging-port=' + port, '--user-data-dir=' + profil, 'about:blank'], { stdio: 'ignore' });
  let cible = null;
  for (let i = 0; i < 100 && !cible; i++) { await dormir(100); try { const l = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json(); cible = l.find(x => x.type === 'page'); } catch (e) {} }
  vrai('le navigateur démarre', !!cible);
  if (!cible) { nav.kill('SIGKILL'); process.exit(1); }
  const ws = new WebSocket(cible.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const att = new Map();
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && att.has(m.id)) { att.get(m.id)(m); att.delete(m.id); } });
  const cdp = (method, params) => new Promise(r => { const i = ++id; att.set(i, r); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  const ev = async x => { const r = await cdp('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); return r.result && r.result.result ? r.result.result.value : undefined; };
  await cdp('Page.enable'); await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 1400, deviceScaleFactor: 2, mobile: true });
  for (const [nom, fichier] of [['avec', 'j7-avec.html'], ['sans', 'j7-sans.html']].concat(Object.keys(ABONNES).map(n => [n, 'j7-' + n + '.html']))) {
    for (const mode of ['light', 'dark']) {
      await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: mode }] });
      await cdp('Page.navigate', { url: 'file://' + path.join(SORTIE, fichier) });
      await dormir(700);
      if (ABONNES[nom]) {
        const q = await ev(`(() => {
          const lire = c => { const m = /rgba?\\(([\\d.]+),\\s*([\\d.]+),\\s*([\\d.]+)(?:,\\s*([\\d.]+))?\\)/.exec(c || ''); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null; };
          const lum = c => { const k = c.slice(0, 3).map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2]; };
          const ctr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
          const fond = e => { for (let x = e; x; x = x.parentElement) { const c = lire(getComputedStyle(x).backgroundColor); if (c && c[3] > 0.5) return c; } return [255, 255, 255, 1]; };
          const feuille = re => [...document.querySelectorAll('body *')].filter(e => re.test(e.textContent) && ![...e.children].some(c => re.test(c.textContent)))[0];
          const mesure = e => e ? +ctr(lire(getComputedStyle(e).color), fond(e)).toFixed(2) : 0;
          const ligne = [...document.querySelectorAll('td')].find(t => /💳/.test(t.textContent) && !t.querySelector('td'));
          const liens = [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'));
          return { puce: mesure(feuille(/^\\s*Abonnement\\s*$/)), titre: mesure(feuille(/Votre abonnement prend le relais/)),
            ligne: ligne ? mesure(ligne) : 0, gras: ligne ? [...ligne.querySelectorAll('b')].map(b => b.textContent) : [],
            liens, largeur: document.documentElement.scrollWidth };
        })()`);
        const et = 'J-7 ' + nom + ' · ' + (mode === 'light' ? 'jour' : 'nuit');
        vrai(et + ' : la pastille « Abonnement » se lit (' + (q && q.puce) + ' ≥ 4,5)', q && q.puce >= 4.5);
        vrai(et + ' : le titre se lit (' + (q && q.titre) + ' ≥ 4,5)', q && q.titre >= 4.5);
        vrai(et + ' : la ligne 💳 se lit (' + (q && q.ligne) + ' ≥ 4,5), sa date en gras', q && q.ligne >= 4.5 && JSON.stringify(q.gras) === JSON.stringify([ABONNES[nom][1]]));
        vrai(et + ' : aucun lien vers la page de paiement — seulement l\'application (' + (q && q.liens.filter(h => /teamop\.fr/.test(h)).join(', ')) + ')',
          q && !q.liens.some(h => /recap-abonnement|stripe/i.test(h)) && q.liens.some(h => h === 'https://teamop.fr/app.html'));
        vrai(et + ' : rien ne dépasse de côté à 390 px (' + (q && q.largeur) + ')', q && q.largeur <= 390);
        const shot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
        if (shot.result && shot.result.data) fs.writeFileSync(path.join(SORTIE, 'j7-' + nom + '-' + (mode === 'light' ? 'jour' : 'nuit') + '.png'), Buffer.from(shot.result.data, 'base64'));
        continue;
      }
      const r = await ev(`(() => {
        const lire = c => { const m = /rgba?\\(([\\d.]+),\\s*([\\d.]+),\\s*([\\d.]+)(?:,\\s*([\\d.]+))?\\)/.exec(c || ''); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null; };
        const lum = c => { const k = c.slice(0, 3).map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2]; };
        const ctr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
        const fond = e => { for (let x = e; x; x = x.parentElement) { const c = lire(getComputedStyle(x).backgroundColor); if (c && c[3] > 0.5) return c; } return [255, 255, 255, 1]; };
        const td = [...document.querySelectorAll('td')].find(t => /rien n'est prélevé avant/.test(t.textContent) && !t.querySelector('td'));
        if (!td) return { present: false, largeur: document.documentElement.scrollWidth };
        const b = [...td.querySelectorAll('b')].filter(x => /\\d{2}\\/\\d{2}/.test(x.textContent));
        const c = lire(getComputedStyle(td).color), f = fond(td);
        return { present: true, contraste: +ctr(c, f).toFixed(2), gras: b.map(x => x.textContent), largeur: document.documentElement.scrollWidth };
      })()`);
      const etiquette = 'J-7 ' + nom + ' la promesse · ' + (mode === 'light' ? 'jour' : 'nuit');
      if (nom === 'avec') {
        vrai(etiquette + ' : la ligne est peinte dans le cadre du devis', r && r.present);
        vrai(etiquette + ' : elle se lit (contraste ' + (r && r.contraste) + ' ≥ 4,5)', r && r.contraste >= 4.5);
        v(etiquette + ' : les deux dates en gras', r && r.gras, [PRELEV.limite, PRELEV.debut]);
      } else vrai(etiquette + ' : aucune ligne de promesse', r && r.present === false);
      vrai(etiquette + ' : rien ne dépasse de côté à 390 px (' + (r && r.largeur) + ')', r && r.largeur <= 390);
      const shot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      if (shot.result && shot.result.data) fs.writeFileSync(path.join(SORTIE, 'j7-' + nom + '-' + (mode === 'light' ? 'jour' : 'nuit') + '.png'), Buffer.from(shot.result.data, 'base64'));
    }
  }
  ws.close(); nav.kill('SIGKILL');
  try { fs.rmSync(profil, { recursive: true, force: true }); } catch (e) {}
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ la sonde a jeté : ' + (e && e.stack || e)); process.exit(1); });

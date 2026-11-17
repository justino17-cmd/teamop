const R = require('./rt.js'); const { S, L } = R;
let ok = 0, ko = 0; const v = (n, c, d) => { if (c) { ok++; console.log('  ✓', n); } else { ko++; console.log('  ✗', n, '→', d === undefined ? '' : (typeof d === 'string' ? d : JSON.stringify(d))); } };
(async () => {
  const c = await S.ouvrir({ profil: 'mac' }); const log = (...a) => console.log(...a);
  const EXP = 'Ton mot de passe provisoire a expiré. Demande-en un nouveau à ton administrateur.', GEN = 'Identifiant ou mot de passe incorrect, ou compte verrouillé. Si tu es sûr de toi, préviens ton administrateur.';
  // Julie : activation réelle, puis le provisoire ne doit plus ouvrir
  const prov = await S.provisoire(c, 'julie');
  await S.activer(c, 'julie', { pin: '135792', mdp: 'Zorglub-pamplemousse-87' });
  await c.p.evaluate(() => sessionFermer()); await c.p.waitForTimeout(1500);
  await S.connecter(c, 'julie', prov); v('le provisoire de Julie est mort après son choix', (await S.erreur(c)) === GEN, await S.erreur(c));
  // code d'activation : usage unique, expiration, « Nouveau code »
  const pt = await S.provisoire(c, 'tl'); await S.connecter(c, 'tom', pt); await S.attendreSel(c, '#cn-form-activer', 4000);
  const code1 = await c.p.evaluate(() => document.querySelector('[data-sec="code-activation"]').textContent.trim());
  await S.avancer(c, 16); await c.p.waitForTimeout(1500);
  log('texte après 16 min :', ((await R.txt(c, '#cn-form-activer')) || '').slice(-200));
  v('le code expiré affiche « Ce code a expiré. » + « Nouveau code »', /Ce code a expiré\./.test((await R.txt(c, '#cnx')) || '') && !!(await c.p.$('#cnx :text("Nouveau code")')));
  // saisie du code périmé sur le téléphone
  await S.telephone(c, 'tl'); await c.p.evaluate(() => document.querySelector('#opsec [data-ops="commencer"]').click()); await S.pin(c, '135792'); await S.pin(c, '135792');
  await c.p.evaluate(() => document.querySelector('#opsec [data-ops="saisir-code"]').click());
  await c.p.evaluate(({ code }) => { const f = document.querySelector('#opsec [data-ops="form-activation"]'); f.querySelector('[data-ops="code-champ"]').value = code; f.requestSubmit(); }, { code: code1 }); await c.p.waitForTimeout(1500);
  log('code périmé tapé :', ((await R.txt(c, '#opsec .ops-ecran')) || '').slice(0, 260));
  v('code périmé refusé avec le message exact', /Ce code n’est pas le bon, ou il a expiré\. Demande-en un nouveau sur l’ordinateur\./.test((await R.txt(c, '#opsec .ops-ecran')) || ''));
  // nom d'appareil piégé
  await c.p.click('#cnx :text("Nouveau code")').catch(() => {}); await c.p.waitForTimeout(600);
  const code2 = await c.p.evaluate(() => document.querySelector('[data-sec="code-activation"]').textContent.trim());
  v('« Nouveau code » en tire un autre', code2 && code2 !== code1, [code1, code2]);
  await c.p.evaluate(({ code }) => { const f = document.querySelector('#opsec [data-ops="form-activation"]'); f.querySelector('[data-ops="code-champ"]').value = code; f.querySelector('[data-ops="nom-champ"]').value = '<img src=x onerror=window.__pwn=1>"' + 'x'.repeat(80); f.requestSubmit(); }, { code: code2 }); await c.p.waitForTimeout(1800);
  v('nom d\'appareil piégé : inerte', await c.p.evaluate(() => !window.__pwn && !document.querySelector('img[src="x"]')));
  log('nom retenu :', await c.p.evaluate(() => SECU.comptes.tl.tel && SECU.comptes.tl.tel.nom));
  v('nom borné à 60 et sans < > "', await c.p.evaluate(() => { const n = SECU.comptes.tl.tel && SECU.comptes.tl.tel.nom; return !!n && n.length <= 60 && !/[<>"]/.test(n); }));
  // Sophie : provisoire de plus de 72 h
  const ps = await S.provisoire(c, 'sm');
  await S.avancer(c, 71 * 60); await S.connecter(c, 'sophie', ps); v('à 71 h le provisoire de Sophie marche encore (écran d\'activation)', await S.attendreSel(c, '#cn-form-activer', 3000));
  await c.p.evaluate(() => { const a = [...document.querySelectorAll('#cnx a,#cnx button')].find(b => /Revenir à la connexion/.test(b.textContent)); a && a.click(); }); await c.p.waitForTimeout(700);
  await S.avancer(c, 2 * 60); await S.connecter(c, 'sophie', ps); v('à 73 h : message d\'expiration exact', (await S.erreur(c)) === EXP, await S.erreur(c));
  // un identifiant inconnu et un provisoire expiré : même temps de réponse n'est pas mesurable ; on vérifie seulement qu'un mauvais mot de passe sur ce compte donne la phrase générique
  await S.connecter(c, 'sophie', 'faux-faux-faux1'); v('mauvais mot de passe sur un provisoire expiré : phrase générique (pas de fuite)', (await S.erreur(c)) === GEN, await S.erreur(c));
  // code d'activation réutilisé
  log('ERRJS', c.err.slice(0, 3)); log(`== ${ok} ✓ · ${ko} ✗`); await L.fermer();
})().catch(e => { console.log('EXC', e.message.slice(0, 800)); process.exit(1); });

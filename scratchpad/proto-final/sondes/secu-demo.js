// Sonde « secu-demo » (double authentification, étape 2, § 2.5) : le bloc « Démonstration » — rangé à part, déclaré, et utile.
// Population : les 7 lignes du parcours conseillé, 2 cases (deux exemplaires, une seule source d'état), 6 mots de passe de départ (4 provisoires + 2 déjà choisis),
// 3 boutons d'horloge, « Activer tous les téléphones d'un coup » (4 téléphones de plus), « Recommencer la démonstration » (retour à l'état de départ).
const S = require('./secu-commun.js'), L = S.L, v = L.v;
const T = (c, s) => c.p.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, s);
(async () => {
  const c = await S.ouvrir({ profil:'mac' });
  const demo = await c.p.evaluate(() => { const d = document.querySelector('#opsec .sec-demo'); return { ouvert:d.open, texte:d.textContent.replace(/\s+/g, ' '), parcours:[...d.querySelectorAll('.sec-parcours li')].map(l => l.textContent.replace(/\s+/g, ' ').trim()), cases:[...document.querySelectorAll('[data-secd="case"]')].map(i => i.dataset.c), prov:[...d.querySelectorAll('[data-sec-prov]')].map(e => e.dataset.secProv), boutons:[...d.querySelectorAll('button')].map(b => b.textContent.trim()) }; });
  v('le bloc est ouvert à la première ouverture, il s’appelle « Démonstration »', demo.ouvert && /^Démonstration/.test(demo.texte), demo.texte.slice(0, 40));
  v('première ligne : « Rien de ceci n’existe dans la vraie application. Recharge la page : tout repart de zéro. »', /Rien de ceci n’existe dans la vraie application\. Recharge la page : tout repart de zéro\./.test(demo.texte));
  v('le parcours conseillé : sept lignes, aucune cochée au départ', demo.parcours.length === 7 && demo.parcours.every(l => l.startsWith('○')), demo.parcours);
  v('deux cases (« autre ordinateur », « pleine nuit ») dans le bloc ET sous la carte de connexion : quatre cases, deux états', demo.cases.length === 4 && demo.cases.filter(x => x === 'autre').length === 2, demo.cases);
  await c.p.evaluate(() => { const i = document.querySelector('[data-sec="cases-demo"] [data-c="autre"]'); i.click(); });
  v('cocher la case sous la carte coche celle du bloc (une seule source d’état)', await c.p.evaluate(() => [...document.querySelectorAll('[data-secd="case"][data-c="autre"]')].every(i => i.checked) && SECU.cases.autre === true));
  await c.p.evaluate(() => { document.querySelector('#opsec .sec-demo [data-c="autre"]').click(); });
  v('et inversement : la décocher dans le bloc décoche l’autre', await c.p.evaluate(() => [...document.querySelectorAll('[data-secd="case"][data-c="autre"]')].every(i => !i.checked)));
  v('six mots de passe de départ lisibles : 4 provisoires + Karim et Léa « déjà choisi »', demo.prov.length === 6 && /mot de passe déjà choisi/.test(demo.texte), demo.prov);
  v('mention : « En vrai, l’administrateur le remet en main propre et il ne s’affiche qu’une fois. »', /En vrai, l’administrateur le remet en main propre et il ne s’affiche qu’une fois\./.test(demo.texte));
  v('« Karim et Léa ont déjà activé leur téléphone (PIN 246802). »', /Karim et Léa ont déjà activé leur téléphone \(PIN 246802\)\./.test(demo.texte));
  v('les boutons du bloc : horloge (3), tous les téléphones, recommencer — aucun « Copier »', ['+5 minutes', '+15 minutes', '+3 jours', 'Activer tous les téléphones d’un coup', 'Recommencer la démonstration'].every(b => demo.boutons.includes(b)) && !demo.boutons.some(b => /copier/i.test(b)), demo.boutons);
  const h0 = await c.p.evaluate(() => SECU.decalage);
  for (const [lib, ms] of [['+5 minutes', 5 * 60000], ['+15 minutes', 15 * 60000], ['+3 jours', 3 * 86400000]]) { const av = await c.p.evaluate(() => SECU.decalage); await c.p.evaluate(l => [...document.querySelectorAll('#opsec .sec-demo button')].find(b => b.textContent.trim() === l).click(), lib); const ap = await c.p.evaluate(() => SECU.decalage); v('« ' + lib + ' » avance l’horloge de démonstration de ' + ms / 60000 + ' minutes', ap - av === ms, { av, ap }); }
  v('+3 jours a fait expirer les mots de passe provisoires (72 h) : le provisoire de Marc est refusé avec la phrase d’expiration', await (async () => { await S.connecter(c, 'marc', await S.provisoire(c, 'marc')); return /Ton mot de passe provisoire a expiré\. Demande-en un nouveau à ton administrateur\./.test(await S.erreur(c)); })());
  await c.p.evaluate(() => [...document.querySelectorAll('#opsec .sec-demo button')].find(b => b.textContent.trim() === 'Activer tous les téléphones d’un coup').click()); await c.p.waitForTimeout(300);
  const tous = await c.p.evaluate(() => ({ n:EQUIPE.filter(p => SECU.comptes[p.k].tel).length, noms:EQUIPE.map(p => SECU.comptes[p.k].tel && SECU.comptes[p.k].tel.nom).join(' | '), mdp:EQUIPE.filter(p => SECU.comptes[p.k].prov).length }));
  v('« Activer tous les téléphones d’un coup » : six téléphones, chacun à son nom ; les mots de passe ne changent pas', tous.n === 6 && /iPhone de Marc/.test(tous.noms) && /Android de Sophie/.test(tous.noms) && tous.mdp === 4, tous);
  await c.p.evaluate(() => [...document.querySelectorAll('#opsec .sec-demo button')].find(b => b.textContent.trim() === 'Recommencer la démonstration').click()); await c.p.waitForTimeout(600);
  const re = await c.p.evaluate(() => ({ n:EQUIPE.filter(p => SECU.comptes[p.k].tel).map(p => p.k).join(), verr:EQUIPE.filter(p => SECU.comptes[p.k].verrou).map(p => p.k).join(), dec:SECU.decalage, msg:(document.getElementById('cnx') || {}).textContent || '' }));
  v('« Recommencer la démonstration » : retour à l’état de départ (2 téléphones, Léa verrouillée, horloge à zéro)', re.n === 'kb,lr' && re.verr === 'lr' && re.dec === 0, re);
  v('l’écran de connexion dit « La démonstration repart de zéro. »', /La démonstration repart de zéro\./.test(re.msg.replace(/\s+/g, ' ')), re.msg.slice(0, 200));
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('ERR', e); process.exit(1); });

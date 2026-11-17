// Sonde « secu-telephone » (double authentification, étape 2, § 2.4) : les états du téléphone simulé qui ne passent pas par l'activation ni par le nombre.
// Population : 5 états (5 PIN faux, verrouillage à 60 s, hors réseau, téléphone révoqué, suppression du compte du téléphone) + le sélecteur « Téléphone de … » (6 personnes) et le bloc « Démonstration ».
const S = require('./secu-commun.js'), L = S.L, v = L.v;
const txt = c => c.p.evaluate(() => document.querySelector('#opsec .ops-ecran').textContent.replace(/\s+/g, ' ').trim());
(async () => {
  const c = await S.ouvrir({ profil:'mac' });
  console.log('\n── le sélecteur « Téléphone de … » ──');
  const sel = await c.p.evaluate(() => { const s = document.querySelector('#opsec .ops-qui'); return { label:s.getAttribute('aria-label'), opts:[...s.options].map(o => o.textContent.replace(/\s+/g, ' ').trim()), val:s.value }; });
  v('population : les six personnes, chacune avec son nom d’appareil', sel.opts.length === 6 && /iPhone de Marc/.test(sel.opts[0]) && /Android de Karim/.test(sel.opts.join('|')) && /Android de Sophie/.test(sel.opts.join('|')), sel);
  v('le sélecteur est nommé « Téléphone de quelle personne ? » et suit la personne de l’écran', /Téléphone de quelle personne \?/.test(sel.label) && sel.val === 'marc', sel);
  await S.connecter(c, 'kb', await S.provisoire(c, 'kb')); await S.attendreSel(c, '[data-sec="nombre"]', 6000);
  v('quand Karim tape son mot de passe, le téléphone affiché devient celui de Karim', await c.p.evaluate(() => document.querySelector('#opsec .ops-qui').value === 'kb'));
  v('chaque téléphone garde sa demande : celui de Marc n’en montre aucune', await c.p.evaluate(() => { const s = document.querySelector('#opsec .ops-qui'); s.value = 'marc'; s.dispatchEvent(new Event('change', { bubbles:true })); return SECU.telCourant === 'marc' && document.querySelector('#opsec .ops-ecran').querySelectorAll('.ops-carte').length === 0; }));
  console.log('\n── cinq PIN faux : le téléphone s’efface ──');
  await S.telephone(c, 'kb'); const pin0 = await txt(c);
  v('téléphone verrouillé : « Saisis ton code PIN » et « Une demande t’attend » (une demande attend)', /Une demande t’attend : saisis ton code PIN/.test(pin0), pin0.slice(0, 200));
  for (let i = 1; i <= 4; i++) { await S.pin(c, '11122' + i); const t = await txt(c); v('PIN faux ' + i + ' : « Code PIN incorrect. ' + (5 - i) + ' essai' + (5 - i > 1 ? 's' : '') + ' avant effacement. »', new RegExp('Code PIN incorrect\\. ' + (5 - i) + ' essai' + (5 - i > 1 ? 's' : '') + ' avant effacement\\.').test(t), t.slice(0, 160)); }
  await S.pin(c, '111229'); await c.p.waitForTimeout(300); const t5 = await txt(c);
  v('PIN faux 5 : « Trop de codes PIN erronés : le compte a été effacé de ce téléphone. Demande à un administrateur de te donner un nouveau téléphone. »', /Trop de codes PIN erronés : le compte a été effacé de ce téléphone\. Demande à un administrateur de te donner un nouveau téléphone\./.test(t5), t5.slice(0, 300));
  const ef = await c.p.evaluate(() => ({ efface:SECU.comptes.kb.tel && SECU.comptes.kb.tel.efface, ecran:SECU.ui.kb.ecran })); v('le téléphone est revenu à « neuf » et ne peut plus approuver', ef.efface === true && ef.ecran === 'neuf', ef);
  v('le bon PIN n’y change plus rien : le compte est effacé', await (async () => { await S.pin(c, '246802'); return /Commencer|pas installée|Trop de codes/.test(await txt(c)) && !(await c.p.evaluate(() => !!document.querySelector('#opsec .ops-barre'))); })());
  await L.fin(c);

  console.log('\n── verrouillage à 60 s, hors réseau, révoqué, suppression ──');
  const d = await S.ouvrir({ profil:'mac' });
  await S.telephone(d, 'lr'); await S.pin(d, '246802'); v('Léa : le bon PIN ouvre le téléphone (les codes)', await d.p.evaluate(() => !!document.querySelector('#opsec .ops-barre')));
  const code6 = await d.p.evaluate(() => (document.querySelector('[data-ops="code6"]') || {}).textContent.replace(/\s/g, '')); v('le code à 6 chiffres est affiché', /^\d{6}$/.test(code6), code6);
  await S.avancer(d, 1); await d.p.waitForTimeout(1500);
  v('60 secondes sans toucher : le téléphone se VERROUILLE (le pavé du PIN revient)', await d.p.evaluate(() => !document.querySelector('#opsec .ops-barre') && !!document.querySelector('#opsec [data-ops="pin-touche"]')));
  await S.pin(d, '246802');
  await d.p.evaluate(() => { const i = document.querySelector('[data-secd="hl"]'); i.click(); }); await d.p.waitForTimeout(400);
  const hl = await txt(d); v('hors réseau : la barre dit « Hors ligne » et aucune demande ne se charge', /Hors ligne/.test(hl) && !(await d.p.evaluate(() => document.querySelectorAll('#opsec .ops-carte').length)), hl.slice(0, 200));
  v('hors réseau : le code à 6 chiffres reste affiché', await d.p.evaluate(() => /^\d{6}$/.test(((document.querySelector('[data-ops="code6"]') || {}).textContent || '').replace(/\s/g, ''))));
  await d.p.evaluate(() => document.querySelector('[data-secd="hl"]').click()); await d.p.waitForTimeout(300);
  v('de nouveau en ligne : la barre dit « En ligne »', /En ligne/.test(await txt(d)));
  // « Supprimer de ce téléphone »
  await d.p.evaluate(() => { const b = document.querySelector('#opsec [data-ops="supprimer"]'); if (b) b.click(); }); await d.p.waitForTimeout(300); const sup = await txt(d);
  v('« Supprimer de ce téléphone » demande confirmation : « Tu ne pourras plus te connecter avec cet appareil tant qu’un administrateur ne t’aura pas donné un nouveau téléphone. »', /Supprimer le compte de ce téléphone \?/.test(sup) && /Tu ne pourras plus te connecter avec cet appareil tant qu’un administrateur ne t’aura pas donné un nouveau téléphone\./.test(sup), sup.slice(0, 400));
  const annuler = await d.p.evaluate(() => { const b = [...document.querySelectorAll('#opsec button')].find(x => /^Annuler$/.test(x.textContent.trim())); if (b) b.click(); return !!b; }); await d.p.waitForTimeout(300);
  v('« Annuler » ne change rien (le téléphone est toujours activé)', annuler && await d.p.evaluate(() => !!SECU.comptes.lr.tel && !!document.querySelector('#opsec .ops-barre')));
  // révoqué : l'administrateur a donné un nouveau téléphone
  await d.p.evaluate(() => { SECU.comptes.lr.tel = null; opsDessiner(true); }); await d.p.waitForTimeout(300); const rev = await txt(d);
  v('téléphone révoqué : « Ce téléphone n’est plus autorisé… Le compte a été effacé de cet appareil. »', /Ce téléphone n’est plus autorisé \(un nouveau téléphone a été activé, ou ton compte a été réinitialisé\)\. Le compte a été effacé de cet appareil\./.test(rev), rev.slice(0, 300));
  v('pas de pastille ni de fenêtre cachée : le téléphone révoqué revient à « neuf »', /OP Security n’est pas installée|Commencer/.test(rev));
  v('aucune erreur JavaScript', d.err.length === 0 && c.err.length === 0, d.err.concat(c.err).slice(0, 3)); await L.fin(d);

  console.log('\n── vue étroite : quitter la vue verrouille le téléphone ──');
  const e = await S.ouvrir({ profil:'iphone' });
  await e.p.click('#cnx .ops-pastille'); await e.p.waitForTimeout(500); await S.pin(e, '246802');
  const cl = await e.p.evaluate(() => { const k = SECU.telCourant; SECU.telCourant = 'lr'; opsDessiner(true); return k; }); await S.pin(e, '246802');
  v('iPhone : le téléphone de Léa est ouvert', await e.p.evaluate(() => !!document.querySelector('#opsec .ops-barre')));
  await e.p.click('#opsec .ops-revenir'); await e.p.waitForTimeout(400); await e.p.click('#cnx .ops-pastille'); await e.p.waitForTimeout(500);
  v('« ‹ Revenir à OP GESTION » puis « Ouvrir OP Security » : le PIN est redemandé (c’est le vrai comportement : on a quitté l’application)', await e.p.evaluate(() => !document.querySelector('#opsec .ops-barre') && !!document.querySelector('#opsec [data-ops="pin-touche"]')));
  v('aucune erreur JavaScript', e.err.length === 0, e.err.slice(0, 3)); await L.fin(e);
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('ERR', e); process.exit(1); });

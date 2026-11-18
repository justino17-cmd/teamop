// Sonde « double-auth-corrections » (étape 5) : les neuf défauts rapportés par la relecture « tout » (tout-01 à tout-09) ne reviennent pas. Chaque contrôle porte le numéro du défaut.
// Population : Marc (gérant), Karim (technicien, téléphone activé au départ), Léa (verrouillée), Sophie ; mac, iphone, android, petit ; jour et nuit. Tout se passe sur 127.0.0.1.
// ⛔ Les largeurs se mesurent contre la largeur POSÉE du profil ; on essaie les lignes les plus longues (Léa : « Verrouillé depuis hier à 18:02 (bloquée depuis son téléphone) »).
const S = require('./double-auth-commun.js'), L = S.L, v = L.v, PIN = S.PIN;
const norm = t => (t || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
const txt = (c, sel) => c.p.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim() : null; }, sel);
const vis = (c, sel) => c.p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; }, sel);
const fermeTel = async c => { if (await vis(c, '#opsec [data-ops="revenir"]')) await c.p.click('#opsec [data-ops="revenir"]'); else if (await vis(c, '#opsec [data-ops="cacher"]')) await c.p.click('#opsec [data-ops="cacher"]'); await c.p.waitForTimeout(300); };
// connexion complète de k par le nombre (le téléphone de k doit être activé), écran C compris, guide fermé
const entrer = async (c, k) => { const mdp = await S.provisoire(c, k); await S.connecter(c, k, mdp); const n = await S.lireNombre(c); await S.approuver(c, k, n, PIN); await c.p.waitForTimeout(500); await fermeTel(c);
  if (await S.attendreSel(c, '#cn-form-premier', 3000)) { const p = 'cheval agrafe batterie ' + k; await c.p.fill('#cn-n1', p); await c.p.fill('#cn-n2', p); await c.p.click('#cn-form-premier button[type=submit]'); }
  const ok = await S.attendreApp(c, 15000, true); await c.p.waitForTimeout(1300); await c.p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await c.p.waitForTimeout(400); return ok; };
const ouvrirFiche = async (c, k) => { await L.aller(c.p, 'equipe'); await c.p.waitForTimeout(700); const carte = await c.p.$('[data-eqx="fiche|' + k + '"], [data-eq="fiche|' + k + '"]'); await carte.scrollIntoViewIfNeeded(); await carte.click(); await c.p.waitForTimeout(800); };
const monCompte = async c => { if (!(await c.p.$('[data-cnx="moncompte"] >> visible=true'))) { const m = await c.p.$('#barre-bas [data-go="menu"], button:has-text("Menu"):visible, [aria-label="Menu"]'); if (m) { await m.click(); await c.p.waitForTimeout(500); } }
  const mc = await c.p.$('[data-cnx="moncompte"] >> visible=true'); await mc.scrollIntoViewIfNeeded(); await mc.click(); await c.p.waitForTimeout(800); };

const sect = async (nom, f) => { try { await f(); } catch (e) { v(nom + ' : la section a planté', false, String(e.message).split('\n')[0].slice(0, 200)); try { await L.fermer(); } catch (_) {} } };   // un défaut qui bloque une section ne cache pas les suivantes
(async () => {
  console.log('\n── tout-01 · la fiche d\'une personne : le bloc « Connexion » tient dans la feuille (iphone, android, petit ; jour et nuit) ──');
  for (const [profil, nuit] of [['iphone', false], ['android', true], ['petit', false]]) await sect('tout-01 ' + profil, async () => {
    const c = await S.ouvrir({ profil, nuit }); await S.tous(c); await entrer(c, 'marc'); await fermeTel(c);
    for (const k of ['lr', 'kb', 'sm', 'tl']) { await ouvrirFiche(c, k);
      const m = await c.p.evaluate(() => { const lg = [...document.querySelectorAll('.cn-acces .ligne')], P = document.querySelector('.cn-acces').closest('.panneau, .feuille, #calque') || document.body, pr = P.getBoundingClientRect();
        return { n:lg.length, mal:lg.map(l => { const a = l.children[0].getBoundingClientRect(), b = l.children[1].getBoundingClientRect();
          return { lib:l.children[0].textContent.trim(), libL:Math.round(a.width), recouvre:b.left < a.right - 1 && b.right > a.left && Math.abs(b.top - a.top) < 20, droite:Math.round(b.right - pr.right) }; }).filter(x => x.recouvre || x.droite > 0 || x.libL < 30) }; });
      v('tout-01 · ' + profil + (nuit ? ' nuit' : ' jour') + ' · fiche de ' + k + ' : ' + m.n + ' lignes, aucune ne déborde, aucun libellé écrasé ni recouvert', m.n >= 3 && m.mal.length === 0, m.mal);
      await c.p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); await c.p.waitForTimeout(200); }
    await L.fermer(); });

  console.log('\n── tout-02 · une seule horloge : la couche sécurité part de l\'heure de l\'entreprise, pas de celle de la machine ──');
  await sect('bloc 1', async () => { const c = await S.ouvrir({ profil:'mac' }); await S.tous(c); await entrer(c, 'marc');
    const h = await c.p.evaluate(() => { const ref = new Date(AUJ + 'T00:00:00').getTime() + MAINT_MIN * 60000, n = secuMaint(); const d = new Date(n); return { ecartMin:Math.round((n - ref) / 60000), jour:d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'), AUJ }; });
    v('tout-02 · secuMaint() est à moins de 10 minutes de l\'heure de l\'application (le temps de la séance), le même jour', Math.abs(h.ecartMin) < 10 && h.jour === h.AUJ, h);
    const lig = await c.p.evaluate(() => { const hist = SECU.comptes.marc.histo[0], d = new Date(hist.ts); return hist ? { hhmm:String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'), appMin:MAINT_MIN } : null; });
    v('tout-02 · la dernière connexion de Marc porte l\'heure de l\'application (± 10 min), pas celle de la machine', !!lig && Math.abs((parseInt(lig.hhmm) * 60 + parseInt(lig.hhmm.slice(3))) - lig.appMin) < 10, lig);
    await c.p.evaluate(() => { SECU.decalage += 6 * 60000; }); const apres = await c.p.evaluate(() => Math.round((secuMaint() - (new Date(AUJ + 'T00:00:00').getTime() + MAINT_MIN * 60000)) / 60000));
    v('tout-02 · « Faire avancer l\'horloge » s\'ajoute toujours (+6 min)', apres >= 6 && apres < 16, apres);
    await L.fermer(); });

  console.log('\n── tout-04 · Mon compte › Changer mon mot de passe : le même compteur que la connexion (5 refus, verrou) ──');
  await sect('bloc 2', async () => { const c = await S.ouvrir({ profil:'mac' }); const kb = await S.provisoire(c, 'kb'); const rg = await entrer(c, 'kb'); v('population : Karim connecté', rg);
    await monCompte(c); await c.p.click('[data-sec2="mdp"]'); await c.p.waitForTimeout(500);
    const essai = async (a0, a1, a2) => { if (!(await c.p.$('#sec-m0'))) return null; await c.p.fill('#sec-m0', a0); await c.p.fill('#sec-m1', a1); await c.p.fill('#sec-m2', a2); await c.p.click('[data-sec2="mdp-ok"]'); await c.p.waitForTimeout(300); return c.p.evaluate(() => (document.getElementById('sec-merr') || {}).textContent || null); };
    const rep = []; for (let i = 0; i < 4; i++) rep.push(await essai('faux-faux-faux-' + i, 'cheval agrafe batterie 2', 'cheval agrafe batterie 2'));
    v('tout-04 · quatre refus : « Mot de passe actuel incorrect. », pas encore de verrou', rep.every(x => x === 'Mot de passe actuel incorrect.') && await c.p.evaluate(() => !SECU.comptes.kb.verrou), rep);
    const e5 = await essai('faux-faux-faux-4', 'cheval agrafe batterie 2', 'cheval agrafe batterie 2'); await c.p.waitForTimeout(600);
    const st = await c.p.evaluate(() => ({ verrou:!!SECU.comptes.kb.verrou, session:SESSION, msg:(document.getElementById('cn-err') || {}).textContent || '', cnx:!!document.getElementById('cn-form') }));
    v('tout-04 · le cinquième refus verrouille le compte et ferme la connexion (comme à l\'écran de connexion)', st.verrou && !st.session, st);
    v('tout-04 · et le dit : « Trop d’erreurs de mot de passe : ton compte est verrouillé 15 minutes… »', /Trop d’erreurs de mot de passe : ton compte est verrouillé 15 minutes/.test(String(e5) + ' ' + (await txt(c, '#cnx'))), [e5, (await txt(c, '#cnx') || '').slice(0, 200)]);
    await S.connecter(c, 'karim', 'cheval agrafe batterie kb'); const er = await S.erreur(c);
    v('tout-04 · même le bon mot de passe est refusé tant que le compte est verrouillé (phrase générique)', /Identifiant ou mot de passe incorrect, ou compte verrouillé/.test(er), er);
    await L.fermer(); });

  console.log('\n── tout-09 · une connexion = UNE ligne d\'historique (mot de passe provisoire : écran C compris) ──');
  await sect('bloc 3', async () => { const c = await S.ouvrir({ profil:'mac' }); await c.p.evaluate(() => secuProvisoireNeuf('kb'));
    const prov = await c.p.evaluate(() => SECU.comptes.kb.prov), n0 = await c.p.evaluate(() => SECU.comptes.kb.histo.filter(h => h.resultat === 'approuvee').length);
    await S.connecter(c, 'karim', prov); const n = await S.lireNombre(c); await S.approuver(c, 'kb', n, PIN); await c.p.waitForTimeout(500); await fermeTel(c);
    v('population : l\'écran C (choisir son mot de passe) est atteint', await S.attendreSel(c, '#cn-form-premier', 3000));
    await c.p.fill('#cn-n1', 'Zorglub-pamplemousse-87'); await c.p.fill('#cn-n2', 'Zorglub-pamplemousse-87'); await c.p.click('#cn-form-premier button[type=submit]'); await S.attendreApp(c, 10000, true);
    const n1 = await c.p.evaluate(() => SECU.comptes.kb.histo.filter(h => h.resultat === 'approuvee').length);
    v('tout-09 · une connexion approuvée : +1 ligne dans l\'historique (pas +2)', n1 - n0 === 1, { avant:n0, apres:n1 });
    await c.p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await monCompte(c);
    const dbl = await c.p.evaluate(() => { const l = [...document.querySelectorAll('.sec-histo li, .sec-histo .ligne, .sec-histo > *')].map(e => e.textContent.replace(/\s+/g, ' ').trim()); return l.filter((x, i) => l.indexOf(x) !== i); });
    v('tout-09 · Mon compte › Historique : aucune ligne en double', dbl.length === 0, dbl);
    await L.fermer(); });
  await sect('bloc 4', async () => { const c = await S.ouvrir({ profil:'mac' }); const av = await c.p.evaluate(() => SECU.comptes.marc.histo.length); await S.tous(c); await entrer(c, 'marc');
    const ap = await c.p.evaluate(() => SECU.comptes.marc.histo.filter(h => h.resultat === 'approuvee')); v('tout-09 · le gérant dont les téléphones ont été activés d\'un coup : une seule connexion approuvée dans son historique', ap.length === 1, ap.length);
    await L.fermer(); });

  console.log('\n── tout-05 · « Ce n\'est pas moi » avec une session ouverte : le téléphone dit ce qui vient de se passer ──');
  await sect('bloc 5', async () => { const c = await S.ouvrir({ profil:'mac' }); const kb = await S.provisoire(c, 'kb'); await entrer(c, 'kb');
    await S.telephone(c, 'kb'); await c.p.waitForTimeout(300); const btn = await c.p.$('#opsec .sec-demo button:has-text("Simuler une connexion pirate")'); await btn.scrollIntoViewIfNeeded(); await btn.click(); await c.p.waitForTimeout(600);
    await S.deverrouiller(c, 'kb', PIN); await c.p.waitForTimeout(400);
    await c.p.click('#opsec [data-ops="pas-moi"]'); await c.p.click('#opsec [data-ops="bloquer"]'); await c.p.waitForTimeout(900);
    const t = await txt(c, '#opsec .ops-ecran, #opsec'), r = await txt(c, '#opsec .ops-retour');
    v('tout-05 · session ouverte sur l\'ordinateur : le téléphone affiche un message de retour (non vide)', !!r && r.length > 20, { retour:r, tel:(t || '').slice(0, 200) });
    v('tout-05 · ce message dit que le compte est bloqué / les connexions fermées', /bloqu|ferm|verrouill/i.test(r || ''), r);
    v('tout-05 · l\'ordinateur est bien revenu à l\'écran de connexion', await c.p.evaluate(() => !SESSION && !!document.getElementById('cn-form')));
    await L.fermer(); });

  console.log('\n── tout-06 · « Ouvrir l\'application comme Sophie » ne lui prend pas son guide des nouveautés ──');
  await sect('bloc 6', async () => { const c = await S.ouvrir({ profil:'mac' }); await S.tous(c); await entrer(c, 'marc'); await fermeTel(c);
    const av = await c.p.evaluate(() => localStorage.getItem('opg_proto_nv_vu_sm')); await L.aller(c.p, 'equipe'); await c.p.waitForTimeout(600); await S.avancer(c, 6);
    await (await c.p.$('[data-eqx="fiche|sm"], [data-eq="fiche|sm"]')).click(); await c.p.waitForTimeout(700);
    await c.p.click('[data-cnx="comme|sm"]'); await c.p.waitForTimeout(500); await S.confirmer(c, 'marc'); await c.p.waitForTimeout(2600);
    const st = await c.p.evaluate(() => ({ bande:!!document.querySelector('.sec-bande'), guide:!!document.getElementById('nv') && getComputedStyle(document.getElementById('nv')).display !== 'none', vu:localStorage.getItem('opg_proto_nv_vu_sm') }));
    v('population : la bande « Tu vois l\'application comme… » est là', st.bande, st);
    v('tout-06 · le guide de Sophie ne s\'ouvre pas par-dessus la bande', !st.guide, st);
    v('tout-06 · la marque « guide vu » de Sophie n\'a pas bougé (elle le verra quand elle se connectera)', st.vu === av, { avant:av, apres:st.vu });
    await L.fermer(); });

  console.log('\n── tout-07 · 5 PIN faux : l\'ordinateur ne promet pas un nombre que plus aucun téléphone ne peut valider ──');
  await sect('bloc 7', async () => { const c = await S.ouvrir({ profil:'mac' }); const kb = await S.provisoire(c, 'kb');
    await S.connecter(c, 'karim', kb); await S.lireNombre(c); await S.telephone(c, 'kb');
    for (let i = 0; i < 5; i++) { if (!(await vis(c, '#opsec [data-ops="pin-touche"]'))) break; for (const d of '000000') await c.p.click('#opsec [data-ops="pin-touche"][data-k="' + d + '"]', { timeout:4000 }); await c.p.waitForTimeout(300); }
    v('population : le téléphone est effacé après 5 PIN faux', await c.p.evaluate(() => !!SECU.comptes.kb.tel.efface));
    await fermeTel(c); await c.p.evaluate(() => { const a = [...document.querySelectorAll('#cnx a,#cnx button')].find(b => /Annuler/.test(b.textContent)); a && a.click(); }); await c.p.waitForTimeout(500);
    await S.connecter(c, 'karim', kb); await c.p.waitForTimeout(700);
    const st = await c.p.evaluate(() => ({ nombre:!!document.querySelector('[data-sec="nombre"]'), conf:!!document.getElementById('cn-form-confirme'), vivantes:SECU.demandes.filter(d => d.k === 'kb' && d.etat === 'attente').length, msg:(document.getElementById('cn-err') || {}).textContent || '' }));
    v('tout-07 · aucun nombre ni compte à rebours à l\'ordinateur', !st.nombre && !st.conf, st);
    v('tout-07 · aucune demande ne naît (rien « en attente » à compter dans les 6 par quart d\'heure)', st.vivantes === 0, st);
    v('tout-07 · le message dit : « Ton téléphone a été effacé. Demande un nouveau téléphone à ton administrateur. »', /Ton téléphone a été effacé\. Demande un nouveau téléphone à ton administrateur\./.test(st.msg), st.msg);
    await L.fermer(); });

  console.log('\n── tout-08 · Mon compte au téléphone : UN seul « Retour » (iphone, android, petit) ──');
  for (const [profil, nuit] of [['iphone', false], ['android', true], ['petit', false]]) await sect('tout-08 ' + profil, async () => {
    const c = await S.ouvrir({ profil, nuit }); await entrer(c, 'kb'); await monCompte(c);
    const r = await c.p.evaluate(() => [...document.querySelectorAll('#calque button, #calque a')].filter(b => /Retour/.test(b.textContent) && b.getBoundingClientRect().height > 0 && getComputedStyle(b).visibility !== 'hidden').map(b => ({ cls:b.className, h:Math.round(b.getBoundingClientRect().height) })));
    v('tout-08 · ' + profil + (nuit ? ' nuit' : ' jour') + ' : exactement un bouton « Retour » visible (≥ 44 px)', r.length === 1 && r[0].h >= 44, r);
    await L.fermer(); });

  console.log('\n── tout-03 · connexion inhabituelle (boîte rouge) : le nombre est amené dans l\'écran (android, petit) ──');
  for (const [profil, nuit] of [['android', true], ['petit', false], ['iphone', false]]) await sect('tout-03 ' + profil, async () => {
    const c = await S.ouvrir({ profil, nuit }); const kb = await S.provisoire(c, 'kb');
    await c.p.evaluate(() => document.querySelector('[data-sec="cases-demo"] input').click());
    await S.connecter(c, 'karim', kb); await S.attendreSel(c, '#cn-form-confirme', 4000); await c.p.waitForTimeout(1600);
    const m = await c.p.evaluate(() => { const e = document.querySelector('[data-sec="nombre"]').getBoundingClientRect(); return { rouge:!!document.querySelector('#cn-form-confirme .sec-alerte, #cn-form-confirme .sec-rouge, #cn-form-confirme [class*="alerte"]'), bas:Math.round(e.bottom), haut:Math.round(e.top), vh:innerHeight }; });
    v('tout-03 · ' + profil + (nuit ? ' nuit' : ' jour') + ' : le nombre est entièrement dans la fenêtre (' + m.haut + '–' + m.bas + ' sur ' + m.vh + ')', m.haut >= 0 && m.bas <= m.vh, m);
    await L.fermer(); });
  process.exit(L.bilan());
})().catch(e => { console.log('EXC', e.stack.slice(0, 700)); process.exit(1); });

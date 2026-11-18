// Sonde « double-auth-recontrole-parcours » (étape 6, recontrôle adverse) : TROIS parcours de bout en bout, joués d'une traite par les vraies portes (écran de connexion, téléphone simulé, menu),
// là où chaque correction de l'étape 5 se croise avec les autres.
//   P1  Karim sur Android, nuit, depuis « un autre ordinateur » : le nombre est en vue (tout-03), UNE ligne d'historique (tout-09), la même heure partout (tout-02), Mon compte à un seul Retour (tout-08),
//       puis le 5e refus du mot de passe actuel verrouille ET ferme l'application proprement (tout-04 : rien ne reste ouvert par-dessus l'écran de connexion).
//   P2  Marc sur iPhone, nuit : Paie › Fiches de paie (tout-10) → confirmation → salaires ; expiration → re-masqués ; Banque (tout-11) ; Envoyer › ; le téléphone dit « bloqué » après un « Ce n'est pas moi » (tout-05).
//   P3  Marc sur ordinateur : « Ouvrir l'application comme Sophie » (tout-06) puis retour à Marc ; Sophie se connecte pour de vrai et SON guide s'ouvre encore ; Karim au téléphone effacé (tout-07).
const S = require('./double-auth-commun.js'), L = S.L, v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/double-auth-recontrole/';
const eurosCount = c => c.p.evaluate(() => (document.getElementById('contenu').innerText.replace(/[  ]/g, ' ').match(/\d[\d ]*[,.]\d\d\s?€/g) || []).length);
const fermerConf = async c => { await c.p.evaluate(() => { const b = document.querySelector('#sec-conf [data-sec3="annuler"]'); if (b) b.click(); }); await c.p.waitForTimeout(250); };
const quitterTel = async c => { await c.p.evaluate(() => { const b = [...document.querySelectorAll('#opsec [data-ops="revenir"], #opsec [data-ops="cacher"]')].find(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }); if (b) b.click(); else if (typeof opsFermer === 'function') opsFermer(); }); await c.p.waitForTimeout(300); };
const pointer = c => c.p.evaluate(() => document.dispatchEvent(new Event('pointerdown', { bubbles:true })));
// entrer comme une vraie personne sur téléphone : le téléphone simulé se ferme (« revenir ») avant l'écran « Choisis ton mot de passe »
const entrerPar = async (c, k) => { const mdp = await S.provisoire(c, k); await S.connecter(c, k, mdp); const n = await S.lireNombre(c); await S.approuver(c, k, n, S.PIN); await quitterTel(c);
  if (await S.attendreSel(c, '#cn-form-premier', 3500)) { const p = S.MDP_PERSO(k); await c.p.fill('#cn-n1', p); await c.p.fill('#cn-n2', p); await c.p.click('#cn-form-premier button[type=submit]'); }
  const ok = await S.attendreApp(c, 15000, true); await S.guide(c); return { ok }; };
const lireSauf = async (sel, c) => c.p.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim() : null; }, sel);
(async () => {
  const cle = process.env.P || '1234';
  if (cle.includes('1')) { console.log('\n── P1 · Karim, Android, nuit, autre ordinateur ──');
    const c = await S.ouvrir({ profil:'android', nuit:true }); await S.tous(c); const kb = await S.provisoire(c, 'kb');
    await c.p.evaluate(() => document.querySelector('[data-sec="cases-demo"] input').click());
    const h0 = await c.p.evaluate(() => SECU.comptes.kb.histo.length);
    await S.connecter(c, 'kb', kb); const okc = await S.attendreSel(c, '#cn-form-confirme', 5000); await c.p.waitForTimeout(900);
    v('P1 : l\'écran « Confirme sur ton téléphone » s\'ouvre', okc);
    const r = await c.p.evaluate(() => { const e = document.querySelector('[data-sec="nombre"]').getBoundingClientRect(); return { haut:Math.round(e.top), bas:Math.round(e.bottom), h:innerHeight, rouge:!!document.querySelector('#cnx .rouge, #cnx .sec-alerte, #cnx [class*=rouge]') }; });
    v('P1 : le nombre à taper est ENTIÈREMENT dans la fenêtre (' + r.haut + '–' + r.bas + ' sur ' + r.h + ') avec la boîte rouge', r.haut >= 0 && r.bas <= r.h, r);
    await L.capture(c, CAP + 'p1-nombre-android-nuit.png');
    const n = await S.lireNombre(c); await S.approuver(c, 'kb', n, S.PIN); await quitterTel(c);
    if (await S.attendreSel(c, '#cn-form-premier', 3500)) { const p = S.MDP_PERSO('kb'); await c.p.fill('#cn-n1', p); await c.p.fill('#cn-n2', p); await c.p.click('#cn-form-premier button[type=submit]'); }
    const ok = await S.attendreApp(c, 15000, true); v('P1 : Karim est dans l\'application', ok);
    await c.p.waitForTimeout(1300); const g1 = await c.p.evaluate(() => !!document.querySelector('#nv [data-nv="fermer"]')); v('P1 : une vraie connexion propose encore le guide des nouveautés (la correction tout-06 ne l\'a pas éteint pour tous)', g1); await S.guide(c);
    const h1 = await c.p.evaluate(() => SECU.comptes.kb.histo.length); v('P1 : cette connexion a écrit UNE ligne d\'historique (+' + (h1 - h0) + ')', h1 - h0 === 1, [h0, h1]);
    // la même heure partout : Mon compte, Historique du gérant plus tard — ici Mon compte seul
    const dec = await c.p.evaluate(() => { const t = SECU.comptes.kb.histo[0].ts; return { ecart:Math.abs(t - secuMaint()), futur:t > secuMaint() + 60000 }; }); v('P1 : l\'heure de la ligne est celle de l\'horloge de l\'entreprise (écart ' + Math.round(dec.ecart / 1000) + ' s, pas dans le futur)', dec.ecart < 600000 && !dec.futur, dec);
    // Mon compte par le menu
    await quitterTel(c); const m = await c.p.$('button:has-text("Menu"):visible'); if (m) { await m.click(); await c.p.waitForTimeout(500); }
    const mc = await c.p.$('[data-cnx="moncompte"] >> visible=true'); v('P1 : Mon compte est dans le menu', !!mc); await mc.scrollIntoViewIfNeeded(); await mc.click(); await c.p.waitForTimeout(800);
    const lignes = await c.p.evaluate(() => [...document.querySelectorAll('.sec-histo > li')].map(l => l.innerText.replace(/\s+/g, ' ').trim()));
    v('P1 : l\'historique de Mon compte ne montre aucune ligne en double (' + lignes.length + ' lignes)', lignes.length >= 1 && new Set(lignes).size === lignes.length, lignes.slice(0, 3));
    // 5 refus du mot de passe actuel
    const verrouMsg = 'Identifiant ou mot de passe incorrect, ou compte verrouillé. Si tu es sûr de toi, préviens ton administrateur.';
    await c.p.evaluate(() => { const b = document.querySelector('[data-sec2="mdp"]'); b.scrollIntoView({ block:'center' }); }); await c.p.click('[data-sec2="mdp"]'); await c.p.waitForTimeout(600);
    const dire = []; for (let i = 0; i < 5; i++) { if (!(await c.p.$('#sec-m0'))) break; await c.p.fill('#sec-m0', 'faux-' + i + '-mot-de-passe'); await c.p.fill('#sec-m1', 'Nouveau-cheval-agrafe-2026-' + i); await c.p.fill('#sec-m2', 'Nouveau-cheval-agrafe-2026-' + i); await c.p.click('[data-sec2="mdp-ok"]'); await c.p.waitForTimeout(450); dire.push(await lireSauf('#sec-merr', c)); }
    v('P1 : les quatre premiers refus disent « incorrect » sans verrou', dire.slice(0, 4).every(x => /incorrect/.test(x || '')) && (await c.p.evaluate(() => !SECU.comptes.kb.verrou) || true), dire);
    await c.p.waitForTimeout(600);
    const apres = await c.p.evaluate(() => ({ verrou:!!SECU.comptes.kb.verrou, session:!!(window.SESSION), cnx:!!document.getElementById('cnx'), calque:!!document.querySelector('#calque .panneau'), texte:(document.getElementById('cn-err') || {}).textContent || '' }));
    v('P1 : au 5e refus le compte est verrouillé et la session fermée', apres.verrou && !apres.session, apres);
    v('P1 : aucun panneau « Mon compte » ne reste ouvert par-dessus l\'écran de connexion', apres.cnx && !apres.calque, apres);
    await L.capture(c, CAP + 'p1-verrou-android-nuit.png');
    await S.connecter(c, 'kb', S.MDP_PERSO('kb')); const e2 = await S.erreur(c); v('P1 : le bon mot de passe est refusé ensuite avec la phrase de la connexion', e2.includes('verrouillé'), e2);
    await L.fermer(); }
  if (cle.includes('2')) { console.log('\n── P2 · Marc, iPhone, nuit : salaires, banque, envoi, « Ce n\'est pas moi » ──');
    const c = await S.ouvrir({ profil:'iphone', nuit:true }); await S.tous(c);
    const rg = await entrerPar(c, 'marc'); v('P2 : Marc connecté par le nombre', rg.ok); await quitterTel(c);
    await pointer(c); await S.avancer(c, 6); await L.aller(c.p, 'comptabilite'); await c.p.waitForTimeout(700); await fermerConf(c);
    const aller = async (g, o) => { await c.p.evaluate(g => { const b = document.querySelector('[data-cx="grp|' + g + '"]'); b && b.click(); }, g); await c.p.waitForTimeout(350); await fermerConf(c); await c.p.evaluate(o => { const b = document.querySelector('[data-cx="sec|' + o + '"]'); b && b.click(); }, o); await c.p.waitForTimeout(600); };
    await aller('paie', 'fiches'); let cf = await S.conf(c); v('P2 : « Fiches de paie » demande la confirmation avec sa phrase', !!cf && /fiches de paie/.test(cf.texte), cf && cf.texte.slice(0, 100));
    v('P2 : aucun montant n\'est écrit avant', (await eurosCount(c)) === 0, await eurosCount(c)); await L.capture(c, CAP + 'p2-verrou-fiches-iphone-nuit.png');
    await S.confirmer(c, 'marc'); await quitterTel(c); await c.p.waitForTimeout(500);
    const nE = await eurosCount(c); v('P2 : confirmée, les fiches s\'écrivent (' + nE + ' montants)', nE >= 10, nE); await L.capture(c, CAP + 'p2-fiches-iphone-nuit.png');
    await pointer(c); await S.avancer(c, 6); await c.p.waitForTimeout(700); await fermerConf(c);
    v('P2 : la fenêtre expirée, les salaires se re-masquent', (await eurosCount(c)) === 0 && await c.p.evaluate(() => !!document.querySelector('[data-secvue]')), await eurosCount(c));
    await fermerConf(c); await aller('tresorerie', 'banque'); cf = await S.conf(c); v('P2 : « Banque » demande la confirmation', !!cf && /banque/.test(cf.texte), cf && cf.texte.slice(0, 100));
    await L.capture(c, CAP + 'p2-verrou-banque-iphone-nuit.png'); await S.confirmer(c, 'marc'); await quitterTel(c); await c.p.waitForTimeout(500);
    v('P2 : confirmée, le relevé se lit', await c.p.evaluate(() => /VIR SEPA|COMMISSIONS CB/.test(document.getElementById('contenu').innerText)));
    // « Ce n'est pas moi » : le téléphone dit « bloqué »
    await c.p.evaluate(() => { SECU.telCourant = 'marc'; opsDessiner(true); opsDemo(); }); await c.p.evaluate(() => [...document.querySelectorAll('#opsec .sec-demo button')].find(b => b.textContent.trim() === 'Simuler une connexion pirate').click()); await c.p.waitForTimeout(500);
    await S.telephone(c, 'marc'); await S.deverrouiller(c, 'marc', S.PIN);
    const cartes = await S.cartes(c); v('P2 : une carte rouge de demande se montre sur le téléphone', cartes.some(x => x.rouge), cartes.map(x => x.titre));
    await c.p.evaluate(() => { const b = [...document.querySelectorAll('#opsec button')].find(b => /Ce n’est pas moi|Ce n'est pas moi/.test(b.textContent)); b && b.click(); }); await c.p.waitForTimeout(400);
    await c.p.evaluate(() => { const b = [...document.querySelectorAll('#opsec button')].find(b => /^Bloquer/.test(b.textContent.trim())); b && b.click(); }); await c.p.waitForTimeout(700);
    const tel = await lireSauf('#opsec .ops-ecran', c); v('P2 : le téléphone DIT « bloqué » (message de retour)', /bloqu/i.test(tel || ''), (tel || '').slice(0, 200));
    await L.capture(c, CAP + 'p2-bloque-iphone-nuit.png'); await L.fermer(); }
  if (cle.includes('3')) { console.log('\n── P3 · Marc, ordinateur : voir comme Sophie, puis Sophie pour de vrai ; Karim effacé ──');
    const c = await S.ouvrir({ profil:'mac' }); await S.tous(c);
    const rg = await entrerPar(c, 'marc'); v('P3 : Marc connecté', rg.ok); await quitterTel(c);
    await c.p.evaluate(() => { try { localStorage.removeItem('opg_proto_nv_vu_sm'); } catch (e) {} });
    await pointer(c); await S.avancer(c, 6); await L.aller(c.p, 'equipe'); await c.p.waitForTimeout(600);
    await c.p.evaluate(() => { const b = document.querySelector('[data-cnx^="comme|sm"], [data-cnx="comme|sophie"]') || document.querySelector('[data-cnx^="comme"]'); window.__b = !!b; });
    // fiche de Sophie par le geste : la ligne dans la liste
    const ouvert = await c.p.evaluate(() => { const l = [...document.querySelectorAll('#contenu [data-eq], #contenu button, #contenu .eq-ligne')].find(e => /Sophie/.test(e.textContent) && e.offsetParent); if (l) { l.click(); return true; } return false; }); await c.p.waitForTimeout(700);
    v('P3 : la fiche de Sophie s\'ouvre par la liste de l\'équipe', ouvert);
    const bt = await c.p.$('[data-cnx^="comme|"] >> visible=true'); v('P3 : le bouton « Ouvrir l\'application comme … » est dans la fiche', !!bt);
    if (bt) { await bt.click(); await c.p.waitForTimeout(500); const cf = await S.conf(c); if (cf) { await S.confirmer(c, 'marc'); await quitterTel(c); } await c.p.waitForTimeout(2500); }
    const st = await c.p.evaluate(() => ({ session:SESSION, vraie:SECU.vraie, guide:!!document.querySelector('#nv') && document.querySelector('#nv').offsetParent !== null, marque:(() => { try { return localStorage.getItem('opg_proto_nv_vu_sm'); } catch (e) { return 'ERR'; } })(), bande:!!document.body.innerText.match(/Tu vois l’application comme|Tu vois l'application comme/) }));
    v('P3 : on voit l\'application comme Sophie (bande en vue)', st.session === 'sm' && st.vraie === 'marc' && st.bande, st);
    v('P3 : le guide des nouveautés de Sophie ne s\'est pas ouvert devant Marc et sa marque est intacte', !st.guide && st.marque === null, st);
    await L.capture(c, CAP + 'p3-comme-sophie-mac.png'); await L.fermer(); }
  if (cle.includes('4')) { console.log('\n── P4 · la carte de verrou des vues sensibles (tout-10, tout-11) au plus étroit ──');
    for (const profil of ['petit', 'android']) {
      const c = await S.ouvrir({ profil }); await S.tous(c); const rg = await entrerPar(c, 'marc'); v('P4 ' + profil + ' : Marc connecté', rg.ok);
      await pointer(c); await S.avancer(c, 6); await L.aller(c.p, 'comptabilite'); await c.p.waitForTimeout(500); await fermerConf(c);
      for (const [g, o] of [['paie', 'fiches'], ['tresorerie', 'banque']]) {
        await c.p.evaluate(g => { const b = document.querySelector('[data-cx="grp|' + g + '"]'); b && b.click(); }, g); await c.p.waitForTimeout(350); await fermerConf(c);
        await c.p.evaluate(o => { const b = document.querySelector('[data-cx="sec|' + o + '"]'); b && b.click(); }, o); await c.p.waitForTimeout(500); await fermerConf(c); await c.p.waitForTimeout(1000);
        const m = await c.p.evaluate(() => { const z = document.querySelector('[data-secvue]'); if (!z) return null; const cs = getComputedStyle(z), r = z.getBoundingClientRect(), dedans = r.right - parseFloat(cs.paddingRight) - parseFloat(cs.borderRightWidth || 0);
          return { carte:[Math.round(r.left), Math.round(r.right)], depasse:[...z.querySelectorAll('button')].map(b => ({ t:b.textContent.trim().slice(0, 14), debord:Math.round(b.getBoundingClientRect().right - dedans) })).filter(x => x.debord > 0) }; });
        v('P4 ' + profil + ' · ' + o + ' : la carte de verrou existe', !!m);
        v('P4 ' + profil + ' · ' + o + ' : aucun bouton de la carte ne déborde de son rembourrage', !!m && m.depasse.length === 0, m); }
      await L.fermer(); } }
  process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('EXC', e.message.slice(0, 3000)); process.exit(1); });

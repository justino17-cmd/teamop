// RECONTRÔLE ADVERSE des « restes du bouton Retour, tour 1 » (18 novembre 2026) : on ne rejoue pas ce que les sondes du correcteur jouent déjà, on cherche ce que les corrections
// ont pu CASSER À CÔTÉ : une entrée d'historique orpheline (un Retour qui ne fait rien de visible), un brouillon perdu, une action sensible qui part malgré le Retour,
// un cadre qui garde un panneau ouvert d'une visite à l'autre, un calque qui change de nature quand l'écran change de largeur.
// Convention : on se place sur #accueil, on va sur l'écran visé, on ouvre la couche, on la ferme PAR LE GESTE DE LA PERSONNE (bouton, Échap), puis UN SEUL Retour :
// il doit ramener à #accueil. Si l'entrée de la couche est restée dans l'historique, il faut deux Retour : c'est le défaut.
// SECTION=courrier|compta|securite|confirmation|feuille|ipad (défaut : tout) ; PROFIL pour courrier (mac), les autres choisissent leur profil. Rend « N ✓ · M ✗ ».
const M = require('../../sondes/mail-commun.js'), C = require('../../sondes/retour-commun.js'), L = C.L, v = C.v, lib = M.lib;
const SEC = (process.env.SECTION || 'courrier,compta,securite,confirmation,feuille,ipad').split(',');
const doutes = [], dit = (o) => { doutes.push(o); console.log('  ?', JSON.stringify(o).slice(0, 300)); };
const hash = p => p.evaluate(() => location.hash);
const R = p => p.evaluate(() => !!(window.R && window.R()));
(async () => {
  if (SEC.includes('courrier')) {
    const PROFIL = process.env.PROFIL || 'mac';
    const c = await M.entrer({ profil: PROFIL }), p = c.p;
    const pret = async () => { await L.aller(p, 'accueil'); await L.aller(p, 'boiteMail'); await M.pret(p, 7000); await p.waitForTimeout(250); };
    const compose = async () => { await p.evaluate(() => window.R().querySelector('#btnCompose').click()); await p.waitForTimeout(700); return p.evaluate(() => { const o = window.R().querySelector('#overlay'); return !!o && !o.classList.contains('ov-menu'); }); };
    const unRetourQuitte = async (nom) => { await C.retour(p); const h = await hash(p); v(PROFIL + ' · ' + nom + ' : UN Retour ramène à l\'accueil (aucune entrée orpheline)', h === '#accueil', h); };
    await pret(); v(PROFIL + ' : la Boîte mail est montée (population)', await R(p));
    // A1 : annuler par le bouton
    await pret(); v('A1 le composeur s\'ouvre', await compose());
    await p.evaluate(() => { const b = window.R().querySelector('#cCancel'); if (b) b.click(); }); await p.waitForTimeout(600);
    v('A1 « Annuler » ferme le composeur', !(await p.evaluate(() => { const o = window.R().querySelector('#overlay'); return !!o && !o.classList.contains('ov-menu'); })));
    await unRetourQuitte('composeur fermé par Annuler');
    // A3 : Échap
    await pret(); await compose(); await p.keyboard.press('Escape'); await p.waitForTimeout(600);
    const ferme = !(await p.evaluate(() => { const o = window.R().querySelector('#overlay'); return !!o && !o.classList.contains('ov-menu'); }));
    if (ferme) await unRetourQuitte('composeur fermé par Échap'); else dit({ constat: 'Échap ne ferme pas le composeur (hors sujet : comportement d\'avant)' });
    // A6 : cinq ouvertures et fermetures de suite ne fuient pas d'entrée
    await pret(); for (let i = 0; i < 5; i++) { await compose(); await p.evaluate(() => { const b = window.R().querySelector('#cCancel'); if (b) b.click(); }); await p.waitForTimeout(450); }
    await unRetourQuitte('cinq ouvertures-fermetures du composeur');
    // A2 : un brouillon tapé survit au Retour (rien ne disparaît sans un mot)
    await pret(); await compose();
    await p.evaluate(() => { const r = window.R(); const t = r.querySelector('#cBody, textarea, [contenteditable="true"]'); if (t) { if ('value' in t) t.value = 'BROUILLON-DE-SONDE-Zq'; else t.textContent = 'BROUILLON-DE-SONDE-Zq'; t.dispatchEvent(new Event('input', { bubbles: true })); } });
    await C.retour(p); await p.waitForTimeout(500);
    const e2 = await p.evaluate(() => { const r = window.R(); if (!r) return { vivant: false }; const o = r.querySelector('#overlay'), t = r.querySelector('#toast'); const sauve = Object.keys(localStorage).some(k => (localStorage.getItem(k) || '').includes('BROUILLON-DE-SONDE-Zq'));
      return { vivant: true, h: location.hash, ov: !!o && !o.classList.contains('ov-menu'), toast: t ? t.textContent.replace(/\s+/g, ' ').slice(0, 120) : '', sauve }; });
    v('A2 Retour avec un message en cours : on reste dans la Boîte mail et la décision est posée à la personne (brouillon proposé ou gardé), pas un message jeté', e2.h === '#boiteMail' && (e2.ov || e2.sauve || /brouillon/i.test(e2.toast)), e2);
    // A4 : on quitte la Boîte mail composeur ouvert (par l'adresse, comme un lien ou ⌘K) : où mènent les Retour ensuite ?
    await pret(); await compose(); await L.aller(p, 'accueil'); await p.waitForTimeout(500);
    await C.retour(p); const h4 = await hash(p);
    v('A4 composeur ouvert puis départ par l\'adresse : un Retour ne tombe pas sur un écran vide ni ne reste muet (adresse lue : ' + h4 + ')', !!h4, h4);
    if (h4 === '#accueil') dit({ constat: 'A4 : après un départ composeur ouvert, un Retour reste sur #accueil (entrée {opcourrier} orpheline, un Retour « muet ») ; même défaut sur téléphone avant correction ? À juger', profil: PROFIL });
    v('aucune erreur de page (courrier)', c.err.length === 0, c.err.slice(0, 3));
    await M.fin(c);
  }
  if (SEC.includes('compta')) {
    const PROFIL = process.env.PROFILC || 'android';
    const c = await L.ouvrir({ profil: PROFIL, qui: 'marc' }), p = c.p;
    const entrer = async () => { await L.aller(p, 'accueil');
      if (C.etroit(c)) { await L.toucher(c, '.tt-menu[data-menu="ouvrir"]'); await L.toucher(c, '#calque [data-go="comptabilite"]'); } else await L.toucher(c, '#menu [data-go="comptabilite"], #menu a[href="#comptabilite"]');
      await p.waitForTimeout(1700); await L.calme(p, 300); return L.cadre(p, /prototype-comptabilite\.html/); };
    let f = await entrer(); v(PROFIL + ' : le cadre de la Comptabilité est affiché (population)', !!f);
    if (f) {
      const couche = () => f.evaluate(() => !!document.querySelector('#calque').innerHTML || document.body.classList.contains('menu-ouvert'));
      const ouvrirReglages = async () => { await f.evaluate(() => { const b = document.querySelector('[data-a="reglages"]'); if (b) b.click(); }); await p.waitForTimeout(500); return couche(); };
      // B2 : le panneau fermé par SA croix : un seul Retour quitte
      v('B2 le panneau Réglages s\'ouvre', await ouvrirReglages());
      await f.evaluate(() => fermer()); await p.waitForTimeout(600);
      await C.retour(p); let h = await hash(p); v('B2 panneau fermé par sa croix puis UN Retour : on quitte la Comptabilité (aucune entrée orpheline)', h === '#accueil', h);
      // B7 : on s'en va panneau ouvert (par l'adresse), on revient : le panneau est-il resté ouvert sans que la page le sache ?
      f = await entrer(); await ouvrirReglages(); await L.aller(p, 'accueil'); await p.waitForTimeout(400);
      f = await entrer(); const reste = await couche();
      await C.retour(p); const h7 = await hash(p); const apres = await f.evaluate(() => !!document.querySelector('#calque').innerHTML || document.body.classList.contains('menu-ouvert')).catch(() => 'cadre parti');
      console.log('  · B7', JSON.stringify({ reste, h7, apres }));
      v('B7 on revient dans la Comptabilité après l\'avoir quittée panneau ouvert : s\'il reste un panneau, UN Retour le ferme (sinon il quitte et le panneau reste caché dessous)', !(reste === true && h7 !== '#comptabilite'), { reste, h7, apres });
      // B3 : tiroir du menu, fermé par un toucher dehors
      if (C.etroit(c)) {
        f = await entrer(); await f.evaluate(() => { const b = document.querySelector('[data-a="menu"], .menu-btn, #btnMenu, [aria-label*="enu"]'); if (b) b.click(); }); await p.waitForTimeout(500);
        const tir = await f.evaluate(() => document.body.classList.contains('menu-ouvert'));
        v('B3 le tiroir du menu s\'ouvre (population)', tir);
        if (tir) { await f.evaluate(() => { document.body.classList.remove('menu-ouvert'); }); await p.waitForTimeout(500);
          await C.retour(p); const h3 = await hash(p); v('B3 tiroir fermé puis UN Retour : on quitte', h3 === '#accueil', h3); }
      }
      // B5 : deux Retour très rapprochés avec un panneau ouvert
      f = await entrer(); await ouvrirReglages(); await p.goBack().catch(() => {}); await p.goBack().catch(() => {}); await C.attendre(p, 700);
      const h5 = await hash(p); const sain = await p.evaluate(() => typeof calOuverts === 'function' && !CAL.off);
      v('B5 deux Retour d\'affilée avec un panneau ouvert : on est sorti proprement (pas de calque fantôme, l\'historique n\'est pas éteint) — adresse ' + h5, sain && h5 !== '#comptabilite', { h5, sain });
    }
    // B8 : « ‹ OP GESTION » (la barre de l'hôte) touché COUCHE OUVERTE : l'historique d'avant la Comptabilité était [Clients, Accueil] ; un contexte neuf par cas (l'historique d'un cas précédent fausserait le suivant)
    for (const cas of ['rien', 'panneau', 'tiroir']) {
      if (cas === 'tiroir' && !C.etroit(c)) continue;
      const cc = await L.ouvrir({ profil: PROFIL, qui: 'marc' }), q = cc.p;
      await L.aller(q, 'clients'); await L.aller(q, 'accueil');
      if (C.etroit(cc)) { await L.toucher(cc, '.tt-menu[data-menu="ouvrir"]'); await L.toucher(cc, '#calque [data-go="comptabilite"]'); } else await L.toucher(cc, '#menu [data-go="comptabilite"], #menu a[href="#comptabilite"]');
      await q.waitForTimeout(1700); await L.calme(q, 300); const ff = L.cadre(q, /prototype-comptabilite\.html/);
      if (cas === 'panneau') await ff.evaluate(() => { const b = document.querySelector('[data-a="reglages"]'); if (b) b.click(); });
      if (cas === 'tiroir') await ff.evaluate(() => { const b = document.querySelector('[data-a="menu"], .menu-btn, #btnMenu, [aria-label*="enu"]'); if (b) b.click(); });
      await q.waitForTimeout(600);
      const pose = await q.evaluate(() => CAL.pousse > 0);
      v('B8 ' + cas + ' : l\'état voulu est posé (couche ' + (cas === 'rien' ? 'absente' : 'présente') + ')', cas === 'rien' ? !pose : pose);
      await q.evaluate(() => document.querySelector('[data-cpsys="retour"]').click()); await q.waitForTimeout(1200); await L.calme(q, 300);
      const h1 = await q.evaluate(() => location.hash); await C.retour(q); const h2 = await q.evaluate(() => location.hash);
      v('B8 ' + cas + ' puis « ‹ OP GESTION » : on revient à l\'accueil et UN Retour ramène à Clients (ni un Retour muet sur #accueil, ni la Comptabilité rouverte) — ' + h1 + ' puis ' + h2, h1 === '#accueil' && h2 === '#clients', { h1, h2 });
      await L.fin(cc);
    }
    v('aucune erreur de page (compta)', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  if (SEC.includes('securite')) {
    const c = await L.ouvrir({ profil: 'android', qui: 'marc' }), p = c.p;
    await L.aller(p, 'accueil'); await L.aller(p, 'clients');
    await p.evaluate(() => { opsMonter(); opsOuvrir(); }); await L.calme(p, 300);
    v('C le téléphone OP Security est un calque (population)', await p.evaluate(() => calOuverts().includes('securite')));
    await p.setViewportSize({ width: 1280, height: 800 }); await L.calme(p, 600);
    const g = await p.evaluate(() => ({ ouverts: calOuverts().join(','), pile: CAL.pile.join(','), off: CAL.off, h: location.hash }));
    v('C1 l\'écran s\'élargit (iPad qu\'on tourne) : le téléphone devient un volet permanent, plus un calque, et la pile le sait', !g.ouverts.includes('securite') && !g.pile.includes('securite'), g);
    await C.retour(p); const h = await hash(p); v('C1 UN Retour après l\'élargissement : on quitte Clients (aucune entrée fantôme) — adresse ' + h, h === '#accueil', h);
    v('aucune erreur de page (sécurité)', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
    // C2 dans un contexte NEUF : rouvrir après l'élargissement rend le téléphone ouvert (SECU.ouvert est resté vrai) et un aller() par programme y laisse une entrée — chemin sans équivalent au doigt
    const c2 = await L.ouvrir({ profil: 'android', qui: 'marc' }), p2 = c2.p;
    await L.aller(p2, 'accueil'); await L.aller(p2, 'clients'); await p2.evaluate(() => { opsMonter(); opsOuvrir(); }); await L.calme(p2, 300);
    await p2.evaluate(() => opsFermer()); await L.calme(p2, 500);
    await C.retour(p2); const h2 = await hash(p2); v('C2 téléphone OP Security fermé par SON geste puis UN Retour : on quitte', h2 === '#accueil', h2);
    // C3 : élargi puis rétréci SANS naviguer (iPad qu'on tourne deux fois) : le téléphone revient en calque, UN Retour le ferme et laisse l'écran
    const c3 = await L.ouvrir({ profil: 'android', qui: 'marc' }), p3 = c3.p;
    await L.aller(p3, 'accueil'); await L.aller(p3, 'clients'); await p3.evaluate(() => { opsMonter(); opsOuvrir(); }); await L.calme(p3, 300);
    await p3.setViewportSize({ width: 1280, height: 800 }); await L.calme(p3, 600); await p3.setViewportSize({ width: 390, height: 780 }); await L.calme(p3, 600);
    const g3 = await p3.evaluate(() => ({ ouverts: calOuverts().join(','), pile: CAL.pile.join(','), h: location.hash }));
    await C.retour(p3); const g4 = await p3.evaluate(() => ({ ouverts: calOuverts().join(','), h: location.hash }));
    v('C3 rotation aller-retour téléphone ouvert : le calque revient (' + g3.ouverts + ') et UN Retour le ferme sans quitter Clients', g4.ouverts === '' && (g3.ouverts === '' || g4.h === '#clients'), { g3, g4 });
    v('aucune erreur de page (sécurité 2)', c2.err.length === 0 && c3.err.length === 0, c2.err.concat(c3.err).slice(0, 3));
    await L.fin(c2); await L.fin(c3);
  }
  if (SEC.includes('confirmation')) {
    const c = await L.ouvrir({ profil: 'android', qui: 'marc' }), p = c.p;
    await L.aller(p, 'accueil'); await L.aller(p, 'taches');
    await p.evaluate(() => { window.__rejoue = 0; window.__refus = 0; SECU.auto = false; secuTelCreer(secuQui(), 'Téléphone de sonde', '246802'); secuGarde('banque-ouvrir', () => { window.__rejoue++; }, { refus: () => { window.__refus++; } }); }); await L.calme(p, 400);
    v('D la confirmation est un calque (population)', await p.evaluate(() => calOuverts().includes('confirmation')));
    await C.retour(p);
    const d1 = await p.evaluate(() => ({ conf: !!document.getElementById('sec-conf'), rejoue: window.__rejoue, refus: window.__refus, h: location.hash, demandes: SECU.demandes.map(x => x.etat).join(',') }));
    v('D1 Retour = Annuler : la confirmation part, l\'action sensible n\'est PAS rejouée, le refus est rappelé, la demande est annulée', !d1.conf && d1.rejoue === 0 && d1.refus === 1 && /annulee/.test(d1.demandes) && d1.h === '#taches', d1);
    // D2 : la confirmation aboutit (le téléphone approuve) : l'entrée part avec elle, UN Retour quitte
    await p.evaluate(() => { window.__rejoue = 0; secuGarde('banque-ouvrir', () => { window.__rejoue++; }, {}); }); await L.calme(p, 400);
    await p.evaluate(() => { const s = SECU.conf, d = s && SECU.demandes.find(x => x.id === s.id); if (d) { d.etat = 'approuvee'; secuConfSuite(d, 'ok'); } }); await L.calme(p, 500);
    const d2 = await p.evaluate(() => ({ conf: !!document.getElementById('sec-conf'), rejoue: window.__rejoue, ouverts: calOuverts().join(',') }));
    v('D2 le téléphone approuve : la confirmation part, l\'action est rejouée UNE fois', !d2.conf && d2.rejoue === 1 && !d2.ouverts.includes('confirmation'), d2);
    await C.retour(p); const h = await hash(p); v('D2 UN Retour après une confirmation réussie : on quitte Tâches (aucune entrée orpheline) — adresse ' + h, h === '#accueil', h);
    v('aucune erreur de page (confirmation)', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  if (SEC.includes('feuille')) {
    const c = await L.ouvrir({ profil: 'android', qui: 'marc' }), p = c.p;
    await L.aller(p, 'accueil'); await L.aller(p, 'planning'); await L.toucher(c, '[data-plvue="carte"]'); await L.calme(p, 700);
    await L.toucher(c, '[data-crsel]'); await L.calme(p, 600);
    const o = await p.evaluate(() => !!document.getElementById('cr-ftel'));
    v('E la feuille d\'une tournée est posée (population)', o);
    if (o) {
      await C.retour(p); const e1 = await p.evaluate(() => ({ f: !!document.getElementById('cr-ftel'), h: location.hash }));
      v('E1 Retour ferme la feuille et laisse le Planning', !e1.f && e1.h === '#planning', e1);
      await L.toucher(c, '[data-crsel]'); await L.calme(p, 500);
      await L.toucher(c, '[data-plvue="liste"], [data-plvue="jour"], [data-plvue="semaine"]'); await L.calme(p, 600);
      const e2 = await p.evaluate(() => ({ f: !!document.getElementById('cr-ftel'), ouverts: calOuverts().join(','), h: location.hash }));
      await C.retour(p); const h = await hash(p);
      v('E2 feuille ouverte puis changement de vue du planning (feuille disparue : ' + !e2.f + ') : UN Retour quitte le Planning — adresse ' + h, e2.f || h === '#accueil', { e2, h });
    }
    v('aucune erreur de page (feuille)', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  if (SEC.includes('ipad')) {
    const c = await L.ouvrir({ profil: 'ipad', qui: 'marc' }), p = c.p;
    await L.aller(p, 'accueil'); await p.keyboard.press('Meta+k'); await L.calme(p, 300);
    const pal = await p.evaluate(() => !!document.getElementById('pal'));
    v('F iPad : ⌘K ouvre la recherche (population)', pal);
    if (pal) { await C.retour(p); v('F Retour ferme la recherche et reste sur l\'accueil', !(await p.evaluate(() => !!document.getElementById('pal'))) && (await hash(p)) === '#accueil', await hash(p)); }
    await p.keyboard.press('Control+k'); await L.calme(p, 300);
    const pal2 = await p.evaluate(() => !!document.getElementById('pal'));
    if (pal2) dit({ constat: 'iPad : Ctrl+K ouvre aussi la recherche (les deux raccourcis marchent)' });
    v('aucune erreur de page (iPad)', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  await lib.fermer(); const ko = lib.bilan(); if (doutes.length) console.log('doutes :', JSON.stringify(doutes)); process.exit(ko ? 1 : 0);
})().catch(e => { v('la sonde va jusqu\'au bout (une exception l\'a arrêtée)', false, String(e.stack || e.message).split('\n').slice(0, 3).join(' | ').slice(0, 300)); lib.bilan(); lib.fermer().then(() => process.exit(1), () => process.exit(1)); });

/* Sonde du PROTOTYPE d'OP MESSAGES (apercu/prototype-op-messages.html, 13 novembre 2026) — page autonome, données fictives.
   Lancer depuis la racine du dépôt : node scratchpad/sonde-proto-messages-gestes.js   (captures dans le dossier donné par CAPS, sinon aucune capture n'est gardée ailleurs que dans cap/)
   Les GESTES, touchés pour de vrai sur Mac et iPhone, et l'état relu après chacun (accord, résumé, fil, appel, réunion, compte rendu, le vrai module de courrier monté, recherche, rôles, visite guidée, jour et nuit). */
// Sonde des GESTES du prototype : on touche pour de vrai et on relit l'état. Ordinateur et iPhone. Captures des états plein écran.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const FICHIER = 'file://' + (process.env.PAGE || path.join(__dirname, '..', 'apercu', 'prototype-op-messages.html'));
const CAPS = process.env.CAPS || path.join(require('os').tmpdir(), 'proto-opmsg-cap'); fs.mkdirSync(CAPS, { recursive: true });
let ok = 0, ko = 0; const v = (nom, cond, detail) => { if (cond) ok++; else { ko++; console.log('  ✗', nom, detail === undefined ? '' : JSON.stringify(detail)); } };
(async () => {
  const b = await chromium.launch();
  const UAS = { mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15', iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', android: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36', windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' };
  for (const p of [{ n: 'mac', w: 1440, h: 900 }, { n: 'iphone', w: 393, h: 852, tactile: true }, { n: 'android', w: 360, h: 780, tactile: true }, { n: 'windows', w: 1280, h: 720 }, { n: 'ipad', w: 820, h: 1180, tactile: true, large: true, ua: 'mac' }]) {
    if (process.env.PROFILS && !process.env.PROFILS.split(',').includes(p.n)) continue;
    const ctx = await b.newContext({ viewport: { width: p.w, height: p.h }, hasTouch: !!p.tactile, isMobile: !!p.tactile && !p.large, deviceScaleFactor: 2, colorScheme: p.n === 'mac' || p.n === 'windows' ? 'light' : 'dark', userAgent: UAS[p.ua || p.n] });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(FICHIER); await page.waitForTimeout(250);
    const E = (f, a) => page.evaluate(f, a), go = async (h) => { await E((x) => { location.hash = x; }, h); await page.waitForTimeout(180); };
    const clic = async (sel, i) => { const l = page.locator(sel); const n = await l.count(); if (!n) { v('cible trouvée : ' + sel, false); return false; } const e = i == null ? l.first() : l.nth(i); await e.scrollIntoViewIfNeeded(); await e.click(); await page.waitForTimeout(120); return true; };
    const cap = async (nom) => { await page.waitForTimeout(420); return page.screenshot({ path: path.join(CAPS, `g-${p.n}-${nom}.png`) }); };
    console.log('—', p.n);

    /* 0. le compteur du courrier est juste DÈS L'OUVERTURE, sans avoir ouvert la boîte mail (elle se monte au départ, masquée, à sa taille) — et masquée, elle ne prend aucun clic */
    await page.waitForFunction(() => COUR.nl.pro > 0, null, { timeout: 8000 }).catch(() => {});
    v('Aujourd’hui : le nombre de courriels non lus vient du module, sans ouvrir le Courrier', await E(() => COUR.nl.pro > 0 && new RegExp('(^|\\D)' + COUR.nl.pro + '\\s*courriels? non lus?').test(document.querySelector('.kpis').textContent.replace(/\s+/g, ' '))), await E(() => document.querySelector('.kpis').textContent.replace(/\s+/g, ' ').slice(0, 120)));
    v('⛔ la boîte mail masquée est HORS de l’écran (elle transparaissait derrière l’accueil), et la scène a un fond opaque', await E(() => { const h = document.querySelector('#zone-courrier-pro [data-opcourrier]'), r = h.getBoundingClientRect(), f = getComputedStyle(document.querySelector('#scene')).backgroundColor; return r.width > 100 && r.right <= 0 && /^rgb\(/.test(f); }), await E(() => JSON.stringify(document.querySelector('#zone-courrier-pro [data-opcourrier]').getBoundingClientRect())));
    v('la zone du courrier, masquée, ne couvre pas l’écran (le point au centre est à la scène)', await E(() => { const e = document.elementFromPoint(innerWidth / 2, innerHeight / 2); return !!e && !e.closest('#courrier-fixe'); }));
    /* 0 bis. CE QUE CHAQUE APPAREIL ATTEND */
    v('appareil reconnu, et le raccourci porte son nom (⌘K sur Apple, Ctrl K ailleurs)', await E(() => [document.documentElement.getAttribute('data-os'), RACCOURCI].join(' ')) === ({ mac: 'mac ⌘K', iphone: 'ios ⌘K', android: 'android Ctrl K', windows: 'windows Ctrl K', ipad: 'mac ⌘K' })[p.n], await E(() => [document.documentElement.getAttribute('data-os'), RACCOURCI].join(' ')));
    await go('messages'); await E(() => ouvrirRecherche()); await page.waitForTimeout(150);
    await page.goBack(); await page.waitForTimeout(350);
    v('⛔ la touche RETOUR ferme la feuille ouverte (elle ne reste pas posée sur l’écran d’avant)', await E(() => !document.querySelector('#calque').innerHTML));
    if (!p.tactile) { await go('messages-x-karim'); await page.locator('.bulle[data-menu-msg]').first().click({ button: 'right' }); await page.waitForTimeout(200);
      v('clic droit sur un message : son menu s’ouvre (ordinateur)', await E(() => /Répondre dans un fil/.test(document.querySelector('#calque').textContent))); await E(() => fermer()); }
    if (p.tactile && !p.large) { await E(() => ouvrirRecherche()); await page.waitForTimeout(450);
      await E(async () => { const x = document.querySelector('#calque .panneau'), r = x.getBoundingClientRect(), cx = r.left + r.width / 2; const t = (y) => new Touch({ identifier: 1, target: x, clientX: cx, clientY: y });
        x.dispatchEvent(new TouchEvent('touchstart', { touches: [t(r.top + 12)], bubbles: true })); for (let k = 1; k <= 6; k++) { x.dispatchEvent(new TouchEvent('touchmove', { touches: [t(r.top + 12 + k * 30)], bubbles: true })); await new Promise((ok) => setTimeout(ok, 16)); }
        x.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t(r.top + 192)], bubbles: true })); });
      await page.waitForTimeout(200); v('une feuille se ferme en la TIRANT vers le bas (téléphone)', await E(() => !document.querySelector('#calque').innerHTML)); }
    if (p.large || p.n === 'android') v('au doigt sur grand écran : tailles de tablette ; sur Android : libellés d’onglets à 12 px', await E((large) => large ? parseFloat(getComputedStyle(document.body).fontSize) >= 15 : getComputedStyle(document.querySelector('.capsule a')).fontSize === '12px', !!p.large));
    await go('aujourdhui');
    /* 1. Aujourd'hui → donner l'accord */
    await clic('[data-action="accord"]');
    v('accord : on arrive dans le groupe, le message est parti', await E(() => location.hash === '#messages-x-equipe' && /Accord pour le compresseur/.test(conv('equipe').msgs.slice(-1)[0].t)));
    /* 2. Résumé, menu d'un message, tâche */
    await page.reload(); await page.waitForTimeout(200); await go('messages-x-equipe');
    v('population : le groupe a 12 non lus et le bloc « Résumer »', await E(() => conv('equipe').nonlu === 12 && !!document.querySelector('[data-action="resumer"]')));
    await clic('[data-action="resumer"]');
    v('résumé affiché', await E(() => /Ce que tu as manqué/.test(document.querySelector('#resume-zone').textContent)));
    await cap('resume');
    const t0 = await E(() => S.taches.length);
    await clic('.bulle[data-menu-msg]', 1); await cap('menu-message');
    v('la feuille du message est ouverte', await E(() => !!document.querySelector('#calque [data-msg-act="tache"]')));
    await clic('[data-msg-act="tache"]');
    v('une tâche de plus', await E((n) => S.taches.length === n + 1, t0));
    /* fil de réponses */
    await clic('.bulle[data-menu-msg]', 4); await clic('[data-msg-act="fil"]');
    await page.fill('#saisie-fil', 'Je valide.'); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
    v('le fil a reçu la réponse et la bulle le dit', await E(() => /1 réponse dans le fil/.test(document.querySelector('#fil').textContent)));
    await E(() => fermer());
    /* 3. écrire à un client : envoi, réponse simulée */
    await go('messages-x-marc'); const n0 = await E(() => conv('marc').msgs.length);
    await page.fill('#saisie', 'Le devis part dans l’heure.'); await page.keyboard.press('Enter'); await page.waitForTimeout(2700);
    v('message envoyé, puis réponse du client', await E((n) => conv('marc').msgs.length === n + 2, n0), await E(() => conv('marc').msgs.length));
    await clic('[data-action="prendre"]'); v('boîte partagée : je m’en occupe', await E(() => conv('marc').partage.a === 'moi'));
    /* 4. une date dans un message devient un rendez-vous */
    await go('messages-x-equipe'); const e0 = await E(() => EVTS.length);
    await clic('.date-d'); v('la feuille Programmer est préremplie (14:00, 3 invités)', await E(() => document.querySelector('#pe-heure').value === '14:00' && document.querySelectorAll('#pe-invites [aria-pressed="true"]').length === 3));
    await cap('programmer'); await clic('[data-action="creer-evt"]');
    v('un événement de plus, la fiche est ouverte, la bannière est descendue', await E((n) => EVTS.length === n + 1 && /^#agenda-x-/.test(location.hash) && !!document.querySelector('.banniere'), e0));
    /* 5. appel sortant, notes, raccrocher */
    await go('messages-x-karim'); const a0 = await E(() => APPELS.length);
    await clic('[data-appeler="karim"]:not([data-video])'); v('écran d’appel ouvert, ça sonne', await E(() => S.appel && S.appel.etat === 'sonne' && !!document.querySelector('#plein .appel')));
    await page.waitForTimeout(2100); v('l’appel court', await E(() => S.appel.etat === 'cours'));
    await clic('[data-appel="notes"]'); await page.fill('#appel-notes', 'Commander avant midi.'); await clic('[data-appel="reseau"]'); await cap('appel');
    v('les notes survivent à un autre geste', await E(() => document.querySelector('#appel-notes').value === 'Commander avant midi.'));
    await clic('[data-appel="reduire"]'); v('appel réduit : pastille « Revenir »', await E(() => !!document.querySelector('#mini-appel') && !document.querySelector('#plein .appel')));
    await clic('#mini-appel'); await clic('[data-appel="raccrocher"]');
    v('appel terminé : une ligne de plus dans l’historique, avec les notes, et la feuille de fin', await E((n) => APPELS.length === n + 1 && APPELS[0].notes === 'Commander avant midi.' && /Appel terminé/.test(document.querySelector('#calque').textContent), a0));
    await E(() => fermer());
    /* 6. appel entrant → répondre → ajouter : devient une réunion */
    await go('appels'); await clic('[data-action="appel-entrant"]'); await cap('appel-entrant');
    v('appel entrant : Répondre et Refuser', await E(() => !!document.querySelector('[data-appel="repondre"]') && !!document.querySelector('[data-appel="refuser"]')));
    await clic('[data-appel="repondre"]'); await clic('[data-appel="ajouter"]');
    v('« Ajouter » transforme l’appel en réunion', await E(() => !S.appel && S.salle && S.salle.etape === 'salle' && !!document.querySelector('#plein .salle')));
    await clic('[data-salle="quitter"]'); await E(() => fermer());
    /* 7. réunion : préparation, salle d'attente, sous-titres, notes, compte rendu */
    await go('aujourdhui'); await clic('[data-rejoindre="e0"]'); await cap('preparation');
    v('écran de préparation', await E(() => S.salle.etape === 'prepa' && !!document.querySelector('.prepa')));
    await clic('[data-salle="entrer"]'); v('dans la salle, James attend', await E(() => S.salle.etape === 'salle' && S.salle.attente[0] === 'james'));
    await clic('[data-salle="admettre"]'); v('James admis', await E(() => S.salle.presents.includes('james') && !S.salle.attente.length));
    await clic('[data-salle="st"]'); await clic('[data-salle="st"]'); v('sous-titres traduits', await E(() => S.salle.st && S.salle.trad && /Traduction|English/.test(document.querySelector('#soustitres').textContent)));
    await clic('[data-salle="volet-notes"]'); await page.fill('#salle-notes', 'On commence par le 2e étage.'); await page.fill('#salle-action', 'Prévenir la réception'); await clic('[data-salle="action"]');
    v('une action notée, les notes gardées', await E(() => S.salle.actions.length === 1 && S.salle.notes === 'On commence par le 2e étage.'));
    await cap('salle'); await page.waitForTimeout(3200);
    v('la parole tourne sans erreur (tuiles repeintes)', await E(() => document.querySelectorAll('#tuiles .tuile').length === 3 + 0 || document.querySelectorAll('#tuiles .tuile').length >= 3));
    await clic('[data-salle="volet-participants"]'); await cap('salle-participants');
    await clic('[data-salle="quitter"]');
    v('compte rendu ouvert à la sortie, avec l’action', await E(() => !S.salle && /Compte rendu/.test(document.querySelector('#calque h2').textContent) && /Prévenir la réception/.test(document.querySelector('#calque').textContent)));
    await cap('compte-rendu'); const m0 = await E(() => conv('equipe').msgs.length);
    await clic('[data-action="cr-envoyer"]'); v('compte rendu envoyé dans le groupe', await E((n) => conv('equipe').msgs.length === n + 1, m0));
    /* 8. le Courrier est le VRAI module opcourrier.js, monté tel quel (rien n'est redessiné) : il s'ouvre, il compte, il lit, il survit à un changement de rubrique */
    const OMB = (c) => `document.querySelector('#zone-courrier-${c} [data-opcourrier]')`;
    await go('courrier'); await page.waitForFunction((h) => { const e = eval(h); return e && e.shadowRoot && e.shadowRoot.querySelectorAll('#rows .msg').length > 0; }, OMB('pro'), { timeout: 8000 }).catch(() => {});
    const lignes0 = await E((h) => { const e = eval(h); return e && e.shadowRoot ? e.shadowRoot.querySelectorAll('#rows .msg').length : 0; }, OMB('pro'));
    v('courrier : le vrai module est monté (arbre d’ombre) et montre des courriels d’exemple', lignes0 > 0, lignes0);
    v('courrier : la pastille de l’onglet reprend le nombre annoncé par le module', await E(() => COUR.nl.pro > 0 && compte('courrier') === COUR.nl.pro && new RegExp('Courrier\\s*' + COUR.nl.pro).test(document.querySelector(innerWidth <= 760 ? '#barre-bas' : '#menu').textContent)), await E(() => COUR.nl.pro));
    v('courrier : côté Pro seul, sans sélecteur Pro / Perso', await E((h) => Array.from(eval(h).shadowRoot.querySelectorAll('.sptab')).every((x) => x.offsetWidth === 0), OMB('pro')));
    v('⛔ courrier : côté Pro, AUCUN courriel de la boîte personnelle (les deux côtés ne se mélangent pas)', await E((h) => { const x = eval(h).shadowRoot.textContent; return /Nouvelle intervention assignée/.test(x) && !/Match de dimanche|Déjeuner vendredi/.test(x); }, OMB('pro')));
    await cap('courrier');
    await page.locator('#zone-courrier-pro #rows .msg').first().click(); await page.waitForTimeout(350);
    v('courrier : toucher un courriel l’ouvre en lecture', await E((h) => { const r = eval(h).shadowRoot.querySelector('.reading'); return !!r && r.textContent.trim().length > 80; }, OMB('pro')));
    await cap('courrier-lecture');
    await go('messages'); await page.waitForTimeout(1200); await go('courrier'); await page.waitForTimeout(300);
    v('courrier : après un détour par une autre rubrique, le module vit toujours (il ne s’est pas démonté)', await E((h) => { const e = eval(h); return !document.querySelector('#courrier-fixe').classList.contains('masquee') && e.isConnected && e.shadowRoot.querySelectorAll('#rows .msg').length > 0; }, OMB('pro')));
    await go('messages'); v('courrier : hors de sa rubrique, la zone est masquée et ne couvre rien', await E(() => document.querySelector('#courrier-fixe').classList.contains('masquee') && !!document.querySelector('#scene .liste')));
    /* 9. recherche partout */
    await E(() => ouvrirRecherche()); await page.fill('#rech-tout', 'dubois'); await page.waitForTimeout(100); await cap('recherche');
    v('la recherche trouve dans plusieurs rubriques', await E(() => document.querySelectorAll('#rech-res h3').length >= 3), await E(() => document.querySelectorAll('#rech-res h3').length));
    await E(() => fermer());
    /* 10. rôles */
    await clic('[data-role="perso"]'); await go('messages');
    v('côté Perso : Maman est là, aucun client', await E(() => /Maman/.test(document.querySelector('#scene').textContent) && !/Marc Dubois/.test(document.querySelector('#scene').textContent)));
    await go('courrier'); await page.waitForFunction((h) => { const e = eval(h); return e && e.shadowRoot && e.shadowRoot.querySelectorAll('#rows .msg').length > 0; }, OMB('perso'), { timeout: 8000 }).catch(() => {});
    v('côté Perso : SA boîte mail, un second montage, la zone Pro masquée', await E((h) => { const e = eval(h); return !!e && e.shadowRoot.querySelectorAll('#rows .msg').length > 0 && document.querySelector('#zone-courrier-pro').hidden && !document.querySelector('#zone-courrier-perso').hidden && !/Nouvelle intervention assignée/.test(e.shadowRoot.textContent) && /Match de dimanche|Déjeuner vendredi/.test(e.shadowRoot.textContent); }, OMB('perso')));
    await clic('[data-role="invite"]'); v('invité : la page d’invitation', await E(() => location.hash === '#invite' && /t’invite à une réunion/.test(document.querySelector('#scene').textContent)));
    await cap('invite'); await clic('[data-rejoindre="e0"]'); await clic('[data-salle="entrer"]'); v('invité : il attend qu’on le laisse entrer', await E(() => S.salle.etape === 'attente'));
    await page.waitForTimeout(2500); v('invité : il est entré, sans le volet « Plus »', await E(() => S.salle.etape === 'salle' && !document.querySelector('[data-salle="volet-plus"]')));
    await clic('[data-salle="quitter"]'); await E(() => fermer()); await clic('[data-role="pro"]');
    /* 11. visite guidée, toutes les étapes */
    await E(() => gdAller(0)); let spots = 0, etapes = await E(() => ETAPES.length);
    for (let i = 0; i < etapes; i++) { await page.waitForFunction((n) => GD.pose === n, i, { timeout: 8000 }); await page.waitForTimeout(320); const s = await E(() => { const e = document.querySelector('#gd-spot'), b = document.querySelector('#gd-bulle'); const r = b.getBoundingClientRect(); return { w: e.offsetWidth, i: GD.i, vis: r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1 }; });
      if (s.w > 0) spots++; else if (i < etapes - 1) console.log('    étape sans cible', i + 1, await E(() => ETAPES[GD.i][1])); v('visite ' + (i + 1) + ' : la bulle est entière à l’écran', s.vis, s); if (i === 3 || i === 8) await cap('visite-' + (i + 1));
      await clic('[data-gd-act="suiv"]'); }
    v('visite : chaque étape qui vise un élément l’a trouvé', spots === etapes - 1, spots); v('visite terminée', await E(() => GD.i === -1 && !document.querySelector('#gd-bulle')));
    /* 12. jour / nuit */
    await E(() => { S.mode = 'dark'; appliquerMode(); }); v('Nuit : bleu nuit, jamais noir', await E(() => getComputedStyle(document.body).backgroundColor) === 'rgb(11, 22, 51)');
    await go('courrier'); await page.waitForTimeout(300);
    v('Nuit : la boîte mail suit le réglage du prototype (thème « nuit » posé sur le module)', await E((h) => eval(h).shadowRoot.querySelector('.opc').getAttribute('data-theme'), OMB('pro')) === 'nuit');
    await E(() => { S.mode = 'light'; appliquerMode(); }); v('Jour : la boîte mail repasse en « jour »', await E((h) => eval(h).shadowRoot.querySelector('.opc').getAttribute('data-theme'), OMB('pro')) === 'jour');
    await E(() => { S.mode = 'light'; appliquerMode(); }); v('Jour : fond clair', await E(() => getComputedStyle(document.body).backgroundColor) === 'rgb(242, 242, 247)');
    v('aucune erreur JavaScript', errs.length === 0, errs.slice(0, 4));
    await ctx.close();
  }
  console.log(`${ok} ✓  ${ko} ✗`); await b.close(); process.exit(ko ? 1 : 0);
})();

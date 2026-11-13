/* Sonde du PROTOTYPE d'OP MESSAGES (apercu/prototype-op-messages.html, 13 novembre 2026) — page autonome, données fictives.
   Lancer depuis la racine du dépôt : node scratchpad/sonde-proto-messages-gestes.js   (captures dans le dossier donné par CAPS, sinon aucune capture n'est gardée ailleurs que dans cap/)
   Les GESTES, touchés pour de vrai sur Mac et iPhone, et l'état relu après chacun (accord, résumé, fil, appel, réunion, compte rendu, courrier annulable, recherche, rôles, visite guidée, jour et nuit). */
// Sonde des GESTES du prototype : on touche pour de vrai et on relit l'état. Ordinateur et iPhone. Captures des états plein écran.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const FICHIER = 'file://' + (process.env.PAGE || path.join(__dirname, '..', 'apercu', 'prototype-op-messages.html'));
const CAPS = process.env.CAPS || path.join(require('os').tmpdir(), 'proto-opmsg-cap'); fs.mkdirSync(CAPS, { recursive: true });
let ok = 0, ko = 0; const v = (nom, cond, detail) => { if (cond) ok++; else { ko++; console.log('  ✗', nom, detail === undefined ? '' : JSON.stringify(detail)); } };
(async () => {
  const b = await chromium.launch();
  for (const p of [{ n: 'mac', w: 1440, h: 900 }, { n: 'iphone', w: 393, h: 852, tactile: true }]) {
    const ctx = await b.newContext({ viewport: { width: p.w, height: p.h }, hasTouch: !!p.tactile, isMobile: !!p.tactile, deviceScaleFactor: 2, colorScheme: p.n === 'mac' ? 'light' : 'dark' });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(FICHIER); await page.waitForTimeout(250);
    const E = (f, a) => page.evaluate(f, a), go = async (h) => { await E((x) => { location.hash = x; }, h); await page.waitForTimeout(180); };
    const clic = async (sel, i) => { const l = page.locator(sel); const n = await l.count(); if (!n) { v('cible trouvée : ' + sel, false); return false; } const e = i == null ? l.first() : l.nth(i); await e.scrollIntoViewIfNeeded(); await e.click(); await page.waitForTimeout(120); return true; };
    const cap = async (nom) => { await page.waitForTimeout(420); return page.screenshot({ path: path.join(CAPS, `g-${p.n}-${nom}.png`) }); };
    console.log('—', p.n);

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
    /* 8. courrier : réponse proposée, envoi annulable, reporter, archiver + annuler */
    await go('courrier-x-m1'); await clic('[data-rep-mail]', 0);
    v('le brouillon reprend la réponse proposée', await E(() => /je vous envoie le contrat/.test(document.querySelector('#em-corps').value) && document.querySelector('#em-a').value === 'j.carter@hotel-remparts.example'));
    await cap('ecrire'); const ml = await E(() => MAILS.length);
    await clic('[data-action="em-envoyer"]'); v('envoi en attente, annulable', await E(() => /Envoi dans 10 secondes/.test(document.querySelector('#toast').textContent)));
    await clic('#toast-a'); const tAnnule = Date.now(); v('annulé : rien n’est parti, le brouillon est rouvert', await E((n) => MAILS.length === n && !!document.querySelector('#em-corps'), ml));
    await E(() => fermer());
    await go('courrier-x-m3'); await clic('[data-mail="reporter"]'); await clic('[data-reporter]', 1);
    v('reporté : sorti de la réception, rangé dans Reportés', await E(() => mail('m3').dossier === 'reportes' && /demain matin/.test(mail('m3').reporte)));
    await go('courrier-x-m5'); await clic('[data-mail="archiver"]'); await clic('#toast-a'); v('archiver puis annuler : revenu en réception', await E(() => mail('m5').dossier === 'recu'));
    await go('courrier-x-m2'); await clic('[data-mail="plus"]'); await cap('mail-plus'); await clic('[data-action="mail-partager"]'); await clic('[data-partager-conv="equipe"]');
    v('courriel partagé dans le groupe', await E(() => /^Courriel · /.test(conv('equipe').msgs.slice(-1)[0].b)));
    /* 9. recherche partout */
    await E(() => ouvrirRecherche()); await page.fill('#rech-tout', 'compresseur'); await page.waitForTimeout(100); await cap('recherche');
    v('la recherche trouve dans plusieurs rubriques', await E(() => document.querySelectorAll('#rech-res h3').length >= 3), await E(() => document.querySelectorAll('#rech-res h3').length));
    await E(() => fermer());
    /* 10. rôles */
    await clic('[data-role="perso"]'); await go('messages');
    v('côté Perso : Maman est là, aucun client', await E(() => /Maman/.test(document.querySelector('#scene').textContent) && !/Marc Dubois/.test(document.querySelector('#scene').textContent)));
    await go('courrier'); v('côté Perso : seule la boîte perso', await E(() => !/Contrat d’entretien/.test(document.querySelector('#scene').textContent) && /Photos des vacances/.test(document.querySelector('#scene').textContent)));
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
    /* ⛔ l'envoi ANNULÉ ne part jamais : on relit APRÈS les dix secondes (sans ça, un envoi qui partait quand même passait la sonde — mutation m2) */
    await page.waitForTimeout(Math.max(0, 10600 - (Date.now() - tAnnule)));
    v('dix secondes après, le courriel annulé n’est toujours pas parti', await E(() => !MAILS.some((m) => m.dossier === 'envoyes' && /^Re: Contrat/.test(m.objet))));
    /* 12. jour / nuit */
    await E(() => { S.mode = 'dark'; appliquerMode(); }); v('Nuit : bleu nuit, jamais noir', await E(() => getComputedStyle(document.body).backgroundColor) === 'rgb(11, 22, 51)');
    await E(() => { S.mode = 'light'; appliquerMode(); }); v('Jour : fond clair', await E(() => getComputedStyle(document.body).backgroundColor) === 'rgb(242, 242, 247)');
    v('aucune erreur JavaScript', errs.length === 0, errs.slice(0, 4));
    await ctx.close();
  }
  console.log(`${ok} ✓  ${ko} ✗`); await b.close(); process.exit(ko ? 1 : 0);
})();

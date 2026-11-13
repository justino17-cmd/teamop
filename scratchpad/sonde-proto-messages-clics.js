/* Sonde « TOUT CE QUI SE CLIQUE » du prototype d'OP MESSAGES (apercu/prototype-op-messages.html) — 13 novembre 2026.
   Justin : « je veux un test complet de A à Z de toute chose cliquable, qui doit emmener aux bonnes catégories, que tout fonctionne ».

   Pour chaque SCÈNE (un écran, une feuille ouverte, un appel, une réunion…), sur Mac puis sur iPhone, dans les trois rôles :
     1. elle recense dans le DOM tout ce qui se clique et se voit (jamais une liste de classes écrite à la main) ;
     2. elle recharge la page, revient à la scène, retrouve l'élément par sa SIGNATURE (balise, texte, attributs), le met au milieu de l'écran,
        vérifie que c'est bien LUI qui reçoit le doigt (sinon : « recouvert », nommé), puis clique POUR DE VRAI (souris ou doigt) ;
     3. elle compare l'état d'avant et d'après : un clic sans aucun effet est un bouton MORT ; une navigation doit arriver à la bonne adresse ;
        une erreur JavaScript est attribuée au clic qui l'a causée.
   Elle dit sa population : combien de cibles recensées, combien de frappes ont réellement porté.
   Le Courrier (module opcourrier.js, arbre d'ombre) a ses propres sondes (scratchpad/courrier/) : ici on ne clique que ce qui est au prototype.

   Lancer : node scratchpad/sonde-proto-messages-clics.js   (PROFILS=mac|iphone, SCENES=nom,nom pour restreindre ; RAPPORT=chemin.json) — sort en 1 au moindre défaut. */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const FICHIER = 'file://' + (process.env.PAGE || path.join(__dirname, '..', 'apercu', 'prototype-op-messages.html'));

const R_PRO = ['aujourdhui', 'messages', 'messages-x-equipe', 'messages-x-karim', 'messages-x-marc', 'messages-x-james', 'messages-x-thomas', 'messages-x-camille', 'appels', 'appels-x-a1', 'appels-x-a2', 'appels-x-a4', 'appels-x-a5',
  'agenda', 'agenda-x-e0', 'agenda-x-e1', 'agenda-x-e2', 'agenda-x-e3', 'agenda-x-e4', 'contacts', 'contacts-x-karim', 'contacts-x-marc', 'contacts-x-james', 'reglages', 'idees'];
const R_PERSO = ['aujourdhui', 'messages', 'messages-x-maman', 'messages-x-voile', 'messages-x-antoine', 'appels', 'appels-x-a6', 'appels-x-a7', 'agenda', 'agenda-x-e5', 'agenda-x-e6', 'contacts', 'contacts-x-helene', 'reglages'];
const premier = (sel) => `(Array.from(document.querySelectorAll('${sel}')).find((e) => e.offsetWidth > 0))`;
const SCENES = [
  { n: 'chrome-pro', role: 'pro', prep: "aller('aujourdhui')", zones: ['bande', 'menu', 'barre-bas'] },
  { n: 'chrome-perso', role: 'perso', prep: "aller('aujourdhui')", zones: ['bande', 'menu', 'barre-bas'] },
  { n: 'chrome-invite', role: 'invite', prep: "aller('invite')", zones: ['bande', 'menu', 'scene'] },
  ...R_PRO.map((r) => ({ n: 'pro:' + r, role: 'pro', prep: `aller('${r}')`, zones: ['scene'] })),
  ...R_PERSO.map((r) => ({ n: 'perso:' + r, role: 'perso', prep: `aller('${r}')`, zones: ['scene'] })),
  { n: 'pro:equipe-resume', role: 'pro', prep: `aller('messages-x-equipe'); await dort(250); ${premier('[data-action="resumer"]')}.click()`, zones: ['scene'] },
  { n: 'pro:marc-traite', role: 'pro', prep: `aller('messages-x-marc'); await dort(250); ${premier('[data-action="fermer-demande"]')}.click()`, zones: ['scene'] },
  /* — les feuilles — */
  { n: 'feuille:menu-message', role: 'pro', prep: "aller('messages-x-equipe'); await dort(250); document.querySelectorAll('.bulle[data-menu-msg]')[1].click()", zones: ['calque'] },
  { n: 'feuille:menu-message-a-moi', role: 'pro', prep: "aller('messages-x-karim'); await dort(250); document.querySelector('.msg.moi-m .bulle[data-menu-msg]').click()", zones: ['calque'] },
  { n: 'feuille:menu-message-anglais', role: 'pro', prep: "aller('messages-x-james'); await dort(250); document.querySelectorAll('.msg:not(.moi-m) .bulle[data-menu-msg]')[0].click()", zones: ['calque'] },
  { n: 'feuille:rappel', role: 'pro', prep: "aller('messages-x-equipe'); await dort(250); document.querySelectorAll('.bulle[data-menu-msg]')[1].click(); await dort(150); document.querySelector('[data-msg-act=\"rappel\"]').click()", zones: ['calque'] },
  { n: 'feuille:fil', role: 'pro', prep: "aller('messages-x-equipe'); await dort(250); ouvrirFil(conv('equipe'), conv('equipe').msgs[0])", zones: ['calque'] },
  { n: 'feuille:joindre', role: 'pro', prep: `aller('messages-x-marc'); await dort(250); ${premier('[data-action="joindre"]')}.click()`, zones: ['calque'] },
  { n: 'feuille:joindre-perso', role: 'perso', prep: `aller('messages-x-maman'); await dort(250); ${premier('[data-action="joindre"]')}.click()`, zones: ['calque'] },
  { n: 'feuille:plus-tard', role: 'pro', prep: `aller('messages-x-karim'); await dort(250); document.querySelector('#saisie').value = 'Je passe à 11 h.'; ${premier('[data-action="plus-tard"]')}.click()`, zones: ['calque'] },
  { n: 'feuille:nouvelle-conversation', role: 'pro', prep: `aller('messages'); await dort(250); ${premier('[data-action="nouveau-msg"]')}.click()`, zones: ['calque'] },
  { n: 'feuille:infos-groupe', role: 'pro', prep: `aller('messages-x-equipe'); await dort(250); ${premier('[data-action="infos-conv"]')}.click()`, zones: ['calque'] },
  { n: 'feuille:infos-personne', role: 'pro', prep: `aller('messages-x-karim'); await dort(250); ${premier('[data-action="infos-conv"]')}.click()`, zones: ['calque'] },
  { n: 'feuille:fiche-gestion', role: 'pro', prep: "aller('messages-x-karim'); await dort(250); document.querySelector('.fiche-lien').click()", zones: ['calque'] },
  { n: 'feuille:programmer', role: 'pro', prep: "feuilleProgrammer({ invites: ['karim'] })", zones: ['calque'] },
  { n: 'feuille:programmer-perso', role: 'perso', prep: "feuilleProgrammer({})", zones: ['calque'] },
  { n: 'feuille:date-dans-message', role: 'pro', prep: "aller('messages-x-equipe'); await dort(250); document.querySelector('.date-d').click()", zones: ['calque'] },
  { n: 'feuille:compte-rendu', role: 'pro', prep: "compteRendu(evt('e4'))", zones: ['calque'] },
  { n: 'feuille:recherche', role: 'pro', prep: "ouvrirRecherche(); document.querySelector('#rech-tout').value = 'dubois'; document.querySelector('#rech-res').innerHTML = resultats('dubois')", zones: ['calque'] },
  { n: 'feuille:recherche-perso', role: 'perso', prep: "ouvrirRecherche(); document.querySelector('#rech-tout').value = 'dimanche'; document.querySelector('#rech-res').innerHTML = resultats('dimanche')", zones: ['calque'] },
  { n: 'feuille:statut', role: 'pro', prep: `aller('aujourdhui'); await dort(200); const s = ${premier('[data-action="statut"]')}; if (s) s.click(); else { ${premier('[data-action="menu-tel"]')}.click(); await dort(200); document.querySelector('#calque [data-action="statut"]').click(); }`, zones: ['calque'] },
  { n: 'feuille:menu-telephone', role: 'pro', tel: true, prep: `aller('aujourdhui'); await dort(200); ${premier('[data-action="menu-tel"]')}.click()`, zones: ['calque'] },
  { n: 'feuille:nouvel-appel', role: 'pro', prep: `aller('appels'); await dort(250); ${premier('[data-action="nouvel-appel"]')}.click()`, zones: ['calque'] },
  { n: 'feuille:lien-appel', role: 'pro', prep: `aller('appels'); await dort(250); ${premier('[data-action="lien-appel"]')}.click()`, zones: ['calque'] },
  { n: 'feuille:rappel-appel', role: 'pro', prep: `aller('appels-x-a1'); await dort(250); ${premier('[data-action="rappel-appel"]')}.click()`, zones: ['calque'] },
  { n: 'feuille:ajouter-contact', role: 'pro', prep: `aller('contacts'); await dort(250); ${premier('[data-action="ajouter-contact"]')}.click()`, zones: ['calque'] },
  { n: 'feuille:idee', role: 'pro', prep: "voirIdee(5)", zones: ['calque'] },
  { n: 'feuille:appel-termine', role: 'pro', prep: "lancerAppel('karim', false); await dort(2100); S.appel.texte = 'Rappeler demain.'; finAppel()", zones: ['calque'] },
  /* — les états plein écran — */
  { n: 'appel:sonne', role: 'pro', prep: "lancerAppel('karim', false)", zones: ['plein'] },
  { n: 'appel:en-cours-audio', role: 'pro', prep: "lancerAppel('karim', false); await dort(2100)", zones: ['plein'] },
  { n: 'appel:en-cours-video-notes', role: 'pro', prep: "lancerAppel('james', true); await dort(2100); S.appel.notes = true; peindreAppel()", zones: ['plein'] },
  { n: 'appel:groupe', role: 'pro', prep: "lancerAppel('equipe', true); await dort(2100)", zones: ['plein'] },
  { n: 'appel:entrant', role: 'pro', prep: "lancerAppel('james', true, true)", zones: ['plein'] },
  { n: 'appel:reduit', role: 'pro', prep: "lancerAppel('karim', false); await dort(2100); S.appel.reduit = true; peindreAppel()", zones: ['mini'] },
  { n: 'reunion:preparation', role: 'pro', prep: "ouvrirSalle('e0')", zones: ['plein'] },
  { n: 'reunion:salle', role: 'pro', prep: "ouvrirSalle('e0'); entrerSalle()", zones: ['plein'] },
  { n: 'reunion:participants', role: 'pro', prep: "ouvrirSalle('e0'); entrerSalle(); S.salle.volet = 'participants'; peindreSalle()", zones: ['plein'] },
  { n: 'reunion:discussion', role: 'pro', prep: "ouvrirSalle('e0'); entrerSalle(); S.salle.volet = 'discussion'; peindreSalle()", zones: ['plein'] },
  { n: 'reunion:notes', role: 'pro', prep: "ouvrirSalle('e0'); entrerSalle(); S.salle.volet = 'notes'; peindreSalle()", zones: ['plein'] },
  { n: 'reunion:plus', role: 'pro', prep: "ouvrirSalle('e0'); entrerSalle(); S.salle.volet = 'plus'; peindreSalle()", zones: ['plein'] },
  { n: 'reunion:sondage-partage', role: 'pro', prep: "ouvrirSalle('e1'); entrerSalle(); S.salle.sondage = { q: 'On démarre lundi ?', o: [['Oui', 2], ['Non', 0]], v: null }; S.salle.partage = true; S.salle.salles = true; S.salle.st = true; peindreSalle()", zones: ['plein'] },
  { n: 'reunion:invite-preparation', role: 'invite', prep: "ouvrirSalle('e0', true)", zones: ['plein'] },
  { n: 'reunion:invite-salle', role: 'invite', prep: "ouvrirSalle('e0', true); entrerSalle()", zones: ['plein'] },
];

const DANS_LA_PAGE = `
  window.dort = (ms) => new Promise((ok) => setTimeout(ok, ms));
  window.__zone = (e) => e.closest('#calque') ? 'calque' : e.closest('#plein') ? 'plein' : e.closest('#mini-appel') ? 'mini' : e.closest('#bande') ? 'bande' : e.closest('#menu') ? 'menu' : e.closest('#barre-bas') ? 'barre-bas' : e.closest('#scene') ? 'scene' : e.closest('#toast,#notif') ? 'avis' : 'autre';
  window.__cibles = (zones) => {
    const vu = (e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.pointerEvents !== 'none' && cs.opacity !== '0'; };
    const tout = Array.from(document.querySelectorAll('button, a[href], [data-go], [data-action], [role="button"], input[type="checkbox"], [data-date], [data-fil], [data-vote], label.rang, label.coche'))
      .filter((e) => !e.closest('#courrier-fixe') && !e.closest('#gd-bulle') && !e.disabled && vu(e) && zones.includes(window.__zone(e)));
    /* un label qui enveloppe une case : la case suffit (c'est elle qu'on clique) */
    const cibles = tout.filter((e) => !(e.tagName === 'LABEL' && e.querySelector('input[type="checkbox"]')));
    const vues = {};
    return cibles.map((e) => { const att = Array.from(e.attributes).filter((a) => /^data-|^aria-label$|^href$/.test(a.name)).map((a) => a.name + '=' + a.value).sort().join(' ');
      const base = e.tagName + '|' + (e.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 60) + '|' + att; vues[base] = (vues[base] || 0) + 1; const sig = base + '#' + vues[base]; e.__sig = sig; return sig; });
  };
  window.__trouver = (zones, sig) => { window.__cibles(zones); return Array.from(document.querySelectorAll('*')).find((e) => e.__sig === sig) || null; };
  window.__h = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };
  window.__etat = () => { const q = (s) => { const e = document.querySelector(s); return e ? window.__h(e.innerHTML) + ':' + e.className : '-'; };
    return JSON.stringify([location.hash, q('#scene'), q('#calque'), q('#plein'), q('#toast'), q('#notif'), q('#menu'), q('#barre-bas'), q('#bande'), q('#mini-appel'), q('#courrier-fixe') === '-' ? '' : document.querySelector('#courrier-fixe').className,
      document.documentElement.getAttribute('data-theme') || '', Array.from(document.querySelectorAll('input[type="checkbox"]')).map((c) => +c.checked).join(''), !!document.querySelector('#gd-bulle'),
      document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : '', typeof S === 'object' ? [S.role, S.mode, S.statut, S.taches.length, S.rappels.length, !!S.appel, !!S.salle].join('|') : '']); };
`;

(async () => {
  const seuls = process.env.PROFILS ? process.env.PROFILS.split(',') : null, scenesSeules = process.env.SCENES ? process.env.SCENES.split(',') : null;
  const b = await chromium.launch(); const rapport = []; let total = 0, portes = 0;
  for (const p of [{ n: 'mac', w: 1440, h: 900 }, { n: 'iphone', w: 393, h: 852, tactile: true }]) {
    if (seuls && !seuls.includes(p.n)) continue;
    const ctx = await b.newContext({ viewport: { width: p.w, height: p.h }, hasTouch: !!p.tactile, isMobile: !!p.tactile, colorScheme: 'light', reducedMotion: 'reduce' });
    await ctx.addInitScript(DANS_LA_PAGE);
    const page = await ctx.newPage(); let errs = [];
    page.on('pageerror', (e) => errs.push('JS : ' + e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push('console : ' + m.text()); });
    const E = (f, a) => page.evaluate(f, a);
    const installer = async (sc) => {
      await page.goto(FICHIER); await page.waitForFunction(() => typeof S === 'object' && typeof rendre === 'function');
      await E(async ({ role, prep }) => { if (S.role !== role) { S.role = role; S.param = ''; } await (new Function('return (async () => { ' + prep + ' })()'))(); await dort(380); }, { role: sc.role, prep: sc.prep });
    };
    for (const sc of SCENES) {
      if (scenesSeules && !scenesSeules.includes(sc.n)) continue;
      if (sc.tel && !p.tactile) continue;
      errs = []; let sigs;
      try { await installer(sc); sigs = await E((z) => window.__cibles(z), sc.zones); } catch (e) { rapport.push({ p: p.n, scene: sc.n, genre: 'scène impossible', detail: String(e.message).slice(0, 200) }); continue; }
      if (errs.length) rapport.push({ p: p.n, scene: sc.n, genre: 'erreur à l’ouverture', detail: errs.join(' ; ').slice(0, 300) });
      process.stdout.write(`${p.n} ${sc.n} : ${sigs.length} cibles `);
      for (const sig of sigs) {
        total++; errs = [];
        try {
          await installer(sc);
          const pos = await E(async ({ z, sig }) => { const e = window.__trouver(z, sig); if (!e) return { absent: true };
            e.scrollIntoView({ block: 'center', inline: 'center' }); await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
            const r = e.getBoundingClientRect(), x = Math.min(Math.max(r.left + r.width / 2, 2), innerWidth - 2), y = Math.min(Math.max(r.top + r.height / 2, 2), innerHeight - 2);
            const haut = document.elementFromPoint(x, y); const lab = e.closest('label');
            const ok = !!haut && (haut === e || e.contains(haut) || haut.contains(e) || (lab && lab.contains(haut)));
            /* la ZONE QUI RÉPOND : un doigt touche un point — on demande à la page, de part et d'autre du centre, jusqu'où c'est encore cette commande (ou son libellé) qui reçoit */
            const mien = (px, py) => { const t = document.elementFromPoint(px, py); return !!t && (t === e || e.contains(t) || (lab && lab.contains(t))); };
            const portee = (dx, dy) => { let n = 0; for (let k = 1; k <= 30; k++) { if (mien(x + dx * k * 2, y + dy * k * 2)) n = k * 2; else break; } return n; };
            const zh = ok ? portee(0, -1) + portee(0, 1) : 0, zw = ok ? portee(-1, 0) + portee(1, 0) : 0;
            return { x, y, w: Math.round(Math.max(r.width, zw)), h: Math.round(Math.max(r.height, zh)), ok, couvre: ok ? '' : (haut ? (haut.id ? '#' + haut.id : '.' + String(haut.className).split(' ')[0]) + ' ' + (haut.textContent || '').trim().slice(0, 30) : 'rien'),
              go: e.dataset.go || '', voir: e.dataset.voir || '', role: e.dataset.role || '', mode: e.dataset.modetheme || '', rejoindre: e.dataset.rejoindre || '', appeler: e.dataset.appeler || '', ecrire: e.dataset.ecrire || '', idee: e.dataset.idee || '', actif: e.getAttribute('aria-pressed') === 'true' || e.classList.contains('on'), avant: window.__etat() }; }, { z: sc.zones, sig });
          if (pos.absent) { rapport.push({ p: p.n, scene: sc.n, sig, genre: 'cible introuvable après rechargement' }); continue; }
          if (!pos.ok) { rapport.push({ p: p.n, scene: sc.n, sig, genre: 'recouvert', detail: pos.couvre }); continue; }
          if (p.tactile && (pos.h < 40 || pos.w < 40)) rapport.push({ p: p.n, scene: sc.n, sig, genre: 'petite cible', detail: pos.w + '×' + pos.h });
          if (p.tactile) await page.touchscreen.tap(pos.x, pos.y); else await page.mouse.click(pos.x, pos.y);
          portes++; await page.waitForTimeout(/data-action=visite/.test(sig) ? 900 : 480);
          const ap = await E(() => ({ etat: window.__etat(), hash: location.hash, role: S.role, mode: S.mode, theme: document.documentElement.getAttribute('data-theme') || '', prepa: !!document.querySelector('#plein .prepa'), appel: !!document.querySelector('#plein .appel'), calque: document.querySelector('#calque').textContent.slice(0, 200) }));
          if (errs.length) rapport.push({ p: p.n, scene: sc.n, sig, genre: 'erreur JavaScript', detail: errs.join(' ; ').slice(0, 300) });
          /* un onglet, un segment ou une puce DÉJÀ choisis ne font rien, et c'est juste : on ne les compte pas comme morts */
          /* … ni un lien vers la fiche DÉJÀ ouverte (le raccourci épinglé de la conversation affichée, la ligne d'agenda de la fiche affichée) */
          const dejaLa = pos.go && JSON.parse(pos.avant)[0] === '#' + pos.go;
          if (ap.etat === pos.avant && !pos.actif && !dejaLa) rapport.push({ p: p.n, scene: sc.n, sig, genre: 'aucun effet' });
          const faux = (m) => rapport.push({ p: p.n, scene: sc.n, sig, genre: 'mauvaise destination', detail: m });
          if (pos.go && ap.hash !== '#' + pos.go && !(pos.go === 'invite' || sc.role === 'invite')) faux('attendu #' + pos.go + ', obtenu ' + ap.hash);
          if (pos.voir && pos.voir !== 'chercher' && ap.hash !== '#' + pos.voir) faux('« Voir » attendu #' + pos.voir + ', obtenu ' + ap.hash);
          if (pos.voir === 'chercher' && !/Rechercher partout/.test(ap.calque)) faux('« Voir » devait ouvrir la recherche');
          if (pos.role && ap.role !== pos.role) faux('rôle attendu ' + pos.role + ', obtenu ' + ap.role);
          if (pos.mode && (ap.mode !== pos.mode || (pos.mode === 'auto' ? ap.theme !== '' : ap.theme !== pos.mode))) faux('apparence attendue ' + pos.mode + ', obtenu ' + ap.mode + '/' + ap.theme);
          if (pos.rejoindre && !ap.prepa) faux('« Rejoindre » devait ouvrir l’écran de préparation');
          if (pos.appeler && !ap.appel) faux('devait ouvrir l’écran d’appel');
          if (pos.ecrire && !/^#messages-x-/.test(ap.hash)) faux('devait ouvrir une conversation, obtenu ' + ap.hash);
          if (pos.idee && !new RegExp('Idée ' + pos.idee + '\\b').test(ap.calque)) faux('devait ouvrir la fiche de l’idée ' + pos.idee);
        } catch (e) { rapport.push({ p: p.n, scene: sc.n, sig, genre: 'clic impossible', detail: String(e.message).slice(0, 200) }); }
      }
      console.log('✓');
    }
    await ctx.close();
  }
  await b.close();
  const par = {}; rapport.forEach((r) => { par[r.genre] = (par[r.genre] || 0) + 1; });
  if (process.env.RAPPORT) fs.writeFileSync(process.env.RAPPORT, JSON.stringify({ total, portes, par, rapport }, null, 1));
  console.log(`\npopulation : ${total} cibles recensées · ${portes} frappes ont réellement porté`);
  console.log(Object.keys(par).length ? Object.entries(par).map(([k, v]) => `${v} × ${k}`).join(' · ') : 'aucun défaut');
  rapport.slice(0, +process.env.MONTRER || 60).forEach((r) => console.log(`  [${r.p}] ${r.scene} — ${r.genre}${r.detail ? ' : ' + r.detail : ''}${r.sig ? ' — ' + r.sig.slice(0, 110) : ''}`));
  process.exit(rapport.length ? 1 : 0);
})();

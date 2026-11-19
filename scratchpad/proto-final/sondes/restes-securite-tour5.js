// RESTES DE LA SÉCURITÉ, tour 5 (19 novembre 2026) : les six restes du recontrôle du tour 4.
//   1. NFC : un « é » décomposé (e + U+0301) garde son accent dans le PDF d'une facture (lu à l'IMAGE du vrai PDF) et dans la fiche client (cliNet) ;
//   2. maxlength en graphèmes : frappe/collage RÉELS (clavier) — jamais de demi-drapeau ni de lettre régionale orpheline enregistrée ;
//   3. une ligne d'accès faite d'invisibles (U+200B, U+200C, U+2060, U+FEFF, U+0085, U+00AD…) ne compte pas comme une ligne ;
//   4. un signe de contrôle non blanc entre deux mots devient une espace, en tête/fin il disparaît ;
//   5. les dix champs libres : coupe / refuse / illimité, mesuré à l'exécution (frappe et collage au-delà du plafond).
// SECTIONS=pdf,nfc,graph,invis,ctrl,dix (tout par défaut). Population comptée avant tout zéro. ⛔ 127.0.0.1 seulement. « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const L = require('../lib.js'), v = L.v, fs = require('fs'), cp = require('child_process');
const SECTIONS = (process.env.SECTIONS || 'pdf,nfc,graph,invis,ctrl,dix').split(','), SORTIE = process.env.SORTIE || '/tmp/claude-0/t5/'; fs.mkdirSync(SORTIE, { recursive: true });
(async () => {
  const c = await L.ouvrir({ profil: 'mac', nuit: false, qui: 'marc', attente: 1500 }), p = c.p;
  p.on('dialog', d => d.accept().catch(() => {}));
  await p.evaluate(() => {
    window.__t = []; const t0 = toast; toast = function (m) { window.__t.push(String(m).replace(/<[^>]+>/g, '')); return t0.apply(this, arguments); };
    window.__set = (sel, val) => { const e = document.querySelector(sel); if (!e) return false; e.value = val; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); return true; };
  });

  // ─────────── 1. NFC : le PDF d'une facture, lu à l'image ───────────
  if (SECTIONS.includes('pdf')) {
    const NFD = 'Caf' + 'é' + ' Chère ' + 'été Leä', ATT = 'Café Chère été Leä';
    const r = await p.evaluate(async nom => { const f = FACTURES.find(x => CLIENTS[x.cli] && CLIENTS[x.cli].type === 'pro') || FACTURES[0]; const net = cliNet({ nom, contact: nom.slice(0, 20), adr: '12 rue de l’Été', tel: '05 46 12 34 56', mail: 'nfd@exemple.fr' }); Object.assign(CLIENTS[f.cli], net); CLIENTS[f.cli].nom = nom;   /* le nom BRUT (décomposé) : le PDF doit tenir seul, sans la toilette de cliNet */
      ACTIONS.pdfFacture({ dataset: { id: f.id } }); await new Promise(r => setTimeout(r, 700));
      const el = document.querySelector('.panneau .pdf'); if (!el) return { err: 'pas de document' };
      const out = docEnPdf(el, 'facture-nfc'); const u = out.octets; let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
      return { b64: btoa(s), pages: out.pages, gardeNom: net.nom, gardeNFC: net.nom === net.nom.normalize('NFC') && net.contact === net.contact.normalize('NFC') }; }, NFD);
    v('population : le document PDF de la facture est fabriqué', !!r.b64, r.err || r.pages);
    v('le nom du client gardé par cliNet est en NFC (la fiche, le PDF et la recherche voient le même nom)', r.gardeNom === ATT && r.gardeNFC, r.gardeNom);
    if (r.b64) { const f = SORTIE + 'facture-nfc.pdf'; fs.writeFileSync(f, Buffer.from(r.b64, 'base64'));
      const txt = cp.spawnSync('pdftotext', ['-layout', f, '-']).stdout.toString().replace(/\s+/g, ' ');
      v('PDF (texte extrait) : « Café Chère été Leä » avec ses accents', /Café Chère été Leä/.test(txt), txt.slice(txt.indexOf('Caf') - 5, txt.indexOf('Caf') + 60));
      v('PDF : aucun « eté » (accent perdu), aucun « ? » ni « � »', !/\beté\b|Cafe /.test(txt) && !/[?�]/.test(txt), (txt.match(/.{0,20}(eté|[?�]).{0,20}/g) || []).slice(0, 3));
      cp.spawnSync('pdftoppm', ['-r', '110', '-png', '-f', '1', '-l', '1', f, SORTIE + 'facture-nfc']); }
    // la fonction seule, hors cliNet : pdfOctets reçoit du NFD tel quel (texte venu d'un autre chemin que la fiche)
    const o = await p.evaluate(() => ({ nfd: pdfOctets('été'), nfc: pdfOctets('été'), ex: pdfOctets('Å') }));
    v('pdfOctets : « été » décomposé et composé donnent les MÊMES octets WinAnsi (é = 0xE9) ; « Å » décomposé aussi', o.nfd === o.nfc && o.nfd.charCodeAt(0) === 0xe9 && o.ex.charCodeAt(0) === 0xc5, [o.nfd.length, o.nfc.length, o.ex.length]);
  }

  // ─────────── les champs à maxlength : comment on les ouvre (copiés du tour 4, qui les a recensés) ───────────
  const pause = ms => L.calme(p, ms);
  const fermer = () => p.evaluate(() => { try { fermerPanneau(); } catch (e) {} try { fermerCreation(); } catch (e) {} try { document.querySelectorAll('#calque').forEach(x => x.innerHTML = ''); } catch (e) {} });
  const creaOuvrir = async () => { await p.evaluate(() => { try { fermerCreation(); } catch (e) {} const k = Object.keys(CLIENTS).find(x => x !== '__nv' && INTS.some(i => i.cli === x)); ouvrirCreation({ cli: k }); }); await pause(600); await p.evaluate(() => { const b = document.querySelector('.fen [data-cfact="temps"]'); if (b) b.click(); }); await pause(250); await p.evaluate(() => { const b = document.querySelector('.fen [data-action="cPlusTot"]'); if (b) b.click(); }); await pause(400); };
  const FICHE = async () => { await p.evaluate(async () => { window.__k0 = Object.keys(CLIENTS).find(k => k !== '__nv' && CLIENTS[k].tel); aller('client-x-' + window.__k0); await new Promise(r => setTimeout(r, 500)); ongletClient = 'infos'; rendre(); await new Promise(r => setTimeout(r, 600)); }); };
  const CH = [
    { n: 'fiche client · nom', sel: '[data-ci="nom"]', ouvrir: FICHE },
    { n: 'fiche client · contact', sel: '[data-ci="contact"]', ouvrir: FICHE },
    { n: 'fiche client · adresse', sel: '[data-ci="adr"]', ouvrir: FICHE },
    { n: 'fiche client · consignes d’accès (textarea)', sel: '[data-ci="acces"]', ouvrir: FICHE },
    { n: 'titre d’une intervention (m-t)', sel: '#m-t', ouvrir: async () => { await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} window.__iid = INTS.find(i => i.st !== 'annulee' && i.id !== 'brouillon').id; const b = document.createElement('button'); b.dataset.action = 'modifInt'; b.dataset.id = window.__iid; document.body.appendChild(b); b.click(); b.remove(); }); await pause(400); } },
    { n: 'titre d’un créneau bloqué (bl-titre)', sel: '#bl-titre', ouvrir: async () => { await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} panneauBloc('', 'sm', AUJ); }); await pause(400); } },
    { n: 'nom d’un fournisseur local (fo-l-nom)', sel: '#fo-l-nom', ouvrir: async () => { await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} foLocal(); }); await pause(600); } },
    { n: 'rôle d’une personne invitée (eq-r)', sel: '#eq-r', ouvrir: async () => { await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} eqInviter(); }); await pause(500); } },
    { n: 'nom de la plateforme de facturation (pa-n)', sel: '#pa-n', ouvrir: async () => { await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} cxPlateforme(); }); await pause(500); } },
    { n: 'motif d’une intervention (textarea)', sel: '[data-cchamp="motif"]', ouvrir: creaOuvrir },
    { n: 'titre de la fenêtre de création', sel: '[data-cchamp="titre"]', ouvrir: creaOuvrir },
  ];
  const orphelin = t => /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(t) || /(?:^|[^\u{1F1E6}-\u{1F1FF}])(?:[\u{1F1E6}-\u{1F1FF}]{2})*[\u{1F1E6}-\u{1F1FF}](?![\u{1F1E6}-\u{1F1FF}])/u.test(t) || /�/.test(t);
  const lire = sel => p.evaluate(s => { const e = document.querySelector(s); return e ? { v: e.value, max: +e.getAttribute('maxlength'), g: nbSignes(e.value) } : null; }, sel);
  const coller = async (sel, avant, txt) => { await p.evaluate(([s, a]) => { const e = document.querySelector(s); e.focus(); e.value = a; e.setSelectionRange(e.value.length, e.value.length); }, [sel, avant]); await p.keyboard.insertText(txt); await pause(50); };
  const DRAP = ['🇫🇷', '🇩🇪', '🇪🇸', '🇮🇹'];
  let champsVus = 0, collages = 0, ime = 0; const s5 = { cdp: await p.context().newCDPSession(p) };

  // ─────────── 2. maxlength en graphèmes : frappe et collage RÉELS, jamais de demi-drapeau ───────────
  if (SECTIONS.includes('graph')) {
    for (const F of CH) {
      await F.ouvrir(); const l0 = await lire(F.sel);
      v('population · ' + F.n + ' : le champ est à l’écran avec un maxlength', !!l0 && l0.max > 0, l0 && l0.max);
      if (!l0 || !(l0.max > 0)) continue; champsVus++; const M = l0.max;
      // (a) collage de « Z » + 3 × plafond drapeaux : on garde EXACTEMENT M signes, tous entiers, jamais une lettre régionale seule
      const flags = Array.from({ length: M * 3 }, (_, i) => DRAP[i % 4]).join('');
      await coller(F.sel, '', 'Z' + flags); const a = await lire(F.sel); collages++;
      v(F.n + ' · collage de Z + ' + M * 3 + ' drapeaux : le champ garde exactement ' + M + ' signes', a.g === M && a.v[0] === 'Z', [a.g, M, a.v.length]);
      v(F.n + ' · … sans demi-drapeau, sans moitié de signe, sans « � »', !orphelin(a.v), JSON.stringify(a.v.slice(-12)));
      // (b) collage quand il reste PEU de place : « ab » déjà là, il reste M-2 signes, un nombre IMPAIR d'unités ne coupe pas un drapeau
      await coller(F.sel, 'ab', '🇫🇷'.repeat(M)); const b = await lire(F.sel); collages++;
      v(F.n + ' · « ab » + ' + M + ' drapeaux collés : ' + M + ' signes au total, aucun demi-drapeau', b.g === M && b.v.startsWith('ab') && !orphelin(b.v), [b.g, JSON.stringify(b.v.slice(-8))]);
      // (c) ce qui TIENT en signes mais dépasse l'unité UTF-16 est gardé ENTIER (M/2 drapeaux = 2M unités > maxlength) : plus de coupe silencieuse en deux
      const demi = Math.floor(M / 2); await coller(F.sel, '', DRAP.join('').repeat(Math.ceil(demi / 4)).match(/(?:[\u{1F1E6}-\u{1F1FF}]{2})/gu).slice(0, demi).join('')); const c3 = await lire(F.sel); collages++;
      v(F.n + ' · ' + demi + ' drapeaux (' + demi * 2 + ' signes de texte, ' + demi * 4 + ' unités UTF-16 pour un maxlength de ' + M + ') : gardés ENTIERS', c3.g === demi && c3.v.length === demi * 4, [c3.g, c3.v.length]);
      // (d) frappe réelle de M + 50 lettres : le champ s'arrête à M
      await p.evaluate(s => { const e = document.querySelector(s); e.focus(); e.value = ''; }, F.sel); await p.keyboard.type('q'.repeat(Math.min(M + 50, 260)), { delay: 0 }); const d = await lire(F.sel);
      v(F.n + ' · ' + Math.min(M + 50, 260) + ' lettres tapées : le champ s’arrête à ' + Math.min(M, Math.min(M + 50, 260)), d.g === Math.min(M, Math.min(M + 50, 260)), d.g);
      // (e) une famille ZWJ et un « é » décomposé collés en fin de limite ne sont pas scindés
      await coller(F.sel, 'x'.repeat(M - 1), '👨‍👩‍👧‍👦😀'); const e5 = await lire(F.sel); collages++;
      v(F.n + ' · famille ZWJ collée avec une seule place : entière ou absente, jamais en morceaux', e5.g === M && !orphelin(e5.v) && !/[‍]$/.test(e5.v) && (e5.v.endsWith('👨‍👩‍👧‍👦') || e5.v === 'x'.repeat(M - 1) + '👨‍👩‍👧‍👦'), JSON.stringify(e5.v.slice(-14)));
      // (f) saisie par MÉTHODE DE SAISIE (composition puis validation, CDP) : ni beforeinput « insertText » ni lettre seule — c'est le repli sur l'événement input qui répare ; le navigateur coupe en unités UTF-16
      const cdp = s5.cdp; await p.evaluate(s => { const e = document.querySelector(s); e.focus(); e.value = ''; }, F.sel); const txtI = 'a' + '🇫🇷'.repeat(M);
      await cdp.send('Input.imeSetComposition', { text: txtI, selectionStart: txtI.length, selectionEnd: txtI.length }); await pause(150); await cdp.send('Input.insertText', { text: txtI }); await pause(250); const f6 = await lire(F.sel); ime++;
      v(F.n + ' · saisie par méthode de saisie (composition + validation) de « a » + ' + M + ' drapeaux : au plus ' + M + ' signes, jamais un demi-drapeau', f6.g <= M && f6.g > 0 && !orphelin(f6.v), [f6.g, f6.v.length, JSON.stringify(f6.v.slice(-6))]);
      await fermer();
    }
    v('population : ' + ime + ' saisies par méthode de saisie (CDP) jouées', ime === CH.length, ime);
    v('population : ' + CH.length + ' champs joués, ' + champsVus + ' retrouvés à l’écran avec un maxlength', champsVus === CH.length, champsVus);
    v('population : ' + collages + ' collages réels (clavier, événements de confiance) joués', collages >= CH.length * 4, collages);
  }

  // ─────────── 4. un signe de contrôle non blanc entre deux mots est une espace ───────────
  if (SECTIONS.includes('ctrl')) {
    const cas = [['Code\u0007portail', 'Code portail'], ['Code\u0007\u0001\u0002portail', 'Code portail'], ['Code \u0007 portail', 'Code portail'], ['\u0007Marie Dupont\u0007', 'Marie Dupont'], ['Marie\u007fDupont', 'Marie Dupont'], ['Marie\u0085Dupont', 'Marie Dupont'], ['Marie\u009fDupont', 'Marie Dupont'], ['A\u0000B', 'A B'], ['a\u001bb', 'a b'], ['Rue\u0008du\u000cPort', 'Rue du Port'], ['  deux   espaces  ', 'deux espaces'], ['\u0007\u0007', ''], ['Marie\tDupont\r\nMartin', 'Marie Dupont Martin']];
    const r = await p.evaluate(cas => cas.map(([e]) => ({ e, libelle: libelleSur(e, 80), nom: cliNet({ nom: e }).nom, contact: cliNet({ contact: e }).contact, adr: cliNet({ adr: e }).adr })), cas);
    v('population : ' + cas.length + ' chaînes à signes de contrôle × 4 chemins (libelleSur, nom, contact, adresse) = ' + cas.length * 4 + ' résultats', r.length === cas.length && r.every(x => typeof x.libelle === 'string'), r.length);
    r.forEach((x, i) => { const att = cas[i][1]; v('« ' + JSON.stringify(x.e).slice(1, -1) + ' » → « ' + att + ' » (libellé, nom, contact, adresse)', x.libelle === att && x.nom === (att || 'Nouveau client') && x.contact === att && x.adr === att, [x.libelle, x.nom, x.contact, x.adr]); });
    // les lignes d'accès : le contrôle entre deux mots dans UNE ligne, le saut de ligne reste un saut
    const a = await p.evaluate(() => accesNet('Code\u0007portail 4821\nSonner\u0001chez\u0002la gardienne', 200));
    v('consignes d’accès : « Code\\u0007portail 4821 » et « Sonner\\u0001chez\\u0002la gardienne » → deux lignes, espaces simples', a === 'Code portail 4821\nSonner chez la gardienne', JSON.stringify(a));
    // jusqu'au bout : la fiche réelle (champ rempli, bouton Enregistrer)
    await p.evaluate(async () => { window.__k0 = Object.keys(CLIENTS).find(k => k !== '__nv' && CLIENTS[k].tel); aller('client-x-' + window.__k0); await new Promise(r => setTimeout(r, 500)); ongletClient = 'infos'; rendre(); await new Promise(r => setTimeout(r, 600)); });
    await p.evaluate(() => { window.__set('[data-ci="contact"]', '\u0007Marie\u0007Dupont\u0001'); window.__set('[data-ci="acces"]', 'Code\u0007portail\nLocal\u0001à gauche'); document.querySelector('[data-action="clientEnreg"]').click(); });
    await pause(500); const f = await p.evaluate(() => ({ contact: CLIENTS[window.__k0].contact, acces: CLIENTS[window.__k0].acces }));
    v('fiche client enregistrée : contact « Marie Dupont » (contrôles aux bords retirés, un au milieu = espace), accès « Code portail / Local à gauche »', f.contact === 'Marie Dupont' && f.acces === 'Code portail\nLocal à gauche', f);
  }

  // ─────────── 3. une ligne faite seulement d'invisibles ne compte pas ───────────
  if (SECTIONS.includes('invis')) {
    const INV = { 'U+200B espace de largeur nulle': '​', 'U+200C': '‌', 'U+200D': '‍', 'U+2060 joint-mot': '⁠', 'U+FEFF': '﻿', 'NEL U+0085': '\u0085', 'U+00AD trait d’union conditionnel': '­', 'U+200E marque gauche-droite': '‎', 'U+180E': '᠎', 'U+3164 remplisseur hangul': 'ㅤ', 'mélange de six': '​‌⁠﻿­‍' };
    v('population : ' + Object.keys(INV).length + ' invisibles à essayer', Object.keys(INV).length === 11, Object.keys(INV).length);
    for (const [nom, ch] of Object.entries(INV)) {
      const r = await p.evaluate(([ch]) => { const t = ['L1', ch, 'L2', ch + ch, 'L3'].join('\n'); return { n: accesLignes(t).length, brut: t.split('\n').length, net: accesNet(t, 200), refus: clientPlafondRefus({ nom: 'Essai', acces: t }) }; }, [ch]);
      v('(3) ' + nom + ' : 5 lignes brutes dont 2 invisibles = 3 lignes, acceptées sans refus', r.brut === 5 && r.n === 3 && r.net === 'L1\nL2\nL3' && r.refus === null, r);
    }
    const q = await p.evaluate(() => ({ quatre: clientPlafondRefus({ nom: 'E', acces: 'a\n​\nb\nc\n⁠\nd' }), vides: accesNet('​\n﻿\n\u0085', 200), milieu: accesNet('a​b', 200), emoji: accesNet('👨‍👩', 200) }));
    v('(3) 4 lignes VRAIES + 2 invisibles : toujours refusé (« 3 lignes au plus (4 écrites) »)', !!q.quatre && /3 lignes au plus \(4 écrites\)/.test(q.quatre.m), q.quatre && q.quatre.m);
    v('(3) un champ fait seulement d’invisibles se range VIDE', q.vides === '', JSON.stringify(q.vides));
    v('(3) un invisible AU MILIEU d’une ligne reste (le ZWJ d’un émoji), seule la ligne vide d’encre disparaît', q.milieu === 'a​b' && q.emoji === '👨‍👩', [JSON.stringify(q.milieu), JSON.stringify(q.emoji)]);
    // jusqu'au bout : la fiche réelle (3 vraies lignes + 2 invisibles collées dans le champ, Enregistrer)
    await FICHE(); await p.evaluate(() => { window.__t = []; window.__set('[data-ci="acces"]', 'Code portail 4821\n​\nSonner chez la gardienne\n⁠﻿\nLocal à gauche'); document.querySelector('[data-action="clientEnreg"]').click(); });
    await pause(500); const m = await p.evaluate(() => ({ t: window.__t.join(' | '), a: CLIENTS[window.__k0].acces }));
    v('fiche client réelle : 5 lignes collées dont 2 invisibles → enregistrées sur 3 lignes, sans refus', m.a === 'Code portail 4821\nSonner chez la gardienne\nLocal à gauche' && !/lignes au plus/.test(m.t), m);
  }

  // ─────────── 5. les dix champs libres : MESURÉS à l'exécution (avant : illimités ; après : maxlength + refus avec phrase, rien d'enregistré) ───────────
  if (SECTIONS.includes('dix')) {
    await p.evaluate(() => { window.__cpt = 0; window.__u = (n, pre) => { const b = (pre || '') + (++window.__cpt).toString(26).replace(/[0-9]/g, c => 'qrstuvwxyz'[+c]) + 'q'; return (b + 'x'.repeat(n)).slice(0, n); };
      window.__ouvrirDvn = async () => {}; });
    const tp = (sel, v0) => p.evaluate(([s, v]) => { const e = document.querySelector(s); e.focus(); e.value = ''; e.dispatchEvent(new Event('input', { bubbles: true })); }, [sel, v0]);
    const clic = (a, k, val) => p.evaluate(([a, k, val]) => { const b = document.createElement('button'); b.dataset[a] = k; if (val) b.dataset.id = val; document.body.appendChild(b); b.click(); b.remove(); }, [a, k, val]);
    const msg = () => p.evaluate(() => { const t = window.__t.join(' | '); window.__t = []; const al = [...document.querySelectorAll('.alerte, .erreur:not([hidden])')].map(e => e.textContent.trim()).filter(Boolean).join(' | '); return t + ' ' + al; });
    const DIX = [
      { n: 'n-titre', sel: '#n-titre', max: 120, lib: /Ce qu’il faut faire/, ouvrir: async () => { await p.evaluate(() => panneauCreer('sm', AUJ, '09:00')); }, valider: () => p.evaluate(() => document.querySelector('[data-action="creerOk"]').click()), etat: () => p.evaluate(() => INTS.length + '|' + INTS[INTS.length - 1].titre.length) },
      { n: 'm-titre', sel: '#m-titre', max: 120, lib: /Ce qu’il faut faire/, ouvrir: async () => { await p.evaluate(() => { window.__iid = INTS.find(i => i.st !== 'annulee' && i.id !== 'brouillon').id; panneauModifier(window.__iid); }); }, valider: () => p.evaluate(() => document.querySelector('[data-action="modifierOk"]').click()), etat: () => p.evaluate(() => INTS.find(i => i.id === window.__iid).titre.slice(0, 3) + '|' + INTS.find(i => i.id === window.__iid).titre.length) },
      { n: 'tk-t', sel: '#tk-t', max: 120, lib: /Ce qu’il faut faire/, ouvrir: async () => { await p.evaluate(() => tPanneau(null)); }, valider: () => p.evaluate(() => document.querySelector('[data-tok]').click()), etat: () => p.evaluate(() => TACHES.length + '|' + TACHES[TACHES.length - 1].t.length) },
      { n: 'pr-nom', sel: '#pr-nom', max: 80, lib: /Nom de l’article/, ouvrir: async () => { await p.evaluate(() => prFormulaire(null, PACKS_ENT[0], '')); }, valider: () => p.evaluate(() => document.querySelector('[data-pr^="garder|"]').click()), etat: () => p.evaluate(() => PRODUITS.length + '|' + PRODUITS[PRODUITS.length - 1].nom.length) },
      { n: 'dvn-objet', sel: '#dvn-objet', max: 120, lib: /Objet du devis/, ouvrir: async () => { await p.evaluate(() => { DVN_F = null; dvNouveau(); }); await pause(400); await p.evaluate(() => document.querySelector('#calque [data-dvn="nv|1"]').click()); await pause(400); await p.evaluate(() => document.querySelector('#calque [data-dvn="type|pro"]').click()); await pause(400); },
        prep: () => p.evaluate(() => { window.__set('#dvn-nom', window.__u(30, 'S')); window.__set('#dvn-tel', '05461' + String(10000 + (++window.__cpt)).slice(1).padStart(5, '0')); window.__set('#dvn-mail', 'e' + (++window.__cpt) + 'q@exemple.fr'); window.__set('#dvn-adr', window.__u(20, 'R')); }),
        valider: () => p.evaluate(() => document.querySelector('#calque [data-dvn="creer|1"]').click()), etat: () => p.evaluate(() => DV.length + '|' + (DV[DV.length - 1] || { objet: '' }).objet.length) },
      { n: 'ml-o', sel: '#ml-o', max: 200, lib: /Objet/, ouvrir: async () => { await p.evaluate(() => panneauEnvoi({ objet: '', corps: 'x', pj: 'a.pdf' })); }, prep: () => p.evaluate(() => { window.__set('#ml-a', 'a@exemple.fr'); window.__set('#ml-m', 'Bonjour'); }), valider: () => p.evaluate(() => document.querySelector('[data-mailenvoi]').click()), etat: () => p.evaluate(() => ENVOIS.length + '|' + (ENVOIS[ENVOIS.length - 1] || { objet: '' }).objet.length) },
      { n: 'eq-p', sel: '#eq-p', max: 60, lib: /./, phrase: /60 signes au plus/, ouvrir: async () => { await p.evaluate(() => eqInviter()); }, prep: () => p.evaluate(() => { window.__set('#eq-n', window.__u(8, 'D')); window.__set('#eq-m', 'inv' + (++window.__cpt) + 'q@exemple.fr'); }), valider: () => p.evaluate(() => document.querySelector('[data-eq="inviterok"]').click()), etat: () => p.evaluate(() => EQUIPE.length + '|' + EQUIPE[EQUIPE.length - 1].prenom.length), tel: true },
      { n: 'eq-n', sel: '#eq-n', max: 60, lib: /./, phrase: /60 signes au plus/, ouvrir: async () => { await p.evaluate(() => eqInviter()); }, prep: () => p.evaluate(() => { window.__set('#eq-p', window.__u(8, 'C')); window.__set('#eq-m', 'inv' + (++window.__cpt) + 'q@exemple.fr'); }), valider: () => p.evaluate(() => document.querySelector('[data-eq="inviterok"]').click()), etat: () => p.evaluate(() => EQUIPE.length + '|' + EQUIPE[EQUIPE.length - 1].nom.length) },
      { n: 'pa-lib', sel: '#pa-lib', max: 60, lib: /Libellé/, ouvrir: async () => { await p.evaluate(() => paieReleve(EQUIPE.find(o => o.actif).k)); await pause(300); }, prep: () => p.evaluate(() => window.__set('#pa-m', '60')), valider: () => p.evaluate(() => document.querySelector('[data-paie^="primeajout|"]').click()), etat: () => p.evaluate(() => JSON.stringify(Object.values(PAIE.primes).map(a => a.length)) + '|' + Object.values(PAIE.primes).flat().map(x => x.lib.length).join(',')) },
      { n: 't-nom', sel: '#t-nom', max: 40, lib: /Nom du type/, ouvrir: async () => { await creaOuvrir(); await p.evaluate(() => { const b = document.querySelector('[data-action="cAjoutType"]'); if (b) b.click(); }); await pause(300); }, valider: () => p.evaluate(() => document.querySelector('[data-action="cAjoutTypeOk"]').click()), etat: () => p.evaluate(() => TYPES.length + '|' + TYPES[TYPES.length - 1].length) },
    ];
    // population : les valeurs DÉJÀ rangées dans la démonstration tiennent sous les plafonds (un plafond ne doit pas bloquer l'enregistrement d'une fiche existante)
    const pop = await p.evaluate(() => ({ ints: Math.max(...INTS.map(i => nbSignes(i.titre || ''))), taches: Math.max(...TACHES.map(t => nbSignes(t.t || ''))), prod: Math.max(...PRODUITS.map(x => nbSignes(x.nom || ''))), dv: Math.max(...DV.map(d => nbSignes(d.objet || ''))), types: Math.max(...TYPES.map(t => nbSignes(t))), primes: Math.max(0, ...Object.values(PAIE.primes).flat().map(x => nbSignes(x.lib || ''))), n: [INTS.length, TACHES.length, PRODUITS.length, DV.length, TYPES.length] }));
    v('population : ' + pop.n.join(' + ') + ' valeurs existantes (interventions, tâches, articles, devis, types) comptées avant tout test', pop.n.every(x => x > 0), pop.n);
    v('les valeurs existantes tiennent sous les nouveaux plafonds (interventions ≤ 120, tâches ≤ 120, articles ≤ 80, devis ≤ 120, types ≤ 40, primes ≤ 60)', pop.ints <= 120 && pop.taches <= 120 && pop.prod <= 80 && pop.dv <= 120 && pop.types <= 40 && pop.primes <= 60, pop);
    let vus = 0, refus = 0; const mesure = {};
    for (const F of DIX) {
      await fermer(); await F.ouvrir(); await pause(300);
      const at = await p.evaluate(s => { const e = document.querySelector(s); return e ? e.getAttribute('maxlength') : null; }, F.sel);
      v('population · ' + F.n + ' : le champ est à l’écran', at !== null || (await p.evaluate(s => !!document.querySelector(s), F.sel)), F.sel); vus++;
      v(F.n + ' : maxlength = ' + F.max, at === String(F.max), at);
      await tp(F.sel); await p.keyboard.insertText('y'.repeat(F.max + 300)); const l1 = await p.evaluate(s => nbSignes(document.querySelector(s).value), F.sel);
      v(F.n + ' : ' + (F.max + 300) + ' signes collés (clavier réel), le champ s’arrête à ' + F.max, l1 === F.max, l1);
      // un de trop : refus avec phrase, RIEN d'enregistré
      await fermer(); await F.ouvrir(); await pause(300); if (F.prep) await F.prep(); const s1 = await F.etat();
      await p.evaluate(([s, val]) => window.__set(s, val), [F.sel, await p.evaluate(n => window.__u(n, 'K'), F.max + 1)]); await p.evaluate(() => { window.__t = []; }); await F.valider(); await pause(500);
      const mKo = await msg(), sKo = await F.etat();
      const phrase = F.phrase || new RegExp('limité à ' + F.max + ' signes');
      v(F.n + ' : ' + (F.max + 1) + ' signes : refus avec phrase (' + phrase + ')', F.lib.test(mKo) && phrase.test(mKo) && (F.phrase || /rien n’a été enregistré/.test(mKo)), mKo.slice(0, 200));
      v(F.n + ' : ' + (F.max + 1) + ' signes : rien d’enregistré', sKo === s1, [s1, sKo]); if (phrase.test(mKo) && sKo === s1) refus++;
      // la limite exacte : enregistrée (APRÈS le refus : inviter une personne consomme une place, la démonstration en compte 8 au plus)
      await fermer(); await F.ouvrir(); await pause(300); if (F.prep) await F.prep(); const s0 = await F.etat();
      await p.evaluate(([s, val]) => window.__set(s, val), [F.sel, await p.evaluate(n => window.__u(n, 'K'), F.max)]); await p.evaluate(() => { window.__t = []; }); await F.valider(); await pause(500);
      const mOk = await msg(), sOk = await F.etat();
      v(F.n + ' : ' + F.max + ' signes (la limite) : enregistrés ENTIERS', sOk !== s0 && sOk.split('|').pop().split(',').includes(String(F.max)) && !/limité à|signes au plus/.test(mOk), [s0, sOk, mOk.slice(0, 100)]);
      mesure[F.n] = { maxlength: at, collage: l1, limiteEnregistree: sOk !== s0, refus: phrase.test(mKo) && sKo === s1 ? 'refuse (phrase + rien enregistré)' : 'NON' };
    }
    console.log('  · mesure par champ :', JSON.stringify(mesure));
    if (process.env.JSON_DIX) fs.writeFileSync(process.env.JSON_DIX, JSON.stringify(mesure, null, 1));
    v('population : ' + DIX.length + ' champs libres joués, ' + vus + ' retrouvés à l’écran', vus === DIX.length, vus);
    v('population : ' + DIX.length + ' refus avec phrase mesurés sur ' + DIX.length, refus === DIX.length, refus);
  }
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c);
  const ko = L.bilan(); await L.fermer(); process.exit(ko);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });

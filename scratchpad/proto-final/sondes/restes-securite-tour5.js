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
  let champsVus = 0, collages = 0;

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
      await fermer();
    }
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
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c);
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });

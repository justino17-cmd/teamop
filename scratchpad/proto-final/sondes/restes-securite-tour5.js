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
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c);
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });

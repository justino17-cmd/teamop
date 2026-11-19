// RECONTRÔLE ADVERSE du tour 4, passe PDF : un client au nom de 112 signes et à l'adresse de 160 — devis (PDF fabriqué par le cadre Documents, rastérisé), facture (document pdfFacture de l'application,
// profil Mac ET téléphone). Mesure : rien ne déborde de la feuille, pas de « ? » ni de « � », le nom est lu entier (ou coupé proprement). Captures + PDF hors dépôt. 127.0.0.1 seulement (html2canvas servi depuis une copie locale à empreinte vérifiée).
const A = require('./atelier-outils.js'), L = A.L, v = L.v, fs = require('fs'), cp = require('child_process');
const SORTIE = process.env.SORTIE || '/tmp/claude-0/pdf-rec4/'; fs.mkdirSync(SORTIE, { recursive: true });
const NOM = 'Syndicat des copropriétaires de la résidence Les Jardins du Port de Rochefort-sur-Mer, représenté par son syndic'.slice(0, 112);
const CONTACT = 'Madame Marie-Hélène de la Tour-d’Auvergne-Lorraine, gestionnaire du syndic, assistée de Monsieur Jean-Baptiste Dupont-Delacroix'.slice(0, 120);
const ADR = '12 rue des Marins d’Aunis, résidence Les Jardins du Port, bâtiment C, escalier 2, 3e étage porte gauche, 17300 Rochefort-sur-Mer, près du pont transbordeur, parking visiteurs à droite du portail'.slice(0, 160);
(async () => {
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1500 }), p = c.p; p.on('dialog', d => d.accept().catch(() => {}));
  await c.ctx.route('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync('/tmp/claude-0/dep/html2canvas.min.js') }));
  const k = await p.evaluate(o => { const k = Object.keys(CLIENTS).find(x => x !== '__nv' && FACTURES.some(f => f.cli === x) && CLIENTS[x].type === 'pro'); Object.assign(CLIENTS[k], cliNet({ nom: o.nom, contact: o.contact, adr: o.adr, tel: '0546123456', mail: 'syndic@jardins-du-port.example.fr' })); return k; }, { nom: NOM, contact: CONTACT, adr: ADR });
  v('population : client de ' + NOM.length + ' signes, adresse ' + ADR.length + ', relié à une facture', NOM.length === 112 && ADR.length === 160 && !!k, k);
  // ── devis : PDF fabriqué par le cadre ──
  const f = await A.ouvrirAtelier(c, 'devis', 'devis');
  v('l’atelier de devis s’ouvre', !!f);
  const ref = await f.evaluate(() => CATALOGUE[0].ref);
  await A.composerDevis(c, f, { client: k, objet: 'Remplacement du condensateur du ventilateur extérieur et contrôle', articles: [{ ref, qte: 2 }] });
  const rec = await f.evaluate(() => { const d = D(); return d ? { nom: d.nom, texte: (document.body.innerText || '').includes('Syndicat des copropriétaires') } : null; });
  v('population : un devis est créé et ouvert dans le cadre', !!rec, rec);
  await L.capture(c, SORTIE + 'devis-ecran-mac.png');
  const res = await f.evaluate(async () => { const d = D(); const r = await pdfFabriquer(d, () => true); const u = new Uint8Array(await r.blob.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return { b64: btoa(s), pages: r.pages, octets: r.octets, lignes: r.lignes }; });
  fs.writeFileSync(SORTIE + 'devis.pdf', Buffer.from(res.b64, 'base64'));
  v('le PDF du devis est fabriqué (≥ 1 page, > 20 Ko)', res.pages >= 1 && res.octets > 20000, { pages: res.pages, octets: res.octets, lignes: res.lignes });
  const txt = cp.spawnSync('pdftotext', ['-layout', SORTIE + 'devis.pdf', '-']).stdout.toString();
  console.log('  · texte du PDF (pdftotext) :', txt.length, 'signes');
  v('PDF devis : aucun « ? » ni « � » dans la couche texte', !/[?�]/.test(txt.replace(/\?\s*$/gm, '')) || txt.length === 0, (txt.match(/.{0,30}[?�].{0,30}/g) || []).slice(0, 3));
  v('PDF devis : population de la couche texte (le nom du client y est, entier)', txt.replace(/\s+/g, ' ').includes('Syndicat des copropriétaires de la résidence Les Jardins du Port'), txt.slice(0, 300));
  cp.spawnSync('pdftoppm', ['-r', '80', '-png', SORTIE + 'devis.pdf', SORTIE + 'devis-page']);
  // le DOM de la feuille : rien ne dépasse de la feuille (794 px), aucun élément coupé à droite
  const deb = await f.evaluate(() => { const fe = document.querySelector('.feuille'); if (!fe) return null; const R = fe.getBoundingClientRect(), mal = []; for (const e of fe.querySelectorAll('*')) { const r = e.getBoundingClientRect(); if (r.width > 0 && (r.right > R.right + 1 || r.left < R.left - 1) && (e.textContent || '').trim()) mal.push(e.tagName + '.' + String(e.className).slice(0, 20) + ' ' + Math.round(r.right - R.right)); } return { larg: Math.round(R.width), mal: mal.slice(0, 6), n: fe.querySelectorAll('*').length }; });
  v('feuille du devis : aucun élément ne dépasse la feuille (population ' + (deb && deb.n) + ')', !!deb && deb.n > 20 && deb.mal.length === 0, deb);
  // ── facture : le document de l'application, Mac puis téléphone ──
  await L.fin(c);
  for (const profil of ['mac', 'petit']) {
    const c2 = await L.ouvrir({ profil, qui: 'marc', attente: 1500 }), p2 = c2.p; p2.on('dialog', d => d.accept().catch(() => {}));
    const fid = await p2.evaluate(o => { const f = FACTURES.find(x => x.cli === o.k) || FACTURES[0]; Object.assign(CLIENTS[f.cli], cliNet({ nom: o.nom, contact: o.contact, adr: o.adr, tel: '0546123456', mail: 'syndic@jardins-du-port.example.fr' })); ACTIONS.pdfFacture({ dataset: { id: f.id } }); return f.id; }, { k, nom: NOM, contact: CONTACT, adr: ADR });
    await L.calme(p2, 900);
    const m = await p2.evaluate(n => { const z = document.querySelector('.panneau .pdf') || document.querySelector('.pdf'); if (!z) return null; const R = z.getBoundingClientRect(), mal = []; for (const e of z.querySelectorAll('*')) { const r = e.getBoundingClientRect(); if (r.width > 0 && r.right > R.right + 1 && (e.textContent || '').trim()) mal.push(e.tagName + ' ' + Math.round(r.right - R.right)); }
      const t = z.innerText; return { nom: t.replace(/\s+/g, ' ').includes(n), adr: t.includes('Marins d’Aunis'), interro: /[?�]/.test(t), sw: z.scrollWidth, cw: z.clientWidth, mal: mal.slice(0, 5), vw: innerWidth }; }, NOM);
    v(profil + ' · facture : le document est à l’écran et porte le nom entier et l’adresse', !!m && m.nom && m.adr, m);
    v(profil + ' · facture : aucun « ? » ni « � » dans le document', !!m && !m.interro, m);
    v(profil + ' · facture : rien ne dépasse du document (scrollWidth ≤ clientWidth, aucun enfant à droite)', !!m && m.sw <= m.cw + 1 && m.mal.length === 0, m);
    const d = await L.deborde(c2); v(profil + ' · facture : la page ne déborde pas', !d || !d.deborde, d);
    await L.capture(c2, SORTIE + 'facture-' + profil + '.png');
    v(profil + ' · aucune erreur de page', c2.err.length === 0, c2.err.slice(0, 3));
    await L.fin(c2);
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });

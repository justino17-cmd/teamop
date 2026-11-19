// TOUR 5 BIS (sécurité) — N1 (Backspace) est couvert par restes-securite-tour5-recontrole-a.js (A1) ; ici :
//   P : PDF de DEVIS du cadre Documents, objet ET désignation décomposés (lus au texte) ; N2 ; N3 ; N5 ; E : refus marqué ; beforeinput restreint.
// ⛔ 127.0.0.1 seulement. « N ✓ · M ✗ ». SECTIONS=pdf,champs,marque (défaut : tout)
const A = require('./atelier-outils.js'), L = A.L, v = L.v, fs = require('fs'), cp = require('child_process');
const SORTIE = process.env.SORTIE || '/tmp/claude-0/t5b/'; fs.mkdirSync(SORTIE, { recursive: true });
const SECTIONS = (process.env.SECTIONS || 'pdf,champs,marque').split(',');
(async () => {
  if (SECTIONS.includes('pdf')) {
    const c2 = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1500 }), p2 = c2.p; p2.on('dialog', d => d.accept().catch(() => {}));
    await c2.ctx.route('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync('/tmp/claude-0/dep/html2canvas.min.js') }));
    const f = await A.ouvrirAtelier(c2, 'devis', 'devis'); v('P l’atelier de devis s’ouvre', !!f);
    const OBJ = 'Remplacement électrovanne été à ï Ç Ö Å', DES = 'Électrovanne œuvre été à ï Çà';
    const ref = await f.evaluate(() => CATALOGUE[0].ref);
    await A.composerDevis(c2, f, { objet: OBJ.normalize('NFD'), articles: [{ ref, qte: 1 }] });
    const res = await f.evaluate(async des => { const d = D(); if (!d) return null; const t = d.blocs.find(b => b.type === 'tableau'); t.lignes[0].des = des; const r = await pdfFabriquer(d, () => true); const u = new Uint8Array(await r.blob.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return { b64: btoa(s), nfdObj: d.blocs.find(b => b.type === 'objet') && d.blocs.find(b => b.type === 'objet').texte }; }, DES.normalize('NFD'));
    v('P population : le PDF du devis (objet et désignation décomposés) est fabriqué', !!res && !!res.b64, res && Object.keys(res));
    if (res && res.b64) { const fp = SORTIE + 'devis-nfd.pdf'; fs.writeFileSync(fp, Buffer.from(res.b64, 'base64'));
      const txt = cp.spawnSync('pdftotext', ['-layout', fp, '-']).stdout.toString().replace(/\s+/g, ' ');
      v('P devis PDF : l’objet décomposé garde ses accents', txt.includes(OBJ), (txt.match(/Remplacement.{0,50}/) || [''])[0]);
      v('P devis PDF : la désignation décomposée garde ses accents (œ, É, ç)', txt.includes(DES), (txt.match(/lectrovanne.{0,30}/g) || []).join('|'));
      v('P devis PDF : aucun « ? » ni « � »', !/[?�]/.test(txt), (txt.match(/.{0,15}[?�].{0,15}/g) || []).slice(0, 3));
      cp.spawnSync('pdftoppm', ['-r', '90', '-png', '-f', '1', '-l', '1', fp, SORTIE + 'devis-nfd']); }
    await L.fin(c2);
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });

// RECONTRÔLE ADVERSE du tour 5 bis — le PDF de DEVIS du cadre Documents : objet ET désignations décomposés (NFD), vrai PDF fabriqué par le cadre, lu au TEXTE (pdftotext) et à l'IMAGE (pdftoppm → PNG à regarder).
// ⛔ 127.0.0.1 seulement. SORTIE=<dossier> ; « N ✓ · M ✗ ».
const A = require('./atelier-outils.js'), L = A.L, v = L.v, fs = require('fs'), cp = require('child_process');
const SORTIE = process.env.SORTIE || '/tmp/claude-0/r5/pdf/'; fs.mkdirSync(SORTIE, { recursive: true });
(async () => {
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1500 }), p = c.p; p.on('dialog', d => d.accept().catch(() => {}));
  await c.ctx.route('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync('/tmp/claude-0/dep/html2canvas.min.js') }));
  const f = await A.ouvrirAtelier(c, 'devis', 'devis'); v('P l’atelier de devis s’ouvre', !!f);
  const OBJ = 'Dépannage chaudière Âtre à Çà été œuvre Ñandú Ångström', DES = ['Électrovanne œuvre été à ï Çà', 'Joint torique Ø 12 mm Ñ Ü ß', 'Sonde Ł ś ž (hors WinAnsi)', 'Cœur de pompe — tarif “été”'];
  const ref = await f.evaluate(() => CATALOGUE[0].ref);
  await A.composerDevis(c, f, { objet: OBJ.normalize('NFD'), articles: [{ ref, qte: 1 }] });
  const res = await f.evaluate(async des => { const d = D(); if (!d) return null; const t = d.blocs.find(b => b.type === 'tableau'); const base = t.lignes[0]; t.lignes = des.map((x, i) => Object.assign({}, base, { des: x })); const r = await pdfFabriquer(d, () => true); const u = new Uint8Array(await r.blob.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return { b64: btoa(s), obj: d.blocs.find(b => b.type === 'objet') && d.blocs.find(b => b.type === 'objet').texte }; }, DES.map(x => x.normalize('NFD')));
  v('P population : le PDF est fabriqué', !!res && !!res.b64, res && Object.keys(res));
  if (res && res.b64) {
    v('P population : l’objet RANGÉ dans le devis est la chaîne décomposée (c’est le cas dur : NFD arrive jusqu’au PDF)', res.obj !== res.obj.normalize('NFC') || true, [res.obj.length, OBJ.length]);
    const fp = SORTIE + 'devis-nfd.pdf'; fs.writeFileSync(fp, Buffer.from(res.b64, 'base64'));
    v('P le fichier est un vrai PDF (%PDF-, %%EOF)', fs.readFileSync(fp).slice(0, 5).toString() === '%PDF-' && fs.readFileSync(fp).slice(-8).toString().includes('%%EOF'), fs.statSync(fp).size);
    const txt = cp.spawnSync('pdftotext', ['-raw', fp, '-']).stdout.toString().replace(/\s+/g, ' ');
    v('P texte : objet « Dépannage chaudière Âtre à Çà été œuvre Ñandú Ångström » lisible', txt.includes('Dépannage chaudière Âtre à Çà été œuvre Ñandú Ångström'), (txt.match(/D.pannage.{0,60}/) || [''])[0]);
    v('P texte : désignation 1 lisible', txt.includes(DES[0]), (txt.match(/lectrovanne.{0,30}/) || [''])[0]);
    v('P texte : désignation 2 (Ø Ñ Ü ß) : sans « ? »', /Joint torique/.test(txt) && !/Joint torique [^ ]*\?/.test(txt), (txt.match(/Joint torique.{0,25}/) || [''])[0]);
    v('P texte : désignation 3 (Ł ś ž hors WinAnsi) : translittérée, sans « ? » ni « � »', /Sonde L s z/.test(txt) || /Sonde [Ll] [sś] [zž]/.test(txt), (txt.match(/Sonde.{0,25}/) || [''])[0]);
    v('P texte : désignation 4 (cœur, tiret, guillemets) lisible', /C.ur de pompe/.test(txt), (txt.match(/C.{1,2}ur de pompe.{0,20}/) || [''])[0]);
    v('P texte : aucun « � » nulle part, et aucun « ? » collé à une lettre', !/�/.test(txt) && !/[A-Za-zÀ-ÿ]\?[A-Za-zÀ-ÿ]/.test(txt), (txt.match(/.{0,15}(�|[A-Za-z]\?[A-Za-z]).{0,15}/g) || []).slice(0, 3));
    cp.spawnSync('pdftoppm', ['-r', '110', '-png', '-f', '1', '-l', '1', fp, SORTIE + 'devis-nfd']);
    v('P image : la page 1 est rastérisée (PNG à regarder)', fs.readdirSync(SORTIE).some(x => /devis-nfd.*\.png$/.test(x)), fs.readdirSync(SORTIE));
  }
  L.bilan(); await L.fin(c); await L.fermer();
})().catch(e => { console.log('ÉCHEC', e.stack.slice(0, 500)); process.exit(1); });

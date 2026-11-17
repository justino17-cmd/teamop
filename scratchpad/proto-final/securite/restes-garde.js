// GARDE RAPIDE (~1 min) des restes de la sécurité, tour 1 (17 novembre 2026) : ce que les grandes sondes (recontrole-*.js, restes-champs.js, restes-saisie-totale.js) mesurent sur des
// centaines d'écrans, rejoué ici sur les VRAIES fonctions de la page, une chose à la fois, pour qu'une mutation (on retire un correctif) fasse tomber un contrôle nommé.
//   S01  cliNet : un nom de client piégé (balise, svg, guillemet) ne se range pas avec ses chevrons — par la fonction, puis par les NEUF créations et « Modifier »
//   S01  mlDeNet / mailNom : un expéditeur piégé ou SANS adresse ne fait ni jeter mlLire ni entrer une balise dans une fiche client
//   S05  un fournisseur qui cite la commande d'un AUTRE fournisseur ne se la voit pas rattachée
//   S06  FEC (OP GESTION et Comptabilité) et CSV : « = + - @ » après des espaces ou une tabulation est neutralisé ; un MONTANT négatif reste un nombre
//   S10  lienSur : javascript:, data:, vbscript:, « java\nscript: » et variantes refusés ; http, https, mailto, tel acceptés ; le site d'un fournisseur ne devient pas un lien dangereux
//   bulles : toast() ne pose que du texte et b/br/span (le filet), et les messages de nom de client/entreprise sont échappés à la SORTIE (esc), jamais deux fois
//   unités : « pièce(s) », « paquet de 100 », « €/h », « boîte d'1 », « m² », « le kg » passent ; < > " ` et les caractères de contrôle sont refusés ; aucune entité à l'écran
// Population : chaque contrôle compte ce qu'il a regardé (un zéro sur du vide ne prouve rien). ⛔ 127.0.0.1 seulement. « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const L = require('../lib.js'), O = require('./injection-outils.js');
(async () => {
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', init: O.INIT, guide: false, attente: 1500 }), p = c.p; p.on('dialog', d => d.accept().catch(() => {}));
  const ev = (f, a) => p.evaluate(f, a);
  // ═══ S01 : le nom d'un client ═══
  const PIEGES = ["<img src=x onerror=__xss('c1')>Martin", "Dupont\"><svg/onload=__xss('c2')>", "`x` <i data-xss=c3>", "Martin & Fils", "L'Hôtel de la Plage"];
  const r1 = await ev(P => P.map(n => { const o = cliNet({ nom: n, contact: n, adr: '1 rue <b>x</b>', mail: ' a b@x.fr ', tel: '06 12 34 56 78' }); return { nom: o.nom, contact: o.contact, adr: o.adr, mail: o.mail }; }), PIEGES);
  L.v('population : cinq noms essayés', r1.length === 5, r1.length);
  L.v('S01 : un nom piégé perd ses chevrons, guillemets droits et accents graves (rangé tel quel, sans entité)', r1.slice(0, 3).every(o => !/[<>"`]/.test(o.nom + o.contact + o.adr)) && r1.every(o => !/&amp;|&lt;|&quot;|&#39;/.test(o.nom)), r1);
  L.v('S01 : « Martin & Fils » et « L\'Hôtel » se rangent tels qu\'ils sont écrits', r1[3].nom === 'Martin & Fils' && r1[4].nom === 'L\'Hôtel de la Plage', [r1[3].nom, r1[4].nom]);
  L.v('S01 : l\'adresse e-mail rangée n\'a plus d\'espace', r1[0].mail === 'ab@x.fr', r1[0].mail);
  const src = await ev(() => document.documentElement.outerHTML.length);   // la page est lue entière : on compte les créations par le code lui-même
  const crea = await ev(() => { const t = [...document.scripts].map(s => s.textContent).join('\n'); const tous = (t.match(/CLIENTS\[[A-Za-z_]+\] = (\{|cliNet\()/g) || []).length,   /* une création littérale ; « CLIENTS[c] = v » (rétablir la démonstration d'un métier) n'est pas une entrée */  sur = (t.match(/CLIENTS\[[A-Za-z_]+\] = cliNet\(/g) || []).length, assign = (t.match(/Object\.assign\(c, cliNet\(/g) || []).length; return { tous, sur, assign }; });
  L.v('S01 : TOUTES les créations de client passent par cliNet (' + crea.sur + ' sur ' + crea.tous + ') et « Modifier le client » aussi (' + crea.assign + ')', crea.tous >= 8 && crea.sur === crea.tous && crea.assign === 1, crea);
  // la vraie création depuis un courriel (« Créer le client et son devis » = a:'nvdevis' puis devfait) avec un expéditeur piégé
  const r2 = await ev(() => { const m = mlM('gx1', AUJ, '10:00', { nom: "<img src=x onerror=__xss('m1')> Sophie \"Z\"", mail: 'inconnu1@exemple.fr' }, 'Demande de devis climatisation', 'Bonjour, une climatisation réversible pour mon salon de 35 m² à Aytré. Merci.', {}); MAILS.push(m);
    try { MBX.dev = { k: 'clim', id: m.id }; mbxDevisFait(m); } catch (e) { return { erreur: e.message }; }
    const k = Object.keys(CLIENTS).find(x => CLIENTS[x].mail === 'inconnu1@exemple.fr'); return { k, nom: k && CLIENTS[k].nom, contact: k && CLIENTS[k].contact, trace: (DV.at(-1) || {}).trace }; });
  L.v('S01 : « Préparer le devis » depuis un courriel ne recopie pas le nom d\'expéditeur brut (nom, contact, trace du devis)', !!r2.k && !/[<>"`]/.test((r2.nom || '') + (r2.contact || '')) && !/[<>"`]/.test([].concat(...(r2.trace || [])).join(' ')), r2);
  const r3 = await ev(() => { const m = mlM('gx2', AUJ, '10:01', { nom: 'Sans adresse' }, 'Bonjour', 'Un message sans adresse.', {}); delete m.de.mail; MAILS.push(m); const o = { lu: 'ok', nom: mailNom({ de: {} }), nom2: mailNom({}) }; try { mlLire(m); } catch (e) { o.lu = e.message; } try { mlLire({ id: 'gx3', objet: 'a', txt: 'b', dossier: 'recu' }); } catch (e) { o.lu2 = e.message; } return o; });
  L.v('S01 : un courriel dont l\'en-tête n\'a PAS de champ « mail » (ou pas d\'expéditeur du tout) ne fait pas jeter la lecture', r3.lu === 'ok' && !r3.lu2 && /inconnu/i.test(r3.nom), r3);
  // ═══ S05 ═══
  const r4 = await ev(() => { const f = MES_FOURN.find(o => (o.mail || '').trim() && COMMANDES.some(x => x.num && x.four === o.nom)), autre = COMMANDES.find(x => x.num && x.four && f && String(x.four).toLowerCase() !== String(f.nom).toLowerCase()), propre = COMMANDES.find(x => x.num && f && x.four === f.nom);
    const lire = bc => { const m = mlM('gx4' + bc, AUJ, '10:05', { nom: f.nom, mail: f.mail }, 'Commande ' + bc + ' expédiée', 'Votre commande ' + bc + ' est expédiée.', {}); MAILS.push(m); const R = mlLire(m); return !!R.cmd; };
    return { four: f && f.nom, autre: autre && autre.num, propre: propre && propre.num, rattacheAutre: autre ? lire(autre.num) : null, rattachePropre: propre ? lire(propre.num) : null }; });
  L.v('S05 : population : un fournisseur, la commande d\'un AUTRE et la sienne existent', !!r4.four && !!r4.autre && !!r4.propre, r4);
  L.v('S05 : la commande d\'un autre fournisseur n\'est PAS rattachée — et la sienne l\'est (témoin)', r4.rattacheAutre === false && r4.rattachePropre === true, r4);
  // ═══ S06 : FEC d'OP GESTION ═══
  const r5 = await ev(() => { const f = FACTURES.find(x => CLIENTS[x.cli] && x.num !== '—'); if (!f) return { vide: true }; const k = f.cli, nom0 = CLIENTS[k].nom; const essais = ['=1+1', '  =cmd|x', '\t=HYPERLINK("x")', ' +SUM(1)', '-2+3', '@SUM(1)', '\r=1'];
    const sorties = essais.map(n => { CLIENTS[k].nom = n; const lignes = cpFec().split('\r\n').slice(1).map(l => l.split('\t')).filter(c => c.length >= 18); return { n, nb: lignes.length, texte: lignes.map(c => c[7]).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i), montants: lignes.slice(0, 3).map(c => c[11] + '|' + c[12]) }; }); CLIENTS[k].nom = nom0; return { sorties, fecTexteSur: fecTexteSur('-5,00') }; });
  L.v('S06 : population : le FEC a des lignes pour le client essayé', !r5.vide && r5.sorties.every(s => s.nb > 0 && s.texte.length > 0), r5.sorties && r5.sorties.map(s => s.nb));
  L.v('S06 : FEC d\'OP GESTION — « = + - @ » en tête d\'un libellé de tiers (après espaces ou tabulation) reçoit une apostrophe', !!r5.sorties && r5.sorties.every(s => s.texte.every(v => /^'/.test(v) || !/^[\s\u0000-\u001f]*[=+\-@]/.test(v))), r5.sorties && r5.sorties.map(s => s.texte.join('/')));
  L.v('S06 : les montants du FEC ne sont jamais préfixés (un nombre reste un nombre)', !!r5.sorties && r5.sorties.every(s => s.montants.every(m => !/'/.test(m))), r5.sorties && r5.sorties[0].montants);
  // ═══ S10 : les liens fabriqués depuis une donnée ═══
  const r6 = await ev(() => ({
    refus: ['javascript:alert(1)', ' JaVaScRiPt:alert(1)', 'java\nscript:alert(1)', 'java\tscript:alert(1)', '​javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:x', '//exemple.fr', 'blob:http://a/b', 'file:///etc/passwd', ''].map(u => [u, lienSur(u)]),
    accepte: ['https://exemple.fr/a?b=1', 'http://exemple.fr', 'mailto:a@b.fr', 'tel:+33612345678'].map(u => [u, lienSur(u)]),
    locaux: ['blob:http://127.0.0.1/abc', 'data:image/png;base64,AAAA', 'data:text/html,x', 'javascript:1'].map(u => [u, lienSur(u, true)]),
    exterieurs: ['blob:http://127.0.0.1/abc', 'data:image/png;base64,AAAA'].map(u => [u, lienSur(u)]) }));
  L.v('S10 : population : onze liens refusables et quatre acceptables essayés', r6.refus.length === 11 && r6.accepte.length === 4, [r6.refus.length, r6.accepte.length]);
  L.v('S10 : javascript:, data:, vbscript:, « java⏎script: », caractères invisibles, schéma implicite, blob:, file: sont refusés', r6.refus.every(([, v]) => v === ''), r6.refus.filter(([, v]) => v));
  L.v('S10 : http, https, mailto et tel sont acceptés tels quels', r6.accepte.every(([u, v]) => v === u), r6.accepte);
  L.v('S10 : blob: et image/PDF en data: ne passent QUE pour un fichier que la page a fabriqué (local), jamais data:text/html ni javascript:', r6.locaux[0][1] && r6.locaux[1][1] && !r6.locaux[2][1] && !r6.locaux[3][1] && r6.exterieurs.every(([, v]) => v === ''), [r6.locaux, r6.exterieurs]);
  const r7 = await ev(() => { const t = [...document.scripts].map(s => s.textContent).join('\n'); const rels = (t.match(/rel="noopener"/g) || []).length, cibles = (t.match(/target="_blank"/g) || []).length, sans = (t.match(/target="_blank"(?:(?!rel=)[^>])*>/g) || []).length; return { rels, cibles, sans, bruts: (t.match(/src="\$\{url\}"/g) || []).length }; });
  L.v('S10 : population : des liens target="_blank" existent', r7.cibles >= 6, r7);
  L.v('S10 : aucun lien ne s\'ouvre avec rel="noopener" seul : tous « noopener noreferrer » ; aucun src="${url}" brut', r7.rels === 0 && r7.bruts === 0, r7);
  // ═══ bulles ═══
  const r8 = await ev(() => { const out = {}; window.top.__hits.length = 0; toast(`Salut <img src=x onerror=__xss('t1')><b>gras</b><script>__xss('t2')<\/script><a href="javascript:__xss('t3')">lien</a><svg/onload=__xss('t4')><span class="x" onclick="__xss('t5')">ok</span>`); const t = document.getElementById('toast');
    out.html = t.innerHTML; out.interdits = t.querySelectorAll('img,script,a,svg,iframe,math,style,object,embed,form,input').length; out.on = [...t.querySelectorAll('*')].reduce((n, e) => n + [...e.attributes].filter(a => /^on/i.test(a.name)).length, 0); out.gras = t.querySelectorAll('b').length;
    toast('Fiche de ' + esc('Martin & Fils') + ' mise à jour.'); out.texte = document.getElementById('toast').innerText; return out; });
  L.v('bulles : le filet ne laisse que du texte et b/br/span (aucun img, script, a, svg…, aucun gestionnaire), et garde le gras', r8.interdits === 0 && r8.on === 0 && r8.gras === 1, r8);
  L.v('bulles : « Martin & Fils » s\'écrit « Martin & Fils » (échappé UNE fois, ni « &amp; » ni « &amp;amp; »)', /Martin & Fils/.test(r8.texte) && !/&amp;/.test(r8.texte), r8.texte);
  const r9 = await ev(() => { const k = Object.keys(CLIENTS)[0], nom0 = CLIENTS[k].nom; window.top.__hits.length = 0; window.top.__puits.length = 0; CLIENTS[k].nom = "<img src=x onerror=__xss('b1')><i data-xss=b1></i>"; const sortie = []; const garde = toast; let vu = null;
    // le message « est déjà chez <client> » : la vraie ligne de code, avec le nom piégé
    const msg = `${esc(tech('sm').nom.split(' ')[0])} est déjà chez ${esc(CLIENTS[k].nom)} de 09:00 à 11:00`; toast(msg); const t = document.getElementById('toast'); const r = { balises: t.querySelectorAll('[data-xss]').length, img: t.querySelectorAll('img').length, hits: window.top.__hits.length, puits: window.top.__puits.length };
    CLIENTS[k].nom = nom0; return r; });
  L.v('bulles : un nom de client piégé écrit par esc() ne crée ni balise ni exécution', r9.balises === 0 && r9.img === 0 && r9.hits === 0 && r9.puits === 0, r9);
  // la forme sans esc : le filet retient quand même (ET le puits NOMME l'oubli)
  const r10 = await ev(() => { window.top.__puits.length = 0; window.top.__hits.length = 0; toast('X <img src=x onerror=__xss(\'n9001\')><i data-xss=n9001></i>'); const t = document.getElementById('toast'); return { balises: t.querySelectorAll('[data-xss]').length, hits: window.top.__hits.length, puits: window.top.__puits.length }; });
  L.v('bulles : un appelant qui OUBLIE esc() ne fait quand même ni balise ni exécution (le filet) — et le puits le voit (pour que la sonde le nomme)', r10.balises === 0 && r10.hits === 0 && r10.puits >= 1, r10);
  // ═══ unités ═══
  const r11 = await ev(() => ({ bonnes: ['u', 'kg', 'pièce(s)', 'paquet de 100', '€/h', 'boîte d\'1', 'boîte d’1', 'm²', 'le kg', 'm³', 'g/m²', 'l/min', 'lot'].map(u => [u, uniteSure(u)]), mauvaises: ['<b>', 'a"b', 'a`b', 'x\u0000y', 'x‮y', '', 'x'.repeat(21)].map(u => [u, uniteSure(u)]) }));
  L.v('unités : les unités de bonne foi passent', r11.bonnes.every(([u, v]) => v === u.replace(/\s+/g, ' ').trim()), r11.bonnes.filter(([u, v]) => v !== u));
  L.v('unités : < > " ` les caractères de contrôle, le vide et plus de 20 signes sont refusés', r11.mauvaises.every(([, v]) => v === ''), r11.mauvaises.filter(([, v]) => v));
  // ═══ S11 : l'import de prix d'un fournisseur (fichier hostile, jamais rejoué avant ce tour) ═══
  const r13 = await ev(() => { const f = MES_FOURN[0], rows = [['<img src=x onerror=__xss(\'n9100\')>Câble "rouge" `x`', '12,5', 'pièce(s)', '=cmd|x', '123'], ['Prix infini', '1e999', 'u', 'R1', ''], ['Prix énorme', '1e7', 'u', 'R2', ''], ['Prix NaN', 'NaN', 'u', 'R3', ''], ['Prix négatif', '-4', 'u', 'R4', ''], ['x'.repeat(100000), '5', '<b>', 'y'.repeat(500), 'z'.repeat(100)], ['Bonne ligne & fils', '7,25', 'le kg', 'R5', '']];
    for (let i = 0; i < 20000; i++) rows.push(['Ligne ' + i, '1', 'u', 'R' + i, '']);
    FO_IMP = { f, h: ['Désignation', 'Prix net', 'Unité', 'Référence', 'Code-barres'], rows, m: { nom: 0, net: 1, u: 2, ref: 3, ean: 4 }, fichier: 'essai.csv', garder: true };
    const t0 = performance.now(); const out = foLignes(); const ms = Math.round(performance.now() - t0);
    const un = out.find(o => /Câble/.test(o.nom)), grand = out.find(o => o.nom.length >= 150), bonne = out.find(o => /Bonne ligne/.test(o.nom));
    return { n: out.length, ms, un: un && { nom: un.nom, ref: un.ref, u: un.u, pa: un.pa }, grand: grand && { nom: grand.nom.length, ref: grand.ref.length, ean: grand.ean.length, u: grand.u }, bonne: bonne && { nom: bonne.nom, u: bonne.u, pa: bonne.pa }, prix: out.map(o => o.pa), infini: out.some(o => /Prix (infini|énorme|NaN|négatif)/.test(o.nom)), reconnus: [...out].filter(o => !Number.isFinite(o.pa) || o.pa <= 0 || o.pa > 1e6).length }; });
  L.v('S11 : population : la ligne piégée, la ligne géante et la bonne ligne sont lues, sur 20 007 lignes (en moins de 3 s : ' + r13.ms + ' ms)', !!r13.un && !!r13.grand && !!r13.bonne && r13.n >= 20000 && r13.ms < 3000, { n: r13.n, ms: r13.ms });
  L.v('S11 : le nom et la référence piégés perdent < > " ` et la formule de tête (= + - @) ; l\'unité « pièce(s) » passe', !!r13.un && !/[<>"`]/.test(r13.un.nom) && !/^[=+\-@]/.test(r13.un.ref) && r13.un.u === 'pièce(s)', r13.un);
  L.v('S11 : un nom de 100 000 signes est borné (200), sa référence (40), son code-barres (20) ; une unité « <b> » est refusée', !!r13.grand && r13.grand.nom <= 200 && r13.grand.ref <= 40 && r13.grand.ean <= 20 && r13.grand.u === '', r13.grand);
  L.v('S11 : prix infini (1e999), énorme (1e7), NaN ou négatif : la ligne est ignorée ; aucun prix hors ]0 ; 1 000 000]', !r13.infini && r13.reconnus === 0, { infini: r13.infini, hors: r13.reconnus });
  L.v('S11 : « Bonne ligne & fils » se lit telle quelle (7,25 €, « le kg »)', !!r13.bonne && r13.bonne.nom === 'Bonne ligne & fils' && r13.bonne.pa === 7.25 && r13.bonne.u === 'le kg', r13.bonne);
  const nErr = c.err.filter(e => !/ResizeObserver/.test(e)); L.v('aucune erreur de page', nErr.length === 0, nErr.slice(0, 3));
  await L.fin(c);
  // ═══ S06 : le FEC de la Comptabilité (autre page) ═══
  const k = await L.ouvrir({ qui: null, app: false, page: 'prototype-comptabilite.html', requete: '', attente: 1500 });
  const r12 = await k.p.evaluate(() => { const nl = ['=1+1', '  =cmd|x', '\t@SUM(1)', ' -2+3', '+1', 'Dupont & Fils'], nb0 = E.length; const base = E.find(e => e.etat === 'valide' && !e.essai && e.lignes && e.lignes.length); if (!base) return { vide: true };
    const copie = JSON.parse(JSON.stringify(base)); copie.num = 'VT-99999'; copie.lignes.forEach((l, i) => { l.lib = nl[i % nl.length]; }); copie.piece = '\t=2+2'; E.push(copie); const L = fecLignes(), mine = L.filter(x => x[2] === 'VT-99999'); E.pop();
    return { nb: mine.length, libs: mine.map(x => x[10]), piece: mine.map(x => x[8]), montants: mine.map(x => x[11] + '|' + x[12]), tex: fecTexteSur('=1') + fecTexteSur(' -x') + fecTexteSur('12') }; });
  L.v('S06 : population : l\'écriture d\'essai a des lignes dans le FEC de la Comptabilité', !r12.vide && r12.nb > 0, r12);
  L.v('S06 : FEC de la Comptabilité — libellé et pièce commençant par = + - @ (après espaces ou tabulation) reçoivent une apostrophe ; « Dupont & Fils » reste tel quel', !r12.vide && r12.libs.every(v => /^'/.test(v) || !/^[\s]*[=+\-@]/.test(v)) && r12.piece.every(v => /^'/.test(v)) && /^'=1' -x12$/.test(r12.tex), r12);
  L.v('S06 : les montants de la Comptabilité ne sont jamais préfixés', !r12.vide && r12.montants.every(m => !/'/.test(m)), r12.montants);
  await L.fin(k);
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });

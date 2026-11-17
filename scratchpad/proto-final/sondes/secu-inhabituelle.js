// Sonde « secu-inhabituelle » (double authentification, étape 2, § 3.5) : la connexion INHABITUELLE, en rouge.
// Population : Karim (téléphone prêt, cet ordinateur reconnu) ; trois signaux joués (autre ordinateur, pleine nuit, mots de passe faux juste avant) ;
// jour ET nuit pour les contrastes mesurés AU PIXEL (la boîte rouge de l'ordinateur, la carte rouge du téléphone).
// ⛔ Un rouge ne se juge pas à sa valeur écrite mais à ce que le navigateur peint : on photographie l'élément et on lit les pixels (scratchpad/png.js).
const S = require('./secu-commun.js'), L = S.L, v = L.v, PNG = require('../../png.js');
const txt = (c, sel) => c.p.evaluate(s => (document.querySelector(s) || {}).textContent || '', sel);
// contraste AU PIXEL d'un élément : fond dominant contre le pixel le plus éloigné (le cœur des traits du texte)
const contraste = async (c, sel) => { const el = c.p.locator(sel).first(); const buf = await el.screenshot(); const img = PNG.decoder(buf), n = img.w * img.h, freq = new Map();
  for (let i = 0; i < n; i++) { const k = (img.data[i * 4] << 16) | (img.data[i * 4 + 1] << 8) | img.data[i * 4 + 2]; freq.set(k, (freq.get(k) || 0) + 1); }
  const fond = [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0], F = [fond >> 16, (fond >> 8) & 255, fond & 255]; let pire = 1, encre = F;
  for (let i = 0; i < n; i++) { const p = [img.data[i * 4], img.data[i * 4 + 1], img.data[i * 4 + 2]], r = PNG.contraste(F, p); if (r > pire) { pire = r; encre = p; } }
  return { ratio:pire, fond:F, encre }; };
const retour = async c => { await c.p.evaluate(() => { if (SESSION) sessionFermer(); else if (document.querySelector('[data-cnx="annuler-demande"]')) document.querySelector('[data-cnx="annuler-demande"]').click(); else if (!document.getElementById('cn-id')) cnxMontrer(); });
  await L.attendre(c.p, () => !!document.getElementById('cn-id'), 8000); await c.p.waitForTimeout(500); };
(async () => {
  for (const nuit of [false, true]) {
    const mode = nuit ? 'nuit' : 'jour'; console.log('\n══ ' + mode.toUpperCase() + ' ══');
    const c = await S.ouvrir({ profil:'mac', nuit }); let mdp = await S.provisoire(c, 'kb');
    console.log('── une connexion ordinaire n’est PAS rouge (témoin) ──');
    await S.connecter(c, 'kb', mdp); await S.lireNombre(c);
    v(mode + ' · témoin : pas de boîte rouge, le détail « Le téléphone n’a pas de réseau ? » est là', await c.p.evaluate(() => !document.querySelector('[data-sec="alerte-rouge"]') && !!document.querySelector('.sec-codes') && !document.querySelector('.sec-nombre.rouge')));
    await retour(c);
    console.log('── « Je me connecte depuis un autre ordinateur » ──');
    await c.p.click('#cnx [data-secd="case"][data-c="autre"]');
    v(mode + ' · les deux cases (écran et bloc « Démonstration ») se suivent : UNE seule source d’état', await c.p.evaluate(() => [...document.querySelectorAll('[data-secd="case"][data-c="autre"]')].length === 2 && [...document.querySelectorAll('[data-secd="case"][data-c="autre"]')].every(i => i.checked)));
    await S.connecter(c, 'kb', mdp); await S.lireNombre(c);
    const B = await c.p.evaluate(() => { const b = document.querySelector('[data-sec="alerte-rouge"]'); return b && { txt:b.textContent.replace(/\s+/g, ' ').trim(), role:b.getAttribute('role'), lis:[...b.querySelectorAll('li')].map(l => l.textContent), pict:!!b.querySelector('[aria-hidden]'), bord:getComputedStyle(b).borderTopWidth, nombreRouge:document.querySelector('.sec-nombre').classList.contains('rouge'), details:!!document.querySelector('.sec-codes'), seul:/Connexion inhabituelle : seul le téléphone peut l’approuver, pas le code à 6 chiffres\./.test(document.getElementById('cnx').textContent.replace(/\s+/g, ' ')) }; });
    v(mode + ' · la boîte rouge : « Connexion inhabituelle détectée », role=alert, pictogramme ⚠, cadre', B && /Connexion inhabituelle détectée/.test(B.txt) && B.role === 'alert' && B.pict && parseFloat(B.bord) >= 2, B);
    v(mode + ' · ses deux raisons : « Appareil jamais utilisé pour ce compte » et « Réseau (adresse) jamais utilisé »', B && B.lis.join('|') === 'Appareil jamais utilisé pour ce compte|Réseau (adresse) jamais utilisé', B && B.lis);
    v(mode + ' · « L’approbation sur le téléphone est obligatoire. » + le nombre a un cadre rouge', B && /L’approbation sur le téléphone est obligatoire\./.test(B.txt) && B.nombreRouge, B);
    v(mode + ' · le détail du code à 6 chiffres est REMPLACÉ par « Connexion inhabituelle : seul le téléphone peut l’approuver, pas le code à 6 chiffres. »', B && !B.details && B.seul, B);
    await S.deverrouiller(c, 'kb'); const ct = await S.cartes(c);
    v(mode + ' · le téléphone : carte ROUGE « Connexion inhabituelle » (jamais « Demande de connexion ») avec les deux raisons', ct.length === 1 && ct[0].rouge && /^\s*⚠?\s*Connexion inhabituelle/.test(ct[0].titre) && !/Demande de connexion/.test(ct[0].texte) && /Appareil jamais utilisé pour ce compte/.test(ct[0].texte) && /Réseau \(adresse\) jamais utilisé/.test(ct[0].texte), ct);
    v(mode + ' · la carte dit l’adresse de l’autre ordinateur (198.51.100.7) et un appareil différent de cet ordinateur', await c.p.evaluate(() => { const t = document.querySelector('#opsec .ops-carte').textContent; return /198\.51\.100\.7/.test(t) && !/203\.0\.113\.42/.test(t); }));
    for (const [nom, sel] of [['la boîte rouge de l’ordinateur (titre)', '[data-sec="alerte-rouge"] b'], ['une raison de la boîte rouge', '[data-sec="alerte-rouge"] li'], ['le nombre sous son cadre rouge', '.sec-nombre'], ['le texte « seul le téléphone peut l’approuver »', '.sec-seul']]) { const r = await contraste(c, sel); v(mode + ' · contraste AU PIXEL : ' + nom + ' ≥ 4,5:1', r.ratio >= 4.5, { ratio:r.ratio, fond:r.fond, encre:r.encre }); }
    if (c.p.viewportSize().width >= 1100) for (const [nom, sel] of [['le titre de la carte rouge du téléphone', '#opsec .ops-carte.rouge h2'], ['une raison rouge du téléphone', '#opsec .ops-raisons li']]) { const r = await contraste(c, sel); v(mode + ' · contraste AU PIXEL : ' + nom + ' ≥ 4,5:1', r.ratio >= 4.5, { ratio:r.ratio, fond:r.fond, encre:r.encre }); }
    console.log('── le code à 6 chiffres est REFUSÉ pour une connexion inhabituelle ──');
    const ech0 = await c.p.evaluate(() => ({ pas:SECU.comptes.kb.tel.dernierPas, echecs:SECU.comptes.kb.echecs }));
    const rep = await c.p.evaluate(() => { const bon = secuTotp(SECU.comptes.kb.tel.cle, secuMaint()); cnxCode6(bon); return { msg:(document.getElementById('cn-err') || {}).textContent, s:SESSION, journal:SECU.journal.filter(j => j.action === 'login.code_refused_unusual').length, pas:SECU.comptes.kb.tel.dernierPas }; });
    v(mode + ' · même avec le BON code : « Connexion inhabituelle : seule l’approbation sur le téléphone est acceptée. », personne n’entre', /Connexion inhabituelle : seule l’approbation sur le téléphone est acceptée\./.test(rep.msg) && rep.s === null, rep);
    v(mode + ' · la tentative est au journal (login.code_refused_unusual) et le pas du code n’est pas consommé', rep.journal === 1 && rep.pas === ech0.pas, { rep, ech0 });
    const n = await S.lireNombre(c); await S.approuver(c, 'kb', n); const app = await S.attendreApp(c, 15000);
    const ap = await c.p.evaluate(() => ({ toast:(document.getElementById('toast') || {}).textContent || '', appareils:SECU.comptes.kb.appareils.map(a => a.id), histo:SECU.comptes.kb.histo[0], s:SESSION }));
    v(mode + ' · approuvée : l’application s’ouvre', app && ap.s === 'kb', ap);
    v(mode + ' · toast « Connexion inhabituelle approuvée. Cet ordinateur est maintenant reconnu. »', /Connexion inhabituelle approuvée\. Cet ordinateur est maintenant reconnu\./.test(ap.toast), ap.toast);
    v(mode + ' · l’autre ordinateur entre dans les appareils reconnus, la ligne reste rouge dans l’historique (2 raisons)', ap.appareils.includes('autre') && ap.histo.resultat === 'approuvee' && ap.histo.raisons.length === 2, ap);
    await retour(c); await S.connecter(c, 'kb', mdp); await S.lireNombre(c);
    v(mode + ' · la connexion SUIVANTE depuis le même autre ordinateur n’est plus rouge', await c.p.evaluate(() => !document.querySelector('[data-sec="alerte-rouge"]') && !!document.querySelector('.sec-codes')));
    await retour(c);
    console.log('── « Je me connecte en pleine nuit » ──');
    await c.p.click('#cnx [data-secd="case"][data-c="autre"]'); await c.p.click('#cnx [data-secd="case"][data-c="nuit"]'); await S.connecter(c, 'kb', mdp); await S.lireNombre(c);
    const N = await c.p.evaluate(() => ({ lis:[...document.querySelectorAll('[data-sec="alerte-rouge"] li')].map(l => l.textContent) }));
    v(mode + ' · une seule raison : « En dehors des heures de travail habituelles (7 h – 21 h) » (l’appareil est reconnu)', N.lis.join('|') === 'En dehors des heures de travail habituelles (7 h – 21 h)', N);
    await S.deverrouiller(c, 'kb'); v(mode + ' · le téléphone affiche l’heure 03:12 (la démonstration n’utilise pas l’heure réelle)', await c.p.evaluate(() => /Heure\s*03:12/.test(document.querySelector('#opsec .ops-carte').textContent.replace(/\s+/g, ' ').replace('Heure', 'Heure '))));
    await retour(c); await c.p.click('#cnx [data-secd="case"][data-c="nuit"]');
    console.log('── deux mots de passe faux juste avant ──');
    await S.connecter(c, 'kb', 'faux-1'); await c.p.fill('#cn-id', 'karim'); await S.connecter(c, 'kb', 'faux-2'); await c.p.fill('#cn-id', 'karim'); await S.connecter(c, 'kb', mdp); await S.lireNombre(c);
    v(mode + ' · la raison « Plusieurs mots de passe faux juste avant » est ROUGE sur l’ordinateur', await c.p.evaluate(() => /Plusieurs mots de passe faux juste avant/.test((document.querySelector('[data-sec="alerte-rouge"]') || {}).textContent || '')));
    await S.deverrouiller(c, 'kb'); v(mode + ' · et sur le téléphone', await c.p.evaluate(() => /Plusieurs mots de passe faux juste avant/.test(document.querySelector('#opsec .ops-carte').textContent)));
    v(mode + ' · aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c); }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('ERR', e); process.exit(1); });

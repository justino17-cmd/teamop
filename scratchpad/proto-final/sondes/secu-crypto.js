// Sonde « secu-crypto » (double authentification, étape 2) : les petites pièces PURES du socle, jouées dans Node sur le texte réel de la page,
// sans navigateur : SHA-256 (FIPS 180-4), SHA-1, HMAC-SHA1 (RFC 2202), HOTP (RFC 4226), formes des mots de passe provisoires et des codes
// d'activation, PIN trop simples, hasard (jamais Math.random), appareil lu dans l'agent du navigateur.
// ⛔ Les vecteurs de test sont ceux des normes : si le code horaire du téléphone ne s'accordait pas avec eux, aucune vraie application ne pourrait le lire.
const fs = require('fs'), vm = require('vm'), path = require('path');
const RACINE = process.env.RACINE || path.join(__dirname, '..', '..', '..');   // RACINE : la copie mutée des contre-épreuves
const src = fs.readFileSync(path.join(RACINE, 'apercu', 'prototype-op-gestion.html'), 'utf8');
let ok = 0, ko = 0; const v = (n, c, d) => { if (c) { ok++; console.log('  ✓', n); } else { ko++; console.log('  ✗', n, d === undefined ? '' : '→ ' + JSON.stringify(d)); } };
const a = src.indexOf('const SECU_DEMO = true;'), b = src.indexOf('const secuPinFaible');
v('le bloc du socle est trouvé dans la page', a > 0 && b > a, { a, b });
const code = src.slice(a, b), pur = code.replace(/\/\*[\s\S]*?\*\//g, ' ');
const ctx = { crypto: require('crypto').webcrypto, TextEncoder, navigator: { userAgent: '', maxTouchPoints: 0 }, Math, Uint8Array, Uint32Array, Int32Array, DataView, Set, Array, String, Date, parseInt, Object, EQUIPE: [], eqDe: () => null };
vm.createContext(ctx);
vm.runInContext(code + ';this.R={sha:secuSha256,sha1:secuSha1,hm:secuHmacSha1,hotp:secuHotp,mdp:secuMdpProvisoire,code:secuCodeActivation,alea:secuAleaInt,auto:secuAutoPermis,appareil:secuAppareil,jeuCode:SECU_JEU_CODE,jeuMdp:SECU_JEU_MDP,regles:SECU_REGLES};', ctx);
const pin = vm.runInContext(src.slice(b, src.indexOf('\n', b)) + ';secuPinFaible', ctx);
const R = ctx.R, hex = u => Buffer.from(u).toString('hex'), enc = t => new TextEncoder().encode(t), nodeSha = (t) => require('crypto').createHash('sha256').update(t).digest('hex');
console.log('\n── SHA-256, SHA-1, HMAC-SHA1, HOTP : les vecteurs des normes ──');
v('SHA-256 de « abc » (FIPS 180-4)', R.sha('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
v('SHA-256 du texte vide', R.sha('') === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
for (const n of [1, 55, 56, 63, 64, 65, 119, 120, 1000, 5000]) v('SHA-256 de ' + n + ' « a » = celui de Node (bords de bloc)', R.sha('a'.repeat(n)) === nodeSha('a'.repeat(n)));
v('SHA-256 d’un texte accentué (UTF-8) = celui de Node', R.sha('mot de passe é€ 😀') === nodeSha('mot de passe é€ 😀'));
v('SHA-1 de « abc »', hex(R.sha1('abc')) === 'a9993e364706816aba3e25717850c26c9cd0d89d');
v('HMAC-SHA1 (RFC 2202, « Jefe »)', hex(R.hm(enc('Jefe'), enc('what do ya want for nothing?'))) === 'effcdf6ae5eb2fa2d27416d5f184df9c259a7c79');
const cle = enc('12345678901234567890'), att = ['755224', '287082', '359152', '969429', '338314', '254676', '287922', '162583', '399871', '520489'];
v('HOTP : les dix valeurs de la RFC 4226 (annexe D)', att.every((x, i) => R.hotp(cle, i) === x), att.map((x, i) => R.hotp(cle, i)));
console.log('\n── les formes tirées au hasard ──');
const mdps = new Set(); let formeOk = true; for (let i = 0; i < 300; i++) { const m = R.mdp(); mdps.add(m); if (!/^[A-Za-z2-9]{6}-[A-Za-z2-9]{6}-[A-Za-z2-9]{6}$/.test(m) || /[IlO01]/.test(m)) formeOk = false; }
v('300 mots de passe provisoires : 18 signes en groupes de 6, sans I l O 0 1, tous différents', formeOk && mdps.size === 300, { distincts: mdps.size });
const codes = new Set(); let codeOk = true; for (let i = 0; i < 300; i++) { const m = R.code(); codes.add(m); if (!/^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/.test(m)) codeOk = false; }
v('300 codes d’activation : 12 signes A-Z 2-9 sans I L O 0 1, tous différents', codeOk && codes.size === 300);
const tirages = Array.from({ length: 3000 }, () => R.alea(90)), mn = Math.min(...tirages), mx = Math.max(...tirages);
v('3 000 tirages de secuAleaInt(90) : de 0 à 89, les 90 valeurs sortent', mn === 0 && mx === 89 && new Set(tirages).size === 90, { mn, mx, distincts: new Set(tirages).size });
v('le hasard vient de crypto.getRandomValues et jamais de Math.random (dans le bloc du socle, hors commentaires)', /crypto\.getRandomValues/.test(pur) && !/Math\.random/.test(pur));
console.log('\n── les PIN : suites et répétitions refusées, un PIN ordinaire accepté ──');
const faibles = ['012345', '123456', '654321', '000000', '999999', '121212', '123123', '234567', '987654', '777777', '545454', '456456'], bons = ['246802', '135792', '482915', '907351', '281946'];
for (const p of faibles) v('PIN « ' + p + ' » refusé (trop simple)', pin(p) === true);
for (const p of bons) v('PIN « ' + p + ' » accepté', pin(p) === false);
console.log('\n── l’appareil de cet ordinateur, lu dans l’agent du navigateur ──');
const agents = [['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', 'Chrome · Windows', 0], ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', 'Edge · Windows', 0],
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', 'Safari · iPhone', 5], ['Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/141.0.0.0 Mobile Safari/537.36', 'Chrome · Android', 5],
  ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15', 'Safari · macOS', 0], ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15', 'Safari · iPad', 5],
  ['Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0', 'Firefox · Linux', 0], ['', 'Navigateur · Appareil inconnu', 0]];
for (const [ua, att2, pts] of agents) { ctx.navigator.userAgent = ua; ctx.navigator.maxTouchPoints = pts; v('« ' + (ua.slice(0, 40) || '(vide)') + '… » → ' + att2, R.appareil() === att2, R.appareil()); }
ctx.navigator.userAgent = 'Mozilla/5.0 ' + 'Chrome/1 '.repeat(30) + 'Windows'; v('un nom d’appareil est borné à 40 signes', R.appareil().length <= 40);
console.log(`\n== ${ok} ✓ · ${ko} ✗`); process.exit(ko ? 1 : 0);

// Captures À REGARDER de la double authentification (étape 2) : activation A, téléphone activé, B, C, confirmation, connexion inhabituelle (rouge), carte rouge du téléphone, téléphone ouvert.
// Usage : PROFIL=mac NUIT=1 node secu-captures.js   → /tmp/claude-0/.../scratchpad/cap/double-auth/ecrans-<profil>-<jour|nuit>-<écran>.png ; rend aussi les mesures de base (débordement, champs, cibles) de chaque écran.
const S = require('./secu-commun.js'), L = S.L, v = L.v;
const PROFIL = process.env.PROFIL || 'mac', NUIT = !!process.env.NUIT, jn = NUIT ? 'nuit' : 'jour';
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/double-auth/ecrans-' + PROFIL + '-' + jn + '-';
(async () => {
  const c = await S.ouvrir({ profil:PROFIL, nuit:NUIT }), W = c.largeur, large = W >= 1100;
  const mesurer = async nom => { const d = await L.deborde(c); const dg = await L.doigts(c.p, '#cnx');
    v(PROFIL + ' ' + jn + ' · ' + nom + ' : pas de débordement, cibles ≥ 44, champs ≥ 16, aucun texte écrasé', d.bouge === 0 && d.seconde <= W && dg.petits.length === 0 && dg.champs.length === 0 && dg.ecrases.length === 0, { d, dg }); };
  const voirTel = async () => { if (!large) { await c.p.evaluate(() => { const b = document.querySelector('#cnx .ops-pastille'); if (b) b.click(); else opsOuvrir(); }); await c.p.waitForTimeout(500); } };
  const cacherTel = async () => { if (!large) { await c.p.evaluate(() => opsFermer()); await c.p.waitForTimeout(300); } };
  await S.activer(c, 'marc', { pin:'135792', guide:true, etape:async e => {
    if (e === 'A') { await mesurer('écran A'); await L.capture(c, CAP + 'A.png'); await c.p.evaluate(() => window.scrollTo(0, 99999)); await c.p.waitForTimeout(300); await L.capture(c, CAP + 'A-bas.png'); await c.p.evaluate(() => window.scrollTo(0, 0)); }
    if (e === 'telephone-active') { await voirTel(); await L.capture(c, CAP + 'telephone-active.png'); await cacherTel(); }
    if (e === 'B') { await mesurer('écran B'); await L.capture(c, CAP + 'B.png'); }
    if (e === 'C') { await mesurer('écran C'); await L.capture(c, CAP + 'C.png'); } } });
  await c.p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); });
  await c.p.evaluate(() => sessionFermer('deconnexion')); await S.attendreSel(c, '#cn-id', 8000); await c.p.waitForTimeout(500);
  await L.capture(c, CAP + 'connexion-deconnecte.png');
  await c.p.evaluate(() => { SECU.cases.autre = true; SECU.cases.nuit = true; });
  await S.connecter(c, 'marc', 'Cheval-agrafe-batterie-marc-2026'); const n = await S.lireNombre(c);
  v('connexion inhabituelle : le nombre est là', /^[1-9][0-9]$/.test(n), n);
  await mesurer('confirmation inhabituelle'); await c.p.evaluate(() => window.scrollTo(0, 0)); await L.capture(c, CAP + 'inhabituelle.png');
  await voirTel(); await S.deverrouiller(c, 'marc', '135792'); await c.p.waitForTimeout(400); await L.capture(c, CAP + 'inhabituelle-telephone.png');
  const cont = await c.p.evaluate(() => { const e = document.querySelector('#opsec .ops-carte.rouge'); if (!e) return null; const f = e.closest('.ops-defile') || e; return { top:e.getBoundingClientRect().top, bas:e.getBoundingClientRect().bottom, h:innerHeight }; });
  v('la carte rouge est sur le téléphone', !!cont, cont);
  await c.p.evaluate(() => document.querySelector('#opsec .ops-carte.rouge').scrollIntoView({ block:'center' })); await c.p.waitForTimeout(250); await L.capture(c, CAP + 'inhabituelle-carte.png');
  await cacherTel();
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c); await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('ERR', e); process.exit(1); });

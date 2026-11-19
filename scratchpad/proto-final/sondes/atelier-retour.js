// SONDE « bouton Retour » (navigateur, Android, geste de bord de l'iPhone) : ouvrir l'atelier pousse UNE entrée d'historique ; Retour FERME l'atelier et laisse l'écran dessous où il
// était ; fermer par le bouton, Échap ou la demande de l'atelier CONSOMME l'entrée poussée (un Retour de plus mène alors à l'écran d'avant, jamais à un doublon de Devis) ; l'historique
// ne grandit pas à chaque ouverture. Parcours : Clients → Devis → Composer → Retour (Devis, atelier fermé) → Retour (Clients). Rend « N ✓ · M ✗ ».
const A = require('./atelier-outils.js'), L = A.L, v = L.v;
const hist = async p => { await p.waitForTimeout(250); return p.evaluate(() => ({ n: history.length, h: location.hash, st: history.state, atelier: (() => { const z = document.getElementById('opdz'); return !!z && !z.hidden; })() })); };
async function aPartirDeClientsDevis(c) { await L.aller(c.p, 'clients'); await L.aller(c.p, 'devis'); }
(async () => {
  const c = await L.ouvrir({ profil: process.env.PROFIL || 'android', qui: 'marc' }), p = c.p;
  await aPartirDeClientsDevis(c); const h0 = await hist(p);
  v('départ : #devis, atelier fermé', h0.h === '#devis' && !h0.atelier, h0);
  // ── 1. Retour ferme l'atelier (fenêtre de composition ouverte), puis ramène à Clients ──
  let f = await A.ouvrirAtelier(c, 'devis', null); const h1 = await hist(p);
  v('ouvrir l\'atelier pousse UNE entrée (même adresse)', h1.n === h0.n + 1 && h1.h === '#devis' && h1.atelier, [h0.n, h1.n, h1.h]);
  v('… elle porte son marqueur d\'état', !!(h1.st && h1.st.cal === 1), h1.st);
  await p.goBack(); await p.waitForTimeout(500); const h2 = await hist(p);
  v('Retour : l\'atelier est fermé et l\'écran dessous est resté où il était (#devis, rubrique Devis)', !h2.atelier && h2.h === '#devis' && (await L.etat(p)).h1 === 'Devis', h2);
  v('… et l\'historique n\'a pas grandi', h2.n === h1.n, [h1.n, h2.n]);
  await p.goBack(); await p.waitForTimeout(500); const h3 = await hist(p);
  v('Retour encore : Clients (pas un second Devis)', h3.h === '#clients' && (await L.etat(p)).h1 === 'Clients', h3);
  await p.goForward(); await p.waitForTimeout(400); await p.goForward(); await p.waitForTimeout(500); const h4 = await hist(p);
  v('Avancer jusqu\'à l\'entrée de l\'atelier ne le rouvre pas tout seul', h4.h === '#devis' && !h4.atelier, h4);
  // ── 2. fermer par le bouton « Annuler » consomme l'entrée : un Retour de plus mène à Clients ──
  await aPartirDeClientsDevis(c); const b0 = await hist(p);
  f = await A.ouvrirAtelier(c, 'devis', null); await f.locator('[data-fen-x]').first().click(); await p.waitForTimeout(900);
  const b1 = await hist(p);
  v('fermer par « Annuler » : atelier fermé, état de l\'entrée poussée consommé (plus de marqueur)', !b1.atelier && !(b1.st && b1.st.cal) && b1.h === '#devis', b1);
  await p.goBack(); await p.waitForTimeout(500); const b2 = await hist(p);
  v('… et UN Retour mène à Clients (l\'entrée de l\'atelier n\'est pas restée en travers)', b2.h === '#clients', [b0.h, b2.h]);
  // ── 3. Échap dans l'atelier : même chose ──
  await aPartirDeClientsDevis(c); f = await A.ouvrirAtelier(c, 'devis', null); await f.locator('#vv-q, .fenetre').first().focus().catch(() => {}); await p.keyboard.press('Escape'); await p.waitForTimeout(900);
  const e1 = await hist(p); v('Échap ferme l\'atelier (rien saisi : aucune confirmation)', !e1.atelier && !(e1.st && e1.st.cal), e1);
  await p.goBack(); await p.waitForTimeout(500); v('… et UN Retour mène à Clients', (await hist(p)).h === '#clients');
  // ── 4. un éditeur ouvert (l'atelier pose ses propres entrées) : Retour, puis Retour ──
  await aPartirDeClientsDevis(c); f = await A.ouvrirAtelier(c, 'devis', null);
  await A.composerDevis(c, f, { client: 'vp', objet: 'Essai du retour', articles: [{ ref: 'EL-ALL', qte: 1 }] });
  const d0 = await hist(p); v('éditeur ouvert : atelier visible, éditeur affiché', d0.atelier && await f.evaluate(() => S.vue === 'editeur'), d0);
  await p.goBack(); await p.waitForTimeout(1200); const d1 = await hist(p);
  const reste = await f.evaluate(() => ({ vue: S.vue, nav: NAV.n }));
  v('Retour depuis l\'éditeur : l\'éditeur se ferme, et avec lui l\'atelier (rien d\'autre à montrer) — jamais un cadre vide', !d1.atelier && reste.vue === 'accueil', [d1, reste]);
  v('… et ce seul Retour a laissé le prototype sur #devis (il n\'a pas consommé deux écrans)', d1.h === '#devis', d1);
  await p.goBack(); await p.waitForTimeout(500);
  v('et le Retour suivant mène à Clients', (await hist(p)).h === '#clients', await hist(p));
  // ── 5. éditeur fermé par SON bouton « ‹ OP GESTION » ──
  await aPartirDeClientsDevis(c); f = await A.ouvrirAtelier(c, 'devis', null);
  await A.composerDevis(c, f, { client: 'hp', objet: 'Essai du bouton', articles: [{ ref: 'EL-ALL', qte: 1 }] });
  await f.locator('[data-act="retour"]:visible').first().click(); await p.waitForTimeout(1400); const g1 = await hist(p);
  v('« ‹ OP GESTION » : atelier fermé, #devis, plus de marqueur d\'état', !g1.atelier && g1.h === '#devis' && !(g1.st && g1.st.cal), g1);
  await p.goBack(); await p.waitForTimeout(500); v('… un Retour mène à Clients', (await hist(p)).h === '#clients', await hist(p));
  // ── 6. ouvrir et fermer dix fois : l'historique ne grandit pas ──
  await aPartirDeClientsDevis(c); const n0 = (await hist(p)).n;
  for (let i = 0; i < 10; i++) { const ff = await A.ouvrirAtelier(c, 'devis', null); if (!ff) { v('ouverture ' + (i + 1), false); break; } await ff.locator('[data-fen-x]').first().click(); await p.waitForTimeout(700); }
  const n1 = await hist(p); v('dix ouvertures-fermetures : l\'historique n\'a pas grandi de plus de 1 (' + n0 + ' → ' + n1.n + ')', n1.n <= n0 + 1 && !n1.atelier, [n0, n1]);
  v('aucune erreur de page', c.err.length === 0, c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

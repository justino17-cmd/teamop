// CAPTURES de l'audit de sécurité (étape 7) : les trois écrans que les correctifs ont changés, À REGARDER (outil Read), ordinateur et téléphone, jour ET nuit :
//   1. « Inviter une personne » : le refus d'un prénom piégé (message qui dit pourquoi, formulaire encore ouvert) ;
//   2. Véhicules › Papiers : le refus d'un SVG ;
//   3. l'atelier de documents : le devis s'ouvre et se lit (ses treize polices sont revenues le 17 novembre, décision du chef ; ici, sans réseau, elles retombent sur la police de l'appareil).
// Sortie : …/scratchpad/cap/securite/<ecran>-<profil>-<jour|nuit>.png (hors dépôt). Un contrôle de population par écran (le message est là, l'écran a du texte).
// ⛔ 127.0.0.1 seulement. Jamais de capture « page entière » : la fenêtre visible.
const L = require('../lib.js'), fs = require('fs');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/securite/';
const CH = '<img src=x onerror="window.__xss=1">Marie';
(async () => {
  fs.mkdirSync(CAP, { recursive: true });
  for (const [profil, nuit] of [['mac', false], ['iphone', true], ['android', false], ['mac', true]]) {
    const tag = profil + '-' + (nuit ? 'nuit' : 'jour');
    const c = await L.ouvrir({ profil, nuit, qui: 'marc', attente: 1200 }), p = c.p;
    p.on('dialog', d => d.accept().catch(() => {}));
    await p.evaluate(() => { aller('equipe'); }); await L.calme(p, 600);
    await p.locator('[data-eq="inviter"]').first().click(); await L.calme(p, 500);
    await p.locator('#eq-p').fill(CH); await p.locator('#eq-n').fill('Dupont'); await p.locator('#eq-m').fill('essai@exemple.fr');
    await p.locator('[data-eq="inviterok"]').first().click(); await p.waitForTimeout(500);
    const t = await p.evaluate(() => ({ toast: (document.getElementById('toast') || {}).textContent || '', panneau: !!document.getElementById('eq-p') }));
    L.v('capture 1 (' + tag + ') le refus du prénom piégé s\'affiche (' + t.toast.slice(0, 70) + ') et le formulaire reste ouvert', /lettres/.test(t.toast) && t.panneau, t);
    await p.screenshot({ path: CAP + 'inviter-refus-' + tag + '.png' });
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} vehFiche('veh1', 'papiers'); }); await L.calme(p, 800);
    await p.locator('[data-vh="docadd|veh1"]').first().click(); await L.calme(p, 400);
    await p.locator('#vh-df').setInputFiles({ name: 'attestation.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>') });
    await p.locator('[data-vh="docok|veh1"]').first().click(); await p.waitForTimeout(500);
    const t2 = await p.evaluate(() => (document.getElementById('toast') || {}).textContent || '');
    L.v('capture 2 (' + tag + ') le refus du SVG s\'affiche (' + t2.slice(0, 70) + ')', /photo|PDF/i.test(t2), t2);
    await p.screenshot({ path: CAP + 'papier-refus-' + tag + '.png' });
    await L.fin(c);
  }
  // l'atelier quand ses polices ne chargent pas (sans réseau, comme ici) : ordinateur jour et téléphone nuit (l'atelier OUVERT, un devis composé : le texte s'y lit avec la police de l'appareil)
  const A = require('./atelier-outils.js');
  for (const [profil, nuit] of [['mac', false], ['iphone', true]]) {
    const c = await L.ouvrir({ profil, nuit, qui: 'marc', attente: 1200 }), p = c.p;
    const f0 = await A.ouvrirAtelier(c, 'devis', 'devis');
    L.v('capture 3 (' + profil + ') l\'atelier de documents s\'ouvre (cadre présent)', !!f0);
    if (f0) {
      await A.composerDevis(c, f0, { client: 'hp', objet: 'Devis de capture', articles: [{ ref: 'GS-20', qte: 2 }] }).catch(() => {}); await p.waitForTimeout(1200);
      const feuilles = await f0.evaluate(() => [...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.href));
      L.v('capture 3 (' + profil + ') le cadre de l\'atelier ne demande aucune feuille tierce (' + feuilles.length + ' feuille(s))', feuilles.every(h => !/^https?:\/\/(?!127\.0\.0\.1)/.test(h)), feuilles);
    }
    await p.screenshot({ path: CAP + 'atelier-' + profil + '-' + (nuit ? 'nuit' : 'jour') + '.png' });
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });

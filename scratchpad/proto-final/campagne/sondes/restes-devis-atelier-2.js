// Restes devis-atelier, tour 1 : devis-atelier-04 — dans OP GESTION l'atelier ne dit plus « exemple » ni « rien n'est vraiment parti » (les autres écrans d'envoi ne le disent pas).
// On passe par la fenêtre d'envoi, le toast de l'envoi, l'aperçu « Ce que voit le client », la signature, le lien de retrait de la signature, et le contrat. Rend « N ✓ · M ✗ ».
const O = require('./devis-atelier-outils.js'), L = O.L, A = O.A, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, nuit, qui: 'marc', hash: 'devis' }), p = c.p;
  const clic = async (f, s) => { const l = f.locator(s).first(); if (c.doigt) await l.tap({ timeout: 5000 }); else await l.click({ timeout: 5000 }); await p.waitForTimeout(450); };
  const MOT = /exemple|rien n.est vraiment|rejouer/i;
  const texte = f => f.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  const toast = f => f.evaluate(() => { const t = document.querySelector('#toast, .toast'); return t ? t.innerText.replace(/\s+/g, ' ') : ''; });
  for (const type of ['devis', 'contrat']) {
    const f = await A.ouvrirAtelier(c, type, type === 'devis' ? 'devis' : 'contrats'); await L.calme(p, 700);
    v(`${type} : l'atelier s'ouvre`, !!f); if (!f) continue;
    if (type === 'devis') await A.composerDevis(c, f, { client: 'md', objet: 'Split salon', articles: [{ ref: 'DKO-K4V', qte: 1 }] }); else await A.composerContrat(c, f, { client: 'md', titre: 'Entretien annuel' });
    await p.waitForTimeout(700);
    // au téléphone, un contrat neuf s'ouvre sur sa feuille « Contrat » (voile) : on la range par « Terminé » avant d'envoyer, comme le ferait la personne
    if (await f.locator('.voile [data-fen-x]:visible').count()) { await f.locator('.voile [data-fen-x]:visible').last().click({ timeout: 4000 }).catch(() => {}); await p.waitForTimeout(500); }
    await clic(f, '[data-act="envoyer"]:visible'); await p.waitForTimeout(500);
    const env = await texte(f), lib = await f.locator('#env-go').innerText();
    v(`${type} : la fenêtre d'envoi ne parle pas d'exemple (bouton « ${lib} »)`, !MOT.test(env) && !/exemple/i.test(lib), env.match(MOT));
    v(`${type} : le bouton d'envoi se lit « ${type === 'devis' ? 'Envoyer' : 'Envoyer à signer'} »`, lib.trim() === (type === 'devis' ? 'Envoyer' : 'Envoyer à signer'), lib);
    if (process.env.CAPT) await L.capture(c, O.CAP + `restes1-envoi-${type}-${profil}${nuit ? '-nuit' : ''}.png`);
    await clic(f, '[data-act="env-go"]'); await p.waitForTimeout(1300);
    const t = await toast(f);
    v(`${type} : le message d'après l'envoi dit « Envoyé à … » sans exemple (« ${t} »)`, /^Envoyé à /.test(t) && !MOT.test(t), t);
    await clic(f, '[data-act="apercu"]:visible'); await p.waitForTimeout(600);
    await f.evaluate(() => { const i = document.querySelector('#ap-client'); if (i && !i.checked) i.click(); }); await p.waitForTimeout(600);
    v(`${type} : l'aperçu « Ce que voit le client » ne parle pas d'exemple`, !MOT.test(await texte(f)), (await texte(f)).match(MOT));
    if (await f.locator('[data-act="ap-signer"]').count()) {
      await clic(f, '[data-act="ap-signer"]'); await f.evaluate(() => { const x = document.querySelector('#sg-lu'); if (x) x.click(); });
      await clic(f, '[data-act="sg-texte"]'); await f.locator('#sg-nom').fill('Marie Dupuis'); await p.waitForTimeout(200); await clic(f, '[data-act="sg-valider"]'); await p.waitForTimeout(900);
      const ts = await toast(f), ap = await texte(f);
      v(`${type} : la signature dit « Signé » sans exemple (« ${ts} »)`, /^Signé/.test(ts) && !MOT.test(ts), ts);
      v(`${type} : le lien pour retirer la signature s'appelle « Effacer la signature »`, /Effacer la signature/.test(ap) && !MOT.test(ap), ap.match(MOT));
      if (process.env.CAPT) await L.capture(c, O.CAP + `restes1-signe-${type}-${profil}${nuit ? '-nuit' : ''}.png`);
    } else v(`${type} : bouton de signature du client`, false);
    await p.keyboard.press('Escape'); await p.waitForTimeout(300); await f.locator('[data-act="apercu-fermer"]').first().click().catch(() => {}); await f.locator('[data-act="retour"]:visible').first().click().catch(() => {}); await p.waitForTimeout(1200);
  }
  v('aucune erreur de page', c.err.length === 0, c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e.message.slice(0, 900)); await L.fermer(); process.exit(2); });

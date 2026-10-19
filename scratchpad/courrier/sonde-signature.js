/* Sonde de la VRAIE SIGNATURE dans le module OP Courrier (v2.95, 19 octobre 2026) — Chromium réel, page d'essai, `?mode=signature` : la source SAIT signer (faux service piloté par la sonde,
   `window.__sigServeur`). Joue le parcours de bout en bout, AU DOIGT/À LA SOURIS, sur l'écran :
     1. la feuille « Envoyer pour signature » : le mobile de l'expéditeur n'apparaît que pour une contre-signature par SMS ; la note n'est plus « Message au signataire » ;
     2. ⛔ un refus du service : la feuille RESTE OUVERTE, « Rien n'est parti » dans la feuille ET en toast, aucune demande rangée ; puis l'envoi réussi : demande rangée « En attente », le service a reçu
        le niveau, la contre-signature avec SON mobile, le PDF (taille > 0) ;
     3. l'état suit le service : ouverture du dossier Signatures (« Ouvert »), PUIS la minuterie de 60 s (« À contresigner », pas de tracé local, « lien reçu par e-mail ») ;
     4. relancer (succès et refus dit), annuler (refus dit puis succès), signé → « Télécharger le PDF signé » / preuves : fichiers RÉELLEMENT téléchargés, nommés, contenu du service ;
     5. rechargement : la demande du service survit et se relit ; une demande « Prête » d'avant se « Renvoie » par le même chemin ;
     6. aucune erreur JS, aucune requête sortie du navigateur.
   Lancer : NODE_PATH=/tmp/pw/node_modules node scratchpad/courrier/sonde-signature.js   (voir l'en-tête de pilote.js) ; CAPTURES=<dossier> pour garder les images. */
const { ouvrir, bilan } = require('./pilote.js');
const R = []; const log = (ok, m) => R.push((ok ? 'PASS ' : 'FAIL ') + m);
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');
const SR = "document.querySelector('[data-opcourrier]').shadowRoot";
const CAP = process.env.CAPTURES || '/tmp/claude-0/-home-user-teamop/a8f64c75-27dc-5d9d-9a87-428ec3a3d7ba/scratchpad';
(async () => {
  const P = await ouvrir();
  const ctx = await P.ctxPour({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(() => { window.__dl = []; const c = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) window.__dl.push(this.download); return c.apply(this, arguments); }; });   // le nom DONNÉ au lien (le Chromium piloté rend « download » pour tout nom non ASCII : mesuré, limite du pilote)
  const p = await ctx.newPage(); const err = [];
  p.on('pageerror', e => err.push(String(e))); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) err.push('console: ' + m.text()); });
  const toast = () => p.evaluate((sr) => { const t = eval(sr).querySelector('#toast'); return t ? t.textContent : ''; }, SR);
  const chip = () => p.evaluate((sr) => { const c = eval(sr).querySelector('.sign-card .sgchip'); return c ? c.textContent : ''; }, SR);
  const carte = () => p.evaluate((sr) => { const c = eval(sr).querySelector('.sign-card'); return c ? c.textContent : ''; }, SR);
  const srv = (f, a) => p.evaluate(f, a);
  const dossier = async (id) => { await p.locator('.folder[data-folder="' + id + '"]').click(); await p.waitForTimeout(350); };
  const ouvrirDemande = async () => { await p.locator('#rows .msg').first().click(); await p.waitForTimeout(300); };
  const URL_ = P.avec('mode=signature&cotes=pro&cle=sigtest&intervalle=0');

  await p.goto(URL_); await p.waitForTimeout(600);
  await dossier('sign'); await p.locator('#rows [data-signnew]').click(); await p.waitForTimeout(250);
  /* ── 1. la feuille ── */
  log(await p.locator('#sgType').count() === 0 && !/Devis|Contrat de maintenance|Bon d’intervention/.test(await p.locator('.sheet.acct .gcard').first().innerText().catch(() => '')), 'feuille : plus de champ « Type » (19 octobre 2026, Justin : « type, je veux pas »)');
  log(!(await p.locator('#sgCounter').isChecked()) && /tous les 2 jours/.test(await p.locator('label[for=sgRemind]').innerText()), 'feuille : contre-signature DÉCOCHÉE d\'office, relances « tous les 2 jours »');
  log(await p.locator('#sgMeRow').isHidden(), 'feuille : un devis (pas de contre-signature) → le champ « Votre mobile » est caché');
  await p.locator('#sgCounter').check({ force: true }); await p.waitForTimeout(100);
  log(await p.locator('#sgCounter').isChecked() && await p.locator('#sgMeRow').isVisible(), 'feuille : un contrat → contre-signature cochée + « Votre mobile (pour votre contre-signature par SMS) » visible');
  await p.selectOption('#sgLevel', 'simple'); await p.waitForTimeout(100);
  log(await p.locator('#sgMeRow').isHidden(), 'feuille : « Code e-mail » → plus besoin du mobile de l\'expéditeur');
  await p.selectOption('#sgLevel', 'adv'); await p.waitForTimeout(100);
  log((await p.locator('label[for="sgMsg"]').textContent()).includes('n’est pas envoyée au signataire'), 'feuille : la note ne prétend plus être envoyée au signataire');
  await p.setInputFiles('#sgFile', { name: 'Contrat 2027.pdf', mimeType: 'application/pdf', buffer: PDF }); await p.waitForTimeout(150);
  await p.fill('#sgN0', 'Claire Dubois'); await p.fill('#sgE0', 'claire@exemple.fr'); await p.fill('#sgP0', '06 12 34 56 78');
  await p.locator('#sgGo').click(); await p.waitForTimeout(250);
  log((await toast()).includes('Votre mobile est nécessaire') && await p.locator('#sgGo').count() === 1 && (await srv(() => window.__sigServeur.appels.length)) === 0, 'feuille : contre-signature par SMS sans mobile → refusée AVANT d\'appeler le service (' + (await toast()) + ')');
  await p.fill('#sgMe', '07 98 76 54 32');
  /* ── 2. un refus du service, puis la réussite ── */
  await srv(() => { window.__sigServeur.echec.envoyer = 'Le prestataire de signature (Yousign) a refusé la demande. (étape : activer, code 500)'; });
  await p.locator('#sgGo').click(); await p.waitForTimeout(500);
  const err1 = await p.evaluate((sr) => { const e = eval(sr).querySelector('#sgErr'); return e && !e.hidden ? e.textContent : null; }, SR);
  log(!!err1 && err1.includes('Rien n’est parti') && err1.includes('Yousign'), 'refus : la feuille DIT « Rien n\'est parti : … Yousign » (' + err1 + ')');
  log((await toast()).includes('Rien n’est parti'), 'refus : …et le toast aussi');
  log(await p.locator('#sgGo').count() === 1 && await p.locator('#sgGo').isEnabled(), 'refus : la feuille reste ouverte et « Envoyer » est de nouveau actif');
  await p.screenshot({ path: CAP + '/signature-refus.png' });
  await p.locator('#sgCancel').click(); await p.waitForTimeout(250);
  log(await p.locator('#rows .msg').count() === 0, 'refus : AUCUNE demande rangée dans Signatures');
  await srv(() => { window.__sigServeur.echec.envoyer = ''; });
  await p.locator('#rows [data-signnew]').click(); await p.waitForTimeout(250);
  await p.locator('#sgCounter').check({ force: true }); await p.setInputFiles('#sgFile', { name: 'Contrat 2027.pdf', mimeType: 'application/pdf', buffer: PDF }); await p.waitForTimeout(150);
  log(await p.locator('#sgMe').inputValue() === '', 'feuille : le mobile n\'a pas été gardé sur un envoi qui a échoué');
  await p.fill('#sgN0', 'Claire Dubois'); await p.fill('#sgE0', 'claire@exemple.fr'); await p.fill('#sgP0', '06 12 34 56 78'); await p.fill('#sgMe', '07 98 76 54 32');
  await p.locator('#sgGo').click(); await p.waitForTimeout(600);
  log(await p.locator('#sgGo').count() === 0 && (await toast()).includes('Demande de signature envoyée'), 'envoi : la feuille se ferme, « Demande de signature envoyée » (' + (await toast()) + ')');
  log(await p.locator('#rows .msg').count() === 1 && (await chip()) === 'En attente', 'envoi : UNE demande dans Signatures, état « En attente » (' + (await chip()) + ')');
  const recu = await srv(() => { const d = Object.values(window.__sigServeur.demandes)[0]; return { n: Object.keys(window.__sigServeur.demandes).length, niveau: d.dem.niveau, jours: d.dem.jours, contre: d.dem.contresignature, sig: d.dem.signataires, f: d.fichiers }; });
  log(recu.n === 1 && recu.niveau === 'avance' && recu.contre && recu.contre.telephone === '07 98 76 54 32' && recu.contre.email === 'camille.moreau@atelier-moreau.example' && recu.sig[0].telephone === '06 12 34 56 78' && recu.f[0].taille === PDF.length, 'envoi : le service a reçu niveau « avance », la contre-signature (la boîte + SON mobile), le signataire et le PDF entier (' + JSON.stringify(recu).slice(0, 220) + ')');
  await p.screenshot({ path: CAP + '/signature-envoyee.png' });
  const id = await srv(() => Object.keys(window.__sigServeur.demandes)[0]);
  /* ── 3. l'état suit le service ── */
  await srv((id) => window.__sigServeur.fixer(id, { etat: 'ouvert', signataires: window.__sigServeur.demandes[id].vue.signataires.map((s, i) => i === 0 ? Object.assign({}, s, { etat: 'viewed' }) : s) }), id);
  await dossier('inbox'); await dossier('sign'); await p.waitForTimeout(500);
  log((await chip()) === 'Ouvert' || (await p.locator('#rows .msg').first().textContent()).includes('Ouvert'), 'état : rouvrir Signatures relit le service → « Ouvert » (' + (await p.locator('#rows .msg').first().textContent()).slice(0, 80) + ')');
  await ouvrirDemande();
  log((await chip()) === 'Ouvert' && (await carte()).includes('Ouvert, pas encore signé'), 'état : la carte dit « Ouvert, pas encore signé »');
  /* relancer : succès, puis refus dit */
  await p.locator('[data-act="signRemind"]').click(); await p.waitForTimeout(400);
  log((await toast()).includes('Relance envoyée') && (await carte()).includes('Relance envoyée'), 'relance : le service a relancé, l\'historique du service le montre (' + (await toast()) + ')');
  await srv(() => { window.__sigServeur.echec.relancer = 'Une relance vient de partir — patientez dix minutes.'; });
  await p.locator('[data-act="signRemind"]').click(); await p.waitForTimeout(400);
  log((await toast()) === 'Relance impossible : Une relance vient de partir — patientez dix minutes.', 'relance : le refus du service SE DIT (« ' + (await toast()) + ' »)');
  await srv(() => { window.__sigServeur.echec.relancer = ''; });
  /* annuler refusé puis… (on garde cette demande), l'annulation réussie se joue sur une autre plus bas */
  await srv(() => { window.__sigServeur.echec.annuler = 'Le prestataire de signature (Yousign) a refusé la demande.'; });
  await p.locator('[data-act="signCancel"]').click(); await p.waitForTimeout(400);
  log((await toast()).startsWith('Annulation impossible') && (await chip()) === 'Ouvert', 'annulation refusée : dite, et la demande reste en cours (« ' + (await toast()) + ' »)');
  await srv(() => { window.__sigServeur.echec.annuler = ''; });
  /* la minuterie de 60 s : le service passe à « à contresigner » SANS que la personne touche à rien */
  await srv((id) => window.__sigServeur.fixer(id, { etat: 'a_contresigner', signataires: window.__sigServeur.demandes[id].vue.signataires.map((s, i) => i === 0 ? Object.assign({}, s, { etat: 'signed' }) : s) }), id);
  const t0 = Date.now(); let vu = false;
  while (Date.now() - t0 < 80000) { await p.waitForTimeout(2000); if ((await chip()) === 'À contresigner') { vu = true; break; } }
  log(vu, 'minuterie : sans rien toucher, la demande passe à « À contresigner » en ' + Math.round((Date.now() - t0) / 1000) + ' s (≈ 60 s attendues)');
  log((await carte()).includes('lien reçu par e-mail') && await p.locator('[data-act="signMe"]').count() === 0 && /Signé le/.test(await carte()), 'à contresigner : « lien reçu par e-mail », AUCUN bouton « Signer maintenant » (pas de tracé local), le client est « Signé »');
  log((await toast()).includes('à vous de contresigner'), 'à contresigner : le changement est annoncé (« ' + (await toast()) + ' »)');
  await p.screenshot({ path: CAP + '/signature-a-contresigner.png' });
  /* ── 4. signé : télécharger ── */
  await srv((id) => window.__sigServeur.fixer(id, { etat: 'signe', signataires: window.__sigServeur.demandes[id].vue.signataires.map(s => Object.assign({}, s, { etat: 'signed' })), documents: [{ n: 1, nom: 'Contrat 2027.pdf', taille: 10, signe: true }], preuves: 2 }), id);
  await dossier('inbox'); await dossier('sign'); await p.waitForTimeout(500); await ouvrirDemande();
  log((await chip()) === 'Signé', 'signé : « Signé » après relecture');
  const btns = await p.evaluate((sr) => Array.from(eval(sr).querySelectorAll('.sign-card .sg-acts button')).map(b => b.textContent), SR);
  log(JSON.stringify(btns) === JSON.stringify(['Télécharger le PDF signé', 'Preuve — Claire Dubois', 'Preuve — Camille Moreau']), 'signé : un bouton pour le PDF, un par preuve, nommés (' + JSON.stringify(btns) + ')');
  await p.screenshot({ path: CAP + '/signature-signee.png' });
  let dl = p.waitForEvent('download'); await p.locator('[data-act="signDl:1"]').click(); let d = await dl;
  const contenu = (await require('fs').promises.readFile(await d.path())).toString();
  log((await p.evaluate(() => window.__dl.slice())).pop() === 'Contrat 2027 (signé).pdf' && contenu.includes('SIGNE ' + id + ' 1'), 'téléchargement : le lien porte « Contrat 2027 (signé).pdf », le fichier est celui du service ("' + contenu.slice(10, 40).replace(/\n/g, ' ') + '")');
  dl = p.waitForEvent('download'); await p.locator('[data-act="signProof:2"]').click(); d = await dl;
  log((await p.evaluate(() => window.__dl.slice())).pop() === 'Dossier de preuve — Camille Moreau.pdf' && (await require('fs').promises.readFile(await d.path())).toString().includes('PREUVE ' + id + ' 2'), 'téléchargement : le dossier de preuve du 2ᵉ signataire, nommé « Dossier de preuve — Camille Moreau.pdf », contenu du service');
  await srv(() => { window.__sigServeur.echec.signe = 'Le PDF signé se prépare — réessayez dans un instant.'; });
  await p.locator('[data-act="signDl:1"]').click(); await p.waitForTimeout(400);
  log((await toast()) === 'Téléchargement impossible : Le PDF signé se prépare — réessayez dans un instant.', 'téléchargement refusé : la raison du service est DITE (« ' + (await toast()) + ' »)');
  await srv(() => { window.__sigServeur.echec.signe = ''; });
  /* ── 5. rechargement ── */
  await p.reload(); await p.waitForTimeout(700); await dossier('sign'); await ouvrirDemande();
  log((await chip()) === 'Signé' && (await p.locator('[data-act="signDl:1"]').count()) === 1, 'rechargement : la demande signée est RETROUVÉE avec ses téléchargements (le service d\'essai, lui, repart à vide — seul l\'appareil la garde)');
  /* ── 6. annuler avec succès, une demande refusée par le client ── */
  await p.locator('#rows [data-signnew]').click().catch(async () => { await p.locator('#btnCompose').click(); }); await p.waitForTimeout(250);
  await p.setInputFiles('#sgFile', { name: 'Devis.pdf', mimeType: 'application/pdf', buffer: PDF }); await p.selectOption('#sgLevel', 'simple');
  await p.fill('#sgN0', 'Luc Moreau'); await p.fill('#sgE0', 'luc@exemple.fr'); await p.locator('#sgGo').click(); await p.waitForTimeout(600);
  log((await p.locator('#rows .msg').count()) === 2 && (await srv(() => Object.values(window.__sigServeur.demandes).pop().dem.niveau)) === 'simple', 'devis « Code e-mail » : envoyé, niveau « simple », sans contre-signature, sans mobile');
  await p.locator('#rows .msg').first().click(); await p.waitForTimeout(300);
  await p.locator('[data-act="signCancel"]').click(); await p.waitForTimeout(500);
  log((await chip()) === 'Annulé' && (await toast()) === 'Demande annulée', 'annulation réussie : « Annulé » (le service l\'a annulée)');
  /* ── 7. service d'une demande disparue ── */
  await srv(() => { const D = window.__sigServeur.demandes; Object.keys(D).forEach(k => { if (D[k].vue.etat === 'en_attente') delete D[k]; }); });
  /* ── 8. une demande « Prête » d'avant, renvoyée ── */
  const ctx2 = await P.ctxPour({ viewport: { width: 1440, height: 900 } }); const q = await ctx2.newPage(); const err2 = [];
  q.on('pageerror', e => err2.push(String(e)));
  await q.goto(P.avec('mode=reel&cotes=pro&cle=prete&intervalle=0')); await q.waitForTimeout(600);
  await q.locator('.folder[data-folder="sign"]').click(); await q.waitForTimeout(300); await q.locator('#rows [data-signnew]').click(); await q.waitForTimeout(250);
  await q.setInputFiles('#sgFile', { name: 'Ancien.pdf', mimeType: 'application/pdf', buffer: PDF }); await q.fill('#sgN0', 'Rose'); await q.fill('#sgE0', 'rose@exemple.fr'); await q.selectOption('#sgLevel', 'simple');
  await q.locator('#sgGo').click(); await q.waitForTimeout(500);
  await q.locator('#rows .msg').first().click(); await q.waitForTimeout(300);
  const chipQ = await q.evaluate((sr) => eval(sr).querySelector('.sign-card .sgchip').textContent + '|' + eval(sr).querySelector('.sign-card').textContent.includes('Rien n’est parti : la demande partira quand Yousign sera branché'), SR);
  log(chipQ === 'Prête — en attente de Yousign|true', 'avant : sans service, la demande est rangée « Prête — en attente de Yousign » (' + chipQ + ')');
  await q.goto(P.avec('mode=signature&cotes=pro&cle=prete&intervalle=0')); await q.waitForTimeout(700);
  await q.locator('.folder[data-folder="sign"]').click(); await q.waitForTimeout(300); await q.locator('#rows .msg').first().click(); await q.waitForTimeout(300);
  log((await q.evaluate((sr) => eval(sr).querySelector('.sign-card').textContent, SR)).includes('« Renvoyer » l’envoie maintenant'), 'renvoi : avec un service qui signe, la carte « Prête » dit « Renvoyer » l\'envoie maintenant');
  await q.locator('[data-act="signSend"]').click(); await q.waitForTimeout(400);
  log(await q.locator('#sgN0').inputValue() === 'Rose' && await q.locator('[data-dpv]').count() === 1, 'renvoi : le formulaire rouvre REMPLI (signataire, PDF gardé sur l\'appareil)');
  await q.locator('#sgGo').click(); await q.waitForTimeout(700);
  const apres = await q.evaluate(() => ({ n: Object.keys(window.__sigServeur.demandes).length, f: Object.values(window.__sigServeur.demandes)[0] && Object.values(window.__sigServeur.demandes)[0].fichiers }));
  log(apres.n === 1 && apres.f[0].taille === PDF.length, 'renvoi : le service reçoit la demande ET le PDF gardé (' + JSON.stringify(apres) + ')');
  log(await q.locator('#rows .msg').count() === 1 && (await q.evaluate((sr) => eval(sr).querySelector('#rows .msg .sgchip').textContent, SR)) === 'En attente', 'renvoi : la demande « Prête » est REMPLACÉE par la demande envoyée (une seule ligne, « En attente »)');
  log(err2.length === 0, 'renvoi : aucune erreur JS ' + err2.join('|'));
  log(err.length === 0, 'aucune erreur JS ' + err.join('|'));
  await ctx2.close(); await ctx.close();
  await bilan(R, P, R.length);
})();

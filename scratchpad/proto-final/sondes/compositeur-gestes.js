// SONDE DURABLE du compositeur (lot « compositeur », étape 3 « corriger », 17 novembre 2026) — les GESTES : chaque contrôle garde un défaut de la relecture adverse « tout ».
//   tout-06 un double clic sur « Créer » n'ouvre pas la fenêtre d'envoi · tout-10 Tab dans la confirmation d'abandon · tout-14 la pastille « Modifié » dès la première lettre
//   tout-12 un client qui existe déjà se propose · tout-07 un brouillon se supprime (et rend son numéro) · tout-05 un prix se lit à deux décimales · tout-09 pas de pastille vide, des prestations au catalogue
// PROFIL=mac|windows|ipad|iphone|android|petit  NUIT=0|1  node compositeur-gestes.js — rend « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
const A = require('./atelier-outils.js'), L = A.L, v = L.v;
const pr = process.env.PROFIL || 'mac', nuit = process.env.NUIT === '1', tag = 'cgest-' + pr + (nuit ? '-nuit' : '-jour');
const CAP = (process.env.CAP || A.CAP) + '';
const clic = async (c, f, s, opt) => { const l = f.locator(s).first(); try { if (c.doigt) await l.tap({ timeout: 5000, ...opt }); else await l.click({ timeout: 5000, ...opt }); }
  catch (e) { const pile = await f.evaluate(sel => { const t = document.querySelector(sel); if (!t) return 'cible absente'; const r = t.getBoundingClientRect(); return document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).slice(0, 5).map(x => x.tagName + '.' + String(x.className).slice(0, 30)).join(' > '); }, s.split(',')[0]).catch(() => '?'); console.log('  ! clic raté sur', s, '→', pile); throw e; }
  await c.p.waitForTimeout(170); };
const fermee = p => p.evaluate(() => { const z = document.getElementById('opdz'); return !z || z.hidden; });
(async () => {
  const c = await L.ouvrir({ profil: pr, nuit, qui: 'marc' }), p = c.p; console.log('── ' + tag);
  // ── tout-06 : un double clic sur « Créer » (devis, puis contrat) ─────────────────────────────────────────────────────────────────────────
  for (const type of ['devis', 'contrat']) {
    await L.aller(p, type === 'devis' ? 'devis' : 'contrats'); const f = await A.ouvrirAtelier(c, type, null); await L.calme(p, 900);
    if (type === 'devis') { await clic(c, f, '[data-vv="client"][data-id="vp"]'); await clic(c, f, '[data-vv="art-add"][data-id="EL-ALL"]'); }
    else { await clic(c, f, '[data-vv="client"][data-id="mi"]'); await clic(c, f, '[data-vv="tpl"][data-v="part"]'); }
    await L.calme(p, 500);
    const b = await f.locator('[data-act="vierge-creer"]:visible').first().boundingBox(); await p.mouse.dblclick(b.x + b.width / 2, b.y + b.height / 2); await p.waitForTimeout(1500);
    const e = await f.evaluate(() => ({ editeur: S.vue === 'editeur', dialogue: [...document.querySelectorAll('.fen-v .fenetre')].map(x => x.innerText.replace(/\s+/g, ' ').slice(0, 50)) }));
    // au téléphone, un contrat créé ouvre SA feuille « Contrat » (ce qui manque) : c'est voulu ; ce qui ne doit pas s'ouvrir, c'est l'envoi
    v(`${tag} ${type} · un double clic sur « Créer » ouvre l'éditeur et PAS la fenêtre d'envoi`, e.editeur && !e.dialogue.some(t => /^Envoyer/.test(t)), e);
    // un NOUVEAU geste, plus tard, passe : « Envoyer » répond (quand le bouton est à l'écran : au téléphone il vit dans la barre du bas)
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    if (await f.locator('[data-act="envoyer"]:visible').count()) { await clic(c, f, '[data-act="envoyer"]:visible'); await p.waitForTimeout(700);
      v(`${tag} ${type} · un toucher volontaire sur « Envoyer », après, ouvre bien l'envoi`, await f.evaluate(() => !!document.querySelector('.fen-v .fenetre')), null);
      await p.keyboard.press('Escape'); await p.waitForTimeout(500); }
    await clic(c, f, '[data-act="retour"]:visible'); await p.waitForTimeout(1100);
  }
  // ── tout-10 : Tab et Entrée dans la confirmation « Abandonner ce devis ? » ────────────────────────────────────────────────────────────────
  if (!c.doigt) {
    await L.aller(p, 'devis'); const f = await A.ouvrirAtelier(c, 'devis', null); await L.calme(p, 900);
    await f.locator('#vv-objet').fill('Du contenu'); await f.locator('#vv-objet').press('Tab'); await p.waitForTimeout(200);
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    const ou = () => f.evaluate(() => ({ d: !!document.querySelector('.dialogue'), r: document.activeElement.dataset && document.activeElement.dataset.r }));
    let e = await ou(); v(`${tag} · Échap ouvre la confirmation, le focus est sur « Continuer »`, e.d && e.r === '0', e);
    await p.keyboard.press('Tab'); await p.waitForTimeout(200); e = await ou();
    v(`${tag} · Tab passe de « Continuer » à « Abandonner » (le piège de la fenêtre ne le reprend pas)`, e.r === '1', e);
    await p.keyboard.press('Shift+Tab'); await p.waitForTimeout(200); e = await ou(); v(`${tag} · Maj+Tab revient sur « Continuer »`, e.r === '0', e);
    await p.keyboard.press('Tab'); await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
    v(`${tag} · Entrée sur « Abandonner » ferme la confirmation ET le compositeur (au clavier seul)`, !(await ou()).d && await fermee(p), null);
  }
  // ── tout-14 : la pastille « Modifié » dès la première lettre (contrat) ───────────────────────────────────────────────────────────────────
  {
    await L.aller(p, 'contrats'); const f = await A.ouvrirAtelier(c, 'contrat', null); await L.calme(p, 900);
    await clic(c, f, '[data-vv="client"][data-id="mi"]'); await clic(c, f, '[data-vv="tpl"][data-v="part"]'); await p.waitForTimeout(350);
    const pas = await f.locator('#vv-lig .vv-opt-b').count();
    await f.locator('[data-vv="a-edit"]').first().evaluate(e => e.scrollIntoView({ block: 'center' })); await clic(c, f, '[data-vv="a-edit"]'); await p.waitForTimeout(300);
    const ta = f.locator('#vv-lig textarea').first(); await ta.press('End'); await ta.pressSequentially('!', { delay: 20 }); await p.waitForTimeout(120);
    const ap = await f.evaluate(() => ({ pastilles: [...document.querySelectorAll('#vv-lig .vv-opt-b')].length, ouverte: !!document.querySelector('#vv-lig textarea') && document.activeElement === document.querySelector('#vv-lig textarea') }));
    v(`${tag} · avant la frappe : aucun article « Modifié » (${pas})`, pas === 0, pas);
    v(`${tag} · une seule lettre tapée : la pastille « Modifié » paraît tout de suite, la zone de saisie garde le doigt`, ap.pastilles === 1 && ap.ouverte, ap);
    await ta.pressSequentially('?', { delay: 20 }); v(`${tag} · une seconde lettre ne double pas la pastille`, (await f.locator('#vv-lig .vv-opt-b').count()) === 1, null);
    await p.keyboard.press('Escape'); await p.waitForTimeout(400); await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    if (await f.locator('.dialogue').count()) { await clic(c, f, '.dialogue button[data-r="1"]'); await p.waitForTimeout(900); }
  }
  // ── tout-12 : un client qui existe déjà se propose ─────────────────────────────────────────────────────────────────────────────────────
  {
    await L.aller(p, 'devis'); const f = await A.ouvrirAtelier(c, 'devis', null); await L.calme(p, 900);
    const nb = () => f.evaluate(() => S.clients.length), form = (n, val) => f.locator(`.nv-client [name="${n}"]`).fill(val);
    const n0 = await nb(), ouvrir = async () => { await clic(c, f, '[data-vv="client-nouveau"]'); await p.waitForTimeout(600); };
    await ouvrir(); await form('nom', 'Restaurant Le Vieux Port'); await form('email', 'marc@vieuxport.fr'); await form('tel', '06 12 34 56 78'); await clic(c, f, '.nv-client [data-ok]'); await p.waitForTimeout(400);
    let d = await f.evaluate(() => ({ msg: (document.querySelector('.nv-dbl') || {}).innerText, ok: (document.querySelector('.nv-client [data-ok]') || {}).textContent, utiliser: !!document.querySelector('.nv-dbl [data-utiliser]') }));
    v(`${tag} · même nom, même e-mail et même téléphone : « Ce client existe peut-être déjà », rien n'est créé (${n0} → ${await nb()})`, /existe peut-être déjà/.test(d.msg || '') && (await nb()) === n0 && d.utiliser, d);
    v(`${tag} · le bouton principal devient « Ajouter quand même » (le second geste est volontaire)`, /Ajouter quand même/.test(d.ok || ''), d.ok);
    await L.capture(c, CAP + tag + '-doublon.png');
    await clic(c, f, '.nv-dbl [data-utiliser]'); await p.waitForTimeout(700);
    const sel = await f.evaluate(() => ({ res: (document.querySelector('#vv-r-client') || {}).textContent, form: !!document.querySelector('.nv-client') }));
    v(`${tag} · « Utiliser ce client » choisit la fiche existante, sans en créer une seconde (${await nb()} clients)`, /Vieux Port/.test(sel.res || '') && !sel.form && (await nb()) === n0, sel);
    await ouvrir(); await form('nom', 'Restaurant Le Vieux Port'); await clic(c, f, '.nv-client [data-ok]'); await p.waitForTimeout(300);
    v(`${tag} · même nom seul : proposé aussi (accents et casse ignorés)`, await f.locator('.nv-dbl').count() === 1, null);
    await form('nom', 'Tout Autre Client ' + Date.now()); await p.waitForTimeout(250);
    v(`${tag} · changer le nom efface l'avertissement et rend « Ajouter ce client »`, (await f.locator('.nv-dbl').count()) === 0 && /Ajouter ce client/.test(await f.locator('.nv-client [data-ok]').textContent()), null);
    await form('email', 'marc@vieuxport.fr'); await clic(c, f, '.nv-client [data-ok]'); await p.waitForTimeout(300);
    v(`${tag} · même e-mail seul : proposé aussi`, (await f.locator('.nv-dbl').count()) === 1, null);
    await clic(c, f, '.nv-client [data-ok]'); await p.waitForTimeout(800);   // « Ajouter quand même »
    v(`${tag} · « Ajouter quand même » crée bien le client (${n0} → ${await nb()})`, (await nb()) === n0 + 1 && !(await f.locator('.nv-client').count()), null);
    await p.keyboard.press('Escape'); await p.waitForTimeout(500); if (await f.locator('.dialogue').count()) { await clic(c, f, '.dialogue button[data-r="1"]'); await p.waitForTimeout(900); }
  }
  // ── tout-05 et tout-09 : un prix à deux décimales ; le catalogue propose des prestations, aucune pastille vide ─────────────────────────────
  {
    await L.aller(p, 'devis'); const f = await A.ouvrirAtelier(c, 'devis', null); await L.calme(p, 900);
    await clic(c, f, '[data-vv="client"][data-id="vp"]');
    const pas = await f.evaluate(() => [...document.querySelectorAll('#vv-cats .vv-pas')].map(b => b.textContent.trim()));
    v(`${tag} · le catalogue montre des catégories (population : ${pas.length} pastilles)`, pas.length >= 3, pas);
    const vides = []; for (const nom of pas.filter(x => !/^Tout|^Mon matériel/.test(x))) { await f.locator('#vv-cats .vv-pas', { hasText: nom }).first().evaluate(b => b.click()); await p.waitForTimeout(200); const n = await f.evaluate(() => document.querySelectorAll('#vv-cat .vv-art').length); if (!n) vides.push(nom); }
    v(`${tag} · aucune pastille de catégorie ne mène à une liste vide (sauf « Mon matériel »)`, vides.length === 0, vides);
    await f.locator('#vv-cats .vv-pas', { hasText: 'Main-d’œuvre' }).first().evaluate(b => b.click()); await p.waitForTimeout(250);
    const mo = await f.evaluate(() => [...document.querySelectorAll('#vv-cat .vv-art b')].map(b => b.textContent.trim()));
    v(`${tag} · « Main-d'œuvre » propose la main-d'œuvre technicien, au tarif réglé dans OP GESTION`, mo.some(t => /Main-d’œuvre technicien/.test(t)), mo);
    await f.locator('#vv-cats .vv-pas', { hasText: 'Déplacement' }).first().evaluate(b => b.click()); await p.waitForTimeout(250);
    v(`${tag} · « Déplacement » propose les trois zones`, (await f.locator('#vv-cat .vv-art').count()) === 3, await f.locator('#vv-cat .vv-art').count());
    await clic(c, f, '[data-vv="art-add"][data-id="DEP-Z1"]'); await p.waitForTimeout(300);
    const pu = f.locator('[data-vv-p]').first(); const v0 = await pu.inputValue();
    v(`${tag} · le prix d'une zone (29,17 €) se lit « 29,17 » dans son champ (${v0})`, v0 === '29,17', v0);
    await pu.fill('199,9'); await pu.blur(); await p.waitForTimeout(200); const v1 = await pu.inputValue();
    v(`${tag} · « 199,9 » tapé puis champ quitté : se relit « 199,90 » comme la page (${v1})`, v1 === '199,90', v1);
    await pu.fill('62,5'); await pu.blur(); await p.waitForTimeout(200); const v2 = await pu.inputValue(); v(`${tag} · « 62,5 » → « 62,50 » (${v2})`, v2 === '62,50', v2);
    await pu.fill('1234'); await pu.blur(); await p.waitForTimeout(200); const v3 = await pu.inputValue(); v(`${tag} · « 1234 » → « 1234,00 » (${v3})`, v3 === '1234,00', v3);
    await pu.fill('abc'); await pu.blur(); await p.waitForTimeout(200); const v4 = await pu.inputValue(); v(`${tag} · une saisie fausse reste telle quelle avec son message (${v4})`, v4 === 'abc' && await pu.getAttribute('aria-invalid') === 'true', v4);
    await p.keyboard.press('Escape'); await p.waitForTimeout(500); if (await f.locator('.dialogue').count()) { await clic(c, f, '.dialogue button[data-r="1"]'); await p.waitForTimeout(900); }
  }
  // ── tout-07 : un brouillon se supprime, et son numéro se rend ──────────────────────────────────────────────────────────────────────────
  for (const type of ['devis', 'contrat']) {
    await L.aller(p, type === 'devis' ? 'devis' : 'contrats'); const f = await A.ouvrirAtelier(c, type, null); await L.calme(p, 900);
    const n0 = await p.evaluate(() => ATD.docs.length);
    if (type === 'devis') { await clic(c, f, '[data-vv="client"][data-id="vp"]'); await clic(c, f, '[data-vv="art-add"][data-id="EL-ALL"]'); } else { await clic(c, f, '[data-vv="client"][data-id="mi"]'); await clic(c, f, '[data-vv="tpl"][data-v="part"]'); }
    await clic(c, f, '[data-act="vierge-creer"]:visible'); await p.waitForTimeout(1300); await p.waitForTimeout(500);
    const nSuiv = await p.evaluate(t => t === 'devis' ? dvNum() : ctrNum(), type);
    const plus = f.locator('#b-plus'); const vis = await plus.isVisible();
    v(`${tag} ${type} · le menu « ⋯ » de l'éditeur est là (${c.largeur} px) pour un brouillon`, vis, null);
    await clic(c, f, '#b-plus'); await p.waitForTimeout(350);
    const items = await f.evaluate(() => [...document.querySelectorAll('.menu button, [role="menu"] button, .pop button')].map(b => b.textContent.trim()).filter(Boolean));
    await L.capture(c, CAP + tag + '-menu-' + type + '.png');
    v(`${tag} ${type} · le menu propose « Supprimer ce brouillon »`, items.some(t => /Supprimer ce brouillon/.test(t)), items);
    if (!c.doigt && c.largeur > 760) v(`${tag} ${type} · à l'ordinateur le menu ne répète pas ce que la barre montre déjà (${items.length} geste)`, items.length === 1, items);
    await f.locator('button', { hasText: 'Supprimer ce brouillon' }).first().click(); await p.waitForTimeout(450);
    v(`${tag} ${type} · une confirmation demande avant de supprimer`, (await f.locator('.dialogue').count()) === 1 && /Supprimer ce brouillon/.test(await f.locator('.dialogue').innerText()), null);
    await clic(c, f, '.dialogue button[data-r="0"]'); await p.waitForTimeout(500);
    v(`${tag} ${type} · « Annuler » garde le brouillon (rien n'est supprimé)`, (await f.evaluate(() => S.vue === 'editeur')) && (await p.evaluate(() => ATD.docs.length)) === n0 + 1, null);
    await clic(c, f, '#b-plus'); await p.waitForTimeout(300); await f.locator('button', { hasText: 'Supprimer ce brouillon' }).first().click(); await p.waitForTimeout(400); await clic(c, f, '.dialogue button[data-r="1"]'); await p.waitForTimeout(1500);
    const apres = await p.evaluate(() => ATD.docs.length), nApres = await p.evaluate(t => t === 'devis' ? dvNum() : ctrNum(), type);
    v(`${tag} ${type} · supprimé : l'atelier se ferme et la liste d'OP GESTION perd ce document (${n0 + 1} → ${apres})`, apres === n0 && await fermee(p), [n0, apres]);
    v(`${tag} ${type} · son numéro se rend (le prochain était ${nSuiv}, redevient ${nApres})`, nApres !== nSuiv, [nSuiv, nApres]);
    // un document ENVOYÉ ne se supprime pas ainsi : pas de menu de suppression (jouée plus bas, sur un devis réellement envoyé)
  }
  {
    await L.aller(p, 'devis'); const f = await A.ouvrirAtelier(c, 'devis', null); await L.calme(p, 900);
    await clic(c, f, '[data-vv="client"][data-id="vp"]'); await clic(c, f, '[data-vv="art-add"][data-id="EL-ALL"]'); await clic(c, f, '[data-act="vierge-creer"]:visible'); await p.waitForTimeout(1800);
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    await clic(c, f, '[data-act="envoyer"]:visible'); await p.waitForTimeout(700); await f.locator('[data-act="env-go"]:visible').first().click(); await p.waitForTimeout(1500);
    const etat = await f.evaluate(() => D().etat); v(`${tag} devis envoyé · le devis est bien à « envoye » (la contre-épreuve joue un document envoyé)`, etat === 'envoye', etat);
    if (await f.locator('#b-plus').isVisible()) { await clic(c, f, '#b-plus'); await p.waitForTimeout(350);
      const items = await f.evaluate(() => [...document.querySelectorAll('.menu button, [role="menu"] button, .pop button')].map(b => b.textContent.trim()).filter(Boolean));
      v(`${tag} devis envoyé · le menu « ⋯ » (${items.length} gestes) ne propose PAS « Supprimer ce brouillon »`, items.length >= 1 && !items.some(t => /Supprimer ce brouillon/.test(t)), items); await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
    else v(`${tag} devis envoyé · pas de menu « ⋯ » du tout (donc pas de suppression)`, true, null);
  }
  v(tag + ' · aucune erreur JavaScript', c.err.length === 0, c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ERREUR SONDE', e.message.slice(0, 700)); process.exit(2); });

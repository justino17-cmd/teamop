// Angle « ponts » · sonde 5 : LES FICHIERS QUE LA PERSONNE CHOISIT (cartes grises, fiches de paie, tickets) — un fichier venu d'ailleurs (un cabinet, un fournisseur, un courriel)
// est-il ouvert avec SON type (HTML, SVG) dans un onglet de l'origine de l'application ? Le prototype range ces fichiers en « blob: », dont l'ORIGINE est celle de la page :
// un SVG ou un HTML ouvert en document y exécute ses scripts, avec le rangement de l'appareil à portée.
// Témoin : un PDF (type application/pdf) s'ouvre sans exécuter quoi que ce soit.
const L = require('../lib.js'), fs = require('fs');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/ponts/';
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60" onload="window.__pwn={o:location.origin,cles:Object.keys(localStorage)};document.title=\'PWN\'"><rect width="200" height="60" fill="#ccc"/><text x="8" y="36">attestation</text></svg>';
const HTML = '<!doctype html><title>x</title><script>window.__pwn={o:location.origin,cles:Object.keys(localStorage)};document.title="PWN"</script><p>Bulletin</p>';

const SVG_CHAINE = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60" onload="try{localStorage.setItem(\'opg_proto_espace\',\'clim-services-17\');localStorage.setItem(\'opg_proto_fenetre\',JSON.stringify({k:\'marc\',vue:\'equipe\',mode:\'jour\',t:Date.now()}));location.replace(location.origin+\'/apercu/prototype-op-gestion.html?app=1\')}catch(e){document.title=\'ERR \'+e}"><rect width="200" height="60" fill="#ccc"/></svg>';
(async () => {
  fs.mkdirSync(CAP, { recursive: true });
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1500 }), p = c.p;
  await p.evaluate(() => { localStorage.setItem('opg_secret_essai', 'valeur-du-rangement'); });
  // ── 1. Véhicules › Papiers › « Ajouter un document » : une image « image/svg+xml » est acceptée (accept=image/*) et sa miniature est un lien ouvert dans un onglet ──
  const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==', 'base64');
  const ajouterDoc = async (nom, type, buf, cle) => { await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} vehFiche('veh1', 'papiers'); }); await p.waitForTimeout(700);
    const a = p.locator('[data-vh="docadd|veh1"]').first(); if (!(await a.count())) return null; await a.click(); await p.waitForTimeout(450);
    await p.locator('#vh-dk').selectOption(cle).catch(() => {}); await p.locator('#vh-df').setInputFiles({ name: nom, mimeType: type, buffer: buf }); await p.waitForTimeout(200);
    await p.locator('[data-vh="docok|veh1"]').first().click(); await p.waitForTimeout(800);
    return p.evaluate(k => { const d = (VEHICULES[0].docs || {})[k]; return d ? { type: d.type, blob: /^blob:/.test(d.url || '') } : null; }, cle); };
  L.v('population : le bouton « Ajouter un document » existe sur la fiche du véhicule', await (async () => { await p.evaluate(() => vehFiche('veh1', 'papiers')); await p.waitForTimeout(700); return (await p.locator('[data-vh="docadd|veh1"]').count()) > 0; })());
  const tem = await ajouterDoc('photo.png', 'image/png', PNG, 'ct');
  L.v('témoin : une vraie photo PNG est acceptée comme document et sa miniature est un lien blob: (sans ça, un refus de SVG ne prouve rien)', !!tem && tem.blob && (await p.locator('a.vx-mini[href^="blob:"]').count()) >= 1, tem);
  const rSvg = await ajouterDoc('attestation.svg', 'image/svg+xml', Buffer.from(SVG), 'assur');
  console.log('document SVG :', rSvg ? 'ACCEPTÉ (' + rSvg.type + ')' : 'refusé');
  if (rSvg) {
    const lien = p.locator('a.vx-mini[href^="blob:"]').nth(await p.evaluate(() => [...document.querySelectorAll('a.vx-mini')].findIndex(a => /Attestation/.test(a.getAttribute('aria-label') || '')))).first();
    const [pop] = await Promise.all([c.ctx.waitForEvent('page', { timeout: 6000 }).catch(() => null), lien.click()]);
    if (pop) { await pop.waitForLoadState('load').catch(() => {}); await pop.waitForTimeout(600);
      const r = await pop.evaluate(() => ({ url: location.href.slice(0, 40), titre: document.title, pwn: window.__pwn || null })).catch(e => ({ erreur: e.message.slice(0, 80) }));
      console.log('onglet ouvert par la miniature :', JSON.stringify(r)); await pop.screenshot({ path: CAP + 'fichier-svg-onglet.png' }).catch(() => {});
      L.v('1. un SVG choisi comme « attestation d\'assurance » n\'exécute pas son script quand on ouvre la miniature (script exécuté : ' + (r.pwn ? 'OUI, origine ' + r.pwn.o : 'non') + ')', !r.pwn, r);
      await pop.close();
    } else L.v('1. la miniature ouvre un onglet', false, 'aucun onglet');
  } else L.v('1. un SVG choisi comme document de véhicule est REFUSÉ (rien n\'est rangé, aucun script ne peut s\'exécuter)', true);
  // ── 1b. la CHAÎNE : le même SVG, mais son script écrit le « passage de fenêtre » (opg_proto_fenetre, voir acces-03) et recharge l'application : on y arrive en GÉRANT, sans mot de passe ──
  await p.evaluate(() => { localStorage.removeItem('opg_proto_espace'); localStorage.removeItem('opg_proto_fenetre'); });
  const rCh = await ajouterDoc('carte-grise.svg', 'image/svg+xml', Buffer.from(SVG_CHAINE), 'carte');
  if (rCh) {
    const lien2 = p.locator('a.vx-mini[href^="blob:"]').nth(await p.evaluate(() => [...document.querySelectorAll('a.vx-mini')].findIndex(a => /Carte grise/.test(a.getAttribute('aria-label') || '')))).first();
    const [pop2] = await Promise.all([c.ctx.waitForEvent('page', { timeout: 6000 }).catch(() => null), lien2.click()]);
    if (pop2) { await pop2.waitForLoadState('load').catch(() => {}); await pop2.waitForTimeout(2500);
      const r2 = await pop2.evaluate(() => ({ url: location.pathname, session: typeof SESSION !== 'undefined' ? SESSION : null, role: typeof ROLE !== 'undefined' ? ROLE : null, titre: document.title })).catch(e => ({ erreur: e.message.slice(0, 80) }));
      console.log('chaîne : onglet après le SVG :', JSON.stringify(r2)); await pop2.screenshot({ path: CAP + 'fichier-svg-chaine-gerant.png' }).catch(() => {});
      L.v('1b. ouvrir la miniature d\'un SVG piégé ne donne PAS une session de gérant dans un nouvel onglet (session obtenue : ' + (r2.session || 'aucune') + ' / ' + (r2.role || '-') + ')', r2.session !== 'marc', r2);
      await pop2.close(); }
  } else L.v('1b. le SVG qui voulait prendre la session du gérant est REFUSÉ à l\'ajout', true);
  // ── 2. Paie › « Déposer les fiches de paie » (accept=application/pdf, non appliqué au dépôt) : un fichier .html nommé comme un salarié ──
  await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} PAIE.mode = 'cabinet'; paieRecevoir(); }); await p.waitForTimeout(500);
  let champ = (await p.locator('[data-paiefichiers]').count()) ? 'panneau « Les fiches de paie du cabinet »' : null;
  console.log('écran de dépôt des fiches de paie :', champ);
  L.v('population : le champ de dépôt des fiches de paie est atteint', !!champ);
  if (champ) {
    const nom = await p.evaluate(() => paieNomPers('kb'));
    await p.locator('[data-paiefichiers]').first().setInputFiles({ name: nom + '.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF') }); await p.waitForTimeout(600);
    L.v('témoin : un vrai PDF nommé comme un salarié est rangé comme fiche de paie (sans ça, un refus de HTML ne prouve rien)', await p.evaluate(() => !!(PAIE.bulletins.kb && /^blob:/.test(PAIE.bulletins.kb.url || ''))));
    const nom2 = await p.evaluate(() => paieNomPers('sm'));
    await p.locator('[data-paiefichiers]').first().setInputFiles({ name: nom2 + '.html', mimeType: 'text/html', buffer: Buffer.from(HTML) }); await p.waitForTimeout(700);
    const k = await p.evaluate(() => PAIE.bulletins.sm || null);
    console.log('fichier HTML déposé comme fiche de paie :', k ? 'ACCEPTÉ' : 'refusé');
    if (k && k.url) {
      const [pop] = await Promise.all([c.ctx.waitForEvent('page', { timeout: 6000 }).catch(() => null), p.evaluate(() => paieBulletinVoir('sm'))]);
      if (pop) { await pop.waitForLoadState('load').catch(() => {}); await pop.waitForTimeout(600);
        const r = await pop.evaluate(() => ({ titre: document.title, pwn: window.__pwn || null })).catch(e => ({ erreur: e.message.slice(0, 80) }));
        console.log('onglet ouvert par « fiche de paie » :', JSON.stringify(r));
        L.v('2. un fichier HTML déposé comme fiche de paie n\'exécute pas son script à l\'ouverture (script exécuté : ' + (r.pwn ? 'OUI, origine ' + r.pwn.o + ', clés ' + r.pwn.cles.join(',') : 'non') + ')', !r.pwn, r);
        await pop.close();
      } else L.v('2. la fiche de paie s\'ouvre dans un onglet', false, 'aucun onglet');
    } else L.v('2. un fichier HTML déposé comme fiche de paie est REFUSÉ (rangé nulle part, aucun script ne peut s\'exécuter)', true);
  }
  // ── 3. témoin : un PDF (type forcé par le navigateur d'après le fichier) ne s'exécute pas ; la même ouverture avec un Blob de type forcé est inerte ──
  const temPdf = await p.evaluate(async () => { const b = new Blob(['<script>window.__pwn=1<\/script>'], { type: 'application/pdf' }); const u = URL.createObjectURL(b); const w = window.open(u, '_blank', 'noopener'); return !!u; });
  console.log('témoin (Blob forcé en application/pdf) construit :', temPdf);
  console.log('erreurs page :', c.err.slice(0, 3)); await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });

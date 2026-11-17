// LE BAC MORD-IL ? (17 novembre 2026) — sans pont « downloads » (comme une vue où la capacité n'est pas accordée), les gestes d'export de la page
// principale posent leur lien « download » : le bac doit les COMPTER inertes. Joué sur la version d'AVANT les corrections (RACINE=<copie> AVANT=1),
// il doit en compter au moins 4 (CSV frais d'un véhicule, CSV coût des véhicules, FEC provisoire, PDF de l'atelier) ET une fenêtre ouverte à vide
// (bulletin de paie) ; joué sur la version corrigée, plus AUCUN lien inerte : la page dit ce qui se passe (« demandé », ou le texte à copier).
// ⛔ 127.0.0.1 seulement.
const A = require('./artefact-commun.js'), { bac, L, v } = A;
const AVANT = !!process.env.AVANT;
(async () => {
  const c = await bac.ouvrir({ profil: 'mac', qui: 'marc' }, { pont: false }); await A.calmer(c.p);
  const gestes = [
    ['CSV des frais d\'un véhicule', () => vxCsv(VEHICULES[0].id)],
    ['CSV du coût des véhicules', () => vhCsvFlotte()],
    ['FEC provisoire', () => cpFecTelecharger()],
    ['PDF de l\'atelier', () => { const el = document.createElement('div'); el.innerHTML = '<h1>Essai</h1><p>Bonjour</p>'; el.style.cssText = 'position:fixed;left:-9999px;width:600px'; document.body.appendChild(el); return pdfTelecharger(el, 'essai.pdf'); }],
  ];
  let inertes = 0; const dits = [];
  for (const [nom, f] of gestes) {
    await bac.zero(c); await c.p.evaluate(() => { const t = document.getElementById('toast'); if (t) t.textContent = ''; });
    await c.p.evaluate(f).catch(e => console.log('  · geste en erreur', nom, String(e.message).slice(0, 80))); await c.p.waitForTimeout(500);
    const e = await bac.etat(c), t = await c.p.evaluate(() => (document.getElementById('toast') || {}).textContent || ''), carte = await c.p.evaluate(() => !!document.getElementById('sortie-carte'));
    inertes += e.liensInertes.length; dits.push([nom, e.liensInertes.length, t.slice(0, 60), carte]);
    console.log('  ·', nom, '→ liens inertes', e.liensInertes.length, '·', t.slice(0, 70) || '(aucun message)', carte ? '· carte' : '');
    if (AVANT) v(`avant : « ${nom} » pose un lien inerte, compté par le bac`, e.liensInertes.length === 1, e.liensInertes);
    else v(`après : « ${nom} » n'est plus muet : un lien demandé avec sa phrase, ou le texte à copier (liens inertes ${e.liensInertes.length})`, (t.length > 10 && !/enregistré/.test(t)) || carte, { t, carte });
  }
  if (AVANT) v(`avant : au moins 4 téléchargements inertes recensés (${inertes})`, inertes >= 4, inertes);
  // le bulletin de paie choisi : window.open sur une adresse blob:
  await bac.zero(c);
  await c.p.evaluate(() => { const k = PT_GENS[0]; PAIE.bulletins[k] = { nom: 'bulletin-essai.pdf', le: '31/10', url: URL.createObjectURL(new File(['%PDF-1.4 x'], 'bulletin-essai.pdf', { type: 'application/pdf' })) }; paieBulletinVoir(k); });
  await c.p.waitForTimeout(500); const e = await bac.etat(c), pan = await c.p.evaluate(() => ((document.querySelector('#calque .panneau') || {}).textContent || '').slice(0, 80));
  if (AVANT) v(`avant : le bulletin de paie ouvre une fenêtre à vide (window.open compté : ${e.ouvertures.length}) et l'écran ne dit rien`, e.ouvertures.length === 1 && !pan, { o: e.ouvertures, pan });
  else v(`après : le bulletin s'ouvre DANS la page (fenêtre « ${pan.slice(0, 30)} »), aucune fenêtre à vide`, e.ouvertures.length === 0 && /bulletin-essai/.test(pan), { o: e.ouvertures, pan });
  await L.fin(c); await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });

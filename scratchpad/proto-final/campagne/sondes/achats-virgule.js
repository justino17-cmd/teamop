// Défaut candidat : dans « Combien ? » d'une demande d'achat, le champ est un <input type="number">. Une personne française tape
// « 1,5 » : que reçoit l'application ? (Chromium en fr-FR a longtemps AVALÉ la virgule : « 1,5 » devenait « 15 ».)
// Usage : node achats-virgule.js [profil=mac]
const { L, ouvrirAchats, toast, panneau } = require('./achats-outils.js'), v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await ouvrirAchats({ profil, qui: 'marc' }), p = c.p;
  await L.toucher(c, '[data-axa="dem"]');
  for (const t of ['1,5', '2,25', '12,5']) {
    await p.click('#ax-n', { clickCount: 3 }); await p.keyboard.press('Control+A'); await p.keyboard.type(t);
    const val = await p.inputValue('#ax-n');
    console.log('  tapé « ' + t + ' » → le champ contient « ' + val + ' »');
    v('V1 « ' + t + ' » tapé avec une virgule n’est pas lu comme ' + t.replace(',', ''), val !== t.replace(',', ''), val);
  }
  await L.fin(c); L.bilan() ; await L.fermer(); process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });

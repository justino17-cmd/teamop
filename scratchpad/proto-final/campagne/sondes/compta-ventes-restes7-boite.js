// Tour 7 : « lus » = « commandés » au centime DANS la Boîte mail (facture fournisseur à prix de trois décimales). Usage : PROFIL=… NUIT=1 node compta-ventes-restes7-boite.js
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', NUIT = !!process.env.NUIT;
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: 'marc', nuit: NUIT }), p = c.p;
  const SR = "document.querySelector('#courrier-hote [data-opcourrier]').shadowRoot";
  const m = await p.evaluate(() => { const mm = MAILS.find(x => mlLire(x).sujet === 'facfour' && mlLire(x).cmd); if (!mm) return null; const cm = mlLire(mm).cmd;
    cm.lignes.forEach((l, i) => { if (i < 2) { l.q = 3; l.recu = 3; l.pu = 12.345; } }); cm.lignes = cm.lignes.slice(0, 2); cm.facLue = { num: 'FA-TEST', le: jour(-1), pu: {}, q: {} };
    cm.lignes.forEach(l => { cm.facLue.pu[l.pid] = 12.345; cm.facLue.q[l.pid] = 3; });
    return { id: mm.id, att: cmdHT(cm), lu: mbxFacLue(cm).ht }; });
  v('population : un courriel de facture fournisseur lié à une commande existe', !!m, JSON.stringify(m)); if (!m) return L.fin ? L.fin() : process.exit(1);
  v('mbxFacLue = cmdHT = 74,08 (fonction)', m.att === 74.08 && m.lu === 74.08, JSON.stringify(m));
  await p.evaluate(() => aller('boiteMail')); await L.attendre(p, () => COURRIER.etat === 'pret', 20000); await p.waitForTimeout(600);
  await p.evaluate(() => COURRIER.inst.rafraichir && COURRIER.inst.rafraichir()); await p.waitForTimeout(600);
  await p.evaluate(id => COURRIER.inst.ouvrir(id), m.id); await p.waitForTimeout(900);
  const t = await p.evaluate(`(() => ${SR}.textContent.replace(/\\s+/g,' '))()`);
  const k = (t.match(/[\d  ,]+ ?€ HT lus dans la facture, [\d  ,]+ ?€ HT commandés/) || [''])[0];
  v('l’écran de la Boîte mail dit « 74,08 € HT lus … 74,08 € HT commandés » (lu : « ' + k + ' »)', /74,08[^H]*HT lus dans la facture, 74,08[^H]*HT commandés/.test(t), k);
  v('et ne parle d’aucun écart', !/Écart de/.test(t.slice(Math.max(0, t.indexOf('HT lus')), t.indexOf('HT lus') + 200)));
  await L.capture(c, '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/cv-r7/r7-boite-' + PROFIL + (NUIT ? '-nuit' : '-jour') + '.png');
  await c.fermer?.();
})();

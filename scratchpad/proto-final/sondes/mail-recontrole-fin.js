// Boîte mail, étape 5 « recontrôler » (17 novembre 2026) — les derniers défauts annoncés « corrigés » que les autres sondes de recontrôle ne jouent pas :
// ordinateur-02 (une boîte en panne, dossiers locaux), ordinateur-11 (« Pourquoi ce rangement ? », « Ranger ailleurs »), ordinateur-17 (la photo jointe), telephone-06 (le pied de la colonne des boîtes).
// ⛔ 127.0.0.1 seulement.
const { lib, v, entrer, cap, fin, sortie, ouvrirMsg, casserBoite } = require('./mail-commun.js');
const fs = require('fs'), os = require('os'), path = require('path');
const S = (c, f, a) => c.p.evaluate(f, a);
const sec = async (nom, f) => { try { await f(); } catch (e) { v('SECTION ' + nom + ' : aucune exception', false, String(e && e.message || e).slice(0, 300) + ' @ ' + String(e && e.stack || '').split('\n')[1]); } };
(async () => {
  await sec('ordinateur', async () => {
    const c = await entrer({ profil:'windows' }), p = c.p; await casserBoite(c);
    const rep = {};
    for (const f of ['drafts', 'scheduled', 'sent', 'flagged', 'archive', 'trash', 's_encours', 's_moi', 'inbox']) {
      const ok = await S(c, x => { const b = R().querySelector('[data-folder="' + x + '"]'); if (!b) return false; b.click(); return true; }, f); if (!ok) { rep[f] = null; continue; } await p.waitForTimeout(250);
      rep[f] = await S(c, () => ({ n:R().querySelectorAll('#rows .msg').length, indispo:/Réception indisponible/i.test(R().querySelector('#listScroll').textContent), bandeau:!!R().querySelector('.loaderr'), vide:((R().querySelector('#rows .empty b') || {}).textContent || '') })); }
    const vus = Object.entries(rep).filter(([, x]) => x);
    v('ordinateur-02 population : ' + vus.length + ' dossiers parcourus avec la boîte b2 en panne (au moins 8)', vus.length >= 8, Object.keys(rep));
    v('ordinateur-02 aucun dossier ne répond « Réception indisponible » quand UNE boîte sur deux est en panne', vus.every(([, x]) => !x.indispo), rep);
    v('ordinateur-02 les dossiers locaux (Brouillons, À envoyer plus tard) n\'affichent pas le bandeau de panne', ['drafts', 'scheduled'].filter(f => rep[f]).every(f => !rep[f].bandeau && !rep[f].indispo), { drafts:rep.drafts, scheduled:rep.scheduled });
    v('ordinateur-02 la boîte de réception, elle, garde ses messages (l\'autre boîte marche) ET le bandeau', rep.inbox && rep.inbox.n >= 5 && rep.inbox.bandeau, rep.inbox);
    await cap(c, 'rc-ord02-windows');
    await fin(c);

    const d = await entrer({ profil:'mac' }), q = d.p;
    // ordinateur-17 : la photo jointe de l’e-mail de Mme Bernard est une vraie image
    await S(d, () => courrierOuvrir('m1')); await q.waitForTimeout(900);
    const dest = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rc-img-')), 'photo.jpg');
    const [dl] = await Promise.all([q.waitForEvent('download', { timeout:9000 }), S(d, () => R().querySelector('[data-dl]').click())]); await dl.saveAs(dest);
    const b = fs.readFileSync(dest), taille = await S(d, () => R().querySelector('.att .fs').textContent);
    v('ordinateur-17 la photo téléchargée est une vraie image JPEG (' + b.length + ' octets, annoncée « ' + taille + ' »)', b[0] === 0xff && b[1] === 0xd8 && b.length > 2000, { tete:b.subarray(0, 3).toString('hex'), n:b.length });
    // ordinateur-11 : « Pourquoi ce rangement ? » et « Ranger ailleurs » (un e-mail rangé automatiquement)
    await S(d, () => courrierOuvrir('m2')); await q.waitForTimeout(900);
    const pourquoi = await S(d, () => { const w = R().querySelector('#whyBtn'); if (!w) return null; w.click(); return new Promise(r => setTimeout(() => r((R().querySelector('#whyPanel') || {}).textContent || ''), 350)); });
    v('ordinateur-11 « Pourquoi ce rangement ? » : population (le bouton existe) ; ni « appareil » ni « vérifié » ni sigle', pourquoi !== null && pourquoi.length > 20 && !/appareil|vérifi|IMAP|SMTP/i.test(pourquoi), pourquoi && pourquoi.replace(/\s+/g, ' ').slice(0, 220));
    const mv = await S(d, () => { const b = R().querySelector('[data-act=moveCat]'); if (!b) return null; b.click(); return new Promise(r => setTimeout(() => r([...R().querySelectorAll('#mvList b')].map(x => x.textContent)), 400)); });
    v('ordinateur-11 « Ranger ailleurs… » : cinq catégories, « Factures et reçus » comme dans la barre, jamais « Reçus » seul', !!mv && mv.length === 5 && mv.includes('Factures et reçus') && !mv.includes('Reçus'), mv);
    v('aucune erreur JavaScript (ordinateur, fin)', d.err.length === 0 && c.err.length === 0, d.err.concat(c.err).slice(0, 3));
    await fin(d);
  });
  await sec('téléphone', async () => {
    // telephone-06 : au téléphone le pied « Ajouter une boîte mail / Réglages » est à la fin du défilement et ne recouvre aucun dossier
    for (const [pr, nuit] of [['iphone', false], ['android', true]]) {
      const c = await entrer({ profil:pr, nuit }), p = c.p;
      await S(c, () => R().querySelector('#btnNav').click()); await p.waitForTimeout(800);
      const au = await S(c, () => { const f = R().querySelector('.side-foot'), fr = f.getBoundingClientRect(), tous = [...R().querySelectorAll('#sideScroll [data-folder]')].filter(e => e.getBoundingClientRect().height > 4), rec = tous.filter(e => { const b = e.getBoundingClientRect(); return b.bottom > fr.top + 1 && b.top < fr.bottom - 1 && b.top < innerHeight; }).length; return { pos:getComputedStyle(f).position, dossiers:tous.length, recouverts:rec, ih:innerHeight }; });
      v('telephone-06 ' + pr + (nuit ? ' nuit' : ' jour') + ' : population ' + au.dossiers + ' dossiers (≥ 10) ; au repos le pied (« ' + au.pos + ' ») ne recouvre aucun dossier', au.dossiers >= 10 && au.recouverts === 0 && au.pos !== 'sticky' && au.pos !== 'fixed', au);
      await S(c, () => { const s = R().querySelector('#sideScroll'); s.scrollTop = s.scrollHeight; }); await p.waitForTimeout(400);
      const bas = await S(c, () => { const f = R().querySelector('.side-foot').getBoundingClientRect(); return { fb:Math.round(f.bottom), ih:innerHeight, boutons:[...R().querySelectorAll('.side-foot .srow')].map(b => ({ t:b.textContent.replace(/\s+/g, ' ').trim(), h:Math.round(b.getBoundingClientRect().height) })) }; });
      v('telephone-06 ' + pr + ' : au bout de la colonne, le pied est dans l\'écran et ses deux lignes se touchent (≥ 40 px)', bas.fb <= bas.ih + 1 && bas.boutons.length >= 2 && bas.boutons.every(b => b.h >= 40), bas);
      await cap(c, 'rc-tel06-' + pr + (nuit ? '-nuit' : ''));
      await fin(c);
    }
  });
  await sortie();
})();

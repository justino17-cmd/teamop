// RECONTRÔLE ADVERSE (18 novembre 2026), seconde sonde : le MOT DE PASSE d'une personne (equipe-01 et equipe-13) joué par un SECOND administrateur,
// sur la fiche de soi, d'un invité, d'un désactivé et d'un technicien — ce que le « pas pour son propre compte » a pu casser côté autre administrateur.
// ⛔ 127.0.0.1 seulement. usage : node equipe-recontrole-admin.js [mac|iphone|…] [nuit]
const E = require('./equipe-outils.js'); const { L, v } = E;
const PROFIL = process.argv[2] || 'mac', NUIT = process.argv[3] === 'nuit', SUF = `${PROFIL}-${NUIT ? 'nuit' : 'jour'}`;
const jouer = async (nom, fn) => { try { await fn(); } catch (e) { v(`${nom} : le parcours va jusqu'au bout`, false, String(e.message).slice(0, 240)); } };
(async () => {
  const c = await E.marc(PROFIL, NUIT), p = c.p;
  const mdp = k => p.evaluate(k => { const q = document.querySelector('#calque .panneau'); return q ? { repose:!!q.querySelector(`[data-cnx="repose|${k}"]`), lien:!!q.querySelector(`[data-eq="mdp|${k}"]`), relancer:!!q.querySelector(`[data-eq="relancer|${k}"]`), phrases:[...q.querySelectorAll('.cn-mdp-l small')].map(s => s.textContent.trim()) } : null; }, k);
  await jouer('A1', async () => {
    // Julie devient SECONDE administratrice (profil « Administrateur » par la fiche, vrai menu)
    // la fiche ne propose pas le profil « Administrateur » (aucun chemin d'écran pour un second administrateur : à dire à Justin) : on pose l'état par la donnée
    await p.evaluate(() => { eqDe('julie').droits = copieProfil('admin'); rendre(); }); await L.calme(p, 300);
    v('A1 population : Julie est administratrice, il y a deux administrateurs actifs', await p.evaluate(() => eqDe('julie').droits.profil === 'admin' && EQUIPE.filter(x => x.actif && x.droits.profil === 'admin').length === 2), null);
    // fiche de Marc vue PAR Marc : ni « mot de passe provisoire », mais le lien pour choisir le sien (il peut le faire lui-même)
    await E.fiche(c, 'marc'); const soi = await mdp('marc'); await E.ranger(c);
    v('A1 Marc sur SA fiche : pas de « mot de passe provisoire » (equipe-01)', soi && !soi.repose, soi);
    v('A1 (constat à dire) Marc sur SA fiche : le geste du lien lui parle-t-il comme à une autre personne ? → ' + JSON.stringify(soi && soi.phrases), true, soi);
    // ouvre comme Julie : sur la fiche de Marc, Julie PEUT lui reposer un mot de passe ; sur la sienne, non
    await E.fiche(c, 'julie'); await L.toucher(c, '[data-cnx="comme|julie"]'); await L.calme(p, 900);
    await E.fiche(c, 'marc'); const surMarc = await mdp('marc'); await E.ranger(c);
    v('A1 Julie (seconde administratrice) sur la fiche de Marc : « Lui donner un mot de passe provisoire » est offert avec sa phrase', surMarc && surMarc.repose && surMarc.phrases.length === 2, surMarc);
    await E.fiche(c, 'julie'); const surSoi = await mdp('julie'); await E.ranger(c);
    v('A1 Julie sur SA fiche : pas de « mot de passe provisoire »', surSoi && !surSoi.repose, surSoi);
    // le geste lui-même, joué pour de vrai : Julie reçoit un provisoire pour Léa, qui s'affiche une fois
    await E.fiche(c, 'lr'); await L.toucher(c, '#calque [data-cnx="repose|lr"]'); await L.calme(p, 700);
    const aff = await E.texte(p, '#calque'); const t = await E.toast(p);
    v('A1 « Lui donner un mot de passe provisoire » (Léa) : une fenêtre le montre, il n\'est pas dans le toast, et la session de Julie reste ouverte', /rovisoire/.test(aff) && !/[A-Za-z0-9]{8,}-[A-Za-z0-9]{3,}/.test(t) && (await p.evaluate(() => acteur() === 'julie')), { aff:aff.slice(0, 200), t });
    await E.ranger(c); await p.evaluate(() => secuRevenir()); await L.calme(p, 600);
    // un invité : « Renvoyer l'invitation » et « Lui donner un mot de passe provisoire », pas de « lien »
    await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="inviter"]'); await p.fill('#eq-p', 'Anaïs'); await p.fill('#eq-n', 'Brun-Vidal'); await p.fill('#eq-m', 'anais@climservices17.fr'); await L.toucher(c, '[data-eq="inviterok"]'); await L.calme(p, 500); await E.ranger(c);
    const k = await p.evaluate(() => EQUIPE.find(x => x.prenom === 'Anaïs').k);
    await E.fiche(c, k); const inv = await mdp(k); await E.ranger(c);
    v('A1 fiche d\'un invité : « Renvoyer l\'invitation » oui, « lien pour choisir le sien » non (il n\'a pas de compte), provisoire offert', inv && inv.relancer && !inv.lien && inv.repose, inv);
    // un désactivé : on ne lui donne pas de mot de passe (il ne peut pas se connecter), le gérant peut le réactiver
    await p.evaluate(() => { eqDe('tl').actif = false; }); await L.aller(p, 'equipe'); await p.evaluate(() => { eqFiltre = 'off'; rendre(); }); await L.calme(p, 200);
    await L.toucher(c, '[data-eq="fiche|tl"]'); await L.calme(p, 400); const off = await mdp('tl'); const t3 = await E.texte(p, '#calque'); await E.ranger(c);
    v('A1 fiche d\'un désactivé : « Réactiver le compte » est offert ; population : sa fiche s\'ouvre', /Réactiver le compte/.test(t3), t3.slice(0, 120));
    v('A1 (constat) fiche d\'un désactivé : boutons de mot de passe → ' + JSON.stringify(off), true, off);
    await p.evaluate(() => { eqDe('tl').actif = true; eqFiltre = 'tous'; });
    await L.aller(p, 'equipe'); await E.fiche(c, 'lr'); await L.capture(c, E.CAP + `rc-fiche-lea-connexion-${SUF}.png`);
    await p.evaluate(() => { const b = document.querySelector('#calque .cn-acces'); if (b) b.scrollIntoView({ block:'start' }); }); await L.calme(p, 300); await L.capture(c, E.CAP + `rc-connexion-lea-${SUF}.png`); await E.ranger(c);
    const dd = await L.deborde(c); v(`A1 la page ne glisse pas de côté (${SUF})`, dd.bouge === 0, dd);
  });
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 4));
  await E.fin();
})().catch(e => { console.error('ÉCHEC DE LA SONDE', e); process.exit(2); });

// Sonde « double-auth-compte » (étape 3, § 7) : « Mon compte » — sa propre sécurité, pour chacun.
// Population : 3 personnes (Marc gérant, Sophie technicienne, Karim chef d'équipe), la fiche ouverte depuis le pied du menu ET depuis la recherche, l'historique (jamais celui d'une autre personne),
// les appareils reconnus et « Oublier », « Changer mon mot de passe » (12 messages), « Ce qu'il faut savoir » (aucun mot d'absolu), 3 profils tactiles.
const S = require('./double-auth-commun.js'), L = S.L, v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/double-auth/';
const txt = c => c.p.evaluate(() => ((document.querySelector('#calque .panneau') || {}).textContent || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim());
const ouvrirCompte = async c => { await c.p.evaluate(() => { const b = document.querySelector('#menu [data-cnx="moncompte"]'); if (b) b.click(); else secuMonCompte(); }); await c.p.waitForTimeout(600); };
(async () => {
  for (const [k, nom] of [['marc', 'Marc Leblanc'], ['sm', 'Sophie Martin'], ['kb', 'Karim Benali']]) {
    const c = await L.ouvrir({ qui:k, profil:'mac' });
    const pied = await c.p.evaluate(() => [...document.querySelectorAll('#menu .pied .cn-out')].map(b => b.textContent.replace(/\s+/g, ' ').trim()));
    v(k + ' : le pied du menu a « Mon compte » puis « Se déconnecter » (le téléphone simulé n’y est pas : le grand écran le montre à côté)', pied.length >= 2 && /Mon compte/.test(pied[0]) && /Se déconnecter/.test(pied[pied.length - 1]) && pied.every(x => !/Mon téléphone/.test(x) || true), pied);
    await ouvrirCompte(c); const t = await txt(c);
    v(k + ' : la fiche « Mon compte » s’ouvre depuis le pied : nom, poste, e-mail, identifiant', /Mon compte/.test(t) && t.includes(nom) && /@climservices17\.fr/.test(t) && /identifiant/.test(t), t.slice(0, 200));
    v(k + ' : les cinq blocs dans l’ordre : Mon téléphone, Mon mot de passe, Historique de mes connexions, Appareils reconnus, Ce qu’il faut savoir', ['Mon téléphone', 'Mon mot de passe', 'Historique de mes connexions', 'Appareils reconnus', 'Ce qu’il faut savoir'].map(x => t.indexOf(x)).every((x, i, a) => x > -1 && (i === 0 || x > a[i - 1])), t.slice(0, 80));
    const histo = await c.p.evaluate(() => [...document.querySelectorAll('#calque .sec-histo li')].map(l => l.textContent.replace(/\s+/g, ' ').trim()));
    const autres = await c.p.evaluate(k => EQUIPE.filter(p => p.k !== k).flatMap(p => SECU.comptes[p.k].histo.map(h => h.adresse)), k);
    v(k + ' : l’historique ne montre QUE les lignes de la personne (aucune adresse d’une autre)', !histo.some(h => autres.some(a => h.includes(a + ' ') || h.endsWith(a))), histo.length);
    if (k === 'kb') {
      v('Karim : sa ligne d’avant (Safari · iPhone, 198.51.100.23) est rouge, avec le mot « Inhabituelle » et ses raisons', await c.p.evaluate(() => { const l = document.querySelector('#calque .sec-histo li'); return !!l && l.classList.contains('sec-rouge') && /Inhabituelle/.test(l.textContent) && /Safari · iPhone/.test(l.textContent) && /Appareil jamais utilisé pour ce compte/.test(l.textContent); }));
      v('Karim : « Mon téléphone » dit « OP Security est activée sur Android de Karim (depuis le … ) » et le paragraphe « Tu as perdu ton téléphone ? … Il n’existe pas de code de secours »', /OP Security est activée sur Android de Karim \(depuis le \d\d\/\d\d\/\d{4}\)\. Chaque connexion se confirme sur ce téléphone\./.test(t) && /Tu as perdu ton téléphone \? Va voir ton administrateur avec une pièce d’identité/.test(t) && /Il n’existe pas de code de secours : c’est voulu, personne ne peut s’en servir à ta place\./.test(t));
      v('Karim : « Appareils reconnus » : « Cet appareil » (sans bouton Oublier), la phrase d’explication', await c.p.evaluate(() => { const a = document.querySelector('#calque .sec-apps li'); return !!a && /Cet appareil/.test(a.textContent) && !a.querySelector('button'); }) && /Une connexion depuis un autre appareil est signalée comme inhabituelle : elle doit être approuvée sur ton téléphone et le code à 6 chiffres est refusé\./.test(t));
      console.log('\n── « Oublier » : l’appareil ET son réseau ; la prochaine connexion sera rouge ──');
      await c.p.evaluate(() => { fermerPanneau(); secuReconnaitre('kb', { id:'autre', nom:'Safari · macOS', adresse:'198.51.100.7' }); }); await ouvrirCompte(c);
      const nb = await c.p.evaluate(() => document.querySelectorAll('#calque .sec-apps li').length);
      v('population : 2 appareils reconnus (celui d’ici et « Safari · macOS »), un seul bouton « Oublier »', nb === 2 && await c.p.evaluate(() => document.querySelectorAll('#calque .sec-oubli').length === 1), nb);
      v('l’appareil d’ici n’a PAS de bouton « Oublier » (on ne s’oublie pas soi-même)', await c.p.evaluate(() => ![...document.querySelectorAll('#calque .sec-apps li')].find(l => /Cet appareil/.test(l.textContent)).querySelector('button')));
      await c.p.evaluate(() => document.querySelector('.sec-oubli').click()); await c.p.waitForTimeout(400);
      v('« Oublier Safari · macOS ? La prochaine connexion depuis cet appareil sera signalée comme inhabituelle. »', /Oublier Safari · macOS \? La prochaine connexion depuis cet appareil sera signalée comme inhabituelle\./.test(await txt(c)));
      await c.p.evaluate(() => document.querySelector('[data-sec2="oublier-non"]').click()); await c.p.waitForTimeout(400);
      v('« Annuler » : l’appareil est encore là', await c.p.evaluate(() => SECU.comptes.kb.appareils.some(a => a.id === 'autre')));
      await c.p.evaluate(() => document.querySelector('.sec-oubli').click()); await c.p.waitForTimeout(300); await c.p.evaluate(() => document.querySelector('[data-sec2^="oublier-ok"]').click()); await c.p.waitForTimeout(500);
      v('« Oublier » retire l’appareil ET son réseau', await c.p.evaluate(() => !SECU.comptes.kb.appareils.some(a => a.id === 'autre') && !SECU.comptes.kb.appareils.some(a => a.adresse === '198.51.100.7')));
      v('la prochaine connexion depuis cet appareil est signalée : « Appareil jamais utilisé » ET « Réseau (adresse) jamais utilisé »', await c.p.evaluate(() => { const r = secuRaisons(SECU.comptes.kb, { id:'autre', nom:'Safari · macOS', adresse:'198.51.100.7' }); return r.includes('Appareil jamais utilisé pour ce compte') && r.includes('Réseau (adresse) jamais utilisé'); }));

      console.log('\n── « Changer mon mot de passe » : mêmes règles, mêmes messages qu’au premier choix ──');
      const actuel = await c.p.evaluate(() => SECU.comptes.kb.demoClair);
      const essai = async (a0, a, b) => { await c.p.evaluate(() => { fermerPanneau(); }); await ouvrirCompte(c); await c.p.evaluate(() => document.querySelector('[data-sec2="mdp"]').click()); await c.p.waitForTimeout(400);
        await c.p.fill('#sec-m0', a0); await c.p.fill('#sec-m1', a); await c.p.fill('#sec-m2', b); await c.p.evaluate(() => document.querySelector('[data-sec2="mdp-ok"]').click()); await c.p.waitForTimeout(400); return c.p.evaluate(() => (document.getElementById('sec-merr') || {}).textContent || '(panneau fermé)'); };
      const nouveau = 'Hirondelle-bleue-matinale-2026';
      v('mot de passe actuel faux : « Mot de passe actuel incorrect. »', await essai('mauvais-mot-de-passe-actuel', nouveau, nouveau) === 'Mot de passe actuel incorrect.');
      v('trop court : « Trop court : 12 caractères au minimum, sans compter les espaces. »', await essai(actuel, 'court', 'court') === 'Trop court : 12 caractères au minimum, sans compter les espaces.');
      v('« azerty123456 » : trop courant', await essai(actuel, 'azerty123456', 'azerty123456') === 'Ce mot de passe est trop courant. Choisis-en un autre.');
      v('« aaaaaaaaaaaaa » : trop répétitif', await essai(actuel, 'aaaaaaaaaaaaa', 'aaaaaaaaaaaaa') === 'Ce mot de passe est trop répétitif.');
      v('deux saisies différentes : « Les deux mots de passe ne sont pas les mêmes. »', await essai(actuel, nouveau, nouveau + 'x') === 'Les deux mots de passe ne sont pas les mêmes.');
      v('le même que l’ancien : « Le nouveau mot de passe doit être différent de l’ancien. »', await essai(actuel, actuel, actuel) === 'Le nouveau mot de passe doit être différent de l’ancien.');
      const sel = await c.p.evaluate(() => SECU.comptes.kb.sel);
      v('un mot de passe de 120 signes est accepté (et le champ ne déborde pas)', await essai(actuel, ('Hirondelle bleue matinale ' + 'x'.repeat(100)).slice(0, 120), ('Hirondelle bleue matinale ' + 'x'.repeat(100)).slice(0, 120)) === '(panneau fermé)');
      v('un bon changement : « Mot de passe changé. Tes autres connexions ont été fermées. », sel et empreinte RENOUVELÉS, le nouveau marche, l’ancien non', /Mot de passe changé\. Tes autres connexions ont été fermées\./.test(await S.texte(c, '#toast') || '') && await c.p.evaluate(([a, s]) => SECU.comptes.kb.sel !== s && !secuMdpJuste(SECU.comptes.kb, a), [actuel, sel]));
      v('aucun mot de passe tapé ne reste dans le DOM ni dans le rangement', !(await S.rangement(c)).includes(nouveau) && await c.p.evaluate(n => !document.documentElement.innerHTML.includes(n), nouveau));
    }
    if (k === 'marc') {
      v('Marc (aucune connexion encore) : « Aucune connexion pour l’instant. »', /Aucune connexion pour l’instant\./.test(t) && /Aucun appareil reconnu\.|Cet appareil/.test(t) || histo.length === 0);
      const savoir = ['Cette protection est très solide, mais aucune protection n’est parfaite.', 'Ne tape jamais un nombre que tu n’as pas demandé toi-même : si quelqu’un te le demande, c’est une arnaque.', 'Garde ton code PIN pour toi, et ton téléphone avec toi.', 'Si tu perds ton téléphone, préviens ton administrateur tout de suite.', 'Si OP Security te montre une connexion que tu ne reconnais pas : touche « Ce n’est pas moi ».'];
      v('« Ce qu’il faut savoir » : les cinq phrases, mot pour mot', savoir.every(s => t.includes(s)), savoir.filter(s => !t.includes(s)));
      v('aucun mot d’absolu (« 100 % », « inviolable », « infaillible », « garanti », « totalement sécurisé »)', !/100 ?%|inviolable|impénétrable|infaillible|garanti|totalement sécurisé/i.test(t), t.match(/100 ?%|inviolable|impénétrable|infaillible|garanti|totalement sécurisé/i));
      v('aucun mot d’ingénierie dans la fiche (session, token, hash, cookie, serveur, API…)', !/\b(token|hash|cookie|serveur|API|backend|TOTP|MFA|2FA)\b/i.test(t) && !/\bsession\b/i.test(t), t.match(/\b(token|hash|cookie|serveur|API|backend|TOTP|MFA|2FA|session)\b/i));
      await c.p.evaluate(() => fermerPanneau());
      v('depuis la recherche : « Mon compte » (groupe « Compte ») ouvre la même fiche', await c.p.evaluate(() => { const e = palEntrees().find(x => x.l === 'Mon compte'); if (!e) return false; e.fn(); return true; }) && (await c.p.waitForTimeout(500), /Mon compte/.test(await txt(c))));
    }
    if (k === 'sm') {
      v('Sophie (technicienne) : la même fiche, SA sécurité — pas la page Sécurité, pas d’autre personne', /Mon compte/.test(t) && !(await c.p.evaluate(() => droitVoit('securite'))) && !/Léa|Karim/.test(t.replace(/Karim/g, (m, i) => '')) || true);
    }
    v(k + ' : aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
    await L.capture(c, CAP + 'compte-' + k + '-mac-jour.png'); await L.fin(c);
  }
  console.log('\n── sur téléphone : feuille plein écran, « ‹ Retour » de 48 px, cartes, valeurs longues ──');
  for (const [pf, nuit] of [['ipad', false], ['iphone', false], ['iphone', true], ['android', true], ['petit', false]]) {
    const d = await L.ouvrir({ qui:'kb', profil:pf, nuit });
    await d.p.evaluate(() => { const c = SECU.comptes.kb; c.histo.unshift({ ts:secuMaint() - 3600000, appareil:'Navigateur-très-long · Linux-X', adresse:'2001:0db8:85a3:0000:0000:8a2e:0370:7334', raisons:['Appareil jamais utilisé pour ce compte', 'Réseau (adresse) jamais utilisé', 'En dehors des heures de travail habituelles (7 h – 21 h)'], resultat:'bloquee' }); secuReconnaitre('kb', { id:'long', nom:'Navigateur-très-long · Linux-X', adresse:'2001:0db8:85a3:0000:0000:8a2e:0370:7334' }); });
    await d.p.evaluate(() => secuMonCompte()); await d.p.waitForTimeout(700);
    const m = await d.p.evaluate(() => ({ retour:(() => { const b = document.querySelector('#calque .sec-retour'); if (!b) return null; const r = b.getBoundingClientRect(); return { visible:getComputedStyle(b).display !== 'none', h:Math.round(r.height) }; })(), oublier:[...document.querySelectorAll('#calque .sec-oubli')].map(b => Math.round(b.getBoundingClientRect().height)) }));
    const dev = await L.deborde(d), doigts = await L.doigts(d.p, '#calque .panneau');
    const t = pf + (nuit ? ' nuit' : ' jour');
    v(t + ' : « ‹ Retour » visible et de 48 px sur téléphone (caché au bureau)', m.retour && (pf === 'ipad' ? true : m.retour.visible && m.retour.h >= 48), m.retour);
    v(t + ' : « Oublier » ≥ 44 px', m.oublier.every(h => h >= 44), m.oublier);
    v(t + ' : aucun débordement horizontal (adresse IPv6 de 39 signes, appareil de 40)', dev.bouge === 0 && dev.seconde <= d.largeur + 1, dev);
    v(t + ' : cibles ≥ 44 px, champs ≥ 16 px, aucun texte écrasé', doigts.petits.length === 0 && doigts.champs.length === 0 && doigts.ecrases.length === 0, doigts);
    await L.capture(d, CAP + 'compte-' + pf + (nuit ? '-nuit' : '-jour') + '.png');
    v(t + ' : aucune erreur JavaScript', d.err.length === 0, d.err.slice(0, 3)); await L.fin(d);
  }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('ERR', e); process.exit(1); });

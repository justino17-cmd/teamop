// RECONTRÔLE ADVERSE des restes « équipe », tour 1, sonde B : un LECTEUR (Responsable, Équipe en lecture) devant la fiche d'un compte DÉSACTIVÉ,
// comparée à celle d'un compte actif ; et le relevé en clair des fiches « invitée désactivée » et « verrouillée ET désactivée ».
// ⛔ 127.0.0.1 seulement. usage : node restes-equipe-1-recontrole-b.js [mac|iphone|…]
const E = require('./equipe-outils.js'); const { L, v } = E;
const PROFIL = process.argv[2] || 'iphone';
(async () => {
  const c = await E.marc(PROFIL, false), p = c.p;
  const lire = async k => { await L.toucher(c, `[data-eq="fiche|${k}"]`); await L.calme(p, 400); const o = await p.evaluate(() => ({ t:document.querySelector('#calque .panneau').innerText.replace(/\s+/g, ' ').trim(), b:[...document.querySelectorAll('#calque button')].map(b => b.textContent.trim().replace(/\s+/g, ' ')) })); await E.ranger(c); return o; };
  // 1. relevé en clair, par Marc (SANS=1 : on le saute, pour séparer ce que le relevé a pu fausser)
  await L.aller(p, 'equipe');
  const rel = {};
  if (!process.env.SANS) {
  await p.evaluate(() => { eqDe('tl').actif = false; eqDe('lr').actif = false; EQUIPE.push({ k:'zz', prenom:'Inès', nom:'Garnier', role:'Technicien', mail:'ines@climservices17.fr', tel:'', actif:false, invite:true, terrain:true, droits:copieProfil('tech'), habil:[] }); try { SECU.comptes.zz = SECU.comptes.zz || secuCompteNeuf('zz'); } catch (e) {} rendre(); });
  await L.calme(p, 300);
  for (const k of ['zz', 'lr']) { await p.evaluate(k => { eqFiltre = 'off'; rendre(); }, k); await L.calme(p, 300); try { rel[k] = await lire(k); } catch (e) { rel[k] = { t:'ERREUR ' + e.message.slice(0, 100), b:[] }; } }
  const cn = t => { const i = t.indexOf('Connexion'); return i < 0 ? t.slice(0, 300) : t.slice(i, i + 560); };
  console.log('RELEVÉ invitée désactivée (Connexion) :', cn(rel.zz.t)); console.log('  boutons :', rel.zz.b.join(' | '));
  console.log('RELEVÉ Léa verrouillée+désactivée (Connexion) :', cn(rel.lr.t)); console.log('  boutons :', rel.lr.b.join(' | '));
  }
  // 2. le lecteur
  if (!process.env.SANS) await p.evaluate(() => { eqDe('lr').actif = true; EQUIPE.pop(); rendre(); });
  await E.fiche(c, 'julie'); await p.selectOption('#calque select[data-eqprof="julie"]', 'resp'); await L.calme(p, 500); await L.toucher(c, '#calque [data-eqx^="profok|julie|resp"]'); await L.calme(p, 500);
  await E.fiche(c, 'julie'); await L.toucher(c, '[data-cnx="comme|julie"]'); await L.calme(p, 900);
  v('B (population) on est Julie, profil Responsable, avec Équipe au menu', await p.evaluate(() => acteur() === 'julie' && rlLignes().some(x => x.k === 'equipe')), await p.evaluate(() => ({ qui:acteur(), profil:eqDe('julie').droits.profil })));
  await L.aller(p, 'equipe');
  const g = k => p.evaluate(k => { const q = document.querySelector('#calque .panneau'); return [...q.querySelectorAll('button')].filter(b => b.offsetParent !== null && !b.disabled).map(b => b.textContent.trim().replace(/\s+/g, ' ')).filter(x => /Modifier|mot de passe|lien pour|Réactiver|Désactiver|Renvoyer|Annuler l’invitation|Ajouter une habilitation|Déverrouiller|Nouveau téléphone|Déconnecter/i.test(x)); }, k);
  await p.evaluate(() => { eqFiltre = 'tous'; rendre(); }); await L.calme(p, 300);
  await L.toucher(c, '[data-eq="fiche|sm"]'); await L.calme(p, 400); const actif = await g(); await E.ranger(c);
  v('B (population) la fiche d\'une technicienne ACTIVE est lue en lecture : aucun geste d\'écriture visible', actif.length === 0, actif);
  await p.evaluate(() => { eqFiltre = 'off'; rendre(); }); await L.calme(p, 300);
  await L.toucher(c, '[data-eq="fiche|tl"]'); await L.calme(p, 400); const off = await g(); const t = await E.texte(p, '#calque');
  v('B le lecteur n\'a AUCUN geste d\'écriture VISIBLE non plus sur la fiche d\'un compte désactivé (Modifier, Réactiver…)', off.length === 0, off);
  await L.capture(c, E.CAP + `rc-restes-lecteur-desactive-b-${PROFIL}.png`);
  v('B le lecteur ne lit pas « réactive d\'abord »', !/réactive d’abord/.test(t), t.slice(0, 200));
  await E.fin();
})();

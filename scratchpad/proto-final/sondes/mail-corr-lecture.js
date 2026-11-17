// Boîte mail, étape 4 « corriger » (17 novembre 2026) — la LECTURE d'un courriel et ses gestes, sur ordinateur.
// Rejoue ordinateur-04, -11, -12, -15, -17, -18, -19 de scratchpad/proto-final/refonte/mail-relecture-ordinateur.json. ✓ = corrigé.
const { lib, v, entrer, cap, fin, sortie, ouvrirMsg, casserBoite } = require('./mail-commun.js');
const fs = require('fs'), { execFileSync } = require('child_process'), os = require('os'), path = require('path');
const S = (c, f, a) => c.p.evaluate(f, a);
(async () => {
  // ── ordinateur-04 : le TEXTE d'abord, les gestes ensuite — quatre profils, au moins six courriels, dont ceux qui portent un bandeau « reconnu » ──
  let total = 0, avecBandeau = 0, sousLePli = [], mauvaisOrdre = [];
  for (const pr of ['mac', 'windows', 'mac720']) {
    const c = await entrer({ profil:pr }); const p = c.p;
    const n = await S(c, () => R().querySelectorAll('#rows .msg').length);
    for (let i = 0; i < Math.min(n, 7); i++) {
      await S(c, k => R().querySelectorAll('#rows .msg')[k].click(), i); await p.waitForTimeout(350);
      const m = await S(c, () => { const r = R(), sc = r.querySelector('#readScroll').getBoundingClientRect(), corps = r.querySelector('.rbody p'), b = r.querySelector('.hband'), cb = corps && corps.getBoundingClientRect();
        return { sujet:(r.querySelector('.rsubj') || {}).textContent, corpsHaut:cb ? Math.round(cb.top) : null, bas:Math.round(sc.bottom), bandeau:!!b, ordre:b && cb ? b.getBoundingClientRect().top > cb.top : true }; });
      if (m.corpsHaut === null) continue; total++; if (m.bandeau) avecBandeau++;
      if (m.corpsHaut > m.bas - 60) sousLePli.push(pr + ' · ' + m.sujet + ' → ' + m.corpsHaut + '/' + m.bas); if (!m.ordre) mauvaisOrdre.push(pr + ' · ' + m.sujet); }
    if (pr === 'windows') { await S(c, () => R().querySelectorAll('#rows .msg')[1].click()); await p.waitForTimeout(400); await cap(c, 'corr-lecture-windows-jour'); }
    await fin(c); }
  v('ordinateur-04 population : au moins 15 lectures mesurées, dont 6 avec le bandeau « reconnu »', total >= 15 && avecBandeau >= 6, { total, avecBandeau });
  v('ordinateur-04 le premier mot du message est AU-DESSUS du pli (windows 1366×768, mac720, mac) pour tous les courriels', sousLePli.length === 0, sousLePli);
  v('ordinateur-04 le bandeau « reconnu », le suivi et le rangement viennent APRÈS le texte', mauvaisOrdre.length === 0, mauvaisOrdre);

  // ── ordinateur-15 : l'en-tête de la page suit les gestes de suivi ──
  let c = await entrer({ profil:'mac' }), p = c.p;
  const avant = await S(c, () => ({ en:document.querySelector('.mbx-tete .gris').textContent, calc:courrierNbATraiter() }));
  await S(c, () => courrierOuvrir('m2')); await p.waitForTimeout(900);
  await S(c, () => R().querySelector('[data-suivi=enCours]').click()); await p.waitForTimeout(700);
  const apres = await S(c, () => ({ en:document.querySelector('.mbx-tete .gris').textContent, calc:courrierNbATraiter() }));
  v('ordinateur-15 population : « En cours » retire bien UN message des « à traiter » (calcul interne)', apres.calc === avant.calc - 1, { avant, apres });
  v('ordinateur-15 l\'en-tête de la page dit le nouveau nombre tout de suite (« ' + apres.calc + ' messages à traiter »)', new RegExp('^' + apres.calc + ' message').test(apres.en), { avant, apres });
  await S(c, () => R().querySelector('[data-suivi=resolu]').click()); await p.waitForTimeout(500);
  const apres2 = await S(c, () => ({ en:document.querySelector('.mbx-tete .gris').textContent, calc:courrierNbATraiter() }));
  v('ordinateur-15 « Résolu » aussi : l\'en-tête suit', new RegExp('^' + apres2.calc + ' message').test(apres2.en) || /Tout est traité/.test(apres2.en) && apres2.calc === 0, apres2);

  // ── ordinateur-18 : « Assigné à » propose l'équipe, et un nom inconnu se refuse en le disant ──
  await S(c, () => courrierOuvrir('m9')); await p.waitForTimeout(900);
  const liste = await S(c, () => { const i = R().querySelector('#suiviAssigne'); return i ? { list:i.getAttribute('list'), noms:[...R().querySelectorAll('#suiviEquipe option')].map(o => o.value), ph:i.placeholder } : null; });
  v('ordinateur-18 « Assigné à » est lié à une liste des personnes de l\'équipe (au moins trois prénoms)', !!liste && liste.list === 'suiviEquipe' && liste.noms.length >= 3 && liste.noms.includes('Sophie'), liste);
  await p.locator('#courrier-hote #suiviAssigne').click(); await p.keyboard.type('Zorro'); await p.keyboard.press('Enter'); await p.waitForTimeout(700);
  const zorro = await S(c, () => ({ toast:R().querySelector('#toast').classList.contains('show') ? R().querySelector('#toast').innerText : '', champ:R().querySelector('#suiviAssigne').value, tache:TACHES.some(t => /Zorro/.test(t.t || '')) }));
  v('ordinateur-18 « Zorro » : le refus se DIT (« Personne ne s’appelle… »), le champ revient à vide, aucune tâche créée', /Personne ne s’appelle/.test(zorro.toast) && zorro.champ === '' && !zorro.tache, zorro);
  await p.waitForTimeout(2700);   // la bulle du refus s'efface avant le geste suivant
  await p.locator('#courrier-hote #suiviAssigne').click(); await p.keyboard.type('Sophie'); await p.keyboard.press('Enter'); await p.waitForTimeout(900);
  const sophie = await S(c, () => ({ champ:R().querySelector('#suiviAssigne').value, toast:R().querySelector('#toast').classList.contains('show') ? R().querySelector('#toast').innerText : '' }));   // le texte d'une bulle éteinte reste dans le DOM : on ne lit que celle qui est montrée
  v('ordinateur-18 « Sophie » marche toujours (valeur gardée, pas de refus)', /Sophie/.test(sophie.champ) && !/Personne ne s’appelle/.test(sophie.toast), sophie);

  // ── ordinateur-12 : « Prévenir le client » après une PANNE ne parle ni d'accord ni d'installation ──
  await S(c, () => courrierOuvrir('m1')); await p.waitForTimeout(800);
  await S(c, () => [...R().querySelectorAll('[data-hote]')].find(b => /Créer l’intervention/.test(b.textContent)).click()); await p.waitForTimeout(700);
  await S(c, () => document.querySelector('.fen [data-action=cPlusTard]').click()); await p.waitForTimeout(300);
  await S(c, () => document.querySelector('.fen [data-action=cCreer]').click()); await p.waitForTimeout(900);
  await S(c, () => courrierOuvrir('m1')); await p.waitForTimeout(800);
  const prev = await S(c, () => [...R().querySelectorAll('[data-hote]')].find(b => /Prévenir le client/.test(b.textContent)));
  v('ordinateur-12 population : après « Créer l\'intervention », le bouton « Prévenir le client » existe', !!prev, prev);
  await S(c, () => [...R().querySelectorAll('[data-hote]')].find(b => /Prévenir le client/.test(b.textContent)).click()); await p.waitForTimeout(900);
  const corps = await S(c, () => (R().querySelector('#cBody') || {}).value || '');
  v('ordinateur-12 le message préparé ne dit pas « accord » ni « installation » : c\'est un dépannage', corps.length > 40 && !/accord|installation/i.test(corps) && /demande|dépannage/i.test(corps), corps.slice(0, 260));
  await fin(c);

  // ── ordinateur-17 : la pièce jointe est un VRAI PDF, d'une page, de la taille annoncée ──
  c = await entrer({ profil:'mac' }); p = c.p;
  await S(c, () => courrierOuvrir('m3')); await p.waitForTimeout(900);
  const annonce = await S(c, () => ({ nom:R().querySelector('.att .fn').textContent, taille:R().querySelector('.att .fs').textContent }));
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'mail-pj-')), dest = path.join(dossier, 'pj.pdf');
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout:8000 }), S(c, () => R().querySelector('[data-dl]').click())]);
  await dl.saveAs(dest);
  const octets = fs.statSync(dest).size; let pages = 0, texte = '';
  try { pages = +(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [dest]).toString()) || [0, 0])[1]; texte = execFileSync('pdftotext', ['-layout', dest, '-']).toString(); } catch (e) { texte = 'ERREUR ' + e.message; }
  v('ordinateur-17 le fichier téléchargé est un PDF lisible d\'UNE page (pdfinfo) qui porte le texte de la facture (pdftotext)', pages === 1 && /FA-CDA-10-552/.test(texte) && octets > 800, { octets, pages, texte:texte.slice(0, 120) });
  v('ordinateur-17 la taille annoncée dans la liste est la vraie (« ' + annonce.taille + ' » pour ' + octets + ' octets)', annonce.taille === (octets < 1048576 ? Math.round(octets / 1024) + ' Ko' : '') || Math.abs(parseInt(annonce.taille) - octets / 1024) <= 1, { annonce, octets });
  // une photo : une vraie image (pas un PDF qui porte le nom d'une image)
  await S(c, () => courrierOuvrir('m1')); await p.waitForTimeout(900);
  const [dl2] = await Promise.all([p.waitForEvent('download', { timeout:8000 }), S(c, () => R().querySelector('[data-dl]').click())]);
  const dest2 = path.join(dossier, 'photo.jpg'); await dl2.saveAs(dest2); const tete = fs.readFileSync(dest2).subarray(0, 3);
  v('ordinateur-17 la photo téléchargée est une vraie image JPEG (FF D8 FF)', tete[0] === 0xff && tete[1] === 0xd8 && tete[2] === 0xff, tete.toString('hex'));
  const tPhoto = await S(c, () => R().querySelector('.att .fs').textContent), oPhoto = fs.statSync(dest2).size;
  v('ordinateur-17 la taille annoncée de la photo est la vraie (« ' + tPhoto + ' » pour ' + oPhoto + ' octets)', Math.abs(parseFloat(tPhoto.replace(',', '.')) * (/Mo/.test(tPhoto) ? 1048576 : 1024) - oPhoto) <= (/Mo/.test(tPhoto) ? 52429 : 1024), { tPhoto, oPhoto });
  await fin(c);

  // ── ordinateur-19 : « Reconnecter » ouvre « Boîtes connectées » ; « Réessayer » dit ce qu'il a trouvé ──
  c = await entrer({ profil:'mac' }); p = c.p; await casserBoite(c);
  await S(c, () => R().querySelector('[data-folder=inbox]').click()); await p.waitForTimeout(300);
  v('ordinateur-19 population : le bandeau rouge est là, avec ses deux boutons', await S(c, () => !!R().querySelector('.loaderr [data-gererboites]') && !!R().querySelector('.loaderr [data-retry]')));
  await p.locator('#courrier-hote .loaderr [data-retry]').click(); await p.waitForTimeout(900);
  const re = await S(c, () => (R().querySelector('#toast') || {}).innerText || '');
  v('ordinateur-19 « Réessayer » dit ce qu\'il a trouvé (« … ne répond toujours pas »)', /toujours/.test(re), re);
  await p.locator('#courrier-hote .loaderr [data-gererboites]').click(); await p.waitForTimeout(800);
  const pan = await S(c, () => (document.querySelector('#calque .panneau h2') || {}).textContent || '');
  v('ordinateur-19 « Reconnecter » ouvre « Boîtes connectées »', /Boîtes connectées/.test(pan), pan);
  await cap(c, 'corr-reconnecter-mac');
  await S(c, () => { try { fermerPanneau(); } catch (e) {} });
  await S(c, () => { ML_BOITES[1].etat = 'ok'; return COURRIER.inst.rafraichir(); }); await p.waitForTimeout(800);
  await p.locator('#courrier-hote [data-folder=archive]').click(); await p.waitForTimeout(300);
  await S(c, () => { ML_BOITES[1].etat = 'ok'; });
  const ok = await S(c, () => !R().querySelector('.loaderr'));
  v('ordinateur-19 boîte rétablie : le bandeau part', ok);
  await fin(c);

  // ── ordinateur-11 : mêmes mots partout, typographie française ──
  c = await entrer({ profil:'mac' }); p = c.p;
  await S(c, () => R().querySelector('#btnCompose').click()); await p.waitForTimeout(600);
  await S(c, () => R().querySelector('#cSched').click()); await p.waitForTimeout(500);
  const prog = await S(c, () => R().querySelector('#cSchedWrap').textContent.replace(/\s+/g, ' '));
  v('ordinateur-11 envoi programmé : ni « Fuseau », ni « Europe/ », ni « 08:00 » ; « aujourd’hui » avec l\'apostrophe de l\'écran, « 18 h »', !/Fuseau|Europe\//.test(prog) && !/\b\d\d:\d\d\b/.test(prog) && /\d{1,2} h/.test(prog) && !/Aujourd'hui|aujourd'hui/.test(prog), prog.slice(0, 260));
  await cap(c, 'corr-programmer-mac');
  await S(c, () => R().querySelector('#cCancel').click()); await p.waitForTimeout(400);
  await S(c, () => courrierOuvrir('m2')); await p.waitForTimeout(800);
  await S(c, () => R().querySelector('#whyBtn').click()); await p.waitForTimeout(300);
  const why = await S(c, () => R().querySelector('#whyPanel').textContent.replace(/\s+/g, ' '));
  v('ordinateur-11 « Pourquoi ce rangement ? » : ni « appareil » ni « pas encore vérifié »', !/appareil|vérifié/i.test(why), why);
  await S(c, () => R().querySelector('[data-act=moveCat]').click()); await p.waitForTimeout(500);
  const mv = await S(c, () => [...R().querySelectorAll('#mvList b')].map(b => b.textContent));
  v('ordinateur-11 « Ranger ailleurs… » : la catégorie s\'appelle « Factures et reçus » comme dans la barre (population : cinq choix)', mv.length === 5 && mv.includes('Factures et reçus') && !mv.includes('Reçus'), mv);
  await fin(c);
  await sortie();
})();

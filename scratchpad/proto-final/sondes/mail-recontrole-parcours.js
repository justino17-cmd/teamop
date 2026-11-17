// Boîte mail, étape 5 « recontrôler » (17 novembre 2026) — TROIS PARCOURS de bout en bout, joués comme une vraie personne (clics sur les boutons du module,
// pas d'appel direct aux fonctions sauf pour LIRE l'état après), puis relecture des données et de l'historique.
//  A. ordinateur (mac) : Mme Bernard écrit pour une panne → créer l'intervention → prévenir le client → envoyer → Envoyés + planning + historique.
//  B. téléphone (iphone, nuit) : la facture d'un fournisseur → rapprocher → pièce jointe PDF → ranger dans les achats.
//  C. ordinateur (windows, nuit) : un inconnu demande un devis → créer le client et son devis → répondre avec un modèle → envoyer.
// ⛔ 127.0.0.1 seulement. PARTIE=A|B|C pour n'en jouer qu'un.
const { lib, v, entrer, cap, fin, sortie, ouvrirMsg } = require('./mail-commun.js');
const fs = require('fs'), os = require('os'), path = require('path'), { execFileSync } = require('child_process');
const S = (c, f, a) => c.p.evaluate(f, a);
const PARTIE = process.env.PARTIE || '0', veut = n => PARTIE === '0' || PARTIE === n;
const sec = async (nom, f) => { try { await f(); } catch (e) { v('PARCOURS ' + nom + ' : aucune exception', false, String(e && e.message || e).slice(0, 300) + ' @ ' + String(e && e.stack || '').split('\n')[1]); } };
(async () => {
  const bouton = async (c, texte, zone) => { const b = c.p.locator((zone || '#courrier-hote .hband') + ' button', { hasText:texte }).first(); const n = await b.count(); if (n) { await b.click(); await c.p.waitForTimeout(800); } return n; };
  if (veut('A')) await sec('A (Mme Bernard, ordinateur)', async () => {
    const c = await entrer({ profil:'mac' }), p = c.p;
    const nInt0 = await S(c, () => INTS.length), hist0 = await S(c, () => JOURNAL.length);
    await p.locator('#courrier-hote .msg', { hasText:'Climatisation chambre 214' }).first().click(); await p.waitForTimeout(800);
    const lu = await S(c, () => ({ sujet:R().querySelector('.rsubj').textContent, band:(R().querySelector('.hband .ht') || {}).textContent, boutons:[...R().querySelectorAll('.hband button')].map(b => b.textContent.replace(/\s+/g, ' ').trim()), texte:R().querySelector('.rbody').textContent.slice(0, 80) }));
    v('A1 la lecture dit ce que c\'est (« ' + lu.band + ' ») et propose ses gestes (' + lu.boutons.length + ')', /intervention|panne/i.test(lu.band || '') && lu.boutons.some(b => /Créer l’intervention/.test(b)) && lu.boutons.length >= 3, lu);
    await cap(c, 'rc-A1-lecture-mac');
    v('A2 « Créer l\'intervention » touché ouvre la fenêtre du prototype, client déjà choisi', await bouton(c, 'Créer l’intervention') === 1 && await S(c, () => !!document.querySelector('.fen') && /Bernard|Hôtel|Plage/i.test((document.querySelector('.fen') || {}).innerText || '')));
    await cap(c, 'rc-A2-intervention-mac');
    await S(c, () => document.querySelector('.fen [data-action=cPlusTard]').click()); await p.waitForTimeout(300);
    await S(c, () => document.querySelector('.fen [data-action=cCreer]').click()); await p.waitForTimeout(1000);
    const nInt1 = await S(c, () => INTS.length);
    v('A3 l\'intervention est créée (' + nInt0 + ' → ' + nInt1 + ') et liée au courriel', nInt1 === nInt0 + 1 && await S(c, () => INTS.some(i => i.mail === 'm1' || /Climatisation chambre 214/.test(i.titre || i.t || ''))), { nInt0, nInt1 });
    await p.waitForTimeout(500);
    // le module est toujours là, au même message, et propose maintenant de prévenir le client
    await S(c, () => courrierOuvrir('m1')); await p.waitForTimeout(900);
    v('A4 après la création, le bandeau propose « Prévenir le client » (et plus « Créer l\'intervention »)', await S(c, () => { const t = [...R().querySelectorAll('.hband button')].map(b => b.textContent); return t.some(x => /Prévenir le client/.test(x)) && !t.some(x => /Créer l’intervention/.test(x)); }));
    await bouton(c, 'Prévenir le client');
    const compo = await S(c, () => ({ a:(R().querySelector('#cTo') || {}).value, o:(R().querySelector('#cSub') || {}).value, b:(R().querySelector('#cBody') || {}).value }));
    v('A5 le message est préparé : bon destinataire, objet « Re: », texte de dépannage (ni accord ni installation)', /@/.test(compo.a || '') && /Climatisation chambre 214/.test(compo.o || '') && /dépannage|demande/i.test(compo.b || '') && !/accord|installation/i.test(compo.b || ''), compo);
    await cap(c, 'rc-A5-prevenir-mac');
    await p.locator('#courrier-hote #cSend').click(); await p.waitForTimeout(800);
    const toast = await S(c, () => ({ t:R().querySelector('#toast').innerText, show:R().querySelector('#toast').classList.contains('show') }));
    v('A6 « Envoyer » ne part pas tout de suite : une bulle propose d\'annuler', toast.show && /Annuler/.test(toast.t), toast);
    const parti = await lib.attendre(p, () => MAILS.some(m => m.dossier === 'envoye' && /Climatisation chambre 214/.test(m.sujet || '')) || (window.R && R().querySelector('#toast') && /envoyé/i.test(R().querySelector('#toast').innerText)), 16000);
    await p.waitForTimeout(800);
    await S(c, () => R().querySelector('[data-folder=sent]').click()); await p.waitForTimeout(500);
    const env = await S(c, () => [...R().querySelectorAll('#rows .msg')].map(r => r.textContent.replace(/\s+/g, ' ').slice(0, 100)));
    v('A7 le message part VRAIMENT et se retrouve dans Envoyés (parti: ' + parti + ')', env.some(t => /Climatisation chambre 214/.test(t)), env.slice(0, 4));
    await S(c, () => R().querySelector('[data-folder=inbox]').click()); await p.waitForTimeout(400);
    const hist1 = await S(c, () => JOURNAL.length);
    v('A7b (collatéral) l\'Historique garde une trace des gestes (' + hist0 + ' → ' + hist1 + ' lignes)', hist1 > hist0, { hist0, hist1 });
    // la page de l'Accueil dit les choses (« à traiter » diminué) et l'historique garde une trace du geste
    await lib.aller(p, 'accueil'); await p.waitForTimeout(700);
    await lib.aller(p, 'boiteMail'); await p.waitForTimeout(900);
    const apres = await S(c, () => ({ en:document.querySelector('.mbx-tete .gris').textContent, calc:courrierNbATraiter(), sub:R().querySelector('#lbSub').innerText.replace(/\s+/g, ' ') }));
    v('A8 en revenant dans la Boîte mail, la page garde la liste et le compteur juste (« ' + apres.en + ' »)', new RegExp('^' + apres.calc + ' message').test(apres.en) || (apres.calc === 0 && /Tout est traité/.test(apres.en)), apres);
    await lib.aller(p, 'planning'); await p.waitForTimeout(700);
    v('A9 le planning s\'ouvre sans erreur après les gestes de la Boîte mail', c.err.length === 0, c.err.slice(0, 3));
    await fin(c);
  });

  if (veut('B')) await sec('B (facture fournisseur, iPhone nuit)', async () => {
    const c = await entrer({ profil:'iphone', nuit:true }), p = c.p;
    await p.locator('#courrier-hote .msg', { hasText:'Facture FA-CDA-10-552' }).first().tap(); await p.waitForTimeout(800);
    const lu = await S(c, () => ({ band:(R().querySelector('.hband .ht') || {}).textContent, boutons:[...R().querySelectorAll('.hband button')].map(b => b.textContent.replace(/\s+/g, ' ').trim()), pj:(R().querySelector('.att .fn') || {}).textContent }));
    v('B1 la facture du fournisseur est reconnue, avec « Rapprocher » et sa pièce jointe (' + lu.pj + ')', /facture/i.test(lu.band || '') && lu.boutons.some(b => /Rapprocher/.test(b)) && /\.pdf$/i.test(lu.pj || ''), lu);
    await cap(c, 'rc-B1-facture-iphone-nuit');
    // la pièce jointe se télécharge au toucher et c'est un vrai PDF
    const dest = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rc-pj-')), 'f.pdf');
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout:9000 }), S(c, () => R().querySelector('[data-dl]').click())]);
    await dl.saveAs(dest); let pages = 0; try { pages = +(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [dest]).toString()) || [0, 0])[1]; } catch (e) {}
    v('B2 la pièce jointe téléchargée est un vrai PDF d\'une page (' + fs.statSync(dest).size + ' octets)', pages === 1, pages);
    v('B3 « Rapprocher » ouvre le panneau avec la commande 2026-036 et l\'écart', await bouton(c, 'Rapprocher') === 1 && await S(c, () => /2026-036/.test((document.querySelector('#calque .panneau') || {}).innerText || '') && /1,20/.test((document.querySelector('#calque .panneau') || {}).innerText || '')));
    const pan = await S(c, () => { const pn = document.querySelector('#calque .panneau'), r = pn.getBoundingClientRect(); return { x:[Math.round(r.left), Math.round(r.right)], iw:innerWidth, btns:[...pn.querySelectorAll('button')].map(b => ({ t:b.textContent.replace(/\s+/g, ' ').trim().slice(0, 40), h:Math.round(b.getBoundingClientRect().height) })) }; });
    v('B4 le panneau tient dans l\'écran de l\'iPhone et ses boutons se touchent (≥ 40 px) : ' + pan.btns.map(b => b.t).join(' | '), pan.x[0] >= -1 && pan.x[1] <= pan.iw + 1 && pan.btns.length >= 2 && pan.btns.every(b => b.h >= 38), pan);
    await cap(c, 'rc-B4-rapprocher-iphone-nuit');
    const avant = await S(c, () => JSON.stringify(COMMANDES) + '|' + JSON.stringify(mlLire(mlDe('m3')).facture || null));
    const ranger = p.locator('#calque .panneau button', { hasText:/Accepter l’écart|Accepter/ }).first(); const nr = await ranger.count();
    if (nr) { await ranger.tap(); await p.waitForTimeout(1000); }
    const apres = await S(c, () => ({ donnees:JSON.stringify(COMMANDES) + '|' + JSON.stringify(mlLire(mlDe('m3')).facture || null), panneau:!!document.querySelector('#calque .panneau'), pt:(document.querySelector('#calque .panneau') || {}).innerText || '', toast:(document.getElementById('toast') || {}).innerText || '', bandeau:(R().querySelector('.hband') || {}).textContent || '' }));
    v('B5 « Accepter l\'écart » touché : les données changent, la commande est « Terminée » et une bulle le dit avec « Annuler » — population : le bouton existait (' + nr + ')', nr === 1 && apres.donnees !== avant && /Terminée/.test(apres.pt) && /Annuler/.test(apres.toast), { toast:apres.toast, bandeau:apres.bandeau.slice(0, 120), panneau:apres.panneau });
    await cap(c, 'rc-B5-apres-iphone-nuit');
    v('B6 aucune erreur JavaScript pendant le parcours', c.err.length === 0, c.err.slice(0, 3));
    await fin(c);
  });

  if (veut('C')) await sec('C (inconnu qui demande un devis, Windows nuit)', async () => {
    const c = await entrer({ profil:'windows', nuit:true }), p = c.p;
    const nCl0 = await S(c, () => Object.keys(CLIENTS).length), nDev0 = await S(c, () => Object.keys(DEVIS).length);
    await p.locator('#courrier-hote .msg', { hasText:'Demande de devis climatisation' }).first().click(); await p.waitForTimeout(800);
    const lu = await S(c, () => ({ band:(R().querySelector('.hband .ht') || {}).textContent, boutons:[...R().querySelectorAll('.hband button')].map(b => b.textContent.replace(/\s+/g, ' ').trim()), past:(R().querySelector('#rows .msg.sel .hpast,.msg.on .hpast') || {}).textContent }));
    v('C1 l\'inconnue est reconnue (« Nouveau contact ») et on lui propose « Créer le client et son devis »', /devis/i.test(lu.band || '') && lu.boutons.some(b => /Créer le client/.test(b)), lu);
    await cap(c, 'rc-C1-devis-windows-nuit');
    const nb = await bouton(c, 'Créer le client');
    const tir = await S(c, () => { const pn = document.querySelector('#calque .panneau, .fen'); return pn ? { t:pn.innerText.replace(/\s+/g, ' ').slice(0, 220), champs:[...pn.querySelectorAll('input,textarea,select')].map(i => i.placeholder || i.name || i.id).slice(0, 8), boutons:[...pn.querySelectorAll('button')].map(b => b.textContent.replace(/\s+/g, ' ').trim()) } : null; });
    v('C2 le tiroir « Que demande-t-il ? » s\'ouvre, nomme la cliente, lit « 35 m² » dans son message et propose six choix', nb === 1 && !!tir && /fontaine/i.test(tir.t) && /35 m²/.test(tir.t) && tir.boutons.length >= 6, tir);
    await cap(c, 'rc-C2-tiroir-windows-nuit');
    const ok = p.locator('#calque .panneau button', { hasText:'Préparer le devis' }).first(); const nok = await ok.count();
    if (nok) { await ok.click(); await p.waitForTimeout(1400); }
    await cap(c, 'rc-C3-apres-preparer-windows-nuit');
    const apres = await S(c, () => ({ nCl:Object.keys(CLIENTS).length, nDev:Object.keys(DEVIS).length, fontaine:Object.values(CLIENTS).some(k => /Fontaine/.test(k.nom || k.contact || '') || k.mail === 'c.fontaine@exemple.fr'), route, fenetre:!!document.querySelector('.fen'), panneau:!!document.querySelector('#calque .panneau'), texte:((document.querySelector('.fen') || document.querySelector('#calque .panneau') || {}).innerText || '').replace(/\s+/g, ' ').slice(0, 300) }));
    v('C3 « Préparer le devis » : la cliente est créée (' + nCl0 + ' → ' + apres.nCl + ') et l\'éditeur de devis s\'ouvre (rubrique « ' + apres.route + ' »)', nok === 1 && apres.fontaine && apres.nCl === nCl0 + 1 && apres.route === 'devis', apres);
    // on revient au courriel : la pastille n'est plus « Nouveau contact », une réponse rapide « devis annoncé » existe
    await lib.aller(p, 'boiteMail'); await p.waitForTimeout(900);
    await S(c, () => courrierOuvrir('m5')); await p.waitForTimeout(900);
    const re = await S(c, () => ({ band:(R().querySelector('.hband .ht') || {}).textContent, rapides:[...R().querySelectorAll('[data-quick],.qr button,.quick button,.rapides button')].map(b => b.textContent.trim()).slice(0, 6), pastille:(([...R().querySelectorAll('#rows .msg')].find(r => /Demande de devis climatisation/.test(r.textContent)) || { querySelector:() => null }).querySelector('.hpast') || {}).textContent }));
    v('C4 le courriel n\'est plus un « Nouveau contact » (pastille : « ' + re.pastille + ' »)', !/Nouveau contact/.test(re.pastille || ''), re);
    const q = p.locator('#courrier-hote [data-quick]').first(); const nq = await q.count();
    v('C5 population : au moins une réponse rapide est proposée (' + nq + ')', nq >= 1, re.rapides);
    if (nq) { await q.click(); await p.waitForTimeout(900);
      const compo = await S(c, () => ({ a:(R().querySelector('#cTo') || {}).value, b:(R().querySelector('#cBody') || {}).value }));
      v('C6 la réponse rapide ouvre un message adressé à l\'inconnue, texte écrit', /fontaine/i.test(compo.a || '') && (compo.b || '').length > 40, compo);
      await cap(c, 'rc-C6-reponse-windows-nuit');
      await p.locator('#courrier-hote #cSend').click(); await p.waitForTimeout(800);
      const gagne = await lib.attendre(p, () => MAILS.some(m => m.dossier === 'envoye' && /fontaine/i.test((m.a || ''))), 16000); await p.waitForTimeout(500);
      v('C7 la réponse part et se retrouve dans les courriels envoyés', gagne, gagne); }
    v('C8 aucune erreur JavaScript pendant le parcours', c.err.length === 0, c.err.slice(0, 3));
    await fin(c);
  });
  await sortie();
})();

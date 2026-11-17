// Sonde « défauts » : D01-D16 de scratchpad/proto-final/refonte/BOITE-MAIL.md REJOUÉS sur le module monté dans le prototype (pas sur le kit). ✓ = corrigé.
// Chaque contrôle dit ce qu'il a mesuré. Une population vide ne passe pas : on compte les lignes / boutons avant de croire un « zéro ».
const { lib, v, entrer, cap, fin, sortie, ouvrirMsg, casserBoite } = require('./mail-commun.js');
const S = (c, f, a) => c.p.evaluate(f, a);
(async () => {
  let c = await entrer({ profil:'mac' }), p = c.p;
  await ouvrirMsg(c, 'm1');
  await p.locator('#courrier-hote .msg.sel').first().click(); await p.waitForTimeout(300);   // le focus doit être DANS le module (comme un vrai doigt)
  await p.keyboard.press('r'); await p.waitForTimeout(500);
  const d01 = await S(c, () => { const b = R().querySelector('#cBody'); return b ? b.value : null; });
  v('D01 la touche « r » ouvre la réponse sans écrire de « r »', d01 !== null && !/^r/.test(d01), d01 && d01.slice(0, 30));
  const d10 = await S(c, () => R().querySelector('#cTitle').innerText);
  v('D10 une réponse s\'appelle « Répondre », pas « Nouveau message »', /Répondre/.test(d10), d10);
  const d05 = await S(c, () => { const l = R().querySelector('#cSend .lbl'); return l ? { aff:getComputedStyle(l).display, txt:l.textContent } : null; });
  v('D05 « Envoyer » porte son mot sur ordinateur', !!d05 && d05.aff !== 'none' && d05.txt === 'Envoyer', d05);
  await cap(c, 'defauts-composeur-mac');
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  const fauxBrouillon = await S(c, () => ({ toast:(R().querySelector('#toast') || {}).innerText || '' }));
  v('D01 Échap ne crée pas de faux brouillon', !/Brouillon enregistré/.test(fauxBrouillon.toast), fauxBrouillon);
  await ouvrirMsg(c, 'm1');
  const q = await S(c, () => [...R().querySelectorAll('[data-quick]')].map(b => b.dataset.quick.length + ':' + b.textContent.trim()));
  v('D16 les réponses rapides sont celles du SUJET (modèles de l\'application), pas quatre phrases fixes', q.length >= 2 && q.some(x => /créneau|Accusé/i.test(x)), q);
  await S(c, () => R().querySelector('[data-quick]').click()); await p.waitForTimeout(500);
  const d02 = await S(c, () => R().querySelector('#cBody').value);
  const iSig = d02.indexOf('-- '), iBonj = d02.indexOf('Bonjour');
  v('D02 la réponse rapide est AVANT la signature, rien n\'est collé après', iBonj >= 0 && iSig > iBonj && !/[a-zA-Z]Bonjour/.test(d02), d02.slice(0, 200));
  const cur = await S(c, () => R().querySelector('#cBody').selectionStart);
  v('D02 le curseur est à la fin de la phrase, pas tout en haut', cur > 5, cur);
  await S(c, () => R().querySelector('#cCancel').click()); await p.waitForTimeout(300);
  await p.locator('#courrier-hote .msg.sel').first().click(); await S(c, () => R().querySelector('#readActs .acts-mac [data-act=forward]').click()); await p.waitForTimeout(500);
  const tr = await S(c, () => ({ titre:R().querySelector('#cTitle').innerText, corps:R().querySelector('#cBody').value }));
  v('D16 un transfert s\'ouvre en « Transférer » avec un en-tête « Message transféré » (pas « a écrit : > »)', tr.titre === 'Transférer' && /---------- Message transféré ----------\nDe : /.test(tr.corps) && !/a écrit :/.test(tr.corps), tr);
  await S(c, () => R().querySelector('#cCancel').click()); await p.waitForTimeout(300);
  // D07 : un refus n'a pas la coche de la réussite, et le champ fautif est marqué
  await S(c, () => R().querySelector('[aria-label*="Nouveau message"]').click()); await p.waitForTimeout(400);
  await S(c, () => { R().querySelector('#cTo').value = 'pas-une-adresse'; R().querySelector('#cSend').click(); }); await p.waitForTimeout(400);
  const d07 = await S(c, () => { const t = R().querySelector('#toast'), k = t.querySelector('svg path'); return { texte:t.innerText.trim(), chemin:k ? k.getAttribute('d') : '', champ:R().querySelector('#cTo').getAttribute('aria-invalid') }; });
  v('D07 un refus ne porte pas la coche verte et marque le champ', d07.texte.length > 5 && !/12\.75 4\.5 4\.5/.test(d07.chemin) && d07.champ === 'true', d07);
  const d06 = await S(c, () => { R().querySelector('#cSched').click(); return R().querySelector('#cSchedWrap').textContent; }); await p.waitForTimeout(300);
  v('D06 aucun « pour tester » dans l\'envoi programmé', /Dans 1 heure/.test(d06) && !/pour tester|1 minute/.test(d06), d06.slice(0, 160));
  const d08 = await S(c, () => ({ btn:R().querySelector('#cSignBtn') ? getComputedStyle(R().querySelector('#cSignBtn')).display : 'absent', maint:/maintenance/i.test(R().textContent) }));
  v('D08 ni « Faire signer » ni « maintenance » dans le composeur', d08.btn === 'none' && !d08.maint, d08);
  v('D13 l\'envoi programmé n\'avertit pas d\'un défaut qu\'il n\'a pas (le prototype programme côté serveur)', !(await S(c, () => !!R().querySelector('.sched-warn, .sched-note'))));
  await S(c, () => R().querySelector('#cCancel').click()); await p.waitForTimeout(300);
  // D03 / D04 / D09 : les mots et les nombres
  const cats = await S(c, () => [...R().querySelectorAll('#catBar [data-cat]')].map(b => ({ id:b.dataset.cat, mot:(b.querySelector('.cl') || {}).textContent || '', vu:b.querySelector('.cl') ? getComputedStyle(b.querySelector('.cl')).position !== 'absolute' : false })));
  v('D03 six catégories, chacune avec son MOT visible (population comptée)', cats.length === 6 && cats.every(x => x.vu && x.mot.length > 2), cats);
  const nb = await S(c, () => { const t = s => ((R().querySelector(s) || {}).innerText || '').replace(/\n/g, ' '); return { titre:t('#lbSub'), recep:t('[data-folder=inbox]'), traiter:t('[data-folder=s_atraiter]'), principal:t('[data-cat=principal]'), ent:t('#ltSub') }; });
  const nombres = [...new Set(JSON.stringify(nb).match(/\d+/g) || [])];
  v('D04 un seul nombre pour les messages à lire (en-tête, dossier, suivi, catégorie)', nombres.length === 1, nb);
  const mots = await S(c, () => R().textContent.replace(/\s+/g, ' '));
  const interdits = ['OP Courrier', 'Envois TeamOP', 'SPF', 'DKIM', 'DMARC', 'Pourquoi ici', 'Déplacer vers', 'Boîtes aux lettres', 'Marqués', 'Programmés', 'Ajouter un compte', 'Comptes pro'];
  v('D09 aucun mot interne ou technique dans le module', interdits.every(m => mots.indexOf(m) < 0), interdits.filter(m => mots.indexOf(m) >= 0));
  v('D09 « Ajouter une boîte mail » est la seule entrée pour ajouter', (mots.match(/Ajouter une boîte mail/g) || []).length === 1, (mots.match(/Ajouter une boîte mail/g) || []).length);
  // D16 : objet « Re: Re: Re: » nettoyé, boîte illisible dite, Marquer non lu garde la lecture
  const re = await S(c, () => { const o = courrierSource(); return 0; });
  await S(c, () => { MAILS.push(mlM('mrx', AUJ, '09:40', { nom:'Test Re', mail:CLIENTS.hp.mail }, 'Re: Re: Re: Rendez-vous du 12', 'Bonjour, ok.')); });
  await S(c, () => COURRIER.inst.rafraichir()); await p.waitForTimeout(700);
  await ouvrirMsg(c, 'mrx');
  const sj = await S(c, () => R().querySelector('.rsubj').textContent);
  v('D16 « Re: Re: Re: » est nettoyé en tête de lecture', sj === 'Re: Rendez-vous du 12', sj);
  await S(c, () => R().querySelector('#readActs .acts-mac [data-act=unread]').click()); await p.waitForTimeout(400);
  v('D16 « Marquer comme non lu » ne ferme pas le message ouvert (grand écran)', await S(c, () => !!R().querySelector('.rsubj') && /Rendez-vous/.test(R().querySelector('.rsubj').textContent)));
  await casserBoite(c);   // l'état par défaut a ses deux boîtes connectées (chef-01) : celui-ci est posé ici
  v('D16 la boîte illisible se DIT avec sa raison et un bouton « Reconnecter »', await S(c, () => /ne répond plus : le mot de passe/.test(R().querySelector('.loaderr').textContent) && /Reconnecter/.test(R().querySelector('.loaderr').textContent)));
  const sub = await S(c, () => R().querySelector('#lbSub').textContent.trim());
  v('D16 le sous-titre ne dit plus « Boîtes mail · Pr… » (tronqué) mais la catégorie et le nombre', !/Boîtes mail/.test(sub), sub);
  await fin(c);
  // D11 : clic droit sur la 2e ligne à 768 px de haut ; D12 : on ne répond pas à un indésirable ; D15 : tailles
  c = await entrer({ profil:'windows' }); p = c.p;
  await S(c, () => { const m = R().querySelectorAll('.msg'); return m.length; });
  await p.evaluate(() => { const r = R().querySelectorAll('.msg')[1].getBoundingClientRect(); window.__pt = { x:r.left + 60, y:r.top + 20 }; });
  const pt = await p.evaluate(() => window.__pt); await p.mouse.click(pt.x, pt.y, { button:'right' }); await p.waitForTimeout(500);
  const d11 = await S(c, () => { const bs = [...R().querySelectorAll('#overlays button')], l = bs[bs.length - 1]; return l ? { n:bs.length, dernier:l.innerText.trim(), bas:Math.round(l.getBoundingClientRect().bottom), fenetre:innerHeight } : null; });
  v('D11 le menu du clic droit reste dans l\'écran (windows 1366×768) et ne compte que six gestes', !!d11 && d11.bas <= d11.fenetre && d11.n <= 7, d11);
  const tw = await S(c, () => { const t = R().querySelector('.list .lb-title'); return t ? { sw:t.scrollWidth, cw:t.clientWidth, texte:t.textContent } : null; });
  v('D16 le titre « Boîte de réception » n\'est pas tronqué non plus à 1366 px (Windows : colonne de liste assez large)', !!tw && tw.sw <= tw.cw, tw);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await ouvrirMsg(c, 'm1'); await S(c, () => R().querySelector('#readActs .acts-mac [data-act=junk]').click()); await p.waitForTimeout(600);
  await S(c, () => R().querySelector('[data-folder=junk]').click()); await p.waitForTimeout(500);
  await S(c, () => R().querySelector('.msg').click()); await p.waitForTimeout(500);
  const d12 = await S(c, () => ['reply', 'replyAll', 'forward'].map(a => { const b = R().querySelector('#readActs .acts-mac [data-act=' + a + ']'); return a + ':' + (b ? (b.disabled ? 'inactif' : 'actif') : 'absent'); }));
  v('D12 dans « Courrier indésirable », Répondre / à tous / Transférer sont inactifs', d12.length === 3 && d12.every(x => /inactif/.test(x)), d12);
  await fin(c);
  c = await entrer({ profil:'mac' }); p = c.p; await ouvrirMsg(c, 'm1');
  const tail = await S(c, () => { const t = (s, sel) => parseFloat(getComputedStyle(R().querySelector(sel)).fontSize); return { expediteur:t(0, '.msg .m-from'), objet:t(0, '.msg .m-sub'), apercu:t(0, '.msg .m-prev'), date:t(0, '.msg .m-date'), corps:t(0, '.rbody'), segmente:t(0, '.seg button') }; });
  v('D15 texte lisible sur ordinateur : expéditeur ≥ 15, objet ≥ 14, aperçu ≥ 13, date ≥ 13, corps ≥ 16, segmenté ≥ 13', tail.expediteur >= 15 && tail.objet >= 14 && tail.apercu >= 13 && tail.date >= 13 && tail.corps >= 16 && tail.segmente >= 13, tail);
  const pied = await S(c, () => { const f = R().querySelector('.side-foot').getBoundingClientRect(); return { bas:Math.round(f.bottom), h:innerHeight }; });
  v('D16 le pied de la colonne (« Ajouter une boîte mail », « Réglages ») est dans l\'écran à 1440×900', pied.bas <= pied.h, pied);
  await fin(c);
  c = await entrer({ profil:'mac720' }); p = c.p;
  // à 1280 px le module prend la mise en page « tablette » : la colonne des boîtes est un tiroir, qu'on ouvre ; son pied (« Ajouter une boîte mail ») est au bout du défilement, il ne recouvre plus les dossiers (telephone-06)
  await S(c, () => R().querySelector('#btnNav').click()); await p.waitForTimeout(700); await S(c, () => { const s = R().querySelector('#sideScroll'); s.scrollTop = s.scrollHeight; }); await p.waitForTimeout(300);
  const pied2 = await S(c, () => { const f = R().querySelector('.side-foot').getBoundingClientRect(), s = R().querySelector('#sideScroll'); return { bas:Math.round(f.bottom), h:innerHeight, defile:s.scrollHeight > s.clientHeight }; });
  v('D16 à 1280×720, le pied de colonne est dans l\'écran (ou la colonne défile et le dit)', pied2.bas <= pied2.h, pied2);
  const titre = await S(c, () => { const t = R().querySelector('#ltTitle'); return t ? { tronque:t.scrollWidth > t.clientWidth + 1, txt:t.textContent } : null; });
  v('D16 le titre « Boîte de réception » n\'est pas tronqué à 1280 px', !!titre && !titre.tronque, titre);
  await fin(c);
  // D14 : 1 500 e-mails
  c = await entrer({ profil:'mac' }); p = c.p;
  await S(c, () => { for (let i = 0; i < 1500; i++) MAILS.push(mlM('g' + i, jour(-(i % 60)), '09:' + String(i % 60).padStart(2, '0'), { nom:'Contact ' + i, mail:'c' + i + '@exemple.fr' }, 'Message numéro ' + i, 'Texte ' + i, { lu:i % 3 === 0 })); COURRIER.inst.rafraichir(); });
  await p.waitForTimeout(2500);
  const ms = await S(c, () => new Promise(ok => { const t = performance.now(); R().querySelectorAll('.msg')[8].click(); requestAnimationFrame(() => requestAnimationFrame(() => ok(Math.round(performance.now() - t)))); }));
  const lignes = await S(c, () => R().querySelectorAll('.msg').length);
  v('D14 boîte de 1 500+ e-mails : le clic sur un message < 150 ms, et la page ne porte pas 1 500 lignes', ms < 150 && lignes <= 240 && lignes >= 100, { ms, lignes });
  await fin(c);
  await sortie();
})().catch(e => { console.log('ERREUR', e.message, e.stack.split('\n')[1]); process.exit(1); });

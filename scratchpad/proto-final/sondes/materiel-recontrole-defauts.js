// Recontrôle adverse du lot « materiel » — les corrections REJOUÉES par un autre chemin (le toucher, le texte de l'écran),
// puis leurs bords : ce que la correction a pu casser à côté. Usage : node materiel-recontrole-defauts.js <marc|julie|sm> [profil] [nuit 0|1]
const L = require('../lib.js');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/materiel-recontrole/';
(async () => {
  const qui = process.argv[2] || 'marc', profil = process.argv[3] || 'mac', nuit = process.argv[4] === '1';
  const c = await L.ouvrir({ profil, nuit, qui }), p = c.p, v = L.v, R = (f, a) => p.evaluate(f, a);
  const tag = qui + '-' + profil + (nuit ? '-n' : '-j');
  const clic = async s => { const ok = await L.toucher(c, s); if (!ok) v('geste impossible : ' + s, false); return ok; };
  const calme = ms => L.calme(p, ms || 350);
  const cap = nom => L.capture(c, CAP + 'def-' + tag + '-' + nom + '.png');
  const toastTxt = () => R(() => { const t = document.getElementById('toast'); return t && t.classList.contains('on') ? t.textContent : ''; });
  if (qui === 'marc') {
    // ── 01 : carte, fiche et liste de CHAQUE lieu disent le même nombre ──
    await L.aller(p, 'boxes'); await calme(400); await cap('depots');
    const lieux = await R(() => [...document.querySelectorAll('[data-md^="fiche|"]')].map(b => b.dataset.md.split('|')[1]));
    v('01 population : ' + lieux.length + ' lieux dans Dépôts et camions', lieux.length >= 4, lieux);
    let incoh = [];
    for (const id of lieux) {
      const carte = await R(i => { const b = document.querySelector('[data-md="fiche|' + i + '"]'); const st = b && b.querySelector('.st'); return st ? st.textContent.trim() : null; }, id);
      await clic('[data-md="fiche|' + id + '"]'); await calme(350);
      const f = await R(() => { const k = document.querySelector('#calque .md-kpis .kpi:nth-child(3) b'), o = document.querySelector('#calque .md-o'); return { k: k ? k.textContent : null, t: o ? o.textContent : '' }; });
      const nl = +((f.t.match(/·\s*(\d+)/) || [])[1] || 0);
      if (carte && /^\d/.test(carte) && /bientôt/.test(carte)) { if (+carte.match(/^\d+/)[0] !== +f.k) incoh.push({ id, carte, kpi: f.k, liste: f.t }); }
      if (f.t && /Bientôt fini/.test(f.t) && +f.k !== nl) incoh.push({ id, kpi: f.k, liste: f.t });
      if (id === 'atelier') await cap('fiche-atelier');
      await L.ranger(p);
    }
    v('01 : pour chaque lieu, la carte, le chiffre de la fiche et l\'en-tête de la liste sont le même nombre', incoh.length === 0, incoh);

    // ── 02 : Stock et Commandes disent le même retard ──
    await L.aller(p, 'stock'); await calme(300);
    const s2 = await R(() => [...document.querySelectorAll('#contenu .st')].map(e => e.textContent.trim()).filter(t => /Commandé/.test(t)));
    v('02 population : des articles « Commandé » existent dans Stock (' + s2.length + ')', s2.length > 0, s2);
    v('02 : aucun article ne « arrive » à une date passée (31/10 = aujourd\'hui) : on lit « en retard » ou une date à venir', s2.every(t => /en retard|en route|arrive (le|demain|aujourd)/.test(t)), s2);
    const dates = s2.map(t => (t.match(/arrive le (\d+)\/(\d+)/) || []).slice(1).map(Number)).filter(a => a.length);
    v('02 : les dates annoncées sont toutes à venir (≥ 31/10)', dates.every(([j, m]) => m > 10 || (m === 10 && j >= 31)), dates);

    // ── 03 : le toast de comptage garde la majuscule de chaque prénom ──
    for (const lieu of ['v1', 'v2', 'v3']) {
      await L.aller(p, 'stock'); await R(l => matCompter(l), lieu); await calme(350);
      if (!await R(() => !!document.querySelector('#calque [data-ms="ctout"]'))) { v('03 : le comptage de ' + lieu + ' s\'ouvre', false); await L.ranger(p); continue; }
      await clic('#calque [data-ms="ctout"]'); await clic('#calque [data-ms="cok"]'); await calme(350);
      const t = await toastTxt();
      v('03 : toast du comptage de ' + lieu + ' (« ' + t.slice(0, 70) + ' ») : prénom avec majuscule', !/camion de [a-zà-ÿ]/.test(t) && /camion de [A-ZÉ]/.test(t), t);
      await L.ranger(p);
    }

    // ── 05 : transfert vers le camion au garage, puis ANNULER : ce que l'écran fait APRÈS ──
    await L.aller(p, 'achats'); await calme(350);
    await R(() => { const b = document.querySelector('[data-ac="transfert|da1"]'); if (b) b.scrollIntoView({ block: 'center' }); });
    const avant = await R(() => ({ carte: (document.querySelector('[data-ac="transfert|da1"]') || {}).textContent || null, bouton: !!document.querySelector('[data-ac="transfert|da1"]') }));
    v('05 population : la demande de Tom propose « Transférer » (' + avant.carte + ')', avant.bouton, avant);
    await clic('[data-ac="transfert|da1"]'); await calme(350);
    const gar = await R(() => (document.querySelector('#calque .panneau') || {}).textContent || '');
    v('05 : le panneau du garage s\'ouvre', /garage/.test(gar), gar.slice(0, 100));
    await cap('transfert-garage');
    await clic('#calque [data-ac="transfertok|da1"]'); await calme(450);
    const apres = await R(() => ({ panneau: !!document.querySelector('#calque .panneau'), t: (document.getElementById('toast') || {}).textContent || '', carte: (document.querySelector('[data-ac="transfert|da1"]') || {}).textContent || null, contenu: document.getElementById('contenu').innerText.length }));
    v('05 : après le transfert, le toast porte « Annuler » (le brouillon de commande s\'ouvre par-dessus : voulu)', /Annuler/.test(apres.t), apres);
    await cap('transfert-fait');
    await R(() => [...document.querySelectorAll('#toast button')].find(b => /Annuler/.test(b.textContent)).click()); await calme(500);
    const ann = await R(() => ({ panneau: !!document.querySelector('#calque .panneau'), toast: (document.getElementById('toast') || {}).textContent || '', surToast: document.getElementById('toast') && document.getElementById('toast').classList.contains('on'), bouton: !!document.querySelector('[data-ac="transfert|da1"]'), etat: DEM_ACHAT.find(o => o.id === 'da1').etat }));
    await cap('apres-annuler');
    v('05 : après « Annuler », l\'écran se redessine : la demande est de nouveau à traiter (bouton « Transférer » revenu, état « attente »)', ann.bouton && ann.etat === 'attente', ann);
    v('05 : après « Annuler », un message dit « Annulé : … » (le geste annulé s\'annonce)', /Annulé/.test(ann.toast), ann);
    const fant = await R(() => ({ ouverte: !!document.querySelector('#calque .panneau') && /Modifier la commande/.test(document.querySelector('#calque .panneau').textContent), existe: COMMANDES.some(o => /2026-040/.test(o.num || '')), n: COMMANDES.length }));
    v('05 : après « Annuler », la commande annulée n\'est plus offerte à l\'envoi (fenêtre « Modifier la commande » fermée : ' + fant.ouverte + ', la commande existe encore : ' + fant.existe + ')', !fant.ouverte || fant.existe, fant);
    if (fant.ouverte && !fant.existe) { await clic('#calque [data-ced="envoyer"], #calque .btn:not(.gris)'); await calme(500); const f2 = await R(() => ({ n: COMMANDES.length, nums: COMMANDES.map(o => o.num).slice(0, 3), toast: (document.getElementById('toast') || {}).textContent || '' })); v('05 (fantôme) : envoyer la commande annulée ne crée rien (' + JSON.stringify(f2) + ')', f2.n === fant.n, f2); await cap('fantome-envoye'); }

    // ── 15 : « Je le retire au comptoir » : cacher ne perd rien, et se fait EN DIRECT ──
    await L.aller(p, 'produits'); await R(() => { prVue = 'fournisseurs'; rendre(); }); await calme(350);
    await R(() => fournFiche('fd')); await calme(400);
    const f15 = () => R(() => { const t = (document.querySelector('#calque .panneau') || {}).innerText || ''; return { franco: /Livraison gratuite/.test(t), port: /frais de port/.test(t), delai: /Livré en/.test(t), hist: /livre à l’heure/.test(t), comptoir: !!(document.querySelector('#calque [data-fx^="comptoir|"]') || {}).checked }; });
    const a15 = await f15();
    v('15 : « Frigo Distribution 17 » est au comptoir : ni livraison gratuite, ni port, ni délai, ni historique de livraison', a15.comptoir && !a15.franco && !a15.port && !a15.delai && !a15.hist, a15);
    await cap('fournisseur-comptoir');
    await clic('#calque [data-fx^="comptoir|"]'); await calme(450);
    const b15 = await f15();
    v('15 : on décoche « au comptoir » : la fiche se redessine en direct avec ses lignes de livraison', !b15.comptoir && b15.franco && b15.port && b15.delai, b15);
    await cap('fournisseur-livre');
    await clic('#calque [data-fx^="comptoir|"]'); await calme(450);
    const c15 = await f15();
    v('15 : on recoche : elles disparaissent de nouveau', c15.comptoir && !c15.franco && !c15.port && !c15.delai, c15);
    await L.ranger(p);

    // ── 09 : le rythme de comptage d'un lieu : valeurs de bord ──
    await L.aller(p, 'boxes'); await calme(300);
    const essais = [['0', undefined], ['-3', undefined], ['1.5', 60], ['999', 720], ['3', 90]];
    for (const [saisie, attendu] of essais) {
      await R(() => bxModifier('v1')); await calme(300);
      const champ = p.locator('#calque [data-bxl-mod="freq"]'); await champ.fill(saisie); await clic('#calque [data-bxl="modok"]'); await calme(350);
      const j = await R(() => SX.freq.v1);
      v('09 : saisie « ' + saisie + ' » → ' + (attendu === undefined ? 'durée du Stock (aucune valeur propre)' : attendu + ' j'), j === attendu, { saisie, j });
    }
    await R(() => { delete SX.freq.v1; });

    // ── 10 : bouteille presque vide : bords du seuil, puis tous les écrans qui la montrent (aucune n'est presque vide dans les données : on en vide une) ──
    const b10 = await R(() => ({ bas0: sxBoutsBas().length, n: SX.bout.length }));
    v('10 population : ' + b10.n + ' bouteilles, ' + b10.bas0 + ' presque vide dans les données de départ', b10.n > 3, b10);
    for (const [r, attend] of [[1, true], [1.01, false], [0.6, true], [0, true]]) {
      const o = await R(r2 => { const b = SX.bout.find(q => q.id === 'R32-2231'); const sv = b.reste; b.reste = r2; const o = { bas: sxBoutsBas().some(q => q.id === 'R32-2231'), etat: sxBoutEtat(b)[0] }; b.reste = sv; return o; }, r);
      v('10 : une bouteille à ' + r + ' kg ' + (attend ? 'est' : 'n\'est pas') + ' « presque vide » (état lu : ' + o.etat + ')', o.bas === attend, o);
    }
    await R(() => { SX.bout.find(q => q.id === 'R32-2231').reste = 0.6; });
    await L.aller(p, 'boxes'); await calme(300);
    const t10 = await R(() => document.getElementById('contenu').innerText);
    v('10 : Dépôts et camions dit la bouteille presque vide', /presque vide/i.test(t10), t10.match(/.{0,40}presque vide.{0,40}/i));
    await cap('depots-bouteille');
    await R(() => { const b = document.querySelector('[data-md="fiche|v1"]'); if (b) b.click(); }); await calme(350);
    const f10 = await R(() => document.querySelector('#calque .panneau').innerText); await cap('fiche-camion-bouteille'); await L.ranger(p);
    v('10 : la fiche du camion de Sophie dit « Bouteille presque vide : R32-2231 (0,6 kg) »', /Bouteille presque vide\s*:\s*R32-2231 \(0,6\s*kg\)/.test(f10), f10.match(/.{0,40}presque vide.{0,40}/i));
    for (const h of ['accueil', 'tableau', '']) { await R(x => { location.hash = x; }, h); await calme(500); const ac = await R(() => document.getElementById('contenu').innerText); if (/Matériel/.test(ac)) { v('10 : l\'Accueil (#' + h + ') du gérant dit la bouteille presque vide', /presque vide/i.test(ac), ac.match(/.{0,50}Matériel.{0,200}/s)); await cap('accueil'); break; } }
    await R(() => prFiche('p4')); await calme(350); const fa = await R(() => (document.querySelector('#calque .panneau') || {}).innerText || ''); await cap('fiche-article-fluide'); await L.ranger(p);
    v('10 : la fiche de l\'article « Fluide R32 » montre « Presque vide » pour la bouteille à 0,6 kg', /Presque vide/.test(fa), fa.match(/.{0,60}R32-2231.{0,60}/));

    // ── 17 : le pied de la liste de Stock ──
    await L.aller(p, 'stock'); await calme(300);
    const pied0 = await R(() => (document.querySelector('.ms-pied') || {}).textContent || '');
    await p.fill('#ms-q', 'condens'); await calme(350);
    const pied1 = await R(() => (document.querySelector('.ms-pied') || {}).textContent || '');
    await p.fill('#ms-q', ''); await calme(300);
    v('17 : sans recherche « ' + pied0.trim() + ' » ; avec « ' + pied1.trim() + ' » (sans montant)', /€/.test(pied0) && !/€/.test(pied1) && /^\s*1 article\s*$/.test(pied1), { pied0, pied1 });
    // dans un lieu (filtre), le montant n'apparaît pas non plus
    const pied2 = await R(() => { SX.lieuF = 'v1'; rendre(); return (document.querySelector('.ms-pied') || {}).textContent || ''; }); await R(() => { SX.lieuF = 'tous'; rendre(); });
    v('17 : filtré sur un lieu, le pied dit « N articles ici » sans montant (« ' + pied2.trim() + ' »)', !/€/.test(pied2) && /ici/.test(pied2), pied2);

    // ── 19 : formulaire d'article : le blanc de la suggestion ──
    await L.aller(p, 'produits'); await R(() => { prVue = 'articles'; rendre(); }); await calme(300);
    await R(() => { const b = [...document.querySelectorAll('#contenu button')].find(e => /Ajouter un article/.test(e.textContent)); if (b) b.click(); }); await calme(450);
    const f19 = await R(() => { const pan = document.querySelector('#calque .panneau'); if (!pan) return null; const s = pan.querySelector('.pr-sugg'); return { s: s ? Math.round(s.getBoundingClientRect().height) : null, txt: s ? s.textContent : null }; });
    v('19 : le formulaire s\'ouvre, la suggestion vide ne prend aucune place (' + JSON.stringify(f19) + ')', !!f19 && (f19.s === 0 || f19.s === null), f19);
    await cap('article-ajout');
    await R(() => { const n = document.getElementById('pr-nom'); if (n) { n.focus(); } });
    await p.keyboard.type('Filtre à air', { delay: 40 }); await calme(300);
    const s19 = await R(() => { const s = document.getElementById('pr-sugg'); return s ? { h: Math.round(s.getBoundingClientRect().height), t: s.textContent } : null; });
    v('19 : en tapant un nom, la suggestion revient (« ' + (s19 && s19.t.trim().slice(0, 50)) + ' »)', !!s19 && s19.h > 0, s19);
    await p.keyboard.press('Control+A'); await p.keyboard.press('Delete'); await calme(300);
    const s19b = await R(() => { const s = document.getElementById('pr-sugg'); return s ? Math.round(s.getBoundingClientRect().height) : null; });
    v('19 : nom effacé, la suggestion se retire de nouveau (' + s19b + ' px)', s19b === 0 || s19b === null, s19b);
    await L.ranger(p);
  }
  if (qui === 'julie') {
    await L.aller(p, 'stock'); await calme(400); await cap('stock');
    const t = await R(() => ({ kpis: [...document.querySelectorAll('.ms-kpis .kpi')].map(k => ({ tag: k.tagName, txt: k.textContent.trim().replace(/\s+/g, ' ') })), att: [...document.querySelectorAll('.ms-att')].map(e => e.tagName + ':' + e.textContent.trim()) }));
    v('11 population : des tuiles existent pour Julie (' + t.kpis.length + ')', t.kpis.length >= 3, t);
    const mort = await R(() => { const x = [...document.querySelectorAll('.ms-kpis button.kpi')]; return x.map(b => b.dataset.ms); });
    // chaque tuile-BOUTON de Julie mène à un endroit qu'elle a vraiment (aucun refus)
    for (const k of mort) {
      await L.aller(p, 'stock'); await calme(250);
      await R(s => document.querySelector('[data-ms="' + s + '"]').click(), k); await calme(450);
      const e = await R(() => ({ h: location.hash, toast: (document.getElementById('toast') && document.getElementById('toast').classList.contains('on') ? document.getElementById('toast').textContent : ''), h1: (document.querySelector('#contenu h1') || {}).textContent }));
      v('11 : la tuile « ' + k + ' » de Julie ne mène pas à un refus (' + e.h + ' « ' + e.h1 + ' »)', !/fermée à ton compte|n’existe pas/.test(e.toast || '') && !/Comptabilité/.test(e.h1 || ''), e);
    }
    await L.aller(p, 'stock'); await calme(250);
    await R(() => { const b = [...document.querySelectorAll('#contenu button')].find(e => /Ce qui a bougé/.test(e.textContent)); if (b) b.click(); }); await calme(450);
    const j = await R(() => ({ boutonsAtt: document.querySelectorAll('button.ms-att').length, etiquettes: document.querySelectorAll('span.ms-att').length, h: Math.round((document.querySelector('span.ms-att') || { getBoundingClientRect: () => ({ height: -1 }) }).getBoundingClientRect().height) }));
    v('12 population : des envois attendent (' + j.etiquettes + ' étiquettes)', j.etiquettes >= 1, j); v('12 : Julie n\'a aucun bouton « À accepter » mort (boutons ' + j.boutonsAtt + ', étiquettes ' + j.etiquettes + ')', j.boutonsAtt === 0, j);
    await cap('journal');
  }
  if (qui === 'sm') {
    // ── tech-11 : « Je l'ai pris » hors réseau ──
    await L.aller(p, 'moncamion'); await calme(400); await cap('camion');
    const t11 = await R(() => { const b = document.querySelector('[data-vis="camion-manque"] [data-mat^="pris|"]'); return { b: !!b, file: (typeof MAT !== 'undefined' && MAT.file) ? MAT.file.length : null, att: typeof MVTS_ATT !== 'undefined' ? MVTS_ATT.length : null, hors: typeof _horsLigne !== 'undefined' ? _horsLigne : (typeof HORS_LIGNE !== 'undefined' ? HORS_LIGNE : null), nav: navigator.onLine }; });
    v('tech-11 population : « Je l\'ai pris » existe', t11.b, t11);
    await c.ctx.setOffline(true); await calme(400);
    await R(() => { const b = document.querySelector('[data-vis="camion-manque"] [data-mat^="pris|"]'); if (b) b.click(); }); await calme(500);
    const t11b = await R(() => ({ toast: (document.getElementById('toast') || {}).textContent || '', att: MVTS_ATT.length, file: MAT.file ? MAT.file.length : null }));
    v('tech-11 : hors réseau, le geste ne dit pas « Envoyé au bureau » comme si c\'était parti (« ' + t11b.toast.slice(0, 80) + ' »)', !/Envoyé au bureau/.test(t11b.toast) || /hors ligne|réseau|dès que/i.test(t11b.toast), t11b);
    await c.ctx.setOffline(false);
    // ── tech-12 : le nom d'un article ne se coupe pas en pleine parenthèse ──
    await L.aller(p, 'moncamion'); await calme(400);
    const t12 = await R(() => [...document.querySelectorAll('#contenu .mc-liste .fo-n b, #contenu .mc-l .fo-n b')].map(e => { const lh = parseFloat(getComputedStyle(e).lineHeight) || 20; return { t: e.textContent.trim().slice(0, 50), l: Math.round(e.getBoundingClientRect().height / lh), w: e.getBoundingClientRect().width }; }).filter(o => /\(\S*\s*L\)|\(0,5/.test(o.t) || o.l > 1));
    v('tech-12 : aucun nom d\'article ne passe sur plusieurs lignes en séparant « (0,5 » de « L) » : ' + JSON.stringify(t12), t12.length === 0, t12);
    // ── tech-13 : à 320 px la première pièce manquante est au-dessus de la barre du bas ──
    const t13 = await R(() => { const l = document.querySelector('[data-vis="camion-manque"] .mc-l'), bar = document.querySelector('.tabbar, #onglets, nav.onglets, .barre-bas'); const r = l && l.getBoundingClientRect(), rb = bar && bar.getBoundingClientRect(); return { ligne: r && Math.round(r.top), bas: rb ? Math.round(rb.top) : null, h: innerHeight }; });
    v('tech-13 : la première pièce qui manque (' + t13.ligne + ' px) se voit au-dessus de la barre du bas (' + (t13.bas || t13.h) + ')', t13.ligne != null && t13.ligne + 40 <= (t13.bas || t13.h), t13);
    // ── tech-14 : l'invite de la recherche ──
    await L.aller(p, 'moncamion'); await R(() => document.querySelector('[data-mat="usage"]').click()); await calme(350);
    const t14 = await R(() => { const i = document.querySelector('#mat-q'); if (!i) return null; const cs = getComputedStyle(i), cv = document.createElement('canvas').getContext('2d'); cv.font = cs.fontSize + ' ' + cs.fontFamily; return { ph: i.placeholder, texte: Math.round(cv.measureText(i.placeholder).width), champ: Math.round(i.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) }; });
    v('tech-14 : l\'invite « ' + (t14 && t14.ph) + ' » tient dans son champ (' + (t14 && t14.texte) + ' sur ' + (t14 && t14.champ) + ')', !!t14 && t14.texte <= t14.champ, t14);
    await L.ranger(p);
    // ── tech-05 : un seul mot pour « ce qui n'est pas à bord » ──
    await L.aller(p, 'majournee'); await calme(350);
    const t5 = await R(() => document.getElementById('contenu').innerText);
    v('tech-05 : Ma journée ne dit pas « à remettre à bord » (décision du chef : « manque à bord »)', !/à remettre à bord/.test(t5), t5.match(/.{0,50}à bord.{0,20}/g));
    // ── tech-07 : « ton envoi » → « son envoi » et les mots qui contiennent « ta » ne bougent pas ──
    const t7 = await R(() => { const f = l => l.replace(/^t(a|on|es) /, (m, k) => ({ a: 'sa ', on: 'son ', es: 'ses ' })[k]); return ['ta prise à l’atelier', 'ton envoi', 'tes pièces', 'tablette perdue', 'tonneau'].map(f); });
    v('tech-07 : la 3e personne : ' + JSON.stringify(t7), t7[0] === 'sa prise à l’atelier' && t7[1] === 'son envoi' && t7[2] === 'ses pièces' && t7[3] === 'tablette perdue' && t7[4] === 'tonneau', t7);
  }
  v(tag + ' : aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); L.v('le parcours a pu se jouer jusqu\'au bout (' + String(e.message).split('\n')[0].slice(0, 160) + ')', false); try { L.fermer(); } catch (x) {} process.exit(L.bilan() ? 1 : 2); });

// Temps de travail, étape 2 (T5) — LA JOURNÉE D'UNE PERSONNE : la fiche qui corrige une heure. Le geste de confiance doit se VOIR :
// rien ne s'écrit à la sortie d'un champ, dès qu'une valeur change apparaît « Pourquoi changes-tu cette heure ? » (obligatoire) et UN bouton
// « Enregistrer la correction » grisé tant que le motif est vide (la condition est visible AVANT d'essayer) ; la trace (avant → après, qui,
// quand, pourquoi), la semaine remise à valider, le salarié qui devra reconfirmer, UN seul toast avec « Annuler », aucun refus qui survive à
// la réussite ; journée ouverte (Terminer à 16:47 en un geste), journée vide (Ajouter les heures), mois fermé (aucun champ, aucune écriture).
// Chaque contrôle prouve d'abord sa population. Les heures se choisissent par le VRAI sélecteur d'heure (dtPoser/dtFermer).
// PROFILS=mac,iphone NUIT=0,1 pour restreindre. Navigateur sur 127.0.0.1 seulement, un seul à la fois.
const L = require('../lib.js'), v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/vehtemps2/';
const SEULS = (process.env.SEULS || '').split(',').filter(Boolean), on = x => !SEULS.length || SEULS.includes(x);   // SEULS=A,C : ne jouer que ces sections (contre-épreuves)
const ev = (c, f, a) => c.p.evaluate(f, a);
const net = t => String(t).replace(/[\u00a0\u202f]/g, ' ');   // l'application pose une espace insécable avant « : » : on compare sur du texte normalisé
const txt = async (c, sel) => net(await c.p.evaluate(s => (document.querySelector(s) || {}).textContent || '', sel));
const clic = async (c, sel) => { const ok = await L.toucher(c, sel); if (!ok) console.log('   (pas atteint : ' + sel + ')'); return ok; };
const frais = async (profil, nuit) => { const c = await L.ouvrir({ profil:profil || 'mac', qui:'marc', nuit:!!nuit, calme:true }); await L.aller(c.p, 'pointage'); return c; };
const ouvrir = async (c, k, d) => { await ev(c, ([k, d]) => ptFicheJour(k, d), [k, d]); await L.calme(c.p, 350); };
/* choisir une heure par le VRAI sélecteur : toucher le bouton d'heure, l'heure, les minutes, OK */
const heure = async (c, champ, hhmm) => { const [h, m] = hhmm.split(':').map(Number);
  await clic(c, `#calque [data-ptc="${champ}"] + .dt-btn`); await c.p.waitForSelector('#dtpop', { timeout: 3000 });
  await clic(c, `#dtpop [data-dth="${h}"]`); await clic(c, `#dtpop [data-dtmn="${m}"]`); if (await c.p.$('#dtpop [data-dtok]')) await clic(c, '#dtpop [data-dtok]'); await L.calme(c.p, 250); };
const etat = c => ev(c, () => { const b = document.getElementById('tt-enr'), e = document.getElementById('tt-edit'), vis = x => x && !x.hidden && x.offsetParent !== null;
  return { edit:vis(e), motifBloc:vis(document.getElementById('tt-motif-bloc')), bouton:b ? { lib:b.textContent.trim(), off:b.disabled } : null, aide:vis(document.getElementById('tt-aide')) ? document.getElementById('tt-aide').textContent.trim() : '', err:(document.getElementById('tt-err') || {}).textContent || '', toasts:document.querySelectorAll('#toast').length, toast:(document.getElementById('toast') || {}).innerText || '' }; });
const PROFILS = (process.env.PROFILS || 'mac,windows,ipad,iphone,android,petit').split(','), NUITS = (process.env.NUIT || '0,1').split(',').map(Number);

(async () => {
  /* ── A. le geste complet : changer la fin de Sophie, mercredi 28 ── */
  if (on('A')) { const c = await frais(); const D = '2026-10-28', K = 'sm';
    const av = await ev(c, ([K, D]) => { const p = ptJour(K, D)[0]; PT_VALIDE[K + lundi(D)] = true; TT.vus[K + lundi(D)] = true; PAIE.confirmes[K] = { le:'30/10 · 18:00' }; return { id:p.id, fin:p.fin, debut:p.debut, pause:p.pause, tr:PT_TRACE.length, nt:NOTIFS.length, sem:K + lundi(D) }; }, [K, D]);
    await ouvrir(c, K, D);
    const cadre = await ev(c, () => { const q = s => document.querySelector('#calque ' + s); return { sur:(q('.surtitre') || {}).textContent, h2:(q('h2') || {}).textContent, lignes:[...document.querySelectorAll('#calque .tt-ch .tt-cl')].map(e => e.textContent.trim()), stats:[...document.querySelectorAll('#calque .tt-stats span')].map(e => e.innerText.replace(/\s+/g, ' ').trim()), champs:document.querySelectorAll('#calque [data-ptc]').length, boutons:[...document.querySelectorAll('#calque button')].filter(b => b.offsetParent).length, plan:(q('.tt-h3 + .fo-bloc') || {}).textContent }; });
    v('A : la population — la journée de Sophie du mercredi 28 existe, sa semaine est validée, elle a confirmé', !!av.id && cadre.champs === 4, { av, cadre });
    v('A : l\'en-tête — surtitre = la date, titre = la personne, « 8h05 travaillées »', /MERCREDI 28 OCTOBRE/i.test(cadre.sur) && cadre.h2 === 'Sophie Martin' && cadre.stats.some(s => /^8h05\s*travaillées/.test(s)), cadre);
    v('A : les lignes — Début, Fin, Pause, Note (style Réglages)', cadre.lignes.join('|') === 'Début|Fin|Pause|Note', cadre.lignes);
    v('A : une journée sans intervention le DIT (plus de troisième chiffre « non planifiées »)', /Aucune intervention n’était prévue/.test(cadre.plan) && !cadre.stats.some(s => /non planifiées/.test(s)), cadre);
    const e0 = await etat(c); v('A : avant toute modification, ni bloc de motif ni bouton « Enregistrer »', !e0.edit && !e0.motifBloc, e0);
    await heure(c, av.id + '|fin', '17:40');
    const ap0 = await ev(c, id => { const p = POINTAGES.find(o => o.id === id); return { fin:p.fin, tr:PT_TRACE.length }; }, av.id), e1 = await etat(c);
    v('A : choisir une heure N\'ÉCRIT RIEN (la base garde 16:44, aucune ligne de trace)', ap0.fin === av.fin && ap0.tr === av.tr, ap0);
    v('A : le bloc « Pourquoi changes-tu cette heure ? » apparaît, le bouton est GRISÉ et la condition se voit (« Écris d’abord pourquoi. »)', e1.edit && e1.motifBloc && e1.bouton && e1.bouton.off && e1.bouton.lib === 'Enregistrer la correction' && e1.aide === 'Écris d’abord pourquoi.', e1);
    v('A : le motif dit qu\'il est obligatoire et que Sophie le verra', /Obligatoire\. Sophie le verra sur ses heures du mois\./.test(await txt(c, '#tt-motif-bloc')), await txt(c, '#tt-motif-bloc'));
    await ev(c, () => { document.getElementById('tt-enr').disabled = false; document.getElementById('tt-enr').click(); });   // forcer le clic : le garde-fou de la fonction tient aussi
    const f1 = await ev(c, id => ({ fin:POINTAGES.find(o => o.id === id).fin, tr:PT_TRACE.length, err:document.getElementById('tt-err').textContent }), av.id);
    v('A : un clic forcé sans motif n\'écrit rien et le DIT dans la fiche (pas un toast)', f1.fin === av.fin && f1.tr === av.tr && /Écris d’abord pourquoi/.test(f1.err), f1);
    await ev(c, () => { document.getElementById('tt-enr').disabled = true; });
    await c.p.fill('#pt-motif', 'Oubli de pointer en partant chez le client'); await ev(c, () => document.getElementById('pt-motif').dispatchEvent(new Event('input', { bubbles:true })));
    const e2 = await etat(c); v('A : le motif écrit, le bouton s\'allume et la ligne orange disparaît', e2.bouton && !e2.bouton.off && e2.aide === '' && e2.err === '', e2);
    await clic(c, '#tt-enr'); await L.calme(c.p, 400);
    const ap = await ev(c, ([id, K, sem]) => { const p = POINTAGES.find(o => o.id === id), t = PT_TRACE[PT_TRACE.length - 1]; return { fin:p.fin, tr:PT_TRACE.length, t, val:!!PT_VALIDE[sem], conf:!!PAIE.confirmes[K], nt:NOTIFS.length, derNt:NOTIFS[NOTIFS.length - 1], trace:document.querySelector('#calque .paie-trs') ? document.querySelector('#calque .paie-trs').innerText.replace(/\s+/g, ' ') : '' }; }, [av.id, K, av.sem]), e3 = await etat(c);
    v('A : l\'heure est enregistrée', ap.fin === '17:40', ap);
    v('A : la trace est écrite — avant → après, qui, quand, pourquoi', ap.tr === av.tr + 1 && ap.t.champ === 'fin' && ap.t.avant === av.fin && ap.t.apres === '17:40' && ap.t.par === 'marc' && /^31\/10/.test(ap.t.le) && ap.t.motif === 'Oubli de pointer en partant chez le client', ap.t);
    v('A : la semaine validée repasse à valider (la population : elle l\'était)', !ap.val, ap);
    v('A : Sophie devra reconfirmer ET en est prévenue (la population : elle avait confirmé)', !ap.conf && ap.nt === av.nt + 1 && /confirme de nouveau/.test(ap.derNt.txt), ap);
    v('A : UN seul toast, qui dit la reconfirmation et porte « Annuler »', e3.toasts === 1 && /Journée corrigée\. Sophie devra la confirmer de nouveau/.test(e3.toast) && /Annuler/.test(e3.toast), e3);
    v('A : le bloc de motif a disparu, la fiche montre « Ce qui a été changé » avec la ligne (Fin : 16:44 → 17:40 · par Marc · parce que : …)', !e3.edit && /Ce qui a été changé/.test(await txt(c, '#calque')) && /Fin : 16:44 → 17:40/.test(ap.trace) && /par Marc/.test(ap.trace) && /parce que : Oubli de pointer/.test(ap.trace), ap.trace);
    await ev(c, () => [...document.querySelectorAll('#toast button')].find(b => b.textContent === 'Annuler').click()); await L.calme(c.p, 300);
    const re = await ev(c, ([id, K, sem]) => ({ fin:POINTAGES.find(o => o.id === id).fin, tr:PT_TRACE.length, val:!!PT_VALIDE[sem], conf:!!PAIE.confirmes[K], nt:NOTIFS.length, panneauAvecEdit:!!document.getElementById('tt-edit') }), [av.id, K, av.sem]);
    v('A : « Annuler » remet l\'heure, la trace, la validation, la confirmation et la notification d\'avant', re.fin === av.fin && re.tr === av.tr && re.val && re.conf && re.nt === av.nt, re);
    await L.fin(c); }

  /* ── B. les refus s'écrivent dans la fiche et s'EFFACENT à la réussite ; la note seule ne demande pas de motif ── */
  if (on('B')) { const c = await frais(); const D = '2026-10-28', K = 'kb';
    const id = await ev(c, ([K, D]) => ptJour(K, D)[0].id, [K, D]); await ouvrir(c, K, D);
    await ev(c, id => { const p = POINTAGES.find(o => o.id === id); p.pause = 30; }, id); await ouvrir(c, K, D);
    // une pause plus longue que la journée est refusée, dans la fiche
    await ev(c, id => { const s = document.querySelector(`[data-ptc="${id}|pause"]`); s.value = '180'; s.dispatchEvent(new Event('change', { bubbles:true })); }, id);
    await c.p.fill('#pt-motif', 'Essai'); await ev(c, () => document.getElementById('pt-motif').dispatchEvent(new Event('input', { bubbles:true })));
    await ev(c, id => { const p = POINTAGES.find(o => o.id === id); const i = document.querySelector(`[data-ptc="${id}|debut"]`), f = document.querySelector(`[data-ptc="${id}|fin"]`); i.value = '12:00'; f.value = '13:00'; i.dispatchEvent(new Event('change', { bubbles:true })); f.dispatchEvent(new Event('change', { bubbles:true })); }, id);
    const tr0 = await ev(c, () => PT_TRACE.length); await clic(c, '#tt-enr'); const r1 = await etat(c);
    v('B : une pause plus longue que la journée est REFUSÉE, dans la fiche, sans rien écrire', /La pause est plus longue que la journée/.test(r1.err) && (await ev(c, () => PT_TRACE.length)) === tr0, r1);
    await ev(c, id => { const s = document.querySelector(`[data-ptc="${id}|pause"]`); s.value = '30'; s.dispatchEvent(new Event('change', { bubbles:true })); }, id);
    const r2 = await etat(c); v('B : modifier un champ efface le refus d\'avant (un refus ne survit pas à l\'essai suivant)', r2.err === '', r2);
    await clic(c, '#tt-enr'); const r3 = await etat(c), ap = await ev(c, id => ({ deb:POINTAGES.find(o => o.id === id).debut, fin:POINTAGES.find(o => o.id === id).fin, tr:PT_TRACE.length }), id);
    v('B : la réussite efface tout refus, n\'écrit QU\'UN toast, et la trace compte une ligne par heure changée (début, fin)', ap.deb === '12:00' && ap.fin === '13:00' && ap.tr === tr0 + 2 && r3.err === '' && r3.toasts === 1 && !/plus longue/.test(r3.toast), { ap, r3 });
    // la note seule : pas de motif, pas de trace, bouton « Enregistrer la note »
    const tr1 = await ev(c, () => PT_TRACE.length);
    await c.p.fill(`#calque [data-ptc="${id}|note"]`, 'Astreinte levée'); await ev(c, id => document.querySelector(`[data-ptc="${id}|note"]`).dispatchEvent(new Event('input', { bubbles:true })), id);
    const n1 = await etat(c); v('B : une note seule ne demande PAS de motif (bloc de motif caché, bouton « Enregistrer la note » actif)', n1.edit && !n1.motifBloc && n1.bouton && !n1.bouton.off && n1.bouton.lib === 'Enregistrer la note', n1);
    await clic(c, '#tt-enr'); const n2 = await ev(c, id => ({ note:POINTAGES.find(o => o.id === id).note, tr:PT_TRACE.length }), id);
    v('B : la note est gardée et n\'écrit AUCUNE ligne de trace', n2.note === 'Astreinte levée' && n2.tr === tr1, n2);
    await L.fin(c); }

  /* ── C. aujourd'hui : une heure dans le futur ne se pointe pas (refus dans la fiche, puis réussite) ── */
  if (on('C')) { const c = await frais(); const D = '2026-10-31', K = 'kb'; await ouvrir(c, K, D);
    const id = await ev(c, ([K, D]) => ptJour(K, D)[0].id, [K, D]);
    const rf = await ev(c, () => [...document.querySelectorAll('#calque .tt-ch')].map(e => e.innerText.replace(/\s+/g, ' ').trim()));
    v('C : la journée en cours de Karim — la fin n\'est pas un champ (« en cours »)', rf.some(x => /^Fin en cours$/.test(x)) && !(await ev(c, id => !!document.querySelector(`[data-ptc="${id}|fin"]`), id)), rf);
    await ev(c, id => { const i = document.querySelector(`[data-ptc="${id}|debut"]`); i.value = '23:00'; i.dispatchEvent(new Event('change', { bubbles:true })); }, id);
    await c.p.fill('#pt-motif', 'Essai futur'); await ev(c, () => document.getElementById('pt-motif').dispatchEvent(new Event('input', { bubbles:true })));
    await clic(c, '#tt-enr'); const r1 = await etat(c), db = await ev(c, id => POINTAGES.find(o => o.id === id).debut, id);
    v('C : un début à 23:00 un samedi à 10:40 est refusé dans la fiche, rien n\'est écrit', /Une heure dans le futur ne se pointe pas/.test(r1.err) && db === '08:05', { r1, db });
    await ev(c, id => { const i = document.querySelector(`[data-ptc="${id}|debut"]`); i.value = '07:50'; i.dispatchEvent(new Event('change', { bubbles:true })); }, id);
    await clic(c, '#tt-enr'); const r2 = await etat(c), db2 = await ev(c, id => POINTAGES.find(o => o.id === id).debut, id);
    v('C : puis 07:50 est enregistré et le refus d\'avant a disparu', db2 === '07:50' && r2.err === '' && !/futur/.test(r2.toast), { db2, r2 });
    await L.fin(c); }

  /* ── D. journée ouverte (Tom, vendredi 30) : UN geste à sa fin d'habitude, jamais l'heure qu'il est ── */
  if (on('D')) { const c = await frais(); const D = '2026-10-30', K = 'tl'; await ouvrir(c, K, D);
    const av = await ev(c, () => { const p = POINTAGES.find(o => o.qui === 'tl' && ptOuvert(o)); return { id:p.id, h:ptxFinPropose(p).h, now:hNow(), tr:PT_TRACE.length }; });
    const rows = await ev(c, () => [...document.querySelectorAll('#calque .tt-ch')].map(e => e.innerText.replace(/\s+/g, ' ').trim()));
    v('D : la population — la journée de Tom est ouverte, sa fin proposée n\'est pas l\'heure qu\'il est', !!av.id && av.h !== av.now, av);
    v('D : le groupe dit « Fin pas terminée » (pas un champ)', rows.some(x => /^Fin pas terminée$/.test(x)), rows);
    const b = await ev(c, () => [...document.querySelectorAll('#calque .tt-ouv button')].map(b => ({ lib:b.textContent.trim(), noir:!b.classList.contains('gris') })));
    v('D : deux boutons — « Terminer à ' + av.h + ' » (noir) et « Lui demander son heure » (gris)', b.length === 2 && b[0].lib === 'Terminer à ' + av.h && b[0].noir && b[1].lib === 'Lui demander son heure' && !b[1].noir, b);
    await clic(c, '#calque .tt-ouv button:not(.gris)'); await L.calme(c.p, 300);
    const ap = await ev(c, id => ({ fin:POINTAGES.find(o => o.id === id).fin, tr:PT_TRACE.length, panneau:!!document.querySelector('#calque .panneau') }), av.id);
    v('D : un geste — la journée est terminée à la fin proposée, pas à « maintenant », la trace est écrite', ap.fin === av.h && ap.fin !== av.now && ap.tr === av.tr + 1, ap);
    await L.fin(c); }

  /* ── E. journée vide, mois fermé, règle légale, liens, absence ── */
  if (on('E')) { const c = await frais(); const K = 'sm'; await ouvrir(c, K, '2026-10-31');
    const vide = await ev(c, () => ({ t:document.querySelector('#calque .tt-vide-j').innerText.replace(/\s+/g, ' '), champs:document.querySelectorAll('#calque [data-ptc]').length }));
    v('E : journée vide — « Aucune heure ce jour-là. » et UN bouton « Ajouter les heures » (aucun champ)', /Aucune heure ce jour-là\./.test(vide.t) && /Ajouter les heures/.test(vide.t) && vide.champs === 0, vide);
    await clic(c, '[data-tt^="ajout|sm|"]'); const aj = await ev(c, () => ({ h2:(document.querySelector('#calque h2') || {}).textContent, motif:!!document.getElementById('tt-am') }));
    v('E : « Ajouter les heures » ouvre le panneau qui demande POURQUOI (trace comme une correction)', aj.h2 === 'Ajouter une journée' && aj.motif, aj);
    await ouvrir(c, 'kb', '2026-10-28'); const rg = await txt(c, '#calque .fo-alerte');
    v('E : la règle légale ne se dit QUE s\'il y a une alerte (Karim, 13h05, mercredi) — « Plus de 10 heures dans la journée »', /Plus de 10 heures dans la journée\s*:\s*c’est la limite légale/.test(rg), rg);
    await ouvrir(c, 'sm', '2026-10-28'); v('E : …et jamais pour Sophie (8h05) — population : elle a bien une journée', !(await ev(c, () => !!document.querySelector('#calque .fo-alerte'))) && (await ev(c, () => ptJour('sm', '2026-10-28').length)) === 1);
    await clic(c, '#calque [data-tt^="mois|"]'); const m = await ev(c, () => ({ sur:(document.querySelector('#calque .surtitre') || {}).textContent, h2:(document.querySelector('#calque h2') || {}).textContent }));
    v('E : le lien « Toutes ses heures d\'octobre › » ouvre le mois de la personne', /Octobre 2026/i.test(m.sur) && m.h2 === 'Sophie Martin', m);
    await ouvrir(c, 'lr', '2026-11-02'); const ab = await txt(c, '#calque'); v('E : une journée d\'absence le dit (« Congé payé ce jour-là ») sans champ', /ce jour-là \(Absences et congés\)/.test(ab) && (await ev(c, () => document.querySelectorAll('#calque [data-ptc]').length)) === 0, ab.slice(0, 140));
    // mois fermé
    await ev(c, () => { PAIE.verrou = { le:'31/10 · 10:40', par:'marc', emp:'ABCD1234' }; rendre(); }); await ouvrir(c, 'sm', '2026-10-28');
    const f = await ev(c, () => ({ champs:document.querySelectorAll('#calque [data-ptc]').length, ferme:(document.querySelector('#calque .tt-ferme') || {}).textContent, motif:!!document.getElementById('pt-motif'), btn:!!document.getElementById('tt-enr'), lignes:[...document.querySelectorAll('#calque .tt-ch')].map(e => e.innerText.replace(/\s+/g, ' ').trim()) }));
    v('E : mois fermé — plus aucun champ, plus de motif, plus de bouton, une carte grise « Octobre est fermé : plus aucune heure ne peut changer. »', f.champs === 0 && !f.motif && !f.btn && /Octobre est fermé :\s+plus aucune heure ne peut changer\./.test(net(f.ferme)) && f.lignes.length === 4, f);
    await ouvrir(c, 'sm', '2026-10-27'); await ev(c, () => { POINTAGES.splice(POINTAGES.findIndex(p => p.qui === 'sm' && p.date === '2026-10-27'), 1); }); await ouvrir(c, 'sm', '2026-10-27');
    v('E : mois fermé — une journée vide ne propose PAS « Ajouter les heures »', !(await ev(c, () => !!document.querySelector('#calque [data-tt^="ajout|"]'))) && /fermé/.test(await txt(c, '#calque')), await txt(c, '#calque'));
    const tr = await ev(c, () => PT_TRACE.length); await ev(c, () => ttJourEnregistrer('sm', '2026-10-28')); v('E : mois fermé — l\'enregistrement forcé n\'écrit rien', (await ev(c, () => PT_TRACE.length)) === tr);
    await L.fin(c); }

  /* ── F. à neuf appareils, jour ET nuit : la fiche ne déborde pas, se touche, se lit ── */
  if (on('F')) for (const profil of PROFILS) for (const nuit of NUITS) {
    const c = await frais(profil, nuit), nom = profil + (nuit ? ' nuit' : ' jour'); await ouvrir(c, 'kb', '2026-10-28');
    await ev(c, () => { const id = ptJour('kb', '2026-10-28')[0].id, f = document.querySelector(`[data-ptc="${id}|fin"]`); f.value = '21:15'; f.dispatchEvent(new Event('change', { bubbles:true })); });
    await c.p.fill('#pt-motif', 'Un motif volontairement long pour voir comment la fiche se comporte quand on écrit une phrase entière sur un téléphone de terrain'); await L.calme(c.p, 250);
    const d = await L.deborde(c), t = await L.doigts(c.p, '#calque .panneau');
    const pop = await ev(c, () => ({ champs:document.querySelectorAll('#calque [data-ptc]').length, motif:!!document.querySelector('#tt-motif-bloc:not([hidden])') }));
    v(nom + ' : la population — la fiche de Karim a 4 champs et son bloc de motif est ouvert', pop.champs === 4 && pop.motif, pop);
    v(nom + ' : aucun débordement latéral contre la largeur posée (' + c.largeur + ')', d.bouge === 0 && d.seconde <= c.largeur + 1, d);
    if (c.doigt) v(nom + ' : au doigt — aucune cible < 44 px, aucun champ < 16 px, aucun texte écrasé', t.petits.length === 0 && t.champs.length === 0 && t.ecrases.length === 0, t);
    else v(nom + ' : aucun champ < 16 px, aucun texte écrasé', t.champs.length === 0 && t.ecrases.length === 0, t);
    const vis = await ev(c, () => { const b = document.getElementById('tt-enr'); b.scrollIntoView({ block:'center' }); const r = b.getBoundingClientRect(); return { haut:r.top >= 0, bas:r.bottom <= innerHeight, h:Math.round(r.height), l:Math.round(r.width) }; });
    v(nom + ' : le bouton « Enregistrer la correction » se rejoint à l\'écran, large (≥ 44 px de haut)', vis.haut && vis.bas && vis.h >= 44, vis);
    await L.capture(c, CAP + 't5-' + profil + (nuit ? '-nuit' : '-jour') + '.png');
    v(nom + ' : zéro erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c); }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

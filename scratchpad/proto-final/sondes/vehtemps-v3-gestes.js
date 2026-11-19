// Véhicules, étape 3 — LES GESTES de la liste et de la fiche, comptés au toucher et vérifiés dans les DONNÉES (VEHICULES-TEMPS.md § 5.1, § 3.5-C), puis LE BUREAU (§ 11) :
// « Noter le rendez-vous » crée la tâche À LA DATE saisie (et « Annuler » la retire), « Noter le contrôle technique » ferme la tâche liée et propose la suivante,
// l'assurance des quatre en un geste, un plein en 2 touchers (achat 6061 + kilométrage), mettre au garage / remettre en service, « C'est réglé », une amende en
// 4 touchers (la désignation est une tâche), une dépense supprimée puis rétablie, un document ajouté puis retiré, le matériel (« Tout est là » + « Annuler »),
// le compteur qui recule refusé. Le bureau (julie) lit, note un plein, un rendez-vous, un contrôle, met au garage — et rien d'autre, même un geste forcé à la
// main (garde AU DÉBUT de la fonction) ; la case « Temps de travail et véhicules » de l'Équipe lui ouvre ou lui ferme la rubrique ; la technicienne n'a pas la rubrique.
// PROFILS=mac,iphone SEULS=A,B pour restreindre. ⛔ 127.0.0.1 seulement, un navigateur à la fois.
const L = require('../lib.js'), v = L.v;
const PROFILS = (process.env.PROFILS || 'mac,iphone').split(',');
const SEULS = process.env.SEULS ? process.env.SEULS.split(',') : null, on = x => !SEULS || SEULS.includes(x);
const ev = (c, f, a) => c.p.evaluate(f, a);
let touches = 0;
const toucher = async (c, sel) => { const ok = await L.toucher(c, sel); if (ok) touches++; return ok; };
const aller = async (c, h) => { await L.aller(c.p, h); };
const toast = c => ev(c, () => (document.getElementById('toast') || {}).textContent || '');
const ligne = (c, id) => ev(c, i => { const l = [...document.querySelectorAll('.vh-liste .vh-l')].find(x => x.querySelector(`[data-vh="fiche|${i}"]`)); return l ? { pastille:(l.querySelector('.vh-et .st') || {}).textContent, prec:(l.querySelector('.vh-prec') || {}).textContent, geste:(l.querySelector('.btn') || {}).textContent || '' } : null; }, id);
const panneau = c => ev(c, () => { const p = document.querySelector('#calque .panneau'); return p ? { h2:((p.querySelector('h2') || {}).textContent || '').trim(), txt:p.innerText || p.textContent } : null; });

(async () => {
  for (const profil of PROFILS) {
    const nom = profil;
    if (on('A')) {
      const c = await L.ouvrir({ profil, qui:'marc', calme:true }); await aller(c, 'vehicules');
      /* 1 · noter le rendez-vous : la tâche tombe À LA DATE saisie */
      const av = await ev(c, () => ({ taches:TACHES.length, ligne:null }));
      const l0 = await ligne(c, 'veh2'); v(nom + ' · rendez-vous : au départ la Peugeot propose « Noter le rendez-vous » et aucune tâche n\'existe', l0.geste === 'Noter le rendez-vous' && await ev(c, () => !TACHES.some(t => t.cle === 'veh-veh2-ct')), l0);
      touches = 0; await toucher(c, '.vh-liste [data-vh="rdv|veh2|ct|liste"]'); await L.calme(c.p, 800); const p1 = await panneau(c);
      v(nom + ' · rendez-vous : la feuille demande « Quel jour ? » et « Quel garage ? » (facultatif), un seul gros bouton, et le lien « C\'est déjà fait ? Noter le contrôle technique »', !!p1 && p1.h2 === 'Noter le rendez-vous' && /Quel jour\s\?/.test(p1.txt) && /Quel garage\s\?/.test(p1.txt) && /facultatif/.test(p1.txt) && /C’est déjà fait\s\? Noter le contrôle technique/.test(p1.txt), p1 && p1.txt.slice(0, 300));
      const date = await ev(c, () => jour(5)); await ev(c, d => { const i = document.getElementById('vh-rd'); i.value = d; i.dispatchEvent(new Event('change', { bubbles:true })); const g = document.getElementById('vh-rg'); g.value = 'Garage Martin'; }, date);
      await ev(c, () => { const i = document.getElementById('vh-rd'); i.value = jour(-2); }); await toucher(c, '#calque .panneau [data-vh^="rdvok|"]'); await L.calme(c.p, 300);
      v(nom + ' · rendez-vous : un jour déjà passé est refusé (aucune tâche écrite)', /déjà passé/.test(await toast(c)) && await ev(c, () => !TACHES.some(t => t.cle === 'veh-veh2-ct')), await toast(c));
      await ev(c, d => { document.getElementById('vh-rd').value = d; }, date); touches = 1; await toucher(c, '#calque .panneau [data-vh^="rdvok|"]'); await L.calme(c.p, 500);
      const t1 = await ev(c, () => { const t = TACHES.find(x => x.cle === 'veh-veh2-ct'); return t ? { d:t.d, qui:t.qui, titre:t.t, fait:!!t.fait } : null; });
      v(nom + ' · rendez-vous : la tâche est écrite À LA DATE saisie (' + date + '), pour la personne qui note, avec le garage ; 2 touchers (la ligne, « Noter le rendez-vous »)', !!t1 && t1.d === date && t1.qui === 'marc' && /Garage Martin/.test(t1.titre) && !t1.fait && touches === 2, { t1, touches });
      const l1 = await ligne(c, 'veh2'); v(nom + ' · rendez-vous : la ligne dit « Rendez-vous au garage le … » et propose maintenant « Noter le contrôle technique » (jamais deux boutons)', l1.geste === 'Noter le contrôle technique' && /Rendez-vous au garage le /.test(l1.prec) && l1.prec.includes(await ev(c, d => jlong(d), date)), l1);
      const to = await toast(c); v(nom + ' · rendez-vous : le toast le dit et porte « Annuler »', /Rendez-vous noté pour le /.test(to) && /Annuler/.test(to), to);
      await ev(c, () => { [...document.querySelectorAll('#toast button')].find(b => /Annuler/.test(b.textContent)).click(); }); await L.calme(c.p, 400);
      const l2 = await ligne(c, 'veh2'); v(nom + ' · rendez-vous : « Annuler » retire la tâche et la ligne redevient « Noter le rendez-vous »', await ev(c, () => !TACHES.some(t => t.cle === 'veh-veh2-ct')) && l2.geste === 'Noter le rendez-vous', l2);
      /* 2 · noter le contrôle technique (la tâche liée se ferme, la suivante est proposée) */
      await ev(c, () => { rendre(); }); await toucher(c, '.vh-liste [data-vh="rdv|veh2|ct|liste"]'); await L.calme(c.p, 300); await ev(c, d => { document.getElementById('vh-rd').value = d; }, date); await toucher(c, '#calque .panneau [data-vh^="rdvok|"]'); await L.calme(c.p, 400);
      const ctAvant = await ev(c, () => vehDe('veh2').ct), nbAch = await ev(c, () => ACHATS.length);
      await toucher(c, '.vh-liste [data-vh="fait|veh2|ct|liste"]'); await L.calme(c.p, 450); const p2 = await panneau(c);
      v(nom + ' · contrôle : « Noter le contrôle technique » ouvre la feuille (date, kilomètres, montant, prochain contrôle proposé)', !!p2 && /prochain contrôle|Prochain contrôle/i.test(p2.txt) && /2028/.test(p2.txt.replace(/\s/g, ' ')), p2 && p2.txt.slice(0, 300));
      await ev(c, () => { const i = document.getElementById('vx-fm'); if (i) { i.value = '79'; i.dispatchEvent(new Event('input', { bubbles:true })); } }); await toucher(c, '#calque .panneau [data-vx^="faitok|"]'); await L.calme(c.p, 500);
      const ap = await ev(c, () => ({ ct:vehDe('veh2').ct, achats:ACHATS.length, tache:(TACHES.find(t => t.cle === 'veh-veh2-ct') || {}).fait, hist:vehDe('veh2').hist.length }));
      v(nom + ' · contrôle : l\'échéance est faite — prochain contrôle repoussé (de ' + ctAvant + ' à ' + ap.ct + '), le frais part dans les achats (' + nbAch + ' → ' + ap.achats + '), la tâche de rendez-vous est terminée, une ligne d\'historique', ap.ct > ctAvant && ap.achats === nbAch + 1 && !!ap.tache && ap.hist >= 2, ap);
      const l3 = await ligne(c, 'veh2'); v(nom + ' · contrôle : la ligne passe à l\'échéance suivante (la courroie)', /Courroie de distribution/.test(l3.prec) && l3.geste === 'Noter le rendez-vous', l3);
      /* 3 · l'assurance des quatre, en un geste */
      const ass0 = await ev(c, () => VEHICULES.map(x => x.assur.fin).join());
      await toucher(c, '.vh-groupe [data-vh^="groupe|"]'); await L.calme(c.p, 400); await toucher(c, '#calque .panneau [data-vx^="groupeok|"]'); await L.calme(c.p, 500);
      const ass1 = await ev(c, () => VEHICULES.map(x => x.assur.fin).join());
      v(nom + ' · assurance : « Noter le renouvellement » met à jour les QUATRE véhicules d\'un geste, et la rangée de tête disparaît', ass0 !== ass1 && new Set(ass1.split(',')).size === 1 && await ev(c, () => !document.querySelector('.vh-groupe')), { ass0, ass1 });
      const k = await ev(c, () => [...document.querySelectorAll('.vh-k .kpi')].map(x => x.innerText.replace(/\s+/g, ' ').trim())); v(nom + ' · le chiffre « à faire » suit (la population baisse)', /^2 à faire$/.test(k[1]) || /^1 à faire$/.test(k[1]), k);
      if (c.err.length) console.log(c.err.slice(0, 3)); v(nom + ' · zéro erreur JavaScript (rendez-vous, contrôle, assurance)', c.err.length === 0, c.err.slice(0, 3));
      await L.fin(c);
    }

    if (on('B')) {
      const c = await L.ouvrir({ profil, qui:'marc', calme:true }); await aller(c, 'vehicules');
      /* 4 · un plein en deux touchers : « Noter un plein », « Enregistrer » */
      const a0 = await ev(c, () => ({ achats:ACHATS.length, km:vehDe('veh2').km })); touches = 0;
      await toucher(c, c.largeur < 700 ? '.vh-b-plein' : '.tete [data-vh="plein|"]'); await L.calme(c.p, 400);
      await ev(c, () => { const e = (id, x) => { const i = document.getElementById(id); i.value = x; i.dispatchEvent(new Event('input', { bubbles:true })); i.dispatchEvent(new Event('change', { bubbles:true })); }; e('vx-v', 'veh2'); e('vx-t', 'Carburant'); e('vx-m', '84,60'); e('vx-l', '49'); e('vx-km', '121890'); });
      await toucher(c, '#calque .panneau [data-vx="pleinok"]'); await L.calme(c.p, 500);
      const a1 = await ev(c, () => ({ achats:ACHATS.length, km:vehDe('veh2').km, compte:(ACHATS[ACHATS.length - 1] || {}).compte }));
      v(nom + ' · plein : 2 touchers (« Noter un plein », « Enregistrer »), l\'achat est écrit (compte 6061) et le kilométrage suit', touches === 2 && a1.achats === a0.achats + 1 && a1.compte === '6061' && a1.km === 121890 && a1.km > a0.km, { touches, a0, a1 });
      /* 5 · mettre au garage, puis le remettre en service (depuis la rangée) */
      await ev(c, () => { rendre(); }); await toucher(c, '.vh-liste [data-vh="fiche|veh1"]'); await L.calme(c.p, 450); await toucher(c, '#calque .panneau [data-vh="statut|veh1|fiche"]'); await L.calme(c.p, 450);
      const pg = await panneau(c); v(nom + ' · garage : « Mettre au garage » ouvre la feuille (pourquoi, quel garage, retour prévu, remplaçant, interventions touchées)', !!pg && /Pourquoi|Motif/i.test(pg.txt) && /garage/i.test(pg.txt), pg && pg.txt.slice(0, 200));
      await toucher(c, '#calque .panneau [data-vx^="garageok|"]'); await L.calme(c.p, 500);
      const g1 = await ev(c, () => ({ st:vehDe('veh1').statut, kpi:document.querySelector('.vh-k .kpi').innerText.replace(/\s+/g, ' ').trim() }));
      v(nom + ' · garage : le Trafic est au garage (3 touchers : ligne, « Mettre au garage », confirmer) — « 2 sur 4 en service »', g1.st === 'atelier' && /^2 sur 4 en service$/.test(g1.kpi) && touches >= 5, g1);
      await ev(c, () => { fermerPanneau(); rendre(); }); await L.calme(c.p, 300);
      await toucher(c, '.vh-liste [data-vh="statut|veh4"]'); await L.calme(c.p, 450); const pr = await panneau(c);
      v(nom + ' · retour : « Le remettre en service » (rangée du Kangoo) ouvre la feuille de retour (date, kilomètres, facture)', !!pr && /retour|service/i.test(pr.txt), pr && pr.txt.slice(0, 200));
      await toucher(c, '#calque .panneau [data-vx^="retourok|"]'); await L.calme(c.p, 500);
      const r1 = await ev(c, () => vehDe('veh4').statut), lk = await ligne(c, 'veh4');
      v(nom + ' · retour : le Kangoo est en service, sa ligne retombe sur son échéance en retard (« Noter le rendez-vous »)', r1 === 'service' && lk.pastille === 'En retard' && lk.geste === 'Noter le rendez-vous', { r1, lk });
      /* 6 · « C'est réglé » */
      await ev(c, () => { fermerPanneau(); VEHICULES[2].souci = { type:'Voyant allumé', qui:'lr', d:jour(-1), txt:'voyant moteur' }; rendre(); }); await L.calme(c.p, 400);
      const ls = await ligne(c, 'veh3'); const okS = await toucher(c, '.vh-liste [data-vh="soucireg|veh3"]'); await L.calme(c.p, 500); ls.clic = okS; ls.pile = await ev(c, () => { const b = document.querySelector('.vh-liste [data-vh="soucireg|veh3"]'); if (!b) return 'absent'; const r = b.getBoundingClientRect(); return [...document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2)].slice(0, 4).map(e => e.tagName + '.' + String(e.className).slice(0, 30)).join(' > '); });
      v(nom + ' · souci : la rangée dit « Souci signalé » (« Léa signale : voyant moteur · hier ») avec « C\'est réglé » ; le geste efface le signalement', ls.pastille === 'Souci signalé' && /Léa signale\s:\svoyant moteur · hier/.test(ls.prec) && ls.geste === 'C’est réglé' && await ev(c, () => !VEHICULES[2].souci), ls);
      /* 7 · une amende : fiche, Papiers, « Une amende », Enregistrer */
      touches = 0; await ev(c, () => { fermerPanneau(); rendre(); }); await toucher(c, '.vh-liste [data-vh="fiche|veh2"]'); await L.calme(c.p, 450); await toucher(c, '#calque .panneau [data-vh="fonglet|papiers"]'); await L.calme(c.p, 350);
      await toucher(c, '#calque .panneau [data-vh="amende|veh2"]'); await L.calme(c.p, 450);
      await ev(c, () => { const i = document.getElementById('vx-am'); if (i) { i.value = '135'; i.dispatchEvent(new Event('input', { bubbles:true })); } }); await toucher(c, '#calque .panneau [data-vx^="amendeok|"]'); await L.calme(c.p, 500);
      const am = await ev(c, () => ({ n:vehDe('veh2').incidents.length, tache:TACHES.some(t => /amende|désigner/i.test(t.t) && /AB-123-CD/.test(t.t)) }));
      const pa = await panneau(c);
      v(nom + ' · amende : 4 touchers sans défiler (fiche, Papiers, « Une amende », Enregistrer), la tâche « désigner le conducteur » est créée, l\'amende paraît dans Papiers', touches === 4 && am.n === 1 && am.tache && !!pa && /Amende de 135/.test(pa.txt) && /à désigner avant le/.test(pa.txt), { touches, am, papiers:pa && pa.txt.slice(0, 400) });
      /* 8 · une dépense supprimée, puis rétablie par « Annuler » */
      await toucher(c, '#calque .panneau [data-vh="fonglet|depenses"]'); await L.calme(c.p, 350);
      const n0 = await ev(c, () => vehFrais(vehDe('veh2')).length); const prem = await ev(c, () => { const b = [...document.querySelectorAll('#calque .vh-fr')].find(x => /Plaquettes de frein/.test(x.textContent)); return !!b; });
      await ev(c, () => { [...document.querySelectorAll('#calque .vh-fr')].find(x => /Plaquettes de frein/.test(x.textContent)).click(); }); await L.calme(c.p, 400);
      await toucher(c, '#calque .panneau [data-vx^="frdel|"]'); await L.calme(c.p, 500);
      const n1 = await ev(c, () => vehFrais(vehDe('veh2')).length);
      await ev(c, () => { [...document.querySelectorAll('#toast button')].find(b => /Annuler/.test(b.textContent)).click(); }); await L.calme(c.p, 400);
      const n2 = await ev(c, () => vehFrais(vehDe('veh2')).length);
      v(nom + ' · dépense : « Supprimer cette dépense » la retire (' + n0 + ' → ' + n1 + ') et « Annuler » la rétablit (→ ' + n2 + ')', prem && n1 === n0 - 1 && n2 === n0, { prem, n0, n1, n2 });
      if (c.err.length) console.log(c.err.slice(0, 3)); v(nom + ' · zéro erreur JavaScript (plein, garage, souci, amende, dépense)', c.err.length === 0, c.err.slice(0, 3));
      await L.fin(c);
    }

    if (on('C')) {
      const c = await L.ouvrir({ profil, qui:'marc', calme:true }); await aller(c, 'vehicules');
      /* 9 · un document ajouté (« Lequel ? » puis le fichier), puis retiré */
      await ev(c, () => { vehFiche('veh1', 'papiers'); }); await L.calme(c.p, 450); await toucher(c, '#calque .panneau [data-vh="docadd|veh1"]'); await L.calme(c.p, 450);
      const pd = await panneau(c);
      await ev(c, () => { document.getElementById('vh-dk').value = 'assur'; });
      await c.p.setInputFiles('#vh-df', { name:'attestation.pdf', mimeType:'application/pdf', buffer:Buffer.from('%PDF-1.4 essai') }); await L.calme(c.p, 300);
      await toucher(c, '#calque .panneau [data-vh^="docok|"]'); await L.calme(c.p, 700);
      const d1 = await ev(c, () => ({ doc:!!vehDe('veh1').docs.assur, txt:(document.querySelector('#calque .panneau') || { innerText:'' }).innerText }));
      v(nom + ' · document : « Ajouter un document » demande LEQUEL puis le fichier ; l\'attestation paraît dans Papiers avec « Retirer »', !!pd && pd.h2 === 'Ajouter un document' && /Lequel\s\?/.test(pd.txt) && d1.doc && /Attestation d’assurance/.test(d1.txt) && /Retirer/.test(d1.txt), { h2:pd && pd.h2, d1:d1.doc, txt:d1.txt.slice(0, 500) });
      await toucher(c, '#calque .panneau [data-vh^="docdel|"]'); await L.calme(c.p, 400);
      v(nom + ' · document : « Retirer » le retire', await ev(c, () => !vehDe('veh1').docs.assur), await toast(c));
      /* 10 · le matériel : la feuille des huit lignes, « Tout est là » puis « Annuler » */
      await ev(c, () => { VEHICULES[0].materiel.ok = VEH_MATERIEL.filter(x => x !== 'Extincteur'); VEHICULES[0].materiel.fait = jour(-175); vehFiche('veh1', 'afaire'); }); await L.calme(c.p, 450);
      await ev(c, () => { document.querySelector('#calque .panneau [data-vh="fait|veh1|mat|fiche"]').click(); }); await L.calme(c.p, 450);
      const mp = await ev(c, () => { const p = document.querySelector('#calque .panneau'); return { h2:p.querySelector('h2').textContent, lignes:p.querySelectorAll('.vh-mat-l').length, hautes:[...p.querySelectorAll('.vh-mat-l')].map(l => l.getBoundingClientRect().height), coches:[...p.querySelectorAll('.vh-sw')].filter(x => x.checked).length }; });
      v(nom + ' · matériel : « Noter le contrôle du matériel » ouvre HUIT lignes à 44 px et plus, avec un interrupteur (7 allumés : l\'extincteur manque)', mp.h2 === 'Matériel de sécurité' && mp.lignes === 8 && mp.hautes.every(h => h >= 44) && mp.coches === 7, mp);
      await toucher(c, '#calque .panneau [data-vh^="mattout|"]'); await L.calme(c.p, 500);
      const m1 = await ev(c, () => ({ ok:VEHICULES[0].materiel.ok.length, fait:VEHICULES[0].materiel.fait }));
      v(nom + ' · matériel : « Tout est là » coche tout et date le contrôle d\'aujourd\'hui', m1.ok === 8 && m1.fait === '2026-10-31', m1);
      await ev(c, () => { [...document.querySelectorAll('#toast button')].find(b => /Annuler/.test(b.textContent)).click(); }); await L.calme(c.p, 400);
      const m2 = await ev(c, () => ({ ok:VEHICULES[0].materiel.ok.length, fait:VEHICULES[0].materiel.fait }));
      v(nom + ' · matériel : « Annuler » rétablit l\'extincteur manquant ET l\'ancienne date (la photo prise AVANT de tout cocher)', m2.ok === 7 && m2.fait !== '2026-10-31', m2);
      /* 11 · le compteur ne recule pas (la fonction du module est reliée au bouton de la fiche) */
      await ev(c, () => { fermerPanneau(); vehFiche('veh2', 'afaire'); }); await L.calme(c.p, 400); await toucher(c, '#calque .panneau [data-vh="km|veh2"]'); await L.calme(c.p, 400);
      const k0 = await ev(c, () => vehDe('veh2').km); await ev(c, () => { const i = document.getElementById('vx-nkm') || document.getElementById('vx-km'); i.value = '100000'; i.dispatchEvent(new Event('input', { bubbles:true })); });
      await ev(c, () => { document.querySelector('#calque .panneau [data-vx^="kmok|"]').click(); }); await L.calme(c.p, 400);
      v(nom + ' · compteur : un kilométrage plus bas que le dernier relevé est refusé (le compteur ne bouge pas)', await ev(c, () => vehDe('veh2').km) === k0, { k0, apres:await ev(c, () => vehDe('veh2').km) });
      if (c.err.length) console.log(c.err.slice(0, 3)); v(nom + ' · zéro erreur JavaScript (document, matériel, compteur)', c.err.length === 0, c.err.slice(0, 3));
      await L.fin(c);
    }
  }

  if (on('D')) {   // LE BUREAU : lit, note un plein, un rendez-vous, un contrôle, met au garage — et rien d'autre
    const c = await L.ouvrir({ profil:'mac', qui:'julie', calme:true });
    const menu = await ev(c, () => [...document.querySelectorAll('#menu .m-liste a, #menu .m-liste button')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
    v('bureau (julie) : « Véhicules » est dans son menu (groupe Personnel)', menu.some(x => /^Véhicules/.test(x)), menu.slice(0, 20));
    await aller(c, 'vehicules');
    const r = await ev(c, () => { const z = document.getElementById('contenu'); return { h1:(z.querySelector('h1') || {}).textContent, rangs:z.querySelectorAll('.vh-liste .vh-l').length, boutons:[...z.querySelectorAll('.btn, .lien')].map(b => b.textContent.trim()), txt:z.innerText }; });
    v('bureau : la liste s\'ouvre (population : 5 rangées) avec « Noter un plein » et les gestes de rangée', r.h1 === 'Véhicules' && r.rangs === 5 && r.boutons.includes('Noter un plein') && r.boutons.includes('Noter le rendez-vous') && r.boutons.includes('Noter le renouvellement'), r.boutons);
    v('bureau : PAS de « ＋ Nouveau véhicule », pas de « Voir au planning » (il ne planifie pas)', !r.boutons.includes('＋ Nouveau véhicule') && !r.boutons.some(x => /Voir au planning/.test(x)), r.boutons);
    await toucher(c, '.vh-liste [data-vh="fiche|veh2"]'); await L.calme(c.p, 450);
    const f = await ev(c, () => { const p = document.querySelector('#calque .panneau'); return { btn:[...p.querySelectorAll('.btn, .lien')].map(b => b.textContent.trim()) }; });
    v('bureau : la fiche — « Noter un plein », « Mettre au garage », les échéances ; PAS de « Modifier la fiche », « Changer de conducteur », « Relever le compteur », « Stock du camion »', f.btn.includes('Noter un plein') && f.btn.includes('Mettre au garage') && f.btn.includes('Noter le rendez-vous') && !f.btn.some(x => /Modifier la fiche|Changer de conducteur|Désigner un conducteur|Relever le compteur|Stock du camion/.test(x)), f.btn);
    await toucher(c, '#calque .panneau [data-vh="fonglet|papiers"]'); await L.calme(c.p, 350);
    const pa = await ev(c, () => [...document.querySelectorAll('#calque .panneau .btn')].map(b => b.textContent.trim()));
    v('bureau : Papiers — ni « Ajouter un document », ni « Une amende », ni « Un accident »', !pa.some(x => /Ajouter un document|Une amende|Un accident|Remplacer/.test(x)), pa);
    /* les gestes FORCÉS à la main : la garde est dans la fonction, pas seulement dans le bouton caché */
    const av = await ev(c, () => ({ v:VEHICULES.length, t:TACHES.length, inc:VEHICULES.reduce((s, x) => s + x.incidents.length, 0), cond:VEHICULES.map(x => x.conducteur).join(), docs:VEHICULES.reduce((s, x) => s + Object.keys(x.docs).length, 0) }));
    const forces = await ev(c, () => { fermerPanneau(); const essais = ['nouveau', 'modif|veh1', 'cond|veh1', 'amende|veh1', 'sinistre|veh1', 'km|veh1', 'docadd|veh1', 'soucireg|veh1', 'plan|veh4', 'csvflotte'], ouverts = [];
      for (const e of essais) { const b = document.createElement('button'); b.setAttribute('data-vh', e); document.body.appendChild(b); b.click(); b.remove(); if (document.querySelector('#calque .panneau')) { ouverts.push(e); fermerPanneau(); } }
      for (const e of ['modif|veh1', 'cond|veh1', 'amende|veh1', 'sinistre|veh1', 'soucireg|veh1', 'km|veh1', 'creerok']) { const b = document.createElement('button'); b.setAttribute('data-vx', e); document.body.appendChild(b); b.click(); b.remove(); if (document.querySelector('#calque .panneau')) { ouverts.push('vx:' + e); fermerPanneau(); } }
      return ouverts; });
    const ap = await ev(c, () => ({ v:VEHICULES.length, t:TACHES.length, inc:VEHICULES.reduce((s, x) => s + x.incidents.length, 0), cond:VEHICULES.map(x => x.conducteur).join(), docs:VEHICULES.reduce((s, x) => s + Object.keys(x.docs).length, 0) }));
    v('bureau : dix gestes forcés à la main (nouveau, modifier, conducteur, amende, accident, compteur, document, « réglé », planning, export) et sept d\'avant — AUCUNE feuille ne s\'ouvre, rien n\'est écrit', forces.length === 0 && JSON.stringify(av) === JSON.stringify(ap), { forces, av, ap });
    await ev(c, () => { fermerPanneau(); }); await toucher(c, '.tete [data-vh="plein|"]'); await L.calme(c.p, 450); const pp = await panneau(c);
    v('bureau : « Noter un plein » ouvre la feuille (il le note pour l\'équipe)', !!pp && /plein/i.test(pp.h2), pp && pp.h2);
    /* la case de l'Équipe : décochée, la rubrique se ferme */
    await ev(c, () => { fermerPanneau(); eqDe('julie').droits.cats.temps.v = 0; });
    const ferme = await ev(c, () => ({ permis:rlPermis('vehicules'), menu:[...document.querySelectorAll('#menu .m-liste a')].some(e => /^Véhicules/.test(e.textContent.trim())) }));
    await ev(c, () => { rlChanger('gestion', { muet:true, h:'comptabilite' }); }); await L.calme(c.p, 500);
    const ferme2 = await ev(c, () => ({ permis:rlPermis('vehicules'), menu:[...document.querySelectorAll('#menu .m-liste a')].some(e => /^Véhicules/.test(e.textContent.trim())) }));
    v('bureau : la case « Temps de travail et véhicules » décochée dans l\'Équipe ferme la rubrique (adresse et menu) — jamais un test sur le nom du rôle', ferme.permis === false && ferme2.permis === false && ferme2.menu === false, { ferme, ferme2 });
    if (c.err.length) console.log(c.err.slice(0, 3)); v('bureau : zéro erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
    /* la technicienne n'a pas la rubrique (son camion est « Mon camion ») */
    const t = await L.ouvrir({ profil:'iphone', qui:'sm', calme:true }); await ev(t, () => { aller('vehicules'); }); await L.calme(t.p, 600);
    const tt = await ev(t, () => ({ h1:(document.querySelector('#contenu h1') || {}).textContent || '', liste:!!document.querySelector('.vh-liste'), permis:rlPermis('vehicules') }));
    v('technicienne (sm) : la rubrique Véhicules ne s\'ouvre pas', !tt.liste && tt.permis === false && tt.h1 !== 'Véhicules', tt);
    await L.fin(t);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

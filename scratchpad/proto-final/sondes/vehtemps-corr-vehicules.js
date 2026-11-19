// Correcteur du lot « vehtemps » — VÉHICULES (gerant-03, 08, 09, 10, 13, 14, 15, 16).
//  03 : au garage, la révision n'offre plus « Noter le rendez-vous » et dit « Au garage jusqu'au… » ;  14 : « Le remettre en service » n'est écrit qu'une fois ;
//  15 : l'assurance d'un groupe n'est pas redite sous « En règle » ;  16 : « Il manque : … » et « Les commander » ne se touchent pas ;
//  08 : le total de la phrase des Dépenses est la somme des lignes (l'assurance répartie y est ÉCRITE) ;  09 : « hors taxes » est dit ;
//  10 : « par mois » divise par les vrais mois ;  13 : « Dépense supprimée / modifiée » et un mot après « Annuler ».
// Chaque contrôle prouve sa population. 127.0.0.1 seulement.
const L = require('../lib.js'), v = L.v;
const ev = (c, f, a) => c.p.evaluate(f, a);
const net = t => String(t).replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
const PROFILS = (process.env.PROFILS || 'mac,iphone').split(',');
(async () => {
  for (const profil of PROFILS) {
    const nom = profil, c = await L.ouvrir({ profil, qui:'marc', calme:true }); await L.aller(c.p, 'vehicules');
    const V = await ev(c, () => VEHICULES.map(x => ({ id:x.id, nom:vhNom(x), statut:x.statut, souci:!!x.souci, groupe:vxGroupes().some(g => g.vs.includes(x)), k:vhEtat(x).k })));
    const gar = V.find(x => x.statut === 'atelier' && !x.souci);
    v(nom + ' · population : un véhicule au garage, un en groupe d\'assurance « En règle »', V.length >= 4 && !!gar && V.some(x => x.groupe && x.k === 'regle'), V);
    /* ── 03 + 14 : la fiche du véhicule au garage ── */
    await ev(c, id => vehFiche(id), gar.id); await L.calme(c.p, 500);
    const f = await ev(c, () => { const z = document.querySelector('#calque') || document; const t = [...z.querySelectorAll('button')].map(b => b.textContent.trim()); return { rdv:z.querySelectorAll('[data-vh^="rdv|"]').length, remettre:t.filter(x => x === 'Le remettre en service').length, ligne:(z.querySelector('.vh-ech') || {}).textContent || '', rouge:z.querySelectorAll('.vh-ech .ve-rt').length }; });
    v(nom + ' · 03 : au garage, aucun « Noter le rendez-vous » sur la fiche', f.rdv === 0 && f.ligne.length > 10, f);
    v(nom + ' · 03 : la ligne de la révision dit « Au garage jusqu\'au… » et non « en retard »', /Au garage jusqu’au/.test(net(f.ligne)) && !/en retard/.test(net(f.ligne)), net(f.ligne).slice(0, 160));
    v(nom + ' · 14 : « Le remettre en service » n\'est écrit qu\'une fois sur la fiche', f.remettre === 1, f);
    await L.capture(c, '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/vehtemps-corr/veh-garage-' + profil + '.png');
    /* contre-épreuves : un véhicule en service garde « Mettre au garage » ; un véhicule en retard hors garage garde « Noter le rendez-vous » */
    const srv = V.find(x => x.statut === 'service' && !x.souci);
    await ev(c, id => { fermerPanneau(); vehFiche(id); }, srv.id); await L.calme(c.p, 400);
    const g2 = await ev(c, () => [...document.querySelectorAll('.vh-gestes button')].map(b => b.textContent.trim()));
    v(nom + ' · 14 : contre-épreuve — un véhicule en service garde « Mettre au garage »', g2.includes('Mettre au garage'), g2);
    const rdvAvant = await ev(c, () => { const o = VEHICULES.find(x => x.statut === 'service' && vehEcheances(x).some(e => (e.k === 'ct' || e.k === 'entretien') && e.urg !== 'v' && !vhRdvNote(x, e))); return o ? { id:o.id } : null; });
    if (rdvAvant) { await ev(c, id => { fermerPanneau(); vehFiche(id); }, rdvAvant.id); await L.calme(c.p, 400); v(nom + ' · 03 : contre-épreuve — hors garage, « Noter le rendez-vous » est toujours proposé', (await ev(c, () => document.querySelectorAll('[data-vh^="rdv|"]').length)) >= 1, rdvAvant); }
    else v(nom + ' · 03 : contre-épreuve — un véhicule à rendez-vous à noter existe', false, 'aucun');
    /* ── 15 : l'assurance du groupe n'est pas répétée ── */
    await ev(c, () => { fermerPanneau(); }); await L.aller(c.p, 'vehicules');
    const R = await ev(c, () => VEHICULES.filter(x => vxGroupes().some(g => g.vs.includes(x)) && vhEtat(x).k === 'regle').map(x => ({ n:vhNom(x), prec:vhEtat(x).prec })));
    v(nom + ' · 15 : les rangées « En règle » d\'un groupe annoncent une autre échéance que l\'assurance', R.length >= 1 && R.every(r => !/assurance/i.test(r.prec)), R);
    const txt = await ev(c, () => document.getElementById('contenu').textContent.replace(/[  ]/g, ' '));
    v(nom + ' · 15 : l\'échéance de l\'assurance n\'est écrite qu\'une fois dans la liste', (txt.match(/Assurance[^.]{0,40}\d+ véhicules/g) || []).length === 1 && !/prochaine échéance est l’assurance/.test(txt), (txt.match(/prochaine échéance est [^,]{0,40}/g) || []));
    /* ── 16 : le matériel ── */
    const m = await ev(c, () => { const o = VEHICULES.find(x => VEH_MATERIEL.some(q => !x.materiel.ok.includes(q))); if (!o) return null; vhMatPanel(o.id); const a = document.querySelector('#calque .fo-alerte'), b = a && a.querySelector('button.lien'), t = a && a.querySelector('b'); const rb = b && b.getBoundingClientRect(), rt = t && t.getBoundingClientRect(); return a ? { sous:rb.top >= rt.bottom - 1, texte:a.textContent.replace(/[  ]/g, ' ') } : { sans:true }; });
    v(nom + ' · 16 : « Il manque : … » et le lien « Les commander » sont sur deux lignes', !!m && m.sous === true, m);
    await ev(c, () => fermerPanneau());
    /* ── 08, 09, 10 : les dépenses de chaque véhicule ── */
    const D = await ev(c, () => { const R = []; VX.periode = '12m'; for (const x of VEHICULES) { vehFiche(x.id, 'depenses'); VH.fOnglet = 'depenses'; vehFiche(x.id, 'depenses'); const z = document.querySelector('#calque'); const ph = (z.querySelector('.vh-phrase') || {}).textContent || ''; const lignes = [...z.querySelectorAll('.vh-fcorps .vh-fr .vh-mt')].map(e => e.textContent); const c0 = vxCalcCout(x, '12m'); R.push({ nom:vhNom(x), ph, lignes, total:c0.total, par:c0.parMois, deb:c0.deb, ht:!!z.querySelector('.vh-ht'), liss:!!z.querySelector('.vh-fr-liss'), prime:!!x.assur.prime, vide:!!x.frais && false }); fermerPanneau(); } return { R, auj:AUJ }; });
    const sommeOk = D.R.every(r => { const s = r.lignes.reduce((a, t) => a + L.cents(t), 0); return Math.abs(s / 100 - r.total) < 0.011; });
    v(nom + ' · 08 : population — des véhicules avec dépenses et assurance répartie', D.R.filter(r => r.lignes.length >= 3).length >= 2 && D.R.some(r => r.liss), D.R.map(r => [r.nom, r.lignes.length, r.liss]));
    v(nom + ' · 08 : la somme des lignes (assurance répartie comprise) est le total de la phrase, pour chaque véhicule', sommeOk, D.R.map(r => [r.nom, r.total, r.lignes]));
    v(nom + ' · 09 : « hors taxes » est dit sur l\'onglet Dépenses de chaque véhicule', D.R.every(r => r.ht), D.R.map(r => r.ht));
    const parOk = D.R.filter(r => r.par).every(r => { const mois = Math.max(1, Math.round((Date.parse(D.auj) - Date.parse(r.deb)) / 864e5) / 30.4); return Math.abs(r.par - r.total / mois) < 0.01; });
    v(nom + ' · 10 : « par mois » = total ÷ vrais mois (4,3 mois ne font plus 4)', parOk && D.R.some(r => r.par > 0), D.R.map(r => [r.nom, Math.round(r.par), r.deb]));
    /* 45 jours : l'ancien arrondi doublait le chiffre */
    const q45 = await ev(c, () => { const o = VEHICULES[0], sv = vxDebut; vxDebut = () => ajoute(AUJ, -45); const r = vxCalcCout(o, 'tout'); vxDebut = sv; return { jours:Math.round((dObj(AUJ) - dObj(r.deb)) / 864e5), par:r.parMois, total:r.total }; });
    v(nom + ' · 10 : sur 45 jours, par mois = total ÷ 1,48 (et non ÷ 1)', q45.jours === 45 && q45.total > 0 && Math.abs(q45.par - q45.total / (45 / 30.4)) < 0.01, q45);
    /* ── 13 : les mots des toasts ── */
    const T = await ev(c, async () => { const x = VEHICULES.find(o => o.frais && o.frais.length); const [d, lib, ht] = x.frais[0], cle = vhCleFrais({ own:null, achat:null, ndf:null, d, lib, ht }); const n0 = x.frais.length;
      vxFraisSuppr(x.id, 'o0'); const t1 = document.getElementById('toast').textContent, n1 = x.frais.length; document.querySelector('#toast button').click(); const t2 = document.getElementById('toast').textContent, n2 = x.frais.length; return { t1, t2, n0, n1, n2 }; });
    v(nom + ' · 13 : « Dépense supprimée » puis, après Annuler, une phrase qui dit que la dépense est revenue', /^Dépense supprimée/.test(T.t1) && /Annulé : la dépense est revenue/.test(T.t2) && T.n1 === T.n0 - 1 && T.n2 === T.n0, T);
    /* ── rejeu : le pied collant d'une feuille est le DERNIER élément — il ne recouvre ni « ‹ Retour à la fiche » ni ce qui le suivait (« Supprimer cette dépense », « Passer hors service ») ── */
    const Q = await ev(c, () => { const R = []; const test = (nomP, ouvre, sels) => { fermerPanneau(); ouvre(); const z = document.querySelector('#calque .panneau'); const pn = z && z.getBoundingClientRect(); const o = { panneau:nomP, vu:!!z, elements:[] }; for (const sel of sels) { const b = document.querySelector('#calque ' + sel); if (!b) { o.elements.push({ sel, absent:true }); continue; } z.scrollTop = z.scrollHeight; const r = b.getBoundingClientRect(), at = document.elementFromPoint(r.left + Math.min(20, r.width / 2), r.top + r.height / 2); o.elements.push({ sel, libre:!!at && (at === b || b.contains(at)), h:Math.round(r.height) }); } R.push(o); };
        const v0 = VEHICULES[0], cle = 'o0';
        test('Cette dépense', () => vxFraisPanel(v0.id, cle), ['[data-vh^="retour|"]', '[data-vx^="frdel|"]', '[data-vx^="frmodok|"]']);
        test('Modifier la fiche', () => vxModifPanel(v0.id), ['[data-vh^="retour|"]', '[data-vh^="suppr|"]', '[data-vx^="modifok|"]']);
        test('Noter le compteur', () => vxKmPanel(v0.id, 'fiche'), ['[data-vh^="retour|"]', '[data-vx^="kmok|"]']);
        return R; });
    v(nom + ' · rejeu : population — trois feuilles ouvertes avec tous leurs éléments', Q.length === 3 && Q.every(o => o.vu && o.elements.length >= 2 && o.elements.every(e => !e.absent)), Q);
    v(nom + ' · rejeu : dans « Cette dépense », « Modifier la fiche » et le compteur, retour, suppression et bouton ne se recouvrent pas (touchables, au point touché)', Q.every(o => o.elements.every(e => e.libre)), Q.map(o => [o.panneau, o.elements.filter(e => !e.libre)]));
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.log('ERREUR', e.stack || e); await L.fermer().catch(() => {}); process.exit(2); });

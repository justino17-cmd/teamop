// Véhicules, étape 4 — V4 : LES FEUILLES (VEHICULES-TEMPS.md § 3.5), ouvertes telles que la fiche ou la liste les ouvre, sur les profils × jour ET nuit :
// le TITRE exact, les questions posées (libellés exacts), au plus six champs visibles à l'ouverture, UN gros bouton (le geste de la feuille) visible SANS défiler,
// « ‹ Retour à la fiche » quand une fiche l'a ouverte, des champs à 16 px et plus, des cibles tactiles ≥ 44 px, aucun débordement latéral (mesuré contre la largeur POSÉE
// du profil, jamais innerWidth), aucun émoji dans un libellé, zéro erreur JavaScript — et la population de chaque mesure est comptée avant de dire « 0 ».
// PROFILS=mac,iphone NUIT=0,1 SEULES=plein,nouveau pour restreindre. ⛔ 127.0.0.1 seulement, un navigateur à la fois.
const L = require('../lib.js'), v = L.v;
const PROFILS = (process.env.PROFILS || 'mac,windows,ipad,iphone,android,petit').split(','), NUITS = (process.env.NUIT || '0,1').split(',').map(Number);
const SEULES = process.env.SEULES ? process.env.SEULES.split(',') : null;
/* code d'ouverture (comme la fiche ou la liste le fait) → ce que la feuille doit dire. q = libellés de question (regex), gros = les gros boutons (exacts), retour = « ‹ Retour » attendu */
const F = {
  nouveau:{ ouvre:"vxNouveauPanel()", h2:'Nouveau véhicule', q:[/^Plaque/, /^Marque/, /^Modèle/, /^Qui le conduit \?/, /^Kilomètres au compteur/, /^Énergie/], gros:['Ajouter le véhicule'], champs:5, repli:'Ajouter plus tard' },
  plein:{ ouvre:"vxPleinPanel('veh1')", h2:'Noter un plein', q:[/^Qu’est-ce que c’est \?/, /^Montant payé/, /^Kilomètres au compteur/, /^Litres/, /^Payé avec/], gros:['Enregistrer le plein'], champs:4, choix:['Carburant', 'Recharge', 'Garage ou entretien', 'Péage ou parking', 'La carte de l’entreprise', 'Mon argent'], aussi:[/Photo du ticket/, /toutes taxes comprises/, /Un autre jour/] },
  fait:{ ouvre:"vxFaitPanel('veh2','ct','fiche')", h2:'Noter le contrôle technique', q:[/^Fait le/, /^Kilomètres au compteur/, /^Montant payé/], gros:['Enregistrer'], retour:true, champs:3, aussi:[/Prochain contrôle : le \d+ \S+ 20\d\d \(deux ans après\)\. Remplace par la date écrite sur le rapport si elle est différente\./] },
  revision:{ ouvre:"vxFaitPanel('veh1','entretien','fiche')", h2:'Noter la révision', q:[/^Fait le/, /^Kilomètres au compteur/, /^Montant payé/], gros:['Enregistrer'], retour:true, champs:3, aussi:[/Prochaine révision : à [\d  ]+ km ou le/] },
  assur:{ ouvre:"vxFaitPanel('veh1','assur','fiche')", h2:'Noter le renouvellement', q:[/^Renouvelée le/, /^Prime annuelle/], gros:['Enregistrer'], retour:true, champs:2, aussi:[/Nouvelle fin de contrat : le/] },
  groupe:{ ouvre:"(()=>{const g=vxGroupes()[0];vxFaitGroupe(g.fin,g.cie)})()", h2:/^Les 4 véhicules\s:\snoter le renouvellement$/, q:[/^Renouvelée le/, /^Prime annuelle des 4 véhicules/], gros:['Enregistrer'], champs:2 },
  rdv:{ ouvre:"vxRdv('veh2','ct','fiche')", h2:'Noter le rendez-vous', q:[/^Quel jour \?/, /^Quel garage \?/], gros:['Noter le rendez-vous'], champs:2, aussi:[/C’est déjà fait \? Noter le contrôle technique/] },
  mat:{ ouvre:"vhMatPanel('veh1','fiche')", h2:'Matériel de sécurité', q:[], gros:['Tout est là', 'Il manque quelque chose'], retour:true, champs:0, interrupteurs:8, lignes:8 },
  km:{ ouvre:"vxKmPanel('veh1','fiche')", h2:'Relever le compteur', q:[/^Kilomètres au compteur/], gros:['Enregistrer'], retour:true, champs:1, aussi:[/Dernier relevé : 48 210 km, le 6 octobre/] },
  garage:{ ouvre:"vxGaragePanel('veh1','fiche')", h2:'Mettre au garage', q:[/^Pourquoi \?/, /^Quel garage \?/, /^Rendu prévu le/, /^Véhicule de remplacement/], gros:['Mettre au garage'], retour:true, champs:3, choix:['Entretien', 'Panne', 'Accident', 'Autre'], aussi:[/Tu pourras les déplacer au Planning juste après\./] },
  retour:{ ouvre:"vxRetourPanel('veh4','fiche')", h2:'Le remettre en service', q:[/^Rendu le/, /^Kilomètres au retour/, /^Montant de la facture/], gros:['Le remettre en service'], retour:true, champs:3 },
  cond:{ ouvre:"vxCondPanel('veh1')", h2:'Changer de conducteur', q:[/^Qui \?/, /^À partir du/], gros:['Enregistrer'], retour:true, champs:1, choix:['Karim Benali', 'Léa Roux', 'Tom Leroy', 'Marc Leblanc', 'Julie Petit'] },
  modif:{ ouvre:"vxModifPanel('veh1')", h2:'Modifier la fiche', q:[/^Marque/, /^Modèle/, /^Énergie/, /^Année/, /^Qui le conduit \?/], gros:['Enregistrer'], retour:true, champs:5, repli:'Assurance', rouge:['Supprimer ce véhicule'], aussi:[/Passer hors service/] },
  frais:{ ouvre:"vxFraisPanel('veh1','o0')", h2:'Cette dépense', q:[/^Ce que c’est/, /^Date/, /^Montant/], gros:['Enregistrer'], retour:true, champs:3, rouge:['Supprimer cette dépense'] },
  souci:{ ouvre:"vxSouciPanel('veh1')", h2:'Un souci avec le camion', q:[/^Qu’est-ce qui ne va pas \?/, /^Un mot pour le bureau/], gros:['Prévenir le bureau'], champs:1, choix:['Un voyant s’est allumé', 'Un pneu', 'Un choc', 'Autre chose'], aussi:[/Photo/] },
  amende:{ ouvre:"vxAmendePanel('veh1')", h2:'Une amende', q:[/^Quel jour \?/, /^Montant/, /^Qui conduisait \?/, /^À désigner avant le/], gros:['Enregistrer l’amende'], retour:true, champs:4 },
  accident:{ ouvre:"vxSinistrePanel('veh1')", h2:'Un accident', q:[/^Quel jour \?/, /^Qui conduisait \?/, /^Où \?/, /^L’autre personne ou l’assurance/, /^Franchise/], gros:['Enregistrer l’accident'], retour:true, champs:5 },
  doc:{ ouvre:"vhDocPanel('veh1')", h2:'Ajouter un document', q:[/^Lequel \?/], gros:['Ajouter le document'], retour:true, champs:1, aussi:[/Photo ou fichier/] },
  cout:{ ouvre:"vhCoutPanel()", h2:'Ce que coûtent les véhicules', q:[], gros:[], champs:0, aussi:[/Sur 12 mois, assurance comprise, pour les kilomètres relevés\./, /Exporter en tableau/, /Du moins cher au plus cher au kilomètre/i] },
  suppr:{ ouvre:"(()=>{const l={id:'vtest',nom:'Camion test',type:'vehicule',tech:''};LIEUX.push(l);VEHICULES.push({id:'vehT',plaque:'ZZ-999-ZZ',marque:'Test',modele:'',km:0,conducteur:'',lieu:'vtest',statut:'service',energie:'Gazole',assur:{cie:'',contrat:'—',fin:null},ct:null,entretien:{km:15000,date:AUJ,lib:'Révision'},materiel:{fait:null,ok:[]},frais:[],interv:{km:15000,mois:12},hist:[],anc:[],docs:{},immoHist:[],incidents:[],pleins:[],alertes:{},releves:[]});vxSupprPanel('vehT')})()", h2:'Supprimer ce véhicule ?', q:[], gros:['Oui, supprimer ce véhicule', 'Le garder'], champs:0, rouge:['Oui, supprimer ce véhicule'], aussi:[/Passer hors service/] },
  suppr2:{ ouvre:"vxSupprPanel('veh4')", h2:'Supprimer ce véhicule ?', q:[], gros:['Le garder'], champs:0, aussi:[/contient encore \d+ articles?\. Vide-le d’abord/] }
};
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;
(async () => {
  for (const profil of PROFILS) for (const nuit of NUITS) {
    const nom = profil + (nuit ? ' nuit' : ' jour'), pr = L.PROFILS[profil]; let n = 0;
    const c = await L.ouvrir({ profil, qui:'marc', nuit:!!nuit, calme:true }); await L.aller(c.p, 'vehicules');
    for (const [k, S] of Object.entries(F)) {
      if (SEULES && !SEULES.includes(k)) continue;
      const e = await c.p.evaluate(code => { try { fermerPanneau(); (0, eval)(code); return null; } catch (x) { return String(x); } }, S.ouvre); await L.calme(c.p, 450);
      const m = await c.p.evaluate(() => { const p = document.querySelector('#calque .panneau'); if (!p) return null; const pr = p.getBoundingClientRect();
        const vis = x => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !x.closest('[hidden]') && !x.closest('details:not([open])') && getComputedStyle(x).visibility !== 'hidden'; };
        const lab = [...p.querySelectorAll('label.champ, .vh-q > b')].filter(vis).map(l => (l.firstElementChild && l.firstElementChild.tagName === 'SPAN' ? l.firstElementChild.textContent : l.childNodes[0] ? l.childNodes[0].textContent : '').replace(/\s+/g, ' ').trim() || l.textContent.replace(/\s+/g, ' ').trim());
        const champs = [...p.querySelectorAll('input:not([type=hidden]):not([type=file]):not([type=checkbox]),select,textarea')].filter(vis);
        const cibles = [...p.querySelectorAll('button, summary, label.btn, label.vh-mat-l, select, input:not([type=hidden]):not([type=file]):not([type=checkbox])')].filter(vis).filter(b => !b.matches('.x')).map(b => { const r = b.getBoundingClientRect(); return { t:(b.textContent || b.id || '').trim().slice(0, 40), h:Math.round(r.height), w:Math.round(r.width) }; });
        const gros = [...p.querySelectorAll('.btn.large')].filter(vis).map(b => ({ t:b.textContent.trim(), bas:Math.round(b.getBoundingClientRect().bottom), haut:Math.round(b.getBoundingClientRect().top) }));
        const choix = [...p.querySelectorAll('.puce-c')].filter(vis).map(b => b.textContent.replace(/\s+/g, ' ').trim());
        const rouges = [...p.querySelectorAll('.btn.rouge')].filter(vis).map(b => b.textContent.trim());
        const tailles = champs.filter(x => x.matches('input,select,textarea')).map(x => parseFloat(getComputedStyle(x).fontSize));
        const sorti = [...p.querySelectorAll('*')].filter(vis).filter(x => { const r = x.getBoundingClientRect(); return r.right > pr.right + 1 || r.left < pr.left - 1; }).map(x => (x.className || x.tagName).toString().slice(0, 30));
        const x = p.querySelector('.x'); const txt = p.innerText.replace((x && x.innerText) || '\u0000', '');
        return { h2:(p.querySelector('h2') || {}).textContent, txt, lab, nChamps:champs.length, cibles, gros, choix, rouges, tailles, sorti, sw:p.scrollWidth, cw:p.clientWidth, pw:Math.round(pr.width), retour:!!p.querySelector('.vh-ret'), repli:[...p.querySelectorAll('details > summary')].map(s => s.textContent.trim()), interrupteurs:p.querySelectorAll('.vh-sw').length, lignes:[...p.querySelectorAll('.vh-mat-l')].map(l => Math.round(l.getBoundingClientRect().height)), fenetre:innerHeight }; });
      const t = (s) => nom + ' · ' + k + ' : ' + s;
      if (e || !m) { v(t('la feuille s\'ouvre' + (e ? ' (' + e + ')' : '')), false, e); continue; }
      n++;
      v(t('le titre est « ' + (S.h2.source || S.h2) + ' »'), S.h2 instanceof RegExp ? S.h2.test(m.h2.trim()) : m.h2.replace(/\s+/g, ' ').trim() === S.h2.replace(/\s+/g, ' '), m.h2);   /* la typographie met une espace insécable avant « ? » et « : » */
      const manque = S.q.filter(q => !m.lab.some(l => q.test(l))); v(t('chaque question est posée avec ses mots (' + S.q.length + ')'), manque.length === 0, { manque:manque.map(String), lab:m.lab });
      v(t('au plus six champs visibles à l\'ouverture (' + m.nChamps + ')'), m.nChamps <= 6 && (S.champs == null || m.nChamps === S.champs), { n:m.nChamps, attendu:S.champs });
      v(t('les gros boutons sont ' + JSON.stringify(S.gros)), JSON.stringify(m.gros.map(g => g.t)) === JSON.stringify(S.gros), m.gros.map(g => g.t));
      if (S.gros.length) v(t('le gros bouton est visible SANS défiler (bas ' + m.gros[0].bas + ' ≤ fenêtre ' + m.fenetre + ')'), m.gros.every(g => g.bas <= m.fenetre + 1 && g.haut >= 0), m.gros);
      if (S.retour != null) v(t('« ‹ Retour à la fiche » ' + (S.retour ? 'est là' : 'n\'est pas là')), /‹ Retour à la fiche/.test(m.txt) === S.retour, { retour:m.retour });
      if (S.choix) { const man = S.choix.filter(x => !m.choix.some(c => c.endsWith(x))); v(t('les réponses se touchent : ' + S.choix.join(' · ')), man.length === 0, { man, choix:m.choix }); }
      for (const a of S.aussi || []) v(t('la feuille dit ' + a), a.test(m.txt.replace(/\s+/g, ' ')), m.txt.slice(0, 400));
      if (S.repli) v(t('« ' + S.repli + ' » est un repli fermé (pas de champ de plus à l\'ouverture)'), m.repli.includes(S.repli), m.repli);
      if (S.rouge) v(t('le bouton rouge est ' + S.rouge.join(', ')), JSON.stringify(m.rouges) === JSON.stringify(S.rouge), m.rouges);
      if (S.interrupteurs) v(t('huit interrupteurs, chacun sur une ligne de 44 px et plus (' + m.lignes + ' lignes mesurées)'), m.interrupteurs === S.interrupteurs && m.lignes.length === S.lignes && m.lignes.every(h => h >= 44), m.lignes);
      v(t('aucun émoji dans la feuille'), !EMOJI.test(m.txt), m.txt.match(EMOJI));
      const seuil = pr.doigt ? 44 : 40, petites = m.cibles.filter(x => x.h < seuil - 0.5);
      v(t('cibles : ' + m.cibles.length + ' contrôles, aucun sous ' + seuil + ' px de haut'), m.cibles.length > 0 ? petites.length === 0 : S.gros.length === 0 && /cout|suppr/.test(k) ? true : false, petites.slice(0, 5));
      v(t('champs à 16 px et plus (' + m.tailles.length + ' mesurés)'), m.tailles.length === S.champs ? m.tailles.every(s => s >= 16) : m.tailles.every(s => s >= 16), m.tailles);
      v(t('aucun débordement latéral (largeur posée ' + pr.w + ', panneau ' + m.pw + ', défile à ' + m.sw + ')'), m.sw <= m.cw + 1 && m.pw <= pr.w && m.sorti.length === 0, { sw:m.sw, cw:m.cw, sorti:m.sorti.slice(0, 4) });
    }
    v(nom + ' · population : ' + n + ' feuilles mesurées', SEULES ? n >= 1 : n === Object.keys(F).length, n);
    if (c.err.length) console.log(c.err.slice(0, 3)); v(nom + ' · zéro erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c); }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0); })();

// Véhicules, étape 4 — LES GESTES des feuilles, comptés au toucher et vérifiés dans les DONNÉES (VEHICULES-TEMPS.md § 3.5, § 5.1 : tâches 6, 7, 10 et les écritures) :
// A · ajouter un véhicule (2 touchers, quatre champs, conducteur pris dans l'ÉQUIPE réelle — Julie y est —, dotation selon le MÉTIER, « il lui manque l'assurance… » vrai dans « À faire »),
// B · un plein (le dernier véhicule, quatre natures, « Mon argent » → note de frais, le compteur proposé ne fait pas un relevé de plus), C · le technicien : son camion fixé, un souci en quatre choix,
// D · la prochaine échéance se dit en une phrase qui suit la date, E · le compteur (les deux messages exacts), F · changer de conducteur, G · hors service et supprimer (avec « Annuler »),
// H · un accident, I · le chiffre « dépensés » ouvre le coût en 1 toucher, J · « Cette dépense », K · le matériel (« Il manque quelque chose », « Les commander »), L · le bureau n'a ni hors service ni suppression.
// PROFILS=mac,iphone SEULS=A,B pour restreindre. ⛔ 127.0.0.1 seulement, un navigateur à la fois.
const L = require('../lib.js'), v = L.v;
const PROFILS = (process.env.PROFILS || 'mac,iphone').split(',');
const SEULS = process.env.SEULS ? process.env.SEULS.split(',') : null, on = x => !SEULS || SEULS.includes(x);
const ev = (c, f, a) => c.p.evaluate(f, a);
let touches = 0;
const toucher = async (c, sel) => { const ok = await L.toucher(c, sel); if (ok) touches++; return ok; };
const aller = async (c, h) => { await L.aller(c.p, h); };
const toast = c => ev(c, () => (document.getElementById('toast') || {}).textContent || '');
const panneau = c => ev(c, () => { const p = document.querySelector('#calque .panneau'); return p ? { h2:((p.querySelector('h2') || {}).textContent || '').trim(), txt:(p.innerText || '').replace(/\s+/g, ' ') } : null; });
const saisir = (c, id, val) => ev(c, a => { const i = document.getElementById(a[0]); i.value = a[1]; i.dispatchEvent(new Event('input', { bubbles:true })); i.dispatchEvent(new Event('change', { bubbles:true })); }, [id, val]);
const ligne = (c, id) => ev(c, i => { const l = [...document.querySelectorAll('.vh-liste .vh-l')].find(x => x.querySelector(`[data-vh="fiche|${i}"]`)); return l ? { pastille:(l.querySelector('.vh-et .st') || {}).textContent, prec:(l.querySelector('.vh-prec') || {}).textContent, geste:(l.querySelector('.btn') || {}).textContent || '' } : null; }, id);
const annuler = async c => { const ok = await ev(c, () => { const b = [...document.querySelectorAll('#toast button')].find(b => /Annuler/.test(b.textContent)); if (b) b.click(); return !!b; }); v('le toast porte « Annuler »', ok, null); await L.calme(c.p, 400); };

(async () => {
  for (const profil of PROFILS) {
    const nom = profil;
    if (on('A')) {
      const c = await L.ouvrir({ profil, qui:'marc', calme:true }); await aller(c, 'vehicules');
      const n0 = await ev(c, () => ({ v:VEHICULES.length, l:LIEUX.length, k:document.querySelectorAll('.vh-k .kpi')[1].innerText.replace(/\s+/g, ' ').trim() }));
      touches = 0; await toucher(c, '[data-vh="nouveau"]'); await L.calme(c.p, 450); const p = await panneau(c);
      v(nom + ' · nouveau : la feuille « Nouveau véhicule » s\'ouvre (1 toucher)', !!p && p.h2 === 'Nouveau véhicule' && touches === 1, p && p.h2);
      const opts = await ev(c, () => [...document.querySelectorAll('#vn-c option')].map(o => o.textContent));
      v(nom + ' · nouveau : « Qui le conduit ? » vient de l\'ÉQUIPE réelle (Julie Petit y est, plus le tableau figé) et propose « Personne pour l\'instant »', opts.length === 7 && opts.includes('Julie Petit') && opts[0] === 'Personne pour l’instant', opts);
      await ev(c, () => { document.getElementById('vn-p').value = 'GH-482-KL'; document.getElementById('vn-mq').value = 'Renault'; });
      await toucher(c, '#calque [data-vx="creerok"]'); await L.calme(c.p, 300); const dbl = await toast(c);
      v(nom + ' · nouveau : une plaque déjà dans la liste est refusée (rien n\'est ajouté)', /déjà dans la liste/.test(dbl) && await ev(c, n => VEHICULES.length === n, n0.v), dbl);
      await ev(c, () => { document.getElementById('vn-p').value = 'ab 777 cd'; document.getElementById('vn-md').value = 'Master L3H2'; document.getElementById('vn-c').value = 'julie'; document.getElementById('vn-k').value = '45 000'; });
      await toucher(c, '[data-vh="choix|vn-en|Électrique"]');
      v(nom + ' · nouveau : « Électrique ou hybride » est choisi au toucher (le champ caché le sait, la pastille est pressée)', await ev(c, () => document.getElementById('vn-en').value === 'Électrique' && document.querySelector('[data-vh="choix|vn-en|Électrique"]').getAttribute('aria-pressed') === 'true' && document.querySelector('[data-vh="choix|vn-en|Gazole"]').getAttribute('aria-pressed') === 'false'), null);
      await ev(c, () => { PACKS_ENT.unshift('plomberie'); }); touches = 1;
      await toucher(c, '#calque [data-vx="creerok"]'); await L.calme(c.p, 500);
      const nv = await ev(c, () => { const x = VEHICULES.find(o => o.plaque === 'AB-777-CD'); const l = x && LIEUX.find(o => o.id === x.lieu); PACKS_ENT.shift(); return x ? { plaque:x.plaque, marque:x.marque, modele:x.modele, km:x.km, cond:x.conducteur, en:x.energie, interv:x.interv, dot:l && l.dot, lieu:l && l.nom, tech:l && l.tech, nbV:VEHICULES.length, nbL:LIEUX.length } : null; });
      v(nom + ' · nouveau : le véhicule est écrit (plaque mise en forme, modèle, 45 000 km, Julie, électrique) en 2 touchers', !!nv && nv.marque === 'Renault' && nv.modele === 'Master L3H2' && nv.km === 45000 && nv.cond === 'julie' && nv.en === 'Électrique' && touches === 2, { nv, touches });
      v(nom + ' · nouveau : révision proposée tous les 15 000 km ou 12 mois', !!nv && nv.interv.km === 15000 && nv.interv.mois === 12, nv && nv.interv);
      v(nom + ' · nouveau : le camion « ' + (nv && nv.lieu) + ' » est créé dans Dépôts et camions, sa dotation SUIT LE MÉTIER (plomberie → « plomb », jamais « clim » en dur)', !!nv && nv.lieu === 'Camion de Julie' && nv.dot === 'plomb' && nv.tech === 'julie' && nv.nbL === n0.l + 1, nv);
      const to = await toast(c);
      v(nom + ' · nouveau : le toast dit ce qu\'il manque, et c\'est vrai', /^Véhicule ajouté\. Il lui manque l’assurance et le contrôle technique : ils apparaîtront dans « À faire »\.Annuler/.test(to.replace(/\s/g, ' ')), to);
      const lg = await ligne(c, 'veh5'), k1 = await ev(c, () => document.querySelectorAll('.vh-k .kpi')[1].innerText.replace(/\s+/g, ' ').trim());
      v(nom + ' · nouveau : la rangée neuve est « À faire » (assurance et contrôle technique pas renseignés) avec « Renseigner », et le chiffre « à faire » monte (' + n0.k + ' → ' + k1 + ')', !!lg && lg.pastille === 'À faire' && lg.geste === 'Renseigner' && /L’assurance et le contrôle technique ne sont pas encore renseignés/.test(lg.prec) && parseInt(k1) === parseInt(n0.k) + 1, { lg, k1 });
      await toucher(c, '#toast button'); await L.calme(c.p, 500);  // « Voir le véhicule » ou « Annuler » (le premier bouton du toast est « Annuler » : on le rejoue à la main)
      const fiche = await ev(c, () => !!document.querySelector('.vh-fiche-id')); if (!fiche) { await ev(c, () => { rendre(); }); }
      await ev(c, () => { fermerPanneau(); const x = VEHICULES.find(o => o.plaque === 'AB-777-CD'); if (x) { rendre(); } });
      const ap = await ev(c, () => ({ v:VEHICULES.length, l:LIEUX.length })); v(nom + ' · nouveau : le toast porte « Annuler » (le premier bouton) : le véhicule ET son camion partent', ap.v === n0.v && ap.l === n0.l, ap);
      if (c.err.length) console.log(c.err.slice(0, 3)); v(nom + ' · zéro erreur JavaScript (nouveau véhicule)', c.err.length === 0, c.err.slice(0, 3));
      await L.fin(c);
    }

    if (on('B')) {
      const c = await L.ouvrir({ profil, qui:'marc', calme:true }); await aller(c, 'vehicules');
      const av = await ev(c, () => ({ ach:ACHATS.length, ndf:NDF.length, rel:vehDe('veh3').releves.length, km:vehDe('veh3').km }));
      touches = 0; await toucher(c, '.vh-b-plein'); await L.calme(c.p, 450);
      const sel = await ev(c, () => { const s = document.getElementById('vx-v'); return s ? { val:s.value, tag:s.tagName, km:document.getElementById('vx-km').value } : null; });
      const dernier = await ev(c, () => (VEHICULES.filter(o => o.pleins.length).sort((a, b) => b.pleins.map(p => p.d).sort().pop().localeCompare(a.pleins.map(p => p.d).sort().pop()))[0] || VEHICULES.find(o => o.statut === 'service')).id);
      v(nom + ' · plein : « Noter un plein » préchoisit le véhicule du DERNIER plein noté (' + dernier + ') et propose son compteur', !!sel && sel.val === dernier && sel.km === String(await ev(c, d => vehDe(d).km, dernier)), { sel, dernier });
      await ev(c, () => { const s = document.getElementById('vx-v'); s.value = 'veh3'; s.dispatchEvent(new Event('change', { bubbles:true })); });
      const km3 = await ev(c, () => document.getElementById('vx-km').value);
      v(nom + ' · plein : changer de véhicule remet son compteur (' + km3 + ')', km3 === String(av.km), km3);
      await toucher(c, '[data-vh="choix|vx-t|Péage, parking"]');
      v(nom + ' · plein : « Péage ou parking » masque les litres (une dépense sans litres)', await ev(c, () => document.getElementById('vx-lit-b').style.display === 'none'), null);
      await toucher(c, '[data-vh="choix|vx-t|Carburant"]');
      await saisir(c, 'vx-m', '84,60'); await saisir(c, 'vx-l', '49');
      v(nom + ' · plein : le prix au litre se calcule sous le champ (1,73 €)', /1,73/.test(await ev(c, () => document.getElementById('vx-pl').textContent)), await ev(c, () => document.getElementById('vx-pl').textContent));
      await toucher(c, '[data-vh="choix|vx-pay|Poche"]');
      v(nom + ' · plein : « Mon argent » annonce la note de frais « à valider »', await ev(c, () => !document.getElementById('vx-pay-n').hidden && /note de frais/.test(document.getElementById('vx-pay-n').textContent)), null);
      await toucher(c, '#calque [data-vx="pleinok"]'); await L.calme(c.p, 500);
      const ap = await ev(c, () => { const n = NDF[0]; return { ach:ACHATS.length, ndf:NDF.length, n:n && { objet:n.objet, ttc:n.ttc, etat:n.etat, veh:n.veh }, rel:vehDe('veh3').releves.length, pl:vehDe('veh3').pleins.length }; });
      v(nom + ' · plein : « Mon argent » écrit une NOTE DE FRAIS « à valider » (pas d\'achat), le compteur laissé tel quel ne fait pas un relevé de plus', ap.ach === av.ach && ap.ndf === av.ndf + 1 && ap.n.etat === 'attente' && ap.n.ttc === 84.6 && ap.n.veh === 'veh3' && ap.rel === av.rel, { av, ap });
      const to = await toast(c); v(nom + ' · plein : le toast le dit (note de frais à valider) et porte « Annuler »', /note de frais à valider/.test(to) && /Annuler/.test(to), to);
      await annuler(c); v(nom + ' · plein : « Annuler » retire la note de frais', await ev(c, n => NDF.length === n, av.ndf), null);
      /* la recharge d'un véhicule électrique : kWh */
      await ev(c, () => { vxPleinPanel('veh4'); }); await L.calme(c.p, 400);
      const el = await ev(c, () => ({ t:document.getElementById('vx-t').value, l:document.getElementById('vx-lit-l').textContent, p:document.getElementById('vx-pl-l').textContent }));
      v(nom + ' · plein : un véhicule électrique propose « Recharge » et dit kWh', el.t === 'Recharge électrique' && el.l === 'kWh' && el.p === 'kWh', el);
      await toucher(c, '[data-vh="montrer|vx-dd"]'); v(nom + ' · plein : « Un autre jour » montre la date (aujourd\'hui par défaut)', await ev(c, () => !document.getElementById('vx-dd').hidden && document.getElementById('vx-d').value === AUJ), null);
      if (c.err.length) console.log(c.err.slice(0, 3)); v(nom + ' · zéro erreur JavaScript (plein)', c.err.length === 0, c.err.slice(0, 3));
      await L.fin(c);
    }

    if (on('C')) {
      const c = await L.ouvrir({ profil, qui:'sm', calme:true }); await aller(c, 'majournee');
      await ev(c, () => { vxPleinPanel('veh1'); }); await L.calme(c.p, 450);
      const t = await ev(c, () => { const p = document.querySelector('#calque .panneau'); return { sel:!!document.querySelector('select#vx-v'), cache:document.querySelector('input#vx-v') && document.querySelector('input#vx-v').type, sur:(p.querySelector('.surtitre') || {}).textContent }; });
      v(nom + ' · technicienne : le plein est sur SON camion (pas de liste de véhicules), le surtitre le dit', !t.sel && t.cache === 'hidden' && /Trafic/.test(t.sur) && /GH-482-KL/.test(t.sur), t);
      await ev(c, () => { fermerPanneau(); vxSouciPanel('veh1'); }); await L.calme(c.p, 450);
      const nT = await ev(c, () => TACHES.length);
      await toucher(c, '#calque [data-vx^="soucisok|"]'); await L.calme(c.p, 300);
      v(nom + ' · souci : sans choix, « Prévenir le bureau » demande de dire ce qui ne va pas et n\'écrit RIEN', /Dis ce qui ne va pas/.test(await ev(c, () => (document.getElementById('vx-al') || {}).textContent || '')) && await ev(c, n => TACHES.length === n && !vehDe('veh1').souci, nT), null);
      await toucher(c, '[data-vh="choix|vx-st|Pneu"]'); await saisir(c, 'vx-sx', 'crevaison sur la rocade');
      touches = 1; await toucher(c, '#calque [data-vx^="soucisok|"]'); await L.calme(c.p, 500);
      const s = await ev(c, () => { const t = TACHES.find(x => /Camion GH-482-KL/.test(x.t) && x.urgent); return { souci:vehDe('veh1').souci && { type:vehDe('veh1').souci.type, txt:vehDe('veh1').souci.txt }, t:t && t.t, notif:NOTIFS.some(n => /signale un souci sur le camion GH-482-KL/.test(n.txt || n.t || n.texte || JSON.stringify(n))) }; });
      v(nom + ' · souci : « Un pneu » + un mot → le souci est noté, une tâche URGENTE pour le gérant, la cloche prévenue', !!s.souci && s.souci.type === 'Pneu' && s.souci.txt === 'crevaison sur la rocade' && /pneu/.test(s.t) && s.notif, s);
      if (c.err.length) console.log(c.err.slice(0, 3)); v(nom + ' · zéro erreur JavaScript (technicienne)', c.err.length === 0, c.err.slice(0, 3));
      await L.fin(c);
    }

    if (on('D')) {
      const c = await L.ouvrir({ profil, qui:'marc', calme:true }); await aller(c, 'vehicules');
      await ev(c, () => { vxFaitPanel('veh2', 'ct', 'fiche'); }); await L.calme(c.p, 450);
      const ph = async () => (await ev(c, () => (document.getElementById('vx-pr') || {}).textContent || '')).replace(/\s/g, ' ');   /* la typographie met des espaces insécables dans « 68 210 » et avant « ? » */
      const p0 = await ph(); v(nom + ' · contrôle : la phrase dit le prochain contrôle (deux ans après) et le champ est replié', /Prochain contrôle : le 31 octobre 2028 \(deux ans après\)\. Remplace par la date écrite sur le rapport si elle est différente\./.test(p0) && await ev(c, () => document.getElementById('vx-nx').hidden), p0);
      await saisir(c, 'vx-fd', '2026-09-10'); const p1 = await ph(); v(nom + ' · contrôle : changer la date du jour fait suivre la phrase (10 septembre 2028)', /10 septembre 2028/.test(p1), p1);
      await toucher(c, '[data-vh="montrer|vx-nx"]'); await saisir(c, 'vx-nd', '2028-12-01'); const p2 = await ph();
      v(nom + ' · contrôle : « Changer la date » montre le champ ; la date retapée fait suivre la phrase (1er décembre 2028)', /1er décembre 2028/.test(p2) && await ev(c, () => !document.getElementById('vx-nx').hidden), p2);
      await ev(c, () => { vxFaitPanel('veh1', 'entretien', 'fiche'); }); await L.calme(c.p, 400); const pr = await ph();
      v(nom + ' · révision : la phrase dit les kilomètres et la date, et renvoie à « Modifier la fiche » pour l\'intervalle', /^Prochaine révision : à 68 210 km ou le 31 octobre 2027 \(tous les 20 000 km ou 12 mois, réglable dans « Modifier la fiche »\)\.$/.test(pr), pr);
      /* le compteur : les deux messages exacts */
      await ev(c, () => { fermerPanneau(); vxKmPanel('veh1', 'fiche'); }); await L.calme(c.p, 400);
      await saisir(c, 'vx-nkm', '40000'); await toucher(c, '#calque [data-vx^="kmok|"]'); await L.calme(c.p, 300);
      const bas = (await ev(c, () => (document.getElementById('vx-al') || {}).textContent || '')).replace(/\s/g, ' ');
      v(nom + ' · compteur : plus bas → « Le compteur ne peut pas être plus bas que 48 210 km (relevé le 6 octobre). » et rien n\'est écrit', /Le compteur ne peut pas être plus bas que 48 210 km \(relevé le 6 octobre\)\./.test(bas) && await ev(c, () => vehDe('veh1').km === 48210), bas);
      await saisir(c, 'vx-nkm', '52600'); await toucher(c, '#calque [data-vx^="kmok|"]'); await L.calme(c.p, 300);
      const saut = await ev(c, () => ({ t:((document.getElementById('vx-al') || {}).textContent || '').replace(/\s/g, ' '), b:[...document.querySelectorAll('#vx-al button')].map(b => b.textContent.trim()) }));
      v(nom + ' · compteur : un saut de plus de 3 000 km → « 52 600 km ? Il y a 4 390 km depuis le 6 octobre. » avec « Je corrige » et « Oui, c\'est bien ça »', /52 600 km \? Il y a 4 390 km depuis le 6 octobre\./.test(saut.t) && JSON.stringify(saut.b) === JSON.stringify(['Je corrige', 'Oui, c’est bien ça']), saut);
      await toucher(c, '#vx-al [data-vx="kmnon"]'); v(nom + ' · compteur : « Je corrige » vide l\'alerte et rend la main au champ', await ev(c, () => !(document.getElementById('vx-al') || {}).textContent.trim() && document.activeElement && document.activeElement.id === 'vx-nkm'), null);
      await toucher(c, '#calque [data-vx^="kmok|"]'); await L.calme(c.p, 300); await toucher(c, '#vx-al [data-vx$="|force"]'); await L.calme(c.p, 500);
      v(nom + ' · compteur : « Oui, c\'est bien ça » écrit 52 600 km', await ev(c, () => vehDe('veh1').km === 52600 && vehDe('veh1').releves[vehDe('veh1').releves.length - 1].km === 52600), null);
      if (c.err.length) console.log(c.err.slice(0, 3)); v(nom + ' · zéro erreur JavaScript (échéance, compteur)', c.err.length === 0, c.err.slice(0, 3));
      await L.fin(c);
    }

    if (on('E')) {
      const c = await L.ouvrir({ profil, qui:'marc', calme:true }); await aller(c, 'vehicules');
      await ev(c, () => { vehFiche('veh1'); }); await L.calme(c.p, 500);
      /* § 5.1 tâche 7 : changer de conducteur */
      touches = 1; await toucher(c, '#calque [data-vh="cond|veh1"]'); await L.calme(c.p, 400); const p = await panneau(c);
      v(nom + ' · conducteur : « Changer de conducteur » ouvre la feuille (qui ? à partir du)', !!p && p.h2 === 'Changer de conducteur' && /Qui \?/.test(p.txt), p && p.h2);
      await toucher(c, '#calque [data-vx^="condok|"]'); await L.calme(c.p, 300); touches--;   /* ce toucher-là n'écrit rien : il ne compte pas dans le geste */
      v(nom + ' · conducteur : sans personne choisie, « Enregistrer » le dit et n\'écrit rien', /Choisis la personne qui conduit/.test(await toast(c)) && await ev(c, () => vehDe('veh1').conducteur === 'sm'), await toast(c));
      await toucher(c, '[data-vh="choix|vx-cc|lr"]'); await toucher(c, '#calque [data-vx^="condok|"]'); await L.calme(c.p, 500);
      const r = await ev(c, () => { const x = vehDe('veh1'), l = lieu(x.lieu); return { c:x.conducteur, anc:x.anc[0] && x.anc[0].qui, tech:l.tech, nom:l.nom, notif:NOTIFS.some(n => /Tu conduis maintenant/.test(JSON.stringify(n))) }; });
      v(nom + ' · conducteur : ' + touches + ' touchers (fiche, « Changer de conducteur », la personne, « Enregistrer ») — Léa conduit, Sophie est gardée dans l\'historique, le stock du camion suit, Léa est prévenue', r.c === 'lr' && r.anc === 'sm' && r.tech === 'lr' && /Léa/.test(r.nom) && r.notif && touches === 4, { r, touches });
      await annuler(c); v(nom + ' · conducteur : « Annuler » rend le camion à Sophie', await ev(c, () => vehDe('veh1').conducteur === 'sm' && lieu(vehDe('veh1').lieu).tech === 'sm'), null);
      /* K : modifier la fiche — la date n'apparaît que si le conducteur change */
      await ev(c, () => { fermerPanneau(); vxModifPanel('veh1'); }); await L.calme(c.p, 400);
      v(nom + ' · modifier : « À partir du » est caché tant que le conducteur ne change pas', await ev(c, () => document.getElementById('vx-cdb').hidden), null);
      await ev(c, () => { const s = document.getElementById('vx-cc'); s.value = 'kb'; s.dispatchEvent(new Event('change', { bubbles:true })); }); v(nom + ' · modifier : il paraît dès qu\'on change de conducteur', await ev(c, () => !document.getElementById('vx-cdb').hidden), null);
      /* G : hors service, supprimer */
      await ev(c, () => { fermerPanneau(); vxModifPanel('veh2'); }); await L.calme(c.p, 400);
      await toucher(c, '#calque [data-vh="hs|veh2"]'); await L.calme(c.p, 500);
      const hs = await ev(c, () => ({ st:vehDe('veh2').statut, ligne:(document.querySelector('.vh-fiche-id') ? document.querySelector('#calque .panneau').innerText : '').replace(/\s+/g, ' ').slice(0, 220) }));
      v(nom + ' · hors service : « Passer hors service » (dans Modifier la fiche, seul endroit) met le véhicule hors service ; la fiche le dit', hs.st === 'hs' && /Ce véhicule est hors service/.test(hs.ligne), hs);
      await annuler(c); v(nom + ' · hors service : « Annuler » le remet en service', await ev(c, () => vehDe('veh2').statut === 'service'), null);
      await ev(c, () => { fermerPanneau(); vxModifPanel('veh1'); }); await L.calme(c.p, 400);
      v(nom + ' · supprimer : le camion qui a du stock REFUSE la suppression (la feuille explique, pas de bouton rouge)', await ev(c, () => { vxSupprPanel('veh1'); const p = document.querySelector('#calque .panneau'); return /contient encore \d+ articles?/.test(p.innerText) && !p.querySelector('.btn.rouge'); }), null);
      await ev(c, () => { fermerPanneau(); const l = { id:'vtest', nom:'Camion test', type:'vehicule', tech:'' }; LIEUX.push(l); VEHICULES.push({ id:'vehT', plaque:'ZZ-999-ZZ', marque:'Test', modele:'', km:0, conducteur:'', lieu:'vtest', statut:'service', energie:'Gazole', assur:{ cie:'', contrat:'—', fin:null }, ct:null, entretien:{ km:15000, date:AUJ, lib:'Révision' }, materiel:{ fait:null, ok:[] }, frais:[], interv:{ km:15000, mois:12 }, hist:[], anc:[], docs:{}, immoHist:[], incidents:[], pleins:[], alertes:{}, releves:[] }); TACHES.push({ id:'tT', t:'Test', d:AUJ, qui:'marc', cle:'veh-vehT-ct' }); vxSupprPanel('vehT'); }); await L.calme(c.p, 400);
      const n0 = await ev(c, () => ({ v:VEHICULES.length, l:LIEUX.length, t:TACHES.length }));
      await toucher(c, '#calque [data-vh="supprok|vehT"]'); await L.calme(c.p, 500);
      const n1 = await ev(c, () => ({ v:VEHICULES.length, l:LIEUX.length, t:TACHES.length }));
      v(nom + ' · supprimer : sans stock, la confirmation « Oui, supprimer ce véhicule » retire le véhicule, son camion ET sa tâche liée', n1.v === n0.v - 1 && n1.l === n0.l - 1 && n1.t === n0.t - 1, { n0, n1 });
      await annuler(c); const n2 = await ev(c, () => ({ v:VEHICULES.length, l:LIEUX.length, t:TACHES.length })); v(nom + ' · supprimer : « Annuler » rétablit le véhicule, le camion et la tâche', JSON.stringify(n2) === JSON.stringify(n0), n2);
      if (c.err.length) console.log(c.err.slice(0, 3)); v(nom + ' · zéro erreur JavaScript (conducteur, modifier, hors service, supprimer)', c.err.length === 0, c.err.slice(0, 3));
      await L.fin(c);
    }

    if (on('F')) {
      const c = await L.ouvrir({ profil, qui:'marc', calme:true }); await aller(c, 'vehicules');
      /* H : un accident */
      await ev(c, () => { vehFiche('veh3', 'papiers'); }); await L.calme(c.p, 500); touches = 0;
      await toucher(c, '#calque [data-vh="sinistre|veh3"]'); await L.calme(c.p, 400); const p = await panneau(c);
      v(nom + ' · accident : la feuille s\'appelle « Un accident » (le mot « sinistre » a disparu)', !!p && p.h2 === 'Un accident' && !/inistre/i.test(p.txt), p && p.txt.slice(0, 200));
      await saisir(c, 'vx-sl', 'parking du client'); await saisir(c, 'vx-sf', '300');
      await toucher(c, '#calque [data-vx^="sinistreok|"]'); await L.calme(c.p, 500);
      const a = await ev(c, () => { const x = vehDe('veh3'), i = x.incidents[0], t = TACHES.find(o => o.cle === 'vsinistre-' + (i && i.id)); return { k:i && i.k, lieu:i && i.lieu, f:i && i.franchise, t:t && t.t, urgent:t && t.urgent, fr:x.frais.some(l => l[1] === 'Franchise de l’accident' && l[2] === 300), txt:document.querySelector('#calque .panneau').innerText.replace(/\s+/g, ' ') }; });
      v(nom + ' · accident : noté (lieu, franchise 300 €), tâche URGENTE « Déclarer l\'accident à l\'assurance », la franchise rejoint les dépenses ; l\'accident paraît dans Papiers', a.k === 'sinistre' && a.lieu === 'parking du client' && a.f === 300 && /Déclarer l’accident à l’assurance/.test(a.t) && a.urgent && a.fr && /Accident du/.test(a.txt), a);
      /* I : le chiffre « dépensés » ouvre le coût en UN toucher (§ 5.1 tâche 6) */
      await ev(c, () => { fermerPanneau(); rendre(); }); await L.calme(c.p, 400); touches = 0;
      await toucher(c, '.vh-k [data-vh="cout"]'); await L.calme(c.p, 450); const co = await panneau(c);
      v(nom + ' · coût : le chiffre « dépensés » ouvre « Ce que coûtent les véhicules » en 1 toucher', !!co && co.h2 === 'Ce que coûtent les véhicules' && touches === 1, co && co.h2);
      const ordre = await ev(c, () => [...document.querySelectorAll('#calque .vh-rl:not(.vh-rl-sans) .vh-mt')].map(b => parseFloat(b.textContent.replace(',', '.'))));
      v(nom + ' · coût : du moins cher au plus cher au kilomètre (' + ordre.join(' < ') + '), une seule couleur de barre', ordre.length === 4 && ordre.every((x, i) => i === 0 || x >= ordre[i - 1]) && await ev(c, () => new Set([...document.querySelectorAll('#calque .vh-rb i')].map(i => getComputedStyle(i).backgroundColor)).size === 1), ordre);
      await toucher(c, '#calque .vh-rl'); await L.calme(c.p, 500);
      v(nom + ' · coût : toucher une ligne ouvre la fiche du véhicule sur l\'onglet Dépenses', await ev(c, () => !!document.querySelector('.vh-fiche-id') && document.querySelector('.vh-onglets [aria-pressed="true"]').textContent.trim() === 'Dépenses'), null);
      /* J : « Cette dépense » */
      const nF = await ev(c, () => vehDe(document.querySelector('.vh-fiche-id').dataset.vid).frais.length);
      await toucher(c, '#calque .vh-fr[data-vh^="frais|"][data-vh*="|o"]'); await L.calme(c.p, 450); const fr = await panneau(c);
      v(nom + ' · dépense : toucher une ligne ouvre « Cette dépense » (ce que c\'est, date, montant) avec « Enregistrer » et « Supprimer cette dépense »', !!fr && fr.h2 === 'Cette dépense' && /Supprimer cette dépense/.test(fr.txt) && /Enregistrer/.test(fr.txt), fr && fr.txt.slice(0, 200));
      await saisir(c, 'vx-xm', '250'); await toucher(c, '#calque [data-vx^="frmodok|"]'); await L.calme(c.p, 500);
      v(nom + ' · dépense : « Enregistrer » corrige le montant (250 €) et revient à la fiche', await ev(c, () => { const x = vehDe(document.querySelector('.vh-fiche-id').dataset.vid); return x.frais.some(l => l[2] === 250); }) && await ev(c, () => !!document.querySelector('.vh-fiche-id')), null);
      /* K : le matériel */
      await ev(c, () => { fermerPanneau(); vhMatPanel('veh1', 'fiche'); }); await L.calme(c.p, 450);
      await ev(c, () => { VEHICULES.find(x => x.id === 'veh1').materiel.ok = VEH_MATERIEL.slice(); vhMatPanel('veh1', 'fiche'); }); await L.calme(c.p, 300);
      await toucher(c, '#calque [data-vh^="matfait|"]'); await L.calme(c.p, 300);
      v(nom + ' · matériel : « Il manque quelque chose » alors que tout est allumé demande d\'éteindre d\'abord ce qui manque (rien n\'est daté)', /Éteins d’abord/.test(await ev(c, () => (document.getElementById('vx-al') || {}).textContent || '')), null);
      await ev(c, () => { const v1 = VEHICULES.find(x => x.id === 'veh1'); v1.materiel.ok = v1.materiel.ok.filter(x => x !== 'Extincteur'); v1.materiel.fait = null; vhMatPanel('veh1', 'fiche'); }); await L.calme(c.p, 300);
      const nD = await ev(c, () => DEM_ACHAT.length);
      await toucher(c, '#calque [data-vh^="matfait|"]'); await L.calme(c.p, 500);
      const mt = (await toast(c)).replace(/\s/g, ' '); v(nom + ' · matériel : l\'extincteur éteint, « Il manque quelque chose » date le contrôle et DIT ce qui manque (« Il manque : Extincteur. »)', /Il manque : Extincteur\./.test(mt) && await ev(c, () => vehDe('veh1').materiel.fait === AUJ), mt);
      await ev(c, () => { vhMatPanel('veh1', 'fiche'); }); await L.calme(c.p, 300); await toucher(c, '#calque [data-vx^="commander|"]'); await L.calme(c.p, 400);
      v(nom + ' · matériel : « Les commander » crée la demande d\'achat (une de plus, au nom du matériel qui manque)', await ev(c, n => DEM_ACHAT.length === n + 1 && /Extincteur/.test(DEM_ACHAT[DEM_ACHAT.length - 1].quoi), nD), null);
      if (c.err.length) console.log(c.err.slice(0, 3)); v(nom + ' · zéro erreur JavaScript (accident, coût, dépense, matériel)', c.err.length === 0, c.err.slice(0, 3));
      await L.fin(c);
    }

    if (on('G')) {
      /* L : le bureau n'a NI « hors service » NI « supprimer », même un geste forcé à la main */
      const c = await L.ouvrir({ profil, qui:'julie', calme:true }); await aller(c, 'vehicules');
      const av = await ev(c, () => ({ st:vehDe('veh2').statut, n:VEHICULES.length }));
      await ev(c, () => { vhAgir('hs', 'veh2'); vhAgir('suppr', 'veh2'); vhAgir('supprok', 'veh2'); document.dispatchEvent(new CustomEvent('x')); }); await L.calme(c.p, 400);
      v(nom + ' · bureau : « hors service », « supprimer » et sa confirmation forcés à la main n\'écrivent RIEN et n\'ouvrent aucune feuille', await ev(c, a => vehDe('veh2').statut === a.st && VEHICULES.length === a.n && !document.querySelector('#calque .panneau'), av), null);
      await ev(c, () => { vehFiche('veh2'); }); await L.calme(c.p, 400);
      v(nom + ' · bureau : la fiche n\'offre ni « Modifier la fiche » ni donc « Passer hors service » / « Supprimer ce véhicule »', await ev(c, () => !/Modifier la fiche|hors service|Supprimer ce véhicule/i.test(document.querySelector('#calque .panneau').innerText)), null);
      await ev(c, () => { fermerPanneau(); }); await toucher(c, '[data-vh="plein|"]'); await L.calme(c.p, 400);
      v(nom + ' · bureau : « Noter un plein » reste ouvert (il le note pour l\'équipe) avec le choix du véhicule', await ev(c, () => !!document.querySelector('select#vx-v')), null);
      if (c.err.length) console.log(c.err.slice(0, 3)); v(nom + ' · zéro erreur JavaScript (bureau)', c.err.length === 0, c.err.slice(0, 3));
      await L.fin(c);
    }
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0); })();

// RECONTRÔLE ADVERSE des restes de la sécurité, tour 2 (18 novembre 2026) : ce que le relèvement du plafond d'un nom de client (80 → 120) et le filet des bulles (style) ont pu casser À CÔTÉ.
//   A. un nom de 118 signes partout où un client s'écrit (accueil, planning, interventions, devis, factures, tâches, fiche et ses onglets, clients) : rien ne déborde (largeur du profil), aucun texte écrasé ;
//   B. les AUTRES champs de la même fiche (contact, adresse, accès) : même plafond silencieux ? (un contact de 130, une adresse de 170, des consignes d'accès de 210 signes) ;
//   C. une coupe qui tombe au milieu d'un émoji (paire de substituts) laisse-t-elle un signe orphelin ? ;
//   D. le filet des bulles garde la bulle d'avertissement du planning (couleur) et ne laisse rien d'autre.
// Population comptée à chaque contrôle. ⛔ 127.0.0.1 seulement. « N ✓ · M ✗ », sortie 1 si un contrôle tombe. Captures hors dépôt : cap/rec-secu2b/.
const L = require('../lib.js'), fs = require('fs');
const SORTIE = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/rec-secu2b/';
const LONG = 'Syndicat des copropriétaires de la résidence Les Jardins du Port de Rochefort-sur-Mer, représenté par son syndic';
const ECRANS = ['accueil', 'planning', 'interventions', 'devis', 'factures', 'taches', 'clients', 'CLIENT:histo', 'CLIENT:factures', 'CLIENT:infos', 'INTER', 'DEVIS', 'FACTURE'];
(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  for (const [profil, nuit] of (process.env.PROFILS ? JSON.parse(process.env.PROFILS) : [['petit', false], ['iphone', true], ['ipad', false]])) {
    const tag = profil + (nuit ? '-nuit' : '-jour'), c = await L.ouvrir({ profil, nuit, qui: 'marc', attente: 1500 }), p = c.p; p.on('dialog', d => d.accept().catch(() => {}));
    // on nomme LONG le client qui a le plus de choses à son nom : c'est lui qu'on retrouve dans le plus d'écrans
    const info = await p.evaluate(nom => { const cnt = {}; const bump = (k, n) => { if (k && CLIENTS[k]) cnt[k] = (cnt[k] || 0) + n; };
      (typeof INTS !== 'undefined' ? INTS : []).forEach(i => bump(i.cli, 3)); (dvInit(), DV).forEach(d => bump(d.cli, 3)); (typeof FACTURES !== 'undefined' ? FACTURES : []).forEach(f => bump(f.cli, 3)); (typeof TACHES !== 'undefined' ? TACHES : []).forEach(t => bump(t.lien && t.lien.cli, 1));
      const k = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0]; const o = cliNet({ nom, contact: nom, mail: 'syndic@exemple.fr' }); CLIENTS[k].nom = o.nom; CLIENTS[k].contact = o.contact; rendre();
      const i = (typeof INTS !== 'undefined' ? INTS : []).find(x => x.cli === k), dd = DV.find(x => x.cli === k), d = dd ? { id: dvCle(dd) } : null, f = (typeof FACTURES !== 'undefined' ? FACTURES : []).find(x => x.cli === k);
      return { k, n: o.nom.length, liens: cnt[k], i: i && i.id, d: d && d.id, f: f && f.id }; }, LONG);
    L.v(tag + ' : population : un client de ' + info.n + ' signes, relié à ' + info.liens + ' objets, avec intervention/devis/facture', info.n > 80 && info.liens >= 3 && !!info.i && !!info.d && !!info.f, info);
    let vus = 0;
    for (const e of ECRANS) {
      const h = e === 'INTER' ? 'inter-x-' + info.i : e === 'DEVIS' ? 'devis-x-' + info.d : e === 'FACTURE' ? 'facture-x-' + info.f : e.startsWith('CLIENT:') ? 'client-x-' + info.k : e;
      if (e.startsWith('CLIENT:')) await p.evaluate(o => { ongletClient = o; }, e.split(':')[1]);
      await p.evaluate(x => aller(x), h); await L.calme(p, 700);
      const mont = await p.evaluate(nom => ((document.getElementById('contenu') || document.body).textContent || '').includes(nom.slice(0, 60)), LONG);
      const d = await L.deborde(c); if (mont) vus++;
      L.v(tag + ' · ' + e + ' : ne déborde pas de la largeur du profil (' + c.largeur + ' px)' + (mont ? ' — le nom y est lu' : ' — le nom n’y est pas affiché'), !d || !d.deborde, d);
      const dg = await L.doigts(p, '#contenu'); const ec = (dg.ecrases || []).filter(x => /Syndicat|copropri/.test(JSON.stringify(x))); L.v(tag + ' · ' + e + ' : le nom n’est pas écrasé en colonne étroite', ec.length === 0, ec);
      if (profil !== 'ipad' && ['planning', 'interventions', 'devis', 'INTER', 'CLIENT:infos'].includes(e)) await L.capture(c, SORTIE + e.replace(':', '-') + '-' + tag + '.png');
    }
    L.v(tag + ' : population : le nom long est lu dans au moins 8 écrans sur ' + ECRANS.length, vus >= 8, vus);
    if (profil === 'petit') {
      // B. les autres champs de la fiche, par la VRAIE fonction qui enregistre
      const r = await p.evaluate(async k => { await new Promise(r => setTimeout(r, 50)); aller('client-x-' + k); await new Promise(r => setTimeout(r, 500)); ongletClient = 'infos'; rendre(); await new Promise(r => setTimeout(r, 600));
        const mx = q => { const e = document.querySelector('[data-ci="' + q + '"]'); return e ? { present: true, maxlength: e.getAttribute('maxlength') } : { present: false }; };
        const champs = { contact: mx('contact'), adr: mx('adr'), acces: mx('acces'), mail: mx('mail') };
        const set = (q, v) => { const e = document.querySelector('[data-ci="' + q + '"]'); if (e) e.value = v; };
        const ctc = 'Madame Marie-Hélène de la Tour-d’Auvergne-Lorraine, gestionnaire du syndic, assistée de Monsieur Jean-Baptiste Dupont-Delacroix, adjoint (130 signes)', adr = '12 rue des Marins d’Aunis, résidence Les Jardins du Port, bâtiment C, escalier 3, 4e étage, porte gauche, digicode 1234A puis interphone Dupont, 17300 Rochefort-sur-Mer', acc = 'Sonner à l’interphone Dupont, attendre le gardien, passer par la cour intérieure, escalier de service à droite après le local à vélos, badge à retirer à la loge avant 17 h, code du portail 4821B, ne pas stationner devant le garage du syndic';
        set('contact', ctc); set('adr', adr); set('acces', acc); const ok = clientEnregistrer(k); const c = CLIENTS[k];
        return { champs, ok, contact: [ctc.length, c.contact.length], adr: [adr.length, c.adr.length], acces: [acc.length, c.acces.length], toast: (document.getElementById('toast') || {}).textContent }; }, info.k);
      console.log('  · autres champs :', JSON.stringify(r));
      L.v('B. (tour 4) population : un contact de 149, une adresse de 168 et des consignes de 240 signes sont REFUSÉS par clientEnregistrer, avec la phrase du plafond (plus de coupe silencieuse)', r.ok === false && /limité à 120 signes/.test(r.toast || ''), r);
      L.v('B. le contact (130 signes) se range entier OU son champ porte un plafond qui empêche d’en taper plus', r.contact[1] === r.contact[0] || r.champs.contact.maxlength, r);
      L.v('B. l’adresse (' + r.adr[0] + ' signes) se range entière OU son champ porte un plafond', r.adr[1] === r.adr[0] || r.champs.adr.maxlength, r);
      L.v('B. les consignes d’accès (' + r.acces[0] + ' signes) se rangent entières OU leur champ porte un plafond', r.acces[1] === r.acces[0] || r.champs.acces.maxlength, r);
      // C. une coupe au milieu d'un émoji
      const s = await p.evaluate(() => { const orph = t => /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(t);
        const nom = 'a'.repeat(119) + '😀 fin', o = cliNet({ nom, contact: nom }), m = mailNom({ de: { nom, mail: 'x@y.fr' } }), d = mlDeNet({ nom, mail: 'x@y.fr' }).nom;
        const inp = document.createElement('input'); inp.maxLength = 120; document.body.appendChild(inp); inp.value = nom; const gardeNav = inp.value.length; inp.remove();
        return { nom: orph(o.nom), contact: orph(o.contact), mail: orph(m), entree: orph(d), longueur: o.nom.length, gardeNav }; });
      console.log('  · coupe au milieu d’un émoji :', JSON.stringify(s));
      L.v('C. une coupe à 120 au milieu d’un émoji ne laisse aucun signe orphelin (nom, contact, expéditeur, entrée du courrier)', !s.nom && !s.contact && !s.mail && !s.entree, s);
      // C2 (tour 5 : le plafond se compte en signes, plus en unités UTF-16). La même coupe par le CLAVIER : on tape 119 « a » puis un émoji dans le vrai champ de la fiche (maxlength 120) et on relit ce que le navigateur a gardé
      await p.evaluate(k => { aller('client-x-' + k); ongletClient = 'infos'; rendre(); }, info.k); await p.waitForTimeout(700);
      const champ = p.locator('[data-ci="nom"]'); await champ.fill(''); await champ.focus(); await p.keyboard.insertText('a'.repeat(119) + '😀 fin');
      const t = await p.evaluate(() => { const v = document.querySelector('[data-ci="nom"]').value; return { n: nbSignes(v), unites: v.length, orphelin: /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(v) }; });
      console.log('  · frappe réelle d’un émoji à la limite :', JSON.stringify(t));
      L.v('C2. taper un émoji à la limite du champ (maxlength 120) ne laisse aucun signe orphelin — le plafond se compte en SIGNES depuis le tour 5 (119 « a » + l’émoji = 120 signes, 121 unités UTF-16 : gardés entiers)', t.n <= 120 && !t.orphelin, t);
      // D. bulles
      const b = await p.evaluate(() => { const dire = h => { toast(h); return document.getElementById('toast').innerHTML; };
        return { orange: dire('<span style="color:var(--orange)">⚠ Chevauche « X » (09:00)</span>'), classe: dire('<b class="ok">x</b> <i>y</i> <small>z</small> <strong>w</strong> <em>v</em><br>u'), onclick: dire('<b onclick="alert(1)" title="t" data-x="1">x</b>') }; });
      L.v('D. la bulle d’avertissement du planning garde sa couleur', /color:\s*var\(--orange\)/.test(b.orange), b.orange);
      L.v('D. gras, italique, saut de ligne et classe passent ; onclick, title et data-* sont retirés', /<b class="ok">/.test(b.classe) && !/onclick|title=|data-x/.test(b.onclick), b);
    }
    const nErr = c.err.filter(e => !/ResizeObserver/.test(e)); L.v(tag + ' : aucune erreur de page', nErr.length === 0, nErr.slice(0, 3));
    await L.fin(c);
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });

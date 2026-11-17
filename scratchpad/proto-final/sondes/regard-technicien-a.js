// CONTRÔLES DURABLES du regard « technicien a » (Ma journée · Mes tâches · Mes congés), un par défaut de mise en page mesurable.
// Rejouable seul : node regard-technicien-a.js [profil …]   → « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
// Chaque contrôle compte sa population avant de conclure (un zéro sur un ensemble vide ne prouve rien).
const L = require('../lib.js');
const profils = process.argv.slice(2).length ? process.argv.slice(2) : ['petit', 'android', 'iphone', 'ipad', 'mac', 'windows'];
(async () => {
  for (const profil of profils) {
    for (const nuit of [false, true]) {
      if (nuit && !['petit', 'iphone'].includes(profil)) continue;   // le fond ne change aucune des mesures : un passage de nuit sur deux profils suffit à le prouver
      const c = await L.ouvrir({ profil, qui: 'sm', nuit }), p = c.p, tag = `${profil}${nuit ? ' nuit' : ''}`;
      const clic = async s => { const ok = await p.evaluate(x => { const e = document.querySelector(x); if (!e) return false; e.click(); return true; }, s); await L.calme(p, 450); return ok; };
      // ── 1. Ma journée sans intervention : « Aucune intervention », jamais « 0 intervention »
      await p.evaluate(() => { window.__i = INTS.splice(0, INTS.length); });
      await L.aller(p, 'majournee');
      const sous = await p.evaluate(() => { const h = document.querySelector('#contenu .tete .gris'); return h ? h.textContent.trim() : null; });
      L.v(`${tag} · Ma journée vide : le sous-titre existe`, sous !== null);
      L.v(`${tag} · Ma journée vide : « Aucune intervention aujourd’hui », pas « 0 intervention »`, !!sous && /^Aucune intervention aujourd’hui/.test(sous) && !/^0 /.test(sous), sous);
      await p.evaluate(() => { INTS.push(...window.__i); });
      await L.aller(p, 'majournee');
      const plein = await p.evaluate(() => { const h = document.querySelector('#contenu .tete .gris'); return h ? h.textContent.trim() : ''; });
      L.v(`${tag} · Ma journée avec ses interventions : « N intervention(s) aujourd’hui »`, /^\d+ interventions? aujourd’hui/.test(plein), plein);
      // ── 2. Mes tâches : chaque état vide dit quoi faire (titre ET phrase), les trois onglets
      const tachesSauve = await p.evaluate(() => { window.__t = TACHES.splice(0, TACHES.length); return window.__t.length; });
      L.v(`${tag} · population : des tâches étaient là avant de vider`, tachesSauve > 0, tachesSauve);
      await L.aller(p, 'taches');
      for (const o of ['auj', 'avenir', 'faites']) {
        await clic(`[data-tonglet=${o}]`);
        const v = await p.evaluate(() => { const e = document.querySelector('#contenu .t-vide'); return e ? { b: (e.querySelector('b') || {}).textContent || '', s: ((e.querySelector('span') || {}).textContent || '').trim() } : null; });
        L.v(`${tag} · Mes tâches › ${o} vide : titre et phrase d’aide`, !!v && v.b.length > 0 && v.s.length > 8, v);
      }
      await p.evaluate(() => { TACHES.push(...window.__t); });
      // ── 3. Mes tâches : trois pastilles de filtre sur UNE ligne (jamais une pastille seule en pleine largeur)
      await L.aller(p, 'taches'); await clic('[data-tonglet=auj]');
      const pil = await p.evaluate(() => [...document.querySelectorAll('#contenu .tkx-pill')].map(e => { const r = e.getBoundingClientRect(); return { y: Math.round(r.top), w: Math.round(r.width), x: Math.round(r.left), d: e.scrollWidth > e.clientWidth + 1 }; }));
      L.v(`${tag} · pastilles de filtre : population = 3`, pil.length === 3, pil.length);
      if (pil.length === 3) {
        const l1 = pil.every(q => Math.abs(q.y - pil[0].y) < 3);
        L.v(`${tag} · pastilles de filtre : sur une seule ligne`, l1, pil);
        const bord = await p.evaluate(() => { const ct = document.getElementById('contenu'), cs = getComputedStyle(ct); return ct.getBoundingClientRect().right - parseFloat(cs.paddingRight); });
        L.v(`${tag} · pastilles de filtre : la dernière ne dépasse pas le bord du contenu (${Math.round(bord)})`, pil[2].x + pil[2].w <= bord + 0.5, pil[2]);
        L.v(`${tag} · pastilles de filtre : aucune coupée`, pil.every(q => !q.d), pil);
        L.v(`${tag} · pastilles de filtre : dans l’écran (largeur du profil ${c.largeur})`, pil.every(q => q.x >= 0 && q.x + q.w <= c.largeur + 1), pil);
      }
      // ── 4. Nouvelle tâche : le texte d’aide du champ « Quoi » ne se coupe pas
      await clic('[data-tnouv]');
      const ph = await p.evaluate(() => { const i = document.getElementById('tk-t'); if (!i) return null; const cs = getComputedStyle(i), cv = document.createElement('canvas').getContext('2d'); cv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
        const w = cv.measureText(i.placeholder).width, dispo = i.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); return { w: Math.round(w), dispo: Math.round(dispo), t: i.placeholder }; });
      L.v(`${tag} · « Quoi » : le champ existe`, ph !== null);
      L.v(`${tag} · « Quoi » : l’exemple tient dans le champ`, !!ph && ph.w <= ph.dispo, ph);
      await L.ranger(p);
      // ── 5. Mes congés : la pastille d’état d’une demande garde sa largeur (ne s’étire pas sur la ligne)
      await L.aller(p, 'absences');
      // « texte » = largeur du TEXTE seul : scrollWidth rendrait la largeur étirée de la pastille elle-même
      const st = await p.evaluate(() => { const d = document.querySelector('#contenu .at-d'); if (!d) return null; const s = d.querySelector('.at-dt > .st'); if (!s) return null; return { carte: Math.round(d.getBoundingClientRect().width), pastille: Math.round(s.getBoundingClientRect().width), texte: (() => { const r = document.createRange(); r.selectNodeContents(s); return Math.round(r.getBoundingClientRect().width); })() }; });
      L.v(`${tag} · Mes congés : une demande en attente existe`, st !== null);
      L.v(`${tag} · Mes congés : la pastille d’état ne s’étire pas (≤ son texte + 40 px)`, !!st && st.pastille <= st.texte + 40, st);
      // ── 6. Mes congés : le mois n’est pas écrit deux fois de suite (un seul bloc), mais chaque mois garde son titre à plusieurs
      for (const [per, attendu] of [['0.5', 1], ['1', 1], ['3', 3]]) {
        await clic(`[data-aper="${per}"]`);
        const t = await p.evaluate(() => { const hs = [...document.querySelectorAll('#contenu .acm-t')]; const vis = hs.filter(h => { const r = h.getBoundingClientRect(); return r.width > 4 && r.height > 4; }); return { total: hs.length, visibles: vis.length, nav: ((document.querySelector('#contenu .ac-nav b') || {}).textContent || '').trim(), premier: hs[0] ? hs[0].textContent.trim() : '' }; });
        L.v(`${tag} · calendrier ${per} : ${attendu} bloc(s) de mois`, t.total === attendu, t);
        if (attendu === 1) L.v(`${tag} · calendrier ${per} : titre du mois non répété sous le sélecteur (« ${t.nav} »)`, t.visibles === 0 && t.premier === t.nav, t);
        else L.v(`${tag} · calendrier ${per} : un titre visible par mois`, t.visibles === attendu, t);
      }
      // ── 7. Mes congés : les en-têtes de jours tiennent dans leur colonne et dans la carte, les noms de jours fériés ne se coupent pas en plein mot (iPad : colonnes de 66 px)
      for (const per of ['0.5', '3']) {
        await clic(`[data-aper="${per}"]`);
        const g = await p.evaluate(() => { const cartes = [...document.querySelectorAll('#contenu .acm')]; let tetes = 0, trop = 0, hors = 0, feries = 0, coupes = 0;
          cartes.forEach(k => { const kr = k.getBoundingClientRect(); k.querySelectorAll('.acm-tete span').forEach(e => { tetes++; if (e.scrollWidth > e.clientWidth + 1) trop++; if (e.getBoundingClientRect().right > kr.right + 1) hors++; });
            k.querySelectorAll('.acm-f').forEach(e => { feries++; const lh = parseFloat(getComputedStyle(e).lineHeight) || 12; if (e.getBoundingClientRect().height > lh * 1.6 || e.scrollWidth > e.clientWidth + 1) coupes++; }); });
          return { cartes: cartes.length, tetes, trop, hors, feries, coupes }; });
        L.v(`${tag} · calendrier ${per} : population (cartes, en-têtes, jours fériés)`, g.cartes > 0 && g.tetes === g.cartes * 7 && g.feries > 0, g);
        L.v(`${tag} · calendrier ${per} : aucun en-tête de jour coupé ni hors de la carte`, g.trop === 0 && g.hors === 0, g);
        L.v(`${tag} · calendrier ${per} : aucun nom de jour férié coupé en plein mot`, g.coupes === 0, g);
      }
      // ── 7 bis. Mes congés : le texte d'une bande d'absence (surtout la demi-journée en attente) tient dans sa bande, jamais « ½ j Au… » coupé
      await clic('[data-aper="3"]');
      const bd = await p.evaluate(() => [...document.querySelectorAll('#contenu .acm-x')].map(b => { const sp = b.querySelector('span'); return { t: (b.textContent || '').trim(), coupe: !!sp && sp.scrollWidth > sp.clientWidth + 1, demi: b.classList.contains('demi') }; }));
      L.v(`${tag} · bandes d'absence : population (dont une demi-journée)`, bd.length >= 3 && bd.some(x => x.demi), bd);
      L.v(`${tag} · bandes d'absence : aucun texte coupé`, bd.every(x => !x.coupe), bd.filter(x => x.coupe));
      // ── 8. Ma journée : l'alerte d'habilitation ne répète pas le mot (« Ton habilitation « Habilitation électrique BR » »)
      const hab = await p.evaluate(() => { const h = eqxCarteMoi({ k: 'kb', habil: [['Habilitation électrique BR', jour(24)], ['CACES R489', jour(-3)]] }); const d = document.createElement('div'); d.innerHTML = h; return [...d.querySelectorAll('.eqx-moi-l b')].map(b => b.textContent.trim()); });
      L.v(`${tag} · alerte d'habilitation : population = 2 lignes`, hab.length === 2, hab);
      L.v(`${tag} · alerte d'habilitation : « Ton habilitation électrique BR se termine dans 24 jours », sans mot répété`, hab[0] === 'Ton habilitation électrique BR se termine dans 24 jours', hab[0]);
      L.v(`${tag} · alerte d'habilitation : un nom sans le mot garde ses guillemets`, /^Ton habilitation « CACES R489 » est expirée depuis 3 jours$/.test(hab[1] || ''), hab[1]);
      L.v(`${tag} · aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
      await L.fin(c);
    }
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

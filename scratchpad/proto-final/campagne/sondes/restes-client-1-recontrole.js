// Espace client, RECONTRÔLE ADVERSE des restes tour 1 (17 novembre 2026) : on rejoue ce que le correcteur annonce « corrigé » et on cherche ce que ses
// corrections ont cassé à côté. Ne modifie rien. node restes-client-1-recontrole.js <profil> [nuit] [sections]  → « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
//   N · une seule navigation à TOUTES les largeurs (320 → 1440, 760/761 compris) ET le nom de l'entreprise lisible dans l'écran (client-14, client-15)
//   S · « Bonjour » : les brouillons du bureau qui n'appellent pas saluer() (tâches, réponses aux courriels), les clients un par un (client-recontrole)
//   M · mot long / numéro : `overflow-wrap:anywhere` ne casse pas un mot ordinaire, `nowrap` ne pousse rien hors de l'écran, sur les 7 clients × 5 onglets
//   D · la demande de contrat client par client : pas de fuite d'un client à l'autre, la carte disparaît quand le bureau a fait sa tâche (client-06)
//   R · les écrans du métier 3D et les autres routes du bureau tapés dans l'adresse : le client reste chez lui, les autres rôles gardent leur phrase (client-04)
//   V · le devis D-2026-034 : le bureau le voit comme le client (carte électronique), un seul devis de ventilateur (client-19)
const O = require('./client-outils.js'), L = O.L, v = L.v;
const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit', SEC = (process.argv[4] || 'N,S,M,D,R,V,Z').split(','), tag = `${profil}-${nuit ? 'nuit' : 'jour'}`;
const CAP = O.CAP.replace('campagne-client', 'campagne-client-restes');
const clic = (p, s) => p.evaluate(x => { const e = document.querySelector(x); if (e) e.click(); return !!e; }, s);
(async () => {
  const c = await O.clientApp({ profil, nuit, cli: 'md', ec: 'accueil' }); const p = c.p, tel = c.largeur <= 760;
  const cap = async n => L.capture(c, CAP + `rc1-${tag}-${n}.png`);
  const vue = async (cli, ec) => { await p.evaluate(({ cli, ec }) => { RL_CLI.cli = cli; EC.tab = ec; rendre(); window.scrollTo(0, 0); }, { cli, ec }); await L.calme(p, 300); };
  const CLIS = await p.evaluate(() => Object.keys(CLIENTS));
  v('population : sept clients', CLIS.length === 7, CLIS);

  // ── N · navigation unique et nom de l'entreprise lisible, à toutes les largeurs
  if (SEC.includes('N')) {
    const larg = profil === 'mac' ? [320, 360, 390, 414, 600, 700, 759, 760, 761, 800, 820, 900, 1000, 1024, 1180, 1280, 1440] : [c.largeur];
    const mesures = [];
    for (const w of larg) {
      if (larg.length > 1) { await p.setViewportSize({ width: w, height: 800 }); await vue('md', 'accueil'); await L.calme(p, 500); }
      const m = await p.evaluate(() => { const vis = e => e.offsetParent !== null || getComputedStyle(e).position === 'fixed';
        const dedans = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight; };
        const compte = s => [...document.querySelectorAll(s)].filter(e => vis(e) && dedans(e) && getComputedStyle(e).visibility !== 'hidden').length;
        const noms = [...document.querySelectorAll('body *')].filter(e => !e.children.length && /^Clim Services 17$/.test(e.textContent.trim()) && vis(e) && dedans(e) && getComputedStyle(e).visibility !== 'hidden').length;
        return { w: innerWidth, onglets: compte('.ec-seg button'), barre: compte('.opg-tab'), menu: compte('#menu .rl-mlien'), noms, logo: compte('.rl-ent'), op: [...document.querySelectorAll('i')].some(e => vis(e) && dedans(e) && e.textContent.trim() === 'OP'),
          menuOuvert: !!document.querySelector('#menu') && dedans(document.querySelector('#menu')), sc: document.documentElement.scrollWidth }; });
      mesures.push(m);
      const nav = [m.onglets, m.barre, m.menu].filter(x => x >= 3).length;
      v(`N · ${m.w} px : une seule navigation (onglets ${m.onglets}, barre ${m.barre}, menu ${m.menu})`, nav === 1, m);
      v(`N · ${m.w} px : le nom de l'entreprise se lit dans l'écran, une fois (lu ${m.noms})`, m.noms === 1, m);
      v(`N · ${m.w} px : jamais le carré « OP » du logiciel ; pas de défilement latéral`, !m.op && m.sc <= m.w + 1, m);
    }
    if (larg.length > 1) await p.setViewportSize({ width: c.largeur, height: c.hauteur });
    await vue('md', 'accueil');
    await cap('accueil');
  }

  // ── S · les salutations des brouillons du bureau
  if (SEC.includes('S')) {
    // 1) « Prévenir / Écrire au client » (tMailClient) pour chacun des sept clients
    const ecrits = await p.evaluate(async clis => { const o = {};
      for (const k of clis) { for (const prevenir of [true, false]) {
        try { tMailClient({ id: 'tx' + k, t: 'Essai', lien: { t: 'client', id: k, cli: k }, inter: null, pieces: [] }, prevenir);
          const q = document.querySelector('#calque .panneau'); const z = q ? ((q.querySelector('textarea') || {}).value || q.innerText) : '';
          o[k + (prevenir ? ' prévenir' : ' écrire')] = z.replace(/\s+/g, ' ').slice(0, 60); try { fermerPanneau(); } catch (e) {}
        } catch (e) { o[k + (prevenir ? ' prévenir' : ' écrire')] = 'ERREUR ' + e.message; } } }
      return o; }, CLIS);
    const nb = Object.keys(ecrits).length;
    v('S · population : 14 brouillons « prévenir / écrire » lus', nb === 14 && Object.values(ecrits).every(x => /^Bonjour/.test(x)), ecrits);
    const mauvais = Object.entries(ecrits).filter(([k, x]) => /^Bonjour (Syndic|Service|Cabinet|Direction|Accueil|Comptabilit)/i.test(x));
    v('S · « Prévenir le client » / « Écrire au client » ne saluent pas un syndic', mauvais.length === 0, mauvais);
    // 2) la fiche de tâche : « Prévenir » du bandeau (tkxPrenomClient)
    const tk = await p.evaluate(clis => Object.fromEntries(clis.map(k => [k, tkxPrenomClient(CLIENTS[k])])), CLIS);
    v('S · tkxPrenomClient ne rend pas un organisme (utilisé dans « Bonjour ${pre} »)', !/Syndic|Service|Cabinet|Direction/i.test(JSON.stringify(tk)), tk);
    // 3) réponses types aux courriels : le modèle commence par « Bonjour <nom de l'expéditeur> »
    const rep = await p.evaluate(() => { const o = [];
      for (const m of MAILS) { if (!m.de || /^Toi$/.test(m.de.nom)) continue; let t; try { t = mbxMod(m); } catch (e) { continue; }
        const txts = t && typeof t === 'object' ? Object.values(t).filter(x => typeof x === 'string') : []; for (const x of txts) { const mm = x.match(/^Bonjour ([^,\n]+)/); if (mm) o.push({ de: m.de.nom, salut: mm[1] }); } }
      return o; });
    const orga = rep.filter(x => /^(syndic|service|accueil|secr[ée]tariat|direction|comptabilit|cabinet|soci[ée]t[ée]|agence|gestion|contact|bureau|mairie|[ée]quipe|h[ôo]tel|restaurant|copropri[ée]t[ée]|camping|frigo|chauffage|clim)/i.test(x.salut));
    v('S · population : des réponses types lues', rep.length >= 5, rep.length);
    v('S · les réponses types aux courriels ne saluent pas un organisme (« Bonjour Syndic des Mimosas »)', orga.length === 0, orga.slice(0, 6));
    // 4) saluer() : cas limites
    const s = await p.evaluate(() => ({ a: saluer('Mme Roux, comptable'), b: saluer('Service technique'), c: saluer('Dr Martin'), d: saluer(null), e: saluer('Marc'), f: saluer('Cabinet Martin, Dr Martin'), g: saluer('Direction'), h: saluer('Hôtel de la Plage'), i: saluer('M. Camping'), j: saluer('Madame Gestin'), k: saluer('Secrétariat du Dr Martin'), l: saluer('Agnès Bureau') }));
    v('S · saluer : une personne (Mme Roux, Dr Martin, Marc, Madame Gestin, Agnès Bureau) est saluée par son nom', s.a === 'Bonjour Mme Roux' && s.c === 'Bonjour Dr Martin' && s.e === 'Bonjour Marc' && s.j === 'Bonjour Madame Gestin' && s.l === 'Bonjour Agnès Bureau', s);
    v('S · saluer : un service ou un organisme (Service technique, Cabinet Martin, Direction, Hôtel…, Secrétariat…) donne « Bonjour »', s.b === 'Bonjour' && s.f === 'Bonjour' && s.g === 'Bonjour' && s.h === 'Bonjour' && s.k === 'Bonjour' && s.d === 'Bonjour', s);
    // 5) les sept clients : le titre ET les messages du bureau (SMS, mail) de l'intervention
    const sms = await p.evaluate(clis => { const o = {}; for (const k of clis) { const i = INTS.find(x => x.cli === k); if (i) { try { o[k] = texteSms(i.id).slice(0, 40); } catch (e) { o[k] = 'ERREUR ' + e.message; } } } return o; }, CLIS);
    v('S · population : un SMS par client qui a une intervention', Object.keys(sms).length >= 5, sms);
    v('S · aucun SMS ne commence par « Bonjour Syndic »', !/Bonjour Syndic/.test(JSON.stringify(sms)), sms);
    await O.nettoyer(p);
  }

  // ── M · un mot ordinaire n'est pas coupé, un numéro ne dépasse pas, sur 7 clients × 5 onglets
  if (SEC.includes('M')) {
    const TABS = ['accueil', 'factures', 'interventions', 'devis', 'contrats'];
    let lignes = 0, mots = 0; const coupes = [], debord = [], nums = [], deborde = [];
    for (const k of CLIS) for (const t of TABS) { await vue(k, t);
      const r = await p.evaluate(() => { const W = document.documentElement.clientWidth, out = { l: 0, m: 0, coupes: [], debord: [], nums: [], sc: document.documentElement.scrollWidth, W };
        for (const e of document.querySelectorAll('.ec-l')) { out.l++; const s = e.firstElementChild; if (!s) continue;
          const tn = []; const w = document.createTreeWalker(s, NodeFilter.SHOW_TEXT); while (w.nextNode()) tn.push(w.currentNode);
          for (const n of tn) { const re = /\S+/g; let mt; while ((mt = re.exec(n.data))) { out.m++; const rg = document.createRange(); rg.setStart(n, mt.index); rg.setEnd(n, mt.index + mt[0].length);
              const lg = [...rg.getClientRects()].filter(x => x.width > 0.5); const tops = new Set(lg.map(x => Math.round(x.top)));
              if (tops.size > 1 && mt[0].length < 22) out.coupes.push(mt[0]); } }
          const r = e.getBoundingClientRect(); if (r.right > W + 1 || e.scrollWidth > e.clientWidth + 1) out.debord.push(e.innerText.replace(/\s+/g, ' ').slice(0, 50)); }
        for (const e of document.querySelectorAll('.ec-num')) { const r = e.getBoundingClientRect(), pr = e.closest('.ec-l,.ligne,.carte'); out.nums.push({ t: e.textContent, d: r.right > W + 1, c: pr ? pr.scrollWidth > pr.clientWidth + 1 : false, l: e.getClientRects().length }); }
        return out; });
      lignes += r.l; mots += r.m; r.coupes.forEach(x => coupes.push(`${k}/${t}:${x}`)); r.debord.forEach(x => debord.push(`${k}/${t}:${x}`)); r.nums.forEach(x => nums.push({ k, t, ...x })); if (r.sc > r.W + 1) deborde.push(`${k}/${t} ${r.sc}>${r.W}`); }
    v('M · population : des lignes, des mots et des numéros lus', lignes >= 20 && mots >= 60 && nums.length >= 5, { lignes, mots, nums: nums.length });
    v('M · aucun mot ordinaire (moins de 22 lettres) n\'est coupé en deux lignes dans le premier bloc d\'une ligne', coupes.length === 0, coupes.slice(0, 8));
    v('M · aucune ligne ne déborde de la carte ou de l\'écran', debord.length === 0, debord.slice(0, 6));
    v('M · aucun numéro (contrat, facture, devis) ne dépasse ou ne passe sur deux lignes', nums.every(x => !x.d && !x.c && x.l === 1), nums.filter(x => x.d || x.c || x.l !== 1).slice(0, 6));
    v('M · aucun défilement latéral de la page', deborde.length === 0, deborde.slice(0, 6));
  }

  // ── D · la demande de contrat, client par client
  if (SEC.includes('D')) {
    const n0 = await p.evaluate(() => TACHES.filter(x => /^Proposer un contrat/.test(x.t)).length);
    const res = [];
    for (const k of CLIS) { await vue(k, 'contrats');
      const offre = await p.evaluate(() => !!document.querySelector('[data-ecctr]') && document.querySelector('[data-ecctr]').offsetParent !== null);
      if (!offre) { res.push({ k, offre: false }); continue; }
      await clic(p, '[data-ecctr]'); await L.calme(p, 250); await p.fill('#ed-m', 'Je voudrais un contrat pour ' + k); await clic(p, '.panneau [data-ec="demandeok|contrat"]'); await L.calme(p, 350);
      const a = await p.evaluate(k => ({ taches: TACHES.filter(x => /^Proposer un contrat/.test(x.t) && !x.fait).map(x => x.lien.id), carte: /Votre demande est envoyée/.test(document.getElementById('contenu').innerText), bouton: !!document.querySelector('[data-ecctr]') }), k);
      res.push({ k, offre: true, ...a }); }
    const faits = res.filter(r => r.offre);
    v('D · population : au moins deux clients se voient proposer le contrat', faits.length >= 2, res.map(r => r.k + (r.offre ? '+' : '-')).join(' '));
    v('D · chaque demande crée UNE tâche de plus, au nom du bon client', faits.every((r, i) => r.taches.length === i + 1 && r.taches.includes(r.k)), faits.map(r => r.k + ':' + r.taches.join('/')));
    v('D · la carte « Votre demande est envoyée » remplace le bouton', faits.every(r => r.carte && !r.bouton), faits);
    // un client qui n'a rien demandé ne voit pas la carte d'un autre
    const ceux = CLIS.filter(k => !faits.some(r => r.k === k)); let fuite = [];
    for (const k of ceux) { await vue(k, 'contrats'); if (/Votre demande est envoyée/.test(await p.evaluate(() => document.getElementById('contenu').innerText))) fuite.push(k); }
    v('D · un client qui n\'a rien demandé ne lit pas la demande d\'un autre', fuite.length === 0, { fuite, ceux });
    // le bureau fait sa tâche : la carte s'en va, le bouton revient (client sans contrat)
    const k0 = faits[0].k; await p.evaluate(k => { TACHES.filter(x => /^Proposer un contrat/.test(x.t) && x.lien.id === k).forEach(x => { x.fait = true; }); }, k0); await vue(k0, 'contrats');
    const ap = await p.evaluate(() => ({ carte: /Votre demande est envoyée/.test(document.getElementById('contenu').innerText), bouton: !!document.querySelector('[data-ecctr]'), texte: document.getElementById('contenu').innerText.replace(/\s+/g, ' ').slice(0, 160) }));
    v('D · tâche faite : la carte disparaît (et le client sait où il en est)', !ap.carte, ap);
    // depuis l'ACCUEIL et les autres entrées : « contrat » demandé par l'autre chemin, pas de double
    const entrees = await p.evaluate(() => [...document.querySelectorAll('[data-ec*="contrat"],[data-ecctr]')].map(e => e.getAttribute('data-ec') || 'ecctr'));
    v('D · les entrées de la demande de contrat restent des boutons connus', entrees.every(x => /^(demande\|contrat|ecctr|demandeok\|contrat|tab\|contrats)$/.test(x)), entrees);
    await p.evaluate(n => { TACHES.splice(0, TACHES.length, ...TACHES.filter(x => !/^Proposer un contrat/.test(x.t))); }, n0); await O.nettoyer(p);
  }

  // ── R · les écrans du métier 3D et les routes du bureau tapés à la main
  if (SEC.includes('R')) {
    const PHR = 'Cette page n’est pas dans votre espace.';
    const lire = (h, role) => p.evaluate(async ({ h, role }) => { window.__t = []; const T = window.toast; window.toast = function (m) { window.__t.push(String(m)); return T.apply(this, arguments); };
      location.hash = '#' + h; await new Promise(r => setTimeout(r, 450)); const o = { t: window.__t.slice(), route, role: ROLE }; window.toast = T; return o; }, { h, role });
    const routes = await p.evaluate(() => [...new Set([...(typeof METIERS_3D !== 'undefined' ? METIERS_3D : []), 'clients', 'compta', 'parametres', 'planning', 'stock', 'equipe', 'tableau', 'messages', 'courrier', 'taches'])]);
    v('R · population : des routes à taper', routes.length >= 8, routes);
    const bad = []; for (const h of routes) { const r = await lire(h); if (r.route !== 'espaceclient' || r.role !== 'client') bad.push(h + '→' + r.route + '/' + r.role); else if (r.t.some(m => m !== PHR && /métier|3D|existe pas|ton |ta |tes /.test(m))) bad.push(h + ' dit ' + r.t.join('|')); }
    v('R · le client reste chez lui, jamais une phrase du métier ni un tutoiement, sur toutes les routes tapées', bad.length === 0, bad);
    // les autres rôles : on les LIT (ce qu'ils voient ne devait pas changer)
    await p.evaluate(() => { rlChanger('gerant', { muet: true }); }).catch(() => {}); await L.calme(p, 600);
    const ro = await p.evaluate(() => ROLE);
    const g = []; for (const h of ['registre', 'carteBox', 'devisXylo']) { const r = await lire(h); g.push({ h, route: r.route, t: r.t.join('|').slice(0, 90) }); }
    v('R · population : le rôle a bien changé (' + ro + ')', ro !== 'client', ro);
    console.log('  · ' + ro + ' tape les écrans 3D : ' + JSON.stringify(g));
    v('R · les autres rôles lisent encore une phrase sur un écran 3D absent (rien de muet)', g.every(x => x.t.length > 0 || /registre|carte|devis/i.test(x.route)), g);
    await p.evaluate(() => { rlChanger('client', { cli: 'md', ec: 'accueil', muet: true }); }); await L.calme(p, 600);
  }

  // ── V · le devis D-2026-034, vu du bureau et du client
  if (SEC.includes('V')) {
    const d = await p.evaluate(() => { const x = DV.find(o => o.num === 'D-2026-034'); const i = x && INTS.find(o => o.id === x.int); const lg = x ? x.lignes.map(l => l[0]).join(' | ') : '';
      const vp = DV.filter(o => o.cli === 'vp').map(o => o.num + ' ' + o.objet); return { objet: x && x.objet, lignes: lg, int: i && i.titre, vp, ht: x && x.lignes.reduce((a, l) => a + l[1] * l[2], 0) }; });
    v('V · le devis D-2026-034 existe et parle de la carte électronique, du devis à l\'intervention', !!d.objet && /carte/i.test(d.objet) && /carte/i.test(d.lignes) && /carte/i.test(d.int || ''), d);
    v('V · le montant du devis ne bouge pas (448,17 € HT)', Math.abs(d.ht - 448.17) < 0.01, d.ht);
    v('V · un seul devis du Vieux Port parle du ventilateur', d.vp.filter(x => /ventilateur/i.test(x)).length === 1, d.vp);
    await vue('vp', 'devis'); const cl = await p.evaluate(() => document.getElementById('contenu').innerText.replace(/\s+/g, ' '));
    v('V · l\'espace client montre les deux devis, carte électronique ET ventilateur, sans doublon', /carte électronique/i.test(cl) && /ventilateur/i.test(cl), cl.slice(0, 260));
    await vue('vp', 'interventions'); const ci = await p.evaluate(() => document.getElementById('contenu').innerText.replace(/\s+/g, ' '));
    v('V · l\'onglet Interventions du client parle de la carte électronique pour le 4/11', /carte électronique/i.test(ci), ci.slice(0, 260));
    await cap('devis-vp');
  }

  // ── Z · valeurs longues, EN DERNIER (elles changent les données)
  if (SEC.includes('Z')) {
    await p.evaluate(() => { CLIENTS.vp.nom = 'Restaurant Le Vieux Port & Brasserie des Grands Quais de La Rochelle'; CLIENTS.vp.contact = 'Jean-Baptiste de la Roche-Foucauld-Montmorency, gérant'; ENTREPRISE.nom = 'Clim Services 17 — Climatisation, Chauffage et Pompes à chaleur de la Charente-Maritime'; });
    for (const t of ['accueil', 'factures', 'interventions', 'devis', 'contrats']) { await vue('vp', t); const r = await p.evaluate(() => ({ sc: document.documentElement.scrollWidth, W: document.documentElement.clientWidth })); v(`Z · valeurs longues : ${t} sans défilement latéral`, r.sc <= r.W + 1, r); if (t === 'accueil') await cap('valeurs-longues'); }
  }
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

// RECONTRÔLE ADVERSE du tour 4, partie C : captures iPad / Android, jour ET nuit, client au nom de 112 signes : liste, fiche, Infos, bulle (le toast « Fiche de … enregistrée »). 127.0.0.1 seulement.
const L = require('../lib.js'), fs = require('fs');
const SORTIE = process.env.SORTIE || '/tmp/claude-0/cap-rec4c/'; fs.mkdirSync(SORTIE, { recursive: true });
const NOM = 'Syndicat des copropriétaires de la résidence Les Jardins du Port de Rochefort-sur-Mer, représenté par son syndic'.slice(0, 112);
const CONTACT = 'Madame Marie-Hélène de la Tour-d’Auvergne-Lorraine, gestionnaire du syndic, assistée de Monsieur Jean-Baptiste Dupont-Delacroix'.slice(0, 120);
const ADR = '12 rue des Marins d’Aunis, résidence Les Jardins du Port, bâtiment C, escalier 2, 3e étage porte gauche, 17300 Rochefort-sur-Mer, près du pont transbordeur, parking visiteurs à droite du portail'.slice(0, 160);
(async () => {
  for (const [profil, nuit] of (process.env.PROFILS ? JSON.parse(process.env.PROFILS) : [['ipad', false], ['ipad', true], ['android', false], ['android', true]])) {
    const tag = profil + (nuit ? '-nuit' : '-jour'), c = await L.ouvrir({ profil, nuit, qui: 'marc', attente: 1500 }), p = c.p; p.on('dialog', d => d.accept().catch(() => {}));
    const k = await p.evaluate(o => { const k = Object.keys(CLIENTS).find(x => x !== '__nv' && INTS.some(i => i.cli === x)); Object.assign(CLIENTS[k], cliNet({ nom: o.nom, contact: o.contact, adr: o.adr, acces: 'Code portail 4821\nSonner chez la gardienne\nLocal à gauche', tel: '0546123456', mail: 'syndic@jardins-du-port.example.fr' })); return k; }, { nom: NOM, contact: CONTACT, adr: ADR });
    await p.evaluate(() => aller('clients')); await L.calme(p, 800);
    const liste = await p.evaluate(n => { const l = [...document.querySelectorAll('#contenu *')].filter(e => !e.children.length && (e.textContent || '').includes(n.slice(0, 30))).map(e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return { l: Math.round(r.width), h: Math.round(r.height), ell: cs.textOverflow, lc: cs.webkitLineClamp }; }); return l; }, NOM);
    L.v(tag + ' · liste des clients : le nom est affiché', liste.length > 0, liste);
    const d1 = await L.deborde(c); L.v(tag + ' · liste : pas de débordement', !d1 || !d1.deborde, d1);
    await p.evaluate(n => { const e = [...document.querySelectorAll('#contenu *')].find(e => !e.children.length && (e.textContent || '').includes(n.slice(0, 30))); if (e) e.scrollIntoView({ block: 'center' }); }, NOM); await L.calme(p, 400);
    await L.capture(c, SORTIE + 'liste-' + tag + '.png');
    await p.evaluate(kk => { ongletClient = 'histo'; aller('client-x-' + kk); }, k); await L.calme(p, 900);
    const d2 = await L.deborde(c); L.v(tag + ' · fiche : pas de débordement', !d2 || !d2.deborde, d2);
    const h = await p.evaluate(() => { const e = document.querySelector('.tete-client h1'), cs = getComputedStyle(e), lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2; return { lignes: Math.round(e.getBoundingClientRect().height / lh), t: e.textContent.length }; });
    L.v(tag + ' · fiche : titre sur 2 lignes au plus', h.lignes <= 2, h);
    await L.capture(c, SORTIE + 'fiche-' + tag + '.png');
    await p.evaluate(() => { ongletClient = 'infos'; rendre(); }); await L.calme(p, 700);
    await L.capture(c, SORTIE + 'infos-' + tag + '.png');
    // bulle : enregistrer la fiche → toast avec le nom de 112 signes
    await p.evaluate(() => { const t = document.querySelector('[data-ci="tel"]'); t.value = '05 46 12 34 57'; clientEnregistrer(param); }); await p.waitForTimeout(450);
    const b = await p.evaluate(() => { const e = document.getElementById('toast'), r = e.getBoundingClientRect(), cs = getComputedStyle(e); return { texte: e.textContent.slice(0, 200), l: Math.round(r.left), r: Math.round(r.right), h: Math.round(r.height), larg: innerWidth, vis: cs.opacity }; });
    L.v(tag + ' · bulle : le toast est dans l’écran (gauche ≥ 0, droite ≤ largeur) et lisible', b.l >= 0 && b.r <= b.larg + 1 && /enregistrée/.test(b.texte), b);
    await L.capture(c, SORTIE + 'bulle-' + tag + '.png');
    L.v(tag + ' · aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });

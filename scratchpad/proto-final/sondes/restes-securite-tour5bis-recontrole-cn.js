// RECONTRÔLE ADVERSE du tour 5 bis — C bis : le client NEUF de la création : QUEL champ est marqué quand le plafond est dépassé (particulier : nom du client = prénom + nom).
// ⛔ 127.0.0.1 seulement.
const L = require('../lib.js'), v = L.v;
(async () => {
  const c = await L.ouvrir({ profil: process.env.PROFIL || 'mac', nuit: !!process.env.NUIT, qui: 'marc', attente: 1500 }), p = c.p;
  p.on('dialog', d => d.accept().catch(() => {}));
  const pause = ms => L.calme(p, ms);
  await p.evaluate(() => { window.__t = []; const t0 = toast; toast = function (m) { window.__t.push(String(m).replace(/<[^>]+>/g, '')); return t0.apply(this, arguments); }; window.__set = (sel, val) => { const e = document.querySelector(sel); e.value = val; e.dispatchEvent(new Event('input', { bubbles: true })); }; });
  const ouvrir = async type => { await p.evaluate(() => { try { fermerCreation(); } catch (e) {} const k = Object.keys(CLIENTS).find(x => x !== '__nv' && INTS.some(i => i.cli === x)); ouvrirCreation({ cli: k }); }); await pause(600); await p.evaluate(() => { const b = document.querySelector('.fen [data-cfact="temps"]'); if (b) b.click(); }); await pause(250); await p.evaluate(() => { const b = document.querySelector('.fen [data-action="cPlusTot"]'); if (b) b.click(); }); await pause(400); await p.evaluate(() => document.querySelector('[data-cnouveau="1"]').click()); await pause(400); await p.evaluate(t => document.querySelector('[data-cnvtype="' + t + '"]').click(), type); await pause(300); };
  const cas = [
    ['part', { nom: 'N'.repeat(121) }, 'nom', 'Nom (particulier) de 121 signes'],
    ['part', { nom: 'N'.repeat(61), contact: 'P'.repeat(61) }, 'nom', 'Prénom 61 + Nom 61 (122 ensemble)'],
    ['part', { contact: 'P'.repeat(121) }, 'contact', 'Prénom de 121 signes'],
    ['pro', { nom: 'R'.repeat(121) }, 'nom', 'Raison sociale 121'],
    ['pro', { contact: 'C'.repeat(121) }, 'contact', 'Contact 121 (pro)'],
    ['pro', { adr: 'A'.repeat(161) }, 'adr', 'Adresse 161'],
    ['pro', { mail: 'm'.repeat(110) + '@exemple.fr' }, 'mail', 'E-mail de 121'],
    ['pro', { tel: '0'.repeat(61) }, 'tel', 'Téléphone de 61'],
  ];
  for (const [type, ch, champ, lib] of cas) {
    await ouvrir(type);
    await p.evaluate(([ch, type]) => { window.__set('[data-cnv="nom"]', ch.nom || 'Dupont'); window.__set('[data-cnv="contact"]', ch.contact || 'Jean'); window.__set('[data-cnv="tel"]', ch.tel || '0546123456'); window.__set('[data-cnv="adr"]', ch.adr || '12 rue des Lilas 17000 La Rochelle'); if (ch.mail) window.__set('[data-cnv="mail"]', ch.mail); }, [ch, type]);
    await pause(200); await p.evaluate(() => { window.__t = []; }); await p.locator('[data-action="cCreer"]').first().click(); await pause(500);
    const r = await p.evaluate(() => ({ t: window.__t.join(' | ').slice(0, 130), inv: [...document.querySelectorAll('[aria-invalid="true"]')].map(e => e.dataset.cnv || e.id), foc: document.activeElement && (document.activeElement.dataset.cnv || document.activeElement.id), ph: [...document.querySelectorAll('.fen label.champ')].map(l => l.firstChild && l.firstChild.textContent.trim()).slice(0, 8) }));
    v(type + ' · ' + lib + ' : phrase dite', /limité à/.test(r.t), r.t);
    v(type + ' · ' + lib + ' : le champ marqué EST celui qui porte l’excès (' + champ + ')', r.inv.length === 1 && r.inv[0] === champ && r.foc === champ, r);
  }
  L.bilan(); await L.fin(c); await L.fermer();
})().catch(e => { console.log('ÉCHEC', e.stack.slice(0, 500)); process.exit(1); });

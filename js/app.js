/* Bewijsverkenner infrageluid & windturbines */
(function () {
  'use strict';
  const S = window.STUDIES || [];
  const ARGS = window.ARGUMENTS || [];
  const VERWEER = window.VERWEER || [];
  const AFSTAND = window.AFSTAND || [];
  const byId = new Map(S.map(s => [String(s.id), s]));
  const get = id => byId.get(String(id));

  const THEMES = {
    slaap: 'Slaap', hart_en_vaten: 'Hart en vaten', hinder: 'Hinder', binnenoor_evenwicht: 'Binnenoor en evenwicht',
    hersenen: 'Hersenen', stress_hormonen: 'Stress en hormonen', cognitie: 'Cognitie', mentale_gezondheid: 'Mentale gezondheid',
    kinderen_kwetsbaren: 'Kinderen en kwetsbaren', klachten_symptomen: 'Klachten en symptomen', kwaliteit_van_leven: 'Kwaliteit van leven',
    nocebo_verwachting: 'Nocebo en verwachting', gehoor_tinnitus: 'Gehoor en tinnitus', zwangerschap: 'Zwangerschap',
    dierstudie_mechanisme: 'Dierstudies en mechanismen', blootstelling_meting: 'Blootstelling en metingen', therapie_positief: 'Therapie (positief effect)',
    emissie_bron: 'Akoestiek: bron en emissie', verspreiding: 'Akoestiek: verspreiding en weer', binnenshuis: 'Akoestiek: binnenshuis en gebouwen',
    waarneming: 'Akoestiek: waarneming en gehoordrempel', normen: 'Akoestiek: normen en weging', rekenmodellen: 'Akoestiek: rekenmodellen',
    meetmethoden: 'Akoestiek: meetmethoden', geluidskarakter: 'Akoestiek: pulsering en tonen', trillingen: 'Akoestiek: trillingen'
  };
  const SOORT = { gezondheid: 'Gezondheidsonderzoek', algemeen: 'Algemeen onderzoek (akoestiek)' };
  const nG = S.filter(s => s.soort === 'algemeen').length, nH = S.length - nG;
  const REL = {
    A: { label: 'A – direct relevant', short: 'Direct relevant', uitleg: 'Onderzoekt windturbinegeluid of nagebootst windturbine-infrageluid, bij omwonenden of op realistische niveaus. Ook reviews specifiek over windturbines en gezondheid.' },
    B: { label: 'B – indirect relevant', short: 'Indirect relevant', uitleg: 'Infrageluid of laagfrequent geluid bij mensen op niveaus die ook rond windturbines voorkomen, of onderzoek naar het werkingsmechanisme (binnenoor, hersenen, bloedvaten).' },
    C: { label: 'C – achtergrond', short: 'Achtergrond', uitleg: 'Dierproeven met hoge niveaus, beroepsmatige blootstelling, voertuigen, trillingen of therapie. Bruikbaar als ondersteunend argument, niet als hoofdbewijs.' }
  };
  const DIRS = ['negatief effect gevonden', 'gemengd', 'review – overwegend negatief bewijs', 'review – gemengd/onzeker', 'geen/onduidelijk effect', 'review – geen/beperkt bewijs', 'positief/therapeutisch effect', 'blootstelling (geen gezondheidsuitkomst)', 'ondersteunt bezwaar', 'beschrijvend / neutraal', 'relativeert bezwaar'];
  const dirClass = d => /negatief|ondersteunt/.test(d) ? 'dir-neg' : /gemengd/.test(d) ? 'dir-mix' : /positief/.test(d) ? 'dir-pos' : 'dir-none';
  const isNeg = d => /negatief|gemengd|ondersteunt/.test(d || '');
  const isContra = d => /geen\/|geen\/beperkt|relativeert/.test(d || '');

  /* ---------- state ---------- */
  const KEY = 'bewijsverkenner-v1';
  const defaults = { studies: [], args: [], verweer: [], eigen: [], project: { naam: '', gezag: '', aantal: '', tiphoogte: '', afstand: '', woningen: '' }, map: { turbines: [], homes: [] } };
  let st;
  try { st = Object.assign({}, defaults, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { st = JSON.parse(JSON.stringify(defaults)); }
  st.project = Object.assign({}, defaults.project, st.project || {});
  st.map = Object.assign({ turbines: [], homes: [] }, st.map || {});
  if (!Array.isArray(st.eigen)) st.eigen = [];
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} updateCount(); };
  const toggleIn = (arr, v) => { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); return i < 0; };
  function updateCount() { const n = st.studies.length + st.args.length + st.verweer.length + st.eigen.length; document.getElementById('selCount').textContent = n; }

  /* ---------- helpers ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const main = $('#main');
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2200); }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast('Gekopieerd naar klembord'); }
    catch (e) { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('Gekopieerd naar klembord'); } catch (_) { toast('Kopiëren niet gelukt'); } ta.remove(); }
  }
  const shortCite = s => s ? `${s.auteurs}, ${s.jaar || 'z.j.'}` : '';
  const fullCite = s => {
    if (!s) return '';
    const doi = s.doi && !/^\d+$/.test(s.doi) ? ` https://doi.org/${s.doi}` : (s.link ? ` ${s.link}` : '');
    return `${s.auteurs} (${s.jaar || 'z.j.'}). ${s.titel.replace(/\.$/, '')}. ${s.tijdschrift && s.tijdschrift !== 'n.a.' ? s.tijdschrift + '.' : ''}${doi}`;
  };
  const relBadge = r => `<span class="badge rel-${r}" title="${esc(REL[r] ? REL[r].label : '')}">${r}</span>`;
  const dirBadge = d => `<span class="badge ${dirClass(d)}">${esc(d)}</span>`;
  const strBadge = s => `<span class="badge str-${s}">${esc(s)}</span>`;
  const fmtM = m => m >= 1000 ? (m / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 2 }) + ' km' : Math.round(m).toLocaleString('nl-NL') + ' m';

  /* ---------- project / local paragraph ---------- */
  function lokaleAlinea(p, afstandOverride) {
    const afst = Number(afstandOverride || p.afstand);
    if (!afst) return '';
    const tip = Number(p.tiphoogte);
    const parts = [];
    const naam = p.naam ? `het project ${p.naam}` : 'het voorliggende project';
    let zin = `In ${naam}`;
    if (p.aantal) zin += ` worden ${p.aantal} windturbine${Number(p.aantal) === 1 ? '' : 's'}`; else zin += ' worden windturbines';
    if (tip) zin += ` met een tiphoogte van ${tip} m`;
    zin += ` geplaatst op ${fmtM(afst)} van de dichtstbijzijnde woning`;
    if (tip) zin += ` (${(afst / tip).toLocaleString('nl-NL', { maximumFractionDigits: 1 })} keer de tiphoogte)`;
    zin += '.';
    parts.push(zin);
    if (p.woningen) parts.push(`Binnen een straal van 1 km liggen ${p.woningen} woningen.`);
    const hits = AFSTAND.filter(a => a.richting === 'steun' && a.max_m && afst <= a.max_m).map(a => ({ a, s: get(a.id) })).filter(x => x.s);
    if (hits.length) {
      parts.push('Deze afstand valt binnen de afstanden waarop in peer-reviewed onderzoek nadelige effecten bij omwonenden zijn gevonden: ' +
        hits.map(x => `${lower1(x.a.label)} (${shortCite(x.s)})`).join('; ') + '.');
    }
    parts.push('Daarnaast wijst recent onderzoek erop dat infrageluid van moderne windturbines zich verder verspreidt dan gangbare rekenmodellen voorspellen (Mattsson et al., 2026).');
    return parts.join(' ');
  }
  const lower1 = s => s.charAt(0).toLowerCase() + s.slice(1);

  /* ---------- router ---------- */
  const routes = { start: renderStart, studies: renderStudies, relevantie: renderRelevantie, argumenten: renderArgumenten, verweer: renderVerweer, kaart: renderKaart, export: renderExport };
  function router() {
    const h = (location.hash || '#/start').replace(/^#\//, '');
    const [name, ...rest] = h.split('/');
    const [base, query] = name.split('?');
    $$('.tabs a').forEach(a => a.classList.toggle('active', a.dataset.route === base));
    const fn = routes[base] || renderStart;
    if (mapInstance) { mapInstance.remove(); mapInstance = null; }
    fn(rest, new URLSearchParams(query || ''));
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', router);

  /* ---------- START ---------- */
  function renderStart() {
    const nA = S.filter(s => s.relevantie === 'A').length, nB = S.filter(s => s.relevantie === 'B').length;
    const nNegA = S.filter(s => s.relevantie === 'A' && isNeg(s.richting)).length;
    main.innerHTML = `
    <section class="hero">
      <div>
        <div class="eyebrow">Peer-reviewed onderzoek 2000–2026</div>
        <h1>Onderbouw je zienswijze of beroep met de wetenschap over infrageluid en laagfrequent geluid</h1>
        <p class="lead">${nH} studies over gezondheid, ${nG} studies over de akoestiek van infrageluid en laagfrequent geluid, ${ARGS.length} uitgewerkte argumenten tegen windturbineprojecten, voorbereide weerleggingen, een module om je eigen argument te toetsen en een Word-export die je direct kunt indienen.</p>
        <div class="btn-row" style="margin-top:1.5rem"><a class="btn btn-primary" href="#/argumenten">Naar de argumentbouwer</a><a class="btn" href="#/argumenten/eigen">Eigen argument toetsen</a><a class="btn" href="#/kaart">Afstand tot woningen bepalen</a></div>
      </div>
      <div class="card">
        <h2>Zo werkt het</h2>
        <ol class="steps">
          <li><div><a href="#/kaart">Kaart</a>: zet de geplande turbines en woningen neer. De app berekent de afstanden en toont welk onderzoek bij die afstand past.</div></li>
          <li><div><a href="#/argumenten">Argumenten</a>: kies de argumenten die bij jouw situatie passen, of schrijf <a href="#/argumenten/eigen">je eigen argument</a> en laat de app onderbouwing, verweer en weerlegging zoeken.</div></li>
          <li><div><a href="#/verweer">Verweer</a>: bereid je voor op de studies die de initiatiefnemer aanhaalt.</div></li>
          <li><div><a href="#/export">Export</a>: download een Word-bijlage met tekst, onderbouwing en literatuurlijst.</div></li>
        </ol>
      </div>
    </section>
    <div class="grid grid-3">
      <div class="card kpi"><div class="num">${nA}</div><div class="lbl">studies direct relevant voor windturbines</div><p>${nNegA} daarvan vinden een nadelig of gemengd effect.</p></div>
      <div class="card kpi"><div class="num">${nG}</div><div class="lbl">studies algemeen onderzoek (akoestiek)</div><p>Bron, verspreiding, nacht, binnenshuis, gehoordrempel en normen: de logische schakels tussen turbine en gezondheid.</p></div>
      <div class="card kpi"><div class="num">${ARGS.filter(a => a.sterkte === 'Sterk').length}</div><div class="lbl">argumenten met sterk bewijs</div><p>Hinder, langetermijnonzekerheid en voorzorg vormen de kern van een sterke zienswijze.</p></div>
    </div>
    <div class="section grid grid-3">
      ${[['studies', 'Studies zoeken', 'Filter op onderwerp, relevantie, richting en studietype.'], ['relevantie', 'Relevantie voor windturbines', 'Zie in één oogopslag welk onderzoek telt voor jouw zaak.'], ['argumenten', 'Argumentbouwer', 'Kant-en-klare argumenten met tekstblok en bronnen.'], ['verweer', 'Verweer voorbereiden', 'De tegenstudies, hun zwakke punten en jouw weerwoord.'], ['kaart', 'Kaart en afstand', 'Bereken afstanden en koppel ze aan onderzoek.'], ['export', 'Export naar Word', 'Bijlage met tekst, tabel en literatuurlijst.']].map(m => `<a class="card mod-card" href="#/${m[0]}"><h3>${m[1]}</h3><p>${m[2]}</p></a>`).join('')}
    </div>`;
  }

  /* ---------- STUDIES ---------- */
  const F = { q: '', soort: '', rel: [], themes: [], dir: '', type: '', exp: '', from: '', to: '', kern: false, sort: 'rel', limit: 30 };
  function filtered() {
    const q = F.q.trim().toLowerCase();
    let r = S.filter(s => {
      if (F.soort && (s.soort || 'gezondheid') !== F.soort) return false;
      if (F.rel.length && !F.rel.includes(s.relevantie)) return false;
      if (F.themes.length && !F.themes.every(t => (s.themas || []).includes(t))) return false;
      if (F.dir === 'neg' && !isNeg(s.richting)) return false;
      if (F.dir && F.dir !== 'neg' && s.richting !== F.dir) return false;
      if (F.type && s.studietype !== F.type) return false;
      if (F.exp && s.blootstelling !== F.exp) return false;
      if (F.from && (!s.jaar || s.jaar < +F.from)) return false;
      if (F.to && (!s.jaar || s.jaar > +F.to)) return false;
      if (F.kern && !s.kern) return false;
      if (q) { const hay = (s.titel + ' ' + s.auteurs + ' ' + s.bevinding + ' ' + s.uitkomst + ' ' + s.populatie + ' ' + s.tijdschrift).toLowerCase(); if (!q.split(/\s+/).every(w => hay.includes(w))) return false; }
      return true;
    });
    const relOrder = { A: 0, B: 1, C: 2 };
    if (F.sort === 'rel') r.sort((a, b) => relOrder[a.relevantie] - relOrder[b.relevantie] || (isNeg(b.richting) - isNeg(a.richting)) || (b.jaar || 0) - (a.jaar || 0));
    if (F.sort === 'new') r.sort((a, b) => (b.jaar || 0) - (a.jaar || 0));
    if (F.sort === 'old') r.sort((a, b) => (a.jaar || 9999) - (b.jaar || 9999));
    return r;
  }
  function studyCard(s) {
    const sel = st.studies.includes(String(s.id));
    const facts = [['Niveau', s.niveau], ['Frequentie', s.frequentie], ['Duur', s.duur], ['N', s.n], ['Afstand', s.afstand]].filter(f => f[1] && !/^(onbekend|n\.v\.t\.|niet vermeld)/i.test(f[1]));
    return `<article class="study">
      <div class="meta">${relBadge(s.relevantie)} ${dirBadge(s.richting)} ${s.soort === 'algemeen' ? '<span class="badge dir-none">akoestiek</span>' : ''} ${s.kern ? '<span class="badge kern" title="Nagelezen tegen het abstract">kernstudie</span>' : ''} <span class="yr">${s.jaar || 'z.j.'}</span> <span class="xs muted">${esc(s.studietype || '')}</span></div>
      <h3>${esc(s.titel)}</h3>
      <div class="src">${esc(s.auteurs)} · ${esc(s.tijdschrift)}${s.land && s.land !== 'onbekend' ? ' · ' + esc(s.land) : ''}</div>
      <p class="find">${esc(s.bevinding)}</p>
      ${facts.length ? `<div class="facts">${facts.map(f => `<span>${f[0]}: <b>${esc(f[1])}</b></span>`).join('')}</div>` : ''}
      <div class="btn-row"><button class="btn btn-sm" data-detail="${s.id}">Details</button><button class="btn btn-sm ${sel ? 'on' : ''}" data-sel="${s.id}">${sel ? '✓ In selectie' : '+ Selectie'}</button><a class="btn btn-sm" href="${esc(s.link)}" target="_blank" rel="noopener">Bron ↗</a></div>
    </article>`;
  }
  function renderStudies(rest, params) {
    if (params.has('reset')) Object.assign(F, { q: '', soort: '', rel: [], themes: [], dir: '', type: '', exp: '', from: '', to: '', kern: false, limit: 30 });
    if (params.get('rel')) F.rel = params.get('rel').split(',');
    if (params.get('theme')) F.themes = params.get('theme').split(',');
    if (params.get('dir')) F.dir = params.get('dir');
    if (params.get('soort')) F.soort = params.get('soort');
    const types = [...new Set(S.map(s => s.studietype).filter(Boolean))].sort();
    const exps = [...new Set(S.map(s => s.blootstelling).filter(Boolean))].sort();
    main.innerHTML = `
      <div class="page-head"><div><div class="eyebrow">Module 2</div><h1>Studies zoeken</h1><p>Zoek in ${S.length} peer-reviewed studies: ${nH} over gezondheid en ${nG} algemene studies over de akoestiek van infrageluid en laagfrequent geluid. Combineer soort onderzoek, onderwerpen, relevantie en richting.</p></div>
      <a class="btn btn-sm" href="#/studies?reset">Filters wissen</a></div>
      <div class="layout-filter">
        <aside class="filters" aria-label="Filters">
          <div class="field"><label for="fq">Zoeken</label><input id="fq" type="search" placeholder="Bijv. slaap, cortisol, Poulsen" value="${esc(F.q)}"></div>
          <div class="field"><label for="fsoort">Soort onderzoek</label><select id="fsoort"><option value="">Alles</option>${Object.entries(SOORT).map(([k, v]) => `<option value="${k}" ${F.soort === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="field"><span class="lbl">Relevantie windturbines</span><div class="chips" id="frel">${['A', 'B', 'C'].map(r => `<button class="chip ${F.rel.includes(r) ? 'on' : ''}" data-v="${r}" title="${esc(REL[r].uitleg)}">${REL[r].label}</button>`).join('')}</div></div>
          <div class="field"><span class="lbl">Onderwerp</span><div class="chips" id="fthemes">${Object.entries(THEMES).map(([k, v]) => `<button class="chip ${F.themes.includes(k) ? 'on' : ''}" data-v="${k}">${v}</button>`).join('')}</div></div>
          <div class="field"><label for="fdir">Richting effect</label><select id="fdir"><option value="">Alle</option><option value="neg" ${F.dir === 'neg' ? 'selected' : ''}>Nadelig of gemengd</option>${DIRS.map(d => `<option ${F.dir === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
          <div class="field"><label for="ftype">Studietype</label><select id="ftype"><option value="">Alle</option>${types.map(t => `<option ${F.type === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
          <div class="field"><label for="fexp">Blootstelling</label><select id="fexp"><option value="">Alle</option>${exps.map(t => `<option ${F.exp === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
          <div class="field"><span class="lbl">Jaar</span><div style="display:flex;gap:8px"><input id="ffrom" type="number" min="2000" max="2026" placeholder="van" value="${esc(F.from)}"><input id="fto" type="number" min="2000" max="2026" placeholder="tot" value="${esc(F.to)}"></div></div>
          <label class="check"><input type="checkbox" id="fkern" ${F.kern ? 'checked' : ''}> Alleen kernstudies (nagelezen)</label>
        </aside>
        <section><div class="resultbar"><span id="rcount"></span><label class="small">Sorteer <select id="fsort" style="width:auto;display:inline-block;margin-left:6px"><option value="rel" ${F.sort === 'rel' ? 'selected' : ''}>Relevantie</option><option value="new" ${F.sort === 'new' ? 'selected' : ''}>Nieuwste eerst</option><option value="old" ${F.sort === 'old' ? 'selected' : ''}>Oudste eerst</option></select></label></div><div id="results"></div></section>
      </div>`;
    const draw = () => {
      const r = filtered();
      $('#rcount').textContent = `${r.length} studie${r.length === 1 ? '' : 's'} · ${r.filter(s => isNeg(s.richting)).length} met nadelig of gemengd effect`;
      $('#results').innerHTML = r.length ? r.slice(0, F.limit).map(studyCard).join('') + (r.length > F.limit ? `<div style="text-align:center"><button class="btn" id="more">Meer tonen (${r.length - F.limit})</button></div>` : '') : '<div class="empty">Geen studies gevonden met deze filters.</div>';
      const more = $('#more'); if (more) more.onclick = () => { F.limit += 30; draw(); };
    };
    let t; $('#fq').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { F.q = e.target.value; F.limit = 30; draw(); }, 150); });
    $('#frel').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; toggleIn(F.rel, b.dataset.v); b.classList.toggle('on'); F.limit = 30; draw(); });
    $('#fthemes').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; toggleIn(F.themes, b.dataset.v); b.classList.toggle('on'); F.limit = 30; draw(); });
    [['fsoort', 'soort'], ['fdir', 'dir'], ['ftype', 'type'], ['fexp', 'exp'], ['fsort', 'sort'], ['ffrom', 'from'], ['fto', 'to']].forEach(([id, k]) => $('#' + id).addEventListener('change', e => { F[k] = e.target.value; F.limit = 30; draw(); }));
    $('#fkern').addEventListener('change', e => { F.kern = e.target.checked; draw(); });
    draw();
  }

  /* ---------- detail drawer & selection (global delegation) ---------- */
  document.addEventListener('click', e => {
    const d = e.target.closest('[data-detail]'); if (d) { openDetail(d.dataset.detail); return; }
    const s = e.target.closest('[data-sel]');
    if (s) { const added = toggleIn(st.studies, String(s.dataset.sel)); save(); $$(`[data-sel="${s.dataset.sel}"]`).forEach(b => { b.classList.toggle('on', added); b.textContent = added ? '✓ In selectie' : '+ Selectie'; }); toast(added ? 'Toegevoegd aan selectie' : 'Verwijderd uit selectie'); return; }
    const c = e.target.closest('[data-copy]'); if (c) { const src = document.getElementById(c.dataset.copy); if (src) copy(src.value != null && src.tagName === 'TEXTAREA' ? src.value : src.innerText); return; }
    if (e.target.closest('[data-close]')) closeDrawer();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
  function openDetail(id) {
    const s = get(id); if (!s) return;
    const usedIn = ARGS.filter(a => a.steun.some(x => String(x.id) === String(id)) || a.verweer.some(v => v.studies.map(String).includes(String(id))));
    $('#drawerBody').innerHTML = `
      <div class="meta" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${relBadge(s.relevantie)} ${dirBadge(s.richting)} ${s.kern ? '<span class="badge kern">kernstudie · nagelezen</span>' : ''}</div>
      <h2 id="drawerTitle">${esc(s.titel)}</h2>
      <p class="muted small">${esc(s.auteurs)} (${s.jaar || 'z.j.'}) · ${esc(s.tijdschrift)}</p>
      <p>${esc(s.bevinding)}</p>
      <dl class="kv">
        <dt>Soort</dt><dd>${esc(SOORT[s.soort || 'gezondheid'])}${s.soort === 'algemeen' ? ' – geen gezondheidsuitkomst; bruikbaar als schakel in een redenering' : ''}</dd>
        <dt>Relevantie</dt><dd>${esc(REL[s.relevantie].label)}. ${esc(s.relevantie_reden || '')}</dd>
        <dt>Studietype</dt><dd>${esc(s.studietype)}</dd><dt>Blootstelling</dt><dd>${esc(s.blootstelling)}</dd>
        <dt>Populatie</dt><dd>${esc(s.populatie)}</dd><dt>Uitkomst</dt><dd>${esc(s.uitkomst)}</dd>
        <dt>Niveau</dt><dd>${esc(s.niveau)}</dd><dt>Frequentie</dt><dd>${esc(s.frequentie)}</dd><dt>Duur</dt><dd>${esc(s.duur)}</dd>
        <dt>Aantal</dt><dd>${esc(s.n)}</dd><dt>Afstand</dt><dd>${esc(s.afstand)}</dd><dt>Land</dt><dd>${esc(s.land)}</dd>
        <dt>Beperkingen</dt><dd>${esc(s.beperkingen)}</dd><dt>Peer review</dt><dd>${esc(s.verificatie)}</dd>
        <dt>Onderwerpen</dt><dd>${(s.themas || []).map(t => THEMES[t] || t).join(', ')}</dd>
      </dl>
      ${usedIn.length ? `<p class="small"><b>Gebruikt in argumenten:</b> ${usedIn.map(a => `<a href="#/argumenten/${a.id}" data-close>${esc(a.titel)}</a>`).join(' · ')}</p>` : ''}
      <div class="field" style="margin-top:12px"><span class="lbl">Bronvermelding</span><div class="textblock" id="citeBox" style="font-size:.95rem">${esc(fullCite(s))}</div></div>
      <div class="btn-row" style="margin-top:12px"><button class="btn btn-sm" data-copy="citeBox">Kopieer bronvermelding</button><button class="btn btn-sm ${st.studies.includes(String(s.id)) ? 'on' : ''}" data-sel="${s.id}">${st.studies.includes(String(s.id)) ? '✓ In selectie' : '+ Selectie'}</button><a class="btn btn-sm" href="${esc(s.link)}" target="_blank" rel="noopener">Open bron ↗</a></div>`;
    $('#drawer').hidden = false; $('.drawer-close').focus();
  }
  function closeDrawer() { $('#drawer').hidden = true; }

  /* ---------- RELEVANTIE ---------- */
  function renderRelevantie() {
    const cnt = r => S.filter(s => s.relevantie === r);
    const themes = Object.keys(THEMES).filter(t => t !== 'therapie_positief');
    const rows = themes.map(t => { const inT = S.filter(s => (s.themas || []).includes(t)); return { t, A: inT.filter(s => s.relevantie === 'A'), B: inT.filter(s => s.relevantie === 'B'), C: inT.filter(s => s.relevantie === 'C') }; }).sort((a, b) => b.A.length - a.A.length);
    const top = S.filter(s => s.relevantie === 'A' && isNeg(s.richting) && s.kern).sort((a, b) => (b.jaar || 0) - (a.jaar || 0));
    const cell = (arr, rel, t) => `<a class="cell-btn" style="text-decoration:none" href="#/studies?reset&rel=${rel}&theme=${t}">${arr.length}${arr.length ? ` <span class="neg">(${arr.filter(s => isNeg(s.richting)).length} nadelig)</span>` : ''}</a>`;
    main.innerHTML = `
      <div class="page-head"><div><div class="eyebrow">Module 1</div><h1>Relevantie voor windturbines</h1><p>Elke studie heeft een label A, B of C, op basis van de bron van het geluid, het niveau ten opzichte van woonsituaties, de onderzochte groep en het studietype. Klik op een getal om de studies te zien.</p></div></div>
      <div class="grid grid-3">${['A', 'B', 'C'].map(r => `<a class="card kpi mod-card" href="#/studies?reset&rel=${r}"><div style="display:flex;justify-content:space-between;align-items:center">${relBadge(r)}<span class="num">${cnt(r).length}</span></div><div class="lbl"><b>${REL[r].short}</b> · ${cnt(r).filter(s => isNeg(s.richting)).length} met nadelig of gemengd effect</div><p>${REL[r].uitleg}</p></a>`).join('')}</div>
      <div class="section note">Naast gezondheidsonderzoek bevat de database ${nG} algemene studies over de akoestiek (bron, verspreiding, binnenshuis, gehoordrempel, normen, trillingen). Die meten geen gezondheidseffect, maar onderbouwen de logische schakels in je redenering. <a href="#/studies?reset&soort=algemeen">Bekijk het algemene onderzoek</a>.</div>
      <div class="section card"><h2>Per onderwerp</h2><p class="small muted">Aantal studies per onderwerp en relevantielabel. Tussen haakjes: hoeveel daarvan een nadelig of gemengd effect vinden.</p>
        <div class="table-wrap"><table><thead><tr><th>Onderwerp</th><th class="num">A – direct</th><th class="num">B – indirect</th><th class="num">C – achtergrond</th></tr></thead>
        <tbody>${rows.map(r => `<tr><td>${THEMES[r.t]}</td><td class="num">${cell(r.A, 'A', r.t)}</td><td class="num">${cell(r.B, 'B', r.t)}</td><td class="num">${cell(r.C, 'C', r.t)}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="section"><h2>Kernstudies: direct relevant en nadelig of gemengd effect</h2><p class="muted small">Nagelezen tegen het abstract en gebruikt in de argumentbouwer.</p>${top.map(studyCard).join('')}</div>`;
  }

  /* ---------- ARGUMENTEN ---------- */
  const GROEP = { gezondheid: ['Gezondheidseffecten', 'Argumenten die steunen op onderzoek naar gezondheid en hinder.'], blootstelling: ['Blootstelling en akoestiek: de logische schakels', 'Argumenten die steunen op algemeen onderzoek naar infrageluid en laagfrequent geluid: bron, verspreiding, nacht, binnenshuis, gehoordrempel, normen en rekenmodellen. Ze bewijzen geen gezondheidsschade, maar laten zien dat de blootstelling groter is dan de norm veronderstelt.'] };
  function renderArgumenten(rest) {
    if (rest[0] === 'eigen') return renderEigen(rest[1]);
    if (rest[0]) return renderArgument(rest[0]);
    main.innerHTML = `
      <div class="page-head"><div><div class="eyebrow">Module 3</div><h1>Argumentbouwer</h1><p>${ARGS.length} argumenten tegen windturbineprojecten, elk met onderbouwing uit peer-reviewed onderzoek, een tekstblok voor je zienswijze of beroep, en voorbereide weerleggingen. Begin met de sterke argumenten, of toets je eigen argument.</p></div>
      <div class="chips" id="fstr">${['Alle', 'Sterk', 'Matig', 'Indicatief'].map((s, i) => `<button class="chip ${i === 0 ? 'on' : ''}" data-v="${s}">${s}</button>`).join('')}</div></div>
      <a class="card eigen-cta" href="#/argumenten/eigen"><div><div class="eyebrow">Nieuw</div><h2>Eigen argument toetsen</h2><p>Schrijf je eigen argument in gewone taal. De app zoekt de onderbouwing uit het onderzoek, het verweer dat je kunt verwachten en de weerlegging daarvan.${st.eigen.length ? ` Je hebt ${st.eigen.length} eigen argument${st.eigen.length === 1 ? '' : 'en'} opgeslagen.` : ''}</p></div><span class="btn btn-primary">Schrijf je argument →</span></a>
      <div id="argGroups"></div>
      <div class="section note">De sterkte geeft aan hoe overtuigend het bewijs is voor een rechter of onafhankelijk deskundige. <b>Sterk</b>: consistent bewijs of breed erkende kennisleemte. <b>Matig</b>: meerdere studies, deels gemengd. <b>Indicatief</b>: aanwijzingen, gebruik als ondersteuning.</div>`;
    const draw = f => {
      $('#argGroups').innerHTML = Object.entries(GROEP).map(([g, [titel, uitleg]]) => {
        const cards = ARGS.map((a, i) => ({ a, i })).filter(x => (x.a.groep || 'gezondheid') === g && (f === 'Alle' || x.a.sterkte === f)).map(({ a, i }) => {
          const sel = st.args.includes(a.id);
          return `<a class="card arg-card" href="#/argumenten/${a.id}"><div style="display:flex;justify-content:space-between;align-items:center"><span class="arg-num">${String(i + 1).padStart(2, '0')}</span>${strBadge(a.sterkte)}</div><h3>${esc(a.titel)}</h3><p>${esc(a.kern)}</p><div class="foot-row"><span>${a.steun.length} studies · ${a.verweer.length} weerlegging${a.verweer.length === 1 ? '' : 'en'}</span>${sel ? '<span class="badge kern">in selectie</span>' : ''}</div></a>`;
        }).join('');
        return cards ? `<div class="section"><h2>${esc(titel)}</h2><p class="small muted" style="max-width:75ch">${esc(uitleg)}</p><div class="grid grid-3" style="margin-top:12px">${cards}</div></div>` : '';
      }).join('') || '<div class="empty">Geen argumenten met deze sterkte.</div>';
    };
    $('#fstr').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; $$('#fstr .chip').forEach(c => c.classList.remove('on')); b.classList.add('on'); draw(b.dataset.v); });
    draw('Alle');
  }

  /* ---------- EIGEN ARGUMENT ---------- */
  // trefwoorden (Nederlands en Engels) per begrip, gekoppeld aan onderwerpen en argumenten
  const LEX = [
    { w: ['slaap', 'slapen', 'wakker', 'ontwak', 'insomn', 'slapeloos', 'sleep', 'nacht', 'night', 'rem', 'slaapmedicatie'], th: ['slaap'], args: ['slaap', 'nacht'] },
    { w: ['hinder', 'last', 'ergernis', 'annoy', 'irritat', 'overlast', 'storend'], th: ['hinder'], args: ['hinder', 'pulserend', 'dba'] },
    { w: ['hart', 'bloeddruk', 'boezemfibril', 'hartslag', 'cardio', 'heart', 'vaat', 'vaten', 'blood pressure'], th: ['hart_en_vaten'], args: ['hart'] },
    { w: ['stress', 'cortisol', 'hormoon', 'spanning'], th: ['stress_hormonen'], args: ['stress'] },
    { w: ['depress', 'angst', 'mentaal', 'mentale', 'psychisch', 'anxiety', 'mental'], th: ['mentale_gezondheid'], args: ['kwaliteit', 'stress'] },
    { w: ['concentr', 'cognit', 'prestatie', 'leren', 'school', 'performance'], th: ['cognitie'], args: ['kwetsbaar'] },
    { w: ['kind', 'kinderen', 'ouder', 'ouderen', 'zwanger', 'kwetsbaar', 'gevoelig', 'patiënt', 'patient', 'ziek', 'zorg', 'baby'], th: ['kinderen_kwetsbaren'], args: ['kwetsbaar', 'drempel'] },
    { w: ['hoofdpijn', 'duizel', 'oorsuizen', 'tinnitus', 'klacht', 'symptom', 'misselijk', 'druk op', 'oor'], th: ['klachten_symptomen', 'gehoor_tinnitus'], args: ['onhoorbaar', 'nocebo'] },
    { w: ['evenwicht', 'binnenoor', 'vestibul', 'haarcel', 'cochlea'], th: ['binnenoor_evenwicht'], args: ['onhoorbaar', 'mechanisme'] },
    { w: ['hersen', 'brein', 'brain', 'fmri', 'eeg'], th: ['hersenen'], args: ['onhoorbaar', 'nocebo'] },
    { w: ['dier', 'muis', 'muizen', 'rat', 'ratten', 'animal', 'mechanisme'], th: ['dierstudie_mechanisme'], args: ['mechanisme'] },
    { w: ['nocebo', 'tussen de oren', 'verbeelding', 'psycholog', 'verwachting', 'inbeelding'], th: ['nocebo_verwachting'], args: ['nocebo'] },
    { w: ['kwaliteit van leven', 'woongenot', 'leefbaar', 'welzijn', 'quality of life'], th: ['kwaliteit_van_leven'], args: ['kwaliteit'] },
    { w: ['lange termijn', 'langetermijn', 'jaren', 'chronisch', 'jarenlang', 'long-term', 'twintig jaar', '20 jaar'], th: [], args: ['langetermijn', 'voorzorg'] },
    { w: ['voorzorg', 'onzeker', 'onbekend', 'twijfel', 'precaution', 'risico'], th: [], args: ['voorzorg', 'langetermijn'] },
    { w: ['onhoorbaar', 'niet hoorbaar', 'niet horen', 'gehoordrempel', 'drempel', 'threshold', 'waarnem', 'voelen', 'voelbaar'], th: ['waarneming'], args: ['drempel', 'onhoorbaar'] },
    { w: ['infrageluid', 'infrasoon', 'infrasound', 'infrasonic', 'onder 20 hz'], th: ['blootstelling_meting'], args: ['onhoorbaar', 'verspreiding', 'langetermijn'] },
    { w: ['laagfrequent', 'low frequency', 'low-frequency', 'lfn', 'bromtoon', 'brom', 'dreun', 'lage tonen', 'bas'], th: ['blootstelling_meting'], args: ['dba', 'keten', 'binnen'] },
    { w: ['groot', 'groter', 'grote turbines', 'hoogte', 'tiphoogte', 'megawatt', 'mw', 'rotor', 'hoger', 'larger'], th: ['emissie_bron'], args: ['groot', 'keten'] },
    { w: ['afstand', 'ver', 'kilometer', 'km', 'meter', 'dichtbij', 'reikwijdte', 'verspreid', 'distance', 'propagation'], th: ['verspreiding'], args: ['verspreiding', 'keten', 'rekenmodel'] },
    { w: ['weer', 'wind', 'atmosfeer', 'stabiel', 'inversie', 'windschering', 'meteo', 'avond', 'stability'], th: ['verspreiding'], args: ['nacht'] },
    { w: ['binnen', 'binnenshuis', 'woning', 'huis', 'slaapkamer', 'gevel', 'raam', 'ramen', 'muur', 'isolatie', 'indoor', 'dwelling'], th: ['binnenshuis'], args: ['binnen', 'keten', 'lfnnorm'] },
    { w: ['norm', 'normen', 'grenswaarde', 'db(a)', 'dba', 'a-weging', 'db(c)', 'db(g)', 'lden', 'wet', 'regel', 'limiet', 'weighting', 'denemarken', 'deens'], th: ['normen'], args: ['dba', 'lfnnorm'] },
    { w: ['model', 'berekening', 'berekenen', 'rekenmodel', 'akoestisch onderzoek', 'iso 9613', 'nord2000', 'voorspel', 'prediction', 'onderschat'], th: ['rekenmodellen'], args: ['rekenmodel', 'verspreiding', 'keten'] },
    { w: ['meting', 'meten', 'gemeten', 'measurement', 'monitoring', 'handhav'], th: ['meetmethoden'], args: ['rekenmodel', 'binnen'] },
    { w: ['pulser', 'zoev', 'swish', 'bonk', 'ritm', 'amplitudemodulatie', 'modulatie', 'amplitude modulation', 'kloppen', 'dreunen'], th: ['geluidskarakter'], args: ['pulserend', 'nacht', 'tonen'] },
    { w: ['toon', 'tonen', 'tonaal', 'generator', 'tone', 'tonal', 'zoem'], th: ['geluidskarakter'], args: ['tonen'] },
    { w: ['trilling', 'trillen', 'vibrat', 'ratel', 'rammel', 'seism', 'bodem', 'grond'], th: ['trillingen'], args: ['trilling'] },
    { w: ['meerdere turbines', 'windpark', 'opstelling', 'samenloop', 'cumulatie', 'cumulatief', 'heuvel', 'wake', 'rij'], th: ['verspreiding'], args: ['samenloop'] },
    { w: ['laboratorium', 'lab', 'experiment', 'realistisch', 'nagebootst'], th: [], args: ['pulserend', 'langetermijn'] }
  ];
  const norm = t => ' ' + String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9()\- ]+/g, ' ').replace(/\s+/g, ' ') + ' ';
  const STOP = new Set('de het een en van in op te dat die is zijn met voor niet aan er ook als bij door om tot naar wordt worden kan kunnen meer dan maar of uit nog wel geen hun hij zij wij ik je we ze ons onze mijn dit deze al zo veel heel moet moeten omdat waardoor want daarom the and of to in is are for with on by that this from'.split(' '));
  function analyse(text) {
    const t = norm(text);
    const hits = LEX.filter(l => l.w.some(w => t.includes(norm(w).trim().length > 3 ? norm(w).trim() : norm(w))));
    const words = [...new Set(t.trim().split(' ').filter(w => w.length > 3 && !STOP.has(w)))];
    const terms = [...new Set(hits.flatMap(l => l.w).concat(words))].map(w => norm(w).trim()).filter(w => w.length > 2);
    const themes = new Set(hits.flatMap(l => l.th));
    const argScore = {};
    hits.forEach(l => l.args.forEach((id, k) => { argScore[id] = (argScore[id] || 0) + (k === 0 ? 3 : 2); }));
    ARGS.forEach(a => { const hay = norm(a.titel + ' ' + a.kern); words.forEach(w => { if (hay.includes(' ' + w)) argScore[a.id] = (argScore[a.id] || 0) + 1; }); });
    const args = ARGS.filter(a => argScore[a.id] >= 2).sort((x, y) => argScore[y.id] - argScore[x.id]).slice(0, 5);
    const usedIds = new Set(args.flatMap(a => a.steun.map(x => String(x.id))));
    const scoreStudy = s => {
      const hay = norm(s.titel + ' ' + s.bevinding + ' ' + (s.uitkomst || ''));
      let sc = 0; terms.forEach(w => { if (hay.includes(w.length <= 4 ? ' ' + w : w)) sc += 1; });
      (s.themas || []).forEach(th => { if (themes.has(th)) sc += 2; });
      if (usedIds.has(String(s.id))) sc += 3;
      if (s.kern) sc += 1.5;
      sc += { A: 1.5, B: 0.75, C: 0 }[s.relevantie] || 0;
      return sc;
    };
    const scored = S.map(s => ({ s, sc: scoreStudy(s) })).filter(x => x.sc >= 4.5).sort((a, b) => b.sc - a.sc);
    const steun = scored.filter(x => isNeg(x.s.richting)).slice(0, 10).map(x => x.s);
    const contra = scored.filter(x => isContra(x.s.richting)).slice(0, 6).map(x => x.s);
    const verweer = []; const seen = new Set();
    args.forEach(a => a.verweer.forEach(v => { if (!seen.has(v.claim)) { seen.add(v.claim); verweer.push({ claim: v.claim, studies: v.studies, weerlegging: v.weerlegging, bron: a.titel }); } }));
    const contraIds = new Set(contra.map(s => String(s.id)).concat(verweer.flatMap(v => v.studies.map(String))));
    const vers = VERWEER.map((v, i) => ({ v, i })).filter(({ v }) => v.ids.some(id => contraIds.has(String(id))) || terms.filter(w => w.length > 4 && norm(v.naam + ' ' + v.wat + ' ' + v.bevinding).includes(w)).length >= 2).slice(0, 4);
    return { hits, args, steun, contra, verweer: verweer.slice(0, 6), vers, themes: [...themes] };
  }
  function conceptTekst(titel, eigen, steunIds) {
    const studs = steunIds.map(get).filter(Boolean);
    const cite = s => `${s.auteurs.replace(/ et al\.$/, ' et al.')}, ${s.jaar || 'z.j.'}`;
    let t = eigen.trim().replace(/\s+$/, '');
    if (t && !/[.!?]$/.test(t)) t += '.';
    if (studs.length) {
      t += ' Dit wordt ondersteund door peer-reviewed onderzoek. ' + studs.map(s => { const pu = puntVoor(s); return `${pu.replace(/\.$/, '')} (${cite(s)}).`; }).join(' ');
    }
    t += ' Indiener verzoekt het bevoegd gezag dit punt expliciet te betrekken bij de beoordeling en gemotiveerd aan te geven waarom het niet tot een andere afweging leidt.';
    return t;
  }
  function puntVoor(s) {
    let p = s.bevinding;
    for (const a of ARGS) { const x = a.steun.find(y => String(y.id) === String(s.id)); if (x) { p = x.punt.replace(/^(Schakel \d – [^:]+: |Uitkomst: |Gezondheid: )/, ''); break; } }
    return p.charAt(0).toUpperCase() + p.slice(1);
  }
  function renderEigen(editIdx) {
    const ed = editIdx != null && st.eigen[+editIdx] ? st.eigen[+editIdx] : null;
    main.innerHTML = `
      <a class="backlink" href="#/argumenten">← Alle argumenten</a>
      <div class="page-head"><div><div class="eyebrow">Module 3 · Eigen argument</div><h1>Toets je eigen argument</h1><p>Schrijf je argument in gewone taal, bijvoorbeeld: “In mijn slaapkamer hoor ik ’s nachts een brommende toon, ook met de ramen dicht.” De app zoekt de passende argumenten, de studies die je argument steunen, het verweer dat je kunt verwachten en de weerlegging daarvan.</p></div></div>
      <div class="two-col">
        <div>
          <div class="card">
            <div class="field"><label for="eTitel">Titel van je argument</label><input id="eTitel" type="text" placeholder="Bijv. Laagfrequent geluid in de slaapkamer" value="${esc(ed ? ed.titel : '')}"></div>
            <div class="field" style="margin-top:12px"><label for="eTekst">Je argument</label><textarea id="eTekst" rows="6" placeholder="Beschrijf wat je wilt aanvoeren en waarom.">${esc(ed ? ed.eigen : '')}</textarea></div>
            <div class="btn-row" style="margin-top:12px"><button class="btn btn-primary" id="eZoek">Zoek onderbouwing en verweer</button>${ed ? '<a class="btn" href="#/argumenten/eigen">Nieuw argument</a>' : ''}</div>
            <p class="xs muted" style="margin-top:10px">De app werkt met trefwoorden in het Nederlands en Engels en zoekt in alle ${S.length} studies. Controleer altijd zelf of een studie werkelijk past bij je argument; de samenvattingen zijn gebaseerd op de abstracts.</p>
          </div>
          <div id="eRes"></div>
        </div>
        <aside><div class="card"><h2>Opgeslagen eigen argumenten</h2><div id="eList"></div></div></aside>
      </div>`;
    const list = () => {
      $('#eList').innerHTML = st.eigen.length ? `<ul class="list-check">${st.eigen.map((e, i) => `<li><span style="flex:1"><b>${esc(e.titel)}</b><br><span class="xs muted">${e.steun.length} studies · ${e.verweer.length} weerleggingen</span></span><a class="cell-btn" href="#/argumenten/eigen/${i}">bewerken</a> <button class="cell-btn" data-edel="${i}" title="Verwijderen">×</button></li>`).join('')}</ul><p class="xs muted" style="margin-top:8px">Opgeslagen argumenten gaan automatisch mee in de <a href="#/export">Word-export</a>. Ze worden alleen in deze browser bewaard.</p>` : '<p class="small muted">Nog geen eigen argumenten. Na het zoeken kun je je argument met de gekozen onderbouwing opslaan.</p>';
    };
    $('#eList').addEventListener('click', e => { const b = e.target.closest('[data-edel]'); if (!b) return; st.eigen.splice(+b.dataset.edel, 1); save(); list(); toast('Eigen argument verwijderd'); });
    list();
    const run = () => {
      const titel = $('#eTitel').value.trim(), tekst = $('#eTekst').value.trim();
      if (tekst.length < 10) { toast('Schrijf eerst je argument (minimaal een zin)'); $('#eTekst').focus(); return; }
      const r = analyse(titel + ' ' + tekst);
      const pre = ed ? new Set(ed.steun.map(String)) : null;
      const chk = s => pre ? pre.has(String(s.id)) : r.steun.indexOf(s) < 5;
      const studItem = (s, box) => `<li>${box ? `<input type="checkbox" class="eStud" value="${s.id}" ${chk(s) ? 'checked' : ''} aria-label="Gebruik deze studie">` : ''}<div style="flex:1"><div>${esc(puntVoor(s))}</div><div class="who">${relBadge(s.relevantie)} ${dirBadge(s.richting)} <b>${esc(s.auteurs)} (${s.jaar || 'z.j.'})</b> · ${esc(s.tijdschrift)} · <button class="cell-btn" data-detail="${s.id}">details</button> <a href="${esc(s.link)}" target="_blank" rel="noopener">bron ↗</a></div></div></li>`;
      if (!r.args.length && !r.steun.length) { $('#eRes').innerHTML = '<div class="section empty">Er is geen passend onderzoek gevonden. Probeer andere woorden, bijvoorbeeld “slaap”, “binnenshuis”, “gehoordrempel”, “afstand” of “dB(A)-norm”.</div>'; return; }
      $('#eRes').innerHTML = `
        <div class="section card"><h2>Herkende onderwerpen</h2><div class="chips">${r.hits.map(h => `<span class="chip on" style="cursor:default">${esc(h.w[0])}</span>`).join('') || '<span class="small muted">Geen vaste onderwerpen herkend; gezocht op losse woorden.</span>'}</div>
          ${r.args.length ? `<h3 style="margin-top:16px">Passende uitgewerkte argumenten</h3><ul class="list-check">${r.args.map(a => `<li>${strBadge(a.sterkte)} <a href="#/argumenten/${a.id}">${esc(a.titel)}</a></li>`).join('')}</ul><p class="xs muted">Deze argumenten kun je ook in zijn geheel opnemen in je export.</p>` : ''}</div>
        <div class="section"><h2>Onderbouwing uit het onderzoek</h2><p class="small muted">Studies met een nadelig of gemengd effect, of algemeen onderzoek dat je bezwaar ondersteunt. Vink aan welke je wilt gebruiken.</p>
          ${r.steun.length ? `<ul class="evidence pick">${r.steun.map(s => studItem(s, true)).join('')}</ul>` : '<div class="empty">Geen ondersteunende studies gevonden.</div>'}</div>
        <div class="section card"><h2>Verwacht verweer en weerlegging</h2>
          ${r.verweer.map(v => `<div class="rebut"><div class="claim">${esc(v.claim)}</div>${v.studies.length ? `<div class="xs muted" style="margin-bottom:8px">Bron verweer: ${v.studies.map(get).filter(Boolean).map(s => `<button class="cell-btn" data-detail="${s.id}">${esc(s.auteurs)} (${s.jaar || 'z.j.'})</button>`).join(', ')}</div>` : ''}<div class="answer small">${esc(v.weerlegging)}</div><div class="xs muted" style="margin-top:6px">Uit argument: ${esc(v.bron)}</div></div>`).join('') || '<p class="small muted">Geen voorbereid verweer gevonden bij dit onderwerp.</p>'}
          ${r.vers.length ? `<h3 style="margin-top:16px">Tegenstudies die je kunt verwachten</h3>${r.vers.map(({ v }) => `<div class="rebut"><div class="claim">${esc(v.naam)}: ${esc(v.bevinding)}</div><div class="answer small">${esc(v.weerwoord)}</div></div>`).join('')}` : ''}
          ${r.contra.length ? `<h3 style="margin-top:16px">Andere studies die de tegenpartij kan aanhalen</h3><p class="xs muted">Studies zonder of met beperkt effect. Lees ze, zodat je niet verrast wordt.</p><ul class="evidence">${r.contra.map(s => studItem(s, false).replace('<li>', '<li class="contra">')).join('')}</ul>` : ''}
        </div>
        <div class="section card"><h2>Concepttekst</h2><p class="small muted">Je eigen tekst, aangevuld met de aangevinkte studies. Pas de tekst gerust aan voordat je opslaat.</p>
          <textarea id="eConcept" rows="9"></textarea>
          <div class="btn-row" style="margin-top:12px"><button class="btn btn-primary" id="eSave">${ed ? 'Wijzigingen opslaan' : 'Opslaan en opnemen in export'}</button><button class="btn" data-copy="eConcept">Kopieer tekst</button><button class="btn" id="eRegen">Concepttekst opnieuw maken</button></div></div>`;
      const ids = () => $$('.eStud').filter(c => c.checked).map(c => c.value);
      const regen = () => { $('#eConcept').value = conceptTekst(titel, tekst, ids()); };
      if (ed && ed.tekst && ed.eigen === tekst) $('#eConcept').value = ed.tekst; else regen();
      $$('.eStud').forEach(c => c.addEventListener('change', regen));
      $('#eRegen').onclick = regen;
      $('#eSave').onclick = () => {
        const rec = { titel: titel || tekst.slice(0, 60) + (tekst.length > 60 ? '…' : ''), eigen: tekst, tekst: $('#eConcept').value.trim(), steun: ids(), verweer: r.verweer.map(v => ({ claim: v.claim, studies: v.studies, weerlegging: v.weerlegging })) };
        if (ed) st.eigen[+editIdx] = rec; else st.eigen.push(rec);
        save(); list(); toast(ed ? 'Eigen argument bijgewerkt' : 'Eigen argument opgeslagen en opgenomen in export');
        if (!ed) location.hash = '#/argumenten/eigen/' + (st.eigen.length - 1);
      };
    };
    $('#eZoek').onclick = run;
    if (ed) run();
  }
  function evidenceItem(x, contra) {
    const s = get(x.id); if (!s) return '';
    return `<li class="${contra ? 'contra' : ''}"><div>${esc(x.punt || s.bevinding)}</div><div class="who">${relBadge(s.relevantie)} <b>${esc(s.auteurs)} (${s.jaar || 'z.j.'})</b> · ${esc(s.tijdschrift)} · <button class="cell-btn" data-detail="${s.id}">details</button> <a href="${esc(s.link)}" target="_blank" rel="noopener">bron ↗</a></div></li>`;
  }
  function renderArgument(id) {
    const idx = ARGS.findIndex(a => a.id === id); const a = ARGS[idx];
    if (!a) { location.hash = '#/argumenten'; return; }
    const sel = st.args.includes(a.id);
    const lok = lokaleAlinea(st.project);
    const prev = ARGS[idx - 1], next = ARGS[idx + 1];
    main.innerHTML = `
      <a class="backlink" href="#/argumenten">← Alle argumenten</a>
      <div class="page-head"><div><div class="eyebrow">Argument ${idx + 1} van ${ARGS.length}</div><h1>${esc(a.titel)}</h1><p>${esc(a.kern)}</p></div>
        <div class="btn-row"><button class="btn ${sel ? 'on' : 'btn-primary'}" id="argSel">${sel ? '✓ In selectie voor export' : '+ Opnemen in export'}</button></div></div>
      <div class="two-col">
        <div>
          <div class="card"><div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">${strBadge(a.sterkte)}<span class="small muted">${esc(a.sterkte_uitleg)}</span></div>
            <h2 style="margin-top:12px">Tekstblok voor zienswijze of beroep</h2>
            <div class="textblock" id="tb">${esc(a.tekst)}${lok ? '\n\n' + esc(lok) : ''}</div>
            <div class="btn-row" style="margin-top:12px"><button class="btn btn-sm" data-copy="tb">Kopieer tekst</button><button class="btn btn-sm" id="copyRefs">Kopieer met literatuurlijst</button></div>
            ${lok ? '' : `<p class="xs muted" style="margin-top:12px">Tip: vul bij <a href="#/export">Export</a> of via de <a href="#/kaart">Kaart</a> de projectgegevens in. Dan wordt hier automatisch een alinea over de afstand tot woningen toegevoegd.</p>`}
          </div>
          <div class="section"><h2>Onderbouwing</h2><ul class="evidence">${a.steun.map(x => evidenceItem(x)).join('')}</ul>
            ${a.extern && a.extern.length ? `<p class="extern" style="margin-top:12px"><b>Aanvullende bronnen:</b> ${a.extern.map(e => `<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.label)}</a>`).join(' · ')}</p>` : ''}</div>
        </div>
        <aside>
          <div class="card"><h2>Verwacht verweer en weerlegging</h2>
            ${a.verweer.map(v => `<div class="rebut"><div class="claim">${esc(v.claim)}</div>${v.studies.length ? `<div class="xs muted" style="margin-bottom:8px">Bron verweer: ${v.studies.map(i => get(i)).filter(Boolean).map(s => `<button class="cell-btn" data-detail="${s.id}">${esc(s.auteurs)} (${s.jaar || 'z.j.'})</button>`).join(', ')}</div>` : ''}<div class="answer small">${esc(v.weerlegging)}</div></div>`).join('')}
            <a class="btn btn-sm" href="#/verweer">Alle tegenstudies bekijken</a>
          </div>
        </aside>
      </div>
      <div class="section btn-row" style="justify-content:space-between">${prev ? `<a class="btn" href="#/argumenten/${prev.id}">← ${esc(prev.titel)}</a>` : '<span></span>'}${next ? `<a class="btn" href="#/argumenten/${next.id}">${esc(next.titel)} →</a>` : ''}</div>`;
    $('#argSel').onclick = () => { const on = toggleIn(st.args, a.id); save(); const b = $('#argSel'); b.classList.toggle('on', on); b.classList.toggle('btn-primary', !on); b.textContent = on ? '✓ In selectie voor export' : '+ Opnemen in export'; toast(on ? 'Argument opgenomen in export' : 'Argument verwijderd uit export'); };
    $('#copyRefs').onclick = () => { const refs = argRefs(a).map(fullCite).join('\n'); copy($('#tb').innerText + '\n\nLiteratuur\n' + refs); };
  }
  function argRefs(a) {
    const ids = []; a.steun.forEach(x => ids.push(String(x.id)));
    return [...new Set(ids)].map(get).filter(Boolean).sort((x, y) => x.auteurs.localeCompare(y.auteurs));
  }

  /* ---------- VERWEER ---------- */
  function renderVerweer() {
    main.innerHTML = `
      <div class="page-head"><div><div class="eyebrow">Module 4</div><h1>Verweer voorbereiden</h1><p>Deze studies worden het vaakst aangehaald door initiatiefnemers, adviesbureaus en overheden om te stellen dat windturbines geen gezondheidsrisico opleveren. Per studie: wat er werkelijk is onderzocht, de zwakke punten en jouw weerwoord.</p></div></div>
      <div class="grid grid-2" id="vgrid">${VERWEER.map((v, i) => {
        const sel = st.verweer.includes(i);
        const studs = v.ids.map(get).filter(Boolean);
        const extra = (v.refs_extra || []).map(get).filter(Boolean);
        return `<article class="card"><div class="eyebrow">Tegenstudie</div><h2>${esc(v.naam)}</h2>
          <p class="small"><b>Wat is onderzocht:</b> ${esc(v.wat)}</p>
          <p class="small"><b>Bevinding:</b> ${esc(v.bevinding)}</p>
          <p class="small" style="margin-bottom:4px"><b>Zwakke punten:</b></p><ul class="zwak">${v.zwakten.map(z => `<li>${esc(z)}</li>`).join('')}</ul>
          <div class="textblock" id="vw${i}" style="font-size:1rem">${esc(v.weerwoord)}</div>
          <p class="xs muted" style="margin-top:10px">Studie: ${studs.map(s => `<button class="cell-btn" data-detail="${s.id}">${esc(s.auteurs)} (${s.jaar || 'z.j.'})</button>`).join(', ')}${extra.length ? ` · Ondersteunend weerwoord: ${extra.map(s => `<button class="cell-btn" data-detail="${s.id}">${esc(s.auteurs)} (${s.jaar || 'z.j.'})</button>`).join(', ')}` : ''}${v.extern ? ` · <a href="${esc(v.extern.url)}" target="_blank" rel="noopener">${esc(v.extern.label)}</a>` : ''}</p>
          <div class="btn-row" style="margin-top:10px"><button class="btn btn-sm" data-copy="vw${i}">Kopieer weerwoord</button><button class="btn btn-sm ${sel ? 'on' : ''}" data-vsel="${i}">${sel ? '✓ In export' : '+ Opnemen in export'}</button></div></article>`;
      }).join('')}</div>`;
    $('#vgrid').addEventListener('click', e => { const b = e.target.closest('[data-vsel]'); if (!b) return; const i = Number(b.dataset.vsel); const on = toggleIn(st.verweer, i); save(); b.classList.toggle('on', on); b.textContent = on ? '✓ In export' : '+ Opnemen in export'; toast(on ? 'Weerwoord opgenomen in export' : 'Weerwoord verwijderd uit export'); });
  }

  /* ---------- KAART ---------- */
  let mapInstance = null;
  function haversine(a, b) { const R = 6371000, t = x => x * Math.PI / 180; const dLat = t(b[0] - a[0]), dLon = t(b[1] - a[1]); const h = Math.sin(dLat / 2) ** 2 + Math.cos(t(a[0])) * Math.cos(t(b[0])) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); }
  function renderKaart() {
    main.innerHTML = `
      <div class="page-head"><div><div class="eyebrow">Module 6</div><h1>Kaart: afstand tot woningen</h1><p>Zoek een adres, kies wat je wilt plaatsen en klik op de kaart. De app berekent de afstand van elke woning tot de dichtstbijzijnde turbine en toont welke studies bij die afstand nadelige effecten vonden.</p></div></div>
      <div class="map-tools">
        <div class="searchbox"><input type="search" id="geo" placeholder="Zoek adres of plaats (Nederland)" autocomplete="off" aria-label="Adres zoeken"><div class="suggest" id="sug" hidden></div></div>
        <div class="btn-row" role="group" aria-label="Plaatsen"><button class="btn on" data-mode="turbine">Turbine plaatsen</button><button class="btn" data-mode="home">Woning plaatsen</button></div>
        <label class="small" style="display:flex;align-items:center;gap:6px">Tiphoogte (m) <input type="number" id="tip" style="width:90px" min="50" max="400" value="${esc(st.project.tiphoogte || 250)}"></label>
        <button class="btn btn-sm" id="clearMap">Alles wissen</button>
      </div>
      <div class="map-layout"><div id="map" role="application" aria-label="Kaart"></div><aside id="homes"></aside></div>
      <p class="xs muted" style="margin-top:12px">Ringen rond turbines: 500 m, 1 km, 1,5 km en 2 km. Kaartgegevens © OpenStreetMap-bijdragers; adreszoeker: PDOK Locatieserver. Afstanden zijn hemelsbreed.</p>`;
    let mode = 'turbine';
    const map = L.map('map', { zoomControl: true }).setView(st.map.center || [52.045, 4.95], st.map.zoom || 13);
    mapInstance = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    const layer = L.layerGroup().addTo(map);
    const tIcon = L.divIcon({ className: 'turbine-icon', html: '<svg width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" fill="#9A3B1E" stroke="#fff" stroke-width="2"/><path d="M14 14 14 5M14 14l7.8 4.5M14 14l-7.8 4.5" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>', iconSize: [28, 28], iconAnchor: [14, 14] });
    const hIcon = L.divIcon({ className: 'home-icon', html: '<svg width="26" height="26" viewBox="0 0 26 26"><circle cx="13" cy="13" r="11" fill="#1F3A5F" stroke="#fff" stroke-width="2"/><path d="M8 13.5 13 9l5 4.5V18H8z" fill="#fff"/></svg>', iconSize: [26, 26], iconAnchor: [13, 13] });
    function draw() {
      layer.clearLayers();
      st.map.turbines.forEach((t, i) => {
        [500, 1000, 1500, 2000].forEach(r => L.circle(t, { radius: r, color: '#9A3B1E', weight: 1, opacity: .6, fill: r === 500, fillOpacity: .05, dashArray: r === 500 ? null : '4 4', interactive: false }).addTo(layer));
        const m = L.marker(t, { icon: tIcon, draggable: true, title: `Turbine ${i + 1}` }).addTo(layer).bindTooltip(`Turbine ${i + 1}`);
        m.on('dragend', e => { const p = e.target.getLatLng(); st.map.turbines[i] = [p.lat, p.lng]; save(); draw(); });
        m.on('contextmenu', () => { st.map.turbines.splice(i, 1); save(); draw(); });
      });
      st.map.homes.forEach((h, i) => {
        const m = L.marker(h.ll, { icon: hIcon, draggable: true, title: h.naam }).addTo(layer).bindTooltip(h.naam);
        m.on('dragend', e => { const p = e.target.getLatLng(); st.map.homes[i].ll = [p.lat, p.lng]; save(); draw(); });
        m.on('contextmenu', () => { st.map.homes.splice(i, 1); save(); draw(); });
        const d = nearest(h.ll); if (d) L.polyline([h.ll, st.map.turbines[d.i]], { color: '#1F3A5F', weight: 1.5, dashArray: '3 5' }).addTo(layer);
      });
      drawHomes();
    }
    function nearest(ll) { let best = null; st.map.turbines.forEach((t, i) => { const d = haversine(ll, t); if (!best || d < best.d) best = { d, i }; }); return best; }
    function drawHomes() {
      const tip = Number($('#tip').value) || null;
      const box = $('#homes');
      if (!st.map.turbines.length && !st.map.homes.length) { box.innerHTML = '<div class="empty">Plaats eerst een of meer turbines en daarna de woningen die je wilt beoordelen.<br><br><span class="xs">Slepen verplaatst een punt; rechtsklik verwijdert het.</span></div>'; return; }
      const list = st.map.homes.map((h, i) => ({ h, i, n: nearest(h.ll) })).filter(x => x.n).sort((a, b) => a.n.d - b.n.d);
      box.innerHTML = `<div class="card" style="padding:16px;margin-bottom:12px"><b>${st.map.turbines.length}</b> turbine${st.map.turbines.length === 1 ? '' : 's'} · <b>${st.map.homes.length}</b> woning${st.map.homes.length === 1 ? '' : 'en'}${list.length ? `<div class="btn-row" style="margin-top:10px"><button class="btn btn-sm btn-primary" id="useDist">Gebruik ${fmtM(list[0].n.d)} in projectgegevens</button></div>` : ''}</div>` +
        (list.length ? list.map(({ h, i, n }) => {
          const steun = AFSTAND.filter(a => a.richting === 'steun' && a.max_m && n.d <= a.max_m).map(a => ({ a, s: get(a.id) })).filter(x => x.s);
          const contra = AFSTAND.filter(a => a.richting === 'verweer' && a.max_m && n.d <= a.max_m).map(a => ({ a, s: get(a.id) })).filter(x => x.s);
          return `<div class="home-item"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><input type="text" value="${esc(h.naam)}" data-hname="${i}" aria-label="Naam woning" style="max-width:60%"><span class="dist">${fmtM(n.d)}</span></div>
            <div class="xs muted" style="margin-top:4px">tot turbine ${n.i + 1}${tip ? ` · ${(n.d / tip).toLocaleString('nl-NL', { maximumFractionDigits: 1 })}× tiphoogte` : ''}</div>
            ${steun.length ? `<ul class="anchors">${steun.map(x => `<li>● ${esc(x.a.label)} – <button class="cell-btn" data-detail="${x.s.id}">${esc(shortCite(x.s))}</button></li>`).join('')}</ul>` : '<p class="xs muted" style="margin:8px 0 0">Buiten de afstanden van de woonstudies met een nadelig effect. Recent onderzoek wijst er wel op dat infrageluid verder reikt dan modellen voorspellen (Mattsson et al., 2026).</p>'}
            ${contra.length ? `<details class="xs" style="margin-top:6px"><summary class="muted">Verwacht verweer bij deze afstand (${contra.length})</summary><ul class="anchors">${contra.map(x => `<li class="contra">${esc(x.a.label)} – <button class="cell-btn" data-detail="${x.s.id}">${esc(shortCite(x.s))}</button></li>`).join('')}</ul></details>` : ''}
            <div class="btn-row" style="margin-top:8px"><button class="btn btn-sm" data-htext="${i}">Kopieer alinea</button></div></div>`;
        }).join('') : '<div class="empty small">Plaats nu de woningen.</div>');
      const u = $('#useDist'); if (u) u.onclick = () => { st.project.afstand = String(Math.round(list[0].n.d)); st.project.tiphoogte = $('#tip').value; st.project.aantal = String(st.map.turbines.length); save(); toast('Afstand opgeslagen in projectgegevens'); };
      $$('[data-hname]', box).forEach(inp => inp.addEventListener('change', e => { st.map.homes[+e.target.dataset.hname].naam = e.target.value; save(); draw(); }));
      $$('[data-htext]', box).forEach(b => b.addEventListener('click', () => { const x = list.find(l => l.i === +b.dataset.htext); const p = Object.assign({}, st.project, { tiphoogte: $('#tip').value, aantal: String(st.map.turbines.length) }); copy(`${x.h.naam}: ` + lokaleAlinea(p, x.n.d)); }));
    }
    map.on('click', e => {
      const ll = [e.latlng.lat, e.latlng.lng];
      if (mode === 'turbine') st.map.turbines.push(ll); else st.map.homes.push({ ll, naam: `Woning ${st.map.homes.length + 1}` });
      save(); draw();
    });
    map.on('moveend', () => { const c = map.getCenter(); st.map.center = [c.lat, c.lng]; st.map.zoom = map.getZoom(); save(); });
    $$('[data-mode]').forEach(b => b.addEventListener('click', () => { mode = b.dataset.mode; $$('[data-mode]').forEach(x => x.classList.toggle('on', x === b)); }));
    $('#tip').addEventListener('change', e => { st.project.tiphoogte = e.target.value; save(); drawHomes(); });
    $('#clearMap').onclick = () => { if (confirm('Alle turbines en woningen van de kaart wissen?')) { st.map.turbines = []; st.map.homes = []; save(); draw(); } };
    // PDOK geocoder
    let gt; const sug = $('#sug');
    $('#geo').addEventListener('input', e => {
      clearTimeout(gt); const q = e.target.value.trim(); if (q.length < 3) { sug.hidden = true; return; }
      gt = setTimeout(async () => {
        try {
          const r = await fetch(`https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?rows=6&fl=weergavenaam,centroide_ll,type&q=${encodeURIComponent(q)}`);
          const j = await r.json(); const docs = (j.response && j.response.docs) || [];
          sug.innerHTML = docs.map(d => { const m = /POINT\(([-\d.]+) ([-\d.]+)\)/.exec(d.centroide_ll || ''); return m ? `<button data-ll="${m[2]},${m[1]}" data-type="${esc(d.type)}">${esc(d.weergavenaam)}</button>` : ''; }).join('') || '<button disabled>Geen resultaten</button>';
          sug.hidden = false;
        } catch (err) { sug.innerHTML = '<button disabled>Adreszoeker niet bereikbaar</button>'; sug.hidden = false; }
      }, 250);
    });
    sug.addEventListener('click', e => { const b = e.target.closest('[data-ll]'); if (!b) return; const [la, lo] = b.dataset.ll.split(',').map(Number); map.setView([la, lo], /adres/.test(b.dataset.type) ? 17 : 14); sug.hidden = true; $('#geo').value = b.textContent; });
    draw();
    setTimeout(() => map.invalidateSize(), 50);
  }

  /* ---------- EXPORT ---------- */
  function renderExport() {
    const p = st.project;
    const selStudies = st.studies.map(get).filter(Boolean);
    main.innerHTML = `
      <div class="page-head"><div><div class="eyebrow">Module 5</div><h1>Export naar Word</h1><p>Stel een bijlage samen voor je zienswijze of beroepschrift. De bijlage bevat de gekozen argumenten met tekstblokken, weerleggingen, een tabel met kernbevindingen, een literatuurlijst en een verantwoording van de methode.</p></div></div>
      <div class="two-col">
        <div>
          <div class="card"><h2>Projectgegevens</h2><p class="small muted">Optioneel. Hiermee wordt een alinea over de afstand tot woningen aan elk argument toegevoegd. Je kunt de afstand ook via de <a href="#/kaart">Kaart</a> laten berekenen.</p>
            <div class="form-grid">
              <div class="field"><label for="p_naam">Naam project</label><input id="p_naam" type="text" value="${esc(p.naam)}" placeholder="Bijv. Windpark ..."></div>
              <div class="field"><label for="p_gezag">Bevoegd gezag</label><input id="p_gezag" type="text" value="${esc(p.gezag)}" placeholder="Bijv. college van B&W van ..."></div>
              <div class="field"><label for="p_aantal">Aantal turbines</label><input id="p_aantal" type="number" min="1" value="${esc(p.aantal)}"></div>
              <div class="field"><label for="p_tip">Tiphoogte (m)</label><input id="p_tip" type="number" min="1" value="${esc(p.tiphoogte)}"></div>
              <div class="field"><label for="p_afst">Afstand dichtstbijzijnde woning (m)</label><input id="p_afst" type="number" min="1" value="${esc(p.afstand)}"></div>
              <div class="field"><label for="p_won">Woningen binnen 1 km</label><input id="p_won" type="number" min="0" value="${esc(p.woningen)}"></div>
            </div>
            <div class="field" style="margin-top:12px"><span class="lbl">Voorbeeld lokale alinea</span><div class="textblock small" id="lokPrev" style="font-size:.95rem">${esc(lokaleAlinea(p) || 'Vul de afstand in om de alinea te zien.')}</div></div>
          </div>
          <div class="card section"><h2>Argumenten</h2><p class="small muted">Vink de argumenten aan die je wilt opnemen. Volgorde: zoals hieronder.</p>
            <div class="btn-row" style="margin-bottom:10px"><button class="btn btn-sm" id="allSterk">Alle sterke argumenten</button><button class="btn btn-sm" id="allArgs">Alles</button><button class="btn btn-sm" id="noArgs">Niets</button></div>
            <ul class="list-check">${ARGS.map(a => `<li><input type="checkbox" id="ea_${a.id}" data-arg="${a.id}" ${st.args.includes(a.id) ? 'checked' : ''}><label for="ea_${a.id}">${strBadge(a.sterkte)} ${esc(a.titel)}</label></li>`).join('')}</ul></div>
          <div class="card section"><h2>Eigen argumenten (${st.eigen.length})</h2>
            ${st.eigen.length ? `<ul class="list-check">${st.eigen.map((e, i) => `<li><span style="flex:1">${esc(e.titel)} <span class="xs muted">· ${e.steun.length} studies</span></span><a class="cell-btn" href="#/argumenten/eigen/${i}">bewerken</a></li>`).join('')}</ul><p class="xs muted">Opgeslagen eigen argumenten worden altijd opgenomen, na de gekozen argumenten.</p>` : '<p class="small muted">Nog geen eigen argumenten. <a href="#/argumenten/eigen">Schrijf en toets je eigen argument</a>.</p>'}</div>
          <div class="card section"><h2>Weerleggingen van tegenstudies</h2>
            <ul class="list-check">${VERWEER.map((v, i) => `<li><input type="checkbox" id="ev_${i}" data-ver="${i}" ${st.verweer.includes(i) ? 'checked' : ''}><label for="ev_${i}">${esc(v.naam)}</label></li>`).join('')}</ul></div>
        </div>
        <aside>
          <div class="card"><h2>Opties</h2>
            <ul class="list-check">
              <li><input type="checkbox" id="o_ver" checked><label for="o_ver">Per argument het verwachte verweer en de weerlegging opnemen</label></li>
              <li><input type="checkbox" id="o_tab" checked><label for="o_tab">Tabel met kernbevindingen</label></li>
              <li><input type="checkbox" id="o_lit" checked><label for="o_lit">Literatuurlijst</label></li>
              <li><input type="checkbox" id="o_met" checked><label for="o_met">Verantwoording van de methode</label></li>
            </ul>
            <div class="btn-row" style="margin-top:16px"><button class="btn btn-primary" id="dl">Download Word-bestand</button><button class="btn" id="cpAll">Kopieer als tekst</button></div>
            <p class="xs muted" style="margin-top:10px" id="sumLine"></p>
          </div>
          <div class="card section"><h2>Geselecteerde studies (${selStudies.length})</h2>
            ${selStudies.length ? `<ul class="list-check">${selStudies.map(s => `<li><button class="cell-btn" data-sel="${s.id}" title="Verwijderen">×</button><span>${esc(s.auteurs)} (${s.jaar || 'z.j.'}) – ${esc(s.titel)}</span></li>`).join('')}</ul>` : '<p class="small muted">Nog geen losse studies geselecteerd. Gebruik “+ Selectie” bij <a href="#/studies">Studies</a>. Studies uit de gekozen argumenten worden automatisch opgenomen.</p>'}
          </div>
        </aside>
      </div>`;
    const bind = (id, k) => $('#' + id).addEventListener('input', e => { st.project[k] = e.target.value; save(); $('#lokPrev').textContent = lokaleAlinea(st.project) || 'Vul de afstand in om de alinea te zien.'; });
    [['p_naam', 'naam'], ['p_gezag', 'gezag'], ['p_aantal', 'aantal'], ['p_tip', 'tiphoogte'], ['p_afst', 'afstand'], ['p_won', 'woningen']].forEach(x => bind(...x));
    const sum = () => { $('#sumLine').textContent = `${st.args.length} argument(en), ${st.eigen.length} eigen argument(en), ${st.verweer.length} weerlegging(en), ${st.studies.length} losse studie(s) geselecteerd.`; };
    $$('[data-arg]').forEach(c => c.addEventListener('change', e => { const id = e.target.dataset.arg; if (e.target.checked && !st.args.includes(id)) st.args.push(id); if (!e.target.checked) st.args = st.args.filter(x => x !== id); st.args.sort((a, b) => ARGS.findIndex(x => x.id === a) - ARGS.findIndex(x => x.id === b)); save(); sum(); }));
    $$('[data-ver]').forEach(c => c.addEventListener('change', e => { const i = +e.target.dataset.ver; if (e.target.checked && !st.verweer.includes(i)) st.verweer.push(i); if (!e.target.checked) st.verweer = st.verweer.filter(x => x !== i); save(); sum(); }));
    const setArgs = ids => { st.args = ids; save(); $$('[data-arg]').forEach(c => c.checked = ids.includes(c.dataset.arg)); sum(); };
    $('#allSterk').onclick = () => setArgs(ARGS.filter(a => a.sterkte === 'Sterk').map(a => a.id));
    $('#allArgs').onclick = () => setArgs(ARGS.map(a => a.id));
    $('#noArgs').onclick = () => setArgs([]);
    $('#dl').onclick = () => buildDocx(opts()).catch(err => { console.error(err); toast('Word-bestand maken mislukt'); });
    $('#cpAll').onclick = () => copy(buildPlain(opts()));
    sum();
  }
  const opts = () => ({ ver: $('#o_ver').checked, tab: $('#o_tab').checked, lit: $('#o_lit').checked, met: $('#o_met').checked });
  function exportModel() {
    const args = ARGS.filter(a => st.args.includes(a.id));
    const vers = st.verweer.map(i => VERWEER[i]).filter(Boolean);
    const eigen = st.eigen.map(e => ({ id: 'eigen', titel: e.titel, sterkte: 'Eigen argument', sterkte_uitleg: 'Door indiener geformuleerd en onderbouwd met de hieronder genoemde studies.', tekst: e.tekst || e.eigen, steun: e.steun.map(id => { const s = get(id); return s ? { id, punt: puntVoor(s) } : null; }).filter(Boolean), verweer: e.verweer || [], extern: [] }));
    args.push(...eigen);
    const ids = new Set();
    args.forEach(a => { a.steun.forEach(x => ids.add(String(x.id))); a.verweer.forEach(v => v.studies.forEach(s => ids.add(String(s)))); });
    vers.forEach(v => { v.ids.forEach(i => ids.add(String(i))); (v.refs_extra || []).forEach(i => ids.add(String(i))); });
    st.studies.forEach(i => ids.add(String(i)));
    const refs = [...ids].map(get).filter(Boolean).sort((a, b) => a.auteurs.localeCompare(b.auteurs) || (a.jaar || 0) - (b.jaar || 0));
    const extern = []; args.forEach(a => (a.extern || []).forEach(e => { if (!extern.find(x => x.url === e.url)) extern.push(e); }));
    vers.forEach(v => { if (v.extern && !extern.find(x => x.url === v.extern.url)) extern.push(v.extern); });
    return { args, vers, refs, extern, lok: lokaleAlinea(st.project), p: st.project };
  }
  const METHODE = 'De onderbouwing is gebaseerd op een systematische zoektocht naar peer-reviewed publicaties uit de periode 2000–2026 over infrageluid, laagfrequent geluid en windturbinegeluid in relatie tot gezondheid. Er is gezocht in PubMed en in een academische zoekindex; de peer-reviewstatus is gecontroleerd via PubMed, Crossref of Semantic Scholar. Van ruim 2.100 gevonden publicaties voldeden er ' + nH + ' aan de criteria. Daarnaast is in OpenAlex en een academische zoekindex gezocht naar algemeen akoestisch onderzoek naar infrageluid en laagfrequent geluid (bron, verspreiding, binnenshuis, waarneming, normen, rekenmodellen en trillingen); daarvan zijn ' + nG + ' tijdschriftartikelen opgenomen. Dit algemene onderzoek meet geen gezondheidseffect, maar onderbouwt de schakels tussen turbine en blootstelling. Elke studie is ingedeeld naar relevantie voor windturbines (A: direct relevant, B: indirect relevant, C: achtergrond). De kernstudies waarop de argumenten steunen, zijn nagelezen aan de hand van het abstract. Voor de volledige inhoud wordt verwezen naar de oorspronkelijke publicaties.';
  function buildPlain(o) {
    const m = exportModel(); const L = [];
    L.push('BIJLAGE: WETENSCHAPPELIJKE ONDERBOUWING GEZONDHEIDSEFFECTEN INFRAGELUID EN LAAGFREQUENT GELUID');
    if (m.p.naam) L.push('Project: ' + m.p.naam); if (m.p.gezag) L.push('Bevoegd gezag: ' + m.p.gezag);
    L.push('');
    m.args.forEach((a, i) => {
      L.push(`${i + 1}. ${a.titel}`); L.push(a.tekst); if (m.lok) L.push(m.lok);
      if (o.ver) a.verweer.forEach(v => L.push(`Mogelijk verweer: ${v.claim}\nWeerlegging: ${v.weerlegging}`));
      L.push('');
    });
    if (m.vers.length) { L.push('REACTIE OP STUDIES DIE DOORGAANS WORDEN AANGEHAALD'); m.vers.forEach(v => { L.push(v.naam); L.push(v.weerwoord); L.push(''); }); }
    if (o.met) { L.push('VERANTWOORDING'); L.push(METHODE); L.push(''); }
    if (o.lit) { L.push('LITERATUUR'); m.refs.forEach(s => L.push(fullCite(s))); m.extern.forEach(e => L.push(`${e.label}. ${e.url}`)); }
    return L.join('\n');
  }
  async function buildDocx(o) {
    if (!window.docx) { toast('Word-module niet geladen'); return; }
    const m = exportModel();
    if (!m.args.length && !m.vers.length && !m.refs.length) { toast('Selecteer eerst argumenten of studies'); return; }
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ExternalHyperlink, AlignmentType, ShadingType } = window.docx;
    const P = (text, opt = {}) => new Paragraph(Object.assign({ children: [new TextRun({ text, size: 22, font: 'Calibri' })], spacing: { after: 160, line: 300 } }, opt));
    const H = (text, level) => new Paragraph({ text, heading: level, spacing: { before: 280, after: 120 } });
    const small = (text, opt = {}) => new Paragraph({ children: [new TextRun(Object.assign({ text, size: 18, font: 'Calibri', color: '5F636B' }, opt))], spacing: { after: 80 } });
    const kids = [];
    kids.push(new Paragraph({ children: [new TextRun({ text: 'Bijlage', size: 20, color: '5F636B', font: 'Calibri' })], spacing: { after: 60 } }));
    kids.push(new Paragraph({ children: [new TextRun({ text: 'Wetenschappelijke onderbouwing gezondheidseffecten van infrageluid en laagfrequent geluid van windturbines', bold: true, size: 32, font: 'Calibri', color: '1F3A5F' })], spacing: { after: 200 } }));
    if (m.p.naam) kids.push(P('Project: ' + m.p.naam)); if (m.p.gezag) kids.push(P('Bevoegd gezag: ' + m.p.gezag));
    kids.push(P('Deze bijlage onderbouwt de zienswijze/het beroep met peer-reviewed wetenschappelijk onderzoek. Per argument zijn de belangrijkste studies, een toelichting en een reactie op verwacht verweer opgenomen.'));
    if (m.args.length) {
      kids.push(H('Argumenten', HeadingLevel.HEADING_1));
      m.args.forEach((a, i) => {
        kids.push(H(`${i + 1}. ${a.titel}`, HeadingLevel.HEADING_2));
        kids.push(small(`Sterkte van het bewijs: ${a.sterkte}. ${a.sterkte_uitleg}`));
        kids.push(P(a.tekst));
        if (m.lok) kids.push(P(m.lok));
        kids.push(new Paragraph({ children: [new TextRun({ text: 'Onderbouwing', bold: true, size: 22, font: 'Calibri' })], spacing: { before: 120, after: 80 } }));
        a.steun.forEach(x => { const s = get(x.id); if (s) kids.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: `${s.auteurs} (${s.jaar || 'z.j.'}): `, bold: true, size: 21, font: 'Calibri' }), new TextRun({ text: x.punt, size: 21, font: 'Calibri' })], spacing: { after: 60 } })); });
        if (o.ver && a.verweer.length) {
          kids.push(new Paragraph({ children: [new TextRun({ text: 'Verwacht verweer en weerlegging', bold: true, size: 22, font: 'Calibri' })], spacing: { before: 160, after: 80 } }));
          a.verweer.forEach(v => { kids.push(new Paragraph({ children: [new TextRun({ text: 'Verweer: ', bold: true, size: 21, font: 'Calibri' }), new TextRun({ text: v.claim, italics: false, size: 21, font: 'Calibri' })], spacing: { after: 40 } })); kids.push(new Paragraph({ children: [new TextRun({ text: 'Weerlegging: ', bold: true, size: 21, font: 'Calibri', color: '9A3B1E' }), new TextRun({ text: v.weerlegging, size: 21, font: 'Calibri' })], spacing: { after: 140 } })); });
        }
      });
    }
    if (m.vers.length) {
      kids.push(H('Reactie op studies die doorgaans worden aangehaald', HeadingLevel.HEADING_1));
      m.vers.forEach(v => {
        kids.push(H(v.naam, HeadingLevel.HEADING_3));
        kids.push(P('Wat is onderzocht: ' + v.wat)); kids.push(P('Bevinding: ' + v.bevinding));
        v.zwakten.forEach(z => kids.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: z, size: 21, font: 'Calibri' })], spacing: { after: 40 } })));
        kids.push(P(v.weerwoord, { spacing: { before: 100, after: 160 } }));
      });
    }
    if (o.tab && m.refs.length) {
      kids.push(H('Overzicht kernbevindingen', HeadingLevel.HEADING_1));
      const cell = (t, bold, w, fill) => new TableCell({ width: { size: w, type: WidthType.PERCENTAGE }, shading: fill ? { type: ShadingType.CLEAR, color: 'auto', fill } : undefined, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: t || '', bold, size: 18, font: 'Calibri', color: fill ? 'FFFFFF' : undefined })] })] });
      const rows = [new TableRow({ tableHeader: true, children: [cell('Studie', true, 22, '1F3A5F'), cell('Type', true, 16, '1F3A5F'), cell('Relevantie', true, 10, '1F3A5F'), cell('Bevinding', true, 52, '1F3A5F')] })];
      m.refs.forEach(s => rows.push(new TableRow({ children: [cell(`${s.auteurs} (${s.jaar || 'z.j.'})`, true, 22), cell(s.studietype, false, 16), cell(s.relevantie, false, 10), cell(s.bevinding, false, 52)] })));
      kids.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
      kids.push(small('Relevantie: A = direct relevant voor windturbines; B = indirect relevant; C = achtergrond.', { size: 17 }));
    }
    if (o.met) { kids.push(H('Verantwoording', HeadingLevel.HEADING_1)); kids.push(P(METHODE)); }
    if (o.lit) {
      kids.push(H('Literatuur', HeadingLevel.HEADING_1));
      m.refs.forEach(s => {
        const url = s.doi && !/^\d+$/.test(s.doi) ? `https://doi.org/${s.doi}` : s.link;
        kids.push(new Paragraph({ spacing: { after: 100 }, indent: { left: 360, hanging: 360 }, children: [new TextRun({ text: `${s.auteurs} (${s.jaar || 'z.j.'}). ${s.titel.replace(/\.$/, '')}. ${s.tijdschrift && s.tijdschrift !== 'n.a.' ? s.tijdschrift + '. ' : ''}`, size: 20, font: 'Calibri' }), new ExternalHyperlink({ link: url, children: [new TextRun({ text: url, size: 20, font: 'Calibri', color: '1F3A5F', underline: {} })] })] }));
      });
      m.extern.forEach(e => kids.push(new Paragraph({ spacing: { after: 100 }, indent: { left: 360, hanging: 360 }, children: [new TextRun({ text: e.label + '. ', size: 20, font: 'Calibri' }), new ExternalHyperlink({ link: e.url, children: [new TextRun({ text: e.url, size: 20, font: 'Calibri', color: '1F3A5F', underline: {} })] })] })));
    }
    const doc = new Document({ creator: 'Bewijsverkenner', title: 'Wetenschappelijke onderbouwing infrageluid en laagfrequent geluid', styles: { default: { document: { run: { font: 'Calibri', size: 22 } } }, paragraphStyles: [{ id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', run: { size: 28, bold: true, color: '1F3A5F', font: 'Calibri' } }, { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', run: { size: 24, bold: true, color: '1E2430', font: 'Calibri' } }, { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', run: { size: 22, bold: true, color: '1E2430', font: 'Calibri' } }] }, sections: [{ properties: { page: { margin: { top: 1200, bottom: 1200, left: 1200, right: 1200 } } }, children: kids }] });
    const blob = await Packer.toBlob(doc);
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `Onderbouwing_infrageluid${m.p.naam ? '_' + m.p.naam.replace(/[^\w-]+/g, '_') : ''}.docx`;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast('Word-bestand gedownload');
  }

  /* ---------- theme ---------- */
  const root = document.documentElement;
  const prefDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = localStorage.getItem('bv-theme') || (prefDark ? 'dark' : 'light');
  $('#themeToggle').onclick = () => { root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('bv-theme', root.dataset.theme); } catch (e) {} };

  updateCount();
  router();
})();

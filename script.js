(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  /* year */
  $('#year').textContent = new Date().getFullYear();

  /* theme toggle */
  try { const t = localStorage.getItem('nj-theme'); if (t) root.dataset.theme = t; } catch (e) {}
  $('#theme').addEventListener('click', () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches || !matchMedia('(prefers-color-scheme: light)').matches;
    const next = dark ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('nj-theme', next); } catch (e) {}
  });

  /* mobile menu */
  const menu = $('.menu-toggle'), nav = $('.nav');
  const setMenu = open => {
    nav.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  };
  menu.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  $$('.nav a').forEach(a => a.addEventListener('click', () => setMenu(false)));

  /* hero: split name into letters */
  const chars = [];
  $$('.name .line').forEach(line => {
    const text = line.textContent.trim();
    line.setAttribute('aria-label', text);
    line.textContent = '';
    [...text].forEach(ch => {
      const s = document.createElement('span');
      s.className = 'char' + (reduce ? '' : ' in');
      s.setAttribute('aria-hidden', 'true');
      s.textContent = ch;
      s.style.setProperty('--i', chars.length);
      line.appendChild(s);
      chars.push(s);
    });
  });

  /* letter weight reacts to the pointer; one idle sweep plays after load */
  const setWeights = (x, y, radius) => {
    chars.forEach(c => {
      const r = c.getBoundingClientRect();
      const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
      const k = Math.max(0, 1 - d / radius);
      c.style.fontVariationSettings = `'wght' ${Math.round(400 + 500 * k * k)}`;
    });
  };
  const hero = $('.hero');
  let raf = 0, px = 0, py = 0;
  if (!reduce) {
    hero.addEventListener('pointermove', e => {
      px = e.clientX; py = e.clientY;
      hero.style.setProperty('--mx', (e.clientX - hero.getBoundingClientRect().left) + 'px');
      hero.style.setProperty('--my', (e.clientY - hero.getBoundingClientRect().top) + 'px');
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; setWeights(px, py, 280); });
    });
    hero.addEventListener('pointerleave', () => chars.forEach(c => c.style.fontVariationSettings = "'wght' 400"));
    const first = chars[0] && chars[0].getBoundingClientRect();
    const t0 = performance.now() + 1100;
    const sweep = now => {
      const t = (now - t0) / 1600;
      if (t > 1) { chars.forEach(c => c.style.fontVariationSettings = "'wght' 400"); return; }
      if (t >= 0) {
        const left = hero.getBoundingClientRect().left, w = hero.getBoundingClientRect().width * 0.8;
        setWeights(left + t * w, chars[0].getBoundingClientRect().top + 60, 220);
      }
      requestAnimationFrame(sweep);
    };
    requestAnimationFrame(sweep);
  }

  /* cursor ring */
  const cur = $('.cursor');
  if (matchMedia('(pointer:fine)').matches && !reduce) {
    let cx = 0, cy = 0, tx = 0, ty = 0;
    addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; cur.classList.add('on'); });
    document.addEventListener('pointerleave', () => cur.classList.remove('on'));
    const loop = () => { cx += (tx - cx) * .18; cy += (ty - cy) * .18; cur.style.transform = `translate(${cx}px,${cy}px)`; requestAnimationFrame(loop); };
    loop();
    $$('a,button,.row,.pills span,.tags span').forEach(el => {
      el.addEventListener('pointerenter', () => cur.classList.add('big'));
      el.addEventListener('pointerleave', () => cur.classList.remove('big'));
    });
  }

  /* about: words light up as you scroll */
  const lead = $('.lead');
  lead.setAttribute('aria-label', lead.textContent.trim());
  const words = lead.textContent.trim().split(/\s+/);
  lead.innerHTML = words.map(w => `<span class="w" aria-hidden="true">${w}</span>`).join(' ');
  const wEls = $$('.w', lead);

  /* scroll-driven: progress bar, word highlight, timeline line, active nav */
  const timeline = $('.timeline'), bar = $('.progress');
  const links = $$('.nav a[href^="#"]:not(.nav-cta)');
  const secs = links.map(a => $(a.getAttribute('href')));
  const onScroll = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--p', h > 0 ? (scrollY / h).toFixed(4) : 0);
    const lr = lead.getBoundingClientRect();
    const lp = Math.min(1, Math.max(0, (innerHeight * 0.85 - lr.top) / (lr.height + innerHeight * 0.35)));
    const n = Math.round(lp * wEls.length);
    wEls.forEach((w, i) => w.classList.toggle('lit', i < n));
    const tr = timeline.getBoundingClientRect();
    timeline.style.setProperty('--p', Math.min(1, Math.max(0, (innerHeight * 0.65 - tr.top) / tr.height)).toFixed(3));
    let cur = -1;
    secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * 0.4) cur = i; });
    links.forEach((a, i) => a.classList.toggle('active', i === cur));
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* reveal (movement only, content is always readable) */
  const items = $$('.sec-title, .about-copy, .focus-head p, .row, .group, .t-item, .beyond, .mail, .details');
  items.forEach(i => i.classList.add('reveal'));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    }), { threshold: .12 });
    items.forEach(i => io.observe(i));
  } else items.forEach(i => i.classList.add('visible'));

  /* magnetic buttons */
  if (matchMedia('(pointer:fine)').matches && !reduce) {
    $$('.btn, .nav-cta').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px,${(e.clientY - r.top - r.height / 2) * .35}px)`;
      });
      b.addEventListener('pointerleave', () => b.style.transform = '');
    });
  }

  /* copy email */
  const toast = $('.toast');
  const say = msg => { toast.textContent = msg; toast.classList.add('show'); clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove('show'), 2200); };
  $('#copy').addEventListener('click', async () => {
    const text = $('.mail-text').textContent.trim();
    try { await navigator.clipboard.writeText(text); say('Email copied'); }
    catch (e) {
      const r = document.createRange(); r.selectNodeContents($('.mail-text'));
      const s = getSelection(); s.removeAllRanges(); s.addRange(r); say('Press Ctrl+C to copy');
    }
  });
})();

/* members.js */

/* ── NAV ── */
const sections    = document.querySelectorAll('section[id]');
const sideLinks   = document.querySelectorAll('.nav-link-item');
const mobileLinks = document.querySelectorAll('.mobile-subnav a');
const allLinks    = [...sideLinks, ...mobileLinks];

function setActive(id) {
  allLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
}
allLinks.forEach(a => {
  a.addEventListener('click', e => {
    if (!a.getAttribute('href').startsWith('#')) return; // real page link (e.g. live.html)
    e.preventDefault();
    const id = a.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActive(id);
  });
});

/* Highlight the nav item for whichever section is at the top while scrolling.
   Desktop scrolls inside .panels-viewport; mobile scrolls the page itself. */
const viewport = document.querySelector('.panels-viewport');
const sectionList = [...sections];
let _scrollTick = false;
function updateActiveOnScroll() {
  _scrollTick = false;
  const isDesktopScroller = viewport && viewport.scrollHeight > viewport.clientHeight + 1 &&
                            getComputedStyle(viewport).overflowY !== 'visible';
  const line = (isDesktopScroller ? viewport.getBoundingClientRect().top : 96) + 80;
  let current = sectionList[0];
  sectionList.forEach(s => { if (s.getBoundingClientRect().top <= line) current = s; });
  // at the very bottom, make sure the last section can become active
  const atBottom = isDesktopScroller
    ? viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 2
    : window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
  if (atBottom) current = sectionList[sectionList.length - 1];
  if (current) setActive(current.id);
}
function onScroll() { if (!_scrollTick) { _scrollTick = true; requestAnimationFrame(updateActiveOnScroll); } }
if (viewport) viewport.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);
updateActiveOnScroll();

/* ── HOME CARDS ── */
async function renderHomeCards() {
  const container = document.getElementById('homeCardsContainer');
  if (!container) return;
  const cards = await DB.getHomeCards();
  container.innerHTML = cards.map(c => `
    <div class="col-sm-6 col-lg-4">
      <div class="home-info-card card p-3 border-0 shadow-sm rounded-4 text-center h-100" data-card-id="${c.id}">
        <div class="fs-2 mb-1">${c.emoji}</div>
        <div class="fw-semibold small mb-2" style="color:var(--navy)">${c.label}</div>
        <div class="home-card-content" style="font-size:12.5px;color:#6b7280;line-height:1.55">${c.content}</div>
      </div>
    </div>
  `).join('');
}

/* ── ANNOUNCEMENTS ── */
async function renderAnnouncements() {
  const container = document.getElementById('announcementsContainer');
  if (!container) return;
  const list = await DB.getAnnouncements();
  if (!list.length) { container.innerHTML = '<p class="text-muted small">No announcements yet.</p>'; return; }
  container.innerHTML = list.map(a => `
    <div class="col-md-4">
      <div class="announce-card card h-100 border-0">
        <div class="announce-thumb d-flex align-items-center justify-content-center" style="${a.bg ? 'background:'+a.bg : ''}">${a.emoji}</div>
        <div class="card-body">
          <span class="card-tag d-block mb-1">${a.tag}</span>
          <h6>${a.title}</h6>
          <p class="mb-2">${a.body}</p>
          <div class="card-date d-flex align-items-center gap-1"><i class="bi bi-calendar3"></i> ${a.date}</div>
        </div>
      </div>
    </div>
  `).join('');
}

/* ── SERMONS ── */
let _allSermonsCache = [];
let _sermonCatFilter = 'church';
const sermonAudioEl = document.getElementById('sermonAudioPlayer');

function resetPlayButtons() {
  document.querySelectorAll('.play-btn i').forEach(i => i.className = 'bi bi-play-fill');
  document.querySelectorAll('.play-btn').forEach(b => { b.style.background = ''; b.style.color = 'var(--gold)'; });
}

async function renderSermons() {
  const container = document.getElementById('sermonsContainer');
  if (!container) return;
  const list = await DB.getSermons();
  _allSermonsCache = list;
  const filtered = list.filter(s => (s.category || 'church') === _sermonCatFilter);

  if (!filtered.length) {
    container.innerHTML = `<p class="text-muted small">No ${_sermonCatFilter === 'guest' ? 'guest speaker' : 'church'} sermons yet.</p>`;
    return;
  }
  container.innerHTML = filtered.map(s => `
    <div class="sermon-card d-flex align-items-center gap-3 p-3" data-sermon-id="${s.id}">
      <div class="sermon-icon d-flex align-items-center justify-content-center flex-shrink-0"><i class="bi bi-music-note-beamed"></i></div>
      <div class="flex-grow-1">
        <h6 class="mb-1">${s.title}</h6>
        <p class="spkr mb-0">${s.speaker} &nbsp;·&nbsp; <span style="color:var(--gold)">${s.date}</span></p>
      </div>
      <button class="play-btn d-flex align-items-center justify-content-center" data-audio-url="${s.audioUrl || ''}" ${s.audioUrl ? '' : 'disabled title="Audio not available yet"'}>
        <i class="bi bi-play-fill"></i>
      </button>
    </div>
  `).join('');

  document.querySelectorAll('.play-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.audioUrl;
      if (!url) return;
      const isThisPlaying = btn.querySelector('i').classList.contains('bi-pause-fill');

      if (isThisPlaying) {
        sermonAudioEl.pause();
        resetPlayButtons();
        return;
      }

      resetPlayButtons();
      if (sermonAudioEl.src !== url) {
        sermonAudioEl.src = url;
      }
      sermonAudioEl.play();
      btn.querySelector('i').className = 'bi bi-pause-fill';
      btn.style.background = 'var(--gold)'; btn.style.color = '#fff';
    });
  });
}

if (sermonAudioEl) {
  sermonAudioEl.addEventListener('ended', resetPlayButtons);
}

document.querySelectorAll('.sermon-cat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sermon-cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _sermonCatFilter = btn.dataset.sermonCat;
    sermonAudioEl.pause();
    renderSermons();
renderAbout();
  });
});

/* ── POST PRAYER ──
   Members can only submit. The list of requests lives on prayer.html (Prayer department only). */
const postPrayerBtn  = document.getElementById('postPrayerBtn');
const prayerTextarea = document.getElementById('newPrayerText');
const prayerSuccess  = document.getElementById('prayerSuccess');

if (postPrayerBtn) {
  postPrayerBtn.addEventListener('click', async () => {
    const text = prayerTextarea.value.trim();
    if (!text) { prayerTextarea.focus(); return; }
    await DB.addPrayer(text);
    prayerTextarea.value = '';
    prayerSuccess.style.display = 'flex';
    setTimeout(() => prayerSuccess.style.display = 'none', 3000);
  });
}

/* ── ABOUT US ──
   Text, number tiles, contact and service times are edited in Admin → About Church.
   The same defaults are already in the HTML, so the section is never empty while this loads. */
async function renderAbout() {
  const a = await DB.getAbout();
  const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const text = document.getElementById('aboutText');
  if (text && a.text.trim()) text.textContent = a.text.trim();

  const stats = document.getElementById('aboutStats');
  if (stats) {
    const tiles = (a.stats || []).filter(t => t && String(t.num || '').trim());
    stats.style.display = tiles.length ? '' : 'none';
    // "400+" -> big number "400" with a gold "+"
    stats.innerHTML = tiles.map(t => {
      const m = String(t.num).trim().match(/^(\d[\d,.]*)(.*)$/);
      const num = m ? `${e(m[1])}${m[2] ? `<span>${e(m[2])}</span>` : ''}` : e(String(t.num).trim());
      return `<div class="col-6 col-md-3"><div class="about-stat p-3"><div class="stat-num">${num}</div><div class="stat-label mt-1">${e(t.label || '')}</div></div></div>`;
    }).join('');
  }

  const contact = document.getElementById('aboutContact');
  if (contact) {
    const phoneDigits = String(a.phone || '').replace(/\D/g, '');
    const rows = [];
    if (phoneDigits) rows.push(`<a href="tel:+${phoneDigits}"><i class="bi bi-telephone"></i> ${e(a.phone)}</a>`);
    if (a.email)     rows.push(`<a href="mailto:${e(a.email)}"><i class="bi bi-envelope"></i> ${e(a.email)}</a>`);
    if (a.address)   rows.push(`<a style="pointer-events:none"><i class="bi bi-geo-alt"></i> ${e(a.address)}</a>`);
    contact.innerHTML = rows.join('') || '<span class="text-muted small">No contact details yet.</span>';
  }

  const services = document.getElementById('aboutServices');
  if (services) {
    const list = (a.services || []).map(x => String(x).trim()).filter(Boolean);
    services.innerHTML = list.length ? list.map(x => `<span>${e(x)}</span>`).join('') : '<span>To be announced</span>';
  }
}

/* ── DAILY SCRIPTURE ──
   One verse per calendar day, same for everyone. A curated list of references is rotated
   by day-of-year, and the text is fetched from the free bible-api.com (no key needed).
   The result is cached in localStorage for the day; if the API is unreachable, the
   fallback verse already in the HTML stays on screen. */
const DAILY_VERSES = [
  'Jeremiah 29:11','Psalm 23:1-3','Proverbs 3:5-6','Isaiah 41:10','Philippians 4:6-7',
  'Romans 8:28','Joshua 1:9','Psalm 46:1','Matthew 6:33','John 3:16',
  'Isaiah 40:31','Psalm 121:1-2','2 Corinthians 5:7','Romans 12:2','Philippians 4:13',
  'Psalm 27:1','Matthew 11:28','Proverbs 16:3','Isaiah 26:3','Lamentations 3:22-23',
  'Psalm 37:4-5','John 14:27','Galatians 6:9','Hebrews 11:1','1 Peter 5:7',
  'Psalm 91:1-2','Deuteronomy 31:6','Romans 15:13','Colossians 3:23','James 1:5',
  'Psalm 119:105','Micah 6:8','2 Timothy 1:7','Ephesians 2:8-9','Psalm 34:8',
  'John 15:5','Zephaniah 3:17','Psalm 139:14','1 Corinthians 13:4-7','Matthew 5:16',
  'Isaiah 43:2','Psalm 118:24','Romans 5:8','Hebrews 13:8','Psalm 62:1-2',
  'Proverbs 18:10','John 16:33','Philippians 1:6','Psalm 30:5','1 Thessalonians 5:16-18',
  'Isaiah 55:8-9','Psalm 100:4-5','Matthew 7:7-8','Romans 10:9','Psalm 16:11',
  'Ephesians 6:10','Luke 1:37','Psalm 56:3-4','Numbers 6:24-26','2 Chronicles 7:14',
  'Psalm 51:10','Proverbs 22:6','John 8:12','Revelation 21:4','Habakkuk 3:19'
];

function dayOfYear(d) {
  return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
}

async function loadDailyVerse() {
  const textEl = document.getElementById('verseText');
  const refEl  = document.getElementById('verseRef');
  if (!textEl || !refEl) return;

  const now = new Date();
  const key = `cog_verse_${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

  const show = v => {
    textEl.textContent = `"${v.text}"`;
    refEl.textContent  = `— ${v.ref}`;
  };

  try { const c = JSON.parse(localStorage.getItem(key)); if (c && c.text) return show(c); } catch (e) {}

  const ref = DAILY_VERSES[dayOfYear(now) % DAILY_VERSES.length];
  try {
    const res = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=kjv`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const text = String(data.text || '').replace(/\s+/g, ' ').trim();
    if (!text) throw new Error('Empty verse');
    const v = { text, ref: `${data.reference || ref} (KJV)` };
    show(v);
    try {
      Object.keys(localStorage).filter(k => k.startsWith('cog_verse_') && k !== key).forEach(k => localStorage.removeItem(k));
      localStorage.setItem(key, JSON.stringify(v));
    } catch (e) {}
  } catch (err) {
    console.warn('Daily verse unavailable, keeping fallback', err);
  }
}

/* ── INIT ── */
loadDailyVerse();
renderHomeCards();
renderAnnouncements();
renderSermons();
renderAbout();

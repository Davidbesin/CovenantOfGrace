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
    e.preventDefault();
    const id = a.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    setActive(id);
  });
});
const viewport = document.querySelector('.panels-viewport');
if (viewport) {
  const observer = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }),
    { root: viewport, threshold: 0.5 }
  );
  sections.forEach(s => observer.observe(s));
}

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
  });
});

/* ── PRAYERS ── */
async function renderPrayers() {
  const container = document.getElementById('prayerContainer');
  if (!container) return;
  const list = await DB.getPrayers();
  container.innerHTML = list.map(p => `
    <div class="col-md-4">
      <div class="prayer-card p-3 h-100">
        <div class="d-flex align-items-center gap-2 mb-3">
          <div class="requester-avatar d-flex align-items-center justify-content-center" style="background:${p.color}">${p.initial}</div>
          <div><p class="requester-name mb-0">Anonymous</p><p class="requester-time mb-0">${p.time}</p></div>
        </div>
        <p class="mb-3">${p.text}</p>
        <button class="pray-btn" data-prayer-id="${p.id}">
          <i class="bi bi-hands"></i> Pray with me ${p.prayCount > 0 ? `<span class="pray-count">(${p.prayCount})</span>` : ''}
        </button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.pray-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (btn.disabled) return;
      const id = btn.dataset.prayerId;
      await DB.prayFor(id);
      btn.innerHTML = '<i class="bi bi-check2"></i> Praying';
      btn.style.background = 'var(--gold)'; btn.style.color = '#fff';
      btn.disabled = true;
    });
  });
}

/* ── POST PRAYER ── */
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
    renderPrayers();
  });
}

/* ── INIT ── */
renderHomeCards();
renderAnnouncements();
renderSermons();
renderPrayers();

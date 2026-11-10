/* admin.js */

const escHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ── ACCESS ──
   Admin access is by device ID (access.js): Super Admins see everything,
   Department Heads only see their own department(s). */
let ME = null;
let IS_SUPER = false;
const HEAD_PANELS = ['departments', 'registrations', 'people'];
const canManage = deptId => IS_SUPER || (ME && ME.headOf.includes(deptId));

/* Attendance (the Attendance panel) is for Super Admins and the head of the Ushering department only. */
let USHER_ID = null;        // id of the Ushering department
let IS_USHER_HEAD = false;
const canSeeAttendance = () => IS_SUPER || IS_USHER_HEAD;

/* Sidebar + mobile menu are both built from this one list. */
const NAV = [
  { group: 'Church content', items: [
    ['announcements', 'megaphone',         'Announcements'],
    ['sermons',       'mic',               'Sermons'],
    ['homecards',     'house-door',        'Home Cards'],
    ['live',          'camera-video',      'Live Service'],
    ['about',         'building',          'About Church'],
  ]},
  { group: 'Services & care', items: [
    ['attendance',    'clipboard2-check',  'Attendance'],
    ['prayers',       'hands',             'Prayer Requests'],
  ]},
  { group: 'Workers', items: [
    ['departments',   'diagram-3',         'Departments'],
    ['registrations', 'person-lines-fill', 'Worker Applications'],
    ['people',        'people',            'People & Access'],
  ]},
];

function buildNav(allowed) {
  const html = NAV.map(g => {
    const items = g.items.filter(([id]) => allowed.includes(id));
    if (!items.length) return '';
    return `<div class="adm-nav-group">${escHtml(g.group)}</div>` +
      items.map(([id, icon, label]) => `<button class="adm-nav-btn" data-panel="${id}"><i class="bi bi-${icon}"></i> ${escHtml(label)}</button>`).join('');
  }).join('');
  ['admNav', 'mobileDrawer'].forEach(id => { document.getElementById(id).innerHTML = html; });
  document.querySelectorAll('.adm-nav-btn').forEach(btn => btn.addEventListener('click', () => switchPanel(btn.dataset.panel)));
}

function applyRole() {
  IS_SUPER = !!ME.superAdmin;
  IS_USHER_HEAD = !IS_SUPER && !!USHER_ID && ME.headOf.includes(USHER_ID);
  const who = document.getElementById('whoAmI');
  const names = ME.superAdmin ? 'Super Admin' : (IS_USHER_HEAD ? 'Usher Head' : 'Department Head');
  who.innerHTML = `<strong>${escHtml(ME.name)}</strong>${names}`;

  const allPanels = NAV.flatMap(g => g.items.map(i => i[0]));
  const allowed = IS_SUPER ? allPanels : (IS_USHER_HEAD ? [...HEAD_PANELS, 'attendance'] : HEAD_PANELS);
  buildNav(allowed);
  document.querySelectorAll('.adm-panel').forEach(p => { if (!allowed.includes(p.id.replace('panel-', ''))) p.remove(); });

  if (!IS_SUPER) {
    document.getElementById('addDeptBtn').style.display = 'none';
    document.querySelector('#panel-departments .adm-panel-header p').textContent = 'Edit the details, announcement, meeting times and links of the department(s) you lead. You can only edit your own.';
    document.querySelector('#panel-registrations .adm-panel-header p').textContent = 'Applications to join your department(s).';
    document.getElementById('peopleSub').textContent = 'Members and requests for the department(s) you lead. Approve requests, or remove or promote members.';
    document.getElementById('peopleAllLabel').textContent = 'Members';
    document.querySelector('.adm-mobile-title').textContent = 'Department Head';
  }
  switchPanel(IS_SUPER ? 'announcements' : 'people');
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  if (confirm('Forget this device? You will need to register it again to get back in.')) Access.reset();
});

/* ── PANEL SWITCHING ── */
function switchPanel(id) {
  const panel = document.getElementById('panel-' + id);
  if (!panel) return;
  document.querySelectorAll('.adm-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.adm-nav-btn').forEach(b => b.classList.remove('active'));
  panel.classList.add('active');
  document.querySelectorAll(`.adm-nav-btn[data-panel="${id}"]`).forEach(b => b.classList.add('active'));
  document.getElementById('mobileDrawer').classList.remove('open');
  document.querySelector('.adm-main').scrollTop = 0;
}

document.getElementById('mobileMenuBtn').addEventListener('click', () => {
  document.getElementById('mobileDrawer').classList.toggle('open');
});

/* ── CONFIRM MODAL ── */
let pendingDeleteFn = null;
function showConfirm(title, body, onOk) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmBody').textContent  = body;
  document.getElementById('confirmBackdrop').style.display = 'flex';
  pendingDeleteFn = onOk;
}
document.getElementById('confirmCancel').addEventListener('click', () => {
  document.getElementById('confirmBackdrop').style.display = 'none';
  pendingDeleteFn = null;
});
document.getElementById('confirmOk').addEventListener('click', () => {
  if (pendingDeleteFn) pendingDeleteFn();
  document.getElementById('confirmBackdrop').style.display = 'none';
  pendingDeleteFn = null;
});

/* ══════════════════════════════════════════
   PRAYERS
══════════════════════════════════════════ */
async function renderPrayers() {
  const el   = document.getElementById('prayerList');
  el.innerHTML = '<div class="adm-empty"><i class="bi bi-arrow-clockwise"></i> Loading…</div>';
  const list = await DB.getPrayers();
  if (!list.length) {
    el.innerHTML = '<div class="adm-empty"><i class="bi bi-hands"></i>No prayer requests yet.</div>';
    return;
  }
  el.innerHTML = list.map(p => `
    <div class="adm-item">
      <div class="adm-item-icon">🙏</div>
      <div class="adm-item-body">
        <div class="adm-item-sub">Anonymous · ${escHtml(p.time)}</div>
        <div class="adm-item-text">${escHtml(p.text)}</div>
      </div>
      <div class="adm-item-actions">
        <button class="adm-del-btn" data-id="${p.id}" title="Remove"><i class="bi bi-trash3"></i></button>
      </div>
    </div>
  `).join('');

  el.querySelectorAll('.adm-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      showConfirm('Remove prayer request?', 'This will delete it from the Members portal.', async () => {
        await DB.deletePrayer(id);
        renderPrayers();
      });
    });
  });
}

/* ══════════════════════════════════════════
   SERMONS
══════════════════════════════════════════ */
let editingSermonId = null;
let _sermonCache = [];
let _sermonActiveCat = 'church';
let _pendingAudioFile = null;

const isTextCat = c => c === 'written' || c === 'excerpts';
function syncSermonTextField() {
  document.getElementById('sf_textWrap').style.display = isTextCat(document.getElementById('sf_category').value) ? '' : 'none';
}
document.getElementById('sf_category').addEventListener('change', syncSermonTextField);

function sermonCatLabel(cat) {
  return ({
    guest:    'Guest Speaker / Special Program',
    written:  'Written Word',
    excerpts: 'Weekly Service Excerpts'
  })[cat] || 'Church (Main Sunday Service)';
}

async function renderSermons() {
  const el = document.getElementById('sermonList');
  el.innerHTML = '<div class="adm-empty"><i class="bi bi-arrow-clockwise"></i> Loading…</div>';
  const list = await DB.getSermons();
  _sermonCache = list;
  const filtered = list.filter(s => (s.category || 'church') === _sermonActiveCat);

  if (!filtered.length) {
    const emptyLabel = ({ church: 'church sermons', guest: 'guest speaker sermons', written: 'written word entries', excerpts: 'weekly service excerpts' })[_sermonActiveCat] || 'entries';
    el.innerHTML = `<div class="adm-empty"><i class="bi bi-mic"></i>No ${emptyLabel} yet. Add one above.</div>`;
    return;
  }
  el.innerHTML = filtered.map(s => `
    <div class="adm-item">
      <div class="adm-item-icon"><i class="bi bi-music-note-beamed" style="color:var(--gold)"></i></div>
      <div class="adm-item-body">
        <div class="adm-item-title">${s.title}</div>
        <div class="adm-item-sub">${s.speaker} · ${s.date}</div>
        ${s.audioUrl
          ? `<div class="adm-item-audio-badge"><i class="bi bi-check-circle-fill"></i> ${s.audioName || 'Audio attached'}</div>`
          : (isTextCat(s.category) && s.text ? '' : `<div class="adm-item-audio-badge missing"><i class="bi bi-exclamation-circle-fill"></i> No audio uploaded</div>`)}
        ${isTextCat(s.category) && s.text ? `<div class="adm-item-audio-badge"><i class="bi bi-file-text-fill"></i> Text added</div>` : ''}
      </div>
      <div class="adm-item-actions">
        <button class="adm-edit-btn" data-id="${s.id}" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="adm-del-btn"  data-id="${s.id}" title="Delete"><i class="bi bi-trash3"></i></button>
      </div>
    </div>
  `).join('');

  el.querySelectorAll('.adm-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = _sermonCache.find(x => x.id === btn.dataset.id);
      if (!s) return;
      editingSermonId = s.id;
      _pendingAudioFile = null;
      document.getElementById('sf_category').value = s.category || 'church';
      document.getElementById('sf_title').value   = s.title;
      document.getElementById('sf_speaker').value = s.speaker;
      document.getElementById('sf_date').value    = s.date;
      document.getElementById('sf_audio').value   = '';
      document.getElementById('sf_text').value    = s.text || '';
      syncSermonTextField();
      const currentEl = document.getElementById('sf_audioCurrent');
      if (s.audioUrl) {
        currentEl.style.display = 'flex';
        currentEl.innerHTML = `<i class="bi bi-music-note-beamed"></i> Current: ${s.audioName || 'audio file'} (choosing a new file will replace it)`;
      } else {
        currentEl.style.display = 'none';
      }
      document.getElementById('sf_uploadProgress').style.display = 'none';
      document.getElementById('sermonFormTitle').textContent = 'Edit Sermon';
      document.getElementById('sermonForm').style.display = 'block';
    });
  });

  el.querySelectorAll('.adm-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      showConfirm('Delete sermon?', 'This will remove it (and its audio file) from the Members portal.', async () => {
        await DB.deleteSermon(id);
        renderSermons();
      });
    });
  });
}

document.querySelectorAll('.adm-subtab-btn[data-cat]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.adm-subtab-btn[data-cat]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _sermonActiveCat = btn.dataset.cat;
    renderSermons();
  });
});

document.getElementById('addSermonBtn').addEventListener('click', () => {
  editingSermonId = null;
  _pendingAudioFile = null;
  ['sf_title','sf_speaker','sf_date'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('sf_category').value = _sermonActiveCat;
  document.getElementById('sf_text').value = '';
  syncSermonTextField();
  document.getElementById('sf_audio').value = '';
  document.getElementById('sf_audioCurrent').style.display = 'none';
  document.getElementById('sf_uploadProgress').style.display = 'none';
  document.getElementById('sermonFormTitle').textContent = 'Add Sermon';
  document.getElementById('sermonForm').style.display = 'block';
});

document.getElementById('sermonCancelBtn').addEventListener('click', () => {
  document.getElementById('sermonForm').style.display = 'none';
  editingSermonId = null;
  _pendingAudioFile = null;
});

document.getElementById('sf_audio').addEventListener('change', e => {
  _pendingAudioFile = e.target.files[0] || null;
});

document.getElementById('sermonSaveBtn').addEventListener('click', async () => {
  const data = {
    category: document.getElementById('sf_category').value,
    title:    document.getElementById('sf_title').value.trim(),
    speaker:  document.getElementById('sf_speaker').value.trim(),
    date:     document.getElementById('sf_date').value.trim(),
  };
  if (!data.title || !data.speaker) return alert('Please fill in Title and Speaker.');
  if (isTextCat(data.category)) {
    data.text = document.getElementById('sf_text').value.trim();
    if (!data.text && !_pendingAudioFile) return alert('Please add the text (or an audio file).');
  }

  const saveBtn = document.getElementById('sermonSaveBtn');
  saveBtn.disabled = true;

  try {
    if (_pendingAudioFile) {
      const progressWrap = document.getElementById('sf_uploadProgress');
      const barFill = document.getElementById('sf_uploadBarFill');
      const pctLabel = document.getElementById('sf_uploadPct');
      progressWrap.style.display = 'flex';
      barFill.style.width = '0%';
      pctLabel.textContent = '0%';

      const result = await DB.uploadSermonAudio(_pendingAudioFile, pct => {
        barFill.style.width = pct + '%';
        pctLabel.textContent = pct + '%';
      });
      data.audioUrl  = result.audioUrl;
      data.audioPath = result.audioPath;
      data.audioName = result.audioName;
    }

    if (editingSermonId) {
      await DB.updateSermon(editingSermonId, data);
    } else {
      await DB.addSermon(data);
    }
    document.getElementById('sermonForm').style.display = 'none';
    editingSermonId = null;
    _pendingAudioFile = null;
    renderSermons();
  } catch (err) {
    console.error(err);
    alert('Something went wrong uploading the audio. Please check your connection and try again.');
  } finally {
    saveBtn.disabled = false;
  }
});

/* ══════════════════════════════════════════
   ANNOUNCEMENTS
══════════════════════════════════════════ */
let editingAnnouncementId = null;
let _announcementCache = [];

async function renderAnnouncements() {
  const el = document.getElementById('announcementList');
  el.innerHTML = '<div class="adm-empty"><i class="bi bi-arrow-clockwise"></i> Loading…</div>';
  const list = await DB.getAnnouncements();
  _announcementCache = list;
  if (!list.length) {
    el.innerHTML = '<div class="adm-empty"><i class="bi bi-megaphone"></i>No announcements yet. Add one above.</div>';
    return;
  }
  el.innerHTML = list.map(a => `
    <div class="adm-item">
      <div class="adm-item-icon">${a.emoji}</div>
      <div class="adm-item-body">
        <div class="adm-item-tag">${a.tag}</div>
        <div class="adm-item-title">${a.title}</div>
        <div class="adm-item-sub">${a.body}</div>
        <div class="adm-item-sub" style="margin-top:4px"><i class="bi bi-calendar3"></i> ${a.date}</div>
      </div>
      <div class="adm-item-actions">
        <button class="adm-edit-btn" data-id="${a.id}" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="adm-del-btn"  data-id="${a.id}" title="Delete"><i class="bi bi-trash3"></i></button>
      </div>
    </div>
  `).join('');

  el.querySelectorAll('.adm-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const a = _announcementCache.find(x => x.id === btn.dataset.id);
      if (!a) return;
      editingAnnouncementId = a.id;
      document.getElementById('af_emoji').value = a.emoji;
      document.getElementById('af_tag').value   = a.tag;
      document.getElementById('af_title').value = a.title;
      document.getElementById('af_body').value  = a.body;
      document.getElementById('af_date').value  = a.date;
      document.getElementById('announcementFormTitle').textContent = 'Edit Announcement';
      document.getElementById('announcementForm').style.display = 'block';
    });
  });

  el.querySelectorAll('.adm-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      showConfirm('Delete announcement?', 'This will remove it from the Members portal.', async () => {
        await DB.deleteAnnouncement(id);
        renderAnnouncements();
      });
    });
  });
}

document.getElementById('addAnnouncementBtn').addEventListener('click', () => {
  editingAnnouncementId = null;
  ['af_emoji','af_tag','af_title','af_body','af_date'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('announcementFormTitle').textContent = 'Add Announcement';
  document.getElementById('announcementForm').style.display = 'block';
});

document.getElementById('announcementCancelBtn').addEventListener('click', () => {
  document.getElementById('announcementForm').style.display = 'none';
  editingAnnouncementId = null;
});

document.getElementById('announcementSaveBtn').addEventListener('click', async () => {
  const data = {
    emoji: document.getElementById('af_emoji').value.trim() || '📢',
    tag:   document.getElementById('af_tag').value.trim()   || 'General',
    title: document.getElementById('af_title').value.trim(),
    body:  document.getElementById('af_body').value.trim(),
    date:  document.getElementById('af_date').value.trim(),
    bg:    '',
  };
  if (!data.title || !data.body) return alert('Please fill in Title and Body.');
  if (editingAnnouncementId) {
    await DB.updateAnnouncement(editingAnnouncementId, data);
  } else {
    await DB.addAnnouncement(data);
  }
  document.getElementById('announcementForm').style.display = 'none';
  editingAnnouncementId = null;
  renderAnnouncements();
});

/* ══════════════════════════════════════════
   HOME CARDS
══════════════════════════════════════════ */
async function renderHomeCards() {
  const el   = document.getElementById('homeCardList');
  el.innerHTML = '<div class="adm-empty"><i class="bi bi-arrow-clockwise"></i> Loading…</div>';
  const list = await DB.getHomeCards();
  el.innerHTML = list.map(c => `
    <div class="adm-item" style="flex-direction:column;align-items:stretch">
      <div class="d-flex align-items-center gap-3 mb-3">
        <div class="adm-item-icon">${c.emoji}</div>
        <div class="adm-item-title">${c.label}</div>
      </div>
      <div class="adm-homecard-edit">
        <label style="font-size:12px;font-weight:600;color:#374151">Content shown to members:</label>
        <textarea rows="3" id="hc_${c.id}">${c.content}</textarea>
        <button class="adm-homecard-save" data-card-id="${c.id}">Save</button>
      </div>
    </div>
  `).join('');

  el.querySelectorAll('.adm-homecard-save').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cardId  = btn.dataset.cardId;
      const content = document.getElementById('hc_' + cardId).value.trim();
      if (!content) return;
      await DB.updateHomeCard(cardId, { content });
      btn.textContent = '✓ Saved';
      setTimeout(() => btn.textContent = 'Save', 1500);
    });
  });
}

/* ══════════════════════════════════════════
   ABOUT CHURCH  (Super Admin only)
══════════════════════════════════════════ */
const MAX_STATS = 6;

function addStatRow(t = {}) {
  const box = document.getElementById('ab_stats');
  if (box.children.length >= MAX_STATS) return;
  const row = document.createElement('div');
  row.className = 'adm-links-row';
  row.innerHTML = `
    <input type="text" class="st-num"   placeholder="Number, e.g. 400+" value="${escHtml(t.num)}">
    <input type="text" class="st-label" placeholder="Label, e.g. Congregation" value="${escHtml(t.label)}">
    <button type="button" class="adm-del-btn" title="Remove"><i class="bi bi-x-lg"></i></button>`;
  row.querySelector('button').addEventListener('click', () => { row.remove(); syncStatBtn(); });
  box.appendChild(row);
  syncStatBtn();
}
function syncStatBtn() {
  document.getElementById('ab_addStat').style.display = document.getElementById('ab_stats').children.length >= MAX_STATS ? 'none' : '';
}

async function renderAbout() {
  const status = document.getElementById('aboutStatus');
  status.textContent = '';
  const a = await DB.getAbout();
  document.getElementById('ab_text').value     = a.text || '';
  document.getElementById('ab_phone').value    = a.phone || '';
  document.getElementById('ab_email').value    = a.email || '';
  document.getElementById('ab_address').value  = a.address || '';
  document.getElementById('ab_services').value = (a.services || []).join('\n');
  document.getElementById('ab_stats').innerHTML = '';
  (a.stats || []).forEach(addStatRow);
  syncStatBtn();
}

document.getElementById('ab_addStat').addEventListener('click', () => addStatRow());
document.getElementById('aboutResetBtn').addEventListener('click', renderAbout);
document.getElementById('aboutSaveBtn').addEventListener('click', async () => {
  if (!IS_SUPER) return;
  const status = document.getElementById('aboutStatus');
  const val = id => document.getElementById(id).value.trim();
  const text = val('ab_text');
  if (!text) { status.style.color = '#ef4444'; status.textContent = 'The About text cannot be empty.'; return; }

  const data = {
    text,
    stats: [...document.querySelectorAll('#ab_stats .adm-links-row')]
      .map(r => ({ num: r.querySelector('.st-num').value.trim(), label: r.querySelector('.st-label').value.trim() }))
      .filter(t => t.num),
    phone:    val('ab_phone'),
    email:    val('ab_email'),
    address:  val('ab_address'),
    services: val('ab_services').split('\n').map(x => x.trim()).filter(Boolean),
  };

  const btn = document.getElementById('aboutSaveBtn');
  btn.disabled = true;
  try {
    await DB.setAbout(data);
    status.style.color = '#166534';
    status.textContent = '✓ Saved. Members will see this now.';
  } catch (e) {
    console.error(e);
    status.style.color = '#ef4444';
    status.textContent = 'Could not save. Check your connection and Firestore rules (the "settings" collection).';
  } finally {
    btn.disabled = false;
  }
});

/* ══════════════════════════════════════════
   WORKER REGISTRATIONS
══════════════════════════════════════════ */
async function renderRegistrations() {
  const el = document.getElementById('registrationList');
  el.innerHTML = '<div class="adm-empty"><i class="bi bi-arrow-clockwise"></i> Loading…</div>';
  let list;
  try {
    list = await DB.getRegistrations();
    if (!IS_SUPER) {
      const depts = await DB.getDepartments();
      const myNames = depts.filter(d => ME.headOf.includes(d.id)).map(d => d.name);
      list = list.filter(r => r.deptId ? ME.headOf.includes(r.deptId) : myNames.includes(r.department));
    }
  } catch (e) {
    console.error(e);
    el.innerHTML = '<div class="adm-empty"><i class="bi bi-exclamation-triangle"></i>Could not load applications.</div>';
    return;
  }
  if (!list.length) {
    el.innerHTML = '<div class="adm-empty"><i class="bi bi-person-lines-fill"></i>No applications yet.</div>';
    return;
  }
  el.innerHTML = list.map(r => `
    <div class="adm-item">
      <div class="adm-item-icon">👤</div>
      <div class="adm-item-body">
        <div class="adm-item-title">
          ${escHtml(r.fullName)}
          <span class="status-badge status-${escHtml(r.status)}">${escHtml(r.status)}</span>
        </div>
        <div class="adm-item-sub">${escHtml(r.department)} · ${escHtml(r.phone)}</div>
        ${r.email ? `<div class="adm-item-sub">${escHtml(r.email)}</div>` : ''}
        <div class="adm-item-text">${escHtml(r.reason)}</div>
        ${r.skills ? `<div class="adm-item-sub" style="margin-top:4px">Skills: ${escHtml(r.skills)}</div>` : ''}
        <div class="adm-item-sub" style="margin-top:6px;font-size:11px">Submitted: ${escHtml(r.submittedAt)}${r.deviceToken ? ' · approving adds the department to their ID' : ''}</div>
      </div>
      <div class="adm-item-actions" style="flex-direction:column">
        ${r.status === 'pending' ? `
          <button class="adm-approve-btn" data-id="${r.id}">Approve</button>
          <button class="adm-reject-btn"  data-id="${r.id}">Reject</button>
        ` : ''}
        ${IS_SUPER ? `<button class="adm-del-btn" data-id="${r.id}" title="Delete"><i class="bi bi-trash3"></i></button>` : ''}
      </div>
    </div>
  `).join('');

  const settle = async (id, status) => {
    await DB.updateRegistrationStatus(id, status);
    renderRegistrations();
    if (document.getElementById('peopleList')) renderPeople();
  };
  el.querySelectorAll('.adm-approve-btn').forEach(btn => btn.addEventListener('click', () => settle(btn.dataset.id, 'approved')));
  el.querySelectorAll('.adm-reject-btn').forEach(btn => btn.addEventListener('click', () => settle(btn.dataset.id, 'rejected')));
  el.querySelectorAll('.adm-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      showConfirm('Delete application?', 'This will permanently remove this record.', async () => {
        await DB.deleteRegistration(id);
        renderRegistrations();
      });
    });
  });
}

/* ══════════════════════════════════════════
   ATTENDANCE
   Uses registered device IDs (People & Access). Super Admins are not tracked.
══════════════════════════════════════════ */
function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

async function attendees() {
  const all = await DB.getDevices();
  const rank = r => ({ head: 0, usher: 1, other: 2 }[r]);
  return all.filter(p => !p.superAdmin).map(p => {
    const headOf = asArr(p.headOf), depts = asArr(p.departments);
    const role = headOf.length ? 'head' : (USHER_ID && depts.includes(USHER_ID) ? 'usher' : 'other');
    return { ...p, role };
  }).sort((a, b) => rank(a.role) - rank(b.role) || String(a.name).localeCompare(String(b.name)));
}

/* Department heads are ticked by the Super Admin, ushers by the Usher head. Both can change anyone. */
const roleNote = r => r === 'head' ? 'Department Head' : r === 'usher' ? 'Usher' : '';

/* -- sub-tab switching within the Attendance panel -- */
document.querySelectorAll('.adm-subtab-btn[data-att-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.adm-subtab-btn[data-att-tab]').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.adm-att-view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('att-' + btn.dataset.attTab).classList.add('active');
    if (btn.dataset.attTab === 'history') renderAttendanceHistory();
    if (btn.dataset.attTab === 'checkin') renderAttendanceCheckin();
  });
});

/* -- CHECK-IN -- */
const attDateInput = document.getElementById('att_date');
attDateInput.value = todayISO();
attDateInput.addEventListener('change', renderAttendanceCheckin);

async function renderAttendanceCheckin() {
  const el = document.getElementById('attendanceCheckinList');
  const summaryEl = document.getElementById('att_checkinSummary');
  el.innerHTML = '<div class="adm-empty"><i class="bi bi-arrow-clockwise"></i> Loading…</div>';
  summaryEl.textContent = '';

  const date = attDateInput.value || todayISO();
  let people, checkedIn;
  try {
    [people, checkedIn] = await Promise.all([attendees(), DB.getAttendanceForDate(date)]);
  } catch (e) {
    console.error(e);
    el.innerHTML = '<div class="adm-empty"><i class="bi bi-exclamation-triangle"></i>Could not load attendance.</div>';
    return;
  }

  if (!people.length) {
    el.innerHTML = '<div class="adm-empty"><i class="bi bi-people"></i>No registered IDs yet. People appear here once they register their device in the Workers\' Portal.</div>';
    return;
  }

  const presentCount = people.filter(p => checkedIn[p.id]).length;
  summaryEl.textContent = `${presentCount} of ${people.length} present`;

  el.innerHTML = people.map(p => `
    <div class="adm-item">
      <div class="adm-item-icon"><i class="bi bi-person-fill" style="color:var(--gold)"></i></div>
      <div class="adm-item-body">
        <div class="adm-item-title">${escHtml(p.name)}</div>
        ${p.phone ? `<div class="adm-item-sub">${escHtml(p.phone)}</div>` : ''}
        ${roleNote(p.role) ? `<div class="adm-dept-chips"><span class="adm-chip ${p.role === 'head' ? 'adm-chip-head' : ''}">${roleNote(p.role)} · ticked manually</span></div>` : ''}
      </div>
      <div class="adm-item-actions">
        <button class="adm-checkin-toggle ${checkedIn[p.id] ? 'present' : ''}" data-id="${escHtml(p.id)}">
          ${checkedIn[p.id] ? '✓ Present' : 'Mark Present'}
        </button>
      </div>
    </div>
  `).join('');

  el.querySelectorAll('.adm-checkin-toggle').forEach(btn => {
    btn.addEventListener('click', async () => {
      const nowPresent = !btn.classList.contains('present');
      btn.disabled = true;
      try { await DB.setCheckedIn(date, btn.dataset.id, nowPresent); }
      catch (e) { console.error(e); alert('Could not save. Try again.'); }
      renderAttendanceCheckin();
    });
  });
}

/* -- HISTORY -- */
async function renderAttendanceHistory() {
  const el = document.getElementById('attendanceHistoryList');
  el.innerHTML = '<div class="adm-empty"><i class="bi bi-arrow-clockwise"></i> Loading…</div>';

  const [people, allAttendance] = await Promise.all([attendees(), DB.getAllAttendance()]);

  const dates = Object.keys(allAttendance).sort();
  const totalSessions = dates.length;

  if (!people.length) {
    el.innerHTML = '<div class="adm-empty"><i class="bi bi-people"></i>No registered IDs yet.</div>';
    return;
  }
  if (!totalSessions) {
    el.innerHTML = '<div class="adm-empty"><i class="bi bi-clipboard2-check"></i>No attendance has been recorded yet. Use the "Check-In" tab on a Sunday to start tracking.</div>';
    return;
  }

  const rows = people.map(p => {
    const timesPresent = dates.filter(d => allAttendance[d][p.id]).length;
    const pct = Math.round((timesPresent / totalSessions) * 100);
    return { name: p.name, timesPresent, pct };
  }).sort((a, b) => b.pct - a.pct);

  el.innerHTML = `
    <div style="overflow-x:auto">
      <table class="adm-history-table">
        <thead>
          <tr><th>Name</th><th>Sundays Present</th><th>Attendance</th></tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td>${escHtml(r.name)}</td>
              <td>${r.timesPresent} / ${totalSessions}</td>
              <td>
                <div class="adm-history-bar-wrap">
                  <div class="adm-history-bar"><div class="adm-history-bar-fill" style="width:${r.pct}%"></div></div>
                  <span class="adm-history-pct">${r.pct}%</span>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <p style="font-size:12px;color:#6b7280;margin-top:14px">Based on ${totalSessions} recorded service${totalSessions === 1 ? '' : 's'}. Super Admins are not tracked.</p>
  `;
}

/* -- EXCEL DOWNLOAD (Super Admin + Usher head; the Attendance panel is only visible to them) -- */
document.getElementById('attDownloadBtn').addEventListener('click', async () => {
  if (!canSeeAttendance()) return;
  if (typeof XLSX === 'undefined') return alert('Excel library did not load. Check your connection and reload.');
  const btn = document.getElementById('attDownloadBtn');
  btn.disabled = true;
  try {
    const [people, all] = await Promise.all([attendees(), DB.getAllAttendance()]);
    const dates = Object.keys(all).sort();
    if (!dates.length) { alert('No attendance has been recorded yet.'); return; }

    const summary = [['Name', 'Phone', 'Role', 'Services present', 'Total services', 'Attendance %']];
    people.forEach(p => {
      const n = dates.filter(d => all[d][p.id]).length;
      summary.push([p.name || '', p.phone || '', roleNote(p.role) || 'Worker / Member', n, dates.length, Math.round((n / dates.length) * 100) + '%']);
    });

    const byDate = [['Name', 'Phone', 'Role', ...dates]];
    people.forEach(p => byDate.push([p.name || '', p.phone || '', roleNote(p.role) || 'Worker / Member', ...dates.map(d => all[d][p.id] ? 'Present' : 'Absent')]));

    const wb = XLSX.utils.book_new();
    const s1 = XLSX.utils.aoa_to_sheet(summary);
    const s2 = XLSX.utils.aoa_to_sheet(byDate);
    s1['!cols'] = [{ wch: 26 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 14 }];
    s2['!cols'] = [{ wch: 26 }, { wch: 16 }, { wch: 18 }, ...dates.map(() => ({ wch: 12 }))];
    XLSX.utils.book_append_sheet(wb, s1, 'Summary');
    XLSX.utils.book_append_sheet(wb, s2, 'By date');
    XLSX.writeFile(wb, `attendance-${todayISO()}.xlsx`);
  } catch (e) {
    console.error(e);
    alert('Could not create the Excel file. Try again.');
  } finally {
    btn.disabled = false;
  }
});

/* ══════════════════════════════════════════
   LIVE SERVICE LINK
══════════════════════════════════════════ */
(async function initLivePanel() {
  const input  = document.getElementById('live_url');
  const status = document.getElementById('liveStatus');
  try { input.value = await DB.getLiveLink(); } catch (e) {}

  async function save(url) {
    if (url && !/^https?:\/\//i.test(url)) {
      status.textContent = 'Link must start with https://';
      return;
    }
    try {
      await DB.setLiveLink(url);
      input.value = url;
      status.textContent = url ? '✓ Saved. Members will see this link now.' : '✓ Link cleared.';
    } catch (e) {
      console.error(e);
      status.textContent = 'Could not save. Check your connection and Firestore rules.';
    }
  }
  document.getElementById('liveSaveBtn').addEventListener('click', () => save(input.value.trim()));
  document.getElementById('liveClearBtn').addEventListener('click', () => save(''));
})();

/* ══════════════════════════════════════════
   DEPARTMENTS (Workers' Portal)
══════════════════════════════════════════ */
let editingDeptId = null;
let _deptCache = [];


/* "08012345678" -> "2348012345678"; strips spaces, +, dashes */
function normalizePhone(v) {
  const d = String(v || '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('0')) return '234' + d.slice(1);
  return d;
}

function addMeetingRow(m = {}) {
  const row = document.createElement('div');
  row.className = 'adm-meeting-row';
  row.innerHTML = `
    <input type="text" class="mt-day"   placeholder="Day, e.g. Sunday"      value="${escHtml(m.day)}">
    <input type="text" class="mt-time"  placeholder="Time, e.g. 6:00 PM"    value="${escHtml(m.time)}">
    <input type="text" class="mt-label" placeholder="What, e.g. Rehearsal"  value="${escHtml(m.label)}">
    <button type="button" class="adm-del-btn" title="Remove"><i class="bi bi-x-lg"></i></button>`;
  row.querySelector('button').addEventListener('click', () => row.remove());
  document.getElementById('df_meetings').appendChild(row);
}

function addLinkRow(l = {}) {
  const row = document.createElement('div');
  row.className = 'adm-links-row';
  row.innerHTML = `
    <input type="text" class="lk-label" placeholder="What is it for? e.g. Choir WhatsApp group" value="${escHtml(l.label)}">
    <input type="text" class="lk-url"   placeholder="Link, e.g. https://chat.whatsapp.com/…" value="${escHtml(l.url)}">
    <button type="button" class="adm-del-btn" title="Remove"><i class="bi bi-x-lg"></i></button>`;
  row.querySelector('button').addEventListener('click', () => row.remove());
  document.getElementById('df_links').appendChild(row);
}

function openDeptForm(d) {
  editingDeptId = d ? d.id : null;
  const v = (id, val) => { document.getElementById(id).value = val ?? ''; };
  v('df_icon', d?.icon);
  v('df_name', d?.name);
  // Only a Super Admin can rename a department (Usher/Prayer access is found by name)
  document.getElementById('df_name').disabled = !IS_SUPER;
  v('df_schedule', d?.schedule);
  v('df_members', d?.members);
  v('df_shortDesc', d?.shortDesc);
  v('df_about', d?.about);
  v('df_announcement', d?.announcement);
  v('df_requirements', (d?.requirements || []).join('\n'));
  v('df_leader', d?.leader);
  v('df_whatsapp', d?.whatsapp);
  v('df_phone', d?.phone);
  document.getElementById('df_links').innerHTML = '';
  (d?.links || []).forEach(addLinkRow);
  document.getElementById('df_meetings').innerHTML = '';
  const meetings = d?.meetings?.length ? d.meetings : (d ? [] : [{}]);
  meetings.forEach(addMeetingRow);
  document.getElementById('deptFormTitle').textContent = d ? 'Edit Department' : 'Add Department';
  const form = document.getElementById('deptForm');
  form.style.display = 'block';
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeDeptForm() {
  document.getElementById('deptForm').style.display = 'none';
  editingDeptId = null;
}

async function renderDepartments() {
  const el = document.getElementById('deptList');
  el.innerHTML = '<div class="adm-empty"><i class="bi bi-arrow-clockwise"></i> Loading…</div>';

  let list;
  try {
    if (IS_SUPER) await DB.seedDepartments();   // first visit: copy defaults so they can be edited
    list = await DB.getDepartments();
    if (!IS_SUPER) list = list.filter(d => ME.headOf.includes(d.id));
  } catch (e) {
    console.error(e);
    el.innerHTML = '<div class="adm-empty"><i class="bi bi-exclamation-triangle"></i>Could not load departments. Check your connection and Firestore rules (the "departments" collection needs read/write access).</div>';
    return;
  }
  _deptCache = list;
  openRequestedDept();

  if (!list.length) {
    el.innerHTML = `<div class="adm-empty"><i class="bi bi-diagram-3"></i>${IS_SUPER ? 'No departments yet. Add one above.' : 'You are not the head of any department yet.'}</div>`;
    return;
  }

  el.innerHTML = list.map((d, i) => {
    const meta = [d.schedule, (d.members !== '' && d.members != null) ? `${d.members} members` : ''].filter(Boolean).map(escHtml).join(' · ');
    const chips = [
      d.leader ? `<span class="adm-chip"><i class="bi bi-person"></i> ${escHtml(d.leader)}</span>` : '<span class="adm-chip">No leader set</span>',
      `<span class="adm-chip"><i class="bi bi-calendar3"></i> ${(d.meetings || []).length} meeting${(d.meetings || []).length === 1 ? '' : 's'}</span>`,
      `<span class="adm-chip"><i class="bi bi-check2-square"></i> ${(d.requirements || []).length} requirement${(d.requirements || []).length === 1 ? '' : 's'}</span>`,
      d.announcement ? `<span class="adm-chip"><i class="bi bi-megaphone"></i> Announcement set</span>` : '',
      (d.links || []).length ? `<span class="adm-chip"><i class="bi bi-link-45deg"></i> ${d.links.length} link${d.links.length === 1 ? '' : 's'}</span>` : '',
    ].join('');
    return `
    <div class="adm-item">
      <div class="adm-item-icon">${escHtml(d.icon || '⛪')}</div>
      <div class="adm-item-body">
        <div class="adm-item-title">${escHtml(d.name)}</div>
        ${meta ? `<div class="adm-item-sub" style="color:var(--gold);font-weight:600">${meta}</div>` : ''}
        ${d.shortDesc ? `<div class="adm-item-sub">${escHtml(d.shortDesc)}</div>` : ''}
        <div class="adm-dept-chips">${chips}</div>
      </div>
      <div class="adm-item-actions">
        ${IS_SUPER ? `<button class="adm-move-btn" data-move="up"   data-id="${d.id}" title="Move up"   ${i === 0 ? 'disabled' : ''}><i class="bi bi-arrow-up"></i></button>
        <button class="adm-move-btn" data-move="down" data-id="${d.id}" title="Move down" ${i === list.length - 1 ? 'disabled' : ''}><i class="bi bi-arrow-down"></i></button>` : ''}
        <button class="adm-edit-btn" data-id="${d.id}" title="Edit"><i class="bi bi-pencil"></i></button>
        ${IS_SUPER ? `<button class="adm-del-btn"  data-id="${d.id}" title="Delete"><i class="bi bi-trash3"></i></button>` : ''}
      </div>
    </div>`;
  }).join('');

  el.querySelectorAll('.adm-move-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = _deptCache.findIndex(x => x.id === btn.dataset.id);
      const other = _deptCache[idx + (btn.dataset.move === 'up' ? -1 : 1)];
      if (idx < 0 || !other) return;
      btn.disabled = true;
      await DB.swapDepartmentOrder(_deptCache[idx], other);
      renderDepartments();
    });
  });

  el.querySelectorAll('.adm-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = _deptCache.find(x => x.id === btn.dataset.id);
      if (d) openDeptForm(d);
    });
  });

  el.querySelectorAll('.adm-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = _deptCache.find(x => x.id === btn.dataset.id);
      showConfirm(`Delete ${d ? d.name : 'department'}?`, "It will be removed from the Workers' portal. Existing applications stay in Worker Applications.", async () => {
        await DB.deleteDepartment(btn.dataset.id);
        renderDepartments();
      });
    });
  });
}

/* Link from the Workers' Portal card ("Edit department"): admin.html?edit=<deptId>.
   Only opens if this person may manage that department (Super Admin, or that department's head). */
let _wantedDept = new URLSearchParams(location.search).get('edit');
function openRequestedDept() {
  if (!_wantedDept) return;
  const id = _wantedDept;
  _wantedDept = null;
  history.replaceState(null, '', location.pathname);
  const d = _deptCache.find(x => x.id === id);
  if (!d || !canManage(id)) return;
  switchPanel('departments');
  openDeptForm(d);
}

document.getElementById('addDeptBtn').addEventListener('click', () => openDeptForm(null));
document.getElementById('deptCancelBtn').addEventListener('click', closeDeptForm);
document.getElementById('df_addMeeting').addEventListener('click', () => addMeetingRow());
document.getElementById('df_addLink').addEventListener('click', () => addLinkRow());

document.getElementById('deptSaveBtn').addEventListener('click', async () => {
  const val = id => document.getElementById(id).value.trim();
  if (!editingDeptId && !IS_SUPER) return;
  if (editingDeptId && !canManage(editingDeptId)) return alert('You can only edit your own department.');
  const current = _deptCache.find(x => x.id === editingDeptId);
  // A head's rename attempt is ignored: the saved name is kept
  const name = IS_SUPER ? val('df_name') : (current ? current.name : '');
  if (!name) return alert('Please enter the department name.');

  const membersRaw = val('df_members');
  const meetings = [...document.querySelectorAll('#df_meetings .adm-meeting-row')]
    .map(r => ({
      day:   r.querySelector('.mt-day').value.trim(),
      time:  r.querySelector('.mt-time').value.trim(),
      label: r.querySelector('.mt-label').value.trim(),
    }))
    .filter(m => m.day || m.time || m.label);

  const links = [...document.querySelectorAll('#df_links .adm-links-row')]
    .map(r => ({ label: r.querySelector('.lk-label').value.trim(), url: cleanLinkUrl(r.querySelector('.lk-url').value) }))
    .filter(l => l.url);

  const data = {
    links,
    icon:         val('df_icon') || '⛪',
    name,
    schedule:     val('df_schedule'),
    members:      membersRaw === '' ? '' : Math.max(0, parseInt(membersRaw, 10) || 0),
    shortDesc:    val('df_shortDesc'),
    about:        val('df_about'),
    announcement: val('df_announcement'),
    meetings,
    requirements: val('df_requirements').split('\n').map(s => s.trim()).filter(Boolean),
    leader:       val('df_leader'),
    whatsapp:     normalizePhone(val('df_whatsapp')),
    phone:        normalizePhone(val('df_phone')),
  };

  const btn = document.getElementById('deptSaveBtn');
  btn.disabled = true;
  try {
    if (editingDeptId) await DB.updateDepartment(editingDeptId, data);
    else               await DB.addDepartment(data);
    closeDeptForm();
    renderDepartments();
  } catch (e) {
    console.error(e);
    alert('Could not save. Please check your connection and try again.');
  } finally {
    btn.disabled = false;
  }
});

/* ══════════════════════════════════════════
   PEOPLE & ACCESS  (devices/IDs)
══════════════════════════════════════════ */
let _people = [], _peopleDepts = [], editingPerson = null;
const asArr = v => Array.isArray(v) ? v : [];

function personRecord(p) {
  return { ...p, departments: asArr(p.departments), requested: asArr(p.requested), headOf: asArr(p.headOf), superAdmin: !!p.superAdmin };
}

function contactLinks(p) {
  const wa = waNumber(p.whatsapp), ph = waNumber(p.phone);
  return `<div class="adm-person-contacts">
    ${ph ? `<a href="tel:+${ph}"><i class="bi bi-telephone"></i>${escHtml(p.phone)}</a>` : ''}
    ${wa ? `<a href="https://wa.me/${wa}" target="_blank" rel="noopener"><i class="bi bi-whatsapp"></i>${escHtml(p.whatsapp)}</a>` : ''}
  </div>`;
}

async function renderPeople() {
  const reqEl = document.getElementById('peopleRequests');
  const el    = document.getElementById('peopleList');
  el.innerHTML = '<div class="adm-empty"><i class="bi bi-arrow-clockwise"></i> Loading…</div>';
  try {
    [_people, _peopleDepts] = await Promise.all([DB.getDevices(), DB.getDepartments()]);
  } catch (e) {
    console.error(e);
    reqEl.innerHTML = '';
    el.innerHTML = '<div class="adm-empty"><i class="bi bi-exclamation-triangle"></i>Could not load people. Check your Firestore rules (the "devices" collection needs read/write access).</div>';
    return;
  }
  _people = _people.map(personRecord);
  const dept   = id => _peopleDepts.find(d => d.id === id);
  const inScope = id => canManage(id) && !!dept(id);

  // head: only people connected to one of my departments
  const visible = IS_SUPER ? _people
    : _people.filter(p => [...p.departments, ...p.requested, ...p.headOf].some(id => ME.headOf.includes(id)));

  /* pending department requests */
  const reqs = [];
  visible.forEach(p => p.requested.filter(inScope).forEach(id => reqs.push({ p, id })));
  reqEl.innerHTML = reqs.length ? `
    <div class="adm-form-section" style="margin:0 0 8px">Pending requests (${reqs.length})</div>
    ${reqs.map(({ p, id }) => `
      <div class="adm-req-card"><div class="adm-item">
        <div class="adm-item-icon">${escHtml(dept(id).icon || '⛪')}</div>
        <div class="adm-item-body">
          <div class="adm-item-title">${escHtml(p.name)} <span class="adm-hint">wants to join</span> ${escHtml(dept(id).name)}</div>
          ${contactLinks(p)}
        </div>
        <div class="adm-item-actions" style="flex-direction:column">
          <button class="adm-approve-btn" data-act="approve" data-t="${p.token || p.id}" data-d="${escHtml(id)}">Approve</button>
          <button class="adm-reject-btn"  data-act="reject"  data-t="${p.token || p.id}" data-d="${escHtml(id)}">Reject</button>
        </div>
      </div></div>`).join('')}` : '';

  reqEl.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', async () => {
    b.disabled = true;
    try {
      if (b.dataset.act === 'approve') await DB.approveDept(b.dataset.t, b.dataset.d);
      else await DB.rejectDept(b.dataset.t, b.dataset.d);
    } catch (e) { console.error(e); alert('Could not update. Try again.'); }
    renderPeople();
    renderRegistrations();
  }));

  /* everyone */
  if (!visible.length) {
    el.innerHTML = `<div class="adm-empty"><i class="bi bi-people"></i>${IS_SUPER ? 'No devices registered yet.' : 'No members yet.'}</div>`;
    return;
  }
  el.innerHTML = visible.map(p => {
    const chips = [];
    if (p.superAdmin) chips.push('<span class="adm-chip adm-chip-super"><i class="bi bi-shield-fill-check"></i> Super Admin</span>');
    p.headOf.filter(id => dept(id) && (IS_SUPER || inScope(id))).forEach(id => chips.push(`<span class="adm-chip adm-chip-head"><i class="bi bi-star-fill"></i> Head · ${escHtml(dept(id).name)}</span>`));
    p.departments.filter(id => dept(id) && !p.headOf.includes(id) && (IS_SUPER || inScope(id))).forEach(id => chips.push(`<span class="adm-chip">${escHtml(dept(id).icon || '')} ${escHtml(dept(id).name)}</span>`));
    if (IS_SUPER && !p.superAdmin && !p.departments.some(id => dept(id))) chips.push('<span class="adm-chip">Non-worker</span>');
    const me_ = ME && (p.token === ME.token);
    return `
    <div class="adm-item">
      <div class="adm-item-icon">👤</div>
      <div class="adm-item-body">
        <div class="adm-item-title">${escHtml(p.name)} ${me_ ? '<span class="status-badge status-approved">This device</span>' : ''}</div>
        ${contactLinks(p)}
        ${p.dob ? `<div class="adm-item-sub"><i class="bi bi-cake2"></i> ${escHtml(new Date(p.dob + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))}</div>` : ''}
        <div class="adm-dept-chips">${chips.join('')}</div>
      </div>
      <div class="adm-item-actions">
        <button class="adm-edit-btn" data-edit="${p.token || p.id}" title="${IS_SUPER ? 'Edit' : 'Manage'}"><i class="bi bi-pencil"></i></button>
        ${IS_SUPER ? `<button class="adm-del-btn" data-del="${p.token || p.id}" title="Remove this device"><i class="bi bi-trash3"></i></button>` : ''}
      </div>
    </div>`;
  }).join('');

  el.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openPersonForm(_people.find(x => (x.token || x.id) === b.dataset.edit))));
  el.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
    const p = _people.find(x => (x.token || x.id) === b.dataset.del);
    if (!p) return;
    if (p.superAdmin && _people.filter(x => x.superAdmin).length <= 1) return alert('This is the only Super Admin. Make someone else a Super Admin first.');
    showConfirm(`Remove ${p.name}?`, 'Their device loses its ID and department access. They would have to register again.', async () => {
      await DB.deleteDevice(p.token || p.id);
      if ((p.token || p.id) === ME.token) { Access.reset(); return; }
      renderPeople();
    });
  }));
}

function openPersonForm(p) {
  if (!p) return;
  editingPerson = p;
  const f = document.getElementById('personForm');
  document.getElementById('personFormTitle').textContent = IS_SUPER ? `Edit ${p.name}` : `Manage ${p.name}`;
  document.getElementById('pf_name').value = p.name || '';
  document.getElementById('pf_phone').value = p.phone || '';
  document.getElementById('pf_whatsapp').value = p.whatsapp || '';
  document.getElementById('pf_dob').value = p.dob || '';
  ['pf_name', 'pf_phone', 'pf_whatsapp', 'pf_dob'].forEach(id => { document.getElementById(id).disabled = !IS_SUPER; });
  document.getElementById('pf_superWrap').style.display = IS_SUPER ? '' : 'none';
  document.getElementById('pf_super').checked = !!p.superAdmin;
  document.getElementById('personStatus').textContent = '';

  const shown = _peopleDepts.filter(d => canManage(d.id));
  document.getElementById('pf_depts').innerHTML = shown.map(d => `
    <div class="pick-row">
      <label><input type="checkbox" class="pk-m" data-id="${escHtml(d.id)}" ${p.departments.includes(d.id) || p.headOf.includes(d.id) ? 'checked' : ''}> ${escHtml(d.icon || '')} ${escHtml(d.name)}${p.requested.includes(d.id) ? ' <span class="adm-hint">(requested)</span>' : ''}</label>
      <label class="pick-head"><input type="checkbox" class="pk-h" data-id="${escHtml(d.id)}" ${p.headOf.includes(d.id) ? 'checked' : ''}> Head</label>
    </div>`).join('') || '<span class="adm-hint">No departments to assign.</span>';
  const box = document.getElementById('pf_depts');
  box.querySelectorAll('.pk-h').forEach(h => h.addEventListener('change', () => {
    if (h.checked) box.querySelector(`.pk-m[data-id="${CSS.escape(h.dataset.id)}"]`).checked = true;
  }));
  box.querySelectorAll('.pk-m').forEach(m => m.addEventListener('change', () => {
    if (!m.checked) box.querySelector(`.pk-h[data-id="${CSS.escape(m.dataset.id)}"]`).checked = false;
  }));
  f.style.display = 'block';
  f.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closePersonForm() {
  document.getElementById('personForm').style.display = 'none';
  editingPerson = null;
}

document.getElementById('personCancelBtn').addEventListener('click', closePersonForm);
document.getElementById('personSaveBtn').addEventListener('click', async () => {
  const p = editingPerson;
  if (!p) return;
  const status = document.getElementById('personStatus');
  status.textContent = '';
  const box = document.getElementById('pf_depts');
  const isMember = id => box.querySelector(`.pk-m[data-id="${CSS.escape(id)}"]`)?.checked;
  const isHead   = id => box.querySelector(`.pk-h[data-id="${CSS.escape(id)}"]`)?.checked;
  const shownIds = [...box.querySelectorAll('.pk-m')].map(x => x.dataset.id);
  const known = new Set(_peopleDepts.map(d => d.id));

  // ids outside the edited set are kept as they were (so a head can't touch other departments)
  const departments = [...new Set([...p.departments.filter(id => known.has(id) && !shownIds.includes(id)), ...shownIds.filter(isMember)])];
  const headOf      = [...new Set([...p.headOf.filter(id => known.has(id) && !shownIds.includes(id)), ...shownIds.filter(isHead)])];
  const requested   = p.requested.filter(id => known.has(id) && !departments.includes(id));
  const data = { departments, headOf, requested };

  if (IS_SUPER) {
    const name = document.getElementById('pf_name').value.trim();
    if (!name) { status.textContent = 'Name cannot be empty.'; return; }
    data.name = name;
    data.phone = document.getElementById('pf_phone').value.trim();
    data.whatsapp = document.getElementById('pf_whatsapp').value.trim();
    data.dob = document.getElementById('pf_dob').value;
    data.superAdmin = document.getElementById('pf_super').checked;
    if (p.superAdmin && !data.superAdmin) {
      if (_people.filter(x => x.superAdmin).length <= 1) { status.textContent = 'This is the only Super Admin. Make someone else a Super Admin first.'; return; }
      if ((p.token || p.id) === ME.token && !confirm('You are removing your own Super Admin access. Continue?')) return;
    }
  }

  const btn = document.getElementById('personSaveBtn');
  btn.disabled = true;
  try {
    await DB.updateDevice(p.token || p.id, data);
    closePersonForm();
    await renderPeople();
    renderRegistrations();
    if ((p.token || p.id) === ME.token) {
      // editing my own ID: if I lost admin access, reload so the gate re-checks
      if (!(data.superAdmin ?? ME.superAdmin) && !headOf.length) location.reload();
    }
  } catch (e) {
    console.error(e);
    status.textContent = 'Could not save. Check your connection and try again.';
  } finally {
    btn.disabled = false;
  }
});

/* ── INIT ── */
Access.requireAdmin().then(async me => {
  ME = me;
  try { const u = await DB.getUsherDept(); USHER_ID = u ? u.id : null; } catch (e) { console.error(e); }
  applyRole();
  if (IS_SUPER) {
    renderPrayers();
    renderSermons();
    renderAnnouncements();
    renderHomeCards();
    renderAbout();
  }
  if (canSeeAttendance()) renderAttendanceCheckin();
  renderRegistrations();
  renderDepartments();
  renderPeople();
});

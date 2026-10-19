/* admin.js */

/* ── AUTH ── */
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'grace2024';
const SESSION_KEY    = 'cog_admin_auth';

(function initAuth() {
  const overlay    = document.getElementById('loginOverlay');
  const loginBtn   = document.getElementById('loginBtn');
  const logoutBtn  = document.getElementById('logoutBtn');
  const loginError = document.getElementById('loginError');
  const eyeBtn     = document.getElementById('loginEyeBtn');
  const eyeIcon    = document.getElementById('loginEyeIcon');
  const pwInput    = document.getElementById('loginPassword');

  function showDashboard() { overlay.classList.add('hidden'); }
  function showLogin()     { overlay.classList.remove('hidden'); }

  if (localStorage.getItem(SESSION_KEY) === '1') showDashboard();

  function attemptLogin() {
    const user = document.getElementById('loginUsername').value.trim();
    const pass = pwInput.value;
    if (user === ADMIN_USERNAME && pass === ADMIN_PASSWORD) {
      loginError.classList.remove('visible');
      localStorage.setItem(SESSION_KEY, '1');
      showDashboard();
    } else {
      loginError.classList.add('visible');
      pwInput.value = '';
      pwInput.focus();
    }
  }

  loginBtn.addEventListener('click', attemptLogin);
  ['loginUsername', 'loginPassword'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') attemptLogin();
    });
  });

  eyeBtn.addEventListener('click', () => {
    const isHidden = pwInput.type === 'password';
    pwInput.type = isHidden ? 'text' : 'password';
    eyeIcon.className = isHidden ? 'bi bi-eye-slash' : 'bi bi-eye';
  });

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem(SESSION_KEY);
    showLogin();
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
  });
})();

/* ── PANEL SWITCHING ── */
function switchPanel(id) {
  document.querySelectorAll('.adm-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.adm-nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  document.querySelectorAll(`.adm-nav-btn[data-panel="${id}"]`).forEach(b => b.classList.add('active'));
  document.getElementById('mobileDrawer').classList.remove('open');
}

document.querySelectorAll('.adm-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchPanel(btn.dataset.panel));
});

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
        <div class="adm-item-sub">Anonymous · ${p.time} · ${p.prayCount || 0} praying</div>
        <div class="adm-item-text">${p.text}</div>
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

function sermonCatLabel(cat) {
  return cat === 'guest' ? 'Guest Speaker / Special Program' : 'Church (Main Sunday Service)';
}

async function renderSermons() {
  const el = document.getElementById('sermonList');
  el.innerHTML = '<div class="adm-empty"><i class="bi bi-arrow-clockwise"></i> Loading…</div>';
  const list = await DB.getSermons();
  _sermonCache = list;
  const filtered = list.filter(s => (s.category || 'church') === _sermonActiveCat);

  if (!filtered.length) {
    el.innerHTML = `<div class="adm-empty"><i class="bi bi-mic"></i>No ${_sermonActiveCat === 'guest' ? 'guest speaker' : 'church'} sermons yet. Add one above.</div>`;
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
          : `<div class="adm-item-audio-badge missing"><i class="bi bi-exclamation-circle-fill"></i> No audio uploaded</div>`}
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
   WORKER REGISTRATIONS
══════════════════════════════════════════ */
async function renderRegistrations() {
  const el = document.getElementById('registrationList');
  el.innerHTML = '<div class="adm-empty"><i class="bi bi-arrow-clockwise"></i> Loading…</div>';
  const list = await DB.getRegistrations();
  if (!list.length) {
    el.innerHTML = '<div class="adm-empty"><i class="bi bi-person-lines-fill"></i>No applications yet.</div>';
    return;
  }
  el.innerHTML = list.map(r => `
    <div class="adm-item">
      <div class="adm-item-icon">👤</div>
      <div class="adm-item-body">
        <div class="adm-item-title">
          ${r.fullName}
          <span class="status-badge status-${r.status}">${r.status}</span>
        </div>
        <div class="adm-item-sub">${r.department} · ${r.phone}</div>
        <div class="adm-item-sub">${r.email}</div>
        <div class="adm-item-text">${r.reason}</div>
        <div class="adm-item-sub" style="margin-top:6px;font-size:11px">Submitted: ${r.submittedAt}</div>
      </div>
      <div class="adm-item-actions" style="flex-direction:column">
        ${r.status === 'pending' ? `
          <button class="adm-approve-btn" data-id="${r.id}">Approve</button>
          <button class="adm-reject-btn"  data-id="${r.id}">Reject</button>
        ` : ''}
        <button class="adm-del-btn" data-id="${r.id}" title="Delete"><i class="bi bi-trash3"></i></button>
      </div>
    </div>
  `).join('');

  el.querySelectorAll('.adm-approve-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await DB.updateRegistrationStatus(btn.dataset.id, 'approved');
      renderRegistrations();
    });
  });
  el.querySelectorAll('.adm-reject-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await DB.updateRegistrationStatus(btn.dataset.id, 'rejected');
      renderRegistrations();
    });
  });
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
══════════════════════════════════════════ */
let _rosterCache = [];

function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

/* -- sub-tab switching within the Attendance panel -- */
document.querySelectorAll('.adm-subtab-btn[data-att-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.adm-subtab-btn[data-att-tab]').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.adm-att-view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('att-' + btn.dataset.attTab).classList.add('active');
    if (btn.dataset.attTab === 'history') renderAttendanceHistory();
    if (btn.dataset.attTab === 'roster') renderAttendanceRoster();
    if (btn.dataset.attTab === 'checkin') renderAttendanceCheckin();
  });
});

/* -- ROSTER -- */
async function renderAttendanceRoster() {
  const el = document.getElementById('attendanceRosterList');
  el.innerHTML = '<div class="adm-empty"><i class="bi bi-arrow-clockwise"></i> Loading…</div>';
  const members = await DB.getMembers();
  _rosterCache = members;
  if (!members.length) {
    el.innerHTML = '<div class="adm-empty"><i class="bi bi-people"></i>No members added yet. Add names above.</div>';
    return;
  }
  el.innerHTML = members.map(m => `
    <div class="adm-item">
      <div class="adm-item-icon"><i class="bi bi-person-fill" style="color:var(--gold)"></i></div>
      <div class="adm-item-body"><div class="adm-item-title">${m.name}</div></div>
      <div class="adm-item-actions">
        <button class="adm-del-btn" data-id="${m.id}" title="Remove"><i class="bi bi-trash3"></i></button>
      </div>
    </div>
  `).join('');

  el.querySelectorAll('.adm-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const m = members.find(x => x.id === btn.dataset.id);
      showConfirm('Remove member?', `This deletes "${m ? m.name : ''}" from the roster. Their past attendance records will stay in history.`, async () => {
        await DB.deleteMember(btn.dataset.id);
        renderAttendanceRoster();
      });
    });
  });
}

document.getElementById('att_addMemberBtn').addEventListener('click', async () => {
  const input = document.getElementById('att_newMemberName');
  const name = input.value.trim();
  if (!name) return input.focus();
  await DB.addMember(name);
  input.value = '';
  renderAttendanceRoster();
});
document.getElementById('att_newMemberName').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('att_addMemberBtn').click();
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
  const [members, checkedIn] = await Promise.all([
    DB.getMembers(),
    DB.getAttendanceForDate(date),
  ]);
  _rosterCache = members;

  if (!members.length) {
    el.innerHTML = '<div class="adm-empty"><i class="bi bi-people"></i>No members in the roster yet. Add names under the "Members" tab first.</div>';
    return;
  }

  const presentCount = Object.keys(checkedIn).length;
  summaryEl.textContent = `${presentCount} of ${members.length} present`;

  el.innerHTML = members.map(m => `
    <div class="adm-item">
      <div class="adm-item-icon"><i class="bi bi-person-fill" style="color:var(--gold)"></i></div>
      <div class="adm-item-body"><div class="adm-item-title">${m.name}</div></div>
      <div class="adm-item-actions">
        <button class="adm-checkin-toggle ${checkedIn[m.id] ? 'present' : ''}" data-id="${m.id}">
          ${checkedIn[m.id] ? '✓ Present' : 'Mark Present'}
        </button>
      </div>
    </div>
  `).join('');

  el.querySelectorAll('.adm-checkin-toggle').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const nowPresent = !btn.classList.contains('present');
      btn.disabled = true;
      await DB.setCheckedIn(date, id, nowPresent);
      btn.disabled = false;
      renderAttendanceCheckin();
    });
  });
}

/* -- HISTORY -- */
async function renderAttendanceHistory() {
  const el = document.getElementById('attendanceHistoryList');
  el.innerHTML = '<div class="adm-empty"><i class="bi bi-arrow-clockwise"></i> Loading…</div>';

  const [members, allAttendance] = await Promise.all([
    DB.getMembers(),
    DB.getAllAttendance(),
  ]);

  const dates = Object.keys(allAttendance).sort();
  const totalSessions = dates.length;

  if (!members.length) {
    el.innerHTML = '<div class="adm-empty"><i class="bi bi-people"></i>No members in the roster yet.</div>';
    return;
  }
  if (!totalSessions) {
    el.innerHTML = '<div class="adm-empty"><i class="bi bi-clipboard2-check"></i>No attendance has been recorded yet. Use the "Check-In" tab on a Sunday to start tracking.</div>';
    return;
  }

  const rows = members.map(m => {
    const timesPresent = dates.filter(d => allAttendance[d][m.id]).length;
    const pct = Math.round((timesPresent / totalSessions) * 100);
    return { name: m.name, timesPresent, pct };
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
              <td>${r.name}</td>
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
    <p style="font-size:12px;color:#6b7280;margin-top:14px">Based on ${totalSessions} recorded Sunday${totalSessions === 1 ? '' : 's'}.</p>
  `;
}

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

const escHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

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

function openDeptForm(d) {
  editingDeptId = d ? d.id : null;
  const v = (id, val) => { document.getElementById(id).value = val ?? ''; };
  v('df_icon', d?.icon);
  v('df_name', d?.name);
  v('df_schedule', d?.schedule);
  v('df_members', d?.members);
  v('df_shortDesc', d?.shortDesc);
  v('df_about', d?.about);
  v('df_requirements', (d?.requirements || []).join('\n'));
  v('df_leader', d?.leader);
  v('df_whatsapp', d?.whatsapp);
  v('df_phone', d?.phone);
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
    await DB.seedDepartments();          // first visit: copy defaults so they can be edited
    list = await DB.getDepartments();
  } catch (e) {
    console.error(e);
    el.innerHTML = '<div class="adm-empty"><i class="bi bi-exclamation-triangle"></i>Could not load departments. Check your connection and Firestore rules (the "departments" collection needs read/write access).</div>';
    return;
  }
  _deptCache = list;

  if (!list.length) {
    el.innerHTML = '<div class="adm-empty"><i class="bi bi-diagram-3"></i>No departments yet. Add one above.</div>';
    return;
  }

  el.innerHTML = list.map((d, i) => {
    const meta = [d.schedule, (d.members !== '' && d.members != null) ? `${d.members} members` : ''].filter(Boolean).map(escHtml).join(' · ');
    const chips = [
      d.leader ? `<span class="adm-chip"><i class="bi bi-person"></i> ${escHtml(d.leader)}</span>` : '<span class="adm-chip">No leader set</span>',
      `<span class="adm-chip"><i class="bi bi-calendar3"></i> ${(d.meetings || []).length} meeting${(d.meetings || []).length === 1 ? '' : 's'}</span>`,
      `<span class="adm-chip"><i class="bi bi-check2-square"></i> ${(d.requirements || []).length} requirement${(d.requirements || []).length === 1 ? '' : 's'}</span>`,
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
        <button class="adm-move-btn" data-move="up"   data-id="${d.id}" title="Move up"   ${i === 0 ? 'disabled' : ''}><i class="bi bi-arrow-up"></i></button>
        <button class="adm-move-btn" data-move="down" data-id="${d.id}" title="Move down" ${i === list.length - 1 ? 'disabled' : ''}><i class="bi bi-arrow-down"></i></button>
        <button class="adm-edit-btn" data-id="${d.id}" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="adm-del-btn"  data-id="${d.id}" title="Delete"><i class="bi bi-trash3"></i></button>
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

document.getElementById('addDeptBtn').addEventListener('click', () => openDeptForm(null));
document.getElementById('deptCancelBtn').addEventListener('click', closeDeptForm);
document.getElementById('df_addMeeting').addEventListener('click', () => addMeetingRow());

document.getElementById('deptSaveBtn').addEventListener('click', async () => {
  const val = id => document.getElementById(id).value.trim();
  const name = val('df_name');
  if (!name) return alert('Please enter the department name.');

  const membersRaw = val('df_members');
  const meetings = [...document.querySelectorAll('#df_meetings .adm-meeting-row')]
    .map(r => ({
      day:   r.querySelector('.mt-day').value.trim(),
      time:  r.querySelector('.mt-time').value.trim(),
      label: r.querySelector('.mt-label').value.trim(),
    }))
    .filter(m => m.day || m.time || m.label);

  const data = {
    icon:         val('df_icon') || '⛪',
    name,
    schedule:     val('df_schedule'),
    members:      membersRaw === '' ? '' : Math.max(0, parseInt(membersRaw, 10) || 0),
    shortDesc:    val('df_shortDesc'),
    about:        val('df_about'),
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

/* ── INIT ── */
renderPrayers();
renderSermons();
renderAnnouncements();
renderHomeCards();
renderRegistrations();
renderDepartments();
renderAttendanceCheckin();
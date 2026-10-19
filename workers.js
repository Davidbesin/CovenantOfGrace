/* workers.js
   Departments are loaded from Firestore (edit them in Admin → Departments).
   If the database has none yet, the defaults in shared.js are shown. */

const container = document.getElementById("departmentsContainer");
let departments = [];

const esc    = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const digits = s => String(s ?? '').replace(/\D/g, '');

/* ── RENDER DEPARTMENTS ── */
function renderDepartments() {
  container.innerHTML = '';

  if (!departments.length) {
    container.innerHTML = '<p class="intro">No departments have been added yet.</p>';
    return;
  }

  departments.forEach((dept, i) => {
    const collapseId = `dept-${i}`;

    const metaParts = [
      dept.schedule,
      (dept.members !== '' && dept.members != null) ? `${dept.members} members` : ''
    ].filter(Boolean).map(esc).join(' · ');

    const meetings = Array.isArray(dept.meetings) ? dept.meetings : [];
    const meetingRows = meetings.length
      ? meetings.map(m => `
          <div class="meeting-row">
            <span class="meeting-dot">•</span>
            <span><strong>${esc(m.day)}</strong>${m.time ? ` · ${esc(m.time)}` : ''}${m.label ? ` <span class="meeting-label">— ${esc(m.label)}</span>` : ''}</span>
          </div>`).join('')
      : '<div class="meeting-row"><span class="meeting-label">To be announced by the leader</span></div>';

    const reqs = Array.isArray(dept.requirements) ? dept.requirements : [];
    const reqItems = reqs.length
      ? reqs.map(r => `<li>${esc(r)}</li>`).join('')
      : '<li>Open to everyone willing to serve</li>';

    const wa    = digits(dept.whatsapp);
    const phone = digits(dept.phone);
    const contactLinks = `
      ${wa ? `<div class="contact-item"><i class="bi bi-whatsapp"></i><a href="https://wa.me/${wa}" target="_blank" rel="noopener">+${wa}</a></div>` : ''}
      ${phone ? `<div class="contact-item"><i class="bi bi-telephone"></i><a href="tel:+${phone}">+${phone}</a></div>` : ''}
    `;

    const card = document.createElement('div');
    card.className = 'department-card';
    card.innerHTML = `
      <button class="department-button"
        data-bs-toggle="collapse"
        data-bs-target="#${collapseId}"
        aria-expanded="false"
        aria-controls="${collapseId}">
        <div class="d-flex align-items-center gap-3">
          <div class="icon-box">${esc(dept.icon || '⛪')}</div>
          <div class="flex-grow-1 min-w-0">
            <div class="department-title">${esc(dept.name)}</div>
            ${metaParts ? `<div class="department-meta">${metaParts}</div>` : ''}
            ${dept.shortDesc ? `<div class="department-desc">${esc(dept.shortDesc)}</div>` : ''}
          </div>
          <i class="bi bi-chevron-right chevron fs-5"></i>
        </div>
      </button>

      <div class="collapse" id="${collapseId}">
        <div class="details-section">
          <h4>${esc(dept.name)}</h4>
          ${dept.about ? `<p class="about-text">${esc(dept.about)}</p>` : ''}

          <div class="info-grid">
            <div class="info-tile">
              <div class="info-tile-label">Meeting Times</div>
              ${meetingRows}
            </div>
            <div class="info-tile">
              <div class="info-tile-label">What We Look For</div>
              <ul class="req-list">${reqItems}</ul>
            </div>
          </div>

          <div class="contact-card">
            <div class="contact-label">Department Leader</div>
            <div class="leader-name">${dept.leader ? esc(dept.leader) : 'To be announced'}</div>
            ${contactLinks}
          </div>

          <button class="join-btn" data-dept-index="${i}">
            <i class="bi bi-person-plus-fill"></i>
            Apply to Join ${esc(dept.name)}
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

container.innerHTML = '<p class="intro">Loading departments…</p>';
DB.getDepartments()
  .then(list => { departments = list; renderDepartments(); })
  .catch(err => {
    console.error(err);
    departments = DEFAULT_DEPARTMENTS.map((d, i) => ({ id: 'seed' + i, ...d }));
    renderDepartments();
  });

/* ── REGISTRATION MODAL ── */
const backdrop   = document.getElementById('regBackdrop');
const regClose   = document.getElementById('regClose');
const regCancel  = document.getElementById('regCancelBtn');
const regSubmit  = document.getElementById('regSubmitBtn');
const regSuccess = document.getElementById('regSuccess');
const regActions = document.getElementById('regActions');

function openModal(deptName) {
  document.getElementById('reg_name').value   = '';
  document.getElementById('reg_phone').value  = '';
  document.getElementById('reg_email').value  = '';
  document.getElementById('reg_reason').value = '';
  document.getElementById('reg_skills').value = '';
  document.getElementById('reg_dept').value   = deptName;
  regSuccess.style.display = 'none';
  regActions.style.display = 'flex';
  backdrop.style.display = 'flex';
  document.getElementById('regModalTitle').textContent = `Join ${deptName}`;
}

function closeModal() {
  backdrop.style.display = 'none';
}

regClose.addEventListener('click', closeModal);
regCancel.addEventListener('click', closeModal);
backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });

regSubmit.addEventListener('click', async () => {
  const name   = document.getElementById('reg_name').value.trim();
  const phone  = document.getElementById('reg_phone').value.trim();
  const email  = document.getElementById('reg_email').value.trim();
  const dept   = document.getElementById('reg_dept').value;
  const reason = document.getElementById('reg_reason').value.trim();
  const skills = document.getElementById('reg_skills').value.trim();

  if (!name || !phone || !reason) {
    alert('Please fill in your Name, Phone, and Reason for joining.');
    return;
  }

  await DB.addRegistration({ fullName: name, phone, email, department: dept, reason, skills });

  regSuccess.style.display = 'flex';
  regActions.style.display = 'none';

  setTimeout(closeModal, 3500);
});

// Wire up join buttons
container.addEventListener('click', e => {
  const btn = e.target.closest('.join-btn');
  if (!btn) return;
  const dept = departments[btn.dataset.deptIndex];
  if (dept) openModal(dept.name);
});
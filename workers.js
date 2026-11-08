/* workers.js
   Departments are loaded from Firestore (edit them in Admin → Departments).
   If the database has none yet, the defaults in shared.js are shown. */

const container = document.getElementById("departmentsContainer");
let departments = [];
let me = null;          // this device's ID record (see access.js)

const esc    = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const digits = s => String(s ?? '').replace(/\D/g, '');

/* Members-only content (announcement, leader contact, links) is shown to members of the
   department, its heads, and Super Admins. */
const isMember  = d => !!me && (me.superAdmin || me.departments.includes(d.id) || me.headOf.includes(d.id));
const isPending = d => !!me && me.requested.includes(d.id);
/* Only a Super Admin, or the head of THIS department, gets the edit shortcut on its card. */
const canEdit   = d => !!me && (me.superAdmin || me.headOf.includes(d.id));

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

    const member = isMember(dept);
    const wa    = digits(dept.whatsapp);
    const phone = digits(dept.phone);
    const contactLinks = member ? `
      ${wa ? `<div class="contact-item"><i class="bi bi-whatsapp"></i><a href="https://wa.me/${wa}" target="_blank" rel="noopener">+${wa}</a></div>` : ''}
      ${phone ? `<div class="contact-item"><i class="bi bi-telephone"></i><a href="tel:+${phone}">+${phone}</a></div>` : ''}
    ` : ((wa || phone) ? `<div class="members-only-note"><i class="bi bi-lock-fill"></i> Contact details are visible to members of this department.</div>` : '');

    const links = (Array.isArray(dept.links) ? dept.links : [])
      .map(l => ({ label: String(l.label || '').trim(), url: cleanLinkUrl(l.url) }))
      .filter(l => l.url);
    const linksBlock = (member && links.length) ? `
      <div class="dept-links">
        <div class="contact-label">Links</div>
        <div class="dept-links-grid">
          ${links.map(l => `<a class="dept-link" href="${esc(l.url)}" target="_blank" rel="noopener">
              <i class="bi ${linkIcon(l.url)}"></i><span>${esc(l.label || l.url)}</span></a>`).join('')}
        </div>
      </div>` : '';

    const announceBlock = (dept.announcement && member) ? `
          <div class="dept-announce">
            <div class="dept-announce-label"><i class="bi bi-megaphone-fill"></i> Announcement</div>
            <p class="dept-announce-text">${esc(dept.announcement)}</p>
          </div>` : (dept.announcement ? `
          <div class="members-only-note"><i class="bi bi-lock-fill"></i> There is an announcement for members of this department.</div>` : '');

    const statusBadge = member
      ? '<span class="dept-badge dept-badge-member"><i class="bi bi-check-circle-fill"></i> Member</span>'
      : (isPending(dept) ? '<span class="dept-badge dept-badge-pending"><i class="bi bi-hourglass-split"></i> Request pending</span>' : '');

    const editBtn = canEdit(dept)
      ? `<a class="dept-edit-btn" href="admin.html?edit=${encodeURIComponent(dept.id)}"><i class="bi bi-pencil-square"></i> Edit this department</a>`
      : '';

    const joinBtn = member
      ? ''
      : `<button class="join-btn" data-dept-index="${i}">
            <i class="bi bi-person-plus-fill"></i>
            ${isPending(dept) ? 'Add details to my request' : 'Apply to Join'} ${isPending(dept) ? '' : esc(dept.name)}
          </button>`;

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
            <div class="department-title">${esc(dept.name)} ${statusBadge}</div>
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

          ${announceBlock}

          <div class="contact-card">
            <div class="contact-label">Department Leader</div>
            <div class="leader-name">${dept.leader ? esc(dept.leader) : 'To be announced'}</div>
            ${contactLinks}
          </div>

          ${linksBlock}

          ${editBtn}
          ${joinBtn}
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

container.innerHTML = '<p class="intro">Loading departments…</p>';
Access.requireWorker()
  .then(record => { me = record; return DB.getDepartments(); })
  .then(list => { departments = list; renderWho(); renderDepartments(); })
  .catch(err => {
    console.error(err);
    departments = DEFAULT_DEPARTMENTS.map((d, i) => ({ id: 'seed' + i, ...d }));
    renderDepartments();
  });

/* "Signed in as …" line under the intro */
function renderWho() {
  const el = document.getElementById('whoAmI');
  if (!el || !me) return;
  const names = id => (departments.find(d => d.id === id) || {}).name;
  const role = me.superAdmin ? 'Super Admin' : (me.headOf.length ? 'Department Head' : (me.departments.length ? 'Worker' : 'Non-worker'));
  el.innerHTML = `<i class="bi bi-person-badge-fill"></i> ${esc(me.name)} · ${role}
    <a href="#" id="whoReset">Not you?</a>`;
  document.getElementById('whoReset').addEventListener('click', e => {
    e.preventDefault();
    if (confirm('Forget this device? You will need to register it again.')) Access.reset();
  });
}

/* ── REGISTRATION MODAL ── */
const backdrop   = document.getElementById('regBackdrop');
const regClose   = document.getElementById('regClose');
const regCancel  = document.getElementById('regCancelBtn');
const regSubmit  = document.getElementById('regSubmitBtn');
const regSuccess = document.getElementById('regSuccess');
const regActions = document.getElementById('regActions');

let modalDept = null;
function openModal(dept) {
  modalDept = dept;
  const deptName = dept.name;
  document.getElementById('reg_name').value   = me ? me.name : '';
  document.getElementById('reg_phone').value  = me ? me.phone : '';
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
  const wasOpen = backdrop.style.display !== 'none';
  backdrop.style.display = 'none';
  if (wasOpen) renderDepartments();   // refresh "Request pending" badges
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

  regSubmit.disabled = true;
  try {
    await DB.addRegistration({
      fullName: name, phone, email, department: dept, reason, skills,
      deptId: modalDept ? modalDept.id : '', deviceToken: me ? me.token : '',
    });
    if (me && modalDept && !me.requested.includes(modalDept.id)) {
      await DB.requestDept(me.token, modalDept.id);
      me.requested.push(modalDept.id);
    }
  } catch (e) {
    console.error(e);
    alert('Could not send your application. Check your connection and try again.');
    regSubmit.disabled = false;
    return;
  }
  regSubmit.disabled = false;

  regSuccess.style.display = 'flex';
  regActions.style.display = 'none';

  setTimeout(closeModal, 3500);
});

// Wire up join buttons
container.addEventListener('click', e => {
  const btn = e.target.closest('.join-btn');
  if (!btn) return;
  const dept = departments[btn.dataset.deptIndex];
  if (dept) openModal(dept);
});
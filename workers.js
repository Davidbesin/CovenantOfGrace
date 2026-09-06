/* workers.js */

const departments = [
  {
    icon: "🎵", name: "Choir Department", members: 15,
    schedule: "Thursdays · 6:00 PM",
    shortDesc: "Leading the congregation into worship.",
    about: "The Choir Department leads the church in heartfelt worship through songs, hymns, and special ministrations. We believe music is a powerful vehicle for God's presence, and every member plays a vital role in creating an atmosphere where lives are transformed.",
    meetings: [
      { day: "Saturday",   time: "5.30pm-7 PM", label: "Practice" }
    ],
    requirements: ["A love for worship and music", "Commitment to weekly rehearsals", "Willingness to serve"],
    leader: "Sis. Aanu", whatsapp: "2348012345678", phone: "2348012345678"
  },
  {
    icon: "🚪", name: "Ushering Department", members: 7,
    schedule: "Sundays · 6:00 PM",
    shortDesc: "Creating a warm and welcoming atmosphere.",
    about: "The Ushering Department is the first point of contact for every worshipper and guest. We assist with seating, maintain order, distribute materials, and ensure that everyone feels genuinely welcomed and cared for.",
    meetings: [
      { day: "Sunday", time: "6:00 PM", label: "Briefing" },

    ],
    requirements: ["Warm, hospitable personality", "Punctuality and reliability", "Smart appearance on Sundays"],
    leader: "Bro Taiwo", whatsapp: "2348166410535", phone: "2348166410535"
  },
  {
    icon: "🌟", name: "Children's Church", members: 6,
    schedule: "Sundays · During Service",
    shortDesc: "Nurturing children in faith.",
    about: "Children's Church provides a safe, engaging, and age-appropriate worship experience for children aged 3–12 during the main Sunday service, using creative storytelling, music, and interactive lessons.",
    meetings: [
      { day: "Online At leaders discretion",    time: "Online At leaders Discretion", label: "Teachers' preparation" }
    ],
    requirements: ["Passion for children's ministry", "DBS / background clearance", "Patience and creativity"],
    leader: "Pst Teco", whatsapp: "2348066091737", phone: "2348066091737"
  },
  {
    icon: "💻", name: "Technical Department", members: 6,
    schedule: "Wednesdays · 6:00 PM",
    shortDesc: "Supporting worship through technology.",
    about: "The Technical Department keeps everything running seamlessly. From live sound and projection to livestreaming and recording, our team serves with skill so the congregation can focus entirely on worship.",
    meetings: [
      { day: " At leaders discretion",    time: " At leaders discretion", label: "At leaders discretion" }
    ],
    requirements: ["Basic tech or AV interest", "Willingness to learn", "Reliability on Sundays"],
    leader: "", whatsapp: "2348093527150", phone: "2348164123021"
  },
  {
    icon: "🙏", name: "Prayer Department", members: 4,
    schedule: "Mondays · 6:00 AM",
    shortDesc: "Standing in the gap through prayer.",
    about: "The Prayer Department is the spiritual engine of the church. We coordinate early morning prayers, intercession sessions, prayer chains, and monthly fasting programmes.",
    meetings: [
      { day: "Monday", time: "6:00 AM",  label: "Early morning prayer" },
      { day: "Friday", time: "10:00 PM", label: "Night vigil (monthly)" }
    ],
    requirements: ["Consistent prayer life", "Commitment to early mornings", "Intercession heart"],
    leader: "", whatsapp: "2347066163224", phone: "2347066163224"
  },
  {
    icon: "📢", name: "Evangelism Department", members: 4,
    schedule: "Saturdays · 10:00 AM",
    shortDesc: "Taking the Gospel beyond the church walls.",
    about: "The Evangelism Department organises street outreaches, door-to-door evangelism, campus missions, and community events to reach people who have never heard the Good News.",
    meetings: [
      { day: "Sunday", time: "7.40 AM", label: "Outreach debrief & prep" }
    ],
    requirements: ["Boldness and compassion", "Willingness to go out", "Basic evangelism training (provided)"],
    leader: "Pst Adebesin Adekunle", whatsapp: "2347057131898", phone: "2347057131898"
  },
];

/* ── RENDER DEPARTMENTS ── */
const container = document.getElementById("departmentsContainer");

departments.forEach((dept, i) => {
  const collapseId = `dept-${i}`;

  const meetingRows = dept.meetings.map(m => `
    <div class="meeting-row">
      <span class="meeting-dot">•</span>
      <span><strong>${m.day}</strong> · ${m.time} <span class="meeting-label">— ${m.label}</span></span>
    </div>
  `).join("");

  const reqItems = dept.requirements.map(r => `<li>${r}</li>`).join("");

  const card = document.createElement("div");
  card.className = "department-card";
  card.innerHTML = `
    <button class="department-button"
      data-bs-toggle="collapse"
      data-bs-target="#${collapseId}"
      aria-expanded="false"
      aria-controls="${collapseId}">
      <div class="d-flex align-items-center gap-3">
        <div class="icon-box">${dept.icon}</div>
        <div class="flex-grow-1 min-w-0">
          <div class="department-title">${dept.name}</div>
          <div class="department-meta">${dept.schedule} · ${dept.members} members</div>
          <div class="department-desc">${dept.shortDesc}</div>
        </div>
        <i class="bi bi-chevron-right chevron fs-5"></i>
      </div>
    </button>

    <div class="collapse" id="${collapseId}">
      <div class="details-section">
        <h4>${dept.name}</h4>
        <p class="about-text">${dept.about}</p>

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
          <div class="leader-name">${dept.leader}</div>
          <div class="contact-item">
            <i class="bi bi-whatsapp"></i>
            <a href="https://wa.me/${dept.whatsapp}" target="_blank" rel="noopener">+${dept.whatsapp}</a>
          </div>
          <div class="contact-item">
            <i class="bi bi-telephone"></i>
            <a href="tel:+${dept.phone}">+${dept.phone}</a>
          </div>
        </div>

        <button class="join-btn" data-dept-index="${i}">
          <i class="bi bi-person-plus-fill"></i>
          Apply to Join ${dept.name}
        </button>
      </div>
    </div>
  `;

  container.appendChild(card);
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
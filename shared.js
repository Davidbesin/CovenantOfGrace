/* ============================================================
   shared.js  —  Central data store using Cloud Firestore
   All pages read/write through DB.*  —  all methods are async.
   ============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyB7hmQG7hczx1ohzrR5YAoQQf-9leqy_3g",
  authDomain: "chapel-of-grace-f387c.firebaseapp.com",
  databaseURL: "https://chapel-of-grace-f387c-default-rtdb.firebaseio.com",
  projectId: "chapel-of-grace-f387c",
  storageBucket: "chapel-of-grace-f387c.firebasestorage.app",
  messagingSenderId: "164964093429",
  appId: "1:164964093429:web:ff56c2e183df8012f264bc",
  measurementId: "G-27XFMKP5NE"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const _db = firebase.firestore();   
const _storage = firebase.storage ? firebase.storage() : null;

/* ── helpers ── */
const col = name => _db.collection(name);
const docData = d => ({ id: d.id, ...d.data() });
const PRAYER_LIMIT = 100;

function timeAgo(date) {
  const sec = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (sec < 60)    return 'Just now';
  if (sec < 3600)  return Math.floor(sec / 60) + ' min ago';
  if (sec < 86400) { const h = Math.floor(sec / 3600); return h + (h === 1 ? ' hour ago' : ' hours ago'); }
  const d = Math.floor(sec / 86400);
  if (d === 1) return 'Yesterday';
  if (d < 30)  return d + ' days ago';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* "08012345678" -> "2348012345678" (Nigerian numbers); strips spaces, +, dashes */
function waNumber(v) {
  const d = String(v || '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('0')) return '234' + d.slice(1);
  return d;
}

/* Makes a safe link: http(s)/mailto/tel only; adds https:// when the scheme is missing. Returns '' if unusable. */
function cleanLinkUrl(u) {
  u = String(u || '').trim();
  if (!u) return '';
  if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
  if (/^[a-z][a-z0-9+.\-]*:/i.test(u)) return '';          // javascript:, data:, etc.
  return 'https://' + u.replace(/^\/+/, '');
}

/* Bootstrap-icons class for a link, chosen from where it points */
function linkIcon(url) {
  const u = String(url || '').toLowerCase();
  if (u.startsWith('mailto:')) return 'bi-envelope-fill';
  if (u.startsWith('tel:'))    return 'bi-telephone-fill';
  const rules = [
    [/wa\.me|whatsapp\.com/, 'bi-whatsapp'],
    [/t\.me|telegram\./, 'bi-telegram'],
    [/youtube\.com|youtu\.be/, 'bi-youtube'],
    [/meet\.google\./, 'bi-camera-video-fill'],
    [/zoom\.us/, 'bi-camera-video-fill'],
    [/docs\.google\./, 'bi-file-earmark-text-fill'],
    [/sheets\.google\./, 'bi-file-earmark-spreadsheet-fill'],
    [/drive\.google\./, 'bi-folder-fill'],
    [/facebook\.com|fb\.com|fb\.me/, 'bi-facebook'],
    [/instagram\.com/, 'bi-instagram'],
    [/tiktok\.com/, 'bi-tiktok'],
    [/twitter\.com|x\.com/, 'bi-twitter-x'],
    [/spotify\.com/, 'bi-spotify'],
  ];
  for (const [re, icon] of rules) if (re.test(u)) return icon;
  return 'bi-link-45deg';
}

/* ── Default departments (used until the admin edits them; seeded into Firestore on first admin visit) ── */
const DEFAULT_DEPARTMENTS = [
  {
    icon: "🎵", name: "Choir Department", members: 15,
    schedule: "Thursdays · 6:00 PM",
    shortDesc: "Leading the congregation into worship.",
    about: "The Choir Department leads the church in heartfelt worship through songs, hymns, and special ministrations. We believe music is a powerful vehicle for God's presence, and every member plays a vital role in creating an atmosphere where lives are transformed.",
    meetings: [{ day: "Saturday", time: "5:30 PM – 7:00 PM", label: "Practice" }],
    requirements: ["A love for worship and music", "Commitment to weekly rehearsals", "Willingness to serve"],
    leader: "Sis. Aanu", whatsapp: "2348012345678", phone: "2348012345678"
  },
  {
    icon: "🚪", name: "Ushering Department", members: 7,
    schedule: "Sundays · 6:00 PM",
    shortDesc: "Creating a warm and welcoming atmosphere.",
    about: "The Ushering Department is the first point of contact for every worshipper and guest. We assist with seating, maintain order, distribute materials, and ensure that everyone feels genuinely welcomed and cared for.",
    meetings: [{ day: "Sunday", time: "6:00 PM", label: "Briefing" }],
    requirements: ["Warm, hospitable personality", "Punctuality and reliability", "Smart appearance on Sundays"],
    leader: "Bro Taiwo", whatsapp: "2348166410535", phone: "2348166410535"
  },
  {
    icon: "🌟", name: "Teenagers' Church", members: 6,
    schedule: "Sundays · During Service",
    shortDesc: "Nurturing teenagers in faith.",
    about: "Teenagers' Church provides a safe, engaging, and age-appropriate worship experience for teenagers during the main Sunday service, using creative teaching, music, and interactive lessons.",
    meetings: [{ day: "Online", time: "At leader's discretion", label: "Teachers' preparation" }],
    requirements: ["Passion for teenage ministry", "DBS / background clearance", "Patience and creativity"],
    leader: "Pst Teco", whatsapp: "2348066091737", phone: "2348066091737"
  },
  {
    icon: "🎥", name: "Media Department", members: 6,
    schedule: "Wednesdays · 6:00 PM",
    shortDesc: "Supporting worship through media and technology.",
    about: "The Media Department keeps everything running seamlessly. From live sound and projection to livestreaming and recording, our team serves with skill so the congregation can focus entirely on worship.",
    meetings: [{ day: "At leader's discretion", time: "", label: "" }],
    requirements: ["Basic media or AV interest", "Willingness to learn", "Reliability on Sundays"],
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
    meetings: [{ day: "Sunday", time: "7:40 AM", label: "Outreach debrief & prep" }],
    requirements: ["Boldness and compassion", "Willingness to go out", "Basic evangelism training (provided)"],
    leader: "Pst Adebesin Adekunle", whatsapp: "2347057131898", phone: "2347057131898"
  },
];

const DB = {

  /* ══════════════════════════════════════════
     PRAYERS
  ══════════════════════════════════════════ */
  /* Latest PRAYER_LIMIT prayers, newest first. Real data only (no placeholder prayers). */
  async getPrayers() {
    const snap = await col('prayers').orderBy('createdAt', 'desc').limit(PRAYER_LIMIT).get();
    return snap.docs.map(d => {
      const p = docData(d);
      const ts = p.createdAt && p.createdAt.toDate ? p.createdAt.toDate() : null;
      p.time = ts ? timeAgo(ts) : 'Just now';
      return p;
    });
  },

  async addPrayer(text) {
    const colors = ['#0b1f4b','#166534','#7c2d12','#0d2a66','#1a3a7a','#14532d'];
    await col('prayers').add({
      text,
      initial: 'A',
      color: colors[Math.floor(Math.random() * colors.length)],
      prayCount: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    await this.trimPrayers();
    return this.getPrayers();
  },

  /* Keep only the newest PRAYER_LIMIT prayers in the database; delete the older ones. */
  async trimPrayers() {
    try {
      const snap = await col('prayers').orderBy('createdAt', 'desc').get();
      const extra = snap.docs.slice(PRAYER_LIMIT);
      if (!extra.length) return;
      const batch = _db.batch();
      extra.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch (e) { console.warn('Could not trim old prayers', e); }
  },

  async deletePrayer(id) {
    await col('prayers').doc(id).delete();
    return this.getPrayers();
  },

  async prayFor(id) {
    await col('prayers').doc(id).update({
      prayCount: firebase.firestore.FieldValue.increment(1),
    });
    return this.getPrayers();
  },

  /* ══════════════════════════════════════════
     SERMONS
  ══════════════════════════════════════════ */
  async getSermons() {
    const snap = await col('sermons').orderBy('createdAt', 'desc').get();
    if (!snap.empty) return snap.docs.map(docData);
    return [
      { id: 'seed1', title: 'Walking in Divine Purpose',       speaker: 'Pastor Emmanuel Adeyemi', date: '1 June 2025', category: 'church' },
      { id: 'seed2', title: 'The Power of a Surrendered Life', speaker: 'Pastor Grace Okonkwo',    date: '25 May 2025', category: 'church' },
      { id: 'seed3', title: 'Faith That Moves Mountains',      speaker: 'Pastor Emmanuel Adeyemi', date: '18 May 2025', category: 'church' },
    ];
  },

  async addSermon(data) {
    await col('sermons').add({ ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    return this.getSermons();
  },

  async updateSermon(id, data) {
    await col('sermons').doc(id).update(data);
    return this.getSermons();
  },

  async deleteSermon(id) {
    // Best-effort: also remove the audio file from Storage if this sermon had one.
    try {
      const doc = await col('sermons').doc(id).get();
      const data = doc.data();
      if (data && data.audioPath) {
        await _storage.ref(data.audioPath).delete();
      }
    } catch (e) { /* file may already be gone — ignore */ }
    await col('sermons').doc(id).delete();
    return this.getSermons();
  },

  /* Uploads a sermon audio file to Firebase Storage and returns { audioUrl, audioPath, audioName }.
     Call this BEFORE addSermon/updateSermon, then merge the result into the sermon data. */
  async uploadSermonAudio(file, onProgress) {
    const path = `sermons/${Date.now()}_${file.name}`;
    const ref = _storage.ref(path);
    const task = ref.put(file);
    return new Promise((resolve, reject) => {
      task.on('state_changed',
        snap => {
          if (onProgress) onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
        },
        err => reject(err),
        async () => {
          const audioUrl = await task.snapshot.ref.getDownloadURL();
          resolve({ audioUrl, audioPath: path, audioName: file.name });
        }
      );
    });
  },

  /* ══════════════════════════════════════════
     ANNOUNCEMENTS
  ══════════════════════════════════════════ */
  async getAnnouncements() {
    const snap = await col('announcements').orderBy('createdAt', 'desc').get();
    if (!snap.empty) return snap.docs.map(docData);
    return [
      { id: 'seed1', emoji: '🙌', tag: 'Worship',    title: 'Combined Thanksgiving Service', body: 'Join us for our end-of-month praise night. All parishes invited.',       date: '29 June 2025', bg: '' },
      { id: 'seed2', emoji: '📖', tag: 'Bible Study', title: 'Midweek Study: Book of Romans', body: 'We continue our deep dive into Romans, Chapter 8. Bring your Bible.',   date: '11 June 2025', bg: 'linear-gradient(135deg,#1a3a7a,#2d5fa8)' },
      { id: 'seed3', emoji: '🌿', tag: 'Outreach',    title: 'Community Food Drive',          body: 'Help us bless our neighbours. Donations accepted at the church office.', date: '15 June 2025', bg: 'linear-gradient(135deg,#0b3d2e,#166534)' },
    ];
  },

  async addAnnouncement(data) {
    await col('announcements').add({ ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    return this.getAnnouncements();
  },

  async updateAnnouncement(id, data) {
    await col('announcements').doc(id).update(data);
    return this.getAnnouncements();
  },

  async deleteAnnouncement(id) {
    await col('announcements').doc(id).delete();
    return this.getAnnouncements();
  },

  /* ══════════════════════════════════════════
     HOME CARDS
  ══════════════════════════════════════════ */
  async getHomeCards() {
    const defaults = [
      { id: 'prayer',  emoji: '🙏', label: 'Daily Prayer', content: 'Lord, guide my steps today. Grant me wisdom, peace, and faith. Amen.' },
      { id: 'bible',   emoji: '📖', label: 'Bible Plan',   content: "Today's reading: Romans 8:1–17 — Life in the Spirit." },
      { id: 'worship', emoji: '🎵', label: 'Worship',      content: 'Song of the week: "Great Are You Lord" — All Sons & Daughters.' },
    ];
    const snap = await col('homeCards').get();
    const saved = {};
    snap.docs.forEach(d => { saved[d.id] = d.data(); });
    return defaults.map(d => ({ ...d, ...(saved[d.id] || {}) }));
  },

  async updateHomeCard(id, data) {
    await col('homeCards').doc(id).set(data, { merge: true });
    return this.getHomeCards();
  },

  /* ══════════════════════════════════════════
     WORKER REGISTRATIONS
  ══════════════════════════════════════════ */
  async getRegistrations() {
    const snap = await col('registrations').orderBy('createdAt', 'desc').get();
    return snap.docs.map(docData);
  },

  async addRegistration(data) {
    await col('registrations').add({
      ...data,
      status: 'pending',
      submittedAt: new Date().toLocaleString(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    return this.getRegistrations();
  },

  /* Approving/rejecting an application that came from a registered device also
     adds/removes that department on the device's ID. */
  async updateRegistrationStatus(id, status) {
    const ref = col('registrations').doc(id);
    const snap = await ref.get();
    await ref.update({ status });
    const r = snap.exists ? snap.data() : null;
    if (r && r.deviceToken && r.deptId) {
      try {
        if (status === 'approved') await this.approveDept(r.deviceToken, r.deptId);
        else if (status === 'rejected') await this.rejectDept(r.deviceToken, r.deptId);
      } catch (e) { console.warn('Device no longer exists', e); }
    }
    return this.getRegistrations();
  },

  async deleteRegistration(id) {
    await col('registrations').doc(id).delete();
    return this.getRegistrations();
  },

  /* ══════════════════════════════════════════
     CONGREGATION ATTENDANCE
  ══════════════════════════════════════════ */

  /* -- Roster -- */
  async getMembers() {
    const snap = await col('congregationMembers').orderBy('name').get();
    return snap.docs.map(docData);
  },

  async addMember(name) {
    await col('congregationMembers').add({
      name: name.trim(),
      dateAdded: firebase.firestore.FieldValue.serverTimestamp(),
      active: true,
    });
    return this.getMembers();
  },

  async deleteMember(id) {
    await col('congregationMembers').doc(id).delete();
    return this.getMembers();
  },

  /* -- Check-in for a given date (date = 'YYYY-MM-DD' string) -- */
  async getAttendanceForDate(date) {
    const doc = await col('attendance').doc(date).get();
    return doc.exists ? doc.data().checkedIn || {} : {};
  },

  async setCheckedIn(date, memberId, present) {
    const ref = col('attendance').doc(date);
    if (present) {
      await ref.set({
        checkedIn: { [memberId]: firebase.firestore.FieldValue.serverTimestamp() }
      }, { merge: true });
    } else {
      await ref.set({
        checkedIn: { [memberId]: firebase.firestore.FieldValue.delete() }
      }, { merge: true });
    }
  },

  /* -- All attendance records, for history / percentage calculations -- */
  async getAllAttendance() {
    const snap = await col('attendance').get();
    // { date: { memberId: true, ... }, ... }
    const out = {};
    snap.docs.forEach(d => { out[d.id] = d.data().checkedIn || {}; });
    return out;
  },

  /* ══════════════════════════════════════════
     DEPARTMENTS (Workers' Portal)
  ══════════════════════════════════════════ */
  async getDepartments() {
    const snap = await col('departments').orderBy('order').get();
    if (!snap.empty) return snap.docs.map(docData);
    return DEFAULT_DEPARTMENTS.map((d, i) => ({ id: 'seed' + i, order: i, ...d }));
  },

  /* Copies the defaults into Firestore the first time the admin opens the Departments panel,
     so every department becomes editable. Does nothing if departments already exist. */
  async seedDepartments() {
    const snap = await col('departments').limit(1).get();
    if (!snap.empty) return;
    const batch = _db.batch();
    DEFAULT_DEPARTMENTS.forEach((d, i) => batch.set(col('departments').doc('seed' + i), { ...d, order: i }));
    await batch.commit();
  },

  async addDepartment(data) {
    const last = await col('departments').orderBy('order', 'desc').limit(1).get();
    const order = last.empty ? 0 : (last.docs[0].data().order || 0) + 1;
    await col('departments').add({ ...data, order });
    return this.getDepartments();
  },

  async updateDepartment(id, data) {
    await col('departments').doc(id).update(data);
    return this.getDepartments();
  },

  async deleteDepartment(id) {
    await col('departments').doc(id).delete();
    return this.getDepartments();
  },

  /* Swap the display order of two departments */
  async swapDepartmentOrder(a, b) {
    const batch = _db.batch();
    batch.update(col('departments').doc(a.id), { order: b.order });
    batch.update(col('departments').doc(b.id), { order: a.order });
    await batch.commit();
    return this.getDepartments();
  },

  /* ══════════════════════════════════════════
     DEVICES / IDs  (soft access gate — see access.js)
     devices/{token}: { name, phone, whatsapp, departments[], requested[], headOf[], superAdmin }
  ══════════════════════════════════════════ */
  async getDevice(token) {
    const d = await col('devices').doc(token).get();
    return d.exists ? docData(d) : null;
  },

  async createDevice(token, data) {
    await col('devices').doc(token).set({
      ...data,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  },

  async updateDevice(token, data) {
    await col('devices').doc(token).update(data);
  },

  async getDevices() {
    const snap = await col('devices').get();
    return snap.docs.map(docData).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  },

  async deleteDevice(token) {
    await col('devices').doc(token).delete();
  },

  async hasSuperAdmin() {
    const snap = await col('devices').where('superAdmin', '==', true).limit(1).get();
    return !snap.empty;
  },

  /* ── department membership ── */
  async requestDept(token, deptId) {
    await col('devices').doc(token).update({ requested: firebase.firestore.FieldValue.arrayUnion(deptId) });
  },

  async approveDept(token, deptId) {
    const F = firebase.firestore.FieldValue;
    await col('devices').doc(token).update({ departments: F.arrayUnion(deptId), requested: F.arrayRemove(deptId) });
    await this._settleApplications(token, deptId, 'approved');
  },

  async rejectDept(token, deptId) {
    await col('devices').doc(token).update({ requested: firebase.firestore.FieldValue.arrayRemove(deptId) });
    await this._settleApplications(token, deptId, 'rejected');
  },

  /* Removes a person from a department (and from its head list). */
  async removeFromDept(token, deptId) {
    const F = firebase.firestore.FieldValue;
    await col('devices').doc(token).update({ departments: F.arrayRemove(deptId), headOf: F.arrayRemove(deptId) });
  },

  /* A head is always also a member of the department. */
  async setDeptHead(token, deptId, on) {
    const F = firebase.firestore.FieldValue;
    if (on) await col('devices').doc(token).update({ headOf: F.arrayUnion(deptId), departments: F.arrayUnion(deptId), requested: F.arrayRemove(deptId) });
    else    await col('devices').doc(token).update({ headOf: F.arrayRemove(deptId) });
  },

  /* Keeps Worker Applications in step when the department is settled from the People panel. */
  async _settleApplications(token, deptId, status) {
    const snap = await col('registrations')
      .where('deviceToken', '==', token).where('deptId', '==', deptId).where('status', '==', 'pending').get();
    if (snap.empty) return;
    const batch = _db.batch();
    snap.docs.forEach(d => batch.update(d.ref, { status }));
    await batch.commit();
  },

  /* ══════════════════════════════════════════
     LIVE SERVICE LINK (Google Meet etc.)
  ══════════════════════════════════════════ */
  async getLiveLink() {
    const doc = await col('settings').doc('live').get();
    return doc.exists ? (doc.data().url || '') : '';
  },

  async setLiveLink(url) {
    await col('settings').doc('live').set({
      url: url.trim(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return url.trim();
  },
};
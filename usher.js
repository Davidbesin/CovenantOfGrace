/* usher.js — Ushers' Portal: shows the attendance QR code.
   Open to members/heads of the Ushering department and Super Admins.
   The code is fixed for the whole day (one code per service date) and does not rotate.
   Starting/stopping attendance opens/closes scanning; the QR itself stays the same. */

const main = document.getElementById('usherMain');
let session = null, dayTimer = null, wakeLock = null;

const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const checkinUrl = s => new URL('checkin.html', location.href).href.split('?')[0] +
  `?d=${encodeURIComponent(s.date)}&k=${encodeURIComponent(s.code)}`;

function showStart(note) {
  main.innerHTML = `
    <div class="qr-card">
      <h3>Attendance QR code</h3>
      <p>${note || 'Start attendance when service begins. Show the code on a screen so people can scan it with their phone camera.'}</p>
      <div class="qr-actions"><button class="qr-start" id="startBtn"><i class="bi bi-qr-code"></i> Start attendance</button></div>
    </div>`;
  document.getElementById('startBtn').addEventListener('click', start);
}

/* Opens today's session with today's fixed code */
async function openToday() {
  const date = todayISO();
  const code = await DB.getDayCode(date);
  const next = { open: true, date, code, prev: '' };
  await DB.setAttendanceSession(next);
  session = next;
}

/* Keep the screen on while the QR is showing */
async function keepAwake() {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch (e) { /* denied or unsupported: the page still works */ }
}
function releaseAwake() {
  try { if (wakeLock) wakeLock.release(); } catch (e) {}
  wakeLock = null;
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && session) keepAwake();
});

function renderLive() {
  main.innerHTML = `
    <div class="qr-card">
      <h3>Scan to sign in</h3>
      <p>Service date: <strong>${session.date}</strong>. Scan with your phone camera.</p>
      <div id="qrBox"></div>
      <div class="qr-status">This code stays the same all day. Screen stays on while this page is open.</div>
      <div class="qr-actions"><button class="qr-stop" id="stopBtn"><i class="bi bi-stop-circle"></i> Stop attendance</button></div>
    </div>`;
  document.getElementById('stopBtn').addEventListener('click', stop);
  new QRCode(document.getElementById('qrBox'), { text: checkinUrl(session), width: 240, height: 240, correctLevel: QRCode.CorrectLevel.M });
  keepAwake();

  // If the page stays open past midnight, switch to the new day's code.
  clearInterval(dayTimer);
  dayTimer = setInterval(async () => {
    if (!session || session.date === todayISO()) return;
    try { await openToday(); renderLive(); } catch (e) { console.error(e); }
  }, 60000);
}

async function start() {
  const btn = document.getElementById('startBtn');
  btn.disabled = true;
  try {
    await openToday();
    renderLive();
  } catch (e) {
    console.error(e);
    showStart('Could not start. Check your connection and try again.');
  }
}

async function stop() {
  clearInterval(dayTimer);
  dayTimer = null;
  releaseAwake();
  try { await DB.closeAttendanceSession(); } catch (e) { console.error(e); }
  session = null;
  showStart('Attendance is closed. Scans no longer work.');
}

Access.requireWorker().then(async me => {
  let usher = null;
  try { usher = await DB.getUsherDept(); } catch (e) { console.error(e); }
  const allowed = me.superAdmin || (usher && (me.departments.includes(usher.id) || me.headOf.includes(usher.id)));
  if (!allowed) {
    main.innerHTML = '<p class="qr-msg"><i class="bi bi-lock-fill"></i><br>This page is for the Ushering department only.</p>';
    return;
  }
  // Resume if a session for today is already open (e.g. the page was reloaded)
  let existing = null;
  try { existing = await DB.getAttendanceSession(); } catch (e) {}
  if (existing && existing.open && existing.date === todayISO() && existing.code) {
    session = existing;
    renderLive();
  } else {
    showStart();
  }
}).catch(e => { console.error(e); main.innerHTML = '<p class="qr-msg">Something went wrong. Reload the page.</p>'; });

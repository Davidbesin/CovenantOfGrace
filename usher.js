/* usher.js — Ushers' Portal: shows the attendance QR code.
   Open to members/heads of the Ushering department and Super Admins.
   The code rotates every ROTATE_SEC seconds so a screenshot shared on WhatsApp stops working.
   checkin.html accepts the current code and the previous one. */

const ROTATE_SEC = 45;
const main = document.getElementById('usherMain');
let timer = null, session = null;

const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const randCode = () => {
  const a = new Uint8Array(9);
  crypto.getRandomValues(a);
  return Array.from(a, b => b.toString(36).padStart(2, '0')).join('').slice(0, 12);
};
const checkinUrl = s => new URL('checkin.html', location.href).href.split('?')[0] +
  `?d=${encodeURIComponent(s.date)}&k=${encodeURIComponent(s.code)}`;

function showStart(note) {
  main.innerHTML = `
    <div class="qr-card">
      <h3>Attendance QR code</h3>
      <p>${note || 'Start the code when service begins. Show it on a screen so people can scan it with their phone camera.'}</p>
      <div class="qr-actions"><button class="qr-start" id="startBtn"><i class="bi bi-qr-code"></i> Start attendance</button></div>
    </div>`;
  document.getElementById('startBtn').addEventListener('click', start);
}

/* Time the next rotation is due. Based on the clock, not a tick count, so a throttled
   background timer can't leave the code stale. */
let nextAt = 0;
let wakeLock = null;
let rotating = false;

async function rotate() {
  // If the page stayed open past midnight, roll the service date over to today.
  const date = (session && session.date === todayISO()) ? session.date : todayISO();
  const next = { open: true, date, code: randCode(), prev: session && session.date === date ? session.code : '' };
  await DB.setAttendanceSession(next);
  session = next;
  nextAt = Date.now() + ROTATE_SEC * 1000;
  draw();
}

/* Keep the screen on while the QR is showing */
async function keepAwake() {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch (e) { /* denied or unsupported: the page still works, the screen may just sleep */ }
}
function releaseAwake() {
  try { if (wakeLock) wakeLock.release(); } catch (e) {}
  wakeLock = null;
}

/* Coming back from the background (or unlocking the phone): re-lock the screen and refresh the code now */
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || !timer || !session) return;
  keepAwake();
  if (!rotating) {
    rotating = true;
    try { await rotate(); } catch (e) { console.error(e); }
    rotating = false;
  }
});

function draw() {
  const box = document.getElementById('qrBox');
  if (!box) return;
  box.innerHTML = '';
  new QRCode(box, { text: checkinUrl(session), width: 240, height: 240, correctLevel: QRCode.CorrectLevel.M });
  const dateEl = document.getElementById('qrDate');
  if (dateEl) dateEl.textContent = session.date;
}

function renderLive() {
  main.innerHTML = `
    <div class="qr-card">
      <h3>Scan to sign in</h3>
      <p>Service date: <strong id="qrDate">${session.date}</strong>. Scan with your phone camera.</p>
      <div id="qrBox"></div>
      <div class="qr-bar"><div id="qrBarFill"></div></div>
      <div class="qr-status" id="qrStatus"></div>
      <div class="qr-actions"><button class="qr-stop" id="stopBtn"><i class="bi bi-stop-circle"></i> Stop attendance</button></div>
    </div>`;
  document.getElementById('stopBtn').addEventListener('click', stop);
  draw();
  keepAwake();
  clearInterval(timer);
  timer = setInterval(async () => {
    const left = Math.max(0, Math.ceil((nextAt - Date.now()) / 1000));
    const fill = document.getElementById('qrBarFill');
    if (fill) fill.style.width = Math.min(100, (left / ROTATE_SEC) * 100) + '%';
    const st = document.getElementById('qrStatus');
    if (st) st.textContent = `New code in ${left}s. Screen stays on while this page is open.`;
    if (left <= 0 && !rotating) {
      rotating = true;                  // avoid overlapping rotations
      try { await rotate(); }
      catch (e) { console.error(e); nextAt = Date.now() + 5000; if (st) st.textContent = 'Could not refresh the code. Check your connection.'; }
      rotating = false;
    }
  }, 1000);
}

async function start() {
  const btn = document.getElementById('startBtn');
  btn.disabled = true;
  try {
    session = null;
    await rotate();   // creates the first code
    renderLive();
  } catch (e) {
    console.error(e);
    showStart('Could not start. Check your connection and try again.');
  }
}

async function stop() {
  clearInterval(timer);
  timer = null;
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
  if (existing && existing.open && existing.date === todayISO()) {
    session = existing;
    await rotate();
    renderLive();
  } else {
    showStart();
  }
}).catch(e => { console.error(e); main.innerHTML = '<p class="qr-msg">Something went wrong. Reload the page.</p>'; });

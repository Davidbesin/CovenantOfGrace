/* usher.js — Ushers' Portal: shows the attendance QR code.
   Open to members/heads of the Ushering department and Super Admins.
   The code rotates every ROTATE_SEC seconds so a screenshot shared on WhatsApp stops working.
   checkin.html accepts the current code and the previous one. */

const ROTATE_SEC = 45;
const main = document.getElementById('usherMain');
let timer = null, countdown = 0, session = null;

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

async function rotate() {
  const next = { open: true, date: session ? session.date : todayISO(), code: randCode(), prev: session ? session.code : '' };
  await DB.setAttendanceSession(next);
  session = next;
  draw();
}

function draw() {
  const box = document.getElementById('qrBox');
  if (!box) return;
  box.innerHTML = '';
  new QRCode(box, { text: checkinUrl(session), width: 240, height: 240, correctLevel: QRCode.CorrectLevel.M });
  countdown = ROTATE_SEC;
}

function renderLive() {
  main.innerHTML = `
    <div class="qr-card">
      <h3>Scan to sign in</h3>
      <p>Service date: <strong>${session.date}</strong>. Scan with your phone camera.</p>
      <div id="qrBox"></div>
      <div class="qr-bar"><div id="qrBarFill"></div></div>
      <div class="qr-status" id="qrStatus"></div>
      <div class="qr-actions"><button class="qr-stop" id="stopBtn"><i class="bi bi-stop-circle"></i> Stop attendance</button></div>
    </div>`;
  document.getElementById('stopBtn').addEventListener('click', stop);
  draw();
  timer = setInterval(async () => {
    countdown--;
    const fill = document.getElementById('qrBarFill');
    if (fill) fill.style.width = Math.max(0, (countdown / ROTATE_SEC) * 100) + '%';
    const st = document.getElementById('qrStatus');
    if (st) st.textContent = `New code in ${Math.max(0, countdown)}s. Keep this page open.`;
    if (countdown <= 0) {
      countdown = ROTATE_SEC;           // avoid overlapping rotations
      try { await rotate(); } catch (e) { console.error(e); if (st) st.textContent = 'Could not refresh the code. Check your connection.'; }
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

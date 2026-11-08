/* scan.js — in-site QR scanner for attendance.
   Reads the usher's QR with the camera and forwards to checkin.html (which registers the device if
   needed and records attendance). Only a QR that points at this site's checkin.html is accepted. */

const video = document.getElementById('scVideo');
const view  = document.getElementById('scView');
const canvas = document.getElementById('scCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const msg = document.getElementById('scMsg');
const startBtn = document.getElementById('scStart');

let stream = null, running = false, lastBad = 0;

function say(text, bad) { msg.textContent = text || ''; msg.className = 'sc-msg' + (bad ? ' bad' : ''); }

/* Returns "checkin.html?d=..&k=.." for a valid attendance QR, else null. */
function target(text) {
  let u;
  try { u = new URL(String(text).trim(), location.href); } catch (e) { return null; }
  if (!/\/checkin\.html$/.test(u.pathname)) return null;
  const d = u.searchParams.get('d'), k = u.searchParams.get('k');
  if (!d || !k) return null;
  return 'checkin.html?d=' + encodeURIComponent(d) + '&k=' + encodeURIComponent(k);
}

function stop() {
  running = false;
  if (stream) stream.getTracks().forEach(t => t.stop());
  stream = null;
}

function tick() {
  if (!running) return;
  if (video.readyState >= 2 && video.videoWidth) {
    // a smaller frame is plenty for a QR code and keeps phones cool
    const w = Math.min(video.videoWidth, 640);
    const h = Math.round(video.videoHeight * (w / video.videoWidth));
    canvas.width = w; canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);
    const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
    if (code && code.data) {
      const go = target(code.data);
      if (go) {
        say('Code found. Signing you in…');
        stop();
        location.href = go;
        return;
      }
      if (Date.now() - lastBad > 1500) { lastBad = Date.now(); say('That is not the attendance QR code. Scan the one the ushers are showing.', true); }
    }
  }
  setTimeout(() => requestAnimationFrame(tick), 120);
}

async function start() {
  say('');
  if (typeof jsQR === 'undefined') return say('The scanner could not load. Check your connection, or use your phone\'s camera app.', true);
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return say('This browser cannot open the camera here. Use your phone\'s camera app to scan the QR code.', true);
  }
  startBtn.disabled = true;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    video.srcObject = stream;
    await video.play();
    view.style.display = 'block';
    startBtn.style.display = 'none';
    say('Looking for the QR code…');
    running = true;
    tick();
  } catch (e) {
    console.error(e);
    startBtn.disabled = false;
    say(e && e.name === 'NotAllowedError'
      ? 'Camera permission was blocked. Allow the camera for this site, or use your phone\'s camera app.'
      : 'Could not open the camera. Use your phone\'s camera app to scan the QR code.', true);
  }
}

startBtn.addEventListener('click', start);
/* Phones pause the camera in the background: release it and let them tap "Open camera" again. */
document.addEventListener('visibilitychange', () => {
  if (!document.hidden || !running) return;
  stop();
  view.style.display = 'none';
  startBtn.style.display = '';
  startBtn.disabled = false;
  say('Camera paused. Tap "Open camera" to scan again.');
});
window.addEventListener('pagehide', stop);

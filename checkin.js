/* checkin.js — landing page for the attendance QR code.
   Registers the device if needed (access.js), checks the scanned code against the open session,
   then records attendance for the service date.
   Ushers and department heads are NOT signed in by scanning: the Usher head ticks the ushers,
   and the Super Admin ticks the department heads (Admin → Attendance). */

const card = document.getElementById('ciCard');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function show(kind, icon, title, text, linkHtml) {
  card.className = 'ci-card ' + (kind === 'ok' ? 'ci-ok' : kind === 'bad' ? 'ci-bad' : '');
  card.innerHTML = `<div class="ci-icon"><i class="bi ${icon}"></i></div><h3>${esc(title)}</h3><p>${esc(text)}</p>${linkHtml || ''}`;
}
const home = '<a class="ci-link" href="index.html">Back to portals</a>';

(async function () {
  const qs = new URLSearchParams(location.search);
  const date = qs.get('d') || '', code = qs.get('k') || '';
  if (!date || !code) return show('bad', 'bi-qr-code', 'No code found', 'Scan the QR code shown by the ushers using your phone camera.', home);

  const me = await Access.requireWorker();

  let session;
  try { session = await DB.getAttendanceSession(); }
  catch (e) { console.error(e); return show('bad', 'bi-wifi-off', 'Could not connect', 'Check your connection and scan again.', home); }

  if (!session || !session.open || session.date !== date) {
    return show('bad', 'bi-hourglass-split', 'Attendance is closed', 'Sign-in is not open right now. Ask an usher.', home);
  }
  if (code !== session.code && code !== session.prev) {
    return show('bad', 'bi-arrow-repeat', 'This code has expired', 'Scan the QR code on the screen again.', home);
  }

  // Ushers and department heads are ticked manually by their heads
  let usher = null;
  try { usher = await DB.getUsherDept(); } catch (e) {}
  const isUsher = usher && (me.departments.includes(usher.id) || me.headOf.includes(usher.id));
  if (me.superAdmin || isUsher || me.headOf.length) {
    const who = me.superAdmin ? 'Super Admin attendance is not tracked.'
      : isUsher ? 'Your attendance is ticked by the Usher head.'
      : 'Your attendance is ticked by the Super Admin.';
    return show('info', 'bi-info-circle-fill', 'No need to scan', who, home);
  }

  try {
    await DB.setCheckedIn(date, me.token, true);
    show('ok', 'bi-check-circle-fill', `Welcome, ${me.name}`, 'Your attendance has been recorded. God bless you.', home);
  } catch (e) {
    console.error(e);
    show('bad', 'bi-exclamation-triangle-fill', 'Could not save', 'Check your connection and scan again.', home);
  }
})().catch(e => { console.error(e); show('bad', 'bi-exclamation-triangle-fill', 'Something went wrong', 'Reload the page or scan again.', home); });

/* access.js — device ID + access levels (soft gate).
   Each device gets a random token saved in localStorage AND a cookie. The token is the id of a
   document in the Firestore "devices" collection: { name, phone, whatsapp, departments[],
   requested[], headOf[], superAdmin }.
   - Workers' Portal: any registered device gets in. Department membership is approved by an admin/head.
   - Admin portal: Super Admins and Department Heads only.
   Needs shared.js (DB) loaded first. */

const Access = (() => {
  const KEY = 'cog_device_token';
  /* Only used ONCE, to create the very first Super Admin when none exists. */
  const BOOTSTRAP_PASSWORD = 'grace2024';

  /* ── token storage ── */
  const getCookie = () => {
    const m = document.cookie.match(new RegExp('(?:^|; )' + KEY + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  };
  const saved = () => {
    let t = '';
    try { t = localStorage.getItem(KEY) || ''; } catch (e) {}
    return t || getCookie();
  };
  const store = t => {
    try { localStorage.setItem(KEY, t); } catch (e) {}
    document.cookie = `${KEY}=${encodeURIComponent(t)}; max-age=${60 * 60 * 24 * 730}; path=/; SameSite=Lax`;
  };
  const forget = () => {
    try { localStorage.removeItem(KEY); } catch (e) {}
    document.cookie = `${KEY}=; max-age=0; path=/`;
  };
  const newToken = () => {
    const a = new Uint8Array(16);
    crypto.getRandomValues(a);
    return 'd' + Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
  };

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const arr = v => Array.isArray(v) ? v : [];
  const norm = d => d && ({ ...d, token: d.id, departments: arr(d.departments), requested: arr(d.requested), headOf: arr(d.headOf), superAdmin: !!d.superAdmin });
  const isAdminLevel = d => d && (d.superAdmin || d.headOf.length > 0);

  /* ── UI ── */
  const css = `
  #accessCover{position:fixed;inset:0;z-index:99998;background:#0b1f4b}
  #accessOverlay{position:fixed;inset:0;z-index:99999;overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;padding:24px 16px;
    background:linear-gradient(145deg,#0b1f4b 0%,#091838 60%,#0a1a3a 100%);font-family:'Inter',system-ui,sans-serif}
  #accessOverlay .a-card{margin:auto;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:30px 26px;
    width:100%;max-width:420px;color:#fff;box-shadow:0 24px 64px rgba(0,0,0,.4)}
  #accessOverlay h3{font-family:'Playfair Display',Georgia,serif;font-size:1.3rem;margin:0 0 6px}
  #accessOverlay p{font-size:13.5px;color:rgba(255,255,255,.62);margin:0 0 18px;line-height:1.55}
  #accessOverlay .a-hint{font-size:12px;margin:8px 0 0}
  #accessOverlay label.a-lbl{display:block;font-size:12px;font-weight:600;color:rgba(255,255,255,.75);margin:14px 0 6px}
  #accessOverlay input[type=text],#accessOverlay input[type=tel],#accessOverlay input[type=password]{width:100%;padding:12px 14px;border-radius:10px;
    border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);color:#fff;font-size:15px;outline:none}
  #accessOverlay input:focus{border-color:#c8860a}
  #accessOverlay input:disabled{opacity:.55}
  #accessOverlay .a-check{display:flex;align-items:center;gap:8px;font-size:13px;color:rgba(255,255,255,.75);margin-top:8px;cursor:pointer}
  #accessOverlay .a-depts{display:flex;flex-direction:column;gap:2px;max-height:210px;overflow-y:auto;padding:4px 2px}
  #accessOverlay .a-depts .a-check{margin-top:6px}
  #accessOverlay button.a-go{width:100%;margin-top:18px;padding:13px;border:none;border-radius:11px;background:#c8860a;color:#fff;font-weight:700;font-size:14.5px;cursor:pointer}
  #accessOverlay button.a-go:disabled{opacity:.6}
  #accessOverlay .a-err{display:none;margin-top:12px;color:#ff8a8a;font-size:12.5px}
  #accessOverlay a.a-back{display:block;text-align:center;margin-top:16px;color:rgba(255,255,255,.5);font-size:12.5px;text-decoration:none}`;

  function cover() {
    if (document.getElementById('accessCover')) return;
    const c = document.createElement('div');
    c.id = 'accessCover';
    document.body.appendChild(c);
  }
  function clearUi() {
    ['accessCover', 'accessOverlay'].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
  }
  function mount(html) {
    if (!document.getElementById('accessStyle')) {
      const s = document.createElement('style'); s.id = 'accessStyle'; s.textContent = css; document.head.appendChild(s);
    }
    const old = document.getElementById('accessOverlay'); if (old) old.remove();
    const ov = document.createElement('div');
    ov.id = 'accessOverlay';
    ov.innerHTML = `<div class="a-card">${html}</div>`;
    document.body.appendChild(ov);
    return ov;
  }
  const never = () => new Promise(() => {});

  function fail(msg) {
    mount(`<h3>Something went wrong</h3><p>${esc(msg)}</p>
      <button class="a-go" id="aRetry">Try again</button>
      <a class="a-back" href="index.html">← Back to portals</a>`);
    document.getElementById('aRetry').addEventListener('click', () => location.reload());
    return never();
  }

  async function fetchMe() {
    const t = saved();
    if (!t) return null;
    try {
      const d = await DB.getDevice(t);
      if (!d) { forget(); return null; }   // ID was removed by an admin → register again
      return norm(d);
    } catch (e) {
      console.error(e);
      return fail('Could not reach the server. Check your connection and try again.');
    }
  }

  /* ── registration (new device) ── */
  async function registerForm() {
    let depts = [];
    try { depts = await DB.getDepartments(); } catch (e) {}
    return new Promise(resolve => {
      const ov = mount(`
        <h3>Register this device</h3>
        <p>Tell us who you are. The admin will use this to confirm your department.</p>
        <label class="a-lbl" for="aName">Your name</label>
        <input type="text" id="aName" placeholder="e.g. David Besin" autocomplete="name">
        <label class="a-lbl" for="aPhone">Phone number</label>
        <input type="tel" id="aPhone" placeholder="e.g. 08012345678" autocomplete="tel">
        <label class="a-lbl" for="aWa">WhatsApp number</label>
        <input type="tel" id="aWa" placeholder="e.g. 08012345678">
        <label class="a-check"><input type="checkbox" id="aSame"> Same as phone number</label>
        <label class="a-lbl">Which department(s) do you serve in?</label>
        <div class="a-depts">
          ${depts.map(d => `<label class="a-check"><input type="checkbox" class="aDept" value="${esc(d.id)}"> ${esc(d.icon || '')} ${esc(d.name)}</label>`).join('')}
        </div>
        <p class="a-hint">Not a worker? Leave all boxes empty. A department you tick is sent to the admin or department head for approval.</p>
        <div class="a-err" id="aErr"></div>
        <button class="a-go" id="aGo">Continue</button>
        <a class="a-back" href="index.html">← Back to portals</a>`);

      const $ = id => ov.querySelector('#' + id);
      const syncWa = () => { if ($('aSame').checked) { $('aWa').value = $('aPhone').value; $('aWa').disabled = true; } else $('aWa').disabled = false; };
      $('aSame').addEventListener('change', syncWa);
      $('aPhone').addEventListener('input', syncWa);
      $('aName').focus();

      $('aGo').addEventListener('click', async () => {
        const err = $('aErr'); err.style.display = 'none';
        const name = $('aName').value.trim();
        const phone = $('aPhone').value.trim();
        const whatsapp = $('aSame').checked ? phone : $('aWa').value.trim();
        if (!name) { err.textContent = 'Please enter your name.'; err.style.display = 'block'; return; }
        if (phone.replace(/\D/g, '').length < 7) { err.textContent = 'Please enter a valid phone number.'; err.style.display = 'block'; return; }
        const requested = [...ov.querySelectorAll('.aDept:checked')].map(i => i.value);
        const token = newToken();
        const data = { name, phone, whatsapp, departments: [], requested, headOf: [], superAdmin: false };
        $('aGo').disabled = true;
        try {
          await DB.createDevice(token, data);
          store(token);
          resolve(norm({ id: token, ...data }));
        } catch (e) {
          console.error(e);
          err.textContent = 'Could not save. Check your connection and try again.';
          err.style.display = 'block';
          $('aGo').disabled = false;
        }
      });
    });
  }

  /* ── one-time first Super Admin ── */
  function bootstrapForm(existing) {
    return new Promise(resolve => {
      const ov = mount(`
        <h3>Set up the first admin</h3>
        <p>No admin exists yet. Enter the setup password to make this device the first Super Admin. You will only see this once.</p>
        ${existing ? `<p style="color:#fff;font-weight:600">${esc(existing.name)}</p>` : `
        <label class="a-lbl" for="aName">Your name</label>
        <input type="text" id="aName" placeholder="e.g. David Besin">
        <label class="a-lbl" for="aPhone">Phone number</label>
        <input type="tel" id="aPhone" placeholder="e.g. 08012345678">
        <label class="a-lbl" for="aWa">WhatsApp number</label>
        <input type="tel" id="aWa" placeholder="e.g. 08012345678">`}
        <label class="a-lbl" for="aPw">Setup password</label>
        <input type="password" id="aPw" autocomplete="off">
        <div class="a-err" id="aErr"></div>
        <button class="a-go" id="aGo">Make this device Super Admin</button>
        <a class="a-back" href="index.html">← Back to portals</a>`);
      const $ = id => ov.querySelector('#' + id);
      $('aGo').addEventListener('click', async () => {
        const err = $('aErr'); err.style.display = 'none';
        if ($('aPw').value !== BOOTSTRAP_PASSWORD) { err.textContent = 'Wrong setup password.'; err.style.display = 'block'; return; }
        $('aGo').disabled = true;
        try {
          if (existing) {
            await DB.updateDevice(existing.token, { superAdmin: true });
            resolve({ ...existing, superAdmin: true });
          } else {
            const name = $('aName').value.trim();
            const phone = $('aPhone').value.trim();
            if (!name) throw new Error('Please enter your name.');
            const token = newToken();
            const data = { name, phone, whatsapp: $('aWa').value.trim(), departments: [], requested: [], headOf: [], superAdmin: true };
            await DB.createDevice(token, data);
            store(token);
            resolve(norm({ id: token, ...data }));
          }
        } catch (e) {
          err.textContent = e.message || 'Could not save. Try again.';
          err.style.display = 'block';
          $('aGo').disabled = false;
        }
      });
    });
  }

  /* ── public API ── */
  async function requireWorker() {
    cover();
    let me = await fetchMe();
    if (!me) me = await registerForm();
    clearUi();
    return me;
  }

  async function requireAdmin() {
    cover();
    const me = await fetchMe();
    if (isAdminLevel(me)) { clearUi(); return me; }

    let anySuper;
    try { anySuper = await DB.hasSuperAdmin(); }
    catch (e) { console.error(e); return fail('Could not reach the server. Check your connection and try again.'); }

    if (!anySuper) {
      const first = await bootstrapForm(me);
      clearUi();
      return first;
    }

    mount(`<h3>No admin access</h3>
      <p>${me ? 'This device is registered, but it is not an admin or a department head. Ask a Super Admin or your department head.'
              : 'This device is not registered yet. Open the Workers\' Portal first to register it, then ask a Super Admin for access.'}</p>
      <a class="a-back" href="${me ? 'index.html' : 'workers.html'}">${me ? '← Back to portals' : 'Open the Workers\' Portal'}</a>`);
    return never();
  }

  return {
    requireWorker,
    requireAdmin,
    token: saved,
    forget,
    reset() { forget(); location.href = 'index.html'; },
  };
})();

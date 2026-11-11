/* birthday.js — shows a "Happy Birthday" window with a short prayer on the person's birthday.
   Looks up this device's registration (device token from access.js), compares the saved
   date of birth (devices/{token}.dob = 'YYYY-MM-DD') with today's date, and shows the window
   once per day. Needs firebase + shared.js (DB) loaded first. Safe to include on any page. */

(function () {
  const KEY = 'cog_device_token';

  const PRAYERS = [
    'Heavenly Father, we thank You for the gift of this new year of life. Let Your grace go before {name}, Your peace guard their heart, and Your favour surround them like a shield. May every good thing You have promised come to pass. In Jesus\' name, Amen.',
    'Lord, thank You for keeping {name} by Your mercy. As another year begins, fill their days with joy, their work with fruitfulness and their home with peace. Open doors that no man can shut, and let Your light lead the way. In Jesus\' name, Amen.',
    'Father, we celebrate {name} today. Thank You for Your faithfulness through every season. May this year bring new strength, fresh wisdom and answered prayers. Let goodness and mercy follow them all the days of their life. In Jesus\' name, Amen.',
    'Gracious God, bless {name} on this special day. Renew their strength like the eagle\'s, establish the work of their hands, and let them walk in Your purpose and in good health. May the year ahead be their best yet. In Jesus\' name, Amen.',
    'Lord of all grace, we thank You for the life of {name}. Keep them under the shadow of Your wings, grant them the desires of their heart, and let Your joy be their strength today and always. In Jesus\' name, Amen.',
  ];

  const getCookie = () => {
    const m = document.cookie.match(new RegExp('(?:^|; )' + KEY + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  };
  const token = () => {
    let t = '';
    try { t = localStorage.getItem(KEY) || ''; } catch (e) {}
    return t || getCookie();
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isLeap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

  /* Is today the birthday? A 29 February birthday is marked on 28 February in non-leap years. */
  function isBirthday(dob, now) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob || '');
    if (!m) return false;
    let month = +m[2], day = +m[3];
    if (month === 2 && day === 29 && !isLeap(now.getFullYear())) day = 28;
    return now.getMonth() + 1 === month && now.getDate() === day;
  }

  function show(name, age) {
    const style = document.createElement('style');
    style.textContent = `
      #bdayBackdrop{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px;font-family:'Inter',system-ui,sans-serif}
      #bdayCard{position:relative;width:100%;max-width:420px;max-height:92vh;overflow-y:auto;background:linear-gradient(165deg,#14337a 0%,#0d2a66 55%,#0b1f4b 100%);color:#fff;border-radius:24px;padding:34px 26px 28px;text-align:center;box-shadow:0 24px 64px rgba(0,0,0,.4);border:1px solid rgba(245,166,35,.35)}
      #bdayCard .bd-emoji{font-size:3rem;margin-bottom:6px}
      #bdayCard .bd-eyebrow{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#f5a623;font-weight:700;margin-bottom:6px}
      #bdayCard h2{font-family:'Playfair Display',Georgia,serif;font-size:1.6rem;margin:0 0 4px;line-height:1.2}
      #bdayCard .bd-age{font-size:13px;color:rgba(255,255,255,.65);margin:0 0 18px}
      #bdayCard .bd-prayer{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:16px 16px;font-family:'Playfair Display',Georgia,serif;font-style:italic;font-size:14.5px;line-height:1.75;color:rgba(255,255,255,.92);margin:0 0 20px}
      #bdayCard .bd-verse{font-size:12px;color:#f5a623;margin:-8px 0 20px;font-weight:600}
      #bdayCard button{width:100%;padding:13px;border:none;border-radius:12px;background:#c8860a;color:#fff;font-weight:700;font-size:14.5px;cursor:pointer}
      #bdayCard button:hover{background:#f5a623}`;
    document.head.appendChild(style);

    const prayer = PRAYERS[(new Date().getFullYear() + name.length) % PRAYERS.length].replace(/\{name\}/g, esc(name));
    const wrap = document.createElement('div');
    wrap.id = 'bdayBackdrop';
    wrap.innerHTML = `
      <div id="bdayCard" role="dialog" aria-modal="true" aria-label="Happy birthday">
        <div class="bd-emoji">🎂</div>
        <div class="bd-eyebrow">Covenant of Grace</div>
        <h2>Happy Birthday, ${esc(name)}!</h2>
        ${age > 0 ? `<p class="bd-age">Celebrating ${age} years of God's faithfulness</p>` : '<p class="bd-age">&nbsp;</p>'}
        <p class="bd-prayer">${prayer}</p>
        <p class="bd-verse">"The Lord bless you and keep you." — Numbers 6:24</p>
        <button id="bdayClose">Amen 🙏</button>
      </div>`;
    document.body.appendChild(wrap);
    const close = () => wrap.remove();
    wrap.querySelector('#bdayClose').addEventListener('click', close);
    wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
  }

  async function run() {
    const t = token();
    if (!t || typeof DB === 'undefined' || !DB.getDevice) return;

    const now = new Date();
    const dayKey = 'cog_bday_' + now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
    try { if (localStorage.getItem(dayKey)) return; } catch (e) {}

    let d;
    try { d = await DB.getDevice(t); } catch (e) { return; }
    if (!d || !isBirthday(d.dob, now)) return;

    try {
      Object.keys(localStorage).filter(k => k.startsWith('cog_bday_') && k !== dayKey).forEach(k => localStorage.removeItem(k));
      localStorage.setItem(dayKey, '1');
    } catch (e) {}

    const firstName = String(d.name || '').trim().split(/\s+/)[0] || 'Beloved';
    const age = now.getFullYear() - Number(d.dob.slice(0, 4));
    show(firstName, age);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();

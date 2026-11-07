/* prayer.js — Prayer Portal.
   Seen only by members/head of the Prayer department and Super Admins (read-only for members).
   Only the Prayer head and Super Admins can delete a request.
   Members submit requests anonymously from the Members' Portal. */

const main = document.getElementById('prayerMain');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let canDelete = false;

async function render() {
  main.innerHTML = '<p class="pr-msg">Loading…</p>';
  let list;
  try { list = await DB.getPrayers(); }
  catch (e) { console.error(e); main.innerHTML = '<p class="pr-msg">Could not load prayer requests. Check your connection.</p>'; return; }

  const role = canDelete ? 'You can remove requests.' : 'View only.';
  if (!list.length) { main.innerHTML = `<p class="pr-role">${role}</p><p class="pr-msg">No prayer requests yet.</p>`; return; }

  main.innerHTML = `<p class="pr-role">${list.length} request${list.length === 1 ? '' : 's'} · ${role}</p>` + list.map(p => `
    <div class="pr-card">
      <div class="pr-avatar" style="background:${esc(p.color || '#0b1f4b')}">${esc(p.initial || 'A')}</div>
      <div class="pr-body">
        <div class="pr-time">Anonymous · ${esc(p.time)}</div>
        <p class="pr-text">${esc(p.text)}</p>
        <div class="pr-count"><i class="bi bi-hands"></i> ${Number(p.prayCount) || 0} praying</div>
      </div>
      ${canDelete ? `<button class="pr-del" data-id="${esc(p.id)}" title="Remove"><i class="bi bi-trash3"></i></button>` : ''}
    </div>`).join('');

  if (canDelete) {
    main.querySelectorAll('.pr-del').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Remove this prayer request? This cannot be undone.')) return;
      b.disabled = true;
      try { await DB.deletePrayer(b.dataset.id); }
      catch (e) { console.error(e); alert('Could not delete. Try again.'); }
      render();
    }));
  }
}

Access.requireWorker().then(async me => {
  let dept = null;
  try { dept = await DB.getPrayerDept(); } catch (e) { console.error(e); }
  const inDept = !!dept && (me.departments.includes(dept.id) || me.headOf.includes(dept.id));
  if (!me.superAdmin && !inDept) {
    main.innerHTML = '<p class="pr-msg"><i class="bi bi-lock-fill"></i><br>This page is for the Prayer department only.</p>';
    return;
  }
  canDelete = me.superAdmin || (!!dept && me.headOf.includes(dept.id));
  render();
}).catch(e => { console.error(e); main.innerHTML = '<p class="pr-msg">Something went wrong. Reload the page.</p>'; });

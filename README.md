# RCCG Chapel of Grace — Web Portal
## Developer & Admin Documentation

---

## Project Structure

```
chapel-portal/
├── index.html        Landing page — portal selector
├── landing.css       Landing page styles
│
├── members.html      Members' Portal (sermons, prayer, announcements)
├── members.css       Members styles
├── members.js        Members page logic
│
├── workers.html      Workers' Portal (departments + registration)
├── style.css         Workers styles
├── workers.js        Workers departments data + registration logic
│
├── admin.html        Admin Dashboard
├── admin.css         Admin styles
├── admin.js          Admin panel logic
│
└── shared.js         ⭐ Central data store (read this first)
```

---

## How Data Works

All content is stored in the browser's **localStorage** via `shared.js`.
This means:
- Data persists across page refreshes
- Admin changes instantly appear in the Members portal (same browser)
- No server or database is needed
- Each browser/device has its own copy — this is not a cloud database

When you're ready for a real backend, replace the `DB.*` methods in `shared.js` with API calls.

---

## 1. Editing Departments (Workers Portal)

Open **`workers.js`** and find the `departments` array at the top.

### Each department looks like this:

```js
{
  icon:      "🎵",                          // Emoji shown in the icon box
  name:      "Choir & Worship",             // Department name
  members:   34,                            // Member count (displayed as text)
  schedule:  "Thursdays · 6:00 PM",        // Shown on the collapsed card
  shortDesc: "Leading the congregation…",  // One-liner on the collapsed card
  about:     "Full paragraph…",            // Shown when card is expanded
  meetings: [
    { day: "Thursday", time: "6:00 PM", label: "Rehearsal" },
    { day: "Sunday",   time: "8:00 AM", label: "Pre-service warm-up" }
  ],
  requirements: [
    "A love for worship and music",
    "Commitment to weekly rehearsals",
    "Willingness to serve"
  ],
  leader:   "Bro. Samuel Adeyemi",
  whatsapp: "2348012345678",   // Country code + number, NO + sign
  phone:    "2348012345678"
},
```

### To ADD a department
Copy any existing block and paste it at the end of the array (before the closing `]`), then fill in the details.

### To REMOVE a department
Delete its entire block from `{` to the closing `},`.

### To EDIT a department
Change any value directly. Save the file and refresh.

---

## 2. Managing Content via the Admin Dashboard

Open **`admin.html`** in a browser. No login is required (open access mode).

### Prayer Requests
- View all anonymous requests submitted by members
- Click the **red trash icon** to remove a request
- Removed requests disappear from the Members portal immediately

### Sermons
- Click **Add Sermon** → fill in Title, Speaker, Date → Save
- Click the **pencil icon** to edit an existing sermon
- Click the **red trash icon** to delete
- Changes appear instantly in the Members portal

### Announcements
- Click **Add Announcement** → fill in Emoji, Tag, Title, Body, Date → Save
- Click the **pencil icon** to edit
- Click the **red trash icon** to delete

### Home Cards (Daily Prayer / Bible Plan / Worship)
- These three cards appear on the Members home screen
- Edit the text content directly in the text area under each card
- Click **Save** — changes appear immediately on the Members page

### About Church (Super Admin only)
- Edits the "About Us" section of the Members' Portal: the story, up to 6 number tiles (e.g. `400+` / Congregation), phone, optional email and address, and service times (one per line)
- Click **Save About**; members see it straight away. Stored in Firestore at `settings/about`

### Admin layout
- The sidebar is grouped: **Church content**, **Services & care**, **Workers**. Department heads only see the Workers group (plus Attendance for the Usher head)

### Editing a department
- A Super Admin edits any department. A department head edits **only their own** (Admin → Departments, or the **Edit this department** button on their card in the Workers' Portal)
- Only a Super Admin can rename a department, because Usher/Prayer access is found by the department name

### Worker Applications
- Submitted when someone fills in the registration form on the Workers portal
- Status starts as **pending**
- Click **Approve** or **Reject** to update status
- Click the trash icon to permanently delete a record

---

## 3. Members Can Post Anonymous Prayers

On the Members portal → Prayer Requests section:
- A text area is shown above the prayer list
- Anyone can type a request and click **Post Request**
- Their name is never shown — only "Anonymous"
- The prayer appears immediately and is visible to all Members portal visitors
- Admins can remove inappropriate posts from the Admin dashboard

---

## 4. Worker Registration Flow

1. Worker visits **workers.html**
2. Expands a department card, clicks **Apply to Join**
3. A registration form slides up (modal)
4. They fill in: Name, Phone, Email, Department (auto-filled), Reason, Skills
5. On submit, the application is saved to localStorage
6. Admin sees it under **Worker Applications** in the admin panel
7. Admin can Approve, Reject, or Delete the application

---

## 5. Resetting Data to Defaults

If content gets messed up, open the browser **Console** (F12 → Console) and run:

```js
// Clear everything and reload defaults:
localStorage.clear();
location.reload();
```

Or clear individual sections:
```js
localStorage.removeItem('cog_prayers');        // Reset prayers
localStorage.removeItem('cog_sermons');        // Reset sermons
localStorage.removeItem('cog_announcements'); // Reset announcements
localStorage.removeItem('cog_home_cards');    // Reset home cards
localStorage.removeItem('cog_registrations'); // Reset applications
```

---

## 6. Styling / Design System

All pages share the same CSS design tokens defined in each file's `:root`:

| Token | Value | Used for |
|---|---|---|
| `--navy` | `#0b1f4b` | Primary dark blue |
| `--navy-2` | `#0d2a66` | Secondary navy |
| `--gold` | `#c8860a` | Accent colour, labels, icons |
| `--gold-light` | `#f5a623` | Lighter gold, hover states |
| `--gold-glow` | `rgba(200,134,10,.14)` | Subtle gold backgrounds |
| `--surface` | `#f4f6fb` | Page background, tile backgrounds |

**Fonts:** `Playfair Display` (headings) + `Inter` (body) — loaded from Google Fonts.

To change the colour scheme, update these token values in the relevant CSS file. All components reference the tokens, so one change updates everything.

---

## 7. Adding a New Page

1. Copy `workers.html` as a template
2. Change the `<title>` and hero text
3. Link your new CSS and JS files
4. Add `<script src="shared.js"></script>` before your page script if you need data access
5. Add a card for it on `index.html` (in the `portals-grid` div)

---

## 8. Going Live / Deploying

The portal is a set of static HTML files. You can host it for free on:
- **GitHub Pages** — push the folder to a GitHub repo, enable Pages in settings
- **Netlify** — drag and drop the folder at netlify.com/drop
- **Vercel** — `vercel deploy` from the folder

When deploying, remember that localStorage is browser-specific. For shared real-time data across multiple devices, you would need to replace `shared.js` with a backend (e.g. Firebase, Supabase, or a custom API).

---

## Quick Reference — localStorage Keys

| Key | Contains |
|---|---|
| `cog_prayers` | Array of prayer request objects |
| `cog_sermons` | Array of sermon objects |
| `cog_announcements` | Array of announcement objects |
| `cog_home_cards` | Array of 3 home card objects |
| `cog_registrations` | Array of worker application objects |


## Device IDs & access levels

- First visit to the Workers' Portal asks for name, phone, WhatsApp and departments. The device gets a random token (localStorage + cookie) and a record in the Firestore `devices` collection.
- Non-workers get in immediately. Ticked departments are *requests*, approved by a Super Admin or that department's head (People & Access panel, or Worker Applications).
- Members-only (shown to members, heads and Super Admins): department announcement, leader contact numbers, links.
- Admin portal needs a Super Admin or Department Head ID. Heads only see Departments, Worker Applications and People & Access, limited to their own departments.
- First Super Admin: if none exists, `admin.html` asks for the setup password (`BOOTSTRAP_PASSWORD` in `access.js`) once. If every admin device is lost, edit `superAdmin: true` on a record in the Firebase console.
- Add `devices` to your Firestore rules (read/write), like the other collections.
- This is a soft gate: the data is still readable by anyone with the Firebase config. Real enforcement needs Firebase Auth + security rules.

## QR attendance

- `usher.html` (Ushers' Portal): open to Ushering department members/head and Super Admins. "Start attendance" shows a QR code that changes every 45 seconds, so a screenshot shared on WhatsApp stops working. Keep the page open during sign-in; "Stop attendance" closes scanning.
- Scanning with the phone camera opens `checkin.html`, which registers the device if needed and records attendance for that service date.
- Ushers and department heads don't scan. The Usher head ticks the ushers; the Super Admin ticks department heads (Admin → Attendance). Both can change anyone's attendance.
- Workers and members can scan from inside the site: **Scan Attendance** (`scan.html`) is linked from the home screen, the Members' Portal and the Workers' Portal. It opens the camera, reads the usher's QR, and forwards to `checkin.html`. Scanning with the phone's own camera app works too.
- Admin → Attendance is visible only to Super Admins and the head of the department whose name contains "Usher".
- Firestore: the `settings` collection holds `attendanceSession` ({open, date, code, prev}); it must be readable and writable like the other settings.

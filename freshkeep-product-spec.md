# FreshKeep — Product Spec (working title)

*A tiny app that remembers the dates you never do.*

One app, two simple sections: it tracks **when things expire** (groceries, medicines) and **when you last did things** (changed bedsheets, replaced the toothbrush, cleaned the filter) — and reminds you, only if you ask it to.

**Design rule for the whole app: keep it simple.** If a feature makes the app harder to explain in one sentence, it doesn't belong in v1.

---

## 1. The Problem

People lose track of time-based household stuff in two directions:

- **Forward:** "When does this expire?" — We buy in bulk, forget, and throw things away. Wasted food, wasted money, and expired medicine is a safety issue.
- **Backward:** "When did I last...?" — Changed the sheets? Replaced the toothbrush? Cleaned the AC filter? No calendar answers this, because these tasks are irregular and nobody logs them.

Both share one root cause: **the date was never captured when it mattered.** FreshKeep makes capturing it take a few seconds.

---

## 2. The Solution — Two Simple Sections

### Section A: Expiry Tracker 🥛

Capture the expiry date when you buy the item; the app watches the clock.

**Add an item (fast):**

1. Tap **+ Add**
2. Type the name (or tap a recent chip: Milk, Bread, Eggs, Paracetamol)
3. Pick an **icon** — a prefilled one is auto-suggested from the name (type "Milk" → 🥛), but you can tap to change it from a simple picker (🥛🍞🥚🧀🍎🥦🥩🐟💊🧴🧃 …)
4. Set the expiry date:
   - Quick buttons: **+1 week / +1 month**, or
   - Pick a date, or
   - 📷 **Scan the printed date** (on-device OCR) — manual entry is always one tap away as fallback
5. Done.

**Home list — sorted by urgency:**

- 🔴 Expired / expires today or tomorrow
- 🟡 Expires this week
- 🟢 Fine for now

Each card: chosen icon, name, days left ("2 days left").

**Actions:** ✅ Used · 🗑️ Threw away · ✏️ Edit

### Section B: "Last Time I..." Tracker 🛏️

For recurring-but-irregular tasks. Each entry tracks the **last time you did it**.

**Add a task:**

1. Tap **+ Add**
2. Name it (or pick a template: Changed bedsheets, Replaced toothbrush, Cleaned filter, Flipped mattress, Backed up laptop, Watered plants)
3. Pick an **icon** — auto-suggested from the name, changeable from the picker (🛏️🪥🧹🛋️💻🪴🚿🧽 …)
4. It defaults "last done" to today
5. Optionally: "remind me every ___ days/weeks/months"

**Task card shows:** chosen icon, name + **"Last done: 12 days ago"** (people think in *days ago*, not dates). If a repeat interval is set, a small bar fills toward "due".

**Actions:** ✔️ Did it just now (resets the counter) · ✏️ Edit

---

## 3. Reminders 🔔 (only if you set them)

Reminders are **off by default** and **opt-in per item/task** — nothing nags you unless you asked.

- **Expiry items:** remind me **X days before** it expires (default 2).
- **Last-Time tasks:** remind me when the repeat interval is reached.
- Simple, human wording:
  - "🥛 Milk expires tomorrow"
  - "🛏️ 14 days since you changed the bedsheets"

That's it — no digests, no complex schedules in v1.

---

## 4. Sign-in & Sync 🔐

**Login (simple, two options):**

- **Mobile OTP** — enter phone number, get a one-time code by SMS, you're in. No password to remember.
- **Google sign-in** — one tap with an existing Google account.

Either way, sign-in takes seconds and there's no password to create or forget.

**Free vs Premium — where sync comes in:**

| | Free | Premium (small monthly/yearly fee) |
|---|---|---|
| Store items & tasks | ✅ On this device | ✅ |
| Reminders | ✅ | ✅ |
| Editable icons | ✅ | ✅ |
| **Cloud sync across devices** | — | ✅ Your list follows you (new phone, tablet, etc.) |
| **Backup & restore** | — | ✅ Never lose your list |
| Household sharing (later) | — | ✅ |

The everyday app is fully usable for free on one device. **Premium is only for people who want their data backed up and synced across devices** — that's the paid promise, kept simple. Pricing TBD (aim: a small, obviously-worth-it fee).

- Data on the free tier stays on the device; Premium encrypts and syncs it to the cloud.
- Optional app-lock toggle (fingerprint / Face ID to open the app) stays available on both tiers.

---

## 5. Screens (that's all)

1. **Login** — phone-number OTP or Google, one screen
2. **Home** — two tabs: *Expiring* | *Last Time I...*
3. **Add** — a small bottom sheet with name, icon picker, and date/interval; works for both sections
4. **Item / Task detail** — edit name, icon, date, reminder
5. **Settings** — default reminder lead time, app-lock toggle, and **Upgrade to Premium** (cloud sync)

No stats dashboards, no charts in v1. Keep it simple.

---

## 6. Data Model (kept minimal)

```
ExpiryItem {
  id, name, icon,
  expiryDate,
  reminderDaysBefore (optional),
}

LastTimeTask {
  id, name, icon,
  lastDoneDate,
  repeatIntervalDays (optional),
  reminderEnabled: bool,
}
```

Free tier: stored locally on the device. Premium tier: the same data is synced to the cloud against the user's account (phone number / Google ID).

---

## 7. Tech Notes

| Layer | Choice |
|---|---|
| App | React Native (native notifications, camera, and auth SDKs) |
| Auth | Mobile OTP (SMS) + Google sign-in |
| Storage | On-device by default; **cloud sync for Premium** users |
| Payments | In-app subscription (App Store / Play billing) for Premium |
| Notifications | Local notifications (work offline, no server needed) |
| OCR | **On-device** text recognition (ML Kit / Vision), with manual entry as fallback |

**Build order:** manual add + icons + urgency list + reminders → OTP/Google login → on-device OCR scan → Premium cloud sync + billing.

*Honest note on OCR:* printed expiry dates are messy (curved packaging, stamped ink, "EXP 09/26" vs "12 JUL 2026"). On-device OCR handles the easy cases; manual entry always stays one tap away so the app never feels broken.

---

## 8. Why This Works

- Both sections answer the same question — **"what does the calendar owe me?"** — so it feels like one simple app, not two.
- Expiry tracking brings frequent opens; Last-Time tasks build long-term stickiness.
- Existing apps only do expiry, are clunky, and force product-database lookups. Nobody pairs it with "last time I..." — that's the niche.
- One-sentence pitch: **"Remembers your dates — what's expiring and what's overdue — with optional cloud sync so your list follows you."**

---

## 9. What "done" looks like for v1

- Sign in with phone OTP or Google in seconds.
- Add an item or task in a few taps, with a chosen icon.
- See what's urgent at a glance.
- Get a reminder only if you set one.
- Free on one device; upgrade to Premium if you want cloud sync and backup.

Simple. That's the whole point.

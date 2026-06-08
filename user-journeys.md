# CeremonyWallet — User Journeys (Mobile First)

User journeys for the contribution management platform (weddings, kwanjula, mabugo). All contributions go directly to the treasurer via Mobile Money; the platform never holds money.

**Mobile-first:** These journeys assume the primary device is a **phone**. Each outcome is achieved in **3 steps or fewer**. Interactions are tap/scroll, one-handed use where possible, and flows that work on small screens and variable connectivity. Payment is Mobile Money on the same device; sharing is via WhatsApp, SMS, or the native share sheet.

---

## 1. Treasurer: Subscribe and create an event (on phone)

**Goal:** Activate as a treasurer and set up an event so contributors can give money directly to the treasurer—all on mobile.

| Step | Mobile action | Where |
|------|----------------|--------|
| 1 | Open the site on phone; tap to create an event and pay 50,000 UGX subscription via Mobile Money (USSD or MoMo app) | `/` → `/create` |
| 2 | Complete the wizard: event type (wedding / kwanjula / mabugo), name, date, Mobile Money number; one step per screen, thumb-friendly | `/create` (wizard) |
| 3 | Tap finish; see event page with “Share” or “Copy link” for the event | `/events/[slug]` |

**Outcome:** Treasurer has an active event and a link to share from their phone. All steps work on a small screen.

---

## 2. Treasurer: Share the event and receive contributions (on phone)

**Goal:** Get the event in front of contributors and receive contributions via Mobile Money—from the same device.

| Step | Mobile action | Where |
|------|----------------|--------|
| 1 | Open the event page on phone; tap “Share” and send the link via native share sheet (WhatsApp, SMS, or copy) | `/events/[slug]` |
| 2 | Contributors pay to the treasurer’s Mobile Money number from their phones | (Mobile Money) |
| 3 | Open event page on phone to check contributions and receipts; list/cards tappable on small screen | `/events/[slug]` |

**Outcome:** Sharing and monitoring happen on phone; money goes to treasurer’s Mobile Money.

---

## 3. Treasurer: Manually add a contribution (on phone)

**Goal:** Record a contribution that wasn’t submitted through the form (e.g. cash, or someone paid via Mobile Money and told the treasurer to add them).

| Step | Mobile action | Where |
|------|----------------|--------|
| 1 | Open the event page on phone; tap “Add contribution” | `/events/[slug]` |
| 2 | Enter contributor name and amount (numeric keypad); optional note (e.g. “cash”); tap Save | (add form / modal) |
| 3 | Contribution appears in the list (manual indicator); receipt available to copy or share for the contributor | `/events/[slug]` |

**Outcome:** Contribution is on the books and receipt is available without the contributor having used the form.

---

## 4. Contributor: View event and make a contribution (on phone)

**Goal:** Open the link on phone, record a contribution, pay via Mobile Money on the same device, and get a receipt.

| Step | Mobile action | Where |
|------|----------------|--------|
| 1 | Tap the event link (WhatsApp, SMS, etc.); view event and fill name + amount (numeric keypad), tap Submit; note treasurer’s Mobile Money number | `/events/[slug]` |
| 2 | Pay the treasurer via Mobile Money (USSD or app) on the same phone | (Mobile Money) |
| 3 | On event page, tap to copy or share receipt (share sheet / copy button) for records | `/events/[slug]` |

**Outcome:** Full flow on one phone: view → contribute → pay via MoMo → get receipt.

---

## 5. Contributor: Pledge to contribute (pay later)

**Goal:** Commit an amount on phone without paying yet; pay the treasurer via Mobile Money when ready.

| Step | Mobile action | Where |
|------|----------------|--------|
| 1 | Tap the event link; view event, choose amount (presets or keypad), tap Continue | `/events/[slug]` |
| 2 | Enter name; tap “Pledge” (not “Pay now”) to record commitment | `/events/[slug]` (contribute form) |
| 3 | See confirmation and treasurer’s number; pay via MoMo when ready; return to event page to copy receipt after paying | `/events/[slug]` |

**Outcome:** Pledge is recorded; contributor pays later and can then use the same event page to confirm or get a receipt (treasurer may mark paid or contributor can re-submit as paid if the flow supports it).

---

## 6. Contributor (or guest): Get a wedding invitation card (on phone)

**Goal:** Open the invite page on phone and get a personalized invitation to save or share.

| Step | Mobile action | Where |
|------|----------------|--------|
| 1 | Open the invitation page on phone (from event link or after contributing) | `/events/[slug]/invite` |
| 2 | View personalized card; layout fits screen | `/events/[slug]/invite` |
| 3 | Tap “Share” or “Save image” via share sheet | (share sheet / save) |

**Outcome:** Invitation generated and shared/saved from the phone.

---

## 7. Any user: Browse events (on phone)

**Goal:** Find an event to contribute to or check—quick and scannable on a small screen.

| Step | Mobile action | Where |
|------|----------------|--------|
| 1 | Open events list on phone (e.g. from home or bookmark) | `/events` |
| 2 | Scroll through event cards/list; each card tappable, key info (name, type, date) visible | `/events` |
| 3 | Tap a card to open event details or contribution form | `/events/[slug]` |

**Outcome:** Browsing and opening an event work well one-handed on phone.

---

## Journey summary (mobile first)

| Persona | Main journeys (on phone) |
|---------|---------------------------|
| **Treasurer** | Subscribe (MoMo on phone) → create event (wizard, one step per screen) → share link (share sheet) → receive contributions; manually add contribution (name + amount) when someone paid off-form (cash/MoMo). |
| **Contributor** | Tap link → view event → fill form (numeric keypad) → pay via MoMo on same phone → copy/share receipt; or choose “Pledge” to commit amount and pay later. |
| **Contributor / guest** | Open invite page on phone → view card → share or save via share sheet. |
| **Any user** | Browse event list (scroll/tap) → open event. |

All payment is off-platform (Mobile Money on phone). The platform is designed for mobile: tap-first, one column, share sheet, and minimal typing so flows work on small screens and variable networks.

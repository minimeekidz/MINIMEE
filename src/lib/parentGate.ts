// 船飛 — the parent PIN that opens 碼頭市集.
//
// The market is where the account, the money and the privacy switches live,
// so a child holding the phone must not wander into it. Em's rule: 「碼頭市集
// 是家長的專用入口，要出示船飛（家長pin碼）先可以入」.
//
// This is the same PIN the existing parent gate uses, kept in one place so
// the market and that page cannot drift apart. It is a demo constant and is
// documented as one — the ops doc's go-live list carries "real PIN with rate
// limiting and lockout" as an outstanding item, and moving it here does not
// pretend otherwise. What it does buy is that a child cannot walk in.

const DEMO_PIN = "2468";

/** Lives for the tab, not for ever: closing the app closes the gate. */
const KEY = "minimee.parent-gate";

export function checkParentPin(pin: string): boolean {
  return pin === DEMO_PIN;
}

export function openParentGate(): void {
  try { sessionStorage.setItem(KEY, "1"); } catch { /* private mode */ }
}

export function parentGateOpen(): boolean {
  try { return sessionStorage.getItem(KEY) === "1"; } catch { return false; }
}

export function closeParentGate(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* private mode */ }
}

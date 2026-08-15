import { useMemo, useState } from "react";
import { DashboardHeader, Shell, StatusPill } from "../components/UI";
import {
  addRelease, setTraySlot, setTrayStatus, useThemeCatalogue, type Release,
} from "../lib/themeStore";
import { TRAY_SLOTS } from "../lib/collection";

// 主題後台 — the switch Em asked for.
//
// 「就咁喺後台度撳個掣就可以全網一致同一所有小朋友都係更新維護新主題」.
//
// The whole month's rotation is six rows. Changing one changes the 拼合室
// for every child at once, because the trays are read from these rows rather
// than from anything baked into the build.
//
// Retiring rather than deleting is deliberate: a child half-way through a
// theme keeps their fragments, and the album still knows which card that
// release paid out. Nothing a child has earned is ever detached by a switch.

export function AdminThemesPage() {
  const { themes, cards, releases, loading, refresh } = useThemeCatalogue();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ themeId: "", cardCode: "", traySlot: "" });

  const onWall = useMemo(
    () => releases.filter(release => release.status !== "retired" && release.traySlot !== null)
      .sort((a, b) => a.displayOrder - b.displayOrder),
    [releases]);
  const offWall = useMemo(
    () => releases.filter(release => release.status === "retired" || release.traySlot === null),
    [releases]);

  const takenSlots = new Set(onWall.map(release => release.traySlot));
  const themeName = (id: string) => themes.find(theme => theme.id === id)?.nameZh ?? id;
  const cardAt = (code: string) => cards.find(card => card.code === code);

  async function act(id: string, run: () => Promise<boolean>) {
    setBusy(id);
    setError(null);
    const ok = await run();
    setBusy(null);
    if (!ok) { setError("改唔到，請再試一次。"); return; }
    await refresh();
  }

  async function create() {
    if (!draft.themeId || !draft.cardCode) return;
    const slot = draft.traySlot ? Number(draft.traySlot) : null;
    const id = `release-${draft.themeId}-${Date.now().toString(36)}`;
    setBusy("new");
    const result = await addRelease({
      id, themeId: draft.themeId, targetCardCode: draft.cardCode,
      traySlot: slot,
      displayOrder: (releases.at(-1)?.displayOrder ?? 0) + 1,
    });
    setBusy(null);
    if (!result.ok) { setError(result.error ?? "開唔到新一期"); return; }
    setDraft({ themeId: "", cardCode: "", traySlot: "" });
    await refresh();
  }

  if (loading) {
    return <Shell surface="admin"><DashboardHeader title="主題與卡冊" /><p>載入中…</p></Shell>;
  }

  return (
    <Shell surface="admin">
      <DashboardHeader title="主題與卡冊" />
      <p className="editor-help">改呢度就會即刻換晒全部小朋友嘅碎片拼合室。</p>

      {error && <p className="form-error" role="alert">{error}</p>}

      <section className="admin-block">
        <h2>而家喺牆上面嘅主題（{onWall.length} / {TRAY_SLOTS}）</h2>
        <p className="editor-help">
          碎片拼合室固定有 {TRAY_SLOTS} 格。每個主題四個詞、四塊碎片，儲齊就砌成佢配定嗰張卡
          —— 邊張卡係喺呢度配死嘅，唔會臨時揀。
        </p>

        <table className="admin-table">
          <thead>
            <tr>
              <th>格</th><th>主題</th><th>四個詞</th><th>配定嘅卡</th><th>狀態</th><th></th>
            </tr>
          </thead>
          <tbody>
            {onWall.map(release => {
              const theme = themes.find(candidate => candidate.id === release.themeId);
              const card = cardAt(release.targetCardCode);
              return (
                <tr key={release.id}>
                  <td>
                    <select
                      value={release.traySlot ?? ""}
                      disabled={busy === release.id}
                      onChange={event => void act(release.id, () =>
                        setTraySlot(release.id, event.target.value ? Number(event.target.value) : null))}
                    >
                      {Array.from({ length: TRAY_SLOTS }, (_, index) => index + 1).map(slot => (
                        <option key={slot} value={slot} disabled={takenSlots.has(slot) && slot !== release.traySlot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td><strong>{themeName(release.themeId)}</strong><br /><small>{release.themeId}</small></td>
                  <td>{theme?.words.join("・")}</td>
                  <td>
                    {release.targetCardCode}
                    {card && <><br /><small>BOOK {card.bookNo} · 第 {card.slotNo} 格</small></>}
                  </td>
                  <td>
                    <StatusPill tone={release.status === "current" ? "green" : "gold"}>
                      {release.status === "current" ? "今期" : "延續"}
                    </StatusPill>
                  </td>
                  <td>
                    <button
                      className="button small secondary"
                      disabled={busy === release.id}
                      onClick={() => void act(release.id, () =>
                        setTrayStatus(release.id, release.status === "current" ? "carryover" : "current"))}
                    >
                      轉做{release.status === "current" ? "延續" : "今期"}
                    </button>
                    <button
                      className="button small"
                      disabled={busy === release.id}
                      onClick={() => void act(release.id, () => setTrayStatus(release.id, "retired"))}
                    >
                      落架
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="editor-help">
          「落架」唔會刪走小朋友已經儲低嘅碎片。個主題再上架嗰陣，佢哋由停低嗰度繼續。
        </p>
      </section>

      <section className="admin-block">
        <h2>開新一期</h2>
        <p className="editor-help">
          同一個主題日後可以有第二張卡 —— 開多一期就得，唔好改舊嗰期，
          舊嗰張卡喺卡冊入面嘅位置係固定嘅。
        </p>
        <div className="admin-new-release">
          <label>
            <span>主題</span>
            <select value={draft.themeId} onChange={event => setDraft({ ...draft, themeId: event.target.value })}>
              <option value="">揀一個…</option>
              {themes.map(theme => (
                <option key={theme.id} value={theme.id}>
                  {String(theme.themeNo).padStart(2, "0")} · {theme.nameZh}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>配定嘅 MEE 卡</span>
            <select value={draft.cardCode} onChange={event => setDraft({ ...draft, cardCode: event.target.value })}>
              <option value="">揀一張…</option>
              {cards.map(card => (
                <option key={card.code} value={card.code}>
                  {card.code} · BOOK {card.bookNo} 第 {card.slotNo} 格
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>放邊格（可以留空）</span>
            <select value={draft.traySlot} onChange={event => setDraft({ ...draft, traySlot: event.target.value })}>
              <option value="">唔上牆</option>
              {Array.from({ length: TRAY_SLOTS }, (_, index) => index + 1).map(slot => (
                <option key={slot} value={slot} disabled={takenSlots.has(slot)}>{slot}</option>
              ))}
            </select>
          </label>
          <button
            className="button"
            disabled={!draft.themeId || !draft.cardCode || busy === "new"}
            onClick={() => void create()}
          >{busy === "new" ? "開緊…" : "開新一期"}</button>
        </div>
      </section>

      {offWall.length > 0 && (
        <section className="admin-block">
          <h2>唔喺牆上面（{offWall.length}）</h2>
          <table className="admin-table">
            <thead><tr><th>主題</th><th>卡</th><th>狀態</th><th></th></tr></thead>
            <tbody>
              {offWall.map(release => (
                <tr key={release.id}>
                  <td>{themeName(release.themeId)}</td>
                  <td>{release.targetCardCode}</td>
                  <td>{release.status}</td>
                  <td>
                    <button
                      className="button small secondary"
                      disabled={busy === release.id || takenSlots.size >= TRAY_SLOTS}
                      onClick={() => void act(release.id, async () => {
                        const free = Array.from({ length: TRAY_SLOTS }, (_, index) => index + 1)
                          .find(slot => !takenSlots.has(slot));
                        if (!free) return false;
                        return (await setTrayStatus(release.id, "current"))
                          && (await setTraySlot(release.id, free));
                      })}
                    >上架</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {takenSlots.size >= TRAY_SLOTS && (
            <p className="editor-help">六格已經滿咗 —— 要先將一個主題落架先上到新嘅。</p>
          )}
        </section>
      )}

      <section className="admin-block">
        <h2>全部 {themes.length} 個主題</h2>
        <p className="editor-help">統一 3–12 歲詞彙，每個主題四個詞。呢個係出題同碎片嘅唯一來源。</p>
        <table className="admin-table">
          <thead><tr><th>#</th><th>主題</th><th>詞彙</th><th>提問</th></tr></thead>
          <tbody>
            {themes.map(theme => (
              <tr key={theme.id}>
                <td>{String(theme.themeNo).padStart(2, "0")}</td>
                <td>{theme.nameZh}</td>
                <td>{theme.words.join("・")}</td>
                <td><small>{theme.question}</small></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Shell>
  );
}

/** Kept out of the component so the route file does not import a type. */
export type { Release };

import { useMemo, useState } from "react";
import { DashboardHeader, Shell, StatusPill } from "../components/UI";
import {
  addRelease, setGameMode, setTraySlot, setTrayStatus, useThemeCatalogue, type Release,
} from "../lib/themeStore";
import { TRAY_SLOTS } from "../lib/collection";
import { FAMILIES, GAME_MODES, type GameMode } from "../lib/games";

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
  const [draft, setDraft] = useState({
    themeId: "", cardCode: "", traySlot: "", gameMode: "sentence" as GameMode,
  });

  const onWall = useMemo(
    () => releases.filter(release => release.status !== "retired" && release.traySlot !== null)
      .sort((a, b) => a.displayOrder - b.displayOrder),
    [releases]);
  const offWall = useMemo(
    () => releases.filter(release => release.status === "retired" || release.traySlot === null),
    [releases]);

  const takenSlots = new Set(onWall.map(release => release.traySlot));
  // A game already in use on the wall cannot be picked again. The database
  // enforces this too; greying it out here is so Em sees why before clicking.
  const takenGames = new Set(onWall.map(release => release.gameMode));
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
      gameMode: draft.gameMode,
    });
    setBusy(null);
    if (!result.ok) { setError(result.error ?? "開唔到新一期"); return; }
    setDraft({ themeId: "", cardCode: "", traySlot: "", gameMode: "sentence" });
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
          —— 邊張卡係喺呢度配死嘅，唔會臨時揀。每個主題玩法都唔可以撞，因為戲院一次過
          放三個主題嘅影片，三個一樣就好悶。
        </p>

        <table className="admin-table">
          <thead>
            <tr>
              <th>格</th><th>主題</th><th>四個詞</th><th>玩法</th><th>配定嘅卡</th><th>狀態</th><th></th>
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
                    <select
                      value={release.gameMode}
                      disabled={busy === release.id}
                      onChange={event => {
                        const mode = event.target.value as GameMode;
                        setBusy(release.id);
                        setError(null);
                        void (async () => {
                          const result = await setGameMode(release.id, mode);
                          setBusy(null);
                          if (!result.ok) { setError(result.error ?? "改唔到玩法"); return; }
                          await refresh();
                        })();
                      }}
                    >
                      {GAME_MODES.map(mode => (
                        <option
                          key={mode}
                          value={mode}
                          disabled={takenGames.has(mode) && mode !== release.gameMode}
                        >{FAMILIES[mode].nameZh}</option>
                      ))}
                    </select>
                    <br /><small>{FAMILIES[release.gameMode].domain}</small>
                  </td>
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
            <span>玩法</span>
            <select
              value={draft.gameMode}
              onChange={event => setDraft({ ...draft, gameMode: event.target.value as GameMode })}
            >
              {GAME_MODES.map(mode => (
                <option key={mode} value={mode} disabled={takenGames.has(mode)}>
                  {FAMILIES[mode].nameZh}（{FAMILIES[mode].domain}）
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
            // Counted rather than written out. The wall went from six slots to
            // three when Em set 「有 3 組（3 個主題）」, and this sentence still
            // said six — under a button that had quietly become undisablable
            // because three retired themes were still holding slots 4 to 6.
            <p className="editor-help">
              {TRAY_SLOTS} 格已經滿咗 —— 要先將一個主題落架先上到新嘅。
            </p>
          )}
        </section>
      )}

      <section className="admin-block">
        <h2>七種玩法</h2>
        <p className="editor-help">
          每個玩法都要玩四次先砌到一張卡，一次難過一次。難度會按小朋友年齡自動調
          —— 3–5 歲兩個選項、全程有提示、冇計時；9–12 歲四個選項、最後一round要打字。
          計時器只影響有冇星星，任何情況下都唔會攞走碎片。
        </p>
        <table className="admin-table">
          <thead>
            <tr><th>玩法</th><th>學習範疇</th><th>玩啲乜</th><th>四個 round</th></tr>
          </thead>
          <tbody>
            {GAME_MODES.map(mode => (
              <tr key={mode}>
                <td><strong>{FAMILIES[mode].nameZh}</strong><br /><small>{mode}</small></td>
                <td>{FAMILIES[mode].domain}</td>
                <td><small>{FAMILIES[mode].doing}</small></td>
                <td>
                  <ol className="game-ladder">
                    {FAMILIES[mode].ladder.map(step => <li key={step}><small>{step}</small></li>)}
                  </ol>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

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

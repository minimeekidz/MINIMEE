import { useCallback, useEffect, useState } from "react";
import { Check, Save, Upload } from "lucide-react";
import { DashboardHeader, EmptyState, Shell, StatusPill } from "../components/UI";
import { supabase } from "../lib/supabase";
import type { LessonWord } from "../lib/rooms";
import { FAMILIES } from "../lib/games";
import { useThemeCatalogue } from "../lib/themeStore";

// Lets the operator publish a new lesson into a room without a developer.
//
// A room's content is the one thing that changes constantly — the rooms
// themselves, the fragment maths and the world layout are fixed. Putting
// only the changing part behind an editor is what keeps the ops surface
// small.
//
// Publishing is insert-then-flip, never an edit in place: the previous
// lesson stays in the table, so a bad swap is undone by flipping back
// rather than by retyping the content.
//
// The theme is picked from the catalogue rather than typed. A typed name
// looked the same on screen but left `theme_id` null, and a lesson with no
// theme id falls back to the plain word game — so the month's configured
// game silently never ran. Picking also fills the four words in, because
// the theme already owns them and retyping them is how they drift.

interface RoomRow { id: string; nameZh: string; blurb: string }
interface LessonRow {
  id: string; roomId: string; theme: string; themeId: string | null; title: string;
  words: LessonWord[]; current: boolean; videoPath: string | null;
}

export function AdminLessonsPage() {
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; ok: boolean } | null>(null);

  const { themes, releases } = useThemeCatalogue();

  const [roomId, setRoomId] = useState("");
  // "" means no theme: a standalone lesson that plays the plain word game.
  const [themeId, setThemeId] = useState("");
  const [title, setTitle] = useState("");
  const [videoPath, setVideoPath] = useState("");
  const [wordText, setWordText] = useState("");

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const [roomResult, lessonResult] = await Promise.all([
      supabase.from("rooms").select("id, name_zh, blurb").order("sort_order"),
      supabase.from("room_lessons")
        .select("id, room_id, theme, theme_id, title, words, current, video_path")
        .order("created_at", { ascending: false }),
    ]);
    setRooms((roomResult.data ?? []).map(r => ({
      id: r.id as string, nameZh: r.name_zh as string, blurb: (r.blurb as string) ?? "",
    })));
    setLessons((lessonResult.data ?? []).map(l => ({
      id: l.id as string, roomId: l.room_id as string, theme: (l.theme as string) ?? "",
      themeId: (l.theme_id as string) ?? null,
      title: (l.title as string) ?? "", words: (l.words as LessonWord[]) ?? [],
      current: Boolean(l.current), videoPath: (l.video_path as string) ?? null,
    })));
    // Functional update so reloading never clobbers a room the operator has
    // already picked, and so `load` does not have to depend on roomId (which
    // would refetch the whole table every time the dropdown moves).
    const firstRoom = roomResult.data?.[0]?.id as string | undefined;
    if (firstRoom) setRoomId(current => current || firstRoom);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // One word per line: 詞語 | 讀音 | 意思. Anything after the first field is
  // optional, so a quick list still works.
  function parseWords(text: string): LessonWord[] {
    return text.split("\n").map(line => line.trim()).filter(Boolean).map(line => {
      const [word, reading, meaning] = line.split("|").map(part => part.trim());
      return { word, reading: reading || undefined, meaning: meaning || undefined };
    }).filter(entry => entry.word);
  }

  async function publish() {
    if (!supabase || !roomId || !title) { setNote({ text: "要揀房間同填課題名稱。", ok: false }); return; }
    const words = parseWords(wordText);
    if (words.length < 2) { setNote({ text: "最少要兩個詞語，遊戲先有得揀。", ok: false }); return; }
    setBusy(true);
    setNote(null);

    // Clear the old current first: the partial unique index allows only one
    // per room, so inserting a second current row would be rejected.
    await supabase.from("room_lessons").update({ current: false })
      .eq("room_id", roomId).eq("current", true);

    const picked = themes.find(candidate => candidate.id === themeId);
    const { error } = await supabase.from("room_lessons").insert({
      room_id: roomId,
      // `theme` stays the display name so the studio panels keep working;
      // `theme_id` is what decides which game runs.
      theme: picked?.nameZh ?? "未命名主題",
      theme_id: picked?.id ?? null,
      title, words, video_path: videoPath || null, current: true,
    });

    setBusy(false);
    if (error) { setNote({ text: `未能發布：${error.message}`, ok: false }); return; }
    setNote({ text: "已發布。小朋友下次入房就會見到新內容。", ok: true });
    setTitle(""); setWordText(""); setVideoPath("");
    await load();
  }

  async function makeCurrent(lesson: LessonRow) {
    if (!supabase) return;
    setBusy(true);
    await supabase.from("room_lessons").update({ current: false })
      .eq("room_id", lesson.roomId).eq("current", true);
    await supabase.from("room_lessons").update({ current: true }).eq("id", lesson.id);
    setBusy(false);
    await load();
  }

  if (loading) {
    return <Shell surface="admin"><DashboardHeader title="房間內容" />
      <EmptyState title="載入中" detail="正在讀取房間同課程。" /></Shell>;
  }

  return <Shell surface="admin">
    <DashboardHeader title="房間內容" />

    {note && <div className={note.ok ? "payment-result success" : "payment-result failed"} role="status">
      <Check size={17} /><div><p>{note.text}</p></div>
    </div>}

    <section className="editor-grid">
      <label>
        <span>房間</span>
        <select value={roomId} onChange={event => setRoomId(event.target.value)}>
          {rooms.map(room => <option key={room.id} value={room.id}>{room.nameZh} — {room.blurb}</option>)}
        </select>
      </label>

      <label>
        <span>主題</span>
        <select
          value={themeId}
          onChange={event => {
            const next = event.target.value;
            setThemeId(next);
            const picked = themes.find(candidate => candidate.id === next);
            // Fill the words in from the theme itself. Retyping them is how
            // the lesson and the tray end up disagreeing about what the
            // four words are.
            if (picked) {
              setWordText(picked.words.join("\n"));
              setTitle(current => current || picked.nameZh);
            }
          }}
        >
          <option value="">唔接主題（玩返普通詞語遊戲）</option>
          {themes.map(candidate => (
            <option key={candidate.id} value={candidate.id}>
              {String(candidate.themeNo).padStart(2, "0")} · {candidate.nameZh}
            </option>
          ))}
        </select>
        <small>
          {themeId
            ? (() => {
                const release = releases.find(
                  row => row.themeId === themeId && row.status !== "retired");
                return release
                  ? `呢個主題而家玩「${FAMILIES[release.gameMode].nameZh}」（${FAMILIES[release.gameMode].domain}）。`
                  : "呢個主題仲未上牆 —— 要喺「主題與卡冊」度開一期先玩到佢嘅遊戲。";
              })()
            : "唔揀主題就用返舊嗰個揀詞語遊戲，唔會用當月玩法。"}
        </small>
      </label>

      <label className="editor-wide">
        <span>課題名稱</span>
        <input value={title} onChange={event => setTitle(event.target.value)} placeholder="海洋詞語" />
      </label>

      <label className="editor-wide">
        <span>影片路徑（Supabase Storage → room-videos 入面嘅檔名）</span>
        <input value={videoPath} onChange={event => setVideoPath(event.target.value)}
          placeholder="ocean/library-01.mp4" />
        <small>留空都得 —— 冇片一樣玩到詞語遊戲。</small>
      </label>

      <label className="editor-wide">
        <span>詞語（一行一個：詞語 | 讀音 | 意思）</span>
        <textarea rows={8} value={wordText} onChange={event => setWordText(event.target.value)}
          placeholder={"海豚 | hoi2 tyun4 | dolphin 🐬\n海龜 | hoi2 gwai1 | turtle 🐢\n珊瑚 | saan1 wu4 | coral"} />
        <small>最少兩個。遊戲會顯示「意思」，小朋友揀返個「詞語」。</small>
      </label>
    </section>

    <div className="editor-actions">
      <button className="button" onClick={() => void publish()} disabled={busy}>
        <Upload size={16} />{busy ? "發布中…" : "發布做呢間房嘅現行內容"}
      </button>
    </div>

    <section className="theme-release-list">
      <h2>已有課程</h2>
      <ol className="theme-slots">
        {rooms.map(room => {
          const roomLessons = lessons.filter(lesson => lesson.roomId === room.id);
          return <li className="theme-slot" key={room.id}>
            <div className="theme-slot-heading">
              <strong>{room.nameZh}</strong>
              {roomLessons.some(lesson => lesson.current)
                ? <StatusPill tone="green">有現行內容</StatusPill>
                : <StatusPill tone="gold">空</StatusPill>}
            </div>
            {roomLessons.length === 0
              ? <p className="theme-slot-note">仲未有課程。</p>
              : <ul className="theme-slot-jobs">{roomLessons.map(lesson => <li key={lesson.id}>
                  <span>
                    {lesson.theme} · {lesson.title}
                    （{lesson.words.length} 個詞{lesson.videoPath ? "、有片" : ""}
                    {lesson.themeId ? "" : "、冇接主題"}）
                  </span>
                  {lesson.current
                    ? <small>現行</small>
                    : <button className="button small secondary" onClick={() => void makeCurrent(lesson)} disabled={busy}>
                        <Save size={13} />設為現行
                      </button>}
                </li>)}</ul>}
          </li>;
        })}
      </ol>
    </section>
  </Shell>;
}

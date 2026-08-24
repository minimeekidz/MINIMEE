import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, Check, Keyboard, QrCode, ShieldCheck, X } from "lucide-react";
import type { EditableCard } from "../../lib/kidCardStore";
import {
  canScan, cardLink, requestFriend, respondFriend, scanOnce, slugFromScan, useFriends,
} from "../../lib/friends";
import { qrPath } from "../../lib/qr";

// Buddy Café, the 公告板, and the three things in 我的小屋.

/** A card's link, as a scannable square. */
export function CardQr({ slug, size = 168 }: { slug: string; size?: number }) {
  const link = cardLink(slug);
  let code: { d: string; size: number };
  try {
    code = qrPath(link);
  } catch {
    // Only reachable if a slug grew past what the schema allows, but a café
    // that throws is worse than a café that shows the link.
    return <code className="scan-link">{link}</code>;
  }
  return (
    <svg className="card-qr" width={size} height={size}
      viewBox={`0 0 ${code.size} ${code.size}`} role="img" aria-label={`${slug} 嘅 QR code`}>
      <rect width={code.size} height={code.size} fill="#fff" />
      <path d={code.d} fill="#1b1233" />
    </svg>
  );
}

/**
 * Buddy Café's centre table. 「讓小朋友與小朋友之間互掃 qrcode 加好友及同意
 * 加入好友的」— the two consoles Em drew facing each other across a divider,
 * one child on each side.
 *
 * Both halves are real now: the code is a genuine QR (see `qr.ts`) and the
 * scan writes a friendship that the other child has to agree to before it
 * counts. Scanning uses the browser's own barcode reader where there is one
 * and falls back to typing the code, because that reader is not in Safari and
 * an iPad is the likeliest thing in a child's hands.
 */
export function FriendScanPanel({ card, onChanged }: {
  card: EditableCard | null;
  /** Told when a request goes out, so the book behind can refresh. */
  onChanged?: () => void;
}) {
  const [mode, setMode] = useState<"idle" | "camera" | "type">("idle");
  const [typed, setTyped] = useState("");
  const [message, setMessage] = useState<{ good: boolean; text: string } | null>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const stopper = useRef<(() => void) | null>(null);

  // The camera is stopped on the way out of every path, including unmount —
  // a panel closed with the camera still running is a light left on.
  useEffect(() => () => stopper.current?.(), []);

  async function send(raw: string) {
    const slug = slugFromScan(raw);
    if (!card) return;
    if (!slug) { setMessage({ good: false, text: "呢個 code 讀唔明，再試多次。" }); return; }
    const result = await requestFriend(card.id, slug);
    setMessage(result.ok
      ? { good: true, text: "送咗出去喇！等佢撳「同意」就加得成。" }
      : { good: false, text: result.error });
    if (result.ok) { setMode("idle"); setTyped(""); onChanged?.(); }
  }

  async function startCamera() {
    setMode("camera");
    setMessage(null);
    // The <video> only exists once the mode has rendered.
    requestAnimationFrame(() => void (async () => {
      if (!video.current) return;
      try {
        stopper.current = await scanOnce(video.current, text => { void send(text); });
      } catch {
        setMode("type");
        setMessage({ good: false, text: "開唔到相機。打朋友個 code 都得。" });
      }
    })());
  }

  function stopCamera() {
    stopper.current?.();
    stopper.current = null;
    setMode("idle");
  }

  return (
    <div className="cafe-scan">
      {mode === "camera" ? (
        <div className="scan-frame live">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={video} playsInline muted />
          <button type="button" className="tape-button ghost" onClick={stopCamera}>唔掃住</button>
        </div>
      ) : (
        <>
          {card?.slug ? (
            <div className="scan-mine">
              <CardQr slug={card.slug} />
              <div>
                <strong>我張卡</strong>
                <p>俾朋友掃呢個。</p>
                <code className="scan-link">{card.slug}</code>
              </div>
            </div>
          ) : (
            <p className="panel-empty">你張卡仲未整好，整好咗先可以換好友。</p>
          )}

          <div className="scan-actions">
            {canScan() && (
              <button type="button" className="tape-button" onClick={() => void startCamera()}>
                <Camera size={16} aria-hidden /> 掃朋友張卡
              </button>
            )}
            <button type="button" className="tape-button ghost" onClick={() => setMode("type")}>
              <Keyboard size={16} aria-hidden /> 打朋友個 code
            </button>
          </div>
        </>
      )}

      {mode === "type" && (
        <form className="scan-type" onSubmit={event => { event.preventDefault(); void send(typed); }}>
          <label htmlFor="friend-code">朋友個 code</label>
          <input id="friend-code" value={typed} autoComplete="off"
            placeholder="例如 emma-3f2k9x"
            onChange={event => setTyped(event.target.value)} />
          <button type="submit" className="tape-button" disabled={!typed.trim() || !card}>送出</button>
        </form>
      )}

      {message && (
        <p className={message.good ? "scan-said good" : "scan-said bad"}>{message.text}</p>
      )}

      <ol className="scan-steps">
        <li>兩個人面對面坐低，一人一邊，打開自己張卡。</li>
        <li>一個人掃另一個人嘅 QR code。</li>
        <li><strong>另一邊要喺好友冊撳「同意」</strong>先加得成 —— 一邊撳係唔算數嘅。</li>
        <li>加咗之後，兩個人嘅好友冊都會多咗對方。</li>
      </ol>

      <p className="panel-note">
        <ShieldCheck size={12} /> 冇公開嘅卡係掃唔到嘅。你唔撳「同意」，冇人加到你。
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------

export interface NewsItem {
  id: string;
  kind: "fun" | "announcement";
  title: string;
  body: string;
  publishedAt: string;
}

/**
 * 公告板.
 *
 * 小鎮趣聞 and 最新消息 are drawn as two separate sections with the 趣聞 one
 * explicitly marked as made up. Em's reason, and it is the right one: a
 * parent who cannot tell an invented pet story from a real product
 * announcement stops believing either of them.
 */
export function NoticeBoardPanel({ news }: { news: NewsItem[] }) {
  const announcements = news.filter(item => item.kind === "announcement");
  const fun = news.filter(item => item.kind === "fun");

  return (
    <div className="notice-board">
      <section className="notice-section real">
        <header>
          <h3>最新消息</h3>
          <span className="notice-flag real">MINIMEE 官方</span>
        </header>
        {announcements.length === 0
          ? <p className="panel-empty">暫時冇新消息。</p>
          : announcements.map(item => (
            <article key={item.id}>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
              <small>{new Date(item.publishedAt).toLocaleDateString("zh-HK")}</small>
            </article>
          ))}
      </section>

      <section className="notice-section fun">
        <header>
          <h3>小鎮趣聞</h3>
          <span className="notice-flag fun">小寵物講嘅故仔 · 唔係真事</span>
        </header>
        {fun.length === 0
          ? <p className="panel-empty">今日小鎮好靜。</p>
          : fun.map(item => (
            <article key={item.id}>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </article>
          ))}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------

/** 我的小屋 — 關於我（卡片）. */
export function AboutMePanel({ card }: { card: EditableCard | null }) {
  if (!card?.slug) {
    return <p className="panel-empty">張卡仲未整好。叫屋企人喺碼頭市集嘅畫桌整返先。</p>;
  }
  return (
    <div className="home-panel">
      <p>呢張就係俾人睇嘅你 —— 屋企人開咗公開嘅嘢先見到。</p>
      <Link className="tape-button" to={`/kid/${card.slug}`}>睇我張卡</Link>
      {!card.published && <p className="panel-note">而家仲係私人，未公開。</p>}
    </div>
  );
}

/** 我的小屋 — 更新我的卡片（貼紙同分享）. */
export function UpdateCardPanel({ card, childId }: { card: EditableCard | null; childId: string }) {
  return (
    <div className="home-panel">
      <p>貼紙、日常、興趣、夢想 —— 呢啲係你自己揀，唔使問人。</p>
      {card?.slug && <Link className="tape-button" to={`/kid/${card.slug}`}>去貼貼紙</Link>}
      <p className="panel-note">
        名、年齡、學校同公開設定係屋企人喺碼頭市集度改嘅。
      </p>
      <Link className="tape-button ghost" to={`/parent/children/${childId}/sharing`}>分享俾朋友</Link>
    </div>
  );
}

/**
 * 我的小屋 — 我的好友冊.
 *
 * Three groups, and the order is deliberate: the people waiting on you come
 * first, because that is the only part of this screen with something to do.
 */
export function FriendsBookPanel({ card }: { card: EditableCard | null }) {
  const { friends, loading, refresh } = useFriends(card?.id ?? null);
  const [busy, setBusy] = useState<string | null>(null);

  async function answer(friendshipId: string, accept: boolean) {
    if (!card) return;
    setBusy(friendshipId);
    await respondFriend(card.id, friendshipId, accept);
    await refresh();
    setBusy(null);
  }

  const asking = friends.filter(friend => friend.status === "waiting-me");
  const sent = friends.filter(friend => friend.status === "waiting-them");
  const made = friends.filter(friend => friend.status === "friends");

  if (loading) return <div className="home-panel"><p className="panel-empty">揭緊…</p></div>;

  if (friends.length === 0) {
    return (
      <div className="home-panel">
        <p className="panel-empty">好友冊仲係空白。</p>
        <p className="panel-note">去 Buddy Café 同朋友互掃張卡，加咗就會喺呢度。</p>
      </div>
    );
  }

  const face = (friend: typeof friends[number]) => (
    <div className="friend-face">
      {friend.avatarUrl
        ? <img src={friend.avatarUrl} alt="" />
        : <span aria-hidden>{friend.displayName.slice(0, 1)}</span>}
      <div>
        <strong>{friend.displayName}</strong>
        <code>{friend.slug}</code>
      </div>
    </div>
  );

  return (
    <div className="home-panel friends-book">
      {asking.length > 0 && (
        <section className="friends-group asking">
          <h3>等你答</h3>
          {asking.map(friend => (
            <article key={friend.friendshipId}>
              {face(friend)}
              <div className="friend-buttons">
                <button type="button" className="tape-button" disabled={busy === friend.friendshipId}
                  onClick={() => void answer(friend.friendshipId, true)}>
                  <Check size={15} aria-hidden /> 同意
                </button>
                <button type="button" className="tape-button ghost" disabled={busy === friend.friendshipId}
                  onClick={() => void answer(friend.friendshipId, false)}>
                  <X size={15} aria-hidden /> 唔要住
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {made.length > 0 && (
        <section className="friends-group made">
          <h3>好友 · {made.length}</h3>
          {made.map(friend => (
            <article key={friend.friendshipId}>
              {face(friend)}
              <Link className="tape-button ghost" to={`/kid/${friend.slug}`}>睇佢張卡</Link>
            </article>
          ))}
        </section>
      )}

      {sent.length > 0 && (
        <section className="friends-group sent">
          <h3>等緊對方</h3>
          {sent.map(friend => (
            <article key={friend.friendshipId}>
              {face(friend)}
              <span className="friend-waiting">等緊佢撳同意</span>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

import { Link } from "react-router-dom";
import { Camera, QrCode, ShieldCheck } from "lucide-react";
import type { EditableCard } from "../../lib/kidCardStore";

// Buddy Café, the 公告板, and the three things in 我的小屋.

/**
 * Buddy Café. 「掃好友QRCode的功能入口…有好似相機咁的圖，有教學及說明」.
 *
 * The scanner itself needs a camera permission prompt and a friends backend,
 * neither of which exists yet, so the café teaches the exchange and shows the
 * child their own code. That is honest and still useful: two children can
 * read each other's code off the screen today.
 */
export function FriendScanPanel({ card }: { card: EditableCard | null }) {
  return (
    <div className="cafe-scan">
      <div className="scan-frame">
        <Camera size={40} aria-hidden />
        <p>對準朋友張卡上面嘅 QR code</p>
      </div>

      <ol className="scan-steps">
        <li>同朋友坐埋一齊，兩個人都打開自己張卡。</li>
        <li>一個人揀「我的好友冊」，另一個人俾佢掃。</li>
        <li>掃到之後，兩個人嘅好友冊都會多咗對方。</li>
      </ol>

      {card?.slug && (
        <div className="scan-mine">
          <QrCode size={18} aria-hidden />
          <div>
            <strong>我嘅卡</strong>
            <code>/kid/{card.slug}</code>
          </div>
        </div>
      )}

      <p className="panel-note">
        <ShieldCheck size={12} /> 掃描功能整緊。而家可以先影低對方張卡嘅連結。
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

/** 我的小屋 — 我的好友冊. */
export function FriendsBookPanel() {
  return (
    <div className="home-panel">
      <p className="panel-empty">好友冊整緊。</p>
      <p className="panel-note">
        整好之後，喺 Buddy Café 掃朋友張卡就會加入呢度。
      </p>
    </div>
  );
}

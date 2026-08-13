import { useCallback, useEffect, useState } from "react";
import { Check, Sparkles, Trophy } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { DashboardHeader, EmptyState, Shell, StatusPill } from "../components/UI";
import { PixelWorldGame, type Pickup } from "../components/PixelWorldGame";
import { useFamily } from "../contexts/FamilyContext";
import { COLLECTIBLES } from "../lib/kidCard";
import {
  awardCollectible, completeTask, loadCollectedCodes, loadEditableCard, loadTasks,
  type EditableCard, type OpenTask,
} from "../lib/kidCardStore";

// The real pixel town, tied to one child's card. Children never have their
// own login (ops doc section 2), so this lives behind the parent's session:
// the parent opens it and hands over the phone. The public /play route stays
// a local-state demo for the marketing site.
export function KidPlayPage() {
  const { id: childId } = useParams();
  const { children, loading: familyLoading } = useFamily();
  const child = children.find(candidate => candidate.id === childId);

  const [card, setCard] = useState<EditableCard | null>(null);
  const [collected, setCollected] = useState<string[]>([]);
  const [tasks, setTasks] = useState<OpenTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    const found = await loadEditableCard(childId);
    setCard(found);
    if (found) {
      const [codes, taskList] = await Promise.all([
        loadCollectedCodes(found.id),
        loadTasks(found.id),
      ]);
      setCollected(codes);
      setTasks(taskList);
    }
    setLoading(false);
  }, [childId]);

  useEffect(() => { void load(); }, [load]);

  // Walking into a pickup writes it through immediately. The award is
  // idempotent on (card, code), so a replay of the same overlap — or the
  // child walking back and forth — cannot mint a duplicate or change the
  // rarity the card was first earned at.
  const handleCollect = useCallback(async (code: string) => {
    if (!card) return;
    const collectible = COLLECTIBLES.find(item => item.code === code);
    if (!collectible) return;
    setCollected(current => current.includes(code) ? current : [...current, code]);
    const result = await awardCollectible(card.id, collectible);
    if (!result.ok) setError("收集咗，但未儲存到。過陣再入嚟會自動再試。");
  }, [card]);

  async function handleTaskDone(taskId: string) {
    const result = await completeTask(taskId);
    if (!result.ok) { setError("未能記錄任務完成，請稍後再試。"); return; }
    setTasks(current => current.map(task => task.id === taskId ? { ...task, done: true } : task));
  }

  if (familyLoading || loading) {
    return <Shell surface="parent"><DashboardHeader title="MEE 小鎮" />
      <EmptyState title="載入中" detail="正在讀取收集進度。" /></Shell>;
  }

  if (!child) {
    return <Shell surface="parent"><DashboardHeader title="MEE 小鎮" />
      <EmptyState title="找不到這名孩子" detail="這個檔案不存在，或不屬於目前登入的家長帳戶。" /></Shell>;
  }

  if (!card) {
    return <Shell surface="parent">
      <DashboardHeader title="MEE 小鎮" />
      <EmptyState title="要先有自我介紹卡" detail={`${child.nickname} 收集到嘅 MEE 卡會出現喺佢張自我介紹卡上面，所以要先建立張卡。`} />
      <div className="subscription-actions">
        <Link className="button" to={`/parent/children/${child.id}/card`}>去建立自我介紹卡</Link>
      </div>
    </Shell>;
  }

  const pickups: Pickup[] = COLLECTIBLES.map(item => ({
    id: item.code,
    x: item.x,
    label: item.name,
    art: item.art,
  }));

  const openTasks = tasks.filter(task => !task.done);
  const allFound = collected.length === COLLECTIBLES.length;

  return <Shell surface="parent">
    <DashboardHeader title={`${child.nickname} 嘅 MEE 小鎮`} />

    {error && <div className="payment-result failed" role="alert"><div><strong>提示</strong><p>{error}</p></div></div>}

    <p className="kid-section-note">
      把手機交俾 {child.nickname}，用方向鍵或者下面嘅掣左右行。行埋去獎勵位置就會執到 MEE 卡，
      執到嘅卡會即刻儲落佢張自我介紹卡度。
    </p>

    <PixelWorldGame
      pickups={pickups}
      collectedIds={collected}
      backdrop="/assets/town-morning.webp"
      midground="/assets/harbor-market.webp"
      avatar={card.avatarUrl ?? "/assets/hero-3-5.webp"}
      onCollect={code => void handleCollect(code)}
    />

    {allFound && <div className="pixel-complete" role="status">
      <Trophy />
      <h2>{COLLECTIBLES.length} 張卡全部搵齊！</h2>
      <p>全部已經儲落 {child.nickname} 張自我介紹卡度。</p>
      <Link className="button" to={`/kid/${card.slug}`}>睇下張卡</Link>
    </div>}

    <section className="theme-release-list">
      <h2>任務</h2>
      {openTasks.length === 0
        ? <EmptyState title="任務全部完成" detail="做得好！之後會有新任務。" />
        : <ol className="theme-slots">{openTasks.map(task => <li className="theme-slot" key={task.id}>
            <div className="theme-slot-heading">
              <strong>{task.title}</strong>
              <StatusPill tone="gold">未完成</StatusPill>
            </div>
            <p className="theme-slot-note">{task.detail}</p>
            <button className="button small" onClick={() => void handleTaskDone(task.id)}>
              <Check size={15} />完成咗
            </button>
          </li>)}</ol>}

      {tasks.some(task => task.done) && <p className="kid-section-note">
        <Sparkles size={13} />
        已完成 {tasks.filter(task => task.done).length} / {tasks.length} 個任務。
      </p>}
    </section>
  </Shell>;
}

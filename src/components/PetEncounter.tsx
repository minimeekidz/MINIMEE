import { useCallback, useEffect, useState } from "react";
import type { TownPet } from "../lib/characters";
import {
  actionsAt, levelProgress, nextUnlock, PET_ACTIONS, pickReply,
  type PetAction,
} from "../lib/petFriends";
import {
  awardQuizPoints, doPetAction, givePetCard, petQuizFor,
  type PetGiftCard, type PetQuiz,
} from "../lib/petStore";

// Walking up to a pet and talking to it. Two things happen here: the small
// daily courtesies that nudge 好感度 along, and the one word question a day
// that is worth far more than any of them — so friendship follows what the
// child has actually learnt rather than how many times they tapped 打招呼.
//
// A wrong answer is never a dead end. The pet shows the right word and the
// child still earns something, because a five-year-old who loses points for
// guessing simply stops guessing.

export interface PetEncounterProps {
  pet: TownPet;
  cardId: string | null;
  points: number;
  /** Keyed `${petId}:${actionId}` — how many goes are already used today. */
  usedToday: Record<string, number>;
  onClose: () => void;
  onChanged: () => void;
}

export function PetEncounter({ pet, cardId, points, usedToday, onClose, onChanged }: PetEncounterProps) {
  const [total, setTotal] = useState(points);
  const [bubble, setBubble] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [quiz, setQuiz] = useState<PetQuiz | null>(null);
  const [quizState, setQuizState] = useState<"asking" | "wrong" | "done" | "none">("none");
  const [gift, setGift] = useState<PetGiftCard | null>(null);
  const [levelUp, setLevelUp] = useState<string | null>(null);

  const progress = levelProgress(total);
  const available = actionsAt(progress.level.level);
  const upcoming = nextUnlock(progress.level.level);

  useEffect(() => { setTotal(points); }, [points]);

  // Today's question, if this child has learnt anything to be asked about.
  useEffect(() => {
    if (!cardId) return;
    if ((usedToday[`${pet.id}:quiz`] ?? 0) > 0) return;
    void (async () => {
      const next = await petQuizFor(cardId);
      if (next) { setQuiz(next); setQuizState("asking"); }
    })();
  }, [cardId, pet.id, usedToday]);

  // Levelling is derived from the total rather than tracked separately, so it
  // cannot drift out of step with the points that caused it.
  const applyTotal = useCallback((next: number) => {
    const before = levelProgress(total).level.level;
    const after = levelProgress(next).level.level;
    setTotal(next);
    if (after > before) setLevelUp(levelProgress(next).level.title);
    onChanged();
  }, [total, onChanged]);

  async function run(action: PetAction) {
    if (busy) return;
    // The public demo has no card to save against. Rather than showing a
    // panel of dead buttons, it plays for real and keeps nothing — a parent
    // deciding whether to sign up should get to feel this, not read about it.
    if (!cardId) {
      setBubble(pickReply(action));
      applyTotal(total + action.points);
      return;
    }
    const used = usedToday[`${pet.id}:${action.id}`] ?? 0;
    // Already counted today. The pet still answers, and still says something
    // different — a friend does not stop talking to you because you have run
    // out of points. Only the number stops moving.
    if (used >= action.perDay) { setBubble(pickReply(action)); return; }
    setBusy(true);
    const next = await doPetAction(cardId, pet.id, action.id, used + 1);
    setBusy(false);
    setBubble(pickReply(action));
    // A null total means the database refused the repeat — the cap held on a
    // request the UI thought was still free. Nothing to report to the child.
    if (next !== null) applyTotal(next);

    // The two card actions are the reward at the top of the ladder.
    if (action.id === "card-normal" || action.id === "card-flash") {
      const given = await givePetCard(cardId, pet.id, action.id === "card-flash" ? "flash" : "normal");
      if (given) setGift(given);
      else setBubble("我張卡唔見咗……等我搵返先！");
    }
  }

  async function answer(choice: string) {
    if (!cardId || !quiz || busy) return;
    if (choice !== quiz.answer) {
      // Show the answer rather than just marking it wrong: the pet is a
      // friend helping, not a marker.
      setQuizState("wrong");
      setBubble(`係「${quiz.answer}」呀！記住咗未？`);
      return;
    }
    setBusy(true);
    const next = await awardQuizPoints(cardId, pet.id, quizState === "wrong");
    setBusy(false);
    setQuizState("done");
    setBubble(quizState === "wrong" ? "啱喇！下次一次過答啱佢！" : "叻仔／叻女！完全啱！");
    if (next !== null) applyTotal(next);
  }

  return <div className="pet-sheet" role="dialog" aria-label={`同${pet.nameZh}傾計`}>
    <button className="pet-sheet-close" onClick={onClose} aria-label="收埋">✕</button>

    <div className="pet-sheet-head">
      <img className="pet-sheet-art" src={pet.art} alt="" />
      <div>
        <strong>{pet.nameZh}</strong>
        <span className="pet-level">Lv.{progress.level.level} · {progress.level.title}</span>
        <div className="pet-meter"><span style={{ width: `${progress.fraction * 100}%` }} /></div>
        <small>
          {progress.next
            ? `仲爭 ${progress.toGo} 點升到「${progress.next.title}」`
            : "已經係最好嘅朋友喇 💖"}
        </small>
      </div>
    </div>

    {bubble && <p className="pet-bubble-line">{bubble}</p>}

    {levelUp && <div className="pet-levelup" role="status">
      🎉 好感度升咗！而家係「{levelUp}」
      {upcoming && <small>解鎖咗：{upcoming.icon} {upcoming.label}</small>}
      <button className="button small secondary" onClick={() => setLevelUp(null)}>知道喇</button>
    </div>}

    {gift && <div className="pet-gift" role="status">
      <img src={gift.art} alt="" />
      <div>
        <strong>{pet.nameZh} 送咗張卡俾你！</strong>
        <span>{gift.code}{gift.rarity === "flash" ? " ✨ 閃耀版" : ""}</span>
        <small>重複嘅可以送俾好友冊入面嘅朋友。</small>
      </div>
      <button className="button small secondary" onClick={() => setGift(null)}>收好</button>
    </div>}

    {quiz && quizState !== "done" && <section className="pet-quiz">
      <p className="pet-quiz-ask">
        {quiz.sticker
          ? <><img src={quiz.sticker} alt="" /> ＝ ？</>
          : <>「{quiz.answer.slice(0, 1)}…」係咩嚟？</>}
      </p>
      <div className="pet-quiz-options">
        {quiz.options.map(option => (
          <button
            key={option}
            className={quizState === "wrong" && option === quiz.answer ? "pet-quiz-option right" : "pet-quiz-option"}
            onClick={() => void answer(option)}
            disabled={busy}
          >{option}</button>
        ))}
      </div>
      <small className="pet-quiz-note">答啱一次，好感度加好多。</small>
    </section>}

    <div className="pet-actions">
      {available.map(action => {
        const used = cardId ? (usedToday[`${pet.id}:${action.id}`] ?? 0) : 0;
        const spent = used >= action.perDay;
        return <button
          key={action.id}
          className={spent ? "pet-action spent" : "pet-action"}
          onClick={() => void run(action)}
          disabled={busy}
          title={spent ? "今日嘅好感度加咗喇，不過仲可以傾" : `+${action.points} 好感度`}
        >
          <span aria-hidden>{action.icon}</span>{action.label}
          {spent && <em aria-label="今日已經加過好感度">✓</em>}
        </button>;
      })}
    </div>

    {upcoming && <p className="pet-locked">
      🔒 再熟啲就可以：{PET_ACTIONS.filter(action => action.level === upcoming.level)
        .map(action => `${action.icon} ${action.label}`).join("、")}
    </p>}

    {!cardId && <p className="kid-note">呢個示範唔會記住進度。建立咗自我介紹卡先儲得到好感度。</p>}
  </div>;
}

import { useCallback, useEffect, useMemo, useState } from "react";
import type { TownPet } from "../lib/characters";
import {
  actionsAt, DAILY_QUIZ_SLOTS, levelProgress, nextUnlock, pickReply,
  QUIZ_TRIES, type PetAction,
} from "../lib/petFriends";
import { eventLines, headlineEvent } from "../lib/petEvents";
import {
  givePetCard, petQuizFor, recordQuiz, visitPet,
  type PetGiftCard, type PetQuiz,
} from "../lib/petStore";

// Walking up to a pet and talking to it.
//
// Scoring is deliberately almost invisible here: turning up at all is worth a
// point, once a day, whichever button the child happens to press. Pressing
// every button was homework — a child would work down the list to farm the
// number rather than doing what they felt like. Now the buttons are free and
// unlimited, and the only other point in a day comes from answering the word
// question, for the first two pets across the whole town.
//
// A wrong answer costs nothing. Two tries, then the pet gives the answer and
// says try again tomorrow — and the day's slot is not spent, so the child can
// go and find another friend.

export interface PetEncounterProps {
  pet: TownPet;
  cardId: string | null;
  points: number;
  /** Keyed `${petId}:${action}` — what has already happened today. */
  usedToday: Record<string, number>;
  /** The child's birthday as MM-DD, so a pet can wish them happy birthday. */
  childBirthday?: string | null;
  onClose: () => void;
  onChanged: () => void;
}

export function PetEncounter({
  pet, cardId, points, usedToday, childBirthday, onClose, onChanged,
}: PetEncounterProps) {
  const [total, setTotal] = useState(points);
  const [bubble, setBubble] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [quiz, setQuiz] = useState<PetQuiz | null>(null);
  const [tries, setTries] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [gift, setGift] = useState<PetGiftCard | null>(null);
  const [levelUp, setLevelUp] = useState<string | null>(null);
  const [slotsUsed, setSlotsUsed] = useState(0);

  const progress = levelProgress(total);
  const available = actionsAt(progress.level.level);
  const upcoming = nextUnlock(progress.level.level);

  const context = useMemo(() => ({ petId: pet.id, childBirthday }), [pet.id, childBirthday]);
  const extraLines = useMemo(() => eventLines(context), [context]);
  const headline = useMemo(() => headlineEvent(context), [context]);

  const visited = (usedToday[`${pet.id}:visit`] ?? 0) > 0;
  const askedAlready = (usedToday[`${pet.id}:quiz-asked`] ?? 0) > 0;

  useEffect(() => { setTotal(points); }, [points]);

  // Today's paid answers across every pet, so the panel can say how many of
  // the day's two chances are left.
  useEffect(() => {
    setSlotsUsed(Object.entries(usedToday)
      .filter(([key]) => key.endsWith(":quiz"))
      .reduce((sum, [, count]) => sum + count, 0));
  }, [usedToday]);

  // Today's question, unless this pet has already been asked.
  useEffect(() => {
    if (!cardId || askedAlready) return;
    void (async () => {
      const next = await petQuizFor(cardId);
      if (next) setQuiz(next);
    })();
  }, [cardId, askedAlready]);

  const applyTotal = useCallback((next: number) => {
    setTotal(current => {
      if (next > current
        && levelProgress(next).level.level > levelProgress(current).level.level) {
        setLevelUp(levelProgress(next).level.title);
      }
      return next;
    });
    onChanged();
  }, [onChanged]);

  async function run(action: PetAction) {
    if (busy) return;
    setBubble(pickReply(action, extraLines));

    // The public demo keeps nothing but still plays: a parent deciding
    // whether to sign up should get to feel this rather than read about it.
    if (!cardId) {
      if (!visited) applyTotal(total + 1);
      return;
    }

    // The point is for turning up, not for this particular button, so it is
    // claimed once and every later tap is simply a chat.
    if (!visited) {
      setBusy(true);
      const next = await visitPet(cardId, pet.id);
      setBusy(false);
      if (next !== null) applyTotal(next);
    }

    if (action.id === "card-normal" || action.id === "card-flash") {
      const given = await givePetCard(cardId, pet.id, action.id === "card-flash" ? "flash" : "normal");
      if (given) setGift(given);
      else setBubble("我張卡唔見咗……等我搵返先！");
    }
  }

  async function answer(choice: string) {
    if (!quiz || busy || quizDone) return;
    const correct = choice === quiz.answer;
    const attempt = tries + 1;

    if (!correct && attempt < QUIZ_TRIES) {
      setTries(attempt);
      setBubble("唔係喎，再諗諗？");
      return;
    }

    setQuizDone(true);
    setTries(attempt);

    if (!cardId) {
      setBubble(correct ? "叻仔／叻女！完全啱！" : `係「${quiz.answer}」呀，下次加油！`);
      if (correct) applyTotal(total + 1);
      return;
    }

    setBusy(true);
    const result = await recordQuiz(cardId, pet.id, correct);
    setBusy(false);
    if (!result) { setBubble("我諗唔起…遲啲再問你啦。"); return; }

    setSlotsUsed(result.slotsUsed);
    applyTotal(result.total);

    if (!correct) {
      // Warm, and it says the chance is still there — otherwise a child who
      // got it wrong assumes they have blown the day and stops.
      setBubble(`係「${quiz.answer}」呀！下次加油，你今日仲有機會㗎～`);
    } else if (result.awarded) {
      setBubble("叻仔／叻女！完全啱！");
    } else {
      setBubble("完全啱！不過我今日已經俾夠分喇，聽日再嚟啦～");
    }
  }

  const slotsLeft = Math.max(0, DAILY_QUIZ_SLOTS - slotsUsed);

  return <div className="pet-sheet" role="dialog" aria-label={`同${pet.nameZh}傾計`}>
    <button className="pet-sheet-close" onClick={onClose} aria-label="收埋">✕</button>

    <div className="pet-sheet-head">
      <img className="pet-sheet-art" src={pet.art} alt="" />
      <div>
        <strong>{pet.nameZh}</strong>
        {headline && <span className="pet-event">{headline.icon} {headline.label}</span>}
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
      {upcoming && <small>再熟啲就解鎖：{upcoming.icon} {upcoming.label}</small>}
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

    {quiz && !quizDone && <section className="pet-quiz">
      <p className="pet-quiz-ask">
        {quiz.sticker
          ? <><img src={quiz.sticker} alt="" /> ＝ ？</>
          : <>「{quiz.answer.slice(0, 1)}…」係咩嚟？</>}
      </p>
      <div className="pet-quiz-options">
        {quiz.options.map(option => (
          <button key={option} className="pet-quiz-option"
            onClick={() => void answer(option)} disabled={busy}>{option}</button>
        ))}
      </div>
      <small className="pet-quiz-note">
        {slotsLeft > 0
          ? `答啱加 1 點 · 今日仲有 ${slotsLeft} 隻小寵物加得到分`
          : "今日兩次加分用晒喇，不過仲可以答住玩"}
      </small>
    </section>}

    <div className="pet-actions">
      {available.map(action => (
        <button key={action.id} className="pet-action"
          onClick={() => void run(action)} disabled={busy}>
          <span aria-hidden>{action.icon}</span>{action.label}
        </button>
      ))}
    </div>

    <p className="pet-locked">
      {visited ? "今日嘅好感度加咗喇 —— 但傾幾多都得，唔會扣㗎。" : "同佢傾一句就加 1 點好感度。"}
      {upcoming && <> · 🔒 Lv.{upcoming.level} 解鎖 {upcoming.icon} {upcoming.label}</>}
    </p>

    {!cardId && <p className="kid-note">呢個示範唔會記住進度。建立咗自我介紹卡先儲得到好感度。</p>}
  </div>;
}

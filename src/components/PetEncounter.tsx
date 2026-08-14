import { useCallback, useEffect, useMemo, useState } from "react";
import type { TownPet } from "../lib/characters";
import {
  actionsAt, DAILY_QUIZ_SLOTS, levelProgress, MAX_LEVEL, nextUnlock, pickLine,
  QUIZ_TRIES, type PetAction,
} from "../lib/petFriends";
import { profileFor, quizLine } from "../lib/petBible";
import { actionVo } from "../data/petActionVo";
import { eventLines, headlineEvent } from "../lib/petEvents";
import {
  givePetCard, petQuizFor, recordQuiz, visitPet,
  type PetGiftCard, type PetQuiz,
} from "../lib/petStore";

// Walking up to a pet and talking to it.
//
// The answer machine follows sheet 07_答題VO與狀態 exactly, including the rule
// the spec is most emphatic about: **a wrong first answer must not reveal the
// answer or highlight the right option.** One real retry, then the pet
// encourages and the day's question ends for that pet — without spending a
// bonus slot, so the child can go and find another friend.
//
// Every line comes from the workbook where the workbook has one. The rest
// come from src/data/petActionVo.ts, written per pet against their 性格 /
// 語氣 / 口頭禪. Nothing is composed here.

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

type QuizPhase = "asking" | "retry" | "done";

export function PetEncounter({
  pet, cardId, points, usedToday, childBirthday, onClose, onChanged,
}: PetEncounterProps) {
  const [total, setTotal] = useState(points);
  const [bubble, setBubble] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [quiz, setQuiz] = useState<PetQuiz | null>(null);
  const [phase, setPhase] = useState<QuizPhase>("asking");
  const [tries, setTries] = useState(0);
  const [gift, setGift] = useState<PetGiftCard | null>(null);
  const [levelUp, setLevelUp] = useState<string | null>(null);
  const [slotsUsed, setSlotsUsed] = useState(0);

  const profile = profileFor(pet.id);
  const progress = levelProgress(total);
  const available = actionsAt(progress.level.level);
  const upcoming = nextUnlock(progress.level.level);

  const context = useMemo(() => ({ petId: pet.id, childBirthday }), [pet.id, childBirthday]);
  const occasionLines = useMemo(() => eventLines(context), [context]);
  const headline = useMemo(() => headlineEvent(context), [context]);

  const visited = (usedToday[`${pet.id}:visit`] ?? 0) > 0;
  const askedAlready = (usedToday[`${pet.id}:quiz-asked`] ?? 0) > 0;

  useEffect(() => { setTotal(points); }, [points]);

  useEffect(() => {
    setSlotsUsed(Object.entries(usedToday)
      .filter(([key]) => key.endsWith(":quiz"))
      .reduce((sum, [, count]) => sum + count, 0));
  }, [usedToday]);

  // Today's question. Only topics the child has fully mastered are eligible —
  // petQuizFor enforces that.
  useEffect(() => {
    if (!cardId || askedAlready) return;
    void (async () => {
      const next = await petQuizFor(cardId);
      if (!next) return;
      setQuiz(next);
      const line = quizLine(pet.id, "asking");
      if (line) setBubble(line.vo.replace("{主題}", next.topic || "呢個主題"));
    })();
  }, [cardId, askedAlready, pet.id]);

  /** Milestone card gifts: MR02 at Lv.6, MR05 at Lv.11 (sheet 03_神秘獎勵). */
  const claimMilestone = useCallback(async (level: number) => {
    if (!cardId) return;
    const rarity = level >= 11 ? "flash" : level >= 6 ? "normal" : null;
    if (!rarity) return;
    const given = await givePetCard(cardId, pet.id, rarity);
    if (given) setGift(given);
  }, [cardId, pet.id]);

  const applyTotal = useCallback((next: number) => {
    setTotal(current => {
      const before = levelProgress(current).level;
      const after = levelProgress(next).level;
      if (next > current && after.level > before.level) {
        setLevelUp(after.title);
        // Only on first reaching 6 or 11, which is what makes it 一次性固定.
        if (after.level === 6 || after.level === 11) void claimMilestone(after.level);
      }
      return next;
    });
    onChanged();
  }, [onChanged, claimMilestone]);

  async function run(action: PetAction) {
    if (busy) return;
    // The pet's own line for this action, then whatever today makes different.
    setBubble(pickLine([...actionVo(pet.id, action.id), ...occasionLines])
      || profile?.catchphrase || "…");

    if (!cardId) {
      if (!visited) applyTotal(total + 1);
      return;
    }
    // The point is for turning up, not for this button. Every later tap still
    // has its own VO and adds nothing.
    if (visited) return;
    setBusy(true);
    const next = await visitPet(cardId, pet.id);
    setBusy(false);
    if (next !== null) applyTotal(next);
  }

  async function answer(choice: string) {
    if (!quiz || busy || phase === "done") return;
    const correct = choice === quiz.answer;
    const attempt = tries + 1;

    // First wrong: one real retry, and the answer stays hidden. The spec calls
    // this out specifically — showing it makes the second try meaningless.
    if (!correct && attempt < QUIZ_TRIES) {
      setTries(attempt);
      setPhase("retry");
      setBubble(quizLine(pet.id, "firstWrong")?.vo ?? "再諗多次啦。");
      return;
    }

    setTries(attempt);
    setPhase("done");

    if (!cardId) {
      const demoState = correct && attempt === 1 ? "firstCorrect"
        : correct ? "secondCorrect" : "secondWrong";
      setBubble(quizLine(pet.id, demoState)?.vo ?? "");
      if (correct) applyTotal(total + 1);
      return;
    }

    setBusy(true);
    const result = await recordQuiz(cardId, pet.id, correct, {
      attempts: attempt, word: quiz.answer,
      lessonId: quiz.lessonId, roomId: quiz.roomId,
    });
    setBusy(false);
    if (!result) { setBubble("我諗唔起…遲啲再問你啦。"); return; }

    setSlotsUsed(result.slotsUsed);
    applyTotal(result.total);

    const state = !correct ? "secondWrong"
      : !result.awarded ? "correctNoBonus"
      : attempt === 1 ? "firstCorrect" : "secondCorrect";
    setBubble(quizLine(pet.id, state)?.vo ?? "");
  }

  const slotsLeft = Math.max(0, DAILY_QUIZ_SLOTS - slotsUsed);
  const maxed = progress.level.level >= MAX_LEVEL;

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
          {maxed
            ? "已經係最好朋友喇 💖"
            : `仲爭 ${progress.toGo} 點升到「${progress.next?.title}」`}
        </small>
      </div>
    </div>

    {bubble && <p className="pet-bubble-line">{bubble}</p>}

    {levelUp && <div className="pet-levelup" role="status">
      🎉 好感度升咗！而家係「{levelUp}」
      {upcoming && <small>Lv.{upcoming.level} 解鎖：{upcoming.icon} {upcoming.label}</small>}
      <button className="button small secondary" onClick={() => setLevelUp(null)}>知道喇</button>
    </div>}

    {gift && <div className="pet-gift" role="status">
      <img src={gift.art} alt="" />
      <div>
        <strong>{pet.nameZh} 送咗張紀念卡俾你！</strong>
        <span>{gift.code}{gift.rarity === "flash" ? " ✨ 閃耀版" : ""}</span>
        <small>重複嘅可以送俾好友冊入面嘅朋友。</small>
      </div>
      <button className="button small secondary" onClick={() => setGift(null)}>收好</button>
    </div>}

    {quiz && phase !== "done" && <section className="pet-quiz">
      <p className="pet-quiz-ask">
        {quiz.sticker
          ? <><img src={quiz.sticker} alt="" /> ＝ ？</>
          : <>邊個詞語呀？</>}
      </p>
      <div className="pet-quiz-options">
        {/* No option is ever marked as the answer here — the spec forbids
            revealing it after the first wrong try. */}
        {quiz.options.map(option => (
          <button key={option} className="pet-quiz-option"
            onClick={() => void answer(option)} disabled={busy}>{option}</button>
        ))}
      </div>
      <small className="pet-quiz-note">
        {phase === "retry"
          ? "仲有一次機會，慢慢諗。"
          : slotsLeft > 0
            ? `答啱加 1 點 · 今日仲有 ${slotsLeft} 次加分機會`
            : "今日兩次加分用晒喇，不過答啱一樣會記低成績"}
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

// MINIMEE v2 core object: a child's self-introduction card — the kid
// equivalent of an adult's commercial e-name card. A parent fills this in
// once, and it becomes the child's shareable page: who they are, what they
// like, their intro video, their MEE card collection, and (when switched
// on) the lost-item contact channel.
//
// v1's two-video-per-theme production pipeline is deliberately gone. A card
// has at most ONE video — the self-introduction — so there is a single
// thing to generate, retry and show.

export type AgeGroup = "3-5" | "6-8" | "9-12" | "13+";
export type CardRarity = "normal" | "flash";

export interface MeeCard {
  id: string;
  /** Display number on the card face, e.g. "MEE-014". */
  code: string;
  name: string;
  rarity: CardRarity;
  art: string;
  /** The task that earned it, shown on the back of the card. */
  earnedFor: string;
  earnedAt: string | null;
}

export interface KidTask {
  id: string;
  title: string;
  detail: string;
  /** Which MEE card this task pays out when completed. */
  rewardCardId: string;
  done: boolean;
}

export interface KidCard {
  id: string;
  /** URL segment: /kid/:slug */
  slug: string;
  nickname: string;
  ageGroup: AgeGroup;
  /** One-line self-introduction, in the child's own words. */
  tagline: string;
  about: string;
  likes: string[];
  dreamJob: string;
  avatar: string;
  scene: string;
  /** Self-introduction video; null until it has been generated. */
  introVideoUrl: string | null;
  introVideoPoster: string | null;
  cards: MeeCard[];
  tasks: KidTask[];
  /** Lost mode: when on, a finder can reach the parent through /lost/:token. */
  lostMode: { enabled: boolean; token: string; message: string } | null;
  isExample: boolean;
}

// Two worked examples shipped with the product. They exist so a parent
// landing on the marketing site immediately sees what the thing IS —
// "呢個係小朋友嘅自我介紹卡" — instead of an abstract feature list. They are
// clearly marked as examples so nobody mistakes them for a real child.
export const EXAMPLE_CARDS: KidCard[] = [
  {
    id: "example-mimi",
    slug: "mimi",
    nickname: "Mimi",
    ageGroup: "6-8",
    tagline: "我叫Mimi，我最鍾意畫海底世界！",
    about: "我今年7歲，讀小二。我有一隻叫「泡泡」嘅寵物水母，佢住喺我嘅MEE小屋。我識畫好多種魚，最叻畫水母同海龜。",
    likes: ["畫畫", "海洋動物", "砌積木", "跳舞"],
    dreamJob: "海洋生物學家",
    avatar: "/assets/hero-girl.webp",
    scene: "/assets/album-ocean.webp",
    introVideoUrl: null,
    introVideoPoster: "/assets/album-ocean.webp",
    cards: [
      { id: "c1", code: "MEE-014", name: "海龜朋友", rarity: "flash", art: "/assets/card-11.webp", earnedFor: "完成「認識海洋動物」任務", earnedAt: "2026-07-20T00:00:00Z" },
      { id: "c2", code: "MEE-007", name: "小水母泡泡", rarity: "normal", art: "/assets/card-05.webp", earnedFor: "連續7日完成每日任務", earnedAt: "2026-07-14T00:00:00Z" },
      { id: "c3", code: "MEE-002", name: "珊瑚花園", rarity: "normal", art: "/assets/card-01.webp", earnedFor: "第一次完成自我介紹", earnedAt: "2026-07-02T00:00:00Z" },
    ],
    tasks: [
      { id: "t1", title: "介紹你最鍾意嘅動物", detail: "同鏡頭講30秒，講下點解鍾意佢。", rewardCardId: "c4", done: false },
      { id: "t2", title: "畫一幅海底世界", detail: "畫完影相上載，就可以解鎖新卡。", rewardCardId: "c5", done: false },
    ],
    lostMode: { enabled: true, token: "example-token-mimi", message: "如果你揀到呢張卡，唔該聯絡我媽咪，多謝你！" },
    isExample: true,
  },
  {
    id: "example-ryan",
    slug: "ryan",
    nickname: "Ryan",
    ageGroup: "9-12",
    tagline: "我係Ryan，我想做太空人！",
    about: "我10歲，我識砌火箭模型，亦識少少編程。我喺學校參加咗科學隊，我哋做過水火箭比賽，我隊拎咗第二名。",
    likes: ["太空", "編程", "踩單車", "睇科學書"],
    dreamJob: "太空人",
    avatar: "/assets/hero-boy.webp",
    scene: "/assets/town-night.webp",
    introVideoUrl: null,
    introVideoPoster: "/assets/town-night.webp",
    cards: [
      { id: "c6", code: "MEE-021", name: "夜空火箭", rarity: "flash", art: "/assets/card-09.webp", earnedFor: "完成「太空探索」主題", earnedAt: "2026-07-25T00:00:00Z" },
      { id: "c7", code: "MEE-011", name: "小小工程師", rarity: "normal", art: "/assets/card-01.webp", earnedFor: "完成5個動手任務", earnedAt: "2026-07-11T00:00:00Z" },
    ],
    tasks: [
      { id: "t3", title: "講一個你識嘅科學小知識", detail: "錄一段短片，話俾朋友聽。", rewardCardId: "c8", done: false },
    ],
    lostMode: null,
    isExample: true,
  },
];

export function findExampleCard(slug: string) {
  return EXAMPLE_CARDS.find(card => card.slug === slug) ?? null;
}

export function collectedCount(card: KidCard) {
  return card.cards.length;
}

export function openTasks(card: KidCard) {
  return card.tasks.filter(task => !task.done);
}

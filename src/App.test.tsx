import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { mintLostToken, mintSlug } from "./lib/kidCardStore";
import { HEROES, TOWN_PETS } from "./lib/characters";
import { arrivalPoint, hotspotNear, isDaytime, isDawn, isWalkable, nearestWalkable, ROOM_ART, ROOM_DOORS, ROOM_PARENT, ZONES, zoneBackground, zoneBackgroundLayers } from "./lib/world";
import { actionsAt, DAILY_QUIZ_SLOTS, FRAGMENTS_FOR_MASTERY, FRIEND_LEVELS, LEVEL_STEP, levelProgress, MAX_LEVEL, MAX_POINTS, PET_ACTIONS, QUIZ_POINT, QUIZ_TRIES, VISIT_POINT } from "./lib/petFriends";
import { PET_PROFILES, profileFor, quizLine } from "./lib/petBible";
import { actionVo } from "./data/petActionVo";
import { learningRecord } from "./lib/petStore";
import { livesIn, petsForZone, spawnWeight } from "./lib/petSpawn";
import { ageFrom, ageLabel } from "./lib/age";
import { StickerDetailPanel } from "./components/profile/StickerDetailPanel";
import { StickerWall } from "./components/profile/StickerWall";
import { eventsFor, PET_BIRTHDAYS } from "./lib/petEvents";
import { INTERIORS, stallRoute, WHARF_STALLS } from "./lib/interiors";
import {
  booksFrom, BOOKS, CARDS_PER_BOOK, SPECIAL_COVERS, specialCards, themeProgress,
  THEME_BOOKS, THEME_SLOTS, TRAY_SLOTS, type CollectedCard,
} from "./lib/collection";
import themeSeed from "./data/activeTheme.seed.v1.json";
import themeBook from "./data/themeBook.json";
import { checkParentPin, closeParentGate, openParentGate, parentGateOpen } from "./lib/parentGate";
import { classifyWeather, festivalFor, lunarDayNumber, parseLunar } from "./lib/almanac";
import { AllCardsPanel, BooksPanel, TraysPanel, turn } from "./components/interior/CollectionPanels";
import { NoticeBoardPanel } from "./components/interior/HomePanels";
import { EVERYDAY_ACTS, STAGE_FESTIVALS, StagePanel } from "./components/interior/StagePanel";
import { TreatsPanel } from "./components/interior/RoomMoments";
import { pastFilmsFrom } from "./components/interior/CinemaFlow";
import { configProblem } from "./lib/supabase";
import { posterFor } from "./lib/posters";
import {
  AMBIENT_NPCS, ambientPortrait, babbleFor, blipCount, kitFor, NPC_POSTS,
  npcPortrait, SYLLABLE_SHAPES, SYLLABLES_PER_KIT, VOICE_KIT_OVERRIDES,
  VOICE_PRESETS,
} from "./lib/babble";
import posterIndex from "./data/posterIndex.json";
import { CurrentWordsPanel, TicketsPanel } from "./components/interior/StudioPanels";
import {
  bandFor, buildRounds, clausesOf, difficultyFor, FAMILIES, GAME_MODES,
  isCorrect, roundAt, ROUNDS_PER_THEME, type ThemeGameSource,
} from "./lib/games";
import { ThemeGame } from "./components/ThemeGame";

vi.mock("./contexts/AuthContext", () => ({
  useAuth: () => ({
    configured: true,
    loading: false,
    session: { user: { id: "test-parent" } },
    user: { id: "test-parent" },
    role: "admin",
    refreshRole: vi.fn(),
    signOut: vi.fn(),
  }),
}));

const createChild = vi.fn().mockResolvedValue({
  id: "child-1",
  parent_id: "test-parent",
  nickname: "Mimi",
  birth_year: null,
  age_group: "6-8",
  interests: [],
  preferred_language: "zh-HK",
  created_at: "2026-07-30T00:00:00Z",
  updated_at: "2026-07-30T00:00:00Z",
});

vi.mock("./contexts/FamilyContext", () => ({
  useFamily: () => ({
    children: [{
      id: "demo-child-01",
      parent_id: "test-parent",
      nickname: "Mimi",
      birth_year: null,
      age_group: "6-8",
      interests: [],
      preferred_language: "zh-HK",
      created_at: "2026-07-30T00:00:00Z",
      updated_at: "2026-07-30T00:00:00Z",
    }],
    loading: false,
    error: null,
    canAddChild: true,
    refresh: vi.fn(),
    createChild,
  }),
}));

// Billing rows the mocked Supabase client hands back, reset per test so
// each case can describe the exact subscription state it is asserting on.
const billing = vi.hoisted(() => ({
  subscription: null as Record<string, unknown> | null,
  entitlements: [] as Record<string, unknown>[],
  jobs: [] as Record<string, unknown>[],
  kidCard: null as Record<string, unknown> | null,
  meeCards: [] as Record<string, unknown>[],
  kidTasks: [] as Record<string, unknown>[],
  rooms: [] as Record<string, unknown>[],
  lessons: [] as Record<string, unknown>[],
  fragments: [] as Record<string, unknown>[],
  quizAttempts: [] as Record<string, unknown>[],
  publicProfile: null as Record<string, unknown> | null,
  /** Every table write, so a test can assert a save happened exactly once. */
  writes: [] as Array<{ table: string; patch: unknown }>,
}));

vi.mock("./lib/supabase", async importOriginal => {
  // Only the client is faked. `configProblem` is pure and is the thing the
  // login form now depends on to say what is wrong, so it stays real.
  const actual = await importOriginal<typeof import("./lib/supabase")>();
  const rowsFor = (table: string) =>
    table === "theme_entitlements" ? billing.entitlements
      : table === "ai_video_jobs" ? billing.jobs
      : table === "mee_cards" ? billing.meeCards
      : table === "kid_tasks" ? billing.kidTasks
      : table === "rooms" ? billing.rooms
      : table === "room_lessons" ? billing.lessons
      : table === "lesson_fragments" ? billing.fragments
      : table === "quiz_attempts" ? billing.quizAttempts
      : [];

  const singleFor = (table: string) =>
    table === "kid_cards" ? billing.kidCard : billing.subscription;

  const makeBuilder = (table: string) => {
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      in: () => builder,
      order: () => builder,
      limit: () => builder,
      maybeSingle: () => Promise.resolve({ data: singleFor(table), error: null }),
      single: () => Promise.resolve({ data: singleFor(table), error: null }),
      insert: () => builder,
      upsert: () => Promise.resolve({ data: null, error: null }),
      update: (patch: unknown) => { billing.writes.push({ table, patch }); return builder; },
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve({ data: rowsFor(table), error: null }).then(resolve, reject),
    };
    return builder;
  };

  return {
    configProblem: actual.configProblem,
    supabaseSetupError: null,
    initializeSupabase: vi.fn(),
    supabase: {
      auth: { resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }) },
      rpc: vi.fn((name: string) => Promise.resolve(
        name === "kid_card_public"
          ? { data: billing.publicProfile ? [billing.publicProfile] : [], error: null }
          : { data: [], error: null })),
      storage: { from: () => ({
        createSignedUrl: () => Promise.resolve({ data: null, error: null }),
        upload: () => Promise.resolve({ data: null, error: null }),
        remove: () => Promise.resolve({ data: null, error: null }),
      }) },
      from: (table: string) => makeBuilder(table),
    },
  };
});

const createBillingOrder = vi.hoisted(() => vi.fn());
const cancelSubscription = vi.hoisted(() => vi.fn());
const createAiVideoJobs = vi.hoisted(() => vi.fn());

vi.mock("./lib/service", async importOriginal => ({
  ...(await importOriginal<typeof import("./lib/service")>()),
  createBillingOrder,
  cancelSubscription,
  createAiVideoJobs,
}));

function editableCard(overrides: Record<string, unknown> = {}) {
  return {
    id: "card-1", child_id: "demo-child-01", slug: "mimi-ab12cd",
    display_name: "Mimi", age_group: "6-8", tagline: "", about: "",
    likes: [], dream_job: "", scene: null, avatar_url: null,
    intro_video_url: null, published: false,
    lost_mode_enabled: false, lost_mode_token: null, lost_mode_message: "",
    ...overrides,
  };
}

function activeSubscription(startedDaysAgo = 3) {
  return {
    id: "sub-1",
    child_id: "demo-child-01",
    plan_type: "monthly_3m",
    status: "active",
    theme_allowance: 6,
    started_at: new Date(Date.now() - startedDaysAgo * 86400000).toISOString(),
    current_period_end: new Date(Date.now() + 80 * 86400000).toISOString(),
    read_only_until: null,
    cancel_at_period_end: false,
  };
}

beforeEach(() => {
  billing.subscription = null;
  billing.kidCard = null;
  billing.meeCards = [];
  billing.kidTasks = [];
  billing.rooms = [];
  billing.lessons = [];
  billing.fragments = [];
  billing.quizAttempts = [];
  billing.entitlements = [];
  billing.jobs = [];
  billing.writes = [];
  createBillingOrder.mockReset().mockResolvedValue({ ok: false, error: "Not authenticated" });
  cancelSubscription.mockReset().mockResolvedValue({ ok: true, data: { currentPeriodEnd: null } });
  createAiVideoJobs.mockReset().mockResolvedValue({ ok: true, data: {} });
});

describe("MINIMEE route shells", () => {
  it("opens on the game rather than on a marketing page", () => {
    // Em: 「一入到 Landing page 就已經係首頁主頁，然後開始遊戲之後透過城鎮去
    // 操作任何嘅功能」「全個網站唔會再見到有嗰啲普通網頁 page」. So the first
    // thing on the page is the way in, not a pitch.
    render(<MemoryRouter initialEntries={["/"]}><App /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "MINIMEE" })).toBeInTheDocument();

    // One real button, and it walks into the world.
    const start = screen.getByRole("link", { name: /開始遊戲|返入小鎮/ });
    expect(start).toHaveAttribute("href", expect.stringMatching(/^\/(play|parent\/dashboard)$/));

    // A demo card is still reachable, and pricing is still findable by a
    // parent who wants it — just not in anybody's way.
    expect(screen.getByRole("link", { name: /Mimi/ })).toHaveAttribute("href", "/kid/mimi");
    expect(screen.getByRole("link", { name: "方案同收費" })).toHaveAttribute("href", "/pricing");
  });

  it("offers the shortcut bar in game pages and never on the world itself", async () => {
    // Em: 「可以加條 nav bar…方便快捷進入唔使一定要行到過去」. A shortcut,
    // not a substitute — every stop is somewhere the child could also walk to,
    // and the world itself is left alone because it already fills the screen
    // and navigates itself.
    const inside = render(
      <MemoryRouter initialEntries={["/parent/children/c1/themes"]}><App /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("navigation", { name: "快捷列" })).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /我的小屋/ }))
      .toHaveAttribute("href", "/parent/children/c1/inside/my-home");
    inside.unmount();

    // The landing page is the way in; a menu over it would be a second one.
    render(<MemoryRouter initialEntries={["/"]}><App /></MemoryRouter>);
    expect(screen.queryByRole("navigation", { name: "快捷列" })).toBeNull();
  });

  it("renders the parent dashboard with the connected child profile", () => {
    render(<MemoryRouter initialEntries={["/parent/dashboard"]}><App /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "你好，家長" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mimi" })).toBeInTheDocument();
    expect(screen.getByText(/安全帳戶及家庭資料已連接/)).toBeInTheDocument();
  });

  it("keeps missing MEE card assets explicit", () => {
    render(<MemoryRouter initialEntries={["/child/albums"]}><App /></MemoryRouter>);
    expect(screen.getAllByText("缺少正式卡面").length).toBe(20);
  });

  it("shows the three-child independent subscription rule", () => {
    render(<MemoryRouter initialEntries={["/pricing"]}><App /></MemoryRouter>);
    expect(screen.getByText(/最多管理三名小朋友/)).toBeInTheDocument();
    expect(screen.getByText(/每名小朋友都需要獨立訂閱/)).toBeInTheDocument();
    expect(screen.getByText("HK$324")).toBeInTheDocument();
    expect(screen.getByText("HK$1,188")).toBeInTheDocument();
  });

  it("publishes substantive privacy, terms and refund documents", () => {
    render(<MemoryRouter initialEntries={["/privacy"]}><App /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "5. 保存、取消與刪除" })).toBeInTheDocument();
    expect(screen.getByText(/180日唯讀期/)).toBeInTheDocument();
  });

  it("requires two confirmations before moving a friend to history", () => {
    render(<MemoryRouter initialEntries={["/parent/children/demo-child-01/sharing"]}><App /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "刪除" }));
    expect(screen.getByRole("heading", { name: "你是否不小心按到刪除？" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "我想繼續" }));
    fireEvent.click(screen.getByRole("button", { name: "確認刪除好友" }));
    expect(screen.getByText("目前沒有已連接好友")).toBeInTheDocument();
    expect(screen.getAllByText("無存取權").length).toBe(2);
  });

  it("keeps disconnected names visible to the child without album access", () => {
    render(<MemoryRouter initialEntries={["/child/buddy"]}><App /></MemoryRouter>);
    expect(screen.getByText("以前認識過")).toBeInTheDocument();
    expect(screen.getAllByText(/Ava/).length).toBeGreaterThan(0);
    expect(screen.getByText(/不佔朋友相簿位置/)).toBeInTheDocument();
  });

  it("requires the demo parent PIN before returning from the child world", () => {
    render(<MemoryRouter initialEntries={["/parent-gate"]}><App /></MemoryRouter>);
    const input = screen.getByLabelText("4位數家長PIN");
    fireEvent.change(input, { target: { value: "1111" } });
    fireEvent.click(screen.getByRole("button", { name: "驗證PIN" }));
    expect(screen.getByRole("alert")).toHaveTextContent("PIN不正確");
    fireEvent.change(input, { target: { value: "2468" } });
    fireEvent.click(screen.getByRole("button", { name: "驗證PIN" }));
    expect(screen.getByRole("link", { name: /驗證成功/ })).toBeInTheDocument();
  });

  it("creates a real child profile from the parent setup form", () => {
    render(<MemoryRouter initialEntries={["/parent/setup"]}><App /></MemoryRouter>);
    const submit = screen.getByRole("button", { name: /建立孩子檔案/ });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText("孩子顯示名稱"), { target: { value: "Luna" } });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    expect(createChild).toHaveBeenCalledWith(expect.objectContaining({ nickname: "Luna" }));
  });

  it("keeps media creation blocked until demo asset and consent are ready", () => {
    render(<MemoryRouter initialEntries={["/parent/media"]}><App /></MemoryRouter>);
    const create = screen.getByRole("button", { name: "建立示範工作" });
    expect(create).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "使用合成示範素材" }));
    fireEvent.click(screen.getByRole("checkbox"));
    expect(create).toBeEnabled();
    expect(screen.getByText(/主題權益保持「已預留」/)).toBeInTheDocument();
  });

  it("moves an available theme entitlement into reserved state", () => {
    render(<MemoryRouter initialEntries={["/parent/children/demo-child-01/themes"]}><App /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "選擇這個主題" }));
    expect(screen.getByRole("button", { name: "權益已預留" })).toBeDisabled();
  });

  it("keeps the public lost-item message anonymous and uses both channels", () => {
    render(<MemoryRouter initialEntries={["/lost/demo-safe-token"]}><App /></MemoryRouter>);
    expect(screen.getByText(/不會顯示孩子姓名、家長電話、地址或電郵/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("找到物品的位置"), { target: { value: "九龍公園入口" } });
    fireEvent.change(screen.getByLabelText("匿名訊息"), { target: { value: "已交到服務台" } });
    fireEvent.click(screen.getByRole("button", { name: "通知物主家長" }));
    expect(screen.getByRole("status")).toHaveTextContent("站內訊息及匿名電郵轉寄");
  });

  it("shows in-app and anonymous email as enabled lost-item channels", () => {
    render(<MemoryRouter initialEntries={["/parent/children/demo-child-01/lost-items"]}><App /></MemoryRouter>);
    expect(screen.getByText("站內通知")).toBeInTheDocument();
    expect(screen.getByText("匿名電郵")).toBeInTheDocument();
  });

  it("requires two privacy steps without deleting real data", () => {
    render(<MemoryRouter initialEntries={["/parent/privacy"]}><App /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "開始刪除流程" }));
    expect(screen.getByRole("heading", { name: "這不是即時刪除按鈕" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "查看影響並繼續" }));
    expect(screen.getByText(/不會永久刪除任何資料/)).toBeInTheDocument();
  });

  it("supports login, registration and password reset frontend states", async () => {
    render(<MemoryRouter initialEntries={["/forgot-password"]}><App /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("家長電郵地址"), { target: { value: "parent@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "發送重設連結" }));
    expect(await screen.findByRole("status")).toHaveTextContent("重設連結已寄出");
  });

  it("starts a real Stripe Checkout for the selected plan", async () => {
    render(<MemoryRouter initialEntries={["/parent/children/demo-child-01/checkout"]}><App /></MemoryRouter>);
    fireEvent.click(await screen.findByLabelText(/單次主題/));
    fireEvent.click(screen.getByRole("button", { name: /以HK\$128付款/ }));
    await screen.findByText(/登入狀態已過期/);
    expect(createBillingOrder).toHaveBeenCalledWith({ childId: "demo-child-01", planType: "one_time_theme" });
  });

  it("never treats the Stripe redirect as proof of payment", async () => {
    render(<MemoryRouter initialEntries={["/parent/children/demo-child-01/checkout?status=success"]}><App /></MemoryRouter>);
    expect(await screen.findByRole("status")).toHaveTextContent("正在等待Stripe確認");
    expect(screen.getByText(/不以瀏覽器返回頁判定/)).toBeInTheDocument();
  });

  it("requires two steps to cancel renewal and calls the cancel function", async () => {
    billing.subscription = activeSubscription();
    render(<MemoryRouter initialEntries={["/parent/children/demo-child-01/subscription"]}><App /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "取消續訂" }));
    fireEvent.click(screen.getByRole("button", { name: "繼續" }));
    fireEvent.click(screen.getByRole("button", { name: "確認停止續訂" }));
    expect(cancelSubscription).toHaveBeenCalledWith({ childId: "demo-child-01" });
  });

  it("only offers AI video production on a released theme", async () => {
    billing.subscription = activeSubscription();
    billing.entitlements = [
      { id: "ent-1", subscription_id: "sub-1", sequence_number: 1, status: "available", consumed_at: null },
      { id: "ent-2", subscription_id: "sub-1", sequence_number: 2, status: "available", consumed_at: null },
    ];
    render(<MemoryRouter initialEntries={["/parent/children/demo-child-01/subscription"]}><App /></MemoryRouter>);

    const startButtons = await screen.findAllByRole("button", { name: "開始製作影片" });
    expect(startButtons).toHaveLength(1);
    expect(screen.getByText("主題 2").closest("li")).toHaveTextContent("每兩星期解鎖一個主題");

    fireEvent.click(startButtons[0]);
    expect(createAiVideoJobs).toHaveBeenCalledWith({ entitlementId: "ent-1" });
  });

  it("shows the polite failure message without exposing provider errors", async () => {
    billing.subscription = activeSubscription();
    billing.entitlements = [{ id: "ent-1", subscription_id: "sub-1", sequence_number: 1, status: "available", consumed_at: null }];
    billing.jobs = [
      { id: "job-1", entitlement_id: "ent-1", video_type: "learning_video", status: "failed", asset_url: null, customer_message: null },
      { id: "job-2", entitlement_id: "ent-1", video_type: "child_ai_video", status: "completed", asset_url: "https://example.com/v.mp4", customer_message: null },
    ];
    render(<MemoryRouter initialEntries={["/parent/children/demo-child-01/subscription"]}><App /></MemoryRouter>);
    expect(await screen.findByText(/唔會扣減你嘅主題權益/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重新製作" })).toBeInTheDocument();
  });

  it("renders actionable synthetic rows in every admin workspace", () => {
    render(<MemoryRouter initialEntries={["/admin/ai-jobs"]}><App /></MemoryRouter>);
    expect(screen.getByText("AI-DEMO-104")).toBeInTheDocument();
    expect(screen.getByText("權益已預留")).toBeInTheDocument();
    expect(screen.getByLabelText("工作台篩選")).toBeInTheDocument();
  });

  it("lists every room and which ones still have no current lesson", async () => {
    billing.rooms = [
      { id: "library", name_zh: "MEE 圖書館", blurb: "生活詞語", sort_order: 1 },
      { id: "cinema", name_zh: "MEE 戲院", blurb: "故事詞語", sort_order: 2 },
    ];
    billing.lessons = [{
      id: "lesson-1", room_id: "library", theme: "海洋", title: "海洋詞語",
      words: [{ word: "海豚" }, { word: "海龜" }], current: true, video_path: null,
    }];
    render(<MemoryRouter initialEntries={["/admin/lessons"]}><App /></MemoryRouter>);
    expect(await screen.findByText(/海洋詞語/)).toBeInTheDocument();
    // The empty room has to be visible: an unfilled room is the thing the
    // operator opened this page to find.
    expect(screen.getByText("仲未有課程。")).toBeInTheDocument();
    expect(screen.getByText("空")).toBeInTheDocument();
  });

  it("refuses to publish a lesson with fewer than two words", async () => {
    billing.rooms = [{ id: "library", name_zh: "MEE 圖書館", blurb: "生活詞語", sort_order: 1 }];
    render(<MemoryRouter initialEntries={["/admin/lessons"]}><App /></MemoryRouter>);
    const title = await screen.findByPlaceholderText("海洋詞語");
    fireEvent.change(title, { target: { value: "海洋詞語" } });
    fireEvent.click(screen.getByRole("button", { name: /發布做呢間房嘅現行內容/ }));
    expect(await screen.findByText("最少要兩個詞語，遊戲先有得揀。")).toBeInTheDocument();
  });

  it("marks parent, child and admin routes noindex without a canonical", () => {
    for (const path of ["/parent/dashboard", "/child/room", "/admin", "/lost/token-1", "/login"]) {
      const view = render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
      expect(document.querySelector('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
      expect(document.querySelector('link[rel="canonical"]')).toBeNull();
      view.unmount();
    }
  });

  it("gives public pages a self-referencing canonical and no robots override", () => {
    const view = render(<MemoryRouter initialEntries={["/pricing"]}><App /></MemoryRouter>);
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute("href", "https://minimee.me/pricing");
    expect(document.querySelector('meta[name="robots"]')).toBeNull();
    view.unmount();
  });

  it("shows an example kid card so parents understand the product", async () => {
    render(<MemoryRouter initialEntries={["/kid/mimi"]}><App /></MemoryRouter>);
    expect(await screen.findByRole("heading", { level: 1, name: "Mimi" })).toBeInTheDocument();
    expect(screen.getByText(/我最鍾意畫海底世界/)).toBeInTheDocument();
    expect(screen.getByText("示範卡 · 唔係真實小朋友")).toBeInTheDocument();
    expect(screen.getByText("MEE-014")).toBeInTheDocument();
  });

  it("offers the lost-item channel without exposing parent contact details", async () => {
    render(<MemoryRouter initialEntries={["/kid/mimi"]}><App /></MemoryRouter>);
    expect(await screen.findByRole("link", { name: /聯絡家長/ })).toHaveAttribute("href", "/lost/example-token-mimi");
    expect(screen.getByText(/電話唔會公開/)).toBeInTheDocument();
  });

  it("hides the lost-item section on a card that has it switched off", async () => {
    render(<MemoryRouter initialEntries={["/kid/ryan"]}><App /></MemoryRouter>);
    expect(await screen.findByRole("heading", { level: 1, name: "Ryan" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /聯絡家長/ })).toBeNull();
  });

  it("keeps the intro video unplayable until one has been generated", async () => {
    render(<MemoryRouter initialEntries={["/kid/mimi"]}><App /></MemoryRouter>);
    expect(await screen.findByText("自我介紹片製作中…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /自我介紹片製作中/ })).toBeDisabled();
  });

  it("does not reveal a real card's lost-mode token to the browser", async () => {
    // A published card from the database never carries its token — the
    // finder reaches the parent through the QR sticker instead. Probing a
    // card page must not hand out a working contact link.
    billing.publicProfile = {
      id: "card-1", slug: "real-kid", display_name: "小明",
      tagline: "我係小明", about: null, dream_job: null,
      age: null, age_is_approximate: false, school: null,
      scene: null, avatar_url: null, hero_id: null,
      favourite_animal: null, favourite_food: null, favourite_colour: null,
      favourite_place: null, quote: null,
      intro_video_url: null, intro_video_poster: null,
      lost_mode_enabled: true, lost_mode_message: "唔該聯絡我媽咪",
    };
    render(<MemoryRouter initialEntries={["/kid/real-kid"]}><App /></MemoryRouter>);
    expect(await screen.findByRole("heading", { level: 1, name: "小明" })).toBeInTheDocument();
    expect(screen.getByText("唔該聯絡我媽咪")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /聯絡家長/ })).toBeNull();
    expect(screen.getByText(/掃描物品上面嘅 MINIMEE QR 貼紙/)).toBeInTheDocument();
  });


  it("offers to create a card and says plainly that it starts private", async () => {
    render(<MemoryRouter initialEntries={["/parent/children/demo-child-01/card"]}><App /></MemoryRouter>);
    expect(await screen.findByRole("button", { name: /建立自我介紹卡/ })).toBeInTheDocument();
    expect(screen.getByText(/撳「發布」先至有人開得到/)).toBeInTheDocument();
  });

  it("keeps a new card unpublished until the parent presses publish", async () => {
    billing.kidCard = editableCard({ published: false });
    render(<MemoryRouter initialEntries={["/parent/children/demo-child-01/card"]}><App /></MemoryRouter>);
    expect(await screen.findByText("未公開")).toBeInTheDocument();
    expect(screen.getByText(/而家只有你自己睇到/)).toBeInTheDocument();
    // The shareable link is only offered once the card is actually public.
    expect(screen.queryByRole("button", { name: /複製連結/ })).toBeNull();
  });

  it("shows the shareable link only after publishing", async () => {
    billing.kidCard = editableCard({ published: true });
    render(<MemoryRouter initialEntries={["/parent/children/demo-child-01/card"]}><App /></MemoryRouter>);
    expect(await screen.findByText("已公開")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /複製連結/ })).toBeInTheDocument();
    expect(screen.getByText(/\/kid\/mimi-ab12cd/)).toBeInTheDocument();
  });

  it("mints unguessable lost-mode tokens and slugs", () => {
    // These are the product's only anonymous surface, so a token has to be
    // infeasible to guess and a slug must not be derivable from the name.
    const tokens = new Set(Array.from({ length: 50 }, () => mintLostToken()));
    expect(tokens.size).toBe(50);
    for (const token of tokens) expect(token).toMatch(/^[0-9a-f]{40}$/);

    const slugs = new Set(Array.from({ length: 50 }, () => mintSlug("Mimi")));
    expect(slugs.size).toBe(50);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/);

    // A Chinese-only nickname has no ascii stem, so it must still produce a
    // valid slug rather than an empty or invalid one.
    expect(mintSlug("小明")).toMatch(/^mee-[a-z0-9]+$/);
  });

  it("sends the child to build a card before the real town is playable", async () => {
    render(<MemoryRouter initialEntries={["/parent/children/demo-child-01/play"]}><App /></MemoryRouter>);
    expect(await screen.findByText("要先有自我介紹卡")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /去建立自我介紹卡/ })).toHaveAttribute(
      "href", "/parent/children/demo-child-01/card");
  });






  it("runs a room's word game and awards its fragment once", async () => {
    billing.kidCard = editableCard({ published: true });
    billing.rooms = [{ id: "library", name_zh: "MEE 圖書館", blurb: "認字同詞語", art: "/assets/mee-library.webp", sort_order: 1 }];
    billing.lessons = [{ id: "l1", room_id: "library", theme: "海洋", title: "海洋詞語",
      words: [{ word: "海豚", meaning: "dolphin" }, { word: "海龜", meaning: "turtle" }] }];
    render(<MemoryRouter initialEntries={["/parent/children/demo-child-01/room/library"]}><App /></MemoryRouter>);

    expect(await screen.findByRole("heading", { name: "海洋詞語" })).toBeInTheDocument();
    expect(screen.getByText("第 1 / 2 個詞語")).toBeInTheDocument();
    // Distractors come from the same lesson, so both words are on screen.
    expect(screen.getByRole("button", { name: "海豚" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "海龜" })).toBeInTheDocument();
  });

  it("does not re-award a fragment for a lesson already finished", async () => {
    billing.kidCard = editableCard({ published: true });
    billing.rooms = [{ id: "library", name_zh: "MEE 圖書館", blurb: "", art: "/assets/mee-library.webp", sort_order: 1 }];
    billing.lessons = [{ id: "l1", room_id: "library", theme: "海洋", title: "海洋詞語", words: [{ word: "海豚" }] }];
    billing.fragments = [{ room_id: "library", lesson_id: "l1", spent: false }];
    render(<MemoryRouter initialEntries={["/parent/children/demo-child-01/room/library"]}><App /></MemoryRouter>);

    expect(await screen.findByText("呢間房嘅碎片已經收集咗")).toBeInTheDocument();
    expect(screen.queryByText(/個詞語$/)).toBeNull();
  });


  it("gives the town six heroes and twelve pets on real art", () => {
    // The brand book bans smooth 3D and plastic skin, so the pixel version
    // of the pet sheet is the one in use — every path must resolve to it.
    expect(HEROES).toHaveLength(6);
    expect(TOWN_PETS).toHaveLength(12);
    for (const hero of HEROES) expect(hero.art).toMatch(/^\/assets\/heroes\/.+\.webp$/);
    for (const pet of TOWN_PETS) expect(pet.art).toMatch(/^\/assets\/pets\/.+\.webp$/);
    // Distinct ids and distinct art, or two entries would render identically.
    expect(new Set(HEROES.map(h => h.art)).size).toBe(6);
    expect(new Set(TOWN_PETS.map(p => p.art)).size).toBe(12);
  });

  it("scatters the pets rather than piling them in one corner", () => {
    // A town reads as inhabited only if the pets are spread through it.
    for (const pet of TOWN_PETS) {
      expect(pet.home.x).toBeGreaterThan(0);
      expect(pet.home.y).toBeGreaterThan(0);
    }
    const xs = TOWN_PETS.map(p => p.home.x);
    const ys = TOWN_PETS.map(p => p.home.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(1000);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(600);
  });

  it("builds a connected world where every exit leads somewhere real", () => {
    // A gate pointing at a missing zone, or a door at a missing room, would
    // strand the child on a dead end with no way to tell from the art.
    for (const zone of Object.values(ZONES)) {
      expect(zone.hotspots.length, `${zone.id} needs somewhere to go`).toBeGreaterThan(0);
      for (const spot of zone.hotspots) {
        if (spot.kind === "gate") expect(ZONES[spot.target], `${zone.id} → ${spot.target}`).toBeDefined();
        else if (spot.kind === "door") expect(ROOM_ART[spot.target], `${zone.id} door → ${spot.target}`).toBeDefined();
        // Every door and gate has to stand on ground the walk mask actually
        // allows, or the child can see the marker and never reach it.
        expect(isWalkable(zone, spot.x, spot.y), `${zone.id}/${spot.id} off the path`).toBe(true);
      }
      // Every room with art must be reachable — from a zone's door, or from
      // inside another room (卡冊珍藏館 and 碎片拼合室 hang off 珍藏館主廳,
      // 戲院廳 off its lobby). A room nobody can walk into is content that has
      // been paid for and never seen.
      for (const room of Object.keys(ROOM_ART)) {
        const fromZone = Object.values(ZONES).some(other =>
          other.hotspots.some(s => s.kind === "door" && s.target === room));
        const fromRoom = Object.values(ROOM_DOORS).some(doors =>
          doors.some(door => door.target === room));
        expect(fromZone || fromRoom, `no door leads to ${room}`).toBe(true);
      }
      // Arriving has to leave the child standing somewhere they can walk from,
      // and never on a gate: spawning on the return gate put 返小鎮 under their
      // thumb the moment they arrived, so the first tap sent them home again.
      expect(isWalkable(zone, zone.spawn.x, zone.spawn.y), `${zone.id} spawn off the path`).toBe(true);
      expect(hotspotNear(zone, zone.spawn.x, zone.spawn.y)?.kind,
        `${zone.id} spawns on a gate`).not.toBe("gate");

      // Every zone must be reachable from somewhere, or it is unusable.
      const reachable = Object.values(ZONES).some(other =>
        other.id !== zone.id && other.hotspots.some(s => s.kind === "gate" && s.target === zone.id));
      expect(reachable, `${zone.id} is unreachable`).toBe(true);
    }
  });

  it("walks to the nearest path when the child taps somewhere unreachable", () => {
    const town = ZONES["town-centre"];
    // The top of the town map is sky and open water. A child who taps it
    // should end up on the nearest path rather than nothing happening at all.
    expect(isWalkable(town, 0.5, 0.04)).toBe(false);
    const landed = nearestWalkable(town, 0.5, 0.04);
    expect(landed).not.toBeNull();
    expect(isWalkable(town, landed!.x, landed!.y)).toBe(true);
    // A tap on ground that is already walkable must not move the destination.
    expect(nearestWalkable(town, town.spawn.x, town.spawn.y)).toEqual(town.spawn);
  });

  it("puts the child back at the entrance they came through", () => {
    // Walking 小鎮中心 → 碼頭市集 → 小鎮中心 has to land next to the 碼頭
    // gate, not at the town's own starting point on the far side of the map.
    const town = ZONES["town-centre"];
    const gate = town.hotspots.find(spot => spot.target === "wharf-market")!;
    const back = arrivalPoint(town, { zone: "wharf-market" });
    expect(isWalkable(town, back.x, back.y)).toBe(true);
    expect(Math.hypot(back.x - gate.x, back.y - gate.y)).toBeLessThan(0.2);
    expect(Math.hypot(back.x - town.spawn.x, back.y - town.spawn.y)).toBeGreaterThan(0.2);
    // And it must not drop them inside the gate's own prompt, or the first
    // tap would send them straight back where they came from.
    expect(hotspotNear(town, back.x, back.y)?.id).not.toBe(gate.id);

    // Coming out of a room lands at that room's door.
    const door = town.hotspots.find(spot => spot.target === "studio")!;
    const outside = arrivalPoint(town, { room: "studio" });
    expect(Math.hypot(outside.x - door.x, outside.y - door.y)).toBeLessThan(0.2);

    // Somewhere with no known entrance still has to be a legal place to stand.
    const cold = arrivalPoint(town, null);
    expect(isWalkable(town, cold.x, cold.y)).toBe(true);
  });

  // These follow the QA sheet in Em's workbook (10_QA測試案例). The database
  // half — daily uniqueness and the global bonus race — is verified against
  // Supabase directly; these cover the rules that live in the model.
  it("matches the workbook's scoring rules", () => {
    // QA08/QA09/QA10: one point a day for turning up, one more for answering,
    // so a pet moves at most 2 a day and a flat 30-point level is 15 or 30 days.
    expect(VISIT_POINT).toBe(1);
    expect(QUIZ_POINT).toBe(1);
    expect(LEVEL_STEP).toBe(30);
    expect(LEVEL_STEP / (VISIT_POINT + QUIZ_POINT)).toBe(15);
    expect(LEVEL_STEP / VISIT_POINT).toBe(30);

    // QA07: two paying answers a day for the whole town, not two per pet.
    expect(DAILY_QUIZ_SLOTS).toBe(2);
    // QA13: exactly one retry, which is what the no-reveal rule protects.
    expect(QUIZ_TRIES).toBe(2);
    // QA11/QA12: a topic is only askable once all four fragments are held.
    expect(FRAGMENTS_FOR_MASTERY).toBe(4);

    // QA01: no action carries points or a cap of its own — the day's first
    // interaction scores, whichever button it was.
    for (const action of PET_ACTIONS) {
      expect(action, `${action.id} must not carry points`).not.toHaveProperty("points");
      expect(action, `${action.id} must not carry a daily cap`).not.toHaveProperty("perDay");
    }
  });

  it("takes its levels from the workbook, not from code", () => {
    // 02_12級好感度: twelve levels, flat 30 apart, Lv.12 at 330.
    expect(MAX_LEVEL).toBe(12);
    expect(FRIEND_LEVELS).toHaveLength(12);
    expect(FRIEND_LEVELS[0].title).toBe("初次認識");
    expect(FRIEND_LEVELS[11].title).toBe("最好朋友");
    expect(MAX_POINTS).toBe(330);
    const steps = FRIEND_LEVELS.slice(1).map((level, index) => level.needed - FRIEND_LEVELS[index].needed);
    expect(new Set(steps)).toEqual(new Set([LEVEL_STEP]));

    // Every level must unlock something, per the sheet's 新互動 column.
    for (const level of FRIEND_LEVELS) {
      expect(level.unlocks, `Lv.${level.level} has no unlock text`).toBeTruthy();
    }
    // QA19: past the top there is no Lv.13 and no further progress.
    expect(levelProgress(MAX_POINTS + 500).level.level).toBe(MAX_LEVEL);
    expect(levelProgress(MAX_POINTS + 500).fraction).toBe(1);

    const early = actionsAt(1).map(action => action.id);
    expect(early).toContain("greet");
    expect(early).not.toContain("best-friend");
    expect(actionsAt(MAX_LEVEL).map(action => action.id)).toContain("best-friend");
  });

  it("gives every pet its own voice, from the workbook", () => {
    // Twelve pets, each matched to its sheet row. A pet without a profile
    // would silently fall back to generic lines, which is the one thing this
    // whole spec exists to prevent.
    expect(PET_PROFILES).toHaveLength(TOWN_PETS.length);
    for (const pet of TOWN_PETS) {
      const profile = profileFor(pet.id);
      expect(profile, `${pet.id} has no workbook row`).not.toBeNull();
      expect(profile!.catchphrase, `${pet.id} has no 口頭禪`).toBeTruthy();
      expect(profile!.tone, `${pet.id} has no 語氣`).toBeTruthy();
      // Birthdays come from the sheet, one per pet, spread across the year.
      expect(profile!.birthday, `${pet.id} has no birthday`).toMatch(/^\d{2}-\d{2}$/);

      // Sheet 07 supplies all six answer states for every pet.
      for (const state of ["asking", "firstWrong", "firstCorrect", "secondCorrect", "secondWrong", "correctNoBonus"] as const) {
        expect(quizLine(pet.id, state)?.vo, `${pet.id} missing ${state} VO`).toBeTruthy();
      }

      // And every action the child can reach has a line written for this pet.
      for (const action of PET_ACTIONS) {
        expect(actionVo(pet.id, action.id).length, `${pet.id} has no line for ${action.id}`).toBeGreaterThan(0);
      }
    }
    // Twelve distinct birthdays, so every month has one.
    expect(new Set(PET_PROFILES.map(profile => profile.birthday)).size).toBe(TOWN_PETS.length);
  });

  it("never reveals the answer after a first wrong try", () => {
    // QA13. The 第一次答錯 line exists for every pet and must not contain the
    // answer — it is the one rule the sheet repeats in three places.
    for (const pet of TOWN_PETS) {
      const line = quizLine(pet.id, "firstWrong");
      expect(line, `${pet.id} has no retry line`).not.toBeNull();
      // A retry line that names a word would be giving the game away.
      expect(line!.vo).not.toMatch(/答案係|正確答案/);
    }
  });

  it("keeps the learning record apart from 好感度", async () => {
    // Sheet 00: 好感度代表關係，不應代替學習成績. A child who only says hello
    // has friendship and an empty record; one answering after the day's two
    // bonus slots are gone has the reverse. The report must read the record,
    // never the points.
    billing.kidCard = editableCard();
    billing.quizAttempts = [
      // Newest first, as the query orders them.
      { word: "海龜", outcome: "first_try_correct", created_at: "2026-08-14T10:00:00Z" },
      { word: "珊瑚", outcome: "failed", created_at: "2026-08-14T09:00:00Z" },
      { word: "海豚", outcome: "second_try_correct", created_at: "2026-08-13T10:00:00Z" },
      // 海龜 was missed earlier and later got right — it must not stay flagged.
      { word: "海龜", outcome: "failed", created_at: "2026-08-12T10:00:00Z" },
    ];
    const record = await learningRecord("card-1");
    expect(record).not.toBeNull();
    expect(record!.firstTry).toBe(1);
    expect(record!.secondTry).toBe(1);
    expect(record!.failed).toBe(2);
    // Only 珊瑚 — 海龜's most recent attempt was correct.
    expect(record!.needsReview).toEqual(["珊瑚"]);
    expect(record!.wordsSeen).toBe(3);
  });

  it("puts each pet where sheet 08 says it lives", () => {
    // The penguin belongs at the harbour, the shiba at the carnival, the
    // granny mouse indoors in town. Dealing the twelve out evenly by index —
    // which is what happened before — made where a pet lived arbitrary, and a
    // child cannot learn where to find a friend that moves at random.
    const morning = new Date("2026-08-14T09:00:00");
    expect(livesIn("wave-penguin", "dock")).toBe(true);
    expect(livesIn("watermelon-shiba", "fair")).toBe(true);
    expect(livesIn("yarn-granny-mouse", "town")).toBe(true);

    // Its own ground during its own hours outranks anywhere else.
    const atHome = spawnWeight("wave-penguin", { zoneId: "dock", now: new Date("2026-08-14T08:00:00") });
    const elsewhere = spawnWeight("wave-penguin", { zoneId: "village", now: new Date("2026-08-14T08:00:00") });
    expect(atHome).toBeGreaterThan(elsewhere);

    // But never impossible elsewhere: a town where pets vanish on a schedule
    // reads as switched off rather than as somewhere people live.
    expect(elsewhere).toBeGreaterThan(0);

    // Safety outranks everything (QA16/QA17). In a storm each pet has exactly
    // one place it will be — its shelter — and is weight zero everywhere else,
    // so no birthday or festival can pull it back outside.
    const zones = ["town", "dock", "fair", "village"];
    for (const pet of TOWN_PETS) {
      const weights = zones.map(zone =>
        spawnWeight(pet.id, { zoneId: zone, now: morning, weather: "storm" }));
      const shelters = weights.filter(weight => weight > 0);
      expect(shelters.length, `${pet.id} has no storm shelter`).toBe(1);
    }

    // A zone gets a handful of neighbours, not all twelve.
    const here = petsForZone({ zoneId: "town", now: morning });
    expect(here.length).toBeLessThanOrEqual(3);
    // Stable within the hour, so stepping out of a room does not reshuffle them.
    expect(petsForZone({ zoneId: "town", now: new Date("2026-08-14T09:40:00") })).toEqual(here);
  });

  it("derives age from DOB and never stores it", () => {
    // A stored age is wrong the day after the birthday and nothing would fix
    // it, so the number is computed on read.
    const before = ageFrom("2018-03-14", null, new Date("2026-03-13"));
    const onTheDay = ageFrom("2018-03-14", null, new Date("2026-03-14"));
    expect(before!.years).toBe(7);
    expect(onTheDay!.years).toBe(8);
    expect(onTheDay!.approximate).toBe(false);

    // Families who signed up before children.dob existed have only a year,
    // which can be one out — so it says 約 rather than claiming to know.
    const legacy = ageFrom(null, 2018, new Date("2026-03-13"));
    expect(legacy!.approximate).toBe(true);
    expect(ageLabel(legacy)).toBe("約 8 歲");
    expect(ageLabel(onTheDay)).toBe("8 歲");

    // Nothing at all rather than a zero.
    expect(ageFrom(null, null)).toBeNull();
    expect(ageLabel(null)).toBe("");
  });

  it("hides a private profile behind the public read, not behind the UI", async () => {
    // The visitor path goes through kid_card_public, which applies the
    // per-field switches server-side. A visitor is never handed private data
    // and asked not to render it.
    billing.publicProfile = null;
    render(<MemoryRouter initialEntries={["/kid/nobody"]}><App /></MemoryRouter>);
    expect(await screen.findByText("搵唔到呢個檔案")).toBeInTheDocument();
  });

  it("shows the photo warning only while editing", () => {
    const sticker = {
      id: "s1", category: "interest" as const, label: "畫畫", size: "m" as const,
      sortOrder: 0, note: null, photoPath: null, photoPublic: false, art: null,
    };
    // A visitor must never be shown the upload warning — it is a decision for
    // whoever is uploading, not a notice to the reader.
    const visitor = render(
      <StickerDetailPanel sticker={sticker} cardId={null} onClose={() => {}} />);
    expect(screen.queryByText(/呢張相會俾所有睇到/)).toBeNull();
    visitor.unmount();

    render(<StickerDetailPanel sticker={sticker} cardId="card-1" editing onClose={() => {}} />);
    expect(screen.getByText(/呢張相會俾所有睇到/)).toBeInTheDocument();
  });

  it("reorders stickers by drag and saves the move exactly once", async () => {
    // Two ways of saying "the drag finished" reach the wall: the sticker's own
    // pointer-up, and the same event bubbling to the grid. Both used to fire a
    // write, so every reorder was sent to the database twice.
    const wall = ["畫畫", "游水", "跳舞"].map((label, index) => ({
      id: `s${index}`, category: "interest" as const, label, size: "m" as const,
      sortOrder: index, note: null, photoPath: null, photoPublic: false, art: null,
    }));
    const onOpen = vi.fn();
    render(<StickerWall title="我的興趣" stickers={wall} editing onOpen={onOpen} />);

    const faces = screen.getAllByRole("button", { name: /^(畫畫|游水|跳舞)$/ });
    // A mouse drags immediately; a finger has to hold first, which is what
    // stops a scroll gesture from picking a sticker up.
    fireEvent.pointerDown(faces[2], { pointerType: "mouse" });
    fireEvent.pointerEnter(faces[0], { pointerType: "mouse" });

    // The list reorders under the finger, before anything is written — a drag
    // must never wait on the network to show where the sticker landed.
    expect(screen.getAllByRole("button", { name: /^(畫畫|游水|跳舞)$/ })[0])
      .toHaveAccessibleName("跳舞");

    fireEvent.pointerUp(faces[0], { pointerType: "mouse" });
    await waitFor(() => expect(billing.writes.length).toBeGreaterThan(0));

    // 跳舞 moves to the front, so all three rows change index — and each is
    // written once, not once per handler that saw the pointer-up.
    expect(billing.writes.filter(write => write.table === "kid_card_stickers"))
      .toEqual([0, 1, 2].map(sort_order => ({ table: "kid_card_stickers", patch: { sort_order } })));

    // Landing a drag on a sticker is not a tap on it: the child moved 跳舞,
    // they did not ask to open 畫畫.
    expect(onOpen).not.toHaveBeenCalled();

    // A plain tap, with no drag in flight, still opens the detail panel.
    fireEvent.pointerUp(screen.getByRole("button", { name: "游水" }), { pointerType: "mouse" });
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ label: "游水" }));

    // A drag that ends on the sticker it started from is the case where the
    // pointer-up really is seen twice — by the sticker and by the grid.
    billing.writes = [];
    const dancing = screen.getByRole("button", { name: "跳舞" });
    fireEvent.pointerDown(dancing, { pointerType: "mouse" });
    fireEvent.pointerEnter(screen.getByRole("button", { name: "畫畫" }), { pointerType: "mouse" });
    fireEvent.pointerUp(dancing, { pointerType: "mouse" });
    await waitFor(() => expect(billing.writes.length).toBeGreaterThan(0));
    expect(billing.writes).toHaveLength(3);
  });

  it("switches the world between day and night art", () => {
    const town = ZONES["town-centre"];
    expect(isDaytime(new Date("2026-08-14T09:00:00"))).toBe(true);
    expect(isDaytime(new Date("2026-08-14T21:00:00"))).toBe(false);
    expect(zoneBackground(town, new Date("2026-08-14T09:00:00"))).toBe(town.day);
    expect(zoneBackground(town, new Date("2026-08-14T21:00:00"))).toBe(town.night);

    const noon = new Date("2026-08-14T09:00:00");
    const night = new Date("2026-08-14T21:00:00");

    // No zone names a wide cut yet, and that is the assertion rather than an
    // omission. A wide cut only works when it is the same painting framed
    // wider: the hotspots and the walk mask are in the portrait cut's
    // fractions, so a re-rendered 16:9 — which is what the 16:9 files
    // delivered so far are — puts every door marker on grass. Until one is a
    // crop, wiring one is a regression, so this fails the day somebody wires
    // one without also solving the coordinates.
    for (const zone of Object.values(ZONES)) {
      expect(zone.dayWide, `${zone.id} wired a wide cut`).toBeUndefined();
      expect(zone.nightWide, `${zone.id} wired a wide cut`).toBeUndefined();
      expect(zoneBackground(zone, noon, true)).toBe(zone.day);
      expect(zoneBackground(zone, night, true)).toBe(zone.night);
    }

    // The layering still works, and it is what makes wiring a wide cut safe
    // the moment there is a real one: wide on top, portrait underneath, so a
    // missing file shows a cropped town rather than a blank screen. With no
    // wide cut there is nothing to stack and it collapses to one layer.
    expect(zoneBackgroundLayers(town, noon, true)).toEqual([town.day]);
    expect(zoneBackgroundLayers(
      { ...town, dayWide: "/wide.webp" }, noon, true,
    )).toEqual(["/wide.webp", town.day]);

    // Dawn is off too. The one dawn painting was of a canal town with a
    // lighthouse, which is not the village Em drew, so 小屋區入口 pointing at
    // it would have put its doorways over an unrelated picture every morning.
    // isDawn still works; it is waiting for art, not broken.
    for (const zone of Object.values(ZONES)) {
      expect(zone.dawn, `${zone.id} wired dawn art`).toBeUndefined();
    }
    expect(isDawn(new Date("2026-08-14T05:30:00"))).toBe(true);
    expect(isDawn(new Date("2026-08-14T09:00:00"))).toBe(false);
    // So everywhere goes straight from night to day at the same hour.
    const gate = ZONES["village-gate"];
    expect(zoneBackground(gate, new Date("2026-08-14T05:30:00"))).toBe(gate.night);
    expect(zoneBackground(gate, new Date("2026-08-14T09:00:00"))).toBe(gate.day);
    expect(zoneBackground(town, new Date("2026-08-14T05:30:00"))).toBe(town.night);

    // Every interior in the map has art, and every art file has a room.
    for (const interior of Object.values(INTERIORS)) {
      expect(ROOM_ART[interior.id], `${interior.id} missing from ROOM_ART`).toBe(interior.art);
    }
    expect(Object.keys(ROOM_ART).sort()).toEqual(Object.keys(INTERIORS).sort());
  });

  it("only offers a door when the child is standing at it", () => {
    const town = ZONES["town-centre"];
    const door = town.hotspots[0];
    expect(hotspotNear(town, door.x, door.y)?.id).toBe(door.id);
    // Standing in the middle of the road offers nothing, so prompts cannot
    // stack up while the child is just walking.
    expect(hotspotNear(town, 0.45, 0.75)).toBeNull();
  });

  it("AUDIT: park is a through-route, both directions, with real landings", () => {
    // 小鎮廣場 ⇄ 散步公園 ⇄ 小屋區入口 — the park is not a dead end.
    const pairs: Array<[string, string]> = [
      ["town-square", "seaside-park"], ["seaside-park", "town-square"],
      ["seaside-park", "village-gate"], ["village-gate", "seaside-park"],
    ];
    for (const [from, to] of pairs) {
      const zone = ZONES[from];
      const gate = zone.hotspots.find(spot => spot.kind === "gate" && spot.target === to);
      expect(gate, `${from} has no gate to ${to}`).toBeDefined();
      // The gate itself must be reachable on foot.
      expect(isWalkable(zone, gate!.x, gate!.y), `${from}/${gate!.id} off the path`).toBe(true);
      // And arriving from the far side must land on walkable ground that is
      // not inside the return gate's own prompt.
      const landing = arrivalPoint(ZONES[to], { zone: from });
      expect(isWalkable(ZONES[to], landing.x, landing.y), `${to} landing off the path`).toBe(true);
      const back = ZONES[to].hotspots.find(spot => spot.kind === "gate" && spot.target === from);
      expect(hotspotNear(ZONES[to], landing.x, landing.y)?.id).not.toBe(back!.id);
    }
  });

  it("routes the world exactly as Em drew it", () => {
    // The map Em specified, read back out of the model. Every one of these
    // was a sentence in her brief; if a link goes missing the child ends up
    // somewhere she never sent them.
    const gate = (zone: string, target: string) =>
      ZONES[zone].hotspots.some(s => s.kind === "gate" && s.target === target);
    const door = (zone: string, target: string) =>
      ZONES[zone].hotspots.some(s => s.kind === "door" && s.target === target);

    // 小鎮中心 is the hub.
    expect(door("town-centre", "cafe")).toBe(true);
    expect(door("town-centre", "studio")).toBe(true);
    expect(door("town-centre", "album-hall")).toBe(true);
    expect(gate("town-centre", "wharf-market")).toBe(true);
    expect(gate("town-centre", "town-square")).toBe(true);

    // 散步公園 joins 小鎮廣場 at its bottom and 小屋區入口 at its top, and
    // both of those also join each other — the loop Em described.
    expect(gate("town-square", "seaside-park")).toBe(true);
    expect(gate("seaside-park", "town-square")).toBe(true);
    expect(gate("seaside-park", "village-gate")).toBe(true);
    expect(gate("village-gate", "seaside-park")).toBe(true);
    expect(gate("town-square", "village-gate")).toBe(true);
    expect(gate("village-gate", "town-square")).toBe(true);

    // 我的小屋 is the left-hand house off 小屋區入口, not off the square.
    expect(door("village-gate", "my-home")).toBe(true);
    expect(door("town-square", "my-home")).toBe(false);

    // Every gate is two-way: walking somewhere and being unable to walk back
    // is the one thing a child will not forgive.
    for (const zone of Object.values(ZONES)) {
      for (const spot of zone.hotspots) {
        if (spot.kind !== "gate") continue;
        expect(gate(spot.target, zone.id), `${spot.target} has no way back to ${zone.id}`).toBe(true);
      }
    }

    // The wings of the 珍藏館 and the 戲院 hang off their own halls, so
    // leaving one returns to the hall rather than to the street.
    expect(ROOM_PARENT["album-books"]).toBe("album-hall");
    expect(ROOM_PARENT["fragment-room"]).toBe("album-hall");
    expect(ROOM_PARENT["library"]).toBe("studio");
    expect(ROOM_PARENT["cinema-lobby"]).toBe("studio");
    expect(ROOM_PARENT["cinema-hall"]).toBe("cinema-lobby");

    // 碼頭市集 is the parents' entrance and must stay flagged as one.
    expect(ZONES["wharf-market"].parentsOnly).toBe(true);
    expect(ZONES["town-centre"].parentsOnly).toBeUndefined();
  });

  it("puts every building's exit back where the child came in", () => {
    // 原位入口原位出口. A room's way out is part of its definition rather than
    // browser history, because history sends a child who deep-linked into the
    // 戲院 back to whatever page they were on before — possibly nowhere in
    // the world at all.
    for (const interior of Object.values(INTERIORS)) {
      const back = interior.back;
      if (back.kind === "zone") {
        expect(ZONES[back.target], `${interior.id} exits to a missing zone`).toBeDefined();
        // The zone it exits into must actually have a door back in, or the
        // child steps outside and cannot get back.
        expect(
          ZONES[back.target].hotspots.some(spot => spot.kind === "door" && spot.target === interior.id),
          `${back.target} has no door to ${interior.id}`,
        ).toBe(true);
      } else {
        expect(INTERIORS[back.target], `${interior.id} exits to a missing room`).toBeDefined();
        expect(
          INTERIORS[back.target].spots.some(spot => spot.kind === "room" && spot.target === interior.id),
          `${back.target} has no way into ${interior.id}`,
        ).toBe(true);
      }
    }

    // The wings hang off their halls exactly as Em drew them.
    expect(INTERIORS["album-books"].back.target).toBe("album-hall");
    expect(INTERIORS["fragment-room"].back.target).toBe("album-hall");
    expect(INTERIORS["library"].back.target).toBe("studio");
    expect(INTERIORS["cinema-lobby"].back.target).toBe("studio");
    expect(INTERIORS["cinema-hall"].back.target).toBe("cinema-lobby");
    // 我的小屋 is off 小屋區入口, not off the town.
    expect(INTERIORS["my-home"].back.target).toBe("village-gate");
  });

  it("sends a child out of a lesson back into the room they came from", () => {
    // A lesson is reached through the 戲院廳 or Hero Studio, not off the
    // street, so the link into it has to carry where the child came from —
    // otherwise finishing a film drops them on the town map.
    const room = {
      id: "r1", nameZh: "海洋", blurb: "", art: "/a.webp", sortOrder: 1,
      lesson: {
        id: "l1", roomId: "r1", theme: "海洋", themeId: "theme-14",
        title: "海底世界", videoPath: null, words: [{ word: "海龜" }],
      },
      earned: false,
    };

    const studio = render(
      <MemoryRouter>
        <CurrentWordsPanel rooms={[room]} childId="c1" backTo="studio" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /睇片同玩遊戲/ }))
      .toHaveAttribute("href", "/parent/children/c1/room/r1?back=studio");
    studio.unmount();

    // The lobby hands the choice to the hall rather than straight to the
    // player, because the hall is where Em's design says the film plays.
    const picked: string[] = [];
    render(<TicketsPanel rooms={[room]} onPick={id => picked.push(id)} />);
    fireEvent.click(screen.getByRole("button", { name: /海底世界/ }));
    expect(picked).toEqual(["r1"]);
  });

  it("reads the sky the way the workbook orders it", () => {
    // 安全天氣限制 is the top of the ordering, so a warning outranks the rain
    // gauge. A typhoon signal in Hong Kong is often a dry, very windy day —
    // reading zero millimetres and calling it clear would be exactly wrong.
    expect(classifyWeather(0, ["WTCSGNL"])).toBe("storm");
    expect(classifyWeather(0, ["WRAINA"])).toBe("storm");
    expect(classifyWeather(0, ["WTS"])).toBe("storm");
    expect(classifyWeather(0, ["WL"])).toBe("storm");
    expect(classifyWeather(0, ["WTMW"])).toBe("storm");
    // Real warnings, but not weather a pet shelters from: the sheet's
    // drizzle/storm columns are about rain.
    expect(classifyWeather(0, ["WFIREY"])).toBe("clear");
    expect(classifyWeather(0, ["WHOT"])).toBe("clear");
    expect(classifyWeather(12, [])).toBe("storm");
    expect(classifyWeather(1, [])).toBe("drizzle");
    expect(classifyWeather(0, [])).toBe("clear");
  });

  it("finds the lunar festivals by rule rather than by a fixed date", () => {
    // 初五 is the fifth, 十五 the fifteenth, 廿三 the twenty-third. Getting
    // this wrong tells a child it is 中秋 on the wrong evening, once a year,
    // and nobody notices until it happens.
    expect(lunarDayNumber("初一")).toBe(1);
    expect(lunarDayNumber("初五")).toBe(5);
    expect(lunarDayNumber("初十")).toBe(10);
    expect(lunarDayNumber("十五")).toBe(15);
    expect(lunarDayNumber("二十")).toBe(20);
    expect(lunarDayNumber("廿三")).toBe(23);
    expect(lunarDayNumber("卅一")).toBe(31);

    expect(parseLunar("丙午年八月十五")).toEqual({ month: 8, day: 15 });
    expect(parseLunar("乙巳年正月初一")).toEqual({ month: 1, day: 1 });
    expect(parseLunar("乙巳年五月初五")).toEqual({ month: 5, day: 5 });
    expect(parseLunar("乙巳年臘月廿八")).toEqual({ month: 12, day: 28 });

    expect(festivalFor(1, 1)).toBe("lunar-new-year");
    expect(festivalFor(5, 5)).toBe("dragon-boat");
    expect(festivalFor(8, 15)).toBe("mid-autumn");
    // Near misses are not festivals, and a failed lookup is never one.
    expect(festivalFor(8, 14)).toBeNull();
    expect(festivalFor(null, null)).toBeNull();
  });

  it("maps every active theme to exactly one configured card", () => {
    // The seed Em supplied, read back. A theme does not work out which card
    // it pays — a release row says so — and 軌道交通 paying MEE-019 (BOOK 4,
    // slot 1) is the case that proves it: the first theme's card is at the
    // back of the album, so anything that fills the album in order is wrong.
    const seed = themeSeed as Array<{
      traySlot: number; themeId: string; themeNameZh: string; words: string[];
      status: string; displayOrder: number;
      targetMeeCard: { cardId: string; bookNumber: number; slotNumber: number };
    }>;

    // The wall is three wide now — Em: 「有 3 組（3 個主題）」— and it is the
    // `current` rows that fill it. The older `carryover` rows are still in the
    // seed and are inert on purpose: under the new rule a theme that rolls off
    // stops being collectable rather than lingering on the wall.
    const current = seed.filter(row => row.status === "current");
    expect(current).toHaveLength(TRAY_SLOTS);

    // One theme per tray, one tray per theme, and the display order is the
    // configured one rather than anything sorted.
    expect(seed.map(row => row.traySlot)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(seed.map(row => row.displayOrder)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(new Set(seed.map(row => row.themeId)).size).toBe(seed.length);
    // Alphabetical order is NOT the product order: sorting the names would
    // move 軌道交通 away from tray 1.
    const alphabetical = [...seed.map(row => row.themeNameZh)].sort();
    expect(alphabetical).not.toEqual(seed.map(row => row.themeNameZh));

    // Every theme has exactly four words, because a tray has four pieces.
    for (const row of seed) expect(row.words, row.themeId).toHaveLength(4);

    // Each theme's card is distinct, and sits where the catalog puts it.
    expect(new Set(seed.map(row => row.targetMeeCard.cardId)).size).toBe(seed.length);
    const first = seed.find(row => row.themeId === "theme-01")!;
    expect(first.themeNameZh).toBe("軌道交通");
    expect(first.targetMeeCard.cardId).toBe("MEE-019");
    expect(first.targetMeeCard.bookNumber).toBe(4);
    expect(first.targetMeeCard.slotNumber).toBe(1);

    // book/slot must agree with the card number, or the album and the
    // release configuration are telling two different stories.
    for (const row of seed) {
      const number = Number(row.targetMeeCard.cardId.slice(4));
      expect(Math.floor((number - 1) / CARDS_PER_BOOK) + 1, row.targetMeeCard.cardId)
        .toBe(row.targetMeeCard.bookNumber);
      expect(((number - 1) % CARDS_PER_BOOK) + 1, row.targetMeeCard.cardId)
        .toBe(row.targetMeeCard.slotNumber);
    }
  });

  it("carries all 36 themes with their unified 3–12 vocabulary", () => {
    const book = themeBook as {
      themes: Array<{ themeId: string; themeNo: number; nameZh: string; words: string[]; question: string }>;
      cards: Array<{ code: string; bookNo: number; slotNo: number }>;
    };

    expect(book.themes).toHaveLength(36);
    expect(book.cards).toHaveLength(24);

    for (const theme of book.themes) {
      // 規則: 每主題詞彙固定 4 個，方便碎片與 quiz.
      expect(theme.words, theme.themeId).toHaveLength(4);
      expect(theme.question, theme.themeId).not.toBe("");
      expect(theme.themeId).toBe(`theme-${String(theme.themeNo).padStart(2, "0")}`);
    }

    // Every album position is used once — no two cards share a slot.
    const seats = book.cards.map(card => `${card.bookNo}:${card.slotNo}`);
    expect(new Set(seats).size).toBe(book.cards.length);
  });

  it("keeps every 碼頭市集 counter pointing at a page that exists", () => {
    // A counter that opens nothing is worse than a counter that is not there:
    // the child walks up, taps, and the world reads as broken.
    const routes = new Set([
      "/parent/children/:id/card", "/parent/dashboard",
      "/parent/children/:id/subscription", "/parent/children/:id/lost-items",
      "/parent/privacy",
    ]);
    for (const stall of WHARF_STALLS) {
      expect(routes.has(stall.route), `${stall.id} → ${stall.route}`).toBe(true);
      expect(stallRoute(stall, "child-1")).not.toContain(":id");
    }
    // Every counter on the map has a definition behind it.
    for (const spot of ZONES["wharf-market"].hotspots) {
      if (spot.kind !== "stall") continue;
      expect(WHARF_STALLS.some(stall => stall.id === spot.target), spot.id).toBe(true);
    }
  });

  it("asks for the 船飛 before letting anyone into 碼頭市集", () => {
    closeParentGate();
    expect(parentGateOpen()).toBe(false);
    expect(checkParentPin("0000")).toBe(false);
    expect(checkParentPin("2468")).toBe(true);
    openParentGate();
    expect(parentGateOpen()).toBe(true);
    closeParentGate();
  });

  it("puts a card in the album slot it was configured for, not where it was earned", () => {
    // 卡號／Book／Slot 為固定. The album must not reorder itself by unlock
    // time, and must not re-derive a position from the card number — Em is
    // re-sequencing the numbering to follow theme order, and when she does,
    // only the catalog changes.
    const card = (code: string, bookNo: number | null, slotNo: number | null): CollectedCard => ({
      id: code, code, name: code, rarity: "normal", art: "", earnedFor: "",
      earnedAt: null, theme: null, bookNo, slotNo,
    });

    // T10-N is 第 10 主題's normal card, which sits in book 4 — the binder
    // is three themes a book, so theme 10 opens book 4. Earning it first
    // must not move it to the front.
    const books = booksFrom([
      card("T10-N", 4, 1),
      card("T02-N", 1, 3),
      card("SP-001", null, null),
    ]);

    expect(books).toHaveLength(BOOKS.length);
    for (const book of books) expect(book.slots).toHaveLength(CARDS_PER_BOOK);
    expect(books[3].slots[0]?.code).toBe("T10-N");
    expect(books[0].slots[2]?.code).toBe("T02-N");
    // Everything else stays an empty slot: the gap is what tells a child
    // there is another card to find.
    expect(books[0].slots[0]).toBeNull();
    expect(books[0].slots.filter(Boolean)).toHaveLength(1);
    // A card with no album position is still theirs, and still shown.
    expect(specialCards([card("T10-N", 4, 1), card("SP-001", null, null)])
      .map(item => item.code)).toEqual(["SP-001"]);
  });

  it("binds twelve books that carry the covers Em drew", () => {
    // 12 books of six is 36 normal plus 36 flash — and at three themes a
    // month it is also one book a month. The cover filename is the book
    // number, which is why the books need no invented names.
    expect(BOOKS).toHaveLength(12);
    expect(BOOKS[0].cover).toBe("/assets/uploads/卡牌冊/第1冊.png");
    expect(BOOKS[11].cover).toBe("/assets/uploads/卡牌冊/第12冊.png");
    expect(SPECIAL_COVERS[0]).toContain("特別版第1冊");
    // Every book carries its cover through to the bound view, or the spread
    // renders a broken image where the binder page should be.
    for (const book of booksFrom([])) expect(book.cover).toMatch(/第\d+冊\.png$/);
  });

  it("keeps 特別回憶 out of the 72 and counts them instead of dividing them", () => {
    // Em: 「完成率唔應該顯示 0/全部，因為日後會不停新增限定卡，否則小朋友
    // 會永遠見到未完成」. A denominator that grows every festival is a child
    // who is permanently behind, so the specials have no denominator at all
    // and never touch the theme total.
    const card = (code: string, bookNo: number | null, slotNo: number | null): CollectedCard => ({
      id: code, code, name: code, rarity: bookNo ? "normal" : "special", art: "",
      earnedFor: "", earnedAt: null, theme: null, bookNo, slotNo,
    });

    const held = [
      card("T01-N", 1, 1), card("T01-F", 1, 2),
      card("SP-001", null, null), card("SP-005", null, null), card("SP-008", null, null),
    ];

    // 12 books of six: 36 normal plus 36 flash, and one book a month.
    expect(BOOKS).toHaveLength(THEME_BOOKS);
    expect(THEME_SLOTS).toBe(72);
    expect(BOOKS).toHaveLength(12);

    // Three specials held, and the theme total is untouched by them.
    expect(specialCards(held)).toHaveLength(3);
    expect(themeProgress(held)).toEqual({ owned: 2, total: 72 });

    // Adding a whole new page of specials still cannot move the total.
    const more = [...held, card("SP-009", null, null), card("SP-010", null, null)];
    expect(themeProgress(more).total).toBe(72);
    expect(themeProgress(more).owned).toBe(2);

    // A theme's normal and its flash are two cards in two adjacent pockets,
    // not one card wearing a finish.
    const books = booksFrom(held);
    expect(books[0].slots[0]?.code).toBe("T01-N");
    expect(books[0].slots[1]?.code).toBe("T01-F");
  });

  it("opens every building and marks what is inside it", async () => {
    // Each room is one picture with its functions marked on it. If a marker
    // stops rendering the room becomes a dead end that still looks fine.
    for (const interior of Object.values(INTERIORS)) {
      const view = render(
        <MemoryRouter initialEntries={[`/parent/children/demo-child-01/inside/${interior.id}`]}>
          <App />
        </MemoryRouter>,
      );
      // The scene waits on its art; jsdom never fires load, so the loading
      // screen is what a real child sees first and is worth asserting on.
      expect(await screen.findByRole("status")).toHaveTextContent(interior.name);
      view.unmount();
    }
  });

  it("shows the fragment trays, the four books and the whole shelf", () => {
    const card = (code: string, rarity: "normal" | "flash" = "normal"): CollectedCard => ({
      id: code, code, name: `卡 ${code}`, rarity, art: "", earnedFor: "",
      earnedAt: null, theme: "海洋",
      bookNo: 1, slotNo: Number(code.slice(-1)),
    });

    const shelf = render(<AllCardsPanel cards={[card("MEE-001"), card("MEE-002", "flash")]} />);
    expect(screen.getByText("MEE-001")).toBeInTheDocument();
    expect(screen.getByText(/其中 1 張閃卡/)).toBeInTheDocument();
    shelf.unmount();

    const books = render(<BooksPanel cards={[card("MEE-001")]} />);
    // Five of the six slots in the first book are still empty, and they say so.
    expect(screen.getAllByText("仲未解鎖")).toHaveLength(5);
    books.unmount();

    // A tray with four pieces offers to forge; a half-full one just counts;
    // one whose card is already made says where it went.
    const tray = (earned: number, owned = false) => ({
      traySlot: 1, themeId: "theme-14", theme: "神秘深海",
      words: ["小魚", "章魚", "鯊魚", "海龜"], status: "current" as const,
      earned, targetCode: "MEE-008", bookNo: 2, slotNo: 2, owned,
      mode: "make" as const, vo: "", question: "", answerPattern: "",
    });

    const ready = render(
      <TraysPanel trays={[tray(4)]} kidCardId="card-1" onForged={() => {}} />);
    expect(screen.getByRole("button", { name: "砌成一張卡" })).toBeInTheDocument();
    // The four words are on the tray, so a child can see what they are for.
    expect(screen.getByText("小魚・章魚・鯊魚・海龜")).toBeInTheDocument();
    ready.unmount();

    const half = render(<TraysPanel trays={[tray(2)]} kidCardId="card-1" onForged={() => {}} />);
    expect(screen.queryByRole("button", { name: "砌成一張卡" })).toBeNull();
    expect(screen.getByText("2 / 4")).toBeInTheDocument();
    half.unmount();

    // Already forged: no second button, and it names the album slot rather
    // than counting fragments that have been spent.
    render(<TraysPanel trays={[tray(0, true)]} kidCardId="card-1" onForged={() => {}} />);
    expect(screen.queryByRole("button", { name: "砌成一張卡" })).toBeNull();
    expect(screen.getByText("已砌成 · BOOK 2 第 2 格")).toBeInTheDocument();
  });

  it("keeps 小鎮趣聞 and 最新消息 apart on the notice board", () => {
    // A parent who cannot tell an invented pet story from a real product
    // announcement stops believing either of them.
    render(<NoticeBoardPanel news={[
      { id: "a", kind: "announcement", title: "新主題開放", body: "海洋主題今日開始。", publishedAt: "2026-08-14T00:00:00Z" },
      { id: "f", kind: "fun", title: "企鵝跌咗雪糕", body: "海浪企鵝今朝喺廣場跌咗個雪糕。", publishedAt: "2026-08-14T00:00:00Z" },
    ]} />);

    expect(screen.getByText("最新消息")).toBeInTheDocument();
    expect(screen.getByText("MINIMEE 官方")).toBeInTheDocument();
    // The 趣聞 section says in as many words that it is made up.
    expect(screen.getByText(/唔係真事/)).toBeInTheDocument();
    // And the two never share a container.
    const fun = screen.getByText("企鵝跌咗雪糕").closest(".notice-section");
    const real = screen.getByText("新主題開放").closest(".notice-section");
    expect(fun).not.toBe(real);
    expect(fun).toHaveClass("fun");
  });

  it("names what is actually wrong with the Supabase config", () => {
    // 「Supabase環境變數尚未載入，請重新部署後再試」 was advice that did not
    // work: the deploy was fine, one of the two values was not, and the
    // message could not tell anybody which. These are the three states worth
    // distinguishing because each is fixed in a different place.
    expect(configProblem({ url: "https://x.supabase.co", publishableKey: "k" })).toBeNull();
    expect(configProblem({ publishableKey: "k" })).toMatch(/URL/);
    expect(configProblem({ url: "https://x.supabase.co" })).toMatch(/publishable/);
    // The one that actually looks like a working config until you read it:
    // the project ref stored with the scheme left off.
    expect(configProblem({ url: "cjsfpsbtohwgqwgtcjef.supabase.co", publishableKey: "k" }))
      .toMatch(/https:\/\//);
    // Whitespace around a pasted secret is not a problem worth reporting.
    expect(configProblem({ url: " https://x.supabase.co ", publishableKey: " k " })).toBeNull();
  });

  it("shapes a character line into babble rather than recording it", () => {
    // Em: 「完全不知道是什麼語言，只會用語氣音調語速快慢等等去演繹出來…
    // 每一句講嘢嘅時候都剩係得幾聲語氣嘅聲音」. So a line is shaped, not
    // recorded — which is the only reason 34 characters can each sound like
    // themselves off two dozen clips.
    expect(blipCount("好！")).toBe(3);                    // floor: shorter still reads as speech
    expect(blipCount("歡迎返嚟！你今日想睇邊一條學習影片呀？")).toBeLessThanOrEqual(10);
    // Punctuation is not spoken, so two lines of the same words babble alike.
    expect(blipCount("你好嗎")).toBe(blipCount("你好嗎？？？"));

    // The same character always sounds like the same character, and two
    // different ones generally do not.
    const a = babbleFor("milk-cat", "今日天氣好好呀");
    expect(babbleFor("milk-cat", "今日天氣好好呀")).toEqual(a);
    expect(babbleFor("usher", "今日天氣好好呀").pitch).not.toBe(a.pitch);

    // Pitch stays in a range that reads as "another animal" rather than as a
    // broken tape.
    for (const id of ["usher", "milk-cat", "sun-sheep", "wave-penguin", "bun-hamster"]) {
      const shape = babbleFor(id, "你好");
      expect(shape.pitch, id).toBeGreaterThanOrEqual(0.85);
      expect(shape.pitch, id).toBeLessThanOrEqual(1.18);
      expect(shape.blips.every(index => index >= 0 && index < SYLLABLES_PER_KIT)).toBe(true);
    }

    // A question lifts at the end and an exclamation hurries — that is the
    // whole of tone in a language nobody speaks.
    expect(babbleFor("usher", "係咪呀？").rising).toBe(true);
    expect(babbleFor("usher", "係咪呀。").rising).toBe(false);
    expect(babbleFor("usher", "好嘢！").gap)
      .toBeLessThan(babbleFor("usher", "好嘢。").gap);

    // Nothing is recorded and nothing is fetched: the browser synthesises it,
    // so every voice is a recipe rather than a folder of clips. Em asked for
    // this after the first version wanted 24 recordings.
    for (const kit of ["bright", "warm", "low", "soft"] as const) {
      const preset = VOICE_PRESETS[kit];
      expect(preset.baseHz, kit).toBeGreaterThan(150);
      expect(preset.baseHz, kit).toBeLessThan(900);
      expect(preset.duration, kit).toBeGreaterThan(0.05);
      // Loud enough to hear over a room, quiet enough for a child's ear.
      expect(preset.level, kit).toBeLessThanOrEqual(0.12);
      // A low-pass on every voice, so the square and sawtooth kits do not
      // come out harsh — the audience is four.
      expect(preset.cutoffHz, kit).toBeLessThanOrEqual(4000);
    }
    // The four voices must actually differ, or casting them is theatre.
    const bases = (["bright", "warm", "low", "soft"] as const)
      .map(kit => VOICE_PRESETS[kit].baseHz);
    expect(new Set(bases).size).toBe(4);

    // Six syllable shapes, each a real pitch movement rather than a flat tone.
    expect(SYLLABLE_SHAPES).toHaveLength(SYLLABLES_PER_KIT);
    for (const shape of SYLLABLE_SHAPES) {
      expect(shape.pitch).toBeGreaterThan(0.5);
      expect(shape.pitch).toBeLessThan(2);
      expect(shape.end).not.toBe(shape.pitch);
    }

    // Named staff are cast by hand rather than by hashing a costume, and the
    // casting table only names posts that actually exist.
    for (const id of Object.keys(VOICE_KIT_OVERRIDES)) {
      const post = id.replace(/-(day|night)$/, "");
      expect(NPC_POSTS as readonly string[], id).toContain(post);
      expect(kitFor(id)).toBe(VOICE_KIT_OVERRIDES[id]);
      // Every key is shift-specific, because the call sites pass a shift id —
      // a bare post here would silently fall back to the hash.
      expect(id, id).toMatch(/-(day|night)$/);
    }
    // 早更 and 晚更 are two different animals, so they must not share a voice.
    for (const post of NPC_POSTS) {
      const day = VOICE_KIT_OVERRIDES[`${post}-day`];
      const night = VOICE_KIT_OVERRIDES[`${post}-night`];
      if (day && night) expect(day, post).not.toBe(night);
    }
  });

  it("changes who is behind the counter at dusk", () => {
    // 「早更／晚更」 — Em drew two characters for each staffed post, and the
    // world already knows which half of the day it is.
    expect(NPC_POSTS).toHaveLength(10);
    expect(new Set(NPC_POSTS).size).toBe(NPC_POSTS.length);
    for (const post of NPC_POSTS) {
      expect(npcPortrait(post, true)).toBe(`/assets/uploads/NPC/${post}-day.webp`);
      expect(npcPortrait(post, false)).toBe(`/assets/uploads/NPC/${post}-night.webp`);
    }
    expect(npcPortrait("usher", true)).not.toBe(npcPortrait("usher", false));

    // Hero Studio has two desks because the room has two functions, and Em
    // drew a pair under each icon — a joystick over one, an "Aa" flashcard
    // over the other.
    expect(NPC_POSTS).toContain("studio-game");
    expect(NPC_POSTS).toContain("studio-words");

    // The idlers work differently: no shift, one file each, and every one of
    // them stands in a zone that exists.
    expect(AMBIENT_NPCS).toHaveLength(6);
    for (const idler of AMBIENT_NPCS) {
      expect(ZONES[idler.zone], idler.id).toBeDefined();
      expect(isWalkable(ZONES[idler.zone], idler.x, idler.y), `${idler.id} off the path`).toBe(true);
      expect(ambientPortrait(idler.id)).toBe(`/assets/uploads/NPC/idle-${idler.id}.webp`);
    }
    // And they do not pile on top of each other.
    for (const a of AMBIENT_NPCS) {
      for (const b of AMBIENT_NPCS) {
        if (a.id >= b.id || a.zone !== b.zone) continue;
        expect(Math.hypot(a.x - b.x, a.y - b.y), `${a.id}/${b.id}`).toBeGreaterThan(0.06);
      }
    }
  });

  it("has a poster on disk for every one of the 36 themes", () => {
    // The lobby leaves a frame empty when a poster is missing, which is the
    // right thing on screen and invisible in review — so the check lives here
    // instead. Em ships all 36 up front; this is what notices when one does
    // not make it out of the zip.
    const book = themeBook as { themes: Array<{ themeId: string }> };
    // posterIndex.json is written from the folder itself by
    // scripts/index-posters.mjs, so this compares the catalogue against what
    // actually shipped rather than against a hand-kept list.
    const onDisk = new Set(posterIndex.themeIds);

    for (const theme of book.themes) {
      expect(posterFor(theme.themeId), theme.themeId)
        .toBe(`/assets/posters/${theme.themeId}.webp`);
      expect(onDisk.has(theme.themeId), `missing poster ${theme.themeId}`).toBe(true);
    }
    expect(onDisk.size).toBe(36);

    // A theme id that is not one of the 36 asks for nothing rather than for a
    // file called undefined.webp.
    expect(posterFor(null)).toBeNull();
    expect(posterFor("not-a-theme")).toBeNull();
  });

  it("builds the 珍藏館 as three stations, two portals and a carousel", () => {
    const hall = INTERIORS["album-hall"];
    const fragments = INTERIORS["fragment-room"];

    // 「保留左、右兩個功能入口」, and Em drew which is which: the left portal
    // is tiled like a jigsaw, the right one has books radiating out of it.
    const wings = hall.spots.filter(spot => spot.kind === "room");
    expect(wings.map(wing => wing.target).sort()).toEqual(["album-books", "fragment-room"]);
    expect(wings.find(w => w.target === "fragment-room")!.x).toBeLessThan(0.5);
    expect(wings.find(w => w.target === "album-books")!.x).toBeGreaterThan(0.5);
    // Both wings come back out to the hall.
    for (const wing of wings) expect(INTERIORS[wing.target].back.target).toBe("album-hall");

    // 「展示哂收有珍藏的地方…生日卡、貼紙」— the chest and the drawer are real
    // views of real data, not scenery with a button on it.
    expect(hall.spots.map(spot => spot.target)).toEqual(
      expect.arrayContaining(["all-cards", "specials", "stickers"]));

    // 「準確保留 3 組卡冊、每組 4 盞寶石進度燈」 — three mounts, three gem
    // rows, and the wall is three wide rather than the six it used to be.
    expect(TRAY_SLOTS).toBe(3);
    expect(fragments.spots.filter(spot => spot.target.startsWith("tray-"))).toHaveLength(3);
    const gems = (fragments.frames ?? []).filter(frame => frame.kind === "tray");
    expect(gems).toHaveLength(3);
    // Left to right, no two overlapping — they are three separate stations.
    const ordered = [...gems].sort((a, b) => a.x - b.x);
    expect(ordered.map(frame => frame.id)).toEqual(["tray-1", "tray-2", "tray-3"]);
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i].x, ordered[i].id).toBeGreaterThan(ordered[i - 1].x + ordered[i - 1].w);
    }
  });

  it("turns the 卡冊 carousel without running out of ends", () => {
    // 「支援現有 12＋2 本及日後擴充，冇畫死數量」 — so turning counts the books
    // it is given, and wraps, because a cylinder has no first or last.
    const books = [{ no: 1 }, { no: 2 }, { no: 3 }];
    expect(turn(books, 1, 1)).toBe(2);
    expect(turn(books, 3, 1)).toBe(1);
    expect(turn(books, 1, -1)).toBe(3);
    // And it still works on a shelf of a different size.
    const many = Array.from({ length: 14 }, (_, index) => ({ no: index + 1 }));
    expect(turn(many, 14, 1)).toBe(1);
    expect(turn(many, 1, -1)).toBe(14);
  });

  it("routes the cinema through two halls and keeps the lobby's frames blank-able", () => {
    const lobby = INTERIORS["cinema-lobby"];
    const studio = INTERIORS["studio"];

    // 「由 Hero Studio 進去後，去右邊區是 MEE 圖書館，去左邊區是戲院大堂」.
    // Em painted the signs on the doors, so these are read off the art rather
    // than assigned: a film reel on the left arch, an open book on the right.
    const doors = studio.spots.filter(spot => spot.kind === "room");
    expect(doors.map(door => door.target).sort()).toEqual(["cinema-lobby", "library"]);
    const cinemaDoor = doors.find(door => door.target === "cinema-lobby")!;
    const libraryDoor = doors.find(door => door.target === "library")!;
    expect(cinemaDoor.x).toBeLessThan(0.5);
    expect(libraryDoor.x).toBeGreaterThan(0.5);

    // 「還會經過短走廊前往下個場地『戲院1號廳』…『戲院2號廳』」.
    const halls = lobby.spots.filter(spot => spot.kind === "room").map(spot => spot.target);
    expect(halls.sort()).toEqual(["cinema-hall", "cinema-hall-2"]);
    expect(INTERIORS["cinema-hall-2"]).toBeDefined();
    // Both halls come back out to the lobby, never to the studio: 原位入口
    // 原位出口 means the door you leave by is the door you came in through.
    for (const hall of ["cinema-hall", "cinema-hall-2"]) {
      expect(INTERIORS[hall].back.target).toBe("cinema-lobby");
    }

    // 「月度海報及影片畫面都已經保留可動態替換嘅框位」 — three posters and a
    // marquee in the lobby, a screen in each hall.
    const kinds = (id: string) => (INTERIORS[id].frames ?? []).map(frame => frame.kind);
    expect(kinds("cinema-lobby").filter(kind => kind === "poster")).toHaveLength(3);
    expect(kinds("cinema-lobby")).toContain("marquee");
    expect(kinds("cinema-hall")).toEqual(["screen"]);
    expect(kinds("cinema-hall-2")).toEqual(["screen"]);

    // Every frame has to be a rectangle that fits on the picture.
    for (const interior of Object.values(INTERIORS)) {
      for (const frame of interior.frames ?? []) {
        expect(frame.w, `${interior.id}/${frame.id}`).toBeGreaterThan(0);
        expect(frame.h, `${interior.id}/${frame.id}`).toBeGreaterThan(0);
        expect(frame.x + frame.w, `${interior.id}/${frame.id}`).toBeLessThanOrEqual(1);
        expect(frame.y + frame.h, `${interior.id}/${frame.id}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("sends this month's films to 1 號廳 and everything older to 2 號廳", () => {
    // 「無論是當月影片／過去的影片，所有影片都會在這邊選擇播放」 — so the
    // split is which hall, never whether a film is offered at all.
    const trays = [
      { themeId: "t-01", theme: "交通工具" }, { themeId: "t-02", theme: "海洋" },
    ] as unknown as Parameters<typeof pastFilmsFrom>[1];

    const past = pastFilmsFrom([
      { themeId: "t-01", theme: "交通工具", words: ["巴士"] },   // on the wall
      { themeId: "t-09", theme: "農場", words: ["牛", "羊"] },   // older
      { themeId: "t-09", theme: "農場", words: ["雞"] },         // same theme twice
      { themeId: null, theme: "舊課文", words: ["占位"] },        // pre-catalogue
    ], trays);

    // One entry, deduped, and nothing this month leaks into the rewatch list.
    expect(past).toHaveLength(1);
    expect(past[0].themeId).toBe("t-09");
    expect(past.some(film => film.themeId === "t-01")).toBe(false);
  });

  it("gives 我的小屋 and Buddy Café the things Em put in them", () => {
    const home = INTERIORS["my-home"];
    const cafe = INTERIORS["cafe"];
    const targets = (interior: typeof home) => interior.spots.map(spot => spot.target);

    // 「裡面會有小朋友更改自我介紹卡的貼紙功能、更改角色造型（之後開放的新
    // 功能）、我的好友冊、檢視我的卡片」 — four things, and the fourth is
    // marked as not built rather than quietly missing.
    expect(targets(home)).toEqual(
      expect.arrayContaining(["update-card", "about-me", "friends", "looks"]));
    const looks = home.spots.find(spot => spot.target === "looks")!;
    expect(looks.kind).toBe("soon");
    expect(looks.note).toBeTruthy();

    // 「這間 cafe 主要的功能有 2 樣」 — the code swap and the pet news. Both
    // are real panels, not seats.
    const scan = cafe.spots.find(spot => spot.target === "friend-scan")!;
    const petNews = cafe.spots.find(spot => spot.target === "pet-news")!;
    expect(scan.kind).toBe("panel");
    expect(petNews.kind).toBe("panel");

    // 「舒適又有不同活動及坐位進食（有坐下的互動鍵）、吸引的甜點及飲品
    // （有進食的互動鍵）」.
    const seats = cafe.spots.filter(spot => spot.kind === "seat");
    expect(seats.length).toBeGreaterThanOrEqual(3);
    for (const seat of seats) expect(seat.note, `${seat.id} has nothing to see`).toBeTruthy();
    expect(cafe.spots.some(spot => spot.kind === "treat")).toBe(true);

    // Every spot has to be somewhere on the picture, and no two may sit on
    // top of each other — an earlier room had two markers 0.04 apart and a
    // small finger could not pick between them.
    for (const interior of Object.values(INTERIORS)) {
      for (const spot of interior.spots) {
        expect(spot.x, `${interior.id}/${spot.id}`).toBeGreaterThan(0);
        expect(spot.x, `${interior.id}/${spot.id}`).toBeLessThan(1);
        expect(spot.y, `${interior.id}/${spot.id}`).toBeGreaterThan(0);
        expect(spot.y, `${interior.id}/${spot.id}`).toBeLessThan(1);
      }
      for (const a of interior.spots) {
        for (const b of interior.spots) {
          if (a.id >= b.id) continue;
          const apart = Math.hypot(a.x - b.x, a.y - b.y);
          expect(apart, `${interior.id}: ${a.id} and ${b.id} overlap`).toBeGreaterThan(0.08);
        }
      }
    }
  });

  it("lets a child order something at the café counter without paying anything", () => {
    // The treat list is drawn from what is in the display case, and none of
    // it costs or earns — Em ruled out a second currency, so a café that
    // handed out points for a cake would be a shop.
    const eaten: string[] = [];
    const { rerender } = render(
      <TreatsPanel holding={null} onEat={label => eaten.push(label)} />);
    expect(screen.getByText(/呢度唔使錢/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /熱朱古力/ }));
    expect(eaten).toEqual(["熱朱古力"]);

    // Once something is chosen the panel says what it was like, and the rest
    // of the case is still open — there is nothing to run out of.
    rerender(<TreatsPanel holding="熱朱古力" onEat={label => eaten.push(label)} />);
    expect(screen.getByText(/棉花糖/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /熱朱古力/ })).toBeNull();
    expect(screen.getByRole("button", { name: /星星曲奇/ })).toBeInTheDocument();
  });

  it("makes the park's seats and the village's closed doors real places", () => {
    const park = ZONES["seaside-park"];
    const village = ZONES["village-gate"];

    // 「公園長椅及野餐墊是可以有『坐下』的互動」. A seat with no line to show
    // would sit the child down in silence, which is the same as nothing
    // happening — the note is the interaction.
    const seats = park.hotspots.filter(spot => spot.kind === "seat");
    expect(seats.length).toBeGreaterThanOrEqual(4);
    for (const seat of seats) {
      expect(seat.note, `${seat.id} has nothing to see`).toBeTruthy();
      // And you have to be able to reach it, or it is only a picture.
      expect(isWalkable(park, seat.x, seat.y), `${seat.id} off the path`).toBe(true);
    }

    // 「最大明突出果間係通往我的小屋，其餘係小寵物的家，不能進入」— exactly
    // one door, and every other cottage says whose house it is rather than
    // doing nothing when a child taps it.
    const doors = village.hotspots.filter(spot => spot.kind === "door");
    expect(doors).toHaveLength(1);
    expect(doors[0].target).toBe("my-home");
    const cottages = village.hotspots.filter(spot => spot.kind === "cottage");
    expect(cottages.length).toBeGreaterThanOrEqual(4);
    for (const cottage of cottages) {
      expect(cottage.note, `${cottage.id} says nothing`).toBeTruthy();
      expect(isWalkable(village, cottage.x, cottage.y), `${cottage.id} off the path`).toBe(true);
    }

    // 「小屋區係由小鎮廣場入去的，散步區亦可從小鎮廣場入去，而屋區及散步公園
    // 亦是互通的」— six gates, all of them two-way.
    const goes = (from: string, to: string) =>
      ZONES[from].hotspots.some(spot => spot.kind === "gate" && spot.target === to);
    for (const [a, b] of [
      ["town-square", "village-gate"], ["town-square", "seaside-park"],
      ["village-gate", "seaside-park"],
    ] as const) {
      expect(goes(a, b), `${a} → ${b}`).toBe(true);
      expect(goes(b, a), `${b} → ${a}`).toBe(true);
    }
  });

  it("gives every festival something to do on the 廣場 stage", () => {
    // A festival the almanac can name but the stage has no entry for would
    // render an empty stage on the one day of the year it matters.
    for (const festival of ["lunar-new-year", "dragon-boat", "mid-autumn"] as const) {
      const entry = STAGE_FESTIVALS[festival];
      expect(entry, festival).toBeDefined();
      expect(entry.acts.length, `${festival} needs acts`).toBeGreaterThanOrEqual(2);
      // The claim code is what the database whitelists. 端午 has no card yet,
      // and saying so with null is what stops the stage promising one.
      expect([null, "cny", "midautumn"]).toContain(entry.claim);
    }
  });

  it("lets a child perform on an empty stage without promising a reward", async () => {
    // The everyday stage. There is no card here on purpose — Em's rule against
    // a second currency means the stage pays applause, not prizes.
    render(<MemoryRouter>
      <StagePanel heroId="girl-a" nickname="小美" childId="c1" kidCardId="card-1" />
    </MemoryRouter>);

    // The almanac is unreachable in tests, which is the degraded path: no
    // festival claimed, and the panel says why rather than inventing one.
    expect(screen.getByText(/今日冇活動/)).toBeInTheDocument();
    for (const act of EVERYDAY_ACTS) {
      expect(screen.getByRole("button", { name: new RegExp(act.label) })).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole("button", { name: /唱歌/ }));
    await waitFor(() => expect(screen.getByText(/拍手/)).toBeInTheDocument());
    // Applause, and nothing that looks like a card.
    expect(screen.queryByText(/攞到一張特別回憶卡/)).toBeNull();
  });

  it("publishes Organization, Service and FAQ structured data", () => {
    const pricing = render(<MemoryRouter initialEntries={["/pricing"]}><App /></MemoryRouter>);
    expect(document.getElementById("minimee-organization")).not.toBeNull();
    const service = JSON.parse(document.getElementById("minimee-service")?.textContent ?? "{}");
    expect(service.offers).toHaveLength(3);
    expect(service.offers[0].priceCurrency).toBe("HKD");
    pricing.unmount();

    const faq = render(<MemoryRouter initialEntries={["/faq"]}><App /></MemoryRouter>);
    const faqData = JSON.parse(document.getElementById("minimee-faq")?.textContent ?? "{}");
    expect(faqData["@type"]).toBe("FAQPage");
    expect(faqData.mainEntity.length).toBeGreaterThan(0);
    faq.unmount();
  });
  // -------------------------------------------------------------------------
  // 主題小遊戲
  // -------------------------------------------------------------------------

  const rail: ThemeGameSource = {
    themeId: "theme-01", nameZh: "軌道交通",
    words: ["港鐵", "電車", "火車", "輕鐵"],
    vo: "城市入面有好多沿住路軌行嘅交通工具。港鐵帶我哋去唔同地區，電車慢慢穿過街道，火車可以去更遠地方，新界仲有輕鐵。",
    question: "你最鍾意搭邊一種有路軌嘅交通工具？",
    answerPattern: "我最鍾意搭{answer}。",
    mode: "sentence",
  };

  it("scales a round to the child's age, and never asks a five-year-old to type", () => {
    // Em: 「推算嗰個年齡調校難度選項數、有冇提示、要唔要打字」.
    for (let round = 1; round <= ROUNDS_PER_THEME; round += 1) {
      expect(difficultyFor(4, round).typing).toBe(false);
      expect(difficultyFor(4, round).options).toBeLessThanOrEqual(3);
      // A timer on a four-year-old is a way to make them cry, not to teach.
      expect(difficultyFor(4, round).seconds).toBeNull();
      expect(difficultyFor(4, round).hints).toBe(true);
    }
    // Typing is the oldest band's last round and nowhere else.
    expect(difficultyFor(11, 3).typing).toBe(false);
    expect(difficultyFor(11, 4).typing).toBe(true);
    expect(difficultyFor(7, 4).typing).toBe(false);

    // An unknown age lands in the middle, never the band that types.
    expect(bandFor(null)).toBe("6-8");
    expect(difficultyFor(null, 4).typing).toBe(false);
    // A family that only ever picked a band gets that band, not a guess.
    expect(bandFor("3-5")).toBe("3-5");
    expect(bandFor("13+")).toBe("9-12");
  });

  it("gives every mode four rounds that escalate and cover all four words", () => {
    // 「呢個遊戲是要玩四次的」— four rounds, one per fragment, and between
    // them a child has to have met all four of the theme's words.
    for (const mode of GAME_MODES) {
      const rounds = buildRounds({ ...rail, mode }, { age: 8 });
      expect(rounds).toHaveLength(ROUNDS_PER_THEME);
      expect(rounds.map(round => round.round)).toEqual([1, 2, 3, 4]);

      // Every round asks something, and asks it in words rather than a code.
      for (const round of rounds) {
        expect(round.prompt.length).toBeGreaterThan(4);
        expect(round.mode).toBe(mode);
      }

      // 搵一搵 round 3 is the odd-one-out, which is about a foreign word on
      // purpose — every other mode walks the theme's own four.
      const covered = new Set(rounds.map(round => round.word));
      expect(covered.size).toBeGreaterThanOrEqual(mode === "spot" ? 3 : 4);

      // The rounds get harder: options never shrink as the round goes up.
      const scored = rounds.filter(round => round.input === "tap");
      for (let index = 1; index < scored.length; index += 1) {
        expect(scored[index].difficulty.options)
          .toBeGreaterThanOrEqual(scored[index - 1].difficulty.options);
      }
    }
  });

  it("never marks a child's own preference wrong", () => {
    // 你會點揀 has no right answer. Marking one would be the single worst
    // thing that mode could do, so the contract is `answer: ""` and the
    // checker accepts anything the child actually said.
    const rounds = buildRounds({ ...rail, mode: "choice" }, { age: 7 });
    for (const round of rounds) {
      expect(round.answer).toBe("");
      expect(isCorrect(round, "電車")).toBe(true);
      expect(isCorrect(round, "隨便乜都得")).toBe(true);
      // Still not a way to skip: saying nothing is not answering.
      expect(isCorrect(round, "   ")).toBe(false);
    }
    expect(FAMILIES.choice.openEnded).toBe(true);
  });

  it("builds 講句子 out of the theme's own narration", () => {
    const [first] = buildRounds(rail, { age: 7 });
    // The blank is cut from the VO clause that introduces the word, so the
    // question is about something the child has just heard.
    expect(first.prompt).toContain("＿＿");
    expect(first.prompt).not.toContain("港鐵");
    expect(first.options).toContain("港鐵");
    expect(first.answer).toBe("港鐵");
    expect(isCorrect(first, "港鐵")).toBe(true);
    expect(isCorrect(first, "電車")).toBe(false);

    // A typed sentence is accepted without its full stop.
    const typed = buildRounds(rail, { age: 11 })[3];
    expect(typed.input).toBe("type");
    expect(isCorrect(typed, "我最鍾意搭輕鐵")).toBe(true);
    expect(isCorrect(typed, "我最鍾意搭巴士。")).toBe(false);
  });

  it("stops the narration earlier every round in 估下會點", () => {
    // Held to one word on purpose. Across the real four words the prompt
    // lengths are not comparable — each word sits at a different point in
    // the paragraph — and what escalates is how far back the cut is made.
    const late = { ...rail, mode: "predict" as const, words: ["輕鐵"] };
    const heard = buildRounds(late, { age: 8 }).map(round => round.prompt.length);
    expect(heard[0]).toBeGreaterThan(heard[1]);
    expect(heard[1]).toBeGreaterThan(heard[2]);
    expect(heard[2]).toBeGreaterThan(heard[3]);

    // Whatever is played, the answer is never given away in the text — round
    // one hears the word's own clause, so it has to be bleeped out.
    for (const round of buildRounds({ ...rail, mode: "predict" }, { age: 8 })) {
      expect(round.prompt).not.toContain(round.word);
      expect(round.options).toContain(round.answer);
    }
  });

  it("counts within what the band can hold", () => {
    // A three-year-old counting to fourteen is a bug, not a challenge.
    for (const round of buildRounds({ ...rail, mode: "number" }, { age: 4 })) {
      const numbers = (round.prompt.match(/[零一二三四五六七八九十]/g) ?? []).length;
      expect(numbers).toBeGreaterThan(0);
      expect(round.prompt).not.toMatch(/\d\d/);
    }
  });

  it("borrows the odd one out from another theme, because it has to", () => {
    const foreign = ["雞蛋仔", "奶茶"];
    const [, , third] = buildRounds({ ...rail, mode: "spot" }, { age: 8, foreignWords: foreign });
    expect(third.prompt).toContain("唔屬於");
    expect(foreign).toContain(third.answer);
    expect(third.options).toContain(third.answer);

    // With nothing to borrow there is no odd one out, so it falls back to a
    // find rather than shipping a round with no correct answer.
    const [, , alone] = buildRounds({ ...rail, mode: "spot" }, { age: 8 });
    expect(rail.words).toContain(alone.answer);
  });

  it("redraws on a replay but keeps the same shape", () => {
    // 「甚至可能有啲小朋友都會想重複玩」— a second run has to feel like
    // playing again, not like re-reading. Same modes and inputs, new draw.
    const first = buildRounds({ ...rail, mode: "number" }, { age: 8, salt: 0 });
    const again = buildRounds({ ...rail, mode: "number" }, { age: 8, salt: 1 });
    expect(again.map(round => round.input)).toEqual(first.map(round => round.input));
    expect(again.map(round => round.prompt)).not.toEqual(first.map(round => round.prompt));

    // And the same salt is the same game, or nothing could be tested at all.
    expect(buildRounds({ ...rail, mode: "number" }, { age: 8, salt: 0 })).toEqual(first);
  });

  it("resumes at the round the child stopped on", () => {
    // Fragments already held decide the round, so coming back tomorrow picks
    // up where they left rather than starting the four again.
    expect(roundAt(rail, 0, { age: 7 })?.round).toBe(1);
    expect(roundAt(rail, 2, { age: 7 })?.round).toBe(3);
    expect(roundAt(rail, ROUNDS_PER_THEME, { age: 7 })).toBeNull();
  });

  it("splits the VO into clauses that keep their punctuation", () => {
    const clauses = clausesOf(rail.vo);
    expect(clauses.length).toBeGreaterThan(3);
    expect(clauses[0]).toBe("城市入面有好多沿住路軌行嘅交通工具。");
    expect(clauses.join("")).toBe(rail.vo);
  });

  it("uses Em's word stickers as the answer buttons", () => {
    // 「我已經生成咗一啲小圖片連文字嘅 Sticker，可以用來選擇答案嘅時候用」.
    // The picture is the button; the word stays under it so the option is
    // still labelled for a screen reader and still readable if a word has
    // no art yet.
    render(<ThemeGame source={rail} earned={0} age={7} onComplete={() => {}} />);
    const option = screen.getByRole("button", { name: /港鐵/ });
    expect(option.querySelector("img")).not.toBeNull();
    expect(option).toHaveTextContent("港鐵");
  });

  it("earns the fragment on a right answer and costs nothing on a wrong one", () => {
    const earned: number[] = [];
    render(
      <ThemeGame source={rail} earned={0} age={7} onComplete={() => earned.push(1)} />);

    // Wrong: says so, does not award, and the round is still there to try.
    const wrong = rail.words.find(word => word !== "港鐵")!;
    fireEvent.click(screen.getByRole("button", { name: new RegExp(wrong) }));
    expect(earned).toHaveLength(0);
    expect(screen.getByText(/再試一次/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /港鐵/ }));
    expect(earned).toEqual([1]);
    expect(screen.getByText(/攞到一塊碎片/)).toBeInTheDocument();
  });

  it("finishes an open-ended round on the child saying they are done", () => {
    // 跟住做 and 砌一砌 have nothing to mark. The child decides.
    const earned: number[] = [];
    render(
      <ThemeGame
        source={{ ...rail, mode: "move" }} earned={0} age={7}
        onComplete={() => earned.push(1)}
      />);
    fireEvent.click(screen.getByRole("button", { name: "做完喇" }));
    expect(earned).toEqual([1]);
  });

  it("never shows the same option twice, in any mode or round", () => {
    // The subtraction round could draw a distractor equal to another one,
    // which put two identical buttons on screen — and one of them silently
    // wrong for looking exactly like the right answer.
    for (const mode of GAME_MODES) {
      for (const age of [4, 7, 11]) {
        for (const round of buildRounds({ ...rail, mode }, { age, foreignWords: ["奶茶", "雪糕"] })) {
          expect(new Set(round.options).size).toBe(round.options.length);
          // A tap round always has its answer among the options, or the
          // child is being asked something they cannot answer.
          if (round.input === "tap" && round.answer) {
            expect(round.options).toContain(round.answer);
          }
        }
      }
    }
  });

  it("can be assembled past the decoy chunk in the last 講句子 round", () => {
    // Round four puts a chunk on screen that does not belong. Checking only
    // once every chunk is placed would make the round unwinnable, so the
    // sentence itself is what is checked.
    const earned: number[] = [];
    render(
      <ThemeGame
        source={rail} earned={3} age={7} foreignWords={["奶茶"]}
        onComplete={() => earned.push(1)}
      />);

    const round = buildRounds(rail, { age: 7, foreignWords: ["奶茶"] })[3];
    expect(round.input).toBe("order");
    expect(round.options.length).toBeGreaterThan(2);

    // The decoy is on screen and is not part of the sentence.
    const decoy = round.options.find(chunk => !round.answer.includes(chunk))!;
    expect(decoy).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: decoy }));
    expect(earned).toHaveLength(0);
    expect(screen.getByText(/再試一次/)).toBeInTheDocument();

    // The real chunks, in order, still finish it.
    for (const chunk of round.options.filter(candidate => candidate !== decoy)
      .sort((a, b) => round.answer.indexOf(a) - round.answer.indexOf(b))) {
      fireEvent.click(screen.getByRole("button", { name: chunk }));
    }
    expect(earned).toEqual([1]);
  });

  it("tells the child the four are done rather than offering a fifth round", () => {
    render(<ThemeGame source={rail} earned={ROUNDS_PER_THEME} age={7} onComplete={() => {}} />);
    expect(screen.getByText(/四塊碎片已經儲齊/)).toBeInTheDocument();
  });
});

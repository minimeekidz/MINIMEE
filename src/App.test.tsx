import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { mintLostToken, mintSlug } from "./lib/kidCardStore";
import { COLLECTIBLES } from "./lib/kidCard";
import { FRAMES, GRID } from "./components/PixelPet";
import { TOWN_BUILDINGS, TOWN_PICKUPS } from "./lib/townMap";

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
}));

vi.mock("./lib/supabase", () => {
  const rowsFor = (table: string) =>
    table === "theme_entitlements" ? billing.entitlements
      : table === "ai_video_jobs" ? billing.jobs
      : table === "mee_cards" ? billing.meeCards
      : table === "kid_tasks" ? billing.kidTasks
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
      update: () => builder,
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve({ data: rowsFor(table), error: null }).then(resolve, reject),
    };
    return builder;
  };

  return {
    supabase: {
      auth: { resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }) },
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
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
  billing.entitlements = [];
  billing.jobs = [];
  createBillingOrder.mockReset().mockResolvedValue({ ok: false, error: "Not authenticated" });
  cancelSubscription.mockReset().mockResolvedValue({ ok: true, data: { currentPeriodEnd: null } });
  createAiVideoJobs.mockReset().mockResolvedValue({ ok: true, data: {} });
});

describe("MINIMEE route shells", () => {
  it("renders the public home page around the kid e-name card idea", () => {
    render(<MemoryRouter initialEntries={["/"]}><App /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: /自我介紹卡/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "睇一張示範卡" })).toHaveAttribute("href", "/kid/mimi");
    expect(screen.getByRole("link", { name: /試玩儲卡小遊戲/ })).toHaveAttribute("href", "/play");
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
    billing.kidCard = {
      id: "card-1", slug: "real-kid", display_name: "小明", age_group: "6-8",
      tagline: "我係小明", about: "", likes: [], dream_job: "",
      scene: null, avatar_url: null, intro_video_url: null, intro_video_poster: null,
      published: true, lost_mode_enabled: true, lost_mode_message: "唔該聯絡我媽咪",
    };
    render(<MemoryRouter initialEntries={["/kid/real-kid"]}><App /></MemoryRouter>);
    expect(await screen.findByRole("heading", { level: 1, name: "小明" })).toBeInTheDocument();
    expect(screen.getByText("唔該聯絡我媽咪")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /聯絡家長/ })).toBeNull();
    expect(screen.getByText(/掃描物品上面嘅 MINIMEE QR 貼紙/)).toBeInTheDocument();
  });

  it("renders a walkable top-down town with all four directions", () => {
    render(<MemoryRouter initialEntries={["/play"]}><App /></MemoryRouter>);
    expect(screen.getByText(/執到 0 \/ 5 張 MEE 卡/)).toBeInTheDocument();
    // Free roam, not a side-scroller: every axis has to be reachable.
    for (const label of ["向上行", "向下行", "向左行", "向右行"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByText("MEE 圖書館")).toBeInTheDocument();
    expect(screen.getByText("Paw Café")).toBeInTheDocument();
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

  it("renders the real town with previously earned cards already taken", async () => {
    billing.kidCard = editableCard({ published: true });
    billing.meeCards = [{ code: "MEE-002" }, { code: "MEE-014" }];
    billing.kidTasks = [
      { id: "t1", title: "介紹你最鍾意嘅動物", detail: "講 30 秒", done: false },
      { id: "t2", title: "已做完嘅嘢", detail: "", done: true },
    ];
    render(<MemoryRouter initialEntries={["/parent/children/demo-child-01/play"]}><App /></MemoryRouter>);

    // Two of five already earned, so the HUD must not offer them again.
    expect(await screen.findByText(/執到 2 \/ 5 張 MEE 卡/)).toBeInTheDocument();
    // Only the open task is actionable.
    expect(screen.getByText("介紹你最鍾意嘅動物")).toBeInTheDocument();
    expect(screen.queryByText("已做完嘅嘢")).toBeNull();
    expect(screen.getByText(/已完成 1 \/ 2 個任務/)).toBeInTheDocument();
  });

  it("locks a collectible's rarity to its code so it cannot be re-rolled", () => {
    // Ops doc rule: a card's number and NORMAL/FLASH status are fixed when
    // earned. Rarity therefore has to be a property of the catalogue entry,
    // never something computed per award.
    const byCode = new Map(COLLECTIBLES.map(item => [item.code, item]));
    expect(byCode.size).toBe(COLLECTIBLES.length);
    expect(byCode.get("MEE-014")?.rarity).toBe("flash");
    expect(byCode.get("MEE-002")?.rarity).toBe("normal");
    for (const item of COLLECTIBLES) expect(item.x).toBeGreaterThan(0);
  });

  it("keeps every pixel sprite frame a perfect square grid", () => {
    // A short row would silently shift the whole sprite, and the walk cycle
    // would tear. Cheap to assert, impossible to eyeball.
    for (const [set, frames] of Object.entries(FRAMES)) {
      expect(frames.length, `${set} needs at least two frames to animate`).toBeGreaterThan(1);
      for (const frame of frames) {
        expect(frame).toHaveLength(GRID);
        for (const row of frame) expect(row).toHaveLength(GRID);
      }
    }
    // The two walk frames must actually differ, or the legs never move.
    expect(FRAMES.down[0].join("")).not.toBe(FRAMES.down[1].join(""));
  });

  it("never spawns the pet on a pickup or inside a building", () => {
    // Spawning on a card would hand out a free collectible on open.
    const spawn = { x: 480, y: 1140, size: 48 };
    const centre = { x: spawn.x + spawn.size / 2, y: spawn.y + spawn.size / 2 };
    for (const pickup of TOWN_PICKUPS) {
      expect(Math.hypot(pickup.x - centre.x, pickup.y - centre.y)).toBeGreaterThan(44);
    }
    const feet = { x: spawn.x, y: spawn.y + spawn.size - 14, w: spawn.size, h: 14 };
    for (const b of TOWN_BUILDINGS) {
      const solid = { x: b.x, y: b.y + b.h * 0.45, w: b.w, h: b.h * 0.55 };
      const clash = feet.x < solid.x + solid.w && feet.x + feet.w > solid.x
        && feet.y < solid.y + solid.h && feet.y + feet.h > solid.y;
      expect(clash, `spawn overlaps ${b.label}`).toBe(false);
    }
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
});

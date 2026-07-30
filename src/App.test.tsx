import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./contexts/AuthContext", () => ({
  useAuth: () => ({
    configured: true,
    loading: false,
    session: { access_token: "test-access-token", user: { id: "test-parent" } },
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

vi.mock("./lib/supabase", () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

describe("MINIMEE route shells", () => {
  it("renders the public home page", () => {
    render(<MemoryRouter initialEntries={["/"]}><App /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: /每次學習/ })).toBeInTheDocument();
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

  it("creates a server checkout but keeps entitlement pending until the webhook", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://checkout.stripe.com/c/pay/test" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<MemoryRouter initialEntries={["/parent/children/demo-child-01/checkout"]}><App /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "建立 Stripe 安全付款頁" }));
    expect(await screen.findByRole("link", { name: "前往 Stripe 付款" })).toHaveAttribute(
      "href",
      "https://checkout.stripe.com/c/pay/test",
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/create-checkout", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer test-access-token" }),
    }));
    vi.unstubAllGlobals();
  });

  it("requires two steps to cancel renewal", () => {
    render(<MemoryRouter initialEntries={["/parent/children/demo-child-01/subscription"]}><App /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "取消續訂" }));
    fireEvent.click(screen.getByRole("button", { name: "繼續" }));
    fireEvent.click(screen.getByRole("button", { name: "確認停止續訂" }));
    expect(screen.getAllByText("已取消續訂").length).toBeGreaterThan(0);
  });

  it("renders actionable synthetic rows in every admin workspace", () => {
    render(<MemoryRouter initialEntries={["/admin/ai-jobs"]}><App /></MemoryRouter>);
    expect(screen.getByText("AI-DEMO-104")).toBeInTheDocument();
    expect(screen.getByText("權益已預留")).toBeInTheDocument();
    expect(screen.getByLabelText("工作台篩選")).toBeInTheDocument();
  });
});

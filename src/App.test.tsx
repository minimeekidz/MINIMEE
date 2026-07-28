import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("MINIMEE route shells", () => {
  it("renders the public home page", () => {
    render(<MemoryRouter initialEntries={["/"]}><App /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: /每次學習/ })).toBeInTheDocument();
  });

  it("renders the parent dashboard with demo disclosure", () => {
    render(<MemoryRouter initialEntries={["/parent/dashboard"]}><App /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "早晨，Em" })).toBeInTheDocument();
    expect(screen.getAllByText("DEMO DATA").length).toBeGreaterThan(0);
  });

  it("keeps missing MEE card assets explicit", () => {
    render(<MemoryRouter initialEntries={["/child/albums"]}><App /></MemoryRouter>);
    expect(screen.getAllByText("缺少正式卡面").length).toBe(20);
  });

  it("shows the three-child independent subscription rule", () => {
    render(<MemoryRouter initialEntries={["/pricing"]}><App /></MemoryRouter>);
    expect(screen.getByText(/最多管理三名小朋友/)).toBeInTheDocument();
    expect(screen.getByText(/每名小朋友都需要獨立訂閱/)).toBeInTheDocument();
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

  it("completes the parent setup only after consent", () => {
    render(<MemoryRouter initialEntries={["/parent/setup"]}><App /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    const next = screen.getByRole("button", { name: /下一步/ });
    expect(next).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(next);
    expect(screen.getByRole("heading", { name: /前台設定已準備/ })).toBeInTheDocument();
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
});

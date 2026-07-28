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
});

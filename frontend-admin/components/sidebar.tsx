"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  ListTodo,
  Bot,
  Receipt,
  Users,
  UserSearch,
  AlertOctagon,
  Wallet,
  Repeat,
  Search,
  Activity,
  ShieldAlert,
  Sparkles,
  ScrollText,
  Package,
  MessageSquare,
  Megaphone,
  FileText,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authLevelLabel } from "@/lib/labels";
import { useAdminAuth } from "@/lib/auth";
import { IdleCountdown } from "@/components/idle-countdown";


interface MenuLeaf {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}
interface MenuGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: MenuLeaf[];
}
type MenuEntry = MenuLeaf | MenuGroup;

function isGroup(e: MenuEntry): e is MenuGroup {
  return (e as MenuGroup).items !== undefined;
}

const MENU: MenuEntry[] = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/ai-assist", label: "AI 업무 도우미", icon: MessageSquare },
  {
    label: "고객·계좌",
    icon: Users,
    items: [
      { href: "/customers", label: "회원 조회", icon: UserSearch },
      { href: "/overdue", label: "연체 관리", icon: AlertOctagon },
      { href: "/accounts", label: "계좌 조회", icon: Wallet },
      { href: "/transactions", label: "거래내역 조회", icon: Receipt },
      { href: "/auto-transfers", label: "자동이체 현황", icon: Repeat },
    ],
  },
  {
    label: "대출 업무",
    icon: Briefcase,
    items: [
      { href: "/loans/review-queue", label: "심사 대기", icon: ListTodo },
      { href: "/loans/decisions", label: "심사 이력", icon: Bot },
      { href: "/loans/contracts", label: "실행 대출", icon: Search },
      { href: "/loans/repayments", label: "상환 관리", icon: Receipt },
    ],
  },
  {
    label: "콘텐츠 관리",
    icon: Package,
    items: [
      { href: "/products", label: "상품 관리", icon: Package },
      { href: "/terms", label: "약관 관리", icon: FileText },
      { href: "/notices", label: "공지·이벤트 관리", icon: Megaphone },
    ],
  },
  {
    label: "운영·감사",
    icon: ShieldAlert,
    items: [
      { href: "/fds", label: "이상거래 조사 (FDS)", icon: ShieldAlert },
      { href: "/health", label: "외부 연동 상태", icon: Activity },
      { href: "/observability", label: "AI 호출 추적 (Phoenix)", icon: Sparkles },
      { href: "/audit", label: "감사 로그", icon: ScrollText },
    ],
  },
];


export function Sidebar() {
  const pathname = usePathname() ?? "";
  const { admin, logout } = useAdminAuth();

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="px-5 py-5">
        <Link href="/dashboard" className="block">
          <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/60">DA-ON BANK</div>
          <div className="mt-0.5 text-lg font-semibold">Admin Console</div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-1.5">
          {MENU.map((entry, idx) => {
            if (isGroup(entry)) {
              return (
                <li key={idx} className="pt-2">
                  <div className="flex items-center gap-2 px-2 py-1 text-[10px] uppercase tracking-wider text-sidebar-foreground/50">
                    <entry.icon className="h-3 w-3" />
                    {entry.label}
                  </div>
                  <ul className="mt-0.5 space-y-0.5">
                    {entry.items.map((leaf) => (
                      <SidebarLink key={leaf.href} leaf={leaf} pathname={pathname} indented />
                    ))}
                  </ul>
                </li>
              );
            }
            return <SidebarLink key={entry.href} leaf={entry} pathname={pathname} />;
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-foreground/10 p-4">
        {admin ? (
          <div className="space-y-2">
            <div className="text-[11px] text-sidebar-foreground/80">
              <div className="font-medium text-sidebar-foreground">{admin.name}</div>
              <div className="font-mono text-[10px] text-sidebar-foreground/60">
                사번 {admin.employee_no} · {authLevelLabel(admin.auth_level_cd)}
              </div>
            </div>
            <IdleCountdown />
            <button
              onClick={() => void logout()}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-sidebar-foreground/20 px-3 py-1.5 text-xs text-sidebar-foreground/80 transition-colors hover:bg-sidebar-foreground/10"
            >
              <LogOut className="h-3 w-3" />
              로그아웃
            </button>
          </div>
        ) : (
          <div className="text-[11px] text-sidebar-foreground/60">로그인 필요</div>
        )}
      </div>
    </aside>
  );
}


function SidebarLink({
  leaf,
  pathname,
  indented = false,
}: {
  leaf: MenuLeaf;
  pathname: string;
  indented?: boolean;
}) {
  const active = pathname === leaf.href || pathname.startsWith(leaf.href + "/");
  return (
    <li>
      <Link
        href={leaf.href}
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
          indented && "ml-2",
          active
            ? "bg-sidebar-accent text-primary-foreground"
            : "text-sidebar-foreground/85 hover:bg-sidebar-foreground/10",
        )}
      >
        <leaf.icon className="h-4 w-4" />
        {leaf.label}
      </Link>
    </li>
  );
}
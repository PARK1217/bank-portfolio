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
  {
    label: "고객·계좌",
    icon: Users,
    items: [
      { href: "/customers", label: "회원 검색", icon: UserSearch },
      { href: "/overdue", label: "연체 추적", icon: AlertOctagon },
      { href: "/accounts", label: "계좌 검색", icon: Wallet },
      { href: "/transactions", label: "거래내역 검색", icon: Receipt },
      { href: "/auto-transfers", label: "자동이체 모니터링", icon: Repeat },
    ],
  },
  {
    label: "대출",
    icon: Briefcase,
    items: [
      { href: "/loans/review-queue", label: "검토 큐", icon: ListTodo },
      { href: "/loans/decisions", label: "AI 의사결정", icon: Bot },
      { href: "/loans/contracts", label: "실행 계약", icon: Search },
      { href: "/loans/repayments", label: "상환 내역", icon: Receipt },
    ],
  },
  {
    label: "콘텐츠",
    icon: Package,
    items: [
      { href: "/products", label: "상품 관리", icon: Package },
      { href: "/notices", label: "공지·이벤트", icon: Megaphone },
      { href: "/terms", label: "약관 관리", icon: FileText },
    ],
  },
  {
    label: "리스크·운영",
    icon: ShieldAlert,
    items: [
      { href: "/fds", label: "의심거래 (FDS)", icon: ShieldAlert },
      { href: "/health", label: "외부망 헬스", icon: Activity },
      { href: "/observability", label: "AI 관측 (Phoenix)", icon: Sparkles },
      { href: "/audit", label: "감사 로그", icon: ScrollText },
    ],
  },
  { href: "/ai-assist", label: "AI 직원 어시스턴트", icon: MessageSquare },
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
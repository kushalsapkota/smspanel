import { useAuth } from "@/hooks/useAuth";
import { MessageSquare, LayoutDashboard, Send, Wallet, Key, FileText, LogOut, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "send-sms", label: "Send SMS", icon: Send },
  { id: "topup", label: "Top Up", icon: Wallet },
  { id: "api-keys", label: "API Keys", icon: Key },
  { id: "sms-logs", label: "SMS Logs", icon: FileText },
];

export function DashboardSidebar({ activeTab, onTabChange }: DashboardSidebarProps) {
  const { signOut, isAdmin, user } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="hidden lg:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex items-center gap-3 p-6 border-b border-sidebar-border">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
          <MessageSquare className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-display font-bold text-sm">SMS Panel</h2>
          <p className="text-xs text-sidebar-foreground/60">Reseller Gateway</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === item.id
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 space-y-2 border-t border-sidebar-border">
        {isAdmin && (
          <button
            onClick={() => navigate("/admin")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-primary hover:bg-sidebar-accent/50 transition-all"
          >
            <Shield className="h-4 w-4" />
            Admin Panel
          </button>
        )}
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-destructive transition-all"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
        <div className="px-3 py-2 text-xs text-sidebar-foreground/40 truncate">
          {user?.email}
        </div>
      </div>
    </aside>
  );
}

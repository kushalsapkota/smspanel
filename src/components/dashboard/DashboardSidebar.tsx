import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MessageSquare, LayoutDashboard, Send, Wallet, Key, FileText, LogOut, Shield, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

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

function NavContent({ activeTab, onTabChange, onClose }: { activeTab: string; onTabChange: (tab: string) => void; onClose?: () => void }) {
  const { signOut, isAdmin, user } = useAuth();
  const navigate = useNavigate();

  const handleTab = (id: string) => {
    onTabChange(id);
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 p-6 border-b border-sidebar-border">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
          <MessageSquare className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-display font-bold text-sm">SMS Panel</h2>
          <p className="text-xs text-sidebar-foreground/60">Reseller Gateway</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === item.id
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 space-y-2 border-t border-sidebar-border">
        {isAdmin && (
          <button onClick={() => { navigate("/admin"); onClose?.(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-primary hover:bg-sidebar-accent/50 transition-all">
            <Shield className="h-4 w-4" /> Admin Panel
          </button>
        )}
        <button onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-destructive transition-all">
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
        <div className="px-3 py-2 text-xs text-sidebar-foreground/40 truncate">{user?.email}</div>
      </div>
    </div>
  );
}

export function DashboardSidebar({ activeTab, onTabChange }: DashboardSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <NavContent activeTab={activeTab} onTabChange={onTabChange} />
      </aside>

      {/* Mobile top bar + sheet */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-sidebar border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
            <MessageSquare className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-sm text-sidebar-foreground">SMS Panel</span>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-sidebar border-sidebar-border">
            <NavContent activeTab={activeTab} onTabChange={onTabChange} onClose={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

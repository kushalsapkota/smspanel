import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { AdminAnalytics } from "@/components/admin/AdminAnalytics";
import { AdminCharts } from "@/components/admin/AdminCharts";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminTopups } from "@/components/admin/AdminTopups";
import { AdminBalanceAdjustment } from "@/components/admin/AdminBalanceAdjustment";
import { AdminSmsLogs } from "@/components/admin/AdminSmsLogs";
import { AdminBlacklist } from "@/components/admin/AdminBlacklist";
import { AdminSettings } from "@/components/admin/AdminSettings";

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!user) return <Navigate to="/auth" />;
  if (!isAdmin) return <Navigate to="/dashboard" />;

  const renderContent = () => {
    switch (activeTab) {
      case "analytics": return <AdminAnalytics />;
      case "charts": return <AdminCharts />;
      case "users": return <AdminUsers />;
      case "topups": return <AdminTopups />;
      case "balance": return <AdminBalanceAdjustment />;
      case "sms-logs": return <AdminSmsLogs />;
      case "blacklist": return <AdminBlacklist />;
      case "settings": return <AdminSettings />;
      default: return <AdminOverview />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 animate-fade-in">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Admin;

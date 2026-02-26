import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { SendSMS } from "@/components/dashboard/SendSMS";
import { TopUpRequests } from "@/components/dashboard/TopUpRequests";
import { ApiKeys } from "@/components/dashboard/ApiKeys";
import { SmsLogs } from "@/components/dashboard/SmsLogs";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!user) return <Navigate to="/auth" />;

  const renderContent = () => {
    switch (activeTab) {
      case "send-sms": return <SendSMS />;
      case "topup": return <TopUpRequests />;
      case "api-keys": return <ApiKeys />;
      case "sms-logs": return <SmsLogs />;
      default: return <DashboardOverview />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 overflow-auto">
        <div className="pt-20 lg:pt-0 p-4 lg:p-8 animate-fade-in">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

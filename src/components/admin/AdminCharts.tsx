import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getSmsVolumeByDate, getSmsStatsByStatus } from "@/lib/analytics";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";

export function AdminCharts() {
  const [smsVolumeData, setSmsVolumeData] = useState<Array<{ date: string; count: number; cost: number }>>([]);
  const [smsStatusData, setSmsStatusData] = useState<Array<{ name: string; value: number }>>([]);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    loadChartData();
  }, [selectedUserId]);

  const loadUsers = async () => {
    // Get all profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name");
    
    // Get emails
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const emailMap = new Map(authUsers?.users.map(u => [u.id, u.email || ""]) || []);
    
    const users = profiles?.map(p => ({
      id: p.user_id,
      name: p.full_name || "Unknown",
      email: emailMap.get(p.user_id) || ""
    })) || [];
    
    setAllUsers(users);
  };

  const loadChartData = async () => {
    setLoading(true);
    try {
      const userId = selectedUserId === "all" ? undefined : selectedUserId;
      
      // Get SMS volume data
      let volumeData: Array<{ date: string; count: number; cost: number }> = [];
      
      if (userId) {
        // Filter by user
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        const { data } = await supabase
          .from("sms_logs")
          .select("created_at, cost")
          .eq("user_id", userId)
          .gte("created_at", startDate.toISOString());
        
        // Group by date
        const dateMap = new Map<string, { count: number; cost: number }>();
        
        data?.forEach((log: any) => {
          const date = new Date(log.created_at).toISOString().split('T')[0];
          const cost = parseFloat(String(log.cost || 0));
          
          if (dateMap.has(date)) {
            const stats = dateMap.get(date)!;
            stats.count += 1;
            stats.cost += cost;
          } else {
            dateMap.set(date, { count: 1, cost });
          }
        });
        
        volumeData = Array.from(dateMap.entries())
          .map(([date, stats]) => ({ date, ...stats }))
          .sort((a, b) => a.date.localeCompare(b.date));
      } else {
        volumeData = await getSmsVolumeByDate(30);
      }
      
      const statsData = await getSmsStatsByStatus(userId);

      setSmsVolumeData(volumeData);
      setSmsStatusData([
        { name: "Sent", value: statsData.sent },
        { name: "Failed", value: statsData.failed },
        { name: "Pending", value: statsData.pending },
      ]);
    } catch (error) {
      console.error("Error loading chart data:", error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = {
    sent: "#10b981", // success green
    failed: "#ef4444", // destructive red
    pending: "#f59e0b", // warning orange
    primary: "#3b82f6", // primary blue
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name === "Cost" || entry.name === "Revenue (€)" ? formatCurrency(entry.value) : formatNumber(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const selectedUserName = selectedUserId === "all" 
    ? "All Users" 
    : allUsers.find(u => u.id === selectedUserId)?.name || "Unknown";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading charts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Analytics Charts</h1>
        
        {/* User Selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">View charts for:</span>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {allUsers.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Show selected user info */}
      {selectedUserId !== "all" && (
        <Card className="glass border-primary/20">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              Showing charts for: <span className="font-semibold text-foreground">{selectedUserName}</span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* SMS Volume Over Time */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="font-display">SMS Volume (Last 30 Days)</CardTitle>
          <CardDescription>Daily SMS count and revenue</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={smsVolumeData}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.sent} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={COLORS.sent} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="count" stroke={COLORS.primary} fillOpacity={1} fill="url(#colorCount)" name="SMS Count" />
              <Area type="monotone" dataKey="cost" stroke={COLORS.sent} fillOpacity={1} fill="url(#colorCost)" name="Revenue (€)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SMS Status Distribution */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="font-display">SMS Status Distribution</CardTitle>
            <CardDescription>Breakdown by status</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={smsStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${ name } ${ (percent * 100).toFixed(0) }% `}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {smsStatusData.map((entry, index) => (
                    <Cell key={`cell - ${ index } `} fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS] || COLORS.primary} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily SMS Bar Chart */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="font-display">Daily SMS Activity</CardTitle>
            <CardDescription>SMS sent per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={smsVolumeData.slice(-14)}> {/* Last 14 days */}
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="count" fill={COLORS.primary} name="SMS Count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="font-display">Revenue Trend</CardTitle>
          <CardDescription>Daily revenue over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={smsVolumeData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="cost" stroke={COLORS.sent} strokeWidth={2} name="Revenue (€)" dot={{ fill: COLORS.sent }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, TrendingUp, Send, AlertCircle, DollarSign } from "lucide-react";
import { formatCurrency, formatPercentage, formatNumber } from "@/lib/formatters";
import { getUserActivityStats, getSmsStatsByStatus, getTotalEarningsData, type UserActivity } from "@/lib/analytics";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export function AdminAnalytics() {
    const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
    const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>("all");
    const [smsStats, setSmsStats] = useState({ total: 0, sent: 0, passed: 0, failed: 0, pending: 0 });
    const [earnings, setEarnings] = useState({ totalRevenue: 0, totalTopups: 0, netRevenue: 0 });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        loadUsers();
    }, []);

    useEffect(() => {
        loadAnalytics();
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

    const loadAnalytics = async () => {
        setLoading(true);
        try {
            const userId = selectedUserId === "all" ? undefined : selectedUserId;

            const [activity, stats] = await Promise.all([
                getUserActivityStats(),
                getSmsStatsByStatus(userId),
            ]);

            // Calculate earnings for selected user
            let earningsData = { totalRevenue: 0, totalTopups: 0, netRevenue: 0 };

            if (userId) {
                // For specific user
                const { data: userTopups } = await supabase
                    .from("topup_requests")
                    .select("amount")
                    .eq("user_id", userId)
                    .eq("status", "approved");

                const totalTopups = userTopups?.reduce((sum, t) => sum + parseFloat(String(t.amount || 0)), 0) || 0;

                const { data: userSms } = await supabase
                    .from("sms_logs")
                    .select("cost")
                    .eq("user_id", userId)
                    .eq("status", "sent");

                const totalRevenue = userSms?.reduce((sum, s) => sum + parseFloat(String(s.cost || 0)), 0) || 0;

                earningsData = {
                    totalRevenue,
                    totalTopups,
                    netRevenue: totalTopups - totalRevenue
                };
            } else {
                // For all users
                const fullEarnings = await getTotalEarningsData();
                earningsData = {
                    totalRevenue: fullEarnings.totalRevenue,
                    totalTopups: fullEarnings.totalTopups,
                    netRevenue: fullEarnings.netRevenue
                };
            }

            // Filter activity if user selected
            const filteredActivity = userId
                ? activity.filter(a => a.userId === userId)
                : activity;

            setUserActivity(filteredActivity);
            setSmsStats(stats);
            setEarnings(earningsData);
        } catch (error) {
            console.error("Error loading analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = userActivity.filter(user =>
        user.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedUserName = selectedUserId === "all"
        ? "All Users"
        : allUsers.find(u => u.id === selectedUserId)?.name || "Unknown";

    const topCards = [
        {
            label: "Total Users Active",
            value: formatNumber(userActivity.length),
            icon: Users,
            color: "text-info"
        },
        {
            label: "Total Revenue",
            value: formatCurrency(earnings.totalRevenue),
            icon: DollarSign,
            color: "text-success"
        },
        {
            label: "Total SMS Sent",
            value: formatNumber(smsStats.sent),
            icon: Send,
            color: "text-primary"
        },
        {
            label: "Success Rate",
            value: formatPercentage(smsStats.total > 0 ? smsStats.sent / smsStats.total : 0),
            icon: TrendingUp,
            color: "text-success"
        },
    ];

    const smsStatusCards = [
        { label: "Total SMS", value: formatNumber(smsStats.total), color: "bg-primary/10 text-primary border-primary/20" },
        { label: "Sent", value: formatNumber(smsStats.sent), color: "bg-success/10 text-success border-success/20" },
        { label: "Passed", value: formatNumber(smsStats.passed), color: "bg-info/10 text-info border-info/20" },
        { label: "Failed", value: formatNumber(smsStats.failed), color: "bg-destructive/10 text-destructive border-destructive/20" },
        { label: "Pending", value: formatNumber(smsStats.pending), color: "bg-warning/10 text-warning border-warning/20" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="font-display text-2xl font-bold">Analytics Dashboard</h1>

                {/* User Selector */}
                <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">View analytics for:</span>
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
                            Showing analytics for: <span className="font-semibold text-foreground">{selectedUserName}</span>
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Top Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {topCards.map((card) => (
                    <Card key={card.label} className="glass hover:shadow-lg transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                            <card.icon className={`h - 5 w - 5 ${ card.color } `} />
                        </CardHeader>
                        <CardContent>
                            <p className="font-display text-2xl font-bold">{card.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* SMS Status Breakdown */}
            <Card className="glass">
                <CardHeader>
                    <CardTitle className="font-display">SMS Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                        {smsStatusCards.map((card) => (
                            <div key={card.label} className="text-center">
                                <Badge variant="outline" className={`${ card.color } px - 4 py - 2 text - lg font - bold w - full`}>
                                    {card.value}
                                </Badge>
                                <p className="text-sm text-muted-foreground mt-2">{card.label}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Earnings Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="glass">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Top-ups</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="font-display text-2xl font-bold text-success">{formatCurrency(earnings.totalTopups)}</p>
                    </CardContent>
                </Card>
                <Card className="glass">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="font-display text-2xl font-bold text-primary">{formatCurrency(earnings.totalRevenue)}</p>
                    </CardContent>
                </Card>
                <Card className="glass">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Net Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={`font - display text - 2xl font - bold ${ earnings.netRevenue >= 0 ? 'text-success' : 'text-destructive' } `}>
                            {formatCurrency(earnings.netRevenue)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* User-based Activity Logs */}
            {selectedUserId === "all" && (
                <Card className="glass">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="font-display">User Activity Logs</CardTitle>
                            <Input
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="max-w-xs"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead className="text-right">Total SMS</TableHead>
                                    <TableHead className="text-right">Total Spent</TableHead>
                                    <TableHead className="text-right">Success Rate</TableHead>
                                    <TableHead>Last Activity</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                            Loading analytics...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                            {searchTerm ? "No users found" : "No activity yet"}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <TableRow key={user.userId}>
                                            <TableCell className="font-medium">{user.userName}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{user.userEmail}</TableCell>
                                            <TableCell className="text-right font-semibold">{formatNumber(user.totalSms)}</TableCell>
                                            <TableCell className="text-right font-semibold">{formatCurrency(user.totalSpent)}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge
                                                    variant="outline"
                                                    className={user.successRate >= 0.9 ? "bg-success/10 text-success border-success/20" : user.successRate >= 0.7 ? "bg-warning/10 text-warning border-warning/20" : "bg-destructive/10 text-destructive border-destructive/20"}
                                                >
                                                    {formatPercentage(user.successRate)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {user.lastActivity ? format(user.lastActivity, "MMM dd, HH:mm") : "—"}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

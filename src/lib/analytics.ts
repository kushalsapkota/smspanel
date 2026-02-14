import { supabase } from "@/integrations/supabase/client";

/**
 * Analytics utility functions for calculating statistics
 */

export interface SmsStats {
    total: number;
    sent: number;
    passed: number;
    failed: number;
    pending: number;
}

export interface UserActivity {
    userId: string;
    userName: string;
    userEmail: string;
    totalSms: number;
    totalSpent: number;
    successRate: number;
    lastActivity: Date | null;
}

export interface EarningsData {
    totalRevenue: number;
    totalTopups: number;
    totalSpent: number;
    netRevenue: number;
    byUser: Array<{
        userId: string;
        userName: string;
        spent: number;
    }>;
}

/**
 * Get SMS statistics by status
 */
export async function getSmsStatsByStatus(userId?: string): Promise<SmsStats> {
    let query = supabase.from("sms_logs").select("status");

    if (userId) {
        query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error || !data) {
        return { total: 0, sent: 0, passed: 0, failed: 0, pending: 0 };
    }

    const stats: SmsStats = {
        total: data.length,
        sent: data.filter(log => log.status === "sent").length,
        passed: data.filter(log => log.status === "sent").length, // For now, passed = sent
        failed: data.filter(log => log.status === "failed").length,
        pending: data.filter(log => log.status === "pending").length,
    };

    return stats;
}

/**
 * Calculate total earnings from all SMS sent
 */
export async function calculateTotalEarnings(): Promise<number> {
    const { data, error } = await supabase
        .from("sms_logs")
        .select("cost")
        .eq("status", "sent");

    if (error || !data) return 0;

    return data.reduce((sum, log) => sum + parseFloat(String(log.cost || 0)), 0);
}

/**
 * Get earnings per user
 */
export async function getEarningsPerUser(): Promise<EarningsData["byUser"]> {
    const { data: logs, error } = await supabase
        .from("sms_logs")
        .select("user_id, cost")
        .eq("status", "sent");

    if (error || !logs) return [];

    // Get unique user IDs
    const userIds = [...new Set(logs.map(log => log.user_id))];

    // Fetch profiles separately
    const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

    const profileMap = (profiles || []).reduce((acc: any, p: any) => {
        acc[p.user_id] = p.full_name || "Unknown";
        return acc;
    }, {});

    // Group by user
    const userMap = new Map<string, { name: string; spent: number }>();

    logs.forEach((log: any) => {
        const userId = log.user_id;
        const cost = parseFloat(log.cost || "0");
        const name = profileMap[userId] || "Unknown";

        if (userMap.has(userId)) {
            userMap.get(userId)!.spent += cost;
        } else {
            userMap.set(userId, { name, spent: cost });
        }
    });

    return Array.from(userMap.entries()).map(([userId, data]) => ({
        userId,
        userName: data.name,
        spent: data.spent,
    }));
}

/**
 * Get total earnings data
 */
export async function getTotalEarningsData(): Promise<EarningsData> {
    const [totalRevenue, byUser] = await Promise.all([
        calculateTotalEarnings(),
        getEarningsPerUser(),
    ]);

    const { data: topups } = await supabase
        .from("topup_requests")
        .select("amount")
        .eq("status", "approved");

    const totalTopups = topups?.reduce((sum, t) => sum + parseFloat(String(t.amount || 0)), 0) || 0;

    return {
        totalRevenue,
        totalTopups,
        totalSpent: totalRevenue,
        netRevenue: totalTopups - totalRevenue,
        byUser,
    };
}

/**
 * Get user activity statistics
 */
export async function getUserActivityStats(): Promise<UserActivity[]> {
    // Get all users with their profiles
    const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, full_name");

    if (profileError || !profiles) return [];

    // Get user emails
    const { data: users } = await supabase.auth.admin.listUsers();
    const userEmails = users?.users.map(u => [u.id, u.email || ""] as [string, string]) || [];
    const emailMap = new Map<string, string>(userEmails);

    // Get SMS logs for each user
    const { data: logs } = await supabase
        .from("sms_logs")
        .select("user_id, cost, status, created_at");

    if (!logs) return [];

    // Group by user
    const userStatsMap = new Map<string, {
        totalSms: number;
        totalSpent: number;
        successCount: number;
        lastActivity: Date | null;
    }>();

    logs.forEach((log: any) => {
        const userId = log.user_id;
        const cost = parseFloat(log.cost || "0");
        const isSuccess = log.status === "sent";
        const createdAt = new Date(log.created_at);

        if (userStatsMap.has(userId)) {
            const stats = userStatsMap.get(userId)!;
            stats.totalSms += 1;
            stats.totalSpent += cost;
            if (isSuccess) stats.successCount += 1;
            if (!stats.lastActivity || createdAt > stats.lastActivity) {
                stats.lastActivity = createdAt;
            }
        } else {
            userStatsMap.set(userId, {
                totalSms: 1,
                totalSpent: cost,
                successCount: isSuccess ? 1 : 0,
                lastActivity: createdAt,
            });
        }
    });

    // Combine data
    return profiles.map(profile => {
        const stats = userStatsMap.get(profile.user_id) || {
            totalSms: 0,
            totalSpent: 0,
            successCount: 0,
            lastActivity: null,
        };

        return {
            userId: profile.user_id,
            userName: profile.full_name || "Unknown",
            userEmail: emailMap.get(profile.user_id) || "",
            totalSms: stats.totalSms,
            totalSpent: stats.totalSpent,
            successRate: stats.totalSms > 0 ? stats.successCount / stats.totalSms : 0,
            lastActivity: stats.lastActivity,
        };
    }).filter(u => u.totalSms > 0); // Only users with activity
}

/**
 * Get SMS volume by date range
 */
export async function getSmsVolumeByDate(days: number = 30): Promise<Array<{ date: string; count: number; cost: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
        .from("sms_logs")
        .select("created_at, cost")
        .gte("created_at", startDate.toISOString());

    if (error || !data) return [];

    // Group by date
    const dateMap = new Map<string, { count: number; cost: number }>();

    data.forEach((log: any) => {
        const date = new Date(log.created_at).toISOString().split('T')[0];
        const cost = parseFloat(log.cost || "0");

        if (dateMap.has(date)) {
            const stats = dateMap.get(date)!;
            stats.count += 1;
            stats.cost += cost;
        } else {
            dateMap.set(date, { count: 1, cost });
        }
    });

    return Array.from(dateMap.entries())
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

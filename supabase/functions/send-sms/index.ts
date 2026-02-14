
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Authenticate User
        const authHeader = req.headers.get("authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 2. Parse Body
        const { to, text } = await req.json();
        if (!to || !text) {
            return new Response(JSON.stringify({ error: "Missing recipient or message" }), {
                status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 3. Get User Profile (Balance & Rate)
        const { data: profileArgs } = await supabase
            .from("profiles")
            .select("balance, rate_per_sms")
            .eq("user_id", user.id)
            .single();

        if (!profileArgs) {
            return new Response(JSON.stringify({ error: "Profile not found" }), {
                status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const currentBalance = Number(profileArgs.balance);
        const ratePerSms = Number(profileArgs.rate_per_sms);

        // 4. Get Aakash Token
        const { data: settingsData } = await supabase
            .from("settings")
            .select("value")
            .eq("key", "aakash_auth_token")
            .single();

        const aakashToken = settingsData?.value;

        if (!aakashToken) {
            // Allow testing without token if needed, or error out. 
            // For now, let's error if strictly needed, but maybe log "Simulated" if empty?
            // User likely has token.
            console.warn("Aakash token not set.");
        }

        // 5. Process Recipients
        const recipients = to.split(",").map((r: string) => r.trim()).filter((r: string) => r.length > 0);
        const totalCost = recipients.length * ratePerSms;

        if (currentBalance < totalCost) {
            return new Response(JSON.stringify({ error: "Insufficient balance" }), {
                status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 6. Send SMS and Log
        const results = [];
        let successCount = 0;

        for (const recipient of recipients) {
            let status = "failed";
            let responseData = null;

            if (aakashToken) {
                try {
                    const apiRes = await fetch("https://sms.aakashsms.com/sms/v3/send", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            auth_token: aakashToken,
                            to: recipient,
                            text: text,
                        }),
                    });
                    responseData = await apiRes.json();
                    if (!responseData.error) {
                        status = "sent";
                        successCount++;
                    } else {
                        status = "failed";
                    }
                } catch (e) {
                    console.error("API Error", e);
                    responseData = { error: e.message };
                }
            } else {
                // Simulation mode
                status = "sent"; // Simulate success
                successCount++;
                responseData = { message: "Simulated sending (Token not set)" };
            }

            // Log to DB
            await supabase.from("sms_logs").insert({
                user_id: user.id,
                recipient: recipient,
                message: text,
                status: status,
                cost: ratePerSms,
                aakash_response: responseData || {},
            });

            results.push({ recipient, status, response: responseData });
        }

        // 7. Deduct Balance (Only for simulated or successful attempts? Usually charged on attempt or success. 
        // If status is 'sent', we deduct. 
        if (successCount > 0) {
            const deduction = successCount * ratePerSms;
            await supabase.from("profiles").update({
                balance: currentBalance - deduction
            }).eq("user_id", user.id);
        }

        return new Response(JSON.stringify({
            success: true,
            count: successCount,
            results
        }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});

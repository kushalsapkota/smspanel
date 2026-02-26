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

    // Verify admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { request_id, status, user_id, amount } = await req.json();

    // Update topup request
    await supabase.from("topup_requests").update({
      status,
      processed_by: user.id,
      processed_at: new Date().toISOString(),
    }).eq("id", request_id);

    // If approved, add balance
    if (status === "approved") {
      const { data: profile } = await supabase.from("profiles").select("balance").eq("user_id", user_id).single();
      if (profile) {
        await supabase.from("profiles").update({
          balance: parseFloat(profile.balance) + parseFloat(amount),
        }).eq("user_id", user_id);
      }
    }

    // Send Telegram notification
    const { data: tgSettings } = await supabase.from("settings").select("*").in("key", ["telegram_bot_token", "telegram_chat_id"]);
    const tgMap: Record<string, string> = {};
    tgSettings?.forEach((s: any) => { tgMap[s.key] = s.value; });

    if (tgMap.telegram_bot_token && tgMap.telegram_chat_id) {
      const emoji = status === "approved" ? "✅" : "❌";
      const msg = `${emoji} *Top-Up ${status.charAt(0).toUpperCase() + status.slice(1)}*\nUser ID: \`${user_id}\`\nAmount: Rs. ${amount}\nProcessed by: ${user.email}`;
      
      await fetch(`https://api.telegram.org/bot${tgMap.telegram_bot_token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: tgMap.telegram_chat_id,
          text: msg,
          parse_mode: "Markdown",
        }),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

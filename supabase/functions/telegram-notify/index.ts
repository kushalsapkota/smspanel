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

    const { type, amount, user_email } = await req.json();

    // Get telegram settings
    const { data: tgSettings } = await supabase.from("settings").select("*").in("key", ["telegram_bot_token", "telegram_chat_id"]);
    const tgMap: Record<string, string> = {};
    tgSettings?.forEach((s: any) => { tgMap[s.key] = s.value; });

    if (!tgMap.telegram_bot_token || !tgMap.telegram_chat_id) {
      return new Response(JSON.stringify({ success: false, message: "Telegram not configured" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let message = "";
    if (type === "topup_request") {
      message = `💰 *New Top-Up Request*\nUser: ${user_email}\nAmount: Rs. ${amount}\n\nPlease review in admin panel.`;
    } else {
      message = `📢 ${type}: ${JSON.stringify({ amount, user_email })}`;
    }

    await fetch(`https://api.telegram.org/bot${tgMap.telegram_bot_token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: tgMap.telegram_chat_id,
        text: message,
        parse_mode: "Markdown",
      }),
    });

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

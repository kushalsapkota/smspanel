import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

// SMS Provider: Aakash SMS (Nepal)
async function sendViaAakash(authToken: string, recipient: string, message: string) {
  const response = await fetch("https://sms.aakashsms.com/sms/v3/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: authToken,
      to: recipient,
      text: message,
    }),
  });
  return await response.json();
}

// SMS Provider: Global ZMS (India)
async function sendViaGlobalZMS(
  apiToken: string,
  senderId: string,
  recipient: string,
  message: string
) {
  const response = await fetch("https://globalzms.com/api/http/sms/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      api_token: apiToken,
      recipient: recipient,
      sender_id: senderId,
      type: "plain",
      message: message,
    }),
  });
  return await response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { to, text } = await req.json();
    if (!to || !text) {
      return new Response(JSON.stringify({ error: true, message: "Missing 'to' or 'text'" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine user: either from auth header or x-api-key
    let userId: string | null = null;
    const apiKey = req.headers.get("x-api-key");
    const authHeader = req.headers.get("authorization");

    if (apiKey) {
      const { data: keyData } = await supabase
        .from("api_keys")
        .select("user_id, is_active")
        .eq("api_key", apiKey)
        .single();
      if (!keyData || !keyData.is_active) {
        return new Response(JSON.stringify({ error: true, message: "Invalid or inactive API key" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = keyData.user_id;
      // Update last_used_at
      await supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("api_key", apiKey);
    } else if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ error: true, message: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = user.id;
    } else {
      return new Response(JSON.stringify({ error: true, message: "No authentication provided" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profile with gateway assignment
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, full_name, balance, rate_per_sms, is_active, sms_gateway, country")
      .eq("user_id", userId)
      .single();

    if (!profile || !profile.is_active) {
      return new Response(JSON.stringify({ error: true, message: "Account inactive" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check blacklist
    const { data: blacklistWords } = await supabase.from("blacklist_words").select("word");
    const lowerText = text.toLowerCase();
    const blocked = blacklistWords?.find((w: any) => lowerText.includes(w.word));
    if (blocked) {
      // Notify admin via telegram
      const { data: tgSettings } = await supabase.from("settings").select("*").in("key", ["telegram_bot_token", "telegram_chat_id"]);
      const tgMap: Record<string, string> = {};
      tgSettings?.forEach((s: any) => { tgMap[s.key] = s.value; });
      if (tgMap.telegram_bot_token && tgMap.telegram_chat_id) {
        await fetch(`https://api.telegram.org/bot${tgMap.telegram_bot_token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: tgMap.telegram_chat_id,
            text: `🚫 *Blacklisted Content Detected*\\nUser: ${profile.full_name || 'Unknown'} (${userId})\\nBlocked word: "${blocked.word}"\\nMessage: ${text.substring(0, 100)}`,
            parse_mode: "Markdown",
          }),
        });
      }
      return new Response(JSON.stringify({ error: true, message: "Message contains blocked content" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate cost
    const numbers = to.split(",").map((n: string) => n.trim()).filter(Boolean);
    const cost = numbers.length * parseFloat(profile.rate_per_sms);

    if (parseFloat(profile.balance) < cost) {
      return new Response(JSON.stringify({ error: true, message: "Insufficient balance" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine which gateway to use based on user's assignment
    const gateway = profile.sms_gateway || 'aakash';
    let gatewayResponse: any;
    let smsStatus: string;

    if (gateway === 'globalzms') {
      // Get Global ZMS settings
      const { data: globalzmsSettings } = await supabase
        .from("settings")
        .select("*")
        .in("key", ["globalzms_api_token", "globalzms_sender_id"]);

      const settingsMap: Record<string, string> = {};
      globalzmsSettings?.forEach((s: any) => { settingsMap[s.key] = s.value; });

      if (!settingsMap.globalzms_api_token) {
        return new Response(JSON.stringify({ error: true, message: "Global ZMS not configured" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Send via Global ZMS
      gatewayResponse = await sendViaGlobalZMS(
        settingsMap.globalzms_api_token,
        settingsMap.globalzms_sender_id || "SMS",
        to,
        text
      );
      smsStatus = gatewayResponse.status === "success" ? "sent" : "failed";
    } else {
      // Get Aakash token
      const { data: aakashSetting } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "aakash_auth_token")
        .single();

      if (!aakashSetting?.value) {
        return new Response(JSON.stringify({ error: true, message: "Aakash SMS not configured" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Send via Aakash SMS
      gatewayResponse = await sendViaAakash(aakashSetting.value, to, text);
      smsStatus = gatewayResponse.error === false ? "sent" : "failed";
    }

    // Deduct balance only on success
    if (smsStatus === "sent") {
      await supabase.from("profiles").update({
        balance: parseFloat(profile.balance) - cost,
      }).eq("user_id", userId);
    }

    // Log the SMS with gateway information
    await supabase.from("sms_logs").insert({
      user_id: userId,
      recipient: to,
      message: text,
      status: smsStatus,
      cost: smsStatus === "sent" ? cost : 0,
      recipient_count: numbers.length,
      gateway_used: gateway,
      gateway_response: gatewayResponse,
    });

    return new Response(JSON.stringify({
      error: smsStatus === "failed",
      message: smsStatus === "sent" ? "SMS sent successfully" : (gatewayResponse.message || "Failed to send"),
      data: gatewayResponse.data || gatewayResponse,
      gateway: gateway,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: true, message: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

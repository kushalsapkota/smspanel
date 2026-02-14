import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { X, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotificationBanner() {
    // Notifications feature disabled - table doesn't exist
    // To enable: create notifications table in database
    return null;
}

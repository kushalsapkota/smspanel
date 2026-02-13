import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { X, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotificationBanner() {
    const [notification, setNotification] = useState<{ id: string; message: string } | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [shouldFlash, setShouldFlash] = useState(false);

    useEffect(() => {
        loadNotification();
    }, []);

    const loadNotification = async () => {
        try {
            const { data, error } = await supabase
                .from("notifications")
                .select("id, message")
                .eq("is_enabled", true)
                .order("updated_at", { ascending: false })
                .limit(1)
                .single();

            if (error) {
                console.error("Error loading notification:", error);
                return;
            }

            if (data) {
                // Check if this notification was previously dismissed
                const dismissedId = localStorage.getItem("dismissedNotificationId");

                if (dismissedId !== data.id) {
                    setNotification(data);
                    setIsVisible(true);
                    setShouldFlash(true);

                    // Stop flash animation after 3 seconds
                    setTimeout(() => setShouldFlash(false), 3000);
                }
            }
        } catch (error) {
            console.error("Error loading notification:", error);
        }
    };

    const handleDismiss = () => {
        if (notification) {
            localStorage.setItem("dismissedNotificationId", notification.id);
            setIsVisible(false);
        }
    };

    if (!isVisible || !notification) {
        return null;
    }

    return (
        <Card
            className={`glass border-primary/20 mb-4 overflow-hidden ${shouldFlash ? "animate-flash" : ""
                }`}
        >
            <CardContent className="p-0">
                <div className="flex items-center gap-3 py-3 px-4 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10">
                    <Bell className="h-5 w-5 text-primary flex-shrink-0" />

                    <div className="flex-1 overflow-hidden">
                        <div className="animate-scroll whitespace-nowrap">
                            <span className="text-sm font-medium">{notification.message}</span>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDismiss}
                        className="flex-shrink-0 h-8 w-8 p-0"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>

            <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        
        @keyframes flash {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 0 rgba(59, 130, 246, 0);
          }
          50% {
            opacity: 0.9;
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
          }
        }
        
        .animate-scroll {
          display: inline-block;
          animation: scroll 20s linear infinite;
        }
        
        .animate-flash {
          animation: flash 1s ease-in-out 3;
        }
      `}</style>
        </Card>
    );
}

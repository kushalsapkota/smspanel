import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Currency {
    symbol: string;
    code: string;
}

/**
 * Hook to fetch and manage currency settings from the database
 * @returns Currency object with symbol and code
 */
export function useCurrency() {
    const [currency, setCurrency] = useState<Currency>({
        symbol: "₹",
        code: "INR"
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCurrency();

        // Subscribe to settings changes
        const subscription = supabase
            .channel('currency-settings')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'settings',
                    filter: 'key=in.(currency_symbol,currency_code)'
                },
                () => {
                    loadCurrency();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const loadCurrency = async () => {
        try {
            const { data, error } = await supabase
                .from("settings")
                .select("key, value")
                .in("key", ["currency_symbol", "currency_code"]);

            if (error) throw error;

            if (data && data.length > 0) {
                const currencyMap: Record<string, string> = {};
                data.forEach((setting) => {
                    currencyMap[setting.key] = setting.value;
                });

                setCurrency({
                    symbol: currencyMap.currency_symbol || "₹",
                    code: currencyMap.currency_code || "INR"
                });
            }
        } catch (error) {
            console.error("Error loading currency settings:", error);
        } finally {
            setLoading(false);
        }
    };

    return { currency, loading };
}

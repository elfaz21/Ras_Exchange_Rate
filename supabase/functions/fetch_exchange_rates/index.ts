import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { supabase } from "../../../createCLient.ts";

export async function fetchExchangeRates() {
  try {
    const apiUrl = "http://your-api.com/exchange-rates";
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const exchangeRates = await response.json();

    if (!Array.isArray(exchangeRates)) {
      throw new Error("Invalid API response format");
    }

    const promises = exchangeRates.map(async (rate) => {
      const { swift_code, currency_code, buying_rate, selling_rate } = rate;

      // Fetch bank using swift_code
      const { data: bank, error: bankError } = await supabase
        .from("banks")
        .select("id")
        .eq("swift_code", swift_code)
        .single();

      // Fetch currency using currency_code
      const { data: currency, error: currencyError } = await supabase
        .from("currencies")
        .select("id")
        .eq("currency_code", currency_code)
        .single();

      if (bankError || currencyError) {
        console.error(
          `Error fetching bank or currency: ${
            bankError?.message || currencyError?.message
          }`
        );
        return; // Skip this iteration
      }

      const bankId = bank?.id;
      const currencyId = currency?.id;

      if (!bankId || !currencyId) {
        console.error(
          `Bank ID or Currency ID not found for swift_code: ${swift_code}, currency_code: ${currency_code}`
        );
        return;
      }

      // Insert or update exchange rate
      const { error: upsertError } = await supabase
        .from("exchange_rates")
        .upsert({
          bank_id: bankId,
          currency_id: currencyId,
          buying_rate,
          selling_rate,
        });

      if (upsertError) {
        console.error("Error upserting exchange rate:", upsertError.message);
      }
    });

    // Wait for all promises to complete
    await Promise.all(promises);

    return new Response(
      `${exchangeRates.length} exchange rates fetched and stored.`,
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching or inserting exchange rates:", error);
    return new Response("Error occurred while processing exchange rates.", {
      status: 500,
    });
  }
}

// Serve the function
serve(async () => {
  return await fetchExchangeRates();
});

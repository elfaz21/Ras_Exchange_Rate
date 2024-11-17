import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { supabase } from "../../createCLient.ts";

async function fetchExchangeRates() {
  try {
    const apiUrl = "apiUrl/exchange-rates";
    const response = await fetch(apiUrl);
    const exchangeRates = await response.json();

    if (!Array.isArray(exchangeRates)) {
      throw new Error("Invalid API response format");
    }

    for (const rate of exchangeRates) {
      const { swift_code, currency_code, buying_rate, selling_rate } = rate;

      // Fetch bank using swift_code
      const bank = await supabase
        .from("banks")
        .select("id")
        .eq("swift_code", swift_code)
        .single();

      // Fetch currency using currency_code
      const currency = await supabase
        .from("currencies")
        .select("id")
        .eq("currency_code", currency_code)
        .single();

      if (bank.error || currency.error) {
        console.error(
          `Error fetching bank or currency: ${
            bank.error?.message || currency.error?.message
          }`
        );
        continue;
      }

      const bankId = bank.data?.id;
      const currencyId = currency.data?.id;

      // Insert or update exchange rate
      const { error } = await supabase.from("exchange_rates").upsert({
        bank_id: bankId,
        currency_id: currencyId,
        buying_rate,
        selling_rate,
      });

      if (error) {
        console.error("Error upserting exchange rate:", error.message);
      }
    }
  } catch (error) {
    console.error("Error fetching or inserting exchange rates:", error);
  }
}

// Serve the function
serve(() => {
  fetchExchangeRates();
  return new Response("Exchange rates fetched and stored!", { status: 200 });
});

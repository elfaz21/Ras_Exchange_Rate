import { supabase } from "../../createCLient.ts";
import {
  sampleBanks,
  sampleCurrencies,
  sampleExchangeRates,
} from "../../data/sampleData.ts";

async function insertSampleData2() {
  // Insert Banks
  for (const bank of sampleBanks) {
    const { data, error } = await supabase.from("banks").upsert(bank, {
      onConflict: ["swift_code"],
      returning: "representation",
    });

    if (error) {
      console.error("Error inserting bank:", error.message);
    } else if (data) {
      console.log(`Inserted Bank: ${data[0].name}`);
    }
  }

  // Insert Currencies
  for (const currency of sampleCurrencies) {
    const { data, error } = await supabase.from("currencies").upsert(currency, {
      onConflict: ["currency_code"],
      returning: "representation",
    });

    if (error) {
      console.error("Error inserting currency:", error.message);
    } else if (data) {
      console.log(`Inserted Currency: ${data[0].name}`);
    }
  }

  // Insert Exchange Rates
  for (const exchangeRate of sampleExchangeRates) {
    // Fetch bank ID by swift_code
    const bankRes = await supabase
      .from("banks")
      .select("id")
      .eq("swift_code", exchangeRate.swift_code)
      .single();

    // Fetch currency ID
    const currencyRes = await supabase
      .from("currencies")
      .select("id")
      .eq("currency_code", exchangeRate.currency_code)
      .single();

    if (bankRes.error || currencyRes.error) {
      console.error(
        "Error fetching bank or currency IDs:",
        bankRes.error || currencyRes.error
      );
      continue;
    }

    const bankId = bankRes.data.id;
    const currencyId = currencyRes.data.id;

    // Insert or update exchange rate
    const { data, error } = await supabase.from("exchange_rates").upsert(
      {
        bank_id: bankId,
        currency_id: currencyId,
        buying_rate: exchangeRate.buying_rate,
        selling_rate: exchangeRate.selling_rate,
      },
      {
        onConflict: ["bank_id", "currency_id", "date"],
        returning: "representation",
      }
    );

    if (error) {
      console.error("Error inserting/updating exchange rate:", error.message);
    } else if (data) {
      console.log(
        `Inserted/Updated Exchange Rate: ${exchangeRate.swift_code} - ${exchangeRate.currency_code}`
      );
    }
  }
}

// Trigger data insertion
Deno.serve(async (): Promise<Response> => {
  try {
    await insertSampleData2();
    return new Response("Sample data inserted successfully!", { status: 200 });
  } catch (error) {
    console.error("Error in Edge function:", error);
    return new Response("Error inserting sample data.", { status: 500 });
  }
});

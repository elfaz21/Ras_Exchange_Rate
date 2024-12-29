// deno-lint-ignore-file
import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js";
import * as cheerio from "https://cdn.skypack.dev/cheerio";
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { config } from "https://deno.land/x/dotenv@v3.2.2/mod.ts";

const env = config();
const SUPABASE_URL = env.SUPABASE_URL || Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface ExchangeRate {
  ethioBanks: string;
  currency_code: string;
  buying_rate: number;
  selling_rate: number;
  lastUpdated: string;
}

export async function fetchExchangeRates(): Promise<Response> {
  const startTime = Date.now();

  try {
    const url = "https://banksethiopia.com/ethiopian-birr-exchange-rate/";

    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        `Failed to fetch from URL: ${url}, Status: ${response.status}`,
      );
      return new Response(
        JSON.stringify({ error: "Failed to fetch exchange rates." }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const exchangeRateData: ExchangeRate[] = [];

    $("table").each((_: any, table: any) => {
      const ethioBanks = $(table).find("thead h3 a").text().trim() ||
        "Unknown Bank";
      if (ethioBanks === "Unknown Bank") return;

      const lastUpdated = $(table).find(".mobile_date_updated").text().replace(
        "Last Updated ",
        "",
      ).trim();

      $(table).find("tbody tr").each((_: any, row: any) => {
        const currencyElement = $(row).find("td").eq(0).find("p").first();
        const currencyCode = currencyElement.next("p").first().text().trim();
        const buyingRate = parseFloat(
          $(row).find("td").eq(1).text().replace(",", "").trim(),
        );
        const sellingRate = parseFloat(
          $(row).find("td").eq(2).text().replace(",", "").trim(),
        );

        if (currencyCode && !isNaN(buyingRate) && !isNaN(sellingRate)) {
          exchangeRateData.push({
            ethioBanks,
            currency_code: currencyCode,
            buying_rate: buyingRate,
            selling_rate: sellingRate,
            lastUpdated,
          });
        }
      });
    });

    if (exchangeRateData.length === 0) {
      return new Response(
        JSON.stringify({ error: "No exchange rate data found." }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    const today = new Date().toISOString().split("T")[0];

    // Batch Fetch Bank IDs
    const uniqueBanks = [
      ...new Set(exchangeRateData.map((rate) => rate.ethioBanks)),
    ];
    const bankResponse = await supabase.from("banks").select("id, ethio_banks")
      .in("ethio_banks", uniqueBanks);
    if (bankResponse.error) throw bankResponse.error;
    const bankMap = Object.fromEntries(
      bankResponse.data.map((
        bank: { ethio_banks: any; id: any },
      ) => [bank.ethio_banks, bank.id]),
    );

    // Batch Fetch Currency IDs
    const uniqueCurrencies = [
      ...new Set(exchangeRateData.map((rate) => rate.currency_code)),
    ];
    const currencyResponse = await supabase.from("currencies").select(
      "id, currency_code",
    ).in("currency_code", uniqueCurrencies);
    if (currencyResponse.error) throw currencyResponse.error;
    const currencyMap = Object.fromEntries(
      currencyResponse.data.map((
        currency: { currency_code: any; id: any },
      ) => [currency.currency_code, currency.id]),
    );

    // Prepare Data for Upsert
    const upsertData = exchangeRateData.map((rate) => ({
      bank_id: bankMap[rate.ethioBanks],
      currency_id: currencyMap[rate.currency_code],
      buying_rate: rate.buying_rate,
      selling_rate: rate.selling_rate,
      last_updated: rate.lastUpdated,
    })).filter((item) => item.bank_id && item.currency_id);

    // Batch Upsert
    const upsertResponse = await supabase
      .from("exchange_rates")
      .upsert(upsertData, {
        onConflict: ["bank_id", "currency_id", "data_fetched_date"],
      });

    if (upsertResponse.error) {
      console.error(
        "Error upserting exchange rates:",
        upsertResponse.error.message,
      );
    }

    // Return formatted JSON response
    return new Response(
      JSON.stringify(exchangeRateData, null, 2),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: "An error occurred while processing exchange rates.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

// Serve the function
serve(async (req) => {
  const response = await fetchExchangeRates();

  return response;
});

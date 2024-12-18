// deno-lint-ignore-file
import * as cheerio from "https://cdn.skypack.dev/cheerio";
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { supabase } from "../../../createCLient.ts";

interface ExchangeRate {
  fx_ethio: string;
  currency_code: string;
  buying_rate: number;
  selling_rate: number;
}

// Scrape exchange rates
export async function fetchAndStoreExchangeRates(): Promise<Response> {
  try {
    const url = "https://fxethio.com/";
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    // Parse HTML content with Cheerio
    const html = await response.text();
    const $ = cheerio.load(html);

    const exchangeRateData: ExchangeRate[] = [];

    // Extract currency data
    const currencyData: { currencyPair: string; lastUpdated: string }[] = [];

    $("div.flex.p-3").each((i: number, element: any) => {
      const currencyPair = $(element).find("h2").text().trim();
      const lastUpdated = $(element).find("small").text().trim();

      if (currencyPair && lastUpdated) {
        currencyData.push({ currencyPair, lastUpdated });
      }
    });

    // Fetch currency codes and bank names from Supabase
    const { data: currencyDataResponse, error: currencyError } = await supabase
      .from("currencies")
      .select("id, currency_code");

    if (currencyError) throw currencyError;

    const { data: bankData, error: bankError } = await supabase
      .from("banks")
      .select("id, fx_ethio");

    if (bankError) throw bankError;

    const currencyMap = Object.fromEntries(
      currencyDataResponse.map((item: { currency_code: any; id: any }) => [
        item.currency_code,
        item.id,
      ])
    );
    const bankMap = Object.fromEntries(
      bankData.map((item: { fx_ethio: any; id: any }) => [
        item.fx_ethio,
        item.id,
      ])
    );

    // Extract exchange rates from tables
    $("table").each((index: number, table: any) => {
      // Ensure index is of type number
      const currencyCode = currencyData[index]?.currencyPair.split("/")[0];

      $(table)
        .find("tbody tr")
        .each((i: number, tr: any) => {
          // Ensure i is of type number
          const bankName = $(tr).find("td").first().text().trim();
          const buyingRate = $(tr).find("td").eq(1).text().trim();
          const sellingRate = $(tr).find("td").eq(2).text().trim();

          const bankId = bankMap[bankName];
          const currencyId = currencyMap[currencyCode];

          if (bankId && currencyId) {
            exchangeRateData.push({
              fx_ethio: bankName,
              currency_code: currencyCode,
              buying_rate: parseFloat(buyingRate.replace(",", "")),
              selling_rate: parseFloat(sellingRate.replace(",", "")),
            });
          }
        });
    });

    if (exchangeRateData.length === 0) {
      return new Response("No exchange rate data found.", { status: 404 });
    }

    // Store the data in Supabase
    const promises = exchangeRateData.map(async (rate) => {
      const { fx_ethio, currency_code, buying_rate, selling_rate } = rate;

      try {
        // Fetch the bank ID
        const { data: bankData, error: bankError } = await supabase
          .from("banks")
          .select("id")
          .eq("fx_ethio", fx_ethio)
          .single();

        if (bankError || !bankData) {
          console.error(
            "Error fetching bank:",
            bankError?.message || "Unknown error"
          );
          return;
        }

        const bankId = bankData.id;

        // Fetch the currency ID
        const { data: currencyDataResponse, error: currencyError } =
          await supabase
            .from("currencies")
            .select("id")
            .eq("currency_code", currency_code)
            .single();

        if (currencyError || !currencyDataResponse) {
          console.error(
            "Error fetching currency:",
            currencyError?.message || "Unknown error"
          );
          return;
        }

        const currencyId = currencyDataResponse.id;

        // Check if the exchange rate already exists
        const { data: existingRate, error: existingRateError } = await supabase
          .from("exchange_rates")
          .select("*")
          .eq("bank_id", bankId)
          .eq("currency_id", currencyId)
          .single();

        if (existingRate) {
          // Update the existing exchange rate
          const { error: updateError } = await supabase
            .from("exchange_rates")
            .update({ buying_rate, selling_rate })
            .eq("id", existingRate.id);

          if (updateError) {
            console.error("Error updating exchange rate:", updateError.message);
          }
        } else {
          // Insert new exchange rate
          const { error: insertError } = await supabase
            .from("exchange_rates")
            .insert({
              bank_id: bankId,
              currency_id: currencyId,
              buying_rate,
              selling_rate,
            });

          if (insertError) {
            console.error(
              "Error inserting exchange rate:",
              insertError.message
            );
          }
        }
      } catch (error) {
        console.error("Unexpected error while processing rate:", error);
      }
    });

    // Wait for all promises to resolve
    await Promise.all(promises);

    // Generate HTML response
    const groupedData = exchangeRateData.reduce((acc, rate) => {
      if (!acc[rate.fx_ethio]) {
        acc[rate.fx_ethio] = [];
      }
      acc[rate.fx_ethio].push(rate);
      return acc;
    }, {} as Record<string, ExchangeRate[]>);

    const htmlResponse = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Exchange Rates</title>
          <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              h1 { text-align: center; }
          </style>
      </head>
      <body>
          <h1>Exchange Rates</h1>
          ${Object.entries(groupedData)
            .map(
              ([bankName, rates]) => `
              <h2>${bankName}</h2>
              <table>
                  <thead>
                      <tr>
                          <th>Currency Code</th>
                          <th>Buying Rate</th>
                          <th>Selling Rate</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${rates
                        .map(
                          (rate) => `
                          <tr>
                              <td>${rate.currency_code}</td>
                              <td>${rate.buying_rate}</td>
                              <td>${rate.selling_rate}</td>
                          </tr>
                      `
                        )
                        .join("")}
                  </tbody>
              </table>
            `
            )
            .join("")}
      </body>
      </html>
    `;

    return new Response(htmlResponse, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("Error fetching or inserting exchange rates:", error);
    return new Response("Error occurred while processing exchange rates.", {
      status: 500,
    });
  }
}

// Serve the function
serve(async () => {
  return await fetchAndStoreExchangeRates();
});

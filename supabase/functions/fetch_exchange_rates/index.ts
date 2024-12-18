// deno-lint-ignore-file
import * as cheerio from "https://cdn.skypack.dev/cheerio";
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { supabase } from "../../../createCLient.ts";

interface ExchangeRate {
  ethio_banks: string;
  currency_code: string;
  buying_rate: number;
  selling_rate: number;
}

// Scrape exchange rates
export async function fetchExchangeRates(): Promise<Response> {
  try {
    const url = "https://banksethiopia.com/ethiopian-birr-exchange-rate/";
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    // Parse HTML content with Cheerio
    const html = await response.text();
    const $ = cheerio.load(html);

    const exchangeRateData: ExchangeRate[] = [];

    // Scrape tables for each bank and extract the exchange rate data
    $("table").each((index: any, table: any) => {
      const ethioBanks =
        $(table).find("thead h3 a").text().trim() || "Unknown Bank";

      if (ethioBanks === "Unknown Bank") return;

      $(table)
        .find("tbody tr")
        .each((rowIndex: number, row: any) => {
          const currencyElement = $(row).find("td").eq(0).find("p").first();
          const currencyCode = currencyElement.next("p").first().text().trim();
          const buyingRateText = $(row).find("td").eq(1).text().trim();
          const sellingRateText = $(row).find("td").eq(2).text().trim();

          const parsedBuyingRate = parseFloat(buyingRateText.replace(",", ""));
          const parsedSellingRate = parseFloat(
            sellingRateText.replace(",", "")
          );

          if (
            currencyCode &&
            !isNaN(parsedBuyingRate) &&
            !isNaN(parsedSellingRate)
          ) {
            exchangeRateData.push({
              ethio_banks: ethioBanks,
              currency_code: currencyCode,
              buying_rate: parsedBuyingRate,
              selling_rate: parsedSellingRate,
            });
          }
        });
    });

    if (exchangeRateData.length === 0) {
      return new Response("No exchange rate data found.", { status: 404 });
    }

    // Store the data in Supabase
    const promises = exchangeRateData.map(async (rate) => {
      const { ethio_banks, currency_code, buying_rate, selling_rate } = rate;

      try {
        // Fetch the bank ID
        const { data: bankData, error: bankError } = await supabase
          .from("banks")
          .select("id")
          .eq("ethio_banks", ethio_banks)
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
        const { data: currencyData, error: currencyError } = await supabase
          .from("currencies")
          .select("id")
          .eq("currency_code", currency_code)
          .single();

        if (currencyError || !currencyData) {
          console.error(
            "Error fetching currency:",
            currencyError?.message || "Unknown error"
          );
          return;
        }

        const currencyId = currencyData.id;

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
            .update({
              buying_rate,
              selling_rate,
            })
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

    await Promise.all(promises);

    const htmlResponse = `
      <!DOCTYPE html>
      <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Exchange Rates</title>
      <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          h1 { text-align: center; }
      </style>
  </head>
  <body>
      <h1>Exchange Rates</h1>
      <table>
          <thead>
              <tr>
                  <th>Bank Name</th>
                  <th>Currency Code</th>
                  <th>Buying Rate</th>
                  <th>Selling Rate</th>
              </tr>
          </thead>
          <tbody>
              ${exchangeRateData
                .map(
                  (rate) => `
                  <tr>
                      <td>${rate.ethio_banks}</td> <!-- Change here to use ethio_banks -->
                      <td>${rate.currency_code}</td>
                      <td>${rate.buying_rate}</td>
                      <td>${rate.selling_rate}</td>
                  </tr>
              `
                )
                .join("")}
          </tbody>
      </table>
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
  return await fetchExchangeRates();
});

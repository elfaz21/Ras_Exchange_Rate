// deno-lint-ignore-file

import { supabase } from "../../createCLient.ts";
import {
  sampleBanks,
  sampleCurrencies,
  sampleExchangeRates,
  sampleFlags,
  sampleLogos,
} from "../../data/sampleData.ts";

// Check if a file exists
async function checkFileExists(filePath: string) {
  try {
    await Deno.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function insertSampleData() {
  // Insert Banks
  for (const bank of sampleBanks) {
    const { error } = await supabase.from("banks").upsert(bank, {
      onConflict: ["swift_code"],
    });
  }

  // Insert Currencies
  for (const currency of sampleCurrencies) {
    const { error } = await supabase.from("currencies").upsert(currency, {
      onConflict: ["currency_code"],
    });
    if (error) {
    }
  }

  // Insert Exchange Rates
  for (const exchangeRate of sampleExchangeRates) {
    const bankRes = await supabase
      .from("banks")
      .select("id")
      .eq("swift_code", exchangeRate.swift_code)
      .single();
    const currencyRes = await supabase
      .from("currencies")
      .select("id")
      .eq("currency_code", exchangeRate.currency_code)
      .single();

    if (bankRes.error || currencyRes.error) {
      continue;
    }

    const bankId = bankRes.data?.id;
    const currencyId = currencyRes.data?.id;

    if (!bankId || !currencyId) {
      continue;
    }

    const { error } = await supabase.from("exchange_rates").upsert(
      {
        bank_id: bankId,
        currency_id: currencyId,
        buying_rate: exchangeRate.buying_rate,
        selling_rate: exchangeRate.selling_rate,
      },
      {
        onConflict: ["bank_id", "currency_id", "data_fetched_date"],
      }
    );
  }
}
async function uploadLogosAndFlags() {
  // Upload logos
  for (const logo of sampleLogos) {
    const exists = await checkFileExists(logo.file);
    if (!exists) {
      continue;
    }

    const file = await Deno.readFile(logo.file);
    const { error } = await supabase.storage
      .from("logos_and_flags")
      .upload(`logos/${logo.path.split("/").pop()}`, file); // Store logos in a 'logos' subdirectory

    if (error && !error.message.includes("The resource already exists")) {
      continue;
    }

    // Derive the relative path
    const relativePath = `logos/${logo.path.split("/").pop()}`;

    const { data: bankData, error: bankError } = await supabase
      .from("banks")
      .select("id")
      .eq("swift_code", logo.swift_code)
      .single();

    if (bankError || !bankData) {
      continue;
    }

    // Update the bank with the relative path
    const { error: updateError } = await supabase
      .from("banks")
      .update({ logo_url: relativePath })
      .eq("id", bankData.id);

    if (updateError) {
    }
  }

  // Upload flags
  for (const flag of sampleFlags) {
    const exists = await checkFileExists(flag.file);
    if (!exists) {
      continue;
    }

    const file = await Deno.readFile(flag.file);
    const { error } = await supabase.storage
      .from("logos_and_flags")
      .upload(`flags/${flag.path.split("/").pop()}`, file);

    if (error && !error.message.includes("The resource already exists")) {
      continue;
    }

    // Derive the relative path
    const relativePath = `flags/${flag.path.split("/").pop()}`;

    const { data: currencyData, error: currencyError } = await supabase
      .from("currencies")
      .select("id")
      .eq("currency_code", flag.currency_code)
      .single();

    if (currencyError || !currencyData) {
      continue;
    }

    // Update the currency with the relative path
    const { error: flagUpdateError } = await supabase
      .from("currencies")
      .update({ flag_url: relativePath })
      .eq("id", currencyData.id);
  }
}

// Deno server to handle requests
Deno.serve({ port: 8080 }, async (): Promise<Response> => {
  try {
    await uploadLogosAndFlags();
    await insertSampleData();
    return new Response("Sample data and assets uploaded successfully!", {
      status: 200,
    });
  } catch {
    return new Response("Error inserting sample data or uploading assets.", {
      status: 500,
    });
  }
});

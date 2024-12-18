import { SupabaseClient, createClient } from '@supabase/supabase-js';
import React, { useEffect, useState } from 'react';

// Define types for your data
interface Bank {
  bank_name: string;
}

interface Currency {
  currency_code: string;
}

interface ExchangeRate {
  id: number;
  buying_rate: number;
  selling_rate: number;
  updated_at: string;
  banks: Bank | null;
  currencies: Currency | null;
}

// Initialize Supabase client
const supabaseUrl: string = 'http://127.0.0.1:54321'; // Replace with your Supabase URL
const supabaseAnonKey: string = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your Supabase Anon Key
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

const ExchangeRates: React.FC = () => {
  const [data, setData] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: rates, error } = await supabase.from('exchange_rates')
        .select(`
          id,
          buying_rate,
          selling_rate,
          updated_at,
          banks (bank_name),
          currencies (currency_code)
        `);

      if (error) {
        console.error('Error fetching data:', error);
        setError(error.message); // Set the error message
        setData([]); // Ensure data is set to an empty array on error
      } else {
        setData(rates as unknown as ExchangeRate[] || []); // Type assertion for rates
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  // Group data by bank
  const groupedData = data.reduce((acc, rate) => {
    const bankName = rate.banks?.bank_name || 'Unknown Bank';
    if (!acc[bankName]) {
      acc[bankName] = [];
    }
    acc[bankName].push(rate);
    return acc;
  }, {} as Record<string, ExchangeRate[]>);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Exchange Rates</h1>
      {Object.entries(groupedData).map(([bankName, rates]) => (
        <div key={bankName}>
          <h2>{bankName}</h2>
          <table>
            <thead>
              <tr>
                <th>Currency Code</th>
                <th>Buying Rate</th>
                <th>Selling Rate</th>
                <th>Updated At</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((rate) => (
                <tr key={rate.id}>
                  <td>{rate.currencies?.currency_code}</td>
                  <td>{rate.buying_rate}</td>
                  <td>{rate.selling_rate}</td>
                  <td>{new Date(rate.updated_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

export default ExchangeRates;
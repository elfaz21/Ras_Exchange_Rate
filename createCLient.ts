import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js";
import { config } from "https://deno.land/x/dotenv/mod.ts";

const env = config();
const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export { supabase };

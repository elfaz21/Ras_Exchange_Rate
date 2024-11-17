import { serve } from "https://deno.land/x/sift@0.6.0/mod.ts";

const requestCounts: { [key: string]: { count: number; lastRequest: number } } =
  {};

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5; // Allow 5 requests per minute

// Define the handler for the route
function rateLimitedHandler(req: Request): Response {
  const ip =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("remote-address") ||
    "127.0.0.1";

  const now = Date.now();
  if (!requestCounts[ip]) {
    requestCounts[ip] = { count: 1, lastRequest: now };
  } else {
    const elapsedTime = now - requestCounts[ip].lastRequest;

    if (elapsedTime > RATE_LIMIT_WINDOW) {
      // Reset count after window expires
      requestCounts[ip] = { count: 1, lastRequest: now };
    } else {
      // Increment count
      requestCounts[ip].count++;
    }
  }

  if (requestCounts[ip].count > MAX_REQUESTS) {
    return new Response(`Rate limit exceeded for IP: ${ip}. Try again later.`, {
      status: 429,
    });
  }

  return new Response(`Request successful!  Your IP: ${ip}`, {
    status: 200,
  });
}

// Serve the route
serve({
  "/": rateLimitedHandler,
});

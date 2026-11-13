// One fixed upstream query keeps the endpoint bounded and prevents an open proxy.
const endpoint =
  "https://aviationweather.gov/api/data/metar?ids=KDFW,KLAX,KJFK,KORD&format=json";
let cached: { body: string; expiresAt: number } | undefined;
let pending: Promise<string> | undefined;

async function retrieve(): Promise<string> {
  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      "User-Agent": "AWOS-Station-Diagnostics/1.0",
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok)
    throw new Error(`Weather source returned ${response.status}`);
  const observations: unknown =
    response.status === 204 ? [] : await response.json();
  if (!Array.isArray(observations))
    throw new Error("Unexpected weather response");
  const body = JSON.stringify({
    observations,
    fetchedAt: new Date().toISOString(),
  });
  cached = { body, expiresAt: Date.now() + 60000 };
  return body;
}

export async function weatherResponse(): Promise<Response> {
  try {
    if (!cached || Date.now() >= cached.expiresAt) {
      // Concurrent visitors share the same upstream request.
      pending ??= retrieve().finally(() => {
        pending = undefined;
      });
      await pending;
    }
    return new Response(cached!.body, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      { error: "Weather source unavailable. Retrying automatically." },
      { status: 502 },
    );
  }
}

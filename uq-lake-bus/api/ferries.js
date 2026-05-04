import { fetchFerryDepartures } from "../server/ferries.js";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};

export async function GET() {
  const { body, headers, status } = await buildFerryResponse();

  return new Response(body, {
    status,
    headers,
  });
}

export default async function handler(_request, response) {
  const { body, headers, status } = await buildFerryResponse();

  Object.entries(headers).forEach(([key, value]) => {
    response.setHeader(key, value);
  });
  response.status(status).send(body);
}

async function buildFerryResponse() {
  try {
    const ferries = await fetchFerryDepartures();

    return {
      body: JSON.stringify(ferries),
      status: 200,
      headers: {
        ...JSON_HEADERS,
        "cache-control": "public, s-maxage=20, stale-while-revalidate=40",
      },
    };
  } catch (error) {
    console.error("Could not fetch Translink ferry departures", error);

    return {
      body: JSON.stringify({
        error: "Could not load live ferry times right now.",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      status: 500,
      headers: {
        ...JSON_HEADERS,
        "cache-control": "no-store",
      },
    };
  }
}

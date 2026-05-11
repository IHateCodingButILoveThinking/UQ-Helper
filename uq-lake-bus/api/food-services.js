import { fetchFoodServices } from "../server/food-services.js";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};

export async function GET() {
  const { body, headers, status } = await buildFoodServicesResponse();

  return new Response(body, {
    status,
    headers,
  });
}

export default async function handler(_request, response) {
  const { body, headers, status } = await buildFoodServicesResponse();

  Object.entries(headers).forEach(([key, value]) => {
    response.setHeader(key, value);
  });
  response.status(status).send(body);
}

async function buildFoodServicesResponse() {
  try {
    const foodServices = await fetchFoodServices();

    return {
      body: JSON.stringify(foodServices),
      headers: {
        ...JSON_HEADERS,
        "cache-control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
      status: 200,
    };
  } catch (error) {
    console.error("Could not fetch UQ food services", error);

    return {
      body: JSON.stringify({
        details: error instanceof Error ? error.message : "Unknown error",
        error: "Could not load UQ food services right now.",
        services: [],
      }),
      headers: {
        ...JSON_HEADERS,
        "cache-control": "no-store",
      },
      status: 500,
    };
  }
}

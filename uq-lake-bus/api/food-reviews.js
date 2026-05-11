import { fetchFoodReviews } from "../server/food-reviews.js";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};

export async function GET() {
  const { body, headers, status } = await buildFoodReviewsResponse();

  return new Response(body, {
    status,
    headers,
  });
}

export default async function handler(_request, response) {
  const { body, headers, status } = await buildFoodReviewsResponse();

  Object.entries(headers).forEach(([key, value]) => {
    response.setHeader(key, value);
  });
  response.status(status).send(body);
}

async function buildFoodReviewsResponse() {
  try {
    const reviewData = await fetchFoodReviews();
    const cacheControl = reviewData.configured
      ? "public, s-maxage=21600, stale-while-revalidate=43200"
      : "public, s-maxage=300, stale-while-revalidate=600";

    return {
      body: JSON.stringify(reviewData),
      headers: {
        ...JSON_HEADERS,
        "cache-control": cacheControl,
      },
      status: 200,
    };
  } catch (error) {
    console.error("Could not fetch food review data", error);

    return {
      body: JSON.stringify({
        configured: false,
        details: error instanceof Error ? error.message : "Unknown error",
        error: "Could not load Google review data right now.",
        reviews: {},
      }),
      headers: {
        ...JSON_HEADERS,
        "cache-control": "no-store",
      },
      status: 500,
    };
  }
}

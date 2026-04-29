import { fetchLibrarySpaces } from "../server/library-spaces.js";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};

export async function GET() {
  const { body, headers, status } = await buildLibrarySpacesResponse();

  return new Response(body, {
    status,
    headers,
  });
}

export default async function handler(_request, response) {
  const { body, headers, status } = await buildLibrarySpacesResponse();

  Object.entries(headers).forEach(([key, value]) => {
    response.setHeader(key, value);
  });
  response.status(status).send(body);
}

async function buildLibrarySpacesResponse() {
  try {
    const librarySpaces = await fetchLibrarySpaces();

    return {
      body: JSON.stringify(librarySpaces),
      status: 200,
      headers: {
        ...JSON_HEADERS,
        "cache-control": "public, s-maxage=45, stale-while-revalidate=90",
      },
    };
  } catch (error) {
    console.error("Could not fetch UQ library study-space data", error);

    return {
      body: JSON.stringify({
        error: "Could not load study spaces right now.",
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

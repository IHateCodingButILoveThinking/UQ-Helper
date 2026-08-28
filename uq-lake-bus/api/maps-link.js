import { googleMapsLinkResponse } from "../server/google-maps-link.js";

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Use POST to open a Maps link." });
  }
  if (Number(request.headers["content-length"]) > 8192) {
    return response.status(413).json({ error: "Paste just the place's share link." });
  }
  const { status, body } = await googleMapsLinkResponse(request.body?.url);
  return response.status(status).json(body);
}

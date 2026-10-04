import { forwardJson } from "@/app/api/_backend";

/** Same-origin proxy to the backend service (uses the BACKEND_URL binding). */
export async function GET(req: Request) {
  return forwardJson("api/health", req, "GET");
}

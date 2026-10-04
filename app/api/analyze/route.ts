import { forwardForm } from "@/app/api/_backend";

/** Same-origin proxy to the backend service (uses the BACKEND_URL binding). */
export async function POST(req: Request) {
  return forwardForm("api/analyze", req);
}

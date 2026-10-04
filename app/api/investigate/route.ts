import { forwardJson } from "@/app/api/_backend";

// AI investigations take minutes; allow the function to run long
// (still capped by the Vercel plan's max duration — see README).
export const maxDuration = 300;

/** Same-origin proxy to the backend service (uses the BACKEND_URL binding). */
export async function POST(req: Request) {
  return forwardJson("api/investigate", req, "POST");
}

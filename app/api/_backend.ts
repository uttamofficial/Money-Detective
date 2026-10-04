import { NextResponse } from "next/server";

function backendUrl(path: string): URL | null {
  const base = process.env.BACKEND_URL;
  if (!base) return null;
  return new URL(path, base.endsWith("/") ? base : `${base}/`);
}

function missingBackend() {
  return NextResponse.json(
    {
      detail:
        "Backend is not configured (BACKEND_URL is missing). If you are running " +
        "locally with plain `npm run dev`, set NEXT_PUBLIC_API_URL instead — see README.",
    },
    { status: 502 },
  );
}

async function passthrough(url: URL, init: RequestInit) {
  const res = await fetch(url, init);
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      "Content-Type":
        res.headers.get("Content-Type") ?? "application/json",
    },
  });
}

/**
 * Forward a multipart upload (e.g. /api/analyze) to the backend service.
 * Used by routes under app/api/* — the browser always calls same-origin.
 */
export async function forwardForm(path: string, req: Request) {
  const url = backendUrl(path);
  if (!url) return missingBackend();
  return passthrough(url, { method: "POST", body: await req.formData() });
}

/** Forward a JSON request (GET or POST) to the backend service. */
export async function forwardJson(
  path: string,
  req: Request,
  method: "GET" | "POST",
) {
  const url = backendUrl(path);
  if (!url) return missingBackend();
  return passthrough(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "POST" ? await req.text() : undefined,
  });
}

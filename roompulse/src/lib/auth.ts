import type { NextApiRequest } from "next";

export function getHostSecret(req: NextApiRequest): string | null {
  const headerName = process.env.HOST_SECRET_HEADER ?? "X-Host-Secret";
  const fromHeader = req.headers[headerName.toLowerCase()];
  if (typeof fromHeader === "string" && fromHeader.trim()) return fromHeader.trim();

  const auth = req.headers["authorization"];
  if (typeof auth === "string" && auth.startsWith("Bearer ")) return auth.slice(7).trim();
  return null;
}

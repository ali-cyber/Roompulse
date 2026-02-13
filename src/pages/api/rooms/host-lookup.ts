import type { NextApiRequest, NextApiResponse } from "next";
import { pool } from "../../../lib/prisma";
import { getHostSecret } from "../../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  const hostSecret = getHostSecret(req);
  if (!hostSecret) return res.status(401).json({ error: "UNAUTHORIZED" });

  const { rows } = await pool.query(`SELECT id FROM rooms WHERE host_secret=$1`, [hostSecret]);
  if (!rows[0]) return res.status(404).json({ error: "NOT_FOUND" });
  res.json({ roomId: rows[0].id });
}

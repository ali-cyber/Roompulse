import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { pool } from "../../../../lib/prisma";
import { getHostSecret } from "../../../../lib/auth";

const Body = z.object({ minutes: z.number().int().min(1).max(30).default(5) });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });

  const roomId = req.query.id as string;
  const hostSecret = getHostSecret(req);
  if (!hostSecret) return res.status(401).json({ error: "UNAUTHORIZED" });

  const ok = await pool.query(`SELECT 1 FROM rooms WHERE id=$1 AND host_secret=$2`, [roomId, hostSecret]);
  if (!ok.rowCount) return res.status(403).json({ error: "FORBIDDEN" });

  const parsed = Body.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "BAD_REQUEST" });

  const until = new Date(Date.now() + parsed.data.minutes * 60_000);

  await pool.query(
    `INSERT INTO room_state (room_id, locked_until)
     VALUES ($1, $2)
     ON CONFLICT (room_id) DO UPDATE SET locked_until=EXCLUDED.locked_until`,
    [roomId, until]
  );

  res.json({ ok: true, lockedUntil: until.toISOString() });
}

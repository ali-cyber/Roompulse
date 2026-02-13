import type { NextApiRequest, NextApiResponse } from "next";
import { pool } from "../../../../lib/prisma";
import { getHostSecret } from "../../../../lib/auth";
import { getAggregate } from "../../../../lib/aggregate";

function emitAggregate(roomId: string, payload: any) {
  const fn = (globalThis as any).__ROOMPULSE_EMIT_AGG__ as undefined | ((roomId: string, payload: any) => void);
  fn?.(roomId, payload);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });

  const roomId = req.query.id as string;
  const hostSecret = getHostSecret(req);
  if (!hostSecret) return res.status(401).json({ error: "UNAUTHORIZED" });

  const ok = await pool.query(`SELECT 1 FROM rooms WHERE id=$1 AND host_secret=$2`, [roomId, hostSecret]);
  if (!ok.rowCount) return res.status(403).json({ error: "FORBIDDEN" });

  await pool.query(`DELETE FROM feedback_events WHERE room_id=$1`, [roomId]);

  const agg = await getAggregate(roomId);
  emitAggregate(roomId, agg);

  res.json({ ok: true });
}

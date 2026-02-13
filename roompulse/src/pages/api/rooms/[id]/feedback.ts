import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { pool } from "../../../../lib/prisma";
import { getAggregate } from "../../../../lib/aggregate";

const COOLDOWN = Number(process.env.COOLDOWN_SECONDS ?? 60);

const Body = z.object({
  category: z.enum(["MUSIC", "TEMP", "READING"]),
  value: z.string().min(1).max(40),
  clientHash: z.string().min(8).max(128),
  notRobot: z.boolean().optional()
});

function emitAggregate(roomId: string, payload: any) {
  const fn = (globalThis as any).__ROOMPULSE_EMIT_AGG__ as undefined | ((roomId: string, payload: any) => void);
  fn?.(roomId, payload);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });

  const roomId = req.query.id as string;
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "BAD_REQUEST" });

  const { category, value, clientHash, notRobot } = parsed.data;

  if (notRobot === false) return res.status(400).json({ error: "NOT_ROBOT_REQUIRED" });

  const lock = await pool.query(`SELECT locked_until FROM room_state WHERE room_id=$1`, [roomId]);
  const lockedUntil = lock.rows[0]?.locked_until as Date | null | undefined;
  if (lockedUntil && lockedUntil.getTime() > Date.now()) {
    return res.status(423).json({ error: "ROOM_LOCKED", lockedUntil: lockedUntil.toISOString() });
  }

  const last = await pool.query(
    `
    SELECT created_at
    FROM feedback_events
    WHERE room_id=$1 AND category=$2 AND client_hash=$3
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [roomId, category, clientHash]
  );

  const lastAt: Date | undefined = last.rows[0]?.created_at;
  if (lastAt) {
    const elapsed = (Date.now() - lastAt.getTime()) / 1000;
    if (elapsed < COOLDOWN) {
      return res.status(429).json({ error: "COOLDOWN", retryAfterSeconds: Math.ceil(COOLDOWN - elapsed) });
    }
  }

  await pool.query(
    `INSERT INTO feedback_events (room_id, category, value, client_hash) VALUES ($1, $2, $3, $4)`,
    [roomId, category, value, clientHash]
  );

  const agg = await getAggregate(roomId);
  emitAggregate(roomId, agg);

  return res.status(201).json({ ok: true, cooldownSeconds: COOLDOWN });
}

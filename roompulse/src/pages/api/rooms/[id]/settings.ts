import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { pool } from "../../../../lib/prisma";
import { getHostSecret } from "../../../../lib/auth";

const Body = z.object({
  musicLevel: z.string().max(20).optional().nullable(),
  temperature: z.string().max(20).optional().nullable(),
  readingMode: z.string().max(30).optional().nullable()
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const roomId = req.query.id as string;
  const hostSecret = getHostSecret(req);
  if (!hostSecret) return res.status(401).json({ error: "UNAUTHORIZED" });

  const ok = await pool.query(`SELECT 1 FROM rooms WHERE id=$1 AND host_secret=$2`, [roomId, hostSecret]);
  if (!ok.rowCount) return res.status(403).json({ error: "FORBIDDEN" });

  if (req.method !== "PATCH") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "BAD_REQUEST" });

  const { musicLevel, temperature, readingMode } = parsed.data;

  await pool.query(
    `
    INSERT INTO room_settings (room_id, music_level, temperature, reading_mode)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (room_id) DO UPDATE
      SET music_level=EXCLUDED.music_level,
          temperature=EXCLUDED.temperature,
          reading_mode=EXCLUDED.reading_mode
    `,
    [roomId, musicLevel ?? null, temperature ?? null, readingMode ?? null]
  );

  res.json({ ok: true });
}

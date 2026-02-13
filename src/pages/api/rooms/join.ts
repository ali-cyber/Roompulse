import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { pool } from "../../../lib/prisma";

const Body = z.object({ joinCode: z.string().min(3).max(12) });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "BAD_REQUEST" });

  const joinCode = parsed.data.joinCode.toUpperCase().trim();

  const { rows } = await pool.query(
    `
    SELECT r.id, r.name, r.location_label as "locationLabel", r.join_code as "joinCode", r.room_type as "roomType",
           s.music_level as "musicLevel", s.temperature, s.reading_mode as "readingMode",
           st.locked_until as "lockedUntil"
    FROM rooms r
    LEFT JOIN room_settings s ON s.room_id = r.id
    LEFT JOIN room_state st ON st.room_id = r.id
    WHERE r.join_code = $1
    `,
    [joinCode]
  );

  const row = rows[0];
  if (!row) return res.status(404).json({ error: "ROOM_NOT_FOUND" });

  return res.json({
    room: { id: row.id, name: row.name, locationLabel: row.locationLabel, joinCode: row.joinCode, roomType: row.roomType },
    settings: { musicLevel: row.musicLevel, temperature: row.temperature, readingMode: row.readingMode },
    state: { lockedUntil: row.lockedUntil }
  });
}

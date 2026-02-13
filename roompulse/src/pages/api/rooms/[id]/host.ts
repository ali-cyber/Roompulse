import type { NextApiRequest, NextApiResponse } from "next";
import { pool } from "../../../../lib/prisma";
import { getHostSecret } from "../../../../lib/auth";
import { getAggregate } from "../../../../lib/aggregate";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });

  const roomId = req.query.id as string;
  const hostSecret = getHostSecret(req);
  if (!hostSecret) return res.status(401).json({ error: "UNAUTHORIZED" });

  const { rows } = await pool.query(
    `
    SELECT r.id, r.name, r.location_label as "locationLabel", r.join_code as "joinCode", r.room_type as "roomType",
           s.music_level as "musicLevel", s.temperature, s.reading_mode as "readingMode",
           st.locked_until as "lockedUntil"
    FROM rooms r
    LEFT JOIN room_settings s ON s.room_id=r.id
    LEFT JOIN room_state st ON st.room_id=r.id
    WHERE r.id=$1 AND r.host_secret=$2
    `,
    [roomId, hostSecret]
  );

  if (!rows[0]) return res.status(403).json({ error: "FORBIDDEN" });

  const agg = await getAggregate(roomId);

  res.json({
    room: {
      id: rows[0].id,
      name: rows[0].name,
      locationLabel: rows[0].locationLabel,
      joinCode: rows[0].joinCode,
      roomType: rows[0].roomType
    },
    settings: { musicLevel: rows[0].musicLevel, temperature: rows[0].temperature, readingMode: rows[0].readingMode },
    state: { lockedUntil: rows[0].lockedUntil },
    aggregate: agg
  });
}

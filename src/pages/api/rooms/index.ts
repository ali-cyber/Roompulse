import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { pool } from "../../../lib/prisma";
import { makeJoinCode, makeSecret } from "../../../lib/codes";

const Body = z.object({
  name: z.string().min(1).max(80),
  locationLabel: z.string().max(80).optional().nullable(),
  roomType: z.enum(["NORMAL", "READING"]).optional()
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "BAD_REQUEST", details: parsed.error.flatten() });

  const { name, locationLabel, roomType } = parsed.data;
  const hostSecret = makeSecret(32);

  let joinCode = "";
  for (let i = 0; i < 5; i++) {
    joinCode = makeJoinCode();
    const { rows } = await pool.query(
      `
      INSERT INTO rooms (name, location_label, join_code, host_secret, room_type)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (join_code) DO NOTHING
      RETURNING id, name, location_label as "locationLabel", join_code as "joinCode", room_type as "roomType", created_at as "createdAt"
      `,
      [name, locationLabel ?? null, joinCode, hostSecret, roomType ?? "NORMAL"]
    );
    if (rows[0]) {
      const room = rows[0];
      await pool.query(`INSERT INTO room_settings (room_id) VALUES ($1) ON CONFLICT DO NOTHING`, [room.id]);
      await pool.query(`INSERT INTO room_state (room_id) VALUES ($1) ON CONFLICT DO NOTHING`, [room.id]);

      const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
      return res.status(201).json({
        room,
        hostSecret,
        joinUrl: `${base}/r/${room.joinCode}`,
        hostUrl: `${base}/host/${hostSecret}`
      });
    }
  }

  return res.status(500).json({ error: "JOIN_CODE_GENERATION_FAILED" });
}

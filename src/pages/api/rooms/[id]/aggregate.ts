import type { NextApiRequest, NextApiResponse } from "next";
import { getAggregate } from "../../../../lib/aggregate";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  const roomId = req.query.id as string;
  const agg = await getAggregate(roomId);
  res.json(agg);
}

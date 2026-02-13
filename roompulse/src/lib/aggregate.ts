import { pool } from "./prisma";

type Category = "MUSIC" | "TEMP" | "READING";

function computeHeat(counts: Record<string, number>) {
  const vals = Object.values(counts).sort((a, b) => b - a);
  const top = vals[0] ?? 0;
  const second = vals[1] ?? 0;
  const total = vals.reduce((s, n) => s + n, 0);
  if (total === 0) return 0;
  return Math.max(0, Math.min(1, (top - second) / total));
}

function mostly(counts: Record<string, number>) {
  let best: string | null = null;
  let bestN = -1;
  for (const [k, v] of Object.entries(counts)) {
    if (v > bestN) {
      best = k;
      bestN = v;
    }
  }
  return bestN <= 0 ? null : best;
}

async function countsFor(roomId: string, category: Category, minutes: number) {
  const { rows } = await pool.query(
    `
    SELECT value, COUNT(*)::int AS n
    FROM feedback_events
    WHERE room_id = $1
      AND category = $2
      AND created_at >= now() - ($3 || ' minutes')::interval
    GROUP BY value
    `,
    [roomId, category, minutes]
  );
  const out: Record<string, number> = {};
  for (const r of rows) out[r.value] = r.n;
  return out;
}

export async function getAggregate(roomId: string) {
  const categories: Category[] = ["MUSIC", "TEMP", "READING"];
  const byCategory: any = {};
  for (const c of categories) {
    const last5m = await countsFor(roomId, c, 5);
    const last30m = await countsFor(roomId, c, 30);
    byCategory[c] = {
      mostly: mostly(last5m) ?? mostly(last30m),
      last5m,
      last30m,
      heat: computeHeat(last5m)
    };
  }
  return { roomId, generatedAt: new Date().toISOString(), byCategory };
}

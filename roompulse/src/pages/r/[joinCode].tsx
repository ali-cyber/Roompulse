import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { io, Socket } from "socket.io-client";
import { getClientHash } from "../../lib/clientHash";

type RoomJoin = {
  room: { id: string; name: string; locationLabel?: string | null; joinCode: string; roomType: "NORMAL" | "READING" };
  settings: { musicLevel?: string | null; temperature?: string | null; readingMode?: string | null };
  state: { lockedUntil?: string | null };
};

type Agg = {
  byCategory: Record<string, { mostly: string | null; last5m: Record<string, number>; last30m: Record<string, number>; heat: number }>;
};

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3000";

function msToClock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${s}s`;
}

export default function RoomView() {
  const router = useRouter();
  const joinCode = (router.query.joinCode as string | undefined)?.toUpperCase();

  const [join, setJoin] = useState<RoomJoin | null>(null);
  const [agg, setAgg] = useState<Agg | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [notRobot, setNotRobot] = useState(true);

  const roomId = join?.room.id;

  useEffect(() => {
    if (!joinCode) return;
    (async () => {
      setErr(null);
      const res = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode })
      });
      const data = await res.json();
      if (!res.ok) return setErr(data?.error ?? "Failed to join");
      setJoin(data);
    })();
  }, [joinCode]);

  useEffect(() => {
    if (!roomId) return;
    (async () => {
      const res = await fetch(`/api/rooms/${roomId}/aggregate`);
      const data = await res.json();
      if (res.ok) setAgg(data);
    })();
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    const socket: Socket = io(WS_URL, { transports: ["websocket"] });
    socket.emit("joinRoom", roomId);
    socket.on("aggregate", (payload: Agg) => setAgg(payload));
    return () => socket.disconnect();
  }, [roomId]);

  useEffect(() => {
    const t = setInterval(() => {
      setCooldowns((prev) => {
        const now = Date.now();
        const next: any = {};
        for (const [k, until] of Object.entries(prev)) {
          if (until > now) next[k] = until;
        }
        return next;
      });
    }, 250);
    return () => clearInterval(t);
  }, []);

  const locked = useMemo(() => {
    const until = join?.state.lockedUntil ? new Date(join.state.lockedUntil).getTime() : 0;
    return until > Date.now() ? until : null;
  }, [join?.state.lockedUntil]);

  async function send(category: "MUSIC" | "TEMP" | "READING", value: string) {
    if (!roomId) return;
    setErr(null);

    const until = cooldowns[category] ?? 0;
    if (until > Date.now()) return;

    if (locked) return setErr("Room is temporarily locked by host.");

    const res = await fetch(`/api/rooms/${roomId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, value, clientHash: getClientHash(), notRobot })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (data?.error === "COOLDOWN") {
        setCooldowns((p) => ({ ...p, [category]: Date.now() + (data.retryAfterSeconds * 1000) }));
        return;
      }
      if (data?.error === "ROOM_LOCKED") return setErr("Room is temporarily locked by host.");
      return setErr(data?.error ?? "Failed");
    }

    setCooldowns((p) => ({ ...p, [category]: Date.now() + (data.cooldownSeconds * 1000) }));
  }

  function Card(props: { title: string; subtitle?: string; children: any; category: string }) {
    const until = cooldowns[props.category] ?? 0;
    const remaining = until > Date.now() ? msToClock(until - Date.now()) : null;
    const mostly = agg?.byCategory?.[props.category]?.mostly;
    const heat = agg?.byCategory?.[props.category]?.heat ?? 0;
    const last5m = agg?.byCategory?.[props.category]?.last5m ?? {};
    const last30m = agg?.byCategory?.[props.category]?.last30m ?? {};

    return (
      <div className="card">
        <div className="cardHeader">
          <div>
            <h2>{props.title}</h2>
            {props.subtitle && <p className="muted">{props.subtitle}</p>}
          </div>
          <div className="pill">{mostly ? `Mostly: ${mostly}` : "No recent votes"}</div>
        </div>

        <div className="stats">
          <div><span className="muted">Last 5m</span><strong>{Object.values(last5m).reduce((s,n)=>s+n,0)}</strong></div>
          <div><span className="muted">Last 30m</span><strong>{Object.values(last30m).reduce((s,n)=>s+n,0)}</strong></div>
          <div><span className="muted">Heat</span><strong>{Math.round(heat*100)}%</strong></div>
        </div>

        {props.children}

        <div className="footer">
          {remaining
            ? <span className="muted">Thanks — sent anonymously. Cooldown: {remaining}</span>
            : <span className="muted">Anonymous feedback (no usernames)</span>}
        </div>
      </div>
    );
  }

  if (!joinCode) return null;

  return (
    <>
      <Head><title>RoomPulse — {join?.room.name ?? joinCode}</title></Head>
      <main className="container">
        <header className="topbar">
          <div>
            <h1>{join?.room.name ?? "RoomPulse"}</h1>
            <p className="muted">
              Code: <strong>{joinCode}</strong>
              {join?.room.locationLabel ? <> · {join.room.locationLabel}</> : null}
            </p>
          </div>
          <label className="robot">
            <input type="checkbox" checked={notRobot} onChange={(e)=>setNotRobot(e.target.checked)} />
            I’m not a robot
          </label>
        </header>

        {locked && (
          <div className="banner">
            Submissions are locked by the host until <strong>{new Date(locked).toLocaleTimeString()}</strong>.
          </div>
        )}
        {err && <div className="error">{err}</div>}

        <div className="grid">
          <Card title="Music" subtitle={join?.settings.musicLevel ? `Current: ${join.settings.musicLevel}` : undefined} category="MUSIC">
            <div className="btnRow">
              <button onClick={()=>send("MUSIC","HIGHER")}>Higher</button>
              <button onClick={()=>send("MUSIC","LOWER")}>Lower</button>
              <button onClick={()=>send("MUSIC","MUTE")}>Mute / offline</button>
            </div>
          </Card>

          <Card title="Temperature" subtitle={join?.settings.temperature ? `Current: ${join.settings.temperature}` : undefined} category="TEMP">
            <div className="btnRow">
              <button onClick={()=>send("TEMP","WARMER")}>Warmer</button>
              <button onClick={()=>send("TEMP","COOLER")}>Cooler</button>
            </div>
          </Card>

          {join?.room.roomType === "READING" && (
            <Card title="Reading Mode" subtitle={join?.settings.readingMode ? `Current: ${join.settings.readingMode}` : undefined} category="READING">
              <div className="btnRow">
                <button onClick={()=>send("READING","QUIET")}>Quiet please</button>
                <button onClick={()=>send("READING","READ_OUT_LOUD_OK")}>Read out loud OK</button>
              </div>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}

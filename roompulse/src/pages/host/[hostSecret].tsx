import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function HostDash() {
  const router = useRouter();
  const hostSecret = router.query.hostSecret as string | undefined;

  const [roomId, setRoomId] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [musicLevel, setMusicLevel] = useState("");
  const [temperature, setTemperature] = useState("");
  const [readingMode, setReadingMode] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    if (!hostSecret) return;
    setErr(null);

    const lookup = await fetch("/api/rooms/host-lookup", {
      headers: { "X-Host-Secret": hostSecret }
    });
    const l = await lookup.json();
    if (!lookup.ok) return setErr(l?.error ?? "Lookup failed");

    setRoomId(l.roomId);

    const res = await fetch(`/api/rooms/${l.roomId}/host`, {
      headers: { "X-Host-Secret": hostSecret }
    });
    const j = await res.json();
    if (!res.ok) return setErr(j?.error ?? "Failed");
    setData(j);

    setMusicLevel(j.settings?.musicLevel ?? "");
    setTemperature(j.settings?.temperature ?? "");
    setReadingMode(j.settings?.readingMode ?? "");
  }

  useEffect(() => { load(); }, [hostSecret]);

  async function reset() {
    if (!roomId || !hostSecret) return;
    await fetch(`/api/rooms/${roomId}/reset`, { method: "POST", headers: { "X-Host-Secret": hostSecret }});
    await load();
  }

  async function lock5() {
    if (!roomId || !hostSecret) return;
    await fetch(`/api/rooms/${roomId}/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Host-Secret": hostSecret },
      body: JSON.stringify({ minutes: 5 })
    });
    await load();
  }

  async function saveSettings() {
    if (!roomId || !hostSecret) return;
    await fetch(`/api/rooms/${roomId}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Host-Secret": hostSecret },
      body: JSON.stringify({
        musicLevel: musicLevel || null,
        temperature: temperature || null,
        readingMode: readingMode || null
      })
    });
    await load();
  }

  return (
    <>
      <Head><title>RoomPulse — Host</title></Head>
      <main className="container">
        <h1>Host Dashboard</h1>
        {err && <div className="error">{err}</div>}

        {data && (
          <>
            <div className="card">
              <div className="row"><span>Room</span><strong>{data.room.name}</strong></div>
              <div className="row"><span>Join code</span><strong>{data.room.joinCode}</strong></div>
              <div className="row"><span>Join link</span><a href={`/r/${data.room.joinCode}`}>{`${location.origin}/r/${data.room.joinCode}`}</a></div>
            </div>

            <div className="grid">
              <div className="card">
                <h2>Controls</h2>
                <div className="btnRow">
                  <button onClick={reset}>Reset room (clear votes)</button>
                  <button onClick={lock5}>Lock submissions (5 min)</button>
                </div>
              </div>

              <div className="card">
                <h2>Current settings</h2>
                <label>Music level</label>
                <input value={musicLevel} onChange={(e)=>setMusicLevel(e.target.value)} placeholder="e.g. medium" />

                <label>Temperature</label>
                <input value={temperature} onChange={(e)=>setTemperature(e.target.value)} placeholder="e.g. 72F" />

                <label>Reading mode</label>
                <input value={readingMode} onChange={(e)=>setReadingMode(e.target.value)} placeholder="e.g. quiet" />

                <button onClick={saveSettings}>Save</button>
              </div>

              <div className="card">
                <h2>Aggregate</h2>
                <pre style={{ whiteSpace: "pre-wrap" }}>
{JSON.stringify(data.aggregate?.byCategory, null, 2)}
                </pre>
                <p className="muted">Aggregate only — no user list, no IP storage.</p>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}

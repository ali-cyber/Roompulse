import { useState } from "react";
import Head from "next/head";

export default function CreateRoom() {
  const [name, setName] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [roomType, setRoomType] = useState<"NORMAL" | "READING">("NORMAL");
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, locationLabel: locationLabel || null, roomType })
    });
    const data = await res.json();
    if (!res.ok) return setErr(data?.error ?? "Failed");
    setResult(data);
  }

  return (
    <>
      <Head><title>RoomPulse — Create</title></Head>
      <main className="container">
        <h1>RoomPulse</h1>
        <p className="muted">Create a room with anonymous, realtime feedback.</p>

        <form onSubmit={submit} className="card">
          <label>Room name</label>
          <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g. Living Room" required />

          <label>Location (optional)</label>
          <input value={locationLabel} onChange={(e)=>setLocationLabel(e.target.value)} placeholder="e.g. Apt 4B" />

          <label>Room type</label>
          <select value={roomType} onChange={(e)=>setRoomType(e.target.value as any)}>
            <option value="NORMAL">Normal room</option>
            <option value="READING">Reading room</option>
          </select>

          <button type="submit">Create room</button>
          {err && <div className="error">{err}</div>}
        </form>

        {result && (
          <div className="card">
            <h2>Room created</h2>
            <div className="row"><span>Join code</span><strong>{result.room.joinCode}</strong></div>
            <div className="row"><span>Join link</span><a href={result.joinUrl}>{result.joinUrl}</a></div>
            <div className="row"><span>Host link</span><a href={result.hostUrl}>{result.hostUrl}</a></div>
            <p className="muted">Save the host link — it contains your host secret.</p>
          </div>
        )}
      </main>
    </>
  );
}

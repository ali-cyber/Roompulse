import { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

export default function Join() {
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const joinCode = code.toUpperCase().trim();
    const res = await fetch("/api/rooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ joinCode })
    });
    if (!res.ok) {
      const data = await res.json().catch(()=> ({}));
      return setErr(data?.error ?? "Failed");
    }
    router.push(`/r/${joinCode}`);
  }

  return (
    <>
      <Head><title>RoomPulse — Join</title></Head>
      <main className="container">
        <h1>Join a room</h1>
        <form onSubmit={submit} className="card">
          <label>Join code</label>
          <input value={code} onChange={(e)=>setCode(e.target.value)} placeholder="e.g. K7P3Q" />
          <button type="submit">Join</button>
          {err && <div className="error">{err}</div>}
        </form>
      </main>
    </>
  );
}

import Link from "next/link";
import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head><title>RoomPulse</title></Head>
      <main className="container">
        <h1>RoomPulse</h1>
        <p className="muted">Anonymous realtime requests for shared spaces.</p>
        <div className="btnRow">
          <Link href="/create"><button>Create room</button></Link>
          <Link href="/join"><button>Join room</button></Link>
        </div>
      </main>
    </>
  );
}

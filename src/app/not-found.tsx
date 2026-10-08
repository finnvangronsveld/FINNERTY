import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="lost">
      <div className="lost__screen">
        <span className="lost__code">404</span>
        <span className="lost__msg">NO SIGNAL ON THIS CHANNEL</span>
      </div>
      <Link className="key key--primary" href="/">
        Back to the console
      </Link>
    </main>
  );
}

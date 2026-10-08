import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="lost">
      <div className="lost__dialog">
        <p className="lost__title">This page can&apos;t be found.</p>
        <p className="lost__text">It may have been moved, or it never existed.</p>
        <Link className="gel gel--blue" href="/">
          Back to the desk
        </Link>
      </div>
    </main>
  );
}

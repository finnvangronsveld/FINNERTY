import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="lost">
      <div className="sticky sticky--butter lost__note">
        <span className="sticky__title">Page not found</span>
        <span className="sticky__line">This note fell behind the desk.</span>
      </div>
      <Link className="sticker" href="/">
        Back to the desk
      </Link>
    </main>
  );
}

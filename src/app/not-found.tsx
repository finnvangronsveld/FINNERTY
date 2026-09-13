import Link from 'next/link';
export default function NotFound() {
  return (
    <section className="standard-page content-width">
      <p className="eyebrow">BUITEN DE ORBIT / 404</p>
      <h1>Hier is het nog stil.</h1>
      <Link href="/" className="button primary">
        Terug naar Finnertyverse
      </Link>
    </section>
  );
}

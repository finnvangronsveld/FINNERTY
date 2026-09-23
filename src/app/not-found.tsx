import Link from 'next/link';
export default function NotFound() {
  return (
    <section className="standard-page content-width error-panel">
      <span className="error-code">404</span>
      <h1>Verkeerd tabblad?</h1>
      <p>Deze pagina bestaat niet. We brengen je terug naar de crew.</p>
      <Link href="/" className="button primary">
        Terug naar Finnerty
      </Link>
    </section>
  );
}

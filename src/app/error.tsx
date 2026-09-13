'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="standard-page content-width">
      <h1>Even geen verbinding.</h1>
      <p>Deze pagina kon niet worden geladen. Probeer het opnieuw.</p>
      <button className="button primary" onClick={reset}>
        Opnieuw proberen
      </button>
    </section>
  );
}

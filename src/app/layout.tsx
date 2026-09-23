import type { Metadata } from 'next';
import '@fontsource-variable/manrope';
import '@fontsource-variable/space-grotesk';
import './globals.css';
import './vault.css';
import { SiteProvider } from '@/components/site-provider';
import { SiteShell } from '@/components/site-shell';
import { publicConfig } from '@/server/config';
export const metadata: Metadata = {
  title: { default: 'Finnerty — Hier blijf je hangen.', template: '%s · Finnerty' },
  description: 'Kijk mee met Finnerty, speel in The Vault en blijf hangen bij de crew.',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl" data-scroll-behavior="smooth">
      <body>
        <SiteProvider config={publicConfig()}>
          <SiteShell>{children}</SiteShell>
        </SiteProvider>
      </body>
    </html>
  );
}

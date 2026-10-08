import type { Metadata, Viewport } from 'next';
import { Doto, IBM_Plex_Mono, Michroma } from 'next/font/google';
import './globals.css';

const silk = Michroma({ weight: '400', subsets: ['latin'], variable: '--font-silk', display: 'swap' });
const led = Doto({ subsets: ['latin'], variable: '--font-led', display: 'swap', weight: 'variable' });
const mono = IBM_Plex_Mono({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://finnerty.vercel.app'),
  title: 'Finnerty',
  description:
    'Finnerty: streamer, hardstyle DJ and producer from Flanders. Live on Twitch as finnerty_.',
  openGraph: {
    title: 'Finnerty',
    description: 'Streams, hardstyle sets and loud nights from Flanders.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#c9ccd1' },
    { media: '(prefers-color-scheme: dark)', color: '#141517' },
  ],
};

const themeScript = `(function(){try{var t=localStorage.getItem('finnerty:theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${silk.variable} ${led.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

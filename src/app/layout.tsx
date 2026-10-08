import type { Metadata, Viewport } from 'next';
import { Yellowtail } from 'next/font/google';
import './globals.css';
import './games.css';

const neon = Yellowtail({ weight: '400', subsets: ['latin'], variable: '--font-neon', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL('https://finnerty.vercel.app'),
  title: 'Finnerty',
  description: 'FinnOS: Finnerty’s corner of the internet, built as a glossy desktop computer. Watch the stream, play games for the leaderboards and poke around.',
  openGraph: {
    title: 'Finnerty',
    description: 'Pull up a chair and hang out with chat. Live on Twitch as finnerty_.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#b98a5b' },
    { media: '(prefers-color-scheme: dark)', color: '#2a1d14' },
  ],
};

const themeScript = `(function(){try{var t=localStorage.getItem('finnerty:theme');if(t!=='day'&&t!=='night'){t=matchMedia('(prefers-color-scheme: dark)').matches?'night':'day'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='day'}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={neon.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

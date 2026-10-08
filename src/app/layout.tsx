import type { Metadata, Viewport } from 'next';
import { Courier_Prime, Shantell_Sans } from 'next/font/google';
import './globals.css';

const hand = Shantell_Sans({
  subsets: ['latin'],
  variable: '--font-hand',
  display: 'swap',
  axes: ['INFM', 'BNCE'],
});
const typed = Courier_Prime({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-typed', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL('https://finnerty.vercel.app'),
  title: 'Finnerty',
  description: 'Finnerty streams on Twitch as finnerty_. Pull up a chair and hang out with chat.',
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
    <html lang="en" className={`${hand.variable} ${typed.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

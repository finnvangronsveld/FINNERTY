import { DeskCorner } from '@/components/desk-corner';
import { DeskProvider } from '@/components/desk-provider';
import { Entrance } from '@/components/entrance';
import { Journal } from '@/components/journal';
import { StreamDeck } from '@/components/stream-deck';
import { Tablet } from '@/components/tablet';
import { TopBar } from '@/components/top-bar';

export default function Home() {
  return (
    <DeskProvider>
      <Entrance />
      <span className="lamplight" aria-hidden />
      <TopBar />
      <main className="desk">
        <Journal />
        <Tablet />
        <StreamDeck />
      </main>
      <DeskCorner />
    </DeskProvider>
  );
}

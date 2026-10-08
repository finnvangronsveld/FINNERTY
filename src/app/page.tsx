import { DeskProvider } from '@/components/desk-provider';
import { Room } from '@/components/room';

export default function Home() {
  return (
    <DeskProvider>
      <main>
        <Room />
      </main>
    </DeskProvider>
  );
}

import { BootGate } from '@/components/boot-gate';
import { ConsoleHero } from '@/components/console-hero';
import { ConsoleProvider } from '@/components/console-provider';
import { DrumMachine } from '@/components/drum-machine';
import { Monitor } from '@/components/monitor';
import { PatchBay } from '@/components/patch-bay';
import { RackHeader } from '@/components/rack-header';

export default function Home() {
  return (
    <ConsoleProvider>
      <BootGate />
      <RackHeader />
      <main>
        <ConsoleHero />
        <DrumMachine />
        <Monitor />
      </main>
      <PatchBay />
    </ConsoleProvider>
  );
}

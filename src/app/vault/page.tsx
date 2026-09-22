import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'The Vault',
  description: 'Speel met je gratis Vault Points. Geen echt geld, geen prijzen, alleen eer.',
};
export { VaultPage as default } from '@/components/vault/vault-room';

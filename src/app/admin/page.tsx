import { AdminPage } from '@/components/pages';
import { AdminConsole } from '@/components/admin-console';
import { currentAdminId } from '@/server/auth/admin';
export default async function Admin() {
  return (await currentAdminId()) ? <AdminConsole /> : <AdminPage />;
}

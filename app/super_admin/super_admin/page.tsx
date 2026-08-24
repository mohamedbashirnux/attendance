import { getSuperAdmins } from "@/lib/backend_super_admin/super_admin/fetch"
import { SuperAdminManager } from "./_components/super-admin-manager"

export default async function SuperAdminPage() {
  const rows = await getSuperAdmins()
  return <SuperAdminManager initialData={rows} />
}

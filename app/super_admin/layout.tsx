import * as React from "react"
import { auth } from "@/lib/backend_super_admin/auth/auth"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/super_admin/app-sidebar"
import { SuperAdminHeader } from "@/components/super_admin/header"

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const name = session?.user?.name ?? "Super Admin"

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SuperAdminHeader name={name} />
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

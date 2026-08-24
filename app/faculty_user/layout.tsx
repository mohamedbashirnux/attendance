import * as React from "react"
import { auth } from "@/lib/backend_super_admin/auth/auth"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/faculty_user/app-sidebar"
import { FacultyUserHeader } from "@/components/faculty_user/header"

export default async function FacultyUserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const name = session?.user?.name ?? "Faculty"

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <FacultyUserHeader name={name} />
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export function SuperAdminHeader({ name }: { name: string }) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 data-vertical:h-4 data-vertical:self-auto"
      />
      <div className="font-medium">Super Admin</div>
      <div className="ml-auto text-sm text-muted-foreground">{name}</div>
    </header>
  )
}

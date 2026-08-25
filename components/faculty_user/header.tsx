import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { UserRound } from "lucide-react"
import { logoutFacultyAction } from "@/lib/backend_faculty_user/auth/logout"

export function FacultyUserHeader({ name }: { name: string }) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 data-vertical:h-4 data-vertical:self-auto"
      />
      <div className="font-medium">{name}</div>
      <div className="ml-auto flex items-center gap-3">
        <div className="flex size-7 items-center justify-center rounded-full bg-[#5F61E6]/10 text-[#5F61E6]">
          <UserRound className="size-4" />
        </div>
        <form action={logoutFacultyAction}>
          <Button type="submit" variant="outline" size="sm">
            Logout
          </Button>
        </form>
      </div>
    </header>
  )
}

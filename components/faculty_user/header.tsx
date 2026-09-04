import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { UserRound, Bell, Search } from "lucide-react"
import { logoutFacultyAction } from "@/lib/backend_faculty_user/auth/logout"

export function FacultyUserHeader({ name }: { name: string }) {
  // Derive a short greeting based on the local hour. Server renders
  // one value, the client may render a different one if the user
  // refreshes across an hour boundary, but that's fine here.
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"

  // Build initials for the avatar fallback
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white/70 px-4 backdrop-blur-sm">
      <SidebarTrigger className="-ml-1 text-slate-500 hover:text-slate-900" />
      <Separator
        orientation="vertical"
        className="mr-1 data-vertical:h-5 data-vertical:self-auto bg-slate-200/80"
      />

      <div className="flex min-w-0 flex-col">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          {greeting}
        </span>
        <span className="truncate text-[14px] font-semibold leading-tight text-slate-900">
          {name}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Search affordance — purely visual, a real search can be wired in later */}
        <button
          type="button"
          className="hidden h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:flex"
          aria-label="Search"
        >
          <Search className="size-4" strokeWidth={2.25} />
        </button>

        {/* Notifications — placeholder */}
        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Notifications"
        >
          <Bell className="size-4" strokeWidth={2.25} />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        <Separator
          orientation="vertical"
          className="mx-1 h-6 bg-slate-200/80"
        />

        <div className="flex items-center gap-2.5">
          <div className="relative flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-[#5F61E6] to-[#7C7FF2] text-[12px] font-semibold text-white shadow-sm shadow-[#5F61E6]/20">
            {initials || <UserRound className="size-4" strokeWidth={2.25} />}
          </div>
          <div className="hidden flex-col text-right sm:flex">
            <span className="text-[12.5px] font-medium leading-tight text-slate-700">
              {name}
            </span>
            <span className="text-[10.5px] font-medium uppercase tracking-wider text-slate-400">
              Faculty
            </span>
          </div>
        </div>

        <form action={logoutFacultyAction} className="ml-1">
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="h-8 border-slate-200/80 text-[12.5px] text-slate-600 hover:border-rose-200 hover:bg-rose-50/60 hover:text-rose-600"
          >
            Logout
          </Button>
        </form>
      </div>
    </header>
  )
}

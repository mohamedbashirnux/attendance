"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChevronRight,
  LayoutDashboard,
  Building2,
  School,
  BookOpen,
  Layers,
  UserPlus,
  BookUser,
  CalendarOff,
  Users,
  Sparkles,
  GraduationCap,
  LogOut,
  type LucideIcon,
} from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { logoutFacultyAction } from "@/lib/backend_faculty_user/auth/logout"

type NavItem = { title: string; url: string; icon: LucideIcon }

const navMain: { title: string; emoji: string; items: NavItem[] }[] = [
  {
    title: "Academic",
    emoji: "📚",
    items: [
      { title: "Department", url: "/faculty_user/department", icon: Building2 },
      { title: "Class", url: "/faculty_user/class", icon: School },
      { title: "Subject", url: "/faculty_user/subject", icon: BookOpen },
      { title: "Subject Class", url: "/faculty_user/subject-class/selection", icon: Layers },
      { title: "Students", url: "/faculty_user/student/selection", icon: Users },
    ],
  },
  {
    title: "Teacher",
    emoji: "👨‍🏫",
    items: [
      { title: "Add Teacher", url: "/faculty_user/teacher", icon: UserPlus },
      { title: "Allocate Teacher Subjects", url: "/faculty_user/teacher-allocation/selection", icon: BookUser },
    ],
  },
  {
    title: "Manage Absents",
    emoji: "📅",
    items: [
      { title: "Absents", url: "/faculty_user/absents/selection", icon: CalendarOff },
    ],
  },
]

function NavSubItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon
  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        isActive={isActive}
        className={cn(
          "group/sub relative h-9 pl-9 pr-3 text-[13px] font-medium transition-all",
          isActive
            ? // Active: indigo tinted background, indigo text, accent bar on the left
              "bg-gradient-to-r from-[#5F61E6]/12 to-[#5F61E6]/4 text-[#5F61E6] hover:from-[#5F61E6]/15 hover:to-[#5F61E6]/6"
            : // Inactive: neutral, hover slides slightly right and tints
              "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
        )}
        render={<Link href={item.url} />}
      >
        {/* Accent bar — only visible on the active item */}
        <span
          aria-hidden
          className={cn(
            "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#5F61E6] transition-all duration-200",
            isActive ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
          )}
        />
        <Icon
          className={cn(
            "size-[15px] shrink-0 transition-colors",
            isActive ? "text-[#5F61E6]" : "text-slate-400 group-hover/sub:text-slate-600"
          )}
        />
        <span className="truncate">{item.title}</span>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  )
}

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  const isActive = (url: string) =>
    pathname === url || pathname.startsWith(url + "/")

  const dashboardActive = isActive("/faculty_user") && pathname === "/faculty_user"

  return (
    <Sidebar
      {...props}
      className="border-r border-slate-200/80 bg-gradient-to-b from-white via-white to-slate-50/60"
    >
      {/* Brand header */}
      <SidebarHeader className="px-4 pb-3 pt-4">
        <Link
          href="/faculty_user"
          className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-slate-100/60"
        >
          <span className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#5F61E6] to-[#7C7FF2] text-white shadow-md shadow-[#5F61E6]/25 transition-transform duration-200 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-[#5F61E6]/30">
            <GraduationCap className="size-[18px]" strokeWidth={2.25} />
            <span className="absolute -right-0.5 -top-0.5 flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5F61E6]/40" />
              <span className="relative inline-flex size-2.5 rounded-full bg-[#5F61E6]" />
            </span>
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[15px] font-semibold leading-tight text-slate-900">
              Faculty Portal
            </span>
            <span className="truncate text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Attendance System
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarSeparator className="mx-3 bg-slate-200/70" />

      <SidebarContent className="gap-0 px-2 pt-3">
        {/* Dashboard — pinned at the top, separate from the collapsible groups */}
        <SidebarGroup className="p-0">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={dashboardActive}
                tooltip="Dashboard"
                className={cn(
                  "group/dash h-10 px-3 text-[13.5px] font-medium transition-all",
                  dashboardActive
                    ? "bg-gradient-to-r from-[#5F61E6]/12 to-[#5F61E6]/4 text-[#5F61E6] shadow-sm shadow-[#5F61E6]/5 hover:from-[#5F61E6]/15 hover:to-[#5F61E6]/6"
                    : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                )}
                render={<Link href="/faculty_user" />}
              >
                <LayoutDashboard
                  className={cn(
                    "size-[17px] transition-colors",
                    dashboardActive ? "text-[#5F61E6]" : "text-slate-500 group-hover/dash:text-slate-700"
                  )}
                  strokeWidth={2.25}
                />
                <span>Dashboard</span>
                {dashboardActive ? (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#5F61E6]" />
                ) : null}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator className="mx-3 my-3 bg-slate-200/60" />

        {/* Grouped navigation */}
        {navMain.map((group, groupIndex) => {
          const groupActive = group.items.some((sub) => isActive(sub.url))
          return (
            <SidebarGroup key={group.title} className="p-0">
              <Collapsible
                defaultOpen={groupIndex === 0 || groupActive}
                className="group/collapsible"
              >
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      render={<CollapsibleTrigger />}
                      className="h-7 px-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400 hover:bg-transparent hover:text-slate-600"
                    >
                      <span className="mr-1.5 text-[11px] leading-none">
                        {group.emoji}
                      </span>
                      <span>{group.title}</span>
                      <ChevronRight className="ml-auto size-3.5 transition-transform duration-200 group-aria-expanded/collapsible:rotate-90" />
                    </SidebarMenuButton>
                    <CollapsibleContent>
                      <SidebarGroupContent>
                        <SidebarMenuSub className="mx-0 mt-1 gap-0.5 border-l border-slate-200/60 pl-1.5">
                          {group.items.map((item) => (
                            <NavSubItem
                              key={item.title}
                              item={item}
                              isActive={isActive(item.url)}
                            />
                          ))}
                        </SidebarMenuSub>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </SidebarMenu>
              </Collapsible>
            </SidebarGroup>
          )
        })}

        {/* Spacer pushes the footer down */}
        <div className="grow" />

        {/* Inline tip card — small visual treat at the bottom of the nav */}
        <SidebarGroup className="p-0 pb-1">
          <div className="relative mx-1.5 mt-2 overflow-hidden rounded-lg border border-[#5F61E6]/15 bg-gradient-to-br from-[#5F61E6]/8 via-white to-[#5F61E6]/5 p-3">
            <div className="pointer-events-none absolute -right-4 -top-4 size-16 rounded-full bg-[#5F61E6]/8 blur-xl" />
            <div className="relative flex items-start gap-2">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-white/80 text-[#5F61E6] shadow-sm">
                <Sparkles className="size-3.5" strokeWidth={2.25} />
              </span>
              <div className="min-w-0">
                <p className="text-[11.5px] font-semibold leading-tight text-slate-800">
                  Pro tip
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                  Click any badge in a table to toggle its status quickly.
                </p>
              </div>
            </div>
          </div>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with logout */}
      <SidebarFooter className="border-t border-slate-200/70 p-3">
        <form action={logoutFacultyAction}>
          <button
            type="submit"
            className="group/logout flex w-full items-center gap-2.5 rounded-lg border border-slate-200/80 bg-white/60 px-3 py-2 text-left text-[12.5px] font-medium text-slate-600 transition-all hover:border-rose-200 hover:bg-rose-50/60 hover:text-rose-600"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 transition-colors group-hover/logout:bg-rose-100 group-hover/logout:text-rose-500">
              <LogOut className="size-3.5" strokeWidth={2.25} />
            </span>
            <span className="grow">Sign out</span>
            <ChevronRight className="size-3.5 text-slate-300 transition-all group-hover/logout:translate-x-0.5 group-hover/logout:text-rose-400" />
          </button>
        </form>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

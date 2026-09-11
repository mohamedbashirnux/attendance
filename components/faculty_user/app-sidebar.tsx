"use client"

import * as React from "react"
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
  CalendarDays,
  Users,
} from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const navMain = [
  {
    title: "Academic",
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
    items: [
      { title: "Add Teacher", url: "/faculty_user/teacher", icon: UserPlus },
      { title: "Allocate Teacher Subjects", url: "/faculty_user/teacher-allocation/selection", icon: BookUser },
    ],
  },
  {
    title: "Manage Absents",
    items: [
      { title: "Absents", url: "/faculty_user/absents/selection", icon: CalendarOff },
    ],
  },
  {
    title: "Schedule",
    items: [
      { title: "Time Table", url: "/faculty_user/timetable/selection", icon: CalendarDays },
    ],
  },
]

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  const isActive = (url: string) =>
    pathname === url || pathname.startsWith(url + "/")

  return (
    <Sidebar {...props} className="border-r border-border/70 bg-white">
      <SidebarHeader className="border-b border-border/70 px-4 py-5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="h-auto gap-3 p-0 hover:bg-transparent"
              render={<a href="/faculty_user" />}
            >
              <img
                src="/images/logo1.png"
                alt="Capital University"
                className="size-9 rounded-xl border border-border/70 object-contain p-1"
              />
              <span className="flex flex-col items-start gap-0.5 group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-semibold tracking-tight">Attendance</span>
                <span className="text-[11px] text-muted-foreground">Faculty portal</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-3 py-4">
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={isActive("/faculty_user")}
                className={
                  "h-9 font-medium " +
                  (isActive("/faculty_user")
                    ? "bg-[#5F61E6]/10 text-[#5F61E6] hover:bg-[#5F61E6]/15"
                    : "")
                }
                render={<a href="/faculty_user" />}
              >
                <LayoutDashboard className="size-4" />
                <span>Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {navMain.map((item, index) => {
              const groupActive = item.items.some((sub) => isActive(sub.url))
              return (
                <Collapsible
                  key={item.title}
                  defaultOpen={index === 0 || groupActive}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <SidebarMenuButton className="h-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground" render={<CollapsibleTrigger />}>
                      {item.title}{" "}
                      <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-aria-expanded/menu-button:rotate-90" />
                    </SidebarMenuButton>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items.map((sub) => {
                          const SubIcon = sub.icon
                          return (
                            <SidebarMenuSubItem key={sub.title}>
                              <SidebarMenuSubButton
                                isActive={isActive(sub.url)}
                                className={
                                  "h-8 text-[13px] " +
                                  (isActive(sub.url)
                                    ? "bg-[#5F61E6]/10 font-medium text-[#5F61E6] hover:bg-[#5F61E6]/15"
                                    : "")
                                }
                                render={<a href={sub.url} />}
                              >
                                {SubIcon ? (
                                  <SubIcon className="size-4" />
                                ) : null}
                                {sub.title}
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

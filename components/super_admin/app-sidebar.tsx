"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  ChevronRight,
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
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
    items: [{ title: "Add Faculty", url: "/super_admin/faculty", icon: Building2 }],
  },
  {
    title: "Setting",
    items: [
      { title: "Add User", url: "/super_admin/faculty_users", icon: Users },
      { title: "Add Admin", url: "/super_admin/super_admin", icon: ShieldCheck },
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
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<a href="/super_admin" />}>
              <img
                src="/images/logo1.png"
                alt="Logo"
                className="size-8 rounded-lg object-contain"
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={isActive("/super_admin")}
                className={
                  isActive("/super_admin")
                    ? "bg-[#5F61E6]/10 text-[#5F61E6] hover:bg-[#5F61E6]/15"
                    : ""
                }
                render={<a href="/super_admin" />}
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
                    <SidebarMenuButton render={<CollapsibleTrigger />}>
                      {item.title}{" "}
                      <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-aria-expanded/menu-button:rotate-90" />
                    </SidebarMenuButton>
                    {item.items?.length ? (
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((sub) => {
                            const SubIcon = sub.icon
                            return (
                              <SidebarMenuSubItem key={sub.title}>
                                <SidebarMenuSubButton
                                  isActive={isActive(sub.url)}
                                  className={
                                    isActive(sub.url)
                                      ? "bg-[#5F61E6]/10 text-[#5F61E6] hover:bg-[#5F61E6]/15"
                                      : ""
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
                    ) : null}
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

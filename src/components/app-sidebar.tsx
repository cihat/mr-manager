import { BookMarked, History, ViewIcon } from "lucide-react"
import { Link, useLocation } from "react-router"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export const items = [
  // {
  //   title: "Bash",
  //   url: "/bash",
  //   icon: Command,
  //   isComingSoon: true,
  //   hasFolderPicker: true,
  // },
  {
    title: "History",
    url: "/history",
    icon: History,
    isComingSoon: false,
    hasFolderPicker: true,
  },
  {
    title: "Track",
    url: "/track",
    icon: ViewIcon,
    isComingSoon: false,
    hasFolderPicker: false,
  },
  {
    title: "Docs",
    url: "/docs",
    icon: BookMarked,
    hasFolderPicker: true,
  },
]

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Monorepo Manager</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                  >
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                      {item.isComingSoon && (
                        <span className="text-xs text-gray-400 ml-auto">Coming Soon</span>
                      )}
                    </Link>

                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

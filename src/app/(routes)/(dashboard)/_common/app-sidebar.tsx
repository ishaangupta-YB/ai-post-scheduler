"use client"

import Link from "next/link"
import {
  ChevronsUpDown,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Plus,
  Settings as SettingsIcon,
  Sun,
  User as UserIcon,
} from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { useTheme } from "next-themes"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { authClient } from "@/lib/auth-client"

import {
  defaultDashboardPath,
  isNavActive,
  mainNav,
} from "./dashboard-nav"

type AppSidebarUser = {
  name: string
  email: string
  image?: string | null
}

export default function AppSidebar({ user }: { user: AppSidebarUser }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const BrandIcon = mainNav[0].icon

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

  async function handleSignOut() {
    setIsSigningOut(true)
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.replace("/sign-in")
          router.refresh()
        },
      },
    })
    setIsSigningOut(false)
  }

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-2 py-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                render={<Link href={defaultDashboardPath} />}
                tooltip="Post Scheduler"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <BrandIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Post Scheduler</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    Dashboard
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Actions</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setIsCreatePostOpen(true)}
                    tooltip="Create post"
                    className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground active:bg-sidebar-primary/90 active:text-sidebar-primary-foreground"
                  >
                    <Plus />
                    <span>Create post</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Main</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainNav.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isNavActive(pathname, item.href)}
                      tooltip={item.name}
                    >
                      <item.icon />
                      <span>{item.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="px-2 py-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton
                      size="lg"
                      tooltip={user.name}
                      className="data-[state=open]:bg-sidebar-accent"
                    >
                      <Avatar className="size-7">
                        {user.image ? (
                          <AvatarImage src={user.image} alt={user.name} />
                        ) : null}
                        <AvatarFallback>{initials || "?"}</AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">
                          {user.name}
                        </span>
                        <span className="truncate text-xs text-sidebar-foreground/70">
                          {user.email}
                        </span>
                      </div>
                      <ChevronsUpDown className="ml-auto size-4 opacity-70" />
                    </SidebarMenuButton>
                  }
                />
                <DropdownMenuContent
                  align="end"
                  side="top"
                  sideOffset={8}
                  className="min-w-60"
                >
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5">
                      <Avatar className="size-8">
                        {user.image ? (
                          <AvatarImage src={user.image} alt={user.name} />
                        ) : null}
                        <AvatarFallback>{initials || "?"}</AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">{user.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={() => router.push("/dashboard/profile")}
                    >
                      <UserIcon className="size-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push("/dashboard/settings")}
                    >
                      <SettingsIcon className="size-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Palette className="size-4" />
                        <span>Appearance</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent side="top" sideOffset={4}>
                        <DropdownMenuItem onClick={() => setTheme("light")}>
                          <Sun className="size-4" />
                          <span>Light</span>
                          {theme === "light" ? (
                            <span className="ml-auto text-xs text-muted-foreground">
                              ✓
                            </span>
                          ) : null}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("dark")}>
                          <Moon className="size-4" />
                          <span>Dark</span>
                          {theme === "dark" ? (
                            <span className="ml-auto text-xs text-muted-foreground">
                              ✓
                            </span>
                          ) : null}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("system")}>
                          <Monitor className="size-4" />
                          <span>System</span>
                          {theme === "system" ? (
                            <span className="ml-auto text-xs text-muted-foreground">
                              ✓
                            </span>
                          ) : null}
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    variant="destructive"
                  >
                    <LogOut className="size-4" />
                    <span>{isSigningOut ? "Signing out…" : "Log out"}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <Dialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create post</DialogTitle>
            <DialogDescription>
              Draft a new post to add to your ideas or schedule.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Post composer coming soon. Use Ideas to capture drafts for now.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatePostOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setIsCreatePostOpen(false)
                router.push(defaultDashboardPath)
              }}
            >
              Go to Ideas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

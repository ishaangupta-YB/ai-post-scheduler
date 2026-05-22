"use client"

import Link from "next/link"
import {
  ChevronsUpDown,
  CreditCard,
  Leaf,
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
import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { INTEGRATIONS } from "@/lib/constants/integrations"
import type { IntegrationListResponse } from "@/app/api/integrations/route"
import { APP_NAME } from "@/lib/constants/app"

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
  const [connectedKeys, setConnectedKeys] = useState<string[]>([])
  const BrandIcon = mainNav[0].icon

  useEffect(() => {
    let cancelled = false
    async function loadConnected() {
      try {
        const res = await fetch("/api/integrations?filter=connected", {
          credentials: "include",
        })
        if (!res.ok || cancelled) return
        const data = (await res.json()) as IntegrationListResponse
        if (cancelled) return
        setConnectedKeys(data.integrations.map((i) => i.platform))
      } catch (e) {
        console.error(e)
      }
    }

    loadConnected()
    window.addEventListener("integrations:updated", loadConnected)
    return () => {
      cancelled = true
      window.removeEventListener("integrations:updated", loadConnected)
    }
  }, [])

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
          router.replace("/")
          router.refresh()
        },
      },
    })
    setIsSigningOut(false)
  }

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-3 py-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                render={<Link href={defaultDashboardPath} />}
                tooltip={APP_NAME}
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-warning text-warning-foreground shadow-xs">
                  <Leaf className="size-4.5 fill-current" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold text-foreground text-md">
                    {APP_NAME}
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <div className="px-3 py-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setIsCreatePostOpen(true)}
                  tooltip="New Post"
                  className="bg-warning text-warning-foreground hover:bg-warning/90 hover:text-warning-foreground active:bg-warning/80 active:text-warning-foreground font-semibold rounded-full justify-center h-10 w-full flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="size-4 stroke-[3px]" />
                  <span>New Post</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>

          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainNav.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isNavActive(pathname, item.href)}
                      tooltip={item.name}
                    >
                      <item.icon className="size-4" />
                      <span className="font-medium">{item.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-3">
            <SidebarGroupLabel className="text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase px-2 mb-1.5">
              Connect Integrations
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <Link
                href="/dashboard/integrations"
                className="group/integrations flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-sidebar-accent/40 px-3 py-2.5 hover:border-border hover:bg-sidebar-accent transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex -space-x-1.5 shrink-0">
                    {INTEGRATIONS.slice(0, 4).map((integration) => (
                      <div
                        key={integration.type}
                        className="size-6 rounded-md ring-2 ring-sidebar flex items-center justify-center text-white"
                        style={{ backgroundColor: integration.brandColor }}
                      >
                        <integration.icon className="size-3 fill-current" />
                      </div>
                    ))}
                  </div>
                  <span className="text-sm font-medium truncate">
                    Integrations
                  </span>
                </div>
                <span className="text-xs font-mono tabular-nums text-muted-foreground group-hover/integrations:text-foreground transition-colors">
                  {connectedKeys.length}/{INTEGRATIONS.length}
                </span>
              </Link>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="px-2 py-3 gap-3">
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
                  <DropdownMenuGroup>
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
                  </DropdownMenuGroup>
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
                    <DropdownMenuItem
                      onClick={() => router.push("/dashboard/billing")}
                    >
                      <CreditCard className="size-4" />
                      <span>Billing</span>
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

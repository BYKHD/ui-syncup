"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { RiSidebarFoldLine, RiSidebarUnfoldLine } from "@remixicon/react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

/** Reads the sidebar open state from the cookie synchronously (client-only). */
function getSidebarCookieState(fallback: boolean): boolean {
  if (typeof document === "undefined") return fallback
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${SIDEBAR_COOKIE_NAME}=`))
  if (!match) return fallback
  return match.split("=")[1] === "true"
}

const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "3rem"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

// ---- Centralized Styles ----

// -------------------------------------------------------------------------
// CENTRALIZED STYLES (CVA Variants)
// -------------------------------------------------------------------------
//
// These variant configurations determine the visual appearance, layout, 
// and interactive states (hover, focus, active) of each sidebar piece.
// You can edit the Tailwind classes here to broadly customize the Sidebar.
//
// -------------------------------------------------------------------------

// 1. SidebarWrapper: Defines the outermost container of the entire layout.
export const sidebarWrapperVariants = cva(
  "group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full"
)

// 2. Sidebar Static: Styles the non-collapsible, standard version of the sidebar.
export const sidebarVariants = cva(
  "bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col"
)

// 3. Sidebar Mobile: Styles the sidebar when opened inside a mobile Sheet component.
export const sidebarMobileVariants = cva(
  "bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden"
)

// 4. Sidebar Desktop (Wrapper): Controls visibility classes for the desktop perspective.
export const sidebarDesktopVariants = cva(
  "group peer text-sidebar-foreground hidden md:block"
)

// 5. Sidebar Gap: Invisible element used on desktop to reserve the space that the sidebar occupies.
export const sidebarGapVariants = cva(
  "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear group-data-[collapsible=offcanvas]:w-0 group-data-[side=right]:rotate-180",
  {
    variants: {
      variant: {
        floating: "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]",
        inset: "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]",
        sidebar: "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
      },
    },
    defaultVariants: {
      variant: "sidebar",
    },
  }
)

// 6. Sidebar Container: The fixed container clamping the sidebar in the view (handles side placement).
export const sidebarContainerVariants = cva(
  "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex",
  {
    variants: {
      side: {
        left: "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]",
        right: "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
      },
      variant: {
        floating: "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]",
        inset: "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]",
        sidebar: "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l",
      },
    },
    defaultVariants: {
      side: "left",
      variant: "sidebar",
    },
  }
)

// 7. Sidebar Inner: The visible card/surface of the sidebar. Defines background, border, shadow.
export const sidebarInnerVariants = cva(
  "bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm"
)

// 8. Sidebar Rail: The draggable edge that can be clicked to collapse the sidebar.
export const sidebarRailVariants = cva(
  "hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] sm:flex in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize [[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full [[data-side=left][data-collapsible=offcanvas]_&]:-right-2 [[data-side=right][data-collapsible=offcanvas]_&]:-left-2"
)

// 9. Sidebar Inset: Wraps the main page content, making space or adding border/radius when sidebar is "inset".
export const sidebarInsetVariants = cva(
  "bg-background relative flex w-full flex-1 flex-col md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2"
)

// 10. Sidebar Input: Replaces standard inputs for a subtler, sidebar-fitted version.
export const sidebarInputVariants = cva("bg-background h-8 w-full shadow-none")

// 11. Sidebar Header: Topmost section of the sidebar content, usually contains brand or team selector.
export const sidebarHeaderVariants = cva("flex flex-col gap-2 p-2")

// 12. Sidebar Footer: Bottommost section of the sidebar, usually contains the user profile indicator.
export const sidebarFooterVariants = cva("flex flex-col gap-2 p-2")

// 13. Sidebar Separator: A horizontal line divider between sections in the sidebar.
export const sidebarSeparatorVariants = cva("bg-sidebar-border mx-2 w-auto")

// 14. Sidebar Content: Scrollable core area for the sidebar containing multiple groups or links.
export const sidebarContentVariants = cva(
  "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden"
)

// 15. Sidebar Group: A distinct group of links or content (e.g. "Platform", "Projects").
export const sidebarGroupVariants = cva(
  "relative flex w-full min-w-0 flex-col p-2"
)

// 16. Sidebar Group Label: The small title header for a `SidebarGroup`.
export const sidebarGroupLabelVariants = cva(
  "text-sidebar-foreground/70 ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0 group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0"
)

// 17. Sidebar Group Action: Optional button near the group label (e.g., "+" to create a new project).
export const sidebarGroupActionVariants = cva(
  "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0 after:absolute after:-inset-2 md:after:hidden group-data-[collapsible=icon]:hidden"
)

// 18. Sidebar Group Content: Wraps the actual list items / navigation links inside the group.
export const sidebarGroupContentVariants = cva("w-full text-sm")

// 19. Sidebar Menu: The `ul` list wrapper around items.
export const sidebarMenuVariants = cva("flex w-full min-w-0 flex-col gap-1")

// 20. Sidebar Menu Item: The `li` wrapper for an individual navigation item.
export const sidebarMenuItemVariants = cva("group/menu-item relative")

// 21. Sidebar Menu Button: The clickable area of the item. Includes all interactive states (hover/active/selected).
export const sidebarMenuButtonVariants = cva(
  [
    // Base layout & text
    "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden",
    // Focus ring
    "ring-sidebar-ring focus-visible:ring-2",
    // Transitions
    "transition-[width,height,padding]",
    // Hover states
    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    "data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground",
    // ACTIVE  
    "active:bg-sidebar-accent active:text-sidebar-accent-foreground active:scale-[0.98]",
    "data-[active=true]:bg-card data-[active=true]:shadow-active-menu data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground",
    // ACTIVE + HOVER
    "data-[active=true]:hover:bg-card",
    // ACTIVE + PRESS
    "data-[active=true]:active:bg-card data-[active=true]:active:scale-[0.98]",
    // Disabled states
    "disabled:pointer-events-none disabled:opacity-50",
    "aria-disabled:pointer-events-none aria-disabled:opacity-50",
    // Collapsible Icon tweaks
    "group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2!",
    // Children formatting (text truncate & icon sizing)
    "[&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
    // Actions space reservation
    "group-has-data-[sidebar=menu-action]/menu-item:pr-8",
  ],
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// 22. Sidebar Menu Action: Optional auxiliary button inside the item (e.g. dropdown trigger `...`).
export const sidebarMenuActionVariants = cva(
  "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground peer-hover/menu-button:text-sidebar-accent-foreground absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0 after:absolute after:-inset-2 md:after:hidden peer-data-[size=sm]/menu-button:top-1 peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 group-data-[collapsible=icon]:hidden",
  {
    variants: {
      showOnHover: {
        true: "peer-data-[active=true]/menu-button:text-sidebar-accent-foreground group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 md:opacity-0",
        false: "",
      },
    },
    defaultVariants: {
      showOnHover: false,
    },
  }
)

// 23. Sidebar Menu Badge: The small icon/text tag pinned to the edge of the item (e.g., numbering or status).
export const sidebarMenuBadgeVariants = cva(
  "text-sidebar-foreground pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums select-none peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground peer-data-[size=sm]/menu-button:top-1 peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 group-data-[collapsible=icon]:hidden"
)

// 24. Sidebar Menu Skeleton: Placeholder loading state for the menu item.
export const sidebarMenuSkeletonVariants = cva(
  "flex h-8 items-center gap-2 rounded-md px-2"
)

// 25. Sidebar Menu Sub: The list container for nested/child navigation paths.
export const sidebarMenuSubVariants = cva(
  "border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5 group-data-[collapsible=icon]:hidden"
)

// 26. Sidebar Menu Sub Item: `li` item for the nested navigation.
export const sidebarMenuSubItemVariants = cva("group/menu-sub-item relative")

// 27. Sidebar Menu Sub Button: The clickable nested link.
export const sidebarMenuSubButtonVariants = cva(
  [
    // Base layout
    "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 outline-hidden",
    // Text rendering & focus ring
    "text-sidebar-foreground ring-sidebar-ring focus-visible:ring-2",
    // Hover states
    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    // ⬇️ active
    "active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground active:scale-[0.98]",
    "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
    // ACTIVE + HOVER
    "data-[active=true]:hover:bg-sidebar-accent/80",
    // ACTIVE + PRESS
    "data-[active=true]:active:bg-sidebar-accent/70 data-[active=true]:active:scale-[0.98]",
    // Disabled states
    "disabled:pointer-events-none disabled:opacity-50",
    "aria-disabled:pointer-events-none aria-disabled:opacity-50",
    // Children formatting
    "[&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
    // Hidden on collapsible
    "group-data-[collapsible=icon]:hidden",
  ],
  {
    variants: {
      size: {
        sm: "text-xs",
        md: "text-sm",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

// ---- Context & Providers ----

type SidebarContextProps = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)

  // This is the internal state of the sidebar.
  // We use openProp and setOpenProp for control from outside the component.
  // Lazy initializer: restore from cookie on first mount (component is client-only).
  const [_open, _setOpen] = React.useState(() => getSidebarCookieState(defaultOpen))
  const open = openProp ?? _open
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value
      if (setOpenProp) {
        setOpenProp(openState)
      } else {
        _setOpen(openState)
      }

      // This sets the cookie to keep the sidebar state.
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
    },
    [setOpenProp, open]
  )

  // Helper to toggle the sidebar.
  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open)
  }, [isMobile, setOpen, setOpenMobile])

  // Adds a keyboard shortcut to toggle the sidebar.
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault()
        toggleSidebar()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleSidebar])

  // We add a state so that we can do data-state="expanded" or "collapsed".
  // This makes it easier to style the sidebar with Tailwind classes.
  const state = open ? "expanded" : "collapsed"

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
  )

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          data-slot="sidebar-wrapper"
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH,
              "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
              ...style,
            } as React.CSSProperties
          }
          className={cn(sidebarWrapperVariants(), className)}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  )
}

function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  side?: "left" | "right"
  variant?: "sidebar" | "floating" | "inset"
  collapsible?: "offcanvas" | "icon" | "none"
}) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar()

  if (collapsible === "none") {
    return (
      <div
        data-slot="sidebar"
        className={cn(sidebarVariants(), className)}
        {...props}
      >
        {children}
      </div>
    )
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          className={sidebarMobileVariants()}
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
            } as React.CSSProperties
          }
          side={side}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      className={sidebarDesktopVariants()}
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-variant={variant}
      data-side={side}
      data-slot="sidebar"
    >
      {/* This is what handles the sidebar gap on desktop */}
      <div
        data-slot="sidebar-gap"
        className={sidebarGapVariants({ variant })}
      />
      <div
        data-slot="sidebar-container"
        className={cn(sidebarContainerVariants({ side, variant }), className)}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          className={sidebarInnerVariants()}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar, state, isMobile, openMobile } = useSidebar()

  // On mobile, use openMobile state; on desktop, use state
  const isOpen = isMobile ? openMobile : state === "expanded"

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn("", className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      {isOpen ? (
        <RiSidebarFoldLine />
      ) : (
        <RiSidebarUnfoldLine />
      )}
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
}

function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar"
      className={cn(sidebarRailVariants(), className)}
      {...props}
    />
  )
}

function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(sidebarInsetVariants(), className)}
      {...props}
    />
  )
}

function SidebarInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      data-slot="sidebar-input"
      data-sidebar="input"
      className={cn(sidebarInputVariants(), className)}
      {...props}
    />
  )
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn(sidebarHeaderVariants(), className)}
      {...props}
    />
  )
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn(sidebarFooterVariants(), className)}
      {...props}
    />
  )
}

function SidebarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn(sidebarSeparatorVariants(), className)}
      {...props}
    />
  )
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn(sidebarContentVariants(), className)}
      {...props}
    />
  )
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn(sidebarGroupVariants(), className)}
      {...props}
    />
  )
}

function SidebarGroupLabel({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "div"

  return (
    <Comp
      data-slot="sidebar-group-label"
      data-sidebar="group-label"
      className={cn(sidebarGroupLabelVariants(), className)}
      {...props}
    />
  )
}

function SidebarGroupAction({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="sidebar-group-action"
      data-sidebar="group-action"
      className={cn(sidebarGroupActionVariants(), className)}
      {...props}
    />
  )
}

function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn(sidebarGroupContentVariants(), className)}
      {...props}
    />
  )
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn(sidebarMenuVariants(), className)}
      {...props}
    />
  )
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn(sidebarMenuItemVariants(), className)}
      {...props}
    />
  )
}

function SidebarMenuButton({
  asChild = false,
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean
  isActive?: boolean
  tooltip?: string | React.ComponentProps<typeof TooltipContent>
} & VariantProps<typeof sidebarMenuButtonVariants>) {
  const Comp = asChild ? Slot : "button"
  const { isMobile, state } = useSidebar()

  const button = (
    <Comp
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
      {...props}
    />
  )

  if (!tooltip) {
    return button
  }

  if (typeof tooltip === "string") {
    tooltip = {
      children: tooltip,
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        hidden={state !== "collapsed" || isMobile}
        {...tooltip}
      />
    </Tooltip>
  )
}

function SidebarMenuAction({
  className,
  asChild = false,
  showOnHover = false,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean
  showOnHover?: boolean
}) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="sidebar-menu-action"
      data-sidebar="menu-action"
      className={cn(sidebarMenuActionVariants({ showOnHover }), className)}
      {...props}
    />
  )
}

function SidebarMenuBadge({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn(sidebarMenuBadgeVariants(), className)}
      {...props}
    />
  )
}

function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: React.ComponentProps<"div"> & {
  showIcon?: boolean
}) {
  // Random width between 50 to 90%.
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`
  }, [])

  return (
    <div
      data-slot="sidebar-menu-skeleton"
      data-sidebar="menu-skeleton"
      className={cn(sidebarMenuSkeletonVariants(), className)}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="size-4 rounded-md"
          data-sidebar="menu-skeleton-icon"
        />
      )}
      <Skeleton
        className="h-4 max-w-(--skeleton-width) flex-1"
        data-sidebar="menu-skeleton-text"
        style={
          {
            "--skeleton-width": width,
          } as React.CSSProperties
        }
      />
    </div>
  )
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      className={cn(sidebarMenuSubVariants(), className)}
      {...props}
    />
  )
}

function SidebarMenuSubItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-sub-item"
      data-sidebar="menu-sub-item"
      className={cn(sidebarMenuSubItemVariants(), className)}
      {...props}
    />
  )
}

function SidebarMenuSubButton({
  asChild = false,
  size = "md",
  isActive = false,
  className,
  ...props
}: React.ComponentProps<"a"> & {
  asChild?: boolean
  size?: "sm" | "md"
  isActive?: boolean
}) {
  const Comp = asChild ? Slot : "a"

  return (
    <Comp
      data-slot="sidebar-menu-sub-button"
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(sidebarMenuSubButtonVariants({ size }), className)}
      {...props}
    />
  )
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
}

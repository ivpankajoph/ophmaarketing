import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Megaphone, 
  GitBranch, 
  Users, 
  Settings, 
  LogOut,
  Menu,
  Bell,
  Search,
  FileText,
  LayoutGrid,
  Bot,
  BarChart3,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Define navigation structure
  const navStructure = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: "/",
    },
    {
      icon: MessageSquare,
      label: "Inbox",
      href: "/inbox",
    },
    {
      icon: Megaphone,
      label: "Campaigns",
      href: "/campaigns", // Kept for active state checking
      subItems: [
        { label: "Broadcasts", href: "/campaigns/broadcast" },
        { label: "Selected Contacts", href: "/campaigns/selected-contacts" },
        { label: "Schedule Messages", href: "/campaigns/schedule" },
        { label: "Single Message", href: "/campaigns/single" },
        { label: "Reports", href: "/campaigns/report" },
      ]
    },
    {
      icon: GitBranch,
      label: "Automation",
      href: "/automation",
      subItems: [
        { label: "Builder", href: "/automation" },
        { label: "Auto Leads", href: "/automation/leads" },
        { label: "Keyword Reply", href: "/automation/keywords" },
        { label: "Follow-up", href: "/automation/follow-up" },
        { label: "Drip Campaign", href: "/automation/drip" },
        { label: "New Lead Alert", href: "/automation/new-leads" },
      ]
    },
    {
      icon: LayoutGrid,
      label: "Connect Apps",
      href: "/apps/connect",
    },
    {
      icon: FileText,
      label: "Templates",
      href: "/templates",
      subItems: [
        { label: "Add Template", href: "/templates/add" },
        { label: "Template Status", href: "/templates/status" },
        { label: "Manage Templates", href: "/templates/manage" },
      ]
    },
    {
      icon: Bot,
      label: "AI Agent",
      href: "/ai",
      subItems: [
        { label: "New Agent", href: "/ai/new" },
        { label: "Manage Agents", href: "/ai/manage" },
      ]
    },
    {
      icon: BarChart3,
      label: "Reports",
      href: "/reports",
      subItems: [
        { label: "Delivery Report", href: "/reports/delivery" },
        { label: "Campaign Perf.", href: "/reports/campaigns" },
        { label: "Replies", href: "/reports/replies" },
        { label: "Agent Perf.", href: "/reports/agents" },
        { label: "Spending", href: "/reports/spending" },
        { label: "Credits", href: "/reports/credits" },
      ]
    },
    {
      icon: Users,
      label: "Contacts",
      href: "/contacts",
    },
    {
      icon: Settings,
      label: "Settings",
      href: "/settings",
      subItems: [
        { label: "Team Members", href: "/settings/team" },
        { label: "Permissions", href: "/settings/permissions" },
        { label: "WhatsApp Number", href: "/settings/whatsapp" },
        { label: "Profile Details", href: "/settings/profile" },
        { label: "Webhook & API", href: "/settings/api" },
        { label: "Billing & Credits", href: "/settings/billing" },
      ]
    },
  ];

  const NavItem = ({ item }: { item: any }) => {
    const isActive = location === item.href || (item.subItems && item.subItems.some((sub: any) => location === sub.href));
    const [isOpen, setIsOpen] = useState(isActive);

    if (item.subItems) {
      return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-1">
          <CollapsibleTrigger asChild>
            <div 
              className={`
                flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer select-none
                ${isActive 
                  ? "bg-sidebar-accent/50 text-sidebar-accent-foreground" 
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
                }
              `}
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-4 w-4" />
                {item.label}
              </div>
              {isOpen ? <ChevronDown className="h-3 w-3 opacity-50" /> : <ChevronRight className="h-3 w-3 opacity-50" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-9 space-y-1 animate-in slide-in-from-top-2 duration-200">
            {item.subItems.map((sub: any) => (
              <Link key={sub.href} href={sub.href}>
                <div 
                  className={`
                    block px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer
                    ${location === sub.href 
                      ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
                    }
                  `}
                >
                  {sub.label}
                </div>
              </Link>
            ))}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <Link href={item.href}>
        <div 
          className={`
            flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer
            ${isActive 
              ? "bg-sidebar-accent text-sidebar-accent-foreground" 
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            }
          `}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </div>
      </Link>
    );
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
          <MessageSquare className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-lg leading-none tracking-tight">WhatsApp</h1>
          <span className="text-xs text-sidebar-foreground/60">Business API</span>
        </div>
      </div>

      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navStructure.map((item, idx) => (
          <NavItem key={idx} item={item} />
        ))}
      </div>

      <div className="p-4 border-t border-sidebar-border shrink-0">
        <div className="p-4 rounded-lg bg-sidebar-accent/50">
          <h4 className="text-sm font-medium text-sidebar-foreground mb-1">Need Help?</h4>
          <p className="text-xs text-sidebar-foreground/60 mb-3">Check our documentation for guides.</p>
          <Button size="sm" variant="secondary" className="w-full text-xs">Documentation</Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 flex">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 bg-sidebar border-r border-sidebar-border text-sidebar-foreground shrink-0">
        <NavContent />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-border bg-background px-6 flex items-center justify-between shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
                <NavContent />
              </SheetContent>
            </Sheet>
            
            <div className="relative hidden sm:block w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search messages, contacts, campaigns..." 
                className="pl-9 bg-secondary/50 border-none focus-visible:ring-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive border-2 border-background"></span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9 border border-border">
                    <AvatarImage src="https://github.com/shadcn.png" alt="@user" />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Acme Inc</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      admin@acme.com
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Users className="mr-2 h-4 w-4" />
                  <span>Team Members</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Inbox from "@/pages/inbox";
import Campaigns from "@/pages/campaigns";
import Automation from "@/pages/automation";
import Contacts from "@/pages/contacts";
import Settings from "@/pages/settings";
import TeamMembers from "@/pages/settings/TeamMembers";
import Permissions from "@/pages/settings/Permissions";
import WhatsAppNumber from "@/pages/settings/WhatsAppNumber";
import ProfileDetails from "@/pages/settings/ProfileDetails";
import WebhookAPI from "@/pages/settings/WebhookAPI";
import Billing from "@/pages/settings/Billing";

import Templates from "@/pages/templates";

// New Imports
import Broadcast from "@/pages/campaigns/Broadcast";
import SelectedContacts from "@/pages/campaigns/SelectedContacts";
import Schedule from "@/pages/campaigns/Schedule";
import Single from "@/pages/campaigns/Single";
import Report from "@/pages/campaigns/Report";

import AutoLeads from "@/pages/automation/AutoLeads";
import Keywords from "@/pages/automation/Keywords";
import FollowUp from "@/pages/automation/FollowUp";
import Drip from "@/pages/automation/Drip";
import NewLeads from "@/pages/automation/NewLeads";

import ConnectApps from "@/pages/apps/ConnectApps";

import AddTemplate from "@/pages/templates/AddTemplate";
import TemplateStatus from "@/pages/templates/TemplateStatus";
import ManageTemplates from "@/pages/templates/ManageTemplates";

import NewAgent from "@/pages/ai/NewAgent";
import ManageAgents from "@/pages/ai/ManageAgents";

import DeliveryReport from "@/pages/reports/DeliveryReport";
import CampaignPerformance from "@/pages/reports/CampaignPerformance";
import CustomerReplies from "@/pages/reports/CustomerReplies";
import AgentPerformance from "@/pages/reports/AgentPerformance";
import Spending from "@/pages/reports/Spending";
import Credits from "@/pages/reports/Credits";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/inbox" component={Inbox} />
      
      {/* Campaigns */}
      <Route path="/campaigns" component={Campaigns} />
      <Route path="/campaigns/broadcast" component={Broadcast} />
      <Route path="/campaigns/selected-contacts" component={SelectedContacts} />
      <Route path="/campaigns/schedule" component={Schedule} />
      <Route path="/campaigns/single" component={Single} />
      <Route path="/campaigns/report" component={Report} />

      {/* Automation */}
      <Route path="/automation" component={Automation} />
      <Route path="/automation/leads" component={AutoLeads} />
      <Route path="/automation/keywords" component={Keywords} />
      <Route path="/automation/follow-up" component={FollowUp} />
      <Route path="/automation/drip" component={Drip} />
      <Route path="/automation/new-leads" component={NewLeads} />

      {/* Apps */}
      <Route path="/apps/connect" component={ConnectApps} />

      {/* Templates */}
      <Route path="/templates" component={Templates} />
      <Route path="/templates/add" component={AddTemplate} />
      <Route path="/templates/status" component={TemplateStatus} />
      <Route path="/templates/manage" component={ManageTemplates} />

      {/* AI */}
      <Route path="/ai" component={ManageAgents} />
      <Route path="/ai/new" component={NewAgent} />
      <Route path="/ai/manage" component={ManageAgents} />

      {/* Reports */}
      <Route path="/reports" component={DeliveryReport} />
      <Route path="/reports/delivery" component={DeliveryReport} />
      <Route path="/reports/campaigns" component={CampaignPerformance} />
      <Route path="/reports/replies" component={CustomerReplies} />
      <Route path="/reports/agents" component={AgentPerformance} />
      <Route path="/reports/spending" component={Spending} />
      <Route path="/reports/credits" component={Credits} />

      <Route path="/contacts" component={Contacts} />
      <Route path="/settings" component={Settings} />
      <Route path="/settings/team" component={TeamMembers} />
      <Route path="/settings/permissions" component={Permissions} />
      <Route path="/settings/whatsapp" component={WhatsAppNumber} />
      <Route path="/settings/profile" component={ProfileDetails} />
      <Route path="/settings/api" component={WebhookAPI} />
      <Route path="/settings/billing" component={Billing} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

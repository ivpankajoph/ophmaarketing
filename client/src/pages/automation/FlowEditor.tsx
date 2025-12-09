import { useCallback, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { 
  ReactFlow, 
  MiniMap, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, 
  addEdge,
  BackgroundVariant,
  Position,
  Handle,
  Connection,
  Edge,
  Node
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Save, Play, Plus, ArrowLeft, Upload, MessageSquare, Clock, GitBranch, Zap, Settings } from "lucide-react";
import { Link } from "wouter";
import { getAuthHeaders } from "@/contexts/AuthContext";
import { toast } from "sonner";

const TriggerNode = ({ data }: { data: { label: string } }) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-yellow-500 min-w-[150px]">
      <div className="font-bold text-sm text-yellow-600 mb-1 flex items-center gap-1">
        <Zap className="h-3 w-3" /> Trigger
      </div>
      <div className="text-xs text-gray-500">{data.label}</div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-yellow-500" />
    </div>
  );
};

const MessageNode = ({ data }: { data: { label: string } }) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border border-blue-300 min-w-[150px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400" />
      <div className="font-bold text-sm text-blue-600 mb-1 flex items-center gap-1">
        <MessageSquare className="h-3 w-3" /> Message
      </div>
      <div className="text-xs text-gray-500">{data.label}</div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-gray-400" />
    </div>
  );
};

const DelayNode = ({ data }: { data: { label: string } }) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border border-purple-300 min-w-[150px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400" />
      <div className="font-bold text-sm text-purple-600 mb-1 flex items-center gap-1">
        <Clock className="h-3 w-3" /> Delay
      </div>
      <div className="text-xs text-gray-500">{data.label}</div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-gray-400" />
    </div>
  );
};

const ConditionNode = ({ data }: { data: { label: string } }) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border border-orange-300 min-w-[150px] relative">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400" />
      <div className="font-bold text-sm text-orange-600 mb-1 flex items-center gap-1">
        <GitBranch className="h-3 w-3" /> Condition
      </div>
      <div className="text-xs text-gray-500">{data.label}</div>
      <div className="flex justify-between mt-2 text-[10px]">
        <span className="text-green-600">Yes</span>
        <span className="text-red-600">No</span>
      </div>
      <Handle type="source" position={Position.Bottom} id="yes" className="w-3 h-3 bg-green-500" style={{ left: '25%' }} />
      <Handle type="source" position={Position.Bottom} id="no" className="w-3 h-3 bg-red-500" style={{ left: '75%' }} />
    </div>
  );
};

const ActionNode = ({ data }: { data: { label: string } }) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border border-green-300 min-w-[150px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400" />
      <div className="font-bold text-sm text-green-600 mb-1 flex items-center gap-1">
        <Settings className="h-3 w-3" /> Action
      </div>
      <div className="text-xs text-gray-500">{data.label}</div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-gray-400" />
    </div>
  );
};

const nodeTypes = {
  trigger: TriggerNode,
  message: MessageNode,
  delay: DelayNode,
  condition: ConditionNode,
  action: ActionNode,
};

const defaultNodes: Node[] = [
  { id: '1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Flow Started' } },
];

const defaultEdges: Edge[] = [];

export default function FlowEditor() {
  const [, params] = useRoute("/automation/flows/:flowId/edit");
  const flowId = params?.flowId;
  
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);
  const [flowName, setFlowName] = useState("");
  const [flowDescription, setFlowDescription] = useState("");
  const [isAddNodeOpen, setIsAddNodeOpen] = useState(false);
  const [selectedNodeType, setSelectedNodeType] = useState("message");
  const [nodeLabel, setNodeLabel] = useState("");

  const queryClient = useQueryClient();

  const { data: flow, isLoading } = useQuery({
    queryKey: ["/api/automation/flows", flowId],
    queryFn: async () => {
      if (!flowId || flowId === 'new') return null;
      const res = await fetch(`/api/automation/flows/${flowId}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch flow");
      return res.json();
    },
    enabled: !!flowId && flowId !== 'new'
  });

  useEffect(() => {
    if (flow) {
      setFlowName(flow.name || "");
      setFlowDescription(flow.description || "");
      if (flow.nodes && flow.nodes.length > 0) {
        setNodes(flow.nodes);
      }
      if (flow.edges && flow.edges.length > 0) {
        setEdges(flow.edges);
      }
    }
  }, [flow, setNodes, setEdges]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: flowName,
        description: flowDescription,
        nodes,
        edges
      };
      
      if (flowId && flowId !== 'new') {
        const res = await fetch(`/api/automation/flows/${flowId}`, {
          method: "PUT",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Failed to save flow");
        return res.json();
      } else {
        const res = await fetch("/api/automation/flows", {
          method: "POST",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Failed to create flow");
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/flows"] });
      toast.success("Flow saved successfully");
    },
    onError: () => toast.error("Failed to save flow")
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!flowId || flowId === 'new') {
        throw new Error("Please save the flow first");
      }
      const res = await fetch(`/api/automation/flows/${flowId}/publish`, {
        method: "POST",
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to publish flow");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/flows"] });
      toast.success("Flow published");
    },
    onError: (error: Error) => toast.error(error.message)
  });

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNode = () => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: selectedNodeType,
      position: { x: 250, y: (nodes.length) * 100 },
      data: { label: nodeLabel || `New ${selectedNodeType}` }
    };
    setNodes((nds) => [...nds, newNode]);
    setIsAddNodeOpen(false);
    setNodeLabel("");
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-screen flex flex-col">
        <div className="border-b bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/automation/flows">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <Input
                  value={flowName}
                  onChange={(e) => setFlowName(e.target.value)}
                  placeholder="Flow Name"
                  className="font-semibold text-lg border-none shadow-none focus-visible:ring-0 p-0 h-auto"
                />
                <Input
                  value={flowDescription}
                  onChange={(e) => setFlowDescription(e.target.value)}
                  placeholder="Add description..."
                  className="text-sm text-gray-500 border-none shadow-none focus-visible:ring-0 p-0 h-auto"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={flow?.status === 'published' ? 'default' : 'secondary'}>
                {flow?.status || 'draft'}
              </Badge>
              <Button variant="outline" onClick={() => setIsAddNodeOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Node
              </Button>
              <Button variant="outline" onClick={() => saveMutation.mutate()}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button onClick={() => publishMutation.mutate()}>
                <Upload className="h-4 w-4 mr-2" />
                Publish
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
          >
            <Controls />
            <MiniMap />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          </ReactFlow>
        </div>

        <Dialog open={isAddNodeOpen} onOpenChange={setIsAddNodeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Node</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Node Type</Label>
                <Select value={selectedNodeType} onValueChange={setSelectedNodeType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="message">Send Message</SelectItem>
                    <SelectItem value="delay">Delay</SelectItem>
                    <SelectItem value="condition">Condition</SelectItem>
                    <SelectItem value="action">Action</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  value={nodeLabel}
                  onChange={(e) => setNodeLabel(e.target.value)}
                  placeholder="Enter node label..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddNodeOpen(false)}>Cancel</Button>
              <Button onClick={addNode}>Add Node</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

import { Router, Request, Response } from 'express';
import * as leadManagementService from './leadManagement.service';
import { SystemUser } from '../users/user.model';

const router = Router();

function getUser(req: Request): any {
  const userId = req.headers['x-user-id'] as string;
  const userRole = req.headers['x-user-role'] as string;
  const userName = req.headers['x-user-name'] as string;
  
  return {
    userId: userId || null,
    role: userRole || 'super_admin',
    name: userName || 'Admin',
  };
}

function isAdmin(user: any): boolean {
  return user.role === 'super_admin' || user.role === 'sub_admin' || !user.userId;
}

router.post('/assign', async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (!isAdmin(user) && user.role !== 'manager') {
      return res.status(403).json({ error: 'Not authorized to assign leads' });
    }

    const { contactId, chatId, phone, contactName, assignedToUserId, priority, notes, slaDeadline } = req.body;

    if (!contactId || !phone || !assignedToUserId) {
      return res.status(400).json({ error: 'contactId, phone, and assignedToUserId are required' });
    }

    const assignedToUser = await SystemUser.findOne({ id: assignedToUserId });
    if (!assignedToUser) {
      return res.status(404).json({ error: 'Assigned user not found' });
    }

    const assignment = await leadManagementService.assignLead({
      contactId,
      chatId,
      phone,
      contactName,
      assignedToUserId,
      assignedToUserName: assignedToUser.name,
      assignedByUserId: user.userId || 'admin',
      assignedByUserName: user.name,
      priority,
      notes,
      slaDeadline,
    });

    res.json(assignment);
  } catch (error) {
    console.error('Error assigning lead:', error);
    res.status(500).json({ error: 'Failed to assign lead' });
  }
});

router.post('/bulk-assign', async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (!isAdmin(user) && user.role !== 'manager') {
      return res.status(403).json({ error: 'Not authorized to assign leads' });
    }

    const { contactIds, assignedToUserId, priority, notes } = req.body;

    if (!contactIds?.length || !assignedToUserId) {
      return res.status(400).json({ error: 'contactIds and assignedToUserId are required' });
    }

    const results = await leadManagementService.bulkAssignLeads({
      contactIds,
      assignedToUserId,
      assignedByUserId: user.userId || 'admin',
      priority,
      notes,
    });

    res.json({ 
      success: true, 
      assigned: results.length,
      assignments: results 
    });
  } catch (error) {
    console.error('Error bulk assigning leads:', error);
    res.status(500).json({ error: 'Failed to bulk assign leads' });
  }
});

router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const { status } = req.body;
    
    if (!['assigned', 'in_progress', 'completed', 'unassigned'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const assignment = await leadManagementService.updateLeadStatus(
      req.params.id,
      status,
      user.userId || 'admin'
    );

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json(assignment);
  } catch (error) {
    console.error('Error updating lead status:', error);
    res.status(500).json({ error: 'Failed to update lead status' });
  }
});

router.post('/:id/unassign', async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (!isAdmin(user) && user.role !== 'manager') {
      return res.status(403).json({ error: 'Not authorized to unassign leads' });
    }

    const { reason } = req.body;
    const assignment = await leadManagementService.unassignLead(
      req.params.id,
      user.userId || 'admin',
      reason
    );

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json(assignment);
  } catch (error) {
    console.error('Error unassigning lead:', error);
    res.status(500).json({ error: 'Failed to unassign lead' });
  }
});

router.get('/contact/:contactId', async (req: Request, res: Response) => {
  try {
    const assignment = await leadManagementService.getLeadAssignment(req.params.contactId);
    res.json(assignment || null);
  } catch (error) {
    console.error('Error getting lead assignment:', error);
    res.status(500).json({ error: 'Failed to get lead assignment' });
  }
});

router.get('/my-leads', async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const { status } = req.query;

    const assignments = await leadManagementService.getLeadAssignmentsByUser(
      user.userId || 'admin',
      status as string
    );

    res.json(assignments);
  } catch (error) {
    console.error('Error getting user leads:', error);
    res.status(500).json({ error: 'Failed to get user leads' });
  }
});

router.get('/all', async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    
    if (!isAdmin(user) && user.role !== 'manager') {
      const assignments = await leadManagementService.getLeadAssignmentsByUser(user.userId);
      return res.json(assignments);
    }

    const { status, userId, fromDate, toDate } = req.query;

    const assignments = await leadManagementService.getAllLeadAssignments({
      status: status as string,
      userId: userId as string,
      fromDate: fromDate as string,
      toDate: toDate as string,
    });

    res.json(assignments);
  } catch (error) {
    console.error('Error getting all lead assignments:', error);
    res.status(500).json({ error: 'Failed to get lead assignments' });
  }
});

router.get('/assignable-users', async (req: Request, res: Response) => {
  try {
    const users = await leadManagementService.getAssignableUsers();
    res.json(users);
  } catch (error) {
    console.error('Error getting assignable users:', error);
    res.status(500).json({ error: 'Failed to get assignable users' });
  }
});

router.get('/filtered-contacts', async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    
    const contactIds = await leadManagementService.getFilteredChatsForUser({
      userId: user.userId,
      role: user.role,
      name: user.name,
    });

    res.json({ contactIds, isFiltered: contactIds.length > 0 || user.role === 'user' });
  } catch (error) {
    console.error('Error getting filtered contacts:', error);
    res.status(500).json({ error: 'Failed to get filtered contacts' });
  }
});

router.post('/team-hierarchy', async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (!isAdmin(user)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { managerId, managerName, teamMemberIds } = req.body;

    if (!managerId || !teamMemberIds) {
      return res.status(400).json({ error: 'managerId and teamMemberIds are required' });
    }

    const hierarchy = await leadManagementService.setTeamHierarchy(
      managerId,
      managerName || '',
      teamMemberIds
    );

    res.json(hierarchy);
  } catch (error) {
    console.error('Error setting team hierarchy:', error);
    res.status(500).json({ error: 'Failed to set team hierarchy' });
  }
});

router.get('/team-hierarchy/:managerId', async (req: Request, res: Response) => {
  try {
    const hierarchy = await leadManagementService.getTeamHierarchy(req.params.managerId);
    res.json(hierarchy || { teamMembers: [] });
  } catch (error) {
    console.error('Error getting team hierarchy:', error);
    res.status(500).json({ error: 'Failed to get team hierarchy' });
  }
});

router.get('/team-hierarchies', async (req: Request, res: Response) => {
  try {
    const hierarchies = await leadManagementService.getAllTeamHierarchies();
    res.json(hierarchies);
  } catch (error) {
    console.error('Error getting team hierarchies:', error);
    res.status(500).json({ error: 'Failed to get team hierarchies' });
  }
});

router.get('/reports/summary', async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (!isAdmin(user) && user.role !== 'manager') {
      return res.status(403).json({ error: 'Not authorized to view reports' });
    }

    const { startDate } = req.query;
    
    const report = await leadManagementService.getLeadAssignmentReport({
      fromDate: startDate as string,
    });

    const byUserReport = await leadManagementService.getLeadAssignmentReport({
      fromDate: startDate as string,
      groupBy: 'user',
    });

    const byStatusReport = await leadManagementService.getLeadAssignmentReport({
      fromDate: startDate as string,
      groupBy: 'status',
    });

    const byPriorityReport = await leadManagementService.getLeadAssignmentReport({
      fromDate: startDate as string,
      groupBy: 'priority',
    });

    const summary = report.summary;
    const byUser = byUserReport.data.map((u: any) => ({
      userId: u._id,
      userName: u.userName,
      userRole: 'user',
      totalAssigned: u.totalAssigned || 0,
      active: u.assigned || 0,
      completed: u.completed || 0,
      inProgress: u.inProgress || 0,
      avgResponseTime: 0,
    }));

    const priorityCounts = new Map(byPriorityReport.data.map((p: any) => [p._id, p.count || 0]));
    const byPriority = [
      { priority: 'urgent', count: priorityCounts.get('urgent') || 0 },
      { priority: 'high', count: priorityCounts.get('high') || 0 },
      { priority: 'medium', count: priorityCounts.get('medium') || 0 },
      { priority: 'low', count: priorityCounts.get('low') || 0 },
    ];

    const byStatus = byStatusReport.data.map((s: any) => ({
      status: s._id,
      count: s.count || 0,
    }));

    res.json({
      totalAssignments: summary.total || 0,
      activeAssignments: (summary.assigned || 0) + (summary.inProgress || 0),
      completedAssignments: summary.completed || 0,
      averageResponseTime: 0,
      byUser,
      byPriority,
      byStatus,
    });
  } catch (error) {
    console.error('Error getting summary report:', error);
    res.status(500).json({ error: 'Failed to get summary report' });
  }
});

router.get('/reports/assignments', async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (!isAdmin(user) && user.role !== 'manager') {
      return res.status(403).json({ error: 'Not authorized to view reports' });
    }

    const { userId, startDate, priority, status } = req.query;

    const assignments = await leadManagementService.getAllLeadAssignments({
      userId: userId as string,
      fromDate: startDate as string,
      status: status as string,
    });

    let filtered = assignments;
    if (priority && priority !== 'all') {
      filtered = filtered.filter((a: any) => a.priority === priority);
    }

    res.json(filtered);
  } catch (error) {
    console.error('Error getting assignment report:', error);
    res.status(500).json({ error: 'Failed to get assignment report' });
  }
});

router.get('/reports/activity', async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (!isAdmin(user) && user.role !== 'manager') {
      return res.status(403).json({ error: 'Not authorized to view reports' });
    }

    const { userId, fromDate, toDate } = req.query;

    const report = await leadManagementService.getUserActivityReport({
      userId: userId as string,
      fromDate: fromDate as string,
      toDate: toDate as string,
    });

    res.json(report);
  } catch (error) {
    console.error('Error getting activity report:', error);
    res.status(500).json({ error: 'Failed to get activity report' });
  }
});

router.get('/reports/activity-stats', async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (!isAdmin(user) && user.role !== 'manager') {
      return res.status(403).json({ error: 'Not authorized to view reports' });
    }

    const { startDate } = req.query;

    const report = await leadManagementService.getUserActivityReport({
      fromDate: startDate as string,
    });

    const byAction = [
      { action: 'assign', count: 0 },
      { action: 'bulk_assign', count: 0 },
      { action: 'unassign', count: 0 },
      { action: 'update', count: 0 },
    ];

    const byEntityType = [
      { entityType: 'lead_assignment', count: 0 },
    ];

    report.recentActivity?.forEach((log: any) => {
      const actionIndex = byAction.findIndex(a => a.action === log.actionType);
      if (actionIndex >= 0) byAction[actionIndex].count++;
      
      const entityIndex = byEntityType.findIndex(e => e.entityType === 'lead_assignment');
      if (entityIndex >= 0) byEntityType[entityIndex].count++;
    });

    const byUser = report.userSummary?.map((u: any) => ({
      userId: u._id,
      userName: u.userName,
      userRole: 'user',
      totalActions: u.totalLeadsAssigned + u.totalLeadsCompleted + u.totalMessagesSent,
      lastActivityAt: new Date().toISOString(),
      actionBreakdown: [
        { action: 'assign', count: u.totalLeadsAssigned || 0 },
        { action: 'complete', count: u.totalLeadsCompleted || 0 },
        { action: 'message', count: u.totalMessagesSent || 0 },
      ],
    })) || [];

    const uniqueUsers = new Set(report.recentActivity?.map((a: any) => a.userId) || []);

    res.json({
      totalActivities: report.recentActivity?.length || 0,
      uniqueUsers: uniqueUsers.size,
      byAction,
      byEntityType,
      byUser,
    });
  } catch (error) {
    console.error('Error getting activity stats:', error);
    res.status(500).json({ error: 'Failed to get activity stats' });
  }
});

router.get('/reports/activity-logs', async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (!isAdmin(user) && user.role !== 'manager') {
      return res.status(403).json({ error: 'Not authorized to view reports' });
    }

    const { userId, action, startDate, limit } = req.query;

    const report = await leadManagementService.getUserActivityReport({
      userId: userId as string,
      fromDate: startDate as string,
    });

    let logs = report.recentActivity || [];
    
    if (action && action !== 'all') {
      logs = logs.filter((l: any) => l.actionType === action);
    }
    
    if (limit) {
      logs = logs.slice(0, parseInt(limit as string));
    }

    const formattedLogs = logs.map((log: any) => ({
      _id: log.id || log._id,
      userId: log.userId,
      userName: log.userName || 'Unknown',
      userRole: log.userRole || 'user',
      action: log.actionType,
      entityType: 'lead_assignment',
      entityId: log.leadAssignmentId,
      details: log.metadata || {},
      createdAt: log.timestamp,
    }));

    res.json(formattedLogs);
  } catch (error) {
    console.error('Error getting activity logs:', error);
    res.status(500).json({ error: 'Failed to get activity logs' });
  }
});

router.get('/reports/workload', async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (!isAdmin(user) && user.role !== 'manager') {
      return res.status(403).json({ error: 'Not authorized to view reports' });
    }

    const workload = await leadManagementService.getWorkloadDistribution();
    res.json(workload);
  } catch (error) {
    console.error('Error getting workload distribution:', error);
    res.status(500).json({ error: 'Failed to get workload distribution' });
  }
});

router.post('/log-activity', async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const { actionType, contactId, contactPhone, contactName, metadata } = req.body;

    await leadManagementService.logUserActivity({
      userId: user.userId || 'admin',
      userName: user.name,
      userRole: user.role,
      actionType,
      contactId,
      contactPhone,
      contactName,
      metadata,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

export default router;

import { DripCampaign, IDripCampaign, IDripStep, DripRun, IDripRun } from './drip.model';

export async function createCampaign(userId: string, data: Partial<IDripCampaign>): Promise<IDripCampaign> {
  const campaign = new DripCampaign({
    ...data,
    userId,
    status: 'draft'
  });
  return campaign.save();
}

export async function getCampaignById(userId: string, campaignId: string): Promise<IDripCampaign | null> {
  return DripCampaign.findOne({ _id: campaignId, userId });
}

export async function getCampaigns(userId: string, filters?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ campaigns: IDripCampaign[]; total: number }> {
  const query: any = { userId };
  
  if (filters?.status) query.status = filters.status;
  if (filters?.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } }
    ];
  }

  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const skip = (page - 1) * limit;

  const [campaigns, total] = await Promise.all([
    DripCampaign.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    DripCampaign.countDocuments(query)
  ]);

  return { campaigns, total };
}

export async function updateCampaign(userId: string, campaignId: string, data: Partial<IDripCampaign>): Promise<IDripCampaign | null> {
  return DripCampaign.findOneAndUpdate(
    { _id: campaignId, userId },
    { $set: data },
    { new: true }
  );
}

export async function deleteCampaign(userId: string, campaignId: string): Promise<boolean> {
  const result = await DripCampaign.deleteOne({ _id: campaignId, userId });
  if (result.deletedCount > 0) {
    await DripRun.updateMany(
      { campaignId, status: 'active' },
      { $set: { status: 'exited', exitedAt: new Date(), exitReason: 'campaign_ended' } }
    );
    return true;
  }
  return false;
}

export async function launchCampaign(userId: string, campaignId: string): Promise<IDripCampaign | null> {
  const campaign = await DripCampaign.findOne({ _id: campaignId, userId });
  if (!campaign) return null;

  if (campaign.steps.length === 0) {
    throw new Error('Campaign must have at least one step');
  }

  return DripCampaign.findOneAndUpdate(
    { _id: campaignId, userId },
    { 
      $set: { 
        status: 'active',
        startDate: campaign.startDate || new Date()
      } 
    },
    { new: true }
  );
}

export async function pauseCampaign(userId: string, campaignId: string): Promise<IDripCampaign | null> {
  await DripRun.updateMany(
    { campaignId, status: 'active' },
    { $set: { status: 'paused' } }
  );

  return DripCampaign.findOneAndUpdate(
    { _id: campaignId, userId },
    { $set: { status: 'paused' } },
    { new: true }
  );
}

export async function resumeCampaign(userId: string, campaignId: string): Promise<IDripCampaign | null> {
  await DripRun.updateMany(
    { campaignId, status: 'paused' },
    { $set: { status: 'active' } }
  );

  return DripCampaign.findOneAndUpdate(
    { _id: campaignId, userId },
    { $set: { status: 'active' } },
    { new: true }
  );
}

export async function duplicateCampaign(userId: string, campaignId: string): Promise<IDripCampaign | null> {
  const original = await DripCampaign.findOne({ _id: campaignId, userId });
  if (!original) return null;

  const duplicate = new DripCampaign({
    ...original.toObject(),
    _id: undefined,
    name: `${original.name} (Copy)`,
    status: 'draft',
    metrics: {
      totalEnrolled: 0,
      activeContacts: 0,
      completedContacts: 0,
      exitedContacts: 0,
      totalSent: 0,
      totalDelivered: 0,
      totalRead: 0,
      totalReplied: 0,
      totalConverted: 0,
      totalFailed: 0
    },
    startDate: undefined,
    createdAt: undefined,
    updatedAt: undefined
  });

  return duplicate.save();
}

export async function addStep(userId: string, campaignId: string, step: IDripStep): Promise<IDripCampaign | null> {
  return DripCampaign.findOneAndUpdate(
    { _id: campaignId, userId },
    { $push: { steps: step } },
    { new: true }
  );
}

export async function updateStep(userId: string, campaignId: string, stepId: string, stepData: Partial<IDripStep>): Promise<IDripCampaign | null> {
  return DripCampaign.findOneAndUpdate(
    { _id: campaignId, userId, 'steps.id': stepId },
    { $set: { 'steps.$': { ...stepData, id: stepId } } },
    { new: true }
  );
}

export async function removeStep(userId: string, campaignId: string, stepId: string): Promise<IDripCampaign | null> {
  return DripCampaign.findOneAndUpdate(
    { _id: campaignId, userId },
    { $pull: { steps: { id: stepId } } },
    { new: true }
  );
}

export async function reorderSteps(userId: string, campaignId: string, stepOrder: string[]): Promise<IDripCampaign | null> {
  const campaign = await DripCampaign.findOne({ _id: campaignId, userId });
  if (!campaign) return null;

  const reorderedSteps = stepOrder.map((stepId, index) => {
    const step = campaign.steps.find(s => s.id === stepId);
    if (step) {
      return { ...step, order: index };
    }
    return null;
  }).filter(Boolean) as IDripStep[];

  return DripCampaign.findOneAndUpdate(
    { _id: campaignId, userId },
    { $set: { steps: reorderedSteps } },
    { new: true }
  );
}

export async function enrollContact(userId: string, campaignId: string, contactId: string, contactPhone: string, variables?: Record<string, any>): Promise<IDripRun> {
  const campaign = await DripCampaign.findOne({ _id: campaignId, userId, status: 'active' });
  if (!campaign) {
    throw new Error('Campaign not found or not active');
  }

  const existingRun = await DripRun.findOne({ campaignId, contactId });
  if (existingRun && !campaign.settings.allowReEntry) {
    throw new Error('Contact is already enrolled in this campaign');
  }

  if (existingRun && campaign.settings.allowReEntry) {
    const daysSinceExit = existingRun.exitedAt 
      ? (Date.now() - existingRun.exitedAt.getTime()) / (1000 * 60 * 60 * 24)
      : 0;
    if (daysSinceExit < campaign.settings.reEntryDelayDays) {
      throw new Error(`Contact must wait ${campaign.settings.reEntryDelayDays} days before re-entry`);
    }
  }

  const firstStep = campaign.steps.find(s => s.order === 0) || campaign.steps[0];
  if (!firstStep) {
    throw new Error('Campaign has no steps');
  }

  const nextScheduledAt = calculateNextStepTime(campaign, firstStep, new Date());

  const run = new DripRun({
    campaignId: campaign._id,
    userId,
    contactId,
    contactPhone,
    status: 'active',
    currentStepIndex: 0,
    stepHistory: [],
    nextStepScheduledAt: nextScheduledAt,
    variables: variables || {}
  });
  await run.save();

  await DripCampaign.updateOne(
    { _id: campaignId },
    { $inc: { 'metrics.totalEnrolled': 1, 'metrics.activeContacts': 1 } }
  );

  return run;
}

function calculateNextStepTime(campaign: IDripCampaign, step: IDripStep, baseDate: Date): Date {
  const result = new Date(baseDate);
  result.setDate(result.getDate() + step.dayOffset);
  
  if (step.timeOfDay) {
    const [hours, minutes] = step.timeOfDay.split(':').map(Number);
    result.setHours(hours, minutes, 0, 0);
  } else {
    const [hours, minutes] = campaign.schedule.startTime.split(':').map(Number);
    result.setHours(hours, minutes, 0, 0);
  }

  return result;
}

export async function unenrollContact(userId: string, campaignId: string, contactId: string, reason: string = 'manual'): Promise<IDripRun | null> {
  const run = await DripRun.findOneAndUpdate(
    { campaignId, contactId, userId, status: 'active' },
    { 
      $set: { 
        status: 'exited',
        exitedAt: new Date(),
        exitReason: reason as any
      } 
    },
    { new: true }
  );

  if (run) {
    await DripCampaign.updateOne(
      { _id: campaignId },
      { $inc: { 'metrics.activeContacts': -1, 'metrics.exitedContacts': 1 } }
    );
  }

  return run;
}

export async function getCampaignRuns(userId: string, campaignId: string, filters?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ runs: IDripRun[]; total: number }> {
  const query: any = { userId, campaignId };
  
  if (filters?.status) query.status = filters.status;

  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const skip = (page - 1) * limit;

  const [runs, total] = await Promise.all([
    DripRun.find(query).sort({ enrolledAt: -1 }).skip(skip).limit(limit),
    DripRun.countDocuments(query)
  ]);

  return { runs, total };
}

export async function getDueRuns(): Promise<IDripRun[]> {
  const now = new Date();
  return DripRun.find({
    status: 'active',
    nextStepScheduledAt: { $lte: now }
  }).limit(100);
}

export async function processRun(run: IDripRun): Promise<void> {
  const campaign = await DripCampaign.findById(run.campaignId);
  if (!campaign || campaign.status !== 'active') {
    await DripRun.updateOne(
      { _id: run._id },
      { $set: { status: 'exited', exitedAt: new Date(), exitReason: 'campaign_ended' } }
    );
    return;
  }

  const currentStep = campaign.steps[run.currentStepIndex];
  if (!currentStep) {
    await DripRun.updateOne(
      { _id: run._id },
      { $set: { status: 'completed', completedAt: new Date(), exitReason: 'completed' } }
    );
    await DripCampaign.updateOne(
      { _id: campaign._id },
      { $inc: { 'metrics.activeContacts': -1, 'metrics.completedContacts': 1 } }
    );
    return;
  }

  try {
    const messageResult = await sendStepMessage(campaign, currentStep, run);
    
    run.stepHistory.push({
      stepId: currentStep.id,
      stepOrder: currentStep.order,
      status: 'sent',
      messageId: messageResult.messageId,
      scheduledAt: run.nextStepScheduledAt || new Date(),
      sentAt: new Date()
    });

    await DripCampaign.updateOne(
      { _id: campaign._id },
      { $inc: { 'metrics.totalSent': 1 } }
    );

    const nextStepIndex = run.currentStepIndex + 1;
    if (nextStepIndex >= campaign.steps.length) {
      run.status = 'completed';
      run.completedAt = new Date();
      run.exitReason = 'completed';
      run.nextStepScheduledAt = undefined;
      
      await DripCampaign.updateOne(
        { _id: campaign._id },
        { $inc: { 'metrics.activeContacts': -1, 'metrics.completedContacts': 1 } }
      );
    } else {
      const nextStep = campaign.steps[nextStepIndex];
      run.currentStepIndex = nextStepIndex;
      run.nextStepScheduledAt = calculateNextStepTime(campaign, nextStep, new Date());
    }

    await run.save();
  } catch (error: any) {
    run.stepHistory.push({
      stepId: currentStep.id,
      stepOrder: currentStep.order,
      status: 'failed',
      scheduledAt: run.nextStepScheduledAt || new Date(),
      error: error.message
    });
    
    await DripCampaign.updateOne(
      { _id: campaign._id },
      { $inc: { 'metrics.totalFailed': 1 } }
    );

    await run.save();
  }
}

async function sendStepMessage(campaign: IDripCampaign, step: IDripStep, run: IDripRun): Promise<{ messageId: string }> {
  return { messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
}

export async function updateRunStatus(runId: string, status: 'delivered' | 'read' | 'replied'): Promise<void> {
  const run = await DripRun.findById(runId);
  if (!run || run.stepHistory.length === 0) return;

  const lastStep = run.stepHistory[run.stepHistory.length - 1];
  
  switch (status) {
    case 'delivered':
      lastStep.deliveredAt = new Date();
      lastStep.status = 'delivered';
      await DripCampaign.updateOne(
        { _id: run.campaignId },
        { $inc: { 'metrics.totalDelivered': 1 } }
      );
      break;
    case 'read':
      lastStep.readAt = new Date();
      lastStep.status = 'read';
      await DripCampaign.updateOne(
        { _id: run.campaignId },
        { $inc: { 'metrics.totalRead': 1 } }
      );
      break;
    case 'replied':
      lastStep.repliedAt = new Date();
      lastStep.status = 'replied';
      await DripCampaign.updateOne(
        { _id: run.campaignId },
        { $inc: { 'metrics.totalReplied': 1 } }
      );
      break;
  }

  await run.save();
}

export async function markConversion(userId: string, campaignId: string, contactId: string): Promise<void> {
  const run = await DripRun.findOne({ campaignId, contactId, userId });
  if (!run) return;

  await DripCampaign.updateOne(
    { _id: campaignId },
    { $inc: { 'metrics.totalConverted': 1 } }
  );

  if (run.status === 'active') {
    const campaign = await DripCampaign.findById(campaignId);
    if (campaign?.settings.stopOnConversion) {
      run.status = 'exited';
      run.exitedAt = new Date();
      run.exitReason = 'converted';
      await run.save();

      await DripCampaign.updateOne(
        { _id: campaignId },
        { $inc: { 'metrics.activeContacts': -1, 'metrics.exitedContacts': 1 } }
      );
    }
  }
}

export async function getCampaignStats(userId: string): Promise<{
  totalCampaigns: number;
  activeCampaigns: number;
  totalEnrolled: number;
  overallDeliveryRate: number;
  overallReadRate: number;
  overallReplyRate: number;
  overallConversionRate: number;
}> {
  const [totalCampaigns, activeCampaigns, campaigns] = await Promise.all([
    DripCampaign.countDocuments({ userId }),
    DripCampaign.countDocuments({ userId, status: 'active' }),
    DripCampaign.find({ userId }).select('metrics')
  ]);

  const totals = campaigns.reduce((acc, c) => ({
    enrolled: acc.enrolled + c.metrics.totalEnrolled,
    sent: acc.sent + c.metrics.totalSent,
    delivered: acc.delivered + c.metrics.totalDelivered,
    read: acc.read + c.metrics.totalRead,
    replied: acc.replied + c.metrics.totalReplied,
    converted: acc.converted + c.metrics.totalConverted
  }), { enrolled: 0, sent: 0, delivered: 0, read: 0, replied: 0, converted: 0 });

  return {
    totalCampaigns,
    activeCampaigns,
    totalEnrolled: totals.enrolled,
    overallDeliveryRate: totals.sent > 0 ? Math.round((totals.delivered / totals.sent) * 100) : 0,
    overallReadRate: totals.delivered > 0 ? Math.round((totals.read / totals.delivered) * 100) : 0,
    overallReplyRate: totals.read > 0 ? Math.round((totals.replied / totals.read) * 100) : 0,
    overallConversionRate: totals.enrolled > 0 ? Math.round((totals.converted / totals.enrolled) * 100) : 0
  };
}

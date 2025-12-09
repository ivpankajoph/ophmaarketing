import { Segment, ISegment, ISegmentRuleGroup, SegmentMember, ISegmentMember } from './segment.model';
import { Contact } from '../../storage/mongodb.adapter';

export async function createSegment(userId: string, data: Partial<ISegment>): Promise<ISegment> {
  const segment = new Segment({
    ...data,
    userId,
    status: 'active'
  });
  const saved = await segment.save();
  
  if (saved.type === 'dynamic' && saved.refreshStrategy !== 'manual') {
    refreshSegmentMembers(saved._id.toString(), userId);
  }
  
  return saved;
}

export async function getSegmentById(userId: string, segmentId: string): Promise<ISegment | null> {
  return Segment.findOne({ _id: segmentId, userId });
}

export async function getSegments(userId: string, filters?: {
  status?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ segments: ISegment[]; total: number }> {
  const query: any = { userId };
  
  if (filters?.status) query.status = filters.status;
  if (filters?.type) query.type = filters.type;
  if (filters?.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } }
    ];
  }

  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const skip = (page - 1) * limit;

  const [segments, total] = await Promise.all([
    Segment.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    Segment.countDocuments(query)
  ]);

  return { segments, total };
}

export async function updateSegment(userId: string, segmentId: string, data: Partial<ISegment>): Promise<ISegment | null> {
  const segment = await Segment.findOneAndUpdate(
    { _id: segmentId, userId },
    { $set: data },
    { new: true }
  );
  
  if (segment && data.ruleGroup) {
    refreshSegmentMembers(segmentId, userId);
  }
  
  return segment;
}

export async function deleteSegment(userId: string, segmentId: string): Promise<boolean> {
  const result = await Segment.deleteOne({ _id: segmentId, userId });
  if (result.deletedCount > 0) {
    await SegmentMember.deleteMany({ segmentId });
    return true;
  }
  return false;
}

export async function duplicateSegment(userId: string, segmentId: string): Promise<ISegment | null> {
  const original = await Segment.findOne({ _id: segmentId, userId });
  if (!original) return null;

  const duplicate = new Segment({
    ...original.toObject(),
    _id: undefined,
    name: `${original.name} (Copy)`,
    memberCount: 0,
    usedInTriggers: 0,
    usedInFlows: 0,
    usedInCampaigns: 0,
    lastRefreshedAt: undefined,
    createdAt: undefined,
    updatedAt: undefined
  });

  const saved = await duplicate.save();
  
  if (saved.type === 'dynamic') {
    refreshSegmentMembers(saved._id.toString(), userId);
  }
  
  return saved;
}

export async function refreshSegmentMembers(segmentId: string, userId: string): Promise<number> {
  const segment = await Segment.findOne({ _id: segmentId, userId });
  if (!segment) return 0;

  await Segment.updateOne({ _id: segmentId }, { $set: { status: 'computing' } });

  try {
    const mongoQuery = buildMongoQuery(segment.ruleGroup);
    mongoQuery.userId = userId;

    const matchingContacts = await Contact.find(mongoQuery).select('_id');
    const contactIds = matchingContacts.map((c: any) => c._id.toString());

    await SegmentMember.deleteMany({ segmentId, source: 'rule_match' });

    if (contactIds.length > 0) {
      const members = contactIds.map((contactId: string) => ({
        segmentId,
        userId,
        contactId,
        source: 'rule_match' as const,
        addedAt: new Date()
      }));

      await SegmentMember.insertMany(members, { ordered: false }).catch(() => {});
    }

    const totalMembers = await SegmentMember.countDocuments({ segmentId });

    await Segment.updateOne(
      { _id: segmentId },
      { 
        $set: { 
          status: 'active',
          memberCount: totalMembers,
          lastRefreshedAt: new Date()
        }
      }
    );

    return totalMembers;
  } catch (error) {
    await Segment.updateOne({ _id: segmentId }, { $set: { status: 'active' } });
    throw error;
  }
}

function buildMongoQuery(ruleGroup: ISegmentRuleGroup): any {
  const { logic, rules } = ruleGroup;
  
  if (rules.length === 0) return {};

  const conditions = rules.map(rule => {
    if ('logic' in rule) {
      return buildMongoQuery(rule as ISegmentRuleGroup);
    }
    return buildConditionQuery(rule);
  }).filter(c => Object.keys(c).length > 0);

  if (conditions.length === 0) return {};
  if (conditions.length === 1) return conditions[0];

  return logic === 'AND' ? { $and: conditions } : { $or: conditions };
}

function buildConditionQuery(rule: any): any {
  const { field, operator, value } = rule;

  switch (operator) {
    case 'equals':
      return { [field]: value };
    case 'not_equals':
      return { [field]: { $ne: value } };
    case 'contains':
      return { [field]: { $regex: value, $options: 'i' } };
    case 'not_contains':
      return { [field]: { $not: { $regex: value, $options: 'i' } } };
    case 'greater_than':
      return { [field]: { $gt: value } };
    case 'less_than':
      return { [field]: { $lt: value } };
    case 'in':
      return { [field]: { $in: Array.isArray(value) ? value : [value] } };
    case 'not_in':
      return { [field]: { $nin: Array.isArray(value) ? value : [value] } };
    case 'exists':
      return { [field]: { $exists: true, $ne: null } };
    case 'not_exists':
      return { $or: [{ [field]: { $exists: false } }, { [field]: null }] };
    case 'between':
      if (Array.isArray(value) && value.length === 2) {
        return { [field]: { $gte: value[0], $lte: value[1] } };
      }
      return {};
    case 'before':
      return { [field]: { $lt: new Date(value) } };
    case 'after':
      return { [field]: { $gt: new Date(value) } };
    case 'within_days':
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - Number(value));
      return { [field]: { $gte: daysAgo } };
    case 'regex':
      try {
        return { [field]: { $regex: value, $options: 'i' } };
      } catch {
        return {};
      }
    default:
      return {};
  }
}

export async function getSegmentMembers(userId: string, segmentId: string, filters?: {
  page?: number;
  limit?: number;
}): Promise<{ members: ISegmentMember[]; total: number }> {
  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const skip = (page - 1) * limit;

  const [members, total] = await Promise.all([
    SegmentMember.find({ segmentId, userId }).sort({ addedAt: -1 }).skip(skip).limit(limit),
    SegmentMember.countDocuments({ segmentId, userId })
  ]);

  return { members, total };
}

export async function addManualMember(userId: string, segmentId: string, contactId: string): Promise<ISegmentMember | null> {
  const segment = await Segment.findOne({ _id: segmentId, userId });
  if (!segment) return null;

  try {
    const member = new SegmentMember({
      segmentId,
      userId,
      contactId,
      source: 'manual'
    });
    await member.save();

    await Segment.updateOne(
      { _id: segmentId },
      { $inc: { memberCount: 1 } }
    );

    return member;
  } catch (error: any) {
    if (error.code === 11000) {
      return null;
    }
    throw error;
  }
}

export async function removeMember(userId: string, segmentId: string, contactId: string): Promise<boolean> {
  const result = await SegmentMember.deleteOne({ segmentId, userId, contactId });
  
  if (result.deletedCount > 0) {
    await Segment.updateOne(
      { _id: segmentId },
      { $inc: { memberCount: -1 } }
    );
    return true;
  }
  
  return false;
}

export async function isContactInSegment(userId: string, segmentId: string, contactId: string): Promise<boolean> {
  const count = await SegmentMember.countDocuments({ segmentId, userId, contactId });
  return count > 0;
}

export async function getContactSegments(userId: string, contactId: string): Promise<ISegment[]> {
  const memberships = await SegmentMember.find({ userId, contactId }).select('segmentId');
  const segmentIds = memberships.map(m => m.segmentId);
  return Segment.find({ _id: { $in: segmentIds }, userId });
}

export async function previewSegment(userId: string, ruleGroup: ISegmentRuleGroup, limit: number = 10): Promise<{
  estimatedCount: number;
  sampleContacts: any[];
}> {
  const mongoQuery = buildMongoQuery(ruleGroup);
  mongoQuery.userId = userId;

  const [estimatedCount, sampleContacts] = await Promise.all([
    Contact.countDocuments(mongoQuery),
    Contact.find(mongoQuery).limit(limit).select('name phoneNumber email tags')
  ]);

  return { estimatedCount, sampleContacts };
}

export async function getSegmentStats(userId: string): Promise<{
  totalSegments: number;
  dynamicSegments: number;
  staticSegments: number;
  totalMembers: number;
  avgMembersPerSegment: number;
}> {
  const [totalSegments, dynamicSegments, staticSegments, segments] = await Promise.all([
    Segment.countDocuments({ userId }),
    Segment.countDocuments({ userId, type: 'dynamic' }),
    Segment.countDocuments({ userId, type: 'static' }),
    Segment.find({ userId }).select('memberCount')
  ]);

  const totalMembers = segments.reduce((sum, s) => sum + s.memberCount, 0);
  const avgMembersPerSegment = totalSegments > 0 ? Math.round(totalMembers / totalSegments) : 0;

  return {
    totalSegments,
    dynamicSegments,
    staticSegments,
    totalMembers,
    avgMembersPerSegment
  };
}

export async function checkAndUpdateMembership(userId: string, contactId: string): Promise<void> {
  const dynamicSegments = await Segment.find({ 
    userId, 
    type: 'dynamic',
    status: 'active',
    refreshStrategy: 'realtime'
  });

  const contact = await Contact.findOne({ _id: contactId, userId });
  if (!contact) return;

  for (const segment of dynamicSegments) {
    const mongoQuery = buildMongoQuery(segment.ruleGroup);
    mongoQuery._id = contactId;
    mongoQuery.userId = userId;

    const matches = await Contact.countDocuments(mongoQuery);
    const isMember = await isContactInSegment(userId, segment._id.toString(), contactId);

    if (matches > 0 && !isMember) {
      await addManualMember(userId, segment._id.toString(), contactId);
    } else if (matches === 0 && isMember) {
      await removeMember(userId, segment._id.toString(), contactId);
    }
  }
}

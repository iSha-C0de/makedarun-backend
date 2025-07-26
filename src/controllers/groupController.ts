import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import Group, { GroupDocument } from '../models/Group';
import User, { UserDocument } from '../models/User';
import { HydratedDocument } from 'mongoose';
import { AuthenticatedRequest } from '../types/express';
import { assertUser } from '../utils/assertUser';

// Create group (Coach only)
export const createGroup = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, password } = req.body;
  const coach = assertUser(req);

  if (coach.role !== 'coach') {
    res.status(403);
    throw new Error('Only coaches can create groups');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const group = await Group.create({
    name,
    password: hashedPassword,
    coach: coach._id,
    members: [],
  });

  res.status(201).json(group);
});

// Update group (Coach only)
export const updateGroup = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const coach = assertUser(req);
  const { name, password } = req.body;
  const group = await Group.findById(req.params.id);

  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  if (group.coach.toString() !== coach._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  group.name = name || group.name;
  if (password) {
    group.password = await bcrypt.hash(password, 10);
  }

  const updated = await group.save();
  res.json(updated);
});

// Delete group (Coach only)
export const deleteGroup = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const coach = assertUser(req);
  const group = await Group.findById(req.params.id);

  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  if (group.coach.toString() !== coach._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  // Clear the group field from all users who were members of this group
  await User.updateMany(
    { group: group.name }, // Find users with this group name
    { $unset: { group: 1 } } // Remove the group field entirely
  );

  // Delete the group
  await group.deleteOne();
  
  res.json({ message: 'Group deleted and members removed from group' });
});

// Join group (Runner)
export const joinGroup = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, password } = req.body;
  const runner = assertUser(req);

  const group = await Group.findOne({ name });
  if (!group || !(await bcrypt.compare(password, group.password))) {
    res.status(400);
    throw new Error('Invalid group name or password');
  }

  if (!group.members.includes(runner._id)) {
    group.members.push(runner._id);
    await group.save();
  }

  // Store group name instead of group ID
  runner.group = group.name;
  await runner.save();

  res.json({ message: 'Joined group', group });
});

// Leave group (Runner)
export const leaveGroup = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const runner = assertUser(req);

  if (!runner.group) {
    res.status(400);
    throw new Error('You are not in a group');
  }

  const groupName = runner.group;

  // Find the group and remove the user from members list
  const group = await Group.findOne({ name: groupName });
  if (group) {
    group.members = group.members.filter(memberId => !memberId.equals(runner._id));
    await group.save();
  }

  // Remove group from user
  runner.group = undefined;
  await runner.save();

  res.json({ message: 'Successfully left the group' });
});

// Coach: View members and progress
export const getGroupMembersByName = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { groupName } = req.params;

  const users = await User.find({ group: groupName });

  if (!users || users.length === 0) {
    res.status(200).json([]);
    return;
  }

  const memberData = users.map((user) => {
    const distanceLeft = Math.max(user.goal - user.progress, 0);
    const percent = user.goal > 0 ? ((user.progress / user.goal) * 100).toFixed(1) : '0';

    return {
      userId: user._id,
      userName: user.userName,
      goal: user.goal,
      progress: user.progress,
      distanceLeft,
      percentCompleted: `${percent}% completed`,
    };
  });

  res.json(memberData);
});

// Runner: View members in own group (with coach name)
export const getMyGroupMembers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const runner = assertUser(req);

  if (!runner.group) {
    res.status(400);
    throw new Error('Runner is not in a group');
  }

  // Query group by name instead of ID
  const group = await Group.findOne({ name: runner.group })
    .populate<{ coach: Pick<UserDocument, 'userName'> }>({ path: 'coach', select: 'userName' })
    .populate<{ members: Pick<UserDocument, 'userName' | 'progress' | 'goal'>[] }>({
      path: 'members',
      select: 'userName progress goal',
    });

  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  const members = group.members.map((user) => ({
    userName: user.userName,
    progress: user.progress,
    goal: user.goal,
    remaining: Math.max(user.goal - user.progress, 0),
    percentage: user.goal > 0 ? Math.min(100, Math.round((user.progress / user.goal) * 100)) : 0,
  }));

  const coachName = group.coach?.userName || 'Unknown Coach';

  res.json({ coachName, members });
});

// Used by frontend to fetch group + coach name + member details
export const getGroupMembers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const rawName = req.params.groupName;
  const user = assertUser(req);

  // Optional: trim and decode URI component
  const groupName = decodeURIComponent(rawName).trim();

  console.log('Looking for group with name:', groupName);

  const group = await Group.findOne({ name: new RegExp(`^${groupName}$`, 'i') }) // case-insensitive match
    .populate({
      path: 'coach',
      select: 'userName',
    })
    .populate({
      path: 'members',
      select: 'userName emailAdd contactNum address goal progress role isApproved _id',
    });

  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  // Get coach information
  const coachInfo = group.coach as any;
  const coachName = coachInfo?.userName || 'Unknown Coach';

  // Process members with all necessary information
  const members = group.members.map((member: any) => {
    const goal = Number(member.goal) || 0;
    const progress = Number(member.progress) || 0;
    const distanceLeft = Math.max(goal - progress, 0);
    const percentCompleted = goal > 0 ? ((progress / goal) * 100).toFixed(1) + '%' : '0%';

    return {
      userId: member._id,
      userName: member.userName || 'Unknown User',
      emailAdd: member.emailAdd || '',
      contactNum: member.contactNum || '',
      address: member.address || '',
      goal,
      progress,
      distanceLeft,
      percentCompleted,
      role: member.role || 'runner',
      isApproved: member.isApproved ?? false,
    };
  });

  console.log('Returning group data:', {
    groupName,
    coachName,
    memberCount: members.length
  });

  res.json({ 
    coachName,
    members 
  });
});

// Get all groups for the logged-in coach
export const getCoachGroups = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const coach = assertUser(req);

  if (coach.role !== 'coach') {
    res.status(403);
    throw new Error('Only coaches can view their groups');
  }

  const groups = await Group.find({ coach: coach._id })
    .select('_id name password members createdAt')
    .populate<{ members: Pick<UserDocument, '_id' | 'userName' | 'goal' | 'progress'>[] }>({
      path: 'members',
      select: '_id userName goal progress',
    });

  const groupsWithStats = groups.map(group => ({
    _id: group._id,
    name: group.name,
    memberCount: group.members.length,
    createdAt: group.createdAt,
    members: group.members.map((member: any) => ({
      _id: member._id,
      userName: member.userName,
      goal: member.goal || 0,
      progress: member.progress || 0,
      percentage: member.goal > 0 ? Math.round((member.progress / member.goal) * 100) : 0
    }))
  }));

  res.json(groupsWithStats);
});

// Get members of a specific group by ID
export const getGroupMembersById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const coach = assertUser(req);
  const groupId = req.params.groupId;

  if (coach.role !== 'coach') {
    res.status(403);
    throw new Error('Only coaches can view group members');
  }

  const group = await Group.findById(groupId)
    .populate('members', '_id userName emailAdd contactNum address goal progress role isApproved');

  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  if (group.coach.toString() !== coach._id.toString()) {
    res.status(403);
    throw new Error('You do not have permission to view this group');
  }

  const members = group.members.map((member: any) => ({
    userId: member._id,
    userName: member.userName,
    emailAdd: member.emailAdd || '',
    contactNum: member.contactNum || '',
    address: member.address || '',
    goal: member.goal || 0,
    progress: member.progress || 0,
    role: member.role || 'runner',
    isApproved: member.isApproved ?? false,
  }));

  res.json({ groupName: group.name, members });
});

// Reset goals for selected members with a specific goal value
export const resetGoals = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { memberIds, groupName, newGoal } = req.body;
  const coach = assertUser(req);

  if (coach.role !== 'coach') {
    res.status(403);
    throw new Error('Only coaches can reset member goals');
  }

  if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
    res.status(400);
    throw new Error('Member IDs are required');
  }

  if (!groupName) {
    res.status(400);
    throw new Error('Group name is required');
  }

  if (newGoal === undefined || newGoal === null || isNaN(newGoal) || newGoal <= 0) {
    res.status(400);
    throw new Error('A valid positive goal value is required');
  }

  try {
    // Verify the group exists and the coach owns it
    const group = await Group.findOne({ name: groupName });
    if (!group) {
      res.status(404);
      throw new Error('Group not found');
    }

    if (group.coach.toString() !== coach._id.toString()) {
      res.status(403);
      throw new Error('You do not have permission to modify this group');
    }

    // Verify all members belong to the specified group
    const members = await User.find({
      _id: { $in: memberIds },
      group: groupName
    });

    if (members.length !== memberIds.length) {
      res.status(400);
      throw new Error('Some selected members do not belong to this group');
    }

    // Update the goal for all selected members
    const updateResult = await User.updateMany(
      {
        _id: { $in: memberIds },
        group: groupName
      },
      {
        $set: { goal: newGoal }
      }
    );

    if (updateResult.modifiedCount === 0) {
      res.status(400);
      throw new Error('No members were updated');
    }

    res.json({
      message: `Successfully set goal to ${newGoal}m for ${updateResult.modifiedCount} member(s)`,
      updatedCount: updateResult.modifiedCount,
      newGoal: newGoal
    });

  } catch (error) {
    console.error('Reset Goals Error:', error);
    throw error;
  }
});
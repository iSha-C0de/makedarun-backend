import express from 'express';
import Group from '../models/Group';
import Run from '../models/Run';
import User, { UserDocument } from '../models/User';
import { protect } from '../middleware/authMiddleware';
import { AuthenticatedRequest } from '../types/express';
import { getCoachGroups, getGroupMembersById } from '../controllers/groupController';

const router = express.Router();

// ✅ Create a new group (Coach only)
router.post('/create', protect, async (req: AuthenticatedRequest, res) => {
  const { name, password } = req.body;
  const coachId = req.user?._id;

  if (!coachId) return res.status(401).json({ message: 'Not authorized' });

  try {
    const existing = await Group.findOne({ name });
    if (existing) return res.status(400).json({ message: 'Group name already exists' });

    const newGroup = new Group({
      name,
      password,
      coach: coachId,
      members: [],
    });

    await newGroup.save();
    res.status(201).json(newGroup);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// ✅ Join a group (Runner) - MODIFIED to save group name
router.post('/join', protect, async (req: AuthenticatedRequest, res) => {
  const { groupName, groupPassword } = req.body;
  const userId = req.user?._id;

  if (!userId) return res.status(401).json({ message: 'Not authorized' });

  try {
    const group = await Group.findOne({ name: groupName });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Validate password (use bcrypt in production)
    if (group.password !== groupPassword) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    if (!group.members.includes(userId)) {
      group.members.push(userId);
      await group.save();
    }

    // CHANGED: Store group NAME instead of group ID
    await User.findByIdAndUpdate(userId, { group: group.name });

    // Return both group ID and name for frontend compatibility
    res.json({
      message: 'Joined group successfully',
      groupId: group._id.toString(),
      groupName: group.name,
    });
  } catch (error) {
    console.error('Join Group Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Remove a member from a group (Coach only)
router.post('/remove-member/:groupName', protect, async (req: AuthenticatedRequest, res) => {
  const { groupName } = req.params;
  const { userId } = req.body;
  const coachId = req.user?._id;

  if (!coachId) return res.status(401).json({ message: 'Not authorized' });

  try {
    const group = await Group.findOne({ name: groupName }).populate<{ coach: UserDocument }>('coach');
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (!group.coach || !group.coach._id.equals(coachId)) {
      return res.status(403).json({ message: 'Not authorized to remove members' });
    }

    if (!group.members.some((memberId) => memberId.equals(userId))) {
      return res.status(400).json({ message: 'User is not a member of this group' });
    }

    group.members = group.members.filter((memberId) => !memberId.equals(userId));
    await group.save();

    // CHANGED: Clear group name instead of group ID
    await User.findByIdAndUpdate(userId, { group: undefined });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove Member Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Get group members by GROUP NAME (primary endpoint)
router.get('/members/:groupName', protect, async (req: AuthenticatedRequest, res) => {
  try {
    const { groupName } = req.params;
    if (!groupName) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    const group = await Group.findOne({ name: groupName })
      .populate<{ coach: UserDocument }>('coach', 'userName');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Find users by group name instead of group ID
    const members = await User.find({ group: groupName })
      .select('userName progress goal emailAdd contactNum address');

    const stats = await Promise.all(
      members.map(async (member) => {
        const runs = await Run.find({ user: member._id });
        const totalDistance = runs.reduce((sum, run) => sum + (run.distance || 0), 0);

        return {
          userId: member._id.toString(),
          userName: member.userName,
          goal: member.goal || 0,
          progress: totalDistance,
          distanceLeft: Math.max((member.goal || 0) - totalDistance, 0),
          percentCompleted:
            member.goal > 0
              ? ((totalDistance / member.goal) * 100).toFixed(1) + '%'
              : '0%',
          emailAdd: member.emailAdd || 'N/A',
          contactNum: member.contactNum || 'N/A',
          address: member.address || 'N/A',
        };
      })
    );

    res.json({
      coachName: group.coach?.userName || 'Unknown Coach',
      groupName: group.name,
      members: stats,
    });
  } catch (error) {
    console.error('Get Group Members Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Update group info (Coach only)
router.put('/:groupId', protect, async (req: AuthenticatedRequest, res) => {
  const { name, password } = req.body;
  const coachId = req.user?._id;

  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (!group.coach.equals(coachId))
      return res.status(403).json({ message: 'Not authorized to edit this group' });

    const oldName = group.name;

    if (name) group.name = name;
    if (password) group.password = password;

    await group.save();

    // If name changed, update all users in this group
    if (name && name !== oldName) {
      await User.updateMany({ group: oldName }, { group: name });
    }

    res.json({ message: 'Group updated', group });
  } catch (error) {
    console.error('Update Group Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Get group details by ID
router.get('/:groupId', protect, async (req: AuthenticatedRequest, res) => {
  try {
    const group = await Group.findById(req.params.groupId).select('name');
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    res.json({ name: group.name });
  } catch (error) {
    console.error('Get Group Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Delete group (Coach only)
router.delete('/:groupId', protect, async (req: AuthenticatedRequest, res) => {
  const coachId = req.user?._id;

  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (!group.coach.equals(coachId)) {
      return res.status(403).json({ message: 'Not authorized to delete this group' });
    }

    // Clear the group field from all users who were members of this group
    await User.updateMany(
      { group: group.name }, // Find users with this group name
      { $unset: { group: 1 } } // Remove the group field entirely
    );

    // Delete the group
    await group.deleteOne();
    
    res.json({ message: 'Group deleted and members removed from group' });
  } catch (error) {
    console.error('Delete Group Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// ✅ Leave group (Runner) - MODIFIED to work with group names
router.post('/leave', protect, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?._id;

  try {
    const user = await User.findById(userId);
    if (!user || !user.group) return res.status(400).json({ message: 'User is not in a group' });

    const groupName = user.group; // This is now the group name
    const group = await Group.findOne({ name: groupName });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    group.members = group.members.filter((memberId) => !memberId.equals(userId));
    await group.save();

    user.group = undefined;
    await user.save();

    res.json({ message: 'Left group successfully', groupName: groupName });
  } catch (error) {
    console.error('Leave Group Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/coach/groups', protect, getCoachGroups);
router.get('/:groupId/members', protect, getGroupMembersById);



export default router;
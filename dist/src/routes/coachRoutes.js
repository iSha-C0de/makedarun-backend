"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const User_1 = __importDefault(require("../models/User"));
const Run_1 = __importDefault(require("../models/Run"));
const Group_1 = __importDefault(require("../models/Group"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const assertUser_1 = require("../utils/assertUser");
const router = express_1.default.Router();
// Reset goals for selected members (Coach only)
router.post('/reset-goals', authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const coach = (0, assertUser_1.assertUser)(req);
        const { memberIds, groupName, newGoal } = req.body;
        console.log('Reset Goals Request:', {
            coachId: coach._id,
            coachRole: coach.role,
            memberIds,
            groupName,
            newGoal
        });
        // Validation
        if (coach.role !== 'coach') {
            return res.status(403).json({ message: 'Only coaches can reset member goals' });
        }
        if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
            return res.status(400).json({ message: 'Member IDs are required' });
        }
        if (!groupName) {
            return res.status(400).json({ message: 'Group name is required' });
        }
        if (newGoal === undefined || newGoal === null || isNaN(Number(newGoal)) || Number(newGoal) <= 0) {
            return res.status(400).json({ message: 'A valid positive goal value is required' });
        }
        // Convert newGoal to number
        const goalValue = Number(newGoal);
        // Verify the group exists and the coach owns it
        const group = yield Group_1.default.findOne({ name: groupName });
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }
        if (group.coach.toString() !== coach._id.toString()) {
            return res.status(403).json({ message: 'You do not have permission to modify this group' });
        }
        console.log('Group found:', { groupId: group._id, groupName: group.name });
        // Verify all members belong to the specified group
        const members = yield User_1.default.find({
            _id: { $in: memberIds },
            group: groupName
        });
        console.log('Members found:', members.map(m => ({ id: m._id, userName: m.userName, currentGoal: m.goal })));
        if (members.length !== memberIds.length) {
            return res.status(400).json({
                message: 'Some selected members do not belong to this group',
                foundMembers: members.length,
                requestedMembers: memberIds.length
            });
        }
        // Update the goal for all selected members
        const updateResult = yield User_1.default.updateMany({
            _id: { $in: memberIds },
            group: groupName
        }, {
            $set: { goal: goalValue }
        });
        console.log('Update result:', updateResult);
        if (updateResult.modifiedCount === 0) {
            return res.status(400).json({ message: 'No members were updated' });
        }
        // Verify the update worked
        const updatedMembers = yield User_1.default.find({
            _id: { $in: memberIds },
            group: groupName
        }, 'userName goal');
        console.log('Updated members:', updatedMembers.map(m => ({ userName: m.userName, newGoal: m.goal })));
        res.json({
            message: `Successfully set goal to ${goalValue}m for ${updateResult.modifiedCount} member(s)`,
            updatedCount: updateResult.modifiedCount,
            newGoal: goalValue,
            updatedMembers: updatedMembers.map(m => ({ userName: m.userName, newGoal: m.goal }))
        });
    }
    catch (error) {
        console.error('Reset Goals Error:', error);
        res.status(500).json({
            message: 'Server error while resetting goals',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// Delete run history for selected members (Coach only)
router.post('/delete-runs', authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const coach = (0, assertUser_1.assertUser)(req);
        const { memberIds, groupName } = req.body;
        console.log('Delete Runs Request:', {
            coachId: coach._id,
            coachRole: coach.role,
            memberIds,
            groupName
        });
        if (coach.role !== 'coach') {
            return res.status(403).json({ message: 'Only coaches can delete run history' });
        }
        if (!memberIds || !Array.isArray(memberIds) || !groupName) {
            return res.status(400).json({ message: 'Missing required parameters' });
        }
        // Verify the coach owns this group
        const group = yield Group_1.default.findOne({ name: groupName, coach: coach._id });
        if (!group) {
            return res.status(403).json({ message: 'Not authorized to manage this group' });
        }
        // Verify all members belong to this group
        const members = yield User_1.default.find({
            _id: { $in: memberIds },
            group: groupName,
        });
        console.log('Members to delete runs for:', members.map(m => ({ id: m._id, userName: m.userName })));
        if (members.length !== memberIds.length) {
            return res.status(400).json({ message: 'Some members are not in this group' });
        }
        // Delete all runs for these members
        const deleteResult = yield Run_1.default.deleteMany({
            user: { $in: memberIds }
        });
        console.log('Runs deleted:', deleteResult.deletedCount);
        // Reset progress to 0 for these members
        const progressResetResult = yield User_1.default.updateMany({ _id: { $in: memberIds } }, { $set: { progress: 0 } });
        console.log('Progress reset result:', progressResetResult);
        res.json({
            message: `Successfully deleted ${deleteResult.deletedCount} run${deleteResult.deletedCount !== 1 ? 's' : ''} for ${members.length} member${members.length > 1 ? 's' : ''}`,
            deletedRuns: deleteResult.deletedCount,
            progressResetCount: progressResetResult.modifiedCount,
            affectedMembers: members.map(m => ({ id: m._id, userName: m.userName }))
        });
    }
    catch (error) {
        console.error('Delete Runs Error:', error);
        res.status(500).json({
            message: 'Server error while deleting runs',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// Remove members from group (Coach only)
router.post('/remove-members', authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const coach = (0, assertUser_1.assertUser)(req);
        const { memberIds, groupName } = req.body;
        console.log('Remove Members Request:', {
            coachId: coach._id,
            coachRole: coach.role,
            memberIds,
            groupName
        });
        if (coach.role !== 'coach') {
            return res.status(403).json({ message: 'Only coaches can remove members' });
        }
        if (!memberIds || !Array.isArray(memberIds) || !groupName) {
            return res.status(400).json({ message: 'Missing required parameters' });
        }
        // Verify the coach owns this group
        const group = yield Group_1.default.findOne({ name: groupName, coach: coach._id });
        if (!group) {
            return res.status(403).json({ message: 'Not authorized to manage this group' });
        }
        // Verify all members belong to this group
        const members = yield User_1.default.find({
            _id: { $in: memberIds },
            group: groupName,
        });
        console.log('Members to remove:', members.map(m => ({ id: m._id, userName: m.userName })));
        if (members.length !== memberIds.length) {
            return res.status(400).json({ message: 'Some members are not in this group' });
        }
        // Convert string IDs to ObjectIds for comparison
        const memberObjectIds = memberIds.map(id => id.toString());
        // Remove members from the group's member list
        const originalMemberCount = group.members.length;
        group.members = group.members.filter(memberId => !memberObjectIds.includes(memberId.toString()));
        const removedFromGroupCount = originalMemberCount - group.members.length;
        yield group.save();
        console.log('Removed from group members list:', removedFromGroupCount);
        // Remove group association from users
        const userUpdateResult = yield User_1.default.updateMany({ _id: { $in: memberIds } }, { $unset: { group: 1 } });
        console.log('Users updated (group field removed):', userUpdateResult.modifiedCount);
        res.json({
            message: `Successfully removed ${members.length} member${members.length > 1 ? 's' : ''} from the group`,
            removedMembers: members.map(m => ({ id: m._id, userName: m.userName })),
            removedFromGroupList: removedFromGroupCount,
            usersUpdated: userUpdateResult.modifiedCount
        });
    }
    catch (error) {
        console.error('Remove Members Error:', error);
        res.status(500).json({
            message: 'Server error while removing members',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// Get coach's groups with member count (Coach only)
router.get('/my-groups', authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const coach = (0, assertUser_1.assertUser)(req);
        if (coach.role !== 'coach') {
            return res.status(403).json({ message: 'Only coaches can view their groups' });
        }
        const groups = yield Group_1.default.find({ coach: coach._id })
            .select('name members createdAt')
            .populate({
            path: 'members',
            select: 'userName goal progress',
        });
        const groupsWithStats = groups.map(group => ({
            _id: group._id,
            name: group.name,
            memberCount: group.members.length,
            createdAt: group.createdAt,
            members: group.members.map((member) => ({
                _id: member._id,
                userName: member.userName,
                goal: member.goal || 0,
                progress: member.progress || 0,
                percentage: member.goal > 0 ? Math.round((member.progress / member.goal) * 100) : 0
            }))
        }));
        res.json(groupsWithStats);
    }
    catch (error) {
        console.error('Get Coach Groups Error:', error);
        res.status(500).json({
            message: 'Server error while fetching groups',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// Approve or disapprove member (Coach only)
router.post('/approve-member', authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const coach = (0, assertUser_1.assertUser)(req);
        const { memberId, groupName, approve } = req.body;
        if (coach.role !== 'coach') {
            return res.status(403).json({ message: 'Only coaches can approve members' });
        }
        if (!memberId || !groupName || typeof approve !== 'boolean') {
            return res.status(400).json({ message: 'Missing required parameters' });
        }
        // Verify the coach owns this group
        const group = yield Group_1.default.findOne({ name: groupName, coach: coach._id });
        if (!group) {
            return res.status(403).json({ message: 'Not authorized to manage this group' });
        }
        // Find and update the member
        const member = yield User_1.default.findOne({
            _id: memberId,
            group: groupName
        });
        if (!member) {
            return res.status(404).json({ message: 'Member not found in this group' });
        }
        member.isApproved = approve;
        yield member.save();
        res.json({
            message: `Member ${approve ? 'approved' : 'disapproved'} successfully`,
            member: {
                _id: member._id,
                userName: member.userName,
                isApproved: member.isApproved
            }
        });
    }
    catch (error) {
        console.error('Approve Member Error:', error);
        res.status(500).json({
            message: 'Server error while updating member approval',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
exports.default = router;

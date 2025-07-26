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
const Group_1 = __importDefault(require("../models/Group"));
const Run_1 = __importDefault(require("../models/Run"));
const User_1 = __importDefault(require("../models/User"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const groupController_1 = require("../controllers/groupController");
const router = express_1.default.Router();
// ✅ Create a new group (Coach only)
router.post('/create', authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { name, password } = req.body;
    const coachId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!coachId)
        return res.status(401).json({ message: 'Not authorized' });
    try {
        const existing = yield Group_1.default.findOne({ name });
        if (existing)
            return res.status(400).json({ message: 'Group name already exists' });
        const newGroup = new Group_1.default({
            name,
            password,
            coach: coachId,
            members: [],
        });
        yield newGroup.save();
        res.status(201).json(newGroup);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
}));
// ✅ Join a group (Runner) - MODIFIED to save group name
router.post('/join', authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { groupName, groupPassword } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!userId)
        return res.status(401).json({ message: 'Not authorized' });
    try {
        const group = yield Group_1.default.findOne({ name: groupName });
        if (!group)
            return res.status(404).json({ message: 'Group not found' });
        // Validate password (use bcrypt in production)
        if (group.password !== groupPassword) {
            return res.status(401).json({ message: 'Invalid password' });
        }
        if (!group.members.includes(userId)) {
            group.members.push(userId);
            yield group.save();
        }
        // CHANGED: Store group NAME instead of group ID
        yield User_1.default.findByIdAndUpdate(userId, { group: group.name });
        // Return both group ID and name for frontend compatibility
        res.json({
            message: 'Joined group successfully',
            groupId: group._id.toString(),
            groupName: group.name,
        });
    }
    catch (error) {
        console.error('Join Group Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
// ✅ Remove a member from a group (Coach only)
router.post('/remove-member/:groupName', authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { groupName } = req.params;
    const { userId } = req.body;
    const coachId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!coachId)
        return res.status(401).json({ message: 'Not authorized' });
    try {
        const group = yield Group_1.default.findOne({ name: groupName }).populate('coach');
        if (!group)
            return res.status(404).json({ message: 'Group not found' });
        if (!group.coach || !group.coach._id.equals(coachId)) {
            return res.status(403).json({ message: 'Not authorized to remove members' });
        }
        if (!group.members.some((memberId) => memberId.equals(userId))) {
            return res.status(400).json({ message: 'User is not a member of this group' });
        }
        group.members = group.members.filter((memberId) => !memberId.equals(userId));
        yield group.save();
        // CHANGED: Clear group name instead of group ID
        yield User_1.default.findByIdAndUpdate(userId, { group: undefined });
        res.json({ message: 'Member removed successfully' });
    }
    catch (error) {
        console.error('Remove Member Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
// ✅ Get group members by GROUP NAME (primary endpoint)
router.get('/members/:groupName', authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { groupName } = req.params;
        if (!groupName) {
            return res.status(400).json({ message: 'Group name is required' });
        }
        const group = yield Group_1.default.findOne({ name: groupName })
            .populate('coach', 'userName');
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }
        // Find users by group name instead of group ID
        const members = yield User_1.default.find({ group: groupName })
            .select('userName progress goal emailAdd contactNum address');
        const stats = yield Promise.all(members.map((member) => __awaiter(void 0, void 0, void 0, function* () {
            const runs = yield Run_1.default.find({ user: member._id });
            const totalDistance = runs.reduce((sum, run) => sum + (run.distance || 0), 0);
            return {
                userId: member._id.toString(),
                userName: member.userName,
                goal: member.goal || 0,
                progress: totalDistance,
                distanceLeft: Math.max((member.goal || 0) - totalDistance, 0),
                percentCompleted: member.goal > 0
                    ? ((totalDistance / member.goal) * 100).toFixed(1) + '%'
                    : '0%',
                emailAdd: member.emailAdd || 'N/A',
                contactNum: member.contactNum || 'N/A',
                address: member.address || 'N/A',
            };
        })));
        res.json({
            coachName: ((_a = group.coach) === null || _a === void 0 ? void 0 : _a.userName) || 'Unknown Coach',
            groupName: group.name,
            members: stats,
        });
    }
    catch (error) {
        console.error('Get Group Members Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
// ✅ Update group info (Coach only)
router.put('/:groupId', authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { name, password } = req.body;
    const coachId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    try {
        const group = yield Group_1.default.findById(req.params.groupId);
        if (!group)
            return res.status(404).json({ message: 'Group not found' });
        if (!group.coach.equals(coachId))
            return res.status(403).json({ message: 'Not authorized to edit this group' });
        const oldName = group.name;
        if (name)
            group.name = name;
        if (password)
            group.password = password;
        yield group.save();
        // If name changed, update all users in this group
        if (name && name !== oldName) {
            yield User_1.default.updateMany({ group: oldName }, { group: name });
        }
        res.json({ message: 'Group updated', group });
    }
    catch (error) {
        console.error('Update Group Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
// ✅ Get group details by ID
router.get('/:groupId', authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const group = yield Group_1.default.findById(req.params.groupId).select('name');
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }
        res.json({ name: group.name });
    }
    catch (error) {
        console.error('Get Group Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
// ✅ Delete group (Coach only)
router.delete('/:groupId', authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const coachId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    try {
        const group = yield Group_1.default.findById(req.params.groupId);
        if (!group)
            return res.status(404).json({ message: 'Group not found' });
        if (!group.coach.equals(coachId)) {
            return res.status(403).json({ message: 'Not authorized to delete this group' });
        }
        // Clear the group field from all users who were members of this group
        yield User_1.default.updateMany({ group: group.name }, // Find users with this group name
        { $unset: { group: 1 } } // Remove the group field entirely
        );
        // Delete the group
        yield group.deleteOne();
        res.json({ message: 'Group deleted and members removed from group' });
    }
    catch (error) {
        console.error('Delete Group Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
// ✅ Leave group (Runner) - MODIFIED to work with group names
router.post('/leave', authMiddleware_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    try {
        const user = yield User_1.default.findById(userId);
        if (!user || !user.group)
            return res.status(400).json({ message: 'User is not in a group' });
        const groupName = user.group; // This is now the group name
        const group = yield Group_1.default.findOne({ name: groupName });
        if (!group)
            return res.status(404).json({ message: 'Group not found' });
        group.members = group.members.filter((memberId) => !memberId.equals(userId));
        yield group.save();
        user.group = undefined;
        yield user.save();
        res.json({ message: 'Left group successfully', groupName: groupName });
    }
    catch (error) {
        console.error('Leave Group Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
router.get('/coach/groups', authMiddleware_1.protect, groupController_1.getCoachGroups);
router.get('/:groupId/members', authMiddleware_1.protect, groupController_1.getGroupMembersById);
exports.default = router;

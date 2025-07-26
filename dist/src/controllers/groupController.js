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
exports.resetGoals = exports.getGroupMembersById = exports.getCoachGroups = exports.getGroupMembers = exports.getMyGroupMembers = exports.getGroupMembersByName = exports.leaveGroup = exports.joinGroup = exports.deleteGroup = exports.updateGroup = exports.createGroup = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const Group_1 = __importDefault(require("../models/Group"));
const User_1 = __importDefault(require("../models/User"));
const assertUser_1 = require("../utils/assertUser");
// Create group (Coach only)
exports.createGroup = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, password } = req.body;
    const coach = (0, assertUser_1.assertUser)(req);
    if (coach.role !== 'coach') {
        res.status(403);
        throw new Error('Only coaches can create groups');
    }
    const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
    const group = yield Group_1.default.create({
        name,
        password: hashedPassword,
        coach: coach._id,
        members: [],
    });
    res.status(201).json(group);
}));
// Update group (Coach only)
exports.updateGroup = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const coach = (0, assertUser_1.assertUser)(req);
    const { name, password } = req.body;
    const group = yield Group_1.default.findById(req.params.id);
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
        group.password = yield bcryptjs_1.default.hash(password, 10);
    }
    const updated = yield group.save();
    res.json(updated);
}));
// Delete group (Coach only)
exports.deleteGroup = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const coach = (0, assertUser_1.assertUser)(req);
    const group = yield Group_1.default.findById(req.params.id);
    if (!group) {
        res.status(404);
        throw new Error('Group not found');
    }
    if (group.coach.toString() !== coach._id.toString()) {
        res.status(403);
        throw new Error('Not authorized');
    }
    // Clear the group field from all users who were members of this group
    yield User_1.default.updateMany({ group: group.name }, // Find users with this group name
    { $unset: { group: 1 } } // Remove the group field entirely
    );
    // Delete the group
    yield group.deleteOne();
    res.json({ message: 'Group deleted and members removed from group' });
}));
// Join group (Runner)
exports.joinGroup = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, password } = req.body;
    const runner = (0, assertUser_1.assertUser)(req);
    const group = yield Group_1.default.findOne({ name });
    if (!group || !(yield bcryptjs_1.default.compare(password, group.password))) {
        res.status(400);
        throw new Error('Invalid group name or password');
    }
    if (!group.members.includes(runner._id)) {
        group.members.push(runner._id);
        yield group.save();
    }
    // Store group name instead of group ID
    runner.group = group.name;
    yield runner.save();
    res.json({ message: 'Joined group', group });
}));
// Leave group (Runner)
exports.leaveGroup = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const runner = (0, assertUser_1.assertUser)(req);
    if (!runner.group) {
        res.status(400);
        throw new Error('You are not in a group');
    }
    const groupName = runner.group;
    // Find the group and remove the user from members list
    const group = yield Group_1.default.findOne({ name: groupName });
    if (group) {
        group.members = group.members.filter(memberId => !memberId.equals(runner._id));
        yield group.save();
    }
    // Remove group from user
    runner.group = undefined;
    yield runner.save();
    res.json({ message: 'Successfully left the group' });
}));
// Coach: View members and progress
exports.getGroupMembersByName = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { groupName } = req.params;
    const users = yield User_1.default.find({ group: groupName });
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
}));
// Runner: View members in own group (with coach name)
exports.getMyGroupMembers = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const runner = (0, assertUser_1.assertUser)(req);
    if (!runner.group) {
        res.status(400);
        throw new Error('Runner is not in a group');
    }
    // Query group by name instead of ID
    const group = yield Group_1.default.findOne({ name: runner.group })
        .populate({ path: 'coach', select: 'userName' })
        .populate({
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
    const coachName = ((_a = group.coach) === null || _a === void 0 ? void 0 : _a.userName) || 'Unknown Coach';
    res.json({ coachName, members });
}));
// Used by frontend to fetch group + coach name + member details
exports.getGroupMembers = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const rawName = req.params.groupName;
    const user = (0, assertUser_1.assertUser)(req);
    // Optional: trim and decode URI component
    const groupName = decodeURIComponent(rawName).trim();
    console.log('Looking for group with name:', groupName);
    const group = yield Group_1.default.findOne({ name: new RegExp(`^${groupName}$`, 'i') }) // case-insensitive match
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
    const coachInfo = group.coach;
    const coachName = (coachInfo === null || coachInfo === void 0 ? void 0 : coachInfo.userName) || 'Unknown Coach';
    // Process members with all necessary information
    const members = group.members.map((member) => {
        var _a;
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
            isApproved: (_a = member.isApproved) !== null && _a !== void 0 ? _a : false,
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
}));
// Get all groups for the logged-in coach
exports.getCoachGroups = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const coach = (0, assertUser_1.assertUser)(req);
    if (coach.role !== 'coach') {
        res.status(403);
        throw new Error('Only coaches can view their groups');
    }
    const groups = yield Group_1.default.find({ coach: coach._id })
        .select('_id name password members createdAt')
        .populate({
        path: 'members',
        select: '_id userName goal progress',
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
}));
// Get members of a specific group by ID
exports.getGroupMembersById = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const coach = (0, assertUser_1.assertUser)(req);
    const groupId = req.params.groupId;
    if (coach.role !== 'coach') {
        res.status(403);
        throw new Error('Only coaches can view group members');
    }
    const group = yield Group_1.default.findById(groupId)
        .populate('members', '_id userName emailAdd contactNum address goal progress role isApproved');
    if (!group) {
        res.status(404);
        throw new Error('Group not found');
    }
    if (group.coach.toString() !== coach._id.toString()) {
        res.status(403);
        throw new Error('You do not have permission to view this group');
    }
    const members = group.members.map((member) => {
        var _a;
        return ({
            userId: member._id,
            userName: member.userName,
            emailAdd: member.emailAdd || '',
            contactNum: member.contactNum || '',
            address: member.address || '',
            goal: member.goal || 0,
            progress: member.progress || 0,
            role: member.role || 'runner',
            isApproved: (_a = member.isApproved) !== null && _a !== void 0 ? _a : false,
        });
    });
    res.json({ groupName: group.name, members });
}));
// Reset goals for selected members with a specific goal value
exports.resetGoals = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { memberIds, groupName, newGoal } = req.body;
    const coach = (0, assertUser_1.assertUser)(req);
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
        const group = yield Group_1.default.findOne({ name: groupName });
        if (!group) {
            res.status(404);
            throw new Error('Group not found');
        }
        if (group.coach.toString() !== coach._id.toString()) {
            res.status(403);
            throw new Error('You do not have permission to modify this group');
        }
        // Verify all members belong to the specified group
        const members = yield User_1.default.find({
            _id: { $in: memberIds },
            group: groupName
        });
        if (members.length !== memberIds.length) {
            res.status(400);
            throw new Error('Some selected members do not belong to this group');
        }
        // Update the goal for all selected members
        const updateResult = yield User_1.default.updateMany({
            _id: { $in: memberIds },
            group: groupName
        }, {
            $set: { goal: newGoal }
        });
        if (updateResult.modifiedCount === 0) {
            res.status(400);
            throw new Error('No members were updated');
        }
        res.json({
            message: `Successfully set goal to ${newGoal}m for ${updateResult.modifiedCount} member(s)`,
            updatedCount: updateResult.modifiedCount,
            newGoal: newGoal
        });
    }
    catch (error) {
        console.error('Reset Goals Error:', error);
        throw error;
    }
}));

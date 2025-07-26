"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertUser = assertUser;
function assertUser(req) {
    if (!req.user) {
        throw new Error('User not authenticated');
    }
    return req.user;
}

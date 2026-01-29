const Doctor = require('../models/Doctor');
const Token = require('../models/Token');

class QueueService {
    constructor() {
        this.WEIGHTS = {
            'Emergency': 100,
            'Paid Priority': 50,
            'Priority': 50,
            'Follow-up': 30,
            'Online': 20,
            'Walk-in': 10
        };
    }

    calculatePriorityScore(source, waitMinutes = 0) {
        const baseWeight = this.WEIGHTS[source] || 10;
        return baseWeight + (waitMinutes * 0.5);
    }

    async issueToken(doctorId, source, patientName) {
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) throw new Error('Doctor not found');

        const now = new Date();
        // Find valid slot in the future

        // Find valid slot
        let targetSlot = null;
        for (const slot of doctor.activeSlots) {
            if (slot.end > now) {
                // Check capacity
                const count = await Token.countDocuments({
                    doctor: doctorId,
                    scheduledTime: { $gte: slot.start, $lt: slot.end },
                    status: { $ne: 'Cancelled' }
                });

                if (count < slot.maxCapacity) {
                    targetSlot = slot;
                    break;
                } else if (source === 'Emergency') {
                    // Check for preemption
                    const tokensInSlot = await Token.find({
                        doctor: doctorId,
                        scheduledTime: { $gte: slot.start, $lt: slot.end },
                        status: { $ne: 'Cancelled' }
                    }).sort({ priorityScore: 1 }); // Ascending score (lowest first)

                    if (tokensInSlot.length > 0) {
                        const lowestToken = tokensInSlot[0];
                        if (lowestToken.source !== 'Emergency') {
                            // Bump logic
                            await this.bumpToken(lowestToken, doctor.activeSlots);
                            targetSlot = slot;
                            break;
                        }
                    }
                }
            }
        }

        if (!targetSlot) throw new Error('No available slots');

        // Generate Token Number
        const countToday = await Token.countDocuments({ doctor: doctorId });
        const tokenNumber = `${doctor.department.substring(0, 3).toUpperCase()}-${(countToday + 1).toString().padStart(3, '0')}`;

        const score = this.calculatePriorityScore(source, 0);

        const token = new Token({
            tokenNumber,
            doctor: doctorId,
            source,
            priorityScore: score,
            baseWeight: this.WEIGHTS[source],
            scheduledTime: targetSlot.start,
            estimatedStartTime: targetSlot.start,
            status: 'Waiting'
        });

        await token.save();

        await this.updateEstimatedTimes(doctorId);
        await this.updateEstimatedTimes(doctorId);

        return token;
    }

    async bumpToken(token, allSlots) {
        // Find next available slot for this bumped token
        const currentSlotStart = token.scheduledTime;
        let foundNext = false;
        for (const slot of allSlots) {
            if (slot.start > currentSlotStart) {
                token.scheduledTime = slot.start;
                foundNext = true;
                break;
            }
        }
        if (!foundNext) {
            // No next slot? Hard fail or squeeze?
            // Just add 1 hour to time
            const newTime = new Date(token.scheduledTime);
            newTime.setHours(newTime.getHours() + 1);
            token.scheduledTime = newTime;
        }
        await token.save();
    }

    async cancelToken(tokenId) {
        const token = await Token.findById(tokenId);
        if (!token) throw new Error('Token not found');

        token.status = 'Cancelled';
        await token.save();

        // Gap Filling: Pull estimatedStartTime forward for subsequent tokens
        // Trigger generic update
        await this.updateEstimatedTimes(token.doctor);
        return token;
    }

    async addDelay(doctorId, delayMinutes) {
        // Shift estimatedStartTime for all 'Waiting' tokens
        await Token.updateMany(
            { doctor: doctorId, status: 'Waiting' },
            { $inc: { estimatedStartTime: delayMinutes * 60000 } } // ms
        );
        return { message: 'Delay propagated' };
    }

    async getQueue(doctorId) {
        // Update priority scores for waiting tokens to reflect wait time

        const tokens = await Token.find({
            doctor: doctorId,
            status: { $in: ['Waiting', 'In-Consultation'] }
        });

        const now = new Date();
        for (const t of tokens) {
            if (t.status === 'Waiting') {
                const waitedMinutes = (now - t.createdAt) / 60000;
                t.priorityScore = t.baseWeight + (waitedMinutes * 0.5);
                await t.save();
            }
        }

        // Re-fetch sorted
        return Token.find({
            doctor: doctorId,
            status: { $in: ['Waiting', 'In-Consultation'] }
        }).sort({ estimatedStartTime: 1, priorityScore: -1 });
    }

    // Helper to re-align estimated times based on priority
    async updateEstimatedTimes(doctorId) {
        // Resets estimated times based on strict priority order from ScheduledTime.

        // Find all waiting tokens
        const tokensBySlot = {};
        tokens.forEach(t => {
            const key = t.scheduledTime.toISOString();
            if (!tokensBySlot[key]) tokensBySlot[key] = [];
            tokensBySlot[key].push(t);
        });

        for (const key in tokensBySlot) {
            let slotTokens = tokensBySlot[key];
            // Sort DESC priority
            slotTokens.sort((a, b) => b.priorityScore - a.priorityScore);

            let validStartTime = new Date(key); // Slot start
            const now = new Date();
            if (validStartTime < now) validStartTime = now; // Can't start in past

            for (let i = 0; i < slotTokens.length; i++) {
                const t = slotTokens[i];
                t.estimatedStartTime = new Date(validStartTime.getTime() + (i * avgTime));
                await t.save();
            }
        }
    }

}

module.exports = new QueueService();

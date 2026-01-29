const mongoose = require('mongoose');
const Doctor = require('./src/models/Doctor');
const Token = require('./src/models/Token');
const QueueService = require('./src/services/QueueService');
require('dotenv').config();

const LOG_DELAY = 1000; // ms to wait between steps

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runSimulation() {
    console.log('--- STARTING SIMULATION ---');

    // 1. Connect
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/elastic-opd');
    console.log('Connected to DB');

    // 2. Clear DB
    await Doctor.deleteMany({});
    await Token.deleteMany({});
    console.log('DB Cleared');

    // 3. Bootstrapping Doctors
    console.log('\n--- BOOTSTRAPPING DOCTORS ---');
    const now = new Date();
    const start10 = new Date(now); start10.setHours(10, 0, 0, 0);
    const end11 = new Date(now); end11.setHours(11, 0, 0, 0);

    const start11 = new Date(now); start11.setHours(11, 0, 0, 0);
    const end12 = new Date(now); end12.setHours(12, 0, 0, 0);

    // Ensure times are in future
    // Set slots for tomorrow to ensure valid future slots
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    start10.setDate(tomorrow.getDate()); end11.setDate(tomorrow.getDate());
    start11.setDate(tomorrow.getDate()); end12.setDate(tomorrow.getDate());

    const cardio = await new Doctor({
        name: 'Dr. Heart',
        department: 'Cardiology',
        avgConsultationTime: 10,
        activeSlots: [
            { start: start10, end: end11, maxCapacity: 6 },
            { start: start11, end: end12, maxCapacity: 6 }
        ]
    }).save();

    const ortho = await new Doctor({
        name: 'Dr. Bone',
        department: 'Orthopedics',
        avgConsultationTime: 15,
        activeSlots: [
            { start: start10, end: end11, maxCapacity: 4 },
            { start: start11, end: end12, maxCapacity: 4 }
        ]
    }).save();

    const general = await new Doctor({
        name: 'Dr. General',
        department: 'General',
        avgConsultationTime: 5,
        activeSlots: [
            { start: start10, end: end11, maxCapacity: 10 },
            { start: start11, end: end12, maxCapacity: 10 }
        ]
    }).save();

    console.log(`Created Doctors: ${cardio.name}, ${ortho.name}, ${general.name}`);

    // 4. Bulk Booking
    console.log('\n--- BULK BOOKING (15 Tokens) ---');
    // Mix of sources
    const sources = ['Walk-in', 'Online', 'Online', 'Walk-in', 'Priority', 'Walk-in', 'Online', 'Walk-in', 'Walk-in', 'Online', 'Walk-in', 'Online', 'Walk-in', 'Walk-in', 'Walk-in'];

    for (const source of sources) {
        try {
            await QueueService.issueToken(cardio._id, source);
            // console.log(`Issued ${source}`);
        } catch (e) {
            console.log(`Failed to issue ${source}: ${e.message}`);
        }
    }

    await logQueue(cardio._id, 'Initial State (15 Tokens)');

    await sleep(LOG_DELAY);

    // 5. Chaos 1: Emergency at 10:15
    console.log('\n--- CHAOS EVENT: EMERGENCY INJECTION (10:15 AM) ---');
    // This should bump the lowest priority from the first full slot (10-11)
    await QueueService.issueToken(cardio._id, 'Emergency');
    await logQueue(cardio._id, 'After Emergency Injection');

    await sleep(LOG_DELAY);

    // 6. Chaos 2: Delay at 10:30
    console.log('\n--- CHAOS EVENT: DOCTOR DELAY 15 MIN (10:30 AM) ---');
    await QueueService.addDelay(cardio._id, 15);
    await logQueue(cardio._id, 'After 15m Delay');

    await sleep(LOG_DELAY);

    // 7. Chaos 3: Cancel High Priority at 10:45
    console.log('\n--- CHAOS EVENT: CANCEL HIGHEST NON-EMERGENCY (10:45 AM) ---');
    const queue = await QueueService.getQueue(cardio._id);
    // Find a high priority one (e.g. Priority or Emergency) to cancel
    const target = queue.find(t => t.source === 'Priority' || t.source === 'Emergency');
    if (target) {
        console.log(`Cancelling Token: ${target.tokenNumber} (${target.source})`);
        await QueueService.cancelToken(target._id);
    } else {
        console.log('No suitable token found to cancel');
    }
    await logQueue(cardio._id, 'After Cancellation & Gap Filling');

    console.log('\n--- SIMULATION COMPLETE ---');
    mongoose.connection.close();
}

async function logQueue(doctorId, title) {
    const queue = await QueueService.getQueue(doctorId);
    console.log(`\n[${title}]`);
    const tableData = queue.map(t => ({
        Token: t.tokenNumber,
        Source: t.source,
        Score: t.priorityScore.toFixed(1),
        SlotStart: t.scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        EstStart: t.estimatedStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        Status: t.status
    }));
    console.table(tableData);
}

runSimulation();

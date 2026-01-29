# Elastic OPD Token Allocation Engine

This project implements a Node.js/Express/MongoDB backend for a smart OPD token system with dynamic priority scheduling.

## 1. API Design & Data Schema

### Data Models

**Doctor**
- `name`: String
- `department`: String
- `avgConsultationTime`: Number (minutes)
- `activeSlots`: Array of Time Slots with Capacity

**Token**
- `tokenNumber`: Unique String (e.g., CAR-001)
- `doctor`: Reference to Doctor
- `source`: Enum (Online, Walk-in, Priority, Follow-up, Emergency)
- `priorityScore`: Number (Dynamic)
- `status`: Enum (Waiting, In-Consultation, Completed, Cancelled)
- `scheduledTime`: Implementation Slot Start
- `estimatedStartTime`: Dynamic Prediction

### API Endpoints

- **GET /api/doctors**
    - Logic: Returns a list of all available doctors with their details (Name, Department, IDs).

- **POST /api/tokens/issue**
    - Body: `{ "doctorId": "...", "source": "..." }`
    - Logic: Calculates initial score, finds first valid slot, handles preemption if Emergency.

- **PATCH /api/tokens/:id/cancel**
    - Logic: Marks as Cancelled and triggers Gap Filling to pull subsequent tokens forward.

- **POST /api/doctors/:id/delay**
    - Body: `{ "delayMinutes": 15 }`
    - Logic: Propagates delay to all 'Waiting' tokens for the doctor.

- **GET /api/doctors/:id/queue**
    - Logic: Returns queue sorted by Estimated Time and Priority Score. Updates dynamic scores (Wait Time factor).

## 2. Token Allocation Algorithm

The core logic resides in `QueueService.js`.

### Prioritization Logic
The `priorityScore` is calculated as:
$$Score = BaseWeight + (MinutesWaited \times 0.5)$$

**Base Weights:**
- **Emergency**: 100 (Highest)
- **Paid Priority**: 50
- **Follow-up**: 30
- **Online**: 20
- **Walk-in**: 10

The "MinutesWaited" factor ensures that lower-priority patients (like Walk-ins) gradually gain score over time, preventing starvation.

### Slot Allocation
1.  **Search**: Iterate through doctor's active slots in chronological order.
2.  **Capacity Check**: If `CurrentTokens < MaxCapacity`, assign slot.
3.  **Emergency Preemption**: If slot is full but incoming request is **Emergency**, finding the lowest priority token in that slot and "bumping" it to the next available slot.

## 3. Dynamic Behavior & Edge Cases

### Elasticity
- **Delays**: When a doctor reports a delay, all subsequent estimated timings shift automatically.
- **Gap Filling**: When a patient cancels, the system recalculates timings, effectively pulling later patients forward to fill the void.

### Edge Cases Handled
1.  **Slot Overflow**: If a slot is full and no preemption is possible (e.g., all Emergencies), the system searches the next slot.
2.  **Starvation**: Walk-ins eventually outrank new Online bookings due to the wait-time multiplier.
3.  **Concurrency**: MongoDB atomic operations (and future transactions) prevent double-booking token numbers.

## 4. Simulation
A `simulate.js` script is provided to demonstrate:
1.  Bootstrapping 3 Doctors (Cardiology, Ortho, General).
2.  Bulk issuing of mixed-source tokens.
3.  **Chaos Event 1**: Emergency Injection (Preemption).
4.  **Chaos Event 2**: Doctor Delay Propagation.
5.  **Chaos Event 3**: Cancellation & Gap Filling.

### How to Run

1.  **Setup Environment**
    - Ensure MongoDB is running (or set `MONGODB_URI` in `.env`).
    - Install dependencies: `npm install`

2.  **Seed Data (Optional)**
    - Run the simulation to populate the database with doctors and sample tokens:
      ```bash
      node simulate.js
      ```

3.  **Start Server**
    - Run the API server:
      ```bash
      npm start
      ```
    - The server runs on `http://localhost:3000`.

4.  **Interact via CLI**
    - In a new terminal window, run the interactive CLI tool:
      ```bash
      node cli.js
      ```
    - This allows you to list doctors, check queues, issue tokens, and cancel tokens easily.

### CLI Features
- **List Doctors**: View all available doctors and their IDs.
- **View Queue**: Check the live queue status for any doctor.
- **Issue Token**: Create new appointments.
- **Cancel Token**: Remove appointments and see "Gap Filling" in action.

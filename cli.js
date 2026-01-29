const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const BASE_URL = 'http://localhost:3000/api';

const printMenu = () => {
    console.log('\n--- OPD Token System CLI ---');
    console.log('1. List All Doctors');
    console.log('2. View Queue for a Doctor');
    console.log('3. Issue a Token');
    console.log('4. Cancel a Token');
    console.log('5. Exit');
    console.log('----------------------------');
};

const question = (query) => new Promise(resolve => rl.question(query, resolve));

async function listDoctors() {
    try {
        const res = await fetch(`${BASE_URL}/doctors`);
        const doctors = await res.json();
        console.table(doctors.map(d => ({
            ID: d._id,
            Name: d.name,
            Dept: d.department
        })));
    } catch (e) {
        console.error('Error fetching doctors:', e.message);
    }
}

async function viewQueue() {
    const id = await question('Enter Doctor ID: ');
    try {
        const res = await fetch(`${BASE_URL}/doctors/${id}/queue`);
        const queue = await res.json();
        if (queue.error) {
            console.error('Error:', queue.error);
            return;
        }
        if (queue.length === 0) {
            console.log('Queue is empty.');
            return;
        }
        console.table(queue.map(t => ({
            Token: t.tokenNumber,
            Source: t.source,
            Status: t.status,
            EstTime: new Date(t.estimatedStartTime).toLocaleTimeString()
        })));
    } catch (e) {
        console.error('Error fetching queue:', e.message);
    }
}

async function issueToken() {
    const doctorId = await question('Enter Doctor ID: ');
    const source = await question('Enter Source (Walk-in/Online/Emergency): ');

    try {
        const res = await fetch(`${BASE_URL}/tokens/issue`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ doctorId, source })
        });
        const token = await res.json();
        if (token.error) {
            console.error('Error:', token.error);
        } else {
            console.log(`\nToken Issued! Token Number: ${token.tokenNumber}`);
            console.log(`Estimated Start Time: ${new Date(token.estimatedStartTime).toLocaleTimeString()}`);
        }
    } catch (e) {
        console.error('Error issuing token:', e.message);
    }
}

async function cancelToken() {
    const tokenId = await question('Enter Token ID (the long string _id, not the number): ');

    try {
        const res = await fetch(`${BASE_URL}/tokens/${tokenId}/cancel`, {
            method: 'PATCH'
        });
        const result = await res.json();
        if (result.error) {
            console.error('Error:', result.error);
        } else {
            console.log('\nToken Cancelled Successfully.');
        }
    } catch (e) {
        console.error('Error cancelling token:', e.message);
    }
}

async function main() {
    console.log('Make sure your server is running (npm start)!');

    while (true) {
        printMenu();
        const choice = await question('Choose an option: ');

        switch (choice.trim()) {
            case '1': await listDoctors(); break;
            case '2': await viewQueue(); break;
            case '3': await issueToken(); break;
            case '4': await cancelToken(); break;
            case '5':
                console.log('Goodbye!');
                rl.close();
                process.exit(0);
            default: console.log('Invalid option.');
        }
    }
}

main();

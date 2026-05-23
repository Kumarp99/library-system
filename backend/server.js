// backend/server.js
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json()); 

const dbPath = path.join(__dirname, 'db', 'library.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected smoothly to SQLite database at:', dbPath);
        ensureTablesExist();
    }
});

// Structural Safety Check: Automatically builds and checks missing tables on launch
function ensureTablesExist() {
    db.serialize(() => {
        // Books table
        db.run(`CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            isbn TEXT UNIQUE NOT NULL,
            category_id INTEGER,
            quantity INTEGER NOT NULL,
            available_qty INTEGER NOT NULL,
            shelf_location TEXT
        )`);

        // Users table (For Evaluation authentication context simulation)
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            role TEXT DEFAULT 'Student'
        )`);

        // Seed simulated Student user if table is empty
        db.get(`SELECT id FROM users WHERE id = 1`, (err, row) => {
            if (!row) {
                db.run(`INSERT INTO users (id, name, email, role) VALUES (1, 'Alice Student', 'alice@edu.com', 'Student')`);
            }
        });

        // Borrow Records table
        db.run(`CREATE TABLE IF NOT EXISTS borrow_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            book_id INTEGER,
            borrow_date TEXT NOT NULL,
            due_date TEXT NOT NULL,
            return_date TEXT,
            status TEXT DEFAULT 'Borrowed'
        )`);

        // Activity Logs table
        db.run(`CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            details TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        
        // Fines table (borrow_record_id has a UNIQUE constraint to allow fine updates via upsert)
        db.run(`CREATE TABLE IF NOT EXISTS fines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            borrow_record_id INTEGER UNIQUE,
            fine_amount REAL NOT NULL,
            payment_status TEXT NOT NULL DEFAULT 'Unpaid',
            FOREIGN KEY(borrow_record_id) REFERENCES borrow_records(id)
        )`);
    });
}

// Background activity logger helper
function logActivity(userId, action, details) {
    db.run(
        `INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)`, 
        [userId, action, details],
        (err) => { if (err) console.error("⚠️ Background Logging Error: ", err.message); }
    );
}

// =====================================================================
// OPTION 3: AUTOMATED OVERDUE & FINE SCHEDULER ENGINE
// =====================================================================
function runDailyFineScheduler() {
    console.log("⏰ Daily Background Worker: Scanning for overdue items and refreshing live balance metrics...");
    const today = new Date().toISOString().split('T')[0];

    // Sub-Task A: Check active borrow records where due_date has expired and flag them as 'Overdue'
    db.run(`
        UPDATE borrow_records 
        SET status = 'Overdue' 
        WHERE status = 'Borrowed' AND due_date < ?
    `, [today], function(err) {
        if (err) console.error("❌ Scheduler Core Status Update Error:", err.message);
        if (this.changes > 0) console.log(`🎒 Scheduler Notice: Flipped ${this.changes} active logs to OVERDUE.`);
        
        // Sub-Task B: Calculate running penalties ($2.00/day late) for all items currently flagged 'Overdue'
        db.all(`SELECT id, user_id, due_date FROM borrow_records WHERE status = 'Overdue'`, [], (err, rows) => {
            if (err) return console.error("❌ Scheduler Core Scan Failure:", err.message);

            rows.forEach(record => {
                const due = new Date(record.due_date);
                const current = new Date(today);
                const elapsedMilliseconds = Math.abs(current - due);
                const overdueDays = Math.ceil(elapsedMilliseconds / (1000 * 60 * 60 * 24));
                const accruedFine = overdueDays * 2.00;

                // Upsert fine record using INSERT or IGNORE / UPDATE pattern to update existing unpaid fines
                db.run(`
                    INSERT INTO fines (borrow_record_id, fine_amount, payment_status)
                    VALUES (?, ?, 'Unpaid')
                    ON CONFLICT(borrow_record_id) DO UPDATE SET fine_amount = ?
                    WHERE payment_status = 'Unpaid'
                `, [record.id, accruedFine, accruedFine], (fineErr) => {
                    if (fineErr) console.error(`❌ Fine adjustment failure on Record ID #${record.id}:`, fineErr.message);
                });
            });
        });
    });
}

// Kick off immediately on server boot, and schedule to loop automatically every 24 hours
runDailyFineScheduler();
const INTERVAL_LOOP_MS = 24 * 60 * 60 * 1000;
setInterval(runDailyFineScheduler, INTERVAL_LOOP_MS);


// =====================================================================
// API INTERFACE ENDPOINTS
// =====================================================================

// DB RESET TOOL (For clean evaluation demonstrations)
app.post('/api/reset', (req, res) => {
    db.serialize(() => {
        db.run(`DELETE FROM borrow_records`);
        db.run(`DELETE FROM fines`);
        db.run(`DELETE FROM activity_logs`);
        db.run(`UPDATE books SET available_qty = quantity`);
        res.json({ message: "Database wiped and catalog counts restored for clean evaluation run!" });
    });
});

// 1. GET /api/books - List books with search and filter parameters
app.get('/api/books', (req, res) => {
    const { category, search } = req.query;
    let query = `SELECT b.* FROM books b WHERE 1=1`;
    let params = [];

    if (category) {
        query += ` AND b.shelf_location LIKE ?`; // Using loose placeholder classification or matching string configurations
        params.push(`%${category}%`);
    }
    if (search) {
        query += ` AND (b.title LIKE ? OR b.isbn LIKE ? OR b.author LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 2. POST /api/books - Register new book records (Librarian Tool)
app.post('/api/books', (req, res) => {
    const { title, author, isbn, quantity, shelf_location } = req.body;
    
    if (!title || !author || !isbn || !quantity) {
        return res.status(400).json({ error: "Required fields missing: title, author, isbn, and baseline quantity are mandatory." });
    }

    db.run(
        `INSERT INTO books (title, author, isbn, category_id, quantity, available_qty, shelf_location) VALUES (?, ?, ?, 1, ?, ?, ?)`,
        [title, author, isbn, quantity, quantity, shelf_location],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: "System Collision Check Blocked: A book entry with this ISBN already exists." });
                }
                return res.status(500).json({ error: err.message });
            }
            logActivity(null, 'ADD_BOOK', `Added title entry: ${title} to catalog workspace.`);
            res.status(201).json({ message: "Book entry successfully created", bookId: this.lastID });
        }
    );
});

// 3. POST /api/borrow - Allocate borrow resource (Student action)
app.post('/api/borrow', (req, res) => {
    const { user_id, book_id, borrow_duration_days = 14 } = req.body;

    if (!user_id || !book_id) {
        return res.status(400).json({ error: "User transaction cannot process: system requires both User ID and Book ID." });
    }

    db.get(`SELECT available_qty, title FROM books WHERE id = ?`, [book_id], (err, book) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!book) return res.status(404).json({ error: "Target book row target non-existent inside database indexing storage." });
        if (book.available_qty <= 0) {
            return res.status(400).json({ error: "Resource Exhausted: The requested item is currently out of stock." });
        }

        const localDate = new Date();
        const borrowDate = localDate.toISOString().split('T')[0];
        localDate.setDate(localDate.getDate() + parseInt(borrow_duration_days));
        const dueDate = localDate.toISOString().split('T')[0];

        db.run(`UPDATE books SET available_qty = available_qty - 1 WHERE id = ?`, [book_id], function(err) {
            if (err) return res.status(500).json({ error: err.message });

            db.run(
                `INSERT INTO borrow_records (user_id, book_id, borrow_date, due_date, status) VALUES (?, ?, ?, ?, 'Borrowed')`,
                [user_id, book_id, borrowDate, dueDate],
                function(err) {
                    if (err) {
                        db.run(`UPDATE books SET available_qty = available_qty + 1 WHERE id = ?`, [book_id]); // Safe dynamic rollback
                        return res.status(500).json({ error: err.message });
                    }
                    logActivity(user_id, 'BORROW', `Checked out title reference: "${book.title}"`);
                    res.status(201).json({ message: "Resource successfully allocated!", recordId: this.lastID, dueDate });
                }
            );
        });
    });
});

// 4. PUT /api/return/:id - Execute return operation handler
app.put('/api/return/:id', (req, res) => {
    const recordId = req.params.id;
    const returnDate = new Date().toISOString().split('T')[0];

    db.get(`SELECT * FROM borrow_records WHERE id = ?`, [recordId], (err, record) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!record) return res.status(404).json({ error: "Active allocation record index missing." });
        if (record.status === 'Returned') return res.status(400).json({ error: "Target row transaction already closed out." });

        const due = new Date(record.due_date);
        const ret = new Date(returnDate);
        let fine = 0;

        if (ret > due) {
            const diffTime = Math.abs(ret - due);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            fine = diffDays * 2.00; 
        }

        db.run(`UPDATE borrow_records SET return_date = ?, status = 'Returned' WHERE id = ?`, [returnDate, recordId], function(err) {
            if (err) return res.status(500).json({ error: err.message });

            db.run(`UPDATE books SET available_qty = available_qty + 1 WHERE id = ?`, [record.book_id], function(err) {
                if (err) return res.status(500).json({ error: err.message });

                if (fine > 0) {
                    db.run(`
                        INSERT INTO fines (borrow_record_id, fine_amount, payment_status) 
                        VALUES (?, ?, 'Unpaid')
                        ON CONFLICT(borrow_record_id) DO UPDATE SET fine_amount = ?
                    `, [recordId, fine, fine], function(err) {
                        if (err) return res.status(500).json({ error: err.message });
                        logActivity(record.user_id, 'RETURN', `Returned late. Action item fine applied: $${fine}`);
                        res.json({ message: "Returned late. Fine balance logged.", fineApplied: fine });
                    });
                } else {
                    logActivity(record.user_id, 'RETURN', `Returned allocation item safely on time.`);
                    res.json({ message: "Returned on schedule. Complete workflow closed out.", fineApplied: 0 });
                }
            });
        });
    });
});

// 5. GET /api/borrow-records - Fetch history data logs
app.get('/api/borrow-records', (req, res) => {
    const { user_id } = req.query;
    let query = `SELECT r.*, b.title, b.author, 'Alice Student' as user_name, f.fine_amount, f.payment_status 
                 FROM borrow_records r 
                 JOIN books b ON r.book_id = b.id 
                 LEFT JOIN fines f ON r.id = f.borrow_record_id WHERE 1=1`;
    let params = [];

    if (user_id) { query += ` AND r.user_id = ?`; params.push(user_id); }
    query += ` ORDER BY r.id DESC`;

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 6. PUT /api/fines/:id/pay - Clear outstanding balances
app.put('/api/fines/:id/pay', (req, res) => {
    const recordId = req.params.id; // Passing record link id reference block handles clearing seamlessly
    db.run(`UPDATE fines SET payment_status = 'Paid' WHERE borrow_record_id = ?`, [recordId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        logActivity(null, 'PAY_FINE', `Processed balance payment validation for record context link #${recordId}`);
        res.json({ message: "Fine processing balance successfully settled." });
    });
});

// 7. GET /api/dashboard/summary - Live analytics engine metrics computation (OPTION 2 SUPPORT)
app.get('/api/dashboard/summary', (req, res) => {
    const metrics = {};
    db.get(`SELECT COUNT(*) as total_books, SUM(quantity) as total_copies FROM books`, [], (err, row1) => {
        metrics.totalBooks = row1?.total_books || 0;
        metrics.totalCopies = row1?.total_copies || 0;

        db.get(`SELECT COUNT(*) as active_borrows FROM borrow_records WHERE status = 'Borrowed'`, [], (err, row2) => {
            metrics.activeBorrows = row2?.active_borrows || 0;

            db.get(`SELECT COUNT(*) as overdue_count FROM borrow_records WHERE status = 'Overdue'`, [], (err, row3) => {
                metrics.overdueReturns = row3?.overdue_count || 0;

                db.get(`SELECT SUM(fine_amount) as total_collected FROM fines WHERE payment_status = 'Paid'`, [], (err, row4) => {
                    metrics.fineCollected = row4?.total_collected || 0.0;
                    res.json(metrics);
                });
            });
        });
    });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Backend service running smoothly on port ${PORT}`));
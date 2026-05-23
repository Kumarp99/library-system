const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// This creates a library.db file inside the backend/db folder
const dbPath = path.join(__dirname, 'library.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) return console.error('Error opening database:', err.message);
    console.log('Connected to the SQLite database.');
});

db.serialize(() => {
    console.log('Initializing database tables...');

    // 1. Categories Table
    db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
    )`);

    // 2. Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT CHECK(role IN ('Student', 'Librarian', 'Admin')) NOT NULL
    )`);

    // 3. Books Table
    db.run(`CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        isbn TEXT NOT NULL UNIQUE,
        category_id INTEGER,
        quantity INTEGER NOT NULL DEFAULT 0,
        available_qty INTEGER NOT NULL DEFAULT 0,
        shelf_location TEXT,
        FOREIGN KEY (category_id) REFERENCES categories(id)
    )`);

    // 4. Borrow Records Table
    db.run(`CREATE TABLE IF NOT EXISTS borrow_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        book_id INTEGER NOT NULL,
        borrow_date TEXT NOT NULL,
        due_date TEXT NOT NULL,
        return_date TEXT,
        status TEXT CHECK(status IN ('Borrowed', 'Returned', 'Overdue', 'Lost')) DEFAULT 'Borrowed',
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (book_id) REFERENCES books(id)
    )`);

    // 5. Fines Table
    db.run(`CREATE TABLE IF NOT EXISTS fines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        borrow_record_id INTEGER NOT NULL UNIQUE,
        fine_amount REAL NOT NULL DEFAULT 0.0,
        payment_status TEXT CHECK(payment_status IN ('Unpaid', 'Paid')) DEFAULT 'Unpaid',
        FOREIGN KEY (borrow_record_id) REFERENCES borrow_records(id)
    )`);

    console.log('Tables created successfully. Inserting seed data...');

    // --- INSERT SEED DATA ---
    
    // Seed Categories
    const categories = ['Fiction', 'Science', 'History', 'Technology'];
    const stmtCat = db.prepare(`INSERT OR IGNORE INTO categories (name) VALUES (?)`);
    categories.forEach(cat => stmtCat.run(cat));
    stmtCat.finalize();

    // Seed Users (Passwords left plain text for simple testing/evaluator login)
    db.run(`INSERT OR IGNORE INTO users (id, name, email, password, role) VALUES 
        (1, 'Alice Student', 'student@library.com', 'password123', 'Student'),
        (2, 'John Librarian', 'librarian@library.com', 'admin123', 'Librarian'),
        (3, 'Super Admin', 'admin@library.com', 'super123', 'Admin')
    `);

    // Seed Books (Initial inventory matching shelf locations)
    db.run(`INSERT OR IGNORE INTO books (id, title, author, isbn, category_id, quantity, available_qty, shelf_location) VALUES 
        (1, 'Eloquent JavaScript', 'Marijn Haverbeke', '9781593279509', 4, 5, 5, 'Shelf A-3'),
        (2, 'A Brief History of Time', 'Stephen Hawking', '9780553380163', 2, 3, 3, 'Shelf B-1'),
        (3, 'The Great Gatsby', 'F. Scott Fitzgerald', '9780743273565', 1, 4, 4, 'Shelf C-2')
    `);

    console.log('Database initialization and seeding complete!');
    db.close();
});
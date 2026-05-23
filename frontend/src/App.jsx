// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';

export default function App() {
  // Evaluation Role System State Simulator
  const [currentRole, setCurrentRole] = useState('Librarian'); // Student, Librarian, Admin Summary View
  const [currentUserId] = useState(1); // Mapped straight to simulated test data "Alice Student"

  // Global UI State
  const [books, setBooks] = useState([]);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState({ totalBooks: 0, totalCopies: 0, activeBorrows: 0, overdueReturns: 0, fineCollected: 0 });
  
  // Search & Forms Processing Management State variables
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [bookForm, setBookForm] = useState({ title: '', author: '', isbn: '', quantity: 1, shelf_location: '' });
  const [message, setMessage] = useState({ text: '', type: '' });

  const API_URL = 'http://localhost:5000/api';

  const notify = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  // Data Query Connectors
  const fetchBooks = async () => {
    try {
      const res = await fetch(`${API_URL}/books?search=${search}&category=${categoryFilter}`);
      const data = await res.json();
      if (res.ok) setBooks(data);
    } catch (err) { console.error("Error communicating with backend storage collection api:", err); }
  };

  const fetchHistory = async () => {
    try {
      const url = currentRole === 'Student' ? `${API_URL}/borrow-records?user_id=${currentUserId}` : `${API_URL}/borrow-records`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setHistory(data);
    } catch (err) { console.error(err); }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_URL}/dashboard/summary`);
      const data = await res.json();
      if (res.ok) setSummary(data);
    } catch (err) { console.error(err); }
  };

  // Live trigger pipeline synchronization
  useEffect(() => {
    fetchBooks();
    fetchHistory();
    fetchSummary();
  }, [search, categoryFilter, currentRole]);

  // Librarian Action: Register entry parameters
  const handleAddBook = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bookForm,
          shelf_location: bookForm.shelf_location || categoryFilter || 'Shelf A-1'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed registration verification process handles.");
      
      notify("Book registry item committed successfully directly to backend storage database ledger.");
      setBookForm({ title: '', author: '', isbn: '', quantity: 1, shelf_location: '' });
      fetchBooks();
      fetchSummary();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  // Student Action: Check out item allocation resources
  const handleBorrowBook = async (bookId) => {
    try {
      const res = await fetch(`${API_URL}/borrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUserId, book_id: bookId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Borrow request allocation rejected by system logic limits.");

      notify(`Confirmation: Book successfully allocated! Due date returned: ${data.dueDate}`);
      fetchBooks();
      fetchHistory();
      fetchSummary();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  // Student/Librarian Action: Returns processing execution handler
  const handleReturnBook = async (recordId) => {
    try {
      const res = await fetch(`${API_URL}/return/${recordId}`, { method: 'PUT' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Return update routine failed.");

      if (data.fineApplied > 0) {
        notify(`Book turned in late. Overdue fine logged: $${data.fineApplied.toFixed(2)}`, 'error');
      } else {
        notify("Book tracking inventory balance successfully restored on time!");
      }
      fetchBooks();
      fetchHistory();
      fetchSummary();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  // Settle Outstanding Debts balance handler routine
  const handlePayFine = async (recordId) => {
    try {
      const res = await fetch(`${API_URL}/fines/${recordId}/pay`, { method: 'PUT' });
      if (!res.ok) throw new Error("Payment pipeline sync error encountered.");
      notify("Fine payment verification confirmed. User balance initialized cleanly.");
      fetchHistory();
      fetchSummary();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '24px', maxWidth: '1300px', margin: '0 auto', backgroundColor: '#f8f9fa', minHeight: '100vh', color: '#2d3748' }}>
      
      {/* Universal Header and Simulated Authorization Node Controller */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, color: '#1a202c', fontSize: '28px', fontWeight: '800' }}>Digital Library Hub</h1>
          <p style={{ margin: '4px 0 0 0', color: '#718096', fontSize: '14px' }}>Automated Fine Management & Activity Analytics Workspace</p>
        </div>
        <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <label style={{ fontWeight: '700', marginRight: '12px', color: '#4a5568', fontSize: '14px' }}>Testing Role Switcher: </label>
          <select value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e0', fontWeight: '6px', cursor: 'pointer' }}>
            <option value="Student">Student View</option>
            <option value="Librarian">Librarian View</option>
            <option value="Admin">Admin Summary View</option>
          </select>
        </div>
      </header>

      {/* Global Toast Alert Notifications Bar */}
      {message.text && (
        <div style={{ padding: '14px 20px', marginBottom: '24px', borderRadius: '6px', fontWeight: '700', color: '#ffffff', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', backgroundColor: message.type === 'error' ? '#e53e3e' : '#38a169', transition: 'all 0.3s ease' }}>
          {message.text}
        </div>
      )}

      {/* ===================================================================== */}
      {/* OPTION 2: LIVE METRICS ANALYTICS VIEW CARDS DISPLAY PANEL            */}
      {/* ===================================================================== */}
      {(currentRole === 'Librarian' || currentRole === 'Admin') && (
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: '#1a202c' }}>Library System Analytics Dashboard Overview</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '5px solid #3182ce' }}>
              <h3 style={{ margin: 0, color: '#718096', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unique Catalog Titles</h3>
              <p style={{ margin: '8px 0 0 0', fontSize: '32px', fontWeight: '800', color: '#2d3748' }}>{summary.totalBooks}</p>
            </div>
            <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '5px solid #4a5568' }}>
              <h3 style={{ margin: 0, color: '#718096', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Copies In Inventory</h3>
              <p style={{ margin: '8px 0 0 0', fontSize: '32px', fontWeight: '800', color: '#2d3748' }}>{summary.totalCopies || 0}</p>
            </div>
            <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '5px solid #dd6b20' }}>
              <h3 style={{ margin: 0, color: '#718096', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Outbound Loans</h3>
              <p style={{ margin: '8px 0 0 0', fontSize: '32px', fontWeight: '800', color: '#2d3748' }}>{summary.activeBorrows}</p>
            </div>
            <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '5px solid #e53e3e' }}>
              <h3 style={{ margin: 0, color: '#718096', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Calculated Overdue Logs</h3>
              <p style={{ margin: '8px 0 0 0', fontSize: '32px', fontWeight: '800', color: '#e53e3e' }}>{summary.overdueReturns}</p>
            </div>
            <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '5px solid #38a169' }}>
              <h3 style={{ margin: 0, color: '#718096', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fine Revenue Collected</h3>
              <p style={{ margin: '8px 0 0 0', fontSize: '32px', fontWeight: '800', color: '#38a169' }}>${Number(summary.fineCollected).toFixed(2)}</p>
            </div>
          </div>
        </section>
      )}

      {/* Grid Allocation Split Workspace Viewports */}
      <div style={{ display: 'grid', gridTemplateColumns: (currentRole === 'Librarian' || currentRole === 'Admin') ? '1fr 2fr' : '1fr', gap: '24px', marginBottom: '32px' }}>
        
        {/* Librarian Intake Action Module panel view */}
        {(currentRole === 'Librarian' || currentRole === 'Admin') && (
          <section style={{ background: '#ffffff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <h2 style={{ marginTop: 0, fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Add New Book Record</h2>
            <form onSubmit={handleAddBook} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>Book Title*</label>
                <input type="text" required value={bookForm.title} onChange={e => setBookForm({...bookForm, title: e.target.value})} style={{ width: '100%', boxSizing: 'border-size', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e0' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>Author Name*</label>
                <input type="text" required value={bookForm.author} onChange={e => setBookForm({...bookForm, author: e.target.value})} style={{ width: '100%', boxSizing: 'border-size', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e0' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>ISBN Code (Unique)*</label>
                <input type="text" required value={bookForm.isbn} onChange={e => setBookForm({...bookForm, isbn: e.target.value})} style={{ width: '100%', boxSizing: 'border-size', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e0' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>Initial Allocation Copies*</label>
                <input type="number" min="1" required value={bookForm.quantity} onChange={e => setBookForm({...bookForm, quantity: parseInt(e.target.value) || 1})} style={{ width: '100%', boxSizing: 'border-size', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e0' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>Shelf Room Coordinate</label>
                <input type="text" placeholder="e.g. Shelf B-4" value={bookForm.shelf_location} onChange={e => setBookForm({...bookForm, shelf_location: e.target.value})} style={{ width: '100%', boxSizing: 'border-size', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e0' }} />
              </div>
              <button type="submit" style={{ background: '#2b6cb0', color: '#ffffff', padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', marginTop: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>Commit to SQLite File</button>
            </form>
          </section>
        )}

        {/* Global Catalog Resource Filter Index Viewports */}
        <section style={{ background: '#ffffff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <h2 style={{ marginTop: 0, fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Available Library Search Index</h2>
          
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <input type="text" placeholder="Search parameters via keywords, author name, or structural ISBN match string..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 2, padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e0' }} />
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ flex: 1, padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e0', cursor: 'pointer' }}>
              <option value="">All Locations / Rows</option>
              <option value="Shelf A">Shelf A Section</option>
              <option value="Shelf B">Shelf B Section</option>
              <option value="Shelf C">Shelf C Section</option>
            </select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f7fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: '#4a5568' }}>Title Block</th>
                  <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: '#4a5568' }}>Author</th>
                  <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: '#4a5568' }}>Shelf Loc</th>
                  <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: '#4a5568' }}>Available Stock Status</th>
                  <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: '#4a5568' }}>Action Execution</th>
                </tr>
              </thead>
              <tbody>
                {books.map(book => (
                  <tr key={book.id} style={{ borderBottom: '1px solid #edf2f7', transition: 'background 0.2s' }}>
                    <td style={{ padding: '14px 16px', fontWeight: '600', color: '#1a202c' }}>{book.title}</td>
                    <td style={{ padding: '14px 16px', color: '#4a5568' }}>{book.author}</td>
                    <td style={{ padding: '14px 16px' }}><span style={{ fontFamily: 'monospace', background: '#edf2f7', padding: '3px 8px', borderRadius: '4px', fontSize: '12px' }}>{book.shelf_location || 'Unassigned'}</span></td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ color: book.available_qty > 0 ? '#38a169' : '#e53e3e', fontWeight: '700', fontSize: '14px' }}>
                        {book.available_qty} units left / ({book.quantity} baseline)
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {currentRole === 'Student' ? (
                        <button disabled={book.available_qty <= 0} onClick={() => handleBorrowBook(book.id)} style={{ backgroundColor: book.available_qty > 0 ? '#38a169' : '#a0aec0', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: book.available_qty > 0 ? 'pointer' : 'not-allowed', fontWeight: '700', fontSize: '13px' }}>
                          {book.available_qty > 0 ? 'Request Borrow' : 'Out of Stock'}
                        </button>
                      ) : (
                        <span style={{ fontStyle: 'italic', color: '#a0aec0', fontSize: '13px' }}>Read-Only (Student View required)</span>
                      )}
                    </td>
                  </tr>
                ))}
                {books.length === 0 && (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: '#718096', fontStyle: 'italic' }}>No matching items currently registered inside system index logs.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Unified System Circulation Log Panel Viewport */}
      <section style={{ background: '#ffffff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <h2 style={{ marginTop: 0, fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>System Circulation Log & Live Fine Balance Tracks</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f7fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: '#4a5568' }}>ID</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: '#4a5568' }}>Borrower Handle</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: '#4a5568' }}>Allocated Title</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: '#4a5568' }}>Chronology Metrics</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: '#4a5568' }}>Circulation Status</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: '#4a5568' }}>Overdue Penalty Balances</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: '#4a5568' }}>Operations Engine Execution</th>
              </tr>
            </thead>
            <tbody>
              {history.map(rec => (
                <tr key={rec.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '13px', color: '#718096' }}>#{rec.id}</td>
                  <td style={{ padding: '14px 16px', fontWeight: '500' }}>{rec.user_name}</td>
                  <td style={{ padding: '14px 16px', color: '#1a202c', fontWeight: '500' }}>{rec.title}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4a5568' }}>
                    <div><strong>Out:</strong> {rec.borrow_date}</div>
                    <div><strong>Due:</strong> {rec.due_date}</div>
                    {rec.return_date && <div style={{ color: '#38a169' }}><strong>In:</strong> {rec.return_date}</div>}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: '700', backgroundColor: rec.status === 'Returned' ? '#c6f6d5' : rec.status === 'Overdue' ? '#fed7d7' : '#feebc8', color: rec.status === 'Returned' ? '#22543d' : rec.status === 'Overdue' ? '#742a2a' : '#744210' }}>
                      {rec.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {rec.fine_amount ? (
                      <div>
                        <div style={{ color: '#e53e3e', fontWeight: '800', fontSize: '15px' }}>${Number(rec.fine_amount).toFixed(2)}</div>
                        <span style={{ fontSize: '11px', color: rec.payment_status === 'Paid' ? '#38a169' : '#dd6b20', fontWeight: '700', textTransform: 'uppercase' }}>
                          ({rec.payment_status})
                        </span>
                      </div>
                    ) : <span style={{ color: '#a0aec0' }}>—</span>}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {(rec.status === 'Borrowed' || rec.status === 'Overdue') && (
                        <button onClick={() => handleReturnBook(rec.id)} style={{ backgroundColor: '#3182ce', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
                          Process Return
                        </button>
                      )}
                      {rec.fine_amount > 0 && rec.payment_status === 'Unpaid' && (
                        <button onClick={() => handlePayFine(rec.id)} style={{ backgroundColor: '#38a169', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
                          Settle Fine Balance
                        </button>
                      )}
                      {rec.status === 'Returned' && (!rec.fine_amount || rec.payment_status === 'Paid') && (
                        <span style={{ fontSize: '13px', color: '#a0aec0', fontStyle: 'italic' }}>Transaction Finalized</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#718096', fontStyle: 'italic' }}>No system transaction data found inside active databases.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
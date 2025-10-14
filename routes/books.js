const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

const DATA_FILE = path.join(__dirname, '../data/books.json');

// Helper function to read books data
async function readBooks() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading books file:', error);
        return { books: [] };
    }
}

// Helper function to write books data
async function writeBooks(data) {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing books file:', error);
        throw error;
    }
}

// GET / - Display all books with filtering
router.get('/', async (req, res) => {
    try {
        const data = await readBooks();
        let books = data.books;
        const { available, overdue, search } = req.query;
        
        // Filter by availability
        if (available === 'true') {
            books = books.filter(book => book.isAvailable);
        }
        
        // Filter by overdue (simplified logic)
        if (overdue === 'true') {
            const today = new Date();
            books = books.filter(book => 
                !book.isAvailable && book.dueDate && new Date(book.dueDate) < today
            );
        }
        
        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            books = books.filter(book => 
                book.title.toLowerCase().includes(searchLower) ||
                book.author.toLowerCase().includes(searchLower)
            );
        }
        
        res.render('index', { 
            books: books,
            filters: req.query,
            title: 'Library Management System'
        });
    } catch (error) {
        console.error('Error in GET /:', error);
        res.status(500).render('error', { error: 'Error reading books data' });
    }
});

// GET /books/new - Show form to add new book
router.get('/books/new', (req, res) => {
    res.render('book-form', { 
        book: null, 
        title: 'Add New Book',
        formAction: '/books',
        formMethod: 'POST'
    });
});

// GET /books/:id - Display book details
router.get('/books/:id', async (req, res) => {
    try {
        const data = await readBooks();
        const book = data.books.find(b => b.id === parseInt(req.params.id));
        
        if (!book) {
            return res.status(404).render('error', { error: 'Book not found' });
        }
        
        res.render('book-detail', { 
            book: book,
            title: `Book: ${book.title}`
        });
    } catch (error) {
        console.error('Error in GET /books/:id:', error);
        res.status(500).render('error', { error: 'Error reading book data' });
    }
});

// GET /books/:id/edit - Show edit form
router.get('/books/:id/edit', async (req, res) => {
    try {
        const data = await readBooks();
        const book = data.books.find(b => b.id === parseInt(req.params.id));
        
        if (!book) {
            return res.status(404).render('error', { error: 'Book not found' });
        }
        
        res.render('book-form', { 
            book: book,
            title: `Edit Book: ${book.title}`,
            formAction: `/books/${book.id}?_method=PUT`,
            formMethod: 'POST'
        });
    } catch (error) {
        console.error('Error in GET /books/:id/edit:', error);
        res.status(500).render('error', { error: 'Error loading book form' });
    }
});

// POST /books - Add new book
router.post('/books', async (req, res) => {
    try {
        const data = await readBooks();
        const newBook = {
            id: data.books.length > 0 ? Math.max(...data.books.map(b => b.id)) + 1 : 1,
            title: req.body.title,
            author: req.body.author,
            year: parseInt(req.body.year),
            isbn: req.body.isbn || '',
            description: req.body.description || '',
            isAvailable: true,
            reader: null,
            dueDate: null
        };
        
        data.books.push(newBook);
        await writeBooks(data);
        
        res.redirect('/');
    } catch (error) {
        console.error('Error in POST /books:', error);
        res.status(500).render('error', { error: 'Error adding book' });
    }
});

// PUT /books/:id - Update book
router.put('/books/:id', async (req, res) => {
    try {
        const data = await readBooks();
        const bookIndex = data.books.findIndex(b => b.id === parseInt(req.params.id));
        
        if (bookIndex === -1) {
            return res.status(404).render('error', { error: 'Book not found' });
        }
        
        // Update book details
        data.books[bookIndex] = {
            ...data.books[bookIndex],
            title: req.body.title,
            author: req.body.author,
            year: parseInt(req.body.year),
            isbn: req.body.isbn || '',
            description: req.body.description || ''
        };
        
        await writeBooks(data);
        res.redirect(`/books/${req.params.id}`);
    } catch (error) {
        console.error('Error in PUT /books/:id:', error);
        res.status(500).render('error', { error: 'Error updating book' });
    }
});

// Lend book endpoint
router.post('/books/:id/lend', async (req, res) => {
    try {
        const data = await readBooks();
        const bookIndex = data.books.findIndex(b => b.id === parseInt(req.params.id));
        
        if (bookIndex === -1) {
            return res.status(404).json({ error: 'Book not found' });
        }
        
        data.books[bookIndex].isAvailable = false;
        data.books[bookIndex].reader = req.body.reader;
        data.books[bookIndex].dueDate = req.body.dueDate;
        
        await writeBooks(data);
        res.json({ success: true, book: data.books[bookIndex] });
    } catch (error) {
        console.error('Error in POST /books/:id/lend:', error);
        res.status(500).json({ error: 'Error lending book' });
    }
});

// Return book endpoint
router.post('/books/:id/return', async (req, res) => {
    try {
        const data = await readBooks();
        const bookIndex = data.books.findIndex(b => b.id === parseInt(req.params.id));
        
        if (bookIndex === -1) {
            return res.status(404).json({ error: 'Book not found' });
        }
        
        data.books[bookIndex].isAvailable = true;
        data.books[bookIndex].reader = null;
        data.books[bookIndex].dueDate = null;
        
        await writeBooks(data);
        res.json({ success: true, book: data.books[bookIndex] });
    } catch (error) {
        console.error('Error in POST /books/:id/return:', error);
        res.status(500).json({ error: 'Error returning book' });
    }
});

// DELETE /books/:id - Remove book
router.delete('/books/:id', async (req, res) => {
    try {
        const data = await readBooks();
        const bookIndex = data.books.findIndex(b => b.id === parseInt(req.params.id));
        
        if (bookIndex === -1) {
            return res.status(404).json({ error: 'Book not found' });
        }
        
        const deletedBook = data.books.splice(bookIndex, 1)[0];
        await writeBooks(data);
        
        res.json({ 
            success: true, 
            message: `Book "${deletedBook.title}" deleted successfully` 
        });
    } catch (error) {
        console.error('Error in DELETE /books/:id:', error);
        res.status(500).json({ error: 'Error deleting book' });
    }
});

// API endpoint for AJAX filtering
router.get('/api/books', async (req, res) => {
    try {
        const data = await readBooks();
        let books = data.books;
        const { available, search } = req.query;
        
        if (available === 'true') {
            books = books.filter(book => book.isAvailable);
        }
        
        if (search) {
            const searchLower = search.toLowerCase();
            books = books.filter(book => 
                book.title.toLowerCase().includes(searchLower) ||
                book.author.toLowerCase().includes(searchLower)
            );
        }
        
        res.json({ books: books });
    } catch (error) {
        console.error('Error in GET /api/books:', error);
        res.status(500).json({ error: 'Error fetching books' });
    }
});

module.exports = router;
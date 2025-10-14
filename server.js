const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const bookRoutes = require('./routes/books');
const methodOverride = require('method-override');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static('public'));

// Routes
app.use('/books', bookRoutes);
app.use('/', bookRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { error: err.message });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', { error: 'Page not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`📚 Library app running on http://localhost:${PORT}`);
    console.log(`🎯 Lab 2: REST Library Management Application`);
});
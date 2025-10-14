// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    initializeDeleteButtons();
    initializeLendReturnButtons();
    initializeModals();
    initializeAjaxFiltering();
    initializeFormValidation();
}

// Delete Book Functionality
function initializeDeleteButtons() {
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', function() {
            const bookId = this.dataset.id;
            const bookTitle = this.dataset.title;
            showDeleteConfirmation(bookId, bookTitle);
        });
    });
}

function showDeleteConfirmation(bookId, bookTitle) {
    const modal = document.getElementById('deleteModal');
    const message = document.getElementById('deleteMessage');
    
    message.textContent = `Are you sure you want to delete "${bookTitle}"? This action cannot be undone.`;
    
    // Set up event listeners
    const confirmDelete = document.getElementById('confirmDelete');
    const cancelDelete = document.getElementById('cancelDelete');
    
    // Remove existing event listeners by cloning
    const newConfirm = confirmDelete.cloneNode(true);
    const newCancel = cancelDelete.cloneNode(true);
    
    confirmDelete.parentNode.replaceChild(newConfirm, confirmDelete);
    cancelDelete.parentNode.replaceChild(newCancel, cancelDelete);
    
    // Add new event listeners
    document.getElementById('confirmDelete').addEventListener('click', () => deleteBook(bookId));
    document.getElementById('cancelDelete').addEventListener('click', () => modal.close());
    
    modal.showModal();
}

async function deleteBook(bookId) {
    try {
        const response = await fetch(`/books/${bookId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(result.message, 'success');
            document.getElementById('deleteModal').close();
            
            // Remove book card from DOM
            const bookCard = document.querySelector(`.delete-btn[data-id="${bookId}"]`)?.closest('.book-card');
            if (bookCard) {
                bookCard.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => bookCard.remove(), 300);
            } else {
                // If we can't find the specific card, reload the page
                setTimeout(() => window.location.reload(), 1000);
            }
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error deleting book:', error);
        showNotification('Error deleting book: ' + error.message, 'error');
    }
}

// Lend/Return Book Functionality
function initializeLendReturnButtons() {
    // Lend buttons
    document.querySelectorAll('.lend-btn').forEach(button => {
        button.addEventListener('click', function() {
            const bookId = this.dataset.id;
            showLendModal(bookId);
        });
    });
    
    // Return buttons
    document.querySelectorAll('.return-btn').forEach(button => {
        button.addEventListener('click', function() {
            const bookId = this.dataset.id;
            returnBook(bookId);
        });
    });
}

function showLendModal(bookId) {
    const modal = document.getElementById('lendModal');
    const bookIdInput = document.getElementById('lendBookId');
    
    bookIdInput.value = bookId;
    
    // Set minimum date to today
    const dueDateInput = document.getElementById('dueDate');
    const today = new Date().toISOString().split('T')[0];
    dueDateInput.min = today;
    
    // Reset form
    document.getElementById('lendForm').reset();
    
    // Set up event listeners
    const cancelLend = document.getElementById('cancelLend');
    
    // Remove existing event listeners by cloning
    const newCancel = cancelLend.cloneNode(true);
    cancelLend.parentNode.replaceChild(newCancel, cancelLend);
    
    // Add new event listeners
    document.getElementById('cancelLend').addEventListener('click', () => modal.close());
    
    modal.showModal();
}

// Handle lend form submission
document.addEventListener('submit', function(event) {
    if (event.target.id === 'lendForm') {
        event.preventDefault();
        handleLendSubmit(event);
    }
});

async function handleLendSubmit(event) {
    const formData = new FormData(event.target);
    const bookId = formData.get('bookId');
    
    try {
        const response = await fetch(`/books/${bookId}/lend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                reader: formData.get('reader'),
                dueDate: formData.get('dueDate')
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Book lent successfully!', 'success');
            document.getElementById('lendModal').close();
            setTimeout(() => window.location.reload(), 1000);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error lending book:', error);
        showNotification('Error lending book: ' + error.message, 'error');
    }
}

async function returnBook(bookId) {
    if (!confirm('Are you sure you want to return this book?')) {
        return;
    }
    
    try {
        const response = await fetch(`/books/${bookId}/return`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Book returned successfully!', 'success');
            setTimeout(() => window.location.reload(), 1000);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error returning book:', error);
        showNotification('Error returning book: ' + error.message, 'error');
    }
}

// Modal Management
function initializeModals() {
    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.close();
            }
        });
    });
    
    // Escape key to close modals
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => modal.close());
        }
    });
}

// AJAX Filtering
function initializeAjaxFiltering() {
    const filterForm = document.getElementById('filter-form');
    if (!filterForm) return;
    
    let timeoutId;
    
    // Real-time search
    const searchInput = filterForm.querySelector('input[name="search"]');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                submitAjaxFilter();
            }, 500);
        });
    }
    
    // Checkbox changes
    filterForm.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', submitAjaxFilter);
    });
    
    // Prevent form submission
    filterForm.addEventListener('submit', function(event) {
        event.preventDefault();
        submitAjaxFilter();
    });
}

async function submitAjaxFilter() {
    const filterForm = document.getElementById('filter-form');
    const formData = new FormData(filterForm);
    const params = new URLSearchParams(formData);
    
    try {
        const response = await fetch(`/api/books?${params}`);
        const result = await response.json();
        
        if (result.books) {
            updateBooksDisplay(result.books);
            updateUrl(params);
        }
    } catch (error) {
        console.error('Error filtering books:', error);
    }
}

function updateBooksDisplay(books) {
    const booksGrid = document.querySelector('.books-grid');
    const countElement = document.querySelector('.count');
    
    if (countElement) {
        countElement.textContent = `(${books.length} books)`;
    }
    
    if (books.length === 0) {
        booksGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book-open"></i>
                <h3>No books found</h3>
                <p>Try adjusting your filters or add some books to get started.</p>
                <a href="/books/new" class="btn btn-primary">Add Your First Book</a>
            </div>
        `;
        return;
    }
    
    // Generate book cards dynamically
    const booksHTML = books.map(book => `
        <div class="book-card ${book.isAvailable ? 'available' : 'borrowed'}">
            <div class="book-header">
                <h3 class="book-title">${book.title}</h3>
                <div class="book-actions">
                    <a href="/books/${book.id}" class="btn btn-small">
                        <i class="fas fa-eye"></i> View
                    </a>
                    <a href="/books/${book.id}/edit" class="btn btn-small btn-secondary">
                        <i class="fas fa-edit"></i> Edit
                    </a>
                    <button class="btn btn-small btn-danger delete-btn" data-id="${book.id}" data-title="${book.title}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
            <div class="book-info">
                <p class="author"><i class="fas fa-user-edit"></i> ${book.author}</p>
                <p class="year"><i class="fas fa-calendar"></i> ${book.year}</p>
                ${book.isbn ? `<p class="isbn"><i class="fas fa-barcode"></i> ${book.isbn}</p>` : ''}
            </div>
            <div class="book-status">
                ${book.isAvailable ? 
                    `<div class="status available">
                        <i class="fas fa-check-circle"></i> Available
                    </div>
                    <button class="btn btn-small btn-success lend-btn" data-id="${book.id}">
                        <i class="fas fa-hand-holding"></i> Lend Book
                    </button>` :
                    `<div class="status borrowed">
                        <i class="fas fa-clock"></i> Borrowed
                    </div>
                    <div class="borrower-info">
                        <p><i class="fas fa-user"></i> ${book.reader}</p>
                        <p><i class="fas fa-calendar-alt"></i> Due: ${book.dueDate}</p>
                        <button class="btn btn-small btn-warning return-btn" data-id="${book.id}">
                            <i class="fas fa-undo"></i> Return Book
                        </button>
                    </div>`
                }
            </div>
        </div>
    `).join('');
    
    booksGrid.innerHTML = booksHTML;
    
    // Reinitialize event listeners for the new content
    initializeDeleteButtons();
    initializeLendReturnButtons();
}

function updateUrl(params) {
    const newUrl = `${window.location.pathname}?${params}`;
    window.history.replaceState({}, '', newUrl);
}

// Form Validation
function initializeFormValidation() {
    const forms = document.querySelectorAll('form[method="POST"]');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(event) {
            if (!validateForm(this)) {
                event.preventDefault();
            }
        });
    });
}

function validateForm(form) {
    let isValid = true;
    const requiredFields = form.querySelectorAll('[required]');
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            markFieldInvalid(field, 'This field is required');
            isValid = false;
        } else {
            markFieldValid(field);
        }
    });
    
    // Validate year field
    const yearField = form.querySelector('input[name="year"]');
    if (yearField && yearField.value) {
        const year = parseInt(yearField.value);
        const currentYear = new Date().getFullYear();
        
        if (year < 1000 || year > currentYear) {
            markFieldInvalid(yearField, `Please enter a valid year between 1000 and ${currentYear}`);
            isValid = false;
        }
    }
    
    return isValid;
}

function markFieldInvalid(field, message) {
    field.style.borderColor = '#e74c3c';
    
    // Remove existing error message
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
    
    // Add error message
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.style.color = '#e74c3c';
    errorElement.style.fontSize = '0.8rem';
    errorElement.style.marginTop = '0.25rem';
    errorElement.textContent = message;
    field.parentNode.appendChild(errorElement);
}

function markFieldValid(field) {
    field.style.borderColor = '#27ae60';
    
    // Remove error message
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
}

// Notification System
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--border-radius);
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
    `;
    
    notification.querySelector('.notification-content').style.cssText = `
        display: flex;
        align-items: center;
        gap: 0.5rem;
    `;
    
    notification.querySelector('.notification-close').style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        margin-left: auto;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    // Close button functionality
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
    
    document.body.appendChild(notification);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function getNotificationColor(type) {
    const colors = {
        success: '#27ae60',
        error: '#e74c3c',
        warning: '#f39c12',
        info: '#3498db'
    };
    return colors[type] || '#3498db';
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    
    .field-error {
        color: #e74c3c;
        font-size: 0.8rem;
        margin-top: 0.25rem;
    }
`;
document.head.appendChild(style);
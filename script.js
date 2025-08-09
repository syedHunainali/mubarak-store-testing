// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, doc, setDoc, getDocs, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- FIREBASE SETUP ---
const firebaseConfig = {
    apiKey: "AIzaSyCJnref7x3qqdtlFGtt-c6lZjUcmlfYK0I",
    authDomain: "herbal-pansar.firebaseapp.com",
    projectId: "herbal-pansar",
    storageBucket: "herbal-pansar.appspot.com",
    messagingSenderId: "983071124936",
    appId: "1:983071124936:web:48a7cdd989a0d94d77e4fd",
    measurementId: "G-CR0L1L84WP"
};

// Initialize Firebase and Services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- PERFORMANCE OPTIMIZATIONS ---
// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Document fragment for better DOM performance
function createDocumentFragment() {
    return document.createDocumentFragment();
}

// --- STATE MANAGEMENT ---
let allProducts = [];
let cart = [];
let lastViewedCategory = 'home';
let currentUser = null;
let desktopSlideIndex = 1;
let desktopSlideInterval;
let mobileSlideIndex = 0;
let lastScrollY = 0;
let tooltipShown = false; // Track if appointment tooltip has been shown

// --- CACHED DOM ELEMENTS ---
const elements = {
    pages: document.querySelectorAll('.page'),
    cartTotalHeaderEl: document.getElementById('cart-total-header'),
    cartItemCountBadgeEl: document.querySelector('.cart-item-count-badge'),
    cartViewContainerEl: document.getElementById('cart-view-container'),
    checkoutFormEl: document.getElementById('checkout-form-element'),
    productDetailContentEl: document.getElementById('product-detail-content'),
    searchInputEl: document.getElementById('search-input'),
    mobileSearchInputEl: document.getElementById('mobile-search-input'),
    authControlsEl: document.getElementById('auth-controls'),
    loginFormEl: document.getElementById('login-form'),
    signupFormEl: document.getElementById('signup-form'),
    ordersListEl: document.getElementById('orders-list'),
    appointmentsListEl: document.getElementById('appointments-list'),
    addProductFormEl: document.getElementById('add-product-form'),
    appointmentFormEl: document.getElementById('appointment-form'),
    modalEl: document.getElementById('custom-modal'),
    modalMessageEl: document.getElementById('modal-message'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    mainHeader: document.getElementById('main-header'),
    mobileSearchOverlay: document.getElementById('mobile-search-overlay'),
    mobileMenuOverlay: document.getElementById('mobile-menu-overlay'),
    mobileMenuSidebar: document.getElementById('mobile-menu-sidebar'),
    appointmentTooltip: document.getElementById('appointment-tooltip'),
    csvImportForm: document.getElementById('csv-import-form'),
    csvImportStatus: document.getElementById('csv-import-status')
};

// --- CSV IMPORT FUNCTIONALITY ---
// CSV Import Functions
async function handleCSVImport(file) {
    const statusEl = elements.csvImportStatus;
    statusEl.classList.remove('hidden');
    statusEl.className = 'csv-status info';
    statusEl.textContent = 'Processing CSV file...';

    try {
        const text = await readFileAsText(file);
        
        // Simple CSV parser (since Papa Parse might not be available)
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('CSV file must have at least a header row and one data row');
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const expectedHeaders = ['name', 'price', 'category', 'description', 'image'];
        
        // Validate headers
        for (let header of expectedHeaders) {
            if (!headers.includes(header)) {
                throw new Error(`Missing required column: ${header}`);
            }
        }

        const products = [];
        const errors = [];

        for (let i = 1; i < lines.length; i++) {
            try {
                const values = parseCSVLine(lines[i]);
                
                if (values.length !== headers.length) {
                    errors.push(`Row ${i + 1}: Column count mismatch`);
                    continue;
                }

                const product = {};
                headers.forEach((header, index) => {
                    product[header] = values[index].trim();
                });

                // Validate required fields
                if (!product.name || !product.price || !product.category || !product.description || !product.image) {
                    errors.push(`Row ${i + 1}: Missing required data`);
                    continue;
                }

                // Validate price
                const price = parseFloat(product.price);
                if (isNaN(price) || price <= 0) {
                    errors.push(`Row ${i + 1}: Invalid price: ${product.price}`);
                    continue;
                }

                // Validate category
                const validCategories = ['dry-fruits', 'herbal-tea', 'honey', 'seeds', 'supplements', 'capsules', 'cold-pressed-oil', 'essential-oils', 'deals'];
                if (!validCategories.includes(product.category)) {
                    errors.push(`Row ${i + 1}: Invalid category: ${product.category}`);
                    continue;
                }

                // Create product object
                const newProduct = {
                    id: String(Date.now() + Math.random()),
                    name: product.name,
                    price: price,
                    category: product.category,
                    description: product.description,
                    image: product.image.startsWith('images/') ? product.image : `images/${product.image}`
                };

                products.push(newProduct);
            } catch (error) {
                errors.push(`Row ${i + 1}: ${error.message}`);
            }
        }

        // Show preview
        showCSVPreview(products, errors);

        if (products.length === 0) {
            statusEl.className = 'csv-status error';
            statusEl.textContent = 'No valid products found in CSV file.';
            return;
        }

        // Import products to Firestore
        statusEl.className = 'csv-status info';
        statusEl.textContent = `Importing ${products.length} products...`;

        let importedCount = 0;
        let failedCount = 0;

        for (const product of products) {
            try {
                await setDoc(doc(db, "products", product.id), product);
                allProducts.push(product);
                importedCount++;
            } catch (error) {
                console.error(`Failed to import product ${product.name}:`, error);
                failedCount++;
            }
        }

        // Update UI
        renderAllGrids();
        renderAdminProductsList();

        // Show results
        statusEl.className = 'csv-status success';
        statusEl.innerHTML = `
            <strong>Import Complete!</strong><br>
            Successfully imported: ${importedCount} products<br>
            ${failedCount > 0 ? `Failed to import: ${failedCount} products<br>` : ''}
            ${errors.length > 0 ? `Validation errors: ${errors.length}` : ''}
        `;

        // Clear form
        elements.csvImportForm.reset();

    } catch (error) {
        console.error('CSV import error:', error);
        statusEl.className = 'csv-status error';
        statusEl.textContent = `Import failed: ${error.message}`;
    }
}

// Simple CSV line parser
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current);
    return result.map(field => field.replace(/^"(.*)"$/, '$1'));
}

// Show CSV preview
function showCSVPreview(products, errors) {
    const previewEl = document.getElementById('csv-preview');
    if (!previewEl) return;

    previewEl.classList.remove('hidden');
    
    let html = '<h4>Import Preview</h4>';
    
    if (products.length > 0) {
        html += `
            <table class="csv-preview-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Price</th>
                        <th>Category</th>
                        <th>Image</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        products.slice(0, 5).forEach(product => {
            html += `
                <tr>
                    <td>${product.name}</td>
                    <td>Rs.${product.price}</td>
                    <td>${product.category}</td>
                    <td>${product.image}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        
        if (products.length > 5) {
            html += `<p><em>Showing first 5 of ${products.length} products...</em></p>`;
        }
    }
    
    if (errors.length > 0) {
        html += `
            <div style="margin-top: 15px; padding: 10px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px;">
                <strong>Validation Errors:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    ${errors.slice(0, 10).map(error => `<li>${error}</li>`).join('')}
                </ul>
                ${errors.length > 10 ? `<p><em>Showing first 10 of ${errors.length} errors...</em></p>` : ''}
            </div>
        `;
    }
    
    previewEl.innerHTML = html;
}

// Read file as text
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}
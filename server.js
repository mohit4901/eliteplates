const express = require('express');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const { stringify } = require('csv-stringify');

const app = express();
const PORT = process.env.PORT || 3100;

// Middleware to parse JSON request bodies
app.use(express.json());

// Path to your CSV data file
const CSV_FILE_PATH = path.join(__dirname, 'data', 'products.csv');

// --- Hardcoded Admin Credentials (for demonstration only) ---
const ADMIN_USERNAME = 'bajaj_elites';
const ADMIN_PASSWORD = 'bajaj0987';
const ADMIN_AUTH_TOKEN = 'supersecretadmintoken123'; // Simple token for demo

// --- Ensure data directory and CSV file exist ---
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
    console.log(`Backend: Created data directory at ${dataDir}`);
}

// Create a dummy CSV if it doesn't exist, with headers
if (!fs.existsSync(CSV_FILE_PATH)) {
    const defaultHeaders = ['Number', 'Description', 'Cost', 'Availability', 'ImageURL'];
    const defaultData = [
        ['HR01AB1234', 'Premium VIP number for cars', '₹50000', 'In Stock', 'https://placehold.co/300x200/ff0000/ffffff?text=HR1234'],
        ['DL0CBA5678', 'Fancy bike number, unique series', '₹25000', 'In Stock', 'https://placehold.co/300x200/00ff00/000000?text=DL5678'],
        ['CH01XYZ9999', 'Exclusive Chandigarh series', '₹75000', 'Sold Out', 'https://placehold.co/300x200/0000ff/ffffff?text=CH9999']
    ];

    stringify(defaultData, { header: true, columns: defaultHeaders }, (err, output) => {
        if (err) {
            console.error('Backend: Error creating default CSV:', err);
        } else {
            fs.writeFileSync(CSV_FILE_PATH, output);
            console.log(`Backend: Created default products.csv at ${CSV_FILE_PATH}`);
        }
    });
}


// --- Serve Static Files ---
app.use(express.static(path.join(__dirname, 'public')));
console.log(`Backend: Serving static files from: ${path.join(__dirname, 'public')}`);

// --- API Endpoint: Admin Login ---
console.log('Backend: Registering /api/login route...'); 
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        console.log(`Backend: Admin login successful for user: ${username}`);
        res.json({ success: true, token: ADMIN_AUTH_TOKEN });
    } else {
        console.warn(`Backend: Failed login attempt for user: ${username}`);
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// --- Middleware to Protect Admin Endpoints ---
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Expects "Bearer YOUR_TOKEN"

    if (token === ADMIN_AUTH_TOKEN) {
        next(); // Token is valid, proceed to the next middleware/route handler
    } else {
        console.warn('Backend: Unauthorized access attempt to protected endpoint (invalid/missing token).');
        res.status(403).json({ message: 'Forbidden: Invalid or missing authentication token' });
    }
}


// --- API Endpoint: Get Product Data from CSV (Public Access) ---
// DIAGNOSTIC LOG: Check if this line appears in your terminal when server starts
console.log('Backend: Registering /api/products route...'); 
app.get('/api/products', (req, res) => {
    const products = [];
    fs.createReadStream(CSV_FILE_PATH)
        .pipe(csv())
        .on('data', (data) => {
            const product = {};
            for (const key in data) {
                if (Object.hasOwnProperty.call(data, key)) {
                    product[key.toLowerCase().replace(/\s/g, '')] = data[key];
                }
            }
            products.push(product);
        })
        .on('end', () => {
            console.log('Backend: Successfully fetched products from CSV.');
            res.json(products);
        })
        .on('error', (error) => {
            console.error('Backend: Error reading CSV file:', error);
            res.status(500).json({ error: 'Failed to read product data from CSV.' });
        });
});

// --- API Endpoint: Update Product Data in CSV (PROTECTED) ---
app.put('/api/products/update', authenticateToken, (req, res) => { // Use authenticateToken middleware
    const { rowIndex, updatedFields } = req.body;

    if (rowIndex === undefined || typeof updatedFields !== 'object' || Object.keys(updatedFields).length === 0) {
        return res.status(400).json({ error: 'Missing required parameters: rowIndex and updatedFields object.' });
    }

    const allRows = [];
    fs.createReadStream(CSV_FILE_PATH)
        .pipe(csv())
        .on('data', (row) => allRows.push(row))
        .on('end', () => {
            const targetRowIndexInArray = rowIndex; 

            if (targetRowIndexInArray < 0 || targetRowIndexInArray >= allRows.length) {
                return res.status(404).json({ error: 'Row index out of bounds.' });
            }

            const rowToUpdate = allRows[targetRowIndexInArray];

            for (const fieldName in updatedFields) {
                if (Object.hasOwnProperty.call(updatedFields, fieldName)) {
                    const originalHeaderKey = Object.keys(rowToUpdate).find(key => 
                        key.toLowerCase().replace(/\s/g, '') === fieldName.toLowerCase().replace(/\s/g, '')
                    );
                    if (originalHeaderKey) {
                        rowToUpdate[originalHeaderKey] = updatedFields[fieldName];
                    } else {
                        console.warn(`Backend: Field '${fieldName}' not found in CSV row headers.`);
                    }
                }
            }

            const headers = Object.keys(allRows[0]); // Get headers from the first row (assuming consistent headers)

            stringify(allRows, { header: true, columns: headers }, (err, output) => {
                if (err) {
                    console.error('Backend: Error writing CSV file:', err);
                    return res.status(500).json({ error: 'Failed to write updated data to CSV.' });
                }
                fs.writeFile(CSV_FILE_PATH, output, (writeErr) => {
                    if (writeErr) {
                        console.error('Backend: Error saving CSV file:', writeErr);
                        return res.status(500).json({ error: 'Failed to save updated CSV file.' });
                    }
                    console.log(`Backend: Product at row ${rowIndex} updated successfully in CSV.`);
                    res.json({ message: 'Product data updated successfully!' });
                });
            });
        })
        .on('error', (error) => {
            console.error('Backend: Error reading CSV for update:', error);
            res.status(500).json({ error: 'Failed to read CSV for update operation.' });
        });
});

// --- API Endpoint: Add New Product to CSV (PROTECTED) ---
app.post('/api/products/add', authenticateToken, (req, res) => { // Use authenticateToken middleware
    const newProduct = req.body; // Expects an object like { number: '...', description: '...', ... }

    if (!newProduct || Object.keys(newProduct).length === 0) {
        return res.status(400).json({ error: 'Missing new product data.' });
    }

    const allRows = [];
    fs.createReadStream(CSV_FILE_PATH)
        .pipe(csv())
        .on('data', (row) => allRows.push(row))
        .on('end', () => {
            if (allRows.length === 0) {
                // If CSV is empty, define headers based on new product keys
                // This assumes newProduct contains all expected headers
                const headers = Object.keys(newProduct).map(key => {
                    // Convert back to original header format if needed, e.g., 'imageurl' -> 'ImageURL'
                    if (key === 'imageurl') return 'ImageURL';
                    return key.charAt(0).toUpperCase() + key.slice(1); // Capitalize first letter
                });
                allRows.push(Object.fromEntries(headers.map(h => [h, '']))); // Add empty header row to allRows
            }

            // Ensure the new product matches the existing headers order
            const headers = Object.keys(allRows[0]); // Get headers from the first data row (or actual header row if processed)
            const newRow = {};
            headers.forEach(header => {
                const sanitizedKey = header.toLowerCase().replace(/\s/g, '');
                newRow[header] = newProduct[sanitizedKey] || ''; // Map new product data to original header keys
            });
            
            allRows.push(newRow); // Add the new product row

            stringify(allRows, { header: true, columns: headers }, (err, output) => {
                if (err) {
                    console.error('Backend: Error writing CSV file after adding product:', err);
                    return res.status(500).json({ error: 'Failed to write new product data to CSV.' });
                }
                fs.writeFile(CSV_FILE_PATH, output, (writeErr) => {
                    if (writeErr) {
                        console.error('Backend: Error saving CSV file after adding product:', writeErr);
                        return res.status(500).json({ error: 'Failed to save new product to CSV file.' });
                    }
                    console.log(`Backend: New product added successfully to CSV:`, newProduct);
                    res.json({ message: 'Product added successfully!', newProduct: newProduct });
                });
            });
        })
        .on('error', (error) => {
            console.error('Backend: Error reading CSV for add operation:', error);
            res.status(500).json({ error: 'Failed to read CSV for add operation.' });
        });
});


// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('----------------------------------------------------');
    console.log(`Admin Login: Username: ${ADMIN_USERNAME}, Password: ${ADMIN_PASSWORD}`);
    console.log('CSV data file expected at: ' + CSV_FILE_PATH);
    console.log('----------------------------------------------------');
});
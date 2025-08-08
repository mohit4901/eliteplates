document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginMessage = document.getElementById('login-message');
    const adminProductsContainer = document.getElementById('admin-product-list');
    const logoutButton = document.getElementById('logout-btn');

    const addProductBtn = document.getElementById('add-product-btn');
    const newProductFormContainer = document.getElementById('new-product-form-container');
    const newProductForm = document.getElementById('new-product-form');
    const cancelNewProductBtn = document.getElementById('cancel-new-product');
    const newProductMessage = document.getElementById('new-product-message');


    const ADMIN_TOKEN_KEY = 'adminAuthToken'; // Key for storing token in localStorage

    // --- Login Page Logic ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = loginForm.username.value;
            const password = loginForm.password.value;

            loginMessage.style.display = 'none'; // Hide previous messages
            loginMessage.textContent = ''; // Clear previous message text

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                if (!response.ok) { 
                    let errorData = { message: 'Login failed due to server error.' };
                    try {
                        errorData = await response.json(); 
                    } catch (jsonError) {
                        const rawResponseText = await response.text(); // Get raw text if not JSON
                        console.error('Frontend: Failed to parse error response as JSON:', jsonError, 'Raw response:', rawResponseText);
                        errorData.message = `Server responded with status ${response.status} ${response.statusText}. Response was not JSON. Raw: "${rawResponseText.substring(0, 100)}..."`;
                    }
                    loginMessage.textContent = errorData.message || `Login failed with status: ${response.status}`;
                    loginMessage.style.display = 'block';
                    console.error('Frontend: Login failed:', response.status, errorData);
                    return; 
                }

                const data = await response.json(); 

                if (data.success) {
                    localStorage.setItem(ADMIN_TOKEN_KEY, data.token); 
                    window.location.href = 'admin_panel.html'; 
                } else {
                    loginMessage.textContent = data.message || 'Login failed. Invalid credentials.';
                    loginMessage.style.display = 'block';
                    console.warn('Frontend: Login unsuccessful:', data.message);
                }
            } catch (error) {
                console.error('Frontend: Network or unexpected login error:', error);
                loginMessage.textContent = 'A network error occurred or the server is unreachable. Please ensure the backend is running.';
                loginMessage.style.display = 'block';
            }
        });
    }

    // --- Admin Panel Logic ---
    if (adminProductsContainer) {
        const token = localStorage.getItem(ADMIN_TOKEN_KEY);
        if (!token) {
            window.location.href = 'admin_login.html';
            return;
        }

        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                localStorage.removeItem(ADMIN_TOKEN_KEY); 
                window.location.href = 'admin_login.html'; 
            });
        }

        if (addProductBtn) {
            addProductBtn.addEventListener('click', () => {
                newProductFormContainer.style.display = 'block'; 
                newProductForm.reset(); 
                newProductMessage.style.display = 'none'; 
                adminProductsContainer.style.display = 'none'; 
            });
        }

        if (cancelNewProductBtn) {
            cancelNewProductBtn.addEventListener('click', () => {
                newProductFormContainer.style.display = 'none'; 
                adminProductsContainer.style.display = 'block'; 
            });
        }

        if (newProductForm) {
            newProductForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                newProductMessage.style.display = 'none';
                newProductMessage.textContent = '';

                const newProductData = {
                    number: newProductForm['new-number'].value,
                    description: newProductForm['new-description'].value,
                    cost: newProductForm['new-cost'].value,
                    availability: newProductForm['new-availability'].value,
                    imageurl: newProductForm['new-imageurl'].value
                };

                try {
                    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
                    const response = await fetch('/api/products/add', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(newProductData)
                    });

                    if (!response.ok) {
                        if (response.status === 403) {
                            alert('Session expired or unauthorized. Please log in again.');
                            localStorage.removeItem(ADMIN_TOKEN_KEY);
                            window.location.href = 'admin_login.html';
                            return;
                        }
                        let errorData = { error: 'Failed to add new product due to server error.' };
                        try {
                            errorData = await response.json();
                        } catch (jsonError) {
                             const rawResponseText = await response.text();
                             console.error('Frontend: Failed to parse error response as JSON:', jsonError, 'Raw response:', rawResponseText);
                             errorData.error = `Server responded with status ${response.status} ${response.statusText}. Response was not JSON. Raw: "${rawResponseText.substring(0, 100)}..."`;
                        }
                        throw new Error(errorData.error);
                    }

                    const data = await response.json();
                    newProductMessage.textContent = data.message || 'Product added successfully!';
                    newProductMessage.classList.remove('error');
                    newProductMessage.classList.add('success');
                    newProductMessage.style.display = 'block';
                    newProductForm.reset(); 

                    setTimeout(() => {
                        newProductFormContainer.style.display = 'none';
                        adminProductsContainer.style.display = 'block';
                        fetchProductsForAdmin(); 
                    }, 1500); 

                } catch (error) {
                    console.error('Admin Frontend: Error adding new product:', error);
                    newProductMessage.textContent = `Error: ${error.message}`;
                    newProductMessage.classList.remove('success');
                    newProductMessage.classList.add('error');
                    newProductMessage.style.display = 'block';
                }
            });
        }

        fetchProductsForAdmin();
    }

    async function fetchProductsForAdmin() {
        try {
            if (adminProductsContainer) {
                adminProductsContainer.style.display = 'block'; 
                adminProductsContainer.innerHTML = '<p class="admin-message">Loading products for editing...</p>';
            }
            
            const token = localStorage.getItem(ADMIN_TOKEN_KEY); 

            const response = await fetch('/api/products', {
                headers: {
                    'Authorization': `Bearer ${token}` 
                }
            });

            if (!response.ok) {
                if (response.status === 403) { 
                    alert('Session expired or unauthorized. Please log in again.');
                    localStorage.removeItem(ADMIN_TOKEN_KEY);
                    window.location.href = 'admin_login.html';
                    return;
                }
                let errorData = { message: 'Failed to fetch products due to server error.' };
                try {
                    errorData = await response.json();
                } catch (jsonError) {
                    const rawResponseText = await response.text(); // Get raw text if not JSON
                    console.error('Frontend: Failed to parse error response as JSON:', jsonError, 'Raw response:', rawResponseText);
                    errorData.message = `Server responded with status ${response.status} ${response.statusText}. Response was not JSON. Raw: "${rawResponseText.substring(0, 100)}..."`;
                }
                throw new Error(errorData.message);
            }
            const products = await response.json();
            displayEditableProducts(products); 
        } catch (error) {
            console.error('Admin Frontend: Error fetching products:', error);
            if (adminProductsContainer) {
                adminProductsContainer.innerHTML = `<p class="admin-message error">Failed to load products for editing. Error: ${error.message}</p>`;
            }
        }
    }

    function displayEditableProducts(products) {
        adminProductsContainer.innerHTML = ''; 

        if (!products || products.length === 0) {
            adminProductsContainer.innerHTML = '<p class="admin-message">No products found. Add new ones!</p>';
            return;
        }

        const table = document.createElement('table');
        table.classList.add('products-table'); 
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Number</th>
                    <th>Description</th>
                    <th>Cost</th>
                    <th>Availability</th>
                    <th>Image URL</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;
        const tbody = table.querySelector('tbody');

        products.forEach((product, index) => {
            const row = document.createElement('tr');
            row.setAttribute('data-row-index', index); 

            row.innerHTML = `
                <td data-label="Number:">
                    <span id="number-display-${index}">${product.number || ''}</span>
                    <input type="text" id="number-input-${index}" value="${product.number || ''}">
                </td>
                <td data-label="Description:">
                    <span id="description-display-${index}">${product.description || ''}</span>
                    <input type="text" id="description-input-${index}" value="${product.description || ''}">
                </td>
                <td data-label="Cost:">
                    <span id="cost-display-${index}">${product.cost || ''}</span>
                    <input type="text" id="cost-input-${index}" value="${product.cost || ''}">
                </td>
                <td data-label="Availability:">
                    <span id="availability-display-${index}">${product.availability || ''}</span>
                    <input type="text" id="availability-input-${index}" value="${product.availability || ''}">
                </td>
                 <td data-label="Image URL:">
                    <span id="imageurl-display-${index}">${product.imageurl || ''}</span>
                    <input type="text" id="imageurl-input-${index}" value="${product.imageurl || ''}">
                </td>
                <td>
                    <button class="edit-btn" data-row-index="${index}">Edit</button>
                    <button class="save-btn" data-row-index="${index}" style="display:none;">Save</button>
                    <button class="cancel-btn" data-row-index="${index}" style="display:none;">Cancel</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        adminProductsContainer.appendChild(table);
        console.log('Admin Frontend: Products rendered as editable table.');

        attachEventListenersAdmin();
    }

    function attachEventListenersAdmin() {
        adminProductsContainer.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', (event) => toggleEditModeAdmin(event.target.dataset.rowIndex, true));
        });

        adminProductsContainer.querySelectorAll('.save-btn').forEach(button => {
            button.addEventListener('click', (event) => handleProductUpdateAdmin(event.target.dataset.rowIndex));
        });

        adminProductsContainer.querySelectorAll('.cancel-btn').forEach(button => {
            button.addEventListener('click', (event) => toggleEditModeAdmin(event.target.dataset.rowIndex, false));
        });
    }

    function toggleEditModeAdmin(rowIndex, enable) {
        const row = adminProductsContainer.querySelector(`tr[data-row-index="${rowIndex}"]`);
        if (!row) return;

        const displayElements = row.querySelectorAll(`span[id$="-display-${rowIndex}"]`);
        const inputElements = row.querySelectorAll(`input[id$="-input-${rowIndex}"]`);
        
        const editButton = row.querySelector('.edit-btn');
        const saveButton = row.querySelector('.save-btn');
        const cancelButton = row.querySelector('.cancel-btn');

        displayElements.forEach(span => span.style.display = enable ? 'none' : 'inline');
        inputElements.forEach(input => input.style.display = enable ? 'inline-block' : 'none'); 

        editButton.style.display = enable ? 'none' : 'inline-block';
        saveButton.style.display = enable ? 'inline-block' : 'none';
        cancelButton.style.display = enable ? 'inline-block' : 'none';

        if (!enable) {
            inputElements.forEach(input => {
                const originalDisplayId = input.id.replace('-input-', '-display-');
                const originalDisplay = document.getElementById(originalDisplayId);
                if (originalDisplay) {
                    input.value = originalDisplay.textContent;
                }
            });
        }
    }

    async function handleProductUpdateAdmin(rowIndex) {
        const updatedFields = {
            number: document.getElementById(`number-input-${rowIndex}`).value,
            description: document.getElementById(`description-input-${rowIndex}`).value,
            cost: document.getElementById(`cost-input-${rowIndex}`).value,
            availability: document.getElementById(`availability-input-${rowIndex}`).value,
            imageurl: document.getElementById(`imageurl-input-${rowIndex}`).value
        };

        try {
            console.log(`Admin Frontend: Sending update for row ${rowIndex}:`, updatedFields);
            const token = localStorage.getItem(ADMIN_TOKEN_KEY);

            const response = await fetch('/api/products/update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({
                    rowIndex: parseInt(rowIndex), 
                    updatedFields: updatedFields,
                }),
            });

            if (!response.ok) {
                if (response.status === 403) { 
                    alert('Session expired or unauthorized. Please log in again.');
                    localStorage.removeItem(ADMIN_TOKEN_KEY);
                    window.location.href = 'admin_login.html';
                    return;
                }
                let errorData = { error: `Failed to update product at row ${rowIndex} due to server error.` };
                try {
                    errorData = await response.json();
                } catch (jsonError) {
                    const rawResponseText = await response.text();
                    console.error('Frontend: Failed to parse error response as JSON:', jsonError, 'Raw response:', rawResponseText);
                    errorData.error = `Server responded with status ${response.status} ${response.statusText}. Response was not JSON. Raw: "${rawResponseText.substring(0, 100)}..."`;
                }
                throw new Error(errorData.error);
            }
            console.log(`Admin Frontend: Successfully updated product at row ${rowIndex}. Response:`, await response.json());

            alert('Product updated successfully!');
            fetchProductsForAdmin(); 

        } catch (error) {
            console.error('Admin Frontend: Error updating product:', error);
            alert(`Failed to update product: ${error.message}`);
        } finally {
            toggleEditModeAdmin(rowIndex, false);
        }
    }
});
document.addEventListener('DOMContentLoaded', () => {
    // productsContainer is the div where the product grid will be injected
    const productsContainer = document.getElementById('product-list'); 
    // IMPORTANT: REPLACE WITH YOUR WHATSAPP NUMBER (e.g., 919876543210)
    const whatsappNumber = 'YOUR_WHATSAPP_NUMBER_HERE'; 

    // Function to fetch products from the backend API
    async function fetchProducts() {
        try {
            productsContainer.innerHTML = '<p class="loading-message">Loading premium numbers...</p>'; // Show loading message
            console.log('Frontend: Attempting to fetch products from /api/products');
            const response = await fetch('/api/products');
            
            if (!response.ok) {
                const errorText = await response.text(); 
                console.error(`Frontend: HTTP error! Status: ${response.status}, Response: ${errorText}`);
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }
            
            const products = await response.json();
            console.log('Frontend: Successfully fetched products:', products);
            return products;
        } catch (error) {
            console.error('Frontend: Error fetching products:', error);
            productsContainer.innerHTML = `<p class="error-message">Failed to load products. Please try again later. Error: ${error.message}</p>`;
            return [];
        }
    }

    // Function to render products as a static grid of cards (no editing, no images)
    async function displayProducts(products) {
        if (!productsContainer) {
            console.error("Element with ID 'product-list' not found. Cannot display products.");
            return;
        }

        productsContainer.innerHTML = ''; // Clear previous content or loading message

        if (!products || products.length === 0) {
            productsContainer.innerHTML = '<p class="no-products-message">No vehicle numbers available at the moment. Please check back later!</p>';
            console.log('Frontend: No products received or products array is empty.');
            return;
        }

        // Create product cards and append them to the container
        products.forEach((product, index) => {
            const productCard = document.createElement('div');
            // Add classes for styling and animation
            productCard.classList.add('product-card', 'card-hover-effect', 'animate-on-scroll', 'fade-in-up');
            // Add animation delay for staggered effect
            productCard.style.animationDelay = `${index * 0.1}s`; 
            
            // Note: The 'product' object keys (e.g., product.number, product.description)
            // should match the sanitized headers returned by your server.js (e.g., 'number', 'description', 'cost', 'availability', 'imageurl')
            // Removed <img> tag
            productCard.innerHTML = `
                <div class="product-header">
                    <h3 class="product-number">${product.number || 'N/A'}</h3>
                    <p class="product-cost"><i class="fas fa-tag"></i> ${product.cost || 'Price: N/A'}</p>
                </div>
                <div class="product-details">
                    <p class="product-description">${product.description || 'No description available.'}</p>
                    <p class="product-availability">
                        <strong>Status:</strong> 
                        <span class="${product.availability && product.availability.toLowerCase() === 'in stock' ? 'status-instock' : 'status-soldout'}">
                            <i class="${product.availability && product.availability.toLowerCase() === 'in stock' ? 'fas fa-check-circle' : 'fas fa-times-circle'}"></i> 
                            ${product.availability || 'N/A'}
                        </span>
                    </p>
                    <a href="https://wa.me/${whatsappNumber}?text=Hello%20Bajaj%20Elite%20Plates,%20I'm%20interested%20in%20the%20number%20${encodeURIComponent(product.number || 'N/A')}" 
                       target="_blank" class="btn btn-whatsapp product-whatsapp-btn">
                        <i class="fab fa-whatsapp"></i> Enquire Now
                    </a>
                </div>
            `;
            productsContainer.appendChild(productCard);
            observer.observe(productCard);
        });

        console.log('Frontend: Products rendered as static grid cards (without images).');
    }

    // --- Initial page load and setup ---
    fetchProducts().then(displayProducts);

    // --- Smooth scrolling for navigation links ---
    document.querySelectorAll('a.nav-link, .hero-btn, .btn-header').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId && targetId.startsWith('#')) { 
                e.preventDefault(); 
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth' 
                    });
                }
            }
        });
    });

    // --- Intersection Observer for Scroll Animations ---
    const observerOptions = {
        root: null, 
        rootMargin: '0px',
        threshold: 0.1 
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target); 
            }
        });
    }, observerOptions);

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });

    // --- Review carousel functionality ---
    const reviewsCarousel = document.querySelector('.reviews-carousel');
    if (reviewsCarousel) {
        let currentScrollPosition = 0;
        const scrollSpeed = 1; 

        function animateScroll() {
            const singleSetWidth = reviewsCarousel.scrollWidth / 2; 

            currentScrollPosition += scrollSpeed;
            if (currentScrollPosition >= singleSetWidth) {
                currentScrollPosition = 0;
            }
            reviewsCarousel.style.transform = `translateX(-${currentScrollPosition}px)`;
            requestAnimationFrame(animateScroll); 
        }

        requestAnimationFrame(animateScroll);
    }
});

function copyMessage() {
    console.log("Attempting to open WhatsApp link. (No text copied to clipboard in this version)");
}
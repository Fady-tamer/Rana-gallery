// --- 1. FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyA69HCP3GyJ9Vk3uC8BmFeLWruiewFgyEM",
    authDomain: "artist-portfolio-rana-gallery.firebaseapp.com",
    projectId: "artist-portfolio-rana-gallery",
    storageBucket: "artist-portfolio-rana-gallery.firebasestorage.app",
    messagingSenderId: "954030266440",
    appId: "1:954030266440:web:4aaca0bd210b804f80607d"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const collectionName = "cards";

// --- 2. LOGIC: Add Card Page ---
const addForm = document.querySelector('.add-card-form');

if (addForm) {
    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = addForm.querySelector('button');
        submitBtn.disabled = true;
        submitBtn.innerText = "Uploading...";

        const fileInput = document.getElementById('card-img');
        const rawTitle = document.getElementById('card-header').value;
        const file = fileInput.files[0];

        // VALIDATION
        if (!file) {
            alert("Please select an image!");
            submitBtn.disabled = false; submitBtn.innerText = "Add Card";
            return;
        }
        // Firestore Documents have a 1MB limit. We limit images to 700KB to be safe.
        if (file.size > 700 * 1024) {
            alert("Image too large! For this free database, please use images under 700KB.");
            submitBtn.disabled = false; submitBtn.innerText = "Add Card";
            return;
        }

        const formattedTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1).toLowerCase();

        // Convert Image to Base64
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = async function(event) {
            const imgDataUrl = event.target.result;

            const newCard = {
                createdAt: Date.now(), // Use this to sort by newest
                img: imgDataUrl,
                title: formattedTitle,
                tags: document.getElementById('card-tags').value.split('-').map(t => t.trim()).filter(t => t),
                desc: document.getElementById('card-description').value,
                category: document.getElementById('category').value
            };

            try {
                // SAVE TO CLOUD (Async operation)
                await db.collection(collectionName).add(newCard);
                
                alert('Card Published to Cloud Successfully!');
                window.location.href = 'index.html';
            } catch (error) {
                console.error("Error adding document: ", error);
                alert("Error saving to cloud: " + error.message);
                submitBtn.disabled = false;
                submitBtn.innerText = "Add Card";
            }
        };
    });
}

// --- 3. LOGIC: Index Page (Load from Cloud) ---
const gridMap = {
    "Post": document.querySelector('.card-grid'),
    "Artist'sStory": document.querySelector('.ArtistsStory-grid'),
    "ArtStory": document.querySelector('.ArtStory-grid'),
    "Country'sStory": document.querySelector('.CountrysStory-grid'),
    "ColorsPallets": document.querySelector('.ColorsPallets-grid')
};

// Setup Search & Filter
const searchInput = document.querySelector('.search-bar input');
const filterSelect = document.querySelector('.filter-bar select');
let allCardsCache = []; // Store cards here so we don't re-download them for every search

if (gridMap["Post"]) {
    loadCards(); // Start the download

    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (filterSelect) filterSelect.addEventListener('change', applyFilters);
}

// Async Function to Download Cards
async function loadCards() {
    try {
        // Show loading state (optional)
        // gridMap["Post"].innerHTML = '<p>Loading art from cloud...</p>';

        const snapshot = await db.collection(collectionName).orderBy('createdAt', 'desc').get();
        
        allCardsCache = snapshot.docs.map(doc => ({
            id: doc.id, // Firestore generates a unique ID string
            ...doc.data()
        }));

        populateTagDropdown(allCardsCache);
        renderGrids(allCardsCache);

    } catch (error) {
        console.error("Error getting documents: ", error);
        gridMap["Post"].innerHTML = '<p>Error loading cards. Check console.</p>';
    }
}

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedTag = filterSelect.value;

    const filteredCards = allCardsCache.filter(card => {
        const matchesSearch = card.title.toLowerCase().includes(searchTerm) || 
                              (card.tags && card.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
        const matchesTag = selectedTag === 'All' || (card.tags && card.tags.includes(selectedTag));
        return matchesSearch && matchesTag;
    });

    renderGrids(filteredCards);
}

function renderGrids(cardsToRender) {
    // Clear grids
    Object.values(gridMap).forEach(grid => { if(grid) grid.innerHTML = ''; });

    if (cardsToRender.length === 0) {
        if(gridMap["Post"]) gridMap["Post"].innerHTML = '<p>No matching cards found.</p>';
        return;
    }

    cardsToRender.forEach(card => {
        const tagHTML = card.tags ? card.tags.map(tag => `<p>${tag}</p>`).join('') : '';
        
        const cardHTML = `
        <div class="card">
            <div class="card-image"><img src="${card.img}" alt="${card.title}"></div>
            <div class="card-meta">
                <span class="card-header">${card.title}</span>
                <div class="card-tags">${tagHTML}</div>
                <p class="card-description">${card.desc}</p>
                <div class="card-actions">
                    <i class="fa-regular fa-bookmark"></i>
                    <div class="stars">
                        <i class="fa-solid fa-star"></i>
                        <i class="fa-solid fa-star"></i>
                        <i class="fa-solid fa-star"></i>
                        <i class="fa-solid fa-star"></i>
                    </div>
                </div>
            </div>
        </div>`;
        
        const targetGrid = gridMap[card.category];
        if (targetGrid) targetGrid.innerHTML += cardHTML;
        else if (gridMap["Post"]) gridMap["Post"].innerHTML += cardHTML;
    });
}

function populateTagDropdown(cards) {
    if (!filterSelect) return;
    const allTags = cards.flatMap(card => card.tags || []);
    const uniqueTags = [...new Set(allTags)];
    filterSelect.innerHTML = '<option value="All">All Tags</option>';
    uniqueTags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag; option.textContent = tag;
        filterSelect.appendChild(option);
    });
}


// --- 4. LOGIC: Dashboard (Admin) ---
const dashboardBody = document.getElementById('dashboard-body');

if (dashboardBody) {
    loadDashboard();
}

async function loadDashboard() {
    dashboardBody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
    
    try {
        const snapshot = await db.collection(collectionName).orderBy('createdAt', 'desc').get();
        const cards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        dashboardBody.innerHTML = ''; 
        if (cards.length === 0) {
            dashboardBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No cards found in cloud.</td></tr>';
            return;
        }

        cards.forEach(card => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${card.img}" alt="img"></td>
                <td>${card.title}</td>
                <td>${card.category}</td>
                <td>
                    <button class="delete-btn" onclick="deleteCard('${card.id}')">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </td>
            `;
            dashboardBody.appendChild(row);
        });
    } catch (e) {
        console.error(e);
        dashboardBody.innerHTML = '<tr><td colspan="4">Error loading data.</td></tr>';
    }
}

// Global delete function
window.deleteCard = async function(docId) {
    if(confirm("Are you sure you want to delete this from the Cloud? This cannot be undone.")) {
        try {
            await db.collection(collectionName).doc(docId).delete();
            alert("Deleted!");
            loadDashboard(); // Reload table
        } catch (error) {
            alert("Error deleting: " + error.message);
        }
    }
};
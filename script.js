// --- 1. FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyA69HCP3GyJ9Vk3uC8BmFeLWruiewFgyEM",
    authDomain: "artist-portfolio-rana-gallery.firebaseapp.com",
    projectId: "artist-portfolio-rana-gallery",
    storageBucket: "artist-portfolio-rana-gallery.firebasestorage.app",
    messagingSenderId: "954030266440",
    appId: "1:954030266440:web:4aaca0bd210b804f80607d"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
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

        if (!file) {
            alert("Please select an image!");
            submitBtn.disabled = false; submitBtn.innerText = "Add Card";
            return;
        }
        if (file.size > 700 * 1024) { 
            alert("Image too large! Please use images under 700KB.");
            submitBtn.disabled = false; submitBtn.innerText = "Add Card";
            return;
        }

        const formattedTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1).toLowerCase();

        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = async function(event) {
            const imgDataUrl = event.target.result;

            const newCard = {
                createdAt: Date.now(), 
                img: imgDataUrl,
                title: formattedTitle,
                tags: document.getElementById('card-tags').value.split('-').map(t => t.trim()).filter(t => t),
                desc: document.getElementById('card-description').value,
                category: document.getElementById('category').value,
                // NEW: Initialize generic stats for average math
                ratingSum: 0,
                ratingCount: 0
            };

            try {
                await db.collection(collectionName).add(newCard);
                alert('Card Published Successfully!');
                window.location.href = 'index.html';
            } catch (error) {
                console.error("Error adding document: ", error);
                alert("Error saving: " + error.message);
                submitBtn.disabled = false;
                submitBtn.innerText = "Add Card";
            }
        };
    });
}

// --- 3. LOGIC: Index Page ---
const gridMap = {
    "Post": document.querySelector('.card-grid'),
    "Artist'sStory": document.querySelector('.ArtistsStory-grid'),
    "ArtStory": document.querySelector('.ArtStory-grid'),
    "Country'sStory": document.querySelector('.CountrysStory-grid'),
    "ColorsPallets": document.querySelector('.ColorsPallets-grid')
};

const searchInput = document.querySelector('.search-bar input');
const filterSelect = document.querySelector('.filter-bar select');
let allCardsCache = []; 

if (gridMap["Post"]) {
    loadCards(); 

    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (filterSelect) filterSelect.addEventListener('change', applyFilters);
}

async function loadCards() {
    try {
        const snapshot = await db.collection(collectionName).orderBy('createdAt', 'desc').get();
        allCardsCache = snapshot.docs.map(doc => ({
            id: doc.id, 
            ...doc.data()
        }));
        populateTagDropdown(allCardsCache);
        renderGrids(allCardsCache);
    } catch (error) {
        console.error("Error getting documents: ", error);
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
    Object.values(gridMap).forEach(grid => { if(grid) grid.innerHTML = ''; });

    if (cardsToRender.length === 0) {
        if(gridMap["Post"]) gridMap["Post"].innerHTML = '<p style="text-align:center; width:100%;">No matching cards found.</p>';
        return;
    }

    cardsToRender.forEach(card => {
        const tagHTML = card.tags ? card.tags.map(tag => `<p>${tag}</p>`).join('') : '';

        // --- NEW AVERAGE CALCULATION ---
        let averageRating = 0;
        // Check if we have votes to avoid dividing by zero
        if (card.ratingCount && card.ratingCount > 0) {
            averageRating = Math.round(card.ratingSum / card.ratingCount);
        } else if (card.rating) {
            // Fallback for old cards that still use the single "rating" system
            averageRating = card.rating;
        }

        let starsHTML = '';
        for (let i = 1; i <= 5; i++) {
            const colorClass = i <= averageRating ? 'filled' : '';
            starsHTML += `<i class="fa-solid fa-star ${colorClass}" onclick="rateCard('${card.id}', ${i})"></i>`;
        }
        
        // Optional: Show count (e.g., "(12 votes)")
        const voteText = card.ratingCount ? `<span style="font-size:0.8rem; color:#888;">(${card.ratingCount})</span>` : '';

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
                        ${starsHTML} ${voteText}
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

// --- 4. LOGIC: Dashboard ---
const dashboardBody = document.getElementById('dashboard-body');

if (dashboardBody) { loadDashboard(); }

async function loadDashboard() {
    dashboardBody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
    try {
        const snapshot = await db.collection(collectionName).orderBy('createdAt', 'desc').get();
        const cards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        dashboardBody.innerHTML = ''; 
        if (cards.length === 0) {
            dashboardBody.innerHTML = '<tr><td colspan="4">No cards found.</td></tr>';
            return;
        }
        cards.forEach(card => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${card.img}" alt="img"></td>
                <td>${card.title}</td>
                <td>${card.category}</td>
                <td><button class="delete-btn" onclick="deleteCard('${card.id}')">Delete</button></td>
            `;
            dashboardBody.appendChild(row);
        });
    } catch (e) { console.error(e); }
}

// --- 5. GLOBAL ACTIONS ---

// Updated Rate Function (Calculates Average)
window.rateCard = async function(cardId, userRating) {
    try {
        // 1. Get the current data for this card first
        const cardRef = db.collection(collectionName).doc(cardId);
        const doc = await cardRef.get();
        
        if (doc.exists) {
            const data = doc.data();
            
            // Calculate new totals
            // If data.ratingSum doesn't exist yet, start at 0
            const currentSum = data.ratingSum || 0;
            const currentCount = data.ratingCount || 0;

            const newSum = currentSum + userRating;
            const newCount = currentCount + 1;

            // 2. Save the new math to Cloud
            await cardRef.update({
                ratingSum: newSum,
                ratingCount: newCount
            });

            alert(`You rated this ${userRating} stars!`);

            // 3. Update Local Display immediately
            const cardIndex = allCardsCache.findIndex(c => c.id === cardId);
            if (cardIndex > -1) {
                allCardsCache[cardIndex].ratingSum = newSum;
                allCardsCache[cardIndex].ratingCount = newCount;
                applyFilters(); // Re-render grid
            }
        }
    } catch (error) {
        console.error("Error updating rating:", error);
        alert("Could not save rating.");
    }
};

window.deleteCard = async function(docId) {
    if(confirm("Delete this card?")) {
        try {
            await db.collection(collectionName).doc(docId).delete();
            loadDashboard(); 
        } catch (error) { alert("Error deleting"); }
    }
};
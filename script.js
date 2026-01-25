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

// --- 2. LOGIC: Add Card Page (With Compression) ---
const addForm = document.querySelector('.add-card-form');

if (addForm) {
    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = addForm.querySelector('button');
        submitBtn.disabled = true;
        submitBtn.innerText = "Compressing & Uploading...";

        const fileInput = document.getElementById('card-img');
        const rawTitle = document.getElementById('card-header').value;
        const file = fileInput.files[0];

        if (!file) {
            alert("Please select an image!");
            submitBtn.disabled = false; submitBtn.innerText = "Add Card";
            return;
        }

        try {
            // 1. COMPRESS THE IMAGE
            // Takes the large file and returns a small text string
            const compressedImgString = await compressImage(file);

            // 2. Format Title
            const formattedTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1).toLowerCase();

            const newCard = {
                createdAt: Date.now(), 
                img: compressedImgString, // Save the small compressed version
                title: formattedTitle,
                tags: document.getElementById('card-tags').value.split('-').map(t => t.trim()).filter(t => t),
                desc: document.getElementById('card-description').value,
                category: document.getElementById('category').value,
                ratingSum: 0,
                ratingCount: 0
            };

            // 3. Save to Cloud
            await db.collection(collectionName).add(newCard);
            
            alert('Card Published Successfully!');
            window.location.href = 'index.html';

        } catch (error) {
            console.error("Error:", error);
            alert("Error: " + error.message);
            submitBtn.disabled = false;
            submitBtn.innerText = "Add Card";
        }
    });
}

/**
 * HELPER: Compresses image to ensure it fits in Firestore (1MB limit)
 * Resizes to max-width 800px and reduces quality to 60%
 */
function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800; // Resize huge images to 800px width
                const scaleSize = MAX_WIDTH / img.width;
                
                // Set new width/height
                canvas.width = (img.width > MAX_WIDTH) ? MAX_WIDTH : img.width;
                canvas.height = (img.width > MAX_WIDTH) ? (img.height * scaleSize) : img.height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Export as JPEG with 0.6 (60%) quality
                // This usually turns a 2MB file into ~50-100KB
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
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
        allCardsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        populateTagDropdown(allCardsCache);
        renderGrids(allCardsCache);
    } catch (error) { console.error(error); }
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
        
        let averageRating = 0;
        if (card.ratingCount && card.ratingCount > 0) averageRating = Math.round(card.ratingSum / card.ratingCount);
        else if (card.rating) averageRating = card.rating;

        let starsHTML = '';
        for (let i = 1; i <= 5; i++) {
            const colorClass = i <= averageRating ? 'filled' : '';
            starsHTML += `<i class="fa-solid fa-star ${colorClass}" onclick="rateCard('${card.id}', ${i})"></i>`;
        }
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
                    <div class="stars">${starsHTML} ${voteText}</div>
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
window.rateCard = async function(cardId, userRating) {
    try {
        const cardRef = db.collection(collectionName).doc(cardId);
        const doc = await cardRef.get();
        if (doc.exists) {
            const data = doc.data();
            const newSum = (data.ratingSum || 0) + userRating;
            const newCount = (data.ratingCount || 0) + 1;
            await cardRef.update({ ratingSum: newSum, ratingCount: newCount });
            
            const cardIndex = allCardsCache.findIndex(c => c.id === cardId);
            if (cardIndex > -1) {
                allCardsCache[cardIndex].ratingSum = newSum;
                allCardsCache[cardIndex].ratingCount = newCount;
                applyFilters(); 
            }
        }
    } catch (error) { console.error(error); alert("Could not save rating."); }
};

window.deleteCard = async function(docId) {
    if(confirm("Delete this card?")) {
        try {
            await db.collection(collectionName).doc(docId).delete();
            loadDashboard(); 
        } catch (error) { alert("Error deleting"); }
    }
};
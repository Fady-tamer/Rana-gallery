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

// --- 2. MODAL SETUP ---
// Inject Modal HTML if it doesn't exist
if (!document.getElementById('card-modal')) {
    document.body.insertAdjacentHTML('beforeend', `
        <div id="card-modal" class="modal-overlay" onclick="closeCard(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <span class="close-modal-btn" onclick="closeCard(event)">
                    <i class="fa-solid fa-xmark"></i>
                </span>
                <div id="modal-body"></div>
            </div>
        </div>
    `);
}

const modalOverlay = document.getElementById('card-modal');
const modalBody = document.getElementById('modal-body');

// --- 3. LOGIC: Add Card Page (Updated for new Design) ---
const addForm = document.querySelector('.card-form'); // Updated Selector

if (addForm) {
    // A. Submit Logic
    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = addForm.querySelector('button');
        const originalBtnText = submitBtn.innerHTML;
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';

        const fileInput = document.getElementById('card-img');
        const rawTitle = document.getElementById('card-header').value;
        const file = fileInput.files[0];

        if (!file) {
            alert("Please select an image!");
            submitBtn.disabled = false; 
            submitBtn.innerHTML = originalBtnText;
            return;
        }

        try {
            const compressedImgString = await compressImage(file);
            const formattedTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1).toLowerCase();

            const newCard = {
                createdAt: Date.now(), 
                img: compressedImgString, 
                title: formattedTitle,
                tags: document.getElementById('card-tags').value.split('-').map(t => t.trim()).filter(t => t),
                desc: document.getElementById('card-description').value,
                category: document.getElementById('category').value,
                ratingSum: 0,
                ratingCount: 0,
                likes: 0
            };

            await db.collection(collectionName).add(newCard);
            alert('Card Published Successfully!');
            window.location.href = 'index.html';

        } catch (error) {
            console.error("Error:", error);
            alert("Error: " + error.message);
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });

    // B. File Upload Visual Logic (Shows filename on selection)
    const fileInput = document.getElementById('card-img');
    const fileVisualText = document.querySelector('.file-upload-visual span');
    const fileVisualIcon = document.querySelector('.file-upload-visual i');

    if (fileInput && fileVisualText) {
        fileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                fileVisualText.textContent = this.files[0].name;
                fileVisualText.style.color = '#2F4156'; 
                fileVisualText.style.fontWeight = '600';
                
                if(fileVisualIcon) {
                    fileVisualIcon.className = 'fa-solid fa-check';
                    fileVisualIcon.style.color = '#567C8D'; 
                }
            }
        });
    }
}

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800; 
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = (img.width > MAX_WIDTH) ? MAX_WIDTH : img.width;
                canvas.height = (img.width > MAX_WIDTH) ? (img.height * scaleSize) : img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

// --- 4. LOGIC: Index Page ---
const gridMap = {
    "Post": document.querySelector('.card-grid'),
    "Artist'sStory": document.querySelector('.ArtistsStory-grid'),
    "ArtStory": document.querySelector('.ArtStory-grid'),
    "Country'sStory": document.querySelector('.CountrysStory-grid'),
    "ColorsPallets": document.querySelector('.ColorsPallets-grid')
};

const searchInput = document.querySelector('.search-bar input');
// UPDATED: Selector matches the new HTML class 'filter-select'
const filterSelect = document.querySelector('.filter-select'); 
let allCardsCache = []; 

// Pill Navigation Active State
const pills = document.querySelectorAll('.pill');
pills.forEach(pill => {
    pill.addEventListener('click', function() {
        pills.forEach(p => p.classList.remove('active'));
        this.classList.add('active');
    });
});

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
    // Convert selected value to lowercase for comparison
    const selectedTag = filterSelect.value.toLowerCase(); 

    const filteredCards = allCardsCache.filter(card => {
        // Search logic
        const matchesSearch = card.title.toLowerCase().includes(searchTerm) || 
                              (card.tags && card.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
        
        // Filter logic (Updated for Case Insensitivity)
        const matchesTag = selectedTag === 'all' || 
                           (card.tags && card.tags.some(t => t.toLowerCase() === selectedTag));
        
        return matchesSearch && matchesTag;
    });
    renderGrids(filteredCards);
}

function renderGrids(cardsToRender) {
    Object.values(gridMap).forEach(grid => { if(grid) grid.innerHTML = ''; });

    if (cardsToRender.length === 0) {
        if(gridMap["Post"]) gridMap["Post"].innerHTML = '<p style="text-align:center; color:#888; grid-column:1/-1;">No matching art found.</p>';
        return;
    }

    cardsToRender.forEach(card => {
        // Tag HTML generation
        const tagHTML = card.tags ? card.tags.map(tag => `<p>${tag}</p>`).join('') : '';
        
        // Ratings logic
        let averageRating = 0;
        if (card.ratingCount && card.ratingCount > 0) averageRating = Math.round(card.ratingSum / card.ratingCount);
        else if (card.rating) averageRating = card.rating;

        let starsHTML = '';
        for (let i = 1; i <= 5; i++) {
            const colorClass = i <= averageRating ? 'filled' : '';
            starsHTML += `<i class="fa-solid fa-star ${colorClass}" onclick="event.stopPropagation(); rateCard('${card.id}', ${i})"></i>`;
        }
        const voteText = card.ratingCount ? `<span style="font-size:0.8rem; color:#888;">(${card.ratingCount})</span>` : '';

        // Likes logic
        const isLiked = localStorage.getItem('liked_' + card.id) === 'true';
        const heartClass = isLiked ? 'fa-solid fa-heart liked' : 'fa-regular fa-heart'; 
        const likeCount = card.likes || 0;

        // UPDATED: Card HTML Structure to match new CSS
        const cardHTML = `
        <div class="card" onclick="openCard('${card.id}')">
            <div class="card-image"><img src="${card.img}" alt="${card.title}" loading="lazy"></div>
            <div class="card-meta">
                <span class="card-header">${card.title}</span>
                <div class="card-tags">${tagHTML}</div>
                <p class="card-description">${card.desc}</p>
                <div class="card-actions">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <i class="${heartClass}" onclick="event.stopPropagation(); toggleLike('${card.id}')"></i>
                        <span style="font-size:0.9rem; color:#666;">${likeCount}</span>
                    </div>
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

    // 1. Get all tags from all cards
    const allTags = cards.flatMap(card => card.tags || []);

    // 2. Deduplicate ignoring case (e.g. "Art" == "art")
    const seen = new Set();
    const uniqueTags = [];
    
    allTags.forEach(tag => {
        if (!tag) return; // Skip empty tags
        const lower = tag.trim().toLowerCase();
        if (!seen.has(lower)) {
            seen.add(lower);
            uniqueTags.push(tag.trim()); // Keep the original casing of the first one found
        }
    });

    // 3. Sort alphabetically
    uniqueTags.sort((a, b) => a.localeCompare(b));

    // 4. Render options
    filterSelect.innerHTML = '<option value="All">All Tags</option>';
    uniqueTags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag; 
        option.textContent = tag;
        filterSelect.appendChild(option);
    });
}

// --- 5. MODAL FUNCTIONS ---
window.openCard = function(cardId) {
    const card = allCardsCache.find(c => c.id === cardId);
    if (!card) return;

    // Use pill style for tags in modal
    const tagHTML = card.tags ? card.tags.map(tag => 
        `<span style="background:var(--sky-blue); color:var(--navy); padding:5px 12px; border-radius:15px; margin-right:5px; font-size:0.85rem; font-weight:600;">${tag}</span>`
    ).join('') : '';

    let averageRating = 0;
        if (card.ratingCount && card.ratingCount > 0) averageRating = Math.round(card.ratingSum / card.ratingCount);
        else if (card.rating) averageRating = card.rating;

        let starsHTML = '';
        for (let i = 1; i <= 5; i++) {
            const colorClass = i <= averageRating ? 'filled' : '';
            starsHTML += `<i class="fa-solid fa-star ${colorClass}" onclick="event.stopPropagation(); rateCard('${card.id}', ${i})"></i>`;
        }
        const voteText = card.ratingCount ? `<span style="font-size:0.8rem; color:#888;">(${card.ratingCount})</span>` : '';

        // Likes logic
        const isLiked = localStorage.getItem('liked_' + card.id) === 'true';
        const heartClass = isLiked ? 'fa-solid fa-heart liked' : 'fa-regular fa-heart'; 
        const likeCount = card.likes || 0;
    
    modalBody.innerHTML = `
        <img src="${card.img}" alt="${card.title}">
        <div class="modal-header">
            <h2 style="font-family:'Fascinate', cursive; font-size:2.5rem; color:var(--navy);">${card.title}</h2>
            <div class="card-actions">
                <div style="display:flex; align-items:center; gap:8px;">
                    <i class="${heartClass}" onclick="event.stopPropagation(); toggleLike('${card.id}')"></i>
                    <span style="font-size:0.9rem; color:#666;">${likeCount}</span>
                </div>
                <div class="stars">${starsHTML} ${voteText}</div>
            </div>
        </div>
        <div style="margin-bottom:20px; display:flex; flex-wrap:wrap; gap:5px;">
            ${tagHTML}</div>
        <p style="font-size:1.05rem; line-height:1.7; color:#444; white-space: pre-wrap;">${card.desc}</p>
    `;

    modalOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden'; 
};

window.closeCard = function(e) {
    if (e.target === modalOverlay || e.target.closest('.close-modal-btn')) {
        modalOverlay.style.display = 'none';
        document.body.style.overflow = 'auto'; 
    }
};

// --- 6. DASHBOARD ACTIONS (Admin) ---
const dashboardBody = document.getElementById('dashboard-body');
if (dashboardBody) { loadDashboard(); }

async function loadDashboard() {
    dashboardBody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
    try {
        const snapshot = await db.collection(collectionName).orderBy('createdAt', 'desc').get();
        const cards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        dashboardBody.innerHTML = ''; 
        if (cards.length === 0) { dashboardBody.innerHTML = '<tr><td colspan="4">No cards found.</td></tr>'; return; }
        
        cards.forEach(card => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${card.img}" alt="img" style="width:50px; height:50px; object-fit:cover; border-radius:5px;"></td>
                <td>${card.title}</td>
                <td>${card.category}</td>
                <td>
                    <button class="edit-btn" onclick="openEditModal('${card.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="delete-btn" onclick="deleteCard('${card.id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            dashboardBody.appendChild(row);
        });
    } catch (e) { console.error(e); }
}

// --- 7. GLOBAL ACTIONS (Edit, Delete, Like, Rate) ---

window.openEditModal = async function(cardId) {
    try {
        const doc = await db.collection(collectionName).doc(cardId).get();
        if(!doc.exists) return alert("Card not found!");

        const card = doc.data();
        const tagsString = card.tags ? card.tags.join('-') : '';

        // Inject Form into Modal
        modalBody.innerHTML = `
            <h2 style="text-align:center; margin-bottom:15px; font-family:'Poppins', sans-serif;">Edit Card</h2>
            <div class="edit-form" style="display:flex; flex-direction:column; gap:10px;">
                <label style="font-weight:600;">Title</label>
                <input type="text" id="edit-title" value="${card.title}" style="padding:8px; border:1px solid #ccc; border-radius:5px;">
                
                <label style="font-weight:600;">Tags (separate with -)</label>
                <input type="text" id="edit-tags" value="${tagsString}" style="padding:8px; border:1px solid #ccc; border-radius:5px;">
                
                <label style="font-weight:600;">Category</label>
                <select id="edit-category" style="padding:8px; border:1px solid #ccc; border-radius:5px;">
                    <option value="Post" ${card.category === 'Post' ? 'selected' : ''}>Post</option>
                    <option value="Artist'sStory" ${card.category === "Artist'sStory" ? 'selected' : ''}>Artist's Story</option>
                    <option value="ArtStory" ${card.category === 'ArtStory' ? 'selected' : ''}>Art Story</option>
                    <option value="Country'sStory" ${card.category === "Country'sStory" ? 'selected' : ''}>Country's Story</option>
                    <option value="ColorsPallets" ${card.category === 'ColorsPallets' ? 'selected' : ''}>Colors Pallets</option>
                </select>

                <label style="font-weight:600;">Description</label>
                <textarea id="edit-desc" rows="5" style="padding:8px; border:1px solid #ccc; border-radius:5px;">${card.desc}</textarea>

                <button onclick="saveEdit('${cardId}')" style="margin-top:10px; padding:10px; background:var(--teal); color:white; border:none; border-radius:5px; cursor:pointer;">Save Changes</button>
            </div>
        `;
        
        modalOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden'; 

    } catch(e) { console.error(e); alert("Error opening edit."); }
};

window.saveEdit = async function(cardId) {
    const newTitle = document.getElementById('edit-title').value;
    const newTags = document.getElementById('edit-tags').value.split('-').map(t => t.trim()).filter(t => t);
    const newCategory = document.getElementById('edit-category').value;
    const newDesc = document.getElementById('edit-desc').value;

    try {
        await db.collection(collectionName).doc(cardId).update({
            title: newTitle,
            tags: newTags,
            category: newCategory,
            desc: newDesc
        });
        
        alert("Saved!");
        modalOverlay.style.display = 'none'; 
        document.body.style.overflow = 'auto'; 
        
        // Refresh appropriate view
        if(dashboardBody) loadDashboard();
        if(allCardsCache.length > 0) loadCards();

    } catch(e) {
        console.error(e);
        alert("Error saving: " + e.message);
    }
};

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
                renderGrids(allCardsCache); // Refresh display to show new stars
            }
        }
    } catch (error) { console.error(error); alert("Could not save rating."); }
};

window.toggleLike = async function(cardId) {
    const storageKey = 'liked_' + cardId;
    const hasLiked = localStorage.getItem(storageKey) === 'true';

    try {
        const cardRef = db.collection(collectionName).doc(cardId);
        const doc = await cardRef.get();
        if (!doc.exists) return;

        const currentLikes = doc.data().likes || 0;
        let newLikes;

        if (hasLiked) {
            newLikes = Math.max(0, currentLikes - 1);
            localStorage.removeItem(storageKey); 
        } else {
            newLikes = currentLikes + 1;
            localStorage.setItem(storageKey, 'true'); 
        }

        await cardRef.update({ likes: newLikes });

        const cardIndex = allCardsCache.findIndex(c => c.id === cardId);
        if (cardIndex > -1) {
            allCardsCache[cardIndex].likes = newLikes;
            // Only re-render if necessary to update UI (optional for better performance)
            const cardElement = document.querySelector(`.card[onclick="openCard('${cardId}')"]`);
            if(cardElement) {
                const likeCountSpan = cardElement.querySelector('.card-actions span');
                const heartIcon = cardElement.querySelector('.fa-heart');
                if(likeCountSpan) likeCountSpan.textContent = newLikes;
                if(heartIcon) {
                    heartIcon.className = hasLiked ? 'fa-regular fa-heart' : 'fa-solid fa-heart liked';
                }
            }
        }

    } catch (error) { console.error("Error toggling like:", error); }
};

window.deleteCard = async function(docId) {
    if(confirm("Delete this card?")) {
        try { await db.collection(collectionName).doc(docId).delete(); loadDashboard(); } 
        catch (error) { alert("Error deleting"); }
    }
};
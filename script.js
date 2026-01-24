// --- 1. Global Helper Functions (Data Management) ---

function getCards() {
    const stored = localStorage.getItem('cards');
    if (!stored) return [];
    try {
        const parsed = JSON.parse(stored);
        // Safety check for old data
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
            return []; 
        }
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function saveCards(cards) {
    localStorage.setItem('cards', JSON.stringify(cards));
}

// --- 2. LOGIC: Add Card Page (addCard.html) ---
const addForm = document.querySelector('.add-card-form');

if (addForm) {
    addForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const fileInput = document.getElementById('card-img');
        const rawTitle = document.getElementById('card-header').value;
        const file = fileInput.files[0];

        if (!file) {
            alert("Please select an image!");
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            alert("Image is too large! Please choose an image under 2MB.");
            return;
        }

        // --- FORMAT TITLE HERE ---
        // 1. charAt(0).toUpperCase() -> Makes first letter Big
        // 2. slice(1).toLowerCase() -> Makes the rest small
        const formattedTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1).toLowerCase();

        const reader = new FileReader();

        reader.onload = function(event) {
            const imgDataUrl = event.target.result;

            const newCard = {
                id: Date.now(), 
                img: imgDataUrl, 
                title: formattedTitle, // Use the new formatted title
                tags: document.getElementById('card-tags').value.split('-').map(t => t.trim()).filter(t => t),
                desc: document.getElementById('card-description').value,
                category: document.getElementById('category').value 
            };

            try {
                const cards = getCards();
                cards.push(newCard);
                saveCards(cards);

                alert('Card Added Successfully!');
                addForm.reset();
            } catch (error) {
                alert("Storage is full! Try deleting old cards or using smaller images.");
                console.error(error);
            }
        };

        reader.readAsDataURL(file);
    });
}

// --- 3. LOGIC: Index Page (index.html) ---

// 3a. Map Categories to HTML Elements
const gridMap = {
    "Post": document.querySelector('.card-grid'),
    "Artist'sStory": document.querySelector('.ArtistsStory-grid'),
    "ArtStory": document.querySelector('.ArtStory-grid'),
    "Country'sStory": document.querySelector('.CountrysStory-grid'),
    "ColorsPallets": document.querySelector('.ColorsPallets-grid')
};

// Check if we are on the index page
if (gridMap["Post"]) {
    
    // Selectors for Search and Filter
    const searchInput = document.querySelector('.search-bar input');
    const filterSelect = document.querySelector('.filter-bar select');

    // 1. Initial Render
    const allCards = getCards();
    populateTagDropdown(allCards); // Fill the dropdown with your tags
    renderGrids(allCards);         // Show all cards

    // 2. Event Listeners (Run applyFilters whenever you type or select)
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (filterSelect) filterSelect.addEventListener('change', applyFilters);

    // 3. The Unified Filter Logic
    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const selectedTag = filterSelect.value;
        const cards = getCards();

        const filteredCards = cards.filter(card => {
            // Check 1: Does title match search? (OR does a tag match the search text?)
            const matchesSearch = card.title.toLowerCase().includes(searchTerm) || 
                                  card.tags.some(tag => tag.toLowerCase().includes(searchTerm));

            // Check 2: Does the card have the selected tag? (Ignore if "All" is selected)
            const matchesTag = selectedTag === 'All' || card.tags.includes(selectedTag);

            return matchesSearch && matchesTag;
        });

        renderGrids(filteredCards);
    }

    // 4. Fill Dropdown with Unique Tags
    function populateTagDropdown(cards) {
        if (!filterSelect) return;

        // Get all tags from all cards, flatten them into one list
        const allTags = cards.flatMap(card => card.tags);
        // Remove duplicates using Set
        const uniqueTags = [...new Set(allTags)];

        // Clear existing options except "All"
        filterSelect.innerHTML = '<option value="All">All Tags</option>';

        // Add an option for each unique tag
        uniqueTags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag; // Capitalize first letter if you want
            filterSelect.appendChild(option);
        });
    }
}

// 3b. The Reusable Render Function
function renderGrids(cardsToRender) {
    // Clear ALL grids first
    Object.values(gridMap).forEach(grid => {
        if(grid) grid.innerHTML = '';
    });

    cardsToRender.forEach(card => {
        const tagHTML = card.tags.map(tag => `<p>${tag}</p>`).join('');
        
        const cardHTML = `
        <div class="card">
            <div class="card-image">
                <img src="${card.img}" alt="${card.title}">
            </div>
            <div class="card-meta">
                <p class="card-header">${card.title}</p>
                <div class="card-tags">${tagHTML}</div>
                <p class="card-description">${card.desc}</p>
                <div class="stars">
                    <i class="fa-solid fa-star"></i>
                    <i class="fa-solid fa-star"></i>
                    <i class="fa-solid fa-star"></i>
                    <i class="fa-solid fa-star"></i>
                </div>
            </div>
        </div>`;
        
        const targetGrid = gridMap[card.category];
        if (targetGrid) {
            targetGrid.innerHTML += cardHTML;
        } else {
            gridMap["Post"].innerHTML += cardHTML;
        }
    });
}


// --- 4. LOGIC: Dashboard Page (dashboard.html) ---
const dashboardBody = document.getElementById('dashboard-body');

if (dashboardBody) {
    renderDashboard();
}

function renderDashboard() {
    const cards = getCards();
    dashboardBody.innerHTML = ''; 

    if (cards.length === 0) {
        dashboardBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No cards found.</td></tr>';
        return;
    }

    cards.forEach(card => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><img src="${card.img}" alt="img" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"></td>
            <td>${card.title}</td>
            <td>${card.category}</td>
            <td>
                <button class="delete-btn" onclick="deleteCard(${card.id})" style="background: #ff4d4d; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px;">
                    <i class="fa-solid fa-trash"></i> Delete
                </button>
            </td>
        `;
        dashboardBody.appendChild(row);
    });
}

window.deleteCard = function(id) {
    if(confirm("Are you sure you want to delete this card?")) {
        let cards = getCards();
        cards = cards.filter(card => card.id !== id);
        saveCards(cards);
        renderDashboard(); 
    }
};
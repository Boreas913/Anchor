// Tab Switching Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab
            button.classList.add('active');
            
            // Show corresponding content
            if (targetTab === 'grocery') {
                document.getElementById('grocery-tab').classList.add('active');
            } else if (targetTab === 'recipes') {
                document.getElementById('recipes-tab').classList.add('active');
            } else if (targetTab === 'inventory') {
                document.getElementById('inventory-tab').classList.add('active');
            } else if (targetTab === 'recipe-collection') {
                document.getElementById('recipe-collection-tab').classList.add('active');
            }
        });
    });
    //modal for add custom item to grocery list
    const modal = document.getElementById("add-custom-item-modal");
    const btn = document.getElementById("add-custom-item");
    const span = document.getElementsByClassName("close")[0];

    // --- MODAL OPEN/CLOSE LOGIC --- 
    btn.onclick = function() {
      modal.style.display = "block";
    }

    span.onclick = function() {
      modal.style.display = "none";
    }

    window.onclick = function(event) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    }

    // --- SAVING THE ITEM TO THE LIST ---

  let runningTotal = 0;

  // Helper to attach change listener to any grocery checkbox
  function attachCheckboxListener(checkbox) {
    checkbox.addEventListener('change', () => {
      saveGroceryChecklist();
    });
  }

  // Helper to attach click listener to any remove button
  function attachRemoveListener(button) {
    button.addEventListener('click', () => {
      const li = button.closest('.grocery-item');
      if (li) {
        li.remove();
        saveGroceryChecklist();
      }
    });
  }

  window.saveCustomItem = function() {
    const nameVal = document.getElementById("custom-item-modal-name").value;
    const priceVal = document.getElementById("custom-item-modal-price").value;
    let categoryVal = document.getElementById("custom-item-modal-category").value;

    if (nameVal === "" || priceVal === "") {
      alert("Please fill in both name and price");
      return;
    }

    const list = document.getElementById(`list-${categoryVal}`);

    if (list) {
      const newItem = document.createElement("li");
      newItem.className = "grocery-item";
      const uniqueId = "custom-" + Date.now();

      newItem.innerHTML = `
          <input type="checkbox" id="${uniqueId}">
          <label for="${uniqueId}">${nameVal}</label>
          <span class="item-price">$${parseFloat(priceVal).toFixed(2)}</span>
          <button class="remove-item-btn" aria-label="Remove item">&times;</button>
      `;
      list.appendChild(newItem);

      const checkbox = newItem.querySelector('input[type="checkbox"]');
      if (checkbox) {
        attachCheckboxListener(checkbox);
      }

      const removeBtn = newItem.querySelector('.remove-item-btn');
      if (removeBtn) {
        attachRemoveListener(removeBtn);
      }
    }

    // Update estimated cost
    const price = parseFloat(priceVal);
    if (!isNaN(price)) {
      runningTotal += price;
      document.getElementById('estimated').textContent =
        `Estimated: $${runningTotal.toFixed(2)}`;
    }

    // Persist updated list
    saveGroceryChecklist();

    // Reset modal inputs
    document.getElementById("custom-item-modal-name").value = "";
    document.getElementById("custom-item-modal-price").value = "";
    modal.style.display = "none";
  };

  // --- GROCERY CHECKLIST DATA PERSISTENCE (localStorage) ---
  const GROCERY_STORAGE_KEY = 'anchor_groceryChecklist_v1';

  function saveGroceryChecklist() {
    const items = [];
    let total = 0;

    document.querySelectorAll('.grocery-item').forEach(item => {
      const checkbox = item.querySelector('input[type="checkbox"]');
      const label = item.querySelector('label');
      const priceSpan = item.querySelector('.item-price');
      const list = item.closest('.grocery-list');

      if (!checkbox || !label || !priceSpan || !list) return;

      const categoryId = list.id || '';
      const category = categoryId.startsWith('list-') ? categoryId.replace('list-', '') : categoryId;
      const priceNumber = parseFloat(priceSpan.textContent.replace('$', '').trim()) || 0;

      items.push({
        id: checkbox.id,
        name: label.textContent.trim(),
        price: priceNumber,
        checked: checkbox.checked,
        category
      });

      total += priceNumber;
    });

    const payload = { items };
    try {
      localStorage.setItem(GROCERY_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('Failed to save grocery checklist to localStorage', e);
    }

    runningTotal = total;
    const estimatedEl = document.getElementById('estimated');
    if (estimatedEl) {
      estimatedEl.textContent = `Estimated: $${runningTotal.toFixed(2)}`;
    }
  }

  function loadGroceryChecklist() {
    let saved = null;
    try {
      const raw = localStorage.getItem(GROCERY_STORAGE_KEY);
      if (raw) {
        saved = JSON.parse(raw);
      }
    } catch (e) {
      console.error('Failed to load grocery checklist from localStorage', e);
    }

    if (!saved || !Array.isArray(saved.items)) {
      // No saved data yet; just make sure estimated is initialized
      const estimatedEl = document.getElementById('estimated');
      if (estimatedEl) {
        estimatedEl.textContent = `Estimated: $${runningTotal.toFixed(2)}`;
      }
      return;
    }

    // Clear any existing items
    document.querySelectorAll('.grocery-list').forEach(list => {
      list.innerHTML = '';
    });

    // Rebuild list from saved data
    saved.items.forEach(itemData => {
      const list = document.getElementById(`list-${itemData.category}`) || document.getElementById('list-pantry');
      if (!list) return;

      const li = document.createElement('li');
      li.className = 'grocery-item';

      const checkboxId = itemData.id || ('custom-' + Date.now() + Math.random().toString(16).slice(2));

      li.innerHTML = `
          <input type="checkbox" id="${checkboxId}">
          <label for="${checkboxId}">${itemData.name}</label>
          <span class="item-price">$${Number(itemData.price || 0).toFixed(2)}</span>
          <button class="remove-item-btn" aria-label="Remove item">&times;</button>
      `;

      const checkbox = li.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.checked = !!itemData.checked;
        attachCheckboxListener(checkbox);
      }

      const removeBtn = li.querySelector('.remove-item-btn');
      if (removeBtn) {
        attachRemoveListener(removeBtn);
      }

      list.appendChild(li);
    });

    // Recalculate and show total
    saveGroceryChecklist();
  }

  // Expose helper used in HTML onclick (kept for compatibility)
  window.saveItemPrice = function() {
    saveGroceryChecklist();
  };

  // --- WEEKLY MEAL DATES (This Week's Meals) ---
  function updateWeekDates() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

    // Find Monday of the current week
    const monday = new Date(today);
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // if Sunday, go back 6 days
    monday.setDate(today.getDate() + diff);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const dayCards = document.querySelectorAll('.meal-calendar .day-card');
    dayCards.forEach((card, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);

      const dateSpan = card.querySelector('.day-date');
      if (dateSpan) {
        dateSpan.textContent = `${monthNames[date.getMonth()]} ${date.getDate()}`;
      }
    });
  }

  // Attach listeners to any existing checkboxes / remove buttons (if present from HTML)
  document.querySelectorAll('.grocery-item input[type="checkbox"]').forEach(cb => {
    attachCheckboxListener(cb);
  });
  document.querySelectorAll('.grocery-item .remove-item-btn').forEach(btn => {
    attachRemoveListener(btn);
  });

  // Load any previously saved grocery checklist on page load
  loadGroceryChecklist();

  // Update the dates shown in the \"This Week's Meals\" section
  updateWeekDates();
});
//!!!!!!!Add DATA PERSISTANCE!!!!!!!!!!!!!!

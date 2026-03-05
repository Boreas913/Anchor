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

  // --- AUTO-SUGGEST MEALS ---

  // Basic recipe data used for scoring suggestions
  const RECIPE_DATA = {
    'Overnight Oats': {
      id: 'overnight-oats',
      ingredients: ['oats', 'almond milk', 'chia seeds', 'banana'],
      time: '5 min',
      color: 'ffb3ba'
    },
    'Quinoa Salad': {
      id: 'quinoa-salad',
      ingredients: ['quinoa', 'tomatoes', 'spinach', 'olive oil'],
      time: '20 min',
      color: 'ffdfba'
    },
    'Grilled Chicken': {
      id: 'grilled-chicken',
      ingredients: ['chicken breast', 'olive oil', 'garlic', 'spinach'],
      time: '30 min',
      color: 'baffc9'
    },
    'Mediterranean Bowl': {
      id: 'mediterranean-bowl',
      ingredients: ['quinoa', 'tomatoes', 'spinach', 'olive oil', 'chickpeas'],
      time: '25 min',
      color: 'ffb3ba'
    },
    'Stir Fry': {
      id: 'stir-fry',
      ingredients: ['chicken breast', 'broccoli', 'bell peppers', 'soy sauce'],
      time: '20 min',
      color: 'ffdfba'
    },
    'Salmon & Veggies': {
      id: 'salmon-veggies',
      ingredients: ['salmon', 'broccoli', 'tomatoes', 'olive oil'],
      time: '30 min',
      color: 'baffc9'
    }
  };

  function getInventoryIngredients() {
    const set = new Set();
    document.querySelectorAll('.inventory-item .item-name').forEach(span => {
      const name = span.textContent.trim().toLowerCase();
      if (name) {
        set.add(name);
      }
    });
    return set;
  }

  function getCurrentPlanRecipeNames() {
    const names = [];
    document.querySelectorAll('.meal-calendar .recipe-name').forEach(span => {
      const name = span.textContent.trim();
      if (name) {
        names.push(name);
      }
    });
    return names;
  }

  function buildUsageCounts(recipeNames) {
    const counts = {};
    recipeNames.forEach(name => {
      counts[name] = (counts[name] || 0) + 1;
    });
    return counts;
  }

  function getUsedIngredientsFromPlan(recipeNames) {
    const used = new Set();
    recipeNames.forEach(name => {
      const recipe = RECIPE_DATA[name];
      if (recipe && Array.isArray(recipe.ingredients)) {
        recipe.ingredients.forEach(ing => used.add(ing.toLowerCase()));
      }
    });
    return used;
  }

  function scoreRecipeCandidate(name, usageCounts, usedIngredients, inventoryIngredients) {
    const recipe = RECIPE_DATA[name];
    if (!recipe || !Array.isArray(recipe.ingredients)) return -Infinity;

    let overlapInventory = 0;
    let overlapUsed = 0;
    let newIngredients = 0;

    recipe.ingredients.forEach(rawIng => {
      const ing = rawIng.toLowerCase();
      const inInventory = inventoryIngredients.has(ing);
      const inUsed = usedIngredients.has(ing);

      if (inInventory) overlapInventory++;
      if (inUsed) overlapUsed++;
      if (!inInventory && !inUsed) newIngredients++;
    });

    const baseScore = overlapInventory * 3 + overlapUsed * 2 - newIngredients;
    const usagePenalty = (usageCounts[name] || 0) * 2; // discourage overuse

    return baseScore - usagePenalty;
  }

  function fillMealSlotWithRecipe(slot, recipeName) {
    const addBtn = slot.querySelector('.add-meal-btn');
    if (!addBtn) return;

    const recipe = RECIPE_DATA[recipeName] || {};
    const firstLetter = recipeName.charAt(0).toUpperCase() || 'R';
    const color = recipe.color || 'ffb3ba';
    const timeText = recipe.time || '';

    addBtn.remove();

    slot.insertAdjacentHTML('beforeend', `
      <div class="recipe-card-mini">
        <img src="https://via.placeholder.com/60x60/${color}/ffffff?text=${encodeURIComponent(firstLetter)}" alt="Recipe">
        <div class="recipe-info-mini">
          <span class="recipe-name">${recipeName}</span>
          <span class="recipe-time">${timeText}</span>
        </div>
      </div>
    `);
  }

  function autoSuggestMeals() {
    const maxPerWeek = 3;
    const inventoryIngredients = getInventoryIngredients();
    const currentNames = getCurrentPlanRecipeNames();
    const usageCounts = buildUsageCounts(currentNames);
    const usedIngredients = getUsedIngredientsFromPlan(currentNames);

    const emptySlots = Array.from(document.querySelectorAll('.meal-slot')).filter(slot =>
      slot.querySelector('.add-meal-btn')
    );

    emptySlots.forEach(slot => {
      const candidates = Object.keys(RECIPE_DATA).filter(name => {
        const count = usageCounts[name] || 0;
        return count < maxPerWeek;
      });

      if (!candidates.length) {
        return;
      }

      let bestName = null;
      let bestScore = -Infinity;

      candidates.forEach(name => {
        const score = scoreRecipeCandidate(name, usageCounts, usedIngredients, inventoryIngredients);
        if (score > bestScore) {
          bestScore = score;
          bestName = name;
        }
      });

      if (!bestName || bestScore === -Infinity) {
        return;
      }

      fillMealSlotWithRecipe(slot, bestName);
      usageCounts[bestName] = (usageCounts[bestName] || 0) + 1;

      const recipe = RECIPE_DATA[bestName];
      if (recipe && Array.isArray(recipe.ingredients)) {
        recipe.ingredients.forEach(ing => usedIngredients.add(ing.toLowerCase()));
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

  // Expose auto-suggest globally for button onclick
  window.autoSuggestMeals = autoSuggestMeals;

  // Load any previously saved grocery checklist on page load
  loadGroceryChecklist();

  // Update the dates shown in the \"This Week's Meals\" section
  updateWeekDates();
});


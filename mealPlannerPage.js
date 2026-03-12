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

  // Price cache (per ingredient name) in localStorage
  const PRICE_CACHE_KEY = 'anchor_priceCache_v1';

  function loadPriceCache() {
    try {
      const raw = localStorage.getItem(PRICE_CACHE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to load price cache', e);
    }
    return {};
  }

  function savePriceCache(cache) {
    try {
      localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.error('Failed to save price cache', e);
    }
  }

  function attachPriceEditListener(priceSpan) {
    if (!priceSpan) return;
    priceSpan.addEventListener('click', () => {
      const li = priceSpan.closest('.grocery-item');
      if (!li) return;
      const label = li.querySelector('label');
      if (!label) return;
      const name = label.textContent.trim();
      const current = parseFloat(priceSpan.textContent.replace('$', '').trim()) || 0;
      const input = prompt(`Enter price for "${name}" (in dollars):`, current ? current.toFixed(2) : '');
      if (input === null) return;
      const value = parseFloat(input);
      if (isNaN(value) || value < 0) {
        alert('Please enter a valid non-negative number.');
        return;
      }
      priceSpan.textContent = `$${value.toFixed(2)}`;

      const cache = loadPriceCache();
      cache[name.toLowerCase()] = {
        lastPrice: value,
        lastUpdated: new Date().toISOString()
      };
      savePriceCache(cache);

      saveGroceryChecklist();
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

      const numericPrice = parseFloat(priceVal);
      newItem.innerHTML = `
          <input type="checkbox" id="${uniqueId}">
          <label for="${uniqueId}">${nameVal}</label>
          <span class="item-price">$${!isNaN(numericPrice) ? numericPrice.toFixed(2) : '0.00'}</span>
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

      const priceSpan = newItem.querySelector('.item-price');
      if (priceSpan) {
        attachPriceEditListener(priceSpan);
      }

      // Update price cache for this custom item
      if (!isNaN(numericPrice)) {
        const cache = loadPriceCache();
        cache[nameVal.toLowerCase()] = {
          lastPrice: numericPrice,
          lastUpdated: new Date().toISOString()
        };
        savePriceCache(cache);
      }
    }

    // Persist updated list (recalculates estimated cost)
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

      // Keep price cache in sync (only if > 0)
      if (priceNumber > 0) {
        const cache = loadPriceCache();
        cache[label.textContent.trim().toLowerCase()] = {
          lastPrice: priceNumber,
          lastUpdated: new Date().toISOString()
        };
        savePriceCache(cache);
      }
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

      const priceSpan = li.querySelector('.item-price');
      if (priceSpan) {
        attachPriceEditListener(priceSpan);
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
    const existingAddBtn = slot.querySelector('.add-meal-btn');
    if (existingAddBtn) {
      existingAddBtn.remove();
    }

    const existingCard = slot.querySelector('.recipe-card-mini');
    if (existingCard) {
      existingCard.remove();
    }

    const recipe = RECIPE_DATA[recipeName] || {};
    const firstLetter = recipeName.charAt(0).toUpperCase() || 'R';
    const color = recipe.color || 'ffb3ba';
    const timeText = recipe.time || '';

    slot.insertAdjacentHTML('beforeend', `
      <div class="recipe-card-mini" draggable="true">
        <img src="https://via.placeholder.com/60x60/${color}/ffffff?text=${encodeURIComponent(firstLetter)}" alt="Recipe">
        <div class="recipe-info-mini">
          <span class="recipe-name">${recipeName}</span>
          <span class="recipe-time">${timeText}</span>
        </div>
        <button class="remove-meal-btn" aria-label="Remove meal">&times;</button>
      </div>
    `);

    const removeBtn = slot.querySelector('.recipe-card-mini .remove-meal-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        const dayCard = slot.closest('.day-card');
        if (!dayCard) return;
        const day = dayCard.getAttribute('data-day');
        let mealType = 'breakfast';
        if (slot.classList.contains('lunch')) mealType = 'lunch';
        if (slot.classList.contains('dinner')) mealType = 'dinner';

        const plan = loadMealPlan() || getEmptyMealPlan();
        if (plan[day]) {
          plan[day][mealType] = null;
        }
        saveMealPlan(plan);

        const card = slot.querySelector('.recipe-card-mini');
        if (card) card.remove();
        const addBtn = document.createElement('div');
        addBtn.className = 'add-meal-btn';
        addBtn.textContent = '+ Add Recipe';
        slot.appendChild(addBtn);
        setupAddMealButtons();
      });
    }
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

  // --- MEAL PLAN PERSISTENCE ---
  const MEAL_PLAN_KEY = 'anchor_mealPlan_v1';

  function getEmptyMealPlan() {
    return {
      monday:   { breakfast: null, lunch: null, dinner: null },
      tuesday:  { breakfast: null, lunch: null, dinner: null },
      wednesday:{ breakfast: null, lunch: null, dinner: null },
      thursday: { breakfast: null, lunch: null, dinner: null },
      friday:   { breakfast: null, lunch: null, dinner: null },
      saturday: { breakfast: null, lunch: null, dinner: null },
      sunday:   { breakfast: null, lunch: null, dinner: null }
    };
  }

  function saveMealPlan(plan) {
    try {
      localStorage.setItem(MEAL_PLAN_KEY, JSON.stringify(plan));
    } catch (e) {
      console.error('Failed to save meal plan', e);
    }
    updateGroceryFromPlan(plan);
  }

  function loadMealPlan() {
    try {
      const raw = localStorage.getItem(MEAL_PLAN_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Failed to load meal plan', e);
    }
    return null;
  }

  function deriveMealPlanFromDOM() {
    const plan = getEmptyMealPlan();
    document.querySelectorAll('.meal-calendar .day-card').forEach(card => {
      const day = card.getAttribute('data-day');
      if (!day || !plan[day]) return;

      const slots = card.querySelectorAll('.meal-slot');
      slots.forEach(slot => {
        let mealType = 'breakfast';
        if (slot.classList.contains('lunch')) mealType = 'lunch';
        if (slot.classList.contains('dinner')) mealType = 'dinner';

        const nameEl = slot.querySelector('.recipe-name');
        if (nameEl) {
          plan[day][mealType] = nameEl.textContent.trim();
        }
      });
    });
    return plan;
  }

  function clearMealSlotsUI() {
    document.querySelectorAll('.meal-slot').forEach(slot => {
      const label = slot.querySelector('.meal-label');
      slot.innerHTML = '';
      if (label) {
        slot.appendChild(label);
      } else {
        const mealLabel = document.createElement('span');
        mealLabel.className = 'meal-label';
        mealLabel.textContent = 'Meal';
        slot.insertAdjacentElement('afterbegin', mealLabel);
      }
      const addBtn = document.createElement('div');
      addBtn.className = 'add-meal-btn';
      addBtn.textContent = '+ Add Recipe';
      slot.appendChild(addBtn);
    });
  }

  function renderMealPlan(plan) {
    clearMealSlotsUI();

    document.querySelectorAll('.meal-calendar .day-card').forEach(card => {
      const day = card.getAttribute('data-day');
      if (!day || !plan[day]) return;

      const slots = card.querySelectorAll('.meal-slot');
      slots.forEach(slot => {
        let mealType = 'breakfast';
        if (slot.classList.contains('lunch')) mealType = 'lunch';
        if (slot.classList.contains('dinner')) mealType = 'dinner';

        const recipeName = plan[day][mealType];
        if (recipeName) {
          fillMealSlotWithRecipe(slot, recipeName);
        }
      });
    });
  }

  // --- GROCERY LIST FROM MEAL PLAN + INVENTORY ---
  function mapIngredientToCategory(ingredient) {
    const ing = ingredient.toLowerCase();
    if (['spinach', 'tomatoes', 'bell peppers', 'broccoli', 'banana'].some(i => ing.includes(i))) {
      return 'produce';
    }
    if (['chicken', 'salmon'].some(i => ing.includes(i))) {
      return 'proteins';
    }
    if (['milk'].some(i => ing.includes(i))) {
      return 'dairy';
    }
    return 'pantry';
  }

  function updateGroceryFromPlan(plan) {
    const needed = new Map();

    Object.keys(plan).forEach(day => {
      const dayPlan = plan[day];
      ['breakfast', 'lunch', 'dinner'].forEach(meal => {
        const recipeName = dayPlan[meal];
        const recipe = RECIPE_DATA[recipeName];
        if (recipe && Array.isArray(recipe.ingredients)) {
          recipe.ingredients.forEach(rawIng => {
            const ing = rawIng.toLowerCase();
            needed.set(ing, (needed.get(ing) || 0) + 1);
          });
        }
      });
    });

    const inventorySet = getInventoryIngredients();

    const existingLabels = new Set();
    document.querySelectorAll('.grocery-item label').forEach(label => {
      existingLabels.add(label.textContent.trim().toLowerCase());
    });

    const priceCache = loadPriceCache();

    needed.forEach((_, ing) => {
      if (inventorySet.has(ing)) return;
      if (existingLabels.has(ing)) return;

      const category = mapIngredientToCategory(ing);
      const list = document.getElementById(`list-${category}`) || document.getElementById('list-pantry');
      if (!list) return;

      const cached = priceCache[ing.toLowerCase()];
      const priceValue = cached && typeof cached.lastPrice === 'number' ? cached.lastPrice : 0;

      const li = document.createElement('li');
      li.className = 'grocery-item';
      const id = `auto-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      li.innerHTML = `
          <input type="checkbox" id="${id}">
          <label for="${id}">${ing}</label>
          <span class="item-price">$${priceValue.toFixed(2)}</span>
          <button class="remove-item-btn" aria-label="Remove item">&times;</button>
      `;

      const cb = li.querySelector('input[type="checkbox"]');
      if (cb) attachCheckboxListener(cb);
      const rm = li.querySelector('.remove-item-btn');
      if (rm) attachRemoveListener(rm);

      const priceSpan = li.querySelector('.item-price');
      if (priceSpan) {
        attachPriceEditListener(priceSpan);
      }

      list.appendChild(li);
    });

    saveGroceryChecklist();
  }

  // --- MEAL SELECTION / INTERACTIONS ---
  let activeMealSlot = null;

  function assignRecipeToSlot(slot, recipeName) {
    const dayCard = slot.closest('.day-card');
    if (!dayCard) return;
    const day = dayCard.getAttribute('data-day');
    let mealType = 'breakfast';
    if (slot.classList.contains('lunch')) mealType = 'lunch';
    if (slot.classList.contains('dinner')) mealType = 'dinner';

    const plan = loadMealPlan() || deriveMealPlanFromDOM() || getEmptyMealPlan();
    if (!plan[day]) plan[day] = { breakfast: null, lunch: null, dinner: null };

    plan[day][mealType] = recipeName;

    fillMealSlotWithRecipe(slot, recipeName);

    saveMealPlan(plan);
    showRecipeToast(`Added ${recipeName} to ${day.charAt(0).toUpperCase() + day.slice(1)} ${mealType}`);
  }

  // Drag-and-drop between meal slots
  function setupMealDragAndDrop() {
    let dragSource = null;

    document.querySelectorAll('.meal-slot').forEach(slot => {
      slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        slot.style.backgroundColor = 'rgba(255, 154, 158, 0.1)';
      });
      slot.addEventListener('dragleave', () => {
        slot.style.backgroundColor = '';
      });
      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        slot.style.backgroundColor = '';
        const recipeName = e.dataTransfer.getData('text/plain');
        if (!recipeName) return;
        assignRecipeToSlot(slot, recipeName);

        // If we know the source, clear it so the card is moved, not copied
        if (dragSource) {
          const plan = loadMealPlan() || getEmptyMealPlan();
          if (plan[dragSource.day]) {
            plan[dragSource.day][dragSource.mealType] = null;
          }
          saveMealPlan(plan);
          renderMealPlan(plan);
          setupAddMealButtons();
          setupMealDragAndDrop();
          dragSource = null;
        }
      });
    });

    document.addEventListener('dragstart', (e) => {
      const card = e.target.closest('.recipe-card-mini');
      if (!card) return;
      const nameEl = card.querySelector('.recipe-name');
      if (!nameEl) return;
      const recipeName = nameEl.textContent.trim();
      e.dataTransfer.setData('text/plain', recipeName);
      card.style.opacity = '0.6';

      const slot = card.closest('.meal-slot');
      const dayCard = card.closest('.day-card');
      if (slot && dayCard) {
        const day = dayCard.getAttribute('data-day');
        let mealType = 'breakfast';
        if (slot.classList.contains('lunch')) mealType = 'lunch';
        if (slot.classList.contains('dinner')) mealType = 'dinner';
        dragSource = { day, mealType };
      }
    });

    document.addEventListener('dragend', (e) => {
      const card = e.target.closest('.recipe-card-mini');
      if (card) {
        card.style.opacity = '1';
      }
    });
  }

  function setupAddMealButtons() {
    document.querySelectorAll('.add-meal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const slot = btn.closest('.meal-slot');
        if (slot) {
          // remember which slot user wants to fill
          activeMealSlot = slot;
          // switch to Recipe Collection tab and scroll to it
          const recipeTabBtn = document.querySelector('.tabs .tab-btn[data-tab="recipe-collection"]');
          if (recipeTabBtn) {
            recipeTabBtn.click();
          }
          const recipeSection = document.getElementById('recipe-collection-tab');
          if (recipeSection && typeof recipeSection.scrollIntoView === 'function') {
            recipeSection.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    });
  }

  function setupRecipeCollectionInteractions() {
    // Clicking a recipe in the collection assigns it either to the active slot
    // or to the first empty slot if none is active.
    document.querySelectorAll('#recipe-collection-tab .recipe-card').forEach(card => {
      card.addEventListener('click', () => {
        const titleEl = card.querySelector('h4');
        if (!titleEl) return;
        const recipeName = titleEl.textContent.trim();

        let targetSlot = activeMealSlot;
        if (!targetSlot) {
          const emptyAddBtn = document.querySelector('.meal-slot .add-meal-btn');
          if (emptyAddBtn) {
            targetSlot = emptyAddBtn.closest('.meal-slot');
          }
        }
        if (targetSlot) {
          assignRecipeToSlot(targetSlot, recipeName);
          activeMealSlot = null;
        }
      });
    });
  }

  function showRecipeToast(message) {
    const toast = document.getElementById('recipe-toast');
    const msg = document.getElementById('recipe-toast-message');
    if (!toast || !msg) return;
    msg.textContent = message;
    toast.style.display = 'block';
    // force reflow so class transition works
    void toast.offsetWidth;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.style.display = 'none';
      }, 250);
    }, 2000);
  }

  // Attach listeners to any existing checkboxes / remove buttons (if present from HTML)
  document.querySelectorAll('.grocery-item input[type="checkbox"]').forEach(cb => {
    attachCheckboxListener(cb);
  });
  document.querySelectorAll('.grocery-item .remove-item-btn').forEach(btn => {
    attachRemoveListener(btn);
  });
  document.querySelectorAll('.grocery-item .item-price').forEach(span => {
    attachPriceEditListener(span);
  });

  // Expose auto-suggest globally for button onclick
  window.autoSuggestMeals = autoSuggestMeals;

  // Load any previously saved grocery checklist on page load
  loadGroceryChecklist();

  // Update the dates shown in the "This Week's Meals" section
  updateWeekDates();

  // Set up add-meal buttons, drag-and-drop, recipe collection clicks, and initial meal plan render
  setupAddMealButtons();
  setupMealDragAndDrop();
  setupRecipeCollectionInteractions();

  const storedPlan = loadMealPlan();
  if (storedPlan) {
    renderMealPlan(storedPlan);
  } else {
    const initialPlan = deriveMealPlanFromDOM();
    saveMealPlan(initialPlan);
  }
});


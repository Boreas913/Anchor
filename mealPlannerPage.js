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
  const WEEK_ANCHOR_KEY = 'anchor_weekStart_v1';

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

  function openPriceEditorForItem(li) {
    if (!li) return;
    const label = li.querySelector('label');
    const priceSpan = li.querySelector('.item-price');
    if (!label || !priceSpan) return;

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
  }

  function attachPriceEditListener(priceSpan) {
    if (!priceSpan) return;
    priceSpan.addEventListener('click', () => {
      openPriceEditorForItem(priceSpan.closest('.grocery-item'));
    });
  }

  function attachPriceEditButtonListener(btn) {
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openPriceEditorForItem(btn.closest('.grocery-item'));
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
          <button class="edit-price-btn" aria-label="Edit price" type="button">✎</button>
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
      const editBtn = newItem.querySelector('.edit-price-btn');
      if (editBtn) {
        attachPriceEditButtonListener(editBtn);
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
          <button class="edit-price-btn" aria-label="Edit price" type="button">✎</button>
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
      const editBtn = li.querySelector('.edit-price-btn');
      if (editBtn) {
        attachPriceEditButtonListener(editBtn);
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
  function formatISODate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function getWeekStartMonday(today = new Date()) {
    const d = new Date(today);
    const dow = d.getDay(); // 0=Sun..6=Sat

    // If Sunday, treat next Monday as the start of the new week
    if (dow === 0) {
      d.setDate(d.getDate() + 1);
      return d;
    }

    // Otherwise, go back to Monday of current week
    const diff = 1 - dow;
    d.setDate(d.getDate() + diff);
    return d;
  }

  function updateWeekDates() {
    const monday = getWeekStartMonday(new Date());

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
      instructions: [
        'In a jar, combine oats, almond milk, and chia seeds.',
        'Stir until everything is evenly mixed.',
        'Cover and refrigerate overnight.',
        'In the morning, top with sliced banana and enjoy.'
      ],
      tags: ['Lactose-Free', 'Gluten-Free'],
      time: '5 min',
      color: 'ffb3ba',
      sourceUrl: ''
    },
    'Quinoa Salad': {
      id: 'quinoa-salad',
      ingredients: ['quinoa', 'tomatoes', 'spinach', 'olive oil'],
      instructions: [
        'Cook quinoa according to package directions and let it cool.',
        'Chop tomatoes and add them to a bowl with spinach.',
        'Add cooled quinoa to the bowl.',
        'Drizzle with olive oil, toss well, and season to taste.'
      ],
      tags: ['Lactose-Free', 'Gluten-Free'],
      time: '20 min',
      color: 'ffdfba',
      sourceUrl: ''
    },
    'Grilled Chicken': {
      id: 'grilled-chicken',
      ingredients: ['chicken breast', 'olive oil', 'garlic', 'spinach'],
      instructions: [
        'Season chicken with salt, pepper, and minced garlic.',
        'Heat a grill pan or skillet over medium-high heat and add olive oil.',
        'Cook chicken until done, then let it rest for a few minutes.',
        'Serve with sautéed spinach (or fresh spinach) on the side.'
      ],
      tags: ['Lactose-Free', 'Gluten-Free'],
      time: '30 min',
      color: 'baffc9',
      sourceUrl: ''
    },
    'Mediterranean Bowl': {
      id: 'mediterranean-bowl',
      ingredients: ['quinoa', 'tomatoes', 'spinach', 'olive oil', 'chickpeas'],
      instructions: [
        'Cook and cool quinoa.',
        'In a bowl, combine quinoa, chickpeas, spinach, and chopped tomatoes.',
        'Drizzle with olive oil and mix thoroughly.',
        'Taste and adjust seasoning before serving.'
      ],
      tags: ['Lactose-Free', 'Gluten-Free'],
      time: '25 min',
      color: 'ffb3ba',
      sourceUrl: ''
    },
    'Stir Fry': {
      id: 'stir-fry',
      ingredients: ['chicken breast', 'broccoli', 'bell peppers', 'soy sauce'],
      instructions: [
        'Slice chicken and cut vegetables into bite-size pieces.',
        'Heat a skillet/wok and cook chicken until almost done.',
        'Add broccoli and bell peppers; stir-fry until crisp-tender.',
        'Pour in soy sauce and toss to coat. Serve immediately.'
      ],
      tags: ['Lactose-Free', 'Gluten-Free'],
      time: '20 min',
      color: 'ffdfba',
      sourceUrl: ''
    },
    'Salmon & Veggies': {
      id: 'salmon-veggies',
      ingredients: ['salmon', 'broccoli', 'tomatoes', 'olive oil'],
      instructions: [
        'Preheat oven (or heat a pan) and season salmon.',
        'Roast or steam broccoli until tender.',
        'Warm tomatoes briefly in a pan with olive oil.',
        'Plate salmon with broccoli and tomatoes; drizzle with any remaining olive oil.'
      ],
      tags: ['Lactose-Free', 'Gluten-Free'],
      time: '30 min',
      color: 'baffc9',
      sourceUrl: ''
    }
  };

  // --- RECIPE DETAILS MODAL ---
  function openRecipeDetailsModal(recipeName) {
    const recipe = RECIPE_DATA[recipeName];
    if (!recipe) return;

    const overlay = document.getElementById('recipe-details-overlay');
    const titleEl = document.getElementById('recipe-details-title');
    const tagsEl = document.getElementById('recipe-details-tags');
    const sourceWrap = document.getElementById('recipe-details-source-link-wrap');
    const sourceLinkEl = document.getElementById('recipe-details-source-link');
    const ingredientsEl = document.getElementById('recipe-details-ingredients');
    const instructionsEl = document.getElementById('recipe-details-instructions');

    if (!overlay || !titleEl || !tagsEl || !sourceWrap || !sourceLinkEl || !ingredientsEl || !instructionsEl) return;

    titleEl.textContent = recipeName;

    // Tags
    tagsEl.innerHTML = '';
    (recipe.tags || []).forEach(tag => {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = tag;
      tagsEl.appendChild(span);
    });

    // Optional source link
    if (recipe.sourceUrl) {
      sourceWrap.style.display = 'block';
      sourceLinkEl.href = recipe.sourceUrl;
    } else {
      sourceWrap.style.display = 'none';
    }

    // Ingredients
    ingredientsEl.innerHTML = '';
    (recipe.ingredients || []).forEach(ing => {
      const li = document.createElement('li');
      li.textContent = ing;
      ingredientsEl.appendChild(li);
    });

    // Instructions
    instructionsEl.innerHTML = '';
    (recipe.instructions || []).forEach(step => {
      const li = document.createElement('li');
      li.textContent = step;
      instructionsEl.appendChild(li);
    });

    overlay.style.display = 'flex';
  }

  function closeRecipeDetailsModal() {
    const overlay = document.getElementById('recipe-details-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  // --- IMPORT RECIPE FROM URL (best-effort JSON-LD + manual fallback) ---
  const RECIPE_COLLECTION_STORAGE_KEY = 'anchor_recipeCollection_v1';
  const RECIPE_IMAGE_COLORS = ['ffb3ba', 'ffdfba', 'baffc9', 'ffd6a5', 'cdb4db'];

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function stableColorFromName(name) {
    const s = String(name || '');
    let hash = 0;
    for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
    return RECIPE_IMAGE_COLORS[hash % RECIPE_IMAGE_COLORS.length];
  }

  function getImportedRecipesFromStorage() {
    try {
      const raw = localStorage.getItem(RECIPE_COLLECTION_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to load recipe collection', e);
      return [];
    }
  }

  function saveImportedRecipesToStorage(recipes) {
    try {
      localStorage.setItem(RECIPE_COLLECTION_STORAGE_KEY, JSON.stringify(recipes));
    } catch (e) {
      console.error('Failed to save recipe collection', e);
    }
  }

  function getUniqueImportedRecipeName(baseName) {
    const base = String(baseName || '').trim();
    const start = base || 'Imported Recipe';
    if (!RECIPE_DATA[start]) return start;

    let i = 2;
    while (RECIPE_DATA[`${start} (${i})`]) i++;
    return `${start} (${i})`;
  }

  function upsertRecipeInRECIPE_DATA(recipe) {
    if (!recipe || !recipe.name) return;
    const name = recipe.name;
    RECIPE_DATA[name] = {
      id: recipe.id || `import-${Date.now()}`,
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
      tags: Array.isArray(recipe.tags) ? recipe.tags : [],
      time: recipe.time || '—',
      color: recipe.color || stableColorFromName(name),
      sourceUrl: recipe.sourceUrl || ''
    };
  }

  function renderImportedRecipeCards() {
    const grid = document.querySelector('#recipe-collection-tab .recipe-grid');
    if (!grid) return;

    // Remove previously-rendered imported cards (default cards stay).
    grid.querySelectorAll('.recipe-card[data-imported="true"]').forEach(el => el.remove());

    const imported = getImportedRecipesFromStorage();
    imported.forEach(recipe => {
      // Ensure imported recipes are available to the rest of the app logic.
      upsertRecipeInRECIPE_DATA(recipe);

      const name = recipe.name;
      if (!name) return;

      const color = recipe.color || stableColorFromName(name);
      const timeText = recipe.time || '—';
      const tags = Array.isArray(recipe.tags) ? recipe.tags : [];

      const card = document.createElement('div');
      card.className = 'recipe-card';
      card.setAttribute('data-imported', 'true');
      card.setAttribute('data-recipe-name', name);
      card.innerHTML = `
        <img src="https://via.placeholder.com/200x150/${color}/ffffff?text=Recipe" alt="${escapeHtml(name)}">
        <div class="recipe-card-content">
          <h4>${escapeHtml(name)}</h4>
          <div class="recipe-tags">
            ${tags.length ? tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('') : ''}
          </div>
          <div class="recipe-meta">
            <span>${escapeHtml(timeText)}</span>
            <span>•</span>
            <span>— cal</span>
          </div>
        </div>
      `;

      grid.appendChild(card);
    });
  }

  async function tryParseRecipeFromUrl(url) {
    // Due to CORS, many recipe sites will not be fetchable from the browser.
    // When it fails, we still let the user manually fill ingredients + instructions.
    try {
      const res = await fetch(url, { method: 'GET' });
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');

      const jsonLdScripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
      for (const script of jsonLdScripts) {
        const raw = script.textContent || '';
        if (!raw) continue;
        let data;
        try {
          data = JSON.parse(raw);
        } catch {
          continue;
        }

        const candidates = Array.isArray(data) ? data : [data];
        for (const c of candidates) {
          const obj = c && (c['@type'] ? c : c['@graph'] ? { '@graph': c['@graph'] } : null);
          // If we have an array, look for Recipe
          const maybeRecipes = Array.isArray(obj) ? obj : null;
          const list = obj && obj['@graph'] ? obj['@graph'] : Array.isArray(c) ? c : candidates;
          const nodes = Array.isArray(list) ? list : candidates;

          for (const node of nodes) {
            const t = node && node['@type'];
            const isRecipe = t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'));
            if (!isRecipe) continue;

            const name = node.name || '';
            const ingredient = node.recipeIngredient || [];
            const instructions = node.recipeInstructions || node.instructions || [];

            const ingredients = Array.isArray(ingredient) ? ingredient.map(String) : [];
            const instructionSteps = [];

            // recipeInstructions can be array, object with itemListElement, or string.
            if (Array.isArray(instructions)) {
              instructions.forEach(it => {
                if (typeof it === 'string') instructionSteps.push(it);
                else if (it && it.text) instructionSteps.push(String(it.text));
                else if (it && it.step) instructionSteps.push(String(it.step));
              });
            } else if (instructions && typeof instructions === 'object') {
              if (instructions.itemListElement && Array.isArray(instructions.itemListElement)) {
                instructions.itemListElement.forEach(el => {
                  const v = el && (el.text || el.name);
                  if (v) instructionSteps.push(String(v));
                });
              } else if (instructions.text) {
                instructionSteps.push(String(instructions.text));
              }
            } else if (typeof instructions === 'string') {
              instructionSteps.push(instructions);
            }

            return {
              name: String(name || ''),
              ingredients,
              instructions: instructionSteps
            };
          }
        }
      }

      return null;
    } catch (e) {
      // Most likely CORS failure.
      console.warn('URL fetch/parse failed (likely CORS).', e);
      return null;
    }
  }

  function openImportUrlModal() {
    const overlay = document.getElementById('import-url-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    // Reset fields
    const urlInput = document.getElementById('import-url-input');
    const nameInput = document.getElementById('import-url-name');
    const ingArea = document.getElementById('import-url-ingredients');
    const instArea = document.getElementById('import-url-instructions');
    const status = document.getElementById('import-url-status');

    if (urlInput) urlInput.value = '';
    if (nameInput) nameInput.value = '';
    if (ingArea) ingArea.value = '';
    if (instArea) instArea.value = '';
    if (status) status.textContent = '';
  }

  function closeImportUrlModal() {
    const overlay = document.getElementById('import-url-overlay');
    if (!overlay) return;
    overlay.style.display = 'none';
  }

  async function tryParseAndFillImportModal() {
    const urlInput = document.getElementById('import-url-input');
    const nameInput = document.getElementById('import-url-name');
    const ingArea = document.getElementById('import-url-ingredients');
    const instArea = document.getElementById('import-url-instructions');
    const status = document.getElementById('import-url-status');

    if (!urlInput) return;
    const url = String(urlInput.value || '').trim();
    if (!url) {
      if (status) status.textContent = 'Please paste a recipe URL.';
      return;
    }

    if (status) status.textContent = 'Fetching and parsing...';
    const parsed = await tryParseRecipeFromUrl(url);

    // If parsing succeeded, fill fields.
    if (parsed && parsed.name) {
      if (nameInput) nameInput.value = parsed.name;
      if (ingArea) ingArea.value = (parsed.ingredients || []).join('\n');
      if (instArea) instArea.value = (parsed.instructions || []).join('\n');
      if (status) status.textContent = 'Parsed! You can edit ingredients/instructions before saving.';
      return;
    }

    // Fallback: derive name from URL and leave ingredients/instructions for manual entry.
    const derivedName = (() => {
      try {
        const u = new URL(url);
        const last = u.pathname.split('/').filter(Boolean).pop() || 'Imported Recipe';
        return decodeURIComponent(last).replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      } catch {
        return 'Imported Recipe';
      }
    })();

    if (nameInput) nameInput.value = derivedName;
    if (ingArea) ingArea.value = '';
    if (instArea) instArea.value = '';
    if (status) status.textContent = 'Could not parse this site in the browser (CORS). Add ingredients/instructions manually and save.';
  }

  function readImportModalTags() {
    const lactose = document.getElementById('import-tag-lactose');
    const gluten = document.getElementById('import-tag-gluten');
    const tags = [];
    if (lactose && lactose.checked) tags.push('Lactose-Free');
    if (gluten && gluten.checked) tags.push('Gluten-Free');
    return tags;
  }

  function parseTextareaLines(text) {
    return String(text || '')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);
  }

  function saveImportedRecipe() {
    const urlInput = document.getElementById('import-url-input');
    const nameInput = document.getElementById('import-url-name');
    const ingArea = document.getElementById('import-url-ingredients');
    const instArea = document.getElementById('import-url-instructions');

    const url = String(urlInput?.value || '').trim();
    const baseName = String(nameInput?.value || '').trim();
    if (!baseName) {
      alert('Please provide a recipe name.');
      return;
    }

    const ingredients = parseTextareaLines(ingArea?.value || '');
    const instructions = parseTextareaLines(instArea?.value || '');
    const tags = readImportModalTags();

    const imported = getImportedRecipesFromStorage();

    // Upsert by source URL if possible; otherwise upsert by name.
    const existingIndex = url
      ? imported.findIndex(r => r.sourceUrl === url)
      : imported.findIndex(r => r.name === baseName);

    const finalName =
      existingIndex >= 0 ? imported[existingIndex].name : getUniqueImportedRecipeName(baseName);

    const recipeObj = {
      id: `import-${Date.now()}`,
      name: finalName,
      sourceUrl: url,
      ingredients,
      instructions,
      tags,
      time: '—',
      color: stableColorFromName(finalName)
    };

    if (existingIndex >= 0) imported[existingIndex] = recipeObj;
    else imported.push(recipeObj);

    saveImportedRecipesToStorage(imported);
    upsertRecipeInRECIPE_DATA(recipeObj);

    renderImportedRecipeCards();
    closeImportUrlModal();
    showRecipeToast(`Imported ${finalName} into recipe collection`);
  }

  // Global functions for inline onclick
  window.openImportUrlModal = openImportUrlModal;
  window.closeImportUrlModal = closeImportUrlModal;
  window.tryParseRecipeFromUrl = tryParseAndFillImportModal;
  window.saveImportedRecipe = saveImportedRecipe;

  // Close modal when clicking outside
  document.addEventListener('click', (e) => {
    const overlay = document.getElementById('import-url-overlay');
    if (!overlay) return;
    if (overlay.style.display !== 'flex') return;
    if (e.target === overlay) closeImportUrlModal();
  });

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
        // add-meal buttons use event delegation; nothing to rebind here
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
        const recipe = RECIPE_DATA[name];
        return (
          count < maxPerWeek &&
          recipe &&
          Array.isArray(recipe.ingredients) &&
          recipe.ingredients.length > 0
        );
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
          <button class="edit-price-btn" aria-label="Edit price" type="button">✎</button>
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
      const editBtn = li.querySelector('.edit-price-btn');
      if (editBtn) {
        attachPriceEditButtonListener(editBtn);
      }

      list.appendChild(li);
    });

    saveGroceryChecklist();
  }

  function resetGroceryChecklist() {
    // Clear UI lists
    document.querySelectorAll('.grocery-list').forEach(list => {
      list.innerHTML = '';
    });

    // Clear storage (but keep price cache)
    try {
      localStorage.setItem(GROCERY_STORAGE_KEY, JSON.stringify({ items: [] }));
    } catch (e) {
      console.error('Failed to reset grocery checklist storage', e);
    }

    runningTotal = 0;
    const estimatedEl = document.getElementById('estimated');
    if (estimatedEl) {
      estimatedEl.textContent = `Estimated: $${runningTotal.toFixed(2)}`;
    }
  }

  function resetMealPlan() {
    const empty = getEmptyMealPlan();
    saveMealPlan(empty);
    renderMealPlan(empty);
  }

  function handleWeeklyReset() {
    const now = new Date();
    const weekStart = getWeekStartMonday(now);
    const weekStartISO = formatISODate(weekStart);

    let storedWeekStart = null;
    try {
      storedWeekStart = localStorage.getItem(WEEK_ANCHOR_KEY);
    } catch (e) {
      storedWeekStart = null;
    }

    const isSunday = now.getDay() === 0;
    const isNewWeek = storedWeekStart && storedWeekStart !== weekStartISO;

    // On Sundays, always reset for the upcoming week.
    // Also reset if we detect the week anchor changed (user didn't open on Sunday).
    if (isSunday || isNewWeek) {
      try {
        localStorage.setItem(WEEK_ANCHOR_KEY, weekStartISO);
      } catch (e) {
        console.error('Failed to set week anchor', e);
      }

      // Clear saved meal plan + grocery list and re-render empty state
      try {
        localStorage.setItem(MEAL_PLAN_KEY, JSON.stringify(getEmptyMealPlan()));
      } catch (e) {
        console.error('Failed to reset meal plan storage', e);
      }

      resetGroceryChecklist();
      resetMealPlan();
      updateWeekDates();
      showRecipeToast('New week started — meal plan and grocery list reset');
      return true;
    }

    // First run: set anchor if missing (no reset)
    if (!storedWeekStart) {
      try {
        localStorage.setItem(WEEK_ANCHOR_KEY, weekStartISO);
      } catch (e) {
        console.error('Failed to initialize week anchor', e);
      }
    }

    return false;
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
          // add-meal buttons use event delegation; nothing to rebind here
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

  function openRecipeCollectionForSlot(slot) {
    if (!slot) return;
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

  // Use event delegation so newly-created + Add Recipe buttons always work
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-meal-btn');
    if (!btn) return;
    const slot = btn.closest('.meal-slot');
    openRecipeCollectionForSlot(slot);
  });

  function setupRecipeCollectionInteractions() {
    const collection = document.getElementById('recipe-collection-tab');
    if (!collection) return;

    // Delegated click: works for both default recipes and imported recipes.
    collection.addEventListener('click', (e) => {
      const card = e.target.closest('.recipe-card');
      if (!card) return;

      // Image click opens the recipe details modal (handled elsewhere).
      if (e.target && e.target.tagName === 'IMG') return;

      const titleEl = card.querySelector('h4');
      if (!titleEl) return;
      const recipeName = titleEl.textContent.trim();
      if (!recipeName) return;

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
  }

  // Clicking a recipe picture opens the recipe details modal
  document.addEventListener('click', (e) => {
    // Recipe Collection images
    const collectionImg = e.target.closest('#recipe-collection-tab .recipe-card img');
    if (collectionImg) {
      const card = collectionImg.closest('.recipe-card');
      const titleEl = card ? card.querySelector('h4') : null;
      const recipeName = titleEl ? titleEl.textContent.trim() : '';
      if (recipeName) {
        e.preventDefault();
        e.stopPropagation();
        openRecipeDetailsModal(recipeName);
      }
      return;
    }

    // Weekly mini cards (optional convenience)
    const miniImg = e.target.closest('.recipe-card-mini img');
    if (miniImg) {
      const miniCard = miniImg.closest('.recipe-card-mini');
      const nameEl = miniCard ? miniCard.querySelector('.recipe-name') : null;
      const recipeName = nameEl ? nameEl.textContent.trim() : '';
      if (recipeName) {
        e.preventDefault();
        e.stopPropagation();
        openRecipeDetailsModal(recipeName);
      }
    }
  });

  // Close modal handlers
  const recipeDetailsOverlay = document.getElementById('recipe-details-overlay');
  const recipeDetailsCloseBtn = document.getElementById('recipe-details-close');
  if (recipeDetailsOverlay) {
    recipeDetailsOverlay.addEventListener('click', (e) => {
      if (e.target === recipeDetailsOverlay) {
        closeRecipeDetailsModal();
      }
    });
  }
  if (recipeDetailsCloseBtn) {
    recipeDetailsCloseBtn.addEventListener('click', closeRecipeDetailsModal);
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
  document.querySelectorAll('.grocery-item .edit-price-btn').forEach(btn => {
    attachPriceEditButtonListener(btn);
  });

  // Expose auto-suggest globally for button onclick
  window.autoSuggestMeals = autoSuggestMeals;

  // If Sunday (or week changed), reset everything to empty for the new week
  const didReset = handleWeeklyReset();

  // Load any previously saved grocery checklist on page load (unless we just reset)
  if (!didReset) {
    loadGroceryChecklist();
  }

  // Update the dates shown in the "This Week's Meals" section
  updateWeekDates();

  // Set up drag-and-drop, recipe collection clicks, and initial meal plan render
  setupMealDragAndDrop();
  setupRecipeCollectionInteractions();
  renderImportedRecipeCards();

  const storedPlan = loadMealPlan();
  if (storedPlan) {
    renderMealPlan(storedPlan);
  } else if (!didReset) {
    const initialPlan = deriveMealPlanFromDOM();
    saveMealPlan(initialPlan);
  }
});


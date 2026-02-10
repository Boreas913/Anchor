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

    window.saveCustomItem = function() {
  // 1. Get values from the modal inputs
  const nameVal = document.getElementById("custom-item-modal-name").value;
  const priceVal = document.getElementById("custom-item-modal-price").value;
  let categoryVal = document.getElementById("custom-item-modal-category").value;

  // 2. Validation
  if (nameVal === "" || priceVal === "") {
    alert("Please fill in both name and price");
    return;
  }

  // 3. Find category
  const list = document.getElementById(`list-${categoryVal}`);

  // 4. Create and Append
  if (list) {
    const newItem = document.createElement("li");
    newItem.className = "grocery-item";
    const uniqueId = "custom-" + Date.now();

    newItem.innerHTML = `
        <input type="checkbox" id="${uniqueId}">
        <label for="${uniqueId}">${nameVal}</label>
        <span class="item-price">$${parseFloat(priceVal).toFixed(2)}</span>
    `;
    list.appendChild(newItem);

    // 5. SAVE TO COMPUTER (LocalStorage)
    saveToStorage({
        id: uniqueId,
        name: nameVal,
        price: priceVal,
        category: categoryVal
    });
  } else {
    console.error("Could not find list with ID:", listId);
  }

  // 6. Cleanup
  document.getElementById("custom-item-modal-name").value = "";
  document.getElementById("custom-item-modal-price").value = "";
  modal.style.display = "none"; 

  // Helper Function: Saving the data so it doesn't disappear
  function saveToStorage(item) {
      // Get existing items or start a new array
      let savedItems = JSON.parse(localStorage.getItem("groceryList") || "[]");
      savedItems.push(item);
      // Save it back to the "filing cabinet"
      localStorage.setItem("groceryList", JSON.stringify(savedItems));
  };

  document.addEventListener("DOMContentLoaded", () => {
      // 1. Check the filing cabinet for saved items
      const savedData = localStorage.getItem("groceryList");

      // 2. If there's something there, turn it back into a list (array)
      if (savedData) {
          const items = JSON.parse(savedData);
          // 3. Loop through each item and put it back on the screen
          items.forEach(item => {
              renderSavedItem(item);
          });
      }
  });
 // The Renderer: The "Blueprint" for creating the HTML
  function renderSavedItem(item) {
    const listId = `list-${item.category}`;
    const list = document.getElementById(listId);

    if (list) {
        const newItem = document.createElement("li");
        newItem.className = "grocery-item";

        newItem.innerHTML = `
            <input type="checkbox" id="${item.id}">
            <label for="${item.id}">${item.name}</label>
            <span class="item-price">$${parseFloat(item.price).toFixed(2)}</span>
        `;

        list.appendChild(newItem);
    }
}

}});
//modal mobile friendly, and saves when reloaded
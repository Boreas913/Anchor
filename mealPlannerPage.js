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

    // //const myInput = document.getElementById("custom-item-modal-input");
    // btn.onclick = function(){
    //     modal.style.display = "block";
    // }
    // span.onclick = function(){
    //     modal.style.display = "none";
    // }
    // window.onclick = function(event){
    //     if(event.target == modal){
    //         modal.style.display = "none";
    //     }
    // }
    // inputField.addEventListener("keydown", (event) => {
    // if (event.key === "Enter") {
    //   event.preventDefault();
    //   modal.style.display = "none";
    //   alert("You typed: " + inputField.value); 
    // }
    // });

    // --- PART A: MODAL OPEN/CLOSE LOGIC ---
    // When the user clicks the button, open the modal 
    btn.onclick = function() {
      modal.style.display = "block";
    }

    // When the user clicks on <span> (x), close the modal
    span.onclick = function() {
      modal.style.display = "none";
    }

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    }

    // --- PART B: SAVING THE ITEM TO THE LIST ---

    window.saveCustomItem = function() {
      // 1. Get values from the modal inputs
      const nameVal = document.getElementById("custom-item-modal-name").value;
      const priceVal = document.getElementById("custom-item-modal-price").value;

      // 2. Validation
      if (nameVal === "" || priceVal === "") {
        alert("Please fill in both name and price");
        return;
      }

      // 3. Find the grocery list (from your previous code)
      // Assuming the list has class "grocery-list" or specific ID
      const list = document.querySelector(".grocery-list"); 

      // 4. Create the new list item
      const newItem = document.createElement("li");
      newItem.className = "grocery-item";
      const uniqueId = "custom-" + Date.now();

      newItem.innerHTML = `
          <input type="checkbox" id="${uniqueId}">
          <label for="${uniqueId}">${nameVal}</label>
          <span class="item-price">$${priceVal}</span>
      `;

      // 5. Add to list
      list.appendChild(newItem);

      // 6. Cleanup: Clear inputs and close modal
      document.getElementById("custom-item-modal-name").value = "";
      document.getElementById("custom-item-modal-price").value = "";
      modal.style.display = "none"; // Close the modal automatically
    }
});

//To do: getting it in the right section and getting it to save
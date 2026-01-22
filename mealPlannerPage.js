// Tab Switching Functionality
//document.addEventListener('DOMContentLoaded', function() {
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

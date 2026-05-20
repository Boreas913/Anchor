// --- State Management ---
        const STORE_KEY = 'focusflow_data';
        let appData = {
            tasks: [],
            dailyTasks: []
        };

        // Timer Runtime State (not persisted to localStorage)
        let activeTimer = {
            taskId: null,
            intervalId: null,
            startTime: null,
            accumulatedSeconds: 0,
            isRunning: false,
            estimatedSeconds: 0
        };

        // --- Initialization ---
        document.addEventListener('DOMContentLoaded', () => {
            loadData();
            renderDashboard();
            renderDaily();
            requestNotificationPermission();
            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);
        });

        function loadData() {
            const stored = localStorage.getItem(STORE_KEY);
            if (stored) {
                appData = JSON.parse(stored);
            }
        }

        function saveData() {
            localStorage.setItem(STORE_KEY, JSON.stringify(appData));
        }

        function showToast(msg) {
            const toast = document.getElementById('toast');
            toast.textContent = msg;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }

        function requestNotificationPermission() {
            if ("Notification" in window && Notification.permission !== "granted") {
                Notification.requestPermission();
            }
        }

        // --- Navigation ---
        function switchView(viewName) {
            // Update buttons
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            const clickedBtn = Array.from(document.querySelectorAll('.nav-btn')).find(b => b.textContent.toLowerCase().includes(viewName));
            if(clickedBtn) clickedBtn.classList.add('active');

            // Update sections
            document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
            document.getElementById(`view-${viewName}`).classList.add('active');

            // Toggle "New Task" button visibility (only for dashboard)
            const addBtn = document.getElementById('addTaskBtn');
            if (viewName === 'dashboard') {
                addBtn.style.display = 'block';
            } else {
                addBtn.style.display = 'none';
            }
        }

        // --- Dashboard Logic ---
        function renderDashboard() {
            // Clear columns
            ['todo', 'later', 'someday'].forEach(col => {
                document.getElementById(`col-${col}`).innerHTML = '';
            });

            // Populate columns
            appData.tasks.forEach(task => {
                const card = createTaskCard(task);
                document.getElementById(`col-${task.column}`).appendChild(card);
            });
        }

        function createTaskCard(task) {
            const div = document.createElement('div');
            // Add 'completed' class if status is completed for styling
            div.className = `task-card ${task.status === 'completed' ? 'completed' : ''}`;
            div.draggable = true; // Enable drag
            div.ondragstart = (e) => drag(e, task.id);
            // Clicking the card body (not the button) opens details
            div.onclick = (e) => {
                if(!e.target.closest('.btn-quick-complete')) {
                    openDetailModal(task.id);
                }
            };

            // Status Class
            const statusClass = `status-${task.status}`;
            const statusLabel = task.status.replace('-', ' ');

            // Time Formatting
            const timeStr = formatTimeFriendly(task.estimatedMinutes);

            // Complete Button Icon
            const checkIcon = task.status === 'completed' ? '✓' : '';

            div.innerHTML = `
                <div class="task-header-row">
                    <div class="task-title">${escapeHtml(task.title)}</div>
                    <button class="btn-quick-complete" onclick="quickCompleteTask(${task.id}, event)" title="Mark as Complete">
                        ${checkIcon}
                    </button>
                </div>
                <div class="task-meta">
                    <span class="status-tag ${statusClass}">${statusLabel}</span>
                    <span class="time-est">⏱ ${timeStr}</span>
                </div>
            `;
            return div;
        }

        // New: Quick Complete Function
        function quickCompleteTask(id, event) {
            // Prevent bubbling so we don't open the modal immediately
            if(event) event.stopPropagation();

            const task = appData.tasks.find(t => t.id === id);
            if (!task) return;

            // Toggle status
            if (task.status === 'completed') {
                task.status = 'not-started'; // Undo
            } else {
                task.status = 'completed';
                fireConfetti(); // Trigger visual effect
                showToast("Task Completed! Great job.");
            }

            saveData();
            renderDashboard();
            
            // If the detail modal is open for this task, update it too
            if(currentDetailId === id) {
                document.getElementById('detailStatusSelect').value = task.status;
                updateStatusDisplay(task.status);
            }
        }

        function formatTimeFriendly(minutes) {
            if (!minutes) return '--';
            if (minutes < 60) return `${minutes}m`;
            const h = Math.floor(minutes / 60);
            const m = minutes % 60;
            return `${h}h ${m}m`;
        }

        // --- Drag & Drop ---
        function allowDrop(ev) {
            ev.preventDefault();
        }

        function drag(ev, id) {
            ev.dataTransfer.setData("text/plain", id);
        }

        function drop(ev, newColumn) {
            ev.preventDefault();
            const id = parseInt(ev.dataTransfer.getData("text/plain"));
            const task = appData.tasks.find(t => t.id === id);
            if (task && task.column !== newColumn) {
                task.column = newColumn;
                saveData();
                renderDashboard();
            }
        }

        // --- Task Creation & Editing ---
        function openCreateModal() {
            document.getElementById('modalTitle').textContent = "New Task";
            document.getElementById('taskForm').reset();
            document.getElementById('taskId').value = "";
            document.getElementById('inputColumn').value = 'todo'; // Default
            openModal('taskModal');
        }

        function saveTask() {
            const idVal = document.getElementById('taskId').value;
            const title = document.getElementById('inputTitle').value.trim();
            
            if (!title) {
                showToast("Title is required");
                return;
            }

            const taskObj = {
                id: idVal ? parseInt(idVal) : Date.now(),
                title: title,
                description: document.getElementById('inputDesc').value,
                column: document.getElementById('inputColumn').value,
                status: document.getElementById('inputStatus').value,
                estimatedMinutes: parseInt(document.getElementById('inputTime').value) || 0,
                materials: document.getElementById('inputMaterials').value,
                notes: document.getElementById('inputNotes').value
            };

            if (idVal) {
                // Update existing
                const index = appData.tasks.findIndex(t => t.id === parseInt(idVal));
                if (index !== -1) appData.tasks[index] = taskObj;
            } else {
                // Create new
                appData.tasks.push(taskObj);
            }

            saveData();
            renderDashboard();
            closeModal('taskModal');
            showToast("Task saved successfully");
        }

        // --- Detail View & Timer Logic ---
        let currentDetailId = null;

        function openDetailModal(id) {
            // Stop current timer visual update loop if any
            stopTimerUIUpdate(); 
            
            currentDetailId = id;
            const task = appData.tasks.find(t => t.id === id);
            if (!task) return;

            // Populate Fields
            document.getElementById('detailTitle').textContent = task.title;
            document.getElementById('detailDesc').textContent = task.description || "No description provided.";
            document.getElementById('detailEstTime').textContent = formatTimeFriendly(task.estimatedMinutes);
            document.getElementById('detailMaterials').textContent = task.materials || "None specified";
            document.getElementById('detailNotes').value = task.notes || "";
            
            document.getElementById('detailStatusSelect').value = task.status;
            document.getElementById('detailColumnSelect').value = task.column;

            updateStatusDisplay(task.status);

            // Setup Timer State for this task
            if (activeTimer.taskId === id && activeTimer.isRunning) {
                setupTimerUI(true);
                updateTimerDisplay();
            } else {
                setupTimerUI(false);
                resetTimerDisplay(task.estimatedMinutes * 60);
            }

            openModal('detailModal');
        }

        function updateStatusDisplay(status) {
            const el = document.getElementById('detailStatusDisplay');
            const map = {
                'not-started': 'Not Started',
                'in-progress': 'In Progress',
                'blocked': 'Blocked',
                'on-hold': 'On Hold',
                'completed': 'Completed'
            };
            el.textContent = `Current Status: ${map[status]}`;
        }

        function setupTimerUI(isRunning) {
            const btnStart = document.getElementById('btnStartTimer');
            if (isRunning) {
                btnStart.textContent = "Pause Timer";
                btnStart.classList.remove('start');
                btnStart.style.background = '#d84315';
            } else {
                btnStart.textContent = "Start Timer";
                btnStart.classList.add('start');
                btnStart.style.background = '';
            }
        }

        function toggleTimer() {
            if (activeTimer.isRunning && activeTimer.taskId === currentDetailId) {
                pauseTimer();
            } else {
                if (activeTimer.isRunning && activeTimer.taskId !== currentDetailId) {
                    pauseTimer(); 
                }
                const task = appData.tasks.find(t => t.id === currentDetailId);
                startTimer(task);
            }
        }

        function startTimer(task) {
            if (!task) return;
            
            if (activeTimer.taskId !== task.id) {
                activeTimer.taskId = task.id;
                activeTimer.startTime = Date.now();
                activeTimer.accumulatedSeconds = 0;
                activeTimer.estimatedSeconds = task.estimatedMinutes * 60;
            } else {
                if (!activeTimer.isRunning) {
                    activeTimer.startTime = Date.now(); 
                }
            }

            activeTimer.isRunning = true;
            activeTimer.estimatedSeconds = task.estimatedMinutes * 60;

            setupTimerUI(true);
            
            if ("Notification" in window && Notification.permission === "granted") {
                // Logic if needed
            }

            activeTimer.intervalId = setInterval(() => {
                const now = Date.now();
                const sessionSeconds = Math.floor((now - activeTimer.startTime) / 1000);
                const totalElapsed = activeTimer.accumulatedSeconds + sessionSeconds;
                
                updateTimerDisplay(totalElapsed);

                if (totalElapsed === activeTimer.estimatedSeconds) {
                    sendTimeUpNotification(task.title);
                }

            }, 1000);
        }

        function pauseTimer() {
            if (activeTimer.isRunning && activeTimer.intervalId) {
                clearInterval(activeTimer.intervalId);
                activeTimer.isRunning = false;
                
                const now = Date.now();
                const sessionSeconds = Math.floor((now - activeTimer.startTime) / 1000);
                activeTimer.accumulatedSeconds += sessionSeconds;
                
                setupTimerUI(false);
            }
        }

        function resetTimer() {
            pauseTimer();
            const task = appData.tasks.find(t => t.id === currentDetailId);
            if (task) {
                activeTimer.accumulatedSeconds = 0;
                activeTimer.startTime = null;
                resetTimerDisplay(task.estimatedMinutes * 60);
            }
        }

        function stopTimerUIUpdate() {
            if (activeTimer.intervalId) {
                // Keep it running in background
            }
        }

        function updateTimerDisplay(forceTotal = null) {
            let totalElapsed;
            if (forceTotal !== null) {
                totalElapsed = forceTotal;
            } else {
                const now = Date.now();
                const sessionSeconds = Math.floor((now - activeTimer.startTime) / 1000);
                totalElapsed = activeTimer.accumulatedSeconds + sessionSeconds;
            }

            const displayEl = document.getElementById('timerDisplay');
            if (!displayEl) return; 

            if (totalElapsed <= activeTimer.estimatedSeconds) {
                const remaining = activeTimer.estimatedSeconds - totalElapsed;
                displayEl.textContent = formatSecondsToHMS(remaining);
                displayEl.classList.remove('overtime');
            } else {
                const overtime = totalElapsed - activeTimer.estimatedSeconds;
                displayEl.textContent = "+" + formatSecondsToHMS(overtime);
                displayEl.classList.add('overtime');
            }
        }

        function resetTimerDisplay(estimatedSeconds) {
            const displayEl = document.getElementById('timerDisplay');
            displayEl.textContent = formatSecondsToHMS(estimatedSeconds);
            displayEl.classList.remove('overtime');
        }

        function formatSecondsToHMS(seconds) {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = seconds % 60;
            const pad = (n) => n.toString().padStart(2, '0');
            return `${pad(h)}:${pad(m)}:${pad(s)}`;
        }

        function sendTimeUpNotification(taskTitle) {
            showToast(`Time is up for: ${taskTitle}`);
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification("FocusFlow Timer", {
                    body: `Time is up for: ${taskTitle}`,
                    icon: "https://picsum.photos/seed/clock/64/64.jpg"
                });
            }
        }

        function updateTaskStatusFromDetail() {
            const newStatus = document.getElementById('detailStatusSelect').value;
            const task = appData.tasks.find(t => t.id === currentDetailId);
            if (task) {
                task.status = newStatus;
                saveData();
                renderDashboard();
                updateStatusDisplay(newStatus);
            }
        }

        function updateTaskColumnFromDetail() {
            const newCol = document.getElementById('detailColumnSelect').value;
            const task = appData.tasks.find(t => t.id === currentDetailId);
            if (task) {
                task.column = newCol;
                saveData();
                renderDashboard();
            }
        }

        function saveNotesFromDetail() {
            const task = appData.tasks.find(t => t.id === currentDetailId);
            if (task) {
                task.notes = document.getElementById('detailNotes').value;
                saveData();
            }
        }

        function deleteCurrentTask() {
            if(confirm("Are you sure you want to delete this task?")) {
                appData.tasks = appData.tasks.filter(t => t.id !== currentDetailId);
                if (activeTimer.taskId === currentDetailId) {
                    pauseTimer();
                    activeTimer.taskId = null;
                }
                saveData();
                renderDashboard();
                closeModal('detailModal');
                showToast("Task deleted");
            }
        }

        // --- Daily View Logic ---
        function renderDaily() {
            const container = document.getElementById('daily-list-container');
            container.innerHTML = '';

            appData.dailyTasks.forEach((dt, index) => {
                const div = document.createElement('div');
                div.className = `daily-item ${dt.done ? 'done' : ''}`;
                div.innerHTML = `
                    <input type="checkbox" class="daily-checkbox" ${dt.done ? 'checked' : ''} onchange="toggleDaily(${index})">
                    <span class="daily-label">${escapeHtml(dt.title)}</span>
                    <button class="btn-timer" style="border:none; color: var(--text-muted); background:none;" onclick="deleteDaily(${index})">&times;</button>
                `;
                container.appendChild(div);
            });
        }

        function addDailyTaskPrompt() {
            const title = prompt("Enter daily habit:");
            if (title && title.trim()) {
                appData.dailyTasks.push({ title: title.trim(), done: false });
                saveData();
                renderDaily();
            }
        }

        function toggleDaily(index) {
            appData.dailyTasks[index].done = !appData.dailyTasks[index].done;
            saveData();
            renderDaily();
        }

        function deleteDaily(index) {
            appData.dailyTasks.splice(index, 1);
            saveData();
            renderDaily();
        }

        // --- Utilities ---
        function openModal(id) {
            document.getElementById(id).classList.add('open');
        }

        function closeModal(id) {
            document.getElementById(id).classList.remove('open');
        }

        function escapeHtml(text) {
            if (!text) return "";
            return text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        window.onclick = function(event) {
            if (event.target.classList.contains('modal-overlay')) {
                event.target.classList.remove('open');
            }
        }

        // --- Confetti Engine (Vanilla JS) ---
        const canvas = document.getElementById("confetti-canvas");
        const ctx = canvas.getContext("2d");
        let particles = [];
        
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        function createParticle() {
            const colors = ['#d4a373', '#e76f51', '#ffffff', '#ffe8d6'];
            return {
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
                r: Math.random() * 6 + 2, // radius
                dx: (Math.random() - 0.5) * 15,
                dy: (Math.random() - 0.5) * 15,
                color: colors[Math.floor(Math.random() * colors.length)],
                tilt: Math.random() * 10,
                tiltAngle: Math.random() * 10,
                life: 100
            };
        }

        function fireConfetti() {
            // Create burst
            for (let i = 0; i < 100; i++) {
                particles.push(createParticle());
            }
            if (particles.length <= 100) {
                requestAnimationFrame(updateConfetti);
            }
        }

        function updateConfetti() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            particles.forEach((p, index) => {
                p.tiltAngle += 0.1;
                p.y += (Math.cos(p.tiltAngle) + 1 + p.r / 2) * 0.5; // Gravity
                p.x += Math.sin(p.tiltAngle) * 2;
                p.life--;
                
                ctx.beginPath();
                ctx.lineWidth = p.r / 2;
                ctx.strokeStyle = p.color;
                ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
                ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
                ctx.stroke();

                if (p.life <= 0) {
                    particles.splice(index, 1);
                }
            });

            if (particles.length > 0) {
                requestAnimationFrame(updateConfetti);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
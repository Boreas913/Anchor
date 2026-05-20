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
            div.className = 'task-card';
            div.draggable = true; // Enable drag
            div.ondragstart = (e) => drag(e, task.id);
            div.onclick = () => openDetailModal(task.id);

            // Status Class
            const statusClass = `status-${task.status}`;
            const statusLabel = task.status.replace('-', ' ');

            // Time Formatting
            const timeStr = formatTimeFriendly(task.estimatedMinutes);

            div.innerHTML = `
                <div class="task-title">${escapeHtml(task.title)}</div>
                <div class="task-meta">
                    <span class="status-tag ${statusClass}">${statusLabel}</span>
                    <span class="time-est">⏱ ${timeStr}</span>
                </div>
            `;
            return div;
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
            // Stop any timer running if switching tasks? 
            // Decision: Keep timer running in background, but UI shows current task.
            
            // If switching to a different task while one is running, we could warn or just switch.
            // For simplicity, we update the UI to the new task, but timer state remains attached to the previous task ID.
            
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
            // Check if this task already has a timer running in our runtime state
            if (activeTimer.taskId === id && activeTimer.isRunning) {
                // It's already running
                setupTimerUI(true);
                updateTimerDisplay(); // Immediate refresh
            } else {
                // It's not running, or a different task was running
                setupTimerUI(false);
                // Reset display to estimated time or 0?
                // Let's show estimated time initially if not started
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
                btnStart.style.background = '#d84315'; // Orange-ish for pause
            } else {
                btnStart.textContent = "Start Timer";
                btnStart.classList.add('start');
                btnStart.style.background = ''; // Reset to class style
            }
        }

        function toggleTimer() {
            if (activeTimer.isRunning && activeTimer.taskId === currentDetailId) {
                // Pause
                pauseTimer();
            } else {
                // Start
                // If a different task was running, pause it first? 
                // No, let's allow context switching. But for simplicity in this tool, we pause the previous one.
                if (activeTimer.isRunning && activeTimer.taskId !== currentDetailId) {
                    // Just stop tracking the old one visually, logic-wise we could switch, 
                    // but let's implement "One Active Timer" policy for simplicity.
                    pauseTimer(); 
                }

                const task = appData.tasks.find(t => t.id === currentDetailId);
                startTimer(task);
            }
        }

        function startTimer(task) {
            if (!task) return;
            
            // Initialize or Resume
            if (activeTimer.taskId !== task.id) {
                // New timer session
                activeTimer.taskId = task.id;
                activeTimer.startTime = Date.now();
                activeTimer.accumulatedSeconds = 0;
                activeTimer.estimatedSeconds = task.estimatedMinutes * 60;
            } else {
                // Resuming: Adjust start time so the diff matches accumulation
                // Actually simpler: accumulatedSeconds holds the PAST time. 
                // When we pause, we calculate diff. When we start, we reset startTime to Now.
                // But wait, if we pause, we need to store how long we ran.
                
                // Logic refinement:
                // isRunning = true.
                // interval runs every 1s.
                // currentTotal = accumulatedSeconds + (Now - startTime).
            }

            // If we are starting from a paused state (startTime is old)
            // We only reset startTime if we weren't running.
            if (!activeTimer.isRunning) {
                activeTimer.startTime = Date.now(); 
            }

            activeTimer.isRunning = true;
            activeTimer.estimatedSeconds = task.estimatedMinutes * 60;

            setupTimerUI(true);
            
            // Notification Request
            if ("Notification" in window && Notification.permission === "granted") {
                // If we wanted to notify start, we could here.
            }

            // Start Tick
            activeTimer.intervalId = setInterval(() => {
                const now = Date.now();
                const sessionSeconds = Math.floor((now - activeTimer.startTime) / 1000);
                const totalElapsed = activeTimer.accumulatedSeconds + sessionSeconds;
                
                updateTimerDisplay(totalElapsed);

                // Check for completion (zero crossing)
                // We track if we have already alerted to avoid spamming
                if (totalElapsed === activeTimer.estimatedSeconds) {
                    sendTimeUpNotification(task.title);
                }

            }, 1000);
        }

        function pauseTimer() {
            if (activeTimer.isRunning && activeTimer.intervalId) {
                clearInterval(activeTimer.intervalId);
                activeTimer.isRunning = false;
                
                // Save the session time into accumulated
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
                // We don't clear the interval here if we want it to run in background, 
                // but for this simple single-page app, let's assume timer stops if we close modal?
                // The prompt implies persistence. "Timer runs out... trigger notification".
                // So we MUST keep interval running even if modal closed.
                // However, `updateTimerDisplay` relies on DOM elements which might be missing.
                // Safest approach: Keep interval running, but update DOM only if visible.
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
            if (!displayEl) return; // Modal closed

            if (totalElapsed <= activeTimer.estimatedSeconds) {
                // Countdown Mode
                const remaining = activeTimer.estimatedSeconds - totalElapsed;
                displayEl.textContent = formatSecondsToHMS(remaining);
                displayEl.classList.remove('overtime');
            } else {
                // Overtime Mode
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
            // Play a subtle sound? (Browsers often block auto-audio, so relying on visual/toast)
        }

        function updateTaskStatusFromDetail() {
            const newStatus = document.getElementById('detailStatusSelect').value;
            const task = appData.tasks.find(t => t.id === currentDetailId);
            if (task) {
                task.status = newStatus;
                saveData();
                renderDashboard(); // Update card color in background
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
                
                // If timer was running on this, stop it
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
            // If closing detail modal, we do NOT stop the timer, so it keeps running in background.
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

        // Close modal on outside click
        window.onclick = function(event) {
            if (event.target.classList.contains('modal-overlay')) {
                event.target.classList.remove('open');
            }
        }
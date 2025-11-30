document.addEventListener('DOMContentLoaded', () => {
  // Initialize tasks
  let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
  let currentFilter = 'all';
  let currentSort = 'due-date';
  let editingTaskId = null;

  // DOM Elements
  const taskList = document.getElementById('task-list');
  const taskForm = document.getElementById('task-form');
  const taskModal = document.getElementById('task-modal');
  const searchInput = document.getElementById('search-tasks');
  const emptyState = document.getElementById('empty-state');
  const taskTemplate = document.getElementById('task-template');
  
  // Buttons
  const addTaskBtn = document.getElementById('add-task-btn');
  const addTaskBtnMobile = document.getElementById('add-task-btn-mobile');
  const closeModalBtn = document.getElementById('close-modal');
  const cancelTaskBtn = document.getElementById('cancel-task');
  const saveTaskBtn = document.getElementById('save-task');
  const themeToggleBtn = document.getElementById('theme-toggle');
  const sidebarToggleBtn = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('aside');

  // Form Fields
  const taskIdInput = document.getElementById('task-id');
  const taskTitleInput = document.getElementById('task-title');
  const taskDescriptionInput = document.getElementById('task-description');
  const taskDueDateInput = document.getElementById('task-due-date');
  const priorityBtns = document.querySelectorAll('.priority-btn');
  
  // Priority selection
  let selectedPriority = 'medium';
  
  // Initialize the app
  init();

  function init() {
    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      document.documentElement.classList.add(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }

    // Event Listeners
    addTaskBtn.addEventListener('click', openAddTaskModal);
    addTaskBtnMobile.addEventListener('click', openAddTaskModal);
    closeModalBtn.addEventListener('click', closeTaskModal);
    cancelTaskBtn.addEventListener('click', closeTaskModal);
    taskForm.addEventListener('submit', handleTaskSubmit);
    themeToggleBtn.addEventListener('click', toggleTheme);
    searchInput.addEventListener('input', filterTasksBySearch);
    sidebarToggleBtn.addEventListener('click', toggleSidebar);
    
    // Filter and Sort buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentFilter = btn.dataset.filter;
        updateActiveFilterButton();
        renderTasks();
      });
    });
    
    document.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentSort = btn.dataset.sort;
        updateActiveSortButton();
        renderTasks();
      });
    });

    // Priority buttons
    priorityBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        selectedPriority = btn.dataset.priority;
        updateActivePriorityButton();
      });
    });

    // Initial render
    renderTasks();
    updateActiveFilterButton();
    updateActiveSortButton();
    updateActivePriorityButton();
    feather.replace();
  }

  function renderTasks() {
    // Clear the task list
    taskList.innerHTML = '';
    
    // Filter tasks
    let filteredTasks = filterTasks(tasks);
    
    // Sort tasks
    filteredTasks = sortTasks(filteredTasks);
    
    // Render each task or empty state
    if (filteredTasks.length === 0) {
      const emptyStateClone = emptyState.content.cloneNode(true);
      taskList.appendChild(emptyStateClone);
    } else {
      filteredTasks.forEach(task => {
        const taskElement = createTaskElement(task);
        taskList.appendChild(taskElement);
      });
    }
    
    feather.replace();
  }

  function filterTasks(tasks) {
    switch(currentFilter) {
      case 'pending':
        return tasks.filter(task => !task.completed);
      case 'completed':
        return tasks.filter(task => task.completed);
      case 'high':
        return tasks.filter(task => task.priority === 'high' || task.priority === 'urgent');
      default:
        return [...tasks];
    }
  }

  function sortTasks(tasks) {
    switch(currentSort) {
      case 'priority':
        return [...tasks].sort((a, b) => {
          const priorityOrder = { 'urgent': 0, 'high': 1, 'medium': 2, 'low': 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
      case 'newest':
        return [...tasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'due-date':
      default:
        return [...tasks].sort((a, b) => {
          // Tasks without due date go to the end
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        });
    }
  }

  function createTaskElement(task) {
    const taskElement = taskTemplate.content.cloneNode(true).firstElementChild;
    
    // Set task ID
    taskElement.dataset.taskId = task.id;
    
    // Set border color based on priority
    taskElement.classList.add(`border-priority-${task.priority}`);
    
    // Set task data
    taskElement.querySelector('.task-title').textContent = task.title;
    taskElement.querySelector('.task-description').textContent = task.description || 'No description';
    
    // Format due date
    const dueDateElement = taskElement.querySelector('.task-due-date');
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      dueDateElement.textContent = dueDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      
      // Add warning class if task is overdue
      if (!task.completed && dueDate < new Date() && dueDate.toDateString() !== new Date().toDateString()) {
        dueDateElement.classList.add('text-red-500', 'dark:text-red-400');
      }
    } else {
      dueDateElement.textContent = 'No due date';
    }
    
    // Set priority
    const priorityElement = taskElement.querySelector('.task-priority');
    priorityElement.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
    priorityElement.classList.add(`priority-${task.priority}`);
    
    // Set completed state
    if (task.completed) {
      const checkbox = taskElement.querySelector('.complete-btn div');
      checkbox.classList.add('border-primary-500');
      checkbox.querySelector('.checkmark').classList.remove('hidden');
      
      const title = taskElement.querySelector('.task-title');
      title.classList.add('line-through', 'text-gray-400', 'dark:text-gray-500');
    }
    
    // Add event listeners
    taskElement.querySelector('.complete-btn').addEventListener('click', () => toggleTaskComplete(task.id));
    taskElement.querySelector('.edit-btn').addEventListener('click', () => openEditTaskModal(task.id));
    taskElement.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));
    
    // Drag and drop functionality
    taskElement.addEventListener('dragstart', handleDragStart);
    taskElement.addEventListener('dragover', handleDragOver);
    taskElement.addEventListener('dragleave', handleDragLeave);
    taskElement.addEventListener('drop', handleDrop);
    taskElement.addEventListener('dragend', handleDragEnd);
    
    return taskElement;
  }

  function openAddTaskModal() {
    editingTaskId = null;
    taskIdInput.value = '';
    taskForm.reset();
    selectedPriority = 'medium';
    updateActivePriorityButton();
    document.getElementById('modal-title').textContent = 'Add New Task';
    openModal();
  }

  function openEditTaskModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    editingTaskId = taskId;
    taskIdInput.value = task.id;
    taskTitleInput.value = task.title;
    taskDescriptionInput.value = task.description || '';
    taskDueDateInput.value = task.dueDate ? task.dueDate.split('T')[0] : '';
    selectedPriority = task.priority;
    updateActivePriorityButton();
    document.getElementById('modal-title').textContent = 'Edit Task';
    openModal();
  }

  function openModal() {
    taskModal.classList.remove('hidden');
    setTimeout(() => {
      taskModal.querySelector('div').classList.add('modal-enter');
      taskModal.querySelector('div > div').classList.add('modal-content-enter');
    }, 10);
  }

  function closeTaskModal() {
    taskModal.querySelector('div').classList.remove('modal-enter');
    taskModal.querySelector('div > div').classList.remove('modal-content-enter');
    setTimeout(() => {
      taskModal.classList.add('hidden');
    }, 300);
  }

  function handleTaskSubmit(e) {
    e.preventDefault();
    
    const title = taskTitleInput.value.trim();
    if (!title) return;
    
    const taskData = {
      title,
      description: taskDescriptionInput.value.trim(),
      dueDate: taskDueDateInput.value || null,
      priority: selectedPriority,
      completed: false,
      createdAt: new Date().toISOString()
    };
    
    if (editingTaskId) {
      // Update existing task
      const taskIndex = tasks.findIndex(t => t.id === editingTaskId);
      if (taskIndex !== -1) {
        // Preserve completion status and creation date
        taskData.completed = tasks[taskIndex].completed;
        taskData.createdAt = tasks[taskIndex].createdAt;
        tasks[taskIndex] = { ...tasks[taskIndex], ...taskData };
      }
    } else {
      // Add new task
      taskData.id = Date.now().toString();
      tasks.unshift(taskData);
    }
    
    saveTasks();
    closeTaskModal();
    renderTasks();
  }

  function toggleTaskComplete(taskId) {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;
    
    tasks[taskIndex].completed = !tasks[taskIndex].completed;
    saveTasks();
    renderTasks();
  }

  function deleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
      tasks = tasks.filter(t => t.id !== taskId);
      saveTasks();
      renderTasks();
    }
  }

  function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }

  function filterTasksBySearch() {
    const searchTerm = searchInput.value.toLowerCase();
    const allTaskElements = document.querySelectorAll('.task-item');
    
    if (!searchTerm) {
      allTaskElements.forEach(el => el.classList.remove('hidden'));
      return;
    }
    
    allTaskElements.forEach(el => {
      const title = el.querySelector('.task-title').textContent.toLowerCase();
      const description = el.querySelector('.task-description').textContent.toLowerCase();
      
      if (title.includes(searchTerm) || description.includes(searchTerm)) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });
  }

  function toggleTheme() {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
    feather.replace();
  }

  function toggleSidebar() {
    sidebar.classList.toggle('hidden');
  }

  function updateActiveFilterButton() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === currentFilter);
      if (btn.dataset.filter === currentFilter) {
        btn.classList.add('bg-gray-100', 'dark:bg-gray-700');
      } else {
        btn.classList.remove('bg-gray-100', 'dark:bg-gray-700');
      }
    });
  }

  function updateActiveSortButton() {
    document.querySelectorAll('.sort-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sort === currentSort);
      if (btn.dataset.sort === currentSort) {
        btn.classList.add('bg-gray-100', 'dark:bg-gray-700');
      } else {
        btn.classList.remove('bg-gray-100', 'dark:bg-gray-700');
      }
    });
  }

  function updateActivePriorityButton() {
    priorityBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.priority === selectedPriority);
      if (btn.dataset.priority === selectedPriority) {
        if (selectedPriority === 'low') {
          btn.classList.add('bg-blue-100', 'text-blue-800', 'dark:bg-blue-900', 'dark:text-blue-100');
        } else if (selectedPriority === 'medium') {
          btn.classList.add('bg-green-100', 'text-green-800', 'dark:bg-green-900', 'dark:text-green-100');
        } else if (selectedPriority === 'high') {
          btn.classList.add('bg-red-100', 'text-red-800', 'dark:bg-red-900', 'dark:text-red-100');
        } else if (selectedPriority === 'urgent') {
          btn.classList.add('bg-orange-100', 'text-orange-800', 'dark:bg-orange-900', 'dark:text-orange-100');
        }
      } else {
        btn.classList.remove(
          'bg-blue-100', 'text-blue-800', 'dark:bg-blue-900', 'dark:text-blue-100',
          'bg-green-100', 'text-green-800', 'dark:bg-green-900', 'dark:text-green-100',
          'bg-red-100', 'text-red-800', 'dark:bg-red-900', 'dark:text-red-100',
          'bg-orange-100', 'text-orange-800', 'dark:bg-orange-900', 'dark:text-orange-100'
        );
      }
    });
  }

  // Drag and Drop functions
  let draggedItem = null;

  function handleDragStart(e) {
    draggedItem = this;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      this.classList.add('being-dragged');
    }, 0);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drag-over');
  }

  function handleDragLeave() {
    this.classList.remove('drag-over');
  }

  function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    
    if (draggedItem !== this) {
      const taskItems = Array.from(document.querySelectorAll('.task-item'));
      const fromIndex = taskItems.indexOf(draggedItem);
      const toIndex = taskItems.indexOf(this);
      
      // Reorder tasks array
      const [removed] = tasks.splice(fromIndex, 1);
      tasks.splice(toIndex, 0, removed);
      
      // Save and re-render
      saveTasks();
      renderTasks();
    }
  }

  function handleDragEnd() {
    this.classList.remove('being-dragged');
    document.querySelectorAll('.task-item').forEach(item => {
      item.classList.remove('drag-over');
    });
  }
});
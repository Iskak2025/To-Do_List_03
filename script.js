// ===============================
// CONFIG
// ===============================
const API_URL = "https://api.api-ninjas.com/v1/bucketlist";
const API_KEY = "4Re1NEI5kNbmIoOIc5jhfA==2TMRQh4gemoi7kT0";

// DOM элементы
const todoInput = document.getElementById('todo-input');
const addButton = document.getElementById('add-button');
const deleteAllButton = document.getElementById('delete-all');
const deleteSelectedButton = document.getElementById('delete-selected');
const allTodos = document.getElementById('all-todos');
const cCountEl = document.getElementById('c-count');
const rCountEl = document.getElementById('r-count');
const loadApiButton = document.getElementById('load-api');

// LOCAL STORAGE ключ
const STORAGE_KEY = 'todo_local_cache';

let todoList = [];

// ===============================
// HELPERS
// ===============================
function safeId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 5);
}

function showError(msg, err = null) {
  console.error(msg, err);
  alert(msg);
}

// ===============================
// LOCAL STORAGE
// ===============================
function saveLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todoList));
  } catch (e) {
    console.error("Ошибка сохранения в localStorage", e);
  }
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) todoList = JSON.parse(raw);
  } catch (e) {
    console.error("Ошибка чтения из localStorage", e);
    todoList = [];
  }
}

// ===============================
// API FUNCTIONS (ONE request, robust)
// ===============================
async function fetchOneIdea() {
  const res = await fetch(API_URL, {
    headers: { "X-Api-Key": API_KEY }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API request failed: ${res.status} ${res.statusText}. ${text}`);
  }

  const data = await res.json().catch(() => null);
  if (!data) throw new Error("API вернул пустой или не-JSON ответ");
  let text = null;

  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    if (typeof first === 'string') text = first;
    else if (first.item) text = first.item;
    else if (first.idea) text = first.idea;
    else if (first.text) text = first.text;
    else {
      // возьмем первое строковое поле, если есть
      for (const k in first) {
        if (typeof first[k] === 'string' && first[k].trim()) {
          text = first[k];
          break;
        }
      }
    }
  } else if (typeof data === 'object' && data !== null) {
    if (data.item) text = data.item;
    else if (data.idea) text = data.idea;
    else if (data.text) text = data.text;
    else {
      for (const k in data) {
        if (typeof data[k] === 'string' && data[k].trim()) {
          text = data[k];
          break;
        }
      }
    }
  } else if (typeof data === 'string') {
    text = data;
  }

  if (!text) throw new Error("Не удалось извлечь текст задачи из ответа API");

  return text;
}

let isFetching = false; 

async function loadFromAPI() {
  if (isFetching) return;
  isFetching = true;
  loadApiButton.disabled = true;
  loadApiButton.textContent = "Loading...";

  try {
    const ideaText = await fetchOneIdea(); 

    const ideaTask = {
      id: safeId(),
      task: ideaText,
      complete: false
    };

    todoList.push(ideaTask);
    saveLocal();
    render();
  } catch (e) {
    showError("Ошибка загрузки API (Ninjas). Посмотри консоль для деталей.", e);
  } finally {
    isFetching = false;
    loadApiButton.disabled = false;
    loadApiButton.textContent = "Load API tasks";
  }
}

async function apiAdd(taskObj) { return taskObj; }
async function apiUpdate(task) {}
async function apiDelete(id) {}

// ===============================
// RENDER
// ===============================
function render(list = todoList) {
  allTodos.innerHTML = '';

  if (list.length === 0) {
    allTodos.innerHTML = '<li style="color:#fff;text-align:center;padding:12px">No tasks...</li>';
    updateCounts();
    return;
  }

  list.forEach(item => {
    const li = document.createElement('li');
    li.className = 'todo-item';
    li.dataset.id = item.id;

    const p = document.createElement('p');
    p.className = 'todo-text' + (item.complete ? ' line' : '');
    p.textContent = item.task || "(empty)";

    const actions = document.createElement('div');
    actions.className = 'todo-actions';

    const btnComplete = document.createElement('button');
    btnComplete.className = 'circle-btn';
    if (item.complete) btnComplete.classList.add('completed');

    const btnDelete = document.createElement('button');
    btnDelete.className = 'delete btn-error';
    btnDelete.innerHTML = '<i class="bx bx-trash"></i>';

    actions.append(btnComplete, btnDelete);
    li.append(p, actions);
    allTodos.appendChild(li);
  });

  updateCounts();
}

function updateCounts() {
  rCountEl.textContent = todoList.length;
  cCountEl.textContent = todoList.filter(t => t.complete).length;
}

function createTodo(text) {
  return { task: text, id: safeId(), complete: false };
}

// ===============================
// CRUD OPERATIONS
// ===============================
async function add() {
  const value = todoInput.value.trim();
  if (!value) {
    alert('Task cannot be empty');
    return;
  }

  let newTask = createTodo(value);
  todoInput.value = "";

  const apiTask = await apiAdd(newTask);
  todoList.push(apiTask);

  saveLocal();
  render();
}

async function deleteAll() {
  if (!confirm("Delete ALL tasks?")) return;

  todoList = [];
  saveLocal();
  render();
}

async function deleteSelected() {
  todoList = todoList.filter(t => !t.complete);
  saveLocal();
  render();
}

async function toggleCompleteById(id) {
  todoList = todoList.map(t =>
    t.id === id ? { ...t, complete: !t.complete } : t
  );

  const updated = todoList.find(t => t.id === id);
  await apiUpdate(updated);

  saveLocal();
  render();
}

async function deleteById(id) {
  await apiDelete(id);
  todoList = todoList.filter(t => t.id !== id);
  saveLocal();
  render();
}

// ===============================
// EVENTS
// ===============================
addButton.addEventListener('click', add);
todoInput.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
deleteAllButton.addEventListener('click', deleteAll);
deleteSelectedButton.addEventListener('click', deleteSelected);
loadApiButton.addEventListener('click', loadFromAPI);

allTodos.addEventListener('click', e => {
  const li = e.target.closest('.todo-item');
  if (!li) return;

  const deleteBtn = e.target.closest('button.delete');
  if (deleteBtn) {
    if (confirm("Delete this task?")) deleteById(li.dataset.id);
    return;
  }

  toggleCompleteById(li.dataset.id);
});

document.addEventListener('click', e => {
  if (e.target.id === 'all') {
    e.preventDefault();
    render(todoList);
  }
  if (e.target.id === 'rem') {
    e.preventDefault();
    render(todoList.filter(t => !t.complete));
  }
  if (e.target.id === 'com') {
    e.preventDefault();
    render(todoList.filter(t => t.complete));
  }
});

// Dropdown
const dropdown = document.querySelector('.dropdown');
const dropBtn = document.querySelector('.dropbtn');
if (dropBtn) {
  dropBtn.addEventListener('click', () => {
    dropdown.classList.toggle('open');
  });
}
document.addEventListener('click', (e) => {
  if (dropdown && !dropdown.contains(e.target)) dropdown.classList.remove('open');
});

// INIT
loadLocal();
render();

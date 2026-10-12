/**
 * Tasks & Daily Schedule Planner
 */

class TaskManager {
  constructor(renderCallback) {
    this.tasks = StorageManager.getTasks();
    this.currentCategory = 'All';
    this.renderCallback = renderCallback;
  }

  getFilteredTasks() {
    if (this.currentCategory === 'All') return this.tasks;
    if (this.currentCategory === 'Completed') return this.tasks.filter(t => t.completed);
    return this.tasks.filter(t => t.category === this.currentCategory);
  }

  addTask(text, category = 'Academic', priority = 'P2') {
    if (!text || !text.trim()) return;
    const newTask = {
      id: 't-' + Date.now(),
      text: text.trim(),
      category,
      priority,
      completed: false,
      createdAt: Date.now(),
      pomodoros: 0
    };
    this.tasks.unshift(newTask);
    this.save();
  }

  toggleTask(id) {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      this.save();
    }
  }

  deleteTask(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.save();
  }

  incrementPomodoro(id) {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.pomodoros = (task.pomodoros || 0) + 1;
      this.save();
    }
  }

  clearCompleted() {
    this.tasks = this.tasks.filter(t => !t.completed);
    this.save();
  }

  setCategory(category) {
    this.currentCategory = category;
    if (this.renderCallback) this.renderCallback();
  }

  save() {
    StorageManager.saveTasks(this.tasks);
    if (this.renderCallback) this.renderCallback();
  }
}

window.TaskManager = TaskManager;

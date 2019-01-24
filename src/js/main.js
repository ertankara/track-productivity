(() => {

  class Task {
    constructor(task) {
      this.task = task;
      this.isDone = false;
      this.id = Math.random().toString(36).substr(2);
      this.timeStamp = Date.now();
      this.timeSpent = 0; // in ms
    }
  }


  function convertTimeFromMs(timeInMs) {
    const seconds = Number.parseInt((timeInMs / 1000) % 60);
    const minutes = Number.parseInt((timeInMs / 60000) % 60);
    const hours = Number.parseInt((timeInMs / 3.6e+6) % 24);
    const days = Number.parseInt((timeInMs / 8.64e+7) % 30);
    // const months = Number.parseInt((timeInMs / 2.628e+9)); // Roughly
    // const years = Number.parseInt((timeInMs /  3.154e+10));

    return {
      seconds,
      minutes,
      hours,
      days,
      // months,
      // years
    }
  }

  // ================== MODAL ================== //

  const modal = {
    _tasks: [],
    _currentTask: {},

    init() {
      if (localStorage && localStorage.length !== 0) {
        if (localStorage.tasks)
          this._tasks = this.getTasksFromStorage();

        if (localStorage.isTimerPaused) { // Check if any value exists, not an actual bool comparison
          const isTimerPaused = /true/.test(localStorage.isTimerPaused);
          if (!isTimerPaused) {
            app.startCounter(true);
          }
        }
      }
      else {
        // set default values
        this.setAllTasksInternally([]);
        if (localStorage) {
          localStorage.isTimerPaused = true;
          this.storeTasksInLocalStorage([]);
        }
      }

      if (localStorage && !localStorage.totalTimeSpent)
        localStorage.totalTimeSpent = 0;

      this.setNextUndoneTask();
    },

    set currentTask(newTask) {
      this._currentTask = newTask;
    },

    get currentTask() {
      return this._currentTask;
    },

    storeTaskInternally(task) {
      this._tasks.push(task);
      this.storeTasksInLocalStorage(this._tasks);
    },

    storeTasksInLocalStorage(tasks) {
      localStorage.tasks = JSON.stringify(tasks);
    },

    setAllTasksInternally(taskArray) {
      this._tasks = taskArray;
    },

    getNextUndoneTaskFromArray() {
      // If tasks exist in the local storage, then search for
      // first task that is not completed, then select it as current task
      // Get the undone task starting the search from the last element
      for (let i = this._tasks.length - 1; i >= 0; i--) {
        if (this._tasks[i] && !this._tasks[i].isDone)
          return this._tasks[i]
      }

      return {};
    },

    setNextUndoneTask() {
      this.currentTask = this.getNextUndoneTaskFromArray();
    },

    getAllInternalTasks() {
      return this._tasks;
    },

    getTasksFromStorage() {
      return JSON.parse(localStorage.tasks);
    },

    getSearchedTask(taskId) {
      return this.getAllInternalTasks().find(task => task.id === taskId);
    },

    removeCurrentTask() {
      const allTasks = this.getAllInternalTasks();
      const newArray = allTasks.filter(task => this.currentTask.id !== task.id);
      this.storeTasksInLocalStorage(newArray);
      this.setAllTasksInternally(newArray);
      this.setNextUndoneTask();
    },

    markCurrentTaskAsCompleted() {
      if (!this.currentTask) {
        return;
      }

      this.currentTask.isDone = true;
      this.storeTasksInLocalStorage(this.getAllInternalTasks());
      this.setNextUndoneTask();
    }
  };

  // ================== APP ================== //

  const app = {
    init() {
      console.log('init app');
      modal.init();
      view.init();
      counterView.init();
      wholeTimeWorkHours.init();
      this.getElementsFromDocument();
      this.attachEventListenersToElements();
      this.counterInterval = null;
    },

    getTotalCompletedTime() {
      return Number.parseInt(localStorage.totalTimeSpent);
    },

    getEarliestCreatedTask() {
      return Math.min(...modal.getAllInternalTasks()
        .map(task => task.timeStamp));
    },

    getNextUndoneTaskFromArray() {
      return modal.getNextUndoneTaskFromArray();
    },

    getCurrentTaskText() {
      // To prevent printing `undefined`
      return modal.currentTask.task || '';
    },

    getElementsFromDocument() {
      this._playBtn = document.getElementById('play-btn');
      this._pauseBtn = document.getElementById('pause-btn');
      this._checkMarkBtn = document.getElementById('checkmark-btn');
      this._dropBtn = document.getElementById('drop-btn');
      this._addBtn = document.getElementById('add-btn');
      this._taskInput = document.getElementById('current-task');
    },

    attachEventListenersToElements() {
      this._playBtn.addEventListener('click', () => this.startCounter());
      this._pauseBtn.addEventListener('click', () => this.pauseCounter());
      this._checkMarkBtn.addEventListener('click', () => this.markTaskAsCompleted());
      this._dropBtn.addEventListener('click', () => this.dropTask());
      this._addBtn.addEventListener('click', () => this.registerCurrentTask());
    },

    registerCurrentTask() {
      if (this._taskInput.value.length === 0) {
        return;
      }

      const task = new Task(this._taskInput.value);
      modal.currentTask = task;
      localStorage.currentTaskId = task.id;
      modal.storeTaskInternally(task);
      view.renderNextTask();
    },

    dropTask() {
      if (app.getCurrentTaskText().length === 0)
        return;

      modal.removeCurrentTask();
      view.renderNextTask();
      localStorage.isTimerPaused = true;
      delete localStorage.startingTime;
      clearInterval(this.counterInterval);
      counterView.renderSpentTime(0);
    },

    markTaskAsCompleted() {
      // If there is no currently selected tasks
      // Don't bother executing rest
      if (this._taskInput.value.length === 0) {
        return;
      }

      localStorage.totalTimeSpent = Number.parseInt(localStorage.totalTimeSpent) +
                                    modal.currentTask.timeSpent;

      this.pauseCounter();
      modal.markCurrentTaskAsCompleted();
      view.renderNextTask();
      counterView.renderSpentTime(0); // To reset timer
      wholeTimeWorkHours.renderCompletedTime(Number.parseInt(localStorage.totalTimeSpent));
    },

    startCounter() {
      setTimeout(() => {
        if (Object.keys(modal.currentTask).length === 0)
          return;

        const startingTime = this.getStartingTime() - modal.currentTask.timeSpent;
        localStorage.isTimerPaused = false;

        this.counterInterval = setInterval(() => {
          const now = Date.now();
          const delta = now - startingTime;
          localStorage.startingTime = now;
          modal.currentTask.timeSpent = delta;
          modal.storeTasksInLocalStorage(modal.getAllInternalTasks());
          counterView.renderSpentTime(delta);
        }, 250);
      }, 1);
    },

    pauseCounter() {
      clearInterval(this.counterInterval);
      localStorage.isTimerPaused = true;
      delete localStorage.startingTime;
    },

    getStartingTime() {
      if (
        localStorage.startingTime &&
        !Number.isNaN(Number.parseInt(localStorage.startingTime))
      ) {
        return Number.parseInt(localStorage.startingTime);
      }

      const now = Date.now();
      localStorage.startingTime = now;

      return now;
    }
  };

  // ================== VIEW ================== //

  const view = {
    init() {
      this._taskInput = document.getElementById('current-task');
      view.renderNextTask();
    },

    hasTask() {
      return app.getCurrentTaskText().length > 0
    },

    renderNextTask() {
      if (this.hasTask())
        this.addCSSClassForCurrentTask();
      else
        this.removeCSSClassForCurrentTask();

      const newTask = app.getNextUndoneTaskFromArray();
      this.setValueOfInputField(newTask.task);
    },

    addCSSClassForCurrentTask() {
      this._taskInput.classList.add('has-task');
    },

    removeCSSClassForCurrentTask() {
      this._taskInput.classList.remove('has-task');
    },

    setValueOfInputField(newValue = '') {
      this._taskInput.value = newValue;
    }
  };


  const counterView = {
    init() {
      this._counterViewMinutes = document.getElementById('counter-minutes');
      this._counterViewSeconds = document.getElementById('counter-seconds');
    },

    renderSpentTime(ms) {
      const { seconds, minutes } = convertTimeFromMs(ms);
      this._counterViewMinutes.textContent = String(minutes).padStart(2, '0');
      this._counterViewSeconds.textContent = String(seconds).padStart(2, '0');
    }
  }


  const wholeTimeWorkHours = {
    init() {
      this._completedView = document.getElementById('completed-time');
      this._sinceView = document.getElementById('since-time');

      this.renderCompletedTime(app.getTotalCompletedTime());
      this.renderTimeSinceStartDate(Date.now() - app.getEarliestCreatedTask());
    },

    renderCompletedTime(ms) {
      this._completedView.textContent = this.getHumanReadableFormat(ms);
    },

    renderTimeSinceStartDate(ms) {
      this._sinceView.textContent = this.getHumanReadableFormat(ms);
    },

    getHumanReadableFormat(timeMS) {
      const date = convertTimeFromMs(timeMS);
      let str = '';
      if (date.days > 0) {
        str += `${date.days} days `;
      }

      if (date.hours > 0) {
        str += `${date.hours} hours `;
      }

      if (date.minutes > 0) {
        str += `${date.minutes} minutes `;
      }

      if (date.seconds > 0) {
        str += `${date.seconds} seconds`;
      }

      // this._completedView.textContent = str;
      return str;
    }
  }

  app.init();
})();
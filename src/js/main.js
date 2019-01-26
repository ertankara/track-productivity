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
    _isTimerPaused: true,

    init() {
      if (localStorage && localStorage.length !== 0) {
        if (localStorage.tasks)
          this._tasks = this.getTasksFromStorage();

        if (localStorage.isTimerPaused) { // Check if any value exists, not an actual bool comparison
          const isTimerPaused = /true/.test(localStorage.isTimerPaused);
          if (!isTimerPaused) {
            app.startCounter();
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

    get isTimerPaused() {
      return this._isTimerPaused;
    },

    set isTimerPaused(bool) {
      this._isTimerPaused = bool;
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
      if (localStorage.tasks)
        return JSON.parse(localStorage.tasks);

      return [];
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

    flushTasks() {
      this.clearLocalStorage();
      this.clearInternalStorage();

      // Restart modal
      modal.init();
    },

    clearInternalStorage() {
      this._tasks = null;
      this._currentTask = null;
    },

    clearLocalStorage() {
      const keys = [
        'tasks',
        'currentTaskId',
        'isTimerPaused',
        'tasks',
        'totalTimeSpent',
        'startingTime'
      ];

      for (const key of keys) {
        delete localStorage[key];
      }
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
      previousTasksView.init();

      this.getElementsFromDocument();
      this.attachEventListenersToElements();
      this.counterInterval = null;
    },

    isTimerPaused() {
      return modal.isTimerPaused;
    },

    activateTimer(bool) {
      modal.isTimerPaused = !bool;
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

    getAllTasksFromStorage() {
      return modal.getTasksFromStorage();
    },

    getCurrentTaskText() {
      // To prevent printing `undefined`
      return modal.currentTask.task || '';
    },

    getCurrentTaskSpentTime() {
      return modal.currentTask.timeSpent || 0;
    },

    getElementsFromDocument() {
      this._playBtn = document.getElementById('play-btn');
      this._pauseBtn = document.getElementById('pause-btn');
      this._checkMarkBtn = document.getElementById('checkmark-btn');
      this._dropBtn = document.getElementById('drop-btn');
      this._addBtn = document.getElementById('add-btn');
      this._taskInput = document.getElementById('current-task');
      this._removeAllTasksButton = document.getElementById('remove-all-tasks-button');
    },

    attachEventListenersToElements() {
      this._playBtn.addEventListener('click', () => this.startCounter());
      this._pauseBtn.addEventListener('click', () => this.pauseCounter());
      this._checkMarkBtn.addEventListener('click', () => this.markTaskAsCompleted());
      this._dropBtn.addEventListener('click', () => this.dropTask());
      this._addBtn.addEventListener('click', () => this.registerCurrentTask());
      this._removeAllTasksButton.addEventListener('click', () => this.removeAllPreviousTasks());
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
      previousTasksView.constructTasks();
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
      previousTasksView.constructTasks();
    },

    removeAllPreviousTasks() {
      modal.flushTasks();
      this.pauseCounter();
      counterView.renderSpentTime(0);
      view.renderNextTask();
      previousTasksView.constructTasks();
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
        if (
          Object.keys(modal.currentTask).length === 0 ||
          !this.isTimerPaused() // To prevent starting timer multiple times
        ) return;

        this.activateTimer(true);
        const startingTime = this.getStartingTime() - (modal.currentTask.timeSpent || 0);
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
      this.activateTimer(false);
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
      this._removeAllTasksButton = document.getElementById('remove-all-tasks-button');

      this.renderNextTask();
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
      this._counterViewHours = document.getElementById('counter-hours');
      this._counterViewMinutes = document.getElementById('counter-minutes');
      this._counterViewSeconds = document.getElementById('counter-seconds');
      this.renderSpentTime(
        app.getCurrentTaskSpentTime()
      );
    },

    renderSpentTime(ms) {
      const { seconds, minutes, hours } = convertTimeFromMs(ms);
      this._counterViewHours.textContent = String(hours).padStart(2, '0');
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

    getHumanReadableFormat(timeMS = 0) {
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

      if (str.length === 0) return '0 seconds';

      // this._completedView.textContent = str;
      return str;
    }
  };


  const previousTasksView = {
    init() {
      this._previousTaskDisplayButton = document.getElementById('previous-task-display-button');
      this._previousTasksContainer = document.getElementById('previous-tasks-container');
      this.shouldDisplayPreviousTasks = false;
      this.shouldDisplayTaskContainer(this.shouldDisplayPreviousTasks);
      this.constructTasks();
      this.insertTextForButton('See the tasks');
      this._previousTaskDisplayButton.addEventListener('click', () => this.switchDisplay());
    },

    constructTasks() {
      // If there are items from previous renders
      if (this._previousTasksContainer.firstElementChild) {
        // Hide it from the view, to make the deletion more performant
        this.shouldDisplayTaskContainer(false);
        // Remove them
        while (this._previousTasksContainer.firstElementChild) {
          this._previousTasksContainer.firstElementChild.remove();
        }
      }

      // Once done deleting, [if performed deletion]
      this.shouldDisplayTaskContainer(this.shouldDisplayPreviousTasks);

      this._previousTasksContainer.appendChild(
        this.constructHTMLFromPreviousTasks(
          app.getAllTasksFromStorage().reverse()
        )
      );

      // this.switchDisplay();
    },

    constructHTMLFromPreviousTasks(tasks) {
      const fragment = document.createDocumentFragment();

      for (const task of tasks) {
        const li = document.createElement('li');
        const taskSpan = document.createElement('span');
        const timeSpan = document.createElement('span');
        taskSpan.textContent = task.task;
        timeSpan.textContent = wholeTimeWorkHours.getHumanReadableFormat(task.timeSpent);
        li.appendChild(taskSpan);
        li.appendChild(timeSpan);
        fragment.appendChild(li);
      }

      return fragment;
    },

    switchDisplay() {
      this.shouldDisplayPreviousTasks = !this.shouldDisplayPreviousTasks;
      this.renderPreviousTasksVisually(this.shouldDisplayPreviousTasks);
    },

    renderPreviousTasksVisually(shouldRender) {
      const text = shouldRender ? 'Hide the tasks' : 'See the tasks';
      this.shouldDisplayTaskContainer(shouldRender);
      this.insertTextForButton(text);
    },

    insertTextForButton(newValue) {
      this._previousTaskDisplayButton.textContent = newValue
    },

    shouldDisplayTaskContainer(shouldDisplay) {
      this._previousTasksContainer.style.display = shouldDisplay ? 'block' : 'none';
    }
  }

  app.init();
})();

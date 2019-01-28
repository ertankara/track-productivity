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
    const days = Number.parseInt(timeInMs / 8.64e+7);

    return {
      seconds,
      minutes,
      hours,
      days
    }
  }

  const ONE_WEEK = 604800000;
  // const DAILY_GOAL_NORMAL = 21600000; // 6 hours in ms
  // const WEEKLY_GOAL_NORMAL = DAILY_GOAL_NORMAL * 7;

  const CHALLENGES = {
    normal: {
      id: 0,
      dailyGoal: 21600000, // 6 hours
      isSelected: false,
      get weeklyGoal() { return this.dailyGoal * 7 }
    },
    hard: {
      id: 1,
      dailyGoal: 32400000, // 9 hours
      isSelected: false,
      get weeklyGoal() { return this.dailyGoal * 7 }
    },
    insane: {
      id: 2,
      dailyGoal: 43200000, // 12 hours
      isSelected: false,
      get weeklyGoal() { return this.dailyGoal * 7 }
    },
  };

  // ================== MODAL ================== //

  const modal = {
    _tasks: [],
    _currentTask: {},
    _isTimerPaused: true,
    _selectedChallenge: CHALLENGES.normal, // Default challenge

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

      const challenge = !Number.isNaN(
        Number.parseInt(
          localStorage.selectedChallenge
        )
      ) ? Number.parseInt(localStorage.selectedChallenge) : 0;

      this.selectedChallenge = challenge;
      app.getColorForTheCurrentChallenge(challenge);


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

    get dailyTimer() {
      if (!localStorage.dailyTimer) {
        localStorage.dailyTimer = 0;
      }

      if (!(this.today === new Date().getDay())) {
        localStorage.dailyTimer = 0;
      }

      return Number.parseInt(localStorage.dailyTimer);
    },

    get selectedChallenge() {
      return this._selectedChallenge;
    },

    set selectedChallenge(challengeType) {
      switch(challengeType) {
        case 0:
          this._selectedChallenge = CHALLENGES.normal
          break;
        case 1:
          this._selectedChallenge = CHALLENGES.hard;
          break;
        case 2:
          this._selectedChallenge = CHALLENGES.insane;
          break;
        default:
          throw new Error('Challenge type requires strict value');
      }

      localStorage.selectedChallenge = challengeType;
    },

    get today() {
      if (!localStorage.today)
        localStorage.today = new Date().getDay();

      return Number.parseInt(localStorage.today);
    },

    get remainingTimeUntilTheEndOfTheWeek() {
      if (
        !localStorage.startOfTheWeek ||
        !localStorage.endOfTheWeek ||
        localStorage.endOfTheWeek - localStorage.startOfTheWeek <= 0
        ) {
        localStorage.startOfTheWeek = Date.now();
        localStorage.endOfTheWeek = Date.now() + ONE_WEEK;
      }

      return Number.parseInt(localStorage.endOfTheWeek) -
             Number.parseInt(localStorage.startOfTheWeek);
    },

    get weeklyTimer() {
      if (!localStorage.weeklyTimer) {
        localStorage.weeklyTimer = 0;
      }

      if (!(this.remainingTimeUntilTheEndOfTheWeek > 0)) {
        localStorage.weeklyTimer = 0;
      }

      return Number.parseInt(localStorage.weeklyTimer);
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
      // Get the undone task starting the search from the last element
      for (let i = this._tasks.length - 1; i >= 0; i--) {
        if (this._tasks[i] && !this._tasks[i].isDone)
          return this._tasks[i]
      }

      return {};
    },

    addToDailyTimer(time) {
      if (new Date().getDay() === this.today) {
        localStorage.dailyTimer = this.dailyTimer + time;
      }
      else {
        localStorage.today = new Date().getDay();

        localStorage.dailyTimer = Number.parseInt(
          localStorage.dailyTimer
        ) + time;
      }
    },

    addToWeeklyTimer(time) {
      localStorage.weeklyTimer = Number.parseInt(
        localStorage.weeklyTimer
      ) + time;
    },

    addToTotalTimer(time) {
      localStorage.totalTimeSpent = Number.parseInt(
        localStorage.totalTimeSpent
      ) + time;
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
        'totalTimeSpent',
        'startingTime',
        'today',
        'dailyTimer',
        'weeklyTimer',
        'startOfTheWeek',
        'endOfTheWeek',
        'selectedChallenge'
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
      challengeStagesView.init();
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

    isDailyGoalReached() {
      return modal.dailyTimer >= modal.selectedChallenge.dailyGoal;
    },

    isWeeklyGoalReached() {
      return modal.weeklyTimer >= modal.selectedChallenge.weeklyGoal;
    },

    getSelectedChallenge() {
      return modal.selectedChallenge;
    },

    selectChallenge(challengeType) {
      modal.selectedChallenge = challengeType;
      wholeTimeWorkHours.renderDailyGoal();
      wholeTimeWorkHours.renderWeeklyGoal();

      this.getColorForTheCurrentChallenge(challengeType);
    },

    getColorForTheCurrentChallenge(challengeType) {
      challengeStagesView.colorizeSelectedChallenge(challengeType);
    },

    activateTimer(bool) {
      if (!bool) {
        clearInterval(this.counterInterval);
      }

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

    getDailyCompletedTime() {
      return modal.dailyTimer;
    },

    getWeeklyCompletedTime() {
      return modal.weeklyTimer;
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

      this._taskInput.addEventListener('keyup', (e) => {
        if (document.activeElement === e.target && e.keyCode === 13) {
          this.registerCurrentTask();
        }
      });
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
      if (Object.keys(modal.currentTask).length === 0)
        return;

      modal.removeCurrentTask();
      view.renderNextTask();
      localStorage.isTimerPaused = true;
      delete localStorage.startingTime;
      this.activateTimer(false);
      counterView.renderSpentTime(0);
      previousTasksView.constructTasks();
    },

    removeAllPreviousTasks() {
      modal.flushTasks();
      this.pauseCounter();
      counterView.renderSpentTime(0);
      view.renderNextTask();
      previousTasksView.constructTasks();
      wholeTimeWorkHours.renderCompletedTime(0);
      wholeTimeWorkHours.renderTimeSinceStartDate(0);
      wholeTimeWorkHours.renderDailyCompletedTime(0);
      wholeTimeWorkHours.renderDailyGoal();
      wholeTimeWorkHours.renderWeeklyCompletedTime(0);
      wholeTimeWorkHours.renderWeeklyGoal();
      previousTasksView.switchDisplay(false);
    },

    markTaskAsCompleted() {
      // If there is no currently selected tasks
      // Don't bother executing rest
      if (Object.keys(modal.currentTask).length === 0) {
        return;
      }

      this.pauseCounter();
      modal.addToTotalTimer(modal.currentTask.timeSpent);
      modal.addToDailyTimer(modal.currentTask.timeSpent);
      modal.addToWeeklyTimer(modal.currentTask.timeSpent);
      modal.markCurrentTaskAsCompleted();
      view.renderNextTask();
      counterView.renderSpentTime(0); // To reset timer
      previousTasksView.constructTasks();
      wholeTimeWorkHours.renderCompletedTime(Number.parseInt(localStorage.totalTimeSpent));
      wholeTimeWorkHours.renderDailyCompletedTime(this.getDailyCompletedTime());
      wholeTimeWorkHours.renderWeeklyCompletedTime(this.getWeeklyCompletedTime());
      wholeTimeWorkHours.renderTimeSinceStartDate(Date.now() - this.getEarliestCreatedTask());
      wholeTimeWorkHours.renderDailyGoal(this.isDailyGoalReached());
      wholeTimeWorkHours.renderWeeklyGoal(this.isWeeklyGoalReached());
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


  const challengeStagesView = {
    init() {
      this._normal = document.getElementById('challenge-normal');
      this._hard = document.getElementById('challenge-hard');
      this._insane = document.getElementById('challenge-insane');

      this._normal.addEventListener('click', () => app.selectChallenge(0));
      this._hard.addEventListener('click', () => app.selectChallenge(1));
      this._insane.addEventListener('click', () => app.selectChallenge(2));
    },

    colorizeSelectedChallenge(challengeType) {
      const challengeViews = [
        this._normal,
        this._hard,
        this._insane
      ];

      for (const challengeView of challengeViews) {
        if (challengeView === challengeViews[challengeType]) {
          challengeView.classList.add('selected-challenge');
        }
        else {
          challengeView.classList.remove('selected-challenge');
        }
      }

    }
  }


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
      this._dailyCompletedView = document.getElementById('daily-completed-time');
      this._weeklyCompletedView = document.getElementById('weekly-completed-time');
      this._dailyGoalView = document.getElementById('daily-goal');
      this._weeklyGoalView = document.getElementById('weekly-goal');

      this._backgroundForDailyGoal = document.getElementsByClassName('daily-goal-pending');
      this._backgroundForWeeklyGoal = document.getElementsByClassName('weekly-goal-pending');

      this.renderCompletedTime(app.getTotalCompletedTime());
      this.renderTimeSinceStartDate(Date.now() - app.getEarliestCreatedTask());
      this.renderDailyCompletedTime(app.getDailyCompletedTime());
      this.renderDailyGoal(app.isDailyGoalReached());
      this.renderWeeklyCompletedTime(app.getWeeklyCompletedTime());
      this.renderWeeklyGoal(app.isWeeklyGoalReached());
    },

    renderCompletedTime(ms) {
      this._completedView.textContent = this.getHumanReadableFormat(ms);
    },

    renderTimeSinceStartDate(ms) {
      this._sinceView.textContent = this.getHumanReadableFormat(ms);
    },

    renderDailyCompletedTime(ms) {
      this._dailyCompletedView.textContent = this.getHumanReadableFormat(ms);
    },

    renderWeeklyCompletedTime(ms) {
      this._weeklyCompletedView.textContent = this.getHumanReadableFormat(ms);
    },

    renderDailyGoal(state = false) {
      const delta = app.getSelectedChallenge().dailyGoal - app.getDailyCompletedTime();
      this._dailyGoalView.textContent = delta > 0 ? this.getHumanReadableFormat(delta) : '✓';
      for (const el of this._backgroundForDailyGoal) {
        el.classList.toggle('goal-completed', state);
      }
    },

    renderWeeklyGoal(state = false) {
      const delta =  app.getSelectedChallenge().weeklyGoal - app.getWeeklyCompletedTime()
      this._weeklyGoalView.textContent = delta > 0 ? this.getHumanReadableFormat(delta) : '✓';
      for (const el of this._backgroundForWeeklyGoal) {
        el.classList.toggle('weekly-goal-completed', state);
      }
    },

    getHumanReadableFormat(timeMS = 0) {
      const date = convertTimeFromMs(timeMS);
      let str = '';
      if (date.days > 0) {
        str += `${date.days} day${date.days > 1 ? 's' : ''} `;
      }

      if (date.hours > 0) {
        str += `${date.hours} hour${date.hours > 1 ? 's' : ''} `;
      }

      if (date.minutes > 0) {
        str += `${date.minutes} minute${date.minutes > 1 ? 's' : ''} `;
      }

      if (date.seconds > 0) {
        str += `${date.seconds} second${date.seconds > 1 ? 's' : ''}`;
      }

      if (str.length === 0) return '0 seconds';

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

    switchDisplay(explicitValue) {
      if (explicitValue !== undefined) {
        this.shouldDisplayPreviousTasks = explicitValue;
      }
      else {
        this.shouldDisplayPreviousTasks = !this.shouldDisplayPreviousTasks;
      }

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

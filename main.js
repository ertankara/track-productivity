// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart#Polyfill
if (!String.prototype.padStart) {
  String.prototype.padStart = function padStart(targetLength, padString) {
      targetLength = targetLength >> 0; //truncate if number, or convert non-number to 0;
      padString = String(typeof padString !== 'undefined' ? padString : ' ');
      if (this.length >= targetLength) {
          return String(this);
      } else {
          targetLength = targetLength - this.length;
          if (targetLength > padString.length) {
              padString += padString.repeat(targetLength / padString.length); //append to original to ensure we are longer than needed
          }
          return padString.slice(0, targetLength) + String(this);
      }
  };
}

(() => {
  const time = {
    /**
     * localStorage props
     * day, goalTime, isPaused, totalInWeek, untilNextWeek
     */
    init: function() {
      this.declareLocalBindings();


      this.hoursInp = document.querySelector('#input-h')
      this.minutesInp = document.querySelector('#input-m');
      this.secondsInp = document.querySelector('#input-s');

      this.displayH = document.querySelector('#display-h');
      this.displayM = document.querySelector('#display-m');
      this.displayS = document.querySelector('#display-s');
      this.displayMS = document.querySelector('#display-ms');

      this.weeklyRemainingH = document.querySelector('#weekly-remaining-time-h');
      this.weeklyRemainingM = document.querySelector('#weekly-remaining-time-m');

      this.displayCompletedH = document.querySelector('#completed-h');
      this.displayCompletedM = document.querySelector('#completed-m');

      const resumePauseBtn = document.querySelector('#timer-state-btn');
      const resetBtn = document.querySelector('#reset-timer');

      resumePauseBtn.addEventListener('click', () => this.onTimeSet());
      resetBtn.addEventListener('click', () => time.reset());

      if (localStorage.untilNextWeek && Number.parseInt(localStorage.untilNextWeek) > Date.now()) {
        this.convertTimeToHumanFriendly(Number.parseInt(localStorage.totalInWeek), { displayCompleted: true })
        this.countWeeklyRemaining();
      }
      else {
        this.reset();
      }

      if (localStorage.isPaused === void 0) {
        localStorage.isPaused = true;
      }

      if (JSON.parse(localStorage.isPaused) === false) {
        this.pauseTimer = JSON.parse(localStorage.isPaused);
        this.count();
        this.countWeeklyRemaining();
      }

      if (localStorage && !localStorage.goalTime)  {
        localStorage.goalTime = '0';
      }
      else {
        this.convertTimeToHumanFriendly(Number.parseInt(localStorage.goalTime));
      }



    },

    declareLocalBindings: function() {
      this.hoursStr = "";
      this.minutesStr = "";
      this.secondsStr = "";
      this.millisecondsStr =  "";
      this.pauseTimer = true;
      this.startingTime = null;
    },


    count: function() {
      if (localStorage.startingTime > 0) {
        this.startingTime = Number.parseInt(localStorage.startingTime);
      } else {
        this.startingTime = Date.now();
        localStorage.startingTime = this.startingTime;
      }
      let result = 0;

      let interval = setInterval(() => {
        if (Number.parseInt(localStorage.goalTime) - result > 0 && !this.pauseTimer) {
          // Save every 30 seconds
          if (result > 30000) {
            localStorage.goalTime = Number.parseInt(localStorage.goalTime) - result;
            result = 0;
            this.startingTime = Date.now();
            localStorage.startingTime = this.startingTime;
          }

          result = Date.now() - this.startingTime;
          this.convertTimeToHumanFriendly(Number.parseInt(localStorage.goalTime) - result);
        }
        else {
          clearInterval(interval);
          localStorage.goalTime = Number.parseInt(localStorage.goalTime) - result;
          if (Number.parseInt(localStorage.goalTime) < 0)
            this.reset();

          this.startingTime = null;
        }
      }, 100);
    },

    convertTimeToHumanFriendly: function(duration, { displayCompleted } = {}) {
      const
        milliseconds = Number.parseInt((duration % 1000) / 100),
        seconds = Number.parseInt((duration / 1000) % 60),
        minutes = Number.parseInt((duration / (1000 * 60)) % 60),
        hours = Number.parseInt(duration / (1000 * 60 * 60));

      if (displayCompleted) {
        this.displayCompletedH.textContent = String(hours).padStart(2, '0');
        this.displayCompletedM.textContent = String(minutes).padStart(2, '0');
        return;
      }

      this.hoursStr = String(hours).padStart(2, "0");
      this.minutesStr = String(minutes).padStart(2, "0");
      this.secondsStr = String(seconds).padStart(2, "0");
      this.millisecondsStr = String(milliseconds).padStart(2, "0");

      this.displayH.textContent = this.hoursStr;
      this.displayM.textContent = this.minutesStr;
      this.displayS.textContent = this.secondsStr;
      this.displayMS.textContent = this.millisecondsStr;
    },
    convertToMs: function(hh, mm, ss) {
      let total = 0;

      total += hh * 1000 * 60 * 60;
      total += mm * 1000 * 60;
      total += ss * 1000;

      return total;
    },

    onTimeSet: function() {
      if (!localStorage.goalTime || Number.parseInt(localStorage.goalTime) <= 0) {
        this.pauseTimer = false;
        localStorage.isPaused = false;
        let targetTimeMSForm = this.convertToMs(
          Number.parseInt(this.hoursInp.value || 0),
          Number.parseInt(this.minutesInp.value || 0),
          Number.parseInt(this.secondsInp.value || 0)
        );

        if (targetTimeMSForm === void 0)
          return;

        if (!localStorage.totalInWeek){
          localStorage.totalInWeek = 0;
        }

        if (!localStorage.untilNextWeek) {
          localStorage.untilNextWeek = Date.now() + (7 * 24 * 60 * 60 * 1000);
        }

        localStorage.totalInWeek = Number.parseInt(localStorage.totalInWeek) + targetTimeMSForm;

        this.convertTimeToHumanFriendly(Number.parseInt(localStorage.totalInWeek), { displayCompleted: true })

        localStorage.goalTime = targetTimeMSForm;

        this.count();
        this.countWeeklyRemaining();

        // Clear the inputs
        this.hoursInp.value = '';
        this.minutesInp.value = '';
        this.secondsInp.value = '';
      }
      else {
        this.pauseTimer = !this.pauseTimer;
        localStorage.isPaused = this.pauseTimer;


        if (!this.pauseTimer) {
          this.count();
        }
        else {
          localStorage.startingTime = 0;
        }
      }
    },

    reset: function() {
      this.convertTimeToHumanFriendly(0);
      localStorage.goalTime = 0;
    },

    countWeeklyRemaining: function () {
      if (
        !localStorage.untilNextWeek &&
        !Number.isNaN(Number.parseInt(localStorage.untilNextWeek))
      ) {
        return;
      }

      let interval = setInterval(() => {
        let remainingMS = Number.parseInt(localStorage.untilNextWeek) - Date.now();
        if (remainingMS < 0) {
          clearInterval(interval)
          return;
        }

        this.weeklyRemainingH.textContent = String(Number.parseInt(remainingMS / (1000 * 60 * 60))).padStart(2, '0');
        this.weeklyRemainingM.textContent = String(Number.parseInt(remainingMS / (1000 * 60) % 60)).padStart(2, '0');

      }, 100);
    }
  };

  time.init();
})();

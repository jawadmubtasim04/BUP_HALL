document.addEventListener('DOMContentLoaded', function() {
    
    // --- GLOBAL PAGE NAVIGATION ---
    window.showSection = function(sectionId) {
        // Hide all sections
        document.querySelectorAll('.page-section').forEach(section => {
            section.classList.add('hidden');
        });

        // Show the target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.remove('hidden');
            window.scrollTo(0, 0); // Scroll to top of page
        }
        
        // Special handlers for sections that need initialization
        if (sectionId === 'meal-manage') {
            initMealPlanner();
        }
        if (sectionId === 'home') {
             // In case the slideshow was stopped or needs a reset
            initHeroSlideshow();
        }
    };

    // --- HOME PAGE: HERO SLIDESHOW ---
    function initHeroSlideshow() {
        const slidesContainer = document.getElementById('slides-container');
        if (!slidesContainer) return;

        // Clear interval if it exists from a previous initialization
        if (window.slideIntervalId) {
            clearInterval(window.slideIntervalId);
        }
        
        const images = [
          'https://bup.edu.bd/public/upload/slider/20250324_1742832735693.jpg',
          'https://bup.edu.bd/public/upload/slider/20250324_1742832599507.jpg',
          'https://bup.edu.bd/public/upload/slider/20250324_1742832629873.jpg',
          'https://bup.edu.bd/public/upload/slider/20250324_1742832654632.jpg'
        ];
        let currentImageIndex = 0;
        
        slidesContainer.innerHTML = ''; // Clear existing images
        images.forEach(imageUrl => {
          const img = document.createElement('img');
          img.src = imageUrl;
          img.classList.add('slide-image');
          img.alt = "BUP Hall Slideshow Image";
          img.onerror = function() {
            this.onerror=null;
            this.src='https://placehold.co/1920x1080/334155/e2e8f0?text=Image+Not+Available';
          };
          slidesContainer.appendChild(img);
        });

        function slideImages() {
          const offset = -currentImageIndex * 100;
          slidesContainer.style.marginLeft = `${offset}vw`;
          currentImageIndex = (currentImageIndex + 1) % images.length;
        }

        if (images.length > 0) {
            slideImages(); // Initial call
            window.slideIntervalId = setInterval(slideImages, 4000);
        }
    }

    // --- LOGIN PAGE ---
    function initLogin() {
        const loginForm = document.getElementById('loginForm');
        const loginMessage = document.getElementById('loginMessage');
        if (!loginForm) return;

        loginForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const studentId = document.getElementById('studentId').value;
            const password = document.getElementById('password').value;

            loginMessage.className = 'mt-6 text-center text-sm font-medium';

            if (!studentId || !password) {
                loginMessage.textContent = 'Please enter both Student ID and Password.';
                loginMessage.classList.add('text-red-600');
                return;
            }

            loginMessage.textContent = 'Attempting to log in...';
            loginMessage.classList.add('text-sky-600');
            
            // Simulate API call
            setTimeout(() => {
                if (studentId === "admin" && password === "password") {
                    loginMessage.textContent = 'Login successful! Redirecting...';
                    loginMessage.classList.remove('text-sky-600');
                    loginMessage.classList.add('text-green-600');
                } else {
                    loginMessage.textContent = 'Invalid Student ID or Password.';
                    loginMessage.classList.remove('text-sky-600');
                    loginMessage.classList.add('text-red-600');
                }
            }, 1000);
        });
    }

    // --- MEAL PLANNER PAGE ---
    function initMealPlanner() {
        const mealContainer = document.getElementById('meal-schedule-container');
        const currentDayInfo = document.getElementById('current-day-info');
        if (!mealContainer || mealContainer.dataset.initialized === 'true') return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        currentDayInfo.textContent = `Today is ${today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}`;

        function renderMealSchedule() {
            mealContainer.innerHTML = '';
            const fragment = document.createDocumentFragment();

            for (let i = 0; i < 30; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() + i);
                const dateString = date.toISOString().split('T')[0];
                const savedMeals = JSON.parse(localStorage.getItem(dateString)) || {};

                const isPast = date < today;
                const isToday = date.getTime() === today.getTime();
                const isEditable = !isPast && !isToday;

                let rowClass = '';
                let isDisabled = true;
                if (isPast || isToday) rowClass = 'disabled-row';
                if (isEditable) {
                    rowClass = 'active-row';
                    isDisabled = false;
                }
                
                const doneButtonText = savedMeals.done ? 'Saved' : 'Save';
                const doneButtonClass = savedMeals.done ? 'saved-btn' : 'bg-blue-600 hover:bg-blue-700';

                const row = document.createElement('div');
                row.className = `flex flex-wrap items-center justify-between p-4 border-b border-gray-200 last:border-b-0 ${rowClass}`;
                row.dataset.date = dateString;
                row.innerHTML = `
                    <div class="w-full sm:w-1/4 mb-3 sm:mb-0">
                        <p class="font-bold text-lg">${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                        <p class="text-sm text-gray-500">${date.toLocaleDateString(undefined, { weekday: 'long' })}</p>
                    </div>
                    <div class="w-full sm:w-1/2 flex items-center justify-around mb-4 sm:mb-0">
                        <label class="flex items-center space-x-2 cursor-pointer"><input type="checkbox" class="meal-checkbox h-5 w-5 rounded border-gray-300" data-meal="breakfast" ${savedMeals.breakfast ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}><span>Breakfast</span></label>
                        <label class="flex items-center space-x-2 cursor-pointer"><input type="checkbox" class="meal-checkbox h-5 w-5 rounded border-gray-300" data-meal="lunch" ${savedMeals.lunch ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}><span>Lunch</span></label>
                        <label class="flex items-center space-x-2 cursor-pointer"><input type="checkbox" class="meal-checkbox h-5 w-5 rounded border-gray-300" data-meal="dinner" ${savedMeals.dinner ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}><span>Dinner</span></label>
                    </div>
                    <div class="w-full sm:w-1/4 flex justify-center sm:justify-end">
                        <button class="done-btn text-white font-bold py-2 px-6 rounded-lg shadow-md transition-colors duration-300 ${doneButtonClass}" ${isDisabled ? 'disabled' : ''}>${doneButtonText}</button>
                    </div>
                `;
                fragment.appendChild(row);
            }
            mealContainer.appendChild(fragment);
        }

        function handleSaveSelection(e) {
            if (e.target.classList.contains('done-btn') && !e.target.disabled) {
                const row = e.target.closest('[data-date]');
                const date = row.dataset.date;
                const selections = {
                    breakfast: row.querySelector('[data-meal="breakfast"]').checked,
                    lunch: row.querySelector('[data-meal="lunch"]').checked,
                    dinner: row.querySelector('[data-meal="dinner"]').checked,
                    done: true
                };
                localStorage.setItem(date, JSON.stringify(selections));
                e.target.textContent = 'Saved';
                e.target.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                e.target.classList.add('saved-btn');
                alert(`Meals for ${new Date(date).toLocaleDateString()} saved!`);
            }
        }
        
        renderMealSchedule();
        mealContainer.addEventListener('click', handleSaveSelection);
        mealContainer.dataset.initialized = 'true';
    }


    // --- INITIALIZE ALL COMPONENTS ON LOAD ---
    initHeroSlideshow();
    initLogin();
    // Meal planner is initialized on-demand by showSection()
});
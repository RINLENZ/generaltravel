// Gestion des boutons de navigation
document.querySelectorAll('.nav-button').forEach(button => {
    button.addEventListener('click', function() {
        // Retirer la classe active de tous les boutons
        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.classList.remove('active');
        });
        // Ajouter la classe active au bouton cliqué
        this.classList.add('active');
        
        // Changer le formulaire en fonction du type sélectionné
        const searchForm = document.querySelector('.search-form');
        const title = document.querySelector('.search-card h2');
        
        switch(this.dataset.type) {
            case 'bus':
                title.textContent = 'Où voulez-vous partir ?';
                searchForm.innerHTML = `
                    <div class="trip-type">
                        <label>
                            <input type="radio" name="trip" value="aller-simple" checked>
                            <span>Aller simple</span>
                        </label>
                        <label>
                            <input type="radio" name="trip" value="aller-retour">
                            <span>Aller-retour</span>
                        </label>
                    </div>
                    <div class="form-row">
                        <div class="input-group">
                            <select class="destination-select">
                                <option value="" disabled selected>De...</option>
                                <option value="CDG">Paris Charles de Gaulle (CDG)</option>
                                <option value="ORY">Paris Orly (ORY)</option>
                                <option value="NCE">Nice Côte d'Azur (NCE)</option>
                                <option value="MRS">Marseille Provence (MRS)</option>
                                <option value="LYS">Lyon Saint-Exupéry (LYS)</option>
                                <option value="TLS">Toulouse Blagnac (TLS)</option>
                                <option value="BOD">Bordeaux Mérignac (BOD)</option>
                            </select>
                        </div>
                        <button class="switch-button" aria-label="Permuter les aéroports">
                            <i class="fas fa-exchange-alt"></i>
                        </button>
                        <div class="input-group">
                            <select class="destination-select">
                                <option value="" disabled selected>À...</option>
                                <option value="JFK">New York JFK (JFK)</option>
                                <option value="LHR">Londres Heathrow (LHR)</option>
                                <option value="DXB">Dubai International (DXB)</option>
                                <option value="HND">Tokyo Haneda (HND)</option>
                                <option value="SYD">Sydney Kingsford (SYD)</option>
                                <option value="YYZ">Toronto Pearson (YYZ)</option>
                                <option value="GRU">São Paulo Guarulhos (GRU)</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <input type="text" class="date-input" placeholder="Aller" onfocus="this.type='date'" onblur="if(!this.value) this.type='text'">
                        </div>
                        <div class="input-group">
                            <input type="text" class="date-input" placeholder="Retour" onfocus="this.type='date'" onblur="if(!this.value) this.type='text'">
                        </div>
                        <div class="input-group">
                            <div class="passenger-dropdown" id="passenger-dropdown">
                                <button type="button" class="passenger-trigger" onclick="togglePassengerMenu()">
                                    <span class="passenger-count">1 Adulte, 0 Enfant</span>
                                    <i class="fas fa-chevron-down"></i>
                                </button>
                                <div class="passenger-content" id="passenger-content">
                                    <div class="passenger-option">
                                        <span>Adultes</span>
                                        <div class="passenger-controls">
                                            <button type="button" class="btn-passenger" onclick="decrementPassenger('adults')">-</button>
                                            <span id="adults-count">1</span>
                                            <button type="button" class="btn-passenger" onclick="incrementPassenger('adults')">+</button>
                                        </div>
                                    </div>
                                    <div class="passenger-option">
                                        <span>Enfants</span>
                                        <div class="passenger-controls">
                                            <button type="button" class="btn-passenger" onclick="decrementPassenger('children')">-</button>
                                            <span id="children-count">0</span>
                                            <button type="button" class="btn-passenger" onclick="incrementPassenger('children')">+</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button class="search-button">
                            <i class="fas fa-search"></i>
                            Rechercher
                        </button>
                    </div>
                `;
                break;
            case 'hotel':
                title.textContent = 'Où souhaitez-vous séjourner ?';
                searchForm.innerHTML = `
                    <div class="form-row">
                        <div class="input-group">
                            <select class="hotel-select">
                                <option value="" disabled selected>Choisir un hôtel</option>
                                <option value="hotel1">Hôtel Paris Centre</option>
                                <option value="hotel2">Hôtel Eiffel Tower</option>
                                <option value="hotel3">Hôtel Champs-Élysées</option>
                                <option value="hotel4">Hôtel Montmartre</option>
                                <option value="hotel5">Hôtel Louvre</option>
                                <option value="hotel6">Hôtel Marais</option>
                                <option value="hotel7">Hôtel Latin Quarter</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <input type="text" class="date-input" placeholder="Date d'arrivée" onfocus="this.type='date'" onblur="if(!this.value) this.type='text'">
                        </div>
                        <div class="input-group">
                            <input type="text" class="date-input" placeholder="Date de départ" onfocus="this.type='date'" onblur="if(!this.value) this.type='text'">
                        </div>
                        <div class="input-group">
                            <div class="room-dropdown" id="room-dropdown">
                                <button type="button" class="room-trigger" onclick="toggleRoomMenu()">
                                    <span class="room-count">1 Chambre</span>
                                    <i class="fas fa-chevron-down"></i>
                                </button>
                                <div class="room-content" id="room-content">
                                    <div class="room-option">
                                        <span>Nombre de chambres</span>
                                        <div class="room-controls">
                                            <button type="button" class="btn-room" onclick="decrementRoom()">-</button>
                                            <span id="room-count">1</span>
                                            <button type="button" class="btn-room" onclick="incrementRoom()">+</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button class="search-button">
                            <i class="fas fa-search"></i>
                            Rechercher
                        </button>
                    </div>
                `;
                break;
            case 'car':
                title.textContent = 'Où voulez-vous louer une voiture ?';
                searchForm.innerHTML = `
                    <div class="form-row">
                        <div class="input-group">
                            <select class="location-select">
                                <option value="" disabled selected>Lieu de prise en charge</option>
                                <option value="CDG">Aéroport Paris Charles de Gaulle</option>
                                <option value="ORY">Aéroport Paris Orly</option>
                                <option value="NCE">Aéroport Nice Côte d'Azur</option>
                                <option value="MRS">Aéroport Marseille Provence</option>
                                <option value="LYS">Aéroport Lyon Saint-Exupéry</option>
                                <option value="TLS">Aéroport Toulouse Blagnac</option>
                                <option value="BOD">Aéroport Bordeaux Mérignac</option>
                                <option value="GareNord">Gare du Nord, Paris</option>
                                <option value="GareLyon">Gare de Lyon, Paris</option>
                                <option value="GareMontparnasse">Gare Montparnasse, Paris</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <input type="text" class="date-input" placeholder="Date de prise en charge" onfocus="this.type='date'" onblur="if(!this.value) this.type='text'">
                        </div>
                        <div class="input-group">
                            <select class="time-select">
                                <option value="" disabled selected>Heure de prise en charge</option>
                                <option value="00:00">00:00</option>
                                <option value="00:30">00:30</option>
                                <option value="01:00">01:00</option>
                                <option value="01:30">01:30</option>
                                <option value="02:00">02:00</option>
                                <option value="02:30">02:30</option>
                                <option value="03:00">03:00</option>
                                <option value="03:30">03:30</option>
                                <option value="04:00">04:00</option>
                                <option value="04:30">04:30</option>
                                <option value="05:00">05:00</option>
                                <option value="05:30">05:30</option>
                                <option value="06:00">06:00</option>
                                <option value="06:30">06:30</option>
                                <option value="07:00">07:00</option>
                                <option value="07:30">07:30</option>
                                <option value="08:00">08:00</option>
                                <option value="08:30">08:30</option>
                                <option value="09:00">09:00</option>
                                <option value="09:30">09:30</option>
                                <option value="10:00">10:00</option>
                                <option value="10:30">10:30</option>
                                <option value="11:00">11:00</option>
                                <option value="11:30">11:30</option>
                                <option value="12:00">12:00</option>
                                <option value="12:30">12:30</option>
                                <option value="13:00">13:00</option>
                                <option value="13:30">13:30</option>
                                <option value="14:00">14:00</option>
                                <option value="14:30">14:30</option>
                                <option value="15:00">15:00</option>
                                <option value="15:30">15:30</option>
                                <option value="16:00">16:00</option>
                                <option value="16:30">16:30</option>
                                <option value="17:00">17:00</option>
                                <option value="17:30">17:30</option>
                                <option value="18:00">18:00</option>
                                <option value="18:30">18:30</option>
                                <option value="19:00">19:00</option>
                                <option value="19:30">19:30</option>
                                <option value="20:00">20:00</option>
                                <option value="20:30">20:30</option>
                                <option value="21:00">21:00</option>
                                <option value="21:30">21:30</option>
                                <option value="22:00">22:00</option>
                                <option value="22:30">22:30</option>
                                <option value="23:00">23:00</option>
                                <option value="23:30">23:30</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <input type="text" class="date-input" placeholder="Date de restitution" onfocus="this.type='date'" onblur="if(!this.value) this.type='text'">
                        </div>
                        <div class="input-group">
                            <select class="time-select">
                                <option value="" disabled selected>Heure de restitution</option>
                                <option value="00:00">00:00</option>
                                <option value="00:30">00:30</option>
                                <option value="01:00">01:00</option>
                                <option value="01:30">01:30</option>
                                <option value="02:00">02:00</option>
                                <option value="02:30">02:30</option>
                                <option value="03:00">03:00</option>
                                <option value="03:30">03:30</option>
                                <option value="04:00">04:00</option>
                                <option value="04:30">04:30</option>
                                <option value="05:00">05:00</option>
                                <option value="05:30">05:30</option>
                                <option value="06:00">06:00</option>
                                <option value="06:30">06:30</option>
                                <option value="07:00">07:00</option>
                                <option value="07:30">07:30</option>
                                <option value="08:00">08:00</option>
                                <option value="08:30">08:30</option>
                                <option value="09:00">09:00</option>
                                <option value="09:30">09:30</option>
                                <option value="10:00">10:00</option>
                                <option value="10:30">10:30</option>
                                <option value="11:00">11:00</option>
                                <option value="11:30">11:30</option>
                                <option value="12:00">12:00</option>
                                <option value="12:30">12:30</option>
                                <option value="13:00">13:00</option>
                                <option value="13:30">13:30</option>
                                <option value="14:00">14:00</option>
                                <option value="14:30">14:30</option>
                                <option value="15:00">15:00</option>
                                <option value="15:30">15:30</option>
                                <option value="16:00">16:00</option>
                                <option value="16:30">16:30</option>
                                <option value="17:00">17:00</option>
                                <option value="17:30">17:30</option>
                                <option value="18:00">18:00</option>
                                <option value="18:30">18:30</option>
                                <option value="19:00">19:00</option>
                                <option value="19:30">19:30</option>
                                <option value="20:00">20:00</option>
                                <option value="20:30">20:30</option>
                                <option value="21:00">21:00</option>
                                <option value="21:30">21:30</option>
                                <option value="22:00">22:00</option>
                                <option value="22:30">22:30</option>
                                <option value="23:00">23:00</option>
                                <option value="23:30">23:30</option>
                            </select>
                        </div>
                        <button class="search-button">
                            <i class="fas fa-search"></i>
                            Rechercher
                        </button>
                    </div>
                    <div class="form-row checkbox-row">
                        <div class="checkbox-group">
                            <input type="checkbox" id="with-driver">
                            <label for="with-driver">Je souhaite louer avec un chauffeur</label>
                        </div>
                        <div class="checkbox-group">
                            <input type="checkbox" id="different-location">
                            <label for="different-location">Je souhaite restituer la voiture à un autre endroit</label>
                        </div>
                    </div>
                `;
                break;
        }
    });
});

const limits = {
    adults: { min: 1, max: 6 },
    children: { min: 0, max: 4 }
};

// Gestion du type de voyage
document.querySelectorAll('input[name="trip"]').forEach(radio => {
    radio.addEventListener('change', function() {
        const returnDateInput = document.querySelector('.form-row .input-group:nth-child(4)');
        if (this.value === 'aller-simple') {
            returnDateInput.style.display = 'none';
        } else {
            returnDateInput.style.display = 'block';
        }
    });
});

function togglePassengerMenu() {
    const content = document.getElementById('passenger-content');
    content.style.display = content.style.display === 'block' ? 'none' : 'block';
}

// Fermer le menu si on clique en dehors
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('passenger-dropdown');
    const content = document.getElementById('passenger-content');
    if (!dropdown.contains(event.target)) {
        content.style.display = 'none';
    }
});

function updatePassengerCount() {
    const adults = parseInt(document.getElementById('adults-count').textContent);
    const children = parseInt(document.getElementById('children-count').textContent);
    const text = `${adults} Adulte${adults > 1 ? 's' : ''}, ${children} Enfant${children > 1 ? 's' : ''}`;
    document.querySelector('.passenger-count').textContent = text;
}

function incrementPassenger(type) {
    const countElement = document.getElementById(`${type}-count`);
    const currentCount = parseInt(countElement.textContent);
    if (currentCount < limits[type].max) {
        countElement.textContent = currentCount + 1;
        updatePassengerCount();
    }
}

function decrementPassenger(type) {
    const countElement = document.getElementById(`${type}-count`);
    const currentCount = parseInt(countElement.textContent);
    if (currentCount > limits[type].min) {
        countElement.textContent = currentCount - 1;
        updatePassengerCount();
    }
}

// Fonctions pour la gestion des chambres
function toggleRoomMenu() {
    const content = document.getElementById('room-content');
    content.style.display = content.style.display === 'block' ? 'none' : 'block';
}

function incrementRoom() {
    const countElement = document.getElementById('room-count');
    const currentCount = parseInt(countElement.textContent);
    if (currentCount < 5) {
        countElement.textContent = currentCount + 1;
        updateRoomCount();
    }
}

function decrementRoom() {
    const countElement = document.getElementById('room-count');
    const currentCount = parseInt(countElement.textContent);
    if (currentCount > 1) {
        countElement.textContent = currentCount - 1;
        updateRoomCount();
    }
}

function updateRoomCount() {
    const count = document.getElementById('room-count').textContent;
    document.querySelector('.room-count').textContent = `${count} Chambre${count > 1 ? 's' : ''}`;
}

// Fonction pour permuter les selects De/A dans le formulaire bus
function addSwitchButtonListener() {
    const formRow = document.querySelector('.form-row');
    if (!formRow) return;
    const selects = formRow.querySelectorAll('.destination-select');
    const switchBtn = formRow.querySelector('.switch-button');
    if (selects.length === 2 && switchBtn) {
        switchBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Sauvegarde des valeurs et index sélectionnés
            const fromSelect = selects[0];
            const toSelect = selects[1];
            const fromValue = fromSelect.value;
            const toValue = toSelect.value;
            // Permuter les valeurs sélectionnées
            fromSelect.value = toValue;
            toSelect.value = fromValue;
        });
    }
}

// Ajout automatique après chaque changement de formulaire
function observeFormSwitch() {
    const observer = new MutationObserver(() => {
        addSwitchButtonListener();
    });
    const searchForm = document.querySelector('.search-form');
    if (searchForm) {
        observer.observe(searchForm, { childList: true, subtree: true });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    addSwitchButtonListener();
    observeFormSwitch();
});

// Fonction de connexion (à appeler lors du submit du formulaire de login)
function login(email, password) {
  fetch('http://localhost:3000/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      if (data.role === 'admin') {
        window.location.href = 'admin-dashboard.html';
      } else {
        window.location.href = 'user-dashboard.html';
      }
    } else {
      alert('Identifiants invalides');
    }
  })
  .catch(() => alert('Erreur serveur'));
}

document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      login(email, password);
    });
  }
});

// script.js

document.addEventListener('DOMContentLoaded', () => {
    // ---- Gestion de l'affichage/masquage des mots de passe (pour les deux formulaires) ----
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password'); // Pour le champ de mot de passe de connexion ou d'inscription

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            // Changer l'icône de l'œil
            this.querySelector('i').classList.toggle('bi-eye');
            this.querySelector('i').classList.toggle('bi-eye-slash');
        });
    }

    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword'); // Pour le champ de confirmation de mot de passe

    if (toggleConfirmPassword && confirmPasswordInput) {
        toggleConfirmPassword.addEventListener('click', function () {
            const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            confirmPasswordInput.setAttribute('type', type);
            // Changer l'icône de l'œil
            this.querySelector('i').classList.toggle('bi-eye');
            this.querySelector('i').classList.toggle('bi-eye-slash');
        });
    }


    // ---- Gestion de l'affichage des messages ----
    // Ajoutez un conteneur pour les messages dans chaque page (si ce n'est pas déjà fait)
    // Par exemple, juste après les balises de formulaire ou avant le </div> de la carte de login/register
    // <div id="message-container" class="mt-3"></div>
    const messageContainer = document.getElementById('message-container');

    function displayMessage(message, type) {
        if (!messageContainer) return; // S'assurer que le conteneur existe

        messageContainer.innerHTML = `<div class="alert alert-${type === 'success' ? 'success' : 'danger'}" role="alert">${message}</div>`;
        messageContainer.style.display = 'block';

        // Cache le message après 5 secondes
        setTimeout(() => {
            messageContainer.style.display = 'none';
            messageContainer.innerHTML = '';
        }, 5000);
    }

    // ---- Logique spécifique à la page de connexion (login.html) ----
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Empêche le rechargement de la page

            const email = document.getElementById('email').value; // Votre HTML utilise 'email'
            const password = document.getElementById('password').value;

            // Réinitialiser le message
            messageContainer.style.display = 'none';

            try {
                const response = await fetch('http://localhost:3000/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username: email, password }), // Envoyer l'email comme 'username' au backend
                });

                const data = await response.json();

                if (response.ok) {
                    displayMessage(data.message, 'success');
                    loginForm.reset(); // Vide le formulaire
                    // Redirection ou mise à jour de l'UI après connexion réussie
                    // Exemple : window.location.href = '/dashboard.html';
                    console.log('Utilisateur connecté :', data.user);
                } else {
                    displayMessage(data.message || 'Échec de la connexion.', 'error');
                }
            } catch (error) {
                console.error('Erreur réseau ou serveur lors de la connexion :', error);
                displayMessage('Une erreur est survenue. Veuillez réessayer plus tard.', 'error');
            }
        });
    }

    // ---- Logique spécifique à la page d'inscription (register.html) ----
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Empêche le rechargement de la page

            const username = document.getElementById('name').value; // Utilise 'name' comme username pour le backend
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const termsAccepted = document.getElementById('terms').checked;

            if (password !== confirmPassword) {
                displayMessage('Les mots de passe ne correspondent pas !', 'error');
                return;
            }
            if (!termsAccepted) {
                displayMessage('Vous devez accepter les conditions d\'utilisation.', 'error');
                return;
            }

            // Réinitialiser le message
            messageContainer.style.display = 'none';

            try {
                const response = await fetch('http://localhost:3000/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, email, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    displayMessage(data.message, 'success');
                    registerForm.reset(); // Vide le formulaire
                    // Optionnel: rediriger vers la page de connexion après une inscription réussie
                    // setTimeout(() => {
                    //     window.location.href = 'login.html';
                    // }, 2000);
                } else {
                    displayMessage(data.message || 'Échec de l\'inscription.', 'error');
                }
            } catch (error) {
                console.error('Erreur réseau ou serveur lors de l\'inscription :', error);
                displayMessage('Une erreur est survenue. Veuillez réessayer plus tard.', 'error');
            }
        });
    }
});
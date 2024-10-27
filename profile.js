let user;
console.log(user);

function adduserTitle(user){
    const userTitle = document.getElementById('userTitle')
    userTitle.innerText = `Hi ${user}`;
}

function saveprofile() {
    const diseases = document.getElementById('diseases');
    const allergies = document.getElementById('allergies');
    const weight = document.getElementById('weight');
    
    const profile = {
        "diseases": diseases.value,
        "allergies": allergies.value,
        "weight": weight.value
    };
    console.log(profile);
    localStorage.setItem('profile', JSON.stringify(profile));
    window.location.href='index.html';
}
function saveuser() {
    const username = document.getElementById('username').value;
    user = username;
    localStorage.setItem('user', JSON.stringify(user));
    console.log(user);
}

// User authentication and profile management
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

function signup(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    let users = JSON.parse(localStorage.getItem('users')) || {};
    
    if (users[username]) {
        alert('Username already exists. Please choose a different one.');
        return;
    }
    
    users[username] = { password: password, profile: {} };
    localStorage.setItem('users', JSON.stringify(users));
    
    currentUser = { username: username, profile: {} };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    window.location.href = 'personalize.html';
}

function login(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    let users = JSON.parse(localStorage.getItem('users')) || {};

    if (users[username] && users[username].password === password) {
        currentUser = { username: username, profile: users[username].profile };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        window.location.href = 'home.html';
    } else {
        alert('Invalid username or password');
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    window.location.href = 'login.html';
}

function saveProfile(formData) {
    if (!currentUser) {
        console.error('No user logged in');
        window.location.href = 'login.html';
        return;
    }

    currentUser.profile = {
        ...currentUser.profile,
        ...formData,
        dietPlan: currentUser.profile.dietPlan || {} // Initialize diet plan if it doesn't exist
    };
    
    let users = JSON.parse(localStorage.getItem('users')) || {};
    users[currentUser.username].profile = currentUser.profile;
    
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    console.log('Profile saved:', currentUser.profile);
    window.location.href = 'home.html';
}

function updateDietPlan(dietPlan) {
    if (!currentUser) {
        console.error('No user logged in');
        window.location.href = 'login.html';
        return;
    }

    currentUser.profile.dietPlan = dietPlan;
    
    let users = JSON.parse(localStorage.getItem('users'));
    users[currentUser.username].profile = currentUser.profile;
    
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    console.log('Diet plan updated:', currentUser.profile.dietPlan);
}

function displayUserProfile() {
    if (!currentUser) {
        console.log('No user logged in, redirecting to login page');
        window.location.href = 'login.html';
        return;
    }

    const profileDiv = document.getElementById('userProfile');
    if (profileDiv) {
        profileDiv.innerHTML = `
            <h3>Welcome, ${currentUser.username}!</h3>
            <p>Weight: ${currentUser.profile.weight || 'Not specified'} kg</p>
            <p>Health Conditions: ${currentUser.profile.healthConditions ? currentUser.profile.healthConditions.join(', ') : 'None'}</p>
            <p>Allergies: ${currentUser.profile.allergies ? currentUser.profile.allergies.join(', ') : 'None'}</p>
            <p>Dietary Restrictions: ${currentUser.profile.dietaryRestrictions ? currentUser.profile.dietaryRestrictions.join(', ') : 'None'}</p>
            <p>Fitness Goals: ${currentUser.profile.fitnessGoals || 'Not specified'}</p>
        `;
    }
}

export { displayUserProfile, signup, login, logout, saveProfile, updateDietPlan };

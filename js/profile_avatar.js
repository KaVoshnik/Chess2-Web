document.addEventListener('DOMContentLoaded', () => {
  // Profile avatar menu toggle
  const profileAvatar = document.getElementById('profile-avatar');
  if (profileAvatar) {
    profileAvatar.addEventListener('click', (e) => {
      e.stopPropagation(); // Предотвращаем всплытие события
      const menu = document.querySelector('.profile-menu');
      menu.classList.toggle('hidden');
      menu.classList.toggle('visible');
    });
  }
  
  // Закрытие меню профиля при клике вне его
  document.addEventListener('click', (e) => {
    const menu = document.querySelector('.profile-menu');
    const avatar = document.getElementById('profile-avatar');
    
    if (menu && !menu.contains(e.target) && e.target !== avatar) {
      menu.classList.add('hidden');
      menu.classList.remove('visible');
    }
  });
  
  // Обработка адаптивного меню для мобильных устройств
  const mainNav = document.getElementById('main-nav');
  
  if (mainNav) {
    // Закрываем мобильное меню при клике на пункт меню
    const navLinks = mainNav.querySelectorAll('a');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (mainNav.classList.contains('show-mobile-menu')) {
          mainNav.classList.remove('show-mobile-menu');
        }
      });
    });
  }
  
  // Logout functionality
  const logoutButton = document.getElementById('logoutButton');
  if (logoutButton) {
    logoutButton.addEventListener('click', function(event) {
      event.preventDefault();
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      window.location.href = '/index.html';
    });
  }

  // Update username in profile menu if user is logged in
  updateProfileInfo();
});

// Function to update profile information
async function updateProfileInfo() {
  const userId = localStorage.getItem('userId');
  if (!userId) {
    // User is not logged in
    return;
  }

  try {
    const response = await fetch(`/api/user/${userId}`);
    
    if (!response.ok) {
      console.error('Error loading user data:', await response.text());
      return;
    }

    const userData = await response.json();
    
    // Update username in the profile menu
    const usernameElement = document.getElementById('username');
    if (usernameElement) {
      usernameElement.textContent = userData.username || 'Player';
    }
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}
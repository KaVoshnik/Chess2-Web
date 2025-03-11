document.getElementById('profile-avatar').addEventListener('click', () => {
    const menu = document.querySelector('.profile-menu');
    menu.classList.toggle('hidden');
    menu.classList.toggle('visible');
  });
  
document.getElementById('logoutButton').addEventListener('click', function(event) {
    event.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    window.location.href = '/index.html';
  });
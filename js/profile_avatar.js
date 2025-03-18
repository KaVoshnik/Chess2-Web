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
  });window.onload = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        window.location.href = 'sign_in.html';
        return;
    }

    try {
        // Запрос к серверу для получения данных пользователя
        const response = await fetch(`http://localhost:3001/user/${userId}`);
        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorMessage = await response.text();
            console.error('Error loading user data:', errorMessage);
            alert('Error loading user data: ' + errorMessage);
            return;
        }

        const userData = await response.json();
        console.log('User Data:', userData);

        // Устанавливаем никнейм пользователя в поле username
        document.getElementById('username').textContent = userData.username;

    } catch (error) {
        console.error('Error loading user data:', error);
        alert('Error loading user data. Please try again later.');
    }
};

window.onload = async () => {
  const userId = localStorage.getItem('userId');
  if (!userId) {
      window.location.href = 'sign_in.html';
      return;
  }

  try {
      const response = await fetch(`http://localhost:3001/user/${userId}`);
      console.log('Response status:', response.status);

      if (!response.ok) {
          const errorMessage = await response.text();
          console.error('Error loading user data:', errorMessage);
          alert('Error loading user data: ' + errorMessage);
          return;
      }

      const userData = await response.json();
      console.log('User Data:', userData);

      document.getElementById('username').textContent = userData.username;

  } catch (error) {
      console.error('Error loading user data:', error);
      alert('Error loading user data. Please try again later.');
  }
};
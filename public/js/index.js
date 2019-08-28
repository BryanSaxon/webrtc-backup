document.getElementById('roomSubmit').addEventListener('click', (event) => {
  event.preventDefault();
  let id = document.getElementById('roomID').value;
  window.location.href = '/room/' + id;
});
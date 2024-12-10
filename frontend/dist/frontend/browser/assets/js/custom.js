// get current year
(function () {
    var year = new Date().getFullYear();
    document.querySelector("#currentYear").innerHTML = year;
})();

document.addEventListener('DOMContentLoaded', function() {
  var element = document.getElementById('yourElementId');
  if (element) {
    element.innerHTML = 'Nuevo contenido';
  } else {
    console.error('Elemento no encontrado: yourElementId');
  }
});
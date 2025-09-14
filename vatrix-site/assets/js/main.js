document.addEventListener('DOMContentLoaded', function () {
  var navToggle = document.getElementById('navToggle');
  var primaryNav = document.getElementById('primaryNav');

  if (navToggle && primaryNav) {
    navToggle.addEventListener('click', function () {
      var isOpen = primaryNav.classList.contains('open');
      if (isOpen) {
        primaryNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      } else {
        primaryNav.classList.add('open');
        navToggle.setAttribute('aria-expanded', 'true');
      }
    });
  }
});


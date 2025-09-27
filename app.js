// app.js
(function() {
  const status = document.getElementById('status');

  function setStatus(msg) {
    status.textContent = msg;
  }

  // Initialize help modal
  HelpModal.init({
    triggerSelector: '#btn-help',
    content: 'YOUR_HELP_CONTENT',
    theme: 'auto'
  });

  setStatus('Ready');
})();

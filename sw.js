<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('SW registrado!', reg))
        .catch(err => console.error('Erro no SW:', err));
    });
  }
</script>

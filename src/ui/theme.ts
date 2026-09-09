export function initializeTheme() {
  try {
    const value = localStorage.getItem('liftit-theme')
    if (value === 'light' || value === 'dark')
      document.documentElement.dataset.theme = value
  } catch {
    /* Device preferences still apply without storage. */
  }
}

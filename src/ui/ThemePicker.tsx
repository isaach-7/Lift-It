import { useState } from 'react'
export function ThemePicker() {
  const [theme, setTheme] = useState(
    document.documentElement.dataset.theme ?? 'system',
  )
  return (
    <label>
      Theme
      <select
        value={theme}
        onChange={(e) => {
          const value = e.target.value
          setTheme(value)
          if (value === 'system') delete document.documentElement.dataset.theme
          else document.documentElement.dataset.theme = value
          try {
            localStorage.setItem('liftit-theme', value)
          } catch {
            /* Theme remains usable for this visit. */
          }
        }}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  )
}

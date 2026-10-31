import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import DashboardLayout from './DashboardLayout'
function App() {
  const [count, setCount] = useState(0)

  return (
    <DashboardLayout/>
  )
}

export default App

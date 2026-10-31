import DashboardLayout from './DashboardLayout'
import { NetworkProvider } from './context/NetworkContext'

function App() {
  return (
    <NetworkProvider>
      <DashboardLayout />
    </NetworkProvider>
  )
}

export default App

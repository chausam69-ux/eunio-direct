import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import Shell from './components/Shell'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Accounts from './pages/Accounts'
import Pipeline from './pages/Pipeline'
import Products from './pages/Products'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/products" element={<Products />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

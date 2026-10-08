import { Route, Routes } from 'react-router-dom'
import Layout from './components/layout/Layout'
import PublicLayout from './components/layout/PublicLayout'
import Landing from './pages/Landing'
import Home from './pages/Home'
import Vacantes from './pages/Vacantes'
import Estudiantes from './pages/Estudiantes'
import Login from './pages/Login'
import Register from './pages/Register'
import CrearPerfilEstudiante from './pages/CrearPerfilEstudiante'
import PublicarVacante from './pages/PublicarVacante'
import VacancyDetail from './pages/VacancyDetail'

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Landing />} />
        <Route path="login" element={<Login />} />
        <Route path="registro" element={<Register />} />
      </Route>
      <Route element={<Layout />}>
        <Route path="inicio" element={<Home />} />
        <Route path="vacantes" element={<Vacantes />} />
        <Route path="vacantes/nueva" element={<PublicarVacante />} />
        <Route path="vacantes/:id" element={<VacancyDetail />} />
        <Route path="estudiantes" element={<Estudiantes />} />
        <Route path="perfil/crear" element={<CrearPerfilEstudiante />} />
      </Route>
    </Routes>
  )
}

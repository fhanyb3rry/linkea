import { Route, Routes } from 'react-router-dom'
import Layout from './components/layout/Layout'
import PublicLayout from './components/layout/PublicLayout'
import Candidatos from './pages/Candidatos'
import Configuracion from './pages/Configuracion'
import CrearPerfilEstudiante from './pages/CrearPerfilEstudiante'
import EditarPerfil from './pages/EditarPerfil'
import EditarVacante from './pages/EditarVacante'
import Estudiantes from './pages/Estudiantes'
import Guardados from './pages/Guardados'
import Home from './pages/Home'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Mensajes from './pages/Mensajes'
import MiPerfil from './pages/MiPerfil'
import NotFound from './pages/NotFound'
import Notificaciones from './pages/Notificaciones'
import PanelEmpresa from './pages/PanelEmpresa'
import PerfilEstudiante from './pages/PerfilEstudiante'
import Postulaciones from './pages/Postulaciones'
import PublicarVacante from './pages/PublicarVacante'
import Recuperar from './pages/Recuperar'
import Register from './pages/Register'
import RutasAprendizaje from './pages/RutasAprendizaje'
import VacancyDetail from './pages/VacancyDetail'
import Vacantes from './pages/Vacantes'

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Landing />} />
        <Route path="login" element={<Login />} />
        <Route path="registro" element={<Register />} />
        <Route path="recuperar" element={<Recuperar />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route element={<Layout />}>
        <Route path="inicio" element={<Home />} />

        <Route path="vacantes" element={<Vacantes />} />
        <Route path="vacantes/nueva" element={<PublicarVacante />} />
        <Route path="vacantes/:id" element={<VacancyDetail />} />
        <Route path="vacantes/:id/editar" element={<EditarVacante />} />
        <Route path="vacantes/:id/candidatos" element={<Candidatos />} />
        <Route path="guardados" element={<Guardados />} />
        <Route path="rutas" element={<RutasAprendizaje />} />

        <Route path="estudiantes" element={<Estudiantes />} />
        <Route path="estudiantes/:id" element={<PerfilEstudiante />} />

        <Route path="perfil" element={<MiPerfil />} />
        <Route path="perfil/crear" element={<CrearPerfilEstudiante />} />
        <Route path="perfil/editar" element={<EditarPerfil />} />

        <Route path="postulaciones" element={<Postulaciones />} />
        <Route path="empresa" element={<PanelEmpresa />} />
        <Route path="mensajes" element={<Mensajes />} />
        <Route path="notificaciones" element={<Notificaciones />} />
        <Route path="configuracion" element={<Configuracion />} />
      </Route>
    </Routes>
  )
}

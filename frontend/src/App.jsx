import { Route, Routes } from 'react-router-dom'
import Layout from './components/layout/Layout'
import PublicLayout from './components/layout/PublicLayout'
import RequireAuth from './components/layout/RequireAuth'
import Candidatos from './pages/Candidatos'
import Configuracion from './pages/Configuracion'
import Coordinacion from './pages/Coordinacion'
import CrearPerfilEstudiante from './pages/CrearPerfilEstudiante'
import EditarOrganizacion from './pages/EditarOrganizacion'
import EditarPerfil from './pages/EditarPerfil'
import EditarVacante from './pages/EditarVacante'
import Estudiantes from './pages/Estudiantes'
import Guardados from './pages/Guardados'
import Home from './pages/Home'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Mensajes from './pages/Mensajes'
import MiEstadia from './pages/MiEstadia'
import MiPerfil from './pages/MiPerfil'
import NotFound from './pages/NotFound'
import OrganizacionDetalle from './pages/OrganizacionDetalle'
import Organizaciones from './pages/Organizaciones'
import Notificaciones from './pages/Notificaciones'
import PanelEmpresa from './pages/PanelEmpresa'
import PerfilEstudiante from './pages/PerfilEstudiante'
import Postulaciones from './pages/Postulaciones'
import PublicarVacante from './pages/PublicarVacante'
import Recuperar from './pages/Recuperar'
import Register from './pages/Register'
import RutasAprendizaje from './pages/RutasAprendizaje'
import SeguimientoDetalle from './pages/SeguimientoDetalle'
import Seguimientos from './pages/Seguimientos'
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

      {/* Todo lo de adentro pide sesión; algunos grupos, además, un rol. */}
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="inicio" element={<Home />} />

        <Route path="vacantes" element={<Vacantes />} />
        <Route path="vacantes/:id" element={<VacancyDetail />} />
        <Route path="guardados" element={<Guardados />} />
        <Route path="estudiantes" element={<Estudiantes />} />
        <Route path="estudiantes/:id" element={<PerfilEstudiante />} />
        <Route path="organizaciones" element={<Organizaciones />} />
        <Route path="organizaciones/:id" element={<OrganizacionDetalle />} />

        <Route element={<RequireAuth roles={['estudiante']} />}>
          <Route path="rutas" element={<RutasAprendizaje />} />
          <Route path="perfil" element={<MiPerfil />} />
          <Route path="perfil/crear" element={<CrearPerfilEstudiante />} />
          <Route path="perfil/editar" element={<EditarPerfil />} />
          <Route path="postulaciones" element={<Postulaciones />} />
          <Route path="estadia" element={<MiEstadia />} />
        </Route>

        <Route element={<RequireAuth roles={['empresa']} />}>
          <Route path="vacantes/nueva" element={<PublicarVacante />} />
          <Route path="empresa" element={<PanelEmpresa />} />
          <Route path="empresa/editar" element={<EditarOrganizacion />} />
        </Route>
        <Route element={<RequireAuth roles={['coordinador']} />}>
          <Route path="coordinacion" element={<Coordinacion />} />
        </Route>
        <Route element={<RequireAuth roles={['empresa', 'coordinador']} />}>
          <Route path="vacantes/:id/editar" element={<EditarVacante />} />
        </Route>
        <Route element={<RequireAuth roles={['empresa', 'coordinador', 'asesor_academico']} />}>
          <Route path="vacantes/:id/candidatos" element={<Candidatos />} />
          <Route path="seguimientos" element={<Seguimientos />} />
          <Route path="seguimientos/:id" element={<SeguimientoDetalle />} />
        </Route>

        <Route path="mensajes" element={<Mensajes />} />
        <Route path="notificaciones" element={<Notificaciones />} />
        <Route path="configuracion" element={<Configuracion />} />
      </Route>
    </Routes>
  )
}

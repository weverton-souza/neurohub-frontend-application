import { Routes, Route } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import Login from '@/routes/Login'
import Register from '@/routes/Register'
import ReportList from '@/routes/ReportList'
import ReportEditor from '@/routes/ReportEditor'
import CustomerList from '@/routes/CustomerList'
import CustomerProfile from '@/routes/CustomerProfile'
import FormList from '@/routes/FormList'
import FormBuilder from '@/routes/FormBuilder'
import FormFill from '@/routes/FormFill'
import FormResponseList from '@/routes/FormResponseList'
import FormulaGuide from '@/routes/FormulaGuide'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Register />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<ReportList />} />
          <Route path="/relatorio/:id" element={<ReportEditor />} />
          <Route path="/clientes" element={<CustomerList />} />
          <Route path="/clientes/:id" element={<CustomerProfile />} />
          <Route path="/formularios" element={<FormList />} />
          <Route path="/formulario/:id/editar" element={<FormBuilder />} />
          <Route path="/formulario/:id/preencher" element={<FormFill />} />
          <Route path="/formulario/:id/respostas" element={<FormResponseList />} />
          <Route path="/guias" element={<FormulaGuide />} />
        </Route>
      </Route>
    </Routes>
  )
}

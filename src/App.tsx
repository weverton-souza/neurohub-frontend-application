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
import PublicFormFill from '@/routes/PublicFormFill'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/public/forms/:token" element={<PublicFormFill />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<ReportList />} />
          <Route path="/reports/:id" element={<ReportEditor />} />
          <Route path="/customers" element={<CustomerList />} />
          <Route path="/customers/:id" element={<CustomerProfile />} />
          <Route path="/forms" element={<FormList />} />
          <Route path="/forms/:id/edit" element={<FormBuilder />} />
          <Route path="/forms/:id/fill" element={<FormFill />} />
          <Route path="/forms/:id/responses" element={<FormResponseList />} />
          <Route path="/guides" element={<FormulaGuide />} />
        </Route>
      </Route>
    </Routes>
  )
}

import { Routes, Route } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import LaudoList from '@/routes/LaudoList'
import LaudoEditor from '@/routes/LaudoEditor'
import PatientList from '@/routes/PatientList'
import PatientProfile from '@/routes/PatientProfile'
import FormList from '@/routes/FormList'
import FormBuilder from '@/routes/FormBuilder'
import FormFill from '@/routes/FormFill'
import FormResponseList from '@/routes/FormResponseList'
import FormulaGuide from '@/routes/FormulaGuide'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<LaudoList />} />
        <Route path="/laudo/:id" element={<LaudoEditor />} />
        <Route path="/pacientes" element={<PatientList />} />
        <Route path="/pacientes/:id" element={<PatientProfile />} />
        <Route path="/formularios" element={<FormList />} />
        <Route path="/formulario/:id/editar" element={<FormBuilder />} />
        <Route path="/formulario/:id/preencher" element={<FormFill />} />
        <Route path="/formulario/:id/respostas" element={<FormResponseList />} />
        <Route path="/formulas" element={<FormulaGuide />} />
      </Route>
    </Routes>
  )
}

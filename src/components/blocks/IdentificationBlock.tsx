import { useCallback, useMemo } from 'react'
import type { IdentificationData, Professional, CustomerData, Solicitor, Customer } from '@/types'
import Input from '@/components/ui/Input'
import Toggle from '@/components/ui/Toggle'
import Select from '@/components/ui/Select'

interface IdentificationBlockProps {
  data: IdentificationData
  onChange: (data: IdentificationData) => void
  customers?: Customer[]
  onCustomerSelected?: (customerId: string) => void
}

const sectionHeaderClass =
  'text-sm font-semibold text-brand-700 uppercase tracking-wide mb-3 pb-2 border-b border-brand-100'

function calculateAge(birthDate: string, referenceDate: string): string {
  if (!birthDate) return ''
  const birth = new Date(birthDate + 'T00:00:00')
  const ref = referenceDate ? new Date(referenceDate + 'T00:00:00') : new Date()

  if (isNaN(birth.getTime()) || isNaN(ref.getTime())) return ''
  if (ref < birth) return ''

  let years = ref.getFullYear() - birth.getFullYear()
  let months = ref.getMonth() - birth.getMonth()

  if (months < 0) {
    years--
    months += 12
  }

  if (ref.getDate() < birth.getDate()) {
    months--
    if (months < 0) {
      years--
      months += 12
    }
  }

  if (years === 0) {
    return `${months} ${months === 1 ? 'mes' : 'meses'}`
  }

  if (months === 0) {
    return `${years} ${years === 1 ? 'ano' : 'anos'}`
  }

  return `${years} ${years === 1 ? 'ano' : 'anos'} e ${months} ${months === 1 ? 'mes' : 'meses'}`
}

const IdentificationBlock = ({ data, onChange, customers, onCustomerSelected }: IdentificationBlockProps) => {
  const hasSolicitor = !!data.solicitor

  const customerOptions = useMemo(() => {
    if (!customers || customers.length === 0) return []
    return customers.map((p) => ({
      value: p.id,
      label: p.data.name || 'Cliente sem nome',
    }))
  }, [customers])

  const handleSelectCustomer = useCallback(
    (customerId: string) => {
      if (!customerId || !customers) return
      const customer = customers.find((p) => p.id === customerId)
      if (!customer) return
      // Copy customer data into the identification block
      onChange({ ...data, customer: { ...customer.data } })
      onCustomerSelected?.(customerId)
    },
    [data, onChange, customers, onCustomerSelected]
  )

  const updateProfessional = useCallback(
    (field: keyof Professional, value: string) => {
      onChange({
        ...data,
        professional: { ...data.professional, [field]: value },
      })
    },
    [data, onChange]
  )

  const updateCustomer = useCallback(
    (field: keyof CustomerData, value: string) => {
      const updatedCustomer = { ...data.customer, [field]: value }

      // Auto-calculate age when birthDate changes
      if (field === 'birthDate') {
        updatedCustomer.age = calculateAge(value, data.date)
      }

      onChange({ ...data, customer: updatedCustomer })
    },
    [data, onChange]
  )

  const updateSolicitor = useCallback(
    (field: keyof Solicitor, value: string) => {
      if (!data.solicitor) return
      onChange({
        ...data,
        solicitor: { ...data.solicitor, [field]: value },
      })
    },
    [data, onChange]
  )

  const toggleSolicitor = useCallback(
    (enabled: boolean) => {
      onChange({
        ...data,
        solicitor: enabled
          ? { name: '', crm: '', rqe: '', specialty: '' }
          : undefined,
      })
    },
    [data, onChange]
  )

  const updateField = useCallback(
    (field: 'date' | 'location', value: string) => {
      const updated = { ...data, [field]: value }

      // Recalculate age when report date changes
      if (field === 'date' && data.customer.birthDate) {
        updated.customer = {
          ...data.customer,
          age: calculateAge(data.customer.birthDate, value),
        }
      }

      onChange(updated)
    },
    [data, onChange]
  )

  return (
    <div className="space-y-6">
      {/* Profissional Responsável */}
      <section>
        <h3 className={sectionHeaderClass}>Profissional Responsável</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nome"
            value={data.professional.name}
            onChange={(e) => updateProfessional('name', e.target.value)}
            placeholder="Nome do profissional"
          />
          <Input
            label="CRP"
            value={data.professional.crp}
            onChange={(e) => updateProfessional('crp', e.target.value)}
            placeholder="CRP"
          />
          <div className="col-span-2">
            <Input
              label="Especialização"
              value={data.professional.specialization}
              onChange={(e) => updateProfessional('specialization', e.target.value)}
              placeholder="Especialização"
            />
          </div>
        </div>
      </section>

      {/* Solicitante */}
      <section>
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-brand-100">
          <h3 className="text-sm font-semibold text-brand-700 uppercase tracking-wide">
            Solicitante
          </h3>
          <Toggle
            label="Incluir solicitante"
            checked={hasSolicitor}
            onChange={toggleSolicitor}
          />
        </div>
        {hasSolicitor && data.solicitor && (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nome"
              value={data.solicitor.name}
              onChange={(e) => updateSolicitor('name', e.target.value)}
              placeholder="Nome do solicitante"
            />
            <Input
              label="CRM"
              value={data.solicitor.crm ?? ''}
              onChange={(e) => updateSolicitor('crm', e.target.value)}
              placeholder="CRM"
            />
            <Input
              label="RQE"
              value={data.solicitor.rqe ?? ''}
              onChange={(e) => updateSolicitor('rqe', e.target.value)}
              placeholder="RQE"
            />
            <Input
              label="Especialidade"
              value={data.solicitor.specialty ?? ''}
              onChange={(e) => updateSolicitor('specialty', e.target.value)}
              placeholder="Especialidade"
            />
          </div>
        )}
      </section>

      {/* Dados do Cliente */}
      <section>
        <h3 className={sectionHeaderClass}>Dados do Cliente</h3>
        {customerOptions.length > 0 && (
          <div className="mb-4">
            <Select
              value=""
              onChange={handleSelectCustomer}
              options={customerOptions}
              placeholder="Preencher com cliente cadastrado..."
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nome"
            value={data.customer.name}
            onChange={(e) => updateCustomer('name', e.target.value)}
            placeholder="Nome completo do cliente"
          />
          <Input
            label="CPF"
            value={data.customer.cpf}
            onChange={(e) => updateCustomer('cpf', e.target.value)}
            placeholder="000.000.000-00"
          />
          <Input
            label="Data de Nascimento"
            type="date"
            value={data.customer.birthDate}
            onChange={(e) => updateCustomer('birthDate', e.target.value)}
          />
          <Input
            label="Idade"
            value={data.customer.age}
            onChange={(e) => updateCustomer('age', e.target.value)}
            placeholder="Ex: 32 anos e 4 meses"
          />
          <Input
            label="Escolaridade"
            value={data.customer.education}
            onChange={(e) => updateCustomer('education', e.target.value)}
            placeholder="Escolaridade"
          />
          <Input
            label="Profissão"
            value={data.customer.profession}
            onChange={(e) => updateCustomer('profession', e.target.value)}
            placeholder="Profissão"
          />
          <Input
            label="Nome da Mãe"
            value={data.customer.motherName}
            onChange={(e) => updateCustomer('motherName', e.target.value)}
            placeholder="Nome da mãe"
          />
          <Input
            label="Nome do Pai"
            value={data.customer.fatherName}
            onChange={(e) => updateCustomer('fatherName', e.target.value)}
            placeholder="Nome do pai"
          />
          <Input
            label="Responsável Legal (opcional)"
            value={data.customer.guardianName ?? ''}
            onChange={(e) => updateCustomer('guardianName', e.target.value)}
            placeholder="Nome do responsável"
          />
          <Input
            label="Grau de Parentesco"
            value={data.customer.guardianRelationship ?? ''}
            onChange={(e) => updateCustomer('guardianRelationship', e.target.value)}
            placeholder="Ex: Avó, Tio, Tutor"
          />
        </div>
      </section>

      {/* Dados do Relatório */}
      <section>
        <h3 className={sectionHeaderClass}>Dados do Relatório</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Data do Relatório"
            type="date"
            value={data.date}
            onChange={(e) => updateField('date', e.target.value)}
          />
          <Input
            label="Local"
            value={data.location}
            onChange={(e) => updateField('location', e.target.value)}
            placeholder="Ex: Belo Horizonte - MG"
          />
        </div>
      </section>
    </div>
  )
}

export default IdentificationBlock

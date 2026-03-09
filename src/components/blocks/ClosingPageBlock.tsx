import type { ClosingPageData } from '@/types'
import Input from '@/components/ui/Input'
import TextArea from '@/components/ui/TextArea'
import Toggle from '@/components/ui/Toggle'

interface ClosingPageBlockProps {
  data: ClosingPageData
  onChange: (data: ClosingPageData) => void
}

export default function ClosingPageBlock({ data, onChange }: ClosingPageBlockProps) {
  return (
    <div className="space-y-4">
      <Input
        label="Título"
        value={data.title}
        onChange={(e) => onChange({ ...data, title: e.target.value })}
        placeholder="TERMO DE ENTREGA E CIÊNCIA"
      />

      <TextArea
        label="Texto do termo"
        value={data.bodyText}
        onChange={(e) => onChange({ ...data, bodyText: e.target.value })}
        rows={5}
        placeholder="Texto do termo de entrega..."
      />

      {/* Signature Toggles */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Assinaturas
        </label>
        <div className="space-y-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="text-brand-500 shrink-0">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Profissional</span>
            <span className="text-gray-400 text-xs">(sempre incluso)</span>
          </div>
          <Toggle
            label="Paciente"
            checked={data.showPatientSignature}
            onChange={(checked) => onChange({ ...data, showPatientSignature: checked })}
          />
          <Toggle
            label="Mãe"
            checked={data.showMotherSignature}
            onChange={(checked) => onChange({ ...data, showMotherSignature: checked })}
          />
          <Toggle
            label="Pai"
            checked={data.showFatherSignature}
            onChange={(checked) => onChange({ ...data, showFatherSignature: checked })}
          />
          <Toggle
            label="Responsável Legal"
            checked={data.showGuardianSignature}
            onChange={(checked) => onChange({ ...data, showGuardianSignature: checked })}
          />
          <p className="text-xs text-gray-400 italic mt-1">
            Os nomes serão preenchidos automaticamente a partir do bloco de identificação.
          </p>
        </div>
      </div>

      {/* Footer Note */}
      <TextArea
        label="Observação final (abaixo das assinaturas)"
        value={data.footerNote}
        onChange={(e) => onChange({ ...data, footerNote: e.target.value })}
        rows={3}
        placeholder="Texto adicional que aparecerá após as assinaturas no documento..."
      />

      <p className="text-xs text-gray-400 italic">
        Este bloco sempre iniciará em uma nova página no documento exportado.
      </p>
    </div>
  )
}

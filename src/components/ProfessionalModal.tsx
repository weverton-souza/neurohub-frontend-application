import { useState, useCallback, useRef } from 'react'
import type { Professional, ContactType } from '@/types'
import { CONTACT_TYPE_OPTIONS, createEmptyContactItem } from '@/types'
import { getProfessional, saveProfessional } from '@/lib/storage'
import { fileToBase64DataUrl, resizeImageToBase64 } from '@/lib/image-utils'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { CloseIcon } from '@/components/icons'

interface ProfessionalModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ProfessionalModal({ isOpen, onClose }: ProfessionalModalProps) {
  const [professional, setProfessional] = useState<Professional>(() => getProfessional())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSave = useCallback(() => {
    saveProfessional(professional)
    onClose()
  }, [professional, onClose])

  const handleLogoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const dataUrl = await fileToBase64DataUrl(file)
        const resized = await resizeImageToBase64(dataUrl)
        setProfessional((prev) => ({ ...prev, logo: resized }))
      } catch (err) {
        alert((err as Error).message)
      }
      e.target.value = ''
    },
    []
  )

  const handleRemoveLogo = useCallback(() => {
    setProfessional((prev) => ({ ...prev, logo: undefined }))
  }, [])

  const handleAddContact = useCallback(() => {
    setProfessional((prev) => ({
      ...prev,
      contactItems: [...(prev.contactItems ?? []), createEmptyContactItem()],
    }))
  }, [])

  const handleRemoveContact = useCallback((id: string) => {
    setProfessional((prev) => ({
      ...prev,
      contactItems: (prev.contactItems ?? []).filter((c) => c.id !== id),
    }))
  }, [])

  const handleUpdateContact = useCallback(
    (id: string, field: 'type' | 'value', value: string) => {
      setProfessional((prev) => ({
        ...prev,
        contactItems: (prev.contactItems ?? []).map((c) =>
          c.id === id ? { ...c, [field]: value } : c
        ),
      }))
    },
    []
  )

  const sectionHeader = 'text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configurações do Profissional"
      size="lg"
    >
      <div className="p-4 space-y-6">
        {/* Section 1: Basic Data */}
        <div>
          <h3 className={sectionHeader}>Dados Básicos</h3>
          <div className="space-y-3">
            <Input
              label="Nome"
              value={professional.name}
              onChange={(e) => setProfessional({ ...professional, name: e.target.value })}
              placeholder="Nome completo"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="CRP"
                value={professional.crp}
                onChange={(e) => setProfessional({ ...professional, crp: e.target.value })}
                placeholder="CRP"
              />
              <Input
                label="Especialização"
                value={professional.specialization}
                onChange={(e) => setProfessional({ ...professional, specialization: e.target.value })}
                placeholder="Especialização"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Logo */}
        <div>
          <h3 className={sectionHeader}>Logo (cabeçalho do documento)</h3>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />
          {professional.logo ? (
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                <img
                  src={professional.logo}
                  alt="Logo"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Trocar
                </Button>
                <Button variant="ghost" size="sm" onClick={handleRemoveLogo}>
                  <span className="text-red-500">Remover</span>
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-brand-400 hover:bg-brand-50/50 transition-all text-sm text-gray-500 hover:text-brand-600"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              Enviar logo (PNG, JPG — máx. 500KB)
            </button>
          )}
        </div>

        {/* Section 3: Contacts / Social */}
        <div>
          <h3 className={sectionHeader}>Contatos e Redes Sociais (rodapé do documento)</h3>
          <div className="space-y-2">
            {(professional.contactItems ?? []).map((item) => (
              <div key={item.id} className="flex items-end gap-2">
                <div className="w-36 shrink-0">
                  <Select
                    value={item.type}
                    onChange={(value) => handleUpdateContact(item.id, 'type', value as ContactType)}
                    options={CONTACT_TYPE_OPTIONS}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    value={item.value}
                    onChange={(e) => handleUpdateContact(item.id, 'value', e.target.value)}
                    placeholder={getContactPlaceholder(item.type)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveContact(item.id)}
                  className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0 mb-px"
                  title="Remover"
                >
                  <CloseIcon size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddContact}
              className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium py-1 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Adicionar contato
            </button>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar</Button>
        </div>
      </div>
    </Modal>
  )
}

function getContactPlaceholder(type: ContactType): string {
  switch (type) {
    case 'instagram': return '@usuario'
    case 'linkedin': return 'linkedin.com/in/usuario'
    case 'facebook': return 'facebook.com/usuario'
    case 'website': return 'www.seusite.com.br'
    case 'phone': return '(00) 00000-0000'
    case 'email': return 'email@exemplo.com'
  }
}

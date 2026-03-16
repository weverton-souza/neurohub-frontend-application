import { useState, useEffect, useCallback, useRef } from 'react'
import type { Customer } from '@/types'
import { getCustomers } from '@/lib/api/customer-api'
import { createFormLink } from '@/lib/api/form-link-api'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

interface GenerateFormLinkModalProps {
  isOpen: boolean
  onClose: () => void
  formId: string
}

type ModalState = 'select-customer' | 'loading' | 'success' | 'error'

export default function GenerateFormLinkModal({ isOpen, onClose, formId }: GenerateFormLinkModalProps) {
  const [state, setState] = useState<ModalState>('select-customer')
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [generatedLink, setGeneratedLink] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setSearchLoading(true)
    getCustomers(0, 10)
      .then((page) => setCustomers(page.content))
      .finally(() => setSearchLoading(false))
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      setSearchLoading(true)
      getCustomers(0, 10, search || undefined)
        .then((page) => setCustomers(page.content))
        .finally(() => setSearchLoading(false))
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search, isOpen])

  const handleGenerate = useCallback(async () => {
    if (!selectedCustomer) return

    setState('loading')
    setErrorMessage('')

    try {
      const formLink = await createFormLink(formId, selectedCustomer.id)
      const link = `${window.location.origin}/public/forms/${formLink.token}`
      setGeneratedLink(link)
      setState('success')
    } catch (err) {
      setState('error')
      setErrorMessage(
        err instanceof Error ? err.message : 'Erro ao gerar o link.'
      )
    }
  }, [formId, selectedCustomer])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const textarea = document.createElement('textarea')
      textarea.value = generatedLink
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [generatedLink])

  const handleClose = () => {
    setState('select-customer')
    setSearch('')
    setSelectedCustomer(null)
    setGeneratedLink('')
    setErrorMessage('')
    setCopied(false)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Gerar Link Público"
      size="md"
    >
      <div className="p-4 space-y-4">
        {state === 'select-customer' && (
          <>
            <p className="text-sm text-gray-500">
              Selecione o cliente que receberá o link para preencher este formulário.
            </p>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente por nome ou CPF..."
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />

            <div className="max-h-64 overflow-y-auto space-y-1.5">
              {searchLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full" />
                </div>
              ) : customers.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  Nenhum cliente encontrado
                </p>
              ) : (
                customers.map((customer) => {
                  const isSelected = selectedCustomer?.id === customer.id
                  return (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => setSelectedCustomer(customer)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-brand-500 bg-brand-50 shadow-sm'
                          : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'
                      }`}
                    >
                      <p className={`text-sm font-medium ${isSelected ? 'text-brand-700' : 'text-gray-900'}`}>
                        {customer.data.name || '(sem nome)'}
                      </p>
                      {customer.data.cpf && (
                        <p className="text-xs text-gray-400 mt-0.5">{customer.data.cpf}</p>
                      )}
                    </button>
                  )
                })
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleGenerate} disabled={!selectedCustomer}>
                Gerar Link
              </Button>
            </div>
          </>
        )}

        {state === 'loading' && (
          <div className="text-center py-8">
            <div className="mx-auto animate-spin w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full mb-4" />
            <p className="text-sm text-gray-600">Gerando link...</p>
          </div>
        )}

        {state === 'success' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                Link gerado para {selectedCustomer?.data.name}
              </p>
              <p className="text-xs text-gray-400">Válido por 72 horas</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={generatedLink}
                className="flex-1 bg-transparent text-xs text-gray-600 border-0 focus:ring-0 focus:outline-none truncate"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  copied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-brand-500 text-white hover:bg-brand-600'
                }`}
              >
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>

            <div className="flex justify-end">
              <Button variant="ghost" onClick={handleClose}>Fechar</Button>
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="text-center py-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <p className="text-sm text-gray-700 font-medium mb-1">Erro ao gerar link</p>
            <p className="text-xs text-gray-500 mb-4">{errorMessage}</p>
            <div className="flex justify-center gap-2">
              <Button variant="ghost" onClick={handleClose}>Fechar</Button>
              <Button onClick={() => setState('select-customer')}>Tentar novamente</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

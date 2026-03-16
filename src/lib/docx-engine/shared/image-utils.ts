const MAX_LOGO_DIMENSION = 400
const MAX_LOGO_FILE_SIZE = 500 * 1024

export function fileToBase64DataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_LOGO_FILE_SIZE) {
      reject(new Error('Arquivo muito grande. Tamanho máximo: 500KB'))
      return
    }
    if (!file.type.startsWith('image/')) {
      reject(new Error('Arquivo deve ser uma imagem (PNG, JPG, etc.)'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function resizeImageToBase64(
  dataUrl: string,
  maxDimension: number = MAX_LOGO_DIMENSION
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Não foi possível criar contexto do canvas'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('Falha ao carregar imagem'))
    img.src = dataUrl
  })
}

export function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.width, height: img.height })
    img.onerror = () => reject(new Error('Falha ao carregar imagem'))
    img.src = dataUrl
  })
}

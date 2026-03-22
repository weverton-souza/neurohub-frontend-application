import { BorderStyle } from 'docx'

export const DARK_BLUE = '163A5F'
export const MEDIUM_BLUE = '1E5F8C'
export const LIGHT_BLUE = 'D6E8F5'
export const WHITE = 'FFFFFF'
export const LIGHT_GRAY = 'F2F3F4'
export const BORDER_GRAY = 'D5D8DC'

export const PAGE_CONTENT_WIDTH = 10206
export const PAGE_MARGIN = 850

export const THIN_BORDER = {
  color: BORDER_GRAY,
  space: 1,
  style: BorderStyle.SINGLE,
  size: 4,
}

export const NO_BORDER = {
  color: WHITE,
  space: 0,
  style: BorderStyle.NONE,
  size: 0,
}

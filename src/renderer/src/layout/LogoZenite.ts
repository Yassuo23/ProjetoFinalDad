import logoClaro from '../assets/brand/logo-claro.png'
import logoEscuro from '../assets/brand/logo-escuro.png'
import { Componente, criarElemento } from '../nucleo'

export type VarianteLogo = 'completa' | 'compacta'
export type FundoLogo = 'escuro' | 'claro'

export interface OpcoesLogoZenite {
  readonly variante?: VarianteLogo
  readonly fundo?: FundoLogo
}

/** Classes literais — o scanner do Tailwind v4 precisa vê-las por extenso. */
const CLASSES = {
  completaEscuro: 'flex w-48 items-center bg-grafite',
  completaClara: 'flex w-48 items-center bg-pedra',
  imagemCompleta: 'block h-auto w-full',
  compactaEscuro: 'relative size-8 shrink-0 overflow-hidden bg-grafite',
  compactaClara: 'relative size-8 shrink-0 overflow-hidden bg-pedra',
  imagemCompactaEscuro: 'absolute left-[-5.4px] top-[-10.4px] h-[53.6px] w-[127px] max-w-none',
  imagemCompactaClara: 'absolute left-[-7.6px] top-[-10.8px] h-[53.4px] w-[126.9px] max-w-none',
} as const

/** Mapeamento oficial: o sufixo do arquivo corresponde ao fundo do PNG. */
const IMAGENS: Readonly<Record<FundoLogo, string>> = {
  escuro: logoEscuro,
  claro: logoClaro,
}

const ESTILOS: Readonly<
  Record<FundoLogo, { readonly completa: string; readonly compacta: string; readonly recorte: string }>
> = {
  escuro: {
    completa: CLASSES.completaEscuro,
    compacta: CLASSES.compactaEscuro,
    recorte: CLASSES.imagemCompactaEscuro,
  },
  claro: {
    completa: CLASSES.completaClara,
    compacta: CLASSES.compactaClara,
    recorte: CLASSES.imagemCompactaClara,
  },
}

/**
 * Logotipo oficial da marca, importado pelo Vite. A variante compacta recorta
 * apenas o símbolo do PNG com overflow + posicionamento Tailwind — sem SVG
 * desenhado à mão, sem imagem remota e sem `innerHTML`.
 */
export class LogoZenite extends Componente {
  constructor(opcoes: OpcoesLogoZenite = {}) {
    const variante = opcoes.variante ?? 'completa'
    const fundo = opcoes.fundo ?? 'escuro'
    const estilo = ESTILOS[fundo]

    const imagem = criarElemento('img', {
      className: variante === 'compacta' ? estilo.recorte : CLASSES.imagemCompleta,
      atributos: {
        src: IMAGENS[fundo],
        alt: variante === 'compacta' ? 'Símbolo do Zênite' : 'Zênite — Aluguel Outdoor',
      },
    })

    super(
      criarElemento('div', {
        className: variante === 'compacta' ? estilo.compacta : estilo.completa,
        filhos: [imagem],
      }),
    )
  }
}

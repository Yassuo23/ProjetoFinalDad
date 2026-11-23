import { substituirConteudo } from './dom'

/** Ciclo de vida mínimo para todos os componentes do renderer. */
export abstract class Componente {
  protected readonly elemento: HTMLElement
  private montado = false

  constructor(elemento: HTMLElement) {
    this.elemento = elemento
  }

  get raiz(): HTMLElement {
    return this.elemento
  }

  montar(destino: Element): void {
    if (this.montado) {
      return
    }
    substituirConteudo(destino, this.elemento)
    this.montado = true
    this.aoMontar()
  }

  destruir(): void {
    if (!this.montado) {
      return
    }
    this.aoDesmontar()
    this.elemento.remove()
    this.montado = false
  }

  protected aoMontar(): void {}
  protected aoDesmontar(): void {}
}

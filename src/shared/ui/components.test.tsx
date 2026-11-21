import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from '@/shared/i18n'
import { Field, Modal } from './components'

const wrap = (ui: React.ReactNode) => render(<I18nProvider>{ui}</I18nProvider>)

describe('Field', () => {
  it('связывает label и ошибку с полем', () => {
    wrap(<Field label="Email" error="Неверный email" defaultValue="x" />)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Неверный email')
  })
})

describe('Modal', () => {
  it('диалог с заголовком, закрывается по Escape', async () => {
    const onClose = vi.fn()
    wrap(
      <Modal title="Заказ" onClose={onClose}>
        <input aria-label="qty" />
      </Modal>,
    )
    expect(screen.getByRole('dialog', { name: 'Заказ' })).toBeInTheDocument()
    expect(screen.getByLabelText('qty')).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})

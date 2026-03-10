import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SortableHeader } from '@/components/shared/sortable-header'

function renderInTable(ui: React.ReactElement) {
  return render(
    <table>
      <thead>
        <tr>{ui}</tr>
      </thead>
    </table>
  )
}

describe('SortableHeader', () => {
  it('renders children text inside a table context', () => {
    renderInTable(
      <SortableHeader field="name" currentField="name" currentOrder="asc" onSort={jest.fn()}>
        Name
      </SortableHeader>
    )
    expect(screen.getByText('Name')).toBeInTheDocument()
  })

  it('shows ascending icon when field matches currentField and order is asc', () => {
    renderInTable(
      <SortableHeader field="name" currentField="name" currentOrder="asc" onSort={jest.fn()}>
        Name
      </SortableHeader>
    )
    expect(screen.getByTestId('icon-arrow-up')).toBeInTheDocument()
  })

  it('shows descending icon when field matches currentField and order is desc', () => {
    renderInTable(
      <SortableHeader field="name" currentField="name" currentOrder="desc" onSort={jest.fn()}>
        Name
      </SortableHeader>
    )
    expect(screen.getByTestId('icon-arrow-down')).toBeInTheDocument()
  })

  it('shows neutral icon when field does not match currentField', () => {
    renderInTable(
      <SortableHeader field="name" currentField="vram" currentOrder="asc" onSort={jest.fn()}>
        Name
      </SortableHeader>
    )
    expect(screen.getByTestId('icon-arrow-up-down')).toBeInTheDocument()
  })

  it('calls onSort(field) when clicked', async () => {
    const onSort = jest.fn()
    const user = userEvent.setup()

    renderInTable(
      <SortableHeader field="vram" currentField="name" currentOrder="asc" onSort={onSort}>
        VRAM
      </SortableHeader>
    )

    await user.click(screen.getByText('VRAM'))
    expect(onSort).toHaveBeenCalledWith('vram')
    expect(onSort).toHaveBeenCalledTimes(1)
  })
})

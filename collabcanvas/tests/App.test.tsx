import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import App from '../src/App'

// Mock react-konva primitives to avoid requiring canvas in JSDOM
vi.mock('react-konva', () => {
  type DivProps = Record<string, unknown>
  const Div = (props: DivProps) => <div {...props} />
  return {
    Stage: (props: DivProps) => <Div data-testid="stage" {...props} />,
    Layer: (props: DivProps) => <Div data-testid="layer" {...props} />,
    Group: (props: DivProps) => <Div data-testid="group" {...props} />,
    Line: (props: DivProps) => <Div data-testid="line" {...props} />,
  }
})

describe('App', () => {
  it('renders without crashing and includes a Stage', () => {
    const { getByTestId } = render(<App />)
    expect(getByTestId('stage')).toBeInTheDocument()
  })
})



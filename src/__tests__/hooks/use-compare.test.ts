import { renderHook, act } from '@testing-library/react'
import { CompareProvider, useCompare } from '@/contexts/compare-context'
import React from 'react'

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(CompareProvider, null, children)

describe('useCompare', () => {
  it('should start with empty compare list', () => {
    const { result } = renderHook(() => useCompare(), { wrapper })
    expect(result.current.models).toEqual([])
  })

  it('should add a model', () => {
    const { result } = renderHook(() => useCompare(), { wrapper })
    act(() => { result.current.addModel('model-a') })
    expect(result.current.models).toEqual(['model-a'])
  })

  it('should remove a model', () => {
    const { result } = renderHook(() => useCompare(), { wrapper })
    act(() => { result.current.addModel('model-a') })
    act(() => { result.current.removeModel('model-a') })
    expect(result.current.models).toEqual([])
  })

  it('should not add more than 4 models', () => {
    const { result } = renderHook(() => useCompare(), { wrapper })
    act(() => { result.current.addModel('a') })
    act(() => { result.current.addModel('b') })
    act(() => { result.current.addModel('c') })
    act(() => { result.current.addModel('d') })
    act(() => { result.current.addModel('e') })
    expect(result.current.models).toHaveLength(4)
  })

  it('should not add duplicate models', () => {
    const { result } = renderHook(() => useCompare(), { wrapper })
    act(() => { result.current.addModel('a') })
    act(() => { result.current.addModel('a') })
    expect(result.current.models).toHaveLength(1)
  })

  it('should check if model is in compare list', () => {
    const { result } = renderHook(() => useCompare(), { wrapper })
    act(() => { result.current.addModel('a') })
    expect(result.current.isComparing('a')).toBe(true)
    expect(result.current.isComparing('b')).toBe(false)
  })

  it('should clear all models', () => {
    const { result } = renderHook(() => useCompare(), { wrapper })
    act(() => { result.current.addModel('a') })
    act(() => { result.current.addModel('b') })
    act(() => { result.current.clearAll() })
    expect(result.current.models).toEqual([])
  })

  it('should throw when used outside provider', () => {
    expect(() => {
      renderHook(() => useCompare())
    }).toThrow('useCompare must be used within CompareProvider')
  })
})

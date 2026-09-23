import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
import { vi } from 'vitest'

// Mock crypto.randomUUID (jsdom does not provide it)
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () =>
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      }),
  },
  writable: true,
})

// AudioContext is not available in jsdom — timer feedback must degrade silently
class FakeAudioContext {
  state = 'running'
  currentTime = 0
  destination = {}
  createBuffer() {
    return { getChannelData: () => new Float32Array(1) }
  }
  createBufferSource() {
    return { connect: () => {}, start: () => {}, buffer: null }
  }
  createOscillator() {
    return { connect: () => {}, start: () => {}, stop: () => {}, frequency: { value: 0 }, type: '' }
  }
  createGain() {
    return {
      connect: () => {},
      gain: {
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
      },
    }
  }
  resume() {
    return Promise.resolve()
  }
}
Object.defineProperty(window, 'AudioContext', {
  value: FakeAudioContext,
  writable: true,
})

// Silence expected error logs in tests
vi.spyOn(console, 'error').mockImplementation(() => {})

import { describe, it, expect } from 'vitest'
import { getDeviceInfo } from '@/lib/device-info'

function mockUA(ua: string) {
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent: ua },
    writable: true,
    configurable: true,
  })
}

describe('getDeviceInfo — browser detection', () => {
  it('detects Edge (Edg/ marker)', () => {
    mockUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.2210.91')
    const info = getDeviceInfo()
    expect(info.browser).toBe('Edge')
    expect(info.browserVersion).toBe('120')
  })

  it('detects Opera (OPR/ marker)', () => {
    mockUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36 OPR/106.0.0.0')
    const info = getDeviceInfo()
    expect(info.browser).toBe('Opera')
    expect(info.browserVersion).toBe('106')
  })

  it('detects Samsung Browser', () => {
    mockUA('Mozilla/5.0 (Linux; Android 14; SM-G991B) AppleWebKit/537.36 Mobile SamsungBrowser/23.0 Chrome/115 Safari/537.36')
    const info = getDeviceInfo()
    expect(info.browser).toBe('Samsung')
    expect(info.browserVersion).toBe('23')
  })

  it('detects Chrome (not Edge or Opera)', () => {
    mockUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    const info = getDeviceInfo()
    expect(info.browser).toBe('Chrome')
    expect(info.browserVersion).toBe('120')
  })

  it('detects Firefox', () => {
    mockUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0')
    const info = getDeviceInfo()
    expect(info.browser).toBe('Firefox')
    expect(info.browserVersion).toBe('121')
  })

  it('detects Safari (no Chrome/Firefox)', () => {
    mockUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15')
    const info = getDeviceInfo()
    expect(info.browser).toBe('Safari')
    expect(info.browserVersion).toBe('17')
  })

  it('returns Unknown for unrecognised UA', () => {
    mockUA('curl/7.64.0')
    expect(getDeviceInfo().browser).toBe('Unknown')
  })
})

describe('getDeviceInfo — OS detection', () => {
  it('detects Windows 10/11 (NT 10.0)', () => {
    mockUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0')
    const info = getDeviceInfo()
    expect(info.os).toBe('Windows')
    expect(info.osVersion).toBe('10/11')
  })

  it('detects Windows 7 (NT 6.1)', () => {
    mockUA('Mozilla/5.0 (Windows NT 6.1; Win64; x64) Chrome/100.0.0.0')
    const info = getDeviceInfo()
    expect(info.os).toBe('Windows')
    expect(info.osVersion).toBe('7')
  })

  it('detects macOS and converts underscores to dots', () => {
    mockUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/605.1.15 Safari/605.1.15')
    const info = getDeviceInfo()
    expect(info.os).toBe('macOS')
    expect(info.osVersion).toBe('14.2.1')
  })

  it('detects Android', () => {
    mockUA('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36')
    const info = getDeviceInfo()
    expect(info.os).toBe('Android')
    expect(info.osVersion).toBe('14')
  })

  it('iPhone UA detects iOS', () => {
    mockUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1')
    const info = getDeviceInfo()
    expect(info.os).toBe('iOS')
    expect(info.osVersion).toBe('17.2')
    expect(info.device).toBe('Mobile')
  })

  it('iPad UA detects iPadOS', () => {
    mockUA('Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1')
    const info = getDeviceInfo()
    expect(info.os).toBe('iPadOS')
    expect(info.osVersion).toBe('17.2')
    expect(info.device).toBe('Tablet')
  })

  it('detects Linux', () => {
    mockUA('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0')
    expect(getDeviceInfo().os).toBe('Linux')
  })
})

describe('getDeviceInfo — device type', () => {
  it('Desktop for standard desktop UA', () => {
    mockUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0')
    expect(getDeviceInfo().device).toBe('Desktop')
  })

  it('Mobile for Android mobile UA', () => {
    mockUA('Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Chrome/120')
    expect(getDeviceInfo().device).toBe('Mobile')
  })

  it('Tablet for iPad UA', () => {
    mockUA('Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15')
    expect(getDeviceInfo().device).toBe('Tablet')
  })
})

describe('getDeviceInfo — timezone', () => {
  it('includes a non-empty timezone string', () => {
    mockUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0')
    const info = getDeviceInfo()
    expect(typeof info.timezone).toBe('string')
    expect(info.timezone.length).toBeGreaterThan(0)
  })
})

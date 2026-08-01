import { vi } from 'vitest'

export const mockAdminAuthModule = () => ({
  verifyAdminToken: vi.fn().mockResolvedValue(true),
})

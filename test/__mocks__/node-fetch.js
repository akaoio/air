/**
 * Mock for node-fetch to avoid ESM issues in Jest
 */

const mockFetch = jest.fn(() => 
  Promise.resolve({
    ok: true,
    status: 200,
    text: () => Promise.resolve('192.168.1.100'),
    json: () => Promise.resolve({ ip: '192.168.1.100' })
  })
)

// Allow mockResolvedValue, mockRejectedValue etc.
Object.assign(mockFetch, {
  mockResolvedValue: jest.fn().mockReturnValue(mockFetch),
  mockRejectedValue: jest.fn().mockReturnValue(mockFetch),
  mockResolvedValueOnce: jest.fn().mockReturnValue(mockFetch),
  mockRejectedValueOnce: jest.fn().mockReturnValue(mockFetch),
  mockClear: jest.fn()
})

module.exports = mockFetch
module.exports.default = mockFetch
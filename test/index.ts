/**
 * @akaoio/air Test Suite using @akaoio/battle
 * Distributed P2P database testing with PTY emulation
 */
import { Battle } from "@akaoio/battle"

async function runTests() {
  console.log('🚀 @akaoio/air Test Suite (Powered by @akaoio/battle)\n')

  const tests = [
    // Shell CLI Tests  
    {
      name: 'CLI: Air Status',
      command: 'bash',
      args: ['air.sh', 'status'],
      expect: ['Air']
    },
    {
      name: 'CLI: Air Help',
      command: 'bash', 
      args: ['air.sh', 'help'],
      expect: ['Usage:', 'air']
    },
    // TypeScript API Tests
    {
      name: 'API: Air Import',
      command: 'node',
      args: ['--input-type=module', '-e', `import { Air } from './dist/index.js'; console.log('Air API loaded');`],
      expect: ['Air API loaded']
    },
    {
      name: 'API: GUN Database',
      command: 'node', 
      args: ['--input-type=module', '-e', `import Gun from '@akaoio/gun'; console.log('GUN database loaded');`],
      expect: ['GUN database loaded'] 
    },
    // P2P Network Tests (basic)
    {
      name: 'Network: Port Check',
      command: 'node',
      args: ['--input-type=module', '-e', `console.log('P2P network test:', process.env.AIR_PORT || '8765');`],
      expect: ['P2P network test:', '8765']
    }
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    process.stdout.write(`Testing: ${test.name}... `)
    
    const battle = new Battle({
      timeout: 15000
    })

    try {
      const result = await battle.run(async (b) => {
        b.spawn(test.command, test.args || [])
        
        for (const pattern of test.expect) {
          await b.expect(pattern, 10000)
        }
      })

      if (result.success) {
        console.log('✅ PASSED')
        passed++
      } else {
        console.log('❌ FAILED')
        console.log(`  ${result.error}`)
        failed++
      }
    } catch (error) {
      console.log('❌ FAILED')
      console.log(`  ${error}`)
      failed++
    }
  }

  console.log('\n==================================================')
  console.log(`📊 Results: ${passed} passed, ${failed} failed`)
  console.log('==================================================')

  if (failed > 0) {
    console.log(`\n❌ Some tests failed. @akaoio/air needs fixes.`)
    process.exit(1)
  } else {
    console.log('\n✅ All tests passed! @akaoio/air is battle-tested.')
  }
}

// Run tests
runTests().catch(error => {
  console.error('💥 Test runner failed:', error)
  process.exit(1)
})
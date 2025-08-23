#!/usr/bin/env node

/**
 * Documentation build script for Air
 * Uses @akaoio/composer to generate docs from atomic YAML files
 */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function buildDocs() {
  console.log('📦 Building Air documentation...')
  
  try {
    const { stdout, stderr } = await execAsync('composer build')
    
    if (stderr) {
      console.error('⚠️ Warnings:', stderr)
    }
    
    console.log(stdout)
    console.log('✅ Documentation built successfully!')
    
  } catch (error) {
    console.error('❌ Documentation build failed:', error.message)
    process.exit(1)
  }
}

buildDocs()
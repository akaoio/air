# Agent Gamma: System Operations Specialist

**Agent**: Gamma - System Operations  
**Mission Phase**: Phase 3 - System Management  
**Timeline**: Days 4-6 (START after Agent-Beta delivers service mocks)  
**Priority**: MEDIUM - System lifecycle operations  
**Status**: AWAITING AGENT-BETA DEPENDENCIES

---

## 🎯 MISSION SCOPE

### **Primary Responsibility**: System Operations (20 methods)
- **Path Module** (6 methods) - Path and directory management
- **Installer Class** (5 methods) - System installation operations  
- **Uninstaller Class** (5 methods) - System removal operations
- **Updater Class** (4 methods) - System update operations

### **Secondary Responsibility**: System Integration
- Create system operation integration patterns
- Build deployment verification tests  
- Validate system lifecycle operations
- Establish installation/update/removal test patterns

---

## 📋 DETAILED TASK ASSIGNMENTS

### **DAY 4 TASKS** (WAITING FOR AGENT-BETA)

#### **📊 Preparation Phase** (2-3 hours)
**Dependencies**: Wait for Agent-Beta to deliver:
- ✅ Logger mocks from Agent-Beta
- ✅ Network mocks from Agent-Beta  
- ✅ Service integration patterns from Agent-Beta

```bash
# Once Agent-Beta ready, verify availability:
test/shared/mocks/loggerMocks.ts      # From Agent-Beta
test/shared/mocks/networkMocks.ts     # From Agent-Beta
test/shared/patterns/serviceTest.ts   # From Agent-Beta

# Then create system-specific shared resources:
test/shared/mocks/pathMocks.ts        # Path operation simulation
test/shared/mocks/installerMocks.ts   # Installation simulation
test/shared/mocks/systemMocks.ts      # System command simulation
test/shared/fixtures/systemTest/      # Test file system structures
```

#### **📁 Path Module Testing** (4-5 hours)
**Priority 1 - System Infrastructure**

**Files to test**:
1. `src/Path/bash.ts` - Bash path operations
2. `src/Path/getpaths.ts` - Path enumeration
3. `src/Path/index.ts` - Path module index
4. `src/Path/root.ts` - Root directory management
5. `src/Path/state.ts` - Path state management  
6. `src/Path/tmp.ts` - Temporary directory management

**Test files**: `test/unit/Path/`
```typescript
// test/unit/Path/bash.test.ts
// test/unit/Path/getpaths.test.ts
// test/unit/Path/root.test.ts
// test/unit/Path/state.test.ts
// test/unit/Path/tmp.test.ts
// test/integration/Path.integration.test.ts
```

**Critical Test Scenarios**:
- Directory creation and deletion
- Path validation and normalization
- Permission checking
- Cross-platform path handling
- Temporary directory cleanup
- Root directory access validation
- Bash script path resolution
- State file management

---

### **DAY 5 TASKS**

#### **⬇️ Installer Class Testing** (4-5 hours)
**Priority 2 - Installation Critical**

**Files to test**:
1. `src/Installer/constructor.ts` - Installer initialization
2. `src/Installer/check.ts` - Pre-installation checks
3. `src/Installer/configure.ts` - Configuration setup
4. `src/Installer/detect.ts` - System detection
5. `src/Installer/index.ts` - Installer coordination

**Test files**: `test/unit/Installer/`
```typescript
// test/unit/Installer/constructor.test.ts
// test/unit/Installer/check.test.ts
// test/unit/Installer/configure.test.ts
// test/unit/Installer/detect.test.ts
// test/integration/Installer.integration.test.ts
```

**Critical Test Scenarios**:
- System compatibility detection
- Dependency checking
- Configuration file creation
- Directory structure setup
- Permission validation
- Rollback on installation failure
- Existing installation detection
- System service registration

#### **⬆️ Updater Class Testing** (3-4 hours)  
**Priority 3 - Update Operations**

**Files to test**:
1. `src/Updater/constructor.ts` - Updater initialization
2. `src/Updater/git.ts` - Git-based updates
3. `src/Updater/packages.ts` - Package updates
4. `src/Updater/restart.ts` - Post-update restart

**Test files**: `test/unit/Updater/`
```typescript
// test/unit/Updater/constructor.test.ts
// test/unit/Updater/git.test.ts
// test/unit/Updater/packages.test.ts
// test/unit/Updater/restart.test.ts
// test/integration/Updater.integration.test.ts
```

**Critical Test Scenarios**:
- Git repository updates
- Package dependency updates
- Version compatibility checking
- Backup before update
- Graceful restart procedures
- Update failure rollback
- Concurrent update prevention
- Update notification system

---

### **DAY 6 TASKS**

#### **⬇️ Uninstaller Class Testing** (4-5 hours)
**Priority 4 - Removal Operations**

**Files to test**:
1. `src/Uninstaller/constructor.ts` - Uninstaller initialization
2. `src/Uninstaller/clean.ts` - System cleanup
3. `src/Uninstaller/remove.ts` - File removal
4. `src/Uninstaller/stop.ts` - Service shutdown

**Test files**: `test/unit/Uninstaller/`
```typescript
// test/unit/Uninstaller/constructor.test.ts
// test/unit/Uninstaller/clean.test.ts
// test/unit/Uninstaller/remove.test.ts
// test/unit/Uninstaller/stop.test.ts
// test/integration/Uninstaller.integration.test.ts
```

**Critical Test Scenarios**:
- Complete system removal
- Service shutdown before removal
- Configuration backup before removal
- Dependency cleanup
- Registry cleanup
- User data preservation options
- Partial removal recovery
- Permission handling during removal

#### **🔗 System Lifecycle Integration** (2-3 hours)
**Files to create**:
- `test/integration/SystemLifecycle.integration.test.ts`
- Install → Update → Uninstall workflow
- System operation coordination
- End-to-end system management validation

#### **🏁 System Operations Completion** (1-2 hours)
- Complete any remaining system tests
- Validate all system integration
- Create system operation mocks for Agent-Delta
- Document system testing patterns

---

## 🧪 SYSTEM-SPECIFIC TESTING PATTERNS

### **Path Testing Pattern**
```typescript
// test/shared/patterns/pathTest.ts
export function createPathTest(pathOperation: string, pathFunction: Function) {
  describe(`Path.${pathOperation}`, () => {
    let mockPath: any
    let testDirectory: string
    
    beforeEach(() => {
      testDirectory = `/tmp/air-path-test-${Date.now()}`
      mockPath = {
        config: { root: testDirectory },
        fs: {
          mkdirSync: jest.fn(),
          existsSync: jest.fn(),
          rmSync: jest.fn()
        },
        path: {
          join: jest.fn(),
          normalize: jest.fn(),
          resolve: jest.fn()
        }
      }
    })
    
    afterEach(() => {
      // Cleanup test directory
    })
    
    test('should handle valid path operations', () => {
      const result = pathFunction.call(mockPath, validPath)
      expect(result).toBeDefined()
    })
    
    test('should handle invalid paths gracefully', () => {
      expect(() => {
        pathFunction.call(mockPath, invalidPath)
      }).toThrow()
    })
  })
}
```

### **Installer Testing Pattern**
```typescript
// test/shared/patterns/installerTest.ts
export function createInstallerTest(installerMethod: string, methodFunction: Function) {
  describe(`Installer.${installerMethod}`, () => {
    let mockInstaller: any
    let testEnvironment: any
    
    beforeEach(() => {
      testEnvironment = {
        system: 'linux',
        architecture: 'x64',  
        permissions: 'user',
        existingInstall: false
      }
      
      mockInstaller = {
        config: testEnvironment,
        logger: { info: jest.fn(), error: jest.fn() },
        systemCommands: {
          run: jest.fn(),
          check: jest.fn()
        }
      }
    })
    
    test('should handle installation operations', () => {
      const result = methodFunction.call(mockInstaller)
      expect(result).toBeDefined()
    })
    
    test('should handle system compatibility', () => {
      mockInstaller.config.system = 'unsupported'
      expect(() => {
        methodFunction.call(mockInstaller)
      }).toThrow('Unsupported system')
    })
  })
}
```

### **System Command Testing Pattern**
```typescript
// test/shared/patterns/systemTest.ts
export function createSystemCommandTest(commandName: string, commandFunction: Function) {
  describe(`SystemCommand.${commandName}`, () => {
    let mockSystem: any
    
    beforeEach(() => {
      mockSystem = {
        exec: jest.fn(),
        spawn: jest.fn(),
        logger: { debug: jest.fn(), error: jest.fn() },
        config: { timeout: 30000, retries: 3 }
      }
    })
    
    test('should execute system commands successfully', async () => {
      mockSystem.exec.mockResolvedValue({ stdout: 'success', stderr: '' })
      const result = await commandFunction.call(mockSystem, validCommand)
      expect(result.success).toBe(true)
    })
    
    test('should handle command failures', async () => {
      mockSystem.exec.mockRejectedValue(new Error('Command failed'))
      await expect(commandFunction.call(mockSystem, validCommand))
        .rejects.toThrow('Command failed')
    })
  })
}
```

---

## 📤 DELIVERABLES FOR OTHER AGENTS

### **For Agent-Delta** (Integration Specialist)
- **System operation mocks**: Complete system management simulation
- **Deployment test patterns**: Installation/update/removal testing
- **System lifecycle patterns**: End-to-end system operation testing
- **System integration examples**: Cross-system operation validation

### **For Production Deployment**
- **Installation verification tests**: Automated installation validation
- **Update procedure tests**: Safe update operation validation  
- **Removal verification tests**: Clean uninstallation validation
- **System health checks**: Operational status validation

---

## 📊 SUCCESS METRICS

### **Coverage Targets**
- **Day 4**: Path module complete (6/20 methods = 30%)
- **Day 5**: Path + Installer + Updater complete (15/20 methods = 75%)
- **Day 6**: All system operations complete (20/20 methods = 100% of Phase 3)

### **Overall Project Impact**  
- **Phase 3 Complete**: 70% → 88% total coverage (20 methods added)
- **System Operations Ready**: Deployment and lifecycle validated
- **Integration Foundation**: System management patterns established

### **Quality Gates**
- ✅ All 20 system operation methods tested
- ✅ 100% branch coverage for system classes
- ✅ Installation/update/removal workflows validated
- ✅ System integration patterns established
- ✅ Deployment verification tests operational

---

## 🚨 DEPENDENCIES & BLOCKERS

### **Blocking Dependencies** (MUST wait for Agent-Beta)
- **Logger mocks**: Required for system operation logging
- **Network mocks**: Required for update operations  
- **Service patterns**: Need established service testing patterns

### **Blocking Other Agents**
- **Agent-Delta BLOCKED** until system operation patterns ready

**⚠️ CRITICAL**: Cannot start effectively until Agent-Beta delivers service mocks!

---

## 🔄 DAILY UPDATE PROTOCOL

### **Daily Updates Required**:
1. **System operations completed** with test file paths
2. **Dependencies received** from Agent-Beta  
3. **Blockers encountered** (system permissions, command execution)
4. **System patterns created** for Agent-Delta
5. **Progress toward coverage targets**

### **Communication**:
- **Update this file daily** with progress
- **Signal readiness** when system operation patterns ready for Agent-Delta
- **Coordinate system testing** (may need system command execution)
- **Document deployment patterns** for production use

---

## ⚡ READINESS CHECKLIST

### **Ready to Start When**:
- ✅ Agent-Beta delivers Logger mocks
- ✅ Agent-Beta delivers Network mocks
- ✅ `test/shared/mocks/loggerMocks.ts` available
- ✅ `test/shared/mocks/networkMocks.ts` available
- ✅ Agent-Beta signals "Agent-Gamma ready to start"

### **Signal to Agent-Delta**:
- ✅ System operation mocks created in `test/shared/mocks/`
- ✅ System patterns documented in `test/shared/patterns/`
- ✅ Agent-Gamma updates file: "Agent-Delta ready to start"

---

## 🧪 SPECIAL TESTING CONSIDERATIONS

### **System Command Execution**
- **Mock system commands** for unit tests
- **Real system commands** for integration tests (carefully isolated)
- **Permission testing** without affecting host system
- **Cross-platform compatibility** validation

### **File System Operations**
- **Isolated test directories** (`/tmp/air-test-*`)
- **Permission simulation** without requiring root
- **Cleanup verification** after each test
- **Path traversal attack prevention**

### **Installation Testing Strategy**
- **Container-based testing** for safe installation testing
- **Mock installation** for unit tests
- **Real installation verification** in isolated environment
- **Rollback testing** for installation failures

---

## 📝 PROGRESS LOG

### **Day 4 Progress**: [Agent to update when started]
- [ ] Dependencies received from Agent-Beta: [Waiting]
- [ ] Path module testing begun: [Waiting for deps]
- [ ] Methods completed: 0/20
- [ ] Blockers: [Waiting for Agent-Beta services]

### **Day 5 Progress**: [Agent to update]
- [ ] Installer/Updater testing progress
- [ ] Methods completed: /20
- [ ] System command testing status:
- [ ] Installation pattern established:

### **Day 6 Progress**: [Agent to update]  
- [ ] Uninstaller testing complete
- [ ] Methods completed: /20
- [ ] System lifecycle integration:
- [ ] Patterns ready for Agent-Delta:

---

**🚀 AGENT-GAMMA: SYSTEM OPERATIONS MISSION READY WHEN DEPENDENCIES DELIVERED!**  
**Critical Path: System Success = Deployment Readiness**

*Last Updated: [Agent to update]*  
*Next Update: [Within 24 hours after starting]*
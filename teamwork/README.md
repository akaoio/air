# AIR Project - Teamwork Coordination

## Tổng quan dự án
AIR là distributed P2P database system sử dụng GUN protocol, với SSL/DDNS tự động.

## Kiến trúc hiện tại
- **Pattern**: Function-per-file (Một hàm một file)
- **Structure**: Module-based (Mỗi module là một thư mục)
- **Separation**: Business logic (`/src/`) tách biệt hoàn toàn khỏi UI (`/script/`)

## Trạng thái hiện tại (2025-01-21)

### ✅ Đã hoàn thành
1. **Refactor toàn bộ codebase** từ Class-based sang Function-per-file architecture
2. **Tách biệt Business Logic và UI** hoàn toàn
3. **Xóa tất cả các Class files cũ**
4. **Tạo module structure mới** với các modules độc lập

### 🔄 Đang tiến hành
- Cập nhật scripts trong `/script/*.ts` để sử dụng kiến trúc mới

### 📋 Cần làm
- Test toàn bộ functionality với kiến trúc mới
- Update documentation
- Performance testing

## Phân công công việc

### Claude (Session 2025-01-21)
- ✅ Refactor architecture sang function-per-file
- ✅ Xóa old class files
- ✅ Tạo module structure mới

### Next Agent
- [ ] Update `/script/*.ts` files
- [ ] Run comprehensive tests
- [ ] Update ARCHITECTURE.md

## Module Structure

```
src/
├── installer/      # Installation functions
├── updater/        # Update functions
├── ddns/          # DDNS management
├── uninstaller/   # Uninstall functions
├── config/        # Core config
├── peer/          # Peer management
├── configmanager/ # Config management
├── statusreporter/# Status reporting
├── network/       # Network utilities
├── processmanager/# Process management
├── permissions/   # Permission checks
└── syspaths/      # System paths
```

## Important Notes
- **KHÔNG vi phạm nguyên tắc "Một hàm một file"**
- **LUÔN update file của mình trong teamwork/**
- **ĐỌC tất cả files trong teamwork/ trước khi làm việc**
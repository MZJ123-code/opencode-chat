# 问题 28：缺少 CI/CD 集成

## 严重程度
🟠 中等

## 问题描述

没有 GitHub Actions 或其他 CI/CD 配置，代码质量检查未自动化，测试未在 CI 中运行。

## 问题详情

### 当前状态

- 没有 `.github/workflows/` 目录
- 没有自动化测试
- 没有代码质量检查
- 没有自动部署

### 问题分析

1. **代码质量无法保证**
   - 没有自动运行 ESLint
   - 没有自动运行 TypeScript 检查
   - 代码风格不一致

2. **测试无法自动运行**
   - 每次提交都需要手动测试
   - 容易遗漏测试
   - 无法保证测试通过

3. **无法自动部署**
   - 每次发布都需要手动部署
   - 容易出错
   - 无法保证部署一致性

## 影响

- 代码质量不稳定
- 容易引入 bug
- 部署效率低

## 改进建议

### 方案 A：添加基础 CI

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run linting
        run: bun run lint

      - name: Run type checking
        run: bun run typecheck

      - name: Run tests
        run: bun test

  client:
    name: Client Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: cd client && bun install

      - name: Build
        run: cd client && bun run build
```

### 方案 B：添加代码质量检查

```yaml
# .github/workflows/quality.yml
name: Code Quality

on: [push, pull_request]

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run ESLint
        run: bun run lint

      - name: Run Prettier check
        run: bun run format:check

  types:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run TypeScript check
        run: bun run typecheck

      - name: Run TypeScript build
        run: bun run build
```

### 方案 C：添加自动部署

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Build
        run: cd client && bun run build

      - name: Deploy to server
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_KEY }}
          source: "."
          target: "/var/www/opencode-chat"

      - name: Restart server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_KEY }}
          script: |
            cd /var/www/opencode-chat
            bun install
            pm2 restart opencode-chat
```

### 方案 D：添加代码覆盖率

```yaml
# .github/workflows/coverage.yml
name: Coverage

on: [push, pull_request]

jobs:
  coverage:
    name: Coverage
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run tests with coverage
        run: bun test --coverage

      - name: Upload to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false
```

## 优先级

**P1（应该完成）**

- CI/CD 是现代项目的标配
- 可以快速实现基本版本

## 相关文件

- `.github/workflows/` 目录（需要创建）
- `package.json`

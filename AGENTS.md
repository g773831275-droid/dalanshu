# Repository Guidelines

## 项目结构

这是一个 Java 17 的 Maven 多模块后端，根 `pom.xml` 聚合 `ruoyi-admin`（应用入口）、`ruoyi-common`（通用能力）、`ruoyi-modules`（系统、工作流、任务等业务模块）和 `ruoyi-extend`（监控、SnailJob）。Java 源码及资源分别在各模块的 `src/main/java`、`src/main/resources`，后端测试位于 `ruoyi-admin/src/test/java`。`dalanbook-frontend/` 是 React/TanStack 前端，`plus-ui/` 是 Vue 3 管理端；静态资源各自在 `public/`。需求文档放入 `docs/模块名/`，数据库增量脚本放入 `script/sql/update/`。

## 构建、测试与本地运行

在根目录执行 `mvn clean package` 构建全部后端模块；默认跳过测试。提交前用 `mvn test -DskipTests=false` 运行测试，或用 `mvn -pl ruoyi-admin -am test -DskipTests=false` 聚焦应用及其依赖。启动后端可执行 `mvn -pl ruoyi-admin -am spring-boot:run`，并使用 `application-dev.yml` 配置开发环境。

前端进入对应目录后执行 `npm ci`（无锁文件时用 `npm install`）。`cd dalanbook-frontend && npm run dev` 启动站点，`npm run lint`、`npm run build` 分别检查和构建；其目录下的 `AGENTS.md` 另有局部要求。管理端使用 `cd plus-ui && npm run dev`，提交前运行 `npm run lint:eslint` 和 `npm run build:dev`。

## 代码风格与命名

遵循根 `.editorconfig`：Java/TS 使用 4 空格，JSON/YAML 使用 2 空格，UTF-8 和 LF。Java 按既有 `org.dromara` 包结构组织，类名使用 PascalCase，方法和字段使用 camelCase；沿用现有 DTO/VO、异常处理及响应模型。前端组件使用 PascalCase 文件名，例如 `PostCard.tsx`；不要手工修改生成的 `dalanbook-frontend/src/routeTree.gen.ts`。使用各前端工程已配置的 ESLint 与 Prettier 格式化。

## 测试与变更

新增行为应补充 JUnit 5 测试，测试类以 `*Test` 结尾；带环境标签的测试须匹配 Maven profile（`dev`、`local` 或 `prod`）。修改 API、页面或配置时同步更新相关 `docs/` 文档；修改数据库结构或数据时提供可重复执行的增量 SQL，不能只修改本地数据库。密码、令牌、SMTP 凭据和密钥只能经环境变量注入，禁止提交。

## 提交与合并请求

近期提交采用简洁中文动词前缀，如 `fix 修复…`、`update 优化…`、`chore: …`；一条提交只处理一个可审查的变更。功能分支从 `develop` 创建并合回后删除，`main` 保持稳定。合并请求应说明问题、实现和验证命令，关联 Issue；涉及界面提供截图，涉及 SQL 或配置明确迁移与回滚影响。

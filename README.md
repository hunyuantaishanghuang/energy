# MiMo 能源系统演化与碳达峰仿真展映平台

面向“评估—预测—优化”三层分析框架与宏观能源结构演化的交互式学术放映厅、Three.js 3D数字沙盘与AI科研图解工坊。

## 🌟 核心功能特色

1. **2D 专业学术精讲放映厅**
   - **3.4K (3456×2160) 超高清流媒体支持**：基于 HTTP 206 Partial Content 分块传输，支持首帧瞬间秒开与低延迟拖拽定位。
   - **画质微反差与图表增强滤镜**：预置学术图表超清锐化、报告厅高对比投影、暗色护眼反相及原画母带等模式，支持原画/增强分屏无级滑块对比。
   - **7 大学术章节全景导览**：无缝跳转“评估—预测—优化”三层框架、政企用三方动态博弈、四大 MiMo 仿真情景及核心政策建议。
   - **逐帧步进与 A-B 区间循环精研**：精准定位到 1/30 秒单帧，支持 A-B 点循环复播与 4K 无损快照导出。

2. **Three.js 3D 宏观能源结构交互数字沙盘**
   - **工作室级 PBR 渲染与物理材质**：具备环境光遮蔽、柔和阴影、定向光追踪与金属度反射。
   - **实时 VideoTexture 3D 巨幕**：将原视频动态投影到沙盘中央主讲银幕上，视频播放与 3D 场景完全同步。
   - **8 大电源立体矩阵与动态高度映射**：直观展示光伏、风电、煤炭、水电、核能等在不同情景年份的电源占比。
   - **风光储新能源设备与容量电价保底护盾**：3D 细节建模，支持视角预设切换与一键结构炸开（Exploded View）。

3. **四情景仿真推演与交互对比实验室**
   - 覆盖基准情景 (BAU)、政策强化情景、极端风险情景与技术突破情景。
   - 2025、2030、2045 关键节点定量数据对比，包括 `policy_adj` 因子、技术转型倍率、毛/净 CO2 排放与非化石能源占比。

4. **AI 学术图解生成与视频截帧重绘工坊**
   - 基于 Gemini AI 驱动，支持科研矢量图解生成（支持 SVG 矢量格式与高清位图）。
   - 答辩委员会尖锐问答模拟与学术理论深度阐释。

---

## 🛠️ 技术栈架构

- **前端框架**：React 19 + TypeScript + Vite 8
- **样式体系**：Tailwind CSS v4 + Lucide Icons + Motion
- **三维渲染**：Three.js (r186) + OrbitControls + RoomEnvironment
- **服务端**：Node.js Express + TSX
- **大模型引擎**：`@google/genai` (Gemini 3.8 Flash / Gemini 3.1 Flash Lite)

---

## 🚀 本地快速启动

### 1. 克隆代码仓库
```bash
git clone <your-repo-url>.git
cd <repo-folder>
```

### 2. 安装依赖项
```bash
npm install
```

### 3. 配置环境变量
复制环境配置模板：
```bash
cp .env.example .env
```
如需使用 AI 科研图解与专家答辩问答功能，请在 `.env` 中填入您的 Gemini API 密钥：
```env
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
```

### 4. 启动本地开发服务
```bash
npm run dev
```
打开浏览器访问 [http://localhost:3000](http://localhost:3000) 即可开始体验。

### 5. 生产环境构建
```bash
npm run build
npm start
```

---

## 📄 授权协议

Apache-2.0 License

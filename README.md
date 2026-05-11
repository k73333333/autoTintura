# autoTintura

一个智能图片背景色分析组件库，为图片自动生成协调的背景色，支持多边缘渐变模式和纯色模式。

## 特性

- 🎨 **多边缘背景模式**：基于图片四边颜色生成平滑渐变或提取边缘主色（支持纯色/渐变切换）
- 🎯 **纯色模式**：基于图片主色推荐协调的纯色背景
- 🌈 **色系偏好调整**：支持暖色、冷色、中性、鲜艳四种色系
- 🌙 **明暗偏好调整**：支持深色、浅色、自动三种模式
- 🔄 **浏览器兼容**：支持 Chrome、Firefox、Safari、Edge 等主流浏览器

## 安装

### NPM

```bash
npm install auto-tintura
# 或
yarn add auto-tintura
```

### 直接引入 (浏览器)

你可以直接下载 `dist/index.umd.js` 并在 HTML 中引入，或者通过 CDN 使用：

```html
<!-- 通过本地文件引入 -->
<script src="./dist/index.umd.js"></script>

<!-- 或者通过 CDN (假设已发布) -->
<!-- <script src="https://unpkg.com/auto-tintura/dist/index.umd.js"></script> -->

<script>
  // 引入后，AutoTintura 会挂载到全局 window 对象上
  async function init() {
    const { dominantColor, solidBackground, edgeBackground } = 
        await AutoTintura.getSmartBackground('path/to/image.jpg');
        
    console.log('主色:', dominantColor.hex);
    document.body.style.background = edgeBackground.cssValue;
  }
  init();
</script>
```

## 基本用法

### ⚡ 快捷使用 (推荐)

最简单的方式是直接使用 `AutoTintura.getSmartBackground` 静态方法，只需传入图片即可获取主色、推荐纯色背景及边缘背景（默认渐变）。

```typescript
import { AutoTintura } from 'auto-tintura';

// 仅需传入图片资源，无需实例化，无需配置
const { dominantColor, solidBackground, edgeBackground } = 
    await AutoTintura.getSmartBackground('path/to/image.jpg');

// 边缘背景 edgeBackground 默认是渐变模式
element.style.background = edgeBackground.cssValue;

// 如果需要边缘纯色模式
const result = await AutoTintura.getSmartBackground('img.jpg', { isGradient: false });
console.log('边缘提取的纯色:', result.edgeBackground.cssValue);
```

### 多边缘背景模式 (原多边缘渐变)

该模式专门分析图片四个边缘的颜色。

```typescript
import { AutoTintura, ImageColorExtractor } from 'auto-tintura';

const tintura = new AutoTintura();
const extractor = new ImageColorExtractor();

// 1. 提取图片四边缘颜色
const edgeColors = await extractor.extractEdgeColors('image.jpg');

// 2. 生成边缘背景（默认为渐变）
const gradient = tintura.generateMultiEdgeBackground(edgeColors);

// 3. 生成边缘背景（切换为纯色模式）
const solidEdge = tintura.generateMultiEdgeBackground(edgeColors, { isGradient: false });
```

### 纯色模式

```typescript
import { AutoTintura } from 'auto-tintura';

const tintura = new AutoTintura();

// 提取图片主色并生成背景
const solidBg = await tintura.generateSolidBackground('path/to/image.jpg');
// { type: 'solid', color: { r, g, b }, contrastWithImage: 4.5, cssValue: 'rgb(...)' }

// 应用到元素
element.style.background = solidBg.cssValue;
```

## API 文档

### AutoTintura 类

#### 构造函数

```typescript
const tintura = new AutoTintura(options?: TinturaOptions);
```

#### 方法

**getSmartBackground(imageSource, options?)**

一键分析并生成背景方案。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| imageSource | ImageSource | 是 | 图片源（URL, ImageElement, Canvas, ImageData） |
| options | SmartBackgroundOptions | 否 | 综合配置项（见下文） |

**generateMultiEdgeBackground(edgeColors, options?)**

基于边缘颜色的背景提取。支持返回渐变或单一纯色。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| edgeColors | EdgeColors | 是 | 四边缘颜色对象 |
| options | GenerateGradientOptions | 否 | 配置项（是否渐变、方向、偏好等） |

**generateGradient(edgeColors, direction, colorSystemPreference?)**

生成渐变背景配置。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| edgeColors | EdgeColors | 是 | 四边缘颜色对象，通过 `extractor.extractEdgeColors` 获取 |
| direction | GradientDirection | 是 | 渐变方向：'vertical', 'horizontal', 'corners' |
| colorSystemPreference | ColorSystemPreference | 否 | 色系偏好配置 |

**generateSolidBackground(dominantColor, options?)**

生成纯色背景配置。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| dominantColor | RGB | 是 | 图片主色，通过 `extractor.extractDominantColor` 获取 |
| options | GenerateSolidBackgroundOptions | 否 | 纯色生成配置项 |

---

### 配置项说明

#### SmartBackgroundOptions (继承自 GenerateSolidBackgroundOptions)

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| brightnessPreference | BrightnessPreference | 'auto' | 明暗偏好：'dark', 'light', 'auto' 或 [min, max] |
| colorSystemPreference | ColorSystemPreference | - | 色相与饱和度偏好 |
| harmonyType | HarmonyType | 'analogous' | 色彩和谐理论：'analogous', 'complementary', 'triadic' 等 |
| includeEdgeBackground | boolean | true | 是否同时计算边缘背景 |
| isGradient | boolean | true | 边缘背景是否采用渐变模式 |
| gradientDirection | GradientDirection | 'vertical' | 渐变背景的方向 |
| minContrast | number | 3 | 最小 WCAG 对比度要求 |
| maxProcessingSize | number | 1000 | 图片处理的最大尺寸（长边），超过将自动等比例缩放 |

#### ColorSystemPreference

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| temperature | ColorTemperature | - | 色温偏好：'warm', 'cool', 'neutral', 'vibrant' |
| preserveOriginal | boolean | false | 是否尽量保留原色的特征（不进行剧烈色相转换） |

#### BrightnessPreference

- **'dark'**: 相对偏暗处理
- **'light'**: 相对偏亮处理
- **'auto'**: 根据图片主色自动选择对比度最高的明暗方向。
- **[number, number]**: 自定义亮度区间。例如 `[10, 30]` 将确保背景亮度在 10% 到 30% 之间。

---

**extractDominantColor(imageSource)**

提取图片主色。

**static checkBrowserSupport()**

检查浏览器兼容性。

### ImageColorExtractor 类

#### 构造函数

```typescript
const extractor = new ImageColorExtractor(options?: ImageColorExtractorOptions);
```

#### 方法

**extractEdgeColors(imageSource)**

提取图片四边缘颜色。

**extractDominantColor(imageSource)**

提取图片主色。

## 偏好设置

### 色系偏好

```typescript
const options = {
  colorSystemPreference: {
    temperature: 'warm' | 'cool' | 'neutral' | 'vibrant',
    preserveOriginal: true // 是否保留原色特征
  }
};
```

### 明暗偏好

```typescript
const options = {
  // 支持预设字符串或数值范围 [min, max]
  brightnessPreference: 'dark' | 'light' | 'auto' | [number, number]
};

// 示例：限制背景亮度在 20% 到 40% 之间（深色区间）
const result = tintura.generateSolidBackground(color, {
  brightnessPreference: [20, 40]
});
```

## 输出格式

### GradientResult

```typescript
{
  type: 'gradient',
  direction: 'vertical' | 'horizontal' | 'corners',
  colors: [{ offset: 0, color: { r: 255, g: 200, b: 100 } }, ...],
  cssValue: 'linear-gradient(to bottom, rgb(255,200,100), rgb(100,150,255))'
}
```

### SolidColorResult

```typescript
{
  type: 'solid',
  color: { r: 200, g: 180, b: 160 },
  contrastWithImage: 4.5,
  harmonyType: 'analogous' | 'complementary' | 'triadic',
  cssValue: 'rgb(200, 180, 160)'
}
```

## 浏览器兼容性

| 浏览器 | 版本要求 |
|--------|----------|
| Chrome | ≥ 60 |
| Firefox | ≥ 55 |
| Safari | ≥ 12 |
| Edge | ≥ 79 |

## 注意事项

1. **跨域图片**：处理跨域图片时需要服务端支持 CORS，否则会导致 Canvas 污染

## 许可证

BSD 2-Clause License
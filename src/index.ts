/*
 * @Author: fukaidong fukaidong@aspirecn.com
 * @Date: 2026-05-08 12:30:25
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2026-05-09
 * @FilePath: \autoTintura\src\index.ts
 * @Description: -
 */
import type {
  RGB,
  HSL,
  BackgroundColorResult,
  TinturaOptions,
  AutoTinturaInstance,
  ImageSource,
  EdgeColors,
  ImageColorExtractorOptions,
  HarmonyType,
  SolidColorResult,
  GenerateSolidBackgroundOptions,
  GradientColorStop,
  GradientDirection,
  GradientResult,
  BrowserCompatibility,
  BrowserSupportResult,
  BrightnessPreference,
  ColorTemperature,
  ColorSystemPreference,
} from './types';

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function calculateWCAGContrast(color1: RGB, color2: RGB): number {
  const l1 = getLuminance(color1.r, color1.g, color1.b);
  const l2 = getLuminance(color2.r, color2.g, color2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function hslToRgb(h: number, s: number, l: number): RGB {
  h /= 360;
  s /= 100;
  l /= 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

function classifyColorTemperature(color: RGB): ColorTemperature {
  const hsl = rgbToHsl(color.r, color.g, color.b);
  const { h, s } = hsl;

  if (s > 70) {
    return 'vibrant';
  }

  if ((h >= 0 && h <= 60) || (h >= 300 && h <= 360)) {
    return 'warm';
  }

  if (h >= 180 && h <= 270) {
    return 'cool';
  }

  return 'neutral';
}

function adjustToColorSystem(color: RGB, preference: ColorSystemPreference): RGB {
  if (!preference.temperature) {
    return color;
  }

  const hsl = rgbToHsl(color.r, color.g, color.b);
  let { h, s, l } = hsl;

  // “适度偏移”，保留原色氛围
  switch (preference.temperature) {
    case 'warm':
      // 向暖色偏移 (红/黄/橙)
      if (h > 60 && h < 300) {
        h = h > 180 ? (h + 20) % 360 : (h - 20 + 360) % 360;
      }
      s = Math.min(100, s + 10);
      break;

    case 'cool':
      // 向冷色偏移 (蓝/青)
      if (h < 180 || h > 270) {
        h = (h + 180) % 360; // 粗略取补色方向
        h = h < 180 ? Math.max(180, h) : Math.min(270, h);
      }
      s = Math.min(100, s + 5);
      break;

    case 'neutral':
      // 降低饱和度，使色彩更温和
      s = Math.max(0, s - 30);
      break;

    case 'vibrant':
      // 提高饱和度，调整亮度到中等偏亮
      s = Math.min(100, s + 30);
      l = Math.max(40, Math.min(70, l));
      break;
  }

  // 确保亮度在合理范围内
  l = Math.max(15, Math.min(85, l));

  return hslToRgb(h, s, l);
}

/**
 * 根据偏好设置获取目标亮度值
 * @param preference 明暗偏好设置，可以是 'dark', 'light', 'auto' 或 [min, max] 范围
 * @param originalLightness 原始亮度值 (0-100)
 * @returns 目标亮度值 (0-100)
 */
function getTargetLightness(preference: BrightnessPreference, originalLightness?: number): number {
  // 如果是数值范围 [min, max]
  if (Array.isArray(preference)) {
    const [min, max] = preference;
    if (originalLightness !== undefined) {
      // 如果当前亮度已在范围内，则维持原样
      if (originalLightness >= min && originalLightness <= max) {
        return originalLightness;
      }
      // 否则取最接近的边界值
      return originalLightness < min ? min : max;
    }
    // 未提供原始亮度时，取范围中间值
    return (min + max) / 2;
  }

  // 处理预设字符串偏好
  switch (preference) {
    case 'dark':
      return 20; // 深色模式目标亮度
    case 'light':
      return 80; // 浅色模式目标亮度
    case 'auto':
      if (originalLightness !== undefined) {
        // 自动模式：根据原色明暗，推导出对比度更高的亮度目标
        return originalLightness < 50 ? 25 : 75;
      }
      return 50;
    default:
      return 50;
  }
}

function adjustBrightness(color: RGB, preference: BrightnessPreference): RGB {
  const hsl = rgbToHsl(color.r, color.g, color.b);
  const targetL = getTargetLightness(preference, hsl.l);
  const adjustment = targetL - hsl.l;
  const adjusted = adjustLightness(hsl, adjustment);
  return hslToRgb(adjusted.h, adjusted.s, adjusted.l);
}

/**
 * 计算两个颜色在 HSL 空间中的欧几里得距离
 * 用于评估背景色与原色的相似度
 * @param hsl1 第一个颜色的 HSL 值
 * @param hsl2 第二个颜色的 HSL 值
 * @returns 距离值
 */
function calculateHSLDistance(hsl1: HSL, hsl2: HSL): number {
  // 考虑到色相是环形的 (0-360)
  let dh = Math.abs(hsl1.h - hsl2.h);
  if (dh > 180) dh = 360 - dh;
  
  // 归一化处理，使各维度权重合理
  // 色相权重 1.0, 饱和度权重 0.5, 亮度权重 0.8 (通常亮度差异对视觉融合影响更大)
  return Math.sqrt(
    Math.pow(dh / 360, 2) * 1.0 +
    Math.pow((hsl1.s - hsl2.s) / 100, 2) * 0.5 +
    Math.pow((hsl1.l - hsl2.l) / 100, 2) * 0.8
  );
}

function getHarmonyColors(baseColor: RGB, harmonyType: HarmonyType): RGB[] {
  const hsl = rgbToHsl(baseColor.r, baseColor.g, baseColor.b);
  const colors: RGB[] = [];

  switch (harmonyType) {
    case 'original':
      colors.push(baseColor);
      break;
    case 'analogous':
      colors.push(
        hslToRgb((hsl.h - 30 + 360) % 360, hsl.s, hsl.l),
        baseColor,
        hslToRgb((hsl.h + 30) % 360, hsl.s, hsl.l)
      );
      break;
    case 'complementary':
      colors.push(
        baseColor,
        hslToRgb((hsl.h + 180) % 360, hsl.s, hsl.l)
      );
      break;
    case 'triadic':
      colors.push(
        baseColor,
        hslToRgb((hsl.h + 120) % 360, hsl.s, hsl.l),
        hslToRgb((hsl.h + 240) % 360, hsl.s, hsl.l)
      );
      break;
    case 'split-complementary':
      colors.push(
        baseColor,
        hslToRgb((hsl.h + 150) % 360, hsl.s, hsl.l),
        hslToRgb((hsl.h + 210) % 360, hsl.s, hsl.l)
      );
      break;
    case 'tetradic':
      colors.push(
        baseColor,
        hslToRgb((hsl.h + 90) % 360, hsl.s, hsl.l),
        hslToRgb((hsl.h + 180) % 360, hsl.s, hsl.l),
        hslToRgb((hsl.h + 270) % 360, hsl.s, hsl.l)
      );
      break;
  }

  return colors;
}

function adjustLightness(hsl: HSL, adjustment: number): HSL {
  return {
    h: hsl.h,
    s: hsl.s,
    l: Math.max(0, Math.min(100, hsl.l + adjustment)),
  };
}

class AutoTintura implements AutoTinturaInstance {
  private options: TinturaOptions;

  constructor(options: TinturaOptions = {}) {
    this.options = {
      sampleSize: options.sampleSize || 100,
      threshold: options.threshold || 10,
      colorFormat: options.colorFormat || 'hex',
    };
  }

  public async analyze(imageSource: ImageSource): Promise<BackgroundColorResult> {
    const rgb = await this.extractDominantColor(imageSource);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return {
      dominantColor: rgb,
      hsl,
      hex: rgbToHex(rgb.r, rgb.g, rgb.b),
      confidence: 0.85, // TODO 这里的 confidence 暂时硬编码，后续可根据聚类大小计算
    };
  }

  /**
   * 快捷分析图片并返回推荐的背景色
   * 补齐了之前缺失的核心方法
   */
  public async getSmartBackground(
    imageSource: ImageSource, 
    options: any = {} // 使用 any 简化，内部会解构
  ): Promise<any> {
    const {
      includeEdgeBackground = true,
      isGradient = true,
      gradientDirection = 'vertical',
      maxProcessingSize = this.options.maxProcessingSize,
      ...restOptions
    } = options;

    // 1. 提取全局主色（用于 dominantColor 字段）
    const dominantColorResult = await this.analyze(imageSource);
    
    // 2. 提取边缘加权主题色（用于生成更契合背景的纯色背景）
    // 使用较大的 edgeWidth 和 gaussian 权重函数，使边缘颜色影响更平滑地过渡到中心
    const extractorOptions: ImageColorExtractorOptions = {
      maxProcessingSize: this.options.maxProcessingSize,
      colorFormat: this.options.colorFormat === 'hex' ? 'rgb' : this.options.colorFormat as 'rgb' | 'hsl',
      edgeWidth: Math.max(50, Math.floor((this.options.maxProcessingSize || 1000) * 0.1)), // 图片尺寸的 10% 作为边缘宽度
      weightFunction: 'gaussian',
      gaussianSigma: 40 // 控制高斯衰减速度，值越大衰减越慢
    };
    const extractor = new ImageColorExtractor(extractorOptions);
    const weightedThemeColor = await extractor.extractDominantColor(imageSource);

    // 3. 基于加权主题色生成纯色背景
    // 默认使用 'seamless' 策略和 'original' 和谐类型，以确保背景与边缘无缝衔接
    const solidBackground = this.generateSolidBackground(
      weightedThemeColor,
      restOptions
    );

    const result: any = {
      dominantColor: dominantColorResult,
      solidBackground,
    };

    // 4. (可选) 提取边缘背景（渐变或边缘色）
    if (includeEdgeBackground) {
      const extractor = new ImageColorExtractor({
        maxProcessingSize,
        edgeWidth: 15,
      });
      const edgeColors = await extractor.extractEdgeColors(imageSource);

      if (isGradient) {
        result.edgeBackground = this.generateGradient(
          edgeColors,
          gradientDirection,
          restOptions.colorSystemPreference
        );
      } else {
        // 如果不是渐变，取四边主色的平均值或其中之一作为纯色背景
        const avgR = Math.round((edgeColors.top.r + edgeColors.bottom.r + edgeColors.left.r + edgeColors.right.r) / 4);
        const avgG = Math.round((edgeColors.top.g + edgeColors.bottom.g + edgeColors.left.g + edgeColors.right.g) / 4);
        const avgB = Math.round((edgeColors.top.b + edgeColors.bottom.b + edgeColors.left.b + edgeColors.right.b) / 4);
        
        result.edgeBackground = {
          type: 'solid',
          color: { r: avgR, g: avgG, b: avgB },
          cssValue: `rgb(${avgR}, ${avgG}, ${avgB})`,
        };
      }
    }

    return result;
  }

  public setOptions(options: TinturaOptions): void {
    this.options = { ...this.options, ...options };
  }

  public getOptions(): TinturaOptions {
    return { ...this.options };
  }

  public async extractDominantColor(imageSource: ImageSource): Promise<RGB> {
    // 显式提取属性以消除类型不匹配警告
    // 注意：如果以后 TinturaOptions 或 ImageColorExtractorOptions 增加了共有属性，一定要此处同步透传
    const extractorOptions: ImageColorExtractorOptions = {
      maxProcessingSize: this.options.maxProcessingSize,
      // 过滤掉不支持的 'hex' 格式，确保底层提取器只处理它能识别的 rgb/hsl
      colorFormat: this.options.colorFormat === 'hex' ? 'rgb' : this.options.colorFormat as 'rgb' | 'hsl'
    };

    const extractor = new ImageColorExtractor(extractorOptions);
    return extractor.extractDominantColor(imageSource);
  }

  public generateSolidBackground(
    dominantColor: RGB,
    options: GenerateSolidBackgroundOptions = {}
  ): SolidColorResult {
    const {
      harmonyType = 'original', // 默认改回 original，保持与边缘一致
      selectionStrategy = 'seamless', // 默认使用无缝模式，追求最接近原色
      minContrast = 3,
      maxContrast = 10,
      lightnessAdjustment = -15,
      brightnessPreference,
      colorSystemPreference,
    } = options;

    const dominantHsl = rgbToHsl(dominantColor.r, dominantColor.g, dominantColor.b);
    const harmonyColors = getHarmonyColors(dominantColor, harmonyType);

    let bestBackground: RGB = dominantColor;
    let bestContrast = 0;
    let minDistance = Infinity; // 用于 seamless 策略

    for (const hColor of harmonyColors) {
      const baseHsl = rgbToHsl(hColor.r, hColor.g, hColor.b);

      // 亮度搜索范围：在 lightnessAdjustment 范围内寻找
      for (let adjust = lightnessAdjustment; adjust <= -lightnessAdjustment; adjust += 5) {
        const adjustedHsl = adjustLightness(baseHsl, adjust);
        const bgColor = hslToRgb(adjustedHsl.h, adjustedHsl.s, adjustedHsl.l);
        const contrast = calculateWCAGContrast(dominantColor, bgColor);

        // 基础校验：必须满足对比度范围
        if (contrast >= minContrast && contrast <= maxContrast) {
          if (selectionStrategy === 'contrast') {
            // 策略 A: 追求最大对比度 (旧版默认)
            if (contrast > bestContrast) {
              bestContrast = contrast;
              bestBackground = bgColor;
            }
          } else {
            // 策略 B: 追求最接近原色 (新版默认)
            const distance = calculateHSLDistance(dominantHsl, adjustedHsl);
            if (distance < minDistance) {
              minDistance = distance;
              bestBackground = bgColor;
              bestContrast = contrast; // 记录对应的对比度
            }
          }
        }
      }
    }

    // 兜底逻辑：如果没有找到满足对比度的颜色
    if (bestContrast === 0 || (selectionStrategy === 'seamless' && minDistance === Infinity)) {
      // 对于低饱和度颜色（灰色系），需要特殊处理
      let fallbackL: number;
      let fallbackS: number = dominantHsl.s;
      
      if (dominantHsl.s < 20) {
        // 低饱和度颜色：根据原始亮度生成对比度合适的灰色
        if (dominantHsl.l < 30) {
          // 深色灰色/黑色 → 生成中灰色背景
          fallbackL = 50;
          fallbackS = 5; // 添加少量饱和度避免完全灰色
        } else if (dominantHsl.l > 70) {
          // 浅色灰色/白色 → 生成中灰色背景
          fallbackL = 40;
          fallbackS = 5;
        } else {
          // 中等灰色 → 根据方向生成对比色
          fallbackL = dominantHsl.l > 50 ? 20 : 80;
        }
      } else {
        // 正常颜色：根据原始亮度生成对比色
        fallbackL = dominantHsl.l > 50 ? 10 : 90;
      }
      
      bestBackground = hslToRgb(dominantHsl.h, fallbackS, fallbackL);
      bestContrast = calculateWCAGContrast(dominantColor, bestBackground);
    }

    // 应用偏好设置
    if (brightnessPreference) {
      bestBackground = adjustBrightness(bestBackground, brightnessPreference);
      // 重新计算对比度，因为亮度被强制修改了
      bestContrast = calculateWCAGContrast(dominantColor, bestBackground);
    }

    if (colorSystemPreference) {
      bestBackground = adjustToColorSystem(bestBackground, colorSystemPreference);
      bestContrast = calculateWCAGContrast(dominantColor, bestBackground);
    }

    return {
      type: 'solid',
      color: bestBackground,
      contrastWithImage: Math.round(bestContrast * 100) / 100,
      harmonyType,
      selectionStrategy,
      cssValue: `rgb(${bestBackground.r}, ${bestBackground.g}, ${bestBackground.b})`,
    };
  }

  public generateGradient(edgeColors: EdgeColors, direction: GradientDirection = 'vertical', colorSystemPreference?: ColorSystemPreference): GradientResult {
    let colors: GradientColorStop[] = [];

    let adjustedTop = edgeColors.top;
    let adjustedBottom = edgeColors.bottom;
    let adjustedLeft = edgeColors.left;
    let adjustedRight = edgeColors.right;

    if (colorSystemPreference) {
      if (!colorSystemPreference.preserveOriginal) {
        adjustedTop = adjustToColorSystem(edgeColors.top, colorSystemPreference);
        adjustedBottom = adjustToColorSystem(edgeColors.bottom, colorSystemPreference);
        adjustedLeft = adjustToColorSystem(edgeColors.left, colorSystemPreference);
        adjustedRight = adjustToColorSystem(edgeColors.right, colorSystemPreference);
      }
    }

    switch (direction) {
      case 'vertical':
        colors = [
          { offset: 0, color: adjustedTop },
          { offset: 1, color: adjustedBottom },
        ];
        break;

      case 'horizontal':
        colors = [
          { offset: 0, color: adjustedLeft },
          { offset: 1, color: adjustedRight },
        ];
        break;

      case 'corners':
        colors = [
          { offset: 0, color: adjustedTop },
          { offset: 0.33, color: adjustedRight },
          { offset: 0.66, color: adjustedBottom },
          { offset: 1, color: adjustedLeft },
        ];
        break;

      default:
        colors = [
          { offset: 0, color: adjustedTop },
          { offset: 1, color: adjustedBottom },
        ];
    }

    let cssDirection: string;
    let cssValue: string;

    switch (direction) {
      case 'vertical':
        cssDirection = 'to bottom';
        cssValue = `linear-gradient(${cssDirection}, rgb(${colors[0].color.r},${colors[0].color.g},${colors[0].color.b}), rgb(${colors[1].color.r},${colors[1].color.g},${colors[1].color.b}))`;
        break;
      case 'horizontal':
        cssDirection = 'to right';
        cssValue = `linear-gradient(${cssDirection}, rgb(${colors[0].color.r},${colors[0].color.g},${colors[0].color.b}), rgb(${colors[1].color.r},${colors[1].color.g},${colors[1].color.b}))`;
        break;
      case 'corners':
        cssDirection = 'to bottom right';
        cssValue = `linear-gradient(${cssDirection}, rgb(${colors[0].color.r},${colors[0].color.g},${colors[0].color.b}) 0%, rgb(${colors[1].color.r},${colors[1].color.g},${colors[1].color.b}) 33%, rgb(${colors[2].color.r},${colors[2].color.g},${colors[2].color.b}) 66%, rgb(${colors[3].color.r},${colors[3].color.g},${colors[3].color.b}) 100%)`;
        break;
      default:
        cssDirection = 'to bottom';
        cssValue = `linear-gradient(${cssDirection}, rgb(${colors[0].color.r},${colors[0].color.g},${colors[0].color.b}), rgb(${colors[1].color.r},${colors[1].color.g},${colors[1].color.b}))`;
    }

    return {
      type: 'gradient',
      direction,
      colors,
      cssValue,
    };
  }

  public static rgbToHex = rgbToHex;
  public static rgbToHsl = rgbToHsl;
  public static classifyColorTemperature = classifyColorTemperature;
  public static adjustToColorSystem = adjustToColorSystem;

  public static checkBrowserSupport(): BrowserSupportResult {
    const compatibility: BrowserCompatibility = {
      canvasSupported: false,
      canvas2DSupported: false,
      imageDataSupported: false,
      crossOriginSupported: false,
      webpSupported: null,
      taintedCanvasSupported: false,
      browserName: 'unknown',
      browserVersion: null,
      os: 'unknown',
      isMobile: false,
      issues: [],
    };

    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      errors.push('Browser environment not detected');
      return { supported: false, compatibility, errors, warnings };
    }

    const ua = navigator.userAgent;
    compatibility.isMobile = /mobile|android|iphone|ipad|tablet/i.test(ua);

    if (/edge/i.test(ua)) {
      compatibility.browserName = 'Edge';
      const match = ua.match(/edge\/(\d+)/i);
      compatibility.browserVersion = match ? match[1] : null;
    } else if (/chrome/i.test(ua)) {
      compatibility.browserName = 'Chrome';
      const match = ua.match(/chrome\/(\d+)/i);
      compatibility.browserVersion = match ? match[1] : null;
    } else if (/firefox/i.test(ua)) {
      compatibility.browserName = 'Firefox';
      const match = ua.match(/firefox\/(\d+)/i);
      compatibility.browserVersion = match ? match[1] : null;
    } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
      compatibility.browserName = 'Safari';
      const match = ua.match(/version\/(\d+)/i);
      compatibility.browserVersion = match ? match[1] : null;
    } else if (/msie|trident/i.test(ua)) {
      compatibility.browserName = 'IE';
      const match = ua.match(/(?:msie |rv:)(\d+)/i);
      compatibility.browserVersion = match ? match[1] : null;
    }

    if (/windows/i.test(ua)) {
      compatibility.os = 'Windows';
    } else if (/mac/i.test(ua)) {
      compatibility.os = 'macOS';
    } else if (/linux/i.test(ua)) {
      compatibility.os = 'Linux';
    } else if (/android/i.test(ua)) {
      compatibility.os = 'Android';
    } else if (/ios|iphone|ipad/i.test(ua)) {
      compatibility.os = 'iOS';
    }

    try {
      const testCanvas = document.createElement('canvas');
      compatibility.canvasSupported = !!testCanvas;
    } catch (e) {
      compatibility.issues.push('Canvas creation failed');
    }

    try {
      const testCanvas = document.createElement('canvas');
      const testCtx = testCanvas.getContext('2d');
      compatibility.canvas2DSupported = !!testCtx;

      if (testCtx) {
        const testImageData = testCtx.createImageData(1, 1);
        compatibility.imageDataSupported = !!testImageData;
      }
    } catch (e) {
      compatibility.issues.push('Canvas 2D context not available');
    }

    try {
      const img = new Image();
      compatibility.crossOriginSupported = img.crossOrigin !== undefined;
    } catch (e) {
      compatibility.issues.push('Cross-origin attribute not supported');
    }

    try {
      const testCanvas = document.createElement('canvas');
      testCanvas.width = 1;
      testCanvas.height = 1;
      const testCtx = testCanvas.getContext('2d');
      if (testCtx) {
        testCtx.fillStyle = 'red';
        testCtx.fillRect(0, 0, 1, 1);
        const dataUrl = testCanvas.toDataURL('image/webp');
        compatibility.webpSupported = dataUrl.startsWith('data:image/webp');
      }
    } catch (e) {
      compatibility.webpSupported = false;
    }

    try {
      const testCanvas = document.createElement('canvas');
      testCanvas.width = 1;
      testCanvas.height = 1;
      const testCtx = testCanvas.getContext('2d');
      if (testCtx) {
        testCtx.fillStyle = 'red';
        testCtx.fillRect(0, 0, 1, 1);
        const dataUrl = testCanvas.toDataURL();
        compatibility.taintedCanvasSupported = !dataUrl.includes('data:');
      }
    } catch (e) {
      compatibility.taintedCanvasSupported = false;
    }

    if (!compatibility.canvasSupported) {
      errors.push('Canvas API is not supported in this browser');
    }
    if (!compatibility.canvas2DSupported) {
      errors.push('Canvas 2D Context is not available');
    }
    if (!compatibility.imageDataSupported) {
      warnings.push('ImageData API may not be fully supported');
    }
    if (compatibility.webpSupported === false) {
      warnings.push('WebP format is not supported, using PNG/JPEG fallback');
    }

    const supported = compatibility.canvasSupported && compatibility.canvas2DSupported;

    return { supported, compatibility, errors, warnings };
  }
}

interface RGBPixel {
  r: number;
  g: number;
  b: number;
  weight?: number; // 增加权重属性，用于距离加权采样
}

interface Cluster {
  pixels: RGBPixel[];
  centroid: RGBPixel;
  size: number;
}

class ImageColorExtractor {
  private options: Required<ImageColorExtractorOptions> & { clearCanvasAfterUse: boolean };
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private imageWidth: number = 0;
  private imageHeight: number = 0;

  constructor(options: ImageColorExtractorOptions & { clearCanvasAfterUse?: boolean } = {}) {
    this.options = {
      edgeWidth: options.edgeWidth || 10,
      colorFormat: options.colorFormat || 'rgb',
      minClusterSize: options.minClusterSize || 5,
      kMeansIterations: options.kMeansIterations || 10,
      maxProcessingSize: options.maxProcessingSize || 1000,
      weightFunction: options.weightFunction || 'linear',
      gaussianSigma: options.gaussianSigma || 30,
      clearCanvasAfterUse: options.clearCanvasAfterUse !== false,
    };
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  private async loadImage(source: ImageSource): Promise<HTMLImageElement | ImageData> {
    if (source instanceof HTMLImageElement) {
      if (source.complete && source.naturalWidth > 0) {
        return source;
      }
      return this.loadImageFromURL(source.src);
    }

    if (source instanceof HTMLCanvasElement) {
      const ctx = source.getContext('2d');
      if (ctx) {
        return ctx.getImageData(0, 0, source.width, source.height);
      }
      throw new Error('Cannot get context from canvas');
    }

    if (source instanceof ImageData) {
      return source;
    }

    if (typeof source === 'string') {
      return this.loadImageFromURL(source);
    }

    throw new Error('Unsupported image source type');
  }

  private async loadImageFromURL(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      // 漏洞修复：添加 crossOrigin 处理，但注意这取决于服务端支持
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => {
        const isCrossOrigin = url.startsWith('http://') || url.startsWith('https://');
        if (isCrossOrigin) {
          const errorMsg = `Failed to load cross-origin image from URL: ${url}. ` +
            'Ensure the image server allows cross-origin requests (CORS).';
          reject(new Error(errorMsg));
        } else {
          reject(new Error(`Failed to load image from URL: ${url}`));
        }
      };
      img.src = url;
    });
  }

  private drawImageToCanvas(source: HTMLImageElement | ImageData): void {
    if (!this.ctx) {
      throw new Error('Canvas context not available');
    }

    if (source instanceof HTMLImageElement) {
      this.imageWidth = source.naturalWidth;
      this.imageHeight = source.naturalHeight;
      this.canvas.width = this.imageWidth;
      this.canvas.height = this.imageHeight;
      this.ctx.drawImage(source, 0, 0);
    } else {
      // 漏洞修复：直接处理 ImageData，避免 Base64 转换开销
      this.imageWidth = source.width;
      this.imageHeight = source.height;
      this.canvas.width = this.imageWidth;
      this.canvas.height = this.imageHeight;
      this.ctx.putImageData(source, 0, 0);
    }
  }

  private clearCanvas(): void {
    if (this.ctx && this.options.clearCanvasAfterUse) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.canvas.width = 0;
      this.canvas.height = 0;
    }
  }

  /**
   * 计算采样点权重
   * @param distance 距离边缘的距离
   * @returns 权重值 (0-1)
   */
  private calculateWeight(distance: number): number {
    const { weightFunction, edgeWidth, gaussianSigma } = this.options;
    
    if (weightFunction === 'gaussian') {
      // 高斯衰减: weight = exp(-d^2 / (2 * sigma^2))
      return Math.exp(-(distance * distance) / (2 * gaussianSigma * gaussianSigma));
    }
    
    // 默认线性衰减: weight = 1 - (d / edgeWidth)
    return Math.max(0, 1 - (distance / edgeWidth));
  }

  /**
   * 采样边缘像素，仅读取必要区域并应用加权采样
   * @param edge 边缘类型
   * @returns 加权后的像素列表
   */
  private sampleEdgePixels(edge: 'top' | 'bottom' | 'left' | 'right'): RGBPixel[] {
    if (!this.ctx) {
      throw new Error('Canvas context not available');
    }

    const { edgeWidth } = this.options;
    const pixels: RGBPixel[] = [];
    
    let sx = 0, sy = 0, sw = this.imageWidth, sh = this.imageHeight;
    
    // 优化：仅读取对应的边缘区域，减少 getImageData 的开销
    switch (edge) {
      case 'top':
        sh = Math.min(edgeWidth, this.imageHeight);
        break;
      case 'bottom':
        sy = Math.max(0, this.imageHeight - edgeWidth);
        sh = this.imageHeight - sy;
        break;
      case 'left':
        sw = Math.min(edgeWidth, this.imageWidth);
        break;
      case 'right':
        sx = Math.max(0, this.imageWidth - edgeWidth);
        sw = this.imageWidth - sx;
        break;
    }

    try {
      const imageData = this.ctx.getImageData(sx, sy, sw, sh);
      const data = imageData.data;

      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          const idx = (y * sw + x) * 4;
          const a = data[idx + 3];
          
          // 漏洞修复：过滤透明像素 (Alpha < 128)
          if (a < 128) continue;

          // 计算到最近边缘的距离
          let distance = 0;
          switch (edge) {
            case 'top': distance = y; break;
            case 'bottom': distance = sh - 1 - y; break;
            case 'left': distance = x; break;
            case 'right': distance = sw - 1 - x; break;
          }

          const weight = this.calculateWeight(distance);
          
          pixels.push({
            r: data[idx],
            g: data[idx + 1],
            b: data[idx + 2],
            weight: weight
          });
        }
      }
    } catch (e) {
      // 漏洞修复：处理 Tainted Canvas 报错
      console.warn('***sampleEdgePixels 获取像素数据失败，可能是跨域导致', e);
    }

    return pixels;
  }

  private kMeansClustering(pixels: RGBPixel[], k: number = 3): Cluster[] {
    if (pixels.length === 0) {
      return [];
    }

    const centroids: RGBPixel[] = this.initializeCentroids(pixels, k);
    let clusters: Cluster[] = [];

    for (let iteration = 0; iteration < this.options.kMeansIterations; iteration++) {
      clusters = centroids.map(c => ({ pixels: [], centroid: { ...c }, size: 0 }));

      for (const pixel of pixels) {
        let minDist = Infinity;
        let closestIdx = 0;

        for (let i = 0; i < centroids.length; i++) {
          const dist = this.colorDistance(pixel, centroids[i]);
          if (dist < minDist) {
            minDist = dist;
            closestIdx = i;
          }
        }

        clusters[closestIdx].pixels.push(pixel);
      }

      for (let i = 0; i < clusters.length; i++) {
        if (clusters[i].pixels.length > 0) {
          clusters[i].centroid = this.calculateCentroid(clusters[i].pixels);
          clusters[i].size = clusters[i].pixels.length;
        }
      }

      centroids.splice(0, centroids.length, ...clusters.map(c => c.centroid));
    }

    return clusters.filter((c: Cluster) => c.size >= this.options.minClusterSize)
      .sort((a: Cluster, b: Cluster) => b.size - a.size);
  }

  /**
   * 初始化聚类中心（使用 K-Means++ 思想）
   * @param pixels 像素列表
   * @param k 聚类数量
   * @returns 初始质心列表
   */
  private initializeCentroids(pixels: RGBPixel[], k: number): RGBPixel[] {
    if (pixels.length === 0) return [];
    
    // 第一个质心随机选择（或选择权重最大的）
    const centroids: RGBPixel[] = [ { ...pixels[Math.floor(Math.random() * pixels.length)] } ];

    for (let i = 1; i < k; i++) {
      let maxDist = -1;
      let nextCentroidIdx = 0;

      // 寻找距离当前所有质心最远的点作为下一个质心 (K-Means++ 简化版)
      // 在实际应用中，通常按距离平方的概率分布选择，这里为了性能做简化
      for (let j = 0; j < pixels.length; j += Math.max(1, Math.floor(pixels.length / 200))) {
        let minDistToAnyCentroid = Infinity;
        for (const c of centroids) {
          const dist = this.colorDistance(pixels[j], c);
          if (dist < minDistToAnyCentroid) {
            minDistToAnyCentroid = dist;
          }
        }

        if (minDistToAnyCentroid > maxDist) {
          maxDist = minDistToAnyCentroid;
          nextCentroidIdx = j;
        }
      }
      centroids.push({ ...pixels[nextCentroidIdx] });
    }

    return centroids;
  }

  private colorDistance(c1: RGBPixel, c2: RGBPixel): number {
    // 使用平方距离提高性能，比较大小时不需要开方
    return Math.pow(c1.r - c2.r, 2) +
           Math.pow(c1.g - c2.g, 2) +
           Math.pow(c1.b - c2.b, 2);
  }

  /**
   * 计算聚类质心，支持权重累加
   * @param pixels 属于该簇的像素列表
   * @returns 新的质心
   */
  private calculateCentroid(pixels: RGBPixel[]): RGBPixel {
    let sumR = 0, sumG = 0, sumB = 0, totalWeight = 0;

    for (const p of pixels) {
      const w = p.weight !== undefined ? p.weight : 1;
      sumR += p.r * w;
      sumG += p.g * w;
      sumB += p.b * w;
      totalWeight += w;
    }

    if (totalWeight === 0) return { r: 0, g: 0, b: 0 };

    return {
      r: Math.round(sumR / totalWeight),
      g: Math.round(sumG / totalWeight),
      b: Math.round(sumB / totalWeight),
    };
  }

  private getDominantColorFromClusters(clusters: Cluster[]): RGB {
    if (clusters.length === 0) {
      return { r: 0, g: 0, b: 0 };
    }

    const dominant = clusters[0];
    return dominant.centroid;
  }

  /**
   * 提取边缘加权后的主题色
   * 该颜色比全局主色更倾向于边缘，适合作为背景色的生成基准
   * @param imageSource 图片资源
   */
  public async extractThemeColorWithEdgeWeight(imageSource: ImageSource): Promise<RGB> {
    const img = await this.loadImage(imageSource);
    this.drawImageToCanvas(img);

    try {
      const pixels = this.sampleWeightedAllPixels();
      // 使用 5 个聚类中心提取加权主题色
      const clusters = this.kMeansClustering(pixels, 5);
      return this.getDominantColorFromClusters(clusters);
    } finally {
      this.clearCanvas();
    }
  }

  public async extractEdgeColors(imageSource: ImageSource): Promise<EdgeColors> {
    const img = await this.loadImage(imageSource);
    this.drawImageToCanvas(img);

    const edges: ('top' | 'bottom' | 'left' | 'right')[] = ['top', 'bottom', 'left', 'right'];
    const edgeColors: EdgeColors = {
      top: { r: 0, g: 0, b: 0 },
      bottom: { r: 0, g: 0, b: 0 },
      left: { r: 0, g: 0, b: 0 },
      right: { r: 0, g: 0, b: 0 },
    };

    try {
      for (const edge of edges) {
        const pixels = this.sampleEdgePixels(edge);
        const clusters = this.kMeansClustering(pixels, 3);
        edgeColors[edge] = this.getDominantColorFromClusters(clusters);
      }
    } finally {
      this.clearCanvas();
    }

    return edgeColors;
  }

  public async extractDominantColor(imageSource: ImageSource): Promise<RGB> {
    const img = await this.loadImage(imageSource);
    this.drawImageToCanvas(img);

    // 根据配置决定是否使用边缘加权采样
    const pixels = this.options.weightFunction ? this.sampleWeightedAllPixels() : this.sampleAllPixels();
    const clusters = this.kMeansClustering(pixels, 5);

    return this.getDominantColorFromClusters(clusters);
  }

  /**
   * 采样全图像素并应用边缘加权
   * @returns 加权后的全图像素列表
   */
  private sampleWeightedAllPixels(): RGBPixel[] {
    if (!this.ctx) {
      throw new Error('Canvas context not available');
    }

    const pixels: RGBPixel[] = [];

    try {
      const imageData = this.ctx.getImageData(0, 0, this.imageWidth, this.imageHeight);
      const data = imageData.data;

      // 动态计算采样步长，确保处理效率
      const step = Math.max(1, Math.floor((this.imageWidth * this.imageHeight) / 10000));

      for (let y = 0; y < this.imageHeight; y += step) {
        for (let x = 0; x < this.imageWidth; x += step) {
          const idx = (y * this.imageWidth + x) * 4;
          const a = data[idx + 3];

          // 过滤透明像素
          if (a < 128) continue;

          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // 过滤极端黑白色
          if (r < 10 && g < 10 && b < 10) continue;
          if (r > 245 && g > 245 && b > 245) continue;

          // 计算像素点到最近边缘的距离
          // distance = min(x, y, width - 1 - x, height - 1 - y)
          const distToEdge = Math.min(x, y, this.imageWidth - 1 - x, this.imageHeight - 1 - y);
          
          // 应用权重函数
          const weight = this.calculateWeight(distToEdge);

          pixels.push({ r, g, b, weight });
        }
      }
    } catch (e) {
      console.warn('***sampleWeightedAllPixels 获取像素数据失败', e);
    }

    return pixels;
  }

  private sampleAllPixels(): RGBPixel[] {
    if (!this.ctx) {
      throw new Error('Canvas context not available');
    }

    const pixels: RGBPixel[] = [];

    try {
      const imageData = this.ctx.getImageData(0, 0, this.imageWidth, this.imageHeight);
      const data = imageData.data;

      const step = Math.max(1, Math.floor((this.imageWidth * this.imageHeight) / 10000));

      for (let i = 0; i < data.length; i += 4 * step) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // 漏洞修复：过滤透明像素
        if (a < 128) continue;

        // 漏洞修复：过滤极端黑白色（背景干扰）
        if (r < 10 && g < 10 && b < 10) continue;
        if (r > 245 && g > 245 && b > 245) continue;

        pixels.push({ r, g, b });
      }
    } catch (e) {
      console.warn('***sampleAllPixels 获取像素数据失败', e);
    }

    return pixels;
  }

  public static rgbToHsl = rgbToHsl;
}

export { AutoTintura, ImageColorExtractor };
export * from './types';

/**
 * @example
 * // 渐变模式示例
 * import { AutoTintura, ImageColorExtractor, type GradientDirection } from 'autoTintura';
 *
 * async function generateGradientBackground() {
 *   const extractor = new ImageColorExtractor({ edgeWidth: 15 });
 *   const edgeColors = await extractor.extractEdgeColors('https://example.com/image.jpg');
 *
 *   const tintura = new AutoTintura({ colorFormat: 'hex' });
 *   const gradientResult = tintura.generateGradient(edgeColors, 'vertical');
 *
 *   console.log('CSS Gradient:', gradientResult.cssValue);
 *   // 输出: linear-gradient(to bottom, rgb(100,150,200), rgb(50,75,100))
 *
 *   document.body.style.background = gradientResult.cssValue;
 * }
 *
 * @example
 * // 纯色模式示例
 * import { AutoTintura, ImageColorExtractor, type BrightnessPreference, type ColorSystemPreference } from 'autoTintura';
 *
 * async function generateSolidBackground() {
 *   const extractor = new ImageColorExtractor();
 *   const dominantColor = await extractor.extractDominantColor('https://example.com/photo.jpg');
 *
 *   const tintura = new AutoTintura();
 *   const solidResult = tintura.generateSolidBackground(dominantColor, {
 *     harmonyType: 'complementary',
 *     minContrast: 4.5,
 *     maxContrast: 8,
 *     brightnessPreference: [20, 40], // 限制亮度在 20% - 40% 之间
 *     colorSystemPreference: {
 *       temperature: 'cool',
 *       preserveOriginal: false
 *     } as ColorSystemPreference
 *   });
 *
 *   console.log('Background Color:', solidResult.cssValue);
 *   console.log('Contrast Ratio:', solidResult.contrastWithImage);
 *   // 输出: Background Color: rgb(30, 60, 90)
 *   // 输出: Contrast Ratio: 5.2
 *
 *   document.body.style.background = solidResult.cssValue;
 * }
 *
 * @example
 * // 浏览器兼容性检查
 * import { AutoTintura } from 'autoTintura';
 *
 * function checkBrowserSupport() {
 *   const result = AutoTintura.checkBrowserSupport();
 *
 *   if (result.supported) {
 *     console.log('Browser fully supported!');
 *   } else {
 *     console.error('Errors:', result.errors);
 *   }
 *
 *   console.log('Browser:', result.compatibility.browserName);
 *   console.log('OS:', result.compatibility.os);
 *   console.log('Canvas Supported:', result.compatibility.canvasSupported);
 *   console.log('Warnings:', result.warnings);
 * }
 *
 * @example
 * // 工具函数使用
 * import { AutoTintura } from 'autoTintura';
 *
 * function useUtilityFunctions() {
 *   const hex = AutoTintura.rgbToHex(255, 128, 0);
 *   console.log('Hex:', hex); // 输出: #ff8000
 *
 *   const hsl = AutoTintura.rgbToHsl(255, 128, 0);
 *   console.log('HSL:', hsl); // 输出: { h: 30, s: 100, l: 50 }
 *
 *   const temperature = AutoTintura.classifyColorTemperature({ r: 255, g: 100, b: 50 });
 *   console.log('Temperature:', temperature); // 输出: warm
 *
 *   const adjusted = AutoTintura.adjustToColorSystem(
 *     { r: 100, g: 150, b: 200 },
 *     { temperature: 'warm', preserveOriginal: false }
 *   );
 *   console.log('Adjusted Color:', adjusted);
 * }
 */

export default AutoTintura;
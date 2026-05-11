(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.AutoTintura = {}));
})(this, function(exports2) {
  "use strict";var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
  }
  function rgbToHsl(r, g, b) {
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
      l: Math.round(l * 100)
    };
  }
  function getLuminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map((c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }
  function calculateWCAGContrast(color1, color2) {
    const l1 = getLuminance(color1.r, color1.g, color1.b);
    const l2 = getLuminance(color2.r, color2.g, color2.b);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }
  function hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p2, q2, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p2 + (q2 - p2) * 6 * t;
        if (t < 1 / 2) return q2;
        if (t < 2 / 3) return p2 + (q2 - p2) * (2 / 3 - t) * 6;
        return p2;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }
  function classifyColorTemperature(color) {
    const hsl = rgbToHsl(color.r, color.g, color.b);
    const { h, s } = hsl;
    if (s > 70) {
      return "vibrant";
    }
    if (h >= 0 && h <= 60 || h >= 300 && h <= 360) {
      return "warm";
    }
    if (h >= 180 && h <= 270) {
      return "cool";
    }
    return "neutral";
  }
  function adjustToColorSystem(color, preference) {
    if (!preference.temperature) {
      return color;
    }
    const hsl = rgbToHsl(color.r, color.g, color.b);
    let { h, s, l } = hsl;
    switch (preference.temperature) {
      case "warm":
        if (h > 60 && h < 300) {
          h = h > 180 ? (h + 20) % 360 : (h - 20 + 360) % 360;
        }
        s = Math.min(100, s + 10);
        break;
      case "cool":
        if (h < 180 || h > 270) {
          h = (h + 180) % 360;
          h = h < 180 ? Math.max(180, h) : Math.min(270, h);
        }
        s = Math.min(100, s + 5);
        break;
      case "neutral":
        s = Math.max(0, s - 30);
        break;
      case "vibrant":
        s = Math.min(100, s + 30);
        l = Math.max(40, Math.min(70, l));
        break;
    }
    l = Math.max(15, Math.min(85, l));
    return hslToRgb(h, s, l);
  }
  function getTargetLightness(preference, originalLightness) {
    if (Array.isArray(preference)) {
      const [min, max] = preference;
      if (originalLightness !== void 0) {
        if (originalLightness >= min && originalLightness <= max) {
          return originalLightness;
        }
        return originalLightness < min ? min : max;
      }
      return (min + max) / 2;
    }
    switch (preference) {
      case "dark":
        return 20;
      case "light":
        return 80;
      case "auto":
        if (originalLightness !== void 0) {
          return originalLightness < 50 ? 25 : 75;
        }
        return 50;
      default:
        return 50;
    }
  }
  function adjustBrightness(color, preference) {
    const hsl = rgbToHsl(color.r, color.g, color.b);
    const targetL = getTargetLightness(preference, hsl.l);
    const adjustment = targetL - hsl.l;
    const adjusted = adjustLightness(hsl, adjustment);
    return hslToRgb(adjusted.h, adjusted.s, adjusted.l);
  }
  function calculateHSLDistance(hsl1, hsl2) {
    let dh = Math.abs(hsl1.h - hsl2.h);
    if (dh > 180) dh = 360 - dh;
    return Math.sqrt(
      Math.pow(dh / 360, 2) * 1 + Math.pow((hsl1.s - hsl2.s) / 100, 2) * 0.5 + Math.pow((hsl1.l - hsl2.l) / 100, 2) * 0.8
    );
  }
  function getHarmonyColors(baseColor, harmonyType) {
    const hsl = rgbToHsl(baseColor.r, baseColor.g, baseColor.b);
    const colors = [];
    switch (harmonyType) {
      case "original":
        colors.push(baseColor);
        break;
      case "analogous":
        colors.push(
          hslToRgb((hsl.h - 30 + 360) % 360, hsl.s, hsl.l),
          baseColor,
          hslToRgb((hsl.h + 30) % 360, hsl.s, hsl.l)
        );
        break;
      case "complementary":
        colors.push(
          baseColor,
          hslToRgb((hsl.h + 180) % 360, hsl.s, hsl.l)
        );
        break;
      case "triadic":
        colors.push(
          baseColor,
          hslToRgb((hsl.h + 120) % 360, hsl.s, hsl.l),
          hslToRgb((hsl.h + 240) % 360, hsl.s, hsl.l)
        );
        break;
      case "split-complementary":
        colors.push(
          baseColor,
          hslToRgb((hsl.h + 150) % 360, hsl.s, hsl.l),
          hslToRgb((hsl.h + 210) % 360, hsl.s, hsl.l)
        );
        break;
      case "tetradic":
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
  function adjustLightness(hsl, adjustment) {
    return {
      h: hsl.h,
      s: hsl.s,
      l: Math.max(0, Math.min(100, hsl.l + adjustment))
    };
  }
  class AutoTintura {
    constructor(options = {}) {
      __publicField(this, "options");
      this.options = {
        sampleSize: options.sampleSize || 100,
        threshold: options.threshold || 10,
        colorFormat: options.colorFormat || "hex"
      };
    }
    async analyze(imageSource) {
      const rgb = await this.extractDominantColor(imageSource);
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      return {
        dominantColor: rgb,
        hsl,
        hex: rgbToHex(rgb.r, rgb.g, rgb.b),
        confidence: 0.85
        // TODO 这里的 confidence 暂时硬编码，后续可根据聚类大小计算
      };
    }
    /**
     * 快捷分析图片并返回推荐的背景色
     * 补齐了之前缺失的核心方法
     */
    async getSmartBackground(imageSource, options = {}) {
      const {
        includeEdgeBackground = true,
        isGradient = true,
        gradientDirection = "vertical",
        maxProcessingSize = this.options.maxProcessingSize,
        ...restOptions
      } = options;
      const dominantColorResult = await this.analyze(imageSource);
      const extractorOptions = {
        maxProcessingSize: this.options.maxProcessingSize,
        colorFormat: this.options.colorFormat === "hex" ? "rgb" : this.options.colorFormat,
        edgeWidth: Math.max(50, Math.floor((this.options.maxProcessingSize || 1e3) * 0.1)),
        // 图片尺寸的 10% 作为边缘宽度
        weightFunction: "gaussian",
        gaussianSigma: 40
        // 控制高斯衰减速度，值越大衰减越慢
      };
      const extractor = new ImageColorExtractor(extractorOptions);
      const weightedThemeColor = await extractor.extractDominantColor(imageSource);
      const solidBackground = this.generateSolidBackground(
        weightedThemeColor,
        restOptions
      );
      const result = {
        dominantColor: dominantColorResult,
        solidBackground
      };
      if (includeEdgeBackground) {
        const extractor2 = new ImageColorExtractor({
          maxProcessingSize,
          edgeWidth: 15
        });
        const edgeColors = await extractor2.extractEdgeColors(imageSource);
        if (isGradient) {
          result.edgeBackground = this.generateGradient(
            edgeColors,
            gradientDirection,
            restOptions.colorSystemPreference
          );
        } else {
          const avgR = Math.round((edgeColors.top.r + edgeColors.bottom.r + edgeColors.left.r + edgeColors.right.r) / 4);
          const avgG = Math.round((edgeColors.top.g + edgeColors.bottom.g + edgeColors.left.g + edgeColors.right.g) / 4);
          const avgB = Math.round((edgeColors.top.b + edgeColors.bottom.b + edgeColors.left.b + edgeColors.right.b) / 4);
          result.edgeBackground = {
            type: "solid",
            color: { r: avgR, g: avgG, b: avgB },
            cssValue: `rgb(${avgR}, ${avgG}, ${avgB})`
          };
        }
      }
      return result;
    }
    setOptions(options) {
      this.options = { ...this.options, ...options };
    }
    getOptions() {
      return { ...this.options };
    }
    async extractDominantColor(imageSource) {
      const extractorOptions = {
        maxProcessingSize: this.options.maxProcessingSize,
        // 过滤掉不支持的 'hex' 格式，确保底层提取器只处理它能识别的 rgb/hsl
        colorFormat: this.options.colorFormat === "hex" ? "rgb" : this.options.colorFormat
      };
      const extractor = new ImageColorExtractor(extractorOptions);
      return extractor.extractDominantColor(imageSource);
    }
    generateSolidBackground(dominantColor, options = {}) {
      const {
        harmonyType = "original",
        // 默认改回 original，保持与边缘一致
        selectionStrategy = "seamless",
        // 默认使用无缝模式，追求最接近原色
        minContrast = 3,
        maxContrast = 10,
        lightnessAdjustment = -15,
        brightnessPreference,
        colorSystemPreference
      } = options;
      const dominantHsl = rgbToHsl(dominantColor.r, dominantColor.g, dominantColor.b);
      const harmonyColors = getHarmonyColors(dominantColor, harmonyType);
      let bestBackground = dominantColor;
      let bestContrast = 0;
      let minDistance = Infinity;
      for (const hColor of harmonyColors) {
        const baseHsl = rgbToHsl(hColor.r, hColor.g, hColor.b);
        for (let adjust = lightnessAdjustment; adjust <= -lightnessAdjustment; adjust += 5) {
          const adjustedHsl = adjustLightness(baseHsl, adjust);
          const bgColor = hslToRgb(adjustedHsl.h, adjustedHsl.s, adjustedHsl.l);
          const contrast = calculateWCAGContrast(dominantColor, bgColor);
          if (contrast >= minContrast && contrast <= maxContrast) {
            if (selectionStrategy === "contrast") {
              if (contrast > bestContrast) {
                bestContrast = contrast;
                bestBackground = bgColor;
              }
            } else {
              const distance = calculateHSLDistance(dominantHsl, adjustedHsl);
              if (distance < minDistance) {
                minDistance = distance;
                bestBackground = bgColor;
                bestContrast = contrast;
              }
            }
          }
        }
      }
      if (bestContrast === 0 || selectionStrategy === "seamless" && minDistance === Infinity) {
        let fallbackL;
        let fallbackS = dominantHsl.s;
        if (dominantHsl.s < 20) {
          if (dominantHsl.l < 30) {
            fallbackL = 50;
            fallbackS = 5;
          } else if (dominantHsl.l > 70) {
            fallbackL = 40;
            fallbackS = 5;
          } else {
            fallbackL = dominantHsl.l > 50 ? 20 : 80;
          }
        } else {
          fallbackL = dominantHsl.l > 50 ? 10 : 90;
        }
        bestBackground = hslToRgb(dominantHsl.h, fallbackS, fallbackL);
        bestContrast = calculateWCAGContrast(dominantColor, bestBackground);
      }
      if (brightnessPreference) {
        bestBackground = adjustBrightness(bestBackground, brightnessPreference);
        bestContrast = calculateWCAGContrast(dominantColor, bestBackground);
      }
      if (colorSystemPreference) {
        bestBackground = adjustToColorSystem(bestBackground, colorSystemPreference);
        bestContrast = calculateWCAGContrast(dominantColor, bestBackground);
      }
      return {
        type: "solid",
        color: bestBackground,
        contrastWithImage: Math.round(bestContrast * 100) / 100,
        harmonyType,
        selectionStrategy,
        cssValue: `rgb(${bestBackground.r}, ${bestBackground.g}, ${bestBackground.b})`
      };
    }
    generateGradient(edgeColors, direction = "vertical", colorSystemPreference) {
      let colors = [];
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
        case "vertical":
          colors = [
            { offset: 0, color: adjustedTop },
            { offset: 1, color: adjustedBottom }
          ];
          break;
        case "horizontal":
          colors = [
            { offset: 0, color: adjustedLeft },
            { offset: 1, color: adjustedRight }
          ];
          break;
        case "corners":
          colors = [
            { offset: 0, color: adjustedTop },
            { offset: 0.33, color: adjustedRight },
            { offset: 0.66, color: adjustedBottom },
            { offset: 1, color: adjustedLeft }
          ];
          break;
        default:
          colors = [
            { offset: 0, color: adjustedTop },
            { offset: 1, color: adjustedBottom }
          ];
      }
      let cssDirection;
      let cssValue;
      switch (direction) {
        case "vertical":
          cssDirection = "to bottom";
          cssValue = `linear-gradient(${cssDirection}, rgb(${colors[0].color.r},${colors[0].color.g},${colors[0].color.b}), rgb(${colors[1].color.r},${colors[1].color.g},${colors[1].color.b}))`;
          break;
        case "horizontal":
          cssDirection = "to right";
          cssValue = `linear-gradient(${cssDirection}, rgb(${colors[0].color.r},${colors[0].color.g},${colors[0].color.b}), rgb(${colors[1].color.r},${colors[1].color.g},${colors[1].color.b}))`;
          break;
        case "corners":
          cssDirection = "to bottom right";
          cssValue = `linear-gradient(${cssDirection}, rgb(${colors[0].color.r},${colors[0].color.g},${colors[0].color.b}) 0%, rgb(${colors[1].color.r},${colors[1].color.g},${colors[1].color.b}) 33%, rgb(${colors[2].color.r},${colors[2].color.g},${colors[2].color.b}) 66%, rgb(${colors[3].color.r},${colors[3].color.g},${colors[3].color.b}) 100%)`;
          break;
        default:
          cssDirection = "to bottom";
          cssValue = `linear-gradient(${cssDirection}, rgb(${colors[0].color.r},${colors[0].color.g},${colors[0].color.b}), rgb(${colors[1].color.r},${colors[1].color.g},${colors[1].color.b}))`;
      }
      return {
        type: "gradient",
        direction,
        colors,
        cssValue
      };
    }
    static checkBrowserSupport() {
      const compatibility = {
        canvasSupported: false,
        canvas2DSupported: false,
        imageDataSupported: false,
        crossOriginSupported: false,
        webpSupported: null,
        taintedCanvasSupported: false,
        browserName: "unknown",
        browserVersion: null,
        os: "unknown",
        isMobile: false,
        issues: []
      };
      const errors = [];
      const warnings = [];
      if (typeof window === "undefined" || typeof document === "undefined") {
        errors.push("Browser environment not detected");
        return { supported: false, compatibility, errors, warnings };
      }
      const ua = navigator.userAgent;
      compatibility.isMobile = /mobile|android|iphone|ipad|tablet/i.test(ua);
      if (/edge/i.test(ua)) {
        compatibility.browserName = "Edge";
        const match = ua.match(/edge\/(\d+)/i);
        compatibility.browserVersion = match ? match[1] : null;
      } else if (/chrome/i.test(ua)) {
        compatibility.browserName = "Chrome";
        const match = ua.match(/chrome\/(\d+)/i);
        compatibility.browserVersion = match ? match[1] : null;
      } else if (/firefox/i.test(ua)) {
        compatibility.browserName = "Firefox";
        const match = ua.match(/firefox\/(\d+)/i);
        compatibility.browserVersion = match ? match[1] : null;
      } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
        compatibility.browserName = "Safari";
        const match = ua.match(/version\/(\d+)/i);
        compatibility.browserVersion = match ? match[1] : null;
      } else if (/msie|trident/i.test(ua)) {
        compatibility.browserName = "IE";
        const match = ua.match(/(?:msie |rv:)(\d+)/i);
        compatibility.browserVersion = match ? match[1] : null;
      }
      if (/windows/i.test(ua)) {
        compatibility.os = "Windows";
      } else if (/mac/i.test(ua)) {
        compatibility.os = "macOS";
      } else if (/linux/i.test(ua)) {
        compatibility.os = "Linux";
      } else if (/android/i.test(ua)) {
        compatibility.os = "Android";
      } else if (/ios|iphone|ipad/i.test(ua)) {
        compatibility.os = "iOS";
      }
      try {
        const testCanvas = document.createElement("canvas");
        compatibility.canvasSupported = !!testCanvas;
      } catch (e) {
        compatibility.issues.push("Canvas creation failed");
      }
      try {
        const testCanvas = document.createElement("canvas");
        const testCtx = testCanvas.getContext("2d");
        compatibility.canvas2DSupported = !!testCtx;
        if (testCtx) {
          const testImageData = testCtx.createImageData(1, 1);
          compatibility.imageDataSupported = !!testImageData;
        }
      } catch (e) {
        compatibility.issues.push("Canvas 2D context not available");
      }
      try {
        const img = new Image();
        compatibility.crossOriginSupported = img.crossOrigin !== void 0;
      } catch (e) {
        compatibility.issues.push("Cross-origin attribute not supported");
      }
      try {
        const testCanvas = document.createElement("canvas");
        testCanvas.width = 1;
        testCanvas.height = 1;
        const testCtx = testCanvas.getContext("2d");
        if (testCtx) {
          testCtx.fillStyle = "red";
          testCtx.fillRect(0, 0, 1, 1);
          const dataUrl = testCanvas.toDataURL("image/webp");
          compatibility.webpSupported = dataUrl.startsWith("data:image/webp");
        }
      } catch (e) {
        compatibility.webpSupported = false;
      }
      try {
        const testCanvas = document.createElement("canvas");
        testCanvas.width = 1;
        testCanvas.height = 1;
        const testCtx = testCanvas.getContext("2d");
        if (testCtx) {
          testCtx.fillStyle = "red";
          testCtx.fillRect(0, 0, 1, 1);
          const dataUrl = testCanvas.toDataURL();
          compatibility.taintedCanvasSupported = !dataUrl.includes("data:");
        }
      } catch (e) {
        compatibility.taintedCanvasSupported = false;
      }
      if (!compatibility.canvasSupported) {
        errors.push("Canvas API is not supported in this browser");
      }
      if (!compatibility.canvas2DSupported) {
        errors.push("Canvas 2D Context is not available");
      }
      if (!compatibility.imageDataSupported) {
        warnings.push("ImageData API may not be fully supported");
      }
      if (compatibility.webpSupported === false) {
        warnings.push("WebP format is not supported, using PNG/JPEG fallback");
      }
      const supported = compatibility.canvasSupported && compatibility.canvas2DSupported;
      return { supported, compatibility, errors, warnings };
    }
  }
  __publicField(AutoTintura, "rgbToHex", rgbToHex);
  __publicField(AutoTintura, "rgbToHsl", rgbToHsl);
  __publicField(AutoTintura, "classifyColorTemperature", classifyColorTemperature);
  __publicField(AutoTintura, "adjustToColorSystem", adjustToColorSystem);
  class ImageColorExtractor {
    constructor(options = {}) {
      __publicField(this, "options");
      __publicField(this, "canvas");
      __publicField(this, "ctx");
      __publicField(this, "imageWidth", 0);
      __publicField(this, "imageHeight", 0);
      this.options = {
        edgeWidth: options.edgeWidth || 10,
        colorFormat: options.colorFormat || "rgb",
        minClusterSize: options.minClusterSize || 5,
        kMeansIterations: options.kMeansIterations || 10,
        maxProcessingSize: options.maxProcessingSize || 1e3,
        weightFunction: options.weightFunction || "linear",
        gaussianSigma: options.gaussianSigma || 30,
        clearCanvasAfterUse: options.clearCanvasAfterUse !== false
      };
      this.canvas = document.createElement("canvas");
      this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    }
    async loadImage(source) {
      if (source instanceof HTMLImageElement) {
        if (source.complete && source.naturalWidth > 0) {
          return source;
        }
        return this.loadImageFromURL(source.src);
      }
      if (source instanceof HTMLCanvasElement) {
        const ctx = source.getContext("2d");
        if (ctx) {
          return ctx.getImageData(0, 0, source.width, source.height);
        }
        throw new Error("Cannot get context from canvas");
      }
      if (source instanceof ImageData) {
        return source;
      }
      if (typeof source === "string") {
        return this.loadImageFromURL(source);
      }
      throw new Error("Unsupported image source type");
    }
    async loadImageFromURL(url) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = (e) => {
          const isCrossOrigin = url.startsWith("http://") || url.startsWith("https://");
          if (isCrossOrigin) {
            const errorMsg = `Failed to load cross-origin image from URL: ${url}. Ensure the image server allows cross-origin requests (CORS).`;
            reject(new Error(errorMsg));
          } else {
            reject(new Error(`Failed to load image from URL: ${url}`));
          }
        };
        img.src = url;
      });
    }
    drawImageToCanvas(source) {
      if (!this.ctx) {
        throw new Error("Canvas context not available");
      }
      if (source instanceof HTMLImageElement) {
        this.imageWidth = source.naturalWidth;
        this.imageHeight = source.naturalHeight;
        this.canvas.width = this.imageWidth;
        this.canvas.height = this.imageHeight;
        this.ctx.drawImage(source, 0, 0);
      } else {
        this.imageWidth = source.width;
        this.imageHeight = source.height;
        this.canvas.width = this.imageWidth;
        this.canvas.height = this.imageHeight;
        this.ctx.putImageData(source, 0, 0);
      }
    }
    clearCanvas() {
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
    calculateWeight(distance) {
      const { weightFunction, edgeWidth, gaussianSigma } = this.options;
      if (weightFunction === "gaussian") {
        return Math.exp(-(distance * distance) / (2 * gaussianSigma * gaussianSigma));
      }
      return Math.max(0, 1 - distance / edgeWidth);
    }
    /**
     * 采样边缘像素，仅读取必要区域并应用加权采样
     * @param edge 边缘类型
     * @returns 加权后的像素列表
     */
    sampleEdgePixels(edge) {
      if (!this.ctx) {
        throw new Error("Canvas context not available");
      }
      const { edgeWidth } = this.options;
      const pixels = [];
      let sx = 0, sy = 0, sw = this.imageWidth, sh = this.imageHeight;
      switch (edge) {
        case "top":
          sh = Math.min(edgeWidth, this.imageHeight);
          break;
        case "bottom":
          sy = Math.max(0, this.imageHeight - edgeWidth);
          sh = this.imageHeight - sy;
          break;
        case "left":
          sw = Math.min(edgeWidth, this.imageWidth);
          break;
        case "right":
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
            if (a < 128) continue;
            let distance = 0;
            switch (edge) {
              case "top":
                distance = y;
                break;
              case "bottom":
                distance = sh - 1 - y;
                break;
              case "left":
                distance = x;
                break;
              case "right":
                distance = sw - 1 - x;
                break;
            }
            const weight = this.calculateWeight(distance);
            pixels.push({
              r: data[idx],
              g: data[idx + 1],
              b: data[idx + 2],
              weight
            });
          }
        }
      } catch (e) {
        console.warn("***sampleEdgePixels 获取像素数据失败，可能是跨域导致", e);
      }
      return pixels;
    }
    kMeansClustering(pixels, k = 3) {
      if (pixels.length === 0) {
        return [];
      }
      const centroids = this.initializeCentroids(pixels, k);
      let clusters = [];
      for (let iteration = 0; iteration < this.options.kMeansIterations; iteration++) {
        clusters = centroids.map((c) => ({ pixels: [], centroid: { ...c }, size: 0 }));
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
        centroids.splice(0, centroids.length, ...clusters.map((c) => c.centroid));
      }
      return clusters.filter((c) => c.size >= this.options.minClusterSize).sort((a, b) => b.size - a.size);
    }
    /**
     * 初始化聚类中心（使用 K-Means++ 思想）
     * @param pixels 像素列表
     * @param k 聚类数量
     * @returns 初始质心列表
     */
    initializeCentroids(pixels, k) {
      if (pixels.length === 0) return [];
      const centroids = [{ ...pixels[Math.floor(Math.random() * pixels.length)] }];
      for (let i = 1; i < k; i++) {
        let maxDist = -1;
        let nextCentroidIdx = 0;
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
    colorDistance(c1, c2) {
      return Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2);
    }
    /**
     * 计算聚类质心，支持权重累加
     * @param pixels 属于该簇的像素列表
     * @returns 新的质心
     */
    calculateCentroid(pixels) {
      let sumR = 0, sumG = 0, sumB = 0, totalWeight = 0;
      for (const p of pixels) {
        const w = p.weight !== void 0 ? p.weight : 1;
        sumR += p.r * w;
        sumG += p.g * w;
        sumB += p.b * w;
        totalWeight += w;
      }
      if (totalWeight === 0) return { r: 0, g: 0, b: 0 };
      return {
        r: Math.round(sumR / totalWeight),
        g: Math.round(sumG / totalWeight),
        b: Math.round(sumB / totalWeight)
      };
    }
    getDominantColorFromClusters(clusters) {
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
    async extractThemeColorWithEdgeWeight(imageSource) {
      const img = await this.loadImage(imageSource);
      this.drawImageToCanvas(img);
      try {
        const pixels = this.sampleWeightedAllPixels();
        const clusters = this.kMeansClustering(pixels, 5);
        return this.getDominantColorFromClusters(clusters);
      } finally {
        this.clearCanvas();
      }
    }
    async extractEdgeColors(imageSource) {
      const img = await this.loadImage(imageSource);
      this.drawImageToCanvas(img);
      const edges = ["top", "bottom", "left", "right"];
      const edgeColors = {
        top: { r: 0, g: 0, b: 0 },
        bottom: { r: 0, g: 0, b: 0 },
        left: { r: 0, g: 0, b: 0 },
        right: { r: 0, g: 0, b: 0 }
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
    async extractDominantColor(imageSource) {
      const img = await this.loadImage(imageSource);
      this.drawImageToCanvas(img);
      const pixels = this.options.weightFunction ? this.sampleWeightedAllPixels() : this.sampleAllPixels();
      const clusters = this.kMeansClustering(pixels, 5);
      return this.getDominantColorFromClusters(clusters);
    }
    /**
     * 采样全图像素并应用边缘加权
     * @returns 加权后的全图像素列表
     */
    sampleWeightedAllPixels() {
      if (!this.ctx) {
        throw new Error("Canvas context not available");
      }
      const pixels = [];
      try {
        const imageData = this.ctx.getImageData(0, 0, this.imageWidth, this.imageHeight);
        const data = imageData.data;
        const step = Math.max(1, Math.floor(this.imageWidth * this.imageHeight / 1e4));
        for (let y = 0; y < this.imageHeight; y += step) {
          for (let x = 0; x < this.imageWidth; x += step) {
            const idx = (y * this.imageWidth + x) * 4;
            const a = data[idx + 3];
            if (a < 128) continue;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            if (r < 10 && g < 10 && b < 10) continue;
            if (r > 245 && g > 245 && b > 245) continue;
            const distToEdge = Math.min(x, y, this.imageWidth - 1 - x, this.imageHeight - 1 - y);
            const weight = this.calculateWeight(distToEdge);
            pixels.push({ r, g, b, weight });
          }
        }
      } catch (e) {
        console.warn("***sampleWeightedAllPixels 获取像素数据失败", e);
      }
      return pixels;
    }
    sampleAllPixels() {
      if (!this.ctx) {
        throw new Error("Canvas context not available");
      }
      const pixels = [];
      try {
        const imageData = this.ctx.getImageData(0, 0, this.imageWidth, this.imageHeight);
        const data = imageData.data;
        const step = Math.max(1, Math.floor(this.imageWidth * this.imageHeight / 1e4));
        for (let i = 0; i < data.length; i += 4 * step) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 128) continue;
          if (r < 10 && g < 10 && b < 10) continue;
          if (r > 245 && g > 245 && b > 245) continue;
          pixels.push({ r, g, b });
        }
      } catch (e) {
        console.warn("***sampleAllPixels 获取像素数据失败", e);
      }
      return pixels;
    }
  }
  __publicField(ImageColorExtractor, "rgbToHsl", rgbToHsl);
  exports2.AutoTintura = AutoTintura;
  exports2.ImageColorExtractor = ImageColorExtractor;
  exports2.default = AutoTintura;
  Object.defineProperties(exports2, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
});
//# sourceMappingURL=index.umd.js.map

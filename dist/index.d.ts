import { RGB, HSL, BackgroundColorResult, TinturaOptions, AutoTinturaInstance, ImageSource, EdgeColors, ImageColorExtractorOptions, SolidColorResult, GenerateSolidBackgroundOptions, GradientDirection, GradientResult, BrowserSupportResult, ColorTemperature, ColorSystemPreference } from './types';

declare function rgbToHex(r: number, g: number, b: number): string;
declare function rgbToHsl(r: number, g: number, b: number): HSL;
declare function classifyColorTemperature(color: RGB): ColorTemperature;
declare function adjustToColorSystem(color: RGB, preference: ColorSystemPreference): RGB;
declare class AutoTintura implements AutoTinturaInstance {
    private options;
    constructor(options?: TinturaOptions);
    analyze(imageSource: ImageSource): Promise<BackgroundColorResult>;
    /**
     * 快捷分析图片并返回推荐的背景色
     * 补齐了之前缺失的核心方法
     */
    getSmartBackground(imageSource: ImageSource, options?: any): Promise<any>;
    setOptions(options: TinturaOptions): void;
    getOptions(): TinturaOptions;
    extractDominantColor(imageSource: ImageSource): Promise<RGB>;
    generateSolidBackground(dominantColor: RGB, options?: GenerateSolidBackgroundOptions): SolidColorResult;
    generateGradient(edgeColors: EdgeColors, direction?: GradientDirection, colorSystemPreference?: ColorSystemPreference): GradientResult;
    static rgbToHex: typeof rgbToHex;
    static rgbToHsl: typeof rgbToHsl;
    static classifyColorTemperature: typeof classifyColorTemperature;
    static adjustToColorSystem: typeof adjustToColorSystem;
    static checkBrowserSupport(): BrowserSupportResult;
}
declare class ImageColorExtractor {
    private options;
    private canvas;
    private ctx;
    private imageWidth;
    private imageHeight;
    constructor(options?: ImageColorExtractorOptions & {
        clearCanvasAfterUse?: boolean;
    });
    private loadImage;
    private loadImageFromURL;
    private drawImageToCanvas;
    private clearCanvas;
    /**
     * 计算采样点权重
     * @param distance 距离边缘的距离
     * @returns 权重值 (0-1)
     */
    private calculateWeight;
    /**
     * 采样边缘像素，仅读取必要区域并应用加权采样
     * @param edge 边缘类型
     * @returns 加权后的像素列表
     */
    private sampleEdgePixels;
    private kMeansClustering;
    /**
     * 初始化聚类中心（使用 K-Means++ 思想）
     * @param pixels 像素列表
     * @param k 聚类数量
     * @returns 初始质心列表
     */
    private initializeCentroids;
    private colorDistance;
    /**
     * 计算聚类质心，支持权重累加
     * @param pixels 属于该簇的像素列表
     * @returns 新的质心
     */
    private calculateCentroid;
    private getDominantColorFromClusters;
    /**
     * 提取边缘加权后的主题色
     * 该颜色比全局主色更倾向于边缘，适合作为背景色的生成基准
     * @param imageSource 图片资源
     */
    extractThemeColorWithEdgeWeight(imageSource: ImageSource): Promise<RGB>;
    extractEdgeColors(imageSource: ImageSource): Promise<EdgeColors>;
    extractDominantColor(imageSource: ImageSource): Promise<RGB>;
    /**
     * 采样全图像素并应用边缘加权
     * @returns 加权后的全图像素列表
     */
    private sampleWeightedAllPixels;
    private sampleAllPixels;
    static rgbToHsl: typeof rgbToHsl;
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
//# sourceMappingURL=index.d.ts.map
export interface RGB {
    r: number;
    g: number;
    b: number;
}
export interface HSL {
    h: number;
    s: number;
    l: number;
}
export interface BackgroundColorResult {
    dominantColor: RGB;
    hsl: HSL;
    hex: string;
    confidence: number;
}
export interface TinturaOptions {
    /** 采样点数量，默认为 100 */
    sampleSize?: number;
    /** 颜色差异阈值，默认为 10 */
    threshold?: number;
    /** 输出颜色格式，默认为 'hex' */
    colorFormat?: 'rgb' | 'hsl' | 'hex';
    /** 图片处理的最大尺寸（长边），超过此尺寸将自动缩放，默认为 1000 */
    maxProcessingSize?: number;
}
export interface AutoTinturaInstance {
    /**
     * 快捷分析图片并返回推荐的背景色（包括主色、纯色背景和渐变背景）
     * @param imageSource 图片资源
     * @param options 分析与生成选项
     */
    getSmartBackground(imageSource: ImageSource, options?: SmartBackgroundOptions): Promise<SmartBackgroundResult>;
    /**
     * 基础分析方法（保留兼容性）
     */
    analyze(imageSource: ImageSource): Promise<BackgroundColorResult>;
    setOptions(options: TinturaOptions): void;
    getOptions(): TinturaOptions;
}
export interface SmartBackgroundOptions extends GenerateSolidBackgroundOptions {
    /** 渐变方向，默认为 'vertical' */
    gradientDirection?: GradientDirection;
    /** 是否包含边缘背景分析，默认为 true */
    includeEdgeBackground?: boolean;
    /** 边缘背景是否采用渐变模式，默认为 true。若为 false 则提取边缘主色作为纯色背景 */
    isGradient?: boolean;
    /** 图片处理的最大尺寸（长边），超过此尺寸将自动缩放，默认为 1000 */
    maxProcessingSize?: number;
}
export interface SmartBackgroundResult {
    /** 提取到的图片全局主色信息 */
    dominantColor: BackgroundColorResult;
    /** 基于全局主色的推荐纯色背景 */
    solidBackground: SolidColorResult;
    /** 推荐的边缘背景（根据 options.isGradient 返回渐变或边缘纯色） */
    edgeBackground?: GradientResult | SolidColorResult;
}
export type ImageSource = HTMLImageElement | string | HTMLCanvasElement | ImageData;
export interface AnalysisResult {
    colors: BackgroundColorResult[];
    primaryColor: BackgroundColorResult;
    timestamp: number;
}
export interface EdgeColors {
    top: RGB;
    bottom: RGB;
    left: RGB;
    right: RGB;
}
/**
 * 权重函数类型
 * - 'linear': 线性衰减，权重与距离成线性反比
 * - 'gaussian': 高斯衰减，权重按高斯曲线快速衰减
 */
export type WeightFunctionType = 'linear' | 'gaussian';
export interface ImageColorExtractorOptions {
    /** 边缘采样宽度（像素），默认为 10 */
    edgeWidth?: number;
    /** 内部处理颜色格式，默认为 'rgb' */
    colorFormat?: 'rgb' | 'hsl';
    /** 聚类最小点数，默认为 5 */
    minClusterSize?: number;
    /** K-Means 迭代次数，默认为 10 */
    kMeansIterations?: number;
    /** 图片处理的最大尺寸（长边），超过此尺寸将自动缩放，默认为 1000 */
    maxProcessingSize?: number;
    /** 权重函数类型，用于边缘颜色提取时的距离加权采样 */
    weightFunction?: WeightFunctionType;
    /** 高斯衰减的 sigma 参数，控制衰减速度，默认为 30 */
    gaussianSigma?: number;
}
export type HarmonyType = 'original' | 'analogous' | 'complementary' | 'triadic' | 'split-complementary' | 'tetradic';
export interface SolidColorResult {
    type: 'solid';
    color: RGB;
    contrastWithImage: number;
    harmonyType: HarmonyType;
    selectionStrategy?: 'contrast' | 'seamless';
    cssValue: string;
}
export interface GenerateSolidBackgroundOptions {
    harmonyType?: HarmonyType;
    selectionStrategy?: 'contrast' | 'seamless';
    minContrast?: number;
    maxContrast?: number;
    lightnessAdjustment?: number;
    brightnessPreference?: BrightnessPreference;
    colorSystemPreference?: ColorSystemPreference;
}
export interface GenerateGradientOptions {
    /** 渐变方向，默认为 'vertical' */
    direction?: GradientDirection;
    /** 是否使用渐变模式，默认为 true。若为 false 则根据边缘颜色提取单一纯色 */
    isGradient?: boolean;
    /** 明暗偏好 */
    brightnessPreference?: BrightnessPreference;
    /** 色系偏好 */
    colorSystemPreference?: ColorSystemPreference;
}
export interface BrowserCompatibility {
    canvasSupported: boolean;
    canvas2DSupported: boolean;
    imageDataSupported: boolean;
    crossOriginSupported: boolean;
    webpSupported: boolean | null;
    taintedCanvasSupported: boolean;
    browserName: string;
    browserVersion: string | null;
    os: string;
    isMobile: boolean;
    issues: string[];
}
export interface CrossOriginSettings {
    allowCrossOrigin: boolean;
    credentialsMode: 'omit' | 'same-origin' | 'include';
    clearCanvasAfterUse: boolean;
}
export interface BrowserSupportResult {
    supported: boolean;
    compatibility: BrowserCompatibility;
    errors: string[];
    warnings: string[];
}
export interface GradientColorStop {
    offset: number;
    color: RGB;
}
export type GradientDirection = 'vertical' | 'horizontal' | 'corners';
/**
 * 明暗偏好设置
 * 'dark': 偏向深色背景 (亮度约 20%)
 * 'light': 偏向浅色背景 (亮度约 80%)
 * 'auto': 根据图片主色自动选择对比度高的明暗度
 * [number, number]: 自定义亮度范围，例如 [20, 40] 表示亮度保持在 20% 到 40% 之间
 */
export type BrightnessPreference = 'dark' | 'light' | 'auto' | [number, number];
export interface GradientResult {
    type: 'gradient';
    direction: GradientDirection;
    colors: GradientColorStop[];
    cssValue: string;
}
export type ColorTemperature = 'warm' | 'cool' | 'neutral' | 'vibrant';
export interface ColorSystemPreference {
    temperature?: ColorTemperature;
    preserveOriginal?: boolean;
}
//# sourceMappingURL=types.d.ts.map
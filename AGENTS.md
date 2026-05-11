# AutoTintura Agents Documentation

## Overview

AutoTintura is an intelligent image background color analysis library that automatically generates harmonious background colors for images. It supports multi-edge mode and solid color mode, providing developers with flexible color extraction capabilities.

## Core Components

### 1. AutoTintura Agent

**Purpose**: Main entry point for color analysis and background generation

**Key Capabilities**:
- Image color analysis
- Dominant color extraction
- Solid background generation
- Gradient background generation
- Color harmony calculations
- Browser compatibility checking

**Usage**:
```typescript
import { AutoTintura } from 'auto-tintura';

// Quick analysis
const result = await AutoTintura.getSmartBackground('image.jpg', {
  brightnessPreference: 'auto',
  gradientDirection: 'vertical'
});
```

### 2. ImageColorExtractor Agent

**Purpose**: Core image color extraction engine with distance-weighted sampling

**Key Capabilities**:
- Edge color extraction (top, bottom, left, right)
- Dominant color extraction using K-Means clustering
- Distance-weighted pixel sampling
- Two weighting functions: linear and gaussian decay

**Configuration Options**:
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| edgeWidth | number | 10 | Edge sampling width in pixels |
| weightFunction | 'linear' \| 'gaussian' | 'linear' | Weight decay function type |
| gaussianSigma | number | 30 | Controls Gaussian decay speed |
| maxProcessingSize | number | 1000 | Maximum image dimension for processing |

**Distance-Weighted Sampling Algorithm**:

The agent implements a sophisticated distance-weighted sampling strategy for edge color extraction:

```
┌─────────────────────────────────┐
│         Image Area              │
│  ┌─────────────────────────┐    │
│  │  High Weight            │    │
│  │  (Edge Pixels)          │    │
│  ├─────────────────────────┤    │
│  │  ↓ Weight Decreases     │    │
│  │  as Distance Increases  │    │
│  ├─────────────────────────┤    │
│  │  Low Weight             │    │
│  │  (Center Pixels)        │    │
│  └─────────────────────────┘    │
└─────────────────────────────────┘
```

**Weight Calculation**:
- **Linear Decay**: `weight = 1 - (distance / edgeWidth)`
- **Gaussian Decay**: `weight = exp(-distance² / (2 × sigma²))`

## Workflow

### Smart Background Generation Workflow

```
┌─────────────────┐     ┌───────────────────┐     ┌─────────────────┐
│  Load Image     │ ──→ │  Extract Dominant │ ──→ │  Generate Solid │
│  Source         │     │  Color (K-Means)  │     │  Background     │
└─────────────────┘     └───────────────────┘     └────────┬────────┘
                                                           │
                                                           ↓
┌─────────────────┐     ┌───────────────────┐     ┌─────────────────┐
│  Browser        │     │  Extract Edge     │     │  Generate       │
│  Compatibility  │     │  Colors (Weighted │     │  Gradient       │
│  Check          │     │  Sampling)        │     │  Background     │
└─────────────────┘     └───────────────────┘     └─────────────────┘
```

### Edge Color Extraction Process

1. **Image Loading**: Load and resize image to maxProcessingSize
2. **Canvas Drawing**: Draw image onto hidden canvas
3. **Region Selection**: Define sampling region based on edge type
4. **Pixel Iteration**: Traverse all pixels in the sampling region
5. **Alpha Filtering**: Skip pixels with alpha < 128
6. **Distance Calculation**: Compute distance to nearest edge
7. **Weight Calculation**: Apply selected weight function
8. **Color Accumulation**: Accumulate weighted RGB values
9. **Normalization**: Compute weighted average and return color

## Usage Examples

### Example 1: Basic Edge Color Extraction

```typescript
import { ImageColorExtractor } from 'auto-tintura';

const extractor = new ImageColorExtractor({
  edgeWidth: 15,
  weightFunction: 'gaussian',
  gaussianSigma: 25
});

const edgeColors = await extractor.extractEdgeColors('https://example.com/image.jpg');
// { top: { r, g, b }, bottom: { r, g, b }, left: { r, g, b }, right: { r, g, b } }
```

### Example 2: Smart Background with Custom Preferences

```typescript
import { AutoTintura } from 'auto-tintura';

const result = await AutoTintura.getSmartBackground('photo.jpg', {
  brightnessPreference: [20, 50],  // Dark theme range
  colorSystemPreference: {
    temperature: 'cool',
    preserveOriginal: false
  },
  harmonyType: 'complementary',
  minContrast: 4.5,
  includeEdgeBackground: true,
  isGradient: true,
  gradientDirection: 'vertical'
});

// Apply to DOM
document.body.style.background = result.edgeBackground?.cssValue;
```

### Example 3: Solid Background Generation

```typescript
import { AutoTintura, ImageColorExtractor } from 'auto-tintura';

const extractor = new ImageColorExtractor();
const dominantColor = await extractor.extractDominantColor('image.jpg');

const tintura = new AutoTintura();
const solidResult = tintura.generateSolidBackground(dominantColor, {
  harmonyType: 'analogous',
  minContrast: 3,
  brightnessPreference: 'dark'
});

console.log('CSS:', solidResult.cssValue);
// rgb(30, 60, 90)
```

## Color Harmony Types

The agent supports multiple color harmony algorithms:

| Harmony Type | Description | Number of Colors |
|--------------|-------------|------------------|
| analogous | Colors adjacent on color wheel | 3 |
| complementary | Direct opposite colors | 2 |
| triadic | Three equidistant colors | 3 |
| split-complementary | Base + two adjacent to complement | 3 |
| tetradic | Two complementary color pairs | 4 |

## Browser Support Agent

**Purpose**: Detect browser capabilities and provide compatibility information

**Checked Features**:
- Canvas API support
- Canvas 2D context availability
- ImageData API support
- Cross-origin resource handling
- WebP format support
- Tainted canvas detection

**Usage**:
```typescript
const support = AutoTintura.checkBrowserSupport();

if (support.supported) {
  console.log('All features supported');
} else {
  console.error('Issues:', support.errors);
}
```

## Technical Stack

- **Language**: TypeScript
- **Runtime**: Browser (Canvas API)
- **Build Tool**: Vite
- **Algorithm**: K-Means Clustering, Distance-Weighted Sampling
- **Color Spaces**: RGB, HSL, WCAG Contrast Ratio

## Performance Considerations

1. **Image Resizing**: Images are automatically resized to maxProcessingSize to optimize performance
2. **Sampling Step**: Pixel sampling uses a step size to avoid processing every pixel
3. **Memory Management**: Canvas is cleared after use to free memory
4. **Alpha Filtering**: Transparent pixels are skipped to reduce computation

## Error Handling

The agents implement robust error handling for:
- Unsupported image sources
- Cross-origin restrictions
- Canvas context unavailability
- Empty or invalid image data
- Network errors during image loading

## License

AutoTintura is licensed under the **BSD 2-Clause License**.

---

*AutoTintura - Intelligent Image Background Color Analysis*

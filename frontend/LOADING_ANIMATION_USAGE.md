# Loading Animation Usage

The `LoadingAnimation` component displays a beautiful Lottie animation with fade-in and fade-out effects. It's optimized and served blazing fast from Cloudflare Pages CDN.

## Basic Usage

```tsx
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { useState, useEffect } from 'react';

export default function MyPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    // Fetch your data
    fetchData().then((result) => {
      setData(result);
      // Don't set isLoading to false yet - let the animation complete
    });
  }, []);

  const handleAnimationComplete = () => {
    // Called after the full 2.25 second animation (including fades)
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <LoadingAnimation
        onComplete={handleAnimationComplete}
        duration={2250}  // Total duration in ms (default: 2250)
        fadeInDuration={300}  // Fade in time (default: 300)
        fadeOutDuration={300}  // Fade out time (default: 300)
      />
    );
  }

  return <div>Your content here: {JSON.stringify(data)}</div>;
}
```

## Advanced: Show Animation While Loading

```tsx
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { useState, useEffect } from 'react';

export default function MyPage() {
  const [showAnimation, setShowAnimation] = useState(true);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    // Start loading data
    const loadData = async () => {
      const [users, templates, assignments] = await Promise.all([
        fetchUsers(),
        fetchTemplates(),
        fetchAssignments()
      ]);

      setDataReady(true);
      // Animation will auto-hide after 2.25s
    };

    loadData();
  }, []);

  const handleAnimationComplete = () => {
    setShowAnimation(false);
  };

  return (
    <>
      {showAnimation && (
        <LoadingAnimation onComplete={handleAnimationComplete} />
      )}

      {/* This content loads in the background while animation plays */}
      <div style={{ opacity: showAnimation ? 0 : 1 }}>
        {dataReady ? 'Your content here' : 'Still loading...'}
      </div>
    </>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onComplete` | `() => void` | `undefined` | Callback fired after animation completes (including fade out) |
| `duration` | `number` | `2250` | Total animation duration in milliseconds |
| `fadeInDuration` | `number` | `300` | Fade in duration in milliseconds |
| `fadeOutDuration` | `number` | `300` | Fade out duration in milliseconds |

## Timeline

With default settings (2250ms total):
- **0-300ms**: Fade in
- **300-1950ms**: Animation visible (1650ms)
- **1950-2250ms**: Fade out

The animation file is:
- **Location**: `/public/animations/signature.json`
- **Size**: 24KB (optimized)
- **CDN**: Served by Cloudflare Pages (blazing fast global delivery)
- **Format**: Lottie JSON (After Effects animation)

## Animation Details

- 245x217px native resolution
- 5 animated layers (Pen, Signature, Ribbon, Icon, Blue Circle)
- Smooth signature drawing effect
- Professional and modern appearance

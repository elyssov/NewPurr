package app.purr.wallpaper;

import android.app.WallpaperColors;
import android.app.WallpaperManager;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.service.wallpaper.WallpaperService;
import android.view.SurfaceHolder;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Live wallpaper that shows one picture and pans across it as the launcher pages
 * are swiped. The picture is scaled uniformly to cover the screen, so nothing is
 * stretched; whatever sticks out horizontally is spread over all home screens.
 */
public class ScrollWallpaperService extends WallpaperService {

    @Override
    public Engine onCreateEngine() {
        return new ScrollEngine();
    }

    private final class ScrollEngine extends Engine
            implements SharedPreferences.OnSharedPreferenceChangeListener {

        private final Handler main = new Handler(Looper.getMainLooper());
        private final ExecutorService loader = Executors.newSingleThreadExecutor();
        private final Paint paint = new Paint(Paint.FILTER_BITMAP_FLAG);
        private final Matrix matrix = new Matrix();

        private Bitmap bitmap;
        private WallpaperColors colors;
        private int width, height;
        private int loadToken;
        private boolean visible, destroyed;
        private long lastTapTime;
        private int lastTapX, lastTapY;
        private float slop;

        /** 0 = left edge of the picture, 1 = right edge. Centered until the launcher reports. */
        private float xOffset = 0.5f;

        /** The system preview has no pages to swipe, so it pans by itself to show the effect. */
        private final Runnable previewTick = new Runnable() {
            @Override
            public void run() {
                double t = SystemClock.uptimeMillis() / 4000.0;
                xOffset = (float) (0.5 - 0.5 * Math.cos(t));
                draw();
                if (visible) main.postDelayed(this, 16);
            }
        };

        @Override
        public void onCreate(SurfaceHolder holder) {
            super.onCreate(holder);
            setOffsetNotificationsEnabled(true);
            slop = 48 * getResources().getDisplayMetrics().density;
            Store.prefs(ScrollWallpaperService.this).registerOnSharedPreferenceChangeListener(this);
        }

        @Override
        public void onDestroy() {
            destroyed = true;
            Store.prefs(ScrollWallpaperService.this).unregisterOnSharedPreferenceChangeListener(this);
            main.removeCallbacksAndMessages(null);
            loader.shutdownNow();
            super.onDestroy();
        }

        @Override
        public void onSharedPreferenceChanged(SharedPreferences prefs, String key) {
            if (Store.KEY_VERSION.equals(key)) reload();
        }

        @Override
        public void onSurfaceChanged(SurfaceHolder holder, int format, int w, int h) {
            super.onSurfaceChanged(holder, format, w, h);
            boolean resized = w != width || h != height;
            width = w;
            height = h;
            if (resized || bitmap == null) reload();
            draw();
        }

        @Override
        public void onSurfaceRedrawNeeded(SurfaceHolder holder) {
            draw();
        }

        @Override
        public void onVisibilityChanged(boolean v) {
            visible = v;
            main.removeCallbacks(previewTick);
            if (v) {
                if (isPreview()) {
                    main.post(previewTick);
                } else {
                    draw();
                    // Folder mode: time for the next picture? Checked whenever the wallpaper
                    // comes back into view, so no alarms or background work are needed.
                    if (Store.changeDue(ScrollWallpaperService.this)) next(false);
                }
            }
        }

        @Override
        public Bundle onCommand(String action, int x, int y, int z, Bundle extras, boolean result) {
            if (WallpaperManager.COMMAND_TAP.equals(action) && !isPreview()) {
                long now = SystemClock.uptimeMillis();
                boolean isDouble = now - lastTapTime < 350
                        && Math.hypot(x - lastTapX, y - lastTapY) < slop;
                lastTapTime = isDouble ? 0 : now;
                lastTapX = x;
                lastTapY = y;
                if (isDouble && Store.folderMode(ScrollWallpaperService.this)
                        && Store.prefs(ScrollWallpaperService.this)
                                .getBoolean(Store.KEY_DOUBLE_TAP, true)) {
                    next(true);
                }
            }
            return super.onCommand(action, x, y, z, extras, result);
        }

        @Override
        public void onOffsetsChanged(float x, float y, float xStep, float yStep, int xPx, int yPx) {
            if (isPreview()) return;
            // The launcher maps its first page to 0 and its last page to 1 whatever the
            // number of pages, so the pan range adapts to the screen count by itself.
            if (x != xOffset) {
                xOffset = x;
                draw();
            }
        }

        @Override
        public WallpaperColors onComputeColors() {
            return colors;
        }

        /**
         * Moves the folder on to its next picture. Every engine (home, lock screen) then
         * reloads through the version bump, so they always show the same picture; the
         * due check is repeated here so that two engines do not both advance.
         */
        private void next(final boolean force) {
            if (destroyed) return;
            loader.execute(() -> {
                ScrollWallpaperService c = ScrollWallpaperService.this;
                synchronized (Store.class) {
                    if ((force || Store.changeDue(c)) && Store.advance(c)) Store.bump(c);
                }
            });
        }

        private void reload() {
            final int w = width, h = height;
            if (w == 0 || h == 0 || destroyed) return;
            final int token = ++loadToken;
            loader.execute(() -> {
                Bitmap b = null;
                WallpaperColors c = null;
                // A folder picture may have been deleted or be unreadable: try a few others.
                for (int attempt = 0; attempt < 3 && b == null; attempt++) {
                    try {
                        b = Store.decode(ScrollWallpaperService.this, w, h);
                        if (b != null) c = WallpaperColors.fromBitmap(b);
                    } catch (Exception | OutOfMemoryError ignored) {
                        // keep whatever is on screen
                    }
                    if (b == null && !Store.advance(ScrollWallpaperService.this)) break;
                }
                final Bitmap fb = b;
                final WallpaperColors fc = c;
                main.post(() -> {
                    if (destroyed || token != loadToken || fb == null) return;
                    bitmap = fb;
                    colors = fc;
                    draw();
                    notifyColorsChanged();
                });
            });
        }

        private void draw() {
            if (width == 0 || height == 0) return;
            SurfaceHolder holder = getSurfaceHolder();
            Canvas canvas = null;
            try {
                canvas = holder.lockHardwareCanvas();
                if (canvas == null) return;
                canvas.drawColor(Color.BLACK);
                Bitmap b = bitmap;
                if (b == null) return;
                int cw = canvas.getWidth(), ch = canvas.getHeight();
                // One scale for both axes: the picture covers the screen and is never distorted.
                float s = Store.coverScale(b.getWidth(), b.getHeight(), cw, ch);
                float extraX = b.getWidth() * s - cw;
                float extraY = b.getHeight() * s - ch;
                float off = Math.max(0f, Math.min(1f, xOffset));
                matrix.setScale(s, s);
                matrix.postTranslate(-extraX * off, -extraY / 2f);
                canvas.drawBitmap(b, matrix, paint);
            } catch (RuntimeException ignored) {
                // surface went away between frames
            } finally {
                if (canvas != null) {
                    try {
                        holder.unlockCanvasAndPost(canvas);
                    } catch (RuntimeException ignored) {
                    }
                }
            }
        }
    }
}

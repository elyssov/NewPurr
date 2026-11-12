package app.purr.wallpaper;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.ImageDecoder;

import java.io.File;
import java.io.IOException;

/** Where the chosen picture lives and how it is decoded. */
final class Store {
    static final String PREFS = "wallpaper";
    static final String KEY_VERSION = "version";

    /** Limits that keep a decoded bitmap drawable on a hardware canvas. */
    private static final int MAX_SIDE = 8192;
    private static final long MAX_PIXELS = 24_000_000L;

    private Store() {}

    static File file(Context c) {
        return new File(c.getFilesDir(), "wallpaper.img");
    }

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** Tells a running wallpaper engine that the picture changed. */
    static void bump(Context c) {
        SharedPreferences p = prefs(c);
        p.edit().putInt(KEY_VERSION, p.getInt(KEY_VERSION, 0) + 1).apply();
    }

    /**
     * Decodes the picture (EXIF rotation applied) no larger than needed to cover a
     * viewW x viewH surface, always keeping the aspect ratio.
     */
    static Bitmap decode(Context c, int viewW, int viewH) throws IOException {
        File f = file(c);
        if (!f.exists()) return null;
        return ImageDecoder.decodeBitmap(ImageDecoder.createSource(f), (decoder, info, src) -> {
            int w = info.getSize().getWidth();
            int h = info.getSize().getHeight();
            double k = Math.min(1.0, coverScale(w, h, viewW, viewH));
            k = Math.min(k, (double) MAX_SIDE / Math.max(w, h));
            k = Math.min(k, Math.sqrt((double) MAX_PIXELS / ((double) w * h)));
            decoder.setTargetSize(Math.max(1, (int) Math.round(w * k)),
                    Math.max(1, (int) Math.round(h * k)));
            decoder.setAllocator(ImageDecoder.ALLOCATOR_SOFTWARE);
        });
    }

    /** Full pixel size of the stored picture as displayed (EXIF rotation applied). */
    static int[] size(Context c) throws IOException {
        File f = file(c);
        if (!f.exists()) return null;
        final int[] out = new int[2];
        ImageDecoder.decodeBitmap(ImageDecoder.createSource(f), (decoder, info, src) -> {
            out[0] = info.getSize().getWidth();
            out[1] = info.getSize().getHeight();
            decoder.setTargetSize(1, 1);
        });
        return out;
    }

    /** Uniform scale at which a w x h picture fully covers the view. */
    static float coverScale(int w, int h, int viewW, int viewH) {
        return Math.max((float) viewW / w, (float) viewH / h);
    }
}

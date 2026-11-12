package app.purr.wallpaper;

import android.content.Context;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.ImageDecoder;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.provider.DocumentsContract.Document;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import java.util.TreeMap;

/** Where the wallpaper pictures come from and how they are decoded. */
final class Store {
    static final String PREFS = "wallpaper";
    /** Bumped whenever the picture to show changes; engines reload on it. */
    static final String KEY_VERSION = "version";
    /** Tree URI of the chosen folder, absent in single-picture mode. */
    static final String KEY_TREE = "tree";
    /** Document URI of the folder picture currently shown. */
    static final String KEY_CURRENT = "current";
    static final String KEY_LAST_CHANGE = "lastChange";
    static final String KEY_INTERVAL_MIN = "intervalMin";
    static final String KEY_SHUFFLE = "shuffle";
    static final String KEY_DOUBLE_TAP = "doubleTap";

    static final int DEFAULT_INTERVAL_MIN = 60;

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

    /** Tells running wallpaper engines that the picture changed. */
    static void bump(Context c) {
        SharedPreferences p = prefs(c);
        p.edit().putInt(KEY_VERSION, p.getInt(KEY_VERSION, 0) + 1).apply();
    }

    static Uri tree(Context c) {
        String s = prefs(c).getString(KEY_TREE, null);
        return s == null ? null : Uri.parse(s);
    }

    static boolean folderMode(Context c) {
        return prefs(c).contains(KEY_TREE);
    }

    /** True when the folder picture has been on screen for the whole chosen interval. */
    static boolean changeDue(Context c) {
        SharedPreferences p = prefs(c);
        if (!p.contains(KEY_TREE)) return false;
        long interval = p.getInt(KEY_INTERVAL_MIN, DEFAULT_INTERVAL_MIN) * 60_000L;
        long since = System.currentTimeMillis() - p.getLong(KEY_LAST_CHANGE, 0);
        return since >= interval || since < 0;
    }

    /** Pictures directly inside the folder, sorted by name. */
    static List<Uri> list(Context c, Uri tree) {
        TreeMap<String, Uri> sorted = new TreeMap<>();
        Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(
                tree, DocumentsContract.getTreeDocumentId(tree));
        String[] cols = {Document.COLUMN_DOCUMENT_ID, Document.COLUMN_MIME_TYPE,
                Document.COLUMN_DISPLAY_NAME};
        try (Cursor cur = c.getContentResolver().query(children, cols, null, null, null)) {
            while (cur != null && cur.moveToNext()) {
                String mime = cur.getString(1);
                if (mime == null || !mime.startsWith("image/")) continue;
                String id = cur.getString(0);
                String name = cur.getString(2);
                sorted.put((name == null ? "" : name.toLowerCase(Locale.ROOT)) + '\0' + id,
                        DocumentsContract.buildDocumentUriUsingTree(tree, id));
            }
        } catch (RuntimeException ignored) {
            // folder is gone or access was revoked
        }
        return new ArrayList<>(sorted.values());
    }

    /** Moves on to another picture of the folder; returns false if there is none to show. */
    static synchronized boolean advance(Context c) {
        Uri tree = tree(c);
        if (tree == null) return false;
        List<Uri> all = list(c, tree);
        if (all.isEmpty()) return false;
        SharedPreferences p = prefs(c);
        String cur = p.getString(KEY_CURRENT, null);
        int at = cur == null ? -1 : all.indexOf(Uri.parse(cur));
        int next;
        if (p.getBoolean(KEY_SHUFFLE, true) && all.size() > 1) {
            // never show the same picture twice in a row
            next = new Random().nextInt(at < 0 ? all.size() : all.size() - 1);
            if (at >= 0 && next >= at) next++;
        } else {
            next = (at + 1) % all.size();
        }
        p.edit().putString(KEY_CURRENT, all.get(next).toString())
                .putLong(KEY_LAST_CHANGE, System.currentTimeMillis())
                .apply();
        return true;
    }

    private static synchronized ImageDecoder.Source source(Context c) {
        if (folderMode(c)) {
            String cur = prefs(c).getString(KEY_CURRENT, null);
            if (cur == null) {
                if (!advance(c)) return null;
                cur = prefs(c).getString(KEY_CURRENT, null);
            }
            return ImageDecoder.createSource(c.getContentResolver(), Uri.parse(cur));
        }
        File f = file(c);
        return f.exists() ? ImageDecoder.createSource(f) : null;
    }

    /**
     * Decodes the current picture (EXIF rotation applied) no larger than needed to
     * cover a viewW x viewH surface, always keeping the aspect ratio.
     */
    static Bitmap decode(Context c, int viewW, int viewH) throws IOException {
        ImageDecoder.Source source = source(c);
        if (source == null) return null;
        return ImageDecoder.decodeBitmap(source, (decoder, info, src) -> {
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

    /** Full pixel size of the current picture as displayed (EXIF rotation applied). */
    static int[] size(Context c) throws IOException {
        ImageDecoder.Source source = source(c);
        if (source == null) return null;
        final int[] out = new int[2];
        ImageDecoder.decodeBitmap(source, (decoder, info, src) -> {
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

package app.purr.wallpaper;

import android.app.Activity;
import android.app.WallpaperInfo;
import android.app.WallpaperManager;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Rect;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final int REQ_PICK = 1;

    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final Handler main = new Handler(Looper.getMainLooper());

    private ImageView preview;
    private TextView empty, info;
    private Button apply;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        setContentView(R.layout.main);
        preview = findViewById(R.id.preview);
        empty = findViewById(R.id.empty);
        info = findViewById(R.id.info);
        apply = findViewById(R.id.apply);

        findViewById(R.id.pick).setOnClickListener(v -> pick());
        apply.setOnClickListener(v -> applyWallpaper());
        showCurrent();
    }

    @Override
    protected void onDestroy() {
        io.shutdown();
        super.onDestroy();
    }

    private void pick() {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT)
                .addCategory(Intent.CATEGORY_OPENABLE)
                .setType("image/*");
        startActivityForResult(i, REQ_PICK);
    }

    @Override
    protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request != REQ_PICK || result != RESULT_OK || data == null || data.getData() == null) {
            return;
        }
        final Uri uri = data.getData();
        io.execute(() -> {
            // Keep a private copy: the wallpaper must survive reboots and gallery cleanups.
            File tmp = new File(getFilesDir(), "wallpaper.tmp");
            boolean ok = false;
            try (InputStream in = getContentResolver().openInputStream(uri);
                 OutputStream out = new FileOutputStream(tmp)) {
                if (in != null) {
                    byte[] buf = new byte[1 << 16];
                    for (int n; (n = in.read(buf)) > 0; ) out.write(buf, 0, n);
                    ok = true;
                }
            } catch (Exception ignored) {
            }
            File old = Store.file(this);
            File backup = new File(getFilesDir(), "wallpaper.bak");
            if (ok) {
                backup.delete();
                boolean hadOld = old.renameTo(backup);
                ok = tmp.renameTo(old) && decodable();
                if (!ok) {
                    old.delete();
                    if (hadOld) backup.renameTo(old);
                }
                backup.delete();
            }
            tmp.delete();
            final boolean done = ok;
            main.post(() -> {
                if (isDestroyed()) return;
                if (!done) {
                    Toast.makeText(this, R.string.load_error, Toast.LENGTH_LONG).show();
                    return;
                }
                Store.bump(this);
                showCurrent();
                if (isOurWallpaperActive()) {
                    Toast.makeText(this, R.string.updated, Toast.LENGTH_SHORT).show();
                }
            });
        });
    }

    private boolean decodable() {
        try {
            return Store.decode(this, 64, 64) != null;
        } catch (Exception | OutOfMemoryError e) {
            return false;
        }
    }

    private void showCurrent() {
        final Rect screen = getWindowManager().getMaximumWindowMetrics().getBounds();
        io.execute(() -> {
            Bitmap b = null;
            int[] full = null;
            try {
                // Small decode for the preview; full-size numbers come from the header.
                b = Store.decode(this, 480, 480);
                full = Store.size(this);
            } catch (Exception | OutOfMemoryError ignored) {
            }
            final Bitmap fb = b;
            final int[] size = full;
            main.post(() -> {
                if (isDestroyed() || fb == null || size == null) return;
                preview.setImageBitmap(fb);
                empty.setVisibility(View.GONE);
                apply.setEnabled(true);
                float screens = ((float) size[0] / size[1]) / ((float) screen.width() / screen.height());
                info.setText(screens > 1.02f
                        ? getString(R.string.info, size[0], size[1],
                                String.format(Locale.getDefault(), "%.1f", screens))
                        : getString(R.string.info_narrow, size[0], size[1]));
            });
        });
    }

    private boolean isOurWallpaperActive() {
        WallpaperInfo wi = WallpaperManager.getInstance(this).getWallpaperInfo();
        return wi != null && getPackageName().equals(wi.getPackageName());
    }

    private void applyWallpaper() {
        Intent i = new Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER)
                .putExtra(WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT,
                        new ComponentName(this, ScrollWallpaperService.class));
        try {
            startActivity(i);
        } catch (ActivityNotFoundException e) {
            try {
                startActivity(new Intent(WallpaperManager.ACTION_LIVE_WALLPAPER_CHOOSER));
            } catch (ActivityNotFoundException ignored) {
            }
        }
    }
}

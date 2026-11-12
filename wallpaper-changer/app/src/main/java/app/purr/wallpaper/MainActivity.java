package app.purr.wallpaper;

import android.app.Activity;
import android.app.WallpaperInfo;
import android.app.WallpaperManager;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.ImageDecoder;
import android.graphics.Rect;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.DocumentsContract;
import android.provider.DocumentsContract.Document;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.ImageView;
import android.widget.Spinner;
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
    private static final int REQ_FOLDER = 2;

    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final Handler main = new Handler(Looper.getMainLooper());

    private ImageView preview;
    private TextView empty, info;
    private Button apply;
    private View folderPanel;
    private int[] intervalMinutes;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        setContentView(R.layout.main);
        preview = findViewById(R.id.preview);
        empty = findViewById(R.id.empty);
        info = findViewById(R.id.info);
        apply = findViewById(R.id.apply);
        folderPanel = findViewById(R.id.folder_panel);

        findViewById(R.id.pick).setOnClickListener(v -> startActivityForResult(
                new Intent(Intent.ACTION_OPEN_DOCUMENT)
                        .addCategory(Intent.CATEGORY_OPENABLE)
                        .setType("image/*"), REQ_PICK));
        findViewById(R.id.pick_folder).setOnClickListener(v -> startActivityForResult(
                new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE), REQ_FOLDER));
        findViewById(R.id.next).setOnClickListener(v -> io.execute(() -> {
            if (Store.advance(this)) changed();
        }));
        apply.setOnClickListener(v -> applyWallpaper());
        setUpFolderSettings();
    }

    @Override
    protected void onResume() {
        super.onResume();
        // The wallpaper may have moved on to another picture while we were away.
        showCurrent();
    }

    @Override
    protected void onDestroy() {
        io.shutdown();
        super.onDestroy();
    }

    private void setUpFolderSettings() {
        final SharedPreferences prefs = Store.prefs(this);
        intervalMinutes = getResources().getIntArray(R.array.interval_minutes);

        Spinner interval = findViewById(R.id.interval);
        ArrayAdapter<CharSequence> adapter = ArrayAdapter.createFromResource(
                this, R.array.interval_names, android.R.layout.simple_spinner_item);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        interval.setAdapter(adapter);
        int saved = prefs.getInt(Store.KEY_INTERVAL_MIN, Store.DEFAULT_INTERVAL_MIN);
        for (int i = 0; i < intervalMinutes.length; i++) {
            if (intervalMinutes[i] == saved) interval.setSelection(i);
        }
        interval.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int pos, long id) {
                prefs.edit().putInt(Store.KEY_INTERVAL_MIN, intervalMinutes[pos]).apply();
            }

            @Override
            public void onNothingSelected(AdapterView<?> parent) {
            }
        });

        CheckBox shuffle = findViewById(R.id.shuffle);
        shuffle.setChecked(prefs.getBoolean(Store.KEY_SHUFFLE, true));
        shuffle.setOnCheckedChangeListener((v, on) ->
                prefs.edit().putBoolean(Store.KEY_SHUFFLE, on).apply());

        CheckBox doubleTap = findViewById(R.id.double_tap);
        doubleTap.setChecked(prefs.getBoolean(Store.KEY_DOUBLE_TAP, true));
        doubleTap.setOnCheckedChangeListener((v, on) ->
                prefs.edit().putBoolean(Store.KEY_DOUBLE_TAP, on).apply());
    }

    @Override
    protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (result != RESULT_OK || data == null || data.getData() == null) return;
        final Uri uri = data.getData();
        if (request == REQ_PICK) {
            io.execute(() -> usePicture(uri));
        } else if (request == REQ_FOLDER) {
            io.execute(() -> useFolder(uri));
        }
    }

    /** Single-picture mode: keep a private copy so it survives reboots and gallery cleanups. */
    private void usePicture(Uri uri) {
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
        if (ok) {
            try {
                ok = ImageDecoder.decodeBitmap(
                        ImageDecoder.createSource(tmp),
                        (d, i, s) -> d.setTargetSize(1, 1)) != null;
            } catch (Exception | OutOfMemoryError e) {
                ok = false;
            }
        }
        if (!ok || !tmp.renameTo(Store.file(this))) {
            tmp.delete();
            toast(R.string.load_error);
            return;
        }
        releaseFolder(null);
        Store.prefs(this).edit().remove(Store.KEY_TREE).remove(Store.KEY_CURRENT).apply();
        changed();
    }

    /** Folder mode: pictures are read in place, so new files in the folder join the rotation. */
    private void useFolder(Uri tree) {
        try {
            getContentResolver().takePersistableUriPermission(
                    tree, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } catch (SecurityException e) {
            toast(R.string.load_error);
            return;
        }
        if (Store.list(this, tree).isEmpty()) {
            if (!tree.equals(Store.tree(this))) release(tree);
            toast(R.string.folder_empty);
            return;
        }
        releaseFolder(tree);
        Store.prefs(this).edit().putString(Store.KEY_TREE, tree.toString())
                .remove(Store.KEY_CURRENT).apply();
        Store.advance(this);
        changed();
    }

    /** Gives back access to the previously chosen folder unless it is {@code keep}. */
    private void releaseFolder(Uri keep) {
        Uri old = Store.tree(this);
        if (old != null && !old.equals(keep)) release(old);
    }

    private void release(Uri tree) {
        try {
            getContentResolver().releasePersistableUriPermission(
                    tree, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } catch (SecurityException ignored) {
        }
    }

    private void changed() {
        Store.bump(this);
        main.post(() -> {
            if (isDestroyed()) return;
            showCurrent();
            if (isOurWallpaperActive()) {
                Toast.makeText(this, R.string.updated, Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void toast(int text) {
        main.post(() -> Toast.makeText(this, text, Toast.LENGTH_LONG).show());
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
            final Uri tree = Store.tree(this);
            final String folderLine = tree == null ? null
                    : getString(R.string.folder_info, folderName(tree), Store.list(this, tree).size());
            final Bitmap fb = b;
            final int[] size = full;
            main.post(() -> {
                if (isDestroyed()) return;
                folderPanel.setVisibility(tree == null ? View.GONE : View.VISIBLE);
                StringBuilder text = new StringBuilder();
                if (folderLine != null) text.append(folderLine);
                if (fb != null && size != null) {
                    preview.setImageBitmap(fb);
                    empty.setVisibility(View.GONE);
                    float screens = ((float) size[0] / size[1])
                            / ((float) screen.width() / screen.height());
                    if (text.length() > 0) text.append('\n');
                    text.append(screens > 1.02f
                            ? getString(R.string.info, size[0], size[1],
                                    String.format(Locale.getDefault(), "%.1f", screens))
                            : getString(R.string.info_narrow, size[0], size[1]));
                }
                apply.setEnabled(fb != null || tree != null);
                info.setText(text);
            });
        });
    }

    private String folderName(Uri tree) {
        Uri doc = DocumentsContract.buildDocumentUriUsingTree(
                tree, DocumentsContract.getTreeDocumentId(tree));
        try (Cursor c = getContentResolver().query(
                doc, new String[]{Document.COLUMN_DISPLAY_NAME}, null, null, null)) {
            if (c != null && c.moveToFirst() && c.getString(0) != null) return c.getString(0);
        } catch (RuntimeException ignored) {
        }
        return "?";
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

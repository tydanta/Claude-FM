package fm.claude.privatefm;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ClaudeMedia")
public class ClaudeMediaPlugin extends Plugin {
    public static final String ACTION_PREVIOUS = ClaudeMediaService.ACTION_PREVIOUS;
    public static final String ACTION_PLAY = ClaudeMediaService.ACTION_PLAY;
    public static final String ACTION_PAUSE = ClaudeMediaService.ACTION_PAUSE;
    public static final String ACTION_PLAY_PAUSE = ClaudeMediaService.ACTION_PLAY_PAUSE;
    public static final String ACTION_NEXT = ClaudeMediaService.ACTION_NEXT;
    public static final String ACTION_LIKE = ClaudeMediaService.ACTION_LIKE;

    private static ClaudeMediaPlugin activePlugin;

    @Override
    public void load() {
        activePlugin = this;
    }

    @Override
    protected void handleOnDestroy() {
        if (activePlugin == this) {
            activePlugin = null;
        }
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            getActivity().requestPermissions(new String[] { Manifest.permission.POST_NOTIFICATIONS }, 4307);
        }
        call.resolve();
    }

    @PluginMethod
    public void update(PluginCall call) {
        Intent intent = new Intent(getContext(), ClaudeMediaService.class);
        intent.setAction(ClaudeMediaService.ACTION_UPDATE);
        intent.putExtra("title", call.getString("title", "Claude FM"));
        intent.putExtra("artist", call.getString("artist", ""));
        intent.putExtra("album", call.getString("album", ""));
        intent.putExtra("cover", call.getString("cover", ""));
        intent.putExtra("liked", Boolean.TRUE.equals(call.getBoolean("liked", false)));
        intent.putExtra("playing", Boolean.TRUE.equals(call.getBoolean("playing", false)));
        intent.putExtra("positionMs", readLongOption(call, "positionMs"));
        intent.putExtra("durationMs", readLongOption(call, "durationMs"));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }
        call.resolve();
    }

    private long readLongOption(PluginCall call, String key) {
        Object value = call.getData().opt(key);
        if (value instanceof Number) {
            return Math.max(0L, Math.round(((Number) value).doubleValue()));
        }
        if (value instanceof String) {
            try {
                return Math.max(0L, Math.round(Double.parseDouble((String) value)));
            } catch (NumberFormatException ignored) {
                return 0L;
            }
        }
        return 0L;
    }

    public static void dispatchMediaAction(String action) {
        ClaudeMediaPlugin plugin = activePlugin;
        if (plugin == null) return;
        JSObject payload = new JSObject();
        payload.put("action", action);
        plugin.notifyListeners("mediaAction", payload, true);
    }
}

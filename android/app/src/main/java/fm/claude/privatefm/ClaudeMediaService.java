package fm.claude.privatefm;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.MediaMetadata;
import android.media.Rating;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ClaudeMediaService extends Service {
    public static final String ACTION_UPDATE = "fm.claude.privatefm.media.UPDATE";
    public static final String ACTION_PREVIOUS = "fm.claude.privatefm.media.PREVIOUS";
    public static final String ACTION_PLAY = "fm.claude.privatefm.media.PLAY";
    public static final String ACTION_PAUSE = "fm.claude.privatefm.media.PAUSE";
    public static final String ACTION_PLAY_PAUSE = "fm.claude.privatefm.media.PLAY_PAUSE";
    public static final String ACTION_NEXT = "fm.claude.privatefm.media.NEXT";
    public static final String ACTION_LIKE = "fm.claude.privatefm.media.LIKE";

    private static final String CHANNEL_ID = "claude_media_playback";
    private static final int NOTIFICATION_ID = 7401;

    private final ExecutorService artworkExecutor = Executors.newSingleThreadExecutor();
    private MediaSession mediaSession;
    private String title = "Claude FM";
    private String artist = "";
    private String album = "";
    private String cover = "";
    private boolean liked = false;
    private boolean playing = false;
    private long positionMs = 0L;
    private long durationMs = 0L;
    private Bitmap artwork = null;

    @Override
    public void onCreate() {
        super.onCreate();
        ensureChannel();
        mediaSession = new MediaSession(this, "Claude FM");
        mediaSession.setCallback(new MediaSession.Callback() {
            @Override
            public void onSkipToPrevious() {
                dispatchAction("previous");
            }

            @Override
            public void onPlay() {
                dispatchAction("play");
            }

            @Override
            public void onPause() {
                dispatchAction("pause");
            }

            @Override
            public void onSkipToNext() {
                dispatchAction("next");
            }

            @Override
            public void onSetRating(Rating rating) {
                if (rating == null || !rating.isRated() || rating.hasHeart() != liked) {
                    dispatchAction("like");
                }
            }

            @Override
            public void onCustomAction(String action, Bundle extras) {
                if (ACTION_LIKE.equals(action)) {
                    dispatchAction("like");
                }
            }
        });
        mediaSession.setActive(true);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? ACTION_UPDATE : intent.getAction();
        if (ACTION_PREVIOUS.equals(action)) {
            ClaudeMediaPlugin.dispatchMediaAction("previous");
            return START_STICKY;
        }
        if (ACTION_PLAY.equals(action)) {
            ClaudeMediaPlugin.dispatchMediaAction("play");
            return START_STICKY;
        }
        if (ACTION_PAUSE.equals(action)) {
            ClaudeMediaPlugin.dispatchMediaAction("pause");
            return START_STICKY;
        }
        if (ACTION_PLAY_PAUSE.equals(action)) {
            ClaudeMediaPlugin.dispatchMediaAction("playPause");
            return START_STICKY;
        }
        if (ACTION_NEXT.equals(action)) {
            ClaudeMediaPlugin.dispatchMediaAction("next");
            return START_STICKY;
        }
        if (ACTION_LIKE.equals(action)) {
            ClaudeMediaPlugin.dispatchMediaAction("like");
            return START_STICKY;
        }
        updateState(intent);
        publishNotification();
        loadArtworkAsync(cover);
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        artworkExecutor.shutdownNow();
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        super.onDestroy();
    }

    private void updateState(Intent intent) {
        if (intent == null) return;
        title = intent.getStringExtra("title") == null ? "Claude FM" : intent.getStringExtra("title");
        artist = intent.getStringExtra("artist") == null ? "" : intent.getStringExtra("artist");
        album = intent.getStringExtra("album") == null ? "" : intent.getStringExtra("album");
        String nextCover = intent.getStringExtra("cover") == null ? "" : intent.getStringExtra("cover");
        if (!nextCover.equals(cover)) {
            cover = nextCover;
            artwork = null;
        }
        liked = intent.getBooleanExtra("liked", false);
        playing = intent.getBooleanExtra("playing", false);
        positionMs = Math.max(0L, intent.getLongExtra("positionMs", 0L));
        durationMs = Math.max(0L, intent.getLongExtra("durationMs", 0L));
        if (durationMs > 0L) {
            positionMs = Math.min(positionMs, durationMs);
        }
    }

    private void dispatchAction(String action) {
        ClaudeMediaPlugin.dispatchMediaAction(action);
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Claude FM Playback",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Claude FM media playback controls");
        channel.setShowBadge(false);
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.createNotificationChannel(channel);
    }

    private void publishNotification() {
        updateMediaSession();
        Notification notification = buildNotification();
        startForeground(NOTIFICATION_ID, notification);
    }

    private void updateMediaSession() {
        if (mediaSession == null) return;
        MediaMetadata.Builder metadata = new MediaMetadata.Builder()
            .putString(MediaMetadata.METADATA_KEY_TITLE, title)
            .putString(MediaMetadata.METADATA_KEY_ARTIST, artist)
            .putString(MediaMetadata.METADATA_KEY_ALBUM, album)
            .putLong(MediaMetadata.METADATA_KEY_DURATION, durationMs)
            .putRating(MediaMetadata.METADATA_KEY_USER_RATING, Rating.newHeartRating(liked));
        if (artwork != null) {
            metadata.putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, artwork);
            metadata.putBitmap(MediaMetadata.METADATA_KEY_ART, artwork);
        }
        mediaSession.setMetadata(metadata.build());
        int state = playing ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED;
        long actions = PlaybackState.ACTION_PLAY
            | PlaybackState.ACTION_PAUSE
            | PlaybackState.ACTION_PLAY_PAUSE
            | PlaybackState.ACTION_SKIP_TO_PREVIOUS
            | PlaybackState.ACTION_SKIP_TO_NEXT
            | PlaybackState.ACTION_SET_RATING;
        mediaSession.setPlaybackState(new PlaybackState.Builder()
            .setActions(actions)
            .addCustomAction(new PlaybackState.CustomAction.Builder(
                ACTION_LIKE,
                liked ? "取消喜欢" : "喜欢",
                likeIcon()
            ).build())
            .setState(state, positionMs, playing ? 1f : 0f)
            .build());
    }

    private Notification buildNotification() {
        Intent contentIntent = new Intent(this, MainActivity.class);
        contentIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentPendingIntent = PendingIntent.getActivity(this, 0, contentIntent, pendingIntentFlags());

        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(this, CHANNEL_ID)
            : new Notification.Builder(this);
        builder
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(artist)
            .setSubText(album)
            .setContentIntent(contentPendingIntent)
            .setOngoing(playing)
            .setShowWhen(false)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .addAction(android.R.drawable.ic_media_previous, "上一首", mediaAction(ACTION_PREVIOUS, 1))
            .addAction(playing ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play, playing ? "暂停" : "播放", mediaAction(playing ? ACTION_PAUSE : ACTION_PLAY, 2))
            .addAction(android.R.drawable.ic_media_next, "下一首", mediaAction(ACTION_NEXT, 3))
            .addAction(likeIcon(), liked ? "取消喜欢" : "喜欢", mediaAction(ACTION_LIKE, 4));
        if (artwork != null) builder.setLargeIcon(artwork);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP && mediaSession != null) {
            builder.setStyle(new Notification.MediaStyle()
                .setMediaSession(mediaSession.getSessionToken())
                .setShowActionsInCompactView(0, 1, 2, 3));
        }
        return builder.build();
    }

    private PendingIntent mediaAction(String action, int requestCode) {
        Intent intent = new Intent(this, ClaudeMediaService.class);
        intent.setAction(action);
        return PendingIntent.getService(this, requestCode, intent, pendingIntentFlags());
    }

    private int likeIcon() {
        return liked ? R.drawable.ic_media_heart_filled : R.drawable.ic_media_heart;
    }

    private int pendingIntentFlags() {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return flags;
    }

    private void loadArtworkAsync(String artworkUrl) {
        if (artworkUrl == null || artworkUrl.length() == 0 || artworkUrl.startsWith("data:")) return;
        final String expectedUrl = artworkUrl;
        artworkExecutor.execute(() -> {
            Bitmap bitmap = downloadBitmap(expectedUrl);
            if (bitmap == null || !expectedUrl.equals(cover)) return;
            artwork = bitmap;
            publishNotification();
        });
    }

    private Bitmap downloadBitmap(String artworkUrl) {
        HttpURLConnection connection = null;
        try {
            URL url = new URL(artworkUrl);
            connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(6000);
            connection.setInstanceFollowRedirects(true);
            try (InputStream stream = connection.getInputStream()) {
                return BitmapFactory.decodeStream(stream);
            }
        } catch (Exception ignored) {
            return null;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }
}

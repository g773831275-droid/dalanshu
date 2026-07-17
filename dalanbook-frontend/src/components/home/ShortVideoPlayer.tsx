import { useEffect, useRef, useState } from "react";
import { Expand, LoaderCircle, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import "@volcengine/veplayer/index.min.css";
import { getVideoPlayback, type VideoPlaybackSource } from "@/lib/dalanbookApi";

type VePlayerCore = {
  on(event: string, callback: () => void): void;
  play(): Promise<void> | void;
  pause(): void;
  currentTime: number;
  duration: number;
  muted: boolean;
  paused?: boolean;
};

type VePlayerInstance = {
  player: VePlayerCore;
  destroy(): Promise<void>;
};

type VePlayerConstructor = {
  new (config: Record<string, unknown>): VePlayerInstance;
  setLicenseConfig(config: { license: string }): Promise<void>;
};

type ShortVideoPlayerProps = {
  postId: string;
  posterUrl?: string;
  durationMs?: number;
  autoPlay?: boolean;
};

let licenseSetup: Promise<void> | null = null;

function formatDuration(milliseconds?: number) {
  const seconds = Math.max(0, Math.round((milliseconds ?? 0) / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function isLocalHost() {
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function toExpiryTimestamp(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? Math.floor(timestamp / 1000) : undefined;
}

function vodLogOptions() {
  const appId = Number(import.meta.env.VITE_VOD_APP_ID);
  if (!Number.isInteger(appId) || appId <= 0) return undefined;
  return {
    vtype: "HLS",
    tag: "dalanbook_short_video",
    line_app_id: appId,
  };
}

function configureLicense(VePlayer: VePlayerConstructor) {
  if (isLocalHost()) return Promise.resolve();
  const licenseUrl = import.meta.env.VITE_VOD_LICENSE_URL?.trim();
  if (!licenseUrl) return Promise.reject(new Error("播放器授权未配置"));
  licenseSetup ??= VePlayer.setLicenseConfig({ license: licenseUrl });
  return licenseSetup;
}

function playerSource(source: VideoPlaybackSource) {
  const urlExpireTimestamp = toExpiryTimestamp(source.expiresAt);
  if (source.vid && source.playAuth) {
    return {
      vid: source.vid,
      getVideoByToken: {
        playAuthToken: source.playAuth,
        needPoster: true,
        needDefinitionList: false,
        retryCount: 1,
      },
      urlExpireTimestamp,
    };
  }
  if (source.url) {
    return {
      url: source.url,
      streamType: "hls",
      urlExpireTimestamp,
    };
  }
  throw new Error("视频服务未返回可播放的视频源");
}

export function ShortVideoPlayer({
  postId,
  posterUrl,
  durationMs,
  autoPlay = true,
}: ShortVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<VePlayerInstance | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [source, setSource] = useState<VideoPlaybackSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [playerDuration, setPlayerDuration] = useState((durationMs ?? 0) / 1000);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setSource(null);
    void getVideoPlayback(postId)
      .then((nextSource) => {
        if (active) setSource(nextSource);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : "视频加载失败，请稍后重试");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [postId, retryKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !source) return;
    let active = true;
    let player: VePlayerInstance | null = null;

    void import("@volcengine/veplayer")
      .then(async ({ default: VePlayer }) => {
        const Player = VePlayer as unknown as VePlayerConstructor;
        await configureLicense(Player);
        if (!active) return;
        const logs = vodLogOptions();
        const mediaSource = playerSource(source);
        player = new Player({
          root: container,
          ...mediaSource,
          poster: source.posterUrl ?? posterUrl,
          width: "100%",
          height: "100%",
          controls: false,
          autoplay: autoPlay,
          autoplayMuted: true,
          enableDegradeMuteAutoplay: true,
          playsinline: true,
          closeVideoClick: true,
          closeVideoDblclick: true,
          pip: false,
          download: false,
          mini: false,
          screenShot: false,
          playbackRate: false,
          definition: false,
          cssFullscreen: false,
          loop: true,
          videoAttributes: { muted: true, disablePictureInPicture: true },
          videoFillMode: "cover",
          ignores: ["pip", "miniscreen", "keyboard", "download", "playbackrate", "definition"],
          enableUrlExpireCheck: true,
          urlExpireDiff: 60,
          onMediaExpired: async () => {
            const refreshed = await getVideoPlayback(postId);
            return playerSource(refreshed);
          },
          vodLogOpts: logs,
          disableVodLogOptsCheck: !logs,
        });
        playerRef.current = player;
        const core = player.player;
        core.on("loadedmetadata", () => {
          if (Number.isFinite(core.duration)) setPlayerDuration(core.duration);
        });
        core.on("durationchange", () => {
          if (Number.isFinite(core.duration)) setPlayerDuration(core.duration);
        });
        core.on("timeupdate", () => setCurrentTime(core.currentTime));
        core.on("play", () => setPlaying(true));
        core.on("pause", () => setPlaying(false));
        core.on("waiting", () => setLoading(true));
        core.on("canplay", () => setLoading(false));
        core.on("error", () => {
          setLoading(false);
          setError("播放失败，请刷新播放地址后重试");
        });
      })
      .catch((setupError: unknown) => {
        if (active) {
          setLoading(false);
          setError(setupError instanceof Error ? setupError.message : "播放器初始化失败");
        }
      });

    return () => {
      active = false;
      playerRef.current = null;
      void player?.destroy();
    };
  }, [autoPlay, postId, posterUrl, source]);

  const togglePlayback = () => {
    const core = playerRef.current?.player;
    if (!core) return;
    if (core.paused ?? !playing) {
      void Promise.resolve(core.play()).catch(() => {
        setError("浏览器阻止了播放，请再次点击播放按钮");
      });
      return;
    }
    core.pause();
  };

  const toggleMuted = () => {
    const core = playerRef.current?.player;
    if (!core) return;
    const nextMuted = !core.muted;
    core.muted = nextMuted;
    setMuted(nextMuted);
  };

  const seek = (value: number) => {
    const core = playerRef.current?.player;
    if (!core) return;
    core.currentTime = value;
    setCurrentTime(value);
  };

  const retry = () => {
    playerRef.current?.player.pause();
    setRetryKey((value) => value + 1);
  };

  const totalDuration = Number.isFinite(playerDuration) && playerDuration > 0 ? playerDuration : 0;

  return (
    <div className="short-video-player relative isolate aspect-[9/16] overflow-hidden rounded-[12px] bg-black">
      <div ref={containerRef} className="h-full w-full [&_.xgplayer-controls]:hidden" />

      {loading && !error ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/20">
          <LoaderCircle className="h-7 w-7 animate-spin text-white" aria-label="视频加载中" />
        </div>
      ) : null}

      {error ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/70 px-6 text-center text-[13px] text-white">
          <span>{error}</span>
          <button
            type="button"
            onClick={retry}
            className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-white px-3 text-[12px] font-medium text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
            重试
          </button>
        </div>
      ) : null}

      {!playing && !loading && !error ? (
        <button
          type="button"
          onClick={togglePlayback}
          className="absolute left-1/2 top-1/2 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-foreground shadow-[0_6px_20px_rgba(0,0,0,0.24)] transition-transform hover:scale-105"
          aria-label="播放视频"
        >
          <Play className="ml-0.5 h-6 w-6 fill-current" strokeWidth={1.5} />
        </button>
      ) : null}

      {!error ? (
        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/75 via-black/20 to-transparent px-3 pb-3 pt-10 text-white">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlayback}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/15"
              aria-label={playing ? "暂停视频" : "播放视频"}
            >
              {playing ? (
                <Pause className="h-4 w-4 fill-current" strokeWidth={1.75} />
              ) : (
                <Play className="ml-0.5 h-4 w-4 fill-current" strokeWidth={1.75} />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={totalDuration || 1}
              step={0.1}
              value={Math.min(currentTime, totalDuration || 1)}
              onChange={(event) => seek(Number(event.target.value))}
              className="h-1 min-w-0 flex-1 accent-white"
              aria-label="播放进度"
            />
            <span className="w-[72px] shrink-0 text-right font-mono text-[11px] tabular-nums">
              {formatDuration(currentTime * 1000)} / {formatDuration(totalDuration * 1000)}
            </span>
            <button
              type="button"
              onClick={toggleMuted}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/15"
              aria-label={muted ? "开启声音" : "静音"}
            >
              {muted ? (
                <VolumeX className="h-4 w-4" strokeWidth={1.75} />
              ) : (
                <Volume2 className="h-4 w-4" strokeWidth={1.75} />
              )}
            </button>
            <button
              type="button"
              onClick={() => void containerRef.current?.requestFullscreen()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/15"
              aria-label="全屏播放"
            >
              <Expand className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

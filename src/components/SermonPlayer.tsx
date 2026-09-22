import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Play, ExternalLink, X, Maximize2, RefreshCw } from 'lucide-react';
import type { LivestreamsData, StreamInfo } from '../server/livestreamService';

const initialData: LivestreamsData = {
  youtube: {
    platform: 'youtube',
    status: 'completed',
    title: 'Sunday Worship Service',
    subtitle: 'IFBBC Pulpit',
    thumbnailUrl: 'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?q=80&w=1200&auto=format&fit=crop',
    videoUrl: 'https://www.youtube.com/@ifbbc/streams',
    embedUrl: 'https://www.youtube-nocookie.com/embed/live_stream?channel=UC9l4j8_z3QtkxoIwZvpUXKw',
    channelName: 'IFBBC Official',
    channelUrl: 'https://www.youtube.com/@ifbbc',
  },
  facebook: {
    platform: 'facebook',
    status: 'completed',
    title: 'Sunday Divine Worship',
    subtitle: 'IFBBC Worship Service',
    thumbnailUrl: 'https://images.unsplash.com/photo-1510590337019-5ef8d3d32116?q=80&w=1200&auto=format&fit=crop',
    videoUrl: 'https://www.facebook.com/inicbulanfundamental.baptistbiblechurch/live_videos',
    embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent('https://www.facebook.com/inicbulanfundamental.baptistbiblechurch/live_videos')}&show_text=false&allowfullscreen=true`,
    channelName: 'Inicbulan Fundamental Baptist Bible Church',
    channelUrl: 'https://www.facebook.com/inicbulanfundamental.baptistbiblechurch',
  },
  activeStream: null,
  lastUpdated: Date.now(),
};

export const SermonPlayer: React.FC = () => {
  const [streamData, setStreamData] = useState<LivestreamsData>(initialData);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [playingPlatform, setPlayingPlatform] = useState<'youtube' | 'facebook' | null>(null);
  const [theaterStream, setTheaterStream] = useState<StreamInfo | null>(null);

  const fetchStreams = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const response = await fetch('/api/livestreams');
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      const data: LivestreamsData = await response.json();
      setStreamData(data);
    } catch (err) {
      console.warn('Livestream fetch fallback:', err);
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStreams();

    // Auto-poll status every 30 seconds to dynamically detect new live broadcasts
    const interval = setInterval(() => {
      fetchStreams();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchStreams]);

  // Handle ESC key to close theater mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTheaterStream(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Display active livestream first if one is broadcasting
  const cards: StreamInfo[] = useMemo(() => {
    const list = [streamData.youtube, streamData.facebook];
    if (streamData.activeStream === 'facebook') {
      return [streamData.facebook, streamData.youtube];
    }
    return list;
  }, [streamData]);

  const handlePlayInline = (platform: 'youtube' | 'facebook') => {
    setPlayingPlatform((prev) => (prev === platform ? null : platform));
  };

  const handleOpenTheater = (stream: StreamInfo) => {
    setTheaterStream(stream);
  };

  const handleCloseTheater = () => {
    setTheaterStream(null);
  };

  return (
    <section id="sermons" className="pt-6 pb-6 sm:pt-8 sm:pb-8 md:pt-10 md:pb-10 scroll-mt-20 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-royal-500/10 dark:bg-cobalt-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 sm:mb-8 md:mb-10 gap-4 sm:gap-6 pb-4 sm:pb-6 border-b border-slate-200/80 dark:border-white/5">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-royal-500 dark:text-cobalt-400 font-bold block mb-2">
              WATCH & JOIN US
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white uppercase text-balance">
              Sermons & Livestream
            </h2>
          </div>
          <div className="flex items-center justify-between md:justify-end gap-4">
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-md leading-relaxed text-pretty">
              Watch our latest Sunday worship services and weekly livestreams directly on this page or on external channels.
            </p>
            <button
              onClick={() => fetchStreams(true)}
              title="Refresh live status"
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-royal-500 dark:hover:border-cobalt-400 text-slate-600 dark:text-slate-300 transition-colors shrink-0"
              aria-label="Refresh livestream feeds"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-royal-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Livestream Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {loading ? (
            <>
              <SkeletonCard platform="YouTube" />
              <SkeletonCard platform="Facebook" />
            </>
          ) : (
            cards.map((stream) => (
              <StreamCard
                key={stream.platform}
                stream={stream}
                isPlayingInline={playingPlatform === stream.platform}
                onTogglePlayInline={() => handlePlayInline(stream.platform)}
                onOpenTheater={() => handleOpenTheater(stream)}
              />
            ))
          )}
        </div>
      </div>

      {/* Theater Modal for In-Website Playback */}
      <AnimatePresence>
        {theaterStream && (
          <TheaterModal
            stream={theaterStream}
            onClose={handleCloseTheater}
          />
        )}
      </AnimatePresence>
    </section>
  );
};

interface StreamCardProps {
  stream: StreamInfo;
  isPlayingInline: boolean;
  onTogglePlayInline: () => void;
  onOpenTheater: () => void;
}

const StreamCard: React.FC<StreamCardProps> = ({
  stream,
  isPlayingInline,
  onTogglePlayInline,
  onOpenTheater,
}) => {
  const isLive = stream.status === 'live';
  const isScheduled = stream.status === 'scheduled';
  const isYouTube = stream.platform === 'youtube';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 overflow-hidden ${
        isLive
          ? 'bg-slate-900/90 dark:bg-[#0b1329]/95 border-2 border-royal-500/80 shadow-[0_0_45px_rgba(37,99,235,0.3)] ring-1 ring-royal-400/50'
          : 'ambient-card border border-slate-200/50 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
      }`}
    >
      {/* Radiant glow when broadcasting */}
      {isLive && (
        <div className="absolute top-0 right-0 w-80 h-80 bg-royal-500/15 dark:bg-cobalt-500/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      )}

      <div>
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            {isYouTube ? (
              <div className="w-9 h-9 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                <YouTubeIcon className="w-5 h-5 fill-current" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
                <FacebookIcon className="w-5 h-5 fill-current" />
              </div>
            )}

            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                {isYouTube ? 'YouTube' : 'Facebook'}
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white block">
                {stream.channelName}
              </span>
            </div>
          </div>

          {/* Status Badge */}
          {isLive ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-600 text-white font-mono text-[11px] font-extrabold uppercase tracking-wider shadow-lg shadow-red-600/30">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>LIVE NOW</span>
            </div>
          ) : isScheduled ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 font-mono text-[11px] font-bold uppercase tracking-wider">
              <Radio className="w-3 h-3" />
              <span>SCHEDULED</span>
            </div>
          ) : null}
        </div>

        {/* Video Preview or Inline Video Player */}
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-200/40 dark:border-white/10 shadow-lg mb-6">
          {isPlayingInline ? (
            <div className="relative w-full h-full">
              <iframe
                src={stream.embedUrl}
                title={stream.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
              {/* Quick in-player controls overlay */}
              <div className="absolute top-2.5 right-2.5 flex items-center gap-2 z-10">
                <button
                  onClick={onOpenTheater}
                  title="Expand to Full View"
                  className="p-1.5 rounded-lg bg-black/75 hover:bg-black text-white text-xs backdrop-blur-md transition-colors"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={onTogglePlayInline}
                  title="Close Player"
                  className="p-1.5 rounded-lg bg-black/75 hover:bg-black text-white text-xs backdrop-blur-md transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={onTogglePlayInline}
              className="group block relative w-full h-full cursor-pointer"
            >
              <img
                src={stream.thumbnailUrl}
                alt={stream.title}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

              {/* Play Button Icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white shadow-2xl backdrop-blur-md transition-all duration-300 group-hover:scale-110 ${
                    isLive
                      ? 'bg-red-600/90 group-hover:bg-red-600 shadow-red-600/40'
                      : 'bg-royal-600/80 group-hover:bg-royal-600 shadow-royal-600/30'
                  }`}
                >
                  <Play className="w-6 h-6 fill-current ml-1" />
                </div>
              </div>

              {/* Bottom bar overlay */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-mono text-white/90">
                <span className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-medium truncate max-w-[70%]">
                  {isYouTube ? '@ifbbc' : 'IFBBC Facebook'}
                </span>
                <span className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-medium">
                  <Play className="w-3 h-3 fill-current" />
                  <span>Play on Website</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Video Title & Subtitle */}
        <div className="space-y-1.5 mb-6">
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase line-clamp-2 leading-tight">
            {stream.title}
          </h3>
          {stream.subtitle && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium line-clamp-2">
              {stream.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Action Options: Play on Website OR Open on External Platform */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
        <button
          onClick={onTogglePlayInline}
          className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm ${
            isPlayingInline
              ? 'bg-slate-800 hover:bg-slate-700 text-white'
              : isLive
              ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/25'
              : 'bg-royal-600 hover:bg-royal-500 text-white shadow-royal-600/20'
          }`}
        >
          {isPlayingInline ? (
            <>
              <X className="w-3.5 h-3.5" />
              <span>Close Video</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isLive ? 'Watch Live Here' : 'Play on Website'}</span>
            </>
          )}
        </button>

        <a
          href={stream.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider border border-slate-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 transition-colors"
        >
          <span>{isYouTube ? 'Open YouTube' : 'Open Facebook'}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </motion.div>
  );
};

// Full Theater Overlay Modal for Immersive In-Website Playback
interface TheaterModalProps {
  stream: StreamInfo;
  onClose: () => void;
}

const TheaterModal: React.FC<TheaterModalProps> = ({ stream, onClose }) => {
  const isYouTube = stream.platform === 'youtube';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-black/90 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl bg-slate-900 border border-white/10 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-3">
            {isYouTube ? (
              <YouTubeIcon className="w-5 h-5 text-red-500 fill-current" />
            ) : (
              <FacebookIcon className="w-5 h-5 text-blue-500 fill-current" />
            )}
            <div className="truncate max-w-[200px] sm:max-w-md">
              <span className="text-xs font-mono uppercase text-slate-400 block">
                {stream.channelName}
              </span>
              <span className="text-sm font-semibold text-white block truncate">
                {stream.title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={stream.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 text-slate-300 hover:text-white text-xs font-mono transition-colors"
            >
              <span>{isYouTube ? 'YouTube' : 'Facebook'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Close video player"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Embed Frame */}
        <div className="relative w-full aspect-video bg-black">
          <iframe
            src={stream.embedUrl}
            title={stream.title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

// Skeleton Placeholder
const SkeletonCard: React.FC<{ platform: string }> = ({ platform }) => (
  <div
    aria-label={`Loading ${platform} livestream`}
    className="ambient-card rounded-3xl p-6 sm:p-8 space-y-5 animate-pulse border border-slate-200/50 dark:border-white/10"
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-slate-300 dark:bg-white/10" />
        <div className="space-y-1.5">
          <div className="w-24 h-3 rounded bg-slate-300 dark:bg-white/10" />
          <div className="w-36 h-4 rounded bg-slate-300 dark:bg-white/10" />
        </div>
      </div>
    </div>

    <div className="w-full aspect-video rounded-2xl bg-slate-300 dark:bg-white/10" />

    <div className="space-y-2">
      <div className="w-3/4 h-6 rounded bg-slate-300 dark:bg-white/10" />
      <div className="w-1/2 h-4 rounded bg-slate-300 dark:bg-white/10" />
    </div>

    <div className="grid grid-cols-2 gap-2.5 pt-2">
      <div className="w-full h-11 rounded-xl bg-slate-300 dark:bg-white/10" />
      <div className="w-full h-11 rounded-xl bg-slate-300 dark:bg-white/10" />
    </div>
  </div>
);

// SVG Icons
const YouTubeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const FacebookIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

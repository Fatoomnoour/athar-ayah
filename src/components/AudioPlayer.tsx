import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Pause, SkipBack, SkipForward, Repeat, Volume2, 
  Settings2, X, ChevronUp, ChevronDown, Check, Loader2, RefreshCw 
} from "lucide-react";
import { getAbsoluteAyah, SURAH_LIST } from "../utils/quranUtils";

interface AudioPlayerProps {
  surahId: number;
  verseNumber: number;
  verseText: string;
  onNextVerse: () => void;
  onPrevVerse: () => void;
  onClose: () => void;
  onShowToast: (msg: string, type: "success" | "error" | "info") => void;
  // New range looping properties
  repeatMode?: "one" | "range";
  rangeStart?: number;
  rangeEnd?: number;
  onJumpToVerse?: (verseNum: number) => void;
}

export const RECITERS = [
  // قراء المسجد الحرام
  { id: "sudais", name: "عبد الرحمن السديس", group: "قراء المسجد الحرام", server: "everyayah", folder: "Abdurrahmaan_As-Sudais_192kbps" },
  { id: "maher", name: "ماهر المعيقلي", group: "قراء المسجد الحرام", server: "everyayah", folder: "MaherAlMuaiqly128kbps" },
  { id: "juhany", name: "عبد الله الجهني", group: "قراء المسجد الحرام", server: "everyayah", folder: "Abdullaah_3awwaad_Al-Juhaynee_128kbps" },
  { id: "shuraim", name: "سعود الشريم", group: "قراء المسجد الحرام", server: "everyayah", folder: "Saood_ash-Shuraym_128kbps" },
  { id: "dossari", name: "ياسر الدوسري", group: "قراء المسجد الحرام", server: "everyayah", folder: "Yasser_Ad-Dussary_128kbps" },
  // قراء آخرون
  { id: "ar.alafasy", name: "مشاري العفاسي", group: "قراء آخرون", server: "alquran", urlId: "ar.alafasy" },
  { id: "ar.husary", name: "محمود الحصري (ترتيل)", group: "قراء آخرون", server: "alquran", urlId: "ar.husary" },
  { id: "ar.minshawi", name: "محمد المنشاوي", group: "قراء آخرون", server: "alquran", urlId: "ar.minshawi" },
  { id: "ar.hudhaify", name: "علي الحذيفي (المسجد النبوي)", group: "قراء آخرون", server: "alquran", urlId: "ar.hudhaify" },
  { id: "ar.shaatree", name: "أبو بكر الشاطري", group: "قراء آخرون", server: "alquran", urlId: "ar.shaatree" }
];

export default function AudioPlayer({
  surahId,
  verseNumber,
  verseText,
  onNextVerse,
  onPrevVerse,
  onClose,
  onShowToast,
  repeatMode = "one",
  rangeStart = 1,
  rangeEnd = 1,
  onJumpToVerse
}: AudioPlayerProps) {
  // Config state
  const [activeReciter, setActiveReciter] = useState<string>(() => {
    return localStorage.getItem("preferred_reciter") || "ar.alafasy";
  });
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(() => {
    return Number(localStorage.getItem("preferred_speed")) || 1;
  });
  
  // Persist reciter when it changes
  useEffect(() => {
    localStorage.setItem("preferred_reciter", activeReciter);
  }, [activeReciter]);

  // Persist speed when it changes
  useEffect(() => {
    localStorage.setItem("preferred_speed", playbackSpeed.toString());
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const [repeatTimes, setRepeatTimes] = useState<number>(1); // 1, 3, 5, 10, or custom
  const [currentRepeat, setCurrentRepeat] = useState<number>(1);
  const [pauseDuration, setPauseDuration] = useState<number>(0); // Seconds between repetitions
  const [volume, setVolume] = useState<number>(1);

  // Range and mode states local overrides
  const [localRepeatMode, setLocalRepeatMode] = useState<"one" | "range">(repeatMode);
  const [localRangeStart, setLocalRangeStart] = useState<number>(rangeStart);
  const [localRangeEnd, setLocalRangeEnd] = useState<number>(rangeEnd);
  const [isCustomRepeat, setIsCustomRepeat] = useState<boolean>(false);

  // Player state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isWaitingDelay, setIsWaitingDelay] = useState<boolean>(false);
  const [delayCountdown, setDelayCountdown] = useState<number>(0);

  // HTML5 Audio Reference
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const delayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync range states when props change
  useEffect(() => {
    setLocalRepeatMode(repeatMode);
    setLocalRangeStart(rangeStart);
    setLocalRangeEnd(rangeEnd);
  }, [repeatMode, rangeStart, rangeEnd]);

  // Compute Audio Source URL using absolute ayah number
  const absoluteAyah = getAbsoluteAyah(surahId, verseNumber);
  
  const reciterConfig = RECITERS.find(r => r.id === activeReciter) || RECITERS[0];
  const paddedSurah = surahId.toString().padStart(3, '0');
  const paddedVerse = verseNumber.toString().padStart(3, '0');
  
  const audioUrl = reciterConfig.server === "everyayah" 
    ? `https://everyayah.com/data/${reciterConfig.folder}/${paddedSurah}${paddedVerse}.mp3`
    : `https://cdn.islamic.network/quran/audio/128/${reciterConfig.urlId}/${absoluteAyah}.mp3`;

  // Sync state when URL changes
  useEffect(() => {
    // Stop ongoing timers
    clearTimers();
    setIsWaitingDelay(false);
    setCurrentRepeat(1);

    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setIsLoading(true);
      audioRef.current.src = audioUrl;
      audioRef.current.load();
      
      // Auto-play when verse/reciter changes
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setIsLoading(false);
          })
          .catch((err) => {
            console.log("Auto-play aborted", err);
            setIsPlaying(false);
            setIsLoading(false);
          });
      }
    }
  }, [audioUrl]);

  // Sync playback speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, isPlaying]);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Clear Timers helper
  const clearTimers = () => {
    if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isWaitingDelay) {
      // If waiting in delay, skip delay and play
      clearTimers();
      setIsWaitingDelay(false);
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleAudioEnded = () => {
    if (localRepeatMode === "range") {
      if (verseNumber < localRangeEnd) {
        // Play next verse in range
        if (pauseDuration > 0) {
          setIsWaitingDelay(true);
          setIsPlaying(false);
          setDelayCountdown(pauseDuration);

          countdownTimerRef.current = setInterval(() => {
            setDelayCountdown((prev) => {
              if (prev <= 1) {
                if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);

          delayTimerRef.current = setTimeout(() => {
            setIsWaitingDelay(false);
            onNextVerse();
            setIsPlaying(true);
          }, pauseDuration * 1000);
        } else {
          onNextVerse();
        }
      } else {
        // Reached the end of the range
        if (currentRepeat < repeatTimes) {
          const nextRepeat = currentRepeat + 1;
          setCurrentRepeat(nextRepeat);

          if (pauseDuration > 0) {
            setIsWaitingDelay(true);
            setIsPlaying(false);
            setDelayCountdown(pauseDuration);

            countdownTimerRef.current = setInterval(() => {
              setDelayCountdown((prev) => {
                if (prev <= 1) {
                  if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);

            delayTimerRef.current = setTimeout(() => {
              setIsWaitingDelay(false);
              if (onJumpToVerse) {
                onJumpToVerse(localRangeStart);
              } else {
                onPrevVerse(); // fallback
              }
              setIsPlaying(true);
            }, pauseDuration * 1000);
          } else {
            if (onJumpToVerse) {
              onJumpToVerse(localRangeStart);
            }
          }
          onShowToast(`تكرار مجال الآيات: دورة ${nextRepeat} من ${repeatTimes}`, "info");
        } else {
          setIsPlaying(false);
          onShowToast("اكتمل تكرار مجال الآيات بنجاح", "success");
        }
      }
    } else {
      // Repeat single verse mode
      if (currentRepeat < repeatTimes) {
        const nextRepeatNum = currentRepeat + 1;
        setCurrentRepeat(nextRepeatNum);

        if (pauseDuration > 0) {
          // Pause between repetitions is requested
          setIsWaitingDelay(true);
          setIsPlaying(false);
          setDelayCountdown(pauseDuration);

          countdownTimerRef.current = setInterval(() => {
            setDelayCountdown((prev) => {
              if (prev <= 1) {
                if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);

          delayTimerRef.current = setTimeout(() => {
            setIsWaitingDelay(false);
            if (audioRef.current) {
              audioRef.current.play();
              setIsPlaying(true);
            }
          }, pauseDuration * 1000);

          onShowToast(`تكرار رقم ${nextRepeatNum} من أصل ${repeatTimes} بعد ${pauseDuration} ثوانٍ`, "info");
        } else {
          // Instant repeat
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play();
            setIsPlaying(true);
          }
        }
      } else {
        // Repeat finished, advance to the next verse
        onNextVerse();
        onShowToast("الانتقال للآية التالية تلقائياً", "success");
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const val = Number(e.target.value);
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const currentSurahName = SURAH_LIST[surahId - 1]?.name || "";

  return (
    <div 
      className="fixed bottom-[60px] md:bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-xl transition-all duration-300 font-sans"
      dir="rtl"
    >
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
      />

      {/* Collapse/Expand Toggle Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-8 flex justify-between items-center bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
            {isWaitingDelay 
              ? `⏸️ فترة صمت... متبقي ${delayCountdown} ثانية للترديد الذاتي` 
              : isPlaying 
                ? `🔊 تلاوة نشطة (${localRepeatMode === "range" ? "دورة" : "تكرار"} ${currentRepeat} / ${repeatTimes})` 
                : "⏸️ تلاوة متوقفة مؤقتاً"}
          </span>
        </div>
        
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 flex items-center gap-1 text-[10px] font-bold transition cursor-pointer"
        >
          {isExpanded ? (
            <>
              <span>طي المشغّل</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              <span>فتح مشغل الحفظ والتكرار</span>
              <ChevronUp className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>

      {isExpanded ? (
        /* EXPANDED PLAYER VIEW */
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-3">
          
          {/* Top row: Active Verse Text, Reciter & Range Loop Configs */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Active Verse display */}
            <div className="flex-1 text-right">
              <span className="block text-[10px] text-slate-400 font-bold leading-none mb-1">
                سورة {currentSurahName} (آية {verseNumber}) {localRepeatMode === "range" && `• مجال آيات [${localRangeStart} - ${localRangeEnd}]`}
              </span>
              <p className="font-quran text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-semibold truncate max-w-2xl leading-relaxed">
                {verseText || "جاري تحميل نص الآية الكريم..."}
              </p>
            </div>

            {/* Reciter and Range selection */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Reciter selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400">القارئ:</span>
                <select
                  value={activeReciter}
                  onChange={(e) => {
                    setActiveReciter(e.target.value);
                    onShowToast(`تم اختيار القارئ: ${RECITERS.find(r => r.id === e.target.value)?.name}`, "info");
                  }}
                  className="px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border rounded-lg font-bold text-slate-700 dark:text-slate-200 cursor-pointer max-w-[150px] sm:max-w-xs truncate"
                  id="reciter-selector"
                >
                  <optgroup label="قراء المسجد الحرام">
                    {RECITERS.filter(r => r.group === "قراء المسجد الحرام").map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="قراء آخرون">
                    {RECITERS.filter(r => r.group === "قراء آخرون").map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Loop Mode toggle */}
              <div className="flex items-center border rounded-lg bg-slate-50 dark:bg-slate-800 p-0.5">
                <button
                  onClick={() => {
                    setLocalRepeatMode("one");
                    onShowToast("تم تفعيل وضع تكرار الآية الواحدة", "info");
                  }}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${localRepeatMode === "one" ? "bg-emerald-600 text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-800"}`}
                >
                  آية واحدة
                </button>
                <button
                  onClick={() => {
                    setLocalRepeatMode("range");
                    onShowToast(`تم تفعيل وضع تكرار مجال الآيات: ${localRangeStart} إلى ${localRangeEnd}`, "info");
                  }}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${localRepeatMode === "range" ? "bg-emerald-600 text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-800"}`}
                >
                  مجال آيات
                </button>
              </div>

              {/* Range start/end inputs if mode is range */}
              {localRepeatMode === "range" && (
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border rounded-lg px-2 py-1">
                  <span className="text-[9px] font-bold text-slate-500">من</span>
                  <input
                    type="number"
                    min={1}
                    value={localRangeStart}
                    onChange={(e) => {
                      const val = Math.max(1, parseInt(e.target.value) || 1);
                      setLocalRangeStart(val);
                    }}
                    className="w-10 text-center bg-white dark:bg-slate-900 border rounded text-xs font-bold"
                  />
                  <span className="text-[9px] font-bold text-slate-500">إلى</span>
                  <input
                    type="number"
                    min={localRangeStart}
                    value={localRangeEnd}
                    onChange={(e) => {
                      const val = Math.max(localRangeStart, parseInt(e.target.value) || localRangeStart);
                      setLocalRangeEnd(val);
                    }}
                    className="w-10 text-center bg-white dark:bg-slate-900 border rounded text-xs font-bold"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Progress Timeline slider */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-400 font-mono w-8 text-left">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <span className="text-[10px] text-slate-400 font-mono w-8 text-right">{formatTime(duration)}</span>
          </div>

          {/* Bottom row: Control buttons, Volume & Repetitions configs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            {/* Primary Audio Player Controls */}
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <button
                onClick={onPrevVerse}
                className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300 rounded-lg transition cursor-pointer border"
                title="الآية السابقة"
                id="audio-prev-btn"
              >
                <SkipForward className="h-4 w-4" />
              </button>

              <button
                onClick={handlePlayPause}
                disabled={isLoading}
                className="p-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-xl shadow-md transition cursor-pointer hover:scale-105 flex items-center justify-center h-10 w-10"
                id="audio-play-pause-btn"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 fill-white" />
                )}
              </button>

              <button
                onClick={onNextVerse}
                className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300 rounded-lg transition cursor-pointer border"
                title="الآية التالية"
                id="audio-next-btn"
              >
                <SkipBack className="h-4 w-4" />
              </button>

              {/* Playback speed selector */}
              <div className="flex items-center gap-1 border px-2 py-1 rounded-lg bg-slate-50/50 dark:bg-slate-800/50">
                <Settings2 className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  className="bg-transparent text-[10px] font-black text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer"
                  title="سرعة التلاوة"
                  id="speed-selector"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1.0x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2.0x</option>
                </select>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center gap-1.5 border px-2 py-1 rounded-lg bg-slate-50/50 dark:bg-slate-800/50">
                <Volume2 className="h-3.5 w-3.5 text-slate-400" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-12 h-1 accent-emerald-600 cursor-pointer"
                  title="مستوى الصوت"
                />
              </div>
            </div>

            {/* Repetitions and Pauses configs (Crucial for Hifz!) */}
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
              
              {/* Repeats counter config */}
              <div className="flex items-center gap-1.5 border px-2 py-1 rounded-lg bg-slate-50/50 dark:bg-slate-800/50">
                <Repeat className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-[10px] font-bold text-slate-400">التكرار:</span>
                <select
                  value={isCustomRepeat ? "custom" : repeatTimes}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "custom") {
                      setIsCustomRepeat(true);
                      setRepeatTimes(5);
                    } else {
                      setIsCustomRepeat(false);
                      const times = Number(val);
                      setRepeatTimes(times);
                      setCurrentRepeat(1);
                      onShowToast(`تم تفعيل التكرار ${times} مرات`, "info");
                    }
                  }}
                  className="bg-transparent text-xs font-black text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                  id="repeat-selector"
                >
                  <option value={1}>مرة واحدة</option>
                  <option value={3}>٣ تكرارات</option>
                  <option value={5}>٥ تكرارات</option>
                  <option value={10}>١٠ تكرارات</option>
                  <option value={20}>٢٠ تكراراً</option>
                  <option value="custom">تخصيص...</option>
                </select>

                {isCustomRepeat && (
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={repeatTimes}
                    onChange={(e) => {
                      const val = Math.max(1, parseInt(e.target.value) || 1);
                      setRepeatTimes(val);
                      setCurrentRepeat(1);
                    }}
                    className="w-10 px-1 py-0.5 text-xs bg-white dark:bg-slate-900 border rounded font-bold text-center text-emerald-600"
                    title="تكرار مخصص"
                  />
                )}
              </div>

              {/* Pause duration config */}
              <div className="flex items-center gap-1.5 border px-2 py-1 rounded-lg bg-slate-50/50 dark:bg-slate-800/50">
                <Volume2 className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-[10px] font-bold text-slate-400">فترة الصمت (ثواني):</span>
                <select
                  value={pauseDuration}
                  onChange={(e) => {
                    const secs = Number(e.target.value);
                    setPauseDuration(secs);
                    onShowToast(secs > 0 ? `فترة الصمت للترديد: ${secs} ثوانٍ` : "تم إيقاف فترة الصمت", "info");
                  }}
                  className="bg-transparent text-xs font-black text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                  id="pause-duration-selector"
                >
                  <option value={0}>دون انتظار</option>
                  <option value={2}>ثانيتان</option>
                  <option value={3}>٣ ثوانٍ</option>
                  <option value={5}>٥ ثوانٍ</option>
                  <option value={10}>١٠ ثوانٍ</option>
                  <option value={15}>١٥ ثانية</option>
                </select>
              </div>

              {/* Close audio player */}
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition text-slate-400 cursor-pointer"
                title="إغلاق المشغل"
              >
                <X className="h-4.5 w-4.5" />
              </button>

            </div>

          </div>

        </div>
      ) : (
        /* COLLAPSED MINI PLAYER VIEW (Ideal for mobile screens!) */
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePlayPause}
              disabled={isLoading}
              className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-lg shadow-xs transition"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3 fill-white" />
              )}
            </button>
            <div className="text-right">
              <span className="block text-[8px] text-slate-400 font-bold leading-none">تلاوة نشطة</span>
              <span className="block text-xs font-serif text-slate-700 dark:text-slate-200 font-black">
                سورة {currentSurahName} ({verseNumber}) • {RECITERS.find(r => r.id === activeReciter)?.name.split(" ")[0]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md font-bold text-emerald-600">
              {localRepeatMode === "range" ? "مجال" : "مكرر"} {currentRepeat}/{repeatTimes}
            </span>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-rose-600 transition"
              title="إغلاق"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

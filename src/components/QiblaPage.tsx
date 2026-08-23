import React, { useState, useEffect, useCallback } from "react";
import { useLanguage } from "../i18n";
import { Compass, MapPin, AlertCircle, RefreshCw } from "lucide-react";

// Kaaba Coordinates
const KAABA_LAT = 21.4224779;
const KAABA_LNG = 39.8251832;

export default function QiblaPage() {
  const { language, direction, t } = useLanguage();
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied" | "unsupported">("prompt");
  const [qiblaAngle, setQiblaAngle] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [hasCompass, setHasCompass] = useState<boolean>(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Calculate great-circle bearing from user to Kaaba
  const calculateQibla = (lat: number, lng: number) => {
    const phiK = (KAABA_LAT * Math.PI) / 180.0;
    const lambdaK = (KAABA_LNG * Math.PI) / 180.0;
    const phi = (lat * Math.PI) / 180.0;
    const lambda = (lng * Math.PI) / 180.0;

    const y = Math.sin(lambdaK - lambda);
    const x = Math.cos(phi) * Math.tan(phiK) - Math.sin(phi) * Math.cos(lambdaK - lambda);

    let qibla = Math.atan2(y, x);
    qibla = (qibla * 180.0) / Math.PI;

    // Normalize to 0-360
    return (qibla + 360.0) % 360.0;
  };

  const handleDeviceOrientation = useCallback((event: DeviceOrientationEvent) => {
    let alpha = event.alpha;

    // Handle iOS absolute heading if available
    if ('webkitCompassHeading' in event) {
      alpha = (event as any).webkitCompassHeading;
    } else if (alpha !== null) {
      // Convert standard alpha (which is counter-clockwise) to compass heading (clockwise)
      alpha = 360 - alpha;
    }

    if (alpha !== null) {
      setHeading(alpha);
      setHasCompass(true);
    } else {
      setHasCompass(false);
    }
  }, []);

  const requestPermissions = async () => {
    setLocationError(null);

    if (!navigator.geolocation) {
      setPermissionState("unsupported");
      setLocationError(language === 'ar' ? "متصفحك لا يدعم تحديد الموقع." : "Your browser does not support geolocation.");
      return;
    }

    try {
      // 1. Request Location
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const angle = calculateQibla(latitude, longitude);
          setQiblaAngle(angle);
          setPermissionState("granted");

          // 2. Request Device Orientation (especially for iOS 13+)
          if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            (DeviceOrientationEvent as any).requestPermission()
              .then((permissionState: string) => {
                if (permissionState === 'granted') {
                  window.addEventListener('deviceorientation', handleDeviceOrientation, true);
                } else {
                  setHasCompass(false);
                }
              })
              .catch(console.error);
          } else {
            // Non-iOS 13+ devices
            window.addEventListener('deviceorientationabsolute', handleDeviceOrientation, true);
            // Fallback for devices that don't support absolute
            window.addEventListener('deviceorientation', handleDeviceOrientation, true);
          }
        },
        (error) => {
          setPermissionState("denied");
          if (error.code === error.PERMISSION_DENIED) {
            setLocationError(language === 'ar' ? "تم رفض صلاحية الموقع." : "Location permission was denied.");
          } else {
            setLocationError(language === 'ar' ? "تعذر تحديد الموقع الحالي." : "Could not determine current location.");
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } catch (err) {
      setPermissionState("denied");
      setLocationError(language === 'ar' ? "حدث خطأ غير متوقع." : "An unexpected error occurred.");
    }
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('deviceorientationabsolute', handleDeviceOrientation, true);
      window.removeEventListener('deviceorientation', handleDeviceOrientation, true);
    };
  }, [handleDeviceOrientation]);

  // Calculate compass rotation
  const compassRotation = heading !== null && qiblaAngle !== null
    ? qiblaAngle - heading
    : (qiblaAngle !== null ? qiblaAngle : 0);

  return (
    <div className="max-w-xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500" dir={direction}>

      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">{t("qibla")}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("qiblaDesc")}</p>
      </div>

      {permissionState !== "granted" ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <MapPin className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{t("locationPermission")}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {language === 'ar'
                ? "نحتاج إلى موقعك الجغرافي لحساب اتجاه القبلة الدقيق. لا يتم حفظ موقعك أو إرساله لأي جهة."
                : "We need your geographic location to calculate the accurate Qibla direction. Your location is not saved or sent anywhere."}
            </p>
          </div>
          {locationError && (
            <div className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl">
              {locationError}
            </div>
          )}
          <button
            onClick={requestPermissions}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-colors"
          >
            {t("grantLocation")}
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center space-y-10">

          {/* Compass Display */}
          <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
            {/* Outer Ring */}
            <div className="absolute inset-0 border-4 border-slate-100 dark:border-slate-800 rounded-full shadow-inner"></div>

            {/* Compass Rose (Rotates based on device heading if available) */}
            <div
              className="absolute inset-4 border-2 border-emerald-100 dark:border-emerald-900/30 rounded-full transition-transform duration-300 ease-out flex items-center justify-center"
              style={{ transform: `rotate(${heading !== null ? -heading : 0}deg)` }}
            >
              <span className="absolute top-2 text-xs font-bold text-slate-400">N</span>
              <span className="absolute bottom-2 text-xs font-bold text-slate-400">S</span>
              <span className="absolute right-2 text-xs font-bold text-slate-400">E</span>
              <span className="absolute left-2 text-xs font-bold text-slate-400">W</span>
            </div>

            {/* Qibla Pointer */}
            <div
              className="absolute inset-0 transition-transform duration-300 ease-out z-10"
              style={{ transform: `rotate(${compassRotation}deg)` }}
            >
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-1.5 h-1/2 bg-gradient-to-b from-emerald-600 to-transparent rounded-full origin-bottom">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-emerald-600 rounded-full shadow-md flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
              </div>
            </div>

            {/* Center Hub */}
            <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-full shadow-md z-20 border-2 border-emerald-600 flex items-center justify-center">
              <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
            </div>
          </div>

          {/* Info Panel */}
          <div className="w-full space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl text-center border border-slate-100 dark:border-slate-800">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t("qiblaDegree")}</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {qiblaAngle?.toFixed(1)}°
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl text-center border border-slate-100 dark:border-slate-800">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {language === 'ar' ? "اتجاه الجهاز" : "Device Heading"}
                </span>
                <span className="text-2xl font-black text-slate-700 dark:text-slate-300 tabular-nums">
                  {heading !== null ? `${heading.toFixed(1)}°` : "--"}
                </span>
              </div>
            </div>

            {!hasCompass && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 rounded-xl text-xs font-bold border border-amber-200 dark:border-amber-900/50">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{t("noCompass")}</p>
              </div>
            )}

            <div className="text-center">
              <button
                onClick={requestPermissions}
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-emerald-600 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {t("calibrateCompass")}
              </button>
              <p className="text-[9px] text-slate-400 mt-2">
                {t("deviceAccuracy")}
              </p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.warn("This browser does not support desktop notification");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

export function scheduleLocalNotification(title: string, options?: NotificationOptions) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }
  
  new Notification(title, {
    icon: "/logo.jpg",
    ...options
  });
}

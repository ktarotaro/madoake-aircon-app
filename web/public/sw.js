self.addEventListener("push", (event) => {
  let data = { title: "窓開け／エアコン判断アプリ", body: "" };
  try {
    data = event.data.json();
  } catch {
    // JSON以外のペイロードは無視してデフォルト値を使う
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return self.clients.openWindow("/");
    })
  );
});

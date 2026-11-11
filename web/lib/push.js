import webpush from "web-push";
import { config } from "./config.js";

// 購読先すべてにWeb Pushを送る（バックエンド側 src/pushNotifications.js の sendPushToAll と同じ動き）。
// 送れなかった購読先のうち、ブラウザ側で解除済み（404/410）のものは deadEndpoints で返す。
export async function sendPushToAll({ subscriptions, vapidPrivateKey, title, body }) {
  webpush.setVapidDetails(config.vapidSubject, config.vapidPublicKey, vapidPrivateKey);

  const deadEndpoints = [];
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, JSON.stringify({ title, body }));
        sent += 1;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          deadEndpoints.push(subscription.endpoint);
        } else {
          console.error(`プッシュ通知の送信に失敗しました（${subscription.endpoint}）: ${err.message}`);
        }
      }
    })
  );

  return { sent, deadEndpoints };
}

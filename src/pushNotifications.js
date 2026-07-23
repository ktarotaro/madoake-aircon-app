import webpush from "web-push";
import { config } from "./config.js";

// data/latest.json の judgment / humidityNote が変化した場合に、登録済みの
// ブラウザ購読先（data/push-subscriptions.json）へWeb Pushを送る。
// 送信できなかった購読先（410 Gone等、ブラウザ側で解除済み）は戻り値の
// deadEndpointsに含めて返す。呼び出し元がpush-subscriptions.jsonから除去する。
export async function sendPushToAll({ subscriptions, vapidPrivateKey, title, body }) {
  webpush.setVapidDetails(config.vapidSubject, config.vapidPublicKey, vapidPrivateKey);

  const deadEndpoints = [];

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, JSON.stringify({ title, body }));
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          deadEndpoints.push(subscription.endpoint);
        } else {
          console.error(`プッシュ通知の送信に失敗しました（${subscription.endpoint}）: ${err.message}`);
        }
      }
    })
  );

  return { deadEndpoints };
}

// 前回の判定と比較し、通知すべき変化があれば {title, body} のリストを返す
export function buildNotificationMessages(previous, current) {
  const messages = [];

  if (previous && previous.judgment !== current.judgment) {
    messages.push({ title: `判定が変わりました: ${current.judgment}`, body: current.reason });
  }

  const previousNote = previous?.humidityNote ?? null;
  const currentNote = current.humidityNote ?? null;
  if (previousNote !== currentNote) {
    if (currentNote) {
      messages.push({ title: "乾燥注意", body: currentNote });
    } else if (previousNote) {
      messages.push({ title: "乾燥注意は解消しました", body: "室内の湿度が回復しました。" });
    }
  }

  return messages;
}

import * as Linking from "expo-linking";
import { Share } from "react-native";

/** Share a deal: a website link when configured, otherwise an app deep link. */
export async function shareDeal(dealId: string, text: string) {
  const web = process.env.EXPO_PUBLIC_WEB_URL;
  const url = web ? `${web.replace(/\/$/, "")}/deals/${dealId}` : Linking.createURL(`/deal/${dealId}`);
  try {
    await Share.share({ message: `${text} ${url}`, url });
  } catch {
    // user dismissed the share sheet
  }
}

export async function shareOnWhatsApp(dealId: string, text: string) {
  const web = process.env.EXPO_PUBLIC_WEB_URL;
  const url = web ? `${web.replace(/\/$/, "")}/deals/${dealId}` : Linking.createURL(`/deal/${dealId}`);
  await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`).catch(() => {});
}

import type { Metadata } from "next";
import { Mailbox } from "@/components/platform/mailbox";

export const metadata: Metadata = { title: "Messagerie" };

export default function MessagingPage() {
  return <Mailbox />;
}

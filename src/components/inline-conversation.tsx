"use client";

import { AssistantChat } from "./assistant/assistant-chat";
import { ModeOnly } from "./modes";

/** The assistant embedded in the page (AI conversation mode). Mounted only in that mode. */
export function InlineConversation() {
  return (
    <ModeOnly modes={["conversation"]}>
      <div className="card flex h-[min(72vh,680px)] flex-col overflow-hidden p-4 sm:p-6">
        <AssistantChat variant="page" />
      </div>
    </ModeOnly>
  );
}

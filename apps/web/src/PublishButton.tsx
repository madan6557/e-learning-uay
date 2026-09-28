import { Send } from "lucide-react";
import { Action, api, t } from "./lib";

export function PublishButton({
  path,
  title,
  onPublished,
}: {
  path: string;
  title: string;
  onPublished: () => void;
}) {
  return (
    <Action
      className="secondary publish-content-button"
      label={`${t.publish} ${title}`}
      run={async () => {
        await api(`${path}/publish`, "POST", {});
        onPublished();
        window.dispatchEvent(new Event("notifications-changed"));
      }}
    >
      <Send size={15} />
      {t.publish}
    </Action>
  );
}

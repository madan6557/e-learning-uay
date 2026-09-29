import { EyeOff, Send } from "lucide-react";
import { Action, api, t } from "./lib";

export function PublishButton({
  path,
  title,
  onPublished,
  published = false,
}: {
  path: string;
  title: string;
  onPublished: () => void;
  published?: boolean;
}) {
  return (
    <Action
      className="secondary publish-content-button"
      label={`${published ? "Tarik Publikasi" : t.publish} ${title}`}
      run={async () => {
        await api(`${path}/${published ? "unpublish" : "publish"}`, "POST", {});
        onPublished();
        window.dispatchEvent(new Event("notifications-changed"));
      }}
    >
      {published ? <EyeOff size={15} /> : <Send size={15} />}
      {published ? "Tarik Publikasi" : t.publish}
    </Action>
  );
}

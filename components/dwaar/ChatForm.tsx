"use client";

import { useActionState, useState } from "react";
import { sendMessageAction, type ChatFormState } from "@/app/apps/dwaar/actions";
import { MESSAGE_MAX } from "@/lib/dwaar/chat";

// The box for writing a chat message. The page decides whether to show it (the database says if you may send).

const initialState: ChatFormState = { message: null, sent: false };

export default function ChatForm({ requestId, hint }: { requestId: string; hint: string }) {
  const [state, formAction, pending] = useActionState(sendMessageAction.bind(null, requestId), initialState);
  const [text, setText] = useState("");

  return (
    <form
      action={(formData) => {
        formAction(formData);
        setText("");
      }}
      className="dw-card flex flex-col gap-3"
    >
      <label htmlFor="body" className="dw-display text-lg">
        Your message
      </label>
      <p id="body-hint" className="text-sm dw-muted">
        {hint}
      </p>
      <textarea
        id="body"
        name="body"
        rows={5}
        maxLength={MESSAGE_MAX}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-describedby="body-hint"
        className="dw-input"
      />
      <div className="flex items-center justify-between text-sm dw-muted">
        <span>
          {text.length}/{MESSAGE_MAX}
        </span>
      </div>
      {state.message && (
        <p role="alert" className="dw-alert dw-alert-error">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending || text.trim().length === 0} className="dw-btn dw-btn-primary dw-btn-lg self-start">
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

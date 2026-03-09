import { NextRequest } from "next/server";

import { AppError } from "@/lib/errors";
import { feedbackPayloadSchema, type FeedbackPayload } from "@/types/feedback";

export type ParsedFeedbackForm = {
  payload: FeedbackPayload;
  attachments: File[];
};

export const parseFeedbackForm = async (request: NextRequest): Promise<ParsedFeedbackForm> => {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    throw new AppError("invalid_request", "Content-Type must be multipart/form-data", 400);
  }

  const formData = await request.formData();
  const payloadRaw = formData.get("payload");
  if (typeof payloadRaw !== "string") {
    throw new AppError("invalid_request", "payload must be a JSON string", 400);
  }

  let payloadJson: unknown;
  try {
    payloadJson = JSON.parse(payloadRaw);
  } catch {
    throw new AppError("invalid_request", "payload is not valid JSON", 400);
  }

  const payload = feedbackPayloadSchema.safeParse(payloadJson);
  if (!payload.success) {
    throw new AppError("invalid_request", "payload failed validation", 400, payload.error.flatten());
  }

  const attachments = [...formData.getAll("attachments[]"), ...formData.getAll("attachments")]
    .filter((item): item is File => item instanceof File)
    .filter((file) => file.size > 0);

  return {
    payload: payload.data,
    attachments
  };
};

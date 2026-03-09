import { type StoredAttachment } from "@/services/attachments/attachment-storage";
import { type FeedbackPayload } from "@/types/feedback";

const renderList = (record: Record<string, unknown>): string =>
  Object.entries(record)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `- **${key}**: ${String(value)}`)
    .join("\n");

export const buildIssueTitle = (payload: FeedbackPayload): string => {
  const prefix = payload.type === "bug_report" ? "[Bug]" : "[Feature]";
  return `${prefix}: ${payload.title}`;
};

const renderAttachment = (attachment: StoredAttachment): string => {
  const excerptSection = attachment.excerpt
    ? `\n  - excerpt:\n\`\`\`\n${attachment.excerpt}\n\`\`\``
    : "";
  return `- **${attachment.filename}** (${attachment.mimeType}, ${attachment.size} bytes) - ${attachment.artifactUrl}${excerptSection}`;
};

export const renderIssueBody = (params: {
  payload: FeedbackPayload;
  attachments: StoredAttachment[];
  requestId: string;
}): string => {
  const { payload, attachments, requestId } = params;
  const sourceMetadata = renderList({
    applicationId: payload.source.applicationId,
    applicationName: payload.source.applicationName,
    channel: payload.source.channel,
    surface: payload.source.surface
  });
  const telemetryMetadata = renderList({
    clientType: payload.systemTelemetry.clientType,
    appVersion: payload.systemTelemetry.appVersion,
    platform: payload.systemTelemetry.platform,
    buildNumber: payload.systemTelemetry.buildNumber,
    platformVersion: payload.systemTelemetry.platformVersion,
    architecture: payload.systemTelemetry.architecture,
    locale: payload.systemTelemetry.locale,
    deviceName: payload.systemTelemetry.deviceName,
    deviceModel: payload.systemTelemetry.deviceModel,
    sessionId: payload.systemTelemetry.sessionId,
    releaseChannel: payload.systemTelemetry.releaseChannel
  });

  const attachmentsSection =
    attachments.length > 0 ? attachments.map((attachment) => renderAttachment(attachment)).join("\n") : "- none";
  const githubUser = payload.githubUser ? `- **githubUser**: ${payload.githubUser}\n` : "";
  const followUpFlag =
    payload.contact?.allowFollowUp === undefined
      ? ""
      : `- **allowFollowUp**: ${payload.contact.allowFollowUp ? "yes" : "no"}\n`;
  const clientRequestId = payload.clientRequestId ? `- **clientRequestId**: ${payload.clientRequestId}\n` : "";

  return [
    "## Submission",
    `- **type**: ${payload.type}`,
    `- **targetRepository**: ${payload.targetRepository}`,
    "",
    "## Description",
    payload.description,
    "",
    "## Source Metadata",
    sourceMetadata || "- none",
    "",
    "## System Telemetry",
    telemetryMetadata || "- none",
    "",
    "## Optional Metadata",
    githubUser + followUpFlag + clientRequestId + `- **requestId**: ${requestId}`,
    "",
    "## Attachments",
    attachmentsSection
  ].join("\n");
};

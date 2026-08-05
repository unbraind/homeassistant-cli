/**
 * Implements typed Home Assistant repair and related-resource diagnostics operations.
 */
import type { Config } from "../types/options.js";
import type {
  HaRelatedItemType,
  HaRelatedResources,
  HaRepairFlowResult,
  HaRepairIssueData,
  HaRepairIssueList,
} from "../types/api.js";
import { BaseClient } from "./base.js";
import { HomeAssistantReadOnlyError } from "./errors.js";
import { HomeAssistantWebSocketClient } from "./websocket.js";

export class DiagnosticsApiClient extends BaseClient {
  private readonly websocket: HomeAssistantWebSocketClient;

  constructor(config: Config) {
    super(config);
    this.websocket = new HomeAssistantWebSocketClient(config);
  }

  /** Return active Home Assistant repair issues. */
  async listRepairIssues(): Promise<HaRepairIssueList> {
    return await this.websocket.call("repairs/list_issues") as HaRepairIssueList;
  }

  /** Return integration-provided data for one repair issue. */
  async getRepairIssueData(domain: string, issueId: string): Promise<HaRepairIssueData> {
    return await this.websocket.call("repairs/get_issue_data", {
      domain,
      issue_id: issueId,
    }) as HaRepairIssueData;
  }

  /** Ignore or restore one repair issue. */
  async setRepairIssueIgnored(domain: string, issueId: string, ignore: boolean): Promise<void> {
    if (this.readOnly) {
      throw new HomeAssistantReadOnlyError("WEBSOCKET", "/websocket/repairs/ignore_issue");
    }
    await this.websocket.call("repairs/ignore_issue", {
      domain,
      issue_id: issueId,
      ignore,
    });
  }

  /** Find resources related to one Home Assistant registry or configuration item. */
  async getRelatedResources(itemType: HaRelatedItemType, itemId: string): Promise<HaRelatedResources> {
    return await this.websocket.call("search/related", {
      item_type: itemType,
      item_id: itemId,
    }) as HaRelatedResources;
  }

  /** Start an administrator repair fix flow. */
  async startRepairFlow(handler: string, issueId: string): Promise<HaRepairFlowResult> {
    return await this.request<HaRepairFlowResult>("POST", "/repairs/issues/fix", {
      handler,
      issue_id: issueId,
    });
  }

  /** Read the current state of a repair fix flow. */
  async getRepairFlow(flowId: string): Promise<HaRepairFlowResult> {
    return await this.request<HaRepairFlowResult>("GET", `/repairs/issues/fix/${flowId}`);
  }

  /** Submit input to an administrator repair fix flow. */
  async submitRepairFlow(flowId: string, data: Record<string, unknown>): Promise<HaRepairFlowResult> {
    return await this.request<HaRepairFlowResult>("POST", `/repairs/issues/fix/${flowId}`, data);
  }

  /** Close the shared WebSocket session after diagnostics complete. */
  async close(): Promise<void> {
    await this.websocket.close();
  }
}

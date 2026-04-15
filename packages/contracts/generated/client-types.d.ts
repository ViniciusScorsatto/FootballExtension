export interface BillingIdentityHeaders {
  "x-live-impact-user"?: string;
  "x-live-impact-plan"?: "free" | "pro" | string;
}

export interface SdkClientConfig {
  baseUrl: string;
}

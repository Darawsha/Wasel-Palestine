export interface NotificationProvider {
  sendNotification(
    recipient: string,
    message: string,
    options?: Record<string, any>
  ): Promise<void>;
}
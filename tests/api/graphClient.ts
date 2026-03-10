import { APIRequestContext } from '@playwright/test';

export class GraphClient {
  constructor(private request: APIRequestContext) {}

  async getChats() {
    const response = await this.request.get('/v1.0/me/chats');
    return {
      status: response.status(),
      body: await response.json(),
    };
  }

  async getChat(chatId: string) {
    const response = await this.request.get(`/v1.0/me/chats/${chatId}`);
    return {
      status: response.status(),
      body: await response.json(),
    };
  }

  async getMessages(chatId: string, params?: { top?: number; skip?: number; orderby?: string }) {
    const queryParams: Record<string, string | number> = {};
    if (params?.top !== undefined) queryParams['$top'] = params.top;
    if (params?.skip !== undefined) queryParams['$skip'] = params.skip;
    if (params?.orderby !== undefined) queryParams['$orderby'] = params.orderby;

    const response = await this.request.get(`/v1.0/me/chats/${chatId}/messages`, {
      params: queryParams,
    });
    return {
      status: response.status(),
      body: await response.json(),
    };
  }

  async getMessagesDelta(chatId: string) {
    const response = await this.request.get(`/v1.0/me/chats/${chatId}/messages/delta`);
    return {
      status: response.status(),
      body: await response.json(),
    };
  }

  async getGlobalDelta() {
    const response = await this.request.get('/v1.0/messages/delta');
    return {
      status: response.status(),
      body: await response.json(),
    };
  }
}

import { test, expect } from '@playwright/test';
import { GraphClient } from './api/graphClient';

test.describe('Messages API', () => {
  let graphClient: GraphClient;
  const demoChatId = '19:uni01_abc123def456ghi789jkl012mno345pqr678stu901@thread.v2';

  test.beforeEach(async ({ request }) => {
    graphClient = new GraphClient(request);
  });

  test('returns 200 and valid structure', async () => {
    // Arrange & Act
    const { status, body } = await graphClient.getMessages(demoChatId);

    // Assert
    expect(status).toBe(200);
    expect(Array.isArray(body.value)).toBeTruthy();

    body.value.forEach((message: any) => {
      expect(message).toHaveProperty('id');
      expect(message).toHaveProperty('chatId');
      expect(message).toHaveProperty('createdDateTime');
      expect(message).toHaveProperty('messageType');
      expect(message).toHaveProperty('body');
      expect(message.body).toHaveProperty('contentType');
      expect(message.body).toHaveProperty('content');
      
      if (message.from && message.from.user) {
        expect(message.from.user).toHaveProperty('id');
        expect(message.from.user).toHaveProperty('userIdentityType');
        expect(['aadUser', 'externalUser']).toContain(message.from.user.userIdentityType);
      }
    });
  });

  test('$top=3 returns max 3 messages and @odata.nextLink', async () => {
    // Arrange & Act
    const { status, body } = await graphClient.getMessages(demoChatId, { top: 3 });

    // Assert
    expect(status).toBe(200);
    expect(body.value.length).toBeLessThanOrEqual(3);
    expect(body['@odata.nextLink']).toBeDefined();
  });

  test('$skip returns different page than page 1', async () => {
    // Arrange
    const page1 = await graphClient.getMessages(demoChatId, { top: 2 });
    
    // Act
    const page2 = await graphClient.getMessages(demoChatId, { top: 2, skip: 2 });

    // Assert
    expect(page1.status).toBe(200);
    expect(page2.status).toBe(200);
    expect(page1.body.value[0].id).not.toBe(page2.body.value[0].id);
  });

  test('last page does not include @odata.nextLink', async () => {
    // Arrange
    // We'll fetch a large number to ensure we get the last page
    const { status, body } = await graphClient.getMessages(demoChatId, { top: 100 });

    // Assert
    expect(status).toBe(200);
    expect(body).not.toHaveProperty('@odata.nextLink');
  });

  test('replyToId is set for reply messages', async () => {
    // Arrange
    const replyMessageId = '1738000700000';

    // Act
    const { body } = await graphClient.getMessages(demoChatId);
    const replyMessage = body.value.find((m: any) => m.id === replyMessageId);

    // Assert
    expect(replyMessage).toBeDefined();
    expect(replyMessage).toHaveProperty('replyToId');
    expect(replyMessage.replyToId).not.toBeNull();
  });

  test('attachments are set for media messages', async () => {
    // Arrange
    const mediaMessageId = '1738000500000';

    // Act
    const { body } = await graphClient.getMessages(demoChatId);
    const mediaMessage = body.value.find((m: any) => m.id === mediaMessageId);

    // Assert
    expect(mediaMessage).toBeDefined();
    expect(mediaMessage).toHaveProperty('attachments');
    expect(Array.isArray(mediaMessage.attachments)).toBeTruthy();
    expect(mediaMessage.attachments.length).toBeGreaterThan(0);
  });

  const topValues = [1, 3, 5];
  for (const top of topValues) {
    test(`$top=${top} returns correct count`, async () => {
      // Act
      const { status, body } = await graphClient.getMessages(demoChatId, { top });

      // Assert
      expect(status).toBe(200);
      expect(body.value.length).toBeLessThanOrEqual(top);
    });
  }
});
